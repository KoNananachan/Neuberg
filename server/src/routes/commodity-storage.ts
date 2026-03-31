import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();


// ── Static Definitions ──

interface CommodityConfig {
  name: string;
  symbol: string;
  unit: string;
  spotBase: number;
  frontMonthPremium: number;   // typical front-month vs spot (absolute)
  nextMonthPremium: number;    // typical next-month vs spot (absolute)
  storageCostBase: number;     // $/unit/month
  financingBps: number;        // annualized financing as bps of spot
  insuranceBps: number;        // annualized insurance as bps of spot
  inventoryBase: number;       // current inventory in native units
  inventoryUnit: string;
  daysOfSupplyBase: number;
  fiveYrAvgInventory: number;
  storageCapBase: number;      // capacity utilization %
}

const COMMODITIES: CommodityConfig[] = [
  {
    name: 'WTI Crude',
    symbol: 'CL',
    unit: 'bbl',
    spotBase: 78.45,
    frontMonthPremium: 0.65,
    nextMonthPremium: 1.35,
    storageCostBase: 0.47,
    financingBps: 550,
    insuranceBps: 15,
    inventoryBase: 440200000,
    inventoryUnit: 'bbl',
    daysOfSupplyBase: 25,
    fiveYrAvgInventory: 462800000,
    storageCapBase: 62,
  },
  {
    name: 'Brent Crude',
    symbol: 'CO',
    unit: 'bbl',
    spotBase: 82.30,
    frontMonthPremium: 0.55,
    nextMonthPremium: 1.15,
    storageCostBase: 0.52,
    financingBps: 550,
    insuranceBps: 18,
    inventoryBase: 285400000,
    inventoryUnit: 'bbl',
    daysOfSupplyBase: 30,
    fiveYrAvgInventory: 310200000,
    storageCapBase: 58,
  },
  {
    name: 'Natural Gas',
    symbol: 'NG',
    unit: 'MMBtu',
    spotBase: 2.85,
    frontMonthPremium: 0.08,
    nextMonthPremium: 0.22,
    storageCostBase: 0.035,
    financingBps: 480,
    insuranceBps: 12,
    inventoryBase: 2150000000,
    inventoryUnit: 'Mcf',
    daysOfSupplyBase: 32,
    fiveYrAvgInventory: 2380000000,
    storageCapBase: 54,
  },
  {
    name: 'Gold',
    symbol: 'GC',
    unit: 'oz',
    spotBase: 2340.00,
    frontMonthPremium: 2.80,
    nextMonthPremium: 5.50,
    storageCostBase: 0.22,
    financingBps: 530,
    insuranceBps: 10,
    inventoryBase: 26480000,
    inventoryUnit: 'oz',
    daysOfSupplyBase: 120,
    fiveYrAvgInventory: 24900000,
    storageCapBase: 72,
  },
  {
    name: 'Silver',
    symbol: 'SI',
    unit: 'oz',
    spotBase: 29.50,
    frontMonthPremium: 0.04,
    nextMonthPremium: 0.09,
    storageCostBase: 0.008,
    financingBps: 550,
    insuranceBps: 12,
    inventoryBase: 298500000,
    inventoryUnit: 'oz',
    daysOfSupplyBase: 95,
    fiveYrAvgInventory: 315200000,
    storageCapBase: 68,
  },
  {
    name: 'Copper',
    symbol: 'HG',
    unit: 'lb',
    spotBase: 4.25,
    frontMonthPremium: 0.012,
    nextMonthPremium: 0.028,
    storageCostBase: 0.003,
    financingBps: 560,
    insuranceBps: 14,
    inventoryBase: 195000,
    inventoryUnit: 'tonnes',
    daysOfSupplyBase: 12,
    fiveYrAvgInventory: 225000,
    storageCapBase: 44,
  },
  {
    name: 'Aluminum',
    symbol: 'AL',
    unit: 'tonne',
    spotBase: 2320.00,
    frontMonthPremium: 8.50,
    nextMonthPremium: 18.20,
    storageCostBase: 3.80,
    financingBps: 520,
    insuranceBps: 10,
    inventoryBase: 485000,
    inventoryUnit: 'tonnes',
    daysOfSupplyBase: 18,
    fiveYrAvgInventory: 540000,
    storageCapBase: 52,
  },
  {
    name: 'Wheat',
    symbol: 'ZW',
    unit: 'bu',
    spotBase: 6.15,
    frontMonthPremium: 0.04,
    nextMonthPremium: 0.12,
    storageCostBase: 0.065,
    financingBps: 540,
    insuranceBps: 20,
    inventoryBase: 580000000,
    inventoryUnit: 'bu',
    daysOfSupplyBase: 85,
    fiveYrAvgInventory: 620000000,
    storageCapBase: 58,
  },
];

