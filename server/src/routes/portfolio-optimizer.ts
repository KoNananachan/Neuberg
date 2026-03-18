import { Router } from 'express';
import { getHistory, getQuote } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface AssetInfo {
  symbol: string;
  name: string;
  annReturn: number;
  annVol: number;
  sharpe: number;
}

interface PortfolioPoint {
  return: number;
  volatility: number;
  sharpe: number;
  weights: number[];
}

interface OptimalPortfolios {
  minVariance: PortfolioPoint;
  maxSharpe: PortfolioPoint;
  equalWeight: PortfolioPoint;
  riskParity: PortfolioPoint;
}

interface PortfolioOptimizerResult {
  symbols: string[];
  assets: AssetInfo[];
  correlation: number[][];
  frontier: PortfolioPoint[];
  optimal: OptimalPortfolios;
  riskFreeRate: number;
}

// ── Cache ──

const cache = new Map<string, { data: PortfolioOptimizerResult; expiresAt: number }>();
const CACHE_TTL = 15 * 60_000;

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
const MAX_SYMBOLS = 15;
const MONTE_CARLO_ITERATIONS = 5000;
const FRONTIER_POINTS = 50;
const TRADING_DAYS = 252;

// ── Math helpers ──

function computeLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return returns;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const mA = mean(a.slice(0, n));
  const mB = mean(b.slice(0, n));
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - mA) * (b[i] - mB);
  }
  return cov / (n - 1);
}

function buildCovarianceMatrix(allReturns: number[][]): number[][] {
  const n = allReturns.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const cov = covariance(allReturns[i], allReturns[j]);
      // Annualize
      const annCov = cov * TRADING_DAYS;
      matrix[i][j] = annCov;
      matrix[j][i] = annCov;
    }
  }
  return matrix;
}

function buildCorrelationMatrix(allReturns: number[][]): number[][] {
  const n = allReturns.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const minLen = Math.min(allReturns[i].length, allReturns[j].length);
      if (minLen < 2) { matrix[i][j] = 0; matrix[j][i] = 0; continue; }
      const a = allReturns[i].slice(0, minLen);
      const b = allReturns[j].slice(0, minLen);
      const mA = mean(a);
      const mB = mean(b);
      let cov = 0, varA = 0, varB = 0;
      for (let k = 0; k < minLen; k++) {
        const dA = a[k] - mA;
        const dB = b[k] - mB;
        cov += dA * dB;
        varA += dA * dA;
        varB += dB * dB;
      }
      const denom = Math.sqrt(varA * varB);
      const corr = denom > 0 ? cov / denom : 0;
      matrix[i][j] = Math.round(corr * 1000) / 1000;
      matrix[j][i] = matrix[i][j];
    }
  }
  return matrix;
}

function portfolioReturn(weights: number[], meanReturns: number[]): number {
  let r = 0;
  for (let i = 0; i < weights.length; i++) {
    r += weights[i] * meanReturns[i];
  }
  return r;
}

function portfolioVolatility(weights: number[], covMatrix: number[][]): number {
  const n = weights.length;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return Math.sqrt(Math.max(variance, 0));
}

function randomWeights(n: number): number[] {
  const raw = Array.from({ length: n }, () => -Math.log(Math.random()));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(v => v / sum);
}

function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 1 / weights.length);
  return weights.map(w => Math.round((w / sum) * 10000) / 10000);
}

// ── Portfolio optimization ──

function runMonteCarloSimulation(
  meanReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number,
  iterations: number,
): PortfolioPoint[] {
  const n = meanReturns.length;
  const results: PortfolioPoint[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    const weights = randomWeights(n);
    const ret = portfolioReturn(weights, meanReturns);
    const vol = portfolioVolatility(weights, covMatrix);
    const sharpe = vol > 0 ? (ret - riskFreeRate) / vol : 0;

    results.push({
      return: Math.round(ret * 10000) / 10000,
      volatility: Math.round(vol * 10000) / 10000,
      sharpe: Math.round(sharpe * 10000) / 10000,
      weights: weights.map(w => Math.round(w * 10000) / 10000),
    });
  }

  return results;
}

