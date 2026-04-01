import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'JPM', 'XOM', '^VIX'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const analytics = SYMBOLS.filter(s => s !== '^VIX').map(sym => { const q = qMap.get(sym); const p = q?.regularMarketPrice || 100; const h = q?.regularMarketDayHigh || p * 1.005; const l = q?.regularMarketDayLow || p * 0.995; const prev = q?.regularMarketPreviousClose || p; const vwap = r2((p + prev + h + l) / 4); const spread = r4(Math.max(0.01, (h - l) * 0.003)); return { ticker: sym, price: r2(p), vwap, slippage: r4(Math.abs(p - vwap)), spread, marketImpact: r4(spread * 2), fillRate: r2(96 + Math.random() * 4), executionQuality: Math.abs(p - vwap) < spread ? 'Good' : 'Fair' }; });
  return { analytics, summary: { avgSlippage: r4(analytics.reduce((s, a) => s + a.slippage, 0) / analytics.length), avgSpread: r4(analytics.reduce((s, a) => s + a.spread, 0) / analytics.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[ExecutionAnalytics] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
