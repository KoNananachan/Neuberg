import { Router } from 'express';

const router = Router();

// ── Types ──

interface CAPMResult {
  alpha: number;
  beta: number;
  rSquared: number;
  stdError: number;
  tStatAlpha: number;
  tStatBeta: number;
  pValueAlpha: number;
  pValueBeta: number;
}

interface FamaFrench3Result {
  alpha: number;
  mktRf: number;
  smb: number;
  hml: number;
  rSquared: number;
  adjRSquared: number;
}

interface Carhart4Result {
  alpha: number;
  mktRf: number;
  smb: number;
  hml: number;
  umd: number;
  rSquared: number;
}

interface RollingBetaPoint {
  date: string;
  beta60d: number;
  beta120d: number;
  beta252d: number;
}

interface ResidualStats {
  mean: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  jarqueBera: number;
  durbinWatson: number;
}

interface BenchmarkMetrics {
  correlation: number;
  trackingError: number;
  informationRatio: number;
  treynorRatio: number;
  sortinoRatio: number;
}

interface RegressionAsset {
  ticker: string;
  name: string;
  capm: CAPMResult;
  famaFrench3: FamaFrench3Result;
  carhart4: Carhart4Result;
  rollingBeta: RollingBetaPoint[];
  residualStats: ResidualStats;
  benchmarkMetrics: BenchmarkMetrics;
}

interface RegressionAnalysisResponse {
  assets: RegressionAsset[];
  generatedAt: string;
}

// ── Seeded PRNG (mulberry32-style LCG) ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

// ── Asset Definitions ──

interface AssetDef {
  ticker: string;
  name: string;
  betaRange: [number, number];
  alphaRange: [number, number];
  rSquaredRange: [number, number];
  volatility: number;
}

