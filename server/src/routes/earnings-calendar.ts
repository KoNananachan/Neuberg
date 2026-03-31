import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();


// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Company pool ──

const COMPANIES: Array<{
  ticker: string;
  company: string;
  sector: string;
  marketCapB: number;
  epsRange: [number, number];
  revB: [number, number];
  timing: 'BMO' | 'AMC';
}> = [
  { ticker: 'AAPL', company: 'Apple Inc.', sector: 'Technology', marketCapB: 2870, epsRange: [2.10, 2.35], revB: [89.5, 97.2], timing: 'AMC' },
  { ticker: 'MSFT', company: 'Microsoft Corp.', sector: 'Technology', marketCapB: 3120, epsRange: [3.10, 3.40], revB: [61.8, 67.5], timing: 'AMC' },
  { ticker: 'GOOGL', company: 'Alphabet Inc.', sector: 'Technology', marketCapB: 2100, epsRange: [1.80, 2.10], revB: [84.7, 92.3], timing: 'AMC' },
  { ticker: 'AMZN', company: 'Amazon.com Inc.', sector: 'Consumer Discretionary', marketCapB: 2020, epsRange: [1.10, 1.45], revB: [155.0, 172.0], timing: 'AMC' },
  { ticker: 'NVDA', company: 'NVIDIA Corp.', sector: 'Technology', marketCapB: 3400, epsRange: [0.80, 1.20], revB: [35.0, 44.5], timing: 'AMC' },
  { ticker: 'META', company: 'Meta Platforms Inc.', sector: 'Technology', marketCapB: 1520, epsRange: [5.50, 6.80], revB: [39.5, 43.8], timing: 'AMC' },
  { ticker: 'TSLA', company: 'Tesla Inc.', sector: 'Consumer Discretionary', marketCapB: 780, epsRange: [0.55, 0.82], revB: [23.5, 27.2], timing: 'AMC' },
  { ticker: 'JPM', company: 'JPMorgan Chase & Co.', sector: 'Financials', marketCapB: 680, epsRange: [4.20, 4.95], revB: [40.1, 45.6], timing: 'BMO' },
  { ticker: 'BAC', company: 'Bank of America Corp.', sector: 'Financials', marketCapB: 340, epsRange: [0.80, 0.98], revB: [24.5, 27.1], timing: 'BMO' },
  { ticker: 'WMT', company: 'Walmart Inc.', sector: 'Consumer Staples', marketCapB: 630, epsRange: [0.58, 0.68], revB: [160.5, 170.8], timing: 'BMO' },
  { ticker: 'JNJ', company: 'Johnson & Johnson', sector: 'Healthcare', marketCapB: 380, epsRange: [2.55, 2.78], revB: [21.2, 23.4], timing: 'BMO' },
  { ticker: 'PG', company: 'Procter & Gamble Co.', sector: 'Consumer Staples', marketCapB: 390, epsRange: [1.72, 1.92], revB: [20.5, 22.3], timing: 'BMO' },
  { ticker: 'UNH', company: 'UnitedHealth Group Inc.', sector: 'Healthcare', marketCapB: 540, epsRange: [6.70, 7.25], revB: [95.8, 104.2], timing: 'BMO' },
  { ticker: 'V', company: 'Visa Inc.', sector: 'Financials', marketCapB: 620, epsRange: [2.45, 2.72], revB: [9.0, 10.1], timing: 'AMC' },
  { ticker: 'MA', company: 'Mastercard Inc.', sector: 'Financials', marketCapB: 480, epsRange: [3.40, 3.78], revB: [6.8, 7.6], timing: 'BMO' },
  { ticker: 'HD', company: 'The Home Depot Inc.', sector: 'Consumer Discretionary', marketCapB: 370, epsRange: [3.60, 3.95], revB: [37.8, 41.2], timing: 'BMO' },
  { ticker: 'DIS', company: 'The Walt Disney Co.', sector: 'Communication Services', marketCapB: 205, epsRange: [1.15, 1.45], revB: [22.5, 24.8], timing: 'AMC' },
  { ticker: 'NFLX', company: 'Netflix Inc.', sector: 'Communication Services', marketCapB: 420, epsRange: [5.20, 6.10], revB: [9.5, 10.8], timing: 'AMC' },
  { ticker: 'CRM', company: 'Salesforce Inc.', sector: 'Technology', marketCapB: 280, epsRange: [2.35, 2.68], revB: [9.0, 9.8], timing: 'AMC' },
  { ticker: 'COST', company: 'Costco Wholesale Corp.', sector: 'Consumer Staples', marketCapB: 410, epsRange: [3.75, 4.15], revB: [58.2, 64.1], timing: 'AMC' },
];

const SECTORS = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Consumer Staples', 'Communication Services', 'Industrials', 'Energy'];

