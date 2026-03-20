import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function round(val: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}

// ── Static definitions ──

const INDEX_DEFS = [
  { name: 'Bloomberg US IG',   baseOas: 110, baseYield: 5.2,  baseDuration: 7.1,  category: 'ig' as const },
  { name: 'Bloomberg US HY',   baseOas: 420, baseYield: 8.1,  baseDuration: 4.2,  category: 'hy' as const },
  { name: 'Bloomberg EM USD',  baseOas: 320, baseYield: 7.0,  baseDuration: 6.5,  category: 'em' as const },
  { name: 'Bloomberg Global Agg', baseOas: 95, baseYield: 4.5, baseDuration: 6.8, category: 'ig' as const },
  { name: 'iBoxx EUR IG',      baseOas: 120, baseYield: 4.0,  baseDuration: 5.4,  category: 'ig' as const },
  { name: 'iBoxx EUR HY',      baseOas: 380, baseYield: 7.5,  baseDuration: 3.8,  category: 'hy' as const },
  { name: 'JPM EMBI',          baseOas: 350, baseYield: 7.3,  baseDuration: 7.0,  category: 'em' as const },
  { name: 'JPM GBI-EM',        baseOas: 280, baseYield: 6.8,  baseDuration: 5.2,  category: 'em' as const },
  { name: 'Bloomberg US Agg',  baseOas: 90,  baseYield: 4.8,  baseDuration: 6.3,  category: 'ig' as const },
  { name: 'ICE BofA US Corp',  baseOas: 115, baseYield: 5.4,  baseDuration: 7.3,  category: 'ig' as const },
];

const RATING_DEFS = [
  { rating: 'AAA',          baseWeight: 2.5,  baseOas: 40,  baseYield: 4.0, baseReturn1M: 0.3,  baseDefault: 0.00 },
  { rating: 'AA',           baseWeight: 8.0,  baseOas: 55,  baseYield: 4.3, baseReturn1M: 0.25, baseDefault: 0.02 },
  { rating: 'A',            baseWeight: 28.0, baseOas: 80,  baseYield: 4.8, baseReturn1M: 0.2,  baseDefault: 0.06 },
  { rating: 'BBB',          baseWeight: 35.0, baseOas: 130, baseYield: 5.5, baseReturn1M: 0.15, baseDefault: 0.18 },
  { rating: 'BB',           baseWeight: 14.0, baseOas: 250, baseYield: 6.8, baseReturn1M: 0.1,  baseDefault: 0.70 },
  { rating: 'B',            baseWeight: 9.0,  baseOas: 400, baseYield: 8.2, baseReturn1M: 0.0,  baseDefault: 2.50 },
  { rating: 'CCC & below',  baseWeight: 3.5,  baseOas: 900, baseYield: 12.5, baseReturn1M: -0.5, baseDefault: 8.00 },
];

const SECTOR_DEFS = [
  { sector: 'Banking',     baseIg: 85,  baseHy: 310 },
  { sector: 'Insurance',   baseIg: 95,  baseHy: 340 },
  { sector: 'Technology',  baseIg: 75,  baseHy: 290 },
  { sector: 'Healthcare',  baseIg: 90,  baseHy: 350 },
  { sector: 'Energy',      baseIg: 110, baseHy: 420 },
  { sector: 'Utilities',   baseIg: 80,  baseHy: 280 },
  { sector: 'Consumer',    baseIg: 100, baseHy: 360 },
  { sector: 'Industrials', baseIg: 105, baseHy: 390 },
];

const FLOW_DEFS = [
  { category: 'US IG',      baseFlows1W: 2.5,  baseFlows1M: 8.0,  baseCumYTD: 45 },
  { category: 'US HY',      baseFlows1W: 1.2,  baseFlows1M: 3.5,  baseCumYTD: 18 },
  { category: 'EM Debt',    baseFlows1W: -0.5,  baseFlows1M: -1.8, baseCumYTD: -8 },
  { category: 'Global Agg', baseFlows1W: 3.0,  baseFlows1M: 10.0, baseCumYTD: 55 },
];

