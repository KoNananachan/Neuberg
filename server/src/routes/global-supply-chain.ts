import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BDRY', 'FDX', 'UPS', 'IYT', 'CL=F', 'NG=F', 'COPX', 'FXI', '^VIX', '^GSPC'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const indicators = [{ name: 'Shipping', proxy: 'BDRY', signal: 'Trade volume' }, { name: 'Logistics', proxy: 'FDX', signal: 'Delivery demand' }, { name: 'Transport', proxy: 'IYT', signal: 'Economic activity' }, { name: 'Energy Cost', proxy: 'CL=F', signal: 'Input costs' }, { name: 'Copper (Dr. Copper)', proxy: 'COPX', signal: 'Industrial demand' }, { name: 'China Factory', proxy: 'FXI', signal: 'Manufacturing' }].map(i => { const q = qMap.get(i.proxy); const chg = q?.regularMarketChangePercent || 0; return { indicator: i.name, proxy: i.proxy, change: r2(chg), signal: i.signal, status: chg > 1 ? 'Improving' : chg < -1 ? 'Deteriorating' : 'Stable' }; });
  const stressLevel = indicators.filter(i => i.status === 'Deteriorating').length >= 3 ? 'Elevated' : 'Normal';
  return { indicators, stressLevel, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalSupplyChain]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
