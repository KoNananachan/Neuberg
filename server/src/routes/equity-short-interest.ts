import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// --- Interfaces ---

interface StockShortInterest {
  symbol: string;
  name: string;
  sector: string;
  marketCapTier: 'Mega' | 'Large' | 'Mid' | 'Small';
  marketCapB: number;
  shortInterestPct: number;
  daysToCover: number;
  costToBorrowPct: number;
  sharesShortM: number;
  sharesFloatM: number;
  shortInterestChange2W: number;
  utilizationRate: number;
  squeezeScore: number;
  feeCategory: 'Easy' | 'Medium' | 'Hard' | 'Special';
  price: number;
  avgDailyVolumeM: number;
}

interface SectorBreakdown {
  sector: string;
  avgShortInterestPct: number;
  totalSharesShortM: number;
  avgDaysToCover: number;
  avgCostToBorrowPct: number;
  stockCount: number;
}

interface MarketCapTier {
  tier: 'Mega' | 'Large' | 'Mid' | 'Small';
  avgShortInterestPct: number;
  totalSharesShortM: number;
  avgSqueezeScore: number;
  stockCount: number;
}

interface FeeCategoryBreakdown {
  category: 'Easy' | 'Medium' | 'Hard' | 'Special';
  description: string;
  stockCount: number;
  avgShortInterestPct: number;
  symbols: string[];
}

// --- Stock Universe ---

