import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'VIG', 'SCHD', 'NOBL', 'DVY', 'SDY', 'DGRO', 'EFA', 'EEM', '^TNX', '^GSPC'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const indices = ['SPY', 'VIG', 'SCHD', 'NOBL', 'DVY', 'SDY', 'DGRO', 'EFA', 'EEM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  return { indices, tenYear: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5), spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), avgDivYield: r2(indices.reduce((s, i) => s + i.dividendYield, 0) / indices.length), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DividendSwaps] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
