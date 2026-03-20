import { Router } from 'express';

const router = Router();

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// --- Types ---

interface ETFFlowEntry {
  ticker: string;
  name: string;
  category: string;
  aum: number;
  flow1D: number;
  flow1W: number;
  flow1M: number;
  flowYTD: number;
  price: number;
  change1D: number;
}

interface CategoryFlow {
  category: string;
  flow1D: number;
  flow1W: number;
  flow1M: number;
  flowYTD: number;
  totalAUM: number;
  etfCount: number;
}

interface SectorFlow {
  sector: string;
  flow1D: number;
  flow1W: number;
  flow1M: number;
  netAssets: number;
}

interface CreationEntry {
  ticker: string;
  name: string;
  sharesCreated: number;
  value: number;
}

interface RedemptionEntry {
  ticker: string;
  name: string;
  sharesRedeemed: number;
  value: number;
}

interface FlowSummary {
  totalETFAssets: number;
  totalDailyFlow: number;
  totalWeeklyFlow: number;
  totalMonthlyFlow: number;
  activeETFCount: number;
  newLaunches30D: number;
}

interface ETFFlowData {
  topInflows: ETFFlowEntry[];
  topOutflows: ETFFlowEntry[];
  categoryFlows: CategoryFlow[];
  sectorFlows: SectorFlow[];
  topCreations: CreationEntry[];
  topRedemptions: RedemptionEntry[];
  summary: FlowSummary;
  generatedAt: string;
}

// --- Static ETF Definitions ---

interface ETFDef {
  ticker: string;
  name: string;
  category: string;
  baseAum: number;
  basePrice: number;
  baseFlow1d: number;
}

const INFLOW_ETFS: ETFDef[] = [
  { ticker: 'SPY',  name: 'SPDR S&P 500 ETF Trust',                         category: 'US Equity',          baseAum: 523,  basePrice: 528.42, baseFlow1d: 1450 },
  { ticker: 'VOO',  name: 'Vanguard S&P 500 ETF',                           category: 'US Equity',          baseAum: 435,  basePrice: 485.60, baseFlow1d: 1180 },
  { ticker: 'IVV',  name: 'iShares Core S&P 500 ETF',                       category: 'US Equity',          baseAum: 412,  basePrice: 530.15, baseFlow1d: 920 },
  { ticker: 'VTI',  name: 'Vanguard Total Stock Market ETF',                category: 'US Equity',          baseAum: 385,  basePrice: 262.30, baseFlow1d: 780 },
  { ticker: 'QQQ',  name: 'Invesco QQQ Trust',                              category: 'US Equity',          baseAum: 265,  basePrice: 480.25, baseFlow1d: 640 },
  { ticker: 'AGG',  name: 'iShares Core US Aggregate Bond ETF',             category: 'Investment Grade',   baseAum: 112,  basePrice: 98.45,  baseFlow1d: 520 },
  { ticker: 'BND',  name: 'Vanguard Total Bond Market ETF',                 category: 'Investment Grade',   baseAum: 108,  basePrice: 72.80,  baseFlow1d: 460 },
  { ticker: 'IEFA', name: 'iShares Core MSCI EAFE ETF',                     category: 'International Equity', baseAum: 118, basePrice: 74.90, baseFlow1d: 380 },
  { ticker: 'GLD',  name: 'SPDR Gold Shares',                               category: 'Commodity',          baseAum: 64,   basePrice: 215.70, baseFlow1d: 340 },
  { ticker: 'IBIT', name: 'iShares Bitcoin Trust',                          category: 'Crypto',             baseAum: 52,   basePrice: 56.80,  baseFlow1d: 310 },
  { ticker: 'TLT',  name: 'iShares 20+ Year Treasury Bond ETF',             category: 'Treasury',           baseAum: 55,   basePrice: 92.15,  baseFlow1d: 285 },
  { ticker: 'LQD',  name: 'iShares iBoxx $ Investment Grade Corp Bond ETF', category: 'Investment Grade',   baseAum: 36,   basePrice: 108.20, baseFlow1d: 240 },
  { ticker: 'XLK',  name: 'Technology Select Sector SPDR Fund',             category: 'US Equity',          baseAum: 62,   basePrice: 212.40, baseFlow1d: 210 },
  { ticker: 'EFA',  name: 'iShares MSCI EAFE ETF',                          category: 'International Equity', baseAum: 78, basePrice: 82.30,  baseFlow1d: 185 },
  { ticker: 'VNQ',  name: 'Vanguard Real Estate ETF',                       category: 'Real Estate',        baseAum: 34,   basePrice: 84.60,  baseFlow1d: 165 },
];

