import { Router } from 'express';

const router = Router();

// ── Types ──

interface SectorAttribution {
  sector: string;
  weight: number;
  benchmarkWeight: number;
  activeWeight: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  allocationEffect: number;
  selectionEffect: number;
  interactionEffect: number;
  totalEffect: number;
  topContributor: string;
  topDetractor: string;
}

interface FactorAttribution {
  factor: string;
  exposure: number;
  factorReturn: number;
  contribution: number;
  tStat: number;
}

interface PeriodReturn {
  period: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  activeReturn: number;
  trackingError: number;
  informationRatio: number;
}

interface AttributionResponse {
  benchmark: string;
  sectors: SectorAttribution[];
  factors: FactorAttribution[];
  periods: PeriodReturn[];
  summary: {
    totalActiveReturn: number;
    allocationTotal: number;
    selectionTotal: number;
    interactionTotal: number;
    sharpeRatio: number;
    beta: number;
    alpha: number;
    r2: number;
    maxDrawdown: number;
    winRate: number;
  };
  cumulativeReturns: { date: string; portfolio: number; benchmark: number }[];
  timestamp: string;
}

// ── Sector Definitions ──

interface SectorSeed {
  sector: string;
  weightRange: [number, number];
  benchmarkWeight: number;
  topStocks: { contributor: string; detractor: string };
}

const SECTOR_SEEDS: SectorSeed[] = [
  { sector: 'Technology', weightRange: [0.28, 0.36], benchmarkWeight: 0.295, topStocks: { contributor: 'NVDA', detractor: 'INTC' } },
  { sector: 'Healthcare', weightRange: [0.10, 0.14], benchmarkWeight: 0.125, topStocks: { contributor: 'LLY', detractor: 'PFE' } },
  { sector: 'Financials', weightRange: [0.10, 0.14], benchmarkWeight: 0.13, topStocks: { contributor: 'JPM', detractor: 'SCHW' } },
  { sector: 'Consumer Discretionary', weightRange: [0.08, 0.12], benchmarkWeight: 0.105, topStocks: { contributor: 'AMZN', detractor: 'NKE' } },
  { sector: 'Communication Services', weightRange: [0.06, 0.10], benchmarkWeight: 0.09, topStocks: { contributor: 'META', detractor: 'PARA' } },
  { sector: 'Industrials', weightRange: [0.06, 0.10], benchmarkWeight: 0.085, topStocks: { contributor: 'GE', detractor: 'BA' } },
  { sector: 'Consumer Staples', weightRange: [0.04, 0.07], benchmarkWeight: 0.06, topStocks: { contributor: 'COST', detractor: 'KHC' } },
  { sector: 'Energy', weightRange: [0.03, 0.06], benchmarkWeight: 0.04, topStocks: { contributor: 'XOM', detractor: 'DVN' } },
  { sector: 'Utilities', weightRange: [0.02, 0.04], benchmarkWeight: 0.025, topStocks: { contributor: 'NEE', detractor: 'EXC' } },
  { sector: 'Real Estate', weightRange: [0.01, 0.03], benchmarkWeight: 0.025, topStocks: { contributor: 'PLD', detractor: 'VNO' } },
  { sector: 'Materials', weightRange: [0.01, 0.03], benchmarkWeight: 0.02, topStocks: { contributor: 'LIN', detractor: 'FCX' } },
];

// ── Factor Definitions ──

const FACTOR_SEEDS = [
  { factor: 'Market', exposureRange: [0.95, 1.15], returnRange: [-0.02, 0.03] },
  { factor: 'Size', exposureRange: [-0.20, 0.30], returnRange: [-0.015, 0.015] },
  { factor: 'Value', exposureRange: [-0.35, 0.15], returnRange: [-0.01, 0.02] },
  { factor: 'Momentum', exposureRange: [0.05, 0.40], returnRange: [-0.015, 0.025] },
  { factor: 'Quality', exposureRange: [0.10, 0.45], returnRange: [-0.01, 0.02] },
  { factor: 'Low Vol', exposureRange: [-0.30, 0.10], returnRange: [-0.01, 0.015] },
  { factor: 'Growth', exposureRange: [0.05, 0.35], returnRange: [-0.02, 0.025] },
];

// ── Helpers ──

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function round(n: number, decimals = 4): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function seededNoise(base: number, amplitude: number): number {
  return base + (Math.random() - 0.5) * 2 * amplitude;
}

// ── Data Generation ──

function generateSectorAttribution(benchmark: string): SectorAttribution[] {
  // Generate raw weights, then normalize to sum to 1.0
  const rawWeights = SECTOR_SEEDS.map(s => rand(s.weightRange[0], s.weightRange[1]));
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = rawWeights.map(w => w / weightSum);

  return SECTOR_SEEDS.map((seed, i) => {
    const weight = round(normalizedWeights[i]);
    const benchmarkWeight = seed.benchmarkWeight;
    const activeWeight = round(weight - benchmarkWeight);

    // Generate realistic returns
    const portfolioReturn = round(rand(-0.03, 0.06));
    const benchmarkReturn = round(rand(-0.025, 0.05));

    // Brinson attribution decomposition
    // Allocation effect = (w_p - w_b) * (R_b_sector - R_b_total)
    // Selection effect = w_b * (R_p_sector - R_b_sector)
    // Interaction effect = (w_p - w_b) * (R_p_sector - R_b_sector)
    const benchmarkTotalReturn = rand(-0.01, 0.03);
    const allocationEffect = round(activeWeight * (benchmarkReturn - benchmarkTotalReturn));
    const selectionEffect = round(benchmarkWeight * (portfolioReturn - benchmarkReturn));
    const interactionEffect = round(activeWeight * (portfolioReturn - benchmarkReturn));
    const totalEffect = round(allocationEffect + selectionEffect + interactionEffect);

    const contribPct = round(rand(0.5, 4.5), 1);
    const detractPct = round(rand(-2.5, -0.2), 1);

    return {
      sector: seed.sector,
      weight,
      benchmarkWeight,
      activeWeight,
      portfolioReturn,
      benchmarkReturn,
      allocationEffect,
      selectionEffect,
      interactionEffect,
      totalEffect,
      topContributor: `${seed.topStocks.contributor} +${contribPct}%`,
      topDetractor: `${seed.topStocks.detractor} ${detractPct}%`,
    };
  });
}

