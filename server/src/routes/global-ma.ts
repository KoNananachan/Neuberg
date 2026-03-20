import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

type Sector = 'Technology' | 'Healthcare' | 'Energy' | 'Financials' | 'Industrials' | 'Consumer' | 'Real Estate' | 'TMT';
type DealType = 'merger' | 'acquisition' | 'leveraged-buyout' | 'spinoff' | 'carve-out' | 'spac';
type DealStatus = 'announced' | 'pending-regulatory' | 'completed' | 'terminated' | 'hostile';
type PaymentType = 'cash' | 'stock' | 'mixed';

interface YtdSummary {
  totalDealCount: number;
  totalDealValueBillions: number;
  avgDealSizeBillions: number;
  crossBorderPct: number;
  megaDeals10BPlus: number;
  vsLastYearPct: number;
  completionRate: number;
}

interface DealAdvisors {
  acquirerAdvisors: string[];
  targetAdvisors: string[];
}

interface RecentDeal {
  acquirer: string;
  target: string;
  dealValueBillions: number;
  sector: Sector;
  type: DealType;
  status: DealStatus;
  premiumPct: number;
  paymentType: PaymentType;
  announcedDate: string;
  expectedClosing: string;
  advisors: DealAdvisors;
}

interface SectorBreakdown {
  sector: string;
  dealCount: number;
  totalValueBillions: number;
  avgPremiumPct: number;
  avgMultipleEVEBITDA: number;
}

interface AdvisoryLeagueEntry {
  advisor: string;
  dealCount: number;
  totalValueBillions: number;
  marketSharePct: number;
}

interface RegionalActivity {
  region: string;
  dealCount: number;
  totalValueBillions: number;
  topDealInRegion: string;
  crossBorderInflow: number;
  crossBorderOutflow: number;
}

interface DealPipeline {
  pendingDealsCount: number;
  pendingValueBillions: number;
  regulatoryRiskDeals: number;
  sectorHotspots: string[];
}

interface GlobalMaResponse {
  ytdSummary: YtdSummary;
  recentDeals: RecentDeal[];
  sectorBreakdown: SectorBreakdown[];
  advisoryLeagueTables: AdvisoryLeagueEntry[];
  regionalActivity: RegionalActivity[];
  dealPipeline: DealPipeline;
  timestamp: string;
}

// ── Static data pools ──

interface DealDef {
  acquirer: string;
  target: string;
  baseValue: number;
  sector: Sector;
  type: DealType;
  basePremium: number;
}

