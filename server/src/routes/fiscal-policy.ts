import { Router } from 'express';

const router = Router();

// ── PRNG (deterministic daily) ──

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Types ──

interface CountryFiscalData {
  country: string;
  isoCode: string;
  debtToGdp: number;
  fiscalBalance: number;
  primaryBalance: number;
  interestPayments: number;
  govtSpending: number;
  taxRevenue: number;
  debtRating: string;
  outlook: 'STABLE' | 'POSITIVE' | 'NEGATIVE';
}

interface FiscalEvent {
  country: string;
  event: string;
  date: string;
  expectedImpact: number;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface DebtSustainability {
  country: string;
  debtToGdp: number;
  impliedGrowthRate: number;
  effectiveInterestRate: number;
  primaryBalanceNeeded: number;
  yearsToTarget: number;
  sustainabilityScore: number;
}

interface FiscalPolicySummary {
  avgG7DebtToGdp: number;
  avgEmDebtToGdp: number;
  highestDeficit: string;
  mostFiscalSpace: string;
  timestamp: string;
}

interface FiscalPolicyResponse {
  countryFiscalData: CountryFiscalData[];
  fiscalEvents: FiscalEvent[];
  debtSustainability: DebtSustainability[];
  summary: FiscalPolicySummary;
}

// ── Seed Data: 15 major economies ──

interface FiscalSeed {
  country: string;
  isoCode: string;
  baseDebtToGdp: number;
  baseFiscalBalance: number;
  basePrimaryBalance: number;
  baseInterestPayments: number;
  baseGovtSpending: number;
  baseTaxRevenue: number;
  debtRating: string;
  outlookWeights: [number, number, number]; // [STABLE, POSITIVE, NEGATIVE] cumulative thresholds
}

const FISCAL_SEEDS: FiscalSeed[] = [
  { country: 'United States',  isoCode: 'US', baseDebtToGdp: 123.3, baseFiscalBalance: -6.3,  basePrimaryBalance: -3.1,  baseInterestPayments: 3.2, baseGovtSpending: 36.2, baseTaxRevenue: 29.9, debtRating: 'AA+', outlookWeights: [0.55, 0.65, 1.0] },
  { country: 'China',          isoCode: 'CN', baseDebtToGdp: 83.6,  baseFiscalBalance: -7.1,  basePrimaryBalance: -5.8,  baseInterestPayments: 1.3, baseGovtSpending: 33.4, baseTaxRevenue: 26.3, debtRating: 'A+',  outlookWeights: [0.50, 0.55, 1.0] },
  { country: 'Japan',          isoCode: 'JP', baseDebtToGdp: 255.2, baseFiscalBalance: -5.6,  basePrimaryBalance: -3.4,  baseInterestPayments: 2.2, baseGovtSpending: 44.1, baseTaxRevenue: 38.5, debtRating: 'A+',  outlookWeights: [0.60, 0.65, 1.0] },
  { country: 'Germany',        isoCode: 'DE', baseDebtToGdp: 63.7,  baseFiscalBalance: -1.6,  basePrimaryBalance: -0.4,  baseInterestPayments: 1.2, baseGovtSpending: 48.6, baseTaxRevenue: 47.0, debtRating: 'AAA', outlookWeights: [0.70, 0.85, 1.0] },
  { country: 'United Kingdom', isoCode: 'GB', baseDebtToGdp: 101.4, baseFiscalBalance: -4.4,  basePrimaryBalance: -1.2,  baseInterestPayments: 3.2, baseGovtSpending: 44.8, baseTaxRevenue: 40.4, debtRating: 'AA',  outlookWeights: [0.55, 0.65, 1.0] },
  { country: 'France',         isoCode: 'FR', baseDebtToGdp: 112.9, baseFiscalBalance: -5.5,  basePrimaryBalance: -3.6,  baseInterestPayments: 1.9, baseGovtSpending: 57.3, baseTaxRevenue: 51.8, debtRating: 'AA-', outlookWeights: [0.50, 0.55, 1.0] },
  { country: 'India',          isoCode: 'IN', baseDebtToGdp: 83.2,  baseFiscalBalance: -8.9,  basePrimaryBalance: -4.5,  baseInterestPayments: 4.4, baseGovtSpending: 28.5, baseTaxRevenue: 19.6, debtRating: 'BBB-',outlookWeights: [0.45, 0.65, 1.0] },
  { country: 'Italy',          isoCode: 'IT', baseDebtToGdp: 140.6, baseFiscalBalance: -7.2,  basePrimaryBalance: -3.4,  baseInterestPayments: 3.8, baseGovtSpending: 56.7, baseTaxRevenue: 49.5, debtRating: 'BBB', outlookWeights: [0.55, 0.60, 1.0] },
  { country: 'Brazil',         isoCode: 'BR', baseDebtToGdp: 87.3,  baseFiscalBalance: -7.9,  basePrimaryBalance: -1.1,  baseInterestPayments: 6.8, baseGovtSpending: 38.6, baseTaxRevenue: 30.7, debtRating: 'BB',  outlookWeights: [0.50, 0.60, 1.0] },
  { country: 'Canada',         isoCode: 'CA', baseDebtToGdp: 106.4, baseFiscalBalance: -1.4,  basePrimaryBalance: 0.5,   baseInterestPayments: 1.9, baseGovtSpending: 41.9, baseTaxRevenue: 40.5, debtRating: 'AAA', outlookWeights: [0.65, 0.80, 1.0] },
  { country: 'South Korea',    isoCode: 'KR', baseDebtToGdp: 54.3,  baseFiscalBalance: -2.6,  basePrimaryBalance: -1.5,  baseInterestPayments: 1.1, baseGovtSpending: 28.2, baseTaxRevenue: 25.6, debtRating: 'AA',  outlookWeights: [0.65, 0.80, 1.0] },
  { country: 'Australia',      isoCode: 'AU', baseDebtToGdp: 51.8,  baseFiscalBalance: -1.9,  basePrimaryBalance: -0.7,  baseInterestPayments: 1.2, baseGovtSpending: 37.6, baseTaxRevenue: 35.7, debtRating: 'AAA', outlookWeights: [0.70, 0.85, 1.0] },
  { country: 'Spain',          isoCode: 'ES', baseDebtToGdp: 107.5, baseFiscalBalance: -3.6,  basePrimaryBalance: -1.3,  baseInterestPayments: 2.3, baseGovtSpending: 47.8, baseTaxRevenue: 44.2, debtRating: 'A',   outlookWeights: [0.55, 0.70, 1.0] },
  { country: 'Mexico',         isoCode: 'MX', baseDebtToGdp: 57.4,  baseFiscalBalance: -4.3,  basePrimaryBalance: -0.8,  baseInterestPayments: 3.5, baseGovtSpending: 27.1, baseTaxRevenue: 22.8, debtRating: 'BBB', outlookWeights: [0.45, 0.50, 1.0] },
  { country: 'Indonesia',      isoCode: 'ID', baseDebtToGdp: 39.2,  baseFiscalBalance: -2.3,  basePrimaryBalance: -0.5,  baseInterestPayments: 1.8, baseGovtSpending: 17.2, baseTaxRevenue: 14.9, debtRating: 'BBB', outlookWeights: [0.50, 0.70, 1.0] },
];

// ── Fiscal Event Seeds ──

interface FiscalEventSeed {
  country: string;
  event: string;
  dayOffset: [number, number];
  baseImpact: number;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

const FISCAL_EVENT_SEEDS: FiscalEventSeed[] = [
  { country: 'United States',  event: 'Debt Ceiling Vote',                dayOffset: [5, 30],  baseImpact: 1.2,  significance: 'HIGH' },
  { country: 'United States',  event: 'Federal Budget Release',           dayOffset: [10, 45], baseImpact: 0.8,  significance: 'HIGH' },
  { country: 'China',          event: 'Fiscal Stimulus Package',          dayOffset: [3, 20],  baseImpact: 2.1,  significance: 'HIGH' },
  { country: 'Japan',          event: 'Supplementary Budget Announcement',dayOffset: [7, 35],  baseImpact: 1.5,  significance: 'HIGH' },
  { country: 'Germany',        event: 'Debt Brake Reform Vote',           dayOffset: [12, 40], baseImpact: 0.6,  significance: 'MEDIUM' },
  { country: 'United Kingdom', event: 'Autumn Budget Statement',          dayOffset: [8, 28],  baseImpact: 0.9,  significance: 'HIGH' },
  { country: 'France',         event: 'Budget Bill Vote',                 dayOffset: [6, 25],  baseImpact: 0.7,  significance: 'MEDIUM' },
  { country: 'India',          event: 'Union Budget Release',             dayOffset: [15, 50], baseImpact: 1.8,  significance: 'HIGH' },
  { country: 'Italy',          event: 'Stability Programme Update',       dayOffset: [10, 38], baseImpact: 0.5,  significance: 'MEDIUM' },
  { country: 'Brazil',         event: 'Fiscal Framework Review',          dayOffset: [8, 32],  baseImpact: 1.0,  significance: 'MEDIUM' },
  { country: 'South Korea',    event: 'Tax Reform Package',               dayOffset: [5, 22],  baseImpact: 0.4,  significance: 'LOW' },
  { country: 'Mexico',         event: 'Revenue Law Amendment',            dayOffset: [12, 42], baseImpact: 0.6,  significance: 'MEDIUM' },
  { country: 'Indonesia',      event: 'State Budget Revision',            dayOffset: [9, 30],  baseImpact: 0.3,  significance: 'LOW' },
  { country: 'Australia',      event: 'Federal Budget Release',           dayOffset: [14, 48], baseImpact: 0.5,  significance: 'MEDIUM' },
];

// ── Debt Sustainability Seeds (10 countries) ──

interface DebtSustSeed {
  country: string;
  baseDebtToGdp: number;
  baseGrowthRate: number;
  baseEffectiveRate: number;
  basePbNeeded: number;
  baseYearsToTarget: number;
  baseSustScore: number;
}

const DEBT_SUST_SEEDS: DebtSustSeed[] = [
  { country: 'United States',  baseDebtToGdp: 123.3, baseGrowthRate: 2.1, baseEffectiveRate: 3.2, basePbNeeded: 1.4,  baseYearsToTarget: 22, baseSustScore: 58 },
  { country: 'Japan',          baseDebtToGdp: 255.2, baseGrowthRate: 0.8, baseEffectiveRate: 0.9, basePbNeeded: 0.3,  baseYearsToTarget: 45, baseSustScore: 35 },
  { country: 'Italy',          baseDebtToGdp: 140.6, baseGrowthRate: 0.7, baseEffectiveRate: 3.4, basePbNeeded: 3.8,  baseYearsToTarget: 30, baseSustScore: 38 },
  { country: 'France',         baseDebtToGdp: 112.9, baseGrowthRate: 1.1, baseEffectiveRate: 2.8, basePbNeeded: 1.9,  baseYearsToTarget: 25, baseSustScore: 45 },
  { country: 'United Kingdom', baseDebtToGdp: 101.4, baseGrowthRate: 1.3, baseEffectiveRate: 3.6, basePbNeeded: 2.3,  baseYearsToTarget: 20, baseSustScore: 50 },
  { country: 'India',          baseDebtToGdp: 83.2,  baseGrowthRate: 6.5, baseEffectiveRate: 7.1, basePbNeeded: 0.5,  baseYearsToTarget: 12, baseSustScore: 62 },
  { country: 'Brazil',         baseDebtToGdp: 87.3,  baseGrowthRate: 1.8, baseEffectiveRate: 9.4, basePbNeeded: 6.6,  baseYearsToTarget: 28, baseSustScore: 32 },
  { country: 'China',          baseDebtToGdp: 83.6,  baseGrowthRate: 4.6, baseEffectiveRate: 2.8, basePbNeeded: -1.5, baseYearsToTarget: 10, baseSustScore: 68 },
  { country: 'Spain',          baseDebtToGdp: 107.5, baseGrowthRate: 2.0, baseEffectiveRate: 2.9, basePbNeeded: 1.0,  baseYearsToTarget: 18, baseSustScore: 52 },
  { country: 'Mexico',         baseDebtToGdp: 57.4,  baseGrowthRate: 2.0, baseEffectiveRate: 8.2, basePbNeeded: 3.6,  baseYearsToTarget: 15, baseSustScore: 55 },
];

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyVariation(base: number, rng: () => number, pctRange: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pctRange);
}

// ── Data Generation ──

function generateCountryFiscalData(rng: () => number): CountryFiscalData[] {
  return FISCAL_SEEDS.map((seed) => {
    const debtToGdp = roundTo(applyVariation(seed.baseDebtToGdp, rng, 0.03), 1);
    const fiscalBalance = roundTo(applyVariation(seed.baseFiscalBalance, rng, 0.08), 1);
    const primaryBalance = roundTo(applyVariation(seed.basePrimaryBalance, rng, 0.10), 1);
    const interestPayments = roundTo(applyVariation(seed.baseInterestPayments, rng, 0.05), 1);
    const govtSpending = roundTo(applyVariation(seed.baseGovtSpending, rng, 0.03), 1);
    const taxRevenue = roundTo(applyVariation(seed.baseTaxRevenue, rng, 0.03), 1);

    const outlookRoll = rng();
    let outlook: 'STABLE' | 'POSITIVE' | 'NEGATIVE';
    if (outlookRoll < seed.outlookWeights[0]) {
      outlook = 'STABLE';
    } else if (outlookRoll < seed.outlookWeights[1]) {
      outlook = 'POSITIVE';
    } else {
      outlook = 'NEGATIVE';
    }

    return {
      country: seed.country,
      isoCode: seed.isoCode,
      debtToGdp,
      fiscalBalance,
      primaryBalance,
      interestPayments,
      govtSpending,
      taxRevenue,
      debtRating: seed.debtRating,
      outlook,
    };
  });
}

function generateFiscalEvents(rng: () => number): FiscalEvent[] {
  // Shuffle and pick 8 events
  const shuffled = [...FISCAL_EVENT_SEEDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, 8);

  const today = new Date();
  return selected.map((seed) => {
    const daysOut = seed.dayOffset[0] + Math.floor(rng() * (seed.dayOffset[1] - seed.dayOffset[0]));
    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() + daysOut);

    const expectedImpact = roundTo(applyVariation(seed.baseImpact, rng, 0.15), 1);

    return {
      country: seed.country,
      event: seed.event,
      date: eventDate.toISOString().slice(0, 10),
      expectedImpact,
      significance: seed.significance,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function generateDebtSustainability(rng: () => number): DebtSustainability[] {
  return DEBT_SUST_SEEDS.map((seed) => {
    const debtToGdp = roundTo(applyVariation(seed.baseDebtToGdp, rng, 0.03), 1);
    const impliedGrowthRate = roundTo(applyVariation(seed.baseGrowthRate, rng, 0.10), 1);
    const effectiveInterestRate = roundTo(applyVariation(seed.baseEffectiveRate, rng, 0.06), 1);
    const primaryBalanceNeeded = roundTo(applyVariation(seed.basePbNeeded, rng, 0.08), 1);
    const yearsToTarget = clamp(Math.round(applyVariation(seed.baseYearsToTarget, rng, 0.12)), 3, 60);
    const sustainabilityScore = clamp(Math.round(applyVariation(seed.baseSustScore, rng, 0.06)), 0, 100);

    return {
      country: seed.country,
      debtToGdp,
      impliedGrowthRate,
      effectiveInterestRate,
      primaryBalanceNeeded,
      yearsToTarget,
      sustainabilityScore,
    };
  });
}

function generateSummary(
  fiscalData: CountryFiscalData[],
): FiscalPolicySummary {
  // G7: US, JP, DE, GB, FR, IT, CA
  const g7Codes = new Set(['US', 'JP', 'DE', 'GB', 'FR', 'IT', 'CA']);
  const emCodes = new Set(['CN', 'IN', 'BR', 'MX', 'ID']);

  const g7Data = fiscalData.filter((d) => g7Codes.has(d.isoCode));
  const emData = fiscalData.filter((d) => emCodes.has(d.isoCode));

  const avgG7DebtToGdp = roundTo(
    g7Data.reduce((sum, d) => sum + d.debtToGdp, 0) / g7Data.length,
    1,
  );
  const avgEmDebtToGdp = roundTo(
    emData.reduce((sum, d) => sum + d.debtToGdp, 0) / emData.length,
    1,
  );

  // Highest deficit = most negative fiscal balance
  const worstDeficit = fiscalData.reduce((worst, d) =>
    d.fiscalBalance < worst.fiscalBalance ? d : worst,
  );

  // Most fiscal space = lowest debt-to-GDP among all
  const bestFiscalSpace = fiscalData.reduce((best, d) =>
    d.debtToGdp < best.debtToGdp ? d : best,
  );

  return {
    avgG7DebtToGdp,
    avgEmDebtToGdp,
    highestDeficit: worstDeficit.country,
    mostFiscalSpace: bestFiscalSpace.country,
    timestamp: new Date().toISOString(),
  };
}

function generateFiscalPolicyData(): FiscalPolicyResponse {
  const rng = seededRandom('fiscal-policy');
  const countryFiscalData = generateCountryFiscalData(rng);
  const fiscalEvents = generateFiscalEvents(rng);
  const debtSustainability = generateDebtSustainability(rng);
  const summary = generateSummary(countryFiscalData);

  return { countryFiscalData, fiscalEvents, debtSustainability, summary };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: FiscalPolicyResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateFiscalPolicyData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FiscalPolicy] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch fiscal policy data' });
  }
});

export default router;
