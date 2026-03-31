import { Router, Request, Response } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── In-memory cache (5 min TTL) ──

let cacheData: unknown = null;
let cacheTime = 0;

// ── Types ──

interface CountryDemographic {
  name: string;
  population: number;
  growthRate: number;
  medianAge: number;
  fertilityRate: number;
  lifeExpectancy: number;
  urbanizationRate: number;
  netMigration: number;
  dependencyRatio: number;
  youthBulge: number;
  workingAgePop: number;
}

interface AgingIndexEntry {
  name: string;
  dependencyRatio: number;
  rank: number;
}

interface UrbanizationEntry {
  name: string;
  rate: number;
  projection2030: number;
}

interface LaborForceEntry {
  name: string;
  laborForceSize: number;
  participationRate: number;
  unemploymentRate: number;
  informalEconomy: number;
}

interface ProjectionEntry {
  name: string;
  population2030: number;
  population2050: number;
}

interface GlobalSummary {
  worldPopulation: number;
  avgGrowthRate: number;
  avgMedianAge: number;
  avgUrbanization: number;
  totalMigrants: number;
}

interface DemographicResponse {
  timestamp: string;
  countries: CountryDemographic[];
  globalSummary: GlobalSummary;
  agingIndex: AgingIndexEntry[];
  urbanizationTrend: UrbanizationEntry[];
  laborForce: LaborForceEntry[];
  projections: ProjectionEntry[];
}

// ── Base demographic data (realistic 2025 values) ──

interface CountryBase {
  name: string;
  population: number;       // millions
  growthRate: number;        // %
  medianAge: number;         // years
  fertilityRate: number;     // children per woman
  lifeExpectancy: number;    // years
  urbanizationRate: number;  // %
  netMigration: number;      // per 1000
  dependencyRatio: number;   // old-age %
  youthBulge: number;        // % under 25
  workingAgePop: number;     // % 15-64
  laborForceSize: number;    // millions
  participationRate: number; // %
  unemploymentRate: number;  // %
  informalEconomy: number;   // %
  population2030: number;    // millions
  population2050: number;    // millions
  urbanProjection2030: number; // %
}

