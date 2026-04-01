import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', 'SHV', 'BIL', 'SGOV', 'NEAR', 'FLOT', 'MINT', 'JPST'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  // CP rates derived from T-bill + spread
  const cpRates = [
    { issuer: 'AA Non-Financial', tenor: '30-day', rate: r3(irx + 0.10), spreadVsTBill: 10 },
    { issuer: 'AA Non-Financial', tenor: '90-day', rate: r3(irx + 0.15), spreadVsTBill: 15 },
    { issuer: 'AA Financial', tenor: '30-day', rate: r3(irx + 0.08), spreadVsTBill: 8 },
    { issuer: 'AA Financial', tenor: '90-day', rate: r3(irx + 0.12), spreadVsTBill: 12 },
    { issuer: 'A2/P2 Non-Financial', tenor: '30-day', rate: r3(irx + 0.30), spreadVsTBill: 30 },
    { issuer: 'A2/P2 Non-Financial', tenor: '90-day', rate: r3(irx + 0.45), spreadVsTBill: 45 },
  ];
  const mmFunds = ['SHV', 'BIL', 'SGOV', 'NEAR', 'FLOT', 'MINT', 'JPST'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), change: r2(q?.regularMarketChangePercent || 0) };
  });
  return { cpRates, mmFunds, summary: { tBillRate: r3(irx), fedFundsEst: r3(Math.round(irx * 4) / 4 + 0.25), avgCPSpread: Math.round(cpRates.reduce((s, c) => s + c.spreadVsTBill, 0) / cpRates.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CommercialPaper] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
