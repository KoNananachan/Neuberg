import { Router } from 'express';

const router = Router();

// ── Types ──

interface FactorMomentumEntry {
  factor: string;
  return1M: number;
  return3M: number;
  return6M: number;
  return12M: number;
  momentum: 'strong' | 'moderate' | 'weak' | 'negative';
  rank: number;
  percentile1Y: number;
}

interface RotationSignal {
  fromFactor: string;
  toFactor: string;
  strength: 'strong' | 'moderate' | 'weak';
  catalyst: string;
  expectedAlpha: number;
  timeHorizon: '1M' | '3M' | '6M';
}

interface MacroFactorLink {
  macroIndicator: string;
  current: number;
  change1M: number;
  favoredFactor: string;
  correlation: number;
}

interface FactorValuation {
  factor: string;
  spreadVsHistory: number;
  percentile: number;
  cheap: boolean;
  signal: 'buy' | 'hold' | 'sell';
}

interface CyclicalPosition {
  phase: 'early-cycle' | 'mid-cycle' | 'late-cycle' | 'recession';
  confidence: number;
  favoredFactors: string[];
  avoidFactors: string[];
  monthsInPhase: number;
}

interface BacktestResult {
  strategy: string;
  annualizedReturn: number;
  sharpe: number;
  maxDrawdown: number;
  turnover: number;
  outperformance: number;
}

interface FactorRotationResponse {
  factorMomentum: FactorMomentumEntry[];
  rotationSignals: RotationSignal[];
  macroFactorLink: MacroFactorLink[];
  factorValuations: FactorValuation[];
  cyclicalPosition: CyclicalPosition;
  backtestResults: BacktestResult[];
  generatedAt: string;
}

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ── Constants ──

const FACTOR_NAMES = [
  'Value', 'Growth', 'Momentum', 'Quality',
  'Low Volatility', 'Size', 'Yield', 'Profitability',
] as const;

const VALUATION_FACTORS = [
  'Value', 'Growth', 'Momentum', 'Quality', 'Low Vol', 'Size',
] as const;

// Base annualized return expectations (%) and volatility for each factor
const FACTOR_BASE: Record<string, { ret: number; vol: number }> = {
  'Value':           { ret: 4.5,  vol: 18 },
  'Growth':          { ret: 6.0,  vol: 22 },
  'Momentum':        { ret: 7.5,  vol: 20 },
  'Quality':         { ret: 5.0,  vol: 14 },
  'Low Volatility':  { ret: 3.0,  vol: 10 },
  'Size':            { ret: 3.5,  vol: 24 },
  'Yield':           { ret: 4.0,  vol: 15 },
  'Profitability':   { ret: 5.5,  vol: 16 },
};

const MACRO_INDICATORS: { name: string; baseValue: number; baseVol: number; favoredFactor: string; baseCorrSign: number }[] = [
  { name: 'ISM Manufacturing',  baseValue: 52.0,  baseVol: 4.0,   favoredFactor: 'Value',          baseCorrSign:  1 },
  { name: '10Y Yield',          baseValue: 4.25,   baseVol: 0.50,  favoredFactor: 'Value',          baseCorrSign:  1 },
  { name: 'Credit Spreads',     baseValue: 135,    baseVol: 40,    favoredFactor: 'Quality',        baseCorrSign: -1 },
  { name: 'USD Index',          baseValue: 104.5,  baseVol: 3.0,   favoredFactor: 'Size',           baseCorrSign: -1 },
  { name: 'Oil Price',          baseValue: 78.0,   baseVol: 10.0,  favoredFactor: 'Value',          baseCorrSign:  1 },
  { name: 'VIX',                baseValue: 18.0,   baseVol: 6.0,   favoredFactor: 'Low Volatility', baseCorrSign: -1 },
];

const ROTATION_CATALYSTS = [
  'Rising rates favor value over growth',
  'Earnings deceleration supports quality',
  'Credit tightening favors profitability',
  'Yield curve steepening benefits financials/value',
  'Falling volatility reduces low-vol premium',
  'Dollar weakness supports small caps',
  'ISM expansion favors cyclical/value exposure',
  'Momentum crowding increases reversal risk',
  'Quality spread compression signals risk-on',
  'Growth-value spread mean reversion',
  'Late-cycle dynamics favor defensive quality',
  'Improving breadth supports equal-weight/size',
  'Rising correlations reduce diversification benefit',
  'Earnings revisions favor momentum continuation',
  'Macro uncertainty supports low volatility',
] as const;

