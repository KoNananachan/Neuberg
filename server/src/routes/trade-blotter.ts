import { Router } from 'express';

const router = Router();

// ── Types ──

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  avgPrice: number;
  vwap: number;
  twap: number;
  arrivalPrice: number;
  closePrice: number;
  slippageBps: number;
  vwapSlippageBps: number;
  implementationShortfall: number;
  marketImpact: number;
  participationRate: number;
  executionTime: string;
  duration: number;
  fills: number;
  algo: string;
  venue: string;
  status: string;
  qualityScore: number;
}

interface ExecutionSummary {
  totalTrades: number;
  avgSlippageBps: number;
  avgVwapSlippageBps: number;
  avgQualityScore: number;
  totalVolume: number;
  bestExecution: { symbol: string; slippageBps: number };
  worstExecution: { symbol: string; slippageBps: number };
  algoBreakdown: { algo: string; count: number; avgSlippage: number }[];
  venueBreakdown: { venue: string; count: number; avgSlippage: number }[];
  slippageDistribution: number[];
}

interface TradeBlotterResponse {
  trades: Trade[];
  summary: ExecutionSummary;
  timestamp: string;
}

// ── Seed data ──

const TICKERS = [
  { symbol: 'AAPL', basePrice: 195 },
  { symbol: 'MSFT', basePrice: 430 },
  { symbol: 'NVDA', basePrice: 880 },
  { symbol: 'GOOGL', basePrice: 175 },
  { symbol: 'AMZN', basePrice: 185 },
  { symbol: 'META', basePrice: 510 },
  { symbol: 'TSLA', basePrice: 245 },
  { symbol: 'JPM', basePrice: 198 },
  { symbol: 'V', basePrice: 280 },
  { symbol: 'UNH', basePrice: 520 },
  { symbol: 'AMD', basePrice: 178 },
  { symbol: 'NFLX', basePrice: 630 },
  { symbol: 'SPY', basePrice: 520 },
  { symbol: 'QQQ', basePrice: 450 },
  { symbol: 'GS', basePrice: 415 },
];

const ALGOS: string[] = ['VWAP', 'TWAP', 'IS', 'POV', 'LIMIT', 'MARKET'];
const VENUES: string[] = ['NYSE', 'NASDAQ', 'DARK', 'MULTI'];
const STATUSES: string[] = ['FILLED', 'FILLED', 'FILLED', 'FILLED', 'PARTIAL', 'WORKING'];

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** Seeded PRNG for deterministic variation */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateTrades(timeSeed: number): Trade[] {
  const rng = seededRandom(timeSeed);
  const trades: Trade[] = [];

  // Generate ~25 trades
  const numTrades = 24 + Math.floor(rng() * 3);

  for (let i = 0; i < numTrades; i++) {
    const ticker = TICKERS[Math.floor(rng() * TICKERS.length)];
    const side = rng() > 0.5 ? 'BUY' : 'SELL';
    const algo = ALGOS[Math.floor(rng() * ALGOS.length)];
    const venue = VENUES[Math.floor(rng() * VENUES.length)];
    const status = STATUSES[Math.floor(rng() * STATUSES.length)];

    // Base price with some randomness
    const priceNoise = (rng() - 0.5) * ticker.basePrice * 0.02;
    const arrivalPrice = round4(ticker.basePrice + priceNoise);

    // VWAP is typically close to arrival
    const vwapOffset = (rng() - 0.45) * ticker.basePrice * 0.003;
    const vwap = round4(arrivalPrice + vwapOffset);

    // TWAP
    const twapOffset = (rng() - 0.48) * ticker.basePrice * 0.0025;
    const twap = round4(arrivalPrice + twapOffset);

    // Execution average price — slight slippage from arrival
    const slippageDir = side === 'BUY' ? 1 : -1;
    const rawSlippage = (rng() * 0.004 - 0.001) * slippageDir;
    const avgPrice = round4(arrivalPrice * (1 + rawSlippage));

    // Close price
    const closeOffset = (rng() - 0.5) * ticker.basePrice * 0.01;
    const closePrice = round4(arrivalPrice + closeOffset);

    // Slippage in bps
    const slippageBps = round2(((avgPrice - arrivalPrice) / arrivalPrice) * 10000 * slippageDir);
    const vwapSlippageBps = round2(((avgPrice - vwap) / vwap) * 10000 * slippageDir);

    // Implementation shortfall = (avgPrice - arrivalPrice) / arrivalPrice * 10000
    const implementationShortfall = round2(Math.abs(avgPrice - arrivalPrice) / arrivalPrice * 10000);

    // Market impact estimate (subset of IS)
    const marketImpact = round2(implementationShortfall * (0.3 + rng() * 0.4));

    // Participation rate
    const participationRate = round2(1 + rng() * 24);

    // Quantity
    const quantity = Math.round((100 + rng() * 9900) / 100) * 100;

    // Duration in seconds
    const duration = Math.round(30 + rng() * 3600);

    // Fills
    const fills = Math.max(1, Math.round(quantity / (200 + rng() * 800)));

    // Execution time — spread across the trading day
    const baseHour = 9;
    const baseMinute = 30;
    const minuteOffset = Math.floor(rng() * 390); // 6.5 hours
    const execHour = baseHour + Math.floor((baseMinute + minuteOffset) / 60);
    const execMinute = (baseMinute + minuteOffset) % 60;
    const execSecond = Math.floor(rng() * 60);
    const today = new Date();
    today.setHours(execHour, execMinute, execSecond, 0);
    const executionTime = today.toISOString();

    // Quality score: higher is better (lower slippage = higher quality)
    const absSlippage = Math.abs(slippageBps);
    let qualityScore = Math.round(95 - absSlippage * 8 + (rng() - 0.5) * 10);
    qualityScore = Math.max(15, Math.min(99, qualityScore));

    trades.push({
      id: `TRD-${String(timeSeed).slice(-4)}-${String(i + 1).padStart(3, '0')}`,
      symbol: ticker.symbol,
      side,
      quantity,
      avgPrice,
      vwap,
      twap,
      arrivalPrice,
      closePrice,
      slippageBps,
      vwapSlippageBps,
      implementationShortfall,
      marketImpact,
      participationRate,
      executionTime,
      duration,
      fills,
      algo,
      venue,
      status,
      qualityScore,
    });
  }

  // Sort by execution time descending (most recent first)
  trades.sort((a, b) => new Date(b.executionTime).getTime() - new Date(a.executionTime).getTime());

  return trades;
}

