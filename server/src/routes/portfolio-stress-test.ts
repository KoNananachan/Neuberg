import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- Seed Data --

const PORTFOLIO_NOTIONAL = 250_000_000; // $250M reference portfolio

const SCENARIOS = [
  { name: '2008 Global Financial Crisis', description: 'Lehman collapse triggers global credit freeze, equity markets fall 40%+, credit spreads blow out to 600bp+', basePct: -38.5, worstAsset: 'Financials', bestAsset: 'US Treasuries', probability: 0.02, historicalDate: '2008-09-15', type: 'historical' as const },
  { name: '2020 COVID-19 Crash', description: 'Pandemic lockdowns cause fastest bear market in history, VIX hits 82, cross-asset liquidation', basePct: -28.2, worstAsset: 'Energy', bestAsset: 'Gold', probability: 0.03, historicalDate: '2020-03-16', type: 'historical' as const },
  { name: '2022 Rate Shock', description: 'Fed hikes 425bp in one year, duration-heavy portfolios suffer worst bond losses since 1788', basePct: -18.6, worstAsset: 'Long Duration Bonds', bestAsset: 'Commodities', probability: 0.05, historicalDate: '2022-01-01', type: 'historical' as const },
  { name: '1998 LTCM / Russian Default', description: 'Russia defaults on sovereign debt, LTCM leveraged arbitrage unwinds, liquidity crisis in spread products', basePct: -14.8, worstAsset: 'EM Debt', bestAsset: 'US Treasuries', probability: 0.03, historicalDate: '1998-08-17', type: 'historical' as const },
  { name: '2011 European Debt Crisis', description: 'Greek restructuring triggers contagion to Italy/Spain, EU sovereign spreads widen 400bp+', basePct: -16.2, worstAsset: 'EU Periphery Bonds', bestAsset: 'Bunds', probability: 0.04, historicalDate: '2011-07-01', type: 'historical' as const },
  { name: '2000 Dot-Com Bust', description: 'Tech bubble bursts, Nasdaq falls 78% peak-to-trough, telecom and growth stocks decimated', basePct: -22.4, worstAsset: 'Tech Equities', bestAsset: 'Value Stocks', probability: 0.03, historicalDate: '2000-03-10', type: 'historical' as const },
  { name: 'Fed Emergency +200bp Hike', description: 'Inflation re-accelerates forcing emergency inter-meeting 200bp hike, curve inverts violently', basePct: -15.3, worstAsset: 'Growth Equities', bestAsset: 'Short-Duration Bills', probability: 0.01, historicalDate: null, type: 'hypothetical' as const },
  { name: 'China-Taiwan Conflict', description: 'Military escalation triggers semiconductor supply shock, global trade disruption, Asian FX collapse', basePct: -32.1, worstAsset: 'Semiconductors', bestAsset: 'Defense Stocks', probability: 0.005, historicalDate: null, type: 'hypothetical' as const },
  { name: 'USD Reserve Status Loss', description: 'Coordinated BRICS de-dollarization, USD index falls 25%, US bond yields spike 300bp', basePct: -24.7, worstAsset: 'US Treasuries', bestAsset: 'Gold', probability: 0.002, historicalDate: null, type: 'hypothetical' as const },
] as const;

const FACTOR_SHOCKS = [
  { factor: 'S&P 500', currentBase: 5280, shockPct: -0.20, unit: 'pts', sensitivity: -0.72 },
  { factor: 'US 10Y Yield', currentBase: 4.25, shockBps: 150, unit: '%', sensitivity: -0.45 },
  { factor: 'USD Index (DXY)', currentBase: 104.5, shockPct: 0.10, unit: 'pts', sensitivity: -0.18 },
  { factor: 'VIX', currentBase: 16.2, shockAbs: 35, unit: 'pts', sensitivity: -0.35 },
  { factor: 'Crude Oil (WTI)', currentBase: 78.5, shockPct: -0.35, unit: '$/bbl', sensitivity: -0.12 },
  { factor: 'IG Credit Spread', currentBase: 95, shockBps: 200, unit: 'bps', sensitivity: -0.28 },
  { factor: 'EM FX Basket', currentBase: 100, shockPct: -0.15, unit: 'idx', sensitivity: -0.08 },
  { factor: 'Gold', currentBase: 2340, shockPct: 0.15, unit: '$/oz', sensitivity: 0.10 },
  { factor: 'HY Credit Spread', currentBase: 340, shockBps: 450, unit: 'bps', sensitivity: -0.22 },
  { factor: 'EUR/USD', currentBase: 1.085, shockPct: -0.08, unit: 'rate', sensitivity: -0.06 },
] as const;

