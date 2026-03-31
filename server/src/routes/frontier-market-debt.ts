import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface MarketOverview {
  totalOutstandingB: number;
  averageYieldPct: number;
  averageSpreadBps: number;
  indexReturnYtdPct: number;
  countriesTracked: number;
}

interface SovereignBond {
  country: string;
  region: string;
  creditRating: string;
  tenYearYieldPct: number;
  spreadToUstBps: number;
  cds5Y: number;
  debtToGdpPct: number;
  fxReserveMonths: number;
  currentAccountGdpPct: number;
  imfProgramStatus: string;
  nextMaturityDate: string;
  outstandingEurobondB: number;
}

interface RecentIssuance {
  country: string;
  sizeM: number;
  tenor: string;
  couponPct: number;
  pricingDate: string;
  bookCoverageRatio: number;
  spreadAtIssueBps: number;
}

interface DistressedWatch {
  country: string;
  restructuringStatus: string;
  recoveryRateEstPct: number;
  nextMilestone: string;
  nextMilestoneDate: string;
}

interface RegionalAggregate {
  region: string;
  averageYieldPct: number;
  averageSpreadBps: number;
  averageRating: string;
  totalOutstandingB: number;
  ytdPerformancePct: number;
}

interface CapitalFlowMonth {
  month: string;
  netFlowM: number;
}

interface CapitalFlows {
  monthlyNetFlows: CapitalFlowMonth[];
  currentAumB: number;
}

// ── Seed Data ──

interface CountrySeed {
  country: string;
  region: string;
  creditRating: string;
  tenYearYieldBase: number;
  spreadBase: number;
  cds5YBase: number;
  debtToGdpBase: number;
  fxReserveMonthsBase: number;
  currentAccountBase: number;
  imfProgramStatus: string;
  nextMaturityDate: string;
  outstandingEurobondBase: number;
}

