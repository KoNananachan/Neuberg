import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; } return h >>> 0; }

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface BudgetBalance {
  current: number;
  previous: number;
  forecast: number;
}

interface DebtToGDP {
  current: number;
  previous: number;
  forecast: number;
  fiveYearTrend: number[];
}

interface TotalDebt {
  localCurrency: number;
  localCurrencyUnit: string;
  usd: number;
}

interface AnnualDeficit {
  absolute: number;
  percentGDP: number;
}

interface Revenue {
  total: number;
  taxRevenue: number;
  otherRevenue: number;
  yoyChange: number;
}

interface Expenditure {
  total: number;
  mandatory: number;
  discretionary: number;
  interestPayments: number;
  yoyChange: number;
}

interface InterestBurden {
  interestToRevenue: number;
  interestToGDP: number;
  avgCoupon: number;
  weightedMaturity: number;
}

interface IssuancePlan {
  totalPlanned: number;
  issued: number;
  remaining: number;
  netIssuance: number;
}

interface CreditRating {
  sp: string;
  moodys: string;
  fitch: string;
  outlook: string;
}

interface CountryFiscalDeficit {
  country: string;
  code: string;
  currency: string;
  budgetBalance: BudgetBalance;
  debtToGDP: DebtToGDP;
  totalDebt: TotalDebt;
  annualDeficit: AnnualDeficit;
  revenue: Revenue;
  expenditure: Expenditure;
  interestBurden: InterestBurden;
  issuancePlan: IssuancePlan;
  creditRating: CreditRating;
  fiscalRule: string;
}

interface SustainabilityScore {
  country: string;
  score: number;
  riskLevel: string;
}

interface UpcomingIssuanceEntry {
  country: string;
  type: string;
  amount: number;
  date: string;
  maturity: string;
}

interface GlobalDebtClock {
  totalGlobalDebt: number;
  globalDebtToGDP: number;
  changeThisYear: number;
}

interface FiscalDeficitResponse {
  countries: CountryFiscalDeficit[];
  globalDebtClock: GlobalDebtClock;
  sustainabilityScores: SustainabilityScore[];
  upcomingIssuance: UpcomingIssuanceEntry[];
  generatedAt: string;
}

// ── Seed Data ──

interface CountrySeed {
  country: string;
  code: string;
  currency: string;
  localCurrencyUnit: string;
  gdpUsd: number;
  budgetBalanceBase: number;
  debtToGDPBase: number;
  totalDebtLocal: number;
  usdPerLocal: number;
  revenueBase: number;
  taxRevenueShare: number;
  expenditureBase: number;
  mandatoryShare: number;
  discretionaryShare: number;
  interestShare: number;
  avgCouponBase: number;
  weightedMaturityBase: number;
  issuancePlannedBase: number;
  netIssuanceBase: number;
  sp: string;
  moodys: string;
  fitch: string;
  outlook: string;
  fiscalRule: string;
  sustainabilityBase: number;
}

