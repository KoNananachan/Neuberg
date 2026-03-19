import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Types ──

interface ModelEstimate {
  model: string;
  probability: number;
  signal: 'expansion' | 'neutral' | 'caution' | 'warning' | 'recession';
}

interface LeadingIndicator {
  name: string;
  value: number;
  threshold: number;
  signal: 'positive' | 'neutral' | 'negative';
  description: string;
}

interface HistoricalReading {
  month: string;
  probability: number;
}

interface EconomyRecessionData {
  country: string;
  code: string;
  probability12m: number;
  probability6m: number;
  probability3m: number;
  previousMonth: number;
  trend: 'rising' | 'falling' | 'stable';
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high';
  models: ModelEstimate[];
  leadingIndicators: LeadingIndicator[];
  historicalProbability: HistoricalReading[];
}

interface GlobalRiskDashboard {
  overallRisk: 'low' | 'moderate' | 'elevated' | 'high';
  keyRisks: string[];
  positiveFactors: string[];
}

interface YieldCurveMonitor {
  spread10y2y: number;
  spread10y3m: number;
  isInverted: boolean;
  monthsInverted: number;
  historicalAccuracy: number;
}

interface RecessionProbabilityResponse {
  economies: EconomyRecessionData[];
  globalRiskDashboard: GlobalRiskDashboard;
  yieldCurveMonitor: YieldCurveMonitor;
  lastUpdated: string;
}

// ── Economy Seeds (realistic 2026 base values) ──

interface EconomySeed {
  country: string;
  code: string;
  base12m: number;
  base6m: number;
  base3m: number;
  basePrev: number;
  yieldCurveBase: number;
  creditSpreadBase: number;
  leadingIndicatorsBase: number;
  pmiBase: number;
  laborBase: number;
  financialCondBase: number;
  indicators: {
    spread10y2y: number;
    initialClaims: number;
    ismNewOrders: number;
    consumerConf: number;
    buildingPermits: number;
    stockReturn6m: number;
  };
}

const ECONOMY_SEEDS: EconomySeed[] = [
  {
    country: 'United States', code: 'US',
    base12m: 25, base6m: 15, base3m: 8,
    basePrev: 23,
    yieldCurveBase: 28, creditSpreadBase: 22, leadingIndicatorsBase: 24,
    pmiBase: 20, laborBase: 18, financialCondBase: 22,
    indicators: {
      spread10y2y: 0.15, initialClaims: 225000, ismNewOrders: 51.2,
      consumerConf: 98.5, buildingPermits: 1420, stockReturn6m: 4.2,
    },
  },
  {
    country: 'Eurozone', code: 'EZ',
    base12m: 32, base6m: 20, base3m: 12,
    basePrev: 30,
    yieldCurveBase: 35, creditSpreadBase: 30, leadingIndicatorsBase: 33,
    pmiBase: 34, laborBase: 25, financialCondBase: 28,
    indicators: {
      spread10y2y: 0.08, initialClaims: 0, ismNewOrders: 48.8,
      consumerConf: -8.2, buildingPermits: 0, stockReturn6m: 2.1,
    },
  },
  {
    country: 'United Kingdom', code: 'GB',
    base12m: 28, base6m: 17, base3m: 10,
    basePrev: 26,
    yieldCurveBase: 30, creditSpreadBase: 26, leadingIndicatorsBase: 28,
    pmiBase: 27, laborBase: 24, financialCondBase: 25,
    indicators: {
      spread10y2y: 0.12, initialClaims: 32000, ismNewOrders: 49.5,
      consumerConf: -12.5, buildingPermits: 28500, stockReturn6m: 3.0,
    },
  },
  {
    country: 'Japan', code: 'JP',
    base12m: 22, base6m: 13, base3m: 7,
    basePrev: 24,
    yieldCurveBase: 20, creditSpreadBase: 18, leadingIndicatorsBase: 22,
    pmiBase: 24, laborBase: 15, financialCondBase: 20,
    indicators: {
      spread10y2y: 0.42, initialClaims: 0, ismNewOrders: 50.1,
      consumerConf: 36.8, buildingPermits: 72000, stockReturn6m: 5.5,
    },
  },
  {
    country: 'China', code: 'CN',
    base12m: 18, base6m: 10, base3m: 5,
    basePrev: 20,
    yieldCurveBase: 15, creditSpreadBase: 22, leadingIndicatorsBase: 18,
    pmiBase: 16, laborBase: 20, financialCondBase: 14,
    indicators: {
      spread10y2y: 0.55, initialClaims: 0, ismNewOrders: 50.8,
      consumerConf: 88.5, buildingPermits: 0, stockReturn6m: -1.2,
    },
  },
  {
    country: 'Global', code: 'GL',
    base12m: 24, base6m: 14, base3m: 8,
    basePrev: 22,
    yieldCurveBase: 25, creditSpreadBase: 23, leadingIndicatorsBase: 24,
    pmiBase: 22, laborBase: 20, financialCondBase: 21,
    indicators: {
      spread10y2y: 0.22, initialClaims: 0, ismNewOrders: 50.5,
      consumerConf: 55.0, buildingPermits: 0, stockReturn6m: 3.5,
    },
  },
];

