import { Router } from 'express';

const router = Router();

// ── PRNG (deterministic daily) ──

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRng(tag: string) {
  const day = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + day));
}

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// ── Types ──

interface GSCPIData {
  gscpi: number;
  change: number;
  percentile: number;
  trend: 'rising' | 'falling' | 'stable';
  historicalAvg: number;
}

interface ShippingRate {
  route: string;
  rate: number;
  change: number;
  changePercent: number;
  unit: string;
  high52w: number;
  low52w: number;
}

interface PortCongestion {
  port: string;
  vesselQueue: number;
  avgWaitDays: number;
  throughputChange: number;
  status: 'normal' | 'elevated' | 'severe';
}

interface SupplierDeliveryTime {
  country: string;
  index: number;
  change: number;
  status: 'improving' | 'worsening' | 'stable';
}

interface CommodityFreight {
  commodity: string;
  route: string;
  rate: number;
  change: number;
  unit: string;
}

interface InventoryToSales {
  sector: string;
  ratio: number;
  change: number;
  historicalAvg: number;
  status: 'above_avg' | 'below_avg' | 'at_avg';
}

interface SupplyChainStressResponse {
  gscpi: GSCPIData;
  shippingRates: ShippingRate[];
  portCongestion: PortCongestion[];
  supplierDeliveryTimes: SupplierDeliveryTime[];
  commodityFreight: CommodityFreight[];
  inventoryToSales: InventoryToSales[];
  timestamp: string;
}

// ── Seed Data ──

const SHIPPING_SEEDS = [
  { route: 'Shanghai-LA', baseRate: 2800, unit: '$/FEU', baseHigh: 4200, baseLow: 1600 },
  { route: 'Shanghai-Rotterdam', baseRate: 2400, unit: '$/FEU', baseHigh: 3800, baseLow: 1500 },
  { route: 'Transpacific', baseRate: 3100, unit: '$/FEU', baseHigh: 4500, baseLow: 1800 },
  { route: 'Transatlantic', baseRate: 2200, unit: '$/FEU', baseHigh: 3500, baseLow: 1400 },
  { route: 'Baltic Dry', baseRate: 1800, unit: 'index', baseHigh: 2500, baseLow: 1200 },
];

const PORT_SEEDS = [
  { port: 'LA/Long Beach', baseQueue: 18, baseWait: 2.8 },
  { port: 'Shanghai', baseQueue: 24, baseWait: 1.6 },
  { port: 'Rotterdam', baseQueue: 12, baseWait: 1.2 },
  { port: 'Singapore', baseQueue: 20, baseWait: 1.4 },
  { port: 'Busan', baseQueue: 10, baseWait: 0.9 },
  { port: 'Hamburg', baseQueue: 14, baseWait: 1.5 },
];

const DELIVERY_SEEDS = [
  { country: 'US', baseIndex: 49.5 },
  { country: 'China', baseIndex: 50.8 },
  { country: 'Eurozone', baseIndex: 47.2 },
  { country: 'Japan', baseIndex: 48.6 },
  { country: 'Germany', baseIndex: 46.8 },
  { country: 'UK', baseIndex: 49.0 },
];

const COMMODITY_FREIGHT_SEEDS = [
  { commodity: 'Iron Ore', route: 'Tubarao-Qingdao', baseRate: 22.5, unit: '$/ton' },
  { commodity: 'Coal', route: 'Newcastle-Japan', baseRate: 14.8, unit: '$/ton' },
  { commodity: 'Grain', route: 'USG-Rotterdam', baseRate: 42.0, unit: '$/ton' },
  { commodity: 'LNG', route: 'US-Asia', baseRate: 85000, unit: '$/day' },
  { commodity: 'Crude', route: 'MEG-China', baseRate: 48000, unit: '$/day' },
];

const INVENTORY_SEEDS = [
  { sector: 'Retail', baseRatio: 1.28, histAvg: 1.30 },
  { sector: 'Wholesale', baseRatio: 1.35, histAvg: 1.32 },
  { sector: 'Manufacturing', baseRatio: 1.48, histAvg: 1.42 },
  { sector: 'Auto', baseRatio: 0.72, histAvg: 0.85 },
  { sector: 'Electronics', baseRatio: 1.15, histAvg: 1.20 },
];

// ── Data Generation ──

