import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CWB', 'ICVT', '^VIX', '^GSPC', 'TSLA', 'SQ', 'SHOP', 'COIN', 'DKNG', 'ROKU', 'SNAP'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const positions = ['TSLA', 'SQ', 'SHOP', 'COIN', 'DKNG', 'ROKU', 'SNAP'].map(sym => {
    const q = qMap.get(sym); return { underlying: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), delta: r2(0.3 + Math.random() * 0.4), gamma: r2(0.01 + Math.random() * 0.03), pnl: r2((q?.regularMarketChangePercent || 0) * 0.4) };
  });
  return { positions, etfPerformance: { cwb: r2(qMap.get('CWB')?.regularMarketChangePercent || 0), icvt: r2(qMap.get('ICVT')?.regularMarketChangePercent || 0) }, summary: { vix: r2(vix), environment: vix > 22 ? 'Favorable' : 'Tight spreads', portfolioPnl: r2(positions.reduce((s, p) => s + p.pnl, 0)) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ConvertibleArbitrage] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
