import { Router } from 'express';
import { getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface IndicatorConfig {
  name: string;
  symbol: string | string[];
  category: 'volatility' | 'credit' | 'flight_to_safety' | 'contagion' | 'speculative';
  description: string;
  weight: number;
  // Whether higher values = more risk (true) or lower = more risk (false)
  higherIsBearish: boolean;
  // For ratio indicators
  isRatio?: boolean;
}

interface IndicatorResult {
  name: string;
  symbol: string;
  category: 'volatility' | 'credit' | 'flight_to_safety' | 'contagion' | 'speculative';
  currentValue: number;
  zScore: number;
  percentile: number;
  direction: 'rising' | 'stable' | 'falling';
  alertLevel: 'normal' | 'watch' | 'warning' | 'critical';
  description: string;
  sparkline: number[];
}

interface CompositeHistory {
  date: string;
  compositeScore: number;
}

interface TailRiskResponse {
  timestamp: string;
  compositeScore: number;
  level: 'complacent' | 'normal' | 'elevated' | 'high' | 'extreme';
  indicators: IndicatorResult[];
  history: CompositeHistory[];
  alerts: string[];
}

// ── Indicator Definitions ──

const INDICATORS: IndicatorConfig[] = [
  {
    name: 'VIX (Fear Gauge)',
    symbol: '^VIX',
    category: 'volatility',
    description: 'CBOE Volatility Index - measures expected 30-day S&P 500 volatility',
    weight: 2.0,
    higherIsBearish: true,
  },
  {
    name: 'SKEW Index',
    symbol: '^SKEW',
    category: 'volatility',
    description: 'CBOE SKEW - measures tail risk pricing in S&P 500 options',
    weight: 1.5,
    higherIsBearish: true,
  },
  {
    name: 'MOVE Proxy (TLT Vol)',
    symbol: 'TLT',
    category: 'volatility',
    description: 'Bond market stress via 20+ Year Treasury volatility',
    weight: 1.5,
    higherIsBearish: true,
    // We'll use TLT daily returns volatility as proxy
  },
  {
    name: 'Credit Stress (HYG/LQD)',
    symbol: ['HYG', 'LQD'],
    category: 'credit',
    description: 'High yield vs investment grade ratio - credit risk appetite',
    weight: 1.8,
    higherIsBearish: false, // Lower ratio = more stress
    isRatio: true,
  },
  {
    name: 'Put/Call Proxy (UVXY/SPY)',
    symbol: ['UVXY', 'SPY'],
    category: 'volatility',
    description: 'Ultra VIX Short-Term vs S&P 500 - hedging demand indicator',
    weight: 1.5,
    higherIsBearish: true,
    isRatio: true,
  },
  {
    name: 'Gold/SPY (Flight to Safety)',
    symbol: ['GLD', 'SPY'],
    category: 'flight_to_safety',
    description: 'Gold vs equities ratio - safe haven demand',
    weight: 1.2,
    higherIsBearish: true,
    isRatio: true,
  },
  {
    name: 'TED Spread Proxy (SHY/TLT)',
    symbol: ['SHY', 'TLT'],
    category: 'credit',
    description: 'Short-term vs long-term treasury ratio - credit stress',
    weight: 1.0,
    higherIsBearish: true,
    isRatio: true,
  },
  {
    name: 'Dollar Strength (DXY)',
    symbol: 'DX-Y.NYB',
    category: 'flight_to_safety',
    description: 'US Dollar Index - stress currency and safe haven flows',
    weight: 1.0,
    higherIsBearish: true,
  },
  {
    name: 'EM Stress (EEM/SPY)',
    symbol: ['EEM', 'SPY'],
    category: 'contagion',
    description: 'Emerging markets vs S&P 500 - contagion and capital flight',
    weight: 1.2,
    higherIsBearish: false, // Lower = EM underperformance = stress
    isRatio: true,
  },
  {
    name: 'Crypto Fear (BTC Vol)',
    symbol: 'BTC-USD',
    category: 'speculative',
    description: 'Bitcoin volatility as speculative risk proxy',
    weight: 0.8,
    higherIsBearish: true,
  },
];

// All unique symbols needed
function getAllSymbols(): string[] {
  const symbols = new Set<string>();
  for (const ind of INDICATORS) {
    if (Array.isArray(ind.symbol)) {
      ind.symbol.forEach((s) => symbols.add(s));
    } else {
      symbols.add(ind.symbol);
    }
  }
  return Array.from(symbols);
}

// ── Math helpers ──

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 1;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance) || 1;
}

function zScore(value: number, arr: number[]): number {
  const m = mean(arr);
  const s = stddev(arr);
  return (value - m) / s;
}

function percentile(value: number, arr: number[]): number {
  if (arr.length === 0) return 50;
  const sorted = [...arr].sort((a, b) => a - b);
  let count = 0;
  for (const v of sorted) {
    if (v < value) count++;
    else break;
  }
  return Math.round((count / sorted.length) * 100);
}

function computeReturnsVolatility(closes: (number | null)[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const curr = closes[i];
    if (prev != null && curr != null && prev !== 0) {
      returns.push(Math.abs((curr - prev) / prev));
    }
  }
  return returns;
}

