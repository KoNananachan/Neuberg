import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Seed Data ──

interface FundDef {
  name: string;
  country: string;
  baseAum: number; // $B
  inception: number;
  source: string;
  allocation: { equity: number; fixedIncome: number; realEstate: number; alternatives: number; infrastructure: number; cash: number };
  topHolding: string;
  transparencyScore: number; // 1-10
}

const FUNDS: FundDef[] = [
  {
    name: 'Norway Government Pension Fund Global',
    country: 'Norway', baseAum: 1600, inception: 1990, source: 'Oil/Gas',
    allocation: { equity: 70, fixedIncome: 24, realEstate: 3, alternatives: 1, infrastructure: 1, cash: 1 },
    topHolding: 'Apple Inc.', transparencyScore: 10,
  },
  {
    name: 'China Investment Corporation',
    country: 'China', baseAum: 1350, inception: 2007, source: 'Trade Surplus',
    allocation: { equity: 38, fixedIncome: 17, realEstate: 8, alternatives: 22, infrastructure: 12, cash: 3 },
    topHolding: 'Alibaba Group Holdings', transparencyScore: 4,
  },
  {
    name: 'Abu Dhabi Investment Authority',
    country: 'UAE', baseAum: 990, inception: 1976, source: 'Oil/Gas',
    allocation: { equity: 42, fixedIncome: 15, realEstate: 10, alternatives: 18, infrastructure: 12, cash: 3 },
    topHolding: 'Brookfield Asset Management', transparencyScore: 3,
  },
  {
    name: 'Saudi Public Investment Fund',
    country: 'Saudi Arabia', baseAum: 925, inception: 1971, source: 'Oil/Gas',
    allocation: { equity: 35, fixedIncome: 10, realEstate: 12, alternatives: 20, infrastructure: 18, cash: 5 },
    topHolding: 'Saudi Aramco', transparencyScore: 5,
  },
  {
    name: 'Kuwait Investment Authority',
    country: 'Kuwait', baseAum: 920, inception: 1953, source: 'Oil/Gas',
    allocation: { equity: 45, fixedIncome: 20, realEstate: 8, alternatives: 15, infrastructure: 8, cash: 4 },
    topHolding: 'Mercedes-Benz Group', transparencyScore: 4,
  },
  {
    name: 'GIC Private Limited',
    country: 'Singapore', baseAum: 770, inception: 1981, source: 'Trade Surplus',
    allocation: { equity: 36, fixedIncome: 18, realEstate: 14, alternatives: 19, infrastructure: 10, cash: 3 },
    topHolding: 'Alphabet Inc.', transparencyScore: 6,
  },
  {
    name: 'Hong Kong Monetary Authority IP',
    country: 'Hong Kong', baseAum: 580, inception: 1993, source: 'Trade Surplus',
    allocation: { equity: 30, fixedIncome: 40, realEstate: 5, alternatives: 12, infrastructure: 8, cash: 5 },
    topHolding: 'US Treasury Bonds', transparencyScore: 7,
  },
  {
    name: 'Qatar Investment Authority',
    country: 'Qatar', baseAum: 510, inception: 2005, source: 'Oil/Gas',
    allocation: { equity: 40, fixedIncome: 12, realEstate: 18, alternatives: 16, infrastructure: 10, cash: 4 },
    topHolding: 'Barclays PLC', transparencyScore: 3,
  },
  {
    name: 'Temasek Holdings',
    country: 'Singapore', baseAum: 380, inception: 1974, source: 'Trade Surplus',
    allocation: { equity: 52, fixedIncome: 10, realEstate: 6, alternatives: 20, infrastructure: 8, cash: 4 },
    topHolding: 'DBS Group Holdings', transparencyScore: 9,
  },
  {
    name: 'Mubadala Investment Company',
    country: 'UAE', baseAum: 300, inception: 2002, source: 'Oil/Gas',
    allocation: { equity: 28, fixedIncome: 10, realEstate: 8, alternatives: 25, infrastructure: 22, cash: 7 },
    topHolding: 'GlobalFoundries', transparencyScore: 5,
  },
  {
    name: 'Korea Investment Corporation',
    country: 'South Korea', baseAum: 200, inception: 2005, source: 'Trade Surplus',
    allocation: { equity: 44, fixedIncome: 30, realEstate: 6, alternatives: 14, infrastructure: 4, cash: 2 },
    topHolding: 'Samsung Electronics', transparencyScore: 8,
  },
  {
    name: 'NZ Superannuation Fund',
    country: 'New Zealand', baseAum: 50, inception: 2003, source: 'Fiscal',
    allocation: { equity: 55, fixedIncome: 15, realEstate: 5, alternatives: 15, infrastructure: 6, cash: 4 },
    topHolding: 'Microsoft Corp.', transparencyScore: 10,
  },
];

