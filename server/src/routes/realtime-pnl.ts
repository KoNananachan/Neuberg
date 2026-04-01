import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'JPM', 'XOM', '^VIX', '^GSPC'];
const CACHE_TTL = 2 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const positions = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'JPM', 'XOM'].map(sym => { const q = qMap.get(sym); const price = q?.regularMarketPrice || 0; const prevClose = q?.regularMarketPreviousClose || price; return { ticker: sym, name: q?.shortName || sym, price: r2(price), change: r2(q?.regularMarketChangePercent), pnlPerShare: r2(price - prevClose), volume: q?.regularMarketVolume || 0 }; });
  const benchmarks = ['SPY', 'QQQ', 'IWM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { positions, benchmarks, vix: r2(qMap.get('^VIX')?.regularMarketPrice), sp500Change: r2(qMap.get('^GSPC')?.regularMarketChangePercent), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[RealtimePnl]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
