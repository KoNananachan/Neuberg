import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Deterministic seeded PRNG --

// -- Helpers --

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

// -- Types --

interface Endowment {
  name: string;
  totalAUM: number;
  return1Y: number;
  return5Y: number;
  return10Y: number;
  allocationEquity: number;
  allocationFixedIncome: number;
  allocationAlternatives: number;
  allocationRealAssets: number;
  allocationCash: number;
  payout: number;
  rank: number;
}

interface AssetAllocationTrend {
  assetClass: 'Public Equity' | 'Fixed Income' | 'Hedge Funds' | 'Private Equity' | 'Real Assets';
  currentAvg: number;
  fiveYearAgo: number;
  tenYearAgo: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface PerformanceBenchmarks {
  endowmentAvgReturn: number;
  sp500Return: number;
  bonds60_40Return: number;
  hfriReturn: number;
  privateEquityReturn: number;
}

interface TopAllocation {
  manager: string;
  strategy: string;
  estimatedAllocation: number;
}

interface RiskMetrics {
  avgVolatility: number;
  avgSharpe: number;
  avgDrawdown: number;
  illiquidityRatio: number;
  leverageEstimate: number;
}

interface RecentActivity {
  date: string;
  endowment: string;
  action: string;
  amount: string;
}

interface EndowmentResponse {
  endowments: Endowment[];
  assetAllocationTrends: AssetAllocationTrend[];
  performanceBenchmarks: PerformanceBenchmarks;
  topAllocations: TopAllocation[];
  riskMetrics: RiskMetrics;
  recentActivity: RecentActivity[];
  timestamp: string;
}

// -- Cache --


let cacheData: EndowmentResponse | null = null;
let cacheTime = 0;

// -- Endowment configuration --

interface EndowmentConfig {
  name: string;
  baseAUM: number; // billions
  baseReturn1Y: number;
  baseReturn5Y: number;
  baseReturn10Y: number;
  baseEquity: number;
  baseFixedIncome: number;
  baseAlternatives: number;
  baseRealAssets: number;
  baseCash: number;
  basePayout: number;
}

const ENDOWMENT_CONFIGS: EndowmentConfig[] = [
  { name: 'Harvard', baseAUM: 50.7, baseReturn1Y: 9.6, baseReturn5Y: 8.5, baseReturn10Y: 8.9, baseEquity: 14, baseFixedIncome: 4, baseAlternatives: 60, baseRealAssets: 18, baseCash: 4, basePayout: 5.2 },
  { name: 'Yale', baseAUM: 41.4, baseReturn1Y: 10.1, baseReturn5Y: 9.8, baseReturn10Y: 10.3, baseEquity: 11, baseFixedIncome: 4, baseAlternatives: 63, baseRealAssets: 18, baseCash: 4, basePayout: 5.4 },
  { name: 'Stanford', baseAUM: 36.3, baseReturn1Y: 8.4, baseReturn5Y: 8.1, baseReturn10Y: 9.0, baseEquity: 18, baseFixedIncome: 6, baseAlternatives: 52, baseRealAssets: 20, baseCash: 4, basePayout: 5.1 },
  { name: 'Princeton', baseAUM: 35.8, baseReturn1Y: 9.2, baseReturn5Y: 9.0, baseReturn10Y: 9.7, baseEquity: 13, baseFixedIncome: 5, baseAlternatives: 58, baseRealAssets: 19, baseCash: 5, basePayout: 5.0 },
  { name: 'MIT', baseAUM: 27.4, baseReturn1Y: 8.8, baseReturn5Y: 8.3, baseReturn10Y: 9.2, baseEquity: 16, baseFixedIncome: 7, baseAlternatives: 54, baseRealAssets: 18, baseCash: 5, basePayout: 5.3 },
  { name: 'Penn', baseAUM: 20.5, baseReturn1Y: 7.6, baseReturn5Y: 7.4, baseReturn10Y: 8.1, baseEquity: 20, baseFixedIncome: 8, baseAlternatives: 48, baseRealAssets: 19, baseCash: 5, basePayout: 4.9 },
  { name: 'Michigan', baseAUM: 17.9, baseReturn1Y: 7.1, baseReturn5Y: 7.0, baseReturn10Y: 7.6, baseEquity: 22, baseFixedIncome: 10, baseAlternatives: 44, baseRealAssets: 18, baseCash: 6, basePayout: 4.8 },
  { name: 'Columbia', baseAUM: 13.3, baseReturn1Y: 7.8, baseReturn5Y: 7.5, baseReturn10Y: 8.3, baseEquity: 19, baseFixedIncome: 9, baseAlternatives: 50, baseRealAssets: 17, baseCash: 5, basePayout: 5.0 },
  { name: 'Duke', baseAUM: 12.1, baseReturn1Y: 7.3, baseReturn5Y: 7.2, baseReturn10Y: 7.9, baseEquity: 21, baseFixedIncome: 8, baseAlternatives: 46, baseRealAssets: 19, baseCash: 6, basePayout: 5.1 },
  { name: 'Northwestern', baseAUM: 14.0, baseReturn1Y: 7.5, baseReturn5Y: 7.3, baseReturn10Y: 8.0, baseEquity: 20, baseFixedIncome: 9, baseAlternatives: 47, baseRealAssets: 18, baseCash: 6, basePayout: 4.7 },
];

// -- Data generation --

function generate(): EndowmentResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('endowment-' + today));

  // -- endowments --
  const endowments: Endowment[] = ENDOWMENT_CONFIGS.map((cfg, idx) => {
    const aumJitter = (rng() - 0.5) * cfg.baseAUM * 0.06;
    const totalAUM = round(cfg.baseAUM + aumJitter, 1);

    const return1Y = round(cfg.baseReturn1Y + (rng() - 0.5) * 6, 1);
    const return5Y = round(cfg.baseReturn5Y + (rng() - 0.5) * 3, 1);
    const return10Y = round(cfg.baseReturn10Y + (rng() - 0.5) * 2, 1);

    // Allocation with jitter, normalized to 100
    const rawEquity = Math.max(0, cfg.baseEquity + (rng() - 0.5) * 4);
    const rawFixedIncome = Math.max(0, cfg.baseFixedIncome + (rng() - 0.5) * 3);
    const rawAlternatives = Math.max(0, cfg.baseAlternatives + (rng() - 0.5) * 6);
    const rawRealAssets = Math.max(0, cfg.baseRealAssets + (rng() - 0.5) * 4);
    const rawCash = Math.max(0, cfg.baseCash + (rng() - 0.5) * 2);

    const rawTotal = rawEquity + rawFixedIncome + rawAlternatives + rawRealAssets + rawCash;
    const allocationEquity = round((rawEquity / rawTotal) * 100, 1);
    const allocationFixedIncome = round((rawFixedIncome / rawTotal) * 100, 1);
    const allocationAlternatives = round((rawAlternatives / rawTotal) * 100, 1);
    const allocationRealAssets = round((rawRealAssets / rawTotal) * 100, 1);
    const allocationCash = round(100 - allocationEquity - allocationFixedIncome - allocationAlternatives - allocationRealAssets, 1);

    const payout = round(clamp(cfg.basePayout + (rng() - 0.5) * 1.0, 4.5, 5.5), 1);

    return {
      name: cfg.name,
      totalAUM,
      return1Y,
      return5Y,
      return10Y,
      allocationEquity,
      allocationFixedIncome,
      allocationAlternatives,
      allocationRealAssets,
      allocationCash,
      payout,
      rank: idx + 1,
    };
  });

  // Sort by totalAUM descending and re-rank
  endowments.sort((a, b) => b.totalAUM - a.totalAUM);
  endowments.forEach((e, i) => { e.rank = i + 1; });

  // -- assetAllocationTrends --
  const assetAllocationTrends: AssetAllocationTrend[] = [
    {
      assetClass: 'Public Equity',
      currentAvg: round(17 + (rng() - 0.5) * 4, 1),
      fiveYearAgo: round(22 + (rng() - 0.5) * 3, 1),
      tenYearAgo: round(28 + (rng() - 0.5) * 3, 1),
      trend: 'decreasing',
    },
    {
      assetClass: 'Fixed Income',
      currentAvg: round(7 + (rng() - 0.5) * 3, 1),
      fiveYearAgo: round(10 + (rng() - 0.5) * 2, 1),
      tenYearAgo: round(14 + (rng() - 0.5) * 2, 1),
      trend: 'decreasing',
    },
    {
      assetClass: 'Hedge Funds',
      currentAvg: round(23 + (rng() - 0.5) * 4, 1),
      fiveYearAgo: round(22 + (rng() - 0.5) * 3, 1),
      tenYearAgo: round(20 + (rng() - 0.5) * 3, 1),
      trend: 'stable',
    },
    {
      assetClass: 'Private Equity',
      currentAvg: round(28 + (rng() - 0.5) * 4, 1),
      fiveYearAgo: round(22 + (rng() - 0.5) * 3, 1),
      tenYearAgo: round(15 + (rng() - 0.5) * 3, 1),
      trend: 'increasing',
    },
    {
      assetClass: 'Real Assets',
      currentAvg: round(18 + (rng() - 0.5) * 4, 1),
      fiveYearAgo: round(16 + (rng() - 0.5) * 3, 1),
      tenYearAgo: round(13 + (rng() - 0.5) * 3, 1),
      trend: 'increasing',
    },
  ];

  // -- performanceBenchmarks --
  const endowmentAvgReturn = round(endowments.reduce((s, e) => s + e.return1Y, 0) / endowments.length, 1);
  const performanceBenchmarks: PerformanceBenchmarks = {
    endowmentAvgReturn,
    sp500Return: round(10.5 + (rng() - 0.5) * 8, 1),
    bonds60_40Return: round(6.8 + (rng() - 0.5) * 5, 1),
    hfriReturn: round(7.2 + (rng() - 0.5) * 6, 1),
    privateEquityReturn: round(13.5 + (rng() - 0.5) * 8, 1),
  };

  // -- topAllocations --
  const managerConfigs: { manager: string; strategy: string; baseAlloc: number }[] = [
    { manager: 'Bridgewater', strategy: 'Global Macro / Risk Parity', baseAlloc: 4.2 },
    { manager: 'Renaissance', strategy: 'Quantitative Equity', baseAlloc: 3.8 },
    { manager: 'Sequoia Capital', strategy: 'Venture Capital / Growth Equity', baseAlloc: 3.5 },
    { manager: 'KKR', strategy: 'Leveraged Buyouts / Private Equity', baseAlloc: 3.2 },
    { manager: 'Blackstone', strategy: 'Private Equity / Real Estate', baseAlloc: 3.0 },
    { manager: 'Apollo', strategy: 'Credit / Distressed Debt', baseAlloc: 2.8 },
    { manager: 'Ares Management', strategy: 'Direct Lending / Private Credit', baseAlloc: 2.5 },
    { manager: 'Tiger Global', strategy: 'Long/Short Equity / Venture', baseAlloc: 2.2 },
  ];

  const topAllocations: TopAllocation[] = managerConfigs.map((mc) => ({
    manager: mc.manager,
    strategy: mc.strategy,
    estimatedAllocation: round(clamp(mc.baseAlloc + (rng() - 0.5) * 1.5, 1.0, 6.0), 1),
  }));

  // -- riskMetrics --
  const riskMetrics: RiskMetrics = {
    avgVolatility: round(clamp(10.5 + (rng() - 0.5) * 6, 6.0, 18.0), 1),
    avgSharpe: round(clamp(0.72 + (rng() - 0.5) * 0.8, 0.3, 1.2), 2),
    avgDrawdown: round(clamp(-12.5 + (rng() - 0.5) * 10, -25.0, -3.0), 1),
    illiquidityRatio: round(clamp(0.48 + (rng() - 0.5) * 0.4, 0.3, 0.7), 2),
    leverageEstimate: round(clamp(0.22 + (rng() - 0.5) * 0.4, 0.0, 0.5), 2),
  };

  // -- recentActivity --
  const activityTemplates: { endowment: string; action: string; amount: string }[] = [
    { endowment: 'Harvard', action: 'Committed to new PE co-investment vehicle', amount: '$800M' },
    { endowment: 'Yale', action: 'Increased allocation to venture capital managers', amount: '$1.2B' },
    { endowment: 'Stanford', action: 'Reduced public equity exposure in favor of real assets', amount: '$650M' },
    { endowment: 'Princeton', action: 'Added allocation to global macro hedge fund', amount: '$400M' },
    { endowment: 'MIT', action: 'Committed to infrastructure debt fund', amount: '$350M' },
    { endowment: 'Penn', action: 'Rebalanced alternatives portfolio toward direct lending', amount: '$500M' },
    { endowment: 'Columbia', action: 'Initiated new timber and farmland investment program', amount: '$275M' },
    { endowment: 'Duke', action: 'Expanded emerging market private equity mandate', amount: '$300M' },
  ];

  const recentActivity: RecentActivity[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; i < 3; i++) {
    let idx = Math.floor(rng() * activityTemplates.length);
    while (usedIndices.has(idx)) {
      idx = (idx + 1) % activityTemplates.length;
    }
    usedIndices.add(idx);

    const tmpl = activityTemplates[idx];
    const daysAgo = Math.floor(rng() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    recentActivity.push({
      date: date.toISOString().slice(0, 10),
      endowment: tmpl.endowment,
      action: tmpl.action,
      amount: tmpl.amount,
    });
  }

  recentActivity.sort((a, b) => b.date.localeCompare(a.date));

  return {
    endowments,
    assetAllocationTrends,
    performanceBenchmarks,
    topAllocations,
    riskMetrics,
    recentActivity,
    timestamp: new Date().toISOString(),
  };
}

// -- Route --

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
  } catch (err: unknown) {
    console.error('[Endowment] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate endowment data' });
  }
});

export default router;
