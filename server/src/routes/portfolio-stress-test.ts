import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^GSPC', '^TNX', '^TYX', 'SPY', 'QQQ', 'IWM', 'TLT', 'GLD', 'HYG', 'LQD', 'DXY=X', 'CL=F', 'BTC-USD'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = r2(qMap.get('^VIX')?.regularMarketPrice);
  const riskAssets = ['SPY', 'QQQ', 'IWM', 'HYG', 'BTC-USD'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const safeHavens = ['TLT', 'GLD', 'LQD'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  return { riskAssets, safeHavens, macro: { vix, sp500: r2(qMap.get('^GSPC')?.regularMarketPrice), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice), thirtyYear: r2(qMap.get('^TYX')?.regularMarketPrice), oil: r2(qMap.get('CL=F')?.regularMarketPrice), dollar: r2(qMap.get('DXY=X')?.regularMarketPrice) }, stressLevel: vix > 35 ? 'Severe' : vix > 25 ? 'High' : vix > 18 ? 'Moderate' : 'Low', generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[PortfolioStressTest]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