interface StorageFacilityConfig {
  name: string;
  location: string;
  commodity: string;
  capacityBase: number;
  capacityUnit: string;
  utilBase: number;
  dailyRateBase: number;
  rateUnit: string;
}

const STORAGE_FACILITIES: StorageFacilityConfig[] = [
  {
    name: 'Cushing OK Hub',
    location: 'Cushing, Oklahoma',
    commodity: 'WTI Crude',
    capacityBase: 76000000,
    capacityUnit: 'bbl',
    utilBase: 62,
    dailyRateBase: 0.016,
    rateUnit: '$/bbl/day',
  },
  {
    name: 'Henry Hub',
    location: 'Erath, Louisiana',
    commodity: 'Natural Gas',
    capacityBase: 4200,
    capacityUnit: 'Bcf',
    utilBase: 54,
    dailyRateBase: 0.0012,
    rateUnit: '$/MMBtu/day',
  },
  {
    name: 'COMEX Gold Vaults',
    location: 'New York, NY',
    commodity: 'Gold',
    capacityBase: 35000000,
    capacityUnit: 'oz',
    utilBase: 72,
    dailyRateBase: 0.0075,
    rateUnit: '$/oz/day',
  },
  {
    name: 'LME Warehouse Network',
    location: 'Global (700+ locations)',
    commodity: 'Copper / Aluminum',
    capacityBase: 1850000,
    capacityUnit: 'tonnes',
    utilBase: 48,
    dailyRateBase: 0.50,
    rateUnit: '$/tonne/day',
  },
  {
    name: 'CBOT Delivery Elevators',
    location: 'Chicago / Toledo',
    commodity: 'Wheat / Corn',
    capacityBase: 120000000,
    capacityUnit: 'bu',
    utilBase: 58,
    dailyRateBase: 0.002,
    rateUnit: '$/bu/day',
  },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

// ── Data Generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-storage'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Storage Economics
  const storageEconomics = COMMODITIES.map(c => {
    const spotPrice = round2(jitter(c.spotBase, 0.08));
    const frontMonth = round2(spotPrice + jitter(c.frontMonthPremium, 0.3));
    const nextMonth = round2(spotPrice + jitter(c.nextMonthPremium, 0.3));
    const contangoBackwardation = round2(frontMonth - spotPrice);
    const storageCost = round4(jitter(c.storageCostBase, 0.12));
    const financingCost = round4(spotPrice * (c.financingBps / 10000) / 12);
    const insuranceCost = round4(spotPrice * (c.insuranceBps / 10000) / 12);
    const totalMonthlyCost = storageCost + financingCost + insuranceCost;
    const netCarryReturn = round4(((contangoBackwardation - totalMonthlyCost) / spotPrice) * 100);
    const annualizedReturn = round2(netCarryReturn * 12);

    return {
      commodity: c.name,
      symbol: c.symbol,
      unit: c.unit,
      spotPrice,
      frontMonth,
      nextMonth,
      contangoBackwardation,
      storageCost,
      financingCost,
      insuranceCost,
      totalMonthlyCost: round4(totalMonthlyCost),
      netCarryReturn,
      annualizedReturn,
      structure: contangoBackwardation > 0 ? 'Contango' : 'Backwardation',
    };
  });

  // 2. Inventory Levels
  const inventoryLevels = COMMODITIES.map(c => {
    const currentInventory = Math.round(jitter(c.inventoryBase, 0.10));
    const daysOfSupply = round2(jitter(c.daysOfSupplyBase, 0.12));
    const weeklyChange = round2((rng() - 0.5) * 5);
    const fiveYrAvgInventory = Math.round(jitter(c.fiveYrAvgInventory, 0.03));
    const inventoryVs5yrAvg = round2(((currentInventory - fiveYrAvgInventory) / fiveYrAvgInventory) * 100);
    const storageCapacityUtil = round2(jitter(c.storageCapBase, 0.10));

    return {
      commodity: c.name,
      symbol: c.symbol,
      currentInventory,
      inventoryUnit: c.inventoryUnit,
      daysOfSupply,
      weeklyChange,
      fiveYrAvgInventory,
      inventoryVs5yrAvg,
      storageCapacityUtil,
    };
  });

  // 3. Cash-and-Carry Analysis — pick the top 5 most profitable
  const carryTrades = COMMODITIES.map(c => {
    const spotPrice = round2(jitter(c.spotBase, 0.08));
    const tenor = [1, 2, 3, 6][Math.floor(rng() * 4)];
    const monthlyPremium = jitter(c.nextMonthPremium / 2, 0.25);
    const sellFuture = round2(spotPrice + monthlyPremium * tenor);
    const storageCost = round4(jitter(c.storageCostBase, 0.12) * tenor);
    const financingCost = round4(spotPrice * (c.financingBps / 10000) / 12 * tenor);
    const insuranceCost = round4(spotPrice * (c.insuranceBps / 10000) / 12 * tenor);
    const totalCarryCost = round2(storageCost + financingCost + insuranceCost);
    const grossProfit = round2(sellFuture - spotPrice);
    const netProfit = round2(grossProfit - totalCarryCost);
    const netReturn = round4((netProfit / spotPrice) * 100);
    const annualizedReturn = round2(netReturn * (12 / tenor));
    const vol = 10 + rng() * 25;
    const sharpeRatio = round2(annualizedReturn / vol);

    return {
      commodity: c.name,
      buySpot: spotPrice,
      sellFuture,
      tenor,
      totalCarryCost,
      grossProfit,
      netReturn,
      annualizedReturn,
      sharpeRatio,
    };
  });

  // Sort by annualized return descending, take top 5
  const topCarryTrades = carryTrades
    .sort((a, b) => b.annualizedReturn - a.annualizedReturn)
    .slice(0, 5);

  // 4. Storage Facility Rates
  const storageFacilities = STORAGE_FACILITIES.map(f => {
    const utilization = round2(jitter(f.utilBase, 0.10));
    const dailyRate = round4(jitter(f.dailyRateBase, 0.15));
    const monthlyRate = round2(dailyRate * 30);
    const capacity = Math.round(jitter(f.capacityBase, 0.02));

    let availability: 'available' | 'tight' | 'full';
    if (utilization >= 92) {
      availability = 'full';
    } else if (utilization >= 75) {
      availability = 'tight';
    } else {
      availability = 'available';
    }

    return {
      name: f.name,
      location: f.location,
      commodity: f.commodity,
      capacity,
      capacityUnit: f.capacityUnit,
      utilization,
      dailyRate,
      monthlyRate,
      rateUnit: f.rateUnit,
      availability,
    };
  });

  // Summary
  const avgContango = round2(
    storageEconomics.reduce((sum, s) => sum + s.contangoBackwardation, 0) / storageEconomics.length,
  );
  const contangoCount = storageEconomics.filter(s => s.structure === 'Contango').length;
  const backwardationCount = storageEconomics.filter(s => s.structure === 'Backwardation').length;
  const bestCarry = topCarryTrades[0];
  const avgUtilization = round2(
    storageFacilities.reduce((sum, f) => sum + f.utilization, 0) / storageFacilities.length,
  );

  const summary = {
    contangoCount,
    backwardationCount,
    bestCarryTrade: bestCarry ? `${bestCarry.commodity} (${bestCarry.annualizedReturn}% ann.)` : 'N/A',
    avgStorageUtilization: avgUtilization,
    marketStructure: contangoCount > backwardationCount
      ? 'Predominantly Contango'
      : contangoCount < backwardationCount
        ? 'Predominantly Backwardation'
        : 'Mixed',
  };

  return {
    summary,
    storageEconomics,
    inventoryLevels,
    cashAndCarryAnalysis: topCarryTrades,
    storageFacilityRates: storageFacilities,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CommodityStorage] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity storage data' });
  }
});

export default router;
