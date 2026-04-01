import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AGG', 'MBB', 'VMBS', 'GNMA', 'HYG', 'LQD', '^TNX', '^IRX', 'NLY', 'AGNC'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = [
    { name: 'Agency MBS', etfs: ['MBB', 'VMBS', 'GNMA'] }, { name: 'ABS/CLO (proxy)', etfs: ['HYG'] },
    { name: 'IG Corporate', etfs: ['LQD'] }, { name: 'Aggregate', etfs: ['AGG'] },
  ].map(s => {
    const sectorEtfs = s.etfs.map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
    const avgYield = sectorEtfs.reduce((sum, e) => sum + e.yield, 0) / sectorEtfs.length;
    return { sector: s.name, etfs: sectorEtfs, avgYield: r2(avgYield), spreadVsTsy: r2(avgYield - tnx) };
  });
  const mReits = ['NLY', 'AGNC'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100), priceToBook: r2(q?.priceToBook || 0) }; });
  return { sectors, mortgageReits: mReits, yields: { threeMonth: r2(qMap.get('^IRX')?.regularMarketPrice || 0), tenYear: r2(tnx) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ABS] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
