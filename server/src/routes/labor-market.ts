import { Router, Request, Response } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Types --

interface EmploymentSummary {
  nfpChange: number;
  unemploymentRate: number;
  participationRate: number;
  u6Rate: number;
  avgHourlyEarningsYoY: number;
  avgWeeklyHours: number;
  priorRevision: number;
}

interface JoblessClaims {
  initialClaims: number;
  continuingClaims: number;
  initialChange: number;
  continuingChange: number;
  fourWeekAvg: number;
  insuredUnemploymentRate: number;
}

interface JoltsData {
  jobOpenings: number;
  hires: number;
  quits: number;
  layoffs: number;
  quitsRate: number;
  openingsToUnemployed: number;
}

interface SectorEmployment {
  sector: string;
  change: number;
  trend: 'growing' | 'declining' | 'stable';
  avgWage: number;
}

interface GlobalLaborMarket {
  country: string;
  unemploymentRate: number;
  change: number;
  participationRate: number;
  wageGrowthYoY: number;
}

interface WageTracker {
  measure: string;
  value: number;
  priorValue: number;
  trend: 'accelerating' | 'decelerating' | 'stable';
  fedTarget: number;
}

interface LaborMarketData {
  employmentSummary: EmploymentSummary;
  joblessClaims: JoblessClaims;
  joltsData: JoltsData;
  sectorEmployment: SectorEmployment[];
  globalLaborMarkets: GlobalLaborMarket[];
  wageTracker: WageTracker[];
  generatedAt: string;
}

// -- Cache --


let cache: { data: LaborMarketData; ts: number } | null = null;

// -- Helpers --

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

// -- Data generation --

