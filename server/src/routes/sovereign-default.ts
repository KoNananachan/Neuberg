import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── TypeScript Interfaces ──

type RiskTier = 'investment-grade' | 'speculative' | 'distressed' | 'default';

type EventType = 'downgrade' | 'default' | 'restructuring' | 'imf-program' | 'rating-change' | 'debt-swap';

interface GlobalOverview {
  sovereignsInDistress: number;
  totalDistressedDebtBillions: number;
  averageRecoveryRate: number;
  imfProgramsActive: number;
  debtRestructuringsInProgress: number;
}

interface DebtSustainability {
  primaryBalancePctGDP: number;
  interestPaymentsPctRevenue: number;
  rolloverRiskIndex: number;
  accessToCapitalMarkets: boolean;
}

interface CountryRisk {
  country: string;
  region: string;
  creditRating: string;
  cdsSpreadBps: number;
  debtToGDP: number;
  externalDebtBillions: number;
  fxReservesBillions: number;
  fxReservesCoverMonths: number;
  defaultProbability1Y: number;
  defaultProbability5Y: number;
  riskTier: RiskTier;
  debtSustainability: DebtSustainability;
}

interface SovereignEvent {
  date: string;
  country: string;
  eventType: EventType;
  description: string;
  marketImpact: string;
}

interface ContagionPair {
  countryA: string;
  countryB: string;
  correlationScore: number;
}

interface SovereignDefaultResponse {
  timestamp: string;
  globalOverview: GlobalOverview;
  countryRiskTable: CountryRisk[];
  recentSovereignEvents: SovereignEvent[];
  contagionRiskMatrix: ContagionPair[];
}

// ── Country Seed Data (realistic 2024/2025 metrics) ──

interface CountrySeed {
  country: string;
  region: string;
  creditRating: string;
  baseCdsBps: number;
  debtToGDP: number;
  externalDebtBillions: number;
  fxReservesBillions: number;
  fxReservesCoverMonths: number;
  riskTier: RiskTier;
  primaryBalancePctGDP: number;
  interestPaymentsPctRevenue: number;
  rolloverRiskIndex: number;
  accessToCapitalMarkets: boolean;
}

