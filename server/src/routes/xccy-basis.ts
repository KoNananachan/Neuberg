import { Router } from 'express';

const router = Router();

// ── Types ──

interface XccyBasisEntry {
  pair: string;
  tenor: string;
  basisSpread: number;
  change1d: number;
  change1w: number;
  change1m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  spotRate: number;
  forwardPoints: number;
  impliedYield: number;
  usdLibor: number;
  foreignRate: number;
  signal: string | null;
  history: number[];
}

interface XccyBasisResponse {
  entries: XccyBasisEntry[];
  stressIndex: number;
  termStructure: {
    tenors: string[];
    spreads: number[];
  };
  timestamp: string;
}

// ── Pair configurations ──

interface PairConfig {
  pair: string;
  baseSpread3M: number;   // typical 3M basis in bps
  spreadSlope: number;     // how basis changes per tenor step (longer = more negative for DM)
  volatility: number;      // randomness scale
  spotMid: number;         // typical spot rate
  foreignRateMid: number;  // typical foreign short rate %
}

const PAIRS: PairConfig[] = [
  { pair: 'EUR/USD', baseSpread3M: -18, spreadSlope: -1.8, volatility: 3,   spotMid: 1.0850, foreignRateMid: 3.65 },
  { pair: 'JPY/USD', baseSpread3M: -45, spreadSlope: -3.2, volatility: 5,   spotMid: 0.0067, foreignRateMid: 0.10 },
  { pair: 'GBP/USD', baseSpread3M: -12, spreadSlope: -1.2, volatility: 2.5, spotMid: 1.2650, foreignRateMid: 5.00 },
  { pair: 'CHF/USD', baseSpread3M: -22, spreadSlope: -2.0, volatility: 3,   spotMid: 1.1300, foreignRateMid: 1.50 },
  { pair: 'AUD/USD', baseSpread3M: -8,  spreadSlope: -0.8, volatility: 2,   spotMid: 0.6550, foreignRateMid: 4.35 },
  { pair: 'CAD/USD', baseSpread3M: -5,  spreadSlope: -0.5, volatility: 1.5, spotMid: 0.7400, foreignRateMid: 4.50 },
  { pair: 'SEK/USD', baseSpread3M: -25, spreadSlope: -2.2, volatility: 4,   spotMid: 0.0950, foreignRateMid: 3.75 },
  { pair: 'NOK/USD', baseSpread3M: -20, spreadSlope: -1.8, volatility: 3.5, spotMid: 0.0930, foreignRateMid: 4.25 },
  { pair: 'NZD/USD', baseSpread3M: -10, spreadSlope: -1.0, volatility: 2,   spotMid: 0.6100, foreignRateMid: 5.25 },
  { pair: 'KRW/USD', baseSpread3M: -55, spreadSlope: -4.0, volatility: 8,   spotMid: 0.00075, foreignRateMid: 3.50 },
  { pair: 'MXN/USD', baseSpread3M: -35, spreadSlope: -3.0, volatility: 6,   spotMid: 0.0580, foreignRateMid: 10.50 },
  { pair: 'BRL/USD', baseSpread3M: -60, spreadSlope: -5.0, volatility: 10,  spotMid: 0.2000, foreignRateMid: 12.25 },
];

const TENORS = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y'];
const TENOR_MULTIPLIER: Record<string, number> = {
  '3M': 0,
  '6M': 1,
  '1Y': 2,
  '2Y': 3,
  '3Y': 4,
  '5Y': 5,
  '10Y': 6,
};
const TENOR_YEARS: Record<string, number> = {
  '3M': 0.25,
  '6M': 0.5,
  '1Y': 1,
  '2Y': 2,
  '3Y': 3,
  '5Y': 5,
  '10Y': 10,
};

// USD SOFR-like reference rates by tenor
const USD_RATES: Record<string, number> = {
  '3M': 5.30,
  '6M': 5.20,
  '1Y': 4.95,
  '2Y': 4.50,
  '3Y': 4.25,
  '5Y': 4.05,
  '10Y': 3.90,
};

// ── Cache ──

