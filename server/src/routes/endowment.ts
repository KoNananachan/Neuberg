import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', 'SPY', 'AGG', 'TLT', 'GLD', 'DBC', 'VNQ', 'EFA', 'EEM', 'HYG', 'TIP', 'BKLN', '^VIX', '^TNX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  // Endowment-style multi-asset allocation
  const allocations = [
    { asset: 'US Equities', proxy: 'SPY', weight: 30 }, { asset: 'Intl Developed', proxy: 'EFA', weight: 15 },
    { asset: 'Emerging Markets', proxy: 'EEM', weight: 10 }, { asset: 'Fixed Income', proxy: 'AGG', weight: 15 },
    { asset: 'Real Estate', proxy: 'VNQ', weight: 10 }, { asset: 'Commodities', proxy: 'DBC', weight: 5 },
    { asset: 'Gold', proxy: 'GLD', weight: 5 }, { asset: 'Credit', proxy: 'HYG', weight: 5 },
    { asset: 'TIPS', proxy: 'TIP', weight: 5 },
  ].map(a => { const q = qMap.get(a.proxy); return { asset: a.asset, proxy: a.proxy, weight: a.weight, change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const portfolioReturn = r2(allocations.reduce((s, a) => s + a.change * a.weight / 100, 0));
  return { allocations, summary: { portfolioReturn, portfolioYield: r2(allocations.reduce((s, a) => s + a.yield * a.weight / 100, 0)), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), riskLevel: (qMap.get('^VIX')?.regularMarketPrice || 20) > 25 ? 'Elevated' : 'Normal' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[Endowment] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