const STOCK_UNIVERSE: {
  symbol: string;
  name: string;
  sector: string;
  marketCapTier: 'Mega' | 'Large' | 'Mid' | 'Small';
  marketCapB: number;
  basePrice: number;
  baseSIPct: number;
  baseCTB: number;
  baseUtilization: number;
}[] = [
  // High short interest names
  { symbol: 'GME', name: 'GameStop Corp', sector: 'Consumer Discretionary', marketCapTier: 'Small', marketCapB: 6.8, basePrice: 22, baseSIPct: 24.5, baseCTB: 28.0, baseUtilization: 94 },
  { symbol: 'AMC', name: 'AMC Entertainment', sector: 'Consumer Discretionary', marketCapTier: 'Small', marketCapB: 1.8, basePrice: 5.2, baseSIPct: 21.8, baseCTB: 22.5, baseUtilization: 91 },
  { symbol: 'CVNA', name: 'Carvana Co', sector: 'Consumer Discretionary', marketCapTier: 'Mid', marketCapB: 38, basePrice: 180, baseSIPct: 15.2, baseCTB: 12.0, baseUtilization: 85 },
  { symbol: 'UPST', name: 'Upstart Holdings', sector: 'Financials', marketCapTier: 'Small', marketCapB: 4.5, basePrice: 52, baseSIPct: 32.1, baseCTB: 18.5, baseUtilization: 88 },
  { symbol: 'BYND', name: 'Beyond Meat', sector: 'Consumer Staples', marketCapTier: 'Small', marketCapB: 0.8, basePrice: 7, baseSIPct: 38.4, baseCTB: 35.0, baseUtilization: 96 },
  { symbol: 'LCID', name: 'Lucid Group', sector: 'Consumer Discretionary', marketCapTier: 'Small', marketCapB: 7.2, basePrice: 3.1, baseSIPct: 18.6, baseCTB: 8.5, baseUtilization: 72 },
  { symbol: 'RIVN', name: 'Rivian Automotive', sector: 'Consumer Discretionary', marketCapTier: 'Mid', marketCapB: 14, basePrice: 14, baseSIPct: 14.8, baseCTB: 7.2, baseUtilization: 68 },
  { symbol: 'MARA', name: 'Marathon Digital', sector: 'Financials', marketCapTier: 'Small', marketCapB: 5.8, basePrice: 20, baseSIPct: 22.3, baseCTB: 9.8, baseUtilization: 75 },
  { symbol: 'SMCI', name: 'Super Micro Computer', sector: 'Technology', marketCapTier: 'Mid', marketCapB: 23, basePrice: 40, baseSIPct: 13.5, baseCTB: 11.0, baseUtilization: 72 },
  { symbol: 'FUBO', name: 'fuboTV Inc', sector: 'Communication Services', marketCapTier: 'Small', marketCapB: 1.2, basePrice: 3.5, baseSIPct: 19.4, baseCTB: 14.2, baseUtilization: 80 },
  { symbol: 'CLOV', name: 'Clover Health', sector: 'Healthcare', marketCapTier: 'Small', marketCapB: 0.5, basePrice: 1.1, baseSIPct: 16.2, baseCTB: 10.5, baseUtilization: 70 },
  { symbol: 'SPCE', name: 'Virgin Galactic', sector: 'Industrials', marketCapTier: 'Small', marketCapB: 0.6, basePrice: 1.8, baseSIPct: 28.7, baseCTB: 25.0, baseUtilization: 92 },
  // Moderate short interest
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Discretionary', marketCapTier: 'Mega', marketCapB: 780, basePrice: 250, baseSIPct: 3.2, baseCTB: 0.6, baseUtilization: 22 },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology', marketCapTier: 'Large', marketCapB: 55, basePrice: 24, baseSIPct: 5.8, baseCTB: 1.8, baseUtilization: 35 },
  { symbol: 'SOFI', name: 'SoFi Technologies', sector: 'Financials', marketCapTier: 'Mid', marketCapB: 10, basePrice: 9.5, baseSIPct: 9.4, baseCTB: 3.2, baseUtilization: 45 },
  { symbol: 'SNAP', name: 'Snap Inc', sector: 'Communication Services', marketCapTier: 'Mid', marketCapB: 18, basePrice: 11, baseSIPct: 6.1, baseCTB: 1.5, baseUtilization: 30 },
  { symbol: 'HOOD', name: 'Robinhood Markets', sector: 'Financials', marketCapTier: 'Mid', marketCapB: 12, basePrice: 14, baseSIPct: 8.5, baseCTB: 2.8, baseUtilization: 42 },
  { symbol: 'COIN', name: 'Coinbase Global', sector: 'Financials', marketCapTier: 'Large', marketCapB: 52, basePrice: 220, baseSIPct: 7.2, baseCTB: 2.1, baseUtilization: 38 },
  { symbol: 'SQ', name: 'Block Inc', sector: 'Financials', marketCapTier: 'Large', marketCapB: 42, basePrice: 70, baseSIPct: 5.5, baseCTB: 1.2, baseUtilization: 28 },
  { symbol: 'SHOP', name: 'Shopify Inc', sector: 'Technology', marketCapTier: 'Large', marketCapB: 95, basePrice: 75, baseSIPct: 4.8, baseCTB: 0.9, baseUtilization: 24 },
  { symbol: 'RBLX', name: 'Roblox Corp', sector: 'Communication Services', marketCapTier: 'Mid', marketCapB: 26, basePrice: 43, baseSIPct: 7.8, baseCTB: 2.5, baseUtilization: 40 },
  { symbol: 'DKNG', name: 'DraftKings Inc', sector: 'Consumer Discretionary', marketCapTier: 'Mid', marketCapB: 18, basePrice: 38, baseSIPct: 6.4, baseCTB: 1.6, baseUtilization: 32 },
  { symbol: 'AFRM', name: 'Affirm Holdings', sector: 'Financials', marketCapTier: 'Mid', marketCapB: 14, basePrice: 45, baseSIPct: 10.2, baseCTB: 4.5, baseUtilization: 52 },
  { symbol: 'NET', name: 'Cloudflare Inc', sector: 'Technology', marketCapTier: 'Large', marketCapB: 30, basePrice: 88, baseSIPct: 4.2, baseCTB: 0.8, baseUtilization: 20 },
  { symbol: 'SNOW', name: 'Snowflake Inc', sector: 'Technology', marketCapTier: 'Large', marketCapB: 55, basePrice: 165, baseSIPct: 5.1, baseCTB: 1.1, baseUtilization: 26 },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', sector: 'Technology', marketCapTier: 'Large', marketCapB: 70, basePrice: 290, baseSIPct: 3.6, baseCTB: 0.7, baseUtilization: 18 },
  { symbol: 'DASH', name: 'DoorDash Inc', sector: 'Consumer Discretionary', marketCapTier: 'Large', marketCapB: 48, basePrice: 120, baseSIPct: 5.9, baseCTB: 1.4, baseUtilization: 30 },
  { symbol: 'ABNB', name: 'Airbnb Inc', sector: 'Consumer Discretionary', marketCapTier: 'Large', marketCapB: 90, basePrice: 145, baseSIPct: 3.4, baseCTB: 0.6, baseUtilization: 16 },
  // Low short interest mega caps
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology', marketCapTier: 'Mega', marketCapB: 2850, basePrice: 185, baseSIPct: 0.7, baseCTB: 0.2, baseUtilization: 5 },
  { symbol: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', marketCapTier: 'Mega', marketCapB: 3050, basePrice: 415, baseSIPct: 0.6, baseCTB: 0.15, baseUtilization: 4 },
  { symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology', marketCapTier: 'Mega', marketCapB: 2200, basePrice: 880, baseSIPct: 1.1, baseCTB: 0.3, baseUtilization: 10 },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', marketCapTier: 'Mega', marketCapB: 1280, basePrice: 500, baseSIPct: 0.8, baseCTB: 0.2, baseUtilization: 6 },
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer Discretionary', marketCapTier: 'Mega', marketCapB: 1870, basePrice: 180, baseSIPct: 0.9, baseCTB: 0.2, baseUtilization: 6 },
  { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Communication Services', marketCapTier: 'Mega', marketCapB: 1950, basePrice: 155, baseSIPct: 0.7, baseCTB: 0.15, baseUtilization: 5 },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', marketCapTier: 'Mega', marketCapB: 570, basePrice: 195, baseSIPct: 0.9, baseCTB: 0.2, baseUtilization: 7 },
  { symbol: 'V', name: 'Visa Inc', sector: 'Financials', marketCapTier: 'Mega', marketCapB: 520, basePrice: 280, baseSIPct: 0.6, baseCTB: 0.15, baseUtilization: 4 },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', marketCapTier: 'Mega', marketCapB: 480, basePrice: 520, baseSIPct: 0.8, baseCTB: 0.2, baseUtilization: 6 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketCapTier: 'Mega', marketCapB: 380, basePrice: 158, baseSIPct: 0.5, baseCTB: 0.1, baseUtilization: 3 },
  { symbol: 'WMT', name: 'Walmart Inc', sector: 'Consumer Staples', marketCapTier: 'Mega', marketCapB: 440, basePrice: 165, baseSIPct: 0.4, baseCTB: 0.1, baseUtilization: 3 },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', marketCapTier: 'Mega', marketCapB: 460, basePrice: 108, baseSIPct: 0.8, baseCTB: 0.2, baseUtilization: 5 },
];

