import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();


// ── Types ──

interface SwapPosition {
  tradeId: string;
  type: string;
  notional: number;
  fixedRate: number;
  floatingIndex: string;
  maturity: string;
  mtm: number;
  dv01: number;
  pv01: number;
  convexity: number;
  accrued: number;
}

interface PV01Bucket {
  tenor: string;
  value: number;
  pctTotal: number;
  cumulative: number;
}

interface DiscountCurvePoint {
  tenor: string;
  discountFactor: number;
  zeroRate: number;
  forwardRate: number;
  change1d: number;
}

interface GreeksSummary {
  totalDV01: number;
  gamma: number;
  theta: number;
  vega: number;
  totalMTM: number;
  dailyPnL: number;
}

interface SwapValuationResponse {
  portfolio: SwapPosition[];
  pv01Ladder: PV01Bucket[];
  discountCurve: DiscountCurvePoint[];
  greeks: GreeksSummary;
  generatedAt: string;
}
let cache: { data: SwapValuationResponse | null; ts: number } = { data: null, ts: 0 };

// ── Static configs ──

const SWAP_TYPES = ['IRS', 'OIS', 'basis', 'xccy'] as const;
const FLOATING_INDICES = ['SOFR', 'EURIBOR', 'SONIA'] as const;

const PV01_TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'] as const;

const DISCOUNT_TENORS = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'] as const;
const DISCOUNT_YEARS: Record<string, number> = {
  '1M': 1 / 12, '3M': 0.25, '6M': 0.5, '1Y': 1, '2Y': 2, '3Y': 3,
  '5Y': 5, '7Y': 7, '10Y': 10, '15Y': 15, '20Y': 20, '30Y': 30,
};

// OIS zero rate anchors (SOFR-based)
// Short end ~4.30%, belly ~4.10%, long end ~3.85%
const ZERO_RATE_SHORT = 4.30;
const ZERO_RATE_MID = 4.10;
const ZERO_RATE_LONG = 3.85;

// ── Helpers ──

function interpolateZeroRate(years: number): number {
  if (years <= 1) {
    // Short end: 4.33% at 1M tapering to 4.30% at 1Y
    return ZERO_RATE_SHORT + (1 - years) * 0.03;
  }
  if (years <= 10) {
    const t = (years - 1) / 9;
    return ZERO_RATE_SHORT + t * (ZERO_RATE_MID - ZERO_RATE_SHORT);
  }
  const t = (years - 10) / 20;
  return ZERO_RATE_MID + t * (ZERO_RATE_LONG - ZERO_RATE_MID);
}

// ── Data generation ──

