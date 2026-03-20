import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

type StripType = 'ci' | 'bp' | 'np';
type RichCheapStatus = 'RICH' | 'CHEAP' | 'FAIR';

interface Strip {
  cusip: string;
  type: StripType;
  maturityDate: string;
  yearsToMaturity: number;
  price: number;
  yield: number;
  spread: number;       // bps vs on-the-run Treasury
  duration: number;
  convexity: number;
  dailyChange: number;  // price change
  weeklyChange: number; // price change
}

interface CurvePoint {
  maturity: number;     // years
  yield: number;
  previousYield: number;
  change: number;       // bps
}

interface RichCheapEntry {
  cusip: string;
  maturityDate: string;
  yearsToMaturity: number;
  marketYield: number;
  fittedYield: number;
  deviation: number;    // bps
  status: RichCheapStatus;
}

interface VolumeLeader {
  cusip: string;
  type: StripType;
  maturityDate: string;
  yearsToMaturity: number;
  price: number;
  yield: number;
  volume: number;       // $M face value
  dailyChange: number;
}

interface MaturityBucket {
  label: string;
  avgYield: number;
  count: number;
}

interface TreasuryStripsSummary {
  totalOutstanding: number; // $B
  maturityBuckets: MaturityBucket[];
  timestamp: string;
}

interface TreasuryStripsResponse {
  strips: Strip[];
  curve: CurvePoint[];
  richCheap: RichCheapEntry[];
  volumeLeaders: VolumeLeader[];
  summary: TreasuryStripsSummary;
}

// ── Cache ──

let cache: { data: TreasuryStripsResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Configuration ──

interface StripConfig {
  cusipBase: string;
  type: StripType;
  yearsToMaturity: number;
  basePrice: number;
  baseYield: number;
  baseSpread: number; // bps
}

// Realistic STRIPS configurations from 6 months to 30 years
const STRIP_CONFIGS: StripConfig[] = [
  // Short-term STRIPS (price 95-99, yield 4.2-4.8%)
  { cusipBase: '912820A', type: 'ci', yearsToMaturity: 0.5,  basePrice: 97.85, baseYield: 4.35, baseSpread: -2.0 },
  { cusipBase: '912820B', type: 'np', yearsToMaturity: 1.0,  basePrice: 95.72, baseYield: 4.42, baseSpread: -1.5 },
  { cusipBase: '912820C', type: 'ci', yearsToMaturity: 1.5,  basePrice: 93.65, baseYield: 4.38, baseSpread: -0.8 },
  { cusipBase: '912820D', type: 'np', yearsToMaturity: 2.0,  basePrice: 91.62, baseYield: 4.32, baseSpread: 0.5 },

  // Medium-term STRIPS (price 70-90, yield 4.0-4.5%)
  { cusipBase: '912820E', type: 'ci', yearsToMaturity: 3.0,  basePrice: 87.45, baseYield: 4.18, baseSpread: 1.2 },
  { cusipBase: '912820F', type: 'bp', yearsToMaturity: 4.0,  basePrice: 83.80, baseYield: 4.12, baseSpread: 2.5 },
  { cusipBase: '912820G', type: 'ci', yearsToMaturity: 5.0,  basePrice: 80.25, baseYield: 4.08, baseSpread: 3.8 },
  { cusipBase: '912820H', type: 'np', yearsToMaturity: 6.0,  basePrice: 77.10, baseYield: 4.15, baseSpread: 4.5 },
  { cusipBase: '912820J', type: 'ci', yearsToMaturity: 7.0,  basePrice: 73.85, baseYield: 4.22, baseSpread: 5.2 },
  { cusipBase: '912820K', type: 'bp', yearsToMaturity: 8.0,  basePrice: 71.20, baseYield: 4.28, baseSpread: 6.0 },
  { cusipBase: '912820L', type: 'ci', yearsToMaturity: 9.0,  basePrice: 68.40, baseYield: 4.32, baseSpread: 6.8 },
  { cusipBase: '912820M', type: 'np', yearsToMaturity: 10.0, basePrice: 65.80, baseYield: 4.35, baseSpread: 7.5 },

  // Long-term STRIPS (price 30-60, yield 4.3-4.8%)
  { cusipBase: '912820N', type: 'ci', yearsToMaturity: 12.0, basePrice: 59.50, baseYield: 4.38, baseSpread: 8.2 },
  { cusipBase: '912820P', type: 'bp', yearsToMaturity: 15.0, basePrice: 51.20, baseYield: 4.42, baseSpread: 9.5 },
  { cusipBase: '912820Q', type: 'ci', yearsToMaturity: 17.0, basePrice: 46.30, baseYield: 4.48, baseSpread: 10.8 },
  { cusipBase: '912820R', type: 'np', yearsToMaturity: 20.0, basePrice: 40.15, baseYield: 4.55, baseSpread: 11.5 },
  { cusipBase: '912820S', type: 'bp', yearsToMaturity: 22.0, basePrice: 37.20, baseYield: 4.58, baseSpread: 12.2 },
  { cusipBase: '912820T', type: 'ci', yearsToMaturity: 25.0, basePrice: 33.45, baseYield: 4.62, baseSpread: 13.0 },
  { cusipBase: '912820U', type: 'bp', yearsToMaturity: 27.0, basePrice: 31.10, baseYield: 4.68, baseSpread: 13.8 },
  { cusipBase: '912820V', type: 'np', yearsToMaturity: 30.0, basePrice: 28.50, baseYield: 4.75, baseSpread: 14.5 },
];

// ── Helpers ──

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function formatMaturityDate(yearsToMaturity: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.round(yearsToMaturity * 12));
  // Align to 15th of the month (standard Treasury convention)
  d.setDate(15);
  return d.toISOString().slice(0, 10);
}

