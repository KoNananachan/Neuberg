import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();

let cache: { data: unknown; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// -- Seed Data --

interface EconomyDef {
  country: string;
  code: string;
  currency: string;
  m1Velocity: number;
  m2Velocity: number;
  m0: number;
  m1: number;
  m2: number;
  m3: number;
  cbSize: number;
  cbPctGDP: number;
  cpi: number;
  ppi: number;
  moneyMultiplier: number;
  reserveRatio: number;
  excessReserves: number;
  creditTotal: number;
  creditHousehold: number;
  creditCorporate: number;
  creditGov: number;
}

const ECONOMY_DEFS: EconomyDef[] = [
  {
    country: 'United States', code: 'US', currency: 'USD',
    m1Velocity: 1.28, m2Velocity: 1.12,
    m0: 5.52, m1: 18.4, m2: 21.6, m3: 23.8,
    cbSize: 7.2, cbPctGDP: 25.8, cpi: 2.8, ppi: 1.9,
    moneyMultiplier: 3.92, reserveRatio: 0.10, excessReserves: 3.15,
    creditTotal: 4.2, creditHousehold: 3.1, creditCorporate: 4.8, creditGov: 6.5,
  },
  {
    country: 'Eurozone', code: 'EZ', currency: 'EUR',
    m1Velocity: 1.08, m2Velocity: 0.94,
    m0: 4.82, m1: 10.2, m2: 16.4, m3: 17.1,
    cbSize: 6.3, cbPctGDP: 42.6, cpi: 2.3, ppi: 0.8,
    moneyMultiplier: 3.41, reserveRatio: 0.01, excessReserves: 3.68,
    creditTotal: 2.1, creditHousehold: 1.8, creditCorporate: 2.4, creditGov: 3.2,
  },
  {
    country: 'United Kingdom', code: 'GB', currency: 'GBP',
    m1Velocity: 1.15, m2Velocity: 0.98,
    m0: 0.92, m1: 2.18, m2: 3.72, m3: 3.95,
    cbSize: 1.05, cbPctGDP: 32.4, cpi: 2.6, ppi: 1.4,
    moneyMultiplier: 4.05, reserveRatio: 0.10, excessReserves: 0.82,
    creditTotal: 3.5, creditHousehold: 2.9, creditCorporate: 3.8, creditGov: 5.1,
  },
  {
    country: 'Japan', code: 'JP', currency: 'JPY',
    m1Velocity: 0.56, m2Velocity: 0.52,
    m0: 5.85, m1: 7.62, m2: 10.4, m3: 11.8,
    cbSize: 4.95, cbPctGDP: 124.5, cpi: 2.1, ppi: 0.6,
    moneyMultiplier: 1.78, reserveRatio: 0.008, excessReserves: 4.92,
    creditTotal: 2.8, creditHousehold: 2.0, creditCorporate: 3.2, creditGov: 4.1,
  },
  {
    country: 'China', code: 'CN', currency: 'CNY',
    m1Velocity: 0.82, m2Velocity: 0.48,
    m0: 1.62, m1: 8.94, m2: 42.8, m3: 46.2,
    cbSize: 5.85, cbPctGDP: 32.1, cpi: 0.4, ppi: -1.2,
    moneyMultiplier: 7.84, reserveRatio: 0.095, excessReserves: 2.18,
    creditTotal: 9.6, creditHousehold: 6.2, creditCorporate: 11.4, creditGov: 8.8,
  },
  {
    country: 'Canada', code: 'CA', currency: 'CAD',
    m1Velocity: 1.22, m2Velocity: 0.88,
    m0: 0.12, m1: 0.58, m2: 2.24, m3: 2.45,
    cbSize: 0.26, cbPctGDP: 12.8, cpi: 2.4, ppi: 1.1,
    moneyMultiplier: 4.82, reserveRatio: 0.0, excessReserves: 0.21,
    creditTotal: 5.4, creditHousehold: 4.8, creditCorporate: 5.2, creditGov: 3.9,
  },
];

const TRENDS = ['accelerating', 'decelerating', 'stable'] as const;
const REGIMES = ['expanding', 'contracting', 'neutral'] as const;
const GLOBAL_TRENDS = ['expanding', 'stable', 'contracting'] as const;
const MONEY_GROWTH_LAGS = [
  '12-18 months', '18-24 months', '6-12 months', '15-21 months',
] as const;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-money-velocity'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const jitterAbs = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;
  const roundTo = (v: number, d: number) => {
    const f = 10 ** d;
    return Math.round(v * f) / f;
  };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  const economies = ECONOMY_DEFS.map((e) => {
    const m1Vel = roundTo(jitter(e.m1Velocity, 0.06), 2);
    const m2Vel = roundTo(jitter(e.m2Velocity, 0.06), 2);
    const m1VelChange = roundTo(jitterAbs(0, 0.08), 2);
    const m2VelChange = roundTo(jitterAbs(0, 0.06), 2);

    // Money supply aggregates
    const m0Val = roundTo(jitter(e.m0, 0.05), 2);
    const m1Val = roundTo(jitter(e.m1, 0.04), 2);
    const m2Val = roundTo(jitter(e.m2, 0.04), 2);
    const m3Val = roundTo(jitter(e.m3, 0.04), 2);

    const makeSupply = (base: number, val: number) => ({
      value: val,
      yoyGrowth: roundTo(jitterAbs(base > 10 ? 5.2 : 3.8, 3.0), 1),
      momGrowth: roundTo(jitterAbs(0.3, 0.5), 2),
    });

    // Central bank balance sheet
    const cbSz = roundTo(jitter(e.cbSize, 0.06), 2);
    const cbYtd = roundTo(jitterAbs(0, 0.4) * (rng() > 0.5 ? 1 : -1), 2);
    const cbPctGdp = roundTo(jitter(e.cbPctGDP, 0.04), 1);

    // Credit growth (YoY %)
    const creditTotal = roundTo(jitter(e.creditTotal, 0.15), 1);
    const creditHousehold = roundTo(jitter(e.creditHousehold, 0.15), 1);
    const creditCorporate = roundTo(jitter(e.creditCorporate, 0.15), 1);
    const creditGov = roundTo(jitter(e.creditGov, 0.15), 1);

    // Money multiplier and reserves
    const mm = roundTo(jitter(e.moneyMultiplier, 0.08), 2);
    const rr = roundTo(jitter(e.reserveRatio, 0.10), 4);
    const er = roundTo(jitter(e.excessReserves, 0.10), 2);

    // Inflation link
    const cpiLatest = roundTo(jitter(e.cpi, 0.12), 1);
    const ppiLatest = roundTo(jitter(e.ppi, 0.20), 1);

    // Historical M2 velocity: last 8 quarters
    const historicalVelocity: { quarter: string; m2Velocity: number }[] = [];
    const baseYear = 2026;
    let prevVel = e.m2Velocity * (1 - 0.04);
    for (let q = 0; q < 8; q++) {
      const qYear = baseYear - Math.floor((7 - q) / 4);
      const qNum = ((7 - q) % 4) + 1;
      const adjustedQYear = baseYear - Math.floor((7 - q + 1) / 4);
      const adjustedQNum = 4 - ((7 - q) % 4);
      // Simpler quarter calculation
      const quarterIdx = q;
      const yr = 2024 + Math.floor(quarterIdx / 4);
      const qr = (quarterIdx % 4) + 1;
      const vel = roundTo(prevVel * (1 + (rng() - 0.45) * 0.06), 2);
      prevVel = vel;
      historicalVelocity.push({
        quarter: `${yr} Q${qr}`,
        m2Velocity: vel,
      });
    }

    // Regime indicator
    const regime = m2VelChange > 0.02
      ? 'expanding' as const
      : m2VelChange < -0.02
        ? 'contracting' as const
        : pick(REGIMES);

    return {
      country: e.country,
      code: e.code,
      currency: e.currency,
      velocity: {
        m1: m1Vel,
        m2: m2Vel,
        m1Change: m1VelChange,
        m2Change: m2VelChange,
        trend: pick(TRENDS),
      },
      moneySupply: {
        m0: makeSupply(e.m0, m0Val),
        m1: makeSupply(e.m1, m1Val),
        m2: makeSupply(e.m2, m2Val),
        m3: makeSupply(e.m3, m3Val),
      },
      centralBankBalance: {
        size: cbSz,
        changeYtd: cbYtd,
        pctOfGDP: cbPctGdp,
      },
      creditGrowth: {
        total: creditTotal,
        household: creditHousehold,
        corporate: creditCorporate,
        government: creditGov,
      },
      multiplier: {
        moneyMultiplier: mm,
        reserveRatio: rr,
        excessReserves: er,
      },
      inflationLink: {
        cpiLatest,
        ppiLatest,
        moneyGrowthLag: pick(MONEY_GROWTH_LAGS),
      },
      historicalVelocity,
      regimeIndicator: regime,
    };
  });

  // Global liquidity aggregation
  const totalM2Global = roundTo(
    economies.reduce((sum, e) => sum + e.moneySupply.m2.value, 0),
    1,
  );
  const avgM2Growth = roundTo(
    economies.reduce((sum, e) => sum + e.moneySupply.m2.yoyGrowth, 0) / economies.length,
    1,
  );

  const totalCBSheets = roundTo(
    economies.reduce((sum, e) => sum + e.centralBankBalance.size, 0),
    1,
  );

  const globalLiquidity = {
    totalM2Global,
    totalM2GlobalUnit: 'trillions USD',
    yoyChange: avgM2Growth,
    trend: pick(GLOBAL_TRENDS),
  };

  const quantitativeMetrics = {
    globalCBBalanceSheets: totalCBSheets,
    globalCBBalanceSheetsUnit: 'trillions USD',
    netLiquidity: roundTo(totalCBSheets * jitter(0.72, 0.08), 1),
    netLiquidityUnit: 'trillions USD',
    excessLiquidity: roundTo(
      economies.reduce((sum, e) => sum + e.multiplier.excessReserves, 0),
      1,
    ),
    excessLiquidityUnit: 'trillions USD',
  };

  return {
    economies,
    globalLiquidity,
    quantitativeMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MoneyVelocity] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate money velocity data' });
  }
});

export default router;
