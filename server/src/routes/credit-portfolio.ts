import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['LQD', 'HYG', 'JNK', 'AGG', 'EMB', 'MUB', 'TIP', 'BNDX', 'VCSH', 'VCIT', 'VCLT', '^TNX', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const holdings = ['LQD', 'HYG', 'JNK', 'AGG', 'EMB', 'MUB', 'TIP', 'BNDX', 'VCSH', 'VCIT', 'VCLT'].map(sym => { const q = qMap.get(sym); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { etf: sym, name: q?.shortName || sym, weight: Math.round(100 / 11), price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2(yld), spreadVsTsy: r2(yld - tnx), quality: yld - tnx < 1 ? 'High' : yld - tnx < 3 ? 'Medium' : 'Low' }; });
  const portfolioReturn = r2(holdings.reduce((s, h) => s + h.change * h.weight / 100, 0));
  const portfolioYield = r2(holdings.reduce((s, h) => s + h.yield * h.weight / 100, 0));
  return { holdings, summary: { portfolioReturn, portfolioYield, avgSpread: r2(holdings.reduce((s, h) => s + h.spreadVsTsy, 0) / holdings.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CreditPortfolio] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
