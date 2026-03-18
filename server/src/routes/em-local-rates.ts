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

// ── Seed Data ──

interface YieldSeed {
  country: string;
  currency: string;
  baseYield10y: number;
  baseSlope: number;
  baseInflation: number;
  rating: string;
}

const YIELD_SEEDS: YieldSeed[] = [
  { country: 'Brazil',           currency: 'BRL', baseYield10y: 11.0,  baseSlope: 0.80,  baseInflation: 4.5,  rating: 'BB' },
  { country: 'Mexico',           currency: 'MXN', baseYield10y: 9.5,   baseSlope: 0.60,  baseInflation: 4.2,  rating: 'BBB' },
  { country: 'South Africa',     currency: 'ZAR', baseYield10y: 10.0,  baseSlope: 0.90,  baseInflation: 5.0,  rating: 'BB-' },
  { country: 'Turkey',           currency: 'TRY', baseYield10y: 25.0,  baseSlope: -2.50, baseInflation: 45.0, rating: 'B' },
  { country: 'India',            currency: 'INR', baseYield10y: 7.0,   baseSlope: 0.30,  baseInflation: 5.2,  rating: 'BBB-' },
  { country: 'Indonesia',        currency: 'IDR', baseYield10y: 6.5,   baseSlope: 0.40,  baseInflation: 3.0,  rating: 'BBB' },
  { country: 'Poland',           currency: 'PLN', baseYield10y: 5.5,   baseSlope: 0.50,  baseInflation: 3.8,  rating: 'A-' },
  { country: 'Colombia',         currency: 'COP', baseYield10y: 10.5,  baseSlope: 0.70,  baseInflation: 6.5,  rating: 'BB+' },
  { country: 'Thailand',         currency: 'THB', baseYield10y: 2.5,   baseSlope: 0.20,  baseInflation: 1.2,  rating: 'BBB+' },
  { country: 'Malaysia',         currency: 'MYR', baseYield10y: 3.8,   baseSlope: 0.25,  baseInflation: 2.5,  rating: 'A-' },
  { country: 'Chile',            currency: 'CLP', baseYield10y: 5.5,   baseSlope: 0.45,  baseInflation: 3.5,  rating: 'A' },
  { country: 'Czech Republic',   currency: 'CZK', baseYield10y: 4.0,   baseSlope: 0.35,  baseInflation: 2.8,  rating: 'AA-' },
];

interface NdfSeed {
  pair: string;
  baseSpot: number;
  baseImpliedYield: number;
}

const NDF_SEEDS: NdfSeed[] = [
  { pair: 'USD/BRL', baseSpot: 4.95,    baseImpliedYield: 10.5 },
  { pair: 'USD/INR', baseSpot: 83.20,   baseImpliedYield: 4.2 },
  { pair: 'USD/KRW', baseSpot: 1325.0,  baseImpliedYield: 3.5 },
  { pair: 'USD/TWD', baseSpot: 31.50,   baseImpliedYield: 1.8 },
  { pair: 'USD/CNY', baseSpot: 7.24,    baseImpliedYield: 2.5 },
  { pair: 'USD/IDR', baseSpot: 15450.0, baseImpliedYield: 4.0 },
  { pair: 'USD/PHP', baseSpot: 55.80,   baseImpliedYield: 3.8 },
  { pair: 'USD/CLP', baseSpot: 880.0,   baseImpliedYield: 5.2 },
];

interface RealRateSeed {
  country: string;
  baseNominal: number;
  baseCpi: number;
  baseCbRate: number;
}

