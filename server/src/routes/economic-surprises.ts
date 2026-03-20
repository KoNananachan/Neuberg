import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Symbols & Metadata ──

interface SymbolMeta {
  symbol: string;
  name: string;
  category: 'growth' | 'inflation' | 'sentiment';
  growthWeight: number;
  inflationWeight: number;
  invertSignal: boolean; // true = higher value means negative surprise (e.g., VIX, Gold, DXY)
}

const SYMBOLS: SymbolMeta[] = [
  { symbol: '^GSPC', name: 'S&P 500', category: 'growth', growthWeight: 0.20, inflationWeight: 0, invertSignal: false },
  { symbol: '^TNX', name: '10Y Yield', category: 'inflation', growthWeight: 0.05, inflationWeight: 0.25, invertSignal: false },
  { symbol: 'HYG', name: 'High Yield', category: 'growth', growthWeight: 0.15, inflationWeight: 0, invertSignal: false },
  { symbol: 'TIP', name: 'TIPS ETF', category: 'inflation', growthWeight: 0, inflationWeight: 0.25, invertSignal: false },
  { symbol: 'DX-Y.NYB', name: 'Dollar Index', category: 'sentiment', growthWeight: 0, inflationWeight: 0.15, invertSignal: true },
  { symbol: '^VIX', name: 'VIX', category: 'sentiment', growthWeight: 0, inflationWeight: 0, invertSignal: true },
  { symbol: 'XLI', name: 'Industrials', category: 'growth', growthWeight: 0.20, inflationWeight: 0, invertSignal: false },
  { symbol: 'GC=F', name: 'Gold', category: 'inflation', growthWeight: 0, inflationWeight: 0.20, invertSignal: true },
  { symbol: 'CL=F', name: 'Crude Oil', category: 'growth', growthWeight: 0.15, inflationWeight: 0.15, invertSignal: false },
  { symbol: 'HG=F', name: 'Copper', category: 'growth', growthWeight: 0.25, inflationWeight: 0, invertSignal: false },
];

const ALL_SYMBOLS = SYMBOLS.map((s) => s.symbol);

// ── Interfaces ──

interface IndicatorResult {
  name: string;
  symbol: string;
  category: 'growth' | 'inflation' | 'sentiment';
  currentValue: number;
  sma20: number;
  zScore: number;
  signal: 'positive' | 'neutral' | 'negative';
  changePct: number;
  sparkline: number[];
}

interface HistoryPoint {
  date: string;
  composite: number;
  growth: number;
  inflation: number;
}

interface EconomicSurprisesData {
  timestamp: string;
  compositeIndex: number;
  growthIndex: number;
  inflationIndex: number;
  level: 'strong_beat' | 'modest_beat' | 'neutral' | 'modest_miss' | 'strong_miss';
  indicators: IndicatorResult[];
  history: HistoryPoint[];
}

// ── Cache (5min TTL) ──

