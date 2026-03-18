import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── VIX term structure symbols ──
const VIX_SYMBOLS = ['^VIX', '^VIX9D', '^VIX3M', '^VIX6M'];
const VOL_ETF_SYMBOLS = ['VIXY', 'VIXM', 'UVXY', 'SVXY'];

const ETF_NAMES: Record<string, string> = {
  VIXY: 'ProShares VIX Short-Term',
  VIXM: 'ProShares VIX Mid-Term',
  UVXY: 'ProShares Ultra VIX 2x',
  SVXY: 'ProShares Short VIX',
};

// ── Helpers ──

function calcHistoricalVol(closes: number[], window: number): number {
  if (closes.length < window + 1) return 0;
  const slice = closes.slice(closes.length - window - 1);
  const returns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    if (slice[i - 1] > 0 && slice[i] > 0) {
      returns.push(Math.log(slice[i] / slice[i - 1]));
    }
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function calcVixPercentile(vixCloses: number[], current: number): number {
  if (vixCloses.length === 0) return 50;
  const below = vixCloses.filter((v) => v < current).length;
  return Math.round((below / vixCloses.length) * 100);
}

function calcRollingHV(closes: number[], hvWindow: number, points: number): Array<{ timestamp: number; hv20: number }> {
  const result: Array<{ timestamp: number; hv20: number }> = [];
  const startIdx = closes.length - points - hvWindow;
  if (startIdx < 1) return result;

  for (let i = 0; i < points; i++) {
    const endIdx = startIdx + hvWindow + i + 1;
    const slice = closes.slice(endIdx - hvWindow - 1, endIdx);
    const hv = calcHistoricalVol(slice, hvWindow);
    result.push({ timestamp: endIdx, hv20: Math.round(hv * 100) / 100 });
  }
  return result;
}

// ── Market-wide cache ──
let marketCache: { data: any; expiresAt: number } = { data: null, expiresAt: 0 };
const MARKET_CACHE_TTL = 120_000; // 2 minutes

// ── Per-symbol cache ──
const symbolCache = new Map<string, { data: any; expiresAt: number }>();
const SYMBOL_CACHE_TTL = 300_000; // 5 minutes

// GET /api/volatility - market-wide volatility data
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (marketCache.data && now < marketCache.expiresAt) {
      return res.json(marketCache.data);
    }

    const [vixQuotes, etfQuotes, spHistory, vixHistory] = await Promise.all([
      getQuotes(VIX_SYMBOLS),
      getQuotes(VOL_ETF_SYMBOLS),
      getHistory('^GSPC', { range: '1y', interval: '1d' }),
      getHistory('^VIX', { range: '1y', interval: '1d' }),
    ]);

    // Extract VIX values
    const vixQuote = vixQuotes.find((q: any) => q.symbol === '^VIX');
    const vix9dQuote = vixQuotes.find((q: any) => q.symbol === '^VIX9D');
    const vix3mQuote = vixQuotes.find((q: any) => q.symbol === '^VIX3M');
    const vix6mQuote = vixQuotes.find((q: any) => q.symbol === '^VIX6M');

    const vix = vixQuote?.price ?? 0;
    const vixChange = vixQuote?.change ?? 0;
    const vixChangePercent = vixQuote?.changePercent ?? 0;
    const vix9d = vix9dQuote?.price ?? null;
    const vix3m = vix3mQuote?.price ?? null;
    const vix6m = vix6mQuote?.price ?? null;

    // Build term structure
    const termStructure: Array<{ tenor: string; value: number }> = [];
    if (vix9d != null) termStructure.push({ tenor: '9D', value: vix9d });
    if (vix > 0) termStructure.push({ tenor: '1M', value: vix });
    if (vix3m != null) termStructure.push({ tenor: '3M', value: vix3m });
    if (vix6m != null) termStructure.push({ tenor: '6M', value: vix6m });

    // Contango: VIX3M > VIX means contango (complacent)
    const isContango = vix3m != null && vix > 0 ? vix3m > vix : false;

    // S&P 500 historical volatility
    const spCloses = spHistory
      .map((h: any) => h.close)
      .filter((c: number | null): c is number => c != null && c > 0);

    const hv20 = Math.round(calcHistoricalVol(spCloses, 20) * 100) / 100;
    const hv60 = Math.round(calcHistoricalVol(spCloses, 60) * 100) / 100;
    const hv252 = Math.round(calcHistoricalVol(spCloses, Math.min(252, spCloses.length - 1)) * 100) / 100;

    // VIX percentile and 252-day range
    const vixCloses = vixHistory
      .map((h: any) => h.close)
      .filter((c: number | null): c is number => c != null && c > 0);

    const vixPercentile = calcVixPercentile(vixCloses, vix);
    const vixHigh252 = vixCloses.length > 0 ? Math.max(...vixCloses) : vix;
    const vixLow252 = vixCloses.length > 0 ? Math.min(...vixCloses) : vix;

    // ETF data
    const etfs = etfQuotes.map((q: any) => ({
      symbol: q.symbol,
      name: ETF_NAMES[q.symbol] || q.symbol,
      price: q.price ?? 0,
      changePercent: q.changePercent ?? 0,
    }));

    const data = {
      vix,
      vixChange,
      vixChangePercent,
      vix9d,
      vix3m,
      vix6m,
      termStructure,
      isContango,
      hv20,
      hv60,
      hv252,
      vixPercentile,
      vixHigh252: Math.round(vixHigh252 * 100) / 100,
      vixLow252: Math.round(vixLow252 * 100) / 100,
      etfs,
    };

    marketCache = { data, expiresAt: now + MARKET_CACHE_TTL };
    res.json(data);
  } catch (err: any) {
    console.error('[Volatility] Error fetching market data:', err?.message || err);
    if (marketCache.data) return res.json(marketCache.data);
    res.status(500).json({ error: 'Failed to fetch volatility data' });
  }
});

// GET /api/volatility/:symbol - per-stock volatility data
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const now = Date.now();

    const cached = symbolCache.get(symbol);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    const [history, quotes] = await Promise.all([
      getHistory(symbol, { range: '1y', interval: '1d' }),
      getQuotes([symbol]),
    ]);

    const quote = quotes[0];
    const closes = history
      .map((h: any) => h.close)
      .filter((c: number | null): c is number => c != null && c > 0);

    const hv20 = Math.round(calcHistoricalVol(closes, 20) * 100) / 100;
    const hv60 = Math.round(calcHistoricalVol(closes, 60) * 100) / 100;
    const hv252 = Math.round(calcHistoricalVol(closes, Math.min(252, closes.length - 1)) * 100) / 100;

    // Rolling 20-day HV for the last 60 data points
    const hvSeries = calcRollingHV(closes, 20, Math.min(60, closes.length - 21));

    const data = {
      symbol,
      price: quote?.price ?? 0,
      hv20,
      hv60,
      hv252,
      hvSeries,
    };

    symbolCache.set(symbol, { data, expiresAt: now + SYMBOL_CACHE_TTL });

    // Evict old entries
    if (symbolCache.size > 200) {
      for (const [key, val] of symbolCache) {
        if (now > val.expiresAt) symbolCache.delete(key);
      }
    }

    res.json(data);
  } catch (err: any) {
    console.error('[Volatility] Error fetching stock data:', err?.message || err);
    const symbol = req.params.symbol.toUpperCase();
    const cached = symbolCache.get(symbol);
    if (cached) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch stock volatility data' });
  }
});

export default router;
