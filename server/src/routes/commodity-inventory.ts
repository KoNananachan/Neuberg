import { Router } from 'express';

const router = Router();

// ── Deterministic PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Static Definitions ──

interface MetalConfig {
  commodity: string;
  exchange: string;
  stocksBase: number;      // base tonnes
  spotPriceBase: number;    // $/t
  daysOfSupplyBase: number;
}

interface EnergyConfig {
  commodity: string;
  stocksBase: number;       // M barrels or Bcf
  unit: string;
  spotPriceBase: number;
  daysOfSupplyBase: number;
}

interface AgricultureConfig {
  commodity: string;
  stocksBase: number;       // M bushels or M bags
  unit: string;
  stocksToUseBase: number;  // %
  season: string;
}

interface WarehouseConfig {
  location: string;
  commodity: string;
  quantityBase: number;
  unit: string;
}

const METALS: MetalConfig[] = [
  { commodity: 'Copper',   exchange: 'LME',   stocksBase: 195000,  spotPriceBase: 8450,  daysOfSupplyBase: 12 },
  { commodity: 'Aluminum', exchange: 'LME',   stocksBase: 485000,  spotPriceBase: 2320,  daysOfSupplyBase: 18 },
  { commodity: 'Zinc',     exchange: 'LME',   stocksBase: 82000,   spotPriceBase: 2680,  daysOfSupplyBase: 8 },
  { commodity: 'Nickel',   exchange: 'LME',   stocksBase: 45000,   spotPriceBase: 16200, daysOfSupplyBase: 6 },
  { commodity: 'Lead',     exchange: 'LME',   stocksBase: 28000,   spotPriceBase: 2050,  daysOfSupplyBase: 5 },
  { commodity: 'Tin',      exchange: 'LME',   stocksBase: 4200,    spotPriceBase: 25800, daysOfSupplyBase: 7 },
];

const ENERGY: EnergyConfig[] = [
  { commodity: 'WTI Cushing',  stocksBase: 32,   unit: 'M bbl', spotPriceBase: 78.5,  daysOfSupplyBase: 27 },
  { commodity: 'Brent',        stocksBase: 285,  unit: 'M bbl', spotPriceBase: 82.3,  daysOfSupplyBase: 30 },
  { commodity: 'Natural Gas',  stocksBase: 2150, unit: 'Bcf',   spotPriceBase: 2.85,  daysOfSupplyBase: 32 },
  { commodity: 'Heating Oil',  stocksBase: 118,  unit: 'M bbl', spotPriceBase: 2.62,  daysOfSupplyBase: 24 },
];

const AGRICULTURE: AgricultureConfig[] = [
  { commodity: 'Wheat',    stocksBase: 580,  unit: 'M bu',   stocksToUseBase: 33, season: '2025/26' },
  { commodity: 'Corn',     stocksBase: 1420, unit: 'M bu',   stocksToUseBase: 14, season: '2025/26' },
  { commodity: 'Soybeans', stocksBase: 290,  unit: 'M bu',   stocksToUseBase: 10, season: '2025/26' },
  { commodity: 'Coffee',   stocksBase: 35,   unit: 'M bags', stocksToUseBase: 20, season: '2025/26' },
];