const COUNTRIES: CountryBase[] = [
  {
    name: 'United States', population: 334.9, growthRate: 0.50, medianAge: 38.5,
    fertilityRate: 1.66, lifeExpectancy: 77.5, urbanizationRate: 83.1, netMigration: 3.0,
    dependencyRatio: 25.6, youthBulge: 30.2, workingAgePop: 64.8,
    laborForceSize: 167.0, participationRate: 62.5, unemploymentRate: 3.7, informalEconomy: 7.5,
    population2030: 346.0, population2050: 375.4, urbanProjection2030: 85.2,
  },
  {
    name: 'China', population: 1425.7, growthRate: -0.02, medianAge: 39.0,
    fertilityRate: 1.09, lifeExpectancy: 78.2, urbanizationRate: 64.7, netMigration: -0.2,
    dependencyRatio: 20.5, youthBulge: 24.1, workingAgePop: 69.3,
    laborForceSize: 785.0, participationRate: 68.1, unemploymentRate: 5.2, informalEconomy: 35.0,
    population2030: 1416.0, population2050: 1317.0, urbanProjection2030: 70.5,
  },
  {
    name: 'India', population: 1428.6, growthRate: 0.81, medianAge: 28.2,
    fertilityRate: 2.03, lifeExpectancy: 70.8, urbanizationRate: 35.9, netMigration: -0.3,
    dependencyRatio: 10.1, youthBulge: 43.2, workingAgePop: 67.6,
    laborForceSize: 523.0, participationRate: 49.8, unemploymentRate: 7.7, informalEconomy: 52.4,
    population2030: 1515.0, population2050: 1670.5, urbanProjection2030: 40.1,
  },
  {
    name: 'Japan', population: 123.3, growthRate: -0.53, medianAge: 48.6,
    fertilityRate: 1.20, lifeExpectancy: 84.8, urbanizationRate: 91.9, netMigration: 0.7,
    dependencyRatio: 48.6, youthBulge: 20.5, workingAgePop: 58.5,
    laborForceSize: 69.0, participationRate: 63.1, unemploymentRate: 2.6, informalEconomy: 10.0,
    population2030: 119.1, population2050: 104.9, urbanProjection2030: 92.8,
  },
  {
    name: 'Germany', population: 84.5, growthRate: -0.08, medianAge: 44.8,
    fertilityRate: 1.53, lifeExpectancy: 81.2, urbanizationRate: 77.5, netMigration: 4.8,
    dependencyRatio: 35.3, youthBulge: 23.6, workingAgePop: 63.5,
    laborForceSize: 44.8, participationRate: 63.0, unemploymentRate: 3.0, informalEconomy: 12.0,
    population2030: 84.1, population2050: 80.1, urbanProjection2030: 79.0,
  },
  {
    name: 'United Kingdom', population: 67.7, growthRate: 0.39, medianAge: 40.5,
    fertilityRate: 1.56, lifeExpectancy: 81.0, urbanizationRate: 84.2, netMigration: 3.5,
    dependencyRatio: 29.3, youthBulge: 28.8, workingAgePop: 63.7,
    laborForceSize: 34.2, participationRate: 63.3, unemploymentRate: 4.0, informalEconomy: 9.4,
    population2030: 69.6, population2050: 73.1, urbanProjection2030: 85.5,
  },
  {
    name: 'France', population: 64.8, growthRate: 0.18, medianAge: 42.0,
    fertilityRate: 1.80, lifeExpectancy: 82.5, urbanizationRate: 81.5, netMigration: 1.1,
    dependencyRatio: 32.5, youthBulge: 28.5, workingAgePop: 61.8,
    laborForceSize: 30.5, participationRate: 56.5, unemploymentRate: 7.3, informalEconomy: 12.8,
    population2030: 66.0, population2050: 67.5, urbanProjection2030: 83.0,
  },
  {
    name: 'Brazil', population: 216.4, growthRate: 0.52, medianAge: 34.3,
    fertilityRate: 1.64, lifeExpectancy: 76.0, urbanizationRate: 87.6, netMigration: 0.1,
    dependencyRatio: 14.5, youthBulge: 35.8, workingAgePop: 69.2,
    laborForceSize: 107.0, participationRate: 62.5, unemploymentRate: 8.0, informalEconomy: 38.5,
    population2030: 224.0, population2050: 229.0, urbanProjection2030: 89.5,
  },
  {
    name: 'Indonesia', population: 277.5, growthRate: 0.82, medianAge: 30.2,
    fertilityRate: 2.18, lifeExpectancy: 72.3, urbanizationRate: 58.0, netMigration: -0.5,
    dependencyRatio: 9.8, youthBulge: 40.5, workingAgePop: 68.5,
    laborForceSize: 140.0, participationRate: 67.8, unemploymentRate: 5.5, informalEconomy: 57.3,
    population2030: 295.0, population2050: 317.2, urbanProjection2030: 63.0,
  },
  {
    name: 'Nigeria', population: 223.8, growthRate: 2.41, medianAge: 18.1,
    fertilityRate: 5.13, lifeExpectancy: 55.4, urbanizationRate: 54.3, netMigration: -0.3,
    dependencyRatio: 5.3, youthBulge: 62.0, workingAgePop: 54.8,
    laborForceSize: 70.0, participationRate: 55.2, unemploymentRate: 33.3, informalEconomy: 65.0,
    population2030: 263.0, population2050: 377.5, urbanProjection2030: 59.5,
  },
  {
    name: 'Russia', population: 144.2, growthRate: -0.19, medianAge: 39.6,
    fertilityRate: 1.50, lifeExpectancy: 73.2, urbanizationRate: 74.8, netMigration: 1.1,
    dependencyRatio: 23.5, youthBulge: 26.3, workingAgePop: 66.0,
    laborForceSize: 75.0, participationRate: 62.0, unemploymentRate: 3.3, informalEconomy: 38.0,
    population2030: 141.5, population2050: 133.1, urbanProjection2030: 76.5,
  },
  {
    name: 'Mexico', population: 128.9, growthRate: 0.75, medianAge: 29.3,
    fertilityRate: 1.82, lifeExpectancy: 75.0, urbanizationRate: 81.3, netMigration: -1.6,
    dependencyRatio: 12.0, youthBulge: 38.5, workingAgePop: 67.0,
    laborForceSize: 59.0, participationRate: 60.2, unemploymentRate: 3.4, informalEconomy: 55.0,
    population2030: 137.0, population2050: 148.0, urbanProjection2030: 83.8,
  },
  {
    name: 'South Korea', population: 51.7, growthRate: -0.05, medianAge: 44.0,
    fertilityRate: 0.72, lifeExpectancy: 83.7, urbanizationRate: 81.4, netMigration: 1.1,
    dependencyRatio: 23.5, youthBulge: 22.0, workingAgePop: 71.4,
    laborForceSize: 28.5, participationRate: 64.0, unemploymentRate: 2.7, informalEconomy: 26.8,
    population2030: 51.2, population2050: 46.1, urbanProjection2030: 83.0,
  },
  {
    name: 'Canada', population: 40.1, growthRate: 1.42, medianAge: 41.1,
    fertilityRate: 1.43, lifeExpectancy: 82.3, urbanizationRate: 81.8, netMigration: 7.5,
    dependencyRatio: 27.2, youthBulge: 27.0, workingAgePop: 65.3,
    laborForceSize: 21.5, participationRate: 65.5, unemploymentRate: 5.4, informalEconomy: 8.0,
    population2030: 43.8, population2050: 49.5, urbanProjection2030: 83.5,
  },
  {
    name: 'Australia', population: 26.4, growthRate: 1.20, medianAge: 37.9,
    fertilityRate: 1.63, lifeExpectancy: 83.5, urbanizationRate: 86.6, netMigration: 6.9,
    dependencyRatio: 24.8, youthBulge: 29.5, workingAgePop: 65.0,
    laborForceSize: 14.2, participationRate: 66.8, unemploymentRate: 3.6, informalEconomy: 9.0,
    population2030: 28.8, population2050: 33.5, urbanProjection2030: 88.0,
  },
  {
    name: 'Italy', population: 58.9, growthRate: -0.34, medianAge: 47.3,
    fertilityRate: 1.24, lifeExpectancy: 83.5, urbanizationRate: 71.7, netMigration: 3.2,
    dependencyRatio: 36.8, youthBulge: 22.8, workingAgePop: 63.0,
    laborForceSize: 25.8, participationRate: 51.3, unemploymentRate: 7.6, informalEconomy: 24.5,
    population2030: 57.5, population2050: 52.3, urbanProjection2030: 73.5,
  },
  {
    name: 'Spain', population: 47.9, growthRate: 0.04, medianAge: 44.9,
    fertilityRate: 1.19, lifeExpectancy: 83.6, urbanizationRate: 81.1, netMigration: 4.9,
    dependencyRatio: 30.2, youthBulge: 23.5, workingAgePop: 65.0,
    laborForceSize: 23.5, participationRate: 58.8, unemploymentRate: 11.7, informalEconomy: 22.0,
    population2030: 48.5, population2050: 48.0, urbanProjection2030: 82.8,
  },
  {
    name: 'Turkey', population: 85.3, growthRate: 0.67, medianAge: 32.2,
    fertilityRate: 1.89, lifeExpectancy: 76.0, urbanizationRate: 77.0, netMigration: -0.5,
    dependencyRatio: 13.6, youthBulge: 36.8, workingAgePop: 67.5,
    laborForceSize: 34.5, participationRate: 53.5, unemploymentRate: 10.0, informalEconomy: 32.5,
    population2030: 89.2, population2050: 96.2, urbanProjection2030: 80.5,
  },
  {
    name: 'Saudi Arabia', population: 36.9, growthRate: 1.58, medianAge: 31.8,
    fertilityRate: 2.27, lifeExpectancy: 76.9, urbanizationRate: 84.7, netMigration: 5.5,
    dependencyRatio: 5.2, youthBulge: 36.5, workingAgePop: 72.0,
    laborForceSize: 16.0, participationRate: 59.3, unemploymentRate: 5.6, informalEconomy: 18.0,
    population2030: 40.5, population2050: 47.2, urbanProjection2030: 87.0,
  },
  {
    name: 'Thailand', population: 71.8, growthRate: 0.15, medianAge: 40.1,
    fertilityRate: 1.33, lifeExpectancy: 78.7, urbanizationRate: 52.9, netMigration: 0.3,
    dependencyRatio: 18.5, youthBulge: 27.0, workingAgePop: 70.0,
    laborForceSize: 39.5, participationRate: 68.5, unemploymentRate: 1.1, informalEconomy: 42.3,
    population2030: 72.0, population2050: 66.7, urbanProjection2030: 57.0,
  },
];

