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

const VOL_SURFACE_UNDERLYINGS = [
  { underlying: 'SPX', baseAtm30d: 16.5, baseAtm90d: 18.2, baseSkew: -5.2, baseBfly: 1.8 },
  { underlying: 'NDX', baseAtm30d: 20.1, baseAtm90d: 22.0, baseSkew: -6.1, baseBfly: 2.2 },
  { underlying: 'RUT', baseAtm30d: 22.4, baseAtm90d: 24.5, baseSkew: -4.8, baseBfly: 2.5 },
  { underlying: 'EuroStoxx', baseAtm30d: 17.8, baseAtm90d: 19.5, baseSkew: -4.5, baseBfly: 1.6 },
  { underlying: 'Nikkei', baseAtm30d: 19.2, baseAtm90d: 21.0, baseSkew: -5.0, baseBfly: 2.0 },
  { underlying: 'FTSE', baseAtm30d: 14.8, baseAtm90d: 16.5, baseSkew: -3.8, baseBfly: 1.4 },
  { underlying: 'DAX', baseAtm30d: 16.2, baseAtm90d: 18.0, baseSkew: -4.2, baseBfly: 1.7 },
  { underlying: 'HSI', baseAtm30d: 24.5, baseAtm90d: 26.0, baseSkew: -5.8, baseBfly: 2.8 },
] as const;

const DISPERSION_INDICES = [
  { index: 'S&P 500', baseIndexIV: 16.5, baseAvgCompIV: 24.0, baseImplCorr: 0.42 },
  { index: 'Nasdaq 100', baseIndexIV: 20.5, baseAvgCompIV: 30.0, baseImplCorr: 0.38 },
  { index: 'Euro Stoxx 50', baseIndexIV: 17.2, baseAvgCompIV: 25.5, baseImplCorr: 0.40 },
  { index: 'Russell 2000', baseIndexIV: 22.8, baseAvgCompIV: 32.0, baseImplCorr: 0.35 },
  { index: 'Nikkei 225', baseIndexIV: 19.5, baseAvgCompIV: 28.0, baseImplCorr: 0.41 },
  { index: 'FTSE 100', baseIndexIV: 14.8, baseAvgCompIV: 22.0, baseImplCorr: 0.43 },
] as const;

const CORRELATION_PAIRS = [
  { pair: 'SPX-VIX', baseImplCorr: -0.82, baseRealCorr: -0.78, baseHalfLife: 12 },
  { pair: 'Gold-USD', baseImplCorr: -0.45, baseRealCorr: -0.40, baseHalfLife: 18 },
  { pair: 'Oil-CAD', baseImplCorr: 0.62, baseRealCorr: 0.55, baseHalfLife: 15 },
  { pair: 'UST-SPX', baseImplCorr: -0.35, baseRealCorr: -0.28, baseHalfLife: 22 },
  { pair: 'EUR-Bund', baseImplCorr: 0.48, baseRealCorr: 0.42, baseHalfLife: 20 },
  { pair: 'BTC-NDX', baseImplCorr: 0.55, baseRealCorr: 0.48, baseHalfLife: 10 },
  { pair: 'EM-DXY', baseImplCorr: -0.58, baseRealCorr: -0.52, baseHalfLife: 16 },
  { pair: 'Credit-Equity', baseImplCorr: 0.65, baseRealCorr: 0.60, baseHalfLife: 25 },
] as const;

const VOL_REGIME_INDICATORS = [
  { indicator: 'VIX', baseLevel: 16.5, base20dPct: 35, base252dPct: 28 },
  { indicator: 'VVIX', baseLevel: 88.0, base20dPct: 45, base252dPct: 40 },
  { indicator: 'MOVE', baseLevel: 105.0, base20dPct: 50, base252dPct: 42 },
  { indicator: 'CVIX', baseLevel: 8.5, base20dPct: 38, base252dPct: 32 },
  { indicator: 'TYVIX', baseLevel: 5.2, base20dPct: 42, base252dPct: 35 },
  { indicator: 'GVZ', baseLevel: 15.8, base20dPct: 40, base252dPct: 33 },
] as const;