const WAREHOUSES: WarehouseConfig[] = [
  { location: 'LME Rotterdam',     commodity: 'Aluminum', quantityBase: 42000,  unit: 'tonnes' },
  { location: 'LME Busan',         commodity: 'Zinc',     quantityBase: 18000,  unit: 'tonnes' },
  { location: 'LME Singapore',     commodity: 'Copper',   quantityBase: 28000,  unit: 'tonnes' },
  { location: 'COMEX NYC',         commodity: 'Copper',   quantityBase: 22000,  unit: 'tonnes' },
  { location: 'Cushing OK',        commodity: 'WTI',      quantityBase: 850000, unit: 'bbl' },
  { location: 'LME Port Klang',    commodity: 'Tin',      quantityBase: 1200,   unit: 'tonnes' },
  { location: 'LME Johor',         commodity: 'Nickel',   quantityBase: 9500,   unit: 'tonnes' },
  { location: 'LME New Orleans',   commodity: 'Aluminum', quantityBase: 35000,  unit: 'tonnes' },
];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ── Data generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-inventory'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Metals
  const metals = METALS.map(m => {
    const stocks = Math.round(jitter(m.stocksBase, 0.15));
    const change1d = Math.round((rng() - 0.5) * m.stocksBase * 0.02);
    const change1w = round2((rng() - 0.5) * 4);
    const change1m = round2((rng() - 0.5) * 10);
    const daysOfSupply = round2(jitter(m.daysOfSupplyBase, 0.15));
    const cancelledWarrants = round2(5 + rng() * 35);
    const spotPrice = round2(jitter(m.spotPriceBase, 0.08));
    const contango = round2((rng() - 0.3) * 2.5);
    return {
      commodity: m.commodity,
      exchange: m.exchange,
      stocks,
      change1d,
      change1w,
      change1m,
      daysOfSupply,
      cancelledWarrants,
      spotPrice,
      contango,
    };
  });

  // Energy
  const energy = ENERGY.map(e => {
    const stocks = round2(jitter(e.stocksBase, 0.12));
    const change1w = round2((rng() - 0.5) * 6);
    const change5YAvg = round2((rng() - 0.5) * 20);
    const daysOfSupply = round2(jitter(e.daysOfSupplyBase, 0.12));
    const spotPrice = round2(jitter(e.spotPriceBase, 0.1));
    return {
      commodity: e.commodity,
      stocks,
      unit: e.unit,
      change1w,
      change5YAvg,
      daysOfSupply,
      spotPrice,
    };
  });

  // Agriculture
  const agriculture = AGRICULTURE.map(a => {
    const stocks = round2(jitter(a.stocksBase, 0.1));
    const change1m = round2((rng() - 0.5) * 8);
    const stocksToUse = round2(jitter(a.stocksToUseBase, 0.12));
    const exportPace = round2(75 + rng() * 35);
    return {
      commodity: a.commodity,
      stocks,
      unit: a.unit,
      change1m,
      stocksToUse,
      season: a.season,
      exportPace,
    };
  });

  // Warehouse Flows
  const warehouseFlows = WAREHOUSES.map(w => {
    const direction = rng() > 0.5 ? 'Inflow' : 'Outflow';
    const quantity = Math.round(jitter(w.quantityBase, 0.2));
    const change1w = round2((rng() - 0.5) * 15);
    return {
      location: w.location,
      commodity: w.commodity,
      direction,
      quantity,
      unit: w.unit,
      change1w,
    };
  });

  // Summary
  const totalMetalsValue = round2(
    metals.reduce((sum, m) => sum + m.stocks * m.spotPrice / 1e9, 0),
  );
  const totalEnergyStocks = round2(
    energy.filter(e => e.unit === 'M bbl').reduce((sum, e) => sum + e.stocks, 0),
  );
  const avgDaysOfSupply = round2(
    metals.reduce((sum, m) => sum + m.daysOfSupply, 0) / metals.length,
  );

  // Biggest drawdown: largest negative change1m among metals
  const sortedByChange = [...metals].sort((a, b) => a.change1m - b.change1m);
  const biggestDrawdown = sortedByChange[0].commodity;
  const biggestBuild = sortedByChange[sortedByChange.length - 1].commodity;

  const summary = {
    totalMetalsValue,
    totalEnergyStocks,
    avgDaysOfSupply,
    biggestDrawdown,
    biggestBuild,
  };

  return {
    summary,
    metals,
    energy,
    agriculture,
    warehouseFlows,
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
    console.error('[CommodityInventory] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity inventory data' });
  }
});

export default router;
