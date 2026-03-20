import { Router } from 'express';

const router = Router();

// ── Deterministic PRNG ──

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

// ── Types ──

interface OvernightRate {
  name: string;
  rate: number;
  change: number;
  avg30d: number;
  avg90d: number;
}

interface RepoRate {
  tenor: string;
  rate: number;
  volume: number;
  collateralType: string;
}

interface CommercialPaperTier {
  name: string;
  overnight: number;
  day7: number;
  day30: number;
  day90: number;
  outstandingVolume: number;
}

interface TBill {
  tenor: string;
  yield: number;
  discountRate: number;
  pricePerHundred: number;
  auctionSize: number;
}

interface MoneyMarketFund {
  type: string;
  totalAUM: number;
  weeklyFlow: number;
  yield7day: number;
  weightedAvgMaturity: number;
}

interface FedFundsTarget {
  lower: number;
  upper: number;
  effectiveRate: number;
  nextHikeProbability: number;
  nextCutProbability: number;
}

interface MoneyMarketData {
  overnightRates: OvernightRate[];
  repoRates: RepoRate[];
  commercialPaper: CommercialPaperTier[];
  tBills: TBill[];
  moneyMarketFunds: MoneyMarketFund[];
  fedFundsTarget: FedFundsTarget;
  timestamp: string;
}

// ── Cache (5-minute TTL) ──

let cacheData: MoneyMarketData | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60_000;

// ── Data generation ──

