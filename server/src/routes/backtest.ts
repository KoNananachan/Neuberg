import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── Types ──

interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  holdingDays: number;
}

interface EquityPoint {
  date: string;
  value: number;
}

interface MonthlyReturn {
  month: string;
  return: number;
}

interface Metrics {
  totalReturn: number;
  annReturn: number;
  maxDrawdown: number;
  sharpe: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgHoldDays: number;
}

interface BuyHold {
  totalReturn: number;
  maxDrawdown: number;
  sharpe: number;
}

interface BacktestResult {
  symbol: string;
  strategy: string;
  params: Record<string, number>;
  trades: Trade[];
  metrics: Metrics;
  equity: EquityPoint[];
  buyHold: BuyHold;
  monthlyReturns: MonthlyReturn[];
}

// ── Validation ──

const STRATEGIES = ['sma-cross', 'rsi', 'macd', 'bollinger'] as const;

const requestSchema = z.object({
  symbol: z.string().min(1).max(10).transform((s) => s.toUpperCase()),
  strategy: z.enum(STRATEGIES),
  params: z.record(z.number()).default({}),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ── Cache ──

const cache = new Map<string, { data: BacktestResult; expiresAt: number }>();
const CACHE_TTL = 10 * 60_000; // 10 minutes
const MAX_CACHE_SIZE = 100;

// ── Yahoo Finance data fetch ──

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function fetchOHLCV(symbol: string, startDate: string, endDate: string): Promise<OHLCVBar[]> {
  const period1 = Math.floor(new Date(startDate).getTime() / 1000);
  const period2 = Math.floor(new Date(endDate).getTime() / 1000);
  const url = `${YAHOO_API}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

  const resp = await fetch(url, { headers: { 'User-Agent': YAHOO_UA } });
  if (!resp.ok) throw new Error(`Yahoo API returned ${resp.status}`);

  const data = (await resp.json()) as Record<string, unknown>;
  const chart = data?.chart as Record<string, unknown> | undefined;
  const results = (chart?.result as Array<Record<string, unknown>>) ?? [];
  const result = results[0];
  if (!result) return [];

  const timestamps = (result.timestamp as number[]) ?? [];
  const indicators = result.indicators as Record<string, unknown> | undefined;
  const quoteArr = (indicators?.quote as Array<Record<string, unknown>>) ?? [];
  const quotes = quoteArr[0] ?? {};
  const opens = (quotes.open as (number | null)[]) ?? [];
  const highs = (quotes.high as (number | null)[]) ?? [];
  const lows = (quotes.low as (number | null)[]) ?? [];
  const closes = (quotes.close as (number | null)[]) ?? [];
  const volumes = (quotes.volume as (number | null)[]) ?? [];

  const bars: OHLCVBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const v = volumes[i];
    if (o == null || h == null || l == null || c == null) continue;
    bars.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v ?? 0,
    });
  }
  return bars;
}

// ── Indicator calculations ──

function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      result.push(sum / period);
    }
  }
  return result;
}

function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (prev === null) {
      // First EMA value is SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      prev = sum / period;
      result.push(prev);
    } else {
      prev = data[i] * k + prev * (1 - k);
      result.push(prev);
    }
  }
  return result;
}

function computeRSI(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => null);
  }

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // First RSI uses SMA
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  result.push(null); // index 0 has no prior change
  for (let i = 0; i < period - 1; i++) result.push(null);
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return result;
}

function computeMACD(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
): { macd: (number | null)[]; signal: (number | null)[] } {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const f = fastEma[i];
    const s = slowEma[i];
    macdLine.push(f != null && s != null ? f - s : null);
  }

  // Compute signal line as EMA of MACD values
  const validMacd: number[] = [];
  const validIndices: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      validMacd.push(macdLine[i]!);
      validIndices.push(i);
    }
  }

  const signalEma = ema(validMacd, signalPeriod);
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < validIndices.length; i++) {
    signalLine[validIndices[i]] = signalEma[i];
  }

  return { macd: macdLine, signal: signalLine };
}

function computeBollinger(
  closes: number[],
  period: number,
  stdDevMult: number,
): { upper: (number | null)[]; lower: (number | null)[]; middle: (number | null)[] } {
  const middle = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    const m = middle[i];
    if (m == null || i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumSq += (closes[j] - m) ** 2;
      }
      const sd = Math.sqrt(sumSq / period);
      upper.push(m + stdDevMult * sd);
      lower.push(m - stdDevMult * sd);
    }
  }

  return { upper, lower, middle };
}

// ── Strategy signal generation ──

type Signal = 'buy' | 'sell' | null;

function generateSmaCrossSignals(bars: OHLCVBar[], params: Record<string, number>): Signal[] {
  const fast = params.fast ?? 20;
  const slow = params.slow ?? 50;
  const closes = bars.map((b) => b.close);
  const fastSma = sma(closes, fast);
  const slowSma = sma(closes, slow);

  const signals: Signal[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0 || fastSma[i] == null || slowSma[i] == null || fastSma[i - 1] == null || slowSma[i - 1] == null) {
      signals.push(null);
      continue;
    }
    const prevFast = fastSma[i - 1]!;
    const prevSlow = slowSma[i - 1]!;
    const curFast = fastSma[i]!;
    const curSlow = slowSma[i]!;

    if (prevFast <= prevSlow && curFast > curSlow) {
      signals.push('buy');
    } else if (prevFast >= prevSlow && curFast < curSlow) {
      signals.push('sell');
    } else {
      signals.push(null);
    }
  }
  return signals;
}

function generateRsiSignals(bars: OHLCVBar[], params: Record<string, number>): Signal[] {
  const period = params.period ?? 14;
  const oversold = params.oversold ?? 30;
  const overbought = params.overbought ?? 70;
  const closes = bars.map((b) => b.close);
  const rsiValues = computeRSI(closes, period);

  const signals: Signal[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0 || rsiValues[i] == null || rsiValues[i - 1] == null) {
      signals.push(null);
      continue;
    }
    const prevRsi = rsiValues[i - 1]!;
    const curRsi = rsiValues[i]!;

    if (prevRsi >= oversold && curRsi < oversold) {
      signals.push('buy');
    } else if (prevRsi <= overbought && curRsi > overbought) {
      signals.push('sell');
    } else {
      signals.push(null);
    }
  }
  return signals;
}

function generateMacdSignals(bars: OHLCVBar[], params: Record<string, number>): Signal[] {
  const fast = params.fast ?? 12;
  const slow = params.slow ?? 26;
  const signal = params.signal ?? 9;
  const closes = bars.map((b) => b.close);
  const { macd, signal: signalLine } = computeMACD(closes, fast, slow, signal);

  const signals: Signal[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0 || macd[i] == null || signalLine[i] == null || macd[i - 1] == null || signalLine[i - 1] == null) {
      signals.push(null);
      continue;
    }
    const prevMacd = macd[i - 1]!;
    const prevSignal = signalLine[i - 1]!;
    const curMacd = macd[i]!;
    const curSignal = signalLine[i]!;

    if (prevMacd <= prevSignal && curMacd > curSignal) {
      signals.push('buy');
    } else if (prevMacd >= prevSignal && curMacd < curSignal) {
      signals.push('sell');
    } else {
      signals.push(null);
    }
  }
  return signals;
}

function generateBollingerSignals(bars: OHLCVBar[], params: Record<string, number>): Signal[] {
  const period = params.period ?? 20;
  const stdDev = params.stdDev ?? 2;
  const closes = bars.map((b) => b.close);
  const { upper, lower } = computeBollinger(closes, period, stdDev);

  const signals: Signal[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (upper[i] == null || lower[i] == null) {
      signals.push(null);
      continue;
    }
    if (closes[i] <= lower[i]!) {
      signals.push('buy');
    } else if (closes[i] >= upper[i]!) {
      signals.push('sell');
    } else {
      signals.push(null);
    }
  }
  return signals;
}

const SIGNAL_GENERATORS: Record<string, (bars: OHLCVBar[], params: Record<string, number>) => Signal[]> = {
  'sma-cross': generateSmaCrossSignals,
  'rsi': generateRsiSignals,
  'macd': generateMacdSignals,
  'bollinger': generateBollingerSignals,
};

// ── Trade execution ──

function executeTrades(bars: OHLCVBar[], signals: Signal[]): Trade[] {
  const trades: Trade[] = [];
  let inPosition = false;
  let entryIdx = 0;

  for (let i = 0; i < bars.length; i++) {
    const sig = signals[i];
    if (!inPosition && sig === 'buy') {
      inPosition = true;
      entryIdx = i;
    } else if (inPosition && sig === 'sell') {
      const entry = bars[entryIdx];
      const exit = bars[i];
      const pnl = exit.close - entry.close;
      const pnlPct = (pnl / entry.close) * 100;
      const holdingDays = daysBetween(entry.date, exit.date);
      trades.push({
        entryDate: entry.date,
        entryPrice: round2(entry.close),
        exitDate: exit.date,
        exitPrice: round2(exit.close),
        pnl: round2(pnl),
        pnlPct: round2(pnlPct),
        holdingDays,
      });
      inPosition = false;
    }
  }

  // Close open position at last bar
  if (inPosition && bars.length > 0) {
    const entry = bars[entryIdx];
    const exit = bars[bars.length - 1];
    const pnl = exit.close - entry.close;
    const pnlPct = (pnl / entry.close) * 100;
    trades.push({
      entryDate: entry.date,
      entryPrice: round2(entry.close),
      exitDate: exit.date,
      exitPrice: round2(exit.close),
      pnl: round2(pnl),
      pnlPct: round2(pnlPct),
      holdingDays: daysBetween(entry.date, exit.date),
    });
  }

  return trades;
}

// ── Equity curve ──

function buildEquityCurve(bars: OHLCVBar[], trades: Trade[]): EquityPoint[] {
  const INITIAL = 10000;
  const equity: EquityPoint[] = [];
  let portfolioValue = INITIAL;
  let inTrade = false;
  let tradeIdx = 0;
  let entryPrice = 0;
  let shares = 0;

  for (const bar of bars) {
    // Check if we enter a new trade
    if (!inTrade && tradeIdx < trades.length && bar.date === trades[tradeIdx].entryDate) {
      inTrade = true;
      entryPrice = trades[tradeIdx].entryPrice;
      shares = portfolioValue / entryPrice;
    }

    if (inTrade) {
      portfolioValue = shares * bar.close;
    }

    // Check if we exit the current trade
    if (inTrade && tradeIdx < trades.length && bar.date === trades[tradeIdx].exitDate) {
      portfolioValue = shares * trades[tradeIdx].exitPrice;
      inTrade = false;
      tradeIdx++;
    }

    equity.push({ date: bar.date, value: round2(portfolioValue) });
  }

  return equity;
}

// ── Metrics calculation ──

function computeMetrics(trades: Trade[], equity: EquityPoint[], bars: OHLCVBar[]): Metrics {
  const totalTrades = trades.length;
  if (totalTrades === 0 || equity.length === 0) {
    return {
      totalReturn: 0,
      annReturn: 0,
      maxDrawdown: 0,
      sharpe: 0,
      winRate: 0,
      profitFactor: 0,
      totalTrades: 0,
      avgHoldDays: 0,
    };
  }

  const initialValue = equity[0].value;
  const finalValue = equity[equity.length - 1].value;
  const totalReturn = ((finalValue - initialValue) / initialValue) * 100;

  // Annualized return
  const totalDays = daysBetween(bars[0].date, bars[bars.length - 1].date);
  const years = totalDays / 365.25;
  const annReturn = years > 0 ? (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100 : 0;

  // Max drawdown
  let peak = -Infinity;
  let maxDD = 0;
  for (const pt of equity) {
    if (pt.value > peak) peak = pt.value;
    const dd = ((pt.value - peak) / peak) * 100;
    if (dd < maxDD) maxDD = dd;
  }

  // Sharpe ratio (daily returns)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1].value > 0) {
      dailyReturns.push((equity[i].value - equity[i - 1].value) / equity[i - 1].value);
    }
  }
  const avgDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const dailyStd = stdDev(dailyReturns);
  const sharpe = dailyStd > 0 ? (avgDailyReturn / dailyStd) * Math.sqrt(252) : 0;

  // Win rate
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = (wins / totalTrades) * 100;

  // Profit factor
  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Avg holding days
  const avgHoldDays = trades.reduce((s, t) => s + t.holdingDays, 0) / totalTrades;

  return {
    totalReturn: round2(totalReturn),
    annReturn: round2(annReturn),
    maxDrawdown: round2(maxDD),
    sharpe: round2(sharpe),
    winRate: round2(winRate),
    profitFactor: round2(profitFactor),
    totalTrades,
    avgHoldDays: Math.round(avgHoldDays),
  };
}

function computeBuyHold(bars: OHLCVBar[]): BuyHold {
  if (bars.length < 2) return { totalReturn: 0, maxDrawdown: 0, sharpe: 0 };

  const firstClose = bars[0].close;
  const lastClose = bars[bars.length - 1].close;
  const totalReturn = ((lastClose - firstClose) / firstClose) * 100;

  // Max drawdown
  let peak = -Infinity;
  let maxDD = 0;
  for (const bar of bars) {
    if (bar.close > peak) peak = bar.close;
    const dd = ((bar.close - peak) / peak) * 100;
    if (dd < maxDD) maxDD = dd;
  }

  // Sharpe
  const dailyReturns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].close > 0) {
      dailyReturns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }
  }
  const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const sd = stdDev(dailyReturns);
  const sharpe = sd > 0 ? (avgReturn / sd) * Math.sqrt(252) : 0;

  return {
    totalReturn: round2(totalReturn),
    maxDrawdown: round2(maxDD),
    sharpe: round2(sharpe),
  };
}

function computeMonthlyReturns(equity: EquityPoint[]): MonthlyReturn[] {
  if (equity.length < 2) return [];

  const monthlyMap = new Map<string, { first: number; last: number }>();
  for (const pt of equity) {
    const month = pt.date.slice(0, 7); // YYYY-MM
    const entry = monthlyMap.get(month);
    if (!entry) {
      monthlyMap.set(month, { first: pt.value, last: pt.value });
    } else {
      entry.last = pt.value;
    }
  }

  const results: MonthlyReturn[] = [];
  let prevValue: number | null = null;
  for (const [month, { first, last }] of monthlyMap) {
    const base = prevValue ?? first;
    const ret = base > 0 ? ((last - base) / base) * 100 : 0;
    results.push({ month, return: round2(ret) });
    prevValue = last;
  }

  return results;
}

// ── Utility ──

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ── Route ──

router.post('/', async (req, res) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(', ') });
    }

    const { symbol, strategy, params, startDate, endDate } = parsed.data;

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }
    const maxRange = 10 * 365 * 86_400_000; // 10 years
    if (end.getTime() - start.getTime() > maxRange) {
      return res.status(400).json({ error: 'Date range exceeds 10 years maximum' });
    }

    // Check cache
    const cacheKey = JSON.stringify({ symbol, strategy, params, startDate, endDate });
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    // Fetch data
    const bars = await fetchOHLCV(symbol, startDate, endDate);
    if (bars.length < 30) {
      return res.status(404).json({ error: 'Insufficient price data for backtesting' });
    }

    // Generate signals
    const generator = SIGNAL_GENERATORS[strategy];
    if (!generator) {
      return res.status(400).json({ error: 'Unknown strategy' });
    }
    const signals = generator(bars, params);

    // Execute trades
    const trades = executeTrades(bars, signals);

    // Build equity curve
    const equity = buildEquityCurve(bars, trades);

    // Compute results
    const metrics = computeMetrics(trades, equity, bars);
    const buyHold = computeBuyHold(bars);
    const monthlyReturns = computeMonthlyReturns(equity);

    const result: BacktestResult = {
      symbol,
      strategy,
      params,
      trades,
      metrics,
      equity,
      buyHold,
      monthlyReturns,
    };

    // Cache result
    cache.set(cacheKey, { data: result, expiresAt: now + CACHE_TTL });

    // Evict old entries
    if (cache.size > MAX_CACHE_SIZE) {
      for (const [key, val] of cache) {
        if (now > val.expiresAt) cache.delete(key);
      }
    }

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Backtest] Error:', message);
    res.status(500).json({ error: 'Failed to run backtest' });
  }
});

export default router;
