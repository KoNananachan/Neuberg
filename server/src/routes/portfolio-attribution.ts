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
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Static Definitions ──

const GICS_SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
] as const;

interface SectorSeed {
  basePortWeight: number;
  baseBenchWeight: number;
  basePortReturn: number;
  baseBenchReturn: number;
}

const SECTOR_SEEDS: SectorSeed[] = [
  { basePortWeight: 30.2, baseBenchWeight: 28.8, basePortReturn: 3.45, baseBenchReturn: 2.90 },
  { basePortWeight: 13.1, baseBenchWeight: 12.6, basePortReturn: 1.85, baseBenchReturn: 1.52 },
  { basePortWeight: 12.8, baseBenchWeight: 13.2, basePortReturn: 2.38, baseBenchReturn: 2.05 },
  { basePortWeight: 10.2, baseBenchWeight: 10.5, basePortReturn: -0.72, baseBenchReturn: -0.48 },
  { basePortWeight: 8.8, baseBenchWeight: 9.5, basePortReturn: 2.15, baseBenchReturn: 1.78 },
  { basePortWeight: 8.4, baseBenchWeight: 8.0, basePortReturn: 1.62, baseBenchReturn: 1.28 },
  { basePortWeight: 5.8, baseBenchWeight: 6.2, basePortReturn: 0.55, baseBenchReturn: 0.82 },
  { basePortWeight: 4.2, baseBenchWeight: 3.8, basePortReturn: -1.15, baseBenchReturn: -0.88 },
  { basePortWeight: 2.5, baseBenchWeight: 2.8, basePortReturn: 1.08, baseBenchReturn: 1.25 },
  { basePortWeight: 2.2, baseBenchWeight: 2.4, basePortReturn: -0.35, baseBenchReturn: -0.18 },
  { basePortWeight: 1.8, baseBenchWeight: 2.2, basePortReturn: 0.42, baseBenchReturn: 0.28 },
];

// ── Top / Bottom Contributors ──

const TOP_CONTRIBUTOR_POOL = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Technology' },
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Technology' },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Communication Services' },
  { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer Discretionary' },
  { ticker: 'LLY', name: 'Eli Lilly & Co', sector: 'Healthcare' },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials' },
  { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'Communication Services' },
  { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'Technology' },
  { ticker: 'GE', name: 'GE Aerospace', sector: 'Industrials' },
];

