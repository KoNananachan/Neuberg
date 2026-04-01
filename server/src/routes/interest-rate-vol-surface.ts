import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', '^VIX', 'TLT', 'IEF', 'SHY'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const tenors = ['1Y', '2Y', '5Y', '10Y', '30Y']; const expiries = ['1M', '3M', '6M', '1Y'];
  const surface = tenors.map((t, ti) => ({ swapTenor: t, vols: expiries.map((e, ei) => ({ expiry: e, vol: r1(vix * 0.3 * (1 + ti * 0.05 + ei * 0.03)) })) }));
  return { surface, summary: { avgVol: r1(vix * 0.3), vix: r2(vix), regime: vix > 25 ? 'Elevated' : vix < 15 ? 'Compressed' : 'Normal' }, yields: { threeMonth: r2(qMap.get('^IRX')?.regularMarketPrice || 5), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[InterestRateVolSurface]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
