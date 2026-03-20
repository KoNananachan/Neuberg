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

// ── US TIPS bond definitions ──

const US_TIPS = [
  { cusip: '912810SB2', maturity: '2025-01-15', coupon: 0.125, baseDuration: 0.8,  baseIndexRatio: 1.42 },
  { cusip: '912810SC0', maturity: '2027-04-15', coupon: 0.375, baseDuration: 2.9,  baseIndexRatio: 1.32 },
  { cusip: '912810SD8', maturity: '2029-01-15', coupon: 0.625, baseDuration: 4.8,  baseIndexRatio: 1.25 },
  { cusip: '912810SE6', maturity: '2032-07-15', coupon: 0.875, baseDuration: 7.2,  baseIndexRatio: 1.20 },
  { cusip: '912810SF3', maturity: '2034-01-15', coupon: 1.375, baseDuration: 8.9,  baseIndexRatio: 1.18 },
  { cusip: '912810SG1', maturity: '2039-04-15', coupon: 1.750, baseDuration: 12.3, baseIndexRatio: 1.15 },
  { cusip: '912810SH9', maturity: '2042-02-15', coupon: 0.750, baseDuration: 15.8, baseIndexRatio: 1.13 },
  { cusip: '912810SJ5', maturity: '2044-02-15', coupon: 1.000, baseDuration: 17.2, baseIndexRatio: 1.12 },
  { cusip: '912810SK2', maturity: '2049-02-15', coupon: 2.000, baseDuration: 20.1, baseIndexRatio: 1.11 },
  { cusip: '912810SL0', maturity: '2054-02-15', coupon: 2.375, baseDuration: 22.5, baseIndexRatio: 1.10 },
];

// ── Global linker definitions ──

const GLOBAL_LINKERS = [
  { id: 'UKTi',   country: 'United Kingdom', name: 'UK IL Gilt 0.125% 2028', maturity: '2028-03-22', baseRealYield: 0.85, baseBreakeven: 3.65, currency: 'GBP' },
  { id: 'OATi',   country: 'France',         name: 'OATi 0.10% 2031',        maturity: '2031-03-01', baseRealYield: 0.45, baseBreakeven: 2.35, currency: 'EUR' },
  { id: 'Bundi',  country: 'Germany',         name: 'DBRi 0.10% 2033',        maturity: '2033-04-15', baseRealYield: 0.15, baseBreakeven: 2.15, currency: 'EUR' },
  { id: 'BTPei',  country: 'Italy',           name: 'BTPei 0.40% 2030',       maturity: '2030-05-15', baseRealYield: 1.10, baseBreakeven: 2.55, currency: 'EUR' },
  { id: 'JGBi',   country: 'Japan',           name: 'JGBi #26 0.10% 2029',    maturity: '2029-03-10', baseRealYield: -0.50, baseBreakeven: 1.35, currency: 'JPY' },
  { id: 'RRB',    country: 'Canada',          name: 'RRB 1.50% 2044',         maturity: '2044-12-01', baseRealYield: 1.60, baseBreakeven: 2.20, currency: 'CAD' },
  { id: 'ILB-AU', country: 'Australia',       name: 'ACGB IL 1.25% 2035',     maturity: '2035-02-21', baseRealYield: 1.20, baseBreakeven: 2.65, currency: 'AUD' },
  { id: 'NTN-B',  country: 'Brazil',          name: 'NTN-B 6.00% 2035',       maturity: '2035-05-15', baseRealYield: 6.10, baseBreakeven: 4.80, currency: 'BRL' },
];

// ── Breakeven tenors ──

