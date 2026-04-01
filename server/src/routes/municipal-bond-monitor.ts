import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['MUB', 'VTEB', 'TFI', 'HYD', 'CMF', 'NYF', 'SHM', 'MLN', '^TNX', '^IRX', '^FVX', '^TYX', 'HYG', 'LQD'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const muniEtfs = ['MUB', 'VTEB', 'TFI', 'HYD', 'CMF', 'NYF', 'SHM', 'MLN'].map(sym => { const q = qMap.get(sym); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), yield: r2(yld), taxEquivYield: r2(yld / (1 - 0.37)) }; });
  const treasuryRates = { tbill3m: r2(qMap.get('^IRX')?.regularMarketPrice), fiveYear: r2(qMap.get('^FVX')?.regularMarketPrice), tenYear: r2(tnx), thirtyYear: r2(qMap.get('^TYX')?.regularMarketPrice) };
  const creditComps = [{ sym: 'HYG', label: 'HY Corp' }, { sym: 'LQD', label: 'IG Corp' }].map(c => { const q = qMap.get(c.sym); return { label: c.label, ticker: c.sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const mub = qMap.get('MUB'); const mubYield = (mub?.trailingAnnualDividendYield || 0) * 100;
  return { muniEtfs, treasuryRates, creditComps, marketStats: { muniTreasuryRatio10Y: r2(mubYield > 0 && tnx > 0 ? mubYield / tnx * 100 : 0), avgMuniYield: r2(muniEtfs.reduce((s, e) => s + e.yield, 0) / muniEtfs.length) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MunicipalBondMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