const COUNTRY_SEEDS: CountrySeed[] = [
  {
    country: 'Argentina', region: 'Latin America', creditRating: 'CCC-',
    baseCdsBps: 1850, debtToGDP: 89, externalDebtBillions: 275,
    fxReservesBillions: 21.5, fxReservesCoverMonths: 3.2,
    riskTier: 'distressed',
    primaryBalancePctGDP: -1.8, interestPaymentsPctRevenue: 18.2,
    rolloverRiskIndex: 8, accessToCapitalMarkets: false,
  },
  {
    country: 'Pakistan', region: 'South Asia', creditRating: 'CCC+',
    baseCdsBps: 980, debtToGDP: 78, externalDebtBillions: 130,
    fxReservesBillions: 9.1, fxReservesCoverMonths: 1.8,
    riskTier: 'distressed',
    primaryBalancePctGDP: -1.2, interestPaymentsPctRevenue: 42.5,
    rolloverRiskIndex: 7, accessToCapitalMarkets: false,
  },
  {
    country: 'Sri Lanka', region: 'South Asia', creditRating: 'SD',
    baseCdsBps: 4200, debtToGDP: 115, externalDebtBillions: 56,
    fxReservesBillions: 4.4, fxReservesCoverMonths: 2.5,
    riskTier: 'default',
    primaryBalancePctGDP: 0.5, interestPaymentsPctRevenue: 68.0,
    rolloverRiskIndex: 10, accessToCapitalMarkets: false,
  },
  {
    country: 'Ghana', region: 'Sub-Saharan Africa', creditRating: 'SD',
    baseCdsBps: 3800, debtToGDP: 88, externalDebtBillions: 29,
    fxReservesBillions: 5.8, fxReservesCoverMonths: 2.8,
    riskTier: 'default',
    primaryBalancePctGDP: -0.4, interestPaymentsPctRevenue: 52.0,
    rolloverRiskIndex: 9, accessToCapitalMarkets: false,
  },
  {
    country: 'Egypt', region: 'Middle East & North Africa', creditRating: 'B-',
    baseCdsBps: 520, debtToGDP: 92, externalDebtBillions: 165,
    fxReservesBillions: 35.2, fxReservesCoverMonths: 4.5,
    riskTier: 'speculative',
    primaryBalancePctGDP: 1.5, interestPaymentsPctRevenue: 38.0,
    rolloverRiskIndex: 6, accessToCapitalMarkets: true,
  },
  {
    country: 'Turkey', region: 'Europe / Middle East', creditRating: 'B+',
    baseCdsBps: 320, debtToGDP: 35, externalDebtBillions: 476,
    fxReservesBillions: 98.5, fxReservesCoverMonths: 4.8,
    riskTier: 'speculative',
    primaryBalancePctGDP: -2.8, interestPaymentsPctRevenue: 11.8,
    rolloverRiskIndex: 5, accessToCapitalMarkets: true,
  },
  {
    country: 'Nigeria', region: 'Sub-Saharan Africa', creditRating: 'B-',
    baseCdsBps: 480, debtToGDP: 42, externalDebtBillions: 43,
    fxReservesBillions: 33.0, fxReservesCoverMonths: 5.2,
    riskTier: 'speculative',
    primaryBalancePctGDP: -4.2, interestPaymentsPctRevenue: 35.0,
    rolloverRiskIndex: 5, accessToCapitalMarkets: true,
  },
  {
    country: 'Ukraine', region: 'Eastern Europe', creditRating: 'CC',
    baseCdsBps: 3500, debtToGDP: 95, externalDebtBillions: 132,
    fxReservesBillions: 40.5, fxReservesCoverMonths: 5.5,
    riskTier: 'distressed',
    primaryBalancePctGDP: -12.0, interestPaymentsPctRevenue: 15.0,
    rolloverRiskIndex: 9, accessToCapitalMarkets: false,
  },
  {
    country: 'Lebanon', region: 'Middle East & North Africa', creditRating: 'D',
    baseCdsBps: 9500, debtToGDP: 280, externalDebtBillions: 33,
    fxReservesBillions: 10.2, fxReservesCoverMonths: 8.5,
    riskTier: 'default',
    primaryBalancePctGDP: -3.5, interestPaymentsPctRevenue: 55.0,
    rolloverRiskIndex: 10, accessToCapitalMarkets: false,
  },
  {
    country: 'Ecuador', region: 'Latin America', creditRating: 'B-',
    baseCdsBps: 650, debtToGDP: 58, externalDebtBillions: 48,
    fxReservesBillions: 4.8, fxReservesCoverMonths: 2.0,
    riskTier: 'speculative',
    primaryBalancePctGDP: -2.0, interestPaymentsPctRevenue: 22.0,
    rolloverRiskIndex: 6, accessToCapitalMarkets: true,
  },
  {
    country: 'El Salvador', region: 'Central America', creditRating: 'CCC+',
    baseCdsBps: 720, debtToGDP: 77, externalDebtBillions: 21,
    fxReservesBillions: 3.1, fxReservesCoverMonths: 2.8,
    riskTier: 'distressed',
    primaryBalancePctGDP: -2.5, interestPaymentsPctRevenue: 20.0,
    rolloverRiskIndex: 7, accessToCapitalMarkets: false,
  },
  {
    country: 'Kenya', region: 'Sub-Saharan Africa', creditRating: 'B',
    baseCdsBps: 420, debtToGDP: 70, externalDebtBillions: 38,
    fxReservesBillions: 7.2, fxReservesCoverMonths: 3.8,
    riskTier: 'speculative',
    primaryBalancePctGDP: -3.0, interestPaymentsPctRevenue: 28.0,
    rolloverRiskIndex: 5, accessToCapitalMarkets: true,
  },
  {
    country: 'Tunisia', region: 'Middle East & North Africa', creditRating: 'CCC+',
    baseCdsBps: 880, debtToGDP: 82, externalDebtBillions: 39,
    fxReservesBillions: 8.5, fxReservesCoverMonths: 3.5,
    riskTier: 'distressed',
    primaryBalancePctGDP: -3.2, interestPaymentsPctRevenue: 25.0,
    rolloverRiskIndex: 7, accessToCapitalMarkets: false,
  },
  {
    country: 'Ethiopia', region: 'Sub-Saharan Africa', creditRating: 'CCC-',
    baseCdsBps: 1400, debtToGDP: 44, externalDebtBillions: 28,
    fxReservesBillions: 1.5, fxReservesCoverMonths: 1.0,
    riskTier: 'distressed',
    primaryBalancePctGDP: -2.8, interestPaymentsPctRevenue: 20.0,
    rolloverRiskIndex: 8, accessToCapitalMarkets: false,
  },
  {
    country: 'Zambia', region: 'Sub-Saharan Africa', creditRating: 'SD',
    baseCdsBps: 2200, debtToGDP: 120, externalDebtBillions: 18.6,
    fxReservesBillions: 2.9, fxReservesCoverMonths: 2.2,
    riskTier: 'default',
    primaryBalancePctGDP: -1.5, interestPaymentsPctRevenue: 30.0,
    rolloverRiskIndex: 9, accessToCapitalMarkets: false,
  },
];

