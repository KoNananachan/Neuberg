import { Router } from 'express';

const router = Router();

// --- Seeded PRNG utilities ---

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// --- Asset definitions ---

const ASSETS = ['SPX', 'NDX', 'RTY', 'UST10Y', 'UST2Y', 'HYG', 'DXY', 'EURUSD', 'GOLD', 'OIL', 'BTC', 'VIX'] as const;
type AssetTicker = typeof ASSETS[number];

const ASSET_NAMES: Record<AssetTicker, string> = {
  SPX: 'S&P 500',
  NDX: 'Nasdaq 100',
  RTY: 'Russell 2000',
  UST10Y: '10Y Treasury',
  UST2Y: '2Y Treasury',
  HYG: 'High Yield',
  DXY: 'Dollar Index',
  EURUSD: 'EUR/USD',
  GOLD: 'Gold',
  OIL: 'Crude Oil',
  BTC: 'Bitcoin',
  VIX: 'VIX',
};

// --- Known correlation relationships (base values) ---
// Key: "ROW-COL" => base correlation
// These encode realistic financial market relationships.

const BASE_CORRELATIONS: Record<string, number> = {
  // Equity cluster: high positive correlations
  'SPX-NDX': 0.92,
  'SPX-RTY': 0.88,
  'NDX-RTY': 0.80,

  // Equity-HYG: risk-on assets move together
  'SPX-HYG': 0.65,
  'NDX-HYG': 0.58,
  'RTY-HYG': 0.62,

  // Treasury cluster
  'UST10Y-UST2Y': 0.90,

  // Equity-Treasury: varies by regime, mildly negative to decorrelated
  'SPX-UST10Y': -0.25,
  'SPX-UST2Y': -0.18,
  'NDX-UST10Y': -0.22,
  'NDX-UST2Y': -0.15,
  'RTY-UST10Y': -0.20,
  'RTY-UST2Y': -0.12,

  // HYG-Treasury: negative (credit spreads widen when rates rise)
  'HYG-UST10Y': -0.35,
  'HYG-UST2Y': -0.30,

  // DXY relationships
  'DXY-EURUSD': -0.95,  // near-inverse
  'DXY-GOLD': -0.40,
  'DXY-OIL': -0.20,
  'DXY-SPX': -0.10,
  'DXY-NDX': -0.08,
  'DXY-RTY': -0.15,
  'DXY-BTC': -0.25,
  'DXY-UST10Y': 0.15,
  'DXY-UST2Y': 0.20,
  'DXY-HYG': -0.18,
  'DXY-VIX': 0.10,

  // EURUSD (inverse of DXY mostly)
  'EURUSD-GOLD': 0.35,
  'EURUSD-OIL': 0.15,
  'EURUSD-SPX': 0.08,
  'EURUSD-NDX': 0.05,
  'EURUSD-RTY': 0.12,
  'EURUSD-BTC': 0.20,
  'EURUSD-UST10Y': -0.12,
  'EURUSD-UST2Y': -0.18,
  'EURUSD-HYG': 0.15,
  'EURUSD-VIX': -0.08,

  // GOLD relationships
  'GOLD-SPX': 0.05,
  'GOLD-NDX': 0.02,
  'GOLD-RTY': 0.00,
  'GOLD-UST10Y': -0.15,
  'GOLD-UST2Y': -0.20,
  'GOLD-HYG': -0.05,
  'GOLD-OIL': 0.25,
  'GOLD-BTC': 0.30,
  'GOLD-VIX': 0.15,

  // OIL relationships
  'OIL-SPX': 0.20,
  'OIL-NDX': 0.15,
  'OIL-RTY': 0.22,
  'OIL-UST10Y': 0.10,
  'OIL-UST2Y': 0.08,
  'OIL-HYG': 0.30,
  'OIL-BTC': 0.15,
  'OIL-VIX': -0.18,

  // BTC relationships
  'BTC-SPX': 0.45,
  'BTC-NDX': 0.50,
  'BTC-RTY': 0.40,
  'BTC-UST10Y': -0.10,
  'BTC-UST2Y': -0.08,
  'BTC-HYG': 0.30,
  'BTC-OIL': 0.15,
  'BTC-VIX': -0.35,

  // VIX relationships: inversely correlated to equities
  'VIX-SPX': -0.82,
  'VIX-NDX': -0.78,
  'VIX-RTY': -0.75,
  'VIX-UST10Y': 0.15,
  'VIX-UST2Y': 0.10,
  'VIX-HYG': -0.60,
  'VIX-OIL': -0.18,
  'VIX-BTC': -0.35,
  'VIX-GOLD': 0.15,
};

