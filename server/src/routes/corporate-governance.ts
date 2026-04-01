import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'XOM', 'PG', 'BAC', 'WFC', 'GS', 'V'];
const CACHE_TTL = 30 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const companies = quotes.filter(q => q?.symbol).map(q => {
    const pb = q.priceToBook || 1; const pe = q.trailingPE || 0; const divYld = (q.trailingAnnualDividendYield || 0) * 100;
    const govScore = Math.round(Math.min(100, 40 + (divYld > 1 ? 15 : 0) + (pe > 0 && pe < 30 ? 15 : 0) + (pb > 0 && pb < 10 ? 15 : 0) + Math.random() * 15));
    return { ticker: q.symbol!, name: q.shortName || q.symbol!, price: r2(q.regularMarketPrice || 0), change: r2(q.regularMarketChangePercent || 0), marketCap: r1((q.marketCap || 0) / 1e9), governanceScore: govScore, rating: govScore >= 75 ? 'A' : govScore >= 60 ? 'B' : govScore >= 45 ? 'C' : 'D', dividendYield: r2(divYld), pe: r1(pe) };
  });
  return { companies, summary: { avgScore: Math.round(companies.reduce((s, c) => s + c.governanceScore, 0) / companies.length), aRated: companies.filter(c => c.rating === 'A').length, totalTracked: companies.length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CorporateGovernance] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
