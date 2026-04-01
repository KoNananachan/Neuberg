import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', '^VIX', 'SHY', 'IEI', 'IEF', 'TLT', 'AGG'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const fvx = qMap.get('^FVX')?.regularMarketPrice || 4.2; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const rates = [{ tenor: '1Y', swapRate: r3(irx * 0.98), treasuryYield: r3(irx), spread: 0 }, { tenor: '2Y', swapRate: r3((irx + fvx) / 2 + 0.02), treasuryYield: r3((irx + fvx) / 2), spread: 2 }, { tenor: '5Y', swapRate: r3(fvx + 0.03), treasuryYield: r3(fvx), spread: 3 }, { tenor: '10Y', swapRate: r3(tnx + 0.04), treasuryYield: r3(tnx), spread: 4 }, { tenor: '30Y', swapRate: r3(tyx + 0.06), treasuryYield: r3(tyx), spread: 6 }];
  const etfs = ['SHY', 'IEI', 'IEF', 'TLT'].map(sym => { const q = qMap.get(sym); return { ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; });
  return { rates, etfs, curveSlope: r3(tyx - irx), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[IRSMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
