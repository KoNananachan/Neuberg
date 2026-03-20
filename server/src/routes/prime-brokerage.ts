import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface BrokerEntry {
  name: string;
  aumServiced: number;        // $B
  hfClients: number;
  marketShare: number;        // %
  overnightRate: number;      // %
  termRate: number;           // %
  spreadToSOFR: number;       // bps
  tier: 'Tier 1' | 'Tier 2';
}

interface MarginFinancingEntry {
  collateralType: string;
  haircut: number;            // %
  overnightRate: number;      // %
  termRate30d: number;        // %
  termRate90d: number;        // %
  spreadToBase: number;       // bps
  concentrationLimit: number; // %
}

interface StockLoanEntry {
  ticker: string;
  name: string;
  utilization: number;        // %
  borrowCost: number;         // % annualized
  daysToRecall: number;
  lendableShares: number;     // M shares
  sharesOnLoan: number;       // M shares
  category: 'GC' | 'Warm' | 'Special';
}

interface StockLoanSummary {
  gcRate: number;
  specialsAvgRate: number;
  hardToBorrowCount: number;
  totalLendableValue: number; // $B
  totalOnLoanValue: number;   // $B
  avgUtilization: number;     // %
}

interface SyntheticFinancingEntry {
  product: string;
  notional: number;           // $B
  rate: number;               // %
  change1w: number;           // bps
  fundingSpread: number;      // bps
  termAvailable: string;
}

interface ClientFlowEntry {
  sector: string;
  grossExposure: number;      // $B
  netExposure: number;        // $B
  longShortRatio: number;
  change1w: number;           // %
  tilt: 'Long' | 'Short' | 'Neutral';
}

interface ClientFlowSummary {
  totalGrossExposure: number; // $B
  totalNetExposure: number;   // $B
  avgLongShortRatio: number;
  avgGrossLeverage: number;   // x
  avgNetLeverage: number;     // x
}

interface CapitalIntroEntry {
  event: string;
  fundName: string;
  strategy: string;
  aum: number;                // $M
  date: string;
  type: 'Launch' | 'Closure' | 'Capital Raise' | 'Spin-off';
}

interface RegulatoryImpactEntry {
  regulation: string;
  metric: string;
  currentValue: number;
  threshold: number;
  unit: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
  description: string;
}

interface TechnologyMetricEntry {
  metric: string;
  value: number;
  unit: string;
  benchmark: number;
  percentile: number;         // vs peers
  trend: 'UP' | 'DOWN' | 'FLAT';
}

