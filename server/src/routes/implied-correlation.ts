import { Router } from 'express';

const router = Router();

// ── Types ──

interface CorrelationPair {
  asset1: string;
  asset2: string;
  impliedCorr: number;
  realizedCorr30d: number;
  realizedCorr90d: number;
  change1w: number;
}

interface IcjData {
  current: number;
  change1d: number;
  change1w: number;
  percentile30d: number;
  percentile90d: number;
  min52w: number;
  max52w: number;
}

interface DispersionData {
  current: number;
  avg30d: number;
  avg90d: number;
  zscore: number;
}

interface SectorCorrelation {
  sector: string;
  intraCorr: number;
  interCorr: number;
}

interface ImpliedCorrelationResponse {
  matrix: CorrelationPair[];
  icj: IcjData;
  dispersion: DispersionData;
  sectorCorrelations: SectorCorrelation[];
  generatedAt: string;
}

// ── Assets ──

const ASSETS = [
  'SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'TLT', 'GLD', 'USO', 'UUP', 'HYG', 'VIX', 'BTC-USD',
];

// ── GICS Sectors ──

const GICS_SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
  'Industrials', 'Communication Services', 'Consumer Staples',
  'Energy', 'Utilities', 'Real Estate', 'Materials',
];

// ── Base correlation matrix (realistic pairwise relationships) ──
// Order: SPY QQQ IWM EFA EEM TLT GLD USO UUP HYG VIX BTC-USD
//         0   1   2   3   4   5   6   7   8   9  10   11

const BASE_CORR: number[][] = [
  // SPY
  [1.00,  0.92,  0.88,  0.78,  0.65, -0.32,  0.08,  0.35, -0.15,  0.72, -0.82,  0.42],
  // QQQ
  [0.92,  1.00,  0.80,  0.72,  0.60, -0.28,  0.05,  0.28, -0.12,  0.65, -0.78,  0.50],
  // IWM
  [0.88,  0.80,  1.00,  0.72,  0.62, -0.25,  0.10,  0.38, -0.18,  0.75, -0.75,  0.38],
  // EFA
  [0.78,  0.72,  0.72,  1.00,  0.75, -0.20,  0.15,  0.30, -0.35,  0.62, -0.60,  0.30],
  // EEM
  [0.65,  0.60,  0.62,  0.75,  1.00, -0.15,  0.20,  0.40, -0.42,  0.55, -0.50,  0.35],
  // TLT
  [-0.32, -0.28, -0.25, -0.20, -0.15,  1.00,  0.30, -0.15,  0.10, -0.10,  0.25, -0.15],
  // GLD
  [0.08,  0.05,  0.10,  0.15,  0.20,  0.30,  1.00,  0.18, -0.45,  0.10,  0.05,  0.22],
  // USO
  [0.35,  0.28,  0.38,  0.30,  0.40, -0.15,  0.18,  1.00, -0.20,  0.42, -0.30,  0.15],
  // UUP
  [-0.15, -0.12, -0.18, -0.35, -0.42,  0.10, -0.45, -0.20,  1.00, -0.20,  0.12, -0.25],
  // HYG
  [0.72,  0.65,  0.75,  0.62,  0.55, -0.10,  0.10,  0.42, -0.20,  1.00, -0.65,  0.35],
  // VIX
  [-0.82, -0.78, -0.75, -0.60, -0.50,  0.25,  0.05, -0.30,  0.12, -0.65,  1.00, -0.35],
  // BTC-USD
  [0.42,  0.50,  0.38,  0.30,  0.35, -0.15,  0.22,  0.15, -0.25,  0.35, -0.35,  1.00],
];

// ── Seeded PRNG ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ── Data generation ──

