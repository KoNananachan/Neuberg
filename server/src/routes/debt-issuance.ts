import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['LQD', 'HYG', 'JNK', 'AGG', 'EMB', '^TNX', '^TYX', '^IRX', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const sectors = [{ name: 'IG Corporate', proxy: 'LQD' }, { name: 'High Yield', proxy: 'HYG' }, { name: 'EM', proxy: 'EMB' }].map(s => { const q = qMap.get(s.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { sector: s.name, yield: r2(yld), spread: r2(yld - tnx), change: r2(q?.regularMarketChangePercent || 0), issuanceWindow: vix < 20 && (q?.regularMarketChangePercent || 0) > 0 ? 'Wide Open' : vix > 25 ? 'Shut' : 'Selective' }; });
  return { sectors, yields: { threeMonth: r2(qMap.get('^IRX')?.regularMarketPrice || 5), tenYear: r2(tnx), thirtyYear: r2(qMap.get('^TYX')?.regularMarketPrice || 4.8) }, vix: r2(vix), issuanceEnvironment: vix < 20 ? 'Favorable' : vix > 28 ? 'Shut' : 'Selective', generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DebtIssuance] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
