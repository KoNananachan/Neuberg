import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- PRNG (deterministic daily) --

// -- Helpers --

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// -- Types --

interface AggregateOverview {
  totalHyperscalerCapexBillions: number;
  aiRelatedCapexBillions: number;
  yearOverYearGrowthPct: number;
  dataCenterUnderConstructionGW: number;
  totalAIChipRevenueBillions: number;
}

interface GuidanceRange {
  low: number;
  high: number;
}

interface HyperscalerCapex {
  company: string;
  ticker: string;
  totalCapexBillions: number;
  aiCapexEstimateBillions: number;
  capexAsRevenuePct: number;
  yearOverYearChangePct: number;
  dataCentersMW: number;
  regionsCount: number;
  guidanceRange: GuidanceRange;
  lastUpdated: string;
}

interface NvidiaChipData {
  revenueDataCenterBillions: number;
  marketSharePct: number;
  latestGPU: string;
  supplyConstraint: 'low' | 'moderate' | 'severe' | 'critical';
}

interface AmdChipData {
  revenueBillions: number;
  marketSharePct: number;
  latestGPU: string;
  supplyStatus: string;
}

interface IntelChipData {
  revenueBillions: number;
  marketSharePct: number;
  latestGPU: string;
}

interface CustomChipEntry {
  status: string;
  estimatedDeployment: string;
}

interface CustomChips {
  googleTPU: CustomChipEntry;
  amazonTrainium: CustomChipEntry;
  metaMTIA: CustomChipEntry;
}

interface AIChipMarket {
  nvidia: NvidiaChipData;
  amd: AmdChipData;
  intel: IntelChipData;
  customChips: CustomChips;
  totalTAMBillions: number;
  growthRatePct: number;
}

interface DataCenterMarket {
  location: string;
  powerMW: number;
  availabilityPct: number;
  constructionPipeline: string;
  avgCostPerMW: number;
}

interface PowerSourceMix {
  renewablePct: number;
  naturalGasPct: number;
  nuclearPct: number;
  gridPct: number;
}

interface DataCenterBuildOut {
  globalPowerCapacityGW: number;
  underConstructionGW: number;
  plannedGW: number;
  topMarkets: DataCenterMarket[];
  powerSourceMix: PowerSourceMix;
}

interface RegionalInvestment {
  region: string;
  investmentBillions: number;
  majorProjects: number;
  keyInvestors: string[];
}

interface SupplyChainBottleneck {
  component: string;
  leadTimeMonths: number;
  priceChangePct: number;
  primarySupplier: string;
  constraintLevel: 'low' | 'moderate' | 'severe' | 'critical';
}

interface AITechCapexData {
  aggregateOverview: AggregateOverview;
  hyperscalerCapex: HyperscalerCapex[];
  aiChipMarket: AIChipMarket;
  dataCenterBuildOut: DataCenterBuildOut;
  aiInfrastructureByRegion: RegionalInvestment[];
  supplyChainBottlenecks: SupplyChainBottleneck[];
  timestamp: string;
}

// -- Seed Data --

const HYPERSCALER_SEEDS: {
  company: string;
  ticker: string;
  baseCapex: number;
  baseAICapex: number;
  baseCapexRevPct: number;
  baseYoYPct: number;
  baseDCMW: number;
  baseRegions: number;
  guidanceLow: number;
  guidanceHigh: number;
}[] = [
  { company: 'Microsoft', ticker: 'MSFT', baseCapex: 80, baseAICapex: 52, baseCapexRevPct: 29.5, baseYoYPct: 42, baseDCMW: 5800, baseRegions: 63, guidanceLow: 75, guidanceHigh: 85 },
  { company: 'Alphabet', ticker: 'GOOG', baseCapex: 75, baseAICapex: 48, baseCapexRevPct: 21.8, baseYoYPct: 55, baseDCMW: 5200, baseRegions: 40, guidanceLow: 68, guidanceHigh: 80 },
  { company: 'Amazon', ticker: 'AMZN', baseCapex: 100, baseAICapex: 58, baseCapexRevPct: 15.2, baseYoYPct: 38, baseDCMW: 7500, baseRegions: 34, guidanceLow: 90, guidanceHigh: 110 },
  { company: 'Meta', ticker: 'META', baseCapex: 60, baseAICapex: 42, baseCapexRevPct: 35.5, baseYoYPct: 48, baseDCMW: 3200, baseRegions: 22, guidanceLow: 55, guidanceHigh: 65 },
  { company: 'Apple', ticker: 'AAPL', baseCapex: 12, baseAICapex: 5.5, baseCapexRevPct: 3.1, baseYoYPct: 18, baseDCMW: 900, baseRegions: 8, guidanceLow: 10, guidanceHigh: 14 },
  { company: 'Oracle', ticker: 'ORCL', baseCapex: 16, baseAICapex: 10, baseCapexRevPct: 28.8, baseYoYPct: 65, baseDCMW: 1200, baseRegions: 48, guidanceLow: 14, guidanceHigh: 18 },
];

