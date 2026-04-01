import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'LQD', 'JNK', 'EMB', 'BNDX', '^TNX', '^VIX', 'XLF', 'KRE'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const sectors = [
    { name: 'US IG', proxy: 'LQD' }, { name: 'US HY', proxy: 'HYG' }, { name: 'US Junk', proxy: 'JNK' },
    { name: 'EM Sovereign', proxy: 'EMB' }, { name: 'Intl Corp', proxy: 'BNDX' },
  ].map(s => { const q = qMap.get(s.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { reference: s.name, spreadBps: Math.round((yld - tnx) * 100), change: r2(q?.regularMarketChangePercent || 0), protection: (yld - tnx) > 3 ? 'Expensive' : 'Affordable' }; });
  return { sectors, summary: { avgSpread: Math.round(sectors.reduce((s, c) => s + c.spreadBps, 0) / sectors.length), vix: r2(vix), creditStress: vix > 25 ? 'Elevated' : 'Normal' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CreditDefaultSwaps] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