const BREAKEVEN_TENORS = ['2Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
const BREAKEVEN_BASE: Record<string, number> = {
  '2Y': 2.25, '5Y': 2.30, '7Y': 2.35, '10Y': 2.40, '20Y': 2.50, '30Y': 2.45,
};

// ── Real yield curve tenors ──

const REAL_YIELD_TENORS = ['2Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
const REAL_YIELD_BASE: Record<string, number> = {
  '2Y': 2.10, '5Y': 2.05, '7Y': 2.10, '10Y': 2.15, '20Y': 2.20, '30Y': 2.25,
};
const NOMINAL_YIELD_BASE: Record<string, number> = {
  '2Y': 4.35, '5Y': 4.35, '7Y': 4.45, '10Y': 4.55, '20Y': 4.70, '30Y': 4.70,
};

// ── Seasonality base factors (monthly CPI contribution weights) ──

const CPI_SEASONAL_BASE = [
  { month: 'Jan', factor: 0.35 },
  { month: 'Feb', factor: 0.40 },
  { month: 'Mar', factor: 0.45 },
  { month: 'Apr', factor: 0.38 },
  { month: 'May', factor: 0.32 },
  { month: 'Jun', factor: 0.28 },
  { month: 'Jul', factor: 0.15 },
  { month: 'Aug', factor: 0.22 },
  { month: 'Sep', factor: 0.40 },
  { month: 'Oct', factor: 0.30 },
  { month: 'Nov', factor: 0.18 },
  { month: 'Dec', factor: 0.10 },
];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-inflation-linked-bonds'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round3 = (v: number) => Math.round(v * 1000) / 1000;
  const round4 = (v: number) => Math.round(v * 10000) / 10000;

  // ── Summary ──

  const totalOutstanding = round2(jitter(2.05, 0.03));
  const avgRealYield = round2(jitter(2.10, 0.05));
  const avgBreakeven = round2(jitter(2.38, 0.04));
  const breakeven10Y = round2(jitter(2.40, 0.04));
  const forward5Y5Y = round2(jitter(2.55, 0.04));
  const latestCpiYoY = round2(jitter(3.2, 0.08));

  const summary = {
    totalOutstandingTrn: totalOutstanding,
    avgRealYieldPct: avgRealYield,
    avgBreakevenPct: avgBreakeven,
    breakeven10Y: breakeven10Y,
    forward5Y5Y: forward5Y5Y,
    latestCpiYoY: latestCpiYoY,
  };

  // ── US TIPS ──

  const tips = US_TIPS.map(bond => {
    const yearsToMaturity = Math.max(0.5, (new Date(bond.maturity).getTime() - Date.now()) / (365.25 * 86400000));
    const baseRealYield = 1.80 + yearsToMaturity * 0.015;
    const realYield = round3(jitter(baseRealYield, 0.04));
    const breakeven = round3(jitter(2.30 + yearsToMaturity * 0.005, 0.04));
    const nominalYield = round3(realYield + breakeven);
    const indexRatio = round4(jitter(bond.baseIndexRatio, 0.01));
    const accruedInflation = round2((indexRatio - 1.0) * 100);
    const duration = round2(jitter(bond.baseDuration, 0.03));
    const price = round3(jitter(98.0 + (bond.coupon - realYield) * duration * 0.8, 0.005));
    const change1d = round3((rng() - 0.48) * 0.5);

    return {
      cusip: bond.cusip,
      maturity: bond.maturity,
      coupon: bond.coupon,
      realYield,
      nominalYield,
      breakeven,
      price,
      change1d,
      duration,
      indexRatio,
      accruedInflation,
    };
  });

  // ── Global linkers ──

  const globalLinkers = GLOBAL_LINKERS.map(bond => {
    const realYield = round3(jitter(bond.baseRealYield, 0.06));
    const breakeven = round3(jitter(bond.baseBreakeven, 0.05));
    const change1d = round3((rng() - 0.48) * 0.08);

    return {
      id: bond.id,
      country: bond.country,
      name: bond.name,
      maturity: bond.maturity,
      realYield,
      breakeven,
      change1d,
      currency: bond.currency,
    };
  });

  // ── Breakeven term structure ──

  const breakevenCurve = BREAKEVEN_TENORS.map(tenor => {
    const base = BREAKEVEN_BASE[tenor];
    const rate = round3(jitter(base, 0.04));
    const change1d = round3((rng() - 0.48) * 0.05);
    const change1m = round3((rng() - 0.45) * 0.15);
    const oneYearAvg = round3(jitter(base * 0.97, 0.03));
    const relativeToAvg = round3(rate - oneYearAvg);

    return {
      tenor,
      impliedBreakeven: rate,
      change1d,
      change1m,
      oneYearAvg,
      relativeToAvg,
    };
  });

  // ── Seasonality ──

  const seasonality = CPI_SEASONAL_BASE.map(entry => {
    const factor = round3(jitter(entry.factor, 0.08));
    return {
      month: entry.month,
      cpiContribution: factor,
    };
  });

  // ── Real yield curve ──

  const realYieldCurve = REAL_YIELD_TENORS.map(tenor => {
    const realBase = REAL_YIELD_BASE[tenor];
    const nomBase = NOMINAL_YIELD_BASE[tenor];
    const realYield = round3(jitter(realBase, 0.04));
    const nominalYield = round3(jitter(nomBase, 0.03));
    const breakeven = round3(nominalYield - realYield);
    const change1d = round3((rng() - 0.48) * 0.05);

    return {
      tenor,
      realYield,
      nominalYield,
      breakeven,
      change1d,
    };
  });

  return {
    summary,
    tips,
    globalLinkers,
    breakevenCurve,
    seasonality,
    realYieldCurve,
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
    console.error('[InflationLinkedBonds] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate inflation-linked bonds data' });
  }
});

export default router;
