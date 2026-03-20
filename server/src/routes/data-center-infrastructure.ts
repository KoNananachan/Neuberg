import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- Helpers --

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// -- Interfaces --

interface MarketOverview {
  globalDataCenterCapacityMW: number;
  totalColocationRevenueBn: number;
  averagePowerCostPerMWh: number;
  hyperscaleUnderConstructionMW: number;
  globalVacancyRatePct: number;
  yoyDemandGrowthPct: number;
  totalDataCenterCount: number;
  globalIPTrafficExabytesPerMonth: number;
}

interface MajorMarket {
  market: string;
  region: string;
  totalCapacityMW: number;
  absorptionMW: number;
  vacancyRatePct: number;
  averageRentPerKwMonth: number;
  powerCostPerMWh: number;
  underConstructionMW: number;
  preleasedPct: number;
  inventoryGrowthPct: number;
  majorTenants: string[];
}

interface HyperscalerCapex {
  company: string;
  ticker: string;
  quarterlyCapexBn: number;
  yoyGrowthPct: number;
  dataCenterCount: number;
  estimatedPowerUsageGW: number;
  pue: number;
  renewableEnergyPct: number;
  regionsAvailable: number;
  azCount: number;
}

interface DataCenterREIT {
  company: string;
  ticker: string;
  marketCapBn: number;
  dividendYieldPct: number;
  ffoPerShare: number;
  occupancyPct: number;
  developmentPipelineMW: number;
  leaseSpreadPct: number;
  debtToEBITDA: number;
  totalPortfolioMW: number;
  marketsServed: number;
}

interface RegionalPUE {
  region: string;
  averagePUE: number;
  bestInClassPUE: number;
}

interface PowerSustainability {
  averagePUEByRegion: RegionalPUE[];
  globalAverageWUE: number;
  renewableEnergyAdoptionPct: number;
  carbonIntensityGramsPerKWh: number;
  carbonIntensityYoYChangePct: number;
  nuclearPPAsSignedMW: number;
  gasPPAsSignedMW: number;
  totalCorporateRenewablePPAsMW: number;
  greenCertificatesPurchasedTWh: number;
}

interface GPUClusterDeployment {
  operator: string;
  location: string;
  estimatedGPUCount: number;
  chipType: string;
  powerCapacityMW: number;
}

interface AIGPUDemandMetrics {
  topGPUClusterDeployments: GPUClusterDeployment[];
  aiTrainingComputeGrowthPct: number;
  inferenceSharePct: number;
  trainingSharePct: number;
  gpuSupplyConstraintIndex: number;
  estimatedGlobalGPUInstallBase: number;
  aiDataCenterPowerDemandGW: number;
  projectedAIPowerDemand2027GW: number;
}

interface DataCenterInfrastructureResponse {
  marketOverview: MarketOverview;
  majorMarkets: MajorMarket[];
  hyperscalerCapex: HyperscalerCapex[];
  dataCenterREITs: DataCenterREIT[];
  powerAndSustainability: PowerSustainability;
  aiGPUDemandMetrics: AIGPUDemandMetrics;
  generatedAt: string;
}

// -- Seed Data --

