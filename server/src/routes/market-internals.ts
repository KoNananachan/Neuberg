import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^IXIC', '^RUT', '^VIX', 'SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'HYG'];
const CACHE_TTL = 2 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const sectors = ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI'].map(sym => { const q = qMap.get(sym); return { sector: q?.shortName || sym, etf: sym, change: r2(q?.regularMarketChangePercent || 0) }; });
  const advancers = sectors.filter(s => s.change > 0).length;
  const indices = ['^GSPC', '^IXIC', '^RUT'].map(sym => { const q = qMap.get(sym); return { index: q?.shortName || sym, change: r2(q?.regularMarketChangePercent || 0) }; });
  return { sectors, indices, internals: { sectorBreadth: `${advancers}/${sectors.length} advancing`, upDownRatio: r2(advancers > 0 ? advancers / (sectors.length - advancers || 1) : 0), vix: r2(vix), creditSignal: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), marketTone: advancers > 4 ? 'Bullish' : advancers < 3 ? 'Bearish' : 'Mixed' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MarketInternals]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
