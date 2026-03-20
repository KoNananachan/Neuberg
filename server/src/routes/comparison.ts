import { Router } from 'express';
import { ensureCrumb } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const VALID_RANGES = ['1mo', '3mo', '6mo', '1y', '2y', '5y', 'ytd'] as const;
type Range = typeof VALID_RANGES[number];

const RANGE_INTERVAL: Record<Range, string> = {
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y': '1wk',
  '2y': '1wk',
  '5y': '1mo',
  'ytd': '1d',
};

interface DataPoint {
  timestamp: number;
  normalizedReturn: number;
}

interface SeriesEntry {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  dataPoints: DataPoint[];
}

interface ComparisonData {
  symbols: string[];
  range: string;
  series: SeriesEntry[];
}

// In-memory cache (5 min TTL)
const cache = new Map<string, { data: ComparisonData; ts: number }>();
const CACHE_TTL = 12 * 60 * 60_000;

const router = Router();

// GET /api/comparison - compare performance of multiple assets
router.get('/', async (req, res) => {
  try {
    const rawSymbols = (req.query.symbols as string) || '';
    const symbols = rawSymbols
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .filter(s => /^[A-Z0-9.\-^=]{1,20}$/.test(s));

    if (symbols.length < 2) {
      res.status(400).json({ error: 'At least 2 symbols required' });
      return;
    }
    if (symbols.length > 6) {
      res.status(400).json({ error: 'Maximum 6 symbols allowed' });
      return;
    }

    const range = (req.query.range as string) || '1y';
    if (!VALID_RANGES.includes(range as Range)) {
      res.status(400).json({ error: `Invalid range. Use one of: ${VALID_RANGES.join(', ')}` });
      return;
    }

    const cacheKey = `comp:${symbols.sort().join(',')}:${range}`;
    const entry = cache.get(cacheKey);
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
      res.json(entry.data);
      return;
    }

    const interval = RANGE_INTERVAL[range as Range];

    // Fetch all symbols in parallel
    const results = await Promise.allSettled(
      symbols.map(symbol => fetchChartData(symbol, range, interval))
    );

    const series: SeriesEntry[] = [];
    for (let i = 0; i < symbols.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        series.push(result.value);
      }
    }

    const payload: ComparisonData = {
      symbols: series.map(s => s.symbol),
      range,
      series,
    };

    cache.set(cacheKey, { data: payload, ts: Date.now() });
    res.json(payload);
  } catch (err) {
    console.error('[Comparison] Error fetching comparison data:', err);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

async function fetchChartData(
  symbol: string,
  range: string,
  interval: string,
): Promise<SeriesEntry | null> {
  try {
    const auth = await ensureCrumb();
    const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
    const cookieHeader = auth ? auth.cookie : '';

    const url = `${YAHOO_API}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}${crumbParam}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': YAHOO_UA,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

    if (timestamps.length === 0 || closes.length === 0) return null;

    // Find first valid close price for normalization
    let startPrice: number | null = null;
    for (const c of closes) {
      if (c !== null && c > 0) {
        startPrice = c;
        break;
      }
    }
    if (startPrice === null) return null;

    // Build normalized data points
    const dataPoints: DataPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close === null || close === undefined) continue;
      dataPoints.push({
        timestamp: timestamps[i],
        normalizedReturn: ((close - startPrice) / startPrice) * 100,
      });
    }

    if (dataPoints.length === 0) return null;

    // Current price and overall change
    const lastClose = closes.filter(c => c !== null && c !== undefined).pop() as number;
    const changePercent = ((lastClose - startPrice) / startPrice) * 100;

    return {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || symbol,
      currentPrice: meta.regularMarketPrice ?? lastClose,
      changePercent,
      dataPoints,
    };
  } catch (err) {
    console.error(`[Comparison] Error fetching chart for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export default router;
