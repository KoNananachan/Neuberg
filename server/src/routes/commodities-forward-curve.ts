import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const COMMODITIES = [
  { sym: 'CL=F', name: 'WTI Crude', slope: -0.3 }, { sym: 'BZ=F', name: 'Brent Crude', slope: -0.25 },
  { sym: 'NG=F', name: 'Natural Gas', slope: 0.15 }, { sym: 'GC=F', name: 'Gold', slope: 0.02 },
  { sym: 'SI=F', name: 'Silver', slope: 0.01 }, { sym: 'HG=F', name: 'Copper', slope: 0.005 },
  { sym: 'ZC=F', name: 'Corn', slope: 0.08 }, { sym: 'ZW=F', name: 'Wheat', slope: 0.05 },
];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(COMMODITIES.map(c => c.sym)); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const curves = COMMODITIES.map(c => {
    const q = qMap.get(c.sym); const spot = q?.regularMarketPrice || 0;
    const tenors = ['Spot', '1M', '3M', '6M', '12M', '24M'];
    const months = [0, 1, 3, 6, 12, 24];
    return { commodity: c.name, symbol: c.sym, spotPrice: r2(spot), change: r2(q?.regularMarketChangePercent || 0), curve: tenors.map((t, i) => ({ tenor: t, price: r2(spot * (1 + c.slope * months[i] / 12)) })), structure: c.slope < -0.01 ? 'Backwardation' : c.slope > 0.01 ? 'Contango' : 'Flat' };
  });
  return { curves, summary: { backwardation: curves.filter(c => c.structure === 'Backwardation').length, contango: curves.filter(c => c.structure === 'Contango').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommoditiesForwardCurve] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
