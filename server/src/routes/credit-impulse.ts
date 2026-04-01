import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^IRX', '^VIX', 'HYG', 'LQD', 'JNK', 'KRE', 'XLF', '^GSPC', 'TLT', 'BKLN'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const hygChg = qMap.get('HYG')?.regularMarketChangePercent || 0; const kreChg = qMap.get('KRE')?.regularMarketChangePercent || 0;
  const components = [
    { name: 'Credit Spreads', change: r2(hygChg), signal: hygChg > 0.3 ? 'Easing' : hygChg < -0.3 ? 'Tightening' : 'Stable' },
    { name: 'Bank Lending', change: r2(kreChg), signal: kreChg > 0.5 ? 'Expanding' : kreChg < -0.5 ? 'Contracting' : 'Stable' },
    { name: 'Loan Demand', change: r2(qMap.get('BKLN')?.regularMarketChangePercent || 0), signal: (qMap.get('BKLN')?.regularMarketChangePercent || 0) > 0 ? 'Strong' : 'Weak' },
    { name: 'Yield Curve', value: r2(tnx - irx), signal: (tnx - irx) < 0 ? 'Inverted' : 'Normal' },
  ];
  const impulseScore = Math.min(100, Math.max(0, Math.round(50 + hygChg * 5 + kreChg * 3 + (tnx - irx) * 10)));
  return { components, impulseScore, creditConditions: impulseScore > 60 ? 'Easing' : impulseScore < 40 ? 'Tightening' : 'Neutral', generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CreditImpulse] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
