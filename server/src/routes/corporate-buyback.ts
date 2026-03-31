import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface ActiveProgram {
  ticker: string;
  companyName: string;
  programSize: number;
  remaining: number;
  completionPct: number;
  buybackYield: number;
  avgPrice: number;
  sharesRepurchased: number;
  announcedDate: string;
  expiryDate: string;
}

interface SectorSummary {
  sector: string;
  totalPrograms: number;
  totalSize: number;
  avgCompletion: number;
  avgBuybackYield: number;
  netShareChange: number;
}

interface RecentExecution {
  ticker: string;
  date: string;
  sharesRepurchased: number;
  avgPrice: number;
  totalCost: number;
  dailyVolumePct: number;
}

interface MarketSummary {
  totalActivePrograms: number;
  totalProgramValue: number;
  avgBuybackYield: number;
  topSector: string;
  ytdBuybacks: number;
  timestamp: string;
}

interface CorporateBuybackResponse {
  activePrograms: ActiveProgram[];
  sectorSummary: SectorSummary[];
  recentActivity: RecentExecution[];
  marketSummary: MarketSummary;
}

// ── Company definitions ──

interface CompanyDef {
  ticker: string;
  companyName: string;
  sector: string;
  basePrice: number;
  marketCap: number;
  avgDailyVolume: number;
}

const BUYBACK_COMPANIES: CompanyDef[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', sector: 'Technology', basePrice: 213.25, marketCap: 3300, avgDailyVolume: 55_000_000 },
  { ticker: 'MSFT', companyName: 'Microsoft Corp.', sector: 'Technology', basePrice: 428.50, marketCap: 3180, avgDailyVolume: 22_000_000 },
  { ticker: 'GOOG', companyName: 'Alphabet Inc.', sector: 'Technology', basePrice: 175.60, marketCap: 2150, avgDailyVolume: 25_000_000 },
  { ticker: 'META', companyName: 'Meta Platforms Inc.', sector: 'Technology', basePrice: 505.20, marketCap: 1290, avgDailyVolume: 18_000_000 },
  { ticker: 'NVDA', companyName: 'NVIDIA Corp.', sector: 'Technology', basePrice: 875.30, marketCap: 2150, avgDailyVolume: 42_000_000 },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', sector: 'Financials', basePrice: 198.70, marketCap: 572, avgDailyVolume: 10_000_000 },
  { ticker: 'BAC', companyName: 'Bank of America Corp.', sector: 'Financials', basePrice: 37.90, marketCap: 299, avgDailyVolume: 35_000_000 },
  { ticker: 'WFC', companyName: 'Wells Fargo & Co.', sector: 'Financials', basePrice: 58.40, marketCap: 210, avgDailyVolume: 18_000_000 },
  { ticker: 'GS', companyName: 'Goldman Sachs Group Inc.', sector: 'Financials', basePrice: 415.80, marketCap: 138, avgDailyVolume: 3_200_000 },
  { ticker: 'UNH', companyName: 'UnitedHealth Group Inc.', sector: 'Healthcare', basePrice: 527.80, marketCap: 486, avgDailyVolume: 3_800_000 },
  { ticker: 'JNJ', companyName: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 156.30, marketCap: 378, avgDailyVolume: 7_200_000 },
  { ticker: 'PG', companyName: 'Procter & Gamble Co.', sector: 'Consumer Staples', basePrice: 168.40, marketCap: 396, avgDailyVolume: 7_500_000 },
  { ticker: 'HD', companyName: 'The Home Depot Inc.', sector: 'Consumer Discretionary', basePrice: 362.70, marketCap: 360, avgDailyVolume: 4_200_000 },
  { ticker: 'V', companyName: 'Visa Inc.', sector: 'Financials', basePrice: 278.90, marketCap: 568, avgDailyVolume: 6_800_000 },
  { ticker: 'MA', companyName: 'Mastercard Inc.', sector: 'Financials', basePrice: 462.30, marketCap: 430, avgDailyVolume: 3_500_000 },
];

const SECTORS = [
  'Technology',
  'Financials',
  'Healthcare',
  'Consumer Discretionary',
  'Consumer Staples',
  'Industrials',
  'Energy',
  'Communication Services',
];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Generation logic ──

function generateActivePrograms(rng: () => number): ActiveProgram[] {
  const today = new Date();

  return BUYBACK_COMPANIES.map((co) => {
    // Program sizes scaled to market cap: large caps get $10-110B, smaller caps get $3-20B
    const scaleFactor = co.marketCap / 1000;
    const baseProgramSize = scaleFactor > 1
      ? 20 + rng() * 90
      : 3 + rng() * 17;
    const programSize = round1(baseProgramSize);

    // Completion: 15-85%, varies by company
    const completionPct = round1(15 + rng() * 70);
    const remaining = round1(programSize * (1 - completionPct / 100));

    // Buyback yield: 0.8-4.5% of market cap annualized
    const buybackYield = round2(0.8 + rng() * 3.7);

    // Average repurchase price: near current price with slight discount (accumulation)
    const avgPrice = round2(co.basePrice * (0.96 + rng() * 0.06));

    // Shares repurchased: derived from (programSize * completionPct) / avgPrice
    const spentB = programSize * (completionPct / 100);
    const sharesRepurchased = round1((spentB * 1_000) / avgPrice);

    // Announced 3-18 months ago
    const monthsAgo = 3 + Math.floor(rng() * 16);
    const announced = new Date(today);
    announced.setMonth(announced.getMonth() - monthsAgo);
    const announcedDate = formatDate(announced);

    // Expiry 12-36 months after announcement
    const expiryMonths = 12 + Math.floor(rng() * 25);
    const expiry = new Date(announced);
    expiry.setMonth(expiry.getMonth() + expiryMonths);
    const expiryDate = formatDate(expiry);

    return {
      ticker: co.ticker,
      companyName: co.companyName,
      programSize,
      remaining,
      completionPct,
      buybackYield,
      avgPrice,
      sharesRepurchased,
      announcedDate,
      expiryDate,
    };
  });
}

