import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^VIX', '^TNX', 'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const underlyings = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL'].map(sym => { const q = qMap.get(sym); const p = q?.regularMarketPrice || 0; const iv = vix * (sym === 'TSLA' ? 1.8 : sym === 'NVDA' ? 1.5 : 1.0); return { ticker: sym, name: q?.shortName || sym, price: r2(p), change: r2(q?.regularMarketChangePercent || 0), impliedVol: r1(iv), couponPotential: r2(tnx + iv * 0.1), barrier: r2(p * 0.7), barrierPct: -30 }; });
  return { underlyings, summary: { vix: r2(vix), riskFreeRate: r2(tnx), avgCoupon: r2(underlyings.reduce((s, u) => s + u.couponPotential, 0) / underlyings.length), issuanceEnvironment: vix > 22 ? 'Favorable (high vol = high coupons)' : 'Moderate' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityLinkedNotes] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