function computeSummary(trades: Trade[]): ExecutionSummary {
  const totalTrades = trades.length;
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      avgSlippageBps: 0,
      avgVwapSlippageBps: 0,
      avgQualityScore: 0,
      totalVolume: 0,
      bestExecution: { symbol: '-', slippageBps: 0 },
      worstExecution: { symbol: '-', slippageBps: 0 },
      algoBreakdown: [],
      venueBreakdown: [],
      slippageDistribution: [],
    };
  }

  const avgSlippageBps = round2(
    trades.reduce((s, t) => s + t.slippageBps, 0) / totalTrades,
  );
  const avgVwapSlippageBps = round2(
    trades.reduce((s, t) => s + t.vwapSlippageBps, 0) / totalTrades,
  );
  const avgQualityScore = Math.round(
    trades.reduce((s, t) => s + t.qualityScore, 0) / totalTrades,
  );
  const totalVolume = trades.reduce((s, t) => s + t.quantity, 0);

  // Best/worst by absolute slippage
  const sorted = [...trades].sort((a, b) => Math.abs(a.slippageBps) - Math.abs(b.slippageBps));
  const bestExecution = { symbol: sorted[0].symbol, slippageBps: sorted[0].slippageBps };
  const worstExecution = {
    symbol: sorted[sorted.length - 1].symbol,
    slippageBps: sorted[sorted.length - 1].slippageBps,
  };

  // Algo breakdown
  const algoMap = new Map<string, { count: number; totalSlippage: number }>();
  for (const t of trades) {
    const entry = algoMap.get(t.algo) || { count: 0, totalSlippage: 0 };
    entry.count++;
    entry.totalSlippage += Math.abs(t.slippageBps);
    algoMap.set(t.algo, entry);
  }
  const algoBreakdown = [...algoMap.entries()].map(([algo, v]) => ({
    algo,
    count: v.count,
    avgSlippage: round2(v.totalSlippage / v.count),
  })).sort((a, b) => b.count - a.count);

  // Venue breakdown
  const venueMap = new Map<string, { count: number; totalSlippage: number }>();
  for (const t of trades) {
    const entry = venueMap.get(t.venue) || { count: 0, totalSlippage: 0 };
    entry.count++;
    entry.totalSlippage += Math.abs(t.slippageBps);
    venueMap.set(t.venue, entry);
  }
  const venueBreakdown = [...venueMap.entries()].map(([venue, v]) => ({
    venue,
    count: v.count,
    avgSlippage: round2(v.totalSlippage / v.count),
  })).sort((a, b) => b.count - a.count);

  // Slippage distribution histogram: 10 buckets from -5 to +5 bps
  const BUCKETS = 10;
  const MIN_BPS = -5;
  const MAX_BPS = 5;
  const bucketWidth = (MAX_BPS - MIN_BPS) / BUCKETS;
  const slippageDistribution = new Array(BUCKETS).fill(0);
  for (const t of trades) {
    const clamped = Math.max(MIN_BPS, Math.min(MAX_BPS - 0.001, t.slippageBps));
    const idx = Math.floor((clamped - MIN_BPS) / bucketWidth);
    slippageDistribution[Math.min(idx, BUCKETS - 1)]++;
  }

  return {
    totalTrades,
    avgSlippageBps,
    avgVwapSlippageBps,
    avgQualityScore,
    totalVolume,
    bestExecution,
    worstExecution,
    algoBreakdown,
    venueBreakdown,
    slippageDistribution,
  };
}

// ── Cache ──

let cache: { data: TradeBlotterResponse; expiresAt: number } = {
  data: null as unknown as TradeBlotterResponse,
  expiresAt: 0,
};
const CACHE_TTL = 120_000; // 2 minutes

// GET /api/trade-blotter
router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const timeSeed = Math.floor(now / CACHE_TTL);
    const trades = generateTrades(timeSeed);
    const summary = computeSummary(trades);

    const response: TradeBlotterResponse = {
      trades,
      summary,
      timestamp: new Date().toISOString(),
    };

    cache = { data: response, expiresAt: now + CACHE_TTL };
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TradeBlotter] Error:', message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate trade blotter data' });
  }
});

export default router;
