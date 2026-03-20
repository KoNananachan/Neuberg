import { Router } from 'express';

const router = Router();

// ── Types ──

interface TenorSpread {
  tenor: string;
  spread: number;
}

interface SovereignSpread {
  pair: string;
  name: string;
  category: string;
  benchmarkTenor: string;
  yieldA: number;
  yieldB: number;
  spread: number;
  change1d: number;
  change1w: number;
  change1m: number;
  change3m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  avgSpread1y: number;
  deviationFromAvg: number;
  history: number[];
  signal: string | null;
  tenorSpreads: TenorSpread[];
}

interface SovereignSpreadsResponse {
  spreads: SovereignSpread[];
  peripheralIndex: number;
  peripheralChange: number;
  timestamp: string;
}

// ── Pair configurations ──

interface PairConfig {
  pair: string;
  name: string;
  category: string;
  baseSpread: number;      // typical 10Y spread in bps
  yieldAMid: number;       // typical yield for country A
  yieldBMid: number;       // typical yield for country B (benchmark)
  volatility: number;      // randomness scale in bps
  tenorShape: number[];    // multipliers for 2Y, 5Y, 10Y, 30Y relative to 10Y spread
  peripheralWeight: number; // weight in peripheral index (0 = not included)
}

const PAIRS: PairConfig[] = [
  {
    pair: 'IT-DE', name: 'Italy vs Germany', category: 'eurozone_peripheral',
    baseSpread: 165, yieldAMid: 3.85, yieldBMid: 2.20, volatility: 12,
    tenorShape: [0.75, 0.88, 1.0, 1.08], peripheralWeight: 0.35,
  },
  {
    pair: 'ES-DE', name: 'Spain vs Germany', category: 'eurozone_peripheral',
    baseSpread: 90, yieldAMid: 3.10, yieldBMid: 2.20, volatility: 8,
    tenorShape: [0.70, 0.85, 1.0, 1.05], peripheralWeight: 0.25,
  },
  {
    pair: 'GR-DE', name: 'Greece vs Germany', category: 'eurozone_peripheral',
    baseSpread: 135, yieldAMid: 3.55, yieldBMid: 2.20, volatility: 15,
    tenorShape: [0.80, 0.90, 1.0, 0.95], peripheralWeight: 0.20,
  },
  {
    pair: 'PT-DE', name: 'Portugal vs Germany', category: 'eurozone_peripheral',
    baseSpread: 70, yieldAMid: 2.90, yieldBMid: 2.20, volatility: 7,
    tenorShape: [0.65, 0.82, 1.0, 1.06], peripheralWeight: 0.20,
  },
  {
    pair: 'FR-DE', name: 'France vs Germany', category: 'eurozone_core',
    baseSpread: 60, yieldAMid: 2.80, yieldBMid: 2.20, volatility: 5,
    tenorShape: [0.55, 0.78, 1.0, 1.10], peripheralWeight: 0,
  },
  {
    pair: 'IE-DE', name: 'Ireland vs Germany', category: 'eurozone_core',
    baseSpread: 45, yieldAMid: 2.65, yieldBMid: 2.20, volatility: 4,
    tenorShape: [0.50, 0.75, 1.0, 1.08], peripheralWeight: 0,
  },
  {
    pair: 'US-DE', name: 'US vs Germany', category: 'cross_region',
    baseSpread: 200, yieldAMid: 4.20, yieldBMid: 2.20, volatility: 10,
    tenorShape: [0.60, 0.80, 1.0, 1.15], peripheralWeight: 0,
  },
  {
    pair: 'US-JP', name: 'US vs Japan', category: 'cross_region',
    baseSpread: 320, yieldAMid: 4.20, yieldBMid: 1.00, volatility: 14,
    tenorShape: [0.55, 0.78, 1.0, 1.20], peripheralWeight: 0,
  },
  {
    pair: 'GB-DE', name: 'UK vs Germany', category: 'cross_region',
    baseSpread: 160, yieldAMid: 3.80, yieldBMid: 2.20, volatility: 9,
    tenorShape: [0.65, 0.82, 1.0, 1.12], peripheralWeight: 0,
  },
  {
    pair: 'AU-US', name: 'Australia vs US', category: 'cross_region',
    baseSpread: 30, yieldAMid: 4.50, yieldBMid: 4.20, volatility: 6,
    tenorShape: [0.40, 0.72, 1.0, 1.18], peripheralWeight: 0,
  },
];

