import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC', 'DB', 'UBS', 'BCS', 'HSBC', 'KRE', 'XLF', '^VIX', '^TNX', 'HYG'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const counterparties = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC', 'DB', 'UBS', 'BCS', 'HSBC'].map(sym => {
    const q = qMap.get(sym); const pb = q?.priceToBook || 1;
    const score = Math.round(Math.min(100, Math.max(0, pb * 25 + 30 - (vix > 25 ? 20 : 0))));
    return { institution: q?.shortName || sym, ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), priceToBook: r2(pb), marketCap: r1((q?.marketCap || 0) / 1e9), exposureScore: score, creditQuality: score > 70 ? 'Strong' : score > 45 ? 'Adequate' : 'Elevated Risk' };
  });
  return { counterparties, summary: { avgScore: Math.round(counterparties.reduce((s, c) => s + c.exposureScore, 0) / counterparties.length), vix: r2(vix), systemicRisk: vix > 30 ? 'Elevated' : 'Normal' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CounterpartyExposure] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
