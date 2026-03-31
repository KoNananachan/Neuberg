import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Static Data --

const GRAIN_DEFS = [
  { commodity: 'Corn', basePrice: 4.55, unit: '$/bu', exchange: 'CBOT', baseVolume: 285000 },
  { commodity: 'Soybeans', basePrice: 12.25, unit: '$/bu', exchange: 'CBOT', baseVolume: 195000 },
  { commodity: 'Wheat', basePrice: 6.00, unit: '$/bu', exchange: 'CBOT', baseVolume: 120000 },
  { commodity: 'Rice', basePrice: 17.50, unit: '$/cwt', exchange: 'CBOT', baseVolume: 8500 },
  { commodity: 'Oats', basePrice: 3.85, unit: '$/bu', exchange: 'CBOT', baseVolume: 4200 },
  { commodity: 'Soybean Oil', basePrice: 0.52, unit: '$/lb', exchange: 'CBOT', baseVolume: 135000 },
  { commodity: 'Soybean Meal', basePrice: 365.0, unit: '$/ton', exchange: 'CBOT', baseVolume: 110000 },
];

const SOFT_DEFS = [
  { commodity: 'Coffee', basePrice: 2.00, unit: '$/lb', exchange: 'ICE', baseVolume: 42000 },
  { commodity: 'Sugar', basePrice: 26.0, unit: '$/lb', exchange: 'ICE', baseVolume: 180000 },
  { commodity: 'Cocoa', basePrice: 6200, unit: '$/mt', exchange: 'ICE', baseVolume: 28000 },
  { commodity: 'Cotton', basePrice: 0.82, unit: '$/lb', exchange: 'ICE', baseVolume: 35000 },
  { commodity: 'Orange Juice', basePrice: 4.20, unit: '$/lb', exchange: 'ICE', baseVolume: 3800 },
  { commodity: 'Lumber', basePrice: 545.0, unit: '$/mbf', exchange: 'NYBOT', baseVolume: 2200 },
];

const WASDE_DEFS = [
  { commodity: 'Corn', baseProd: 1220, baseCons: 1195, baseStocks: 312 },
  { commodity: 'Soybeans', baseProd: 398, baseCons: 385, baseStocks: 114 },
  { commodity: 'Wheat', baseProd: 790, baseCons: 795, baseStocks: 267 },
  { commodity: 'Rice', baseProd: 520, baseCons: 518, baseStocks: 172 },
  { commodity: 'Cotton', baseProd: 25.5, baseCons: 24.8, baseStocks: 18.2 },
  { commodity: 'Sugar', baseProd: 182, baseCons: 178, baseStocks: 42 },
];

const EXPORT_DEFS = [
  { commodity: 'Corn', baseWeekly: 920, baseCumulative: 22500, usdaProjection: 54000 },
  { commodity: 'Soybeans', baseWeekly: 680, baseCumulative: 35200, usdaProjection: 49500 },
  { commodity: 'Wheat', baseWeekly: 310, baseCumulative: 12800, usdaProjection: 21500 },
  { commodity: 'Sorghum', baseWeekly: 145, baseCumulative: 3200, usdaProjection: 6500 },
  { commodity: 'Soymeal', baseWeekly: 265, baseCumulative: 6800, usdaProjection: 14200 },
];

const CROP_DEFS = [
  { crop: 'Corn', baseGE: 62, state: 'Iowa' },
  { crop: 'Soybeans', baseGE: 60, state: 'Illinois' },
  { crop: 'Winter Wheat', baseGE: 50, state: 'Kansas' },
  { crop: 'Spring Wheat', baseGE: 55, state: 'North Dakota' },
  { crop: 'Cotton', baseGE: 42, state: 'Texas' },
  { crop: 'Rice', baseGE: 68, state: 'Arkansas' },
];

const WEATHER_DEFS = [
  { region: 'US Midwest', cropsBase: ['Corn', 'Soybeans', 'Wheat'] },
  { region: 'Brazil Cerrado', cropsBase: ['Soybeans', 'Corn', 'Coffee'] },
  { region: 'Argentina Pampas', cropsBase: ['Soybeans', 'Corn', 'Wheat'] },
  { region: 'Black Sea', cropsBase: ['Wheat', 'Corn', 'Sunflower'] },
  { region: 'Australia', cropsBase: ['Wheat', 'Cotton', 'Canola'] },
];

