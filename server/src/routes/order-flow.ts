import { Router } from 'express';
import { getHistory, getQuote } from '../services/stocks/yahoo-finance.js';

const router = Router();

// In-memory cache (2 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 2 * 60_000;
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data as T);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

// Prune stale cache entries periodically
function pruneCache() {
  if (cache.size > 200) {
    const now = Date.now();
    for (const [key, val] of cache) {
      if (now - val.ts > CACHE_TTL) cache.delete(key);
    }
  }
}

const VALID_RANGES = new Set(['1d', '5d', '1mo']);
const VALID_INTERVALS = new Set(['1m', '5m', '15m', '1h', '1d']);

const RANGE_INTERVAL_MAP: Record<string, string> = {
  '1d': '5m',
  '5d': '15m',
  '1mo': '1h',
};

const NUM_BINS = 30;

interface HistoryBar {
  date: string | number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

interface ProfileBin {
  priceLevel: number;
  totalVol: number;
  buyVol: number;
  sellVol: number;
  imbalance: number;
}

interface DeltaPoint {
  time: string;
  delta: number;
  price: number;
}

interface OrderFlowResult {
  symbol: string;
  range: string;
  currentPrice: number;
  profile: ProfileBin[];
  poc: number;
  valueArea: { high: number; low: number };
  cumulativeDelta: DeltaPoint[];
  summary: {
    totalBuyVol: number;
    totalSellVol: number;
    netDelta: number;
    vwap: number;
    buyPct: number;
  };
}

/**
 * Estimate buy/sell volume using close vs open method.
 */
function estimateBuySell(open: number, high: number, low: number, close: number, volume: number): { buyVol: number; sellVol: number } {
  const range = high - low;
  if (range === 0 || volume === 0) {
    return { buyVol: Math.round(volume / 2), sellVol: Math.round(volume / 2) };
  }

  if (close > open) {
    // Bullish candle: buy volume dominates
    const buyVol = Math.round(volume * (close - low) / range);
    return { buyVol, sellVol: volume - buyVol };
  } else if (close < open) {
    // Bearish candle: sell volume dominates
    const sellVol = Math.round(volume * (high - close) / range);
    return { buyVol: volume - sellVol, sellVol };
  }
  // Doji: split 50/50
  return { buyVol: Math.round(volume / 2), sellVol: Math.round(volume / 2) };
}

/**
 * Build the volume profile from OHLCV bars.
 */
function buildVolumeProfile(bars: HistoryBar[]): OrderFlowResult | null {
  // Filter valid bars
  const valid = bars.filter(
    (b): b is HistoryBar & { open: number; high: number; low: number; close: number; volume: number } =>
      b.open != null && b.high != null && b.low != null && b.close != null && b.volume != null && b.volume > 0,
  );

  if (valid.length === 0) return null;

  // Determine price range
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const bar of valid) {
    if (bar.low < minPrice) minPrice = bar.low;
    if (bar.high > maxPrice) maxPrice = bar.high;
  }

  const priceRange = maxPrice - minPrice;
  if (priceRange <= 0) return null;

  const binSize = priceRange / NUM_BINS;

  // Initialize bins
  const bins: ProfileBin[] = [];
  for (let i = 0; i < NUM_BINS; i++) {
    bins.push({
      priceLevel: Math.round((minPrice + binSize * (i + 0.5)) * 100) / 100,
      totalVol: 0,
      buyVol: 0,
      sellVol: 0,
      imbalance: 0,
    });
  }

  // Cumulative delta tracking
  let runningDelta = 0;
  const cumulativeDelta: DeltaPoint[] = [];

  // VWAP accumulators
  let vwapNumerator = 0;
  let vwapDenominator = 0;

  let totalBuyVol = 0;
  let totalSellVol = 0;

