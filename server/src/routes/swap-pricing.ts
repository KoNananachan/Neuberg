import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^IRX', '^FVX', '^TYX', 'TLT', 'SHY', 'IEF', 'FLOT', '^VIX', 'EURUSD=X', 'DXY=X'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = r2(qMap.get('^IRX')?.regularMarketPrice); const fvx = r2(qMap.get('^FVX')?.regularMarketPrice); const tnx = r2(qMap.get('^TNX')?.regularMarketPrice); const tyx = r2(qMap.get('^TYX')?.regularMarketPrice);
  const curve = [{ tenor: '3M', yield: irx }, { tenor: '5Y', yield: fvx }, { tenor: '10Y', yield: tnx }, { tenor: '30Y', yield: tyx }];
  const bondEtfs = ['TLT', 'SHY', 'IEF', 'FLOT'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { curve, bondEtfs, spreads: { twoTen: r2(tnx - irx), fiveThirty: r2(tyx - fvx) }, vix: r2(qMap.get('^VIX')?.regularMarketPrice), dollar: r2(qMap.get('DXY=X')?.regularMarketPrice), eurUsd: r2(qMap.get('EURUSD=X')?.regularMarketPrice), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[SwapPricing]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
