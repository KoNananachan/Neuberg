import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

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

interface GridCell {
  strike: number;
  moneyness: number;
  expiry: string;
  daysToExpiry: number;
  impliedVol: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
}

interface SurfaceEntry {
  underlying: string;
  spot: number;
  historicalVol30D: number;
  historicalVol60D: number;
  historicalVol90D: number;
  grid: GridCell[];
}

interface SkewTenorEntry {
  tenor: string;
  daysToExpiry: number;
  skew25D: number;
  skew10D: number;
  butterfly25D: number;
  riskReversal25D: number;
}

interface SkewEntry {
  underlying: string;
  tenors: SkewTenorEntry[];
}

interface TermStructureEntry {
  tenor: string;
  iv_atm: number;
  iv_25d_put: number;
  iv_25d_call: number;
  iv_10d_put: number;
  iv_10d_call: number;
}

interface TermStructureUnderlying {
  underlying: string;
  curve: TermStructureEntry[];
}

interface VolatilityIndex {
  level: number;
  change: number;
  changePercent: number;
}

interface VolatilityIndices {
  vix: VolatilityIndex;
  vix9d: VolatilityIndex;
  vix3m: VolatilityIndex;
  vix6m: VolatilityIndex;
  vxn: VolatilityIndex;
  rvx: VolatilityIndex;
  move: VolatilityIndex;
  tyvix: VolatilityIndex;
  skewIndex: VolatilityIndex;
  vvix: VolatilityIndex;
}

interface Summary {
  avgIV_SPX: number;
  ivRank_SPX: number;
  hvIvSpread: number;
  putCallSkew: number;
  termStructureSlope: 'contango' | 'backwardation';
}

interface VolatilitySurfaceResponse {
  surface: SurfaceEntry[];
  skew: SkewEntry[];
  termStructure: TermStructureUnderlying[];
  volatilityIndices: VolatilityIndices;
  summary: Summary;
  generatedAt: string;
}

// ── Constants ──

interface UnderlyingProfile {
  symbol: string;
  baseSpot: number;
  baseAtmIv: number;
  skewSteepness: number;
  callWingLift: number;
  termSlope: number;
  smileConvexity: number;
  hv30Base: number;
  hv60Base: number;
  hv90Base: number;
}

const UNDERLYINGS: UnderlyingProfile[] = [
  { symbol: 'SPX', baseSpot: 5850, baseAtmIv: 0.17, skewSteepness: 0.08, callWingLift: 0.015, termSlope: 0.003, smileConvexity: 0.04, hv30Base: 0.14, hv60Base: 0.15, hv90Base: 0.155 },
  { symbol: 'NDX', baseSpot: 20800, baseAtmIv: 0.20, skewSteepness: 0.07, callWingLift: 0.02, termSlope: 0.0025, smileConvexity: 0.035, hv30Base: 0.18, hv60Base: 0.185, hv90Base: 0.19 },
  { symbol: 'RUT', baseSpot: 2150, baseAtmIv: 0.22, skewSteepness: 0.09, callWingLift: 0.025, termSlope: 0.004, smileConvexity: 0.05, hv30Base: 0.20, hv60Base: 0.205, hv90Base: 0.21 },
  { symbol: 'VIX', baseSpot: 16.5, baseAtmIv: 0.90, skewSteepness: -0.05, callWingLift: 0.10, termSlope: -0.01, smileConvexity: 0.08, hv30Base: 0.80, hv60Base: 0.82, hv90Base: 0.85 },
  { symbol: 'AAPL', baseSpot: 230, baseAtmIv: 0.24, skewSteepness: 0.06, callWingLift: 0.02, termSlope: 0.002, smileConvexity: 0.03, hv30Base: 0.21, hv60Base: 0.22, hv90Base: 0.225 },
  { symbol: 'TSLA', baseSpot: 265, baseAtmIv: 0.55, skewSteepness: 0.04, callWingLift: 0.05, termSlope: -0.004, smileConvexity: 0.06, hv30Base: 0.50, hv60Base: 0.52, hv90Base: 0.53 },
];

const TENORS: Array<{ label: string; days: number }> = [
  { label: '1W', days: 7 },
  { label: '2W', days: 14 },
  { label: '1M', days: 30 },
  { label: '2M', days: 60 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

const MONEYNESS_LEVELS = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];

// ── Black-Scholes helpers ──

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp((-x * x) / 2);
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
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
  const d1 = (Math.log(spot / strike) + (r + (iv * iv) / 2) * T) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;

  const isCall = strike >= spot;
  const delta = isCall
    ? round4(normalCDF(d1))
    : round4(normalCDF(d1) - 1);

  const gamma = round4(normalPDF(d1) / (spot * iv * sqrtT));
  const vega = round4((spot * normalPDF(d1) * sqrtT) / 100);
  const theta = round4(-(spot * normalPDF(d1) * iv) / (2 * sqrtT) / 365);

  return { delta, gamma, vega, theta };
}

