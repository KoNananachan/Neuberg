import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC', 'DB', 'UBS', 'CS', 'BCS', 'KRE', 'XLF', '^VIX', '^TNX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const banks = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC', 'DB', 'UBS', 'BCS'].map(sym => {
    const q = qMap.get(sym); const pb = q?.priceToBook || 1;
    const riskScore = Math.round(Math.min(100, Math.max(0, 100 - pb * 20 - (vix > 25 ? 15 : 0) + (q?.regularMarketChangePercent || 0) * 3)));
    return { institution: q?.shortName || sym, ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), priceToBook: r2(pb), creditHealth: riskScore > 70 ? 'Strong' : riskScore > 45 ? 'Adequate' : 'Watch', riskScore };
  });
  return { banks, summary: { avgRiskScore: Math.round(banks.reduce((s, b) => s + b.riskScore, 0) / banks.length), kreChange: r2(qMap.get('KRE')?.regularMarketChangePercent || 0), vix: r2(vix), systemicStress: vix > 30 ? 'Elevated' : 'Normal' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CounterpartyRisk] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
