import { Router } from 'express';

const router = Router();

// ── PRNG ──

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// ── Types ──

interface RevisionStock {
  ticker: string;
  name: string;
  sector: string;
  currentEPS: number;
  previousEPS: number;
  revisionPct: number;
  analystCount: number;
  consensusRating: number;
  targetPrice: number;
  currentPrice: number;
  upsidePct: number;
}

interface SectorRevision {
  sector: string;
  avgRevision3MPct: number;
  avgRevision1MPct: number;
  upgradeCount: number;
  downgradeCount: number;
  netRevisions: number;
  avgEarningsGrowthPct: number;
}

interface EarningsSurpriseEntry {
  ticker: string;
  name: string;
  reportDate: string;
  epsEstimate: number;
  epsActual: number;
  surprisePct: number;
  revenueEstimate: number;
  revenueActual: number;
  revenueSurprisePct: number;
  priceReactionPct: number;
}

interface RevisionBreadth {
  sp500UpRevisions: number;
  sp500DownRevisions: number;
  breadthRatio: number;
  breadth3MAvg: number;
  momentum: 'improving' | 'stable' | 'declining';
}

interface UpcomingEarning {
  ticker: string;
  name: string;
  reportDate: string;
  epsEstimate: number;
  whisperNumber: number;
  impliedMovePct: number;
}

interface RevisionSummary {
  avgSP500Revision3MPct: number;
  beatRate: number;
  avgSurprisePct: number;
  sectorLeader: string;
  sectorLaggard: string;
}

interface EarningsRevisionData {
  topUpRevisions: RevisionStock[];
  topDownRevisions: RevisionStock[];
  sectorRevisions: SectorRevision[];
  earningsSurprises: EarningsSurpriseEntry[];
  revisionBreadth: RevisionBreadth;
  upcomingEarnings: UpcomingEarning[];
  summary: RevisionSummary;
  generatedAt: string;
}

// ── Stock Universe ──

interface StockDef {
  ticker: string;
  name: string;
  sector: string;
  basePrice: number;
  baseEPS: number;
  baseRevenue: number;
}

