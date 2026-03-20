import { Router } from 'express';

const router = Router();

// ── Types ──

interface Strategy {
  name: string;
  hfriReturn: number;
  replicaReturn: number;
  trackingError: number;
  correlationToHFRI: number;
  costSaving: number;
  liquidityAdvantage: 'daily' | 'weekly' | 'monthly';
  sharpe: number;
  replicaETF: string;
}

interface FactorDecomposition {
  factor: 'Equity Beta' | 'Credit Spread' | 'Term Structure' | 'Momentum' | 'Value' | 'Volatility';
  loading: number;
  tStat: number;
  contribution: number;
  significant: boolean;
}

interface PerformanceComparison {
  hfriComposite: number;
  replicaPortfolio: number;
  sp500: number;
  bonds: number;
  trackingErrorComposite: number;
  r2: number;
  informationRatio: number;
}

interface LiquidAlternativeETF {
  ticker: string;
  name: string;
  aum: number;
  return1M: number;
  return3M: number;
  returnYTD: number;
  expenseRatio: number;
  strategyType: string;
}

interface CrowdingAnalysis {
  position: string;
  crowdingLevel: 'extreme' | 'high' | 'moderate' | 'low';
  estimatedExposure: number;
  riskOfUnwind: 'high' | 'moderate' | 'low';
}

interface AlphaDecay {
  industryAvgAlpha3Y: number;
  industryAvgAlpha5Y: number;
  feeAdjustedAlpha: number;
  percentUnderperformingSP500: number;
  avgFeeTotal: number;
}

interface HedgeFundReplicationResponse {
  strategies: Strategy[];
  factorDecomposition: FactorDecomposition[];
  performanceComparison: PerformanceComparison;
  liquidAlternativeETFs: LiquidAlternativeETF[];
  crowdingAnalysis: CrowdingAnalysis[];
  alphaDecay: AlphaDecay;
  generatedAt: string;
}

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
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
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

const STRATEGY_DEFS: { name: string; etf: string }[] = [
  { name: 'Long/Short Equity', etf: 'QAI' },
  { name: 'Global Macro', etf: 'DBMF' },
  { name: 'Event Driven', etf: 'MNA' },
  { name: 'Relative Value', etf: 'CPI' },
  { name: 'CTA/Managed Futures', etf: 'WTMF' },
  { name: 'Merger Arbitrage', etf: 'MNA' },
  { name: 'Convertible Arbitrage', etf: 'ALFA' },
  { name: 'Equity Market Neutral', etf: 'BTAL' },
];

const FACTOR_NAMES: FactorDecomposition['factor'][] = [
  'Equity Beta', 'Credit Spread', 'Term Structure', 'Momentum', 'Value', 'Volatility',
];