const MAJOR_MARKET_SEEDS = [
  { market: 'Northern Virginia', region: 'North America', capacityMW: 4200, absorptionMW: 680, vacancyPct: 2.1, rentPerKwMonth: 120, powerCost: 58, underConstructionMW: 1850, preleasedPct: 88, inventoryGrowthPct: 28, tenants: ['AWS', 'Microsoft', 'Google', 'Meta', 'Oracle'] },
  { market: 'Dallas-Fort Worth', region: 'North America', capacityMW: 1650, absorptionMW: 320, vacancyPct: 4.5, rentPerKwMonth: 95, powerCost: 48, underConstructionMW: 720, preleasedPct: 82, inventoryGrowthPct: 22, tenants: ['Meta', 'Google', 'Flexential', 'CyrusOne'] },
  { market: 'Phoenix', region: 'North America', capacityMW: 1100, absorptionMW: 280, vacancyPct: 3.8, rentPerKwMonth: 100, powerCost: 52, underConstructionMW: 650, preleasedPct: 91, inventoryGrowthPct: 35, tenants: ['Microsoft', 'Apple', 'Meta', 'QTS'] },
  { market: 'Chicago', region: 'North America', capacityMW: 920, absorptionMW: 140, vacancyPct: 6.2, rentPerKwMonth: 110, powerCost: 62, underConstructionMW: 280, preleasedPct: 74, inventoryGrowthPct: 12, tenants: ['CME Group', 'Equinix', 'Digital Realty'] },
  { market: 'Silicon Valley', region: 'North America', capacityMW: 850, absorptionMW: 110, vacancyPct: 3.2, rentPerKwMonth: 155, powerCost: 95, underConstructionMW: 180, preleasedPct: 95, inventoryGrowthPct: 8, tenants: ['Apple', 'Google', 'Equinix', 'CoreSite'] },
  { market: 'Portland / Hillsboro', region: 'North America', capacityMW: 580, absorptionMW: 95, vacancyPct: 5.1, rentPerKwMonth: 88, powerCost: 42, underConstructionMW: 310, preleasedPct: 79, inventoryGrowthPct: 18, tenants: ['Google', 'Amazon', 'STACK'] },
  { market: 'Singapore', region: 'Asia Pacific', capacityMW: 720, absorptionMW: 85, vacancyPct: 1.8, rentPerKwMonth: 175, powerCost: 120, underConstructionMW: 140, preleasedPct: 97, inventoryGrowthPct: 6, tenants: ['AWS', 'Google', 'Equinix', 'ST Telemedia'] },
  { market: 'London', region: 'EMEA', capacityMW: 950, absorptionMW: 130, vacancyPct: 4.0, rentPerKwMonth: 145, powerCost: 110, underConstructionMW: 350, preleasedPct: 85, inventoryGrowthPct: 15, tenants: ['AWS', 'Microsoft', 'Equinix', 'Digital Realty'] },
  { market: 'Frankfurt', region: 'EMEA', capacityMW: 880, absorptionMW: 150, vacancyPct: 5.5, rentPerKwMonth: 135, powerCost: 105, underConstructionMW: 420, preleasedPct: 78, inventoryGrowthPct: 20, tenants: ['AWS', 'Google', 'DE-CIX', 'Interxion'] },
  { market: 'Tokyo', region: 'Asia Pacific', capacityMW: 780, absorptionMW: 100, vacancyPct: 3.5, rentPerKwMonth: 165, powerCost: 115, underConstructionMW: 250, preleasedPct: 90, inventoryGrowthPct: 14, tenants: ['AWS', 'Microsoft', 'Equinix', 'NTT'] },
  { market: 'Amsterdam', region: 'EMEA', capacityMW: 620, absorptionMW: 80, vacancyPct: 7.2, rentPerKwMonth: 125, powerCost: 98, underConstructionMW: 180, preleasedPct: 72, inventoryGrowthPct: 10, tenants: ['Microsoft', 'Google', 'Equinix', 'Interxion'] },
  { market: 'Mumbai', region: 'Asia Pacific', capacityMW: 420, absorptionMW: 110, vacancyPct: 2.5, rentPerKwMonth: 78, powerCost: 72, underConstructionMW: 380, preleasedPct: 86, inventoryGrowthPct: 42, tenants: ['AWS', 'Microsoft', 'Nxtra', 'Yotta'] },
];