function generateFactorAttribution(): FactorAttribution[] {
  return FACTOR_SEEDS.map(seed => {
    const exposure = round(rand(seed.exposureRange[0], seed.exposureRange[1]), 2);
    const factorReturn = round(rand(seed.returnRange[0], seed.returnRange[1]));
    const contribution = round(exposure * factorReturn);
    // t-stat: higher absolute exposure and return => more significant
    const tStat = round(seededNoise(Math.abs(exposure * factorReturn) * 40, 0.8), 2);

    return {
      factor: seed.factor,
      exposure,
      factorReturn,
      contribution,
      tStat,
    };
  });
}

function generatePeriodReturns(): PeriodReturn[] {
  const periods = ['1D', '1W', 'MTD', '1M', '3M', '6M', 'YTD', '1Y'];
  const scales = [0.3, 0.7, 1.0, 1.2, 2.5, 4.0, 5.0, 10.0];

  return periods.map((period, i) => {
    const scale = scales[i] / 100;
    const portfolioReturn = round(rand(-scale * 3, scale * 5));
    const benchmarkReturn = round(rand(-scale * 3, scale * 5));
    const activeReturn = round(portfolioReturn - benchmarkReturn);
    const trackingError = round(Math.abs(seededNoise(scale * 0.8, scale * 0.3)));
    const informationRatio = trackingError > 0 ? round(activeReturn / trackingError, 2) : 0;

    return {
      period,
      portfolioReturn,
      benchmarkReturn,
      activeReturn,
      trackingError,
      informationRatio,
    };
  });
}

function generateCumulativeReturns(): { date: string; portfolio: number; benchmark: number }[] {
  const points: { date: string; portfolio: number; benchmark: number }[] = [];
  const now = new Date();
  let portCum = 0;
  let bmkCum = 0;

  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    const day = d.getDay();
    if (day === 0 || day === 6) continue;

    const portDaily = seededNoise(0.0004, 0.012);
    const bmkDaily = seededNoise(0.0003, 0.010);
    portCum += portDaily;
    bmkCum += bmkDaily;

    points.push({
      date: d.toISOString().split('T')[0],
      portfolio: round(portCum * 100, 2),
      benchmark: round(bmkCum * 100, 2),
    });
  }

  return points.slice(-60);
}

function generateAttributionData(benchmark: string): AttributionResponse {
  const sectors = generateSectorAttribution(benchmark);
  const factors = generateFactorAttribution();
  const periods = generatePeriodReturns();
  const cumulativeReturns = generateCumulativeReturns();

  const allocationTotal = round(sectors.reduce((s, sec) => s + sec.allocationEffect, 0));
  const selectionTotal = round(sectors.reduce((s, sec) => s + sec.selectionEffect, 0));
  const interactionTotal = round(sectors.reduce((s, sec) => s + sec.interactionEffect, 0));
  const totalActiveReturn = round(allocationTotal + selectionTotal + interactionTotal);

  const ytdPeriod = periods.find(p => p.period === 'YTD');

  return {
    benchmark,
    sectors,
    factors,
    periods,
    summary: {
      totalActiveReturn,
      allocationTotal,
      selectionTotal,
      interactionTotal,
      sharpeRatio: round(rand(0.3, 2.2), 2),
      beta: round(rand(0.85, 1.20), 2),
      alpha: round(rand(-0.02, 0.04)),
      r2: round(rand(0.88, 0.98), 2),
      maxDrawdown: round(rand(-0.15, -0.03)),
      winRate: round(rand(0.48, 0.62), 2),
    },
    cumulativeReturns,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache ──

interface CacheEntry {
  data: AttributionResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const VALID_BENCHMARKS = new Set(['SPY', 'QQQ', 'DIA', 'IWM']);

// ── Route ──

// GET /api/performance-attribution?benchmark=SPY
router.get('/', (_req, res) => {
  try {
    const benchmark = (typeof _req.query.benchmark === 'string' ? _req.query.benchmark : 'SPY').toUpperCase();

    if (!VALID_BENCHMARKS.has(benchmark)) {
      return res.status(400).json({ error: `Invalid benchmark. Supported: ${Array.from(VALID_BENCHMARKS).join(', ')}` });
    }

    const now = Date.now();
    const cached = cache.get(benchmark);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    const data = generateAttributionData(benchmark);
    cache.set(benchmark, { data, expiresAt: now + CACHE_TTL });
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PerformanceAttribution] Error:', message);
    res.status(500).json({ error: 'Failed to generate performance attribution data' });
  }
});

export default router;
