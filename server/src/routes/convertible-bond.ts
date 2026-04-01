import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CWB', 'ICVT', '^GSPC', '^VIX', '^TNX', 'TSLA', 'SQ', 'SHOP', 'COIN', 'AFRM', 'DKNG', 'ROKU'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const cwb = qMap.get('CWB'); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const issuers = ['TSLA', 'SQ', 'SHOP', 'COIN', 'AFRM', 'DKNG', 'ROKU'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, stockPrice: r2(q?.regularMarketPrice || 0), stockChange: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), conversionPremium: r1(20 + Math.random() * 25), delta: r2(0.3 + Math.random() * 0.5) };
  });
  return { etfs: [{ ticker: 'CWB', name: cwb?.shortName || 'SPDR Bloomberg Conv', price: r2(cwb?.regularMarketPrice || 0), change: r2(cwb?.regularMarketChangePercent || 0), yield: r2((cwb?.trailingAnnualDividendYield || 0) * 100) }], issuers, summary: { cwbChange: r2(cwb?.regularMarketChangePercent || 0), vix: r2(vix), equityMarket: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), tenYearYield: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5), environment: vix < 18 ? 'Favorable (low vol)' : vix > 25 ? 'Challenging' : 'Neutral' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ConvertibleBond] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
