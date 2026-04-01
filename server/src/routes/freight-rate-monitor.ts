import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BDRY', 'SBLK', 'GOGL', 'ZIM', 'DAC', 'MATX', 'FRO', 'STNG', 'TNK', 'INSW', 'CL=F'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const bdry = qMap.get('BDRY');
  const routes = [{ route: 'Capesize (C5TC)', segment: 'Dry Bulk', proxy: 'SBLK' }, { route: 'Panamax (P5TC)', segment: 'Dry Bulk', proxy: 'GOGL' }, { route: 'Shanghai-Rotterdam', segment: 'Container', proxy: 'ZIM' }, { route: 'Transpacific', segment: 'Container', proxy: 'DAC' }, { route: 'VLCC (TD3)', segment: 'Tanker', proxy: 'FRO' }, { route: 'Suezmax', segment: 'Tanker', proxy: 'STNG' }].map(r => { const q = qMap.get(r.proxy); return { route: r.route, segment: r.segment, proxy: r.proxy, change: r2(q?.regularMarketChangePercent || 0), trend: (q?.regularMarketChangePercent || 0) > 1 ? 'Rising' : (q?.regularMarketChangePercent || 0) < -1 ? 'Falling' : 'Stable' }; });
  return { routes, bdiProxy: Math.round((bdry?.regularMarketPrice || 10) * 150), oilPrice: r2(qMap.get('CL=F')?.regularMarketPrice || 75), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FreightRateMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
