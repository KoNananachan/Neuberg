import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; } return h; }

// ── Types ──

interface CurveTradeLeg {
  tenor: string;
  direction: 'long' | 'short';
  weight: number;
}

interface CurveTrade {
  name: string;
  type: 'flattener' | 'steepener' | 'butterfly' | 'box';
  legs: CurveTradeLeg[];
  currentSpread: number;
  change1d: number;
  change1w: number;
  carry3m: number;
  rolldown3m: number;
  totalCarry: number;
  zScore: number;
}

interface CarryAnalysisRow {
  tenor: string;
  yieldCurrent: number;
  yield3mFwd: number;
  rollDown: number;
  carry: number;
  totalReturn: number;
  breakeven: number;
}

interface RichCheapRow {
  tenor: string;
  currentYield: number;
  fittedYield: number;
  richCheap: number;
  zScore: number;
  signal: 'rich' | 'fair' | 'cheap';
}

interface ForwardRateRow {
  label: string;
  currentValue: number;
  change1d: number;
  change1w: number;
  impliedHikes: number;
}

interface KeyRateDuration {
  tenor: string;
  exposure: number;
  recommendation: 'overweight' | 'neutral' | 'underweight';
}

interface DurationPositioning {
  stance: 'underweight' | 'neutral' | 'overweight';
  targetDuration: number;
  benchmarkDuration: number;
  durationBet: number;
  keyRateDurations: KeyRateDuration[];
}

interface TradeIdea {
  strategy: string;
  rationale: string;
  entry: string;
  target: string;
  stop: string;
  riskReward: number;
  conviction: 'high' | 'medium' | 'low';
}

interface RatesStrategyResponse {
  curveTrades: CurveTrade[];
  carryAnalysis: CarryAnalysisRow[];
  richCheapAnalysis: RichCheapRow[];
  forwardRateMonitor: ForwardRateRow[];
  durationPositioning: DurationPositioning;
  tradeIdeas: TradeIdea[];
  generatedAt: string;
}

// ── Static configs ──

const CARRY_TENORS = ['2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'] as const;
const RC_TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'] as const;

// Base yield curve anchors (realistic US Treasury environment)
const BASE_YIELDS: Record<string, number> = {
  '1Y': 4.85, '2Y': 4.52, '3Y': 4.35, '5Y': 4.22,
  '7Y': 4.28, '10Y': 4.32, '15Y': 4.42, '20Y': 4.55,
  '25Y': 4.60, '30Y': 4.58,
};

// Duration per tenor (approximate modified duration in years)
const TENOR_DURATION: Record<string, number> = {
  '2Y': 1.9, '3Y': 2.8, '5Y': 4.5, '7Y': 6.1,
  '10Y': 8.2, '15Y': 11.0, '20Y': 13.5, '25Y': 15.2, '30Y': 16.8,
};

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60_000;
let cache: { data: RatesStrategyResponse | null; ts: number } = { data: null, ts: 0 };

// ── Helpers ──

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function yieldForTenor(tenor: string, rng: () => number): number {
  const base = BASE_YIELDS[tenor] ?? 4.30;
  return roundTo(base + (rng() - 0.5) * 0.12, 3);
}

// ── Data generation ──

