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

interface GlobalOverview {
  totalReactors: number;
  operatingCapacityGW: number;
  underConstructionCount: number;
  underConstructionGW: number;
  shareOfGlobalElectricityPct: number;
  plannedReactors: number;
  uraniumPricePerLb: number;
}

interface CountryFleet {
  country: string;
  operatingReactors: number;
  capacityGW: number;
  shareOfElectricityPct: number;
  underConstruction: number;
  planned: number;
  uraniumRequirementTonnes: number;
  fleetAgeAvgYears: number;
}

interface UraniumProducer {
  country: string;
  sharePct: number;
}

interface SpotPricePoint {
  month: string;
  pricePerLb: number;
}

interface UraniumMarket {
  spotPrice: number;
  longTermContractPrice: number;
  conversionPrice: number;
  enrichmentSWUPrice: number;
  topProducers: UraniumProducer[];
  globalInventoryMonths: number;
  secondarySupplyPct: number;
  spotPriceHistory: SpotPricePoint[];
}

interface NewBuildProject {
  project: string;
  country: string;
  reactorType: string;
  capacityMW: number;
  constructor: string;
  status: 'under-construction' | 'approved' | 'planned' | 'proposed';
  expectedCommissioning: string;
  estimatedCostBillions: number;
}

interface SMRDesign {
  design: string;
  developer: string;
  capacityMW: number;
  status: 'licensed' | 'under-review' | 'design-phase' | 'construction';
  firstDeploymentExpected: string;
  orderCount: number;
}

interface NuclearPolicyEntry {
  country: string;
  policyDirection: 'expanding' | 'maintaining' | 'phase-out' | 'reversal';
  recentAction: string;
  date: string;
}

interface NuclearEnergyResponse {
  globalOverview: GlobalOverview;
  countryFleets: CountryFleet[];
  uraniumMarket: UraniumMarket;
  newBuildPipeline: NewBuildProject[];
  smrPipeline: SMRDesign[];
  nuclearPolicyTracker: NuclearPolicyEntry[];
  generatedAt: string;
}

// -- Seed Data --

const COUNTRY_FLEET_SEEDS = [
  { country: 'United States', reactors: 93, capacityGW: 95, electricityPct: 19, underConstruction: 2, planned: 3, uraniumTonnes: 17500, avgAge: 42 },
  { country: 'France', reactors: 56, capacityGW: 61, electricityPct: 65, underConstruction: 1, planned: 6, uraniumTonnes: 8000, avgAge: 38 },
  { country: 'China', reactors: 55, capacityGW: 53, electricityPct: 5, underConstruction: 22, planned: 40, uraniumTonnes: 10500, avgAge: 9 },
  { country: 'Japan', reactors: 12, capacityGW: 10, electricityPct: 7, underConstruction: 2, planned: 1, uraniumTonnes: 2200, avgAge: 33 },
  { country: 'Russia', reactors: 37, capacityGW: 28, electricityPct: 20, underConstruction: 4, planned: 28, uraniumTonnes: 5400, avgAge: 28 },
  { country: 'South Korea', reactors: 26, capacityGW: 25, electricityPct: 30, underConstruction: 3, planned: 6, uraniumTonnes: 4800, avgAge: 22 },
  { country: 'India', reactors: 23, capacityGW: 7.5, electricityPct: 3, underConstruction: 8, planned: 12, uraniumTonnes: 1200, avgAge: 24 },
  { country: 'Canada', reactors: 19, capacityGW: 13.6, electricityPct: 15, underConstruction: 0, planned: 2, uraniumTonnes: 1800, avgAge: 39 },
  { country: 'United Kingdom', reactors: 9, capacityGW: 5.9, electricityPct: 15, underConstruction: 2, planned: 4, uraniumTonnes: 1300, avgAge: 36 },
  { country: 'Ukraine', reactors: 15, capacityGW: 13.1, electricityPct: 55, underConstruction: 2, planned: 0, uraniumTonnes: 2400, avgAge: 32 },
  { country: 'Sweden', reactors: 6, capacityGW: 6.9, electricityPct: 30, underConstruction: 0, planned: 2, uraniumTonnes: 1400, avgAge: 40 },
  { country: 'Finland', reactors: 5, capacityGW: 4.4, electricityPct: 35, underConstruction: 0, planned: 1, uraniumTonnes: 900, avgAge: 30 },
];

