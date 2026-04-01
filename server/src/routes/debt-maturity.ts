import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'SHY', 'IEI', 'IEF', 'TLH', 'TLT', 'AGG', 'HYG', 'LQD', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const maturities = [
    { bucket: '0-1Y', yield: r3(irx), etf: 'SHY', duration: 0.5 }, { bucket: '1-3Y', yield: r3((irx + (qMap.get('^FVX')?.regularMarketPrice || 4.2)) / 2), etf: 'SHY', duration: 2 },
    { bucket: '3-7Y', yield: r3(qMap.get('^FVX')?.regularMarketPrice || 4.2), etf: 'IEI', duration: 5 }, { bucket: '7-10Y', yield: r3(tnx), etf: 'IEF', duration: 8 },
    { bucket: '10-20Y', yield: r3((tnx + tyx) / 2), etf: 'TLH', duration: 14 }, { bucket: '20+Y', yield: r3(tyx), etf: 'TLT', duration: 18 },
  ].map(m => { const q = qMap.get(m.etf); return { ...m, etfPrice: r2(q?.regularMarketPrice || 0), etfChange: r2(q?.regularMarketChangePercent || 0) }; });
  const refinancingRisk = irx > tnx ? 'Elevated (inverted curve)' : 'Normal';
  return { maturities, refinancingRisk, creditSpreads: { ig: r2(((qMap.get('LQD')?.trailingAnnualDividendYield || 0) * 100) - tnx), hy: r2(((qMap.get('HYG')?.trailingAnnualDividendYield || 0) * 100) - tnx) }, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DebtMaturity] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
