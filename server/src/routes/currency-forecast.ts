import { Router, Request, Response } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface CurrencyPairForecast {
  pair: string;
  spot: number;
  pppFairValue: number;
  pppDeviation: number;
  irpForecast3M: number;
  irpForecast12M: number;
  consensusForecast3M: number;
  consensusForecast6M: number;
  consensusForecast12M: number;
  impliedVol3M: number;
  riskReversal25d: number;
  carryReturn3M: number;
  signal: 'Buy' | 'Sell' | 'Neutral';
  confidence: number;
  rateDifferential: number;
}

interface ForecastModel {
  name: string;
  description: string;
  accuracy1Y: number;
  bestPair: string;
}

interface ForecastSummary {
  mostOvervalued: { pair: string; deviation: number };
  mostUndervalued: { pair: string; deviation: number };
  highestCarry: { pair: string; carry: number };
  strongestSignal: { pair: string; direction: string };
  avgModelAccuracy: number;
}

interface CurrencyForecastResponse {
  pairs: CurrencyPairForecast[];
  models: ForecastModel[];
  summary: ForecastSummary;
  generatedAt: string;
}
let cache: { data: CurrencyForecastResponse; ts: number } | null = null;

// ── Static pair configurations (realistic 2024-2025 era) ──

interface PairConfig {
  pair: string;
  baseSpot: number;
  pppBase: number;
  baseRate: number;
  quoteRate: number;
  baseVol: number;
}

const PAIR_CONFIGS: PairConfig[] = [
  { pair: 'EUR/USD', baseSpot: 1.0820, pppBase: 1.2800, baseRate: 4.50, quoteRate: 5.375, baseVol: 7.2 },
  { pair: 'USD/JPY', baseSpot: 150.20, pppBase: 91.50, baseRate: 5.375, quoteRate: 0.10, baseVol: 10.5 },
  { pair: 'GBP/USD', baseSpot: 1.2650, pppBase: 1.5200, baseRate: 5.25, quoteRate: 5.375, baseVol: 7.8 },
  { pair: 'USD/CHF', baseSpot: 0.8780, pppBase: 0.7200, baseRate: 5.375, quoteRate: 1.75, baseVol: 7.5 },
  { pair: 'AUD/USD', baseSpot: 0.6540, pppBase: 0.7150, baseRate: 4.35, quoteRate: 5.375, baseVol: 9.8 },
  { pair: 'NZD/USD', baseSpot: 0.6080, pppBase: 0.6800, baseRate: 5.50, quoteRate: 5.375, baseVol: 10.2 },
  { pair: 'USD/CAD', baseSpot: 1.3620, pppBase: 1.2100, baseRate: 5.375, quoteRate: 5.00, baseVol: 6.5 },
  { pair: 'EUR/GBP', baseSpot: 0.8555, pppBase: 0.8420, baseRate: 4.50, quoteRate: 5.25, baseVol: 6.0 },
  { pair: 'EUR/JPY', baseSpot: 162.50, pppBase: 117.10, baseRate: 4.50, quoteRate: 0.10, baseVol: 11.2 },
  { pair: 'GBP/JPY', baseSpot: 189.95, pppBase: 139.10, baseRate: 5.25, quoteRate: 0.10, baseVol: 12.5 },
  { pair: 'AUD/JPY', baseSpot: 98.25, pppBase: 65.40, baseRate: 4.35, quoteRate: 0.10, baseVol: 12.8 },
  { pair: 'USD/CNH', baseSpot: 7.2450, pppBase: 4.1500, baseRate: 5.375, quoteRate: 3.45, baseVol: 5.8 },
];

// ── Data generation ──