const MATURITY_DEFS = [
  { year: '2026',  baseIg: 280, baseHy: 95 },
  { year: '2027',  baseIg: 310, baseHy: 120 },
  { year: '2028',  baseIg: 350, baseHy: 140 },
  { year: '2029',  baseIg: 290, baseHy: 110 },
  { year: '2030+', baseIg: 850, baseHy: 320 },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('credit-index-' + today));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Indices
  const indices = INDEX_DEFS.map(def => {
    const oasRange = def.category === 'hy' ? [300, 550] : def.category === 'em' ? [200, 450] : [80, 150];
    const oas = round(clamp(jitter(def.baseOas, 0.12), oasRange[0], oasRange[1]));
    const yld = round(clamp(jitter(def.baseYield, 0.08), 2.0, 15.0));
    const duration = round(clamp(jitter(def.baseDuration, 0.05), 1.0, 12.0));
    const return1D = round((rng() - 0.5) * 0.4);
    const return1M = round((rng() - 0.5) * 2.0);
    const returnYTD = round((rng() - 0.5) * 6.0);
    const spread_change1D = round((rng() - 0.5) * 6);
    const spread_change1M = round((rng() - 0.5) * 20);

    return {
      name: def.name,
      oas,
      yield: yld,
      duration,
      return1D,
      return1M,
      returnYTD,
      spread_change1D,
      spread_change1M,
    };
  });

  // 2. Rating Breakdown
  const rawWeights = RATING_DEFS.map(def => jitter(def.baseWeight, 0.1));
  const totalWeight = rawWeights.reduce((s, w) => s + w, 0);
  const ratingBreakdown = RATING_DEFS.map((def, i) => ({
    rating: def.rating,
    weight: round(clamp((rawWeights[i] / totalWeight) * 100, 0.5, 50)),
    oas: round(clamp(jitter(def.baseOas, 0.1), 20, 1500)),
    yield: round(clamp(jitter(def.baseYield, 0.08), 2.0, 18.0)),
    return1M: round((rng() - 0.5) * 2.0 + def.baseReturn1M),
    defaultRate: round(clamp(jitter(def.baseDefault, 0.2), 0, 15), 2),
  }));

  // 3. Sector Spreads
  const sectorSpreads = SECTOR_DEFS.map(def => {
    const igSpread = round(clamp(jitter(def.baseIg, 0.12), 40, 200));
    const hySpread = round(clamp(jitter(def.baseHy, 0.12), 200, 600));
    const change1M = round((rng() - 0.5) * 16);
    return { sector: def.sector, igSpread, hySpread, change1M, tightest: false, widest: false };
  });
  // Mark tightest and widest by igSpread
  let minIg = Infinity, maxIg = -Infinity, minIdx = 0, maxIdx = 0;
  sectorSpreads.forEach((s, i) => {
    if (s.igSpread < minIg) { minIg = s.igSpread; minIdx = i; }
    if (s.igSpread > maxIg) { maxIg = s.igSpread; maxIdx = i; }
  });
  sectorSpreads[minIdx].tightest = true;
  sectorSpreads[maxIdx].widest = true;

  // 4. Flow Data
  const flowData = FLOW_DEFS.map(def => {
    const flows1W = round(jitter(def.baseFlows1W, 0.4));
    const flows1M = round(jitter(def.baseFlows1M, 0.3));
    const cumulativeYTD = round(jitter(def.baseCumYTD, 0.2));
    let flowsTrend: 'inflows' | 'outflows' | 'neutral';
    if (flows1W > 0.5) flowsTrend = 'inflows';
    else if (flows1W < -0.5) flowsTrend = 'outflows';
    else flowsTrend = 'neutral';
    return { category: def.category, flows1W, flows1M, flowsTrend, cumulativeYTD };
  });

  // 5. Maturity Wall
  const maturityWall = MATURITY_DEFS.map(def => {
    const igAmount = round(clamp(jitter(def.baseIg, 0.15), 50, 1200));
    const hyAmount = round(clamp(jitter(def.baseHy, 0.15), 20, 500));
    const totalAmount = round(igAmount + hyAmount);
    let refinancingRisk: 'low' | 'moderate' | 'high';
    if (totalAmount > 400) refinancingRisk = 'high';
    else if (totalAmount > 250) refinancingRisk = 'moderate';
    else refinancingRisk = 'low';
    return { year: def.year, igAmount, hyAmount, totalAmount, refinancingRisk };
  });

  // 6. Market Conditions
  const spreadPercentile1Y = round(clamp(rng() * 100, 0, 100), 0);
  const issuancePaceVal = rng();
  const newIssuancePace: 'heavy' | 'moderate' | 'light' =
    issuancePaceVal > 0.66 ? 'heavy' : issuancePaceVal > 0.33 ? 'moderate' : 'light';
  const defaultRateTrailing = round(clamp(jitter(1.8, 0.3), 0.5, 5.0));
  const defaultRateForecast = round(clamp(jitter(2.2, 0.3), 0.5, 6.0));
  const crossoverVal = rng();
  const crossoverActivity: 'rising stars' | 'balanced' | 'fallen angels' =
    crossoverVal > 0.66 ? 'rising stars' : crossoverVal > 0.33 ? 'balanced' : 'fallen angels';
  const sentimentVal = rng();
  const marketSentiment: 'risk-on' | 'neutral' | 'risk-off' =
    sentimentVal > 0.66 ? 'risk-on' : sentimentVal > 0.33 ? 'neutral' : 'risk-off';

  const marketConditions = {
    spreadPercentile1Y,
    newIssuancePace,
    defaultRateTrailing,
    defaultRateForecast,
    crossoverActivity,
    marketSentiment,
  };

  return {
    indices,
    ratingBreakdown,
    sectorSpreads,
    flowData,
    maturityWall,
    marketConditions,
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
    console.error('[CreditIndex] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate credit index data' });
  }
});

export default router;
