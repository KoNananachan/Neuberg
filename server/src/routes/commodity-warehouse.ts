import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HG=F', 'ALI=F', 'GC=F', 'SI=F', 'PL=F', 'ZC=F', 'ZW=F', 'CL=F'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const names: Record<string, string> = { 'HG=F': 'Copper', 'ALI=F': 'Aluminum', 'GC=F': 'Gold', 'SI=F': 'Silver', 'PL=F': 'Platinum', 'ZC=F': 'Corn', 'ZW=F': 'Wheat', 'CL=F': 'Crude Oil' };
  const warehouses = Object.keys(names).map(sym => {
    const q = qMap.get(sym); const chg = q?.regularMarketChangePercent || 0;
    return { commodity: names[sym], price: r2(q?.regularMarketPrice || 0), changePct: r2(chg), inventoryTrend: chg > 0.5 ? 'Declining (tighter supply)' : chg < -0.5 ? 'Rising (surplus)' : 'Stable', marketSignal: chg > 1 ? 'Tight' : chg < -1 ? 'Ample' : 'Balanced' };
  });
  return { warehouses, summary: { tightMarkets: warehouses.filter(w => w.marketSignal === 'Tight').length, ambleMarkets: warehouses.filter(w => w.marketSignal === 'Ample').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommodityWarehouse] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
