import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Types ──

interface TCAOrder {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  avgPrice: number;
  arrivalPrice: number;
  vwapPrice: number;
  closePrice: number;
  implShortfall: number;
  vsVWAP: number;
  vsClose: number;
  algoUsed: string;
  duration: number;
  fillRate: number;
}

interface VenueStats {
  venue: string;
  fillPct: number;
  avgSpread: number;
  avgLatency: number;
  priceImprovement: number;
  informationLeakage: number;
  venueScore: number;
}

interface AlgoPerformance {
  algorithm: string;
  ordersExecuted: number;
  avgSlippage: number;
  hitRate: number;
  avgParticipation: number;
  avgDuration: number;
  bestFor: string;
}

interface DailyStats {
  totalOrders: number;
  totalShares: number;
  totalNotional: number;
  avgSlippage: number;
  avgFillRate: number;
  darkPoolUsage: number;
  avgLatency: number;
  marketImpact: number;
}

// ── Seed Data ──

const SYMBOLS = [
  { ticker: 'AAPL', basePrice: 195 },
  { ticker: 'MSFT', basePrice: 430 },
  { ticker: 'NVDA', basePrice: 880 },
  { ticker: 'GOOGL', basePrice: 175 },
  { ticker: 'AMZN', basePrice: 185 },
  { ticker: 'META', basePrice: 510 },
  { ticker: 'TSLA', basePrice: 245 },
  { ticker: 'JPM', basePrice: 198 },
  { ticker: 'GS', basePrice: 415 },
  { ticker: 'V', basePrice: 280 },
  { ticker: 'AMD', basePrice: 178 },
  { ticker: 'NFLX', basePrice: 630 },
  { ticker: 'SPY', basePrice: 520 },
  { ticker: 'QQQ', basePrice: 450 },
];

const ALGO_TYPES = ['VWAP', 'TWAP', 'IS', 'POV', 'DarkPool'] as const;

const ALGO_META: Record<string, { baseSlippage: number; baseHitRate: number; baseParticipation: number; baseDuration: number; bestFor: string }> = {
  VWAP: { baseSlippage: 1.8, baseHitRate: 62, baseParticipation: 12, baseDuration: 45, bestFor: 'Large orders tracking volume profile, minimizing market impact over time' },
  TWAP: { baseSlippage: 2.4, baseHitRate: 55, baseParticipation: 8, baseDuration: 60, bestFor: 'Evenly-paced execution in low-volume names or uncertain volume profiles' },
  IS: { baseSlippage: 1.2, baseHitRate: 58, baseParticipation: 18, baseDuration: 25, bestFor: 'Urgency-weighted orders balancing speed vs. cost, aggressive front-loading' },
  POV: { baseSlippage: 2.1, baseHitRate: 60, baseParticipation: 15, baseDuration: 55, bestFor: 'Passive participation in market volume, limiting footprint in illiquid names' },
  DarkSeek: { baseSlippage: 0.9, baseHitRate: 48, baseParticipation: 6, baseDuration: 90, bestFor: 'Minimizing information leakage for block-sized orders via dark pool aggregation' },
};

