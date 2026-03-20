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

// -- Seed Data --

const ASSET_CLASSES = ['Rates', 'Credit', 'FX', 'Equity', 'Commodity'] as const;

const BASE_COMPONENT_VAR: Record<string, { var95: number; marginal: number; incremental: number }> = {
  Rates:     { var95: 8.2, marginal: 6.8, incremental: 5.9 },
  Credit:    { var95: 6.5, marginal: 5.4, incremental: 4.7 },
  FX:        { var95: 4.8, marginal: 3.9, incremental: 3.4 },
  Equity:    { var95: 5.1, marginal: 4.2, incremental: 3.6 },
  Commodity: { var95: 3.4, marginal: 2.8, incremental: 2.4 },
};

const WORST_SCENARIOS = [
  { date: '2020-03-16', baseLoss: 142.5, description: 'COVID-19 market crash — cross-asset liquidation' },
  { date: '2022-09-26', baseLoss: 98.3, description: 'UK gilt crisis — rates dislocation & LDI margin calls' },
  { date: '2023-03-13', baseLoss: 76.8, description: 'SVB contagion — regional bank credit spread blowout' },
  { date: '2022-06-13', baseLoss: 65.2, description: 'Inflation shock — Fed 75bp surprise, curve inversion' },
  { date: '2024-08-05', baseLoss: 58.9, description: 'Yen carry unwind — global equity & FX vol spike' },
] as const;

const LIMIT_DEFS = [
  { limitName: 'VaR 99% 1-Day', baseUsage: 22.8, baseLimit: 30.0 },
  { limitName: 'DV01', baseUsage: 1.85, baseLimit: 2.50 },
  { limitName: 'Credit DV01', baseUsage: 0.92, baseLimit: 1.20 },
  { limitName: 'FX Delta', baseUsage: 145, baseLimit: 200 },
  { limitName: 'Equity Delta', baseUsage: 118, baseLimit: 175 },
  { limitName: 'Gamma', baseUsage: 3.2, baseLimit: 5.0 },
  { limitName: 'Vega', baseUsage: 8.5, baseLimit: 12.0 },
  { limitName: 'Concentration', baseUsage: 34, baseLimit: 40 },
] as const;

const TRENDS = ['increasing', 'decreasing', 'stable'] as const;

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-risk-dashboard'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. VaR Summary --

  const var95_1d = roundTo(jitter(19.2, 0.15), 1);
  const var99_1d = roundTo(var95_1d * jitter(1.42, 0.04), 1);
  const var95_10d = roundTo(var95_1d * jitter(3.08, 0.03), 1);
  const var99_10d = roundTo(var99_1d * jitter(3.08, 0.03), 1);

  const componentVaR = ASSET_CLASSES.map(ac => {
    const base = BASE_COMPONENT_VAR[ac];
    const var95 = roundTo(jitter(base.var95, 0.12), 1);
    const marginalVaR = roundTo(jitter(base.marginal, 0.12), 1);
    const incrementalVaR = roundTo(jitter(base.incremental, 0.12), 1);
    return { assetClass: ac, var95, marginalVaR, incrementalVaR };
  });

  const sumComponentVaR = componentVaR.reduce((s, c) => s + c.var95, 0);
  const diversificationBenefit = roundTo(
    Math.max(30, Math.min(45, ((sumComponentVaR - var95_1d) / sumComponentVaR) * 100 * jitter(1, 0.05))),
    1,
  );

  const varSummary = {
    portfolio: {
      var95_1d,
      var99_1d,
      var95_10d,
      var99_10d,
    },
    componentVaR,
    diversificationBenefit,
  };

  // -- 2. Expected Shortfall --

  const es95_1d = roundTo(var95_1d * jitter(1.28, 0.04), 1);
  const es99_1d = roundTo(var99_1d * jitter(1.35, 0.04), 1);
  const es95_10d = roundTo(es95_1d * jitter(3.10, 0.03), 1);
  const es99_10d = roundTo(es99_1d * jitter(3.10, 0.03), 1);

  const worstScenarios = WORST_SCENARIOS.map(ws => ({
    date: ws.date,
    loss: roundTo(jitter(ws.baseLoss, 0.08), 1),
    description: ws.description,
  }));

  const stressES = roundTo(es99_1d * jitter(1.85, 0.08), 1);

  const expectedShortfall = {
    es95_1d,
    es99_1d,
    es95_10d,
    es99_10d,
    worstScenarios,
    stressES,
  };

  // -- 3. Limit Utilization --

  const limitUtilization = LIMIT_DEFS.map(ld => {
    const currentUsage = roundTo(jitter(ld.baseUsage, 0.12), 2);
    const limit = ld.baseLimit;
    const utilization = roundTo((currentUsage / limit) * 100, 1);
    const breach = utilization >= 100;
    const trend = pick(TRENDS);
    return {
      limitName: ld.limitName,
      currentUsage,
      limit,
      utilization,
      breach,
      trend,
    };
  });

  // Ensure 1-2 limits are near breach (85-98% utilization)
  const nearBreachIdx = Math.floor(rng() * limitUtilization.length);
  const nearBreachTarget = jitter(0.92, 0.04);
  limitUtilization[nearBreachIdx].currentUsage = roundTo(
    limitUtilization[nearBreachIdx].limit * nearBreachTarget, 2,
  );
  limitUtilization[nearBreachIdx].utilization = roundTo(nearBreachTarget * 100, 1);
  limitUtilization[nearBreachIdx].trend = 'increasing';

  // Second near-breach
  const nearBreachIdx2 = (nearBreachIdx + 3) % limitUtilization.length;
  const nearBreachTarget2 = jitter(0.88, 0.04);
  limitUtilization[nearBreachIdx2].currentUsage = roundTo(
    limitUtilization[nearBreachIdx2].limit * nearBreachTarget2, 2,
  );
  limitUtilization[nearBreachIdx2].utilization = roundTo(nearBreachTarget2 * 100, 1);
  limitUtilization[nearBreachIdx2].trend = 'increasing';

  // -- 4. P&L Attribution --

  const carry = roundTo(jitter(285, 0.15), 0);
  const rollDown = roundTo(jitter(142, 0.20), 0);
  const curveShift = roundTo(jitter(-95, 0.35), 0);
  const spreadChange = roundTo(jitter(-68, 0.40), 0);
  const fxImpact = roundTo(jitter(38, 0.50), 0);
  const theta = roundTo(jitter(-125, 0.15), 0);
  const tradePnl = roundTo(jitter(210, 0.25), 0);
  const explained = carry + rollDown + curveShift + spreadChange + fxImpact + theta + tradePnl;
  const dailyTotal = roundTo(jitter(420, 0.20), 0);
  const unexplained = dailyTotal - explained;

  const mtdPnl = roundTo(jitter(8.4, 0.20), 1);
  const ytdPnl = roundTo(jitter(42.6, 0.15), 1);

  const pnlAttribution = {
    dailyTotal,
    breakdown: {
      carry,
      rollDown,
      curveShift,
      spreadChange,
      fxImpact,
      theta,
      tradePnl,
      unexplained,
    },
    mtdPnl,
    ytdPnl,
  };

  return {
    varSummary,
    expectedShortfall,
    limitUtilization,
    pnlAttribution,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RiskDashboard] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate risk dashboard data' });
  }
});

export default router;
