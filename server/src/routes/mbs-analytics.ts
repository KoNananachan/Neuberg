import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const MBS_POOLS = [
  { id: 'FNMA30-6.0', issuer: 'Fannie Mae', type: '30Y Fixed', coupon: 6.0, baseWAC: 6.55, baseWAM: 348, baseCPR: 8.5 },
  { id: 'FNMA30-5.5', issuer: 'Fannie Mae', type: '30Y Fixed', coupon: 5.5, baseWAC: 6.05, baseWAM: 340, baseCPR: 6.2 },
  { id: 'FNMA30-5.0', issuer: 'Fannie Mae', type: '30Y Fixed', coupon: 5.0, baseWAC: 5.55, baseWAM: 335, baseCPR: 4.8 },
  { id: 'FNMA30-4.5', issuer: 'Fannie Mae', type: '30Y Fixed', coupon: 4.5, baseWAC: 5.05, baseWAM: 320, baseCPR: 3.5 },
  { id: 'FNMA30-4.0', issuer: 'Fannie Mae', type: '30Y Fixed', coupon: 4.0, baseWAC: 4.55, baseWAM: 310, baseCPR: 2.8 },
  { id: 'FNMA30-3.5', issuer: 'Fannie Mae', type: '30Y Fixed', coupon: 3.5, baseWAC: 4.05, baseWAM: 295, baseCPR: 2.2 },
  { id: 'FNMA15-5.5', issuer: 'Fannie Mae', type: '15Y Fixed', coupon: 5.5, baseWAC: 6.0, baseWAM: 168, baseCPR: 12.0 },
  { id: 'FNMA15-5.0', issuer: 'Fannie Mae', type: '15Y Fixed', coupon: 5.0, baseWAC: 5.5, baseWAM: 160, baseCPR: 9.5 },
  { id: 'FNMA15-4.5', issuer: 'Fannie Mae', type: '15Y Fixed', coupon: 4.5, baseWAC: 5.0, baseWAM: 155, baseCPR: 7.0 },
  { id: 'FHLMC30-6.0', issuer: 'Freddie Mac', type: '30Y Fixed', coupon: 6.0, baseWAC: 6.5, baseWAM: 345, baseCPR: 8.0 },
  { id: 'FHLMC30-5.5', issuer: 'Freddie Mac', type: '30Y Fixed', coupon: 5.5, baseWAC: 6.0, baseWAM: 338, baseCPR: 5.8 },
  { id: 'FHLMC30-5.0', issuer: 'Freddie Mac', type: '30Y Fixed', coupon: 5.0, baseWAC: 5.5, baseWAM: 330, baseCPR: 4.5 },
  { id: 'GNMA30-6.0', issuer: 'Ginnie Mae', type: '30Y Fixed', coupon: 6.0, baseWAC: 6.6, baseWAM: 350, baseCPR: 9.2 },
  { id: 'GNMA30-5.5', issuer: 'Ginnie Mae', type: '30Y Fixed', coupon: 5.5, baseWAC: 6.1, baseWAM: 342, baseCPR: 7.0 },
  { id: 'GNMA30-5.0', issuer: 'Ginnie Mae', type: '30Y Fixed', coupon: 5.0, baseWAC: 5.6, baseWAM: 336, baseCPR: 5.5 },
  { id: 'FNMA-ARM', issuer: 'Fannie Mae', type: '5/1 ARM', coupon: 4.75, baseWAC: 5.3, baseWAM: 355, baseCPR: 15.0 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-mbs-analytics'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const pools = MBS_POOLS.map(p => {
    const wac = Math.round(jitter(p.baseWAC, 0.02) * 100) / 100;
    const wam = Math.round(jitter(p.baseWAM, 0.02));
    const cpr1m = Math.round(jitter(p.baseCPR, 0.15) * 10) / 10;
    const cpr3m = Math.round(jitter(p.baseCPR, 0.12) * 10) / 10;
    const cpr6m = Math.round(jitter(p.baseCPR, 0.10) * 10) / 10;
    const cprLife = Math.round(jitter(p.baseCPR, 0.08) * 10) / 10;
    const psa = Math.round(cpr1m / 6 * 100);

    const price = Math.round((95 + (p.coupon - 5.0) * 3 + (rng() - 0.5) * 4) * 1000) / 1000;
    const yieldVal = Math.round((p.coupon / price * 100 + (rng() - 0.5) * 0.5) * 1000) / 1000;
    const oas = Math.round(30 + rng() * 80);
    const zSpread = oas + Math.round(rng() * 15);
    const duration = Math.round(jitter(wam / 12 * 0.6, 0.1) * 100) / 100;
    const convexity = Math.round((-0.5 - rng() * 3) * 100) / 100;
    const factor = Math.round((0.4 + rng() * 0.55) * 10000) / 10000;
    const originalBalance = Math.round(jitter(500e6, 0.3));
    const currentBalance = Math.round(originalBalance * factor);

    const prepayHistory = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return {
        date: d.toISOString().slice(0, 7),
        cpr: Math.round(jitter(p.baseCPR, 0.2) * 10) / 10,
        smm: Math.round(jitter(p.baseCPR / 12, 0.2) * 1000) / 1000,
      };
    });

    return {
      id: p.id, issuer: p.issuer, type: p.type, coupon: p.coupon,
      wac, wam, wala: Math.round(360 - wam),
      prepayment: { cpr1m, cpr3m, cpr6m, cprLife, psa },
      pricing: { price, yield: yieldVal, oas, zSpread },
      risk: { duration, modifiedDuration: Math.round(duration / (1 + yieldVal / 200) * 100) / 100, convexity },
      pool: { factor, originalBalance, currentBalance },
      prepayHistory,
    };
  });

  const couponStacks = [3.5, 4.0, 4.5, 5.0, 5.5, 6.0].map(coupon => {
    const poolsForCoupon = pools.filter(p => p.coupon === coupon && p.type === '30Y Fixed');
    if (poolsForCoupon.length === 0) return null;
    const avgPrice = Math.round(poolsForCoupon.reduce((a, p) => a + p.pricing.price, 0) / poolsForCoupon.length * 1000) / 1000;
    const avgOAS = Math.round(poolsForCoupon.reduce((a, p) => a + p.pricing.oas, 0) / poolsForCoupon.length);
    const avgCPR = Math.round(poolsForCoupon.reduce((a, p) => a + p.prepayment.cpr1m, 0) / poolsForCoupon.length * 10) / 10;
    return { coupon, avgPrice, avgOAS, avgCPR, count: poolsForCoupon.length };
  }).filter(Boolean);

  const summary = {
    totalPools: pools.length,
    totalBalance: pools.reduce((a, p) => a + p.pool.currentBalance, 0),
    avgCPR: Math.round(pools.reduce((a, p) => a + p.prepayment.cpr1m, 0) / pools.length * 10) / 10,
    avgOAS: Math.round(pools.reduce((a, p) => a + p.pricing.oas, 0) / pools.length),
    avgDuration: Math.round(pools.reduce((a, p) => a + p.risk.duration, 0) / pools.length * 100) / 100,
    avgConvexity: Math.round(pools.reduce((a, p) => a + p.risk.convexity, 0) / pools.length * 100) / 100,
  };

  return { pools, couponStacks, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MBSAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate MBS analytics data' });
  }
});

export default router;
