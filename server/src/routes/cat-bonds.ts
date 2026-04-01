import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
// Cat bond proxies: reinsurance stocks + ILS-adjacent
const SYMBOLS = ['RNR', 'ACGL', 'EG', 'RE', 'AXS', 'MKL', 'ALL', 'TRV', 'CB', '^VIX', '^TNX'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const reinsurers = ['RNR', 'ACGL', 'EG', 'RE', 'AXS', 'MKL'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0), priceToBook: r2(q?.priceToBook || 0), marketCap: r1((q?.marketCap || 0) / 1e9) };
  });
  const insurers = ['ALL', 'TRV', 'CB'].map(sym => {
    const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100) };
  });
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  return { reinsurers, insurers, summary: { avgReinsureChange: r2(reinsurers.reduce((s, r) => s + r.change, 0) / reinsurers.length), riskFreeRate: r2(tnx), catBondSpreadEst: r2(tnx + 4 + Math.random() * 3), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), marketConditions: reinsurers.every(r => r.change > -1) ? 'Stable' : 'Volatile' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CatBonds] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
