import { Router } from 'express';

// ── Seeded PRNG ──────────────────────────────────────────────────────────────
function mulberry32(a: number): () => number {
  return () => {
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
interface ExchangeAD {
  advances: number;
  declines: number;
  unchanged: number;
  adRatio: number;
  adLine: number;
  adLine5DMA: number;
}

interface AdvanceDeclineData {
  sp500: ExchangeAD;
  nasdaq: ExchangeAD;
  nyse: ExchangeAD;
  russell2000: ExchangeAD;
}

interface ExchangeHL {
  newHighs: number;
  newLows: number;
  netNewHighs: number;
}

interface NewHighsLowsData {
  fiftyTwoWeek: {
    sp500: ExchangeHL;
    nasdaq: ExchangeHL;
    nyse: ExchangeHL;
  };
  twentyDay: {
    sp500: ExchangeHL;
    nasdaq: ExchangeHL;
    nyse: ExchangeHL;
  };
}

interface BreadthIndicators {
  mcClellanOscillator: number;
  mcClellanSummationIndex: number;
  percentAbove200DMA: number;
  percentAbove50DMA: number;
  percentAbove20DMA: number;
  bullishPercent: number;
}

interface SectorBreadthEntry {
  sector: string;
  advancePct: number;
  abv50DMA: number;
  abv200DMA: number;
  rsRank: number;
  avgReturn1W: number;
}

interface MarketInternals {
  upVolume: number;
  downVolume: number;
  upDownVolumeRatio: number;
  tickIndex: number;
  trinArms: number;
  vwapSpx: number;
}

interface ThrustIndicators {
  zwiegBreadthThrust: 'active' | 'not active';
  breadthThrustDate: string | null;
  daysSinceThrust: number;
  washoutLevel: boolean;
}

interface MovingAverages {
  sp500VsMa200: 'above' | 'below' | 'at';
  nasdaqVsMa200: 'above' | 'below' | 'at';
  percentSP500InUptrend: number;
  goldenCrossCount: number;
  deathCrossCount: number;
}

type BreadthSignal = 'bullish' | 'neutral' | 'bearish';

interface HistoricalComparison {
  currentBreadthPercentile: number;
  avgBreadthBullMarket: number;
  avgBreadthBearMarket: number;
  signal: BreadthSignal;
}

type OverallBreadth = 'strong' | 'moderate' | 'weak' | 'deteriorating';

interface BreadthSummary {
  overallBreadth: OverallBreadth;
  adRatio: number;
  netNewHighs: number;
  breadthSignal: BreadthSignal;
  keyLevel: string;
}

interface MarketBreadthResponse {
  advanceDecline: AdvanceDeclineData;
  newHighsLows: NewHighsLowsData;
  breadthIndicators: BreadthIndicators;
  sectorBreadth: SectorBreadthEntry[];
  marketInternals: MarketInternals;
  thrustIndicators: ThrustIndicators;
  movingAverages: MovingAverages;
  historicalComparison: HistoricalComparison;
  summary: BreadthSummary;
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

// ── Exchange stock counts ────────────────────────────────────────────────────
const EXCHANGE_COUNTS: Record<string, number> = {
  sp500: 500,
  nasdaq: 3400,
  nyse: 3200,
  russell2000: 2000,
};

// ── Data Generation ──────────────────────────────────────────────────────────
function generateExchangeAD(rng: () => number, total: number): ExchangeAD {
  const advPct = randRange(rng, 0.35, 0.65);
  const unchPct = randRange(rng, 0.02, 0.06);
  const advances = Math.round(total * advPct);
  const unchanged = Math.round(total * unchPct);
  const declines = total - advances - unchanged;
  const adRatio = declines > 0 ? round(advances / declines) : 999;
  const adLine = Math.round(randRange(rng, -3000, 5000));
  const adLine5DMA = round(adLine + randRange(rng, -600, 600));

  return { advances, declines, unchanged, adRatio, adLine, adLine5DMA };
}

function generateAdvanceDecline(rng: () => number): AdvanceDeclineData {
  return {
    sp500: generateExchangeAD(rng, EXCHANGE_COUNTS.sp500),
    nasdaq: generateExchangeAD(rng, EXCHANGE_COUNTS.nasdaq),
    nyse: generateExchangeAD(rng, EXCHANGE_COUNTS.nyse),
    russell2000: generateExchangeAD(rng, EXCHANGE_COUNTS.russell2000),
  };
}

function generateExchangeHL(rng: () => number, total: number): ExchangeHL {
  const highPct = randRange(rng, 0.02, 0.12);
  const lowPct = randRange(rng, 0.01, 0.06);
  const newHighs = Math.round(total * highPct);
  const newLows = Math.round(total * lowPct);
  return { newHighs, newLows, netNewHighs: newHighs - newLows };
}

function generateNewHighsLows(rng: () => number): NewHighsLowsData {
  return {
    fiftyTwoWeek: {
      sp500: generateExchangeHL(rng, EXCHANGE_COUNTS.sp500),
      nasdaq: generateExchangeHL(rng, EXCHANGE_COUNTS.nasdaq),
      nyse: generateExchangeHL(rng, EXCHANGE_COUNTS.nyse),
    },
    twentyDay: {
      sp500: generateExchangeHL(rng, EXCHANGE_COUNTS.sp500),
      nasdaq: generateExchangeHL(rng, EXCHANGE_COUNTS.nasdaq),
      nyse: generateExchangeHL(rng, EXCHANGE_COUNTS.nyse),
    },
  };
}

function generateBreadthIndicators(rng: () => number): BreadthIndicators {
  // McClellan oscillator typically ranges -150 to +150, healthy market -50 to +100
  const mcClellanOscillator = round(randRange(rng, -80, 110));
  // Summation index: cumulative, ranges widely
  const mcClellanSummationIndex = Math.round(randRange(rng, -1200, 3000));
  // Healthy market: 65-80% above 200DMA
  const percentAbove200DMA = round(randRange(rng, 45, 82));
  const percentAbove50DMA = round(randRange(rng, 40, 85));
  const percentAbove20DMA = round(randRange(rng, 35, 88));
  // Bullish percent: healthy ~55-70%
  const bullishPercent = round(randRange(rng, 42, 75));

  return {
    mcClellanOscillator,
    mcClellanSummationIndex,
    percentAbove200DMA,
    percentAbove50DMA,
    percentAbove20DMA,
    bullishPercent,
  };
}

function generateSectorBreadth(rng: () => number): SectorBreadthEntry[] {
  // Generate raw data for ranking
  const rawSectors = GICS_SECTORS.map((sector) => {
    const sectorRng = mulberry32(hashSeed(sector) + Math.floor(rng() * 10000));
    const advancePct = round(randRange(sectorRng, 35, 78));
    const abv50DMA = round(randRange(sectorRng, 30, 85));
    const abv200DMA = round(randRange(sectorRng, 35, 80));
    const avgReturn1W = round(randRange(sectorRng, -3.5, 4.5));
    // rsRank placeholder — will assign after sorting
    return { sector, advancePct, abv50DMA, abv200DMA, rsRank: 0, avgReturn1W };
  });

  // Assign relative strength rank 1-11 based on avgReturn1W (1 = strongest)
  const sorted = rawSectors.slice().sort((a, b) => b.avgReturn1W - a.avgReturn1W);
  sorted.forEach((entry, idx) => {
    entry.rsRank = idx + 1;
  });

  // Return in original GICS order
  return rawSectors;
}

function generateMarketInternals(rng: () => number): MarketInternals {
  // Volume in billions
  const upVolume = round(randRange(rng, 1.2, 4.8));
  const downVolume = round(randRange(rng, 0.8, 3.5));
  const upDownVolumeRatio = round(upVolume / downVolume);
  const tickIndex = randInt(rng, -600, 800);
  // TRIN/Arms: <1 bullish, >1 bearish, typical 0.5-2.5
  const trinArms = round(randRange(rng, 0.45, 2.2));
  // SPX VWAP: realistic range around current SPX levels
  const vwapSpx = round(randRange(rng, 5100, 5800));

  return { upVolume, downVolume, upDownVolumeRatio, tickIndex, trinArms, vwapSpx };
}

function generateThrustIndicators(rng: () => number): ThrustIndicators {
  // Zweig Breadth Thrust: rare signal, only active ~10% of the time
  const isActive = rng() < 0.1;
  const daysSinceThrust = isActive ? randInt(rng, 0, 5) : randInt(rng, 30, 500);

  let breadthThrustDate: string | null = null;
  if (daysSinceThrust < 365) {
    const d = new Date();
    d.setDate(d.getDate() - daysSinceThrust);
    breadthThrustDate = d.toISOString().slice(0, 10);
  }

  // Washout: oversold condition where breadth collapses
  const washoutLevel = rng() < 0.08;

  return {
    zwiegBreadthThrust: isActive ? 'active' : 'not active',
    breadthThrustDate,
    daysSinceThrust,
    washoutLevel,
  };
}

function generateMovingAverages(rng: () => number): MovingAverages {
  const maStates = ['above', 'below', 'at'] as const;
  // Weighted pick: 'above' ~50%, 'below' ~40%, 'at' ~10%
  function pickMaState(r: () => number): 'above' | 'below' | 'at' {
    const v = r();
    if (v < 0.5) return 'above';
    if (v < 0.9) return 'below';
    return 'at';
  }

  const sp500VsMa200 = pickMaState(rng);
  const nasdaqVsMa200 = pickMaState(rng);
  const percentSP500InUptrend = round(randRange(rng, 40, 80));
  const goldenCrossCount = randInt(rng, 180, 320);
  const deathCrossCount = randInt(rng, 80, 220);

  return { sp500VsMa200, nasdaqVsMa200, percentSP500InUptrend, goldenCrossCount, deathCrossCount };
}

function generateHistoricalComparison(rng: () => number): HistoricalComparison {
  const currentBreadthPercentile = round(randRange(rng, 10, 95));
  const avgBreadthBullMarket = round(randRange(rng, 62, 78));
  const avgBreadthBearMarket = round(randRange(rng, 28, 45));

  let signal: BreadthSignal = 'neutral';
  if (currentBreadthPercentile > 65) signal = 'bullish';
  else if (currentBreadthPercentile < 35) signal = 'bearish';

  return { currentBreadthPercentile, avgBreadthBullMarket, avgBreadthBearMarket, signal };
}

function generateSummary(
  ad: AdvanceDeclineData,
  indicators: BreadthIndicators,
  hl: NewHighsLowsData,
  hist: HistoricalComparison,
): BreadthSummary {
  // Use NYSE as the primary breadth gauge
  const adRatio = ad.nyse.adRatio;
  const netNewHighs = hl.fiftyTwoWeek.nyse.netNewHighs;

  // Determine overall breadth quality
  let bullishPoints = 0;
  let bearishPoints = 0;

  if (adRatio > 1.5) bullishPoints += 2;
  else if (adRatio > 1.0) bullishPoints += 1;
  else if (adRatio < 0.7) bearishPoints += 2;
  else if (adRatio < 1.0) bearishPoints += 1;

  if (indicators.percentAbove200DMA > 65) bullishPoints += 2;
  else if (indicators.percentAbove200DMA > 50) bullishPoints += 1;
  else if (indicators.percentAbove200DMA < 35) bearishPoints += 2;
  else bearishPoints += 1;

  if (indicators.mcClellanOscillator > 30) bullishPoints += 1;
  else if (indicators.mcClellanOscillator < -30) bearishPoints += 1;

  if (netNewHighs > 50) bullishPoints += 1;
  else if (netNewHighs < -30) bearishPoints += 1;

  if (indicators.bullishPercent > 60) bullishPoints += 1;
  else if (indicators.bullishPercent < 40) bearishPoints += 1;

  let overallBreadth: OverallBreadth;
  if (bullishPoints >= 6) overallBreadth = 'strong';
  else if (bullishPoints >= 4) overallBreadth = 'moderate';
  else if (bearishPoints >= 5) overallBreadth = 'deteriorating';
  else overallBreadth = 'weak';

  let breadthSignal: BreadthSignal;
  if (bullishPoints - bearishPoints >= 3) breadthSignal = 'bullish';
  else if (bearishPoints - bullishPoints >= 3) breadthSignal = 'bearish';
  else breadthSignal = 'neutral';

  // Key level message
  const keyLevelMessages: Record<OverallBreadth, string> = {
    strong: `Broad participation with ${indicators.percentAbove200DMA}% above 200DMA and AD ratio at ${adRatio}`,
    moderate: `Adequate breadth with ${indicators.percentAbove50DMA}% above 50DMA; monitor for narrowing`,
    weak: `Thin participation — only ${indicators.percentAbove200DMA}% above 200DMA, AD ratio at ${adRatio}`,
    deteriorating: `Breadth breaking down: ${indicators.percentAbove200DMA}% above 200DMA, net new highs at ${netNewHighs}`,
  };

  return {
    overallBreadth,
    adRatio,
    netNewHighs,
    breadthSignal,
    keyLevel: keyLevelMessages[overallBreadth],
  };
}

function generateMarketBreadth(): MarketBreadthResponse {
  const now = new Date();
  const seed = dateSeed(now);
  const rng = mulberry32(seed + hashSeed('market-breadth-dashboard'));

  const advanceDecline = generateAdvanceDecline(rng);
  const newHighsLows = generateNewHighsLows(rng);
  const breadthIndicators = generateBreadthIndicators(rng);
  const sectorBreadth = generateSectorBreadth(rng);
  const marketInternals = generateMarketInternals(rng);
  const thrustIndicators = generateThrustIndicators(rng);
  const movingAverages = generateMovingAverages(rng);
  const historicalComparison = generateHistoricalComparison(rng);
  const summary = generateSummary(advanceDecline, breadthIndicators, newHighsLows, historicalComparison);

  return {
    advanceDecline,
    newHighsLows,
    breadthIndicators,
    sectorBreadth,
    marketInternals,
    thrustIndicators,
    movingAverages,
    historicalComparison,
    summary,
    timestamp: now.toISOString(),
  };
}

// ── Cache ────────────────────────────────────────────────────────────────────
const CACHE_TTL = 60 * 60_000; // 5 minutes
let cache: MarketBreadthResponse | null = null;
let cacheTime = 0;

// ── Router ───────────────────────────────────────────────────────────────────
const router = Router();

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    cache = generateMarketBreadth();
    cacheTime = now;
    res.json(cache);
  } catch (err) {
    console.error('[MarketBreadth] Error:', err instanceof Error ? err.message : err);
    // Stale fallback
    if (cache) return res.json(cache);
    res.status(503).json({ error: 'Market breadth data temporarily unavailable' });
  }
});

export default router;