function generateSectorSummary(rng: () => number): SectorSummary[] {
  return SECTORS.map((sector) => {
    // Total programs per sector: 15-80
    const totalPrograms = 15 + Math.floor(rng() * 66);

    // Total size: $20-350B per sector
    const totalSize = round1(20 + rng() * 330);

    // Average completion: 30-65%
    const avgCompletion = round1(30 + rng() * 35);

    // Average buyback yield: 1.0-3.5%
    const avgBuybackYield = round2(1.0 + rng() * 2.5);

    // Net share change: typically negative (buybacks reduce share count)
    // Range: -4.5% to -0.2%
    const netShareChange = round2(-(0.2 + rng() * 4.3));

    return { sector, totalPrograms, totalSize, avgCompletion, avgBuybackYield, netShareChange };
  });
}

function generateRecentActivity(rng: () => number): RecentExecution[] {
  const executions: RecentExecution[] = [];
  const today = new Date();

  for (let i = 0; i < 10; i++) {
    const co = BUYBACK_COMPANIES[Math.floor(rng() * BUYBACK_COMPANIES.length)];

    // Date within last 5 trading days
    const daysBack = Math.floor(rng() * 5);
    const execDate = new Date(today);
    execDate.setDate(execDate.getDate() - daysBack);
    // Skip weekends
    const dow = execDate.getDay();
    if (dow === 0) execDate.setDate(execDate.getDate() - 2);
    else if (dow === 6) execDate.setDate(execDate.getDate() - 1);
    const date = formatDate(execDate);

    // Shares repurchased in a single day: 200k-5M shares
    const sharesRepurchased = Math.round((200_000 + rng() * 4_800_000) / 1000) * 1000;

    // Avg price near base with small variance
    const avgPrice = round2(co.basePrice * (0.985 + rng() * 0.03));

    // Total cost in $M
    const totalCost = round2((sharesRepurchased * avgPrice) / 1_000_000);

    // Daily volume percentage: 2-25% of ADTV (SEC safe-harbor limit is 25%)
    const dailyVolumePct = round1(2 + rng() * 23);

    executions.push({ ticker: co.ticker, date, sharesRepurchased, avgPrice, totalCost, dailyVolumePct });
  }

  // Sort by date descending
  executions.sort((a, b) => b.date.localeCompare(a.date));

  return executions;
}

function generateMarketSummary(
  activePrograms: ActiveProgram[],
  sectorSummary: SectorSummary[],
  rng: () => number
): MarketSummary {
  // Total active programs across market: 350-600
  const totalActivePrograms = 350 + Math.floor(rng() * 251);

  // Total program value: sum of sector totals, expressed in $T
  const sectorTotal = sectorSummary.reduce((sum, s) => sum + s.totalSize, 0);
  const totalProgramValue = round2(sectorTotal / 1000);

  // Average buyback yield across all programs
  const avgBuybackYield = round2(
    activePrograms.reduce((sum, p) => sum + p.buybackYield, 0) / activePrograms.length
  );

  // Top sector by total size
  const topSector = sectorSummary.reduce((best, s) =>
    s.totalSize > best.totalSize ? s : best
  ).sector;

  // YTD buybacks: $200-500B
  const ytdBuybacks = round1(200 + rng() * 300);

  return {
    totalActivePrograms,
    totalProgramValue,
    avgBuybackYield,
    topSector,
    ytdBuybacks,
    timestamp: new Date().toISOString(),
  };
}

function buildCorporateBuybackData(): CorporateBuybackResponse {
  const rng = seededRandom('corporate-buyback');

  const activePrograms = generateActivePrograms(rng);
  const sectorSummary = generateSectorSummary(rng);
  const recentActivity = generateRecentActivity(rng);
  const marketSummary = generateMarketSummary(activePrograms, sectorSummary, rng);

  return { activePrograms, sectorSummary, recentActivity, marketSummary };
}

// ── Cache ──

let cachedData: { data: CorporateBuybackResponse; ts: number } | null = null;
let staleData: CorporateBuybackResponse | null = null;


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cachedData.ts < CACHE_TTL) {
      res.json(cachedData.data);
      return;
    }

    // Generate fresh data
    const data = buildCorporateBuybackData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[CorporateBuyback] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate corporate buyback data' });
  }
});

export default router;
