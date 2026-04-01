import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CL=F', 'NG=F', 'HG=F', 'GC=F', 'ZC=F', 'ZS=F', 'COPX', 'XLE', 'DBA', 'DBC', 'FXI', 'EWJ', '^GSPC'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const demandIndicators = [
    { commodity: 'Crude Oil', sym: 'CL=F', demandProxy: 'XLE' }, { commodity: 'Natural Gas', sym: 'NG=F', demandProxy: 'XLE' },
    { commodity: 'Copper', sym: 'HG=F', demandProxy: 'COPX' }, { commodity: 'Gold', sym: 'GC=F', demandProxy: 'GLD' },
    { commodity: 'Corn', sym: 'ZC=F', demandProxy: 'DBA' }, { commodity: 'Soybeans', sym: 'ZS=F', demandProxy: 'DBA' },
  ].map(d => {
    const q = qMap.get(d.sym); const proxy = qMap.get(d.demandProxy);
    return { commodity: d.commodity, price: r2(q?.regularMarketPrice || 0), changePct: r2(q?.regularMarketChangePercent || 0), demandSignal: (q?.regularMarketChangePercent || 0) > 1 ? 'Strong' : (q?.regularMarketChangePercent || 0) < -1 ? 'Weak' : 'Stable', proxyChange: r2(proxy?.regularMarketChangePercent || 0) };
  });
  const chinaProxy = qMap.get('FXI')?.regularMarketChangePercent || 0;
  const globalDemand = chinaProxy > 0.5 ? 'Expanding' : chinaProxy < -0.5 ? 'Contracting' : 'Stable';
  return { demandIndicators, summary: { globalDemand, chinaDemandProxy: r2(chinaProxy), dbcChange: r2(qMap.get('DBC')?.regularMarketChangePercent || 0), spxContext: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommodityDemand] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
