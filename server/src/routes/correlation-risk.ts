import { Router } from 'express';

const router = Router();

// ── Types ──

interface ImpliedCorrelationData {
  index: string;
  level: number;
  change1D: number;
  change1W: number;
  percentile1Y: number;
  historicalAvg: number;
  signal: 'elevated' | 'normal' | 'low';
}

interface CrossAssetCorrelationEntry {
  current: number;
  avg3M: number;
  change: number;
}

interface CrossAssetCorrelationMatrix {
  assets: string[];
  matrix: CrossAssetCorrelationEntry[][];
}

interface EquityCorrelation {
  sp500AvgPairwiseCorr: number;
  sp500ImpliedCorr: number;
  dispersionIndex: number;
  sectorCorrelationAvg: number;
  singleStockCorrelationAvg: number;
  correlationSkew: number;
}

interface SectorCorrelation {
  sector: string;
  corrWithSPX: number;
  corrWithBonds: number;
  corrWithDollar: number;
  avgIntraSectorCorr: number;
  change1M: number;
}

interface RegimeAnalysis {
  currentRegime: 'risk-on' | 'risk-off' | 'transition' | 'crisis';
  stockBondCorrelation: number;
  correlationBreakdowns: number;
  regimeChangeProbability: number;
}

interface TailCorrelation {
  leftTailCorr: number;
  rightTailCorr: number;
  tailCorrSpread: number;
  stressTestCorrelation: number;
  worstCasePortfolioImpact: number;
}

interface DispersionTrade {
  underlying: string;
  impliedCorr: number;
  realizedCorr: number;
  dispersionSpread: number;
  signal: 'long dispersion' | 'short dispersion';
}

interface CorrelationRiskSummary {
  overallCorrelationLevel: 'high' | 'moderate' | 'low';
  impliedVsRealized: number;
  diversificationBenefit: number;
  riskConcentration: string;
  keyCorrelationShift: string;
}

interface CorrelationRiskResponse {
  impliedCorrelation: ImpliedCorrelationData;
  crossAssetCorrelation: CrossAssetCorrelationMatrix;
  equityCorrelation: EquityCorrelation;
  sectorCorrelations: SectorCorrelation[];
  regimeAnalysis: RegimeAnalysis;
  tailCorrelation: TailCorrelation;
  dispersionTrades: DispersionTrade[];
  summary: CorrelationRiskSummary;
  generatedAt: string;
}

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ── Constants ──

const CROSS_ASSET_NAMES = [
  'SPX', 'Bonds 10Y', 'Gold', 'USD Index', 'Oil', 'EM Equity', 'HY Credit', 'VIX',
] as const;

// Base correlation matrix (8x8) encoding realistic financial relationships
// Order: SPX, Bonds 10Y, Gold, USD Index, Oil, EM Equity, HY Credit, VIX
const BASE_CROSS_ASSET: number[][] = [
  //  SPX    Bonds   Gold    USD     Oil     EM      HY      VIX
  [  1.00,  -0.15,   0.05,  -0.10,   0.25,   0.72,   0.68,  -0.82 ], // SPX
  [ -0.15,   1.00,   0.28,   0.12,  -0.10,  -0.08,  -0.30,   0.18 ], // Bonds 10Y
  [  0.05,   0.28,   1.00,  -0.42,   0.22,   0.15,   0.05,   0.12 ], // Gold
  [ -0.10,   0.12,  -0.42,   1.00,  -0.18,  -0.35,  -0.15,   0.08 ], // USD Index
  [  0.25,  -0.10,   0.22,  -0.18,   1.00,   0.38,   0.35,  -0.22 ], // Oil
  [  0.72,  -0.08,   0.15,  -0.35,   0.38,   1.00,   0.58,  -0.62 ], // EM Equity
  [  0.68,  -0.30,   0.05,  -0.15,   0.35,   0.58,   1.00,  -0.58 ], // HY Credit
  [ -0.82,   0.18,   0.12,   0.08,  -0.22,  -0.62,  -0.58,   1.00 ], // VIX
];

