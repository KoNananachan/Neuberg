import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

type TrendVsPrev = 'STRONGER' | 'INLINE' | 'WEAKER';
type Liquidity = 'HIGH' | 'MEDIUM' | 'LOW';
type EstimatedDemand = 'STRONG' | 'MODERATE' | 'WEAK';

interface RecentAuctionEntry {
  tenor: string;
  auctionDate: string;
  highYield: number;        // %
  bidToCover: number;
  allotmentRatio: number;   // %
  directBidPct: number;     // %
  indirectBidPct: number;   // %
  dealerPct: number;        // %
  tailBps: number;          // auction yield - when-issued yield, in bps
  trendVsPrev: TrendVsPrev;
}

interface OnOffRunEntry {
  tenor: string;
  onTheRunYield: number;    // %
  offTheRunYield: number;   // %
  spread: number;           // bps
  onTheRunCusip: string;
  onTheRunMaturity: string;
  liquidity: Liquidity;
}

interface UpcomingAuctionEntry {
  tenor: string;
  auctionDate: string;
  announcedSize: number;    // $B
  prevBidToCover: number;
  prevTail: number;         // bps
  estimatedDemand: EstimatedDemand;
}

interface TreasuryAnalyticsSummary {
  totalIssuanceThisWeek: number; // $B
  avgBidToCover: number;
  avgTail: number;               // bps
  strongestTenor: string;
  weakestTenor: string;
  timestamp: string;
}

interface TreasuryAnalyticsResponse {
  recentAuctions: RecentAuctionEntry[];
  onOffRun: OnOffRunEntry[];
  upcomingAuctions: UpcomingAuctionEntry[];
  summary: TreasuryAnalyticsSummary;
}

// ── Cache ──