const URANIUM_PRODUCER_SEEDS = [
  { country: 'Kazakhstan', sharePct: 43 },
  { country: 'Canada', sharePct: 15 },
  { country: 'Namibia', sharePct: 11 },
  { country: 'Australia', sharePct: 8 },
  { country: 'Uzbekistan', sharePct: 7 },
];

const NEW_BUILD_SEEDS: {
  project: string;
  country: string;
  reactorType: string;
  capacityMW: number;
  constructor: string;
  status: 'under-construction' | 'approved' | 'planned' | 'proposed';
  expectedCommissioning: string;
  estimatedCostBillions: number;
}[] = [
  { project: 'Hinkley Point C', country: 'United Kingdom', reactorType: 'EPR', capacityMW: 3260, constructor: 'EDF Energy', status: 'under-construction', expectedCommissioning: '2029', estimatedCostBillions: 33 },
  { project: 'Barakah Unit 4', country: 'UAE', reactorType: 'APR-1400', capacityMW: 1400, constructor: 'KEPCO', status: 'under-construction', expectedCommissioning: '2025', estimatedCostBillions: 6 },
  { project: 'Akkuyu Unit 1', country: 'Turkey', reactorType: 'VVER-1200', capacityMW: 1200, constructor: 'Rosatom', status: 'under-construction', expectedCommissioning: '2026', estimatedCostBillions: 5.5 },
  { project: 'Vogtle Unit 3 & 4', country: 'United States', reactorType: 'AP1000', capacityMW: 2234, constructor: 'Southern Nuclear', status: 'under-construction', expectedCommissioning: '2025', estimatedCostBillions: 34 },
  { project: 'Flamanville 3', country: 'France', reactorType: 'EPR', capacityMW: 1650, constructor: 'EDF', status: 'under-construction', expectedCommissioning: '2025', estimatedCostBillions: 13.2 },
  { project: 'Sizewell C', country: 'United Kingdom', reactorType: 'EPR', capacityMW: 3260, constructor: 'EDF Energy', status: 'approved', expectedCommissioning: '2034', estimatedCostBillions: 28 },
  { project: 'Jaitapur', country: 'India', reactorType: 'EPR', capacityMW: 9900, constructor: 'EDF / NPCIL', status: 'planned', expectedCommissioning: '2035', estimatedCostBillions: 20 },
  { project: 'El Dabaa Unit 1-4', country: 'Egypt', reactorType: 'VVER-1200', capacityMW: 4800, constructor: 'Rosatom', status: 'under-construction', expectedCommissioning: '2028', estimatedCostBillions: 25 },
  { project: 'Shin Hanul 3 & 4', country: 'South Korea', reactorType: 'APR-1400', capacityMW: 2800, constructor: 'KHNP', status: 'approved', expectedCommissioning: '2032', estimatedCostBillions: 9 },
  { project: 'Penly EPR2', country: 'France', reactorType: 'EPR2', capacityMW: 1670, constructor: 'EDF', status: 'planned', expectedCommissioning: '2035', estimatedCostBillions: 8.5 },
];