// ── Key risks & positive factors pools ──

const KEY_RISKS_POOL = [
  'Persistent core inflation above central bank targets',
  'Yield curve inversion signaling credit tightening',
  'Commercial real estate valuations under stress',
  'Elevated corporate debt refinancing risk in 2026-2027',
  'Geopolitical supply chain disruptions',
  'Consumer savings drawdown reaching pre-pandemic levels',
  'Banking sector unrealized losses on bond portfolios',
  'Labor market cooling faster than expected',
  'Manufacturing PMI contraction in major economies',
  'Credit conditions tightening across developed markets',
  'Sovereign debt sustainability concerns in peripheral Europe',
  'China property sector spillover to global demand',
];

const POSITIVE_FACTORS_POOL = [
  'Central banks pivoting toward rate cuts',
  'Resilient labor markets in US and Japan',
  'AI-driven productivity gains supporting corporate margins',
  'Fiscal stimulus measures in China stabilizing growth',
  'Consumer spending holding above recessionary thresholds',
  'Corporate earnings growth remaining positive',
  'Global trade volumes recovering from 2025 lows',
  'Infrastructure investment programs boosting demand',
  'Energy price normalization reducing input costs',
  'Financial system liquidity adequate despite QT',
];

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getSignalFromProbability(p: number): ModelEstimate['signal'] {
  if (p < 15) return 'expansion';
  if (p < 25) return 'neutral';
  if (p < 40) return 'caution';
  if (p < 60) return 'warning';
  return 'recession';
}

function getRiskLevel(p12m: number): EconomyRecessionData['riskLevel'] {
  if (p12m < 20) return 'low';
  if (p12m < 35) return 'moderate';
  if (p12m < 50) return 'elevated';
  return 'high';
}

function getTrend(current: number, previous: number): EconomyRecessionData['trend'] {
  const diff = current - previous;
  if (diff > 2) return 'rising';
  if (diff < -2) return 'falling';
  return 'stable';
}

function getIndicatorSignal(value: number, threshold: number, higherIsBetter: boolean): LeadingIndicator['signal'] {
  if (higherIsBetter) {
    if (value > threshold * 1.05) return 'positive';
    if (value < threshold * 0.95) return 'negative';
    return 'neutral';
  }
  if (value < threshold * 0.95) return 'positive';
  if (value > threshold * 1.05) return 'negative';
  return 'neutral';
}

// ── Data Generation ──

function generateModels(seed: EconomySeed, rng: () => number): ModelEstimate[] {
  const vary = (base: number) => clamp(roundTo(base + (rng() - 0.5) * 12, 1), 2, 85);

  const models: ModelEstimate[] = [
    { model: 'Yield Curve', probability: vary(seed.yieldCurveBase), signal: 'neutral' },
    { model: 'Credit Spreads', probability: vary(seed.creditSpreadBase), signal: 'neutral' },
    { model: 'Leading Indicators', probability: vary(seed.leadingIndicatorsBase), signal: 'neutral' },
    { model: 'PMI Composite', probability: vary(seed.pmiBase), signal: 'neutral' },
    { model: 'Labor Market', probability: vary(seed.laborBase), signal: 'neutral' },
    { model: 'Financial Conditions', probability: vary(seed.financialCondBase), signal: 'neutral' },
  ];

  return models.map((m) => ({
    ...m,
    signal: getSignalFromProbability(m.probability),
  }));
}

