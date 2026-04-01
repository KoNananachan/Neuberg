import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'SCHW', 'BK', 'STT', 'KRE', 'XLF', '^VIX', '^TNX'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const banks = SYMBOLS.filter(s => !['KRE', 'XLF', '^VIX', '^TNX'].includes(s)).map(sym => {
    const q = qMap.get(sym);
    const pb = q?.priceToBook || 1;
    const stressScore = Math.round(Math.min(100, Math.max(0, pb * 20 + 40 - vix * 0.5)));
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), priceToBook: r2(pb), pe: r1(q?.trailingPE || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100), capitalStrength: stressScore > 70 ? 'Strong' : stressScore > 50 ? 'Adequate' : 'Watch', stressScore };
  });
  const kre = qMap.get('KRE');
  const sectorHealth = vix < 20 && (kre?.regularMarketChangePercent || 0) > 0 ? 'Healthy' : vix > 30 ? 'Stressed' : 'Normal';
  return { banks, summary: { sectorHealth, avgStressScore: Math.round(banks.reduce((s, b) => s + b.stressScore, 0) / banks.length), vix: r1(vix), kreChange: r2(kre?.regularMarketChangePercent || 0), tenYearYield: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BankStressTest] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
