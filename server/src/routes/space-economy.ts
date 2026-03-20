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

interface IndustryOverview {
  globalSpaceEconomyBillions: number;
  commercialSharePct: number;
  governmentSharePct: number;
  launchesYTD: number;
  satellitesDeployedYTD: number;
  investmentBillions: number;
  yearOverYearGrowthPct: number;
}

interface LaunchProvider {
  provider: string;
  launchesYTD: number;
  successRate: number;
  avgPayloadKg: number;
  avgCostPerKgUSD: number;
  nextScheduledLaunch: string;
  vehicleType: string;
  reusable: boolean;
}

interface SatelliteConstellation {
  constellation: string;
  operator: string;
  satellitesDeployed: number;
  plannedTotal: number;
  orbitalAltitudeKm: number;
  purpose: string;
  revenueEstimateBillions: number;
  subscribersMillions: number | null;
}

interface SpaceCompany {
  company: string;
  ticker: string | null;
  marketCapBillions: number;
  revenueGrowthPct: number;
  ebitdaMarginPct: number;
  stockYTDPct: number;
  sector: 'launch' | 'satellites' | 'ground-systems' | 'analytics' | 'manufacturing';
}

interface GovernmentBudget {
  agency: string;
  budgetBillions: number;
  yearOverYearChangePct: number;
  keyPrograms: string[];
}

interface OrbitalEnvironment {
  totalObjectsTracked: number;
  activeSatellites: number;
  debrisCount: number;
  collisionRiskEvents: number;
  conjunctionWarnings: number;
  deorbitInitiatives: number;
  recentDebrisEvents: string[];
}

interface SpaceEconomyResponse {
  industryOverview: IndustryOverview;
  launchProviders: LaunchProvider[];
  satelliteConstellations: SatelliteConstellation[];
  spaceCompanies: SpaceCompany[];
  governmentBudgets: GovernmentBudget[];
  orbitalEnvironment: OrbitalEnvironment;
  generatedAt: string;
}

// -- Seed Data --

const LAUNCH_PROVIDER_SEEDS = [
  { provider: 'SpaceX', baseLaunches: 72, baseSuccessRate: 98.5, basePayloadKg: 22800, baseCostPerKg: 2720, vehicleType: 'Falcon 9', reusable: true },
  { provider: 'Rocket Lab', baseLaunches: 12, baseSuccessRate: 95.0, basePayloadKg: 300, baseCostPerKg: 25000, vehicleType: 'Electron', reusable: false },
  { provider: 'Arianespace', baseLaunches: 6, baseSuccessRate: 96.0, basePayloadKg: 11500, baseCostPerKg: 8700, vehicleType: 'Ariane 6', reusable: false },
  { provider: 'ULA', baseLaunches: 5, baseSuccessRate: 100.0, basePayloadKg: 27200, baseCostPerKg: 14700, vehicleType: 'Vulcan', reusable: false },
  { provider: 'ISRO', baseLaunches: 7, baseSuccessRate: 94.0, basePayloadKg: 3800, baseCostPerKg: 4500, vehicleType: 'PSLV', reusable: false },
  { provider: 'CNSA/CASC', baseLaunches: 35, baseSuccessRate: 96.5, basePayloadKg: 25000, baseCostPerKg: 4800, vehicleType: 'Long March', reusable: false },
  { provider: 'Relativity Space', baseLaunches: 2, baseSuccessRate: 85.0, basePayloadKg: 18500, baseCostPerKg: 6000, vehicleType: 'Terran R', reusable: true },
  { provider: 'Blue Origin', baseLaunches: 4, baseSuccessRate: 92.0, basePayloadKg: 45000, baseCostPerKg: 9500, vehicleType: 'New Glenn', reusable: true },
];

const CONSTELLATION_SEEDS = [
  { constellation: 'Starlink', operator: 'SpaceX', baseDeployed: 6200, plannedTotal: 12000, altitudeKm: 550, purpose: 'Broadband Internet', baseRevenue: 6.5, baseSubscribers: 4.0 },
  { constellation: 'OneWeb', operator: 'Eutelsat OneWeb', baseDeployed: 634, plannedTotal: 648, altitudeKm: 1200, purpose: 'Broadband Internet / Enterprise', baseRevenue: 1.2, baseSubscribers: 0.8 },
  { constellation: 'Kuiper', operator: 'Amazon', baseDeployed: 80, plannedTotal: 3236, altitudeKm: 590, purpose: 'Broadband Internet', baseRevenue: 0.1, baseSubscribers: null },
  { constellation: 'Telesat Lightspeed', operator: 'Telesat', baseDeployed: 0, plannedTotal: 298, altitudeKm: 1015, purpose: 'Enterprise / Government Broadband', baseRevenue: 0.0, baseSubscribers: null },
  { constellation: 'SES/O3b mPOWER', operator: 'SES', baseDeployed: 11, plannedTotal: 13, altitudeKm: 8000, purpose: 'Medium-Earth Orbit Data Services', baseRevenue: 0.9, baseSubscribers: null },
  { constellation: 'Rivada Space', operator: 'Rivada Networks', baseDeployed: 0, plannedTotal: 600, altitudeKm: 1000, purpose: 'Secure Government / Enterprise Network', baseRevenue: 0.0, baseSubscribers: null },
];

