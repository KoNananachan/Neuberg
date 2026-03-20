import { Router } from 'express';

// ── Seeded PRNG ──────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function dateSeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Types ────────────────────────────────────────────────────────────────────
type BreadthSignal = 'bullish' | 'bearish' | 'neutral';
type ExtremeLevel = 'overbought' | 'oversold' | 'neutral';
type OverallSignal = 'strong bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong bearish';

interface AdvanceDecline {
  advances: number;
  declines: number;
  unchanged: number;
  adRatio: number;
  adLine: number;
  adLine5dMA: number;
  adLine20dMA: number;
  netAdvances: number;
  signal: BreadthSignal;
}

interface NewHighsLows {
  newHighs52w: number;
  newLows52w: number;
  hlRatio: number;
  hlDiff: number;
  hlDiff10dMA: number;
  percentNewHighs: number;
  signal: BreadthSignal;
}

interface McClellanOscillator {
  value: number;
  signal: 'overbought' | 'oversold' | 'neutral';
  summationIndex: number;
  zeroCrossings: number;
  trendDirection: 'up' | 'down' | 'flat';
}

interface PercentAboveMA {
  maPeriod: number;
  pctAbove: number;
  previous: number;
  change: number;
  extremeLevel: ExtremeLevel;
  historicalPercentile: number;
}

interface SectorBreadth {
  sector: string;
  advances: number;
  declines: number;
  adRatio: number;
  pctAbove50dMA: number;
  pctAbove200dMA: number;
  breadthThrust: boolean;
}

interface BreadthSummary {
  overallSignal: OverallSignal;
  bullishCount: number;
  bearishCount: number;
  totalIndicators: number;
  keyMessage: string;
}

interface AdvancedBreadthResponse {
  advanceDecline: AdvanceDecline;
  newHighsLows: NewHighsLows;
  mcclellanOscillator: McClellanOscillator;
  percentAboveMovingAverages: PercentAboveMA[];
  sectorBreadth: SectorBreadth[];
  breadthSummary: BreadthSummary;
  timestamp: string;
}

// ── GICS Sectors ─────────────────────────────────────────────────────────────
const GICS_SECTORS = [
  'Information Technology',
  'Health Care',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
];

// ── Typical NYSE constituent counts per sector ──────────────────────────────
const SECTOR_STOCK_COUNTS: Record<string, number> = {
  'Information Technology': 320,
  'Health Care': 380,
  'Financials': 520,
  'Consumer Discretionary': 310,
  'Communication Services': 140,
  'Industrials': 420,
  'Consumer Staples': 180,
  'Energy': 200,
  'Utilities': 160,
  'Real Estate': 210,
  'Materials': 160,
};

// ── Data Generation ──────────────────────────────────────────────────────────
const NYSE_TOTAL_STOCKS = 3000;

function generateAdvanceDecline(rng: () => number): AdvanceDecline {
  // Realistic NYSE breadth: typically 40-60% advance on a normal day
  const advPct = randRange(rng, 0.32, 0.68);
  const unchPct = randRange(rng, 0.02, 0.06);
  const decPct = 1 - advPct - unchPct;

  const advances = Math.round(NYSE_TOTAL_STOCKS * advPct);
  const unchanged = Math.round(NYSE_TOTAL_STOCKS * unchPct);
  const declines = NYSE_TOTAL_STOCKS - advances - unchanged;
  const netAdvances = advances - declines;
  const adRatio = declines > 0 ? round(advances / declines) : 999;

  // Cumulative AD line: simulate a running total seeded by day
  const adLine = Math.round(randRange(rng, -4500, 6500));
  const adLine5dMA = round(adLine + randRange(rng, -800, 800));
  const adLine20dMA = round(adLine + randRange(rng, -2000, 2000));

  let signal: BreadthSignal = 'neutral';
  if (adRatio > 1.5 && netAdvances > 400) signal = 'bullish';
  else if (adRatio < 0.65 && netAdvances < -400) signal = 'bearish';

  return {
    advances,
    declines,
    unchanged,
    adRatio,
    adLine,
    adLine5dMA,
    adLine20dMA,
    netAdvances,
    signal,
  };
}

