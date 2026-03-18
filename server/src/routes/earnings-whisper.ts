import { Router, Request, Response } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface StockDef {
  ticker: string;
  name: string;
  sector: string;
  baseEps: number;
  baseRevenue: number;
  marketCap: number;
}

interface UpcomingEarnings {
  ticker: string;
  name: string;
  sector: string;
  reportDate: string;
  reportTime: 'BMO' | 'AMC';
  consensusEps: number;
  whisperEps: number;
  revenueConsensus: number;
  revenueWhisper: number;
  whisperVsConsensus: number;
  historicalBeatRate: number;
  avgSurprise: number;
  impliedMove: number;
  prevQuarterSurprise: number;
  analystCount: number;
  highEst: number;
  lowEst: number;
}

interface RecentResult {
  ticker: string;
  name: string;
  reportedEps: number;
  consensusEps: number;
  surprise: number;
  revenueReported: number;
  revenueConsensus: number;
  revenueSurprise: number;
  reaction: number;
  guidance: 'Above' | 'Inline' | 'Below';
}

interface SeasonStats {
  totalReported: number;
  beatRate: number;
  missRate: number;
  inlineRate: number;
  avgSurprise: number;
  medianReaction: number;
  revenueBeatRate: number;
}

interface WhisperSummary {
  upcomingCount: number;
  avgImpliedMove: number;
  highestImpliedMove: { ticker: string; move: number };
  avgWhisperVsConsensus: number;
  marketCapReporting: number;
}

interface EarningsWhisperResponse {
  upcoming: UpcomingEarnings[];
  recentResults: RecentResult[];
  seasonStats: SeasonStats;
  summary: WhisperSummary;
}

// ── Cache ──

let cachedData: { data: EarningsWhisperResponse; ts: number } | null = null;
let staleData: EarningsWhisperResponse | null = null;
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Stock Definitions ──

