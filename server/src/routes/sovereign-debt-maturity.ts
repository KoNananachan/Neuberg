import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface MaturityBucket {
  bucket: string;
  amountB: number;
  pctOfTotal: number;
}

interface UpcomingAuction {
  date: string;
  tenor: string;
  estimatedSizeB: number;
}

interface CountryDebtProfile {
  country: string;
  isoCode: string;
  totalDebtOutstandingB: number;
  debtToGdpPct: number;
  maturityProfile: MaturityBucket[];
  avgMaturityYears: number;
  weightedAvgCouponPct: number;
  refinancingNeed12MB: number;
  upcomingAuctions: UpcomingAuction[];
  creditRating: string;
  tenYearYieldPct: number;
  spreadVsUsBps: number;
}

interface MaturityWallQuarter {
  quarter: string;
  totalMaturingB: number;
  byCountry: { country: string; amountB: number }[];
}

interface IssuanceCalendarEntry {
  country: string;
  date: string;
  tenor: string;
  estimatedSizeB: number;
  instrumentType: string;
}

interface GlobalSummary {
  totalDebtOutstandingT: number;
  totalMaturingNext12MT: number;
  heaviestRefinancingNeeds: { country: string; refinancingNeedB: number; pctOfDebt: number }[];
  avgGlobalDebtToGdpPct: number;
}

// ── Country Seed Data ──

interface CountrySeed {
  country: string;
  isoCode: string;
  totalDebtB: number;
  debtToGdpPct: number;
  avgMaturityYears: number;
  weightedAvgCoupon: number;
  creditRating: string;
  tenYearYield: number;
  // Maturity distribution weights (0-1Y, 1-3Y, 3-5Y, 5-7Y, 7-10Y, 10-20Y, 20-30Y, 30Y+)
  maturityWeights: number[];
  auctionTenors: string[];
  auctionSizeBase: number;
  instrumentType: string;
}

