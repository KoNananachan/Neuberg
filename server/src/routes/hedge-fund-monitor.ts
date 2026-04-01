import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BX', 'KKR', 'APO', 'CG', 'ARES', 'OWL', 'BAM', '^GSPC', '^VIX', 'HYG', 'SPY', 'QQQ', 'IWM'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const spxChg = qMap.get('^GSPC')?.regularMarketChangePercent || 0;
  const managers = ['BX', 'KKR', 'APO', 'CG', 'ARES', 'OWL', 'BAM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), alpha: r2((q?.regularMarketChangePercent || 0) - spxChg), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0) }; }).sort((a, b) => b.alpha - a.alpha);
  return { managers, summary: { avgAlpha: r2(managers.reduce((s, m) => s + m.alpha, 0) / managers.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), spxChange: r2(spxChg), riskAppetite: r2(qMap.get('HYG')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[HedgeFundMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
