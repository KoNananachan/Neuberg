import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface StrikePoint {
  moneyness: number;
  strike: number;
  impliedVol: number;
  delta: number;
  vega: number;
  theta: number;
}

interface SmileEntry {
  underlying: string;
  spotPrice: number;
  atmVol: number;
  expiry: string;
  strikes: StrikePoint[];
}

interface SkewMetric {
  underlying: string;
  skew25d: number;
  skew10d: number;
  butterfly: number;
  riskReversal25d: number;
  skewChange1w: number;
  skewPercentile: number;
  skewRichCheap: 'Rich' | 'Fair' | 'Cheap';
}

interface TermStructurePoint {
  expiry: string;
  atmVol: number;
  skew25d: number;
  realizedVol: number;
  volRiskPremium: number;
}

interface VolSmileSummary {
  avgAtmVol: number;
  steepestSkew: string;
  flattest: string;
  avgRiskReversal: number;
  termStructureSlope: 'contango' | 'backwardation';
}

interface VolSmileResponse {
  smiles: SmileEntry[];
  skewMetrics: SkewMetric[];
  termStructure: TermStructurePoint[];
  summary: VolSmileSummary;
  timestamp: string;
}

// ── Underlying Profiles ──

interface UnderlyingProfile {
  baseSpot: number;
  atmVolRange: [number, number];
  smileSteepness: number;   // multiplier for OTM put vol bump
  callWingSteep: number;    // multiplier for OTM call vol bump
}

const UNDERLYING_PROFILES: Record<string, UnderlyingProfile> = {
  SPY:  { baseSpot: 585,  atmVolRange: [15, 18],   smileSteepness: 1.0,  callWingSteep: 0.3  },
  QQQ:  { baseSpot: 505,  atmVolRange: [18, 22],   smileSteepness: 1.1,  callWingSteep: 0.35 },
  AAPL: { baseSpot: 230,  atmVolRange: [22, 28],   smileSteepness: 1.15, callWingSteep: 0.4  },
  TSLA: { baseSpot: 265,  atmVolRange: [45, 55],   smileSteepness: 1.6,  callWingSteep: 0.7  },
  IWM:  { baseSpot: 225,  atmVolRange: [19, 24],   smileSteepness: 1.05, callWingSteep: 0.35 },
  GLD:  { baseSpot: 290,  atmVolRange: [14, 17],   smileSteepness: 0.6,  callWingSteep: 0.25 },
};

const UNDERLYINGS = Object.keys(UNDERLYING_PROFILES);

const MONEYNESS_LEVELS = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];

const TERM_EXPIRIES: Array<{ label: string; days: number }> = [
  { label: '7d',   days: 7   },
  { label: '14d',  days: 14  },
  { label: '30d',  days: 30  },
  { label: '60d',  days: 60  },
  { label: '90d',  days: 90  },
  { label: '180d', days: 180 },
  { label: '365d', days: 365 },
];

// ── Helpers ──

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ── Black-Scholes approximation for delta/vega/theta ──

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function computeGreeks(spot: number, strike: number, vol: number, T: number): { delta: number; vega: number; theta: number } {
  const volDecimal = vol / 100;
  const sqrtT = Math.sqrt(T);
  if (sqrtT < 0.001 || volDecimal < 0.001) {
    return { delta: spot > strike ? 1 : 0, vega: 0, theta: 0 };
  }
  const d1 = (Math.log(spot / strike) + 0.5 * volDecimal * volDecimal * T) / (volDecimal * sqrtT);
  const d2 = d1 - volDecimal * sqrtT;
  const delta = round4(normalCDF(d1));
  const vega = round4(spot * normalPDF(d1) * sqrtT / 100); // per 1% vol move
  const theta = round4(-(spot * normalPDF(d1) * volDecimal) / (2 * sqrtT) / 365);
  return { delta, vega, theta };
}

// ── Data Generation ──

function generateSmile(underlying: string, rng: () => number): SmileEntry {
  const profile = UNDERLYING_PROFILES[underlying];
  const spotJitter = (rng() - 0.5) * 0.02;
  const spotPrice = round2(profile.baseSpot * (1 + spotJitter));

  const atmVol = round2(lerp(profile.atmVolRange[0], profile.atmVolRange[1], rng()));

  const T = 30 / 365; // 30-day expiry

  const strikes: StrikePoint[] = MONEYNESS_LEVELS.map((moneyness) => {
    const strike = round2(spotPrice * moneyness);

    // Vol smile model: quadratic with asymmetric wings
    const logMoneyness = Math.log(moneyness);
    // OTM puts (moneyness < 1) get higher IV; steepness varies by underlying
    const putWingContrib = logMoneyness < 0
      ? profile.smileSteepness * logMoneyness * logMoneyness * 800
      : 0;
    // OTM calls (moneyness > 1) get moderately higher IV
    const callWingContrib = logMoneyness > 0
      ? profile.callWingSteep * logMoneyness * logMoneyness * 600
      : 0;
    // Slight linear skew (put side more expensive)
    const linearSkew = -logMoneyness * atmVol * 0.15 * profile.smileSteepness;
    // Small noise
    const noise = (rng() - 0.5) * 0.4;

    const impliedVol = round2(Math.max(
      atmVol + putWingContrib + callWingContrib + linearSkew + noise,
      atmVol * 0.3 // floor
    ));

    const greeks = computeGreeks(spotPrice, strike, impliedVol, T);

    return {
      moneyness: round2(moneyness * 100),
      strike,
      impliedVol,
      delta: greeks.delta,
      vega: greeks.vega,
      theta: greeks.theta,
    };
  });

  return {
    underlying,
    spotPrice,
    atmVol,
    expiry: '30d',
    strikes,
  };
}

