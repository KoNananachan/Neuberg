import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'XLK', 'XLE', '^GSPC', '^VIX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const positions = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL'].map(sym => { const q = qMap.get(sym); const price = q?.regularMarketPrice || 0; const high52 = q?.fiftyTwoWeekHigh || price; return { ticker: sym, name: q?.shortName || sym, price: r2(price), change: r2(q?.regularMarketChangePercent), from52wHigh: r2(high52 > 0 ? (price - high52) / high52 * 100 : 0) }; });
  const etfs = ['SPY', 'QQQ', 'IWM', 'XLK', 'XLE'].map(sym => { const q = qMap.get(sym); return { ticker: sym, change: r2(q?.regularMarketChangePercent) }; });
  return { positions, etfs, market: { sp500: r2(qMap.get('^GSPC')?.regularMarketPrice), vix: r2(qMap.get('^VIX')?.regularMarketPrice) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[TaxLossHarvest]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
