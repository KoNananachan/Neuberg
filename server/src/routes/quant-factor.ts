import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface FactorReturn {
  factor: string;
  return1DPct: number;
  return1WPct: number;
  return1MPct: number;
  return3MPct: number;
  returnYTDPct: number;
  return1YPct: number;
  sharpe1Y: number;
  maxDrawdown1YPct: number;
  volatilityPct: number;
}

interface FactorExposure {
  factor: string;
  longSideAvgReturnPct: number;
  shortSideAvgReturnPct: number;
  spreadPct: number;
  crowding: number;
  valuationSpread: number;
}

interface SectorFactorLoading {
  sector: string;
  valueTilt: number;
  momentumTilt: number;
  qualityTilt: number;
  sizeTilt: number;
  volatilityTilt: number;
}

interface FactorTimingEntry {
  factor: string;
  signal: 'overweight' | 'neutral' | 'underweight';
  strength: number;
  regime: 'risk-on' | 'risk-off' | 'transition';
  zscore: number;
}

interface TopStock {
  ticker: string;
  name: string;
  factorScore: number;
  return1MPct: number;
}

interface TopFactorStocks {
  factor: string;
  stocks: TopStock[];
}

interface RiskDecomp {
  marketBetaPct: number;
  factorContributionPct: number;
  stockSpecificPct: number;
  totalRiskPct: number;
}

interface Summary {
  bestFactor1M: string;
  worstFactor1M: string;
  factorMomentum: 'improving' | 'stable' | 'deteriorating';
  crowdingAlert: 'value' | 'momentum' | 'none';
  regimeIndicator: 'risk-on' | 'risk-off' | 'transition';
}

interface QuantFactorData {
  factorReturns: FactorReturn[];
  factorExposure: FactorExposure[];
  factorCorrelations: number[][];
  sectorFactorLoading: SectorFactorLoading[];
  factorTiming: FactorTimingEntry[];
  topFactorStocks: TopFactorStocks[];
  riskDecomp: RiskDecomp;
  summary: Summary;
  generatedAt: string;
}

// ── Constants ──

const FACTOR_NAMES = [
  'Value (HML)',
  'Momentum (UMD)',
  'Size (SMB)',
  'Quality (QMJ)',
  'Low Volatility',
  'Growth',
  'Profitability',
  'Investment',
  'Dividend Yield',
  'Carry',
];

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Industrials',
  'Energy',
  'Materials',
  'Utilities',
  'Real Estate',
  'Communication Services',
];

const VALUE_STOCKS: TopStock[] = [
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', factorScore: 0, return1MPct: 0 },
  { ticker: 'JPM', name: 'JPMorgan Chase', factorScore: 0, return1MPct: 0 },
  { ticker: 'BAC', name: 'Bank of America', factorScore: 0, return1MPct: 0 },
  { ticker: 'CVX', name: 'Chevron', factorScore: 0, return1MPct: 0 },
  { ticker: 'PFE', name: 'Pfizer', factorScore: 0, return1MPct: 0 },
];

const MOMENTUM_STOCKS: TopStock[] = [
  { ticker: 'NVDA', name: 'NVIDIA', factorScore: 0, return1MPct: 0 },
  { ticker: 'META', name: 'Meta Platforms', factorScore: 0, return1MPct: 0 },
  { ticker: 'AVGO', name: 'Broadcom', factorScore: 0, return1MPct: 0 },
  { ticker: 'LLY', name: 'Eli Lilly', factorScore: 0, return1MPct: 0 },
  { ticker: 'NFLX', name: 'Netflix', factorScore: 0, return1MPct: 0 },
];

