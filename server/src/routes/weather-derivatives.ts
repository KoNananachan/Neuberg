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
  { city: 'Chicago', lat: 41.88, unit: 'F' as const, avgWinterTemp: 26, avgSummerTemp: 73 },
  { city: 'New York', lat: 40.71, unit: 'F' as const, avgWinterTemp: 33, avgSummerTemp: 76 },
  { city: 'London', lat: 51.51, unit: 'C' as const, avgWinterTemp: 5, avgSummerTemp: 18 },
  { city: 'Tokyo', lat: 35.68, unit: 'C' as const, avgWinterTemp: 5, avgSummerTemp: 26 },
  { city: 'Houston', lat: 29.76, unit: 'F' as const, avgWinterTemp: 52, avgSummerTemp: 84 },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PRECIP_REGIONS = [
  { region: 'US Midwest', type: 'rainfall' as const, baseLevel: 3.8, strikeBase: 4.2 },
  { region: 'US Gulf Coast', type: 'rainfall' as const, baseLevel: 5.1, strikeBase: 5.5 },
  { region: 'UK South', type: 'rainfall' as const, baseLevel: 2.4, strikeBase: 2.8 },
  { region: 'Japan Kanto', type: 'rainfall' as const, baseLevel: 5.6, strikeBase: 6.0 },
  { region: 'US Northeast', type: 'snowfall' as const, baseLevel: 12.5, strikeBase: 14.0 },
  { region: 'US Great Lakes', type: 'snowfall' as const, baseLevel: 18.2, strikeBase: 20.0 },
  { region: 'Northern Europe', type: 'rainfall' as const, baseLevel: 2.1, strikeBase: 2.5 },
];

const WEATHER_INDICES = [
  { indexName: 'CME US Composite HDD Index', baseValue: 1850, trend: 'cooling' as const },
  { indexName: 'CME US Composite CDD Index', baseValue: 620, trend: 'warming' as const },
  { indexName: 'Bloomberg Wind Chill Index', baseValue: 42.5, trend: 'stable' as const },
  { indexName: 'Wx Global Temperature Anomaly', baseValue: 1.28, trend: 'warming' as const },
  { indexName: 'NOAA Drought Severity Index', baseValue: -1.45, trend: 'stable' as const },
  { indexName: 'CME European HDD Index', baseValue: 1420, trend: 'cooling' as const },
];

const CAT_BOND_DEFS = [
  { name: 'Windstorm Re 2026-1', trigger: 'Cat 3+ hurricane US landfall', couponBase: 8.25, priceBase: 101.5, spreadBase: 625 },
  { name: 'Polar Vortex Re 2025-2', trigger: 'HDD > 4500 Chicago Nov-Mar', couponBase: 6.50, priceBase: 103.2, spreadBase: 480 },
  { name: 'Heatwave Re 2026-1', trigger: 'CDD > 2800 US composite Jun-Sep', couponBase: 5.75, priceBase: 99.8, spreadBase: 410 },
  { name: 'Monsoon Re 2025-3', trigger: 'Cumulative rainfall > 2000mm Mumbai Jul-Sep', couponBase: 7.80, priceBase: 97.5, spreadBase: 580 },
  { name: 'Frost Re 2026-1', trigger: 'Freeze days > 45 Florida citrus belt', couponBase: 9.10, priceBase: 104.1, spreadBase: 720 },
  { name: 'Drought Re 2025-1', trigger: 'Palmer Index < -4.0 US Great Plains', couponBase: 7.25, priceBase: 100.3, spreadBase: 540 },
];

const SEASONAL_REGIONS = [
  { region: 'US Northeast', impactedCommodities: ['Natural Gas', 'Heating Oil', 'Electricity'] },
  { region: 'US Midwest', impactedCommodities: ['Corn', 'Soybeans', 'Wheat'] },
  { region: 'US Southeast', impactedCommodities: ['Cotton', 'Orange Juice', 'Electricity'] },
  { region: 'US Southwest', impactedCommodities: ['Cattle', 'Electricity', 'Water'] },
  { region: 'Northern Europe', impactedCommodities: ['Natural Gas', 'Wind Power', 'Wheat'] },
  { region: 'East Asia', impactedCommodities: ['Rice', 'LNG', 'Electricity'] },
];

const STATUSES = ['active', 'triggered', 'expired'] as const;
const TEMP_OUTLOOKS = ['above', 'below', 'normal'] as const;
const PRECIP_OUTLOOKS = ['above', 'below', 'normal'] as const;

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
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

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

// Sinusoidal monthly normal temperature approximation
function getMonthlyNormalTemp(city: typeof CITIES[number], month: number): number {
  const amplitude = (city.avgSummerTemp - city.avgWinterTemp) / 2;
  const midpoint = (city.avgSummerTemp + city.avgWinterTemp) / 2;
  // Northern hemisphere: warmest around July (month 6)
  return midpoint + amplitude * Math.cos(((month - 6) / 12) * 2 * Math.PI);
}

// Convert Fahrenheit to Celsius
function fToC(f: number): number {
  return round((f - 32) * 5 / 9, 1);
}

