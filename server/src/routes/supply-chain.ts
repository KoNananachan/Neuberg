import { Router } from 'express';

const router = Router();

// ── In-memory cache (30 min TTL) ──

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30 * 60_000;
function cached<T>(key: string, fn: () => T): T {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  const data = fn();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

// ── Types ──

interface SupplyChainIndicator {
  name: string;
  category: string;
  value: number;
  unit: string;
  change1m: number;
  change3m: number;
  changeYtd: number;
  percentile: number;
  direction: string;
  zScore: number;
  history: number[];
  signal: string | null;
}

interface SupplyChainSector {
  sector: string;
  pressureScore: number;
  trend: string;
  keyIssue: string;
  leadTime: number;
  leadTimeVsNormal: number;
}

interface SupplyChainResponse {
  indicators: SupplyChainIndicator[];
  sectors: SupplyChainSector[];
  compositeIndex: number;
  compositeZScore: number;
  compositeDirection: string;
  timestamp: string;
}

// ── Seed data for indicators ──

interface IndicatorSeed {
  name: string;
  category: string;
  baseValue: number;
  unit: string;
  volatility: number;
  meanValue: number;
  stdDev: number;
  peakValue: number;
}

const INDICATOR_SEEDS: IndicatorSeed[] = [
  {
    name: 'NY Fed GSCPI',
    category: 'composite',
    baseValue: 0.15,
    unit: 'index',
    volatility: 0.08,
    meanValue: 0,
    stdDev: 1.0,
    peakValue: 4.3,
  },
  {
    name: 'Baltic Dry Index',
    category: 'shipping',
    baseValue: 1520,
    unit: '$/day',
    volatility: 80,
    meanValue: 1400,
    stdDev: 450,
    peakValue: 5650,
  },
  {
    name: 'Shanghai Container Freight',
    category: 'shipping',
    baseValue: 1050,
    unit: '$/TEU',
    volatility: 60,
    meanValue: 1000,
    stdDev: 500,
    peakValue: 5100,
  },
  {
    name: 'US ISM Delivery Times',
    category: 'manufacturing',
    baseValue: 49.2,
    unit: 'index',
    volatility: 1.5,
    meanValue: 52,
    stdDev: 6,
    peakValue: 78.8,
  },
  {
    name: 'Eurozone PMI Delivery',
    category: 'manufacturing',
    baseValue: 47.8,
    unit: 'index',
    volatility: 1.2,
    meanValue: 50,
    stdDev: 5.5,
    peakValue: 75.6,
  },
  {
    name: 'China PMI Delivery',
    category: 'manufacturing',
    baseValue: 50.1,
    unit: 'index',
    volatility: 0.8,
    meanValue: 50.5,
    stdDev: 3.0,
    peakValue: 58.2,
  },
  {
    name: 'US Port Congestion',
    category: 'shipping',
    baseValue: 4.2,
    unit: 'days',
    volatility: 0.4,
    meanValue: 3.5,
    stdDev: 2.5,
    peakValue: 16.8,
  },
  {
    name: 'Semiconductor Lead Times',
    category: 'manufacturing',
    baseValue: 12.3,
    unit: 'weeks',
    volatility: 0.6,
    meanValue: 14,
    stdDev: 5,
    peakValue: 26.2,
  },
  {
    name: 'Auto Inventory Days',
    category: 'inventory',
    baseValue: 52,
    unit: 'days',
    volatility: 3,
    meanValue: 60,
    stdDev: 12,
    peakValue: 25,
  },
  {
    name: 'Retail Inventory/Sales',
    category: 'inventory',
    baseValue: 1.26,
    unit: 'ratio',
    volatility: 0.02,
    meanValue: 1.30,
    stdDev: 0.08,
    peakValue: 1.08,
  },
  {
    name: 'Air Freight Rate',
    category: 'freight',
    baseValue: 2.85,
    unit: '$/kg',
    volatility: 0.15,
    meanValue: 2.70,
    stdDev: 0.80,
    peakValue: 6.50,
  },
  {
    name: 'Trucking Rate Index',
    category: 'freight',
    baseValue: 148,
    unit: 'index',
    volatility: 4,
    meanValue: 140,
    stdDev: 20,
    peakValue: 210,
  },
];

// ── Sector seed data ──

interface SectorSeed {
  sector: string;
  basePressure: number;
  baseTrend: string;
  keyIssue: string;
  baseLeadTime: number;
  normalLeadTime: number;
}

const SECTOR_SEEDS: SectorSeed[] = [
  {
    sector: 'Semiconductors',
    basePressure: 42,
    baseTrend: 'improving',
    keyIssue: 'Advanced node capacity normalizing; legacy chips still tight',
    baseLeadTime: 12,
    normalLeadTime: 10,
  },
  {
    sector: 'Autos',
    basePressure: 35,
    baseTrend: 'improving',
    keyIssue: 'Inventory rebuild underway; EV battery supply stabilizing',
    baseLeadTime: 8,
    normalLeadTime: 6,
  },
  {
    sector: 'Consumer Electronics',
    basePressure: 28,
    baseTrend: 'stable',
    keyIssue: 'Component availability normalized; demand softness aiding supply',
    baseLeadTime: 6,
    normalLeadTime: 5,
  },
  {
    sector: 'Apparel',
    basePressure: 22,
    baseTrend: 'stable',
    keyIssue: 'Shipping lanes normalized; inventory levels elevated',
    baseLeadTime: 10,
    normalLeadTime: 9,
  },
  {
    sector: 'Food & Bev',
    basePressure: 38,
    baseTrend: 'worsening',
    keyIssue: 'Climate disruptions affecting agricultural inputs; packaging costs rising',
    baseLeadTime: 5,
    normalLeadTime: 4,
  },
  {
    sector: 'Pharma',
    basePressure: 45,
    baseTrend: 'worsening',
    keyIssue: 'API sourcing from China/India constrained; regulatory delays',
    baseLeadTime: 14,
    normalLeadTime: 10,
  },
  {
    sector: 'Energy',
    basePressure: 32,
    baseTrend: 'stable',
    keyIssue: 'Refining capacity adequate; pipeline constraints in select regions',
    baseLeadTime: 3,
    normalLeadTime: 3,
  },
  {
    sector: 'Metals',
    basePressure: 40,
    baseTrend: 'worsening',
    keyIssue: 'Copper/aluminum supply tight on green transition demand surge',
    baseLeadTime: 7,
    normalLeadTime: 5,
  },
];

// ── Deterministic pseudo-random from seed ──

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ── Generate indicator data ──

function generateIndicators(): SupplyChainIndicator[] {
  const now = Date.now();
  // Shift seed every 30 minutes to match cache TTL
  const timeSeed = Math.floor(now / (30 * 60_000));

  return INDICATOR_SEEDS.map((seed, idx) => {
    const rng = () => seededRandom(timeSeed * 100 + idx * 17 + idx);
    const rng2 = () => seededRandom(timeSeed * 100 + idx * 31 + 7);
    const rng3 = () => seededRandom(timeSeed * 100 + idx * 43 + 13);

    // Current value with some variation
    const variation = (rng() - 0.5) * 2 * seed.volatility;
    const value = Math.round((seed.baseValue + variation) * 100) / 100;

    // Changes
    const change1m = Math.round((rng2() - 0.48) * seed.volatility * 4 * 100) / 100;
    const change3m = Math.round((rng3() - 0.45) * seed.volatility * 8 * 100) / 100;
    const changeYtd = Math.round((seededRandom(timeSeed + idx * 7) - 0.42) * seed.volatility * 15 * 100) / 100;

    // Z-score: how far from mean in standard deviations
    const zScore = Math.round(((value - seed.meanValue) / seed.stdDev) * 100) / 100;

    // Percentile based on z-score (approximate normal CDF)
    const absZ = Math.abs(zScore);
    let percentile: number;
    if (absZ < 0.5) percentile = 50 + zScore * 19;
    else if (absZ < 1) percentile = 50 + Math.sign(zScore) * (10 + absZ * 22);
    else if (absZ < 2) percentile = 50 + Math.sign(zScore) * (32 + (absZ - 1) * 14);
    else percentile = 50 + Math.sign(zScore) * (46 + Math.min((absZ - 2) * 3, 4));
    percentile = Math.round(Math.max(1, Math.min(99, percentile)));

    // For inverted indicators (lower = more stressed), flip percentile
    // Auto Inventory Days and Retail Inventory/Sales: lower = more stress
    const isInverted = seed.name === 'Auto Inventory Days' || seed.name === 'Retail Inventory/Sales';
    const effectivePercentile = isInverted ? 100 - percentile : percentile;

    // Direction
    let direction: string;
    if (change1m < -1.5) direction = 'improving';
    else if (change1m > 1.5) direction = 'worsening';
    else direction = 'stable';

    // For ISM/PMI delivery times: below 50 = improving (suppliers delivering faster)
    if (seed.unit === 'index' && seed.category === 'manufacturing') {
      if (value < 48) direction = 'improving';
      else if (value > 53) direction = 'worsening';
      else direction = 'stable';
    }

    // Signal
    let signal: string | null = null;
    if (effectivePercentile > 85) signal = 'STRESS';
    else if (effectivePercentile > 70) signal = 'BOTTLENECK';
    else if (effectivePercentile < 25) signal = 'EASING';
    else signal = 'NORMAL';

    // History: 24 monthly data points showing post-pandemic normalization
    const history: number[] = [];
    for (let m = 23; m >= 0; m--) {
      const monthSeed = seededRandom(idx * 1000 + m * 37 + timeSeed);
      // Normalize from pandemic peak toward base value
      const peakWeight = Math.max(0, (m - 8) / 16); // Higher months = closer to peak era
      const baseWeight = 1 - peakWeight;
      const monthValue = seed.baseValue * baseWeight + seed.peakValue * peakWeight * 0.3 +
        (monthSeed - 0.5) * seed.volatility * 2;
      history.push(Math.round(monthValue * 100) / 100);
    }

    return {
      name: seed.name,
      category: seed.category,
      value,
      unit: seed.unit,
      change1m,
      change3m,
      changeYtd,
      percentile: effectivePercentile,
      direction,
      zScore,
      history,
      signal,
    };
  });
}

// ── Generate sector data ──

function generateSectors(): SupplyChainSector[] {
  const now = Date.now();
  const timeSeed = Math.floor(now / (30 * 60_000));

  return SECTOR_SEEDS.map((seed, idx) => {
    const rng = seededRandom(timeSeed * 200 + idx * 23);
    const pressureVariation = (rng - 0.5) * 10;
    const pressureScore = Math.round(Math.max(5, Math.min(95, seed.basePressure + pressureVariation)));

    const leadTimeVariation = (seededRandom(timeSeed * 200 + idx * 29) - 0.5) * 2;
    const leadTime = Math.round((seed.baseLeadTime + leadTimeVariation) * 10) / 10;
    const leadTimeVsNormal = Math.round((leadTime / seed.normalLeadTime) * 100) / 100;

    // Re-evaluate trend based on pressure
    let trend = seed.baseTrend;
    if (pressureScore < seed.basePressure - 3) trend = 'improving';
    else if (pressureScore > seed.basePressure + 3) trend = 'worsening';

    return {
      sector: seed.sector,
      pressureScore,
      trend,
      keyIssue: seed.keyIssue,
      leadTime,
      leadTimeVsNormal,
    };
  });
}

// ── Route handler ──

router.get('/', (_req, res) => {
  try {
    const result = cached<SupplyChainResponse>('supply-chain', () => {
      const indicators = generateIndicators();
      const sectors = generateSectors();

      // Composite index: weighted average of indicator percentiles
      const weights: Record<string, number> = {
        composite: 3,
        shipping: 2,
        manufacturing: 2,
        inventory: 1.5,
        freight: 1.5,
      };
      let totalWeight = 0;
      let weightedSum = 0;
      for (const ind of indicators) {
        const w = weights[ind.category] || 1;
        weightedSum += ind.percentile * w;
        totalWeight += w;
      }
      const compositeIndex = Math.round(totalWeight > 0 ? weightedSum / totalWeight : 50);

      // Composite z-score: average of indicator z-scores
      const avgZ = indicators.reduce((s, i) => s + i.zScore, 0) / indicators.length;
      const compositeZScore = Math.round(avgZ * 100) / 100;

      // Composite direction
      const improvingCount = indicators.filter(i => i.direction === 'improving').length;
      const worseningCount = indicators.filter(i => i.direction === 'worsening').length;
      let compositeDirection: string;
      if (improvingCount > worseningCount + 2) compositeDirection = 'improving';
      else if (worseningCount > improvingCount + 2) compositeDirection = 'worsening';
      else compositeDirection = 'stable';

      return {
        indicators,
        sectors,
        compositeIndex,
        compositeZScore,
        compositeDirection,
        timestamp: new Date().toISOString(),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[SupplyChain] Error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch supply chain data' });
  }
});

export default router;
