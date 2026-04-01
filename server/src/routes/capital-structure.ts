import { Router } from 'express';
import { getRawQuotes, getProfile } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'XOM', 'PG', 'V', 'UNH', 'HD', 'BAC'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const [quotes, ...profiles] = await Promise.all([getRawQuotes(SYMBOLS), ...SYMBOLS.slice(0, 8).map(s => getProfile(s).catch(() => null))]);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const profMap = new Map<string, any>(); SYMBOLS.slice(0, 8).forEach((s, i) => { if (profiles[i]) profMap.set(s, profiles[i]); });
  const companies = quotes.filter(q => q?.symbol).map(q => {
    const prof = profMap.get(q.symbol!);
    const mcap = (q.marketCap || 0) / 1e9;
    const debt = prof?.totalDebt ? prof.totalDebt / 1e9 : mcap * 0.3;
    const cash = prof?.totalCash ? prof.totalCash / 1e9 : mcap * 0.1;
    const ev = mcap + debt - cash;
    return { ticker: q.symbol!, name: q.shortName || q.symbol!, marketCap: r1(mcap), totalDebt: r1(debt), totalCash: r1(cash), enterpriseValue: r1(ev), debtToEquity: r2(prof?.debtToEquity || (debt / mcap) * 100), currentRatio: r2(prof?.currentRatio || 1.5), netDebt: r1(debt - cash), debtToEV: r2(ev > 0 ? (debt / ev) * 100 : 0) };
  });
  return { companies, summary: { avgDebtToEquity: r2(companies.reduce((s, c) => s + c.debtToEquity, 0) / companies.length), totalDebt: r1(companies.reduce((s, c) => s + c.totalDebt, 0)), totalCash: r1(companies.reduce((s, c) => s + c.totalCash, 0)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CapitalStructure] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