const HYPERSCALER_SEEDS = [
  { company: 'AWS', ticker: 'AMZN', capexBn: 21.4, yoyGrowthPct: 34, dcCount: 110, powerGW: 8.2, pue: 1.12, renewablePct: 100, regions: 34, azCount: 108 },
  { company: 'Microsoft Azure', ticker: 'MSFT', capexBn: 19.6, yoyGrowthPct: 52, dcCount: 95, powerGW: 7.5, pue: 1.10, renewablePct: 100, regions: 63, azCount: 170 },
  { company: 'Google Cloud', ticker: 'GOOGL', capexBn: 13.2, yoyGrowthPct: 45, dcCount: 40, powerGW: 4.8, pue: 1.06, renewablePct: 100, regions: 40, azCount: 121 },
  { company: 'Meta', ticker: 'META', capexBn: 10.5, yoyGrowthPct: 38, dcCount: 24, powerGW: 3.6, pue: 1.08, renewablePct: 100, regions: 0, azCount: 0 },
  { company: 'Oracle Cloud', ticker: 'ORCL', capexBn: 5.8, yoyGrowthPct: 68, dcCount: 48, powerGW: 1.8, pue: 1.15, renewablePct: 76, regions: 48, azCount: 48 },
  { company: 'Apple', ticker: 'AAPL', capexBn: 3.2, yoyGrowthPct: 22, dcCount: 12, powerGW: 1.4, pue: 1.09, renewablePct: 100, regions: 0, azCount: 0 },
];

const REIT_SEEDS = [
  { company: 'Equinix', ticker: 'EQIX', marketCapBn: 82.5, dividendYieldPct: 2.0, ffoPerShare: 34.20, occupancyPct: 94.2, pipelineMW: 620, leaseSpreadPct: 4.8, debtToEBITDA: 3.8, portfolioMW: 3200, markets: 72 },
  { company: 'Digital Realty', ticker: 'DLR', marketCapBn: 55.8, dividendYieldPct: 2.8, ffoPerShare: 6.85, occupancyPct: 87.5, pipelineMW: 540, leaseSpreadPct: 8.2, debtToEBITDA: 5.2, portfolioMW: 2900, markets: 50 },
  { company: 'CyrusOne / KKR', ticker: 'Private', marketCapBn: 15.2, dividendYieldPct: 0, ffoPerShare: 0, occupancyPct: 91.8, pipelineMW: 380, leaseSpreadPct: 5.5, debtToEBITDA: 4.5, portfolioMW: 1100, markets: 18 },
  { company: 'QTS / Blackstone', ticker: 'Private', marketCapBn: 12.8, dividendYieldPct: 0, ffoPerShare: 0, occupancyPct: 93.1, pipelineMW: 450, leaseSpreadPct: 6.1, debtToEBITDA: 4.8, portfolioMW: 950, markets: 14 },
  { company: 'CoreSite / ATC', ticker: 'AMT', marketCapBn: 8.5, dividendYieldPct: 3.2, ffoPerShare: 7.10, occupancyPct: 89.5, pipelineMW: 180, leaseSpreadPct: 5.2, debtToEBITDA: 5.8, portfolioMW: 480, markets: 8 },
  { company: 'STACK Infrastructure', ticker: 'Private', marketCapBn: 6.2, dividendYieldPct: 0, ffoPerShare: 0, occupancyPct: 90.3, pipelineMW: 320, leaseSpreadPct: 7.0, debtToEBITDA: 5.0, portfolioMW: 680, markets: 12 },
];

const REGIONAL_PUE_SEEDS = [
  { region: 'North America', avgPUE: 1.28, bestPUE: 1.06 },
  { region: 'Europe', avgPUE: 1.32, bestPUE: 1.08 },
  { region: 'Asia Pacific', avgPUE: 1.40, bestPUE: 1.10 },
  { region: 'Nordics', avgPUE: 1.15, bestPUE: 1.03 },
  { region: 'Middle East', avgPUE: 1.55, bestPUE: 1.18 },
];

