import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface ShippingRate {
  route: string;
  type: 'CONTAINER' | 'BULK' | 'TANKER';
  rate: number;
  unit: string;
  change1w: number;
  change1m: number;
  index: number;
  capacity: number;
}

interface PortCongestion {
  port: string;
  avgWaitDays: number;
  vesselQueue: number;
  throughput: number;
  change1m: number;
  congestionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
}

interface SupplyChainIndicator {
  name: string;
  value: number;
  change1m: number;
  percentile: number;
  signal: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
}

interface SupplyChainSummary {
  avgShippingRate: number;
  avgPortWait: number;
  supplyChainStress: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  bdiLevel: number;
  timestamp: string;
}

interface GlobalSupplyChainResponse {
  shippingRates: ShippingRate[];
  portCongestion: PortCongestion[];
  indicators: SupplyChainIndicator[];
  summary: SupplyChainSummary;
}

// ── Seed Data: 8 Shipping Routes ──

interface ShippingRouteSeed {
  route: string;
  type: 'CONTAINER' | 'BULK' | 'TANKER';
  baseRate: number;
  unit: string;
  baseIndex: number;
  baseCapacity: number;
}

const SHIPPING_ROUTE_SEEDS: ShippingRouteSeed[] = [
  { route: 'Shanghai-LA',         type: 'CONTAINER', baseRate: 2450,  unit: '$/TEU',  baseIndex: 108, baseCapacity: 88 },
  { route: 'Shanghai-Rotterdam',  type: 'CONTAINER', baseRate: 1980,  unit: '$/TEU',  baseIndex: 104, baseCapacity: 85 },
  { route: 'Singapore-NY',        type: 'CONTAINER', baseRate: 3150,  unit: '$/TEU',  baseIndex: 112, baseCapacity: 82 },
  { route: 'Busan-Hamburg',       type: 'CONTAINER', baseRate: 2280,  unit: '$/TEU',  baseIndex: 106, baseCapacity: 84 },
  { route: 'AG-Japan',            type: 'TANKER',    baseRate: 42500, unit: '$/day',  baseIndex: 118, baseCapacity: 91 },
  { route: 'USG-China',           type: 'TANKER',    baseRate: 38000, unit: '$/day',  baseIndex: 110, baseCapacity: 87 },
  { route: 'Tubarao-Qingdao',     type: 'BULK',      baseRate: 18500, unit: '$/day',  baseIndex: 98,  baseCapacity: 78 },
  { route: 'Richards Bay-ARA',    type: 'BULK',      baseRate: 12800, unit: '$/day',  baseIndex: 94,  baseCapacity: 74 },
];

// ── Seed Data: 10 Major Ports ──

interface PortSeed {
  port: string;
  baseWaitDays: number;
  baseVesselQueue: number;
  baseThroughput: number;
}

const PORT_SEEDS: PortSeed[] = [
  { port: 'Shanghai',    baseWaitDays: 1.8, baseVesselQueue: 42, baseThroughput: 4280000 },
  { port: 'Singapore',   baseWaitDays: 1.4, baseVesselQueue: 38, baseThroughput: 3150000 },
  { port: 'Rotterdam',   baseWaitDays: 1.2, baseVesselQueue: 22, baseThroughput: 1250000 },
  { port: 'LA/LB',       baseWaitDays: 2.5, baseVesselQueue: 35, baseThroughput: 820000  },
  { port: 'Busan',       baseWaitDays: 1.0, baseVesselQueue: 18, baseThroughput: 1850000 },
  { port: 'Hamburg',     baseWaitDays: 1.3, baseVesselQueue: 16, baseThroughput: 720000  },
  { port: 'Antwerp',     baseWaitDays: 1.5, baseVesselQueue: 20, baseThroughput: 1080000 },
  { port: 'Shenzhen',    baseWaitDays: 1.6, baseVesselQueue: 30, baseThroughput: 2350000 },
  { port: 'Dubai',       baseWaitDays: 1.1, baseVesselQueue: 24, baseThroughput: 1150000 },
  { port: 'Santos',      baseWaitDays: 3.2, baseVesselQueue: 45, baseThroughput: 380000  },
];

// ── Seed Data: 8 Supply Chain Indicators ──

interface IndicatorSeed {
  name: string;
  baseValue: number;
  basePercentile: number;
}

const INDICATOR_SEEDS: IndicatorSeed[] = [
  { name: 'Global PMI Supplier Delivery', baseValue: 49.2, basePercentile: 45 },
  { name: 'Baltic Dry Index',             baseValue: 1680, basePercentile: 52 },
  { name: 'HARPEX Container Index',       baseValue: 1120, basePercentile: 48 },
  { name: 'Freightos Baltic Index',       baseValue: 2340, basePercentile: 55 },
  { name: 'US Inventory-to-Sales',        baseValue: 1.33, basePercentile: 58 },
  { name: 'China Export PMI',             baseValue: 50.8, basePercentile: 50 },
  { name: 'Suez Canal Transits',          baseValue: 68,   basePercentile: 42 },
  { name: 'Panama Canal Transits',        baseValue: 32,   basePercentile: 38 },
];

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyVariation(base: number, rng: () => number, pctRange: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pctRange);
}

