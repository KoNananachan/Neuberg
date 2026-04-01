import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'META', 'GOOGL', '^VIX', 'VIRT', 'FLOW'];
const CACHE_TTL = 2 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const stocks = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'META', 'GOOGL'].map(sym => { const q = qMap.get(sym); const p = q?.regularMarketPrice || 100; const h = q?.regularMarketDayHigh || p * 1.005; const l = q?.regularMarketDayLow || p * 0.995; const spread = r4(Math.max(0.01, (h - l) * 0.003)); return { ticker: sym, price: r2(p), spread, spreadBps: r2(spread / p * 10000), volume: q?.regularMarketVolume || 0, mmRevenue: r2(spread * (q?.regularMarketVolume || 0) / 2 / 1e6) }; });
  const virt = qMap.get('VIRT');
  return { stocks, marketMakers: [{ ticker: 'VIRT', name: virt?.shortName || 'Virtu Financial', price: r2(virt?.regularMarketPrice || 0), change: r2(virt?.regularMarketChangePercent || 0) }], summary: { vix: r2(vix), avgSpreadBps: r2(stocks.reduce((s, st) => s + st.spreadBps, 0) / stocks.length), volEnvironment: vix > 22 ? 'Favorable (wider spreads)' : 'Tight' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MarketMaking]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
