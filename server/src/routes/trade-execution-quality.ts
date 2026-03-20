import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface TradeExecution {
  tradeId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  avgPrice: number;
  vwap: number;
  arrivalPrice: number;
  implementationShortfall: number;
  slippage: number;
  marketImpact: number;
  participationRate: number;
  executionTime: number;
  venueBreakdown: Record<string, number>;
  broker: string;
  timestamp: string;
}

interface BrokerMetrics {
  broker: string;
  tradeCount: number;
  avgImplementationShortfall: number;
  avgSlippage: number;
  avgMarketImpact: number;
  executionQualityScore: number;
  totalNotional: number;
}

interface VenueQuality {
  venue: string;
  fillRate: number;
  avgPriceImprovement: number;
  avgSpeed: number;
  orderFlow: number;
}

interface TimeOfDayBucket {
  period: string;
  timeRange: string;
  avgImplementationShortfall: number;
  avgSlippage: number;
  avgMarketImpact: number;
  tradeCount: number;
  qualityScore: number;
}

interface SizeTier {
  tier: string;
  rangeDescription: string;
  tradeCount: number;
  avgImplementationShortfall: number;
  avgSlippage: number;
  avgMarketImpact: number;
  avgParticipationRate: number;
  avgExecutionTime: number;
}

interface ComplianceSummary {
  totalTradesReviewed: number;
  compliantTrades: number;
  complianceRate: number;
  flags: ComplianceFlag[];
  bestExecutionScore: number;
  regulatoryStatus: string;
}

