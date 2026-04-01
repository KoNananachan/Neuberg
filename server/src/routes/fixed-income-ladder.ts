import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'SHV', 'SHY', 'IEI', 'IEF', 'TLH', 'TLT', 'AGG'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const fvx = qMap.get('^FVX')?.regularMarketPrice || 4.2; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const rungs = [{ bucket: '0-1Y', yield: r3(irx), etf: 'SHV', duration: 0.4, weight: 20 }, { bucket: '1-3Y', yield: r3((irx + fvx) / 2), etf: 'SHY', duration: 1.9, weight: 20 }, { bucket: '3-7Y', yield: r3(fvx), etf: 'IEI', duration: 4.4, weight: 20 }, { bucket: '7-10Y', yield: r3(tnx), etf: 'IEF', duration: 7.5, weight: 20 }, { bucket: '10-20Y', yield: r3((tnx + tyx) / 2), etf: 'TLH', duration: 11, weight: 10 }, { bucket: '20+Y', yield: r3(tyx), etf: 'TLT', duration: 17, weight: 10 }].map(r => { const q = qMap.get(r.etf); return { ...r, etfPrice: r2(q?.regularMarketPrice || 0), etfChange: r2(q?.regularMarketChangePercent || 0) }; });
  return { rungs, blendedYield: r3(rungs.reduce((s, r) => s + r.yield * r.weight / 100, 0)), avgDuration: r2(rungs.reduce((s, r) => s + r.duration * r.weight / 100, 0)), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FixedIncomeLadder] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
