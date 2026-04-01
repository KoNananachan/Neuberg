import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'JNK', 'ANGL', 'FALN', 'BKLN', '^VIX', '^TNX', 'KRE', 'XLF'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = [{ name: 'High Yield', proxy: 'HYG' }, { name: 'Junk Bonds', proxy: 'JNK' }, { name: 'Fallen Angels', proxy: 'ANGL' }, { name: 'Rising Stars', proxy: 'FALN' }, { name: 'Leveraged Loans', proxy: 'BKLN' }].map(s => { const q = qMap.get(s.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100; const spread = yld - tnx; return { sector: s.name, proxy: s.proxy, yield: r2(yld), spread: r2(spread), change: r2(q?.regularMarketChangePercent || 0), distressLevel: spread > 5 ? 'Distressed' : spread > 3 ? 'Stressed' : 'Normal' }; });
  return { sectors, summary: { distressedCount: sectors.filter(s => s.distressLevel === 'Distressed').length, avgSpread: r2(sectors.reduce((s, sec) => s + sec.spread, 0) / sectors.length), vix: r2(vix), defaultRisk: vix > 30 ? 'Elevated' : 'Moderate' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DistressedDebt] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