const GPU_CLUSTER_SEEDS = [
  { operator: 'Meta', location: 'Altoona, PA', gpuCount: 600000, chipType: 'NVIDIA H100 / H200', powerMW: 450 },
  { operator: 'Microsoft / OpenAI', location: 'San Antonio, TX', gpuCount: 500000, chipType: 'NVIDIA H100 / GB200', powerMW: 380 },
  { operator: 'Google DeepMind', location: 'Oklahoma, US', gpuCount: 350000, chipType: 'Google TPU v5p / v6e', powerMW: 300 },
  { operator: 'xAI', location: 'Memphis, TN', gpuCount: 200000, chipType: 'NVIDIA H100 / H200', powerMW: 150 },
  { operator: 'AWS / Anthropic', location: 'US East (Virginia)', gpuCount: 180000, chipType: 'AWS Trainium2 / NVIDIA H100', powerMW: 140 },
];

// -- Data Generation --

function generate(): DataCenterInfrastructureResponse {
  const rng = seededRandom('dc-infra');

  // -- Market Overview --
  const marketOverview: MarketOverview = {
    globalDataCenterCapacityMW: Math.round(jitter(rng, 38500, 0.04)),
    totalColocationRevenueBn: roundTo(jitter(rng, 62.5, 0.05), 1),
    averagePowerCostPerMWh: roundTo(jitter(rng, 78, 0.06), 2),
    hyperscaleUnderConstructionMW: Math.round(jitter(rng, 8400, 0.08)),
    globalVacancyRatePct: roundTo(jitter(rng, 3.8, 0.1), 1),
    yoyDemandGrowthPct: roundTo(jitter(rng, 22.5, 0.08), 1),
    totalDataCenterCount: Math.round(jitter(rng, 11200, 0.03)),
    globalIPTrafficExabytesPerMonth: roundTo(jitter(rng, 780, 0.05), 0),
  };

  // -- Major Markets --
  const majorMarkets: MajorMarket[] = MAJOR_MARKET_SEEDS.map(m => ({
    market: m.market,
    region: m.region,
    totalCapacityMW: Math.round(jitter(rng, m.capacityMW, 0.05)),
    absorptionMW: Math.round(jitter(rng, m.absorptionMW, 0.1)),
    vacancyRatePct: roundTo(jitter(rng, m.vacancyPct, 0.12), 1),
    averageRentPerKwMonth: roundTo(jitter(rng, m.rentPerKwMonth, 0.06), 2),
    powerCostPerMWh: roundTo(jitter(rng, m.powerCost, 0.08), 2),
    underConstructionMW: Math.round(jitter(rng, m.underConstructionMW, 0.1)),
    preleasedPct: roundTo(Math.min(99, jitter(rng, m.preleasedPct, 0.05)), 1),
    inventoryGrowthPct: roundTo(jitter(rng, m.inventoryGrowthPct, 0.1), 1),
    majorTenants: m.tenants,
  }));

  // -- Hyperscaler Capex --
  const hyperscalerCapex: HyperscalerCapex[] = HYPERSCALER_SEEDS.map(h => ({
    company: h.company,
    ticker: h.ticker,
    quarterlyCapexBn: roundTo(jitter(rng, h.capexBn, 0.08), 1),
    yoyGrowthPct: roundTo(jitter(rng, h.yoyGrowthPct, 0.1), 1),
    dataCenterCount: Math.round(jitter(rng, h.dcCount, 0.05)),
    estimatedPowerUsageGW: roundTo(jitter(rng, h.powerGW, 0.06), 2),
    pue: roundTo(jitter(rng, h.pue, 0.02), 2),
    renewableEnergyPct: Math.round(Math.min(100, jitter(rng, h.renewablePct, 0.03))),
    regionsAvailable: h.regions > 0 ? Math.round(jitter(rng, h.regions, 0.04)) : 0,
    azCount: h.azCount > 0 ? Math.round(jitter(rng, h.azCount, 0.04)) : 0,
  }));

  // -- Data Center REITs --
  const dataCenterREITs: DataCenterREIT[] = REIT_SEEDS.map(r => ({
    company: r.company,
    ticker: r.ticker,
    marketCapBn: roundTo(jitter(rng, r.marketCapBn, 0.06), 1),
    dividendYieldPct: r.dividendYieldPct > 0 ? roundTo(jitter(rng, r.dividendYieldPct, 0.08), 2) : 0,
    ffoPerShare: r.ffoPerShare > 0 ? roundTo(jitter(rng, r.ffoPerShare, 0.06), 2) : 0,
    occupancyPct: roundTo(jitter(rng, r.occupancyPct, 0.02), 1),
    developmentPipelineMW: Math.round(jitter(rng, r.pipelineMW, 0.1)),
    leaseSpreadPct: roundTo(jitter(rng, r.leaseSpreadPct, 0.1), 1),
    debtToEBITDA: roundTo(jitter(rng, r.debtToEBITDA, 0.06), 1),
    totalPortfolioMW: Math.round(jitter(rng, r.portfolioMW, 0.04)),
    marketsServed: Math.round(jitter(rng, r.markets, 0.05)),
  }));

  // -- Power & Sustainability --
  const averagePUEByRegion: RegionalPUE[] = REGIONAL_PUE_SEEDS.map(r => ({
    region: r.region,
    averagePUE: roundTo(jitter(rng, r.avgPUE, 0.03), 2),
    bestInClassPUE: roundTo(jitter(rng, r.bestPUE, 0.02), 2),
  }));

  const powerAndSustainability: PowerSustainability = {
    averagePUEByRegion,
    globalAverageWUE: roundTo(jitter(rng, 1.8, 0.08), 2),
    renewableEnergyAdoptionPct: roundTo(jitter(rng, 64, 0.06), 1),
    carbonIntensityGramsPerKWh: roundTo(jitter(rng, 340, 0.06), 0),
    carbonIntensityYoYChangePct: roundTo(-1 * jitter(rng, 4.5, 0.15), 1),
    nuclearPPAsSignedMW: Math.round(jitter(rng, 4200, 0.12)),
    gasPPAsSignedMW: Math.round(jitter(rng, 6800, 0.1)),
    totalCorporateRenewablePPAsMW: Math.round(jitter(rng, 18500, 0.08)),
    greenCertificatesPurchasedTWh: roundTo(jitter(rng, 125, 0.06), 1),
  };

  // -- AI / GPU Demand Metrics --
  const topGPUClusterDeployments: GPUClusterDeployment[] = GPU_CLUSTER_SEEDS.map(g => ({
    operator: g.operator,
    location: g.location,
    estimatedGPUCount: Math.round(jitter(rng, g.gpuCount, 0.08)),
    chipType: g.chipType,
    powerCapacityMW: Math.round(jitter(rng, g.powerMW, 0.06)),
  }));

  const inferenceShare = roundTo(jitter(rng, 62, 0.05), 1);
  const aiGPUDemandMetrics: AIGPUDemandMetrics = {
    topGPUClusterDeployments,
    aiTrainingComputeGrowthPct: roundTo(jitter(rng, 4.1, 0.1), 1),
    inferenceSharePct: inferenceShare,
    trainingSharePct: roundTo(100 - inferenceShare, 1),
    gpuSupplyConstraintIndex: roundTo(jitter(rng, 7.2, 0.1), 1),
    estimatedGlobalGPUInstallBase: Math.round(jitter(rng, 8500000, 0.06)),
    aiDataCenterPowerDemandGW: roundTo(jitter(rng, 18.5, 0.08), 1),
    projectedAIPowerDemand2027GW: roundTo(jitter(rng, 42, 0.1), 1),
  };

  return {
    marketOverview,
    majorMarkets,
    hyperscalerCapex,
    dataCenterREITs,
    powerAndSustainability,
    aiGPUDemandMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: DataCenterInfrastructureResponse | null = null;
let cacheTime = 0;


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
    console.error('[DataCenterInfrastructure] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate data center infrastructure data' });
  }
});

export default router;
