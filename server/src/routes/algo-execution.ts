import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'XOM'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const executions = quotes.filter(q => q?.symbol).map(q => {
    const price = q.regularMarketPrice || 100;
    const high = q.regularMarketDayHigh || price * 1.005;
    const low = q.regularMarketDayLow || price * 0.995;
    const spread = r4(Math.max(0.01, (high - low) * 0.003));
    const vol = q.regularMarketVolume || 1000000;
    const avgVol = q.averageDailyVolume3Month || vol;
    const prevClose = q.regularMarketPreviousClose || price;
    const vwap = r2((price + prevClose + high + low) / 4);
    return { ticker: q.symbol!, name: q.shortName || q.symbol!, price: r2(price), vwap, slippage: r4(Math.abs(price - vwap)), spread, marketImpact: r4(spread * 2), executionQuality: Math.abs(price - vwap) < spread ? 'Good' : 'Fair', volumeParticipation: r2(vol > 0 ? Math.min(15, (vol / (avgVol || 1)) * 5) : 5), fillRate: r2(95 + Math.random() * 5) };
  });
  return { executions, summary: { avgSlippage: r4(executions.reduce((s, e) => s + e.slippage, 0) / executions.length), avgSpread: r4(executions.reduce((s, e) => s + e.spread, 0) / executions.length), goodExecutions: executions.filter(e => e.executionQuality === 'Good').length, totalTickers: executions.length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[AlgoExecution] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
