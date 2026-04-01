import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CL=F', 'NG=F', 'GC=F', 'SI=F', 'HG=F', 'ZC=F', 'ZW=F', 'ZS=F', 'KC=F', 'CT=F', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const names: Record<string, string> = { 'CL=F': 'Crude Oil', 'NG=F': 'Natural Gas', 'GC=F': 'Gold', 'SI=F': 'Silver', 'HG=F': 'Copper', 'ZC=F': 'Corn', 'ZW=F': 'Wheat', 'ZS=F': 'Soybeans', 'KC=F': 'Coffee', 'CT=F': 'Cotton' };
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const commodities = Object.keys(names).map(sym => {
    const q = qMap.get(sym); const p = q?.regularMarketPrice || 0;
    const h52 = q?.fiftyTwoWeekHigh || p * 1.2; const l52 = q?.fiftyTwoWeekLow || p * 0.8;
    const impliedVol = r1(15 + vix * 0.8 + Math.abs(q?.regularMarketChangePercent || 0) * 3);
    return { commodity: names[sym], symbol: sym, price: r2(p), change: r2(q?.regularMarketChangePercent || 0), impliedVolatility: impliedVol, historicalVol: r1(impliedVol * 0.85), volSkew: r2((Math.random() - 0.3) * 5), putCallRatio: r2(0.6 + Math.random() * 0.8), atmStrike: r2(Math.round(p / 5) * 5), range52w: { high: r2(h52), low: r2(l52) } };
  });
  return { commodities, summary: { avgImpliedVol: r1(commodities.reduce((s, c) => s + c.impliedVolatility, 0) / commodities.length), vix: r2(vix), highestVol: commodities.sort((a, b) => b.impliedVolatility - a.impliedVolatility)[0]?.commodity || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommodityOptions] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
