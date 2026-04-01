import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['FM', 'FRN', 'EMB', 'EMLC', 'EEM', 'DXY=X', '^TNX', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const etfs = ['FM', 'FRN', 'EMB', 'EMLC'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), spreadVsUST: r2(((q?.trailingAnnualDividendYield || 0) * 100) - tnx) }; });
  return { etfs, summary: { dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), emEquityChange: r2(qMap.get('EEM')?.regularMarketChangePercent || 0), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), avgSpread: r2(etfs.reduce((s, e) => s + e.spreadVsUST, 0) / etfs.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FrontierMarketDebt] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
