import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// -- Base data --

const TREND_ASSETS = [
  { asset: 'S&P 500', assetClass: 'Equity', basePrice: 5200, baseSma50: 5150, baseSma200: 4980 },
  { asset: 'Nasdaq 100', assetClass: 'Equity', basePrice: 18200, baseSma50: 17900, baseSma200: 17100 },
  { asset: 'Euro Stoxx 50', assetClass: 'Equity', basePrice: 4950, baseSma50: 4880, baseSma200: 4700 },
  { asset: 'Nikkei 225', assetClass: 'Equity', basePrice: 39500, baseSma50: 38800, baseSma200: 37200 },
  { asset: 'UST 10Y', assetClass: 'Fixed Income', basePrice: 110.5, baseSma50: 109.8, baseSma200: 108.2 },
  { asset: 'Bund 10Y', assetClass: 'Fixed Income', basePrice: 131.2, baseSma50: 130.5, baseSma200: 129.0 },
  { asset: 'Gold', assetClass: 'Commodity', basePrice: 2350, baseSma50: 2280, baseSma200: 2150 },
  { asset: 'Crude Oil', assetClass: 'Commodity', basePrice: 78.5, baseSma50: 76.8, baseSma200: 74.2 },
  { asset: 'Copper', assetClass: 'Commodity', basePrice: 4.35, baseSma50: 4.20, baseSma200: 3.95 },
  { asset: 'USD Index', assetClass: 'Currency', basePrice: 104.2, baseSma50: 103.8, baseSma200: 103.0 },
  { asset: 'EUR/USD', assetClass: 'Currency', basePrice: 1.085, baseSma50: 1.082, baseSma200: 1.075 },
  { asset: 'Bitcoin', assetClass: 'Crypto', basePrice: 68500, baseSma50: 65200, baseSma200: 52800 },
] as const;

const FACTOR_NAMES = [
  'Time-Series Momentum', 'Cross-Sectional Momentum', 'Value', 'Carry',
  'Volatility', 'Quality', 'Size', 'Reversal',
] as const;

const MEAN_REVERSION_ASSETS = [
  { asset: 'S&P 500', baseRsi: 55, baseZScore: 0.8 },
  { asset: 'Nasdaq', baseRsi: 58, baseZScore: 1.0 },
  { asset: 'Euro Stoxx', baseRsi: 52, baseZScore: 0.4 },
  { asset: 'Gold', baseRsi: 62, baseZScore: 1.2 },
  { asset: 'Oil', baseRsi: 48, baseZScore: -0.3 },
  { asset: '10Y UST', baseRsi: 45, baseZScore: -0.5 },
  { asset: 'USD Index', baseRsi: 53, baseZScore: 0.6 },
  { asset: 'EM Bonds', baseRsi: 42, baseZScore: -0.7 },
] as const;

const PAIR_TEMPLATES = [
  { longAsset: 'S&P 500', shortAsset: 'Euro Stoxx 50', baseSpread: 1.2, baseCorr: 0.82 },
  { longAsset: 'Gold', shortAsset: 'USD Index', baseSpread: -0.8, baseCorr: -0.75 },
  { longAsset: 'Nasdaq 100', shortAsset: 'Russell 2000', baseSpread: 2.5, baseCorr: 0.88 },
  { longAsset: 'Crude Oil', shortAsset: 'Natural Gas', baseSpread: 0.6, baseCorr: 0.45 },
  { longAsset: 'UST 10Y', shortAsset: 'Bund 10Y', baseSpread: 1.8, baseCorr: 0.78 },
  { longAsset: 'Bitcoin', shortAsset: 'Nasdaq 100', baseSpread: 3.2, baseCorr: 0.62 },
] as const;