const UPCOMING_STOCKS: StockDef[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', baseEps: 1.53, baseRevenue: 94.9, marketCap: 3200 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', baseEps: 2.94, baseRevenue: 62.0, marketCap: 3100 },
  { ticker: 'GOOG', name: 'Alphabet Inc.', sector: 'Technology', baseEps: 1.89, baseRevenue: 86.3, marketCap: 2100 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', baseEps: 1.14, baseRevenue: 170.0, marketCap: 2000 },
  { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', baseEps: 5.33, baseRevenue: 40.6, marketCap: 1500 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', baseEps: 0.81, baseRevenue: 35.1, marketCap: 3400 },
  { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', baseEps: 0.71, baseRevenue: 25.5, marketCap: 800 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', baseEps: 4.37, baseRevenue: 41.3, marketCap: 600 },
  { ticker: 'BAC', name: 'Bank of America Corp.', sector: 'Financials', baseEps: 0.83, baseRevenue: 25.5, marketCap: 330 },
  { ticker: 'GS', name: 'Goldman Sachs Group', sector: 'Financials', baseEps: 8.22, baseRevenue: 12.7, marketCap: 170 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', baseEps: 2.71, baseRevenue: 22.5, marketCap: 380 },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', baseEps: 6.91, baseRevenue: 99.8, marketCap: 520 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', baseEps: 2.14, baseRevenue: 90.0, marketCap: 460 },
  { ticker: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Staples', baseEps: 1.68, baseRevenue: 21.4, marketCap: 390 },
  { ticker: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary', baseEps: 3.63, baseRevenue: 37.7, marketCap: 370 },
];

const RECENT_STOCKS: StockDef[] = [
  { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', baseEps: 1.80, baseRevenue: 164.0, marketCap: 580 },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', baseEps: 2.39, baseRevenue: 9.0, marketCap: 550 },
  { ticker: 'MA', name: 'Mastercard Inc.', sector: 'Financials', baseEps: 3.18, baseRevenue: 6.9, marketCap: 420 },
  { ticker: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', baseEps: 2.41, baseRevenue: 9.4, marketCap: 290 },
  { ticker: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', baseEps: 3.79, baseRevenue: 60.0, marketCap: 380 },
  { ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', baseEps: 2.97, baseRevenue: 14.3, marketCap: 310 },
  { ticker: 'LLY', name: 'Eli Lilly & Co.', sector: 'Healthcare', baseEps: 3.06, baseRevenue: 11.3, marketCap: 750 },
  { ticker: 'ORCL', name: 'Oracle Corp.', sector: 'Technology', baseEps: 1.47, baseRevenue: 14.1, marketCap: 340 },
  { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', baseEps: 4.88, baseRevenue: 10.2, marketCap: 310 },
  { ticker: 'DIS', name: 'Walt Disney Co.', sector: 'Communication Services', baseEps: 1.22, baseRevenue: 23.5, marketCap: 200 },
];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function getReportDates(rng: () => number): string[] {
  const now = new Date();
  const monday = new Date(now);
  const dayOfWeek = monday.getDay();
  const diff = dayOfWeek === 0 ? 1 : dayOfWeek === 6 ? 2 : (1 - dayOfWeek + 7) % 7 || 0;
  monday.setDate(monday.getDate() + diff);

  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function generateUpcoming(rng: () => number): UpcomingEarnings[] {
  const weekDates = getReportDates(rng);

  return UPCOMING_STOCKS.map((stock, idx) => {
    const reportDate = weekDates[idx % 5];
    const reportTime: 'BMO' | 'AMC' = rng() > 0.5 ? 'BMO' : 'AMC';

    // Consensus EPS with slight daily variation
    const epsVariation = 1 + (rng() - 0.5) * 0.06;
    const consensusEps = round2(stock.baseEps * epsVariation);

    // Whisper differs from consensus by +-2-5%
    const whisperDirection = rng() > 0.4 ? 1 : -1;
    const whisperPctDiff = 0.02 + rng() * 0.03;
    const whisperEps = round2(consensusEps * (1 + whisperDirection * whisperPctDiff));
    const whisperVsConsensus = round2(((whisperEps - consensusEps) / Math.abs(consensusEps)) * 100);

    // Revenue consensus and whisper
    const revVariation = 1 + (rng() - 0.5) * 0.04;
    const revenueConsensus = round1(stock.baseRevenue * revVariation);
    const revWhisperDir = rng() > 0.45 ? 1 : -1;
    const revWhisperPct = 0.01 + rng() * 0.025;
    const revenueWhisper = round1(revenueConsensus * (1 + revWhisperDir * revWhisperPct));

    // Historical beat rate: typically 60-85%
    const historicalBeatRate = round1(60 + rng() * 25);

    // Average surprise: typically 2-10%
    const avgSurprise = round2(2 + rng() * 8);

    // Implied move: typically 2-10%, higher for tech/growth
    const sectorMultiplier = ['Technology', 'Consumer Discretionary'].includes(stock.sector) ? 1.3 : 1.0;
    const impliedMove = round1((2 + rng() * 6) * sectorMultiplier);

    // Previous quarter surprise
    const prevQuarterSurprise = round2((rng() - 0.3) * 15);

    // Analyst count: 15-45
    const analystCount = Math.floor(15 + rng() * 30);

    // High/low estimates
    const spreadPct = 0.08 + rng() * 0.12;
    const highEst = round2(consensusEps * (1 + spreadPct));
    const lowEst = round2(consensusEps * (1 - spreadPct));

    return {
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      reportDate,
      reportTime,
      consensusEps,
      whisperEps,
      revenueConsensus,
      revenueWhisper,
      whisperVsConsensus,
      historicalBeatRate,
      avgSurprise,
      impliedMove,
      prevQuarterSurprise,
      analystCount,
      highEst,
      lowEst,
    };
  });
}

function generateRecentResults(rng: () => number): RecentResult[] {
  return RECENT_STOCKS.map((stock) => {
    // Consensus EPS
    const epsVariation = 1 + (rng() - 0.5) * 0.06;
    const consensusEps = round2(stock.baseEps * epsVariation);

    // Reported EPS: most companies beat (about 70%)
    const beatOrMiss = rng();
    let surprisePct: number;
    if (beatOrMiss < 0.70) {
      // Beat
      surprisePct = 1 + rng() * 12;
    } else if (beatOrMiss < 0.85) {
      // Inline
      surprisePct = (rng() - 0.5) * 2;
    } else {
      // Miss
      surprisePct = -(1 + rng() * 10);
    }
    const reportedEps = round2(consensusEps * (1 + surprisePct / 100));
    const surprise = round2(((reportedEps - consensusEps) / Math.abs(consensusEps)) * 100);

    // Revenue
    const revVariation = 1 + (rng() - 0.5) * 0.04;
    const revenueConsensus = round1(stock.baseRevenue * revVariation);
    const revBeat = rng();
    let revSurprisePct: number;
    if (revBeat < 0.65) {
      revSurprisePct = 0.5 + rng() * 4;
    } else if (revBeat < 0.85) {
      revSurprisePct = (rng() - 0.5) * 1;
    } else {
      revSurprisePct = -(0.5 + rng() * 3);
    }
    const revenueReported = round1(revenueConsensus * (1 + revSurprisePct / 100));
    const revenueSurprise = round2(((revenueReported - revenueConsensus) / revenueConsensus) * 100);

    // Stock reaction: correlated with surprise but not perfectly
    const baseReaction = surprise * 0.3 + (rng() - 0.5) * 6;
    const reaction = round2(baseReaction);

    // Guidance
    const guidanceRoll = rng();
    let guidance: 'Above' | 'Inline' | 'Below';
    if (guidanceRoll < 0.35) guidance = 'Above';
    else if (guidanceRoll < 0.7) guidance = 'Inline';
    else guidance = 'Below';

    return {
      ticker: stock.ticker,
      name: stock.name,
      reportedEps,
      consensusEps,
      surprise,
      revenueReported,
      revenueConsensus,
      revenueSurprise,
      reaction,
      guidance,
    };
  });
}

function generateSeasonStats(recentResults: RecentResult[], rng: () => number): SeasonStats {
  const totalReported = Math.floor(280 + rng() * 120);

  // Derive rates from a larger simulated population
  const beatRate = round1(68 + rng() * 10);
  const missRate = round1(100 - beatRate - (5 + rng() * 8));
  const inlineRate = round1(100 - beatRate - missRate);

  // Average surprise
  const avgSurprise = round2(3 + rng() * 5);

  // Median reaction: slight positive bias during earnings season
  const medianReaction = round2((rng() - 0.3) * 3);

  // Revenue beat rate
  const revenueBeatRate = round1(58 + rng() * 12);

  return {
    totalReported,
    beatRate,
    missRate,
    inlineRate,
    avgSurprise,
    medianReaction,
    revenueBeatRate,
  };
}

function generateSummary(upcoming: UpcomingEarnings[]): WhisperSummary {
  const upcomingCount = upcoming.length;

  const avgImpliedMove = round2(
    upcoming.reduce((sum, s) => sum + s.impliedMove, 0) / upcoming.length,
  );

  let highestTicker = upcoming[0].ticker;
  let highestMove = upcoming[0].impliedMove;
  for (const s of upcoming) {
    if (s.impliedMove > highestMove) {
      highestMove = s.impliedMove;
      highestTicker = s.ticker;
    }
  }

  const avgWhisperVsConsensus = round2(
    upcoming.reduce((sum, s) => sum + s.whisperVsConsensus, 0) / upcoming.length,
  );

  // Sum market caps of the 15 upcoming reporters (in $B -> convert to $T)
  const totalMarketCapB = UPCOMING_STOCKS.reduce((sum, s) => sum + s.marketCap, 0);
  const marketCapReporting = round1(totalMarketCapB / 1000);

  return {
    upcomingCount,
    avgImpliedMove,
    highestImpliedMove: { ticker: highestTicker, move: highestMove },
    avgWhisperVsConsensus,
    marketCapReporting,
  };
}

function buildEarningsWhisperData(): EarningsWhisperResponse {
  const rng = seededRandom('earnings-whisper');

  const upcoming = generateUpcoming(rng);
  const recentResults = generateRecentResults(rng);
  const seasonStats = generateSeasonStats(recentResults, rng);
  const summary = generateSummary(upcoming);

  return { upcoming, recentResults, seasonStats, summary };
}

// ── Route ──

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cachedData.ts < CACHE_TTL) {
      res.json(cachedData.data);
      return;
    }

    // Generate fresh data
    const data = buildEarningsWhisperData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[EarningsWhisper] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate earnings whisper data' });
  }
});

export default router;
