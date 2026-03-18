import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Data Generation ──

function generate() {
  const seed = hashSeed('money-market-monitor-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);

  const jitter = (base: number, spread: number) => base + (rng() - 0.5) * 2 * spread;
  const round = (v: number, decimals = 3) => Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);

  // ── Key Rates ──

  const fedFundsEffective = round(jitter(5.33, 0.02));
  const fedFundsTargetUpper = 5.50;
  const fedFundsTargetLower = 5.25;

  const keyRates = [
    {
      name: 'Federal Funds Effective',
      id: 'EFFR',
      rate: fedFundsEffective,
      change1d: round(jitter(0, 0.005)),
      change1w: round(jitter(0, 0.01)),
    },
    {
      name: 'Fed Funds Target Upper',
      id: 'FF_UPPER',
      rate: fedFundsTargetUpper,
      change1d: 0,
      change1w: 0,
    },
    {
      name: 'Fed Funds Target Lower',
      id: 'FF_LOWER',
      rate: fedFundsTargetLower,
      change1d: 0,
      change1w: 0,
    },
    {
      name: 'SOFR',
      id: 'SOFR',
      rate: round(jitter(5.31, 0.015)),
      change1d: round(jitter(0, 0.004)),
      change1w: round(jitter(0, 0.008)),
      volume: round(jitter(2050, 150), 1),
    },
    {
      name: 'OBFR',
      id: 'OBFR',
      rate: round(jitter(5.32, 0.01)),
      change1d: round(jitter(0, 0.003)),
      change1w: round(jitter(0, 0.007)),
    },
    {
      name: 'TGCR',
      id: 'TGCR',
      rate: round(jitter(5.29, 0.015)),
      change1d: round(jitter(0, 0.004)),
      change1w: round(jitter(0, 0.009)),
    },
    {
      name: 'BGCR',
      id: 'BGCR',
      rate: round(jitter(5.30, 0.015)),
      change1d: round(jitter(0, 0.004)),
      change1w: round(jitter(0, 0.008)),
    },
    {
      name: 'EFFR',
      id: 'EFFR_DUP',
      rate: fedFundsEffective,
      change1d: round(jitter(0, 0.003)),
      change1w: round(jitter(0, 0.006)),
    },
    {
      name: 'Prime Rate',
      id: 'PRIME',
      rate: round(jitter(8.50, 0.0)),
      change1d: 0,
      change1w: 0,
    },
    {
      name: 'Discount Rate',
      id: 'DISCOUNT',
      rate: round(jitter(5.50, 0.0)),
      change1d: 0,
      change1w: 0,
    },
  ];

  // ── Repo Market ──

  const repoMarket = {
    overnightRepoRate: round(jitter(5.31, 0.02)),
    termRepo: {
      '1w': round(jitter(5.31, 0.015)),
      '2w': round(jitter(5.30, 0.015)),
      '1m': round(jitter(5.29, 0.02)),
      '3m': round(jitter(5.27, 0.025)),
    },
    triPartyRepoRate: round(jitter(5.30, 0.015)),
    gcRepoRate: round(jitter(5.29, 0.02)),
    bilateralRepoRate: round(jitter(5.32, 0.02)),
    onRRP: {
      rate: 5.30,
      volume: round(jitter(450, 80), 1),
    },
    standingRepoFacility: {
      usage: round(jitter(2.5, 1.5), 1),
      rate: 5.50,
    },
  };

  // ── Commercial Paper ──

  const cpTenors = ['1d', '7d', '15d', '30d', '60d', '90d'];
  const cpBaseRates = [5.32, 5.30, 5.28, 5.25, 5.20, 5.15];

  const aaFinancialCP = cpTenors.map((tenor, i) => ({
    tenor,
    rate: round(jitter(cpBaseRates[i], 0.02), 2),
  }));

  const aaNonfinancialCP = cpTenors.map((tenor, i) => ({
    tenor,
    rate: round(jitter(cpBaseRates[i] + 0.05, 0.02), 2),
  }));

  const a2p2SpreadToAA = cpTenors.map((tenor, i) => ({
    tenor,
    spread: round(jitter(15 + i * 2, 3), 1),
  }));

  const abcpRates = cpTenors.map((tenor, i) => ({
    tenor,
    rate: round(jitter(cpBaseRates[i] + 0.03, 0.015), 2),
  }));

  const commercialPaper = {
    aaFinancialCP,
    aaNonfinancialCP,
    a2p2SpreadToAA,
    abcpRates,
    totalOutstanding: round(jitter(1180, 50), 1),
  };

  // ── Treasury Bills ──

  const tbillTenors = [
    { label: '4W', base: 5.28 },
    { label: '8W', base: 5.26 },
    { label: '13W', base: 5.22 },
    { label: '17W', base: 5.18 },
    { label: '26W', base: 5.10 },
    { label: '52W', base: 4.92 },
  ];

  const treasuryBills = {
    yields: tbillTenors.map(t => ({
      tenor: t.label,
      yield: round(jitter(t.base, 0.03), 2),
      change1d: round(jitter(0, 0.015), 2),
      change1w: round(jitter(0, 0.03), 2),
    })),
    recentAuctions: [
      {
        tenor: '4W',
        size: round(jitter(80, 5), 1),
        bidToCover: round(jitter(2.85, 0.15), 2),
        tail: round(jitter(0.2, 0.15), 2),
        highRate: round(jitter(5.28, 0.02), 3),
      },
      {
        tenor: '8W',
        size: round(jitter(75, 5), 1),
        bidToCover: round(jitter(2.78, 0.15), 2),
        tail: round(jitter(0.3, 0.2), 2),
        highRate: round(jitter(5.26, 0.02), 3),
      },
      {
        tenor: '13W',
        size: round(jitter(70, 5), 1),
        bidToCover: round(jitter(2.92, 0.15), 2),
        tail: round(jitter(0.1, 0.1), 2),
        highRate: round(jitter(5.22, 0.025), 3),
      },
      {
        tenor: '26W',
        size: round(jitter(60, 5), 1),
        bidToCover: round(jitter(2.70, 0.12), 2),
        tail: round(jitter(0.4, 0.2), 2),
        highRate: round(jitter(5.10, 0.03), 3),
      },
      {
        tenor: '52W',
        size: round(jitter(50, 5), 1),
        bidToCover: round(jitter(2.65, 0.1), 2),
        tail: round(jitter(0.5, 0.25), 2),
        highRate: round(jitter(4.92, 0.03), 3),
      },
    ],
    discountVsBondEquivalent: tbillTenors.map(t => {
      const bondEqYield = round(jitter(t.base, 0.02), 3);
      const discountYield = round(bondEqYield - jitter(0.08, 0.02), 3);
      return {
        tenor: t.label,
        bondEquivalentYield: bondEqYield,
        discountYield,
        spread: round(bondEqYield - discountYield, 3),
      };
    }),
  };

  // ── Spreads ──

  const spreads = {
    tedSpread: round(jitter(22, 5), 1),
    liborOIS: round(jitter(12, 3), 1),
    fraOIS: round(jitter(8, 2.5), 1),
    crossCurrencyBasis: {
      EUR: round(jitter(-18, 5), 1),
      JPY: round(jitter(-45, 8), 1),
      GBP: round(jitter(-12, 4), 1),
    },
    cpTBillSpread: round(jitter(10, 3), 1),
  };

  // ── Money Market Funds ──

  const totalGovtAUM = round(jitter(4.25, 0.15), 2);
  const totalPrimeAUM = round(jitter(0.82, 0.05), 2);
  const totalAUM = round(totalGovtAUM + totalPrimeAUM + jitter(0.35, 0.05), 2);

  const moneyMarketFunds = {
    totalAUM,
    govtFundAUM: totalGovtAUM,
    primeFundAUM: totalPrimeAUM,
    wam: Math.round(jitter(28, 8)),
    wal: Math.round(jitter(48, 12)),
    netYields: {
      govt: round(jitter(5.15, 0.05), 2),
      prime: round(jitter(5.25, 0.05), 2),
      treasury: round(jitter(5.10, 0.05), 2),
      municipal: round(jitter(3.40, 0.1), 2),
    },
    weeklyFlows: {
      govt: round(jitter(5.2, 12), 1),
      prime: round(jitter(-1.8, 5), 1),
      total: round(jitter(3.5, 15), 1),
    },
  };

  return {
    keyRates,
    repoMarket,
    commercialPaper,
    treasuryBills,
    spreads,
    moneyMarketFunds,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[MoneyMarketMonitor] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate money market monitor data' });
  }
});

export default router;
