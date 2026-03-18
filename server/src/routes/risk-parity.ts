import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface AssetConfig {
  name: string;
  symbol: string;
  class: 'equity' | 'bond' | 'commodity' | 'real_estate' | 'cash';
}

interface AssetResult {
  name: string;
  symbol: string;
  class: 'equity' | 'bond' | 'commodity' | 'real_estate' | 'cash';
  price: number;
  changePct: number;
  return20d: number;
  return60d: number;
  vol20d: number;
  vol60d: number;
  sharpe: number;
  riskParityWeight: number;
  equalWeight: number;
  riskContribution: number;
  sparkline: number[];
}

interface PortfolioStats {
  vol: number;
  expectedReturn: number;
  sharpe: number;
}

interface RiskBudgetEntry {
  name: string;
  equalWeightRisk: number;
  riskParityRisk: number;
}

interface RiskParityResponse {
  timestamp: string;
  assets: AssetResult[];
  portfolio: {
    riskParity: PortfolioStats;
    equalWeight: PortfolioStats;
  };
  correlationMatrix: {
    symbols: string[];
    values: number[][];
  };
  riskBudget: RiskBudgetEntry[];
}

// ── Asset Definitions ──

const ASSETS: AssetConfig[] = [
  { name: 'US Equities', symbol: 'SPY', class: 'equity' },
  { name: 'Intl Developed', symbol: 'EFA', class: 'equity' },
  { name: 'Emerging Mkts', symbol: 'EEM', class: 'equity' },
  { name: 'Long-Term Bonds', symbol: 'TLT', class: 'bond' },
  { name: 'Interm Bonds', symbol: 'IEF', class: 'bond' },
  { name: 'Aggregate Bond', symbol: 'AGG', class: 'bond' },
  { name: 'TIPS', symbol: 'TIP', class: 'bond' },
  { name: 'Commodities', symbol: 'DBC', class: 'commodity' },
  { name: 'Gold', symbol: 'GLD', class: 'commodity' },
  { name: 'Real Estate', symbol: 'VNQ', class: 'real_estate' },
  { name: 'Cash Proxy', symbol: 'SHV', class: 'cash' },
];

// ── Math Helpers ──

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function dailyReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] !== 0) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }
  return returns;
}

function annualizedVol(dailyRets: number[], window: number): number {
  const slice = dailyRets.slice(-window);
  if (slice.length < 2) return 0;
  return stddev(slice) * Math.sqrt(252) * 100; // as percentage
}

function periodReturn(closes: number[], days: number): number {
  if (closes.length < days + 1) return 0;
  const current = closes[closes.length - 1];
  const past = closes[closes.length - 1 - days];
  if (past === 0) return 0;
  return ((current - past) / past) * 100;
}

function correlation(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len < 5) return 0;
  const sliceA = a.slice(-len);
  const sliceB = b.slice(-len);
  const mA = mean(sliceA);
  const mB = mean(sliceB);
  const sA = stddev(sliceA);
  const sB = stddev(sliceB);
  if (sA === 0 || sB === 0) return 0;

  let cov = 0;
  for (let i = 0; i < len; i++) {
    cov += (sliceA[i] - mA) * (sliceB[i] - mB);
  }
  cov /= len - 1;
  return Math.max(-1, Math.min(1, cov / (sA * sB)));
}

function normalizeSparkline(values: number[], count: number): number[] {
  if (values.length === 0) return Array(count).fill(0.5);
  const step = Math.max(1, Math.floor(values.length / count));
  const sampled: number[] = [];
  for (let i = 0; i < count && i * step < values.length; i++) {
    sampled.push(values[i * step]);
  }
  while (sampled.length < count) {
    sampled.push(sampled[sampled.length - 1] ?? 0);
  }
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  return sampled.map((v) => (v - min) / range);
}

// ── Cache ──

