import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^RUT', 'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VXUS', 'EFA', 'EEM', 'AGG', 'GLD'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const indices = quotes.filter(q => q?.symbol).map(q => { const p = q.regularMarketPrice || 0; const divYld = (q.trailingAnnualDividendYield || 0) * 100; return { symbol: q.symbol!, name: q.shortName || q.symbol!, price: r2(p), priceReturn: r2(q.regularMarketChangePercent || 0), dividendYield: r2(divYld), totalReturn: r2((q.regularMarketChangePercent || 0) + divYld / 252) }; });
  return { indices: indices.sort((a, b) => b.totalReturn - a.totalReturn), summary: { bestPerformer: indices[0]?.symbol || 'N/A', worstPerformer: indices[indices.length - 1]?.symbol || 'N/A', avgPriceReturn: r2(indices.reduce((s, i) => s + i.priceReturn, 0) / indices.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityTotalReturnIndex] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
