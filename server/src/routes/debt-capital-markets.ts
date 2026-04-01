import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['LQD', 'HYG', 'JNK', 'AGG', 'EMB', 'MUB', '^TNX', '^TYX', '^IRX', '^VIX', 'GS', 'MS', 'JPM'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = [{ name: 'Investment Grade', proxy: 'LQD' }, { name: 'High Yield', proxy: 'HYG' }, { name: 'Aggregate', proxy: 'AGG' }, { name: 'EM Bonds', proxy: 'EMB' }, { name: 'Municipal', proxy: 'MUB' }].map(s => { const q = qMap.get(s.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { sector: s.name, proxy: s.proxy, yield: r2(yld), spread: r2(yld - tnx), change: r2(q?.regularMarketChangePercent || 0), issuanceWindow: (q?.regularMarketChangePercent || 0) > 0 ? 'Open' : 'Challenging' }; });
  const banks = ['GS', 'MS', 'JPM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, change: r2(q?.regularMarketChangePercent || 0) }; });
  return { sectors, underwriters: banks, yields: { threeMonth: r2(qMap.get('^IRX')?.regularMarketPrice || 5), tenYear: r2(tnx), thirtyYear: r2(qMap.get('^TYX')?.regularMarketPrice || 4.8) }, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DebtCapitalMarkets] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
