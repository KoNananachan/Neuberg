import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC', 'HYG', 'LQD', '^VIX', '^TNX', 'KRE'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const counterparties = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC'].map(sym => { const q = qMap.get(sym); const pb = q?.priceToBook || 1; const cvaScore = Math.round(Math.min(100, Math.max(0, pb * 25 + 35 - (vix > 25 ? 15 : 0)))); return { institution: q?.shortName || sym, ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), priceToBook: r2(pb), cvaCharge: r2(100 - cvaScore), creditQuality: cvaScore > 70 ? 'Strong' : cvaScore > 45 ? 'Adequate' : 'Watch' }; });
  return { counterparties, summary: { avgCvaCharge: r2(counterparties.reduce((s, c) => s + c.cvaCharge, 0) / counterparties.length), vix: r2(vix), creditSpreadProxy: r2(((qMap.get('HYG')?.trailingAnnualDividendYield || 0) * 100) - (qMap.get('^TNX')?.regularMarketPrice || 4.5)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CreditValuationAdjustment] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
