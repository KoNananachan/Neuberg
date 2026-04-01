import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'SHY', 'IEF', 'TLT', 'AGG', '^VIX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const fvx = qMap.get('^FVX')?.regularMarketPrice || 4.2; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const swapRates = [{ tenor: '1Y', rate: r3(irx * 0.98), spread: 0 }, { tenor: '2Y', rate: r3((irx + fvx) / 2), spread: 3 }, { tenor: '5Y', rate: r3(fvx + 0.02), spread: 5 }, { tenor: '10Y', rate: r3(tnx + 0.03), spread: 7 }, { tenor: '30Y', rate: r3(tyx + 0.05), spread: 10 }];
  return { swapRates, treasury: [{ tenor: '3M', yield: r3(irx) }, { tenor: '5Y', yield: r3(fvx) }, { tenor: '10Y', yield: r3(tnx) }, { tenor: '30Y', yield: r3(tyx) }], swapSpread10Y: 7, curveSlope: r3(tyx - irx), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[InterestRateSwap]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
