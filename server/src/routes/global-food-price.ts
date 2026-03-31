import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Interfaces --

interface FAOFoodPriceIndex {
  overallIndex: number;
  meatIndex: number;
  dairyIndex: number;
  cerealsIndex: number;
  oilsIndex: number;
  sugarIndex: number;
  monthOverMonthChangePct: number;
  yearOverYearChangePct: number;
}

interface CommodityPrice {
  commodity: string;
  pricePerUnit: number;
  unit: string;
  dailyChangePct: number;
  monthChangePct: number;
  yearChangePct: number;
  yearHighPrice: number;
  yearLowPrice: number;
}

interface FoodInflationCountry {
  country: string;
  foodInflationPct: number;
  coreInflationPct: number;
  foodShareOfCPIPct: number;
  trend: 'accelerating' | 'stable' | 'decelerating';
}

interface TradeParticipant {
  country: string;
  volumeMMT: number;
  shareOfGlobalPct?: number;
}

interface TradeFlow {
  commodity: string;
  topExporters: TradeParticipant[];
  topImporters: TradeParticipant[];
}

interface SupplyDemandBalance {
  commodity: string;
  productionMMT: number;
  consumptionMMT: number;
  endingStocksMMT: number;
  stocksToUsePct: number;
  yearOverYearChangePct: number;
}

interface FoodSecurityAlert {
  region: string;
  alertLevel: 'watch' | 'crisis' | 'emergency' | 'famine';
  populationAffectedMillions: number;
  keyDrivers: string[];
}

interface GlobalFoodPriceData {
  faoIndex: FAOFoodPriceIndex;
  commodityPrices: CommodityPrice[];
  foodInflation: FoodInflationCountry[];
  supplyDemand: SupplyDemandBalance[];
  tradeFlows: TradeFlow[];
  foodSecurityAlerts: FoodSecurityAlert[];
  generatedAt: string;
}

// -- Static Definitions --

const COMMODITY_DEFS = [
  { commodity: 'Wheat CBOT', basePrice: 5.50, unit: '$/bu' },
  { commodity: 'Corn CBOT', basePrice: 4.30, unit: '$/bu' },
  { commodity: 'Soybeans CBOT', basePrice: 11.80, unit: '$/bu' },
  { commodity: 'Rice', basePrice: 17.00, unit: '$/cwt' },
  { commodity: 'Palm Oil', basePrice: 900, unit: '$/MT' },
  { commodity: 'Soybean Oil', basePrice: 0.48, unit: '$/lb' },
  { commodity: 'Canola', basePrice: 620, unit: '$/MT' },
  { commodity: 'Sugar #11', basePrice: 0.22, unit: '$/lb' },
  { commodity: 'Coffee Arabica', basePrice: 2.20, unit: '$/lb' },
  { commodity: 'Cocoa', basePrice: 8000, unit: '$/MT' },
  { commodity: 'Lean Hogs', basePrice: 0.82, unit: '$/lb' },
  { commodity: 'Live Cattle', basePrice: 1.95, unit: '$/lb' },
];

const INFLATION_DEFS: { country: string; baseFoodInflation: number; baseCoreInflation: number; foodShareOfCPI: number }[] = [
  { country: 'United States', baseFoodInflation: 2.8, baseCoreInflation: 3.2, foodShareOfCPI: 13.4 },
  { country: 'European Union', baseFoodInflation: 3.2, baseCoreInflation: 2.8, foodShareOfCPI: 16.1 },
  { country: 'United Kingdom', baseFoodInflation: 3.5, baseCoreInflation: 3.0, foodShareOfCPI: 11.3 },
  { country: 'Japan', baseFoodInflation: 3.8, baseCoreInflation: 2.5, foodShareOfCPI: 26.3 },
  { country: 'China', baseFoodInflation: 0.5, baseCoreInflation: 0.8, foodShareOfCPI: 28.2 },
  { country: 'India', baseFoodInflation: 7.2, baseCoreInflation: 4.5, foodShareOfCPI: 39.1 },
  { country: 'Brazil', baseFoodInflation: 5.8, baseCoreInflation: 4.2, foodShareOfCPI: 21.0 },
  { country: 'Turkey', baseFoodInflation: 65.0, baseCoreInflation: 58.0, foodShareOfCPI: 25.3 },
  { country: 'Argentina', baseFoodInflation: 200.0, baseCoreInflation: 180.0, foodShareOfCPI: 23.5 },
  { country: 'Nigeria', baseFoodInflation: 28.0, baseCoreInflation: 22.0, foodShareOfCPI: 51.8 },
  { country: 'Egypt', baseFoodInflation: 35.0, baseCoreInflation: 28.0, foodShareOfCPI: 32.7 },
  { country: 'Mexico', baseFoodInflation: 5.5, baseCoreInflation: 4.8, foodShareOfCPI: 22.6 },
];

