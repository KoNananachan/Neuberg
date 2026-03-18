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

// ── Reference Entities ──

interface EntitySeed {
  name: string;
  ticker: string;
  sector: string;
  rating: string;
  baseSpread5y: number;
  recovery: number;
}

const ENTITIES: EntitySeed[] = [
  { name: 'JPMorgan Chase', ticker: 'JPM', sector: 'Banks', rating: 'A+', baseSpread5y: 52, recovery: 0.40 },
  { name: 'Apple', ticker: 'AAPL', sector: 'Tech', rating: 'AA+', baseSpread5y: 32, recovery: 0.40 },
  { name: 'AT&T', ticker: 'T', sector: 'Telecom', rating: 'BBB', baseSpread5y: 165, recovery: 0.40 },
  { name: 'Ford Motor', ticker: 'F', sector: 'Auto', rating: 'BB+', baseSpread5y: 210, recovery: 0.40 },
  { name: 'Boeing', ticker: 'BA', sector: 'Industrials', rating: 'BBB-', baseSpread5y: 185, recovery: 0.40 },
  { name: 'Pfizer', ticker: 'PFE', sector: 'Healthcare', rating: 'A', baseSpread5y: 48, recovery: 0.40 },
  { name: 'ExxonMobil', ticker: 'XOM', sector: 'Energy', rating: 'AA-', baseSpread5y: 45, recovery: 0.40 },
  { name: 'Goldman Sachs', ticker: 'GS', sector: 'Banks', rating: 'A+', baseSpread5y: 62, recovery: 0.40 },
];

const TENORS = ['6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y'] as const;
type Tenor = typeof TENORS[number];

// Multipliers relative to 5Y spread for typical IG/HY curve shape
const TENOR_MULTIPLIERS: Record<Tenor, number> = {
  '6M': 0.25,
  '1Y': 0.40,
  '2Y': 0.60,
  '3Y': 0.78,
  '5Y': 1.00,
  '7Y': 1.12,
  '10Y': 1.22,
};

// Approximate year fractions for hazard rate calcs
const TENOR_YEARS: Record<Tenor, number> = {
  '6M': 0.5,
  '1Y': 1,
  '2Y': 2,
  '3Y': 3,
  '5Y': 5,
  '7Y': 7,
  '10Y': 10,
};

const IMPLIED_RATINGS = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B'] as const;

