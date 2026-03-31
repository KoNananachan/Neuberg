import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

type VolRegime = 'low' | 'normal' | 'elevated' | 'crisis';
type SkewSignal = 'steep' | 'flat' | 'inverted';
type VrpSignal = 'rich' | 'fair' | 'cheap';

interface VixOverview {
  spotVix: number;
  vix1m: number;
  vix3m: number;
  vix6m: number;
  vix1y: number;
  dailyChange: number;
  weeklyChange: number;
  percentile52w: number;
  regime: VolRegime;
}

interface TermStructurePoint {
  tenor: string;
  impliedVol: number;
  previousClose: number;
  change: number;
  contango: boolean;
}

interface SkewEntry {
  asset: string;
  skew25d: number;
  skew10d: number;
  skewChange1d: number;
  skewPercentile: number;
  signal: SkewSignal;
}

interface RealizedVsImpliedEntry {
  asset: string;
  impliedVol30d: number;
  realizedVol10d: number;
  realizedVol30d: number;
  realizedVol60d: number;
  volRiskPremium: number;
  vrpPercentile: number;
  signal: VrpSignal;
}

interface CrossAssetVolEntry {
  asset: string;
  currentVol: number;
  vol30dMA: number;
  percentile52w: number;
  regime: VolRegime;
  correlationToVix: number;
}

interface VolEvent {
  date: string;
  event: string;
  expectedMove: number;
  impliedVol: number;
  historicalAvgMove: number;
}

interface VolatilityDashboardData {
  timestamp: string;
  vixOverview: VixOverview;
  termStructure: TermStructurePoint[];
  skewMonitor: SkewEntry[];
  realizedVsImplied: RealizedVsImpliedEntry[];
  crossAssetVol: CrossAssetVolEntry[];
  volEvents: VolEvent[];
}

// ── Base Data ──

const TERM_TENORS = ['1W', '1M', '2M', '3M', '6M', '9M', '1Y', '2Y'] as const;
const TERM_BASE_VOLS = [16.8, 17.5, 18.2, 18.8, 19.6, 20.1, 20.5, 21.2];

const SKEW_ASSETS = ['SPX', 'NDX', 'RUT', 'EFA'] as const;
const SKEW_BASES: Record<string, { s25: number; s10: number; pct: number }> = {
  SPX: { s25: -5.8, s10: -9.2, pct: 62 },
  NDX: { s25: -6.4, s10: -10.5, pct: 58 },
  RUT: { s25: -4.2, s10: -7.1, pct: 45 },
  EFA: { s25: -3.9, s10: -6.8, pct: 40 },
};

const RVI_ASSETS = ['SPX', 'NDX', 'RUT', 'EFA'] as const;
const RVI_BASES: Record<string, { iv30: number; rv10: number; rv30: number; rv60: number }> = {
  SPX: { iv30: 17.5, rv10: 14.2, rv30: 15.8, rv60: 16.1 },
  NDX: { iv30: 21.3, rv10: 18.5, rv30: 19.2, rv60: 19.8 },
  RUT: { iv30: 24.8, rv10: 22.1, rv30: 23.0, rv60: 22.5 },
  EFA: { iv30: 15.2, rv10: 12.8, rv30: 13.5, rv60: 14.0 },
};

const CROSS_ASSET_DEFS: Array<{ asset: string; baseVol: number; baseMa: number; basePct: number; baseCorr: number }> = [
  { asset: 'SPX',    baseVol: 17.5,  baseMa: 16.8,  basePct: 55, baseCorr: 1.0 },
  { asset: 'UST10Y', baseVol: 5.8,   baseMa: 5.4,   basePct: 48, baseCorr: 0.42 },
  { asset: 'EURUSD', baseVol: 8.2,   baseMa: 7.9,   basePct: 38, baseCorr: 0.35 },
  { asset: 'Gold',   baseVol: 14.6,  baseMa: 13.8,  basePct: 42, baseCorr: 0.28 },
  { asset: 'Oil',    baseVol: 32.5,  baseMa: 30.2,  basePct: 52, baseCorr: 0.31 },
  { asset: 'HY CDX', baseVol: 4.2,   baseMa: 3.9,   basePct: 46, baseCorr: 0.72 },
  { asset: 'EM FX',  baseVol: 9.8,   baseMa: 9.3,   basePct: 41, baseCorr: 0.48 },
  { asset: 'BTC',    baseVol: 52.4,  baseMa: 48.6,  basePct: 35, baseCorr: 0.18 },
];

