import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AGG', 'TLT', 'HYG', 'GLD', 'EFA', 'EEM', 'VNQ', 'XLE', 'XLF', 'XLK', 'XLV', 'DBC'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const etfs = quotes.filter(q => q?.symbol).map(q => { const vol = q.regularMarketVolume || 0; const chg = q.regularMarketChangePercent || 0; const price = q.regularMarketPrice || 1; const flowEst = r1((vol * price * (chg > 0 ? 0.25 : -0.25)) / 1e6); return { ticker: q.symbol!, name: q.shortName || q.symbol!, price: r2(price), change: r2(chg), volume: vol, aum: r1((q.marketCap || 0) / 1e9), estimatedFlow: flowEst, direction: flowEst > 0 ? 'Inflow' : 'Outflow' }; }).sort((a, b) => b.estimatedFlow - a.estimatedFlow);
  return { etfs, summary: { totalInflow: r1(etfs.filter(e => e.estimatedFlow > 0).reduce((s, e) => s + e.estimatedFlow, 0)), totalOutflow: r1(etfs.filter(e => e.estimatedFlow < 0).reduce((s, e) => s + e.estimatedFlow, 0)), netFlow: r1(etfs.reduce((s, e) => s + e.estimatedFlow, 0)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[ETFFlows] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