const COUNTRY_SEEDS: CountrySeed[] = [
  {
    country: 'United States', isoCode: 'US',
    totalDebtB: 26200, debtToGdpPct: 123.4, avgMaturityYears: 6.2, weightedAvgCoupon: 3.15,
    creditRating: 'AA+', tenYearYield: 4.28,
    maturityWeights: [0.22, 0.18, 0.15, 0.12, 0.14, 0.10, 0.06, 0.03],
    auctionTenors: ['2Y', '5Y', '10Y', '30Y'], auctionSizeBase: 42, instrumentType: 'Treasury',
  },
  {
    country: 'Japan', isoCode: 'JP',
    totalDebtB: 9100, debtToGdpPct: 255.2, avgMaturityYears: 8.9, weightedAvgCoupon: 0.85,
    creditRating: 'A+', tenYearYield: 0.94,
    maturityWeights: [0.14, 0.16, 0.15, 0.13, 0.15, 0.14, 0.09, 0.04],
    auctionTenors: ['2Y', '5Y', '10Y', '20Y', '30Y', '40Y'], auctionSizeBase: 28, instrumentType: 'JGB',
  },
  {
    country: 'China', isoCode: 'CN',
    totalDebtB: 4800, debtToGdpPct: 83.6, avgMaturityYears: 7.1, weightedAvgCoupon: 2.95,
    creditRating: 'A+', tenYearYield: 2.68,
    maturityWeights: [0.18, 0.20, 0.17, 0.14, 0.13, 0.10, 0.05, 0.03],
    auctionTenors: ['1Y', '3Y', '5Y', '7Y', '10Y', '30Y'], auctionSizeBase: 18, instrumentType: 'CGB',
  },
  {
    country: 'United Kingdom', isoCode: 'GB',
    totalDebtB: 2780, debtToGdpPct: 101.3, avgMaturityYears: 14.2, weightedAvgCoupon: 3.42,
    creditRating: 'AA', tenYearYield: 4.12,
    maturityWeights: [0.08, 0.10, 0.11, 0.11, 0.14, 0.18, 0.16, 0.12],
    auctionTenors: ['5Y', '10Y', '20Y', '30Y', '50Y'], auctionSizeBase: 8, instrumentType: 'Gilt',
  },
  {
    country: 'Germany', isoCode: 'DE',
    totalDebtB: 2540, debtToGdpPct: 64.3, avgMaturityYears: 7.8, weightedAvgCoupon: 1.65,
    creditRating: 'AAA', tenYearYield: 2.35,
    maturityWeights: [0.15, 0.17, 0.16, 0.14, 0.15, 0.12, 0.07, 0.04],
    auctionTenors: ['2Y', '5Y', '10Y', '15Y', '30Y'], auctionSizeBase: 6, instrumentType: 'Bund',
  },
  {
    country: 'France', isoCode: 'FR',
    totalDebtB: 3020, debtToGdpPct: 111.8, avgMaturityYears: 8.4, weightedAvgCoupon: 2.18,
    creditRating: 'AA-', tenYearYield: 3.05,
    maturityWeights: [0.14, 0.17, 0.16, 0.13, 0.15, 0.13, 0.08, 0.04],
    auctionTenors: ['2Y', '5Y', '10Y', '15Y', '30Y', '50Y'], auctionSizeBase: 10, instrumentType: 'OAT',
  },
  {
    country: 'Italy', isoCode: 'IT',
    totalDebtB: 2950, debtToGdpPct: 140.6, avgMaturityYears: 7.1, weightedAvgCoupon: 2.85,
    creditRating: 'BBB', tenYearYield: 3.85,
    maturityWeights: [0.17, 0.19, 0.17, 0.13, 0.14, 0.11, 0.06, 0.03],
    auctionTenors: ['3Y', '5Y', '7Y', '10Y', '15Y', '30Y'], auctionSizeBase: 9, instrumentType: 'BTP',
  },
  {
    country: 'Spain', isoCode: 'ES',
    totalDebtB: 1580, debtToGdpPct: 107.5, avgMaturityYears: 7.9, weightedAvgCoupon: 2.28,
    creditRating: 'A', tenYearYield: 3.28,
    maturityWeights: [0.13, 0.17, 0.16, 0.14, 0.15, 0.13, 0.08, 0.04],
    auctionTenors: ['3Y', '5Y', '10Y', '15Y', '30Y'], auctionSizeBase: 7, instrumentType: 'Bono',
  },
  {
    country: 'Canada', isoCode: 'CA',
    totalDebtB: 1420, debtToGdpPct: 106.4, avgMaturityYears: 6.8, weightedAvgCoupon: 2.55,
    creditRating: 'AAA', tenYearYield: 3.45,
    maturityWeights: [0.18, 0.18, 0.16, 0.13, 0.14, 0.11, 0.07, 0.03],
    auctionTenors: ['2Y', '5Y', '10Y', '30Y'], auctionSizeBase: 5, instrumentType: 'GoC Bond',
  },
  {
    country: 'Australia', isoCode: 'AU',
    totalDebtB: 680, debtToGdpPct: 52.1, avgMaturityYears: 6.5, weightedAvgCoupon: 2.92,
    creditRating: 'AAA', tenYearYield: 4.15,
    maturityWeights: [0.16, 0.18, 0.17, 0.14, 0.15, 0.12, 0.06, 0.02],
    auctionTenors: ['3Y', '5Y', '10Y', '20Y'], auctionSizeBase: 3, instrumentType: 'ACGBs',
  },
  {
    country: 'Brazil', isoCode: 'BR',
    totalDebtB: 1620, debtToGdpPct: 74.4, avgMaturityYears: 4.1, weightedAvgCoupon: 10.25,
    creditRating: 'BB', tenYearYield: 11.85,
    maturityWeights: [0.28, 0.24, 0.18, 0.12, 0.09, 0.05, 0.03, 0.01],
    auctionTenors: ['2Y', '5Y', '10Y'], auctionSizeBase: 4, instrumentType: 'NTN/LTN',
  },
  {
    country: 'India', isoCode: 'IN',
    totalDebtB: 2380, debtToGdpPct: 83.1, avgMaturityYears: 11.5, weightedAvgCoupon: 7.05,
    creditRating: 'BBB-', tenYearYield: 7.18,
    maturityWeights: [0.08, 0.12, 0.13, 0.13, 0.16, 0.18, 0.13, 0.07],
    auctionTenors: ['5Y', '7Y', '10Y', '14Y', '30Y', '40Y'], auctionSizeBase: 5, instrumentType: 'G-Sec',
  },
  {
    country: 'Mexico', isoCode: 'MX',
    totalDebtB: 720, debtToGdpPct: 52.8, avgMaturityYears: 7.8, weightedAvgCoupon: 8.15,
    creditRating: 'BBB', tenYearYield: 9.45,
    maturityWeights: [0.15, 0.18, 0.17, 0.14, 0.15, 0.12, 0.06, 0.03],
    auctionTenors: ['3Y', '5Y', '10Y', '20Y', '30Y'], auctionSizeBase: 3, instrumentType: 'Mbono',
  },
  {
    country: 'South Korea', isoCode: 'KR',
    totalDebtB: 860, debtToGdpPct: 54.3, avgMaturityYears: 7.2, weightedAvgCoupon: 3.18,
    creditRating: 'AA', tenYearYield: 3.52,
    maturityWeights: [0.15, 0.18, 0.17, 0.14, 0.15, 0.12, 0.06, 0.03],
    auctionTenors: ['3Y', '5Y', '10Y', '20Y', '30Y'], auctionSizeBase: 4, instrumentType: 'KTB',
  },
  {
    country: 'Indonesia', isoCode: 'ID',
    totalDebtB: 520, debtToGdpPct: 39.2, avgMaturityYears: 8.4, weightedAvgCoupon: 7.45,
    creditRating: 'BBB', tenYearYield: 6.85,
    maturityWeights: [0.12, 0.15, 0.16, 0.14, 0.16, 0.14, 0.08, 0.05],
    auctionTenors: ['5Y', '10Y', '15Y', '20Y', '30Y'], auctionSizeBase: 3, instrumentType: 'SUN/SBR',
  },
];

