import { Router } from 'express';

const router = Router();

// --- Seeded RNG utilities ---
function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; return h >>> 0; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// --- TypeScript Interfaces ---

interface GlobalAggregate {
  totalGlobalDebtTrillions: number;
  govDebtTrillions: number;
  corporateDebtTrillions: number;
  householdDebtTrillions: number;
  financialDebtTrillions: number;
  globalDebtToGDPPct: number;
  yearOverYearChangeTrillions: number;
}

interface SovereignDebtEntry {
  country: string;
  totalDebtBillions: number;
  debtToGDPPct: number;
  annualDeficitPct: number;
  interestPaymentsBillions: number;
  interestToRevenuePct: number;
  debtPerCapitaUSD: number;
  creditRating: string;
  fiscalBalance: 'surplus' | 'deficit';
  primaryBalancePct: number;
}

interface DebtSustainabilityIndicators {
  country: string;
  impliedFiscalSpace: number;
  rolloverRiskIndex: number;
  avgMaturityYears: number;
  foreignHoldingPct: number;
  interestRateOnDebtPct: number;
}

interface DebtGrowthProjection {
  country: string;
  projected2025: number;
  projected2026: number;
  projected2027: number;
  projected2028: number;
  projected2030: number;
}

interface DebtComposition {
  country: string;
  domesticVsForeignPct: { domestic: number; foreign: number };
  shortTermVsLongTermPct: { shortTerm: number; longTerm: number };
  fixedVsFloatingPct: { fixed: number; floating: number };
}

interface InterestBurdenCountry {
  country: string;
  interestGrowthRatePct: number;
}

interface GlobalInterestBurden {
  totalInterestPaymentsTrillions: number;
  asShareOfGlobalGDPPct: number;
  fastestGrowingInterestBurden: InterestBurdenCountry[];
}

interface GlobalDebtClockData {
  globalAggregate: GlobalAggregate;
  sovereignDebtTable: SovereignDebtEntry[];
  debtSustainability: DebtSustainabilityIndicators[];
  debtGrowthTrajectory: DebtGrowthProjection[];
  debtComposition: DebtComposition[];
  globalInterestBurden: GlobalInterestBurden;
  generatedAt: string;
}

// --- Cache ---
let cachedData: GlobalDebtClockData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 5 minutes

// --- Helper ---
function jitter(rng: () => number, base: number, pct: number): number {
  return +(base * (1 + (rng() - 0.5) * 2 * pct)).toFixed(2);
}

function jitter1(rng: () => number, base: number, pct: number): number {
  return +(base * (1 + (rng() - 0.5) * 2 * pct)).toFixed(1);
}