function generateCusip(base: string, rng: () => number): string {
  const suffix = Math.floor(rng() * 90 + 10).toString();
  return base + suffix;
}

// ── Data generation ──

function generateStrips(rng: () => number): Strip[] {
  return STRIP_CONFIGS.map((cfg) => {
    const cusip = generateCusip(cfg.cusipBase, rng);
    const maturityDate = formatMaturityDate(cfg.yearsToMaturity);

    // Price jitter scaled to maturity (longer = more volatility)
    const priceJitterScale = cfg.yearsToMaturity < 3 ? 0.3 : cfg.yearsToMaturity < 10 ? 1.2 : 2.5;
    const priceJitter = (rng() - 0.5) * priceJitterScale;
    const price = round(cfg.basePrice + priceJitter, 3);

    // Yield jitter
    const yieldJitter = (rng() - 0.5) * 0.12;
    const yld = round(cfg.baseYield + yieldJitter, 3);

    // Spread vs on-the-run (bps), range -5 to +15
    const spreadJitter = (rng() - 0.5) * 3.0;
    const spread = round(cfg.baseSpread + spreadJitter, 1);

    // Duration approximately equals years to maturity for zero-coupon bonds
    const durationJitter = (rng() - 0.5) * 0.1;
    const duration = round(cfg.yearsToMaturity + durationJitter, 2);

    // Convexity: roughly (duration^2 + duration) / (1 + yield/100)^2 for zero-coupon
    const rawConvexity = (duration * duration + duration) / Math.pow(1 + yld / 100, 2);
    const convexityJitter = (rng() - 0.5) * rawConvexity * 0.02;
    const convexity = round(rawConvexity + convexityJitter, 2);

    // Daily change: small, scaled by duration
    const dailyChange = round((rng() - 0.5) * 0.08 * duration / 10, 3);

    // Weekly change: larger, correlated direction
    const weeklyDirection = dailyChange > 0 ? 0.6 : 0.4;
    const weeklyBase = (rng() < weeklyDirection ? 1 : -1) * rng() * 0.3 * duration / 10;
    const weeklyChange = round(weeklyBase, 3);

    return {
      cusip,
      type: cfg.type,
      maturityDate,
      yearsToMaturity: cfg.yearsToMaturity,
      price,
      yield: yld,
      spread,
      duration,
      convexity,
      dailyChange,
      weeklyChange,
    };
  });
}

function generateCurve(rng: () => number): CurvePoint[] {
  // Zero-coupon yield curve from 0.5 to 30 years
  const maturities = [0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30];

  return maturities.map((mat) => {
    // Base yields follow a realistic curve shape
    let baseYield: number;
    if (mat <= 1) {
      baseYield = 4.35 + (mat - 0.5) * 0.10;
    } else if (mat <= 5) {
      baseYield = 4.45 - (mat - 1) * 0.08;
    } else if (mat <= 10) {
      baseYield = 4.13 + (mat - 5) * 0.04;
    } else {
      baseYield = 4.33 + (mat - 10) * 0.02;
    }

    const yieldJitter = (rng() - 0.5) * 0.08;
    const currentYield = round(baseYield + yieldJitter, 3);

    // Previous yield (yesterday) - small shift
    const prevShift = (rng() - 0.5) * 0.06;
    const previousYield = round(currentYield + prevShift, 3);

    const change = round((currentYield - previousYield) * 100, 1); // bps

    return {
      maturity: mat,
      yield: currentYield,
      previousYield,
      change,
    };
  });
}