const SUPPLY_DEMAND_DEFS = [
  { commodity: 'Wheat', baseProd: 789, baseCons: 795, baseStocks: 267, baseStocksToUse: 33.6 },
  { commodity: 'Corn', baseProd: 1220, baseCons: 1195, baseStocks: 312, baseStocksToUse: 26.1 },
  { commodity: 'Rice', baseProd: 520, baseCons: 518, baseStocks: 172, baseStocksToUse: 33.2 },
  { commodity: 'Soybeans', baseProd: 398, baseCons: 385, baseStocks: 114, baseStocksToUse: 29.6 },
];

const TRADE_FLOW_DEFS = [
  {
    commodity: 'Wheat',
    exporters: [
      { country: 'Russia', baseVol: 48, baseShare: 24.5 },
      { country: 'European Union', baseVol: 37, baseShare: 18.9 },
      { country: 'Australia', baseVol: 26, baseShare: 13.3 },
      { country: 'Canada', baseVol: 24, baseShare: 12.2 },
      { country: 'United States', baseVol: 21, baseShare: 10.7 },
    ],
    importers: [
      { country: 'Egypt', baseVol: 13 },
      { country: 'Indonesia', baseVol: 11 },
      { country: 'Turkey', baseVol: 10 },
      { country: 'Algeria', baseVol: 8 },
      { country: 'Philippines', baseVol: 7 },
    ],
  },
  {
    commodity: 'Corn',
    exporters: [
      { country: 'United States', baseVol: 55, baseShare: 28.1 },
      { country: 'Brazil', baseVol: 48, baseShare: 24.5 },
      { country: 'Argentina', baseVol: 36, baseShare: 18.4 },
      { country: 'Ukraine', baseVol: 22, baseShare: 11.2 },
      { country: 'European Union', baseVol: 6, baseShare: 3.1 },
    ],
    importers: [
      { country: 'China', baseVol: 23 },
      { country: 'Japan', baseVol: 15 },
      { country: 'Mexico', baseVol: 18 },
      { country: 'South Korea', baseVol: 12 },
      { country: 'European Union', baseVol: 20 },
    ],
  },
  {
    commodity: 'Rice',
    exporters: [
      { country: 'India', baseVol: 22, baseShare: 38.6 },
      { country: 'Thailand', baseVol: 8, baseShare: 14.0 },
      { country: 'Vietnam', baseVol: 7, baseShare: 12.3 },
      { country: 'Pakistan', baseVol: 4, baseShare: 7.0 },
      { country: 'United States', baseVol: 3, baseShare: 5.3 },
    ],
    importers: [
      { country: 'Philippines', baseVol: 4 },
      { country: 'China', baseVol: 5 },
      { country: 'Nigeria', baseVol: 3 },
      { country: 'Saudi Arabia', baseVol: 2 },
      { country: 'Ivory Coast', baseVol: 2 },
    ],
  },
  {
    commodity: 'Soybeans',
    exporters: [
      { country: 'Brazil', baseVol: 96, baseShare: 56.5 },
      { country: 'United States', baseVol: 50, baseShare: 29.4 },
      { country: 'Argentina', baseVol: 5, baseShare: 2.9 },
      { country: 'Paraguay', baseVol: 6, baseShare: 3.5 },
      { country: 'Canada', baseVol: 5, baseShare: 2.9 },
    ],
    importers: [
      { country: 'China', baseVol: 100 },
      { country: 'European Union', baseVol: 14 },
      { country: 'Argentina', baseVol: 8 },
      { country: 'Mexico', baseVol: 6 },
      { country: 'Japan', baseVol: 3 },
    ],
  },
];