let cache: { data: XccyBasisResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 10 * 60_000; // 10 minutes

// ── Seeded random for deterministic-ish data within a time window ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ── Data generation ──

function generateData(): XccyBasisResponse {
  // Seed based on 10-minute window so data is stable within cache period
  const timeBucket = Math.floor(Date.now() / (10 * 60_000));
  const rand = seededRandom(timeBucket);

  const entries: XccyBasisEntry[] = [];

  for (const config of PAIRS) {
    for (const tenor of TENORS) {
      const tenorIdx = TENOR_MULTIPLIER[tenor];
      const years = TENOR_YEARS[tenor];

      // Base spread gets more negative with tenor (term structure effect)
      const baseSpread = config.baseSpread3M + config.spreadSlope * tenorIdx;

      // Add some randomness
      const noise = (rand() - 0.5) * config.volatility * 2;
      const basisSpread = Math.round((baseSpread + noise) * 10) / 10;

      // Daily/weekly/monthly changes
      const change1d = Math.round((rand() - 0.5) * config.volatility * 0.8 * 10) / 10;
      const change1w = Math.round((rand() - 0.5) * config.volatility * 1.5 * 10) / 10;
      const change1m = Math.round((rand() - 0.5) * config.volatility * 3 * 10) / 10;

      // 52-week range
      const rangeWidth = Math.abs(baseSpread) * 0.6 + config.volatility * 4;
      const low52w = Math.round((baseSpread - rangeWidth * 0.6) * 10) / 10;
      const high52w = Math.round((baseSpread + rangeWidth * 0.4) * 10) / 10;

      // Percentile within 52-week range
      const range = high52w - low52w;
      const percentile = range > 0
        ? Math.round(((basisSpread - low52w) / range) * 100)
        : 50;

      // Spot rate with small random perturbation
      const spotRate = Math.round((config.spotMid * (1 + (rand() - 0.5) * 0.01)) * 10000) / 10000;

      // Forward points: basis spread drives deviation from covered interest rate parity
      const usdRate = USD_RATES[tenor];
      const foreignBase = config.foreignRateMid;
      // Forward points ≈ spot * (foreignRate - usdRate + basis/100) * years
      const rateDiff = (foreignBase - usdRate + basisSpread / 100) / 100;
      const forwardPoints = Math.round(spotRate * rateDiff * years * 10000) / (years > 1 ? 1 : 10);
      const fwdPtsRounded = Math.round(forwardPoints * 10) / 10;

      // Implied yield = USD rate + basis spread / 100
      const impliedYield = Math.round((usdRate + basisSpread / 100) * 100) / 100;

      // Foreign rate for this tenor (adjust from mid based on tenor)
      const foreignRate = Math.round((foreignBase + (rand() - 0.5) * 0.3) * 100) / 100;

      // Signal determination
      let signal: string | null = null;
      if (basisSpread < -50) {
        signal = 'DOLLAR_STRESS';
      } else if (basisSpread > -5 && basisSpread < 5) {
        signal = 'DOLLAR_SURPLUS';
      } else if (change1w < -3) {
        signal = 'WIDENING';
      } else if (change1w > 3) {
        signal = 'TIGHTENING';
      }

      // History: last 20 data points showing a path
      const history: number[] = [];
      let hVal = basisSpread - change1m;
      for (let i = 0; i < 20; i++) {
        hVal += (basisSpread - hVal) * 0.15 + (rand() - 0.5) * config.volatility * 0.4;
        history.push(Math.round(hVal * 10) / 10);
      }

      entries.push({
        pair: config.pair,
        tenor,
        basisSpread,
        change1d,
        change1w,
        change1m,
        high52w,
        low52w,
        percentile: Math.max(0, Math.min(100, percentile)),
        spotRate,
        forwardPoints: fwdPtsRounded,
        impliedYield,
        usdLibor: usdRate,
        foreignRate,
        signal,
        history,
      });
    }
  }

  // Global USD funding stress index (0-100)
  // Based on average negativity of 3M basis across all pairs
  const threeMonthEntries = entries.filter((e) => e.tenor === '3M');
  const avgBasis3M = threeMonthEntries.reduce((s, e) => s + e.basisSpread, 0) / threeMonthEntries.length;
  // Map: 0 bps = 0 stress, -100 bps = 100 stress
  const stressIndex = Math.max(0, Math.min(100, Math.round(-avgBasis3M * 1.2)));

  // EUR/USD term structure (primary reference)
  const eurEntries = entries.filter((e) => e.pair === 'EUR/USD');
  const termStructure = {
    tenors: eurEntries.map((e) => e.tenor),
    spreads: eurEntries.map((e) => e.basisSpread),
  };

  return {
    entries,
    stressIndex,
    termStructure,
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
    console.error('[XccyBasis] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch cross-currency basis data' });
  }
});

export default router;
