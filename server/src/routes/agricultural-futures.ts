import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Static Data --

interface CommodityDef {
  name: string;
  symbol: string;
  basePrice: number;
  unit: string;
  exchange: string;
  tickSize: number;
  contractSize: string;
  baseVolume: number;
  baseOI: number;
  decimals: number;
  category: 'grain' | 'soft' | 'livestock';
  monthCodes: string[];
}

const COMMODITY_DEFS: CommodityDef[] = [
  // Grains
  { name: 'Corn', symbol: 'ZC', basePrice: 4.95, unit: '$/bu', exchange: 'CBOT', tickSize: 0.0025, contractSize: '5,000 bu', baseVolume: 295000, baseOI: 1520000, decimals: 2, category: 'grain', monthCodes: ['H', 'K', 'N', 'U', 'Z'] },
  { name: 'Wheat', symbol: 'ZW', basePrice: 6.25, unit: '$/bu', exchange: 'CBOT', tickSize: 0.0025, contractSize: '5,000 bu', baseVolume: 125000, baseOI: 420000, decimals: 2, category: 'grain', monthCodes: ['H', 'K', 'N', 'U', 'Z'] },
  { name: 'Soybeans', symbol: 'ZS', basePrice: 12.60, unit: '$/bu', exchange: 'CBOT', tickSize: 0.0025, contractSize: '5,000 bu', baseVolume: 198000, baseOI: 780000, decimals: 2, category: 'grain', monthCodes: ['F', 'H', 'K', 'N', 'Q', 'U', 'X'] },
  { name: 'Soybean Oil', symbol: 'ZL', basePrice: 0.4850, unit: '$/lb', exchange: 'CBOT', tickSize: 0.0001, contractSize: '60,000 lbs', baseVolume: 140000, baseOI: 520000, decimals: 4, category: 'grain', monthCodes: ['F', 'H', 'K', 'N', 'Q', 'U', 'V', 'Z'] },
  { name: 'Soybean Meal', symbol: 'ZM', basePrice: 370.0, unit: '$/ton', exchange: 'CBOT', tickSize: 0.10, contractSize: '100 tons', baseVolume: 115000, baseOI: 480000, decimals: 1, category: 'grain', monthCodes: ['F', 'H', 'K', 'N', 'Q', 'U', 'V', 'Z'] },
  { name: 'Oats', symbol: 'ZO', basePrice: 3.75, unit: '$/bu', exchange: 'CBOT', tickSize: 0.0025, contractSize: '5,000 bu', baseVolume: 4500, baseOI: 8200, decimals: 2, category: 'grain', monthCodes: ['H', 'K', 'N', 'U', 'Z'] },
  { name: 'Rice', symbol: 'ZR', basePrice: 17.20, unit: '$/cwt', exchange: 'CBOT', tickSize: 0.005, contractSize: '2,000 cwt', baseVolume: 8800, baseOI: 12500, decimals: 2, category: 'grain', monthCodes: ['F', 'H', 'K', 'N', 'U', 'X'] },
  // Softs
  { name: 'Sugar', symbol: 'SB', basePrice: 24.50, unit: 'cents/lb', exchange: 'ICE', tickSize: 0.01, contractSize: '112,000 lbs', baseVolume: 185000, baseOI: 920000, decimals: 2, category: 'soft', monthCodes: ['H', 'K', 'N', 'V'] },
  { name: 'Coffee', symbol: 'KC', basePrice: 215.0, unit: 'cents/lb', exchange: 'ICE', tickSize: 0.05, contractSize: '37,500 lbs', baseVolume: 48000, baseOI: 260000, decimals: 2, category: 'soft', monthCodes: ['H', 'K', 'N', 'U', 'Z'] },
  { name: 'Cocoa', symbol: 'CC', basePrice: 6350.0, unit: '$/mt', exchange: 'ICE', tickSize: 1.0, contractSize: '10 mt', baseVolume: 30000, baseOI: 195000, decimals: 0, category: 'soft', monthCodes: ['H', 'K', 'N', 'U', 'Z'] },
  { name: 'Cotton', symbol: 'CT', basePrice: 0.8250, unit: '$/lb', exchange: 'ICE', tickSize: 0.0001, contractSize: '50,000 lbs', baseVolume: 38000, baseOI: 210000, decimals: 4, category: 'soft', monthCodes: ['H', 'K', 'N', 'V', 'Z'] },
  { name: 'Orange Juice', symbol: 'OJ', basePrice: 4.35, unit: '$/lb', exchange: 'ICE', tickSize: 0.0005, contractSize: '15,000 lbs', baseVolume: 4000, baseOI: 12000, decimals: 4, category: 'soft', monthCodes: ['F', 'H', 'K', 'N', 'U', 'X'] },
  // Livestock
  { name: 'Live Cattle', symbol: 'LE', basePrice: 192.50, unit: 'cents/lb', exchange: 'CME', tickSize: 0.025, contractSize: '40,000 lbs', baseVolume: 55000, baseOI: 310000, decimals: 2, category: 'livestock', monthCodes: ['G', 'J', 'M', 'Q', 'V', 'Z'] },
  { name: 'Feeder Cattle', symbol: 'GF', basePrice: 262.0, unit: 'cents/lb', exchange: 'CME', tickSize: 0.025, contractSize: '50,000 lbs', baseVolume: 18000, baseOI: 72000, decimals: 2, category: 'livestock', monthCodes: ['F', 'H', 'J', 'K', 'Q', 'U', 'V', 'X'] },
  { name: 'Lean Hogs', symbol: 'HE', basePrice: 88.50, unit: 'cents/lb', exchange: 'CME', tickSize: 0.025, contractSize: '40,000 lbs', baseVolume: 42000, baseOI: 240000, decimals: 2, category: 'livestock', monthCodes: ['G', 'J', 'K', 'M', 'N', 'Q', 'V', 'Z'] },
];

