import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();


// ── Static Definitions ──

interface SupplyDemandConfig {
  commodity: string;
  supplyBase: number;
  demandBase: number;
  unit: string;
}

interface InventoryConfig {
  commodity: string;
  currentBase: number;
  fiveYearAvgBase: number;
  daysOfSupplyBase: number;
}

interface ProducerConfig {
  country: string;
  oilBase: number;     // mbd
  gasBase: number;     // bcf/d
  capacityBase: number; // %
}

interface PriceFundConfig {
  commodity: string;
  priceBase: number;
  fairValueBase: number;
}

const SUPPLY_DEMAND: SupplyDemandConfig[] = [
  { commodity: 'Crude Oil',   supplyBase: 101.8, demandBase: 102.3, unit: 'mbd' },
  { commodity: 'Natural Gas', supplyBase: 410,   demandBase: 405,   unit: 'bcf/d' },
  { commodity: 'Gold',        supplyBase: 4800,  demandBase: 4650,  unit: 'mt/yr' },
  { commodity: 'Copper',      supplyBase: 22.4,  demandBase: 22.8,  unit: 'mt (M)' },
  { commodity: 'Wheat',       supplyBase: 790,   demandBase: 795,   unit: 'mt (M)' },
  { commodity: 'Soybeans',    supplyBase: 395,   demandBase: 385,   unit: 'mt (M)' },
];

const INVENTORY: InventoryConfig[] = [
  { commodity: 'WTI Crude',     currentBase: 440,   fiveYearAvgBase: 465,  daysOfSupplyBase: 26 },
  { commodity: 'Brent Crude',   currentBase: 285,   fiveYearAvgBase: 310,  daysOfSupplyBase: 29 },
  { commodity: 'Natural Gas',   currentBase: 2180,  fiveYearAvgBase: 2350, daysOfSupplyBase: 33 },
  { commodity: 'RBOB Gasoline', currentBase: 235,   fiveYearAvgBase: 240,  daysOfSupplyBase: 25 },
  { commodity: 'Copper',        currentBase: 195,   fiveYearAvgBase: 220,  daysOfSupplyBase: 14 },
  { commodity: 'Aluminum',      currentBase: 485,   fiveYearAvgBase: 520,  daysOfSupplyBase: 18 },
  { commodity: 'Wheat',         currentBase: 580,   fiveYearAvgBase: 620,  daysOfSupplyBase: 42 },
  { commodity: 'Corn',          currentBase: 1420,  fiveYearAvgBase: 1500, daysOfSupplyBase: 38 },
];

const OPEC_PRODUCERS = [
  { country: 'Saudi Arabia', productionBase: 9.0,  quotaBase: 10.0 },
  { country: 'Iraq',         productionBase: 4.3,  quotaBase: 4.4 },
  { country: 'UAE',          productionBase: 3.2,  quotaBase: 3.2 },
  { country: 'Kuwait',       productionBase: 2.55, quotaBase: 2.7 },
  { country: 'Nigeria',      productionBase: 1.45, quotaBase: 1.8 },
];

const PRODUCERS: ProducerConfig[] = [
  { country: 'Saudi Arabia', oilBase: 9.0,   gasBase: 12.5, capacityBase: 73 },
  { country: 'Russia',       oilBase: 9.4,   gasBase: 65.0, capacityBase: 85 },
  { country: 'United States',oilBase: 13.3,  gasBase: 105.0,capacityBase: 92 },
  { country: 'Iraq',         oilBase: 4.3,   gasBase: 10.8, capacityBase: 88 },
  { country: 'UAE',          oilBase: 3.2,   gasBase: 6.2,  capacityBase: 72 },
  { country: 'Canada',       oilBase: 4.9,   gasBase: 17.5, capacityBase: 90 },
  { country: 'China',        oilBase: 4.2,   gasBase: 22.0, capacityBase: 95 },
  { country: 'Brazil',       oilBase: 3.7,   gasBase: 5.2,  capacityBase: 86 },
];

