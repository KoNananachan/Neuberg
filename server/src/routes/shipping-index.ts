import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// --- Base data definitions ---

const DRY_BULK_INDEX_DEFS = [
  { id: 'BDI', name: 'Baltic Dry Index', base: 1650 },
  { id: 'BCI', name: 'Baltic Capesize Index', base: 2350 },
  { id: 'BPI', name: 'Baltic Panamax Index', base: 1420 },
  { id: 'BSI', name: 'Baltic Supramax Index', base: 1080 },
  { id: 'BHSI', name: 'Baltic Handysize Index', base: 620 },
];

const CONTAINER_ROUTE_DEFS = [
  { lane: 'Shanghai-LA', baseRate: 3800 },
  { lane: 'Shanghai-Rotterdam', baseRate: 4200 },
  { lane: 'Shanghai-Santos', baseRate: 5600 },
  { lane: 'Shanghai-Dubai', baseRate: 1950 },
  { lane: 'Shanghai-Singapore', baseRate: 520 },
];

const TANKER_DEFS = [
  { type: 'VLCC', baseTce: 42000, route: 'MEG-China', baseWs: 58 },
  { type: 'Suezmax', baseTce: 34000, route: 'WAF-UKC', baseWs: 82 },
  { type: 'Aframax', baseTce: 28000, route: 'N.Sea-UKC', baseWs: 118 },
  { type: 'MR', baseTce: 21000, route: 'AG-Japan', baseWs: 170 },
];

const FLEET_DEFS = [
  { type: 'Capesize', baseFleet: 1850, baseOrderbook: 8.2, baseAge: 10.5, baseScrapping: 1.8 },
  { type: 'Panamax', baseFleet: 2600, baseOrderbook: 6.5, baseAge: 11.2, baseScrapping: 2.1 },
  { type: 'Handymax', baseFleet: 3200, baseOrderbook: 7.8, baseAge: 10.8, baseScrapping: 1.5 },
  { type: 'VLCC', baseFleet: 850, baseOrderbook: 9.1, baseAge: 9.8, baseScrapping: 1.2 },
  { type: 'Container', baseFleet: 5500, baseOrderbook: 11.5, baseAge: 13.2, baseScrapping: 2.5 },
];

const PORT_DEFS = [
  { name: 'Shanghai', baseWaiting: 48, baseWaitDays: 2.4 },
  { name: 'Singapore', baseWaiting: 55, baseWaitDays: 1.9 },
  { name: 'Rotterdam', baseWaiting: 28, baseWaitDays: 1.6 },
  { name: 'LA/LB', baseWaiting: 35, baseWaitDays: 3.2 },
  { name: 'Busan', baseWaiting: 22, baseWaitDays: 1.3 },
  { name: 'Dubai', baseWaiting: 32, baseWaitDays: 2.8 },
  { name: 'Hamburg', baseWaiting: 18, baseWaitDays: 1.5 },
  { name: 'Piraeus', baseWaiting: 15, baseWaitDays: 1.1 },
  { name: 'Antwerp', baseWaiting: 20, baseWaitDays: 1.7 },
  { name: 'Ningbo', baseWaiting: 40, baseWaitDays: 2.2 },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// --- Cache ---


let cacheData: unknown = null;
let cacheTime = 0;

// --- Data generation ---

function generateData() {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(today));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Dry Bulk Indices
  const dryBulkIndices = DRY_BULK_INDEX_DEFS.map(def => {
    const value = Math.round(jitter(def.base, 0.12));
    const change = Math.round((rng() - 0.5) * def.base * 0.04);
    const changePct = Math.round((change / def.base) * 10000) / 100;
    const avg30d = Math.round(jitter(def.base, 0.06));
    const high52w = Math.round(def.base * (1.2 + rng() * 0.25));
    const low52w = Math.round(def.base * (0.55 + rng() * 0.2));
    return {
      id: def.id,
      name: def.name,
      value,
      change,
      changePct,
      '30dAvg': avg30d,
      '52wHigh': high52w,
      '52wLow': low52w,
    };
  });

  // Container Rates ($/FEU)
  const containerRates = CONTAINER_ROUTE_DEFS.map(def => {
    const rate = Math.round(jitter(def.baseRate, 0.15));
    const change = Math.round((rng() - 0.5) * def.baseRate * 0.06);
    const weeklyChangePct = Math.round((rng() - 0.48) * 10 * 100) / 100;
    const spotVsContract = Math.round((rng() - 0.4) * 30 * 100) / 100;
    return {
      lane: def.lane,
      rate,
      change,
      weeklyChangePct,
      spotVsContract,
    };
  });

  // Tanker Rates
  const tankerRates = TANKER_DEFS.map(def => {
    const tce = Math.round(jitter(def.baseTce, 0.16));
    const change = Math.round((rng() - 0.5) * def.baseTce * 0.05);
    const worldscale = Math.round(jitter(def.baseWs, 0.14) * 10) / 10;
    return {
      type: def.type,
      tce,
      change,
      route: def.route,
      worldscale,
    };
  });

  // Fleet Data
  const fleetData = FLEET_DEFS.map(def => {
    const fleetSize = Math.round(jitter(def.baseFleet, 0.03));
    const orderbookPct = Math.round(jitter(def.baseOrderbook, 0.12) * 10) / 10;
    const averageAge = Math.round(jitter(def.baseAge, 0.05) * 10) / 10;
    const scrappingRate = Math.round(jitter(def.baseScrapping, 0.15) * 10) / 10;
    return {
      type: def.type,
      fleetSize,
      orderbookPct,
      averageAge,
      scrappingRate,
    };
  });

  // Port Congestion
  const portCongestion = PORT_DEFS.map(def => {
    const waitingVessels = Math.round(jitter(def.baseWaiting, 0.25));
    const avgWaitDays = Math.round(jitter(def.baseWaitDays, 0.3) * 10) / 10;
    let congestionLevel: string;
    if (avgWaitDays < 1.5) congestionLevel = 'low';
    else if (avgWaitDays < 2.5) congestionLevel = 'moderate';
    else if (avgWaitDays < 3.5) congestionLevel = 'high';
    else congestionLevel = 'severe';
    return {
      port: def.name,
      waitingVessels,
      avgWaitDays,
      congestionLevel,
    };
  });

  // Monthly Trend - BDI values for last 6 months
  const now = new Date();
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthLabel = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    const bdiValue = Math.round(jitter(1650, 0.15));
    return { month: monthLabel, bdi: bdiValue };
  });

  return {
    dryBulkIndices,
    containerRates,
    tankerRates,
    fleetData,
    portCongestion,
    monthlyTrend,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generateData();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[ShippingIndex] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate shipping index data' });
  }
});

export default router;
