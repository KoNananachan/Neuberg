import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();


// ── Static Definitions ──

const RETURN_SOURCES = [
  'Income', 'Duration', 'Curve', 'Credit Spread', 'Currency', 'Mortgage/Prepay', 'Convexity', 'Residual',
] as const;

const RETURN_SEEDS = [
  { baseMTD: 0.35, baseQTD: 1.05, baseYTD: 2.10, baseBench: 0.30 },
  { baseMTD: -0.12, baseQTD: -0.40, baseYTD: -0.85, baseBench: -0.15 },
  { baseMTD: 0.05, baseQTD: 0.18, baseYTD: 0.32, baseBench: 0.04 },
  { baseMTD: 0.08, baseQTD: 0.25, baseYTD: 0.55, baseBench: 0.06 },
  { baseMTD: -0.03, baseQTD: -0.08, baseYTD: -0.15, baseBench: -0.02 },
  { baseMTD: 0.02, baseQTD: 0.06, baseYTD: 0.12, baseBench: 0.01 },
  { baseMTD: -0.01, baseQTD: -0.04, baseYTD: -0.08, baseBench: -0.01 },
  { baseMTD: 0.01, baseQTD: 0.03, baseYTD: 0.05, baseBench: 0.00 },
];

const SECTOR_NAMES = [
  'US Treasury', 'Agency MBS', 'IG Corporate', 'HY Corporate',
  'EM Sovereign', 'EM Corporate', 'Securitized', 'TIPS',
] as const;

const SECTOR_SEEDS = [
  { baseWeight: 32, baseBenchWeight: 35, baseReturn: 0.42 },
  { baseWeight: 22, baseBenchWeight: 25, baseReturn: 0.35 },
  { baseWeight: 18, baseBenchWeight: 16, baseReturn: 0.58 },
  { baseWeight: 8, baseBenchWeight: 5, baseReturn: 0.75 },
  { baseWeight: 6, baseBenchWeight: 4, baseReturn: 0.62 },
  { baseWeight: 4, baseBenchWeight: 3, baseReturn: 0.55 },
  { baseWeight: 6, baseBenchWeight: 8, baseReturn: 0.38 },
  { baseWeight: 4, baseBenchWeight: 4, baseReturn: 0.30 },
];

const DURATION_BUCKETS = ['0-2Y', '2-5Y', '5-7Y', '7-10Y', '10-20Y', '20Y+'] as const;

const DURATION_SEEDS = [
  { basePortDur: 0.45, baseBenchDur: 0.50, baseYieldChg: -5 },
  { basePortDur: 1.35, baseBenchDur: 1.40, baseYieldChg: -8 },
  { basePortDur: 1.10, baseBenchDur: 1.05, baseYieldChg: -12 },
  { basePortDur: 1.85, baseBenchDur: 1.80, baseYieldChg: -15 },
  { basePortDur: 0.90, baseBenchDur: 0.95, baseYieldChg: -18 },
  { basePortDur: 0.55, baseBenchDur: 0.50, baseYieldChg: -20 },
];

const CURRENCY_NAMES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'EM Local'] as const;