let cache: { data: TreasuryAnalyticsResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Configuration ──

interface RecentAuctionConfig {
  tenor: string;
  baseHighYield: number;
  baseBidToCover: number;
  baseAllotment: number;
  baseDirectPct: number;
  baseIndirectPct: number;
  daysAgo: number;
}

const RECENT_AUCTION_CONFIGS: RecentAuctionConfig[] = [
  { tenor: '4W',  baseHighYield: 4.250, baseBidToCover: 2.98, baseAllotment: 83.2, baseDirectPct: 18.5, baseIndirectPct: 62.4, daysAgo: 1 },
  { tenor: '8W',  baseHighYield: 4.280, baseBidToCover: 2.85, baseAllotment: 81.7, baseDirectPct: 17.8, baseIndirectPct: 64.1, daysAgo: 1 },
  { tenor: '13W', baseHighYield: 4.310, baseBidToCover: 2.92, baseAllotment: 84.5, baseDirectPct: 19.2, baseIndirectPct: 60.8, daysAgo: 2 },
  { tenor: '26W', baseHighYield: 4.350, baseBidToCover: 2.78, baseAllotment: 86.1, baseDirectPct: 16.4, baseIndirectPct: 65.3, daysAgo: 2 },
  { tenor: '2Y',  baseHighYield: 4.120, baseBidToCover: 2.65, baseAllotment: 88.4, baseDirectPct: 21.3, baseIndirectPct: 58.7, daysAgo: 3 },
  { tenor: '5Y',  baseHighYield: 4.080, baseBidToCover: 2.48, baseAllotment: 85.6, baseDirectPct: 19.8, baseIndirectPct: 63.5, daysAgo: 4 },
  { tenor: '10Y', baseHighYield: 4.310, baseBidToCover: 2.53, baseAllotment: 87.2, baseDirectPct: 17.6, baseIndirectPct: 66.2, daysAgo: 5 },
  { tenor: '30Y', baseHighYield: 4.520, baseBidToCover: 2.39, baseAllotment: 82.8, baseDirectPct: 15.9, baseIndirectPct: 69.1, daysAgo: 6 },
];

interface OnOffRunConfig {
  tenor: string;
  baseOnTheRunYield: number;
  baseSpreadBps: number;
  cusip: string;
  maturityDate: string;
}

const ON_OFF_RUN_CONFIGS: OnOffRunConfig[] = [
  { tenor: '2Y',  baseOnTheRunYield: 4.125, baseSpreadBps: 1.8,  cusip: '91282CKL5', maturityDate: '2028-03-31' },
  { tenor: '3Y',  baseOnTheRunYield: 4.095, baseSpreadBps: 2.2,  cusip: '91282CKN1', maturityDate: '2029-03-15' },
  { tenor: '5Y',  baseOnTheRunYield: 4.080, baseSpreadBps: 3.5,  cusip: '91282CJN3', maturityDate: '2031-03-15' },
  { tenor: '7Y',  baseOnTheRunYield: 4.185, baseSpreadBps: 4.8,  cusip: '91282CJQ6', maturityDate: '2033-03-15' },
  { tenor: '10Y', baseOnTheRunYield: 4.315, baseSpreadBps: 5.2,  cusip: '91282CHZ7', maturityDate: '2036-02-15' },
  { tenor: '30Y', baseOnTheRunYield: 4.525, baseSpreadBps: 8.5,  cusip: '912810TN8', maturityDate: '2056-02-15' },
];

interface UpcomingAuctionConfig {
  tenor: string;
  daysUntil: number;
  announcedSize: number;    // $B
  prevBidToCover: number;
  prevTail: number;         // bps
}

const UPCOMING_AUCTION_CONFIGS: UpcomingAuctionConfig[] = [
  { tenor: '52W', daysUntil: 1,  announcedSize: 46.0, prevBidToCover: 2.71, prevTail: 0.3 },
  { tenor: '2Y',  daysUntil: 2,  announcedSize: 69.0, prevBidToCover: 2.65, prevTail: 0.5 },
  { tenor: '5Y',  daysUntil: 3,  announcedSize: 70.0, prevBidToCover: 2.48, prevTail: 0.8 },
  { tenor: '7Y',  daysUntil: 4,  announcedSize: 44.0, prevBidToCover: 2.52, prevTail: 1.1 },
  { tenor: '20Y', daysUntil: 6,  announcedSize: 16.0, prevBidToCover: 2.34, prevTail: 1.5 },
  { tenor: '30Y', daysUntil: 7,  announcedSize: 22.0, prevBidToCover: 2.39, prevTail: 1.8 },
];

// ── Data generation ──

function generateRecentAuctions(rng: () => number): RecentAuctionEntry[] {
  const today = new Date();

  return RECENT_AUCTION_CONFIGS.map((cfg) => {
    const auctionDate = new Date(today);
    auctionDate.setDate(auctionDate.getDate() - cfg.daysAgo);
    // Skip weekends
    while (auctionDate.getDay() === 0 || auctionDate.getDay() === 6) {
      auctionDate.setDate(auctionDate.getDate() - 1);
    }

    const yieldJitter = (rng() - 0.5) * 0.06;
    const highYield = Math.round((cfg.baseHighYield + yieldJitter) * 1000) / 1000;

    const btcJitter = (rng() - 0.5) * 0.30;
    const bidToCover = Math.round((cfg.baseBidToCover + btcJitter) * 100) / 100;

    const allotJitter = (rng() - 0.5) * 4.0;
    const allotmentRatio = Math.round((cfg.baseAllotment + allotJitter) * 10) / 10;

    const directJitter = (rng() - 0.5) * 4.0;
    const directBidPct = Math.round((cfg.baseDirectPct + directJitter) * 10) / 10;

    const indirectJitter = (rng() - 0.5) * 5.0;
    const indirectBidPct = Math.round((cfg.baseIndirectPct + indirectJitter) * 10) / 10;

    // Dealer percentage is the remainder
    const dealerPct = Math.round((100 - directBidPct - indirectBidPct) * 10) / 10;

    // Tail: difference between auction high yield and when-issued yield, in bps
    // Positive tail = weak auction, negative tail = strong auction
    const tailBps = Math.round(((rng() - 0.45) * 3.0) * 10) / 10;

    // Trend vs previous auction
    let trendVsPrev: TrendVsPrev;
    const trendRoll = rng();
    if (trendRoll < 0.35) {
      trendVsPrev = 'STRONGER';
    } else if (trendRoll < 0.65) {
      trendVsPrev = 'INLINE';
    } else {
      trendVsPrev = 'WEAKER';
    }

    return {
      tenor: cfg.tenor,
      auctionDate: auctionDate.toISOString().slice(0, 10),
      highYield,
      bidToCover,
      allotmentRatio,
      directBidPct,
      indirectBidPct,
      dealerPct,
      tailBps,
      trendVsPrev,
    };
  });
}

function generateOnOffRun(rng: () => number): OnOffRunEntry[] {
  return ON_OFF_RUN_CONFIGS.map((cfg) => {
    const yieldJitter = (rng() - 0.5) * 0.08;
    const onTheRunYield = Math.round((cfg.baseOnTheRunYield + yieldJitter) * 1000) / 1000;

    const spreadJitter = (rng() - 0.5) * 2.0;
    const spread = Math.round((cfg.baseSpreadBps + spreadJitter) * 10) / 10;

    const offTheRunYield = Math.round((onTheRunYield + spread / 100) * 1000) / 1000;

    // Liquidity: shorter tenors and benchmarks have higher liquidity
    let liquidity: Liquidity;
    if (cfg.tenor === '2Y' || cfg.tenor === '10Y') {
      liquidity = 'HIGH';
    } else if (cfg.tenor === '5Y' || cfg.tenor === '30Y') {
      const liqRoll = rng();
      liquidity = liqRoll < 0.6 ? 'HIGH' : 'MEDIUM';
    } else {
      const liqRoll = rng();
      liquidity = liqRoll < 0.3 ? 'HIGH' : liqRoll < 0.7 ? 'MEDIUM' : 'LOW';
    }

    return {
      tenor: cfg.tenor,
      onTheRunYield,
      offTheRunYield,
      spread,
      onTheRunCusip: cfg.cusip,
      onTheRunMaturity: cfg.maturityDate,
      liquidity,
    };
  });
}

function generateUpcomingAuctions(rng: () => number): UpcomingAuctionEntry[] {
  const today = new Date();

  return UPCOMING_AUCTION_CONFIGS.map((cfg) => {
    const auctionDate = new Date(today);
    auctionDate.setDate(auctionDate.getDate() + cfg.daysUntil);
    // Skip weekends forward
    while (auctionDate.getDay() === 0 || auctionDate.getDay() === 6) {
      auctionDate.setDate(auctionDate.getDate() + 1);
    }

    const sizeJitter = (rng() - 0.5) * 2.0;
    const announcedSize = Math.round((cfg.announcedSize + sizeJitter) * 10) / 10;

    const btcJitter = (rng() - 0.5) * 0.20;
    const prevBidToCover = Math.round((cfg.prevBidToCover + btcJitter) * 100) / 100;

    const tailJitter = (rng() - 0.5) * 1.0;
    const prevTail = Math.round((cfg.prevTail + tailJitter) * 10) / 10;

    // Estimated demand based on previous metrics
    let estimatedDemand: EstimatedDemand;
    if (prevBidToCover > 2.60 && prevTail < 0.5) {
      estimatedDemand = 'STRONG';
    } else if (prevBidToCover < 2.40 || prevTail > 1.5) {
      estimatedDemand = 'WEAK';
    } else {
      estimatedDemand = 'MODERATE';
    }

    return {
      tenor: cfg.tenor,
      auctionDate: auctionDate.toISOString().slice(0, 10),
      announcedSize,
      prevBidToCover,
      prevTail,
      estimatedDemand,
    };
  });
}

function generateTreasuryAnalyticsData(): TreasuryAnalyticsResponse {
  const rng = seededRandom('treasury-analytics');

  const recentAuctions = generateRecentAuctions(rng);
  const onOffRun = generateOnOffRun(rng);
  const upcomingAuctions = generateUpcomingAuctions(rng);

  // Summary calculations
  const totalIssuanceThisWeek = Math.round(
    upcomingAuctions.reduce((sum, a) => sum + a.announcedSize, 0) * 10
  ) / 10;

  const avgBidToCover = Math.round(
    (recentAuctions.reduce((sum, a) => sum + a.bidToCover, 0) / recentAuctions.length) * 100
  ) / 100;

  const avgTail = Math.round(
    (recentAuctions.reduce((sum, a) => sum + a.tailBps, 0) / recentAuctions.length) * 10
  ) / 10;

  // Strongest tenor = lowest tail (most through), weakest = highest tail
  const sorted = [...recentAuctions].sort((a, b) => a.tailBps - b.tailBps);
  const strongestTenor = sorted[0].tenor;
  const weakestTenor = sorted[sorted.length - 1].tenor;

  const summary: TreasuryAnalyticsSummary = {
    totalIssuanceThisWeek,
    avgBidToCover,
    avgTail,
    strongestTenor,
    weakestTenor,
    timestamp: new Date().toISOString(),
  };

  return { recentAuctions, onOffRun, upcomingAuctions, summary };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateTreasuryAnalyticsData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TreasuryAnalytics] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate treasury analytics data' });
  }
});

export default router;
