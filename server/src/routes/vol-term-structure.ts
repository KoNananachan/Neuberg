import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Symbols ──

const VIX_SYMBOLS = ['^VIX', '^VIX3M', '^VIX6M'];
const PRODUCT_SYMBOLS = ['VXX', 'SVXY', 'VIXM', 'UVXY', 'VX=F'];
const SPX_SYMBOL = '^GSPC';

const PRODUCT_INFO: Record<string, { name: string; description: string }> = {
  VXX: { name: 'iPath VIX Short-Term Futures', description: 'Short-term VIX futures exposure' },
  SVXY: { name: 'ProShares Short VIX', description: 'Inverse VIX short-term futures' },
  VIXM: { name: 'ProShares VIX Mid-Term', description: 'Mid-term VIX futures exposure' },
  UVXY: { name: 'ProShares Ultra VIX 2x', description: '2x leveraged VIX short-term' },
  'VX=F': { name: 'VIX Futures Front Month', description: 'CBOE VIX front-month future' },
};

// ── Helpers ──

function calcRealizedVol(closes: number[], window: number): number {
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

function calcSMA(values: number[], window: number): number {
  if (values.length < window) return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const slice = values.slice(values.length - window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calcPercentile(values: number[], current: number): number {
  if (values.length === 0) return 50;
  const below = values.filter((v) => v < current).length;
  return Math.round((below / values.length) * 100);
}

function getRegime(vix: number): 'low' | 'normal' | 'elevated' | 'high' | 'extreme' {
  if (vix >= 40) return 'extreme';
  if (vix >= 30) return 'high';
  if (vix >= 20) return 'elevated';
  if (vix >= 15) return 'normal';
  return 'low';
}

function rollingRealizedVol(closes: number[], window: number, points: number): number[] {
  const result: number[] = [];
  const start = Math.max(0, closes.length - points);
  for (let i = start; i < closes.length; i++) {
    const endIdx = i + 1;
    const startIdx = Math.max(0, endIdx - window - 1);
    const slice = closes.slice(startIdx, endIdx);
    result.push(calcRealizedVol(slice, window));
  }
  return result;
}

// ── Cache ──

let cache: { data: any; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 3 * 60_000; // 3 minutes

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch all data in parallel
    const [vixQuotes, productQuotes, spxHistory, vixHistory, vix3mHistory] = await Promise.all([
      getQuotes([...VIX_SYMBOLS, SPX_SYMBOL]),
      getQuotes(PRODUCT_SYMBOLS),
      getHistory(SPX_SYMBOL, { range: '6mo', interval: '1d' }),
      getHistory('^VIX', { range: '6mo', interval: '1d' }),
      getHistory('^VIX3M', { range: '6mo', interval: '1d' }),
    ]);

    // Extract quotes
    const allQuotes = [...vixQuotes, ...productQuotes];
    const quoteMap = new Map(allQuotes.map((q: any) => [q.symbol, q]));

    const vixQuote = quoteMap.get('^VIX') as any;
    const vix3mQuote = quoteMap.get('^VIX3M') as any;
    const vix6mQuote = quoteMap.get('^VIX6M') as any;

    const vix = vixQuote?.price ?? 0;
    const vixChangePct = vixQuote?.changePercent ?? 0;
    const vix3m = vix3mQuote?.price ?? null;
    const vix6m = vix6mQuote?.price ?? null;

    // VIX history closes
    const vixCloses = vixHistory
      .map((h: any) => h.close)
      .filter((c: number | null): c is number => c != null && c > 0);

    // VIX3M history closes
    const vix3mCloses = vix3mHistory
      .map((h: any) => h.close)
      .filter((c: number | null): c is number => c != null && c > 0);

    // SPX history closes and dates
    const spxData = spxHistory.filter((h: any) => h.close != null && h.close > 0);
    const spxCloses = spxData.map((h: any) => h.close as number);

    // ── Spot metrics ──
    const regime = getRegime(vix);
    // Use last 60 trading days for percentile
    const vixRecent60 = vixCloses.slice(-60);
    const percentile60d = calcPercentile(vixRecent60, vix);

    // ── Term structure ──
    let shape: 'contango' | 'backwardation' | 'flat' = 'flat';
    let spread = 0;
    let ratio = 1;
    let steepness = 5;

    if (vix > 0 && vix3m != null && vix3m > 0) {
      spread = ((vix3m - vix) / vix) * 100;
      ratio = vix / vix3m;

      if (spread > 1) {
        shape = 'contango';
      } else if (spread < -1) {
        shape = 'backwardation';
      } else {
        shape = 'flat';
      }

      // Steepness: normalize to 0-10 scale
      // Typical contango spread is 5-15%, backwardation can be -5% to -30%
      const absSpread = Math.abs(spread);
      steepness = Math.min(10, Math.round((absSpread / 3) * 10) / 10);
    }

    // ── Realized vs Implied ──
    const realizedVol20d = Math.round(calcRealizedVol(spxCloses, 20) * 100) / 100;
    const impliedVol = vix;
    const ivRvSpread = Math.round((impliedVol - realizedVol20d) * 100) / 100;

    let premium: 'high' | 'normal' | 'low';
    if (ivRvSpread > 5) premium = 'high';
    else if (ivRvSpread < -2) premium = 'low';
    else premium = 'normal';

    // ── Signals ──
    const vixSma20 = Math.round(calcSMA(vixCloses, 20) * 100) / 100;
    const vixSma20Deviation = vixSma20 > 0
      ? Math.round(((vix - vixSma20) / vixSma20) * 100 * 100) / 100
      : 0;

    // Mean reversion signal
    let meanReversion: 'overbought' | 'neutral' | 'oversold';
    if (vixSma20Deviation > 15) meanReversion = 'overbought';
    else if (vixSma20Deviation < -15) meanReversion = 'oversold';
    else meanReversion = 'neutral';

    // Spike risk: low VIX + strong contango = complacency = higher spike risk
    let spikeRisk: 'low' | 'moderate' | 'high';
    if (vix < 14 && shape === 'contango' && spread > 10) {
      spikeRisk = 'high';
    } else if (vix < 16 && shape === 'contango' && spread > 5) {
      spikeRisk = 'moderate';
    } else if (shape === 'backwardation' || vix > 25) {
      spikeRisk = 'low'; // Already elevated, spike already happened
    } else {
      spikeRisk = 'moderate';
    }

    // ── Products ──
    const products = PRODUCT_SYMBOLS.map((sym) => {
      const q = quoteMap.get(sym) as any;
      if (!q || !q.price) return null;
      return {
        symbol: q.symbol,
        name: PRODUCT_INFO[sym]?.name || q.name || sym,
        price: q.price ?? 0,
        changePct: q.changePercent ?? 0,
        description: PRODUCT_INFO[sym]?.description || '',
      };
    }).filter(Boolean);

    // ── History (last 60 trading days) ──
    const vixHistoryDates = vixHistory.map((h: any) => h.date);
    const vix3mMap = new Map(
      vix3mHistory.map((h: any) => [h.date, h.close]),
    );
    const spxMap = new Map(
      spxData.map((h: any) => [h.date, h.close]),
    );

    // Build rolling realized vol series
    const rvSeries = rollingRealizedVol(spxCloses, 20, Math.min(60, spxCloses.length - 21));
    // Align rvSeries with the last N spxData entries
    const rvOffset = spxData.length - rvSeries.length;

    const historyLength = Math.min(60, vixHistory.length);
    const historyStart = vixHistory.length - historyLength;

    const history: Array<{
      date: string;
      vix: number;
      vix3m: number | null;
      realizedVol: number;
      spxClose: number;
    }> = [];

    for (let i = historyStart; i < vixHistory.length; i++) {
      const h = vixHistory[i] as any;
      if (h.close == null || h.close <= 0) continue;

      const date = h.date;
      const vix3mVal = vix3mMap.get(date);
      const spxClose = spxMap.get(date);

      // Find matching realized vol
      const spxIdx = spxData.findIndex((s: any) => s.date === date);
      let rv = 0;
      if (spxIdx >= 0 && spxIdx >= rvOffset && rvSeries[spxIdx - rvOffset] != null) {
        rv = Math.round(rvSeries[spxIdx - rvOffset] * 100) / 100;
      }

      history.push({
        date: String(date),
        vix: Math.round(h.close * 100) / 100,
        vix3m: vix3mVal != null && vix3mVal > 0 ? Math.round(vix3mVal * 100) / 100 : null,
        realizedVol: rv,
        spxClose: spxClose != null ? Math.round(spxClose * 100) / 100 : 0,
      });
    }

    const result = {
      timestamp: new Date().toISOString(),
      spot: {
        vix: Math.round(vix * 100) / 100,
        vix3m: vix3m != null ? Math.round(vix3m * 100) / 100 : null,
        vix6m: vix6m != null ? Math.round(vix6m * 100) / 100 : null,
        changePct: Math.round(vixChangePct * 100) / 100,
        regime,
        percentile60d,
      },
      termStructure: {
        shape,
        spread: Math.round(spread * 100) / 100,
        ratio: Math.round(ratio * 1000) / 1000,
        steepness,
      },
      realizedVsImplied: {
        impliedVol: Math.round(impliedVol * 100) / 100,
        realizedVol20d,
        spread: ivRvSpread,
        premium,
      },
      signals: {
        spikeRisk,
        meanReversion,
        vixSma20,
        vixSma20Deviation,
      },
      products,
      history,
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: any) {
    console.error('[VolTermStructure] Error:', err?.message || err);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch vol term structure data' });
  }
});

export default router;
