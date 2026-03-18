import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

type SentimentLevel = 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';

interface IndicatorResult {
  name: string;
  category: 'fear_greed' | 'positioning';
  score: number;
  level: SentimentLevel;
  value: number;
  description: string;
  sparkline: number[];
}

interface HistoryEntry {
  date: string;
  composite: number;
  fearGreed: number;
  positioning: number;
}

interface SentimentDashboardData {
  timestamp: string;
  compositeScore: number;
  level: SentimentLevel;
  previousClose: number;
  indicators: IndicatorResult[];
  history: HistoryEntry[];
  contrarian: {
    signal: 'buy' | 'sell' | 'neutral';
    description: string;
    confidence: number;
  };
}

// ── Indicator Definitions ──

interface IndicatorConfig {
  name: string;
  category: 'fear_greed' | 'positioning';
  symbols: string[];
  description: string;
  weight: number;
  compute: (histories: number[][], quotes: Map<string, number>) => { score: number; value: number; sparkline: number[] };
}

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scoreToLevel(score: number): SentimentLevel {
  if (score < 20) return 'extreme_fear';
  if (score < 40) return 'fear';
  if (score < 60) return 'neutral';
  if (score < 80) return 'greed';
  return 'extreme_greed';
}

function zScore(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
  if (std === 0) return 0;
  return (values[values.length - 1] - mean) / std;
}

function percentileRank(values: number[], current: number): number {
  const count = values.filter((v) => v < current).length;
  return (count / values.length) * 100;
}

function ratioSeries(a: number[], b: number[]): number[] {
  const len = Math.min(a.length, b.length);
  const result: number[] = [];
  for (let i = 0; i < len; i++) {
    if (b[i] > 0) result.push(a[i] / b[i]);
  }
  return result;
}

function extractCloses(history: Array<{ close: number | null }>): number[] {
  return history
    .map((h) => h.close)
    .filter((c): c is number => c != null && c > 0);
}

function dailyScores(series: number[], scoreFn: (val: number, slice: number[]) => number, window: number): number[] {
  const scores: number[] = [];
  for (let i = window; i < series.length; i++) {
    const slice = series.slice(i - window, i + 1);
    scores.push(clamp(scoreFn(series[i], slice), 0, 100));
  }
  return scores;
}

// ── Indicator Configs ──