const CYCLE_PHASES: { phase: CyclicalPosition['phase']; favored: string[][]; avoid: string[][] }[] = [
  { phase: 'early-cycle',  favored: [['Value', 'Size', 'Momentum'], ['Value', 'Size'], ['Momentum', 'Value', 'Size']], avoid: [['Low Volatility'], ['Low Volatility', 'Yield']] },
  { phase: 'mid-cycle',    favored: [['Momentum', 'Growth', 'Quality'], ['Growth', 'Momentum'], ['Quality', 'Growth', 'Momentum']], avoid: [['Value'], ['Value', 'Yield']] },
  { phase: 'late-cycle',   favored: [['Quality', 'Low Volatility', 'Profitability'], ['Quality', 'Profitability'], ['Low Volatility', 'Quality', 'Yield']], avoid: [['Size', 'Growth'], ['Size']] },
  { phase: 'recession',    favored: [['Low Volatility', 'Quality', 'Yield'], ['Low Volatility', 'Yield'], ['Quality', 'Low Volatility']], avoid: [['Size', 'Value'], ['Growth', 'Size']] },
];

const BACKTEST_STRATEGIES = [
  'Momentum-Based Rotation',
  'Macro-Linked Rotation',
  'Valuation-Based Rotation',
  'Composite Signal',
] as const;

// ── Data generation ──