function generate(): LaborMarketData {
  const rng = seededRandom('labor-market');

  // 1. Employment Summary
  // NFP: 150-250K, unemployment: 3.7-4.2%, participation: 62.5-63.0%, AHE: 3.5-4.5%
  const nfpChange = Math.round(150 + rng() * 100);
  const unemploymentRate = round1(3.7 + rng() * 0.5);
  const participationRate = round1(62.5 + rng() * 0.5);
  const u6Rate = round1(unemploymentRate + 2.8 + rng() * 1.0);
  const avgHourlyEarningsYoY = round1(3.5 + rng() * 1.0);
  const avgWeeklyHours = round1(34.2 + rng() * 0.6);
  const priorRevision = Math.round((rng() - 0.5) * 60);

  const employmentSummary: EmploymentSummary = {
    nfpChange,
    unemploymentRate,
    participationRate,
    u6Rate,
    avgHourlyEarningsYoY,
    avgWeeklyHours,
    priorRevision,
  };

  // 2. Jobless Claims
  // Initial claims: 200-260K, continuing: 1700-1900K
  const initialClaims = Math.round(200 + rng() * 60);
  const continuingClaims = Math.round(1700 + rng() * 200);
  const initialChange = Math.round((rng() - 0.5) * 30);
  const continuingChange = Math.round((rng() - 0.5) * 60);
  const fourWeekAvg = round1(initialClaims + (rng() - 0.5) * 10);
  const insuredUnemploymentRate = round1(1.1 + rng() * 0.3);

  const joblessClaims: JoblessClaims = {
    initialClaims,
    continuingClaims,
    initialChange,
    continuingChange,
    fourWeekAvg,
    insuredUnemploymentRate,
  };

  // 3. JOLTS Data
  // Openings: 8-10M, quits rate: 2.2-2.5%, ratio: 1.2-1.5
  const jobOpenings = round1(8.0 + rng() * 2.0);
  const hires = round1(5.5 + rng() * 1.0);
  const quits = round1(3.5 + rng() * 0.8);
  const layoffs = round1(1.5 + rng() * 0.5);
  const quitsRate = round1(2.2 + rng() * 0.3);
  const openingsToUnemployed = round2(1.2 + rng() * 0.3);

  const joltsData: JoltsData = {
    jobOpenings,
    hires,
    quits,
    layoffs,
    quitsRate,
    openingsToUnemployed,
  };

  // 4. Sector Employment
  const sectorConfigs: { sector: string; changeBase: number; changeSpread: number; wageBase: number; wageSpread: number }[] = [
    { sector: 'Healthcare',          changeBase: 55,  changeSpread: 20, wageBase: 32, wageSpread: 5 },
    { sector: 'Leisure/Hospitality', changeBase: 40,  changeSpread: 25, wageBase: 20, wageSpread: 4 },
    { sector: 'Government',          changeBase: 35,  changeSpread: 15, wageBase: 35, wageSpread: 5 },
    { sector: 'Construction',        changeBase: 20,  changeSpread: 15, wageBase: 33, wageSpread: 5 },
    { sector: 'Manufacturing',       changeBase: -5,  changeSpread: 15, wageBase: 30, wageSpread: 4 },
    { sector: 'Retail',              changeBase: 5,   changeSpread: 20, wageBase: 19, wageSpread: 3 },
    { sector: 'Tech',                changeBase: 10,  changeSpread: 20, wageBase: 55, wageSpread: 10 },
    { sector: 'Financial',           changeBase: 8,   changeSpread: 12, wageBase: 42, wageSpread: 8 },
  ];

  const sectorEmployment: SectorEmployment[] = sectorConfigs.map(cfg => {
    const change = round1(cfg.changeBase + (rng() - 0.5) * 2 * cfg.changeSpread);
    const avgWage = round2(cfg.wageBase + (rng() - 0.5) * 2 * cfg.wageSpread);
    let trend: 'growing' | 'declining' | 'stable';
    if (change > 5) trend = 'growing';
    else if (change < -5) trend = 'declining';
    else trend = 'stable';
    return { sector: cfg.sector, change, trend, avgWage };
  });

  // 5. Global Labor Markets
  const globalConfigs: { country: string; unempBase: number; unempSpread: number; partBase: number; partSpread: number; wageBase: number; wageSpread: number }[] = [
    { country: 'US',        unempBase: 3.9,  unempSpread: 0.3, partBase: 62.7, partSpread: 0.3, wageBase: 4.0,  wageSpread: 0.5 },
    { country: 'Eurozone',  unempBase: 6.4,  unempSpread: 0.3, partBase: 60.5, partSpread: 0.5, wageBase: 4.5,  wageSpread: 0.8 },
    { country: 'UK',        unempBase: 4.2,  unempSpread: 0.3, partBase: 62.0, partSpread: 0.5, wageBase: 5.5,  wageSpread: 1.0 },
    { country: 'Japan',     unempBase: 2.6,  unempSpread: 0.2, partBase: 63.0, partSpread: 0.3, wageBase: 2.0,  wageSpread: 0.8 },
    { country: 'Canada',    unempBase: 5.8,  unempSpread: 0.3, partBase: 65.5, partSpread: 0.5, wageBase: 4.8,  wageSpread: 0.8 },
    { country: 'Australia', unempBase: 3.7,  unempSpread: 0.2, partBase: 66.8, partSpread: 0.3, wageBase: 4.2,  wageSpread: 0.5 },
  ];

  const globalLaborMarkets: GlobalLaborMarket[] = globalConfigs.map(cfg => {
    const unemploymentRate = round1(cfg.unempBase + (rng() - 0.5) * 2 * cfg.unempSpread);
    const change = round1((rng() - 0.5) * 0.4);
    const participationRate = round1(cfg.partBase + (rng() - 0.5) * 2 * cfg.partSpread);
    const wageGrowthYoY = round1(cfg.wageBase + (rng() - 0.5) * 2 * cfg.wageSpread);
    return { country: cfg.country, unemploymentRate, change, participationRate, wageGrowthYoY };
  });

  // 6. Wage Tracker
  const wageConfigs: { measure: string; valueBase: number; valueSpread: number; fedTarget: number }[] = [
    { measure: 'AHE',                       valueBase: 4.0, valueSpread: 0.5, fedTarget: 3.0 },
    { measure: 'ECI',                        valueBase: 4.2, valueSpread: 0.4, fedTarget: 3.0 },
    { measure: 'Atlanta Fed Wage Growth',    valueBase: 5.0, valueSpread: 0.8, fedTarget: 3.5 },
    { measure: 'Unit Labor Costs',           valueBase: 2.5, valueSpread: 1.0, fedTarget: 2.0 },
  ];

  const wageTracker: WageTracker[] = wageConfigs.map(cfg => {
    const value = round1(cfg.valueBase + (rng() - 0.5) * 2 * cfg.valueSpread);
    const priorValue = round1(cfg.valueBase + (rng() - 0.5) * 2 * cfg.valueSpread);
    let trend: 'accelerating' | 'decelerating' | 'stable';
    const diff = value - priorValue;
    if (diff > 0.15) trend = 'accelerating';
    else if (diff < -0.15) trend = 'decelerating';
    else trend = 'stable';
    return { measure: cfg.measure, value, priorValue, trend, fedTarget: cfg.fedTarget };
  });

  return {
    employmentSummary,
    joblessClaims,
    joltsData,
    sectorEmployment,
    globalLaborMarkets,
    wageTracker,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LaborMarket] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate labor market data' });
  }
});

export default router;
