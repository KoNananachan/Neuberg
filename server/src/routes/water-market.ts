import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
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

interface GlobalOverview {
  globalWaterMarketBillions: number;
  waterStressedPopulationBillions: number;
  desalinationCapacityMillionM3PerDay: number;
  waterInfraInvestmentBillions: number;
  waterLossRatePct: number;
}

interface WaterRightsPricing {
  market: string;
  pricePerAcreFoot: number;
  dailyChangePct: number;
  yearToDateChangePct: number;
  volumeTraded: number;
  scarcityLevel: 'low' | 'moderate' | 'high' | 'extreme';
}

interface WaterScarcityIndex {
  region: string;
  waterStressScore: number;
  trend: 'improving' | 'stable' | 'worsening';
  populationAffectedMillions: number;
  projectedStress2030: number;
}

interface DesalinationMarket {
  totalCapacityMillionM3Day: number;
  underConstructionCapacity: number;
  topMarkets: { country: string; capacityMillionM3Day: number; marketSharePct: number }[];
  avgCostPerM3: number;
  energyConsumptionKWhPerM3: number;
  technologyMix: { reverseOsmosisPct: number; thermalPct: number; hybridPct: number };
}

interface WaterUtilityPerformance {
  company: string;
  ticker: string;
  marketCapBillions: number;
  revenueGrowthPct: number;
  ebitdaMarginPct: number;
  dividendYieldPct: number;
  stockYTDPct: number;
  nonRevenueWaterPct: number;
  customersMillions: number;
}

interface InfrastructureInvestment {
  totalGlobalInvestmentBillions: number;
  investmentGapBillions: number;
  byRegion: { region: string; amountBillions: number; keyProjects: string[] }[];
  keyTrends: { trend: string; growthRatePct: number }[];
}

interface WaterMarketResponse {
  globalOverview: GlobalOverview;
  waterRightsPricing: WaterRightsPricing[];
  waterScarcityIndex: WaterScarcityIndex[];
  desalinationMarket: DesalinationMarket;
  waterUtilityPerformance: WaterUtilityPerformance[];
  infrastructureInvestment: InfrastructureInvestment;
  generatedAt: string;
}

// -- Seed Data --

const WATER_RIGHTS_SEEDS: {
  market: string;
  basePrice: number;
  baseVolume: number;
  scarcityLevel: 'low' | 'moderate' | 'high' | 'extreme';
}[] = [
  { market: 'Nasdaq Veles California Water Index (NQH2O)', basePrice: 986, baseVolume: 4200, scarcityLevel: 'extreme' },
  { market: 'Murray-Darling Basin Australia', basePrice: 142, baseVolume: 8500, scarcityLevel: 'high' },
  { market: 'Colorado River Basin', basePrice: 1120, baseVolume: 3100, scarcityLevel: 'extreme' },
  { market: 'Ogallala Aquifer', basePrice: 68, baseVolume: 5600, scarcityLevel: 'high' },
  { market: 'Texas Edwards Aquifer', basePrice: 245, baseVolume: 2800, scarcityLevel: 'moderate' },
  { market: 'Chile Water Rights', basePrice: 380, baseVolume: 1900, scarcityLevel: 'high' },
  { market: 'Spain Tagus-Segura', basePrice: 210, baseVolume: 2200, scarcityLevel: 'high' },
  { market: 'South Africa Western Cape', basePrice: 155, baseVolume: 1400, scarcityLevel: 'extreme' },
];

const SCARCITY_SEEDS: {
  region: string;
  baseStress: number;
  basePop: number;
}[] = [
  { region: 'Middle East & North Africa', baseStress: 4.8, basePop: 392 },
  { region: 'South Asia', baseStress: 3.9, basePop: 1740 },
  { region: 'Central Asia', baseStress: 3.5, basePop: 78 },
  { region: 'Mediterranean Europe', baseStress: 3.0, basePop: 145 },
  { region: 'Sub-Saharan Africa', baseStress: 2.8, basePop: 520 },
  { region: 'Western US', baseStress: 3.2, basePop: 85 },
  { region: 'Northern China', baseStress: 3.6, basePop: 560 },
  { region: 'Southeast Australia', baseStress: 2.9, basePop: 18 },
  { region: 'Central America', baseStress: 2.5, basePop: 42 },
  { region: 'Southern Africa', baseStress: 3.1, basePop: 68 },
  { region: 'East Africa', baseStress: 2.7, basePop: 210 },
  { region: 'Pakistan-India Border', baseStress: 4.2, basePop: 310 },
];

