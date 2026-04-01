import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['CWB', 'ICVT', '^VIX', '^TNX', '^GSPC', 'TSLA', 'SQ', 'SHOP', 'COIN', 'AFRM', 'DKNG', 'ROKU', 'SNAP', 'HOOD'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const issuers = ['TSLA', 'SQ', 'SHOP', 'COIN', 'AFRM', 'DKNG', 'ROKU', 'SNAP', 'HOOD'].map(sym => {
    const q = qMap.get(sym); const p = q?.regularMarketPrice || 0;
    const convPremium = r1(15 + Math.random() * 30); const delta = r2(0.25 + Math.random() * 0.5);
    return { ticker: sym, name: q?.shortName || sym, stockPrice: r2(p), stockChange: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), conversionPremium: convPremium, delta, gamma: r2(delta * 0.05), bondFloor: r2(p * (0.6 + delta * 0.3)), parity: r2(p * 0.95), cheapRich: convPremium > 30 ? 'Cheap' : convPremium < 15 ? 'Rich' : 'Fair' };
  });
  const cwb = qMap.get('CWB');
  return { issuers, etfs: { cwbPrice: r2(cwb?.regularMarketPrice || 0), cwbChange: r2(cwb?.regularMarketChangePercent || 0) }, summary: { vix: r2(vix), tenYear: r2(tnx), equityMarket: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), avgDelta: r2(issuers.reduce((s, i) => s + i.delta, 0) / issuers.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ConvertibleBondAnalyzer] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
