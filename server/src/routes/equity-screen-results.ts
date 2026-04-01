import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'V', 'UNH', 'PG', 'HD', 'XOM', 'CVX', 'BAC', 'ABBV', 'LLY', 'CRM', 'AVGO'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const results = quotes.filter(q => q?.symbol).map(q => { const p = q.regularMarketPrice || 0; return { ticker: q.symbol!, name: q.shortName || q.symbol!, price: r2(p), change: r2(q.regularMarketChangePercent || 0), marketCap: r1((q.marketCap || 0) / 1e9), pe: r1(q.trailingPE || 0), forwardPE: r1(q.forwardPE || 0), dividendYield: r2((q.trailingAnnualDividendYield || 0) * 100), priceToBook: r2(q.priceToBook || 0), beta: r2(q.beta || 1), vs52wHigh: q.fiftyTwoWeekHigh ? r1(((p - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100) : 0, aboveSMA200: !!(q.twoHundredDayAverage && p > q.twoHundredDayAverage) }; });
  return { results, filters: { totalStocks: results.length, aboveSMA200: results.filter(r => r.aboveSMA200).length, lowPE: results.filter(r => r.pe > 0 && r.pe < 20).length, highYield: results.filter(r => r.dividendYield > 2).length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityScreenResults] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
