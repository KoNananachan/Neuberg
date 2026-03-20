import { Router, Request, Response } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Types --

interface SectorWage {
  sector: string;
  wageGrowth: number;
  employment: number;
  avgSalary: number;
  qoqChange: number;
}

interface WageMeasures {
  avgHourlyEarnings: number;
  medianWeekly: number;
  employmentCostIndex: number;
  unitLaborCosts: number;
}

interface Demographics {
  entryLevel: number;
  midCareer: number;
  senior: number;
  partTime: number;
  fullTime: number;
}

interface CountryWageData {
  country: string;
  code: string;
  headline: number;
  realWageGrowth: number;
  previous: number;
  trend: 'accelerating' | 'decelerating' | 'stable';
  sectors: SectorWage[];
  measures: WageMeasures;
  demographics: Demographics;
  historicalWageGrowth: { month: string; value: number }[];
}

interface GlobalComparison {
  country: string;
  nominal: number;
  real: number;
  rank: number;
}

interface WageInflationRisk {
  level: 'low' | 'moderate' | 'high';
  description: string;
  keyDrivers: string[];
}

interface PhillipsCurveEntry {
  country: string;
  unemployment: number;
  wageGrowth: number;
  naturalRate: number;
  gap: number;
}

interface WageGrowthData {
  countries: CountryWageData[];
  globalComparison: GlobalComparison[];
  wageInflationRisk: WageInflationRisk;
  phillipsCurve: PhillipsCurveEntry[];
  generatedAt: string;
}

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: WageGrowthData; ts: number } | null = null;

// -- Helpers --

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

// -- Constants --

const COUNTRIES: { country: string; code: string; nominalBase: number; cpiBase: number; unempBase: number; naturalRate: number }[] = [
  { country: 'United States',  code: 'US', nominalBase: 4.2,  cpiBase: 2.8, unempBase: 3.9,  naturalRate: 4.2 },
  { country: 'Eurozone',       code: 'EZ', nominalBase: 4.5,  cpiBase: 2.4, unempBase: 6.4,  naturalRate: 6.8 },
  { country: 'United Kingdom', code: 'GB', nominalBase: 5.8,  cpiBase: 3.2, unempBase: 4.3,  naturalRate: 4.5 },
  { country: 'Japan',          code: 'JP', nominalBase: 3.2,  cpiBase: 2.6, unempBase: 2.5,  naturalRate: 2.8 },
  { country: 'Canada',         code: 'CA', nominalBase: 4.8,  cpiBase: 2.6, unempBase: 5.7,  naturalRate: 5.9 },
  { country: 'Australia',      code: 'AU', nominalBase: 4.1,  cpiBase: 2.9, unempBase: 3.8,  naturalRate: 4.3 },
];

