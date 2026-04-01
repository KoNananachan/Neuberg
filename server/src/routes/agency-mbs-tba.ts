import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['MBB', 'VMBS', 'GNMA', 'SPMB', '^TNX', '^FVX', 'NLY', 'AGNC'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  // TBA prices approximated from MBS ETFs
  const coupons = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0].map(coupon => {
    const mbb = qMap.get('MBB');
    const basePrice = (mbb?.regularMarketPrice || 97) - (tnx - coupon) * 3;
    return { coupon, price: r2(Math.min(103, Math.max(85, basePrice))), change: r2((mbb?.regularMarketChangePercent || 0) * (coupon > tnx ? 0.8 : 1.2)), payup: r2(coupon > tnx + 1 ? (coupon - tnx - 1) * 8 : 0) };
  });
  const currentCoupon = coupons.find(c => Math.abs(c.price - 100) === Math.min(...coupons.map(x => Math.abs(x.price - 100))));
  return { coupons, currentCouponRate: currentCoupon?.coupon || 5.0, mortgageRate30Y: r2(tnx + 1.7), tenYearYield: r2(tnx), mbsEtfs: ['MBB', 'VMBS', 'GNMA'].map(sym => { const q = qMap.get(sym); return { ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; }), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[AgencyMBSTBA] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