const DC_MARKET_SEEDS: {
  location: string;
  basePowerMW: number;
  baseAvailPct: number;
  pipeline: string;
  baseCostPerMW: number;
}[] = [
  { location: 'Northern Virginia', basePowerMW: 4500, baseAvailPct: 2.8, pipeline: '3.2 GW under development', baseCostPerMW: 12.5 },
  { location: 'Dallas', basePowerMW: 2800, baseAvailPct: 5.2, pipeline: '1.8 GW under development', baseCostPerMW: 9.8 },
  { location: 'Phoenix', basePowerMW: 2200, baseAvailPct: 4.5, pipeline: '2.1 GW under development', baseCostPerMW: 10.2 },
  { location: 'Dublin', basePowerMW: 1100, baseAvailPct: 1.5, pipeline: '0.6 GW under development', baseCostPerMW: 14.8 },
  { location: 'Singapore', basePowerMW: 850, baseAvailPct: 1.2, pipeline: '0.4 GW under development', baseCostPerMW: 16.5 },
  { location: 'Tokyo', basePowerMW: 1400, baseAvailPct: 2.1, pipeline: '0.8 GW under development', baseCostPerMW: 18.2 },
  { location: 'Sao Paulo', basePowerMW: 620, baseAvailPct: 6.8, pipeline: '0.5 GW under development', baseCostPerMW: 11.0 },
  { location: 'London', basePowerMW: 1050, baseAvailPct: 2.5, pipeline: '0.7 GW under development', baseCostPerMW: 15.5 },
];

const REGION_SEEDS: {
  region: string;
  baseInvestment: number;
  baseProjects: number;
  keyInvestors: string[];
}[] = [
  { region: 'US', baseInvestment: 180, baseProjects: 85, keyInvestors: ['Microsoft', 'Amazon', 'Google', 'Meta', 'Oracle'] },
  { region: 'Europe', baseInvestment: 45, baseProjects: 32, keyInvestors: ['Microsoft', 'Google', 'Amazon', 'Equinix'] },
  { region: 'China', baseInvestment: 55, baseProjects: 40, keyInvestors: ['Alibaba', 'Tencent', 'Baidu', 'ByteDance'] },
  { region: 'Japan', baseInvestment: 18, baseProjects: 14, keyInvestors: ['Google', 'Microsoft', 'Amazon', 'NTT'] },
  { region: 'Middle East', baseInvestment: 22, baseProjects: 12, keyInvestors: ['Oracle', 'Microsoft', 'G42', 'AWS'] },
  { region: 'India', baseInvestment: 12, baseProjects: 18, keyInvestors: ['Google', 'Amazon', 'Microsoft', 'Reliance'] },
  { region: 'Southeast Asia', baseInvestment: 14, baseProjects: 15, keyInvestors: ['Google', 'Microsoft', 'AWS', 'Singtel'] },
];

const BOTTLENECK_SEEDS: {
  component: string;
  baseLeadMonths: number;
  basePriceChangePct: number;
  primarySupplier: string;
  baseConstraint: 'low' | 'moderate' | 'severe' | 'critical';
}[] = [
  { component: 'HBM Memory', baseLeadMonths: 14, basePriceChangePct: 45, primarySupplier: 'SK Hynix', baseConstraint: 'critical' },
  { component: 'CoWoS Packaging', baseLeadMonths: 10, basePriceChangePct: 30, primarySupplier: 'TSMC', baseConstraint: 'severe' },
  { component: 'Power Transformers', baseLeadMonths: 18, basePriceChangePct: 22, primarySupplier: 'Hitachi Energy', baseConstraint: 'severe' },
  { component: 'Cooling Systems', baseLeadMonths: 6, basePriceChangePct: 15, primarySupplier: 'Vertiv', baseConstraint: 'moderate' },
  { component: 'Fiber Optic', baseLeadMonths: 4, basePriceChangePct: 8, primarySupplier: 'Corning', baseConstraint: 'low' },
];

