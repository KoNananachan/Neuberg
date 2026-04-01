import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EMB', 'EMLC', 'VWOB', 'PCY', 'EEM', 'FXI', 'EWZ', 'EWW', 'EWY', 'INDA', 'DXY=X', '^TNX', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const bondEtfs = ['EMB', 'EMLC', 'VWOB', 'PCY'].map(sym => { const q = qMap.get(sym); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2(yld), spreadVsUST: r2(yld - tnx) }; });
  const countryProxies = [{ country: 'China', etf: 'FXI' }, { country: 'Brazil', etf: 'EWZ' }, { country: 'Mexico', etf: 'EWW' }, { country: 'Korea', etf: 'EWY' }, { country: 'India', etf: 'INDA' }].map(c => { const q = qMap.get(c.etf); return { country: c.country, etf: c.etf, change: r2(q?.regularMarketChangePercent || 0), riskSignal: (q?.regularMarketChangePercent || 0) < -1 ? 'Stress' : 'Stable' }; });
  return { bondEtfs, countryProxies, summary: { avgEMSpread: r2(bondEtfs.reduce((s, b) => s + b.spreadVsUST, 0) / bondEtfs.length), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), emEquityChange: r2(qMap.get('EEM')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EMBonds] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
