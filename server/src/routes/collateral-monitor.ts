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

// ── Seed Data ──

const COLLATERAL_CATEGORIES = [
  { category: 'UST Bills', baseTotalValue: 2500, baseHaircut: 2, baseRehypRate: 85, baseUtil: 92, baseVelocity: 3.2, baseEligible: 48 },
  { category: 'UST Notes/Bonds', baseTotalValue: 1800, baseHaircut: 2.5, baseRehypRate: 80, baseUtil: 88, baseVelocity: 2.8, baseEligible: 48 },
  { category: 'Agency MBS', baseTotalValue: 1750, baseHaircut: 4, baseRehypRate: 72, baseUtil: 78, baseVelocity: 2.1, baseEligible: 42 },
  { category: 'Agency Debentures', baseTotalValue: 650, baseHaircut: 3.5, baseRehypRate: 68, baseUtil: 74, baseVelocity: 1.9, baseEligible: 38 },
  { category: 'Corporate IG', baseTotalValue: 920, baseHaircut: 6, baseRehypRate: 55, baseUtil: 65, baseVelocity: 1.5, baseEligible: 35 },
  { category: 'Corporate HY', baseTotalValue: 340, baseHaircut: 18, baseRehypRate: 30, baseUtil: 42, baseVelocity: 0.8, baseEligible: 22 },
  { category: 'ABS', baseTotalValue: 480, baseHaircut: 8, baseRehypRate: 40, baseUtil: 55, baseVelocity: 1.1, baseEligible: 28 },
  { category: 'CMBS', baseTotalValue: 310, baseHaircut: 10, baseRehypRate: 35, baseUtil: 48, baseVelocity: 0.9, baseEligible: 25 },
  { category: 'Equities', baseTotalValue: 580, baseHaircut: 25, baseRehypRate: 45, baseUtil: 52, baseVelocity: 1.8, baseEligible: 30 },
  { category: 'Gold', baseTotalValue: 420, baseHaircut: 5, baseRehypRate: 20, baseUtil: 38, baseVelocity: 0.6, baseEligible: 18 },
] as const;

const COUNTERPARTIES = [
  { counterparty: 'JP Morgan', baseUstHaircut: 1.5, baseAgencyHaircut: 3.5, baseIgHaircut: 5.5, baseHyHaircut: 16, baseEquityHaircut: 22, baseTotalExposure: 185, baseMarginCallFreq: 2.1 },
  { counterparty: 'Goldman Sachs', baseUstHaircut: 1.8, baseAgencyHaircut: 3.8, baseIgHaircut: 6.0, baseHyHaircut: 17, baseEquityHaircut: 24, baseTotalExposure: 162, baseMarginCallFreq: 2.8 },
  { counterparty: 'Morgan Stanley', baseUstHaircut: 1.8, baseAgencyHaircut: 4.0, baseIgHaircut: 6.2, baseHyHaircut: 18, baseEquityHaircut: 25, baseTotalExposure: 148, baseMarginCallFreq: 2.5 },
  { counterparty: 'Citadel', baseUstHaircut: 2.0, baseAgencyHaircut: 4.5, baseIgHaircut: 7.0, baseHyHaircut: 20, baseEquityHaircut: 28, baseTotalExposure: 95, baseMarginCallFreq: 4.2 },
  { counterparty: 'BlackRock', baseUstHaircut: 1.5, baseAgencyHaircut: 3.2, baseIgHaircut: 5.0, baseHyHaircut: 15, baseEquityHaircut: 20, baseTotalExposure: 210, baseMarginCallFreq: 1.2 },
  { counterparty: 'PIMCO', baseUstHaircut: 1.6, baseAgencyHaircut: 3.5, baseIgHaircut: 5.5, baseHyHaircut: 16, baseEquityHaircut: 22, baseTotalExposure: 135, baseMarginCallFreq: 1.5 },
  { counterparty: 'Bridgewater', baseUstHaircut: 2.0, baseAgencyHaircut: 4.2, baseIgHaircut: 6.5, baseHyHaircut: 19, baseEquityHaircut: 26, baseTotalExposure: 88, baseMarginCallFreq: 3.5 },
  { counterparty: 'Two Sigma', baseUstHaircut: 2.2, baseAgencyHaircut: 4.8, baseIgHaircut: 7.2, baseHyHaircut: 21, baseEquityHaircut: 28, baseTotalExposure: 72, baseMarginCallFreq: 3.8 },
] as const;