const TOP_HOLDINGS = [
  { name: 'US Treasury 10Y', baseWeight: 14.2, baseVarContrib: 18.5, baseMarginalVaR: 0.032, baseBeta: 0.15 },
  { name: 'Apple Inc (AAPL)', baseWeight: 8.5, baseVarContrib: 10.2, baseMarginalVaR: 0.048, baseBeta: 1.18 },
  { name: 'S&P 500 Index Futures', baseWeight: 7.8, baseVarContrib: 12.8, baseMarginalVaR: 0.052, baseBeta: 1.00 },
  { name: 'IG Corporate Bond ETF', baseWeight: 6.9, baseVarContrib: 7.4, baseMarginalVaR: 0.028, baseBeta: 0.35 },
  { name: 'Microsoft Corp (MSFT)', baseWeight: 5.6, baseVarContrib: 6.8, baseMarginalVaR: 0.045, baseBeta: 1.12 },
  { name: 'Gold Futures (GC)', baseWeight: 4.8, baseVarContrib: 4.2, baseMarginalVaR: 0.022, baseBeta: -0.05 },
  { name: 'EUR/USD Forward', baseWeight: 4.5, baseVarContrib: 3.8, baseMarginalVaR: 0.019, baseBeta: 0.08 },
  { name: 'JPMorgan Chase (JPM)', baseWeight: 3.9, baseVarContrib: 5.1, baseMarginalVaR: 0.041, baseBeta: 1.25 },
  { name: 'Nvidia Corp (NVDA)', baseWeight: 3.2, baseVarContrib: 8.5, baseMarginalVaR: 0.068, baseBeta: 1.65 },
  { name: 'HY Bond ETF (HYG)', baseWeight: 3.1, baseVarContrib: 4.5, baseMarginalVaR: 0.038, baseBeta: 0.55 },
] as const;

const LIQUIDITY_BUCKETS = [
  { bucket: '1 day', basePct: 32.5 },
  { bucket: '2-3 days', basePct: 24.8 },
  { bucket: '1 week', basePct: 18.2 },
  { bucket: '2 weeks', basePct: 12.5 },
  { bucket: '1 month', basePct: 8.4 },
  { bucket: '>1 month', basePct: 3.6 },
] as const;

const DRAWDOWN_EPISODES = [
  { period: '2008 Global Financial Crisis', startDate: '2007-10-09', endDate: '2009-03-09', baseMaxDD: -56.8, baseRecoveryDays: 1480, baseCurrImpact: -38.5 },
  { period: '2020 COVID-19 Sell-off', startDate: '2020-02-19', endDate: '2020-03-23', baseMaxDD: -33.9, baseRecoveryDays: 148, baseCurrImpact: -28.2 },
  { period: '2022 Rate Tightening', startDate: '2022-01-03', endDate: '2022-10-12', baseMaxDD: -25.4, baseRecoveryDays: 385, baseCurrImpact: -18.6 },
  { period: '2000-02 Dot-Com Crash', startDate: '2000-03-24', endDate: '2002-10-09', baseMaxDD: -49.1, baseRecoveryDays: 1825, baseCurrImpact: -22.4 },
  { period: '2011 EU Sovereign Crisis', startDate: '2011-05-02', endDate: '2011-10-03', baseMaxDD: -19.4, baseRecoveryDays: 155, baseCurrImpact: -16.2 },
  { period: '2018 Q4 Vol Shock', startDate: '2018-09-20', endDate: '2018-12-24', baseMaxDD: -19.8, baseRecoveryDays: 115, baseCurrImpact: -12.5 },
] as const;

// -- Cache --