// Rough spread-to-implied-rating thresholds (5Y CDS spread in bps)
function impliedRatingFromSpread(spread5y: number): string {
  if (spread5y < 25) return 'AAA';
  if (spread5y < 35) return 'AA+';
  if (spread5y < 45) return 'AA';
  if (spread5y < 55) return 'AA-';
  if (spread5y < 65) return 'A+';
  if (spread5y < 80) return 'A';
  if (spread5y < 100) return 'A-';
  if (spread5y < 125) return 'BBB+';
  if (spread5y < 160) return 'BBB';
  if (spread5y < 200) return 'BBB-';
  if (spread5y < 260) return 'BB+';
  if (spread5y < 350) return 'BB';
  if (spread5y < 500) return 'BB-';
  if (spread5y < 700) return 'B+';
  return 'B';
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-credit-curve-builder'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const cdsCurves: unknown[] = [];
  const hazardRates: unknown[] = [];
  const curveAnalytics: unknown[] = [];
  const basisAnalysis: unknown[] = [];

  for (const entity of ENTITIES) {
    // ── 1. CDS Curve ──
    const spread5y = roundTo(jitter(entity.baseSpread5y, 0.08), 1);
    const tenorPoints = TENORS.map(tenor => {
      const baseSpread = spread5y * TENOR_MULTIPLIERS[tenor];
      const spread = roundTo(jitter(baseSpread, 0.04), 1);
      const change1d = roundTo((rng() - 0.48) * spread * 0.03, 1);
      // Upfront % increases with spread and tenor; equity-style for short tenors
      const years = TENOR_YEARS[tenor];
      const upfrontPct = roundTo(spread * years / 10000 * 100, 2);
      return { tenor, spread, change1d, upfrontPct };
    });

    cdsCurves.push({
      entity: entity.name,
      ticker: entity.ticker,
      sector: entity.sector,
      rating: entity.rating,
      tenorPoints,
    });

    // ── 2. Hazard Rates ──
    const tenorHazards = TENORS.map(tenor => {
      const tenorPoint = tenorPoints.find(tp => tp.tenor === tenor)!;
      const years = TENOR_YEARS[tenor];
      const lgd = 1 - entity.recovery;

      // Cumulative default probability: 1 - exp(-spread * years / (10000 * lgd))
      const lambda = tenorPoint.spread / 10000 / lgd;
      const cumulativeDefault = roundTo((1 - Math.exp(-lambda * years)) * 100, 2);
      const survivalProbability = roundTo(100 - cumulativeDefault, 2);
      // Annualized hazard rate
      const annualizedHazard = roundTo(lambda * 100, 3);

      return {
        tenor,
        cumulativeDefault,
        annualizedHazard,
        survivalProbability,
        recoveryRate: roundTo(entity.recovery * 100, 1),
      };
    });

    hazardRates.push({
      entity: entity.name,
      ticker: entity.ticker,
      tenors: tenorHazards,
    });

    // ── 3. Curve Analytics ──
    const spread1y = tenorPoints.find(tp => tp.tenor === '1Y')!.spread;
    const spread5yActual = tenorPoints.find(tp => tp.tenor === '5Y')!.spread;
    const spread10y = tenorPoints.find(tp => tp.tenor === '10Y')!.spread;
    const spread3y = tenorPoints.find(tp => tp.tenor === '3Y')!.spread;

    const slope1s5s = roundTo(spread5yActual - spread1y, 1);
    const slope5s10s = roundTo(spread10y - spread5yActual, 1);
    // Curvature: butterfly = 2 * mid - wings
    const curvature = roundTo(2 * spread5yActual - spread1y - spread10y, 1);
    // Roll-down: approximate 1Y roll from 5Y to 4Y (use 3Y as proxy for interpolated 4Y)
    const rolDown1y = roundTo(spread5yActual - (spread3y + (spread5yActual - spread3y) * 0.5), 1);
    // Carry and roll 3M: approximate quarterly carry + roll-down benefit
    const carryAndRoll3m = roundTo(spread5yActual * 0.25 / 100 * 10000 * 0.01 + rolDown1y * 0.25, 1);
    const impliedRating = impliedRatingFromSpread(spread5yActual);

    curveAnalytics.push({
      entity: entity.name,
      ticker: entity.ticker,
      slope_1s5s: slope1s5s,
      slope_5s10s: slope5s10s,
      curvature,
      rolDown_1y: rolDown1y,
      carryAndRoll_3m: carryAndRoll3m,
      impliedRating,
    });

    // ── 4. Basis Analysis ──
    const cdsSpread5y = spread5yActual;
    // Bond spread typically wider than CDS for IG (negative basis = CDS < bond)
    // Positive noise bias to make bond spread > CDS for most IG names
    const isIG = entity.baseSpread5y < 160;
    const basisOffset = isIG
      ? roundTo(5 + rng() * 15, 1)   // IG: bond spread 5-20 bps wider => negative basis
      : roundTo(-10 + rng() * 25, 1); // HY: more variable, can be positive or negative
    const bondSpread5y = roundTo(cdsSpread5y + basisOffset, 1);
    const basis = roundTo(cdsSpread5y - bondSpread5y, 1);
    const historicalAvg = roundTo(basis + (rng() - 0.5) * 8, 1);
    const basisDelta = basis - historicalAvg;
    let basisTrend: string;
    if (basisDelta > 3) basisTrend = 'widening';
    else if (basisDelta < -3) basisTrend = 'tightening';
    else basisTrend = 'stable';

    basisAnalysis.push({
      entity: entity.name,
      ticker: entity.ticker,
      cdsSpread_5y: cdsSpread5y,
      bondSpread_5y: bondSpread5y,
      basis,
      basisTrend,
      historicalAvg,
    });
  }

  return {
    cdsCurves,
    hazardRates,
    curveAnalytics,
    basisAnalysis,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CreditCurveBuilder] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate credit curve builder data' });
  }
});

export default router;