const STOCKS: StockDef[] = [
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Information Technology', basePrice: 195, baseEPS: 6.58, baseRevenue: 94.9 },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Information Technology', basePrice: 420, baseEPS: 12.10, baseRevenue: 62.0 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Information Technology', basePrice: 880, baseEPS: 25.08, baseRevenue: 35.1 },
  { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'Communication Services', basePrice: 155, baseEPS: 6.52, baseRevenue: 86.3 },
  { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer Discretionary', basePrice: 185, baseEPS: 4.72, baseRevenue: 158.9 },
  { ticker: 'META', name: 'Meta Platforms Inc', sector: 'Communication Services', basePrice: 510, baseEPS: 21.20, baseRevenue: 40.6 },
  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Discretionary', basePrice: 175, baseEPS: 2.28, baseRevenue: 25.5 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co', sector: 'Financials', basePrice: 198, baseEPS: 16.23, baseRevenue: 44.2 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Health Care', basePrice: 156, baseEPS: 10.05, baseRevenue: 21.4 },
  { ticker: 'V', name: 'Visa Inc', sector: 'Financials', basePrice: 282, baseEPS: 9.92, baseRevenue: 9.0 },
  { ticker: 'WMT', name: 'Walmart Inc', sector: 'Consumer Staples', basePrice: 168, baseEPS: 6.62, baseRevenue: 161.5 },
  { ticker: 'PG', name: 'Procter & Gamble Co', sector: 'Consumer Staples', basePrice: 162, baseEPS: 6.37, baseRevenue: 21.4 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp', sector: 'Energy', basePrice: 104, baseEPS: 9.12, baseRevenue: 84.3 },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc', sector: 'Health Care', basePrice: 525, baseEPS: 27.60, baseRevenue: 98.9 },
  { ticker: 'HD', name: 'Home Depot Inc', sector: 'Consumer Discretionary', basePrice: 365, baseEPS: 15.15, baseRevenue: 39.7 },
  { ticker: 'MA', name: 'Mastercard Inc', sector: 'Financials', basePrice: 468, baseEPS: 14.38, baseRevenue: 7.0 },
  { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'Information Technology', basePrice: 1350, baseEPS: 47.52, baseRevenue: 14.2 },
  { ticker: 'LLY', name: 'Eli Lilly & Co', sector: 'Health Care', basePrice: 790, baseEPS: 12.65, baseRevenue: 11.3 },
  { ticker: 'COST', name: 'Costco Wholesale Corp', sector: 'Consumer Staples', basePrice: 730, baseEPS: 16.12, baseRevenue: 60.0 },
  { ticker: 'ABBV', name: 'AbbVie Inc', sector: 'Health Care', basePrice: 172, baseEPS: 11.28, baseRevenue: 14.5 },
  { ticker: 'CRM', name: 'Salesforce Inc', sector: 'Information Technology', basePrice: 295, baseEPS: 9.86, baseRevenue: 9.4 },
  { ticker: 'NFLX', name: 'Netflix Inc', sector: 'Communication Services', basePrice: 620, baseEPS: 19.08, baseRevenue: 9.8 },
  { ticker: 'MRK', name: 'Merck & Co Inc', sector: 'Health Care', basePrice: 128, baseEPS: 7.74, baseRevenue: 16.0 },
  { ticker: 'PEP', name: 'PepsiCo Inc', sector: 'Consumer Staples', basePrice: 172, baseEPS: 8.15, baseRevenue: 23.5 },
  { ticker: 'KO', name: 'Coca-Cola Co', sector: 'Consumer Staples', basePrice: 60, baseEPS: 2.82, baseRevenue: 11.5 },
  { ticker: 'CVX', name: 'Chevron Corp', sector: 'Energy', basePrice: 155, baseEPS: 12.38, baseRevenue: 48.8 },
  { ticker: 'NEE', name: 'NextEra Energy Inc', sector: 'Utilities', basePrice: 72, baseEPS: 3.42, baseRevenue: 7.2 },
  { ticker: 'PLD', name: 'Prologis Inc', sector: 'Real Estate', basePrice: 128, baseEPS: 5.52, baseRevenue: 2.1 },
  { ticker: 'BHP', name: 'BHP Group Ltd', sector: 'Materials', basePrice: 58, baseEPS: 3.85, baseRevenue: 27.2 },
  { ticker: 'RTX', name: 'RTX Corp', sector: 'Industrials', basePrice: 102, baseEPS: 5.68, baseRevenue: 19.6 },
  { ticker: 'HON', name: 'Honeywell Intl Inc', sector: 'Industrials', basePrice: 205, baseEPS: 9.88, baseRevenue: 9.5 },
  { ticker: 'GE', name: 'GE Aerospace', sector: 'Industrials', basePrice: 165, baseEPS: 4.20, baseRevenue: 9.1 },
  { ticker: 'CAT', name: 'Caterpillar Inc', sector: 'Industrials', basePrice: 310, baseEPS: 21.30, baseRevenue: 16.8 },
  { ticker: 'DE', name: 'Deere & Co', sector: 'Industrials', basePrice: 395, baseEPS: 24.50, baseRevenue: 13.2 },
  { ticker: 'DUK', name: 'Duke Energy Corp', sector: 'Utilities', basePrice: 98, baseEPS: 5.85, baseRevenue: 7.4 },
  { ticker: 'SO', name: 'Southern Co', sector: 'Utilities', basePrice: 74, baseEPS: 3.95, baseRevenue: 6.5 },
  { ticker: 'AMT', name: 'American Tower Corp', sector: 'Real Estate', basePrice: 198, baseEPS: 10.15, baseRevenue: 2.9 },
  { ticker: 'LIN', name: 'Linde plc', sector: 'Materials', basePrice: 440, baseEPS: 14.80, baseRevenue: 8.5 },
  { ticker: 'SHW', name: 'Sherwin-Williams Co', sector: 'Materials', basePrice: 340, baseEPS: 11.20, baseRevenue: 6.0 },
  { ticker: 'T', name: 'AT&T Inc', sector: 'Communication Services', basePrice: 17, baseEPS: 2.24, baseRevenue: 30.6 },
];

const GICS_SECTORS = [
  'Information Technology',
  'Health Care',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: EarningsRevisionData; ts: number } | null = null;

// ── Helpers ──

function round(v: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function formatDate(base: Date, offsetDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ── Data Generation ──

function generate(): EarningsRevisionData {
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const rand = mulberry32(hashSeed('earnings-revision-' + dayKey));

  // Generate revision data for all stocks
  const allRevisions = STOCKS.map((s) => {
    // Revision percentage: range roughly -8% to +12% with most in -2% to +5%
    const rawRevision = (rand() - 0.4) * 10; // slight positive bias
    const revisionPct = round(rawRevision);
    const previousEPS = round(s.baseEPS * (1 + (rand() - 0.5) * 0.05));
    const currentEPS = round(previousEPS * (1 + revisionPct / 100));
    const analystCount = Math.floor(rand() * 25) + 8;
    const consensusRating = round(1 + rand() * 4, 1);
    const currentPrice = round(s.basePrice * (1 + (rand() - 0.48) * 0.12));
    const targetPrice = round(currentPrice * (1 + (rand() * 0.30 + 0.02)));
    const upsidePct = round(((targetPrice - currentPrice) / currentPrice) * 100, 1);

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      currentEPS,
      previousEPS,
      revisionPct,
      analystCount,
      consensusRating,
      targetPrice,
      currentPrice,
      upsidePct,
    };
  });

  // Sort by revision to split into up/down
  const sortedUp = [...allRevisions].sort((a, b) => b.revisionPct - a.revisionPct);
  const sortedDown = [...allRevisions].sort((a, b) => a.revisionPct - b.revisionPct);

  const topUpRevisions: RevisionStock[] = sortedUp.slice(0, 15);
  const topDownRevisions: RevisionStock[] = sortedDown.slice(0, 15);

  // Sector revisions — all 11 GICS sectors
  const sectorRevisions: SectorRevision[] = GICS_SECTORS.map((sector) => {
    const avgRevision3MPct = round((rand() - 0.35) * 6);
    const avgRevision1MPct = round((rand() - 0.38) * 4);
    const upgradeCount = Math.floor(rand() * 35) + 5;
    const downgradeCount = Math.floor(rand() * 30) + 3;
    const netRevisions = upgradeCount - downgradeCount;
    const avgEarningsGrowthPct = round((rand() - 0.3) * 20);

    return {
      sector,
      avgRevision3MPct,
      avgRevision1MPct,
      upgradeCount,
      downgradeCount,
      netRevisions,
      avgEarningsGrowthPct,
    };
  });

  // Sort sectors by avgRevision3MPct descending
  sectorRevisions.sort((a, b) => b.avgRevision3MPct - a.avgRevision3MPct);

  // Earnings surprises — 20 recent reporters
  const surprisePool = pickN(STOCKS, 20, rand);
  const earningsSurprises: EarningsSurpriseEntry[] = surprisePool.map((s, i) => {
    const reportDate = formatDate(today, -(i * 2 + Math.floor(rand() * 3)));
    const epsEstimate = round(s.baseEPS / 4 * (1 + (rand() - 0.5) * 0.08));
    // Beat rate ~72%: rand < 0.72 => beat
    const isBeat = rand() < 0.72;
    const surpriseMag = rand() * 8 + 0.5; // 0.5% to 8.5%
    const surprisePct = round(isBeat ? surpriseMag : -surpriseMag);
    const epsActual = round(epsEstimate * (1 + surprisePct / 100));
    const revenueEstimate = round(s.baseRevenue * (1 + (rand() - 0.5) * 0.04), 1);
    const revSurprisePct = round((rand() - 0.35) * 6);
    const revenueActual = round(revenueEstimate * (1 + revSurprisePct / 100), 1);
    // Price reaction correlated with surprise
    const priceReactionPct = round(surprisePct * (0.3 + rand() * 0.7) + (rand() - 0.5) * 2);

    return {
      ticker: s.ticker,
      name: s.name,
      reportDate,
      epsEstimate,
      epsActual,
      surprisePct,
      revenueEstimate,
      revenueActual,
      revenueSurprisePct: revSurprisePct,
      priceReactionPct,
    };
  });

  // Sort by report date descending (most recent first)
  earningsSurprises.sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  // Revision breadth
  const sp500UpRevisions = Math.floor(rand() * 80) + 180; // ~180-260
  const sp500DownRevisions = Math.floor(rand() * 80) + 140; // ~140-220
  const breadthRatio = round(sp500UpRevisions / (sp500UpRevisions + sp500DownRevisions), 3);
  const breadth3MAvg = round(breadthRatio + (rand() - 0.5) * 0.06, 3);
  const momentumDiff = breadthRatio - breadth3MAvg;
  const momentum: RevisionBreadth['momentum'] =
    momentumDiff > 0.02 ? 'improving' : momentumDiff < -0.02 ? 'declining' : 'stable';

  const revisionBreadth: RevisionBreadth = {
    sp500UpRevisions,
    sp500DownRevisions,
    breadthRatio,
    breadth3MAvg,
    momentum,
  };

  // Upcoming earnings — 15 next reporters
  const upcomingPool = pickN(
    STOCKS.filter((s) => !surprisePool.includes(s)),
    15,
    rand,
  );
  // If not enough stocks remain after filtering, fill from the full pool
  if (upcomingPool.length < 15) {
    const extra = pickN(
      STOCKS.filter((s) => !upcomingPool.some((u) => u.ticker === s.ticker)),
      15 - upcomingPool.length,
      rand,
    );
    upcomingPool.push(...extra);
  }

  const upcomingEarnings: UpcomingEarning[] = upcomingPool.slice(0, 15).map((s, i) => {
    const reportDate = formatDate(today, i * 2 + Math.floor(rand() * 4) + 1);
    const epsEstimate = round(s.baseEPS / 4 * (1 + (rand() - 0.5) * 0.06));
    const whisperNumber = round(epsEstimate * (1 + (rand() * 0.06 - 0.01)));
    const impliedMovePct = round(rand() * 8 + 1.5, 1); // 1.5% to 9.5%

    return {
      ticker: s.ticker,
      name: s.name,
      reportDate,
      epsEstimate,
      whisperNumber,
      impliedMovePct,
    };
  });

  // Sort upcoming by date ascending
  upcomingEarnings.sort((a, b) => a.reportDate.localeCompare(b.reportDate));

  // Summary
  const beats = earningsSurprises.filter((e) => e.surprisePct > 0);
  const beatRate = round((beats.length / earningsSurprises.length) * 100, 1);
  const avgSurprisePct = round(
    earningsSurprises.reduce((sum, e) => sum + e.surprisePct, 0) / earningsSurprises.length,
    2,
  );
  const avgSP500Revision3MPct = round(
    sectorRevisions.reduce((sum, s) => sum + s.avgRevision3MPct, 0) / sectorRevisions.length,
    2,
  );

  const summary: RevisionSummary = {
    avgSP500Revision3MPct,
    beatRate,
    avgSurprisePct,
    sectorLeader: sectorRevisions[0].sector,
    sectorLaggard: sectorRevisions[sectorRevisions.length - 1].sector,
  };

  return {
    topUpRevisions,
    topDownRevisions,
    sectorRevisions,
    earningsSurprises,
    revisionBreadth,
    upcomingEarnings,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EarningsRevision] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate earnings revision data' });
  }
});

export default router;