function generateLeadingIndicators(seed: EconomySeed, rng: () => number): LeadingIndicator[] {
  const ind = seed.indicators;
  const indicators: LeadingIndicator[] = [];

  // 10Y-2Y Spread (bps)
  const spread = roundTo(ind.spread10y2y + (rng() - 0.5) * 0.3, 2);
  indicators.push({
    name: '10Y-2Y Spread',
    value: roundTo(spread * 100, 1),
    threshold: 0,
    signal: spread > 0 ? 'positive' : 'negative',
    description: spread > 0
      ? 'Yield curve is positively sloped, historically associated with expansion'
      : 'Yield curve inversion signals elevated recession risk in 12-18 months',
  });

  // Initial Claims 4wk MA (US/UK specific; others get placeholder)
  if (ind.initialClaims > 0) {
    const claims = Math.round(ind.initialClaims + (rng() - 0.5) * 20000);
    indicators.push({
      name: 'Initial Claims 4wk MA',
      value: claims,
      threshold: 260000,
      signal: getIndicatorSignal(claims, 260000, false),
      description: claims < 260000
        ? 'Jobless claims below recessionary threshold, labor market resilient'
        : 'Rising claims approaching levels consistent with economic contraction',
    });
  }

  // ISM/PMI New Orders
  const newOrders = roundTo(ind.ismNewOrders + (rng() - 0.5) * 3, 1);
  indicators.push({
    name: 'ISM New Orders',
    value: newOrders,
    threshold: 50,
    signal: getIndicatorSignal(newOrders, 50, true),
    description: newOrders >= 50
      ? 'New orders in expansion territory, supporting near-term growth'
      : 'New orders contracting, signaling weakening demand pipeline',
  });

  // Consumer Confidence
  const consConf = roundTo(ind.consumerConf + (rng() - 0.5) * 8, 1);
  const confThreshold = seed.code === 'EZ' || seed.code === 'GB' ? -15 : 80;
  indicators.push({
    name: 'Consumer Confidence',
    value: consConf,
    threshold: confThreshold,
    signal: getIndicatorSignal(consConf, confThreshold, true),
    description: consConf > confThreshold
      ? 'Consumer sentiment above recessionary levels, spending likely sustained'
      : 'Consumer confidence weakening, risk of spending pullback increasing',
  });

  // Building Permits (where applicable)
  if (ind.buildingPermits > 0) {
    const permits = Math.round(ind.buildingPermits + (rng() - 0.5) * ind.buildingPermits * 0.08);
    const permitThreshold = seed.code === 'US' ? 1300 : seed.code === 'JP' ? 65000 : 25000;
    indicators.push({
      name: 'Building Permits',
      value: permits,
      threshold: permitThreshold,
      signal: getIndicatorSignal(permits, permitThreshold, true),
      description: permits > permitThreshold
        ? 'Housing activity above contraction threshold, construction supporting GDP'
        : 'Building permits declining, housing sector weakness may weigh on growth',
    });
  }

  // Stock Market 6m Return
  const stockReturn = roundTo(ind.stockReturn6m + (rng() - 0.5) * 6, 1);
  indicators.push({
    name: 'Stock Market 6m Return',
    value: stockReturn,
    threshold: 0,
    signal: stockReturn > 5 ? 'positive' : stockReturn > -5 ? 'neutral' : 'negative',
    description: stockReturn > 0
      ? 'Equity markets pricing in continued expansion'
      : 'Equity market weakness reflecting deteriorating growth expectations',
  });

  return indicators;
}

