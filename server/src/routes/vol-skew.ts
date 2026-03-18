import { Router } from 'express';

const router = Router();

// ── Types ──

interface SkewPoint {
  delta: number;
  strike: number;
  iv: number;
  moneyness: number;
}

interface SkewExpiry {
  expiry: string;
  daysToExpiry: number;
  atmIv: number;
  skew25d: number;
  skew10d: number;
  butterfly25d: number;
  riskReversal25d: number;
  points: SkewPoint[];
}

interface SkewSymbol {
  symbol: string;
  spot: number;
  skewExpiries: SkewExpiry[];
  skewHistory: number[];
  currentSkewPercentile: number;
  signal: string | null;
}

interface VolSkewResponse {
  data: SkewSymbol;
  availableSymbols: string[];
  timestamp: string;
}

// ── Supported symbols ──

const SUPPORTED_SYMBOLS = [
  'SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT', 'META', 'IWM', 'GLD', 'USO', 'TLT',
];

// ── Spot prices (baseline, jittered per request cycle) ──

const BASE_SPOTS: Record<string, number> = {
  SPY: 585, QQQ: 505, AAPL: 230, TSLA: 265, NVDA: 140, AMZN: 210,
  MSFT: 435, META: 610, IWM: 225, GLD: 290, USO: 75, TLT: 90,
};

// ── Skew profiles per symbol class ──

interface SkewProfile {
  baseAtmIv: number;
  skew25dRange: [number, number];   // typical 25d skew min/max
  skew10dRange: [number, number];
  termSlope: number;                // IV increase per month in term structure
  type: 'index' | 'stock' | 'commodity' | 'bond';
}

const SKEW_PROFILES: Record<string, SkewProfile> = {
  SPY:  { baseAtmIv: 16, skew25dRange: [-7, -3], skew10dRange: [-14, -8], termSlope: 0.4, type: 'index' },
  QQQ:  { baseAtmIv: 19, skew25dRange: [-6, -2.5], skew10dRange: [-12, -7], termSlope: 0.35, type: 'index' },
  IWM:  { baseAtmIv: 22, skew25dRange: [-6, -2], skew10dRange: [-13, -6], termSlope: 0.5, type: 'index' },
  AAPL: { baseAtmIv: 24, skew25dRange: [-5, -1], skew10dRange: [-10, -4], termSlope: 0.3, type: 'stock' },
  TSLA: { baseAtmIv: 55, skew25dRange: [-3, 2], skew10dRange: [-8, 1], termSlope: -0.5, type: 'stock' },
  NVDA: { baseAtmIv: 45, skew25dRange: [-4, 1], skew10dRange: [-9, 0], termSlope: -0.3, type: 'stock' },
  AMZN: { baseAtmIv: 28, skew25dRange: [-5, -1], skew10dRange: [-11, -4], termSlope: 0.25, type: 'stock' },
  MSFT: { baseAtmIv: 22, skew25dRange: [-5, -1.5], skew10dRange: [-10, -5], termSlope: 0.3, type: 'stock' },
  META: { baseAtmIv: 32, skew25dRange: [-4, 0], skew10dRange: [-9, -2], termSlope: -0.2, type: 'stock' },
  GLD:  { baseAtmIv: 15, skew25dRange: [-2, 1], skew10dRange: [-5, 2], termSlope: 0.6, type: 'commodity' },
  USO:  { baseAtmIv: 30, skew25dRange: [-1, 3], skew10dRange: [-3, 5], termSlope: 0.8, type: 'commodity' },
  TLT:  { baseAtmIv: 18, skew25dRange: [-1, 2], skew10dRange: [-3, 3], termSlope: 0.5, type: 'bond' },
};

// ── Expiry definitions ──