const SMR_SEEDS: {
  design: string;
  developer: string;
  capacityMW: number;
  status: 'licensed' | 'under-review' | 'design-phase' | 'construction';
  firstDeploymentExpected: string;
  baseOrders: number;
}[] = [
  { design: 'NuScale VOYGR', developer: 'NuScale Power', capacityMW: 462, status: 'licensed', firstDeploymentExpected: '2030', baseOrders: 4 },
  { design: 'BWRX-300', developer: 'GE-Hitachi Nuclear Energy', capacityMW: 300, status: 'under-review', firstDeploymentExpected: '2029', baseOrders: 6 },
  { design: 'Xe-100', developer: 'X-energy', capacityMW: 80, status: 'under-review', firstDeploymentExpected: '2030', baseOrders: 3 },
  { design: 'Rolls-Royce SMR', developer: 'Rolls-Royce SMR Ltd', capacityMW: 470, status: 'under-review', firstDeploymentExpected: '2031', baseOrders: 5 },
  { design: 'KP-FHR', developer: 'Kairos Power', capacityMW: 140, status: 'construction', firstDeploymentExpected: '2027', baseOrders: 2 },
  { design: 'Natrium', developer: 'TerraPower', capacityMW: 345, status: 'construction', firstDeploymentExpected: '2028', baseOrders: 1 },
];

const POLICY_SEEDS: {
  country: string;
  policyDirection: 'expanding' | 'maintaining' | 'phase-out' | 'reversal';
  recentAction: string;
}[] = [
  { country: 'Japan', policyDirection: 'reversal', recentAction: 'Approved restart of 12 reactors under new safety standards; policy shift from post-Fukushima phase-out to active nuclear utilization' },
  { country: 'Germany', policyDirection: 'phase-out', recentAction: 'Shut down last 3 reactors in April 2023; ongoing political debate on nuclear reversal amid energy security concerns' },
  { country: 'United States', policyDirection: 'expanding', recentAction: 'IRA provides $30B+ in nuclear production tax credits; new licensing pathway for advanced reactors under NRC reform' },
  { country: 'France', policyDirection: 'expanding', recentAction: 'Announced EPR2 program with 6-14 new reactors; legislation to remove 50% nuclear cap; fleet life extension to 60 years' },
  { country: 'China', policyDirection: 'expanding', recentAction: 'Approved 10 new reactors per year; targeting 150 GW nuclear capacity by 2035 under 14th Five-Year Plan acceleration' },
  { country: 'South Korea', policyDirection: 'reversal', recentAction: 'Reversed Moon-era phase-out policy; resumed Shin Hanul construction; targeting 30%+ nuclear share by 2036' },
  { country: 'India', policyDirection: 'expanding', recentAction: 'Fleet expansion plan of 22 reactors; pursuing indigenous PHWR and imported LWR; targeting 22.5 GW by 2031' },
  { country: 'United Kingdom', policyDirection: 'expanding', recentAction: 'Great British Nuclear program launched; Sizewell C approved; targeting 24 GW nuclear by 2050' },
  { country: 'Sweden', policyDirection: 'reversal', recentAction: 'Lifted ban on new nuclear construction; government target of doubling electricity production with nuclear as key pillar' },
  { country: 'Belgium', policyDirection: 'reversal', recentAction: 'Extended Doel 4 and Tihange 3 operations by 10 years; reversed planned 2025 nuclear exit' },
];

// -- Data Generation --

