import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Yahoo Finance treasury yield indices (values are x10, divide by 10 for actual %)
const TREASURY_SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX'] as const;

interface YieldPoint {
  term: string;
  yield: number;
  months: number;
  isLive: boolean;
}

interface YieldCurveResponse {
  maturities: YieldPoint[];
  updatedAt: string;
}

interface HistoricalCurve {
  date: string;
  points: { term: string; yield: number; months: number }[];
}

interface YieldCurveHistoryResponse {
  curves: HistoricalCurve[];
}

// Symbol → maturity mapping
const SYMBOL_META: Record<string, { term: string; months: number }> = {
  '^IRX': { term: '3M', months: 3 },
  '^FVX': { term: '5Y', months: 60 },
  '^TNX': { term: '10Y', months: 120 },
  '^TYX': { term: '30Y', months: 360 },
};

// All maturities we want on the curve
const ALL_MATURITIES = [
  { term: '1M', months: 1 },
  { term: '3M', months: 3 },
  { term: '6M', months: 6 },
  { term: '1Y', months: 12 },
  { term: '2Y', months: 24 },
  { term: '3Y', months: 36 },
  { term: '5Y', months: 60 },
  { term: '7Y', months: 84 },
  { term: '10Y', months: 120 },
  { term: '20Y', months: 240 },
  { term: '30Y', months: 360 },
];

// Cache for current yield curve (5 min TTL)
let curveCache: { data: YieldCurveResponse; expiresAt: number } | null = null;
const CACHE_TTL = 60 * 60_000;

// Cache for historical data (30 min TTL)
let historyCache: { data: YieldCurveHistoryResponse; expiresAt: number } | null = null;
const HISTORY_CACHE_TTL = 30 * 60_000;

/**
 * Monotone cubic interpolation (Fritsch-Carlson method).
 * Ensures the interpolated curve stays monotone between data points,
 * preventing overshoot artifacts common with standard cubic splines.
 */
function interpolateYields(
  knownPoints: { months: number; yield: number }[],
  targetMonths: number[],
): Map<number, number> {
  const result = new Map<number, number>();
  const n = knownPoints.length;

  if (n === 0) return result;
  if (n === 1) {
    for (const m of targetMonths) result.set(m, knownPoints[0].yield);
    return result;
  }

  // Sort by months
  const sorted = [...knownPoints].sort((a, b) => a.months - b.months);
  const xs = sorted.map((p) => p.months);
  const ys = sorted.map((p) => p.yield);

  // Compute slopes
  const deltas: number[] = [];
  const h: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    deltas.push((ys[i + 1] - ys[i]) / h[i]);
  }

  // Compute tangents using Fritsch-Carlson
  const m: number[] = new Array(n);
  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (deltas[i - 1] + deltas[i]) / 2;
    }
  }

  // Ensure monotonicity
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(deltas[i]) < 1e-10) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / deltas[i];
      const beta = m[i + 1] / deltas[i];
      const tau = alpha * alpha + beta * beta;
      if (tau > 9) {
        const s = 3 / Math.sqrt(tau);
        m[i] = s * alpha * deltas[i];
        m[i + 1] = s * beta * deltas[i];
      }
    }
  }

  // Interpolate each target
  for (const target of targetMonths) {
    if (target <= xs[0]) {
      // Extrapolate left using first segment tangent
      result.set(target, ys[0] + m[0] * (target - xs[0]) / h[0] * h[0]);
      continue;
    }
    if (target >= xs[n - 1]) {
      // Extrapolate right using last segment tangent
      result.set(target, ys[n - 1] + m[n - 1] * (target - xs[n - 1]) / h[n - 2] * h[n - 2]);
      continue;
    }

    // Find segment
    let seg = 0;
    for (let i = 0; i < n - 1; i++) {
      if (target >= xs[i] && target <= xs[i + 1]) {
        seg = i;
        break;
      }
    }

    // Hermite basis interpolation
    const t = (target - xs[seg]) / h[seg];
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const val = h00 * ys[seg] + h10 * h[seg] * m[seg] + h01 * ys[seg + 1] + h11 * h[seg] * m[seg + 1];
    result.set(target, Math.round(val * 1000) / 1000);
  }

  return result;
}

