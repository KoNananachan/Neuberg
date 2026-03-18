import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface RiskBudgetOverview {
  totalVaRLimit: number;
  currentVaR: number;
  remainingBudget: number;
  utilizationPct: number;
  confidenceLevel: '95%' | '99%';
  timeHorizon: string;
  portfolioNotional: number;
  varAsPercentOfNotional: number;
}

interface StrategyBudget {
  strategy: string;
  allocatedVaR: number;
  usedVaR: number;
  utilizationPct: number;
  pnlYTD: number;
  sharpe: number;
  informationRatio: number;
  trackingError: number;
}

interface RiskFactorDecomposition {
  factor: string;
  factorExposure: number;
  marginalVaRContribution: number;
  pctOfTotalVaR: number;
}

interface RiskLimitBreach {
  date: string;
  strategy: string;
  limitType: string;
  limitValue: number;
  actualValue: number;
  severity: 'WARNING' | 'BREACH' | 'CRITICAL';
  resolutionStatus: 'RESOLVED' | 'PENDING' | 'ESCALATED';
}

interface DailyVaRUtilization {
  date: string;
  utilizationPct: number;
}

interface StressScenarioImpact {
  scenario: string;
  strategyImpacts: { strategy: string; varImpact: number }[];
  totalPortfolioVaRImpact: number;
}

