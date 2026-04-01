import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^IXIC', '^RUT', 'SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'AGG', 'TLT', 'GLD', 'DBC', 'DXY=X', 'HYG', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const assets = ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'AGG', 'TLT', 'GLD', 'DBC', 'HYG'].map(sym => {
    const q = qMap.get(sym); const p = q?.regularMarketPrice || 0; const sma50 = q?.fiftyDayAverage || p; const sma200 = q?.twoHundredDayAverage || p;
    const momentum = p > sma50 && sma50 > sma200 ? 'Strong Up' : p > sma200 ? 'Up' : p < sma50 && sma50 < sma200 ? 'Strong Down' : 'Down';
    return { asset: sym, name: q?.shortName || sym, price: r2(p), change: r2(q?.regularMarketChangePercent || 0), vs50dma: r2(sma50 > 0 ? ((p - sma50) / sma50) * 100 : 0), vs200dma: r2(sma200 > 0 ? ((p - sma200) / sma200) * 100 : 0), momentum, goldenCross: sma50 > sma200 };
  });
  const bullish = assets.filter(a => a.momentum.includes('Up')).length;
  return { assets, summary: { bullishCount: bullish, bearishCount: assets.length - bullish, regime: bullish > 6 ? 'Risk-On' : bullish < 4 ? 'Risk-Off' : 'Mixed', vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CrossAssetMomentum] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
