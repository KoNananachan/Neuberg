import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^TNX', '^TYX', '^VIX', 'TLT', 'HYG', 'LQD', 'DXY=X', '^GSPC', 'GLD', 'BTC-USD', 'SPY'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const components = [
    { name: 'VIX (fear)', score: clamp(Math.round(100 - (vix - 12) * 3), 0, 100), signal: vix < 18 ? 'Ample' : vix > 25 ? 'Tight' : 'Normal' },
    { name: 'Credit Spreads', score: clamp(Math.round(50 + (qMap.get('HYG')?.regularMarketChangePercent || 0) * 15), 0, 100), signal: (qMap.get('HYG')?.regularMarketChangePercent || 0) > 0 ? 'Easing' : 'Tightening' },
    { name: 'Yield Curve', score: clamp(Math.round(50 + (tnx - irx) * 30), 0, 100), signal: (tnx - irx) < 0 ? 'Inverted' : 'Normal' },
    { name: 'Dollar', score: clamp(Math.round(50 - (qMap.get('DXY=X')?.regularMarketChangePercent || 0) * 10), 0, 100), signal: (qMap.get('DXY=X')?.regularMarketChangePercent || 0) > 0.3 ? 'Tightening' : 'Neutral' },
  ];
  const liquidityIndex = Math.round(components.reduce((s, c) => s + c.score, 0) / components.length);
  return { components, liquidityIndex, regime: liquidityIndex > 60 ? 'Ample' : liquidityIndex < 40 ? 'Tight' : 'Neutral', vix: r2(vix), btcProxy: r2(qMap.get('BTC-USD')?.regularMarketChangePercent || 0), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalLiquidityMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