function generate(): NuclearEnergyResponse {
  const rng = seededRandom('nuclear-energy');

  // -- Global Overview --
  const totalReactors = Math.round(jitter(rng, 440, 0.02));
  const operatingCapacityGW = roundTo(jitter(rng, 390, 0.03), 1);
  const underConstructionCount = Math.round(jitter(rng, 60, 0.08));
  const underConstructionGW = roundTo(jitter(rng, 65, 0.08), 1);
  const shareOfGlobalElectricityPct = roundTo(jitter(rng, 10, 0.05), 1);
  const plannedReactors = Math.round(jitter(rng, 110, 0.1));
  const uraniumPricePerLb = roundTo(jitter(rng, 90, 0.06), 2);

  const globalOverview: GlobalOverview = {
    totalReactors,
    operatingCapacityGW,
    underConstructionCount,
    underConstructionGW,
    shareOfGlobalElectricityPct,
    plannedReactors,
    uraniumPricePerLb,
  };

  // -- Country Fleets --
  const countryFleets: CountryFleet[] = COUNTRY_FLEET_SEEDS.map(c => ({
    country: c.country,
    operatingReactors: Math.round(jitter(rng, c.reactors, 0.02)),
    capacityGW: roundTo(jitter(rng, c.capacityGW, 0.03), 1),
    shareOfElectricityPct: roundTo(jitter(rng, c.electricityPct, 0.05), 1),
    underConstruction: Math.round(jitter(rng, Math.max(c.underConstruction, 0.5), 0.15)),
    planned: Math.round(jitter(rng, Math.max(c.planned, 0.5), 0.15)),
    uraniumRequirementTonnes: Math.round(jitter(rng, c.uraniumTonnes, 0.05)),
    fleetAgeAvgYears: roundTo(jitter(rng, c.avgAge, 0.05), 1),
  }));

  // -- Uranium Market --
  const spotPrice = roundTo(jitter(rng, 90, 0.06), 2);
  const longTermContractPrice = roundTo(jitter(rng, 72, 0.05), 2);
  const conversionPrice = roundTo(jitter(rng, 38, 0.08), 2);
  const enrichmentSWUPrice = roundTo(jitter(rng, 165, 0.06), 2);
  const globalInventoryMonths = roundTo(jitter(rng, 18, 0.1), 1);
  const secondarySupplyPct = roundTo(jitter(rng, 12, 0.1), 1);

  const topProducers: UraniumProducer[] = URANIUM_PRODUCER_SEEDS.map(p => ({
    country: p.country,
    sharePct: roundTo(jitter(rng, p.sharePct, 0.05), 1),
  }));

  const spotPriceHistory: SpotPricePoint[] = [];
  const now = new Date();
  let prevPrice = spotPrice * (1 - rng() * 0.12);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7);
    prevPrice = roundTo(prevPrice * (1 + (rng() - 0.45) * 0.06), 2);
    spotPriceHistory.push({ month: monthStr, pricePerLb: prevPrice });
  }

  const uraniumMarket: UraniumMarket = {
    spotPrice,
    longTermContractPrice,
    conversionPrice,
    enrichmentSWUPrice,
    topProducers,
    globalInventoryMonths,
    secondarySupplyPct,
    spotPriceHistory,
  };

  // -- New Build Pipeline --
  const newBuildPipeline: NewBuildProject[] = NEW_BUILD_SEEDS.map(p => ({
    project: p.project,
    country: p.country,
    reactorType: p.reactorType,
    capacityMW: Math.round(jitter(rng, p.capacityMW, 0.01)),
    constructor: p.constructor,
    status: p.status,
    expectedCommissioning: p.expectedCommissioning,
    estimatedCostBillions: roundTo(jitter(rng, p.estimatedCostBillions, 0.08), 1),
  }));

  // -- SMR Pipeline --
  const smrPipeline: SMRDesign[] = SMR_SEEDS.map(s => ({
    design: s.design,
    developer: s.developer,
    capacityMW: s.capacityMW,
    status: s.status,
    firstDeploymentExpected: s.firstDeploymentExpected,
    orderCount: Math.max(0, Math.round(jitter(rng, s.baseOrders, 0.2))),
  }));

  // -- Nuclear Policy Tracker --
  const nuclearPolicyTracker: NuclearPolicyEntry[] = POLICY_SEEDS.map((p, i) => {
    const daysAgo = Math.floor(rng() * 120) + i * 15;
    const actionDate = new Date();
    actionDate.setDate(actionDate.getDate() - daysAgo);
    return {
      country: p.country,
      policyDirection: p.policyDirection,
      recentAction: p.recentAction,
      date: actionDate.toISOString().slice(0, 10),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  return {
    globalOverview,
    countryFleets,
    uraniumMarket,
    newBuildPipeline,
    smrPipeline,
    nuclearPolicyTracker,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: NuclearEnergyResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60_000;

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
    console.error('[NuclearEnergy] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate nuclear energy data' });
  }
});

export default router;
