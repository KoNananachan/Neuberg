import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

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

interface RichCheapRow {
  security: string;
  yield: number;
  spread: number;
  richCheap: number;
  zscore: number;
  percentile: number;
  liquidity: string;
  signal: string;
}

interface ButterflyTrade {
  name: string;
  shortWing: number;
  belly: number;
  longWing: number;
  currentSpread: number;
  historicalAvg: number;
  zscore: number;
  signal: string;
  pnl30d: number;
}

interface SwapSpreadRow {
  tenor: string;
  govtYield: number;
  swapRate: number;
  swapSpread: number;
  change: number;
  weekChange: number;
  percentile: number;
  direction: string;
}

interface CurveTrade {
  trade: string;
  currentSpread: number;
  target: number;
  stopLoss: number;
  conviction: string;
  carry: number;
  rolldown: number;
}

interface MarketSummary {
  avgRichCheapZscore: number;
  mostRich: string;
  mostCheap: string;
  butterflyAvgZscore: number;
  swapSpreadTrend: string;
  dominantTheme: string;
}

interface BondRelativeValueResponse {
  richCheap: RichCheapRow[];
  butterflyTrades: ButterflyTrade[];
  swapSpreads: SwapSpreadRow[];
  curveTrades: CurveTrade[];
  marketSummary: MarketSummary;
  generatedAt: string;
}

// ── Static configs ──

const RICH_CHEAP_SECURITIES = [
  'UST 2Y OTR', 'UST 2Y OFR', 'UST 5Y OTR', 'UST 5Y OFR',
  'UST 10Y OTR', 'UST 10Y OFR', 'UST 30Y OTR', 'UST 30Y OFR',
  'Bund 10Y', 'JGB 10Y',
] as const;

const RICH_CHEAP_BASE_YIELDS: Record<string, number> = {
  'UST 2Y OTR': 4.55, 'UST 2Y OFR': 4.58,
  'UST 5Y OTR': 4.22, 'UST 5Y OFR': 4.25,
  'UST 10Y OTR': 4.28, 'UST 10Y OFR': 4.31,
  'UST 30Y OTR': 4.48, 'UST 30Y OFR': 4.51,
  'Bund 10Y': 2.65, 'JGB 10Y': 0.88,
};

const BUTTERFLY_NAMES = [
  '2s5s10s UST', '5s10s30s UST', '2s5s10s Bund',
  '5s10s30s Gilt', '2s5s10s JGB', 'IG 5s10s30s',
] as const;

const SWAP_SPREAD_TENORS = ['2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y', '5Y5Y'] as const;

const SWAP_SPREAD_BASE_GOVT: Record<string, number> = {
  '2Y': 4.52, '3Y': 4.38, '5Y': 4.22, '7Y': 4.25,
  '10Y': 4.28, '20Y': 4.42, '30Y': 4.48, '5Y5Y': 4.35,
};

const SWAP_SPREAD_BASE_OFFSET: Record<string, number> = {
  '2Y': 10, '3Y': 7, '5Y': 4, '7Y': 3,
  '10Y': 2, '20Y': -8, '30Y': -18, '5Y5Y': -5,
};

const CURVE_TRADE_CONFIGS = [
  { trade: '2s10s Steepener', baseSpread: -25, targetDelta: 15, stopDelta: -10 },
  { trade: '5s30s Flattener', baseSpread: 28, targetDelta: -12, stopDelta: 8 },
  { trade: '2s5s10s Barbell', baseSpread: 12, targetDelta: -8, stopDelta: 6 },
  { trade: '10s30s Steepener', baseSpread: 20, targetDelta: 10, stopDelta: -8 },
  { trade: 'EUR-USD 10Y Spread', baseSpread: -163, targetDelta: 12, stopDelta: -10 },
  { trade: 'UST-Bund 2Y Spread', baseSpread: 190, targetDelta: -15, stopDelta: 10 },
] as const;