const ASSET_DEFS: AssetDef[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', betaRange: [1.05, 1.30], alphaRange: [0.01, 0.06], rSquaredRange: [0.72, 0.85], volatility: 0.24 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', betaRange: [0.85, 1.10], alphaRange: [0.02, 0.07], rSquaredRange: [0.78, 0.90], volatility: 0.22 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', betaRange: [0.95, 1.20], alphaRange: [-0.01, 0.04], rSquaredRange: [0.75, 0.88], volatility: 0.26 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', betaRange: [1.00, 1.25], alphaRange: [0.00, 0.05], rSquaredRange: [0.70, 0.84], volatility: 0.28 },
  { ticker: 'TSLA', name: 'Tesla Inc.', betaRange: [1.60, 2.20], alphaRange: [-0.05, 0.10], rSquaredRange: [0.35, 0.55], volatility: 0.55 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', betaRange: [1.40, 1.85], alphaRange: [0.03, 0.12], rSquaredRange: [0.50, 0.70], volatility: 0.48 },
  { ticker: 'META', name: 'Meta Platforms Inc.', betaRange: [1.10, 1.40], alphaRange: [0.01, 0.08], rSquaredRange: [0.60, 0.78], volatility: 0.35 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', betaRange: [1.00, 1.25], alphaRange: [-0.02, 0.03], rSquaredRange: [0.65, 0.80], volatility: 0.22 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', betaRange: [0.70, 1.05], alphaRange: [-0.01, 0.04], rSquaredRange: [0.40, 0.60], volatility: 0.25 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', betaRange: [0.45, 0.70], alphaRange: [-0.02, 0.02], rSquaredRange: [0.35, 0.55], volatility: 0.14 },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', betaRange: [0.98, 1.02], alphaRange: [-0.005, 0.005], rSquaredRange: [0.97, 0.99], volatility: 0.15 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', betaRange: [1.05, 1.18], alphaRange: [0.00, 0.03], rSquaredRange: [0.92, 0.97], volatility: 0.19 },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', betaRange: [1.10, 1.30], alphaRange: [-0.03, 0.01], rSquaredRange: [0.85, 0.93], volatility: 0.22 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury ETF', betaRange: [-0.30, 0.10], alphaRange: [-0.02, 0.02], rSquaredRange: [0.02, 0.15], volatility: 0.18 },
  { ticker: 'GLD', name: 'SPDR Gold Shares', betaRange: [-0.10, 0.20], alphaRange: [0.00, 0.04], rSquaredRange: [0.01, 0.10], volatility: 0.15 },
];

// ── Data Generation ──

function generateSeed(): number {
  // Seed based on the current 5-minute window for deterministic results within cache window
  const fiveMinWindow = Math.floor(Date.now() / (5 * 60 * 1000));
  return fiveMinWindow;
}

function generateAssetData(def: AssetDef, rng: () => number): RegressionAsset {
  // CAPM
  const beta = round(lerp(def.betaRange[0], def.betaRange[1], rng()), 4);
  const alpha = round(lerp(def.alphaRange[0], def.alphaRange[1], rng()), 4);
  const rSquared = round(lerp(def.rSquaredRange[0], def.rSquaredRange[1], rng()), 4);
  const stdError = round(lerp(0.01, 0.08, rng()), 4);
  const tStatAlpha = round(alpha / Math.max(stdError * 0.3, 0.001), 2);
  const tStatBeta = round(beta / Math.max(stdError * 0.15, 0.001), 2);
  const pValueAlpha = round(Math.min(1, Math.max(0.001, 2 * (1 - normalCDF(Math.abs(tStatAlpha))))), 4);
  const pValueBeta = round(Math.min(1, Math.max(0.0001, 2 * (1 - normalCDF(Math.abs(tStatBeta))))), 6);

  const capm: CAPMResult = {
    alpha,
    beta,
    rSquared,
    stdError,
    tStatAlpha,
    tStatBeta,
    pValueAlpha,
    pValueBeta,
  };

  // Fama-French 3-Factor
  const mktRf = round(beta + lerp(-0.05, 0.05, rng()), 4);
  const smb = round(lerp(-0.30, 0.40, rng()), 4);
  const hml = round(lerp(-0.35, 0.30, rng()), 4);
  const ff3Alpha = round(alpha + lerp(-0.02, 0.02, rng()), 4);
  const ff3RSquared = round(Math.min(0.99, rSquared + lerp(0.01, 0.06, rng())), 4);
  const n = 252; // approx trading days in a year
  const k3 = 3;
  const ff3AdjRSquared = round(1 - ((1 - ff3RSquared) * (n - 1)) / (n - k3 - 1), 4);

  const famaFrench3: FamaFrench3Result = {
    alpha: ff3Alpha,
    mktRf,
    smb,
    hml,
    rSquared: ff3RSquared,
    adjRSquared: ff3AdjRSquared,
  };

  // Carhart 4-Factor (Momentum)
  const umd = round(lerp(-0.25, 0.35, rng()), 4);
  const c4Alpha = round(ff3Alpha + lerp(-0.01, 0.01, rng()), 4);
  const c4RSquared = round(Math.min(0.99, ff3RSquared + lerp(0.005, 0.03, rng())), 4);

  const carhart4: Carhart4Result = {
    alpha: c4Alpha,
    mktRf: round(mktRf + lerp(-0.02, 0.02, rng()), 4),
    smb: round(smb + lerp(-0.02, 0.02, rng()), 4),
    hml: round(hml + lerp(-0.02, 0.02, rng()), 4),
    umd,
    rSquared: c4RSquared,
  };

  // Rolling Beta (12 months)
  const rollingBeta: RollingBetaPoint[] = [];
  const now = new Date();
  let prevBeta60 = beta;
  let prevBeta120 = beta;
  let prevBeta252 = beta;

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Mean-reverting random walk around the CAPM beta
    prevBeta60 = round(prevBeta60 + lerp(-0.15, 0.15, rng()) + (beta - prevBeta60) * 0.2, 3);
    prevBeta120 = round(prevBeta120 + lerp(-0.08, 0.08, rng()) + (beta - prevBeta120) * 0.15, 3);
    prevBeta252 = round(prevBeta252 + lerp(-0.04, 0.04, rng()) + (beta - prevBeta252) * 0.1, 3);

    rollingBeta.push({
      date: dateStr,
      beta60d: prevBeta60,
      beta120d: prevBeta120,
      beta252d: prevBeta252,
    });
  }

  // Residual Statistics
  const residMean = round(lerp(-0.0005, 0.0005, rng()), 6);
  const residStdDev = round(lerp(0.008, 0.035, rng()) * (def.volatility / 0.25), 4);
  const skewness = round(lerp(-0.8, 0.4, rng()), 4);
  const kurtosis = round(lerp(2.5, 6.0, rng()), 4);
  // Jarque-Bera: JB = (n/6) * [S^2 + (K-3)^2 / 4]
  const jbN = 252;
  const jarqueBera = round((jbN / 6) * (skewness ** 2 + (kurtosis - 3) ** 2 / 4), 2);
  const durbinWatson = round(lerp(1.7, 2.3, rng()), 4);

  const residualStats: ResidualStats = {
    mean: residMean,
    stdDev: residStdDev,
    skewness,
    kurtosis,
    jarqueBera,
    durbinWatson,
  };

  // Benchmark Metrics
  const correlation = round(Math.sqrt(Math.max(0, rSquared)) * (beta >= 0 ? 1 : -1), 4);
  const trackingError = round(lerp(0.02, 0.25, rng()) * (def.volatility / 0.20), 4);
  const informationRatio = round(alpha / Math.max(trackingError, 0.001), 4);
  const riskFreeRate = 0.045;
  const annualReturn = alpha + beta * 0.10; // assume 10% market return
  const treynorRatio = round(Math.abs(beta) > 0.01 ? (annualReturn - riskFreeRate) / Math.abs(beta) : 0, 4);
  const downsideDeviation = round(residStdDev * Math.sqrt(252) * lerp(0.6, 0.9, rng()), 4);
  const sortinoRatio = round(downsideDeviation > 0 ? (annualReturn - riskFreeRate) / downsideDeviation : 0, 4);

  const benchmarkMetrics: BenchmarkMetrics = {
    correlation,
    trackingError,
    informationRatio,
    treynorRatio,
    sortinoRatio,
  };

  return {
    ticker: def.ticker,
    name: def.name,
    capm,
    famaFrench3,
    carhart4,
    rollingBeta,
    residualStats,
    benchmarkMetrics,
  };
}

// Approximate normal CDF using Abramowitz & Stegun
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

// ── Cache ──

let cache: { data: RegressionAnalysisResponse | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 12 * 60 * 60 * 1000; // 5 minutes

// ── Route ──

// GET /api/regression-analysis
router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const seed = generateSeed();
    const rng = seededRandom(seed);

    const assets: RegressionAsset[] = ASSET_DEFS.map((def) => generateAssetData(def, rng));

    const data: RegressionAnalysisResponse = {
      assets,
      generatedAt: new Date().toISOString(),
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RegressionAnalysis] Error:', message);
    // Stale fallback on error
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate regression analysis data' });
  }
});

export default router;