const MONTH_CODE_MAP: Record<string, string> = {
  F: 'Jan', G: 'Feb', H: 'Mar', J: 'Apr', K: 'May', M: 'Jun',
  N: 'Jul', Q: 'Aug', U: 'Sep', V: 'Oct', X: 'Nov', Z: 'Dec',
};

const MONTH_ORDER = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

const CROP_CONDITION_DEFS = [
  { crop: 'Corn', baseGood: 57, baseExcellent: 12 },
  { crop: 'Soybeans', baseGood: 55, baseExcellent: 11 },
  { crop: 'Wheat', baseGood: 44, baseExcellent: 9 },
  { crop: 'Cotton', baseGood: 38, baseExcellent: 8 },
];

const EXPORT_INSPECTION_DEFS = [
  { commodity: 'Corn', baseWeekly: 920, baseYearAgo: 870 },
  { commodity: 'Soybeans', baseWeekly: 680, baseYearAgo: 720 },
  { commodity: 'Wheat', baseWeekly: 310, baseYearAgo: 295 },
  { commodity: 'Soybean Meal', baseWeekly: 265, baseYearAgo: 245 },
  { commodity: 'Sorghum', baseWeekly: 145, baseYearAgo: 130 },
];

const GROWING_REGIONS = [
  { name: 'Western Corn Belt', states: 'IA, NE, MN, SD', baseD0: 15, baseD1: 8, baseD2: 3 },
  { name: 'Eastern Corn Belt', states: 'IL, IN, OH', baseD0: 12, baseD1: 5, baseD2: 2 },
  { name: 'Southern Plains', states: 'TX, OK, KS', baseD0: 28, baseD1: 18, baseD2: 10 },
  { name: 'Delta', states: 'AR, MS, LA', baseD0: 18, baseD1: 9, baseD2: 4 },
  { name: 'Southeast', states: 'GA, AL, SC, NC', baseD0: 14, baseD1: 7, baseD2: 3 },
  { name: 'Northern Plains', states: 'ND, SD, MT', baseD0: 20, baseD1: 12, baseD2: 6 },
];

const FORWARD_CURVE_SYMBOLS = ['ZC', 'ZW', 'ZS', 'KC', 'LE', 'HE'];

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

function getSeasonalPattern(month: number, category: string): string {
  if (category !== 'grain') return 'N/A';
  if (month >= 3 && month <= 5) return 'planting';
  if (month >= 6 && month <= 8) return 'growing';
  if (month >= 9 && month <= 11) return 'harvest';
  return 'dormant';
}

function getFrontMonthCode(monthCodes: string[], currentMonth: number): { front: string; next: string } {
  const currentMonthIndex = currentMonth - 1; // 0-based
  const currentCode = MONTH_ORDER[currentMonthIndex];
  const currentPos = MONTH_ORDER.indexOf(currentCode);

  let frontIdx = -1;
  let nextIdx = -1;
  for (let i = 0; i < monthCodes.length; i++) {
    const codePos = MONTH_ORDER.indexOf(monthCodes[i]);
    if (codePos >= currentPos && frontIdx === -1) {
      frontIdx = i;
      nextIdx = (i + 1) % monthCodes.length;
      break;
    }
  }
  if (frontIdx === -1) {
    frontIdx = 0;
    nextIdx = 1;
  }

  return { front: monthCodes[frontIdx], next: monthCodes[nextIdx] };
}

