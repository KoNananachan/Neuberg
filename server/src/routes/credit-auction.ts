import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'LQD', 'JNK', 'AGG', '^TNX', '^TYX', '^IRX', '^VIX'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = [
    { name: 'Investment Grade', proxy: 'LQD' }, { name: 'High Yield', proxy: 'HYG' },
    { name: 'Junk', proxy: 'JNK' }, { name: 'Aggregate', proxy: 'AGG' },
  ].map(s => { const q = qMap.get(s.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { sector: s.name, proxy: s.proxy, yield: r2(yld), spreadBps: Math.round((yld - tnx) * 100), demand: (q?.regularMarketChangePercent || 0) > 0 ? 'Strong' : 'Weak', change: r2(q?.regularMarketChangePercent || 0) }; });
  return { sectors, yields: { threeMonth: r3(qMap.get('^IRX')?.regularMarketPrice || 5), tenYear: r3(tnx), thirtyYear: r3(qMap.get('^TYX')?.regularMarketPrice || 4.8) }, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CreditAuction] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
