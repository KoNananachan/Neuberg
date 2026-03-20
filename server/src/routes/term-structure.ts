import { Router } from 'express';

const router = Router();

// ── Types ──

interface TenorPoint {
  tenor: string;
  yield: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

interface CurveData {
  id: string;
  name: string;
  currency: string;
  lastUpdated: string;
  tenors: TenorPoint[];
}

interface CurveSpread {
  type: 'term' | 'cross';
  label: string;
  value: number;
  change1d: number;
  curveA?: string;
  curveB?: string;
}

interface TermStructureResponse {
  curves: CurveData[];
  spreads: CurveSpread[];
  generatedAt: string;
}

// ── Curve configurations ──

interface CurveConfig {
  id: string;
  name: string;
  currency: string;
  // Base yields for each tenor: 3M, 6M, 1Y, 2Y, 3Y, 5Y, 7Y, 10Y, 20Y, 30Y
  baseYields: number[];
  volatility: number; // basis points of noise
}

const TENORS = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'] as const;

const CURVES: CurveConfig[] = [
  {
    id: 'UST',
    name: 'US Treasury',
    currency: 'USD',
    baseYields: [4.55, 4.50, 4.38, 4.25, 4.18, 4.10, 4.15, 4.22, 4.55, 4.62],
    volatility: 6,
  },
  {
    id: 'BUND',
    name: 'German Bund',
    currency: 'EUR',
    baseYields: [2.85, 2.78, 2.60, 2.42, 2.35, 2.30, 2.32, 2.38, 2.55, 2.60],
    volatility: 4,
  },
  {
    id: 'GILT',
    name: 'UK Gilt',
    currency: 'GBP',
    baseYields: [4.20, 4.12, 3.98, 3.85, 3.80, 3.78, 3.82, 3.90, 4.18, 4.28],
    volatility: 5,
  },
  {
    id: 'JGB',
    name: 'Japan JGB',
    currency: 'JPY',
    baseYields: [0.08, 0.15, 0.32, 0.55, 0.62, 0.75, 0.88, 1.05, 1.62, 1.85],
    volatility: 3,
  },
  {
    id: 'CGB',
    name: 'Canada',
    currency: 'CAD',
    baseYields: [4.10, 4.02, 3.88, 3.72, 3.65, 3.55, 3.52, 3.50, 3.68, 3.75],
    volatility: 5,
  },
  {
    id: 'ACGB',
    name: 'Australia',
    currency: 'AUD',
    baseYields: [4.25, 4.18, 4.08, 3.95, 3.90, 3.88, 3.92, 4.00, 4.32, 4.45],
    volatility: 5,
  },
  {
    id: 'OAT',
    name: 'France OAT',
    currency: 'EUR',
    baseYields: [3.10, 3.02, 2.88, 2.72, 2.68, 2.65, 2.70, 2.80, 3.12, 3.22],
    volatility: 4,
  },
  {
    id: 'BTP',
    name: 'Italy BTP',
    currency: 'EUR',
    baseYields: [3.50, 3.42, 3.30, 3.18, 3.20, 3.28, 3.38, 3.55, 4.02, 4.18],
    volatility: 6,
  },
];

// ── Cross-country spread definitions ──

const CROSS_SPREADS: { label: string; curveA: string; curveB: string }[] = [
  { label: 'US-DE 10Y', curveA: 'UST', curveB: 'BUND' },
  { label: 'US-JP 10Y', curveA: 'UST', curveB: 'JGB' },
  { label: 'IT-DE 10Y (BTP-Bund)', curveA: 'BTP', curveB: 'BUND' },
  { label: 'FR-DE 10Y (OAT-Bund)', curveA: 'OAT', curveB: 'BUND' },
];

// ── Cache ──

let cache: { data: TermStructureResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000;

// ── Seeded PRNG for deterministic data ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ── Data generation ──

function generateData(): TermStructureResponse {
  // Seed based on date (changes daily) + 5-min bucket for intraday variation
  const now = new Date();
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const timeBucket = Math.floor(Date.now() / (5 * 60_000));
  const rand = seededRandom(dateSeed * 1000 + timeBucket);

  const curves: CurveData[] = [];

  for (const config of CURVES) {
    const tenors: TenorPoint[] = config.baseYields.map((baseYield, i) => {
      const noise = (rand() - 0.5) * config.volatility * 2 / 100;
      const yieldVal = Math.round((baseYield + noise) * 1000) / 1000;

      const change1d = Math.round((rand() - 0.5) * config.volatility * 0.4) / 10;
      const change1w = Math.round((rand() - 0.5) * config.volatility * 1.0) / 10;
      const change1m = Math.round((rand() - 0.5) * config.volatility * 2.0) / 10;

      return {
        tenor: TENORS[i],
        yield: yieldVal,
        change1d: Math.round(change1d * 100) / 100,
        change1w: Math.round(change1w * 100) / 100,
        change1m: Math.round(change1m * 100) / 100,
      };
    });

    curves.push({
      id: config.id,
      name: config.name,
      currency: config.currency,
      lastUpdated: now.toISOString(),
      tenors,
    });
  }

  // Build spreads
  const spreads: CurveSpread[] = [];

  // 10Y-2Y term spreads for each curve
  for (const curve of curves) {
    const y10 = curve.tenors.find((t) => t.tenor === '10Y')?.yield ?? 0;
    const y2 = curve.tenors.find((t) => t.tenor === '2Y')?.yield ?? 0;
    const spreadVal = Math.round((y10 - y2) * 100); // basis points
    const chg = Math.round((rand() - 0.5) * 4);

    spreads.push({
      type: 'term',
      label: `${curve.id} 10Y-2Y`,
      value: spreadVal,
      change1d: chg,
    });
  }

  // Cross-country 10Y spreads
  for (const def of CROSS_SPREADS) {
    const curveA = curves.find((c) => c.id === def.curveA);
    const curveB = curves.find((c) => c.id === def.curveB);
    if (!curveA || !curveB) continue;

    const yA = curveA.tenors.find((t) => t.tenor === '10Y')?.yield ?? 0;
    const yB = curveB.tenors.find((t) => t.tenor === '10Y')?.yield ?? 0;
    const spreadVal = Math.round((yA - yB) * 100); // basis points
    const chg = Math.round((rand() - 0.5) * 6);

    spreads.push({
      type: 'cross',
      label: def.label,
      value: spreadVal,
      change1d: chg,
      curveA: def.curveA,
      curveB: def.curveB,
    });
  }

  return {
    curves,
    spreads,
    generatedAt: now.toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const result = generateData();
    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TermStructure] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch term structure data' });
  }
});

export default router;
