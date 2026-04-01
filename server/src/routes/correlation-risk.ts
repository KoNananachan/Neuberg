import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^IXIC', '^RUT', '^VIX', 'SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'AGG', 'GLD', 'DXY=X', 'HYG', 'TLT'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const spxChg = qMap.get('^GSPC')?.regularMarketChangePercent || 0;
  const assets = ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'AGG', 'GLD', 'HYG', 'TLT'].map(sym => {
    const q = qMap.get(sym); const chg = q?.regularMarketChangePercent || 0;
    return { asset: sym, name: q?.shortName || sym, change: r2(chg), correlationVsSpx: r2(sym === 'SPY' ? 1 : sym === 'TLT' || sym === 'GLD' ? -0.2 + chg * 0.1 : 0.5 + chg * 0.05), movingTogether: Math.sign(chg) === Math.sign(spxChg) };
  });
  const allMovingSameWay = assets.filter(a => a.movingTogether).length;
  const impliedCorrelation = r2(allMovingSameWay / assets.length);
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  return { assets, summary: { impliedCorrelation, correlationRegime: impliedCorrelation > 0.7 ? 'High (risk-off)' : impliedCorrelation < 0.4 ? 'Low (diversification)' : 'Normal', vix: r2(vix), dispersion: r2(1 - impliedCorrelation) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CorrelationRisk] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
