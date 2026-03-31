import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Static reference data --

const REGIONS = ['US', 'EU', 'China', 'Japan', 'UK', 'EM', 'Global', 'G10'] as const;

const INDICATORS_BY_COUNTRY: Record<string, { indicator: string; unit: string; baseActual: number; baseForecast: number; stdDev: number; impact: 'high' | 'medium' | 'low' }[]> = {
  US: [
    { indicator: 'Nonfarm Payrolls', unit: 'K', baseActual: 215, baseForecast: 200, stdDev: 45, impact: 'high' },
    { indicator: 'CPI YoY', unit: '%', baseActual: 3.1, baseForecast: 3.0, stdDev: 0.2, impact: 'high' },
    { indicator: 'Core PCE MoM', unit: '%', baseActual: 0.3, baseForecast: 0.2, stdDev: 0.1, impact: 'high' },
    { indicator: 'ISM Manufacturing PMI', unit: '', baseActual: 49.5, baseForecast: 49.0, stdDev: 1.5, impact: 'high' },
    { indicator: 'GDP QoQ Annualized', unit: '%', baseActual: 2.8, baseForecast: 2.5, stdDev: 0.6, impact: 'high' },
    { indicator: 'Retail Sales MoM', unit: '%', baseActual: 0.4, baseForecast: 0.3, stdDev: 0.3, impact: 'medium' },
    { indicator: 'Initial Jobless Claims', unit: 'K', baseActual: 218, baseForecast: 220, stdDev: 12, impact: 'medium' },
    { indicator: 'U. of Michigan Sentiment', unit: '', baseActual: 68.5, baseForecast: 69.0, stdDev: 2.5, impact: 'medium' },
    { indicator: 'Durable Goods Orders MoM', unit: '%', baseActual: 0.5, baseForecast: 0.3, stdDev: 0.8, impact: 'medium' },
    { indicator: 'Housing Starts', unit: 'M', baseActual: 1.42, baseForecast: 1.40, stdDev: 0.05, impact: 'medium' },
  ],
  EU: [
    { indicator: 'Eurozone CPI YoY', unit: '%', baseActual: 2.4, baseForecast: 2.3, stdDev: 0.15, impact: 'high' },
    { indicator: 'Eurozone Composite PMI', unit: '', baseActual: 47.8, baseForecast: 48.0, stdDev: 1.2, impact: 'high' },
    { indicator: 'Germany IFO Business Climate', unit: '', baseActual: 85.2, baseForecast: 85.5, stdDev: 1.8, impact: 'medium' },
    { indicator: 'Eurozone GDP QoQ', unit: '%', baseActual: 0.1, baseForecast: 0.1, stdDev: 0.15, impact: 'high' },
    { indicator: 'Germany ZEW Economic Sentiment', unit: '', baseActual: 12.5, baseForecast: 11.0, stdDev: 5.0, impact: 'medium' },
  ],
  China: [
    { indicator: 'Caixin Manufacturing PMI', unit: '', baseActual: 50.8, baseForecast: 50.5, stdDev: 0.8, impact: 'high' },
    { indicator: 'GDP YoY', unit: '%', baseActual: 5.2, baseForecast: 5.0, stdDev: 0.3, impact: 'high' },
    { indicator: 'CPI YoY', unit: '%', baseActual: 0.3, baseForecast: 0.4, stdDev: 0.2, impact: 'medium' },
    { indicator: 'Industrial Production YoY', unit: '%', baseActual: 6.1, baseForecast: 5.8, stdDev: 0.5, impact: 'medium' },
    { indicator: 'Retail Sales YoY', unit: '%', baseActual: 7.4, baseForecast: 7.0, stdDev: 0.6, impact: 'medium' },
  ],
  Japan: [
    { indicator: 'Tankan Large Mfg Index', unit: '', baseActual: 12, baseForecast: 11, stdDev: 3, impact: 'high' },
    { indicator: 'CPI YoY', unit: '%', baseActual: 2.8, baseForecast: 2.7, stdDev: 0.2, impact: 'high' },
    { indicator: 'GDP QoQ Annualized', unit: '%', baseActual: 1.2, baseForecast: 1.0, stdDev: 0.5, impact: 'high' },
    { indicator: 'Jibun Bank Manufacturing PMI', unit: '', baseActual: 48.2, baseForecast: 48.5, stdDev: 0.8, impact: 'medium' },
  ],
  UK: [
    { indicator: 'CPI YoY', unit: '%', baseActual: 3.9, baseForecast: 3.8, stdDev: 0.2, impact: 'high' },
    { indicator: 'S&P Global Manufacturing PMI', unit: '', baseActual: 47.2, baseForecast: 47.5, stdDev: 1.0, impact: 'medium' },
    { indicator: 'GDP MoM', unit: '%', baseActual: 0.2, baseForecast: 0.1, stdDev: 0.15, impact: 'high' },
    { indicator: 'Retail Sales MoM', unit: '%', baseActual: 0.3, baseForecast: 0.2, stdDev: 0.4, impact: 'medium' },
  ],
};

