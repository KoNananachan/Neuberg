import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// --- Seeded PRNG ---

// --- Cache ---


let cacheData: unknown = null;
let cacheTime = 0;

// --- Static Definitions ---

interface AssetClassDef {
  name: string;
  baseWeeklyFlow: number;   // $B
  baseMonthlyFlow: number;  // $B
  baseYtdFlow: number;      // $B
  baseAum: number;           // $T
  streakDirection: 'inflow' | 'outflow';
  baseStreak: number;
}

const ASSET_CLASS_DEFS: AssetClassDef[] = [
  { name: 'Equity', baseWeeklyFlow: 8.2, baseMonthlyFlow: 31.5, baseYtdFlow: 142.8, baseAum: 28.4, streakDirection: 'inflow', baseStreak: 6 },
  { name: 'Fixed Income', baseWeeklyFlow: 5.1, baseMonthlyFlow: 19.8, baseYtdFlow: 95.2, baseAum: 14.7, streakDirection: 'inflow', baseStreak: 12 },
  { name: 'Money Market', baseWeeklyFlow: 12.4, baseMonthlyFlow: 48.6, baseYtdFlow: 285.3, baseAum: 6.8, streakDirection: 'inflow', baseStreak: 18 },
  { name: 'Commodity', baseWeeklyFlow: -1.3, baseMonthlyFlow: -4.8, baseYtdFlow: -18.5, baseAum: 0.42, streakDirection: 'outflow', baseStreak: 4 },
  { name: 'Mixed/Balanced', baseWeeklyFlow: -0.8, baseMonthlyFlow: -3.2, baseYtdFlow: -22.1, baseAum: 3.9, streakDirection: 'outflow', baseStreak: 8 },
  { name: 'Alternative', baseWeeklyFlow: 0.6, baseMonthlyFlow: 2.4, baseYtdFlow: 11.7, baseAum: 0.95, streakDirection: 'inflow', baseStreak: 3 },
];

interface RegionalFlowDef {
  name: string;
  baseWeeklyFlow: number;   // $B
  baseMonthlyFlow: number;  // $B
  baseYtdFlow: number;      // $B
  basePercentOfGlobal: number;
}

const REGIONAL_FLOW_DEFS: RegionalFlowDef[] = [
  { name: 'US', baseWeeklyFlow: 12.5, baseMonthlyFlow: 47.2, baseYtdFlow: 215.6, basePercentOfGlobal: 48.2 },
  { name: 'Europe', baseWeeklyFlow: 3.8, baseMonthlyFlow: 14.1, baseYtdFlow: 62.3, basePercentOfGlobal: 18.5 },
  { name: 'Japan', baseWeeklyFlow: 1.9, baseMonthlyFlow: 7.2, baseYtdFlow: 34.8, basePercentOfGlobal: 8.1 },
  { name: 'China', baseWeeklyFlow: -2.1, baseMonthlyFlow: -8.5, baseYtdFlow: -38.4, basePercentOfGlobal: 7.3 },
  { name: 'EM ex-China', baseWeeklyFlow: -0.7, baseMonthlyFlow: -2.8, baseYtdFlow: -12.1, basePercentOfGlobal: 6.9 },
  { name: 'LatAm', baseWeeklyFlow: 0.4, baseMonthlyFlow: 1.5, baseYtdFlow: 6.8, basePercentOfGlobal: 3.2 },
  { name: 'Asia ex-China/Japan', baseWeeklyFlow: 1.2, baseMonthlyFlow: 4.6, baseYtdFlow: 21.3, basePercentOfGlobal: 7.8 },
];

interface SectorFlowDef {
  name: string;
  baseWeeklyFlow: number;   // $B
  baseMonthlyFlow: number;  // $B
  baseMomentum: 'accelerating' | 'decelerating' | 'reversing';
}

