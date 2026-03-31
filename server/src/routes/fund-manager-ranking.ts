import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

type Strategy = 'Long/Short Equity' | 'Global Macro' | 'Multi-Strategy' | 'Quant' | 'Event-Driven' | 'Fixed Income' | 'EM' | 'Credit';

interface FundManager {
  rank: number;
  name: string;
  firm: string;
  strategy: Strategy;
  aumBillions: number;
  ytdReturn: number;
  annualized1Y: number;
  annualized3Y: number;
  annualized5Y: number;
  sharpeRatio: number;
  maxDrawdown: number;
  informationRatio: number;
  alpha: number;
  beta: number;
  managementFee: number;
  performanceFee: number;
  hurdleRate: number;
  highWaterMark: boolean;
}

interface StrategyLeader {
  rank: number;
  name: string;
  firm: string;
  ytdReturn: number;
  annualized1Y: number;
}

interface RiskAdjustedEntry {
  rank: number;
  name: string;
  firm: string;
  value: number;
}

interface MonthlyFlow {
  month: string;
  strategy: Strategy;
  netFlowBillions: number;
}

interface FundManagerRankingResponse {
  managers: FundManager[];
  strategyLeaderboard: Record<Strategy, StrategyLeader[]>;
  performancePersistence: {
    topQuartile1Y: number;
    topQuartile3Y: number;
    topQuartile5Y: number;
  };
  riskAdjustedRankings: {
    bySharpe: RiskAdjustedEntry[];
    bySortino: RiskAdjustedEntry[];
    byCalmar: RiskAdjustedEntry[];
  };
  flowData: MonthlyFlow[];
  generatedAt: string;
}

// ── Manager definitions ──

const MANAGER_DEFS: Array<{ name: string; firm: string; strategy: Strategy; aumRange: [number, number] }> = [
  { name: 'James Whitfield', firm: 'Apex Capital', strategy: 'Long/Short Equity', aumRange: [18, 32] },
  { name: 'Elena Marchetti', firm: 'Meridian Partners', strategy: 'Global Macro', aumRange: [22, 45] },
  { name: 'David Chen', firm: 'Helix Investment Group', strategy: 'Multi-Strategy', aumRange: [35, 60] },
  { name: 'Sarah Lindqvist', firm: 'Polaris Advisors', strategy: 'Quant', aumRange: [12, 28] },
  { name: 'Michael Torres', firm: 'Cerberus Point Capital', strategy: 'Event-Driven', aumRange: [8, 18] },
  { name: 'Akiko Tanaka', firm: 'Zenith Asset Management', strategy: 'Fixed Income', aumRange: [25, 50] },
  { name: 'Robert Ashworth', firm: 'Pinnacle Fund Group', strategy: 'EM', aumRange: [6, 15] },
  { name: 'Catherine Dubois', firm: 'Vanguard Alpha Partners', strategy: 'Credit', aumRange: [14, 30] },
  { name: 'Andreas Weber', firm: 'Nordic Capital Strategies', strategy: 'Global Macro', aumRange: [10, 22] },
  { name: 'Priya Sharma', firm: 'Atlas Quantitative', strategy: 'Quant', aumRange: [20, 40] },
  { name: 'Thomas Blackwell', firm: 'Sterling Bridge Capital', strategy: 'Long/Short Equity', aumRange: [15, 28] },
  { name: 'Lucia Fernandez', firm: 'Solstice Investments', strategy: 'Event-Driven', aumRange: [7, 16] },
  { name: 'Henrik Johansson', firm: 'Boreal Capital', strategy: 'Multi-Strategy', aumRange: [28, 48] },
  { name: 'Yuki Nakamura', firm: 'Pacific Rim Advisors', strategy: 'EM', aumRange: [5, 12] },
  { name: 'George Harrington', firm: 'Citadel Peak Partners', strategy: 'Credit', aumRange: [10, 25] },
  { name: 'Isabelle Laurent', firm: 'Crestline Asset Management', strategy: 'Fixed Income', aumRange: [18, 38] },
  { name: 'Mark Sullivan', firm: 'Ironwood Capital', strategy: 'Long/Short Equity', aumRange: [12, 24] },
  { name: 'Natasha Volkov', firm: 'Sovereign Edge Partners', strategy: 'Global Macro', aumRange: [16, 35] },
  { name: 'Richard Kwon', firm: 'Horizon Systematic', strategy: 'Quant', aumRange: [8, 20] },
  { name: 'Alexandra Petrov', firm: 'Evergreen Capital Group', strategy: 'Multi-Strategy', aumRange: [30, 55] },
];

