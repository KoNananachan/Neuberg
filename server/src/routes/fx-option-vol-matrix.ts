import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Currency Pair Definitions ──
// Realistic base parameters for G10 + major cross pairs

interface PairConfig {
  id: string;
  name: string;
  spot: number;
  baseATM1M: number;
  baseATM1Y: number;
  baseRR25: number;
  baseBF25: number;
}

const PAIRS: PairConfig[] = [
  { id: 'EURUSD', name: 'EUR/USD', spot: 1.0855, baseATM1M: 7.50, baseATM1Y: 8.50, baseRR25: -0.25, baseBF25: 0.20 },
  { id: 'USDJPY', name: 'USD/JPY', spot: 149.50, baseATM1M: 9.50, baseATM1Y: 10.50, baseRR25: -1.40, baseBF25: 0.40 },
  { id: 'GBPUSD', name: 'GBP/USD', spot: 1.2650, baseATM1M: 8.00, baseATM1Y: 8.80, baseRR25: -0.35, baseBF25: 0.22 },
  { id: 'USDCHF', name: 'USD/CHF', spot: 0.8750, baseATM1M: 7.20, baseATM1Y: 8.10, baseRR25: 0.15, baseBF25: 0.18 },
  { id: 'AUDUSD', name: 'AUD/USD', spot: 0.6520, baseATM1M: 9.80, baseATM1Y: 10.60, baseRR25: -0.55, baseBF25: 0.28 },
  { id: 'USDCAD', name: 'USD/CAD', spot: 1.3580, baseATM1M: 6.80, baseATM1Y: 7.80, baseRR25: 0.20, baseBF25: 0.16 },
  { id: 'NZDUSD', name: 'NZD/USD', spot: 0.6080, baseATM1M: 10.30, baseATM1Y: 11.00, baseRR25: -0.60, baseBF25: 0.30 },
  { id: 'EURGBP', name: 'EUR/GBP', spot: 0.8580, baseATM1M: 6.90, baseATM1Y: 7.60, baseRR25: -0.10, baseBF25: 0.15 },
  { id: 'EURJPY', name: 'EUR/JPY', spot: 162.20, baseATM1M: 10.20, baseATM1Y: 11.30, baseRR25: -1.20, baseBF25: 0.38 },
  { id: 'GBPJPY', name: 'GBP/JPY', spot: 189.10, baseATM1M: 11.20, baseATM1Y: 12.00, baseRR25: -1.30, baseBF25: 0.42 },
];

const TENORS = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y'] as const;
type Tenor = typeof TENORS[number];

const DELTAS = ['10P', '25P', 'ATM', '25C', '10C'] as const;

// Tenor multipliers for interpolating between 1M and 1Y base vols
const TENOR_WEIGHTS: Record<Tenor, number> = {
  '1W': -0.15, // slightly below 1M
  '2W': -0.08,
  '1M': 0.00,
  '2M': 0.20,
  '3M': 0.35,
  '6M': 0.65,
  '1Y': 1.00,
};

// Risk reversal and butterfly scale by tenor (longer = slightly wider skew)
const TENOR_SKEW_SCALE: Record<Tenor, number> = {
  '1W': 0.80,
  '2W': 0.88,
  '1M': 1.00,
  '2M': 1.05,
  '3M': 1.10,
  '6M': 1.18,
  '1Y': 1.25,
};