const OUTFLOW_ETFS: ETFDef[] = [
  { ticker: 'HYG',  name: 'iShares iBoxx $ High Yield Corporate Bond ETF',  category: 'High Yield',         baseAum: 18,   basePrice: 76.45,  baseFlow1d: -680 },
  { ticker: 'ARKK', name: 'ARK Innovation ETF',                             category: 'US Equity',          baseAum: 6.8,  basePrice: 48.20,  baseFlow1d: -520 },
  { ticker: 'EEM',  name: 'iShares MSCI Emerging Markets ETF',              category: 'Emerging Markets',   baseAum: 22,   basePrice: 40.75,  baseFlow1d: -410 },
  { ticker: 'XLE',  name: 'Energy Select Sector SPDR Fund',                 category: 'US Equity',          baseAum: 38,   basePrice: 88.90,  baseFlow1d: -355 },
  { ticker: 'SLV',  name: 'iShares Silver Trust',                           category: 'Commodity',          baseAum: 11,   basePrice: 26.30,  baseFlow1d: -290 },
  { ticker: 'IWM',  name: 'iShares Russell 2000 ETF',                       category: 'US Equity',          baseAum: 68,   basePrice: 202.50, baseFlow1d: -265 },
  { ticker: 'USO',  name: 'United States Oil Fund',                         category: 'Commodity',          baseAum: 2.8,  basePrice: 72.10,  baseFlow1d: -230 },
  { ticker: 'XLF',  name: 'Financial Select Sector SPDR Fund',              category: 'US Equity',          baseAum: 42,   basePrice: 42.80,  baseFlow1d: -205 },
  { ticker: 'XLV',  name: 'Health Care Select Sector SPDR Fund',            category: 'US Equity',          baseAum: 38,   basePrice: 142.65, baseFlow1d: -185 },
  { ticker: 'VWO',  name: 'Vanguard FTSE Emerging Markets ETF',             category: 'Emerging Markets',   baseAum: 75,   basePrice: 42.90,  baseFlow1d: -175 },
  { ticker: 'TIP',  name: 'iShares TIPS Bond ETF',                          category: 'TIPS',              baseAum: 19,   basePrice: 108.50, baseFlow1d: -160 },
  { ticker: 'JNK',  name: 'SPDR Bloomberg High Yield Bond ETF',             category: 'High Yield',         baseAum: 8.5,  basePrice: 94.20,  baseFlow1d: -145 },
  { ticker: 'UNG',  name: 'United States Natural Gas Fund',                 category: 'Commodity',          baseAum: 1.2,  basePrice: 12.85,  baseFlow1d: -130 },
  { ticker: 'FXI',  name: 'iShares China Large-Cap ETF',                    category: 'Emerging Markets',   baseAum: 6.5,  basePrice: 28.40,  baseFlow1d: -120 },
  { ticker: 'BITO', name: 'ProShares Bitcoin Strategy ETF',                 category: 'Crypto',             baseAum: 2.1,  basePrice: 28.90,  baseFlow1d: -105 },
];

// --- Category Definitions ---

interface CategoryDef {
  category: string;
  baseTotalAUM: number;
  baseFlow1d: number;
  baseEtfCount: number;
}

const CATEGORY_DEFS: CategoryDef[] = [
  { category: 'US Equity',            baseTotalAUM: 4850, baseFlow1d: 5200,  baseEtfCount: 820 },
  { category: 'International Equity', baseTotalAUM: 1380, baseFlow1d: 680,   baseEtfCount: 415 },
  { category: 'Emerging Markets',     baseTotalAUM: 420,  baseFlow1d: -310,  baseEtfCount: 185 },
  { category: 'Fixed Income',         baseTotalAUM: 680,  baseFlow1d: 420,   baseEtfCount: 290 },
  { category: 'High Yield',           baseTotalAUM: 85,   baseFlow1d: -280,  baseEtfCount: 65 },
  { category: 'Investment Grade',     baseTotalAUM: 520,  baseFlow1d: 650,   baseEtfCount: 120 },
  { category: 'Treasury',             baseTotalAUM: 450,  baseFlow1d: 380,   baseEtfCount: 95 },
  { category: 'TIPS',                 baseTotalAUM: 110,  baseFlow1d: -85,   baseEtfCount: 30 },
  { category: 'Commodity',            baseTotalAUM: 310,  baseFlow1d: 180,   baseEtfCount: 140 },
  { category: 'Real Estate',          baseTotalAUM: 125,  baseFlow1d: 95,    baseEtfCount: 55 },
  { category: 'Currency',             baseTotalAUM: 48,   baseFlow1d: -25,   baseEtfCount: 35 },
  { category: 'Crypto',               baseTotalAUM: 72,   baseFlow1d: 210,   baseEtfCount: 22 },
];

