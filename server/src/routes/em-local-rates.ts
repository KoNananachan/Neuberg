import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EMLC', 'EMB', 'VWOB', 'EEM', 'FXI', 'EWZ', 'EWW', 'EWY', 'INDA', 'EWT', 'DXY=X', '^TNX', '^VIX', 'USDCNY=X', 'USDBRL=X'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const localBondEtfs = ['EMLC', 'EMB', 'VWOB'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const countries = [{ name: 'China', etf: 'FXI', fx: 'USDCNY=X' }, { name: 'Brazil', etf: 'EWZ', fx: 'USDBRL=X' }, { name: 'Mexico', etf: 'EWW', fx: null }, { name: 'Korea', etf: 'EWY', fx: null }, { name: 'India', etf: 'INDA', fx: null }, { name: 'Taiwan', etf: 'EWT', fx: null }].map(c => { const q = qMap.get(c.etf); return { country: c.name, etfChange: r2(q?.regularMarketChangePercent || 0), fxRate: c.fx ? r2(qMap.get(c.fx)?.regularMarketPrice || 0) : null }; });
  return { localBondEtfs, countries, summary: { dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), emEquityChange: r2(qMap.get('EEM')?.regularMarketChangePercent || 0), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), localVsHard: r2((qMap.get('EMLC')?.regularMarketChangePercent || 0) - (qMap.get('EMB')?.regularMarketChangePercent || 0)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EMLocalRates] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