const DEAL_POOL: DealDef[] = [
  { acquirer: 'Microsoft Corp.', target: 'Palantir Technologies', baseValue: 48.2, sector: 'Technology', type: 'acquisition', basePremium: 35 },
  { acquirer: 'Pfizer Inc.', target: 'BioNTech SE', baseValue: 32.5, sector: 'Healthcare', type: 'merger', basePremium: 28 },
  { acquirer: 'Chevron Corp.', target: 'Pioneer Natural Resources', baseValue: 53.0, sector: 'Energy', type: 'acquisition', basePremium: 18 },
  { acquirer: 'JPMorgan Chase & Co.', target: 'Lazard Ltd.', baseValue: 14.6, sector: 'Financials', type: 'acquisition', basePremium: 22 },
  { acquirer: 'Honeywell International', target: 'Rockwell Collins', baseValue: 21.3, sector: 'Industrials', type: 'merger', basePremium: 30 },
  { acquirer: 'LVMH Moet Hennessy', target: 'Capri Holdings', baseValue: 8.5, sector: 'Consumer', type: 'acquisition', basePremium: 42 },
  { acquirer: 'Blackstone Inc.', target: 'Prologis Inc.', baseValue: 26.7, sector: 'Real Estate', type: 'leveraged-buyout', basePremium: 15 },
  { acquirer: 'Comcast Corp.', target: 'Paramount Global', baseValue: 38.9, sector: 'TMT', type: 'merger', basePremium: 32 },
  { acquirer: 'Broadcom Inc.', target: 'HashiCorp Inc.', baseValue: 6.4, sector: 'Technology', type: 'acquisition', basePremium: 45 },
  { acquirer: 'Johnson & Johnson', target: 'Catalent Inc.', baseValue: 16.2, sector: 'Healthcare', type: 'acquisition', basePremium: 24 },
  { acquirer: 'TotalEnergies SE', target: 'SunPower Corp.', baseValue: 4.8, sector: 'Energy', type: 'acquisition', basePremium: 38 },
  { acquirer: 'Goldman Sachs Group', target: 'Greenhill & Co.', baseValue: 3.2, sector: 'Financials', type: 'acquisition', basePremium: 26 },
  { acquirer: 'KKR & Co.', target: 'Bausch Health Companies', baseValue: 11.8, sector: 'Healthcare', type: 'leveraged-buyout', basePremium: 34 },
  { acquirer: 'Apollo Global Management', target: 'Everi Holdings', baseValue: 5.1, sector: 'Technology', type: 'leveraged-buyout', basePremium: 29 },
  { acquirer: 'Alphabet Inc.', target: 'HubSpot Inc.', baseValue: 22.4, sector: 'Technology', type: 'acquisition', basePremium: 40 },
  { acquirer: 'AbbVie Inc.', target: 'Cerevel Therapeutics', baseValue: 8.7, sector: 'Healthcare', type: 'acquisition', basePremium: 52 },
  { acquirer: 'Exxon Mobil Corp.', target: 'Denbury Inc.', baseValue: 4.9, sector: 'Energy', type: 'acquisition', basePremium: 20 },
  { acquirer: 'Brookfield Asset Management', target: 'American Campus Communities', baseValue: 12.8, sector: 'Real Estate', type: 'leveraged-buyout', basePremium: 17 },
  { acquirer: 'Walt Disney Co.', target: 'Lionsgate Entertainment', baseValue: 7.3, sector: 'TMT', type: 'acquisition', basePremium: 36 },
  { acquirer: 'GE HealthCare Technologies', target: 'Hologic Inc.', baseValue: 18.9, sector: 'Healthcare', type: 'merger', basePremium: 25 },
  { acquirer: 'Siemens AG', target: 'Bentley Systems', baseValue: 15.4, sector: 'Industrials', type: 'acquisition', basePremium: 33 },
  { acquirer: 'Carlyle Group', target: 'ManpowerGroup', baseValue: 9.6, sector: 'Industrials', type: 'leveraged-buyout', basePremium: 27 },
  { acquirer: 'Salesforce Inc.', target: 'Informatica Inc.', baseValue: 11.2, sector: 'Technology', type: 'acquisition', basePremium: 31 },
  { acquirer: 'Warburg Pincus', target: 'Transamerica Life', baseValue: 13.5, sector: 'Financials', type: 'carve-out', basePremium: 12 },
  { acquirer: 'Churchill Capital Corp VII', target: 'Lucid Diagnostics', baseValue: 2.8, sector: 'Healthcare', type: 'spac', basePremium: 48 },
  { acquirer: 'Foley Trasimene Acquisition', target: 'Paysafe Ltd.', baseValue: 3.6, sector: 'Financials', type: 'spac', basePremium: 22 },
  { acquirer: 'Nike Inc.', target: 'On Holding AG', baseValue: 14.1, sector: 'Consumer', type: 'acquisition', basePremium: 38 },
  { acquirer: 'Amazon.com Inc.', target: 'Datadog Inc.', baseValue: 29.5, sector: 'Technology', type: 'acquisition', basePremium: 44 },
  { acquirer: 'ConocoPhillips', target: 'Calvalley Resources', baseValue: 6.7, sector: 'Energy', type: 'acquisition', basePremium: 16 },
  { acquirer: 'Samsung Electronics', target: 'NXP Semiconductors', baseValue: 42.6, sector: 'Technology', type: 'acquisition', basePremium: 37 },
];

const ADVISOR_NAMES = [
  'Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'BofA Securities',
  'Citi', 'Lazard', 'Evercore', 'Rothschild & Co.', 'Barclays', 'UBS',
];

const SECTORS: Sector[] = ['Technology', 'Healthcare', 'Energy', 'Financials', 'Industrials', 'Consumer', 'Real Estate', 'TMT'];
const DEAL_TYPES: DealType[] = ['merger', 'acquisition', 'leveraged-buyout', 'spinoff', 'carve-out', 'spac'];
const DEAL_STATUSES: DealStatus[] = ['announced', 'pending-regulatory', 'completed', 'terminated', 'hostile'];
const PAYMENT_TYPES: PaymentType[] = ['cash', 'stock', 'mixed'];

