import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- Static data --

const GDP_COUNTRIES = [
  { country: 'United States', baseCurrent: 2.8, baseConsensus: 2.5, model: 'Atlanta Fed GDPNow' },
  { country: 'China', baseCurrent: 5.0, baseConsensus: 4.8, model: 'Nowcast' },
  { country: 'Eurozone', baseCurrent: 0.9, baseConsensus: 1.0, model: 'Nowcast' },
  { country: 'Japan', baseCurrent: 1.2, baseConsensus: 1.0, model: 'Nowcast' },
  { country: 'United Kingdom', baseCurrent: 0.6, baseConsensus: 0.8, model: 'Nowcast' },
  { country: 'India', baseCurrent: 6.5, baseConsensus: 6.3, model: 'Nowcast' },
  { country: 'Brazil', baseCurrent: 2.2, baseConsensus: 2.0, model: 'Nowcast' },
  { country: 'Germany', baseCurrent: 0.3, baseConsensus: 0.5, model: 'Nowcast' },
] as const;

const LEADING_INDICATORS = [
  { indicator: 'OECD CLI', baseValue: 100.5, signal: 'Expansion' as const },
  { indicator: 'Conference Board LEI', baseValue: 104.2, signal: 'Contraction' as const },
  { indicator: 'Chicago Fed CFNAI', baseValue: 0.12, signal: 'Expansion' as const },
  { indicator: 'Philly Fed ADS', baseValue: -0.15, signal: 'Turning' as const },
  { indicator: 'ECRI WLI', baseValue: 148.5, signal: 'Expansion' as const },
  { indicator: 'Baltic Dry Index', baseValue: 1850, signal: 'Expansion' as const },
  { indicator: 'Copper/Gold Ratio', baseValue: 0.165, signal: 'Turning' as const },
  { indicator: 'US Yield Curve 2s10s', baseValue: 0.15, signal: 'Expansion' as const },
] as const;

const TRADE_COUNTRIES = [
  { country: 'United States', baseBalance: -68.5, baseExports: 265, baseImports: 333.5, topPartner: 'China', surplusDeficit: 'Deficit' as const },
  { country: 'China', baseBalance: 82.3, baseExports: 310, baseImports: 227.7, topPartner: 'United States', surplusDeficit: 'Surplus' as const },
  { country: 'Germany', baseBalance: 21.5, baseExports: 135, baseImports: 113.5, topPartner: 'United States', surplusDeficit: 'Surplus' as const },
  { country: 'Japan', baseBalance: -3.2, baseExports: 75, baseImports: 78.2, topPartner: 'China', surplusDeficit: 'Deficit' as const },
  { country: 'United Kingdom', baseBalance: -18.5, baseExports: 55, baseImports: 73.5, topPartner: 'United States', surplusDeficit: 'Deficit' as const },
  { country: 'South Korea', baseBalance: 5.8, baseExports: 58, baseImports: 52.2, topPartner: 'China', surplusDeficit: 'Surplus' as const },
  { country: 'India', baseBalance: -22.0, baseExports: 38, baseImports: 60, topPartner: 'China', surplusDeficit: 'Deficit' as const },
  { country: 'Brazil', baseBalance: 7.5, baseExports: 30, baseImports: 22.5, topPartner: 'China', surplusDeficit: 'Surplus' as const },
] as const;

const FISCAL_COUNTRIES = [
  { country: 'United States', debtToGDP: 123, budgetDeficit: -6.3, primaryBalance: -3.1, interestCost: 3.2, debtRating: 'AA+', cdsSpread: 28, outlook: 'Negative' as const },
  { country: 'China', debtToGDP: 83, budgetDeficit: -7.1, primaryBalance: -5.2, interestCost: 1.9, debtRating: 'A+', cdsSpread: 65, outlook: 'Stable' as const },
  { country: 'Japan', debtToGDP: 260, budgetDeficit: -5.8, primaryBalance: -3.5, interestCost: 2.3, debtRating: 'A+', cdsSpread: 22, outlook: 'Stable' as const },
  { country: 'Germany', debtToGDP: 65, budgetDeficit: -1.8, primaryBalance: -0.3, interestCost: 1.5, debtRating: 'AAA', cdsSpread: 12, outlook: 'Stable' as const },
  { country: 'United Kingdom', debtToGDP: 101, budgetDeficit: -4.5, primaryBalance: -1.2, interestCost: 3.3, debtRating: 'AA', cdsSpread: 32, outlook: 'Stable' as const },
  { country: 'France', debtToGDP: 112, budgetDeficit: -5.5, primaryBalance: -3.0, interestCost: 2.5, debtRating: 'AA-', cdsSpread: 38, outlook: 'Negative' as const },
  { country: 'India', debtToGDP: 82, budgetDeficit: -5.9, primaryBalance: -2.4, interestCost: 3.5, debtRating: 'BBB-', cdsSpread: 95, outlook: 'Positive' as const },
  { country: 'Brazil', debtToGDP: 74, budgetDeficit: -7.2, primaryBalance: -1.0, interestCost: 6.2, debtRating: 'BB', cdsSpread: 155, outlook: 'Stable' as const },
] as const;