function findMinVariancePortfolio(simulations: PortfolioPoint[]): PortfolioPoint {
  let best = simulations[0];
  for (const p of simulations) {
    if (p.volatility < best.volatility) best = p;
  }
  return best;
}

function findMaxSharpePortfolio(simulations: PortfolioPoint[]): PortfolioPoint {
  let best = simulations[0];
  for (const p of simulations) {
    if (p.sharpe > best.sharpe) best = p;
  }
  return best;
}

function computeEqualWeightPortfolio(
  meanReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number,
): PortfolioPoint {
  const n = meanReturns.length;
  const weights = new Array(n).fill(1 / n);
  const ret = portfolioReturn(weights, meanReturns);
  const vol = portfolioVolatility(weights, covMatrix);
  const sharpe = vol > 0 ? (ret - riskFreeRate) / vol : 0;

  return {
    return: Math.round(ret * 10000) / 10000,
    volatility: Math.round(vol * 10000) / 10000,
    sharpe: Math.round(sharpe * 10000) / 10000,
    weights: weights.map(w => Math.round(w * 10000) / 10000),
  };
}

function computeRiskParityPortfolio(
  meanReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number,
): PortfolioPoint {
  const n = meanReturns.length;

  // Individual asset volatilities
  const assetVols = Array.from({ length: n }, (_, i) => Math.sqrt(Math.max(covMatrix[i][i], 0)));

  // Inverse volatility weighting (simple risk parity approximation)
  const invVols = assetVols.map(v => (v > 0 ? 1 / v : 0));
  const sumInvVol = invVols.reduce((a, b) => a + b, 0);
  let weights = sumInvVol > 0
    ? invVols.map(iv => iv / sumInvVol)
    : new Array(n).fill(1 / n);

  // Iterative refinement: adjust weights so each asset's risk contribution is equal
  for (let iter = 0; iter < 50; iter++) {
    const totalVol = portfolioVolatility(weights, covMatrix);
    if (totalVol === 0) break;

    // Marginal risk contribution for each asset
    const mrc: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += weights[j] * covMatrix[i][j];
      }
      mrc[i] = sum / totalVol;
    }

    // Risk contribution
    const rc = weights.map((w, i) => w * mrc[i]);
    const targetRC = totalVol / n;

    // Adjust weights
    const newWeights = weights.map((w, i) => {
      if (rc[i] === 0) return w;
      const adjustment = targetRC / rc[i];
      return w * Math.pow(adjustment, 0.3); // Damped adjustment
    });

    weights = normalizeWeights(newWeights);
  }

  const ret = portfolioReturn(weights, meanReturns);
  const vol = portfolioVolatility(weights, covMatrix);
  const sharpe = vol > 0 ? (ret - riskFreeRate) / vol : 0;

  return {
    return: Math.round(ret * 10000) / 10000,
    volatility: Math.round(vol * 10000) / 10000,
    sharpe: Math.round(sharpe * 10000) / 10000,
    weights: weights.map(w => Math.round(w * 10000) / 10000),
  };
}

function extractEfficientFrontier(simulations: PortfolioPoint[], numPoints: number): PortfolioPoint[] {
  if (simulations.length === 0) return [];

  // Sort by volatility
  const sorted = [...simulations].sort((a, b) => a.volatility - b.volatility);

  const minVol = sorted[0].volatility;
  const maxVol = sorted[sorted.length - 1].volatility;
  const step = (maxVol - minVol) / numPoints;

  const frontier: PortfolioPoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const volLow = minVol + i * step;
    const volHigh = volLow + step;

    // Find the portfolio with the highest return in this volatility bucket
    let bestInBucket: PortfolioPoint | null = null;
    for (const p of sorted) {
      if (p.volatility >= volLow && p.volatility < volHigh) {
        if (!bestInBucket || p.return > bestInBucket.return) {
          bestInBucket = p;
        }
      }
    }
    if (bestInBucket) {
      frontier.push(bestInBucket);
    }
  }

  return frontier;
}

// ── Route ──