const REAL_RATE_SEEDS: RealRateSeed[] = [
  { country: 'Brazil',       baseNominal: 11.0,  baseCpi: 4.5,  baseCbRate: 13.75 },
  { country: 'Mexico',       baseNominal: 9.5,   baseCpi: 4.2,  baseCbRate: 11.25 },
  { country: 'South Africa', baseNominal: 10.0,  baseCpi: 5.0,  baseCbRate: 8.25 },
  { country: 'India',        baseNominal: 7.0,   baseCpi: 5.2,  baseCbRate: 6.50 },
  { country: 'Indonesia',    baseNominal: 6.5,   baseCpi: 3.0,  baseCbRate: 6.00 },
  { country: 'Poland',       baseNominal: 5.5,   baseCpi: 3.8,  baseCbRate: 5.75 },
  { country: 'Colombia',     baseNominal: 10.5,  baseCpi: 6.5,  baseCbRate: 13.25 },
  { country: 'Thailand',     baseNominal: 2.5,   baseCpi: 1.2,  baseCbRate: 2.50 },
  { country: 'Chile',        baseNominal: 5.5,   baseCpi: 3.5,  baseCbRate: 7.25 },
  { country: 'Czech Republic', baseNominal: 4.0, baseCpi: 2.8,  baseCbRate: 5.25 },
];

interface CbSpreadSeed {
  emCountry: string;
  emBaseRate: number;
  dmBenchmark: string;
  dmBaseRate: number;
  historicalAvg: number;
}

