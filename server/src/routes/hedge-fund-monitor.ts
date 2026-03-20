import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface StrategyReturn {
  name: string;
  mtdReturn: number;
  ytdReturn: number;
  annualized3yr: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  maxDD: number;
  correlation_SPX: number;
  beta: number;
}

interface AUMFlow {
  month: string;
  totalAUM: number;
  netFlows: number;
  topInflows: string;
  topOutflows: string;
  redemptionRate: number;
}

interface CrowdedTrade {
  stock: string;
  percentOfFunds: number;
  avgPosition: number;
  netDirection: 'long' | 'short';
  crowdingScore: number;
  recentChange: 'increasing' | 'decreasing' | 'stable';
  potentialImpact: 'high' | 'medium' | 'low';
}

interface LeverageRisk {
  grossLeverage: number;
  netExposure: number;
  shortInterest: number;
  betaToMarket: number;
  avgVAR: number;
  marginUtilization: number;
  liquidityDays: number;
}

interface HedgeFundMonitorResponse {
  strategyReturns: StrategyReturn[];
  aumFlows: AUMFlow[];
  crowdedTrades: CrowdedTrade[];
  leverageRisk: LeverageRisk;
  generatedAt: string;
}

// ── Strategy definitions ──

const STRATEGIES = [
  { name: 'L/S Equity',           ytdRange: [5, 12],    mtdRange: [0.5, 2.5],   ann3yr: [7, 11],   vol: [8, 14],   maxDDRange: [-18, -8],   corrRange: [0.55, 0.80], betaRange: [0.30, 0.55] },
  { name: 'Global Macro',         ytdRange: [3, 8],     mtdRange: [0.2, 1.8],   ann3yr: [5, 9],    vol: [7, 12],   maxDDRange: [-15, -6],   corrRange: [0.15, 0.40], betaRange: [0.10, 0.30] },
  { name: 'Event Driven',         ytdRange: [4, 10],    mtdRange: [0.3, 2.0],   ann3yr: [6, 10],   vol: [6, 11],   maxDDRange: [-16, -7],   corrRange: [0.45, 0.65], betaRange: [0.25, 0.45] },
  { name: 'Relative Value',       ytdRange: [3, 7],     mtdRange: [0.2, 1.2],   ann3yr: [4, 7],    vol: [3, 7],    maxDDRange: [-10, -4],   corrRange: [0.20, 0.45], betaRange: [0.05, 0.20] },
  { name: 'CTA/Managed Futures',  ytdRange: [-5, 15],   mtdRange: [-2.0, 3.5],  ann3yr: [2, 12],   vol: [10, 18],  maxDDRange: [-22, -10],  corrRange: [-0.15, 0.20], betaRange: [-0.10, 0.15] },
  { name: 'Multi-Strategy',       ytdRange: [5, 10],    mtdRange: [0.4, 1.8],   ann3yr: [6, 9],    vol: [4, 8],    maxDDRange: [-12, -5],   corrRange: [0.30, 0.55], betaRange: [0.15, 0.35] },
  { name: 'Credit',               ytdRange: [3, 8],     mtdRange: [0.2, 1.4],   ann3yr: [4, 8],    vol: [4, 9],    maxDDRange: [-14, -5],   corrRange: [0.35, 0.60], betaRange: [0.15, 0.35] },
  { name: 'Distressed',           ytdRange: [4, 12],    mtdRange: [0.3, 2.2],   ann3yr: [5, 11],   vol: [8, 15],   maxDDRange: [-20, -8],   corrRange: [0.40, 0.65], betaRange: [0.20, 0.45] },
  { name: 'Quant Equity',         ytdRange: [4, 11],    mtdRange: [0.3, 2.0],   ann3yr: [6, 10],   vol: [7, 13],   maxDDRange: [-17, -7],   corrRange: [0.50, 0.75], betaRange: [0.25, 0.50] },
  { name: 'EM',                   ytdRange: [2, 9],     mtdRange: [0.1, 2.0],   ann3yr: [3, 8],    vol: [10, 18],  maxDDRange: [-25, -10],  corrRange: [0.45, 0.70], betaRange: [0.30, 0.60] },
];

// ── Crowded trade definitions ──

const CROWDED_LONGS = [
  { stock: 'NVDA',  fundsRange: [62, 78], posRange: [3.5, 6.0] },
  { stock: 'MSFT',  fundsRange: [58, 72], posRange: [3.0, 5.5] },
  { stock: 'META',  fundsRange: [52, 68], posRange: [2.5, 4.8] },
  { stock: 'AMZN',  fundsRange: [50, 66], posRange: [2.5, 4.5] },
  { stock: 'AAPL',  fundsRange: [48, 64], posRange: [2.0, 4.0] },
  { stock: 'GOOGL', fundsRange: [45, 62], posRange: [2.0, 3.8] },
  { stock: 'AVGO',  fundsRange: [38, 55], posRange: [1.8, 3.2] },
];

const CROWDED_SHORTS = [
  { stock: 'GME',   fundsRange: [25, 42], posRange: [0.5, 1.8] },
  { stock: 'AMC',   fundsRange: [20, 35], posRange: [0.3, 1.2] },
  { stock: 'BBBY',  fundsRange: [15, 28], posRange: [0.2, 0.8] },
  { stock: 'CVNA',  fundsRange: [18, 32], posRange: [0.4, 1.5] },
  { stock: 'BYND',  fundsRange: [14, 26], posRange: [0.2, 0.7] },
];