const COUNTRY_SEEDS: CountrySeed[] = [
  {
    country: 'United States', code: 'US', currency: 'USD',
    localCurrencyUnit: 'T USD', gdpUsd: 29900,
    budgetBalanceBase: -6.2, debtToGDPBase: 124.1,
    totalDebtLocal: 36.8, usdPerLocal: 1.0,
    revenueBase: 4900, taxRevenueShare: 0.82, expenditureBase: 6750,
    mandatoryShare: 0.63, discretionaryShare: 0.22, interestShare: 0.15,
    avgCouponBase: 3.2, weightedMaturityBase: 6.1,
    issuancePlannedBase: 2800, netIssuanceBase: 1900,
    sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', outlook: 'Stable',
    fiscalRule: 'Statutory debt ceiling; no binding deficit rule',
    sustainabilityBase: 52,
  },
  {
    country: 'Eurozone', code: 'EZ', currency: 'EUR',
    localCurrencyUnit: 'T EUR', gdpUsd: 15200,
    budgetBalanceBase: -3.1, debtToGDPBase: 88.6,
    totalDebtLocal: 11.9, usdPerLocal: 1.12,
    revenueBase: 6100, taxRevenueShare: 0.86, expenditureBase: 6580,
    mandatoryShare: 0.58, discretionaryShare: 0.30, interestShare: 0.12,
    avgCouponBase: 2.1, weightedMaturityBase: 7.8,
    issuancePlannedBase: 1350, netIssuanceBase: 620,
    sp: 'AA', moodys: 'Aa2', fitch: 'AA', outlook: 'Stable',
    fiscalRule: 'SGP: 3% deficit limit, 60% debt-to-GDP target; reformed 2024 fiscal framework',
    sustainabilityBase: 64,
  },
  {
    country: 'Germany', code: 'DE', currency: 'EUR',
    localCurrencyUnit: 'T EUR', gdpUsd: 4580,
    budgetBalanceBase: -1.8, debtToGDPBase: 62.5,
    totalDebtLocal: 2.55, usdPerLocal: 1.12,
    revenueBase: 1830, taxRevenueShare: 0.87, expenditureBase: 1920,
    mandatoryShare: 0.56, discretionaryShare: 0.35, interestShare: 0.09,
    avgCouponBase: 1.6, weightedMaturityBase: 7.2,
    issuancePlannedBase: 480, netIssuanceBase: 185,
    sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', outlook: 'Stable',
    fiscalRule: 'Debt brake (Schuldenbremse): 0.35% GDP structural deficit limit; SGP rules',
    sustainabilityBase: 82,
  },
  {
    country: 'France', code: 'FR', currency: 'EUR',
    localCurrencyUnit: 'T EUR', gdpUsd: 3180,
    budgetBalanceBase: -5.3, debtToGDPBase: 113.7,
    totalDebtLocal: 3.22, usdPerLocal: 1.12,
    revenueBase: 1580, taxRevenueShare: 0.85, expenditureBase: 1750,
    mandatoryShare: 0.60, discretionaryShare: 0.27, interestShare: 0.13,
    avgCouponBase: 2.0, weightedMaturityBase: 8.4,
    issuancePlannedBase: 300, netIssuanceBase: 175,
    sp: 'AA-', moodys: 'Aa3', fitch: 'AA-', outlook: 'Negative',
    fiscalRule: 'EU SGP rules; HCFP oversight body; multi-year spending targets',
    sustainabilityBase: 55,
  },
  {
    country: 'United Kingdom', code: 'GB', currency: 'GBP',
    localCurrencyUnit: 'T GBP', gdpUsd: 3500,
    budgetBalanceBase: -4.5, debtToGDPBase: 101.8,
    totalDebtLocal: 2.75, usdPerLocal: 1.28,
    revenueBase: 1120, taxRevenueShare: 0.84, expenditureBase: 1290,
    mandatoryShare: 0.55, discretionaryShare: 0.32, interestShare: 0.13,
    avgCouponBase: 3.1, weightedMaturityBase: 14.2,
    issuancePlannedBase: 265, netIssuanceBase: 145,
    sp: 'AA', moodys: 'Aa3', fitch: 'AA-', outlook: 'Stable',
    fiscalRule: 'Charter for Budget Responsibility: debt falling as % GDP in 5 years; borrowing <3% GDP',
    sustainabilityBase: 58,
  },
  {
    country: 'Japan', code: 'JP', currency: 'JPY',
    localCurrencyUnit: 'Q JPY', gdpUsd: 4380,
    budgetBalanceBase: -5.4, debtToGDPBase: 252.4,
    totalDebtLocal: 1286, usdPerLocal: 0.00667,
    revenueBase: 760, taxRevenueShare: 0.88, expenditureBase: 1000,
    mandatoryShare: 0.54, discretionaryShare: 0.26, interestShare: 0.20,
    avgCouponBase: 0.9, weightedMaturityBase: 9.3,
    issuancePlannedBase: 340, netIssuanceBase: 160,
    sp: 'A+', moodys: 'A1', fitch: 'A', outlook: 'Stable',
    fiscalRule: 'Primary balance target; no constitutional debt brake; FY2025 surplus goal deferred',
    sustainabilityBase: 38,
  },
  {
    country: 'China', code: 'CN', currency: 'CNY',
    localCurrencyUnit: 'T CNY', gdpUsd: 19800,
    budgetBalanceBase: -7.6, debtToGDPBase: 83.6,
    totalDebtLocal: 118, usdPerLocal: 0.138,
    revenueBase: 3200, taxRevenueShare: 0.80, expenditureBase: 3950,
    mandatoryShare: 0.48, discretionaryShare: 0.40, interestShare: 0.12,
    avgCouponBase: 2.8, weightedMaturityBase: 5.8,
    issuancePlannedBase: 820, netIssuanceBase: 520,
    sp: 'A+', moodys: 'A1', fitch: 'A+', outlook: 'Stable',
    fiscalRule: 'Budget Law: 3% official deficit target; LGFV debt not counted in headline',
    sustainabilityBase: 48,
  },
  {
    country: 'India', code: 'IN', currency: 'INR',
    localCurrencyUnit: 'T INR', gdpUsd: 4180,
    budgetBalanceBase: -5.6, debtToGDPBase: 82.8,
    totalDebtLocal: 295, usdPerLocal: 0.0119,
    revenueBase: 690, taxRevenueShare: 0.78, expenditureBase: 930,
    mandatoryShare: 0.50, discretionaryShare: 0.28, interestShare: 0.22,
    avgCouponBase: 7.1, weightedMaturityBase: 11.5,
    issuancePlannedBase: 210, netIssuanceBase: 140,
    sp: 'BBB-', moodys: 'Baa3', fitch: 'BBB-', outlook: 'Stable',
    fiscalRule: 'FRBM Act: 3% deficit target and 40% debt-to-GDP target for central government',
    sustainabilityBase: 45,
  },
  {
    country: 'Brazil', code: 'BR', currency: 'BRL',
    localCurrencyUnit: 'T BRL', gdpUsd: 2280,
    budgetBalanceBase: -7.8, debtToGDPBase: 87.6,
    totalDebtLocal: 10.2, usdPerLocal: 0.175,
    revenueBase: 620, taxRevenueShare: 0.81, expenditureBase: 800,
    mandatoryShare: 0.62, discretionaryShare: 0.15, interestShare: 0.23,
    avgCouponBase: 11.4, weightedMaturityBase: 4.2,
    issuancePlannedBase: 195, netIssuanceBase: 110,
    sp: 'BB', moodys: 'Ba2', fitch: 'BB', outlook: 'Positive',
    fiscalRule: 'Fiscal framework: real expenditure growth capped at 2.5% per year; primary surplus target',
    sustainabilityBase: 36,
  },
  {
    country: 'Canada', code: 'CA', currency: 'CAD',
    localCurrencyUnit: 'T CAD', gdpUsd: 2280,
    budgetBalanceBase: -1.3, debtToGDPBase: 105.2,
    totalDebtLocal: 3.28, usdPerLocal: 0.73,
    revenueBase: 830, taxRevenueShare: 0.85, expenditureBase: 870,
    mandatoryShare: 0.54, discretionaryShare: 0.37, interestShare: 0.09,
    avgCouponBase: 2.6, weightedMaturityBase: 6.8,
    issuancePlannedBase: 170, netIssuanceBase: 65,
    sp: 'AAA', moodys: 'Aaa', fitch: 'AA+', outlook: 'Stable',
    fiscalRule: 'Fiscal anchor: declining debt-to-GDP ratio; no constitutional rule',
    sustainabilityBase: 72,
  },
  {
    country: 'Italy', code: 'IT', currency: 'EUR',
    localCurrencyUnit: 'T EUR', gdpUsd: 2330,
    budgetBalanceBase: -4.4, debtToGDPBase: 139.8,
    totalDebtLocal: 2.92, usdPerLocal: 1.12,
    revenueBase: 1050, taxRevenueShare: 0.87, expenditureBase: 1145,
    mandatoryShare: 0.58, discretionaryShare: 0.24, interestShare: 0.18,
    avgCouponBase: 2.9, weightedMaturityBase: 7.1,
    issuancePlannedBase: 340, netIssuanceBase: 155,
    sp: 'BBB', moodys: 'Baa3', fitch: 'BBB', outlook: 'Stable',
    fiscalRule: 'EU SGP rules; constitutional balanced budget amendment (Art. 81); spending review process',
    sustainabilityBase: 42,
  },
  {
    country: 'Spain', code: 'ES', currency: 'EUR',
    localCurrencyUnit: 'T EUR', gdpUsd: 1700,
    budgetBalanceBase: -3.2, debtToGDPBase: 105.3,
    totalDebtLocal: 1.59, usdPerLocal: 1.12,
    revenueBase: 620, taxRevenueShare: 0.84, expenditureBase: 675,
    mandatoryShare: 0.56, discretionaryShare: 0.30, interestShare: 0.14,
    avgCouponBase: 2.2, weightedMaturityBase: 7.9,
    issuancePlannedBase: 260, netIssuanceBase: 85,
    sp: 'A', moodys: 'Baa1', fitch: 'A-', outlook: 'Positive',
    fiscalRule: 'Organic Stability Law: balanced budget rule for all levels of government; EU SGP',
    sustainabilityBase: 54,
  },
];

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pctRange: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pctRange);
}