// ── Utility ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Data generation ──

function generate(): VolatilitySurfaceResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-volatility-surface'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 1. Surface grid ──
  const surface: SurfaceEntry[] = UNDERLYINGS.map((u) => {
    const spot = round2(jitter(u.baseSpot, 0.01));
    const hv30 = round4(jitter(u.hv30Base, 0.08));
    const hv60 = round4(jitter(u.hv60Base, 0.06));
    const hv90 = round4(jitter(u.hv90Base, 0.05));

    const ivShift = (rng() - 0.5) * 0.02;
    const skewShift = (rng() - 0.5) * 0.01;

    const grid: GridCell[] = [];

    for (const tenor of TENORS) {
      const termFactor = tenor.days / 30;
      const timeDecay = Math.sqrt(30 / Math.max(tenor.days, 1));

      // ATM IV for this expiry
      const expiryAtmIv = clamp(
        u.baseAtmIv + u.termSlope * termFactor + ivShift + (rng() - 0.5) * 0.005,
        0.05,
        2.0,
      );

      for (const moneyness of MONEYNESS_LEVELS) {
        const strike = round2(spot * moneyness);
        const logM = Math.log(moneyness);

        // IV smile: put skew + convexity + call wing lift
        let iv = expiryAtmIv;
        iv += -u.skewSteepness * logM * timeDecay + skewShift;
        iv += u.smileConvexity * logM * logM * timeDecay;
        if (moneyness > 1.0) {
          iv += u.callWingLift * (moneyness - 1.0) * timeDecay * 0.5;
        }
        iv += (rng() - 0.5) * 0.003;
        iv = round4(clamp(iv, 0.03, 3.0));

        const greeks = computeGreeks(spot, strike, iv, tenor.days);

        grid.push({
          strike,
          moneyness: round2(moneyness),
          expiry: tenor.label,
          daysToExpiry: tenor.days,
          impliedVol: iv,
          delta: greeks.delta,
          gamma: greeks.gamma,
          vega: greeks.vega,
          theta: greeks.theta,
        });
      }
    }

    return {
      underlying: u.symbol,
      spot,
      historicalVol30D: hv30,
      historicalVol60D: hv60,
      historicalVol90D: hv90,
      grid,
    };
  });

  // ── 2. Skew data ──
  const skew: SkewEntry[] = UNDERLYINGS.map((u) => {
    const tenors: SkewTenorEntry[] = TENORS.map((tenor) => {
      const termFactor = tenor.days / 30;
      const timeDecay = Math.sqrt(30 / Math.max(tenor.days, 1));

      // 25-delta put IV is roughly at 0.93 moneyness, call at 1.07
      // 10-delta put IV is roughly at 0.88 moneyness, call at 1.12
      const atmIv = u.baseAtmIv + u.termSlope * termFactor;
      const logM25P = Math.log(0.93);
      const logM25C = Math.log(1.07);
      const logM10P = Math.log(0.88);
      const logM10C = Math.log(1.12);

      const iv25P = atmIv + (-u.skewSteepness * logM25P * timeDecay) + u.smileConvexity * logM25P * logM25P * timeDecay;
      const iv25C = atmIv + (-u.skewSteepness * logM25C * timeDecay) + u.smileConvexity * logM25C * logM25C * timeDecay
        + u.callWingLift * 0.07 * timeDecay * 0.5;
      const iv10P = atmIv + (-u.skewSteepness * logM10P * timeDecay) + u.smileConvexity * logM10P * logM10P * timeDecay;
      const iv10C = atmIv + (-u.skewSteepness * logM10C * timeDecay) + u.smileConvexity * logM10C * logM10C * timeDecay
        + u.callWingLift * 0.12 * timeDecay * 0.5;

      const skew25D = round4(jitter(iv25P - iv25C, 0.08));
      const skew10D = round4(jitter(iv10P - iv10C, 0.08));
      const butterfly25D = round4(jitter((iv25P + iv25C) / 2 - atmIv, 0.10));
      const riskReversal25D = round4(jitter(iv25C - iv25P, 0.08));

      return {
        tenor: tenor.label,
        daysToExpiry: tenor.days,
        skew25D,
        skew10D,
        butterfly25D,
        riskReversal25D,
      };
    });

    return { underlying: u.symbol, tenors };
  });

  // ── 3. Term structure ──
  const termStructure: TermStructureUnderlying[] = UNDERLYINGS.map((u) => {
    const curve: TermStructureEntry[] = TENORS.map((tenor) => {
      const termFactor = tenor.days / 30;
      const timeDecay = Math.sqrt(30 / Math.max(tenor.days, 1));
      const atmIv = round4(jitter(u.baseAtmIv + u.termSlope * termFactor, 0.04));

      const logM25P = Math.log(0.93);
      const logM25C = Math.log(1.07);
      const logM10P = Math.log(0.88);
      const logM10C = Math.log(1.12);

      const iv25P = round4(jitter(
        atmIv + (-u.skewSteepness * logM25P * timeDecay) + u.smileConvexity * logM25P * logM25P * timeDecay,
        0.03,
      ));
      const iv25C = round4(jitter(
        atmIv + (-u.skewSteepness * logM25C * timeDecay) + u.smileConvexity * logM25C * logM25C * timeDecay
          + u.callWingLift * 0.07 * timeDecay * 0.5,
        0.03,
      ));
      const iv10P = round4(jitter(
        atmIv + (-u.skewSteepness * logM10P * timeDecay) + u.smileConvexity * logM10P * logM10P * timeDecay,
        0.03,
      ));
      const iv10C = round4(jitter(
        atmIv + (-u.skewSteepness * logM10C * timeDecay) + u.smileConvexity * logM10C * logM10C * timeDecay
          + u.callWingLift * 0.12 * timeDecay * 0.5,
        0.03,
      ));

      return {
        tenor: tenor.label,
        iv_atm: atmIv,
        iv_25d_put: iv25P,
        iv_25d_call: iv25C,
        iv_10d_put: iv10P,
        iv_10d_call: iv10C,
      };
    });

    return { underlying: u.symbol, curve };
  });

  // ── 4. Volatility indices ──
  const mkIndex = (base: number, changePct: number): VolatilityIndex => {
    const level = round2(jitter(base, 0.06));
    const change = round2(level * (rng() - 0.5) * 2 * changePct);
    const changePercent = round2((change / Math.max(level - change, 0.01)) * 100);
    return { level, change, changePercent };
  };

  const volatilityIndices: VolatilityIndices = {
    vix: mkIndex(16.5, 0.04),
    vix9d: mkIndex(15.8, 0.06),
    vix3m: mkIndex(17.8, 0.03),
    vix6m: mkIndex(18.5, 0.025),
    vxn: mkIndex(19.2, 0.04),
    rvx: mkIndex(22.5, 0.045),
    move: mkIndex(95, 0.035),
    tyvix: mkIndex(5.2, 0.05),
    skewIndex: mkIndex(138, 0.02),
    vvix: mkIndex(88, 0.05),
  };

  // ── 5. Summary ──
  // Average ATM IV for SPX across tenors
  const spxSurface = surface.find((s) => s.underlying === 'SPX');
  const spxAtmCells = spxSurface
    ? spxSurface.grid.filter((c) => c.moneyness === 1.0)
    : [];
  const avgIV_SPX = spxAtmCells.length > 0
    ? round4(spxAtmCells.reduce((sum, c) => sum + c.impliedVol, 0) / spxAtmCells.length)
    : 0.17;

  // IV Rank: percentile of current 1M ATM IV within a simulated 52-week range
  const spx1mAtm = spxAtmCells.find((c) => c.expiry === '1M');
  const currentSpxIv = spx1mAtm ? spx1mAtm.impliedVol : 0.17;
  // Simulate 52w range: low ~12%, high ~28% for SPX
  const ivRank_SPX = Math.round(clamp(((currentSpxIv - 0.12) / (0.28 - 0.12)) * 100, 0, 100));

  // HV-IV spread (30D HV minus 1M ATM IV)
  const spxHv30 = spxSurface ? spxSurface.historicalVol30D : 0.14;
  const hvIvSpread = round4(spxHv30 - currentSpxIv);

  // Put/call skew from SPX skew data
  const spxSkew = skew.find((s) => s.underlying === 'SPX');
  const spx1mSkew = spxSkew?.tenors.find((t) => t.tenor === '1M');
  const putCallSkew = spx1mSkew ? spx1mSkew.skew25D : 0.03;

  // Term structure slope: contango if 6M > 1M ATM IV
  const spxTerm = termStructure.find((t) => t.underlying === 'SPX');
  const spx1mTerm = spxTerm?.curve.find((c) => c.tenor === '1M');
  const spx6mTerm = spxTerm?.curve.find((c) => c.tenor === '6M');
  const termStructureSlope: 'contango' | 'backwardation' =
    spx6mTerm && spx1mTerm && spx6mTerm.iv_atm > spx1mTerm.iv_atm
      ? 'contango'
      : 'backwardation';

  const summary: Summary = {
    avgIV_SPX,
    ivRank_SPX,
    hvIvSpread,
    putCallSkew,
    termStructureSlope,
  };

  return {
    surface,
    skew,
    termStructure,
    volatilityIndices,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: VolatilitySurfaceResponse; ts: number } | null = null;

// ── Route ──

// GET /api/volatility-surface
router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);

    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[VolatilitySurface] Error:', (err as Error).message);

    // Stale fallback
    if (cache) return res.json(cache.data);

    res.status(500).json({ error: 'Failed to generate volatility surface data' });
  }
});

export default router;