const DESAL_MARKET_SEEDS: {
  country: string;
  baseCapacity: number;
  baseShare: number;
}[] = [
  { country: 'Saudi Arabia', baseCapacity: 22.1, baseShare: 22.3 },
  { country: 'UAE', baseCapacity: 14.7, baseShare: 14.8 },
  { country: 'Israel', baseCapacity: 8.2, baseShare: 8.3 },
  { country: 'Spain', baseCapacity: 5.9, baseShare: 5.9 },
  { country: 'United States', baseCapacity: 5.4, baseShare: 5.4 },
  { country: 'China', baseCapacity: 4.8, baseShare: 4.8 },
];

const UTILITY_SEEDS: {
  company: string;
  ticker: string;
  baseMktCap: number;
  baseRevGrowth: number;
  baseEbitda: number;
  baseDivYield: number;
  baseNRW: number;
  baseCustomers: number;
}[] = [
  { company: 'Veolia', ticker: 'VEOEY', baseMktCap: 23.4, baseRevGrowth: 6.8, baseEbitda: 14.2, baseDivYield: 3.1, baseNRW: 18.5, baseCustomers: 111 },
  { company: 'Xylem', ticker: 'XYL', baseMktCap: 31.2, baseRevGrowth: 8.5, baseEbitda: 20.1, baseDivYield: 1.2, baseNRW: 12.3, baseCustomers: 0.15 },
  { company: 'American Water Works', ticker: 'AWK', baseMktCap: 27.8, baseRevGrowth: 7.2, baseEbitda: 52.3, baseDivYield: 2.1, baseNRW: 14.6, baseCustomers: 14 },
  { company: 'Essential Utilities', ticker: 'WTRG', baseMktCap: 11.6, baseRevGrowth: 5.4, baseEbitda: 46.1, baseDivYield: 2.8, baseNRW: 16.2, baseCustomers: 5.3 },
  { company: 'Pentair', ticker: 'PNR', baseMktCap: 15.8, baseRevGrowth: 4.9, baseEbitda: 22.8, baseDivYield: 1.3, baseNRW: 0, baseCustomers: 0 },
  { company: 'A.O. Smith', ticker: 'AOS', baseMktCap: 12.1, baseRevGrowth: 5.1, baseEbitda: 21.5, baseDivYield: 1.6, baseNRW: 0, baseCustomers: 0 },
  { company: 'Danaher Water Platform', ticker: 'DHR', baseMktCap: 186.5, baseRevGrowth: 4.2, baseEbitda: 29.4, baseDivYield: 0.5, baseNRW: 0, baseCustomers: 0 },
  { company: 'Mueller Water Products', ticker: 'MWA', baseMktCap: 3.2, baseRevGrowth: 9.1, baseEbitda: 18.7, baseDivYield: 1.8, baseNRW: 0, baseCustomers: 0 },
];

// -- Data Generation --

