import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface CounterpartyExposureEntry {
  counterparty: string;
  rating: string;
  nettingSets: number;
  pfe: number;
  expectedExposure: number;
  cvaCharge: number;
  dva: number;
  change1d: number;
}

interface XVABreakdownEntry {
  type: string;
  description: string;
  total: number;
  change1d: number;
  change1m: number;
  pctOfGrossNotional: number;
}

interface CVAByProductEntry {
  product: string;
  grossNotional: number;
  cvaCharge: number;
  pctOfTotal: number;
  avgTenor: number;
  tradeCount: number;
}

interface WrongWayRiskEntry {
  counterparty: string;
  tradeType: string;
  notional: number;
  correlation: number;
  additionalCVA: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface CollateralImpactEntry {
  counterparty: string;
  csaType: string;
  threshold: number;
  mta: number;
  frequency: string;
  uncollateralizedCVA: number;
  collateralizedCVA: number;
  cvaReduction: number;
}

interface SeniorManagementEntry {
  rank: number;
  counterparty: string;
  cvaPnL1d: number;
  cvaPnL1m: number;
  cvaPnLYtd: number;
  cvaCharge: number;
  direction: 'GAIN' | 'LOSS';
}

interface CVAHedgingEntry {
  hedgeType: string;
  referenceEntity: string;
  notional: number;
  cdsSpread: number;
  hedgeEffectiveness: number;
  residualCVA: number;
  hedgeRatio: number;
}

interface RegulatoryCapitalEntry {
  approach: string;
  description: string;
  capitalCharge: number;
  rwa: number;
  capitalRatio: number;
  change1q: number;
}

interface CVAMonitorSummary {
  totalCVA: number;
  totalDVA: number;
  totalFVA: number;
  netXVA: number;
  topCounterparty: string;
  counterpartyCount: number;
  timestamp: string;
}

interface CVAMonitorResponse {
  counterpartyExposure: CounterpartyExposureEntry[];
  xvaBreakdown: XVABreakdownEntry[];
  cvaByProduct: CVAByProductEntry[];
  wrongWayRisk: WrongWayRiskEntry[];
  collateralImpact: CollateralImpactEntry[];
  seniorManagement: SeniorManagementEntry[];
  cvaHedging: CVAHedgingEntry[];
  regulatoryCapital: RegulatoryCapitalEntry[];
  summary: CVAMonitorSummary;
  timestamp: string;
}

// ── Cache ──

let cache: { data: CVAMonitorResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Counterparty configuration ──

interface CounterpartyConfig {
  counterparty: string;
  rating: string;
  baseNettingSets: number;
  basePFE: number;
  baseEE: number;
  baseCVA: number;
  baseDVA: number;
}

const COUNTERPARTY_CONFIGS: CounterpartyConfig[] = [
  { counterparty: 'Goldman Sachs', rating: 'A+', baseNettingSets: 48, basePFE: 2850, baseEE: 1420, baseCVA: 38.5, baseDVA: 12.3 },
  { counterparty: 'JPMorgan Chase', rating: 'AA-', baseNettingSets: 52, basePFE: 3120, baseEE: 1560, baseCVA: 32.1, baseDVA: 14.8 },
  { counterparty: 'Morgan Stanley', rating: 'A+', baseNettingSets: 41, basePFE: 2340, baseEE: 1170, baseCVA: 35.2, baseDVA: 10.1 },
  { counterparty: 'Citigroup', rating: 'A', baseNettingSets: 45, basePFE: 2680, baseEE: 1340, baseCVA: 42.8, baseDVA: 11.5 },
  { counterparty: 'Bank of America', rating: 'A+', baseNettingSets: 38, basePFE: 2210, baseEE: 1105, baseCVA: 29.7, baseDVA: 9.8 },
  { counterparty: 'Barclays', rating: 'A', baseNettingSets: 35, basePFE: 1980, baseEE: 990, baseCVA: 36.4, baseDVA: 8.2 },
  { counterparty: 'Deutsche Bank', rating: 'A-', baseNettingSets: 32, basePFE: 1760, baseEE: 880, baseCVA: 45.3, baseDVA: 7.6 },
  { counterparty: 'HSBC', rating: 'AA-', baseNettingSets: 29, basePFE: 1540, baseEE: 770, baseCVA: 22.1, baseDVA: 8.9 },
  { counterparty: 'BNP Paribas', rating: 'A+', baseNettingSets: 27, basePFE: 1420, baseEE: 710, baseCVA: 28.5, baseDVA: 7.1 },
  { counterparty: 'UBS', rating: 'A+', baseNettingSets: 25, basePFE: 1310, baseEE: 655, baseCVA: 24.8, baseDVA: 6.5 },
  { counterparty: 'Credit Suisse', rating: 'BBB+', baseNettingSets: 22, basePFE: 1180, baseEE: 590, baseCVA: 52.6, baseDVA: 5.4 },
  { counterparty: 'Nomura', rating: 'A-', baseNettingSets: 18, basePFE: 920, baseEE: 460, baseCVA: 31.7, baseDVA: 4.8 },
  { counterparty: 'Societe Generale', rating: 'A', baseNettingSets: 21, basePFE: 1050, baseEE: 525, baseCVA: 33.9, baseDVA: 5.9 },
  { counterparty: 'Standard Chartered', rating: 'A', baseNettingSets: 16, basePFE: 780, baseEE: 390, baseCVA: 26.2, baseDVA: 4.1 },
  { counterparty: 'Shell International', rating: 'A+', baseNettingSets: 8, basePFE: 540, baseEE: 270, baseCVA: 14.8, baseDVA: 2.3 },
  { counterparty: 'BP plc', rating: 'A-', baseNettingSets: 7, basePFE: 480, baseEE: 240, baseCVA: 18.5, baseDVA: 2.1 },
  { counterparty: 'Apple Inc', rating: 'AA+', baseNettingSets: 5, basePFE: 320, baseEE: 160, baseCVA: 4.2, baseDVA: 3.8 },
  { counterparty: 'Toyota Motor', rating: 'A+', baseNettingSets: 6, basePFE: 410, baseEE: 205, baseCVA: 11.3, baseDVA: 2.9 },
];

// ── XVA type configuration ──

interface XVAConfig {
  type: string;
  description: string;
  baseTotal: number;
  volatility: number;
  basePctOfNotional: number;
}

const XVA_CONFIGS: XVAConfig[] = [
  { type: 'CVA', description: 'Credit Valuation Adjustment', baseTotal: 528.6, volatility: 25, basePctOfNotional: 0.042 },
  { type: 'DVA', description: 'Debit Valuation Adjustment', baseTotal: -127.2, volatility: 12, basePctOfNotional: -0.010 },
  { type: 'FVA', description: 'Funding Valuation Adjustment', baseTotal: 185.3, volatility: 18, basePctOfNotional: 0.015 },
  { type: 'KVA', description: 'Capital Valuation Adjustment', baseTotal: 312.8, volatility: 20, basePctOfNotional: 0.025 },
  { type: 'MVA', description: 'Margin Valuation Adjustment', baseTotal: 94.5, volatility: 10, basePctOfNotional: 0.008 },
];

// ── CVA by product configuration ──

interface ProductCVAConfig {
  product: string;
  baseGrossNotional: number;
  baseCVACharge: number;
  baseAvgTenor: number;
  baseTradeCount: number;
}

const PRODUCT_CVA_CONFIGS: ProductCVAConfig[] = [
  { product: 'Interest Rate Swaps', baseGrossNotional: 485000, baseCVACharge: 185.2, baseAvgTenor: 7.5, baseTradeCount: 12400 },
  { product: 'Credit Default Swaps', baseGrossNotional: 142000, baseCVACharge: 148.7, baseAvgTenor: 5.2, baseTradeCount: 4800 },
  { product: 'FX Forwards', baseGrossNotional: 238000, baseCVACharge: 72.3, baseAvgTenor: 1.8, baseTradeCount: 18600 },
  { product: 'Equity Derivatives', baseGrossNotional: 95000, baseCVACharge: 86.4, baseAvgTenor: 3.2, baseTradeCount: 6200 },
  { product: 'Commodities', baseGrossNotional: 67000, baseCVACharge: 36.0, baseAvgTenor: 2.5, baseTradeCount: 3100 },
];

// ── Wrong-way risk configuration ──

interface WWRConfig {
  counterparty: string;
  tradeType: string;
  baseNotional: number;
  baseCorrelation: number;
  baseAdditionalCVA: number;
}

const WWR_CONFIGS: WWRConfig[] = [
  { counterparty: 'Deutsche Bank', tradeType: 'CDS on European Financials', baseNotional: 850, baseCorrelation: 0.72, baseAdditionalCVA: 18.4 },
  { counterparty: 'Barclays', tradeType: 'CDS on UK Sovereigns', baseNotional: 620, baseCorrelation: 0.58, baseAdditionalCVA: 12.1 },
  { counterparty: 'Citigroup', tradeType: 'EM Sovereign CDS', baseNotional: 540, baseCorrelation: 0.45, baseAdditionalCVA: 8.7 },
  { counterparty: 'BP plc', tradeType: 'Crude Oil Derivatives', baseNotional: 480, baseCorrelation: 0.65, baseAdditionalCVA: 14.2 },
  { counterparty: 'Shell International', tradeType: 'Natural Gas Swaps', baseNotional: 420, baseCorrelation: 0.61, baseAdditionalCVA: 11.8 },
  { counterparty: 'Credit Suisse', tradeType: 'CDS on Financial Index', baseNotional: 780, baseCorrelation: 0.78, baseAdditionalCVA: 22.5 },
  { counterparty: 'Nomura', tradeType: 'Nikkei Equity Options', baseNotional: 350, baseCorrelation: 0.42, baseAdditionalCVA: 6.9 },
  { counterparty: 'Societe Generale', tradeType: 'Euro Stoxx Derivatives', baseNotional: 410, baseCorrelation: 0.55, baseAdditionalCVA: 9.8 },
];

// ── Collateral impact configuration ──

interface CollateralConfig {
  counterparty: string;
  csaType: string;
  baseThreshold: number;
  baseMTA: number;
  frequency: string;
  baseUncollateralizedCVA: number;
  baseCollateralizedCVA: number;
}

const COLLATERAL_CONFIGS: CollateralConfig[] = [
  { counterparty: 'Goldman Sachs', csaType: 'Two-way CSA', baseThreshold: 0, baseMTA: 0.5, frequency: 'Daily', baseUncollateralizedCVA: 38.5, baseCollateralizedCVA: 8.2 },
  { counterparty: 'JPMorgan Chase', csaType: 'Two-way CSA', baseThreshold: 0, baseMTA: 0.5, frequency: 'Daily', baseUncollateralizedCVA: 32.1, baseCollateralizedCVA: 6.8 },
  { counterparty: 'Morgan Stanley', csaType: 'Two-way CSA', baseThreshold: 10, baseMTA: 1.0, frequency: 'Daily', baseUncollateralizedCVA: 35.2, baseCollateralizedCVA: 12.4 },
  { counterparty: 'Citigroup', csaType: 'One-way CSA', baseThreshold: 25, baseMTA: 2.0, frequency: 'Weekly', baseUncollateralizedCVA: 42.8, baseCollateralizedCVA: 22.5 },
  { counterparty: 'Deutsche Bank', csaType: 'Two-way CSA', baseThreshold: 15, baseMTA: 1.0, frequency: 'Daily', baseUncollateralizedCVA: 45.3, baseCollateralizedCVA: 18.7 },
  { counterparty: 'Barclays', csaType: 'Two-way CSA', baseThreshold: 10, baseMTA: 1.0, frequency: 'Daily', baseUncollateralizedCVA: 36.4, baseCollateralizedCVA: 14.2 },
  { counterparty: 'HSBC', csaType: 'Two-way CSA', baseThreshold: 0, baseMTA: 0.5, frequency: 'Daily', baseUncollateralizedCVA: 22.1, baseCollateralizedCVA: 4.8 },
  { counterparty: 'Credit Suisse', csaType: 'One-way CSA', baseThreshold: 50, baseMTA: 5.0, frequency: 'Weekly', baseUncollateralizedCVA: 52.6, baseCollateralizedCVA: 38.1 },
  { counterparty: 'Shell International', csaType: 'No CSA', baseThreshold: 0, baseMTA: 0, frequency: 'N/A', baseUncollateralizedCVA: 14.8, baseCollateralizedCVA: 14.8 },
  { counterparty: 'BP plc', csaType: 'One-way CSA', baseThreshold: 30, baseMTA: 3.0, frequency: 'Monthly', baseUncollateralizedCVA: 18.5, baseCollateralizedCVA: 13.2 },
];

// ── CVA hedging configuration ──

interface HedgeConfig {
  hedgeType: string;
  referenceEntity: string;
  baseNotional: number;
  baseCDSSpread: number;
  baseEffectiveness: number;
  baseResidualCVA: number;
  baseHedgeRatio: number;
}

const HEDGE_CONFIGS: HedgeConfig[] = [
  { hedgeType: 'Single-name CDS', referenceEntity: 'Goldman Sachs', baseNotional: 450, baseCDSSpread: 62, baseEffectiveness: 0.88, baseResidualCVA: 4.6, baseHedgeRatio: 0.85 },
  { hedgeType: 'Single-name CDS', referenceEntity: 'Deutsche Bank', baseNotional: 380, baseCDSSpread: 95, baseEffectiveness: 0.82, baseResidualCVA: 8.2, baseHedgeRatio: 0.78 },
  { hedgeType: 'CDS Index', referenceEntity: 'iTraxx Main', baseNotional: 1200, baseCDSSpread: 54, baseEffectiveness: 0.72, baseResidualCVA: 18.5, baseHedgeRatio: 0.65 },
  { hedgeType: 'CDS Index', referenceEntity: 'CDX IG', baseNotional: 950, baseCDSSpread: 48, baseEffectiveness: 0.75, baseResidualCVA: 14.2, baseHedgeRatio: 0.68 },
  { hedgeType: 'Proxy hedge', referenceEntity: 'iTraxx Crossover (for Credit Suisse)', baseNotional: 280, baseCDSSpread: 310, baseEffectiveness: 0.58, baseResidualCVA: 22.1, baseHedgeRatio: 0.52 },
  { hedgeType: 'Single-name CDS', referenceEntity: 'Citigroup', baseNotional: 320, baseCDSSpread: 72, baseEffectiveness: 0.85, baseResidualCVA: 6.4, baseHedgeRatio: 0.82 },
  { hedgeType: 'Proxy hedge', referenceEntity: 'CDX HY (for corporates)', baseNotional: 180, baseCDSSpread: 385, baseEffectiveness: 0.48, baseResidualCVA: 9.7, baseHedgeRatio: 0.42 },
  { hedgeType: 'Single-name CDS', referenceEntity: 'Barclays', baseNotional: 290, baseCDSSpread: 78, baseEffectiveness: 0.84, baseResidualCVA: 5.8, baseHedgeRatio: 0.80 },
  { hedgeType: 'CDS Index', referenceEntity: 'iTraxx Financials Senior', baseNotional: 650, baseCDSSpread: 68, baseEffectiveness: 0.70, baseResidualCVA: 12.8, baseHedgeRatio: 0.62 },
  { hedgeType: 'Proxy hedge', referenceEntity: 'Sovereign CDS basket (for EM exposure)', baseNotional: 220, baseCDSSpread: 145, baseEffectiveness: 0.55, baseResidualCVA: 7.3, baseHedgeRatio: 0.50 },
];

// ── Regulatory capital configuration ──

interface RegCapConfig {
  approach: string;
  description: string;
  baseCapitalCharge: number;
  baseRWA: number;
  baseCapitalRatio: number;
}

const REGCAP_CONFIGS: RegCapConfig[] = [
  { approach: 'SA-CVA', description: 'Standardized Approach - Sensitivities Based', baseCapitalCharge: 842, baseRWA: 10525, baseCapitalRatio: 8.0 },
  { approach: 'SA-CVA (Reduced)', description: 'Standardized Approach - Reduced Version', baseCapitalCharge: 1105, baseRWA: 13812, baseCapitalRatio: 8.0 },
  { approach: 'BA-CVA', description: 'Basic Approach - Full', baseCapitalCharge: 1280, baseRWA: 16000, baseCapitalRatio: 8.0 },
  { approach: 'BA-CVA (Hedged)', description: 'Basic Approach - With Hedge Benefit', baseCapitalCharge: 965, baseRWA: 12062, baseCapitalRatio: 8.0 },
  { approach: 'Current IMM', description: 'Internal Model Method (Legacy)', baseCapitalCharge: 720, baseRWA: 9000, baseCapitalRatio: 8.0 },
  { approach: 'FRTB-CVA', description: 'FRTB CVA Framework (Projected)', baseCapitalCharge: 925, baseRWA: 11562, baseCapitalRatio: 8.0 },
];

// ── Data generation ──

function generateCounterpartyExposure(rng: () => number): CounterpartyExposureEntry[] {
  return COUNTERPARTY_CONFIGS.map((cfg) => {
    const nettingJitter = Math.floor((rng() - 0.5) * 6);
    const nettingSets = Math.max(1, cfg.baseNettingSets + nettingJitter);

    const pfeJitter = (rng() - 0.5) * cfg.basePFE * 0.12;
    const pfe = Math.round(cfg.basePFE + pfeJitter);

    const eeJitter = (rng() - 0.5) * cfg.baseEE * 0.10;
    const expectedExposure = Math.round(cfg.baseEE + eeJitter);

    const cvaJitter = (rng() - 0.5) * cfg.baseCVA * 0.15;
    const cvaCharge = Math.round((cfg.baseCVA + cvaJitter) * 10) / 10;

    const dvaJitter = (rng() - 0.5) * cfg.baseDVA * 0.12;
    const dva = Math.round((cfg.baseDVA + dvaJitter) * 10) / 10;

    const change1d = Math.round((rng() - 0.5) * 4 * 100) / 100;

    return {
      counterparty: cfg.counterparty,
      rating: cfg.rating,
      nettingSets,
      pfe,
      expectedExposure,
      cvaCharge,
      dva,
      change1d,
    };
  });
}

function generateXVABreakdown(rng: () => number): XVABreakdownEntry[] {
  return XVA_CONFIGS.map((cfg) => {
    const totalJitter = (rng() - 0.5) * cfg.volatility * 2;
    const total = Math.round((cfg.baseTotal + totalJitter) * 10) / 10;

    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.4 * 10) / 10;
    const change1m = Math.round((rng() - 0.5) * cfg.volatility * 1.2 * 10) / 10;

    const pctJitter = (rng() - 0.5) * cfg.basePctOfNotional * 0.1;
    const pctOfGrossNotional = Math.round((cfg.basePctOfNotional + pctJitter) * 10000) / 10000;

    return {
      type: cfg.type,
      description: cfg.description,
      total,
      change1d,
      change1m,
      pctOfGrossNotional,
    };
  });
}

function generateCVAByProduct(rng: () => number): CVAByProductEntry[] {
  const entries = PRODUCT_CVA_CONFIGS.map((cfg) => {
    const notionalJitter = (rng() - 0.5) * cfg.baseGrossNotional * 0.08;
    const grossNotional = Math.round(cfg.baseGrossNotional + notionalJitter);

    const cvaJitter = (rng() - 0.5) * cfg.baseCVACharge * 0.12;
    const cvaCharge = Math.round((cfg.baseCVACharge + cvaJitter) * 10) / 10;

    const tenorJitter = (rng() - 0.5) * cfg.baseAvgTenor * 0.15;
    const avgTenor = Math.round((cfg.baseAvgTenor + tenorJitter) * 10) / 10;

    const countJitter = Math.floor((rng() - 0.5) * cfg.baseTradeCount * 0.10);
    const tradeCount = cfg.baseTradeCount + countJitter;

    return {
      product: cfg.product,
      grossNotional,
      cvaCharge,
      pctOfTotal: 0, // calculated after
      avgTenor,
      tradeCount,
    };
  });

  const totalCVA = entries.reduce((sum, e) => sum + e.cvaCharge, 0);
  for (const entry of entries) {
    entry.pctOfTotal = Math.round((entry.cvaCharge / totalCVA) * 1000) / 10;
  }

  return entries;
}

function generateWrongWayRisk(rng: () => number): WrongWayRiskEntry[] {
  return WWR_CONFIGS.map((cfg) => {
    const notionalJitter = (rng() - 0.5) * cfg.baseNotional * 0.15;
    const notional = Math.round(cfg.baseNotional + notionalJitter);

    const corrJitter = (rng() - 0.5) * 0.10;
    const correlation = Math.round(Math.max(0.1, Math.min(0.95, cfg.baseCorrelation + corrJitter)) * 100) / 100;

    const addlCVAJitter = (rng() - 0.5) * cfg.baseAdditionalCVA * 0.20;
    const additionalCVA = Math.round((cfg.baseAdditionalCVA + addlCVAJitter) * 10) / 10;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (correlation >= 0.75) {
      riskLevel = 'CRITICAL';
    } else if (correlation >= 0.60) {
      riskLevel = 'HIGH';
    } else if (correlation >= 0.45) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    return {
      counterparty: cfg.counterparty,
      tradeType: cfg.tradeType,
      notional,
      correlation,
      additionalCVA,
      riskLevel,
    };
  });
}

function generateCollateralImpact(rng: () => number): CollateralImpactEntry[] {
  return COLLATERAL_CONFIGS.map((cfg) => {
    const uncollJitter = (rng() - 0.5) * cfg.baseUncollateralizedCVA * 0.10;
    const uncollateralizedCVA = Math.round((cfg.baseUncollateralizedCVA + uncollJitter) * 10) / 10;

    const collJitter = (rng() - 0.5) * cfg.baseCollateralizedCVA * 0.12;
    const collateralizedCVA = Math.round((cfg.baseCollateralizedCVA + collJitter) * 10) / 10;

    const cvaReduction = Math.round(((uncollateralizedCVA - collateralizedCVA) / uncollateralizedCVA) * 1000) / 10;

    const thresholdJitter = cfg.baseThreshold > 0 ? (rng() - 0.5) * cfg.baseThreshold * 0.1 : 0;
    const threshold = Math.round((cfg.baseThreshold + thresholdJitter) * 10) / 10;

    return {
      counterparty: cfg.counterparty,
      csaType: cfg.csaType,
      threshold,
      mta: cfg.baseMTA,
      frequency: cfg.frequency,
      uncollateralizedCVA,
      collateralizedCVA,
      cvaReduction: Math.max(0, cvaReduction),
    };
  });
}

function generateSeniorManagement(rng: () => number, exposures: CounterpartyExposureEntry[]): SeniorManagementEntry[] {
  // Top 10 counterparties by CVA charge, with P&L attribution
  const sorted = [...exposures].sort((a, b) => b.cvaCharge - a.cvaCharge).slice(0, 10);

  return sorted.map((cp, idx) => {
    const cvaPnL1d = Math.round((rng() - 0.5) * 4 * 100) / 100;
    const cvaPnL1m = Math.round((rng() - 0.5) * 12 * 100) / 100;
    const cvaPnLYtd = Math.round((rng() - 0.5) * 25 * 100) / 100;

    const direction: 'GAIN' | 'LOSS' = cvaPnL1d >= 0 ? 'GAIN' : 'LOSS';

    return {
      rank: idx + 1,
      counterparty: cp.counterparty,
      cvaPnL1d,
      cvaPnL1m,
      cvaPnLYtd,
      cvaCharge: cp.cvaCharge,
      direction,
    };
  });
}

function generateCVAHedging(rng: () => number): CVAHedgingEntry[] {
  return HEDGE_CONFIGS.map((cfg) => {
    const notionalJitter = (rng() - 0.5) * cfg.baseNotional * 0.12;
    const notional = Math.round(cfg.baseNotional + notionalJitter);

    const spreadJitter = (rng() - 0.5) * cfg.baseCDSSpread * 0.15;
    const cdsSpread = Math.round(cfg.baseCDSSpread + spreadJitter);

    const effJitter = (rng() - 0.5) * 0.08;
    const hedgeEffectiveness = Math.round(Math.max(0.3, Math.min(0.98, cfg.baseEffectiveness + effJitter)) * 100) / 100;

    const residualJitter = (rng() - 0.5) * cfg.baseResidualCVA * 0.18;
    const residualCVA = Math.round((cfg.baseResidualCVA + residualJitter) * 10) / 10;

    const ratioJitter = (rng() - 0.5) * 0.10;
    const hedgeRatio = Math.round(Math.max(0.2, Math.min(0.95, cfg.baseHedgeRatio + ratioJitter)) * 100) / 100;

    return {
      hedgeType: cfg.hedgeType,
      referenceEntity: cfg.referenceEntity,
      notional,
      cdsSpread,
      hedgeEffectiveness,
      residualCVA,
      hedgeRatio,
    };
  });
}

function generateRegulatoryCapital(rng: () => number): RegulatoryCapitalEntry[] {
  return REGCAP_CONFIGS.map((cfg) => {
    const chargeJitter = (rng() - 0.5) * cfg.baseCapitalCharge * 0.08;
    const capitalCharge = Math.round(cfg.baseCapitalCharge + chargeJitter);

    const rwaJitter = (rng() - 0.5) * cfg.baseRWA * 0.08;
    const rwa = Math.round(cfg.baseRWA + rwaJitter);

    const ratioJitter = (rng() - 0.5) * 0.4;
    const capitalRatio = Math.round((cfg.baseCapitalRatio + ratioJitter) * 10) / 10;

    const change1q = Math.round((rng() - 0.5) * 8 * 10) / 10;

    return {
      approach: cfg.approach,
      description: cfg.description,
      capitalCharge,
      rwa,
      capitalRatio,
      change1q,
    };
  });
}

function generateCVAMonitorData(): CVAMonitorResponse {
  const rng = seededRandom('cva-monitor');

  const counterpartyExposure = generateCounterpartyExposure(rng);
  const xvaBreakdown = generateXVABreakdown(rng);
  const cvaByProduct = generateCVAByProduct(rng);
  const wrongWayRisk = generateWrongWayRisk(rng);
  const collateralImpact = generateCollateralImpact(rng);
  const seniorManagement = generateSeniorManagement(rng, counterpartyExposure);
  const cvaHedging = generateCVAHedging(rng);
  const regulatoryCapital = generateRegulatoryCapital(rng);

  // Summary
  const cvaEntry = xvaBreakdown.find((x) => x.type === 'CVA');
  const dvaEntry = xvaBreakdown.find((x) => x.type === 'DVA');
  const fvaEntry = xvaBreakdown.find((x) => x.type === 'FVA');

  const totalCVA = cvaEntry ? cvaEntry.total : 0;
  const totalDVA = dvaEntry ? dvaEntry.total : 0;
  const totalFVA = fvaEntry ? fvaEntry.total : 0;
  const netXVA = Math.round(xvaBreakdown.reduce((sum, x) => sum + x.total, 0) * 10) / 10;

  const topCounterparty = counterpartyExposure.reduce(
    (max, cp) => (cp.cvaCharge > max.cvaCharge ? cp : max),
    counterpartyExposure[0]
  ).counterparty;

  const timestamp = new Date().toISOString();

  const summary: CVAMonitorSummary = {
    totalCVA,
    totalDVA,
    totalFVA,
    netXVA,
    topCounterparty,
    counterpartyCount: counterpartyExposure.length,
    timestamp,
  };

  return {
    counterpartyExposure,
    xvaBreakdown,
    cvaByProduct,
    wrongWayRisk,
    collateralImpact,
    seniorManagement,
    cvaHedging,
    regulatoryCapital,
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

    const data = generateCVAMonitorData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CVAMonitor] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate CVA monitor data' });
  }
});

export default router;
