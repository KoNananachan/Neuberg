import { Router } from 'express';

const router = Router();

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
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

interface RecentAuction {
  security: string;
  auctionDate: string;
  size: number;
  highYield: number;
  bidToCover: number;
  allotmentPct: number;
  tailBps: number;
  primaryDealerPct: number;
  directBidPct: number;
  indirectBidPct: number;
  grade: 'strong' | 'average' | 'weak';
}

interface UpcomingAuction {
  security: string;
  date: string;
  estimatedSize: number;
  whenIssued: number;
  previousYield: number;
  previousBTC: number;
}

interface DemandMetrics {
  avgBidToCover3M: number;
  foreignDemand: number;
  primaryDealerShare: number;
  directBidderShare: number;
  indirectBidderShare: number;
}

interface IssuanceSchedule {
  totalIssuanceYTD: number;
  netIssuance: number;
  avgWeeklyBillIssuance: number;
  avgWeeklyNoteIssuance: number;
  quarterlyRefunding: number;
}

interface TailAnalysis {
  maturity: string;
  avgTail3M: number;
  maxTail3M: number;
  stopOutRate: number;
  trend: 'improving' | 'stable' | 'deteriorating';
}

interface ForeignHolding {
  country: string;
  holdings: number;
  change1M: number;
  share: number;
}

interface TreasuryAuctionResponse {
  recentAuctions: RecentAuction[];
  upcomingAuctions: UpcomingAuction[];
  demandMetrics: DemandMetrics;
  issuanceSchedule: IssuanceSchedule;
  tailAnalysis: TailAnalysis[];
  foreignHoldings: ForeignHolding[];
  generatedAt: string;
}

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: TreasuryAuctionResponse; ts: number } | null = null;

const SECURITIES = [
  { name: '2Y Note', type: 'note' },
  { name: '3Y Note', type: 'note' },
  { name: '5Y Note', type: 'note' },
  { name: '7Y Note', type: 'note' },
  { name: '10Y Note', type: 'note' },
  { name: '20Y Bond', type: 'bond' },
  { name: '30Y Bond', type: 'bond' },
  { name: '3M Bill', type: 'bill' },
] as const;

const UPCOMING_SECURITIES = ['5Y Note', '10Y Note', '30Y Bond', '3M Bill'];

const TAIL_MATURITIES = ['2Y', '5Y', '10Y', '20Y', '30Y'];

const FOREIGN_HOLDERS = [
  { country: 'Japan', baseHoldings: 1100 },
  { country: 'China', baseHoldings: 770 },
  { country: 'United Kingdom', baseHoldings: 700 },
  { country: 'Luxembourg', baseHoldings: 400 },
  { country: 'Cayman Islands', baseHoldings: 320 },
];

