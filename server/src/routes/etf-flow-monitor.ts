import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; } return h; }

// --- Static Data ---

interface ETFFlowDef {
  ticker: string;
  name: string;
  aum: number;          // $B
  baseDailyFlow: number; // $M
  category: string;
}

const INFLOW_ETFS: ETFFlowDef[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', aum: 523, baseDailyFlow: 1450, category: 'US Equity' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', aum: 435, baseDailyFlow: 980, category: 'US Equity' },
  { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', aum: 412, baseDailyFlow: 870, category: 'US Equity' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', aum: 265, baseDailyFlow: 640, category: 'US Equity' },
  { ticker: 'AGG', name: 'iShares Core US Aggregate Bond ETF', aum: 112, baseDailyFlow: 310, category: 'US Bond' },
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', aum: 108, baseDailyFlow: 275, category: 'US Bond' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', aum: 385, baseDailyFlow: 520, category: 'US Equity' },
  { ticker: 'GLD', name: 'SPDR Gold Shares', aum: 64, baseDailyFlow: 220, category: 'Commodity' },
  { ticker: 'IEFA', name: 'iShares Core MSCI EAFE ETF', aum: 118, baseDailyFlow: 185, category: 'Intl Equity' },
  { ticker: 'LQD', name: 'iShares iBoxx $ Investment Grade Corp Bond ETF', aum: 36, baseDailyFlow: 165, category: 'Corp Bond' },
];

