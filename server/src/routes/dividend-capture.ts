import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['JNJ', 'PG', 'KO', 'PEP', 'XOM', 'CVX', 'JPM', 'BAC', 'T', 'VZ', 'ABBV', 'MRK', 'O', 'STAG', 'HD', 'WMT', 'IBM', 'MCD', 'LOW', 'LMT'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const opportunities = quotes.filter(q => q?.symbol && q.trailingAnnualDividendRate).map(q => {
    const divRate = q.trailingAnnualDividendRate || 0; const price = q.regularMarketPrice || 1; const qtrDiv = divRate / 4;
    const exDate = q.exDividendDate ? new Date(q.exDividendDate * 1000).toISOString().slice(0, 10) : 'TBD';
    return { ticker: q.symbol!, name: q.shortName || q.symbol!, price: r2(price), dividendAmount: r2(qtrDiv), annualYield: r2((divRate / price) * 100), exDate, captureReturn: r2((qtrDiv / price) * 100), change: r2(q.regularMarketChangePercent || 0) };
  }).sort((a, b) => b.annualYield - a.annualYield);
  return { opportunities, summary: { totalStocks: opportunities.length, avgYield: r2(opportunities.reduce((s, o) => s + o.annualYield, 0) / opportunities.length), topYield: opportunities[0]?.ticker || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DividendCapture] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