const SECTOR_FLOW_DEFS: SectorFlowDef[] = [
  { name: 'Technology', baseWeeklyFlow: 3.8, baseMonthlyFlow: 14.5, baseMomentum: 'accelerating' },
  { name: 'Healthcare', baseWeeklyFlow: 1.4, baseMonthlyFlow: 5.2, baseMomentum: 'accelerating' },
  { name: 'Financials', baseWeeklyFlow: 1.1, baseMonthlyFlow: 4.1, baseMomentum: 'decelerating' },
  { name: 'Energy', baseWeeklyFlow: -1.6, baseMonthlyFlow: -6.2, baseMomentum: 'decelerating' },
  { name: 'Consumer', baseWeeklyFlow: -0.5, baseMonthlyFlow: -1.8, baseMomentum: 'reversing' },
  { name: 'Industrials', baseWeeklyFlow: 0.8, baseMonthlyFlow: 3.0, baseMomentum: 'accelerating' },
  { name: 'Materials', baseWeeklyFlow: -0.3, baseMonthlyFlow: -1.1, baseMomentum: 'reversing' },
  { name: 'Utilities', baseWeeklyFlow: 0.4, baseMonthlyFlow: 1.5, baseMomentum: 'decelerating' },
  { name: 'Real Estate', baseWeeklyFlow: -0.9, baseMonthlyFlow: -3.4, baseMomentum: 'decelerating' },
];

interface StrategyFlowDef {
  name: string;
  baseWeeklyFlow: number;   // $B
  baseMonthlyFlow: number;  // $B
  baseMarketShare: number;  // %
}

const STRATEGY_FLOW_DEFS: StrategyFlowDef[] = [
  { name: 'Passive/Index', baseWeeklyFlow: 15.2, baseMonthlyFlow: 58.4, baseMarketShare: 54.3 },
  { name: 'Active', baseWeeklyFlow: -4.8, baseMonthlyFlow: -18.6, baseMarketShare: 34.1 },
  { name: 'Leveraged/Inverse', baseWeeklyFlow: -0.6, baseMonthlyFlow: -2.3, baseMarketShare: 2.8 },
  { name: 'Smart Beta', baseWeeklyFlow: 1.9, baseMonthlyFlow: 7.2, baseMarketShare: 5.6 },
  { name: 'ESG', baseWeeklyFlow: 0.3, baseMonthlyFlow: 1.1, baseMarketShare: 3.2 },
];

interface ContrarianSignalDef {
  signal: string;
  description: string;
  baseReading: number;
  basePercentile: number;
  implication: 'bullish' | 'bearish' | 'neutral';
  hitRate: number;
}

const CONTRARIAN_SIGNAL_DEFS: ContrarianSignalDef[] = [
  {
    signal: 'Equity Fund Outflow Extreme',
    description: 'Equity fund outflows at 2-year extreme — historically bullish for equities within 3 months',
    baseReading: -18.5,
    basePercentile: 8,
    implication: 'bullish',
    hitRate: 78,
  },
  {
    signal: 'Money Market Inflow Spike',
    description: 'Money market inflows above 90th percentile — risk-off signal suggesting elevated fear',
    baseReading: 52.3,
    basePercentile: 93,
    implication: 'bearish',
    hitRate: 65,
  },
  {
    signal: 'Bond-to-Equity Rotation',
    description: 'Fixed income inflows accelerating while equity outflows persist — late-cycle risk aversion',
    baseReading: 2.4,
    basePercentile: 82,
    implication: 'bearish',
    hitRate: 71,
  },
  {
    signal: 'EM Capitulation Threshold',
    description: 'EM equity outflows exceeded 3-sigma threshold — historically marks a contrarian buying opportunity',
    baseReading: -6.8,
    basePercentile: 5,
    implication: 'bullish',
    hitRate: 74,
  },
  {
    signal: 'Passive Flow Dominance',
    description: 'Passive fund share of weekly inflows above 85% — crowded positioning in index strategies',
    baseReading: 87.2,
    basePercentile: 91,
    implication: 'neutral',
    hitRate: 58,
  },
  {
    signal: 'Tech Sector Crowding',
    description: 'Technology sector inflows at 18-month high relative to AUM — potential mean-reversion risk',
    baseReading: 3.8,
    basePercentile: 88,
    implication: 'bearish',
    hitRate: 62,
  },
];

