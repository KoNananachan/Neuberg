import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^VIX', 'IPO', 'GS', 'MS', 'JPM', 'TSLA', 'RIVN', 'LCID', 'RBLX', 'COIN', 'HOOD', 'AFRM', 'SOFI'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const recentListings = ['TSLA', 'RIVN', 'LCID', 'RBLX', 'COIN', 'HOOD', 'AFRM', 'SOFI'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), vs52wHigh: q?.fiftyTwoWeekHigh ? r2(((q.regularMarketPrice || 0) - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh * 100) : 0 }; });
  return { recentListings, underwriters: ['GS', 'MS', 'JPM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, change: r2(q?.regularMarketChangePercent || 0) }; }), summary: { vix: r2(vix), ipoWindow: vix < 20 ? 'Open' : 'Cautious', spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityCapitalRaise] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
