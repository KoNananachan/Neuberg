import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// G10 FX pairs with realistic base vol levels
const G10_PAIRS = [
  { id: 'EURUSD', name: 'EUR/USD', baseATM: 7.2, baseRR25: -0.15, baseRR10: -0.35, baseBF25: 0.18, baseBF10: 0.55 },
  { id: 'USDJPY', name: 'USD/JPY', baseATM: 9.8, baseRR25: -1.60, baseRR10: -3.20, baseBF25: 0.35, baseBF10: 0.95 },
  { id: 'GBPUSD', name: 'GBP/USD', baseATM: 7.8, baseRR25: -0.30, baseRR10: -0.65, baseBF25: 0.20, baseBF10: 0.60 },
  { id: 'AUDUSD', name: 'AUD/USD', baseATM: 9.5, baseRR25: -0.50, baseRR10: -1.10, baseBF25: 0.25, baseBF10: 0.70 },
  { id: 'USDCAD', name: 'USD/CAD', baseATM: 6.5, baseRR25: 0.20, baseRR10: 0.45, baseBF25: 0.15, baseBF10: 0.45 },
  { id: 'USDCHF', name: 'USD/CHF', baseATM: 7.0, baseRR25: 0.10, baseRR10: 0.25, baseBF25: 0.17, baseBF10: 0.50 },
];

const DELTAS = ['10D Put', '25D Put', 'ATM', '25D Call', '10D Call'];
const TENORS = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y'];

