import { Router } from 'express';
import { getHistory, getQuote } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Default scan universe: top 30 S&P 500 stocks
const DEFAULT_SYMBOLS = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'UNH', 'LLY',
  'JPM', 'V', 'XOM', 'AVGO', 'MA', 'JNJ', 'PG', 'HD', 'COST', 'MRK',
  'ABBV', 'AMD', 'CRM', 'NFLX', 'CVX', 'KO', 'PEP', 'ADBE', 'WMT', 'BAC',
];

// ── Types ──

type SignalDirection = 'bullish' | 'bearish' | 'neutral';

interface Signal {
  value: number | boolean;
  label: string;
  direction: SignalDirection;
}

interface ConfluenceResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  confluenceScore: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  bullishSignals: number;
  bearishSignals: number;
  signals: {
    smaCross: Signal;
    emaCross: Signal;
    rsi: Signal;
    macd: Signal;
    bollingerBands: Signal;
    volume: Signal;
    priceSma200: Signal;
    stochastic: Signal;
  };
}

interface ConfluenceResponse {
  results: ConfluenceResult[];
  timestamp: string;
}

// ── In-memory cache with 5-minute TTL ──

let cache: { data: ConfluenceResponse; expiresAt: number } = {
  data: { results: [], timestamp: '' },
  expiresAt: 0,
};
const CACHE_TTL = 300_000; // 5 minutes

// Per-symbol cache for custom queries
const symbolCache = new Map<string, { data: ConfluenceResult; expiresAt: number }>();

// ── Technical indicator calculations ──

function calcSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j];
    result.push(sum / period);
  }
  return result;
}

function calcEMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  if (prices.length === 0) return result;
  const k = 2 / (period + 1);
  let ema = prices[0];
  result.push(ema);
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(prices: number[], period = 14): number[] {
  const result: number[] = new Array(prices.length).fill(NaN);
  if (prices.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

function calcMACD(prices: number[]): { macd: number[]; signal: number[] } {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  const signalLine = calcEMA(macdLine, 9);
  return { macd: macdLine, signal: signalLine };
}

function calcBollingerBands(prices: number[], period = 20, stdDev = 2): {
  upper: number[];
  lower: number[];
  middle: number[];
} {
  const middle = calcSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, p) => sum + (p - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + stdDev * sd);
    lower.push(mean - stdDev * sd);
  }

  return { upper, lower, middle };
}

function calcStochastic(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);
    const highest = Math.max(...highSlice);
    const lowest = Math.min(...lowSlice);
    const range = highest - lowest;
    result.push(range === 0 ? 50 : ((closes[i] - lowest) / range) * 100);
  }
  return result;
}

// ── Compute confluence signals for a single stock ──