const COMPANY_SEEDS = [
  { company: 'SpaceX', ticker: null, baseMarketCap: 350, baseRevenueGrowth: 45, baseEbitdaMargin: 22, baseStockYTD: 0, sector: 'launch' as const },
  { company: 'Rocket Lab', ticker: 'RKLB', baseMarketCap: 12, baseRevenueGrowth: 55, baseEbitdaMargin: -8, baseStockYTD: 32, sector: 'launch' as const },
  { company: 'Iridium Communications', ticker: 'IRDM', baseMarketCap: 7.5, baseRevenueGrowth: 8, baseEbitdaMargin: 62, baseStockYTD: 5, sector: 'satellites' as const },
  { company: 'Viasat', ticker: 'VSAT', baseMarketCap: 3.2, baseRevenueGrowth: 12, baseEbitdaMargin: 25, baseStockYTD: -8, sector: 'satellites' as const },
  { company: 'Maxar (Advent)', ticker: null, baseMarketCap: 6.4, baseRevenueGrowth: 6, baseEbitdaMargin: 28, baseStockYTD: 0, sector: 'ground-systems' as const },
  { company: 'Planet Labs', ticker: 'PL', baseMarketCap: 2.1, baseRevenueGrowth: 22, baseEbitdaMargin: -15, baseStockYTD: 18, sector: 'analytics' as const },
  { company: 'BlackSky Technology', ticker: 'BKSY', baseMarketCap: 0.6, baseRevenueGrowth: 35, baseEbitdaMargin: -25, baseStockYTD: 40, sector: 'analytics' as const },
  { company: 'Spire Global', ticker: 'SPIR', baseMarketCap: 0.45, baseRevenueGrowth: 18, baseEbitdaMargin: -20, baseStockYTD: 12, sector: 'analytics' as const },
  { company: 'Mynaric', ticker: 'MYNA', baseMarketCap: 0.35, baseRevenueGrowth: 80, baseEbitdaMargin: -60, baseStockYTD: -15, sector: 'manufacturing' as const },
  { company: 'Redwire', ticker: 'RDW', baseMarketCap: 1.3, baseRevenueGrowth: 28, baseEbitdaMargin: -5, baseStockYTD: 22, sector: 'manufacturing' as const },
];

const GOVERNMENT_BUDGET_SEEDS = [
  { agency: 'NASA', baseBudget: 25.4, baseYoY: 2.5, keyPrograms: ['Artemis', 'Mars Sample Return', 'Commercial LEO Destinations', 'CLPS'] },
  { agency: 'ESA', baseBudget: 7.8, baseYoY: 4.0, keyPrograms: ['ExoMars', 'Copernicus', 'Ariane 6 Operations', 'Space Rider'] },
  { agency: 'CNSA', baseBudget: 14.0, baseYoY: 8.5, keyPrograms: ['Tiangong Operations', 'Chang\'e Lunar Program', 'Tianwen Mars', 'Xuntian Space Telescope'] },
  { agency: 'ISRO', baseBudget: 2.0, baseYoY: 12.0, keyPrograms: ['Chandrayaan-4', 'Gaganyaan', 'Bharatiya Antariksh Station', 'NISAR'] },
  { agency: 'JAXA', baseBudget: 3.5, baseYoY: 6.0, keyPrograms: ['MMX (Martian Moons)', 'H3 Launch Vehicle', 'Lunar Polar Exploration', 'ETS-9'] },
  { agency: 'Roscosmos', baseBudget: 3.2, baseYoY: -5.0, keyPrograms: ['Angara-A5', 'Luna Program', 'ROSS Station', 'Soyuz Crew Transport'] },
  { agency: 'KARI', baseBudget: 0.7, baseYoY: 15.0, keyPrograms: ['KSLV-III', 'Korea Pathfinder Lunar Orbiter Follow-on', 'SAR Constellation'] },
  { agency: 'CNES', baseBudget: 3.0, baseYoY: 3.5, keyPrograms: ['Ariane 6 Support', 'SVOM', 'MERLIN', 'MicroCarb'] },
];

const DEBRIS_EVENT_POOL = [
  'Defunct Cosmos satellite fragmentation detected in LEO',
  'Starlink satellite avoidance maneuver after conjunction warning',
  'Upper stage breakup event in sun-synchronous orbit',
  'Close approach between active ESA and decommissioned NOAA satellites',
  'Debris field from anti-satellite test remnants tracked crossing ISS orbit',
  'CZ-6A upper stage uncontrolled reentry over Indian Ocean',
  'Collision avoidance maneuver by ISS due to tracked debris fragment',
  'New debris cluster identified from 2007 ASAT test remnants',
  'OneWeb satellite performs emergency conjunction avoidance',
  'Fengyun-1C debris fragment passes within 500m of Tiangong station',
];

// -- Data Generation --