const FOOD_SECURITY_DEFS = [
  { region: 'Horn of Africa', baseAlertLevel: 'emergency' as const, basePopulation: 23.5, keyDrivers: ['Prolonged drought', 'Conflict displacement', 'Currency devaluation'] },
  { region: 'Sahel', baseAlertLevel: 'crisis' as const, basePopulation: 18.2, keyDrivers: ['Armed conflict', 'Climate variability', 'Rising food prices'] },
  { region: 'Yemen', baseAlertLevel: 'emergency' as const, basePopulation: 17.4, keyDrivers: ['Ongoing civil war', 'Port blockades', 'Economic collapse'] },
  { region: 'Haiti', baseAlertLevel: 'crisis' as const, basePopulation: 4.9, keyDrivers: ['Gang violence', 'Fuel shortages', 'Currency depreciation'] },
  { region: 'Afghanistan', baseAlertLevel: 'emergency' as const, basePopulation: 19.9, keyDrivers: ['Economic sanctions', 'Banking collapse', 'Drought'] },
  { region: 'Myanmar', baseAlertLevel: 'crisis' as const, basePopulation: 12.6, keyDrivers: ['Military conflict', 'Displacement', 'Trade disruption'] },
  { region: 'Sudan', baseAlertLevel: 'famine' as const, basePopulation: 25.6, keyDrivers: ['Civil war', 'Displacement of millions', 'Harvest disruption'] },
  { region: 'Syria', baseAlertLevel: 'crisis' as const, basePopulation: 12.1, keyDrivers: ['Protracted conflict', 'Economic deterioration', 'Earthquake aftermath'] },
];

const TRENDS: ('accelerating' | 'stable' | 'decelerating')[] = ['accelerating', 'stable', 'decelerating'];
const ALERT_LEVELS: ('watch' | 'crisis' | 'emergency' | 'famine')[] = ['watch', 'crisis', 'emergency', 'famine'];

// -- Cache --


let cache: { data: GlobalFoodPriceData; ts: number } | null = null;

