import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BA', 'EADSY', 'AIR.PA', 'TDG', 'HWM', 'SPR', 'GE', 'RTX', 'JETS', 'DAL', 'UAL', 'AAL', 'LUV', 'CL=F'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const segMap: Record<string, string> = { BA: 'OEM', EADSY: 'OEM', TDG: 'Supplier', HWM: 'Supplier', SPR: 'Supplier', GE: 'Engines', RTX: 'Engines/Defense', DAL: 'Airline', UAL: 'Airline', AAL: 'Airline', LUV: 'Airline' };
  const stocks = SYMBOLS.filter(s => s !== 'JETS' && s !== 'CL=F' && s !== 'AIR.PA').map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, segment: segMap[sym] || 'Other', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0), marketCap: r1((q?.marketCap || 0) / 1e9) };
  });
  const jets = qMap.get('JETS');
  return { stocks, summary: { jetsPrice: r2(jets?.regularMarketPrice || 0), jetsChange: r2(jets?.regularMarketChangePercent || 0), oilPrice: r2(qMap.get('CL=F')?.regularMarketPrice || 75), avgChange: r2(stocks.reduce((s, st) => s + st.change, 0) / stocks.length), totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[AircraftFinance] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