const MATURITY_BUCKETS = ['0-1Y', '1-3Y', '3-5Y', '5-7Y', '7-10Y', '10-20Y', '20-30Y', '30Y+'];

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('sovereign-debt-maturity-' + day));
  const today = new Date();

  // Find the US 10Y yield for spread calculation
  const usSeed = COUNTRY_SEEDS.find(s => s.isoCode === 'US')!;
  const us10YYield = roundTo(jitter(rng, usSeed.tenYearYield, 0.03), 2);

  // ── Country Profiles ──
  const countries: CountryDebtProfile[] = COUNTRY_SEEDS.map(seed => {
    const totalDebt = roundTo(jitter(rng, seed.totalDebtB, 0.02), 1);
    const debtToGdp = roundTo(jitter(rng, seed.debtToGdpPct, 0.015), 1);
    const avgMaturity = roundTo(jitter(rng, seed.avgMaturityYears, 0.03), 1);
    const wtdAvgCoupon = roundTo(jitter(rng, seed.weightedAvgCoupon, 0.04), 2);
    const tenYearYield = seed.isoCode === 'US'
      ? us10YYield
      : roundTo(jitter(rng, seed.tenYearYield, 0.04), 2);
    const spreadVsUs = seed.isoCode === 'US'
      ? 0
      : Math.round((tenYearYield - us10YYield) * 100);

    // Maturity profile with jittered weights
    const rawWeights = seed.maturityWeights.map(w => jitter(rng, w, 0.08));
    const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
    const normalizedWeights = rawWeights.map(w => w / totalWeight);

    const maturityProfile: MaturityBucket[] = MATURITY_BUCKETS.map((bucket, i) => {
      const amountB = roundTo(totalDebt * normalizedWeights[i], 1);
      const pctOfTotal = roundTo(normalizedWeights[i] * 100, 1);
      return { bucket, amountB, pctOfTotal };
    });

    // Refinancing need = 0-1Y bucket amount + partial rollover from other short-term
    const shortTermDebt = maturityProfile[0].amountB;
    const nearTermRollover = roundTo(maturityProfile[1].amountB * (rng() * 0.15 + 0.1), 1);
    const refinancingNeed12M = roundTo(shortTermDebt + nearTermRollover, 1);

    // Upcoming auctions (next 3 scheduled)
    const upcomingAuctions: UpcomingAuction[] = [];
    for (let a = 0; a < 3; a++) {
      const daysAhead = 3 + Math.floor(rng() * 18) + a * 10;
      const auctionDate = addBusinessDays(today, daysAhead);
      const tenor = seed.auctionTenors[Math.floor(rng() * seed.auctionTenors.length)];
      const estimatedSize = roundTo(jitter(rng, seed.auctionSizeBase, 0.2), 1);
      upcomingAuctions.push({
        date: auctionDate.toISOString().slice(0, 10),
        tenor,
        estimatedSizeB: estimatedSize,
      });
    }
    upcomingAuctions.sort((a, b) => a.date.localeCompare(b.date));

    return {
      country: seed.country,
      isoCode: seed.isoCode,
      totalDebtOutstandingB: totalDebt,
      debtToGdpPct: debtToGdp,
      maturityProfile,
      avgMaturityYears: avgMaturity,
      weightedAvgCouponPct: wtdAvgCoupon,
      refinancingNeed12MB: refinancingNeed12M,
      upcomingAuctions,
      creditRating: seed.creditRating,
      tenYearYieldPct: tenYearYield,
      spreadVsUsBps: spreadVsUs,
    };
  });

  // ── Global Summary ──
  const totalDebtOutstandingT = roundTo(
    countries.reduce((sum, c) => sum + c.totalDebtOutstandingB, 0) / 1000, 1
  );
  const totalMaturingNext12MT = roundTo(
    countries.reduce((sum, c) => sum + c.refinancingNeed12MB, 0) / 1000, 1
  );
  const avgGlobalDebtToGdp = roundTo(
    countries.reduce((sum, c) => sum + c.debtToGdpPct, 0) / countries.length, 1
  );

  const sortedByRefinancing = [...countries]
    .sort((a, b) => b.refinancingNeed12MB - a.refinancingNeed12MB)
    .slice(0, 5);

  const heaviestRefinancingNeeds = sortedByRefinancing.map(c => ({
    country: c.country,
    refinancingNeedB: c.refinancingNeed12MB,
    pctOfDebt: roundTo((c.refinancingNeed12MB / c.totalDebtOutstandingB) * 100, 1),
  }));

  const globalSummary: GlobalSummary = {
    totalDebtOutstandingT,
    totalMaturingNext12MT,
    heaviestRefinancingNeeds,
    avgGlobalDebtToGdpPct: avgGlobalDebtToGdp,
  };

  // ── Maturity Wall (quarterly for next 3 years = 12 quarters) ──
  const maturityWall: MaturityWallQuarter[] = [];
  const currentYear = today.getFullYear();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;

  for (let q = 0; q < 12; q++) {
    const qIdx = ((currentQuarter - 1 + q) % 4) + 1;
    const yearOffset = Math.floor((currentQuarter - 1 + q) / 4);
    const year = currentYear + yearOffset;
    const quarterLabel = `${year} Q${qIdx}`;

    const byCountry: { country: string; amountB: number }[] = [];
    let totalMaturingB = 0;

    for (const c of countries) {
      // Distribute the 0-1Y and 1-3Y buckets across quarters with decay
      const annualBase = c.maturityProfile[0].amountB / 4; // quarterly from 0-1Y
      const mediumBase = c.maturityProfile[1].amountB / 8; // quarterly from 1-3Y (spread over 8Q)
      const longerBase = c.maturityProfile[2].amountB / 12; // quarterly from 3-5Y (over 12Q)

      // Earlier quarters get more from short-term, later get medium-term
      let quarterAmount: number;
      if (q < 4) {
        quarterAmount = annualBase * jitter(rng, 1.0, 0.15) + mediumBase * jitter(rng, 0.5, 0.2);
      } else if (q < 8) {
        quarterAmount = annualBase * jitter(rng, 0.3, 0.15) + mediumBase * jitter(rng, 1.0, 0.15) + longerBase * jitter(rng, 0.4, 0.2);
      } else {
        quarterAmount = mediumBase * jitter(rng, 0.8, 0.15) + longerBase * jitter(rng, 1.0, 0.15);
      }

      const amt = roundTo(Math.max(quarterAmount, 0.1), 1);
      byCountry.push({ country: c.country, amountB: amt });
      totalMaturingB += amt;
    }

    byCountry.sort((a, b) => b.amountB - a.amountB);

    maturityWall.push({
      quarter: quarterLabel,
      totalMaturingB: roundTo(totalMaturingB, 1),
      byCountry,
    });
  }

  // ── Issuance Calendar (major upcoming auctions across countries) ──
  const issuanceCalendar: IssuanceCalendarEntry[] = [];
  for (const c of countries) {
    const seed = COUNTRY_SEEDS.find(s => s.isoCode === c.isoCode)!;
    for (const auction of c.upcomingAuctions) {
      issuanceCalendar.push({
        country: c.country,
        date: auction.date,
        tenor: auction.tenor,
        estimatedSizeB: auction.estimatedSizeB,
        instrumentType: seed.instrumentType,
      });
    }
  }
  issuanceCalendar.sort((a, b) => a.date.localeCompare(b.date));

  return {
    countries,
    globalSummary,
    maturityWall,
    issuanceCalendar,
    timestamp: new Date().toISOString(),
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
    console.error('[SovereignDebtMaturity] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate sovereign debt maturity data' });
  }
});

export default router;