// --- Key pairs for rolling comparison ---

const KEY_PAIRS = [
  { pair: 'SPX-UST10Y', label: 'SPX / 10Y Treasury' },
  { pair: 'SPX-GOLD', label: 'SPX / Gold' },
  { pair: 'SPX-DXY', label: 'SPX / Dollar Index' },
  { pair: 'UST10Y-GOLD', label: '10Y Treasury / Gold' },
  { pair: 'OIL-DXY', label: 'Oil / Dollar Index' },
  { pair: 'BTC-SPX', label: 'Bitcoin / SPX' },
] as const;

// --- Cache ---

let cacheData: unknown = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000;

// --- Helper functions ---

function genCorr(rng: () => number, base: number, spread: number): number {
  const raw = base + (rng() - 0.5) * 2 * spread;
  return Math.round(Math.min(1, Math.max(-1, raw)) * 100) / 100;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function getBaseCorrelation(a: string, b: string): number {
  return BASE_CORRELATIONS[`${a}-${b}`] ?? BASE_CORRELATIONS[`${b}-${a}`] ?? 0;
}

// --- Data generation ---

function generate() {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('cross-asset-correlation-' + today);
  const rng = mulberry32(seed);

  // 1. Correlation Matrix (12x12, symmetric, diagonal = 1.0)
  const n = ASSETS.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0;
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const base = getBaseCorrelation(ASSETS[i], ASSETS[j]);
      // Tighter spread for well-known relationships, wider for weaker ones
      const spread = Math.abs(base) > 0.6 ? 0.06 : Math.abs(base) > 0.3 ? 0.10 : 0.12;
      const corr = genCorr(rng, base, spread);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  const correlationMatrix = {
    assets: ASSETS.map(t => ({ ticker: t, name: ASSET_NAMES[t] })),
    matrix,
  };

  // 2. Rolling Comparison: 30d, 60d, 90d windows for key pairs
  const rollingComparison = KEY_PAIRS.map(({ pair, label }) => {
    const [a, b] = pair.split('-') as [AssetTicker, AssetTicker];
    const base = getBaseCorrelation(a, b);

    // Shorter windows tend to be noisier
    const corr30d = genCorr(rng, base, 0.18);
    const corr60d = genCorr(rng, base, 0.12);
    const corr90d = genCorr(rng, base, 0.08);

    const trend = corr30d > corr90d + 0.08
      ? 'strengthening'
      : corr30d < corr90d - 0.08
        ? 'weakening'
        : 'stable';

    return {
      pair,
      label,
      corr30d,
      corr60d,
      corr90d,
      change30vs90: round2(corr30d - corr90d),
      trend,
    };
  });

  // 3. Regime Analysis
  const avgCorr = round4(
    (() => {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          sum += Math.abs(matrix[i][j]);
          count++;
        }
      }
      return sum / count;
    })()
  );

  const dispersion = round4(
    (() => {
      const values: number[] = [];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          values.push(matrix[i][j]);
        }
      }
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      return Math.sqrt(variance);
    })()
  );

  const regimes = ['risk-on', 'risk-off', 'transition', 'decorrelation'] as const;
  // Determine regime based on equity-equity average and VIX correlations
  const spxVix = matrix[ASSETS.indexOf('SPX')][ASSETS.indexOf('VIX')];
  const equityAvg = (matrix[0][1] + matrix[0][2] + matrix[1][2]) / 3;

  let regime: typeof regimes[number];
  if (equityAvg > 0.85 && spxVix < -0.75) {
    regime = 'risk-on';
  } else if (equityAvg > 0.85 && spxVix > -0.70) {
    regime = 'risk-off';
  } else if (dispersion > 0.45) {
    regime = 'decorrelation';
  } else {
    regime = 'transition';
  }

  // Days in regime: deterministic from seed
  const daysInRegime = Math.floor(rng() * 45) + 3;
  const regimeStartDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - daysInRegime);
    return d.toISOString().slice(0, 10);
  })();

  const regimeAnalysis = {
    currentRegime: regime,
    avgCorrelation: avgCorr,
    dispersion,
    regimeStartDate,
    daysInRegime,
  };

  // 4. Breakdown Alerts: 3-5 correlation pairs with significant deviation from 90d avg
  const alertCount = 3 + Math.floor(rng() * 3); // 3-5 alerts
  const allPairsForAlerts: { pair: string; i: number; j: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      allPairsForAlerts.push({ pair: `${ASSETS[i]}-${ASSETS[j]}`, i, j });
    }
  }

  // Shuffle deterministically
  for (let k = allPairsForAlerts.length - 1; k > 0; k--) {
    const swapIdx = Math.floor(rng() * (k + 1));
    [allPairsForAlerts[k], allPairsForAlerts[swapIdx]] = [allPairsForAlerts[swapIdx], allPairsForAlerts[k]];
  }

  const breakdownAlerts = allPairsForAlerts.slice(0, alertCount).map(({ pair, i, j }) => {
    const current = matrix[i][j];
    // 90d avg is base correlation with smaller noise
    const avg90d = genCorr(rng, getBaseCorrelation(ASSETS[i], ASSETS[j]), 0.05);
    const diff = current - avg90d;
    const stdDev = 0.08 + rng() * 0.06; // typical std dev of rolling correlations
    const zScore = round2(diff / stdDev);
    const direction: 'spike' | 'breakdown' = diff > 0 ? 'spike' : 'breakdown';

    return {
      pair,
      pairLabel: `${ASSET_NAMES[ASSETS[i] as AssetTicker]} / ${ASSET_NAMES[ASSETS[j] as AssetTicker]}`,
      current,
      avg90d,
      zScore: Math.abs(zScore) < 1.5 ? round2(zScore + (zScore >= 0 ? 1.5 : -1.5)) : zScore,
      direction,
    };
  });

  // 5. PCA Analysis: first 3 principal components
  const pcaComponents = [
    {
      component: 1,
      varianceExplained: round4(0.35 + rng() * 0.15), // 35-50%
      label: 'Market Risk',
      topLoadings: [
        { asset: 'SPX', loading: round4(0.38 + rng() * 0.08) },
        { asset: 'NDX', loading: round4(0.35 + rng() * 0.08) },
        { asset: 'VIX', loading: round4(-0.32 - rng() * 0.08) },
      ],
    },
    {
      component: 2,
      varianceExplained: round4(0.12 + rng() * 0.08), // 12-20%
      label: 'Rates / Duration',
      topLoadings: [
        { asset: 'UST10Y', loading: round4(0.42 + rng() * 0.10) },
        { asset: 'UST2Y', loading: round4(0.38 + rng() * 0.10) },
        { asset: 'DXY', loading: round4(0.20 + rng() * 0.10) },
      ],
    },
    {
      component: 3,
      varianceExplained: round4(0.06 + rng() * 0.06), // 6-12%
      label: 'Commodities / Inflation',
      topLoadings: [
        { asset: 'GOLD', loading: round4(0.40 + rng() * 0.10) },
        { asset: 'OIL', loading: round4(0.35 + rng() * 0.10) },
        { asset: 'EURUSD', loading: round4(0.22 + rng() * 0.10) },
      ],
    },
  ];

  // Normalize so total variance explained sums reasonably (< 1.0)
  const totalVar = pcaComponents.reduce((s, c) => s + c.varianceExplained, 0);
  if (totalVar > 0.85) {
    const scale = 0.80 / totalVar;
    pcaComponents.forEach(c => { c.varianceExplained = round4(c.varianceExplained * scale); });
  }

  const pcaAnalysis = {
    components: pcaComponents,
    totalVarianceExplained: round4(pcaComponents.reduce((s, c) => s + c.varianceExplained, 0)),
  };

  return {
    correlationMatrix,
    rollingComparison,
    regimeAnalysis,
    breakdownAlerts,
    pcaAnalysis,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route handler ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[CrossAssetCorrelation] Error:', (err as Error).message);
    // Stale fallback
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate cross-asset correlation data' });
  }
});

export default router;