const COUNTRY_SEEDS: CountrySeed[] = [
  {
    country: 'Nigeria', region: 'Sub-Saharan Africa', creditRating: 'B-',
    tenYearYieldBase: 10.25, spreadBase: 685, cds5YBase: 620,
    debtToGdpBase: 38.2, fxReserveMonthsBase: 4.8, currentAccountBase: -1.2,
    imfProgramStatus: 'No active program', nextMaturityDate: '2029-11-28',
    outstandingEurobondBase: 15.6,
  },
  {
    country: 'Kenya', region: 'Sub-Saharan Africa', creditRating: 'B',
    tenYearYieldBase: 10.85, spreadBase: 715, cds5YBase: 580,
    debtToGdpBase: 72.1, fxReserveMonthsBase: 3.9, currentAccountBase: -4.8,
    imfProgramStatus: 'EFF (Extended Fund Facility)', nextMaturityDate: '2028-06-24',
    outstandingEurobondBase: 7.1,
  },
  {
    country: 'Ghana', region: 'Sub-Saharan Africa', creditRating: 'CCC+',
    tenYearYieldBase: 14.50, spreadBase: 1120, cds5YBase: 2850,
    debtToGdpBase: 88.3, fxReserveMonthsBase: 2.6, currentAccountBase: -2.1,
    imfProgramStatus: 'ECF ($3B, 2023-2026)', nextMaturityDate: '2027-03-26',
    outstandingEurobondBase: 13.1,
  },
  {
    country: 'Zambia', region: 'Sub-Saharan Africa', creditRating: 'CCC+',
    tenYearYieldBase: 13.80, spreadBase: 1050, cds5YBase: 2400,
    debtToGdpBase: 95.4, fxReserveMonthsBase: 2.2, currentAccountBase: 1.8,
    imfProgramStatus: 'ECF ($1.3B, 2022-2025)', nextMaturityDate: '2027-04-14',
    outstandingEurobondBase: 3.0,
  },
  {
    country: 'Ivory Coast', region: 'Sub-Saharan Africa', creditRating: 'BB-',
    tenYearYieldBase: 8.15, spreadBase: 420, cds5YBase: 345,
    debtToGdpBase: 56.8, fxReserveMonthsBase: 5.1, currentAccountBase: -3.5,
    imfProgramStatus: 'No active program', nextMaturityDate: '2032-01-30',
    outstandingEurobondBase: 9.4,
  },
  {
    country: 'Senegal', region: 'Sub-Saharan Africa', creditRating: 'B+',
    tenYearYieldBase: 8.65, spreadBase: 475, cds5YBase: 390,
    debtToGdpBase: 68.2, fxReserveMonthsBase: 4.3, currentAccountBase: -8.1,
    imfProgramStatus: 'SBA (Stand-By Arrangement)', nextMaturityDate: '2031-03-13',
    outstandingEurobondBase: 5.2,
  },
  {
    country: 'Ethiopia', region: 'Sub-Saharan Africa', creditRating: 'CCC',
    tenYearYieldBase: 15.20, spreadBase: 1180, cds5YBase: 3200,
    debtToGdpBase: 44.6, fxReserveMonthsBase: 1.4, currentAccountBase: -3.2,
    imfProgramStatus: 'ECF ($3.4B, 2023-2027)', nextMaturityDate: '2030-12-11',
    outstandingEurobondBase: 1.0,
  },
  {
    country: 'Angola', region: 'Sub-Saharan Africa', creditRating: 'B-',
    tenYearYieldBase: 9.75, spreadBase: 610, cds5YBase: 540,
    debtToGdpBase: 64.5, fxReserveMonthsBase: 6.2, currentAccountBase: 5.8,
    imfProgramStatus: 'No active program', nextMaturityDate: '2028-11-26',
    outstandingEurobondBase: 8.3,
  },
  {
    country: 'Egypt', region: 'Middle East', creditRating: 'B-',
    tenYearYieldBase: 11.40, spreadBase: 780, cds5YBase: 720,
    debtToGdpBase: 92.7, fxReserveMonthsBase: 5.5, currentAccountBase: -3.4,
    imfProgramStatus: 'EFF ($8B, 2024-2027)', nextMaturityDate: '2029-04-11',
    outstandingEurobondBase: 28.5,
  },
  {
    country: 'Sri Lanka', region: 'Southeast Asia', creditRating: 'CCC+',
    tenYearYieldBase: 12.30, spreadBase: 890, cds5YBase: 2100,
    debtToGdpBase: 115.2, fxReserveMonthsBase: 3.1, currentAccountBase: -1.9,
    imfProgramStatus: 'EFF ($2.9B, 2023-2027)', nextMaturityDate: '2028-07-25',
    outstandingEurobondBase: 12.5,
  },
  {
    country: 'Pakistan', region: 'Central Asia', creditRating: 'B-',
    tenYearYieldBase: 9.80, spreadBase: 640, cds5YBase: 580,
    debtToGdpBase: 78.5, fxReserveMonthsBase: 3.5, currentAccountBase: -0.8,
    imfProgramStatus: 'SBA ($3B, 2024-2025)', nextMaturityDate: '2029-04-15',
    outstandingEurobondBase: 7.8,
  },
  {
    country: 'Bangladesh', region: 'Southeast Asia', creditRating: 'B+',
    tenYearYieldBase: 7.85, spreadBase: 385, cds5YBase: 310,
    debtToGdpBase: 39.2, fxReserveMonthsBase: 4.6, currentAccountBase: -1.5,
    imfProgramStatus: 'ECF/EFF ($4.7B, 2023-2026)', nextMaturityDate: '2030-09-20',
    outstandingEurobondBase: 2.5,
  },
  {
    country: 'Mongolia', region: 'Central Asia', creditRating: 'B',
    tenYearYieldBase: 8.90, spreadBase: 520, cds5YBase: 435,
    debtToGdpBase: 67.3, fxReserveMonthsBase: 5.8, currentAccountBase: -14.2,
    imfProgramStatus: 'No active program', nextMaturityDate: '2028-04-07',
    outstandingEurobondBase: 2.1,
  },
  {
    country: 'Georgia', region: 'Eastern Europe', creditRating: 'BB-',
    tenYearYieldBase: 7.45, spreadBase: 345, cds5YBase: 280,
    debtToGdpBase: 39.8, fxReserveMonthsBase: 4.9, currentAccountBase: -5.6,
    imfProgramStatus: 'No active program', nextMaturityDate: '2029-07-22',
    outstandingEurobondBase: 2.8,
  },
  {
    country: 'El Salvador', region: 'Central America', creditRating: 'B-',
    tenYearYieldBase: 9.50, spreadBase: 580, cds5YBase: 510,
    debtToGdpBase: 82.6, fxReserveMonthsBase: 3.0, currentAccountBase: -2.4,
    imfProgramStatus: 'No active program', nextMaturityDate: '2029-01-30',
    outstandingEurobondBase: 7.2,
  },
  {
    country: 'Honduras', region: 'Central America', creditRating: 'BB-',
    tenYearYieldBase: 7.90, spreadBase: 410, cds5YBase: 340,
    debtToGdpBase: 48.5, fxReserveMonthsBase: 5.4, currentAccountBase: -4.1,
    imfProgramStatus: 'No active program', nextMaturityDate: '2030-06-15',
    outstandingEurobondBase: 2.4,
  },
  {
    country: 'Papua New Guinea', region: 'Southeast Asia', creditRating: 'B',
    tenYearYieldBase: 9.15, spreadBase: 545, cds5YBase: 465,
    debtToGdpBase: 52.3, fxReserveMonthsBase: 6.1, currentAccountBase: 15.8,
    imfProgramStatus: 'No active program', nextMaturityDate: '2028-10-04',
    outstandingEurobondBase: 0.5,
  },
  {
    country: 'Mozambique', region: 'Sub-Saharan Africa', creditRating: 'CCC+',
    tenYearYieldBase: 12.80, spreadBase: 950, cds5YBase: 1850,
    debtToGdpBase: 101.3, fxReserveMonthsBase: 3.7, currentAccountBase: -25.4,
    imfProgramStatus: 'ECF ($456M, 2022-2025)', nextMaturityDate: '2031-09-15',
    outstandingEurobondBase: 2.0,
  },
];

