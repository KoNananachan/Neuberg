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

// ── Seed Data ──

const REPO_TERMS = ['O/N', '1W', '2W', '1M', '3M', '6M'] as const;
const COLLATERAL_TYPES = ['UST', 'Agency', 'Agency MBS', 'Corp IG', 'Corp HY', 'Equity'] as const;

// Base rates in bps. O/N GC ~430-435, term slightly higher.
// Columns ordered by collateral quality: UST < Agency < Agency MBS < Corp IG < Corp HY < Equity
const BASE_RATES: Record<string, number[]> = {
  'O/N': [431, 433, 436, 452, 488, 510],
  '1W':  [433, 435, 438, 455, 492, 515],
  '2W':  [435, 437, 440, 458, 496, 520],
  '1M':  [438, 440, 444, 462, 502, 528],
  '3M':  [442, 445, 449, 470, 512, 540],
  '6M':  [448, 451, 456, 480, 525, 555],
};

// Base volumes in $B per cell
const BASE_VOLUMES: Record<string, number[]> = {
  'O/N': [620, 185, 240, 95, 28, 15],
  '1W':  [180, 52,  68,  32, 10, 5],
  '2W':  [85,  25,  32,  18, 6,  3],
  '1M':  [120, 35,  48,  25, 8,  4],
  '3M':  [65,  18,  24,  14, 5,  2],
  '6M':  [32,  9,   12,  7,  2,  1],
};

const ON_THE_RUN_ISSUES = [
  { tenor: '2Y',   cusip: '91282CKR5', coupon: 4.25, maturity: '2028-03-15', baseGcRate: 431, baseSpecialRate: 395, baseFails: 1.8 },
  { tenor: '3Y',   cusip: '91282CKS3', coupon: 4.125, maturity: '2029-03-15', baseGcRate: 431, baseSpecialRate: 402, baseFails: 1.2 },
  { tenor: '5Y',   cusip: '91282CKT1', coupon: 4.00, maturity: '2031-03-15', baseGcRate: 432, baseSpecialRate: 388, baseFails: 2.5 },
  { tenor: '7Y',   cusip: '91282CKU8', coupon: 4.125, maturity: '2033-03-15', baseGcRate: 432, baseSpecialRate: 410, baseFails: 0.9 },
  { tenor: '10Y',  cusip: '91282CKV6', coupon: 4.25, maturity: '2036-02-15', baseGcRate: 433, baseSpecialRate: 380, baseFails: 3.2 },
  { tenor: '20Y',  cusip: '91282CKW4', coupon: 4.625, maturity: '2046-02-15', baseGcRate: 433, baseSpecialRate: 415, baseFails: 0.6 },
  { tenor: '30Y',  cusip: '91282CKX2', coupon: 4.50, maturity: '2056-02-15', baseGcRate: 434, baseSpecialRate: 405, baseFails: 1.5 },
  { tenor: 'TIPS',  cusip: '912810TQ5', coupon: 2.125, maturity: '2036-01-15', baseGcRate: 430, baseSpecialRate: 392, baseFails: 0.8 },
] as const;

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-repo-rate-heatmap'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // ── 1. Heatmap Matrix ──

  const heatmapMatrix = REPO_TERMS.map(term => {
    const baseRates = BASE_RATES[term];
    const baseVols = BASE_VOLUMES[term];

    const cells = COLLATERAL_TYPES.map((collateral, ci) => {
      const rate = roundTo(jitter(baseRates[ci], 0.008), 1);
      const change = roundTo((rng() - 0.48) * 6, 1); // -3 to +3 bps daily change
      const volume = roundTo(jitter(baseVols[ci], 0.12), 1);

      return { collateral, rate, change, volume };
    });

    return { term, cells };
  });

  // ── 2. Special Collateral Rates ──

  const specialCollateralRates = ON_THE_RUN_ISSUES.map(issue => {
    const gcRate = roundTo(jitter(issue.baseGcRate, 0.006), 1);
    const specialRate = roundTo(jitter(issue.baseSpecialRate, 0.015), 1);
    const spread = roundTo(gcRate - specialRate, 1);
    const fails = roundTo(Math.max(0, jitter(issue.baseFails, 0.25)), 1);

    return {
      tenor: issue.tenor,
      cusip: issue.cusip,
      coupon: issue.coupon,
      maturity: issue.maturity,
      gcRate,
      specialRate,
      spread,
      fails,
    };
  });

  // ── 3. Triparty Summary ──

  const totalVolume = roundTo(
    heatmapMatrix.reduce((sum, row) => sum + row.cells.reduce((s, c) => s + c.volume, 0), 0),
    1,
  );

  const weightedRateSum = heatmapMatrix.reduce((sum, row) =>
    sum + row.cells.reduce((s, c) => s + c.rate * c.volume, 0), 0,
  );
  const totalVolumeForAvg = heatmapMatrix.reduce((sum, row) =>
    sum + row.cells.reduce((s, c) => s + c.volume, 0), 0,
  );
  const avgRate = roundTo(weightedRateSum / totalVolumeForAvg, 2);

  const top5DealerConcentration = roundTo(62 + (rng() - 0.5) * 8, 1); // ~58-66%
  const clearedPct = roundTo(jitter(72, 0.04), 1);
  const bilateralPct = roundTo(100 - clearedPct, 1);

  const tripartySummary = {
    totalVolume,
    avgRate,
    top5DealerConcentration,
    clearedPct,
    bilateralPct,
  };

  // ── 4. Fails Monitor ──

  const dailyFails = roundTo(jitter(38.5, 0.18), 1); // ~$38.5B daily fails
  const rollingAvg5d = roundTo(jitter(35.2, 0.10), 1);
  const failsChargeRate = roundTo(jitter(430, 0.005), 2); // ~430 bps, tied to fed funds
  const settlementEfficiency = roundTo(Math.min(99.9, jitter(97.2, 0.008)), 2);

  const failsMonitor = {
    dailyFails,
    rollingAvg5d,
    failsChargeRate,
    settlementEfficiency,
  };

  return {
    heatmapMatrix,
    specialCollateralRates,
    tripartySummary,
    failsMonitor,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RepoRateHeatmap] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate repo rate heatmap data' });
  }
});

export default router;
