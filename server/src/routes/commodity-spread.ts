import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CL=F', 'BZ=F', 'NG=F', 'GC=F', 'SI=F', 'HG=F', 'ZC=F', 'ZW=F', 'ZS=F', 'RB=F', 'HO=F'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const p = (s: string) => qMap.get(s)?.regularMarketPrice || 0;
  const spreads = [
    { name: 'WTI-Brent', value: r2(p('CL=F') - p('BZ=F')), unit: '$/bbl' },
    { name: 'Gold/Silver Ratio', value: r2(p('SI=F') > 0 ? p('GC=F') / p('SI=F') : 80), unit: 'x' },
    { name: 'Corn/Wheat', value: r2(p('ZW=F') > 0 ? p('ZC=F') / p('ZW=F') : 0.75), unit: 'x' },
    { name: 'Crack Spread', value: r2(p('RB=F') * 42 * 2/3 + p('HO=F') * 42 / 3 - p('CL=F')), unit: '$/bbl' },
    { name: 'Soy Crush', value: r2(p('ZS=F') * 0.02), unit: '$/bu' },
    { name: 'Frac Spread', value: r2(p('CL=F') / 6 - p('NG=F')), unit: '$/mmbtu' },
  ];
  return { spreads, prices: SYMBOLS.map(s => ({ symbol: s, price: r2(p(s)), change: r2(qMap.get(s)?.regularMarketChangePercent || 0) })), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommoditySpread] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
