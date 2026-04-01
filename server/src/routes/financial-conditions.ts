import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^VIX', '^TNX', '^IRX', 'HYG', 'LQD', 'DXY=X', 'TLT', 'SPY', 'IWM', 'KRE', 'BKLN'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const components = [
    { name: 'Equity Market', value: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), score: clamp(Math.round(50 + (qMap.get('^GSPC')?.regularMarketChangePercent || 0) * 10), 0, 100), signal: (qMap.get('^GSPC')?.regularMarketChangePercent || 0) > 0 ? 'Easing' : 'Tightening' },
    { name: 'Volatility', value: r2(vix), score: clamp(Math.round(100 - (vix - 12) * 3), 0, 100), signal: vix < 18 ? 'Easing' : vix > 25 ? 'Tightening' : 'Neutral' },
    { name: 'Credit Spreads', value: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), score: clamp(Math.round(50 + (qMap.get('HYG')?.regularMarketChangePercent || 0) * 12), 0, 100), signal: (qMap.get('HYG')?.regularMarketChangePercent || 0) > 0 ? 'Easing' : 'Tightening' },
    { name: 'Yield Curve', value: r2(tnx - irx), score: clamp(Math.round(50 + (tnx - irx) * 30), 0, 100), signal: (tnx - irx) < 0 ? 'Tight (inverted)' : 'Normal' },
    { name: 'Dollar', value: r2(qMap.get('DXY=X')?.regularMarketChangePercent || 0), score: clamp(Math.round(50 - (qMap.get('DXY=X')?.regularMarketChangePercent || 0) * 10), 0, 100), signal: (qMap.get('DXY=X')?.regularMarketChangePercent || 0) > 0.3 ? 'Tightening' : 'Neutral' },
  ];
  const fci = Math.round(components.reduce((s, c) => s + c.score, 0) / components.length);
  return { components, fci, regime: fci > 60 ? 'Easy' : fci < 40 ? 'Tight' : 'Neutral', generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FinancialConditions] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