interface PrimeBrokerageResponse {
  brokers: BrokerEntry[];
  marginFinancing: MarginFinancingEntry[];
  stockLoan: {
    securities: StockLoanEntry[];
    summary: StockLoanSummary;
  };
  syntheticFinancing: SyntheticFinancingEntry[];
  clientFlows: {
    sectors: ClientFlowEntry[];
    summary: ClientFlowSummary;
  };
  capitalIntro: CapitalIntroEntry[];
  regulatoryImpact: RegulatoryImpactEntry[];
  technology: TechnologyMetricEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: PrimeBrokerageResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Broker configuration ──

interface BrokerConfig {
  name: string;
  baseAum: number;        // $B
  baseClients: number;
  baseMarketShare: number;
  baseOvernightSpread: number; // bps over SOFR
  baseTermSpread: number;      // bps over SOFR
  tier: 'Tier 1' | 'Tier 2';
}

const BROKER_CONFIGS: BrokerConfig[] = [
  { name: 'Goldman Sachs', baseAum: 620, baseClients: 1850, baseMarketShare: 21.5, baseOvernightSpread: 35, baseTermSpread: 55, tier: 'Tier 1' },
  { name: 'Morgan Stanley', baseAum: 580, baseClients: 1720, baseMarketShare: 20.1, baseOvernightSpread: 33, baseTermSpread: 52, tier: 'Tier 1' },
  { name: 'JPMorgan', baseAum: 510, baseClients: 1480, baseMarketShare: 17.7, baseOvernightSpread: 32, baseTermSpread: 50, tier: 'Tier 1' },
  { name: 'UBS', baseAum: 280, baseClients: 920, baseMarketShare: 9.7, baseOvernightSpread: 40, baseTermSpread: 62, tier: 'Tier 1' },
  { name: 'BofA Securities', baseAum: 240, baseClients: 780, baseMarketShare: 8.3, baseOvernightSpread: 38, baseTermSpread: 58, tier: 'Tier 1' },
  { name: 'Barclays', baseAum: 210, baseClients: 650, baseMarketShare: 7.3, baseOvernightSpread: 42, baseTermSpread: 65, tier: 'Tier 2' },
  { name: 'Citi', baseAum: 195, baseClients: 580, baseMarketShare: 6.8, baseOvernightSpread: 44, baseTermSpread: 68, tier: 'Tier 2' },
  { name: 'Deutsche Bank', baseAum: 150, baseClients: 420, baseMarketShare: 5.2, baseOvernightSpread: 48, baseTermSpread: 72, tier: 'Tier 2' },
];

// ── Margin financing configuration ──

interface MarginFinancingConfig {
  collateralType: string;
  baseHaircut: number;
  baseOvernightSpread: number; // bps
  baseTerm30dSpread: number;
  baseTerm90dSpread: number;
  concentrationLimit: number;
}

const MARGIN_FINANCING_CONFIGS: MarginFinancingConfig[] = [
  { collateralType: 'US Equities (Large Cap)', baseHaircut: 15, baseOvernightSpread: 35, baseTerm30dSpread: 50, baseTerm90dSpread: 68, concentrationLimit: 30 },
  { collateralType: 'US Equities (Small/Mid Cap)', baseHaircut: 25, baseOvernightSpread: 55, baseTerm30dSpread: 75, baseTerm90dSpread: 95, concentrationLimit: 15 },
  { collateralType: 'International Equities (DM)', baseHaircut: 20, baseOvernightSpread: 45, baseTerm30dSpread: 65, baseTerm90dSpread: 82, concentrationLimit: 25 },
  { collateralType: 'International Equities (EM)', baseHaircut: 35, baseOvernightSpread: 85, baseTerm30dSpread: 110, baseTerm90dSpread: 135, concentrationLimit: 10 },
  { collateralType: 'US Government Bonds', baseHaircut: 2, baseOvernightSpread: 8, baseTerm30dSpread: 12, baseTerm90dSpread: 18, concentrationLimit: 100 },
  { collateralType: 'Investment Grade Corp Bonds', baseHaircut: 8, baseOvernightSpread: 25, baseTerm30dSpread: 38, baseTerm90dSpread: 52, concentrationLimit: 20 },
  { collateralType: 'High Yield Corp Bonds', baseHaircut: 15, baseOvernightSpread: 65, baseTerm30dSpread: 85, baseTerm90dSpread: 110, concentrationLimit: 10 },
  { collateralType: 'Convertible Bonds', baseHaircut: 20, baseOvernightSpread: 75, baseTerm30dSpread: 95, baseTerm90dSpread: 120, concentrationLimit: 10 },
];

// ── Stock loan configuration ──

interface StockLoanConfig {
  ticker: string;
  name: string;
  baseUtilization: number;
  baseBorrowCost: number;
  baseLendableShares: number; // M
  baseDaysToRecall: number;
}

const STOCK_LOAN_CONFIGS: StockLoanConfig[] = [
  { ticker: 'GME', name: 'GameStop Corp', baseUtilization: 92, baseBorrowCost: 28.5, baseLendableShares: 45.2, baseDaysToRecall: 1 },
  { ticker: 'AMC', name: 'AMC Entertainment', baseUtilization: 88, baseBorrowCost: 22.3, baseLendableShares: 62.1, baseDaysToRecall: 1 },
  { ticker: 'CVNA', name: 'Carvana Co', baseUtilization: 85, baseBorrowCost: 18.7, baseLendableShares: 28.4, baseDaysToRecall: 2 },
  { ticker: 'BYND', name: 'Beyond Meat', baseUtilization: 78, baseBorrowCost: 15.2, baseLendableShares: 18.9, baseDaysToRecall: 2 },
  { ticker: 'UPST', name: 'Upstart Holdings', baseUtilization: 74, baseBorrowCost: 12.8, baseLendableShares: 22.6, baseDaysToRecall: 2 },
  { ticker: 'BBBY', name: 'Bed Bath & Beyond', baseUtilization: 95, baseBorrowCost: 45.0, baseLendableShares: 8.3, baseDaysToRecall: 1 },
  { ticker: 'FFIE', name: 'Faraday Future', baseUtilization: 82, baseBorrowCost: 35.0, baseLendableShares: 12.5, baseDaysToRecall: 1 },
  { ticker: 'MARA', name: 'Marathon Digital', baseUtilization: 68, baseBorrowCost: 8.5, baseLendableShares: 35.8, baseDaysToRecall: 3 },
  { ticker: 'RIVN', name: 'Rivian Automotive', baseUtilization: 55, baseBorrowCost: 4.2, baseLendableShares: 88.4, baseDaysToRecall: 3 },
  { ticker: 'LCID', name: 'Lucid Group', baseUtilization: 62, baseBorrowCost: 6.8, baseLendableShares: 52.1, baseDaysToRecall: 3 },
  { ticker: 'TSLA', name: 'Tesla Inc', baseUtilization: 28, baseBorrowCost: 0.35, baseLendableShares: 420.5, baseDaysToRecall: 5 },
  { ticker: 'AAPL', name: 'Apple Inc', baseUtilization: 12, baseBorrowCost: 0.25, baseLendableShares: 850.2, baseDaysToRecall: 5 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', baseUtilization: 35, baseBorrowCost: 0.45, baseLendableShares: 520.8, baseDaysToRecall: 5 },
  { ticker: 'META', name: 'Meta Platforms', baseUtilization: 18, baseBorrowCost: 0.30, baseLendableShares: 380.6, baseDaysToRecall: 5 },
  { ticker: 'SMCI', name: 'Super Micro Computer', baseUtilization: 72, baseBorrowCost: 10.5, baseLendableShares: 24.2, baseDaysToRecall: 2 },
];

// ── Synthetic financing configuration ──

interface SyntheticFinancingConfig {
  product: string;
  baseNotional: number;       // $B
  baseRate: number;           // %
  baseFundingSpread: number;  // bps
  termAvailable: string;
}

const SYNTHETIC_FINANCING_CONFIGS: SyntheticFinancingConfig[] = [
  { product: 'Total Return Swap (Equity)', baseNotional: 185, baseRate: 4.82, baseFundingSpread: 45, termAvailable: '1M-2Y' },
  { product: 'Total Return Swap (Credit)', baseNotional: 72, baseRate: 5.15, baseFundingSpread: 62, termAvailable: '3M-5Y' },
  { product: 'Portfolio Swap (Long/Short)', baseNotional: 245, baseRate: 4.68, baseFundingSpread: 38, termAvailable: '1M-1Y' },
  { product: 'Portfolio Swap (Market Neutral)', baseNotional: 128, baseRate: 4.55, baseFundingSpread: 32, termAvailable: '1M-1Y' },
  { product: 'Delta One (Single Stock)', baseNotional: 95, baseRate: 4.90, baseFundingSpread: 52, termAvailable: '1W-6M' },
  { product: 'Delta One (Index)', baseNotional: 310, baseRate: 4.42, baseFundingSpread: 22, termAvailable: '1W-1Y' },
  { product: 'CFD (International)', baseNotional: 68, baseRate: 5.25, baseFundingSpread: 75, termAvailable: 'O/N-3M' },
  { product: 'Dividend Swap', baseNotional: 32, baseRate: 5.45, baseFundingSpread: 88, termAvailable: '3M-3Y' },
];

// ── Client flow configuration ──

interface ClientFlowConfig {
  sector: string;
  baseGross: number;  // $B
  baseNet: number;    // $B
  baseLSRatio: number;
}

const CLIENT_FLOW_CONFIGS: ClientFlowConfig[] = [
  { sector: 'Technology', baseGross: 285, baseNet: 48, baseLSRatio: 1.42 },
  { sector: 'Healthcare', baseGross: 165, baseNet: 22, baseLSRatio: 1.28 },
  { sector: 'Financials', baseGross: 198, baseNet: -15, baseLSRatio: 0.88 },
  { sector: 'Consumer Discretionary', baseGross: 142, baseNet: 12, baseLSRatio: 1.18 },
  { sector: 'Energy', baseGross: 118, baseNet: -28, baseLSRatio: 0.72 },
  { sector: 'Industrials', baseGross: 132, baseNet: 8, baseLSRatio: 1.12 },
  { sector: 'Communication Services', baseGross: 95, baseNet: 18, baseLSRatio: 1.45 },
  { sector: 'Materials', baseGross: 62, baseNet: -5, baseLSRatio: 0.92 },
  { sector: 'Utilities', baseGross: 38, baseNet: -12, baseLSRatio: 0.62 },
  { sector: 'Real Estate', baseGross: 55, baseNet: -8, baseLSRatio: 0.78 },
];

// ── Capital intro configuration ──

interface CapitalIntroConfig {
  event: string;
  fundName: string;
  strategy: string;
  baseAum: number;     // $M
  type: 'Launch' | 'Closure' | 'Capital Raise' | 'Spin-off';
  dayOffset: number;   // days before today
}

const CAPITAL_INTRO_CONFIGS: CapitalIntroConfig[] = [
  { event: 'New Fund Launch', fundName: 'Apex Quant Alpha Fund', strategy: 'Systematic Equity L/S', baseAum: 850, type: 'Launch', dayOffset: 1 },
  { event: 'Capital Raise Completed', fundName: 'Evergreen Macro Partners', strategy: 'Global Macro', baseAum: 2400, type: 'Capital Raise', dayOffset: 2 },
  { event: 'Fund Closure Announced', fundName: 'Silverlake Event Driven', strategy: 'Event Driven', baseAum: 380, type: 'Closure', dayOffset: 3 },
  { event: 'Spin-off Fund Launch', fundName: 'Meridian Credit Opportunities', strategy: 'Distressed Credit', baseAum: 1200, type: 'Spin-off', dayOffset: 4 },
  { event: 'New Fund Launch', fundName: 'QuantBridge Statistical Arb', strategy: 'Statistical Arbitrage', baseAum: 550, type: 'Launch', dayOffset: 5 },
  { event: 'Capital Raise Completed', fundName: 'Horizon Multi-Strategy', strategy: 'Multi-Strategy', baseAum: 4800, type: 'Capital Raise', dayOffset: 6 },
  { event: 'Fund Closure Announced', fundName: 'Atlas Volatility Fund', strategy: 'Volatility Arbitrage', baseAum: 210, type: 'Closure', dayOffset: 7 },
  { event: 'New Fund Launch', fundName: 'Polaris AI Alpha', strategy: 'Machine Learning', baseAum: 680, type: 'Launch', dayOffset: 8 },
  { event: 'Capital Raise Completed', fundName: 'Summit Long-Biased Equity', strategy: 'Long-Biased Equity', baseAum: 3200, type: 'Capital Raise', dayOffset: 10 },
  { event: 'Spin-off Fund Launch', fundName: 'Vanguard Activist Value', strategy: 'Activist', baseAum: 1800, type: 'Spin-off', dayOffset: 12 },
];

// ── Regulatory impact configuration ──

interface RegulatoryImpactConfig {
  regulation: string;
  metric: string;
  baseValue: number;
  threshold: number;
  unit: string;
  baseImpact: 'Positive' | 'Negative' | 'Neutral';
  description: string;
}

const REGULATORY_IMPACT_CONFIGS: RegulatoryImpactConfig[] = [
  { regulation: 'Basel III - LCR', metric: 'Liquidity Coverage Ratio', baseValue: 128, threshold: 100, unit: '%', baseImpact: 'Neutral', description: 'Adequate high-quality liquid assets to cover 30-day stressed outflows' },
  { regulation: 'Basel III - NSFR', metric: 'Net Stable Funding Ratio', baseValue: 112, threshold: 100, unit: '%', baseImpact: 'Neutral', description: 'Stable funding exceeds required stable funding over 1-year horizon' },
  { regulation: 'Basel III - Leverage Ratio', metric: 'Tier 1 Leverage Ratio', baseValue: 5.8, threshold: 5.0, unit: '%', baseImpact: 'Negative', description: 'PB balance sheet usage constrained by leverage ratio denominator' },
  { regulation: 'Basel IV - SA-CCR', metric: 'Counterparty Credit Risk RWA', baseValue: 42.5, threshold: 0, unit: '$B', baseImpact: 'Negative', description: 'Standardized approach increases RWA for derivative exposures' },
  { regulation: 'SLR (Supplementary Leverage Ratio)', metric: 'SLR Ratio', baseValue: 6.2, threshold: 5.0, unit: '%', baseImpact: 'Negative', description: 'Treasury holdings and repo consume SLR capacity, limiting PB expansion' },
  { regulation: 'G-SIB Surcharge', metric: 'G-SIB Buffer', baseValue: 3.5, threshold: 2.5, unit: '%', baseImpact: 'Negative', description: 'Additional capital surcharge for systemically important banks increases cost of PB services' },
  { regulation: 'Volcker Rule', metric: 'Prop Trading Revenue', baseValue: 0, threshold: 0, unit: '$M', baseImpact: 'Neutral', description: 'Prohibited proprietary trading; PB client facilitation exempt' },
  { regulation: 'SEC Rule 15c3-3', metric: 'Customer Reserve Requirement', baseValue: 18.5, threshold: 0, unit: '$B', baseImpact: 'Negative', description: 'Segregation requirements for customer free credit balances' },
  { regulation: 'Margin Reform (UMR)', metric: 'Initial Margin Collected', baseValue: 8.2, threshold: 0, unit: '$B', baseImpact: 'Neutral', description: 'Uncleared margin rules increase collateral requirements for OTC derivatives' },
  { regulation: 'FRTB (Fundamental Review)', metric: 'Market Risk RWA Impact', baseValue: 15.8, threshold: 0, unit: '%', baseImpact: 'Negative', description: 'Expected increase in market risk capital under revised standardized approach' },
];

// ── Technology metrics configuration ──

interface TechnologyConfig {
  metric: string;
  baseValue: number;
  unit: string;
  benchmark: number;
  basePctile: number;
  volatility: number;
  trendBias: number;
}

const TECHNOLOGY_CONFIGS: TechnologyConfig[] = [
  { metric: 'Order-to-Fill Latency (Equities)', baseValue: 0.45, unit: 'ms', benchmark: 0.80, basePctile: 92, volatility: 0.08, trendBias: -0.02 },
  { metric: 'Order-to-Fill Latency (Options)', baseValue: 1.2, unit: 'ms', benchmark: 2.0, basePctile: 88, volatility: 0.2, trendBias: -0.05 },
  { metric: 'FIX Gateway Uptime', baseValue: 99.97, unit: '%', benchmark: 99.90, basePctile: 95, volatility: 0.02, trendBias: 0.005 },
  { metric: 'Algo Execution Rate', baseValue: 72.5, unit: '%', benchmark: 65.0, basePctile: 85, volatility: 3.0, trendBias: 1.5 },
  { metric: 'VWAP Slippage', baseValue: 0.8, unit: 'bps', benchmark: 1.5, basePctile: 90, volatility: 0.3, trendBias: -0.1 },
  { metric: 'Implementation Shortfall', baseValue: 2.1, unit: 'bps', benchmark: 3.5, basePctile: 87, volatility: 0.5, trendBias: -0.15 },
  { metric: 'Dark Pool Fill Rate', baseValue: 38.5, unit: '%', benchmark: 32.0, basePctile: 82, volatility: 3.5, trendBias: 0.8 },
  { metric: 'SOR Optimization Score', baseValue: 94.2, unit: 'pts', benchmark: 88.0, basePctile: 91, volatility: 1.5, trendBias: 0.3 },
  { metric: 'Market Data Latency', baseValue: 0.12, unit: 'ms', benchmark: 0.25, basePctile: 94, volatility: 0.03, trendBias: -0.01 },
  { metric: 'Daily Algo Orders Processed', baseValue: 2850000, unit: 'orders', benchmark: 1800000, basePctile: 89, volatility: 250000, trendBias: 50000 },
  { metric: 'Cross-Asset Netting Efficiency', baseValue: 87.3, unit: '%', benchmark: 78.0, basePctile: 86, volatility: 2.0, trendBias: 0.5 },
  { metric: 'API Response Time (Risk)', baseValue: 18.5, unit: 'ms', benchmark: 35.0, basePctile: 93, volatility: 3.0, trendBias: -0.8 },
];

// ── Data generation ──

const SOFR_BASE = 4.31;

function generateBrokers(rng: () => number): BrokerEntry[] {
  const sofrRate = SOFR_BASE + (rng() - 0.5) * 0.06;

  return BROKER_CONFIGS.map((cfg) => {
    const aumJitter = (rng() - 0.5) * cfg.baseAum * 0.08;
    const aumServiced = Math.round(cfg.baseAum + aumJitter);

    const clientJitter = Math.floor((rng() - 0.5) * cfg.baseClients * 0.06);
    const hfClients = cfg.baseClients + clientJitter;

    const shareJitter = (rng() - 0.5) * 1.5;
    const marketShare = Math.round((cfg.baseMarketShare + shareJitter) * 10) / 10;

    const onSpreadJitter = (rng() - 0.5) * 8;
    const onSpread = cfg.baseOvernightSpread + onSpreadJitter;
    const overnightRate = Math.round((sofrRate + onSpread / 100) * 10000) / 10000;

    const termSpreadJitter = (rng() - 0.5) * 10;
    const termSpread = cfg.baseTermSpread + termSpreadJitter;
    const termRate = Math.round((sofrRate + termSpread / 100) * 10000) / 10000;

    const spreadToSOFR = Math.round(onSpread * 10) / 10;

    return {
      name: cfg.name,
      aumServiced,
      hfClients,
      marketShare,
      overnightRate,
      termRate,
      spreadToSOFR,
      tier: cfg.tier,
    };
  });
}

function generateMarginFinancing(rng: () => number): MarginFinancingEntry[] {
  const sofrRate = SOFR_BASE + (rng() - 0.5) * 0.06;

  return MARGIN_FINANCING_CONFIGS.map((cfg) => {
    const haircutJitter = (rng() - 0.5) * cfg.baseHaircut * 0.1;
    const haircut = Math.round((cfg.baseHaircut + haircutJitter) * 10) / 10;

    const onSpreadJitter = (rng() - 0.5) * 6;
    const onSpread = cfg.baseOvernightSpread + onSpreadJitter;
    const overnightRate = Math.round((sofrRate + onSpread / 100) * 10000) / 10000;

    const t30SpreadJitter = (rng() - 0.5) * 8;
    const t30Spread = cfg.baseTerm30dSpread + t30SpreadJitter;
    const termRate30d = Math.round((sofrRate + t30Spread / 100) * 10000) / 10000;

    const t90SpreadJitter = (rng() - 0.5) * 10;
    const t90Spread = cfg.baseTerm90dSpread + t90SpreadJitter;
    const termRate90d = Math.round((sofrRate + t90Spread / 100) * 10000) / 10000;

    const spreadToBase = Math.round(onSpread * 10) / 10;

    return {
      collateralType: cfg.collateralType,
      haircut,
      overnightRate,
      termRate30d,
      termRate90d,
      spreadToBase,
      concentrationLimit: cfg.concentrationLimit,
    };
  });
}

function generateStockLoan(rng: () => number): { securities: StockLoanEntry[]; summary: StockLoanSummary } {
  const securities: StockLoanEntry[] = STOCK_LOAN_CONFIGS.map((cfg) => {
    const utilJitter = (rng() - 0.5) * 10;
    const utilization = Math.round(Math.max(1, Math.min(99.9, cfg.baseUtilization + utilJitter)) * 10) / 10;

    const costJitter = (rng() - 0.5) * cfg.baseBorrowCost * 0.2;
    const borrowCost = Math.round(Math.max(0.15, cfg.baseBorrowCost + costJitter) * 100) / 100;

    const lendableJitter = (rng() - 0.5) * cfg.baseLendableShares * 0.08;
    const lendableShares = Math.round((cfg.baseLendableShares + lendableJitter) * 10) / 10;

    const sharesOnLoan = Math.round(lendableShares * (utilization / 100) * 10) / 10;

    const daysJitter = Math.floor(rng() * 2);
    const daysToRecall = Math.max(1, cfg.baseDaysToRecall + daysJitter);

    let category: 'GC' | 'Warm' | 'Special';
    if (borrowCost >= 10) {
      category = 'Special';
    } else if (borrowCost >= 2) {
      category = 'Warm';
    } else {
      category = 'GC';
    }

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      utilization,
      borrowCost,
      daysToRecall,
      lendableShares,
      sharesOnLoan,
      category,
    };
  });

  const gcSecurities = securities.filter((s) => s.category === 'GC');
  const specialSecurities = securities.filter((s) => s.category === 'Special');
  const gcRate = gcSecurities.length > 0
    ? Math.round((gcSecurities.reduce((sum, s) => sum + s.borrowCost, 0) / gcSecurities.length) * 100) / 100
    : 0.30;
  const specialsAvgRate = specialSecurities.length > 0
    ? Math.round((specialSecurities.reduce((sum, s) => sum + s.borrowCost, 0) / specialSecurities.length) * 100) / 100
    : 0;

  const hardToBorrowCount = securities.filter((s) => s.category === 'Special').length;
  const avgUtilization = Math.round((securities.reduce((sum, s) => sum + s.utilization, 0) / securities.length) * 10) / 10;

  // Approximate dollar values (assume avg price ~$50 per share for simplicity)
  const totalLendableValue = Math.round(securities.reduce((sum, s) => sum + s.lendableShares * 50 / 1000, 0) * 10) / 10;
  const totalOnLoanValue = Math.round(securities.reduce((sum, s) => sum + s.sharesOnLoan * 50 / 1000, 0) * 10) / 10;

  return {
    securities,
    summary: {
      gcRate,
      specialsAvgRate,
      hardToBorrowCount,
      totalLendableValue,
      totalOnLoanValue,
      avgUtilization,
    },
  };
}

function generateSyntheticFinancing(rng: () => number): SyntheticFinancingEntry[] {
  return SYNTHETIC_FINANCING_CONFIGS.map((cfg) => {
    const notionalJitter = (rng() - 0.5) * cfg.baseNotional * 0.12;
    const notional = Math.round((cfg.baseNotional + notionalJitter) * 10) / 10;

    const rateJitter = (rng() - 0.5) * 0.20;
    const rate = Math.round((cfg.baseRate + rateJitter) * 10000) / 10000;

    const change1w = Math.round((rng() - 0.5) * 12 * 10) / 10;

    const spreadJitter = (rng() - 0.5) * 10;
    const fundingSpread = Math.round((cfg.baseFundingSpread + spreadJitter) * 10) / 10;

    return {
      product: cfg.product,
      notional,
      rate,
      change1w,
      fundingSpread,
      termAvailable: cfg.termAvailable,
    };
  });
}

function generateClientFlows(rng: () => number): { sectors: ClientFlowEntry[]; summary: ClientFlowSummary } {
  const sectors: ClientFlowEntry[] = CLIENT_FLOW_CONFIGS.map((cfg) => {
    const grossJitter = (rng() - 0.5) * cfg.baseGross * 0.10;
    const grossExposure = Math.round((cfg.baseGross + grossJitter) * 10) / 10;

    const netJitter = (rng() - 0.5) * Math.abs(cfg.baseNet) * 0.25;
    const netExposure = Math.round((cfg.baseNet + netJitter) * 10) / 10;

    const lsJitter = (rng() - 0.5) * 0.15;
    const longShortRatio = Math.round((cfg.baseLSRatio + lsJitter) * 100) / 100;

    const change1w = Math.round((rng() - 0.5) * 8 * 10) / 10;

    let tilt: 'Long' | 'Short' | 'Neutral';
    if (longShortRatio > 1.15) {
      tilt = 'Long';
    } else if (longShortRatio < 0.85) {
      tilt = 'Short';
    } else {
      tilt = 'Neutral';
    }

    return {
      sector: cfg.sector,
      grossExposure,
      netExposure,
      longShortRatio,
      change1w,
      tilt,
    };
  });

  const totalGrossExposure = Math.round(sectors.reduce((sum, s) => sum + s.grossExposure, 0) * 10) / 10;
  const totalNetExposure = Math.round(sectors.reduce((sum, s) => sum + s.netExposure, 0) * 10) / 10;
  const avgLongShortRatio = Math.round((sectors.reduce((sum, s) => sum + s.longShortRatio, 0) / sectors.length) * 100) / 100;

  // Typical HF leverage multiples
  const avgGrossLeverage = Math.round((1.8 + (rng() - 0.5) * 0.4) * 100) / 100;
  const avgNetLeverage = Math.round((0.45 + (rng() - 0.5) * 0.2) * 100) / 100;

  return {
    sectors,
    summary: {
      totalGrossExposure,
      totalNetExposure,
      avgLongShortRatio,
      avgGrossLeverage,
      avgNetLeverage,
    },
  };
}

function generateCapitalIntro(rng: () => number): CapitalIntroEntry[] {
  const today = new Date();

  return CAPITAL_INTRO_CONFIGS.map((cfg) => {
    const aumJitter = (rng() - 0.5) * cfg.baseAum * 0.15;
    const aum = Math.round(cfg.baseAum + aumJitter);

    const d = new Date(today);
    d.setDate(d.getDate() - cfg.dayOffset);
    const date = d.toISOString().slice(0, 10);

    return {
      event: cfg.event,
      fundName: cfg.fundName,
      strategy: cfg.strategy,
      aum,
      date,
      type: cfg.type,
    };
  });
}

function generateRegulatoryImpact(rng: () => number): RegulatoryImpactEntry[] {
  return REGULATORY_IMPACT_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.baseValue * 0.05;
    const currentValue = Math.round((cfg.baseValue + jitter) * 100) / 100;

    return {
      regulation: cfg.regulation,
      metric: cfg.metric,
      currentValue,
      threshold: cfg.threshold,
      unit: cfg.unit,
      impact: cfg.baseImpact,
      description: cfg.description,
    };
  });
}

