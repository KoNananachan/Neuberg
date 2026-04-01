import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'LQD', 'JNK', 'EMB', 'BNDX', 'AGG', '^TNX', '^VIX', 'XLF', 'FXI', 'EWZ', 'EWW'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const corporateCredit = ['LQD', 'HYG', 'JNK'].map(sym => {
    const q = qMap.get(sym); const yld = (q?.trailingAnnualDividendYield || 0) * 100;
    return { etf: sym, name: q?.shortName || sym, yield: r2(yld), spreadVsTsy: r2(yld - tnx), change: r2(q?.regularMarketChangePercent || 0), signal: (yld - tnx) > 4 ? 'Stress' : 'Normal' };
  });
  const sovereignProxies = [
    { country: 'China', etf: 'FXI' }, { country: 'Brazil', etf: 'EWZ' }, { country: 'Mexico', etf: 'EWW' },
  ].map(s => { const q = qMap.get(s.etf); return { country: s.country, etf: s.etf, change: r2(q?.regularMarketChangePercent || 0), riskSignal: (q?.regularMarketChangePercent || 0) < -2 ? 'Elevated' : 'Normal' }; });
  const emb = qMap.get('EMB'); const embSpread = r2(((emb?.trailingAnnualDividendYield || 0) * 100) - tnx);
  return { corporateCredit, sovereignProxies, emDebt: { embSpread, embChange: r2(emb?.regularMarketChangePercent || 0) }, summary: { vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), overallCreditConditions: corporateCredit.some(c => c.signal === 'Stress') ? 'Deteriorating' : 'Stable' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CDSMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
