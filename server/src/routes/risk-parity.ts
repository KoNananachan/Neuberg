import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface AssetAllocation {
  assetClass: string;
  notionalWeightPct: number;
  riskContributionPct: number;
  volatilityPct: number;
  correlationToPortfolio: number;
  leverageRatio: number;
}

interface PortfolioMetrics {
  targetVolatilityPct: number;
  realizedVolatilityPct: number;
  portfolioSharpe: number;
  totalLeverage: number;
  maxDrawdownPct: number;
  calmarRatio: number;
}

interface RiskDecomposition {
  factor: string;
  contributionPct: number;
  marginalContribution: number;
}

interface HistoricalComparison {
  period: string;
  portfolioReturnPct: number;
  sixtyFortyReturnPct: number;
  sp500ReturnPct: number;
  riskParityAlpha: number;
}

interface RiskParityResponse {
  assetAllocation: AssetAllocation[];
  portfolioMetrics: PortfolioMetrics;
  riskDecomposition: RiskDecomposition[];
  historicalComparison: HistoricalComparison[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Asset class definitions ──

const ASSET_CLASSES = [
  'US Equities',
  'Intl Equities',
  'EM Equities',
  'US Treasuries',
  'TIPS',
  'IG Credit',
  'HY Credit',
  'Commodities',
  'Gold',
  'Real Estate',
];

// ── Risk factor definitions ──

const RISK_FACTORS = [
  'Equity Risk',
  'Rate Risk',
  'Credit Risk',
  'Commodity Risk',
  'FX Risk',
  'Residual',
];

// ── Historical comparison periods ──

const PERIODS = ['1M', '3M', '6M', '1Y', '3Y'];

// ── Data generation ──

function generateAssetAllocation(rng: () => number): AssetAllocation[] {
  // Base notional weights (sum to ~100% before leverage)
  const baseWeights = [18, 12, 6, 22, 8, 10, 5, 8, 6, 5];
  // Base volatilities for each asset class
  const baseVols = [16.2, 17.5, 22.8, 6.1, 5.8, 6.5, 10.2, 18.5, 16.8, 18.0];
  // Base correlations to the overall portfolio
  const baseCorrelations = [0.82, 0.78, 0.65, -0.15, 0.08, 0.25, 0.52, 0.35, 0.12, 0.58];

  const assets = ASSET_CLASSES.map((assetClass, i) => {
    // Jitter the notional weight
    const weightJitter = (rng() - 0.5) * baseWeights[i] * 0.15;
    const notionalWeightPct = Math.round(Math.max(1, baseWeights[i] + weightJitter) * 100) / 100;

    // Jitter volatility
    const volJitter = (rng() - 0.5) * baseVols[i] * 0.12;
    const volatilityPct = Math.round(Math.max(1, baseVols[i] + volJitter) * 100) / 100;

    // Jitter correlation
    const corrJitter = (rng() - 0.5) * 0.12;
    const correlationToPortfolio = Math.round(Math.max(-1, Math.min(1, baseCorrelations[i] + corrJitter)) * 100) / 100;

    // Leverage ratio: risk parity typically levers low-vol assets
    const baseLeverage = volatilityPct < 8 ? 2.2 + rng() * 0.8 : volatilityPct < 14 ? 1.2 + rng() * 0.4 : 0.6 + rng() * 0.3;
    const leverageRatio = Math.round(baseLeverage * 100) / 100;

    return {
      assetClass,
      notionalWeightPct,
      volatilityPct,
      correlationToPortfolio,
      leverageRatio,
      riskContributionPct: 0, // computed after
    };
  });

  // Compute risk contributions: proportional to weight * vol * correlation
  const rawContributions = assets.map((a) =>
    Math.abs(a.notionalWeightPct * a.volatilityPct * Math.max(0.05, a.correlationToPortfolio + 0.5))
  );
  const totalContribution = rawContributions.reduce((sum, c) => sum + c, 0);

  assets.forEach((a, i) => {
    a.riskContributionPct = Math.round((rawContributions[i] / totalContribution) * 10000) / 100;
  });

  // Normalize notional weights to sum to 100%
  const totalWeight = assets.reduce((sum, a) => sum + a.notionalWeightPct, 0);
  assets.forEach((a) => {
    a.notionalWeightPct = Math.round((a.notionalWeightPct / totalWeight) * 10000) / 100;
  });

  return assets;
}

function generatePortfolioMetrics(rng: () => number, assets: AssetAllocation[]): PortfolioMetrics {
  const targetVolatilityPct = 10;

  // Realized vol jitters around target
  const realizedJitter = (rng() - 0.5) * 2.5;
  const realizedVolatilityPct = Math.round((targetVolatilityPct + realizedJitter) * 100) / 100;

  // Sharpe: typically 0.4 to 1.2 for risk parity
  const baseSharpe = 0.72 + (rng() - 0.5) * 0.5;
  const portfolioSharpe = Math.round(Math.max(0.15, baseSharpe) * 100) / 100;

  // Total leverage: sum of individual leveraged notional weights
  const totalLeverage = Math.round(
    assets.reduce((sum, a) => sum + (a.notionalWeightPct / 100) * a.leverageRatio, 0) * 100
  ) / 100;

  // Max drawdown: -8% to -25%
  const baseDrawdown = -(12 + rng() * 10);
  const maxDrawdownPct = Math.round(baseDrawdown * 100) / 100;

  // Calmar ratio: annualized return / max drawdown magnitude
  const annualizedReturn = portfolioSharpe * realizedVolatilityPct;
  const calmarRatio = Math.round((annualizedReturn / Math.abs(maxDrawdownPct)) * 100) / 100;

  return {
    targetVolatilityPct,
    realizedVolatilityPct,
    portfolioSharpe,
    totalLeverage,
    maxDrawdownPct,
    calmarRatio,
  };
}

function generateRiskDecomposition(rng: () => number): RiskDecomposition[] {
  // Base contribution percentages for each risk factor (sum ~100%)
  const baseContributions = [35, 25, 15, 12, 8, 5];

  const factors = RISK_FACTORS.map((factor, i) => {
    const contribJitter = (rng() - 0.5) * baseContributions[i] * 0.25;
    const rawContrib = Math.max(1, baseContributions[i] + contribJitter);
    return { factor, rawContrib, contributionPct: 0, marginalContribution: 0 };
  });

  // Normalize to sum to 100%
  const totalRaw = factors.reduce((sum, f) => sum + f.rawContrib, 0);
  factors.forEach((f) => {
    f.contributionPct = Math.round((f.rawContrib / totalRaw) * 10000) / 100;
    // Marginal contribution: basis points per 1% increase in factor exposure
    f.marginalContribution = Math.round((f.rawContrib / totalRaw) * (2.5 + rng() * 1.5) * 100) / 100;
  });

  // Sort by contribution descending
  factors.sort((a, b) => b.contributionPct - a.contributionPct);

  return factors.map(({ factor, contributionPct, marginalContribution }) => ({
    factor,
    contributionPct,
    marginalContribution,
  }));
}

function generateHistoricalComparison(rng: () => number): HistoricalComparison[] {
  // Base returns scale with period length
  const periodMultipliers: Record<string, number> = {
    '1M': 1,
    '3M': 2.5,
    '6M': 4,
    '1Y': 7,
    '3Y': 18,
  };

  return PERIODS.map((period) => {
    const mult = periodMultipliers[period];

    // Risk parity portfolio return
    const rpBase = 0.8 * mult + (rng() - 0.5) * 2 * mult;
    const portfolioReturnPct = Math.round(rpBase * 100) / 100;

    // 60/40 portfolio return (typically slightly lower risk-adjusted)
    const sixtyFortyBase = 0.7 * mult + (rng() - 0.5) * 2.2 * mult;
    const sixtyFortyReturnPct = Math.round(sixtyFortyBase * 100) / 100;

    // S&P 500 return (higher vol, higher expected)
    const sp500Base = 1.0 * mult + (rng() - 0.5) * 3 * mult;
    const sp500ReturnPct = Math.round(sp500Base * 100) / 100;

    // Alpha = risk parity return minus 60/40 return
    const riskParityAlpha = Math.round((portfolioReturnPct - sixtyFortyReturnPct) * 100) / 100;

    return {
      period,
      portfolioReturnPct,
      sixtyFortyReturnPct,
      sp500ReturnPct,
      riskParityAlpha,
    };
  });
}

// ── Main generator ──

function generateRiskParityData(): RiskParityResponse {
  const rng = seededRandom('risk-parity');

  const assetAllocation = generateAssetAllocation(rng);
  const portfolioMetrics = generatePortfolioMetrics(rng, assetAllocation);
  const riskDecomposition = generateRiskDecomposition(rng);
  const historicalComparison = generateHistoricalComparison(rng);

  return {
    assetAllocation,
    portfolioMetrics,
    riskDecomposition,
    historicalComparison,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }

    const data = generateRiskParityData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RiskParity] Error:', message);
    if (cache) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate risk parity data' });
  }
});

export default router;
