import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^TNX', '^TYX', 'TLT', 'AGG', 'LQD', 'HYG', 'VTI', 'VXUS', 'VNQ', 'TIP', 'SPY', '^VIX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const assetClasses = [{ sym: 'VTI', label: 'US Equity' }, { sym: 'VXUS', label: 'Intl Equity' }, { sym: 'AGG', label: 'Aggregate Bond' }, { sym: 'TLT', label: 'Long Treasury' }, { sym: 'LQD', label: 'IG Corporate' }, { sym: 'HYG', label: 'High Yield' }, { sym: 'VNQ', label: 'Real Estate' }, { sym: 'TIP', label: 'TIPS' }].map(a => { const q = qMap.get(a.sym); return { label: a.label, ticker: a.sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const tnx = r2(qMap.get('^TNX')?.regularMarketPrice); const tyx = r2(qMap.get('^TYX')?.regularMarketPrice); const vix = r2(qMap.get('^VIX')?.regularMarketPrice);
  return { assetClasses, rates: { tenYear: tnx, thirtyYear: tyx, discountRateProxy: tyx }, riskIndicators: { vix, sp500Change: r2(qMap.get('^GSPC')?.regularMarketChangePercent) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[PensionFund]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
