import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^TNX', 'SHV', 'BIL', 'AGG', 'TLT', 'HYG', 'GLD', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const pools = [
    { name: 'Treasury Bills', proxy: 'SHV', quality: 'Highest' }, { name: 'Short-Term Treasury', proxy: 'BIL', quality: 'Highest' },
    { name: 'Aggregate Bonds', proxy: 'AGG', quality: 'High' }, { name: 'Long Treasury', proxy: 'TLT', quality: 'High' },
    { name: 'High Yield', proxy: 'HYG', quality: 'Medium' }, { name: 'Gold', proxy: 'GLD', quality: 'Medium' },
  ].map(p => { const q = qMap.get(p.proxy); return { ...p, value: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  return { pools, summary: { repoRate: r3(irx - 0.05), vix: r2(vix), collateralStress: vix > 30 ? 'High' : vix > 20 ? 'Moderate' : 'Low', totalPools: pools.length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CollateralMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