  for (const bar of valid) {
    const { buyVol, sellVol } = estimateBuySell(bar.open, bar.high, bar.low, bar.close, bar.volume);

    totalBuyVol += buyVol;
    totalSellVol += sellVol;

    // Cumulative delta
    runningDelta += (buyVol - sellVol);
    const timeStr = typeof bar.date === 'number'
      ? new Date(bar.date * 1000).toISOString()
      : bar.date;
    cumulativeDelta.push({
      time: timeStr,
      delta: runningDelta,
      price: bar.close,
    });

    // VWAP
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    vwapNumerator += typicalPrice * bar.volume;
    vwapDenominator += bar.volume;

    // Distribute volume across bins that overlap with the candle's range
    const barLow = bar.low;
    const barHigh = bar.high;
    for (let i = 0; i < NUM_BINS; i++) {
      const binLow = minPrice + binSize * i;
      const binHigh = minPrice + binSize * (i + 1);

      // Check overlap
      const overlapLow = Math.max(barLow, binLow);
      const overlapHigh = Math.min(barHigh, binHigh);

      if (overlapLow < overlapHigh) {
        const barRange = barHigh - barLow;
        const fraction = barRange > 0 ? (overlapHigh - overlapLow) / barRange : 1;
        const volForBin = Math.round(bar.volume * fraction);
        const buyForBin = Math.round(buyVol * fraction);
        const sellForBin = Math.round(sellVol * fraction);

        bins[i].totalVol += volForBin;
        bins[i].buyVol += buyForBin;
        bins[i].sellVol += sellForBin;
      }
    }
  }

  // Calculate imbalance for each bin
  for (const bin of bins) {
    if (bin.totalVol > 0) {
      bin.imbalance = Math.round(((bin.buyVol - bin.sellVol) / bin.totalVol) * 100) / 100;
    }
  }

  // Point of Control: bin with highest volume
  let pocIdx = 0;
  let pocVol = 0;
  for (let i = 0; i < bins.length; i++) {
    if (bins[i].totalVol > pocVol) {
      pocVol = bins[i].totalVol;
      pocIdx = i;
    }
  }
  const poc = bins[pocIdx].priceLevel;

  // Value Area: 70% of total volume centered on POC
  const totalVol = bins.reduce((sum, b) => sum + b.totalVol, 0);
  const targetVol = totalVol * 0.7;
  let vaVol = bins[pocIdx].totalVol;
  let vaLowIdx = pocIdx;
  let vaHighIdx = pocIdx;

  while (vaVol < targetVol && (vaLowIdx > 0 || vaHighIdx < bins.length - 1)) {
    const expandLow = vaLowIdx > 0 ? bins[vaLowIdx - 1].totalVol : -1;
    const expandHigh = vaHighIdx < bins.length - 1 ? bins[vaHighIdx + 1].totalVol : -1;

    if (expandLow >= expandHigh) {
      vaLowIdx--;
      vaVol += bins[vaLowIdx].totalVol;
    } else {
      vaHighIdx++;
      vaVol += bins[vaHighIdx].totalVol;
    }
  }

  const valueArea = {
    high: Math.round((minPrice + binSize * (vaHighIdx + 1)) * 100) / 100,
    low: Math.round((minPrice + binSize * vaLowIdx) * 100) / 100,
  };

  const vwap = vwapDenominator > 0
    ? Math.round((vwapNumerator / vwapDenominator) * 100) / 100
    : 0;

  const totalVolAll = totalBuyVol + totalSellVol;
  const buyPct = totalVolAll > 0
    ? Math.round((totalBuyVol / totalVolAll) * 1000) / 10
    : 50;

  return {
    symbol: '',
    range: '',
    currentPrice: 0,
    profile: bins,
    poc,
    valueArea,
    cumulativeDelta,
    summary: {
      totalBuyVol,
      totalSellVol,
      netDelta: totalBuyVol - totalSellVol,
      vwap,
      buyPct,
    },
  };
}

// GET /api/order-flow/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const range = (req.query.range as string) || '1d';
    const interval = (req.query.interval as string) || RANGE_INTERVAL_MAP[range] || '5m';

    if (!VALID_RANGES.has(range)) {
      return res.status(400).json({ error: 'Invalid range parameter' });
    }
    if (!VALID_INTERVALS.has(interval)) {
      return res.status(400).json({ error: 'Invalid interval parameter' });
    }

    const cacheKey = `order-flow:${symbol}:${range}:${interval}`;

    const result = await cached(cacheKey, async () => {
      // Fetch OHLCV data and current quote in parallel
      const [history, quote] = await Promise.all([
        getHistory(symbol, { range, interval }),
        getQuote(symbol),
      ]);

      const profile = buildVolumeProfile(history);
      if (!profile) {
        return null;
      }

      profile.symbol = symbol;
      profile.range = range;
      profile.currentPrice = quote?.price ?? 0;

      return profile;
    });

    if (!result) {
      return res.status(404).json({ error: 'No data available for this symbol' });
    }

    pruneCache();
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[OrderFlow] Error fetching order flow data:', msg);
    res.status(500).json({ error: 'Failed to fetch order flow data' });
  }
});

export default router;