// ── Event Seed Data ──

interface EventSeed {
  country: string;
  eventType: EventType;
  description: string;
  marketImpact: string;
  dayOffset: [number, number];
}

const EVENT_SEEDS: EventSeed[] = [
  {
    country: 'Sri Lanka', eventType: 'restructuring',
    description: 'Paris Club creditors finalize bilateral debt restructuring terms covering $5.8B in claims',
    marketImpact: 'Sri Lanka USD bonds rallied 4.2 points; CDS tightened 180bps',
    dayOffset: [-12, -5],
  },
  {
    country: 'Ghana', eventType: 'restructuring',
    description: 'Ghana completes domestic debt exchange program with 85% participation rate',
    marketImpact: 'Ghana eurobonds gained 2.8 points on restructuring progress',
    dayOffset: [-18, -8],
  },
  {
    country: 'Argentina', eventType: 'imf-program',
    description: 'IMF board approves $4.7B disbursement under Extended Fund Facility 8th review',
    marketImpact: 'Argentine peso stabilized; country risk premium narrowed 120bps',
    dayOffset: [-7, -2],
  },
  {
    country: 'Pakistan', eventType: 'imf-program',
    description: 'IMF completes second review of $7B Extended Fund Facility, disburses $1.1B',
    marketImpact: 'PKR strengthened 1.5% against USD; 10Y bond yields fell 45bps',
    dayOffset: [-10, -3],
  },
  {
    country: 'Ukraine', eventType: 'debt-swap',
    description: 'Ukraine finalizes $20B eurobond restructuring with 75% notional haircut',
    marketImpact: 'New Ukrainian GDP warrants priced at 22 cents on the dollar',
    dayOffset: [-25, -10],
  },
  {
    country: 'Egypt', eventType: 'rating-change',
    description: 'Moody\'s upgrades Egypt outlook to Positive following Ras El-Hekma FDI deal',
    marketImpact: 'Egyptian eurobond spreads tightened 85bps; EGP strengthened 2.3%',
    dayOffset: [-14, -5],
  },
  {
    country: 'Ethiopia', eventType: 'default',
    description: 'Ethiopia misses $33M coupon on 2024 eurobond, enters 30-day grace period',
    marketImpact: 'Ethiopian eurobond dropped to 65 cents; Sub-Saharan spreads widened 15bps',
    dayOffset: [-20, -8],
  },
  {
    country: 'Tunisia', eventType: 'downgrade',
    description: 'Fitch downgrades Tunisia to CCC+ citing fiscal deterioration and reform delays',
    marketImpact: 'Tunisian dollar bonds fell 3.5 points; CDS widened 95bps',
    dayOffset: [-9, -3],
  },
  {
    country: 'Zambia', eventType: 'restructuring',
    description: 'Zambia reaches agreement with bondholders on $3B eurobond restructuring terms',
    marketImpact: 'Zambian kwacha rallied 4.8% on week; bond prices rose to 72 cents',
    dayOffset: [-16, -6],
  },
  {
    country: 'El Salvador', eventType: 'debt-swap',
    description: 'El Salvador executes $1.5B debt buyback at 82 cents, reducing near-term maturities',
    marketImpact: 'ELSALV 2027 bonds rose 5 points; 5Y CDS tightened 110bps',
    dayOffset: [-11, -4],
  },
  {
    country: 'Lebanon', eventType: 'default',
    description: 'Lebanon enters 5th year of sovereign default with no restructuring framework',
    marketImpact: 'Lebanese eurobonds remain at 6-8 cents on the dollar; no active CDS market',
    dayOffset: [-30, -15],
  },
  {
    country: 'Kenya', eventType: 'rating-change',
    description: 'S&P affirms Kenya at B with Stable outlook following successful eurobond buyback',
    marketImpact: 'Kenyan eurobond spreads tightened 40bps; KES stable against USD',
    dayOffset: [-8, -2],
  },
];