function normalizeSparkline(values: number[], count: number): number[] {
  if (values.length === 0) return Array(count).fill(0.5);
  // Sample evenly
  const step = Math.max(1, Math.floor(values.length / count));
  const sampled: number[] = [];
  for (let i = 0; i < count && i * step < values.length; i++) {
    sampled.push(values[i * step]);
  }
  // Fill remaining
  while (sampled.length < count) {
    sampled.push(sampled[sampled.length - 1] ?? 0);
  }
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  return sampled.map((v) => (v - min) / range);
}

function getDirection(values: number[]): 'rising' | 'stable' | 'falling' {
  if (values.length < 5) return 'stable';
  const recent5 = values.slice(-5);
  const older5 = values.slice(-10, -5);
  if (older5.length === 0) return 'stable';
  const recentAvg = mean(recent5);
  const olderAvg = mean(older5);
  const diff = (recentAvg - olderAvg) / (olderAvg || 1);
  if (diff > 0.02) return 'rising';
  if (diff < -0.02) return 'falling';
  return 'stable';
}

function getAlertLevel(z: number): 'normal' | 'watch' | 'warning' | 'critical' {
  const absZ = Math.abs(z);
  if (absZ >= 2.5) return 'critical';
  if (absZ >= 1.5) return 'warning';
  if (absZ >= 0.8) return 'watch';
  return 'normal';
}

function compositeToLevel(score: number): 'complacent' | 'normal' | 'elevated' | 'high' | 'extreme' {
  if (score <= 20) return 'complacent';
  if (score <= 40) return 'normal';
  if (score <= 60) return 'elevated';
  if (score <= 80) return 'high';
  return 'extreme';
}

// Convert z-score to 0-100 risk scale (using sigmoid-like mapping)
function zToRiskScore(z: number): number {
  // Map z-score to 0-100 using a sigmoid-inspired curve
  // z=0 -> 30, z=1 -> 50, z=2 -> 73, z=3 -> 88, z=-1 -> 12
  const score = 50 + 50 * (2 / (1 + Math.exp(-z * 0.8)) - 1);
  return Math.max(0, Math.min(100, score));
}

// ── Cache ──

