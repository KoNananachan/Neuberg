import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; return h >>> 0; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Helpers --

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// -- Interfaces --

interface MineralPrice {
  mineral: string;
  pricePerUnit: number;
  unit: string;
  dailyChangePct: number;
  yearToDateChangePct: number;
  yearHighPrice: number;
  yearLowPrice: number;
  primaryUse: string;
  supplyConcentration: 'high' | 'moderate' | 'low';
}

interface SupplyChainConcentration {
  mineral: string;
  topProducerCountry: string;
  topProducerSharePct: number;
  topProcessorCountry: string;
  topProcessorSharePct: number;
  chinaProcessingSharePct: number;
  reservesDistribution: { country: string; sharePct: number }[];
}

interface StrategicReserve {
  entity: string;
  reserveStatusByMineral: string[];
  monthsOfSupply: number;
  stockpilingTarget: string;
  budgetBillions: number;
}

interface DemandDriver {
  sector: string;
  demandGrowthPct: number;
  keyMinerals: string[];
  projectedDemand2030vs2024: number;
}

interface TradePolicyAction {
  country: string;
  action: string;
  affectedMinerals: string[];
  impactAssessment: string;
  date: string;
}

interface MarketOverview {
  totalMarketSizeBillions: number;
  yearOverYearGrowthPct: number;
  chinaSupplySharePct: number;
  supplyRiskIndex: number;
}

interface CriticalMineralsResponse {
  marketOverview: MarketOverview;
  mineralPrices: MineralPrice[];
  supplyChainConcentration: SupplyChainConcentration[];
  strategicReserves: StrategicReserve[];
  demandDrivers: DemandDriver[];
  tradePolicyActions: TradePolicyAction[];
  generatedAt: string;
}

// -- Seed Data --