function computeConfluence(
  symbol: string,
  name: string,
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  currentPrice: number,
  change: number,
  changePct: number,
): ConfluenceResult | null {
  if (closes.length < 201) return null;

  const last = closes.length - 1;

  // SMA Cross: SMA20 vs SMA50
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const smaCrossDir: SignalDirection =
    isNaN(sma20[last]) || isNaN(sma50[last]) ? 'neutral'
      : sma20[last] > sma50[last] ? 'bullish' : 'bearish';

  // EMA Cross: EMA12 vs EMA26
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const emaCrossDir: SignalDirection = ema12[last] > ema26[last] ? 'bullish' : 'bearish';

  // RSI(14)
  const rsi = calcRSI(closes, 14);
  const rsiVal = rsi[last];
  const rsiDir: SignalDirection =
    isNaN(rsiVal) ? 'neutral'
      : rsiVal > 70 ? 'bearish'  // overbought = bearish signal
      : rsiVal < 30 ? 'bullish'  // oversold = bullish signal
      : 'neutral';

  // MACD
  const { macd: macdLine, signal: signalLine } = calcMACD(closes);
  const macdVal = macdLine[last] - signalLine[last];
  const macdDir: SignalDirection = macdLine[last] > signalLine[last] ? 'bullish' : 'bearish';

  // Bollinger Bands
  const bb = calcBollingerBands(closes, 20, 2);
  const bbRange = isNaN(bb.upper[last]) || isNaN(bb.lower[last])
    ? 0
    : bb.upper[last] - bb.lower[last];
  const bbPos = bbRange > 0
    ? (currentPrice - bb.lower[last]) / bbRange
    : 0.5;
  const bbDir: SignalDirection =
    isNaN(bb.upper[last]) ? 'neutral'
      : bbPos > 0.8 ? 'bearish'   // near upper band = overbought
      : bbPos < 0.2 ? 'bullish'   // near lower band = oversold
      : 'neutral';

  // Volume: current volume vs 20-day average
  const recentVols = volumes.slice(-20);
  const avgVol = recentVols.length > 0
    ? recentVols.reduce((a, b) => a + b, 0) / recentVols.length
    : 0;
  const todayVol = volumes[last] ?? 0;
  const volRatio = avgVol > 0 ? todayVol / avgVol : 1;
  // High volume confirms the prevailing price direction
  const priceUp = currentPrice >= (closes[last - 1] ?? currentPrice);
  const volumeDir: SignalDirection =
    volRatio > 1.5
      ? (priceUp ? 'bullish' : 'bearish')
      : 'neutral';

  // Price vs SMA200
  const sma200 = calcSMA(closes, 200);
  const sma200Dir: SignalDirection =
    isNaN(sma200[last]) ? 'neutral'
      : currentPrice > sma200[last] ? 'bullish' : 'bearish';

  // Stochastic %K
  const stoch = calcStochastic(highs, lows, closes, 14);
  const stochVal = stoch[last];
  const stochDir: SignalDirection =
    isNaN(stochVal) ? 'neutral'
      : stochVal > 80 ? 'bearish'  // overbought
      : stochVal < 20 ? 'bullish'  // oversold
      : 'neutral';

  // Build signals object
  const signals = {
    smaCross: { value: sma20[last] > sma50[last], label: 'SMA 20/50', direction: smaCrossDir },
    emaCross: { value: ema12[last] > ema26[last], label: 'EMA 12/26', direction: emaCrossDir },
    rsi: { value: isNaN(rsiVal) ? 50 : Math.round(rsiVal * 10) / 10, label: 'RSI(14)', direction: rsiDir },
    macd: { value: Math.round(macdVal * 1000) / 1000, label: 'MACD', direction: macdDir },
    bollingerBands: { value: Math.round(bbPos * 100) / 100, label: 'Bollinger', direction: bbDir },
    volume: { value: Math.round(volRatio * 100) / 100, label: 'Volume', direction: volumeDir },
    priceSma200: { value: currentPrice > (sma200[last] ?? 0), label: 'SMA 200', direction: sma200Dir },
    stochastic: { value: isNaN(stochVal) ? 50 : Math.round(stochVal * 10) / 10, label: 'Stoch %K', direction: stochDir },
  };

  // Calculate confluence score
  const allSignals = Object.values(signals);
  let bullishCount = 0;
  let bearishCount = 0;
  for (const sig of allSignals) {
    if (sig.direction === 'bullish') bullishCount++;
    if (sig.direction === 'bearish') bearishCount++;
  }

  // Score: (sum + 8) / 16 * 10 where sum = bullish - bearish
  const sum = bullishCount - bearishCount;
  const confluenceScore = Math.round(((sum + 8) / 16) * 100) / 10; // normalized to 0-10

  const direction: 'bullish' | 'bearish' | 'neutral' =
    confluenceScore >= 6 ? 'bullish'
      : confluenceScore <= 4 ? 'bearish'
      : 'neutral';

  return {
    symbol,
    name,
    price: Math.round(currentPrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    confluenceScore,
    direction,
    bullishSignals: bullishCount,
    bearishSignals: bearishCount,
    signals,
  };
}

// ── Fetch data and compute confluence for a single symbol ──

async function analyzeSymbol(symbol: string): Promise<ConfluenceResult | null> {
  // Check per-symbol cache
  const cached = symbolCache.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const [history, quote] = await Promise.all([
      getHistory(symbol, { range: '1y', interval: '1d' }),
      getQuote(symbol),
    ]);

    if (!history || history.length < 201 || !quote) return null;

    const closes = history.map((h: Record<string, unknown>) => h.close as number).filter((c): c is number => c != null);
    const highs = history.map((h: Record<string, unknown>) => h.high as number).filter((h): h is number => h != null);
    const lows = history.map((h: Record<string, unknown>) => h.low as number).filter((l): l is number => l != null);
    const volumes = history.map((h: Record<string, unknown>) => h.volume as number).filter((v): v is number => v != null);

    if (closes.length < 201 || highs.length < 201 || lows.length < 201) return null;

    const result = computeConfluence(
      symbol,
      quote.name || symbol,
      closes,
      highs,
      lows,
      volumes,
      quote.price ?? 0,
      quote.change ?? 0,
      quote.changePercent ?? 0,
    );

    if (result) {
      symbolCache.set(symbol, { data: result, expiresAt: Date.now() + CACHE_TTL });
    }

    return result;
  } catch (err) {
    console.error(`[Confluence] Error analyzing ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Route handler ──

router.get('/', async (req, res) => {
  try {
    const symbolsParam = typeof req.query.symbols === 'string' ? req.query.symbols.trim() : '';
    const requestedSymbols = symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50)
      : DEFAULT_SYMBOLS;

    const isDefaultRequest = !symbolsParam;

    // Check cache for default request
    if (isDefaultRequest && cache.data.results.length > 0 && Date.now() < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Scan in batches of 10 to avoid overwhelming Yahoo
    const results: ConfluenceResult[] = [];
    for (let i = 0; i < requestedSymbols.length; i += 10) {
      const batch = requestedSymbols.slice(i, i + 10);
      const batchResults = await Promise.allSettled(batch.map(analyzeSymbol));
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }
    }

    // Sort by absolute conviction (distance from 5.0 = neutral)
    results.sort((a, b) => Math.abs(b.confluenceScore - 5) - Math.abs(a.confluenceScore - 5));

    const response: ConfluenceResponse = {
      results,
      timestamp: new Date().toISOString(),
    };

    // Cache default request
    if (isDefaultRequest) {
      cache = { data: response, expiresAt: Date.now() + CACHE_TTL };
    }

    res.json(response);
  } catch (err) {
    console.error('[Confluence] Error:', err instanceof Error ? err.message : err);
    if (cache.data.results.length > 0) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to run confluence scan' });
  }
});

export default router;
