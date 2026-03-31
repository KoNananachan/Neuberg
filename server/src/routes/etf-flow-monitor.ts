import { Router } from 'express';
import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();


let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// --- Static ETF Definitions ---

interface ETFDef {
  ticker: string;
  name: string;
  category: string;
  baseAum: number;         // $B
  baseFlow1d: number;      // $M
  baseCreation: number;    // units
  baseRedemption: number;  // units
}

const ETF_DEFS: ETFDef[] = [
  { ticker: 'SPY',  name: 'SPDR S&P 500 ETF Trust',                     category: 'US Equity',    baseAum: 523,  baseFlow1d: 1450,  baseCreation: 85,  baseRedemption: 62 },
  { ticker: 'IVV',  name: 'iShares Core S&P 500 ETF',                   category: 'US Equity',    baseAum: 412,  baseFlow1d: 870,   baseCreation: 68,  baseRedemption: 50 },
  { ticker: 'VOO',  name: 'Vanguard S&P 500 ETF',                       category: 'US Equity',    baseAum: 435,  baseFlow1d: 980,   baseCreation: 60,  baseRedemption: 48 },
  { ticker: 'QQQ',  name: 'Invesco QQQ Trust',                          category: 'US Equity',    baseAum: 265,  baseFlow1d: 640,   baseCreation: 72,  baseRedemption: 55 },
  { ticker: 'IWM',  name: 'iShares Russell 2000 ETF',                   category: 'US Equity',    baseAum: 68,   baseFlow1d: 320,   baseCreation: 40,  baseRedemption: 35 },
  { ticker: 'VTI',  name: 'Vanguard Total Stock Market ETF',            category: 'US Equity',    baseAum: 385,  baseFlow1d: 520,   baseCreation: 55,  baseRedemption: 42 },
  { ticker: 'EFA',  name: 'iShares MSCI EAFE ETF',                      category: 'Intl Equity',  baseAum: 78,   baseFlow1d: 185,   baseCreation: 35,  baseRedemption: 28 },
  { ticker: 'EEM',  name: 'iShares MSCI Emerging Markets ETF',          category: 'Intl Equity',  baseAum: 22,   baseFlow1d: -125,  baseCreation: 28,  baseRedemption: 36 },
  { ticker: 'AGG',  name: 'iShares Core US Aggregate Bond ETF',         category: 'Fixed Income', baseAum: 112,  baseFlow1d: 310,   baseCreation: 48,  baseRedemption: 38 },
  { ticker: 'BND',  name: 'Vanguard Total Bond Market ETF',             category: 'Fixed Income', baseAum: 108,  baseFlow1d: 275,   baseCreation: 42,  baseRedemption: 35 },
  { ticker: 'GLD',  name: 'SPDR Gold Shares',                           category: 'Commodity',    baseAum: 64,   baseFlow1d: 220,   baseCreation: 42,  baseRedemption: 30 },
  { ticker: 'TLT',  name: 'iShares 20+ Year Treasury Bond ETF',         category: 'Fixed Income', baseAum: 55,   baseFlow1d: 190,   baseCreation: 38,  baseRedemption: 35 },
  { ticker: 'XLF',  name: 'Financial Select Sector SPDR Fund',          category: 'US Equity',    baseAum: 42,   baseFlow1d: 160,   baseCreation: 25,  baseRedemption: 22 },
  { ticker: 'XLK',  name: 'Technology Select Sector SPDR Fund',         category: 'US Equity',    baseAum: 62,   baseFlow1d: 210,   baseCreation: 30,  baseRedemption: 24 },
  { ticker: 'XLE',  name: 'Energy Select Sector SPDR Fund',             category: 'US Equity',    baseAum: 38,   baseFlow1d: -110,  baseCreation: 20,  baseRedemption: 28 },
  { ticker: 'ARKK', name: 'ARK Innovation ETF',                         category: 'Alternatives', baseAum: 6.8,  baseFlow1d: -95,   baseCreation: 8,   baseRedemption: 18 },
  { ticker: 'HYG',  name: 'iShares iBoxx $ High Yield Corporate Bond ETF', category: 'Fixed Income', baseAum: 18, baseFlow1d: -180,  baseCreation: 32,  baseRedemption: 40 },
  { ticker: 'LQD',  name: 'iShares iBoxx $ Investment Grade Corp Bond ETF', category: 'Fixed Income', baseAum: 36, baseFlow1d: 165,  baseCreation: 30,  baseRedemption: 25 },
  { ticker: 'VWO',  name: 'Vanguard FTSE Emerging Markets ETF',         category: 'Intl Equity',  baseAum: 75,   baseFlow1d: 90,    baseCreation: 32,  baseRedemption: 26 },
  { ticker: 'IEFA', name: 'iShares Core MSCI EAFE ETF',                 category: 'Intl Equity',  baseAum: 118,  baseFlow1d: 240,   baseCreation: 38,  baseRedemption: 30 },
];

