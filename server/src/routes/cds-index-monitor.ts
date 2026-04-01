import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'LQD', 'JNK', 'EMB', 'BNDX', '^TNX', '^VIX', 'AGG'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const indices = [
    { name: 'CDX IG (proxy)', etf: 'LQD', baseSpread: 55 }, { name: 'CDX HY (proxy)', etf: 'HYG', baseSpread: 350 },
    { name: 'iTraxx Main (proxy)', etf: 'BNDX', baseSpread: 65 }, { name: 'iTraxx XOver (proxy)', etf: 'JNK', baseSpread: 320 },
    { name: 'CDX EM (proxy)', etf: 'EMB', baseSpread: 280 },
  ].map(idx => {
    const q = qMap.get(idx.etf); const yld = (q?.trailingAnnualDividendYield || 0) * 100;
    const spreadBps = Math.round((yld - tnx) * 100);
    return { index: idx.name, etfProxy: idx.etf, spreadBps, change: Math.round((q?.regularMarketChangePercent || 0) * -10), historicalAvg: idx.baseSpread, vsHistorical: spreadBps - idx.baseSpread, signal: spreadBps > idx.baseSpread * 1.2 ? 'Wide' : spreadBps < idx.baseSpread * 0.8 ? 'Tight' : 'Normal' };
  });
  return { indices, summary: { avgSpreadBps: Math.round(indices.reduce((s, i) => s + i.spreadBps, 0) / indices.length), wideCount: indices.filter(i => i.signal === 'Wide').length, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CDSIndexMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