function generate(): RatesStrategyResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-rates-strategy'));

  // Pre-generate yields for all tenors (shared across sections)
  const yieldMap: Record<string, number> = {};
  for (const t of Object.keys(BASE_YIELDS)) {
    yieldMap[t] = yieldForTenor(t, rng);
  }

  // ── 1. Curve Trades (8) ──

  const curveTradeConfigs: Array<{
    name: string;
    type: CurveTrade['type'];
    legs: CurveTradeLeg[];
    spreadCalc: (ym: Record<string, number>) => number;
  }> = [
    {
      name: '2s10s Flattener',
      type: 'flattener',
      legs: [
        { tenor: '2Y', direction: 'long', weight: 1 },
        { tenor: '10Y', direction: 'short', weight: 1 },
      ],
      spreadCalc: (ym) => roundTo((ym['10Y'] - ym['2Y']) * 100, 1),
    },
    {
      name: '5s30s Steepener',
      type: 'steepener',
      legs: [
        { tenor: '5Y', direction: 'short', weight: 1 },
        { tenor: '30Y', direction: 'long', weight: 1 },
      ],
      spreadCalc: (ym) => roundTo((ym['30Y'] - ym['5Y']) * 100, 1),
    },
    {
      name: '2s5s10s Butterfly',
      type: 'butterfly',
      legs: [
        { tenor: '2Y', direction: 'short', weight: 0.5 },
        { tenor: '5Y', direction: 'long', weight: 1 },
        { tenor: '10Y', direction: 'short', weight: 0.5 },
      ],
      spreadCalc: (ym) => roundTo((2 * ym['5Y'] - ym['2Y'] - ym['10Y']) * 100, 1),
    },
    {
      name: '2s10s30s Butterfly',
      type: 'butterfly',
      legs: [
        { tenor: '2Y', direction: 'short', weight: 0.25 },
        { tenor: '10Y', direction: 'long', weight: 1 },
        { tenor: '30Y', direction: 'short', weight: 0.75 },
      ],
      spreadCalc: (ym) => roundTo((ym['10Y'] - 0.25 * ym['2Y'] - 0.75 * ym['30Y']) * 100, 1),
    },
    {
      name: '2s5s Flattener',
      type: 'flattener',
      legs: [
        { tenor: '2Y', direction: 'long', weight: 1 },
        { tenor: '5Y', direction: 'short', weight: 1 },
      ],
      spreadCalc: (ym) => roundTo((ym['5Y'] - ym['2Y']) * 100, 1),
    },
    {
      name: '10s30s Steepener',
      type: 'steepener',
      legs: [
        { tenor: '10Y', direction: 'short', weight: 1 },
        { tenor: '30Y', direction: 'long', weight: 1 },
      ],
      spreadCalc: (ym) => roundTo((ym['30Y'] - ym['10Y']) * 100, 1),
    },
    {
      name: '5s10s30s Butterfly',
      type: 'butterfly',
      legs: [
        { tenor: '5Y', direction: 'short', weight: 0.5 },
        { tenor: '10Y', direction: 'long', weight: 1 },
        { tenor: '30Y', direction: 'short', weight: 0.5 },
      ],
      spreadCalc: (ym) => roundTo((2 * ym['10Y'] - ym['5Y'] - ym['30Y']) * 100, 1),
    },
    {
      name: '2s5s 10s30s Box',
      type: 'box',
      legs: [
        { tenor: '2Y', direction: 'long', weight: 1 },
        { tenor: '5Y', direction: 'short', weight: 1 },
        { tenor: '10Y', direction: 'short', weight: 1 },
        { tenor: '30Y', direction: 'long', weight: 1 },
      ],
      spreadCalc: (ym) => roundTo(((ym['5Y'] - ym['2Y']) - (ym['30Y'] - ym['10Y'])) * 100, 1),
    },
  ];

  const curveTrades: CurveTrade[] = curveTradeConfigs.map((cfg) => {
    const currentSpread = cfg.spreadCalc(yieldMap);
    const change1d = roundTo((rng() - 0.5) * 4, 1);
    const change1w = roundTo((rng() - 0.5) * 10, 1);
    const carry3m = roundTo((rng() - 0.3) * 8, 1);
    const rolldown3m = roundTo(rng() * 5, 1);
    const totalCarry = roundTo(carry3m + rolldown3m, 1);
    const zScore = roundTo((rng() - 0.5) * 4, 2);

    return {
      name: cfg.name,
      type: cfg.type,
      legs: cfg.legs,
      currentSpread,
      change1d,
      change1w,
      carry3m,
      rolldown3m,
      totalCarry,
      zScore,
    };
  });

  // ── 2. Carry Analysis (10 maturities: 2Y-30Y) ──

  const carryTenors = ['2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'] as const;
  // Use 10 by adding a duplicate-free set; pad with an extra tenor
  const carryTenorsFull = [...carryTenors, '10Y'] as string[];
  // Actually use the specified 10 points: include a synthetic 4Y
  const carryTenorsActual = ['2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'];
  // The spec says 10 maturities 2Y-30Y; we have 9 above. Add 4Y:
  const CARRY_TENOR_SET = ['2Y', '3Y', '4Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'];

  const carryAnalysis: CarryAnalysisRow[] = CARRY_TENOR_SET.map((tenor) => {
    // Current yield
    const yc = yieldMap[tenor] ?? roundTo((yieldMap['3Y'] + yieldMap['5Y']) / 2 + (rng() - 0.5) * 0.04, 3);

    // 3m forward yield: slightly higher (market expects rate path)
    const fwdShift = roundTo((rng() - 0.4) * 0.08, 3);
    const yield3mFwd = roundTo(yc + fwdShift, 3);

    // Roll-down: benefit from rolling down the curve (positive = beneficial)
    const tenorYears = parseInt(tenor) || 10;
    const rollDown = roundTo(Math.max(0, (rng() * 3 + tenorYears * 0.3)), 1);

    // Carry: yield pickup from holding vs funding at front-end
    const fundingRate = yieldMap['2Y'] ?? 4.52;
    const carry = roundTo((yc - fundingRate) * 100 / 4, 1); // quarterly carry in bps

    const totalReturn = roundTo(carry + rollDown, 1);

    // Breakeven: how many bps rates can rise before losing money
    const dur = TENOR_DURATION[tenor] ?? tenorYears * 0.85;
    const breakeven = dur > 0 ? roundTo(totalReturn / dur, 1) : 0;

    return { tenor, yieldCurrent: yc, yield3mFwd, rollDown, carry, totalReturn, breakeven };
  });

  // ── 3. Rich/Cheap Analysis (10 points) ──

  const richCheapAnalysis: RichCheapRow[] = RC_TENORS.map((tenor) => {
    const currentYield = yieldMap[tenor] ?? roundTo(4.30 + (rng() - 0.5) * 0.2, 3);

    // Fitted yield from spline model (close to actual but not exact)
    const deviation = roundTo((rng() - 0.5) * 0.08, 3);
    const fittedYield = roundTo(currentYield - deviation, 3);

    // Rich/cheap in bps: positive = cheap (current yield above fitted)
    const richCheap = roundTo(deviation * 100, 1);

    const zScore = roundTo(richCheap / 3.5, 2);

    let signal: 'rich' | 'fair' | 'cheap';
    if (richCheap > 3) {
      signal = 'cheap';
    } else if (richCheap < -3) {
      signal = 'rich';
    } else {
      signal = 'fair';
    }

    return { tenor, currentYield, fittedYield, richCheap, zScore, signal };
  });

  // ── 4. Forward Rate Monitor ──

  const forwardLabels = ['1y1y', '2y1y', '5y5y', '1y2y', '2y2y'] as const;

  const forwardBaseValues: Record<string, number> = {
    '1y1y': 3.95,
    '2y1y': 3.82,
    '5y5y': 4.15,
    '1y2y': 3.88,
    '2y2y': 3.78,
  };

  const forwardRateMonitor: ForwardRateRow[] = forwardLabels.map((label) => {
    const base = forwardBaseValues[label];
    const currentValue = roundTo(base + (rng() - 0.5) * 0.20, 3);
    const change1d = roundTo((rng() - 0.5) * 0.06, 3);
    const change1w = roundTo((rng() - 0.5) * 0.15, 3);

    // Implied hikes: (forward rate - current fed funds ~5.25) / 0.25
    const fedFunds = 5.25;
    const impliedHikes = roundTo((currentValue - fedFunds) / 0.25, 1);

    return { label, currentValue, change1d, change1w, impliedHikes };
  });

  // ── 5. Duration Positioning ──

  const stanceOptions: DurationPositioning['stance'][] = ['underweight', 'neutral', 'overweight'];
  const stance = pick(rng, stanceOptions);

  const benchmarkDuration = 6.2;
  let durationBet: number;
  if (stance === 'overweight') {
    durationBet = roundTo(rng() * 0.8 + 0.2, 2);
  } else if (stance === 'underweight') {
    durationBet = roundTo(-(rng() * 0.8 + 0.2), 2);
  } else {
    durationBet = roundTo((rng() - 0.5) * 0.3, 2);
  }
  const targetDuration = roundTo(benchmarkDuration + durationBet, 2);

  const krdTenors = ['2Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
  const keyRateDurations: KeyRateDuration[] = krdTenors.map((tenor) => {
    const r = rng();
    let recommendation: KeyRateDuration['recommendation'];
    if (r < 0.33) recommendation = 'overweight';
    else if (r < 0.66) recommendation = 'neutral';
    else recommendation = 'underweight';

    const baseExposure = TENOR_DURATION[tenor] ?? 5;
    const exposureMultiplier = recommendation === 'overweight' ? 1.1 + rng() * 0.15
      : recommendation === 'underweight' ? 0.75 + rng() * 0.15
      : 0.9 + rng() * 0.2;
    const exposure = roundTo(baseExposure * exposureMultiplier / benchmarkDuration, 2);

    return { tenor, exposure, recommendation };
  });

  const durationPositioning: DurationPositioning = {
    stance,
    targetDuration,
    benchmarkDuration,
    durationBet,
    keyRateDurations,
  };

  // ── 6. Trade Ideas (5) ──

  const ideaPool: Array<Omit<TradeIdea, 'riskReward' | 'conviction'>> = [
    {
      strategy: 'Receive 5Y swap vs pay 2Y swap',
      rationale: 'Front-end pricing too many hikes; 2s5s curve should flatten as terminal rate expectations peak',
      entry: '2s5s at -28bp',
      target: '2s5s at -40bp',
      stop: '2s5s at -18bp',
    },
    {
      strategy: 'Long 10Y TIPS breakevens',
      rationale: 'Breakevens underpricing sticky shelter inflation and wage growth persistence',
      entry: '10Y BEI at 2.28%',
      target: '10Y BEI at 2.45%',
      stop: '10Y BEI at 2.18%',
    },
    {
      strategy: '2s10s30s butterfly: sell wings',
      rationale: 'Belly cheapness at 10Y offers positive carry in neutral rate scenario; butterfly trades near 1Y wides',
      entry: 'Fly at -12bp',
      target: 'Fly at -4bp',
      stop: 'Fly at -18bp',
    },
    {
      strategy: 'Short 30Y duration outright',
      rationale: 'Term premium re-pricing has further to run with fiscal issuance accelerating in Q2',
      entry: '30Y at 4.58%',
      target: '30Y at 4.80%',
      stop: '30Y at 4.42%',
    },
    {
      strategy: 'Long 5Y vs short 10Y (5s10s flattener)',
      rationale: '5s10s curve steep relative to realized vol; positive carry and roll-down favor the flattener',
      entry: '5s10s at 10bp',
      target: '5s10s at 2bp',
      stop: '5s10s at 16bp',
    },
    {
      strategy: 'Receive 2Y swap rate',
      rationale: 'Market pricing implies overshoot of terminal rate; front-end offers good risk/reward for duration longs',
      entry: '2Y swap at 4.55%',
      target: '2Y swap at 4.30%',
      stop: '2Y swap at 4.70%',
    },
    {
      strategy: '10s30s steepener',
      rationale: 'Supply pressure at long end from Treasury refunding; pension demand insufficient to absorb issuance',
      entry: '10s30s at 26bp',
      target: '10s30s at 38bp',
      stop: '10s30s at 18bp',
    },
  ];

  // Pick 5 distinct ideas from the pool
  const shuffled = [...ideaPool].sort(() => rng() - 0.5);
  const convictions: TradeIdea['conviction'][] = ['high', 'medium', 'low'];

  const tradeIdeas: TradeIdea[] = shuffled.slice(0, 5).map((idea) => {
    const riskReward = roundTo(1.2 + rng() * 2.3, 1);
    const conviction = pick(rng, convictions);
    return { ...idea, riskReward, conviction };
  });

  return {
    curveTrades,
    carryAnalysis,
    richCheapAnalysis,
    forwardRateMonitor,
    durationPositioning,
    tradeIdeas,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RatesStrategy] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate rates strategy data' });
  }
});

export default router;
