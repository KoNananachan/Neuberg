import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface KeyIndicator {
  name: string;
  actual: number;
  forecast: number;
  previous: number;
  surprise: number;
  period: string;
  frequency: 'Monthly' | 'Quarterly' | 'Weekly';
}

interface CountryComparison {
  country: string;
  isoCode: string;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  pmi: number;
}

interface UpcomingRelease {
  date: string;
  time: string;
  indicator: string;
  forecast: number | string;
  previous: number | string;
  importance: 'HIGH' | 'MED' | 'LOW';
}

interface HistoricalTrend {
  indicator: string;
  values: { period: string; value: number }[];
}

interface MacroIndicatorsData {
  keyIndicators: KeyIndicator[];
  countryComparison: CountryComparison[];
  upcomingReleases: UpcomingRelease[];
  historicalTrends: HistoricalTrend[];
  generatedAt: string;
}

// ── Indicator Definitions ──

const INDICATOR_DEFS: {
  name: string;
  baseActual: number;
  baseForecast: number;
  basePrevious: number;
  spread: number;
  period: string;
  frequency: 'Monthly' | 'Quarterly' | 'Weekly';
}[] = [
  { name: 'GDP Growth (QoQ)',         baseActual: 2.8,   baseForecast: 2.5,   basePrevious: 2.1,   spread: 0.6,   period: 'Q4 2025', frequency: 'Quarterly' },
  { name: 'CPI (YoY)',               baseActual: 3.1,   baseForecast: 3.0,   basePrevious: 3.2,   spread: 0.3,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'Core CPI (YoY)',          baseActual: 3.7,   baseForecast: 3.6,   basePrevious: 3.8,   spread: 0.2,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'PPI (YoY)',               baseActual: 2.2,   baseForecast: 2.0,   basePrevious: 1.9,   spread: 0.4,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'PCE Price Index',         baseActual: 2.6,   baseForecast: 2.5,   basePrevious: 2.7,   spread: 0.2,   period: 'Jan 2026', frequency: 'Monthly' },
  { name: 'Non-Farm Payrolls',       baseActual: 225,   baseForecast: 200,   basePrevious: 185,   spread: 50,    period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'Unemployment Rate',       baseActual: 3.9,   baseForecast: 3.8,   basePrevious: 3.7,   spread: 0.2,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'ISM Manufacturing PMI',   baseActual: 50.3,  baseForecast: 49.8,  basePrevious: 49.2,  spread: 1.5,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'ISM Services PMI',        baseActual: 53.4,  baseForecast: 52.8,  basePrevious: 52.5,  spread: 1.5,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'Retail Sales (MoM)',      baseActual: 0.4,   baseForecast: 0.3,   basePrevious: 0.6,   spread: 0.3,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'Industrial Production',   baseActual: 0.2,   baseForecast: 0.1,   basePrevious: -0.1,  spread: 0.3,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'Consumer Confidence',     baseActual: 104.5, baseForecast: 103.0, basePrevious: 102.0, spread: 3.0,   period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'Housing Starts',          baseActual: 1.42,  baseForecast: 1.40,  basePrevious: 1.38,  spread: 0.08,  period: 'Feb 2026', frequency: 'Monthly' },
  { name: 'Durable Goods Orders',    baseActual: 1.3,   baseForecast: 1.0,   basePrevious: -0.5,  spread: 1.0,   period: 'Jan 2026', frequency: 'Monthly' },
  { name: 'Trade Balance',           baseActual: -68.5, baseForecast: -65.0, basePrevious: -64.2, spread: 5.0,   period: 'Jan 2026', frequency: 'Monthly' },
];

// ── Country Definitions ──

const COUNTRY_DEFS: {
  country: string;
  isoCode: string;
  gdpBase: number;
  inflationBase: number;
  unemploymentBase: number;
  pmiBase: number;
}[] = [
  { country: 'United States', isoCode: 'US', gdpBase: 2.8,   inflationBase: 3.1,  unemploymentBase: 3.9,  pmiBase: 51.5 },
  { country: 'Eurozone',      isoCode: 'EU', gdpBase: 0.8,   inflationBase: 2.4,  unemploymentBase: 6.4,  pmiBase: 47.2 },
  { country: 'United Kingdom', isoCode: 'GB', gdpBase: 1.2,  inflationBase: 3.0,  unemploymentBase: 4.2,  pmiBase: 49.5 },
  { country: 'Japan',         isoCode: 'JP', gdpBase: 1.0,   inflationBase: 2.8,  unemploymentBase: 2.5,  pmiBase: 49.8 },
  { country: 'China',         isoCode: 'CN', gdpBase: 4.8,   inflationBase: 0.3,  unemploymentBase: 5.2,  pmiBase: 50.2 },
];

// ── Upcoming Release Templates ──

