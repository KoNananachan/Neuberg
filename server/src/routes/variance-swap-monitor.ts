import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ── Types ──

interface TermStructureEntry {
  tenor: string;
  strikeVol: number;
  realizedVol: number;
  varSwapStrike: number;
  realizedVariance: number;
  impliedVariance: number;
  pnlBps: number;
  varRiskPremium: number;
}

interface IndexVarianceSwap {
  index: string;
  region: string;
  spotVol: number;
  impliedVol3M: number;
  realizedVol3M: number;
  varSwapStrike: number;
  varSwapMark: number;
  varianceNotional: string;
  vegaNotional: string;
  change1D: number;
  change1W: number;
  termStructure: TermStructureEntry[];
}

interface SingleStockVariance {
  ticker: string;
  name: string;
  sector: string;
  impliedVol: number;
  realizedVol20d: number;
  realizedVol60d: number;
  varSwapStrike: number;
  varianceRiskPremium: number;
  earningsEffect: number;
  signal: 'SELL_VAR' | 'BUY_VAR' | 'NEUTRAL';
  pnlRunning: number;
}

interface VolOfVolMetrics {
  vvix: number;
  vvixChange1D: number;
  vvixChange1W: number;
  vvixPercentile: number;
  vvixZScore: number;
  volOfVolATM: number;
  regime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'CRISIS';
  volOfVolTermStructure: { tenor: string; level: number }[];
}

interface CorrelationSwap {
  index: string;
  impliedCorrelation: number;
  realizedCorrelation: number;
  correlationSwapStrike: number;
  correlationRiskPremium: number;
  change1W: number;
  signal: 'SELL_CORR' | 'BUY_CORR' | 'NEUTRAL';
}

interface DispersionTrade {
  index: string;
  indexImpliedVar: number;
  avgComponentVar: number;
  impliedCorrelation: number;
  realizedCorrelation: number;
  dispersionSpread: number;
  dispersionPnl: number;
  legs: number;
  signal: 'LONG_DISPERSION' | 'SHORT_DISPERSION' | 'NEUTRAL';
}

interface GammaExposureEstimate {
  index: string;
  totalGammaGex: number;
  zeroDteGamma: number;
  gammaFlipLevel: number;
  putWall: number;
  callWall: number;
  netDealerGamma: string;
  gammaRegime: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  expectedDailyRange: number;
}

interface VarianceSwapMonitorResponse {
  termStructure: TermStructureEntry[];
  indexVarianceSwaps: IndexVarianceSwap[];
  singleStockVariance: SingleStockVariance[];
  volOfVol: VolOfVolMetrics;
  correlationSwaps: CorrelationSwap[];
  dispersionTrades: DispersionTrade[];
  gammaExposure: GammaExposureEstimate[];
  generatedAt: string;
}

// ── Static configs ──

const TENORS = ['1M', '3M', '6M', '1Y', '2Y'];
const TENOR_MULTIPLIERS = [0.90, 0.96, 1.00, 1.04, 1.09];

const INDEX_CONFIGS = [
  { index: 'SPX', region: 'North America', baseVol: 17.5, baseRealized: 14.2, notional: 850 },
  { index: 'NDX', region: 'North America', baseVol: 22.8, baseRealized: 18.5, notional: 420 },
  { index: 'SX5E', region: 'Europe', baseVol: 19.2, baseRealized: 16.0, notional: 310 },
  { index: 'NKY', region: 'Asia Pacific', baseVol: 21.5, baseRealized: 17.8, notional: 180 },
  { index: 'FTSE', region: 'Europe', baseVol: 16.8, baseRealized: 13.5, notional: 220 },
];

const STOCK_CONFIGS = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology', baseVol: 42.0, baseRealized: 36.5 },
  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Discretionary', baseVol: 52.0, baseRealized: 46.0 },
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Technology', baseVol: 22.5, baseRealized: 18.8 },
  { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer Discretionary', baseVol: 28.0, baseRealized: 23.5 },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Communication Services', baseVol: 32.0, baseRealized: 27.0 },
  { ticker: 'GOOG', name: 'Alphabet Inc', sector: 'Communication Services', baseVol: 26.5, baseRealized: 22.0 },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', baseVol: 23.0, baseRealized: 19.0 },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', baseVol: 22.0, baseRealized: 18.0 },
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', baseVol: 24.0, baseRealized: 20.5 },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials', baseVol: 26.0, baseRealized: 22.5 },
];

