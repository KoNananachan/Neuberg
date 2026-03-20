import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// --- Data Definitions ---

interface MostLentSecurity {
  ticker: string;
  name: string;
  onLoanQuantity: number;
  onLoanValueM: number;
  utilization: number;
  daysToCover: number;
  borrowCostBps: number;
  lendingRevenue: number;
  flag: 'Special' | 'GC';
}

interface HardToBorrowEntry {
  ticker: string;
  name: string;
  borrowCostBps: number;
  shortSqueezeRiskScore: number;
  availableInventory: number;
  daysOnHTBList: number;
}

interface LendingMarketSummary {
  totalOnLoanValueB: number;
  totalAvailableForLendingB: number;
  weightedAvgFeeBps: number;
  gcRateBps: number;
  specialRateAvgBps: number;
  utilizationRate: number;
  dailyLendingRevenue: number;
}

interface FeeTrendWeek {
  weekLabel: string;
  avgGcFeeBps: number;
  avgSpecialFeeBps: number;
  totalOnLoanValueB: number;
}

interface SectorUtilization {
  sector: string;
  utilization: number;
  avgBorrowCostBps: number;
  totalOnLoanValueM: number;
}

interface NewLoanActivity {
  borrowerType: 'Hedge Fund' | 'Broker-Dealer' | 'Bank';
  ticker: string;
  quantity: number;
  rateBps: number;
  termDays: number;
  collateralType: string;
}

// --- Universe ---

