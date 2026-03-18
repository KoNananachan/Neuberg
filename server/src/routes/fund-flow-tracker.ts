import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface WeeklyFlowEntry {
  category: string;
  flow1W: number;
  flow1M: number;
  flow3M: number;
  flowYTD: number;
}

interface FundFlowEntry {
  fundName: string;
  ticker: string;
  category: string;
  flowAmount: number;
  aum: number;
  pctOfAUM: number;
}

interface ETFCreationRedemption {
  ticker: string;
  name: string;
  creationUnits: number;
  redemptionUnits: number;
  netFlow: number;
  aum: number;
}

interface SectorRotationEntry {
  sector: string;
  flow1W: number;
  flow1M: number;
  flowTrend: 'INFLOW' | 'OUTFLOW' | 'NEUTRAL';
  relativeStrength: number;
}

interface GeographicFlowEntry {
  region: string;
  flow1W: number;
  flow1M: number;
  flowYTD: number;
  pctOfTotal: number;
}

interface FlowMomentumEntry {
  fundName: string;
  ticker: string;
  consecutiveWeeks: number;
  direction: 'INFLOW' | 'OUTFLOW';
  totalFlowStreak: number;
  weeklyAvg: number;
}

interface LeveragedInverseEntry {
  ticker: string;
  name: string;
  type: 'BULL' | 'BEAR';
  leverage: string;
  flow1W: number;
  aum: number;
  pctOfAUM: number;
}

interface FundFlowSummary {
  totalNetFlows1W: number;
  topInflowCategory: string;
  topOutflowCategory: string;
  bullBearRatio: number;
  marketSentiment: 'RISK-ON' | 'RISK-OFF' | 'MIXED';
  timestamp: string;
}

interface FundFlowTrackerResponse {
  weeklyFlows: WeeklyFlowEntry[];
  topInflows: FundFlowEntry[];
  topOutflows: FundFlowEntry[];
  etfCreationRedemption: ETFCreationRedemption[];
  sectorRotation: SectorRotationEntry[];
  geographicFlows: GeographicFlowEntry[];
  flowMomentum: FlowMomentumEntry[];
  leveragedInverse: LeveragedInverseEntry[];
  summary: FundFlowSummary;
  timestamp: string;
}

// ── Cache ──

