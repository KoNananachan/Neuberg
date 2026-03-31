import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface CpiComponent {
  name: string;
  weight: number;
  yoy: number;
  mom: number;
  trend: 'rising' | 'falling' | 'stable';
}

interface CpiBreakdown {
  headlineCpi: { yoy: number; mom: number };
  coreCpi: { yoy: number; mom: number };
  components: CpiComponent[];
}

interface PpiData {
  headline: { yoy: number; mom: number };
  core: { yoy: number; mom: number };
  finalDemandGoods: { yoy: number; mom: number };
  finalDemandServices: { yoy: number; mom: number };
  intermediateDemand: { yoy: number; mom: number };
}

interface PceData {
  headline: { yoy: number; mom: number };
  core: { yoy: number; mom: number };
  supercore: { yoy: number; mom: number };
}

interface ExpectationEntry {
  current: number;
  oneMonthAgo: number;
  threeMonthsAgo: number;
}

interface InflationExpectations {
  tipsBreakevens: {
    twoYear: ExpectationEntry;
    fiveYear: ExpectationEntry;
    tenYear: ExpectationEntry;
    thirtyYear: ExpectationEntry;
  };
  fiveYearFiveYearForward: ExpectationEntry;
  michiganSurvey: {
    oneYear: ExpectationEntry;
    fiveYear: ExpectationEntry;
  };
  nyFedSurvey: ExpectationEntry;
  clevelandFedNowcast: ExpectationEntry;
}

interface GlobalCountry {
  country: string;
  headlineCPI: number;
  coreCPI: number;
  centralBankTarget: number;
  gapToTarget: number;
  direction: 'above' | 'below' | 'at target';
}

interface TrimmedMeans {
  clevelandTrimmedMeanCPI: number;
  clevelandMedianCPI: number;
  stickyCPI: number;
  flexibleCPI: number;
  atlantaFedStickyCPI: number;
}

interface InflationMonitorResponse {
  cpiBreakdown: CpiBreakdown;
  ppiData: PpiData;
  pceData: PceData;
  inflationExpectations: InflationExpectations;
  globalComparison: GlobalCountry[];
  trimmedMeans: TrimmedMeans;
  timestamp: string;
}

// ── Cache ──

