import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AGG', 'LQD', 'HYG', 'TLT', 'IEF', 'SHY', 'TIP', 'MUB', 'EMB', 'BNDX', '^TNX', '^TYX', '^IRX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = ['AGG', 'LQD', 'HYG', 'TLT', 'IEF', 'SHY', 'TIP', 'MUB', 'EMB', 'BNDX'].map(sym => { const q = qMap.get(sym); return { sector: q?.shortName || sym, etf: sym, return: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), contribution: r2((q?.regularMarketChangePercent || 0) * 0.1) }; });
  return { sectors, summary: { totalReturn: r2(sectors.reduce((s, sec) => s + sec.return, 0) / sectors.length), yieldContribution: r2(sectors.reduce((s, sec) => s + sec.yield, 0) / sectors.length / 252), priceContribution: r2(sectors.reduce((s, sec) => s + sec.return, 0) / sectors.length), tenYear: r2(tnx) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FIAttribution] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
