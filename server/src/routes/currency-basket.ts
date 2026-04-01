import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['DXY=X', 'EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'USDCHF=X', 'USDCAD=X', 'AUDUSD=X', 'NZDUSD=X', 'USDCNY=X', 'USDINR=X', 'USDMXN=X', 'UUP', 'FXE', 'FXY', 'FXB'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const majors = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'USDCHF=X', 'USDCAD=X', 'AUDUSD=X', 'NZDUSD=X'].map(sym => { const q = qMap.get(sym); const names: Record<string, string> = { 'EURUSD=X': 'EUR/USD', 'USDJPY=X': 'USD/JPY', 'GBPUSD=X': 'GBP/USD', 'USDCHF=X': 'USD/CHF', 'USDCAD=X': 'USD/CAD', 'AUDUSD=X': 'AUD/USD', 'NZDUSD=X': 'NZD/USD' }; return { pair: names[sym] || sym, rate: r4(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0) }; });
  const em = ['USDCNY=X', 'USDINR=X', 'USDMXN=X'].map(sym => { const q = qMap.get(sym); const names: Record<string, string> = { 'USDCNY=X': 'USD/CNY', 'USDINR=X': 'USD/INR', 'USDMXN=X': 'USD/MXN' }; return { pair: names[sym] || sym, rate: r4(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0) }; });
  const dxy = qMap.get('DXY=X');
  return { majors, emergingMarket: em, dollarIndex: { value: r2(dxy?.regularMarketPrice || 104), change: r2(dxy?.regularMarketChangePercent || 0), strength: (dxy?.regularMarketChangePercent || 0) > 0.3 ? 'Strengthening' : (dxy?.regularMarketChangePercent || 0) < -0.3 ? 'Weakening' : 'Stable' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CurrencyBasket] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