// Tenor multipliers for term structure shape (short-dated slightly elevated, then rises gently)
const TENOR_FACTORS: Record<string, number> = {
  '1W': 0.88, '2W': 0.92, '1M': 1.00, '2M': 1.04, '3M': 1.07, '6M': 1.12, '1Y': 1.18,
};


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fx-volatility-surface'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 1. Vol Surface Grid (EURUSD) ──
  const eurusd = G10_PAIRS[0];
  const volSurfaceGrid = TENORS.map(tenor => {
    const tf = TENOR_FACTORS[tenor];
    const atmVol = Math.round(jitter(eurusd.baseATM * tf, 0.05) * 100) / 100;

    // Realistic smile: puts have higher vol (skew), wings are elevated (butterfly)
    const rr25 = Math.round(jitter(eurusd.baseRR25, 0.20) * 100) / 100;
    const rr10 = Math.round(jitter(eurusd.baseRR10, 0.20) * 100) / 100;
    const bf25 = Math.round(jitter(eurusd.baseBF25, 0.15) * 100) / 100;
    const bf10 = Math.round(jitter(eurusd.baseBF10, 0.15) * 100) / 100;

    // Derive vols from ATM, RR, BF using standard FX vol conventions:
    // 25D Put  = ATM + BF25 - RR25/2
    // 25D Call = ATM + BF25 + RR25/2
    // 10D Put  = ATM + BF10 - RR10/2
    // 10D Call = ATM + BF10 + RR10/2
    const vols: Record<string, number> = {
      '10D Put':  Math.round((atmVol + bf10 - rr10 / 2) * 100) / 100,
      '25D Put':  Math.round((atmVol + bf25 - rr25 / 2) * 100) / 100,
      'ATM':      atmVol,
      '25D Call': Math.round((atmVol + bf25 + rr25 / 2) * 100) / 100,
      '10D Call': Math.round((atmVol + bf10 + rr10 / 2) * 100) / 100,
    };

    return { tenor, vols, atmVol, rr25, bf25 };
  });

  // ── 2. Risk Reversals (6 G10 pairs, 1M and 3M) ──
  const riskReversals = G10_PAIRS.map(p => {
    const entries = (['1M', '3M'] as const).map(tenor => {
      const tenorDampen = tenor === '3M' ? 0.90 : 1.0;
      const rr25 = Math.round(jitter(p.baseRR25 * tenorDampen, 0.20) * 100) / 100;
      const rr10 = Math.round(jitter(p.baseRR10 * tenorDampen, 0.20) * 100) / 100;
      const change1d = Math.round((rng() - 0.5) * 0.3 * 100) / 100;
      const skewDirection: 'calls over' | 'puts over' = rr25 > 0 ? 'calls over' : 'puts over';
      return { tenor, rr25, rr10, change1d, skewDirection };
    });
    return { pair: p.name, tenors: entries };
  });

  // ── 3. Butterfly Spreads (6 G10 pairs, 1M and 3M) ──
  const butterflySpreads = G10_PAIRS.map(p => {
    const entries = (['1M', '3M'] as const).map(tenor => {
      const tenorFactor = tenor === '3M' ? 1.05 : 1.0;
      const bf25 = Math.round(jitter(p.baseBF25 * tenorFactor, 0.15) * 100) / 100;
      const bf10 = Math.round(jitter(p.baseBF10 * tenorFactor, 0.15) * 100) / 100;
      const change1d = Math.round((rng() - 0.5) * 0.08 * 100) / 100;
      return { tenor, bf25, bf10, change1d };
    });
    return { pair: p.name, tenors: entries };
  });

  // ── 4. ATM Term Structure (6 pairs x 7 tenors) ──
  const atmTermStructure = G10_PAIRS.map(p => {
    const tenorPoints = TENORS.map(tenor => {
      const tf = TENOR_FACTORS[tenor];
      const atmVol = Math.round(jitter(p.baseATM * tf, 0.06) * 100) / 100;
      return { tenor, atmVol };
    });
    return { pair: p.name, tenorPoints };
  });

  // ── 5. Vol Movers (top 10) ──
  const allMovers: Array<{
    pair: string;
    tenor: string;
    currentVol: number;
    change1d: number;
    change1w: number;
    percentile52w: number;
  }> = [];

  for (const p of G10_PAIRS) {
    for (const tenor of ['1W', '1M', '3M', '6M', '1Y']) {
      const tf = TENOR_FACTORS[tenor];
      const currentVol = Math.round(jitter(p.baseATM * tf, 0.08) * 100) / 100;
      const change1d = Math.round((rng() - 0.5) * 1.0 * 100) / 100;
      const change1w = Math.round((rng() - 0.48) * 1.8 * 100) / 100;
      const percentile52w = Math.round(rng() * 100);
      allMovers.push({ pair: p.name, tenor, currentVol, change1d, change1w, percentile52w });
    }
  }

  // Sort by absolute 1d change descending, take top 10
  allMovers.sort((a, b) => Math.abs(b.change1d) - Math.abs(a.change1d));
  const volMovers = allMovers.slice(0, 10);

  // ── 6. Summary ──
  const atmVols1m = G10_PAIRS.map(p => {
    const tf = TENOR_FACTORS['1M'];
    return jitter(p.baseATM * tf, 0.06);
  });
  const globalFXVol = Math.round(atmVols1m.reduce((a, b) => a + b, 0) / atmVols1m.length * 100) / 100;

  let regime: 'low' | 'normal' | 'elevated' | 'crisis';
  if (globalFXVol < 6.5) regime = 'low';
  else if (globalFXVol < 9.0) regime = 'normal';
  else if (globalFXVol < 12.0) regime = 'elevated';
  else regime = 'crisis';

  // Find most/least volatile from 1M ATM
  let mostIdx = 0;
  let leastIdx = 0;
  for (let i = 1; i < atmVols1m.length; i++) {
    if (atmVols1m[i] > atmVols1m[mostIdx]) mostIdx = i;
    if (atmVols1m[i] < atmVols1m[leastIdx]) leastIdx = i;
  }

  const summary = {
    globalFXVol,
    regime,
    mostVolatilePair: G10_PAIRS[mostIdx].name,
    leastVolatilePair: G10_PAIRS[leastIdx].name,
  };

  return {
    volSurfaceGrid: {
      pair: eurusd.name,
      deltas: DELTAS,
      tenors: TENORS,
      grid: volSurfaceGrid,
    },
    riskReversals,
    butterflySpreads,
    atmTermStructure,
    volMovers,
    summary,
    timestamp: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FXVolatilitySurface] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FX volatility surface data' });
  }
});

export default router;