const SECTOR_DISPLAY: Record<string, string> = {
  'Technology': 'Technology',
  'Healthcare': 'Healthcare/Pharma',
  'Energy': 'Energy',
  'Financials': 'Financial Services',
  'Industrials': 'Industrials',
  'Consumer': 'Consumer/Retail',
  'TMT': 'TMT',
  'Real Estate': 'Real Estate',
};

// ── Helpers ──

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pickN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

// ── Generation functions ──

function generateYtdSummary(rng: () => number): YtdSummary {
  const totalDealCount = 2800 + Math.floor(rng() * 600);
  const totalDealValueBillions = round1(1800 + rng() * 700);
  const avgDealSizeBillions = round2(totalDealValueBillions / totalDealCount);
  const crossBorderPct = round1(28 + rng() * 14);
  const megaDeals10BPlus = 18 + Math.floor(rng() * 12);
  const vsLastYearPct = round1((rng() - 0.4) * 30);
  const completionRate = round1(72 + rng() * 16);

  return {
    totalDealCount,
    totalDealValueBillions,
    avgDealSizeBillions,
    crossBorderPct,
    megaDeals10BPlus,
    vsLastYearPct,
    completionRate,
  };
}

function generateRecentDeals(rng: () => number): RecentDeal[] {
  const today = new Date();
  const count = 15 + Math.floor(rng() * 6); // 15-20
  const selected = pickN(DEAL_POOL, count, rng);
  const deals: RecentDeal[] = [];

  for (const def of selected) {
    const dealValueBillions = round1(def.baseValue * (0.88 + rng() * 0.24));
    const premiumPct = round1(def.basePremium + (rng() - 0.5) * 12);
    const type = rng() < 0.75 ? def.type : pick(DEAL_TYPES, rng);
    const status = pick(DEAL_STATUSES, rng);
    const paymentType = pick(PAYMENT_TYPES, rng);

    // Announced date: 5-200 days ago
    const daysAgo = 5 + Math.floor(rng() * 195);
    const announcedObj = new Date(today);
    announcedObj.setDate(announcedObj.getDate() - daysAgo);

    // Expected closing: 1-12 months from now
    const monthsOut = 1 + Math.floor(rng() * 12);
    const closingObj = new Date(today);
    closingObj.setMonth(closingObj.getMonth() + monthsOut);

    // Advisors: 1-3 per side, no duplicates
    const allAdvisors = pickN(ADVISOR_NAMES, 6, rng);
    const acquirerCount = 1 + Math.floor(rng() * 3);
    const targetCount = 1 + Math.floor(rng() * 3);
    const acquirerAdvisors = allAdvisors.slice(0, acquirerCount);
    const targetAdvisors = allAdvisors.slice(acquirerCount, acquirerCount + targetCount);

    deals.push({
      acquirer: def.acquirer,
      target: def.target,
      dealValueBillions,
      sector: def.sector,
      type,
      status,
      premiumPct,
      paymentType,
      announcedDate: formatDate(announcedObj),
      expectedClosing: formatDate(closingObj),
      advisors: { acquirerAdvisors, targetAdvisors },
    });
  }

  deals.sort((a, b) => b.dealValueBillions - a.dealValueBillions);
  return deals;
}

function generateSectorBreakdown(rng: () => number): SectorBreakdown[] {
  const sectorDefs: { sector: Sector; baseDealCount: number; baseValue: number; basePremium: number; baseMultiple: number }[] = [
    { sector: 'Technology', baseDealCount: 520, baseValue: 480, basePremium: 35, baseMultiple: 22.5 },
    { sector: 'Healthcare', baseDealCount: 410, baseValue: 340, basePremium: 32, baseMultiple: 18.2 },
    { sector: 'Energy', baseDealCount: 280, baseValue: 310, basePremium: 18, baseMultiple: 8.4 },
    { sector: 'Financials', baseDealCount: 350, baseValue: 260, basePremium: 22, baseMultiple: 12.1 },
    { sector: 'Industrials', baseDealCount: 310, baseValue: 220, basePremium: 27, baseMultiple: 11.8 },
    { sector: 'Consumer', baseDealCount: 240, baseValue: 180, basePremium: 30, baseMultiple: 14.6 },
    { sector: 'TMT', baseDealCount: 290, baseValue: 250, basePremium: 34, baseMultiple: 19.3 },
    { sector: 'Real Estate', baseDealCount: 200, baseValue: 160, basePremium: 14, baseMultiple: 16.8 },
  ];

  return sectorDefs.map(def => ({
    sector: SECTOR_DISPLAY[def.sector] || def.sector,
    dealCount: Math.round(def.baseDealCount * (0.85 + rng() * 0.30)),
    totalValueBillions: round1(def.baseValue * (0.85 + rng() * 0.30)),
    avgPremiumPct: round1(def.basePremium + (rng() - 0.5) * 8),
    avgMultipleEVEBITDA: round1(def.baseMultiple * (0.90 + rng() * 0.20)),
  }));
}