function generate(): FactorRotationResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('factor-rotation-' + today);
  const rng = mulberry32(seed);

  // 1. Factor Momentum (8 factors)
  const rawMomentum: { factor: string; score: number; r1m: number; r3m: number; r6m: number; r12m: number }[] = [];

  for (const factor of FACTOR_NAMES) {
    const base = FACTOR_BASE[factor];
    // Monthly returns derived from annualized base + randomness
    const r1m = round(clamp(base.ret / 12 + (rng() - 0.5) * (base.vol / 6), -8, 12), 2);
    const r3m = round(clamp(base.ret / 4 + (rng() - 0.5) * (base.vol / 3), -15, 25), 2);
    const r6m = round(clamp(base.ret / 2 + (rng() - 0.5) * (base.vol / 2), -20, 35), 2);
    const r12m = round(clamp(base.ret + (rng() - 0.5) * base.vol, -30, 50), 2);
    // Composite momentum score for ranking
    const score = r1m * 0.4 + r3m * 0.3 + r6m * 0.2 + r12m * 0.1;
    rawMomentum.push({ factor, score, r1m, r3m, r6m, r12m });
  }

  // Sort by composite score descending for ranking
  rawMomentum.sort((a, b) => b.score - a.score);

  const factorMomentum: FactorMomentumEntry[] = rawMomentum.map((entry, idx) => {
    const rank = idx + 1;
    let momentum: 'strong' | 'moderate' | 'weak' | 'negative';
    if (entry.r1m > 2 && entry.r3m > 4) momentum = 'strong';
    else if (entry.r1m > 0 && entry.r3m > 0) momentum = 'moderate';
    else if (entry.r1m > -1 && entry.r3m > -2) momentum = 'weak';
    else momentum = 'negative';

    return {
      factor: entry.factor,
      return1M: entry.r1m,
      return3M: entry.r3m,
      return6M: entry.r6m,
      return12M: entry.r12m,
      momentum,
      rank,
      percentile1Y: round(clamp(rng() * 100, 2, 98), 1),
    };
  });

  // 2. Rotation Signals (5 signals)
  const rotationSignals: RotationSignal[] = [];
  const usedPairs = new Set<string>();

  for (let i = 0; i < 5; i++) {
    // Pick from/to factors ensuring no duplicate pairs
    let fromIdx: number, toIdx: number, pairKey: string;
    do {
      fromIdx = Math.floor(rng() * FACTOR_NAMES.length);
      toIdx = Math.floor(rng() * FACTOR_NAMES.length);
      pairKey = `${fromIdx}-${toIdx}`;
    } while (fromIdx === toIdx || usedPairs.has(pairKey));
    usedPairs.add(pairKey);

    const strengthRoll = rng();
    const strength: 'strong' | 'moderate' | 'weak' =
      strengthRoll < 0.25 ? 'strong' : strengthRoll < 0.65 ? 'moderate' : 'weak';

    const catalystIdx = Math.floor(rng() * ROTATION_CATALYSTS.length);
    const horizonRoll = rng();
    const timeHorizon: '1M' | '3M' | '6M' =
      horizonRoll < 0.3 ? '1M' : horizonRoll < 0.75 ? '3M' : '6M';

    const expectedAlpha = round(clamp(
      (strength === 'strong' ? 100 : strength === 'moderate' ? 50 : 10) + (rng() - 0.5) * 120,
      -50, 200
    ), 0);

    rotationSignals.push({
      fromFactor: FACTOR_NAMES[fromIdx],
      toFactor: FACTOR_NAMES[toIdx],
      strength,
      catalyst: ROTATION_CATALYSTS[catalystIdx],
      expectedAlpha,
      timeHorizon,
    });
  }

  // 3. Macro-Factor Link (6 indicators)
  const macroFactorLink: MacroFactorLink[] = MACRO_INDICATORS.map((indicator) => {
    const current = round(indicator.baseValue + (rng() - 0.5) * 2 * indicator.baseVol, 2);
    const change1M = round((rng() - 0.5) * indicator.baseVol * 0.8, 2);
    const correlation = round(clamp(
      indicator.baseCorrSign * (0.4 + rng() * 0.45),
      -1, 1
    ), 3);

    return {
      macroIndicator: indicator.name,
      current,
      change1M,
      favoredFactor: indicator.favoredFactor,
      correlation,
    };
  });

  // 4. Factor Valuations (6 factors)
  const factorValuations: FactorValuation[] = VALUATION_FACTORS.map((factor) => {
    const spreadVsHistory = round(clamp((rng() - 0.5) * 4.5, -3, 3), 2);
    const percentile = round(clamp(50 + spreadVsHistory * 15 + (rng() - 0.5) * 20, 0, 100), 1);
    const cheap = spreadVsHistory < -0.5;

    let signal: 'buy' | 'hold' | 'sell';
    if (spreadVsHistory < -1.0) signal = 'buy';
    else if (spreadVsHistory > 1.0) signal = 'sell';
    else signal = 'hold';

    return { factor, spreadVsHistory, percentile, cheap, signal };
  });

  // 5. Cyclical Position
  const phaseIdx = Math.floor(rng() * CYCLE_PHASES.length);
  const phaseConfig = CYCLE_PHASES[phaseIdx];
  const favoredIdx = Math.floor(rng() * phaseConfig.favored.length);
  const avoidIdx = Math.floor(rng() * phaseConfig.avoid.length);

  const cyclicalPosition: CyclicalPosition = {
    phase: phaseConfig.phase,
    confidence: round(clamp(0.45 + rng() * 0.50, 0, 1), 2),
    favoredFactors: phaseConfig.favored[favoredIdx],
    avoidFactors: phaseConfig.avoid[avoidIdx],
    monthsInPhase: Math.floor(clamp(1 + rng() * 23, 1, 24)),
  };

  // 6. Backtest Results (4 strategies)
  const backtestResults: BacktestResult[] = BACKTEST_STRATEGIES.map((strategy) => {
    const annualizedReturn = round(clamp(6 + (rng() - 0.3) * 12, 2, 18), 2);
    const sharpe = round(clamp(0.3 + rng() * 1.2, 0.3, 1.5), 2);
    const maxDrawdown = round(clamp(-(8 + rng() * 22), -30, -5), 2);
    const turnover = round(clamp(80 + rng() * 250, 50, 350), 1);
    const outperformance = round(clamp((annualizedReturn - 10) * 100 + (rng() - 0.5) * 200, -300, 500), 0);

    return { strategy, annualizedReturn, sharpe, maxDrawdown, turnover, outperformance };
  });

  return {
    factorMomentum,
    rotationSignals,
    macroFactorLink,
    factorValuations,
    cyclicalPosition,
    backtestResults,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5 min TTL) ──

let cacheData: FactorRotationResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[FactorRotation] Error:', (err as Error).message);
    // Stale fallback
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate factor rotation data' });
  }
});

export default router;
