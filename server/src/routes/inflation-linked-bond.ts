import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['TIP', 'STIP', 'VTIP', 'SCHP', 'WIP', '^TNX', '^TYX', 'GLD', 'DBC'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const etfs = ['TIP', 'STIP', 'VTIP', 'SCHP', 'WIP'].map(sym => { const q = qMap.get(sym); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), realYield: r2(yld), breakeven: r2(tnx - yld) }; });
  return { etfs, nominalYield: r2(tnx), avgBreakeven: r2(etfs.reduce((s, e) => s + e.breakeven, 0) / etfs.length), inflationHedges: { gold: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), commodities: r2(qMap.get('DBC')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[InflationLinkedBond]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