function generate(): WaterMarketResponse {
  const rng = seededRandom('water-market');

  // -- Global Overview --
  const globalOverview: GlobalOverview = {
    globalWaterMarketBillions: roundTo(jitter(rng, 900, 0.06), 1),
    waterStressedPopulationBillions: roundTo(jitter(rng, 4.0, 0.05), 2),
    desalinationCapacityMillionM3PerDay: roundTo(jitter(rng, 100, 0.08), 1),
    waterInfraInvestmentBillions: roundTo(jitter(rng, 620, 0.07), 1),
    waterLossRatePct: roundTo(jitter(rng, 30, 0.1), 1),
  };

  // -- Water Rights Pricing --
  const waterRightsPricing: WaterRightsPricing[] = WATER_RIGHTS_SEEDS.map(m => {
    const price = roundTo(jitter(rng, m.basePrice, 0.12), 2);
    const dailyChangePct = roundTo((rng() - 0.48) * 5, 2);
    const yearToDateChangePct = roundTo((rng() - 0.4) * 35, 2);
    const volumeTraded = Math.round(jitter(rng, m.baseVolume, 0.2));

    return {
      market: m.market,
      pricePerAcreFoot: price,
      dailyChangePct,
      yearToDateChangePct,
      volumeTraded,
      scarcityLevel: m.scarcityLevel,
    };
  });

  // -- Water Scarcity Index --
  const trendOptions: ('improving' | 'stable' | 'worsening')[] = ['improving', 'stable', 'worsening'];
  const waterScarcityIndex: WaterScarcityIndex[] = SCARCITY_SEEDS.map(s => {
    const stressScore = roundTo(jitter(rng, s.baseStress, 0.05), 1);
    const trendRoll = rng();
    const trend = trendRoll < 0.15 ? trendOptions[0] : trendRoll < 0.45 ? trendOptions[1] : trendOptions[2];
    const populationAffectedMillions = roundTo(jitter(rng, s.basePop, 0.08), 1);
    const projectedStress2030 = roundTo(Math.min(5.0, stressScore + rng() * 0.8 + 0.1), 1);

    return {
      region: s.region,
      waterStressScore: stressScore,
      trend,
      populationAffectedMillions,
      projectedStress2030,
    };
  });

  // -- Desalination Market --
  const totalCapacity = roundTo(jitter(rng, 99.2, 0.06), 1);
  const underConstruction = roundTo(jitter(rng, 12.8, 0.12), 1);
  const reverseOsmosisPct = roundTo(jitter(rng, 70, 0.04), 1);
  const thermalPct = roundTo(jitter(rng, 22, 0.08), 1);
  const hybridPct = roundTo(100 - reverseOsmosisPct - thermalPct, 1);

  const desalinationMarket: DesalinationMarket = {
    totalCapacityMillionM3Day: totalCapacity,
    underConstructionCapacity: underConstruction,
    topMarkets: DESAL_MARKET_SEEDS.map(d => ({
      country: d.country,
      capacityMillionM3Day: roundTo(jitter(rng, d.baseCapacity, 0.06), 1),
      marketSharePct: roundTo(jitter(rng, d.baseShare, 0.05), 1),
    })),
    avgCostPerM3: roundTo(0.5 + rng() * 1.0, 2),
    energyConsumptionKWhPerM3: roundTo(3.0 + rng() * 1.0, 2),
    technologyMix: {
      reverseOsmosisPct,
      thermalPct,
      hybridPct,
    },
  };

  // -- Water Utility Performance --
  const waterUtilityPerformance: WaterUtilityPerformance[] = UTILITY_SEEDS.map(u => ({
    company: u.company,
    ticker: u.ticker,
    marketCapBillions: roundTo(jitter(rng, u.baseMktCap, 0.1), 1),
    revenueGrowthPct: roundTo(jitter(rng, u.baseRevGrowth, 0.2), 1),
    ebitdaMarginPct: roundTo(jitter(rng, u.baseEbitda, 0.08), 1),
    dividendYieldPct: roundTo(jitter(rng, Math.max(u.baseDivYield, 0.1), 0.15), 2),
    stockYTDPct: roundTo((rng() - 0.35) * 40, 1),
    nonRevenueWaterPct: u.baseNRW > 0 ? roundTo(jitter(rng, u.baseNRW, 0.1), 1) : 0,
    customersMillions: u.baseCustomers > 0 ? roundTo(jitter(rng, u.baseCustomers, 0.05), 2) : 0,
  }));

  // -- Infrastructure Investment --
  const infrastructureInvestment: InfrastructureInvestment = {
    totalGlobalInvestmentBillions: roundTo(jitter(rng, 620, 0.07), 1),
    investmentGapBillions: roundTo(jitter(rng, 1700, 0.06), 0),
    byRegion: [
      {
        region: 'Americas',
        amountBillions: roundTo(jitter(rng, 195, 0.08), 1),
        keyProjects: [
          'US EPA Lead Pipe Replacement ($15B)',
          'California WaterFix Delta Conveyance',
          'Brazil Sao Paulo Water Recycling PPP',
          'Mexico City Aquifer Recharge Program',
        ],
      },
      {
        region: 'EMEA',
        amountBillions: roundTo(jitter(rng, 210, 0.08), 1),
        keyProjects: [
          'NEOM Desalination Mega-Plant (Saudi Arabia)',
          'Thames Tideway Tunnel (London)',
          'EU Water Reuse Regulation Implementation',
          'Egypt New Administrative Capital Water Network',
        ],
      },
      {
        region: 'APAC',
        amountBillions: roundTo(jitter(rng, 215, 0.08), 1),
        keyProjects: [
          'China South-to-North Water Transfer Phase II',
          'India Jal Jeevan Mission ($50B)',
          'Singapore NEWater Expansion',
          'Australia Inland Rail Water Infrastructure',
        ],
      },
    ],
    keyTrends: [
      { trend: 'Smart Water Grid Deployment', growthRatePct: roundTo(jitter(rng, 18.5, 0.15), 1) },
      { trend: 'AI-Powered Leak Detection', growthRatePct: roundTo(jitter(rng, 24.2, 0.15), 1) },
      { trend: 'Water Recycling / Reuse', growthRatePct: roundTo(jitter(rng, 14.8, 0.15), 1) },
      { trend: 'Decentralized Treatment Systems', growthRatePct: roundTo(jitter(rng, 12.3, 0.15), 1) },
      { trend: 'Digital Twin Water Networks', growthRatePct: roundTo(jitter(rng, 21.6, 0.15), 1) },
    ],
  };

  return {
    globalOverview,
    waterRightsPricing,
    waterScarcityIndex,
    desalinationMarket,
    waterUtilityPerformance,
    infrastructureInvestment,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: WaterMarketResponse | null = null;
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
    console.error('[WaterMarket] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate water market data' });
  }
});

export default router;