const ETF_DEFS: { ticker: string; name: string; baseAUM: number; strategyType: string }[] = [
  { ticker: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker', baseAUM: 0.58, strategyType: 'Multi-Strategy' },
  { ticker: 'MNA', name: 'IQ Merger Arbitrage ETF', baseAUM: 0.72, strategyType: 'Merger Arbitrage' },
  { ticker: 'DBMF', name: 'iMGP DBi Managed Futures Strategy', baseAUM: 0.95, strategyType: 'Managed Futures' },
  { ticker: 'BTAL', name: 'AGFiQ US Market Neutral Anti-Beta', baseAUM: 0.32, strategyType: 'Market Neutral' },
  { ticker: 'WTMF', name: 'WisdomTree Managed Futures Strategy', baseAUM: 0.19, strategyType: 'Managed Futures' },
  { ticker: 'CPI', name: 'IQ Real Return ETF', baseAUM: 0.08, strategyType: 'Relative Value' },
];

const CROWDING_POSITIONS: string[] = [
  'Long NVDA',
  'Short Regional Banks',
  'Long Energy',
  'Short Consumer Discretionary',
  'Long IG Credit',
];

// ── Data generation ──

function generate(): HedgeFundReplicationResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('hedge-fund-replication-' + today);
  const rng = mulberry32(seed);

  // 1. Strategies (8 entries)
  const liquidityOptions: Strategy['liquidityAdvantage'][] = ['daily', 'weekly', 'monthly'];

  const strategies: Strategy[] = STRATEGY_DEFS.map((def) => {
    const hfriReturn = round((rng() - 0.40) * 15, 2);
    const replicaReturn = round(hfriReturn + (rng() - 0.50) * 4, 2);
    const trackingError = round(clamp(1.5 + rng() * 5.5, 1.5, 7.0), 2);
    const correlationToHFRI = round(clamp(0.70 + rng() * 0.28, 0.70, 0.98), 3);
    const costSaving = Math.floor(clamp(100 + rng() * 200, 100, 300));
    const liquidityIdx = Math.floor(rng() * liquidityOptions.length);
    const liquidityAdvantage = liquidityOptions[liquidityIdx];
    const sharpe = round(clamp(0.20 + rng() * 1.30, 0.20, 1.50), 2);

    return {
      name: def.name,
      hfriReturn,
      replicaReturn,
      trackingError,
      correlationToHFRI,
      costSaving,
      liquidityAdvantage,
      sharpe,
      replicaETF: def.etf,
    };
  });

  // 2. Factor Decomposition (6 entries)
  const factorDecomposition: FactorDecomposition[] = FACTOR_NAMES.map((factor) => {
    const loading = round(clamp((rng() - 0.50) * 2, -1, 1), 3);
    const tStat = round(clamp(rng() * 5, 0, 5), 2);
    const contribution = round((rng() - 0.30) * 30, 2);
    const significant = tStat >= 2.0;

    return { factor, loading, tStat, contribution, significant };
  });

  // 3. Performance Comparison
  const hfriComposite = round((rng() - 0.35) * 12, 2);
  const replicaPortfolio = round(hfriComposite + (rng() - 0.50) * 3, 2);
  const sp500 = round((rng() - 0.30) * 18, 2);
  const bonds = round((rng() - 0.45) * 8, 2);
  const trackingErrorComposite = round(clamp(1.5 + rng() * 4.5, 1.5, 6.0), 2);
  const r2 = round(clamp(0.70 + rng() * 0.25, 0.70, 0.95), 3);
  const informationRatio = round((rng() - 0.40) * 2.5, 2);

  const performanceComparison: PerformanceComparison = {
    hfriComposite,
    replicaPortfolio,
    sp500,
    bonds,
    trackingErrorComposite,
    r2,
    informationRatio,
  };

  // 4. Liquid Alternative ETFs (6 entries)
  const liquidAlternativeETFs: LiquidAlternativeETF[] = ETF_DEFS.map((def) => {
    const aumJitter = def.baseAUM * (0.80 + rng() * 0.40);
    const aum = round(clamp(aumJitter, 0.05, 2.0), 2);
    const return1M = round((rng() - 0.45) * 6, 2);
    const return3M = round((rng() - 0.42) * 10, 2);
    const returnYTD = round((rng() - 0.40) * 14, 2);
    const expenseRatio = round(clamp(0.30 + rng() * 1.20, 0.30, 1.50), 2);

    return {
      ticker: def.ticker,
      name: def.name,
      aum,
      return1M,
      return3M,
      returnYTD,
      expenseRatio,
      strategyType: def.strategyType,
    };
  });

  // 5. Crowding Analysis (5 entries)
  const crowdingLevels: CrowdingAnalysis['crowdingLevel'][] = ['extreme', 'high', 'moderate', 'low'];
  const unwindRisks: CrowdingAnalysis['riskOfUnwind'][] = ['high', 'moderate', 'low'];

  const crowdingAnalysis: CrowdingAnalysis[] = CROWDING_POSITIONS.map((position) => {
    const levelIdx = Math.floor(rng() * crowdingLevels.length);
    const crowdingLevel = crowdingLevels[levelIdx];
    const estimatedExposure = round(clamp(5 + rng() * 95, 5, 100), 1);

    let riskOfUnwind: CrowdingAnalysis['riskOfUnwind'];
    if (crowdingLevel === 'extreme') {
      riskOfUnwind = 'high';
    } else if (crowdingLevel === 'high') {
      riskOfUnwind = rng() < 0.6 ? 'high' : 'moderate';
    } else if (crowdingLevel === 'moderate') {
      riskOfUnwind = rng() < 0.4 ? 'moderate' : 'low';
    } else {
      riskOfUnwind = 'low';
    }

    return { position, crowdingLevel, estimatedExposure, riskOfUnwind };
  });

  // 6. Alpha Decay
  const industryAvgAlpha3Y = round((rng() - 0.30) * 4, 2);
  const industryAvgAlpha5Y = round(industryAvgAlpha3Y - rng() * 1.5, 2);
  const feeAdjustedAlpha = round(industryAvgAlpha3Y - (1.5 + rng() * 1.0), 2);
  const percentUnderperformingSP500 = round(clamp(60 + rng() * 20, 60, 80), 1);
  const avgFeeTotal = Math.floor(clamp(150 + rng() * 100, 150, 250));

  const alphaDecay: AlphaDecay = {
    industryAvgAlpha3Y,
    industryAvgAlpha5Y,
    feeAdjustedAlpha,
    percentUnderperformingSP500,
    avgFeeTotal,
  };

  return {
    strategies,
    factorDecomposition,
    performanceComparison,
    liquidAlternativeETFs,
    crowdingAnalysis,
    alphaDecay,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5 min TTL) ──

let cacheData: HedgeFundReplicationResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000;

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
    console.error('[HedgeFundReplication] Error:', (err as Error).message);
    // Stale fallback
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate hedge fund replication data' });
  }
});

export default router;
