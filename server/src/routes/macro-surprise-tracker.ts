import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^VIX', '^TNX', '^IRX', 'DXY=X', 'XLI', 'XLY', 'XLP', 'IYT', 'COPX', 'HYG', 'CL=F'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const sectors = [{ name: 'Industrial', proxy: 'XLI' }, { name: 'Consumer Disc', proxy: 'XLY' }, { name: 'Consumer Staples', proxy: 'XLP' }, { name: 'Transport', proxy: 'IYT' }, { name: 'Copper', proxy: 'COPX' }, { name: 'Credit', proxy: 'HYG' }].map(s => { const q = qMap.get(s.proxy); const chg = q?.regularMarketChangePercent || 0; return { sector: s.name, proxy: s.proxy, change: r2(chg), surprise: chg > 1 ? 'Positive' : chg < -1 ? 'Negative' : 'Inline' }; });
  const positives = sectors.filter(s => s.surprise === 'Positive').length;
  return { sectors, surpriseIndex: Math.round((positives / sectors.length) * 100), bias: positives > sectors.length / 2 ? 'Upside surprises' : 'Downside risks', vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MacroSurpriseTracker]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
