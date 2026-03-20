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

interface HotStock {
  ticker: string;
  name: string;
  sector: string;
  borrowFee: number;
  utilization: number;
  shortInterest: number;
  daysToCover: number;
  availableShares: number;
  lendableValue: number;
  feeChange1d: number;
  feeChange1w: number;
  specialFlag: boolean;
}

interface SectorSummary {
  sector: string;
  avgBorrowFee: number;
  avgUtilization: number;
  stockCount: number;
  specialCount: number;
}

interface FeeDistribution {
  bucket: string;
  count: number;
  minFee: number;
  maxFee: number;
}

interface RecentChange {
  ticker: string;
  name: string;
  currentFee: number;
  previousFee: number;
  changeAbs: number;
  changePct: number;
  direction: 'up' | 'down';
}

interface MarketStats {
  totalLendableValue: number;
  totalOnLoanValue: number;
  avgUtilization: number;
  avgFee: number;
  numberOfSpecials: number;
  totalStocksTracked: number;
}

// Hard-to-borrow universe with base parameters
const HOT_STOCKS = [
  { ticker: 'GME', name: 'GameStop Corp', sector: 'Consumer Discretionary', baseFee: 45, baseUtil: 96 },
  { ticker: 'AMC', name: 'AMC Entertainment Holdings', sector: 'Consumer Discretionary', baseFee: 38, baseUtil: 94 },
  { ticker: 'CVNA', name: 'Carvana Co', sector: 'Consumer Discretionary', baseFee: 52, baseUtil: 97 },
  { ticker: 'MSTR', name: 'MicroStrategy Inc', sector: 'Technology', baseFee: 35, baseUtil: 91 },
  { ticker: 'RIVN', name: 'Rivian Automotive Inc', sector: 'Consumer Discretionary', baseFee: 28, baseUtil: 90 },
  { ticker: 'LCID', name: 'Lucid Group Inc', sector: 'Consumer Discretionary', baseFee: 32, baseUtil: 92 },
  { ticker: 'UPST', name: 'Upstart Holdings Inc', sector: 'Financials', baseFee: 55, baseUtil: 98 },
  { ticker: 'BBBY', name: 'Bed Bath & Beyond Inc', sector: 'Consumer Discretionary', baseFee: 72, baseUtil: 99 },
  { ticker: 'BYND', name: 'Beyond Meat Inc', sector: 'Consumer Discretionary', baseFee: 42, baseUtil: 93 },
  { ticker: 'SPCE', name: 'Virgin Galactic Holdings', sector: 'Industrials', baseFee: 48, baseUtil: 95 },
  { ticker: 'PLUG', name: 'Plug Power Inc', sector: 'Industrials', baseFee: 25, baseUtil: 90 },
  { ticker: 'NKLA', name: 'Nikola Corp', sector: 'Industrials', baseFee: 60, baseUtil: 97 },
  { ticker: 'AI', name: 'C3.ai Inc', sector: 'Technology', baseFee: 30, baseUtil: 91 },
  { ticker: 'SOUN', name: 'SoundHound AI Inc', sector: 'Technology', baseFee: 40, baseUtil: 93 },
  { ticker: 'IONQ', name: 'IonQ Inc', sector: 'Technology', baseFee: 36, baseUtil: 92 },
];

// General collateral stocks used for sector/distribution fill
const GC_STOCKS = [
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Technology', baseFee: 0.35, baseUtil: 15 },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', baseFee: 0.30, baseUtil: 12 },
  { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology', baseFee: 0.40, baseUtil: 18 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', baseFee: 0.45, baseUtil: 20 },
  { ticker: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare', baseFee: 0.80, baseUtil: 28 },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', baseFee: 0.50, baseUtil: 16 },
  { ticker: 'MRNA', name: 'Moderna Inc', sector: 'Healthcare', baseFee: 3.50, baseUtil: 38 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp', sector: 'Energy', baseFee: 0.35, baseUtil: 14 },
  { ticker: 'CVX', name: 'Chevron Corp', sector: 'Energy', baseFee: 0.30, baseUtil: 12 },
  { ticker: 'SLB', name: 'Schlumberger NV', sector: 'Energy', baseFee: 0.55, baseUtil: 22 },
  { ticker: 'OXY', name: 'Occidental Petroleum', sector: 'Energy', baseFee: 1.20, baseUtil: 32 },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', baseFee: 0.30, baseUtil: 10 },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials', baseFee: 0.35, baseUtil: 14 },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', baseFee: 0.40, baseUtil: 16 },
  { ticker: 'CAT', name: 'Caterpillar Inc', sector: 'Industrials', baseFee: 0.30, baseUtil: 11 },
  { ticker: 'HON', name: 'Honeywell International', sector: 'Industrials', baseFee: 0.35, baseUtil: 13 },
  { ticker: 'GE', name: 'General Electric', sector: 'Industrials', baseFee: 0.45, baseUtil: 18 },
  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Discretionary', baseFee: 1.50, baseUtil: 35 },
  { ticker: 'NKE', name: 'Nike Inc', sector: 'Consumer Discretionary', baseFee: 0.60, baseUtil: 20 },
  { ticker: 'HD', name: 'Home Depot', sector: 'Consumer Discretionary', baseFee: 0.30, baseUtil: 10 },
];

