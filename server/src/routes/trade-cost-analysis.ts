import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Types ──

interface ExecutionSummary {
  totalOrders: number;
  totalNotional: number;
  avgSlippage: number;
  avgImplementationShortfall: number;
  participationRate: number;
  fillRate: number;
  avgTimeSecs: number;
  benchmarkBeatRate: number;
}

interface BenchmarkEntry {
  benchmark: string;
  avgDeviation: number;
  stdDev: number;
  percentBeat: number;
  bestExecution: { ticker: string; deviation: number };
  worstExecution: { ticker: string; deviation: number };
}

interface SlippageBucket {
  bucket: string;
  orderCount: number;
  avgSlippage: number;
  avgMarketImpact: number;
  avgSpreadCost: number;
  avgTimingCost: number;
}

interface VenueEntry {
  venue: string;
  fillRate: number;
  avgPriceImprovement: number;
  avgFillTime: number;
  orderRouted: number;
  toxicityScore: number;
}

interface CostBreakdown {
  commission: number;
  spreadCost: number;
  marketImpact: number;
  timingCost: number;
  opportunityCost: number;
  totalImplementationShortfall: number;
}

interface RecentTrade {
  ticker: string;
  side: 'buy' | 'sell';
  quantity: number;
  avgPrice: number;
  benchmark: number;
  slippage: number;
  venue: string;
  timestamp: string;
}

// ── Seed Data ──

const TICKERS = [
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
  { ticker: 'BAC', basePrice: 38 },
];

const VENUES = ['NYSE', 'NASDAQ', 'BATS', 'IEX', 'EDGX', 'Dark Pools', 'Internalization'];

const SIZE_BUCKETS = ['0-100K', '100K-500K', '500K-1M', '1M-5M', '5M+'];

const BENCHMARKS = ['VWAP', 'TWAP', 'Arrival Price'];

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Generator ──