function generateGSCPI(rng: () => number): GSCPIData {
  // Normal range -1 to +1, spikes to +4
  const base = 0.35;
  const gscpi = roundTo(base + (rng() - 0.5) * 1.2, 2);
  const change = roundTo((rng() - 0.48) * 0.4, 2);
  const percentile = Math.round(Math.max(1, Math.min(99, 50 + gscpi * 20 + (rng() - 0.5) * 10)));
  const historicalAvg = 0.0;

  let trend: 'rising' | 'falling' | 'stable';
  if (change > 0.08) trend = 'rising';
  else if (change < -0.08) trend = 'falling';
  else trend = 'stable';

  return { gscpi, change, percentile, trend, historicalAvg };
}

function generateShippingRates(rng: () => number): ShippingRate[] {
  return SHIPPING_SEEDS.map((seed) => {
    const rate = Math.round(jitter(rng, seed.baseRate, 0.15));
    const changePct = roundTo((rng() - 0.48) * 12, 2);
    const changeAbs = Math.round(rate * changePct / 100);
    const high52w = Math.round(jitter(rng, seed.baseHigh, 0.08));
    const low52w = Math.round(jitter(rng, seed.baseLow, 0.08));

    return {
      route: seed.route,
      rate,
      change: changeAbs,
      changePercent: changePct,
      unit: seed.unit,
      high52w,
      low52w,
    };
  });
}

function generatePortCongestion(rng: () => number): PortCongestion[] {
  return PORT_SEEDS.map((seed) => {
    const vesselQueue = Math.max(0, Math.round(jitter(rng, seed.baseQueue, 0.25)));
    const avgWaitDays = roundTo(Math.max(0.1, jitter(rng, seed.baseWait, 0.3)), 1);
    const throughputChange = roundTo((rng() - 0.48) * 15, 1);

    let status: 'normal' | 'elevated' | 'severe';
    if (avgWaitDays <= 1.5) status = 'normal';
    else if (avgWaitDays <= 3.0) status = 'elevated';
    else status = 'severe';

    return { port: seed.port, vesselQueue, avgWaitDays, throughputChange, status };
  });
}

function generateSupplierDeliveryTimes(rng: () => number): SupplierDeliveryTime[] {
  return DELIVERY_SEEDS.map((seed) => {
    // PMI delivery component: below 50 = longer times (worse), above 50 = shorter (better)
    const index = roundTo(jitter(rng, seed.baseIndex, 0.06), 1);
    const change = roundTo((rng() - 0.48) * 3, 1);

    let status: 'improving' | 'worsening' | 'stable';
    if (index > 51.5) status = 'improving';
    else if (index < 48.5) status = 'worsening';
    else status = 'stable';

    return { country: seed.country, index, change, status };
  });
}

function generateCommodityFreight(rng: () => number): CommodityFreight[] {
  return COMMODITY_FREIGHT_SEEDS.map((seed) => {
    const rate = seed.baseRate >= 1000
      ? Math.round(jitter(rng, seed.baseRate, 0.14))
      : roundTo(jitter(rng, seed.baseRate, 0.14), 1);
    const change = seed.baseRate >= 1000
      ? Math.round((rng() - 0.48) * seed.baseRate * 0.08)
      : roundTo((rng() - 0.48) * seed.baseRate * 0.08, 1);

    return { commodity: seed.commodity, route: seed.route, rate, change, unit: seed.unit };
  });
}

function generateInventoryToSales(rng: () => number): InventoryToSales[] {
  return INVENTORY_SEEDS.map((seed) => {
    const ratio = roundTo(jitter(rng, seed.baseRatio, 0.06), 2);
    const change = roundTo((rng() - 0.48) * 0.08, 3);

    let status: 'above_avg' | 'below_avg' | 'at_avg';
    if (ratio > seed.histAvg * 1.03) status = 'above_avg';
    else if (ratio < seed.histAvg * 0.97) status = 'below_avg';
    else status = 'at_avg';

    return { sector: seed.sector, ratio, change, historicalAvg: seed.histAvg, status };
  });
}

function generateAll(): SupplyChainStressResponse {
  const rng = seededRng('supply-chain-stress');

  return {
    gscpi: generateGSCPI(rng),
    shippingRates: generateShippingRates(rng),
    portCongestion: generatePortCongestion(rng),
    supplierDeliveryTimes: generateSupplierDeliveryTimes(rng),
    commodityFreight: generateCommodityFreight(rng),
    inventoryToSales: generateInventoryToSales(rng),
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: SupplyChainStressResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateAll();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SupplyChainStress] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch supply chain stress data' });
  }
});

export default router;
