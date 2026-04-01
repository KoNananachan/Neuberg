import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^TNX', '^IRX', '^TYX', 'TLT', 'SHY', 'IEF', 'TIP', 'DXY=X', 'GLD', 'BTC-USD', 'EURUSD=X'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.7;
  const monetaryIndicators = [{ name: '3-Month T-Bill', value: r2(irx), unit: '%' }, { name: '10-Year Treasury', value: r2(tnx), unit: '%' }, { name: '30-Year Treasury', value: r2(tyx), unit: '%' }, { name: 'Yield Curve (10Y-3M)', value: r2(tnx - irx), unit: 'bps' }, { name: 'Dollar Index', value: r2(qMap.get('DXY=X')?.regularMarketPrice), unit: '' }];
  const liquidityProxies = ['TLT', 'SHY', 'IEF', 'TIP', 'GLD', 'BTC-USD'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const spx = qMap.get('^GSPC');
  return { monetaryIndicators, liquidityProxies, equityContext: { sp500: r2(spx?.regularMarketPrice), sp500Change: r2(spx?.regularMarketChangePercent) }, fxContext: { eurUsd: r2(qMap.get('EURUSD=X')?.regularMarketPrice), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MoneyVelocity]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