const SIGNALS = ['Expansion', 'Contraction', 'Turning'] as const;
const OUTLOOKS = ['Stable', 'Positive', 'Negative'] as const;
const LEADING_SIGNALS = ['Expansion', 'Slowing', 'Contraction'] as const;
const DOMINANT_THEMES = [
  'Synchronized Slowdown', 'US Exceptionalism', 'Global Reflation',
  'Policy Divergence', 'Trade War Escalation', 'Soft Landing Consensus',
  'Stagflation Risk', 'China Stimulus Pivot',
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-global-macro-dashboard'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // 1. GDP Nowcasts (8 items)
  const gdpNowcasts = GDP_COUNTRIES.map(c => {
    const currentEstimate = round2(jitter(c.baseCurrent, 0.15));
    const priorEstimate = round2(currentEstimate + (rng() - 0.5) * 0.6);
    const revision = round2(currentEstimate - priorEstimate);
    const consensusForecast = round2(jitter(c.baseConsensus, 0.10));
    const surprise = round2(currentEstimate - consensusForecast);
    const daysAgo = Math.floor(rng() * 5) + 1;
    const updated = new Date();
    updated.setDate(updated.getDate() - daysAgo);

    return {
      country: c.country,
      currentEstimate,
      priorEstimate,
      revision,
      consensusForecast,
      surprise,
      trackingModel: c.model,
      lastUpdated: updated.toISOString().slice(0, 10),
    };
  });

  // 2. Leading Indicators (8 items)
  const leadingIndicators = LEADING_INDICATORS.map(li => {
    const currentValue = round2(jitter(li.baseValue, 0.04));
    const priorValue = round2(jitter(li.baseValue, 0.04));
    const change = round2(currentValue - priorValue);
    const signal = pick(SIGNALS);
    const momentum = round2((rng() - 0.45) * 4); // slight positive bias
    const percentile = round1(rng() * 100);

    return {
      indicator: li.indicator,
      currentValue,
      priorValue,
      change,
      signal,
      momentum,
      percentile,
    };
  });

  // 3. Trade Balances (8 items)
  const tradeBalances = TRADE_COUNTRIES.map(tc => {
    const tradeBalance = round2(jitter(tc.baseBalance, 0.12));
    const exports = round2(jitter(tc.baseExports, 0.08));
    const imports = round2(jitter(tc.baseImports, 0.08));
    const change = round2((rng() - 0.5) * 8);
    const yoyGrowth = round1((rng() - 0.4) * 15);

    return {
      country: tc.country,
      tradeBalance,
      exports,
      imports,
      change,
      yoyGrowth,
      topPartner: tc.topPartner,
      surplusDeficit: tradeBalance >= 0 ? 'Surplus' as const : 'Deficit' as const,
    };
  });

  // 4. Fiscal Metrics (8 items)
  const fiscalMetrics = FISCAL_COUNTRIES.map(fc => {
    const debtToGDP = round1(jitter(fc.debtToGDP, 0.03));
    const budgetDeficit = round1(jitter(fc.budgetDeficit, 0.10));
    const primaryBalance = round1(jitter(fc.primaryBalance, 0.12));
    const interestCost = round1(jitter(fc.interestCost, 0.08));
    const cdsSpread = Math.round(jitter(fc.cdsSpread, 0.15));
    const outlook = pick(OUTLOOKS);

    return {
      country: fc.country,
      debtToGDP,
      budgetDeficit,
      primaryBalance,
      interestCost,
      debtRating: fc.debtRating,
      cdsSpread,
      outlook,
    };
  });

  // 5. Market Summary
  const usNowcast = gdpNowcasts.find(g => g.country === 'United States');
  const ezNowcast = gdpNowcasts.find(g => g.country === 'Eurozone');
  const cnNowcast = gdpNowcasts.find(g => g.country === 'China');

  const allEstimates = gdpNowcasts.map(g => g.currentEstimate);
  const globalGrowthEstimate = round2(allEstimates.reduce((a, b) => a + b, 0) / allEstimates.length);

  const expansionCount = leadingIndicators.filter(li => li.signal === 'Expansion').length;
  const contractionCount = leadingIndicators.filter(li => li.signal === 'Contraction').length;
  let leadingIndicatorSignal: 'Expansion' | 'Slowing' | 'Contraction';
  if (expansionCount > contractionCount + 2) {
    leadingIndicatorSignal = 'Expansion';
  } else if (contractionCount > expansionCount + 2) {
    leadingIndicatorSignal = 'Contraction';
  } else {
    leadingIndicatorSignal = 'Slowing';
  }

  const dominantTheme = pick(DOMINANT_THEMES);

  const marketSummary = {
    globalGrowthEstimate,
    usGDPNowcast: usNowcast?.currentEstimate ?? 2.5,
    eurozoneGrowth: ezNowcast?.currentEstimate ?? 0.9,
    chinaGrowth: cnNowcast?.currentEstimate ?? 5.0,
    leadingIndicatorSignal,
    dominantTheme,
  };

  return {
    gdpNowcasts,
    leadingIndicators,
    tradeBalances,
    fiscalMetrics,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[GlobalMacroDashboard] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate global macro dashboard data' });
  }
});

export default router;
