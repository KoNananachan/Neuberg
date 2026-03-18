import { Router } from 'express';

const router = Router();

// ── Types ──

interface RepoRate {
  name: string;
  category: 'secured' | 'unsecured' | 'treasury' | 'term' | 'commercial_paper';
  rate: number;
  change1d: number;
  change1w: number;
  change1m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  volume: number | null;
  rateHistory: number[];
  spreadToFedFunds: number;
  signal: 'TIGHTENING' | 'EASING' | 'STRESS' | 'FLOOR' | null;
}

interface FedFacility {
  name: string;
  usage: number;
  usageChange: number;
  counterparties: number;
  awardRate: number;
  usageHistory: number[];
}

interface RepoRatesResponse {
  rates: RepoRate[];
  facilities: FedFacility[];
  fedTargetLower: number;
  fedTargetUpper: number;
  nextFomcDate: string;
  marketImpliedRate: number;
  timestamp: string;
}

// ── Cache ──

let cache: { data: RepoRatesResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 10 * 60_000; // 10 minutes

// ── Data generation helpers ──

const FED_TARGET_LOWER = 5.25;
const FED_TARGET_UPPER = 5.50;
const EFF_FED_FUNDS = 5.33;

/** Generate a plausible 30-point rate history around a base rate with small noise */
function generateRateHistory(base: number, volatilityBps: number): number[] {
  const history: number[] = [];
  let current = base - (volatilityBps / 100) * 0.5; // start slightly below
  for (let i = 0; i < 30; i++) {
    const drift = (base - current) * 0.1; // mean-revert toward base
    const noise = ((Math.random() - 0.5) * 2 * volatilityBps) / 100;
    current += drift + noise;
    current = Math.round(current * 10000) / 10000;
    history.push(current);
  }
  // Ensure last value matches the current rate
  history[history.length - 1] = base;
  return history;
}

/** Generate a plausible 30-point usage history for fed facilities */
function generateUsageHistory(base: number, volatilityPct: number): number[] {
  const history: number[] = [];
  let current = base * (1 + (Math.random() - 0.5) * volatilityPct * 2);
  for (let i = 0; i < 30; i++) {
    const drift = (base - current) * 0.08;
    const noise = (Math.random() - 0.5) * base * volatilityPct * 0.3;
    current += drift + noise;
    current = Math.max(0, Math.round(current * 10) / 10);
    history.push(current);
  }
  history[history.length - 1] = base;
  return history;
}

/** Compute percentile of current value within a 52w range */
function computePercentile(current: number, low: number, high: number): number {
  if (high === low) return 50;
  return Math.round(((current - low) / (high - low)) * 100);
}

/** Determine signal based on rate behavior relative to fed funds corridor */
function determineSignal(
  rate: number,
  change1d: number,
  change1w: number,
  category: string,
): 'TIGHTENING' | 'EASING' | 'STRESS' | 'FLOOR' | null {
  const spreadToUpper = (rate - FED_TARGET_UPPER) * 100; // in bps
  const spreadToLower = (rate - FED_TARGET_LOWER) * 100;

  // STRESS: rate is significantly above the target upper bound
  if (spreadToUpper > 10) return 'STRESS';

  // FLOOR: rate is at or very near the ON RRP rate (lower bound)
  if (category === 'secured' && spreadToLower < 3) return 'FLOOR';

  // TIGHTENING: rates rising meaningfully over past week
  if (change1w > 2) return 'TIGHTENING';

  // EASING: rates falling meaningfully over past week
  if (change1w < -2) return 'EASING';

  return null;
}

function generateRepoRatesData(): RepoRatesResponse {
  // Base rates consistent with 5.25-5.50% fed funds target
  const rateConfigs: {
    name: string;
    category: RepoRate['category'];
    baseRate: number;
    volatilityBps: number;
    volume: number | null;
  }[] = [
    { name: 'SOFR', category: 'secured', baseRate: 5.31, volatilityBps: 3, volume: 2100 },
    { name: 'Effective Fed Funds', category: 'unsecured', baseRate: 5.33, volatilityBps: 1, volume: 95 },
    { name: 'ON RRP Award Rate', category: 'secured', baseRate: 5.30, volatilityBps: 0, volume: null },
    { name: 'BGCR', category: 'secured', baseRate: 5.30, volatilityBps: 2, volume: 780 },
    { name: 'TGCR', category: 'secured', baseRate: 5.29, volatilityBps: 3, volume: 650 },
    { name: 'T-Bill 1M', category: 'treasury', baseRate: 5.28, volatilityBps: 5, volume: null },
    { name: 'T-Bill 3M', category: 'treasury', baseRate: 5.25, volatilityBps: 6, volume: null },
    { name: 'T-Bill 6M', category: 'treasury', baseRate: 5.18, volatilityBps: 8, volume: null },
    { name: 'T-Bill 1Y', category: 'treasury', baseRate: 5.02, volatilityBps: 12, volume: null },
    { name: 'OBFR', category: 'unsecured', baseRate: 5.32, volatilityBps: 1, volume: 230 },
    { name: 'LIBOR 1M', category: 'unsecured', baseRate: 5.44, volatilityBps: 2, volume: null },
    { name: 'LIBOR 3M', category: 'unsecured', baseRate: 5.58, volatilityBps: 4, volume: null },
    { name: 'Term SOFR 1M', category: 'term', baseRate: 5.32, volatilityBps: 2, volume: null },
    { name: 'Term SOFR 3M', category: 'term', baseRate: 5.35, volatilityBps: 4, volume: null },
    { name: 'AA Financial CP 90D', category: 'commercial_paper', baseRate: 5.38, volatilityBps: 5, volume: null },
    { name: 'AA Nonfinancial CP 90D', category: 'commercial_paper', baseRate: 5.35, volatilityBps: 4, volume: null },
  ];

  const rates: RepoRate[] = rateConfigs.map((cfg) => {
    // Small random perturbations for daily changes
    const change1d = Math.round((Math.random() - 0.5) * 4 * 100) / 100; // -2 to +2 bps
    const change1w = Math.round((Math.random() - 0.5) * 8 * 100) / 100; // -4 to +4 bps
    const change1m = Math.round((Math.random() - 0.5) * 16 * 100) / 100; // -8 to +8 bps

    // 52-week range: rate could have been 25-50bps lower at some point (before last hike)
    const low52w = Math.round((cfg.baseRate - 0.25 - Math.random() * 0.25) * 100) / 100;
    const high52w = Math.round((cfg.baseRate + 0.05 + Math.random() * 0.1) * 100) / 100;
    const percentile = computePercentile(cfg.baseRate, low52w, high52w);

    const spreadToFedFunds = Math.round((cfg.baseRate - EFF_FED_FUNDS) * 100); // in bps

    const rateHistory = generateRateHistory(cfg.baseRate, cfg.volatilityBps);
    const signal = determineSignal(cfg.baseRate, change1d, change1w, cfg.category);

    return {
      name: cfg.name,
      category: cfg.category,
      rate: cfg.baseRate,
      change1d,
      change1w,
      change1m,
      high52w,
      low52w,
      percentile,
      volume: cfg.volume,
      rateHistory,
      spreadToFedFunds,
      signal,
    };
  });

  const facilities: FedFacility[] = [
    {
      name: 'ON RRP Facility',
      usage: 326.8,
      usageChange: -12.4,
      counterparties: 68,
      awardRate: 5.30,
      usageHistory: generateUsageHistory(326.8, 0.15),
    },
    {
      name: 'Standing Repo Facility',
      usage: 2.1,
      usageChange: 0.8,
      counterparties: 12,
      awardRate: 5.50,
      usageHistory: generateUsageHistory(2.1, 0.40),
    },
  ];

  // Next FOMC meeting date (approximate future date)
  const now = new Date();
  const fomcDates = [
    '2026-01-29', '2026-03-19', '2026-05-07', '2026-06-18',
    '2026-07-30', '2026-09-17', '2026-11-05', '2026-12-17',
  ];
  const nextFomc = fomcDates.find((d) => new Date(d) > now) || fomcDates[0];

  // Market implied rate from fed funds futures (slightly below mid-target)
  const marketImpliedRate = Math.round((5.33 + (Math.random() - 0.5) * 0.06) * 100) / 100;

  return {
    rates,
    facilities,
    fedTargetLower: FED_TARGET_LOWER,
    fedTargetUpper: FED_TARGET_UPPER,
    nextFomcDate: nextFomc,
    marketImpliedRate,
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

    const data = generateRepoRatesData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RepoRates] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate repo rate data' });
  }
});

export default router;