const SECTORS = [
  'Technology', 'Financials', 'Energy', 'Healthcare', 'Real Estate',
  'Consumer Discretionary', 'Industrials', 'Infrastructure', 'Utilities', 'Communications',
];

const TRANSACTION_ASSETS = [
  { asset: 'Apple Inc.', sector: 'Technology' },
  { asset: 'Microsoft Corp.', sector: 'Technology' },
  { asset: 'NVIDIA Corp.', sector: 'Technology' },
  { asset: 'Amazon.com Inc.', sector: 'Consumer Discretionary' },
  { asset: 'JPMorgan Chase', sector: 'Financials' },
  { asset: 'Brookfield Infrastructure', sector: 'Infrastructure' },
  { asset: 'Prologis Inc.', sector: 'Real Estate' },
  { asset: 'TotalEnergies SE', sector: 'Energy' },
  { asset: 'ASML Holding NV', sector: 'Technology' },
  { asset: 'UnitedHealth Group', sector: 'Healthcare' },
  { asset: 'Siemens AG', sector: 'Industrials' },
  { asset: 'Alphabet Inc.', sector: 'Technology' },
  { asset: 'Samsung SDI', sector: 'Technology' },
  { asset: 'Dubai International Airport Stake', sector: 'Infrastructure' },
  { asset: 'Thames Water Bonds', sector: 'Utilities' },
  { asset: 'Canary Wharf Group', sector: 'Real Estate' },
  { asset: 'Reliance Industries', sector: 'Energy' },
  { asset: 'Tencent Holdings', sector: 'Technology' },
  { asset: 'Novo Nordisk', sector: 'Healthcare' },
  { asset: 'Shell PLC', sector: 'Energy' },
];

const ACTIONS = ['Buy', 'Sell', 'Increase', 'Decrease'] as const;

const ASSET_CLASSES = [
  { assetClass: 'Public Equity', baseAvg: 43.0, base1Y: 1.2, base3Y: 2.8, topAllocator: 'Norway GPFG' },
  { assetClass: 'Fixed Income', baseAvg: 19.5, base1Y: -0.8, base3Y: -2.5, topAllocator: 'Hong Kong HKMA' },
  { assetClass: 'Real Estate', baseAvg: 8.5, base1Y: -0.3, base3Y: -1.0, topAllocator: 'Qatar QIA' },
  { assetClass: 'Alternatives', baseAvg: 17.2, base1Y: 0.6, base3Y: 1.8, topAllocator: 'Mubadala' },
  { assetClass: 'Infrastructure', baseAvg: 10.0, base1Y: 1.1, base3Y: 3.2, topAllocator: 'Saudi PIF' },
];