const PRICE_FUND: PriceFundConfig[] = [
  { commodity: 'WTI Crude',     priceBase: 78.5,   fairValueBase: 74.0 },
  { commodity: 'Brent Crude',   priceBase: 82.3,   fairValueBase: 78.5 },
  { commodity: 'Natural Gas',   priceBase: 2.85,   fairValueBase: 3.10 },
  { commodity: 'Gold',          priceBase: 2340,    fairValueBase: 2180 },
  { commodity: 'Copper',        priceBase: 8450,    fairValueBase: 8100 },
  { commodity: 'Wheat',         priceBase: 585,     fairValueBase: 610 },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function round2(n: number): number { return Math.round(n * 100) / 100; }

function pickSignal(rng: () => number): 'bullish' | 'bearish' | 'neutral' {
  const v = rng();
  if (v < 0.35) return 'bullish';
  if (v < 0.7) return 'bearish';
  return 'neutral';
}

function pickTrend(rng: () => number): 'building' | 'drawing' | 'flat' {
  const v = rng();
  if (v < 0.4) return 'drawing';
  if (v < 0.75) return 'building';
  return 'flat';
}

// ── Data generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-fundamental'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Supply/Demand Balance
  const supplyDemandBalance = SUPPLY_DEMAND.map(sd => {
    const supply = round2(jitter(sd.supplyBase, 0.06));
    const demand = round2(jitter(sd.demandBase, 0.06));
    const balance = round2(supply - demand);
    const yoySupplyChange = round2((rng() - 0.4) * 5);
    const yoyDemandChange = round2((rng() - 0.35) * 5);
    return {
      commodity: sd.commodity,
      supply,
      demand,
      balance,
      balanceStatus: balance >= 0 ? 'surplus' as const : 'deficit' as const,
      yoySupplyChange,
      yoyDemandChange,
      unit: sd.unit,
    };
  });

  // 2. Inventory Tracker
  const inventoryTracker = INVENTORY.map(inv => {
    const currentInventory = round2(jitter(inv.currentBase, 0.1));
    const fiveYearAvg = round2(jitter(inv.fiveYearAvgBase, 0.03));
    const percentOfAvg = round2((currentInventory / fiveYearAvg) * 100);
    const weeklyChange = round2((rng() - 0.5) * 8);
    const daysOfSupply = round2(jitter(inv.daysOfSupplyBase, 0.1));
    const trend = pickTrend(rng);
    return {
      commodity: inv.commodity,
      currentInventory,
      fiveYearAvg,
      percentOfAvg,
      weeklyChange,
      daysOfSupply,
      trend,
    };
  });

  // 3. OPEC Monitor
  const topProducers = OPEC_PRODUCERS.map(p => {
    const production = round2(jitter(p.productionBase, 0.04));
    const quota = round2(p.quotaBase);
    const compliance = round2(Math.min(120, Math.max(60, (quota / production) * 100 * (0.9 + rng() * 0.2))));
    return {
      country: p.country,
      production,
      quota,
      compliance,
    };
  });

  const totalProduction = round2(topProducers.reduce((s, p) => s + p.production, 0) + jitter(7.5, 0.05));
  const totalQuota = round2(topProducers.reduce((s, p) => s + p.quota, 0) + 8.2);
  const overallCompliance = round2((totalQuota / totalProduction) * 100 * (0.92 + rng() * 0.08));

  // Generate next meeting date (deterministic from rng)
  const meetingMonth = Math.floor(rng() * 6) + 1;
  const meetingDay = Math.floor(rng() * 20) + 5;
  const nextMeetingDate = `2026-${String(meetingMonth + 3).padStart(2, '0')}-${String(meetingDay).padStart(2, '0')}`;

  const decisions = [
    'Maintain current production cuts of 2.0 mbd through Q2 2026',
    'Extend voluntary cuts of 1.66 mbd until end of 2026',
    'Gradual increase of 0.4 mbd starting next quarter',
    'Hold production steady; review at next meeting',
  ];
  const lastDecision = decisions[Math.floor(rng() * decisions.length)];

  const opecMonitor = {
    totalProduction,
    quota: totalQuota,
    compliance: overallCompliance,
    topProducers,
    nextMeetingDate,
    lastDecision,
  };

  // 4. Production Data
  const productionData = PRODUCERS.map(p => {
    const oilProduction = round2(jitter(p.oilBase, 0.05));
    const gasProduction = round2(jitter(p.gasBase, 0.06));
    const yoyChange = round2((rng() - 0.4) * 6);
    const capacityUtilization = round2(Math.min(99, jitter(p.capacityBase, 0.05)));
    return {
      country: p.country,
      oilProduction,
      gasProduction,
      yoyChange,
      capacityUtilization,
    };
  });

  // 5. Price vs Fundamentals
  const priceFundamentals = PRICE_FUND.map(pf => {
    const currentPrice = round2(jitter(pf.priceBase, 0.08));
    const fairValue = round2(jitter(pf.fairValueBase, 0.05));
    const premiumDiscount = round2(((currentPrice - fairValue) / fairValue) * 100);
    const inventorySignal = pickSignal(rng);
    const momentumSignal = pickSignal(rng);
    return {
      commodity: pf.commodity,
      currentPrice,
      fairValue,
      premiumDiscount,
      inventorySignal,
      momentumSignal,
    };
  });

  return {
    supplyDemandBalance,
    inventoryTracker,
    opecMonitor,
    productionData,
    priceFundamentals,
    timestamp: new Date().toISOString(),
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
    console.error('[CommodityFundamental] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity fundamental data' });
  }
});

export default router;
