import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface Strategy {
  name: string;
  ticker: string;
  aum: number;
  return1M: number;
  return3M: number;
  returnYTD: number;
  returnVsBenchmark: number;
  trackingError: number;
  infoRatio: number;
  sharpe: number;
  maxDrawdown: number;
  factorLoading: number;
}

interface FactorExposure {
  factor: 'Value' | 'Momentum' | 'Quality' | 'Size' | 'Low Vol' | 'Yield';
  currentPremium: number;
  historicalAvg: number;
  zScore: number;
  crowding: 'low' | 'moderate' | 'high' | 'extreme';
  signal: 'overweight' | 'neutral' | 'underweight';
}

interface FlowData {
  category: string;
  flows1M: number;
  flows3M: number;
  flowsMomentum: 'accelerating' | 'stable' | 'decelerating';
  totalAUM: number;
}

interface PerformanceAttribution {
  alphaVsSPX: number;
  betaContribution: number;
  factorContribution: number;
  residualReturn: number;
  rSquared: number;
  activeShare: number;
}

interface RebalanceEvent {
  date: string;
  strategy: string;
  estimatedTurnover: number;
  estimatedImpact: number;
}

interface MarketRegime {
  current: 'value-led' | 'momentum-led' | 'quality-led' | 'low-vol-led' | 'mixed';
  confidence: number;
  bestFactor: string;
  worstFactor: string;
  regimeDuration: number;
}

interface SmartBetaResponse {
  strategies: Strategy[];
  factorExposures: FactorExposure[];
  flowData: FlowData[];
  performanceAttribution: PerformanceAttribution;
  rebalanceCalendar: RebalanceEvent[];
  marketRegime: MarketRegime;
  generatedAt: string;
}

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ── Constants ──

const STRATEGY_DEFS: { name: string; ticker: string; baseAUM: number }[] = [
  { name: 'Minimum Volatility', ticker: 'USMV', baseAUM: 28 },
  { name: 'Quality', ticker: 'QUAL', baseAUM: 42 },
  { name: 'Value', ticker: 'VLUE', baseAUM: 18 },
  { name: 'Momentum', ticker: 'MTUM', baseAUM: 15 },
  { name: 'Size (Small Cap)', ticker: 'SIZE', baseAUM: 3.5 },
  { name: 'High Dividend', ticker: 'HDV', baseAUM: 10 },
  { name: 'Equal Weight', ticker: 'RSP', baseAUM: 55 },
  { name: 'Fundamental Weight', ticker: 'PRF', baseAUM: 6.5 },
  { name: 'Multi-Factor', ticker: 'LRGF', baseAUM: 12 },
  { name: 'Low Beta', ticker: 'SPLV', baseAUM: 8 },
];

const FACTOR_NAMES: FactorExposure['factor'][] = [
  'Value', 'Momentum', 'Quality', 'Size', 'Low Vol', 'Yield',
];

const FACTOR_BASE_PREMIUMS: Record<string, { current: number; historical: number }> = {
  'Value':    { current: 2.8, historical: 3.5 },
  'Momentum': { current: 4.2, historical: 3.8 },
  'Quality':  { current: 1.9, historical: 2.2 },
  'Size':     { current: 1.5, historical: 2.0 },
  'Low Vol':  { current: 0.8, historical: 1.4 },
  'Yield':    { current: 3.1, historical: 2.9 },
};

// ── Data generation ──