interface RiskBudgetingResponse {
  overview: RiskBudgetOverview;
  strategyBudgets: StrategyBudget[];
  riskFactorDecomposition: RiskFactorDecomposition[];
  riskLimitBreaches: RiskLimitBreach[];
  historicalVaRUtilization: DailyVaRUtilization[];
  stressTestImpact: StressScenarioImpact[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: RiskBudgetingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Strategy definitions ──

const STRATEGIES = [
  'Equity Long/Short',
  'Fixed Income',
  'Macro',
  'Credit',
  'Volatility',
  'Commodity',
  'Emerging Markets',
  'Systematic',
];

// ── Risk factor definitions ──

const RISK_FACTORS = [
  'Equity Beta',
  'Rates Duration',
  'Credit Spread',
  'FX USD/EUR',
  'FX USD/JPY',
  'FX USD/GBP',
  'Equity Volatility (VIX)',
  'Rates Volatility',
  'Curve Slope (2s10s)',
  'Curve Curvature',
  'Inflation Breakeven',
  'Commodity (Energy)',
  'Commodity (Metals)',
  'EM Sovereign Spread',
  'Liquidity Premium',
];

// ── Limit types for breaches ──

const LIMIT_TYPES = [
  'VaR Limit',
  'Notional Limit',
  'Concentration Limit',
  'Greeks Limit (Delta)',
  'Greeks Limit (Vega)',
  'Drawdown Limit',
  'Sector Exposure',
  'Single Name Limit',
];

// ── Data generation ──

function generateOverview(rng: () => number, totalUsedVaR: number): RiskBudgetOverview {
  const totalVaRLimit = 150; // $150M VaR limit
  const currentVaR = Math.round(totalUsedVaR * 100) / 100;
  const remainingBudget = Math.round((totalVaRLimit - currentVaR) * 100) / 100;
  const utilizationPct = Math.round((currentVaR / totalVaRLimit) * 10000) / 100;
  const confidenceLevel = rng() > 0.5 ? '99%' as const : '95%' as const;
  const portfolioNotional = Math.round((8500 + (rng() - 0.5) * 1000) * 100) / 100;
  const varAsPercentOfNotional = Math.round((currentVaR / portfolioNotional) * 10000) / 100;

  return {
    totalVaRLimit,
    currentVaR,
    remainingBudget,
    utilizationPct,
    confidenceLevel,
    timeHorizon: '1-day',
    portfolioNotional,
    varAsPercentOfNotional,
  };
}

function generateStrategyBudgets(rng: () => number): StrategyBudget[] {
  // Base allocated VaR for each strategy (sum ~150M)
  const baseAllocations = [30, 25, 20, 18, 15, 14, 16, 12];
  // Base utilization ranges (70-95%)
  const baseUtilizations = [0.85, 0.78, 0.92, 0.80, 0.88, 0.75, 0.82, 0.90];

  return STRATEGIES.map((strategy, i) => {
    const allocJitter = (rng() - 0.5) * baseAllocations[i] * 0.1;
    const allocatedVaR = Math.round((baseAllocations[i] + allocJitter) * 100) / 100;

    const utilJitter = (rng() - 0.5) * 0.15;
    const utilization = Math.min(0.99, Math.max(0.55, baseUtilizations[i] + utilJitter));
    const usedVaR = Math.round(allocatedVaR * utilization * 100) / 100;
    const utilizationPct = Math.round(utilization * 10000) / 100;

    // PnL YTD: range from -50M to +120M
    const pnlBase = [45, 28, -12, 18, 32, -8, 22, 38];
    const pnlJitter = (rng() - 0.5) * 30;
    const pnlYTD = Math.round((pnlBase[i] + pnlJitter) * 100) / 100;

    // Sharpe: 0.2 to 2.5
    const sharpeBase = [1.8, 1.2, 0.65, 1.4, 2.1, 0.45, 1.1, 1.9];
    const sharpeJitter = (rng() - 0.5) * 0.8;
    const sharpe = Math.round(Math.max(0.1, sharpeBase[i] + sharpeJitter) * 100) / 100;

    // Information ratio: -0.5 to 2.0
    const irBase = [1.2, 0.85, 0.3, 0.95, 1.5, 0.2, 0.7, 1.3];
    const irJitter = (rng() - 0.5) * 0.6;
    const informationRatio = Math.round((irBase[i] + irJitter) * 100) / 100;

    // Tracking error: 2% to 12%
    const teBase = [4.5, 3.2, 8.5, 5.8, 9.2, 6.5, 7.8, 3.8];
    const teJitter = (rng() - 0.5) * 2.0;
    const trackingError = Math.round(Math.max(1.0, teBase[i] + teJitter) * 100) / 100;

    return {
      strategy,
      allocatedVaR,
      usedVaR,
      utilizationPct,
      pnlYTD,
      sharpe,
      informationRatio,
      trackingError,
    };
  });
}

function generateRiskFactorDecomposition(rng: () => number, totalVaR: number): RiskFactorDecomposition[] {
  // Base contribution percentages (sum ~100%)
  const baseContributions = [22, 15, 12, 8, 6, 5, 7, 4, 5, 3, 4, 3, 2, 3, 1];

  const factors = RISK_FACTORS.map((factor, i) => {
    const contribJitter = (rng() - 0.5) * baseContributions[i] * 0.3;
    const rawContrib = Math.max(0.5, baseContributions[i] + contribJitter);

    // Factor exposure: varies by type
    const exposureBases = [1.15, 6.8, 285, 0.45, 0.32, 0.28, 18.5, 12.2, 0.85, 0.12, 0.42, 0.65, 0.38, 320, 0.15];
    const exposureJitter = (rng() - 0.5) * exposureBases[i] * 0.2;
    const factorExposure = Math.round((exposureBases[i] + exposureJitter) * 1000) / 1000;

    return {
      factor,
      factorExposure,
      rawContrib,
      marginalVaRContribution: 0, // will be computed after normalization
      pctOfTotalVaR: 0,
    };
  });

  // Normalize contributions to sum to 100%
  const totalRawContrib = factors.reduce((sum, f) => sum + f.rawContrib, 0);
  factors.forEach((f) => {
    f.pctOfTotalVaR = Math.round((f.rawContrib / totalRawContrib) * 10000) / 100;
    f.marginalVaRContribution = Math.round((f.rawContrib / totalRawContrib) * totalVaR * 100) / 100;
  });

  // Sort by contribution descending
  factors.sort((a, b) => b.pctOfTotalVaR - a.pctOfTotalVaR);

  return factors.map(({ factor, factorExposure, marginalVaRContribution, pctOfTotalVaR }) => ({
    factor,
    factorExposure,
    marginalVaRContribution,
    pctOfTotalVaR,
  }));
}

function generateRiskLimitBreaches(rng: () => number): RiskLimitBreach[] {
  const breaches: RiskLimitBreach[] = [];
  const today = new Date();

  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(rng() * 60) + 1;
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const date = d.toISOString().slice(0, 10);

    const strategyIdx = Math.floor(rng() * STRATEGIES.length);
    const strategy = STRATEGIES[strategyIdx];

    const limitTypeIdx = Math.floor(rng() * LIMIT_TYPES.length);
    const limitType = LIMIT_TYPES[limitTypeIdx];

    // Generate limit value and actual value (actual exceeds limit)
    const baseLimitValue = 10 + rng() * 40;
    const limitValue = Math.round(baseLimitValue * 100) / 100;
    const excessPct = 1.02 + rng() * 0.25; // 2% to 27% over limit
    const actualValue = Math.round(limitValue * excessPct * 100) / 100;

    const severityRoll = rng();
    let severity: 'WARNING' | 'BREACH' | 'CRITICAL';
    if (severityRoll < 0.4) {
      severity = 'WARNING';
    } else if (severityRoll < 0.8) {
      severity = 'BREACH';
    } else {
      severity = 'CRITICAL';
    }

    const statusRoll = rng();
    let resolutionStatus: 'RESOLVED' | 'PENDING' | 'ESCALATED';
    if (statusRoll < 0.5) {
      resolutionStatus = 'RESOLVED';
    } else if (statusRoll < 0.8) {
      resolutionStatus = 'PENDING';
    } else {
      resolutionStatus = 'ESCALATED';
    }

    breaches.push({
      date,
      strategy,
      limitType,
      limitValue,
      actualValue,
      severity,
      resolutionStatus,
    });
  }

  // Sort by date descending (most recent first)
  breaches.sort((a, b) => b.date.localeCompare(a.date));

  return breaches;
}

function generateHistoricalVaRUtilization(rng: () => number): DailyVaRUtilization[] {
  const entries: DailyVaRUtilization[] = [];
  const today = new Date();

  // Start with a base utilization and random-walk it
  let currentUtil = 72 + (rng() - 0.5) * 10;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);

