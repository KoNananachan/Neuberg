import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BKLN', 'SRLN', 'FLOT', 'HYG', 'JNK', '^IRX', '^TNX', '^VIX', 'KRE', 'XLF'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const loanEtfs = ['BKLN', 'SRLN', 'FLOT'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const hyEtfs = ['HYG', 'JNK'].map(sym => { const q = qMap.get(sym); return { ticker: sym, yield: r2((q?.trailingAnnualDividendYield || 0) * 100), change: r2(q?.regularMarketChangePercent || 0) }; });
  return { loanEtfs, hyEtfs, baseRate: r2(irx), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), defaultRisk: (qMap.get('^VIX')?.regularMarketPrice || 20) > 30 ? 'Elevated' : 'Normal', generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LeveragedLoans]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
