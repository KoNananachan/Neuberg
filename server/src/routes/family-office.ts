import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', 'SPY', 'AGG', 'TLT', 'GLD', 'DBC', 'VNQ', 'EFA', 'EEM', 'HYG', 'TIP', 'BRK-B', 'BX', 'KKR', 'APO', '^VIX', '^TNX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const allocations = [{ asset: 'Public Equity', proxy: 'SPY', weight: 30 }, { asset: 'Fixed Income', proxy: 'AGG', weight: 15 }, { asset: 'Real Estate', proxy: 'VNQ', weight: 10 }, { asset: 'Gold', proxy: 'GLD', weight: 5 }, { asset: 'Commodities', proxy: 'DBC', weight: 5 }, { asset: 'Intl Equity', proxy: 'EFA', weight: 10 }, { asset: 'EM', proxy: 'EEM', weight: 5 }, { asset: 'Credit', proxy: 'HYG', weight: 5 }, { asset: 'TIPS', proxy: 'TIP', weight: 5 }, { asset: 'PE/Alts', proxy: 'BX', weight: 10 }].map(a => { const q = qMap.get(a.proxy); return { asset: a.asset, proxy: a.proxy, weight: a.weight, change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const altManagers = ['BRK-B', 'BX', 'KKR', 'APO'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; });
  const portfolioReturn = r2(allocations.reduce((s, a) => s + a.change * a.weight / 100, 0));
  return { allocations, altManagers, summary: { portfolioReturn, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FamilyOffice] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
