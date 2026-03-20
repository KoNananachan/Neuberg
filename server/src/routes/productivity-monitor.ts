import { Router, Request, Response } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Types --

interface LaborProductivity {
  current: number;
  yoyGrowth: number;
  qoqGrowth: number;
}

interface OutputPerHour {
  nonfarm: number;
  manufacturing: number;
  services: number;
}

interface TotalFactorProductivity {
  index: number;
  yoyGrowth: number;
  fiveYearAvg: number;
}

interface UnitLaborCosts {
  current: number;
  yoyChange: number;
  trend: 'rising' | 'falling' | 'stable';
}

interface SectorProductivity {
  sector: string;
  productivity: number;
  growth: number;
  employment: number;
}

interface Decomposition {
  outputGrowth: number;
  hoursWorked: number;
  productivityContribution: number;
}

interface Automation {
  robotDensity: number;
  aiAdoption: number;
  investmentPct: number;
}

interface HistoricalQuarter {
  quarter: string;
  value: number;
}

interface EconomyData {
  country: string;
  code: string;
  laborProductivity: LaborProductivity;
  outputPerHour: OutputPerHour;
  totalFactorProductivity: TotalFactorProductivity;
  unitLaborCosts: UnitLaborCosts;
  sectors: SectorProductivity[];
  decomposition: Decomposition;
  automation: Automation;
  historicalProductivity: HistoricalQuarter[];
}

interface GlobalRankingEntry {
  country: string;
  productivity: number;
  rank: number;
  change: number;
}

interface ProductivityGap {
  advancedVsEM: number;
  usVsEU: number;
  trendNarrowing: boolean;
}

interface Implications {
  wageGrowthCapacity: number;
  inflationPressure: 'low' | 'moderate' | 'elevated';
  competitiveness: 'improving' | 'deteriorating' | 'stable';
}

interface ProductivityMonitorData {
  economies: EconomyData[];
  globalRanking: GlobalRankingEntry[];
  productivityGap: ProductivityGap;
  implications: Implications;
  generatedAt: string;
}

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: ProductivityMonitorData; ts: number } | null = null;

// -- Helpers --

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

// -- Constants --

const ECONOMIES: {
  country: string;
  code: string;
  lpBase: number;
  nonfarmBase: number;
  mfgBase: number;
  svcBase: number;
  tfpBase: number;
  ulcBase: number;
  robotBase: number;
  aiBase: number;
  investBase: number;
}[] = [
  { country: 'United States',  code: 'US', lpBase: 112.4, nonfarmBase: 68.2, mfgBase: 74.5, svcBase: 62.8, tfpBase: 103.8, ulcBase: 118.6, robotBase: 285,  aiBase: 38, investBase: 4.2 },
  { country: 'Eurozone',       code: 'EZ', lpBase: 107.2, nonfarmBase: 62.4, mfgBase: 70.1, svcBase: 58.3, tfpBase: 101.5, ulcBase: 114.2, robotBase: 225,  aiBase: 28, investBase: 3.1 },
  { country: 'United Kingdom', code: 'GB', lpBase: 104.8, nonfarmBase: 58.7, mfgBase: 64.3, svcBase: 56.1, tfpBase: 100.6, ulcBase: 121.3, robotBase: 115,  aiBase: 32, investBase: 2.8 },
  { country: 'Japan',          code: 'JP', lpBase: 105.6, nonfarmBase: 48.9, mfgBase: 72.8, svcBase: 42.6, tfpBase: 100.2, ulcBase: 108.4, robotBase: 399,  aiBase: 26, investBase: 3.6 },
  { country: 'China',          code: 'CN', lpBase: 118.5, nonfarmBase: 32.4, mfgBase: 45.6, svcBase: 28.9, tfpBase: 106.2, ulcBase: 124.8, robotBase: 392,  aiBase: 35, investBase: 5.1 },
  { country: 'Canada',         code: 'CA', lpBase: 106.1, nonfarmBase: 56.3, mfgBase: 61.8, svcBase: 52.4, tfpBase: 101.0, ulcBase: 116.5, robotBase: 176,  aiBase: 30, investBase: 2.9 },
  { country: 'Australia',      code: 'AU', lpBase: 108.3, nonfarmBase: 60.1, mfgBase: 58.4, svcBase: 57.2, tfpBase: 102.1, ulcBase: 115.8, robotBase: 95,   aiBase: 27, investBase: 2.6 },
  { country: 'South Korea',    code: 'KR', lpBase: 111.7, nonfarmBase: 44.6, mfgBase: 68.9, svcBase: 38.5, tfpBase: 104.5, ulcBase: 112.9, robotBase: 1012, aiBase: 34, investBase: 4.8 },
];

