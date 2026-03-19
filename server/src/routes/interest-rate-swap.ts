import { Router } from 'express';

const router = Router();

// -- Deterministic seeded RNG --

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// -- Types --

interface SwapCurvePoint {
  tenor: string;
  rate: number;
  change1D: number;
  change1W: number;
  swapSpread: number;
}

interface CrossCurrencySwap {
  pair: string;
  tenor5Y_Basis: number;
  change1D: number;
  change1M: number;
  direction: 'USD premium' | 'Foreign premium';
}

interface OvernightRate {
  rate: string;
  current: number;
  change1D: number;
  effective: number;
  volumeYesterday: number;
}

interface ForwardRate {
  forward: string;
  rate: number;
  change1D: number;
  impliedHikes: number;
  vsSpot: number;
}

interface SwapVolatility {
  swaption: string;
  normalVol: number;
  change1D: number;
  logNormalVol: number;
  skew: number;
}

interface MarketMetrics {
  totalNotionalOutstanding: number;
  dailyClearingVolume: number;
  compressionVolume: number;
  ccpMarketShare: { lch: number; cme: number; eurex: number };
  basisSwapSpread3M6M: number;
}

interface InterestRateSwapResponse {
  usdSwapCurve: SwapCurvePoint[];
  crossCurrencySwaps: CrossCurrencySwap[];
  overnightRates: OvernightRate[];
  forwardRates: ForwardRate[];
  swapVolatility: SwapVolatility[];
  marketMetrics: MarketMetrics;
  generatedAt: string;
}

// -- Configurations --

interface TenorConfig {
  tenor: string;
  rateRange: [number, number];
  spreadRange: [number, number];
}

const TENOR_CONFIGS: TenorConfig[] = [
  { tenor: '1Y', rateRange: [4.50, 5.20], spreadRange: [-10, 5] },
  { tenor: '2Y', rateRange: [4.20, 4.80], spreadRange: [-15, 2] },
  { tenor: '3Y', rateRange: [4.05, 4.65], spreadRange: [-18, 0] },
  { tenor: '5Y', rateRange: [3.80, 4.50], spreadRange: [-22, -5] },
  { tenor: '7Y', rateRange: [3.65, 4.35], spreadRange: [-28, -8] },
  { tenor: '10Y', rateRange: [3.50, 4.20], spreadRange: [-30, 0] },
  { tenor: '15Y', rateRange: [3.40, 4.10], spreadRange: [-40, -12] },
  { tenor: '30Y', rateRange: [3.30, 4.00], spreadRange: [-50, -20] },
];

interface XccyConfig {
  pair: string;
  basisRange: [number, number];
}

const XCCY_CONFIGS: XccyConfig[] = [
  { pair: 'USD/EUR', basisRange: [-35, -5] },
  { pair: 'USD/JPY', basisRange: [-80, -20] },
  { pair: 'USD/GBP', basisRange: [-25, 10] },
  { pair: 'EUR/GBP', basisRange: [-15, 20] },
  { pair: 'USD/CHF', basisRange: [-40, -5] },
  { pair: 'USD/AUD', basisRange: [0, 20] },
];

interface OvernightConfig {
  rate: string;
  currentRange: [number, number];
  effectiveRange: [number, number];
  volumeRange: [number, number];
}

const OVERNIGHT_CONFIGS: OvernightConfig[] = [
  { rate: 'SOFR', currentRange: [5.30, 5.40], effectiveRange: [5.31, 5.38], volumeRange: [1800, 2200] },
  { rate: 'ESTR', currentRange: [3.85, 3.95], effectiveRange: [3.86, 3.94], volumeRange: [40, 60] },
  { rate: 'SONIA', currentRange: [5.18, 5.28], effectiveRange: [5.19, 5.27], volumeRange: [55, 75] },
  { rate: 'TONA', currentRange: [-0.02, 0.08], effectiveRange: [-0.01, 0.07], volumeRange: [15, 30] },
  { rate: 'AONIA', currentRange: [4.30, 4.40], effectiveRange: [4.31, 4.39], volumeRange: [5, 12] },
];

interface ForwardConfig {
  forward: string;
  rateRange: [number, number];
  vsSpotRange: [number, number];
  hikesRange: [number, number];
}

const FORWARD_CONFIGS: ForwardConfig[] = [
  { forward: '1Y1Y', rateRange: [3.80, 4.60], vsSpotRange: [-80, -20], hikesRange: [-4, -1] },
  { forward: '2Y1Y', rateRange: [3.50, 4.30], vsSpotRange: [-100, -30], hikesRange: [-5, -2] },
  { forward: '5Y5Y', rateRange: [3.20, 4.00], vsSpotRange: [-120, -40], hikesRange: [-6, -2] },
  { forward: '1Y2Y', rateRange: [3.60, 4.40], vsSpotRange: [-90, -25], hikesRange: [-5, -1] },
  { forward: '3Y2Y', rateRange: [3.40, 4.20], vsSpotRange: [-110, -35], hikesRange: [-6, -2] },
];

interface VolConfig {
  swaption: string;
  normalVolRange: [number, number];
  logNormalRange: [number, number];
  skewRange: [number, number];
}

