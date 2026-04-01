import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'JNK', 'ANGL', 'FALN', '^VIX', '^TNX', 'KRE', 'XLF'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const indicators = [
    { name: 'HY Stress', proxy: 'HYG', change: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), signal: (qMap.get('HYG')?.regularMarketChangePercent || 0) < -1 ? 'Stress' : 'Normal' },
    { name: 'Fallen Angels', proxy: 'ANGL', change: r2(qMap.get('ANGL')?.regularMarketChangePercent || 0), signal: (qMap.get('ANGL')?.regularMarketChangePercent || 0) < -1 ? 'Rising downgrades' : 'Stable' },
    { name: 'Bank Sector', proxy: 'KRE', change: r2(qMap.get('KRE')?.regularMarketChangePercent || 0), signal: (qMap.get('KRE')?.regularMarketChangePercent || 0) < -2 ? 'Concern' : 'Stable' },
  ];
  return { indicators, summary: { creditEventRisk: vix > 30 ? 'High' : vix > 22 ? 'Moderate' : 'Low', vix: r2(vix), stressSignals: indicators.filter(d => d.signal !== 'Normal' && d.signal !== 'Stable').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CreditEvent] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
