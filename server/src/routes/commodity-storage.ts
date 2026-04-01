import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CL=F', 'NG=F', 'GC=F', 'SI=F', 'HG=F', 'ZC=F', 'ZW=F', 'USO', 'UNG', 'GLD', 'SLV'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const commodities = [
    { name: 'Crude Oil', future: 'CL=F', etf: 'USO', unit: 'million barrels' },
    { name: 'Natural Gas', future: 'NG=F', etf: 'UNG', unit: 'Bcf' },
    { name: 'Gold', future: 'GC=F', etf: 'GLD', unit: 'tonnes' },
    { name: 'Silver', future: 'SI=F', etf: 'SLV', unit: 'million oz' },
    { name: 'Copper', future: 'HG=F', etf: null, unit: 'tonnes' },
    { name: 'Corn', future: 'ZC=F', etf: null, unit: 'million bushels' },
    { name: 'Wheat', future: 'ZW=F', etf: null, unit: 'million bushels' },
  ].map(c => {
    const fq = qMap.get(c.future); const eq = c.etf ? qMap.get(c.etf) : null;
    const chg = fq?.regularMarketChangePercent || 0;
    return { commodity: c.name, price: r2(fq?.regularMarketPrice || 0), changePct: r2(chg), unit: c.unit, storageSignal: chg > 0.5 ? 'Drawing' : chg < -0.5 ? 'Building' : 'Stable', etf: c.etf, etfPrice: r2(eq?.regularMarketPrice || 0), etfChange: r2(eq?.regularMarketChangePercent || 0) };
  });
  return { commodities, summary: { drawingCount: commodities.filter(c => c.storageSignal === 'Drawing').length, buildingCount: commodities.filter(c => c.storageSignal === 'Building').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommodityStorage] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
