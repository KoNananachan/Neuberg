import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const TRANCHE_TEMPLATES = [
  { tranche: 'AAA', baseSpread: 90, baseYield: 5.3 },
  { tranche: 'AA', baseSpread: 130, baseYield: 5.7 },
  { tranche: 'A', baseSpread: 185, baseYield: 6.2 },
  { tranche: 'BBB', baseSpread: 300, baseYield: 7.4 },
  { tranche: 'BB', baseSpread: 475, baseYield: 9.1 },
  { tranche: 'B', baseSpread: 650, baseYield: 10.9 },
];

const CAP_RATE_TEMPLATES = [
  { type: 'Office', baseCapRate: 7.5, baseVolume: 8.2 },
  { type: 'Multifamily', baseCapRate: 5.25, baseVolume: 18.5 },
  { type: 'Industrial', baseCapRate: 5.5, baseVolume: 14.3 },
  { type: 'Retail', baseCapRate: 7.0, baseVolume: 6.8 },
  { type: 'Hotel', baseCapRate: 8.2, baseVolume: 3.5 },
  { type: 'Data Center', baseCapRate: 5.8, baseVolume: 4.1 },
];

const PIPELINE_TEMPLATES = [
  { borrower: 'Brookfield Asset Management', propertyType: 'Office', location: 'New York, NY', baseDealSize: 850, baseLtv: 62 },
  { borrower: 'Blackstone Real Estate', propertyType: 'Multifamily', location: 'Dallas, TX', baseDealSize: 620, baseLtv: 68 },
  { borrower: 'Prologis Inc', propertyType: 'Industrial', location: 'Chicago, IL', baseDealSize: 480, baseLtv: 58 },
  { borrower: 'Simon Property Group', propertyType: 'Retail', location: 'Los Angeles, CA', baseDealSize: 390, baseLtv: 55 },
  { borrower: 'Starwood Capital', propertyType: 'Hotel', location: 'Miami, FL', baseDealSize: 310, baseLtv: 60 },
  { borrower: 'Digital Realty Trust', propertyType: 'Data Center', location: 'Ashburn, VA', baseDealSize: 720, baseLtv: 52 },
  { borrower: 'Greystar Real Estate', propertyType: 'Multifamily', location: 'Phoenix, AZ', baseDealSize: 275, baseLtv: 70 },
  { borrower: 'Hines Interests', propertyType: 'Office', location: 'Houston, TX', baseDealSize: 540, baseLtv: 59 },
];

const DELINQUENCY_TEMPLATES = [
  { type: 'Office', baseRate: 7.2, baseSpecialServicing: 9.5 },
  { type: 'Multifamily', baseRate: 1.5, baseSpecialServicing: 1.8 },
  { type: 'Industrial', baseRate: 0.8, baseSpecialServicing: 1.0 },
  { type: 'Retail', baseRate: 4.8, baseSpecialServicing: 6.2 },
  { type: 'Hotel', baseRate: 3.5, baseSpecialServicing: 4.8 },
  { type: 'Mixed Use', baseRate: 2.9, baseSpecialServicing: 3.6 },
];

const STATUSES = ['Priced', 'Pricing', 'Pre-Marketing', 'Closed'] as const;
const OUTLOOKS = ['Improving', 'Stable', 'Weakening'] as const;


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-real-estate-capital'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // CMBS Spreads
  const cmbsSpreads = TRANCHE_TEMPLATES.map(t => {
    const spread = Math.round(jitter(t.baseSpread, 0.08));
    const change1w = Math.round((rng() - 0.5) * 12);
    const change1m = Math.round((rng() - 0.5) * 24);
    const percentile1Y = Math.round(jitter(50, 0.6));
    const yieldVal = Math.round(jitter(t.baseYield, 0.05) * 100) / 100;
    return {
      tranche: t.tranche,
      spread,
      change1w,
      change1m,
      percentile1Y: Math.max(1, Math.min(99, percentile1Y)),
      yield: yieldVal,
    };
  });

  // Cap Rates
  const capRates = CAP_RATE_TEMPLATES.map(t => {
    const capRate = Math.round(jitter(t.baseCapRate, 0.06) * 100) / 100;
    const change1q = Math.round((rng() - 0.45) * 30);
    const change1y = Math.round((rng() - 0.45) * 60);
    const transactionVolume = Math.round(jitter(t.baseVolume, 0.15) * 10) / 10;

    let outlook: typeof OUTLOOKS[number];
    if (t.type === 'Office') {
      outlook = rng() < 0.7 ? 'Weakening' : 'Stable';
    } else if (t.type === 'Industrial' || t.type === 'Data Center') {
      outlook = rng() < 0.6 ? 'Improving' : 'Stable';
    } else {
      outlook = pick(OUTLOOKS);
    }

    return { type: t.type, capRate, change1q, change1y, transactionVolume, outlook };
  });

  // Pipeline
  const pipeline = PIPELINE_TEMPLATES.map(t => {
    const dealSize = Math.round(jitter(t.baseDealSize, 0.1));
    const spread = Math.round(jitter(180, 0.2));
    const ltv = Math.round(jitter(t.baseLtv, 0.06) * 10) / 10;
    const dscr = Math.round(jitter(1.35, 0.1) * 100) / 100;
    const status = pick(STATUSES);
    return {
      borrower: t.borrower,
      propertyType: t.propertyType,
      location: t.location,
      dealSize,
      spread,
      ltv,
      dscr,
      status,
    };
  });

  // Delinquency
  const delinquency = DELINQUENCY_TEMPLATES.map(t => {
    const rate = Math.round(jitter(t.baseRate, 0.1) * 100) / 100;
    const change1m = Math.round((rng() - 0.48) * 40) / 100;
    const change1y = Math.round((rng() - 0.45) * 150) / 100;
    const specialServicing = Math.round(jitter(t.baseSpecialServicing, 0.1) * 100) / 100;
    return { type: t.type, rate, change1m, change1y, specialServicing };
  });

  // Summary
  const cmbsIssuanceYTD = Math.round(jitter(48, 0.12) * 10) / 10;
  const avgCapRate = Math.round(
    capRates.reduce((a, c) => a + c.capRate, 0) / capRates.length * 100,
  ) / 100;
  const avgCmbsSpread = Math.round(
    cmbsSpreads.reduce((a, c) => a + c.spread, 0) / cmbsSpreads.length,
  );
  const delinquencyRate = Math.round(
    delinquency.reduce((a, d) => a + d.rate, 0) / delinquency.length * 100,
  ) / 100;
  const totalPipeline = Math.round(
    pipeline.reduce((a, p) => a + p.dealSize, 0) / 1000 * 100,
  ) / 100;

  const summary = {
    cmbsIssuanceYTD,
    avgCapRate,
    avgCmbsSpread,
    delinquencyRate,
    totalPipeline,
  };

  return {
    summary,
    cmbsSpreads,
    capRates,
    pipeline,
    delinquency,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RealEstateCapital] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate real estate capital markets data' });
  }
});

export default router;