// Strategy parameter ranges for realistic return generation
const STRATEGY_PARAMS: Record<Strategy, {
  ytdRange: [number, number];
  ann1yRange: [number, number];
  ann3yRange: [number, number];
  ann5yRange: [number, number];
  sharpeRange: [number, number];
  maxDDRange: [number, number];
  irRange: [number, number];
  alphaRange: [number, number];
  betaRange: [number, number];
  mgmtFeeRange: [number, number];
  perfFeeRange: [number, number];
  hurdleRange: [number, number];
}> = {
  'Long/Short Equity': {
    ytdRange: [4, 18], ann1yRange: [6, 22], ann3yRange: [8, 16], ann5yRange: [9, 14],
    sharpeRange: [0.8, 1.8], maxDDRange: [-18, -6], irRange: [0.3, 1.2], alphaRange: [2, 8], betaRange: [0.3, 0.65],
    mgmtFeeRange: [1.5, 2.0], perfFeeRange: [15, 20], hurdleRange: [4, 8],
  },
  'Global Macro': {
    ytdRange: [2, 14], ann1yRange: [3, 16], ann3yRange: [5, 12], ann5yRange: [6, 11],
    sharpeRange: [0.6, 1.5], maxDDRange: [-15, -5], irRange: [0.2, 1.0], alphaRange: [1, 6], betaRange: [0.1, 0.35],
    mgmtFeeRange: [1.5, 2.0], perfFeeRange: [15, 20], hurdleRange: [3, 6],
  },
  'Multi-Strategy': {
    ytdRange: [5, 15], ann1yRange: [6, 18], ann3yRange: [7, 13], ann5yRange: [8, 12],
    sharpeRange: [1.0, 2.2], maxDDRange: [-12, -4], irRange: [0.5, 1.5], alphaRange: [3, 9], betaRange: [0.15, 0.40],
    mgmtFeeRange: [1.5, 2.0], perfFeeRange: [15, 25], hurdleRange: [4, 7],
  },
  'Quant': {
    ytdRange: [3, 20], ann1yRange: [5, 24], ann3yRange: [7, 16], ann5yRange: [8, 14],
    sharpeRange: [0.9, 2.5], maxDDRange: [-16, -5], irRange: [0.4, 1.6], alphaRange: [2, 10], betaRange: [0.2, 0.55],
    mgmtFeeRange: [1.0, 2.0], perfFeeRange: [15, 30], hurdleRange: [5, 8],
  },
  'Event-Driven': {
    ytdRange: [3, 16], ann1yRange: [4, 18], ann3yRange: [6, 13], ann5yRange: [7, 12],
    sharpeRange: [0.7, 1.6], maxDDRange: [-20, -7], irRange: [0.3, 1.1], alphaRange: [2, 7], betaRange: [0.25, 0.50],
    mgmtFeeRange: [1.5, 2.0], perfFeeRange: [15, 20], hurdleRange: [4, 7],
  },
  'Fixed Income': {
    ytdRange: [1, 8], ann1yRange: [2, 10], ann3yRange: [3, 8], ann5yRange: [4, 7],
    sharpeRange: [0.8, 2.0], maxDDRange: [-8, -2], irRange: [0.4, 1.3], alphaRange: [1, 4], betaRange: [0.05, 0.20],
    mgmtFeeRange: [0.75, 1.5], perfFeeRange: [10, 20], hurdleRange: [2, 5],
  },
  'EM': {
    ytdRange: [1, 22], ann1yRange: [2, 25], ann3yRange: [4, 15], ann5yRange: [5, 13],
    sharpeRange: [0.5, 1.4], maxDDRange: [-25, -8], irRange: [0.2, 1.0], alphaRange: [1, 8], betaRange: [0.4, 0.80],
    mgmtFeeRange: [1.5, 2.0], perfFeeRange: [15, 20], hurdleRange: [5, 8],
  },
  'Credit': {
    ytdRange: [2, 12], ann1yRange: [3, 14], ann3yRange: [4, 10], ann5yRange: [5, 9],
    sharpeRange: [0.7, 1.8], maxDDRange: [-14, -4], irRange: [0.3, 1.2], alphaRange: [1, 6], betaRange: [0.10, 0.35],
    mgmtFeeRange: [1.0, 1.75], perfFeeRange: [10, 20], hurdleRange: [3, 6],
  },
};

