import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface BreakevenItem {
  tenor: string;
  rate: number;
  change: number;
  weekAgo: number;
  monthAgo: number;
  yearAgo: number;
  percentile52w: number;
  zScore: number;
}

interface RealRateItem {
  tenor: string;
  realYield: number;
  nominalYield: number;
  breakeven: number;
  change: number;
  weekChange: number;
}

interface InflationSwapItem {
  tenor: string;
  rate: number;
  change: number;
  bid: number;
  ask: number;
  spread: number;
  volume: number;
}

interface GlobalComparisonItem {
  country: string;
  breakeven10y: number;
  cpiForecast: number;
  cpiActual: number;
  surprise: number;
  centralBankTarget: number;
  credibility: number;
}

interface MarketSummary {
  usBreakeven10y: number;
  usRealYield10y: number;
  inflationSwap5y5y: number;
  tipsFairValue: number;
  breakoutsAbove: number;
  trendSignal: 'Rising' | 'Falling' | 'Stable';
}

interface InflationBreakevensResponse {
  breakevens: BreakevenItem[];
  realRates: RealRateItem[];
  inflationSwaps: InflationSwapItem[];
  globalComparison: GlobalComparisonItem[];
  marketSummary: MarketSummary;
  generatedAt: string;
}

// ── Anchor data ──────────────────────────────────────────────────────────────

const BREAKEVEN_TENORS = ['2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y', '5Y5Y'] as const;
const BREAKEVEN_BASES: Record<string, number> = {
  '2Y': 2.32, '3Y': 2.28, '5Y': 2.35, '7Y': 2.33,
  '10Y': 2.37, '20Y': 2.40, '30Y': 2.38, '5Y5Y': 2.42,
};

const REAL_RATE_TENORS = ['2Y', '5Y', '7Y', '10Y', '20Y', '30Y'] as const;
const REAL_YIELD_BASES: Record<string, number> = {
  '2Y': 2.05, '5Y': 1.88, '7Y': 1.85, '10Y': 1.92, '20Y': 2.10, '30Y': 2.15,
};
const NOMINAL_YIELD_BASES: Record<string, number> = {
  '2Y': 4.38, '5Y': 4.22, '7Y': 4.18, '10Y': 4.28, '20Y': 4.50, '30Y': 4.52,
};

const SWAP_TENORS = ['1Y', '2Y', '3Y', '5Y', '10Y', '30Y'] as const;
const SWAP_BASES: Record<string, number> = {
  '1Y': 2.48, '2Y': 2.35, '3Y': 2.30, '5Y': 2.38, '10Y': 2.42, '30Y': 2.45,
};

interface CountryBase {
  country: string;
  breakeven10y: number;
  cpiForecast: number;
  cpiActual: number;
  centralBankTarget: number;
}

