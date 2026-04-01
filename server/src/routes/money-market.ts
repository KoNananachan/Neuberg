import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', 'SHV', 'BIL', 'SGOV', 'NEAR', 'SHY', 'FLOT', 'MINT'];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const irx = qMap.get('^IRX')?.regularMarketPrice || 5.0;
  const rates = [
    { name: 'Fed Funds Target', rate: r3(Math.round(irx * 4) / 4 + 0.25), change: 0 },
    { name: '3-Month T-Bill', rate: r3(irx), change: r3(qMap.get('^IRX')?.regularMarketChange || 0) },
    { name: 'SOFR (est.)', rate: r3(Math.round(irx * 4) / 4 + 0.05), change: 0 },
  ];

  const etfs = ['SHV', 'BIL', 'SGOV', 'NEAR', 'SHY', 'FLOT', 'MINT'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), aum: Math.round((q?.marketCap || 0) / 1e9) };
  });

  return { rates, etfs, summary: { shortTermRate: r3(irx), yieldCurveSlope: r3((qMap.get('^TNX')?.regularMarketPrice || 4.5) - irx) }, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[MoneyMarket] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
