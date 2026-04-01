import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^IRX', '^FVX', '^TYX', 'TLT', 'SHY', 'IEF', 'GOVT', 'VGSH', 'VGIT', 'VGLT', '^VIX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const durationEtfs = [{ sym: 'VGSH', label: 'Short 1-3Y' }, { sym: 'SHY', label: 'Short 1-3Y' }, { sym: 'VGIT', label: 'Intermediate 3-10Y' }, { sym: 'IEF', label: 'Intermediate 7-10Y' }, { sym: 'VGLT', label: 'Long 10-25Y' }, { sym: 'TLT', label: 'Long 20+Y' }].map(d => { const q = qMap.get(d.sym); return { ticker: d.sym, label: d.label, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { durationEtfs, curve: [{ tenor: '3M', yield: r2(qMap.get('^IRX')?.regularMarketPrice) }, { tenor: '5Y', yield: r2(qMap.get('^FVX')?.regularMarketPrice) }, { tenor: '10Y', yield: r2(qMap.get('^TNX')?.regularMarketPrice) }, { tenor: '30Y', yield: r2(qMap.get('^TYX')?.regularMarketPrice) }], vix: r2(qMap.get('^VIX')?.regularMarketPrice), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[SovereignDebtMaturity]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