const EVENT_TEMPLATES: Array<{ event: string; baseMove: number; baseIv: number; baseHistAvg: number }> = [
  { event: 'FOMC Rate Decision',          baseMove: 1.2,  baseIv: 19.8, baseHistAvg: 1.05 },
  { event: 'Nonfarm Payrolls',            baseMove: 0.85, baseIv: 18.2, baseHistAvg: 0.72 },
  { event: 'CPI Release',                 baseMove: 1.1,  baseIv: 19.5, baseHistAvg: 0.95 },
  { event: 'ECB Monetary Policy Meeting', baseMove: 0.65, baseIv: 17.8, baseHistAvg: 0.58 },
  { event: 'Quarterly GDP (Advance)',     baseMove: 0.7,  baseIv: 18.0, baseHistAvg: 0.62 },
  { event: 'PCE Price Index',             baseMove: 0.9,  baseIv: 18.5, baseHistAvg: 0.78 },
  { event: 'ISM Manufacturing PMI',       baseMove: 0.6,  baseIv: 17.2, baseHistAvg: 0.52 },
  { event: 'Retail Sales',                baseMove: 0.55, baseIv: 17.0, baseHistAvg: 0.48 },
];
let cache: { data: VolatilityDashboardData | null; expiresAt: number } = { data: null, expiresAt: 0 };

// ── Helpers ──

function determineRegime(vol: number, pct: number): VolRegime {
  if (pct >= 85 || vol > 30) return 'crisis';
  if (pct >= 65 || vol > 22) return 'elevated';
  if (pct <= 25 || vol < 14) return 'low';
  return 'normal';
}

// ── Generator ──

