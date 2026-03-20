import { Router } from 'express';

const router = Router();

// ── PRNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Types ──

type RegimeQuadrant = 'goldilocks' | 'reflation' | 'stagflation' | 'deflation';
type Direction = 'rising' | 'falling' | 'flat';
type Signal = 'expansion' | 'contraction' | 'neutral';
type CyclePhase = 'hiking' | 'holding' | 'cutting';
type AllocationWeight = 'overweight' | 'neutral' | 'underweight';
type ProbTrend = 'rising' | 'falling' | 'stable';

interface CurrentRegime {
  quadrant: RegimeQuadrant;
  growthMomentum: number;
  inflationMomentum: number;
  confidence: number;
  regimeAge: number;
  previousRegime: RegimeQuadrant;
}

interface LeadingIndicator {
  name: string;
  currentValue: number;
  previousValue: number;
  direction: Direction;
  signal: Signal;
  weight: number;
}

interface PolicyCycleEntry {
  bank: string;
  currentRate: number;
  nextExpected: number;
  cyclePhase: CyclePhase;
  marketPricing: number;
  dovishHawkish: number;
}

interface RegimeHistoryEntry {
  quarter: string;
  regime: RegimeQuadrant;
  growthScore: number;
  inflationScore: number;
  bestAssetClass: string;
  worstAssetClass: string;
}

interface AllocationSignalEntry {
  assetClass: string;
  weight: AllocationWeight;
  conviction: number;
}

interface RecessionProbability {
  currentProb: number;
  model: string;
  trend: ProbTrend;
  timeHorizon: string;
  historicalAccuracy: number;
}

interface MacroRegimeMonitorData {
  timestamp: string;
  currentRegime: CurrentRegime;
  leadingIndicators: LeadingIndicator[];
  policyCycle: PolicyCycleEntry[];
  regimeHistory: RegimeHistoryEntry[];
  assetAllocationSignal: AllocationSignalEntry[];
  recessionProbability: RecessionProbability;
}

// ── Static definitions ──

const QUADRANTS: RegimeQuadrant[] = ['goldilocks', 'reflation', 'stagflation', 'deflation'];

const INDICATOR_DEFS: { name: string; baseCurrent: number; baseWeight: number; unit: string }[] = [
  { name: 'ISM New Orders', baseCurrent: 52.3, baseWeight: 12, unit: 'idx' },
  { name: 'Building Permits', baseCurrent: 1480, baseWeight: 8, unit: 'k' },
  { name: 'Initial Claims', baseCurrent: 218, baseWeight: 10, unit: 'k' },
  { name: 'Yield Curve (10Y-2Y)', baseCurrent: 0.35, baseWeight: 15, unit: 'pct' },
  { name: 'LEI MoM', baseCurrent: -0.2, baseWeight: 11, unit: 'pct' },
  { name: 'Consumer Confidence', baseCurrent: 104.7, baseWeight: 9, unit: 'idx' },
  { name: 'PMI New Export Orders', baseCurrent: 49.8, baseWeight: 8, unit: 'idx' },
  { name: 'Credit Impulse', baseCurrent: 1.2, baseWeight: 10, unit: 'pct' },
  { name: 'M2 Growth YoY', baseCurrent: 3.8, baseWeight: 9, unit: 'pct' },
  { name: 'OECD CLI', baseCurrent: 100.3, baseWeight: 8, unit: 'idx' },
];

const BANK_DEFS: { bank: string; baseRate: number; biasPhase: CyclePhase; biasScore: number }[] = [
  { bank: 'Fed', baseRate: 4.50, biasPhase: 'holding', biasScore: 15 },
  { bank: 'ECB', baseRate: 3.15, biasPhase: 'cutting', biasScore: -25 },
  { bank: 'BOJ', baseRate: 0.50, biasPhase: 'hiking', biasScore: 35 },
  { bank: 'PBOC', baseRate: 3.10, biasPhase: 'cutting', biasScore: -40 },
  { bank: 'BOE', baseRate: 4.50, biasPhase: 'cutting', biasScore: -15 },
  { bank: 'RBA', baseRate: 4.10, biasPhase: 'holding', biasScore: 5 },
];

const ASSET_CLASSES = ['Equities', 'Treasuries', 'Commodities', 'Gold', 'Credit', 'Cash', 'Real Estate', 'TIPS'];

