import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// ── Types ──

interface BenchmarkYield {
  country: string;
  yield: number;
  change: number;
  weekChange: number;
  monthChange: number;
  yearHigh: number;
  yearLow: number;
}

interface YieldCurvePoint {
  tenor: string;
  yield: number;
  change: number;
  priorDay: number;
}

interface CurveSpread {
  spread: string;
  country: string;
  value: number;
  change: number;
  status: 'inverted' | 'normal' | 'flat';
}

interface SovereignSpread {
  country: string;
  spread10Y: number;
  change: number;
  weekChange: number;
  rating: string;
}

interface RealYield {
  country: string;
  tenor: string;
  realYield: number;
  change: number;
  breakeven: number;
}

interface AuctionEntry {
  country: string;
  security: string;
  amount: string;
  date: string;
  bidToCover: number;
  tail: number;
  previousBtc: number;
}

interface SovereignYieldResponse {
  benchmarkYields: BenchmarkYield[];
  yieldCurve: YieldCurvePoint[];
  curveSpreads: CurveSpread[];
  sovereignSpreads: SovereignSpread[];
  realYields: RealYield[];
  auctionCalendar: AuctionEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: SovereignYieldResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Seed Data ──

interface CountryConfig {
  country: string;
  yieldMin: number;
  yieldMax: number;
  rating: string;
}

const BENCHMARK_COUNTRIES: CountryConfig[] = [
  { country: 'US', yieldMin: 4.2, yieldMax: 4.8, rating: 'AA+' },
  { country: 'Germany', yieldMin: 2.2, yieldMax: 2.8, rating: 'AAA' },
  { country: 'UK', yieldMin: 4.0, yieldMax: 4.6, rating: 'AA' },
  { country: 'Japan', yieldMin: 0.6, yieldMax: 1.1, rating: 'A+' },
  { country: 'France', yieldMin: 2.8, yieldMax: 3.4, rating: 'AA-' },
  { country: 'Italy', yieldMin: 3.5, yieldMax: 4.2, rating: 'BBB' },
  { country: 'Spain', yieldMin: 3.0, yieldMax: 3.6, rating: 'A' },
  { country: 'Australia', yieldMin: 3.8, yieldMax: 4.4, rating: 'AAA' },
  { country: 'Canada', yieldMin: 3.2, yieldMax: 3.8, rating: 'AAA' },
  { country: 'China', yieldMin: 2.3, yieldMax: 2.9, rating: 'A+' },
  { country: 'India', yieldMin: 6.8, yieldMax: 7.4, rating: 'BBB-' },
  { country: 'Brazil', yieldMin: 10.5, yieldMax: 11.8, rating: 'BB-' },
];

const US_CURVE_TENORS = [
  { tenor: '1M', baseYield: 5.30, weight: 0.12 },
  { tenor: '3M', baseYield: 5.25, weight: 0.11 },
  { tenor: '6M', baseYield: 5.10, weight: 0.10 },
  { tenor: '1Y', baseYield: 4.85, weight: 0.09 },
  { tenor: '2Y', baseYield: 4.55, weight: 0.08 },
  { tenor: '3Y', baseYield: 4.40, weight: 0.07 },
  { tenor: '5Y', baseYield: 4.30, weight: 0.06 },
  { tenor: '7Y', baseYield: 4.35, weight: 0.05 },
  { tenor: '10Y', baseYield: 4.45, weight: 0.04 },
  { tenor: '20Y', baseYield: 4.70, weight: 0.03 },
  { tenor: '30Y', baseYield: 4.60, weight: 0.03 },
];

const SPREAD_DEFINITIONS = [
  { spread: '2s10s', country: 'US', shortTenor: '2Y', longTenor: '10Y' },
  { spread: '5s30s', country: 'US', shortTenor: '5Y', longTenor: '30Y' },
  { spread: '3m10y', country: 'US', shortTenor: '3M', longTenor: '10Y' },
];

const REAL_YIELD_CONFIGS = [
  { country: 'US', tenor: '5Y', baseReal: 1.85, baseBreakeven: 2.35 },
  { country: 'US', tenor: '10Y', baseReal: 1.95, baseBreakeven: 2.30 },
  { country: 'US', tenor: '30Y', baseReal: 2.10, baseBreakeven: 2.28 },
  { country: 'UK', tenor: '5Y', baseReal: 0.45, baseBreakeven: 3.65 },
  { country: 'UK', tenor: '10Y', baseReal: 0.55, baseBreakeven: 3.55 },
  { country: 'UK', tenor: '30Y', baseReal: 0.80, baseBreakeven: 3.40 },
  { country: 'Germany', tenor: '5Y', baseReal: -0.15, baseBreakeven: 2.10 },
  { country: 'Germany', tenor: '10Y', baseReal: 0.05, baseBreakeven: 2.15 },
  { country: 'Germany', tenor: '30Y', baseReal: 0.30, baseBreakeven: 2.20 },
];

const AUCTION_TEMPLATES = [
  { country: 'US', security: '2Y Note', amount: '$60B' },
  { country: 'US', security: '5Y Note', amount: '$61B' },
  { country: 'US', security: '7Y Note', amount: '$44B' },
  { country: 'US', security: '10Y Note', amount: '$42B' },
  { country: 'US', security: '30Y Bond', amount: '$22B' },
  { country: 'Germany', security: '10Y Bund', amount: '\u20AC4B' },
  { country: 'Germany', security: '30Y Bund', amount: '\u20AC2.5B' },
  { country: 'UK', security: '10Y Gilt', amount: '\u00A34.5B' },
  { country: 'UK', security: '30Y Gilt', amount: '\u00A32.5B' },
  { country: 'Japan', security: '10Y JGB', amount: '\u00A52.3T' },
  { country: 'Japan', security: '20Y JGB', amount: '\u00A51.0T' },
  { country: 'France', security: '10Y OAT', amount: '\u20AC8B' },
  { country: 'Italy', security: '10Y BTP', amount: '\u20AC6B' },
  { country: 'Australia', security: '10Y ACGB', amount: 'A$1B' },
  { country: 'Canada', security: '10Y GoC', amount: 'C$5B' },
];

// ── Helpers ──

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function seededRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

// ── Generator ──

function generateSovereignYieldData(): SovereignYieldResponse {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${Math.floor(now.getHours() / 2)}`;
  const rng = mulberry32(hashSeed('sovereign-yield-' + dateKey));

  // 1. 10Y Benchmark Yields
  const benchmarkYields: BenchmarkYield[] = BENCHMARK_COUNTRIES.map((cfg) => {
    const yld = round(seededRange(rng, cfg.yieldMin, cfg.yieldMax), 3);
    const change = round(seededRange(rng, -8, 8), 1);
    const weekChange = round(seededRange(rng, -15, 15), 1);
    const monthChange = round(seededRange(rng, -30, 30), 1);
    const range = cfg.yieldMax - cfg.yieldMin;
    const yearHigh = round(yld + seededRange(rng, 0.1, range * 0.6), 3);
    const yearLow = round(yld - seededRange(rng, 0.1, range * 0.6), 3);
    return { country: cfg.country, yield: yld, change, weekChange, monthChange, yearHigh, yearLow };
  });

  // 2. US Treasury Yield Curve
  const yieldCurve: YieldCurvePoint[] = US_CURVE_TENORS.map((pt) => {
    const jitter = seededRange(rng, -0.12, 0.12);
    const yld = round(pt.baseYield + jitter, 3);
    const change = round(seededRange(rng, -5, 5), 1);
    const priorDay = round(yld - change / 100, 3);
    return { tenor: pt.tenor, yield: yld, change, priorDay };
  });

  // 3. Curve Spreads
  const curveMap = new Map(yieldCurve.map((p) => [p.tenor, p.yield]));
  const curveSpreads: CurveSpread[] = SPREAD_DEFINITIONS.map((def) => {
    const shortYield = curveMap.get(def.shortTenor) ?? 0;
    const longYield = curveMap.get(def.longTenor) ?? 0;
    const value = round((longYield - shortYield) * 100, 1); // in bps
    const change = round(seededRange(rng, -5, 5), 1);
    let status: 'inverted' | 'normal' | 'flat';
    if (value < -10) status = 'inverted';
    else if (value > 10) status = 'normal';
    else status = 'flat';
    return { spread: def.spread, country: def.country, value, change, status };
  });

  // 4. Sovereign Spreads vs UST
  const usYield = benchmarkYields.find((b) => b.country === 'US')?.yield ?? 4.5;
  const sovereignSpreads: SovereignSpread[] = BENCHMARK_COUNTRIES
    .filter((cfg) => cfg.country !== 'US')
    .map((cfg) => {
      const countryYield = benchmarkYields.find((b) => b.country === cfg.country)?.yield ?? cfg.yieldMin;
      const spread10Y = round((countryYield - usYield) * 100, 1); // in bps
      const change = round(seededRange(rng, -4, 4), 1);
      const weekChange = round(seededRange(rng, -10, 10), 1);
      return { country: cfg.country, spread10Y, change, weekChange, rating: cfg.rating };
    });

  // 5. Real Yields (TIPS / linkers)
  const realYields: RealYield[] = REAL_YIELD_CONFIGS.map((cfg) => {
    const jitter = seededRange(rng, -0.15, 0.15);
    const realYield = round(cfg.baseReal + jitter, 3);
    const change = round(seededRange(rng, -4, 4), 1);
    const beJitter = seededRange(rng, -0.08, 0.08);
    const breakeven = round(cfg.baseBreakeven + beJitter, 3);
    return { country: cfg.country, tenor: cfg.tenor, realYield, change, breakeven };
  });

  // 6. Auction Calendar
  const auctionCalendar: AuctionEntry[] = AUCTION_TEMPLATES.map((tpl, i) => {
    // Spread auctions across the next 2 weeks
    const dayOffset = Math.floor(seededRange(rng, 0, 14));
    const auctionDate = new Date(now);
    auctionDate.setDate(auctionDate.getDate() + dayOffset);
    // Skip weekends
    const dow = auctionDate.getDay();
    if (dow === 0) auctionDate.setDate(auctionDate.getDate() + 1);
    if (dow === 6) auctionDate.setDate(auctionDate.getDate() + 2);

    const dateStr = auctionDate.toISOString().split('T')[0];
    const bidToCover = round(seededRange(rng, 2.1, 3.2), 2);
    const tail = round(seededRange(rng, -1.5, 2.0), 1);
    const previousBtc = round(bidToCover + seededRange(rng, -0.3, 0.3), 2);

    return {
      country: tpl.country,
      security: tpl.security,
      amount: tpl.amount,
      date: dateStr,
      bidToCover,
      tail,
      previousBtc,
    };
  });

  // Sort auctions by date
  auctionCalendar.sort((a, b) => a.date.localeCompare(b.date));

  return {
    benchmarkYields,
    yieldCurve,
    curveSpreads,
    sovereignSpreads,
    realYields,
    auctionCalendar,
    timestamp: now.toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateSovereignYieldData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SovereignYield] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate sovereign yield data' });
  }
});

export default router;
