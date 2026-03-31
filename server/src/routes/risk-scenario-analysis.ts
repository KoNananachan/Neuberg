import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ── Types ──

interface ScenarioResult {
  id: string;
  name: string;
  description: string;
  type: 'historical' | 'hypothetical';
  historicalDate: string | null;
  pnlImpactPct: number;
  pnlImpactDollar: number;
  varImpactPct: number;
  worstCaseLossPct: number;
  worstCaseLossDollar: number;
  affectedAssetClasses: string[];
  probabilityEstimate: number;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
}

interface SensitivityRow {
  assetClass: string;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
  netExposure: number;
}

interface ReverseStressTestResult {
  targetLossPct: number;
  scenario: string;
  description: string;
  requiredShock: string;
  probability: number;
  timeHorizon: string;
}

interface HistoricalDrawdown {
  event: string;
  startDate: string;
  endDate: string;
  peakToTroughPct: number;
  recoveryDays: number;
  maxDailyLossPct: number;
  portfolioEstimatedImpactPct: number;
}

interface StressCorrelationPair {
  asset1: string;
  asset2: string;
  normalCorrelation: number;
  stressCorrelation: number;
  correlationShift: number;
}

interface TailRiskMetric {
  confidenceLevel: number;
  var: number;
  cvar: number;
  expectedShortfall: number;
  maxLoss: number;
}

interface RiskScenarioAnalysisResponse {
  scenarios: ScenarioResult[];
  sensitivityAnalysis: SensitivityRow[];
  reverseStressTests: ReverseStressTestResult[];
  historicalDrawdowns: HistoricalDrawdown[];
  stressCorrelations: StressCorrelationPair[];
  tailRiskMetrics: TailRiskMetric[];
  portfolioNotional: number;
  generatedAt: string;
}

// ── Scenario Definitions ──

const SCENARIO_DEFS = [
  {
    id: 'gfc-2008',
    name: '2008 Global Financial Crisis',
    description: 'Lehman collapse triggers global credit freeze, interbank lending seizes, equity markets fall 40%+, credit spreads blow out to 600bp+',
    type: 'historical' as const,
    historicalDate: '2008-09-15',
    basePnlPct: -38.5,
    baseVarImpactPct: 185,
    baseWorstCasePct: -52.3,
    affectedAssetClasses: ['Equities', 'Credit', 'Structured Products', 'Financials'],
    baseProbability: 0.015,
  },
  {
    id: 'covid-2020',
    name: '2020 COVID Crash',
    description: 'Pandemic lockdowns trigger fastest bear market in history, VIX hits 82, cross-asset liquidation across all risk assets',
    type: 'historical' as const,
    historicalDate: '2020-03-16',
    basePnlPct: -28.2,
    baseVarImpactPct: 145,
    baseWorstCasePct: -41.8,
    affectedAssetClasses: ['Equities', 'High Yield', 'EM Debt', 'Energy'],
    baseProbability: 0.025,
  },
  {
    id: 'rate-shock-200bp',
    name: 'Rate Shock +200bp',
    description: 'Inflation re-accelerates forcing emergency 200bp rate hike, duration-heavy portfolios suffer severe losses, curve flattens violently',
    type: 'hypothetical' as const,
    historicalDate: null,
    basePnlPct: -15.8,
    baseVarImpactPct: 120,
    baseWorstCasePct: -24.6,
    affectedAssetClasses: ['Govies', 'IG Credit', 'REITs', 'Growth Equities'],
    baseProbability: 0.012,
  },
  {
    id: 'oil-spike',
    name: 'Oil Spike ($150/bbl)',
    description: 'Geopolitical supply disruption sends crude to $150/bbl, input costs surge, stagflation fears reignite, consumer spending collapses',
    type: 'hypothetical' as const,
    historicalDate: null,
    basePnlPct: -12.4,
    baseVarImpactPct: 95,
    baseWorstCasePct: -19.7,
    affectedAssetClasses: ['Consumer Discretionary', 'Airlines', 'Industrials', 'EM FX'],
    baseProbability: 0.030,
  },
  {
    id: 'china-hard-landing',
    name: 'China Hard Landing',
    description: 'Property sector collapse triggers banking crisis, GDP growth falls to 1%, commodity demand craters, EM contagion spreads globally',
    type: 'hypothetical' as const,
    historicalDate: null,
    basePnlPct: -22.6,
    baseVarImpactPct: 135,
    baseWorstCasePct: -35.2,
    affectedAssetClasses: ['EM Equities', 'Commodities', 'AUD/NZD', 'Luxury Goods'],
    baseProbability: 0.020,
  },
  {
    id: 'tech-bubble-burst',
    name: 'Tech Bubble Burst',
    description: 'AI hype cycle reversal, mega-cap tech falls 50%+, growth-to-value rotation, Nasdaq peak-to-trough exceeds 40%',
    type: 'hypothetical' as const,
    historicalDate: null,
    basePnlPct: -26.8,
    baseVarImpactPct: 155,
    baseWorstCasePct: -42.1,
    affectedAssetClasses: ['Tech Equities', 'Growth Funds', 'Venture/PE', 'Crypto'],
    baseProbability: 0.018,
  },
  {
    id: 'em-crisis',
    name: 'Emerging Markets Crisis',
    description: 'Dollar surge triggers EM debt cascade, multiple sovereign defaults, capital flight from developing markets, contagion to DM banks',
    type: 'hypothetical' as const,
    historicalDate: null,
    basePnlPct: -18.3,
    baseVarImpactPct: 110,
    baseWorstCasePct: -28.9,
    affectedAssetClasses: ['EM Sovereign Debt', 'EM FX', 'EM Equities', 'Commodities'],
    baseProbability: 0.022,
  },
  {
    id: 'stagflation',
    name: 'Stagflation Scenario',
    description: 'Persistent inflation above 6% combined with negative GDP growth, central banks trapped, traditional 60/40 portfolios fail',
    type: 'hypothetical' as const,
    historicalDate: null,
    basePnlPct: -20.1,
    baseVarImpactPct: 125,
    baseWorstCasePct: -31.5,
    affectedAssetClasses: ['Govies', 'Equities', 'IG Credit', 'Real Estate'],
    baseProbability: 0.028,
  },
] as const;

