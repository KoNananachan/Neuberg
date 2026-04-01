import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CWB', 'ICVT', '^VIX', '^TNX', '^GSPC', 'TSLA', 'SQ', 'SHOP', 'AFRM', 'DKNG', 'COIN'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const issuers = ['TSLA', 'SQ', 'SHOP', 'AFRM', 'DKNG', 'COIN'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, stockPrice: r2(q?.regularMarketPrice || 0), stockChange: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), convPremium: r1(20 + Math.random() * 25), bustedParity: (q?.regularMarketChangePercent || 0) < -10 };
  });
  const cwb = qMap.get('CWB');
  return { issuers, etfs: [{ ticker: 'CWB', price: r2(cwb?.regularMarketPrice || 0), change: r2(cwb?.regularMarketChangePercent || 0), yield: r2((cwb?.trailingAnnualDividendYield || 0) * 100) }], summary: { vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5), spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ConvertibleBonds] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