const VENUE_DATA = [
  { venue: 'NYSE', baseFill: 22, baseSpread: 3.2, baseLatency: 0.45, basePI: 0.8, baseLeak: 2.1, baseScore: 7.8 },
  { venue: 'NASDAQ', baseFill: 26, baseSpread: 2.8, baseLatency: 0.32, basePI: 0.6, baseLeak: 1.9, baseScore: 8.1 },
  { venue: 'BATS', baseFill: 14, baseSpread: 2.5, baseLatency: 0.28, basePI: 0.9, baseLeak: 1.5, baseScore: 7.5 },
  { venue: 'IEX', baseFill: 6, baseSpread: 2.1, baseLatency: 0.85, basePI: 2.4, baseLeak: 0.4, baseScore: 8.6 },
  { venue: 'ARCA', baseFill: 12, baseSpread: 3.0, baseLatency: 0.38, basePI: 0.7, baseLeak: 1.8, baseScore: 7.2 },
  { venue: 'DirectEdge', baseFill: 8, baseSpread: 2.9, baseLatency: 0.35, basePI: 0.5, baseLeak: 1.6, baseScore: 7.0 },
  { venue: 'DarkPools', baseFill: 9, baseSpread: 1.5, baseLatency: 1.20, basePI: 1.8, baseLeak: 0.3, baseScore: 7.9 },
  { venue: 'InternalCross', baseFill: 3, baseSpread: 0.8, baseLatency: 0.05, basePI: 1.2, baseLeak: 0.1, baseScore: 8.3 },
];

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ── Generator ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('execution-analytics-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── TCA Summary: last 10 executed orders ──
  const tcaOrders: TCAOrder[] = [];
  for (let i = 0; i < 10; i++) {
    const sym = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
    const side: 'BUY' | 'SELL' = rng() > 0.5 ? 'BUY' : 'SELL';
    const quantity = Math.round((500 + rng() * 19500) / 100) * 100;
    const algo = ALGO_TYPES[Math.floor(rng() * ALGO_TYPES.length)];

    // Arrival price with daily noise
    const arrivalPrice = round4(sym.basePrice * (1 + (rng() - 0.5) * 0.03));

    // VWAP price: typically close to arrival, slight drift
    const vwapPrice = round4(arrivalPrice * (1 + (rng() - 0.48) * 0.004));

    // Close price: wider range from arrival
    const closePrice = round4(arrivalPrice * (1 + (rng() - 0.5) * 0.012));

    // Avg execution price: slippage direction depends on side
    const slippageDir = side === 'BUY' ? 1 : -1;
    const rawSlippage = (rng() * 0.0005 + rng() * 0.0003) * slippageDir;
    const avgPrice = round4(arrivalPrice * (1 + rawSlippage));

    // Implementation shortfall in bps (adverse direction)
    const implShortfall = round2(Math.abs((avgPrice - arrivalPrice) / arrivalPrice) * 10000);

    // vs VWAP in bps (positive = worse than VWAP for buy, better for sell)
    const vsVWAP = round2(((avgPrice - vwapPrice) / vwapPrice) * 10000 * slippageDir);

    // vs Close in bps
    const vsClose = round2(((avgPrice - closePrice) / closePrice) * 10000 * slippageDir);

    // Duration in minutes: algo-dependent
    const algoKey = algo === 'DarkPool' ? 'DarkSeek' : algo;
    const baseDur = ALGO_META[algoKey]?.baseDuration ?? 40;
    const duration = Math.round(jitter(baseDur, 0.35));

    // Fill rate: mostly high, occasional partial
    const fillRate = round2(Math.min(100, jitter(96, 0.04)));

    const orderId = `EX-${day.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;

    tcaOrders.push({
      orderId,
      symbol: sym.ticker,
      side,
      quantity,
      avgPrice,
      arrivalPrice,
      vwapPrice,
      closePrice,
      implShortfall,
      vsVWAP,
      vsClose,
      algoUsed: algo,
      duration,
      fillRate,
    });
  }

  // ── Venue Analysis ──
  const venues: VenueStats[] = VENUE_DATA.map(v => {
    const fillPct = round2(jitter(v.baseFill, 0.08));
    const avgSpread = round2(jitter(v.baseSpread, 0.12));
    const avgLatency = round2(jitter(v.baseLatency, 0.15));
    const priceImprovement = round2(Math.max(0, jitter(v.basePI, 0.2)));
    const informationLeakage = round2(Math.max(0, jitter(v.baseLeak, 0.18)));
    const rawScore = jitter(v.baseScore, 0.06);
    const venueScore = round2(Math.min(10, Math.max(1, rawScore)));

    return {
      venue: v.venue,
      fillPct,
      avgSpread,
      avgLatency,
      priceImprovement,
      informationLeakage,
      venueScore,
    };
  });

  // Normalize fill percentages to sum to 100%
  const rawFillSum = venues.reduce((a, v) => a + v.fillPct, 0);
  for (const v of venues) {
    v.fillPct = round2((v.fillPct / rawFillSum) * 100);
  }

  // ── Algo Performance ──
  const algoPerformance: AlgoPerformance[] = ['VWAP', 'TWAP', 'Implementation Shortfall', 'POV', 'DarkSeek'].map(name => {
    const key = name === 'Implementation Shortfall' ? 'IS' : name;
    const meta = ALGO_META[key];
    const ordersExecuted = Math.round(jitter(key === 'DarkSeek' ? 35 : key === 'IS' ? 55 : key === 'POV' ? 48 : key === 'TWAP' ? 42 : 65, 0.15));
    const avgSlippage = round2(Math.max(0.1, jitter(meta.baseSlippage, 0.2)));
    const hitRate = round2(Math.min(75, Math.max(35, jitter(meta.baseHitRate, 0.08))));
    const avgParticipation = round2(Math.max(1, jitter(meta.baseParticipation, 0.2)));
    const avgDuration = Math.round(jitter(meta.baseDuration, 0.15));

    return {
      algorithm: name,
      ordersExecuted,
      avgSlippage,
      hitRate,
      avgParticipation,
      avgDuration,
      bestFor: meta.bestFor,
    };
  });

  // ── Daily Stats ──
  const totalOrders = Math.round(jitter(245, 0.1));
  const totalSharesRaw = jitter(12.5, 0.15);
  const totalShares = round2(totalSharesRaw);
  const avgPriceEst = 320;
  const totalNotional = round2(totalSharesRaw * avgPriceEst);
  const avgSlippage = round2(jitter(1.8, 0.15));
  const avgFillRate = round2(Math.min(100, jitter(96.5, 0.02)));
  const darkPoolUsage = round2(jitter(12.5, 0.12));
  const avgLatency = round2(jitter(0.42, 0.18));
  const marketImpact = round2(jitter(2.3, 0.15));

  const dailyStats: DailyStats = {
    totalOrders,
    totalShares,
    totalNotional,
    avgSlippage,
    avgFillRate,
    darkPoolUsage,
    avgLatency,
    marketImpact,
  };

  return {
    tcaSummary: tcaOrders,
    venueAnalysis: venues,
    algoPerformance,
    dailyStats,
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
    console.error('[ExecutionAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate execution analytics data' });
  }
});

export default router;