function generateAdvisoryLeagueTables(rng: () => number): AdvisoryLeagueEntry[] {
  const baseDealCounts = [185, 172, 158, 142, 130, 95, 88, 72, 68, 62];
  const baseValues = [520, 485, 440, 380, 340, 210, 190, 145, 135, 115];

  const entries: AdvisoryLeagueEntry[] = ADVISOR_NAMES.map((advisor, i) => {
    const dealCount = Math.round(baseDealCounts[i] * (0.88 + rng() * 0.24));
    const totalValueBillions = round1(baseValues[i] * (0.88 + rng() * 0.24));
    return { advisor, dealCount, totalValueBillions, marketSharePct: 0 };
  });

  // Calculate market share from total value
  const totalMarketValue = entries.reduce((sum, e) => sum + e.totalValueBillions, 0);
  for (const entry of entries) {
    entry.marketSharePct = round1((entry.totalValueBillions / totalMarketValue) * 100);
  }

  entries.sort((a, b) => b.totalValueBillions - a.totalValueBillions);
  return entries;
}

function generateRegionalActivity(rng: () => number): RegionalActivity[] {
  const regionDefs: { region: string; baseDealCount: number; baseValue: number; topDeal: string; baseInflow: number; baseOutflow: number }[] = [
    { region: 'Americas', baseDealCount: 1450, baseValue: 1020, topDeal: 'Chevron / Pioneer Natural Resources ($53B)', baseInflow: 185, baseOutflow: 142 },
    { region: 'EMEA', baseDealCount: 820, baseValue: 540, topDeal: 'LVMH / Capri Holdings ($8.5B)', baseInflow: 128, baseOutflow: 160 },
    { region: 'Asia-Pacific', baseDealCount: 680, baseValue: 380, topDeal: 'Samsung / NXP Semiconductors ($42.6B)', baseInflow: 95, baseOutflow: 108 },
  ];

  return regionDefs.map(def => ({
    region: def.region,
    dealCount: Math.round(def.baseDealCount * (0.88 + rng() * 0.24)),
    totalValueBillions: round1(def.baseValue * (0.88 + rng() * 0.24)),
    topDealInRegion: def.topDeal,
    crossBorderInflow: round1(def.baseInflow * (0.85 + rng() * 0.30)),
    crossBorderOutflow: round1(def.baseOutflow * (0.85 + rng() * 0.30)),
  }));
}

function generateDealPipeline(rng: () => number): DealPipeline {
  const pendingDealsCount = 180 + Math.floor(rng() * 80);
  const pendingValueBillions = round1(420 + rng() * 280);
  const regulatoryRiskDeals = 12 + Math.floor(rng() * 18);

  // Pick top 3 sector hotspots
  const shuffledSectors = [...SECTORS].sort(() => rng() - 0.5);
  const sectorHotspots = shuffledSectors.slice(0, 3);

  return {
    pendingDealsCount,
    pendingValueBillions,
    regulatoryRiskDeals,
    sectorHotspots,
  };
}

// ── Build response ──

function buildGlobalMaData(): GlobalMaResponse {
  const rng = seededRandom('global-ma');

  return {
    ytdSummary: generateYtdSummary(rng),
    recentDeals: generateRecentDeals(rng),
    sectorBreakdown: generateSectorBreakdown(rng),
    advisoryLeagueTables: generateAdvisoryLeagueTables(rng),
    regionalActivity: generateRegionalActivity(rng),
    dealPipeline: generateDealPipeline(rng),
    timestamp: new Date().toISOString(),
  };
}

// ── Cache ──

let cachedData: { data: GlobalMaResponse; ts: number } | null = null;
let staleData: GlobalMaResponse | null = null;


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
    const data = buildGlobalMaData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[GlobalMA] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate global M&A data' });
  }
});

export default router;