const GICS_SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
  'Industrials', 'Communication Services', 'Consumer Staples',
  'Energy', 'Utilities', 'Real Estate', 'Materials',
] as const;

// Base sector correlations with SPX, Bonds, USD
const SECTOR_BASE: Record<string, { spx: number; bonds: number; usd: number; intra: number }> = {
  'Technology':              { spx: 0.92, bonds: -0.18, usd: -0.08, intra: 0.65 },
  'Healthcare':              { spx: 0.78, bonds: -0.05, usd:  0.02, intra: 0.48 },
  'Financials':              { spx: 0.88, bonds: -0.25, usd:  0.05, intra: 0.72 },
  'Consumer Discretionary':  { spx: 0.90, bonds: -0.15, usd: -0.10, intra: 0.55 },
  'Industrials':             { spx: 0.88, bonds: -0.12, usd: -0.05, intra: 0.58 },
  'Communication Services':  { spx: 0.85, bonds: -0.10, usd: -0.05, intra: 0.50 },
  'Consumer Staples':        { spx: 0.62, bonds:  0.15, usd:  0.08, intra: 0.52 },
  'Energy':                  { spx: 0.55, bonds: -0.08, usd: -0.12, intra: 0.75 },
  'Utilities':               { spx: 0.45, bonds:  0.25, usd:  0.05, intra: 0.60 },
  'Real Estate':             { spx: 0.65, bonds:  0.10, usd: -0.05, intra: 0.62 },
  'Materials':               { spx: 0.72, bonds: -0.10, usd: -0.15, intra: 0.58 },
};

const DISPERSION_UNDERLYINGS = ['SPX', 'NDX', 'RTY', 'STOXX50E', 'FTSE100'] as const;

// ── Data generation ──