const SURFACE_SIGNALS = ['Buy Vol', 'Sell Vol', 'Calendar', 'Skew Trade'] as const;
const DISPERSION_SIGNALS = ['Long Dispersion', 'Short Dispersion', 'Neutral'] as const;
const CORR_SIGNALS = ['Converging', 'Diverging', 'Fair'] as const;
const VOL_REGIMES = ['Low Vol', 'Normal', 'Elevated', 'Crisis'] as const;
const VOL_TRENDS = ['Rising', 'Falling', 'Stable'] as const;

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-volatility-arbitrage'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  // 1. Volatility Surface Arbitrage (8 items)
  const volSurfaceArb = VOL_SURFACE_UNDERLYINGS.map(u => {
    const atm30dIV = round2(jitter(u.baseAtm30d, 0.12));
    const atm90dIV = round2(jitter(u.baseAtm90d, 0.10));
    const calendarSpread = round2(atm90dIV - atm30dIV);
    const skew25d = round2(jitter(u.baseSkew, 0.20));
    const butterflySpread = round2(jitter(u.baseBfly, 0.25));
    const surfaceZscore = round2((rng() - 0.5) * 5);

    let signal: typeof SURFACE_SIGNALS[number];
    if (surfaceZscore > 1.2) signal = 'Sell Vol';
    else if (surfaceZscore < -1.2) signal = 'Buy Vol';
    else if (Math.abs(calendarSpread) > 3.0) signal = 'Calendar';
    else signal = 'Skew Trade';

    const expectedPnL = round2((rng() - 0.4) * 8);

    return {
      underlying: u.underlying,
      atm30dIV,
      atm90dIV,
      calendarSpread,
      skew25d,
      butterflySpread,
      surfaceZscore,
      signal,
      expectedPnL,
    };
  });

  // 2. Dispersion Trades (6 items)
  const dispersionTrades = DISPERSION_INDICES.map(d => {
    const indexIV = round2(jitter(d.baseIndexIV, 0.10));
    const avgComponentIV = round2(jitter(d.baseAvgCompIV, 0.10));
    const impliedCorrelation = round2(clamp(jitter(d.baseImplCorr, 0.15), 0.10, 0.85));
    const realizedCorrelation = round2(clamp(impliedCorrelation + (rng() - 0.5) * 0.20, 0.08, 0.85));
    const corrSpread = round2(impliedCorrelation - realizedCorrelation);
    const dispersionPnl = round2((rng() - 0.4) * 6);

    let signal: typeof DISPERSION_SIGNALS[number];
    if (corrSpread > 0.06) signal = 'Long Dispersion';
    else if (corrSpread < -0.06) signal = 'Short Dispersion';
    else signal = 'Neutral';

    return {
      index: d.index,
      indexIV,
      avgComponentIV,
      impliedCorrelation,
      realizedCorrelation,
      corrSpread,
      dispersionPnl,
      signal,
    };
  });

  // 3. Correlation Trades (8 items)
  const correlationTrades = CORRELATION_PAIRS.map(c => {
    const impliedCorr = round2(clamp(jitter(c.baseImplCorr, 0.12), -1, 1));
    const realizedCorr = round2(clamp(jitter(c.baseRealCorr, 0.15), -1, 1));
    const spread = round2(impliedCorr - realizedCorr);
    const zscore = round2((rng() - 0.5) * 4);
    const halfLife = Math.floor(clamp(jitter(c.baseHalfLife, 0.30), 3, 60));

    let signal: typeof CORR_SIGNALS[number];
    if (Math.abs(zscore) > 1.5) signal = spread > 0 ? 'Diverging' : 'Converging';
    else signal = 'Fair';

    const positions = ['Long Corr', 'Short Corr', 'Flat', 'Partial Long', 'Partial Short'];
    const position = positions[Math.floor(rng() * positions.length)];

    return {
      pair: c.pair,
      impliedCorr,
      realizedCorr,
      spread,
      zscore,
      halfLife,
      signal,
      position,
    };
  });

  // 4. Volatility Regime Indicators (6 items)
  const volRegimeIndicators = VOL_REGIME_INDICATORS.map(v => {
    const currentLevel = round2(jitter(v.baseLevel, 0.15));
    const percentile20d = round1(clamp(jitter(v.base20dPct, 0.25), 1, 99));
    const percentile252d = round1(clamp(jitter(v.base252dPct, 0.25), 1, 99));
    const zscore = round2((rng() - 0.5) * 4);

    let regime: typeof VOL_REGIMES[number];
    if (percentile252d > 80) regime = 'Crisis';
    else if (percentile252d > 60) regime = 'Elevated';
    else if (percentile252d > 30) regime = 'Normal';
    else regime = 'Low Vol';

    let trend: typeof VOL_TRENDS[number];
    if (percentile20d - percentile252d > 10) trend = 'Rising';
    else if (percentile252d - percentile20d > 10) trend = 'Falling';
    else trend = 'Stable';

    return {
      indicator: v.indicator,
      currentLevel,
      percentile20d,
      percentile252d,
      regime,
      trend,
      zscore,
    };
  });

  // 5. Market Summary
  const vixEntry = volRegimeIndicators.find(v => v.indicator === 'VIX')!;
  const moveEntry = volRegimeIndicators.find(v => v.indicator === 'MOVE')!;
  const avgImpliedCorr = round2(
    dispersionTrades.reduce((sum, d) => sum + d.impliedCorrelation, 0) / dispersionTrades.length
  );
  const dispersionOpportunities = dispersionTrades.filter(d => d.signal !== 'Neutral').length;

  let volRegime: 'Low' | 'Normal' | 'High';
  if (vixEntry.currentLevel > 25) volRegime = 'High';
  else if (vixEntry.currentLevel < 14) volRegime = 'Low';
  else volRegime = 'Normal';

  const strategies = [
    'Sell Premium', 'Buy Gamma', 'Calendar Spreads', 'Dispersion Trading',
    'Correlation Trading', 'Skew Trading', 'Volatility RV',
  ];
  const dominantStrategy = strategies[Math.floor(rng() * strategies.length)];

  const marketSummary = {
    vixLevel: vixEntry.currentLevel,
    moveLevel: moveEntry.currentLevel,
    avgImpliedCorr,
    dispersionOpportunities,
    volRegime,
    dominantStrategy,
  };

  return {
    volSurfaceArb,
    dispersionTrades,
    correlationTrades,
    volRegimeIndicators,
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
    console.error('[VolatilityArbitrage] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate volatility arbitrage data' });
  }
});

export default router;