// ── Helpers ──

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function lerp(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function formatMarketCap(b: number): string {
  if (b >= 1000) return `${round1(b / 1000)}T`;
  return `${round1(b)}B`;
}

function skipWeekend(d: Date): Date {
  const dow = d.getDay();
  if (dow === 0) d.setDate(d.getDate() + 1);
  if (dow === 6) d.setDate(d.getDate() + 2);
  return d;
}

// ── Types ──

interface UpcomingEarning {
  date: string;
  ticker: string;
  company: string;
  time: 'BMO' | 'AMC';
  epsEstimate: number;
  revenueEstimateB: number;
  marketCap: string;
}

interface RecentResult {
  date: string;
  ticker: string;
  epsActual: number;
  epsEstimate: number;
  surprisePercent: number;
  revenueActualB: number;
  revenueEstimateB: number;
  stockMovePercent: number;
}

interface EarningsSurpriseStats {
  beatRatePercent: number;
  avgSurprisePercent: number;
  medianSurprisePercent: number;
  stocksReportingThisWeek: number;
}

interface SectorBreakdown {
  sector: string;
  reportingThisWeek: number;
  avgImpliedMovePercent: number;
  historicalBeatRatePercent: number;
}

interface EarningsCalendarResponse {
  upcomingEarnings: UpcomingEarning[];
  recentResults: RecentResult[];
  surpriseStats: EarningsSurpriseStats;
  sectorBreakdown: SectorBreakdown[];
  timestamp: string;
}

// ── Data generation ──

function generate(): EarningsCalendarResponse {
  const today = new Date();
  const dayStr = today.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('earnings-calendar-' + dayStr));

  // ── Upcoming earnings (next 2 weeks) ──
  const shuffled = [...COMPANIES].sort(() => rng() - 0.5);
  const upcomingCount = 12 + Math.floor(rng() * 6); // 12-17 companies
  const upcomingPool = shuffled.slice(0, upcomingCount);

  const upcomingEarnings: UpcomingEarning[] = upcomingPool.map(co => {
    const daysAhead = 1 + Math.floor(rng() * 14);
    const d = skipWeekend(addDays(today, daysAhead));

    return {
      date: formatDate(d),
      ticker: co.ticker,
      company: co.company,
      time: co.timing,
      epsEstimate: round2(lerp(rng, co.epsRange[0], co.epsRange[1])),
      revenueEstimateB: round2(lerp(rng, co.revB[0], co.revB[1])),
      marketCap: formatMarketCap(co.marketCapB * (0.95 + rng() * 0.10)),
    };
  });

  upcomingEarnings.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    if (a.time !== b.time) return a.time === 'BMO' ? -1 : 1;
    return a.ticker.localeCompare(b.ticker);
  });

  // ── Recent results (past 1-2 weeks) ──
  const recentPool = [...COMPANIES].sort(() => rng() - 0.5).slice(0, 10);
  const recentResults: RecentResult[] = recentPool.map(co => {
    const daysAgo = 1 + Math.floor(rng() * 12);
    const d = skipWeekend(addDays(today, -daysAgo));

    const epsEstimate = round2(lerp(rng, co.epsRange[0], co.epsRange[1]));
    const beat = rng() < 0.68;
    const epsActual = beat
      ? round2(epsEstimate * (1 + rng() * 0.09))
      : round2(epsEstimate * (1 - rng() * 0.07));
    const surprisePercent = round1(((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100);

    const revenueEstimateB = round2(lerp(rng, co.revB[0], co.revB[1]));
    const revBeat = rng() < 0.62;
    const revenueActualB = revBeat
      ? round2(revenueEstimateB * (1 + rng() * 0.04))
      : round2(revenueEstimateB * (1 - rng() * 0.03));

    // Stock move correlated with surprise but noisy
    const baseMove = surprisePercent * 0.4;
    const noise = (rng() - 0.5) * 6;
    const stockMovePercent = round1(baseMove + noise);

    return {
      date: formatDate(d),
      ticker: co.ticker,
      epsActual,
      epsEstimate,
      surprisePercent,
      revenueActualB,
      revenueEstimateB,
      stockMovePercent,
    };
  });

  recentResults.sort((a, b) => b.date.localeCompare(a.date));

  // ── Earnings surprise stats ──
  const surprises = recentResults.map(r => r.surprisePercent);
  const beats = surprises.filter(s => s > 0).length;
  const beatRatePercent = round1((beats / surprises.length) * 100);
  const avgSurprisePercent = round1(surprises.reduce((a, b) => a + b, 0) / surprises.length);
  const sorted = [...surprises].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianSurprisePercent = sorted.length % 2 === 0
    ? round1((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
  const stocksReportingThisWeek = upcomingCount;

  const surpriseStats: EarningsSurpriseStats = {
    beatRatePercent,
    avgSurprisePercent,
    medianSurprisePercent,
    stocksReportingThisWeek,
  };

  // ── Sector breakdown ──
  const sectorBreakdown: SectorBreakdown[] = SECTORS.map(sector => {
    const reportingThisWeek = 3 + Math.floor(rng() * 18); // 3-20
    const avgImpliedMovePercent = round1(2.5 + rng() * 6.5); // 2.5-9.0%
    const historicalBeatRatePercent = round1(55 + rng() * 25); // 55-80%

    return {
      sector,
      reportingThisWeek,
      avgImpliedMovePercent,
      historicalBeatRatePercent,
    };
  });

  return {
    upcomingEarnings,
    recentResults,
    surpriseStats,
    sectorBreakdown,
    timestamp: new Date().toISOString(),
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
    console.error('[EarningsCalendar] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate earnings calendar data' });
  }
});

export default router;