const CORR_INDICES = [
  { index: 'SPX', baseImpliedCorr: 0.38, baseRealizedCorr: 0.32 },
  { index: 'NDX', baseImpliedCorr: 0.42, baseRealizedCorr: 0.35 },
  { index: 'SX5E', baseImpliedCorr: 0.45, baseRealizedCorr: 0.40 },
  { index: 'NKY', baseImpliedCorr: 0.40, baseRealizedCorr: 0.34 },
];

const GEX_CONFIGS = [
  { index: 'SPX', baseGex: 12500, zeroDtePct: 0.32, spotBase: 5850, putWallPct: 0.04, callWallPct: 0.025 },
  { index: 'NDX', baseGex: 6800, zeroDtePct: 0.28, spotBase: 20500, putWallPct: 0.05, callWallPct: 0.03 },
  { index: 'SX5E', baseGex: 3200, zeroDtePct: 0.15, spotBase: 5100, putWallPct: 0.035, callWallPct: 0.02 },
  { index: 'NKY', baseGex: 2800, zeroDtePct: 0.18, spotBase: 39800, putWallPct: 0.045, callWallPct: 0.025 },
  { index: 'FTSE', baseGex: 1900, zeroDtePct: 0.12, spotBase: 8350, putWallPct: 0.03, callWallPct: 0.02 },
];
let cache: { data: VarianceSwapMonitorResponse; ts: number } | null = null;

// ── Data generation ──

function generate(): VarianceSwapMonitorResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('variance-swap-monitor-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 1. SPX Variance Swap Term Structure ──
  const spxConfig = INDEX_CONFIGS[0];
  const termStructure: TermStructureEntry[] = TENORS.map((tenor, i) => {
    const factor = TENOR_MULTIPLIERS[i];
    const strikeVol = round(clamp(jitter(spxConfig.baseVol * factor, 0.08), 12, 35));
    const realizedVol = round(clamp(jitter(spxConfig.baseRealized * factor, 0.10), 9, 30));
    const varSwapStrike = round(strikeVol * strikeVol);
    const realizedVariance = round(realizedVol * realizedVol);
    const impliedVariance = round(jitter(varSwapStrike * 1.02, 0.03));
    const pnlBps = round((realizedVariance - varSwapStrike) * 100 / varSwapStrike);
    const varRiskPremium = round(strikeVol - realizedVol);
    return { tenor, strikeVol, realizedVol, varSwapStrike, realizedVariance, impliedVariance, pnlBps, varRiskPremium };
  });

  // ── 2. Index Variance Swaps ──
  const indexVarianceSwaps: IndexVarianceSwap[] = INDEX_CONFIGS.map(cfg => {
    const spotVol = round(clamp(jitter(cfg.baseRealized, 0.10), 10, 35));
    const impliedVol3M = round(clamp(jitter(cfg.baseVol * 0.96, 0.08), 12, 35));
    const realizedVol3M = round(clamp(jitter(cfg.baseRealized * 0.96, 0.10), 9, 30));
    const varSwapStrike = round(impliedVol3M * impliedVol3M);
    const varSwapMark = round(jitter(varSwapStrike * 1.01, 0.02));
    const varianceNotional = `$${round(jitter(cfg.notional, 0.15), 0)}M`;
    const vegaNotional = `$${round(jitter(cfg.notional * 0.6, 0.12), 0)}M`;
    const change1D = round((rng() - 0.5) * 2.0);
    const change1W = round((rng() - 0.5) * 4.5);

    const idxTermStructure: TermStructureEntry[] = TENORS.map((tenor, ti) => {
      const factor = TENOR_MULTIPLIERS[ti];
      const sv = round(clamp(jitter(cfg.baseVol * factor, 0.08), 12, 40));
      const rv = round(clamp(jitter(cfg.baseRealized * factor, 0.10), 9, 35));
      const vss = round(sv * sv);
      const realVar = round(rv * rv);
      const implVar = round(jitter(vss * 1.02, 0.03));
      const pnl = round((realVar - vss) * 100 / vss);
      const vrp = round(sv - rv);
      return { tenor, strikeVol: sv, realizedVol: rv, varSwapStrike: vss, realizedVariance: realVar, impliedVariance: implVar, pnlBps: pnl, varRiskPremium: vrp };
    });

    return { index: cfg.index, region: cfg.region, spotVol, impliedVol3M, realizedVol3M, varSwapStrike, varSwapMark, varianceNotional, vegaNotional, change1D, change1W, termStructure: idxTermStructure };
  });

  // ── 3. Single-Stock Variance ──
  const singleStockVariance: SingleStockVariance[] = STOCK_CONFIGS.map(cfg => {
    const impliedVol = round(clamp(jitter(cfg.baseVol, 0.10), 15, 70));
    const realizedVol20d = round(clamp(jitter(cfg.baseRealized, 0.12), 12, 65));
    const realizedVol60d = round(clamp(jitter(cfg.baseRealized * 0.95, 0.10), 10, 60));
    const varSwapStrike = round(impliedVol * impliedVol);
    const varianceRiskPremium = round(impliedVol - realizedVol20d);
    // Earnings effect: higher for tech names, random magnitude
    const earningsEffect = round(clamp(jitter(cfg.baseVol * 0.12, 0.30), 0, 15));
    let signal: SingleStockVariance['signal'] = 'NEUTRAL';
    if (varianceRiskPremium > 5) signal = 'SELL_VAR';
    else if (varianceRiskPremium < 1) signal = 'BUY_VAR';
    const pnlRunning = round((rng() - 0.45) * varianceRiskPremium * 50);
    return { ticker: cfg.ticker, name: cfg.name, sector: cfg.sector, impliedVol, realizedVol20d, realizedVol60d, varSwapStrike, varianceRiskPremium, earningsEffect, signal, pnlRunning };
  });

  // ── 4. Vol-of-Vol Metrics ──
  const vvix = round(clamp(jitter(102, 0.12), 75, 145));
  const vvixChange1D = round((rng() - 0.5) * 6);
  const vvixChange1W = round((rng() - 0.5) * 12);
  const vvixPercentile = Math.round(clamp(rng() * 100, 3, 97));
  const vvixZScore = round(clamp((vvix - 100) / 15, -2.5, 3.0));
  const volOfVolATM = round(clamp(jitter(85, 0.12), 60, 120));

  let regime: VolOfVolMetrics['regime'] = 'NORMAL';
  if (vvix < 85) regime = 'LOW';
  else if (vvix > 120 && vvix <= 135) regime = 'ELEVATED';
  else if (vvix > 135) regime = 'CRISIS';

  const volOfVolTermStructure = TENORS.map((tenor, i) => ({
    tenor,
    level: round(clamp(jitter(volOfVolATM * TENOR_MULTIPLIERS[i], 0.06), 50, 130)),
  }));

  const volOfVol: VolOfVolMetrics = {
    vvix, vvixChange1D, vvixChange1W, vvixPercentile, vvixZScore, volOfVolATM, regime, volOfVolTermStructure,
  };

  // ── 5. Correlation Swaps ──
  const correlationSwaps: CorrelationSwap[] = CORR_INDICES.map(cfg => {
    const impliedCorrelation = round(clamp(jitter(cfg.baseImpliedCorr, 0.15), 0.15, 0.75), 3);
    const realizedCorrelation = round(clamp(jitter(cfg.baseRealizedCorr, 0.18), 0.10, 0.70), 3);
    const correlationSwapStrike = round(clamp(jitter(cfg.baseImpliedCorr * 1.03, 0.08), 0.15, 0.75), 3);
    const correlationRiskPremium = round(impliedCorrelation - realizedCorrelation, 3);
    const change1W = round((rng() - 0.5) * 0.06, 3);
    let signal: CorrelationSwap['signal'] = 'NEUTRAL';
    if (correlationRiskPremium > 0.06) signal = 'SELL_CORR';
    else if (correlationRiskPremium < 0.01) signal = 'BUY_CORR';
    return { index: cfg.index, impliedCorrelation, realizedCorrelation, correlationSwapStrike, correlationRiskPremium, change1W, signal };
  });

  // ── 6. Dispersion Trade Monitor ──
  const dispersionTrades: DispersionTrade[] = INDEX_CONFIGS.slice(0, 4).map((cfg, ci) => {
    const corrCfg = CORR_INDICES[ci];
    const indexImpliedVar = round(clamp(jitter(cfg.baseVol * cfg.baseVol, 0.08), 150, 900));
    // Average component var is higher than index var (dispersion)
    const avgComponentVar = round(clamp(jitter(indexImpliedVar * 1.6, 0.10), 200, 1500));
    const impliedCorrelation = round(clamp(jitter(corrCfg.baseImpliedCorr, 0.12), 0.15, 0.75), 3);
    const realizedCorrelation = round(clamp(jitter(corrCfg.baseRealizedCorr, 0.15), 0.10, 0.70), 3);
    const dispersionSpread = round(avgComponentVar - indexImpliedVar * Math.sqrt(impliedCorrelation));
    const dispersionPnl = round((rng() - 0.4) * dispersionSpread * 0.3);
    const legs = Math.round(clamp(jitter(cfg.index === 'SPX' ? 50 : 30, 0.15), 15, 60));
    let signal: DispersionTrade['signal'] = 'NEUTRAL';
    if (dispersionSpread > 120) signal = 'LONG_DISPERSION';
    else if (dispersionSpread < 40) signal = 'SHORT_DISPERSION';
    return { index: cfg.index, indexImpliedVar, avgComponentVar, impliedCorrelation, realizedCorrelation, dispersionSpread, dispersionPnl, legs, signal };
  });

  // ── 7. Gamma Exposure Estimates ──
  const gammaExposure: GammaExposureEstimate[] = GEX_CONFIGS.map(cfg => {
    const totalGammaGex = round(clamp(jitter(cfg.baseGex, 0.20), -cfg.baseGex * 2, cfg.baseGex * 3), 0);
    const zeroDteGamma = round(Math.abs(totalGammaGex) * clamp(jitter(cfg.zeroDtePct, 0.20), 0.05, 0.50), 0);
    const spotJittered = round(jitter(cfg.spotBase, 0.005), 0);
    const gammaFlipLevel = round(spotJittered * clamp(1 + (rng() - 0.5) * 0.02, 0.985, 1.015), 0);
    const putWall = round(spotJittered * (1 - clamp(jitter(cfg.putWallPct, 0.20), 0.02, 0.08)), 0);
    const callWall = round(spotJittered * (1 + clamp(jitter(cfg.callWallPct, 0.20), 0.01, 0.05)), 0);

    let netDealerGamma: string;
    let gammaRegime: GammaExposureEstimate['gammaRegime'];
    if (totalGammaGex > cfg.baseGex * 0.3) {
      netDealerGamma = `+$${round(Math.abs(totalGammaGex) / 1000, 1)}B`;
      gammaRegime = 'POSITIVE';
    } else if (totalGammaGex < -cfg.baseGex * 0.3) {
      netDealerGamma = `-$${round(Math.abs(totalGammaGex) / 1000, 1)}B`;
      gammaRegime = 'NEGATIVE';
    } else {
      netDealerGamma = `$${round(Math.abs(totalGammaGex) / 1000, 1)}B`;
      gammaRegime = 'NEUTRAL';
    }

    // Expected daily range: smaller in positive gamma (dealer dampening), larger in negative
    const baseDailyRange = cfg.index === 'SPX' ? 0.65 : cfg.index === 'NDX' ? 0.85 : 0.70;
    const gammaFactor = gammaRegime === 'POSITIVE' ? 0.75 : gammaRegime === 'NEGATIVE' ? 1.35 : 1.0;
    const expectedDailyRange = round(clamp(jitter(baseDailyRange * gammaFactor, 0.12), 0.25, 2.5));

    return { index: cfg.index, totalGammaGex, zeroDteGamma, gammaFlipLevel, putWall, callWall, netDealerGamma, gammaRegime, expectedDailyRange };
  });

  return {
    termStructure,
    indexVarianceSwaps,
    singleStockVariance,
    volOfVol,
    correlationSwaps,
    dispersionTrades,
    gammaExposure,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[VarianceSwapMonitor] Error:', message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate variance swap monitor data' });
  }
});

export default router;
