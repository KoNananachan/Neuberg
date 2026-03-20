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

// -- Seed Data --

interface BenchmarkDef {
  name: string;
  baseReturn1D: number;
  baseReturn1W: number;
  baseReturn1M: number;
  baseReturnYTD: number;
  baseReturn1Y: number;
  baseTrackingError: number;
  baseInfoRatio: number;
  baseSharpe: number;
}

const BENCHMARK_DEFS: BenchmarkDef[] = [
  { name: 'S&P 500',         baseReturn1D: 0.12,  baseReturn1W: 0.85,  baseReturn1M: 2.14,  baseReturnYTD: 8.52,  baseReturn1Y: 18.34, baseTrackingError: 1.82, baseInfoRatio: 0.45,  baseSharpe: 1.24 },
  { name: 'MSCI World',      baseReturn1D: 0.08,  baseReturn1W: 0.62,  baseReturn1M: 1.78,  baseReturnYTD: 7.81,  baseReturn1Y: 15.92, baseTrackingError: 2.15, baseInfoRatio: 0.32,  baseSharpe: 1.08 },
  { name: 'Bloomberg US Agg',baseReturn1D: -0.03, baseReturn1W: 0.11,  baseReturn1M: 0.42,  baseReturnYTD: 1.24,  baseReturn1Y: 3.68,  baseTrackingError: 0.95, baseInfoRatio: -0.12, baseSharpe: 0.38 },
  { name: 'Russell 2000',    baseReturn1D: 0.18,  baseReturn1W: 1.12,  baseReturn1M: 2.85,  baseReturnYTD: 3.24,  baseReturn1Y: 10.56, baseTrackingError: 3.42, baseInfoRatio: 0.28,  baseSharpe: 0.72 },
  { name: 'NASDAQ 100',      baseReturn1D: 0.22,  baseReturn1W: 1.34,  baseReturn1M: 3.18,  baseReturnYTD: 10.24, baseReturn1Y: 24.56, baseTrackingError: 2.68, baseInfoRatio: 0.56,  baseSharpe: 1.42 },
  { name: 'FTSE 100',        baseReturn1D: 0.05,  baseReturn1W: 0.38,  baseReturn1M: 1.24,  baseReturnYTD: 4.72,  baseReturn1Y: 8.94,  baseTrackingError: 2.45, baseInfoRatio: 0.18,  baseSharpe: 0.62 },
  { name: 'Euro Stoxx 50',   baseReturn1D: 0.14,  baseReturn1W: 0.72,  baseReturn1M: 1.92,  baseReturnYTD: 6.48,  baseReturn1Y: 12.36, baseTrackingError: 2.82, baseInfoRatio: 0.24,  baseSharpe: 0.78 },
  { name: 'Nikkei 225',      baseReturn1D: -0.08, baseReturn1W: 0.45,  baseReturn1M: 1.56,  baseReturnYTD: 7.62,  baseReturn1Y: 14.28, baseTrackingError: 3.18, baseInfoRatio: 0.22,  baseSharpe: 0.85 },
  { name: 'MSCI EM',         baseReturn1D: 0.06,  baseReturn1W: 0.28,  baseReturn1M: 0.94,  baseReturnYTD: 5.52,  baseReturn1Y: 9.84,  baseTrackingError: 3.92, baseInfoRatio: 0.14,  baseSharpe: 0.52 },
  { name: 'S&P/TSX',         baseReturn1D: 0.09,  baseReturn1W: 0.54,  baseReturn1M: 1.48,  baseReturnYTD: 5.18,  baseReturn1Y: 11.72, baseTrackingError: 2.56, baseInfoRatio: 0.21,  baseSharpe: 0.68 },
];

interface AttributionDef {
  component: string;
  baseValue: number;
}

const ATTRIBUTION_DEFS: AttributionDef[] = [
  { component: 'Sector Allocation',   baseValue: 0.42 },
  { component: 'Security Selection',  baseValue: 0.78 },
  { component: 'Interaction',         baseValue: -0.15 },
  { component: 'Currency',            baseValue: 0.12 },
];

interface RiskDecompDef {
  metric: string;
  baseValue: number;
  unit: '%' | 'x' | 'ratio';
}

const RISK_DECOMP_DEFS: RiskDecompDef[] = [
  { metric: 'Systematic Risk', baseValue: 12.45, unit: '%' },
  { metric: 'Specific Risk',   baseValue: 4.82,  unit: '%' },
  { metric: 'Total Risk',      baseValue: 13.36, unit: '%' },
  { metric: 'Beta',            baseValue: 1.04,  unit: 'x' },
  { metric: 'R-Squared',       baseValue: 0.92,  unit: 'ratio' },
];

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-benchmark-analytics'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const jitterAbs = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // -- 1. Benchmark Comparison Table --

  const benchmarkComparison = BENCHMARK_DEFS.map(def => {
    const return1D = roundTo(jitterAbs(def.baseReturn1D, 0.35), 2);
    const return1W = roundTo(jitterAbs(def.baseReturn1W, 0.6), 2);
    const return1M = roundTo(jitterAbs(def.baseReturn1M, 1.0), 2);
    const returnYTD = roundTo(jitterAbs(def.baseReturnYTD, 2.0), 2);
    const return1Y = roundTo(jitterAbs(def.baseReturn1Y, 3.5), 2);
    const trackingError = roundTo(jitter(def.baseTrackingError, 0.15), 2);
    const informationRatio = roundTo(jitterAbs(def.baseInfoRatio, 0.18), 2);
    const sharpeRatio = roundTo(jitterAbs(def.baseSharpe, 0.20), 2);

    return {
      index: def.name,
      return1D,
      return1W,
      return1M,
      returnYTD,
      return1Y,
      trackingError,
      informationRatio,
      sharpeRatio,
    };
  });

  // -- 2. Attribution Breakdown --

  const attributionComponents = ATTRIBUTION_DEFS.map(def => ({
    component: def.component,
    value: roundTo(jitterAbs(def.baseValue, 0.25), 2),
  }));

  const totalAttribution = roundTo(
    attributionComponents.reduce((sum, c) => sum + c.value, 0),
    2
  );

  const attributionBreakdown = {
    components: attributionComponents,
    total: totalAttribution,
  };

  // -- 3. Risk Decomposition --

  const riskComponents = RISK_DECOMP_DEFS.map(def => {
    let value: number;
    if (def.unit === 'ratio') {
      // Keep R-squared between 0 and 1
      value = roundTo(Math.min(0.99, Math.max(0.70, jitterAbs(def.baseValue, 0.05))), 2);
    } else if (def.unit === 'x') {
      // Beta stays near 1
      value = roundTo(jitterAbs(def.baseValue, 0.12), 2);
    } else {
      value = roundTo(jitter(def.baseValue, 0.12), 2);
    }

    return {
      metric: def.metric,
      value,
      unit: def.unit,
    };
  });

  // Ensure total risk >= sqrt(systematic^2 + specific^2) for consistency
  const systematic = riskComponents[0].value;
  const specific = riskComponents[1].value;
  const impliedTotal = roundTo(Math.sqrt(systematic ** 2 + specific ** 2), 2);
  riskComponents[2].value = Math.max(riskComponents[2].value, impliedTotal);

  const riskDecomposition = riskComponents;

  return {
    benchmarkComparison,
    attributionBreakdown,
    riskDecomposition,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[BenchmarkAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate benchmark analytics data' });
  }
});

export default router;