const CURRENCY_SEEDS = [
  { baseWeight: 62, baseHedge: 0, baseSpot: 0.00, baseCost: 0.00 },
  { baseWeight: 14, baseHedge: 80, baseSpot: 0.45, baseCost: -0.18 },
  { baseWeight: 8, baseHedge: 75, baseSpot: 0.30, baseCost: -0.12 },
  { baseWeight: 6, baseHedge: 90, baseSpot: -0.60, baseCost: -0.35 },
  { baseWeight: 5, baseHedge: 60, baseSpot: 0.55, baseCost: -0.08 },
  { baseWeight: 5, baseHedge: 30, baseSpot: 0.80, baseCost: -0.05 },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fi-attribution'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // 1. Return Decomposition
  const returnDecomposition = RETURN_SOURCES.map((source, i) => {
    const seed = RETURN_SEEDS[i];
    const returnMTD = round2(jitter(seed.baseMTD, 0.25));
    const returnQTD = round2(jitter(seed.baseQTD, 0.20));
    const returnYTD = round2(jitter(seed.baseYTD, 0.18));
    const benchmark = round2(jitter(seed.baseBench, 0.20));
    const active = round2(returnMTD - benchmark);
    const contribution = round4(returnMTD / 100);
    const trackingPart = 0.3 + rng() * 0.5;
    const informationRatio = active !== 0 ? round2(active / trackingPart) : 0;

    return { source, returnMTD, returnQTD, returnYTD, contribution, benchmark, active, informationRatio };
  });

  // 2. Sector Attribution
  const rawWeights = SECTOR_SEEDS.map(s => jitter(s.baseWeight, 0.15));
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const rawBenchWeights = SECTOR_SEEDS.map(s => jitter(s.baseBenchWeight, 0.08));
  const benchWeightSum = rawBenchWeights.reduce((a, b) => a + b, 0);

  const sectorAttribution = SECTOR_NAMES.map((sector, i) => {
    const weight = round2((rawWeights[i] / weightSum) * 100);
    const benchmarkWeight = round2((rawBenchWeights[i] / benchWeightSum) * 100);
    const overweight = round2(weight - benchmarkWeight);
    const totalReturn = round2(jitter(SECTOR_SEEDS[i].baseReturn, 0.30));
    const benchmarkReturn = round2(jitter(SECTOR_SEEDS[i].baseReturn * 0.9, 0.25));
    const excessReturn = round2(totalReturn - benchmarkReturn);
    const selectionEffect = round2(benchmarkWeight / 100 * (totalReturn - benchmarkReturn));

    return { sector, weight, benchmarkWeight, overweight, totalReturn, benchmarkReturn, excessReturn, selectionEffect };
  });

  // 3. Duration Attribution
  const durationAttribution = DURATION_BUCKETS.map((bucket, i) => {
    const seed = DURATION_SEEDS[i];
    const portfolioDuration = round2(jitter(seed.basePortDur, 0.12));
    const benchmarkDuration = round2(jitter(seed.baseBenchDur, 0.08));
    const activeDuration = round2(portfolioDuration - benchmarkDuration);
    const yieldChange = round2(jitter(seed.baseYieldChg, 0.30));
    const priceReturn = round2(-activeDuration * yieldChange / 100);
    const contribution = round4(priceReturn / 100);

    return { bucket, portfolioDuration, benchmarkDuration, activeDuration, yieldChange, priceReturn, contribution };
  });

  // 4. Currency Attribution
  const rawCurrWeights = CURRENCY_SEEDS.map(s => jitter(s.baseWeight, 0.12));
  const currWeightSum = rawCurrWeights.reduce((a, b) => a + b, 0);

  const currencyAttribution = CURRENCY_NAMES.map((currency, i) => {
    const seed = CURRENCY_SEEDS[i];
    const portfolioWeight = round2((rawCurrWeights[i] / currWeightSum) * 100);
    const hedgeRatio = round2(Math.max(0, Math.min(100, jitter(seed.baseHedge, 0.10))));
    const spotReturn = round2(jitter(seed.baseSpot, 0.40));
    const hedgeCost = round2(seed.baseCost !== 0 ? jitter(seed.baseCost, 0.25) : 0);
    const unhedgedPortion = (100 - hedgeRatio) / 100;
    const netFXReturn = round2(spotReturn * unhedgedPortion + hedgeCost * (hedgeRatio / 100));
    const contribution = round4(portfolioWeight / 100 * netFXReturn / 100);

    return { currency, portfolioWeight, hedgeRatio, spotReturn, hedgeCost, netFXReturn, contribution };
  });

  // 5. Market Summary
  const totalReturn = round2(returnDecomposition.reduce((s, r) => s + r.returnMTD, 0));
  const benchmarkReturn = round2(returnDecomposition.reduce((s, r) => s + r.benchmark, 0));
  const excessReturn = round2(totalReturn - benchmarkReturn);
  const trackingError = round2(0.15 + rng() * 0.45);
  const informationRatio = trackingError !== 0 ? round2(excessReturn / trackingError) : 0;

  // Find largest contributor and detractor by absolute returnMTD
  const sorted = [...returnDecomposition].sort((a, b) => b.active - a.active);
  const largestContributor = sorted[0].source;
  const largestDetractor = sorted[sorted.length - 1].source;

  const marketSummary = {
    totalReturn,
    benchmarkReturn,
    excessReturn,
    trackingError,
    informationRatio,
    largestContributor,
    largestDetractor,
  };

  return {
    returnDecomposition,
    sectorAttribution,
    durationAttribution,
    currencyAttribution,
    marketSummary,
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
    console.error('[FIAttribution] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate fixed income attribution data' });
  }
});

export default router;
