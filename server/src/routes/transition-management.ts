import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

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
    a = (a + 0x6D2B79F5) | 0;
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

interface TransitionOverview {
  legacyAum: number;
  targetAum: number;
  overlapPct: number;
  turnoverPct: number;
  estimatedCompletionDays: number;
  totalEstimatedCostBps: number;
  implementationShortfallTargetBps: number;
}

interface TradeEntry {
  ticker: string;
  side: 'buy' | 'sell';
  shares: number;
  notional: number;
  urgency: 'high' | 'medium' | 'low';
  executionStrategy: 'VWAP' | 'TWAP' | 'IS' | 'POV' | 'close';
  estimatedMarketImpactBps: number;
  commissionBps: number;
  status: 'pending' | 'executing' | 'completed';
}

interface SectorRebalance {
  sector: string;
  fromWeight: number;
  toWeight: number;
  delta: number;
  requiredTrades: number;
}

interface CostLine {
  label: string;
  bps: number;
  dollars: number;
}

interface TrackingError {
  preTransition: number;
  duringTransition: number;
  postTransitionTarget: number;
  current: number;
}

interface Milestone {
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  date: string;
}

// ── Seed Data ──

const TICKERS = [
  { ticker: 'AAPL', price: 195 },
  { ticker: 'MSFT', price: 430 },
  { ticker: 'NVDA', price: 880 },
  { ticker: 'GOOGL', price: 175 },
  { ticker: 'AMZN', price: 185 },
  { ticker: 'META', price: 510 },
  { ticker: 'TSLA', price: 245 },
  { ticker: 'JPM', price: 198 },
  { ticker: 'GS', price: 415 },
  { ticker: 'V', price: 280 },
  { ticker: 'UNH', price: 525 },
  { ticker: 'XOM', price: 108 },
  { ticker: 'PG', price: 162 },
  { ticker: 'HD', price: 370 },
  { ticker: 'LLY', price: 790 },
  { ticker: 'BA', price: 215 },
  { ticker: 'NEE', price: 72 },
  { ticker: 'AMT', price: 210 },
  { ticker: 'LIN', price: 440 },
  { ticker: 'CMCSA', price: 42 },
];

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Energy',
  'Consumer',
  'Industrial',
  'Utilities',
  'Real Estate',
  'Materials',
  'Communication',
];

const STRATEGIES: TradeEntry['executionStrategy'][] = ['VWAP', 'TWAP', 'IS', 'POV', 'close'];
const URGENCIES: TradeEntry['urgency'][] = ['high', 'medium', 'low'];
const STATUSES: TradeEntry['status'][] = ['pending', 'executing', 'completed'];

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Generator ──

