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

// ── Types ──

interface MarginLendingEntry {
  assetClass: string;
  lendingRate: number;
  marginRequirement: number;
  haircut: number;
  availableBalance: number;
  utilizationRate: number;
  change1d: number;
}

interface CollateralType {
  type: string;
  amount: number;
  pctOfTotal: number;
}

interface RehypothecationMonitor {
  totalClientAssets: number;
  rehypothecatedAmount: number;
  rehypothecationRate: number;
  regulatoryLimit: number;
  headroom: number;
  topCollateralTypes: CollateralType[];
}

interface CollateralTransformTrade {
  from: string;
  to: string;
  spread: number;
  volumeToday: number;
  avgTenor: number;
  counterparty: string;
  costOfTransform: number;
}

interface FinancingSummary {
  totalFinancingBook: number;
  avgRate: number;
  dailyRevenue: number;
  marginCalls: number;
  unmetMarginCalls: number;
  segregatedPct: number;
  unsegregatedPct: number;
}

interface SecuritiesFinanceResponse {
  marginLending: MarginLendingEntry[];
  rehypothecation: RehypothecationMonitor;
  collateralTransformation: CollateralTransformTrade[];
  financingSummary: FinancingSummary;
  generatedAt: string;
}

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: SecuritiesFinanceResponse; ts: number } | null = null;

// ── Static configs ──

const MARGIN_LENDING_CONFIGS = [
  { assetClass: 'US Equity',      baseLendingRate: 6.25, baseMarginReq: 50.0, baseHaircut: 25.0, baseBalance: 42.5, baseUtil: 78, bpsRange: [-8, 8] },
  { assetClass: 'Intl Equity',    baseLendingRate: 7.10, baseMarginReq: 55.0, baseHaircut: 30.0, baseBalance: 18.3, baseUtil: 72, bpsRange: [-6, 6] },
  { assetClass: 'US Treasuries',  baseLendingRate: 1.45, baseMarginReq: 10.0, baseHaircut: 2.0,  baseBalance: 85.2, baseUtil: 91, bpsRange: [-3, 3] },
  { assetClass: 'Corp Bonds',     baseLendingRate: 3.80, baseMarginReq: 30.0, baseHaircut: 8.0,  baseBalance: 31.6, baseUtil: 82, bpsRange: [-5, 5] },
  { assetClass: 'Agency MBS',     baseLendingRate: 2.90, baseMarginReq: 20.0, baseHaircut: 5.0,  baseBalance: 27.8, baseUtil: 86, bpsRange: [-4, 4] },
  { assetClass: 'ETFs',           baseLendingRate: 5.50, baseMarginReq: 50.0, baseHaircut: 20.0, baseBalance: 15.4, baseUtil: 74, bpsRange: [-7, 7] },
  { assetClass: 'Mutual Funds',   baseLendingRate: 5.85, baseMarginReq: 50.0, baseHaircut: 22.0, baseBalance: 8.9,  baseUtil: 65, bpsRange: [-5, 5] },
  { assetClass: 'Alternatives',   baseLendingRate: 8.20, baseMarginReq: 70.0, baseHaircut: 40.0, baseBalance: 4.1,  baseUtil: 58, bpsRange: [-10, 10] },
];

const COLLATERAL_TYPE_CONFIGS = [
  { type: 'US Treasuries',     baseAmount: 128.5, basePct: 38.2 },
  { type: 'US Equities',       baseAmount: 95.3,  basePct: 28.3 },
  { type: 'Corporate Bonds',   baseAmount: 52.7,  basePct: 15.7 },
  { type: 'Agency Securities', baseAmount: 38.1,  basePct: 11.3 },
  { type: 'Cash & Equivalents', baseAmount: 21.9, basePct: 6.5 },
];

const TRANSFORM_CONFIGS = [
  { from: 'Corp Bonds (BBB)',     to: 'US Treasuries',     baseSpread: 45, baseVol: 320, baseTenor: 30, counterparty: 'JPMorgan',       baseCost: 12 },
  { from: 'Agency MBS',           to: 'UST Bills',         baseSpread: 28, baseVol: 510, baseTenor: 14, counterparty: 'Goldman Sachs',   baseCost: 8 },
  { from: 'Equities (Large Cap)', to: 'Govt Bonds',        baseSpread: 72, baseVol: 185, baseTenor: 7,  counterparty: 'Morgan Stanley',  baseCost: 22 },
  { from: 'EM Sovereigns',        to: 'DM Govt Bonds',     baseSpread: 85, baseVol: 140, baseTenor: 21, counterparty: 'Barclays',        baseCost: 28 },
  { from: 'HY Corp Bonds',        to: 'IG Corp Bonds',     baseSpread: 55, baseVol: 230, baseTenor: 45, counterparty: 'Citigroup',       baseCost: 18 },
  { from: 'Convertibles',         to: 'UST Notes',         baseSpread: 62, baseVol: 95,  baseTenor: 60, counterparty: 'BNP Paribas',     baseCost: 20 },
];