function generateSkewMetrics(smile: SmileEntry, rng: () => number): SkewMetric {
  // 25-delta: roughly 90% and 110% moneyness for 30d options
  const putSide90 = smile.strikes.find((s) => s.moneyness === 90);
  const callSide110 = smile.strikes.find((s) => s.moneyness === 110);
  const atm = smile.strikes.find((s) => s.moneyness === 100);

  const put25dIv = putSide90?.impliedVol ?? smile.atmVol + 3;
  const call25dIv = callSide110?.impliedVol ?? smile.atmVol + 1;
  const atmIv = atm?.impliedVol ?? smile.atmVol;

  // 10-delta: roughly 85% and 115% moneyness
  const putSide85 = smile.strikes.find((s) => s.moneyness === 85);
  const callSide115 = smile.strikes.find((s) => s.moneyness === 115);
  const put10dIv = putSide85?.impliedVol ?? put25dIv + 2;
  const call10dIv = callSide115?.impliedVol ?? call25dIv + 1;

  const skew25d = round2(put25dIv - call25dIv);
  const skew10d = round2(put10dIv - call10dIv);
  const butterfly = round2((put25dIv + call25dIv) / 2 - atmIv);
  const riskReversal25d = round2(call25dIv - put25dIv);

  const skewChange1w = round2((rng() - 0.5) * 2.0);
  const skewPercentile = Math.round(clamp(rng() * 100, 5, 95));

  let skewRichCheap: 'Rich' | 'Fair' | 'Cheap';
  if (skewPercentile > 70) {
    skewRichCheap = 'Rich';
  } else if (skewPercentile < 30) {
    skewRichCheap = 'Cheap';
  } else {
    skewRichCheap = 'Fair';
  }

  return {
    underlying: smile.underlying,
    skew25d,
    skew10d,
    butterfly,
    riskReversal25d,
    skewChange1w,
    skewPercentile,
    skewRichCheap,
  };
}

function generateTermStructure(rng: () => number): TermStructurePoint[] {
  // SPY vol term structure
  const baseAtm = lerp(15, 18, rng());

  return TERM_EXPIRIES.map((exp) => {
    const months = exp.days / 30;
    // Term structure generally upward-sloping (contango) with slight curvature
    const termPremium = Math.sqrt(months) * 0.8 + (rng() - 0.5) * 0.5;
    // Short-dated vol can spike (add noise)
    const shortDateNoise = exp.days <= 14 ? (rng() - 0.5) * 2.0 : 0;
    const atmVol = round2(baseAtm + termPremium + shortDateNoise);

    // Skew flattens with time
    const timeDecay = Math.sqrt(30 / Math.max(exp.days, 1));
    const baseSkew = lerp(3, 6, rng());
    const skew25d = round2(baseSkew * timeDecay + (rng() - 0.5) * 0.5);

    // Realized vol: slightly below implied (vol risk premium)
    const realizedVol = round2(atmVol - lerp(1.0, 3.5, rng()));
    const volRiskPremium = round2(atmVol - realizedVol);

    return {
      expiry: exp.label,
      atmVol,
      skew25d,
      realizedVol,
      volRiskPremium,
    };
  });
}

function generateAllData(): VolSmileResponse {
  const rng = seededRandom('volatility-smile');

  // Generate smiles for all 6 underlyings
  const smiles: SmileEntry[] = UNDERLYINGS.map((u) => generateSmile(u, rng));

  // Generate skew metrics
  const skewMetrics: SkewMetric[] = smiles.map((s) => generateSkewMetrics(s, rng));

  // Generate SPY term structure
  const termStructure = generateTermStructure(rng);

  // Summary
  const atmVols = smiles.map((s) => s.atmVol);
  const avgAtmVol = round2(atmVols.reduce((sum, v) => sum + v, 0) / atmVols.length);

  const absSkews = skewMetrics.map((m) => ({ underlying: m.underlying, absSkew: Math.abs(m.skew25d) }));
  absSkews.sort((a, b) => b.absSkew - a.absSkew);
  const steepestSkew = absSkews[0].underlying;
  const flattest = absSkews[absSkews.length - 1].underlying;

  const avgRiskReversal = round2(
    skewMetrics.reduce((sum, m) => sum + m.riskReversal25d, 0) / skewMetrics.length
  );

  // Term structure slope: compare short (7d) vs long (365d)
  const shortVol = termStructure.find((t) => t.expiry === '7d')?.atmVol ?? 15;
  const longVol = termStructure.find((t) => t.expiry === '365d')?.atmVol ?? 17;
  const termStructureSlope: 'contango' | 'backwardation' = longVol >= shortVol ? 'contango' : 'backwardation';

  const summary: VolSmileSummary = {
    avgAtmVol,
    steepestSkew,
    flattest,
    avgRiskReversal,
    termStructureSlope,
  };

  return {
    smiles,
    skewMetrics,
    termStructure,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache ──

interface CacheEntry {
  data: VolSmileResponse;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
let staleCache: VolSmileResponse | null = null;


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Serve from cache if fresh
    if (cache && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Generate fresh data
    const data = generateAllData();

    // Update cache
    cache = { data, expiresAt: now + CACHE_TTL };
    staleCache = data;

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[VolatilitySmile] Error:', message);

    // Stale fallback
    if (staleCache) {
      return res.json(staleCache);
    }

    res.status(500).json({ error: 'Failed to generate volatility smile data' });
  }
});

export default router;
