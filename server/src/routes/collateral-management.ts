import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
// Collateral proxies: treasury yields, repo-adjacent, money market
const SYMBOLS = ['^IRX', '^TNX', 'SHV', 'BIL', 'SGOV', 'AGG', 'TLT', 'GLD', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const collateralTypes = [
    { type: 'US Treasuries', quality: 'AAA', haircut: 2, yield: r3(irx), proxy: 'SHV' },
    { type: 'Agency MBS', quality: 'AAA', haircut: 4, yield: r3(irx + 0.5), proxy: 'AGG' },
    { type: 'Investment Grade Corp', quality: 'A/BBB', haircut: 8, yield: r3(irx + 1.2), proxy: 'AGG' },
    { type: 'Gold', quality: 'Commodity', haircut: 15, yield: 0, proxy: 'GLD' },
    { type: 'Equities (S&P 500)', quality: 'Equity', haircut: 25, yield: 0, proxy: 'SPY' },
  ].map(c => {
    const q = qMap.get(c.proxy); return { ...c, proxyPrice: r2(q?.regularMarketPrice || 0), proxyChange: r2(q?.regularMarketChangePercent || 0) };
  });
  return { collateralTypes, summary: { repoRate: r3(irx - 0.05), reverseRepoRate: r3(irx - 0.15), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), collateralStress: (qMap.get('^VIX')?.regularMarketPrice || 20) > 25 ? 'Elevated haircuts' : 'Normal' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CollateralManagement] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
