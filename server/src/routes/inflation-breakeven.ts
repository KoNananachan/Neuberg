import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

function mulberry32(a: number) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashSeed(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; } return h; }

// ── Types ────────────────────────────────────────────────────────────────────

interface BreakevenRate {
  maturity: string;
  rate: number;
  nominalYield: number;
  realYield: number;
  change1d: number;
  change1w: number;
  change1m: number;
  high52w: number;
  low52w: number;
  percentile52w: number;
}

interface ForwardInflation {
  label: string;
  rate: number;
  change1d: number;
  change1w: number;
}

interface InflationSwapRate {
  tenor: string;
  rate: number;
  change: number;
  bid: number;
  ask: number;
}

interface RealYieldEntry {
  maturity: string;
  yield: number;
  change1d: number;
  change1w: number;
  nominalSpread: number;
}

interface InflationPrint {
  indicator: string;
  latest: number;
  previous: number;
  change: number;
  releaseDate: string;
  nextRelease: string;
  trend: 'rising' | 'falling' | 'stable';
}

interface BreakevenCurvePoint {
  date: string;
  be2y: number;
  be5y: number;
  be10y: number;
  be30y: number;
}

interface CrossCountryEntry {
  country: string;
  breakeven10y: number;
  cpiLatest: number;
  cpiCore: number;
  centralBankTarget: number;
  realPolicy: number;
  change1w: number;
}

interface SeasonalityAdjustment {
  month: string;
  cpiSA: number;
  cpiNSA: number;
  seasonalFactor: number;
  energyContribution: number;
  foodContribution: number;
  coreContribution: number;
}

interface InflationBreakevenDashboard {
  breakevens: BreakevenRate[];
  forwardInflation: ForwardInflation[];
  inflationSwaps: InflationSwapRate[];
  realYields: RealYieldEntry[];
  inflationPrints: InflationPrint[];
  breakevenCurveHistory: BreakevenCurvePoint[];
  crossCountry: CrossCountryEntry[];
  seasonalityAdjustments: SeasonalityAdjustment[];
  summary: {
    us10yBreakeven: number;
    fiveY5YForward: number;
    tipsRealYield10y: number;
    marketImpliedCPI: number;
    inflationRiskPremium: number;
    regime: 'Disinflationary' | 'Stable' | 'Reflationary' | 'Inflationary';
  };
  generatedAt: string;
}

// ── Anchor Data ──────────────────────────────────────────────────────────────

const MATURITIES = ['2Y', '5Y', '10Y', '20Y', '30Y'] as const;

const BREAKEVEN_BASES: Record<string, number> = {
  '2Y': 2.18, '5Y': 2.32, '10Y': 2.38, '20Y': 2.42, '30Y': 2.40,
};
const NOMINAL_BASES: Record<string, number> = {
  '2Y': 4.28, '5Y': 4.15, '10Y': 4.25, '20Y': 4.55, '30Y': 4.48,
};
const REAL_BASES: Record<string, number> = {
  '2Y': 2.10, '5Y': 1.83, '10Y': 1.87, '20Y': 2.13, '30Y': 2.08,
};

const SWAP_TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'] as const;
const SWAP_BASES: Record<string, number> = {
  '1Y': 2.52, '2Y': 2.38, '3Y': 2.30, '5Y': 2.35,
  '7Y': 2.38, '10Y': 2.42, '20Y': 2.46, '30Y': 2.44,
};

interface CountryBase {
  country: string;
  breakeven10y: number;
  cpiLatest: number;
  cpiCore: number;
  centralBankTarget: number;
  policyRate: number;
}