const SECTORS: { sector: string; prodBase: number; growthBase: number; empBase: number }[] = [
  { sector: 'Technology',     prodBase: 165, growthBase: 4.8,  empBase: 8500 },
  { sector: 'Manufacturing',  prodBase: 128, growthBase: 2.1,  empBase: 12200 },
  { sector: 'Finance',        prodBase: 145, growthBase: 3.2,  empBase: 6800 },
  { sector: 'Healthcare',     prodBase: 95,  growthBase: 1.4,  empBase: 16400 },
  { sector: 'Retail',         prodBase: 72,  growthBase: 1.8,  empBase: 15100 },
  { sector: 'Construction',   prodBase: 68,  growthBase: 0.6,  empBase: 7900 },
  { sector: 'Agriculture',    prodBase: 88,  growthBase: 2.5,  empBase: 2600 },
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

// -- Data generation --

function generate(): ProductivityMonitorData {
  const rng = seededRandom('productivity-monitor');

  const economies: EconomyData[] = ECONOMIES.map(cfg => {
    // Labor productivity index (2020=100)
    const lpCurrent = round1(cfg.lpBase + (rng() - 0.5) * 6);
    const lpYoy = round1(0.5 + (rng() - 0.4) * 3.2);
    const lpQoq = round2((rng() - 0.45) * 1.8);

    const laborProductivity: LaborProductivity = {
      current: lpCurrent,
      yoyGrowth: lpYoy,
      qoqGrowth: lpQoq,
    };

    // Output per hour (USD PPP)
    const countryScale = 0.85 + rng() * 0.3;
    const outputPerHour: OutputPerHour = {
      nonfarm: round1(cfg.nonfarmBase * countryScale + (rng() - 0.5) * 4),
      manufacturing: round1(cfg.mfgBase * countryScale + (rng() - 0.5) * 5),
      services: round1(cfg.svcBase * countryScale + (rng() - 0.5) * 3),
    };

    // Total factor productivity
    const tfpYoy = round2(0.2 + (rng() - 0.4) * 2.0);
    const tfpFiveYear = round2(0.4 + (rng() - 0.3) * 1.2);
    const totalFactorProductivity: TotalFactorProductivity = {
      index: round1(cfg.tfpBase + (rng() - 0.5) * 3),
      yoyGrowth: tfpYoy,
      fiveYearAvg: tfpFiveYear,
    };

    // Unit labor costs
    const ulcYoy = round1(1.5 + (rng() - 0.4) * 4.0);
    const ulcTrend: 'rising' | 'falling' | 'stable' =
      ulcYoy > 2.5 ? 'rising' : ulcYoy < 0.5 ? 'falling' : 'stable';
    const unitLaborCosts: UnitLaborCosts = {
      current: round1(cfg.ulcBase + (rng() - 0.5) * 5),
      yoyChange: ulcYoy,
      trend: ulcTrend,
    };

    // Sector productivity
    const sectorFactor = 0.7 + rng() * 0.6;
    const sectors: SectorProductivity[] = SECTORS.map(s => ({
      sector: s.sector,
      productivity: round1(s.prodBase * sectorFactor + (rng() - 0.5) * 15),
      growth: round1(s.growthBase + (rng() - 0.5) * 2.4),
      employment: Math.round(s.empBase * (0.8 + rng() * 0.4)),
    }));

    // Decomposition
    const outputGrowth = round1(1.5 + (rng() - 0.3) * 3.5);
    const hoursWorked = round1(-0.2 + (rng() - 0.5) * 2.0);
    const productivityContribution = round1(outputGrowth - hoursWorked);
    const decomposition: Decomposition = {
      outputGrowth,
      hoursWorked,
      productivityContribution,
    };

    // Automation
    const automation: Automation = {
      robotDensity: Math.round(cfg.robotBase + (rng() - 0.5) * cfg.robotBase * 0.15),
      aiAdoption: round1(cfg.aiBase + (rng() - 0.5) * 8),
      investmentPct: round1(cfg.investBase + (rng() - 0.5) * 1.2),
    };

    // Historical productivity (last 8 quarters)
    const now = new Date();
    const currentQ = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    let hVal = lpCurrent - 3.5 + rng() * 2;
    const historicalProductivity: HistoricalQuarter[] = [];
    for (let i = 7; i >= 0; i--) {
      const qOffset = currentQ - i;
      const qIdx = ((qOffset % 4) + 4) % 4;
      const yOffset = Math.floor((currentQ - i) / 4);
      const yr = currentYear + yOffset - (currentQ - i < 0 ? 1 : 0);
      const adjustedYear = qOffset < 0 ? yr : currentYear - Math.floor(i / 4) + (qOffset >= 0 ? 0 : -1);
      // Simpler: compute backward from current quarter
      const totalQBack = i;
      const yearBack = Math.floor(totalQBack / 4);
      const quarterBack = totalQBack % 4;
      const histQ = ((currentQ - quarterBack) % 4 + 4) % 4;
      const histYear = currentYear - yearBack - (currentQ - quarterBack < 0 ? 1 : 0);
      hVal = round1(hVal + (rng() - 0.42) * 1.2);
      historicalProductivity.push({
        quarter: `${QUARTERS[histQ]} ${histYear}`,
        value: hVal,
      });
    }

    return {
      country: cfg.country,
      code: cfg.code,
      laborProductivity,
      outputPerHour,
      totalFactorProductivity,
      unitLaborCosts,
      sectors,
      decomposition,
      automation,
      historicalProductivity,
    };
  });

  // Global ranking by labor productivity current index
  const sorted = [...economies].sort((a, b) => b.laborProductivity.current - a.laborProductivity.current);
  const globalRanking: GlobalRankingEntry[] = sorted.map((e, i) => ({
    country: e.country,
    productivity: e.laborProductivity.current,
    rank: i + 1,
    change: Math.round((rng() - 0.5) * 4),
  }));

  // Productivity gap
  const usData = economies.find(e => e.code === 'US');
  const ezData = economies.find(e => e.code === 'EZ');
  const cnData = economies.find(e => e.code === 'CN');
  const advancedAvg = round1(
    economies
      .filter(e => e.code !== 'CN')
      .reduce((s, e) => s + e.laborProductivity.current, 0) /
    economies.filter(e => e.code !== 'CN').length
  );
  const emAvg = cnData ? cnData.laborProductivity.current : 100;
  const productivityGap: ProductivityGap = {
    advancedVsEM: round1(advancedAvg - emAvg),
    usVsEU: round1((usData?.laborProductivity.current ?? 112) - (ezData?.laborProductivity.current ?? 107)),
    trendNarrowing: rng() > 0.45,
  };

  // Implications
  const avgLpGrowth = round1(economies.reduce((s, e) => s + e.laborProductivity.yoyGrowth, 0) / economies.length);
  const avgUlc = round1(economies.reduce((s, e) => s + e.unitLaborCosts.yoyChange, 0) / economies.length);
  const inflationPressure: 'low' | 'moderate' | 'elevated' =
    avgUlc > 3.5 ? 'elevated' : avgUlc > 2.0 ? 'moderate' : 'low';
  const competitiveness: 'improving' | 'deteriorating' | 'stable' =
    avgLpGrowth > 2.0 ? 'improving' : avgLpGrowth < 0.5 ? 'deteriorating' : 'stable';

  const implications: Implications = {
    wageGrowthCapacity: round1(avgLpGrowth + 2.0),
    inflationPressure,
    competitiveness,
  };

  return {
    economies,
    globalRanking,
    productivityGap,
    implications,
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
    console.error('[ProductivityMonitor] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate productivity monitor data' });
  }
});

export default router;
