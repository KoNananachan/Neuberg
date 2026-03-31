import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// --- Seeded PRNG utilities ---

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// --- Types ---

interface DryBulkIndex {
  index: string;
  value: number;
  change1D: number;
  change1W: number;
  change1M: number;
  yearHigh: number;
  yearLow: number;
}

interface TankerRate {
  route: string;
  vessel: string;
  ratePerDay: number;
  worldscale: number;
  change1W: number;
  status: 'firming' | 'steady' | 'softening';
}

interface ContainerRate {
  route: string;
  rate: number;
  change1W: number;
  change1M: number;
  index: string;
  capacityUtilization: number;
}

interface VesselSupply {
  orderbook: number;
  scrapping: number;
  newDeliveries: number;
  fleetGrowth: number;
  avgVesselAge: number;
}

interface PortCongestion {
  port: string;
  waitingVessels: number;
  avgWaitDays: number;
  change1W: number;
  congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
}

interface CommodityFlow {
  commodity: string;
  tradeVolume: number;
  change1Y: number;
  topRoute: string;
  freightCost: number;
}

interface ShippingFreightResponse {
  dryBulkIndices: DryBulkIndex[];
  tankerRates: TankerRate[];
  containerRates: ContainerRate[];
  vesselSupply: VesselSupply;
  portCongestion: PortCongestion[];
  commodityFlows: CommodityFlow[];
  generatedAt: string;
}

// --- Cache ---


let cache: { data: ShippingFreightResponse; ts: number } | null = null;

// --- Data generation ---