const SECTORS = ['Technology', 'Healthcare', 'Consumer Discretionary', 'Energy', 'Financials', 'Industrials'];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('sbl-monitor-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));

  // Generate hot stocks (hard-to-borrow)
  const hotStocks: HotStock[] = HOT_STOCKS.map(s => {
    // Borrow fee: 20-80% range, jittered from base
    const borrowFee = Math.round(jitter(s.baseFee, 0.25) * 100) / 100;
    // Utilization: 90-100% range
    const utilization = Math.min(99.9, Math.max(90, jitter(s.baseUtil, 0.04)));
    // Short interest: 15-65% of float for hard-to-borrow names
    const shortInterest = Math.round((15 + rng() * 50) * 100) / 100;
    // Days to cover: 1-15
    const daysToCover = Math.round((1 + rng() * 14) * 10) / 10;
    // Available shares: very limited for hard-to-borrow
    const availableShares = Math.round(jitter(50000, 0.6));
    // Lendable value in $M
    const lendableValue = Math.round(jitter(120, 0.5) * 10) / 10;
    // Fee changes: daily swing
    const feeChange1d = Math.round((rng() - 0.4) * borrowFee * 0.08 * 100) / 100;
    // Fee changes: weekly swing (larger)
    const feeChange1w = Math.round((rng() - 0.4) * borrowFee * 0.2 * 100) / 100;
    // Special flag: stocks with very high fee or utilization
    const specialFlag = borrowFee > 40 || utilization > 97;

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      borrowFee,
      utilization: Math.round(utilization * 10) / 10,
      shortInterest,
      daysToCover,
      availableShares,
      lendableValue,
      feeChange1d,
      feeChange1w,
      specialFlag,
    };
  });

  // Generate GC stock fees for sector summary and distribution
  const gcData = GC_STOCKS.map(s => {
    const borrowFee = Math.round(jitter(s.baseFee, 0.2) * 100) / 100;
    const utilization = Math.min(40, Math.max(5, jitter(s.baseUtil, 0.15)));
    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      borrowFee,
      utilization: Math.round(utilization * 10) / 10,
    };
  });

  // Combine all stocks for aggregation
  const allFees = [
    ...hotStocks.map(s => ({ sector: s.sector, borrowFee: s.borrowFee, utilization: s.utilization, special: s.specialFlag })),
    ...gcData.map(s => ({ sector: s.sector, borrowFee: s.borrowFee, utilization: s.utilization, special: false })),
  ];

  // Sector summary
  const sectorSummary: SectorSummary[] = SECTORS.map(sector => {
    const items = allFees.filter(s => s.sector === sector);
    if (items.length === 0) return { sector, avgBorrowFee: 0, avgUtilization: 0, stockCount: 0, specialCount: 0 };
    const avgBorrowFee = Math.round(items.reduce((a, c) => a + c.borrowFee, 0) / items.length * 100) / 100;
    const avgUtilization = Math.round(items.reduce((a, c) => a + c.utilization, 0) / items.length * 10) / 10;
    const specialCount = items.filter(s => s.special).length;
    return { sector, avgBorrowFee, avgUtilization, stockCount: items.length, specialCount };
  });

  // Fee distribution buckets
  const buckets = [
    { bucket: '0-1%', minFee: 0, maxFee: 1 },
    { bucket: '1-5%', minFee: 1, maxFee: 5 },
    { bucket: '5-10%', minFee: 5, maxFee: 10 },
    { bucket: '10-25%', minFee: 10, maxFee: 25 },
    { bucket: '25-50%', minFee: 25, maxFee: 50 },
    { bucket: '50%+', minFee: 50, maxFee: Infinity },
  ];
  const feeDistribution: FeeDistribution[] = buckets.map(b => {
    const count = allFees.filter(s => s.borrowFee >= b.minFee && s.borrowFee < b.maxFee).length;
    return { bucket: b.bucket, count, minFee: b.minFee, maxFee: b.maxFee === Infinity ? 999 : b.maxFee };
  });

  // Recent changes: sort hot stocks by absolute fee change in last 24h
  const recentChanges: RecentChange[] = hotStocks
    .map(s => {
      const previousFee = Math.round((s.borrowFee - s.feeChange1d) * 100) / 100;
      const changePct = previousFee !== 0
        ? Math.round((s.feeChange1d / previousFee) * 10000) / 100
        : 0;
      return {
        ticker: s.ticker,
        name: s.name,
        currentFee: s.borrowFee,
        previousFee,
        changeAbs: s.feeChange1d,
        changePct,
        direction: (s.feeChange1d >= 0 ? 'up' : 'down') as 'up' | 'down',
      };
    })
    .sort((a, b) => Math.abs(b.changeAbs) - Math.abs(a.changeAbs))
    .slice(0, 10);

  // Market stats
  const totalLendableValue = Math.round(
    hotStocks.reduce((a, c) => a + c.lendableValue, 0) +
    gcData.length * (Math.round(jitter(800, 0.3) * 10) / 10)
  );
  const totalOnLoanValue = Math.round(totalLendableValue * (0.25 + rng() * 0.15));
  const avgUtilization = Math.round(allFees.reduce((a, c) => a + c.utilization, 0) / allFees.length * 10) / 10;
  const avgFee = Math.round(allFees.reduce((a, c) => a + c.borrowFee, 0) / allFees.length * 100) / 100;
  const numberOfSpecials = hotStocks.filter(s => s.specialFlag).length;

  const marketStats: MarketStats = {
    totalLendableValue,
    totalOnLoanValue,
    avgUtilization,
    avgFee,
    numberOfSpecials,
    totalStocksTracked: allFees.length,
  };

  return {
    hotStocks,
    sectorSummary,
    feeDistribution,
    recentChanges,
    marketStats,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SecuritiesBorrowingLending] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate securities borrowing & lending data' });
  }
});

export default router;