const QUALITY_STOCKS: TopStock[] = [
  { ticker: 'MSFT', name: 'Microsoft', factorScore: 0, return1MPct: 0 },
  { ticker: 'AAPL', name: 'Apple', factorScore: 0, return1MPct: 0 },
  { ticker: 'V', name: 'Visa', factorScore: 0, return1MPct: 0 },
  { ticker: 'MA', name: 'Mastercard', factorScore: 0, return1MPct: 0 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', factorScore: 0, return1MPct: 0 },
];

// Typical base Sharpe ranges per factor (annualized)
const FACTOR_SHARPE_BASE: Record<string, [number, number]> = {
  'Value (HML)': [0.25, 0.55],
  'Momentum (UMD)': [0.35, 0.70],
  'Size (SMB)': [0.10, 0.35],
  'Quality (QMJ)': [0.40, 0.65],
  'Low Volatility': [0.30, 0.55],
  'Growth': [0.15, 0.45],
  'Profitability': [0.35, 0.60],
  'Investment': [0.20, 0.45],
  'Dividend Yield': [0.25, 0.50],
  'Carry': [0.30, 0.60],
};

// Typical volatility ranges per factor (annualized %)
const FACTOR_VOL_BASE: Record<string, [number, number]> = {
  'Value (HML)': [8, 14],
  'Momentum (UMD)': [10, 18],
  'Size (SMB)': [7, 13],
  'Quality (QMJ)': [6, 11],
  'Low Volatility': [5, 9],
  'Growth': [12, 20],
  'Profitability': [6, 12],
  'Investment': [5, 10],
  'Dividend Yield': [7, 12],
  'Carry': [8, 15],
};

// Correlation priors: [factorI index, factorJ index, base correlation]
// Value-Momentum typically negative; Quality-LowVol positive; etc.
const CORRELATION_PRIORS: [number, number, number][] = [
  [0, 1, -0.20],  // Value - Momentum: negative
  [0, 3, 0.15],   // Value - Quality: slight positive
  [0, 5, -0.35],  // Value - Growth: negative
  [0, 8, 0.45],   // Value - Dividend Yield: positive
  [1, 4, -0.10],  // Momentum - Low Vol: slight negative
  [1, 5, 0.30],   // Momentum - Growth: positive
  [2, 4, -0.20],  // Size - Low Vol: negative
  [3, 4, 0.40],   // Quality - Low Vol: positive
  [3, 6, 0.55],   // Quality - Profitability: strong positive
  [4, 8, 0.35],   // Low Vol - Dividend Yield: positive
  [5, 7, -0.15],  // Growth - Investment: slight negative
  [6, 7, 0.30],   // Profitability - Investment: positive
  [8, 9, 0.25],   // Dividend Yield - Carry: positive
];
let cache: { data: QuantFactorData; ts: number } | null = null;

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── Generator ──

function generate(): QuantFactorData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-quant-factor'));

  // Helper to produce a random number in [lo, hi]
  const range = (lo: number, hi: number) => lo + rng() * (hi - lo);

  // ── 1. Factor Returns ──
  const factorReturns: FactorReturn[] = FACTOR_NAMES.map(factor => {
    const [sharpeMin, sharpeMax] = FACTOR_SHARPE_BASE[factor];
    const [volMin, volMax] = FACTOR_VOL_BASE[factor];

    const return1DPct = round2(range(-1.2, 1.0));
    const return1WPct = round2(range(-2.5, 2.8));
    const return1MPct = round2(range(-3.0, 4.0));
    const return3MPct = round2(range(-5.0, 8.0));
    const returnYTDPct = round2(range(-8.0, 15.0));
    const return1YPct = round2(range(-10.0, 25.0));
    const sharpe1Y = round2(range(sharpeMin, sharpeMax) * (rng() > 0.3 ? 1 : -1));
    const volatilityPct = round2(range(volMin, volMax));
    const maxDrawdown1YPct = round2(-range(3, 20));

    return {
      factor,
      return1DPct,
      return1WPct,
      return1MPct,
      return3MPct,
      returnYTDPct,
      return1YPct,
      sharpe1Y,
      maxDrawdown1YPct,
      volatilityPct,
    };
  });

  // ── 2. Factor Exposure ──
  const factorExposure: FactorExposure[] = FACTOR_NAMES.map(factor => {
    const longSideAvgReturnPct = round2(range(0.5, 4.0));
    const shortSideAvgReturnPct = round2(range(-2.0, 1.5));
    const spreadPct = round2(longSideAvgReturnPct - shortSideAvgReturnPct);
    const crowding = round2(range(-2.0, 2.5));
    const valuationSpread = round2(range(0.5, 3.5));

    return { factor, longSideAvgReturnPct, shortSideAvgReturnPct, spreadPct, crowding, valuationSpread };
  });

  // ── 3. Factor Correlations (10x10) ──
  // Start with identity, apply priors with jitter, fill remaining with small random
  const n = FACTOR_NAMES.length;
  const corrMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1.0 : 0))
  );

  // Set from priors
  const priorSet = new Set<string>();
  for (const [i, j, base] of CORRELATION_PRIORS) {
    const jitter = range(-0.10, 0.10);
    const val = round2(clamp(base + jitter, -0.95, 0.95));
    corrMatrix[i][j] = val;
    corrMatrix[j][i] = val;
    priorSet.add(`${i}-${j}`);
    priorSet.add(`${j}-${i}`);
  }

  // Fill remaining with small random correlations
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!priorSet.has(`${i}-${j}`)) {
        const val = round2(range(-0.25, 0.25));
        corrMatrix[i][j] = val;
        corrMatrix[j][i] = val;
      }
    }
  }

  // ── 4. Sector Factor Loading ──
  const sectorFactorLoading: SectorFactorLoading[] = SECTORS.map(sector => ({
    sector,
    valueTilt: round2(range(-1, 1)),
    momentumTilt: round2(range(-1, 1)),
    qualityTilt: round2(range(-1, 1)),
    sizeTilt: round2(range(-1, 1)),
    volatilityTilt: round2(range(-1, 1)),
  }));

  // Apply realistic biases
  const sectorBias: Record<string, Partial<SectorFactorLoading>> = {
    'Technology': { momentumTilt: 0.3, qualityTilt: 0.2, volatilityTilt: -0.3 },
    'Utilities': { valueTilt: 0.4, volatilityTilt: 0.6, momentumTilt: -0.3 },
    'Financials': { valueTilt: 0.5, sizeTilt: -0.2 },
    'Consumer Staples': { qualityTilt: 0.4, volatilityTilt: 0.5, momentumTilt: -0.2 },
    'Energy': { valueTilt: 0.3, momentumTilt: 0.1, qualityTilt: -0.2 },
    'Healthcare': { qualityTilt: 0.3, sizeTilt: 0.1 },
    'Real Estate': { valueTilt: 0.3, volatilityTilt: 0.2 },
  };

  for (const sl of sectorFactorLoading) {
    const bias = sectorBias[sl.sector];
    if (bias) {
      if (bias.valueTilt !== undefined) sl.valueTilt = round2(clamp(sl.valueTilt + bias.valueTilt, -1, 1));
      if (bias.momentumTilt !== undefined) sl.momentumTilt = round2(clamp(sl.momentumTilt + bias.momentumTilt, -1, 1));
      if (bias.qualityTilt !== undefined) sl.qualityTilt = round2(clamp(sl.qualityTilt + bias.qualityTilt, -1, 1));
      if (bias.sizeTilt !== undefined) sl.sizeTilt = round2(clamp(sl.sizeTilt + bias.sizeTilt, -1, 1));
      if (bias.volatilityTilt !== undefined) sl.volatilityTilt = round2(clamp(sl.volatilityTilt + bias.volatilityTilt, -1, 1));
    }
  }

  // ── 5. Factor Timing ──
  const factorTiming: FactorTimingEntry[] = FACTOR_NAMES.map(factor => {
    const zscore = round2(range(-2.5, 2.5));
    const strength = Math.round(range(5, 95));

    let signal: FactorTimingEntry['signal'];
    if (zscore > 0.8) signal = 'overweight';
    else if (zscore < -0.8) signal = 'underweight';
    else signal = 'neutral';

    let regime: FactorTimingEntry['regime'];
    const regimeRoll = rng();
    if (regimeRoll < 0.4) regime = 'risk-on';
    else if (regimeRoll < 0.75) regime = 'risk-off';
    else regime = 'transition';

    return { factor, signal, strength, regime, zscore };
  });

  // ── 6. Top Factor Stocks ──
  function fillStocks(templates: TopStock[]): TopStock[] {
    return templates.map(s => ({
      ...s,
      factorScore: round2(range(70, 99)),
      return1MPct: round2(range(-5, 12)),
    }));
  }

  const topFactorStocks: TopFactorStocks[] = [
    { factor: 'Value (HML)', stocks: fillStocks(VALUE_STOCKS) },
    { factor: 'Momentum (UMD)', stocks: fillStocks(MOMENTUM_STOCKS) },
    { factor: 'Quality (QMJ)', stocks: fillStocks(QUALITY_STOCKS) },
  ];

  // Sort each group by factorScore descending
  for (const group of topFactorStocks) {
    group.stocks.sort((a, b) => b.factorScore - a.factorScore);
  }

  // ── 7. Risk Decomposition ──
  const marketBetaPct = round2(range(35, 55));
  const factorContributionPct = round2(range(20, 35));
  const stockSpecificPct = round2(100 - marketBetaPct - factorContributionPct);
  const totalRiskPct = round2(range(12, 22));

  const riskDecomp: RiskDecomp = { marketBetaPct, factorContributionPct, stockSpecificPct, totalRiskPct };

  // ── 8. Summary ──
  const sorted1M = [...factorReturns].sort((a, b) => b.return1MPct - a.return1MPct);
  const bestFactor1M = sorted1M[0].factor;
  const worstFactor1M = sorted1M[sorted1M.length - 1].factor;

  // Factor momentum based on average 1M return
  const avg1M = factorReturns.reduce((s, f) => s + f.return1MPct, 0) / factorReturns.length;
  let factorMomentum: Summary['factorMomentum'];
  if (avg1M > 1.0) factorMomentum = 'improving';
  else if (avg1M < -0.5) factorMomentum = 'deteriorating';
  else factorMomentum = 'stable';

  // Crowding alert based on highest crowding z-score
  const maxCrowding = [...factorExposure].sort((a, b) => Math.abs(b.crowding) - Math.abs(a.crowding))[0];
  let crowdingAlert: Summary['crowdingAlert'] = 'none';
  if (Math.abs(maxCrowding.crowding) > 1.5) {
    if (maxCrowding.factor.includes('Value')) crowdingAlert = 'value';
    else if (maxCrowding.factor.includes('Momentum')) crowdingAlert = 'momentum';
  }

  // Regime indicator based on majority of factor timing regimes
  const regimeCounts = { 'risk-on': 0, 'risk-off': 0, 'transition': 0 };
  for (const ft of factorTiming) regimeCounts[ft.regime]++;
  let regimeIndicator: Summary['regimeIndicator'] = 'transition';
  if (regimeCounts['risk-on'] >= 5) regimeIndicator = 'risk-on';
  else if (regimeCounts['risk-off'] >= 5) regimeIndicator = 'risk-off';

  const summary: Summary = { bestFactor1M, worstFactor1M, factorMomentum, crowdingAlert, regimeIndicator };

  return {
    factorReturns,
    factorExposure,
    factorCorrelations: corrMatrix,
    sectorFactorLoading,
    factorTiming,
    topFactorStocks,
    riskDecomp,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[QuantFactor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate quant factor data' });
  }
});

export default router;
