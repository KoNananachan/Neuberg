import { Router } from 'express';

const router = Router();

// ── Types ──

interface ConeWindow {
  period: string;
  current: number;
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  percentileRank: number;
}

interface ConeAsset {
  ticker: string;
  name: string;
  windows: ConeWindow[];
  impliedVol: number;
  rvIvSpread: number;
  regime: 'Low' | 'Normal' | 'Elevated' | 'High' | 'Extreme';
}

interface VolatilityConeResponse {
  data: ConeAsset[];
  generatedAt: string;
}

// ── Asset definitions ──

interface AssetProfile {
  name: string;
  volCenter: number;   // typical mid-range annualized RV
  volWidth: number;     // half-width of historical range
  ivPremium: number;    // typical IV premium over RV (positive = IV > RV)
}

const ASSETS: Record<string, AssetProfile> = {
  SPY:  { name: 'S&P 500 ETF',          volCenter: 18, volWidth: 12, ivPremium: 2.5 },
  QQQ:  { name: 'Nasdaq 100 ETF',       volCenter: 22, volWidth: 14, ivPremium: 2.0 },
  IWM:  { name: 'Russell 2000 ETF',     volCenter: 24, volWidth: 14, ivPremium: 1.5 },
  DIA:  { name: 'Dow Jones ETF',        volCenter: 16, volWidth: 10, ivPremium: 2.0 },
  EEM:  { name: 'Emerging Markets ETF',  volCenter: 22, volWidth: 13, ivPremium: 1.0 },
  TLT:  { name: '20+ Year Treasury ETF', volCenter: 16, volWidth: 10, ivPremium: 1.5 },
  GLD:  { name: 'Gold ETF',             volCenter: 16, volWidth: 9,  ivPremium: 1.0 },
  USO:  { name: 'US Oil Fund',          volCenter: 35, volWidth: 20, ivPremium: 3.0 },
  FXE:  { name: 'Euro Currency ETF',    volCenter: 10, volWidth: 6,  ivPremium: 0.8 },
  VIX:  { name: 'CBOE Volatility Index', volCenter: 90, volWidth: 45, ivPremium: 5.0 },
  AAPL: { name: 'Apple Inc.',           volCenter: 28, volWidth: 16, ivPremium: 2.0 },
  TSLA: { name: 'Tesla Inc.',           volCenter: 55, volWidth: 30, ivPremium: 4.0 },
};

const TICKERS = Object.keys(ASSETS);

const PERIODS = ['5d', '10d', '20d', '30d', '60d', '90d', '120d', '252d'];

// ── Seeded PRNG ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Data generation ──

function generateConeAsset(ticker: string, dateSeed: number): ConeAsset {
  const profile = ASSETS[ticker]!;
  const rng = seededRandom(dateSeed + ticker.charCodeAt(0) * 1000 + (ticker.charCodeAt(1) || 0) * 31);

  // Period multiplier: shorter windows have wider cone spread, longer windows converge
  const periodFactors: Record<string, { spread: number; currentBias: number }> = {
    '5d':   { spread: 1.8,  currentBias: 1.2 },
    '10d':  { spread: 1.5,  currentBias: 1.1 },
    '20d':  { spread: 1.3,  currentBias: 1.0 },
    '30d':  { spread: 1.15, currentBias: 0.95 },
    '60d':  { spread: 1.0,  currentBias: 0.9 },
    '90d':  { spread: 0.9,  currentBias: 0.85 },
    '120d': { spread: 0.82, currentBias: 0.8 },
    '252d': { spread: 0.7,  currentBias: 0.75 },
  };

  // Determine a "regime bias" for this asset in this cycle: shifts current up or down
  const regimeBias = (rng() - 0.5) * 2; // -1 to +1

  const windows: ConeWindow[] = PERIODS.map((period) => {
    const factor = periodFactors[period] ?? { spread: 1.0, currentBias: 1.0 };

    // Base center and width for this period
    const center = profile.volCenter * factor.currentBias;
    const width = profile.volWidth * factor.spread;

    // Generate percentile boundaries (must be ordered: min < p10 < p25 < median < p75 < p90 < max)
    const minVal = Math.max(1, center - width + rng() * width * 0.15);
    const maxVal = center + width + rng() * width * 0.2;
    const median = center + (rng() - 0.5) * width * 0.3;

    // Interpolate percentiles between min and max
    const p10 = lerp(minVal, median, 0.2 + rng() * 0.1);
    const p25 = lerp(minVal, median, 0.5 + rng() * 0.1);
    const p75 = lerp(median, maxVal, 0.35 + rng() * 0.1);
    const p90 = lerp(median, maxVal, 0.7 + rng() * 0.1);

    // Current vol: influenced by regime bias
    // regimeBias > 0 = elevated, < 0 = subdued
    const currentBase = median + regimeBias * width * 0.4 * factor.currentBias;
    const current = clamp(currentBase + (rng() - 0.5) * width * 0.3, minVal + 0.5, maxVal - 0.5);

    // Calculate percentile rank of current within the distribution
    let percentileRank: number;
    if (current <= minVal) {
      percentileRank = 1;
    } else if (current >= maxVal) {
      percentileRank = 99;
    } else if (current <= median) {
      // Map [min, median] to [0, 50]
      percentileRank = Math.round(((current - minVal) / (median - minVal)) * 50);
    } else {
      // Map [median, max] to [50, 100]
      percentileRank = Math.round(50 + ((current - median) / (maxVal - median)) * 50);
    }
    percentileRank = clamp(percentileRank, 1, 99);

    return {
      period,
      current: round2(current),
      min: round2(minVal),
      p10: round2(p10),
      p25: round2(p25),
      median: round2(median),
      p75: round2(p75),
      p90: round2(p90),
      max: round2(maxVal),
      percentileRank,
    };
  });

  // Implied vol: based on 20d window current + premium
  const rv20d = windows.find((w) => w.period === '20d')?.current ?? profile.volCenter;
  const impliedVol = round2(rv20d + profile.ivPremium + (rng() - 0.5) * 3);
  const rvIvSpread = round2(rv20d - impliedVol);

  // Regime based on average percentile of shorter windows (5d, 10d, 20d)
  const shortWindows = windows.filter((w) => ['5d', '10d', '20d'].includes(w.period));
  const avgPctl = shortWindows.reduce((sum, w) => sum + w.percentileRank, 0) / (shortWindows.length || 1);

  let regime: ConeAsset['regime'];
  if (avgPctl >= 90) regime = 'Extreme';
  else if (avgPctl >= 75) regime = 'High';
  else if (avgPctl >= 55) regime = 'Elevated';
  else if (avgPctl >= 25) regime = 'Normal';
  else regime = 'Low';

  return {
    ticker,
    name: profile.name,
    windows,
    impliedVol,
    rvIvSpread,
    regime,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Cache ──

let cache: { data: VolatilityConeResponse; expiresAt: number } | null = null;
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Route ──

// GET /api/volatility-cone
router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Check cache
    if (cache && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Date-based seed for deterministic daily data with intraday variation
    const today = new Date();
    const dateSeed =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate() +
      Math.floor(now / CACHE_TTL);

    const assets = TICKERS.map((ticker) => generateConeAsset(ticker, dateSeed));

    const response: VolatilityConeResponse = {
      data: assets,
      generatedAt: new Date().toISOString(),
    };

    cache = { data: response, expiresAt: now + CACHE_TTL };
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[VolatilityCone] Error:', message);

    // Stale fallback
    if (cache) return res.json(cache.data);

    res.status(500).json({ error: 'Failed to generate volatility cone data' });
  }
});

export default router;
