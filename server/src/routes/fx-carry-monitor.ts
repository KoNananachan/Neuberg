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

// ── Types ──

interface CarryTableEntry {
  pair: string;
  spotRate: number;
  baseRate: number;
  quoteRate: number;
  rateSpread: number;
  carry3M: number;
  carry12M: number;
  spotReturn1M: number;
  totalReturn1M: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volAdjCarry: number;
}

interface G10RateEntry {
  currency: string;
  policyRate: number;
  threeMonthOIS: number;
  oneYearSwap: number;
  vsUSD_spread: number;
  change1m: number;
}

interface CarryBasketEntry {
  name: string;
  strategy: string;
  ytdReturn: number;
  monthReturn: number;
  annualizedVol: number;
  sharpeRatio: number;
  maxDD: number;
  currentPositions: string[];
}

interface RiskMetrics {
  vixLevel: number;
  emFxVolIndex: number;
  carryUnwindIndicator: 'low' | 'medium' | 'high';
  correlationToEquity: number;
  avgBidAsk: number;
  marketStress: number;
}

interface FxCarryMonitorResponse {
  carryTable: CarryTableEntry[];
  g10RateDifferentials: G10RateEntry[];
  carryBaskets: CarryBasketEntry[];
  riskMetrics: RiskMetrics;
  generatedAt: string;
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: FxCarryMonitorResponse; ts: number } | null = null;

// ── Static configs ──

// Realistic 2024 policy rates
const POLICY_RATES: Record<string, number> = {
  USD: 5.375, EUR: 4.50, GBP: 5.25, JPY: 0.10, CHF: 1.75,
  AUD: 4.35, NZD: 5.50, CAD: 5.00, NOK: 4.50, SEK: 4.00,
  BRL: 10.50, MXN: 11.25, TRY: 45.00, ZAR: 8.25, INR: 6.50,
  IDR: 6.25, COP: 13.25, PLN: 5.75, HUF: 7.00, CZK: 6.75,
};

const CARRY_PAIR_CONFIGS = [
  { pair: 'AUD/JPY', base: 'AUD', quote: 'JPY', baseSpot: 97.85, spotVol: 0.015 },
  { pair: 'NZD/JPY', base: 'NZD', quote: 'JPY', baseSpot: 91.42, spotVol: 0.016 },
  { pair: 'BRL/USD', base: 'BRL', quote: 'USD', baseSpot: 0.2035, spotVol: 0.025 },
  { pair: 'MXN/USD', base: 'MXN', quote: 'USD', baseSpot: 0.0582, spotVol: 0.018 },
  { pair: 'TRY/USD', base: 'TRY', quote: 'USD', baseSpot: 0.0308, spotVol: 0.035 },
  { pair: 'ZAR/USD', base: 'ZAR', quote: 'USD', baseSpot: 0.0534, spotVol: 0.022 },
  { pair: 'INR/USD', base: 'INR', quote: 'USD', baseSpot: 0.01198, spotVol: 0.008 },
  { pair: 'IDR/USD', base: 'IDR', quote: 'USD', baseSpot: 0.0000632, spotVol: 0.012 },
  { pair: 'COP/USD', base: 'COP', quote: 'USD', baseSpot: 0.000253, spotVol: 0.024 },
  { pair: 'PLN/EUR', base: 'PLN', quote: 'EUR', baseSpot: 0.2315, spotVol: 0.012 },
  { pair: 'HUF/EUR', base: 'HUF', quote: 'EUR', baseSpot: 0.00257, spotVol: 0.014 },
  { pair: 'CZK/EUR', base: 'CZK', quote: 'EUR', baseSpot: 0.0402, spotVol: 0.010 },
  { pair: 'NOK/SEK', base: 'NOK', quote: 'SEK', baseSpot: 1.0145, spotVol: 0.011 },
  { pair: 'AUD/NZD', base: 'AUD', quote: 'NZD', baseSpot: 1.0785, spotVol: 0.009 },
  { pair: 'GBP/CHF', base: 'GBP', quote: 'CHF', baseSpot: 1.1285, spotVol: 0.013 },
];