// -- Generator --

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-weather-derivatives'));

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ---- 1. Temperature Contracts (HDD/CDD) ----
  const temperatureContracts = CITIES.map(c => {
    // Get normal temp in the city's native unit
    const normalTemp = getMonthlyNormalTemp(c, currentMonth);
    const currentTemp = round(jitter(normalTemp, 0.08, rng), 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // For HDD/CDD base: 65F for US cities, 18C for non-US
    const base = c.unit === 'F' ? 65 : 18;
    const isHeating = currentTemp < base;
    const contractType = isHeating ? 'HDD' : 'CDD';

    // Strike temperature: seasonal normal with slight offset
    const strikeTemp = round(jitter(normalTemp, 0.03, rng), 1);

    // Calculate degree days
    const degreeDays = isHeating
      ? Math.max(0, base - normalTemp) * daysInMonth
      : Math.max(0, normalTemp - base) * daysInMonth;

    // Premium in basis points (50-350 bps), scales with deviation from normal
    const deviation = Math.abs(currentTemp - normalTemp);
    const premiumBase = c.unit === 'F'
      ? 120 + deviation * 8
      : 120 + deviation * 15;
    const premium = Math.round(jitter(premiumBase, 0.2, rng));

    const openInterest = Math.round(jitter(4200, 0.3, rng));
    const volume = Math.round(jitter(1100, 0.4, rng));

    // Forward months (current + next 2)
    const months: string[] = [];
    for (let i = 0; i < 3; i++) {
      const m = (currentMonth + i) % 12;
      const y = currentYear + (currentMonth + i >= 12 ? 1 : 0);
      months.push(`${MONTH_NAMES[m]} ${y}`);
    }

    return {
      city: c.city,
      contractType,
      month: months[0],
      strikeTemp,
      currentTemp,
      premium,
      openInterest,
      volume,
      unit: c.unit === 'F' ? 'F' : 'C',
      baseTemp: base,
      degreeDays: Math.round(degreeDays),
    };
  });

  // ---- 2. Precipitation Contracts ----
  const precipitationContracts = PRECIP_REGIONS.map(r => {
    const currentLevel = round(jitter(r.baseLevel, 0.15, rng), 2);
    const strikeLevel = round(jitter(r.strikeBase, 0.05, rng), 2);
    const premium = Math.round(jitter(85, 0.35, rng));
    const change = round((rng() - 0.48) * 18, 1);

    const period = r.type === 'snowfall'
      ? `${MONTH_NAMES[(currentMonth + 11) % 12]}-${MONTH_NAMES[(currentMonth + 2) % 12]} ${currentYear}`
      : `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    return {
      region: r.region,
      type: r.type,
      period,
      strikeLevel,
      currentLevel,
      premium,
      change,
      unit: r.type === 'rainfall' ? 'inches' : 'inches',
    };
  });

  // ---- 3. Weather Index ----
  const weatherIndex = WEATHER_INDICES.map(idx => {
    const value = round(jitter(idx.baseValue, 0.08, rng), 2);
    const change = round((rng() - 0.48) * Math.abs(idx.baseValue) * 0.03, 2);
    const percentile = Math.max(1, Math.min(99, Math.round(jitter(50, 0.4, rng))));

    return {
      indexName: idx.indexName,
      value,
      change,
      percentile,
      trend: idx.trend,
    };
  });

  // ---- 4. Catastrophe Bonds ----
  const catastropheBonds = CAT_BOND_DEFS.map(bond => {
    const coupon = round(jitter(bond.couponBase, 0.08, rng), 2);
    const price = round(jitter(bond.priceBase, 0.03, rng), 2);
    const spread = Math.round(jitter(bond.spreadBase, 0.1, rng));

    // Maturity: 1-3 years out
    const maturityYear = currentYear + Math.floor(rangef(1, 3.5, rng));
    const maturityMonth = Math.floor(rng() * 12) + 1;
    const maturityDate = `${maturityYear}-${String(maturityMonth).padStart(2, '0')}-15`;

    // Status weighted: mostly active
    let status: typeof STATUSES[number];
    const r = rng();
    if (r < 0.70) status = 'active';
    else if (r < 0.88) status = 'triggered';
    else status = 'expired';

    return {
      name: bond.name,
      trigger: bond.trigger,
      coupon,
      price,
      spread,
      maturityDate,
      status,
    };
  });

  // ---- 5. Seasonal Outlook ----
  const seasonalOutlook = SEASONAL_REGIONS.map(sr => {
    const tempOutlook = pick(TEMP_OUTLOOKS, rng);
    const precipOutlook = pick(PRECIP_OUTLOOKS, rng);
    const confidence = Math.round(jitter(62, 0.25, rng));

    return {
      region: sr.region,
      tempOutlook,
      precipOutlook,
      confidence: Math.max(30, Math.min(95, confidence)),
      impactedCommodities: sr.impactedCommodities,
    };
  });

  return {
    temperatureContracts,
    precipitationContracts,
    weatherIndex,
    catastropheBonds,
    seasonalOutlook,
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