const MINERAL_SEEDS = [
  { mineral: 'Lithium Carbonate', basePrice: 12, unit: 'kg', primaryUse: 'EV Batteries', concentration: 'high' as const, topProducer: 'Australia', topProducerShare: 47, topProcessor: 'China', topProcessorShare: 65, chinaProcessing: 65, reserves: [{ country: 'Chile', sharePct: 36 }, { country: 'Australia', sharePct: 24 }, { country: 'Argentina', sharePct: 11 }] },
  { mineral: 'Cobalt', basePrice: 28, unit: 'kg', primaryUse: 'EV Batteries', concentration: 'high' as const, topProducer: 'DR Congo', topProducerShare: 73, topProcessor: 'China', topProcessorShare: 72, chinaProcessing: 72, reserves: [{ country: 'DR Congo', sharePct: 46 }, { country: 'Australia', sharePct: 17 }, { country: 'Indonesia', sharePct: 5 }] },
  { mineral: 'Nickel', basePrice: 16, unit: 'kg', primaryUse: 'Stainless Steel / EV Batteries', concentration: 'moderate' as const, topProducer: 'Indonesia', topProducerShare: 49, topProcessor: 'China', topProcessorShare: 35, chinaProcessing: 35, reserves: [{ country: 'Indonesia', sharePct: 22 }, { country: 'Australia', sharePct: 21 }, { country: 'Brazil', sharePct: 16 }] },
  { mineral: 'Neodymium', basePrice: 80, unit: 'kg', primaryUse: 'Permanent Magnets (Wind / EV)', concentration: 'high' as const, topProducer: 'China', topProducerShare: 60, topProcessor: 'China', topProcessorShare: 90, chinaProcessing: 90, reserves: [{ country: 'China', sharePct: 37 }, { country: 'Vietnam', sharePct: 18 }, { country: 'Brazil', sharePct: 8 }] },
  { mineral: 'Praseodymium', basePrice: 75, unit: 'kg', primaryUse: 'Permanent Magnets / Glass', concentration: 'high' as const, topProducer: 'China', topProducerShare: 60, topProcessor: 'China', topProcessorShare: 88, chinaProcessing: 88, reserves: [{ country: 'China', sharePct: 37 }, { country: 'Vietnam', sharePct: 18 }, { country: 'Brazil', sharePct: 8 }] },
  { mineral: 'Dysprosium', basePrice: 300, unit: 'kg', primaryUse: 'High-Temp Magnets (EV Motors)', concentration: 'high' as const, topProducer: 'China', topProducerShare: 90, topProcessor: 'China', topProcessorShare: 98, chinaProcessing: 98, reserves: [{ country: 'China', sharePct: 40 }, { country: 'Myanmar', sharePct: 12 }, { country: 'Australia', sharePct: 6 }] },
  { mineral: 'Gallium', basePrice: 300, unit: 'kg', primaryUse: 'Semiconductors / LEDs', concentration: 'high' as const, topProducer: 'China', topProducerShare: 98, topProcessor: 'China', topProcessorShare: 98, chinaProcessing: 98, reserves: [{ country: 'China', sharePct: 80 }, { country: 'Japan', sharePct: 6 }, { country: 'South Korea', sharePct: 4 }] },
  { mineral: 'Germanium', basePrice: 1500, unit: 'kg', primaryUse: 'Fiber Optics / IR Optics', concentration: 'high' as const, topProducer: 'China', topProducerShare: 60, topProcessor: 'China', topProcessorShare: 67, chinaProcessing: 67, reserves: [{ country: 'China', sharePct: 41 }, { country: 'USA', sharePct: 15 }, { country: 'Russia', sharePct: 10 }] },
  { mineral: 'Graphite', basePrice: 0.8, unit: 'kg', primaryUse: 'Battery Anodes', concentration: 'high' as const, topProducer: 'China', topProducerShare: 65, topProcessor: 'China', topProcessorShare: 93, chinaProcessing: 93, reserves: [{ country: 'Turkey', sharePct: 27 }, { country: 'Brazil', sharePct: 22 }, { country: 'China', sharePct: 16 }] },
  { mineral: 'Tungsten', basePrice: 35, unit: 'kg', primaryUse: 'Cemented Carbide / Defense', concentration: 'high' as const, topProducer: 'China', topProducerShare: 82, topProcessor: 'China', topProcessorShare: 86, chinaProcessing: 86, reserves: [{ country: 'China', sharePct: 52 }, { country: 'Vietnam', sharePct: 7 }, { country: 'Russia', sharePct: 5 }] },
  { mineral: 'Vanadium', basePrice: 25, unit: 'kg', primaryUse: 'Steel Alloys / Flow Batteries', concentration: 'moderate' as const, topProducer: 'China', topProducerShare: 66, topProcessor: 'China', topProcessorShare: 58, chinaProcessing: 58, reserves: [{ country: 'China', sharePct: 37 }, { country: 'Russia', sharePct: 25 }, { country: 'South Africa', sharePct: 18 }] },
  { mineral: 'Manganese', basePrice: 2, unit: 'kg', primaryUse: 'Steel / EV Batteries (LFP)', concentration: 'moderate' as const, topProducer: 'South Africa', topProducerShare: 37, topProcessor: 'China', topProcessorShare: 52, chinaProcessing: 52, reserves: [{ country: 'South Africa', sharePct: 28 }, { country: 'Australia', sharePct: 17 }, { country: 'Brazil', sharePct: 9 }] },
  { mineral: 'Scandium', basePrice: 3500, unit: 'kg', primaryUse: 'Aerospace Alloys / SOFCs', concentration: 'high' as const, topProducer: 'China', topProducerShare: 66, topProcessor: 'China', topProcessorShare: 70, chinaProcessing: 70, reserves: [{ country: 'China', sharePct: 31 }, { country: 'Philippines', sharePct: 20 }, { country: 'Russia', sharePct: 14 }] },
  { mineral: 'Indium', basePrice: 250, unit: 'kg', primaryUse: 'Touchscreens (ITO) / Solar PV', concentration: 'high' as const, topProducer: 'China', topProducerShare: 56, topProcessor: 'China', topProcessorShare: 62, chinaProcessing: 62, reserves: [{ country: 'China', sharePct: 43 }, { country: 'South Korea', sharePct: 14 }, { country: 'Japan', sharePct: 10 }] },
  { mineral: 'Tellurium', basePrice: 80, unit: 'kg', primaryUse: 'Solar PV (CdTe) / Thermoelectrics', concentration: 'moderate' as const, topProducer: 'China', topProducerShare: 55, topProcessor: 'China', topProcessorShare: 60, chinaProcessing: 60, reserves: [{ country: 'China', sharePct: 32 }, { country: 'USA', sharePct: 12 }, { country: 'Sweden', sharePct: 10 }] },
];

const STRATEGIC_RESERVE_SEEDS: {
  entity: string;
  minerals: string[];
  baseMonths: number;
  stockpilingTarget: string;
  baseBudget: number;
}[] = [
  { entity: 'United States', minerals: ['Cobalt', 'Lithium', 'Gallium', 'Germanium', 'Graphite', 'Manganese'], baseMonths: 6, stockpilingTarget: '3-year strategic reserve by 2030', baseBudget: 3.5 },
  { entity: 'European Union', minerals: ['Lithium', 'Cobalt', 'Nickel', 'Gallium', 'Graphite', 'Tungsten'], baseMonths: 3, stockpilingTarget: 'CRMA 65% domestic processing by 2030', baseBudget: 4.2 },
  { entity: 'Japan', minerals: ['Cobalt', 'Nickel', 'Neodymium', 'Dysprosium', 'Gallium', 'Indium'], baseMonths: 8, stockpilingTarget: '180-day buffer for 34 critical minerals', baseBudget: 2.8 },
  { entity: 'South Korea', minerals: ['Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Neodymium'], baseMonths: 4, stockpilingTarget: '100-day reserve for 33 minerals by 2027', baseBudget: 1.5 },
  { entity: 'Australia', minerals: ['Lithium', 'Cobalt', 'Nickel', 'Vanadium', 'Manganese'], baseMonths: 2, stockpilingTarget: 'Critical Minerals Strategy downstream expansion', baseBudget: 1.2 },
  { entity: 'India', minerals: ['Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Tungsten', 'Vanadium'], baseMonths: 2, stockpilingTarget: 'KABIL JV mineral security for 30 minerals', baseBudget: 0.8 },
];