const ISSUANCE_SEEDS: {
  country: string; sizeM: number; tenor: string; couponBase: number;
  daysAgo: number; bookCoverageBase: number; spreadAtIssueBase: number;
}[] = [
  { country: 'Ivory Coast', sizeM: 1100, tenor: '10Y', couponBase: 7.625, daysAgo: 8, bookCoverageBase: 3.2, spreadAtIssueBase: 395 },
  { country: 'Kenya', sizeM: 1500, tenor: '7Y', couponBase: 9.750, daysAgo: 15, bookCoverageBase: 2.8, spreadAtIssueBase: 560 },
  { country: 'Senegal', sizeM: 750, tenor: '12Y', couponBase: 8.375, daysAgo: 22, bookCoverageBase: 4.1, spreadAtIssueBase: 440 },
  { country: 'Nigeria', sizeM: 2000, tenor: '10Y', couponBase: 9.125, daysAgo: 30, bookCoverageBase: 2.5, spreadAtIssueBase: 625 },
  { country: 'Mongolia', sizeM: 500, tenor: '5Y', couponBase: 8.650, daysAgo: 45, bookCoverageBase: 3.6, spreadAtIssueBase: 490 },
  { country: 'Honduras', sizeM: 700, tenor: '10Y', couponBase: 7.500, daysAgo: 52, bookCoverageBase: 3.0, spreadAtIssueBase: 375 },
];

const DISTRESSED_SEEDS: {
  country: string; restructuringStatus: string;
  recoveryRateBase: number; nextMilestone: string; milestoneDaysAhead: number;
}[] = [
  {
    country: 'Ghana', restructuringStatus: 'Official creditor agreement reached; bilateral holdouts remain',
    recoveryRateBase: 47, nextMilestone: 'Eurobond exchange offer launch', milestoneDaysAhead: 18,
  },
  {
    country: 'Zambia', restructuringStatus: 'Eurobond exchange completed; monitoring post-restructuring compliance',
    recoveryRateBase: 54, nextMilestone: 'First coupon payment under new terms', milestoneDaysAhead: 35,
  },
  {
    country: 'Ethiopia', restructuringStatus: 'Common Framework negotiation; creditor committee formed',
    recoveryRateBase: 38, nextMilestone: 'IMF second review completion', milestoneDaysAhead: 42,
  },
  {
    country: 'Sri Lanka', restructuringStatus: 'Bondholder deal agreed in principle; macro-linked warrants proposed',
    recoveryRateBase: 52, nextMilestone: 'Consent solicitation deadline', milestoneDaysAhead: 12,
  },
];