const GEO_REGIONS = [
  { region: 'North America', baseAlloc: 32, base1Y: 0.5, topHolding: 'US Equities' },
  { region: 'Europe', baseAlloc: 24, base1Y: -0.3, topHolding: 'UK Real Estate' },
  { region: 'Asia Pacific', baseAlloc: 22, base1Y: 1.2, topHolding: 'China Tech' },
  { region: 'Emerging Markets', baseAlloc: 12, base1Y: 0.8, topHolding: 'India Infrastructure' },
  { region: 'Middle East', baseAlloc: 6, base1Y: -0.4, topHolding: 'Saudi Aramco' },
  { region: 'Other', baseAlloc: 4, base1Y: -0.2, topHolding: 'Latam Resources' },
];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-sovereign-wealth'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // ── Funds ──
  const funds = FUNDS.map(fund => {
    const aum = roundTo(jitter(fund.baseAum, 0.04), 1);
    const ytdReturn = roundTo((rng() - 0.3) * 18, 1); // range roughly -5.4% to +12.6%

    // Jitter allocation slightly while ensuring sum = 100
    const rawAlloc = {
      equity: roundTo(jitter(fund.allocation.equity, 0.04), 1),
      fixedIncome: roundTo(jitter(fund.allocation.fixedIncome, 0.04), 1),
      realEstate: roundTo(jitter(fund.allocation.realEstate, 0.06), 1),
      alternatives: roundTo(jitter(fund.allocation.alternatives, 0.06), 1),
      infrastructure: roundTo(jitter(fund.allocation.infrastructure, 0.06), 1),
      cash: 0,
    };
    const allocSum = rawAlloc.equity + rawAlloc.fixedIncome + rawAlloc.realEstate + rawAlloc.alternatives + rawAlloc.infrastructure;
    rawAlloc.cash = roundTo(Math.max(0, 100 - allocSum), 1);

    return {
      name: fund.name,
      country: fund.country,
      aum,
      ytdReturn,
      inception: fund.inception,
      source: fund.source,
      allocation: rawAlloc,
      topHolding: fund.topHolding,
      transparencyScore: fund.transparencyScore,
    };
  });

  // ── Summary ──
  const totalAUM = roundTo(funds.reduce((s, f) => s + f.aum, 0) / 1000, 2); // $T
  const activeFunds = funds.length;
  const avgYtdReturn = roundTo(funds.reduce((s, f) => s + f.ytdReturn, 0) / funds.length, 1);
  const largestFund = [...funds].sort((a, b) => b.aum - a.aum)[0].name;

  // Determine top allocation shift by comparing jittered allocation averages
  const allocationShifts = ['Public Equity', 'Fixed Income', 'Real Estate', 'Alternatives', 'Infrastructure'];
  const topAllocationShift = allocationShifts[Math.floor(rng() * allocationShifts.length)];

  const summary = {
    totalAUM,
    activeFunds,
    avgYtdReturn,
    largestFund,
    topAllocationShift,
  };

  // ── Recent Transactions ──
  const now = new Date();
  const recentTransactions = Array.from({ length: 10 }, (_, i) => {
    const fundDef = pick(FUNDS);
    const action = pick([...ACTIONS]);
    const txAsset = pick(TRANSACTION_ASSETS);
    const estimatedSize = roundTo(100 + rng() * 2400, 0); // $100M-$2500M
    const daysAgo = Math.floor(rng() * 14);
    const date = new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);

    return {
      fund: fundDef.name,
      action,
      asset: txAsset.asset,
      sector: txAsset.sector,
      estimatedSize,
      date,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // ── Asset Allocation Trends ──
  const assetAllocationTrends = ASSET_CLASSES.map(ac => ({
    assetClass: ac.assetClass,
    currentAvg: roundTo(jitter(ac.baseAvg, 0.04), 1),
    change1Y: roundTo(jitter(ac.base1Y, 0.15), 1),
    change3Y: roundTo(jitter(ac.base3Y, 0.15), 1),
    topAllocator: ac.topAllocator,
  }));

  // ── Geographic Exposure ──
  const geographicExposure = GEO_REGIONS.map(gr => ({
    region: gr.region,
    avgAllocation: roundTo(jitter(gr.baseAlloc, 0.05), 1),
    change1Y: roundTo(jitter(gr.base1Y, 0.2), 1),
    topHolding: gr.topHolding,
  }));

  return {
    summary,
    funds,
    recentTransactions,
    assetAllocationTrends,
    geographicExposure,
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
    console.error('[SovereignWealth] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate sovereign wealth fund data' });
  }
});

export default router;
