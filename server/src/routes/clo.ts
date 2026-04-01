import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
// CLO proxies: leveraged loan ETFs + high yield
const SYMBOLS = ['BKLN', 'SRLN', 'FLOT', 'HYG', 'JNK', 'ANGL', '^IRX', '^TNX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const tranches = [
    { tranche: 'AAA', etfProxy: 'BKLN', spread: 1.3 }, { tranche: 'AA', etfProxy: 'SRLN', spread: 1.8 },
    { tranche: 'A', etfProxy: 'FLOT', spread: 2.5 }, { tranche: 'BBB', etfProxy: 'HYG', spread: 3.5 },
    { tranche: 'BB', etfProxy: 'JNK', spread: 5.0 }, { tranche: 'Equity', etfProxy: 'ANGL', spread: 8.0 },
  ].map(t => {
    const q = qMap.get(t.etfProxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100;
    return { tranche: t.tranche, etfProxy: t.etfProxy, yield: r2(yld), spreadBps: Math.round(t.spread * 100), price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) };
  });
  return { tranches, summary: { baseRate: r2(irx), avgSpread: Math.round(tranches.reduce((s, t) => s + t.spreadBps, 0) / tranches.length), loanMarketHealth: tranches.every(t => t.change > -0.5) ? 'Stable' : 'Stress' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CLO] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