// -- Generator --

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('agricultural-futures-' + day));
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const yearSuffix = String(currentYear).slice(-2);
  const nextYearSuffix = String(currentYear + 1).slice(-2);

  // ---- 1. Commodity Futures ----
  const commodities = COMMODITY_DEFS.map(c => {
    const price = round(jitter(c.basePrice, 0.06, rng), c.decimals);
    const change1D = round((rng() - 0.48) * c.basePrice * 0.025, c.decimals);
    const change1DPct = round((change1D / (price - change1D)) * 100, 2);
    const change1W = round((rng() - 0.47) * c.basePrice * 0.045, c.decimals);
    const change1WPct = round((change1W / (price - change1W)) * 100, 2);
    const change1M = round((rng() - 0.46) * c.basePrice * 0.08, c.decimals);
    const change1MPct = round((change1M / (price - change1M)) * 100, 2);
    const changeYTD = round((rng() - 0.45) * c.basePrice * 0.15, c.decimals);
    const changeYTDPct = round((changeYTD / (price - changeYTD)) * 100, 2);

    const { front, next } = getFrontMonthCode(c.monthCodes, currentMonth);
    const frontMonthPos = MONTH_ORDER.indexOf(front);
    const currentMonthPos = MONTH_ORDER.indexOf(MONTH_ORDER[currentMonth - 1]);
    const frontYear = frontMonthPos < currentMonthPos ? nextYearSuffix : yearSuffix;
    const nextMonthPos = MONTH_ORDER.indexOf(next);
    const nextYear = nextMonthPos <= frontMonthPos ? nextYearSuffix : frontYear;

    const nearbyContract = `${c.symbol}${front}${frontYear}`;
    const nextContract = `${c.symbol}${next}${nextYear}`;

    const nextPrice = round(price * (1 + (rng() - 0.45) * 0.03), c.decimals);
    const calendarSpread = round(price - nextPrice, c.decimals);

    const basisOffset = (rng() - 0.5) * c.basePrice * 0.04;
    const cashPrice = round(price + basisOffset, c.decimals);
    const basis = round(cashPrice - price, c.decimals);

    const high52W = round(price * (1 + rng() * 0.18 + 0.02), c.decimals);
    const low52W = round(price * (1 - rng() * 0.18 - 0.02), c.decimals);

    const openInterest = Math.round(jitter(c.baseOI, 0.15, rng));
    const volume = Math.round(jitter(c.baseVolume, 0.3, rng));

    const seasonalPattern = getSeasonalPattern(currentMonth, c.category);

    return {
      name: c.name,
      symbol: c.symbol,
      category: c.category,
      exchange: c.exchange,
      unit: c.unit,
      contractSize: c.contractSize,
      tickSize: c.tickSize,
      price,
      change1D,
      change1DPct,
      change1W,
      change1WPct,
      change1M,
      change1MPct,
      changeYTD,
      changeYTDPct,
      nearbyContract,
      nearbyContractMonth: `${MONTH_CODE_MAP[front]} ${frontYear}`,
      nextContract,
      nextContractMonth: `${MONTH_CODE_MAP[next]} ${nextYear}`,
      nextContractPrice: nextPrice,
      calendarSpread,
      cashPrice,
      basis,
      high52W,
      low52W,
      openInterest,
      volume,
      seasonalPattern,
    };
  });

  // ---- 2. USDA Crop Conditions ----
  const cropConditions = CROP_CONDITION_DEFS.map(c => {
    const excellent = Math.round(jitter(c.baseExcellent, 0.2, rng));
    const good = Math.round(jitter(c.baseGood, 0.1, rng));
    const fair = Math.round(jitter(22, 0.15, rng));
    const poor = Math.round(jitter(7, 0.25, rng));
    const veryPoor = Math.max(0, 100 - excellent - good - fair - poor);
    const goodExcellentPct = excellent + good;
    const priorWeekGE = Math.round(jitter(goodExcellentPct, 0.04, rng));
    const yearAgoGE = Math.round(jitter(goodExcellentPct, 0.1, rng));
    const fiveYearAvgGE = Math.round(jitter(goodExcellentPct, 0.06, rng));

    return {
      crop: c.crop,
      excellent,
      good,
      fair,
      poor,
      veryPoor,
      goodExcellentPct,
      priorWeekGE,
      yearAgoGE,
      fiveYearAvgGE,
      changeFromPriorWeek: goodExcellentPct - priorWeekGE,
      changeFromYearAgo: goodExcellentPct - yearAgoGE,
    };
  });

  // ---- 3. Export Inspections ----
  const exportInspections = EXPORT_INSPECTION_DEFS.map(e => {
    const weeklyTotal = Math.round(jitter(e.baseWeekly, 0.2, rng));
    const yearAgoWeekly = Math.round(jitter(e.baseYearAgo, 0.15, rng));
    const priorWeek = Math.round(jitter(e.baseWeekly, 0.2, rng));
    const cumulativeYTD = Math.round(jitter(e.baseWeekly * 32, 0.1, rng));
    const yearAgoCumulative = Math.round(jitter(e.baseYearAgo * 32, 0.1, rng));
    const changeVsYearAgo = round(((weeklyTotal - yearAgoWeekly) / yearAgoWeekly) * 100, 1);

    return {
      commodity: e.commodity,
      weeklyTotal,
      priorWeek,
      yearAgoWeekly,
      changeVsYearAgo,
      cumulativeYTD,
      yearAgoCumulative,
      cumulativeChangeVsYearAgo: round(((cumulativeYTD - yearAgoCumulative) / yearAgoCumulative) * 100, 1),
      unit: 'thousand MT',
    };
  });

  // ---- 4. Weather / Drought Monitor ----
  const weather = {
    reportDate: day,
    regions: GROWING_REGIONS.map(r => {
      const d0 = Math.round(jitter(r.baseD0, 0.35, rng));
      const d1 = Math.round(jitter(r.baseD1, 0.4, rng));
      const d2 = Math.round(jitter(r.baseD2, 0.45, rng));
      const d3 = Math.max(0, Math.round(d2 * rng() * 0.5));
      const d4 = Math.max(0, Math.round(d3 * rng() * 0.3));
      const noDrought = Math.max(0, 100 - d0);
      const priorWeekD0 = Math.round(jitter(r.baseD0, 0.3, rng));
      const trend = d0 > priorWeekD0 + 3 ? 'worsening' : d0 < priorWeekD0 - 3 ? 'improving' : 'stable';

      let impactSummary: string;
      if (d2 >= 15) impactSummary = 'Severe drought stress; crop yields at risk';
      else if (d1 >= 15) impactSummary = 'Moderate drought; supplemental irrigation needed';
      else if (d0 >= 25) impactSummary = 'Abnormally dry; monitoring conditions closely';
      else impactSummary = 'Adequate moisture levels for crop development';

      return {
        name: r.name,
        states: r.states,
        noDrought,
        d0Abnormal: d0,
        d1Moderate: d1,
        d2Severe: d2,
        d3Extreme: d3,
        d4Exceptional: d4,
        priorWeekD0,
        trend,
        impactSummary,
      };
    }),
  };

  // ---- 5. Forward Curves (front 6 months) ----
  const forwardCurves = FORWARD_CURVE_SYMBOLS.map(sym => {
    const def = COMMODITY_DEFS.find(c => c.symbol === sym)!;
    const basePrice = jitter(def.basePrice, 0.06, rng);

    // Build forward months starting from front month
    const { front } = getFrontMonthCode(def.monthCodes, currentMonth);
    const frontPos = def.monthCodes.indexOf(front);
    const contracts: { contract: string; month: string; price: number; changeFromFront: number }[] = [];

    for (let i = 0; i < 6 && i < def.monthCodes.length; i++) {
      const idx = (frontPos + i) % def.monthCodes.length;
      const code = def.monthCodes[idx];
      const codeMonthPos = MONTH_ORDER.indexOf(code);
      const currentMonthPos = MONTH_ORDER.indexOf(MONTH_ORDER[currentMonth - 1]);
      const isNextYear = (idx < frontPos) || (codeMonthPos < currentMonthPos && i > 0);
      const yr = isNextYear ? nextYearSuffix : yearSuffix;

      // Slight contango/backwardation depending on commodity
      const curveSlope = def.category === 'livestock' ? -0.005 : 0.003;
      const monthlyDrift = curveSlope * (1 + rng() * 0.5);
      const forwardPrice = round(basePrice * (1 + monthlyDrift * i), def.decimals);
      const frontPrice = round(basePrice, def.decimals);

      contracts.push({
        contract: `${sym}${code}${yr}`,
        month: `${MONTH_CODE_MAP[code]} ${yr}`,
        price: forwardPrice,
        changeFromFront: round(forwardPrice - frontPrice, def.decimals),
      });
    }

    const curveShape = contracts.length >= 2
      ? (contracts[contracts.length - 1].price > contracts[0].price ? 'contango' : 'backwardation')
      : 'flat';

    return {
      symbol: sym,
      name: def.name,
      unit: def.unit,
      contracts,
      curveShape,
    };
  });

  return {
    commodities,
    cropConditions,
    exportInspections,
    weather,
    forwardCurves,
    timestamp: new Date().toISOString(),
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
    console.error('[AgriculturalFutures] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate agricultural futures data' });
  }
});

export default router;
