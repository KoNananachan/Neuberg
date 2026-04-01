import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX', 'SPY', 'QQQ', 'IWM', 'DIA', 'EFA', 'EEM', 'AGG', 'GLD', 'DXY=X', '^TNX'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const benchmarks = quotes.filter(q => q?.symbol).map(q => {
    const price = q.regularMarketPrice || 0;
    return {
      symbol: q.symbol!, name: q.shortName || q.symbol!, price: r2(price), change: r2(q.regularMarketChange || 0), changePct: r2(q.regularMarketChangePercent || 0),
      high52w: r2(q.fiftyTwoWeekHigh || 0), low52w: r2(q.fiftyTwoWeekLow || 0),
      vs52wHigh: q.fiftyTwoWeekHigh ? r1(((price - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100) : 0,
      fiftyDMA: r2(q.fiftyDayAverage || 0), twoHundredDMA: r2(q.twoHundredDayAverage || 0),
      aboveFiftyDMA: (q.fiftyDayAverage && price > q.fiftyDayAverage) || false,
      aboveTwoHundredDMA: (q.twoHundredDayAverage && price > q.twoHundredDayAverage) || false,
    };
  });
  const spx = benchmarks.find(b => b.symbol === '^GSPC');
  return { benchmarks, summary: { spxChange: spx?.changePct || 0, marketTrend: (spx?.changePct || 0) > 0.5 ? 'Bullish' : (spx?.changePct || 0) < -0.5 ? 'Bearish' : 'Neutral', aboveMaCount: benchmarks.filter(b => b.aboveTwoHundredDMA).length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BenchmarkTracker] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
