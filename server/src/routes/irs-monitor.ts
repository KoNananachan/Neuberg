import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface SwapRateEntry {
  currency: string;
  tenor: string;
  fixedRate: number;
  change1d: number;
  change1w: number;
  change1m: number;
  floatingBenchmark: string;
  floatingSpread: number;
}

interface BasisSwapEntry {
  name: string;
  spread: number;
  change1d: number;
  change1w: number;
  tenor: string;
  notionalOutstanding: number;
}

interface SwapSpreadEntry {
  tenor: string;
  treasuryYield: number;
  swapRate: number;
  spread: number;
  change1d: number;
  historicalAvg: number;
  percentile: number;
}

interface ForwardRateEntry {
  forward: string;
  rate: number;
  change1d: number;
  impliedCut: number;
}

interface IRSSummary {
  usd10ySwap: number;
  eur10ySwap: number;
  gbp10ySwap: number;
  jpy10ySwap: number;
  avgSwapSpread: number;
  basisVolatility: number;
}

interface IRSMonitorResponse {
  swapRates: SwapRateEntry[];
  basisSwaps: BasisSwapEntry[];
  swapSpreads: SwapSpreadEntry[];
  forwardRates: ForwardRateEntry[];
  summary: IRSSummary;
  timestamp: string;
}

// ── Cache ──

let cache: { data: IRSMonitorResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Currency configuration ──

const TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '30Y'] as const;

const TENOR_YEARS: Record<string, number> = {
  '1Y': 1, '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7,
  '10Y': 10, '15Y': 15, '30Y': 30,
};

interface CurrencyConfig {
  base1Y: number;
  base10Y: number;
  base30Y: number;
  benchmark: string;
  spreadRange: [number, number];
}

const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  USD: { base1Y: 4.48, base10Y: 4.28, base30Y: 4.20, benchmark: 'SOFR', spreadRange: [2, 8] },
  EUR: { base1Y: 2.52, base10Y: 2.95, base30Y: 3.18, benchmark: 'EURIBOR', spreadRange: [1, 6] },
  GBP: { base1Y: 4.30, base10Y: 4.15, base30Y: 4.02, benchmark: 'SONIA', spreadRange: [2, 7] },
  JPY: { base1Y: 0.32, base10Y: 0.95, base30Y: 1.48, benchmark: 'TONAR', spreadRange: [0.5, 3] },
};

// ── Interpolation ──

function interpolateRate(years: number, base1Y: number, base10Y: number, base30Y: number): number {
  if (years <= 1) {
    return base1Y;
  }
  if (years <= 10) {
    const t = (years - 1) / 9;
    return base1Y + t * (base10Y - base1Y);
  }
  const t = (years - 10) / 20;
  return base10Y + t * (base30Y - base10Y);
}

// ── Data generation ──

function generateSwapRates(rng: () => number): SwapRateEntry[] {
  const entries: SwapRateEntry[] = [];

  for (const [ccy, cfg] of Object.entries(CURRENCY_CONFIGS)) {
    for (const tenor of TENORS) {
      const years = TENOR_YEARS[tenor];
      const baseRate = interpolateRate(years, cfg.base1Y, cfg.base10Y, cfg.base30Y);
      const jitter = (rng() - 0.5) * 0.06; // +/- 3bps
      const fixedRate = Math.round((baseRate + jitter) * 10000) / 10000;

      const scaleFactor = ccy === 'JPY' ? 0.3 : 1;
      const change1d = Math.round((rng() - 0.5) * 6 * scaleFactor * 10) / 10;
      const change1w = Math.round((rng() - 0.5) * 18 * scaleFactor * 10) / 10;
      const change1m = Math.round((rng() - 0.5) * 35 * scaleFactor * 10) / 10;

      const spreadMin = cfg.spreadRange[0];
      const spreadMax = cfg.spreadRange[1];
      const floatingSpread = Math.round((spreadMin + rng() * (spreadMax - spreadMin)) * 10) / 10;

      entries.push({
        currency: ccy,
        tenor,
        fixedRate,
        change1d,
        change1w,
        change1m,
        floatingBenchmark: cfg.benchmark,
        floatingSpread,
      });
    }
  }

  return entries;
}

interface BasisSwapConfig {
  name: string;
  baseSpread: number;
  volatility: number;
  notionalBase: number;
}

const BASIS_SWAP_CONFIGS: BasisSwapConfig[] = [
  { name: 'SOFR vs Fed Funds', baseSpread: -0.8, volatility: 1.5, notionalBase: 2850 },
  { name: '3M vs 6M SOFR', baseSpread: 4.2, volatility: 2.0, notionalBase: 1920 },
  { name: 'EURIBOR 3M vs 6M', baseSpread: 6.5, volatility: 2.5, notionalBase: 1450 },
  { name: 'SOFR vs EURIBOR (xccy)', baseSpread: -12.3, volatility: 4.0, notionalBase: 3200 },
  { name: 'SONIA vs SOFR', baseSpread: -8.5, volatility: 3.5, notionalBase: 2100 },
  { name: 'TONAR vs SOFR', baseSpread: -18.7, volatility: 5.0, notionalBase: 980 },
];

function generateBasisSwaps(rng: () => number): BasisSwapEntry[] {
  return BASIS_SWAP_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const spread = Math.round((cfg.baseSpread + jitter) * 10) / 10;
    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 10) / 10;
    const change1w = Math.round((rng() - 0.5) * cfg.volatility * 3 * 10) / 10;
    const notionalOutstanding = Math.round((cfg.notionalBase + (rng() - 0.5) * 200) * 10) / 10;

    return {
      name: cfg.name,
      spread,
      change1d,
      change1w,
      tenor: '5Y',
      notionalOutstanding,
    };
  });
}