function generate(): VolatilityDashboardData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-volatility-dashboard'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => {
    const f = 10 ** d;
    return Math.round(v * f) / f;
  };

  // ── 1. VIX Overview ──

  const spotVix = roundTo(jitter(17.8, 0.2), 2);
  const vix1m = roundTo(jitter(18.5, 0.15), 2);
  const vix3m = roundTo(jitter(19.8, 0.12), 2);
  const vix6m = roundTo(jitter(20.6, 0.1), 2);
  const vix1y = roundTo(jitter(21.2, 0.08), 2);
  const dailyChange = roundTo((rng() - 0.5) * 3.5, 2);
  const weeklyChange = roundTo((rng() - 0.5) * 6.0, 2);
  const percentile52w = Math.round(jitter(52, 0.35));
  const regime = determineRegime(spotVix, percentile52w);

  const vixOverview: VixOverview = {
    spotVix,
    vix1m,
    vix3m,
    vix6m,
    vix1y,
    dailyChange,
    weeklyChange,
    percentile52w: Math.max(1, Math.min(99, percentile52w)),
    regime,
  };

  // ── 2. Term Structure ──

  let prevVol = 0;
  const termStructure: TermStructurePoint[] = TERM_TENORS.map((tenor, i) => {
    const impliedVol = roundTo(jitter(TERM_BASE_VOLS[i], 0.12), 2);
    const previousClose = roundTo(impliedVol + (rng() - 0.5) * 1.2, 2);
    const change = roundTo(impliedVol - previousClose, 2);
    const contango = i === 0 ? true : impliedVol > prevVol;
    prevVol = impliedVol;
    return { tenor, impliedVol, previousClose, change, contango };
  });

  // ── 3. Skew Monitor ──

  const skewMonitor: SkewEntry[] = SKEW_ASSETS.map((asset) => {
    const base = SKEW_BASES[asset];
    const skew25d = roundTo(jitter(base.s25, 0.15), 2);
    const skew10d = roundTo(jitter(base.s10, 0.15), 2);
    const skewChange1d = roundTo((rng() - 0.5) * 1.8, 2);
    const skewPercentile = Math.max(1, Math.min(99, Math.round(jitter(base.pct, 0.25))));

    let signal: SkewSignal;
    if (skew25d < -7) signal = 'steep';
    else if (skew25d > -2.5) signal = 'inverted';
    else signal = 'flat';

    return { asset, skew25d, skew10d, skewChange1d, skewPercentile, signal };
  });

  // ── 4. Realized vs Implied ──

  const realizedVsImplied: RealizedVsImpliedEntry[] = RVI_ASSETS.map((asset) => {
    const base = RVI_BASES[asset];
    const impliedVol30d = roundTo(jitter(base.iv30, 0.12), 2);
    const realizedVol10d = roundTo(jitter(base.rv10, 0.15), 2);
    const realizedVol30d = roundTo(jitter(base.rv30, 0.12), 2);
    const realizedVol60d = roundTo(jitter(base.rv60, 0.1), 2);
    const volRiskPremium = roundTo(impliedVol30d - realizedVol30d, 2);
    const vrpPercentile = Math.max(1, Math.min(99, Math.round(jitter(55, 0.35))));

    let signal: VrpSignal;
    if (volRiskPremium > 3.0) signal = 'rich';
    else if (volRiskPremium < 0.5) signal = 'cheap';
    else signal = 'fair';

    return { asset, impliedVol30d, realizedVol10d, realizedVol30d, realizedVol60d, volRiskPremium, vrpPercentile, signal };
  });

  // ── 5. Cross-Asset Vol ──

  const crossAssetVol: CrossAssetVolEntry[] = CROSS_ASSET_DEFS.map((def) => {
    const currentVol = roundTo(jitter(def.baseVol, 0.15), 2);
    const vol30dMA = roundTo(jitter(def.baseMa, 0.1), 2);
    const percentile = Math.max(1, Math.min(99, Math.round(jitter(def.basePct, 0.3))));
    const volRegime = determineRegime(currentVol, percentile);
    const correlationToVix = def.asset === 'SPX'
      ? 1.0
      : roundTo(Math.max(-0.3, Math.min(0.95, jitter(def.baseCorr, 0.2))), 2);

    return {
      asset: def.asset,
      currentVol,
      vol30dMA,
      percentile52w: percentile,
      regime: volRegime,
      correlationToVix,
    };
  });

  // ── 6. Vol Events ──

  // Pick 5 events from templates without repetition
  const shuffled = EVENT_TEMPLATES
    .map((e) => ({ ...e, sort: rng() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 5);

  const now = new Date();
  const volEvents: VolEvent[] = shuffled.map((tmpl, i) => {
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() + 1 + Math.floor(rng() * 14) + i * 3);
    const expectedMove = roundTo(jitter(tmpl.baseMove, 0.2), 2);
    const impliedVol = roundTo(jitter(tmpl.baseIv, 0.1), 2);
    const historicalAvgMove = roundTo(jitter(tmpl.baseHistAvg, 0.15), 2);

    return {
      date: eventDate.toISOString().slice(0, 10),
      event: tmpl.event,
      expectedMove,
      impliedVol,
      historicalAvgMove,
    };
  });

  // Sort events by date
  volEvents.sort((a, b) => a.date.localeCompare(b.date));

  return {
    timestamp: new Date().toISOString(),
    vixOverview,
    termStructure,
    skewMonitor,
    realizedVsImplied,
    crossAssetVol,
    volEvents,
  };
}

// ── Route ──

// GET /api/volatility-dashboard
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
    console.error('[VolatilityDashboard] Error generating data:', message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate volatility dashboard data' });
  }
});

export default router;
