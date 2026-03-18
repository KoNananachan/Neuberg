import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface FactorConfig {
  name: string;
  symbol: string;
  pairSymbol: string | null; // short leg for spread factors
}

type Signal = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
type Style = 'value' | 'growth' | 'quality' | 'momentum' | 'mixed';

interface FactorResult {
  name: string;
  symbol: string;
  pairSymbol: string | null;
  return5d: number;
  return20d: number;
  return60d: number;
  volatility20d: number;
  sharpe20d: number;
  zScore: number;
  relativeStrength: number;
  corrToMarket: number;
  signal: Signal;
  sparkline: number[];
}

interface RegimeInfo {
  dominantFactor: string;
  style: Style;
  description: string;
}

interface FactorExposureData {
  timestamp: string;
  factors: FactorResult[];
  regime: RegimeInfo;
  factorCorrelationMatrix: {
    names: string[];
    values: number[][];
  };
}

// ── Factor Definitions ──

const FACTORS: FactorConfig[] = [
  { name: 'Market (Beta)', symbol: 'SPY', pairSymbol: null },
  { name: 'Value', symbol: 'IWD', pairSymbol: 'IWF' },
  { name: 'Size', symbol: 'IWM', pairSymbol: 'SPY' },
  { name: 'Momentum', symbol: 'MTUM', pairSymbol: null },
  { name: 'Quality', symbol: 'QUAL', pairSymbol: null },
  { name: 'Low Volatility', symbol: 'USMV', pairSymbol: null },
  { name: 'Growth', symbol: 'IWF', pairSymbol: null },
  { name: 'Dividend Yield', symbol: 'DVY', pairSymbol: null },
];

const BENCHMARK = 'SPY';

// ── Math Helpers ──

function dailyReturns(closes: number[]): number[] {
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }
  return rets;
}

function cumulativeReturn(closes: number[], days: number): number {
  if (closes.length < days + 1) return 0;
  const current = closes[closes.length - 1];
  const past = closes[closes.length - 1 - days];
  if (!past || past === 0) return 0;
  return ((current - past) / past) * 100;
}

