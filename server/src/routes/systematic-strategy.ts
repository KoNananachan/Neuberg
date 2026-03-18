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

// -- Base data --

const CTA_STRATEGIES = [
  { strategy: 'Trend Following', baseYTD: 8.5, baseSharpe: 0.95, baseAum: 12.4 },
  { strategy: 'Short-Term Momentum', baseYTD: 5.2, baseSharpe: 0.78, baseAum: 4.8 },
  { strategy: 'Carry', baseYTD: 6.1, baseSharpe: 1.05, baseAum: 8.2 },
  { strategy: 'Mean Reversion', baseYTD: 3.8, baseSharpe: 0.65, baseAum: 3.1 },
  { strategy: 'Volatility Targeting', baseYTD: 4.5, baseSharpe: 0.82, baseAum: 6.7 },
  { strategy: 'Statistical Arb', baseYTD: 10.2, baseSharpe: 1.35, baseAum: 5.5 },
  { strategy: 'Global Macro', baseYTD: 7.1, baseSharpe: 0.88, baseAum: 15.3 },
  { strategy: 'Multi-Strategy', baseYTD: 6.8, baseSharpe: 1.12, baseAum: 22.6 },
] as const;

const RISK_PARITY_CLASSES = [
  { assetClass: 'US Equities', baseWeight: 0.18, baseVol: 16.5 },
  { assetClass: 'Intl Equities', baseWeight: 0.14, baseVol: 18.2 },
  { assetClass: 'US Bonds', baseWeight: 0.28, baseVol: 5.8 },
  { assetClass: 'Global Bonds', baseWeight: 0.20, baseVol: 6.4 },
  { assetClass: 'Commodities', baseWeight: 0.12, baseVol: 19.5 },
  { assetClass: 'TIPS', baseWeight: 0.08, baseVol: 7.2 },
] as const;

const MACRO_FACTOR_NAMES = [
  'Growth', 'Inflation', 'Real Rates', 'Credit',
  'Liquidity', 'FX Carry', 'Commodity Trend', 'Vol Premium',
] as const;

const SIGNAL_ASSETS = [
  'S&P 500', 'Euro Stoxx', 'Nikkei', 'UST 10Y', 'Bund',
  'Gold', 'Crude', 'EUR/USD', 'EM FX', 'Bitcoin',
] as const;