const DEMAND_DRIVER_SEEDS = [
  { sector: 'EV Batteries', baseGrowth: 28, keyMinerals: ['Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Manganese'], projRatio: 3.8 },
  { sector: 'Wind Turbines', baseGrowth: 15, keyMinerals: ['Neodymium', 'Praseodymium', 'Dysprosium', 'Copper'], projRatio: 2.5 },
  { sector: 'Solar PV', baseGrowth: 22, keyMinerals: ['Tellurium', 'Indium', 'Gallium', 'Germanium'], projRatio: 3.2 },
  { sector: 'Semiconductors', baseGrowth: 12, keyMinerals: ['Gallium', 'Germanium', 'Indium', 'Scandium'], projRatio: 2.1 },
  { sector: 'Defense', baseGrowth: 8, keyMinerals: ['Tungsten', 'Cobalt', 'Neodymium', 'Dysprosium', 'Scandium'], projRatio: 1.8 },
  { sector: 'Consumer Electronics', baseGrowth: 5, keyMinerals: ['Indium', 'Gallium', 'Germanium', 'Cobalt', 'Lithium'], projRatio: 1.4 },
];

const TRADE_POLICY_POOL: {
  country: string;
  action: string;
  affectedMinerals: string[];
  impactAssessment: string;
}[] = [
  { country: 'China', action: 'Export controls on gallium and germanium products', affectedMinerals: ['Gallium', 'Germanium'], impactAssessment: 'Critical: 98% of gallium supply affected; semiconductor supply chain disruption likely' },
  { country: 'United States', action: 'IRA Section 45X domestic critical mineral sourcing requirements', affectedMinerals: ['Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Manganese'], impactAssessment: 'Significant: EV tax credits tied to domestic/FTA mineral sourcing thresholds' },
  { country: 'European Union', action: 'Critical Raw Materials Act mandating 10% domestic extraction', affectedMinerals: ['Lithium', 'Cobalt', 'Nickel', 'Gallium', 'Tungsten', 'Graphite'], impactAssessment: 'Major: Accelerates EU mining permits and recycling infrastructure investment' },
  { country: 'Indonesia', action: 'Nickel ore export ban extended to processed nickel products', affectedMinerals: ['Nickel'], impactAssessment: 'High: Forces downstream processing investment in Indonesia; disrupts traditional supply routes' },
  { country: 'China', action: 'Graphite export permit requirements for natural and synthetic grades', affectedMinerals: ['Graphite'], impactAssessment: 'Critical: 93% of battery-grade graphite processing at risk; anode supply chain realignment' },
  { country: 'Australia', action: 'Critical Minerals List expansion and fast-track mining approvals', affectedMinerals: ['Lithium', 'Cobalt', 'Vanadium', 'Scandium', 'Manganese'], impactAssessment: 'Moderate: Increases future supply but 5-7 year mine development timeline' },
  { country: 'Japan', action: 'JOGMEC strategic mineral stockpiling budget increase', affectedMinerals: ['Cobalt', 'Nickel', 'Neodymium', 'Dysprosium', 'Indium'], impactAssessment: 'Moderate: Strengthens Japan supply security but limited near-term market impact' },
  { country: 'India', action: 'KABIL joint venture to secure overseas lithium and cobalt mines', affectedMinerals: ['Lithium', 'Cobalt', 'Nickel'], impactAssessment: 'Moderate: India diversifying sourcing via Argentina and Australia mine acquisitions' },
  { country: 'China', action: 'Rare earth mining quotas tightened for environmental compliance', affectedMinerals: ['Neodymium', 'Praseodymium', 'Dysprosium', 'Scandium'], impactAssessment: 'High: Reduced output may push rare earth prices up 10-20% over 6 months' },
  { country: 'United States', action: 'Defense Production Act Title III funding for critical mineral processing', affectedMinerals: ['Tungsten', 'Gallium', 'Germanium', 'Cobalt'], impactAssessment: 'Significant: $500M+ allocated to domestic refining capacity buildout' },
  { country: 'Canada', action: 'Critical minerals investment tax credit (30% for extraction and processing)', affectedMinerals: ['Lithium', 'Nickel', 'Cobalt', 'Graphite', 'Vanadium'], impactAssessment: 'Moderate: Incentivizes new mining projects in Ontario and Quebec' },
  { country: 'DR Congo', action: 'State-owned cobalt trading company monopoly enforcement', affectedMinerals: ['Cobalt'], impactAssessment: 'High: Concentration of 73% of global production under state control raises supply risk' },
];