function generateHistoricalProbability(base12m: number, rng: () => number): HistoricalReading[] {
  const readings: HistoricalReading[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7);
    // Generate a plausible trajectory toward current value
    const drift = (11 - i) / 11;
    const startVal = base12m + (rng() - 0.5) * 10;
    const prob = clamp(
      roundTo(startVal + (base12m - startVal) * drift + (rng() - 0.5) * 4, 1),
      3,
      80,
    );
    readings.push({ month, probability: prob });
  }

  return readings;
}

function generateEconomyData(seed: EconomySeed, rng: () => number): EconomyRecessionData {
  const probability12m = clamp(roundTo(seed.base12m + (rng() - 0.5) * 10, 1), 5, 75);
  const probability6m = clamp(roundTo(seed.base6m + (rng() - 0.5) * 8, 1), 2, 60);
  const probability3m = clamp(roundTo(seed.base3m + (rng() - 0.5) * 6, 1), 1, 45);
  const previousMonth = clamp(roundTo(seed.basePrev + (rng() - 0.5) * 8, 1), 5, 70);

  return {
    country: seed.country,
    code: seed.code,
    probability12m,
    probability6m,
    probability3m,
    previousMonth,
    trend: getTrend(probability12m, previousMonth),
    riskLevel: getRiskLevel(probability12m),
    models: generateModels(seed, rng),
    leadingIndicators: generateLeadingIndicators(seed, rng),
    historicalProbability: generateHistoricalProbability(probability12m, rng),
  };
}

function generateGlobalRiskDashboard(
  economies: EconomyRecessionData[],
  rng: () => number,
): GlobalRiskDashboard {
  const avgProb = economies.reduce((s, e) => s + e.probability12m, 0) / economies.length;

  let overallRisk: GlobalRiskDashboard['overallRisk'];
  if (avgProb < 20) overallRisk = 'low';
  else if (avgProb < 30) overallRisk = 'moderate';
  else if (avgProb < 45) overallRisk = 'elevated';
  else overallRisk = 'high';

  // Pick 4-5 key risks
  const shuffledRisks = [...KEY_RISKS_POOL];
  for (let i = shuffledRisks.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledRisks[i], shuffledRisks[j]] = [shuffledRisks[j], shuffledRisks[i]];
  }
  const numRisks = 4 + Math.floor(rng() * 2);
  const keyRisks = shuffledRisks.slice(0, numRisks);

  // Pick 3-4 positive factors
  const shuffledPositive = [...POSITIVE_FACTORS_POOL];
  for (let i = shuffledPositive.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledPositive[i], shuffledPositive[j]] = [shuffledPositive[j], shuffledPositive[i]];
  }
  const numPositive = 3 + Math.floor(rng() * 2);
  const positiveFactors = shuffledPositive.slice(0, numPositive);

  return { overallRisk, keyRisks, positiveFactors };
}

function generateYieldCurveMonitor(rng: () => number): YieldCurveMonitor {
  const spread10y2y = roundTo(0.15 + (rng() - 0.5) * 0.4, 2);
  const spread10y3m = roundTo(spread10y2y - 0.12 + (rng() - 0.5) * 0.2, 2);
  const isInverted = spread10y2y < 0 || spread10y3m < 0;
  const monthsInverted = isInverted ? Math.floor(1 + rng() * 8) : 0;

  return {
    spread10y2y: roundTo(spread10y2y * 100, 1), // in bps
    spread10y3m: roundTo(spread10y3m * 100, 1),
    isInverted,
    monthsInverted,
    historicalAccuracy: roundTo(78 + rng() * 10, 1), // 78-88%
  };
}

function generate(): RecessionProbabilityResponse {
  const rng = seededRandom('recession-probability');

  const economies = ECONOMY_SEEDS.map((seed) => generateEconomyData(seed, rng));
  const globalRiskDashboard = generateGlobalRiskDashboard(economies, rng);
  const yieldCurveMonitor = generateYieldCurveMonitor(rng);

  return {
    economies,
    globalRiskDashboard,
    yieldCurveMonitor,
    lastUpdated: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: RecessionProbabilityResponse | null; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RecessionProbability] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate recession probability data' });
  }
});

export default router;
