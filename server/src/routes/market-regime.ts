import { Router } from 'express';
import { getHistory, getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface AssetConfig {
  symbol: string;
  name: string;
  category: 'equity' | 'bond' | 'commodity' | 'currency' | 'crypto';
  weight: number; // weight for overall regime scoring
}

type TrendState = 'Bull' | 'Bear' | 'Correction' | 'Recovery';
type Regime = 'RISK ON' | 'RISK OFF' | 'TRANSITION' | 'MIXED';

interface AssetRegime {
  symbol: string;
  name: string;
  price: number;
  trend: TrendState;
  trendStrength: number;
  rsi: number;
  volatility: number;
  sma20: number;
  sma50: number;
  sma200: number;
  returns: { '1w': number; '1m': number; '3m': number };
  category: string;
}

interface MarketRegimeData {
  regime: Regime;
  regimeScore: number;
  assets: AssetRegime[];
  updatedAt: string;
}

// ── Asset Configuration ──

const ASSETS: AssetConfig[] = [
  { symbol: '^GSPC', name: 'S&P 500', category: 'equity', weight: 20 },
  { symbol: '^IXIC', name: 'Nasdaq', category: 'equity', weight: 15 },
  { symbol: '^DJI', name: 'Dow Jones', category: 'equity', weight: 15 },
  { symbol: '^RUT', name: 'Russell 2000', category: 'equity', weight: 10 },
  { symbol: '^TNX', name: '10Y Yield', category: 'bond', weight: 8 },
  { symbol: 'TLT', name: 'Long Bonds', category: 'bond', weight: 7 },
  { symbol: 'GC=F', name: 'Gold', category: 'commodity', weight: 7 },
  { symbol: 'CL=F', name: 'Oil', category: 'commodity', weight: 6 },
  { symbol: 'DX-Y.NYB', name: 'Dollar Index', category: 'currency', weight: 7 },
  { symbol: 'BTC-USD', name: 'Bitcoin', category: 'crypto', weight: 5 },
];

// ── Technical Calculations ──

function calculateSMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50; // neutral default

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average gain/loss
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateRealizedVolatility(closes: number[], period: number = 20): number {
  if (closes.length < period + 1) return 0;

  const returns: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }

  if (returns.length < 2) return 0;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const dailyVol = Math.sqrt(variance);

  // Annualize (252 trading days)
  return dailyVol * Math.sqrt(252) * 100;
}

function determineTrend(price: number, sma50: number, sma200: number): TrendState {
  if (sma50 === 0 || sma200 === 0) return 'Recovery'; // not enough data

  if (price > sma50 && sma50 > sma200) return 'Bull';
  if (price < sma50 && sma50 < sma200) return 'Bear';
  if (price < sma50 && sma50 > sma200) return 'Correction';
  // price > sma50 && sma50 < sma200
  return 'Recovery';
}

function calculateReturn(closes: number[], daysBack: number): number {
  if (closes.length < daysBack + 1) return 0;
  const current = closes[closes.length - 1];
  const past = closes[closes.length - 1 - daysBack];
  if (!past || past === 0) return 0;
  return ((current - past) / past) * 100;
}

function trendToScore(trend: TrendState): number {
  switch (trend) {
    case 'Bull': return 100;
    case 'Recovery': return 65;
    case 'Correction': return 35;
    case 'Bear': return 0;
  }
}

function determineRegime(score: number): Regime {
  if (score >= 65) return 'RISK ON';
  if (score <= 35) return 'RISK OFF';
  if (score >= 45 && score <= 55) return 'MIXED';
  return 'TRANSITION';
}

// ── Cache ──

let cache: { data: MarketRegimeData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── Route ──

// GET /api/market-regime
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch current quotes for all assets
    const symbols = ASSETS.map((a) => a.symbol);
    const [quotes, ...histories] = await Promise.all([
      getQuotes(symbols),
      ...symbols.map((s) => getHistory(s, { range: '1y', interval: '1d' })),
    ]);

    // Build quote price map
    const quoteMap = new Map<string, number>();
    for (const q of quotes) {
      quoteMap.set(q.symbol, q.price);
    }

    const assets: AssetRegime[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    for (let i = 0; i < ASSETS.length; i++) {
      const config = ASSETS[i];
      const history = histories[i];

      // Extract valid closing prices
      const closes: number[] = [];
      for (const bar of history) {
        if (bar.close != null && bar.close > 0) {
          closes.push(bar.close);
        }
      }

      if (closes.length < 50) continue; // need at least 50 data points

      const currentPrice = quoteMap.get(config.symbol) ?? closes[closes.length - 1];
      const sma20 = calculateSMA(closes, 20);
      const sma50 = calculateSMA(closes, 50);
      const sma200 = calculateSMA(closes, 200);
      const rsi = calculateRSI(closes);
      const volatility = calculateRealizedVolatility(closes);
      const trend = determineTrend(currentPrice, sma50, sma200);

      // Trend strength: % distance from SMA200
      const trendStrength = sma200 > 0
        ? ((currentPrice - sma200) / sma200) * 100
        : 0;

      // Returns
      const returns = {
        '1w': calculateReturn(closes, 5),
        '1m': calculateReturn(closes, 21),
        '3m': calculateReturn(closes, 63),
      };

      assets.push({
        symbol: config.symbol,
        name: config.name,
        price: Math.round(currentPrice * 100) / 100,
        trend,
        trendStrength: Math.round(trendStrength * 10) / 10,
        rsi: Math.round(rsi * 10) / 10,
        volatility: Math.round(volatility * 10) / 10,
        sma20: Math.round(sma20 * 100) / 100,
        sma50: Math.round(sma50 * 100) / 100,
        sma200: Math.round(sma200 * 100) / 100,
        returns: {
          '1w': Math.round(returns['1w'] * 10) / 10,
          '1m': Math.round(returns['1m'] * 10) / 10,
          '3m': Math.round(returns['3m'] * 10) / 10,
        },
        category: config.category,
      });

      // Weighted score calculation
      // For bonds and dollar, inverse logic: bear trend in yields/dollar = risk on
      let assetScore = trendToScore(trend);
      if (config.symbol === '^TNX' || config.symbol === 'DX-Y.NYB') {
        // Rising yields and strong dollar can be bearish for risk assets
        // Invert the score contribution
        assetScore = 100 - assetScore;
      }

      weightedScore += assetScore * config.weight;
      totalWeight += config.weight;
    }

    const regimeScore = totalWeight > 0
      ? Math.round(weightedScore / totalWeight)
      : 50;

    const regime = determineRegime(regimeScore);

    const data: MarketRegimeData = {
      regime,
      regimeScore,
      assets,
      updatedAt: new Date().toISOString(),
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MarketRegime] Error fetching data:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch market regime data' });
  }
});

export default router;
