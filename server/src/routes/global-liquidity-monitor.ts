import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- Seed Data --

const CB_DEFS = [
  { name: 'Federal Reserve',       code: 'FED',  totalAssets: 7.4,  gdpPct: 26.8 },
  { name: 'European Central Bank', code: 'ECB',  totalAssets: 6.5,  gdpPct: 43.2 },
  { name: 'Bank of Japan',         code: 'BOJ',  totalAssets: 5.1,  gdpPct: 127.5 },
  { name: 'People\'s Bank of China', code: 'PBOC', totalAssets: 5.9, gdpPct: 32.8 },
  { name: 'Bank of England',       code: 'BOE',  totalAssets: 1.1,  gdpPct: 33.7 },
  { name: 'Swiss National Bank',   code: 'SNB',  totalAssets: 0.86, gdpPct: 108.3 },
  { name: 'Reserve Bank of Australia', code: 'RBA', totalAssets: 0.42, gdpPct: 25.1 },
  { name: 'Bank of Canada',        code: 'BOC',  totalAssets: 0.28, gdpPct: 13.2 },
] as const;

const M2_DEFS = [
  { economy: 'United States', m2: 21.4, yoyGrowth: 3.8 },
  { economy: 'Eurozone',      m2: 16.8, yoyGrowth: 1.2 },
  { economy: 'China',         m2: 42.3, yoyGrowth: 8.7 },
  { economy: 'Japan',         m2: 10.2, yoyGrowth: 2.4 },
  { economy: 'United Kingdom', m2: 3.8, yoyGrowth: 0.9 },
] as const;

const CREDIT_IMPULSE_DEFS = [
  { country: 'United States', impulse: 1.2, level: 48.5, prevQ: 47.8 },
  { country: 'China',         impulse: 3.8, level: 62.1, prevQ: 59.4 },
  { country: 'Eurozone',      impulse: -0.4, level: 41.2, prevQ: 41.8 },
  { country: 'Japan',         impulse: 0.6, level: 38.7, prevQ: 38.3 },
  { country: 'United Kingdom', impulse: -0.8, level: 36.5, prevQ: 37.6 },
  { country: 'Canada',        impulse: 0.3, level: 44.2, prevQ: 44.0 },
] as const;

const FUNDING_COMPONENTS = [
  { name: 'Interbank Rates (SOFR)',        baseValue: 5.31, weight: 0.25 },
  { name: 'Commercial Paper Spreads',      baseValue: 0.42, weight: 0.20 },
  { name: 'FX Swap Basis (EUR/USD)',       baseValue: -0.18, weight: 0.20 },
  { name: 'Repo Rates (O/N)',             baseValue: 5.30, weight: 0.20 },
  { name: 'Money Market Fund Flows (wk)', baseValue: 12.5, weight: 0.15 },
] as const;

const FLOW_CORRIDORS = [
  { corridor: 'US \u2192 EM',      flowType: 'portfolio' as const, baseAmount: 18.4 },
  { corridor: 'EU \u2192 Asia',    flowType: 'portfolio' as const, baseAmount: 12.7 },
  { corridor: 'Japan \u2192 US',   flowType: 'portfolio' as const, baseAmount: 24.3 },
  { corridor: 'China \u2192 EM',   flowType: 'FDI' as const,       baseAmount: 8.9 },
  { corridor: 'US \u2192 EU',      flowType: 'banking' as const,   baseAmount: 15.6 },
  { corridor: 'EM \u2192 US',      flowType: 'portfolio' as const, baseAmount: 9.2 },
  { corridor: 'Middle East \u2192 Asia', flowType: 'FDI' as const, baseAmount: 6.8 },
  { corridor: 'EU \u2192 US',      flowType: 'banking' as const,   baseAmount: 21.1 },
] as const;

const TRENDS_3 = ['expanding', 'contracting', 'stable'] as const;
const DIRECTIONS_3 = ['accelerating', 'decelerating', 'flat'] as const;
const SIGNALS_3 = ['tight', 'neutral', 'easy'] as const;
const REGIMES = ['abundant', 'ample', 'scarce'] as const;
const FLOW_DIRS = ['inflow', 'outflow'] as const;
const FLOW_TRENDS = ['increasing', 'decreasing', 'stable'] as const;

// -- Cache --


