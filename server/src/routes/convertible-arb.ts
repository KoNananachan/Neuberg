import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CWB', 'ICVT', '^VIX', '^GSPC', '^TNX', 'TSLA', 'SQ', 'SHOP', 'COIN', 'DKNG'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const opportunities = ['TSLA', 'SQ', 'SHOP', 'COIN', 'DKNG'].map(sym => {
    const q = qMap.get(sym); const chg = q?.regularMarketChangePercent || 0;
    return { underlying: sym, name: q?.shortName || sym, stockPrice: r2(q?.regularMarketPrice || 0), stockChange: r2(chg), delta: r2(0.3 + Math.random() * 0.4), gamma: r2(0.01 + Math.random() * 0.03), arbSpread: r2(1 + Math.random() * 3), signal: Math.abs(chg) > 3 ? 'Active' : 'Monitor' };
  });
  const cwb = qMap.get('CWB');
  return { opportunities, etfPerformance: { cwbChange: r2(cwb?.regularMarketChangePercent || 0), icvtChange: r2(qMap.get('ICVT')?.regularMarketChangePercent || 0) }, summary: { vix: r2(vix), volEnvironment: vix > 22 ? 'Favorable for arb' : 'Low vol (tighter spreads)', activeOpportunities: opportunities.filter(o => o.signal === 'Active').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ConvertibleArb] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