let cache: { data: FundFlowTrackerResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Weekly flows configuration ──

interface WeeklyFlowConfig {
  category: string;
  baseFlow1W: number;
  volatility: number;
  trendBias: number;
}

const WEEKLY_FLOW_CONFIGS: WeeklyFlowConfig[] = [
  { category: 'US Equity', baseFlow1W: 8.5, volatility: 4.0, trendBias: 0.3 },
  { category: 'Intl Equity', baseFlow1W: 2.1, volatility: 2.5, trendBias: -0.1 },
  { category: 'EM Equity', baseFlow1W: -1.2, volatility: 2.0, trendBias: -0.2 },
  { category: 'US Bonds', baseFlow1W: 5.3, volatility: 3.0, trendBias: 0.2 },
  { category: 'HY Bonds', baseFlow1W: 1.8, volatility: 1.5, trendBias: 0.1 },
  { category: 'IG Bonds', baseFlow1W: 3.2, volatility: 2.0, trendBias: 0.15 },
  { category: 'Money Market', baseFlow1W: 12.4, volatility: 8.0, trendBias: 0.5 },
  { category: 'Commodities', baseFlow1W: -0.6, volatility: 1.8, trendBias: -0.05 },
  { category: 'Sector ETFs', baseFlow1W: 1.4, volatility: 2.2, trendBias: 0.1 },
];

// ── Fund inflow/outflow configuration ──

interface FundConfig {
  fundName: string;
  ticker: string;
  category: string;
  baseAUM: number;
}

const TOP_INFLOW_CONFIGS: FundConfig[] = [
  { fundName: 'Vanguard S&P 500 ETF', ticker: 'VOO', category: 'US Equity', baseAUM: 420.5 },
  { fundName: 'iShares Core S&P 500 ETF', ticker: 'IVV', category: 'US Equity', baseAUM: 385.2 },
  { fundName: 'Vanguard Total Bond Market ETF', ticker: 'BND', category: 'US Bonds', baseAUM: 105.8 },
  { fundName: 'SPDR S&P 500 ETF Trust', ticker: 'SPY', category: 'US Equity', baseAUM: 510.3 },
  { fundName: 'iShares Core US Aggregate Bond ETF', ticker: 'AGG', category: 'US Bonds', baseAUM: 98.4 },
  { fundName: 'Vanguard Total Stock Market ETF', ticker: 'VTI', category: 'US Equity', baseAUM: 345.7 },
  { fundName: 'Invesco QQQ Trust', ticker: 'QQQ', category: 'US Equity', baseAUM: 265.1 },
  { fundName: 'Vanguard Total Intl Stock ETF', ticker: 'VXUS', category: 'Intl Equity', baseAUM: 72.3 },
  { fundName: 'iShares MSCI EAFE ETF', ticker: 'EFA', category: 'Intl Equity', baseAUM: 58.9 },
  { fundName: 'Schwab US Large-Cap ETF', ticker: 'SCHX', category: 'US Equity', baseAUM: 42.1 },
];

const TOP_OUTFLOW_CONFIGS: FundConfig[] = [
  { fundName: 'iShares China Large-Cap ETF', ticker: 'FXI', category: 'EM Equity', baseAUM: 6.8 },
  { fundName: 'iShares MSCI Emerging Markets ETF', ticker: 'EEM', category: 'EM Equity', baseAUM: 18.4 },
  { fundName: 'SPDR Bloomberg High Yield Bond ETF', ticker: 'JNK', category: 'HY Bonds', baseAUM: 8.2 },
  { fundName: 'iShares 20+ Year Treasury Bond ETF', ticker: 'TLT', category: 'US Bonds', baseAUM: 38.6 },
  { fundName: 'Vanguard Real Estate ETF', ticker: 'VNQ', category: 'Sector ETFs', baseAUM: 32.1 },
  { fundName: 'iShares Russell 2000 ETF', ticker: 'IWM', category: 'US Equity', baseAUM: 62.4 },
  { fundName: 'ARK Innovation ETF', ticker: 'ARKK', category: 'US Equity', baseAUM: 6.5 },
  { fundName: 'Energy Select Sector SPDR Fund', ticker: 'XLE', category: 'Sector ETFs', baseAUM: 36.8 },
  { fundName: 'iShares MSCI Brazil ETF', ticker: 'EWZ', category: 'EM Equity', baseAUM: 4.9 },
  { fundName: 'VanEck Gold Miners ETF', ticker: 'GDX', category: 'Commodities', baseAUM: 12.7 },
];

// ── ETF creation/redemption configuration ──

interface ETFCreationConfig {
  ticker: string;
  name: string;
  baseAUM: number;
  baseCreation: number;
  baseRedemption: number;
}

const ETF_CREATION_CONFIGS: ETFCreationConfig[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', baseAUM: 510.3, baseCreation: 3200, baseRedemption: 2800 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', baseAUM: 265.1, baseCreation: 1800, baseRedemption: 1500 },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', baseAUM: 62.4, baseCreation: 800, baseRedemption: 950 },
  { ticker: 'EFA', name: 'iShares MSCI EAFE ETF', baseAUM: 58.9, baseCreation: 600, baseRedemption: 700 },
  { ticker: 'AGG', name: 'iShares Core US Agg Bond ETF', baseAUM: 98.4, baseCreation: 1100, baseRedemption: 900 },
  { ticker: 'HYG', name: 'iShares iBoxx $ HY Corporate Bond ETF', baseAUM: 15.8, baseCreation: 450, baseRedemption: 520 },
  { ticker: 'LQD', name: 'iShares iBoxx $ IG Corporate Bond ETF', baseAUM: 32.5, baseCreation: 700, baseRedemption: 600 },
  { ticker: 'GLD', name: 'SPDR Gold Shares', baseAUM: 62.1, baseCreation: 350, baseRedemption: 380 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', baseAUM: 38.6, baseCreation: 500, baseRedemption: 650 },
];

// ── Sector rotation configuration ──

interface SectorConfig {
  sector: string;
  baseFlow1W: number;
  volatility: number;
  baseRelativeStrength: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Technology', baseFlow1W: 2.8, volatility: 1.5, baseRelativeStrength: 1.12 },
  { sector: 'Healthcare', baseFlow1W: 1.2, volatility: 1.0, baseRelativeStrength: 1.05 },
  { sector: 'Energy', baseFlow1W: -0.4, volatility: 1.2, baseRelativeStrength: 0.92 },
  { sector: 'Financials', baseFlow1W: 1.5, volatility: 1.3, baseRelativeStrength: 1.08 },
  { sector: 'Consumer Discretionary', baseFlow1W: 0.6, volatility: 1.1, baseRelativeStrength: 0.98 },
  { sector: 'Consumer Staples', baseFlow1W: 0.3, volatility: 0.7, baseRelativeStrength: 0.95 },
  { sector: 'Industrials', baseFlow1W: 0.8, volatility: 0.9, baseRelativeStrength: 1.02 },
  { sector: 'Materials', baseFlow1W: -0.2, volatility: 0.8, baseRelativeStrength: 0.90 },
  { sector: 'Utilities', baseFlow1W: 0.5, volatility: 0.6, baseRelativeStrength: 0.97 },
  { sector: 'Real Estate', baseFlow1W: -0.3, volatility: 0.9, baseRelativeStrength: 0.88 },
  { sector: 'Communication Services', baseFlow1W: 1.0, volatility: 1.1, baseRelativeStrength: 1.04 },
];

// ── Geographic flows configuration ──

interface GeoFlowConfig {
  region: string;
  baseFlow1W: number;
  volatility: number;
  basePctOfTotal: number;
}

const GEO_FLOW_CONFIGS: GeoFlowConfig[] = [
  { region: 'US', baseFlow1W: 14.2, volatility: 5.0, basePctOfTotal: 52.8 },
  { region: 'Europe', baseFlow1W: 2.8, volatility: 2.5, basePctOfTotal: 18.4 },
  { region: 'Japan', baseFlow1W: 1.1, volatility: 1.5, basePctOfTotal: 8.2 },
  { region: 'China', baseFlow1W: -1.5, volatility: 2.0, basePctOfTotal: 7.6 },
  { region: 'EM ex-China', baseFlow1W: -0.3, volatility: 1.8, basePctOfTotal: 8.5 },
  { region: 'Other', baseFlow1W: 0.7, volatility: 1.2, basePctOfTotal: 4.5 },
];

// ── Flow momentum configuration ──

interface MomentumConfig {
  fundName: string;
  ticker: string;
  baseConsecutiveWeeks: number;
  direction: 'INFLOW' | 'OUTFLOW';
  baseWeeklyAvg: number;
}

const MOMENTUM_CONFIGS: MomentumConfig[] = [
  { fundName: 'Vanguard S&P 500 ETF', ticker: 'VOO', baseConsecutiveWeeks: 18, direction: 'INFLOW', baseWeeklyAvg: 4.2 },
  { fundName: 'iShares Core S&P 500 ETF', ticker: 'IVV', baseConsecutiveWeeks: 14, direction: 'INFLOW', baseWeeklyAvg: 3.8 },
  { fundName: 'Vanguard Total Bond Market ETF', ticker: 'BND', baseConsecutiveWeeks: 12, direction: 'INFLOW', baseWeeklyAvg: 1.9 },
  { fundName: 'Invesco QQQ Trust', ticker: 'QQQ', baseConsecutiveWeeks: 10, direction: 'INFLOW', baseWeeklyAvg: 2.5 },
  { fundName: 'Schwab US Large-Cap ETF', ticker: 'SCHX', baseConsecutiveWeeks: 22, direction: 'INFLOW', baseWeeklyAvg: 1.1 },
  { fundName: 'iShares MSCI Emerging Markets ETF', ticker: 'EEM', baseConsecutiveWeeks: 8, direction: 'OUTFLOW', baseWeeklyAvg: -0.9 },
  { fundName: 'ARK Innovation ETF', ticker: 'ARKK', baseConsecutiveWeeks: 15, direction: 'OUTFLOW', baseWeeklyAvg: -0.4 },
  { fundName: 'iShares China Large-Cap ETF', ticker: 'FXI', baseConsecutiveWeeks: 6, direction: 'OUTFLOW', baseWeeklyAvg: -0.3 },
  { fundName: 'SPDR Bloomberg High Yield Bond ETF', ticker: 'JNK', baseConsecutiveWeeks: 5, direction: 'OUTFLOW', baseWeeklyAvg: -0.5 },
  { fundName: 'Vanguard Real Estate ETF', ticker: 'VNQ', baseConsecutiveWeeks: 7, direction: 'OUTFLOW', baseWeeklyAvg: -0.6 },
];

// ── Leveraged/inverse ETF configuration ──

interface LeveragedConfig {
  ticker: string;
  name: string;
  type: 'BULL' | 'BEAR';
  leverage: string;
  baseAUM: number;
  baseFlow1W: number;
}

const LEVERAGED_CONFIGS: LeveragedConfig[] = [
  { ticker: 'TQQQ', name: 'ProShares UltraPro QQQ', type: 'BULL', leverage: '3x', baseAUM: 22.5, baseFlow1W: 1.2 },
  { ticker: 'SPXL', name: 'Direxion Daily S&P 500 Bull 3X', type: 'BULL', leverage: '3x', baseAUM: 4.8, baseFlow1W: 0.3 },
  { ticker: 'UPRO', name: 'ProShares UltraPro S&P 500', type: 'BULL', leverage: '3x', baseAUM: 3.9, baseFlow1W: 0.25 },
  { ticker: 'SSO', name: 'ProShares Ultra S&P 500', type: 'BULL', leverage: '2x', baseAUM: 5.1, baseFlow1W: 0.18 },
  { ticker: 'QLD', name: 'ProShares Ultra QQQ', type: 'BULL', leverage: '2x', baseAUM: 7.2, baseFlow1W: 0.4 },
  { ticker: 'SQQQ', name: 'ProShares UltraPro Short QQQ', type: 'BEAR', leverage: '-3x', baseAUM: 5.8, baseFlow1W: -0.3 },
  { ticker: 'SPXS', name: 'Direxion Daily S&P 500 Bear 3X', type: 'BEAR', leverage: '-3x', baseAUM: 1.2, baseFlow1W: -0.1 },
  { ticker: 'SOXS', name: 'Direxion Daily Semicond Bear 3X', type: 'BEAR', leverage: '-3x', baseAUM: 1.5, baseFlow1W: -0.15 },
  { ticker: 'SH', name: 'ProShares Short S&P 500', type: 'BEAR', leverage: '-1x', baseAUM: 2.8, baseFlow1W: -0.08 },
  { ticker: 'PSQ', name: 'ProShares Short QQQ', type: 'BEAR', leverage: '-1x', baseAUM: 1.9, baseFlow1W: -0.06 },
];

// ── Data generation ──

function generateWeeklyFlows(rng: () => number): WeeklyFlowEntry[] {
  return WEEKLY_FLOW_CONFIGS.map((cfg) => {
    const jitter1W = (rng() - 0.5) * cfg.volatility * 2;
    const flow1W = Math.round((cfg.baseFlow1W + jitter1W + cfg.trendBias) * 10) / 10;

    const flow1M = Math.round((flow1W * (3.5 + rng() * 1.5) + (rng() - 0.5) * cfg.volatility * 3) * 10) / 10;
    const flow3M = Math.round((flow1M * (2.5 + rng() * 1.0) + (rng() - 0.5) * cfg.volatility * 5) * 10) / 10;
    const flowYTD = Math.round((flow3M * (1.5 + rng() * 1.5) + (rng() - 0.5) * cfg.volatility * 8) * 10) / 10;

    return {
      category: cfg.category,
      flow1W,
      flow1M,
      flow3M,
      flowYTD,
    };
  });
}

function generateFundFlows(rng: () => number, configs: FundConfig[], isOutflow: boolean): FundFlowEntry[] {
  return configs.map((cfg) => {
    const baseFlow = isOutflow
      ? -(0.5 + rng() * 2.5)
      : (0.5 + rng() * 4.5);
    const flowAmount = Math.round(baseFlow * 100) / 100;

    const aumJitter = (rng() - 0.5) * cfg.baseAUM * 0.05;
    const aum = Math.round((cfg.baseAUM + aumJitter) * 10) / 10;

    const pctOfAUM = Math.round((Math.abs(flowAmount) / aum) * 10000) / 100;

    return {
      fundName: cfg.fundName,
      ticker: cfg.ticker,
      category: cfg.category,
      flowAmount,
      aum,
      pctOfAUM,
    };
  });
}

function generateETFCreationRedemption(rng: () => number): ETFCreationRedemption[] {
  return ETF_CREATION_CONFIGS.map((cfg) => {
    const creationJitter = Math.floor((rng() - 0.5) * cfg.baseCreation * 0.3);
    const creationUnits = cfg.baseCreation + creationJitter;

    const redemptionJitter = Math.floor((rng() - 0.5) * cfg.baseRedemption * 0.3);
    const redemptionUnits = cfg.baseRedemption + redemptionJitter;

    const netFlow = creationUnits - redemptionUnits;

    const aumJitter = (rng() - 0.5) * cfg.baseAUM * 0.03;
    const aum = Math.round((cfg.baseAUM + aumJitter) * 10) / 10;

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      creationUnits,
      redemptionUnits,
      netFlow,
      aum,
    };
  });
}

