import { Router } from 'express';

const router = Router();

// ── PRNG ──

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Types ──

type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Extreme';
type Trend = 'Rising' | 'Falling' | 'Stable';
type Signal = 'Warning' | 'Neutral' | 'Favorable';

interface SubIndicator {
  name: string;
  value: number;
  trend: Trend;
  signal: Signal;
}

interface RiskCategory {
  name: string;
  score: number;
  level: RiskLevel;
  change1w: number;
  subIndicators: SubIndicator[];
}

interface CompositeRisk {
  score: number;
  level: RiskLevel;
  change1w: number;
  change1m: number;
}

interface RegionRisk {
  region: string;
  score: number;
  level: RiskLevel;
  topRisk: string;
  change1w: number;
}

interface MacroIndicator {
  name: string;
  currentValue: number;
  unit: string;
  historicalAvg: number;
  zScore: number;
  percentile: number;
  signal: Signal;
}

interface RiskSummary {
  compositeScore: number;
  highestRisk: string;
  lowestRisk: string;
  regionsElevated: number;
  indicatorsWarning: number;
}

interface MacroRiskResponse {
  compositeRisk: CompositeRisk;
  categories: RiskCategory[];
  indicators: MacroIndicator[];
  regions: RegionRisk[];
  summary: RiskSummary;
  timestamp: string;
}

// ── Helpers ──

function toRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'Extreme';
  if (score >= 60) return 'High';
  if (score >= 45) return 'Elevated';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

function toTrend(rng: () => number): Trend {
  const v = rng();
  if (v < 0.35) return 'Rising';
  if (v < 0.65) return 'Stable';
  return 'Falling';
}

function toSignal(value: number, rng: () => number): Signal {
  const noise = (rng() - 0.5) * 10;
  const adjusted = value + noise;
  if (adjusted >= 55) return 'Warning';
  if (adjusted <= 30) return 'Favorable';
  return 'Neutral';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Category Definitions ──

interface CategorySeed {
  name: string;
  baseScore: number;
  subIndicators: { name: string; baseValue: number }[];
}

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    name: 'Geopolitical Risk',
    baseScore: 52,
    subIndicators: [
      { name: 'Active Conflicts', baseValue: 58 },
      { name: 'Sanctions Pressure', baseValue: 50 },
      { name: 'Trade Tensions', baseValue: 48 },
      { name: 'Political Instability', baseValue: 45 },
    ],
  },
  {
    name: 'Financial Stress',
    baseScore: 32,
    subIndicators: [
      { name: 'Credit Spreads', baseValue: 30 },
      { name: 'Volatility Index', baseValue: 35 },
      { name: 'Liquidity Conditions', baseValue: 28 },
      { name: 'Funding Stress', baseValue: 33 },
    ],
  },
  {
    name: 'Economic Slowdown',
    baseScore: 41,
    subIndicators: [
      { name: 'PMI Trends', baseValue: 44 },
      { name: 'Employment Momentum', baseValue: 36 },
      { name: 'Consumer Confidence', baseValue: 42 },
      { name: 'Leading Indicators', baseValue: 40 },
    ],
  },
  {
    name: 'Inflation Risk',
    baseScore: 46,
    subIndicators: [
      { name: 'CPI Momentum', baseValue: 48 },
      { name: 'Wage Growth Pressure', baseValue: 44 },
      { name: 'Commodity Price Index', baseValue: 42 },
      { name: 'Inflation Expectations', baseValue: 50 },
    ],
  },
  {
    name: 'Monetary Policy',
    baseScore: 38,
    subIndicators: [
      { name: 'Rate Expectations', baseValue: 40 },
      { name: 'QT Pace', baseValue: 35 },
      { name: 'Yield Curve Signal', baseValue: 42 },
      { name: 'Central Bank Divergence', baseValue: 36 },
    ],
  },
  {
    name: 'Market Structure',
    baseScore: 34,
    subIndicators: [
      { name: 'Leverage Levels', baseValue: 38 },
      { name: 'Concentration Risk', baseValue: 36 },
      { name: 'Cross-Asset Correlation', baseValue: 30 },
      { name: 'Retail Positioning', baseValue: 28 },
    ],
  },
];

// ── Region Definitions ──

interface RegionSeed {
  region: string;
  baseScore: number;
}

const REGION_SEEDS: RegionSeed[] = [
  { region: 'North America', baseScore: 38 },
  { region: 'Europe', baseScore: 44 },
  { region: 'Asia-Pacific', baseScore: 40 },
  { region: 'Emerging Markets', baseScore: 52 },
  { region: 'Global', baseScore: 43 },
];

// ── Indicator Definitions ──

interface IndicatorSeed {
  name: string;
  baseValue: number;
  unit: string;
  historicalAvg: number;
  volatility: number;
}

