import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BDRY', 'SBLK', 'GOGL', 'EGLE', 'SFL', 'DAC', 'ZIM', 'MATX', 'CL=F', 'DXY=X', '^GSPC', '^VIX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const shippers = ['BDRY', 'SBLK', 'GOGL', 'EGLE', 'SFL', 'DAC', 'ZIM', 'MATX'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), divYield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  return { shippers, macro: { oil: r2(qMap.get('CL=F')?.regularMarketPrice), dollar: r2(qMap.get('DXY=X')?.regularMarketPrice), vix: r2(qMap.get('^VIX')?.regularMarketPrice) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[ShippingRates]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