function generate(): CorrelationRiskResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('correlation-risk-' + today);
  const rng = mulberry32(seed);

  // 1. Implied Correlation (ICJ index, typically 30-70)
  const icjLevel = round(clamp(45 + (rng() - 0.5) * 30, 30, 70), 2);
  const icjHistAvg = round(clamp(icjLevel + (rng() - 0.5) * 10, 35, 55), 2);
  const icjChange1D = round((rng() - 0.5) * 3, 2);
  const icjChange1W = round((rng() - 0.5) * 6, 2);
  const icjPercentile1Y = round(clamp(rng() * 100, 5, 95), 1);

  let icjSignal: 'elevated' | 'normal' | 'low';
  if (icjLevel > 55) icjSignal = 'elevated';
  else if (icjLevel < 35) icjSignal = 'low';
  else icjSignal = 'normal';

  const impliedCorrelation: ImpliedCorrelationData = {
    index: 'ICJ',
    level: icjLevel,
    change1D: icjChange1D,
    change1W: icjChange1W,
    percentile1Y: icjPercentile1Y,
    historicalAvg: icjHistAvg,
    signal: icjSignal,
  };

  // 2. Cross-Asset Correlation Matrix (8x8)
  const n = CROSS_ASSET_NAMES.length;
  const crossMatrix: CrossAssetCorrelationEntry[][] = [];

  for (let i = 0; i < n; i++) {
    const row: CrossAssetCorrelationEntry[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row.push({ current: 1.0, avg3M: 1.0, change: 0 });
      } else {
        const base = BASE_CROSS_ASSET[i][j];
        const spread = Math.abs(base) > 0.5 ? 0.06 : Math.abs(base) > 0.2 ? 0.10 : 0.14;
        const current = round(clamp(base + (rng() - 0.5) * 2 * spread, -1, 1), 3);
        const avg3M = round(clamp(base + (rng() - 0.5) * 0.08, -1, 1), 3);
        const change = round(current - avg3M, 3);
        row.push({ current, avg3M, change });
      }
    }
    crossMatrix.push(row);
  }

  const crossAssetCorrelation: CrossAssetCorrelationMatrix = {
    assets: [...CROSS_ASSET_NAMES],
    matrix: crossMatrix,
  };

  // 3. Equity Correlation
  const sp500AvgPairwiseCorr = round(clamp(0.32 + (rng() - 0.5) * 0.20, 0.25, 0.45), 3);
  const sp500ImpliedCorr = round(clamp(sp500AvgPairwiseCorr + 0.08 + (rng() - 0.5) * 0.10, 0.30, 0.60), 3);
  const dispersionIndex = round(clamp(sp500ImpliedCorr - sp500AvgPairwiseCorr + (rng() - 0.5) * 0.05, -0.05, 0.25), 3);
  const sectorCorrelationAvg = round(clamp(0.55 + (rng() - 0.5) * 0.20, 0.40, 0.75), 3);
  const singleStockCorrelationAvg = round(clamp(sp500AvgPairwiseCorr - 0.05 + (rng() - 0.5) * 0.06, 0.18, 0.42), 3);
  const correlationSkew = round((rng() - 0.5) * 0.30, 3);

  const equityCorrelation: EquityCorrelation = {
    sp500AvgPairwiseCorr,
    sp500ImpliedCorr,
    dispersionIndex,
    sectorCorrelationAvg,
    singleStockCorrelationAvg,
    correlationSkew,
  };

  // 4. Sector Correlations (11 GICS sectors)
  const sectorCorrelations: SectorCorrelation[] = GICS_SECTORS.map((sector) => {
    const base = SECTOR_BASE[sector];
    return {
      sector,
      corrWithSPX: round(clamp(base.spx + (rng() - 0.5) * 0.10, 0.30, 0.98), 3),
      corrWithBonds: round(clamp(base.bonds + (rng() - 0.5) * 0.12, -0.40, 0.35), 3),
      corrWithDollar: round(clamp(base.usd + (rng() - 0.5) * 0.10, -0.25, 0.20), 3),
      avgIntraSectorCorr: round(clamp(base.intra + (rng() - 0.5) * 0.15, 0.30, 0.85), 3),
      change1M: round((rng() - 0.5) * 0.12, 3),
    };
  });

  // 5. Regime Analysis
  // Stock-bond correlation: historically -0.3 to +0.2, key regime indicator
  const stockBondCorr = crossMatrix[0][1].current; // SPX vs Bonds 10Y
  const breakdownThreshold = 0.3;
  let breakdowns = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(crossMatrix[i][j].change) > breakdownThreshold) {
        breakdowns++;
      }
    }
  }

  let currentRegime: 'risk-on' | 'risk-off' | 'transition' | 'crisis';
  if (stockBondCorr < -0.15 && breakdowns <= 2) {
    currentRegime = 'risk-on';
  } else if (stockBondCorr > 0.10 && breakdowns >= 4) {
    currentRegime = 'crisis';
  } else if (stockBondCorr > 0.05) {
    currentRegime = 'risk-off';
  } else {
    currentRegime = 'transition';
  }

  const regimeChangeProbability = round(clamp(
    currentRegime === 'transition' ? 35 + rng() * 30
      : currentRegime === 'crisis' ? 20 + rng() * 25
        : 5 + rng() * 20,
    5, 65
  ), 1);

  const regimeAnalysis: RegimeAnalysis = {
    currentRegime,
    stockBondCorrelation: stockBondCorr,
    correlationBreakdowns: breakdowns,
    regimeChangeProbability,
  };

  // 6. Tail Correlation
  // Left tail (selloff) correlation is typically higher than right tail
  const leftTailCorr = round(clamp(0.55 + (rng() - 0.5) * 0.25, 0.35, 0.80), 3);
  const rightTailCorr = round(clamp(0.25 + (rng() - 0.5) * 0.20, 0.10, 0.45), 3);
  const tailCorrSpread = round(leftTailCorr - rightTailCorr, 3);
  const stressTestCorrelation = round(clamp(leftTailCorr + 0.10 + (rng() - 0.5) * 0.10, 0.50, 0.95), 3);
  const worstCasePortfolioImpact = round(clamp(-(8 + rng() * 18), -28, -6), 1);

  const tailCorrelation: TailCorrelation = {
    leftTailCorr,
    rightTailCorr,
    tailCorrSpread,
    stressTestCorrelation,
    worstCasePortfolioImpact,
  };

  // 7. Dispersion Trades (5 underlyings)
  const dispersionTrades: DispersionTrade[] = DISPERSION_UNDERLYINGS.map((underlying) => {
    const impliedCorr = round(clamp(0.35 + (rng() - 0.5) * 0.30, 0.20, 0.65), 3);
    const realizedCorr = round(clamp(impliedCorr - 0.05 + (rng() - 0.5) * 0.15, 0.15, 0.55), 3);
    const dispersionSpread = round(impliedCorr - realizedCorr, 3);
    const signal: 'long dispersion' | 'short dispersion' = dispersionSpread > 0.03 ? 'long dispersion' : 'short dispersion';
    return { underlying, impliedCorr, realizedCorr, dispersionSpread, signal };
  });

  // 8. Summary
  const avgImplied = dispersionTrades.reduce((s, d) => s + d.impliedCorr, 0) / dispersionTrades.length;
  const avgRealized = dispersionTrades.reduce((s, d) => s + d.realizedCorr, 0) / dispersionTrades.length;

  let overallCorrelationLevel: 'high' | 'moderate' | 'low';
  if (sp500AvgPairwiseCorr > 0.40) overallCorrelationLevel = 'high';
  else if (sp500AvgPairwiseCorr < 0.30) overallCorrelationLevel = 'low';
  else overallCorrelationLevel = 'moderate';

  // Diversification benefit: lower correlation => higher benefit (inversely related)
  const diversificationBenefit = round(clamp((1 - sp500AvgPairwiseCorr) * 60 + (rng() - 0.5) * 10, 25, 55), 1);

  // Find the largest absolute change in cross-asset matrix for key shift
  let maxChange = 0;
  let shiftAssets = '';
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const absChange = Math.abs(crossMatrix[i][j].change);
      if (absChange > maxChange) {
        maxChange = absChange;
        shiftAssets = `${CROSS_ASSET_NAMES[i]} / ${CROSS_ASSET_NAMES[j]}`;
      }
    }
  }

  const riskConcentrationOptions = [
    'Equity factor crowding elevated',
    'Momentum factor concentration high',
    'Low volatility factor crowded',
    'Growth-value dispersion widening',
    'Quality factor risk moderate',
    'Size factor exposure concentrated',
  ];
  const riskConcentration = riskConcentrationOptions[Math.floor(rng() * riskConcentrationOptions.length)];

  const changeDir = crossMatrix[0][1].change > 0 ? 'rising' : 'falling';
  const keyCorrelationShift = `${shiftAssets} correlation ${changeDir} (${maxChange > 0 ? '+' : ''}${round(maxChange, 3)})`;

  const summary: CorrelationRiskSummary = {
    overallCorrelationLevel,
    impliedVsRealized: round(avgImplied - avgRealized, 3),
    diversificationBenefit,
    riskConcentration,
    keyCorrelationShift,
  };

  return {
    impliedCorrelation,
    crossAssetCorrelation,
    equityCorrelation,
    sectorCorrelations,
    regimeAnalysis,
    tailCorrelation,
    dispersionTrades,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5 min TTL) ──

let cacheData: CorrelationRiskResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000;

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
    console.error('[CorrelationRisk] Error:', (err as Error).message);
    // Stale fallback
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate correlation risk data' });
  }
});

export default router;
