import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AGG', 'MBB', 'LQD', 'BNDX', '^TNX', '^FVX', '^IRX', 'EURUSD=X'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const benchmarks = [
    { name: 'US Agency MBS', proxy: 'MBB', spread: 30 }, { name: 'US IG Corporate', proxy: 'LQD', spread: 90 },
    { name: 'US Aggregate', proxy: 'AGG', spread: 40 }, { name: 'Intl Bonds', proxy: 'BNDX', spread: 50 },
  ].map(b => { const q = qMap.get(b.proxy); return { sector: b.name, proxy: b.proxy, yield: r2((q?.trailingAnnualDividendYield || 0) * 100), spreadBps: b.spread, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; });
  return { benchmarks, yields: { fiveYear: r2(qMap.get('^FVX')?.regularMarketPrice || 0), tenYear: r2(tnx) }, eurUsd: r2(qMap.get('EURUSD=X')?.regularMarketPrice || 0), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CoveredBond] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