function annualizedVol(returns: number[], period: number): number {
  const slice = returns.slice(-period);
  if (slice.length < 2) return 0;
  const mean = slice.reduce((s, r) => s + r, 0) / slice.length;
  const variance = slice.reduce((s, r) => s + (r - mean) ** 2, 0) / (slice.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function sharpeRatio(returns: number[], period: number): number {
  const slice = returns.slice(-period);
  if (slice.length < 2) return 0;
  const mean = slice.reduce((s, r) => s + r, 0) / slice.length;
  const variance = slice.reduce((s, r) => s + (r - mean) ** 2, 0) / (slice.length - 1);
  const vol = Math.sqrt(variance);
  if (vol === 0) return 0;
  // Annualize: mean * 252 / (vol * sqrt(252))
  return (mean * Math.sqrt(252)) / vol;
}

function zScore(returns: number[], shortWindow: number, longWindow: number): number {
  if (returns.length < longWindow) return 0;
  const longSlice = returns.slice(-longWindow);
  const shortSlice = returns.slice(-shortWindow);

  const shortMean = shortSlice.reduce((s, r) => s + r, 0) / shortSlice.length;
  const longMean = longSlice.reduce((s, r) => s + r, 0) / longSlice.length;
  const longVariance = longSlice.reduce((s, r) => s + (r - longMean) ** 2, 0) / (longSlice.length - 1);
  const longStd = Math.sqrt(longVariance);

  if (longStd === 0) return 0;
  return (shortMean - longMean) / longStd;
}

function correlation(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len < 5) return 0;
  const sliceA = a.slice(-len);
  const sliceB = b.slice(-len);

  const meanA = sliceA.reduce((s, v) => s + v, 0) / len;
  const meanB = sliceB.reduce((s, v) => s + v, 0) / len;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < len; i++) {
    const dA = sliceA[i] - meanA;
    const dB = sliceB[i] - meanB;
    cov += dA * dB;
    varA += dA * dA;
    varB += dB * dB;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return 0;
  return cov / denom;
}

function spreadReturns(longCloses: number[], shortCloses: number[]): number[] {
  // Calculate daily spread returns (long - short)
  const len = Math.min(longCloses.length, shortCloses.length);
  const longRets = dailyReturns(longCloses.slice(-len));
  const shortRets = dailyReturns(shortCloses.slice(-len));
  const minLen = Math.min(longRets.length, shortRets.length);
  const result: number[] = [];
  for (let i = 0; i < minLen; i++) {
    result.push(longRets[i] - shortRets[i]);
  }
  return result;
}

function spreadCumulativeReturn(longCloses: number[], shortCloses: number[], days: number): number {
  const longRet = cumulativeReturn(longCloses, days);
  const shortRet = cumulativeReturn(shortCloses, days);
  return longRet - shortRet;
}

function determineSignal(z: number, relStr: number, sharpe: number): Signal {
  const score = z * 0.4 + relStr * 0.3 + sharpe * 0.3;
  if (score > 1.5) return 'strong_buy';
  if (score > 0.5) return 'buy';
  if (score < -1.5) return 'strong_sell';
  if (score < -0.5) return 'sell';
  return 'neutral';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ── Cache ──

let cache: { data: FactorExposureData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Route ──

// GET /api/factor-exposure
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Collect all unique symbols
    const allSymbols = new Set<string>();
    for (const f of FACTORS) {
      allSymbols.add(f.symbol);
      if (f.pairSymbol) allSymbols.add(f.pairSymbol);
    }
    const symbolList = Array.from(allSymbols);

    // Fetch 60 days of history for all symbols
    const histories = await Promise.all(
      symbolList.map((s) => getHistory(s, { range: '3mo', interval: '1d' })),
    );

    // Build closes map
    const closesMap = new Map<string, number[]>();
    for (let i = 0; i < symbolList.length; i++) {
      const closes: number[] = [];
      for (const bar of histories[i]) {
        if (bar.close != null && bar.close > 0) {
          closes.push(bar.close);
        }
      }
      closesMap.set(symbolList[i], closes);
    }

    const spyCloses = closesMap.get(BENCHMARK) ?? [];
    const spyReturns = dailyReturns(spyCloses);

    // Calculate factor metrics
    const factors: FactorResult[] = [];
    const allFactorReturns: number[][] = [];

    for (const factor of FACTORS) {
      const longCloses = closesMap.get(factor.symbol) ?? [];

      if (longCloses.length < 20) {
        // Not enough data, skip
        continue;
      }

      let factorRets: number[];
      let ret5d: number;
      let ret20d: number;
      let ret60d: number;

      if (factor.pairSymbol) {
        // Spread factor: long - short
        const shortCloses = closesMap.get(factor.pairSymbol) ?? [];
        if (shortCloses.length < 20) continue;
        factorRets = spreadReturns(longCloses, shortCloses);
        ret5d = round2(spreadCumulativeReturn(longCloses, shortCloses, 5));
        ret20d = round2(spreadCumulativeReturn(longCloses, shortCloses, 20));
        ret60d = round2(spreadCumulativeReturn(longCloses, shortCloses, 60));
      } else {
        factorRets = dailyReturns(longCloses);
        ret5d = round2(cumulativeReturn(longCloses, 5));
        ret20d = round2(cumulativeReturn(longCloses, 20));
        ret60d = round2(cumulativeReturn(longCloses, 60));
      }

      if (factorRets.length < 10) continue;

      const vol20d = round2(annualizedVol(factorRets, 20));
      const sharpe20d = round2(sharpeRatio(factorRets, 20));
      const z = round2(zScore(factorRets, 5, 60));

      // Relative strength vs SPY (20d rolling outperformance)
      const factorRet20 = factorRets.slice(-20).reduce((s, r) => s + r, 0) * 100;
      const spyRet20 = spyReturns.slice(-20).reduce((s, r) => s + r, 0) * 100;
      const relStr = round2(factorRet20 - spyRet20);

      // Correlation to market
      const corrToMkt = round4(correlation(factorRets, spyReturns));

      // Signal
      const signal = determineSignal(z, relStr / 5, sharpe20d);

      // Sparkline: last 20 normalized returns
      const sparkReturns = factorRets.slice(-20);
      const cumSparkline: number[] = [];
      let cumVal = 0;
      for (const r of sparkReturns) {
        cumVal += r * 100;
        cumSparkline.push(round2(cumVal));
      }

      factors.push({
        name: factor.name,
        symbol: factor.symbol,
        pairSymbol: factor.pairSymbol,
        return5d: ret5d,
        return20d: ret20d,
        return60d: ret60d,
        volatility20d: vol20d,
        sharpe20d: sharpe20d,
        zScore: z,
        relativeStrength: relStr,
        corrToMarket: corrToMkt,
        signal,
        sparkline: cumSparkline,
      });

      allFactorReturns.push(factorRets);
    }

    // Factor correlation matrix
    const matrixNames = factors.map((f) => f.name);
    const matrixValues: number[][] = [];
    for (let i = 0; i < allFactorReturns.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < allFactorReturns.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          row.push(round4(correlation(allFactorReturns[i], allFactorReturns[j])));
        }
      }
      matrixValues.push(row);
    }

    // Determine regime
    const regime = determineRegime(factors);

    const data: FactorExposureData = {
      timestamp: new Date().toISOString(),
      factors,
      regime,
      factorCorrelationMatrix: {
        names: matrixNames,
        values: matrixValues,
      },
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FactorExposure] Error fetching data:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch factor exposure data' });
  }
});

