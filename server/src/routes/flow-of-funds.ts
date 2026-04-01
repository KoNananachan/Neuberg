import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AGG', 'TLT', 'HYG', 'GLD', 'EFA', 'EEM', 'VNQ', 'DBC', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const flows = SYMBOLS.filter(s => s !== '^VIX').map(sym => { const q = qMap.get(sym); const vol = q?.regularMarketVolume || 0; const chg = q?.regularMarketChangePercent || 0; const price = q?.regularMarketPrice || 1; return { asset: q?.shortName || sym, proxy: sym, change: r2(chg), flowDirection: chg > 0.2 ? 'Inflow' : chg < -0.2 ? 'Outflow' : 'Neutral', volumeUSD: r1(vol * price / 1e9), aum: r1((q?.marketCap || 0) / 1e9) }; });
  const riskOn = flows.filter(f => ['SPY', 'QQQ', 'EEM', 'HYG'].includes(f.proxy) && f.flowDirection === 'Inflow').length;
  return { flows, summary: { riskAppetite: riskOn >= 3 ? 'Risk-On' : riskOn <= 1 ? 'Risk-Off' : 'Neutral', vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), inflowCount: flows.filter(f => f.flowDirection === 'Inflow').length, outflowCount: flows.filter(f => f.flowDirection === 'Outflow').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FlowOfFunds] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