const LIQUIDITY_CATEGORIES = [
  { category: 'Level 1 HQLA', baseValue: 1850, baseRequirement: 1500, baseTrend: 'Improving' as const, basePercentile: 78 },
  { category: 'Level 2A HQLA', baseValue: 620, baseRequirement: 500, baseTrend: 'Stable' as const, basePercentile: 65 },
  { category: 'Level 2B HQLA', baseValue: 180, baseRequirement: 150, baseTrend: 'Deteriorating' as const, basePercentile: 42 },
  { category: 'Net Cash Outflows', baseValue: 1420, baseRequirement: 1600, baseTrend: 'Improving' as const, basePercentile: 72 },
  { category: 'LCR Ratio', baseValue: 128, baseRequirement: 100, baseTrend: 'Stable' as const, basePercentile: 68 },
  { category: 'NSFR Ratio', baseValue: 115, baseRequirement: 100, baseTrend: 'Stable' as const, basePercentile: 58 },
] as const;

const STRESS_SCENARIOS = [
  { scenario: 'Rate Shock +200bp', baseCollateralImpact: -8.5, baseMarginCallEstimate: 42, baseShortfall: 12, worstAffected: 'Agency MBS', baseRecoveryDays: 14 },
  { scenario: 'Credit Spread Widen', baseCollateralImpact: -12.2, baseMarginCallEstimate: 58, baseShortfall: 18, worstAffected: 'Corporate HY', baseRecoveryDays: 21 },
  { scenario: 'Equity -20%', baseCollateralImpact: -6.8, baseMarginCallEstimate: 35, baseShortfall: 8, worstAffected: 'Equities', baseRecoveryDays: 10 },
  { scenario: 'Flight to Quality', baseCollateralImpact: -4.2, baseMarginCallEstimate: 22, baseShortfall: 5, worstAffected: 'Corporate IG', baseRecoveryDays: 7 },
  { scenario: 'Liquidity Crisis', baseCollateralImpact: -18.5, baseMarginCallEstimate: 85, baseShortfall: 32, worstAffected: 'CMBS', baseRecoveryDays: 35 },
] as const;

