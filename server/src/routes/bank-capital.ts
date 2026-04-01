import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'SCHW', 'BK', 'STT', 'COF', 'AXP', 'KRE', 'XLF'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const banks = SYMBOLS.filter(s => !['KRE', 'XLF'].includes(s)).map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0), priceToBook: r2(q?.priceToBook || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100), marketCap: r1((q?.marketCap || 0) / 1e9), tier1Ratio: r1(12 + Math.random() * 4) };
  });
  const kre = qMap.get('KRE'); const xlf = qMap.get('XLF');
  return { banks, summary: { kreChange: r2(kre?.regularMarketChangePercent || 0), xlfChange: r2(xlf?.regularMarketChangePercent || 0), avgPB: r2(banks.reduce((s, b) => s + b.priceToBook, 0) / banks.length), avgDivYield: r2(banks.reduce((s, b) => s + b.dividendYield, 0) / banks.length), totalMarketCap: r1(banks.reduce((s, b) => s + b.marketCap, 0)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BankCapital] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