function generate() {
  const rng = seededRandom('transition-management');

  // ── 1. Transition Overview ──
  const legacyAum = round2(jitter(2_850_000_000, 0.08, rng));
  const targetAum = round2(jitter(2_920_000_000, 0.08, rng));
  const overlapPct = round2(Math.min(85, Math.max(35, jitter(62, 0.12, rng))));
  const turnoverPct = round2(100 - overlapPct + jitter(5, 0.3, rng));
  const estimatedCompletionDays = Math.round(jitter(5, 0.25, rng));
  const totalEstimatedCostBps = round2(jitter(18.5, 0.15, rng));
  const implementationShortfallTargetBps = round2(jitter(12, 0.12, rng));

  const overview: TransitionOverview = {
    legacyAum,
    targetAum,
    overlapPct,
    turnoverPct,
    estimatedCompletionDays,
    totalEstimatedCostBps,
    implementationShortfallTargetBps,
  };

  // ── 2. Trade List (20 trades) ──
  const trades: TradeEntry[] = [];
  for (let i = 0; i < 20; i++) {
    const stock = TICKERS[i % TICKERS.length];
    const side: 'buy' | 'sell' = rng() > 0.5 ? 'buy' : 'sell';
    const shares = Math.round(jitter(15000, 0.6, rng) / 100) * 100;
    const price = stock.price * (1 + (rng() - 0.5) * 0.04);
    const notional = round2(shares * price);
    const urgency = pick(URGENCIES, rng);
    const executionStrategy = pick(STRATEGIES, rng);
    const estimatedMarketImpactBps = round2(jitter(3.5, 0.5, rng));
    const commissionBps = round2(jitter(0.8, 0.3, rng));

    // Status distribution: more pending early, more completed later
    let status: TradeEntry['status'];
    const statusRoll = rng();
    if (i < 6) {
      status = statusRoll < 0.7 ? 'completed' : statusRoll < 0.9 ? 'executing' : 'pending';
    } else if (i < 14) {
      status = statusRoll < 0.3 ? 'completed' : statusRoll < 0.7 ? 'executing' : 'pending';
    } else {
      status = statusRoll < 0.1 ? 'completed' : statusRoll < 0.3 ? 'executing' : 'pending';
    }

    trades.push({
      ticker: stock.ticker,
      side,
      shares,
      notional,
      urgency,
      executionStrategy,
      estimatedMarketImpactBps,
      commissionBps,
      status,
    });
  }

  // ── 3. Sector Rebalancing ──
  // Generate legacy weights that sum to 100
  const rawFrom = SECTORS.map(() => 5 + rng() * 20);
  const fromSum = rawFrom.reduce((a, b) => a + b, 0);
  const fromWeights = rawFrom.map(w => round2((w / fromSum) * 100));

  // Generate target weights that sum to 100
  const rawTo = SECTORS.map(() => 5 + rng() * 20);
  const toSum = rawTo.reduce((a, b) => a + b, 0);
  const toWeights = rawTo.map(w => round2((w / toSum) * 100));

  // Fix rounding to ensure sums hit 100
  const fromAdj = 100 - fromWeights.reduce((a, b) => a + b, 0);
  fromWeights[0] = round2(fromWeights[0] + fromAdj);
  const toAdj = 100 - toWeights.reduce((a, b) => a + b, 0);
  toWeights[0] = round2(toWeights[0] + toAdj);

  const sectorRebalancing: SectorRebalance[] = SECTORS.map((sector, i) => {
    const delta = round2(toWeights[i] - fromWeights[i]);
    const requiredTrades = Math.max(1, Math.round(Math.abs(delta) * jitter(1.5, 0.3, rng)));
    return {
      sector,
      fromWeight: fromWeights[i],
      toWeight: toWeights[i],
      delta,
      requiredTrades,
    };
  });

  // ── 4. Cost Analysis ──
  const aumForCost = (legacyAum + targetAum) / 2;
  const marketImpactBps = round2(jitter(5.2, 0.18, rng));
  const commissionBps = round2(jitter(1.5, 0.15, rng));
  const spreadCostBps = round2(jitter(3.8, 0.2, rng));
  const opportunityCostBps = round2(jitter(4.1, 0.22, rng));
  const totalCostBps = round2(marketImpactBps + commissionBps + spreadCostBps + opportunityCostBps);

  const bpsToDollars = (bps: number) => round2((bps / 10000) * aumForCost);

  const costAnalysis: CostLine[] = [
    { label: 'Market Impact', bps: marketImpactBps, dollars: bpsToDollars(marketImpactBps) },
    { label: 'Commission', bps: commissionBps, dollars: bpsToDollars(commissionBps) },
    { label: 'Spread Cost', bps: spreadCostBps, dollars: bpsToDollars(spreadCostBps) },
    { label: 'Opportunity Cost', bps: opportunityCostBps, dollars: bpsToDollars(opportunityCostBps) },
    { label: 'Total', bps: totalCostBps, dollars: bpsToDollars(totalCostBps) },
  ];

  // ── 5. Tracking Error ──
  const trackingError: TrackingError = {
    preTransition: round4(jitter(0.45, 0.2, rng)),
    duringTransition: round4(jitter(1.85, 0.18, rng)),
    postTransitionTarget: round4(jitter(0.30, 0.15, rng)),
    current: round4(jitter(1.20, 0.22, rng)),
  };

  // ── 6. Timeline ──
  const today = new Date();
  const dayMs = 86_400_000;
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  const milestones: Milestone[] = [
    {
      name: 'Pre-Trade Analysis',
      status: 'completed',
      date: formatDate(new Date(today.getTime() - 2 * dayMs)),
    },
    {
      name: 'Day 1 Execution — High Urgency Trades',
      status: 'completed',
      date: formatDate(new Date(today.getTime() - 1 * dayMs)),
    },
    {
      name: 'Day 2-3 Execution — Medium/Low Urgency',
      status: 'in-progress',
      date: formatDate(today),
    },
    {
      name: 'Portfolio Optimization & Rebalance',
      status: 'pending',
      date: formatDate(new Date(today.getTime() + 2 * dayMs)),
    },
    {
      name: 'Completion & Reconciliation',
      status: 'pending',
      date: formatDate(new Date(today.getTime() + Math.max(3, estimatedCompletionDays - 1) * dayMs)),
    },
  ];

  return {
    overview,
    trades,
    sectorRebalancing,
    costAnalysis,
    trackingError,
    timeline: milestones,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[TransitionManagement] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate transition management data' });
  }
});

export default router;
