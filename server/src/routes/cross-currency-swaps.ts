import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X', 'DXY=X', '^IRX', '^TNX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const pairs = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X'].map(sym => {
    const q = qMap.get(sym); const names: Record<string, string> = { 'EURUSD=X': 'EUR/USD', 'USDJPY=X': 'USD/JPY', 'GBPUSD=X': 'GBP/USD', 'USDCHF=X': 'USD/CHF', 'AUDUSD=X': 'AUD/USD', 'USDCAD=X': 'USD/CAD', 'NZDUSD=X': 'NZD/USD' };
    return { pair: names[sym] || sym, rate: r4(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0), high: r4(q?.regularMarketDayHigh || (q?.regularMarketPrice || 1) * 1.002), low: r4(q?.regularMarketDayLow || (q?.regularMarketPrice || 1) * 0.998) };
  });
  return { pairs, dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), dollarChange: r2(qMap.get('DXY=X')?.regularMarketChangePercent || 0), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CrossCurrencySwaps] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
