import { Router } from 'express';
import { getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

interface CachedChart {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CachedChart>();
const INTRADAY_TTL = 60_000;   // 1 minute for intraday intervals
const DAILY_TTL = 5 * 60_000;  // 5 minutes for daily+

const VALID_RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y']);
const VALID_INTERVALS = new Set(['1m', '5m', '15m', '1h', '1d', '1wk', '1mo']);

// GET /api/chart/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const range = (req.query.range as string) || '6mo';
    const interval = (req.query.interval as string) || '1d';

    if (!VALID_RANGES.has(range)) {
      return res.status(400).json({ error: 'Invalid range parameter' });
    }
    if (!VALID_INTERVALS.has(interval)) {
      return res.status(400).json({ error: 'Invalid interval parameter' });
    }

    // Check cache
    const cacheKey = `${symbol}:${range}:${interval}`;
    const isIntraday = ['1m', '5m', '15m', '1h'].includes(interval);
    const ttl = isIntraday ? INTRADAY_TTL : DAILY_TTL;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return res.json(cached.data);
    }

    const history = await getHistory(symbol, { range, interval });

    const candles = history
      .filter((h) => h.open != null && h.close != null)
      .map((h) => ({
        timestamp: typeof h.date === 'number' ? h.date : Math.floor(new Date(h.date).getTime() / 1000),
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
        volume: h.volume,
      }));

    const response = { symbol, candles, range, interval };

    // Update cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    // Prune stale entries periodically (max 500 entries)
    if (cache.size > 500) {
      const now = Date.now();
      for (const [key, val] of cache) {
        if (now - val.timestamp > DAILY_TTL) {
          cache.delete(key);
        }
      }
    }

    res.json(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Chart] Error fetching chart data:', msg);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

export default router;