const MOST_LENT_UNIVERSE: { ticker: string; name: string; flag: 'Special' | 'GC'; baseBps: number; baseUtil: number; basePrice: number }[] = [
  { ticker: 'GME', name: 'GameStop Corp', flag: 'Special', baseBps: 2400, baseUtil: 94, basePrice: 22 },
  { ticker: 'AMC', name: 'AMC Entertainment', flag: 'Special', baseBps: 1850, baseUtil: 91, basePrice: 5 },
  { ticker: 'BBBY', name: 'Bed Bath & Beyond', flag: 'Special', baseBps: 3200, baseUtil: 97, basePrice: 0.15 },
  { ticker: 'CVNA', name: 'Carvana Co', flag: 'Special', baseBps: 1100, baseUtil: 85, basePrice: 180 },
  { ticker: 'RIVN', name: 'Rivian Automotive', flag: 'Special', baseBps: 620, baseUtil: 68, basePrice: 14 },
  { ticker: 'UPST', name: 'Upstart Holdings', flag: 'Special', baseBps: 780, baseUtil: 74, basePrice: 52 },
  { ticker: 'LCID', name: 'Lucid Group', flag: 'Special', baseBps: 540, baseUtil: 62, basePrice: 3 },
  { ticker: 'BYND', name: 'Beyond Meat', flag: 'Special', baseBps: 950, baseUtil: 80, basePrice: 7 },
  { ticker: 'MARA', name: 'Marathon Digital', flag: 'Special', baseBps: 420, baseUtil: 58, basePrice: 20 },
  { ticker: 'SMCI', name: 'Super Micro Computer', flag: 'Special', baseBps: 680, baseUtil: 72, basePrice: 40 },
  { ticker: 'TSLA', name: 'Tesla Inc', flag: 'GC', baseBps: 28, baseUtil: 18, basePrice: 250 },
  { ticker: 'AAPL', name: 'Apple Inc', flag: 'GC', baseBps: 8, baseUtil: 6, basePrice: 185 },
  { ticker: 'MSFT', name: 'Microsoft Corp', flag: 'GC', baseBps: 6, baseUtil: 5, basePrice: 415 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', flag: 'GC', baseBps: 15, baseUtil: 12, basePrice: 880 },
  { ticker: 'META', name: 'Meta Platforms', flag: 'GC', baseBps: 10, baseUtil: 8, basePrice: 500 },
  { ticker: 'AMZN', name: 'Amazon.com Inc', flag: 'GC', baseBps: 7, baseUtil: 5, basePrice: 180 },
  { ticker: 'GOOGL', name: 'Alphabet Inc', flag: 'GC', baseBps: 9, baseUtil: 7, basePrice: 155 },
  { ticker: 'NFLX', name: 'Netflix Inc', flag: 'GC', baseBps: 18, baseUtil: 14, basePrice: 620 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', flag: 'GC', baseBps: 22, baseUtil: 16, basePrice: 160 },
  { ticker: 'COIN', name: 'Coinbase Global', flag: 'GC', baseBps: 35, baseUtil: 25, basePrice: 220 },
];

const HTB_UNIVERSE: { ticker: string; name: string; baseBps: number }[] = [
  { ticker: 'GME', name: 'GameStop Corp', baseBps: 2400 },
  { ticker: 'BBBY', name: 'Bed Bath & Beyond', baseBps: 3200 },
  { ticker: 'AMC', name: 'AMC Entertainment', baseBps: 1850 },
  { ticker: 'CVNA', name: 'Carvana Co', baseBps: 1100 },
  { ticker: 'BYND', name: 'Beyond Meat', baseBps: 950 },
  { ticker: 'UPST', name: 'Upstart Holdings', baseBps: 780 },
  { ticker: 'SMCI', name: 'Super Micro Computer', baseBps: 680 },
  { ticker: 'RIVN', name: 'Rivian Automotive', baseBps: 620 },
  { ticker: 'LCID', name: 'Lucid Group', baseBps: 540 },
  { ticker: 'MARA', name: 'Marathon Digital', baseBps: 520 },
];

const SECTORS = ['Technology', 'Healthcare', 'Financials', 'Energy', 'Consumer', 'Industrial'];

const NEW_LOAN_TICKERS = [
  'GME', 'AMC', 'TSLA', 'RIVN', 'CVNA', 'UPST', 'SMCI', 'LCID', 'MARA',
  'BYND', 'BBBY', 'COIN', 'NVDA', 'META', 'AMD',
];

const COLLATERAL_TYPES = ['Cash', 'US Treasury', 'Agency MBS', 'Investment Grade Corp', 'Equity'];
const BORROWER_TYPES: ('Hedge Fund' | 'Broker-Dealer' | 'Bank')[] = ['Hedge Fund', 'Broker-Dealer', 'Bank'];

// --- Cache ---

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// --- Generator ---

function generate() {
  const rng = seededRandom('equity-lending');
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));

  // 1. Most Lent Securities (top 20)
  const mostLentSecurities: MostLentSecurity[] = MOST_LENT_UNIVERSE.map(s => {
    const borrowCostBps = Math.round(jitter(s.baseBps, 0.12));
    const utilization = Math.min(99.9, Math.max(1, Math.round(jitter(s.baseUtil, 0.08) * 10) / 10));
    const onLoanQuantity = Math.round(jitter(s.flag === 'Special' ? 8_000_000 : 25_000_000, 0.35));
    const onLoanValueM = Math.round(onLoanQuantity * jitter(s.basePrice, 0.05) / 1_000_000 * 100) / 100;
    const daysToCover = Math.round((0.5 + rng() * 9) * 10) / 10;
    const lendingRevenue = Math.round(onLoanValueM * 1_000_000 * (borrowCostBps / 10000) / 365);

    return {
      ticker: s.ticker,
      name: s.name,
      onLoanQuantity,
      onLoanValueM,
      utilization,
      daysToCover,
      borrowCostBps,
      lendingRevenue,
      flag: s.flag,
    };
  });

  // Sort by on-loan value descending
  mostLentSecurities.sort((a, b) => b.onLoanValueM - a.onLoanValueM);

  // 2. Hard-to-Borrow List (10 securities with extreme borrow costs >500bps)
  const hardToBorrowList: HardToBorrowEntry[] = HTB_UNIVERSE.map(s => {
    const borrowCostBps = Math.max(510, Math.round(jitter(s.baseBps, 0.15)));
    const shortSqueezeRiskScore = Math.round(Math.min(100, Math.max(10, (borrowCostBps / 40) + rng() * 20)));
    const availableInventory = Math.round(jitter(200_000, 0.5));
    const daysOnHTBList = Math.round(1 + rng() * 90);

    return {
      ticker: s.ticker,
      name: s.name,
      borrowCostBps,
      shortSqueezeRiskScore,
      availableInventory,
      daysOnHTBList,
    };
  });

  // Sort by borrow cost descending
  hardToBorrowList.sort((a, b) => b.borrowCostBps - a.borrowCostBps);

  // 3. Lending Market Summary
  const totalOnLoanValueB = Math.round(mostLentSecurities.reduce((acc, s) => acc + s.onLoanValueM, 0) / 1000 * 100) / 100;
  const totalAvailableForLendingB = Math.round(jitter(totalOnLoanValueB * 3.5, 0.1) * 100) / 100;
  const gcSecurities = mostLentSecurities.filter(s => s.flag === 'GC');
  const specialSecurities = mostLentSecurities.filter(s => s.flag === 'Special');

  const gcRateBps = Math.round(gcSecurities.reduce((acc, s) => acc + s.borrowCostBps, 0) / Math.max(1, gcSecurities.length));
  const specialRateAvgBps = Math.round(specialSecurities.reduce((acc, s) => acc + s.borrowCostBps, 0) / Math.max(1, specialSecurities.length));

  const totalWeightedFee = mostLentSecurities.reduce((acc, s) => acc + s.borrowCostBps * s.onLoanValueM, 0);
  const totalValueForWeight = mostLentSecurities.reduce((acc, s) => acc + s.onLoanValueM, 0);
  const weightedAvgFeeBps = Math.round(totalWeightedFee / Math.max(1, totalValueForWeight));

  const utilizationRate = Math.round(
    (totalOnLoanValueB / Math.max(0.01, totalAvailableForLendingB)) * 100 * 10
  ) / 10;

  const dailyLendingRevenue = Math.round(mostLentSecurities.reduce((acc, s) => acc + s.lendingRevenue, 0));

  const lendingMarketSummary: LendingMarketSummary = {
    totalOnLoanValueB,
    totalAvailableForLendingB,
    weightedAvgFeeBps,
    gcRateBps,
    specialRateAvgBps,
    utilizationRate,
    dailyLendingRevenue,
  };

  // 4. Fee Trends (12 weekly data points)
  const feeTrends: FeeTrendWeek[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - i * 7);
    const weekLabel = weekDate.toISOString().slice(0, 10);
    const weekRng = mulberry32(hashSeed('fee-trend-' + weekLabel));

    const avgGcFeeBps = Math.round(jitter(gcRateBps, 0.2) + (weekRng() - 0.5) * 8);
    const avgSpecialFeeBps = Math.round(jitter(specialRateAvgBps, 0.15) + (weekRng() - 0.5) * 200);
    const totalOnLoanValueWeekB = Math.round(jitter(totalOnLoanValueB, 0.08) * 100) / 100;

    feeTrends.push({
      weekLabel,
      avgGcFeeBps: Math.max(1, avgGcFeeBps),
      avgSpecialFeeBps: Math.max(100, avgSpecialFeeBps),
      totalOnLoanValueB: totalOnLoanValueWeekB,
    });
  }

  // 5. Sector Utilization
  const sectorUtilization: SectorUtilization[] = SECTORS.map(sector => {
    const utilization = Math.round(jitter(sector === 'Technology' ? 35 : sector === 'Healthcare' ? 42 : sector === 'Financials' ? 28 : sector === 'Energy' ? 20 : sector === 'Consumer' ? 55 : 18, 0.15) * 10) / 10;
    const avgBorrowCostBps = Math.round(jitter(sector === 'Consumer' ? 450 : sector === 'Healthcare' ? 180 : sector === 'Technology' ? 120 : sector === 'Financials' ? 85 : sector === 'Energy' ? 60 : 45, 0.2));
    const totalOnLoanValueM = Math.round(jitter(sector === 'Technology' ? 3200 : sector === 'Healthcare' ? 1800 : sector === 'Financials' ? 2500 : sector === 'Energy' ? 1200 : sector === 'Consumer' ? 2800 : 900, 0.2));

    return { sector, utilization, avgBorrowCostBps, totalOnLoanValueM };
  });

  // 6. New Loan Activity (last 15)
  const newLoanActivity: NewLoanActivity[] = [];
  for (let i = 0; i < 15; i++) {
    const tickerIdx = Math.floor(rng() * NEW_LOAN_TICKERS.length);
    const borrowerIdx = Math.floor(rng() * BORROWER_TYPES.length);
    const collateralIdx = Math.floor(rng() * COLLATERAL_TYPES.length);
    const ticker = NEW_LOAN_TICKERS[tickerIdx];
    const isSpecial = ['GME', 'AMC', 'BBBY', 'CVNA', 'UPST', 'BYND', 'SMCI', 'LCID', 'MARA', 'RIVN'].includes(ticker);

    newLoanActivity.push({
      borrowerType: BORROWER_TYPES[borrowerIdx],
      ticker,
      quantity: Math.round(jitter(isSpecial ? 150_000 : 500_000, 0.5)),
      rateBps: Math.round(jitter(isSpecial ? 800 : 20, 0.3)),
      termDays: [1, 7, 14, 30, 60, 90][Math.floor(rng() * 6)],
      collateralType: COLLATERAL_TYPES[collateralIdx],
    });
  }

  return {
    mostLentSecurities,
    hardToBorrowList,
    lendingMarketSummary,
    feeTrends,
    sectorUtilization,
    newLoanActivity,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityLending] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity lending data' });
  }
});

export default router;
