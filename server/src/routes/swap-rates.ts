import { Router } from 'express';

const router = Router();

// ── Types ──

interface SwapRate {
  currency: string;
  tenor: string;
  rate: number;
  change1d: number;
  change1w: number;
  change1m: number;
  spread2s10s: number | null;
  spreadVsTreasury: number;
  history: number[];
}

interface SwapCurve {
  currency: string;
  tenors: string[];
  rates: number[];
  prevRates: number[];
  weekAgoRates: number[];
  monthAgoRates: number[];
}

interface SwapRatesResponse {
  rates: SwapRate[];
  curves: SwapCurve[];
  butterfly: {
    currency: string;
    value: number;
    change: number;
  }[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: SwapRatesResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 10 * 60_000; // 10 minutes

// ── Data generation helpers ──

const TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'] as const;

/** Tenor to numeric years for interpolation */
const TENOR_YEARS: Record<string, number> = {
  '1Y': 1, '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7,
  '10Y': 10, '15Y': 15, '20Y': 20, '30Y': 30,
};

/** Base swap rate curves per currency (short end -> long end) */
const CURRENCY_CURVES: Record<string, { base2Y: number; base10Y: number; base30Y: number; spread: number }> = {
  USD: { base2Y: 4.52, base10Y: 4.28, base30Y: 4.18, spread: 12 },
  EUR: { base2Y: 2.82, base10Y: 2.65, base30Y: 2.58, spread: 8 },
  GBP: { base2Y: 4.68, base10Y: 4.35, base30Y: 4.15, spread: 15 },
  JPY: { base2Y: 0.32, base10Y: 0.85, base30Y: 1.22, spread: 3 },
  CHF: { base2Y: 1.15, base10Y: 1.42, base30Y: 1.55, spread: 5 },
  AUD: { base2Y: 4.05, base10Y: 4.32, base30Y: 4.48, spread: 18 },
  CAD: { base2Y: 3.85, base10Y: 3.62, base30Y: 3.48, spread: 10 },
};

/** Interpolate rate for a given tenor from the 3 anchor points */
function interpolateRate(years: number, base2Y: number, base10Y: number, base30Y: number): number {
  if (years <= 2) {
    // Extrapolate 1Y from 2Y (slightly higher for inverted, slightly lower for normal)
    const slope1to2 = (base10Y - base2Y) / 8;
    return base2Y - slope1to2 * (2 - years);
  }
  if (years <= 10) {
    const t = (years - 2) / 8;
    return base2Y + t * (base10Y - base2Y);
  }
  const t = (years - 10) / 20;
  return base10Y + t * (base30Y - base10Y);
}

/** Generate a 20-point history around a base rate with mean-reverting noise */
function generateHistory(base: number, volatilityBps: number): number[] {
  const history: number[] = [];
  let current = base - (volatilityBps / 100) * 0.4;
  for (let i = 0; i < 20; i++) {
    const drift = (base - current) * 0.12;
    const noise = ((Math.random() - 0.5) * 2 * volatilityBps) / 100;
    current += drift + noise;
    current = Math.round(current * 10000) / 10000;
    history.push(current);
  }
  history[history.length - 1] = base;
  return history;
}

/** Shift a rate array to simulate a previous snapshot */
function shiftRates(rates: number[], bpsShift: number, noise: number): number[] {
  return rates.map((r) => {
    const shift = (bpsShift + (Math.random() - 0.5) * noise * 2) / 100;
    return Math.round((r + shift) * 10000) / 10000;
  });
}

function generateSwapRatesData(): SwapRatesResponse {
  const allRates: SwapRate[] = [];
  const curves: SwapCurve[] = [];

  for (const [ccy, cfg] of Object.entries(CURRENCY_CURVES)) {
    const tenorRates: number[] = [];

    // Compute swap spread vs treasury (only meaningful for USD, approximate for others)
    const baseSpreadBps = cfg.spread;

    for (const tenor of TENORS) {
      const years = TENOR_YEARS[tenor];
      const baseRate = interpolateRate(years, cfg.base2Y, cfg.base10Y, cfg.base30Y);

      // Add small random perturbation
      const jitter = ((Math.random() - 0.5) * 4) / 100; // +/- 2bps
      const rate = Math.round((baseRate + jitter) * 10000) / 10000;
      tenorRates.push(rate);

      // Daily / weekly / monthly changes (in bps)
      const change1d = Math.round((Math.random() - 0.5) * 6 * 10) / 10;
      const change1w = Math.round((Math.random() - 0.5) * 16 * 10) / 10;
      const change1m = Math.round((Math.random() - 0.5) * 30 * 10) / 10;

      // 2s10s spread only for 2Y and 10Y rows
      let spread2s10s: number | null = null;
      // Will be calculated after all rates are generated

      // Swap spread vs treasury (varies by tenor)
      const tenorSpreadAdj = (years / 10) * 4; // longer tenors have slightly wider spreads
      const spreadVsTreasury = Math.round(baseSpreadBps + tenorSpreadAdj + (Math.random() - 0.5) * 3);

      const volatility = ccy === 'JPY' ? 2 : 5;
      const history = generateHistory(rate, volatility);

      allRates.push({
        currency: ccy,
        tenor,
        rate,
        change1d,
        change1w,
        change1m,
        spread2s10s,
        spreadVsTreasury,
        history,
      });
    }

    // Calculate 2s10s spread for this currency
    const rate2Y = allRates.find((r) => r.currency === ccy && r.tenor === '2Y');
    const rate10Y = allRates.find((r) => r.currency === ccy && r.tenor === '10Y');
    if (rate2Y && rate10Y) {
      const spread = Math.round((rate10Y.rate - rate2Y.rate) * 100 * 10) / 10; // in bps
      rate2Y.spread2s10s = spread;
      rate10Y.spread2s10s = spread;
    }

    // Build curve data
    const prevRates = shiftRates(tenorRates, 2, 3);
    const weekAgoRates = shiftRates(tenorRates, 5, 6);
    const monthAgoRates = shiftRates(tenorRates, 12, 10);

    curves.push({
      currency: ccy,
      tenors: [...TENORS],
      rates: tenorRates,
      prevRates,
      weekAgoRates,
      monthAgoRates,
    });
  }

  // 2s5s10s butterfly: 2 * rate5Y - rate2Y - rate10Y (in bps)
  const butterfly = Object.keys(CURRENCY_CURVES).map((ccy) => {
    const r2 = allRates.find((r) => r.currency === ccy && r.tenor === '2Y')?.rate ?? 0;
    const r5 = allRates.find((r) => r.currency === ccy && r.tenor === '5Y')?.rate ?? 0;
    const r10 = allRates.find((r) => r.currency === ccy && r.tenor === '10Y')?.rate ?? 0;
    const value = Math.round((2 * r5 - r2 - r10) * 100 * 10) / 10;
    const change = Math.round((Math.random() - 0.5) * 4 * 10) / 10;
    return { currency: ccy, value, change };
  });

  return {
    rates: allRates,
    curves,
    butterfly,
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

    const data = generateSwapRatesData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SwapRates] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate swap rate data' });
  }
});

export default router;
