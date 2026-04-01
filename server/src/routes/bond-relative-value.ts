import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AGG', 'LQD', 'HYG', 'TLT', 'IEF', 'SHY', 'TIP', 'MUB', 'EMB', 'BNDX', 'JNK', '^TNX', '^TYX', '^IRX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = [
    { name: 'Investment Grade', etf: 'LQD', benchmarkSpread: 1.2 }, { name: 'High Yield', etf: 'HYG', benchmarkSpread: 3.5 },
    { name: 'Long Treasury', etf: 'TLT', benchmarkSpread: 0 }, { name: 'TIPS', etf: 'TIP', benchmarkSpread: -0.5 },
    { name: 'Municipal', etf: 'MUB', benchmarkSpread: 0.8 }, { name: 'EM Bonds', etf: 'EMB', benchmarkSpread: 2.8 },
    { name: 'Intl Bonds', etf: 'BNDX', benchmarkSpread: 1.5 }, { name: 'Junk', etf: 'JNK', benchmarkSpread: 4.0 },
  ].map(s => {
    const q = qMap.get(s.etf);
    const yld = (q?.trailingAnnualDividendYield || 0) * 100;
    const spreadVsTsy = r2(yld - tnx);
    return { sector: s.name, etf: s.etf, yield: r2(yld), spreadVsTreasury: spreadVsTsy, historicalAvgSpread: s.benchmarkSpread, richCheap: spreadVsTsy > s.benchmarkSpread + 0.3 ? 'Cheap' : spreadVsTsy < s.benchmarkSpread - 0.3 ? 'Rich' : 'Fair', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) };
  });
  const bestValue = [...sectors].sort((a, b) => (b.spreadVsTreasury - b.historicalAvgSpread) - (a.spreadVsTreasury - a.historicalAvgSpread))[0];
  return { sectors, summary: { tenYearYield: r2(tnx), bestValue: bestValue?.sector || 'N/A', cheapCount: sectors.filter(s => s.richCheap === 'Cheap').length, richCount: sectors.filter(s => s.richCheap === 'Rich').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BondRelativeValue] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