// -- Data Generation --

function generateAggregateOverview(rng: () => number): AggregateOverview {
  const totalHyperscalerCapexBillions = round1(jitter(rng, 343, 0.04));
  const aiRelatedCapexBillions = round1(jitter(rng, 215, 0.05));
  const yearOverYearGrowthPct = round1(jitter(rng, 42, 0.1));
  const dataCenterUnderConstructionGW = round1(jitter(rng, 18.5, 0.08));
  const totalAIChipRevenueBillions = round1(jitter(rng, 165, 0.05));

  return {
    totalHyperscalerCapexBillions,
    aiRelatedCapexBillions,
    yearOverYearGrowthPct,
    dataCenterUnderConstructionGW,
    totalAIChipRevenueBillions,
  };
}

function generateHyperscalerCapex(rng: () => number): HyperscalerCapex[] {
  const now = new Date();
  return HYPERSCALER_SEEDS.map((seed) => {
    const totalCapexBillions = round1(jitter(rng, seed.baseCapex, 0.06));
    const aiCapexEstimateBillions = round1(jitter(rng, seed.baseAICapex, 0.08));
    const capexAsRevenuePct = round1(jitter(rng, seed.baseCapexRevPct, 0.05));
    const yearOverYearChangePct = round1(jitter(rng, seed.baseYoYPct, 0.12));
    const dataCentersMW = Math.round(jitter(rng, seed.baseDCMW, 0.06));
    const regionsCount = Math.max(1, Math.round(jitter(rng, seed.baseRegions, 0.05)));
    const low = round1(jitter(rng, seed.guidanceLow, 0.03));
    const high = round1(jitter(rng, seed.guidanceHigh, 0.03));

    // last updated: a random day within the past 30 days
    const daysAgo = Math.floor(rng() * 30);
    const updated = new Date(now);
    updated.setDate(updated.getDate() - daysAgo);
    const lastUpdated = updated.toISOString().slice(0, 10);

    return {
      company: seed.company,
      ticker: seed.ticker,
      totalCapexBillions,
      aiCapexEstimateBillions,
      capexAsRevenuePct,
      yearOverYearChangePct,
      dataCentersMW,
      regionsCount,
      guidanceRange: { low, high },
      lastUpdated,
    };
  });
}

function generateAIChipMarket(rng: () => number): AIChipMarket {
  const nvidiaRev = round1(jitter(rng, 130, 0.06));
  const nvidiaShare = round1(jitter(rng, 80, 0.03));
  const nvidiaConstraint: ('low' | 'moderate' | 'severe' | 'critical')[] = ['moderate', 'severe'];

  const amdRev = round1(jitter(rng, 12, 0.08));
  const amdShare = round1(jitter(rng, 12, 0.06));
  const amdStatusOptions = ['ramping capacity', 'moderate supply', 'stable supply'];

  const intelRev = round1(jitter(rng, 3, 0.1));
  const intelShare = round1(jitter(rng, 3, 0.08));

  const tpuStatuses = ['Gen 6 (Trillium) in production', 'Gen 6 ramping deployments'];
  const trainiumStatuses = ['Trainium2 in production', 'Trainium2 scaling across AWS regions'];
  const mtiaStatuses = ['MTIA v2 deployed internally', 'MTIA v2 expanding workloads'];

  const tpuDeployments = ['200K+ TPU v5p deployed', '250K+ TPU v5p deployed'];
  const trainiumDeployments = ['Expanding to all AWS regions', 'Available in 8 AWS regions'];
  const mtiaDeployments = ['Internal ranking/recommendation', 'Internal inference workloads'];

  const totalTAMBillions = round1(jitter(rng, 180, 0.06));
  const growthRatePct = round1(jitter(rng, 48, 0.1));

  return {
    nvidia: {
      revenueDataCenterBillions: nvidiaRev,
      marketSharePct: nvidiaShare,
      latestGPU: 'H200/B200',
      supplyConstraint: pick(rng, nvidiaConstraint),
    },
    amd: {
      revenueBillions: amdRev,
      marketSharePct: amdShare,
      latestGPU: 'MI300X/MI350',
      supplyStatus: pick(rng, amdStatusOptions),
    },
    intel: {
      revenueBillions: intelRev,
      marketSharePct: intelShare,
      latestGPU: 'Gaudi 3',
    },
    customChips: {
      googleTPU: {
        status: pick(rng, tpuStatuses),
        estimatedDeployment: pick(rng, tpuDeployments),
      },
      amazonTrainium: {
        status: pick(rng, trainiumStatuses),
        estimatedDeployment: pick(rng, trainiumDeployments),
      },
      metaMTIA: {
        status: pick(rng, mtiaStatuses),
        estimatedDeployment: pick(rng, mtiaDeployments),
      },
    },
    totalTAMBillions,
    growthRatePct,
  };
}