const REGIONS = [
  'Sub-Saharan Africa', 'Central Asia', 'Southeast Asia',
  'Central America', 'Eastern Europe', 'Middle East',
];

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('frontier-market-debt-' + day));

  // ── Sovereign Bonds ──
  const sovereignBonds: SovereignBond[] = COUNTRY_SEEDS.map(s => ({
    country: s.country,
    region: s.region,
    creditRating: s.creditRating,
    tenYearYieldPct: roundTo(jitter(rng, s.tenYearYieldBase, 0.04), 2),
    spreadToUstBps: Math.round(jitter(rng, s.spreadBase, 0.06)),
    cds5Y: Math.round(jitter(rng, s.cds5YBase, 0.07)),
    debtToGdpPct: roundTo(jitter(rng, s.debtToGdpBase, 0.02), 1),
    fxReserveMonths: roundTo(jitter(rng, s.fxReserveMonthsBase, 0.05), 1),
    currentAccountGdpPct: roundTo(jitter(rng, s.currentAccountBase, 0.08), 1),
    imfProgramStatus: s.imfProgramStatus,
    nextMaturityDate: s.nextMaturityDate,
    outstandingEurobondB: roundTo(jitter(rng, s.outstandingEurobondBase, 0.03), 1),
  }));

  // ── Market Overview ──
  const totalOutstanding = sovereignBonds.reduce((sum, b) => sum + b.outstandingEurobondB, 0);
  const avgYield = sovereignBonds.reduce((sum, b) => sum + b.tenYearYieldPct, 0) / sovereignBonds.length;
  const avgSpread = sovereignBonds.reduce((sum, b) => sum + b.spreadToUstBps, 0) / sovereignBonds.length;

  const marketOverview: MarketOverview = {
    totalOutstandingB: roundTo(totalOutstanding, 1),
    averageYieldPct: roundTo(avgYield, 2),
    averageSpreadBps: Math.round(avgSpread),
    indexReturnYtdPct: roundTo(-2.5 + rng() * 9, 2),
    countriesTracked: sovereignBonds.length,
  };

  // ── Recent Issuances ──
  const today = new Date();
  const recentIssuances: RecentIssuance[] = ISSUANCE_SEEDS.map(s => {
    const pricingDate = new Date(today);
    pricingDate.setDate(pricingDate.getDate() - s.daysAgo);
    return {
      country: s.country,
      sizeM: s.sizeM,
      tenor: s.tenor,
      couponPct: roundTo(jitter(rng, s.couponBase, 0.02), 3),
      pricingDate: pricingDate.toISOString().slice(0, 10),
      bookCoverageRatio: roundTo(jitter(rng, s.bookCoverageBase, 0.08), 1),
      spreadAtIssueBps: Math.round(jitter(rng, s.spreadAtIssueBase, 0.05)),
    };
  });

  // ── Distressed / Restructuring Watch ──
  const distressedWatch: DistressedWatch[] = DISTRESSED_SEEDS.map(s => {
    const milestoneDate = new Date(today);
    milestoneDate.setDate(milestoneDate.getDate() + s.milestoneDaysAhead);
    return {
      country: s.country,
      restructuringStatus: s.restructuringStatus,
      recoveryRateEstPct: roundTo(jitter(rng, s.recoveryRateBase, 0.06), 1),
      nextMilestone: s.nextMilestone,
      nextMilestoneDate: milestoneDate.toISOString().slice(0, 10),
    };
  });

  // ── Regional Aggregates ──
  const ratingOrder = ['CCC', 'CCC+', 'B-', 'B', 'B+', 'BB-', 'BB', 'BB+'];

  const regionalAggregates: RegionalAggregate[] = REGIONS.map(region => {
    const regionBonds = sovereignBonds.filter(b => b.region === region);
    if (regionBonds.length === 0) {
      return {
        region,
        averageYieldPct: 0,
        averageSpreadBps: 0,
        averageRating: 'NR',
        totalOutstandingB: 0,
        ytdPerformancePct: 0,
      };
    }

    const regionAvgYield = regionBonds.reduce((s, b) => s + b.tenYearYieldPct, 0) / regionBonds.length;
    const regionAvgSpread = regionBonds.reduce((s, b) => s + b.spreadToUstBps, 0) / regionBonds.length;
    const regionTotalOutstanding = regionBonds.reduce((s, b) => s + b.outstandingEurobondB, 0);

    // Average rating by numeric index
    const ratingIndices = regionBonds.map(b => {
      const idx = ratingOrder.indexOf(b.creditRating);
      return idx >= 0 ? idx : 3; // default to B if unknown
    });
    const avgRatingIdx = Math.round(ratingIndices.reduce((s, i) => s + i, 0) / ratingIndices.length);
    const avgRating = ratingOrder[Math.min(avgRatingIdx, ratingOrder.length - 1)] || 'B';

    // YTD performance inversely correlated with spread
    const ytdPerf = roundTo(4.0 - (regionAvgSpread / 200) + (rng() - 0.5) * 3, 2);

    return {
      region,
      averageYieldPct: roundTo(regionAvgYield, 2),
      averageSpreadBps: Math.round(regionAvgSpread),
      averageRating: avgRating,
      totalOutstandingB: roundTo(regionTotalOutstanding, 1),
      ytdPerformancePct: ytdPerf,
    };
  });

  // ── Capital Flows ──
  const months: CapitalFlowMonth[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    // Frontier debt flows typically range -500M to +800M per month
    const baseFlow = -150 + rng() * 600;
    months.push({
      month: monthStr,
      netFlowM: Math.round(baseFlow),
    });
  }

  const capitalFlows: CapitalFlows = {
    monthlyNetFlows: months,
    currentAumB: roundTo(28.5 + (rng() - 0.5) * 6, 1),
  };

  return {
    marketOverview,
    sovereignBonds,
    recentIssuances,
    distressedWatch,
    regionalAggregates,
    capitalFlows,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FrontierMarketDebt] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate frontier market debt data' });
  }
});

export default router;
