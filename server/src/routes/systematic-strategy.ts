import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// -- Base data --

const STRATEGY_NAMES = [
  'Trend Following',
  'Mean Reversion',
  'Momentum',
  'Carry',
  'Value',
  'Low Vol',
  'Quality',
  'Multi-Factor',
] as const;

const SIGNAL_ASSETS = [
  'S&P 500',
  'NASDAQ',
  'Russell 2000',
  'US 10Y',
  'Gold',
  'Crude Oil',
  'EUR/USD',
  'USD/JPY',
] as const;

const FACTOR_NAMES = [
  'Market',
  'Size',
  'Value',
  'Momentum',
  'Quality',
  'Low Vol',
] as const;

// -- Base parameters for strategies --

const STRATEGY_BASES = [
  { base1D: 0.12, base1W: 0.45, base1M: 1.8, baseYTD: 7.2, base1Y: 11.5, baseSharpe: 0.92, baseMaxDD: -12.5, baseWinRate: 54 },
  { base1D: -0.08, base1W: 0.22, base1M: 0.9, baseYTD: 3.5, base1Y: 5.8, baseSharpe: 0.68, baseMaxDD: -8.2, baseWinRate: 58 },
  { base1D: 0.18, base1W: 0.65, base1M: 2.4, baseYTD: 9.1, base1Y: 14.2, baseSharpe: 1.05, baseMaxDD: -15.3, baseWinRate: 52 },
  { base1D: 0.05, base1W: 0.15, base1M: 0.6, baseYTD: 4.8, base1Y: 7.1, baseSharpe: 1.15, baseMaxDD: -6.5, baseWinRate: 61 },
  { base1D: -0.03, base1W: 0.18, base1M: 1.1, baseYTD: 5.5, base1Y: 8.9, baseSharpe: 0.78, baseMaxDD: -10.8, baseWinRate: 55 },
  { base1D: 0.02, base1W: 0.08, base1M: 0.4, baseYTD: 3.2, base1Y: 5.1, baseSharpe: 0.85, baseMaxDD: -5.8, baseWinRate: 62 },
  { base1D: 0.07, base1W: 0.28, base1M: 1.3, baseYTD: 6.8, base1Y: 10.4, baseSharpe: 0.95, baseMaxDD: -9.2, baseWinRate: 57 },
  { base1D: 0.10, base1W: 0.38, base1M: 1.5, baseYTD: 8.0, base1Y: 12.8, baseSharpe: 1.10, baseMaxDD: -11.0, baseWinRate: 56 },
] as const;

// -- Base parameters for signal assets --

const SIGNAL_BASES = [
  { baseTrend: 0.45, baseMomentum: 0.52, baseMeanRev: -0.18, baseCarry: 0.10 },
  { baseTrend: 0.55, baseMomentum: 0.65, baseMeanRev: -0.25, baseCarry: 0.05 },
  { baseTrend: 0.20, baseMomentum: 0.30, baseMeanRev: 0.10, baseCarry: 0.08 },
  { baseTrend: -0.30, baseMomentum: -0.15, baseMeanRev: 0.35, baseCarry: 0.40 },
  { baseTrend: 0.35, baseMomentum: 0.28, baseMeanRev: -0.05, baseCarry: -0.12 },
  { baseTrend: -0.10, baseMomentum: -0.20, baseMeanRev: 0.22, baseCarry: 0.15 },
  { baseTrend: -0.15, baseMomentum: -0.08, baseMeanRev: 0.18, baseCarry: 0.25 },
  { baseTrend: 0.25, baseMomentum: 0.18, baseMeanRev: -0.10, baseCarry: 0.30 },
] as const;

// -- Base parameters for factors --

const FACTOR_BASES = [
  { baseMTD: 1.2, baseQTD: 3.5, baseYTD: 7.8, baseTStat: 2.15 },
  { baseMTD: 0.4, baseQTD: 1.1, baseYTD: 2.5, baseTStat: 1.35 },
  { baseMTD: 0.8, baseQTD: 2.2, baseYTD: 5.1, baseTStat: 1.82 },
  { baseMTD: 1.5, baseQTD: 4.0, baseYTD: 9.2, baseTStat: 2.45 },
  { baseMTD: 0.6, baseQTD: 1.8, baseYTD: 4.5, baseTStat: 1.68 },
  { baseMTD: 0.3, baseQTD: 0.9, baseYTD: 2.1, baseTStat: 1.22 },
] as const;

