import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

const DEAL_TYPES = ['IPO', 'Follow-On', 'Secondary', 'Block Trade', 'Convertible', 'SPAC'] as const;
const EXCHANGES = ['NYSE', 'NASDAQ'] as const;
const BOOKRUNNERS = ['GS', 'MS', 'JPM', 'BAC', 'Citi'] as const;
const PIPELINE_STATUSES = ['Filed', 'Roadshow', 'Priced', 'Withdrawn'] as const;
const SECTORS = ['Technology', 'Healthcare', 'Financials', 'Consumer', 'Energy', 'Industrials'] as const;

type DealType = typeof DEAL_TYPES[number];
type Exchange = typeof EXCHANGES[number];
type Bookrunner = typeof BOOKRUNNERS[number];
type PipelineStatus = typeof PIPELINE_STATUSES[number];
type Sector = typeof SECTORS[number];

interface RecentDeal {
  company: string;
  ticker: string;
  dealType: DealType;
  size: number;
  pricingDate: string;
  offerPrice: number;
  currentPrice: number;
  returnFromOffer: number;
  sector: Sector;
  exchange: Exchange;
  leadBookrunner: Bookrunner;
  oversubscription: number;
  lockupExpiry: string;
}

interface PipelineDeal {
  company: string;
  dealType: DealType;
  expectedSize: number;
  expectedDate: string;
  sector: Sector;
  status: PipelineStatus;
  leadBookrunner: Bookrunner;
}

interface MarketStats {
  ytdIPOCount: number;
  ytdIPOVolume: number;
  ytdFollowOnVolume: number;
  avgFirstDayReturn: number;
  avgReturnFromOffer3M: number;
  withdrawnDeals: number;
  pipelineValue: number;
}

interface SectorBreakdownEntry {
  sector: Sector;
  dealCount: number;
  totalVolume: number;
  avgSize: number;
  avgReturn: number;
  marketShare: number;
}

interface Summary {
  totalDeals: number;
  totalVolume: number;
  largestDeal: string;
  avgReturn: number;
  strongestSector: Sector;
}

interface ECRData {
  recentDeals: RecentDeal[];
  pipeline: PipelineDeal[];
  marketStats: MarketStats;
  sectorBreakdown: SectorBreakdownEntry[];
  summary: Summary;
  generatedAt: string;
}

const RECENT_DEAL_COMPANIES: { company: string; ticker: string; sector: Sector }[] = [
  { company: 'Aethon Robotics Inc', ticker: 'AETH', sector: 'Technology' },
  { company: 'Solaris BioTherapeutics', ticker: 'SLRB', sector: 'Healthcare' },
  { company: 'Pinnacle Fintech Group', ticker: 'PFNG', sector: 'Financials' },
  { company: 'Verdant Clean Energy', ticker: 'VCEN', sector: 'Energy' },
  { company: 'Cascade Consumer Holdings', ticker: 'CSCH', sector: 'Consumer' },
  { company: 'Orion Semiconductor', ticker: 'ORSM', sector: 'Technology' },
  { company: 'Atlas Industrial Systems', ticker: 'ATLS', sector: 'Industrials' },
  { company: 'NovaBridge Health', ticker: 'NVBH', sector: 'Healthcare' },
  { company: 'Zenith Capital Partners', ticker: 'ZNCP', sector: 'Financials' },
  { company: 'TerraPower Renewables', ticker: 'TPWR', sector: 'Energy' },
  { company: 'LuminAI Corp', ticker: 'LMAI', sector: 'Technology' },
  { company: 'Riverton Consumer Brands', ticker: 'RVCB', sector: 'Consumer' },
  { company: 'Stratos Defense Technologies', ticker: 'STDF', sector: 'Industrials' },
  { company: 'Helix Genomics', ticker: 'HLXG', sector: 'Healthcare' },
  { company: 'Quantum Ledger Financial', ticker: 'QLFI', sector: 'Financials' },
  { company: 'Nexgen Materials Inc', ticker: 'NXGM', sector: 'Industrials' },
];

const PIPELINE_COMPANIES: { company: string; sector: Sector }[] = [
  { company: 'Crestline AI Systems', sector: 'Technology' },
  { company: 'Meridian Oncology', sector: 'Healthcare' },
  { company: 'Vanguard Digital Bank', sector: 'Financials' },
  { company: 'SummitPeak Energy', sector: 'Energy' },
  { company: 'Ironforge Industrial', sector: 'Industrials' },
  { company: 'Brightpath Consumer Co', sector: 'Consumer' },
  { company: 'Catalyx Therapeutics', sector: 'Healthcare' },
  { company: 'Prism Cloud Infrastructure', sector: 'Technology' },
  { company: 'Keystone Finserv', sector: 'Financials' },
  { company: 'Titanium Alloy Corp', sector: 'Industrials' },
  { company: 'GreenVolt Solutions', sector: 'Energy' },
  { company: 'Arcanium Semiconductor', sector: 'Technology' },
];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: ECRData; ts: number } | null = null;

