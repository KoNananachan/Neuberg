import { Router } from 'express';

const router = Router();

// ── Types ──

interface SurfacePoint {
  expiry: string;
  strike: number;
  moneyness: number;
  iv: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
}

interface TermStructureEntry {
  expiry: string;
  daysToExpiry: number;
  atmIv: number;
  skew: number;
  butterfly: number;
}

interface SmileMetrics {
  skewSlope: number;
  convexity: number;
  putCallSkew: number;
  wingSlope: number;
}

interface VolSurfaceData {
  ticker: string;
  spotPrice: number;
  lastUpdated: string;
  surface: SurfacePoint[];
  atmIv: number;
  skew25d: number;
  butterfly25d: number;
  rvIvRatio: number;
  termStructure: TermStructureEntry[];
  smileMetrics: SmileMetrics;
}

interface VolSurfaceResponse {
  surfaces: VolSurfaceData[];
  generatedAt: string;
}

// ── Supported underlyings ──

const UNDERLYINGS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];

// ── Spot prices (baseline) ──

const BASE_SPOTS: Record<string, number> = {
  SPY: 585, QQQ: 505, IWM: 225, AAPL: 230, TSLA: 265, NVDA: 140, AMZN: 210, MSFT: 435,
};

// ── Vol profiles per underlying ──

interface VolProfile {
  baseAtmIv: number;
  skewSteepness: number;   // how steep the put skew is (higher = steeper)
  callWingLift: number;    // OTM call IV elevation
  termSlope: number;       // IV increase per month in term structure
  smileConvexity: number;  // curvature of the smile
}

const VOL_PROFILES: Record<string, VolProfile> = {
  SPY:  { baseAtmIv: 0.16, skewSteepness: 0.08, callWingLift: 0.02, termSlope: 0.003, smileConvexity: 0.04 },
  QQQ:  { baseAtmIv: 0.19, skewSteepness: 0.07, callWingLift: 0.025, termSlope: 0.0025, smileConvexity: 0.035 },
  IWM:  { baseAtmIv: 0.22, skewSteepness: 0.09, callWingLift: 0.03, termSlope: 0.004, smileConvexity: 0.05 },
  AAPL: { baseAtmIv: 0.24, skewSteepness: 0.06, callWingLift: 0.02, termSlope: 0.002, smileConvexity: 0.03 },
  TSLA: { baseAtmIv: 0.55, skewSteepness: 0.04, callWingLift: 0.05, termSlope: -0.004, smileConvexity: 0.06 },
  NVDA: { baseAtmIv: 0.45, skewSteepness: 0.05, callWingLift: 0.04, termSlope: -0.003, smileConvexity: 0.05 },
  AMZN: { baseAtmIv: 0.28, skewSteepness: 0.06, callWingLift: 0.025, termSlope: 0.002, smileConvexity: 0.035 },
  MSFT: { baseAtmIv: 0.22, skewSteepness: 0.06, callWingLift: 0.02, termSlope: 0.002, smileConvexity: 0.03 },
};

// ── Expiry definitions ──

const EXPIRY_DEFS: Array<{ label: string; days: number }> = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: '180d', days: 180 },
  { label: '365d', days: 365 },
];

// ── Strike moneyness levels ──

const STRIKE_MONEYNESS = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];

// ── Seeded random for deterministic data ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Black-Scholes approximate Greeks ──

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
}

function computeGreeks(
  spot: number,
  strike: number,
  iv: number,
  daysToExpiry: number,
  r: number = 0.045,
): { delta: number; gamma: number; vega: number; theta: number } {
  const T = Math.max(daysToExpiry / 365, 0.001);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (r + iv * iv / 2) * T) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;

  const isCall = strike >= spot;
  const delta = isCall
    ? Math.round(normalCDF(d1) * 10000) / 10000
    : Math.round((normalCDF(d1) - 1) * 10000) / 10000;

  const gamma = Math.round((normalPDF(d1) / (spot * iv * sqrtT)) * 10000) / 10000;
  const vega = Math.round((spot * normalPDF(d1) * sqrtT / 100) * 10000) / 10000;
  const theta = Math.round((-(spot * normalPDF(d1) * iv) / (2 * sqrtT) / 365) * 10000) / 10000;

  return { delta, gamma, vega, theta };
}

// ── Data generation ──