const BOTTOM_CONTRIBUTOR_POOL = [
  { ticker: 'INTC', name: 'Intel Corp', sector: 'Technology' },
  { ticker: 'BA', name: 'Boeing Co', sector: 'Industrials' },
  { ticker: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare' },
  { ticker: 'NKE', name: 'Nike Inc', sector: 'Consumer Discretionary' },
  { ticker: 'DIS', name: 'Walt Disney Co', sector: 'Communication Services' },
  { ticker: 'VZ', name: 'Verizon Communications', sector: 'Communication Services' },
  { ticker: 'KHC', name: 'Kraft Heinz Co', sector: 'Consumer Staples' },
  { ticker: 'WBA', name: 'Walgreens Boots Alliance', sector: 'Healthcare' },
  { ticker: 'DVN', name: 'Devon Energy', sector: 'Energy' },
  { ticker: 'PARA', name: 'Paramount Global', sector: 'Communication Services' },
];

// ── Factor Definitions ──

const FACTOR_NAMES = [
  'Market Beta',
  'Size',
  'Value',
  'Momentum',
  'Quality',
  'Low Volatility',
] as const;

interface FactorSeed {
  baseExposure: number;
  baseBenchExposure: number;
  baseReturn: number;
}

const FACTOR_SEEDS: FactorSeed[] = [
  { baseExposure: 1.05, baseBenchExposure: 1.00, baseReturn: 1.82 },
  { baseExposure: -0.14, baseBenchExposure: 0.00, baseReturn: 0.48 },
  { baseExposure: -0.22, baseBenchExposure: 0.00, baseReturn: 0.65 },
  { baseExposure: 0.25, baseBenchExposure: 0.00, baseReturn: 1.12 },
  { baseExposure: 0.32, baseBenchExposure: 0.00, baseReturn: 0.78 },
  { baseExposure: -0.18, baseBenchExposure: 0.00, baseReturn: 0.32 },
];

// ── Generator ──

function generate() {
  const dateKey = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('portfolio-attribution-brinson-' + dateKey);
  const rng = mulberry32(seed);

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // ── Performance Summary ──

  const portfolioReturn = round2(jitter(8.65, 0.22));
  const benchmarkReturn = round2(jitter(7.32, 0.18));
  const activeReturn = round2(portfolioReturn - benchmarkReturn);
  const trackingError = round2(1.6 + rng() * 1.5);
  const informationRatio = round2(activeReturn / trackingError);

  const performanceSummary = {
    portfolioReturn,
    benchmarkReturn,
    activeReturn,
    trackingError,
    informationRatio,
    benchmark: 'S&P 500',
    period: 'YTD',
    asOfDate: dateKey,
  };

  // ── Sector Attribution (Brinson Model) ──

  const rawPortWeights = SECTOR_SEEDS.map(s => jitter(s.basePortWeight, 0.12));
  const portWeightSum = rawPortWeights.reduce((a, b) => a + b, 0);
  const rawBenchWeights = SECTOR_SEEDS.map(s => jitter(s.baseBenchWeight, 0.08));
  const benchWeightSum = rawBenchWeights.reduce((a, b) => a + b, 0);

  // Total benchmark return for allocation effect calculation
  const totalBenchReturn = round2(jitter(benchmarkReturn / 12, 0.15));

  const sectorAttribution = GICS_SECTORS.map((sector, i) => {
    const portfolioWeight = round2((rawPortWeights[i] / portWeightSum) * 100);
    const benchmarkWeight = round2((rawBenchWeights[i] / benchWeightSum) * 100);
    const sectorPortReturn = round2(jitter(SECTOR_SEEDS[i].basePortReturn, 0.28));
    const sectorBenchReturn = round2(jitter(SECTOR_SEEDS[i].baseBenchReturn, 0.22));

    // Brinson-Fachler decomposition
    const activeWeight = round4((portfolioWeight - benchmarkWeight) / 100);
    const allocationEffect = round4(activeWeight * (sectorBenchReturn - totalBenchReturn));
    const selectionEffect = round4((benchmarkWeight / 100) * (sectorPortReturn - sectorBenchReturn));
    const interactionEffect = round4(activeWeight * (sectorPortReturn - sectorBenchReturn));
    const totalEffect = round4(allocationEffect + selectionEffect + interactionEffect);

    return {
      sector,
      portfolioWeight,
      benchmarkWeight,
      allocationEffect,
      selectionEffect,
      interactionEffect,
      totalEffect,
    };
  });

  // ── Top / Bottom Contributors ──

  const shufflePool = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const topContributors = shufflePool(TOP_CONTRIBUTOR_POOL)
    .slice(0, 5)
    .map((stock, i) => {
      const weight = round2(1.8 + rng() * 5.0);
      const stockReturn = round2(6.0 + rng() * 28.0);
      const contribution = round2((40 - i * 6) * (0.8 + rng() * 0.4));
      return {
        name: stock.name,
        ticker: stock.ticker,
        sector: stock.sector,
        weight,
        return: stockReturn,
        contribution,
      };
    })
    .sort((a, b) => b.contribution - a.contribution);

  const bottomContributors = shufflePool(BOTTOM_CONTRIBUTOR_POOL)
    .slice(0, 5)
    .map((stock, i) => {
      const weight = round2(0.3 + rng() * 2.2);
      const stockReturn = round2(-28.0 + rng() * 16.0);
      const contribution = round2((-35 + i * 5) * (0.8 + rng() * 0.4));
      return {
        name: stock.name,
        ticker: stock.ticker,
        sector: stock.sector,
        weight,
        return: stockReturn,
        contribution,
      };
    })
    .sort((a, b) => a.contribution - b.contribution);

  // ── Factor Exposure ──

  const factorExposure = FACTOR_NAMES.map((factor, i) => {
    const fs = FACTOR_SEEDS[i];
    const exposure = round2(jitter(fs.baseExposure, 0.18));
    const benchmarkExposure = round2(fs.baseBenchExposure + (rng() - 0.5) * 0.04);
    const activeExposure = round2(exposure - benchmarkExposure);
    const factorReturn = round2(jitter(fs.baseReturn, 0.28));
    const contribution = round4(activeExposure * factorReturn / 100);

    return {
      factor,
      exposure,
      benchmarkExposure,
      activeExposure,
      factorReturn,
      contribution,
    };
  });

  // ── Attribution Summary Totals ──

  const totalAllocation = round4(sectorAttribution.reduce((s, r) => s + r.allocationEffect, 0));
  const totalSelection = round4(sectorAttribution.reduce((s, r) => s + r.selectionEffect, 0));
  const totalInteraction = round4(sectorAttribution.reduce((s, r) => s + r.interactionEffect, 0));

  return {
    performanceSummary,
    sectorAttribution,
    attributionSummary: {
      totalAllocationEffect: totalAllocation,
      totalSelectionEffect: totalSelection,
      totalInteractionEffect: totalInteraction,
      totalActiveReturn: round4(totalAllocation + totalSelection + totalInteraction),
    },
    topContributors,
    bottomContributors,
    factorExposure,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PortfolioAttribution] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate portfolio attribution data' });
  }
});

export default router;
