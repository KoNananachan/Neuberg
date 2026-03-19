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

// ── Types ──

interface IndicatorForecast {
  current: number;
  consensus: number;
  high: number;
  low: number;
  previous: number;
  numEstimates: number;
  revision: number;
  surpriseIndex: number;
}

interface CountryForecast {
  country: string;
  countryCode: string;
  gdpGrowth: IndicatorForecast;
  cpiInflation: IndicatorForecast;
  unemploymentRate: IndicatorForecast;
  currentAccount: IndicatorForecast;
  governmentDebt: IndicatorForecast;
  bondYield10Y: IndicatorForecast;
}

interface RecessionProbability {
  region: string;
  probability: number;
  threeMonthChange: number;
}

interface ConsensusShift {
  country: string;
  indicator: string;
  previousConsensus: number;
  newConsensus: number;
  shift: number;
  direction: 'upgraded' | 'downgraded';
  date: string;
}

interface GlobalSummary {
  globalGrowthForecast: number;
  globalInflationForecast: number;
  recessionProbabilities: RecessionProbability[];
  consensusShifts: ConsensusShift[];
}

interface EconomicForecastResponse {
  countries: CountryForecast[];
  globalSummary: GlobalSummary;
  lastUpdated: string;
  surveyDate: string;
  numContributingFirms: number;
}

// ── Cache ──