function generateTechnologyMetrics(rng: () => number): TechnologyMetricEntry[] {
  return TECHNOLOGY_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const value = cfg.unit === 'orders'
      ? Math.round(cfg.baseValue + jitter)
      : Math.round((cfg.baseValue + jitter) * 100) / 100;

    const pctileJitter = (rng() - 0.5) * 6;
    const percentile = Math.round(Math.max(50, Math.min(99, cfg.basePctile + pctileJitter)));

    const change = cfg.trendBias + (rng() - 0.5) * cfg.volatility * 0.5;
    let trend: 'UP' | 'DOWN' | 'FLAT';
    if (change > cfg.volatility * 0.15) {
      trend = 'UP';
    } else if (change < -cfg.volatility * 0.15) {
      trend = 'DOWN';
    } else {
      trend = 'FLAT';
    }

    return {
      metric: cfg.metric,
      value,
      unit: cfg.unit,
      benchmark: cfg.benchmark,
      percentile,
      trend,
    };
  });
}

function generatePrimeBrokerageData(): PrimeBrokerageResponse {
  const rng = seededRandom('prime-brokerage');

  const brokers = generateBrokers(rng);
  const marginFinancing = generateMarginFinancing(rng);
  const stockLoan = generateStockLoan(rng);
  const syntheticFinancing = generateSyntheticFinancing(rng);
  const clientFlows = generateClientFlows(rng);
  const capitalIntro = generateCapitalIntro(rng);
  const regulatoryImpact = generateRegulatoryImpact(rng);
  const technology = generateTechnologyMetrics(rng);

  return {
    brokers,
    marginFinancing,
    stockLoan,
    syntheticFinancing,
    clientFlows,
    capitalIntro,
    regulatoryImpact,
    technology,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generatePrimeBrokerageData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PrimeBrokerage] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate prime brokerage data' });
  }
});

export default router;