interface TopFundDef {
  name: string;
  ticker: string;
  baseFlow: number;    // $M
  baseAum: number;     // $B
  category: string;
}

const TOP_INFLOW_FUND_DEFS: TopFundDef[] = [
  { name: 'Vanguard S&P 500 ETF', ticker: 'VOO', baseFlow: 4250, baseAum: 435, category: 'US Equity' },
  { name: 'iShares Core S&P 500 ETF', ticker: 'IVV', baseFlow: 3180, baseAum: 412, category: 'US Equity' },
  { name: 'Vanguard Total Bond Market ETF', ticker: 'BND', baseFlow: 2640, baseAum: 108, category: 'US Bond' },
  { name: 'SPDR S&P 500 ETF Trust', ticker: 'SPY', baseFlow: 2310, baseAum: 523, category: 'US Equity' },
  { name: 'iShares Core US Aggregate Bond ETF', ticker: 'AGG', baseFlow: 1850, baseAum: 112, category: 'US Bond' },
];

const TOP_OUTFLOW_FUND_DEFS: TopFundDef[] = [
  { name: 'iShares MSCI Emerging Markets ETF', ticker: 'EEM', baseFlow: -1920, baseAum: 22, category: 'EM Equity' },
  { name: 'SPDR Bloomberg High Yield Bond ETF', ticker: 'JNK', baseFlow: -1540, baseAum: 8.2, category: 'HY Bond' },
  { name: 'ARK Innovation ETF', ticker: 'ARKK', baseFlow: -1280, baseAum: 6.8, category: 'Thematic' },
  { name: 'Invesco QQQ Trust', ticker: 'QQQ', baseFlow: -980, baseAum: 265, category: 'US Equity' },
  { name: 'Energy Select Sector SPDR Fund', ticker: 'XLE', baseFlow: -870, baseAum: 38, category: 'Sector - Energy' },
];

// --- Generator ---

