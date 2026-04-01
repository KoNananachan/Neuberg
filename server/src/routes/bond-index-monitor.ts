import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AGG', 'BND', 'LQD', 'HYG', 'TLT', 'IEF', 'SHY', 'TIP', 'MUB', 'EMB', 'BNDX', 'JNK', 'VCIT', 'VCSH', '^TNX', '^TYX', '^IRX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const indices = SYMBOLS.filter(s => !s.startsWith('^')).map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100), aum: Math.round((q?.marketCap || 0) / 1e9) };
  });
  const categories = [
    { name: 'US Aggregate', etfs: ['AGG', 'BND'] }, { name: 'Investment Grade', etfs: ['LQD', 'VCIT', 'VCSH'] },
    { name: 'High Yield', etfs: ['HYG', 'JNK'] }, { name: 'Treasury', etfs: ['TLT', 'IEF', 'SHY'] },
    { name: 'TIPS', etfs: ['TIP'] }, { name: 'Municipal', etfs: ['MUB'] }, { name: 'International', etfs: ['EMB', 'BNDX'] },
  ].map(c => {
    const catEtfs = c.etfs.map(e => indices.find(i => i.ticker === e)).filter(Boolean) as typeof indices;
    return { category: c.name, avgChange: r2(catEtfs.reduce((s, e) => s + e.change, 0) / (catEtfs.length || 1)), avgYield: r2(catEtfs.reduce((s, e) => s + e.yield, 0) / (catEtfs.length || 1)), etfCount: catEtfs.length };
  });
  return { indices, categories, yields: { threeMonth: r2(qMap.get('^IRX')?.regularMarketPrice || 0), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice || 0), thirtyYear: r2(qMap.get('^TYX')?.regularMarketPrice || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BondIndexMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