function generateMoneyMarketData(): MoneyMarketData {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed(today);
  const rand = mulberry32(seed);

  // Helper: jitter a base value by up to +/- range
  const jitter = (base: number, range: number): number =>
    Math.round((base + (rand() - 0.5) * 2 * range) * 10000) / 10000;

  // Helper: round to 2 decimal places
  const r2 = (v: number): number => Math.round(v * 100) / 100;

  // Helper: round to 4 decimal places
  const r4 = (v: number): number => Math.round(v * 10000) / 10000;

  // Fed funds target range: 5.25 - 5.50%
  const fedLower = 5.25;
  const fedUpper = 5.50;
  const effRate = r4(jitter(5.33, 0.02));

  // ── Overnight Rates ──
  const overnightRates: OvernightRate[] = [
    {
      name: 'SOFR',
      rate: r4(jitter(5.31, 0.03)),
      change: r2((rand() - 0.5) * 4),
      avg30d: r4(jitter(5.31, 0.01)),
      avg90d: r4(jitter(5.30, 0.01)),
    },
    {
      name: 'EFFR',
      rate: r4(jitter(5.33, 0.01)),
      change: r2((rand() - 0.5) * 2),
      avg30d: r4(jitter(5.33, 0.005)),
      avg90d: r4(jitter(5.33, 0.005)),
    },
    {
      name: 'OBFR',
      rate: r4(jitter(5.32, 0.02)),
      change: r2((rand() - 0.5) * 3),
      avg30d: r4(jitter(5.32, 0.01)),
      avg90d: r4(jitter(5.31, 0.01)),
    },
    {
      name: 'TGCR',
      rate: r4(jitter(5.29, 0.03)),
      change: r2((rand() - 0.5) * 4),
      avg30d: r4(jitter(5.29, 0.01)),
      avg90d: r4(jitter(5.28, 0.01)),
    },
    {
      name: 'BGCR',
      rate: r4(jitter(5.30, 0.03)),
      change: r2((rand() - 0.5) * 4),
      avg30d: r4(jitter(5.30, 0.01)),
      avg90d: r4(jitter(5.29, 0.01)),
    },
  ];

  // ── Repo Rates ──
  const repoRates: RepoRate[] = [
    {
      tenor: 'Overnight',
      rate: r4(jitter(5.31, 0.03)),
      volume: r2(jitter(2150, 200)),
      collateralType: 'Treasury',
    },
    {
      tenor: 'Overnight',
      rate: r4(jitter(5.33, 0.03)),
      volume: r2(jitter(480, 60)),
      collateralType: 'Agency',
    },
    {
      tenor: 'Overnight',
      rate: r4(jitter(5.36, 0.04)),
      volume: r2(jitter(320, 50)),
      collateralType: 'MBS',
    },
    {
      tenor: '1W',
      rate: r4(jitter(5.32, 0.03)),
      volume: r2(jitter(180, 30)),
      collateralType: 'Treasury',
    },
    {
      tenor: '2W',
      rate: r4(jitter(5.33, 0.03)),
      volume: r2(jitter(95, 20)),
      collateralType: 'Treasury',
    },
    {
      tenor: '1M',
      rate: r4(jitter(5.34, 0.04)),
      volume: r2(jitter(120, 25)),
      collateralType: 'Treasury',
    },
    {
      tenor: '3M',
      rate: r4(jitter(5.36, 0.05)),
      volume: r2(jitter(75, 15)),
      collateralType: 'Treasury',
    },
    {
      tenor: '1W',
      rate: r4(jitter(5.35, 0.03)),
      volume: r2(jitter(65, 15)),
      collateralType: 'Agency',
    },
    {
      tenor: '1M',
      rate: r4(jitter(5.37, 0.04)),
      volume: r2(jitter(45, 10)),
      collateralType: 'Agency',
    },
    {
      tenor: '1W',
      rate: r4(jitter(5.38, 0.04)),
      volume: r2(jitter(40, 10)),
      collateralType: 'MBS',
    },
    {
      tenor: '1M',
      rate: r4(jitter(5.40, 0.05)),
      volume: r2(jitter(28, 8)),
      collateralType: 'MBS',
    },
  ];

  // ── Commercial Paper ──
  const commercialPaper: CommercialPaperTier[] = [
    {
      name: 'AA Financial',
      overnight: r4(jitter(5.32, 0.03)),
      day7: r4(jitter(5.33, 0.03)),
      day30: r4(jitter(5.36, 0.04)),
      day90: r4(jitter(5.38, 0.05)),
      outstandingVolume: r2(jitter(285, 30)),
    },
    {
      name: 'AA Nonfinancial',
      overnight: r4(jitter(5.30, 0.03)),
      day7: r4(jitter(5.31, 0.03)),
      day30: r4(jitter(5.33, 0.04)),
      day90: r4(jitter(5.35, 0.05)),
      outstandingVolume: r2(jitter(175, 25)),
    },
    {
      name: 'A2/P2',
      overnight: r4(jitter(5.45, 0.05)),
      day7: r4(jitter(5.48, 0.05)),
      day30: r4(jitter(5.55, 0.06)),
      day90: r4(jitter(5.65, 0.08)),
      outstandingVolume: r2(jitter(92, 15)),
    },
  ];

  // ── T-Bills ──
  const tBillConfigs: { tenor: string; baseYield: number; days: number; auctionBase: number }[] = [
    { tenor: '4W', baseYield: 5.28, days: 28, auctionBase: 80 },
    { tenor: '8W', baseYield: 5.27, days: 56, auctionBase: 80 },
    { tenor: '13W', baseYield: 5.25, days: 91, auctionBase: 75 },
    { tenor: '17W', baseYield: 5.23, days: 119, auctionBase: 60 },
    { tenor: '26W', baseYield: 5.18, days: 182, auctionBase: 65 },
    { tenor: '52W', baseYield: 5.02, days: 364, auctionBase: 50 },
  ];

  const tBills: TBill[] = tBillConfigs.map((cfg) => {
    const yld = r4(jitter(cfg.baseYield, 0.05));
    // Discount rate is slightly lower than yield for T-bills
    const discountRate = r4(yld - (yld * yld * cfg.days) / (36000 + yld * cfg.days));
    // Price per $100 face value: P = 100 * (1 - discount_rate * days / 360)
    const pricePerHundred = r4(100 * (1 - discountRate / 100 * cfg.days / 360));
    const auctionSize = r2(jitter(cfg.auctionBase, 10));
    return {
      tenor: cfg.tenor,
      yield: yld,
      discountRate,
      pricePerHundred,
      auctionSize,
    };
  });

  // ── Money Market Funds ──
  const moneyMarketFunds: MoneyMarketFund[] = [
    {
      type: 'Government',
      totalAUM: r4(jitter(4.52, 0.15)),
      weeklyFlow: r2(jitter(12.5, 20)),
      yield7day: r4(jitter(5.22, 0.05)),
      weightedAvgMaturity: Math.round(jitter(25, 8)),
    },
    {
      type: 'Prime',
      totalAUM: r4(jitter(1.08, 0.08)),
      weeklyFlow: r2(jitter(3.2, 8)),
      yield7day: r4(jitter(5.35, 0.05)),
      weightedAvgMaturity: Math.round(jitter(32, 10)),
    },
    {
      type: 'Tax-Exempt',
      totalAUM: r4(jitter(0.13, 0.02)),
      weeklyFlow: r2(jitter(0.5, 2)),
      yield7day: r4(jitter(3.45, 0.15)),
      weightedAvgMaturity: Math.round(jitter(18, 6)),
    },
  ];

  // ── Fed Funds Target ──
  const nextHikeProb = r2(jitter(5, 4));
  const nextCutProb = r2(jitter(35, 15));
  const fedFundsTarget: FedFundsTarget = {
    lower: fedLower,
    upper: fedUpper,
    effectiveRate: effRate,
    nextHikeProbability: Math.max(0, Math.min(100, nextHikeProb)),
    nextCutProbability: Math.max(0, Math.min(100, nextCutProb)),
  };

  return {
    overnightRates,
    repoRates,
    commercialPaper,
    tBills,
    moneyMarketFunds,
    fedFundsTarget,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now < cacheTime + CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generateMoneyMarketData();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MoneyMarket] Error:', message);
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate money market data' });
  }
});

export default router;
