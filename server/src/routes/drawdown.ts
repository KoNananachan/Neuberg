import { Router } from 'express';
import { getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface DrawdownPoint {
  date: string;
  price: number;
  peak: number;
  drawdown: number;
}

interface DrawdownEvent {
  peakDate: string;
  troughDate: string;
  recoveryDate: string | null;
  maxDrawdown: number;
  durationDays: number;
  recoveryDays: number | null;
}

interface DrawdownStats {
  maxDrawdown: number;
  maxDrawdownDate: string;
  currentDrawdown: number;
  distanceFromATH: number;
  avgDrawdown: number;
  avgRecoveryDays: number;
  totalDrawdowns: number;
}

// ── Helpers ──

const VALID_PERIODS = new Set(['1y', '2y', '5y', '10y']);

const PERIOD_RANGE_MAP: Record<string, string> = {
  '1y': '1y',
  '2y': '2y',
  '5y': '5y',
  '10y': '10y',
};

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function buildDrawdownSeries(
  history: Array<{ date: string | number; close: number | null }>,
): DrawdownPoint[] {
  const series: DrawdownPoint[] = [];
  let peak = -Infinity;

  for (const bar of history) {
    if (bar.close == null || bar.close <= 0) continue;
    if (bar.close > peak) peak = bar.close;
    const drawdown = peak > 0 ? ((bar.close - peak) / peak) * 100 : 0;
    series.push({
      date: String(bar.date),
      price: Math.round(bar.close * 100) / 100,
      peak: Math.round(peak * 100) / 100,
      drawdown: Math.round(drawdown * 100) / 100,
    });
  }

  return series;
}

function findDrawdownEvents(series: DrawdownPoint[], threshold: number = -5): DrawdownEvent[] {
  const events: DrawdownEvent[] = [];
  let inDrawdown = false;
  let peakDate = '';
  let troughDate = '';
  let maxDD = 0;

  for (let i = 0; i < series.length; i++) {
    const pt = series[i];

    if (!inDrawdown) {
      // Enter drawdown when we cross the threshold
      if (pt.drawdown <= threshold) {
        inDrawdown = true;
        // Peak date is the last date we were at 0% drawdown
        let peakIdx = i - 1;
        while (peakIdx >= 0 && series[peakIdx].drawdown !== 0) peakIdx--;
        peakDate = peakIdx >= 0 ? series[peakIdx].date : series[0].date;
        troughDate = pt.date;
        maxDD = pt.drawdown;
      }
    } else {
      // Track the deepest point
      if (pt.drawdown < maxDD) {
        maxDD = pt.drawdown;
        troughDate = pt.date;
      }

      // Recovery: drawdown returns to 0%
      if (pt.drawdown === 0) {
        events.push({
          peakDate,
          troughDate,
          recoveryDate: pt.date,
          maxDrawdown: Math.round(maxDD * 100) / 100,
          durationDays: daysBetween(peakDate, troughDate),
          recoveryDays: daysBetween(troughDate, pt.date),
        });
        inDrawdown = false;
        maxDD = 0;
      }
    }
  }

  // If still in a drawdown at the end, record as active (no recovery)
  if (inDrawdown) {
    events.push({
      peakDate,
      troughDate,
      recoveryDate: null,
      maxDrawdown: Math.round(maxDD * 100) / 100,
      durationDays: daysBetween(peakDate, troughDate),
      recoveryDays: null,
    });
  }

  return events;
}

function computeStats(series: DrawdownPoint[], events: DrawdownEvent[]): DrawdownStats {
  // Max drawdown
  let maxDrawdown = 0;
  let maxDrawdownDate = '';
  for (const pt of series) {
    if (pt.drawdown < maxDrawdown) {
      maxDrawdown = pt.drawdown;
      maxDrawdownDate = pt.date;
    }
  }

  // Current drawdown
  const lastPoint = series[series.length - 1];
  const currentDrawdown = lastPoint?.drawdown ?? 0;

  // Distance from ATH
  const allTimePeak = Math.max(...series.map((p) => p.peak));
  const lastPrice = lastPoint?.price ?? 0;
  const distanceFromATH =
    allTimePeak > 0 ? Math.round(((lastPrice - allTimePeak) / allTimePeak) * 100 * 100) / 100 : 0;

  // Average drawdown depth across events
  const avgDrawdown =
    events.length > 0
      ? Math.round((events.reduce((sum, e) => sum + e.maxDrawdown, 0) / events.length) * 100) / 100
      : 0;

  // Average recovery time (only recovered events)
  const recoveredEvents = events.filter((e) => e.recoveryDays != null);
  const avgRecoveryDays =
    recoveredEvents.length > 0
      ? Math.round(
          recoveredEvents.reduce((sum, e) => sum + (e.recoveryDays ?? 0), 0) /
            recoveredEvents.length,
        )
      : 0;

  return {
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownDate,
    currentDrawdown: Math.round(currentDrawdown * 100) / 100,
    distanceFromATH,
    avgDrawdown,
    avgRecoveryDays,
    totalDrawdowns: events.length,
  };
}

// ── Cache ──

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 15 * 60_000; // 15 minutes

// GET /api/drawdown/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const period = VALID_PERIODS.has(req.query.period as string)
      ? (req.query.period as string)
      : '5y';

    const cacheKey = `${symbol}:${period}`;
    const now = Date.now();

    const cached = cache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    const range = PERIOD_RANGE_MAP[period] ?? '5y';
    const history = await getHistory(symbol, { range, interval: '1d' });

    if (!history || history.length === 0) {
      return res.status(404).json({ error: 'No price data available' });
    }

    const series = buildDrawdownSeries(history);
    if (series.length === 0) {
      return res.status(404).json({ error: 'No valid price data' });
    }

    const events = findDrawdownEvents(series);
    const stats = computeStats(series, events);

    const data = {
      symbol,
      period,
      series,
      events,
      stats,
      updatedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, { data, expiresAt: now + CACHE_TTL });

    // Evict old entries
    if (cache.size > 200) {
      for (const [key, val] of cache) {
        if (now > val.expiresAt) cache.delete(key);
      }
    }

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Drawdown] Error:', message);
    const symbol = req.params.symbol.toUpperCase();
    const period = req.query.period as string || '5y';
    const cached = cache.get(`${symbol}:${period}`);
    if (cached) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch drawdown data' });
  }
});

export default router;
