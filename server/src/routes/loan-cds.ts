import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BKLN', 'SRLN', 'HYG', 'JNK', 'ANGL', '^IRX', '^TNX', '^VIX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = ['BKLN', 'SRLN', 'HYG', 'JNK', 'ANGL'].map(sym => { const q = qMap.get(sym); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { etf: sym, name: q?.shortName || sym, yield: r2(yld), spread: r2(yld - irx), change: r2(q?.regularMarketChangePercent || 0), protectionCost: r2((yld - irx) * 0.4) }; });
  return { sectors, baseRate: r2(irx), tenYear: r2(tnx), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LoanCDS]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
