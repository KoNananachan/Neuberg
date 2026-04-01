import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
// Alternative data proxies: satellite imagery (PLTR), web traffic (GOOGL), credit card (V/MA), social (SNAP/META)
const SYMBOLS = ['PLTR', 'GOOGL', 'V', 'MA', 'SNAP', 'META', 'AMZN', 'NFLX', 'DIS', 'UBER', 'ABNB', '^GSPC', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const categories = [
    { name: 'Credit Card Spending', stocks: ['V', 'MA'], signal: 'Consumer transaction volume' },
    { name: 'Web/App Traffic', stocks: ['GOOGL', 'META', 'SNAP'], signal: 'Digital engagement' },
    { name: 'E-Commerce', stocks: ['AMZN'], signal: 'Online spending trends' },
    { name: 'Travel/Mobility', stocks: ['UBER', 'ABNB'], signal: 'Movement and travel demand' },
    { name: 'Entertainment', stocks: ['NFLX', 'DIS'], signal: 'Content consumption' },
    { name: 'Geospatial/Analytics', stocks: ['PLTR'], signal: 'Enterprise data demand' },
  ].map(c => {
    const catStocks = c.stocks.map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), volume: q?.regularMarketVolume || 0, pe: r1(q?.trailingPE || 0) }; });
    const avgChange = catStocks.reduce((s, st) => s + st.change, 0) / catStocks.length;
    return { category: c.name, signal: c.signal, stocks: catStocks, avgChange: r2(avgChange), trend: avgChange > 0.5 ? 'Positive' : avgChange < -0.5 ? 'Negative' : 'Neutral' };
  });
  return { categories, summary: { overallSignal: categories.filter(c => c.trend === 'Positive').length > categories.length / 2 ? 'Bullish' : 'Mixed', vix: r1(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[AlternativeData] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