const STRATEGY_NAMES = STRATEGIES.map(s => s.name);

const MONTHS_BACK = 6;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate(): HedgeFundMonitorResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('hedge-fund-monitor-' + day));

  const lerp = (min: number, max: number) => min + rng() * (max - min);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // ── 1. Strategy Returns ──

  const strategyReturns: StrategyReturn[] = STRATEGIES.map(s => {
    const ytdReturn = round2(lerp(s.ytdRange[0], s.ytdRange[1]));
    const mtdReturn = round2(lerp(s.mtdRange[0], s.mtdRange[1]));
    const annualized3yr = round2(lerp(s.ann3yr[0], s.ann3yr[1]));
    const volatility = round2(lerp(s.vol[0], s.vol[1]));
    const maxDD = round2(lerp(s.maxDDRange[0], s.maxDDRange[1]));
    const correlation_SPX = round2(lerp(s.corrRange[0], s.corrRange[1]));
    const beta = round2(lerp(s.betaRange[0], s.betaRange[1]));

    // Sharpe = annualized excess return / vol (assume ~5% risk-free)
    const sharpe = round2((annualized3yr - 5) / Math.max(volatility, 1));
    // Sortino uses downside vol (approx 65-80% of total vol for HFs)
    const downsideFactor = lerp(0.65, 0.80);
    const sortino = round2((annualized3yr - 5) / Math.max(volatility * downsideFactor, 1));

    return {
      name: s.name,
      mtdReturn,
      ytdReturn,
      annualized3yr,
      volatility,
      sharpe,
      sortino,
      maxDD,
      correlation_SPX,
      beta,
    };
  });

  // ── 2. AUM Flows ──

  const now = new Date();
  const aumFlows: AUMFlow[] = [];
  let baseAUM = lerp(4.35, 4.65); // ~$4.5T industry AUM

  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toISOString().slice(0, 7); // YYYY-MM

    const netFlows = round2(lerp(-25, 35)); // $B
    baseAUM = round2(baseAUM + netFlows / 1000 + lerp(-0.02, 0.04)); // AUM drift
    const totalAUM = round2(Math.max(4.0, baseAUM));

    // Pick inflow/outflow strategy names (different)
    const inflowIdx = Math.floor(rng() * STRATEGY_NAMES.length);
    let outflowIdx = Math.floor(rng() * STRATEGY_NAMES.length);
    if (outflowIdx === inflowIdx) outflowIdx = (outflowIdx + 1) % STRATEGY_NAMES.length;

    const redemptionRate = round2(lerp(1.5, 4.5));

    aumFlows.push({
      month: monthLabel,
      totalAUM,
      netFlows,
      topInflows: STRATEGY_NAMES[inflowIdx],
      topOutflows: STRATEGY_NAMES[outflowIdx],
      redemptionRate,
    });
  }

  // ── 3. Crowded Trades ──

  const directions: Array<'increasing' | 'decreasing' | 'stable'> = ['increasing', 'decreasing', 'stable'];
  const impacts: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

  // Take 6 longs and 4 shorts for top 10
  const selectedLongs = CROWDED_LONGS.slice(0, 6);
  const selectedShorts = CROWDED_SHORTS.slice(0, 4);

  const crowdedTrades: CrowdedTrade[] = [];

  for (const cl of selectedLongs) {
    const percentOfFunds = round1(lerp(cl.fundsRange[0], cl.fundsRange[1]));
    const avgPosition = round2(lerp(cl.posRange[0], cl.posRange[1]));
    const crowdingScore = Math.min(10, Math.max(1, Math.round(lerp(6, 10))));
    crowdedTrades.push({
      stock: cl.stock,
      percentOfFunds,
      avgPosition,
      netDirection: 'long',
      crowdingScore,
      recentChange: pick(directions),
      potentialImpact: crowdingScore >= 8 ? 'high' : crowdingScore >= 5 ? 'medium' : 'low',
    });
  }

  for (const cs of selectedShorts) {
    const percentOfFunds = round1(lerp(cs.fundsRange[0], cs.fundsRange[1]));
    const avgPosition = round2(lerp(cs.posRange[0], cs.posRange[1]));
    const crowdingScore = Math.min(10, Math.max(1, Math.round(lerp(4, 8))));
    crowdedTrades.push({
      stock: cs.stock,
      percentOfFunds,
      avgPosition,
      netDirection: 'short',
      crowdingScore,
      recentChange: pick(directions),
      potentialImpact: crowdingScore >= 8 ? 'high' : crowdingScore >= 5 ? 'medium' : 'low',
    });
  }

  // Sort by crowding score descending
  crowdedTrades.sort((a, b) => b.crowdingScore - a.crowdingScore);

  // ── 4. Leverage & Risk ──

  const leverageRisk: LeverageRisk = {
    grossLeverage: round2(lerp(1.8, 2.6)),
    netExposure: round2(lerp(35, 65)),
    shortInterest: round2(lerp(25, 45)),
    betaToMarket: round2(lerp(0.25, 0.55)),
    avgVAR: round2(lerp(1.2, 2.8)),
    marginUtilization: round2(lerp(55, 78)),
    liquidityDays: round1(lerp(8, 25)),
  };

  return {
    strategyReturns,
    aumFlows,
    crowdedTrades,
    leverageRisk,
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
    console.error('[HedgeFundMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate hedge fund monitor data' });
  }
});

export default router;
