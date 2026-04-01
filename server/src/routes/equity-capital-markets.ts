import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^IXIC', '^RUT', '^VIX', 'SPY', 'QQQ', 'IWM', 'GS', 'MS', 'JPM', 'IPO', 'HYG'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const indices = ['^GSPC', '^IXIC', '^RUT'].map(sym => { const q = qMap.get(sym); return { index: q?.shortName || sym, change: r2(q?.regularMarketChangePercent || 0) }; });
  const banks = ['GS', 'MS', 'JPM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; });
  const ipoEtf = qMap.get('IPO');
  return { indices, underwriters: banks, ipoMarket: { etfChange: r2(ipoEtf?.regularMarketChangePercent || 0), window: vix < 18 ? 'Wide Open' : vix < 25 ? 'Selective' : 'Shut' }, summary: { vix: r2(vix), ecmEnvironment: vix < 20 ? 'Favorable' : vix > 28 ? 'Challenging' : 'Cautious', creditAppetite: r2(qMap.get('HYG')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityCapitalMarkets] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