const INDICATORS: IndicatorConfig[] = [
  // Fear/Greed indicators
  {
    name: 'VIX Level',
    category: 'fear_greed',
    symbols: ['^VIX'],
    description: 'CBOE Volatility Index — measures expected 30-day S&P 500 volatility',
    weight: 15,
    compute: (histories) => {
      const closes = histories[0];
      if (closes.length < 20) return { score: 50, value: 0, sparkline: [] };
      const current = closes[closes.length - 1];
      // VIX scoring: lower = greed, higher = fear
      let score: number;
      if (current < 15) score = 90;
      else if (current < 20) score = 70;
      else if (current < 25) score = 50;
      else if (current < 35) score = 25;
      else score = 5;
      const sparkline = dailyScores(closes, (val) => {
        if (val < 15) return 90;
        if (val < 20) return 70;
        if (val < 25) return 50;
        if (val < 35) return 25;
        return 5;
      }, 0).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(current * 100) / 100, sparkline };
    },
  },
  {
    name: 'Put/Call Proxy',
    category: 'fear_greed',
    symbols: ['UVXY', 'SPY'],
    description: 'UVXY/SPY ratio — elevated fear hedging raises this ratio',
    weight: 10,
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]);
      if (ratios.length < 20) return { score: 50, value: 0, sparkline: [] };
      const current = ratios[ratios.length - 1];
      const pct = percentileRank(ratios, current);
      // High ratio = fear, low = greed → invert
      const score = 100 - pct;
      const sparkline = dailyScores(ratios, (val, slice) => 100 - percentileRank(slice, val), 20).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(current * 10000) / 10000, sparkline };
    },
  },
  {
    name: 'Safe Haven Demand',
    category: 'fear_greed',
    symbols: ['GLD', 'SPY'],
    description: 'Gold/SPY ratio — rising ratio signals flight to safety',
    weight: 10,
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]);
      if (ratios.length < 20) return { score: 50, value: 0, sparkline: [] };
      const current = ratios[ratios.length - 1];
      const z = zScore(ratios);
      // High z-score (rising gold vs SPY) = fear → invert
      const score = 50 - z * 20;
      const sparkline = dailyScores(ratios, (_, slice) => clamp(50 - zScore(slice) * 20, 0, 100), 20).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(current * 10000) / 10000, sparkline };
    },
  },
  {
    name: 'Junk Bond Demand',
    category: 'fear_greed',
    symbols: ['HYG', 'TLT'],
    description: 'HYG/TLT ratio — junk bonds outperforming treasuries signals greed',
    weight: 10,
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]);
      if (ratios.length < 20) return { score: 50, value: 0, sparkline: [] };
      const current = ratios[ratios.length - 1];
      const z = zScore(ratios);
      // High ratio = greed (junk outperforming)
      const score = 50 + z * 20;
      const sparkline = dailyScores(ratios, (_, slice) => clamp(50 + zScore(slice) * 20, 0, 100), 20).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(current * 10000) / 10000, sparkline };
    },
  },
  {
    name: 'Market Momentum',
    category: 'fear_greed',
    symbols: ['SPY'],
    description: 'SPY 20-day return vs 60-day average — positive momentum signals greed',
    weight: 12,
    compute: (histories) => {
      const closes = histories[0];
      if (closes.length < 60) return { score: 50, value: 0, sparkline: [] };
      const ret20 = (closes[closes.length - 1] / closes[closes.length - 21] - 1) * 100;
      // Build 60-day average of 20-day returns
      const returns: number[] = [];
      for (let i = 20; i < closes.length; i++) {
        returns.push((closes[i] / closes[i - 20] - 1) * 100);
      }
      const avg60 = returns.slice(-60).reduce((s, v) => s + v, 0) / Math.min(returns.length, 60);
      const diff = ret20 - avg60;
      // Diff > 0 = greed, < 0 = fear
      const score = 50 + diff * 5;
      const sparkline = dailyScores(closes, (_, slice) => {
        if (slice.length < 21) return 50;
        const r = (slice[slice.length - 1] / slice[slice.length - 21] - 1) * 100;
        return clamp(50 + (r - avg60) * 5, 0, 100);
      }, 20).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(ret20 * 100) / 100, sparkline };
    },
  },
  {
    name: 'Market Breadth Proxy',
    category: 'fear_greed',
    symbols: ['IWM', 'SPY'],
    description: 'IWM/SPY ratio — small caps outperforming large caps signals broad greed',
    weight: 8,
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]);
      if (ratios.length < 20) return { score: 50, value: 0, sparkline: [] };
      const current = ratios[ratios.length - 1];
      const z = zScore(ratios);
      // High ratio = greed (small caps outperforming)
      const score = 50 + z * 20;
      const sparkline = dailyScores(ratios, (_, slice) => clamp(50 + zScore(slice) * 20, 0, 100), 20).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(current * 10000) / 10000, sparkline };
    },
  },
  {
    name: 'Volatility Skew Proxy',
    category: 'fear_greed',
    symbols: ['^VIX', '^VIX3M'],
    description: 'VIX/VIX3M ratio — above 1 signals near-term panic, below 0.85 signals complacency',
    weight: 10,
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]);
      if (ratios.length < 10) return { score: 50, value: 0, sparkline: [] };
      const current = ratios[ratios.length - 1];
      // >1 = extreme fear (inverted term structure), <0.85 = greed
      let score: number;
      if (current > 1.1) score = 5;
      else if (current > 1.0) score = 20;
      else if (current > 0.95) score = 40;
      else if (current > 0.85) score = 60;
      else score = 90;
      const sparkline = dailyScores(ratios, (val) => {
        if (val > 1.1) return 5;
        if (val > 1.0) return 20;
        if (val > 0.95) return 40;
        if (val > 0.85) return 60;
        return 90;
      }, 0).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(current * 10000) / 10000, sparkline };
    },
  },
  // Positioning indicators
  {
    name: 'Leverage Proxy',
    category: 'positioning',
    symbols: ['TQQQ', 'QQQ'],
    description: 'TQQQ/QQQ volume ratio — high leveraged ETF activity signals speculative greed',
    weight: 8,
    compute: (histories, quotes) => {
      // Use volume data from quotes since histories are closes
      const tqqqVol = quotes.get('TQQQ_vol') ?? 0;
      const qqqVol = quotes.get('QQQ_vol') ?? 0;
      const ratio = qqqVol > 0 ? tqqqVol / qqqVol : 0;
      // Typical range 0.1-0.5; higher = more speculative
      const score = ratio > 0.4 ? 85 : ratio > 0.3 ? 70 : ratio > 0.2 ? 55 : ratio > 0.1 ? 40 : 25;
      // Build sparkline from close ratios as proxy
      const ratios = ratioSeries(histories[0], histories[1]);
      const sparkline = dailyScores(ratios, (val, slice) => {
        const pct = percentileRank(slice, val);
        return pct; // higher ratio = more greed
      }, 20).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(ratio * 10000) / 10000, sparkline };
    },
  },
  {
    name: 'Defensive Rotation',
    category: 'positioning',
    symbols: ['XLU', 'SPY'],
    description: 'Utilities/SPY ratio — rising ratio signals defensive positioning (fear)',
    weight: 8,
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]);
      if (ratios.length < 20) return { score: 50, value: 0, sparkline: [] };
      const current = ratios[ratios.length - 1];
      const z = zScore(ratios);
      // High ratio = fear (defensive), invert
      const score = 50 - z * 20;
      const sparkline = dailyScores(ratios, (_, slice) => clamp(50 - zScore(slice) * 20, 0, 100), 20).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(current * 10000) / 10000, sparkline };
    },
  },
  {
    name: 'EM Risk Appetite',
    category: 'positioning',
    symbols: ['EEM', 'SPY'],
    description: 'EEM/SPY ratio — emerging markets outperforming signals global risk appetite',
    weight: 9,
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]);
      if (ratios.length < 20) return { score: 50, value: 0, sparkline: [] };
      const current = ratios[ratios.length - 1];
      const z = zScore(ratios);
      // High ratio = greed
      const score = 50 + z * 20;
      const sparkline = dailyScores(ratios, (_, slice) => clamp(50 + zScore(slice) * 20, 0, 100), 20).slice(-20);
      return { score: clamp(score, 0, 100), value: Math.round(current * 10000) / 10000, sparkline };
    },
  },
];

