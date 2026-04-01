import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'SHV', 'SHY', 'IEI', 'IEF', 'TLH', 'TLT', 'AGG', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const buckets = [{ name: 'Ultra Short', etf: 'SHV', duration: 0.3 }, { name: 'Short', etf: 'SHY', duration: 1.9 }, { name: 'Intermediate Short', etf: 'IEI', duration: 4.4 }, { name: 'Intermediate', etf: 'IEF', duration: 7.5 }, { name: 'Long Intermediate', etf: 'TLH', duration: 11 }, { name: 'Long', etf: 'TLT', duration: 17 }].map(b => { const q = qMap.get(b.etf); return { bucket: b.name, etf: b.etf, duration: b.duration, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), priceImpact1bps: r2(b.duration * 0.01) }; });
  const curveSlope = r3(tyx - irx);
  const recommendation = curveSlope < 0 ? 'Shorten duration (inverted curve)' : curveSlope > 0.5 ? 'Extend duration (steep curve)' : 'Neutral positioning';
  return { buckets, summary: { curveSlope, recommendation, avgDuration: r2(buckets.reduce((s, b) => s + b.duration, 0) / buckets.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DurationManagement] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
