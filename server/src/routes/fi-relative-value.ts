import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AGG', 'LQD', 'HYG', 'JNK', 'TLT', 'IEF', 'SHY', 'TIP', 'MUB', 'EMB', 'BNDX', 'VCSH', 'VCIT', 'VCLT', '^TNX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = SYMBOLS.filter(s => s !== '^TNX').map(sym => { const q = qMap.get(sym); const yld = (q?.trailingAnnualDividendYield || 0) * 100; const spread = yld - tnx; const avgSpread: Record<string, number> = { AGG: 0.4, LQD: 0.9, HYG: 3.5, JNK: 4.2, TLT: 0, IEF: 0, SHY: 0, TIP: -0.5, MUB: 0.6, EMB: 2.8, BNDX: 1.5, VCSH: 0.3, VCIT: 0.8, VCLT: 1.2 }; return { etf: sym, name: q?.shortName || sym, yield: r2(yld), spread: r2(spread), historicalAvg: avgSpread[sym] || 0.5, richCheap: spread > (avgSpread[sym] || 0.5) + 0.3 ? 'Cheap' : spread < (avgSpread[sym] || 0.5) - 0.3 ? 'Rich' : 'Fair', change: r2(q?.regularMarketChangePercent || 0) }; });
  return { sectors, summary: { cheapCount: sectors.filter(s => s.richCheap === 'Cheap').length, richCount: sectors.filter(s => s.richCheap === 'Rich').length, tenYear: r2(tnx) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FIRelativeValue] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