const GLOBAL_BASES: CountryBase[] = [
  { country: 'US', breakeven10y: 2.37, cpiForecast: 2.8, cpiActual: 3.0, centralBankTarget: 2.0 },
  { country: 'UK', breakeven10y: 3.55, cpiForecast: 3.2, cpiActual: 3.4, centralBankTarget: 2.0 },
  { country: 'Germany', breakeven10y: 2.10, cpiForecast: 2.3, cpiActual: 2.5, centralBankTarget: 2.0 },
  { country: 'France', breakeven10y: 2.22, cpiForecast: 2.5, cpiActual: 2.7, centralBankTarget: 2.0 },
  { country: 'Japan', breakeven10y: 1.15, cpiForecast: 2.2, cpiActual: 2.8, centralBankTarget: 2.0 },
  { country: 'Canada', breakeven10y: 2.18, cpiForecast: 2.6, cpiActual: 2.9, centralBankTarget: 2.0 },
  { country: 'Australia', breakeven10y: 2.45, cpiForecast: 3.0, cpiActual: 3.4, centralBankTarget: 2.5 },
  { country: 'Sweden', breakeven10y: 1.95, cpiForecast: 2.1, cpiActual: 2.3, centralBankTarget: 2.0 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

function jitter(rng: () => number, base: number, bps: number): number {
  return round3(base + (rng() - 0.5) * 2 * (bps / 100));
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60_000; // 5 minutes
let cacheKey = '';
let cacheData: InflationBreakevensResponse | null = null;
let cacheTime = 0;

// ── Data generation ──────────────────────────────────────────────────────────

function generate(): InflationBreakevensResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-inflation-breakevens'));

  // 1. Breakevens (8 items)
  const breakevens: BreakevenItem[] = BREAKEVEN_TENORS.map((tenor) => {
    const base = BREAKEVEN_BASES[tenor];
    const rate = jitter(rng, base, 8); // +/- 8bps
    const change = round3((rng() - 0.5) * 0.06); // +/- 3bps
    const weekAgo = round3(rate - (rng() - 0.45) * 0.08);
    const monthAgo = round3(rate - (rng() - 0.48) * 0.18);
    const yearAgo = round3(rate - (rng() - 0.5) * 0.45);

    // 52w percentile: position within the year range
    const percentile52w = Math.round(30 + rng() * 55); // 30-85 range
    // z-score: normalized deviation from mean
    const zScore = round2((rng() - 0.5) * 3.0); // typically -1.5 to +1.5

    return { tenor, rate, change, weekAgo, monthAgo, yearAgo, percentile52w, zScore };
  });

  // 2. Real Rates (6 items)
  const realRates: RealRateItem[] = REAL_RATE_TENORS.map((tenor) => {
    const realYield = jitter(rng, REAL_YIELD_BASES[tenor], 6);
    const nominalYield = jitter(rng, NOMINAL_YIELD_BASES[tenor], 5);
    const breakeven = round3(nominalYield - realYield);
    const change = round3((rng() - 0.5) * 0.05);
    const weekChange = round3((rng() - 0.5) * 0.12);
    return { tenor, realYield, nominalYield, breakeven, change, weekChange };
  });

  // 3. Inflation Swaps (6 items)
  const inflationSwaps: InflationSwapItem[] = SWAP_TENORS.map((tenor) => {
    const rate = jitter(rng, SWAP_BASES[tenor], 7);
    const change = round3((rng() - 0.5) * 0.04);
    const halfSpread = round3(0.005 + rng() * 0.015); // 0.5-2bp half-spread
    const bid = round3(rate - halfSpread);
    const ask = round3(rate + halfSpread);
    const spread = round3(ask - bid);
    const volume = Math.round(200 + rng() * 1800); // 200-2000 contracts
    return { tenor, rate, change, bid, ask, spread, volume };
  });

  // 4. Global Comparison (8 items)
  const globalComparison: GlobalComparisonItem[] = GLOBAL_BASES.map((g) => {
    const breakeven10y = jitter(rng, g.breakeven10y, 10);
    const cpiForecast = jitter(rng, g.cpiForecast, 15);
    const cpiActual = jitter(rng, g.cpiActual, 12);
    const surprise = round2(cpiActual - cpiForecast);
    const centralBankTarget = g.centralBankTarget;
    // Credibility: how close breakeven is to target (0-100 scale)
    const deviation = Math.abs(breakeven10y - centralBankTarget);
    const credibility = Math.round(Math.max(0, Math.min(100, 100 - deviation * 30 + rng() * 10)));
    return { country: g.country, breakeven10y, cpiForecast, cpiActual, surprise, centralBankTarget, credibility };
  });

  // 5. Market Summary
  const usBreakeven10y = breakevens.find(b => b.tenor === '10Y')?.rate ?? 2.37;
  const usRealYield10y = realRates.find(r => r.tenor === '10Y')?.realYield ?? 1.92;
  const inflationSwap5y5y = breakevens.find(b => b.tenor === '5Y5Y')?.rate ?? 2.42;
  const tipsFairValue = round2(usBreakeven10y + (rng() - 0.5) * 0.10);

  // Count breakevens above their year-ago level
  const breakoutsAbove = breakevens.filter(b => b.rate > b.yearAgo).length;

  // Trend signal based on short-term changes
  const avgChange = breakevens.reduce((sum, b) => sum + b.change, 0) / breakevens.length;
  let trendSignal: 'Rising' | 'Falling' | 'Stable';
  if (avgChange > 0.005) trendSignal = 'Rising';
  else if (avgChange < -0.005) trendSignal = 'Falling';
  else trendSignal = 'Stable';

  const marketSummary: MarketSummary = {
    usBreakeven10y,
    usRealYield10y,
    inflationSwap5y5y,
    tipsFairValue,
    breakoutsAbove,
    trendSignal,
  };

  return {
    breakevens,
    realRates,
    inflationSwaps,
    globalComparison,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ────────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    const day = new Date().toISOString().slice(0, 10);
    if (cacheData && cacheKey === day && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generate();
    cacheKey = day;
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[InflationBreakevens] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate inflation breakevens data' });
  }
});

export default router;