const RELEASE_TEMPLATES: {
  indicator: string;
  dayOffset: number;
  time: string;
  forecastBase: number | string;
  previousBase: number | string;
  importance: 'HIGH' | 'MED' | 'LOW';
}[] = [
  { indicator: 'CPI (YoY)',                dayOffset: 2,  time: '08:30 ET', forecastBase: 3.0,     previousBase: 3.1,     importance: 'HIGH' },
  { indicator: 'Retail Sales (MoM)',        dayOffset: 4,  time: '08:30 ET', forecastBase: 0.3,     previousBase: 0.4,     importance: 'HIGH' },
  { indicator: 'Industrial Production',     dayOffset: 5,  time: '09:15 ET', forecastBase: 0.1,     previousBase: 0.2,     importance: 'MED' },
  { indicator: 'Housing Starts',            dayOffset: 7,  time: '08:30 ET', forecastBase: '1.40M', previousBase: '1.42M', importance: 'MED' },
  { indicator: 'Initial Jobless Claims',    dayOffset: 8,  time: '08:30 ET', forecastBase: '215K',  previousBase: '211K',  importance: 'MED' },
  { indicator: 'Philadelphia Fed Index',    dayOffset: 8,  time: '08:30 ET', forecastBase: 5.2,     previousBase: 4.8,     importance: 'LOW' },
  { indicator: 'Existing Home Sales',       dayOffset: 10, time: '10:00 ET', forecastBase: '4.10M', previousBase: '4.08M', importance: 'MED' },
  { indicator: 'GDP (QoQ) - 2nd Estimate',  dayOffset: 12, time: '08:30 ET', forecastBase: 2.5,     previousBase: 2.8,     importance: 'HIGH' },
  { indicator: 'PCE Price Index (YoY)',     dayOffset: 14, time: '08:30 ET', forecastBase: 2.5,     previousBase: 2.6,     importance: 'HIGH' },
  { indicator: 'ISM Manufacturing PMI',     dayOffset: 16, time: '10:00 ET', forecastBase: 50.0,    previousBase: 50.3,    importance: 'HIGH' },
  { indicator: 'Non-Farm Payrolls',         dayOffset: 18, time: '08:30 ET', forecastBase: '200K',  previousBase: '225K',  importance: 'HIGH' },
  { indicator: 'Consumer Confidence',       dayOffset: 20, time: '10:00 ET', forecastBase: 103.5,   previousBase: 104.5,   importance: 'MED' },
];

// ── Historical Trend Indicators ──

const TREND_INDICATORS: {
  name: string;
  baseValues: number[];
}[] = [
  { name: 'GDP Growth (QoQ)',       baseValues: [2.1, 2.4, 2.9, 2.5, 2.1, 2.8] },
  { name: 'CPI (YoY)',             baseValues: [3.7, 3.4, 3.2, 3.1, 3.2, 3.1] },
  { name: 'Unemployment Rate',     baseValues: [3.6, 3.7, 3.8, 3.7, 3.7, 3.9] },
  { name: 'ISM Manufacturing PMI', baseValues: [47.8, 48.5, 49.2, 49.8, 49.2, 50.3] },
  { name: 'Non-Farm Payrolls (K)', baseValues: [275, 240, 210, 195, 185, 225] },
  { name: 'Consumer Confidence',   baseValues: [98.5, 100.2, 102.8, 103.5, 102.0, 104.5] },
];

// ── Helpers ──

const round2 = (v: number): number => Math.round(v * 100) / 100;
const round1 = (v: number): number => Math.round(v * 10) / 10;

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getQuarterLabel(offset: number): string {
  const now = new Date();
  const targetMonth = now.getMonth() - offset * 3;
  const d = new Date(now.getFullYear(), targetMonth, 1);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

// ── Data Generation ──

function generate(): MacroIndicatorsData {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('macro-indicators-' + today);
  const rng = mulberry32(seed);

  const jitter = (base: number, spread: number): number =>
    round2(base + (rng() - 0.5) * 2 * spread);

  // Key Indicators Table
  const keyIndicators: KeyIndicator[] = INDICATOR_DEFS.map(def => {
    const actual = jitter(def.baseActual, def.spread);
    const forecast = jitter(def.baseForecast, def.spread * 0.5);
    const previous = jitter(def.basePrevious, def.spread * 0.3);
    const surprise = round2(actual - forecast);

    return {
      name: def.name,
      actual,
      forecast,
      previous,
      surprise,
      period: def.period,
      frequency: def.frequency,
    };
  });

  // Country Comparison
  const countryComparison: CountryComparison[] = COUNTRY_DEFS.map(def => {
    return {
      country: def.country,
      isoCode: def.isoCode,
      gdpGrowth: round1(jitter(def.gdpBase, 0.4)),
      inflation: round1(jitter(def.inflationBase, 0.3)),
      unemployment: round1(jitter(def.unemploymentBase, 0.2)),
      pmi: round1(jitter(def.pmiBase, 1.5)),
    };
  });

  // Upcoming Releases
  const now = new Date();
  const upcomingReleases: UpcomingRelease[] = RELEASE_TEMPLATES.map(tmpl => {
    const releaseDate = new Date(now);
    releaseDate.setDate(releaseDate.getDate() + tmpl.dayOffset);

    return {
      date: formatDate(releaseDate),
      time: tmpl.time,
      indicator: tmpl.indicator,
      forecast: typeof tmpl.forecastBase === 'number'
        ? round2(jitter(tmpl.forecastBase, Math.abs(tmpl.forecastBase as number) * 0.02))
        : tmpl.forecastBase,
      previous: typeof tmpl.previousBase === 'number'
        ? round2(jitter(tmpl.previousBase, Math.abs(tmpl.previousBase as number) * 0.02))
        : tmpl.previousBase,
      importance: tmpl.importance,
    };
  });

  // Historical Trends (6 quarterly values)
  const historicalTrends: HistoricalTrend[] = TREND_INDICATORS.map(ti => {
    const values = ti.baseValues.map((base, idx) => {
      const spread = Math.abs(base) * 0.05;
      return {
        period: getQuarterLabel(5 - idx),
        value: round1(jitter(base, spread)),
      };
    });

    return {
      indicator: ti.name,
      values,
    };
  });

  return {
    keyIndicators,
    countryComparison,
    upcomingReleases,
    historicalTrends,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }

    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MacroIndicators] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate macro indicators data' });
  }
});

export default router;