function generateRichCheap(strips: Strip[], rng: () => number): RichCheapEntry[] {
  return strips.map((s) => {
    // Fitted yield from the theoretical curve (small deviation from market)
    const deviationBps = round((rng() - 0.5) * 12, 1); // -6 to +6 bps typical
    const fittedYield = round(s.yield - deviationBps / 100, 3);

    let status: RichCheapStatus;
    if (deviationBps < -2.0) {
      status = 'RICH';   // market yield below fitted = overpriced
    } else if (deviationBps > 2.0) {
      status = 'CHEAP';  // market yield above fitted = underpriced
    } else {
      status = 'FAIR';
    }

    return {
      cusip: s.cusip,
      maturityDate: s.maturityDate,
      yearsToMaturity: s.yearsToMaturity,
      marketYield: s.yield,
      fittedYield,
      deviation: deviationBps,
      status,
    };
  });
}

function generateVolumeLeaders(strips: Strip[], rng: () => number): VolumeLeader[] {
  // Select top 10 most actively traded STRIPS
  const withVolume = strips.map((s) => {
    // Shorter maturities and benchmarks trade more
    const baseVolume = s.yearsToMaturity <= 2 ? 800
      : s.yearsToMaturity <= 5 ? 500
      : s.yearsToMaturity <= 10 ? 350
      : s.yearsToMaturity <= 20 ? 200
      : 120;

    const volumeJitter = (rng() - 0.5) * baseVolume * 0.6;
    const volume = round(Math.max(baseVolume + volumeJitter, 20), 1); // $M face value

    return { ...s, volume };
  });

  // Sort by volume descending and take top 10
  withVolume.sort((a, b) => b.volume - a.volume);

  return withVolume.slice(0, 10).map((s) => ({
    cusip: s.cusip,
    type: s.type,
    maturityDate: s.maturityDate,
    yearsToMaturity: s.yearsToMaturity,
    price: s.price,
    yield: s.yield,
    volume: s.volume,
    dailyChange: s.dailyChange,
  }));
}

function generateSummary(strips: Strip[]): TreasuryStripsSummary {
  // Total outstanding: realistic total for Treasury STRIPS market
  const totalOutstanding = 392.5; // $B, approximate real-world figure

  // Maturity buckets
  const bucketDefs: { label: string; minYears: number; maxYears: number }[] = [
    { label: '0-2Y',   minYears: 0,  maxYears: 2 },
    { label: '2-5Y',   minYears: 2,  maxYears: 5 },
    { label: '5-10Y',  minYears: 5,  maxYears: 10 },
    { label: '10-20Y', minYears: 10, maxYears: 20 },
    { label: '20-30Y', minYears: 20, maxYears: 30 },
  ];

  const maturityBuckets: MaturityBucket[] = bucketDefs.map((bucket) => {
    const inBucket = strips.filter(
      (s) => s.yearsToMaturity > bucket.minYears && s.yearsToMaturity <= bucket.maxYears
    );
    // Handle the 0-2Y bucket edge case for 0.5yr maturity
    const finalBucket = bucket.minYears === 0
      ? strips.filter((s) => s.yearsToMaturity <= bucket.maxYears)
      : inBucket;

    const avgYield = finalBucket.length > 0
      ? round(finalBucket.reduce((sum, s) => sum + s.yield, 0) / finalBucket.length, 3)
      : 0;

    return {
      label: bucket.label,
      avgYield,
      count: finalBucket.length,
    };
  });

  return {
    totalOutstanding,
    maturityBuckets,
    timestamp: new Date().toISOString(),
  };
}

function generateTreasuryStripsData(): TreasuryStripsResponse {
  const rng = seededRandom('treasury-strips');

  const strips = generateStrips(rng);
  const curve = generateCurve(rng);
  const richCheap = generateRichCheap(strips, rng);
  const volumeLeaders = generateVolumeLeaders(strips, rng);
  const summary = generateSummary(strips);

  return { strips, curve, richCheap, volumeLeaders, summary };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateTreasuryStripsData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TreasuryStrips] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate treasury STRIPS data' });
  }
});

export default router;