// ── Sensitivity Base Data ──

const ASSET_CLASS_SENSITIVITY = [
  { assetClass: 'Equities',          baseDelta: 0.85,  baseGamma: 0.042, baseVega: 0.28,  baseTheta: -0.015, baseRho: -0.18, baseNet: 1.25 },
  { assetClass: 'Govies',            baseDelta: -0.32, baseGamma: 0.008, baseVega: 0.12,  baseTheta: -0.004, baseRho: 0.85,  baseNet: -0.45 },
  { assetClass: 'IG Credit',         baseDelta: 0.15,  baseGamma: 0.012, baseVega: 0.18,  baseTheta: -0.008, baseRho: 0.42,  baseNet: 0.35 },
  { assetClass: 'HY Credit',         baseDelta: 0.52,  baseGamma: 0.025, baseVega: 0.35,  baseTheta: -0.012, baseRho: 0.25,  baseNet: 0.68 },
  { assetClass: 'Commodities',       baseDelta: 0.38,  baseGamma: 0.032, baseVega: 0.42,  baseTheta: -0.022, baseRho: -0.08, baseNet: 0.55 },
  { assetClass: 'FX',                baseDelta: 0.12,  baseGamma: 0.018, baseVega: 0.25,  baseTheta: -0.006, baseRho: 0.32,  baseNet: 0.22 },
  { assetClass: 'EM Debt',           baseDelta: 0.45,  baseGamma: 0.020, baseVega: 0.30,  baseTheta: -0.010, baseRho: 0.55,  baseNet: 0.72 },
  { assetClass: 'Structured Credit', baseDelta: 0.28,  baseGamma: 0.015, baseVega: 0.22,  baseTheta: -0.018, baseRho: 0.38,  baseNet: 0.48 },
] as const;

// ── Reverse Stress Test Definitions ──

const REVERSE_STRESS_DEFS = [
  {
    targetLossPct: -10,
    scenario: 'Moderate Risk-Off',
    description: 'Broad equity correction of 12-15% with credit spread widening of 80bp',
    baseRequiredShock: 'SPX -14%, IG spreads +85bp, VIX to 28',
    baseProbability: 0.12,
    timeHorizon: '1 month',
  },
  {
    targetLossPct: -20,
    scenario: 'Severe Market Dislocation',
    description: 'Equity bear market combined with credit stress and liquidity squeeze',
    baseRequiredShock: 'SPX -28%, HY spreads +350bp, VIX to 45',
    baseProbability: 0.04,
    timeHorizon: '3 months',
  },
  {
    targetLossPct: -30,
    scenario: 'Systemic Crisis',
    description: 'Multi-asset collapse with breakdown in correlations, forced deleveraging, counterparty risk materializes',
    baseRequiredShock: 'SPX -42%, HY spreads +650bp, VIX to 65, USD +15%',
    baseProbability: 0.008,
    timeHorizon: '6 months',
  },
  {
    targetLossPct: -50,
    scenario: 'Catastrophic Tail Event',
    description: 'Global financial system breakdown comparable to Great Depression, all risk premia explode',
    baseRequiredShock: 'SPX -60%, HY spreads +1200bp, VIX to 90, multiple defaults',
    baseProbability: 0.002,
    timeHorizon: '12 months',
  },
] as const;

// ── Historical Drawdown Definitions ──

