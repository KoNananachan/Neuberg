import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', 'SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'GOOGL', 'JPM', 'XLF', 'XLE', '^GSPC'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = r2(qMap.get('^VIX')?.regularMarketPrice);
  const underlyings = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'GOOGL', 'JPM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), volume: q?.regularMarketVolume || 0, dayRange: `${r2(q?.regularMarketDayLow)}-${r2(q?.regularMarketDayHigh)}` }; });
  return { vix, volEnvironment: vix > 25 ? 'High' : vix > 18 ? 'Normal' : 'Low', underlyings, sp500: r2(qMap.get('^GSPC')?.regularMarketPrice), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[OptionStrategyBuilder]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
