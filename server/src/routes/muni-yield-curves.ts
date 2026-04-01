import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['MUB', 'VTEB', 'TFI', 'HYD', 'SHM', 'SUB', '^TNX', '^IRX', '^FVX', '^TYX', 'TLT', 'IEF', 'SHY'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = r2(qMap.get('^IRX')?.regularMarketPrice); const fvx = r2(qMap.get('^FVX')?.regularMarketPrice); const tnx = r2(qMap.get('^TNX')?.regularMarketPrice); const tyx = r2(qMap.get('^TYX')?.regularMarketPrice);
  const treasuryCurve = [{ tenor: '3M', yield: irx }, { tenor: '5Y', yield: fvx }, { tenor: '10Y', yield: tnx }, { tenor: '30Y', yield: tyx }];
  const muniEtfs = ['MUB', 'VTEB', 'TFI', 'HYD', 'SHM', 'SUB'].map(sym => { const q = qMap.get(sym); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), yield: r2(yld), taxEquivYield: r2(yld / (1 - 0.37)), muniTreasuryRatio: r2(tnx > 0 ? yld / tnx * 100 : 0) }; });
  const durationEtfs = [{ sym: 'SHY', label: 'Short' }, { sym: 'IEF', label: 'Intermediate' }, { sym: 'TLT', label: 'Long' }].map(d => { const q = qMap.get(d.sym); return { label: d.label, ticker: d.sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { treasuryCurve, muniEtfs, durationEtfs, summary: { yieldCurveSpread: r2(tyx - irx), muniAvgYield: r2(muniEtfs.reduce((s, e) => s + e.yield, 0) / muniEtfs.length) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MuniYieldCurves]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