// -- Helpers --

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function vary(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// -- Data Generation --

function generateData(): GlobalFoodPriceData {
  const rng = seededRandom('global-food-price');

  // 1. FAO Food Price Index
  const overallIndex = round(vary(rng, 125, 0.04), 1);
  const faoIndex: FAOFoodPriceIndex = {
    overallIndex,
    meatIndex: round(vary(rng, 118, 0.05), 1),
    dairyIndex: round(vary(rng, 130, 0.06), 1),
    cerealsIndex: round(vary(rng, 122, 0.05), 1),
    oilsIndex: round(vary(rng, 135, 0.07), 1),
    sugarIndex: round(vary(rng, 140, 0.08), 1),
    monthOverMonthChangePct: round((rng() - 0.45) * 4, 1),
    yearOverYearChangePct: round((rng() - 0.4) * 12, 1),
  };

  // 2. Key Commodity Prices
  const commodityPrices: CommodityPrice[] = COMMODITY_DEFS.map((def) => {
    const price = round(vary(rng, def.basePrice, 0.06), def.basePrice < 1 ? 4 : def.basePrice < 10 ? 2 : def.basePrice < 100 ? 1 : 0);
    const dailyChange = round((rng() - 0.48) * 4, 2);
    const monthChange = round((rng() - 0.45) * 12, 2);
    const yearChange = round((rng() - 0.4) * 30, 2);
    const yearHighFactor = 1 + rng() * 0.15 + 0.02;
    const yearLowFactor = 1 - rng() * 0.15 - 0.02;
    const decimals = def.basePrice < 1 ? 4 : def.basePrice < 10 ? 2 : def.basePrice < 100 ? 1 : 0;
    return {
      commodity: def.commodity,
      pricePerUnit: price,
      unit: def.unit,
      dailyChangePct: dailyChange,
      monthChangePct: monthChange,
      yearChangePct: yearChange,
      yearHighPrice: round(def.basePrice * yearHighFactor, decimals),
      yearLowPrice: round(def.basePrice * yearLowFactor, decimals),
    };
  });

  // 3. Food Inflation by Country
  const foodInflation: FoodInflationCountry[] = INFLATION_DEFS.map((def) => {
    const foodInfl = round(vary(rng, def.baseFoodInflation, 0.08), 1);
    const coreInfl = round(vary(rng, def.baseCoreInflation, 0.06), 1);
    const trendIdx = Math.floor(rng() * TRENDS.length);
    return {
      country: def.country,
      foodInflationPct: foodInfl,
      coreInflationPct: coreInfl,
      foodShareOfCPIPct: def.foodShareOfCPI,
      trend: TRENDS[trendIdx],
    };
  });

  // 4. Global Supply & Demand Balance
  const supplyDemand: SupplyDemandBalance[] = SUPPLY_DEMAND_DEFS.map((def) => {
    const prod = round(vary(rng, def.baseProd, 0.03), 1);
    const cons = round(vary(rng, def.baseCons, 0.03), 1);
    const stocks = round(vary(rng, def.baseStocks, 0.05), 1);
    const stocksToUse = round((stocks / cons) * 100, 1);
    const yoyChange = round((rng() - 0.5) * 8, 1);
    return {
      commodity: def.commodity,
      productionMMT: prod,
      consumptionMMT: cons,
      endingStocksMMT: stocks,
      stocksToUsePct: stocksToUse,
      yearOverYearChangePct: yoyChange,
    };
  });

  // 5. Trade Flows
  const tradeFlows: TradeFlow[] = TRADE_FLOW_DEFS.map((def) => {
    const topExporters: TradeParticipant[] = def.exporters.map((e) => ({
      country: e.country,
      volumeMMT: round(vary(rng, e.baseVol, 0.05), 1),
      shareOfGlobalPct: round(vary(rng, e.baseShare, 0.04), 1),
    }));
    const topImporters: TradeParticipant[] = def.importers.map((imp) => ({
      country: imp.country,
      volumeMMT: round(vary(rng, imp.baseVol, 0.05), 1),
    }));
    return {
      commodity: def.commodity,
      topExporters,
      topImporters,
    };
  });

  // 6. Food Security Alerts
  const foodSecurityAlerts: FoodSecurityAlert[] = FOOD_SECURITY_DEFS.map((def) => {
    const pop = round(vary(rng, def.basePopulation, 0.08), 1);
    const levelShift = rng();
    const baseIdx = ALERT_LEVELS.indexOf(def.baseAlertLevel);
    let idx = baseIdx;
    if (levelShift < 0.15 && baseIdx > 0) idx = baseIdx - 1;
    else if (levelShift > 0.85 && baseIdx < ALERT_LEVELS.length - 1) idx = baseIdx + 1;
    return {
      region: def.region,
      alertLevel: ALERT_LEVELS[idx],
      populationAffectedMillions: pop,
      keyDrivers: def.keyDrivers,
    };
  });

  return {
    faoIndex,
    commodityPrices,
    foodInflation,
    supplyDemand,
    tradeFlows,
    foodSecurityAlerts,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }
    const data = generateData();
    cache = { data, ts: now };
    return res.json(data);
  } catch (err: unknown) {
    console.error('[GlobalFoodPrice] Error:', (err as Error)?.message);
    if (cache) {
      return res.json(cache.data);
    }
    return res.status(500).json({ error: 'Failed to generate global food price data' });
  }
});

export default router;
