import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Data Generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-liquidity-dashboard'));

  const jitter = (base: number, spread: number) => base + (rng() - 0.5) * 2 * spread;
  const round = (v: number, decimals = 2) => Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // ── Central Bank Balance Sheets ──

  const CB_DEFS = [
    { name: 'Fed',  totalAssets: 7.4,  reserves: 3250, rrp: 450 },
    { name: 'ECB',  totalAssets: 6.5,  reserves: 2800, rrp: 320 },
    { name: 'BOJ',  totalAssets: 5.1,  reserves: 4100, rrp: 180 },
    { name: 'BOE',  totalAssets: 1.1,  reserves: 850,  rrp: 95 },
    { name: 'PBOC', totalAssets: 5.9,  reserves: 3400, rrp: 510 },
  ] as const;

  const centralBankBalanceSheets = CB_DEFS.map(cb => {
    const totalAssets = round(jitter(cb.totalAssets, cb.totalAssets * 0.04));
    const changeMoM = round(jitter(0, 40), 1);
    const changeYoY = round(jitter(0, 6), 1);
    const reserves = round(jitter(cb.reserves, cb.reserves * 0.06), 1);
    const rrpUsage = round(Math.max(0, jitter(cb.rrp, cb.rrp * 0.25)), 1);
    return {
      name: cb.name,
      totalAssetsTrn: totalAssets,
      changeMoMBln: changeMoM,
      changeYoYPct: changeYoY,
      reservesBln: reserves,
      rrpUsageBln: rrpUsage,
    };
  });

  // ── Money Supply ──

  const MS_DEFS = [
    { country: 'US',       m1: 18.2, m2: 21.4, m2Growth: 3.8, creditGrowth: 2.1 },
    { country: 'Eurozone', m1: 9.8,  m2: 16.8, m2Growth: 1.2, creditGrowth: 0.8 },
    { country: 'Japan',    m1: 7.6,  m2: 10.2, m2Growth: 2.4, creditGrowth: 1.5 },
    { country: 'UK',       m1: 2.4,  m2: 3.8,  m2Growth: 0.9, creditGrowth: 0.6 },
    { country: 'China',    m1: 22.1, m2: 42.3, m2Growth: 8.7, creditGrowth: 9.2 },
  ] as const;

  const moneySupply = MS_DEFS.map(ms => ({
    country: ms.country,
    m1Trn: round(jitter(ms.m1, ms.m1 * 0.03)),
    m2Trn: round(jitter(ms.m2, ms.m2 * 0.03)),
    m2YoYGrowthPct: round(jitter(ms.m2Growth, 1.2), 1),
    creditGrowthPct: round(jitter(ms.creditGrowth, 0.8), 1),
  }));

  // ── US Liquidity Metrics ──

  const fedBS = round(jitter(7.4, 0.25));
  const tga = round(jitter(720, 80), 1);
  const rrp = round(jitter(450, 120), 1);
  const bankReserves = round(jitter(3250, 200), 1);
  const netLiquidity = round(fedBS - tga / 1000 - rrp / 1000);

  const usLiquidityMetrics = {
    fedBalanceSheetTrn: fedBS,
    tgaBalanceBln: tga,
    rrpFacilityBln: rrp,
    bankReservesBln: bankReserves,
    netLiquidityTrn: netLiquidity,
    change1WBln: round(jitter(0, 35), 1),
    change1MBln: round(jitter(0, 80), 1),
  };

  // ── Funding Stress Indicators ──

  const sofrFFSpread = round(jitter(-2, 3), 1);
  const fraOISSpread = round(jitter(8, 4), 1);
  const cpOISSpread = round(jitter(12, 5), 1);
  const mmfAUM = round(jitter(5.8, 0.25));

  const fundingStressIndicators = {
    sofrFFSpreadBps: sofrFFSpread,
    fraOISSpreadBps: fraOISSpread,
    crossCurrencyBasisBps: {
      EUR: round(jitter(-18, 6), 1),
      JPY: round(jitter(-45, 10), 1),
      GBP: round(jitter(-12, 5), 1),
    },
    cpOISSpreadBps: cpOISSpread,
    mmfAUMTrn: mmfAUM,
  };

  // ── Liquidity Conditions ──

  const SIGNALS = ['EASY', 'NEUTRAL', 'TIGHT'] as const;

  const CONDITIONS_DEFS = [
    { indicator: 'Net Liquidity',              baseCurrent: 6.1,  base1M: 5.95, base3M: 5.8 },
    { indicator: 'Excess Reserves',            baseCurrent: 3.25, base1M: 3.18, base3M: 3.05 },
    { indicator: 'M2 Growth',                  baseCurrent: 3.8,  base1M: 3.5,  base3M: 2.9 },
    { indicator: 'Credit Impulse',             baseCurrent: 1.2,  base1M: 0.8,  base3M: 0.3 },
    { indicator: 'Financial Conditions Index', baseCurrent: 99.5, base1M: 99.2, base3M: 98.8 },
  ] as const;

  const liquidityConditions = CONDITIONS_DEFS.map(cd => {
    const current = round(jitter(cd.baseCurrent, cd.baseCurrent * 0.05));
    const oneMAgo = round(jitter(cd.base1M, cd.base1M * 0.04));
    const threeMAgo = round(jitter(cd.base3M, cd.base3M * 0.04));
    const signal = pick(SIGNALS);
    return {
      indicator: cd.indicator,
      current,
      oneMonthAgo: oneMAgo,
      threeMonthsAgo: threeMAgo,
      signal,
    };
  });

  return {
    centralBankBalanceSheets,
    moneySupply,
    usLiquidityMetrics,
    fundingStressIndicators,
    liquidityConditions,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LiquidityDashboard] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate liquidity dashboard data' });
  }
});

export default router;
