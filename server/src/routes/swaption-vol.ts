import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^TNX', '^IRX', '^TYX', 'TLT', 'SHY', 'IEF', 'UVXY', 'SVXY', 'EURUSD=X'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = r2(qMap.get('^VIX')?.regularMarketPrice);
  const rateEtfs = ['TLT', 'SHY', 'IEF'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const volProducts = ['UVXY', 'SVXY'].map(sym => { const q = qMap.get(sym); return { ticker: sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { rateEtfs, volProducts, rates: { tbill3m: r2(qMap.get('^IRX')?.regularMarketPrice), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice), thirtyYear: r2(qMap.get('^TYX')?.regularMarketPrice) }, vix, volRegime: vix > 30 ? 'High' : vix > 20 ? 'Elevated' : 'Normal', generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[SwaptionVol]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
