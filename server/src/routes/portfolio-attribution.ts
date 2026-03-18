import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Static Definitions ──

const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Disc',
  'Consumer Staples', 'Industrials', 'Energy', 'Materials',
  'Utilities', 'Real Estate', 'Communication',
] as const;

const SECTOR_SEEDS = [
  { basePortWeight: 29.5, baseBenchWeight: 28.0, baseReturn: 3.2, baseBenchReturn: 2.8 },
  { basePortWeight: 13.0, baseBenchWeight: 12.5, baseReturn: 1.8, baseBenchReturn: 1.5 },
  { basePortWeight: 12.5, baseBenchWeight: 13.0, baseReturn: 2.4, baseBenchReturn: 2.1 },
  { basePortWeight: 10.5, baseBenchWeight: 10.0, baseReturn: -0.8, baseBenchReturn: -0.5 },
  { basePortWeight: 5.5, baseBenchWeight: 6.5, baseReturn: 0.6, baseBenchReturn: 0.9 },
  { basePortWeight: 8.5, baseBenchWeight: 8.0, baseReturn: 1.5, baseBenchReturn: 1.2 },
  { basePortWeight: 4.5, baseBenchWeight: 4.0, baseReturn: -1.2, baseBenchReturn: -0.9 },
  { basePortWeight: 2.5, baseBenchWeight: 2.5, baseReturn: 0.4, baseBenchReturn: 0.3 },
  { basePortWeight: 2.5, baseBenchWeight: 3.0, baseReturn: 1.1, baseBenchReturn: 1.3 },
  { basePortWeight: 2.5, baseBenchWeight: 2.5, baseReturn: -0.3, baseBenchReturn: -0.2 },
  { basePortWeight: 8.5, baseBenchWeight: 10.0, baseReturn: 2.0, baseBenchReturn: 1.7 },
];

const FACTORS = ['Market', 'Size', 'Value', 'Momentum', 'Quality', 'Low Volatility', 'Growth'] as const;