// --- Data Generation ---
function generateData(): GlobalDebtClockData {
  const rng = seededRandom('global-debt-clock');

  // 1. Global Aggregate
  const totalGlobalDebtTrillions = jitter1(rng, 315, 0.02);
  const govDebtTrillions = jitter1(rng, 92, 0.02);
  const corporateDebtTrillions = jitter1(rng, 95, 0.02);
  const householdDebtTrillions = jitter1(rng, 58, 0.02);
  const financialDebtTrillions = jitter1(rng, 70, 0.02);
  const globalDebtToGDPPct = jitter1(rng, 335, 0.02);
  const yearOverYearChangeTrillions = jitter1(rng, 8.5, 0.15);

  const globalAggregate: GlobalAggregate = {
    totalGlobalDebtTrillions,
    govDebtTrillions,
    corporateDebtTrillions,
    householdDebtTrillions,
    financialDebtTrillions,
    globalDebtToGDPPct,
    yearOverYearChangeTrillions,
  };

  // 2. Sovereign Debt Table (20 countries)
  const countriesData: Array<{
    country: string;
    debtB: number;
    debtGDP: number;
    deficit: number;
    interestB: number;
    intRevPct: number;
    perCapita: number;
    rating: string;
    fiscal: 'surplus' | 'deficit';
    primaryBal: number;
  }> = [
    { country: 'United States', debtB: 35000, debtGDP: 123, deficit: 6.3, interestB: 1050, intRevPct: 22, perCapita: 103500, rating: 'AA+', fiscal: 'deficit', primaryBal: -3.1 },
    { country: 'China', debtB: 14000, debtGDP: 83, deficit: 7.1, interestB: 380, intRevPct: 12, perCapita: 9800, rating: 'A+', fiscal: 'deficit', primaryBal: -4.5 },
    { country: 'Japan', debtB: 9200, debtGDP: 255, deficit: 5.8, interestB: 175, intRevPct: 14, perCapita: 74000, rating: 'A+', fiscal: 'deficit', primaryBal: -3.2 },
    { country: 'United Kingdom', debtB: 3200, debtGDP: 101, deficit: 4.5, interestB: 120, intRevPct: 10, perCapita: 47000, rating: 'AA', fiscal: 'deficit', primaryBal: -1.8 },
    { country: 'France', debtB: 3300, debtGDP: 112, deficit: 5.5, interestB: 85, intRevPct: 7, perCapita: 49500, rating: 'AA-', fiscal: 'deficit', primaryBal: -3.0 },
    { country: 'Italy', debtB: 3100, debtGDP: 140, deficit: 5.3, interestB: 95, intRevPct: 9, perCapita: 52800, rating: 'BBB', fiscal: 'deficit', primaryBal: -1.5 },
    { country: 'Germany', debtB: 2800, debtGDP: 64, deficit: 2.1, interestB: 42, intRevPct: 4, perCapita: 33500, rating: 'AAA', fiscal: 'deficit', primaryBal: 0.3 },
    { country: 'Canada', debtB: 1800, debtGDP: 107, deficit: 1.4, interestB: 52, intRevPct: 9, perCapita: 46000, rating: 'AAA', fiscal: 'deficit', primaryBal: -0.2 },
    { country: 'India', debtB: 2500, debtGDP: 83, deficit: 6.4, interestB: 165, intRevPct: 28, perCapita: 1750, rating: 'BBB-', fiscal: 'deficit', primaryBal: -3.2 },
    { country: 'Brazil', debtB: 1700, debtGDP: 75, deficit: 7.1, interestB: 180, intRevPct: 25, perCapita: 7900, rating: 'BB', fiscal: 'deficit', primaryBal: -0.8 },
    { country: 'Spain', debtB: 1600, debtGDP: 107, deficit: 3.6, interestB: 38, intRevPct: 6, perCapita: 33500, rating: 'A', fiscal: 'deficit', primaryBal: -0.9 },
    { country: 'Australia', debtB: 700, debtGDP: 52, deficit: 1.8, interestB: 22, intRevPct: 5, perCapita: 26500, rating: 'AAA', fiscal: 'deficit', primaryBal: 0.1 },
    { country: 'South Korea', debtB: 900, debtGDP: 54, deficit: 2.6, interestB: 25, intRevPct: 6, perCapita: 17500, rating: 'AA', fiscal: 'deficit', primaryBal: -0.8 },
    { country: 'Mexico', debtB: 700, debtGDP: 46, deficit: 3.3, interestB: 48, intRevPct: 15, perCapita: 5300, rating: 'BBB', fiscal: 'deficit', primaryBal: -0.5 },
    { country: 'Indonesia', debtB: 500, debtGDP: 39, deficit: 2.3, interestB: 42, intRevPct: 18, perCapita: 1800, rating: 'BBB', fiscal: 'deficit', primaryBal: -0.6 },
    { country: 'Saudi Arabia', debtB: 300, debtGDP: 26, deficit: -2.1, interestB: 12, intRevPct: 4, perCapita: 8400, rating: 'A', fiscal: 'surplus', primaryBal: 2.5 },
    { country: 'Switzerland', debtB: 200, debtGDP: 28, deficit: 0.5, interestB: 3, intRevPct: 2, perCapita: 22800, rating: 'AAA', fiscal: 'surplus', primaryBal: 1.2 },
    { country: 'Singapore', debtB: 600, debtGDP: 168, deficit: -1.5, interestB: 8, intRevPct: 3, perCapita: 102000, rating: 'AAA', fiscal: 'surplus', primaryBal: 3.0 },
    { country: 'Greece', debtB: 400, debtGDP: 162, deficit: 1.6, interestB: 11, intRevPct: 7, perCapita: 38500, rating: 'BBB-', fiscal: 'deficit', primaryBal: 1.5 },
    { country: 'Argentina', debtB: 400, debtGDP: 90, deficit: 4.5, interestB: 28, intRevPct: 14, perCapita: 8600, rating: 'CCC+', fiscal: 'deficit', primaryBal: -1.2 },
  ];

  const sovereignDebtTable: SovereignDebtEntry[] = countriesData.map((c) => ({
    country: c.country,
    totalDebtBillions: jitter(rng, c.debtB, 0.015),
    debtToGDPPct: jitter1(rng, c.debtGDP, 0.015),
    annualDeficitPct: jitter1(rng, Math.abs(c.deficit), 0.08) * (c.deficit < 0 ? -1 : 1),
    interestPaymentsBillions: jitter(rng, c.interestB, 0.03),
    interestToRevenuePct: jitter1(rng, c.intRevPct, 0.04),
    debtPerCapitaUSD: Math.round(jitter(rng, c.perCapita, 0.015)),
    creditRating: c.rating,
    fiscalBalance: c.fiscal,
    primaryBalancePct: jitter1(rng, Math.abs(c.primaryBal), 0.08) * (c.primaryBal < 0 ? -1 : 1),
  }));

  // 3. Debt Sustainability Indicators (20 countries)
  const sustainabilityBase: Array<{
    country: string;
    fiscalSpace: number;
    rollover: number;
    maturity: number;
    foreignPct: number;
    effectiveRate: number;
  }> = [
    { country: 'United States', fiscalSpace: 6, rollover: 4, maturity: 6.2, foreignPct: 33, effectiveRate: 3.1 },
    { country: 'China', fiscalSpace: 7, rollover: 3, maturity: 5.8, foreignPct: 8, effectiveRate: 2.8 },
    { country: 'Japan', fiscalSpace: 3, rollover: 5, maturity: 8.5, foreignPct: 14, effectiveRate: 0.9 },
    { country: 'United Kingdom', fiscalSpace: 5, rollover: 4, maturity: 14.2, foreignPct: 30, effectiveRate: 3.6 },
    { country: 'France', fiscalSpace: 5, rollover: 4, maturity: 8.4, foreignPct: 53, effectiveRate: 2.5 },
    { country: 'Italy', fiscalSpace: 3, rollover: 6, maturity: 7.1, foreignPct: 28, effectiveRate: 3.2 },
    { country: 'Germany', fiscalSpace: 9, rollover: 2, maturity: 7.5, foreignPct: 48, effectiveRate: 1.5 },
    { country: 'Canada', fiscalSpace: 6, rollover: 3, maturity: 6.0, foreignPct: 25, effectiveRate: 2.9 },
    { country: 'India', fiscalSpace: 4, rollover: 5, maturity: 10.8, foreignPct: 4, effectiveRate: 7.1 },
    { country: 'Brazil', fiscalSpace: 3, rollover: 6, maturity: 4.1, foreignPct: 10, effectiveRate: 10.5 },
    { country: 'Spain', fiscalSpace: 5, rollover: 4, maturity: 7.9, foreignPct: 42, effectiveRate: 2.4 },
    { country: 'Australia', fiscalSpace: 8, rollover: 2, maturity: 6.8, foreignPct: 45, effectiveRate: 3.0 },
    { country: 'South Korea', fiscalSpace: 8, rollover: 2, maturity: 9.5, foreignPct: 18, effectiveRate: 2.7 },
    { country: 'Mexico', fiscalSpace: 5, rollover: 5, maturity: 7.8, foreignPct: 35, effectiveRate: 7.5 },
    { country: 'Indonesia', fiscalSpace: 6, rollover: 4, maturity: 8.2, foreignPct: 28, effectiveRate: 7.0 },
    { country: 'Saudi Arabia', fiscalSpace: 9, rollover: 2, maturity: 9.0, foreignPct: 45, effectiveRate: 3.8 },
    { country: 'Switzerland', fiscalSpace: 10, rollover: 1, maturity: 8.0, foreignPct: 30, effectiveRate: 1.2 },
    { country: 'Singapore', fiscalSpace: 10, rollover: 1, maturity: 10.5, foreignPct: 35, effectiveRate: 2.5 },
    { country: 'Greece', fiscalSpace: 3, rollover: 3, maturity: 20.2, foreignPct: 75, effectiveRate: 1.5 },
    { country: 'Argentina', fiscalSpace: 1, rollover: 9, maturity: 3.5, foreignPct: 55, effectiveRate: 18.0 },
  ];

  const debtSustainability: DebtSustainabilityIndicators[] = sustainabilityBase.map((s) => ({
    country: s.country,
    impliedFiscalSpace: Math.min(10, Math.max(1, Math.round(jitter(rng, s.fiscalSpace, 0.08)))),
    rolloverRiskIndex: Math.min(10, Math.max(1, Math.round(jitter(rng, s.rollover, 0.08)))),
    avgMaturityYears: jitter1(rng, s.maturity, 0.04),
    foreignHoldingPct: jitter1(rng, s.foreignPct, 0.04),
    interestRateOnDebtPct: jitter(rng, s.effectiveRate, 0.05),
  }));

  // 4. Debt Growth Trajectory (top 10 economies)
  const top10 = countriesData.slice(0, 10);
  const trajectoryBase: Record<string, number[]> = {
    'United States': [123, 127, 131, 135, 142],
    'China': [83, 87, 91, 95, 102],
    'Japan': [255, 252, 250, 248, 245],
    'United Kingdom': [101, 103, 105, 107, 110],
    'France': [112, 114, 116, 118, 121],
    'Italy': [140, 141, 142, 143, 144],
    'Germany': [64, 63, 62, 61, 60],
    'Canada': [107, 106, 105, 104, 102],
    'India': [83, 85, 86, 87, 89],
    'Brazil': [75, 78, 80, 82, 85],
  };

  const debtGrowthTrajectory: DebtGrowthProjection[] = top10.map((c) => {
    const proj = trajectoryBase[c.country] || [c.debtGDP, c.debtGDP + 2, c.debtGDP + 4, c.debtGDP + 6, c.debtGDP + 10];
    return {
      country: c.country,
      projected2025: jitter1(rng, proj[0], 0.01),
      projected2026: jitter1(rng, proj[1], 0.015),
      projected2027: jitter1(rng, proj[2], 0.02),
      projected2028: jitter1(rng, proj[3], 0.025),
      projected2030: jitter1(rng, proj[4], 0.03),
    };
  });

  // 5. Debt Composition (top 10 economies)
  const compositionBase: Record<string, { dom: number; short: number; fixed: number }> = {
    'United States': { dom: 67, short: 28, fixed: 82 },
    'China': { dom: 92, short: 22, fixed: 88 },
    'Japan': { dom: 86, short: 18, fixed: 95 },
    'United Kingdom': { dom: 70, short: 15, fixed: 80 },
    'France': { dom: 47, short: 12, fixed: 85 },
    'Italy': { dom: 72, short: 16, fixed: 83 },
    'Germany': { dom: 52, short: 10, fixed: 90 },
    'Canada': { dom: 75, short: 25, fixed: 78 },
    'India': { dom: 96, short: 14, fixed: 90 },
    'Brazil': { dom: 90, short: 30, fixed: 65 },
  };

  const debtComposition: DebtComposition[] = top10.map((c) => {
    const comp = compositionBase[c.country] || { dom: 70, short: 20, fixed: 80 };
    const dom = jitter1(rng, comp.dom, 0.02);
    const short = jitter1(rng, comp.short, 0.03);
    const fixed = jitter1(rng, comp.fixed, 0.02);
    return {
      country: c.country,
      domesticVsForeignPct: { domestic: dom, foreign: +(100 - dom).toFixed(1) },
      shortTermVsLongTermPct: { shortTerm: short, longTerm: +(100 - short).toFixed(1) },
      fixedVsFloatingPct: { fixed: fixed, floating: +(100 - fixed).toFixed(1) },
    };
  });

  // 6. Global Interest Burden
  const totalInterestPaymentsTrillions = jitter1(rng, 3.5, 0.03);
  const asShareOfGlobalGDPPct = jitter(rng, 3.7, 0.03);

  const interestBurdenCandidates: InterestBurdenCountry[] = [
    { country: 'United States', interestGrowthRatePct: jitter1(rng, 32, 0.1) },
    { country: 'United Kingdom', interestGrowthRatePct: jitter1(rng, 28, 0.1) },
    { country: 'Brazil', interestGrowthRatePct: jitter1(rng, 25, 0.1) },
    { country: 'India', interestGrowthRatePct: jitter1(rng, 22, 0.1) },
    { country: 'Italy', interestGrowthRatePct: jitter1(rng, 19, 0.1) },
  ];

  const globalInterestBurden: GlobalInterestBurden = {
    totalInterestPaymentsTrillions,
    asShareOfGlobalGDPPct,
    fastestGrowingInterestBurden: interestBurdenCandidates,
  };

  return {
    globalAggregate,
    sovereignDebtTable,
    debtSustainability,
    debtGrowthTrajectory,
    debtComposition,
    globalInterestBurden,
    generatedAt: new Date().toISOString(),
  };
}

function getData(): GlobalDebtClockData {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL) {
    return cachedData;
  }
  try {
    cachedData = generateData();
    cacheTimestamp = now;
  } catch {
    // stale fallback
    if (cachedData) return cachedData;
    throw new Error('Failed to generate global debt clock data');
  }
  return cachedData;
}

// --- Route ---
router.get('/', (_req, res) => {
  try {
    const data = getData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate global debt clock data' });
  }
});

export default router;
