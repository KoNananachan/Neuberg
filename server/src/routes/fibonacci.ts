import { Router } from 'express';
import { ensureCrumb, getQuotes } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const VALID_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y']);

interface FibLevel {
  level: string;
  price: number;
  isExtension: boolean;
}

interface FibExtension {
  level: string;
  price: number;
}

interface PriceSeries {
  timestamp: number;
  close: number;
  high: number;
  low: number;
}

interface FibonacciData {
  symbol: string;
  currentPrice: number;
  swingHigh: number;
  swingHighDate: string;
  swingLow: number;
  swingLowDate: string;
  trend: 'uptrend' | 'downtrend';
  levels: FibLevel[];
  extensions: FibExtension[];
  priceSeries: PriceSeries[];
}

interface FibonacciCache {
  data: FibonacciData;
  timestamp: number;
}

const cache = new Map<string, FibonacciCache>();
const CACHE_TTL = 5 * 60_000; // 5 minutes

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const RETRACEMENT_RATIOS = [
  { level: '0%', ratio: 0 },
  { level: '23.6%', ratio: 0.236 },
  { level: '38.2%', ratio: 0.382 },
  { level: '50%', ratio: 0.5 },
  { level: '61.8%', ratio: 0.618 },
  { level: '78.6%', ratio: 0.786 },
  { level: '100%', ratio: 1 },
];

const EXTENSION_RATIOS = [
  { level: '127.2%', ratio: 1.272 },
  { level: '161.8%', ratio: 1.618 },
  { level: '200%', ratio: 2.0 },
  { level: '261.8%', ratio: 2.618 },
];

function calculateFibonacciLevels(
  high: number,
  low: number,
  trend: 'uptrend' | 'downtrend',
): { levels: FibLevel[]; extensions: FibExtension[] } {
  const diff = high - low;

  const levels: FibLevel[] = RETRACEMENT_RATIOS.map(({ level, ratio }) => {
    // For uptrend: 0% = high (top), 100% = low (bottom)
    // Price = high - ratio * diff
    // For downtrend: 0% = low (bottom), 100% = high (top)
    // Price = low + ratio * diff
    const price =
      trend === 'uptrend' ? high - ratio * diff : low + ratio * diff;
    return { level, price: round2(price), isExtension: false };
  });

  const extensions: FibExtension[] = EXTENSION_RATIOS.map(
    ({ level, ratio }) => {
      const price =
        trend === 'uptrend' ? high - ratio * diff : low + ratio * diff;
      return { level, price: round2(price) };
    },
  );

  return { levels, extensions };
}

const router = Router();

// GET /api/fibonacci/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const range = VALID_RANGES.has(req.query.range as string)
      ? (req.query.range as string)
      : '6mo';

    // Check cache
    const cacheKey = `${symbol}:${range}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Fetch historical OHLC via Yahoo Finance chart API
    const auth = await ensureCrumb();
    const crumbParam = auth
      ? `&crumb=${encodeURIComponent(auth.crumb)}`
      : '';
    const headers: Record<string, string> = { 'User-Agent': YAHOO_UA };
    if (auth) headers['Cookie'] = auth.cookie;

    const chartUrl = `${YAHOO_API}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d${crumbParam}`;
    const chartResp = await fetch(chartUrl, { headers });

    if (!chartResp.ok) {
      return res
        .status(502)
        .json({ error: 'Failed to fetch chart data from upstream' });
    }

    const chartData = (await chartResp.json()) as any;
    const result = chartData?.chart?.result?.[0];
    if (!result) {
      return res
        .status(404)
        .json({ error: 'No chart data available for symbol' });
    }

    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const meta = result.meta || {};

    if (timestamps.length < 2) {
      return res
        .status(404)
        .json({ error: 'Insufficient data for Fibonacci analysis' });
    }

    // Build price series (filter null values)
    const priceSeries: PriceSeries[] = [];
    let swingHigh = -Infinity;
    let swingHighIdx = 0;
    let swingLow = Infinity;
    let swingLowIdx = 0;

    for (let i = 0; i < timestamps.length; i++) {
      const close = quotes.close?.[i];
      const high = quotes.high?.[i];
      const low = quotes.low?.[i];

      if (close == null || high == null || low == null) continue;

      priceSeries.push({
        timestamp: timestamps[i],
        close,
        high,
        low,
      });

      if (high > swingHigh) {
        swingHigh = high;
        swingHighIdx = i;
      }
      if (low < swingLow) {
        swingLow = low;
        swingLowIdx = i;
      }
    }

    if (priceSeries.length < 2 || swingHigh <= swingLow) {
      return res
        .status(404)
        .json({ error: 'Insufficient price data for Fibonacci analysis' });
    }

    // Get current price
    let currentPrice = meta.regularMarketPrice ?? null;
    if (currentPrice == null) {
      // Use last close
      currentPrice = priceSeries[priceSeries.length - 1]?.close;
    }
    if (currentPrice == null) {
      try {
        const quoteData = await getQuotes([symbol]);
        if (quoteData.length > 0 && quoteData[0].price) {
          currentPrice = quoteData[0].price;
        }
      } catch {
        currentPrice = priceSeries[priceSeries.length - 1]?.close ?? 0;
      }
    }

    // Determine trend based on midpoint
    const midpoint = (swingHigh + swingLow) / 2;
    const trend: 'uptrend' | 'downtrend' =
      currentPrice >= midpoint ? 'uptrend' : 'downtrend';

    // Calculate Fibonacci levels
    const { levels, extensions } = calculateFibonacciLevels(
      swingHigh,
      swingLow,
      trend,
    );

    // Format dates
    const swingHighDate = new Date(
      timestamps[swingHighIdx] * 1000,
    ).toISOString().split('T')[0];
    const swingLowDate = new Date(
      timestamps[swingLowIdx] * 1000,
    ).toISOString().split('T')[0];

    const data: FibonacciData = {
      symbol,
      currentPrice: round2(currentPrice),
      swingHigh: round2(swingHigh),
      swingHighDate,
      swingLow: round2(swingLow),
      swingLowDate,
      trend,
      levels,
      extensions,
      priceSeries,
    };

    // Cache result
    cache.set(cacheKey, { data, timestamp: Date.now() });

    res.json(data);
  } catch (err: any) {
    console.error(
      '[Fibonacci] Error calculating Fibonacci levels:',
      err?.message || err,
    );
    res.status(500).json({ error: 'Failed to calculate Fibonacci levels' });
  }
});

export default router;