const TRENDS = ['Improving', 'Deteriorating', 'Stable'] as const;

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-collateral-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // ── 1. Collateral Categories (10 items) ──

  const collateralCategories = COLLATERAL_CATEGORIES.map(cat => {
    const totalValue = roundTo(jitter(cat.baseTotalValue, 0.08), 1);
    const haircut = roundTo(jitter(cat.baseHaircut, 0.1), 2);
    const rehypothecationRate = roundTo(jitter(cat.baseRehypRate, 0.06), 1);
    const utilization = roundTo(Math.min(99, jitter(cat.baseUtil, 0.05)), 1);
    const dailyChange = roundTo((rng() - 0.48) * totalValue * 0.02, 1);
    const velocity = roundTo(jitter(cat.baseVelocity, 0.12), 2);
    const eligibleCounterparties = Math.round(jitter(cat.baseEligible, 0.08));

    return {
      category: cat.category,
      totalValue,
      haircut,
      rehypothecationRate,
      utilization,
      dailyChange,
      velocity,
      eligibleCounterparties,
    };
  });

  // ── 2. Haircut Matrix (8 items) ──

  const haircutMatrix = COUNTERPARTIES.map(cp => {
    const ustHaircut = roundTo(jitter(cp.baseUstHaircut, 0.08), 2);
    const agencyHaircut = roundTo(jitter(cp.baseAgencyHaircut, 0.08), 2);
    const igHaircut = roundTo(jitter(cp.baseIgHaircut, 0.1), 2);
    const hyHaircut = roundTo(jitter(cp.baseHyHaircut, 0.1), 1);
    const equityHaircut = roundTo(jitter(cp.baseEquityHaircut, 0.08), 1);
    const totalExposure = roundTo(jitter(cp.baseTotalExposure, 0.1), 1);
    const marginCallFreq = roundTo(jitter(cp.baseMarginCallFreq, 0.15), 1);

    return {
      counterparty: cp.counterparty,
      ustHaircut,
      agencyHaircut,
      igHaircut,
      hyHaircut,
      equityHaircut,
      totalExposure,
      marginCallFreq,
    };
  });

  // ── 3. Liquidity Coverage (6 items) ──

  const liquidityCoverage = LIQUIDITY_CATEGORIES.map(lc => {
    const value = roundTo(jitter(lc.baseValue, 0.06), 1);
    const requirement = roundTo(jitter(lc.baseRequirement, 0.03), 1);
    const surplus = roundTo(value - requirement, 1);
    const percentile = roundTo(Math.min(99, Math.max(1, jitter(lc.basePercentile, 0.1))), 0);

    // Trend can shift slightly from base
    const trendRoll = rng();
    let trend: typeof TRENDS[number];
    if (trendRoll < 0.15) trend = pick(TRENDS);
    else trend = lc.baseTrend;

    return {
      category: lc.category,
      value,
      requirement,
      surplus,
      trend,
      percentile,
    };
  });

  // ── 4. Stress Scenarios (5 items) ──

  const stressScenarios = STRESS_SCENARIOS.map(ss => {
    const collateralImpact = roundTo(jitter(ss.baseCollateralImpact, 0.12), 1);
    const marginCallEstimate = roundTo(jitter(ss.baseMarginCallEstimate, 0.15), 1);
    const shortfall = roundTo(jitter(ss.baseShortfall, 0.2), 1);
    const recoveryDays = Math.round(jitter(ss.baseRecoveryDays, 0.15));

    return {
      scenario: ss.scenario,
      collateralImpact,
      marginCallEstimate,
      shortfall,
      worstAffected: ss.worstAffected,
      recoveryDays,
    };
  });

  // ── 5. Market Summary ──

  const totalCollateral = roundTo(
    collateralCategories.reduce((s, c) => s + c.totalValue, 0) / 1000,
    2,
  );
  const avgHaircut = roundTo(
    collateralCategories.reduce((s, c) => s + c.haircut * c.totalValue, 0) /
    collateralCategories.reduce((s, c) => s + c.totalValue, 0),
    2,
  );
  const rehypothecationLevel = roundTo(
    collateralCategories.reduce((s, c) => s + c.rehypothecationRate * c.totalValue, 0) /
    collateralCategories.reduce((s, c) => s + c.totalValue, 0),
    1,
  );
  const marginCallsToday = Math.round(8 + rng() * 20);
  const failsToDeliver = Math.round(jitter(45, 0.3));

  // Stress test status based on worst scenario shortfall
  const maxShortfall = Math.max(...stressScenarios.map(s => Math.abs(s.shortfall)));
  let stressTestStatus: 'Pass' | 'Warning' | 'Fail';
  if (maxShortfall > 35) stressTestStatus = 'Fail';
  else if (maxShortfall > 20) stressTestStatus = 'Warning';
  else stressTestStatus = 'Pass';

  const marketSummary = {
    totalCollateral,
    avgHaircut,
    rehypothecationLevel,
    marginCallsToday,
    failsToDeliver,
    stressTestStatus,
  };

  return {
    collateralCategories,
    haircutMatrix,
    liquidityCoverage,
    stressScenarios,
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
    console.error('[CollateralMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate collateral monitor data' });
  }
});

export default router;