router.get('/', async (req, res) => {
  try {
    const symbolsParam = (req.query.symbols as string) || DEFAULT_SYMBOLS.join(',');
    const symbols = symbolsParam
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, MAX_SYMBOLS);

    if (symbols.length < 2) {
      res.status(400).json({ error: 'At least 2 symbols are required' });
      return;
    }

    const riskFreeRate = Math.min(
      Math.max(parseFloat(req.query.riskFree as string) || 0.05, 0),
      0.20,
    );

    // Cache key
    const cacheKey = `opt:${symbols.sort().join(',')}:${riskFreeRate}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      res.json(cached.data);
      return;
    }

    // Fetch 2 years of daily data for all symbols
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const [histories, quotes] = await Promise.all([
      Promise.all(symbols.map(sym => getHistory(sym, { range: '2y', interval: '1d' }))),
      Promise.all(symbols.map(sym => getQuote(sym))),
    ]);

    // Extract valid closing prices
    const allPrices: number[][] = histories.map(history =>
      history
        .filter(bar => bar.close != null && bar.close > 0)
        .map(bar => bar.close as number),
    );

    // Verify we have sufficient data for each symbol
    const validIndices: number[] = [];
    const validSymbols: string[] = [];
    const validPrices: number[][] = [];
    for (let i = 0; i < symbols.length; i++) {
      if (allPrices[i].length >= 60) { // at least ~3 months of data
        validIndices.push(i);
        validSymbols.push(symbols[i]);
        validPrices.push(allPrices[i]);
      }
    }

    if (validSymbols.length < 2) {
      res.status(400).json({ error: 'Insufficient price data for optimization. Need at least 2 symbols with 60+ trading days.' });
      return;
    }

    // Compute log returns
    const allReturns = validPrices.map(computeLogReturns);

    // Align returns to the same length (min length across all)
    const minLen = Math.min(...allReturns.map(r => r.length));
    const alignedReturns = allReturns.map(r => r.slice(r.length - minLen));

    // Annualized return and volatility for each asset
    const annReturns = alignedReturns.map(r => mean(r) * TRADING_DAYS);
    const annVols = alignedReturns.map(r => stddev(r) * Math.sqrt(TRADING_DAYS));

    // Build asset info
    const assets: AssetInfo[] = validSymbols.map((sym, i) => ({
      symbol: sym,
      name: quotes[validIndices[i]]?.name || sym,
      annReturn: Math.round(annReturns[i] * 10000) / 10000,
      annVol: Math.round(annVols[i] * 10000) / 10000,
      sharpe: annVols[i] > 0
        ? Math.round(((annReturns[i] - riskFreeRate) / annVols[i]) * 10000) / 10000
        : 0,
    }));

    // Correlation matrix
    const correlation = buildCorrelationMatrix(alignedReturns);

    // Covariance matrix (annualized)
    const covMatrix = buildCovarianceMatrix(alignedReturns);

    // Monte Carlo simulation
    const simulations = runMonteCarloSimulation(annReturns, covMatrix, riskFreeRate, MONTE_CARLO_ITERATIONS);

    // Extract efficient frontier
    const frontier = extractEfficientFrontier(simulations, FRONTIER_POINTS);

    // Optimal portfolios
    const minVariance = findMinVariancePortfolio(simulations);
    const maxSharpe = findMaxSharpePortfolio(simulations);
    const equalWeight = computeEqualWeightPortfolio(annReturns, covMatrix, riskFreeRate);
    const riskParity = computeRiskParityPortfolio(annReturns, covMatrix, riskFreeRate);

    const result: PortfolioOptimizerResult = {
      symbols: validSymbols,
      assets,
      correlation,
      frontier,
      optimal: { minVariance, maxSharpe, equalWeight, riskParity },
      riskFreeRate,
    };

    cache.set(cacheKey, { data: result, expiresAt: now + CACHE_TTL });

    // Evict expired entries
    if (cache.size > 100) {
      for (const [key, val] of cache) {
        if (now > val.expiresAt) cache.delete(key);
      }
    }

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PortfolioOptimizer] Error:', message);
    res.status(500).json({ error: 'Failed to compute portfolio optimization' });
  }
});

export default router;