let cache: { data: InflationMonitorResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── CPI Component Anchors ──

const CPI_COMPONENTS: { name: string; weight: number; yoyBase: number; momBase: number }[] = [
  { name: 'Food', weight: 13.5, yoyBase: 2.5, momBase: 0.2 },
  { name: 'Energy', weight: 6.9, yoyBase: -0.5, momBase: 0.3 },
  { name: 'Shelter', weight: 36.2, yoyBase: 5.5, momBase: 0.4 },
  { name: 'Transportation', weight: 8.7, yoyBase: 1.8, momBase: -0.1 },
  { name: 'Medical', weight: 8.5, yoyBase: 3.2, momBase: 0.3 },
  { name: 'Apparel', weight: 2.6, yoyBase: 1.0, momBase: 0.1 },
  { name: 'Education', weight: 5.8, yoyBase: 2.8, momBase: 0.2 },
  { name: 'Recreation', weight: 5.4, yoyBase: 1.5, momBase: 0.1 },
];

// ── Global Country Anchors ──

const GLOBAL_COUNTRIES: { country: string; headlineBase: number; coreBase: number; target: number }[] = [
  { country: 'United States', headlineBase: 3.2, coreBase: 3.8, target: 2.0 },
  { country: 'Eurozone', headlineBase: 2.4, coreBase: 2.9, target: 2.0 },
  { country: 'United Kingdom', headlineBase: 3.0, coreBase: 3.5, target: 2.0 },
  { country: 'Japan', headlineBase: 2.8, coreBase: 2.3, target: 2.0 },
  { country: 'China', headlineBase: 0.3, coreBase: 0.6, target: 3.0 },
  { country: 'India', headlineBase: 5.1, coreBase: 4.3, target: 4.0 },
  { country: 'Brazil', headlineBase: 4.5, coreBase: 3.9, target: 3.0 },
  { country: 'Canada', headlineBase: 2.9, coreBase: 3.2, target: 2.0 },
  { country: 'Australia', headlineBase: 3.4, coreBase: 3.8, target: 2.5 },
  { country: 'Switzerland', headlineBase: 1.4, coreBase: 1.2, target: 2.0 },
  { country: 'Mexico', headlineBase: 4.6, coreBase: 4.1, target: 3.0 },
  { country: 'Turkey', headlineBase: 44.0, coreBase: 40.5, target: 5.0 },
];

// ── Data Generation ──

function generateInflationMonitorData(): InflationMonitorResponse {
  const seed = hashSeed('inflation-monitor-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);

  const jitter = (base: number, spread: number): number =>
    Math.round((base + (rng() - 0.5) * 2 * spread) * 100) / 100;

  const trend = (yoy: number, mom: number): 'rising' | 'falling' | 'stable' => {
    if (mom > 0.25) return 'rising';
    if (mom < -0.1) return 'falling';
    return rng() > 0.5 ? (yoy > 3.0 ? 'rising' : 'stable') : 'stable';
  };

  // ── CPI Breakdown ──
  const components: CpiComponent[] = CPI_COMPONENTS.map(c => {
    const yoy = jitter(c.yoyBase, 0.4);
    const mom = jitter(c.momBase, 0.15);
    return {
      name: c.name,
      weight: c.weight,
      yoy,
      mom,
      trend: trend(yoy, mom),
    };
  });

  const cpiBreakdown: CpiBreakdown = {
    headlineCpi: {
      yoy: jitter(3.2, 0.3),
      mom: jitter(0.3, 0.1),
    },
    coreCpi: {
      yoy: jitter(3.8, 0.3),
      mom: jitter(0.3, 0.08),
    },
    components,
  };

  // ── PPI Data ──
  const ppiData: PpiData = {
    headline: { yoy: jitter(2.2, 0.5), mom: jitter(0.2, 0.15) },
    core: { yoy: jitter(2.5, 0.4), mom: jitter(0.2, 0.1) },
    finalDemandGoods: { yoy: jitter(1.8, 0.5), mom: jitter(0.1, 0.2) },
    finalDemandServices: { yoy: jitter(2.8, 0.4), mom: jitter(0.3, 0.1) },
    intermediateDemand: { yoy: jitter(1.5, 0.6), mom: jitter(0.1, 0.2) },
  };

  // ── PCE Data ──
  const pceData: PceData = {
    headline: { yoy: jitter(2.6, 0.2), mom: jitter(0.3, 0.08) },
    core: { yoy: jitter(2.8, 0.2), mom: jitter(0.3, 0.08) },
    supercore: { yoy: jitter(3.5, 0.3), mom: jitter(0.4, 0.1) },
  };

  // ── Inflation Expectations ──
  const expectation = (base: number, spread: number): ExpectationEntry => ({
    current: jitter(base, spread),
    oneMonthAgo: jitter(base, spread * 1.1),
    threeMonthsAgo: jitter(base, spread * 1.3),
  });

  const inflationExpectations: InflationExpectations = {
    tipsBreakevens: {
      twoYear: expectation(2.35, 0.15),
      fiveYear: expectation(2.30, 0.12),
      tenYear: expectation(2.28, 0.10),
      thirtyYear: expectation(2.32, 0.08),
    },
    fiveYearFiveYearForward: expectation(2.25, 0.10),
    michiganSurvey: {
      oneYear: expectation(4.0, 0.5),
      fiveYear: expectation(3.0, 0.3),
    },
    nyFedSurvey: expectation(3.3, 0.4),
    clevelandFedNowcast: expectation(2.4, 0.2),
  };

  // ── Global Comparison ──
  const globalComparison: GlobalCountry[] = GLOBAL_COUNTRIES.map(c => {
    const spreadFactor = c.country === 'Turkey' ? 3.0 : 0.4;
    const headlineCPI = jitter(c.headlineBase, spreadFactor);
    const coreCPI = jitter(c.coreBase, spreadFactor);
    const gapToTarget = Math.round((headlineCPI - c.target) * 100) / 100;
    let direction: 'above' | 'below' | 'at target';
    if (Math.abs(gapToTarget) <= 0.2) {
      direction = 'at target';
    } else if (gapToTarget > 0) {
      direction = 'above';
    } else {
      direction = 'below';
    }
    return {
      country: c.country,
      headlineCPI,
      coreCPI,
      centralBankTarget: c.target,
      gapToTarget,
      direction,
    };
  });

  // ── Trimmed Means ──
  const trimmedMeans: TrimmedMeans = {
    clevelandTrimmedMeanCPI: jitter(3.3, 0.2),
    clevelandMedianCPI: jitter(4.5, 0.3),
    stickyCPI: jitter(4.8, 0.3),
    flexibleCPI: jitter(1.2, 0.5),
    atlantaFedStickyCPI: jitter(4.6, 0.3),
  };

  return {
    cpiBreakdown,
    ppiData,
    pceData,
    inflationExpectations,
    globalComparison,
    trimmedMeans,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateInflationMonitorData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[InflationMonitor] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate inflation monitor data' });
  }
});

export default router;
