import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

type Regime = 'very-loose' | 'loose' | 'neutral' | 'tight' | 'very-tight';

interface SubComponent {
  name: string;
  value: number;
  zScore: number;
}

interface FCIComponent {
  name: string;
  index: number;
  weight: number;
  contribution: number;
  subComponents: SubComponent[];
}

interface HistoricalFCIEntry {
  date: string;
  value: number;
}

interface StressEvent {
  date: string;
  event: string;
  fciImpact: number;
}

interface RegionFCI {
  region: string;
  code: string;
  fciIndex: number;
  previousDay: number;
  change1d: number;
  change1w: number;
  change1m: number;
  percentile: number;
  regime: Regime;
  components: FCIComponent[];
  historicalFCI: HistoricalFCIEntry[];
  stressEvents: StressEvent[];
}

interface GlobalConditions {
  tightening: number;
  easing: number;
  neutral: number;
}

interface FinancialConditionsData {
  timestamp: string;
  regions: RegionFCI[];
  globalConditions: GlobalConditions;
  policyImplications: string[];
}

// ── Static definitions ──

const REGIONS: { region: string; code: string; biasIndex: number }[] = [
  { region: 'United States', code: 'US', biasIndex: 0.35 },
  { region: 'Eurozone', code: 'EZ', biasIndex: -0.12 },
  { region: 'United Kingdom', code: 'UK', biasIndex: 0.28 },
  { region: 'Japan', code: 'JP', biasIndex: -0.85 },
  { region: 'China', code: 'CN', biasIndex: -0.60 },
  { region: 'Global', code: 'GL', biasIndex: 0.05 },
];

interface ComponentDef {
  name: string;
  weight: number;
  biasIndex: number;
  subComponents: { name: string; baseValue: number; baseZScore: number }[];
}

const US_COMPONENTS: ComponentDef[] = [
  {
    name: 'Interest Rates',
    weight: 0.30,
    biasIndex: 0.45,
    subComponents: [
      { name: 'Fed Funds Rate', baseValue: 4.50, baseZScore: 0.8 },
      { name: '2Y Treasury', baseValue: 4.15, baseZScore: 0.6 },
      { name: '10Y Treasury', baseValue: 4.35, baseZScore: 0.5 },
      { name: 'Real Rate', baseValue: 1.95, baseZScore: 0.9 },
    ],
  },
  {
    name: 'Credit',
    weight: 0.25,
    biasIndex: 0.20,
    subComponents: [
      { name: 'IG Spread', baseValue: 92, baseZScore: -0.3 },
      { name: 'HY Spread', baseValue: 325, baseZScore: -0.1 },
      { name: 'Bank Lending Standards', baseValue: 8.5, baseZScore: 0.4 },
      { name: 'Commercial Paper Spread', baseValue: 18, baseZScore: 0.2 },
    ],
  },
  {
    name: 'Equity',
    weight: 0.20,
    biasIndex: -0.30,
    subComponents: [
      { name: 'S&P 500 Level', baseValue: 6150, baseZScore: -0.8 },
      { name: 'VIX', baseValue: 16.5, baseZScore: -0.2 },
      { name: 'Equity Risk Premium', baseValue: 3.8, baseZScore: 0.1 },
      { name: 'Market Cap/GDP', baseValue: 195, baseZScore: 1.2 },
    ],
  },
  {
    name: 'Currency',
    weight: 0.15,
    biasIndex: 0.35,
    subComponents: [
      { name: 'Trade-Weighted Dollar', baseValue: 106.8, baseZScore: 0.7 },
      { name: 'Real Effective Rate', baseValue: 112.5, baseZScore: 0.5 },
    ],
  },
  {
    name: 'Housing',
    weight: 0.10,
    biasIndex: 0.50,
    subComponents: [
      { name: 'Mortgage Rate', baseValue: 6.85, baseZScore: 1.1 },
      { name: 'Housing Starts', baseValue: 1380, baseZScore: -0.3 },
      { name: 'Home Price Index', baseValue: 322, baseZScore: 0.6 },
    ],
  },
];

