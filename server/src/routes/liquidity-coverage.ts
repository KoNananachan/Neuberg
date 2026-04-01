import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^TNX', '^VIX', 'SHV', 'BIL', 'TLT', 'HYG', 'SPY', 'DXY=X', 'GLD'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const components = [{ name: 'Short-Term Funding', proxy: 'SHV', score: clamp(Math.round(80 - (vix - 15) * 2), 0, 100) }, { name: 'Bond Market', proxy: 'TLT', score: clamp(Math.round(70 + (qMap.get('TLT')?.regularMarketChangePercent || 0) * 10), 0, 100) }, { name: 'Credit Markets', proxy: 'HYG', score: clamp(Math.round(65 + (qMap.get('HYG')?.regularMarketChangePercent || 0) * 12), 0, 100) }, { name: 'Equity Market', proxy: 'SPY', score: clamp(Math.round(60 + (qMap.get('SPY')?.regularMarketChangePercent || 0) * 8), 0, 100) }].map(c => ({ ...c, change: r2(qMap.get(c.proxy)?.regularMarketChangePercent || 0) }));
  const lcrScore = Math.round(components.reduce((s, c) => s + c.score, 0) / components.length);
  return { components, lcrScore, regime: lcrScore > 70 ? 'Ample' : lcrScore < 40 ? 'Tight' : 'Normal', vix: r2(vix), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LiquidityCoverage]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
