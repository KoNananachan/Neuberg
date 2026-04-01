import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EQIX', 'DLR', 'AMT', 'CCI', 'NVDA', 'AMD', 'AVGO', 'MRVL', 'ANET', 'CSCO', 'VRT', 'PWR', 'EME'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const segMap: Record<string, string> = { EQIX: 'Data Center REIT', DLR: 'Data Center REIT', AMT: 'Tower/DC REIT', CCI: 'Tower REIT', NVDA: 'GPU/AI Compute', AMD: 'CPU/GPU', AVGO: 'Networking', MRVL: 'Networking', ANET: 'Networking', CSCO: 'Networking', VRT: 'Power/Cooling', PWR: 'Construction', EME: 'Construction' };
  const stocks = SYMBOLS.map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, segment: segMap[sym] || 'Other', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0) }; });
  return { stocks, summary: { totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)), avgChange: r2(stocks.reduce((s, st) => s + st.change, 0) / stocks.length), topPerformer: [...stocks].sort((a, b) => b.change - a.change)[0]?.ticker || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DataCenterInfra] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
