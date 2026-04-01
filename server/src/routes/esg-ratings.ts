import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['ESGU', 'ESGV', 'ESGE', 'SUSL', 'SUSA', 'ICLN', 'TAN', 'KRBN', 'XLE', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'NEE', 'XOM'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const esgEtfs = ['ESGU', 'ESGV', 'ESGE', 'SUSL', 'SUSA'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), aum: r1((q?.marketCap || 0) / 1e9) }; });
  const leaders = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'NEE'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), esgTier: sym === 'XOM' ? 'Laggard' : 'Leader' }; });
  const cleanVsFossil = r2((qMap.get('ICLN')?.regularMarketChangePercent || 0) - (qMap.get('XLE')?.regularMarketChangePercent || 0));
  return { esgEtfs, leaders, cleanVsFossil, carbonPrice: r2(qMap.get('KRBN')?.regularMarketPrice || 30), summary: { avgEsgEtfChange: r2(esgEtfs.reduce((s, e) => s + e.change, 0) / esgEtfs.length), esgMomentum: cleanVsFossil > 0 ? 'ESG outperforming' : 'Fossil outperforming' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[ESGRatings] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
