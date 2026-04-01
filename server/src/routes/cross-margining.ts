import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^GSPC', '^TNX', 'SPY', 'QQQ', 'TLT', 'GLD', 'HYG', 'ICE', 'CME', 'CBOE'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const assetClasses = [{ name: 'Equities', proxy: 'SPY' }, { name: 'Fixed Income', proxy: 'TLT' }, { name: 'Commodities', proxy: 'GLD' }, { name: 'Credit', proxy: 'HYG' }].map(a => { const q = qMap.get(a.proxy); return { assetClass: a.name, proxy: a.proxy, change: r2(q?.regularMarketChangePercent || 0), marginImpact: vix > 25 ? 'Elevated' : 'Normal', offsetBenefit: a.name === 'Fixed Income' ? 'High (negative corr)' : 'Moderate' }; });
  const exchanges = ['ICE', 'CME', 'CBOE'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; });
  return { assetClasses, exchanges, summary: { vix: r2(vix), marginRegime: vix > 30 ? 'Stressed' : vix > 20 ? 'Elevated' : 'Normal', crossMarginBenefit: vix > 20 ? 'Significant' : 'Moderate' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CrossMargining] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
