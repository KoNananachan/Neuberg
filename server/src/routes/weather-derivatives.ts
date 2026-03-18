import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// -- Static Data --

const CITIES = [
  { city: 'New York', lat: 40.71, avgWinterTemp: 33, avgSummerTemp: 76 },
  { city: 'Chicago', lat: 41.88, avgWinterTemp: 26, avgSummerTemp: 73 },
  { city: 'London', lat: 51.51, avgWinterTemp: 40, avgSummerTemp: 64 },
  { city: 'Tokyo', lat: 35.68, avgWinterTemp: 41, avgSummerTemp: 79 },
  { city: 'Frankfurt', lat: 50.11, avgWinterTemp: 34, avgSummerTemp: 66 },
  { city: 'Sydney', lat: -33.87, avgWinterTemp: 53, avgSummerTemp: 72 },
  { city: 'Toronto', lat: 43.65, avgWinterTemp: 23, avgSummerTemp: 71 },
  { city: 'Houston', lat: 29.76, avgWinterTemp: 52, avgSummerTemp: 84 },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STRATEGY_DEFS = [
  { strategy: 'HDD Collar', notionalBase: 5_000_000, premiumPct: 0.025, payoutMult: 3.5 },
  { strategy: 'CDD Swap', notionalBase: 8_000_000, premiumPct: 0.018, payoutMult: 2.8 },
  { strategy: 'Seasonal Strip', notionalBase: 12_000_000, premiumPct: 0.032, payoutMult: 4.0 },
  { strategy: 'Basis Swap', notionalBase: 3_500_000, premiumPct: 0.015, payoutMult: 2.2 },
  { strategy: 'Temperature Put', notionalBase: 6_000_000, premiumPct: 0.028, payoutMult: 3.0 },
  { strategy: 'Dual-Trigger', notionalBase: 10_000_000, premiumPct: 0.042, payoutMult: 5.5 },
];

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Helpers --

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Sinusoidal monthly normal temperature approximation
// For southern hemisphere (negative lat), phase is shifted by 6 months
function getMonthlyNormalTemp(city: typeof CITIES[number], month: number): number {
  const amplitude = (city.avgSummerTemp - city.avgWinterTemp) / 2;
  const midpoint = (city.avgSummerTemp + city.avgWinterTemp) / 2;
  const phaseShift = city.lat < 0 ? 0 : 6; // Southern hemisphere: warmest in Jan
  return midpoint + amplitude * Math.cos(((month - phaseShift) / 12) * 2 * Math.PI);
}

function getSeason(month: number): 'Heating' | 'Cooling' {
  // Nov-Mar heating, Apr-Oct cooling (simplified)
  if (month >= 10 || month <= 2) return 'Heating';
  return 'Cooling';
}

// -- Generator --

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-weather-derivatives'));

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const season = getSeason(currentMonth);

  // ---- 1. HDD/CDD Contracts ----
  const hddCddContracts = CITIES.map(c => {
    const normalTemp = getMonthlyNormalTemp(c, currentMonth);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Determine contract type based on temperature relative to 65F baseline
    const isHeating = normalTemp < 65;
    const type = isHeating ? 'HDD' : 'CDD';

    // Calculate base degree days for the month
    const baseDD = isHeating
      ? Math.max(0, 65 - normalTemp) * daysInMonth
      : Math.max(0, normalTemp - 65) * daysInMonth;

    const strike = Math.round(jitter(baseDD, 0.05, rng));
    const last = Math.round(jitter(baseDD, 0.08, rng));
    const change = round((rng() - 0.48) * baseDD * 0.04, 1);
    const changePercent = baseDD > 0 ? round((change / Math.max(last, 1)) * 100, 2) : 0;
    const volume = Math.round(jitter(1200, 0.35, rng));
    const openInterest = Math.round(jitter(4500, 0.25, rng));

    // Implied temperature from last traded price
    const impliedTemp = isHeating
      ? round(65 - last / daysInMonth, 1)
      : round(65 + last / daysInMonth, 1);

    return {
      city: c.city,
      type,
      month: `${MONTH_NAMES[currentMonth]} ${currentYear}`,
      strike,
      last,
      change,
      changePercent,
      volume,
      openInterest,
      impliedTemp,
    };
  });

  // ---- 2. Seasonal Patterns (12 months) ----
  // Use a "composite" city (average of all cities) for seasonal pattern display
  const seasonalPatterns = MONTH_NAMES.map((name, m) => {
    // Average normal temp across all northern-hemisphere cities for monthly pattern
    const northernCities = CITIES.filter(c => c.lat > 0);
    const avgTemp = northernCities.reduce((sum, c) => sum + getMonthlyNormalTemp(c, m), 0) / northernCities.length;

    const avgHDD = Math.round(Math.max(0, 65 - avgTemp) * 30); // approximate 30-day month
    const avgCDD = Math.round(Math.max(0, avgTemp - 65) * 30);
    const maxDeviation = Math.round(jitter(Math.max(avgHDD, avgCDD) * 0.18, 0.2, rng));
    const currentDeviation = round((rng() - 0.5) * maxDeviation * 1.4, 1);
    const percentile = Math.round(jitter(50, 0.4, rng));

    return {
      month: name,
      avgHDD,
      avgCDD,
      maxDeviation,
      currentDeviation,
      percentile: Math.max(1, Math.min(99, percentile)),
    };
  });

  // ---- 3. City Pricing ----
  const cityPricing = CITIES.map(c => {
    const normalTemp = round(getMonthlyNormalTemp(c, currentMonth), 1);
    const currentTemp = round(jitter(normalTemp, 0.08, rng), 1);
    const deviation = round(currentTemp - normalTemp, 1);

    // Premium scales with absolute deviation; higher deviation = higher premium
    const absDeviation = Math.abs(deviation);
    const hddPremium = round(jitter(0.12 + absDeviation * 0.015, 0.2, rng), 3);
    const cddPremium = round(jitter(0.10 + absDeviation * 0.012, 0.2, rng), 3);

    // Volatility: percentage of normal temp range; higher latitude = higher vol
    const volatility = round(jitter(12 + Math.abs(c.lat) * 0.15, 0.15, rng), 1);

    // Correlation to natural gas: heating-heavy cities correlate more in winter
    const baseCorr = normalTemp < 50 ? 0.72 : normalTemp < 65 ? 0.45 : 0.28;
    const correlation = round(jitter(baseCorr, 0.12, rng), 2);

    return {
      city: c.city,
      currentTemp,
      normalTemp,
      deviation,
      hddPremium,
      cddPremium,
      volatility,
      correlation,
    };
  });

  // ---- 4. Hedging Strategies ----
  const statuses = ['Active', 'Quoted', 'Expired'] as const;
  const hedgingStrategies = STRATEGY_DEFS.map((s, i) => {
    const notional = Math.round(jitter(s.notionalBase, 0.2, rng));
    const premium = Math.round(notional * jitter(s.premiumPct, 0.15, rng));
    const maxPayout = Math.round(notional * jitter(s.payoutMult, 0.1, rng));

    // Breakeven: degree days where payout covers premium
    const breakeven = Math.round(jitter(120 + i * 25, 0.15, rng));

    const daysToExpiry = Math.max(0, Math.round(jitter(90, 0.6, rng)));

    // Distribute statuses: mostly Active, some Quoted, occasionally Expired
    let status: typeof statuses[number];
    if (daysToExpiry === 0) {
      status = 'Expired';
    } else {
      const r = rng();
      status = r < 0.55 ? 'Active' : r < 0.85 ? 'Quoted' : 'Expired';
    }

    return {
      strategy: s.strategy,
      notional,
      premium,
      maxPayout,
      breakeven,
      daysToExpiry,
      status,
    };
  });

  // ---- 5. Market Summary ----
  const totalNotional = round(jitter(2.8, 0.15, rng), 2);
  const activeContracts = hddCddContracts.reduce((sum, c) => sum + c.openInterest, 0);
  const avgVolatility = round(cityPricing.reduce((sum, c) => sum + c.volatility, 0) / cityPricing.length, 1);
  const dominantSeason = season;

  // Most active city by volume
  const mostActiveCity = hddCddContracts.reduce((best, c) =>
    c.volume > best.volume ? c : best
  ).city;

  const yoyGrowth = round(jitter(14.5, 0.3, rng), 1);

  const marketSummary = {
    totalNotional,
    totalNotionalUnit: 'B USD',
    activeContracts,
    avgVolatility,
    dominantSeason,
    mostActiveCity,
    yoyGrowth,
    yoyGrowthUnit: '%',
  };

  return {
    marketSummary,
    hddCddContracts,
    seasonalPatterns,
    cityPricing,
    hedgingStrategies,
    generatedAt: new Date().toISOString(),
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
    console.error('[WeatherDerivatives] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate weather derivatives data' });
  }
});

export default router;