// ── Contagion Pair Seeds ──

interface ContagionSeed {
  countryA: string;
  countryB: string;
  baseCorrelation: number;
}

const CONTAGION_SEEDS: ContagionSeed[] = [
  { countryA: 'Argentina', countryB: 'Ecuador', baseCorrelation: 0.72 },
  { countryA: 'Argentina', countryB: 'El Salvador', baseCorrelation: 0.58 },
  { countryA: 'Sri Lanka', countryB: 'Pakistan', baseCorrelation: 0.65 },
  { countryA: 'Ghana', countryB: 'Zambia', baseCorrelation: 0.78 },
  { countryA: 'Ghana', countryB: 'Kenya', baseCorrelation: 0.61 },
  { countryA: 'Ghana', countryB: 'Ethiopia', baseCorrelation: 0.68 },
  { countryA: 'Egypt', countryB: 'Tunisia', baseCorrelation: 0.55 },
  { countryA: 'Egypt', countryB: 'Lebanon', baseCorrelation: 0.42 },
  { countryA: 'Turkey', countryB: 'Egypt', baseCorrelation: 0.48 },
  { countryA: 'Nigeria', countryB: 'Ghana', baseCorrelation: 0.70 },
  { countryA: 'Nigeria', countryB: 'Kenya', baseCorrelation: 0.56 },
  { countryA: 'Pakistan', countryB: 'Egypt', baseCorrelation: 0.50 },
  { countryA: 'Ukraine', countryB: 'Turkey', baseCorrelation: 0.35 },
  { countryA: 'Zambia', countryB: 'Ethiopia', baseCorrelation: 0.63 },
  { countryA: 'Tunisia', countryB: 'Lebanon', baseCorrelation: 0.45 },
  { countryA: 'El Salvador', countryB: 'Ecuador', baseCorrelation: 0.64 },
  { countryA: 'Kenya', countryB: 'Ethiopia', baseCorrelation: 0.71 },
  { countryA: 'Sri Lanka', countryB: 'Ethiopia', baseCorrelation: 0.40 },
];

// ── Helpers ──

function roundTo(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function vary(base: number, rng: () => number, pctRange: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pctRange);
}

// CDS-implied default probability: P(default,T) = 1 - exp(-spread / (10000*(1-R)) * T)
// Recovery rate R = 0.40 (standard sovereign assumption)
function cdsImpliedPD(spreadBps: number, years: number): number {
  const recovery = 0.40;
  const hazardRate = spreadBps / (10000 * (1 - recovery));
  return roundTo((1 - Math.exp(-hazardRate * years)) * 100, 2);
}

// ── Data Generation ──

