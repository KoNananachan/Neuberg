import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['DXY=X', 'EURUSD=X', 'GBPUSD=X', 'JPY=X', 'CL=F', 'NG=F', 'GC=F', '^GSPC', '^VIX', 'XLE', 'EWR', 'RSX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const commodities = [{ sym: 'CL=F', name: 'Crude Oil' }, { sym: 'NG=F', name: 'Natural Gas' }, { sym: 'GC=F', name: 'Gold' }].map(c => { const q = qMap.get(c.sym); return { name: c.name, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const fx = [{ sym: 'EURUSD=X', pair: 'EUR/USD' }, { sym: 'GBPUSD=X', pair: 'GBP/USD' }, { sym: 'JPY=X', pair: 'USD/JPY' }].map(f => { const q = qMap.get(f.sym); return { pair: f.pair, rate: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { commodities, fx, dollar: r2(qMap.get('DXY=X')?.regularMarketPrice), vix: r2(qMap.get('^VIX')?.regularMarketPrice), energySector: r2(qMap.get('XLE')?.regularMarketChangePercent), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[SanctionsMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