const CONDITIONS = ['drought', 'flood', 'normal', 'favorable'] as const;
const SEVERITIES = ['low', 'medium', 'high'] as const;

// -- Cache --


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

// -- Generator --

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-agricultural-commodities'));

  // ---- 1. Grain Prices ----
  const grainPrices = GRAIN_DEFS.map(g => {
    const price = round(jitter(g.basePrice, 0.06, rng), g.basePrice < 1 ? 4 : 2);
    const change = round((rng() - 0.48) * g.basePrice * 0.04, g.basePrice < 1 ? 4 : 2);
    const changePercent = round((change / (price - change)) * 100, 2);
    const volume = Math.round(jitter(g.baseVolume, 0.3, rng));

    return {
      commodity: g.commodity,
      price,
      change,
      changePercent,
      volume,
      exchange: g.exchange,
      unit: g.unit,
    };
  });

  // ---- 2. Soft Commodities ----
  const softCommodities = SOFT_DEFS.map(s => {
    const price = round(jitter(s.basePrice, 0.08, rng), s.basePrice < 1 ? 4 : 2);
    const change = round((rng() - 0.48) * s.basePrice * 0.05, s.basePrice < 1 ? 4 : 2);
    const changePercent = round((change / (price - change)) * 100, 2);
    const volume = Math.round(jitter(s.baseVolume, 0.35, rng));

    return {
      commodity: s.commodity,
      price,
      change,
      changePercent,
      volume,
      exchange: s.exchange,
      unit: s.unit,
    };
  });

  // ---- 3. USDA Supply/Demand (WASDE) ----
  const usdaSupplyDemand = WASDE_DEFS.map(w => {
    const production = round(jitter(w.baseProd, 0.04, rng), 1);
    const consumption = round(jitter(w.baseCons, 0.04, rng), 1);
    const endingStocks = round(jitter(w.baseStocks, 0.08, rng), 1);
    const stocksToUse = round((endingStocks / consumption) * 100, 1);
    const changeFromPrior = round((rng() - 0.48) * w.baseStocks * 0.06, 1);

    return {
      commodity: w.commodity,
      production,
      consumption,
      endingStocks,
      stocksToUse,
      changeFromPrior,
    };
  });

  // ---- 4. Export Inspections ----
  const exportInspections = EXPORT_DEFS.map(e => {
    const weeklyInspections = round(jitter(e.baseWeekly, 0.2, rng), 0);
    const priorWeek = round(jitter(e.baseWeekly, 0.2, rng), 0);
    const yearAgo = round(jitter(e.baseWeekly, 0.15, rng), 0);
    const cumulativeYTD = round(jitter(e.baseCumulative, 0.08, rng), 0);
    const paceVsUSDA = round((cumulativeYTD / e.usdaProjection) * 100, 1);

    return {
      commodity: e.commodity,
      weeklyInspections,
      priorWeek,
      yearAgo,
      cumulativeYTD,
      paceVsUSDA,
    };
  });

  // ---- 5. Crop Conditions ----
  const cropConditions = CROP_DEFS.map(c => {
    const goodExcellent = Math.round(jitter(c.baseGE, 0.1, rng));
    const fairPoorVeryPoor = 100 - goodExcellent;
    const weekAgoGE = Math.round(jitter(c.baseGE, 0.06, rng));
    const yearAgoGE = Math.round(jitter(c.baseGE, 0.12, rng));

    return {
      crop: c.crop,
      goodExcellent,
      fairPoorVeryPoor,
      weekAgoGE,
      yearAgoGE,
      state: c.state,
    };
  });

  // ---- 6. Weather Impact ----
  const weatherImpact = WEATHER_DEFS.map(w => {
    const condition = pick(CONDITIONS, rng);
    const severity = condition === 'normal' || condition === 'favorable'
      ? 'low' as const
      : pick(SEVERITIES, rng);
    // Select 1-3 impacted crops from the region's crop list
    const cropCount = Math.min(w.cropsBase.length, 1 + Math.floor(rng() * w.cropsBase.length));
    const impactedCrops = w.cropsBase.slice(0, cropCount);

    return {
      region: w.region,
      condition,
      impactedCrops,
      severity,
    };
  });

  return {
    grainPrices,
    softCommodities,
    usdaSupplyDemand,
    exportInspections,
    cropConditions,
    weatherImpact,
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
    console.error('[AgriculturalCommodities] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate agricultural commodities data' });
  }
});

export default router;
