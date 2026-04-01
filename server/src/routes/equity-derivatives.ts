import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^GSPC', 'SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const underlyings = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL'].map(sym => { const q = qMap.get(sym); const p = q?.regularMarketPrice || 0; return { ticker: sym, name: q?.shortName || sym, price: r2(p), change: r2(q?.regularMarketChangePercent || 0), impliedVol: r1(vix * (sym === 'TSLA' ? 1.8 : sym === 'NVDA' ? 1.5 : 1.0)), volume: q?.regularMarketVolume || 0 }; });
  return { underlyings, summary: { vix: r2(vix), vixChange: r2(qMap.get('^VIX')?.regularMarketChange || 0), volRegime: vix > 25 ? 'Elevated' : vix < 15 ? 'Compressed' : 'Normal', spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityDerivatives] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
