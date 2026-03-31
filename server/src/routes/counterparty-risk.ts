import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Counterparty seed data ──

const COUNTERPARTIES = [
  { name: 'JPMorgan',        rating: 'AA-',  baseGross: 4850, baseNet: 1620, baseCVA: 28.5, baseDVA: 12.3, basePFE: 3180, baseLimit: 72 },
  { name: 'Goldman Sachs',   rating: 'A+',   baseGross: 3920, baseNet: 1380, baseCVA: 35.2, baseDVA: 10.1, basePFE: 2640, baseLimit: 68 },
  { name: 'Morgan Stanley',  rating: 'A+',   baseGross: 3410, baseNet: 1190, baseCVA: 31.8, baseDVA: 9.4,  basePFE: 2290, baseLimit: 64 },
  { name: 'Citigroup',       rating: 'A',    baseGross: 3780, baseNet: 1450, baseCVA: 42.1, baseDVA: 11.2, basePFE: 2510, baseLimit: 71 },
  { name: 'Bank of America', rating: 'AA-',  baseGross: 4120, baseNet: 1380, baseCVA: 26.4, baseDVA: 13.5, basePFE: 2750, baseLimit: 66 },
  { name: 'Barclays',        rating: 'A',    baseGross: 2680, baseNet: 980,  baseCVA: 38.7, baseDVA: 7.8,  basePFE: 1810, baseLimit: 58 },
  { name: 'Deutsche Bank',   rating: 'BBB+', baseGross: 2140, baseNet: 890,  baseCVA: 52.3, baseDVA: 6.1,  basePFE: 1520, baseLimit: 76 },
  { name: 'UBS',             rating: 'A+',   baseGross: 2950, baseNet: 1050, baseCVA: 29.6, baseDVA: 8.9,  basePFE: 1980, baseLimit: 55 },
  { name: 'HSBC',            rating: 'AA-',  baseGross: 3560, baseNet: 1220, baseCVA: 24.8, baseDVA: 11.7, basePFE: 2380, baseLimit: 61 },
  { name: 'BNP Paribas',     rating: 'A+',   baseGross: 2520, baseNet: 920,  baseCVA: 33.4, baseDVA: 7.2,  basePFE: 1690, baseLimit: 53 },
  { name: 'Credit Suisse',   rating: 'BBB',  baseGross: 1680, baseNet: 780,  baseCVA: 61.5, baseDVA: 4.8,  basePFE: 1240, baseLimit: 82 },
  { name: 'Nomura',          rating: 'A-',   baseGross: 1890, baseNet: 720,  baseCVA: 36.9, baseDVA: 5.6,  basePFE: 1350, baseLimit: 48 },
] as const;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-counterparty-risk'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // ── 1. Counterparty Exposure Table ──

  const exposures = COUNTERPARTIES.map(cp => {
    const grossExposure = roundTo(jitter(cp.baseGross, 0.08), 1);
    const netExposure = roundTo(jitter(cp.baseNet, 0.10), 1);
    const cva = roundTo(jitter(cp.baseCVA, 0.12), 2);
    const dva = roundTo(jitter(cp.baseDVA, 0.12), 2);
    const pfe = roundTo(jitter(cp.basePFE, 0.09), 1);
    const limitUtilization = roundTo(Math.min(99.5, Math.max(15, jitter(cp.baseLimit, 0.10))), 1);

    return {
      counterparty: cp.name,
      rating: cp.rating,
      grossExposure,
      netExposure,
      cva,
      dva,
      pfe,
      limitUtilization,
    };
  });

  // ── 2. Netting Summary ──

  const totalGross = exposures.reduce((s, e) => s + e.grossExposure, 0);
  const totalNet = exposures.reduce((s, e) => s + e.netExposure, 0);
  const nettingBenefit = roundTo(totalGross - totalNet, 1);
  const collateralHeld = roundTo(jitter(totalNet * 0.62, 0.08), 1);
  const netExposureAfterCollateral = roundTo(totalNet - collateralHeld, 1);

  const nettingSummary = {
    grossPositiveMtM: roundTo(totalGross, 1),
    nettingBenefit,
    nettingBenefitPct: roundTo((nettingBenefit / totalGross) * 100, 1),
    collateralHeld,
    netExposure: netExposureAfterCollateral,
  };

  // ── 3. CVA/DVA Summary ──

  const totalCVA = roundTo(exposures.reduce((s, e) => s + e.cva, 0), 2);
  const totalDVA = roundTo(exposures.reduce((s, e) => s + e.dva, 0), 2);
  const bilateralCVA = roundTo(totalCVA - totalDVA, 2);
  const cvaVaR = roundTo(jitter(totalCVA * 0.18, 0.12), 2);

  const cvaDvaSummary = {
    totalCVA,
    totalDVA,
    bilateralCVA,
    cvaVaR,
    cvaAsPercentOfExposure: roundTo((totalCVA / totalNet) * 100, 3),
    dvaAsPercentOfExposure: roundTo((totalDVA / totalNet) * 100, 3),
  };

  return {
    exposures,
    nettingSummary,
    cvaDvaSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CounterpartyRisk] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate counterparty risk data' });
  }
});

export default router;
