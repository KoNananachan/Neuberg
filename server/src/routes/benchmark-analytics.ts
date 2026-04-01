import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX', 'SPY', 'QQQ', 'IWM', 'DIA', 'EFA', 'EEM', '^TNX'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const benchmarks = quotes.filter(q => q?.symbol).map(q => {
    const p = q.regularMarketPrice || 0;
    const h52 = q.fiftyTwoWeekHigh || p; const l52 = q.fiftyTwoWeekLow || p;
    return { symbol: q.symbol!, name: q.shortName || q.symbol!, price: r2(p), change: r2(q.regularMarketChange || 0), changePct: r2(q.regularMarketChangePercent || 0), volume: q.regularMarketVolume || 0, high52w: r2(h52), low52w: r2(l52), drawdownFromHigh: r1(h52 > 0 ? ((p - h52) / h52) * 100 : 0), range52wPct: r1(h52 !== l52 ? ((p - l52) / (h52 - l52)) * 100 : 50), aboveSMA50: !!(q.fiftyDayAverage && p > q.fiftyDayAverage), aboveSMA200: !!(q.twoHundredDayAverage && p > q.twoHundredDayAverage), beta: r2(q.beta || 1) };
  });
  const spx = benchmarks.find(b => b.symbol === '^GSPC');
  const correlations = benchmarks.filter(b => b.symbol !== '^GSPC' && !b.symbol.startsWith('^V')).map(b => ({ benchmark: b.symbol, vsSpx: r2(b.changePct - (spx?.changePct || 0)), outperforming: b.changePct > (spx?.changePct || 0) }));
  return { benchmarks, correlations, summary: { riskOn: (spx?.changePct || 0) > 0 && benchmarks.filter(b => b.changePct > 0).length > benchmarks.length * 0.6, marketBreadth: benchmarks.filter(b => b.changePct > 0).length + '/' + benchmarks.length + ' positive' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BenchmarkAnalytics] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