    // Random walk with mean-reversion toward 78%
    const meanReversion = (78 - currentUtil) * 0.08;
    const shock = (rng() - 0.5) * 8;
    currentUtil = Math.min(98, Math.max(50, currentUtil + meanReversion + shock));
    const utilizationPct = Math.round(currentUtil * 100) / 100;

    entries.push({ date, utilizationPct });
  }

  return entries;
}

function generateStressTestImpact(rng: () => number): StressScenarioImpact[] {
  const SCENARIOS = [
    'Rates +200bps Shock',
    'Equity -20% Crash',
    'Credit Spread Widening +300bps',
    'EM Currency Crisis (USD +15%)',
    'Volatility Spike (VIX to 45)',
  ];

  return SCENARIOS.map((scenario) => {
    const strategyImpacts = STRATEGIES.map((strategy) => {
      // Each strategy responds differently to each stress scenario
      const baseImpact = (rng() - 0.3) * 25; // slightly biased negative (stress = bad)
      const varImpact = Math.round(baseImpact * 100) / 100;
      return { strategy, varImpact };
    });

    // Total portfolio VaR impact: sum of strategy impacts with diversification benefit
    const rawTotal = strategyImpacts.reduce((sum, s) => sum + s.varImpact, 0);
    const diversificationBenefit = 0.65 + rng() * 0.15; // 65-80% of sum
    const totalPortfolioVaRImpact = Math.round(rawTotal * diversificationBenefit * 100) / 100;

    return {
      scenario,
      strategyImpacts,
      totalPortfolioVaRImpact,
    };
  });
}

// ── Main generator ──

function generateRiskBudgetingData(): RiskBudgetingResponse {
  const rng = seededRandom('risk-budgeting');

  const strategyBudgets = generateStrategyBudgets(rng);
  const totalUsedVaR = strategyBudgets.reduce((sum, s) => sum + s.usedVaR, 0);

  const overview = generateOverview(rng, totalUsedVaR);
  const riskFactorDecomposition = generateRiskFactorDecomposition(rng, totalUsedVaR);
  const riskLimitBreaches = generateRiskLimitBreaches(rng);
  const historicalVaRUtilization = generateHistoricalVaRUtilization(rng);
  const stressTestImpact = generateStressTestImpact(rng);

  return {
    overview,
    strategyBudgets,
    riskFactorDecomposition,
    riskLimitBreaches,
    historicalVaRUtilization,
    stressTestImpact,
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

    const data = generateRiskBudgetingData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RiskBudgeting] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate risk budgeting data' });
  }
});

export default router;
