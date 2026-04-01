import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'SHV', 'BIL', 'SGOV', 'USFR', 'TFLO', 'FLOT', 'EURUSD=X', 'GBPUSD=X', 'JPY=X'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const fvx = qMap.get('^FVX')?.regularMarketPrice || 4.3; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.7;
  const treasuryRates = [{ tenor: '3-month', rate: r2(irx) }, { tenor: '5-year', rate: r2(fvx) }, { tenor: '10-year', rate: r2(tnx) }, { tenor: '30-year', rate: r2(tyx) }];
  const shortTermEtfs = ['SHV', 'BIL', 'SGOV', 'USFR', 'TFLO', 'FLOT'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const fxRates = [{ pair: 'EUR/USD', sym: 'EURUSD=X' }, { pair: 'GBP/USD', sym: 'GBPUSD=X' }, { pair: 'USD/JPY', sym: 'JPY=X' }].map(fx => { const q = qMap.get(fx.sym); return { pair: fx.pair, rate: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { treasuryRates, shortTermEtfs, fxRates, summary: { fedFundsProxy: r2(irx), yieldCurveSpread: r2(tnx - irx), shortEndAvgYield: r2((irx + fvx) / 2) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MoneyMarketRates]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
