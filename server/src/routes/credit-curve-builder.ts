import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'LQD', 'HYG', 'JNK', 'VCSH', 'VCIT', 'VCLT', 'AGG'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const treasuryCurve = [{ tenor: '3M', yield: r3(irx) }, { tenor: '5Y', yield: r3(qMap.get('^FVX')?.regularMarketPrice || 4.2) }, { tenor: '10Y', yield: r3(tnx) }, { tenor: '30Y', yield: r3(tyx) }];
  const igCurve = [{ tenor: 'Short', proxy: 'VCSH' }, { tenor: 'Intermediate', proxy: 'VCIT' }, { tenor: 'Long', proxy: 'VCLT' }].map(p => { const q = qMap.get(p.proxy); return { tenor: p.tenor, yield: r2((q?.trailingAnnualDividendYield || 0) * 100), change: r2(q?.regularMarketChangePercent || 0) }; });
  return { treasuryCurve, igCurve, summary: { curveSlope: r3(tyx - irx), igSpread: r2(igCurve.reduce((s, c) => s + c.yield, 0) / igCurve.length - tnx) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CreditCurveBuilder] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