const STRESS_EVENTS_POOL: { date: string; event: string; fciImpact: number }[] = [
  { date: '2025-08-05', event: 'Global carry trade unwind; Nikkei circuit breaker', fciImpact: 1.82 },
  { date: '2025-03-10', event: 'SVB anniversary volatility; regional bank stress', fciImpact: 0.95 },
  { date: '2025-11-15', event: 'EM sovereign default contagion fears', fciImpact: 1.25 },
  { date: '2026-01-22', event: 'US debt ceiling standoff; T-bill spike', fciImpact: 1.10 },
  { date: '2026-02-14', event: 'European energy supply disruption', fciImpact: 0.78 },
  { date: '2024-10-27', event: 'Middle East escalation; oil price spike', fciImpact: 1.45 },
  { date: '2025-06-18', event: 'China property developer liquidation wave', fciImpact: 1.35 },
  { date: '2025-09-12', event: 'AI sector earnings miss; tech selloff', fciImpact: 0.88 },
  { date: '2026-03-05', event: 'Surprise Fed hawkish pivot; rates repricing', fciImpact: 1.15 },
  { date: '2025-12-20', event: 'Year-end liquidity squeeze; repo rate spike', fciImpact: 0.72 },
];

const POLICY_IMPLICATIONS_POOL: string[] = [
  'Elevated real rates continue to constrain rate-sensitive sectors, particularly housing and small-cap borrowers.',
  'Credit spreads remain historically tight, suggesting markets are underpricing recession risk.',
  'Loose equity conditions offset monetary tightening, creating a divergent policy transmission picture.',
  'Dollar strength is exporting tightening to EM economies, increasing external funding stress.',
  'The divergence between Fed policy rate and market-implied easing creates potential for a volatility event.',
  'Japanese yield curve control adjustments are beginning to transmit tightening impulses globally.',
  'Chinese easing measures have yet to reflate domestic credit demand, maintaining disinflationary pressure.',
  'Bank lending standards have tightened for 4 consecutive quarters, signaling late-cycle credit dynamics.',
  'Housing affordability remains at multi-decade lows despite moderating price growth.',
  'Global liquidity conditions are bifurcated: DM tightening vs EM selective easing.',
  'Corporate refinancing wall approaching in 2026-2027 will test credit conditions durability.',
  'Equity market concentration risk amplifies the sensitivity of financial conditions to mega-cap earnings.',
  'Treasury term premium normalization is a slow but persistent tightening force on the economy.',
  'Mortgage rate lock-in effect is suppressing housing turnover, distorting shelter CPI.',
];

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function determineRegime(fciIndex: number, percentile: number): Regime {
  if (percentile >= 85) return 'very-tight';
  if (percentile >= 65) return 'tight';
  if (percentile >= 35) return 'neutral';
  if (percentile >= 15) return 'loose';
  return 'very-loose';
}

function generateSubComponents(
  defs: { name: string; baseValue: number; baseZScore: number }[],
  rng: () => number,
  regionJitter: number,
): SubComponent[] {
  return defs.map((d) => {
    const valuePct = 1 + (rng() - 0.5) * 0.08 + regionJitter * 0.02;
    const zJitter = (rng() - 0.5) * 0.6 + regionJitter * 0.3;
    return {
      name: d.name,
      value: round2(d.baseValue * valuePct),
      zScore: round2(d.baseZScore + zJitter),
    };
  });
}

function generateComponents(rng: () => number, regionBias: number): FCIComponent[] {
  return US_COMPONENTS.map((cDef) => {
    const regionJitter = regionBias + (rng() - 0.5) * 0.4;
    const subComponents = generateSubComponents(cDef.subComponents, rng, regionJitter);

    // Component index: weighted average of sub-component z-scores
    const avgZ = subComponents.reduce((sum, s) => sum + s.zScore, 0) / subComponents.length;
    const index = round3(cDef.biasIndex + avgZ * 0.3 + (rng() - 0.5) * 0.15);
    const contribution = round3(index * cDef.weight);

    return {
      name: cDef.name,
      index: round2(index),
      weight: cDef.weight,
      contribution: round3(contribution),
      subComponents,
    };
  });
}

