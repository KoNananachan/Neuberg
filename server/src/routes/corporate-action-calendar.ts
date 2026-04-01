import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'XOM', 'PG', 'V', 'UNH', 'HD', 'BAC', 'WMT', 'MA', 'CVX', 'ABBV', 'CRM'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const events = quotes.filter(q => q?.symbol).flatMap(q => {
    const evts: any[] = [];
    if (q.exDividendDate) evts.push({ ticker: q.symbol!, name: q.shortName || q.symbol!, type: 'Ex-Dividend', date: new Date(q.exDividendDate * 1000).toISOString().slice(0, 10), detail: `$${r2((q.trailingAnnualDividendRate || 0) / 4)}/share` });
    if (q.earningsTimestamp) evts.push({ ticker: q.symbol!, name: q.shortName || q.symbol!, type: 'Earnings', date: new Date(q.earningsTimestamp * 1000).toISOString().slice(0, 10), detail: `EPS est: $${r2((q.epsForward || 0) / 4)}` });
    return evts;
  }).sort((a, b) => a.date.localeCompare(b.date));
  const now = new Date().toISOString().slice(0, 10);
  return { upcoming: events.filter(e => e.date >= now), recent: events.filter(e => e.date < now).slice(-10).reverse(), summary: { totalEvents: events.length, dividends: events.filter(e => e.type === 'Ex-Dividend').length, earnings: events.filter(e => e.type === 'Earnings').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CorporateActionCalendar] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