function generateSectorRotation(rng: () => number): SectorRotationEntry[] {
  return SECTOR_CONFIGS.map((cfg) => {
    const jitter1W = (rng() - 0.5) * cfg.volatility * 2;
    const flow1W = Math.round((cfg.baseFlow1W + jitter1W) * 100) / 100;

    const flow1M = Math.round((flow1W * (3.5 + rng() * 1.5) + (rng() - 0.5) * cfg.volatility * 2) * 100) / 100;

    let flowTrend: 'INFLOW' | 'OUTFLOW' | 'NEUTRAL';
    if (flow1W > 0.3) {
      flowTrend = 'INFLOW';
    } else if (flow1W < -0.3) {
      flowTrend = 'OUTFLOW';
    } else {
      flowTrend = 'NEUTRAL';
    }

    const rsJitter = (rng() - 0.5) * 0.1;
    const relativeStrength = Math.round((cfg.baseRelativeStrength + rsJitter) * 100) / 100;

    return {
      sector: cfg.sector,
      flow1W,
      flow1M,
      flowTrend,
      relativeStrength,
    };
  });
}

function generateGeographicFlows(rng: () => number): GeographicFlowEntry[] {
  const entries = GEO_FLOW_CONFIGS.map((cfg) => {
    const jitter1W = (rng() - 0.5) * cfg.volatility * 2;
    const flow1W = Math.round((cfg.baseFlow1W + jitter1W) * 10) / 10;

    const flow1M = Math.round((flow1W * (3.5 + rng() * 1.5) + (rng() - 0.5) * cfg.volatility * 3) * 10) / 10;
    const flowYTD = Math.round((flow1M * (2.0 + rng() * 2.0) + (rng() - 0.5) * cfg.volatility * 6) * 10) / 10;

    const pctJitter = (rng() - 0.5) * 3;
    const pctOfTotal = Math.round(Math.max(1, cfg.basePctOfTotal + pctJitter) * 10) / 10;

    return {
      region: cfg.region,
      flow1W,
      flow1M,
      flowYTD,
      pctOfTotal,
    };
  });

  // Normalize pctOfTotal to sum to 100
  const totalPct = entries.reduce((sum, e) => sum + e.pctOfTotal, 0);
  entries.forEach((e) => {
    e.pctOfTotal = Math.round((e.pctOfTotal / totalPct) * 1000) / 10;
  });

  return entries;
}