function generateHistoricalFCI(
  baseIndex: number,
  rng: () => number,
): HistoricalFCIEntry[] {
  const entries: HistoricalFCIEntry[] = [];
  const today = new Date();
  let currentValue = baseIndex;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const drift = (rng() - 0.5) * 0.12;
    const meanRevert = (baseIndex - currentValue) * 0.05;
    currentValue = round3(currentValue + drift + meanRevert);

    entries.push({
      date: d.toISOString().slice(0, 10),
      value: round2(currentValue),
    });
  }

  // Ensure we have exactly 30 data points by filling if needed
  while (entries.length < 30) {
    const lastDate = new Date(entries[entries.length - 1].date);
    lastDate.setDate(lastDate.getDate() + 1);
    const dow = lastDate.getDay();
    if (dow === 0) lastDate.setDate(lastDate.getDate() + 1);
    if (dow === 6) lastDate.setDate(lastDate.getDate() + 2);

    const drift = (rng() - 0.5) * 0.08;
    currentValue = round3(currentValue + drift);
    entries.push({
      date: lastDate.toISOString().slice(0, 10),
      value: round2(currentValue),
    });
  }

  return entries.slice(0, 30);
}

function selectStressEvents(rng: () => number): StressEvent[] {
  // Pick 3-5 events from pool
  const count = 3 + Math.floor(rng() * 3);
  const shuffled = [...STRESS_EVENTS_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).sort((a, b) => a.date.localeCompare(b.date));
}

// ── Data generator ──

function generate(): FinancialConditionsData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-financial-conditions'));

  const regions: RegionFCI[] = REGIONS.map((r) => {
    const regionRng = mulberry32(hashSeed(day + '-fci-' + r.code));

    // Generate components
    const components = generateComponents(regionRng, r.biasIndex);

    // Composite FCI index: sum of contributions
    const fciIndex = round2(
      components.reduce((sum, c) => sum + c.contribution, 0),
    );

    // Previous day: slight variation from current
    const previousDay = round2(fciIndex + (regionRng() - 0.5) * 0.08);

    // Changes over different periods
    const change1d = round3(fciIndex - previousDay);
    const change1w = round3((regionRng() - 0.5) * 0.25);
    const change1m = round3((regionRng() - 0.5) * 0.50);

    // Historical percentile based on index level
    // Higher index -> tighter conditions -> higher percentile
    const basePercentile = 50 + fciIndex * 30;
    const percentile = clamp(
      Math.round(basePercentile + (regionRng() - 0.5) * 15),
      1,
      99,
    );

    const regime = determineRegime(fciIndex, percentile);

    // Historical FCI series
    const historicalFCI = generateHistoricalFCI(fciIndex, regionRng);

    // Stress events (shared pool, region-seeded selection)
    const stressEvents = selectStressEvents(regionRng);

    return {
      region: r.region,
      code: r.code,
      fciIndex,
      previousDay,
      change1d,
      change1w,
      change1m,
      percentile,
      regime,
      components,
      historicalFCI,
      stressEvents,
    };
  });

  // Global conditions summary
  let tightening = 0;
  let easing = 0;
  let neutral = 0;
  for (const r of regions) {
    if (r.regime === 'tight' || r.regime === 'very-tight') tightening++;
    else if (r.regime === 'loose' || r.regime === 'very-loose') easing++;
    else neutral++;
  }
  const globalConditions: GlobalConditions = { tightening, easing, neutral };

  // Policy implications: pick 4-6 relevant statements
  const implCount = 4 + Math.floor(rng() * 3);
  const shuffledImpl = [...POLICY_IMPLICATIONS_POOL];
  for (let i = shuffledImpl.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledImpl[i], shuffledImpl[j]] = [shuffledImpl[j], shuffledImpl[i]];
  }
  const policyImplications = shuffledImpl.slice(0, implCount);

  return {
    timestamp: new Date().toISOString(),
    regions,
    globalConditions,
    policyImplications,
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: FinancialConditionsData | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Route ──

// GET /api/financial-conditions
router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FinancialConditions] Error:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate financial conditions data' });
  }
});

export default router;
