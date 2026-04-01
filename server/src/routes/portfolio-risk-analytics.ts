import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^GSPC', '^TNX', 'SPY', 'QQQ', 'IWM', 'TLT', 'GLD', 'HYG', 'LQD', 'XLK', 'XLF', 'XLE', 'XLV', 'DXY=X'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = r2(qMap.get('^VIX')?.regularMarketPrice);
  const assetClasses = [{ sym: 'SPY', label: 'US Large Cap' }, { sym: 'QQQ', label: 'US Tech' }, { sym: 'IWM', label: 'US Small Cap' }, { sym: 'TLT', label: 'Long Treasury' }, { sym: 'GLD', label: 'Gold' }, { sym: 'HYG', label: 'High Yield' }, { sym: 'LQD', label: 'IG Credit' }].map(a => { const q = qMap.get(a.sym); return { label: a.label, ticker: a.sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const sectors = ['XLK', 'XLF', 'XLE', 'XLV'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, change: r2(q?.regularMarketChangePercent) }; });
  return { assetClasses, sectors, riskDashboard: { vix, sp500Change: r2(qMap.get('^GSPC')?.regularMarketChangePercent), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice), riskRegime: vix > 30 ? 'Crisis' : vix > 20 ? 'Risk-Off' : 'Risk-On' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[PortfolioRiskAnalytics]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
