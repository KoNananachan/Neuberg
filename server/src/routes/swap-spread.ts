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

interface SwapSpreadRow {
  tenor: string;
  swapRate: number;
  treasuryYield: number;
  spread: number;
  change1D: number;
  change1W: number;
  change1M: number;
  spreadRange52W: { low: number; high: number };
}

interface BasisSwapRow {
  pair: string;
  tenor: string;
  basisSpread: number;
  change1D: number;
  change1W: number;
}

interface OvernightRate {
  rate: number;
  change: number;
  volumeBn: number;
}

interface OvernightRates {
  sofr: OvernightRate;
  effr: OvernightRate;
  estr: OvernightRate;
  sonia: OvernightRate;
  tonar: OvernightRate;
}

interface ForwardRateRow {
  tenor: string;
  rate: number;
  impliedChange: number;
}

interface SwapSpreadSummary {
  usd2s10sSwapSpread: number;
  eur2s10sSwapSpread: number;
  avgUsdSpread: number;
  spreadTrend: 'widening' | 'stable' | 'tightening';
  basisWidest: string;
  basisTightest: string;
}

interface SwapSpreadResponse {
  usdSpreads: SwapSpreadRow[];
  eurSpreads: SwapSpreadRow[];
  gbpSpreads: SwapSpreadRow[];
  jpySpreads: SwapSpreadRow[];
  basisSwaps: BasisSwapRow[];
  overnightRates: OvernightRates;
  forwardRates: ForwardRateRow[];
  summary: SwapSpreadSummary;
  generatedAt: string;
}

// ── Static configs ──

/**
 * Swap spread profiles per currency.
 * Each tenor has a base swap spread (bps), base treasury yield (%), and
 * a noise amplitude for daily jitter.
 */
interface TenorProfile {
  tenor: string;
  baseSpread: number;   // bps
  baseYield: number;    // treasury/benchmark yield %
  noise: number;        // spread noise amplitude bps
}

const USD_TENORS: TenorProfile[] = [
  { tenor: '2Y',  baseSpread: -2,   baseYield: 4.52, noise: 6 },
  { tenor: '3Y',  baseSpread: -6,   baseYield: 4.42, noise: 6 },
  { tenor: '5Y',  baseSpread: -12,  baseYield: 4.28, noise: 7 },
  { tenor: '7Y',  baseSpread: -18,  baseYield: 4.22, noise: 7 },
  { tenor: '10Y', baseSpread: -22,  baseYield: 4.18, noise: 8 },
  { tenor: '15Y', baseSpread: -32,  baseYield: 4.30, noise: 8 },
  { tenor: '20Y', baseSpread: -45,  baseYield: 4.42, noise: 9 },
  { tenor: '30Y', baseSpread: -55,  baseYield: 4.48, noise: 10 },
];

const EUR_TENORS: TenorProfile[] = [
  { tenor: '2Y',  baseSpread: 28,  baseYield: 2.82, noise: 5 },
  { tenor: '5Y',  baseSpread: 22,  baseYield: 2.65, noise: 6 },
  { tenor: '10Y', baseSpread: 18,  baseYield: 2.55, noise: 6 },
  { tenor: '15Y', baseSpread: 14,  baseYield: 2.52, noise: 7 },
  { tenor: '20Y', baseSpread: 10,  baseYield: 2.50, noise: 7 },
  { tenor: '30Y', baseSpread: 6,   baseYield: 2.48, noise: 8 },
];

const GBP_TENORS: TenorProfile[] = [
  { tenor: '2Y',  baseSpread: 22,  baseYield: 4.68, noise: 5 },
  { tenor: '5Y',  baseSpread: 14,  baseYield: 4.42, noise: 6 },
  { tenor: '10Y', baseSpread: 8,   baseYield: 4.35, noise: 7 },
  { tenor: '30Y', baseSpread: -8,  baseYield: 4.15, noise: 8 },
];

const JPY_TENORS: TenorProfile[] = [
  { tenor: '2Y',  baseSpread: 5,   baseYield: 0.32, noise: 3 },
  { tenor: '5Y',  baseSpread: 3,   baseYield: 0.58, noise: 3 },
  { tenor: '10Y', baseSpread: 1,   baseYield: 0.85, noise: 4 },
  { tenor: '20Y', baseSpread: -2,  baseYield: 1.48, noise: 4 },
  { tenor: '30Y', baseSpread: -4,  baseYield: 1.72, noise: 5 },
];

const BASIS_PAIRS = ['EUR/USD', 'GBP/USD', 'JPY/USD', 'CHF/USD', 'AUD/USD'] as const;
const BASIS_TENORS = ['3M', '1Y', '5Y'] as const;

/** Base cross-currency basis spreads (bps). Negative = USD funding premium. */
const BASIS_BASES: Record<string, Record<string, number>> = {
  'EUR/USD': { '3M': -12, '1Y': -18, '5Y': -22 },
  'GBP/USD': { '3M': -8,  '1Y': -14, '5Y': -18 },
  'JPY/USD': { '3M': -45, '1Y': -55, '5Y': -62 },
  'CHF/USD': { '3M': -18, '1Y': -25, '5Y': -30 },
  'AUD/USD': { '3M': 15,  '1Y': 10,  '5Y': 5 },
};

const FRA_TENORS = ['1x4', '3x6', '6x9', '6x12', '12x24'] as const;