const G10_CURRENCIES = [
  { currency: 'USD', baseOIS: 5.35, baseSwap1Y: 5.15 },
  { currency: 'EUR', baseOIS: 4.42, baseSwap1Y: 4.20 },
  { currency: 'GBP', baseOIS: 5.18, baseSwap1Y: 4.95 },
  { currency: 'JPY', baseOIS: 0.05, baseSwap1Y: 0.22 },
  { currency: 'CHF', baseOIS: 1.68, baseSwap1Y: 1.55 },
  { currency: 'AUD', baseOIS: 4.28, baseSwap1Y: 4.10 },
  { currency: 'NZD', baseOIS: 5.42, baseSwap1Y: 5.20 },
  { currency: 'CAD', baseOIS: 4.92, baseSwap1Y: 4.72 },
  { currency: 'NOK', baseOIS: 4.42, baseSwap1Y: 4.25 },
  { currency: 'SEK', baseOIS: 3.92, baseSwap1Y: 3.78 },
];

// ── Data generation ──

function generate(): FxCarryMonitorResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fx-carry-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const signedJitter = (range: number) => (rng() - 0.5) * 2 * range;

  // ── Carry Table ──
  const carryTable: CarryTableEntry[] = CARRY_PAIR_CONFIGS.map(cfg => {
    const baseRate = POLICY_RATES[cfg.base] ?? 0;
    const quoteRate = POLICY_RATES[cfg.quote] ?? 0;
    const spread = Math.round((baseRate - quoteRate) * 100);
    const spotRate = Math.round(jitter(cfg.baseSpot, 0.02) * 100000) / 100000;

    // Carry calculations: spread adjusted for forward points and transaction costs
    const carry3M = Math.round(((baseRate - quoteRate) * 0.25 + signedJitter(0.15)) * 100) / 100;
    const carry12M = Math.round(((baseRate - quoteRate) + signedJitter(0.4)) * 100) / 100;

    // Spot return: monthly FX return
    const spotReturn1M = Math.round(signedJitter(3.5) * 100) / 100;

    // Total return = carry component (1m) + spot return
    const carryComponent = (baseRate - quoteRate) / 12;
    const totalReturn1M = Math.round((carryComponent + spotReturn1M) * 100) / 100;

    // Annualized vol for sharpe calculation
    const annualizedVol = Math.round(jitter(cfg.spotVol * 100 * Math.sqrt(252 / 20), 0.12) * 100) / 100;
    const sharpeRatio = annualizedVol > 0
      ? Math.round(((carry12M / annualizedVol) * Math.sqrt(1) + signedJitter(0.3)) * 100) / 100
      : 0;

    const maxDrawdown = Math.round((jitter(5 + cfg.spotVol * 100, 0.2) + rng() * 3) * 100) / 100;
    const volAdjCarry = annualizedVol > 0
      ? Math.round(((baseRate - quoteRate) / annualizedVol) * 10000) / 100
      : 0;

    return {
      pair: cfg.pair,
      spotRate,
      baseRate: Math.round(baseRate * 100) / 100,
      quoteRate: Math.round(quoteRate * 100) / 100,
      rateSpread: spread,
      carry3M,
      carry12M,
      spotReturn1M,
      totalReturn1M,
      sharpeRatio,
      maxDrawdown,
      volAdjCarry: Math.round(volAdjCarry),
    };
  });

  // ── G10 Rate Differentials ──
  const g10RateDifferentials: G10RateEntry[] = G10_CURRENCIES.map(cfg => {
    const policyRate = POLICY_RATES[cfg.currency] ?? 0;
    const threeMonthOIS = Math.round(jitter(cfg.baseOIS, 0.02) * 100) / 100;
    const oneYearSwap = Math.round(jitter(cfg.baseSwap1Y, 0.02) * 100) / 100;
    const usdRate = POLICY_RATES.USD;
    const vsUSD_spread = cfg.currency === 'USD'
      ? 0
      : Math.round((policyRate - usdRate) * 100);
    const change1m = Math.round(signedJitter(15));

    return {
      currency: cfg.currency,
      policyRate: Math.round(policyRate * 100) / 100,
      threeMonthOIS,
      oneYearSwap,
      vsUSD_spread,
      change1m,
    };
  });

  // ── Carry Basket Performance ──
  const carryBaskets: CarryBasketEntry[] = [
    {
      name: 'High Carry',
      strategy: 'Long top 5 yielders vs short bottom 5',
      ytdReturn: Math.round(jitter(8.5, 0.15) * 100) / 100,
      monthReturn: Math.round(signedJitter(3.0) * 100) / 100,
      annualizedVol: Math.round(jitter(9.8, 0.08) * 100) / 100,
      sharpeRatio: Math.round(jitter(0.87, 0.12) * 100) / 100,
      maxDD: Math.round(jitter(7.2, 0.15) * 100) / 100,
      currentPositions: ['TRY', 'MXN', 'COP', 'BRL', 'ZAR', '-JPY', '-CHF', '-SEK', '-EUR', '-CZK'],
    },
    {
      name: 'Selective Carry',
      strategy: 'Top 3 risk-adjusted carry pairs',
      ytdReturn: Math.round(jitter(6.2, 0.12) * 100) / 100,
      monthReturn: Math.round(signedJitter(2.0) * 100) / 100,
      annualizedVol: Math.round(jitter(6.5, 0.10) * 100) / 100,
      sharpeRatio: Math.round(jitter(1.15, 0.10) * 100) / 100,
      maxDD: Math.round(jitter(4.8, 0.12) * 100) / 100,
      currentPositions: ['MXN', 'INR', 'AUD'],
    },
    {
      name: 'EM Carry',
      strategy: 'Top 5 EM high-yield long vs USD',
      ytdReturn: Math.round(jitter(11.3, 0.18) * 100) / 100,
      monthReturn: Math.round(signedJitter(4.5) * 100) / 100,
      annualizedVol: Math.round(jitter(12.4, 0.10) * 100) / 100,
      sharpeRatio: Math.round(jitter(0.72, 0.15) * 100) / 100,
      maxDD: Math.round(jitter(10.5, 0.18) * 100) / 100,
      currentPositions: ['TRY', 'COP', 'BRL', 'MXN', 'ZAR'],
    },
  ];

  // ── Risk Metrics ──
  const vixLevel = Math.round(jitter(16.5, 0.12) * 100) / 100;
  const emFxVolIndex = Math.round(jitter(10.8, 0.10) * 100) / 100;
  const stressScore = Math.round(jitter(32, 0.20));
  const clampedStress = Math.max(0, Math.min(100, stressScore));

  let carryUnwindIndicator: 'low' | 'medium' | 'high';
  if (vixLevel > 25 || clampedStress > 65) {
    carryUnwindIndicator = 'high';
  } else if (vixLevel > 18 || clampedStress > 45) {
    carryUnwindIndicator = 'medium';
  } else {
    carryUnwindIndicator = 'low';
  }

  const riskMetrics: RiskMetrics = {
    vixLevel,
    emFxVolIndex,
    carryUnwindIndicator,
    correlationToEquity: Math.round(jitter(0.42, 0.15) * 100) / 100,
    avgBidAsk: Math.round(jitter(2.8, 0.10) * 10) / 10,
    marketStress: clampedStress,
  };

  return {
    carryTable,
    g10RateDifferentials,
    carryBaskets,
    riskMetrics,
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
    console.error('[FxCarryMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FX carry monitor data' });
  }
});

export default router;
