import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const STATES = [
  { state: 'CA', name: 'California', baseYield: 3.2, taxRate: 13.3, rating: 'AA-', outstanding: 82 },
  { state: 'NY', name: 'New York', baseYield: 3.3, taxRate: 10.9, rating: 'AA', outstanding: 65 },
  { state: 'TX', name: 'Texas', baseYield: 3.0, taxRate: 0, rating: 'AAA', outstanding: 55 },
  { state: 'FL', name: 'Florida', baseYield: 2.9, taxRate: 0, rating: 'AAA', outstanding: 38 },
  { state: 'IL', name: 'Illinois', baseYield: 3.8, taxRate: 4.95, rating: 'BBB+', outstanding: 42 },
  { state: 'NJ', name: 'New Jersey', baseYield: 3.5, taxRate: 10.75, rating: 'A-', outstanding: 35 },
  { state: 'PA', name: 'Pennsylvania', baseYield: 3.2, taxRate: 3.07, rating: 'AA-', outstanding: 30 },
  { state: 'OH', name: 'Ohio', baseYield: 3.1, taxRate: 3.99, rating: 'AA', outstanding: 25 },
  { state: 'MA', name: 'Massachusetts', baseYield: 3.1, taxRate: 5.0, rating: 'AA+', outstanding: 28 },
  { state: 'WA', name: 'Washington', baseYield: 2.9, taxRate: 0, rating: 'AA+', outstanding: 22 },
  { state: 'CT', name: 'Connecticut', baseYield: 3.4, taxRate: 6.99, rating: 'A+', outstanding: 20 },
  { state: 'GA', name: 'Georgia', baseYield: 3.0, taxRate: 5.49, rating: 'AAA', outstanding: 18 },
  { state: 'VA', name: 'Virginia', baseYield: 2.9, taxRate: 5.75, rating: 'AAA', outstanding: 16 },
  { state: 'MN', name: 'Minnesota', baseYield: 3.1, taxRate: 9.85, rating: 'AAA', outstanding: 14 },
  { state: 'CO', name: 'Colorado', baseYield: 2.9, taxRate: 4.4, rating: 'AA+', outstanding: 12 },
];

const SECTORS = ['General Obligation', 'Revenue', 'Water/Sewer', 'Transportation', 'Education', 'Healthcare', 'Housing', 'Power'];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-muni-bonds'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const fedTaxRate = 37;

  const bonds = STATES.flatMap(st => {
    const numBonds = 2 + Math.floor(rng() * 3);
    return Array.from({ length: numBonds }, () => {
      const sector = SECTORS[Math.floor(rng() * SECTORS.length)];
      const maturityYears = 2 + Math.floor(rng() * 28);
      const mat = new Date();
      mat.setFullYear(mat.getFullYear() + maturityYears);
      const coupon = Math.round(jitter(st.baseYield - 0.3, 0.15) * 100) / 100;
      const yld = Math.round(jitter(st.baseYield, 0.08) * 1000) / 1000;
      const taxEquivYield = Math.round(yld / (1 - (fedTaxRate + st.taxRate) / 100) * 1000) / 1000;
      const muniTreasuryRatio = Math.round(yld / (yld + 0.8 + rng() * 0.4) * 100);
      const price = Math.round((100 + (coupon - yld) * maturityYears * 0.85) * 1000) / 1000;
      const duration = Math.round(maturityYears * 0.72 * (0.8 + rng() * 0.4) * 100) / 100;
      const spread = Math.round((yld - 2.5) * 100 + rng() * 30);
      const callDate = maturityYears > 10 ? (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 10); return d.toISOString().slice(0, 10); })() : null;

      return {
        state: st.state, stateName: st.name, stateRating: st.rating,
        sector, coupon, maturityDate: mat.toISOString().slice(0, 10),
        maturityYears, yield: yld, taxEquivYield,
        muniTreasuryRatio, price, duration, spread,
        callDate, callable: callDate !== null,
        stateTaxRate: st.taxRate, federalTaxRate: fedTaxRate,
      };
    });
  });

  // AAA Muni Curve
  const curvePoints = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30].map(yr => ({
    maturity: yr,
    muniYield: Math.round((1.8 + Math.log(yr) * 0.55 + (rng() - 0.5) * 0.2) * 1000) / 1000,
    treasuryYield: Math.round((2.5 + Math.log(yr) * 0.6 + (rng() - 0.5) * 0.15) * 1000) / 1000,
    ratio: 0,
  }));
  for (const p of curvePoints) p.ratio = Math.round(p.muniYield / p.treasuryYield * 100);

  const stateAggregates = STATES.map(st => {
    const stateBonds = bonds.filter(b => b.state === st.state);
    const avgYield = Math.round(stateBonds.reduce((a, b) => a + b.yield, 0) / stateBonds.length * 1000) / 1000;
    const avgTEY = Math.round(stateBonds.reduce((a, b) => a + b.taxEquivYield, 0) / stateBonds.length * 1000) / 1000;
    const avgDuration = Math.round(stateBonds.reduce((a, b) => a + b.duration, 0) / stateBonds.length * 100) / 100;
    return {
      state: st.state, name: st.name, rating: st.rating,
      stateTaxRate: st.taxRate,
      outstanding: Math.round(jitter(st.outstanding, 0.05) * 10) / 10,
      bondCount: stateBonds.length, avgYield, avgTEY, avgDuration,
      spreadVsAAA: Math.round((avgYield - 2.8) * 100),
    };
  });

  const sectorBreakdown = SECTORS.map(sector => {
    const sectorBonds = bonds.filter(b => b.sector === sector);
    if (sectorBonds.length === 0) return null;
    return {
      sector,
      count: sectorBonds.length,
      avgYield: Math.round(sectorBonds.reduce((a, b) => a + b.yield, 0) / sectorBonds.length * 1000) / 1000,
      avgDuration: Math.round(sectorBonds.reduce((a, b) => a + b.duration, 0) / sectorBonds.length * 100) / 100,
    };
  }).filter(Boolean);

  return { bonds, curvePoints, stateAggregates, sectorBreakdown, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MuniBonds] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate muni bond data' });
  }
});

export default router;
