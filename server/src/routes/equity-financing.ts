import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

interface BorrowRateEntry {
  ticker: string;
  name: string;
  borrowRate: number;
  priorDay: number;
  change: number;
  utilization: number;
  sharesOnLoan: number;
  daysToCover: number;
  feeScore: 'GC' | 'Warm' | 'Special' | 'Hard to Borrow';
}

interface ShortSqueezeEntry {
  ticker: string;
  shortInterest: number;
  shortInterestChange: number;
  daysToCover: number;
  costToBorrow: number;
  callOIRatio: number;
  darkPoolShortVolume: number;
  squeezeScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
}

interface MarketAggregate {
  metric: string;
  value: number;
  priorWeek: number;
  change: number;
  percentile: number;
  trend: 'Rising' | 'Falling' | 'Stable';
}

interface RecentActivityEntry {
  ticker: string;
  event: string;
  previousRate: number;
  currentRate: number;
  change: number;
  timestamp: string;
  impact: 'Bullish' | 'Bearish' | 'Neutral';
}

interface MarketSummary {
  totalOnLoan: number;
  avgUtilization: number;
  avgBorrowFee: number;
  specialsCount: number;
  hardToBorrowCount: number;
  mostExpensive: string;
  biggestChange: string;
}

const BORROW_RATE_SECURITIES = [
  { ticker: 'TSLA', name: 'Tesla Inc', baseFee: 0.65, baseUtil: 28 },
  { ticker: 'GME', name: 'GameStop Corp', baseFee: 18.5, baseUtil: 91 },
  { ticker: 'AMC', name: 'AMC Entertainment Holdings', baseFee: 12.3, baseUtil: 86 },
  { ticker: 'RIVN', name: 'Rivian Automotive Inc', baseFee: 3.8, baseUtil: 55 },
  { ticker: 'CVNA', name: 'Carvana Co', baseFee: 8.2, baseUtil: 74 },
  { ticker: 'MARA', name: 'Marathon Digital Holdings', baseFee: 4.5, baseUtil: 62 },
  { ticker: 'COIN', name: 'Coinbase Global Inc', baseFee: 1.2, baseUtil: 32 },
  { ticker: 'PLTR', name: 'Palantir Technologies Inc', baseFee: 0.45, baseUtil: 18 },
  { ticker: 'NIO', name: 'NIO Inc', baseFee: 6.7, baseUtil: 68 },
  { ticker: 'BYOR', name: 'Beyond Air Inc', baseFee: 25.4, baseUtil: 94 },
  { ticker: 'SMCI', name: 'Super Micro Computer Inc', baseFee: 9.6, baseUtil: 78 },
  { ticker: 'ARM', name: 'Arm Holdings PLC', baseFee: 2.1, baseUtil: 42 },
];

const SQUEEZE_TICKERS = [
  { ticker: 'GME', baseSI: 22.5, baseCTB: 18.5, baseScore: 82 },
  { ticker: 'AMC', baseSI: 18.2, baseCTB: 12.3, baseScore: 71 },
  { ticker: 'CVNA', baseSI: 14.8, baseCTB: 8.2, baseScore: 58 },
  { ticker: 'SMCI', baseSI: 12.1, baseCTB: 9.6, baseScore: 55 },
  { ticker: 'BYOR', baseSI: 28.6, baseCTB: 25.4, baseScore: 89 },
  { ticker: 'NIO', baseSI: 10.5, baseCTB: 6.7, baseScore: 45 },
  { ticker: 'MARA', baseSI: 8.3, baseCTB: 4.5, baseScore: 38 },
  { ticker: 'RIVN', baseSI: 9.7, baseCTB: 3.8, baseScore: 34 },
];

const AGGREGATE_METRICS = [
  { metric: 'Total Shares on Loan', baseValue: 14.2, baseWeek: 13.8 },
  { metric: 'Lendable Supply', baseValue: 18.7, baseWeek: 18.5 },
  { metric: 'Utilization Rate', baseValue: 75.9, baseWeek: 74.6 },
  { metric: 'Avg Borrow Fee', baseValue: 1.85, baseWeek: 1.72 },
  { metric: 'GC Rate', baseValue: 0.55, baseWeek: 0.52 },
  { metric: 'Specials Count', baseValue: 482, baseWeek: 465 },
];

const ACTIVITY_EVENTS: Array<{
  ticker: string;
  event: string;
  baseRate: number;
  impact: 'Bullish' | 'Bearish' | 'Neutral';
}> = [
  { ticker: 'GME', event: 'New Special', baseRate: 18.5, impact: 'Bullish' },
  { ticker: 'SMCI', event: 'Rate Increase', baseRate: 9.6, impact: 'Bearish' },
  { ticker: 'PLTR', event: 'Rate Decrease', baseRate: 0.45, impact: 'Bullish' },
  { ticker: 'AMC', event: 'Recall Notice', baseRate: 12.3, impact: 'Bullish' },
  { ticker: 'CVNA', event: 'Availability Drop', baseRate: 8.2, impact: 'Bearish' },
  { ticker: 'BYOR', event: 'Threshold List', baseRate: 25.4, impact: 'Bearish' },
  { ticker: 'RIVN', event: 'Rate Increase', baseRate: 3.8, impact: 'Bearish' },
  { ticker: 'ARM', event: 'Rate Decrease', baseRate: 2.1, impact: 'Neutral' },
];


let cache: { data: unknown; ts: number } | null = null;

function classifyFeeScore(rate: number): 'GC' | 'Warm' | 'Special' | 'Hard to Borrow' {
  if (rate <= 1) return 'GC';
  if (rate <= 5) return 'Warm';
  if (rate <= 20) return 'Special';
  return 'Hard to Borrow';
}

function classifyRiskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Extreme' {
  if (score < 30) return 'Low';
  if (score < 55) return 'Medium';
  if (score < 75) return 'High';
  return 'Extreme';
}

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('equity-financing-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));

  // --- 1. Borrow Rates ---
  const borrowRates: BorrowRateEntry[] = BORROW_RATE_SECURITIES.map(s => {
    const borrowRate = Math.round(jitter(s.baseFee, 0.15) * 100) / 100;
    const priorDay = Math.round(jitter(s.baseFee, 0.12) * 100) / 100;
    const change = Math.round((borrowRate - priorDay) * 100) / 100;
    const utilization = Math.round(Math.min(99.9, Math.max(1, jitter(s.baseUtil, 0.08))) * 10) / 10;
    const sharesOnLoan = Math.round(jitter(15, 0.6) * 10) / 10;
    const daysToCover = Math.round(jitter(3.5, 0.5) * 10) / 10;

    return {
      ticker: s.ticker,
      name: s.name,
      borrowRate,
      priorDay,
      change,
      utilization,
      sharesOnLoan,
      daysToCover,
      feeScore: classifyFeeScore(borrowRate),
    };
  });

  // --- 2. Short Squeeze Indicators ---
  const shortSqueezeIndicators: ShortSqueezeEntry[] = SQUEEZE_TICKERS.map(s => {
    const shortInterest = Math.round(jitter(s.baseSI, 0.12) * 10) / 10;
    const shortInterestChange = Math.round((rng() - 0.4) * 5 * 100) / 100;
    const daysToCover = Math.round(jitter(4.2, 0.45) * 10) / 10;
    const costToBorrow = Math.round(jitter(s.baseCTB, 0.15) * 100) / 100;
    const callOIRatio = Math.round(jitter(1.8, 0.5) * 100) / 100;
    const darkPoolShortVolume = Math.round(jitter(42, 0.2) * 10) / 10;
    const squeezeScore = Math.round(Math.min(100, Math.max(0, jitter(s.baseScore, 0.12))));

    return {
      ticker: s.ticker,
      shortInterest,
      shortInterestChange,
      daysToCover,
      costToBorrow,
      callOIRatio,
      darkPoolShortVolume,
      squeezeScore,
      riskLevel: classifyRiskLevel(squeezeScore),
    };
  });

  // --- 3. Market Aggregates ---
  const marketAggregates: MarketAggregate[] = AGGREGATE_METRICS.map(m => {
    const value = Math.round(jitter(m.baseValue, 0.08) * 100) / 100;
    const priorWeek = Math.round(jitter(m.baseWeek, 0.06) * 100) / 100;
    const change = Math.round((value - priorWeek) * 100) / 100;
    const percentile = Math.round(jitter(65, 0.3));
    const trendRoll = rng();
    const trend: 'Rising' | 'Falling' | 'Stable' = change > 0.05 ? 'Rising' : change < -0.05 ? 'Falling' : 'Stable';

    return {
      metric: m.metric,
      value,
      priorWeek,
      change,
      percentile: Math.min(99, Math.max(1, percentile)),
      trend,
    };
  });

  // --- 4. Recent Activity ---
  const baseTime = new Date();
  baseTime.setMinutes(0, 0, 0);
  const recentActivity: RecentActivityEntry[] = ACTIVITY_EVENTS.map((e, i) => {
    const previousRate = Math.round(jitter(e.baseRate, 0.1) * 100) / 100;
    const rateDelta = e.event === 'Rate Decrease'
      ? -(Math.round(rng() * e.baseRate * 0.25 * 100) / 100)
      : Math.round(rng() * e.baseRate * 0.3 * 100) / 100;
    const currentRate = Math.round((previousRate + rateDelta) * 100) / 100;
    const change = Math.round(rateDelta * 100) / 100;
    const ts = new Date(baseTime.getTime() - i * 45 * 60 * 1000);

    return {
      ticker: e.ticker,
      event: e.event,
      previousRate,
      currentRate: Math.max(0.01, currentRate),
      change,
      timestamp: ts.toISOString(),
      impact: e.impact,
    };
  });

  // --- 5. Market Summary ---
  const sortedByRate = [...borrowRates].sort((a, b) => b.borrowRate - a.borrowRate);
  const sortedByChange = [...borrowRates].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const specialsCount = borrowRates.filter(r => r.feeScore === 'Special').length;
  const hardToBorrowCount = borrowRates.filter(r => r.feeScore === 'Hard to Borrow').length;
  const avgUtil = Math.round(borrowRates.reduce((a, r) => a + r.utilization, 0) / borrowRates.length * 10) / 10;
  const avgFee = Math.round(borrowRates.reduce((a, r) => a + r.borrowRate, 0) / borrowRates.length * 100) / 100;
  const totalOnLoan = Math.round(borrowRates.reduce((a, r) => a + r.sharesOnLoan, 0) * 10) / 10;

  const marketSummary: MarketSummary = {
    totalOnLoan: Math.round(jitter(2.4, 0.08) * 100) / 100,
    avgUtilization: avgUtil,
    avgBorrowFee: avgFee,
    specialsCount,
    hardToBorrowCount,
    mostExpensive: sortedByRate[0].ticker,
    biggestChange: sortedByChange[0].ticker,
  };

  return {
    borrowRates,
    shortSqueezeIndicators,
    marketAggregates,
    recentActivity,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityFinancing] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity financing data' });
  }
});

export default router;
