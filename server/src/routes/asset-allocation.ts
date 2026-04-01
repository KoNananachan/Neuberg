import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^IXIC', '^RUT', 'AGG', 'TLT', 'TIP', 'GLD', 'DBC', 'VNQ', 'EFA', 'EEM', 'HYG', 'SPY', 'QQQ', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const assetClasses = [
    { name: 'US Large Cap', proxy: 'SPY', weight: 35 }, { name: 'US Small Cap', proxy: '^RUT', weight: 10 },
    { name: 'International Developed', proxy: 'EFA', weight: 15 }, { name: 'Emerging Markets', proxy: 'EEM', weight: 5 },
    { name: 'US Bonds', proxy: 'AGG', weight: 15 }, { name: 'Long Treasury', proxy: 'TLT', weight: 5 },
    { name: 'High Yield', proxy: 'HYG', weight: 3 }, { name: 'TIPS', proxy: 'TIP', weight: 2 },
    { name: 'Real Estate', proxy: 'VNQ', weight: 5 }, { name: 'Gold', proxy: 'GLD', weight: 3 },
    { name: 'Commodities', proxy: 'DBC', weight: 2 },
  ].map(ac => {
    const q = qMap.get(ac.proxy);
    return { ...ac, change: r2(q?.regularMarketChangePercent || 0), price: r2(q?.regularMarketPrice || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) };
  });
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const riskProfile = vix > 30 ? 'Risk-Off' : vix > 20 ? 'Cautious' : 'Risk-On';
  const portfolioReturn = r2(assetClasses.reduce((s, ac) => s + ac.change * ac.weight / 100, 0));
  return { assetClasses, summary: { portfolioReturn, riskProfile, vix: r1(vix) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[AssetAllocation] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
