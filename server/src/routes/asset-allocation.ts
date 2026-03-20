import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Helpers ──

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function jitter(rng: () => number, base: number, spread: number): number {
  return base + (rng() - 0.5) * 2 * spread;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Asset Class Definitions ──

const ASSET_CLASSES = [
  'US Equities',
  'Intl Equities',
  'EM Equities',
  'US Bonds',
  'Intl Bonds',
  'TIPS',
  'REITs',
  'Commodities',
  'Cash',
] as const;

type AssetClass = (typeof ASSET_CLASSES)[number];

// ── Model Portfolio Target Weights ──

const MODEL_TARGETS: Record<string, Record<AssetClass, number>> = {
  Conservative: {
    'US Equities': 15,
    'Intl Equities': 5,
    'EM Equities': 2,
    'US Bonds': 40,
    'Intl Bonds': 10,
    'TIPS': 10,
    'REITs': 3,
    'Commodities': 5,
    'Cash': 10,
  },
  Moderate: {
    'US Equities': 30,
    'Intl Equities': 12,
    'EM Equities': 5,
    'US Bonds': 25,
    'Intl Bonds': 8,
    'TIPS': 5,
    'REITs': 5,
    'Commodities': 5,
    'Cash': 5,
  },
  Growth: {
    'US Equities': 40,
    'Intl Equities': 18,
    'EM Equities': 8,
    'US Bonds': 12,
    'Intl Bonds': 5,
    'TIPS': 3,
    'REITs': 7,
    'Commodities': 5,
    'Cash': 2,
  },
  Aggressive: {
    'US Equities': 50,
    'Intl Equities': 20,
    'EM Equities': 12,
    'US Bonds': 3,
    'Intl Bonds': 2,
    'TIPS': 0,
    'REITs': 8,
    'Commodities': 4,
    'Cash': 1,
  },
};

// ── Base Return & Volatility Parameters (realistic long-term) ──

const ASSET_CLASS_PARAMS: Record<AssetClass, {
  ytdBase: number;
  y1Base: number;
  y3Base: number;
  y5Base: number;
  y10Base: number;
  volBase: number;
  sharpeBase: number;
}> = {
  'US Equities':   { ytdBase: 8.2,  y1Base: 12.5,  y3Base: 10.1, y5Base: 11.8, y10Base: 10.4, volBase: 15.8, sharpeBase: 0.62 },
  'Intl Equities':  { ytdBase: 5.1,  y1Base: 7.8,   y3Base: 5.2,  y5Base: 6.9,  y10Base: 5.8,  volBase: 16.4, sharpeBase: 0.38 },
  'EM Equities':    { ytdBase: 3.8,  y1Base: 5.2,   y3Base: 1.8,  y5Base: 4.5,  y10Base: 4.1,  volBase: 20.2, sharpeBase: 0.22 },
  'US Bonds':       { ytdBase: 1.2,  y1Base: 2.8,   y3Base: -1.5, y5Base: 0.8,  y10Base: 1.9,  volBase: 5.8,  sharpeBase: 0.18 },
  'Intl Bonds':     { ytdBase: 0.8,  y1Base: 2.1,   y3Base: -2.8, y5Base: -0.2, y10Base: 1.1,  volBase: 7.2,  sharpeBase: 0.08 },
  'TIPS':           { ytdBase: 1.5,  y1Base: 3.2,   y3Base: -0.4, y5Base: 2.1,  y10Base: 2.5,  volBase: 5.1,  sharpeBase: 0.25 },
  'REITs':          { ytdBase: 4.2,  y1Base: 8.5,   y3Base: 3.8,  y5Base: 5.2,  y10Base: 7.1,  volBase: 19.5, sharpeBase: 0.35 },
  'Commodities':    { ytdBase: 2.5,  y1Base: 4.1,   y3Base: 6.8,  y5Base: 5.5,  y10Base: 2.2,  volBase: 17.8, sharpeBase: 0.15 },
  'Cash':           { ytdBase: 2.6,  y1Base: 5.1,   y3Base: 3.2,  y5Base: 2.4,  y10Base: 1.5,  volBase: 0.4,  sharpeBase: 0.90 },
};

// ── Base Correlation Matrix (realistic cross-asset correlations) ──

const BASE_CORRELATIONS: number[][] = [
  //  USEq  IntlEq EMEq  USBd  IntlBd TIPS  REITs Commod Cash
  [  1.00,  0.82,  0.72,  0.05, -0.02,  0.12,  0.65,  0.28, -0.05 ], // US Equities
  [  0.82,  1.00,  0.78,  0.02, -0.05,  0.08,  0.55,  0.32, -0.04 ], // Intl Equities
  [  0.72,  0.78,  1.00, -0.05, -0.08,  0.05,  0.48,  0.38, -0.06 ], // EM Equities
  [  0.05,  0.02, -0.05,  1.00,  0.65,  0.78, -0.12, -0.15,  0.15 ], // US Bonds
  [ -0.02, -0.05, -0.08,  0.65,  1.00,  0.55, -0.08, -0.10,  0.12 ], // Intl Bonds
  [  0.12,  0.08,  0.05,  0.78,  0.55,  1.00,  0.05, -0.05,  0.10 ], // TIPS
  [  0.65,  0.55,  0.48, -0.12, -0.08,  0.05,  1.00,  0.18, -0.08 ], // REITs
  [  0.28,  0.32,  0.38, -0.15, -0.10, -0.05,  0.18,  1.00, -0.02 ], // Commodities
  [ -0.05, -0.04, -0.06,  0.15,  0.12,  0.10, -0.08, -0.02,  1.00 ], // Cash
];

// ── Cache ──

let cache: { data: unknown; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Data Generation ──

function generate() {
  const rng = seededRandom('asset-allocation-panel');
  const N = ASSET_CLASSES.length;

  // ── 1. Asset Class Returns ──

  const assetClassReturns = ASSET_CLASSES.map(ac => {
    const p = ASSET_CLASS_PARAMS[ac];
    return {
      assetClass: ac,
      ytd: round(jitter(rng, p.ytdBase, 1.5), 2),
      y1: round(jitter(rng, p.y1Base, 2.0), 2),
      y3: round(jitter(rng, p.y3Base, 1.2), 2),
      y5: round(jitter(rng, p.y5Base, 1.0), 2),
      y10: round(jitter(rng, p.y10Base, 0.8), 2),
      volatility: round(jitter(rng, p.volBase, 1.5), 2),
      sharpe: round(jitter(rng, p.sharpeBase, 0.08), 2),
    };
  });

  // ── 2. Model Portfolios ──

  const modelPortfolios = Object.entries(MODEL_TARGETS).map(([name, targets]) => {
    const allocations = ASSET_CLASSES.map(ac => {
      const target = targets[ac];
      // Current weight drifts from target by a realistic amount
      const driftBps = round(jitter(rng, 0, 250), 0); // drift in basis points
      const drift = driftBps / 100;
      const current = round(Math.max(0, target + drift), 2);
      const driftPct = round(current - target, 2);
      const absThreshold = Math.max(1.5, target * 0.15);
      const rebalance = Math.abs(driftPct) > absThreshold;

      return {
        assetClass: ac,
        targetWeight: target,
        currentWeight: current,
        drift: driftPct,
        rebalanceSignal: rebalance,
      };
    });

    // Normalize current weights to sum to 100
    const totalCurrent = allocations.reduce((s, a) => s + a.currentWeight, 0);
    if (totalCurrent > 0) {
      allocations.forEach(a => {
        a.currentWeight = round((a.currentWeight / totalCurrent) * 100, 2);
        a.drift = round(a.currentWeight - a.targetWeight, 2);
        const absThreshold = Math.max(1.5, a.targetWeight * 0.15);
        a.rebalanceSignal = Math.abs(a.drift) > absThreshold;
      });
    }

    // Portfolio-level metrics
    let expReturn = 0;
    let expVol = 0;
    for (let i = 0; i < N; i++) {
      const w = allocations[i].currentWeight / 100;
      const ret = assetClassReturns[i];
      expReturn += w * ret.y1;
      expVol += w * ret.volatility;
    }

    return {
      name,
      allocations,
      expectedReturn: round(expReturn, 2),
      expectedVolatility: round(expVol * 0.75, 2), // diversification benefit
      sharpe: round(expVol > 0 ? expReturn / (expVol * 0.75) : 0, 2),
      totalDrift: round(allocations.reduce((s, a) => s + Math.abs(a.drift), 0), 2),
    };
  });

  // ── 3. Correlation Matrix ──

  const correlationMatrix = {
    assetClasses: [...ASSET_CLASSES],
    values: BASE_CORRELATIONS.map(row =>
      row.map(v => round(jitter(rng, v, 0.03), 2)),
    ),
  };

  // Enforce symmetry and diagonal = 1
  for (let i = 0; i < N; i++) {
    correlationMatrix.values[i][i] = 1.00;
    for (let j = i + 1; j < N; j++) {
      const avg = round((correlationMatrix.values[i][j] + correlationMatrix.values[j][i]) / 2, 2);
      const clamped = round(Math.max(-1, Math.min(1, avg)), 2);
      correlationMatrix.values[i][j] = clamped;
      correlationMatrix.values[j][i] = clamped;
    }
  }

  // ── 4. Tactical Tilts ──

  const tiltRationales: Record<AssetClass, string[]> = {
    'US Equities': [
      'Strong earnings momentum and resilient consumer spending',
      'Elevated valuations offset by AI-driven productivity gains',
      'Fed rate path supportive; favor quality large-caps',
    ],
    'Intl Equities': [
      'Improving PMI readings across Eurozone',
      'Attractive valuations relative to US peers',
      'Currency headwinds may limit upside',
    ],
    'EM Equities': [
      'China stimulus measures gaining traction',
      'Commodity-linked EM benefiting from supply constraints',
      'Geopolitical risk warrants caution',
    ],
    'US Bonds': [
      'Duration extension attractive at current yield levels',
      'Potential safe-haven demand if growth slows',
      'Fed likely to maintain restrictive policy near-term',
    ],
    'Intl Bonds': [
      'ECB easing cycle ahead of Fed',
      'JGB yields normalizing; BOJ policy shift',
      'Hedging costs offset higher DM yields',
    ],
    'TIPS': [
      'Breakeven inflation rates near fair value',
      'Real yields attractive for liability matching',
      'Sticky services inflation supports allocation',
    ],
    'REITs': [
      'Data center and industrial REIT fundamentals remain strong',
      'Office sector headwinds largely priced in',
      'Rate-sensitive; benefit from eventual Fed cuts',
    ],
    'Commodities': [
      'Supply-side constraints in energy and metals',
      'Portfolio hedge against geopolitical escalation',
      'Weakening demand outlook caps upside',
    ],
    'Cash': [
      'Money market yields remain attractive above 5%',
      'Provides optionality for tactical deployment',
      'Opportunity cost rising as risk assets advance',
    ],
  };

  const tacticalTilts = ASSET_CLASSES.map(ac => {
    const tiltBps = round(jitter(rng, 0, 300), 0);
    const tilt = tiltBps / 100;
    const direction = tilt >= 0.5 ? 'overweight' as const
      : tilt <= -0.5 ? 'underweight' as const
      : 'neutral' as const;
    const absTilt = Math.abs(tilt);
    const conviction = absTilt > 2.0 ? 'high' as const
      : absTilt > 1.0 ? 'medium' as const
      : 'low' as const;

    return {
      assetClass: ac,
      tilt: round(tilt, 2),
      direction,
      conviction,
      rationale: pick(rng, tiltRationales[ac]),
    };
  });

  // ── 5. Efficient Frontier ──

  const minVarReturn = round(jitter(rng, 3.2, 0.3), 2);
  const minVarVol = round(jitter(rng, 4.1, 0.4), 2);
  const maxRetReturn = round(jitter(rng, 14.5, 1.0), 2);
  const maxRetVol = round(jitter(rng, 22.0, 1.5), 2);

  const efficientFrontier = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9; // 0 to 1
    // Non-linear interpolation for realistic efficient frontier curvature
    const vol = round(minVarVol + (maxRetVol - minVarVol) * t, 2);
    // Frontier curves: return increases fast initially, slows at higher vol
    const retRange = maxRetReturn - minVarReturn;
    const expRet = round(minVarReturn + retRange * (1 - Math.pow(1 - t, 1.4)), 2);
    const sharpe = round(vol > 0 ? (expRet - 4.5) / vol : 0, 2); // risk-free ~4.5%

    return {
      portfolioIndex: i + 1,
      expectedReturn: expRet,
      volatility: vol,
      sharpe,
    };
  });

  // ── 6. Rebalancing Analysis ──

  const rebalancingAnalysis = Object.keys(MODEL_TARGETS).map(name => {
    const daysSinceRebalance = Math.floor(jitter(rng, 45, 30));
    const turnoverRate = round(jitter(rng, 6.5, 3.0), 2);
    const estTransactionCostBps = round(jitter(rng, 8, 4), 1);
    const taxImpactBps = round(jitter(rng, 12, 8), 1);

    return {
      model: name,
      daysSinceLastRebalance: Math.max(1, daysSinceRebalance),
      estimatedTransactionCostBps: round(Math.max(1, estTransactionCostBps), 1),
      estimatedTaxImpactBps: round(Math.max(0, taxImpactBps), 1),
      turnoverRate: round(Math.max(0.5, turnoverRate), 2),
    };
  });

  return {
    modelPortfolios,
    assetClassReturns,
    correlationMatrix,
    tacticalTilts,
    efficientFrontier,
    rebalancingAnalysis,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err) {
    console.error('[AssetAllocation] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate asset allocation data' });
  }
});

export default router;