function generateFlowMomentum(rng: () => number): FlowMomentumEntry[] {
  return MOMENTUM_CONFIGS.map((cfg) => {
    const weeksJitter = Math.floor((rng() - 0.5) * 6);
    const consecutiveWeeks = Math.max(3, cfg.baseConsecutiveWeeks + weeksJitter);

    const avgJitter = (rng() - 0.5) * Math.abs(cfg.baseWeeklyAvg) * 0.3;
    const weeklyAvg = Math.round((cfg.baseWeeklyAvg + avgJitter) * 100) / 100;

    const totalFlowStreak = Math.round(weeklyAvg * consecutiveWeeks * 10) / 10;

    return {
      fundName: cfg.fundName,
      ticker: cfg.ticker,
      consecutiveWeeks,
      direction: cfg.direction,
      totalFlowStreak,
      weeklyAvg,
    };
  });
}

function generateLeveragedInverse(rng: () => number): LeveragedInverseEntry[] {
  return LEVERAGED_CONFIGS.map((cfg) => {
    const flowJitter = (rng() - 0.5) * Math.abs(cfg.baseFlow1W) * 0.6;
    const flow1W = Math.round((cfg.baseFlow1W + flowJitter) * 100) / 100;

    const aumJitter = (rng() - 0.5) * cfg.baseAUM * 0.08;
    const aum = Math.round((cfg.baseAUM + aumJitter) * 10) / 10;

    const pctOfAUM = Math.round((Math.abs(flow1W) / aum) * 10000) / 100;

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      type: cfg.type,
      leverage: cfg.leverage,
      flow1W,
      aum,
      pctOfAUM,
    };
  });
}

