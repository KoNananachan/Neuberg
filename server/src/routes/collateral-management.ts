import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface CollateralPoolSummary {
  totalEligible: number;
  totalPledged: number;
  excessCollateral: number;
  haircutAdjustedValue: number;
}

interface AssetClassBreakdown {
  assetClass: string;
  marketValue: number;
  pledged: number;
  available: number;
  haircutPct: number;
  haircutAdjustedValue: number;
  pctOfPool: number;
}

interface CounterpartyExposure {
  counterparty: string;
  totalExposure: number;
  collateralReceived: number;
  collateralPosted: number;
  netExposure: number;
  marginCallsPending: number;
  marginCallsAmount: number;
  disputeCount: number;
  disputeAmount: number;
  rating: string;
}

interface OptimizationMetric {
  strategy: string;
  description: string;
  currentCostBps: number;
  optimizedCostBps: number;
  savingsBps: number;
  feasibility: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedFreedCollateral: number;
}

interface MarginCallEntry {
  id: string;
  counterparty: string;
  direction: 'ISSUED' | 'RECEIVED';
  amount: number;
  currency: string;
  callDate: string;
  responseDeadline: string;
  status: 'PENDING' | 'AGREED' | 'DISPUTED' | 'SETTLED' | 'PARTIALLY_SETTLED';
  collateralType: string;
}

interface RegulatoryMetrics {
  initialMarginTotal: number;
  variationMarginTotal: number;
  simmMargin: number;
  simmModelVersion: string;
  gridScheduleMargin: number;
  simmVsGridSavings: number;
  umrCompliant: boolean;
  umrPhase: number;
  umrThresholdEur: number;
  currentAANA: number;
  minimumTransferAmount: number;
  independentAmount: number;
  threshold: number;
}

interface CollateralManagementResponse {
  poolSummary: CollateralPoolSummary;
  assetClassBreakdown: AssetClassBreakdown[];
  counterpartyExposures: CounterpartyExposure[];
  optimizationMetrics: OptimizationMetric[];
  marginCallTimeline: MarginCallEntry[];
  regulatoryMetrics: RegulatoryMetrics;
  timestamp: string;
}

// ── Cache ──

