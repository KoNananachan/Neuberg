import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^TYX', '^FVX', '^IRX', 'ZN=F', 'ZB=F', 'ZF=F', 'ZT=F', 'TLT', 'IEF', 'SHY'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const contracts = [
    { name: '2-Year Note Future', sym: 'ZT=F', yieldSym: '^IRX', etf: 'SHY', duration: 1.9 },
    { name: '5-Year Note Future', sym: 'ZF=F', yieldSym: '^FVX', etf: 'IEF', duration: 4.4 },
    { name: '10-Year Note Future', sym: 'ZN=F', yieldSym: '^TNX', etf: 'IEF', duration: 7.5 },
    { name: '30-Year Bond Future', sym: 'ZB=F', yieldSym: '^TYX', etf: 'TLT', duration: 17 },
  ].map(c => {
    const futQ = qMap.get(c.sym);
    const yieldQ = qMap.get(c.yieldSym);
    const etfQ = qMap.get(c.etf);
    const futPrice = futQ?.regularMarketPrice || 110;
    const etfPrice = etfQ?.regularMarketPrice || 100;
    const basis = r3((futPrice - etfPrice * (futPrice / etfPrice > 0.5 ? 1 : 100)) * 0.01); // simplified basis
    return { contract: c.name, futuresPrice: r2(futPrice), futuresChange: r2(futQ?.regularMarketChangePercent || 0), cashYield: r3(yieldQ?.regularMarketPrice || 0), cashYieldChange: r3(yieldQ?.regularMarketChange || 0), etf: c.etf, etfPrice: r2(etfPrice), impliedBasis: basis, duration: c.duration, carryRollDown: r3(basis * 0.1) };
  });
  return { contracts, summary: { avgBasis: r3(contracts.reduce((s, c) => s + c.impliedBasis, 0) / contracts.length), yieldCurveSlope: r3((qMap.get('^TYX')?.regularMarketPrice || 4.8) - (qMap.get('^IRX')?.regularMarketPrice || 5)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BondFuturesBasis] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
