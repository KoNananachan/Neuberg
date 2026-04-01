import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'XOM', 'PG', 'V', 'UNH', 'HD', 'BAC'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const actions = quotes.filter(q => q?.symbol).map(q => {
    const divDate = q.exDividendDate ? new Date(q.exDividendDate * 1000).toISOString().slice(0, 10) : null;
    const earnDate = q.earningsTimestamp ? new Date(q.earningsTimestamp * 1000).toISOString().slice(0, 10) : null;
    return { ticker: q.symbol!, name: q.shortName || q.symbol!, price: r2(q.regularMarketPrice || 0), change: r2(q.regularMarketChangePercent || 0), marketCap: r1((q.marketCap || 0) / 1e9), upcomingDividend: divDate, dividendAmount: r2((q.trailingAnnualDividendRate || 0) / 4), upcomingEarnings: earnDate, actions: divDate ? ['Dividend'] : earnDate ? ['Earnings'] : [] };
  });
  const withActions = actions.filter(a => a.actions.length > 0);
  return { allStocks: actions, upcoming: withActions, summary: { totalTracked: actions.length, withUpcomingActions: withActions.length, dividendsPending: actions.filter(a => a.upcomingDividend).length, earningsPending: actions.filter(a => a.upcomingEarnings).length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CorporateActions] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