// Collect all unique symbols needed
function getAllSymbols(): string[] {
  const set = new Set<string>();
  for (const ind of INDICATORS) {
    for (const s of ind.symbols) set.add(s);
  }
  return Array.from(set);
}

// ── Cache ──

let cache: { data: SentimentDashboardData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// ── Route ──

// GET /api/sentiment-dashboard
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const allSymbols = getAllSymbols();

    // Fetch 60 days of history for all symbols + current quotes
    const [quotes, ...histories] = await Promise.all([
      getQuotes([...allSymbols, 'TQQQ', 'QQQ']),
      ...allSymbols.map((s) => getHistory(s, { range: '3mo', interval: '1d' })),
    ]);

    // Build maps
    const historyMap = new Map<string, number[]>();
    for (let i = 0; i < allSymbols.length; i++) {
      historyMap.set(allSymbols[i], extractCloses(histories[i]));
    }

    const quoteMap = new Map<string, number>();
    for (const q of quotes) {
      quoteMap.set(q.symbol, q.price);
      if (q.volume != null) {
        quoteMap.set(`${q.symbol}_vol`, q.volume);
      }
    }

    // Compute each indicator
    const indicators: IndicatorResult[] = [];
    for (const config of INDICATORS) {
      const indicatorHistories = config.symbols.map((s) => historyMap.get(s) || []);
      const { score, value, sparkline } = config.compute(indicatorHistories, quoteMap);
      indicators.push({
        name: config.name,
        category: config.category,
        score: Math.round(score * 10) / 10,
        level: scoreToLevel(score),
        value,
        description: config.description,
        sparkline,
      });
    }

    // Composite score: weighted average
    let totalWeight = 0;
    let weightedSum = 0;
    for (let i = 0; i < INDICATORS.length; i++) {
      weightedSum += indicators[i].score * INDICATORS[i].weight;
      totalWeight += INDICATORS[i].weight;
    }
    const compositeScore = totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 10) / 10
      : 50;

    // Calculate sub-index scores
    let fgWeightTotal = 0;
    let fgWeightedSum = 0;
    for (let i = 0; i < INDICATORS.length; i++) {
      if (INDICATORS[i].category === 'fear_greed') {
        fgWeightedSum += indicators[i].score * INDICATORS[i].weight;
        fgWeightTotal += INDICATORS[i].weight;
      }
    }
    const fearGreedScore = fgWeightTotal > 0 ? Math.round((fgWeightedSum / fgWeightTotal) * 10) / 10 : 50;

    let posWeightTotal = 0;
    let posWeightedSum = 0;
    for (let i = 0; i < INDICATORS.length; i++) {
      if (INDICATORS[i].category === 'positioning') {
        posWeightedSum += indicators[i].score * INDICATORS[i].weight;
        posWeightTotal += INDICATORS[i].weight;
      }
    }
    const positioningScore = posWeightTotal > 0 ? Math.round((posWeightedSum / posWeightTotal) * 10) / 10 : 50;

    // Build 30-day history from SPY-based composite approximation
    const spyCloses = historyMap.get('SPY') || [];
    const history: HistoryEntry[] = [];
    const histLen = Math.min(spyCloses.length, 60);
    for (let day = Math.max(0, histLen - 30); day < histLen; day++) {
      // Approximate daily composite from each indicator's sparkline values
      let dayComposite = compositeScore;
      let dayFG = fearGreedScore;
      let dayPos = positioningScore;

      // Use sparkline indices for approximate daily history
      const sparklineIdx = day - Math.max(0, histLen - 20);
      if (sparklineIdx >= 0) {
        let wSum = 0, wTotal = 0;
        let fgSum = 0, fgTotal = 0;
        let posSum = 0, posTotal = 0;
        for (let i = 0; i < indicators.length; i++) {
          const sp = indicators[i].sparkline;
          if (sparklineIdx < sp.length) {
            const w = INDICATORS[i].weight;
            wSum += sp[sparklineIdx] * w;
            wTotal += w;
            if (INDICATORS[i].category === 'fear_greed') {
              fgSum += sp[sparklineIdx] * w;
              fgTotal += w;
            } else {
              posSum += sp[sparklineIdx] * w;
              posTotal += w;
            }
          }
        }
        if (wTotal > 0) dayComposite = Math.round((wSum / wTotal) * 10) / 10;
        if (fgTotal > 0) dayFG = Math.round((fgSum / fgTotal) * 10) / 10;
        if (posTotal > 0) dayPos = Math.round((posSum / posTotal) * 10) / 10;
      }

      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - (histLen - 1 - day));
      history.push({
        date: dateObj.toISOString().slice(0, 10),
        composite: dayComposite,
        fearGreed: dayFG,
        positioning: dayPos,
      });
    }

    // Previous close: use yesterday's composite from history
    const previousClose = history.length >= 2
      ? history[history.length - 2].composite
      : compositeScore;

    // Contrarian signal
    let contrarianSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let contrarianDesc = 'Market sentiment is in a balanced range. No strong contrarian signal.';
    let contrarianConfidence = 30;

    if (compositeScore < 20) {
      contrarianSignal = 'buy';
      contrarianDesc = 'Extreme fear often precedes market rebounds. Contrarian buying opportunity.';
      contrarianConfidence = 75 + Math.round((20 - compositeScore) * 1.25);
    } else if (compositeScore < 30) {
      contrarianSignal = 'buy';
      contrarianDesc = 'Elevated fear levels suggest potential buying opportunity for contrarians.';
      contrarianConfidence = 55 + Math.round((30 - compositeScore) * 2);
    } else if (compositeScore > 80) {
      contrarianSignal = 'sell';
      contrarianDesc = 'Extreme greed often precedes corrections. Contrarian selling opportunity.';
      contrarianConfidence = 75 + Math.round((compositeScore - 80) * 1.25);
    } else if (compositeScore > 70) {
      contrarianSignal = 'sell';
      contrarianDesc = 'Elevated greed levels suggest caution for contrarian investors.';
      contrarianConfidence = 55 + Math.round((compositeScore - 70) * 2);
    }

    contrarianConfidence = clamp(contrarianConfidence, 0, 100);

    const data: SentimentDashboardData = {
      timestamp: new Date().toISOString(),
      compositeScore,
      level: scoreToLevel(compositeScore),
      previousClose,
      indicators,
      history,
      contrarian: {
        signal: contrarianSignal,
        description: contrarianDesc,
        confidence: contrarianConfidence,
      },
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SentimentDashboard] Error fetching data:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch sentiment dashboard data' });
  }
});

export default router;