const TENORS = ['2Y', '5Y', '10Y', '30Y'];

// ── Cache ──

let cache: { data: SovereignSpreadsResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Seeded random for deterministic data within a time window ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ── Data generation ──

function generateData(): SovereignSpreadsResponse {
  // Seed based on 5-minute window so data is stable within cache period
  const timeBucket = Math.floor(Date.now() / (5 * 60_000));
  const rand = seededRandom(timeBucket);

  const spreads: SovereignSpread[] = [];

  for (const config of PAIRS) {
    // Spread with noise
    const noise = (rand() - 0.5) * config.volatility * 2;
    const spread = Math.round(config.baseSpread + noise);

    // Yields with corresponding noise
    const yieldNoise = noise / 100;
    const yieldA = Math.round((config.yieldAMid + yieldNoise + (rand() - 0.5) * 0.1) * 100) / 100;
    const yieldB = Math.round((config.yieldBMid + (rand() - 0.5) * 0.05) * 100) / 100;

    // Changes
    const change1d = Math.round((rand() - 0.5) * config.volatility * 0.6);
    const change1w = Math.round((rand() - 0.5) * config.volatility * 1.2);
    const change1m = Math.round((rand() - 0.5) * config.volatility * 2.5);
    const change3m = Math.round((rand() - 0.5) * config.volatility * 4);

    // 52-week range
    const rangeWidth = config.baseSpread * 0.4 + config.volatility * 3;
    const low52w = Math.round(config.baseSpread - rangeWidth * 0.55);
    const high52w = Math.round(config.baseSpread + rangeWidth * 0.45);

    // Percentile within 52-week range
    const range52w = high52w - low52w;
    const percentile = range52w > 0
      ? Math.max(0, Math.min(100, Math.round(((spread - low52w) / range52w) * 100)))
      : 50;

    // 1-year average spread (close to base with small offset)
    const avgSpread1y = Math.round(config.baseSpread + (rand() - 0.5) * config.volatility * 0.8);
    const deviationFromAvg = spread - avgSpread1y;

    // History: last 30 data points
    const history: number[] = [];
    let hVal = spread - change3m;
    for (let i = 0; i < 30; i++) {
      hVal += (spread - hVal) * 0.12 + (rand() - 0.5) * config.volatility * 0.5;
      history.push(Math.round(hVal));
    }

    // Signal determination
    let signal: string | null = null;
    if (percentile >= 90) {
      signal = 'AT_EXTREMES';
    } else if (spread > config.baseSpread * 1.3) {
      signal = 'STRESS';
    } else if (change1w > config.volatility * 0.8) {
      signal = 'WIDENING_FAST';
    } else if (change1w < -config.volatility * 0.6) {
      signal = 'TIGHTENING';
    }

    // Tenor spreads
    const tenorSpreads: TenorSpread[] = config.tenorShape.map((mult, i) => ({
      tenor: TENORS[i],
      spread: Math.round(spread * mult + (rand() - 0.5) * config.volatility * 0.3),
    }));

    spreads.push({
      pair: config.pair,
      name: config.name,
      category: config.category,
      benchmarkTenor: '10Y',
      yieldA,
      yieldB,
      spread,
      change1d,
      change1w,
      change1m,
      change3m,
      high52w,
      low52w,
      percentile,
      avgSpread1y,
      deviationFromAvg,
      history,
      signal,
      tenorSpreads,
    });
  }

  // Peripheral index: weighted average of IT+ES+GR+PT vs DE
  const peripheralPairs = spreads.filter((s) => s.category === 'eurozone_peripheral');
  const peripheralIndex = Math.round(
    peripheralPairs.reduce((sum, s) => {
      const config = PAIRS.find((p) => p.pair === s.pair)!;
      return sum + s.spread * config.peripheralWeight;
    }, 0),
  );

  const peripheralChange = Math.round(
    peripheralPairs.reduce((sum, s) => {
      const config = PAIRS.find((p) => p.pair === s.pair)!;
      return sum + s.change1d * config.peripheralWeight;
    }, 0),
  );

  return {
    spreads,
    peripheralIndex,
    peripheralChange,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const result = generateData();
    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: any) {
    console.error('[SovereignSpreads] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch sovereign spread data' });
  }
});

export default router;