let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-portfolio-stress-test'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // -- 1. Scenario Analysis --

  const scenarioAnalysis = SCENARIOS.map(sc => {
    const portfolioImpactPct = roundTo(jitter(sc.basePct, 0.08), 2);
    const portfolioImpactDollar = roundTo((portfolioImpactPct / 100) * PORTFOLIO_NOTIONAL, 0);
    const probability = roundTo(Math.max(0.001, jitter(sc.probability, 0.15)), 4);

    return {
      name: sc.name,
      description: sc.description,
      portfolioImpactPct,
      portfolioImpactDollar,
      worstAsset: sc.worstAsset,
      bestAsset: sc.bestAsset,
      probability,
      historicalDate: sc.historicalDate,
      type: sc.type,
    };
  });

  // -- 2. Factor Shocks --

  const factorShocks = FACTOR_SHOCKS.map(fs => {
    const currentValue = roundTo(jitter(fs.currentBase, 0.03), fs.currentBase < 10 ? 3 : fs.currentBase < 200 ? 1 : 0);

    let shockedValue: number;
    if ('shockBps' in fs) {
      const bps = (fs as { shockBps: number }).shockBps;
      const shockSz = roundTo(jitter(bps, 0.10), 0);
      shockedValue = roundTo(currentValue + shockSz / 100, fs.currentBase < 10 ? 3 : 1);
    } else if ('shockAbs' in fs) {
      const abs = (fs as { shockAbs: number }).shockAbs;
      const shockTarget = roundTo(jitter(abs, 0.10), 1);
      shockedValue = roundTo(shockTarget, 1);
    } else {
      const pct = (fs as { shockPct: number }).shockPct;
      shockedValue = roundTo(currentValue * (1 + pct * jitter(1, 0.08)), fs.currentBase < 10 ? 3 : fs.currentBase < 200 ? 1 : 0);
    }

    const shockSize = fs.factor === 'VIX'
      ? `+${roundTo(shockedValue - currentValue, 1)} pts`
      : 'shockBps' in fs && fs.shockBps !== undefined
        ? `+${roundTo((shockedValue - currentValue) * 100, 0)} bps`
        : `${roundTo(((shockedValue - currentValue) / currentValue) * 100, 1)}%`;

    const portfolioSensitivity = roundTo(jitter(fs.sensitivity, 0.08), 3);
    const pnlImpact = roundTo(portfolioSensitivity * PORTFOLIO_NOTIONAL / 100, 0);

    return {
      factor: fs.factor,
      currentValue,
      shockedValue,
      shockSize,
      portfolioSensitivity,
      pnlImpact,
    };
  });

  // -- 3. Concentration Risk --

  const concentrationRisk = (() => {
    const holdings = TOP_HOLDINGS.map(h => {
      const weight = roundTo(jitter(h.baseWeight, 0.06), 2);
      const contributionToVaR = roundTo(jitter(h.baseVarContrib, 0.08), 2);
      const marginalVaR = roundTo(jitter(h.baseMarginalVaR, 0.08), 4);
      const beta = roundTo(jitter(h.baseBeta, 0.06), 2);

      return {
        name: h.name,
        weight,
        contributionToVaR,
        marginalVaR,
        beta,
      };
    });

    // Normalize weights to sum close to the total (these are top 10, not the whole portfolio)
    const totalWeight = holdings.reduce((s, h) => s + h.weight, 0);
    const totalVaRContrib = holdings.reduce((s, h) => s + h.contributionToVaR, 0);

    return {
      topHoldings: holdings,
      top10WeightPct: roundTo(totalWeight, 1),
      top10VaRContribPct: roundTo(totalVaRContrib, 1),
      herfindahlIndex: roundTo(holdings.reduce((s, h) => s + (h.weight / 100) ** 2, 0) * 10000, 0),
    };
  })();

  // -- 4. Liquidity Stress --

  const liquidityStress = (() => {
    const buckets = LIQUIDITY_BUCKETS.map(lb => {
      const pctOfPortfolio = roundTo(jitter(lb.basePct, 0.06), 1);
      const notional = roundTo((pctOfPortfolio / 100) * PORTFOLIO_NOTIONAL, 0);

      return {
        bucket: lb.bucket,
        pctOfPortfolio,
        notional,
      };
    });

    // Normalize so percentages sum to 100
    const totalPct = buckets.reduce((s, b) => s + b.pctOfPortfolio, 0);
    buckets.forEach(b => {
      b.pctOfPortfolio = roundTo((b.pctOfPortfolio / totalPct) * 100, 1);
      b.notional = roundTo((b.pctOfPortfolio / 100) * PORTFOLIO_NOTIONAL, 0);
    });

    // Adjust rounding so it sums exactly to 100
    const adjustedTotal = buckets.reduce((s, b) => s + b.pctOfPortfolio, 0);
    if (adjustedTotal !== 100) {
      buckets[0].pctOfPortfolio = roundTo(buckets[0].pctOfPortfolio + (100 - adjustedTotal), 1);
      buckets[0].notional = roundTo((buckets[0].pctOfPortfolio / 100) * PORTFOLIO_NOTIONAL, 0);
    }

    const liquidatableIn1Week = buckets.slice(0, 3).reduce((s, b) => s + b.pctOfPortfolio, 0);

    return {
      buckets,
      liquidatableIn1WeekPct: roundTo(liquidatableIn1Week, 1),
      illiquidPct: roundTo(buckets[buckets.length - 1].pctOfPortfolio, 1),
      estimatedLiquidationCostPct: roundTo(jitter(0.45, 0.15), 2),
    };
  })();

  // -- 5. Historical Drawdown Replay --

  const historicalDrawdowns = DRAWDOWN_EPISODES.map(ep => {
    const maxDrawdownPct = roundTo(jitter(ep.baseMaxDD, 0.05), 1);
    const recoveryDays = Math.round(jitter(ep.baseRecoveryDays, 0.08));
    const currentPortfolioImpact = roundTo(jitter(ep.baseCurrImpact, 0.08), 1);

    return {
      period: ep.period,
      startDate: ep.startDate,
      endDate: ep.endDate,
      maxDrawdownPct,
      recoveryDays,
      currentPortfolioImpact,
    };
  });

  return {
    scenarioAnalysis,
    factorShocks,
    concentrationRisk,
    liquidityStress,
    historicalDrawdowns,
    portfolioNotional: PORTFOLIO_NOTIONAL,
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
    console.error('[PortfolioStressTest] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate portfolio stress test data' });
  }
});

export default router;