// ── Data Generation ──

function generateShippingRates(rng: () => number): ShippingRate[] {
  return SHIPPING_ROUTE_SEEDS.map((seed) => {
    const rate = Math.round(applyVariation(seed.baseRate, rng, 0.12));
    const index = roundTo(applyVariation(seed.baseIndex, rng, 0.06), 1);
    const capacity = clamp(roundTo(applyVariation(seed.baseCapacity, rng, 0.08), 1), 50, 100);
    const change1w = roundTo((rng() - 0.48) * 8, 1);
    const change1m = roundTo((rng() - 0.46) * 15, 1);

    return {
      route: seed.route,
      type: seed.type,
      rate,
      unit: seed.unit,
      change1w,
      change1m,
      index,
      capacity,
    };
  });
}

function generatePortCongestion(rng: () => number): PortCongestion[] {
  return PORT_SEEDS.map((seed) => {
    const avgWaitDays = roundTo(applyVariation(seed.baseWaitDays, rng, 0.20), 1);
    const vesselQueue = Math.max(0, Math.round(applyVariation(seed.baseVesselQueue, rng, 0.15)));
    const throughput = Math.round(applyVariation(seed.baseThroughput, rng, 0.05));
    const change1m = roundTo((rng() - 0.48) * 12, 1);

    let congestionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
    if (avgWaitDays <= 1.0) {
      congestionLevel = 'LOW';
    } else if (avgWaitDays <= 2.0) {
      congestionLevel = 'MODERATE';
    } else if (avgWaitDays <= 3.0) {
      congestionLevel = 'HIGH';
    } else {
      congestionLevel = 'SEVERE';
    }

    return {
      port: seed.port,
      avgWaitDays,
      vesselQueue,
      throughput,
      change1m,
      congestionLevel,
    };
  });
}

function generateIndicators(rng: () => number): SupplyChainIndicator[] {
  return INDICATOR_SEEDS.map((seed) => {
    const value = roundTo(applyVariation(seed.baseValue, rng, 0.06), 2);
    const change1m = roundTo((rng() - 0.46) * 8, 1);
    const percentile = clamp(Math.round(applyVariation(seed.basePercentile, rng, 0.12)), 0, 100);

    const signalRoll = rng();
    let signal: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
    if (signalRoll < 0.30) {
      signal = 'IMPROVING';
    } else if (signalRoll < 0.62) {
      signal = 'STABLE';
    } else {
      signal = 'DETERIORATING';
    }

    return {
      name: seed.name,
      value,
      change1m,
      percentile,
      signal,
    };
  });
}

function generateSummary(
  shippingRates: ShippingRate[],
  portCongestion: PortCongestion[],
  indicators: SupplyChainIndicator[],
  rng: () => number,
): SupplyChainSummary {
  // Average shipping rate across container routes only ($/TEU)
  const containerRates = shippingRates.filter((r) => r.type === 'CONTAINER');
  const avgShippingRate = Math.round(
    containerRates.reduce((sum, r) => sum + r.rate, 0) / containerRates.length,
  );

  // Average port wait across all ports
  const avgPortWait = roundTo(
    portCongestion.reduce((sum, p) => sum + p.avgWaitDays, 0) / portCongestion.length,
    1,
  );

  // BDI from indicators
  const bdiEntry = indicators.find((i) => i.name === 'Baltic Dry Index');
  const bdiLevel = bdiEntry ? bdiEntry.value : 1680;

  // Deterministic stress level
  const stressRoll = rng();
  let supplyChainStress: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  if (stressRoll < 0.20) {
    supplyChainStress = 'LOW';
  } else if (stressRoll < 0.55) {
    supplyChainStress = 'MODERATE';
  } else if (stressRoll < 0.82) {
    supplyChainStress = 'ELEVATED';
  } else {
    supplyChainStress = 'HIGH';
  }

  return {
    avgShippingRate,
    avgPortWait,
    supplyChainStress,
    bdiLevel,
    timestamp: new Date().toISOString(),
  };
}

function generateGlobalSupplyChainData(): GlobalSupplyChainResponse {
  const rng = seededRandom('global-supply-chain');
  const shippingRates = generateShippingRates(rng);
  const portCongestion = generatePortCongestion(rng);
  const indicators = generateIndicators(rng);
  const summary = generateSummary(shippingRates, portCongestion, indicators, rng);

  return { shippingRates, portCongestion, indicators, summary };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: GlobalSupplyChainResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateGlobalSupplyChainData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GlobalSupplyChain] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch global supply chain data' });
  }
});

export default router;