function generateFundFlowTrackerData(): FundFlowTrackerResponse {
  const rng = seededRandom('fund-flow-tracker');

  const weeklyFlows = generateWeeklyFlows(rng);
  const topInflows = generateFundFlows(rng, TOP_INFLOW_CONFIGS, false);
  const topOutflows = generateFundFlows(rng, TOP_OUTFLOW_CONFIGS, true);
  const etfCreationRedemption = generateETFCreationRedemption(rng);
  const sectorRotation = generateSectorRotation(rng);
  const geographicFlows = generateGeographicFlows(rng);
  const flowMomentum = generateFlowMomentum(rng);
  const leveragedInverse = generateLeveragedInverse(rng);

  // Summary
  const totalNetFlows1W = Math.round(
    weeklyFlows.reduce((sum, f) => sum + f.flow1W, 0) * 10
  ) / 10;

  const sortedByFlow = [...weeklyFlows].sort((a, b) => b.flow1W - a.flow1W);
  const topInflowCategory = sortedByFlow[0].category;
  const topOutflowCategory = sortedByFlow[sortedByFlow.length - 1].category;

  // Bull/bear ratio from leveraged ETFs
  const bullFlows = leveragedInverse
    .filter((e) => e.type === 'BULL')
    .reduce((sum, e) => sum + e.flow1W, 0);
  const bearFlows = leveragedInverse
    .filter((e) => e.type === 'BEAR')
    .reduce((sum, e) => sum + Math.abs(e.flow1W), 0);
  const bullBearRatio = bearFlows > 0
    ? Math.round((bullFlows / bearFlows) * 100) / 100
    : 999;

  let marketSentiment: 'RISK-ON' | 'RISK-OFF' | 'MIXED';
  if (totalNetFlows1W > 15 && bullBearRatio > 2.5) {
    marketSentiment = 'RISK-ON';
  } else if (totalNetFlows1W < -5 || bullBearRatio < 1.0) {
    marketSentiment = 'RISK-OFF';
  } else {
    marketSentiment = 'MIXED';
  }

  const timestamp = new Date().toISOString();

  const summary: FundFlowSummary = {
    totalNetFlows1W,
    topInflowCategory,
    topOutflowCategory,
    bullBearRatio,
    marketSentiment,
    timestamp,
  };

  return {
    weeklyFlows,
    topInflows,
    topOutflows,
    etfCreationRedemption,
    sectorRotation,
    geographicFlows,
    flowMomentum,
    leveragedInverse,
    summary,
    timestamp,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateFundFlowTrackerData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FundFlowTracker] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate fund flow tracker data' });
  }
});

export default router;