let cache: { data: TailRiskResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 3 * 60_000; // 3 minutes

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const symbols = getAllSymbols();

    // Fetch 60 days of history for all symbols in parallel
    const historyResults = await Promise.all(
      symbols.map((s) => getHistory(s, { range: '3mo', interval: '1d' })),
    );

    // Build a map: symbol -> array of { date, close }
    const historyMap = new Map<string, { date: string; close: number | null }[]>();
    symbols.forEach((sym, i) => {
      historyMap.set(
        sym,
        (historyResults[i] as { date: string; close: number | null }[]).slice(-60),
      );
    });

    // Process each indicator
    const indicatorResults: IndicatorResult[] = [];
    const riskScores: { score: number; weight: number }[] = [];
    const alerts: string[] = [];

    for (const config of INDICATORS) {
      try {
        let timeSeries: number[] = [];
        let displaySymbol: string;

        if (config.isRatio && Array.isArray(config.symbol)) {
          // Ratio indicator
          displaySymbol = `${config.symbol[0]}/${config.symbol[1]}`;
          const numHistory = historyMap.get(config.symbol[0]) || [];
          const denHistory = historyMap.get(config.symbol[1]) || [];

          // Build date-aligned ratio series
          const denMap = new Map<string, number>();
          for (const d of denHistory) {
            if (d.close != null) denMap.set(d.date, d.close);
          }

          for (const n of numHistory) {
            if (n.close == null) continue;
            const dVal = denMap.get(n.date);
            if (dVal == null || dVal === 0) continue;
            timeSeries.push(n.close / dVal);
          }
        } else if (config.name.includes('Vol') && !config.name.includes('VIX') && !config.name.includes('SKEW') && !config.name.includes('DXY')) {
          // Volatility-based indicator (TLT vol, BTC vol)
          const sym = Array.isArray(config.symbol) ? config.symbol[0] : config.symbol;
          displaySymbol = sym;
          const history = historyMap.get(sym) || [];
          const closes = history.map((h) => h.close);
          const dailyReturns = computeReturnsVolatility(closes);

          // Rolling 10-day realized volatility (annualized)
          for (let i = 9; i < dailyReturns.length; i++) {
            const window = dailyReturns.slice(i - 9, i + 1);
            const vol = stddev(window) * Math.sqrt(252) * 100; // annualized %
            timeSeries.push(vol);
          }
        } else {
          // Direct level indicator (VIX, SKEW, DXY)
          const sym = Array.isArray(config.symbol) ? config.symbol[0] : config.symbol;
          displaySymbol = sym;
          const history = historyMap.get(sym) || [];
          timeSeries = history
            .map((h) => h.close)
            .filter((v): v is number => v != null);
        }

        if (timeSeries.length < 10) {
          // Skip if insufficient data
          continue;
        }

        const currentValue = timeSeries[timeSeries.length - 1];
        let z = zScore(currentValue, timeSeries);

        // Flip sign for indicators where lower = more risk
        const riskZ = config.higherIsBearish ? z : -z;

        const pct = percentile(currentValue, timeSeries);
        const dir = getDirection(timeSeries);
        const alert = getAlertLevel(riskZ);
        const sparkline = normalizeSparkline(timeSeries, 20);

        // Risk score for composite (using the risk-oriented z-score)
        const riskScore = zToRiskScore(riskZ);

        indicatorResults.push({
          name: config.name,
          symbol: displaySymbol,
          category: config.category,
          currentValue: Math.round(currentValue * 10000) / 10000,
          zScore: Math.round(z * 100) / 100,
          percentile: pct,
          direction: dir,
          alertLevel: alert,
          description: config.description,
          sparkline,
        });

        riskScores.push({ score: riskScore, weight: config.weight });

        // Generate alerts for elevated indicators
        if (alert === 'critical') {
          alerts.push(`CRITICAL: ${config.name} at extreme level (z=${z.toFixed(1)}, ${dir})`);
        } else if (alert === 'warning' && dir === 'rising' && config.higherIsBearish) {
          alerts.push(`WARNING: ${config.name} elevated and rising (z=${z.toFixed(1)})`);
        } else if (alert === 'warning' && dir === 'falling' && !config.higherIsBearish) {
          alerts.push(`WARNING: ${config.name} declining (z=${z.toFixed(1)})`);
        }
      } catch (indErr) {
        console.error(`[TailRisk] Error processing ${config.name}:`, indErr instanceof Error ? indErr.message : indErr);
      }
    }

    // Compute composite score (weighted average)
    const totalWeight = riskScores.reduce((sum, r) => sum + r.weight, 0);
    const compositeScore = totalWeight > 0
      ? Math.round(riskScores.reduce((sum, r) => sum + r.score * r.weight, 0) / totalWeight)
      : 30;

    // Build composite history (last 40 trading days)
    const compositeHistory: CompositeHistory[] = [];
    const maxDays = 40;

    // Get dates from the longest available series
    const dateSet = new Set<string>();
    for (const [, hist] of historyMap) {
      for (const h of hist) {
        dateSet.add(h.date);
      }
    }
    const allDates = Array.from(dateSet).sort().slice(-maxDays);

    for (const date of allDates) {
      const dayScores: { score: number; weight: number }[] = [];

      for (const config of INDICATORS) {
        try {
          let value: number | null = null;

          if (config.isRatio && Array.isArray(config.symbol)) {
            const numHist = historyMap.get(config.symbol[0]) || [];
            const denHist = historyMap.get(config.symbol[1]) || [];
            const numEntry = numHist.find((h) => h.date === date);
            const denEntry = denHist.find((h) => h.date === date);
            if (numEntry?.close != null && denEntry?.close != null && denEntry.close !== 0) {
              value = numEntry.close / denEntry.close;
            }
          } else if (config.name.includes('Vol') && !config.name.includes('VIX') && !config.name.includes('SKEW') && !config.name.includes('DXY')) {
            // Skip volatility indicators for daily composite (too complex to recompute)
            continue;
          } else {
            const sym = Array.isArray(config.symbol) ? config.symbol[0] : config.symbol;
            const hist = historyMap.get(sym) || [];
            const entry = hist.find((h) => h.date === date);
            if (entry?.close != null) {
              value = entry.close;
            }
          }

          if (value == null) continue;

          // Get full time series for z-score context
          let fullSeries: number[];
          if (config.isRatio && Array.isArray(config.symbol)) {
            const numHist = historyMap.get(config.symbol[0]) || [];
            const denHist = historyMap.get(config.symbol[1]) || [];
            const denMap = new Map<string, number>();
            for (const d of denHist) {
              if (d.close != null) denMap.set(d.date, d.close);
            }
            fullSeries = numHist
              .filter((n) => n.close != null && denMap.has(n.date) && denMap.get(n.date)! !== 0)
              .map((n) => n.close! / denMap.get(n.date)!);
          } else {
            const sym = Array.isArray(config.symbol) ? config.symbol[0] : config.symbol;
            fullSeries = (historyMap.get(sym) || [])
              .map((h) => h.close)
              .filter((v): v is number => v != null);
          }

          if (fullSeries.length < 5) continue;

          const z = zScore(value, fullSeries);
          const riskZ = config.higherIsBearish ? z : -z;
          dayScores.push({ score: zToRiskScore(riskZ), weight: config.weight });
        } catch {
          // Skip this indicator for this date
        }
      }

      if (dayScores.length > 0) {
        const tw = dayScores.reduce((s, r) => s + r.weight, 0);
        const dayComposite = Math.round(
          dayScores.reduce((s, r) => s + r.score * r.weight, 0) / tw,
        );
        compositeHistory.push({ date, compositeScore: dayComposite });
      }
    }

    const level = compositeToLevel(compositeScore);

    const result: TailRiskResponse = {
      timestamp: new Date().toISOString(),
      compositeScore,
      level,
      indicators: indicatorResults,
      history: compositeHistory.slice(-40),
      alerts,
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TailRisk] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch tail risk data' });
  }
});

export default router;