interface SwapSpreadConfig {
  tenor: string;
  baseTreasury: number;
  baseSwapSpread: number;
  historicalAvg: number;
}

const SWAP_SPREAD_CONFIGS: SwapSpreadConfig[] = [
  { tenor: '2Y', baseTreasury: 4.42, baseSwapSpread: -8.5, historicalAvg: -5.2 },
  { tenor: '5Y', baseTreasury: 4.18, baseSwapSpread: -4.2, historicalAvg: -1.8 },
  { tenor: '10Y', baseTreasury: 4.25, baseSwapSpread: -2.8, historicalAvg: 1.5 },
  { tenor: '30Y', baseTreasury: 4.45, baseSwapSpread: -22.5, historicalAvg: -18.0 },
];

function generateSwapSpreads(rng: () => number, swapRates: SwapRateEntry[]): SwapSpreadEntry[] {
  return SWAP_SPREAD_CONFIGS.map((cfg) => {
    const treasuryJitter = (rng() - 0.5) * 0.04;
    const treasuryYield = Math.round((cfg.baseTreasury + treasuryJitter) * 10000) / 10000;

    // Find matching USD swap rate for this tenor
    const matchingSwap = swapRates.find((r) => r.currency === 'USD' && r.tenor === cfg.tenor);
    const swapRate = matchingSwap ? matchingSwap.fixedRate : Math.round((treasuryYield + cfg.baseSwapSpread / 100) * 10000) / 10000;

    const spread = Math.round((swapRate - treasuryYield) * 10000) / 10; // in bps, one decimal
    const change1d = Math.round((rng() - 0.5) * 3 * 10) / 10;
    const historicalAvg = cfg.historicalAvg;

    // Percentile: where current spread sits relative to historical range
    const deviation = spread - historicalAvg;
    const rawPercentile = 50 + deviation * 2.5;
    const percentile = Math.round(Math.max(1, Math.min(99, rawPercentile)));

    return {
      tenor: cfg.tenor,
      treasuryYield,
      swapRate,
      spread,
      change1d,
      historicalAvg,
      percentile,
    };
  });
}

interface ForwardConfig {
  forward: string;
  spotTenor: string;
  baseOffset: number;
}

const FORWARD_CONFIGS: ForwardConfig[] = [
  { forward: '1Y1Y', spotTenor: '1Y', baseOffset: -0.12 },
  { forward: '2Y1Y', spotTenor: '2Y', baseOffset: -0.08 },
  { forward: '1Y5Y', spotTenor: '5Y', baseOffset: -0.15 },
  { forward: '5Y5Y', spotTenor: '10Y', baseOffset: -0.05 },
];

function generateForwardRates(rng: () => number, swapRates: SwapRateEntry[]): ForwardRateEntry[] {
  return FORWARD_CONFIGS.map((cfg) => {
    const spotRate = swapRates.find((r) => r.currency === 'USD' && r.tenor === cfg.spotTenor);
    const baseRate = spotRate ? spotRate.fixedRate : 4.30;
    const jitter = (rng() - 0.5) * 0.10;
    const rate = Math.round((baseRate + cfg.baseOffset + jitter) * 10000) / 10000;

    const change1d = Math.round((rng() - 0.5) * 5 * 10) / 10;

    // Implied cut: negative means market expects lower rates ahead
    const impliedCut = Math.round((rate - baseRate) * 100 * 10) / 10;

    return {
      forward: cfg.forward,
      rate,
      change1d,
      impliedCut,
    };
  });
}

function generateIRSData(): IRSMonitorResponse {
  const rng = seededRandom('irs-monitor');

  const swapRates = generateSwapRates(rng);
  const basisSwaps = generateBasisSwaps(rng);
  const swapSpreads = generateSwapSpreads(rng, swapRates);
  const forwardRates = generateForwardRates(rng, swapRates);

  // Summary
  const usd10y = swapRates.find((r) => r.currency === 'USD' && r.tenor === '10Y');
  const eur10y = swapRates.find((r) => r.currency === 'EUR' && r.tenor === '10Y');
  const gbp10y = swapRates.find((r) => r.currency === 'GBP' && r.tenor === '10Y');
  const jpy10y = swapRates.find((r) => r.currency === 'JPY' && r.tenor === '10Y');

  const avgSwapSpread = Math.round(
    (swapSpreads.reduce((sum, s) => sum + s.spread, 0) / swapSpreads.length) * 10
  ) / 10;

  const basisVolatility = Math.round(
    (basisSwaps.reduce((sum, b) => sum + Math.abs(b.change1d), 0) / basisSwaps.length) * 10
  ) / 10;

  const summary: IRSSummary = {
    usd10ySwap: usd10y?.fixedRate ?? 4.28,
    eur10ySwap: eur10y?.fixedRate ?? 2.95,
    gbp10ySwap: gbp10y?.fixedRate ?? 4.15,
    jpy10ySwap: jpy10y?.fixedRate ?? 0.95,
    avgSwapSpread,
    basisVolatility,
  };

  return {
    swapRates,
    basisSwaps,
    swapSpreads,
    forwardRates,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateIRSData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[IRSMonitor] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate IRS monitor data' });
  }
});

export default router;
