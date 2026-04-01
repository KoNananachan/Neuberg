import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['LQD', 'HYG', 'JNK', 'AGG', 'EMB', 'MUB', 'TIP', 'BNDX', 'VCSH', 'VCLT', '^TNX', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const sectors = ['LQD', 'HYG', 'JNK', 'AGG', 'EMB', 'MUB', 'TIP', 'BNDX', 'VCSH', 'VCLT'].map(sym => {
    const q = qMap.get(sym); const chg = q?.regularMarketChangePercent || 0;
    return { etf: sym, name: q?.shortName || sym, change: r2(chg), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), flowDirection: chg > 0.2 ? 'Inflow' : chg < -0.2 ? 'Outflow' : 'Neutral' };
  });
  return { sectors, summary: { inflowCount: sectors.filter(s => s.flowDirection === 'Inflow').length, outflowCount: sectors.filter(s => s.flowDirection === 'Outflow').length, riskAppetite: sectors.filter(s => ['HYG', 'JNK', 'EMB'].includes(s.etf) && s.flowDirection === 'Inflow').length > 1 ? 'Risk-On' : 'Risk-Off' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CreditFlow] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