interface ComplianceFlag {
  tradeId: string;
  symbol: string;
  issue: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ── Seed Data ──

const SYMBOLS = [
  { ticker: 'AAPL', basePrice: 195, avgDailyVolume: 55_000_000 },
  { ticker: 'MSFT', basePrice: 430, avgDailyVolume: 22_000_000 },
  { ticker: 'NVDA', basePrice: 880, avgDailyVolume: 42_000_000 },
  { ticker: 'GOOGL', basePrice: 175, avgDailyVolume: 25_000_000 },
  { ticker: 'AMZN', basePrice: 185, avgDailyVolume: 35_000_000 },
  { ticker: 'META', basePrice: 510, avgDailyVolume: 18_000_000 },
  { ticker: 'TSLA', basePrice: 245, avgDailyVolume: 85_000_000 },
  { ticker: 'JPM', basePrice: 198, avgDailyVolume: 10_000_000 },
  { ticker: 'GS', basePrice: 415, avgDailyVolume: 3_500_000 },
  { ticker: 'V', basePrice: 280, avgDailyVolume: 7_500_000 },
  { ticker: 'AMD', basePrice: 178, avgDailyVolume: 48_000_000 },
  { ticker: 'NFLX', basePrice: 630, avgDailyVolume: 6_000_000 },
  { ticker: 'BRK.B', basePrice: 410, avgDailyVolume: 4_200_000 },
  { ticker: 'UNH', basePrice: 525, avgDailyVolume: 3_800_000 },
  { ticker: 'JNJ', basePrice: 158, avgDailyVolume: 7_200_000 },
];

const BROKERS = ['Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Citadel Securities', 'Virtu Financial'] as const;

const VENUES = ['NYSE', 'NASDAQ', 'BATS', 'IEX', 'Dark Pools'] as const;

const COMPLIANCE_ISSUES = [
  'Execution price exceeded VWAP tolerance threshold (+5 bps)',
  'Participation rate above 20% of ADV limit',
  'Venue concentration exceeds 60% single-venue threshold',
  'Execution time exceeded algo expected duration by >50%',
  'Market impact above 10 bps on liquid name',
];

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('trade-execution-quality-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 25 Recent Trade Executions ──
  const trades: TradeExecution[] = [];
  for (let i = 0; i < 25; i++) {
    const sym = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
    const side: 'BUY' | 'SELL' = rng() > 0.48 ? 'BUY' : 'SELL';
    const broker = BROKERS[Math.floor(rng() * BROKERS.length)];

    // Quantity: 200 to 50,000 shares in round lots
    const quantity = Math.round((200 + rng() * 49800) / 100) * 100;

    // Arrival price with daily noise
    const arrivalPrice = round4(sym.basePrice * (1 + (rng() - 0.5) * 0.025));

    // VWAP: typically close to arrival, slight drift
    const vwapDrift = (rng() - 0.48) * 0.003;
    const vwap = round4(arrivalPrice * (1 + vwapDrift));

    // Avg execution price: slippage direction depends on side
    const slippageDir = side === 'BUY' ? 1 : -1;
    const rawSlippage = (rng() * 0.0004 + rng() * 0.0002) * slippageDir;
    const avgPrice = round4(arrivalPrice * (1 + rawSlippage));

    // Implementation shortfall in bps (always positive = cost)
    const implementationShortfall = round2(Math.abs((avgPrice - arrivalPrice) / arrivalPrice) * 10000);

    // Slippage vs VWAP in bps
    const slippage = round2(((avgPrice - vwap) / vwap) * 10000 * slippageDir);

    // Market impact: function of participation and liquidity
    const participationRate = round2(Math.max(0.5, Math.min(25, jitter(quantity / sym.avgDailyVolume * 100 * 100, 0.3))));
    const marketImpact = round2(Math.max(0.1, jitter(participationRate * 0.35 + rng() * 1.5, 0.25)));

    // Execution time in minutes (1 to 120, larger orders take longer)
    const baseTime = 3 + (quantity / 1000) * 1.5;
    const executionTime = Math.round(Math.min(120, Math.max(1, jitter(baseTime, 0.4))));

    // Venue breakdown: distribute across venues, ensuring they sum to 100
    const rawVenue: Record<string, number> = {};
    let venueSum = 0;
    for (const venue of VENUES) {
      let baseWeight: number;
      if (venue === 'NYSE') baseWeight = 25;
      else if (venue === 'NASDAQ') baseWeight = 30;
      else if (venue === 'BATS') baseWeight = 18;
      else if (venue === 'IEX') baseWeight = 8;
      else baseWeight = 19; // Dark Pools
      const w = Math.max(1, jitter(baseWeight, 0.35));
      rawVenue[venue] = w;
      venueSum += w;
    }
    const venueBreakdown: Record<string, number> = {};
    let allocated = 0;
    const venueKeys = Object.keys(rawVenue);
    for (let vi = 0; vi < venueKeys.length; vi++) {
      if (vi === venueKeys.length - 1) {
        venueBreakdown[venueKeys[vi]] = round2(100 - allocated);
      } else {
        const pct = round2((rawVenue[venueKeys[vi]] / venueSum) * 100);
        venueBreakdown[venueKeys[vi]] = pct;
        allocated += pct;
      }
    }

    // Timestamp: spread across the trading day 9:30 - 16:00
    const minuteOffset = Math.floor(rng() * 390); // 6.5 hours = 390 minutes
    const hour = 9 + Math.floor((30 + minuteOffset) / 60);
    const minute = (30 + minuteOffset) % 60;
    const second = Math.floor(rng() * 60);
    const timestamp = `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`;

    const tradeId = `TEQ-${day.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;

    trades.push({
      tradeId,
      symbol: sym.ticker,
      side,
      quantity,
      avgPrice,
      vwap,
      arrivalPrice,
      implementationShortfall,
      slippage,
      marketImpact,
      participationRate,
      executionTime,
      venueBreakdown,
      broker,
      timestamp,
    });
  }

  // Sort by timestamp descending
  trades.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // ── Broker Metrics ──
  const brokerMetrics: BrokerMetrics[] = BROKERS.map(broker => {
    const brokerTrades = trades.filter(t => t.broker === broker);
    const tradeCount = brokerTrades.length;

    // If no trades assigned, generate synthetic metrics
    if (tradeCount === 0) {
      return {
        broker,
        tradeCount: Math.round(jitter(5, 0.3)),
        avgImplementationShortfall: round2(jitter(3.2, 0.25)),
        avgSlippage: round2(jitter(1.8, 0.3)),
        avgMarketImpact: round2(jitter(2.5, 0.25)),
        executionQualityScore: round2(Math.min(100, Math.max(60, jitter(78, 0.1)))),
        totalNotional: round2(jitter(45_000_000, 0.3)),
      };
    }

    const avgIS = round2(brokerTrades.reduce((s, t) => s + t.implementationShortfall, 0) / tradeCount);
    const avgSlip = round2(brokerTrades.reduce((s, t) => s + Math.abs(t.slippage), 0) / tradeCount);
    const avgImpact = round2(brokerTrades.reduce((s, t) => s + t.marketImpact, 0) / tradeCount);
    const totalNotional = round2(brokerTrades.reduce((s, t) => s + t.avgPrice * t.quantity, 0));

    // Quality score: inversely proportional to costs, base 85 adjusted down
    const costPenalty = (avgIS * 1.5 + avgSlip * 1.0 + avgImpact * 0.8);
    const executionQualityScore = round2(Math.min(100, Math.max(50, 90 - costPenalty + rng() * 10)));

    return {
      broker,
      tradeCount,
      avgImplementationShortfall: avgIS,
      avgSlippage: avgSlip,
      avgMarketImpact: avgImpact,
      executionQualityScore,
      totalNotional,
    };
  });

  // Sort by quality score descending
  brokerMetrics.sort((a, b) => b.executionQualityScore - a.executionQualityScore);

  // ── Venue Quality Analysis ──
  const venueBaseData = [
    { venue: 'NYSE', baseFill: 94.5, basePI: 0.32, baseSpeed: 0.45, baseFlow: 24 },
    { venue: 'NASDAQ', baseFill: 96.2, basePI: 0.28, baseSpeed: 0.32, baseFlow: 30 },
    { venue: 'BATS', baseFill: 93.8, basePI: 0.41, baseSpeed: 0.28, baseFlow: 18 },
    { venue: 'IEX', baseFill: 87.5, basePI: 1.85, baseSpeed: 0.85, baseFlow: 8 },
    { venue: 'Dark Pools', baseFill: 71.2, basePI: 2.15, baseSpeed: 1.50, baseFlow: 20 },
  ];

  const venueAnalysis: VenueQuality[] = venueBaseData.map(v => ({
    venue: v.venue,
    fillRate: round2(Math.min(100, jitter(v.baseFill, 0.03))),
    avgPriceImprovement: round2(Math.max(0, jitter(v.basePI, 0.2))),
    avgSpeed: round2(Math.max(0.01, jitter(v.baseSpeed, 0.18))),
    orderFlow: round2(jitter(v.baseFlow, 0.1)),
  }));

  // Normalize order flow to sum to 100
  const flowSum = venueAnalysis.reduce((s, v) => s + v.orderFlow, 0);
  for (const v of venueAnalysis) {
    v.orderFlow = round2((v.orderFlow / flowSum) * 100);
  }

  // ── Time-of-Day Analysis ──
  const timeOfDayData = [
    { period: 'Market Open', timeRange: '09:30-10:30', baseIS: 5.2, baseSlip: 3.1, baseImpact: 4.8, baseTrades: 8, baseScore: 68 },
    { period: 'Late Morning', timeRange: '10:30-12:00', baseIS: 2.8, baseSlip: 1.5, baseImpact: 2.2, baseTrades: 6, baseScore: 82 },
    { period: 'Midday', timeRange: '12:00-14:00', baseIS: 2.1, baseSlip: 1.1, baseImpact: 1.6, baseTrades: 4, baseScore: 87 },
    { period: 'Afternoon', timeRange: '14:00-15:30', baseIS: 2.5, baseSlip: 1.3, baseImpact: 1.9, baseTrades: 5, baseScore: 84 },
    { period: 'Market Close', timeRange: '15:30-16:00', baseIS: 4.5, baseSlip: 2.8, baseImpact: 3.9, baseTrades: 7, baseScore: 72 },
  ];

  const timeOfDay: TimeOfDayBucket[] = timeOfDayData.map(t => ({
    period: t.period,
    timeRange: t.timeRange,
    avgImplementationShortfall: round2(jitter(t.baseIS, 0.2)),
    avgSlippage: round2(jitter(t.baseSlip, 0.22)),
    avgMarketImpact: round2(jitter(t.baseImpact, 0.2)),
    tradeCount: Math.round(jitter(t.baseTrades, 0.25)),
    qualityScore: round2(Math.min(100, Math.max(50, jitter(t.baseScore, 0.08)))),
  }));

  // ── Size Tier Analysis ──
  const sizeTierData = [
    { tier: 'Small', range: '< $100K notional', baseTrades: 10, baseIS: 1.2, baseSlip: 0.6, baseImpact: 0.8, baseParticipation: 2.5, baseTime: 3 },
    { tier: 'Medium', range: '$100K - $1M notional', baseTrades: 9, baseIS: 2.8, baseSlip: 1.5, baseImpact: 2.1, baseParticipation: 6.0, baseTime: 15 },
    { tier: 'Large', range: '> $1M notional', baseTrades: 6, baseIS: 5.5, baseSlip: 3.2, baseImpact: 4.5, baseParticipation: 12.0, baseTime: 45 },
  ];

  const sizeTiers: SizeTier[] = sizeTierData.map(s => ({
    tier: s.tier,
    rangeDescription: s.range,
    tradeCount: Math.round(jitter(s.baseTrades, 0.2)),
    avgImplementationShortfall: round2(jitter(s.baseIS, 0.2)),
    avgSlippage: round2(jitter(s.baseSlip, 0.25)),
    avgMarketImpact: round2(jitter(s.baseImpact, 0.22)),
    avgParticipationRate: round2(jitter(s.baseParticipation, 0.2)),
    avgExecutionTime: Math.round(jitter(s.baseTime, 0.3)),
  }));

  // ── Best Execution Compliance Summary ──
  const totalReviewed = trades.length;
  const flagCount = Math.max(1, Math.min(4, Math.floor(rng() * 5)));
  const flags: ComplianceFlag[] = [];

  for (let f = 0; f < flagCount; f++) {
    const flagTrade = trades[Math.floor(rng() * trades.length)];
    const issue = COMPLIANCE_ISSUES[Math.floor(rng() * COMPLIANCE_ISSUES.length)];
    const severityRoll = rng();
    const severity: 'LOW' | 'MEDIUM' | 'HIGH' = severityRoll < 0.5 ? 'LOW' : severityRoll < 0.85 ? 'MEDIUM' : 'HIGH';

    flags.push({
      tradeId: flagTrade.tradeId,
      symbol: flagTrade.symbol,
      issue,
      severity,
    });
  }

  const compliantTrades = totalReviewed - flagCount;
  const complianceRate = round2((compliantTrades / totalReviewed) * 100);
  const bestExecutionScore = round2(Math.min(100, Math.max(70, jitter(88, 0.06))));

  const complianceSummary: ComplianceSummary = {
    totalTradesReviewed: totalReviewed,
    compliantTrades,
    complianceRate,
    flags,
    bestExecutionScore,
    regulatoryStatus: complianceRate >= 90 ? 'COMPLIANT' : complianceRate >= 80 ? 'REVIEW_REQUIRED' : 'NON_COMPLIANT',
  };

  return {
    trades,
    brokerMetrics,
    venueAnalysis,
    timeOfDay,
    sizeTiers,
    complianceSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[TradeExecutionQuality] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate trade execution quality data' });
  }
});

export default router;
