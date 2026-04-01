import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AGG', 'TLT', 'HYG', 'GLD', 'EFA', 'EEM', 'VNQ', 'XLK', 'XLF', 'XLE', 'XLV', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const funds = SYMBOLS.filter(s => s !== '^VIX').map(sym => { const q = qMap.get(sym); const vol = q?.regularMarketVolume || 0; const chg = q?.regularMarketChangePercent || 0; const p = q?.regularMarketPrice || 1; return { etf: sym, name: q?.shortName || sym, change: r2(chg), flowEstimate: r1((vol * p * (chg > 0 ? 0.2 : -0.2)) / 1e6), direction: chg > 0.2 ? 'Inflow' : chg < -0.2 ? 'Outflow' : 'Flat' }; }).sort((a, b) => b.flowEstimate - a.flowEstimate);
  return { funds, summary: { netFlow: r1(funds.reduce((s, f) => s + f.flowEstimate, 0)), inflowCount: funds.filter(f => f.direction === 'Inflow').length, outflowCount: funds.filter(f => f.direction === 'Outflow').length, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FundFlow] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
