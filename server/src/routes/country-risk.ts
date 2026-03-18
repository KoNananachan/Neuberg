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

interface CountryRiskScore {
  country: string;
  isoCode: string;
  overallRisk: number;
  creditRating: string;
  cds5y: number;
  fxVolatility: number;
  politicalRisk: number;
  economicRisk: number;
  change1w: number;
}

interface RiskEvent {
  country: string;
  event: string;
  date: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

interface FxReservesEntry {
  country: string;
  reserves: number;
  monthsImportCover: number;
  change3m: number;
  adequacyRatio: number;
}

interface CountryRiskSummary {
  avgEmRisk: number;
  highRiskCount: number;
  avgEmCds: number;
  globalRiskTrend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  timestamp: string;
}

interface CountryRiskResponse {
  riskScores: CountryRiskScore[];
  riskEvents: RiskEvent[];
  fxReserves: FxReservesEntry[];
  summary: CountryRiskSummary;
}

// ── Seed Data: 20 countries ──

interface CountrySeed {
  country: string;
  isoCode: string;
  baseOverallRisk: number;
  creditRating: string;
  baseCds5y: number;
  baseFxVol: number;
  basePoliticalRisk: number;
  baseEconomicRisk: number;
}

const COUNTRY_SEEDS: CountrySeed[] = [
  { country: 'United States',  isoCode: 'US', baseOverallRisk: 18, creditRating: 'AA+', baseCds5y: 32,   baseFxVol: 7.8,  basePoliticalRisk: 22, baseEconomicRisk: 15 },
  { country: 'United Kingdom', isoCode: 'GB', baseOverallRisk: 24, creditRating: 'AA',  baseCds5y: 35,   baseFxVol: 8.4,  basePoliticalRisk: 28, baseEconomicRisk: 22 },
  { country: 'Germany',        isoCode: 'DE', baseOverallRisk: 14, creditRating: 'AAA', baseCds5y: 18,   baseFxVol: 7.2,  basePoliticalRisk: 16, baseEconomicRisk: 12 },
  { country: 'France',         isoCode: 'FR', baseOverallRisk: 26, creditRating: 'AA-', baseCds5y: 42,   baseFxVol: 7.5,  basePoliticalRisk: 32, baseEconomicRisk: 20 },
  { country: 'Japan',          isoCode: 'JP', baseOverallRisk: 22, creditRating: 'A+',  baseCds5y: 28,   baseFxVol: 9.6,  basePoliticalRisk: 18, baseEconomicRisk: 26 },
  { country: 'China',          isoCode: 'CN', baseOverallRisk: 42, creditRating: 'A+',  baseCds5y: 68,   baseFxVol: 5.8,  basePoliticalRisk: 55, baseEconomicRisk: 38 },
  { country: 'India',          isoCode: 'IN', baseOverallRisk: 44, creditRating: 'BBB-',baseCds5y: 98,   baseFxVol: 6.2,  basePoliticalRisk: 40, baseEconomicRisk: 48 },
  { country: 'Brazil',         isoCode: 'BR', baseOverallRisk: 52, creditRating: 'BB',  baseCds5y: 165,  baseFxVol: 14.5, basePoliticalRisk: 55, baseEconomicRisk: 50 },
  { country: 'Mexico',         isoCode: 'MX', baseOverallRisk: 48, creditRating: 'BBB', baseCds5y: 118,  baseFxVol: 12.8, basePoliticalRisk: 50, baseEconomicRisk: 45 },
  { country: 'South Africa',   isoCode: 'ZA', baseOverallRisk: 58, creditRating: 'BB-', baseCds5y: 225,  baseFxVol: 16.2, basePoliticalRisk: 60, baseEconomicRisk: 55 },
  { country: 'Turkey',         isoCode: 'TR', baseOverallRisk: 68, creditRating: 'B+',  baseCds5y: 310,  baseFxVol: 22.5, basePoliticalRisk: 65, baseEconomicRisk: 72 },
  { country: 'Russia',         isoCode: 'RU', baseOverallRisk: 82, creditRating: 'CCC', baseCds5y: 1250, baseFxVol: 28.0, basePoliticalRisk: 88, baseEconomicRisk: 75 },
  { country: 'Argentina',      isoCode: 'AR', baseOverallRisk: 78, creditRating: 'CCC', baseCds5y: 980,  baseFxVol: 35.0, basePoliticalRisk: 70, baseEconomicRisk: 85 },
  { country: 'Nigeria',        isoCode: 'NG', baseOverallRisk: 62, creditRating: 'B-',  baseCds5y: 480,  baseFxVol: 18.5, basePoliticalRisk: 65, baseEconomicRisk: 60 },
  { country: 'Egypt',          isoCode: 'EG', baseOverallRisk: 64, creditRating: 'B-',  baseCds5y: 520,  baseFxVol: 20.0, basePoliticalRisk: 58, baseEconomicRisk: 68 },
  { country: 'Saudi Arabia',   isoCode: 'SA', baseOverallRisk: 30, creditRating: 'A',   baseCds5y: 55,   baseFxVol: 3.2,  basePoliticalRisk: 42, baseEconomicRisk: 25 },
  { country: 'Australia',      isoCode: 'AU', baseOverallRisk: 16, creditRating: 'AAA', baseCds5y: 20,   baseFxVol: 9.8,  basePoliticalRisk: 12, baseEconomicRisk: 18 },
  { country: 'South Korea',    isoCode: 'KR', baseOverallRisk: 25, creditRating: 'AA',  baseCds5y: 38,   baseFxVol: 8.8,  basePoliticalRisk: 28, baseEconomicRisk: 22 },
  { country: 'Indonesia',      isoCode: 'ID', baseOverallRisk: 40, creditRating: 'BBB', baseCds5y: 88,   baseFxVol: 10.5, basePoliticalRisk: 38, baseEconomicRisk: 42 },
  { country: 'Thailand',       isoCode: 'TH', baseOverallRisk: 36, creditRating: 'BBB+',baseCds5y: 62,   baseFxVol: 7.5,  basePoliticalRisk: 42, baseEconomicRisk: 32 },
];

// ── Risk Event Seeds ──

interface RiskEventSeed {
  country: string;
  event: string;
  dayOffset: [number, number]; // min/max days from today
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

const RISK_EVENT_SEEDS: RiskEventSeed[] = [
  { country: 'Turkey',       event: 'Central Bank Meeting',    dayOffset: [3, 12],  impactLevel: 'HIGH',   description: 'TCMB rate decision amid elevated inflation and lira pressure' },
  { country: 'Brazil',       event: 'Central Bank Meeting',    dayOffset: [5, 18],  impactLevel: 'HIGH',   description: 'BCB Selic rate decision; fiscal concerns weigh on BRL outlook' },
  { country: 'Argentina',    event: 'Debt Maturity',           dayOffset: [8, 30],  impactLevel: 'HIGH',   description: 'USD 4.2B sovereign bond redemption; reserves at critical levels' },
  { country: 'Egypt',        event: 'IMF Review',              dayOffset: [10, 35], impactLevel: 'HIGH',   description: 'IMF 5th review under EFF; structural reform benchmarks assessed' },
  { country: 'Nigeria',      event: 'Debt Maturity',           dayOffset: [7, 25],  impactLevel: 'MEDIUM', description: 'Eurobond coupon payment; FX liquidity under scrutiny' },
  { country: 'South Africa', event: 'Election',                dayOffset: [15, 45], impactLevel: 'MEDIUM', description: 'Provincial by-elections; coalition stability implications' },
  { country: 'Indonesia',    event: 'Central Bank Meeting',    dayOffset: [4, 15],  impactLevel: 'MEDIUM', description: 'Bank Indonesia policy rate review; IDR stability in focus' },
  { country: 'Mexico',       event: 'IMF Review',              dayOffset: [12, 40], impactLevel: 'LOW',    description: 'Article IV consultation; nearshoring impact on growth outlook' },
  { country: 'India',        event: 'Central Bank Meeting',    dayOffset: [6, 20],  impactLevel: 'MEDIUM', description: 'RBI MPC meeting; food inflation and monsoon outlook key factors' },
  { country: 'Russia',       event: 'Debt Maturity',           dayOffset: [5, 22],  impactLevel: 'HIGH',   description: 'OFZ maturity amid sanctions; limited refinancing options' },
  { country: 'Saudi Arabia', event: 'OPEC+ Meeting',           dayOffset: [8, 28],  impactLevel: 'MEDIUM', description: 'Production quota review; oil price defense vs. market share' },
  { country: 'China',        event: 'Central Bank Meeting',    dayOffset: [2, 10],  impactLevel: 'HIGH',   description: 'PBoC LPR fixing; stimulus expectations amid property sector stress' },
];

// ── FX Reserves Seeds (12 major EM) ──

interface FxReservesSeed {
  country: string;
  baseReserves: number;
  baseMonthsCover: number;
  baseAdequacyRatio: number;
}

const FX_RESERVES_SEEDS: FxReservesSeed[] = [
  { country: 'China',        baseReserves: 3220, baseMonthsCover: 16.4, baseAdequacyRatio: 3.15 },
  { country: 'India',        baseReserves: 620,  baseMonthsCover: 10.8, baseAdequacyRatio: 1.85 },
  { country: 'Saudi Arabia', baseReserves: 435,  baseMonthsCover: 28.2, baseAdequacyRatio: 4.20 },
  { country: 'South Korea',  baseReserves: 418,  baseMonthsCover: 8.2,  baseAdequacyRatio: 1.62 },
  { country: 'Brazil',       baseReserves: 340,  baseMonthsCover: 18.5, baseAdequacyRatio: 2.45 },
  { country: 'Mexico',       baseReserves: 210,  baseMonthsCover: 5.4,  baseAdequacyRatio: 1.28 },
  { country: 'Indonesia',    baseReserves: 138,  baseMonthsCover: 6.5,  baseAdequacyRatio: 1.35 },
  { country: 'Turkey',       baseReserves: 135,  baseMonthsCover: 4.2,  baseAdequacyRatio: 0.82 },
  { country: 'Thailand',     baseReserves: 216,  baseMonthsCover: 10.1, baseAdequacyRatio: 2.10 },
  { country: 'South Africa', baseReserves: 58,   baseMonthsCover: 5.8,  baseAdequacyRatio: 0.95 },
  { country: 'Nigeria',      baseReserves: 34,   baseMonthsCover: 4.8,  baseAdequacyRatio: 0.72 },
  { country: 'Argentina',    baseReserves: 28,   baseMonthsCover: 3.2,  baseAdequacyRatio: 0.38 },
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

function generateRiskScores(rng: () => number): CountryRiskScore[] {
  return COUNTRY_SEEDS.map((seed) => {
    const overallRisk = clamp(Math.round(applyVariation(seed.baseOverallRisk, rng, 0.08)), 0, 100);
    const cds5y = roundTo(applyVariation(seed.baseCds5y, rng, 0.06), 1);
    const fxVolatility = roundTo(applyVariation(seed.baseFxVol, rng, 0.10), 1);
    const politicalRisk = clamp(Math.round(applyVariation(seed.basePoliticalRisk, rng, 0.07)), 0, 100);
    const economicRisk = clamp(Math.round(applyVariation(seed.baseEconomicRisk, rng, 0.07)), 0, 100);
    const change1w = roundTo((rng() - 0.48) * seed.baseOverallRisk * 0.08, 1);

    return {
      country: seed.country,
      isoCode: seed.isoCode,
      overallRisk,
      creditRating: seed.creditRating,
      cds5y,
      fxVolatility,
      politicalRisk,
      economicRisk,
      change1w,
    };
  });
}

function generateRiskEvents(rng: () => number): RiskEvent[] {
  // Pick 8 events from the pool deterministically
  const shuffled = [...RISK_EVENT_SEEDS];
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

    return {
      country: seed.country,
      event: seed.event,
      date: eventDate.toISOString().slice(0, 10),
      impactLevel: seed.impactLevel,
      description: seed.description,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function generateFxReserves(rng: () => number): FxReservesEntry[] {
  return FX_RESERVES_SEEDS.map((seed) => {
    const reserves = roundTo(applyVariation(seed.baseReserves, rng, 0.03), 1);
    const monthsImportCover = roundTo(applyVariation(seed.baseMonthsCover, rng, 0.05), 1);
    const change3m = roundTo((rng() - 0.45) * 6, 1);
    const adequacyRatio = roundTo(applyVariation(seed.baseAdequacyRatio, rng, 0.04), 2);

    return {
      country: seed.country,
      reserves,
      monthsImportCover,
      change3m,
      adequacyRatio,
    };
  });
}

function generateSummary(
  riskScores: CountryRiskScore[],
  rng: () => number,
): CountryRiskSummary {
  // EM countries (exclude US, UK, DE, FR, JP, AU)
  const dmIsoCodes = new Set(['US', 'GB', 'DE', 'FR', 'JP', 'AU']);
  const emScores = riskScores.filter((s) => !dmIsoCodes.has(s.isoCode));

  const avgEmRisk = roundTo(
    emScores.reduce((sum, s) => sum + s.overallRisk, 0) / emScores.length,
    1,
  );
  const highRiskCount = emScores.filter((s) => s.overallRisk >= 60).length;
  const avgEmCds = roundTo(
    emScores.reduce((sum, s) => sum + s.cds5y, 0) / emScores.length,
    1,
  );

  // Deterministic trend selection
  const trendRoll = rng();
  let globalRiskTrend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  if (trendRoll < 0.30) {
    globalRiskTrend = 'IMPROVING';
  } else if (trendRoll < 0.65) {
    globalRiskTrend = 'STABLE';
  } else {
    globalRiskTrend = 'DETERIORATING';
  }

  return {
    avgEmRisk,
    highRiskCount,
    avgEmCds,
    globalRiskTrend,
    timestamp: new Date().toISOString(),
  };
}

function generateCountryRiskData(): CountryRiskResponse {
  const rng = seededRandom('country-risk');
  const riskScores = generateRiskScores(rng);
  const riskEvents = generateRiskEvents(rng);
  const fxReserves = generateFxReserves(rng);
  const summary = generateSummary(riskScores, rng);

  return { riskScores, riskEvents, fxReserves, summary };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: CountryRiskResponse | null; expiresAt: number } = {
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

    const data = generateCountryRiskData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CountryRisk] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch country risk data' });
  }
});

export default router;