// --- Cache ---


let cache: { data: unknown; ts: number } | null = null;

// --- Helpers ---

function classifyFeeCategory(ctb: number): 'Easy' | 'Medium' | 'Hard' | 'Special' {
  if (ctb < 1) return 'Easy';
  if (ctb < 5) return 'Medium';
  if (ctb < 20) return 'Hard';
  return 'Special';
}

function computeSqueezeScore(
  siPct: number,
  daysToCover: number,
  utilization: number,
  ctb: number,
  change2W: number,
  rng: () => number,
): number {
  // Weighted composite: SI% (25), DTC (20), utilization (25), CTB (20), momentum (10)
  const siScore = Math.min(40, siPct) / 40 * 25;
  const dtcScore = Math.min(10, daysToCover) / 10 * 20;
  const utilScore = utilization / 100 * 25;
  const ctbScore = Math.min(50, ctb) / 50 * 20;
  const momentumScore = change2W > 0 ? Math.min(30, change2W) / 30 * 10 : 0;
  const raw = siScore + dtcScore + utilScore + ctbScore + momentumScore;
  // Add tiny noise
  return Math.round(Math.min(100, Math.max(0, raw + (rng() - 0.5) * 4)));
}

// --- Generator ---

function generate() {
  const rng = seededRandom('equity-short-interest');
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));

  // Generate per-stock data
  const stocks: StockShortInterest[] = STOCK_UNIVERSE.map(s => {
    const shortInterestPct = Math.round(jitter(s.baseSIPct, 0.1) * 100) / 100;
    const costToBorrowPct = Math.round(jitter(s.baseCTB, 0.15) * 100) / 100;
    const utilizationRate = Math.round(Math.min(99.9, Math.max(0.5, jitter(s.baseUtilization, 0.08))) * 10) / 10;
    const price = Math.round(jitter(s.basePrice, 0.05) * 100) / 100;

    // Derive shares from market cap and SI%
    const sharesOutstandingM = Math.round(s.marketCapB * 1000 / price * 10) / 10;
    // Float is typically 85-98% of outstanding for large caps, lower for small caps
    const floatPct = s.marketCapTier === 'Mega' ? 0.95 + rng() * 0.04
      : s.marketCapTier === 'Large' ? 0.88 + rng() * 0.08
      : s.marketCapTier === 'Mid' ? 0.80 + rng() * 0.12
      : 0.65 + rng() * 0.20;
    const sharesFloatM = Math.round(sharesOutstandingM * floatPct * 10) / 10;
    const sharesShortM = Math.round(sharesFloatM * (shortInterestPct / 100) * 10) / 10;

    // Average daily volume: roughly derived from market cap tier
    const baseVolM = s.marketCapTier === 'Mega' ? 40 + rng() * 30
      : s.marketCapTier === 'Large' ? 10 + rng() * 20
      : s.marketCapTier === 'Mid' ? 5 + rng() * 15
      : 3 + rng() * 12;
    const avgDailyVolumeM = Math.round(baseVolM * 10) / 10;

    const daysToCover = Math.round((sharesShortM / avgDailyVolumeM) * 10) / 10;

    // 2-week change in SI: high SI stocks tend to be more volatile
    const changeBase = s.baseSIPct > 15 ? (rng() - 0.4) * 18
      : s.baseSIPct > 5 ? (rng() - 0.45) * 10
      : (rng() - 0.5) * 4;
    const shortInterestChange2W = Math.round(changeBase * 100) / 100;

    const squeezeScore = computeSqueezeScore(
      shortInterestPct, daysToCover, utilizationRate, costToBorrowPct, shortInterestChange2W, rng,
    );

    const feeCategory = classifyFeeCategory(costToBorrowPct);

    return {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      marketCapTier: s.marketCapTier,
      marketCapB: s.marketCapB,
      shortInterestPct,
      daysToCover,
      costToBorrowPct,
      sharesShortM,
      sharesFloatM,
      shortInterestChange2W,
      utilizationRate,
      squeezeScore,
      feeCategory,
      price,
      avgDailyVolumeM,
    };
  });

  // Sort by SI% descending for most-shorted ranking
  const mostShortedRanking = [...stocks]
    .sort((a, b) => b.shortInterestPct - a.shortInterestPct)
    .map((s, i) => ({
      rank: i + 1,
      symbol: s.symbol,
      name: s.name,
      shortInterestPct: s.shortInterestPct,
      daysToCover: s.daysToCover,
      squeezeScore: s.squeezeScore,
      feeCategory: s.feeCategory,
    }));

  // Sector breakdown
  const sectorMap = new Map<string, StockShortInterest[]>();
  for (const s of stocks) {
    const arr = sectorMap.get(s.sector) || [];
    arr.push(s);
    sectorMap.set(s.sector, arr);
  }

  const sectorBreakdown: SectorBreakdown[] = [];
  for (const [sector, sectorStocks] of sectorMap) {
    const n = sectorStocks.length;
    sectorBreakdown.push({
      sector,
      avgShortInterestPct: Math.round(sectorStocks.reduce((a, s) => a + s.shortInterestPct, 0) / n * 100) / 100,
      totalSharesShortM: Math.round(sectorStocks.reduce((a, s) => a + s.sharesShortM, 0) * 10) / 10,
      avgDaysToCover: Math.round(sectorStocks.reduce((a, s) => a + s.daysToCover, 0) / n * 10) / 10,
      avgCostToBorrowPct: Math.round(sectorStocks.reduce((a, s) => a + s.costToBorrowPct, 0) / n * 100) / 100,
      stockCount: n,
    });
  }
  sectorBreakdown.sort((a, b) => b.avgShortInterestPct - a.avgShortInterestPct);

  // Market cap tier breakdown
  const tierMap = new Map<string, StockShortInterest[]>();
  for (const s of stocks) {
    const arr = tierMap.get(s.marketCapTier) || [];
    arr.push(s);
    tierMap.set(s.marketCapTier, arr);
  }

  const tierOrder: ('Mega' | 'Large' | 'Mid' | 'Small')[] = ['Mega', 'Large', 'Mid', 'Small'];
  const marketCapTiers: MarketCapTier[] = tierOrder.map(tier => {
    const tierStocks = tierMap.get(tier) || [];
    const n = tierStocks.length || 1;
    return {
      tier,
      avgShortInterestPct: Math.round(tierStocks.reduce((a, s) => a + s.shortInterestPct, 0) / n * 100) / 100,
      totalSharesShortM: Math.round(tierStocks.reduce((a, s) => a + s.sharesShortM, 0) * 10) / 10,
      avgSqueezeScore: Math.round(tierStocks.reduce((a, s) => a + s.squeezeScore, 0) / n),
      stockCount: tierStocks.length,
    };
  });

  // Fee rate category breakdown
  const feeMap = new Map<string, StockShortInterest[]>();
  for (const s of stocks) {
    const arr = feeMap.get(s.feeCategory) || [];
    arr.push(s);
    feeMap.set(s.feeCategory, arr);
  }

  const feeDescriptions: Record<string, string> = {
    Easy: '< 1% annual borrow cost',
    Medium: '1-5% annual borrow cost',
    Hard: '5-20% annual borrow cost',
    Special: '> 20% annual borrow cost',
  };

  const feeCategoryOrder: ('Easy' | 'Medium' | 'Hard' | 'Special')[] = ['Easy', 'Medium', 'Hard', 'Special'];
  const feeCategories: FeeCategoryBreakdown[] = feeCategoryOrder.map(cat => {
    const catStocks = feeMap.get(cat) || [];
    const n = catStocks.length || 1;
    return {
      category: cat,
      description: feeDescriptions[cat],
      stockCount: catStocks.length,
      avgShortInterestPct: Math.round(catStocks.reduce((a, s) => a + s.shortInterestPct, 0) / n * 100) / 100,
      symbols: catStocks.map(s => s.symbol).sort(),
    };
  });

  // Summary stats
  const totalSharesShortB = Math.round(stocks.reduce((a, s) => a + s.sharesShortM, 0) / 1000 * 100) / 100;
  const avgShortInterestPct = Math.round(stocks.reduce((a, s) => a + s.shortInterestPct, 0) / stocks.length * 100) / 100;
  const avgDaysToCover = Math.round(stocks.reduce((a, s) => a + s.daysToCover, 0) / stocks.length * 10) / 10;
  const highSICount = stocks.filter(s => s.shortInterestPct > 10).length;
  const avgSqueezeScore = Math.round(stocks.reduce((a, s) => a + s.squeezeScore, 0) / stocks.length);

  return {
    summary: {
      totalStocksTracked: stocks.length,
      totalSharesShortB,
      avgShortInterestPct,
      avgDaysToCover,
      highShortInterestCount: highSICount,
      avgSqueezeScore,
    },
    stocks,
    mostShortedRanking,
    sectorBreakdown,
    marketCapTiers,
    feeCategories,
    timestamp: new Date().toISOString(),
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
    console.error('[EquityShortInterest] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity short interest data' });
  }
});

export default router;
