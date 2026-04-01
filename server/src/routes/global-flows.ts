import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'EFA', 'EEM', 'AGG', 'EMB', 'GLD', 'DBC', 'VNQ', 'HYG', 'TLT', 'DXY=X', '^VIX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const flows = [{ region: 'US Equity', proxy: 'SPY' }, { region: 'DM ex-US', proxy: 'EFA' }, { region: 'Emerging Markets', proxy: 'EEM' }, { region: 'US Bonds', proxy: 'AGG' }, { region: 'EM Bonds', proxy: 'EMB' }, { region: 'Commodities', proxy: 'DBC' }, { region: 'Gold', proxy: 'GLD' }, { region: 'Real Estate', proxy: 'VNQ' }, { region: 'High Yield', proxy: 'HYG' }, { region: 'Treasuries', proxy: 'TLT' }].map(f => { const q = qMap.get(f.proxy); const chg = q?.regularMarketChangePercent || 0; return { region: f.region, proxy: f.proxy, change: r2(chg), direction: chg > 0.3 ? 'Inflow' : chg < -0.3 ? 'Outflow' : 'Flat' }; });
  return { flows, summary: { dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), riskAppetite: flows.filter(f => ['SPY', 'EEM', 'HYG'].includes(f.proxy) && f.direction === 'Inflow').length >= 2 ? 'Risk-On' : 'Risk-Off' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalFlows]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