// --- Sector Definitions (GICS) ---

interface SectorDef {
  sector: string;
  baseFlow1d: number;
  baseNetAssets: number;
}

const SECTOR_DEFS: SectorDef[] = [
  { sector: 'Information Technology', baseFlow1d: 1250,  baseNetAssets: 920 },
  { sector: 'Health Care',           baseFlow1d: -185,  baseNetAssets: 410 },
  { sector: 'Financials',            baseFlow1d: -205,  baseNetAssets: 380 },
  { sector: 'Consumer Discretionary', baseFlow1d: 320,  baseNetAssets: 350 },
  { sector: 'Communication Services', baseFlow1d: 480,  baseNetAssets: 280 },
  { sector: 'Industrials',           baseFlow1d: 210,   baseNetAssets: 310 },
  { sector: 'Consumer Staples',      baseFlow1d: -120,  baseNetAssets: 195 },
  { sector: 'Energy',                baseFlow1d: -355,  baseNetAssets: 260 },
  { sector: 'Utilities',             baseFlow1d: 140,   baseNetAssets: 145 },
  { sector: 'Real Estate',           baseFlow1d: 95,    baseNetAssets: 125 },
  { sector: 'Materials',             baseFlow1d: -75,   baseNetAssets: 110 },
];

// --- Creation / Redemption definitions ---

interface CreationRedemptionDef {
  ticker: string;
  name: string;
  baseShares: number;
  baseValue: number;
}

const CREATION_DEFS: CreationRedemptionDef[] = [
  { ticker: 'SPY',  name: 'SPDR S&P 500 ETF Trust',           baseShares: 4200000,  baseValue: 2220 },
  { ticker: 'VOO',  name: 'Vanguard S&P 500 ETF',             baseShares: 3100000,  baseValue: 1505 },
  { ticker: 'IVV',  name: 'iShares Core S&P 500 ETF',         baseShares: 2800000,  baseValue: 1484 },
  { ticker: 'QQQ',  name: 'Invesco QQQ Trust',                baseShares: 1900000,  baseValue: 912 },
  { ticker: 'VTI',  name: 'Vanguard Total Stock Market ETF',  baseShares: 2400000,  baseValue: 630 },
  { ticker: 'AGG',  name: 'iShares Core US Aggregate Bond ETF', baseShares: 3600000, baseValue: 354 },
  { ticker: 'IBIT', name: 'iShares Bitcoin Trust',            baseShares: 5200000,  baseValue: 295 },
  { ticker: 'GLD',  name: 'SPDR Gold Shares',                 baseShares: 1100000,  baseValue: 237 },
];

const REDEMPTION_DEFS: CreationRedemptionDef[] = [
  { ticker: 'HYG',  name: 'iShares iBoxx $ High Yield Corporate Bond ETF', baseShares: 8500000, baseValue: 650 },
  { ticker: 'ARKK', name: 'ARK Innovation ETF',               baseShares: 6200000,  baseValue: 299 },
  { ticker: 'EEM',  name: 'iShares MSCI Emerging Markets ETF', baseShares: 5800000, baseValue: 236 },
  { ticker: 'XLE',  name: 'Energy Select Sector SPDR Fund',   baseShares: 3200000,  baseValue: 284 },
  { ticker: 'SLV',  name: 'iShares Silver Trust',             baseShares: 4100000,  baseValue: 108 },
  { ticker: 'IWM',  name: 'iShares Russell 2000 ETF',         baseShares: 2100000,  baseValue: 425 },
  { ticker: 'USO',  name: 'United States Oil Fund',           baseShares: 1800000,  baseValue: 130 },
  { ticker: 'BITO', name: 'ProShares Bitcoin Strategy ETF',   baseShares: 3400000,  baseValue: 98 },
];

// --- Cache ---

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: ETFFlowData; ts: number } | null = null;

// --- Generator ---

