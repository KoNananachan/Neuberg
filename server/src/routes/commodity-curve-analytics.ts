import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const COMMODITIES = [
  { sym: 'CL=F', name: 'WTI Crude', slope: -0.3 }, { sym: 'BZ=F', name: 'Brent', slope: -0.25 },
  { sym: 'NG=F', name: 'Natural Gas', slope: 0.15 }, { sym: 'GC=F', name: 'Gold', slope: 0.02 },
  { sym: 'HG=F', name: 'Copper', slope: 0.005 }, { sym: 'ZC=F', name: 'Corn', slope: 0.08 },
];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(COMMODITIES.map(c => c.sym)); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const analytics = COMMODITIES.map(c => {
    const q = qMap.get(c.sym); const spot = q?.regularMarketPrice || 0;
    const structure = c.slope < -0.01 ? 'Backwardation' : c.slope > 0.01 ? 'Contango' : 'Flat';
    const rollYield = r2(c.slope * -100); // negative slope = positive roll in backwardation
    return { commodity: c.name, spot: r2(spot), change: r2(q?.regularMarketChangePercent || 0), structure, annualizedRollYield: rollYield, oneMonthForward: r2(spot * (1 + c.slope / 12)), threeMonthForward: r2(spot * (1 + c.slope / 4)), carrySignal: rollYield > 3 ? 'Positive Carry' : rollYield < -3 ? 'Negative Carry' : 'Neutral' };
  });
  return { analytics, summary: { backwardation: analytics.filter(a => a.structure === 'Backwardation').length, contango: analytics.filter(a => a.structure === 'Contango').length, avgRollYield: r2(analytics.reduce((s, a) => s + a.annualizedRollYield, 0) / analytics.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommodityCurveAnalytics] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