let cache: { data: CollateralManagementResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Asset class configuration ──

interface AssetClassConfig {
  assetClass: string;
  baseMarketValue: number;
  basePledgedPct: number;
  baseHaircutPct: number;
  volatility: number;
}

const ASSET_CLASS_CONFIGS: AssetClassConfig[] = [
  { assetClass: 'Government Bonds', baseMarketValue: 42500, basePledgedPct: 0.72, baseHaircutPct: 2.0, volatility: 0.05 },
  { assetClass: 'Corporate Bonds', baseMarketValue: 18200, basePledgedPct: 0.58, baseHaircutPct: 8.0, volatility: 0.08 },
  { assetClass: 'Equities', baseMarketValue: 12800, basePledgedPct: 0.42, baseHaircutPct: 15.0, volatility: 0.12 },
  { assetClass: 'Cash', baseMarketValue: 15600, basePledgedPct: 0.85, baseHaircutPct: 0.0, volatility: 0.03 },
  { assetClass: 'MBS', baseMarketValue: 9400, basePledgedPct: 0.65, baseHaircutPct: 5.0, volatility: 0.07 },
  { assetClass: 'ABS', baseMarketValue: 4800, basePledgedPct: 0.50, baseHaircutPct: 10.0, volatility: 0.10 },
];

// ── Counterparty configuration ──

interface CounterpartyConfig {
  name: string;
  baseExposure: number;
  baseReceivedPct: number;
  basePostedPct: number;
  baseMarginCalls: number;
  baseDisputeRate: number;
  rating: string;
  volatility: number;
}

const COUNTERPARTY_CONFIGS: CounterpartyConfig[] = [
  { name: 'Goldman Sachs', baseExposure: 8500, baseReceivedPct: 0.62, basePostedPct: 0.38, baseMarginCalls: 3, baseDisputeRate: 0.08, rating: 'A+', volatility: 0.10 },
  { name: 'JP Morgan', baseExposure: 9200, baseReceivedPct: 0.58, basePostedPct: 0.42, baseMarginCalls: 2, baseDisputeRate: 0.05, rating: 'AA-', volatility: 0.08 },
  { name: 'Morgan Stanley', baseExposure: 7100, baseReceivedPct: 0.60, basePostedPct: 0.40, baseMarginCalls: 4, baseDisputeRate: 0.10, rating: 'A+', volatility: 0.09 },
  { name: 'Citadel Securities', baseExposure: 5800, baseReceivedPct: 0.55, basePostedPct: 0.45, baseMarginCalls: 5, baseDisputeRate: 0.12, rating: 'A', volatility: 0.12 },
  { name: 'Barclays', baseExposure: 6400, baseReceivedPct: 0.64, basePostedPct: 0.36, baseMarginCalls: 2, baseDisputeRate: 0.06, rating: 'A', volatility: 0.09 },
  { name: 'Deutsche Bank', baseExposure: 5200, baseReceivedPct: 0.57, basePostedPct: 0.43, baseMarginCalls: 3, baseDisputeRate: 0.11, rating: 'A-', volatility: 0.11 },
  { name: 'BNP Paribas', baseExposure: 4900, baseReceivedPct: 0.61, basePostedPct: 0.39, baseMarginCalls: 2, baseDisputeRate: 0.07, rating: 'A+', volatility: 0.08 },
  { name: 'UBS', baseExposure: 4600, baseReceivedPct: 0.59, basePostedPct: 0.41, baseMarginCalls: 3, baseDisputeRate: 0.09, rating: 'A+', volatility: 0.10 },
  { name: 'HSBC', baseExposure: 4100, baseReceivedPct: 0.63, basePostedPct: 0.37, baseMarginCalls: 1, baseDisputeRate: 0.04, rating: 'AA-', volatility: 0.07 },
  { name: 'Societe Generale', baseExposure: 3800, baseReceivedPct: 0.56, basePostedPct: 0.44, baseMarginCalls: 4, baseDisputeRate: 0.13, rating: 'A', volatility: 0.11 },
];

// ── Optimization strategy configuration ──

interface OptimizationConfig {
  strategy: string;
  description: string;
  baseCostBps: number;
  baseOptimizedBps: number;
  feasibility: 'HIGH' | 'MEDIUM' | 'LOW';
  baseFreedCollateral: number;
  volatility: number;
}

const OPTIMIZATION_CONFIGS: OptimizationConfig[] = [
  { strategy: 'Cheapest-to-Deliver Substitution', description: 'Replace high-haircut corporates with government bonds to reduce margin drag', baseCostBps: 42.5, baseOptimizedBps: 28.3, feasibility: 'HIGH', baseFreedCollateral: 1250, volatility: 3.0 },
  { strategy: 'Collateral Upgrade Trade', description: 'Swap IG corporates for UST via repo to reduce haircut from 8% to 2%', baseCostBps: 38.2, baseOptimizedBps: 22.1, feasibility: 'HIGH', baseFreedCollateral: 980, volatility: 4.0 },
  { strategy: 'Cross-Currency Optimization', description: 'Substitute EUR collateral with USD equivalent via FX swap to eliminate cross-currency add-on', baseCostBps: 18.9, baseOptimizedBps: 14.5, feasibility: 'LOW', baseFreedCollateral: 420, volatility: 2.5 },
  { strategy: 'Netting Optimization', description: 'Consolidate bilateral CSAs to reduce gross margin requirements', baseCostBps: 56.4, baseOptimizedBps: 41.8, feasibility: 'MEDIUM', baseFreedCollateral: 1850, volatility: 5.0 },
  { strategy: 'CCP Migration', description: 'Move eligible bilateral trades to CCP for portfolio margining benefits', baseCostBps: 24.6, baseOptimizedBps: 16.9, feasibility: 'HIGH', baseFreedCollateral: 760, volatility: 3.5 },
  { strategy: 'Collateral Rehypothecation', description: 'Reinvest received collateral into higher-yielding securities within CSA constraints', baseCostBps: 12.4, baseOptimizedBps: 8.1, feasibility: 'MEDIUM', baseFreedCollateral: 340, volatility: 2.0 },
];

// ── Margin call configuration ──

interface MarginCallConfig {
  counterparty: string;
  direction: 'ISSUED' | 'RECEIVED';
  baseAmount: number;
  currency: string;
  collateralType: string;
  statusWeights: [number, number, number, number, number]; // PENDING, AGREED, DISPUTED, SETTLED, PARTIALLY_SETTLED
  daysAgoBase: number;
  volatility: number;
}

const MARGIN_CALL_CONFIGS: MarginCallConfig[] = [
  { counterparty: 'Goldman Sachs', direction: 'ISSUED', baseAmount: 185, currency: 'USD', collateralType: 'UST 10Y', statusWeights: [0.40, 0.20, 0.10, 0.20, 0.10], daysAgoBase: 0, volatility: 0.15 },
  { counterparty: 'JP Morgan', direction: 'RECEIVED', baseAmount: 240, currency: 'USD', collateralType: 'Cash', statusWeights: [0.10, 0.15, 0.05, 0.60, 0.10], daysAgoBase: 2, volatility: 0.12 },
  { counterparty: 'Morgan Stanley', direction: 'ISSUED', baseAmount: 125, currency: 'USD', collateralType: 'Agency MBS', statusWeights: [0.50, 0.15, 0.15, 0.10, 0.10], daysAgoBase: 0, volatility: 0.18 },
  { counterparty: 'Citadel Securities', direction: 'RECEIVED', baseAmount: 310, currency: 'USD', collateralType: 'Cash', statusWeights: [0.05, 0.10, 0.05, 0.70, 0.10], daysAgoBase: 3, volatility: 0.10 },
  { counterparty: 'Barclays', direction: 'ISSUED', baseAmount: 95, currency: 'EUR', collateralType: 'Bunds', statusWeights: [0.35, 0.25, 0.10, 0.20, 0.10], daysAgoBase: 1, volatility: 0.14 },
  { counterparty: 'Deutsche Bank', direction: 'RECEIVED', baseAmount: 175, currency: 'EUR', collateralType: 'Cash', statusWeights: [0.15, 0.20, 0.10, 0.45, 0.10], daysAgoBase: 1, volatility: 0.13 },
  { counterparty: 'BNP Paribas', direction: 'ISSUED', baseAmount: 210, currency: 'USD', collateralType: 'UST 5Y', statusWeights: [0.45, 0.15, 0.20, 0.10, 0.10], daysAgoBase: 0, volatility: 0.16 },
  { counterparty: 'UBS', direction: 'RECEIVED', baseAmount: 155, currency: 'CHF', collateralType: 'Swiss Govt', statusWeights: [0.20, 0.25, 0.05, 0.40, 0.10], daysAgoBase: 2, volatility: 0.11 },
  { counterparty: 'HSBC', direction: 'ISSUED', baseAmount: 88, currency: 'GBP', collateralType: 'Gilts', statusWeights: [0.30, 0.30, 0.05, 0.25, 0.10], daysAgoBase: 1, volatility: 0.12 },
  { counterparty: 'Societe Generale', direction: 'RECEIVED', baseAmount: 145, currency: 'EUR', collateralType: 'OATs', statusWeights: [0.10, 0.15, 0.15, 0.50, 0.10], daysAgoBase: 4, volatility: 0.14 },
  { counterparty: 'Goldman Sachs', direction: 'RECEIVED', baseAmount: 280, currency: 'USD', collateralType: 'Cash', statusWeights: [0.05, 0.10, 0.05, 0.70, 0.10], daysAgoBase: 5, volatility: 0.10 },
  { counterparty: 'Morgan Stanley', direction: 'RECEIVED', baseAmount: 195, currency: 'USD', collateralType: 'UST 2Y', statusWeights: [0.08, 0.12, 0.05, 0.65, 0.10], daysAgoBase: 4, volatility: 0.11 },
];

// ── Data generation ──

function generateAssetClassBreakdown(rng: () => number): AssetClassBreakdown[] {
  const entries = ASSET_CLASS_CONFIGS.map((cfg) => {
    const mvJitter = (rng() - 0.5) * cfg.baseMarketValue * cfg.volatility * 2;
    const marketValue = Math.round(cfg.baseMarketValue + mvJitter);

    const pledgedPctJitter = (rng() - 0.5) * 0.10;
    const pledgedPct = Math.max(0.20, Math.min(0.95, cfg.basePledgedPct + pledgedPctJitter));
    const pledged = Math.round(marketValue * pledgedPct);
    const available = marketValue - pledged;

    const haircutJitter = cfg.baseHaircutPct > 0 ? (rng() - 0.5) * cfg.baseHaircutPct * 0.12 : 0;
    const haircutPct = Math.round((cfg.baseHaircutPct + haircutJitter) * 100) / 100;

    const haircutAdjustedValue = Math.round(marketValue * (1 - haircutPct / 100));

    return {
      assetClass: cfg.assetClass,
      marketValue,
      pledged,
      available,
      haircutPct,
      haircutAdjustedValue,
      pctOfPool: 0, // computed after totals
    };
  });

  const totalMV = entries.reduce((sum, e) => sum + e.marketValue, 0);
  entries.forEach((e) => {
    e.pctOfPool = Math.round((e.marketValue / totalMV) * 1000) / 10;
  });

  return entries;
}

function generatePoolSummary(breakdown: AssetClassBreakdown[]): CollateralPoolSummary {
  const totalEligible = breakdown.reduce((sum, e) => sum + e.marketValue, 0);
  const totalPledged = breakdown.reduce((sum, e) => sum + e.pledged, 0);
  const excessCollateral = totalEligible - totalPledged;
  const haircutAdjustedValue = breakdown.reduce((sum, e) => sum + e.haircutAdjustedValue, 0);

  return { totalEligible, totalPledged, excessCollateral, haircutAdjustedValue };
}

function generateCounterpartyExposures(rng: () => number): CounterpartyExposure[] {
  return COUNTERPARTY_CONFIGS.map((cfg) => {
    const expJitter = (rng() - 0.5) * cfg.baseExposure * cfg.volatility * 2;
    const totalExposure = Math.round(cfg.baseExposure + expJitter);

    const receivedPctJitter = (rng() - 0.5) * 0.08;
    const receivedPct = Math.max(0.40, Math.min(0.80, cfg.baseReceivedPct + receivedPctJitter));
    const collateralReceived = Math.round(totalExposure * receivedPct);

    const postedPctJitter = (rng() - 0.5) * 0.08;
    const postedPct = Math.max(0.20, Math.min(0.60, cfg.basePostedPct + postedPctJitter));
    const collateralPosted = Math.round(totalExposure * postedPct);

    const netExposure = collateralReceived - collateralPosted;

    // Margin calls pending: base +/- small jitter
    const callJitter = Math.floor(rng() * 3) - 1;
    const marginCallsPending = Math.max(0, cfg.baseMarginCalls + callJitter);
    const marginCallsAmount = marginCallsPending > 0
      ? Math.round(totalExposure * 0.02 * marginCallsPending * (0.8 + rng() * 0.4))
      : 0;

    // Disputes
    const hasDispute = rng() < cfg.baseDisputeRate * 3;
    const disputeCount = hasDispute ? Math.max(1, Math.floor(rng() * 3)) : 0;
    const disputeAmount = disputeCount > 0
      ? Math.round(totalExposure * 0.005 * disputeCount * (0.7 + rng() * 0.6))
      : 0;

    return {
      counterparty: cfg.name,
      totalExposure,
      collateralReceived,
      collateralPosted,
      netExposure,
      marginCallsPending,
      marginCallsAmount,
      disputeCount,
      disputeAmount,
      rating: cfg.rating,
    };
  });
}

function generateOptimizationMetrics(rng: () => number): OptimizationMetric[] {
  return OPTIMIZATION_CONFIGS.map((cfg) => {
    const costJitter = (rng() - 0.5) * cfg.volatility * 2;
    const currentCostBps = Math.round((cfg.baseCostBps + costJitter) * 10) / 10;

    const optJitter = (rng() - 0.5) * cfg.volatility * 1.5;
    const optimizedCostBps = Math.round((cfg.baseOptimizedBps + optJitter) * 10) / 10;

    const savingsBps = Math.round((currentCostBps - optimizedCostBps) * 10) / 10;

    const freedJitter = (rng() - 0.5) * cfg.baseFreedCollateral * 0.15;
    const estimatedFreedCollateral = Math.round(cfg.baseFreedCollateral + freedJitter);

    return {
      strategy: cfg.strategy,
      description: cfg.description,
      currentCostBps,
      optimizedCostBps,
      savingsBps,
      feasibility: cfg.feasibility,
      estimatedFreedCollateral,
    };
  });
}

function generateMarginCallTimeline(rng: () => number): MarginCallEntry[] {
  const today = new Date();
  const statuses: MarginCallEntry['status'][] = ['PENDING', 'AGREED', 'DISPUTED', 'SETTLED', 'PARTIALLY_SETTLED'];

  return MARGIN_CALL_CONFIGS.map((cfg, idx) => {
    const daysAgoJitter = Math.floor(rng() * 2);
    const daysAgo = cfg.daysAgoBase + daysAgoJitter;
    const callDate = new Date(today);
    callDate.setDate(callDate.getDate() - daysAgo);

    const deadlineOffset = 1 + Math.floor(rng() * 2); // 1-2 business days from call
    const responseDeadline = new Date(callDate);
    responseDeadline.setDate(responseDeadline.getDate() + deadlineOffset);

    const amtJitter = (rng() - 0.5) * cfg.baseAmount * cfg.volatility * 2;
    const amount = Math.round(cfg.baseAmount + amtJitter);

    // Determine status from weighted random
    const roll = rng();
    let cumulative = 0;
    let status: MarginCallEntry['status'] = 'PENDING';
    for (let i = 0; i < cfg.statusWeights.length; i++) {
      cumulative += cfg.statusWeights[i];
      if (roll < cumulative) {
        status = statuses[i];
        break;
      }
    }

    return {
      id: `MC-${new Date().getFullYear()}-${String(idx + 1).padStart(4, '0')}`,
      counterparty: cfg.counterparty,
      direction: cfg.direction,
      amount,
      currency: cfg.currency,
      callDate: callDate.toISOString().slice(0, 10),
      responseDeadline: responseDeadline.toISOString().slice(0, 10),
      status,
      collateralType: cfg.collateralType,
    };
  });
}

function generateRegulatoryMetrics(rng: () => number): RegulatoryMetrics {
  // Initial Margin across all counterparties
  const imBase = 12500;
  const imJitter = (rng() - 0.5) * imBase * 0.08;
  const initialMarginTotal = Math.round(imBase + imJitter);

  // Variation Margin
  const vmBase = 4200;
  const vmJitter = (rng() - 0.5) * vmBase * 0.10;
  const variationMarginTotal = Math.round(vmBase + vmJitter);

  // ISDA SIMM calculation
  const simmBase = 9800;
  const simmJitter = (rng() - 0.5) * simmBase * 0.08;
  const simmMargin = Math.round(simmBase + simmJitter);

  // Grid/Schedule comparison
  const gridBase = 13400;
  const gridJitter = (rng() - 0.5) * gridBase * 0.06;
  const gridScheduleMargin = Math.round(gridBase + gridJitter);

  const simmVsGridSavings = gridScheduleMargin - simmMargin;

  // UMR: Uncleared Margin Rules
  const umrThresholdEur = 8000; // EUR 8B in millions
  const aanaBase = 14500;
  const aanaJitter = (rng() - 0.5) * 3000;
  const currentAANA = Math.round(aanaBase + aanaJitter);

  // Minimum transfer amount and thresholds
  const minimumTransferAmount = 500; // $K standard ISDA
  const independentAmountBase = 2200;
  const iaJitter = (rng() - 0.5) * independentAmountBase * 0.10;
  const independentAmount = Math.round(independentAmountBase + iaJitter);

  const thresholdBase = 25000;
  const thresholdJitter = (rng() - 0.5) * thresholdBase * 0.05;
  const threshold = Math.round(thresholdBase + thresholdJitter);

  return {
    initialMarginTotal,
    variationMarginTotal,
    simmMargin,
    simmModelVersion: 'ISDA SIMM v2.6',
    gridScheduleMargin,
    simmVsGridSavings,
    umrCompliant: true,
    umrPhase: 6,
    umrThresholdEur,
    currentAANA,
    minimumTransferAmount,
    independentAmount,
    threshold,
  };
}

function generateCollateralManagementData(): CollateralManagementResponse {
  const rng = seededRandom('collateral-mgmt-dashboard');

  const assetClassBreakdown = generateAssetClassBreakdown(rng);
  const poolSummary = generatePoolSummary(assetClassBreakdown);
  const counterpartyExposures = generateCounterpartyExposures(rng);
  const optimizationMetrics = generateOptimizationMetrics(rng);
  const marginCallTimeline = generateMarginCallTimeline(rng);
  const regulatoryMetrics = generateRegulatoryMetrics(rng);

  return {
    poolSummary,
    assetClassBreakdown,
    counterpartyExposures,
    optimizationMetrics,
    marginCallTimeline,
    regulatoryMetrics,
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

    const data = generateCollateralManagementData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CollateralManagement] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(502).json({ error: 'Failed to generate collateral management data' });
  }
});

export default router;
