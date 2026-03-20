import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const PAIRS = [
  { id: 'EURUSD', name: 'EUR/USD', spot: 1.0850, baseIV: 7.8, baseRV: 7.0, baseRR: -0.15 },
  { id: 'USDJPY', name: 'USD/JPY', spot: 149.50, baseIV: 10.5, baseRV: 9.8, baseRR: -1.80 },
  { id: 'GBPUSD', name: 'GBP/USD', spot: 1.2650, baseIV: 8.5, baseRV: 7.8, baseRR: -0.30 },
  { id: 'USDCHF', name: 'USD/CHF', spot: 0.8750, baseIV: 7.5, baseRV: 6.8, baseRR: 0.10 },
  { id: 'AUDUSD', name: 'AUD/USD', spot: 0.6520, baseIV: 9.8, baseRV: 9.0, baseRR: -0.50 },
  { id: 'NZDUSD', name: 'NZD/USD', spot: 0.6080, baseIV: 10.2, baseRV: 9.5, baseRR: -0.45 },
  { id: 'USDCAD', name: 'USD/CAD', spot: 1.3580, baseIV: 6.8, baseRV: 6.2, baseRR: 0.20 },
  { id: 'EURGBP', name: 'EUR/GBP', spot: 0.8580, baseIV: 7.0, baseRV: 6.5, baseRR: -0.10 },
  { id: 'EURJPY', name: 'EUR/JPY', spot: 162.20, baseIV: 10.8, baseRV: 10.0, baseRR: -1.50 },
  { id: 'USDMXN', name: 'USD/MXN', spot: 17.15, baseIV: 14.0, baseRV: 12.5, baseRR: 1.20 },
  { id: 'USDBRL', name: 'USD/BRL', spot: 4.95, baseIV: 16.0, baseRV: 14.2, baseRR: 1.80 },
  { id: 'USDTRY', name: 'USD/TRY', spot: 32.50, baseIV: 22.0, baseRV: 18.5, baseRR: 3.50 },
];

const TERM_STRUCTURE_PAIRS = ['EURUSD', 'USDJPY', 'GBPUSD'];
const TENORS = ['1W', '2W', '1M', '3M', '6M', '1Y'];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fx-volatility'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Generate pairs data
  const pairs = PAIRS.map(p => {
    const spot = Math.round(jitter(p.spot, 0.005) * 10000) / 10000;
    const impliedVol1m = Math.round(jitter(p.baseIV, 0.08) * 100) / 100;
    const realizedVol1m = Math.round(jitter(p.baseRV, 0.10) * 100) / 100;
    const volSpread = Math.round((impliedVol1m - realizedVol1m) * 100) / 100;
    const riskReversal25d = Math.round(jitter(p.baseRR, 0.20) * 100) / 100;
    const butterfly25d = Math.round((0.15 + rng() * 0.60) * 100) / 100;
    const change1d = Math.round((rng() - 0.5) * 0.8 * 100) / 100;
    const change1w = Math.round((rng() - 0.48) * 1.6 * 100) / 100;
    const percentile = Math.round(rng() * 100);

    return {
      pair: p.name, spot, impliedVol1m, realizedVol1m, volSpread,
      riskReversal25d, butterfly25d, change1d, change1w, percentile,
    };
  });

  // Summary
  const ivs = pairs.map(p => p.impliedVol1m);
  const rvs = pairs.map(p => p.realizedVol1m);
  const avgImpliedVol = Math.round(ivs.reduce((a, b) => a + b, 0) / ivs.length * 100) / 100;
  const avgRealizedVol = Math.round(rvs.reduce((a, b) => a + b, 0) / rvs.length * 100) / 100;
  const volSpread = Math.round((avgImpliedVol - avgRealizedVol) * 100) / 100;
  let mostVolatile = pairs[0];
  let leastVolatile = pairs[0];
  for (const p of pairs) {
    if (p.impliedVol1m > mostVolatile.impliedVol1m) mostVolatile = p;
    if (p.impliedVol1m < leastVolatile.impliedVol1m) leastVolatile = p;
  }

  const summary = {
    avgImpliedVol,
    avgRealizedVol,
    volSpread,
    mostVolatile: mostVolatile.pair,
    leastVolatile: leastVolatile.pair,
  };

  // Term structure for EUR/USD, USD/JPY, GBP/USD
  const termStructure = TERM_STRUCTURE_PAIRS.map(id => {
    const base = PAIRS.find(p => p.id === id)!;
    const tenors = TENORS.map((tenor, i) => {
      // Short tenors higher for event risk, then term structure slopes up gently
      const tenorFactors = [1.05, 1.02, 1.00, 0.98, 0.97, 0.96];
      const factor = tenorFactors[i];
      const impliedVol = Math.round(jitter(base.baseIV * factor, 0.06) * 100) / 100;
      const change1d = Math.round((rng() - 0.5) * 0.5 * 100) / 100;
      return { tenor, impliedVol, change1d };
    });
    return { pair: base.name, tenors };
  });

  // Risk reversals for all 12 pairs
  const riskReversals = PAIRS.map(p => {
    const rr25d1m = Math.round(jitter(p.baseRR, 0.20) * 100) / 100;
    const rr25d3m = Math.round(jitter(p.baseRR * 0.90, 0.20) * 100) / 100;
    const rr10d1m = Math.round(jitter(p.baseRR * 1.6, 0.20) * 100) / 100;
    let skewDirection: 'Puts' | 'Calls' | 'Neutral';
    if (rr25d1m < -0.3) skewDirection = 'Puts';
    else if (rr25d1m > 0.3) skewDirection = 'Calls';
    else skewDirection = 'Neutral';

    return { pair: p.name, rr25d1m, rr25d3m, rr10d1m, skewDirection };
  });

  // Vol regime
  const vix = Math.round(jitter(16.5, 0.10) * 100) / 100;
  const cvix = Math.round(jitter(8.5, 0.12) * 100) / 100;
  const jpmFxVol = Math.round(jitter(9.0, 0.10) * 100) / 100;
  const percentile1Y = Math.round(rng() * 100);
  let current: 'Low' | 'Normal' | 'Elevated' | 'High';
  if (cvix < 7) current = 'Low';
  else if (cvix < 10) current = 'Normal';
  else if (cvix < 13) current = 'Elevated';
  else current = 'High';

  const volRegime = { current, vix, cvix, jpmFxVol, percentile1Y };

  return { summary, pairs, termStructure, riskReversals, volRegime, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FXVolatility] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FX volatility data' });
  }
});

export default router;