const FRA_BASES: Record<string, { rate: number; impliedChange: number }> = {
  '1x4':   { rate: 4.32, impliedChange: -8 },
  '3x6':   { rate: 4.28, impliedChange: -12 },
  '6x9':   { rate: 4.20, impliedChange: -20 },
  '6x12':  { rate: 4.12, impliedChange: -28 },
  '12x24': { rate: 3.85, impliedChange: -55 },
};

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60_000;
let cache: { data: SwapSpreadResponse | null; ts: number } = { data: null, ts: 0 };

// ── Helpers ──

const round = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

function generateSpreads(tenors: TenorProfile[], rng: () => number): SwapSpreadRow[] {
  return tenors.map(t => {
    const spreadNoise = (rng() - 0.5) * t.noise * 2;
    const spread = round(t.baseSpread + spreadNoise, 1);

    const yieldNoise = (rng() - 0.5) * 0.06;
    const treasuryYield = round(t.baseYield + yieldNoise, 3);
    const swapRate = round(treasuryYield + spread / 100, 3);

    const change1D = round((rng() - 0.5) * 3, 1);
    const change1W = round((rng() - 0.5) * 8, 1);
    const change1M = round((rng() - 0.5) * 16, 1);

    // 52-week range: spread +/- some historical volatility
    const rangeHalf = Math.abs(t.baseSpread) * 0.4 + 8;
    const low = round(spread - rangeHalf - rng() * 5, 1);
    const high = round(spread + rangeHalf + rng() * 5, 1);

    return { tenor: t.tenor, swapRate, treasuryYield, spread, change1D, change1W, change1M, spreadRange52W: { low, high } };
  });
}

// ── Data generation ──

function generate(): SwapSpreadResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-swap-spread'));

  // ── Swap spreads by currency ──
  const usdSpreads = generateSpreads(USD_TENORS, rng);
  const eurSpreads = generateSpreads(EUR_TENORS, rng);
  const gbpSpreads = generateSpreads(GBP_TENORS, rng);
  const jpySpreads = generateSpreads(JPY_TENORS, rng);

  // ── Cross-currency basis swaps ──
  const basisSwaps: BasisSwapRow[] = [];
  for (const pair of BASIS_PAIRS) {
    for (const tenor of BASIS_TENORS) {
      const base = BASIS_BASES[pair][tenor];
      const basisSpread = round(base + (rng() - 0.5) * 10, 1);
      const change1D = round((rng() - 0.5) * 3, 1);
      const change1W = round((rng() - 0.5) * 6, 1);
      basisSwaps.push({ pair, tenor, basisSpread, change1D, change1W });
    }
  }

  // ── Overnight rates ──
  const makeOvernight = (baseRate: number, baseVol: number): OvernightRate => ({
    rate: round(baseRate + (rng() - 0.5) * 0.04, 3),
    change: round((rng() - 0.5) * 0.02, 3),
    volumeBn: round(baseVol + (rng() - 0.5) * baseVol * 0.3, 1),
  });

  const overnightRates: OvernightRates = {
    sofr:  makeOvernight(4.30, 1950),
    effr:  makeOvernight(4.33, 95),
    estr:  makeOvernight(2.90, 45),
    sonia: makeOvernight(4.20, 55),
    tonar: makeOvernight(-0.02, 12),
  };

  // ── Forward rate agreements ──
  const forwardRates: ForwardRateRow[] = FRA_TENORS.map(tenor => {
    const base = FRA_BASES[tenor];
    return {
      tenor,
      rate: round(base.rate + (rng() - 0.5) * 0.08, 3),
      impliedChange: round(base.impliedChange + (rng() - 0.5) * 6, 1),
    };
  });

  // ── Summary ──
  const usd2Y = usdSpreads.find(s => s.tenor === '2Y')!;
  const usd10Y = usdSpreads.find(s => s.tenor === '10Y')!;
  const eur2Y = eurSpreads.find(s => s.tenor === '2Y')!;
  const eur10Y = eurSpreads.find(s => s.tenor === '10Y')!;

  const usd2s10sSwapSpread = round(usd10Y.spread - usd2Y.spread, 1);
  const eur2s10sSwapSpread = round(eur10Y.spread - eur2Y.spread, 1);
  const avgUsdSpread = round(usdSpreads.reduce((sum, s) => sum + s.spread, 0) / usdSpreads.length, 1);

  // Determine spread trend from average of 1D changes
  const allChanges = [...usdSpreads, ...eurSpreads, ...gbpSpreads, ...jpySpreads].map(s => s.change1D);
  const avgChange = allChanges.reduce((a, b) => a + b, 0) / allChanges.length;
  const spreadTrend: 'widening' | 'stable' | 'tightening' =
    avgChange > 0.4 ? 'widening' : avgChange < -0.4 ? 'tightening' : 'stable';

  // Find widest and tightest basis swap
  let widest = basisSwaps[0];
  let tightest = basisSwaps[0];
  for (const b of basisSwaps) {
    if (b.basisSpread > widest.basisSpread) widest = b;
    if (b.basisSpread < tightest.basisSpread) tightest = b;
  }

  const summary: SwapSpreadSummary = {
    usd2s10sSwapSpread,
    eur2s10sSwapSpread,
    avgUsdSpread,
    spreadTrend,
    basisWidest: `${widest.pair} ${widest.tenor}`,
    basisTightest: `${tightest.pair} ${tightest.tenor}`,
  };

  return {
    usdSpreads,
    eurSpreads,
    gbpSpreads,
    jpySpreads,
    basisSwaps,
    overnightRates,
    forwardRates,
    summary,
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
    console.error('[SwapSpread] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate swap spread data' });
  }
});

export default router;
