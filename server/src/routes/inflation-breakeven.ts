import { Router } from 'express';

const router = Router();

// ── Types ──

interface BreakevenEntry {
  tenor: string;
  nominalYield: number;
  realYield: number;
  breakeven: number;
  change1d: number;
  change1w: number;
  change1m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  history: number[];
}

interface InflationIndicator {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  trend: 'rising' | 'falling' | 'stable';
  target: number | null;
  history: number[];
}

interface InflationBreakevenResponse {
  breakevens: BreakevenEntry[];
  indicators: InflationIndicator[];
  fiveYearFiveYear: number;
  realYieldCurve: { tenor: string; rate: number }[];
  nominalCurve: { tenor: string; rate: number }[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: InflationBreakevenResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 10 * 60_000; // 10 minutes

// ── Data generation helpers ──

const TENORS = ['2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'] as const;

/** Tenor to numeric years for interpolation */
const TENOR_YEARS: Record<string, number> = {
  '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7,
  '10Y': 10, '20Y': 20, '30Y': 30,
};

/** Anchor nominal treasury yields */
const NOMINAL_ANCHORS: Record<string, number> = {
  '2Y': 4.28, '3Y': 4.22, '5Y': 4.15, '7Y': 4.20,
  '10Y': 4.25, '20Y': 4.55, '30Y': 4.45,
};

/** Anchor TIPS real yields */
const REAL_ANCHORS: Record<string, number> = {
  '2Y': 1.98, '3Y': 1.92, '5Y': 1.85, '7Y': 1.88,
  '10Y': 1.90, '20Y': 2.08, '30Y': 2.12,
};

/** Generate a history series with mean-reverting noise around a base value */
function generateHistory(base: number, count: number, volatilityBps: number): number[] {
  const history: number[] = [];
  let current = base - (volatilityBps / 100) * 0.3;
  for (let i = 0; i < count; i++) {
    const drift = (base - current) * 0.1;
    const noise = ((Math.random() - 0.5) * 2 * volatilityBps) / 100;
    current += drift + noise;
    current = Math.round(current * 1000) / 1000;
    history.push(current);
  }
  history[history.length - 1] = base;
  return history;
}

/** Generate indicator history (12 monthly data points around a base) */
function generateIndicatorHistory(base: number, volatility: number): number[] {
  const history: number[] = [];
  let current = base + (Math.random() - 0.5) * volatility * 2;
  for (let i = 0; i < 12; i++) {
    const drift = (base - current) * 0.15;
    const noise = (Math.random() - 0.5) * volatility;
    current += drift + noise;
    current = Math.round(current * 100) / 100;
    history.push(current);
  }
  history[history.length - 1] = base;
  return history;
}

function generateInflationBreakevenData(): InflationBreakevenResponse {
  // Build breakeven entries
  const breakevens: BreakevenEntry[] = [];
  const realYieldCurve: { tenor: string; rate: number }[] = [];
  const nominalCurve: { tenor: string; rate: number }[] = [];

  for (const tenor of TENORS) {
    const nomBase = NOMINAL_ANCHORS[tenor];
    const realBase = REAL_ANCHORS[tenor];

    // Small jitter for each request
    const nomJitter = ((Math.random() - 0.5) * 4) / 100;
    const realJitter = ((Math.random() - 0.5) * 4) / 100;

    const nominalYield = Math.round((nomBase + nomJitter) * 1000) / 1000;
    const realYield = Math.round((realBase + realJitter) * 1000) / 1000;
    const breakeven = Math.round((nominalYield - realYield) * 1000) / 1000;

    // Changes in basis points
    const change1d = Math.round((Math.random() - 0.5) * 6 * 10) / 10;
    const change1w = Math.round((Math.random() - 0.5) * 14 * 10) / 10;
    const change1m = Math.round((Math.random() - 0.5) * 24 * 10) / 10;

    // 52-week range centered around the breakeven
    const rangeWidth = 0.4 + Math.random() * 0.3;
    const low52w = Math.round((breakeven - rangeWidth / 2 - Math.random() * 0.1) * 100) / 100;
    const high52w = Math.round((breakeven + rangeWidth / 2 + Math.random() * 0.1) * 100) / 100;

    // Percentile within the 52-week range
    const range52w = high52w - low52w;
    const percentile = range52w > 0
      ? Math.round(((breakeven - low52w) / range52w) * 100)
      : 50;

    // 30-point history for sparkline
    const history = generateHistory(breakeven, 30, 5);

    breakevens.push({
      tenor,
      nominalYield,
      realYield,
      breakeven,
      change1d,
      change1w,
      change1m,
      high52w,
      low52w,
      percentile: Math.max(0, Math.min(100, percentile)),
      history,
    });

    nominalCurve.push({ tenor, rate: nominalYield });
    realYieldCurve.push({ tenor, rate: realYield });
  }

  // 5Y5Y forward breakeven: approximately 2 * 10Y BE - 5Y BE
  const be5y = breakevens.find((b) => b.tenor === '5Y')?.breakeven ?? 2.3;
  const be10y = breakevens.find((b) => b.tenor === '10Y')?.breakeven ?? 2.35;
  const fiveYearFiveYear = Math.round((2 * be10y - be5y) * 1000) / 1000;

  // Inflation indicators
  const indicators: InflationIndicator[] = [
    buildIndicator('CPI YoY', 3.2, 0.3, null),
    buildIndicator('Core CPI YoY', 3.5, 0.25, null),
    buildIndicator('PCE YoY', 2.6, 0.2, 2.0),
    buildIndicator('Core PCE YoY', 2.8, 0.2, 2.0),
    buildIndicator('Michigan 1Y Exp', 4.0, 0.5, null),
    buildIndicator('Michigan 5Y Exp', 3.0, 0.3, null),
    buildIndicator('5Y5Y Forward', fiveYearFiveYear, 0.15, 2.0),
    buildIndicator('Cleveland Fed Nowcast', 2.4, 0.2, 2.0),
  ];

  return {
    breakevens,
    indicators,
    fiveYearFiveYear,
    realYieldCurve,
    nominalCurve,
    timestamp: new Date().toISOString(),
  };
}

function buildIndicator(
  name: string,
  base: number,
  volatility: number,
  target: number | null,
): InflationIndicator {
  const jitter = (Math.random() - 0.5) * volatility * 0.3;
  const value = Math.round((base + jitter) * 100) / 100;
  const prevJitter = (Math.random() - 0.5) * volatility * 0.4;
  const previousValue = Math.round((base + prevJitter) * 100) / 100;
  const change = Math.round((value - previousValue) * 100) / 100;

  let trend: 'rising' | 'falling' | 'stable';
  if (Math.abs(change) < 0.05) {
    trend = 'stable';
  } else if (change > 0) {
    trend = 'rising';
  } else {
    trend = 'falling';
  }

  const history = generateIndicatorHistory(value, volatility);

  return { name, value, previousValue, change, trend, target, history };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateInflationBreakevenData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[InflationBreakeven] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate inflation breakeven data' });
  }
});

export default router;