let cache: { data: EconomicSurprisesData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 60 * 60_000;

// ── Helpers ──

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function classifyLevel(composite: number): EconomicSurprisesData['level'] {
  if (composite >= 40) return 'strong_beat';
  if (composite >= 15) return 'modest_beat';
  if (composite <= -40) return 'strong_miss';
  if (composite <= -15) return 'modest_miss';
  return 'neutral';
}

function normalizeSparkline(prices: number[]): number[] {
  if (prices.length === 0) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  if (range === 0) return prices.map(() => 0.5);
  return prices.map((p) => (p - min) / range);
}

// ── Route ──

// GET /api/economic-surprises
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch 30 days of daily history for each symbol in parallel
    const historyPromises = ALL_SYMBOLS.map((sym) =>
      getHistory(sym, { range: '1mo', interval: '1d' }),
    );

    const [quotesRaw, ...histories] = await Promise.all([
      getQuotes(ALL_SYMBOLS),
      ...historyPromises,
    ]);

    // Build a map of current quotes
    const quoteMap = new Map<string, Record<string, unknown>>();
    for (const q of quotesRaw) {
      quoteMap.set(q.symbol, q as unknown as Record<string, unknown>);
    }

    // Process each symbol
    const indicators: IndicatorResult[] = [];
    const dailyZScores: Map<string, { date: string; growth: number; inflation: number; composite: number }[]> = new Map();

    for (let i = 0; i < SYMBOLS.length; i++) {
      const meta = SYMBOLS[i];
      const history = histories[i];
      const quote = quoteMap.get(meta.symbol);

      if (!history || history.length < 5) continue;

      // Extract closing prices, filter out nulls
      const closes = history
        .map((h: { close: number | null }) => h.close)
        .filter((c: number | null): c is number => c !== null);

      if (closes.length < 5) continue;

      // Last 20 closes (or all if fewer)
      const last20 = closes.slice(-20);
      const sma20 = mean(last20);
      const std20 = stddev(last20);
      const currentPrice = (quote?.price as number) ?? closes[closes.length - 1];
      const changePct = (quote?.changePercent as number) ?? 0;

      // Z-score: deviation from SMA normalized by std dev
      let zScore = std20 > 0 ? (currentPrice - sma20) / std20 : 0;

      // Invert signal for assets where higher = negative surprise
      if (meta.invertSignal) {
        zScore = -zScore;
      }

      // Clamp z-score to reasonable range
      zScore = clamp(zScore, -3, 3);

      const signal: IndicatorResult['signal'] =
        zScore > 0.5 ? 'positive' : zScore < -0.5 ? 'negative' : 'neutral';

      indicators.push({
        name: meta.name,
        symbol: meta.symbol,
        category: meta.category,
        currentValue: currentPrice,
        sma20: +sma20.toFixed(4),
        zScore: +zScore.toFixed(2),
        signal,
        changePct: +changePct.toFixed(2),
        sparkline: normalizeSparkline(last20),
      });

      // Compute daily z-scores for history
      // We compute a rolling z-score for each of the last 20 days
      const dates = history
        .slice(-20)
        .map((h: { date: string | number }) => String(h.date));
      const allCloses = closes; // full history for rolling window

      for (let d = 0; d < last20.length; d++) {
        const endIdx = allCloses.length - last20.length + d + 1;
        const startIdx = Math.max(0, endIdx - 20);
        const window = allCloses.slice(startIdx, endIdx);
        if (window.length < 5) continue;

        const wMean = mean(window);
        const wStd = stddev(window);
        let dz = wStd > 0 ? (window[window.length - 1] - wMean) / wStd : 0;
        if (meta.invertSignal) dz = -dz;
        dz = clamp(dz, -3, 3);

        const dateStr = dates[d];
        if (!dailyZScores.has(dateStr)) {
          dailyZScores.set(dateStr, []);
        }
        dailyZScores.get(dateStr)!.push({
          date: dateStr,
          growth: dz * meta.growthWeight,
          inflation: dz * meta.inflationWeight,
          composite: dz * ((meta.growthWeight + meta.inflationWeight) || 0.1),
        });
      }
    }

    // Compute composite indices from z-scores
    const totalGrowthWeight = SYMBOLS.reduce((s, m) => s + m.growthWeight, 0);
    const totalInflationWeight = SYMBOLS.reduce((s, m) => s + m.inflationWeight, 0);
    const totalCompositeWeight = SYMBOLS.reduce((s, m) => s + (m.growthWeight + m.inflationWeight || 0.1), 0);

    // Current composite from indicators
    let growthIndex = 0;
    let inflationIndex = 0;
    let compositeIndex = 0;

    for (const ind of indicators) {
      const meta = SYMBOLS.find((s) => s.symbol === ind.symbol);
      if (!meta) continue;
      growthIndex += ind.zScore * meta.growthWeight;
      inflationIndex += ind.zScore * meta.inflationWeight;
      compositeIndex += ind.zScore * ((meta.growthWeight + meta.inflationWeight) || 0.1);
    }

    // Normalize to -100 to +100 scale
    // Average z-score * scaling factor (~33 maps z=3 to 100)
    growthIndex = totalGrowthWeight > 0
      ? clamp((growthIndex / totalGrowthWeight) * 33.33, -100, 100)
      : 0;
    inflationIndex = totalInflationWeight > 0
      ? clamp((inflationIndex / totalInflationWeight) * 33.33, -100, 100)
      : 0;
    compositeIndex = totalCompositeWeight > 0
      ? clamp((compositeIndex / totalCompositeWeight) * 33.33, -100, 100)
      : 0;

    // Build history array from daily z-scores
    const sortedDates = Array.from(dailyZScores.keys()).sort();
    const historyArr: HistoryPoint[] = sortedDates.map((date) => {
      const entries = dailyZScores.get(date)!;
      let gSum = 0;
      let iSum = 0;
      let cSum = 0;
      for (const e of entries) {
        gSum += e.growth;
        iSum += e.inflation;
        cSum += e.composite;
      }
      return {
        date,
        composite: +clamp((cSum / totalCompositeWeight) * 33.33, -100, 100).toFixed(1),
        growth: +clamp((gSum / totalGrowthWeight) * 33.33, -100, 100).toFixed(1),
        inflation: +clamp((iSum / totalInflationWeight) * 33.33, -100, 100).toFixed(1),
      };
    });

    const data: EconomicSurprisesData = {
      timestamp: new Date().toISOString(),
      compositeIndex: +compositeIndex.toFixed(1),
      growthIndex: +growthIndex.toFixed(1),
      inflationIndex: +inflationIndex.toFixed(1),
      level: classifyLevel(compositeIndex),
      indicators,
      history: historyArr.slice(-20),
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EconomicSurprises] Error:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch economic surprises data' });
  }
});

export default router;
