import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['MBB', 'VMBS', 'GNMA', 'SPMB', 'AGG', '^TNX', '^IRX', 'NLY', 'AGNC', 'STWD', 'REM'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const mortgageRate30Y = r2(tnx + 1.7);
  const mbsEtfs = ['MBB', 'VMBS', 'GNMA', 'SPMB'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), spreadVsTsy: r2(((q?.trailingAnnualDividendYield || 0) * 100) - tnx) };
  });
  const mReits = ['NLY', 'AGNC', 'STWD', 'REM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100), priceToBook: r2(q?.priceToBook || 0) }; });
  return { mbsEtfs, mortgageReits: mReits, summary: { mortgageRate30Y, tenYearYield: r2(tnx), mbsSpread: r2(mortgageRate30Y - tnx), avgMbsYield: r2(mbsEtfs.reduce((s, e) => s + e.yield, 0) / mbsEtfs.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ABSRMBSMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