// --- Category base data ---

interface CategoryDef {
  category: string;
  baseAum: number;         // $B
  baseFlow1d: number;      // $M
  baseFlow1w: number;      // $M
  baseFlowMtd: number;     // $M
}

const CATEGORY_DEFS: CategoryDef[] = [
  { category: 'US Equity',    baseAum: 4200, baseFlow1d: 4800,  baseFlow1w: 22000,  baseFlowMtd: 68000 },
  { category: 'Intl Equity',  baseAum: 1350, baseFlow1d: 580,   baseFlow1w: 2600,   baseFlowMtd: 9200 },
  { category: 'Fixed Income', baseAum: 1820, baseFlow1d: 920,   baseFlow1w: 4100,   baseFlowMtd: 15500 },
  { category: 'Commodity',    baseAum: 310,  baseFlow1d: 260,   baseFlow1w: 1150,   baseFlowMtd: 4200 },
  { category: 'Alternatives', baseAum: 95,   baseFlow1d: -120,  baseFlow1w: -540,   baseFlowMtd: -1900 },
];

// --- Generator ---

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('etf-flow-monitor-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  // --- Top Flows (all 20 ETFs) ---
  const topFlows = ETF_DEFS.map(etf => {
    const sign = etf.baseFlow1d >= 0 ? 1 : -1;
    const flow1d = round2(sign * Math.abs(etf.baseFlow1d) * jitter(1, 0.3));
    const flow1w = round2(flow1d * jitter(4.5, 0.25));
    const flow1m = round2(flow1w * jitter(3.8, 0.3));
    const ytdFlow = round2(flow1m * jitter(2.8, 0.35) / 1000); // $B
    const aum = round2(jitter(etf.baseAum, 0.05));
    const creationUnits = Math.round(etf.baseCreation * jitter(1, 0.35));
    const redemptionUnits = Math.round(etf.baseRedemption * jitter(1, 0.35));
    return {
      ticker: etf.ticker,
      name: etf.name,
      aum,
      flow1d,
      flow1w,
      flow1m,
      ytdFlow,
      creationUnits,
      redemptionUnits,
      category: etf.category,
    };
  }).sort((a, b) => b.flow1d - a.flow1d);

  // --- Category Summary ---
  const categorySummary = CATEGORY_DEFS.map(cat => {
    const sign = cat.baseFlow1d >= 0 ? 1 : -1;
    const flow1d = round2(sign * Math.abs(cat.baseFlow1d) * jitter(1, 0.3));
    const flow1w = round2(sign * Math.abs(cat.baseFlow1w) * jitter(1, 0.25));
    const flowMtd = round2(sign * Math.abs(cat.baseFlowMtd) * jitter(1, 0.3));
    const aum = round2(jitter(cat.baseAum, 0.04));
    return {
      category: cat.category,
      flow1d,
      flow1w,
      flowMtd,
      aum,
    };
  });

  // --- Largest Inflows (top 10) ---
  const sortedByFlow = [...topFlows].sort((a, b) => b.flow1d - a.flow1d);
  const largestInflows = sortedByFlow.slice(0, 10).map(e => ({
    ticker: e.ticker,
    name: e.name,
    flow1d: e.flow1d,
    aum: e.aum,
    category: e.category,
  }));

  // --- Largest Outflows (top 10) ---
  const largestOutflows = sortedByFlow.slice(-10).reverse().map(e => ({
    ticker: e.ticker,
    name: e.name,
    flow1d: e.flow1d,
    aum: e.aum,
    category: e.category,
  }));

  // --- Creation/Redemption Activity ---
  const creationRedemption = ETF_DEFS.map(etf => {
    const sharesCreated = Math.round(etf.baseCreation * jitter(1, 0.4));
    const sharesRedeemed = Math.round(etf.baseRedemption * jitter(1, 0.4));
    const net = sharesCreated - sharesRedeemed;
    const premiumDiscount = round2((rng() - 0.45) * 0.6); // % range roughly -0.27 to +0.33
    return {
      etf: etf.ticker,
      sharesCreated,
      sharesRedeemed,
      net,
      premiumDiscountPct: premiumDiscount,
    };
  });

  return {
    topFlows,
    categorySummary,
    largestInflows,
    largestOutflows,
    creationRedemption,
    timestamp: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ETFFlowMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate ETF flow monitor data' });
  }
});

export default router;