const CB_SPREAD_SEEDS: CbSpreadSeed[] = [
  { emCountry: 'Brazil',       emBaseRate: 13.75, dmBenchmark: 'Fed Funds',  dmBaseRate: 5.50, historicalAvg: 7.0 },
  { emCountry: 'Mexico',       emBaseRate: 11.25, dmBenchmark: 'Fed Funds',  dmBaseRate: 5.50, historicalAvg: 5.5 },
  { emCountry: 'South Africa', emBaseRate: 8.25,  dmBenchmark: 'Fed Funds',  dmBaseRate: 5.50, historicalAvg: 3.5 },
  { emCountry: 'India',        emBaseRate: 6.50,  dmBenchmark: 'Fed Funds',  dmBaseRate: 5.50, historicalAvg: 2.5 },
  { emCountry: 'Poland',       emBaseRate: 5.75,  dmBenchmark: 'ECB Depo',   dmBaseRate: 4.00, historicalAvg: 2.0 },
  { emCountry: 'Colombia',     emBaseRate: 13.25, dmBenchmark: 'Fed Funds',  dmBaseRate: 5.50, historicalAvg: 5.0 },
  { emCountry: 'Chile',        emBaseRate: 7.25,  dmBenchmark: 'Fed Funds',  dmBaseRate: 5.50, historicalAvg: 2.5 },
  { emCountry: 'Czech Republic', emBaseRate: 5.25, dmBenchmark: 'ECB Depo', dmBaseRate: 4.00, historicalAvg: 1.5 },
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-em-local-rates'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round4 = (v: number) => Math.round(v * 10000) / 10000;

  // 1. Local Currency Yields
  const localCurrencyYields = YIELD_SEEDS.map(seed => {
    const yield10y = round2(jitter(seed.baseYield10y, 0.06));
    const slope = round2(jitter(seed.baseSlope, 0.15));
    const yield2y = round2(yield10y - slope);
    const change10y = round2((rng() - 0.48) * seed.baseYield10y * 0.02);
    const weekChange = round2((rng() - 0.45) * seed.baseYield10y * 0.04);
    const inflation = round2(jitter(seed.baseInflation, 0.08));
    const realYield10y = round2(yield10y - inflation);

    return {
      country: seed.country,
      currency: seed.currency,
      yield2y,
      yield10y,
      slope,
      change10y,
      weekChange,
      realYield10y,
      inflation,
      rating: seed.rating,
    };
  });

  // 2. NDF Forwards
  const usFedRate = 5.50;
  const ndfForwards = NDF_SEEDS.map(seed => {
    const spot = round4(jitter(seed.baseSpot, 0.02));
    const impliedYield = round2(jitter(seed.baseImpliedYield, 0.08));
    const carryVsUSD = round2(impliedYield - usFedRate);

    // Forward points increase with tenor based on implied yield differential
    const fwdFactor1m = 1 + (impliedYield - usFedRate) / 100 / 12;
    const fwdFactor3m = 1 + (impliedYield - usFedRate) / 100 / 4;
    const fwdFactor6m = 1 + (impliedYield - usFedRate) / 100 / 2;
    const fwdFactor12m = 1 + (impliedYield - usFedRate) / 100;

    const ndf1m = round4(spot * jitter(fwdFactor1m, 0.005));
    const ndf3m = round4(spot * jitter(fwdFactor3m, 0.008));
    const ndf6m = round4(spot * jitter(fwdFactor6m, 0.012));
    const ndf12m = round4(spot * jitter(fwdFactor12m, 0.015));

    return {
      pair: seed.pair,
      spot,
      ndf1m,
      ndf3m,
      ndf6m,
      ndf12m,
      impliedYield,
      carryVsUSD,
    };
  });

  // 3. Real Rate Comparison
  const realRateComparison = REAL_RATE_SEEDS.map(seed => {
    const nominalRate = round2(jitter(seed.baseNominal, 0.05));
    const cpiYoY = round2(jitter(seed.baseCpi, 0.08));
    const realRate = round2(nominalRate - cpiYoY);
    const exAnteReal = round2(realRate + (rng() - 0.5) * 0.6);
    const centralBankRate = round2(jitter(seed.baseCbRate, 0.03));
    const realPolicyRate = round2(centralBankRate - cpiYoY);

    let attractiveness: string;
    if (realRate > 3.5) attractiveness = 'Attractive';
    else if (realRate > 1.0) attractiveness = 'Fair';
    else attractiveness = 'Unattractive';

    return {
      country: seed.country,
      nominalRate,
      cpiYoY,
      realRate,
      exAnteReal,
      centralBankRate,
      realPolicyRate,
      attractiveness,
    };
  });

  // 4. Central Bank Spreads
  const centralBankSpreads = CB_SPREAD_SEEDS.map(seed => {
    const emRate = round2(jitter(seed.emBaseRate, 0.04));
    const dmRate = round2(jitter(seed.dmBaseRate, 0.02));
    const spread = round2(emRate - dmRate);
    const historicalAvg = seed.historicalAvg;
    const stdDev = historicalAvg * 0.2;
    const zscore = round2((spread - historicalAvg) / (stdDev || 1));

    let direction: string;
    if (zscore > 0.5) direction = 'Widening';
    else if (zscore < -0.5) direction = 'Narrowing';
    else direction = 'Stable';

    return {
      emCountry: seed.emCountry,
      emRate,
      dmBenchmark: seed.dmBenchmark,
      dmRate,
      spread,
      historicalAvg,
      zscore,
      direction,
    };
  });

  // 5. Market Summary
  const avgEMYield10y = round2(
    localCurrencyYields.reduce((sum, y) => sum + y.yield10y, 0) / localCurrencyYields.length,
  );
  const avgEMRealYield = round2(
    localCurrencyYields.reduce((sum, y) => sum + y.realYield10y, 0) / localCurrencyYields.length,
  );

  const sortedByCarry = [...ndfForwards].sort((a, b) => b.carryVsUSD - a.carryVsUSD);
  const bestCarry = sortedByCarry[0].pair.replace('USD/', '');

  const sortedByWeekChange = [...localCurrencyYields].sort((a, b) => b.weekChange - a.weekChange);
  const worstPerformer = sortedByWeekChange[0].country;

  const embiSpread = round2(jitter(380, 0.06));

  const flowOptions = ['Inflows', 'Outflows', 'Mixed'] as const;
  const flowTrend = flowOptions[Math.floor(rng() * flowOptions.length)];

  const marketSummary = {
    avgEMYield10y,
    avgEMRealYield,
    bestCarry,
    worstPerformer,
    embiSpread,
    flowTrend,
  };

  return {
    localCurrencyYields,
    ndfForwards,
    realRateComparison,
    centralBankSpreads,
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
    console.error('[EMLocalRates] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate EM local rates data' });
  }
});

export default router;