// ── Data Generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fx-option-vol-matrix'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Helper: compute ATM vol for a pair at a given tenor
  function pairATM(pair: PairConfig, tenor: Tenor): number {
    const w = TENOR_WEIGHTS[tenor];
    const base = pair.baseATM1M + w * (pair.baseATM1Y - pair.baseATM1M);
    return round2(jitter(base, 0.05));
  }

  // Helper: compute RR/BF for a pair at a given tenor
  function pairRR25(pair: PairConfig, tenor: Tenor): number {
    const s = TENOR_SKEW_SCALE[tenor];
    return round2(jitter(pair.baseRR25 * s, 0.20));
  }

  function pairBF25(pair: PairConfig, tenor: Tenor): number {
    const s = TENOR_SKEW_SCALE[tenor];
    return round2(Math.max(0.05, jitter(pair.baseBF25 * s, 0.18)));
  }

  function pairRR10(pair: PairConfig, tenor: Tenor): number {
    // 10-delta RR is roughly 2x the 25-delta RR
    const s = TENOR_SKEW_SCALE[tenor];
    return round2(jitter(pair.baseRR25 * 2.1 * s, 0.20));
  }

  function pairBF10(pair: PairConfig, tenor: Tenor): number {
    // 10-delta BF is roughly 2.5-3x the 25-delta BF
    const s = TENOR_SKEW_SCALE[tenor];
    return round2(Math.max(0.10, jitter(pair.baseBF25 * 2.7 * s, 0.18)));
  }

  // ── 1. Matrix: vol grid per pair ──
  const matrix = PAIRS.map(pair => {
    const spot = round2(jitter(pair.spot, 0.003));
    const tenors = TENORS.map(tenor => {
      const atm = pairATM(pair, tenor);
      const rr25 = pairRR25(pair, tenor);
      const bf25 = pairBF25(pair, tenor);
      const rr10 = pairRR10(pair, tenor);
      const bf10 = pairBF10(pair, tenor);
      return { tenor, atm, rr25, bf25, rr10, bf10 };
    });

    return { pair: pair.name, pairId: pair.id, spot, tenors };
  });

  // ── 2. Surface: detailed EUR/USD vol surface (deltas x tenors) ──
  // Derive vols from ATM, RR, BF using standard FX conventions:
  //   25P = ATM + BF25 - RR25/2
  //   25C = ATM + BF25 + RR25/2
  //   10P = ATM + BF10 - RR10/2
  //   10C = ATM + BF10 + RR10/2
  const eurusd = PAIRS[0];
  const surface = TENORS.map(tenor => {
    const atm = pairATM(eurusd, tenor);
    const rr25 = pairRR25(eurusd, tenor);
    const bf25 = pairBF25(eurusd, tenor);
    const rr10 = pairRR10(eurusd, tenor);
    const bf10 = pairBF10(eurusd, tenor);

    const vols: Record<string, number> = {
      '10P': round2(atm + bf10 - rr10 / 2),
      '25P': round2(atm + bf25 - rr25 / 2),
      'ATM': atm,
      '25C': round2(atm + bf25 + rr25 / 2),
      '10C': round2(atm + bf10 + rr10 / 2),
    };

    return { tenor, vols, atm, rr25, bf25, rr10, bf10 };
  });

  // ── 3. Changes: daily ATM vol changes for all pairs x tenors ──
  const changes = PAIRS.map(pair => {
    const tenorChanges = TENORS.map(tenor => {
      // Daily change typically -0.4 to +0.4 vol points
      const change1d = round2((rng() - 0.5) * 0.8);
      const change1w = round2((rng() - 0.48) * 1.6);
      const atm = pairATM(pair, tenor);
      return { tenor, atm, change1d, change1w };
    });

    return { pair: pair.name, pairId: pair.id, tenors: tenorChanges };
  });

  // ── 4. Skew: risk reversal analysis at 1M and 3M ──
  const skew = PAIRS.map(pair => {
    const analysis = (['1M', '3M'] as const).map(tenor => {
      const rr25 = pairRR25(pair, tenor);
      const rr10 = pairRR10(pair, tenor);
      const bf25 = pairBF25(pair, tenor);
      const bf10 = pairBF10(pair, tenor);

      // Skew direction: negative RR means puts are richer (downside hedging demand)
      const skewDirection: 'puts over' | 'calls over' | 'neutral' =
        rr25 < -0.05 ? 'puts over' : rr25 > 0.05 ? 'calls over' : 'neutral';

      // Skew intensity: magnitude of 25D RR relative to ATM
      const atm = pairATM(pair, tenor);
      const skewIntensity = round2(Math.abs(rr25) / atm * 100); // as percentage of ATM

      return { tenor, rr25, rr10, bf25, bf10, skewDirection, skewIntensity };
    });

    return { pair: pair.name, pairId: pair.id, tenors: analysis };
  });

  // ── 5. Summary ──
  // Average ATM vol by tenor across all pairs
  const avgATMByTenor = TENORS.map(tenor => {
    const vols = PAIRS.map(p => pairATM(p, tenor));
    const avg = round2(vols.reduce((s, v) => s + v, 0) / vols.length);
    return { tenor, avgATM: avg };
  });

  // Most / least volatile based on 1M ATM
  const atm1mVols = PAIRS.map(p => ({ pair: p.name, atm: pairATM(p, '1M') }));
  atm1mVols.sort((a, b) => b.atm - a.atm);
  const mostVolatilePair = atm1mVols[0].pair;
  const leastVolatilePair = atm1mVols[atm1mVols.length - 1].pair;

  // Vol regime indicator based on average 1M ATM across all pairs
  const globalAvg1M = round2(atm1mVols.reduce((s, v) => s + v.atm, 0) / atm1mVols.length);
  let volRegime: 'low' | 'normal' | 'elevated' | 'crisis';
  if (globalAvg1M < 7.0) volRegime = 'low';
  else if (globalAvg1M < 9.5) volRegime = 'normal';
  else if (globalAvg1M < 12.5) volRegime = 'elevated';
  else volRegime = 'crisis';

  const summary = {
    avgATMByTenor,
    mostVolatilePair,
    leastVolatilePair,
    globalAvg1M,
    volRegime,
  };

  return {
    matrix,
    surface: {
      pair: eurusd.name,
      deltas: [...DELTAS],
      tenors: [...TENORS],
      grid: surface,
    },
    changes,
    skew,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// ── Route Handler ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FXOptionVolMatrix] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FX option vol matrix data' });
  }
});

export default router;