function determineRegime(factors: FactorResult[]): RegimeInfo {
  // Find the dominant factor by absolute 20d return
  const sorted = [...factors].sort((a, b) => Math.abs(b.return20d) - Math.abs(a.return20d));
  const dominant = sorted[0];

  if (!dominant) {
    return { dominantFactor: 'N/A', style: 'mixed', description: 'Insufficient data to determine market regime.' };
  }

  // Determine style based on which factors are leading
  const factorStrength = new Map<string, number>();
  for (const f of factors) {
    factorStrength.set(f.name, f.return20d);
  }

  const valueRet = factorStrength.get('Value') ?? 0;
  const growthRet = factorStrength.get('Growth') ?? 0;
  const qualityRet = factorStrength.get('Quality') ?? 0;
  const momentumRet = factorStrength.get('Momentum') ?? 0;

  let style: Style = 'mixed';
  let description = '';

  if (valueRet > growthRet && valueRet > qualityRet && valueRet > 0) {
    style = 'value';
    description = `Value factor leads with ${valueRet > 0 ? '+' : ''}${valueRet.toFixed(2)}% return over 20d. Value stocks outperforming growth, suggesting rotation into cheaper names.`;
  } else if (growthRet > valueRet && growthRet > qualityRet && growthRet > 0) {
    style = 'growth';
    description = `Growth factor dominates with ${growthRet > 0 ? '+' : ''}${growthRet.toFixed(2)}% return over 20d. Risk appetite favoring high-growth names over value.`;
  } else if (qualityRet > Math.abs(valueRet) && qualityRet > Math.abs(growthRet) && qualityRet > 0) {
    style = 'quality';
    description = `Quality factor leading at ${qualityRet > 0 ? '+' : ''}${qualityRet.toFixed(2)}% over 20d. Market favoring profitable, low-leverage companies.`;
  } else if (Math.abs(momentumRet) > Math.abs(valueRet) && Math.abs(momentumRet) > Math.abs(growthRet)) {
    style = 'momentum';
    description = `Momentum factor strongest at ${momentumRet > 0 ? '+' : ''}${momentumRet.toFixed(2)}% over 20d. Trend-following strategies outperforming.`;
  } else {
    style = 'mixed';
    description = 'No single factor dominates. Mixed regime with rotating factor leadership, suggesting diversified factor exposure.';
  }

  return {
    dominantFactor: dominant.name,
    style,
    description,
  };
}

export default router;
