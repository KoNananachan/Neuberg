import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const BONDS = [
  { name: '2Y US Treasury', ticker: 'UST2Y', coupon: 4.25, maturity: '2028-03-15', rating: 'AAA', sector: 'Treasury', baseYield: 4.3, baseDur: 1.95 },
  { name: '5Y US Treasury', ticker: 'UST5Y', coupon: 4.0, maturity: '2031-03-15', rating: 'AAA', sector: 'Treasury', baseYield: 4.15, baseDur: 4.7 },
  { name: '10Y US Treasury', ticker: 'UST10Y', coupon: 3.875, maturity: '2036-03-15', rating: 'AAA', sector: 'Treasury', baseYield: 4.25, baseDur: 8.5 },
  { name: '30Y US Treasury', ticker: 'UST30Y', coupon: 4.25, maturity: '2056-03-15', rating: 'AAA', sector: 'Treasury', baseYield: 4.5, baseDur: 18.2 },
  { name: 'Apple 2028', ticker: 'AAPL28', coupon: 3.85, maturity: '2028-05-15', rating: 'AA+', sector: 'IG Corporate', baseYield: 4.5, baseDur: 2.1 },
  { name: 'Microsoft 2030', ticker: 'MSFT30', coupon: 3.45, maturity: '2030-08-15', rating: 'AAA', sector: 'IG Corporate', baseYield: 4.3, baseDur: 3.8 },
  { name: 'JPMorgan 2029', ticker: 'JPM29', coupon: 4.25, maturity: '2029-11-01', rating: 'A-', sector: 'IG Corporate', baseYield: 4.8, baseDur: 3.2 },
  { name: 'JNJ 2031', ticker: 'JNJ31', coupon: 3.4, maturity: '2031-01-15', rating: 'AAA', sector: 'IG Corporate', baseYield: 4.2, baseDur: 4.5 },
  { name: 'Ford 2027', ticker: 'F27', coupon: 6.1, maturity: '2027-08-15', rating: 'BB+', sector: 'HY Corporate', baseYield: 6.8, baseDur: 1.4 },
  { name: 'Netflix 2029', ticker: 'NFLX29', coupon: 5.375, maturity: '2029-11-15', rating: 'BB+', sector: 'HY Corporate', baseYield: 6.2, baseDur: 3.0 },
  { name: 'T-Mobile 2028', ticker: 'TMUS28', coupon: 4.75, maturity: '2028-02-01', rating: 'BBB-', sector: 'HY Corporate', baseYield: 5.5, baseDur: 1.8 },
  { name: 'Carnival 2026', ticker: 'CCL26', coupon: 7.625, maturity: '2026-03-01', rating: 'B+', sector: 'HY Corporate', baseYield: 8.2, baseDur: 0.8 },
  { name: 'German Bund 10Y', ticker: 'BUND10', coupon: 2.3, maturity: '2035-02-15', rating: 'AAA', sector: 'Sovereign', baseYield: 2.5, baseDur: 8.8 },
  { name: 'UK Gilt 10Y', ticker: 'GILT10', coupon: 3.75, maturity: '2035-09-07', rating: 'AA', sector: 'Sovereign', baseYield: 4.1, baseDur: 8.3 },
  { name: 'Japan JGB 10Y', ticker: 'JGB10', coupon: 0.8, maturity: '2035-12-20', rating: 'A+', sector: 'Sovereign', baseYield: 1.2, baseDur: 9.5 },
  { name: 'iShares Core Agg', ticker: 'AGG', coupon: 3.2, maturity: '2032-06-01', rating: 'AA', sector: 'ETF', baseYield: 4.6, baseDur: 6.1 },
  { name: 'Vanguard Total Bond', ticker: 'BND', coupon: 3.1, maturity: '2032-04-01', rating: 'AA', sector: 'ETF', baseYield: 4.5, baseDur: 6.3 },
  { name: 'iShares 20+Y Treasury', ticker: 'TLT', coupon: 3.5, maturity: '2050-11-15', rating: 'AAA', sector: 'ETF', baseYield: 4.6, baseDur: 16.8 },
  { name: 'iShares High Yield', ticker: 'HYG', coupon: 5.8, maturity: '2029-03-15', rating: 'BB-', sector: 'ETF', baseYield: 7.2, baseDur: 3.5 },
  { name: 'iShares IG Corporate', ticker: 'LQD', coupon: 3.8, maturity: '2033-06-01', rating: 'A-', sector: 'ETF', baseYield: 5.1, baseDur: 8.2 },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fi-analytics'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const bonds = BONDS.map(b => {
    const yld = Math.round(jitter(b.baseYield, 0.04) * 1000) / 1000;
    const duration = Math.round(jitter(b.baseDur, 0.03) * 100) / 100;
    const modifiedDuration = Math.round(duration / (1 + yld / 200) * 100) / 100;
    const convexity = Math.round((duration * duration * 0.012 + rng() * 5) * 100) / 100;
    const govtSpread = b.sector === 'Treasury' ? 0 : Math.round((yld - 4.2) * 100);
    const oas = Math.max(0, govtSpread + Math.round((rng() - 0.5) * 20));
    const zSpread = oas + Math.round(rng() * 10);
    const iSpread = oas - Math.round(rng() * 5);
    const price = Math.round((100 + (b.coupon - yld) * duration) * 1000) / 1000;
    const dv01 = Math.round(price * modifiedDuration / 10000 * 10000) / 10000;

    const krWeights = [0.02, 0.05, 0.08, 0.15, 0.15, 0.25, 0.18, 0.12];
    const krd = krWeights.map(w => Math.round(duration * w * (0.7 + rng() * 0.6) * 1000) / 1000);

    return {
      name: b.name, ticker: b.ticker, coupon: b.coupon, maturityDate: b.maturity,
      rating: b.rating, sector: b.sector,
      analytics: {
        yield: yld, price, duration, modifiedDuration, convexity,
        oas, zSpread, iSpread,
      },
      keyRateDurations: { kr1y: krd[0], kr2y: krd[1], kr3y: krd[2], kr5y: krd[3], kr7y: krd[4], kr10y: krd[5], kr20y: krd[6], kr30y: krd[7] },
      riskMetrics: {
        dv01, pvbp: Math.round(dv01 * 100) / 100,
        yieldChange1d: Math.round((rng() - 0.5) * 10 * 10) / 10,
        yieldChange1w: Math.round((rng() - 0.5) * 20 * 10) / 10,
        priceChange1d: Math.round((rng() - 0.5) * 0.8 * 1000) / 1000,
        totalReturn1m: Math.round((rng() - 0.4) * 3 * 100) / 100,
        totalReturn3m: Math.round((rng() - 0.4) * 5 * 100) / 100,
        totalReturnYtd: Math.round((rng() - 0.35) * 8 * 100) / 100,
      },
      spread: { govtSpread, swapSpread: govtSpread - Math.round(rng() * 15), industrySpread: govtSpread + Math.round(rng() * 20) },
    };
  });

  const summary = {
    avgDuration: Math.round(bonds.reduce((a, b) => a + b.analytics.duration, 0) / bonds.length * 100) / 100,
    avgYield: Math.round(bonds.reduce((a, b) => a + b.analytics.yield, 0) / bonds.length * 1000) / 1000,
    avgOAS: Math.round(bonds.reduce((a, b) => a + b.analytics.oas, 0) / bonds.length),
    totalDV01: Math.round(bonds.reduce((a, b) => a + b.riskMetrics.dv01, 0) * 10000) / 10000,
    avgConvexity: Math.round(bonds.reduce((a, b) => a + b.analytics.convexity, 0) / bonds.length * 100) / 100,
    avgRating: 'A',
  };

  return { bonds, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FixedIncomeAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate fixed income data' });
  }
});

export default router;