function generate(): SpaceEconomyResponse {
  const rng = seededRandom('space-economy');

  // -- Industry Overview --
  const commercialSharePct = roundTo(jitter(rng, 78, 0.04), 1);
  const governmentSharePct = roundTo(100 - commercialSharePct, 1);

  const industryOverview: IndustryOverview = {
    globalSpaceEconomyBillions: roundTo(jitter(rng, 570, 0.06), 1),
    commercialSharePct,
    governmentSharePct,
    launchesYTD: Math.round(jitter(rng, 180, 0.12)),
    satellitesDeployedYTD: Math.round(jitter(rng, 2800, 0.1)),
    investmentBillions: roundTo(jitter(rng, 20, 0.15), 1),
    yearOverYearGrowthPct: roundTo(jitter(rng, 8.5, 0.2), 1),
  };

  // -- Launch Activity --
  const launchSchedulePool = [
    'NET 2 weeks', 'NET 3 weeks', 'NET 1 month', 'March 2026', 'April 2026',
    'May 2026', 'Q2 2026', 'Q3 2026', 'Late 2026', 'TBD',
  ];

  const launchProviders: LaunchProvider[] = LAUNCH_PROVIDER_SEEDS.map((lp, i) => ({
    provider: lp.provider,
    launchesYTD: Math.round(jitter(rng, lp.baseLaunches, 0.15)),
    successRate: roundTo(Math.min(100, jitter(rng, lp.baseSuccessRate, 0.02)), 1),
    avgPayloadKg: Math.round(jitter(rng, lp.basePayloadKg, 0.05)),
    avgCostPerKgUSD: Math.round(jitter(rng, lp.baseCostPerKg, 0.08)),
    nextScheduledLaunch: launchSchedulePool[Math.floor(rng() * launchSchedulePool.length)],
    vehicleType: lp.vehicleType,
    reusable: lp.reusable,
  }));

  // -- Satellite Constellations --
  const satelliteConstellations: SatelliteConstellation[] = CONSTELLATION_SEEDS.map(c => ({
    constellation: c.constellation,
    operator: c.operator,
    satellitesDeployed: c.baseDeployed > 0 ? Math.round(jitter(rng, c.baseDeployed, 0.05)) : 0,
    plannedTotal: c.plannedTotal,
    orbitalAltitudeKm: c.altitudeKm,
    purpose: c.purpose,
    revenueEstimateBillions: roundTo(c.baseRevenue > 0 ? jitter(rng, c.baseRevenue, 0.12) : 0, 2),
    subscribersMillions: c.baseSubscribers !== null ? roundTo(jitter(rng, c.baseSubscribers, 0.1), 2) : null,
  }));

  // -- Space Company Performance --
  const spaceCompanies: SpaceCompany[] = COMPANY_SEEDS.map(c => ({
    company: c.company,
    ticker: c.ticker,
    marketCapBillions: roundTo(jitter(rng, c.baseMarketCap, 0.15), 2),
    revenueGrowthPct: roundTo(jitter(rng, c.baseRevenueGrowth, 0.2), 1),
    ebitdaMarginPct: roundTo(jitter(rng, Math.abs(c.baseEbitdaMargin), 0.15) * (c.baseEbitdaMargin < 0 ? -1 : 1), 1),
    stockYTDPct: c.ticker ? roundTo(jitter(rng, Math.abs(c.baseStockYTD) || 1, 0.4) * (c.baseStockYTD < 0 ? -1 : 1), 1) : 0,
    sector: c.sector,
  }));

  // -- Government Space Budgets --
  const governmentBudgets: GovernmentBudget[] = GOVERNMENT_BUDGET_SEEDS.map(g => ({
    agency: g.agency,
    budgetBillions: roundTo(jitter(rng, g.baseBudget, 0.06), 2),
    yearOverYearChangePct: roundTo(jitter(rng, Math.abs(g.baseYoY), 0.2) * (g.baseYoY < 0 ? -1 : 1), 1),
    keyPrograms: g.keyPrograms,
  }));

  // -- Orbital Environment --
  const shuffledDebris = [...DEBRIS_EVENT_POOL].sort(() => rng() - 0.5);
  const recentDebrisEvents = shuffledDebris.slice(0, 3);

  const activeSatellites = Math.round(jitter(rng, 9500, 0.06));
  const debrisCount = Math.round(jitter(rng, 23000, 0.08));

  const orbitalEnvironment: OrbitalEnvironment = {
    totalObjectsTracked: Math.round(jitter(rng, 33000, 0.05)),
    activeSatellites,
    debrisCount,
    collisionRiskEvents: Math.round(jitter(rng, 25, 0.2)),
    conjunctionWarnings: Math.round(jitter(rng, 4200, 0.1)),
    deorbitInitiatives: Math.round(jitter(rng, 12, 0.15)),
    recentDebrisEvents,
  };

  return {
    industryOverview,
    launchProviders,
    satelliteConstellations,
    spaceCompanies,
    governmentBudgets,
    orbitalEnvironment,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: SpaceEconomyResponse | null = null;
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
    console.error('[SpaceEconomy] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate space economy data' });
  }
});

export default router;