function generate(): ETFFlowData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('etf-flow-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  // --- Top Inflows ---
  const topInflows: ETFFlowEntry[] = INFLOW_ETFS.map(etf => {
    const flow1D = round2(Math.abs(etf.baseFlow1d) * jitter(1, 0.25));
    const flow1W = round2(flow1D * jitter(4.2, 0.2));
    const flow1M = round2(flow1W * jitter(3.5, 0.25));
    const flowYTD = round2(flow1M * jitter(2.8, 0.3));
    const aum = round2(jitter(etf.baseAum, 0.04));
    const change1D = round2((rng() - 0.35) * 3.2);
    const price = round2(etf.basePrice * (1 + change1D / 100));
    return { ticker: etf.ticker, name: etf.name, category: etf.category, aum, flow1D, flow1W, flow1M, flowYTD, price, change1D };
  }).sort((a, b) => b.flow1D - a.flow1D);

  // --- Top Outflows ---
  const topOutflows: ETFFlowEntry[] = OUTFLOW_ETFS.map(etf => {
    const flow1D = round2(-Math.abs(etf.baseFlow1d) * jitter(1, 0.25));
    const flow1W = round2(flow1D * jitter(4.2, 0.2));
    const flow1M = round2(flow1W * jitter(3.5, 0.25));
    const flowYTD = round2(flow1M * jitter(2.8, 0.3));
    const aum = round2(jitter(etf.baseAum, 0.04));
    const change1D = round2((rng() - 0.6) * 3.5);
    const price = round2(etf.basePrice * (1 + change1D / 100));
    return { ticker: etf.ticker, name: etf.name, category: etf.category, aum, flow1D, flow1W, flow1M, flowYTD, price, change1D };
  }).sort((a, b) => a.flow1D - b.flow1D);

  // --- Category Flows ---
  const categoryFlows: CategoryFlow[] = CATEGORY_DEFS.map(cat => {
    const sign = cat.baseFlow1d >= 0 ? 1 : -1;
    const flow1D = round2(sign * Math.abs(cat.baseFlow1d) * jitter(1, 0.25));
    const flow1W = round2(flow1D * jitter(4.5, 0.2));
    const flow1M = round2(flow1W * jitter(3.8, 0.25));
    const flowYTD = round2(flow1M * jitter(2.6, 0.3));
    const totalAUM = round2(jitter(cat.baseTotalAUM, 0.03));
    const etfCount = Math.round(jitter(cat.baseEtfCount, 0.05));
    return { category: cat.category, flow1D, flow1W, flow1M, flowYTD, totalAUM, etfCount };
  });

  // --- Sector Flows ---
  const sectorFlows: SectorFlow[] = SECTOR_DEFS.map(s => {
    const sign = s.baseFlow1d >= 0 ? 1 : -1;
    const flow1D = round2(sign * Math.abs(s.baseFlow1d) * jitter(1, 0.3));
    const flow1W = round2(flow1D * jitter(4.3, 0.25));
    const flow1M = round2(flow1W * jitter(3.6, 0.3));
    const netAssets = round2(jitter(s.baseNetAssets, 0.04));
    return { sector: s.sector, flow1D, flow1W, flow1M, netAssets };
  });

  // --- Top Creations ---
  const topCreations: CreationEntry[] = CREATION_DEFS.map(c => {
    const sharesCreated = Math.round(jitter(c.baseShares, 0.3));
    const value = round2(jitter(c.baseValue, 0.25));
    return { ticker: c.ticker, name: c.name, sharesCreated, value };
  });

  // --- Top Redemptions ---
  const topRedemptions: RedemptionEntry[] = REDEMPTION_DEFS.map(r => {
    const sharesRedeemed = Math.round(jitter(r.baseShares, 0.3));
    const value = round2(jitter(r.baseValue, 0.25));
    return { ticker: r.ticker, name: r.name, sharesRedeemed, value };
  });

  // --- Summary ---
  const totalDailyFlow = round2(categoryFlows.reduce((s, c) => s + c.flow1D, 0));
  const totalWeeklyFlow = round2(categoryFlows.reduce((s, c) => s + c.flow1W, 0));
  const totalMonthlyFlow = round2(categoryFlows.reduce((s, c) => s + c.flow1M, 0));
  const totalETFAssets = round2(categoryFlows.reduce((s, c) => s + c.totalAUM, 0) / 1000);
  const activeETFCount = categoryFlows.reduce((s, c) => s + c.etfCount, 0);
  const newLaunches30D = Math.round(jitter(28, 0.35));

  const summary: FlowSummary = {
    totalETFAssets,
    totalDailyFlow,
    totalWeeklyFlow,
    totalMonthlyFlow,
    activeETFCount,
    newLaunches30D,
  };

  return {
    topInflows,
    topOutflows,
    categoryFlows,
    sectorFlows,
    topCreations,
    topRedemptions,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ETFFlow] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate ETF flow data' });
  }
});

export default router;
