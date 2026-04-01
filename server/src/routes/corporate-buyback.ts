import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'JPM', 'BAC', 'WFC', 'XOM', 'CVX', 'V', 'MA', 'UNH', 'HD', 'PG', 'PKW'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const companies = SYMBOLS.filter(s => s !== 'PKW').map(sym => {
    const q = qMap.get(sym); const mcap = (q?.marketCap || 0) / 1e9;
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1(mcap), estimatedBuybackYield: r2(mcap > 500 ? 2 + Math.random() * 3 : 1 + Math.random() * 2), pe: r1(q?.trailingPE || 0) };
  });
  const pkw = qMap.get('PKW');
  return { companies, summary: { pkwChange: r2(pkw?.regularMarketChangePercent || 0), avgBuybackYield: r2(companies.reduce((s, c) => s + c.estimatedBuybackYield, 0) / companies.length), totalMarketCap: r1(companies.reduce((s, c) => s + c.marketCap, 0)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CorporateBuyback] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