const COUNTRY_BASES: CountryBase[] = [
  { country: 'US',    breakeven10y: 2.38, cpiLatest: 3.2, cpiCore: 3.5, centralBankTarget: 2.0, policyRate: 5.25 },
  { country: 'UK',    breakeven10y: 3.62, cpiLatest: 3.4, cpiCore: 4.1, centralBankTarget: 2.0, policyRate: 5.00 },
  { country: 'EU',    breakeven10y: 2.08, cpiLatest: 2.4, cpiCore: 2.9, centralBankTarget: 2.0, policyRate: 4.50 },
  { country: 'Japan', breakeven10y: 1.18, cpiLatest: 2.8, cpiCore: 2.3, centralBankTarget: 2.0, policyRate: 0.25 },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const SEASONAL_ENERGY: Record<string, number> = {
  January: 0.45, February: 0.38, March: 0.25, April: 0.12,
  May: 0.18, June: 0.32, July: 0.28, August: 0.22,
  September: -0.05, October: -0.12, November: -0.08, December: 0.15,
};

const SEASONAL_FOOD: Record<string, number> = {
  January: 0.22, February: 0.18, March: 0.20, April: 0.25,
  May: 0.28, June: 0.15, July: 0.10, August: 0.12,
  September: 0.18, October: 0.22, November: 0.30, December: 0.35,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

function jitter(rng: () => number, base: number, bps: number): number {
  return round3(base + (rng() - 0.5) * 2 * (bps / 100));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60_000; // 5 minutes
let cacheKey = '';
let cacheData: InflationBreakevenDashboard | null = null;
let cacheTime = 0;

// ── Data Generation ──────────────────────────────────────────────────────────

function generate(): InflationBreakevenDashboard {
  const today = new Date();
  const day = formatDate(today);
  const rng = mulberry32(hashSeed(day + '-inflation-breakeven-dashboard'));

  // ── 1. TIPS Breakeven Rates by Maturity ──

  const breakevens: BreakevenRate[] = MATURITIES.map((mat) => {
    const beBase = BREAKEVEN_BASES[mat];
    const nomBase = NOMINAL_BASES[mat];
    const realBase = REAL_BASES[mat];

    const rate = jitter(rng, beBase, 10);
    const nominalYield = jitter(rng, nomBase, 8);
    const realYield = jitter(rng, realBase, 8);
    const change1d = round3((rng() - 0.5) * 0.06);
    const change1w = round3((rng() - 0.5) * 0.14);
    const change1m = round3((rng() - 0.5) * 0.24);
    const rangeWidth = 0.35 + rng() * 0.30;
    const low52w = round2(rate - rangeWidth / 2 - rng() * 0.08);
    const high52w = round2(rate + rangeWidth / 2 + rng() * 0.08);
    const range = high52w - low52w;
    const percentile52w = range > 0
      ? Math.max(0, Math.min(100, Math.round(((rate - low52w) / range) * 100)))
      : 50;

    return {
      maturity: mat, rate, nominalYield, realYield,
      change1d, change1w, change1m,
      high52w, low52w, percentile52w,
    };
  });

  // ── 2. 5Y5Y Forward Inflation ──

  const forwardInflation: ForwardInflation[] = [
    { label: 'USD 5Y5Y Forward', rate: jitter(rng, 2.45, 10), change1d: round3((rng() - 0.5) * 0.06), change1w: round3((rng() - 0.5) * 0.12) },
    { label: 'EUR 5Y5Y Forward', rate: jitter(rng, 2.28, 10), change1d: round3((rng() - 0.5) * 0.06), change1w: round3((rng() - 0.5) * 0.12) },
    { label: 'GBP 5Y5Y Forward', rate: jitter(rng, 3.62, 12), change1d: round3((rng() - 0.5) * 0.06), change1w: round3((rng() - 0.5) * 0.14) },
    { label: 'JPY 5Y5Y Forward', rate: jitter(rng, 1.15, 8),  change1d: round3((rng() - 0.5) * 0.04), change1w: round3((rng() - 0.5) * 0.10) },
  ];

  // ── 3. Inflation Swap Rates ──

  const inflationSwaps: InflationSwapRate[] = SWAP_TENORS.map((tenor) => {
    const rate = jitter(rng, SWAP_BASES[tenor], 8);
    const change = round3((rng() - 0.5) * 0.05);
    const halfSpread = round3(0.004 + rng() * 0.012);
    const bid = round3(rate - halfSpread);
    const ask = round3(rate + halfSpread);
    return { tenor, rate, change, bid, ask };
  });

  // ── 4. Real Yields ──

  const realYields: RealYieldEntry[] = MATURITIES.map((mat) => {
    const yld = jitter(rng, REAL_BASES[mat], 6);
    const change1d = round3((rng() - 0.5) * 0.05);
    const change1w = round3((rng() - 0.5) * 0.12);
    const nominalSpread = round3(NOMINAL_BASES[mat] - REAL_BASES[mat] + (rng() - 0.5) * 0.08);
    return { maturity: mat, yield: yld, change1d, change1w, nominalSpread };
  });

  // ── 5. CPI/PCE Latest Prints ──

  const baseDate = new Date(today);
  baseDate.setDate(1); // first of current month
  const prevMonth = new Date(baseDate);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(baseDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(10 + Math.floor(rng() * 5));

  const cpiRelease = new Date(prevMonth);
  cpiRelease.setDate(12 + Math.floor(rng() * 4));
  const pceRelease = new Date(prevMonth);
  pceRelease.setDate(25 + Math.floor(rng() * 4));
  const nextCpiRelease = new Date(nextMonth);
  nextCpiRelease.setDate(12 + Math.floor(rng() * 4));
  const nextPceRelease = new Date(nextMonth);
  nextPceRelease.setDate(25 + Math.floor(rng() * 4));

  const inflationPrints: InflationPrint[] = [
    {
      indicator: 'CPI YoY',
      latest: round2(3.2 + (rng() - 0.5) * 0.3),
      previous: round2(3.1 + (rng() - 0.5) * 0.3),
      change: 0,
      releaseDate: formatDate(cpiRelease),
      nextRelease: formatDate(nextCpiRelease),
      trend: 'falling',
    },
    {
      indicator: 'Core CPI YoY',
      latest: round2(3.5 + (rng() - 0.5) * 0.25),
      previous: round2(3.6 + (rng() - 0.5) * 0.25),
      change: 0,
      releaseDate: formatDate(cpiRelease),
      nextRelease: formatDate(nextCpiRelease),
      trend: 'falling',
    },
    {
      indicator: 'CPI MoM',
      latest: round2(0.3 + (rng() - 0.5) * 0.15),
      previous: round2(0.4 + (rng() - 0.5) * 0.15),
      change: 0,
      releaseDate: formatDate(cpiRelease),
      nextRelease: formatDate(nextCpiRelease),
      trend: 'stable',
    },
    {
      indicator: 'PCE YoY',
      latest: round2(2.6 + (rng() - 0.5) * 0.2),
      previous: round2(2.7 + (rng() - 0.5) * 0.2),
      change: 0,
      releaseDate: formatDate(pceRelease),
      nextRelease: formatDate(nextPceRelease),
      trend: 'falling',
    },
    {
      indicator: 'Core PCE YoY',
      latest: round2(2.8 + (rng() - 0.5) * 0.2),
      previous: round2(2.9 + (rng() - 0.5) * 0.2),
      change: 0,
      releaseDate: formatDate(pceRelease),
      nextRelease: formatDate(nextPceRelease),
      trend: 'falling',
    },
    {
      indicator: 'PCE MoM',
      latest: round2(0.25 + (rng() - 0.5) * 0.1),
      previous: round2(0.3 + (rng() - 0.5) * 0.1),
      change: 0,
      releaseDate: formatDate(pceRelease),
      nextRelease: formatDate(nextPceRelease),
      trend: 'stable',
    },
  ];

  // Compute change and trend for each print
  for (const p of inflationPrints) {
    p.change = round2(p.latest - p.previous);
    if (p.change > 0.05) p.trend = 'rising';
    else if (p.change < -0.05) p.trend = 'falling';
    else p.trend = 'stable';
  }

  // ── 6. Breakeven Curve History (30 days) ──

  const breakevenCurveHistory: BreakevenCurvePoint[] = [];
  const histRng = mulberry32(hashSeed(day + '-be-curve-history'));

  let h2y = BREAKEVEN_BASES['2Y'] - 0.12;
  let h5y = BREAKEVEN_BASES['5Y'] - 0.10;
  let h10y = BREAKEVEN_BASES['10Y'] - 0.08;
  let h30y = BREAKEVEN_BASES['30Y'] - 0.09;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    const drift2 = (BREAKEVEN_BASES['2Y'] - h2y) * 0.08;
    const drift5 = (BREAKEVEN_BASES['5Y'] - h5y) * 0.08;
    const drift10 = (BREAKEVEN_BASES['10Y'] - h10y) * 0.08;
    const drift30 = (BREAKEVEN_BASES['30Y'] - h30y) * 0.08;

    h2y  = round3(h2y  + drift2  + (histRng() - 0.5) * 0.04);
    h5y  = round3(h5y  + drift5  + (histRng() - 0.5) * 0.035);
    h10y = round3(h10y + drift10 + (histRng() - 0.5) * 0.03);
    h30y = round3(h30y + drift30 + (histRng() - 0.5) * 0.028);

    breakevenCurveHistory.push({
      date: formatDate(d),
      be2y: h2y,
      be5y: h5y,
      be10y: h10y,
      be30y: h30y,
    });
  }

  // Pin last point to current breakeven values
  const lastPoint = breakevenCurveHistory[breakevenCurveHistory.length - 1];
  const be2y = breakevens.find(b => b.maturity === '2Y')?.rate ?? BREAKEVEN_BASES['2Y'];
  const be5y = breakevens.find(b => b.maturity === '5Y')?.rate ?? BREAKEVEN_BASES['5Y'];
  const be10y = breakevens.find(b => b.maturity === '10Y')?.rate ?? BREAKEVEN_BASES['10Y'];
  const be30y = breakevens.find(b => b.maturity === '30Y')?.rate ?? BREAKEVEN_BASES['30Y'];
  lastPoint.be2y = be2y;
  lastPoint.be5y = be5y;
  lastPoint.be10y = be10y;
  lastPoint.be30y = be30y;

  // ── 7. Cross-Country Comparison ──

  const crossCountry: CrossCountryEntry[] = COUNTRY_BASES.map((c) => {
    const breakeven10y = jitter(rng, c.breakeven10y, 12);
    const cpiLatest = round2(c.cpiLatest + (rng() - 0.5) * 0.4);
    const cpiCore = round2(c.cpiCore + (rng() - 0.5) * 0.3);
    const realPolicy = round2(c.policyRate - cpiLatest);
    const change1w = round3((rng() - 0.5) * 0.12);
    return {
      country: c.country, breakeven10y, cpiLatest, cpiCore,
      centralBankTarget: c.centralBankTarget, realPolicy, change1w,
    };
  });

  // ── 8. Seasonality Adjustments ──

  const seasonRng = mulberry32(hashSeed(day + '-seasonal-adj'));
  const seasonalityAdjustments: SeasonalityAdjustment[] = MONTHS.map((month) => {
    const energyBase = SEASONAL_ENERGY[month];
    const foodBase = SEASONAL_FOOD[month];
    const energy = round2(energyBase + (seasonRng() - 0.5) * 0.08);
    const food = round2(foodBase + (seasonRng() - 0.5) * 0.06);
    const core = round2(0.20 + (seasonRng() - 0.5) * 0.08);
    const cpiNSA = round2(energy + food + core);
    const seasonalFactor = round3(1.0 + (seasonRng() - 0.5) * 0.008);
    const cpiSA = round2(cpiNSA / seasonalFactor);
    return {
      month,
      cpiSA,
      cpiNSA,
      seasonalFactor,
      energyContribution: energy,
      foodContribution: food,
      coreContribution: core,
    };
  });

  // ── 9. Summary ──

  const us10y = breakevens.find(b => b.maturity === '10Y');
  const us10yBreakeven = us10y?.rate ?? 2.38;
  const fiveY5YForward = forwardInflation[0].rate;
  const tipsRealYield10y = us10y?.realYield ?? 1.87;
  const pceLatest = inflationPrints.find(p => p.indicator === 'PCE YoY')?.latest ?? 2.6;
  const marketImpliedCPI = round2(us10yBreakeven + (rng() - 0.5) * 0.12);
  const inflationRiskPremium = round2(us10yBreakeven - pceLatest + (rng() - 0.5) * 0.08);

  // Regime determination based on breakeven level and trend
  const avgChange = breakevens.reduce((sum, b) => sum + b.change1w, 0) / breakevens.length;
  let regime: 'Disinflationary' | 'Stable' | 'Reflationary' | 'Inflationary';
  if (us10yBreakeven > 2.8 && avgChange > 0) regime = 'Inflationary';
  else if (us10yBreakeven > 2.4 && avgChange > 0.02) regime = 'Reflationary';
  else if (us10yBreakeven < 1.8 || avgChange < -0.04) regime = 'Disinflationary';
  else regime = 'Stable';

  return {
    breakevens,
    forwardInflation,
    inflationSwaps,
    realYields,
    inflationPrints,
    breakevenCurveHistory,
    crossCountry,
    seasonalityAdjustments,
    summary: {
      us10yBreakeven,
      fiveY5YForward,
      tipsRealYield10y,
      marketImpliedCPI,
      inflationRiskPremium,
      regime,
    },
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
    console.error('[InflationBreakeven] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(502).json({ error: 'Failed to generate inflation breakeven data' });
  }
});

export default router;
