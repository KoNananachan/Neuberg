import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['MNA', '^VIX', '^GSPC', 'GS', 'MS', 'JPM', 'EVR', 'LAZ', 'HYG'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const mna = qMap.get('MNA');
  const advisors = ['GS', 'MS', 'JPM', 'EVR', 'LAZ'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, change: r2(q?.regularMarketChangePercent || 0) }; });
  return { mnaEtf: { price: r2(mna?.regularMarketPrice || 0), change: r2(mna?.regularMarketChangePercent || 0) }, advisors, summary: { vix: r2(vix), dealEnvironment: vix < 20 ? 'Active' : 'Cautious', creditConditions: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MergerArb]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
