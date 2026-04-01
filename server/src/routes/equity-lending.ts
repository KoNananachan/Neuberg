import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['GME', 'AMC', 'CVNA', 'UPST', 'BYND', 'MARA', 'RIVN', 'TSLA', 'AAPL', 'MSFT', 'NVDA', 'META', '^VIX', '^IRX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const stocks = SYMBOLS.filter(s => !s.startsWith('^')).map(sym => { const q = qMap.get(sym); const si = q?.shortPercentOfFloat ? q.shortPercentOfFloat * 100 : 0; const borrowCost = r2(si > 20 ? si * 1.5 : si > 5 ? si * 0.8 : irx + 0.5); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), shortInterest: r1(si), borrowCost, lendingFee: r2(borrowCost * 0.8), utilization: r1(Math.min(99, si * 2.5)), availability: si > 20 ? 'Hard to Borrow' : si > 5 ? 'Special' : 'Easy' }; });
  return { stocks: stocks.sort((a, b) => b.shortInterest - a.shortInterest), summary: { avgBorrowCost: r2(stocks.reduce((s, st) => s + st.borrowCost, 0) / stocks.length), hardToBorrow: stocks.filter(s => s.availability === 'Hard to Borrow').length, baseRate: r2(irx), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityLending] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
