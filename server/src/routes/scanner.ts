import { Router } from 'express';
import { getHistory, getQuote } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Top US stocks to scan for technical signals
const SCAN_UNIVERSE = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'UNH', 'LLY',
  'JPM', 'V', 'XOM', 'AVGO', 'MA', 'JNJ', 'PG', 'HD', 'COST', 'MRK',
  'ABBV', 'AMD', 'CRM', 'NFLX', 'CVX', 'KO', 'PEP', 'ADBE', 'WMT', 'BAC',
  'TMO', 'CSCO', 'MCD', 'ACN', 'ORCL', 'LIN', 'ABT', 'DHR', 'INTC', 'DIS',
  'PM', 'CMCSA', 'NKE', 'TXN', 'VZ', 'WFC', 'NEE', 'RTX', 'QCOM', 'AMGN',
];

type SignalType = 'golden_cross' | 'death_cross' | 'rsi_overbought' | 'rsi_oversold'
  | 'volume_breakout' | 'near_52w_high' | 'near_52w_low' | 'macd_bullish' | 'macd_bearish';

interface TechSignal {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  signal: SignalType;
  value: number; // signal-specific value (e.g., RSI value, volume ratio)
  description: string;
}

// Cache for 5 minutes
let scanCache: { data: TechSignal[]; expiresAt: number } = { data: [], expiresAt: 0 };
const CACHE_TTL = 300_000;

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

function calcEMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let ema = prices[0];
  result.push(ema);
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function detectSignals(
  symbol: string,
  name: string,
  closes: number[],
  volumes: number[],
  currentPrice: number,
  changePercent: number,
): TechSignal[] {
  const signals: TechSignal[] = [];
  if (closes.length < 201) return signals;

  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  const rsi = calcRSI(closes, 14);
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);

  const last = closes.length - 1;
  const prev = last - 1;

  // Golden Cross: SMA50 crosses above SMA200
  if (!isNaN(sma50[last]) && !isNaN(sma200[last]) && !isNaN(sma50[prev]) && !isNaN(sma200[prev])) {
    if (sma50[prev] <= sma200[prev] && sma50[last] > sma200[last]) {
      signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'golden_cross', value: sma50[last], description: 'SMA50 crossed above SMA200' });
    }
    // Death Cross
    if (sma50[prev] >= sma200[prev] && sma50[last] < sma200[last]) {
      signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'death_cross', value: sma50[last], description: 'SMA50 crossed below SMA200' });
    }
  }

  // RSI signals
  const rsiVal = rsi[last];
  if (!isNaN(rsiVal)) {
    if (rsiVal > 70) {
      signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'rsi_overbought', value: rsiVal, description: `RSI at ${rsiVal.toFixed(1)} (overbought)` });
    } else if (rsiVal < 30) {
      signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'rsi_oversold', value: rsiVal, description: `RSI at ${rsiVal.toFixed(1)} (oversold)` });
    }
  }

  // MACD crossover
  const macd = ema12[last] - ema26[last];
  const macdPrev = ema12[prev] - ema26[prev];
  if (macdPrev <= 0 && macd > 0) {
    signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'macd_bullish', value: macd, description: 'MACD crossed above signal' });
  } else if (macdPrev >= 0 && macd < 0) {
    signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'macd_bearish', value: macd, description: 'MACD crossed below signal' });
  }

  // Volume breakout: today's volume > 2x 20-day avg
  if (volumes.length >= 20) {
    const recentVols = volumes.slice(-20);
    const avgVol = recentVols.reduce((a, b) => a + b, 0) / 20;
    const todayVol = volumes[last];
    if (avgVol > 0 && todayVol > avgVol * 2) {
      signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'volume_breakout', value: todayVol / avgVol, description: `Volume ${(todayVol / avgVol).toFixed(1)}x above average` });
    }
  }

  // 52-week high/low proximity
  const yearCloses = closes.slice(-252);
  const high52 = Math.max(...yearCloses);
  const low52 = Math.min(...yearCloses);
  if (currentPrice >= high52 * 0.98) {
    signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'near_52w_high', value: (currentPrice / high52) * 100, description: `Within 2% of 52-week high ($${high52.toFixed(2)})` });
  }
  if (currentPrice <= low52 * 1.02) {
    signals.push({ symbol, name, price: currentPrice, changePercent, signal: 'near_52w_low', value: (currentPrice / low52) * 100, description: `Within 2% of 52-week low ($${low52.toFixed(2)})` });
  }

  return signals;
}

async function scanSymbol(symbol: string): Promise<TechSignal[]> {
  try {
    const [history, quote] = await Promise.all([
      getHistory(symbol, { range: '1y', interval: '1d' }),
      getQuote(symbol),
    ]);

    if (!history || history.length < 201 || !quote) return [];

    const closes = history.map((h: any) => h.close).filter((c: any): c is number => c != null);
    const volumes = history.map((h: any) => h.volume).filter((v: any): v is number => v != null);

    return detectSignals(
      symbol,
      quote.name || symbol,
      closes,
      volumes,
      quote.price ?? 0,
      quote.changePercent ?? 0,
    );
  } catch {
    return [];
  }
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (scanCache.data.length > 0 && now < scanCache.expiresAt) {
      return res.json(scanCache.data);
    }

    // Scan in batches of 10 to avoid overwhelming Yahoo
    const allSignals: TechSignal[] = [];
    for (let i = 0; i < SCAN_UNIVERSE.length; i += 10) {
      const batch = SCAN_UNIVERSE.slice(i, i + 10);
      const results = await Promise.allSettled(batch.map(scanSymbol));
      for (const r of results) {
        if (r.status === 'fulfilled') allSignals.push(...r.value);
      }
    }

    // Sort: most notable signals first (crosses > RSI > MACD > volume > 52w)
    const priority: Record<SignalType, number> = {
      golden_cross: 1, death_cross: 1,
      rsi_oversold: 2, rsi_overbought: 2,
      macd_bullish: 3, macd_bearish: 3,
      volume_breakout: 4,
      near_52w_high: 5, near_52w_low: 5,
    };
    allSignals.sort((a, b) => (priority[a.signal] ?? 9) - (priority[b.signal] ?? 9));

    scanCache = { data: allSignals, expiresAt: now + CACHE_TTL };
    res.json(allSignals);
  } catch (err: any) {
    console.error('[Scanner] Error:', err?.message || err);
    if (scanCache.data.length > 0) return res.json(scanCache.data);
    res.status(500).json({ error: 'Failed to run technical scan' });
  }
});

export default router;