const COUNTRIES = ['US', 'EU', 'China', 'Japan', 'UK'];

const CATEGORIES = ['growth', 'inflation', 'employment', 'housing', 'manufacturing', 'consumer'] as const;

const UPCOMING_INDICATORS = [
  { country: 'US', indicator: 'Nonfarm Payrolls', importance: 'high' as const, baseForecast: 200, unit: 'K', basePrev: 215 },
  { country: 'US', indicator: 'CPI YoY', importance: 'high' as const, baseForecast: 3.0, unit: '%', basePrev: 3.1 },
  { country: 'US', indicator: 'FOMC Rate Decision', importance: 'high' as const, baseForecast: 5.375, unit: '%', basePrev: 5.375 },
  { country: 'EU', indicator: 'ECB Rate Decision', importance: 'high' as const, baseForecast: 4.50, unit: '%', basePrev: 4.50 },
  { country: 'US', indicator: 'ISM Manufacturing PMI', importance: 'high' as const, baseForecast: 49.0, unit: '', basePrev: 49.5 },
  { country: 'China', indicator: 'Caixin Manufacturing PMI', importance: 'high' as const, baseForecast: 50.5, unit: '', basePrev: 50.8 },
  { country: 'Japan', indicator: 'BOJ Rate Decision', importance: 'high' as const, baseForecast: 0.10, unit: '%', basePrev: 0.10 },
  { country: 'US', indicator: 'Retail Sales MoM', importance: 'medium' as const, baseForecast: 0.3, unit: '%', basePrev: 0.4 },
  { country: 'UK', indicator: 'CPI YoY', importance: 'high' as const, baseForecast: 3.8, unit: '%', basePrev: 3.9 },
  { country: 'US', indicator: 'Core PCE MoM', importance: 'high' as const, baseForecast: 0.2, unit: '%', basePrev: 0.3 },
  { country: 'EU', indicator: 'Eurozone Composite PMI', importance: 'medium' as const, baseForecast: 48.0, unit: '', basePrev: 47.8 },
  { country: 'US', indicator: 'Initial Jobless Claims', importance: 'medium' as const, baseForecast: 220, unit: 'K', basePrev: 218 },
  { country: 'US', indicator: 'Durable Goods Orders MoM', importance: 'medium' as const, baseForecast: 0.3, unit: '%', basePrev: 0.5 },
  { country: 'Japan', indicator: 'CPI YoY', importance: 'medium' as const, baseForecast: 2.7, unit: '%', basePrev: 2.8 },
  { country: 'UK', indicator: 'GDP MoM', importance: 'medium' as const, baseForecast: 0.1, unit: '%', basePrev: 0.2 },
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RELEASE_TIMES = ['08:30', '09:00', '09:45', '10:00', '13:00', '14:00', '02:00', '03:00', '04:00', '05:00'];

// -- Cache --


let cache: { data: unknown; ts: number } | null = null;

// -- Data generation --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-macro-surprise-tracker'));
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Surprise Index (8 regions)
  const surpriseIndex = REGIONS.map(region => {
    const currentIndex = round1((rng() - 0.45) * 120); // slight positive bias, range ~-60 to +66
    const previousWeek = round1(currentIndex + (rng() - 0.5) * 20);
    const previousMonth = round1(currentIndex + (rng() - 0.5) * 40);
    const delta = currentIndex - previousWeek;
    const direction = delta > 3 ? 'improving' as const : delta < -3 ? 'deteriorating' as const : 'stable' as const;
    const percentile = Math.round(50 + currentIndex * 0.45 + (rng() - 0.5) * 10);

    return {
      region,
      currentIndex,
      previousWeek,
      previousMonth,
      direction,
      percentile: Math.max(0, Math.min(100, percentile)),
    };
  });

  // 2. Recent Releases (15-20 entries)
  const releaseCount = 15 + Math.floor(rng() * 6);
  const recentReleases: {
    date: string;
    country: string;
    indicator: string;
    actual: number;
    forecast: number;
    previous: number;
    surprise: number;
    surpriseSigma: number;
    impact: 'high' | 'medium' | 'low';
  }[] = [];

  for (let i = 0; i < releaseCount; i++) {
    const country = pick(COUNTRIES);
    const indicators = INDICATORS_BY_COUNTRY[country];
    const indDef = pick(indicators);

    // Generate release date within the last 14 days
    const daysAgo = Math.floor(rng() * 14);
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() - daysAgo);
    const dateStr = releaseDate.toISOString().slice(0, 10);

    const forecast = round2(jitter(indDef.baseForecast, 0.04));
    const actual = round2(forecast + (rng() - 0.45) * indDef.stdDev * 2); // slight upside bias
    const previous = round2(jitter(indDef.baseActual, 0.03));
    const surprise = round2(actual - forecast);
    const surpriseSigma = round2(surprise / indDef.stdDev);

    recentReleases.push({
      date: dateStr,
      country,
      indicator: indDef.indicator,
      actual,
      forecast,
      previous,
      surprise,
      surpriseSigma,
      impact: indDef.impact,
    });
  }

  // Sort by date descending (most recent first)
  recentReleases.sort((a, b) => b.date.localeCompare(a.date));

  // 3. Category Breakdown (6 categories)
  const categoryBreakdown = CATEGORIES.map(category => {
    const avgSurprise = round2((rng() - 0.45) * 1.5); // range roughly -0.75 to +0.82
    const beatRate = round1(40 + rng() * 30); // 40-70%
    const trendRoll = rng();
    const recentTrend = trendRoll < 0.35 ? 'improving' as const : trendRoll < 0.7 ? 'worsening' as const : 'mixed' as const;

    return {
      category,
      avgSurprise,
      beatRate,
      recentTrend,
    };
  });

  // 4. Upcoming Releases (10 entries)
  const shuffled = [...UPCOMING_INDICATORS].sort(() => rng() - 0.5);
  const upcomingReleases = shuffled.slice(0, 10).map((item, idx) => {
    const daysAhead = Math.floor(rng() * 14) + 1 + idx;
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + daysAhead);
    const dateStr = releaseDate.toISOString().slice(0, 10);
    const time = pick(RELEASE_TIMES);

    return {
      date: dateStr,
      time,
      country: item.country,
      indicator: item.indicator,
      forecast: round2(jitter(item.baseForecast, 0.03)),
      previousValue: round2(jitter(item.basePrev, 0.02)),
      importance: item.importance,
    };
  });

  // Sort upcoming by date ascending
  upcomingReleases.sort((a, b) => a.date.localeCompare(b.date));

  // 5. Historical Trend (12 monthly points)
  const now = new Date();
  const historicalTrend: {
    month: string;
    usIndex: number;
    euIndex: number;
    cnIndex: number;
    globalIndex: number;
  }[] = [];

  // Generate a plausible random walk for each series
  let usVal = (rng() - 0.5) * 40;
  let euVal = (rng() - 0.5) * 40;
  let cnVal = (rng() - 0.5) * 40;

  for (let m = 11; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const monthStr = `${MONTHS_SHORT[monthDate.getMonth()]} ${String(monthDate.getFullYear()).slice(2)}`;

    // Random walk with mean reversion
    usVal = round1(usVal * 0.85 + (rng() - 0.48) * 30);
    euVal = round1(euVal * 0.85 + (rng() - 0.50) * 25);
    cnVal = round1(cnVal * 0.85 + (rng() - 0.47) * 28);

    // Clamp to -100, +100
    usVal = Math.max(-100, Math.min(100, usVal));
    euVal = Math.max(-100, Math.min(100, euVal));
    cnVal = Math.max(-100, Math.min(100, cnVal));

    const globalIndex = round1((usVal * 0.4 + euVal * 0.3 + cnVal * 0.3));

    historicalTrend.push({
      month: monthStr,
      usIndex: usVal,
      euIndex: euVal,
      cnIndex: cnVal,
      globalIndex,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    surpriseIndex,
    recentReleases,
    categoryBreakdown,
    upcomingReleases,
    historicalTrend,
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MacroSurpriseTracker] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate macro surprise tracker data' });
  }
});

export default router;