function generateImpliedCorrelationData(cycleSeed: number): ImpliedCorrelationResponse {
  const rng = seededRandom(cycleSeed);
  const n = ASSETS.length;

  // Generate correlation matrix with realistic jitter
  const matrix: CorrelationPair[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const baseCorr = BASE_CORR[i][j];

      // Implied correlation: base + small noise (implied tends to be slightly higher in magnitude)
      const impliedJitter = (rng() - 0.5) * 0.08;
      const impliedCorr = clamp(baseCorr + impliedJitter + (baseCorr > 0 ? 0.03 : -0.03), -1, 1);

      // Realized 30d: closer to implied but with noise
      const realized30dJitter = (rng() - 0.5) * 0.12;
      const realizedCorr30d = clamp(baseCorr + realized30dJitter, -1, 1);

      // Realized 90d: closer to base (more stable over longer period)
      const realized90dJitter = (rng() - 0.5) * 0.06;
      const realizedCorr90d = clamp(baseCorr + realized90dJitter, -1, 1);

      // Weekly change: small drift
      const change1w = (rng() - 0.5) * 0.08;

      matrix.push({
        asset1: ASSETS[i],
        asset2: ASSETS[j],
        impliedCorr: round(impliedCorr, 3),
        realizedCorr30d: round(realizedCorr30d, 3),
        realizedCorr90d: round(realizedCorr90d, 3),
        change1w: round(change1w, 3),
      });
    }
  }

  // ICJ (CBOE Implied Correlation Index) — typically 40-80
  const icjBase = 55 + (rng() - 0.5) * 20; // 45-65 center
  const icjCurrent = round(clamp(icjBase + (rng() - 0.5) * 10, 35, 85), 2);
  const icjChange1d = round((rng() - 0.5) * 3, 2);
  const icjChange1w = round((rng() - 0.5) * 6, 2);
  const icjPercentile30d = round(clamp(rng() * 100, 5, 95), 1);
  const icjPercentile90d = round(clamp(rng() * 100, 5, 95), 1);
  const icjMin52w = round(clamp(icjCurrent - 10 - rng() * 15, 25, icjCurrent - 5), 2);
  const icjMax52w = round(clamp(icjCurrent + 10 + rng() * 15, icjCurrent + 5, 90), 2);

  const icj: IcjData = {
    current: icjCurrent,
    change1d: icjChange1d,
    change1w: icjChange1w,
    percentile30d: icjPercentile30d,
    percentile90d: icjPercentile90d,
    min52w: icjMin52w,
    max52w: icjMax52w,
  };

  // Dispersion data
  const dispCurrent = round(8 + rng() * 12, 2); // 8-20 range (typical dispersion %)
  const dispAvg30d = round(dispCurrent + (rng() - 0.5) * 3, 2);
  const dispAvg90d = round(dispCurrent + (rng() - 0.5) * 2, 2);
  const dispStd = 2 + rng() * 2; // 2-4 std dev for z-score calculation
  const dispZscore = round((dispCurrent - dispAvg90d) / dispStd, 2);

  const dispersion: DispersionData = {
    current: dispCurrent,
    avg30d: dispAvg30d,
    avg90d: dispAvg90d,
    zscore: dispZscore,
  };

  // Sector correlations
  const sectorCorrelations: SectorCorrelation[] = GICS_SECTORS.map((sector) => {
    // Intra-sector correlation: typically 0.4-0.8 (stocks within same sector are correlated)
    const intraCorr = round(clamp(0.55 + (rng() - 0.5) * 0.3, 0.30, 0.90), 3);
    // Inter-sector correlation: typically 0.15-0.55 (between sectors, lower)
    const interCorr = round(clamp(0.35 + (rng() - 0.5) * 0.25, 0.10, 0.60), 3);
    return { sector, intraCorr, interCorr };
  });

  return {
    matrix,
    icj,
    dispersion,
    sectorCorrelations,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5 min TTL) ──

let cache: { data: ImpliedCorrelationResponse; expiresAt: number } | null = null;
const CACHE_TTL = 12 * 60 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cache && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Deterministic seed based on 5-minute cycle
    const cycleSeed = Math.floor(now / CACHE_TTL);
    const data = generateImpliedCorrelationData(cycleSeed);

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ImpliedCorrelation] Error:', message);

    // Stale fallback
    if (cache) return res.json(cache.data);

    res.status(500).json({ error: 'Failed to generate implied correlation data' });
  }
});

export default router;
