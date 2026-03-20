import { Router } from 'express';

const router = Router();

// ── PRNG (deterministic daily) ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRng(tag: string): () => number {
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

interface StockEntry {
  ticker: string;
  name: string;
  sector: 'fabless' | 'IDM' | 'foundry' | 'equipment' | 'analog';
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number;
}

interface FoundryEntry {
  name: string;
  utilization: number;
  capacity: string;
  leadTime: string;
}

interface InventoryCycle {
  phase: 'buildup' | 'peak' | 'correction' | 'trough';
  daysOfInventory: number;
  yoyChange: number;
}

interface EndMarketEntry {
  segment: string;
  growth: number;
  revenue: number;
  outlook: 'strong' | 'stable' | 'weak';
}

interface WaferShipmentEntry {
  month: string;
  shipmentsM_sqin: number;
}

interface IndexPerformance {
  level: number;
  dailyChange: number;
  dailyChangePercent: number;
  ytdReturn: number;
  high52w: number;
  low52w: number;
}

interface SemiconductorResponse {
  stocks: StockEntry[];
  foundryUtilization: FoundryEntry[];
  inventoryCycle: InventoryCycle;
  endMarketDemand: EndMarketEntry[];
  waferShipments: WaferShipmentEntry[];
  indexPerformance: IndexPerformance;
  timestamp: string;
}

// ── Seed Data ──

const STOCK_SEEDS: {
  ticker: string;
  name: string;
  sector: StockEntry['sector'];
  basePrice: number;
  baseMktCap: number;
  basePE: number;
}[] = [
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'fabless', basePrice: 875, baseMktCap: 2150, basePE: 65 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'fabless', basePrice: 178, baseMktCap: 288, basePE: 48 },
  { ticker: 'INTC', name: 'Intel', sector: 'IDM', basePrice: 31, baseMktCap: 132, basePE: 22 },
  { ticker: 'TSM', name: 'Taiwan Semiconductor', sector: 'foundry', basePrice: 148, baseMktCap: 765, basePE: 28 },
  { ticker: 'ASML', name: 'ASML Holding', sector: 'equipment', basePrice: 920, baseMktCap: 368, basePE: 42 },
  { ticker: 'AVGO', name: 'Broadcom', sector: 'fabless', basePrice: 168, baseMktCap: 780, basePE: 36 },
  { ticker: 'QCOM', name: 'Qualcomm', sector: 'fabless', basePrice: 172, baseMktCap: 192, basePE: 22 },
  { ticker: 'TXN', name: 'Texas Instruments', sector: 'analog', basePrice: 178, baseMktCap: 162, basePE: 30 },
  { ticker: 'MU', name: 'Micron Technology', sector: 'IDM', basePrice: 112, baseMktCap: 124, basePE: 25 },
  { ticker: 'MRVL', name: 'Marvell Technology', sector: 'fabless', basePrice: 72, baseMktCap: 62, basePE: 44 },
  { ticker: 'LRCX', name: 'Lam Research', sector: 'equipment', basePrice: 940, baseMktCap: 122, basePE: 26 },
  { ticker: 'KLAC', name: 'KLA Corporation', sector: 'equipment', basePrice: 720, baseMktCap: 98, basePE: 28 },
  { ticker: 'AMAT', name: 'Applied Materials', sector: 'equipment', basePrice: 205, baseMktCap: 170, basePE: 24 },
  { ticker: 'ON', name: 'ON Semiconductor', sector: 'analog', basePrice: 72, baseMktCap: 31, basePE: 18 },
  { ticker: 'NXPI', name: 'NXP Semiconductors', sector: 'analog', basePrice: 245, baseMktCap: 62, basePE: 22 },
];

const FOUNDRY_SEEDS = [
  { name: 'TSMC', baseUtil: 92, capacity: '16M wafers/yr (12" equiv)', baseLeadWeeks: 14 },
  { name: 'Samsung Foundry', baseUtil: 78, capacity: '4.2M wafers/yr (12" equiv)', baseLeadWeeks: 12 },
  { name: 'GlobalFoundries', baseUtil: 85, capacity: '2.4M wafers/yr (12" equiv)', baseLeadWeeks: 16 },
  { name: 'UMC', baseUtil: 82, capacity: '2.8M wafers/yr (12" equiv)', baseLeadWeeks: 10 },
  { name: 'SMIC', baseUtil: 80, capacity: '1.8M wafers/yr (12" equiv)', baseLeadWeeks: 11 },
];

const END_MARKET_SEEDS = [
  { segment: 'Datacenter / AI', baseGrowth: 32, baseRevenue: 92 },
  { segment: 'Mobile', baseGrowth: 4.5, baseRevenue: 145 },
  { segment: 'Automotive', baseGrowth: 14, baseRevenue: 68 },
  { segment: 'PC / Client', baseGrowth: 2.8, baseRevenue: 78 },
  { segment: 'Industrial', baseGrowth: 5.2, baseRevenue: 58 },
  { segment: 'IoT / Edge', baseGrowth: 8.5, baseRevenue: 32 },
];

