import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface SwapCurvePoint {
  tenor: string;
  years: number;
  mid: number;
  bid: number;
  ask: number;
  change1d: number;
  change1w: number;
}

interface SwapCurveEntry {
  currency: string;
  floatingIndex: string;
  points: SwapCurvePoint[];
}

interface SampleSwap {
  id: string;
  direction: 'Pay Fixed' | 'Receive Fixed';
  notional: number;
  currency: string;
  fixedRate: number;
  floatingIndex: string;
  tenor: string;
  startDate: string;
  maturityDate: string;
  fixedLegPV: number;
  floatingLegPV: number;
  npv: number;
  dv01: number;
  accruedInterest: number;
}

interface ForwardRateEntry {
  tenor: string;
  rate: number;
  change1d: number;
  impliedFromSwapCurve: boolean;
}

interface SwapSpreadEntry {
  tenor: string;
  swapRate: number;
  treasuryYield: number;
  swapSpreadBps: number;
  change1d: number;
}

interface BasisSwapEntry {
  name: string;
  tenors: { tenor: string; spread: number; change1d: number }[];
}

interface RiskSensitivities {
  swapDescription: string;
  notional: number;
  dv01PerBucket: { tenor: string; dv01: number }[];
  totalDV01: number;
  gamma: number;
  theta: number;
}

interface SwapPricingResponse {
  swapCurves: SwapCurveEntry[];
  sampleSwaps: SampleSwap[];
  forwardRates: ForwardRateEntry[];
  swapSpreadsToTreasury: SwapSpreadEntry[];
  basisSwaps: BasisSwapEntry[];
  riskSensitivities: RiskSensitivities;
  timestamp: string;
}

// ── Cache ──

let cache: { data: SwapPricingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Constants ──

const TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'] as const;

const TENOR_YEARS: Record<string, number> = {
  '1Y': 1, '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7,
  '10Y': 10, '15Y': 15, '20Y': 20, '25Y': 25, '30Y': 30,
};

interface CurrencyConfig {
  base1Y: number;
  base2Y: number;
  base10Y: number;
  base30Y: number;
  floatingIndex: string;
  bidAskHalfSpread: number;
}

const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  USD: { base1Y: 4.55, base2Y: 4.00, base10Y: 3.80, base30Y: 3.60, floatingIndex: 'SOFR', bidAskHalfSpread: 0.005 },
  EUR: { base1Y: 2.85, base2Y: 2.70, base10Y: 2.55, base30Y: 2.40, floatingIndex: 'EURIBOR 6M', bidAskHalfSpread: 0.005 },
  GBP: { base1Y: 4.45, base2Y: 4.20, base10Y: 4.00, base30Y: 3.75, floatingIndex: 'SONIA', bidAskHalfSpread: 0.006 },
  JPY: { base1Y: 0.35, base2Y: 0.50, base10Y: 1.05, base30Y: 1.55, floatingIndex: 'TONAR', bidAskHalfSpread: 0.003 },
};

// ── Interpolation ──

function interpolateRate(years: number, cfg: CurrencyConfig): number {
  if (years <= 1) return cfg.base1Y;
  if (years <= 2) {
    const t = (years - 1) / 1;
    return cfg.base1Y + t * (cfg.base2Y - cfg.base1Y);
  }
  if (years <= 10) {
    const t = (years - 2) / 8;
    return cfg.base2Y + t * (cfg.base10Y - cfg.base2Y);
  }
  const t = (years - 10) / 20;
  return cfg.base10Y + t * (cfg.base30Y - cfg.base10Y);
}

// ── Data generation ──