const ALL_STRATEGIES: Strategy[] = [
  'Long/Short Equity', 'Global Macro', 'Multi-Strategy', 'Quant',
  'Event-Driven', 'Fixed Income', 'EM', 'Credit',
];
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate(): FundManagerRankingResponse {
  const rng = seededRandom('fund-manager-ranking');

  const lerp = (min: number, max: number) => min + rng() * (max - min);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // ── 1. Top Fund Managers ──

  const managers: FundManager[] = MANAGER_DEFS.map((def) => {
    const params = STRATEGY_PARAMS[def.strategy];

    const ytdReturn = round2(lerp(params.ytdRange[0], params.ytdRange[1]));
    const annualized1Y = round2(lerp(params.ann1yRange[0], params.ann1yRange[1]));
    const annualized3Y = round2(lerp(params.ann3yRange[0], params.ann3yRange[1]));
    const annualized5Y = round2(lerp(params.ann5yRange[0], params.ann5yRange[1]));
    const sharpeRatio = round2(lerp(params.sharpeRange[0], params.sharpeRange[1]));
    const maxDrawdown = round2(lerp(params.maxDDRange[0], params.maxDDRange[1]));
    const informationRatio = round2(lerp(params.irRange[0], params.irRange[1]));
    const alpha = round2(lerp(params.alphaRange[0], params.alphaRange[1]));
    const beta = round2(lerp(params.betaRange[0], params.betaRange[1]));
    const aumBillions = round1(lerp(def.aumRange[0], def.aumRange[1]));

    const managementFee = round2(lerp(params.mgmtFeeRange[0], params.mgmtFeeRange[1]));
    const performanceFee = Math.round(lerp(params.perfFeeRange[0], params.perfFeeRange[1]));
    const hurdleRate = round2(lerp(params.hurdleRange[0], params.hurdleRange[1]));
    const highWaterMark = rng() > 0.15; // ~85% have HWM

    return {
      rank: 0,
      name: def.name,
      firm: def.firm,
      strategy: def.strategy,
      aumBillions,
      ytdReturn,
      annualized1Y,
      annualized3Y,
      annualized5Y,
      sharpeRatio,
      maxDrawdown,
      informationRatio,
      alpha,
      beta,
      managementFee,
      performanceFee,
      hurdleRate,
      highWaterMark,
    };
  });

  // Rank by YTD return
  managers.sort((a, b) => b.ytdReturn - a.ytdReturn);
  managers.forEach((m, i) => { m.rank = i + 1; });

  // ── 2. Strategy Leaderboard ──

  const strategyLeaderboard = {} as Record<Strategy, StrategyLeader[]>;
  for (const strategy of ALL_STRATEGIES) {
    const inStrategy = managers
      .filter(m => m.strategy === strategy)
      .sort((a, b) => b.ytdReturn - a.ytdReturn)
      .slice(0, 3);
    strategyLeaderboard[strategy] = inStrategy.map((m, i) => ({
      rank: i + 1,
      name: m.name,
      firm: m.firm,
      ytdReturn: m.ytdReturn,
      annualized1Y: m.annualized1Y,
    }));
  }

  // ── 3. Performance Persistence ──

  const performancePersistence = {
    topQuartile1Y: round1(lerp(38, 55)),
    topQuartile3Y: round1(lerp(28, 42)),
    topQuartile5Y: round1(lerp(20, 35)),
  };

  // ── 4. Risk-Adjusted Rankings ──

  // Sortino: use approximate downside deviation (sharpe * factor)
  const withSortino = managers.map(m => {
    const downsideFactor = lerp(0.6, 0.8);
    const sortino = round2(m.sharpeRatio / downsideFactor);
    return { ...m, sortino };
  });

  // Calmar: annualized return / |max drawdown|
  const withCalmar = managers.map(m => {
    const calmar = round2(m.annualized3Y / Math.max(Math.abs(m.maxDrawdown), 0.01));
    return { ...m, calmar };
  });

  const bySharpe: RiskAdjustedEntry[] = [...managers]
    .sort((a, b) => b.sharpeRatio - a.sharpeRatio)
    .slice(0, 10)
    .map((m, i) => ({ rank: i + 1, name: m.name, firm: m.firm, value: m.sharpeRatio }));

  const bySortino: RiskAdjustedEntry[] = [...withSortino]
    .sort((a, b) => b.sortino - a.sortino)
    .slice(0, 10)
    .map((m, i) => ({ rank: i + 1, name: m.name, firm: m.firm, value: m.sortino }));

  const byCalmar: RiskAdjustedEntry[] = [...withCalmar]
    .sort((a, b) => b.calmar - a.calmar)
    .slice(0, 10)
    .map((m, i) => ({ rank: i + 1, name: m.name, firm: m.firm, value: m.calmar }));

  // ── 5. Flow Data ──

  const now = new Date();
  const flowData: MonthlyFlow[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7);

    for (const strategy of ALL_STRATEGIES) {
      const netFlowBillions = round2(lerp(-8, 12));
      flowData.push({ month, strategy, netFlowBillions });
    }
  }

  return {
    managers,
    strategyLeaderboard,
    performancePersistence,
    riskAdjustedRankings: { bySharpe, bySortino, byCalmar },
    flowData,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FundManagerRanking] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate fund manager ranking data' });
  }
});

export default router;
