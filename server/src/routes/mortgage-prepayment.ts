import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Static configs ──

const AGENCIES = ['FNMA', 'FHLMC', 'GNMA'] as const;
const AGENCY_NAMES: Record<string, string> = { FNMA: 'Fannie Mae', FHLMC: 'Freddie Mac', GNMA: 'Ginnie Mae' };

const POOL_CONFIGS = [
  // FNMA 30Y
  { agency: 'FNMA', program: '30Y', coupon: 2.0, baseWAC: 2.55, baseWAM: 268, baseWALA: 92, baseCPR: 3.2, baseCDR: 0.15, baseSATO: 55, baseLTV: 72 },
  { agency: 'FNMA', program: '30Y', coupon: 2.5, baseWAC: 3.05, baseWAM: 275, baseWALA: 85, baseCPR: 4.0, baseCDR: 0.12, baseSATO: 52, baseLTV: 70 },
  { agency: 'FNMA', program: '30Y', coupon: 3.0, baseWAC: 3.55, baseWAM: 290, baseWALA: 70, baseCPR: 5.2, baseCDR: 0.10, baseSATO: 48, baseLTV: 68 },
  { agency: 'FNMA', program: '30Y', coupon: 3.5, baseWAC: 4.05, baseWAM: 300, baseWALA: 60, baseCPR: 5.8, baseCDR: 0.08, baseSATO: 45, baseLTV: 66 },
  { agency: 'FNMA', program: '30Y', coupon: 4.0, baseWAC: 4.55, baseWAM: 310, baseWALA: 50, baseCPR: 6.5, baseCDR: 0.06, baseSATO: 42, baseLTV: 72 },
  { agency: 'FNMA', program: '30Y', coupon: 4.5, baseWAC: 5.05, baseWAM: 325, baseWALA: 35, baseCPR: 7.8, baseCDR: 0.05, baseSATO: 40, baseLTV: 75 },
  { agency: 'FNMA', program: '30Y', coupon: 5.0, baseWAC: 5.55, baseWAM: 335, baseWALA: 25, baseCPR: 9.5, baseCDR: 0.04, baseSATO: 38, baseLTV: 78 },
  { agency: 'FNMA', program: '30Y', coupon: 5.5, baseWAC: 6.05, baseWAM: 342, baseWALA: 18, baseCPR: 12.0, baseCDR: 0.03, baseSATO: 35, baseLTV: 80 },
  { agency: 'FNMA', program: '30Y', coupon: 6.0, baseWAC: 6.55, baseWAM: 350, baseWALA: 10, baseCPR: 15.5, baseCDR: 0.02, baseSATO: 32, baseLTV: 82 },
  { agency: 'FNMA', program: '30Y', coupon: 6.5, baseWAC: 7.05, baseWAM: 355, baseWALA: 5, baseCPR: 18.0, baseCDR: 0.02, baseSATO: 30, baseLTV: 85 },
  // FNMA 15Y
  { agency: 'FNMA', program: '15Y', coupon: 2.0, baseWAC: 2.45, baseWAM: 130, baseWALA: 50, baseCPR: 5.5, baseCDR: 0.08, baseSATO: 40, baseLTV: 60 },
  { agency: 'FNMA', program: '15Y', coupon: 3.0, baseWAC: 3.45, baseWAM: 142, baseWALA: 38, baseCPR: 8.0, baseCDR: 0.05, baseSATO: 35, baseLTV: 58 },
  { agency: 'FNMA', program: '15Y', coupon: 4.0, baseWAC: 4.45, baseWAM: 155, baseWALA: 25, baseCPR: 10.5, baseCDR: 0.03, baseSATO: 32, baseLTV: 55 },
  { agency: 'FNMA', program: '15Y', coupon: 5.0, baseWAC: 5.45, baseWAM: 165, baseWALA: 15, baseCPR: 14.0, baseCDR: 0.02, baseSATO: 28, baseLTV: 60 },
  { agency: 'FNMA', program: '15Y', coupon: 5.5, baseWAC: 5.95, baseWAM: 170, baseWALA: 10, baseCPR: 16.5, baseCDR: 0.02, baseSATO: 26, baseLTV: 62 },
  // FHLMC 30Y
  { agency: 'FHLMC', program: '30Y', coupon: 2.0, baseWAC: 2.52, baseWAM: 270, baseWALA: 90, baseCPR: 3.0, baseCDR: 0.14, baseSATO: 53, baseLTV: 71 },
  { agency: 'FHLMC', program: '30Y', coupon: 2.5, baseWAC: 3.02, baseWAM: 278, baseWALA: 82, baseCPR: 3.8, baseCDR: 0.11, baseSATO: 50, baseLTV: 69 },
  { agency: 'FHLMC', program: '30Y', coupon: 3.0, baseWAC: 3.52, baseWAM: 292, baseWALA: 68, baseCPR: 5.0, baseCDR: 0.09, baseSATO: 46, baseLTV: 67 },
  { agency: 'FHLMC', program: '30Y', coupon: 3.5, baseWAC: 4.02, baseWAM: 302, baseWALA: 58, baseCPR: 5.5, baseCDR: 0.07, baseSATO: 43, baseLTV: 65 },
  { agency: 'FHLMC', program: '30Y', coupon: 4.0, baseWAC: 4.52, baseWAM: 312, baseWALA: 48, baseCPR: 6.2, baseCDR: 0.05, baseSATO: 40, baseLTV: 71 },
  { agency: 'FHLMC', program: '30Y', coupon: 4.5, baseWAC: 5.02, baseWAM: 328, baseWALA: 32, baseCPR: 7.5, baseCDR: 0.04, baseSATO: 38, baseLTV: 74 },
  { agency: 'FHLMC', program: '30Y', coupon: 5.0, baseWAC: 5.52, baseWAM: 338, baseWALA: 22, baseCPR: 9.2, baseCDR: 0.03, baseSATO: 36, baseLTV: 77 },
  { agency: 'FHLMC', program: '30Y', coupon: 5.5, baseWAC: 6.02, baseWAM: 345, baseWALA: 15, baseCPR: 11.5, baseCDR: 0.03, baseSATO: 33, baseLTV: 79 },
  { agency: 'FHLMC', program: '30Y', coupon: 6.0, baseWAC: 6.52, baseWAM: 352, baseWALA: 8, baseCPR: 14.8, baseCDR: 0.02, baseSATO: 30, baseLTV: 81 },
  { agency: 'FHLMC', program: '30Y', coupon: 6.5, baseWAC: 7.02, baseWAM: 356, baseWALA: 4, baseCPR: 17.5, baseCDR: 0.02, baseSATO: 28, baseLTV: 84 },
  // GNMA 30Y (higher CDR typical for government loans)
  { agency: 'GNMA', program: '30Y', coupon: 2.0, baseWAC: 2.60, baseWAM: 265, baseWALA: 95, baseCPR: 4.0, baseCDR: 0.35, baseSATO: 60, baseLTV: 92 },
  { agency: 'GNMA', program: '30Y', coupon: 2.5, baseWAC: 3.10, baseWAM: 272, baseWALA: 88, baseCPR: 5.0, baseCDR: 0.30, baseSATO: 58, baseLTV: 90 },
  { agency: 'GNMA', program: '30Y', coupon: 3.0, baseWAC: 3.60, baseWAM: 285, baseWALA: 75, baseCPR: 6.2, baseCDR: 0.25, baseSATO: 55, baseLTV: 88 },
  { agency: 'GNMA', program: '30Y', coupon: 3.5, baseWAC: 4.10, baseWAM: 298, baseWALA: 62, baseCPR: 7.0, baseCDR: 0.22, baseSATO: 50, baseLTV: 90 },
  { agency: 'GNMA', program: '30Y', coupon: 4.0, baseWAC: 4.60, baseWAM: 308, baseWALA: 52, baseCPR: 8.0, baseCDR: 0.18, baseSATO: 48, baseLTV: 92 },
  { agency: 'GNMA', program: '30Y', coupon: 4.5, baseWAC: 5.10, baseWAM: 322, baseWALA: 38, baseCPR: 9.5, baseCDR: 0.15, baseSATO: 45, baseLTV: 93 },
  { agency: 'GNMA', program: '30Y', coupon: 5.0, baseWAC: 5.60, baseWAM: 332, baseWALA: 28, baseCPR: 11.5, baseCDR: 0.12, baseSATO: 42, baseLTV: 94 },
  { agency: 'GNMA', program: '30Y', coupon: 5.5, baseWAC: 6.10, baseWAM: 340, baseWALA: 20, baseCPR: 14.0, baseCDR: 0.10, baseSATO: 38, baseLTV: 95 },
  { agency: 'GNMA', program: '30Y', coupon: 6.0, baseWAC: 6.60, baseWAM: 348, baseWALA: 12, baseCPR: 17.0, baseCDR: 0.08, baseSATO: 35, baseLTV: 96 },
  { agency: 'GNMA', program: '30Y', coupon: 6.5, baseWAC: 7.10, baseWAM: 354, baseWALA: 6, baseCPR: 20.0, baseCDR: 0.06, baseSATO: 32, baseLTV: 96 },
];

