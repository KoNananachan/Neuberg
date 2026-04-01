import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^TNX', '^TYX', 'SHV', 'AGG', 'LQD', 'HYG', 'TLT', 'GLD', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const assets = [
    { name: 'T-Bills', proxy: 'SHV', haircut: 2, substitutability: 'High' },
    { name: 'Aggregate Bonds', proxy: 'AGG', haircut: 5, substitutability: 'High' },
    { name: 'IG Corporate', proxy: 'LQD', haircut: 8, substitutability: 'Medium' },
    { name: 'High Yield', proxy: 'HYG', haircut: 15, substitutability: 'Low' },
    { name: 'Long Treasury', proxy: 'TLT', haircut: 6, substitutability: 'High' },
    { name: 'Gold', proxy: 'GLD', haircut: 12, substitutability: 'Medium' },
  ].map(a => {
    const q = qMap.get(a.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100;
    return { ...a, yield: r2(yld), price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), costOfCarry: r3(irx - yld), optimalWeight: a.haircut < 8 ? 'Overweight' : 'Underweight' };
  });
  return { assets, summary: { shortTermRate: r3(irx), vix: r2(vix), optimizationSignal: vix > 25 ? 'Shift to higher quality' : 'Normal allocation' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CollateralOptimization] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