const OUTFLOW_ETFS: ETFFlowDef[] = [
  { ticker: 'ARKK', name: 'ARK Innovation ETF', aum: 6.8, baseDailyFlow: -95, category: 'US Equity' },
  { ticker: 'HYG', name: 'iShares iBoxx $ High Yield Corp Bond ETF', aum: 18, baseDailyFlow: -180, category: 'HY Bond' },
  { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', aum: 22, baseDailyFlow: -125, category: 'EM Equity' },
  { ticker: 'XLE', name: 'Energy Select Sector SPDR Fund', aum: 38, baseDailyFlow: -110, category: 'US Equity' },
  { ticker: 'BITO', name: 'ProShares Bitcoin Strategy ETF', aum: 2.1, baseDailyFlow: -72, category: 'Crypto' },
  { ticker: 'SQQQ', name: 'ProShares UltraPro Short QQQ', aum: 4.5, baseDailyFlow: -88, category: 'Inverse' },
  { ticker: 'TQQQ', name: 'ProShares UltraPro QQQ', aum: 22, baseDailyFlow: -105, category: 'Leveraged' },
  { ticker: 'JNK', name: 'SPDR Bloomberg High Yield Bond ETF', aum: 8.2, baseDailyFlow: -68, category: 'HY Bond' },
  { ticker: 'EMB', name: 'iShares JP Morgan USD Emerging Markets Bond ETF', aum: 16, baseDailyFlow: -92, category: 'EM Equity' },
  { ticker: 'SLV', name: 'iShares Silver Trust', aum: 11, baseDailyFlow: -55, category: 'Commodity' },
];

interface CategoryDef {
  category: string;
  baseDailyFlow: number;  // $M
  baseWeeklyFlow: number; // $M
  baseMonthlyFlow: number; // $M
  baseNetCreations: number; // share units
}

const CATEGORY_DEFS: CategoryDef[] = [
  { category: 'US Equity', baseDailyFlow: 3200, baseWeeklyFlow: 14500, baseMonthlyFlow: 52000, baseNetCreations: 4200 },
  { category: 'Intl Equity', baseDailyFlow: 680, baseWeeklyFlow: 3100, baseMonthlyFlow: 11200, baseNetCreations: 890 },
  { category: 'EM Equity', baseDailyFlow: -220, baseWeeklyFlow: -980, baseMonthlyFlow: -3500, baseNetCreations: -310 },
  { category: 'US Bond', baseDailyFlow: 850, baseWeeklyFlow: 3800, baseMonthlyFlow: 14000, baseNetCreations: 1650 },
  { category: 'Corp Bond', baseDailyFlow: 310, baseWeeklyFlow: 1400, baseMonthlyFlow: 5200, baseNetCreations: 520 },
  { category: 'HY Bond', baseDailyFlow: -180, baseWeeklyFlow: -820, baseMonthlyFlow: -2900, baseNetCreations: -280 },
  { category: 'Muni', baseDailyFlow: 125, baseWeeklyFlow: 560, baseMonthlyFlow: 2100, baseNetCreations: 210 },
  { category: 'Commodity', baseDailyFlow: 280, baseWeeklyFlow: 1250, baseMonthlyFlow: 4500, baseNetCreations: 380 },
  { category: 'Real Estate', baseDailyFlow: -95, baseWeeklyFlow: -420, baseMonthlyFlow: -1500, baseNetCreations: -140 },
  { category: 'Crypto', baseDailyFlow: -150, baseWeeklyFlow: -680, baseMonthlyFlow: -2400, baseNetCreations: -195 },
  { category: 'Leveraged', baseDailyFlow: -110, baseWeeklyFlow: -500, baseMonthlyFlow: -1800, baseNetCreations: -160 },
  { category: 'Inverse', baseDailyFlow: -75, baseWeeklyFlow: -340, baseMonthlyFlow: -1200, baseNetCreations: -105 },
];

interface CreationRedemptionDef {
  ticker: string;
  baseCreation: number;   // units
  baseRedemption: number;  // units
  navPerUnit: number;      // $M per unit
}

const CR_DEFS: CreationRedemptionDef[] = [
  { ticker: 'SPY', baseCreation: 85, baseRedemption: 62, navPerUnit: 5.2 },
  { ticker: 'QQQ', baseCreation: 72, baseRedemption: 55, navPerUnit: 4.8 },
  { ticker: 'IVV', baseCreation: 68, baseRedemption: 50, navPerUnit: 5.1 },
  { ticker: 'VOO', baseCreation: 60, baseRedemption: 48, navPerUnit: 4.9 },
  { ticker: 'VTI', baseCreation: 55, baseRedemption: 42, navPerUnit: 3.8 },
  { ticker: 'AGG', baseCreation: 48, baseRedemption: 38, navPerUnit: 1.2 },
  { ticker: 'GLD', baseCreation: 42, baseRedemption: 30, navPerUnit: 2.1 },
  { ticker: 'TLT', baseCreation: 38, baseRedemption: 35, navPerUnit: 1.5 },
  { ticker: 'HYG', baseCreation: 32, baseRedemption: 40, navPerUnit: 0.9 },
  { ticker: 'EEM', baseCreation: 28, baseRedemption: 36, navPerUnit: 1.1 },
  { ticker: 'LQD', baseCreation: 30, baseRedemption: 25, navPerUnit: 1.3 },
  { ticker: 'IEFA', baseCreation: 35, baseRedemption: 28, navPerUnit: 1.8 },
  { ticker: 'XLF', baseCreation: 25, baseRedemption: 22, navPerUnit: 0.7 },
  { ticker: 'ARKK', baseCreation: 8, baseRedemption: 18, navPerUnit: 0.3 },
  { ticker: 'TQQQ', baseCreation: 15, baseRedemption: 22, navPerUnit: 0.5 },
];

interface SectorDef {
  sector: string;
  baseWeeklyFlow: number; // $M
}

const SECTOR_ROTATION_DEFS: SectorDef[] = [
  { sector: 'Information Technology', baseWeeklyFlow: 1800 },
  { sector: 'Health Care', baseWeeklyFlow: 650 },
  { sector: 'Financials', baseWeeklyFlow: 480 },
  { sector: 'Consumer Discretionary', baseWeeklyFlow: -320 },
  { sector: 'Communication Services', baseWeeklyFlow: 280 },
  { sector: 'Industrials', baseWeeklyFlow: 350 },
  { sector: 'Consumer Staples', baseWeeklyFlow: -180 },
  { sector: 'Energy', baseWeeklyFlow: -420 },
  { sector: 'Utilities', baseWeeklyFlow: 150 },
  { sector: 'Real Estate', baseWeeklyFlow: -260 },
  { sector: 'Materials', baseWeeklyFlow: 120 },
];

// --- Cache ---

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// --- Generator ---

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('etf-flow-monitor-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  // --- Top Inflows (10 ETFs) ---
  const topInflows = INFLOW_ETFS.map(etf => {
    const dailyFlow = round2(Math.abs(etf.baseDailyFlow) * jitter(1, 0.3));
    const weeklyFlow = round2(dailyFlow * jitter(4.5, 0.25));
    const monthlyFlow = round2(weeklyFlow * jitter(3.8, 0.3));
    const aum = round2(jitter(etf.aum, 0.05));
    const flowPercent = round2((dailyFlow / (aum * 1000)) * 100);
    return {
      ticker: etf.ticker,
      name: etf.name,
      aum,
      dailyFlow,
      weeklyFlow,
      monthlyFlow,
      flowPercent,
      category: etf.category,
    };
  }).sort((a, b) => b.dailyFlow - a.dailyFlow);

  // --- Top Outflows (10 ETFs) ---
  const topOutflows = OUTFLOW_ETFS.map(etf => {
    const dailyFlow = round2(-Math.abs(etf.baseDailyFlow) * jitter(1, 0.3));
    const weeklyFlow = round2(dailyFlow * jitter(4.5, 0.25));
    const monthlyFlow = round2(weeklyFlow * jitter(3.8, 0.3));
    const aum = round2(jitter(etf.aum, 0.05));
    const flowPercent = round2((dailyFlow / (aum * 1000)) * 100);
    return {
      ticker: etf.ticker,
      name: etf.name,
      aum,
      dailyFlow,
      weeklyFlow,
      monthlyFlow,
      flowPercent,
      category: etf.category,
    };
  }).sort((a, b) => a.dailyFlow - b.dailyFlow);

  // --- Category Summary (12 categories) ---
  const categorySummary = CATEGORY_DEFS.map(cat => {
    const sign = cat.baseDailyFlow >= 0 ? 1 : -1;
    const dailyFlow = round2(sign * Math.abs(cat.baseDailyFlow) * jitter(1, 0.3));
    const weeklyFlow = round2(sign * Math.abs(cat.baseWeeklyFlow) * jitter(1, 0.25));
    const monthlyFlow = round2(sign * Math.abs(cat.baseMonthlyFlow) * jitter(1, 0.3));
    const netCreations = Math.round(cat.baseNetCreations * jitter(1, 0.35));
    return {
      category: cat.category,
      dailyFlow,
      weeklyFlow,
      monthlyFlow,
      netCreations,
    };
  });

  // --- Creation/Redemption Activity (15 ETFs) ---
  const creationRedemption = CR_DEFS.map(cr => {
    const creationUnits = Math.round(cr.baseCreation * jitter(1, 0.35));
    const redemptionUnits = Math.round(cr.baseRedemption * jitter(1, 0.35));
    const netUnits = creationUnits - redemptionUnits;
    const impliedFlow = round2(netUnits * cr.navPerUnit);
    const premiumDiscount = round2((rng() - 0.45) * 30); // bps, slight positive bias
    return {
      ticker: cr.ticker,
      creationUnits,
      redemptionUnits,
      netUnits,
      impliedFlow,
      premiumDiscount,
    };
  });

  // --- Sector Rotation Signal (11 GICS sectors) ---
  type FlowMomentum = 'strong inflow' | 'inflow' | 'neutral' | 'outflow' | 'strong outflow';
  type RotationSignal = 'overweight' | 'neutral' | 'underweight';

  const sectorRotation = SECTOR_ROTATION_DEFS.map(sec => {
    const weeklyFlow = round2(sec.baseWeeklyFlow * jitter(1, 0.4));
    const monthlyFlow = round2(weeklyFlow * jitter(3.8, 0.3));

    let flowMomentum: FlowMomentum;
    if (weeklyFlow > 800) flowMomentum = 'strong inflow';
    else if (weeklyFlow > 200) flowMomentum = 'inflow';
    else if (weeklyFlow > -200) flowMomentum = 'neutral';
    else if (weeklyFlow > -800) flowMomentum = 'outflow';
    else flowMomentum = 'strong outflow';

    let rotationSignal: RotationSignal;
    if (monthlyFlow > 2000) rotationSignal = 'overweight';
    else if (monthlyFlow < -2000) rotationSignal = 'underweight';
    else rotationSignal = 'neutral';

    return {
      sector: sec.sector,
      weeklyFlow,
      monthlyFlow,
      flowMomentum,
      rotationSignal,
    };
  });

  return {
    topInflows,
    topOutflows,
    categorySummary,
    creationRedemption,
    sectorRotation,
    timestamp: new Date().toISOString(),
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
    console.error('[ETFFlowMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate ETF flow monitor data' });
  }
});

export default router;
