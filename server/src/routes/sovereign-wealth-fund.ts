import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface FundEntry {
  name: string;
  country: string;
  aumBillions: number;
  inceptionYear: number;
  source: 'Oil & Gas' | 'Non-Commodity' | 'Oil' | 'Mixed';
  transparencyScore: number; // 1-10 Linaburg-Maduell scale
  change1y: number;
}

interface RecentTransaction {
  fund: string;
  target: string;
  sector: string;
  sizeBillions: number;
  type: 'Equity' | 'Real Estate' | 'Infrastructure' | 'Private Equity' | 'Debt';
  action: 'Buy' | 'Sell' | 'Increase' | 'Reduce';
  date: string;
}

interface AssetAllocation {
  fund: string;
  equities: number;
  fixedIncome: number;
  realEstate: number;
  privateEquity: number;
  infrastructure: number;
  alternatives: number;
  cash: number;
}

interface GeographicExposure {
  fund: string;
  northAmerica: number;
  europe: number;
  asiaPacific: number;
  middleEast: number;
  emergingMarkets: number;
  other: number;
}

interface SectorHolding {
  sector: string;
  totalExposureBillions: number;
  numberOfFunds: number;
  topHolder: string;
  change1q: number;
}

interface PerformanceReturn {
  fund: string;
  return1y: number;
  return3y: number;
  return5y: number;
  return10y: number;
}

interface MarketImpact {
  market: string;
  estimatedSwfFlowBillions: number;
  direction: 'Inflow' | 'Outflow' | 'Neutral';
  change1q: number;
  topBuyer: string;
}

