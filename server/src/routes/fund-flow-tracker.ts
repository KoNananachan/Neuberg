import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'DIA', 'AGG', 'TLT', 'HYG', 'LQD', 'GLD', 'SLV', 'EFA', 'EEM', 'VNQ', 'ARKK', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const trackers = SYMBOLS.filter(s => s !== '^VIX').map(sym => { const q = qMap.get(sym); const vol = q?.regularMarketVolume || 0; const chg = q?.regularMarketChangePercent || 0; const p = q?.regularMarketPrice || 1; return { etf: sym, name: q?.shortName || sym, price: r2(p), change: r2(chg), volume: vol, aum: r1((q?.marketCap || 0) / 1e9), flowEstimate: r1((vol * p * (chg > 0 ? 0.2 : -0.2)) / 1e6), streak: chg > 0 ? 'Positive' : 'Negative' }; }).sort((a, b) => b.flowEstimate - a.flowEstimate);
  return { trackers, topInflows: trackers.filter(t => t.flowEstimate > 0).slice(0, 5), topOutflows: [...trackers].sort((a, b) => a.flowEstimate - b.flowEstimate).filter(t => t.flowEstimate < 0).slice(0, 5), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FundFlowTracker] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