const SECTORS = [
  { sector: 'Technology',     empBase: 12800, salaryBase: 125000, growthBase: 5.5 },
  { sector: 'Finance',        empBase: 9200,  salaryBase: 105000, growthBase: 4.8 },
  { sector: 'Healthcare',     empBase: 16500, salaryBase: 78000,  growthBase: 4.2 },
  { sector: 'Manufacturing',  empBase: 12400, salaryBase: 62000,  growthBase: 3.6 },
  { sector: 'Retail',         empBase: 15600, salaryBase: 38000,  growthBase: 3.1 },
  { sector: 'Construction',   empBase: 8100,  salaryBase: 58000,  growthBase: 4.0 },
  { sector: 'Education',      empBase: 13200, salaryBase: 56000,  growthBase: 2.8 },
  { sector: 'Government',     empBase: 22800, salaryBase: 68000,  growthBase: 2.5 },
  { sector: 'Energy',         empBase: 6400,  salaryBase: 92000,  growthBase: 4.5 },
  { sector: 'Transport',      empBase: 9800,  salaryBase: 52000,  growthBase: 3.4 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// -- Data generation --

function generate(): WageGrowthData {
  const rng = seededRandom('wage-growth');

  const countries: CountryWageData[] = COUNTRIES.map(cfg => {
    const nominal = round1(cfg.nominalBase + (rng() - 0.5) * 1.6);
    const cpi = round1(cfg.cpiBase + (rng() - 0.5) * 0.8);
    const realWage = round1(nominal - cpi);
    const previous = round1(nominal + (rng() - 0.5) * 0.8);
    const diff = nominal - previous;
    const trend: 'accelerating' | 'decelerating' | 'stable' =
      diff > 0.2 ? 'accelerating' : diff < -0.2 ? 'decelerating' : 'stable';

    // Sectors with country-specific scaling
    const countryFactor = 0.8 + rng() * 0.4;
    const sectors: SectorWage[] = SECTORS.map(s => {
      const wageGrowth = round1((s.growthBase + (rng() - 0.5) * 1.4) * countryFactor);
      const employment = Math.round(s.empBase * (0.85 + rng() * 0.3));
      const avgSalary = Math.round(s.salaryBase * countryFactor * (0.9 + rng() * 0.2));
      const qoqChange = round2((rng() - 0.45) * 1.5);
      return { sector: s.sector, wageGrowth, employment, avgSalary, qoqChange };
    });

    // Wage measures
    const measures: WageMeasures = {
      avgHourlyEarnings: round2(28 + rng() * 12),
      medianWeekly: Math.round(900 + rng() * 400),
      employmentCostIndex: round1(3.5 + rng() * 2.0),
      unitLaborCosts: round1(1.5 + rng() * 3.0),
    };

    // Demographics (wage growth rates by category)
    const demographics: Demographics = {
      entryLevel: round1(3.0 + rng() * 2.5),
      midCareer: round1(3.5 + rng() * 2.0),
      senior: round1(2.5 + rng() * 1.8),
      partTime: round1(2.8 + rng() * 2.0),
      fullTime: round1(3.8 + rng() * 2.2),
    };

    // Historical 12 months
    const now = new Date();
    const historicalWageGrowth: { month: string; value: number }[] = [];
    let hVal = nominal - 0.5 + rng() * 1.0;
    for (let i = 11; i >= 0; i--) {
      const mIdx = (now.getMonth() - i + 12) % 12;
      const yr = now.getFullYear() - (now.getMonth() - i < 0 ? 1 : 0);
      hVal = round1(hVal + (rng() - 0.48) * 0.3);
      historicalWageGrowth.push({ month: `${MONTHS[mIdx]} ${yr}`, value: hVal });
    }

    return {
      country: cfg.country,
      code: cfg.code,
      headline: nominal,
      realWageGrowth: realWage,
      previous,
      trend,
      sectors,
      measures,
      demographics,
      historicalWageGrowth,
    };
  });

  // Global comparison
  const sorted = [...countries].sort((a, b) => b.headline - a.headline);
  const globalComparison: GlobalComparison[] = sorted.map((c, i) => ({
    country: c.country,
    nominal: c.headline,
    real: c.realWageGrowth,
    rank: i + 1,
  }));

  // Wage inflation risk assessment
  const avgNominal = round1(countries.reduce((s, c) => s + c.headline, 0) / countries.length);
  const riskLevel: 'low' | 'moderate' | 'high' =
    avgNominal > 5.0 ? 'high' : avgNominal > 3.5 ? 'moderate' : 'low';

  const riskDescriptions: Record<string, string> = {
    low: 'Wage growth is contained within central bank comfort zones, posing minimal risk to inflation targets.',
    moderate: 'Wage growth is elevated in several economies, warranting close monitoring for second-round inflation effects.',
    high: 'Wage-price spiral risk is elevated across major economies. Central banks may need to maintain restrictive stance.',
  };

  const driverPool = [
    'Tight labor markets in services sector',
    'Public sector catch-up pay agreements',
    'Minimum wage increases across multiple jurisdictions',
    'AI-driven productivity gains offsetting labor costs',
    'Immigration policy tightening reducing labor supply',
    'Strong union bargaining outcomes in manufacturing',
    'Skills shortage in technology and healthcare',
    'Elevated inflation expectations anchoring higher wage demands',
  ];
  const keyDrivers: string[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(rng() * driverPool.length);
    const driver = driverPool.splice(idx, 1)[0];
    keyDrivers.push(driver);
  }

  const wageInflationRisk: WageInflationRisk = {
    level: riskLevel,
    description: riskDescriptions[riskLevel],
    keyDrivers,
  };

  // Phillips Curve data
  const phillipsCurve: PhillipsCurveEntry[] = COUNTRIES.map((cfg, i) => {
    const unemployment = round1(cfg.unempBase + (rng() - 0.5) * 0.6);
    const wageGrowth = countries[i].headline;
    const gap = round1(cfg.naturalRate - unemployment);
    return {
      country: cfg.country,
      unemployment,
      wageGrowth,
      naturalRate: cfg.naturalRate,
      gap,
    };
  });

  return {
    countries,
    globalComparison,
    wageInflationRisk,
    phillipsCurve,
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
    console.error('[WageGrowth] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate wage growth data' });
  }
});

export default router;