function pickOne<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function futureDate(rng: () => number, daysAhead: number): string {
  const now = new Date();
  const offset = Math.floor(rng() * daysAhead) + 1;
  const d = new Date(now.getTime() + offset * 86400000);
  return d.toISOString().slice(0, 10);
}

function riskLevel(score: number): string {
  if (score >= 75) return 'Low';
  if (score >= 55) return 'Moderate';
  if (score >= 35) return 'Elevated';
  return 'High';
}

// ── Data Generation ──

function generateData(): FiscalDeficitResponse {
  const dateStr = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('fiscal-deficit-' + dateStr);
  const rng = mulberry32(seed);

  const countries: CountryFiscalDeficit[] = COUNTRY_SEEDS.map((s) => {
    // Budget balance (% GDP)
    const currentBalance = roundTo(jitter(rng, s.budgetBalanceBase, 0.06), 1);
    const previousBalance = roundTo(jitter(rng, s.budgetBalanceBase * 0.95, 0.05), 1);
    const forecastBalance = roundTo(jitter(rng, s.budgetBalanceBase * 0.92, 0.07), 1);

    // Debt-to-GDP
    const currentDebtGDP = roundTo(jitter(rng, s.debtToGDPBase, 0.02), 1);
    const previousDebtGDP = roundTo(currentDebtGDP - jitter(rng, 2.5, 0.3), 1);
    const forecastDebtGDP = roundTo(currentDebtGDP + jitter(rng, 1.8, 0.4), 1);
    const fiveYearTrend: number[] = [];
    for (let i = 4; i >= 0; i--) {
      fiveYearTrend.push(roundTo(currentDebtGDP - jitter(rng, i * 2.2, 0.3), 1));
    }

    // Total debt
    const totalDebtLocal = roundTo(jitter(rng, s.totalDebtLocal, 0.02), 2);
    const totalDebtUsd = roundTo(totalDebtLocal * s.usdPerLocal, 2);

    // Annual deficit
    const deficitPctGDP = roundTo(Math.abs(currentBalance), 1);
    const deficitAbsolute = roundTo((deficitPctGDP / 100) * s.gdpUsd, 1);

    // Revenue
    const totalRevenue = roundTo(jitter(rng, s.revenueBase, 0.04), 1);
    const taxRevenue = roundTo(totalRevenue * jitter(rng, s.taxRevenueShare, 0.02), 1);
    const otherRevenue = roundTo(totalRevenue - taxRevenue, 1);
    const revenueYoy = roundTo((rng() - 0.3) * 8, 1);

    // Expenditure
    const totalExpenditure = roundTo(jitter(rng, s.expenditureBase, 0.04), 1);
    const mandatory = roundTo(totalExpenditure * jitter(rng, s.mandatoryShare, 0.03), 1);
    const discretionary = roundTo(totalExpenditure * jitter(rng, s.discretionaryShare, 0.04), 1);
    const interestPayments = roundTo(totalExpenditure * jitter(rng, s.interestShare, 0.05), 1);
    const expenditureYoy = roundTo((rng() - 0.2) * 7, 1);

    // Interest burden
    const interestToRevenue = roundTo((interestPayments / totalRevenue) * 100, 1);
    const interestToGDP = roundTo((interestPayments / s.gdpUsd) * 100, 2);
    const avgCoupon = roundTo(jitter(rng, s.avgCouponBase, 0.06), 2);
    const weightedMaturity = roundTo(jitter(rng, s.weightedMaturityBase, 0.05), 1);

    // Issuance plan (billions USD)
    const totalPlanned = roundTo(jitter(rng, s.issuancePlannedBase, 0.04), 1);
    const progressPct = 0.15 + rng() * 0.25; // 15-40% progress through year
    const issued = roundTo(totalPlanned * progressPct, 1);
    const remaining = roundTo(totalPlanned - issued, 1);
    const netIssuance = roundTo(jitter(rng, s.netIssuanceBase, 0.06), 1);

    return {
      country: s.country,
      code: s.code,
      currency: s.currency,
      budgetBalance: { current: currentBalance, previous: previousBalance, forecast: forecastBalance },
      debtToGDP: { current: currentDebtGDP, previous: previousDebtGDP, forecast: forecastDebtGDP, fiveYearTrend },
      totalDebt: { localCurrency: totalDebtLocal, localCurrencyUnit: s.localCurrencyUnit, usd: totalDebtUsd },
      annualDeficit: { absolute: deficitAbsolute, percentGDP: deficitPctGDP },
      revenue: { total: totalRevenue, taxRevenue, otherRevenue, yoyChange: revenueYoy },
      expenditure: { total: totalExpenditure, mandatory, discretionary, interestPayments, yoyChange: expenditureYoy },
      interestBurden: { interestToRevenue, interestToGDP, avgCoupon, weightedMaturity },
      issuancePlan: { totalPlanned, issued, remaining, netIssuance },
      creditRating: { sp: s.sp, moodys: s.moodys, fitch: s.fitch, outlook: s.outlook },
      fiscalRule: s.fiscalRule,
    };
  });

  // Global Debt Clock
  const totalGlobalDebt = roundTo(jitter(rng, 315, 0.02), 1);
  const globalDebtToGDP = roundTo(jitter(rng, 336, 0.015), 1);
  const changeThisYear = roundTo(jitter(rng, 8.5, 0.15), 1);

  const globalDebtClock: GlobalDebtClock = {
    totalGlobalDebt,
    globalDebtToGDP,
    changeThisYear,
  };

  // Sustainability Scores
  const sustainabilityScores: SustainabilityScore[] = COUNTRY_SEEDS.map((s) => {
    const score = Math.min(100, Math.max(0, Math.round(jitter(rng, s.sustainabilityBase, 0.08))));
    return {
      country: s.country,
      score,
      riskLevel: riskLevel(score),
    };
  });

  // Upcoming Issuance (next 30 days)
  const issuanceTypes = ['Treasury Bond', 'Treasury Note', 'Treasury Bill', 'Inflation-Linked Bond', 'Green Bond', 'Bund', 'OAT', 'BTP', 'JGB', 'Gilt'];
  const maturities = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];

  const upcomingIssuance: UpcomingIssuanceEntry[] = [];
  const issuanceCountries = ['United States', 'Germany', 'France', 'United Kingdom', 'Japan', 'Italy', 'Spain', 'Canada', 'India', 'Brazil'];
  for (let i = 0; i < 15; i++) {
    const ctry = pickOne(rng, issuanceCountries);
    const typeForCountry = ctry === 'Germany' ? 'Bund' :
      ctry === 'France' ? 'OAT' :
      ctry === 'Italy' ? 'BTP' :
      ctry === 'Japan' ? 'JGB' :
      ctry === 'United Kingdom' ? 'Gilt' :
      pickOne(rng, ['Treasury Bond', 'Treasury Note', 'Treasury Bill', 'Inflation-Linked Bond']);
    upcomingIssuance.push({
      country: ctry,
      type: typeForCountry,
      amount: roundTo(jitter(rng, 18, 0.6), 1),
      date: futureDate(rng, 30),
      maturity: pickOne(rng, maturities),
    });
  }
  upcomingIssuance.sort((a, b) => a.date.localeCompare(b.date));

  return {
    countries,
    globalDebtClock,
    sustainabilityScores,
    upcomingIssuance,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }

    const data = generateData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    console.error('[FiscalDeficit] Error:', (err as Error)?.message);
    if (cache) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate fiscal deficit data' });
  }
});

export default router;
