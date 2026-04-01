import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['GC=F', 'SI=F', 'PL=F', 'PA=F', 'GLD', 'SLV', 'PPLT', '^TNX', '^IRX', 'DXY=X', 'GDX', 'GDXJ', 'SIL'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const metals = [{ sym: 'GC=F', etf: 'GLD', name: 'Gold' }, { sym: 'SI=F', etf: 'SLV', name: 'Silver' }, { sym: 'PL=F', etf: 'PPLT', name: 'Platinum' }, { sym: 'PA=F', etf: null, name: 'Palladium' }].map(m => { const q = qMap.get(m.sym); const e = m.etf ? qMap.get(m.etf) : null; return { metal: m.name, futuresPrice: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), etf: m.etf ? { ticker: m.etf, price: r2(e?.regularMarketPrice), change: r2(e?.regularMarketChangePercent) } : null }; });
  const miners = ['GDX', 'GDXJ', 'SIL'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { metals, miners, macro: { tenYear: r2(qMap.get('^TNX')?.regularMarketPrice), tbill3m: r2(qMap.get('^IRX')?.regularMarketPrice), dollar: r2(qMap.get('DXY=X')?.regularMarketPrice) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[PreciousMetalsLease]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