function generate(): SmartBetaResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('smart-beta-' + today);
  const rng = mulberry32(seed);

  // 1. Strategies (10 entries)
  const strategies: Strategy[] = STRATEGY_DEFS.map((def) => {
    const aumJitter = def.baseAUM * (0.85 + rng() * 0.30);
    const aum = round(clamp(aumJitter, 2, 80), 1);
    const return1M = round((rng() - 0.45) * 8, 2);
    const return3M = round((rng() - 0.42) * 14, 2);
    const returnYTD = round((rng() - 0.40) * 20, 2);
    const returnVsBenchmark = round((rng() - 0.50) * 6, 2);
    const trackingError = round(clamp(0.5 + rng() * 4.5, 0.5, 5.0), 2);
    const infoRatio = round(clamp(-0.5 + rng() * 2.0, -0.5, 1.5), 2);
    const sharpe = round(clamp(0.2 + rng() * 1.6, 0.2, 1.8), 2);
    const maxDrawdown = round(clamp(-(3 + rng() * 22), -25, -3), 2);
    const factorLoading = round(clamp(0.3 + rng() * 0.9, 0.3, 1.2), 2);

    return {
      name: def.name,
      ticker: def.ticker,
      aum,
      return1M,
      return3M,
      returnYTD,
      returnVsBenchmark,
      trackingError,
      infoRatio,
      sharpe,
      maxDrawdown,
      factorLoading,
    };
  });

  // 2. Factor Exposures (6 entries)
  const factorExposures: FactorExposure[] = FACTOR_NAMES.map((factor) => {
    const base = FACTOR_BASE_PREMIUMS[factor];
    const currentPremium = round(base.current + (rng() - 0.5) * 3, 2);
    const historicalAvg = round(base.historical + (rng() - 0.5) * 0.8, 2);
    const zScore = round(clamp((rng() - 0.5) * 6, -3, 3), 2);

    const crowdingRoll = rng();
    let crowding: FactorExposure['crowding'];
    if (crowdingRoll < 0.30) crowding = 'low';
    else if (crowdingRoll < 0.65) crowding = 'moderate';
    else if (crowdingRoll < 0.90) crowding = 'high';
    else crowding = 'extreme';

    let signal: FactorExposure['signal'];
    if (zScore > 0.8 && crowding !== 'extreme') signal = 'overweight';
    else if (zScore < -0.5 || crowding === 'extreme') signal = 'underweight';
    else signal = 'neutral';

    return { factor, currentPremium, historicalAvg, zScore, crowding, signal };
  });

  // 3. Flow Data (6 entries matching the 6 factors)
  const flowData: FlowData[] = FACTOR_NAMES.map((category) => {
    const flows1M = round((rng() - 0.45) * 8, 2);
    const flows3M = round((rng() - 0.40) * 18, 2);

    const momentumRoll = rng();
    let flowsMomentum: FlowData['flowsMomentum'];
    if (momentumRoll < 0.33) flowsMomentum = 'accelerating';
    else if (momentumRoll < 0.66) flowsMomentum = 'stable';
    else flowsMomentum = 'decelerating';

    const totalAUM = round(clamp(20 + rng() * 180, 20, 200), 1);

    return { category, flows1M, flows3M, flowsMomentum, totalAUM };
  });

  // 4. Performance Attribution
  const alphaVsSPX = round((rng() - 0.48) * 4, 2);
  const betaContribution = round(clamp(6 + rng() * 10, 4, 16), 2);
  const factorContribution = round((rng() - 0.40) * 5, 2);
  const residualReturn = round((rng() - 0.50) * 2, 2);
  const rSquared = round(clamp(0.85 + rng() * 0.14, 0.85, 0.99), 3);
  const activeShare = round(clamp(0.15 + rng() * 0.45, 0.15, 0.60), 3);

  const performanceAttribution: PerformanceAttribution = {
    alphaVsSPX,
    betaContribution,
    factorContribution,
    residualReturn,
    rSquared,
    activeShare,
  };

  // 5. Rebalance Calendar (3 upcoming events)
  const rebalanceStrategies = ['Equal Weight', 'Multi-Factor', 'Minimum Volatility'];
  const baseDate = new Date(today);
  const rebalanceCalendar: RebalanceEvent[] = rebalanceStrategies.map((strategy, i) => {
    const daysAhead = 7 + Math.floor(rng() * 55) + i * 20;
    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() + daysAhead);
    const dateStr = eventDate.toISOString().slice(0, 10);
    const estimatedTurnover = round(clamp(3 + rng() * 18, 3, 22), 1);
    const estimatedImpact = round(clamp(2 + rng() * 15, 2, 18), 1);

    return { date: dateStr, strategy, estimatedTurnover, estimatedImpact };
  });

  // Sort by date ascending
  rebalanceCalendar.sort((a, b) => a.date.localeCompare(b.date));

  // 6. Market Regime
  const regimeOptions: MarketRegime['current'][] = [
    'value-led', 'momentum-led', 'quality-led', 'low-vol-led', 'mixed',
  ];
  const regimeIdx = Math.floor(rng() * regimeOptions.length);
  const current = regimeOptions[regimeIdx];
  const confidence = round(clamp(0.35 + rng() * 0.60, 0.20, 0.95), 2);

  // Pick best and worst factor based on factor premiums
  const sortedFactors = [...factorExposures].sort((a, b) => b.currentPremium - a.currentPremium);
  const bestFactor = sortedFactors[0].factor;
  const worstFactor = sortedFactors[sortedFactors.length - 1].factor;
  const regimeDuration = Math.floor(clamp(1 + rng() * 17, 1, 18));

  const marketRegime: MarketRegime = {
    current,
    confidence,
    bestFactor,
    worstFactor,
    regimeDuration,
  };

  return {
    strategies,
    factorExposures,
    flowData,
    performanceAttribution,
    rebalanceCalendar,
    marketRegime,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5 min TTL) ──

let cacheData: SmartBetaResponse | null = null;
let cacheTime = 0;


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[SmartBeta] Error:', (err as Error).message);
    // Stale fallback
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate smart beta data' });
  }
});

export default router;
