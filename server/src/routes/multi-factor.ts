import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['MTUM', 'VLUE', 'SIZE', 'QUAL', 'USMV', 'SPY', 'IWM', 'IWD', 'IWF', '^VIX', '^GSPC', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'XOM'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const factorEtfs = [{ sym: 'MTUM', factor: 'Momentum' }, { sym: 'VLUE', factor: 'Value' }, { sym: 'SIZE', factor: 'Size' }, { sym: 'QUAL', factor: 'Quality' }, { sym: 'USMV', factor: 'Low Volatility' }].map(f => { const q = qMap.get(f.sym); return { factor: f.factor, ticker: f.sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), volume: q?.regularMarketVolume || 0 }; });
  const stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'XOM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), pe: r2(q?.trailingPE), marketCap: r2((q?.marketCap || 0) / 1e9) }; });
  const spy = qMap.get('SPY'); const iwm = qMap.get('IWM'); const vix = qMap.get('^VIX');
  return { factorEtfs, stocks, benchmarks: { spy: { price: r2(spy?.regularMarketPrice), change: r2(spy?.regularMarketChangePercent) }, iwm: { price: r2(iwm?.regularMarketPrice), change: r2(iwm?.regularMarketChangePercent) }, vix: r2(vix?.regularMarketPrice) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MultiFactor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
