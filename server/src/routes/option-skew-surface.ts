import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^GSPC', '^IXIC', '^RUT', 'SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'UVXY', 'SVXY'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = r2(qMap.get('^VIX')?.regularMarketPrice);
  const indices = ['^GSPC', '^IXIC', '^RUT'].map(sym => { const q = qMap.get(sym); return { index: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const underlyings = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), volume: q?.regularMarketVolume || 0 }; });
  const volProducts = ['UVXY', 'SVXY'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { vix, vixChange: r2(qMap.get('^VIX')?.regularMarketChangePercent), indices, underlyings, volProducts, volRegime: vix > 30 ? 'High Vol' : vix > 20 ? 'Elevated' : vix > 15 ? 'Normal' : 'Low Vol', generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[OptionSkewSurface]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