const FACTOR_SEEDS = [
  { baseExposure: 1.05, baseBenchExposure: 1.00, baseReturn: 1.80 },
  { baseExposure: -0.12, baseBenchExposure: 0.00, baseReturn: 0.45 },
  { baseExposure: -0.25, baseBenchExposure: 0.00, baseReturn: 0.60 },
  { baseExposure: 0.22, baseBenchExposure: 0.00, baseReturn: 1.10 },
  { baseExposure: 0.30, baseBenchExposure: 0.00, baseReturn: 0.75 },
  { baseExposure: -0.15, baseBenchExposure: 0.00, baseReturn: 0.35 },
  { baseExposure: 0.18, baseBenchExposure: 0.00, baseReturn: 0.90 },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD'] as const;

const CURRENCY_SEEDS = [
  { baseWeight: 58, baseLocalReturn: 2.10, baseFXReturn: 0.00, baseHedgeRatio: 0, baseHedgeCost: 0.00 },
  { baseWeight: 14, baseLocalReturn: 1.45, baseFXReturn: -0.35, baseHedgeRatio: 75, baseHedgeCost: -0.12 },
  { baseWeight: 10, baseLocalReturn: 1.80, baseFXReturn: 0.20, baseHedgeRatio: 60, baseHedgeCost: -0.08 },
  { baseWeight: 8, baseLocalReturn: 0.65, baseFXReturn: -0.85, baseHedgeRatio: 90, baseHedgeCost: -0.30 },
  { baseWeight: 5, baseLocalReturn: 0.90, baseFXReturn: 0.15, baseHedgeRatio: 50, baseHedgeCost: -0.06 },
  { baseWeight: 5, baseLocalReturn: 1.20, baseFXReturn: 0.40, baseHedgeRatio: 40, baseHedgeCost: -0.04 },
];

interface TopContributor {
  ticker: string;
  name: string;
  weight: number;
  return: number;
  contribution: number;
}

const TOP_CONTRIBUTOR_POOL = [
  { ticker: 'NVDA', name: 'NVIDIA Corp' },
  { ticker: 'MSFT', name: 'Microsoft Corp' },
  { ticker: 'AAPL', name: 'Apple Inc' },
  { ticker: 'META', name: 'Meta Platforms' },
  { ticker: 'AMZN', name: 'Amazon.com Inc' },
  { ticker: 'LLY', name: 'Eli Lilly & Co' },
  { ticker: 'JPM', name: 'JPMorgan Chase' },
  { ticker: 'GOOGL', name: 'Alphabet Inc' },
  { ticker: 'AVGO', name: 'Broadcom Inc' },
  { ticker: 'COST', name: 'Costco Wholesale' },
];

const TOP_DETRACTOR_POOL = [
  { ticker: 'INTC', name: 'Intel Corp' },
  { ticker: 'BA', name: 'Boeing Co' },
  { ticker: 'PFE', name: 'Pfizer Inc' },
  { ticker: 'NKE', name: 'Nike Inc' },
  { ticker: 'DIS', name: 'Walt Disney Co' },
  { ticker: 'VZ', name: 'Verizon Communications' },
  { ticker: 'KHC', name: 'Kraft Heinz Co' },
  { ticker: 'WBA', name: 'Walgreens Boots' },
  { ticker: 'DVN', name: 'Devon Energy' },
  { ticker: 'PARA', name: 'Paramount Global' },
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Generator ──

function generate() {
  const seed = hashSeed('portfolio-attribution-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // ── Summary ──
  const totalReturn = round2(jitter(8.45, 0.25));
  const benchmarkReturn = round2(jitter(7.20, 0.20));
  const activeReturn = round2(totalReturn - benchmarkReturn);
  const trackingError = round2(1.8 + rng() * 1.4);
  const informationRatio = round2(activeReturn / trackingError);

  const periods = ['MTD', 'QTD', 'YTD', '1Y'] as const;
  const periodScales = [0.12, 0.35, 1.0, 1.0];
  const periodIdx = Math.floor(rng() * periods.length);

  const summary = {
    totalReturn,
    benchmarkReturn,
    activeReturn,
    trackingError,
    informationRatio,
    period: periods[periodIdx],
    periodReturns: periods.map((p, i) => ({
      period: p,
      portfolioReturn: round2(totalReturn * periodScales[i] * (0.85 + rng() * 0.30)),
      benchmarkReturn: round2(benchmarkReturn * periodScales[i] * (0.85 + rng() * 0.30)),
      activeReturn: round2(activeReturn * periodScales[i] * (0.70 + rng() * 0.60)),
    })),
  };

  // ── Brinson Attribution ──
  const rawPortWeights = SECTOR_SEEDS.map(s => jitter(s.basePortWeight, 0.15));
  const portWeightSum = rawPortWeights.reduce((a, b) => a + b, 0);
  const rawBenchWeights = SECTOR_SEEDS.map(s => jitter(s.baseBenchWeight, 0.08));
  const benchWeightSum = rawBenchWeights.reduce((a, b) => a + b, 0);

  const totalBenchmarkReturn = round2(jitter(benchmarkReturn / 12, 0.20));

  const brinsonAttribution = SECTORS.map((sector, i) => {
    const portfolioWeight = round2((rawPortWeights[i] / portWeightSum) * 100);
    const benchmarkWeight = round2((rawBenchWeights[i] / benchWeightSum) * 100);
    const portfolioReturn = round2(jitter(SECTOR_SEEDS[i].baseReturn, 0.30));
    const sectorBenchReturn = round2(jitter(SECTOR_SEEDS[i].baseBenchReturn, 0.25));

    const activeWeight = round2(portfolioWeight - benchmarkWeight);
    const allocationEffect = round4(activeWeight / 100 * (sectorBenchReturn - totalBenchmarkReturn));
    const selectionEffect = round4(benchmarkWeight / 100 * (portfolioReturn - sectorBenchReturn));
    const interactionEffect = round4(activeWeight / 100 * (portfolioReturn - sectorBenchReturn));
    const totalEffect = round4(allocationEffect + selectionEffect + interactionEffect);

    return {
      sector,
      portfolioWeight,
      benchmarkWeight,
      portfolioReturn,
      benchmarkReturn: sectorBenchReturn,
      allocationEffect,
      selectionEffect,
      interactionEffect,
      totalEffect,
    };
  });

  // ── Factor Attribution ──
  const factorAttribution = FACTORS.map((factor, i) => {
    const seed_f = FACTOR_SEEDS[i];
    const exposure = round2(jitter(seed_f.baseExposure, 0.20));
    const benchmarkExposure = round2(seed_f.baseBenchExposure + (rng() - 0.5) * 0.04);
    const activeExposure = round2(exposure - benchmarkExposure);
    const factorReturn = round2(jitter(seed_f.baseReturn, 0.30));
    const contribution = round4(activeExposure * factorReturn / 100);

    return { factor, exposure, benchmarkExposure, activeExposure, factorReturn, contribution };
  });

  // ── Currency Attribution ──
  const rawCurrWeights = CURRENCY_SEEDS.map(s => jitter(s.baseWeight, 0.12));
  const currWeightSum = rawCurrWeights.reduce((a, b) => a + b, 0);

  const currencyAttribution = CURRENCIES.map((currency, i) => {
    const cs = CURRENCY_SEEDS[i];
    const weight = round2((rawCurrWeights[i] / currWeightSum) * 100);
    const localReturn = round2(jitter(cs.baseLocalReturn, 0.25));
    const fxReturn = round2(cs.baseFXReturn !== 0 ? jitter(cs.baseFXReturn, 0.40) : 0);
    const hedgeRatio = round2(Math.max(0, Math.min(100, jitter(cs.baseHedgeRatio, 0.10))));
    const hedgeCost = round2(cs.baseHedgeCost !== 0 ? jitter(cs.baseHedgeCost, 0.25) : 0);
    const unhedgedPortion = (100 - hedgeRatio) / 100;
    const netFX = fxReturn * unhedgedPortion + hedgeCost * (hedgeRatio / 100);
    const totalContribution = round4(weight / 100 * (localReturn + netFX));

    return { currency, weight, localReturn, fxReturn, hedgeRatio, hedgeCost, totalContribution };
  });

  // ── Top Contributors / Detractors ──
  const shufflePool = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const topPositive: TopContributor[] = shufflePool(TOP_CONTRIBUTOR_POOL).slice(0, 5).map((stock, i) => ({
    ticker: stock.ticker,
    name: stock.name,
    weight: round2(2.0 + rng() * 4.5),
    return: round2(5.0 + rng() * 25.0),
    contribution: round2(35 - i * 5 + (rng() - 0.5) * 8),
  }));
  topPositive.sort((a, b) => b.contribution - a.contribution);

  const topNegative: TopContributor[] = shufflePool(TOP_DETRACTOR_POOL).slice(0, 5).map((stock, i) => ({
    ticker: stock.ticker,
    name: stock.name,
    weight: round2(0.5 + rng() * 2.5),
    return: round2(-25.0 + rng() * 15.0),
    contribution: round2(-30 + i * 4 + (rng() - 0.5) * 6),
  }));
  topNegative.sort((a, b) => a.contribution - b.contribution);

  const topContributors = { positive: topPositive, negative: topNegative };

  // ── Risk Decomposition ──
  const totalRisk = round2(jitter(14.5, 0.20));
  const systematicPct = round2(0.82 + rng() * 0.12);
  const systematicRisk = round2(totalRisk * systematicPct);
  const specificRisk = round2(totalRisk - systematicRisk);
  const rSquared = round2(systematicPct * systematicPct);
  const beta = round2(jitter(1.04, 0.10));
  const activeShare = round2(25 + rng() * 35);

  const riskDecomposition = {
    systematicRisk,
    specificRisk,
    totalRisk,
    rSquared,
    beta,
    activeShare,
  };

  return {
    summary,
    brinsonAttribution,
    factorAttribution,
    currencyAttribution,
    topContributors,
    riskDecomposition,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[PortfolioAttribution] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate portfolio attribution data' });
  }
});

export default router;
