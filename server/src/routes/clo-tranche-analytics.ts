import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BKLN', 'SRLN', 'FLOT', 'HYG', 'JNK', 'ANGL', 'FALN', '^IRX', '^TNX', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const tranches = [
    { rating: 'AAA', proxy: 'BKLN', spread: 130, lossBuffer: 35 }, { rating: 'AA', proxy: 'SRLN', spread: 180, lossBuffer: 28 },
    { rating: 'A', proxy: 'FLOT', spread: 250, lossBuffer: 22 }, { rating: 'BBB', proxy: 'HYG', spread: 350, lossBuffer: 15 },
    { rating: 'BB', proxy: 'JNK', spread: 500, lossBuffer: 8 }, { rating: 'Equity', proxy: 'ANGL', spread: 800, lossBuffer: 0 },
  ].map(t => {
    const q = qMap.get(t.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100;
    return { rating: t.rating, etfProxy: t.proxy, yield: r2(yld), spreadBps: t.spread, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), lossBufferPct: t.lossBuffer, allInYield: r2(irx + t.spread / 100) };
  });
  return { tranches, summary: { baseRate: r2(irx), equityYield: r2(tranches[5]?.allInYield || 13), seniorSpread: tranches[0]?.spreadBps || 130, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CLOTrancheAnalytics] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