const LIQUIDITY_LEVELS = ['High', 'Medium', 'Low'] as const;
const RICH_CHEAP_SIGNALS = ['Buy', 'Sell', 'Hold'] as const;
const BUTTERFLY_SIGNALS = ['Overweight Belly', 'Underweight Belly', 'Fair'] as const;
const DIRECTION_OPTIONS = ['Widening', 'Tightening', 'Stable'] as const;
const CONVICTION_LEVELS = ['High', 'Medium', 'Low'] as const;
const DOMINANT_THEMES = [
  'Curve Flattening', 'Rich Front-End', 'Cheap Long-End',
  'Swap Spread Tightening', 'Bull Steepening', 'Bear Flattening',
] as const;

// ── Cache ──

const CACHE_TTL = 5 * 60_000;
let cache: { data: BondRelativeValueResponse | null; ts: number } = { data: null, ts: 0 };

// ── Helpers ──

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ── Data generation ──

function generate(): BondRelativeValueResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-bond-relative-value'));

  // ── Rich/Cheap analysis ──

  const richCheap: RichCheapRow[] = RICH_CHEAP_SECURITIES.map(security => {
    const baseYield = RICH_CHEAP_BASE_YIELDS[security];
    const yieldNoise = (rng() - 0.5) * 0.12;
    const yld = roundTo(baseYield + yieldNoise, 3);

    const isOFR = security.includes('OFR');
    const isForeign = security.includes('Bund') || security.includes('JGB');

    // OFR securities tend to be cheap (positive), OTR tend to be rich (negative)
    const baseBias = isOFR ? 2.5 : isForeign ? (rng() - 0.5) * 6 : -1.5;
    const richCheapVal = roundTo(baseBias + (rng() - 0.5) * 8, 1);

    // Spread vs benchmark
    const spread = roundTo((rng() - 0.5) * 20 + (isOFR ? 3 : 0), 1);

    // Z-score correlates with rich/cheap
    const zscore = roundTo(richCheapVal / 3 + (rng() - 0.5) * 0.6, 2);

    // Percentile
    const rawPctile = 50 + richCheapVal * 4 + (rng() - 0.5) * 15;
    const percentile = Math.max(1, Math.min(99, Math.round(rawPctile)));

    // Liquidity: OTR = High, OFR = Medium, foreign = varies
    let liquidity: string;
    if (security.includes('OTR')) liquidity = 'High';
    else if (security.includes('OFR')) liquidity = 'Medium';
    else liquidity = pick(rng, LIQUIDITY_LEVELS);

    // Signal based on rich/cheap
    let signal: string;
    if (richCheapVal > 3) signal = 'Buy';
    else if (richCheapVal < -3) signal = 'Sell';
    else signal = 'Hold';

    return { security, yield: yld, spread, richCheap: richCheapVal, zscore, percentile, liquidity, signal };
  });

  // ── Butterfly trades ──

  const butterflyTrades: ButterflyTrade[] = BUTTERFLY_NAMES.map(name => {
    const isUST = name.includes('UST');
    const isIG = name.includes('IG');

    // Wing yields
    const shortWing = roundTo((isUST ? 4.5 : isIG ? 5.2 : 2.0) + (rng() - 0.5) * 0.3, 3);
    const longWing = roundTo(shortWing + 0.15 + rng() * 0.4, 3);
    const belly = roundTo((shortWing + longWing) / 2 + (rng() - 0.5) * 0.15, 3);

    // Butterfly spread = 2 * belly - shortWing - longWing (in bp)
    const currentSpread = roundTo((2 * belly - shortWing - longWing) * 100, 1);
    const historicalAvg = roundTo(currentSpread + (rng() - 0.5) * 12, 1);

    const stdDev = 3 + rng() * 4;
    const zscore = roundTo((currentSpread - historicalAvg) / stdDev, 2);

    let signal: string;
    if (zscore > 0.8) signal = 'Underweight Belly';
    else if (zscore < -0.8) signal = 'Overweight Belly';
    else signal = 'Fair';

    // 30-day PnL in bp
    const pnl30d = roundTo((rng() - 0.45) * 20, 1);

    return { name, shortWing, belly, longWing, currentSpread, historicalAvg, zscore, signal, pnl30d };
  });

  // ── Swap spreads ──

  const swapSpreads: SwapSpreadRow[] = SWAP_SPREAD_TENORS.map(tenor => {
    const baseGovt = SWAP_SPREAD_BASE_GOVT[tenor];
    const baseOffset = SWAP_SPREAD_BASE_OFFSET[tenor];

    const govtNoise = (rng() - 0.5) * 0.08;
    const govtYield = roundTo(baseGovt + govtNoise, 3);

    const spreadNoise = (rng() - 0.5) * 5;
    const swapSpread = roundTo(baseOffset + spreadNoise, 1);

    const swapRate = roundTo(govtYield + swapSpread / 100, 3);

    const change = roundTo((rng() - 0.5) * 3, 1);
    const weekChange = roundTo((rng() - 0.5) * 8, 1);

    const rawPctile = 50 + (swapSpread - baseOffset) * 5 + (rng() - 0.5) * 20;
    const percentile = Math.max(1, Math.min(99, Math.round(rawPctile)));

    let direction: string;
    if (change > 0.5) direction = 'Widening';
    else if (change < -0.5) direction = 'Tightening';
    else direction = 'Stable';

    return { tenor, govtYield, swapRate, swapSpread, change, weekChange, percentile, direction };
  });

  // ── Curve trades ──

  const curveTrades: CurveTrade[] = CURVE_TRADE_CONFIGS.map(cfg => {
    const noise = (rng() - 0.5) * 10;
    const currentSpread = roundTo(cfg.baseSpread + noise, 1);
    const target = roundTo(currentSpread + cfg.targetDelta + (rng() - 0.5) * 4, 1);
    const stopLoss = roundTo(currentSpread + cfg.stopDelta + (rng() - 0.5) * 3, 1);

    const conviction = pick(rng, CONVICTION_LEVELS);
    const carry = roundTo((rng() - 0.3) * 4, 1);
    const rolldown = roundTo((rng() - 0.2) * 3, 1);

    return { trade: cfg.trade, currentSpread, target, stopLoss, conviction, carry, rolldown };
  });

  // ── Market summary ──

  const rcZscores = richCheap.map(r => r.zscore);
  const avgRichCheapZscore = roundTo(rcZscores.reduce((a, b) => a + b, 0) / rcZscores.length, 2);

  const sortedByRC = [...richCheap].sort((a, b) => a.richCheap - b.richCheap);
  const mostRich = sortedByRC[0].security;
  const mostCheap = sortedByRC[sortedByRC.length - 1].security;

  const bfZscores = butterflyTrades.map(b => b.zscore);
  const butterflyAvgZscore = roundTo(bfZscores.reduce((a, b) => a + b, 0) / bfZscores.length, 2);

  const wideningCount = swapSpreads.filter(s => s.direction === 'Widening').length;
  const tighteningCount = swapSpreads.filter(s => s.direction === 'Tightening').length;
  let swapSpreadTrend: string;
  if (wideningCount > tighteningCount + 1) swapSpreadTrend = 'Widening';
  else if (tighteningCount > wideningCount + 1) swapSpreadTrend = 'Tightening';
  else swapSpreadTrend = 'Mixed';

  const dominantTheme = pick(rng, DOMINANT_THEMES);

  const marketSummary: MarketSummary = {
    avgRichCheapZscore,
    mostRich,
    mostCheap,
    butterflyAvgZscore,
    swapSpreadTrend,
    dominantTheme,
  };

  return {
    richCheap,
    butterflyTrades,
    swapSpreads,
    curveTrades,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[BondRelativeValue] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate bond relative value data' });
  }
});

export default router;
