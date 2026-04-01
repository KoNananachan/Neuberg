import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^TNX', '^IRX', '^VIX', 'IYT', 'XLI', 'COPX', 'HYG', 'TLT', 'DXY=X', 'GLD'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const indicators = [
    { name: 'Equity Market', proxy: '^GSPC', change: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), signal: (qMap.get('^GSPC')?.regularMarketChangePercent || 0) > 0 ? 'Expansionary' : 'Cautious' },
    { name: 'Transportation', proxy: 'IYT', change: r2(qMap.get('IYT')?.regularMarketChangePercent || 0), signal: (qMap.get('IYT')?.regularMarketChangePercent || 0) > 0 ? 'Growing' : 'Slowing' },
    { name: 'Industrial', proxy: 'XLI', change: r2(qMap.get('XLI')?.regularMarketChangePercent || 0), signal: (qMap.get('XLI')?.regularMarketChangePercent || 0) > 0 ? 'Expanding' : 'Contracting' },
    { name: 'Yield Curve', value: r2(tnx - irx), signal: (tnx - irx) < 0 ? 'Recession Warning' : 'Normal' },
    { name: 'Credit', proxy: 'HYG', change: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), signal: (qMap.get('HYG')?.regularMarketChangePercent || 0) > 0 ? 'Easing' : 'Tightening' },
  ];
  const gdpProxy = r1(2.5 + (qMap.get('^GSPC')?.regularMarketChangePercent || 0) * 0.5 + (tnx - irx) * 2);
  return { indicators, forecast: { gdpEstimate: gdpProxy, trend: gdpProxy > 2 ? 'Above Trend' : gdpProxy > 0 ? 'Below Trend' : 'Contraction', vix: r2(vix), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EconomicForecast] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
