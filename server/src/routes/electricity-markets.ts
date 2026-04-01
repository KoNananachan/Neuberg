import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
const SYMBOLS = ['XLU', 'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'ED', 'WEC', 'NG=F', 'CL=F', 'URA'];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const ngPrice = qMap.get('NG=F')?.regularMarketPrice || 3;
  const utilities = ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'ED', 'WEC'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100), pe: r1(q?.trailingPE || 0) };
  });

  const regions = [
    { name: 'PJM (Mid-Atlantic)', heatRate: 8.5 }, { name: 'ERCOT (Texas)', heatRate: 9.0 },
    { name: 'CAISO (California)', heatRate: 10.0 }, { name: 'ISO-NE (New England)', heatRate: 9.5 },
  ].map(r => ({ region: r.name, estimatedPrice: r2(ngPrice * r.heatRate), unit: '$/MWh' }));

  const xlu = qMap.get('XLU');
  return { utilities, regions, summary: { xluPrice: r2(xlu?.regularMarketPrice || 0), xluChange: r2(xlu?.regularMarketChangePercent || 0), avgDividendYield: r2(utilities.reduce((s, u) => s + u.dividendYield, 0) / utilities.length), naturalGas: r2(ngPrice) }, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ElectricityMarkets] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
