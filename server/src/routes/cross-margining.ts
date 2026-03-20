import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ── Types ──

interface CrossMarginSummary {
  totalMarginWithoutNetting: number;
  totalMarginWithCrossBenefit: number;
  savingsAmount: number;
  savingsPercent: number;
  capitalEfficiencyRatio: number;
}

interface ProductPairOffset {
  pairName: string;
  productA: string;
  productB: string;
  standaloneMarginA: number;
  standaloneMarginB: number;
  crossMargin: number;
  offsetPercent: number;
  correlation: number;
}

interface CCPCrossMarginProgram {
  program: string;
  eligibleProducts: string[];
  currentBenefit: number;
  utilizationRate: number;
  maxCapacity: number;
}

interface PortfolioVsRegTPosition {
  position: string;
  assetClass: string;
  regTMargin: number;
  portfolioMargin: number;
  savingsPercent: number;
}

interface AssetClassEfficiency {
  assetClass: string;
  standaloneMargin: number;
  crossMarginedMargin: number;
  efficiencyGainPercent: number;
}

interface HistoricalSavingsPoint {
  date: string;
  savingsAmount: number;
}

interface CrossMarginingResponse {
  summary: CrossMarginSummary;
  productPairOffsets: ProductPairOffset[];
  ccpPrograms: CCPCrossMarginProgram[];
  portfolioVsRegT: PortfolioVsRegTPosition[];
  assetClassEfficiency: AssetClassEfficiency[];
  historicalSavings: HistoricalSavingsPoint[];
  timestamp: string;
}

// ── Product pair offset configurations ──

interface PairConfig {
  pairName: string;
  productA: string;
  productB: string;
  baseStandaloneA: number;
  baseStandaloneB: number;
  baseCorrelation: number;
  volatility: number;
}

const PAIR_CONFIGS: PairConfig[] = [
  { pairName: 'Treasury Futures vs IRS', productA: 'UST 10Y Futures', productB: 'USD IRS 10Y', baseStandaloneA: 245, baseStandaloneB: 312, baseCorrelation: 0.94, volatility: 0.06 },
  { pairName: 'Equity Index vs Equity Options', productA: 'S&P 500 Futures', productB: 'SPX Options', baseStandaloneA: 185, baseStandaloneB: 220, baseCorrelation: 0.88, volatility: 0.08 },
  { pairName: 'CDS vs Corporate Bonds', productA: 'CDX IG Index', productB: 'IG Corp Bond Portfolio', baseStandaloneA: 128, baseStandaloneB: 165, baseCorrelation: 0.91, volatility: 0.07 },
  { pairName: 'Eurodollar vs SOFR', productA: 'Eurodollar Futures', productB: 'SOFR Futures', baseStandaloneA: 95, baseStandaloneB: 88, baseCorrelation: 0.97, volatility: 0.04 },
  { pairName: 'Bund vs EUR IRS', productA: 'Euro Bund Futures', productB: 'EUR IRS 10Y', baseStandaloneA: 198, baseStandaloneB: 275, baseCorrelation: 0.92, volatility: 0.06 },
  { pairName: 'Gold vs Silver', productA: 'COMEX Gold Futures', productB: 'COMEX Silver Futures', baseStandaloneA: 142, baseStandaloneB: 118, baseCorrelation: 0.82, volatility: 0.10 },
  { pairName: 'WTI vs Brent', productA: 'WTI Crude Futures', productB: 'Brent Crude Futures', baseStandaloneA: 168, baseStandaloneB: 172, baseCorrelation: 0.96, volatility: 0.05 },
  { pairName: 'FX Spot vs FX Options', productA: 'EUR/USD Spot', productB: 'EUR/USD Options', baseStandaloneA: 78, baseStandaloneB: 105, baseCorrelation: 0.85, volatility: 0.09 },
  { pairName: 'Treasury Cash vs Futures', productA: 'UST 5Y Notes', productB: 'UST 5Y Futures', baseStandaloneA: 155, baseStandaloneB: 148, baseCorrelation: 0.98, volatility: 0.03 },
  { pairName: 'EM Sovereign CDS vs Bonds', productA: 'EM CDX Index', productB: 'EM Sovereign Bonds', baseStandaloneA: 210, baseStandaloneB: 238, baseCorrelation: 0.86, volatility: 0.09 },
];

// ── CCP program configurations ──

interface CCPConfig {
  program: string;
  eligibleProducts: string[];
  baseBenefit: number;
  baseUtilizationRate: number;
  baseMaxCapacity: number;
  volatility: number;
}