function generateDataCenterBuildOut(rng: () => number): DataCenterBuildOut {
  const globalPowerCapacityGW = round1(jitter(rng, 35, 0.06));
  const underConstructionGW = round1(jitter(rng, 18.5, 0.08));
  const plannedGW = round1(jitter(rng, 28, 0.07));

  const topMarkets: DataCenterMarket[] = DC_MARKET_SEEDS.map((seed) => {
    const powerMW = Math.round(jitter(rng, seed.basePowerMW, 0.06));
    const availabilityPct = round1(Math.max(0.5, jitter(rng, seed.baseAvailPct, 0.15)));
    const avgCostPerMW = round1(jitter(rng, seed.baseCostPerMW, 0.08));

    return {
      location: seed.location,
      powerMW,
      availabilityPct,
      constructionPipeline: seed.pipeline,
      avgCostPerMW,
    };
  });

  const renewablePct = round1(jitter(rng, 32, 0.08));
  const naturalGasPct = round1(jitter(rng, 38, 0.06));
  const nuclearPct = round1(jitter(rng, 12, 0.1));
  const gridPct = round1(100 - renewablePct - naturalGasPct - nuclearPct);

  return {
    globalPowerCapacityGW,
    underConstructionGW,
    plannedGW,
    topMarkets,
    powerSourceMix: { renewablePct, naturalGasPct, nuclearPct, gridPct },
  };
}

function generateRegionalInvestments(rng: () => number): RegionalInvestment[] {
  return REGION_SEEDS.map((seed) => {
    const investmentBillions = round1(jitter(rng, seed.baseInvestment, 0.08));
    const majorProjects = Math.max(1, Math.round(jitter(rng, seed.baseProjects, 0.1)));

    return {
      region: seed.region,
      investmentBillions,
      majorProjects,
      keyInvestors: seed.keyInvestors,
    };
  });
}

function generateSupplyChainBottlenecks(rng: () => number): SupplyChainBottleneck[] {
  return BOTTLENECK_SEEDS.map((seed) => {
    const leadTimeMonths = Math.max(1, Math.round(jitter(rng, seed.baseLeadMonths, 0.12)));
    const priceChangePct = round1(jitter(rng, seed.basePriceChangePct, 0.15));

    // Constraint can shift one level from baseline based on RNG
    const levels: ('low' | 'moderate' | 'severe' | 'critical')[] = ['low', 'moderate', 'severe', 'critical'];
    const baseIdx = levels.indexOf(seed.baseConstraint);
    const shift = rng() < 0.3 ? -1 : rng() > 0.85 ? 1 : 0;
    const idx = Math.max(0, Math.min(levels.length - 1, baseIdx + shift));
    const constraintLevel = levels[idx];

    return {
      component: seed.component,
      leadTimeMonths,
      priceChangePct,
      primarySupplier: seed.primarySupplier,
      constraintLevel,
    };
  });
}

function generateAll(): AITechCapexData {
  const rng = seededRandom('ai-tech-capex');

  return {
    aggregateOverview: generateAggregateOverview(rng),
    hyperscalerCapex: generateHyperscalerCapex(rng),
    aiChipMarket: generateAIChipMarket(rng),
    dataCenterBuildOut: generateDataCenterBuildOut(rng),
    aiInfrastructureByRegion: generateRegionalInvestments(rng),
    supplyChainBottlenecks: generateSupplyChainBottlenecks(rng),
    timestamp: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: AITechCapexData | null = null;
let cacheTime = 0;


// -- Route --

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
    console.error('[AITechCapex] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate AI tech capex data' });
  }
});

export default router;