function generate() {
  const seed = hashSeed('trade-cost-analysis-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── Execution Summary ──
  const totalOrders = Math.round(jitter(1842, 0.12));
  const totalNotional = round2(jitter(2450, 0.15));
  const avgSlippage = round2(jitter(2.3, 0.2));
  const avgImplementationShortfall = round2(jitter(3.8, 0.18));
  const participationRate = round2(Math.min(25, Math.max(5, jitter(12.5, 0.2))));
  const fillRate = round2(Math.min(100, jitter(96.8, 0.02)));
  const avgTimeSecs = Math.round(jitter(185, 0.2));
  const benchmarkBeatRate = round2(Math.min(80, Math.max(45, jitter(62.5, 0.1))));

  const executionSummary: ExecutionSummary = {
    totalOrders,
    totalNotional,
    avgSlippage,
    avgImplementationShortfall,
    participationRate,
    fillRate,
    avgTimeSecs,
    benchmarkBeatRate,
  };

  // ── Benchmark Comparison ──
  const benchmarkComparison: BenchmarkEntry[] = BENCHMARKS.map(name => {
    const baseDeviation = name === 'VWAP' ? 1.8 : name === 'TWAP' ? 2.5 : 1.4;
    const baseStdDev = name === 'VWAP' ? 3.2 : name === 'TWAP' ? 4.1 : 2.8;
    const baseBeat = name === 'VWAP' ? 58 : name === 'TWAP' ? 52 : 64;

    const avgDeviation = round2(jitter(baseDeviation, 0.2));
    const stdDev = round2(jitter(baseStdDev, 0.15));
    const percentBeat = round2(Math.min(80, Math.max(40, jitter(baseBeat, 0.08))));

    // Pick best and worst execution tickers
    const bestIdx = Math.floor(rng() * TICKERS.length);
    let worstIdx = Math.floor(rng() * TICKERS.length);
    if (worstIdx === bestIdx) worstIdx = (worstIdx + 1) % TICKERS.length;

    const bestDeviation = round2(-1 * jitter(4.5, 0.3));
    const worstDeviation = round2(jitter(8.2, 0.3));

    return {
      benchmark: name,
      avgDeviation,
      stdDev,
      percentBeat,
      bestExecution: { ticker: TICKERS[bestIdx].ticker, deviation: bestDeviation },
      worstExecution: { ticker: TICKERS[worstIdx].ticker, deviation: worstDeviation },
    };
  });

  // ── Slippage Analysis by Order Size ──
  const slippageAnalysis: SlippageBucket[] = SIZE_BUCKETS.map((bucket, i) => {
    // Larger orders have higher slippage, market impact, etc.
    const sizeMultiplier = 1 + i * 0.35;
    const baseOrders = [520, 380, 210, 85, 25];

    const orderCount = Math.round(jitter(baseOrders[i], 0.15));
    const avgSlippageBucket = round2(jitter(1.5 * sizeMultiplier, 0.2));
    const avgMarketImpact = round2(jitter(1.2 * sizeMultiplier, 0.25));
    const avgSpreadCost = round2(jitter(0.8, 0.15));
    const avgTimingCost = round2(jitter(0.5 * sizeMultiplier, 0.2));

    return {
      bucket,
      orderCount,
      avgSlippage: avgSlippageBucket,
      avgMarketImpact,
      avgSpreadCost,
      avgTimingCost,
    };
  });

  // ── Venue Analysis ──
  const venueBaseData = [
    { venue: 'NYSE',           baseFill: 94.2, basePI: 0.3, baseFillTime: 85,  baseRouted: 22, baseToxicity: 0.42 },
    { venue: 'NASDAQ',         baseFill: 95.8, basePI: 0.4, baseFillTime: 62,  baseRouted: 28, baseToxicity: 0.38 },
    { venue: 'BATS',           baseFill: 93.5, basePI: 0.5, baseFillTime: 55,  baseRouted: 15, baseToxicity: 0.35 },
    { venue: 'IEX',            baseFill: 88.2, basePI: 1.8, baseFillTime: 120, baseRouted: 8,  baseToxicity: 0.18 },
    { venue: 'EDGX',           baseFill: 92.1, basePI: 0.6, baseFillTime: 58,  baseRouted: 12, baseToxicity: 0.40 },
    { venue: 'Dark Pools',     baseFill: 72.5, basePI: 2.2, baseFillTime: 250, baseRouted: 10, baseToxicity: 0.22 },
    { venue: 'Internalization', baseFill: 98.5, basePI: 0.1, baseFillTime: 15,  baseRouted: 5,  baseToxicity: 0.55 },
  ];

  const venueAnalysis: VenueEntry[] = venueBaseData.map(v => {
    const fillRateVenue = round2(Math.min(100, jitter(v.baseFill, 0.03)));
    const avgPriceImprovement = round2(Math.max(0, jitter(v.basePI, 0.25)));
    const avgFillTime = Math.round(jitter(v.baseFillTime, 0.18));
    const orderRouted = round2(jitter(v.baseRouted, 0.1));
    const toxicityScore = round2(Math.min(1, Math.max(0, jitter(v.baseToxicity, 0.15))));

    return {
      venue: v.venue,
      fillRate: fillRateVenue,
      avgPriceImprovement,
      avgFillTime,
      orderRouted,
      toxicityScore,
    };
  });

  // Normalize orderRouted to sum to 100%
  const routedSum = venueAnalysis.reduce((a, v) => a + v.orderRouted, 0);
  for (const v of venueAnalysis) {
    v.orderRouted = round2((v.orderRouted / routedSum) * 100);
  }

  // ── Cost Breakdown (all in bps) ──
  const commission = round2(jitter(1.2, 0.15));
  const spreadCost = round2(jitter(2.1, 0.2));
  const marketImpact = round2(jitter(3.5, 0.22));
  const timingCost = round2(jitter(1.8, 0.2));
  const opportunityCost = round2(jitter(0.9, 0.25));
  const totalIS = round2(commission + spreadCost + marketImpact + timingCost + opportunityCost);

  const costBreakdown: CostBreakdown = {
    commission,
    spreadCost,
    marketImpact,
    timingCost,
    opportunityCost,
    totalImplementationShortfall: totalIS,
  };

  // ── Recent Trades ──
  const today = new Date().toISOString().slice(0, 10);
  const recentTrades: RecentTrade[] = [];
  for (let i = 0; i < 10; i++) {
    const sym = TICKERS[Math.floor(rng() * TICKERS.length)];
    const side: 'buy' | 'sell' = rng() > 0.5 ? 'buy' : 'sell';
    const quantity = Math.round((100 + rng() * 9900) / 100) * 100;
    const basePrice = sym.basePrice * (1 + (rng() - 0.5) * 0.03);
    const vwapBenchmark = round4(basePrice * (1 + (rng() - 0.48) * 0.004));
    const slippageDir = side === 'buy' ? 1 : -1;
    const rawSlippage = (rng() * 0.0006 + rng() * 0.0002) * slippageDir;
    const avgPriceTrade = round4(basePrice * (1 + rawSlippage));
    const slippageBps = round2(((avgPriceTrade - vwapBenchmark) / vwapBenchmark) * 10000 * slippageDir);

    const venue = VENUES[Math.floor(rng() * VENUES.length)];

    // Generate timestamp spread across the day
    const hour = 9 + Math.floor(rng() * 7);
    const minute = Math.floor(rng() * 60);
    const second = Math.floor(rng() * 60);
    const timestamp = `${today}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`;

    recentTrades.push({
      ticker: sym.ticker,
      side,
      quantity,
      avgPrice: round4(avgPriceTrade),
      benchmark: vwapBenchmark,
      slippage: slippageBps,
      venue,
      timestamp,
    });
  }

  // Sort recent trades by timestamp descending
  recentTrades.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return {
    executionSummary,
    benchmarkComparison,
    slippageAnalysis,
    venueAnalysis,
    costBreakdown,
    recentTrades,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[TradeCostAnalysis] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate trade cost analysis data' });
  }
});

export default router;
