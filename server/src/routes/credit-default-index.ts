import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'LQD', 'JNK', 'EMB', 'ANGL', 'FALN', '^TNX', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const indices = [
    { name: 'CDX IG', proxy: 'LQD', base: 55 }, { name: 'CDX HY', proxy: 'HYG', base: 350 },
    { name: 'CDX EM', proxy: 'EMB', base: 280 }, { name: 'Fallen Angels', proxy: 'ANGL', base: 300 },
  ].map(idx => { const q = qMap.get(idx.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { index: idx.name, spreadBps: Math.round((yld - tnx) * 100), historicalAvg: idx.base, change: r2(q?.regularMarketChangePercent || 0), signal: Math.round((yld - tnx) * 100) > idx.base * 1.2 ? 'Wide' : 'Normal' }; });
  return { indices, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CreditDefaultIndex] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