function generate(): ECRData {
  const rng = seededRandom('ecr');
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // --- Recent Deals (12 entries) ---
  const shuffledRecent = [...RECENT_DEAL_COMPANIES].sort(() => rng() - 0.5).slice(0, 12);
  const recentDeals: RecentDeal[] = shuffledRecent.map((co) => {
    const dealType = pick(DEAL_TYPES);
    const baseSize = dealType === 'IPO' ? 600 + rng() * 2400
      : dealType === 'SPAC' ? 200 + rng() * 600
      : dealType === 'Block Trade' ? 300 + rng() * 1500
      : dealType === 'Convertible' ? 400 + rng() * 1200
      : 200 + rng() * 1800;
    const size = Math.round(baseSize);

    const daysAgo = Math.floor(rng() * 45) + 1;
    const pricingDate = new Date();
    pricingDate.setDate(pricingDate.getDate() - daysAgo);

    const offerPrice = round2(15 + rng() * 85);
    const returnPct = round2(-12 + rng() * 40);
    const currentPrice = round2(offerPrice * (1 + returnPct / 100));

    const oversubscription = round2(1.2 + rng() * 9.8);

    const lockupDaysFromPricing = 90 + Math.floor(rng() * 90);
    const lockupExpiry = new Date(pricingDate);
    lockupExpiry.setDate(lockupExpiry.getDate() + lockupDaysFromPricing);

    return {
      company: co.company,
      ticker: co.ticker,
      dealType,
      size,
      pricingDate: pricingDate.toISOString().slice(0, 10),
      offerPrice,
      currentPrice,
      returnFromOffer: returnPct,
      sector: co.sector,
      exchange: pick(EXCHANGES),
      leadBookrunner: pick(BOOKRUNNERS),
      oversubscription,
      lockupExpiry: lockupExpiry.toISOString().slice(0, 10),
    };
  });

  // --- Pipeline (8 entries) ---
  const shuffledPipeline = [...PIPELINE_COMPANIES].sort(() => rng() - 0.5).slice(0, 8);
  const pipeline: PipelineDeal[] = shuffledPipeline.map((co) => {
    const dealType = pick(DEAL_TYPES);
    const expectedSize = Math.round(150 + rng() * 2850);

    const daysAhead = Math.floor(rng() * 60) + 5;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + daysAhead);

    const status = pick(PIPELINE_STATUSES);

    return {
      company: co.company,
      dealType,
      expectedSize,
      expectedDate: expectedDate.toISOString().slice(0, 10),
      sector: co.sector,
      status,
      leadBookrunner: pick(BOOKRUNNERS),
    };
  });

  // --- Market Stats ---
  const ytdIPOCount = Math.round(55 + rng() * 70);
  const ytdIPOVolume = round2(jitter(48, 0.3));
  const ytdFollowOnVolume = round2(jitter(72, 0.25));
  const avgFirstDayReturn = round2(jitter(14, 0.4));
  const avgReturnFromOffer3M = round2(jitter(8, 0.5));
  const withdrawnDeals = Math.round(5 + rng() * 15);
  const pipelineValue = round2(jitter(32, 0.35));

  const marketStats: MarketStats = {
    ytdIPOCount,
    ytdIPOVolume,
    ytdFollowOnVolume,
    avgFirstDayReturn,
    avgReturnFromOffer3M,
    withdrawnDeals,
    pipelineValue,
  };

  // --- Sector Breakdown (6 sectors) ---
  const rawSectorData = SECTORS.map((sector) => {
    const dealCount = Math.round(8 + rng() * 30);
    const totalVolume = round2(jitter(12, 0.6));
    const avgSize = Math.round(totalVolume * 1000 / Math.max(dealCount, 1));
    const avgReturn = round2(-5 + rng() * 25);
    return { sector, dealCount, totalVolume, avgSize, avgReturn, marketShare: 0 };
  });

  const totalVol = rawSectorData.reduce((sum, s) => sum + s.totalVolume, 0);
  const sectorBreakdown: SectorBreakdownEntry[] = rawSectorData.map((s) => ({
    ...s,
    marketShare: round2((s.totalVolume / totalVol) * 100),
  }));

  // --- Summary ---
  const totalDeals = recentDeals.length + pipeline.filter((p) => p.status === 'Priced').length;
  const totalVolume = round2(recentDeals.reduce((sum, d) => sum + d.size, 0) / 1000);
  const largest = recentDeals.reduce((max, d) => d.size > max.size ? d : max, recentDeals[0]);
  const avgReturn = round2(recentDeals.reduce((sum, d) => sum + d.returnFromOffer, 0) / recentDeals.length);

  const strongestEntry = sectorBreakdown.reduce((best, s) => s.avgReturn > best.avgReturn ? s : best, sectorBreakdown[0]);

  const summary: Summary = {
    totalDeals,
    totalVolume,
    largestDeal: `${largest.company} ($${largest.size}M)`,
    avgReturn,
    strongestSector: strongestEntry.sector,
  };

  return {
    recentDeals,
    pipeline,
    marketStats,
    sectorBreakdown,
    summary,
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
    console.error('[ECR] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity capital raise data' });
  }
});

export default router;
