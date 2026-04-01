import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['VMFXX', 'SPAXX', 'SWVXX', 'SNVXX', '^IRX', '^TNX', 'SHV', 'BIL', 'SGOV', 'USFR', 'TFLO'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10000) / 10000 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const fundTickers = ['VMFXX', 'SPAXX', 'SWVXX', 'SNVXX'];
  const funds = fundTickers.map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, nav: r4(q?.regularMarketPrice || 1), yield7d: r2((q?.trailingAnnualDividendYield || 0) * 100), change: r2(q?.regularMarketChangePercent) }; });
  const shortTermEtfs = ['SHV', 'BIL', 'SGOV', 'USFR', 'TFLO'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  return { funds, shortTermEtfs, rates: { tbill3m: r2(irx), treasury10y: r2(tnx), yieldCurveSpread: r2(tnx - irx) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MoneyMarketFund]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