function generateNewHighsLows(rng: () => number): NewHighsLows {
  // NYSE typically sees 30-250 new highs, 10-150 new lows per day
  const newHighs52w = randInt(rng, 25, 280);
  const newLows52w = randInt(rng, 8, 160);
  const hlDiff = newHighs52w - newLows52w;
  const hlRatio = newLows52w > 0 ? round(newHighs52w / newLows52w) : 999;
  const hlDiff10dMA = round(hlDiff * randRange(rng, 0.7, 1.3));
  const percentNewHighs = round((newHighs52w / NYSE_TOTAL_STOCKS) * 100);

  let signal: BreadthSignal = 'neutral';
  if (hlRatio > 3.0 && newHighs52w > 100) signal = 'bullish';
  else if (hlRatio < 0.5 && newLows52w > 80) signal = 'bearish';

  return {
    newHighs52w,
    newLows52w,
    hlRatio,
    hlDiff,
    hlDiff10dMA,
    percentNewHighs,
    signal,
  };
}

function generateMcClellan(rng: () => number): McClellanOscillator {
  // McClellan Oscillator typically ranges -150 to +150
  const value = round(randRange(rng, -150, 150));
  const summationIndex = Math.round(randRange(rng, -2000, 3500));
  const zeroCrossings = randInt(rng, 2, 12);

  let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  if (value > 80) signal = 'overbought';
  else if (value < -80) signal = 'oversold';

  let trendDirection: 'up' | 'down' | 'flat' = 'flat';
  if (summationIndex > 500) trendDirection = 'up';
  else if (summationIndex < -500) trendDirection = 'down';

  return {
    value,
    signal,
    summationIndex,
    zeroCrossings,
    trendDirection,
  };
}

function generatePercentAboveMA(rng: () => number): PercentAboveMA[] {
  const periods = [20, 50, 100, 200];

  return periods.map((maPeriod) => {
    // Shorter MAs tend to have more volatile readings
    const volatilityFactor = maPeriod <= 50 ? 1.2 : 0.9;
    const basePct = randRange(rng, 20, 80);
    const pctAbove = round(Math.max(5, Math.min(95, basePct * volatilityFactor)));
    const previous = round(pctAbove + randRange(rng, -8, 8));
    const change = round(pctAbove - previous);
    const historicalPercentile = round(randRange(rng, 5, 95));

    let extremeLevel: ExtremeLevel = 'neutral';
    if (pctAbove > 75) extremeLevel = 'overbought';
    else if (pctAbove < 25) extremeLevel = 'oversold';

    return {
      maPeriod,
      pctAbove,
      previous,
      change,
      extremeLevel,
      historicalPercentile,
    };
  });
}

function generateSectorBreadth(rng: () => number): SectorBreadth[] {
  return GICS_SECTORS.map((sector) => {
    const sectorRng = mulberry32(hashSeed(sector) + Math.floor(rng() * 10000));
    const total = SECTOR_STOCK_COUNTS[sector] || 200;

    const advPct = randRange(sectorRng, 0.28, 0.72);
    const advances = Math.round(total * advPct);
    const declines = total - advances;
    const adRatio = declines > 0 ? round(advances / declines) : 999;

    const pctAbove50dMA = round(randRange(sectorRng, 15, 85));
    const pctAbove200dMA = round(randRange(sectorRng, 20, 80));

    // Breadth thrust: when >61.5% of sector advances from below 40% in 10 days
    const breadthThrust = advPct > 0.615 && sectorRng() > 0.7;

    return {
      sector,
      advances,
      declines,
      adRatio,
      pctAbove50dMA,
      pctAbove200dMA,
      breadthThrust,
    };
  });
}