const VOL_CONFIGS: VolConfig[] = [
  { swaption: '1Yx10Y', normalVolRange: [85, 130], logNormalRange: [18, 28], skewRange: [-0.15, 0.10] },
  { swaption: '1Yx5Y', normalVolRange: [80, 120], logNormalRange: [17, 26], skewRange: [-0.12, 0.08] },
  { swaption: '3Mx10Y', normalVolRange: [90, 125], logNormalRange: [19, 27], skewRange: [-0.18, 0.12] },
  { swaption: '5Yx5Y', normalVolRange: [60, 100], logNormalRange: [14, 22], skewRange: [-0.10, 0.06] },
];

// -- Cache --

const CACHE_TTL = 5 * 60_000;
let cache: { data: InterestRateSwapResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

// -- Data generation --

function generate(): InterestRateSwapResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('interest-rate-swap-' + today));

  const lerp = (min: number, max: number) => min + rng() * (max - min);

  // -- 1. USD Swap Curve --

  const usdSwapCurve: SwapCurvePoint[] = TENOR_CONFIGS.map((cfg) => {
    const rate = round(lerp(cfg.rateRange[0], cfg.rateRange[1]), 4);
    const change1D = round(lerp(-5.0, 5.0), 1);
    const change1W = round(lerp(-12.0, 12.0), 1);
    const swapSpread = round(lerp(cfg.spreadRange[0], cfg.spreadRange[1]), 1);

    return { tenor: cfg.tenor, rate, change1D, change1W, swapSpread };
  });

  // -- 2. Cross-Currency Swaps --

  const crossCurrencySwaps: CrossCurrencySwap[] = XCCY_CONFIGS.map((cfg) => {
    const tenor5Y_Basis = round(lerp(cfg.basisRange[0], cfg.basisRange[1]), 1);
    const change1D = round(lerp(-3.0, 3.0), 1);
    const change1M = round(lerp(-10.0, 10.0), 1);
    const direction: 'USD premium' | 'Foreign premium' = tenor5Y_Basis < 0 ? 'Foreign premium' : 'USD premium';

    return { pair: cfg.pair, tenor5Y_Basis, change1D, change1M, direction };
  });

  // -- 3. Overnight Rates --

  const overnightRates: OvernightRate[] = OVERNIGHT_CONFIGS.map((cfg) => {
    const current = round(lerp(cfg.currentRange[0], cfg.currentRange[1]), 4);
    const change1D = round(lerp(-2.0, 2.0), 1);
    const effective = round(lerp(cfg.effectiveRange[0], cfg.effectiveRange[1]), 4);
    const volumeYesterday = round(lerp(cfg.volumeRange[0], cfg.volumeRange[1]), 1);

    return { rate: cfg.rate, current, change1D, effective, volumeYesterday };
  });

  // -- 4. Forward Rates --

  const forwardRates: ForwardRate[] = FORWARD_CONFIGS.map((cfg) => {
    const rate = round(lerp(cfg.rateRange[0], cfg.rateRange[1]), 4);
    const change1D = round(lerp(-6.0, 6.0), 1);
    const impliedHikes = round(lerp(cfg.hikesRange[0], cfg.hikesRange[1]), 1);
    const vsSpot = round(lerp(cfg.vsSpotRange[0], cfg.vsSpotRange[1]), 1);

    return { forward: cfg.forward, rate, change1D, impliedHikes, vsSpot };
  });

  // -- 5. Swap Volatility --

  const swapVolatility: SwapVolatility[] = VOL_CONFIGS.map((cfg) => {
    const normalVol = round(lerp(cfg.normalVolRange[0], cfg.normalVolRange[1]), 1);
    const change1D = round(lerp(-4.0, 4.0), 1);
    const logNormalVol = round(lerp(cfg.logNormalRange[0], cfg.logNormalRange[1]), 2);
    const skew = round(lerp(cfg.skewRange[0], cfg.skewRange[1]), 3);

    return { swaption: cfg.swaption, normalVol, change1D, logNormalVol, skew };
  });

  // -- 6. Market Metrics --

  const totalNotionalOutstanding = round(lerp(300, 500), 1);
  const dailyClearingVolume = round(lerp(3, 8), 2);
  const compressionVolume = round(lerp(1.5, 5.0), 2);
  const lch = round(clamp(lerp(55, 70), 55, 70), 1);
  const cme = round(clamp(lerp(18, 30), 18, 30), 1);
  const eurex = round(clamp(100 - lch - cme, 5, 20), 1);
  const basisSwapSpread3M6M = round(lerp(-5.0, 5.0), 2);

  const marketMetrics: MarketMetrics = {
    totalNotionalOutstanding,
    dailyClearingVolume,
    compressionVolume,
    ccpMarketShare: { lch, cme, eurex },
    basisSwapSpread3M6M,
  };

  return {
    usdSwapCurve,
    crossCurrencySwaps,
    overnightRates,
    forwardRates,
    swapVolatility,
    marketMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[InterestRateSwap] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate interest rate swap data' });
  }
});

export default router;