const REBALANCE_SIGNALS = ['Increase', 'Decrease', 'Hold'] as const;
const REGIMES = ['Favorable', 'Unfavorable', 'Neutral'] as const;
const POSITIONS = ['Long', 'Short', 'Flat'] as const;

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-systematic-strategy'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  // 1. CTA Performance (8 items)
  const ctaPerformance = CTA_STRATEGIES.map(s => {
    const returnYTD = round2(jitter(s.baseYTD, 0.25));
    const returnMTD = round2((rng() - 0.4) * 5);
    const return1Y = round2(returnYTD * (1.3 + rng() * 0.8));
    const sharpe = round2(clamp(jitter(s.baseSharpe, 0.2), 0.1, 2.5));
    const maxDD = round2(-rng() * 18 - 3);
    const volatility = round2(5 + rng() * 15);
    const correlation = round2(clamp((rng() - 0.5) * 1.4, -1, 1));
    const aum = round1(jitter(s.baseAum, 0.15));

    return {
      strategy: s.strategy,
      returnMTD,
      returnYTD,
      return1Y,
      sharpe,
      maxDD,
      volatility,
      correlation,
      aum,
    };
  });

  // 2. Risk Parity (6 items)
  const rawWeights = RISK_PARITY_CLASSES.map(a => jitter(a.baseWeight, 0.2));
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = rawWeights.map(w => w / totalWeight);

  const riskParity = RISK_PARITY_CLASSES.map((a, i) => {
    const weight = round2(normalizedWeights[i]);
    const volatility = round2(jitter(a.baseVol, 0.15));
    const riskContribution = round2(weight * volatility / 100);
    const returnContrib = round2((rng() - 0.35) * 4);
    const leverage = round2(1 + rng() * 2.5);
    const rebalanceSignal = pick(REBALANCE_SIGNALS);

    return {
      assetClass: a.assetClass,
      weight,
      riskContribution,
      returnContrib,
      volatility,
      leverage,
      rebalanceSignal,
    };
  });

  // 3. Macro Factors (8 items)
  const macroFactors = MACRO_FACTOR_NAMES.map(factor => {
    const currentExposure = round2((rng() - 0.5) * 2);
    const targetExposure = round2((rng() - 0.5) * 2);
    const activeRisk = round2(rng() * 3 + 0.2);
    const returnMTD = round2((rng() - 0.45) * 6);
    const zscore = round2((rng() - 0.5) * 4);
    const regime = pick(REGIMES);

    let signal: string;
    if (zscore > 1.0) signal = 'Strong Overweight';
    else if (zscore > 0.3) signal = 'Overweight';
    else if (zscore > -0.3) signal = 'Neutral';
    else if (zscore > -1.0) signal = 'Underweight';
    else signal = 'Strong Underweight';

    return {
      factor,
      currentExposure,
      targetExposure,
      activeRisk,
      returnMTD,
      zscore,
      regime,
      signal,
    };
  });

  // 4. Signal Dashboard (10 items)
  const signalDashboard = SIGNAL_ASSETS.map(asset => {
    const trendSignal = round2(clamp((rng() - 0.5) * 2, -1, 1));
    const carrySignal = round2(clamp((rng() - 0.5) * 2, -1, 1));
    const valueSignal = round2(clamp((rng() - 0.5) * 2, -1, 1));
    const momentumSignal = round2(clamp((rng() - 0.5) * 2, -1, 1));
    const compositeSignal = round2(clamp(
      (trendSignal * 0.3 + carrySignal * 0.2 + valueSignal * 0.2 + momentumSignal * 0.3),
      -1, 1
    ));

    let position: typeof POSITIONS[number];
    if (compositeSignal > 0.2) position = 'Long';
    else if (compositeSignal < -0.2) position = 'Short';
    else position = 'Flat';

    const confidence = round2(clamp(Math.abs(compositeSignal) * 80 + rng() * 30, 10, 99));

    return {
      asset,
      trendSignal,
      carrySignal,
      valueSignal,
      momentumSignal,
      compositeSignal,
      position,
      confidence,
    };
  });

  // 5. Market Summary
  const avgCTAReturn = round2(
    ctaPerformance.reduce((sum, c) => sum + c.returnYTD, 0) / ctaPerformance.length
  );

  const longCount = signalDashboard.filter(s => s.position === 'Long').length;
  const shortCount = signalDashboard.filter(s => s.position === 'Short').length;
  let trendFollowingExposure: 'Net Long' | 'Net Short' | 'Neutral';
  if (longCount > shortCount + 2) trendFollowingExposure = 'Net Long';
  else if (shortCount > longCount + 2) trendFollowingExposure = 'Net Short';
  else trendFollowingExposure = 'Neutral';

  const riskParityLeverage = round2(
    riskParity.reduce((sum, r) => sum + r.leverage, 0) / riskParity.length
  );

  const favorableCount = macroFactors.filter(m => m.regime === 'Favorable').length;
  const unfavorableCount = macroFactors.filter(m => m.regime === 'Unfavorable').length;
  let macroRegime: string;
  if (favorableCount > unfavorableCount + 2) macroRegime = 'Expansionary';
  else if (unfavorableCount > favorableCount + 2) macroRegime = 'Contractionary';
  else macroRegime = 'Mixed';

  const activeSignals = signalDashboard.filter(s => s.position !== 'Flat').length;

  const sortedCTA = [...ctaPerformance].sort((a, b) => b.returnYTD - a.returnYTD);
  const topPerformer = sortedCTA[0].strategy;

  const marketSummary = {
    avgCTAReturn,
    trendFollowingExposure,
    riskParityLeverage,
    macroRegime,
    activeSignals,
    topPerformer,
  };

  return {
    ctaPerformance,
    riskParity,
    macroFactors,
    signalDashboard,
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
    console.error('[SystematicStrategy] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate systematic strategy data' });
  }
});

export default router;