const EXPIRY_DEFS: Array<{ label: string; days: number }> = [
  { label: '1W', days: 7 },
  { label: '2W', days: 14 },
  { label: '1M', days: 30 },
  { label: '2M', days: 60 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

// ── Seeded random for deterministic-ish data per symbol+cycle ──

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

function generateSkewData(symbol: string, cycleSeed: number): SkewSymbol {
  const profile = SKEW_PROFILES[symbol] ?? SKEW_PROFILES['SPY'];
  const rng = seededRandom(cycleSeed + symbol.charCodeAt(0) * 1000 + symbol.charCodeAt(1));

  // Jitter spot price +/- 1%
  const spotBase = BASE_SPOTS[symbol] ?? 100;
  const spot = Math.round(spotBase * (1 + (rng() - 0.5) * 0.02) * 100) / 100;

  // Random factor for this cycle (shifts skew within its range)
  const skewFactor = rng();
  const base25dSkew = lerp(profile.skew25dRange[0], profile.skew25dRange[1], skewFactor);
  const base10dSkew = lerp(profile.skew10dRange[0], profile.skew10dRange[1], skewFactor);

  // Generate expiry data
  const skewExpiries: SkewExpiry[] = EXPIRY_DEFS.map((def) => {
    const termFactor = def.days / 30; // months
    const atmIv = Math.round((profile.baseAtmIv + profile.termSlope * termFactor + (rng() - 0.5) * 1.5) * 100) / 100;

    // Skew flattens with time: short-dated = steeper skew
    const timeDecay = Math.sqrt(30 / Math.max(def.days, 1));
    const skew25d = Math.round((base25dSkew * timeDecay + (rng() - 0.5) * 0.8) * 100) / 100;
    const skew10d = Math.round((base10dSkew * timeDecay + (rng() - 0.5) * 1.2) * 100) / 100;

    // Butterfly: (25d put IV + 25d call IV) / 2 - ATM IV (always positive = smile curvature)
    const butterfly25d = Math.round((Math.abs(skew25d) * 0.4 + rng() * 0.5) * 100) / 100;

    // Risk reversal: 25d call IV - 25d put IV (negative for equities = puts more expensive)
    const riskReversal25d = Math.round((-skew25d + (rng() - 0.5) * 0.3) * 100) / 100;

    // Generate 5 delta points
    const deltas = [10, 25, 50, 75, 90];
    const points: SkewPoint[] = deltas.map((delta) => {
      // Delta 50 = ATM, lower delta = OTM puts (higher IV for equities), higher delta = OTM calls
      let iv: number;
      if (delta === 50) {
        iv = atmIv;
      } else if (delta < 50) {
        // OTM put side (lower delta = deeper OTM)
        const putDepth = (50 - delta) / 50; // 0 at ATM, 0.8 at 10-delta
        iv = atmIv - skew25d * putDepth * 2 + butterfly25d * putDepth;
      } else {
        // OTM call side (higher delta = deeper OTM calls)
        const callDepth = (delta - 50) / 50;
        iv = atmIv + skew25d * callDepth * 0.5 + butterfly25d * callDepth * 0.6;
      }
      iv = Math.round(Math.max(iv, 2) * 100) / 100;

      // Moneyness and strike from delta approximation
      // Rough mapping: delta 10 ~ 0.88 moneyness, 25 ~ 0.94, 50 ~ 1.0, 75 ~ 1.06, 90 ~ 1.12
      const moneynessMap: Record<number, number> = { 10: 0.88, 25: 0.94, 50: 1.0, 75: 1.06, 90: 1.12 };
      const moneyness = Math.round((moneynessMap[delta] ?? 1.0) * 1000) / 1000;
      const strike = Math.round(spot * moneyness * 100) / 100;

      return { delta, strike, iv, moneyness };
    });

    return {
      expiry: def.label,
      daysToExpiry: def.days,
      atmIv,
      skew25d,
      skew10d,
      butterfly25d,
      riskReversal25d,
      points,
    };
  });

  // Skew history: 20 data points of 25d skew for the default (1M) expiry
  const skewHistory: number[] = [];
  const histRng = seededRandom(cycleSeed + symbol.charCodeAt(0) * 777);
  let histSkew = base25dSkew;
  for (let i = 0; i < 20; i++) {
    histSkew += (histRng() - 0.5) * 1.0;
    histSkew = clamp(histSkew, profile.skew25dRange[0] - 2, profile.skew25dRange[1] + 2);
    skewHistory.push(Math.round(histSkew * 100) / 100);
  }

  // 52-week percentile: where current 25d skew falls in a wider range
  const currentSkew = skewExpiries.find((e) => e.expiry === '1M')?.skew25d ?? base25dSkew;
  const fullRange = profile.skew25dRange[1] - profile.skew25dRange[0] + 4; // +4 for tails
  const fromMin = currentSkew - (profile.skew25dRange[0] - 2);
  const currentSkewPercentile = Math.round(clamp((fromMin / fullRange) * 100, 1, 99));

  // Signal detection
  let signal: string | null = null;
  if (currentSkew < profile.skew25dRange[0] - 1) {
    signal = 'STEEP_SKEW';
  } else if (currentSkew > profile.skew25dRange[1] + 1) {
    signal = 'FLAT_SKEW';
  } else if (currentSkew > 0 && profile.type === 'index') {
    signal = 'SKEW_INVERSION';
  }

  return {
    symbol,
    spot,
    skewExpiries,
    skewHistory,
    currentSkewPercentile,
    signal,
  };
}

// ── Cache ──

const cache = new Map<string, { data: VolSkewResponse; expiresAt: number }>();
const CACHE_TTL = 3 * 60_000; // 3 minutes

// ── Route ──

// GET /api/vol-skew?symbol=SPY
router.get('/', (req, res) => {
  try {
    const rawSymbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim().toUpperCase() : 'SPY';
    const symbol = SUPPORTED_SYMBOLS.includes(rawSymbol) ? rawSymbol : 'SPY';
    const now = Date.now();

    // Check cache
    const cached = cache.get(symbol);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    // Generate deterministic data per 3-minute cycle
    const cycleSeed = Math.floor(now / CACHE_TTL);
    const skewData = generateSkewData(symbol, cycleSeed);

    const response: VolSkewResponse = {
      data: skewData,
      availableSymbols: SUPPORTED_SYMBOLS,
      timestamp: new Date().toISOString(),
    };

    cache.set(symbol, { data: response, expiresAt: now + CACHE_TTL });

    // Evict expired entries
    if (cache.size > 50) {
      for (const [key, val] of cache) {
        if (now > val.expiresAt) cache.delete(key);
      }
    }

    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[VolSkew] Error:', message);

    const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim().toUpperCase() : 'SPY';
    const cached = cache.get(symbol);
    if (cached) return res.json(cached.data);

    res.status(500).json({ error: 'Failed to fetch vol skew data' });
  }
});

export default router;
