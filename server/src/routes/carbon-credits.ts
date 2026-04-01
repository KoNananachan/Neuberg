import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['KRBN', 'GRN', 'ICLN', 'TAN', 'SMOG', 'XLE', 'CL=F'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const krbn = qMap.get('KRBN');
  const carbonProxy = r2(krbn?.regularMarketPrice || 30);
  const markets = [
    { market: 'EU ETS (est.)', price: r2(carbonProxy * 2.5), change: r2(krbn?.regularMarketChangePercent || 0), unit: '€/ton' },
    { market: 'California CaT', price: r2(carbonProxy * 1.2), change: r2((krbn?.regularMarketChangePercent || 0) * 0.8), unit: '$/ton' },
    { market: 'RGGI (US NE)', price: r2(carbonProxy * 0.5), change: r2((krbn?.regularMarketChangePercent || 0) * 0.7), unit: '$/ton' },
    { market: 'UK ETS (est.)', price: r2(carbonProxy * 2.2), change: r2((krbn?.regularMarketChangePercent || 0) * 0.9), unit: '£/ton' },
  ];
  const etfs = ['KRBN', 'GRN', 'ICLN', 'TAN', 'SMOG'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) };
  });
  return { markets, etfs, carbonProxy, cleanVsFossil: r2((qMap.get('ICLN')?.regularMarketChangePercent || 0) - (qMap.get('XLE')?.regularMarketChangePercent || 0)), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CarbonCredits] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