const PSA_BENCHMARKS = [50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500];

const VINTAGE_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

// Seasonal CPR multipliers by month (Jan=0..Dec=11), based on housing turnover patterns
const BASE_SEASONAL_FACTORS = [0.80, 0.78, 0.85, 0.92, 1.02, 1.12, 1.18, 1.15, 1.08, 0.98, 0.88, 0.82];

// LTV distribution buckets
const LTV_BUCKETS = ['<=60', '60-70', '70-80', '80-90', '90-95', '>95'];
let cache: { data: unknown; ts: number } | null = null;

// ── Data generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('mortgage-prepayment-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Pool-level prepayment data
  const pools = POOL_CONFIGS.map(cfg => {
    const wac = Math.round(jitter(cfg.baseWAC, 0.02) * 100) / 100;
    const wam = Math.round(jitter(cfg.baseWAM, 0.02));
    const wala = Math.round(jitter(cfg.baseWALA, 0.05));

    // Prepayment metrics
    const cpr1m = Math.round(jitter(cfg.baseCPR, 0.15) * 100) / 100;
    const cpr3m = Math.round(jitter(cfg.baseCPR, 0.10) * 100) / 100;
    const cpr6m = Math.round(jitter(cfg.baseCPR * 0.95, 0.08) * 100) / 100;
    const cpr12m = Math.round(jitter(cfg.baseCPR * 0.90, 0.06) * 100) / 100;
    const cprLife = Math.round(jitter(cfg.baseCPR * 0.85, 0.05) * 100) / 100;

    // SMM = 1 - (1 - CPR/100)^(1/12), approximated
    const smm1m = Math.round((1 - Math.pow(1 - cpr1m / 100, 1 / 12)) * 10000) / 100;
    const smm3m = Math.round((1 - Math.pow(1 - cpr3m / 100, 1 / 12)) * 10000) / 100;

    // CDR (Conditional Default Rate)
    const cdr = Math.round(jitter(cfg.baseCDR, 0.20) * 100) / 100;
    const mdr = Math.round((1 - Math.pow(1 - cdr / 100, 1 / 12)) * 10000) / 100; // Monthly default rate

    // PSA speed: CPR at month 30 = 6% for 100 PSA
    // PSA% = (CPR / 6) * 100 * (30 / min(wala, 30))
    const effectiveAge = Math.min(wala, 30);
    const psa = Math.round((cpr1m / (6 * effectiveAge / 30)) * 100);

    // SATO (Spread At The Origination) in bps
    const sato = Math.round(jitter(cfg.baseSATO, 0.15));

    // Burnout factor: higher coupons and older pools show more burnout
    // Burnout reduces prepayment sensitivity; 0=no burnout, 1=fully burned out
    const ageFactor = Math.min(wala / 120, 0.5);
    const couponFactor = cfg.coupon >= 5.0 ? 0.3 : cfg.coupon >= 4.0 ? 0.15 : 0.05;
    const burnout = Math.round(Math.min(jitter(ageFactor + couponFactor, 0.20), 0.95) * 100) / 100;

    // Turnover vs refinance decomposition
    const totalCPR = cpr1m;
    const refinanceIncentive = Math.max(0, (wac - cfg.coupon - 0.5) * 3.5);
    const refinancePct = Math.min(0.85, Math.round(jitter(Math.max(0.10, refinanceIncentive / totalCPR * 0.6), 0.15) * 100) / 100);
    const turnoverPct = Math.round((1 - refinancePct) * 100) / 100;
    const refinanceCPR = Math.round(totalCPR * refinancePct * 100) / 100;
    const turnoverCPR = Math.round(totalCPR * turnoverPct * 100) / 100;

    // LTV distribution
    const ltvDistribution: Record<string, number> = {};
    let ltvRemaining = 100;
    const baseLTV = cfg.baseLTV;
    for (let i = 0; i < LTV_BUCKETS.length - 1; i++) {
      const bucket = LTV_BUCKETS[i];
      // Weight distribution around the base LTV
      const bucketMid = [55, 65, 75, 85, 92.5][i];
      const distance = Math.abs(baseLTV - bucketMid);
      const weight = Math.max(2, 40 - distance) * (0.8 + rng() * 0.4);
      const pct = Math.min(ltvRemaining, Math.round(weight));
      ltvDistribution[bucket] = pct;
      ltvRemaining -= pct;
    }
    ltvDistribution[LTV_BUCKETS[LTV_BUCKETS.length - 1]] = Math.max(0, ltvRemaining);

    // Pool balance
    const originalBalance = Math.round(jitter(800e6, 0.30));
    const factor = Math.round(Math.max(0.15, Math.min(0.98, 1 - (wala / 360) * (1 + cprLife / 100))) * 10000) / 10000;
    const currentBalance = Math.round(originalBalance * factor);

    // 12-month CPR history
    const prepayHistory = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      const monthIdx = d.getMonth();
      const seasonalAdj = BASE_SEASONAL_FACTORS[monthIdx];
      const historyCPR = Math.round(jitter(cfg.baseCPR * seasonalAdj, 0.12) * 100) / 100;
      const historySMM = Math.round((1 - Math.pow(1 - historyCPR / 100, 1 / 12)) * 10000) / 100;
      return {
        month: d.toISOString().slice(0, 7),
        cpr: historyCPR,
        smm: historySMM,
        cdr: Math.round(jitter(cfg.baseCDR, 0.25) * 100) / 100,
      };
    });

    return {
      id: `${cfg.agency}-${cfg.program}-${cfg.coupon.toFixed(1)}`,
      agency: cfg.agency,
      agencyName: AGENCY_NAMES[cfg.agency],
      program: cfg.program,
      coupon: cfg.coupon,
      wac,
      wam,
      wala,
      prepayment: {
        cpr: { oneMonth: cpr1m, threeMonth: cpr3m, sixMonth: cpr6m, twelveMonth: cpr12m, life: cprLife },
        smm: { oneMonth: smm1m, threeMonth: smm3m },
        cdr,
        mdr,
        psa,
      },
      decomposition: {
        refinanceCPR,
        turnoverCPR,
        refinancePct: Math.round(refinancePct * 100),
        turnoverPct: Math.round(turnoverPct * 100),
      },
      burnout,
      sato,
      ltvDistribution,
      pool: { factor, originalBalance, currentBalance },
      prepayHistory,
    };
  });

  // PSA benchmark table: CPR at different ages for each PSA speed
  const psaBenchmarks = PSA_BENCHMARKS.map(speed => {
    const ages = [1, 3, 6, 12, 18, 24, 30, 60, 120, 180, 240, 300, 360];
    const cprByAge = ages.map(age => {
      // Standard PSA: CPR ramps linearly from 0 to 6% at month 30, then flat
      const baseCPR = age <= 30 ? (6 * age / 30) : 6;
      const scaledCPR = Math.round(baseCPR * speed / 100 * 100) / 100;
      return { age, cpr: scaledCPR };
    });
    return { speed, label: `${speed}% PSA`, cprByAge };
  });

  // Vintage analysis: aggregate prepayment behavior by origination year
  const vintageAnalysis = VINTAGE_YEARS.map(year => {
    const vintageAge = new Date().getFullYear() - year;

    // Older vintages have lower coupons on average
    const avgCouponBase = year <= 2020 ? 2.8 : year <= 2021 ? 3.2 : year <= 2022 ? 4.8 : year <= 2023 ? 6.0 : year <= 2024 ? 6.3 : 6.5;
    const avgCoupon = Math.round(jitter(avgCouponBase, 0.05) * 100) / 100;

    // Older pools tend to be more burned out
    const burnoutBase = Math.min(0.90, vintageAge * 0.12);
    const burnoutFactor = Math.round(jitter(burnoutBase, 0.15) * 100) / 100;

    // CPR varies by vintage characteristics
    const cprBase = year <= 2020 ? 3.5 : year <= 2021 ? 4.5 : year <= 2022 ? 7.0 : year <= 2023 ? 12.0 : year <= 2024 ? 10.0 : 8.0;
    const avgCPR = Math.round(jitter(cprBase, 0.12) * 100) / 100;
    const avgCDR = Math.round(jitter(year <= 2021 ? 0.12 : year <= 2022 ? 0.08 : 0.05, 0.20) * 100) / 100;

    const avgWAC = Math.round(jitter(avgCouponBase + 0.55, 0.03) * 100) / 100;
    const avgWAM = Math.round(jitter(360 - vintageAge * 12, 0.02));
    const avgWALA = Math.round(jitter(vintageAge * 12, 0.05));
    const avgSATO = Math.round(jitter(year <= 2021 ? 55 : year <= 2022 ? 42 : 35, 0.10));
    const avgLTV = Math.round(jitter(year <= 2021 ? 70 : year <= 2022 ? 75 : 80, 0.05) * 10) / 10;

    const psa = Math.round((avgCPR / (6 * Math.min(avgWALA, 30) / 30)) * 100);

    // Pool factor: how much principal remains
    const factorBase = Math.max(0.20, 1 - vintageAge * 0.10 - avgCPR / 100 * vintageAge * 0.5);
    const avgFactor = Math.round(jitter(factorBase, 0.08) * 10000) / 10000;
    const outstandingBalance = Math.round(jitter(year <= 2021 ? 120e9 : year <= 2022 ? 250e9 : year <= 2023 ? 380e9 : year <= 2024 ? 450e9 : 200e9, 0.10));

    // Refinance vs turnover for the vintage
    const refiPct = year <= 2021 ? 15 : year <= 2022 ? 25 : year <= 2023 ? 45 : 55;
    const refinancePct = Math.round(jitter(refiPct, 0.15));
    const turnoverPct = 100 - refinancePct;

    // 6-month CPR trend for this vintage
    const cprTrend = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toISOString().slice(0, 7),
        cpr: Math.round(jitter(cprBase * BASE_SEASONAL_FACTORS[d.getMonth()], 0.10) * 100) / 100,
      };
    });

    return {
      vintage: year,
      avgCoupon,
      avgWAC,
      avgWAM,
      avgWALA,
      avgCPR,
      avgCDR,
      psa,
      burnoutFactor,
      avgSATO,
      avgLTV,
      avgFactor,
      outstandingBalance,
      decomposition: { refinancePct, turnoverPct },
      cprTrend,
    };
  });

  // Seasonal adjustment factors with current-year variation
  const currentMonth = new Date().getMonth();
  const seasonalFactors = BASE_SEASONAL_FACTORS.map((base, i) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const adjusted = Math.round(jitter(base, 0.05) * 1000) / 1000;
    const isPast = i <= currentMonth;
    return {
      month: monthNames[i],
      monthIndex: i + 1,
      historicalFactor: base,
      currentYearFactor: isPast ? adjusted : null,
      status: i === currentMonth ? 'current' : isPast ? 'actual' : 'forecast',
    };
  });

  // Agency-level summary
  const agencySummary = AGENCIES.map(agency => {
    const agencyPools = pools.filter(p => p.agency === agency);
    const totalBalance = agencyPools.reduce((a, p) => a + p.pool.currentBalance, 0);
    const avgCPR = Math.round(agencyPools.reduce((a, p) => a + p.prepayment.cpr.oneMonth, 0) / agencyPools.length * 100) / 100;
    const avgCDR = Math.round(agencyPools.reduce((a, p) => a + p.prepayment.cdr, 0) / agencyPools.length * 100) / 100;
    const avgPSA = Math.round(agencyPools.reduce((a, p) => a + p.prepayment.psa, 0) / agencyPools.length);
    const avgBurnout = Math.round(agencyPools.reduce((a, p) => a + p.burnout, 0) / agencyPools.length * 100) / 100;
    const avgSATO = Math.round(agencyPools.reduce((a, p) => a + p.sato, 0) / agencyPools.length);
    const poolCount = agencyPools.length;

    return {
      agency,
      agencyName: AGENCY_NAMES[agency],
      poolCount,
      totalBalance,
      avgCPR,
      avgCDR,
      avgPSA,
      avgBurnout,
      avgSATO,
    };
  });

  // Coupon stack summary (30Y only, across all agencies)
  const couponStacks = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5].map(coupon => {
    const couponPools = pools.filter(p => p.coupon === coupon && p.program === '30Y');
    if (couponPools.length === 0) return null;
    const avgCPR = Math.round(couponPools.reduce((a, p) => a + p.prepayment.cpr.oneMonth, 0) / couponPools.length * 100) / 100;
    const avgCDR = Math.round(couponPools.reduce((a, p) => a + p.prepayment.cdr, 0) / couponPools.length * 100) / 100;
    const avgSMM = Math.round(couponPools.reduce((a, p) => a + p.prepayment.smm.oneMonth, 0) / couponPools.length * 100) / 100;
    const avgPSA = Math.round(couponPools.reduce((a, p) => a + p.prepayment.psa, 0) / couponPools.length);
    const avgBurnout = Math.round(couponPools.reduce((a, p) => a + p.burnout, 0) / couponPools.length * 100) / 100;
    const avgSATO = Math.round(couponPools.reduce((a, p) => a + p.sato, 0) / couponPools.length);
    const totalBalance = couponPools.reduce((a, p) => a + p.pool.currentBalance, 0);
    const avgRefiPct = Math.round(couponPools.reduce((a, p) => a + p.decomposition.refinancePct, 0) / couponPools.length);

    return {
      coupon,
      poolCount: couponPools.length,
      totalBalance,
      avgCPR,
      avgCDR,
      avgSMM,
      avgPSA,
      avgBurnout,
      avgSATO,
      refinancePct: avgRefiPct,
      turnoverPct: 100 - avgRefiPct,
    };
  }).filter(Boolean);

  // Overall summary
  const summary = {
    totalPools: pools.length,
    totalOutstanding: pools.reduce((a, p) => a + p.pool.currentBalance, 0),
    avgCPR: Math.round(pools.reduce((a, p) => a + p.prepayment.cpr.oneMonth, 0) / pools.length * 100) / 100,
    avgCDR: Math.round(pools.reduce((a, p) => a + p.prepayment.cdr, 0) / pools.length * 100) / 100,
    avgSMM: Math.round(pools.reduce((a, p) => a + p.prepayment.smm.oneMonth, 0) / pools.length * 100) / 100,
    avgPSA: Math.round(pools.reduce((a, p) => a + p.prepayment.psa, 0) / pools.length),
    avgBurnout: Math.round(pools.reduce((a, p) => a + p.burnout, 0) / pools.length * 100) / 100,
    avgWAC: Math.round(pools.reduce((a, p) => a + p.wac, 0) / pools.length * 100) / 100,
    avgWAM: Math.round(pools.reduce((a, p) => a + p.wam, 0) / pools.length),
    avgWALA: Math.round(pools.reduce((a, p) => a + p.wala, 0) / pools.length),
  };

  return {
    summary,
    agencySummary,
    couponStacks,
    pools,
    psaBenchmarks,
    vintageAnalysis,
    seasonalFactors,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MortgagePrepayment] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate mortgage prepayment data' });
  }
});

export default router;
