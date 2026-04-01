import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^VIX', 'DXY=X', 'GS', 'MS', 'JPM', 'EVR', 'LAZ', 'FXI', 'EWJ', 'EWG', 'EWU', 'EWZ', 'EEM'];
const CACHE_TTL = 15 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const advisors = ['GS', 'MS', 'JPM', 'EVR', 'LAZ'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9) }; });
  const regions = [{ name: 'China', etf: 'FXI' }, { name: 'Japan', etf: 'EWJ' }, { name: 'Europe', etf: 'EWG' }, { name: 'UK', etf: 'EWU' }, { name: 'Brazil', etf: 'EWZ' }].map(r => ({ region: r.name, change: r2(qMap.get(r.etf)?.regularMarketChangePercent || 0), dealClimate: (qMap.get(r.etf)?.regularMarketChangePercent || 0) > 0.5 ? 'Favorable' : 'Cautious' }));
  return { advisors, regions, summary: { vix: r2(vix), dealEnvironment: vix < 20 ? 'Active' : vix > 28 ? 'Frozen' : 'Selective', dollarChange: r2(qMap.get('DXY=X')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalMA]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
