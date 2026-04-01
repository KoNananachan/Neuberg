import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CL=F', 'BZ=F', 'NG=F', 'GC=F', 'SI=F', 'HG=F', 'PL=F', 'PA=F', 'ZC=F', 'ZS=F', 'ZW=F', 'KC=F', 'CC=F', 'CT=F', 'DBC'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const names: Record<string, [string, string]> = { 'CL=F': ['WTI Crude', 'Energy'], 'BZ=F': ['Brent Crude', 'Energy'], 'NG=F': ['Natural Gas', 'Energy'], 'GC=F': ['Gold', 'Precious'], 'SI=F': ['Silver', 'Precious'], 'HG=F': ['Copper', 'Industrial'], 'PL=F': ['Platinum', 'Precious'], 'PA=F': ['Palladium', 'Precious'], 'ZC=F': ['Corn', 'Agriculture'], 'ZS=F': ['Soybeans', 'Agriculture'], 'ZW=F': ['Wheat', 'Agriculture'], 'KC=F': ['Coffee', 'Softs'], 'CC=F': ['Cocoa', 'Softs'], 'CT=F': ['Cotton', 'Softs'] };
  const commodities = Object.entries(names).map(([sym, [name, sector]]) => {
    const q = qMap.get(sym); const p = q?.regularMarketPrice || 0;
    return { commodity: name, symbol: sym, sector, price: r2(p), change: r2(q?.regularMarketChangePercent || 0), high52w: r2(q?.fiftyTwoWeekHigh || p * 1.2), low52w: r2(q?.fiftyTwoWeekLow || p * 0.8), percentile52w: r1(q?.fiftyTwoWeekHigh && q?.fiftyTwoWeekLow && q.fiftyTwoWeekHigh !== q.fiftyTwoWeekLow ? ((p - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow)) * 100 : 50), volume: q?.regularMarketVolume || 0 };
  });
  const dbc = qMap.get('DBC');
  return { commodities, summary: { dbcChange: r2(dbc?.regularMarketChangePercent || 0), topGainer: [...commodities].sort((a, b) => b.change - a.change)[0]?.commodity || 'N/A', topLoser: [...commodities].sort((a, b) => a.change - b.change)[0]?.commodity || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommodityFundamentals] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
