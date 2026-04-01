import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^TYX', '^IRX', 'TIP', 'STIP', 'VTIP', 'SCHP', 'GLD', 'DBC', 'CL=F'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const tipYield = (qMap.get('TIP')?.trailingAnnualDividendYield || 0.02) * 100;
  const breakeven5Y = r2(tnx * 0.85 - tipYield * 0.9);
  const breakeven10Y = r2(tnx - tipYield);
  const breakeven30Y = r2((qMap.get('^TYX')?.regularMarketPrice || 4.8) - tipYield * 1.05);
  const curve = [
    { tenor: '5Y', breakeven: breakeven5Y, nominal: r2(qMap.get('^FVX')?.regularMarketPrice || 4.2), real: r2(breakeven5Y - 0.5) },
    { tenor: '10Y', breakeven: breakeven10Y, nominal: r2(tnx), real: r2(tipYield) },
    { tenor: '30Y', breakeven: breakeven30Y, nominal: r2(qMap.get('^TYX')?.regularMarketPrice || 4.8), real: r2(breakeven30Y - 0.3) },
  ];
  const tipsEtfs = ['TIP', 'STIP', 'VTIP', 'SCHP'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) };
  });
  const inflationHedges = [
    { asset: 'Gold', proxy: 'GLD', change: r2(qMap.get('GLD')?.regularMarketChangePercent || 0) },
    { asset: 'Commodities', proxy: 'DBC', change: r2(qMap.get('DBC')?.regularMarketChangePercent || 0) },
    { asset: 'Oil', proxy: 'CL=F', change: r2(qMap.get('CL=F')?.regularMarketChangePercent || 0) },
  ];
  return { curve, tipsEtfs, inflationHedges, summary: { breakeven10Y, outlook: breakeven10Y > 2.8 ? 'Above Target' : breakeven10Y > 2 ? 'At Target' : 'Below Target' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BreakevenInflation] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