const CCP_CONFIGS: CCPConfig[] = [
  {
    program: 'CME-FICC Cross-Margining',
    eligibleProducts: ['Treasury Futures', 'Treasury Cash', 'Agency MBS', 'Interest Rate Swaps'],
    baseBenefit: 1850,
    baseUtilizationRate: 0.72,
    baseMaxCapacity: 3200,
    volatility: 0.08,
  },
  {
    program: 'OCC-CME Cross-Margining',
    eligibleProducts: ['Equity Index Futures', 'Equity Options', 'ETF Options', 'Index Options'],
    baseBenefit: 1420,
    baseUtilizationRate: 0.68,
    baseMaxCapacity: 2600,
    volatility: 0.07,
  },
  {
    program: 'Eurex Prisma',
    eligibleProducts: ['Euro Bund Futures', 'EUR IRS', 'Euro Stoxx Futures', 'Equity Derivatives'],
    baseBenefit: 1180,
    baseUtilizationRate: 0.61,
    baseMaxCapacity: 2100,
    volatility: 0.09,
  },
];

// ── Portfolio vs Reg-T position configurations ──

interface RegTConfig {
  position: string;
  assetClass: string;
  baseRegTMargin: number;
  basePortfolioMargin: number;
  volatility: number;
}

const REGT_CONFIGS: RegTConfig[] = [
  { position: 'S&P 500 ETF Long + Put Hedge', assetClass: 'Equities', baseRegTMargin: 520, basePortfolioMargin: 185, volatility: 0.08 },
  { position: 'NASDAQ Futures + Call Overwrite', assetClass: 'Equities', baseRegTMargin: 445, basePortfolioMargin: 162, volatility: 0.09 },
  { position: 'Treasury Bond Portfolio', assetClass: 'Rates', baseRegTMargin: 380, basePortfolioMargin: 95, volatility: 0.06 },
  { position: 'IG Credit Long/Short', assetClass: 'Credit', baseRegTMargin: 310, basePortfolioMargin: 124, volatility: 0.07 },
  { position: 'FX Carry Trade Basket', assetClass: 'FX', baseRegTMargin: 265, basePortfolioMargin: 112, volatility: 0.10 },
  { position: 'Commodity Spread (WTI/Brent)', assetClass: 'Commodities', baseRegTMargin: 198, basePortfolioMargin: 58, volatility: 0.08 },
  { position: 'Convertible Bond Arbitrage', assetClass: 'Multi-Asset', baseRegTMargin: 425, basePortfolioMargin: 148, volatility: 0.07 },
  { position: 'Volatility Dispersion Trade', assetClass: 'Equities', baseRegTMargin: 350, basePortfolioMargin: 128, volatility: 0.11 },
];

// ── Asset class efficiency configurations ──

interface EfficiencyConfig {
  assetClass: string;
  baseStandalone: number;
  baseEfficiencyGain: number;
  volatility: number;
}

const EFFICIENCY_CONFIGS: EfficiencyConfig[] = [
  { assetClass: 'Rates', baseStandalone: 4250, baseEfficiencyGain: 0.38, volatility: 0.06 },
  { assetClass: 'Equities', baseStandalone: 3180, baseEfficiencyGain: 0.28, volatility: 0.08 },
  { assetClass: 'Credit', baseStandalone: 2420, baseEfficiencyGain: 0.32, volatility: 0.07 },
  { assetClass: 'FX', baseStandalone: 1650, baseEfficiencyGain: 0.22, volatility: 0.09 },
  { assetClass: 'Commodities', baseStandalone: 1380, baseEfficiencyGain: 0.25, volatility: 0.10 },
];

// ── Data generation ──

function generateSummary(rng: () => number): CrossMarginSummary {
  const baseWithoutNetting = 18500;
  const jitterWithout = (rng() - 0.5) * baseWithoutNetting * 0.08;
  const totalMarginWithoutNetting = round2(baseWithoutNetting + jitterWithout);

  const baseSavingsPct = 0.32;
  const savingsPctJitter = (rng() - 0.5) * 0.08;
  const savingsPercent = round4(baseSavingsPct + savingsPctJitter);

  const savingsAmount = round2(totalMarginWithoutNetting * savingsPercent);
  const totalMarginWithCrossBenefit = round2(totalMarginWithoutNetting - savingsAmount);

  const capitalEfficiencyRatio = round4(totalMarginWithoutNetting / totalMarginWithCrossBenefit);

  return {
    totalMarginWithoutNetting,
    totalMarginWithCrossBenefit,
    savingsAmount,
    savingsPercent: round4(savingsPercent * 100),
    capitalEfficiencyRatio,
  };
}