function generateSurfaceData(ticker: string, dateSeed: number): VolSurfaceData {
  const profile = VOL_PROFILES[ticker] ?? VOL_PROFILES['SPY'];
  const rng = seededRandom(dateSeed + ticker.charCodeAt(0) * 1000 + ticker.charCodeAt(1) * 37);

  // Jitter spot price +/- 1%
  const spotBase = BASE_SPOTS[ticker] ?? 100;
  const spotPrice = Math.round(spotBase * (1 + (rng() - 0.5) * 0.02) * 100) / 100;

  // Random perturbations for this cycle
  const ivShift = (rng() - 0.5) * 0.02; // +/- 1% shift to base IV
  const skewShift = (rng() - 0.5) * 0.01;

  const surface: SurfacePoint[] = [];
  const termStructure: TermStructureEntry[] = [];

  for (const expDef of EXPIRY_DEFS) {
    const T = expDef.days / 365;
    const termFactor = expDef.days / 30;

    // ATM IV for this expiry (term structure)
    const expiryAtmIv = clamp(
      profile.baseAtmIv + profile.termSlope * termFactor + ivShift + (rng() - 0.5) * 0.005,
      0.05,
      1.5,
    );

    // Skew flattens with longer expiry (sqrt of time)
    const timeDecay = Math.sqrt(30 / Math.max(expDef.days, 1));

    let skew25dForExpiry = 0;
    let butterfly25dForExpiry = 0;

    for (const moneyness of STRIKE_MONEYNESS) {
      const strike = Math.round(spotPrice * moneyness * 100) / 100;
      const logMoneyness = Math.log(moneyness);

      // IV smile model:
      // iv = atm_iv + skew * log(K/S) * timeDecay + convexity * log(K/S)^2
      // For puts (K < S): log(K/S) < 0, so skew adds IV (put skew)
      // For calls (K > S): log(K/S) > 0, slight elevation from call wing lift
      let iv = expiryAtmIv;

      // Put skew component (negative logMoneyness adds IV)
      iv += -profile.skewSteepness * logMoneyness * timeDecay + skewShift;

      // Smile convexity (quadratic term, always adds IV away from ATM)
      iv += profile.smileConvexity * logMoneyness * logMoneyness * timeDecay;

      // Call wing lift for OTM calls
      if (moneyness > 1.0) {
        iv += profile.callWingLift * (moneyness - 1.0) * timeDecay * 0.5;
      }

      // Small random perturbation
      iv += (rng() - 0.5) * 0.003;
      iv = Math.round(clamp(iv, 0.03, 2.0) * 10000) / 10000;

      // Compute Greeks
      const greeks = computeGreeks(spotPrice, strike, iv, expDef.days);

      surface.push({
        expiry: expDef.label,
        strike,
        moneyness: Math.round(moneyness * 100) / 100,
        iv,
        delta: greeks.delta,
        gamma: greeks.gamma,
        vega: greeks.vega,
        theta: greeks.theta,
      });

      // Capture 25-delta skew and butterfly metrics
      if (Math.abs(moneyness - 0.95) < 0.01) {
        skew25dForExpiry = iv - expiryAtmIv;
      }
      if (Math.abs(moneyness - 1.05) < 0.01) {
        butterfly25dForExpiry = ((iv + (skew25dForExpiry + expiryAtmIv)) / 2 - expiryAtmIv);
      }
    }

    termStructure.push({
      expiry: expDef.label,
      daysToExpiry: expDef.days,
      atmIv: Math.round(expiryAtmIv * 10000) / 10000,
      skew: Math.round(skew25dForExpiry * 10000) / 10000,
      butterfly: Math.round(Math.abs(butterfly25dForExpiry) * 10000) / 10000,
    });
  }

  // Overall metrics from 30d expiry
  const ts30d = termStructure.find((t) => t.expiry === '30d');
  const atmIv = ts30d ? ts30d.atmIv : profile.baseAtmIv;
  const skew25d = ts30d ? ts30d.skew : 0;
  const butterfly25d = ts30d ? ts30d.butterfly : 0;

  // Realized vol / IV ratio
  const rvIvRatio = Math.round(clamp(0.7 + rng() * 0.5, 0.5, 1.3) * 100) / 100;

  // Smile metrics (from 30d smile)
  const smile30d = surface.filter((p) => p.expiry === '30d');
  const ivValues = smile30d.map((p) => p.iv);
  const moneynessValues = smile30d.map((p) => p.moneyness);

  // Skew slope: linear regression slope of IV vs moneyness
  let skewSlope = 0;
  if (moneynessValues.length >= 2) {
    const n = moneynessValues.length;
    const meanX = moneynessValues.reduce((a, b) => a + b, 0) / n;
    const meanY = ivValues.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (moneynessValues[i] - meanX) * (ivValues[i] - meanY);
      den += (moneynessValues[i] - meanX) * (moneynessValues[i] - meanX);
    }
    skewSlope = den > 0 ? Math.round((num / den) * 10000) / 10000 : 0;
  }

  // Convexity: difference between wing average and ATM
  const putWingIv = ivValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const callWingIv = ivValues.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const atmIvLocal = smile30d.find((p) => p.moneyness === 1.0)?.iv ?? atmIv;
  const convexity = Math.round(((putWingIv + callWingIv) / 2 - atmIvLocal) * 10000) / 10000;

  // Put/call skew: avg put wing IV - avg call wing IV
  const putCallSkew = Math.round((putWingIv - callWingIv) * 10000) / 10000;

  // Wing slope: how steeply wings rise from ATM
  const wingSlope = Math.round(((putWingIv - atmIvLocal + callWingIv - atmIvLocal) / 2 / 0.2) * 10000) / 10000;

  const smileMetrics: SmileMetrics = {
    skewSlope,
    convexity,
    putCallSkew,
    wingSlope,
  };

  return {
    ticker,
    spotPrice,
    lastUpdated: new Date().toISOString(),
    surface,
    atmIv: Math.round(atmIv * 10000) / 10000,
    skew25d: Math.round(skew25d * 10000) / 10000,
    butterfly25d: Math.round(butterfly25d * 10000) / 10000,
    rvIvRatio,
    termStructure,
    smileMetrics,
  };
}

// ── Cache ──

let cachedResponse: { data: VolSurfaceResponse; expiresAt: number } | null = null;
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Route ──

// GET /api/vol-surface
router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Check cache
    if (cachedResponse && now < cachedResponse.expiresAt) {
      return res.json(cachedResponse.data);
    }

    // Deterministic seed based on date (changes daily)
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    // Add 5-minute cycle for intra-day variation
    const cycleSeed = dateSeed * 1000 + Math.floor(now / CACHE_TTL);

    const surfaces = UNDERLYINGS.map((ticker) => generateSurfaceData(ticker, cycleSeed));

    const response: VolSurfaceResponse = {
      surfaces,
      generatedAt: new Date().toISOString(),
    };

    cachedResponse = { data: response, expiresAt: now + CACHE_TTL };

    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[VolSurface] Error:', message);

    // Stale fallback
    if (cachedResponse) return res.json(cachedResponse.data);

    res.status(500).json({ error: 'Failed to generate volatility surface data' });
  }
});

export default router;
