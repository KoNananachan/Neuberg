import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^IRX', '^FVX', '^TYX', 'TLT', 'SHY', 'IEF', 'FLOT', 'TFLO', '^VIX', 'EURUSD=X'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const rateCurve = [{ tenor: '3M', rate: r2(qMap.get('^IRX')?.regularMarketPrice) }, { tenor: '5Y', rate: r2(qMap.get('^FVX')?.regularMarketPrice) }, { tenor: '10Y', rate: r2(qMap.get('^TNX')?.regularMarketPrice) }, { tenor: '30Y', rate: r2(qMap.get('^TYX')?.regularMarketPrice) }];
  const rateEtfs = ['TLT', 'SHY', 'IEF', 'FLOT', 'TFLO'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { rateCurve, rateEtfs, vix: r2(qMap.get('^VIX')?.regularMarketPrice), eurUsd: r2(qMap.get('EURUSD=X')?.regularMarketPrice), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[RateCapsFloors]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