function generate(): SwapValuationResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-swap-valuation'));
  const round = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // ── 1. Portfolio Valuation (10 swaps) ──

  const tradeIdPrefixes = ['SWP', 'OIS', 'BSW', 'XCY'];
  const portfolio: SwapPosition[] = [];

  const swapConfigs: Array<{
    type: string;
    notionalRange: [number, number];
    fixedRateBase: number;
    fixedRateSpread: number;
    indexPool: string[];
    maturityYears: number[];
    payerBias: number; // >0.5 means more likely payer (negative convexity)
  }> = [
    { type: 'IRS', notionalRange: [50, 500], fixedRateBase: 4.15, fixedRateSpread: 0.40, indexPool: ['SOFR'], maturityYears: [2, 3, 5, 7, 10], payerBias: 0.5 },
    { type: 'OIS', notionalRange: [100, 750], fixedRateBase: 4.28, fixedRateSpread: 0.20, indexPool: ['SOFR'], maturityYears: [1, 2, 3, 5], payerBias: 0.6 },
    { type: 'basis', notionalRange: [75, 400], fixedRateBase: 0.08, fixedRateSpread: 0.12, indexPool: ['SOFR', 'EURIBOR'], maturityYears: [3, 5, 7, 10], payerBias: 0.5 },
    { type: 'xccy', notionalRange: [100, 600], fixedRateBase: 3.95, fixedRateSpread: 0.50, indexPool: ['EURIBOR', 'SONIA'], maturityYears: [3, 5, 7, 10, 15], payerBias: 0.45 },
  ];

  // Distribution: 4 IRS, 2 OIS, 2 basis, 2 xccy
  const distribution = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3];

  for (let i = 0; i < 10; i++) {
    const cfgIdx = distribution[i];
    const cfg = swapConfigs[cfgIdx];
    const prefix = tradeIdPrefixes[cfgIdx];
    const seqNum = Math.floor(rng() * 90000) + 10000;
    const tradeId = `${prefix}-${seqNum}`;

    const notional = round(cfg.notionalRange[0] + rng() * (cfg.notionalRange[1] - cfg.notionalRange[0]), 0);
    const fixedRate = round(cfg.fixedRateBase + (rng() - 0.5) * cfg.fixedRateSpread * 2, 3);
    const floatingIndex = cfg.indexPool[Math.floor(rng() * cfg.indexPool.length)];
    const matYears = cfg.maturityYears[Math.floor(rng() * cfg.maturityYears.length)];

    // Maturity date: today + matYears
    const matDate = new Date();
    matDate.setFullYear(matDate.getFullYear() + matYears);
    const maturity = matDate.toISOString().slice(0, 10);

    // Is this a payer or receiver?
    const isPayer = rng() < cfg.payerBias;

    // MTM: depends on rate movement vs fixed; scale with notional and tenor
    // Realistic range: -2% to +2% of notional for seasoned swaps
    const mtmPct = (rng() - 0.48) * 0.04; // slight positive bias (rates rose)
    const mtmSign = isPayer ? 1 : -1;
    const mtm = round(notional * 1000 * mtmPct * mtmSign * (matYears / 5), 0);

    // DV01: ~notional * tenor * 0.0001 in $K
    // For a $100M 10Y swap, DV01 ~ $100K
    const dv01Raw = notional * matYears * 0.01;
    const dv01 = round(dv01Raw * (0.9 + rng() * 0.2), 1);

    // PV01: similar to DV01 but for coupon (slightly different)
    const pv01 = round(dv01 * (0.98 + rng() * 0.04), 1);

    // Convexity: positive for receivers, negative for payers
    // Magnitude scales with tenor squared
    const convBase = (matYears * matYears) * 0.0008 * (0.8 + rng() * 0.4);
    const convexity = round(isPayer ? -convBase : convBase, 4);

    // Accrued interest: fraction of current coupon period
    const dayFraction = rng() * 0.5; // 0-50% through period
    const accrued = round(notional * fixedRate * 0.01 * dayFraction * 10, 0); // in $K

    portfolio.push({
      tradeId, type: cfg.type, notional, fixedRate, floatingIndex,
      maturity, mtm, dv01, pv01, convexity, accrued,
    });
  }

  // ── 2. PV01 Ladder ──

  // Bucket DV01 by tenor based on portfolio maturity distribution
  const bucketValues: Record<string, number> = {};
  for (const tenor of PV01_TENORS) { bucketValues[tenor] = 0; }

  // Distribute each swap's DV01 into the nearest bucket
  const tenorYears: Record<string, number> = {
    '1Y': 1, '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7,
    '10Y': 10, '15Y': 15, '20Y': 20, '30Y': 30,
  };
  const tenorKeys = Object.keys(tenorYears);
  const tenorYearValues = Object.values(tenorYears);

  for (const pos of portfolio) {
    const matDate = new Date(pos.maturity);
    const now = new Date();
    const yearsToMat = (matDate.getTime() - now.getTime()) / (365.25 * 24 * 3600_000);

    // Find two nearest buckets and interpolate
    let lowerIdx = 0;
    for (let j = 0; j < tenorYearValues.length - 1; j++) {
      if (tenorYearValues[j] <= yearsToMat) lowerIdx = j;
    }
    const upperIdx = Math.min(lowerIdx + 1, tenorYearValues.length - 1);

    if (lowerIdx === upperIdx) {
      bucketValues[tenorKeys[lowerIdx]] += pos.dv01;
    } else {
      const range = tenorYearValues[upperIdx] - tenorYearValues[lowerIdx];
      const weight = (yearsToMat - tenorYearValues[lowerIdx]) / range;
      bucketValues[tenorKeys[lowerIdx]] += pos.dv01 * (1 - weight);
      bucketValues[tenorKeys[upperIdx]] += pos.dv01 * weight;
    }
  }

  // Add some residual noise to represent hedges / basis positions
  for (const tenor of PV01_TENORS) {
    bucketValues[tenor] += (rng() - 0.5) * 20;
    bucketValues[tenor] = round(bucketValues[tenor], 1);
  }

  const totalDV01Ladder = Object.values(bucketValues).reduce((a, b) => a + Math.abs(b), 0);

  let cumulative = 0;
  const pv01Ladder: PV01Bucket[] = PV01_TENORS.map(tenor => {
    const value = bucketValues[tenor];
    const pctTotal = totalDV01Ladder > 0 ? round((Math.abs(value) / totalDV01Ladder) * 100, 1) : 0;
    cumulative += pctTotal;
    return { tenor, value, pctTotal, cumulative: round(cumulative, 1) };
  });

  // ── 3. Discount Curve ──

  const discountCurve: DiscountCurvePoint[] = DISCOUNT_TENORS.map(tenor => {
    const years = DISCOUNT_YEARS[tenor];
    const baseZero = interpolateZeroRate(years);
    const noise = (rng() - 0.5) * 0.06;
    const zeroRate = round(baseZero + noise, 4);

    // Discount factor: DF = 1 / (1 + r)^t
    const discountFactor = round(1 / Math.pow(1 + zeroRate / 100, years), 6);

    // Forward rate: instantaneous forward approximated from zero curve
    // f(t) ~ r(t) + t * dr/dt
    const dt = 0.01;
    const rUp = interpolateZeroRate(years + dt) + (rng() - 0.5) * 0.02;
    const slope = (rUp - baseZero) / dt;
    const fwd = baseZero + years * slope;
    const forwardRate = round(fwd + noise * 0.5, 4);

    // Daily change in bps: short end more stable, long end more volatile
    const volScale = years < 2 ? 0.3 : years < 10 ? 1.0 : 1.5;
    const change1d = round((rng() - 0.5) * 3 * volScale, 1);

    return { tenor, discountFactor, zeroRate, forwardRate, change1d };
  });

  // ── 4. Greeks Summary ──

  const totalDV01 = round(portfolio.reduce((acc, p) => acc + p.dv01, 0), 1);
  // Gamma: portfolio-level convexity in $K per bp^2
  const gamma = round(portfolio.reduce((acc, p) => acc + p.convexity * p.notional * 0.001, 0), 2);
  // Theta: time decay ~ sum of accrued / remaining days, approximately
  const theta = round(portfolio.reduce((acc, p) => acc + p.accrued * 0.002, 0) + (rng() - 0.5) * 5, 2);
  // Vega: swaption exposure (xccy and some IRS have embedded optionality)
  const vega = round(portfolio
    .filter(p => p.type === 'xccy' || (p.type === 'IRS' && rng() > 0.6))
    .reduce((acc, p) => acc + p.notional * 0.005 * (rng() * 0.5 + 0.5), 0), 1);
  // Total MTM in $M
  const totalMTM = round(portfolio.reduce((acc, p) => acc + p.mtm, 0) / 1000, 3);
  // Daily P&L: MTM change driven by rate moves
  const dailyPnL = round((rng() - 0.45) * totalDV01 * 2.5, 1);

  const greeks: GreeksSummary = { totalDV01, gamma, theta, vega, totalMTM, dailyPnL };

  return {
    portfolio,
    pv01Ladder,
    discountCurve,
    greeks,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SwapValuation] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate swap valuation data' });
  }
});

export default router;