function generateSwapCurves(rng: () => number): SwapCurveEntry[] {
  const curves: SwapCurveEntry[] = [];

  for (const [ccy, cfg] of Object.entries(CURRENCY_CONFIGS)) {
    const points: SwapCurvePoint[] = [];

    for (const tenor of TENORS) {
      const years = TENOR_YEARS[tenor];
      const baseRate = interpolateRate(years, cfg);
      const jitter = (rng() - 0.5) * 0.04; // +/- 2bps
      const mid = Math.round((baseRate + jitter) * 10000) / 10000;

      const halfSpread = cfg.bidAskHalfSpread + rng() * 0.002;
      const bid = Math.round((mid - halfSpread) * 10000) / 10000;
      const ask = Math.round((mid + halfSpread) * 10000) / 10000;

      const scaleFactor = ccy === 'JPY' ? 0.3 : 1;
      const change1d = Math.round((rng() - 0.5) * 6 * scaleFactor * 10) / 10;
      const change1w = Math.round((rng() - 0.5) * 16 * scaleFactor * 10) / 10;

      points.push({ tenor, years, mid, bid, ask, change1d, change1w });
    }

    curves.push({ currency: ccy, floatingIndex: cfg.floatingIndex, points });
  }

  return curves;
}

function generateSampleSwaps(rng: () => number, curves: SwapCurveEntry[]): SampleSwap[] {
  const usdCurve = curves.find((c) => c.currency === 'USD');
  const eurCurve = curves.find((c) => c.currency === 'EUR');
  const gbpCurve = curves.find((c) => c.currency === 'GBP');
  const jpyCurve = curves.find((c) => c.currency === 'JPY');

  const swapConfigs: {
    direction: 'Pay Fixed' | 'Receive Fixed';
    notional: number;
    currency: string;
    floatingIndex: string;
    tenor: string;
    yearsToMaturity: number;
    fixedRateOffset: number;
    curve: SwapCurveEntry | undefined;
  }[] = [
    { direction: 'Pay Fixed', notional: 100_000_000, currency: 'USD', floatingIndex: 'SOFR', tenor: '10Y', yearsToMaturity: 7.3, fixedRateOffset: -0.15, curve: usdCurve },
    { direction: 'Receive Fixed', notional: 50_000_000, currency: 'USD', floatingIndex: 'SOFR', tenor: '5Y', yearsToMaturity: 3.1, fixedRateOffset: 0.20, curve: usdCurve },
    { direction: 'Pay Fixed', notional: 75_000_000, currency: 'EUR', floatingIndex: 'EURIBOR 6M', tenor: '7Y', yearsToMaturity: 5.8, fixedRateOffset: -0.10, curve: eurCurve },
    { direction: 'Receive Fixed', notional: 200_000_000, currency: 'GBP', floatingIndex: 'SONIA', tenor: '30Y', yearsToMaturity: 24.5, fixedRateOffset: 0.25, curve: gbpCurve },
    { direction: 'Pay Fixed', notional: 10_000_000_000, currency: 'JPY', floatingIndex: 'TONAR', tenor: '20Y', yearsToMaturity: 16.2, fixedRateOffset: -0.08, curve: jpyCurve },
  ];

  return swapConfigs.map((cfg, idx) => {
    // Derive fixed rate from the curve
    const curvePoint = cfg.curve?.points.find((p) => p.tenor === cfg.tenor);
    const currentSwapRate = curvePoint?.mid ?? 3.80;
    const fixedRate = Math.round((currentSwapRate + cfg.fixedRateOffset) * 10000) / 10000;

    // PV calculations: simplified mark-to-market
    const rateDiff = currentSwapRate - fixedRate; // positive means fixed payer profits
    const dv01Base = cfg.currency === 'JPY'
      ? cfg.notional * cfg.yearsToMaturity * 0.0001 / 100 // JPY notional is much larger
      : cfg.notional * cfg.yearsToMaturity * 0.0001;

    const dv01 = Math.round(dv01Base * (0.85 + rng() * 0.30));

    // NPV ~ rate difference * duration * notional (simplified)
    const rawNPV = rateDiff * cfg.yearsToMaturity * cfg.notional / 100;
    const npvSign = cfg.direction === 'Pay Fixed' ? 1 : -1;
    const npv = Math.round(rawNPV * npvSign + (rng() - 0.5) * Math.abs(rawNPV) * 0.1);

    // Split NPV into fixed and floating leg PVs
    const fixedLegPV = Math.round(cfg.notional * (1 + (rng() - 0.5) * 0.02));
    const floatingLegPV = fixedLegPV + npv * (cfg.direction === 'Pay Fixed' ? 1 : -1);

    // Accrued interest
    const dayFraction = rng() * 0.5; // 0-6 months into period
    const accrued = Math.round(cfg.notional * fixedRate * dayFraction / 100 / 2);

    // Dates
    const startYear = 2024 - Math.floor(cfg.yearsToMaturity * 0.3);
    const maturityYear = startYear + parseInt(cfg.tenor);
    const startMonth = Math.floor(rng() * 12) + 1;
    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-15`;
    const maturityDate = `${maturityYear}-${String(startMonth).padStart(2, '0')}-15`;

    return {
      id: `SWAP-${String(idx + 1).padStart(3, '0')}`,
      direction: cfg.direction,
      notional: cfg.notional,
      currency: cfg.currency,
      fixedRate,
      floatingIndex: cfg.floatingIndex,
      tenor: cfg.tenor,
      startDate,
      maturityDate,
      fixedLegPV,
      floatingLegPV: Math.round(floatingLegPV),
      npv,
      dv01,
      accruedInterest: accrued,
    };
  });
}

function generateForwardRates(rng: () => number, curves: SwapCurveEntry[]): ForwardRateEntry[] {
  const usdCurve = curves.find((c) => c.currency === 'USD');
  if (!usdCurve) return [];

  // SOFR forward rates derived from the swap curve
  const forwardTenors: { tenor: string; derivedFromShort: string; derivedFromLong: string; baseRate: number }[] = [
    { tenor: '1M', derivedFromShort: '1Y', derivedFromLong: '1Y', baseRate: 4.30 },
    { tenor: '3M', derivedFromShort: '1Y', derivedFromLong: '1Y', baseRate: 4.28 },
    { tenor: '6M', derivedFromShort: '1Y', derivedFromLong: '2Y', baseRate: 4.22 },
    { tenor: '1Y', derivedFromShort: '1Y', derivedFromLong: '2Y', baseRate: 4.15 },
    { tenor: '2Y', derivedFromShort: '2Y', derivedFromLong: '3Y', baseRate: 3.95 },
    { tenor: '3Y', derivedFromShort: '3Y', derivedFromLong: '5Y', baseRate: 3.82 },
    { tenor: '5Y', derivedFromShort: '5Y', derivedFromLong: '10Y', baseRate: 3.70 },
  ];

  return forwardTenors.map((ft) => {
    const jitter = (rng() - 0.5) * 0.08;
    const rate = Math.round((ft.baseRate + jitter) * 10000) / 10000;
    const change1d = Math.round((rng() - 0.5) * 5 * 10) / 10;

    return {
      tenor: ft.tenor,
      rate,
      change1d,
      impliedFromSwapCurve: true,
    };
  });
}

function generateSwapSpreadsToTreasury(rng: () => number, curves: SwapCurveEntry[]): SwapSpreadEntry[] {
  const usdCurve = curves.find((c) => c.currency === 'USD');
  if (!usdCurve) return [];

  // Treasury yields slightly above swap rates for short end (negative swap spread),
  // converging at long end
  const spreadConfigs: { tenor: string; baseTreasuryOffset: number }[] = [
    { tenor: '2Y', baseTreasuryOffset: 0.085 },   // Treasury ~8.5bps above swap
    { tenor: '3Y', baseTreasuryOffset: 0.065 },
    { tenor: '5Y', baseTreasuryOffset: 0.042 },
    { tenor: '7Y', baseTreasuryOffset: 0.025 },
    { tenor: '10Y', baseTreasuryOffset: 0.008 },
    { tenor: '15Y', baseTreasuryOffset: -0.012 },
    { tenor: '20Y', baseTreasuryOffset: -0.035 },
    { tenor: '25Y', baseTreasuryOffset: -0.058 },
    { tenor: '30Y', baseTreasuryOffset: -0.085 },
  ];

  return spreadConfigs.map((sc) => {
    const curvePoint = usdCurve.points.find((p) => p.tenor === sc.tenor);
    const swapRate = curvePoint?.mid ?? 3.80;
    const treasuryJitter = (rng() - 0.5) * 0.03;
    const treasuryYield = Math.round((swapRate + sc.baseTreasuryOffset + treasuryJitter) * 10000) / 10000;
    const swapSpreadBps = Math.round((swapRate - treasuryYield) * 10000) / 10;
    const change1d = Math.round((rng() - 0.5) * 3 * 10) / 10;

    return {
      tenor: sc.tenor,
      swapRate,
      treasuryYield,
      swapSpreadBps,
      change1d,
    };
  });
}

function generateBasisSwaps(rng: () => number): BasisSwapEntry[] {
  const basisTenors = ['2Y', '5Y', '10Y', '30Y'];

  const basisConfigs: { name: string; baseSpread: number; tenorSlope: number; volatility: number }[] = [
    { name: '3M vs 6M SOFR', baseSpread: 4.5, tenorSlope: 0.8, volatility: 1.5 },
    { name: 'SOFR vs Fed Funds', baseSpread: -0.6, tenorSlope: -0.3, volatility: 1.2 },
    { name: 'SOFR vs EURIBOR xccy', baseSpread: -14.5, tenorSlope: -2.0, volatility: 3.5 },
  ];

  return basisConfigs.map((cfg) => {
    const tenors = basisTenors.map((tenor) => {
      const years = TENOR_YEARS[tenor];
      const tenorAdj = (years / 10) * cfg.tenorSlope;
      const jitter = (rng() - 0.5) * cfg.volatility * 2;
      const spread = Math.round((cfg.baseSpread + tenorAdj + jitter) * 10) / 10;
      const change1d = Math.round((rng() - 0.5) * cfg.volatility * 10) / 10;
      return { tenor, spread, change1d };
    });

    return { name: cfg.name, tenors };
  });
}

function generateRiskSensitivities(rng: () => number, curves: SwapCurveEntry[]): RiskSensitivities {
  const usdCurve = curves.find((c) => c.currency === 'USD');
  const swap10YRate = usdCurve?.points.find((p) => p.tenor === '10Y')?.mid ?? 3.80;

  // DV01 per tenor bucket for a 100M 10Y pay-fixed swap
  const notional = 100_000_000;
  const buckets = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'];

  // Key rate DV01 concentrated around the 10Y bucket
  const dv01Weights: Record<string, number> = {
    '1Y': 0.02, '2Y': 0.04, '3Y': 0.06, '5Y': 0.12, '7Y': 0.18,
    '10Y': 0.35, '15Y': 0.12, '20Y': 0.06, '25Y': 0.03, '30Y': 0.02,
  };

  const totalDV01Base = notional * 10 * 0.0001; // ~100,000 for 100M 10Y
  const totalDV01 = Math.round(totalDV01Base * (0.90 + rng() * 0.20));

  const dv01PerBucket = buckets.map((tenor) => {
    const weight = dv01Weights[tenor] ?? 0.05;
    const dv01 = Math.round(totalDV01 * weight * (0.85 + rng() * 0.30));
    return { tenor, dv01 };
  });

  // Gamma (convexity) - second order sensitivity, typically small
  // For a 10Y swap, gamma ~ 0.5-2.0 per bp^2 per $100M
  const gamma = Math.round((0.8 + rng() * 1.2) * 100) / 100;

  // Theta (time decay) - daily P&L from time passage
  // For a 10Y pay-fixed swap at market rate, theta is small
  const theta = Math.round(((rng() - 0.5) * 15000 + 2500) * 100) / 100;

  return {
    swapDescription: `USD ${(notional / 1_000_000).toFixed(0)}MM 10Y Pay Fixed @ ${swap10YRate.toFixed(4)}%`,
    notional,
    dv01PerBucket,
    totalDV01,
    gamma,
    theta,
  };
}

function generateSwapPricingData(): SwapPricingResponse {
  const rng = seededRandom('swap-pricing');

  const swapCurves = generateSwapCurves(rng);
  const sampleSwaps = generateSampleSwaps(rng, swapCurves);
  const forwardRates = generateForwardRates(rng, swapCurves);
  const swapSpreadsToTreasury = generateSwapSpreadsToTreasury(rng, swapCurves);
  const basisSwaps = generateBasisSwaps(rng);
  const riskSensitivities = generateRiskSensitivities(rng, swapCurves);

  return {
    swapCurves,
    sampleSwaps,
    forwardRates,
    swapSpreadsToTreasury,
    basisSwaps,
    riskSensitivities,
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

    const data = generateSwapPricingData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SwapPricing] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate swap pricing data' });
  }
});

export default router;