let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-global-liquidity-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const jitterAbs = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. Central Bank Balance Sheets --

  const centralBankBalanceSheets = CB_DEFS.map(cb => {
    const totalAssets = roundTo(jitter(cb.totalAssets, 0.06), 2);
    const monthlyChange = roundTo(jitterAbs(0, 0.08) * cb.totalAssets, 3);
    const yoyChangePct = roundTo(jitterAbs(0, 8), 1);
    const assetToGdpPct = roundTo(jitter(cb.gdpPct, 0.05), 1);
    const trend = pick(TRENDS_3);
    return {
      name: cb.name,
      code: cb.code,
      totalAssets,
      totalAssetsUnit: 'trillions USD',
      monthlyChange,
      yoyChangePct,
      assetToGdpPct,
      trend,
    };
  });

  // -- 2. Global M2 Tracker --

  const economies = M2_DEFS.map(e => {
    const m2 = roundTo(jitter(e.m2, 0.04), 1);
    const yoyGrowth = roundTo(jitterAbs(e.yoyGrowth, 1.5), 1);
    return { economy: e.economy, m2, m2Unit: 'trillions USD', yoyGrowthPct: yoyGrowth };
  });

  const aggregateM2 = roundTo(economies.reduce((s, e) => s + e.m2, 0), 1);
  const weightedGrowth = economies.reduce((s, e) => s + e.m2 * e.yoyGrowthPct, 0) / aggregateM2;

  const globalM2Tracker = {
    aggregateGlobalM2: aggregateM2,
    aggregateUnit: 'trillions USD',
    yoyChangePct: roundTo(weightedGrowth, 1),
    economies,
  };

  // -- 3. Credit Impulse --

  const creditImpulse = CREDIT_IMPULSE_DEFS.map(ci => {
    const impulse = roundTo(jitterAbs(ci.impulse, 1.0), 1);
    const currentLevel = roundTo(jitter(ci.level, 0.06), 1);
    const previousQuarter = roundTo(jitter(ci.prevQ, 0.04), 1);
    const direction = impulse > 0.5 ? 'accelerating' : impulse < -0.5 ? 'decelerating' : 'flat';
    return {
      country: ci.country,
      creditImpulsePct: impulse,
      direction: direction as typeof DIRECTIONS_3[number],
      currentLevel,
      previousQuarter,
    };
  });

  // -- 4. Funding Conditions Index --

  const components = FUNDING_COMPONENTS.map(fc => {
    const value = roundTo(jitter(fc.baseValue, 0.12), 2);
    const signal = pick(SIGNALS_3);
    return { name: fc.name, value, signal, weight: fc.weight };
  });

  // Composite score: 0 = extremely tight, 100 = extremely easy
  // Use a seeded random value centered around 45 (slightly tight bias)
  const compositeScore = roundTo(Math.min(100, Math.max(0, jitter(45, 0.30))), 1);

  const fundingConditionsIndex = {
    compositeScore,
    components,
  };

  // -- 5. Liquidity Regime --

  const regime = pick(REGIMES);
  const excessReserves = roundTo(jitter(3.25, 0.12), 2);
  const reverseRepoUsage = roundTo(jitter(0.38, 0.35), 2);
  const tgaBalance = roundTo(jitter(0.72, 0.20), 2);

  const liquidityRegime = {
    currentRegime: regime,
    excessReserves,
    excessReservesUnit: 'trillions USD',
    reverseRepoFacilityUsage: reverseRepoUsage,
    reverseRepoUnit: 'trillions USD',
    tgaBalance,
    tgaUnit: 'trillions USD',
  };

  // -- 6. Cross-Border Flows --

  const crossBorderFlows = FLOW_CORRIDORS.map(fc => {
    const amount = roundTo(jitter(fc.baseAmount, 0.20), 1);
    const direction = pick(FLOW_DIRS);
    const trend = pick(FLOW_TRENDS);
    return {
      corridor: fc.corridor,
      flowType: fc.flowType,
      amount,
      amountUnit: 'billions USD',
      direction,
      trend,
    };
  });

  return {
    centralBankBalanceSheets,
    globalM2Tracker,
    creditImpulse,
    fundingConditionsIndex,
    liquidityRegime,
    crossBorderFlows,
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
    console.error('[GlobalLiquidityMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate global liquidity monitor data' });
  }
});

export default router;
