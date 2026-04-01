import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BDRY', 'DXY=X', 'FXI', 'EWJ', 'EWG', 'EWZ', 'EWW', 'EEM', 'CL=F', 'ZC=F', 'ZS=F', 'USDCNY=X'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const corridors = [{ route: 'US-China', etf: 'FXI', fx: 'USDCNY=X' }, { route: 'US-Japan', etf: 'EWJ', fx: null }, { route: 'US-Europe', etf: 'EWG', fx: null }, { route: 'US-LatAm', etf: 'EWZ', fx: null }].map(c => ({ route: c.route, equityChange: r2(qMap.get(c.etf)?.regularMarketChangePercent || 0), fxRate: c.fx ? r2(qMap.get(c.fx)?.regularMarketPrice || 0) : null, tradeActivity: (qMap.get(c.etf)?.regularMarketChangePercent || 0) > 0.5 ? 'Expanding' : 'Stable' }));
  return { corridors, shippingProxy: r2(qMap.get('BDRY')?.regularMarketChangePercent || 0), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), commodityTrade: { oil: r2(qMap.get('CL=F')?.regularMarketChangePercent || 0), grain: r2(((qMap.get('ZC=F')?.regularMarketChangePercent || 0) + (qMap.get('ZS=F')?.regularMarketChangePercent || 0)) / 2) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalTradeFlow]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
