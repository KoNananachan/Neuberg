import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-portfolio-risk-analytics'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const round0 = (v: number) => Math.round(v);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // 1. VaR Decomposition
  const varSeeds = [
    { assetClass: 'US Equity',            weightBase: 35,  var95Base: 1.82, var99Base: 2.65, cvarBase: 3.10, marginalBase: 0.065, componentBase: 0.64, divBenBase: 0.22 },
    { assetClass: 'Intl Equity',          weightBase: 15,  var95Base: 2.10, var99Base: 3.05, cvarBase: 3.55, marginalBase: 0.072, componentBase: 0.31, divBenBase: 0.12 },
    { assetClass: 'EM Equity',            weightBase: 8,   var95Base: 2.85, var99Base: 4.12, cvarBase: 4.80, marginalBase: 0.088, componentBase: 0.23, divBenBase: 0.08 },
    { assetClass: 'US Fixed Income',      weightBase: 20,  var95Base: 0.55, var99Base: 0.82, cvarBase: 0.95, marginalBase: 0.018, componentBase: 0.11, divBenBase: 0.15 },
    { assetClass: 'Global Fixed Income',  weightBase: 7,   var95Base: 0.72, var99Base: 1.05, cvarBase: 1.22, marginalBase: 0.025, componentBase: 0.05, divBenBase: 0.06 },
    { assetClass: 'Commodities',          weightBase: 5,   var95Base: 1.95, var99Base: 2.80, cvarBase: 3.25, marginalBase: 0.055, componentBase: 0.10, divBenBase: 0.05 },
    { assetClass: 'FX',                   weightBase: 3,   var95Base: 0.85, var99Base: 1.25, cvarBase: 1.45, marginalBase: 0.030, componentBase: 0.03, divBenBase: 0.03 },
    { assetClass: 'Alternatives',         weightBase: 7,   var95Base: 1.45, var99Base: 2.10, cvarBase: 2.45, marginalBase: 0.048, componentBase: 0.11, divBenBase: 0.07 },
  ];

  const varDecomposition = varSeeds.map(seed => ({
    assetClass: seed.assetClass,
    weight: round2(jitter(seed.weightBase, 0.04)),
    var95: round2(jitter(seed.var95Base, 0.06)),
    var99: round2(jitter(seed.var99Base, 0.06)),
    cvar: round2(jitter(seed.cvarBase, 0.06)),
    marginalVaR: round2(jitter(seed.marginalBase, 0.08) * 100) / 100,
    componentVaR: round2(jitter(seed.componentBase, 0.07)),
    diversificationBenefit: round2(jitter(seed.divBenBase, 0.10)),
  }));

  // 2. Stress Tests
  const stressSeeds = [
    { scenario: '2008 GFC',              portBase: -38.5, eqBase: -52.0, fiBase: 5.2,   cmdBase: -35.0, fxBase: 12.0, ddBase: -50.8, recBase: 390 },
    { scenario: '2010 Flash Crash',      portBase: -8.2,  eqBase: -12.5, fiBase: 1.8,   cmdBase: -6.0,  fxBase: 2.5,  ddBase: -13.2, recBase: 45  },
    { scenario: '2011 Euro Crisis',      portBase: -15.8, eqBase: -22.0, fiBase: 4.5,   cmdBase: -12.0, fxBase: 8.0,  ddBase: -24.5, recBase: 120 },
    { scenario: '2013 Taper Tantrum',    portBase: -5.5,  eqBase: -6.0,  fiBase: -5.8,  cmdBase: -8.2,  fxBase: 4.5,  ddBase: -7.8,  recBase: 35  },
    { scenario: '2015 China Deval',      portBase: -10.2, eqBase: -14.5, fiBase: 2.0,   cmdBase: -18.0, fxBase: 5.5,  ddBase: -16.0, recBase: 65  },
    { scenario: '2020 COVID',            portBase: -28.5, eqBase: -35.0, fiBase: -2.5,  cmdBase: -42.0, fxBase: 6.0,  ddBase: -38.2, recBase: 148 },
    { scenario: '2022 Rate Shock',       portBase: -18.0, eqBase: -25.0, fiBase: -15.5, cmdBase: 18.0,  fxBase: 15.0, ddBase: -28.0, recBase: 210 },
    { scenario: 'Hypothetical -3 Sigma', portBase: -22.5, eqBase: -32.0, fiBase: -8.0,  cmdBase: -20.0, fxBase: 10.0, ddBase: -35.0, recBase: 180 },
  ];

  const stressTests = stressSeeds.map(seed => ({
    scenario: seed.scenario,
    portfolioImpact: round2(jitter(seed.portBase, 0.05)),
    equityImpact: round2(jitter(seed.eqBase, 0.05)),
    fiImpact: round2(jitter(seed.fiBase, 0.08)),
    commodityImpact: round2(jitter(seed.cmdBase, 0.06)),
    fxImpact: round2(jitter(seed.fxBase, 0.08)),
    maxDrawdown: round2(jitter(seed.ddBase, 0.05)),
    recoveryDays: round0(jitter(seed.recBase, 0.08)),
  }));

  // 3. Factor Exposure
  const trendOpts = ['Increasing', 'Decreasing', 'Stable'] as const;

  const factorSeeds = [
    { factor: 'Market Beta',   expBase: 1.05,  benchBase: 1.00, activeBase: 0.05,  tBase: 2.8,  r2Base: 0.92, contBase: 42.0 },
    { factor: 'Size',          expBase: 0.15,  benchBase: 0.00, activeBase: 0.15,  tBase: 1.6,  r2Base: 0.12, contBase: 8.5  },
    { factor: 'Value',         expBase: -0.10, benchBase: 0.00, activeBase: -0.10, tBase: -0.9, r2Base: 0.08, contBase: 5.2  },
    { factor: 'Momentum',      expBase: 0.22,  benchBase: 0.00, activeBase: 0.22,  tBase: 2.1,  r2Base: 0.18, contBase: 12.5 },
    { factor: 'Quality',       expBase: 0.18,  benchBase: 0.00, activeBase: 0.18,  tBase: 1.8,  r2Base: 0.15, contBase: 10.0 },
    { factor: 'Low Vol',       expBase: -0.08, benchBase: 0.00, activeBase: -0.08, tBase: -0.7, r2Base: 0.06, contBase: 4.0  },
    { factor: 'Credit Spread', expBase: 0.35,  benchBase: 0.25, activeBase: 0.10,  tBase: 1.4,  r2Base: 0.22, contBase: 11.5 },
    { factor: 'Duration',      expBase: 5.20,  benchBase: 5.80, activeBase: -0.60, tBase: -1.5, r2Base: 0.35, contBase: 6.3  },
  ];

  const factorExposure = factorSeeds.map(seed => ({
    factor: seed.factor,
    exposure: round2(jitter(seed.expBase, 0.08)),
    benchmark: round2(seed.benchBase),
    active: round2(jitter(seed.activeBase, 0.10)),
    tStat: round2(jitter(seed.tBase, 0.10)),
    rSquared: round2(Math.min(0.99, Math.max(0.01, jitter(seed.r2Base, 0.08)))),
    contribution: round1(jitter(seed.contBase, 0.06)),
    trend: pick(trendOpts),
  }));

  // 4. Scenario Analysis
  const scenarioSeeds = [
    { scenario: 'Soft Landing',       probBase: 30, eqRetBase: 12.5,  bondRetBase: 4.2,  portRetBase: 9.8,  sharpeBase: 1.15, ddBase: -8.5  },
    { scenario: 'Hard Recession',     probBase: 15, eqRetBase: -28.0, bondRetBase: 8.5,  portRetBase: -15.2, sharpeBase: -1.80, ddBase: -32.0 },
    { scenario: 'Stagflation',        probBase: 10, eqRetBase: -12.0, bondRetBase: -5.5, portRetBase: -10.5, sharpeBase: -1.20, ddBase: -22.0 },
    { scenario: 'Goldilocks',         probBase: 20, eqRetBase: 18.0,  bondRetBase: 5.0,  portRetBase: 13.5,  sharpeBase: 1.65,  ddBase: -5.0  },
    { scenario: 'Rate Cut Rally',     probBase: 15, eqRetBase: 15.0,  bondRetBase: 10.5, portRetBase: 13.0,  sharpeBase: 1.50,  ddBase: -6.5  },
    { scenario: 'Geopolitical Shock', probBase: 10, eqRetBase: -20.0, bondRetBase: 3.0,  portRetBase: -12.0, sharpeBase: -1.40, ddBase: -26.0 },
  ];

  const scenarioAnalysis = scenarioSeeds.map(seed => ({
    scenario: seed.scenario,
    probability: round1(jitter(seed.probBase, 0.08)),
    equityReturn: round2(jitter(seed.eqRetBase, 0.06)),
    bondReturn: round2(jitter(seed.bondRetBase, 0.08)),
    portfolioReturn: round2(jitter(seed.portRetBase, 0.06)),
    sharpe: round2(jitter(seed.sharpeBase, 0.06)),
    maxDD: round2(jitter(seed.ddBase, 0.06)),
  }));

  // 5. Market Summary
  const portfolioVaR95 = round2(jitter(1.85, 0.06));
  const marketSummary = {
    portfolioVaR95,
    portfolioVaR99: round2(portfolioVaR95 * jitter(1.45, 0.03)),
    betaToSPX: round2(jitter(0.82, 0.05)),
    trackingError: round2(jitter(3.25, 0.06)),
    sharpeRatio: round2(jitter(1.12, 0.08)),
    maxDrawdownMTD: round2(jitter(-2.15, 0.10)),
    riskBudgetUsed: round1(jitter(72.5, 0.06)),
  };

  return {
    varDecomposition,
    stressTests,
    factorExposure,
    scenarioAnalysis,
    marketSummary,
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
    console.error('[PortfolioRiskAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate portfolio risk analytics data' });
  }
});

export default router;