function generateBreadthSummary(
  ad: AdvanceDecline,
  hl: NewHighsLows,
  mcClellan: McClellanOscillator,
  pctAboveMAs: PercentAboveMA[],
  sectors: SectorBreadth[],
): BreadthSummary {
  let bullishCount = 0;
  let bearishCount = 0;
  const totalIndicators = 8;

  // 1. AD ratio signal
  if (ad.signal === 'bullish') bullishCount++;
  else if (ad.signal === 'bearish') bearishCount++;

  // 2. New highs/lows signal
  if (hl.signal === 'bullish') bullishCount++;
  else if (hl.signal === 'bearish') bearishCount++;

  // 3. McClellan above zero = bullish momentum
  if (mcClellan.value > 20) bullishCount++;
  else if (mcClellan.value < -20) bearishCount++;

  // 4. Summation index trend
  if (mcClellan.trendDirection === 'up') bullishCount++;
  else if (mcClellan.trendDirection === 'down') bearishCount++;

  // 5. Pct above 50d MA
  const pct50 = pctAboveMAs.find((m) => m.maPeriod === 50);
  if (pct50 && pct50.pctAbove > 60) bullishCount++;
  else if (pct50 && pct50.pctAbove < 40) bearishCount++;

  // 6. Pct above 200d MA
  const pct200 = pctAboveMAs.find((m) => m.maPeriod === 200);
  if (pct200 && pct200.pctAbove > 60) bullishCount++;
  else if (pct200 && pct200.pctAbove < 40) bearishCount++;

  // 7. Sector breadth thrusts
  const thrustCount = sectors.filter((s) => s.breadthThrust).length;
  if (thrustCount >= 4) bullishCount++;
  else if (thrustCount === 0) bearishCount++;

  // 8. AD line vs moving averages
  if (ad.adLine > ad.adLine5dMA && ad.adLine5dMA > ad.adLine20dMA) bullishCount++;
  else if (ad.adLine < ad.adLine5dMA && ad.adLine5dMA < ad.adLine20dMA) bearishCount++;

  let overallSignal: OverallSignal;
  if (bullishCount >= 7) overallSignal = 'strong bullish';
  else if (bullishCount >= 5) overallSignal = 'bullish';
  else if (bearishCount >= 7) overallSignal = 'strong bearish';
  else if (bearishCount >= 5) overallSignal = 'bearish';
  else overallSignal = 'neutral';

  const messages: Record<OverallSignal, string> = {
    'strong bullish':
      'Broad-based buying across sectors with strong AD line expansion and rising new highs. Market breadth confirms uptrend.',
    bullish:
      'Majority of breadth indicators favor the upside. AD line and new highs trending positively.',
    neutral:
      'Mixed breadth signals. Advance-decline and momentum indicators diverge. Monitor for directional confirmation.',
    bearish:
      'Breadth deterioration underway. Declining new highs, weakening AD line, and narrowing participation.',
    'strong bearish':
      'Widespread selling pressure. AD line declining sharply, new lows expanding, and breadth thrust absent across sectors.',
  };

  return {
    overallSignal,
    bullishCount,
    bearishCount,
    totalIndicators,
    keyMessage: messages[overallSignal],
  };
}

function generateAdvancedBreadth(): AdvancedBreadthResponse {
  const now = new Date();
  const seed = dateSeed(now);
  const rng = mulberry32(seed + hashSeed('market-breadth-advanced'));

  const advanceDecline = generateAdvanceDecline(rng);
  const newHighsLows = generateNewHighsLows(rng);
  const mcclellanOscillator = generateMcClellan(rng);
  const percentAboveMovingAverages = generatePercentAboveMA(rng);
  const sectorBreadth = generateSectorBreadth(rng);
  const breadthSummary = generateBreadthSummary(
    advanceDecline,
    newHighsLows,
    mcclellanOscillator,
    percentAboveMovingAverages,
    sectorBreadth,
  );

  return {
    advanceDecline,
    newHighsLows,
    mcclellanOscillator,
    percentAboveMovingAverages,
    sectorBreadth,
    breadthSummary,
    timestamp: now.toISOString(),
  };
}

// ── Cache ────────────────────────────────────────────────────────────────────
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes
let cache: AdvancedBreadthResponse | null = null;
let cacheTime = 0;

// ── Router ───────────────────────────────────────────────────────────────────
const router = Router();

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    cache = generateAdvancedBreadth();
    cacheTime = now;
    res.json(cache);
  } catch (err) {
    console.error('[MarketBreadthAdvanced] Error:', err instanceof Error ? err.message : err);
    // Stale fallback
    if (cache) return res.json(cache);
    res.status(503).json({ error: 'Advanced market breadth data temporarily unavailable' });
  }
});

export default router;