let cache: { data: RiskParityResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const symbols = ASSETS.map((a) => a.symbol);

    // Fetch 120 days of daily history and quotes in parallel
    const [historyResults, quotes] = await Promise.all([
      Promise.all(symbols.map((s) => getHistory(s, { range: '6mo', interval: '1d' }))),
      getQuotes(symbols),
    ]);

    // Build price map from quotes
    const quoteMap = new Map<string, { price: number; changePct: number }>();
    for (const q of quotes) {
      quoteMap.set(q.symbol, {
        price: q.price,
        changePct: q.changePercent ?? 0,
      });
    }

    // Build closes map: symbol -> array of closing prices (last 120 days)
    const closesMap = new Map<string, number[]>();
    const returnsMap = new Map<string, number[]>();
    const N = ASSETS.length;

    for (let i = 0; i < N; i++) {
      const sym = symbols[i];
      const history = (historyResults[i] as { date: string; close: number | null }[]).slice(-120);
      const closes = history
        .map((h) => h.close)
        .filter((c): c is number => c != null);
      closesMap.set(sym, closes);
      returnsMap.set(sym, dailyReturns(closes));
    }

    // Calculate per-asset metrics
    const vol20dArr: number[] = [];
    const vol60dArr: number[] = [];
    const return20dArr: number[] = [];
    const return60dArr: number[] = [];
    const sharpeArr: number[] = [];
    const sparklines: number[][] = [];

    for (let i = 0; i < N; i++) {
      const sym = symbols[i];
      const closes = closesMap.get(sym) || [];
      const rets = returnsMap.get(sym) || [];

      const v20 = annualizedVol(rets, 20);
      const v60 = annualizedVol(rets, 60);
      const r20 = periodReturn(closes, 20);
      const r60 = periodReturn(closes, 60);

      // Sharpe: annualized return / annualized vol
      const annReturn = r60 * (252 / 60); // annualize the 60d return
      const sharpe = v60 > 0 ? annReturn / v60 : 0;

      vol20dArr.push(v20);
      vol60dArr.push(v60);
      return20dArr.push(r20);
      return60dArr.push(r60);
      sharpeArr.push(sharpe);
      sparklines.push(normalizeSparkline(closes.slice(-20), 20));
    }

    // Risk parity weights: inversely proportional to volatility
    const invVols = vol60dArr.map((v) => (v > 0 ? 1 / v : 0));
    const invVolSum = invVols.reduce((a, b) => a + b, 0);
    const rpWeights = invVolSum > 0
      ? invVols.map((iv) => (iv / invVolSum) * 100)
      : Array(N).fill(100 / N);

    const equalWeight = 100 / N;
    const ewWeights = Array(N).fill(equalWeight);

    // Build 60d correlation matrix
    const corrMatrix: number[][] = [];
    for (let i = 0; i < N; i++) {
      const row: number[] = [];
      const retsI = (returnsMap.get(symbols[i]) || []).slice(-60);
      for (let j = 0; j < N; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const retsJ = (returnsMap.get(symbols[j]) || []).slice(-60);
          row.push(correlation(retsI, retsJ));
        }
      }
      corrMatrix.push(row);
    }

    // Portfolio volatility calculation
    // vol = sqrt( w^T * Cov * w )
    // Cov_ij = corr_ij * vol_i * vol_j
    function portfolioVol(weights: number[]): number {
      // weights are in %, vols are in %
      let variance = 0;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const wi = weights[i] / 100;
          const wj = weights[j] / 100;
          const vi = vol60dArr[i] / 100; // convert from % back to decimal
          const vj = vol60dArr[j] / 100;
          variance += wi * wj * corrMatrix[i][j] * vi * vj;
        }
      }
      return Math.sqrt(Math.max(0, variance)) * 100; // back to %
    }

    function portfolioReturn(weights: number[]): number {
      let ret = 0;
      for (let i = 0; i < N; i++) {
        const annRet = return60dArr[i] * (252 / 60);
        ret += (weights[i] / 100) * annRet;
      }
      return ret;
    }

    const rpVol = portfolioVol(rpWeights);
    const rpReturn = portfolioReturn(rpWeights);
    const rpSharpe = rpVol > 0 ? rpReturn / rpVol : 0;

    const ewVol = portfolioVol(ewWeights);
    const ewReturn = portfolioReturn(ewWeights);
    const ewSharpe = ewVol > 0 ? ewReturn / ewVol : 0;

    // Risk contribution in equal-weight portfolio
    // Marginal risk contribution: MRC_i = (Cov * w)_i / portfolio_vol
    // Risk contribution: RC_i = w_i * MRC_i
    function riskContributions(weights: number[]): number[] {
      const pVol = portfolioVol(weights);
      if (pVol === 0) return Array(N).fill(100 / N);

      const contributions: number[] = [];
      for (let i = 0; i < N; i++) {
        let marginal = 0;
        for (let j = 0; j < N; j++) {
          const wj = weights[j] / 100;
          const vi = vol60dArr[i] / 100;
          const vj = vol60dArr[j] / 100;
          marginal += wj * corrMatrix[i][j] * vi * vj;
        }
        // RC_i = w_i * marginal / pVol
        contributions.push(((weights[i] / 100) * marginal) / (pVol / 100));
      }

      // Normalize to sum to 100%
      const total = contributions.reduce((a, b) => a + b, 0);
      return total > 0
        ? contributions.map((c) => (c / total) * 100)
        : Array(N).fill(100 / N);
    }

    const ewRiskContribs = riskContributions(ewWeights);
    const rpRiskContribs = riskContributions(rpWeights);

    // Build asset results
    const assets: AssetResult[] = ASSETS.map((asset, i) => {
      const quote = quoteMap.get(asset.symbol);
      return {
        name: asset.name,
        symbol: asset.symbol,
        class: asset.class,
        price: quote?.price ?? 0,
        changePct: Math.round((quote?.changePct ?? 0) * 100) / 100,
        return20d: Math.round(return20dArr[i] * 100) / 100,
        return60d: Math.round(return60dArr[i] * 100) / 100,
        vol20d: Math.round(vol20dArr[i] * 100) / 100,
        vol60d: Math.round(vol60dArr[i] * 100) / 100,
        sharpe: Math.round(sharpeArr[i] * 100) / 100,
        riskParityWeight: Math.round(rpWeights[i] * 100) / 100,
        equalWeight: Math.round(equalWeight * 100) / 100,
        riskContribution: Math.round(ewRiskContribs[i] * 100) / 100,
        sparkline: sparklines[i],
      };
    });

    // Sort assets by risk parity weight descending
    assets.sort((a, b) => b.riskParityWeight - a.riskParityWeight);

    const riskBudget: RiskBudgetEntry[] = ASSETS.map((asset, i) => ({
      name: asset.name,
      equalWeightRisk: Math.round(ewRiskContribs[i] * 100) / 100,
      riskParityRisk: Math.round(rpRiskContribs[i] * 100) / 100,
    }));

    // Round correlation matrix
    const roundedCorr = corrMatrix.map((row) =>
      row.map((v) => Math.round(v * 100) / 100),
    );

    const result: RiskParityResponse = {
      timestamp: new Date().toISOString(),
      assets,
      portfolio: {
        riskParity: {
          vol: Math.round(rpVol * 100) / 100,
          expectedReturn: Math.round(rpReturn * 100) / 100,
          sharpe: Math.round(rpSharpe * 100) / 100,
        },
        equalWeight: {
          vol: Math.round(ewVol * 100) / 100,
          expectedReturn: Math.round(ewReturn * 100) / 100,
          sharpe: Math.round(ewSharpe * 100) / 100,
        },
      },
      correlationMatrix: {
        symbols: symbols,
        values: roundedCorr,
      },
      riskBudget,
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RiskParity] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch risk parity data' });
  }
});

export default router;