const SIGNALS_TREND = ['Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'] as const;
const PAIR_SIGNALS = ['Enter', 'Hold', 'Exit', 'Monitor'] as const;
const MOMENTUM_REGIMES = ['Risk-On', 'Risk-Off', 'Mixed'] as const;

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-cross-asset-momentum'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  // 1. Trend Signals (12 items)
  const trendSignals = TREND_ASSETS.map(a => {
    const price = round2(jitter(a.basePrice, 0.04));
    const sma50 = round2(jitter(a.baseSma50, 0.03));
    const sma200 = round2(jitter(a.baseSma200, 0.03));

    // Trend score based on price vs SMAs + random component
    const aboveSma50 = price > sma50 ? 1 : -1;
    const aboveSma200 = price > sma200 ? 1 : -1;
    const rawScore = (aboveSma50 * 30 + aboveSma200 * 40) + (rng() - 0.5) * 60;
    const trendScore = round1(clamp(rawScore, -100, 100));

    let signal: typeof SIGNALS_TREND[number];
    if (trendScore > 60) signal = 'Strong Buy';
    else if (trendScore > 20) signal = 'Buy';
    else if (trendScore > -20) signal = 'Neutral';
    else if (trendScore > -60) signal = 'Sell';
    else signal = 'Strong Sell';

    const momentum1m = round2((rng() - 0.45) * 12);
    const momentum3m = round2((rng() - 0.45) * 20);
    const momentum12m = round2((rng() - 0.4) * 35);

    return {
      asset: a.asset,
      assetClass: a.assetClass,
      price,
      sma50,
      sma200,
      trendScore,
      signal,
      momentum1m,
      momentum3m,
      momentum12m,
    };
  });

  // 2. Momentum Factors (8 items)
  const momentumFactors = FACTOR_NAMES.map(factor => {
    const return1m = round2((rng() - 0.45) * 8);
    const return3m = round2((rng() - 0.45) * 14);
    const return12m = round2((rng() - 0.4) * 25);
    const sharpe = round2((rng() - 0.3) * 3);
    const maxDD = round2(-rng() * 20 - 2);
    const currentExposure = round2((rng() - 0.5) * 2);
    const zScore = round2((rng() - 0.5) * 4);

    return { factor, return1m, return3m, return12m, sharpe, maxDD, currentExposure, zScore };
  });

  // 3. Mean Reversion Indicators (8 items)
  const meanReversionIndicators = MEAN_REVERSION_ASSETS.map(a => {
    const rsi14 = round1(clamp(jitter(a.baseRsi, 0.15), 10, 95));
    const percentileRank = round1(clamp(rng() * 100, 1, 99));
    const zScore5y = round2(jitter(a.baseZScore, 0.6) + (rng() - 0.5) * 1.5);
    const distanceFromMean = round2((rng() - 0.5) * 20);

    // Higher probability of mean reversion at extremes
    const extremity = Math.abs(zScore5y);
    const meanReversionProb = round1(clamp(30 + extremity * 15 + rng() * 20, 10, 95));

    // Expected return inversely related to z-score
    const expectedReturn = round2(-zScore5y * 2.5 + (rng() - 0.5) * 4);

    const timeHorizons = ['1W', '2W', '1M', '3M', '6M'];
    const timeHorizon = timeHorizons[Math.floor(rng() * timeHorizons.length)];

    return {
      asset: a.asset,
      rsi14,
      percentileRank,
      zScore5y,
      distanceFromMean,
      meanReversionProb,
      expectedReturn,
      timeHorizon,
    };
  });

  // 4. Pair Strategies (6 items)
  const pairStrategies = PAIR_TEMPLATES.map(p => {
    const spread = round2(jitter(p.baseSpread, 0.4) + (rng() - 0.5) * 1.5);
    const spreadZscore = round2((rng() - 0.5) * 5);
    const halfLife = Math.floor(rng() * 55) + 5;
    const correlation = round2(clamp(jitter(p.baseCorr, 0.1), -1, 1));
    const signal = pick(PAIR_SIGNALS);
    const pnlMTD = round2((rng() - 0.45) * 6);

    return {
      longAsset: p.longAsset,
      shortAsset: p.shortAsset,
      spread,
      spreadZscore,
      halfLife,
      correlation,
      signal,
      pnlMTD,
    };
  });

  // 5. Market Summary
  const avgMomentumScore = round1(
    trendSignals.reduce((sum, s) => sum + s.trendScore, 0) / trendSignals.length
  );
  const trendingAssets = trendSignals.filter(s =>
    s.signal === 'Strong Buy' || s.signal === 'Buy' || s.signal === 'Strong Sell' || s.signal === 'Sell'
  ).length;
  const meanRevertingAssets = meanReversionIndicators.filter(m => m.meanReversionProb > 60).length;

  const sorted = [...trendSignals].sort((a, b) => b.momentum1m - a.momentum1m);
  const bestPerformer = sorted[0].asset;
  const worstPerformer = sorted[sorted.length - 1].asset;

  let overallMomentum: typeof MOMENTUM_REGIMES[number];
  if (avgMomentumScore > 15) overallMomentum = 'Risk-On';
  else if (avgMomentumScore < -15) overallMomentum = 'Risk-Off';
  else overallMomentum = 'Mixed';

  const marketSummary = {
    overallMomentum,
    trendingAssets,
    meanRevertingAssets,
    avgMomentumScore,
    bestPerformer,
    worstPerformer,
  };

  return {
    trendSignals,
    momentumFactors,
    meanReversionIndicators,
    pairStrategies,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CrossAssetMomentum] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate cross-asset momentum data' });
  }
});

export default router;