function generateProductPairOffsets(rng: () => number): ProductPairOffset[] {
  return PAIR_CONFIGS.map((cfg) => {
    const aJitter = (rng() - 0.5) * cfg.baseStandaloneA * cfg.volatility * 2;
    const standaloneMarginA = round2(cfg.baseStandaloneA + aJitter);

    const bJitter = (rng() - 0.5) * cfg.baseStandaloneB * cfg.volatility * 2;
    const standaloneMarginB = round2(cfg.baseStandaloneB + bJitter);

    const corrJitter = (rng() - 0.5) * 0.06;
    const correlation = round4(Math.min(0.99, Math.max(0.60, cfg.baseCorrelation + corrJitter)));

    // Cross-margin benefit scales with correlation
    const combinedStandalone = standaloneMarginA + standaloneMarginB;
    const offsetFactor = correlation * (0.35 + rng() * 0.15);
    const crossMargin = round2(combinedStandalone * (1 - offsetFactor));
    const offsetPercent = round4(((combinedStandalone - crossMargin) / combinedStandalone) * 100);

    return {
      pairName: cfg.pairName,
      productA: cfg.productA,
      productB: cfg.productB,
      standaloneMarginA,
      standaloneMarginB,
      crossMargin,
      offsetPercent,
      correlation,
    };
  });
}

function generateCCPPrograms(rng: () => number): CCPCrossMarginProgram[] {
  return CCP_CONFIGS.map((cfg) => {
    const benefitJitter = (rng() - 0.5) * cfg.baseBenefit * cfg.volatility * 2;
    const currentBenefit = round2(cfg.baseBenefit + benefitJitter);

    const utilJitter = (rng() - 0.5) * 0.12;
    const utilizationRate = round4(Math.min(0.95, Math.max(0.40, cfg.baseUtilizationRate + utilJitter)));

    const capJitter = (rng() - 0.5) * cfg.baseMaxCapacity * cfg.volatility * 2;
    const maxCapacity = round2(cfg.baseMaxCapacity + capJitter);

    return {
      program: cfg.program,
      eligibleProducts: cfg.eligibleProducts,
      currentBenefit,
      utilizationRate,
      maxCapacity,
    };
  });
}

function generatePortfolioVsRegT(rng: () => number): PortfolioVsRegTPosition[] {
  return REGT_CONFIGS.map((cfg) => {
    const regTJitter = (rng() - 0.5) * cfg.baseRegTMargin * cfg.volatility * 2;
    const regTMargin = round2(cfg.baseRegTMargin + regTJitter);

    const pmJitter = (rng() - 0.5) * cfg.basePortfolioMargin * cfg.volatility * 2;
    const portfolioMargin = round2(cfg.basePortfolioMargin + pmJitter);

    const savingsPercent = round4(((regTMargin - portfolioMargin) / regTMargin) * 100);

    return {
      position: cfg.position,
      assetClass: cfg.assetClass,
      regTMargin,
      portfolioMargin,
      savingsPercent,
    };
  });
}

function generateAssetClassEfficiency(rng: () => number): AssetClassEfficiency[] {
  return EFFICIENCY_CONFIGS.map((cfg) => {
    const standaloneJitter = (rng() - 0.5) * cfg.baseStandalone * cfg.volatility * 2;
    const standaloneMargin = round2(cfg.baseStandalone + standaloneJitter);

    const gainJitter = (rng() - 0.5) * cfg.baseEfficiencyGain * 0.15;
    const efficiencyGain = Math.max(0.10, cfg.baseEfficiencyGain + gainJitter);

    const crossMarginedMargin = round2(standaloneMargin * (1 - efficiencyGain));
    const efficiencyGainPercent = round4(efficiencyGain * 100);

    return {
      assetClass: cfg.assetClass,
      standaloneMargin,
      crossMarginedMargin,
      efficiencyGainPercent,
    };
  });
}

function generateHistoricalSavings(rng: () => number): HistoricalSavingsPoint[] {
  const today = new Date();
  const points: HistoricalSavingsPoint[] = [];

  // Base savings amount with mean-reverting walk
  let savings = 5800 + (rng() - 0.5) * 800;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // Mean-reverting random walk
    const drift = (5800 - savings) * 0.06;
    const noise = (rng() - 0.5) * 400;
    savings = Math.max(3500, Math.min(8500, savings + drift + noise));

    points.push({
      date: dateStr,
      savingsAmount: round2(savings),
    });
  }

  return points;
}

function generateCrossMarginingData(): CrossMarginingResponse {
  const rng = seededRandom('cross-margining');

  const summary = generateSummary(rng);
  const productPairOffsets = generateProductPairOffsets(rng);
  const ccpPrograms = generateCCPPrograms(rng);
  const portfolioVsRegT = generatePortfolioVsRegT(rng);
  const assetClassEfficiency = generateAssetClassEfficiency(rng);
  const historicalSavings = generateHistoricalSavings(rng);

  return {
    summary,
    productPairOffsets,
    ccpPrograms,
    portfolioVsRegT,
    assetClassEfficiency,
    historicalSavings,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: CrossMarginingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateCrossMarginingData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CrossMargining] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate cross-margining data' });
  }
});

export default router;