// -- Data Generation --

function generate(): CriticalMineralsResponse {
  const rng = seededRandom('critical-minerals');

  // -- Market Overview --
  const totalMarketSizeBillions = roundTo(jitter(rng, 320, 0.08), 1);
  const yearOverYearGrowthPct = roundTo(jitter(rng, 9.5, 0.3), 1);
  const chinaSupplySharePct = roundTo(60 + rng() * 10, 1);
  const supplyRiskIndex = roundTo(4 + rng() * 6, 1);

  const marketOverview: MarketOverview = {
    totalMarketSizeBillions,
    yearOverYearGrowthPct,
    chinaSupplySharePct,
    supplyRiskIndex,
  };

  // -- Mineral Prices --
  const mineralPrices: MineralPrice[] = MINERAL_SEEDS.map(m => {
    const price = roundTo(jitter(rng, m.basePrice, 0.15), m.basePrice < 1 ? 3 : 2);
    const dailyChangePct = roundTo((rng() - 0.48) * 6, 2);
    const yearToDateChangePct = roundTo((rng() - 0.4) * 40, 2);
    const yearHighPrice = roundTo(price * (1 + rng() * 0.25 + 0.05), m.basePrice < 1 ? 3 : 2);
    const yearLowPrice = roundTo(price * (1 - rng() * 0.25 - 0.05), m.basePrice < 1 ? 3 : 2);

    return {
      mineral: m.mineral,
      pricePerUnit: price,
      unit: m.unit,
      dailyChangePct,
      yearToDateChangePct,
      yearHighPrice,
      yearLowPrice,
      primaryUse: m.primaryUse,
      supplyConcentration: m.concentration,
    };
  });

  // -- Supply Chain Concentration --
  const supplyChainConcentration: SupplyChainConcentration[] = MINERAL_SEEDS.map(m => ({
    mineral: m.mineral,
    topProducerCountry: m.topProducer,
    topProducerSharePct: roundTo(jitter(rng, m.topProducerShare, 0.05), 1),
    topProcessorCountry: m.topProcessor,
    topProcessorSharePct: roundTo(jitter(rng, m.topProcessorShare, 0.05), 1),
    chinaProcessingSharePct: roundTo(jitter(rng, m.chinaProcessing, 0.05), 1),
    reservesDistribution: m.reserves.map(r => ({
      country: r.country,
      sharePct: roundTo(jitter(rng, r.sharePct, 0.08), 1),
    })),
  }));

  // -- Strategic Reserves --
  const strategicReserves: StrategicReserve[] = STRATEGIC_RESERVE_SEEDS.map(s => ({
    entity: s.entity,
    reserveStatusByMineral: s.minerals,
    monthsOfSupply: roundTo(jitter(rng, s.baseMonths, 0.15), 1),
    stockpilingTarget: s.stockpilingTarget,
    budgetBillions: roundTo(jitter(rng, s.baseBudget, 0.1), 2),
  }));

  // -- Demand Drivers --
  const demandDrivers: DemandDriver[] = DEMAND_DRIVER_SEEDS.map(dd => ({
    sector: dd.sector,
    demandGrowthPct: roundTo(jitter(rng, dd.baseGrowth, 0.15), 1),
    keyMinerals: dd.keyMinerals,
    projectedDemand2030vs2024: roundTo(jitter(rng, dd.projRatio, 0.1), 2),
  }));

  // -- Trade Policy & Geopolitics (pick 8) --
  const shuffled = [...TRADE_POLICY_POOL].sort(() => rng() - 0.5);
  const selectedActions = shuffled.slice(0, 8);
  const tradePolicyActions: TradePolicyAction[] = selectedActions.map((tp, i) => {
    const daysAgo = Math.floor(rng() * 180) + i * 20;
    const actionDate = new Date();
    actionDate.setDate(actionDate.getDate() - daysAgo);
    return {
      country: tp.country,
      action: tp.action,
      affectedMinerals: tp.affectedMinerals,
      impactAssessment: tp.impactAssessment,
      date: actionDate.toISOString().slice(0, 10),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  return {
    marketOverview,
    mineralPrices,
    supplyChainConcentration,
    strategicReserves,
    demandDrivers,
    tradePolicyActions,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: CriticalMineralsResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60_000;

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[CriticalMinerals] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate critical minerals data' });
  }
});

export default router;
