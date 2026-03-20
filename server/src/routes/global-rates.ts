import { Router } from 'express';

const router = Router();

// ── Types ──

interface CountryRate {
  country: string;
  code: string;
  region: 'Americas' | 'Europe' | 'Asia Pacific' | 'Emerging';
  policyRate: number;
  overnight: number;
  rate2y: number;
  rate5y: number;
  rate10y: number;
  rate30y: number;
  spread2s10s: number;
  change10y1d: number;
  change10y1w: number;
  change10y1m: number;
  realRate10y: number;
  inflation: number;
  history10y: number[];
}

interface RateSpreadPair {
  name: string;
  spread: number;
  change1d: number;
  change1w: number;
  history: number[];
}

interface GlobalRatesResponse {
  countries: CountryRate[];
  spreads: RateSpreadPair[];
  globalAvg10y: number;
  timestamp: string;
}

// ── Country base data ──

interface CountryConfig {
  country: string;
  code: string;
  region: 'Americas' | 'Europe' | 'Asia Pacific' | 'Emerging';
  policyRate: number;
  overnight: number;
  rate2y: number;
  rate5y: number;
  rate10y: number;
  rate30y: number;
  inflation: number;
}

const COUNTRY_CONFIGS: CountryConfig[] = [
  { country: 'United States', code: 'US', region: 'Americas', policyRate: 5.25, overnight: 5.33, rate2y: 4.15, rate5y: 4.05, rate10y: 4.30, rate30y: 4.48, inflation: 3.1 },
  { country: 'Germany', code: 'DE', region: 'Europe', policyRate: 3.75, overnight: 3.90, rate2y: 2.55, rate5y: 2.35, rate10y: 2.30, rate30y: 2.55, inflation: 2.5 },
  { country: 'Japan', code: 'JP', region: 'Asia Pacific', policyRate: 0.25, overnight: 0.23, rate2y: 0.35, rate5y: 0.60, rate10y: 1.00, rate30y: 1.85, inflation: 2.8 },
  { country: 'United Kingdom', code: 'GB', region: 'Europe', policyRate: 5.00, overnight: 5.20, rate2y: 4.05, rate5y: 3.95, rate10y: 4.10, rate30y: 4.55, inflation: 3.4 },
  { country: 'France', code: 'FR', region: 'Europe', policyRate: 3.75, overnight: 3.90, rate2y: 2.70, rate5y: 2.65, rate10y: 2.85, rate30y: 3.30, inflation: 2.3 },
  { country: 'Italy', code: 'IT', region: 'Europe', policyRate: 3.75, overnight: 3.90, rate2y: 3.10, rate5y: 3.30, rate10y: 3.70, rate30y: 4.15, inflation: 1.8 },
  { country: 'Spain', code: 'ES', region: 'Europe', policyRate: 3.75, overnight: 3.90, rate2y: 2.80, rate5y: 2.75, rate10y: 3.15, rate30y: 3.65, inflation: 3.5 },
  { country: 'Canada', code: 'CA', region: 'Americas', policyRate: 4.50, overnight: 4.65, rate2y: 3.70, rate5y: 3.45, rate10y: 3.35, rate30y: 3.40, inflation: 2.9 },
  { country: 'Australia', code: 'AU', region: 'Asia Pacific', policyRate: 4.35, overnight: 4.35, rate2y: 3.85, rate5y: 3.90, rate10y: 4.10, rate30y: 4.40, inflation: 3.6 },
  { country: 'China', code: 'CN', region: 'Asia Pacific', policyRate: 3.45, overnight: 1.80, rate2y: 1.90, rate5y: 2.15, rate10y: 2.30, rate30y: 2.60, inflation: 0.7 },
  { country: 'South Korea', code: 'KR', region: 'Asia Pacific', policyRate: 3.50, overnight: 3.50, rate2y: 3.20, rate5y: 3.15, rate10y: 3.25, rate30y: 3.15, inflation: 3.2 },
  { country: 'Brazil', code: 'BR', region: 'Emerging', policyRate: 13.25, overnight: 13.15, rate2y: 11.80, rate5y: 11.50, rate10y: 11.20, rate30y: 11.60, inflation: 4.5 },
  { country: 'India', code: 'IN', region: 'Emerging', policyRate: 6.50, overnight: 6.75, rate2y: 6.90, rate5y: 7.05, rate10y: 7.15, rate30y: 7.35, inflation: 5.1 },
  { country: 'Mexico', code: 'MX', region: 'Emerging', policyRate: 11.00, overnight: 11.00, rate2y: 9.80, rate5y: 9.50, rate10y: 9.35, rate30y: 9.60, inflation: 4.8 },
  { country: 'Switzerland', code: 'CH', region: 'Europe', policyRate: 1.50, overnight: 1.45, rate2y: 0.95, rate5y: 0.80, rate10y: 0.75, rate30y: 0.90, inflation: 1.4 },
];