function generate(): CurrencyForecastResponse {
  const rng = seededRandom('currency-forecast');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const signedJitter = (range: number) => (rng() - 0.5) * 2 * range;

  // Generate pair forecasts
  const pairs: CurrencyPairForecast[] = PAIR_CONFIGS.map(cfg => {
    const spot = Math.round(jitter(cfg.baseSpot, 0.008) * 10000) / 10000;
    const pppFairValue = Math.round(jitter(cfg.pppBase, 0.015) * 10000) / 10000;

    // PPP deviation: how far spot is from PPP fair value
    // For XXX/YYY pairs, positive = overvalued (spot > fair value)
    const pppDeviation = Math.round(((spot - pppFairValue) / pppFairValue) * 10000) / 100;

    // Interest rate differential (base - quote) in bps
    const rateDiffRaw = cfg.baseRate - cfg.quoteRate;
    const rateDifferential = Math.round(rateDiffRaw * 100);

    // IRP forward: spot adjusted by interest rate differential
    // Forward = Spot * (1 + r_quote * t) / (1 + r_base * t)
    const irpForecast3M = Math.round(
      spot * (1 + cfg.quoteRate / 100 * 0.25) / (1 + cfg.baseRate / 100 * 0.25) * 10000
    ) / 10000;
    const irpForecast12M = Math.round(
      spot * (1 + cfg.quoteRate / 100) / (1 + cfg.baseRate / 100) * 10000
    ) / 10000;

    // Consensus forecasts with drift toward PPP fair value
    const driftFactor3M = 0.03 + rng() * 0.04;
    const driftFactor6M = 0.06 + rng() * 0.06;
    const driftFactor12M = 0.10 + rng() * 0.10;

    const consensusForecast3M = Math.round(
      (spot + (pppFairValue - spot) * driftFactor3M + signedJitter(spot * 0.01)) * 10000
    ) / 10000;
    const consensusForecast6M = Math.round(
      (spot + (pppFairValue - spot) * driftFactor6M + signedJitter(spot * 0.015)) * 10000
    ) / 10000;
    const consensusForecast12M = Math.round(
      (spot + (pppFairValue - spot) * driftFactor12M + signedJitter(spot * 0.02)) * 10000
    ) / 10000;

    // Implied volatility (3M ATM vol)
    const impliedVol3M = Math.round(jitter(cfg.baseVol, 0.08) * 100) / 100;

    // 25-delta risk reversal (call vol - put vol; positive = call premium = bullish base)
    const riskReversal25d = Math.round(signedJitter(1.8) * 100) / 100;

    // Carry return (annualized, 3M horizon)
    // Positive carry = earning the rate differential
    const carryReturn3M = Math.round((rateDiffRaw + signedJitter(0.3)) * 100) / 100;

    // Signal determination based on multi-model consensus
    const pppSignal = pppDeviation < -5 ? 1 : pppDeviation > 5 ? -1 : 0;
    const carrySignal = carryReturn3M > 1 ? 1 : carryReturn3M < -1 ? -1 : 0;
    const rrSignal = riskReversal25d > 0.5 ? 1 : riskReversal25d < -0.5 ? -1 : 0;
    const consensusDirection = consensusForecast3M > spot * 1.005 ? 1 : consensusForecast3M < spot * 0.995 ? -1 : 0;
    const totalSignal = pppSignal + carrySignal + rrSignal + consensusDirection;

    let signal: 'Buy' | 'Sell' | 'Neutral';
    if (totalSignal >= 2) signal = 'Buy';
    else if (totalSignal <= -2) signal = 'Sell';
    else signal = 'Neutral';

    // Confidence based on signal agreement
    const absSignal = Math.abs(totalSignal);
    const confidence = Math.round(
      Math.min(95, Math.max(25, 40 + absSignal * 12 + rng() * 10))
    );

    return {
      pair: cfg.pair,
      spot,
      pppFairValue,
      pppDeviation,
      irpForecast3M,
      irpForecast12M,
      consensusForecast3M,
      consensusForecast6M,
      consensusForecast12M,
      impliedVol3M,
      riskReversal25d,
      carryReturn3M,
      signal,
      confidence,
      rateDifferential,
    };
  });

  // Forecast models
  const models: ForecastModel[] = [
    {
      name: 'PPP (Purchasing Power Parity)',
      description: 'Estimates fair value based on relative price levels between countries. Best for long-term (3-5Y) mean reversion signals.',
      accuracy1Y: Math.round(jitter(42, 0.06) * 10) / 10,
      bestPair: 'EUR/USD',
    },
    {
      name: 'IRP (Interest Rate Parity)',
      description: 'Derives forward rates from interest rate differentials. Covered IRP holds precisely; uncovered IRP provides directional bias.',
      accuracy1Y: Math.round(jitter(55, 0.05) * 10) / 10,
      bestPair: 'USD/JPY',
    },
    {
      name: 'BEER (Behavioral Equilibrium Exchange Rate)',
      description: 'Multi-factor model using terms of trade, productivity differentials, net foreign assets, and government spending ratios.',
      accuracy1Y: Math.round(jitter(48, 0.07) * 10) / 10,
      bestPair: 'AUD/USD',
    },
    {
      name: 'Technical Momentum',
      description: 'Trend-following model using moving average crossovers, RSI divergence, and carry-adjusted momentum across G10 and EM pairs.',
      accuracy1Y: Math.round(jitter(52, 0.06) * 10) / 10,
      bestPair: 'GBP/JPY',
    },
  ];

  // Summary
  let mostOvervalued = pairs[0];
  let mostUndervalued = pairs[0];
  let highestCarryPair = pairs[0];
  let strongestSignalPair = pairs[0];
  let maxSignalConfidence = 0;

  for (const p of pairs) {
    if (p.pppDeviation > mostOvervalued.pppDeviation) mostOvervalued = p;
    if (p.pppDeviation < mostUndervalued.pppDeviation) mostUndervalued = p;
    if (Math.abs(p.carryReturn3M) > Math.abs(highestCarryPair.carryReturn3M)) highestCarryPair = p;
    if (p.signal !== 'Neutral' && p.confidence > maxSignalConfidence) {
      strongestSignalPair = p;
      maxSignalConfidence = p.confidence;
    }
  }

  const avgModelAccuracy = Math.round(
    (models.reduce((sum, m) => sum + m.accuracy1Y, 0) / models.length) * 10
  ) / 10;

  const summary: ForecastSummary = {
    mostOvervalued: { pair: mostOvervalued.pair, deviation: mostOvervalued.pppDeviation },
    mostUndervalued: { pair: mostUndervalued.pair, deviation: mostUndervalued.pppDeviation },
    highestCarry: { pair: highestCarryPair.pair, carry: highestCarryPair.carryReturn3M },
    strongestSignal: { pair: strongestSignalPair.pair, direction: strongestSignalPair.signal },
    avgModelAccuracy,
  };

  return {
    pairs,
    models,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CurrencyForecast] Error:', message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate currency forecast data' });
  }
});

export default router;