function generate(): TreasuryAuctionResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('treasury-auction-' + today));

  // Generate recent auctions
  const recentAuctions: RecentAuction[] = SECURITIES.map((sec) => {
    const daysAgo = Math.floor(rng() * 14);
    const auctionDate = new Date();
    auctionDate.setDate(auctionDate.getDate() - daysAgo);

    let sizeMin: number, sizeMax: number;
    if (sec.type === 'bill') { sizeMin = 50; sizeMax = 80; }
    else if (sec.type === 'note') { sizeMin = 40; sizeMax = 65; }
    else { sizeMin = 16; sizeMax = 25; }
    const size = round(sizeMin + rng() * (sizeMax - sizeMin), 1);

    const highYield = round(clamp(3.5 + (rng() - 0.5) * 3, 0.5, 6.0), 3);
    const bidToCover = round(clamp(1.8 + rng() * 1.4, 1.8, 3.2), 2);
    const allotmentPct = round(clamp(20 + rng() * 60, 15, 85), 1);
    const tailBps = round(clamp(-1 + rng() * 4, -1, 3), 1);

    const indirectBidPct = round(clamp(55 + rng() * 20, 55, 75), 1);
    const directBidPct = round(clamp(15 + rng() * 15, 15, 30), 1);
    const primaryDealerPct = round(100 - indirectBidPct - directBidPct, 1);

    let grade: 'strong' | 'average' | 'weak';
    if (bidToCover > 2.7 && tailBps < 0.5) grade = 'strong';
    else if (bidToCover < 2.2 || tailBps > 2.0) grade = 'weak';
    else grade = 'average';

    return {
      security: sec.name,
      auctionDate: auctionDate.toISOString().slice(0, 10),
      size,
      highYield,
      bidToCover,
      allotmentPct,
      tailBps,
      primaryDealerPct,
      directBidPct,
      indirectBidPct,
      grade,
    };
  });

  // Generate upcoming auctions
  const upcomingAuctions: UpcomingAuction[] = UPCOMING_SECURITIES.map((sec) => {
    const daysAhead = 1 + Math.floor(rng() * 10);
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);

    const isBill = sec.includes('Bill');
    const estimatedSize = round(isBill ? 50 + rng() * 30 : 35 + rng() * 30, 1);
    const whenIssued = round(clamp(3.0 + (rng() - 0.5) * 3, 0.5, 6.0), 3);
    const previousYield = round(clamp(whenIssued + (rng() - 0.5) * 0.3, 0.5, 6.0), 3);
    const previousBTC = round(clamp(1.8 + rng() * 1.4, 1.8, 3.2), 2);

    return {
      security: sec,
      date: date.toISOString().slice(0, 10),
      estimatedSize,
      whenIssued,
      previousYield,
      previousBTC,
    };
  });

  // Demand metrics
  const indirectBidderShare = round(clamp(55 + rng() * 20, 55, 75), 1);
  const directBidderShare = round(clamp(15 + rng() * 15, 15, 30), 1);
  const primaryDealerShare = round(clamp(100 - indirectBidderShare - directBidderShare, 10, 25), 1);
  const demandMetrics: DemandMetrics = {
    avgBidToCover3M: round(clamp(2.2 + rng() * 0.8, 2.0, 3.2), 2),
    foreignDemand: round(clamp(25 + rng() * 15, 25, 40), 1),
    primaryDealerShare,
    directBidderShare,
    indirectBidderShare,
  };

  // Issuance schedule
  const issuanceSchedule: IssuanceSchedule = {
    totalIssuanceYTD: round(clamp(2.5 + rng() * 2.5, 2.0, 5.5), 2),
    netIssuance: round(clamp(0.5 + rng() * 1.5, 0.3, 2.5), 2),
    avgWeeklyBillIssuance: round(clamp(200 + rng() * 150, 180, 380), 0),
    avgWeeklyNoteIssuance: round(clamp(80 + rng() * 60, 70, 150), 0),
    quarterlyRefunding: round(clamp(90 + rng() * 40, 80, 140), 0),
  };

  // Tail analysis
  const trends: Array<'improving' | 'stable' | 'deteriorating'> = ['improving', 'stable', 'deteriorating'];
  const tailAnalysis: TailAnalysis[] = TAIL_MATURITIES.map((maturity) => {
    const avgTail3M = round(clamp(-0.5 + rng() * 2.5, -1, 3), 1);
    const maxTail3M = round(clamp(avgTail3M + rng() * 2, avgTail3M, avgTail3M + 3), 1);
    const stopOutRate = round(clamp(3.0 + (rng() - 0.5) * 3, 1.0, 6.0), 3);
    const trend = trends[Math.floor(rng() * trends.length)];

    return { maturity, avgTail3M, maxTail3M, stopOutRate, trend };
  });

  // Foreign holdings
  let totalHoldings = 0;
  const foreignHoldings: ForeignHolding[] = FOREIGN_HOLDERS.map((holder) => {
    const holdings = round(holder.baseHoldings * (0.92 + rng() * 0.16), 1);
    const change1M = round((rng() - 0.5) * 30, 1);
    totalHoldings += holdings;
    return { country: holder.country, holdings, change1M, share: 0 };
  });
  foreignHoldings.forEach((h) => {
    h.share = round((h.holdings / totalHoldings) * 100, 1);
  });

  return {
    recentAuctions,
    upcomingAuctions,
    demandMetrics,
    issuanceSchedule,
    tailAnalysis,
    foreignHoldings,
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
    console.error('[TreasuryAuction] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate treasury auction data' });
  }
});

export default router;
