import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Types ──

interface SpreadRow {
  currency: string;
  tenor: string;
  swapRate: number;
  treasuryRate: number;
  spread: number;
  change1d: number;
  change1w: number;
  percentile: number;
}

interface HistoricalRange {
  currency: string;
  current: number;
  low1Y: number;
  high1Y: number;
  mean1Y: number;
  percentile: number;
  zScore: number;
}

interface FlyAnalysis {
  currency: string;
  fly2s5s10s: number;
  fly5s10s30s: number;
  change1d: number;
  signal: string;
}

interface CrossCurrencyRow {
  tenor: string;
  usd: number;
  eur: number;
  gbp: number;
  jpy: number;
}

interface SwapSpreadMonitorResponse {
  summary: {
    usd10YSpread: number;
    eur10YSpread: number;
    gbp10YSpread: number;
    jpy10YSpread: number;
    avgChange1d: number;
  };
  spreads: SpreadRow[];
  historicalRange: HistoricalRange[];
  flyAnalysis: FlyAnalysis[];
  crossCurrencyComparison: CrossCurrencyRow[];
  generatedAt: string;
}

// ── Static configs ──

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'] as const;
const TENORS = ['2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'] as const;
const TENOR_YEARS: Record<string, number> = {
  '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7,
  '10Y': 10, '15Y': 15, '20Y': 20, '30Y': 30,
};

/**
 * Swap spread profiles per currency.
 * base2Y / base10Y / base30Y: typical swap spreads in bp at anchor tenors.
 * treasuryBase2Y / treasuryBase10Y / treasuryBase30Y: treasury yield anchors.
 * swapPremium: overall swap rate premium offset (bp) added to treasury yield.
 */
interface CurrencyProfile {
  base2Y: number; base10Y: number; base30Y: number;
  treasuryBase2Y: number; treasuryBase10Y: number; treasuryBase30Y: number;
}

const PROFILES: Record<string, CurrencyProfile> = {
  USD: { base2Y: 10, base10Y: 2, base30Y: -20, treasuryBase2Y: 4.52, treasuryBase10Y: 4.28, treasuryBase30Y: 4.48 },
  EUR: { base2Y: 28, base10Y: 18, base30Y: 8, treasuryBase2Y: 2.82, treasuryBase10Y: 2.65, treasuryBase30Y: 2.58 },
  GBP: { base2Y: 22, base10Y: 12, base30Y: -5, treasuryBase2Y: 4.68, treasuryBase10Y: 4.35, treasuryBase30Y: 4.15 },
  JPY: { base2Y: 5, base10Y: 2, base30Y: -2, treasuryBase2Y: 0.32, treasuryBase10Y: 0.85, treasuryBase30Y: 1.22 },
};

const KEY_TENORS = ['2Y', '5Y', '10Y', '30Y'];

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60_000;
let cache: { data: SwapSpreadMonitorResponse | null; ts: number } = { data: null, ts: 0 };

// ── Helpers ──

function interpolate(years: number, v2: number, v10: number, v30: number): number {
  if (years <= 2) return v2;
  if (years <= 10) {
    const t = (years - 2) / 8;
    return v2 + t * (v10 - v2);
  }
  const t = (years - 10) / 20;
  return v10 + t * (v30 - v10);
}

// ── Data generation ──

function generate(): SwapSpreadMonitorResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-swap-spread-monitor'));
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // ── Build spread grid ──

  const spreads: SpreadRow[] = [];
  // Store spreads keyed by ccy-tenor for later lookups
  const spreadMap: Record<string, number> = {};

  for (const ccy of CURRENCIES) {
    const p = PROFILES[ccy];

    for (const tenor of TENORS) {
      const years = TENOR_YEARS[tenor];

      // Base swap spread in bp
      const baseSpread = interpolate(years, p.base2Y, p.base10Y, p.base30Y);
      const spreadNoise = (rng() - 0.5) * 6;
      const spread = roundTo(baseSpread + spreadNoise, 1);

      // Treasury yield
      const baseTreasury = interpolate(years, p.treasuryBase2Y, p.treasuryBase10Y, p.treasuryBase30Y);
      const treasuryNoise = (rng() - 0.5) * 0.06;
      const treasuryRate = roundTo(baseTreasury + treasuryNoise, 3);

      // Swap rate = treasury + spread/100
      const swapRate = roundTo(treasuryRate + spread / 100, 3);

      // Changes
      const change1d = roundTo((rng() - 0.5) * 3, 1);
      const change1w = roundTo((rng() - 0.5) * 8, 1);

      // Percentile vs 1Y history (0-100)
      // Spreads near extremes of their typical range get higher/lower percentiles
      const rangeWidth = Math.abs(p.base2Y - p.base30Y) + 30;
      const midRange = (p.base2Y + p.base30Y) / 2;
      const rawPctile = 50 + ((spread - midRange) / rangeWidth) * 60 + (rng() - 0.5) * 20;
      const percentile = Math.max(0, Math.min(100, Math.round(rawPctile)));

      spreadMap[`${ccy}-${tenor}`] = spread;

      spreads.push({ currency: ccy, tenor, swapRate, treasuryRate, spread, change1d, change1w, percentile });
    }
  }

  // ── Summary ──

  const usd10YSpread = spreadMap['USD-10Y'];
  const eur10YSpread = spreadMap['EUR-10Y'];
  const gbp10YSpread = spreadMap['GBP-10Y'];
  const jpy10YSpread = spreadMap['JPY-10Y'];

  const allChanges = spreads.map(s => s.change1d);
  const avgChange1d = roundTo(allChanges.reduce((a, b) => a + b, 0) / allChanges.length, 1);

  const summary = { usd10YSpread, eur10YSpread, gbp10YSpread, jpy10YSpread, avgChange1d };

  // ── Historical range (10Y tenor per currency) ──

  const historicalRange: HistoricalRange[] = CURRENCIES.map(ccy => {
    const current = spreadMap[`${ccy}-10Y`];
    const p = PROFILES[ccy];
    const volatility = ccy === 'JPY' ? 5 : 12;

    // Simulate 1Y range around base
    const mean1Y = roundTo(p.base10Y + (rng() - 0.5) * 4, 1);
    const low1Y = roundTo(mean1Y - volatility - rng() * 8, 1);
    const high1Y = roundTo(mean1Y + volatility + rng() * 8, 1);

    const range = high1Y - low1Y;
    const percentile = range > 0
      ? Math.max(0, Math.min(100, Math.round(((current - low1Y) / range) * 100)))
      : 50;

    const stdDev = range / 4; // approximate
    const zScore = stdDev > 0 ? roundTo((current - mean1Y) / stdDev, 2) : 0;

    return { currency: ccy, current, low1Y, high1Y, mean1Y, percentile, zScore };
  });

  // ── Butterfly analysis ──

  const flyAnalysis: FlyAnalysis[] = CURRENCIES.map(ccy => {
    const s2 = spreadMap[`${ccy}-2Y`];
    const s5 = spreadMap[`${ccy}-5Y`];
    const s10 = spreadMap[`${ccy}-10Y`];
    const s30 = spreadMap[`${ccy}-30Y`];

    // 2s5s10s butterfly: 2 * 5Y - 2Y - 10Y
    const fly2s5s10s = roundTo(2 * s5 - s2 - s10, 1);
    // 5s10s30s butterfly: 2 * 10Y - 5Y - 30Y
    const fly5s10s30s = roundTo(2 * s10 - s5 - s30, 1);

    const change1d = roundTo((rng() - 0.5) * 3, 1);

    let signal: string;
    if (fly2s5s10s > 3 || fly5s10s30s > 3) {
      signal = 'Steep';
    } else if (fly2s5s10s < -3 || fly5s10s30s < -3) {
      signal = 'Flat';
    } else {
      signal = 'Neutral';
    }

    return { currency: ccy, fly2s5s10s, fly5s10s30s, change1d, signal };
  });

  // ── Cross-currency comparison (key tenors) ──

  const crossCurrencyComparison: CrossCurrencyRow[] = KEY_TENORS.map(tenor => ({
    tenor,
    usd: spreadMap[`USD-${tenor}`],
    eur: spreadMap[`EUR-${tenor}`],
    gbp: spreadMap[`GBP-${tenor}`],
    jpy: spreadMap[`JPY-${tenor}`],
  }));

  return {
    summary,
    spreads,
    historicalRange,
    flyAnalysis,
    crossCurrencyComparison,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SwapSpreadMonitor] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate swap spread monitor data' });
  }
});

export default router;
