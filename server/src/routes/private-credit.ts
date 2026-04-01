import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'JNK', 'LQD', 'BKLN', 'SRLN', 'ARCC', 'MAIN', 'ORCC', 'GBDC', '^TNX', '^IRX', '^VIX', 'XLF'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const creditEtfs = ['HYG', 'JNK', 'LQD', 'BKLN', 'SRLN'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const bdcs = ['ARCC', 'MAIN', 'ORCC', 'GBDC'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), divYield: r2((q?.trailingAnnualDividendYield || 0) * 100), pb: r2(q?.priceToBook) }; });
  return { creditEtfs, bdcs, rates: { tenYear: r2(qMap.get('^TNX')?.regularMarketPrice), tbill3m: r2(qMap.get('^IRX')?.regularMarketPrice) }, vix: r2(qMap.get('^VIX')?.regularMarketPrice), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[PrivateCredit]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