// ── Spread pair definitions ──

interface SpreadConfig {
  name: string;
  from: string; // country code
  to: string;   // country code
}

const SPREAD_CONFIGS: SpreadConfig[] = [
  { name: 'US-DE 10Y', from: 'US', to: 'DE' },
  { name: 'US-JP 10Y', from: 'US', to: 'JP' },
  { name: 'US-GB 10Y', from: 'US', to: 'GB' },
  { name: 'IT-DE 10Y', from: 'IT', to: 'DE' },
  { name: 'US-CN 10Y', from: 'US', to: 'CN' },
  { name: 'US-CH 10Y', from: 'US', to: 'CH' },
];

// ── Cache ──

let cache: { data: GlobalRatesResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Helpers ──

/** Seeded PRNG for reproducible jitter within a time window */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Add small realistic jitter to a base value */
function jitter(base: number, maxBps: number, seed: number): number {
  const r = seededRandom(seed);
  const delta = (r - 0.5) * 2 * (maxBps / 100);
  return Math.round((base + delta) * 1000) / 1000;
}

/** Generate a realistic history series around a base value */
function generateHistory(base: number, points: number, volatilityBps: number, seed: number): number[] {
  const history: number[] = [];
  let current = base - (volatilityBps / 100) * 0.5; // start slightly below
  for (let i = 0; i < points; i++) {
    const r = seededRandom(seed + i * 7.13);
    const step = (r - 0.48) * (volatilityBps / 100) * 0.3; // slight upward bias
    current += step;
    // Mean revert gently
    current += (base - current) * 0.05;
    history.push(Math.round(current * 1000) / 1000);
  }
  return history;
}

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Time-based seed so data changes each cache window
    const timeSeed = Math.floor(now / CACHE_TTL);

    const countries: CountryRate[] = COUNTRY_CONFIGS.map((cfg, idx) => {
      const s = timeSeed * 100 + idx;

      const rate2y = jitter(cfg.rate2y, 5, s + 1);
      const rate5y = jitter(cfg.rate5y, 4, s + 2);
      const rate10y = jitter(cfg.rate10y, 6, s + 3);
      const rate30y = jitter(cfg.rate30y, 5, s + 4);
      const policyRate = cfg.policyRate;
      const overnight = jitter(cfg.overnight, 2, s + 5);
      const inflation = jitter(cfg.inflation, 3, s + 6);

      const spread2s10s = Math.round((rate10y - rate2y) * 100); // in bps
      const realRate10y = Math.round((rate10y - inflation) * 100) / 100;

      const change10y1d = Math.round((seededRandom(s + 10) - 0.5) * 12 * 10) / 10; // -6 to +6 bps
      const change10y1w = Math.round((seededRandom(s + 11) - 0.45) * 30 * 10) / 10; // -15 to +15 bps
      const change10y1m = Math.round((seededRandom(s + 12) - 0.4) * 60 * 10) / 10; // -24 to +36 bps

      const history10y = generateHistory(cfg.rate10y, 20, 15, s + 100);

      return {
        country: cfg.country,
        code: cfg.code,
        region: cfg.region,
        policyRate,
        overnight,
        rate2y,
        rate5y,
        rate10y,
        rate30y,
        spread2s10s,
        change10y1d,
        change10y1w,
        change10y1m,
        realRate10y,
        inflation,
        history10y,
      };
    });

    // Build rate map for spread calculations
    const rateMap = new Map(countries.map((c) => [c.code, c]));

    const spreads: RateSpreadPair[] = SPREAD_CONFIGS.map((sc, idx) => {
      const from = rateMap.get(sc.from);
      const to = rateMap.get(sc.to);
      if (!from || !to) {
        return { name: sc.name, spread: 0, change1d: 0, change1w: 0, history: [] };
      }

      const spread = Math.round((from.rate10y - to.rate10y) * 100); // bps
      const change1d = Math.round((from.change10y1d - to.change10y1d) * 10) / 10;
      const change1w = Math.round((from.change10y1w - to.change10y1w) * 10) / 10;

      // Generate spread history from the two country histories
      const history = from.history10y.map((fv, i) => {
        const tv = to.history10y[i] ?? to.rate10y;
        return Math.round((fv - tv) * 100); // bps
      });

      return { name: sc.name, spread, change1d, change1w, history };
    });

    const globalAvg10y = Math.round(
      (countries.reduce((sum, c) => sum + c.rate10y, 0) / countries.length) * 100,
    ) / 100;

    const result: GlobalRatesResponse = {
      countries,
      spreads,
      globalAvg10y,
      timestamp: new Date().toISOString(),
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: any) {
    console.error('[GlobalRates] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch global rates data' });
  }
});

export default router;