// GET /api/yield-curve — Current yield curve with all maturities
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (curveCache && now < curveCache.expiresAt) {
      return res.json(curveCache.data);
    }

    const quotes = await getQuotes([...TREASURY_SYMBOLS]);

    // Build known data points from live quotes
    // Yahoo treasury indices report values as x10 (e.g., 43.2 = 4.32%)
    const knownPoints: { months: number; yield: number }[] = [];
    const liveMap = new Map<number, number>();

    for (const q of quotes) {
      const meta = SYMBOL_META[q.symbol];
      if (!meta || q.price == null || q.price === 0) continue;
      const yieldVal = q.price / 10;
      knownPoints.push({ months: meta.months, yield: yieldVal });
      liveMap.set(meta.months, yieldVal);
    }

    if (knownPoints.length < 2) {
      // Not enough data to interpolate — return whatever we have
      const maturities: YieldPoint[] = knownPoints.map((kp) => {
        const mat = ALL_MATURITIES.find((m) => m.months === kp.months);
        return {
          term: mat?.term ?? `${kp.months}M`,
          yield: kp.yield,
          months: kp.months,
          isLive: true,
        };
      });
      const data: YieldCurveResponse = {
        maturities,
        updatedAt: new Date().toISOString(),
      };
      return res.json(data);
    }

    // Interpolate missing maturities
    const targetMonths = ALL_MATURITIES
      .filter((m) => !liveMap.has(m.months))
      .map((m) => m.months);

    const interpolated = interpolateYields(knownPoints, targetMonths);

    // Build full curve
    const maturities: YieldPoint[] = ALL_MATURITIES.map((mat) => {
      const live = liveMap.get(mat.months);
      if (live !== undefined) {
        return { term: mat.term, yield: live, months: mat.months, isLive: true };
      }
      const interp = interpolated.get(mat.months);
      return {
        term: mat.term,
        yield: interp ?? 0,
        months: mat.months,
        isLive: false,
      };
    });

    const data: YieldCurveResponse = {
      maturities,
      updatedAt: new Date().toISOString(),
    };

    curveCache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[YieldCurve] Error:', message);
    if (curveCache) return res.json(curveCache.data);
    res.status(500).json({ error: 'Failed to fetch yield curve data' });
  }
});

// GET /api/yield-curve/history — Historical yield curves (1 year, monthly samples)
router.get('/history', async (_req, res) => {
  try {
    const now = Date.now();
    if (historyCache && now < historyCache.expiresAt) {
      return res.json(historyCache.data);
    }

    // Fetch 1 year of daily data for each treasury index
    const histories = await Promise.all(
      TREASURY_SYMBOLS.map(async (symbol) => {
        const data = await getHistory(symbol, { range: '1y', interval: '1d' });
        return { symbol, data };
      }),
    );

    // Build date → symbol → close map
    const dateMap = new Map<string, Map<string, number>>();

    for (const { symbol, data } of histories) {
      for (const point of data) {
        if (!point.close || typeof point.date !== 'string') continue;
        const date = point.date;
        if (!dateMap.has(date)) dateMap.set(date, new Map());
        dateMap.get(date)!.set(symbol, point.close / 10); // divide by 10
      }
    }

    // Sample monthly: pick the first trading day of each month
    const allDates = [...dateMap.keys()].sort();
    const monthlyDates: string[] = [];
    let lastMonth = '';

    for (const date of allDates) {
      const month = date.slice(0, 7); // YYYY-MM
      if (month !== lastMonth) {
        // Only include dates where we have at least 2 data points
        const dayData = dateMap.get(date)!;
        if (dayData.size >= 2) {
          monthlyDates.push(date);
          lastMonth = month;
        }
      }
    }

    // Build curves for each sampled date
    const curves: HistoricalCurve[] = monthlyDates.map((date) => {
      const dayData = dateMap.get(date)!;
      const knownPoints: { months: number; yield: number }[] = [];

      for (const [symbol, yieldVal] of dayData) {
        const meta = SYMBOL_META[symbol];
        if (meta) knownPoints.push({ months: meta.months, yield: yieldVal });
      }

      // Interpolate all maturities
      const liveMonths = new Set(knownPoints.map((p) => p.months));
      const targetMonths = ALL_MATURITIES
        .filter((m) => !liveMonths.has(m.months))
        .map((m) => m.months);

      const interpolated = interpolateYields(knownPoints, targetMonths);

      const points = ALL_MATURITIES.map((mat) => {
        const known = knownPoints.find((p) => p.months === mat.months);
        return {
          term: mat.term,
          yield: known ? known.yield : (interpolated.get(mat.months) ?? 0),
          months: mat.months,
        };
      });

      return { date, points };
    });

    const data: YieldCurveHistoryResponse = { curves };
    historyCache = { data, expiresAt: now + HISTORY_CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[YieldCurve] History error:', message);
    if (historyCache) return res.json(historyCache.data);
    res.status(500).json({ error: 'Failed to fetch yield curve history' });
  }
});

export default router;