// ── Helper: apply tiny jitter ──

function jitter(rng: () => number, base: number, pct: number): number {
  return +(base * (1 + (rng() - 0.5) * 2 * pct)).toFixed(2);
}

// ── Data generation ──

function generateDemographicData(): DemographicResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('demographic-trends-' + today));

  const countries: CountryDemographic[] = COUNTRIES.map((c) => ({
    name: c.name,
    population: jitter(rng, c.population, 0.002),
    growthRate: jitter(rng, c.growthRate, 0.03),
    medianAge: jitter(rng, c.medianAge, 0.005),
    fertilityRate: jitter(rng, c.fertilityRate, 0.01),
    lifeExpectancy: jitter(rng, c.lifeExpectancy, 0.003),
    urbanizationRate: jitter(rng, c.urbanizationRate, 0.004),
    netMigration: jitter(rng, c.netMigration, 0.05),
    dependencyRatio: jitter(rng, c.dependencyRatio, 0.008),
    youthBulge: jitter(rng, c.youthBulge, 0.006),
    workingAgePop: jitter(rng, c.workingAgePop, 0.004),
  }));

  // Global summary
  const totalPop = countries.reduce((s, c) => s + c.population, 0);
  const avgGrowth = +(countries.reduce((s, c) => s + c.growthRate, 0) / countries.length).toFixed(3);
  const avgMedian = +(countries.reduce((s, c) => s + c.medianAge, 0) / countries.length).toFixed(1);
  const avgUrban = +(countries.reduce((s, c) => s + c.urbanizationRate, 0) / countries.length).toFixed(1);
  const totalMigrants = +jitter(rng, 281.0, 0.005).toFixed(1); // ~281M international migrants globally

  const globalSummary: GlobalSummary = {
    worldPopulation: +(totalPop / 1000).toFixed(3),
    avgGrowthRate: avgGrowth,
    avgMedianAge: avgMedian,
    avgUrbanization: avgUrban,
    totalMigrants,
  };

  // Aging index: ranked by old-age dependency ratio
  const agingIndex: AgingIndexEntry[] = [...countries]
    .sort((a, b) => b.dependencyRatio - a.dependencyRatio)
    .map((c, i) => ({
      name: c.name,
      dependencyRatio: c.dependencyRatio,
      rank: i + 1,
    }));

  // Urbanization trend: top 10 fastest urbanizing countries
  const urbanizationTrend: UrbanizationEntry[] = COUNTRIES
    .map((c) => ({
      name: c.name,
      rate: jitter(rng, c.urbanizationRate, 0.004),
      projection2030: jitter(rng, c.urbanProjection2030, 0.003),
    }))
    .sort((a, b) => (b.projection2030 - b.rate) - (a.projection2030 - a.rate))
    .slice(0, 10);

  // Labor force
  const laborForce: LaborForceEntry[] = COUNTRIES.map((c) => ({
    name: c.name,
    laborForceSize: jitter(rng, c.laborForceSize, 0.005),
    participationRate: jitter(rng, c.participationRate, 0.006),
    unemploymentRate: jitter(rng, c.unemploymentRate, 0.02),
    informalEconomy: jitter(rng, c.informalEconomy, 0.01),
  }));

  // Projections
  const projections: ProjectionEntry[] = COUNTRIES.map((c) => ({
    name: c.name,
    population2030: jitter(rng, c.population2030, 0.003),
    population2050: jitter(rng, c.population2050, 0.005),
  }));

  return {
    timestamp: new Date().toISOString(),
    countries,
    globalSummary,
    agingIndex,
    urbanizationTrend,
    laborForce,
    projections,
  };
}

// ── Route handler ──

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }

    const data = generateDemographicData();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[DemographicTrends] Error:', (err as Error)?.message);
    // Stale cache fallback
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate demographic trends data' });
  }
});

export default router;