const DRAWDOWN_DEFS = [
  { event: '2008 GFC',                   startDate: '2007-10-09', endDate: '2009-03-09', basePeakToTrough: -56.8, baseRecoveryDays: 1480, baseMaxDailyLoss: -9.0,  basePortfolioImpact: -38.5 },
  { event: '2020 COVID-19',              startDate: '2020-02-19', endDate: '2020-03-23', basePeakToTrough: -33.9, baseRecoveryDays: 148,  baseMaxDailyLoss: -12.0, basePortfolioImpact: -28.2 },
  { event: '2000 Dot-Com Crash',         startDate: '2000-03-24', endDate: '2002-10-09', basePeakToTrough: -49.1, baseRecoveryDays: 1825, baseMaxDailyLoss: -7.1,  basePortfolioImpact: -22.4 },
  { event: '2022 Rate Tightening',       startDate: '2022-01-03', endDate: '2022-10-12', basePeakToTrough: -25.4, baseRecoveryDays: 385,  baseMaxDailyLoss: -4.7,  basePortfolioImpact: -18.6 },
  { event: '2011 EU Sovereign Crisis',   startDate: '2011-05-02', endDate: '2011-10-03', basePeakToTrough: -19.4, baseRecoveryDays: 155,  baseMaxDailyLoss: -6.7,  basePortfolioImpact: -16.2 },
  { event: '1998 LTCM / Russia',         startDate: '1998-07-17', endDate: '1998-10-08', basePeakToTrough: -19.3, baseRecoveryDays: 95,   baseMaxDailyLoss: -6.8,  basePortfolioImpact: -14.8 },
  { event: '2015 China Devaluation',     startDate: '2015-08-10', endDate: '2016-02-11', basePeakToTrough: -14.2, baseRecoveryDays: 190,  baseMaxDailyLoss: -3.9,  basePortfolioImpact: -10.5 },
  { event: '2018 Q4 Vol Shock',          startDate: '2018-09-20', endDate: '2018-12-24', basePeakToTrough: -19.8, baseRecoveryDays: 115,  baseMaxDailyLoss: -3.8,  basePortfolioImpact: -12.5 },
] as const;

// ── Stress Correlation Pairs ──

const STRESS_CORR_PAIRS = [
  { asset1: 'SPX',       asset2: 'US 10Y',   baseNormal: -0.15, baseStress: 0.45  },
  { asset1: 'SPX',       asset2: 'Gold',      baseNormal: 0.05,  baseStress: -0.35 },
  { asset1: 'SPX',       asset2: 'VIX',       baseNormal: -0.82, baseStress: -0.95 },
  { asset1: 'SPX',       asset2: 'HY Credit', baseNormal: 0.68,  baseStress: 0.92  },
  { asset1: 'US 10Y',    asset2: 'Gold',      baseNormal: 0.28,  baseStress: 0.55  },
  { asset1: 'EM Equity', asset2: 'DXY',       baseNormal: -0.35, baseStress: -0.72 },
  { asset1: 'Oil',       asset2: 'Airlines',  baseNormal: -0.42, baseStress: -0.68 },
  { asset1: 'HY Credit', asset2: 'IG Credit', baseNormal: 0.72,  baseStress: 0.88  },
  { asset1: 'SPX',       asset2: 'EM Equity', baseNormal: 0.72,  baseStress: 0.90  },
  { asset1: 'Gold',      asset2: 'DXY',       baseNormal: -0.42, baseStress: -0.65 },
] as const;

// ── Tail Risk Confidence Levels ──

const TAIL_CONFIDENCE_LEVELS = [90, 95, 97.5, 99, 99.5, 99.9] as const;

const PORTFOLIO_NOTIONAL = 500_000_000; // $500M reference portfolio

// ── Data Generation ──

function generate(): RiskScenarioAnalysisResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('risk-scenario-analysis-' + today);
  const rng = mulberry32(seed);

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Stress Scenarios
  const scenarios: ScenarioResult[] = SCENARIO_DEFS.map((def) => {
    const pnlImpactPct = round(jitter(def.basePnlPct, 0.08), 2);
    const pnlImpactDollar = round((pnlImpactPct / 100) * PORTFOLIO_NOTIONAL, 0);
    const varImpactPct = round(jitter(def.baseVarImpactPct, 0.10), 1);
    const worstCaseLossPct = round(jitter(def.baseWorstCasePct, 0.08), 2);
    const worstCaseLossDollar = round((worstCaseLossPct / 100) * PORTFOLIO_NOTIONAL, 0);
    const probabilityEstimate = round(clamp(jitter(def.baseProbability, 0.15), 0.001, 0.10), 4);

    let severity: 'low' | 'moderate' | 'high' | 'extreme';
    const absPnl = Math.abs(pnlImpactPct);
    if (absPnl >= 30) severity = 'extreme';
    else if (absPnl >= 20) severity = 'high';
    else if (absPnl >= 12) severity = 'moderate';
    else severity = 'low';

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      type: def.type,
      historicalDate: def.historicalDate,
      pnlImpactPct,
      pnlImpactDollar,
      varImpactPct,
      worstCaseLossPct,
      worstCaseLossDollar,
      affectedAssetClasses: [...def.affectedAssetClasses],
      probabilityEstimate,
      severity,
    };
  });

  // 2. Sensitivity Analysis (Greeks by asset class)
  const sensitivityAnalysis: SensitivityRow[] = ASSET_CLASS_SENSITIVITY.map((ac) => ({
    assetClass: ac.assetClass,
    delta: round(jitter(ac.baseDelta, 0.10), 3),
    gamma: round(jitter(ac.baseGamma, 0.12), 4),
    vega: round(jitter(ac.baseVega, 0.10), 3),
    theta: round(jitter(ac.baseTheta, 0.10), 4),
    rho: round(jitter(ac.baseRho, 0.10), 3),
    netExposure: round(jitter(ac.baseNet, 0.08), 3),
  }));

  // 3. Reverse Stress Tests
  const reverseStressTests: ReverseStressTestResult[] = REVERSE_STRESS_DEFS.map((def) => ({
    targetLossPct: def.targetLossPct,
    scenario: def.scenario,
    description: def.description,
    requiredShock: def.baseRequiredShock,
    probability: round(clamp(jitter(def.baseProbability, 0.12), 0.001, 0.25), 4),
    timeHorizon: def.timeHorizon,
  }));

  // 4. Historical Drawdown Comparison
  const historicalDrawdowns: HistoricalDrawdown[] = DRAWDOWN_DEFS.map((dd) => ({
    event: dd.event,
    startDate: dd.startDate,
    endDate: dd.endDate,
    peakToTroughPct: round(jitter(dd.basePeakToTrough, 0.05), 1),
    recoveryDays: Math.round(jitter(dd.baseRecoveryDays, 0.08)),
    maxDailyLossPct: round(jitter(dd.baseMaxDailyLoss, 0.10), 1),
    portfolioEstimatedImpactPct: round(jitter(dd.basePortfolioImpact, 0.08), 1),
  }));

  // 5. Correlation Breakdown Under Stress
  const stressCorrelations: StressCorrelationPair[] = STRESS_CORR_PAIRS.map((pair) => {
    const normalCorrelation = round(clamp(jitter(pair.baseNormal, 0.08), -1, 1), 3);
    const stressCorrelation = round(clamp(jitter(pair.baseStress, 0.06), -1, 1), 3);
    const correlationShift = round(stressCorrelation - normalCorrelation, 3);
    return {
      asset1: pair.asset1,
      asset2: pair.asset2,
      normalCorrelation,
      stressCorrelation,
      correlationShift,
    };
  });

  // 6. Tail Risk Metrics (CVaR / Expected Shortfall at different confidence levels)
  const tailRiskMetrics: TailRiskMetric[] = TAIL_CONFIDENCE_LEVELS.map((conf) => {
    // VaR scales roughly with inverse normal CDF; approximate scaling from 95% base
    const zMap: Record<number, number> = { 90: 1.28, 95: 1.645, 97.5: 1.96, 99: 2.326, 99.5: 2.576, 99.9: 3.09 };
    const z = zMap[conf] || 1.645;
    const baseVaR95 = 3.2; // base 95% 1-day VaR as % of portfolio
    const scaledVaR = baseVaR95 * (z / 1.645);

    const varPct = round(jitter(scaledVaR, 0.08), 2);
    // CVaR (Expected Shortfall) is typically 1.2-1.5x VaR depending on tail heaviness
    const cvarMultiplier = 1.25 + (conf - 90) * 0.02;
    const cvarPct = round(jitter(varPct * cvarMultiplier, 0.06), 2);
    // Expected shortfall at this level
    const esPct = round(jitter(cvarPct * 1.05, 0.05), 2);
    // Max observed loss at this confidence
    const maxLossPct = round(jitter(cvarPct * 1.35, 0.08), 2);

    return {
      confidenceLevel: conf,
      var: varPct,
      cvar: cvarPct,
      expectedShortfall: esPct,
      maxLoss: maxLossPct,
    };
  });

  return {
    scenarios,
    sensitivityAnalysis,
    reverseStressTests,
    historicalDrawdowns,
    stressCorrelations,
    tailRiskMetrics,
    portfolioNotional: PORTFOLIO_NOTIONAL,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5 min TTL) ──

let cacheData: RiskScenarioAnalysisResponse | null = null;
let cacheTime = 0;


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[RiskScenarioAnalysis] Error:', (err as Error).message);
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(502).json({ error: 'Failed to generate risk scenario analysis data' });
  }
});

export default router;