interface PolicyChange {
  fund: string;
  date: string;
  category: 'Mandate Change' | 'New Allocation' | 'Governance' | 'Divestment Policy' | 'Strategic Shift';
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface SovereignWealthFundResponse {
  funds: FundEntry[];
  recentTransactions: RecentTransaction[];
  assetAllocation: AssetAllocation[];
  geographicExposure: GeographicExposure[];
  sectorHoldings: SectorHolding[];
  performanceReturns: PerformanceReturn[];
  marketImpact: MarketImpact[];
  policyChanges: PolicyChange[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: SovereignWealthFundResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Fund configuration ──

interface FundConfig {
  name: string;
  country: string;
  baseAum: number; // billions USD
  inceptionYear: number;
  source: 'Oil & Gas' | 'Non-Commodity' | 'Oil' | 'Mixed';
  baseTransparency: number;
  aumVolatility: number;
}

const FUND_CONFIGS: FundConfig[] = [
  { name: 'Government Pension Fund Global (GPFG)', country: 'Norway', baseAum: 1640, inceptionYear: 1990, source: 'Oil & Gas', baseTransparency: 10, aumVolatility: 80 },
  { name: 'Abu Dhabi Investment Authority (ADIA)', country: 'UAE', baseAum: 993, inceptionYear: 1976, source: 'Oil', baseTransparency: 6, aumVolatility: 50 },
  { name: 'Public Investment Fund (PIF)', country: 'Saudi Arabia', baseAum: 930, inceptionYear: 1971, source: 'Oil', baseTransparency: 5, aumVolatility: 60 },
  { name: 'Kuwait Investment Authority (KIA)', country: 'Kuwait', baseAum: 923, inceptionYear: 1953, source: 'Oil', baseTransparency: 6, aumVolatility: 45 },
  { name: 'China Investment Corporation (CIC)', country: 'China', baseAum: 1350, inceptionYear: 2007, source: 'Non-Commodity', baseTransparency: 7, aumVolatility: 70 },
  { name: 'GIC Private Limited', country: 'Singapore', baseAum: 770, inceptionYear: 1981, source: 'Non-Commodity', baseTransparency: 6, aumVolatility: 40 },
  { name: 'Temasek Holdings', country: 'Singapore', baseAum: 389, inceptionYear: 1974, source: 'Non-Commodity', baseTransparency: 10, aumVolatility: 25 },
  { name: 'Qatar Investment Authority (QIA)', country: 'Qatar', baseAum: 526, inceptionYear: 2005, source: 'Oil & Gas', baseTransparency: 5, aumVolatility: 30 },
  { name: 'Hong Kong Monetary Authority (HKMA)', country: 'Hong Kong', baseAum: 587, inceptionYear: 1993, source: 'Non-Commodity', baseTransparency: 8, aumVolatility: 30 },
];

// ── Transaction targets ──

interface TransactionTarget {
  target: string;
  sector: string;
  type: 'Equity' | 'Real Estate' | 'Infrastructure' | 'Private Equity' | 'Debt';
  minSize: number;
  maxSize: number;
}

const TRANSACTION_TARGETS: TransactionTarget[] = [
  { target: 'Tesla Inc', sector: 'Technology', type: 'Equity', minSize: 0.5, maxSize: 3.5 },
  { target: 'Microsoft Corp', sector: 'Technology', type: 'Equity', minSize: 1.0, maxSize: 5.0 },
  { target: 'Amazon.com Inc', sector: 'Technology', type: 'Equity', minSize: 0.8, maxSize: 4.2 },
  { target: 'Brookfield Asset Management', sector: 'Financials', type: 'Private Equity', minSize: 1.5, maxSize: 6.0 },
  { target: 'Canary Wharf Group', sector: 'Real Estate', type: 'Real Estate', minSize: 0.8, maxSize: 3.0 },
  { target: 'Hudson Yards Development', sector: 'Real Estate', type: 'Real Estate', minSize: 1.0, maxSize: 4.5 },
  { target: 'DP World Ports', sector: 'Infrastructure', type: 'Infrastructure', minSize: 2.0, maxSize: 8.0 },
  { target: 'Heathrow Airport Holdings', sector: 'Infrastructure', type: 'Infrastructure', minSize: 1.5, maxSize: 5.0 },
  { target: 'TotalEnergies SE', sector: 'Energy', type: 'Equity', minSize: 0.5, maxSize: 2.8 },
  { target: 'Samsung Electronics', sector: 'Technology', type: 'Equity', minSize: 0.6, maxSize: 3.0 },
  { target: 'Reliance Industries', sector: 'Conglomerate', type: 'Equity', minSize: 0.8, maxSize: 3.5 },
  { target: 'NEOM Development', sector: 'Real Estate', type: 'Infrastructure', minSize: 3.0, maxSize: 10.0 },
  { target: 'Equinix Data Centers', sector: 'Technology', type: 'Infrastructure', minSize: 1.0, maxSize: 4.0 },
  { target: 'Alphabet Inc', sector: 'Technology', type: 'Equity', minSize: 0.8, maxSize: 4.0 },
  { target: 'BP plc', sector: 'Energy', type: 'Equity', minSize: 0.3, maxSize: 2.0 },
  { target: 'Blackstone Real Estate Trust', sector: 'Real Estate', type: 'Real Estate', minSize: 1.2, maxSize: 5.0 },
  { target: 'India National Highway Authority', sector: 'Infrastructure', type: 'Debt', minSize: 0.5, maxSize: 2.5 },
  { target: 'EQT AB', sector: 'Financials', type: 'Private Equity', minSize: 0.8, maxSize: 3.0 },
  { target: 'Lucid Motors', sector: 'Automotive', type: 'Equity', minSize: 0.5, maxSize: 2.5 },
  { target: 'Thames Water Utilities', sector: 'Utilities', type: 'Infrastructure', minSize: 0.5, maxSize: 3.0 },
];

// ── Sector holdings configuration ──

interface SectorConfig {
  sector: string;
  baseExposure: number; // billions
  baseFundCount: number;
  topHolder: string;
  changeVolatility: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Technology', baseExposure: 1420, baseFundCount: 9, topHolder: 'Norway GPFG', changeVolatility: 5 },
  { sector: 'Financials', baseExposure: 1180, baseFundCount: 9, topHolder: 'Norway GPFG', changeVolatility: 3 },
  { sector: 'Real Estate', baseExposure: 890, baseFundCount: 8, topHolder: 'Abu Dhabi ADIA', changeVolatility: 4 },
  { sector: 'Energy', baseExposure: 620, baseFundCount: 7, topHolder: 'Kuwait KIA', changeVolatility: 6 },
  { sector: 'Healthcare', baseExposure: 580, baseFundCount: 8, topHolder: 'Norway GPFG', changeVolatility: 3 },
  { sector: 'Infrastructure', baseExposure: 540, baseFundCount: 7, topHolder: 'Abu Dhabi ADIA', changeVolatility: 2 },
  { sector: 'Consumer Discretionary', baseExposure: 460, baseFundCount: 8, topHolder: 'China CIC', changeVolatility: 4 },
  { sector: 'Industrials', baseExposure: 420, baseFundCount: 8, topHolder: 'GIC Singapore', changeVolatility: 3 },
  { sector: 'Telecommunications', baseExposure: 280, baseFundCount: 7, topHolder: 'Qatar QIA', changeVolatility: 2 },
  { sector: 'Utilities', baseExposure: 210, baseFundCount: 6, topHolder: 'HKMA', changeVolatility: 2 },
];

// ── Market impact configuration ──

interface MarketConfig {
  market: string;
  baseFlow: number; // billions
  topBuyer: string;
}

const MARKET_CONFIGS: MarketConfig[] = [
  { market: 'US Equities', baseFlow: 42.5, topBuyer: 'Norway GPFG' },
  { market: 'European Equities', baseFlow: 28.3, topBuyer: 'Norway GPFG' },
  { market: 'UK Real Estate', baseFlow: 12.8, topBuyer: 'Qatar QIA' },
  { market: 'US Real Estate', baseFlow: 18.5, topBuyer: 'Abu Dhabi ADIA' },
  { market: 'Asian Equities', baseFlow: 22.1, topBuyer: 'China CIC' },
  { market: 'EM Debt', baseFlow: 8.6, topBuyer: 'GIC Singapore' },
  { market: 'Global Infrastructure', baseFlow: 15.4, topBuyer: 'Abu Dhabi ADIA' },
  { market: 'US Treasuries', baseFlow: 35.2, topBuyer: 'HKMA' },
  { market: 'Private Equity', baseFlow: 11.7, topBuyer: 'Saudi PIF' },
  { market: 'Global Tech', baseFlow: 19.8, topBuyer: 'Temasek' },
];

// ── Policy change templates ──

interface PolicyTemplate {
  fund: string;
  category: 'Mandate Change' | 'New Allocation' | 'Governance' | 'Divestment Policy' | 'Strategic Shift';
  descriptions: string[];
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

const POLICY_TEMPLATES: PolicyTemplate[] = [
  { fund: 'Norway GPFG', category: 'Divestment Policy', descriptions: ['Expanded fossil fuel exclusion list by 12 companies', 'Tightened climate risk disclosure requirements for portfolio companies', 'Added deforestation criteria to responsible investment framework'], impact: 'HIGH' },
  { fund: 'Saudi PIF', category: 'Strategic Shift', descriptions: ['Increased domestic investment target to 40% of AUM by 2030', 'Launched $10B green hydrogen investment program', 'Expanded sports and entertainment portfolio allocation'], impact: 'HIGH' },
  { fund: 'Abu Dhabi ADIA', category: 'New Allocation', descriptions: ['Established dedicated AI and quantum computing allocation', 'Increased emerging market fixed income allocation by 200bps', 'Launched new direct co-investment platform for PE deals'], impact: 'MEDIUM' },
  { fund: 'China CIC', category: 'Mandate Change', descriptions: ['Reduced US equity allocation amid geopolitical review', 'Increased Belt and Road infrastructure allocation', 'Established new bilateral investment vehicle with Middle East partners'], impact: 'HIGH' },
  { fund: 'GIC Singapore', category: 'Governance', descriptions: ['Appointed new Chief Investment Officer from external hire', 'Restructured risk management committee with independent oversight', 'Enhanced ESG integration across all asset classes'], impact: 'MEDIUM' },
  { fund: 'Temasek Holdings', category: 'New Allocation', descriptions: ['Doubled early-stage venture capital allocation to $5B', 'Established new decarbonization investment platform', 'Increased India allocation target to 8% of portfolio'], impact: 'MEDIUM' },
  { fund: 'Qatar QIA', category: 'Strategic Shift', descriptions: ['Pivoted toward technology and digital infrastructure from trophy assets', 'Reduced European luxury real estate exposure by 15%', 'Launched dedicated food security and agriculture fund'], impact: 'MEDIUM' },
  { fund: 'Kuwait KIA', category: 'Governance', descriptions: ['Parliament approved new oversight framework for Future Generations Fund', 'Increased transparency reporting to semi-annual public disclosures', 'Revised benchmark allocation to include alternative risk premia'], impact: 'LOW' },
  { fund: 'HKMA', category: 'Mandate Change', descriptions: ['Increased long-term growth portfolio allocation from 25% to 30%', 'Added private credit to approved investment categories', 'Expanded RMB-denominated asset allocation targets'], impact: 'MEDIUM' },
];

// ── Data generation ──

function generateFunds(rng: () => number): FundEntry[] {
  return FUND_CONFIGS.map((cfg) => {
    const aumJitter = (rng() - 0.5) * cfg.aumVolatility * 2;
    const aumBillions = Math.round(cfg.baseAum + aumJitter);

    const transparencyJitter = Math.round((rng() - 0.5) * 1);
    const transparencyScore = Math.max(1, Math.min(10, cfg.baseTransparency + transparencyJitter));

    // Annual AUM change between -8% and +18%
    const change1y = Math.round(((rng() - 0.35) * 26) * 10) / 10;

    return {
      name: cfg.name,
      country: cfg.country,
      aumBillions,
      inceptionYear: cfg.inceptionYear,
      source: cfg.source,
      transparencyScore,
      change1y,
    };
  });
}

function generateRecentTransactions(rng: () => number): RecentTransaction[] {
  const transactions: RecentTransaction[] = [];
  const fundNames = FUND_CONFIGS.map((f) => f.name);
  const actions: RecentTransaction['action'][] = ['Buy', 'Sell', 'Increase', 'Reduce'];

  // Generate 12-16 recent transactions
  const count = 12 + Math.floor(rng() * 5);

  for (let i = 0; i < count; i++) {
    const fundIdx = Math.floor(rng() * fundNames.length);
    const targetIdx = Math.floor(rng() * TRANSACTION_TARGETS.length);
    const target = TRANSACTION_TARGETS[targetIdx];
    const actionIdx = Math.floor(rng() * actions.length);

    const sizeRange = target.maxSize - target.minSize;
    const sizeBillions = Math.round((target.minSize + rng() * sizeRange) * 100) / 100;

    // Generate a date within the last 30 days
    const daysAgo = Math.floor(rng() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);

    transactions.push({
      fund: fundNames[fundIdx],
      target: target.target,
      sector: target.sector,
      sizeBillions,
      type: target.type,
      action: actions[actionIdx],
      date: dateStr,
    });
  }

  // Sort by date descending
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  return transactions;
}

function generateAssetAllocation(rng: () => number): AssetAllocation[] {
  // Base allocations per fund archetype
  interface AllocBase {
    equities: number;
    fixedIncome: number;
    realEstate: number;
    privateEquity: number;
    infrastructure: number;
    alternatives: number;
    cash: number;
  }

  const BASE_ALLOCS: Record<string, AllocBase> = {
    'Government Pension Fund Global (GPFG)': { equities: 72, fixedIncome: 25, realEstate: 2.5, privateEquity: 0, infrastructure: 0, alternatives: 0, cash: 0.5 },
    'Abu Dhabi Investment Authority (ADIA)': { equities: 42, fixedIncome: 15, realEstate: 10, privateEquity: 12, infrastructure: 8, alternatives: 10, cash: 3 },
    'Public Investment Fund (PIF)': { equities: 35, fixedIncome: 10, realEstate: 8, privateEquity: 15, infrastructure: 18, alternatives: 10, cash: 4 },
    'Kuwait Investment Authority (KIA)': { equities: 45, fixedIncome: 20, realEstate: 8, privateEquity: 10, infrastructure: 7, alternatives: 7, cash: 3 },
    'China Investment Corporation (CIC)': { equities: 40, fixedIncome: 18, realEstate: 8, privateEquity: 14, infrastructure: 10, alternatives: 7, cash: 3 },
    'GIC Private Limited': { equities: 38, fixedIncome: 18, realEstate: 12, privateEquity: 15, infrastructure: 8, alternatives: 6, cash: 3 },
    'Temasek Holdings': { equities: 52, fixedIncome: 8, realEstate: 6, privateEquity: 18, infrastructure: 5, alternatives: 8, cash: 3 },
    'Qatar Investment Authority (QIA)': { equities: 38, fixedIncome: 12, realEstate: 18, privateEquity: 12, infrastructure: 10, alternatives: 6, cash: 4 },
    'Hong Kong Monetary Authority (HKMA)': { equities: 30, fixedIncome: 45, realEstate: 5, privateEquity: 8, infrastructure: 4, alternatives: 5, cash: 3 },
  };

  return FUND_CONFIGS.map((cfg) => {
    const base = BASE_ALLOCS[cfg.name];
    if (!base) {
      // Fallback generic allocation
      return {
        fund: cfg.name,
        equities: 40,
        fixedIncome: 25,
        realEstate: 10,
        privateEquity: 10,
        infrastructure: 8,
        alternatives: 5,
        cash: 2,
      };
    }

    // Add small random perturbation while keeping sum at 100
    const raw = {
      equities: base.equities + (rng() - 0.5) * 4,
      fixedIncome: base.fixedIncome + (rng() - 0.5) * 3,
      realEstate: base.realEstate + (rng() - 0.5) * 2,
      privateEquity: base.privateEquity + (rng() - 0.5) * 2,
      infrastructure: base.infrastructure + (rng() - 0.5) * 2,
      alternatives: base.alternatives + (rng() - 0.5) * 2,
      cash: base.cash + (rng() - 0.5) * 1,
    };

    // Clamp negatives
    const keys = Object.keys(raw) as (keyof typeof raw)[];
    for (const k of keys) {
      if (raw[k] < 0) raw[k] = 0;
    }

    // Normalize to 100
    const total = keys.reduce((sum, k) => sum + raw[k], 0);
    const normalized: Record<string, number> = {};
    for (const k of keys) {
      normalized[k] = Math.round((raw[k] / total) * 1000) / 10;
    }

    // Fix rounding residual
    const normTotal = keys.reduce((sum, k) => sum + normalized[k], 0);
    const diff = Math.round((100 - normTotal) * 10) / 10;
    normalized['equities'] = Math.round((normalized['equities'] + diff) * 10) / 10;

    return {
      fund: cfg.name,
      equities: normalized['equities'],
      fixedIncome: normalized['fixedIncome'],
      realEstate: normalized['realEstate'],
      privateEquity: normalized['privateEquity'],
      infrastructure: normalized['infrastructure'],
      alternatives: normalized['alternatives'],
      cash: normalized['cash'],
    };
  });
}

function generateGeographicExposure(rng: () => number): GeographicExposure[] {
  interface GeoBase {
    northAmerica: number;
    europe: number;
    asiaPacific: number;
    middleEast: number;
    emergingMarkets: number;
    other: number;
  }

  const GEO_BASES: Record<string, GeoBase> = {
    'Government Pension Fund Global (GPFG)': { northAmerica: 45, europe: 32, asiaPacific: 14, middleEast: 1, emergingMarkets: 6, other: 2 },
    'Abu Dhabi Investment Authority (ADIA)': { northAmerica: 35, europe: 25, asiaPacific: 20, middleEast: 10, emergingMarkets: 8, other: 2 },
    'Public Investment Fund (PIF)': { northAmerica: 22, europe: 15, asiaPacific: 12, middleEast: 35, emergingMarkets: 12, other: 4 },
    'Kuwait Investment Authority (KIA)': { northAmerica: 38, europe: 28, asiaPacific: 15, middleEast: 10, emergingMarkets: 7, other: 2 },
    'China Investment Corporation (CIC)': { northAmerica: 28, europe: 18, asiaPacific: 35, middleEast: 3, emergingMarkets: 12, other: 4 },
    'GIC Private Limited': { northAmerica: 34, europe: 20, asiaPacific: 30, middleEast: 4, emergingMarkets: 9, other: 3 },
    'Temasek Holdings': { northAmerica: 22, europe: 12, asiaPacific: 48, middleEast: 2, emergingMarkets: 13, other: 3 },
    'Qatar Investment Authority (QIA)': { northAmerica: 28, europe: 35, asiaPacific: 15, middleEast: 12, emergingMarkets: 7, other: 3 },
    'Hong Kong Monetary Authority (HKMA)': { northAmerica: 32, europe: 22, asiaPacific: 32, middleEast: 3, emergingMarkets: 8, other: 3 },
  };

  return FUND_CONFIGS.map((cfg) => {
    const base = GEO_BASES[cfg.name];
    if (!base) {
      return { fund: cfg.name, northAmerica: 30, europe: 25, asiaPacific: 25, middleEast: 5, emergingMarkets: 10, other: 5 };
    }

    const raw = {
      northAmerica: base.northAmerica + (rng() - 0.5) * 4,
      europe: base.europe + (rng() - 0.5) * 3,
      asiaPacific: base.asiaPacific + (rng() - 0.5) * 3,
      middleEast: base.middleEast + (rng() - 0.5) * 2,
      emergingMarkets: base.emergingMarkets + (rng() - 0.5) * 2,
      other: base.other + (rng() - 0.5) * 1,
    };

    const keys = Object.keys(raw) as (keyof typeof raw)[];
    for (const k of keys) {
      if (raw[k] < 0) raw[k] = 0;
    }

    const total = keys.reduce((sum, k) => sum + raw[k], 0);
    const normalized: Record<string, number> = {};
    for (const k of keys) {
      normalized[k] = Math.round((raw[k] / total) * 1000) / 10;
    }

    const normTotal = keys.reduce((sum, k) => sum + normalized[k], 0);
    const diff = Math.round((100 - normTotal) * 10) / 10;
    normalized['northAmerica'] = Math.round((normalized['northAmerica'] + diff) * 10) / 10;

    return {
      fund: cfg.name,
      northAmerica: normalized['northAmerica'],
      europe: normalized['europe'],
      asiaPacific: normalized['asiaPacific'],
      middleEast: normalized['middleEast'],
      emergingMarkets: normalized['emergingMarkets'],
      other: normalized['other'],
    };
  });
}

function generateSectorHoldings(rng: () => number): SectorHolding[] {
  return SECTOR_CONFIGS.map((cfg) => {
    const exposureJitter = (rng() - 0.5) * cfg.baseExposure * 0.08;
    const totalExposureBillions = Math.round(cfg.baseExposure + exposureJitter);

    const fundCountJitter = Math.round((rng() - 0.5) * 2);
    const numberOfFunds = Math.max(3, Math.min(9, cfg.baseFundCount + fundCountJitter));

    const change1q = Math.round((rng() - 0.5) * cfg.changeVolatility * 2 * 10) / 10;

    return {
      sector: cfg.sector,
      totalExposureBillions,
      numberOfFunds,
      topHolder: cfg.topHolder,
      change1q,
    };
  });
}

function generatePerformanceReturns(rng: () => number): PerformanceReturn[] {
  interface ReturnBase {
    base1y: number;
    base3y: number;
    base5y: number;
    base10y: number;
  }

  const RETURN_BASES: Record<string, ReturnBase> = {
    'Government Pension Fund Global (GPFG)': { base1y: 16.1, base3y: 9.8, base5y: 10.5, base10y: 8.2 },
    'Abu Dhabi Investment Authority (ADIA)': { base1y: 12.4, base3y: 8.5, base5y: 9.3, base10y: 7.8 },
    'Public Investment Fund (PIF)': { base1y: 10.8, base3y: 7.2, base5y: 8.1, base10y: 6.5 },
    'Kuwait Investment Authority (KIA)': { base1y: 11.5, base3y: 7.8, base5y: 8.6, base10y: 7.1 },
    'China Investment Corporation (CIC)': { base1y: 9.2, base3y: 6.8, base5y: 7.9, base10y: 6.8 },
    'GIC Private Limited': { base1y: 8.4, base3y: 7.5, base5y: 8.8, base10y: 7.4 },
    'Temasek Holdings': { base1y: 5.8, base3y: 6.2, base5y: 8.0, base10y: 7.0 },
    'Qatar Investment Authority (QIA)': { base1y: 11.2, base3y: 7.6, base5y: 8.4, base10y: 6.9 },
    'Hong Kong Monetary Authority (HKMA)': { base1y: 7.5, base3y: 5.8, base5y: 6.5, base10y: 5.4 },
  };

  return FUND_CONFIGS.map((cfg) => {
    const base = RETURN_BASES[cfg.name] || { base1y: 8.0, base3y: 6.5, base5y: 7.5, base10y: 6.0 };

    const return1y = Math.round((base.base1y + (rng() - 0.5) * 8) * 10) / 10;
    const return3y = Math.round((base.base3y + (rng() - 0.5) * 4) * 10) / 10;
    const return5y = Math.round((base.base5y + (rng() - 0.5) * 3) * 10) / 10;
    const return10y = Math.round((base.base10y + (rng() - 0.5) * 2) * 10) / 10;

    return {
      fund: cfg.name,
      return1y,
      return3y,
      return5y,
      return10y,
    };
  });
}

function generateMarketImpact(rng: () => number): MarketImpact[] {
  return MARKET_CONFIGS.map((cfg) => {
    const flowJitter = (rng() - 0.5) * cfg.baseFlow * 0.25;
    const estimatedSwfFlowBillions = Math.round((cfg.baseFlow + flowJitter) * 10) / 10;

    const change1q = Math.round((rng() - 0.5) * 20 * 10) / 10;

    let direction: 'Inflow' | 'Outflow' | 'Neutral';
    if (change1q > 3) {
      direction = 'Inflow';
    } else if (change1q < -3) {
      direction = 'Outflow';
    } else {
      direction = 'Neutral';
    }

    return {
      market: cfg.market,
      estimatedSwfFlowBillions,
      direction,
      change1q,
      topBuyer: cfg.topBuyer,
    };
  });
}

function generatePolicyChanges(rng: () => number): PolicyChange[] {
  const changes: PolicyChange[] = [];

  // Pick 5-8 policy changes from templates
  const count = 5 + Math.floor(rng() * 4);
  const used = new Set<number>();

  for (let i = 0; i < count && used.size < POLICY_TEMPLATES.length; i++) {
    let idx = Math.floor(rng() * POLICY_TEMPLATES.length);
    while (used.has(idx)) {
      idx = (idx + 1) % POLICY_TEMPLATES.length;
    }
    used.add(idx);

    const tmpl = POLICY_TEMPLATES[idx];
    const descIdx = Math.floor(rng() * tmpl.descriptions.length);

    // Generate date within last 60 days
    const daysAgo = Math.floor(rng() * 60);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);

    changes.push({
      fund: tmpl.fund,
      date: dateStr,
      category: tmpl.category,
      description: tmpl.descriptions[descIdx],
      impact: tmpl.impact,
    });
  }

  changes.sort((a, b) => b.date.localeCompare(a.date));

  return changes;
}

function generateSovereignWealthFundData(): SovereignWealthFundResponse {
  const rng = seededRandom('sovereign-wealth-fund');

  const funds = generateFunds(rng);
  const recentTransactions = generateRecentTransactions(rng);
  const assetAllocation = generateAssetAllocation(rng);
  const geographicExposure = generateGeographicExposure(rng);
  const sectorHoldings = generateSectorHoldings(rng);
  const performanceReturns = generatePerformanceReturns(rng);
  const marketImpact = generateMarketImpact(rng);
  const policyChanges = generatePolicyChanges(rng);

  return {
    funds,
    recentTransactions,
    assetAllocation,
    geographicExposure,
    sectorHoldings,
    performanceReturns,
    marketImpact,
    policyChanges,
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

    const data = generateSovereignWealthFundData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SovereignWealthFund] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate sovereign wealth fund data' });
  }
});

export default router;
