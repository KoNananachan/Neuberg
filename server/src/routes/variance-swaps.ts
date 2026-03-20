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

const INDICES = [
  { id: 'SPX', name: 'S&P 500', region: 'North America', baseImplied: 18.5, baseRealized: 15.2, baseVRP: 3.3 },
  { id: 'NDX', name: 'Nasdaq 100', region: 'North America', baseImplied: 24.0, baseRealized: 19.5, baseVRP: 4.5 },
  { id: 'SX5E', name: 'Euro Stoxx 50', region: 'Europe', baseImplied: 20.5, baseRealized: 17.8, baseVRP: 2.7 },
  { id: 'UKX', name: 'FTSE 100', region: 'Europe', baseImplied: 17.8, baseRealized: 15.5, baseVRP: 2.3 },
  { id: 'NKY', name: 'Nikkei 225', region: 'Asia Pacific', baseImplied: 22.0, baseRealized: 18.5, baseVRP: 3.5 },
  { id: 'HSI', name: 'Hang Seng', region: 'Asia Pacific', baseImplied: 24.5, baseRealized: 21.0, baseVRP: 3.5 },
];

const TENORS = ['1M', '3M', '6M', '1Y', '2Y'];
const TENOR_FACTORS = [0.92, 0.96, 1.0, 1.04, 1.08];

const SECTORS = [
  { name: 'Technology', baseImpliedVar: 520, baseRealizedVar: 380 },
  { name: 'Financials', baseImpliedVar: 340, baseRealizedVar: 260 },
  { name: 'Healthcare', baseImpliedVar: 280, baseRealizedVar: 210 },
  { name: 'Energy', baseImpliedVar: 620, baseRealizedVar: 500 },
  { name: 'Consumer Discretionary', baseImpliedVar: 390, baseRealizedVar: 300 },
  { name: 'Industrials', baseImpliedVar: 310, baseRealizedVar: 240 },
  { name: 'Materials', baseImpliedVar: 420, baseRealizedVar: 340 },
  { name: 'Communication Services', baseImpliedVar: 450, baseRealizedVar: 350 },
];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-variance-swaps'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Generate index data with term structures
  const indices = INDICES.map(idx => {
    const spotVol = Math.round(jitter(idx.baseRealized, 0.1) * 10) / 10;

    const termStructure = TENORS.map((tenor, ti) => {
      const factor = TENOR_FACTORS[ti];
      const impliedVol = jitter(idx.baseImplied * factor, 0.06);
      const realizedVol = jitter(idx.baseRealized * factor, 0.08);
      // Implied variance = vol^2 / 10000 (in variance points, scaled for readability)
      const impliedVar = Math.round(impliedVol * impliedVol * 10) / 10;
      const realizedVar = Math.round(realizedVol * realizedVol * 10) / 10;
      // Var swap strike quoted in vol points (sqrt of fair variance)
      const varSwapStrike = Math.round(jitter(impliedVol * 1.02, 0.03) * 10) / 10;
      // Mark: fair value of the variance swap (in variance points)
      const mark = Math.round(jitter(impliedVar * 1.01, 0.02) * 10) / 10;
      const change1d = Math.round((rng() - 0.5) * 1.5 * 10) / 10;
      const varRiskPremium = Math.round((impliedVol - realizedVol) * 10) / 10;

      return { tenor, impliedVar, realizedVar, varSwapStrike, mark, change1d, varRiskPremium };
    });

    return { id: idx.id, name: idx.name, region: idx.region, spotVol, termStructure };
  });

  // Variance risk premium history (last 6 months of monthly averages)
  const vrpHistory = INDICES.map(idx => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthStr = d.toISOString().slice(0, 7);
      const avgVRP = Math.round(jitter(idx.baseVRP, 0.25) * 10) / 10;
      return { month: monthStr, avgVRP };
    });
    return { id: idx.id, name: idx.name, history: months };
  });

  // Convexity adjustment: difference between var swap strike and ATM vol
  const convexityAdjustment = INDICES.map(idx => {
    const tenors = TENORS.map((tenor, ti) => {
      const factor = TENOR_FACTORS[ti];
      const atmVol = Math.round(jitter(idx.baseImplied * factor, 0.05) * 10) / 10;
      // Convexity adjustment increases with tenor and vol level
      const baseConvexity = 0.5 + ti * 0.3 + (idx.baseImplied - 16) * 0.05;
      const adjustment = Math.round(jitter(Math.max(0.3, baseConvexity), 0.15) * 10) / 10;
      const varSwapStrike = Math.round((atmVol + adjustment) * 10) / 10;
      return { tenor, atmVol, varSwapStrike, convexityAdj: adjustment };
    });
    return { id: idx.id, name: idx.name, tenors };
  });

  // Sector variance
  const sectorVariance = SECTORS.map(sec => {
    const impliedVariance = Math.round(jitter(sec.baseImpliedVar, 0.08) * 10) / 10;
    const realizedVariance = Math.round(jitter(sec.baseRealizedVar, 0.1) * 10) / 10;
    const vrp = Math.round((impliedVariance - realizedVariance) * 10) / 10;
    const dispersionContribution = Math.round(jitter(12.5, 0.3) * 10) / 10;
    return { sector: sec.name, impliedVariance, realizedVariance, vrp, dispersionContribution };
  });

  // Normalize dispersion contributions to sum to 100
  const totalDispersion = sectorVariance.reduce((a, b) => a + b.dispersionContribution, 0);
  for (const sv of sectorVariance) {
    sv.dispersionContribution = Math.round((sv.dispersionContribution / totalDispersion) * 100 * 10) / 10;
  }

  // Summary
  const allVRP = indices.flatMap(idx => idx.termStructure.map(t => t.varRiskPremium));
  const allImpliedVol = indices.map(idx => {
    const midTenor = idx.termStructure[2]; // 6M
    return Math.sqrt(midTenor.impliedVar);
  });
  const allRealizedVol = indices.map(idx => idx.spotVol);
  const totalNotional = Math.round(jitter(185, 0.1) * 10) / 10;

  const summary = {
    avgVarianceRiskPremium: Math.round((allVRP.reduce((a, b) => a + b, 0) / allVRP.length) * 10) / 10,
    avgRealizedVol: Math.round((allRealizedVol.reduce((a, b) => a + b, 0) / allRealizedVol.length) * 10) / 10,
    avgImpliedVol: Math.round((allImpliedVol.reduce((a, b) => a + b, 0) / allImpliedVol.length) * 10) / 10,
    totalNotionalOutstanding: totalNotional,
    totalNotionalUnit: 'B USD',
  };

  return { summary, indices, vrpHistory, convexityAdjustment, sectorVariance, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[VarianceSwaps] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate variance swap data' });
  }
});

export default router;
