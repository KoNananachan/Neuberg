import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['GS', 'MS', 'JPM', 'BAC', 'C', 'DB', 'UBS', 'BCS', 'EVR', 'LAZ', 'PJT', 'HLI', '^GSPC', '^VIX'];
const CACHE_TTL = 15 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const spxChg = qMap.get('^GSPC')?.regularMarketChangePercent || 0;
  const banks = ['GS', 'MS', 'JPM', 'BAC', 'C', 'DB', 'UBS', 'BCS', 'EVR', 'LAZ', 'PJT', 'HLI'].map((sym, i) => { const q = qMap.get(sym); return { rank: i + 1, ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0), alpha: r2((q?.regularMarketChangePercent || 0) - spxChg) }; }).sort((a, b) => b.marketCap - a.marketCap).map((b, i) => ({ ...b, rank: i + 1 }));
  return { banks, summary: { totalMarketCap: r1(banks.reduce((s, b) => s + b.marketCap, 0)), avgChange: r2(banks.reduce((s, b) => s + b.change, 0) / banks.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), dealmaking: (qMap.get('^VIX')?.regularMarketPrice || 20) < 20 ? 'Active' : 'Quiet' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LeagueTables]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