// ── Data generation ──

function generate(): SecuritiesFinanceResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-securities-finance'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Margin Lending Rates
  const marginLending: MarginLendingEntry[] = MARGIN_LENDING_CONFIGS.map(cfg => {
    const lendingRate = Math.round(jitter(cfg.baseLendingRate, 0.04) * 100) / 100;
    const marginRequirement = Math.round(jitter(cfg.baseMarginReq, 0.02) * 10) / 10;
    const haircut = Math.round(jitter(cfg.baseHaircut, 0.03) * 10) / 10;
    const availableBalance = Math.round(jitter(cfg.baseBalance, 0.06) * 10) / 10;
    const utilizationRate = Math.round(Math.min(99.9, Math.max(40, jitter(cfg.baseUtil, 0.04))) * 10) / 10;
    const bpsSpan = cfg.bpsRange[1] - cfg.bpsRange[0];
    const change1d = Math.round((cfg.bpsRange[0] + rng() * bpsSpan) * 10) / 10;
    return { assetClass: cfg.assetClass, lendingRate, marginRequirement, haircut, availableBalance, utilizationRate, change1d };
  });

  // Rehypothecation Monitor
  const totalClientAssets = Math.round(jitter(336.5, 0.04) * 10) / 10;
  const rehypothecationRate = Math.round(jitter(118.0, 0.03) * 10) / 10;
  const regulatoryLimit = 140.0;
  const rehypothecatedAmount = Math.round((totalClientAssets * rehypothecationRate / 100) * 10) / 10;
  const headroom = Math.round((totalClientAssets * (regulatoryLimit - rehypothecationRate) / 100) * 10) / 10;

  const topCollateralTypes: CollateralType[] = COLLATERAL_TYPE_CONFIGS.map(cfg => {
    const amount = Math.round(jitter(cfg.baseAmount, 0.05) * 10) / 10;
    const pctOfTotal = Math.round(jitter(cfg.basePct, 0.03) * 10) / 10;
    return { type: cfg.type, amount, pctOfTotal };
  });

  // Normalize pctOfTotal to sum to 100
  const pctSum = topCollateralTypes.reduce((s, c) => s + c.pctOfTotal, 0);
  topCollateralTypes.forEach(c => { c.pctOfTotal = Math.round((c.pctOfTotal / pctSum * 100) * 10) / 10; });

  const rehypothecation: RehypothecationMonitor = {
    totalClientAssets,
    rehypothecatedAmount,
    rehypothecationRate,
    regulatoryLimit,
    headroom,
    topCollateralTypes,
  };

  // Collateral Transformation
  const collateralTransformation: CollateralTransformTrade[] = TRANSFORM_CONFIGS.map(cfg => {
    const spread = Math.round(jitter(cfg.baseSpread, 0.08));
    const volumeToday = Math.round(jitter(cfg.baseVol, 0.12) * 10) / 10;
    const avgTenor = Math.round(jitter(cfg.baseTenor, 0.10));
    const costOfTransform = Math.round(jitter(cfg.baseCost, 0.10) * 10) / 10;
    return { from: cfg.from, to: cfg.to, spread, volumeToday, avgTenor, counterparty: cfg.counterparty, costOfTransform };
  });

  // Financing Summary
  const totalFinancingBook = Math.round(jitter(482.3, 0.04) * 10) / 10;
  const avgRate = Math.round(jitter(4.15, 0.03) * 100) / 100;
  const dailyRevenue = Math.round(jitter(5.48, 0.06) * 100) / 100;
  const marginCalls = Math.round(jitter(23, 0.15));
  const unmetMarginCalls = Math.round(jitter(1.8, 0.25) * 10) / 10;
  const segregatedPct = Math.round(jitter(62.0, 0.03) * 10) / 10;
  const unsegregatedPct = Math.round((100 - segregatedPct) * 10) / 10;

  const financingSummary: FinancingSummary = {
    totalFinancingBook,
    avgRate,
    dailyRevenue,
    marginCalls,
    unmetMarginCalls,
    segregatedPct,
    unsegregatedPct,
  };

  return {
    marginLending,
    rehypothecation,
    collateralTransformation,
    financingSummary,
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
    console.error('[SecuritiesFinance] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate securities finance data' });
  }
});

export default router;