// -- Data generation --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-systematic-strategy'));

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  // 1. Strategy Performance
  const strategyPerformance = STRATEGY_NAMES.map((name, i) => {
    const s = STRATEGY_BASES[i];
    const return1D = round2(jitter(s.base1D, 0.6) + (rng() - 0.5) * 0.3);
    const return1W = round2(jitter(s.base1W, 0.4) + (rng() - 0.5) * 0.5);
    const return1M = round2(jitter(s.base1M, 0.3));
    const returnYTD = round2(jitter(s.baseYTD, 0.25));
    const return1Y = round2(jitter(s.base1Y, 0.2));
    const sharpe = round2(clamp(jitter(s.baseSharpe, 0.2), 0.1, 2.5));
    const maxDD = round2(clamp(jitter(s.baseMaxDD, 0.25), -30, -2));
    const winRate = round2(clamp(jitter(s.baseWinRate, 0.1), 40, 75));

    return {
      strategy: name,
      return1D,
      return1W,
      return1M,
      returnYTD,
      return1Y,
      sharpe,
      maxDD,
      winRate,
    };
  });

  // 2. Signal Dashboard
  const signalDashboard = SIGNAL_ASSETS.map((asset, i) => {
    const b = SIGNAL_BASES[i];
    const trendSignal = round2(clamp(jitter(b.baseTrend, 0.35) + (rng() - 0.5) * 0.3, -1, 1));
    const momentumScore = round2(clamp(jitter(b.baseMomentum, 0.35) + (rng() - 0.5) * 0.3, -1, 1));
    const meanReversionScore = round2(clamp(jitter(b.baseMeanRev, 0.4) + (rng() - 0.5) * 0.3, -1, 1));
    const carry = round2(clamp(jitter(b.baseCarry, 0.5) + (rng() - 0.5) * 0.2, -1, 1));
    const compositeSignal = round2(clamp(
      trendSignal * 0.30 + momentumScore * 0.25 + meanReversionScore * 0.20 + carry * 0.25,
      -1, 1
    ));

    return {
      asset,
      trendSignal,
      momentumScore,
      meanReversionScore,
      carry,
      compositeSignal,
    };
  });

  // 3. Factor Performance
  const factorPerformance = FACTOR_NAMES.map((factor, i) => {
    const f = FACTOR_BASES[i];
    const mtd = round2(jitter(f.baseMTD, 0.35) + (rng() - 0.5) * 0.5);
    const qtd = round2(jitter(f.baseQTD, 0.3) + (rng() - 0.5) * 1.0);
    const ytd = round2(jitter(f.baseYTD, 0.25));
    const tStat = round2(clamp(jitter(f.baseTStat, 0.25) + (rng() - 0.5) * 0.4, -0.5, 4.0));

    return {
      factor,
      mtd,
      qtd,
      ytd,
      tStat,
    };
  });

  // 4. Risk Metrics
  const portfolioBeta = round2(clamp(0.85 + (rng() - 0.5) * 0.6, 0.2, 1.5));
  const netExposurePct = round2(clamp((rng() - 0.3) * 100, -50, 100));
  const grossExposurePct = round2(clamp(150 + (rng() - 0.5) * 80, 80, 250));
  const var95 = round2(clamp(-(1.5 + rng() * 3.5), -6, -0.5));
  const cvar = round2(clamp(var95 * (1.3 + rng() * 0.5), -10, -0.8));

  // Correlation matrix summary: pairwise correlations among strategies
  const corrPairs: { pair: string; correlation: number }[] = [];
  for (let i = 0; i < STRATEGY_NAMES.length; i++) {
    for (let j = i + 1; j < STRATEGY_NAMES.length; j++) {
      corrPairs.push({
        pair: `${STRATEGY_NAMES[i]} / ${STRATEGY_NAMES[j]}`,
        correlation: round2(clamp((rng() - 0.5) * 1.6, -0.8, 0.9)),
      });
    }
  }

  // Pick top-5 highest and lowest correlation pairs for summary
  const sortedCorr = [...corrPairs].sort((a, b) => b.correlation - a.correlation);
  const correlationMatrixSummary = {
    highestCorrelations: sortedCorr.slice(0, 5),
    lowestCorrelations: sortedCorr.slice(-5).reverse(),
    averageCorrelation: round2(corrPairs.reduce((s, c) => s + c.correlation, 0) / corrPairs.length),
  };

  const riskMetrics = {
    var95,
    cvar,
    correlationMatrixSummary,
    portfolioBeta,
    netExposurePct,
    grossExposurePct,
  };

  return {
    strategyPerformance,
    signalDashboard,
    factorPerformance,
    riskMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
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