function generateCountryRisk(seed: CountrySeed, rng: () => number): CountryRisk {
  const cdsSpreadBps = roundTo(vary(seed.baseCdsBps, rng, 0.06), 0);
  const debtToGDP = roundTo(vary(seed.debtToGDP, rng, 0.03), 1);
  const externalDebtBillions = roundTo(vary(seed.externalDebtBillions, rng, 0.04), 1);
  const fxReservesBillions = roundTo(vary(seed.fxReservesBillions, rng, 0.05), 1);
  const fxReservesCoverMonths = roundTo(vary(seed.fxReservesCoverMonths, rng, 0.05), 1);

  const defaultProbability1Y = cdsImpliedPD(cdsSpreadBps, 1);
  const defaultProbability5Y = cdsImpliedPD(cdsSpreadBps, 5);

  const primaryBalancePctGDP = roundTo(vary(seed.primaryBalancePctGDP, rng, 0.08), 2);
  const interestPaymentsPctRevenue = roundTo(vary(seed.interestPaymentsPctRevenue, rng, 0.05), 1);
  const rolloverRiskIndex = Math.max(1, Math.min(10, Math.round(vary(seed.rolloverRiskIndex, rng, 0.08))));

  return {
    country: seed.country,
    region: seed.region,
    creditRating: seed.creditRating,
    cdsSpreadBps,
    debtToGDP,
    externalDebtBillions,
    fxReservesBillions,
    fxReservesCoverMonths,
    defaultProbability1Y,
    defaultProbability5Y,
    riskTier: seed.riskTier,
    debtSustainability: {
      primaryBalancePctGDP,
      interestPaymentsPctRevenue,
      rolloverRiskIndex,
      accessToCapitalMarkets: seed.accessToCapitalMarkets,
    },
  };
}

function generateEvents(rng: () => number): SovereignEvent[] {
  const shuffled = [...EVENT_SEEDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, 10);

  const today = new Date();
  return selected
    .map((seed) => {
      const daysBack = seed.dayOffset[0] + Math.floor(rng() * (seed.dayOffset[1] - seed.dayOffset[0] + 1));
      const eventDate = new Date(today);
      eventDate.setDate(eventDate.getDate() + daysBack);
      return {
        date: eventDate.toISOString().slice(0, 10),
        country: seed.country,
        eventType: seed.eventType,
        description: seed.description,
        marketImpact: seed.marketImpact,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function generateContagionMatrix(rng: () => number): ContagionPair[] {
  return CONTAGION_SEEDS.map((seed) => ({
    countryA: seed.countryA,
    countryB: seed.countryB,
    correlationScore: roundTo(vary(seed.baseCorrelation, rng, 0.06), 2),
  }));
}

function generateGlobalOverview(countries: CountryRisk[]): GlobalOverview {
  const distressed = countries.filter((c) => c.riskTier === 'distressed' || c.riskTier === 'default');
  const totalDistressedDebt = distressed.reduce((sum, c) => sum + c.externalDebtBillions, 0);

  const defaultCountries = countries.filter((c) => c.riskTier === 'default');
  const avgRecovery = defaultCountries.length > 0
    ? defaultCountries.reduce((sum, c) => {
        // Approximate recovery rates by credit rating
        if (c.creditRating === 'D') return sum + 12;
        if (c.creditRating === 'SD') return sum + 35;
        return sum + 25;
      }, 0) / defaultCountries.length
    : 0;

  const imfCountries = ['Pakistan', 'Argentina', 'Egypt', 'Kenya', 'Sri Lanka', 'Ukraine'];
  const restructuringCountries = ['Sri Lanka', 'Ghana', 'Zambia', 'Ethiopia'];

  return {
    sovereignsInDistress: distressed.length,
    totalDistressedDebtBillions: roundTo(totalDistressedDebt, 1),
    averageRecoveryRate: roundTo(avgRecovery, 1),
    imfProgramsActive: imfCountries.filter((name) => countries.some((c) => c.country === name)).length,
    debtRestructuringsInProgress: restructuringCountries.filter((name) => countries.some((c) => c.country === name)).length,
  };
}

function generateAllData(): SovereignDefaultResponse {
  const rng = seededRandom('sovereign-default');

  const countryRiskTable = COUNTRY_SEEDS.map((seed) => generateCountryRisk(seed, rng));
  const globalOverview = generateGlobalOverview(countryRiskTable);
  const recentSovereignEvents = generateEvents(rng);
  const contagionRiskMatrix = generateContagionMatrix(rng);

  return {
    timestamp: new Date().toISOString(),
    globalOverview,
    countryRiskTable,
    recentSovereignEvents,
    contagionRiskMatrix,
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: SovereignDefaultResponse | null; expiresAt: number } = {
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

    const data = generateAllData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SovereignDefault] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate sovereign default risk data' });
  }
});

export default router;