let cache: { data: EconomicForecastResponse | null; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Country base data (realistic 2026 macro conditions) ──

interface CountryBase {
  country: string;
  code: string;
  gdp: { current: number; consensus: number; spread: number; previous: number };
  cpi: { current: number; consensus: number; spread: number; previous: number };
  unemployment: { current: number; consensus: number; spread: number; previous: number };
  currentAcct: { current: number; consensus: number; spread: number; previous: number };
  govDebt: { current: number; consensus: number; spread: number; previous: number };
  bond10y: { current: number; consensus: number; spread: number; previous: number };
}

const COUNTRIES: CountryBase[] = [
  {
    country: 'United States', code: 'US',
    gdp: { current: 2.3, consensus: 2.1, spread: 0.8, previous: 2.5 },
    cpi: { current: 2.8, consensus: 2.6, spread: 0.5, previous: 3.1 },
    unemployment: { current: 4.1, consensus: 4.2, spread: 0.4, previous: 3.9 },
    currentAcct: { current: -3.2, consensus: -3.1, spread: 0.5, previous: -3.4 },
    govDebt: { current: 125.0, consensus: 126.5, spread: 3.0, previous: 123.0 },
    bond10y: { current: 4.25, consensus: 4.10, spread: 0.6, previous: 4.35 },
  },
  {
    country: 'Eurozone', code: 'EZ',
    gdp: { current: 1.1, consensus: 1.0, spread: 0.6, previous: 0.8 },
    cpi: { current: 2.3, consensus: 2.2, spread: 0.4, previous: 2.5 },
    unemployment: { current: 6.4, consensus: 6.5, spread: 0.3, previous: 6.5 },
    currentAcct: { current: 2.8, consensus: 2.5, spread: 0.8, previous: 2.6 },
    govDebt: { current: 88.0, consensus: 89.0, spread: 2.0, previous: 87.5 },
    bond10y: { current: 2.45, consensus: 2.35, spread: 0.4, previous: 2.55 },
  },
  {
    country: 'United Kingdom', code: 'GB',
    gdp: { current: 1.3, consensus: 1.2, spread: 0.5, previous: 1.0 },
    cpi: { current: 2.9, consensus: 2.7, spread: 0.5, previous: 3.2 },
    unemployment: { current: 4.3, consensus: 4.4, spread: 0.3, previous: 4.2 },
    currentAcct: { current: -3.5, consensus: -3.4, spread: 0.6, previous: -3.7 },
    govDebt: { current: 100.0, consensus: 101.0, spread: 2.5, previous: 99.0 },
    bond10y: { current: 4.15, consensus: 4.00, spread: 0.5, previous: 4.25 },
  },
  {
    country: 'Japan', code: 'JP',
    gdp: { current: 1.0, consensus: 0.9, spread: 0.5, previous: 1.1 },
    cpi: { current: 2.5, consensus: 2.3, spread: 0.4, previous: 2.8 },
    unemployment: { current: 2.5, consensus: 2.5, spread: 0.2, previous: 2.4 },
    currentAcct: { current: 3.5, consensus: 3.3, spread: 0.7, previous: 3.4 },
    govDebt: { current: 255.0, consensus: 257.0, spread: 4.0, previous: 253.0 },
    bond10y: { current: 1.15, consensus: 1.10, spread: 0.3, previous: 1.05 },
  },
  {
    country: 'China', code: 'CN',
    gdp: { current: 4.7, consensus: 4.5, spread: 0.8, previous: 5.0 },
    cpi: { current: 0.8, consensus: 1.0, spread: 0.5, previous: 0.5 },
    unemployment: { current: 5.2, consensus: 5.3, spread: 0.3, previous: 5.1 },
    currentAcct: { current: 1.8, consensus: 1.6, spread: 0.6, previous: 2.0 },
    govDebt: { current: 85.0, consensus: 87.0, spread: 3.0, previous: 83.0 },
    bond10y: { current: 2.30, consensus: 2.25, spread: 0.3, previous: 2.40 },
  },
  {
    country: 'India', code: 'IN',
    gdp: { current: 6.5, consensus: 6.3, spread: 0.7, previous: 6.8 },
    cpi: { current: 4.8, consensus: 4.6, spread: 0.6, previous: 5.1 },
    unemployment: { current: 7.8, consensus: 7.9, spread: 0.4, previous: 7.7 },
    currentAcct: { current: -1.8, consensus: -1.9, spread: 0.5, previous: -1.6 },
    govDebt: { current: 82.0, consensus: 83.0, spread: 2.5, previous: 81.0 },
    bond10y: { current: 7.10, consensus: 7.00, spread: 0.4, previous: 7.20 },
  },
  {
    country: 'Brazil', code: 'BR',
    gdp: { current: 2.0, consensus: 1.8, spread: 0.6, previous: 2.2 },
    cpi: { current: 4.5, consensus: 4.3, spread: 0.7, previous: 4.8 },
    unemployment: { current: 7.5, consensus: 7.6, spread: 0.4, previous: 7.4 },
    currentAcct: { current: -2.5, consensus: -2.4, spread: 0.5, previous: -2.7 },
    govDebt: { current: 76.0, consensus: 77.0, spread: 2.5, previous: 75.0 },
    bond10y: { current: 11.50, consensus: 11.30, spread: 0.8, previous: 11.80 },
  },
  {
    country: 'Canada', code: 'CA',
    gdp: { current: 1.8, consensus: 1.7, spread: 0.5, previous: 1.5 },
    cpi: { current: 2.5, consensus: 2.4, spread: 0.4, previous: 2.8 },
    unemployment: { current: 5.8, consensus: 5.9, spread: 0.3, previous: 5.7 },
    currentAcct: { current: -2.0, consensus: -1.9, spread: 0.4, previous: -2.2 },
    govDebt: { current: 43.0, consensus: 44.0, spread: 2.0, previous: 42.5 },
    bond10y: { current: 3.45, consensus: 3.35, spread: 0.4, previous: 3.55 },
  },
  {
    country: 'Australia', code: 'AU',
    gdp: { current: 2.0, consensus: 1.9, spread: 0.5, previous: 1.8 },
    cpi: { current: 3.2, consensus: 3.0, spread: 0.5, previous: 3.5 },
    unemployment: { current: 4.0, consensus: 4.1, spread: 0.3, previous: 3.9 },
    currentAcct: { current: 1.2, consensus: 1.0, spread: 0.5, previous: 1.4 },
    govDebt: { current: 35.0, consensus: 36.0, spread: 2.0, previous: 34.0 },
    bond10y: { current: 4.10, consensus: 4.00, spread: 0.4, previous: 4.20 },
  },
  {
    country: 'South Korea', code: 'KR',
    gdp: { current: 2.2, consensus: 2.0, spread: 0.5, previous: 2.1 },
    cpi: { current: 2.4, consensus: 2.3, spread: 0.4, previous: 2.6 },
    unemployment: { current: 3.0, consensus: 3.1, spread: 0.2, previous: 2.9 },
    currentAcct: { current: 4.0, consensus: 3.8, spread: 0.6, previous: 4.2 },
    govDebt: { current: 55.0, consensus: 56.0, spread: 2.0, previous: 54.0 },
    bond10y: { current: 3.30, consensus: 3.20, spread: 0.4, previous: 3.40 },
  },
];

// ── Indicator names for consensus shifts ──

const INDICATOR_NAMES = [
  'GDP Growth', 'CPI Inflation', 'Unemployment Rate',
  'Current Account', 'Government Debt', '10Y Bond Yield',
];

// ── Data Generation ──

function generate(): EconomicForecastResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-economic-forecast-consensus'));

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  const jitter = (base: number, pct: number): number =>
    round2(base * (1 + (rng() - 0.5) * 2 * pct));

  const genIndicator = (
    base: { current: number; consensus: number; spread: number; previous: number },
    isPercent: boolean,
  ): IndicatorForecast => {
    const current = round2(base.current + (rng() - 0.5) * base.spread * 0.3);
    const consensus = round2(base.consensus + (rng() - 0.5) * base.spread * 0.2);
    const spreadHalf = base.spread * (0.4 + rng() * 0.3);
    const high = round2(consensus + spreadHalf);
    const low = round2(consensus - spreadHalf);
    const previous = round2(base.previous + (rng() - 0.5) * base.spread * 0.15);
    const numEstimates = Math.floor(15 + rng() * 31); // 15-45
    const revision = round2((rng() - 0.5) * base.spread * 0.25);
    const diff = current - consensus;
    const normalizedDiff = base.spread > 0 ? diff / base.spread : 0;
    const surpriseIndex = Math.round(
      Math.max(-100, Math.min(100, normalizedDiff * 100)),
    );

    if (isPercent) {
      return { current, consensus, high, low, previous, numEstimates, revision, surpriseIndex };
    }
    return { current, consensus, high, low, previous, numEstimates, revision, surpriseIndex };
  };

  const countries: CountryForecast[] = COUNTRIES.map((c) => ({
    country: c.country,
    countryCode: c.code,
    gdpGrowth: genIndicator(c.gdp, true),
    cpiInflation: genIndicator(c.cpi, true),
    unemploymentRate: genIndicator(c.unemployment, true),
    currentAccount: genIndicator(c.currentAcct, true),
    governmentDebt: genIndicator(c.govDebt, true),
    bondYield10Y: genIndicator(c.bond10y, true),
  }));

  // Global summary
  const gdpValues = countries.map((c) => c.gdpGrowth.consensus);
  const cpiValues = countries.map((c) => c.cpiInflation.consensus);
  const globalGrowthForecast = round1(
    gdpValues.reduce((a, b) => a + b, 0) / gdpValues.length,
  );
  const globalInflationForecast = round1(
    cpiValues.reduce((a, b) => a + b, 0) / cpiValues.length,
  );

  // Recession probabilities (realistic ranges)
  const recessionRegions = [
    { region: 'US', base: 20 },
    { region: 'EU', base: 30 },
    { region: 'UK', base: 25 },
    { region: 'Japan', base: 25 },
    { region: 'China', base: 10 },
  ];
  const recessionProbabilities: RecessionProbability[] = recessionRegions.map((r) => {
    const probability = Math.round(r.base + (rng() - 0.5) * 15);
    const threeMonthChange = round1((rng() - 0.5) * 8);
    return {
      region: r.region,
      probability: Math.max(5, Math.min(60, probability)),
      threeMonthChange,
    };
  });

  // Consensus shifts: pick 5-8 recent notable revisions
  const numShifts = 5 + Math.floor(rng() * 4);
  const consensusShifts: ConsensusShift[] = [];
  for (let i = 0; i < numShifts; i++) {
    const countryIdx = Math.floor(rng() * COUNTRIES.length);
    const indicatorIdx = Math.floor(rng() * INDICATOR_NAMES.length);
    const baseCountry = COUNTRIES[countryIdx];
    const indicatorName = INDICATOR_NAMES[indicatorIdx];

    // Pick a base value depending on indicator
    let baseVal: number;
    switch (indicatorIdx) {
      case 0: baseVal = baseCountry.gdp.consensus; break;
      case 1: baseVal = baseCountry.cpi.consensus; break;
      case 2: baseVal = baseCountry.unemployment.consensus; break;
      case 3: baseVal = baseCountry.currentAcct.consensus; break;
      case 4: baseVal = baseCountry.govDebt.consensus; break;
      default: baseVal = baseCountry.bond10y.consensus; break;
    }

    const shift = round2((rng() - 0.5) * 0.6);
    const previousConsensus = round2(baseVal - shift);
    const newConsensus = round2(baseVal);
    const daysAgo = Math.floor(rng() * 14) + 1;
    const shiftDate = new Date();
    shiftDate.setDate(shiftDate.getDate() - daysAgo);

    consensusShifts.push({
      country: baseCountry.country,
      indicator: indicatorName,
      previousConsensus,
      newConsensus,
      shift,
      direction: shift >= 0 ? 'upgraded' : 'downgraded',
      date: shiftDate.toISOString().slice(0, 10),
    });
  }

  // Sort shifts by date descending
  consensusShifts.sort((a, b) => b.date.localeCompare(a.date));

  const globalSummary: GlobalSummary = {
    globalGrowthForecast,
    globalInflationForecast,
    recessionProbabilities,
    consensusShifts,
  };

  return {
    countries,
    globalSummary,
    lastUpdated: new Date().toISOString(),
    surveyDate: day,
    numContributingFirms: 35 + Math.floor(rng() * 20),
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
    console.error('[EconomicForecast] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate economic forecast data' });
  }
});

export default router;