function generate() {
  const seed = hashSeed('fund-flow-analytics-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  // --- Asset Class Flows ---
  const assetClassFlows = ASSET_CLASS_DEFS.map(ac => {
    const sign = ac.baseWeeklyFlow >= 0 ? 1 : -1;
    const weeklyFlow = round2(sign * Math.abs(ac.baseWeeklyFlow) * jitter(1, 0.3));
    const monthlyFlow = round2(sign * Math.abs(ac.baseMonthlyFlow) * jitter(1, 0.25));
    const ytdFlow = round2(sign * Math.abs(ac.baseYtdFlow) * jitter(1, 0.15));
    const aum = round2(ac.baseAum * jitter(1, 0.05));
    const flowAsPercentOfAUM = round2((weeklyFlow / (aum * 1000)) * 100);
    const streakJitter = Math.floor(rng() * 5) - 2;
    const streak = Math.max(1, ac.baseStreak + streakJitter) * (ac.streakDirection === 'inflow' ? 1 : -1);

    return {
      name: ac.name,
      weeklyFlow,
      monthlyFlow,
      ytdFlow,
      aum,
      flowAsPercentOfAUM,
      streak,
    };
  });

  // --- Regional Flows ---
  const regionalFlows = REGIONAL_FLOW_DEFS.map(rf => {
    const sign = rf.baseWeeklyFlow >= 0 ? 1 : -1;
    const weeklyFlow = round2(sign * Math.abs(rf.baseWeeklyFlow) * jitter(1, 0.3));
    const monthlyFlow = round2(sign * Math.abs(rf.baseMonthlyFlow) * jitter(1, 0.25));
    const ytdFlow = round2(sign * Math.abs(rf.baseYtdFlow) * jitter(1, 0.15));
    const percentOfGlobal = round2(rf.basePercentOfGlobal * jitter(1, 0.08));

    return {
      name: rf.name,
      weeklyFlow,
      monthlyFlow,
      ytdFlow,
      percentOfGlobal,
    };
  });

  // --- Sector Flows ---
  type Momentum = 'accelerating' | 'decelerating' | 'reversing';
  const MOMENTUM_OPTIONS: Momentum[] = ['accelerating', 'decelerating', 'reversing'];

  const sectorFlows = SECTOR_FLOW_DEFS.map(sf => {
    const sign = sf.baseWeeklyFlow >= 0 ? 1 : -1;
    const weeklyFlow = round2(sign * Math.abs(sf.baseWeeklyFlow) * jitter(1, 0.35));
    const monthlyFlow = round2(sign * Math.abs(sf.baseMonthlyFlow) * jitter(1, 0.3));

    // Momentum can shift based on RNG
    const momentumRoll = rng();
    let momentum: Momentum;
    if (momentumRoll < 0.6) {
      momentum = sf.baseMomentum;
    } else if (momentumRoll < 0.8) {
      momentum = MOMENTUM_OPTIONS[(MOMENTUM_OPTIONS.indexOf(sf.baseMomentum) + 1) % 3];
    } else {
      momentum = MOMENTUM_OPTIONS[(MOMENTUM_OPTIONS.indexOf(sf.baseMomentum) + 2) % 3];
    }

    return {
      name: sf.name,
      weeklyFlow,
      monthlyFlow,
      momentum,
    };
  });

  // --- Strategy Flows ---
  const strategyFlows = STRATEGY_FLOW_DEFS.map(st => {
    const sign = st.baseWeeklyFlow >= 0 ? 1 : -1;
    const weeklyFlow = round2(sign * Math.abs(st.baseWeeklyFlow) * jitter(1, 0.25));
    const monthlyFlow = round2(sign * Math.abs(st.baseMonthlyFlow) * jitter(1, 0.2));
    const marketShare = round2(st.baseMarketShare * jitter(1, 0.05));

    return {
      name: st.name,
      weeklyFlow,
      monthlyFlow,
      marketShare,
    };
  });

  // --- Contrarian Signals ---
  const contrarianSignals = CONTRARIAN_SIGNAL_DEFS.map(cs => {
    const currentReading = round2(cs.baseReading * jitter(1, 0.25));
    const percentileJitter = Math.floor((rng() - 0.5) * 12);
    const historicalPercentile = Math.max(1, Math.min(99, cs.basePercentile + percentileJitter));

    // Hit rate has small jitter
    const hitRateJitter = Math.floor((rng() - 0.5) * 8);
    const hitRate = Math.max(40, Math.min(95, cs.hitRate + hitRateJitter));

    return {
      signal: cs.signal,
      description: cs.description,
      currentReading,
      historicalPercentile,
      implication: cs.implication,
      hitRate,
    };
  });

  // --- Top Funds ---
  const topInflowFunds = TOP_INFLOW_FUND_DEFS.map(f => {
    const flow = round2(Math.abs(f.baseFlow) * jitter(1, 0.3));
    const aum = round2(f.baseAum * jitter(1, 0.05));
    return {
      name: f.name,
      ticker: f.ticker,
      flow,
      aum,
      category: f.category,
    };
  }).sort((a, b) => b.flow - a.flow);

  const topOutflowFunds = TOP_OUTFLOW_FUND_DEFS.map(f => {
    const flow = round2(-Math.abs(f.baseFlow) * jitter(1, 0.3));
    const aum = round2(f.baseAum * jitter(1, 0.05));
    return {
      name: f.name,
      ticker: f.ticker,
      flow,
      aum,
      category: f.category,
    };
  }).sort((a, b) => a.flow - b.flow);

  return {
    assetClassFlows,
    regionalFlows,
    sectorFlows,
    strategyFlows,
    contrarianSignals,
    topFunds: {
      inflows: topInflowFunds,
      outflows: topOutflowFunds,
    },
    timestamp: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[FundFlowAnalytics] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate fund flow analytics data' });
  }
});

export default router;
