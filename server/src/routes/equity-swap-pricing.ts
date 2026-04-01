import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^IXIC', '^RUT', '^VIX', '^IRX', '^TNX', 'SPY', 'QQQ', 'IWM', 'EFA', 'EEM'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const swaps = [{ name: 'S&P 500 TRS', index: '^GSPC', etf: 'SPY' }, { name: 'Nasdaq 100 TRS', index: '^IXIC', etf: 'QQQ' }, { name: 'Russell 2000 TRS', index: '^RUT', etf: 'IWM' }, { name: 'EAFE TRS', index: 'EFA', etf: 'EFA' }, { name: 'EM TRS', index: 'EEM', etf: 'EEM' }].map(s => { const q = qMap.get(s.etf); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { swap: s.name, etf: s.etf, indexReturn: r2(q?.regularMarketChangePercent || 0), dividendYield: r2(yld), financingRate: r2(irx + 0.3), totalReturnSpread: r2((q?.regularMarketChangePercent || 0) + yld / 365 - irx / 365) }; });
  return { swaps, summary: { baseRate: r2(irx), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), avgFinancingCost: r2(irx + 0.3) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquitySwapPricing] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