function generate(): ShippingFreightResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('shipping-freight-' + today));

  // Dry Bulk Indices
  const dryBulkDefs: { name: string; min: number; max: number }[] = [
    { name: 'Baltic Dry Index (BDI)', min: 800, max: 2500 },
    { name: 'Baltic Capesize (BCI)', min: 1000, max: 4000 },
    { name: 'Baltic Panamax (BPI)', min: 600, max: 2200 },
    { name: 'Baltic Supramax (BSI)', min: 500, max: 1800 },
    { name: 'Baltic Handysize (BHSI)', min: 400, max: 1200 },
  ];

  const dryBulkIndices: DryBulkIndex[] = dryBulkDefs.map(def => {
    const value = Math.round(def.min + rng() * (def.max - def.min));
    const change1D = round((rng() - 0.5) * 6, 2);
    const change1W = round((rng() - 0.48) * 12, 2);
    const change1M = round((rng() - 0.45) * 20, 2);
    const yearHigh = Math.round(clamp(value * (1.1 + rng() * 0.3), def.min, def.max * 1.1));
    const yearLow = Math.round(clamp(value * (0.5 + rng() * 0.3), def.min * 0.9, value));
    return { index: def.name, value, change1D, change1W, change1M, yearHigh, yearLow };
  });

  // Tanker Rates
  const tankerDefs: { route: string; vessel: string; rateMin: number; rateMax: number }[] = [
    { route: 'VLCC AG-East', vessel: 'VLCC (300k DWT)', rateMin: 20000, rateMax: 120000 },
    { route: 'Suezmax WAF-UKC', vessel: 'Suezmax (160k DWT)', rateMin: 15000, rateMax: 90000 },
    { route: 'Aframax Cross-Med', vessel: 'Aframax (110k DWT)', rateMin: 10000, rateMax: 70000 },
    { route: 'MR TC14', vessel: 'MR Tanker (50k DWT)', rateMin: 10000, rateMax: 55000 },
  ];

  const statusOptions: ('firming' | 'steady' | 'softening')[] = ['firming', 'steady', 'softening'];

  const tankerRates: TankerRate[] = tankerDefs.map(def => {
    const ratePerDay = Math.round(clamp(def.rateMin + rng() * (def.rateMax - def.rateMin), 10000, 120000));
    const worldscale = round(clamp(50 + rng() * 100, 50, 150), 1);
    const change1W = round((rng() - 0.48) * 14, 2);
    const status = statusOptions[Math.floor(rng() * statusOptions.length)];
    return { route: def.route, vessel: def.vessel, ratePerDay, worldscale, change1W, status };
  });

  // Container Rates
  const containerDefs: { route: string; rateMin: number; rateMax: number; idx: string }[] = [
    { route: 'Shanghai-Rotterdam', rateMin: 1500, rateMax: 8000, idx: 'SCFI' },
    { route: 'Shanghai-LA', rateMin: 1200, rateMax: 7000, idx: 'SCFI' },
    { route: 'Shanghai-NY', rateMin: 2000, rateMax: 8000, idx: 'SCFI' },
    { route: 'Shanghai-Santos', rateMin: 1800, rateMax: 7500, idx: 'CCFI' },
    { route: 'Shanghai-Dubai', rateMin: 1000, rateMax: 5000, idx: 'CCFI' },
  ];

  const containerRates: ContainerRate[] = containerDefs.map(def => {
    const rate = Math.round(clamp(def.rateMin + rng() * (def.rateMax - def.rateMin), 1000, 8000));
    const change1W = round((rng() - 0.48) * 10, 2);
    const change1M = round((rng() - 0.45) * 18, 2);
    const capacityUtilization = round(clamp(70 + rng() * 25, 70, 95), 1);
    return { route: def.route, rate, change1W, change1M, index: def.idx, capacityUtilization };
  });

  // Vessel Supply
  const vesselSupply: VesselSupply = {
    orderbook: round(clamp(5 + rng() * 10, 5, 15), 1),
    scrapping: round(2 + rng() * 8, 1),
    newDeliveries: Math.round(50 + rng() * 200),
    fleetGrowth: round((rng() - 0.2) * 5, 2),
    avgVesselAge: round(clamp(10 + rng() * 4, 10, 14), 1),
  };

  // Port Congestion
  const portDefs: { port: string; baseVessels: number; baseWait: number }[] = [
    { port: 'Shanghai', baseVessels: 45, baseWait: 3.5 },
    { port: 'Singapore', baseVessels: 55, baseWait: 2.8 },
    { port: 'Rotterdam', baseVessels: 20, baseWait: 1.8 },
    { port: 'Los Angeles', baseVessels: 30, baseWait: 4.2 },
  ];

  const portCongestion: PortCongestion[] = portDefs.map(def => {
    const waitingVessels = Math.round(clamp(def.baseVessels * (0.6 + rng() * 0.8), 5, 80));
    const avgWaitDays = round(clamp(def.baseWait * (0.5 + rng() * 1.2), 1, 12), 1);
    const change1W = Math.round((rng() - 0.5) * 10);
    let congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
    if (waitingVessels < 20) congestionLevel = 'low';
    else if (waitingVessels < 40) congestionLevel = 'moderate';
    else if (waitingVessels < 60) congestionLevel = 'high';
    else congestionLevel = 'severe';
    return { port: def.port, waitingVessels, avgWaitDays, change1W, congestionLevel };
  });

  // Commodity Flows
  const flowDefs: { commodity: string; baseVolume: number; topRoute: string; baseFreight: number }[] = [
    { commodity: 'Iron Ore', baseVolume: 1500, topRoute: 'W.Australia-China', baseFreight: 8.5 },
    { commodity: 'Coal', baseVolume: 1100, topRoute: 'Indonesia-India', baseFreight: 10.2 },
    { commodity: 'Grain', baseVolume: 520, topRoute: 'US Gulf-Asia', baseFreight: 32.0 },
    { commodity: 'Crude Oil', baseVolume: 2100, topRoute: 'MEG-East Asia', baseFreight: 5.8 },
  ];

  const commodityFlows: CommodityFlow[] = flowDefs.map(def => {
    const tradeVolume = round(def.baseVolume * (0.9 + rng() * 0.2), 1);
    const change1Y = round((rng() - 0.45) * 10, 2);
    const freightCost = round(def.baseFreight * (0.8 + rng() * 0.4), 2);
    return { commodity: def.commodity, tradeVolume, change1Y, topRoute: def.topRoute, freightCost };
  });

  return {
    dryBulkIndices,
    tankerRates,
    containerRates,
    vesselSupply,
    portCongestion,
    commodityFlows,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ShippingFreight] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate shipping freight data' });
  }
});

export default router;