const INDICATOR_SEEDS: IndicatorSeed[] = [
  { name: 'VIX', baseValue: 16.8, unit: 'pts', historicalAvg: 19.5, volatility: 3.5 },
  { name: 'MOVE Index', baseValue: 102.5, unit: 'pts', historicalAvg: 95.0, volatility: 15.0 },
  { name: 'TED Spread', baseValue: 0.28, unit: '%', historicalAvg: 0.35, volatility: 0.12 },
  { name: 'US 2s10s Spread', baseValue: -0.18, unit: 'bps', historicalAvg: 0.95, volatility: 0.45 },
  { name: 'DXY', baseValue: 104.2, unit: 'index', historicalAvg: 97.5, volatility: 4.0 },
  { name: 'WTI Crude Oil', baseValue: 78.5, unit: 'USD/bbl', historicalAvg: 65.0, volatility: 12.0 },
  { name: 'Gold', baseValue: 2340.0, unit: 'USD/oz', historicalAvg: 1800.0, volatility: 120.0 },
  { name: 'US IG Spread', baseValue: 95.0, unit: 'bps', historicalAvg: 120.0, volatility: 25.0 },
  { name: 'US HY Spread', baseValue: 340.0, unit: 'bps', historicalAvg: 450.0, volatility: 80.0 },
  { name: 'Global PMI', baseValue: 51.2, unit: 'index', historicalAvg: 52.0, volatility: 2.0 },
  { name: 'US Breakeven 5Y', baseValue: 2.35, unit: '%', historicalAvg: 2.10, volatility: 0.25 },
  { name: 'Fed Funds Futures (Dec)', baseValue: 4.85, unit: '%', historicalAvg: 2.50, volatility: 0.60 },
];

// ── Data Generation ──

function generateCategories(rng: () => number): RiskCategory[] {
  return CATEGORY_SEEDS.map((seed) => {
    const noise = (rng() - 0.5) * 12;
    const score = clamp(Math.round(seed.baseScore + noise), 5, 95);
    const change1w = round2((rng() - 0.48) * 6);

    const subIndicators: SubIndicator[] = seed.subIndicators.map((sub) => {
      const subNoise = (rng() - 0.5) * 14;
      const value = clamp(Math.round(sub.baseValue + subNoise), 5, 95);
      return {
        name: sub.name,
        value,
        trend: toTrend(rng),
        signal: toSignal(value, rng),
      };
    });

    return {
      name: seed.name,
      score,
      level: toRiskLevel(score),
      change1w,
      subIndicators,
    };
  });
}

function generateRegions(rng: () => number, categories: RiskCategory[]): RegionRisk[] {
  return REGION_SEEDS.map((seed) => {
    const noise = (rng() - 0.5) * 10;
    const score = clamp(Math.round(seed.baseScore + noise), 5, 95);
    const change1w = round2((rng() - 0.48) * 5);
    const topIdx = Math.floor(rng() * categories.length);
    const topRisk = categories[topIdx].name;

    return {
      region: seed.region,
      score,
      level: toRiskLevel(score),
      topRisk,
      change1w,
    };
  });
}

function generateIndicators(rng: () => number): MacroIndicator[] {
  return INDICATOR_SEEDS.map((seed) => {
    const noise = (rng() - 0.5) * 2 * seed.volatility * 0.3;
    const currentValue = round2(seed.baseValue + noise);
    const zScore = round2((currentValue - seed.historicalAvg) / seed.volatility);
    const percentile = clamp(Math.round(50 + zScore * 18), 1, 99);

    let signal: Signal;
    if (Math.abs(zScore) > 1.2) {
      signal = zScore > 0 ? 'Warning' : 'Favorable';
    } else {
      signal = 'Neutral';
    }

    return {
      name: seed.name,
      currentValue,
      unit: seed.unit,
      historicalAvg: seed.historicalAvg,
      zScore,
      percentile,
      signal,
    };
  });
}

function generateCompositeRisk(rng: () => number, categories: RiskCategory[]): CompositeRisk {
  const weights = [0.20, 0.18, 0.18, 0.16, 0.14, 0.14];
  let weightedScore = 0;
  for (let i = 0; i < categories.length; i++) {
    weightedScore += categories[i].score * weights[i];
  }
  const score = clamp(Math.round(weightedScore + (rng() - 0.5) * 4), 5, 95);
  const change1w = round2((rng() - 0.48) * 4);
  const change1m = round2((rng() - 0.46) * 8);

  return {
    score,
    level: toRiskLevel(score),
    change1w,
    change1m,
  };
}

function generateSummary(
  compositeRisk: CompositeRisk,
  categories: RiskCategory[],
  regions: RegionRisk[],
  indicators: MacroIndicator[],
): RiskSummary {
  const sorted = [...categories].sort((a, b) => b.score - a.score);
  const highestRisk = sorted[0].name;
  const lowestRisk = sorted[sorted.length - 1].name;
  const regionsElevated = regions.filter(
    (r) => r.level === 'Elevated' || r.level === 'High' || r.level === 'Extreme',
  ).length;
  const indicatorsWarning = indicators.filter((i) => i.signal === 'Warning').length;

  return {
    compositeScore: compositeRisk.score,
    highestRisk,
    lowestRisk,
    regionsElevated,
    indicatorsWarning,
  };
}

function generateMacroRiskData(): MacroRiskResponse {
  const rng = seededRandom('macro-risk');
  const categories = generateCategories(rng);
  const regions = generateRegions(rng, categories);
  const indicators = generateIndicators(rng);
  const compositeRisk = generateCompositeRisk(rng, categories);
  const summary = generateSummary(compositeRisk, categories, regions, indicators);

  return {
    compositeRisk,
    categories,
    indicators,
    regions,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: MacroRiskResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateMacroRiskData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MacroRisk] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate macro risk data' });
  }
});

export default router;
