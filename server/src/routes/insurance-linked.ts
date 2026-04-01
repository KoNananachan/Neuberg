import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['RNR', 'ACGL', 'EG', 'RE', 'AXS', 'ALL', 'TRV', 'CB', 'PGR', '^TNX', '^VIX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const reinsurers = ['RNR', 'ACGL', 'EG', 'RE', 'AXS'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0), priceToBook: r2(q?.priceToBook || 0) }; });
  const insurers = ['ALL', 'TRV', 'CB', 'PGR'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), divYield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  return { reinsurers, insurers, summary: { riskFreeRate: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), sectorHealth: reinsurers.every(r => r.change > -1) ? 'Stable' : 'Volatile' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[InsuranceLinked]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
