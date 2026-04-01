import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^TYX', '^FVX', '^IRX', 'ZN=F', 'ZB=F', 'ZF=F', 'TLT', 'IEF', 'SHY', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const trades = [
    { name: '5Y Cash vs Futures', cashProxy: '^FVX', futuresProxy: 'ZF=F', etf: 'IEF' },
    { name: '10Y Cash vs Futures', cashProxy: '^TNX', futuresProxy: 'ZN=F', etf: 'IEF' },
    { name: '30Y Cash vs Futures', cashProxy: '^TYX', futuresProxy: 'ZB=F', etf: 'TLT' },
  ].map(t => {
    const cashYield = qMap.get(t.cashProxy)?.regularMarketPrice || 4.5;
    const futPrice = qMap.get(t.futuresProxy)?.regularMarketPrice || 110;
    const etfPrice = qMap.get(t.etf)?.regularMarketPrice || 100;
    return { trade: t.name, cashYield: r3(cashYield), futuresPrice: r2(futPrice), futuresChange: r2(qMap.get(t.futuresProxy)?.regularMarketChangePercent || 0), etf: t.etf, etfPrice: r2(etfPrice), basisEstimate: r3((futPrice / etfPrice - 1) * 100), carryEstimate: r3(cashYield * 0.01) };
  });
  return { trades, summary: { avgBasis: r3(trades.reduce((s, t) => s + t.basisEstimate, 0) / trades.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), leverageRisk: (qMap.get('^VIX')?.regularMarketPrice || 20) > 25 ? 'Elevated' : 'Normal' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BasisTrade] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
