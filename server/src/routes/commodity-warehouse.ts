import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();


// ── Static Definitions ──

interface LMEMetalConfig {
  name: string;
  totalStockBase: number;   // tonnes
  cancelledPctBase: number; // %
  dominantLocation: string;
}

interface COMEXConfig {
  name: string;
  unit: string;
  registeredBase: number;
  eligibleBase: number;
}

interface EnergyInventoryConfig {
  name: string;
  unit: string;
  currentBase: number;
  fiveYrAvgBase: number;
}

interface AgriStockConfig {
  name: string;
  unit: string;
  currentBase: number; // M bushels or equivalent
}

const LME_METALS: LMEMetalConfig[] = [
  { name: 'Copper',   totalStockBase: 200000,  cancelledPctBase: 25, dominantLocation: 'Asia' },
  { name: 'Aluminum', totalStockBase: 500000,  cancelledPctBase: 30, dominantLocation: 'Europe' },
  { name: 'Zinc',     totalStockBase: 85000,   cancelledPctBase: 20, dominantLocation: 'Asia' },
  { name: 'Nickel',   totalStockBase: 50000,   cancelledPctBase: 18, dominantLocation: 'Asia' },
  { name: 'Lead',     totalStockBase: 30000,   cancelledPctBase: 15, dominantLocation: 'Europe' },
  { name: 'Tin',      totalStockBase: 4500,    cancelledPctBase: 22, dominantLocation: 'Asia' },
];

const COMEX_METALS: COMEXConfig[] = [
  { name: 'Gold',     unit: 'troy oz', registeredBase: 10000000,  eligibleBase: 10000000 },
  { name: 'Silver',   unit: 'troy oz', registeredBase: 130000000, eligibleBase: 170000000 },
  { name: 'Copper',   unit: 'lbs',     registeredBase: 35000000,  eligibleBase: 45000000 },
  { name: 'Platinum', unit: 'troy oz', registeredBase: 150000,    eligibleBase: 250000 },
];

const ENERGY_INVENTORIES: EnergyInventoryConfig[] = [
  { name: 'Crude Oil (Cushing)',         unit: 'M bbl', currentBase: 30,   fiveYrAvgBase: 35 },
  { name: 'Strategic Petroleum Reserve', unit: 'M bbl', currentBase: 350,  fiveYrAvgBase: 500 },
  { name: 'Natural Gas Storage',         unit: 'Bcf',   currentBase: 2200, fiveYrAvgBase: 2400 },
  { name: 'Heating Oil',                 unit: 'M bbl', currentBase: 120,  fiveYrAvgBase: 130 },
  { name: 'Gasoline',                    unit: 'M bbl', currentBase: 230,  fiveYrAvgBase: 240 },
];

const AGRI_STOCKS: AgriStockConfig[] = [
  { name: 'Wheat',    unit: 'M bu', currentBase: 45 },
  { name: 'Corn',     unit: 'M bu', currentBase: 80 },
  { name: 'Soybeans', unit: 'M bu', currentBase: 25 },
  { name: 'Cotton',   unit: 'K bales', currentBase: 55 },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ── Data generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-warehouse'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // LME warehouse stocks
  const lme = LME_METALS.map(m => {
    // Copper: 100K-300K, Aluminum: 400K-600K, others proportional
    const totalStock = Math.round(jitter(m.totalStockBase, 0.25));
    const dailyChange = Math.round((rng() - 0.5) * m.totalStockBase * 0.015);
    const weeklyChange = Math.round((rng() - 0.5) * m.totalStockBase * 0.04);
    const cancelledPct = round2(Math.max(2, jitter(m.cancelledPctBase, 0.4)));
    const cancelledWarrants = Math.round(totalStock * cancelledPct / 100);
    return {
      metal: m.name,
      totalStock,
      dailyChange,
      weeklyChange,
      cancelledWarrants,
      cancelledPct,
      dominantLocation: m.dominantLocation,
    };
  });

  // COMEX inventories
  const comex = COMEX_METALS.map(c => {
    const registered = Math.round(jitter(c.registeredBase, 0.2));
    const eligible = Math.round(jitter(c.eligibleBase, 0.2));
    const total = registered + eligible;
    const dailyChange = Math.round((rng() - 0.5) * c.registeredBase * 0.01);
    return {
      metal: c.name,
      unit: c.unit,
      registered,
      eligible,
      total,
      dailyChange,
    };
  });

  // Energy inventories
  const energy = ENERGY_INVENTORIES.map(e => {
    const current = round2(jitter(e.currentBase, 0.15));
    const fiveYrAvg = round2(jitter(e.fiveYrAvgBase, 0.05));
    const deviationFromAvg = round2(((current - fiveYrAvg) / fiveYrAvg) * 100);
    return {
      name: e.name,
      unit: e.unit,
      current,
      fiveYrAvg,
      deviationFromAvg,
    };
  });

  // Agriculture CBOT deliverable stocks
  const agriculture = AGRI_STOCKS.map(a => {
    // Wheat: 30-60M bu, Corn: 50-110M bu, Soybeans: 15-35M bu, Cotton: 30-80K bales
    const current = round2(jitter(a.currentBase, 0.3));
    const previousWeek = round2(current + (rng() - 0.5) * a.currentBase * 0.06);
    const change = round2(current - previousWeek);
    return {
      commodity: a.name,
      unit: a.unit,
      current,
      previousWeek,
      change,
    };
  });

  // Trends: 20-day history for key inventories
  const trendDays = 20;
  const trends = generateTrends(day, trendDays);

  return {
    lme,
    comex,
    energy,
    agriculture,
    trends,
    generatedAt: new Date().toISOString(),
  };
}

function generateTrends(today: string, days: number) {
  const lmeCopper: { date: string; value: number }[] = [];
  const comexGold: { date: string; value: number }[] = [];
  const cushingCrude: { date: string; value: number }[] = [];

  let copperVal = 200000;
  let goldVal = 20000000;
  let crudeVal = 30;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayRng = mulberry32(hashSeed(dateStr + '-warehouse-trend'));

    // Walk each series with small daily moves
    copperVal = Math.max(100000, Math.min(300000,
      copperVal + (dayRng() - 0.48) * 5000));
    goldVal = Math.max(15000000, Math.min(25000000,
      goldVal + (dayRng() - 0.48) * 300000));
    crudeVal = Math.max(20, Math.min(40,
      crudeVal + (dayRng() - 0.48) * 1.5));

    lmeCopper.push({ date: dateStr, value: Math.round(copperVal) });
    comexGold.push({ date: dateStr, value: Math.round(goldVal) });
    cushingCrude.push({ date: dateStr, value: round2(crudeVal) });
  }

  return {
    lmeCopper: { unit: 'tonnes', data: lmeCopper },
    comexGold: { unit: 'troy oz', data: comexGold },
    cushingCrude: { unit: 'M bbl', data: cushingCrude },
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
    console.error('[CommodityWarehouse] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity warehouse data' });
  }
});

export default router;
