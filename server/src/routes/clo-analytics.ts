import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BKLN', 'SRLN', 'FLOT', 'HYG', 'JNK', 'ANGL', 'FALN', '^IRX', '^TNX', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const etfs = ['BKLN', 'SRLN', 'FLOT', 'HYG', 'JNK', 'ANGL', 'FALN'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), spreadVsBase: r2(((q?.trailingAnnualDividendYield || 0) * 100) - irx) };
  });
  const defaultRateProxy = (qMap.get('ANGL')?.regularMarketChangePercent || 0) < -1 ? 'Rising' : 'Stable';
  return { etfs, summary: { baseRate: r2(irx), avgYield: r2(etfs.reduce((s, e) => s + e.yield, 0) / etfs.length), defaultRateProxy, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), creditConditions: (qMap.get('^VIX')?.regularMarketPrice || 20) > 25 ? 'Tight' : 'Normal' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CLOAnalytics] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
