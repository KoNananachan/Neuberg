import { Router, Request, Response } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── Cache ──

let cache: { data: PortfolioAttributionResponse; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface BrinsonSectorAttribution {
  sector: string;
  portfolioWeight: number;
  benchmarkWeight: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  allocationEffect: number;
  selectionEffect: number;
  interactionEffect: number;
  totalEffect: number;
}

interface FactorAttribution {
  factor: string;
  exposure: number;
  factorReturn: number;
  contribution: number;
  tStat: number;
}

interface RiskDecomposition {
  totalRisk: number;
  systematicRisk: number;
  idiosyncraticRisk: number;
  systematicPct: number;
  idiosyncraticPct: number;
  beta: number;
  rSquared: number;
}

interface PositionContributor {
  ticker: string;
  name: string;
  sector: string;
  weight: number;
  return: number;
  contribution: number;
}

interface PeriodReturn {
  period: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  activeReturn: number;
}

interface PortfolioAttributionResponse {
  benchmark: string;
  asOfDate: string;
  brinsonAttribution: {
    sectors: BrinsonSectorAttribution[];
    totalAllocationEffect: number;
    totalSelectionEffect: number;
    totalInteractionEffect: number;
    totalActiveReturn: number;
  };
  factorAttribution: FactorAttribution[];
  riskDecomposition: RiskDecomposition;
  topContributors: PositionContributor[];
  bottomContributors: PositionContributor[];
  periodReturns: PeriodReturn[];
  trackingError: number;
  informationRatio: number;
  alpha: number;
  generatedAt: string;
}

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

// ── Factor Definitions (7 factors) ──

const FACTOR_DEFS = [
  { name: 'Market',     baseExposure: 1.05,  baseReturn: 1.82, baseTStat: 8.4  },
  { name: 'Size',       baseExposure: -0.14, baseReturn: 0.48, baseTStat: -1.6 },
  { name: 'Value',      baseExposure: -0.22, baseReturn: 0.65, baseTStat: -2.1 },
  { name: 'Momentum',   baseExposure: 0.25,  baseReturn: 1.12, baseTStat: 2.8  },
  { name: 'Quality',    baseExposure: 0.32,  baseReturn: 0.78, baseTStat: 3.2  },
  { name: 'Volatility', baseExposure: -0.18, baseReturn: 0.32, baseTStat: -1.9 },
  { name: 'Liquidity',  baseExposure: 0.10,  baseReturn: 0.22, baseTStat: 1.2  },
] as const;

// ── Top / Bottom Contributor Pools ──

const TOP_POOL = [
  { ticker: 'NVDA',  name: 'NVIDIA Corp',       sector: 'Technology' },
  { ticker: 'MSFT',  name: 'Microsoft Corp',     sector: 'Technology' },
  { ticker: 'AAPL',  name: 'Apple Inc',          sector: 'Technology' },
  { ticker: 'META',  name: 'Meta Platforms',      sector: 'Communication Services' },
  { ticker: 'AMZN',  name: 'Amazon.com Inc',      sector: 'Consumer Discretionary' },
  { ticker: 'LLY',   name: 'Eli Lilly & Co',      sector: 'Healthcare' },
  { ticker: 'JPM',   name: 'JPMorgan Chase',      sector: 'Financials' },
  { ticker: 'GOOGL', name: 'Alphabet Inc',        sector: 'Communication Services' },
  { ticker: 'AVGO',  name: 'Broadcom Inc',        sector: 'Technology' },
  { ticker: 'GE',    name: 'GE Aerospace',        sector: 'Industrials' },
];

const BOTTOM_POOL = [
  { ticker: 'INTC', name: 'Intel Corp',               sector: 'Technology' },
  { ticker: 'BA',   name: 'Boeing Co',                sector: 'Industrials' },
  { ticker: 'PFE',  name: 'Pfizer Inc',               sector: 'Healthcare' },
  { ticker: 'NKE',  name: 'Nike Inc',                 sector: 'Consumer Discretionary' },
  { ticker: 'DIS',  name: 'Walt Disney Co',           sector: 'Communication Services' },
  { ticker: 'VZ',   name: 'Verizon Communications',   sector: 'Communication Services' },
  { ticker: 'KHC',  name: 'Kraft Heinz Co',           sector: 'Consumer Staples' },
  { ticker: 'WBA',  name: 'Walgreens Boots Alliance', sector: 'Healthcare' },
  { ticker: 'DVN',  name: 'Devon Energy',             sector: 'Energy' },
  { ticker: 'PARA', name: 'Paramount Global',         sector: 'Communication Services' },
];

// ── Period Return Seeds ──

const PERIOD_DEFS = [
  { period: 'MTD', basePort: 1.25, baseBench: 1.08 },
  { period: 'QTD', basePort: 3.82, baseBench: 3.45 },
  { period: 'YTD', basePort: 8.65, baseBench: 7.32 },
  { period: '1Y',  basePort: 14.20, baseBench: 12.85 },
  { period: '3Y',  basePort: 32.50, baseBench: 28.40 },
  { period: '5Y',  basePort: 58.75, baseBench: 52.10 },
] as const;

// ── Generator ──

function generate(): PortfolioAttributionResponse {
  const dateKey = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('portfolio-attribution-v2-' + dateKey);
  const rng = mulberry32(seed);

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // ── Brinson-Fachler Sector Attribution ──

  const rawPortWeights = SECTOR_SEEDS.map(s => jitter(s.basePortWeight, 0.12));
  const portWeightSum = rawPortWeights.reduce((a, b) => a + b, 0);
  const rawBenchWeights = SECTOR_SEEDS.map(s => jitter(s.baseBenchWeight, 0.08));
  const benchWeightSum = rawBenchWeights.reduce((a, b) => a + b, 0);

  // Total benchmark return for allocation effect
  const totalBenchReturn = round2(jitter(7.32, 0.15) / 12);

  const sectors: BrinsonSectorAttribution[] = GICS_SECTORS.map((sector, i) => {
    const portfolioWeight = round2((rawPortWeights[i] / portWeightSum) * 100);
    const benchmarkWeight = round2((rawBenchWeights[i] / benchWeightSum) * 100);
    const portfolioReturn = round2(jitter(SECTOR_SEEDS[i].basePortReturn, 0.28));
    const benchmarkReturn = round2(jitter(SECTOR_SEEDS[i].baseBenchReturn, 0.22));

    // Brinson-Fachler decomposition
    const activeWeight = round4((portfolioWeight - benchmarkWeight) / 100);
    const allocationEffect = round4(activeWeight * (benchmarkReturn - totalBenchReturn));
    const selectionEffect = round4((benchmarkWeight / 100) * (portfolioReturn - benchmarkReturn));
    const interactionEffect = round4(activeWeight * (portfolioReturn - benchmarkReturn));
    const totalEffect = round4(allocationEffect + selectionEffect + interactionEffect);

    return {
      sector,
      portfolioWeight,
      benchmarkWeight,
      portfolioReturn,
      benchmarkReturn,
      allocationEffect,
      selectionEffect,
      interactionEffect,
      totalEffect,
    };
  });

  const totalAllocationEffect = round4(sectors.reduce((s, r) => s + r.allocationEffect, 0));
  const totalSelectionEffect = round4(sectors.reduce((s, r) => s + r.selectionEffect, 0));
  const totalInteractionEffect = round4(sectors.reduce((s, r) => s + r.interactionEffect, 0));
  const totalActiveReturn = round4(totalAllocationEffect + totalSelectionEffect + totalInteractionEffect);

  // ── Factor Attribution (7 factors) ──

  const factorAttribution: FactorAttribution[] = FACTOR_DEFS.map(def => {
    const exposure = round2(jitter(def.baseExposure, 0.18));
    const factorReturn = round2(jitter(def.baseReturn, 0.28));
    const contribution = round4(exposure * factorReturn / 100);
    const tStat = round2(jitter(def.baseTStat, 0.20));

    return {
      factor: def.name,
      exposure,
      factorReturn,
      contribution,
      tStat,
    };
  });

  // ── Risk Decomposition ──

  const totalRisk = round2(jitter(14.8, 0.15));
  const rSquared = round4(0.88 + rng() * 0.10);
  const systematicPct = round2(rSquared * 100);
  const idiosyncraticPct = round2(100 - systematicPct);
  const systematicRisk = round2(totalRisk * Math.sqrt(rSquared));
  const idiosyncraticRisk = round2(totalRisk * Math.sqrt(1 - rSquared));
  const beta = round4(jitter(1.05, 0.10));

  const riskDecomposition: RiskDecomposition = {
    totalRisk,
    systematicRisk,
    idiosyncraticRisk,
    systematicPct,
    idiosyncraticPct,
    beta,
    rSquared,
  };

  // ── Top / Bottom Contributors ──

  const shufflePool = <T>(arr: readonly T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const topContributors: PositionContributor[] = shufflePool(TOP_POOL)
    .slice(0, 5)
    .map((stock, i) => {
      const weight = round2(1.8 + rng() * 5.0);
      const stockReturn = round2(6.0 + rng() * 28.0);
      const contribution = round2((40 - i * 6) * (0.8 + rng() * 0.4));
      return {
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector,
        weight,
        return: stockReturn,
        contribution,
      };
    })
    .sort((a, b) => b.contribution - a.contribution);

  const bottomContributors: PositionContributor[] = shufflePool(BOTTOM_POOL)
    .slice(0, 5)
    .map((stock, i) => {
      const weight = round2(0.3 + rng() * 2.2);
      const stockReturn = round2(-28.0 + rng() * 16.0);
      const contribution = round2((-35 + i * 5) * (0.8 + rng() * 0.4));
      return {
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector,
        weight,
        return: stockReturn,
        contribution,
      };
    })
    .sort((a, b) => a.contribution - b.contribution);

  // ── Period Returns ──

  const periodReturns: PeriodReturn[] = PERIOD_DEFS.map(def => {
    const portfolioReturn = round2(jitter(def.basePort, 0.22));
    const benchmarkReturn = round2(jitter(def.baseBench, 0.18));
    const activeReturn = round2(portfolioReturn - benchmarkReturn);
    return {
      period: def.period,
      portfolioReturn,
      benchmarkReturn,
      activeReturn,
    };
  });

  // ── Portfolio-Level Metrics ──

  const trackingError = round2(1.6 + rng() * 1.5);
  const ytdActive = periodReturns.find(p => p.period === 'YTD')?.activeReturn ?? totalActiveReturn;
  const informationRatio = round2(ytdActive / trackingError);
  const alpha = round2(jitter(1.35, 0.30));

  return {
    benchmark: 'S&P 500',
    asOfDate: dateKey,
    brinsonAttribution: {
      sectors,
      totalAllocationEffect,
      totalSelectionEffect,
      totalInteractionEffect,
      totalActiveReturn,
    },
    factorAttribution,
    riskDecomposition,
    topContributors,
    bottomContributors,
    periodReturns,
    trackingError,
    informationRatio,
    alpha,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PortfolioAttribution] Error:', message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(502).json({ error: 'Failed to generate portfolio attribution data' });
  }
});

export default router;