// ── Data Generation ──

function generateStocks(rng: () => number): StockEntry[] {
  return STOCK_SEEDS.map((seed) => {
    const price = roundTo(jitter(rng, seed.basePrice, 0.06), 2);
    const changePercent = roundTo((rng() - 0.48) * 6, 2);
    const change = roundTo(price * changePercent / 100, 2);
    const marketCap = roundTo(jitter(rng, seed.baseMktCap, 0.05), 1);
    const pe = roundTo(jitter(rng, seed.basePE, 0.08), 1);

    return {
      ticker: seed.ticker,
      name: seed.name,
      sector: seed.sector,
      price,
      change,
      changePercent,
      marketCap,
      pe,
    };
  });
}

function generateFoundryUtilization(rng: () => number): FoundryEntry[] {
  return FOUNDRY_SEEDS.map((seed) => {
    const utilization = roundTo(Math.min(100, Math.max(50, jitter(rng, seed.baseUtil, 0.06))), 1);
    const leadWeeks = Math.max(4, Math.round(jitter(rng, seed.baseLeadWeeks, 0.15)));

    return {
      name: seed.name,
      utilization,
      capacity: seed.capacity,
      leadTime: `${leadWeeks} weeks`,
    };
  });
}

function generateInventoryCycle(rng: () => number): InventoryCycle {
  const phases: InventoryCycle['phase'][] = ['buildup', 'peak', 'correction', 'trough'];
  const phaseIndex = Math.floor(rng() * phases.length);
  const phase = phases[phaseIndex];

  let baseDays: number;
  let baseYoy: number;
  switch (phase) {
    case 'buildup':
      baseDays = 98;
      baseYoy = 8;
      break;
    case 'peak':
      baseDays = 115;
      baseYoy = 14;
      break;
    case 'correction':
      baseDays = 105;
      baseYoy = -6;
      break;
    case 'trough':
      baseDays = 78;
      baseYoy = -12;
      break;
  }

  const daysOfInventory = Math.round(jitter(rng, baseDays, 0.08));
  const yoyChange = roundTo(jitter(rng, Math.abs(baseYoy), 0.2) * Math.sign(baseYoy), 1);

  return { phase, daysOfInventory, yoyChange };
}

function generateEndMarketDemand(rng: () => number): EndMarketEntry[] {
  return END_MARKET_SEEDS.map((seed) => {
    const growth = roundTo(jitter(rng, Math.abs(seed.baseGrowth), 0.15) * Math.sign(seed.baseGrowth), 1);
    const revenue = roundTo(jitter(rng, seed.baseRevenue, 0.06), 1);

    let outlook: 'strong' | 'stable' | 'weak';
    if (growth > 10) outlook = 'strong';
    else if (growth > 3) outlook = 'stable';
    else outlook = 'weak';

    return {
      segment: seed.segment,
      growth,
      revenue,
      outlook,
    };
  });
}

function generateWaferShipments(rng: () => number): WaferShipmentEntry[] {
  const now = new Date();
  const entries: WaferShipmentEntry[] = [];
  const baseShipment = 3650; // millions of sq inches per month (SEMI data range)

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7);
    const shipments = Math.round(jitter(rng, baseShipment, 0.04));
    entries.push({ month, shipmentsM_sqin: shipments });
  }

  return entries;
}

function generateIndexPerformance(rng: () => number): IndexPerformance {
  const baseLevel = 4850;
  const level = roundTo(jitter(rng, baseLevel, 0.06), 2);
  const dailyChangePercent = roundTo((rng() - 0.48) * 4, 2);
  const dailyChange = roundTo(level * dailyChangePercent / 100, 2);
  const ytdReturn = roundTo((rng() - 0.35) * 30, 2);
  const high52w = roundTo(level * (1 + rng() * 0.18 + 0.02), 2);
  const low52w = roundTo(level * (1 - rng() * 0.22 - 0.05), 2);

  return { level, dailyChange, dailyChangePercent, ytdReturn, high52w, low52w };
}

function generateAll(): SemiconductorResponse {
  const rng = seededRng('semiconductor');

  return {
    stocks: generateStocks(rng),
    foundryUtilization: generateFoundryUtilization(rng),
    inventoryCycle: generateInventoryCycle(rng),
    endMarketDemand: generateEndMarketDemand(rng),
    waferShipments: generateWaferShipments(rng),
    indexPerformance: generateIndexPerformance(rng),
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cacheData: SemiconductorResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generateAll();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[Semiconductor] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate semiconductor index data' });
  }
});

export default router;