const QUARTER_LABELS = [
  'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025',
  'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026',
];

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Data generator ──

function generate(): MacroRegimeMonitorData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-macro-regime-monitor'));

  // 1. Current Regime
  const quadrant = pick(QUADRANTS, rng);
  const growthMomentum = Math.round((rng() - 0.5) * 200); // -100 to +100
  const inflationMomentum = Math.round((rng() - 0.5) * 200);
  const confidence = Math.round(45 + rng() * 50); // 45-95
  const regimeAge = Math.round(15 + rng() * 180); // 15-195 days
  const previousOptions = QUADRANTS.filter((q) => q !== quadrant);
  const previousRegime = pick(previousOptions, rng);

  const currentRegime: CurrentRegime = {
    quadrant,
    growthMomentum: clamp(growthMomentum, -100, 100),
    inflationMomentum: clamp(inflationMomentum, -100, 100),
    confidence,
    regimeAge,
    previousRegime,
  };

  // 2. Leading Indicators (10)
  const leadingIndicators: LeadingIndicator[] = INDICATOR_DEFS.map((def) => {
    const jitter = (rng() - 0.5) * 2;
    let currentValue: number;
    let previousValue: number;

    switch (def.unit) {
      case 'pct':
        currentValue = round2(def.baseCurrent + jitter * 0.8);
        previousValue = round2(currentValue + (rng() - 0.5) * 0.6);
        break;
      case 'k':
        currentValue = Math.round(def.baseCurrent * (1 + (rng() - 0.5) * 0.1));
        previousValue = Math.round(currentValue * (1 + (rng() - 0.5) * 0.06));
        break;
      default: // idx
        currentValue = round1(def.baseCurrent + jitter * 2.5);
        previousValue = round1(currentValue + (rng() - 0.5) * 3);
        break;
    }

    const delta = currentValue - previousValue;
    const threshold = Math.abs(currentValue) * 0.005;
    let direction: Direction;
    if (Math.abs(delta) < threshold) direction = 'flat';
    else direction = delta > 0 ? 'rising' : 'falling';

    // Signal logic varies by indicator type
    let signal: Signal;
    const isInversed = def.name === 'Initial Claims'; // higher claims = contraction
    if (direction === 'flat') {
      signal = 'neutral';
    } else if (isInversed) {
      signal = direction === 'rising' ? 'contraction' : 'expansion';
    } else {
      // For most indicators: rising = expansion, falling = contraction
      // Threshold check around neutral values
      if (def.unit === 'idx' && currentValue < 50) {
        signal = 'contraction';
      } else if (def.unit === 'idx' && currentValue > 50) {
        signal = direction === 'rising' ? 'expansion' : 'neutral';
      } else {
        signal = direction === 'rising' ? 'expansion' : 'contraction';
      }
    }

    const weight = round1(def.baseWeight * (0.85 + rng() * 0.3));

    return { name: def.name, currentValue, previousValue, direction, signal, weight };
  });

  // 3. Policy Cycle (6 central banks)
  const policyCycle: PolicyCycleEntry[] = BANK_DEFS.map((def) => {
    const rateJitter = (rng() - 0.5) * 0.5;
    const currentRate = round2(def.baseRate + rateJitter * 0.25);

    // Next expected rate depends on cycle phase
    let nextExpected: number;
    const phaseRoll = rng();
    let cyclePhase: CyclePhase;
    if (phaseRoll < 0.15) {
      cyclePhase = def.biasPhase === 'cutting' ? 'cutting' : 'hiking';
    } else if (phaseRoll < 0.4) {
      cyclePhase = 'holding';
    } else {
      cyclePhase = def.biasPhase;
    }

    switch (cyclePhase) {
      case 'hiking':
        nextExpected = round2(currentRate + 0.25);
        break;
      case 'cutting':
        nextExpected = round2(currentRate - 0.25);
        break;
      default:
        nextExpected = currentRate;
        break;
    }

    // Market pricing: implied rate from next meeting OIS
    const pricingOffset = (rng() - 0.5) * 0.15;
    const marketPricing = round2(nextExpected + pricingOffset);

    // Dovish/Hawkish score: -100 (very dovish) to +100 (very hawkish)
    const biasJitter = (rng() - 0.5) * 40;
    const dovishHawkish = clamp(Math.round(def.biasScore + biasJitter), -100, 100);

    return { bank: def.bank, currentRate, nextExpected, cyclePhase, marketPricing, dovishHawkish };
  });

  // 4. Regime History (8 quarters)
  const regimeHistory: RegimeHistoryEntry[] = QUARTER_LABELS.map((quarter) => {
    const regime = pick(QUADRANTS, rng);
    const growthScore = Math.round(20 + rng() * 70); // 20-90
    const inflationScore = Math.round(15 + rng() * 75); // 15-90

    // Best/worst asset class varies by regime
    const bestIdx = Math.floor(rng() * ASSET_CLASSES.length);
    let worstIdx = Math.floor(rng() * ASSET_CLASSES.length);
    if (worstIdx === bestIdx) worstIdx = (worstIdx + 1) % ASSET_CLASSES.length;

    return {
      quarter,
      regime,
      growthScore,
      inflationScore,
      bestAssetClass: ASSET_CLASSES[bestIdx],
      worstAssetClass: ASSET_CLASSES[worstIdx],
    };
  });

  // 5. Asset Allocation Signal
  const ALLOC_CLASSES: { name: string; regimeBias: Record<RegimeQuadrant, AllocationWeight> }[] = [
    {
      name: 'equities',
      regimeBias: { goldilocks: 'overweight', reflation: 'neutral', stagflation: 'underweight', deflation: 'underweight' },
    },
    {
      name: 'bonds',
      regimeBias: { goldilocks: 'neutral', reflation: 'underweight', stagflation: 'underweight', deflation: 'overweight' },
    },
    {
      name: 'commodities',
      regimeBias: { goldilocks: 'neutral', reflation: 'overweight', stagflation: 'overweight', deflation: 'underweight' },
    },
    {
      name: 'cash',
      regimeBias: { goldilocks: 'underweight', reflation: 'underweight', stagflation: 'neutral', deflation: 'neutral' },
    },
    {
      name: 'realAssets',
      regimeBias: { goldilocks: 'neutral', reflation: 'overweight', stagflation: 'neutral', deflation: 'underweight' },
    },
  ];

  const assetAllocationSignal: AllocationSignalEntry[] = ALLOC_CLASSES.map((ac) => {
    const baseWeight = ac.regimeBias[quadrant];

    // Occasionally flip to adjacent weight for realism
    let weight: AllocationWeight = baseWeight;
    if (rng() < 0.2) {
      const options: AllocationWeight[] = ['overweight', 'neutral', 'underweight'];
      const currentIdx = options.indexOf(baseWeight);
      const shift = rng() < 0.5 ? -1 : 1;
      const newIdx = clamp(currentIdx + shift, 0, 2);
      weight = options[newIdx];
    }

    const conviction = Math.round(30 + rng() * 65); // 30-95

    return { assetClass: ac.name, weight, conviction };
  });

  // 6. Recession Probability
  const models = [
    'Yield curve + LEI composite',
    'Term spread + initial claims',
    'Probit model (10Y-3M spread)',
    'Multi-factor Bayesian (LEI + credit)',
  ];
  const horizons = ['6 months', '12 months'] as const;

  const baseProb = quadrant === 'stagflation' ? 45 : quadrant === 'deflation' ? 55 : quadrant === 'reflation' ? 20 : 15;
  const probJitter = (rng() - 0.5) * 20;
  const currentProb = clamp(Math.round(baseProb + probJitter), 2, 85);

  const trendOptions: ProbTrend[] = ['rising', 'falling', 'stable'];
  const trend = pick(trendOptions, rng);
  const historicalAccuracy = Math.round(68 + rng() * 22); // 68-90%

  const recessionProbability: RecessionProbability = {
    currentProb,
    model: pick(models, rng),
    trend,
    timeHorizon: pick(horizons, rng),
    historicalAccuracy,
  };

  return {
    timestamp: new Date().toISOString(),
    currentRegime,
    leadingIndicators,
    policyCycle,
    regimeHistory,
    assetAllocationSignal,
    recessionProbability,
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: MacroRegimeMonitorData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 12 * 60 * 60 * 1000;

// ── Route ──

// GET /api/macro-regime-monitor
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
    console.error('[MacroRegimeMonitor] Error:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate macro regime monitor data' });
  }
});

export default router;
