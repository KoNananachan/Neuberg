import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Types ──

interface MarketOverview {
  totalOutstandingTrillions: number;
  ytdIssuanceBillions: number;
  avgSpreadBps: number;
  avgCouponPct: number;
  avgRating: string;
  coverPoolQuality: string;
}

interface CountryData {
  country: string;
  outstandingBillions: number;
  avgSpreadBps: number;
  avgCouponPct: number;
  avgWALYears: number;
  coverRatioPct: number;
  delinquencyRatePct: number;
}

interface RecentIssuance {
  issuer: string;
  country: string;
  sizeMillions: number;
  currency: string;
  couponPct: number;
  maturity: string;
  spreadBps: number;
  rating: string;
  coverType: string;
  benchmarkStatus: string;
}

interface SpreadTenor {
  tenor: string;
  spreadBps: number;
  change1WBps: number;
  change1MBps: number;
  range52W: { low: number; high: number };
}

interface TopIssuer {
  issuer: string;
  country: string;
  outstandingBillions: number;
  bondCount: number;
  avgSpreadBps: number;
  rating: string;
  coverPool: string;
}

interface CoverPoolMetrics {
  avgLTVPct: number;
  avgSeasoningYears: number;
  geographicDiversification: string;
  delinquencyRatePct: number;
  overcollateralizationPct: number;
}

interface IndexData {
  level: number;
  return1MPct: number;
  returnYTDPct: number;
}

interface PerformanceIndices {
  iboxxCoveredEUR: IndexData;
  iboxxCoveredGBP: IndexData;
  bloombergCovered: IndexData;
}

interface Summary {
  totalMarketTrillions: number;
  avgSpreadVsSwapBps: number;
  spreadTrend: string;
  newSupplyPace: string;
  qualityIndicator: string;
}

interface CoveredBondResponse {
  marketOverview: MarketOverview;
  byCountry: CountryData[];
  recentIssuance: RecentIssuance[];
  spreadAnalysis: SpreadTenor[];
  topIssuers: TopIssuer[];
  coverPoolMetrics: CoverPoolMetrics;
  performanceIndices: PerformanceIndices;
  summary: Summary;
  generatedAt: string;
}

// ── Seed Data ──

const COUNTRY_SEEDS: {
  country: string;
  baseOutstanding: number;
  baseSpread: number;
  baseCoupon: number;
  baseWAL: number;
  baseCoverRatio: number;
  baseDelinquency: number;
}[] = [
  { country: 'Germany (Pfandbrief)', baseOutstanding: 385, baseSpread: 14, baseCoupon: 2.65, baseWAL: 4.8, baseCoverRatio: 132, baseDelinquency: 0.08 },
  { country: 'Denmark', baseOutstanding: 420, baseSpread: 18, baseCoupon: 2.85, baseWAL: 5.2, baseCoverRatio: 128, baseDelinquency: 0.12 },
  { country: 'France', baseOutstanding: 340, baseSpread: 22, baseCoupon: 3.05, baseWAL: 5.5, baseCoverRatio: 135, baseDelinquency: 0.15 },
  { country: 'Spain', baseOutstanding: 245, baseSpread: 38, baseCoupon: 3.45, baseWAL: 6.1, baseCoverRatio: 148, baseDelinquency: 0.42 },
  { country: 'Italy', baseOutstanding: 165, baseSpread: 42, baseCoupon: 3.55, baseWAL: 5.8, baseCoverRatio: 155, baseDelinquency: 0.55 },
  { country: 'Sweden', baseOutstanding: 235, baseSpread: 16, baseCoupon: 2.75, baseWAL: 4.5, baseCoverRatio: 130, baseDelinquency: 0.10 },
  { country: 'Norway', baseOutstanding: 125, baseSpread: 19, baseCoupon: 3.10, baseWAL: 4.2, baseCoverRatio: 126, baseDelinquency: 0.09 },
  { country: 'Canada', baseOutstanding: 210, baseSpread: 28, baseCoupon: 3.80, baseWAL: 4.9, baseCoverRatio: 138, baseDelinquency: 0.18 },
  { country: 'Australia', baseOutstanding: 95, baseSpread: 32, baseCoupon: 4.15, baseWAL: 4.6, baseCoverRatio: 142, baseDelinquency: 0.22 },
  { country: 'United Kingdom', baseOutstanding: 115, baseSpread: 26, baseCoupon: 4.05, baseWAL: 5.0, baseCoverRatio: 136, baseDelinquency: 0.20 },
];

const ISSUER_POOL: {
  issuer: string;
  country: string;
  currency: string;
  rating: string;
  coverType: string;
}[] = [
  { issuer: 'Deutsche Pfandbriefbank', country: 'Germany', currency: 'EUR', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'Muenchener Hypothekenbank', country: 'Germany', currency: 'EUR', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'Nykredit Realkredit', country: 'Denmark', currency: 'DKK', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'Realkredit Danmark', country: 'Denmark', currency: 'DKK', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'Credit Agricole Home Loan SFH', country: 'France', currency: 'EUR', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'BNP Paribas Home Loan SFH', country: 'France', currency: 'EUR', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'CaixaBank', country: 'Spain', currency: 'EUR', rating: 'AA', coverType: 'mortgage' },
  { issuer: 'Santander', country: 'Spain', currency: 'EUR', rating: 'AA', coverType: 'public sector' },
  { issuer: 'UniCredit Bank AG', country: 'Italy', currency: 'EUR', rating: 'AA-', coverType: 'mortgage' },
  { issuer: 'Toronto-Dominion Bank', country: 'Canada', currency: 'CAD', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'Westpac Banking Corp', country: 'Australia', currency: 'AUD', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'Barclays Bank UK', country: 'United Kingdom', currency: 'GBP', rating: 'AA', coverType: 'mortgage' },
  { issuer: 'Nordea Mortgage Bank', country: 'Sweden', currency: 'SEK', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'DNB Boligkreditt', country: 'Norway', currency: 'NOK', rating: 'AAA', coverType: 'mortgage' },
  { issuer: 'Commerzbank AG', country: 'Germany', currency: 'EUR', rating: 'AAA', coverType: 'public sector' },
];

const TOP_ISSUER_SEEDS: {
  issuer: string;
  country: string;
  baseOutstanding: number;
  baseBondCount: number;
  baseSpread: number;
  rating: string;
  coverPool: string;
}[] = [
  { issuer: 'Nykredit Realkredit', country: 'Denmark', baseOutstanding: 148, baseBondCount: 285, baseSpread: 16, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'Realkredit Danmark', country: 'Denmark', baseOutstanding: 112, baseBondCount: 195, baseSpread: 17, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'Muenchener Hypothekenbank', country: 'Germany', baseOutstanding: 68, baseBondCount: 85, baseSpread: 12, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'Deutsche Pfandbriefbank', country: 'Germany', baseOutstanding: 55, baseBondCount: 72, baseSpread: 14, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'Credit Agricole Home Loan SFH', country: 'France', baseOutstanding: 62, baseBondCount: 48, baseSpread: 20, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'BNP Paribas Home Loan SFH', country: 'France', baseOutstanding: 58, baseBondCount: 45, baseSpread: 21, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'Nordea Mortgage Bank', country: 'Sweden', baseOutstanding: 52, baseBondCount: 65, baseSpread: 15, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'CaixaBank', country: 'Spain', baseOutstanding: 45, baseBondCount: 38, baseSpread: 36, rating: 'AA', coverPool: 'mortgage' },
  { issuer: 'Toronto-Dominion Bank', country: 'Canada', baseOutstanding: 42, baseBondCount: 32, baseSpread: 26, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'Commerzbank AG', country: 'Germany', baseOutstanding: 38, baseBondCount: 55, baseSpread: 13, rating: 'AAA', coverPool: 'public sector' },
  { issuer: 'DNB Boligkreditt', country: 'Norway', baseOutstanding: 35, baseBondCount: 42, baseSpread: 18, rating: 'AAA', coverPool: 'mortgage' },
  { issuer: 'Hamburg Commercial Bank', country: 'Germany', baseOutstanding: 22, baseBondCount: 28, baseSpread: 15, rating: 'AAA', coverPool: 'ship' },
];

const MATURITY_OPTIONS = ['2027-03-15', '2028-06-20', '2029-01-15', '2029-09-10', '2030-04-25', '2031-03-15', '2032-06-01', '2033-09-15', '2034-01-20', '2036-06-15'];
const BENCHMARK_STATUSES = ['Benchmark', 'Sub-benchmark', 'Tap', 'Benchmark'] as const;

// ── Data Generation ──

function generateMarketOverview(rng: () => number): MarketOverview {
  const totalOutstanding = roundTo(2.75 + (rng() - 0.5) * 0.3, 2);
  const ytdIssuance = roundTo(185 + (rng() - 0.5) * 60, 1);
  const avgSpread = roundTo(22 + (rng() - 0.5) * 10, 0);
  const avgCoupon = roundTo(3.15 + (rng() - 0.5) * 0.6, 2);
  const qualityOptions = ['Strong', 'Very Strong', 'Excellent'];
  const ratingOptions = ['AAA/Aaa', 'AA+/Aa1', 'AAA/Aaa'];

  return {
    totalOutstandingTrillions: totalOutstanding,
    ytdIssuanceBillions: ytdIssuance,
    avgSpreadBps: avgSpread,
    avgCouponPct: avgCoupon,
    avgRating: pick(ratingOptions, rng),
    coverPoolQuality: pick(qualityOptions, rng),
  };
}

function generateByCountry(rng: () => number): CountryData[] {
  return COUNTRY_SEEDS.map((seed) => {
    const outstandingJitter = (rng() - 0.5) * seed.baseOutstanding * 0.08;
    const spreadJitter = (rng() - 0.5) * seed.baseSpread * 0.15;
    const couponJitter = (rng() - 0.5) * 0.3;
    const walJitter = (rng() - 0.5) * 0.6;
    const coverJitter = (rng() - 0.5) * 8;
    const delinqJitter = (rng() - 0.5) * seed.baseDelinquency * 0.3;

    return {
      country: seed.country,
      outstandingBillions: roundTo(Math.max(20, seed.baseOutstanding + outstandingJitter), 1),
      avgSpreadBps: roundTo(Math.max(5, seed.baseSpread + spreadJitter), 0),
      avgCouponPct: roundTo(Math.max(0.5, seed.baseCoupon + couponJitter), 2),
      avgWALYears: roundTo(Math.max(2, seed.baseWAL + walJitter), 1),
      coverRatioPct: roundTo(Math.max(105, seed.baseCoverRatio + coverJitter), 1),
      delinquencyRatePct: roundTo(Math.max(0.01, seed.baseDelinquency + delinqJitter), 2),
    };
  });
}

function generateRecentIssuance(rng: () => number): RecentIssuance[] {
  const shuffled = [...ISSUER_POOL].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 10);

  return selected.map((issuerData) => {
    const sizeBase = issuerData.rating === 'AAA' ? 1250 : 750;
    const size = roundTo(sizeBase * (0.4 + rng() * 1.2), 0);
    const coupon = roundTo(2.0 + rng() * 2.5, 3);
    const spread = issuerData.coverType === 'mortgage'
      ? roundTo(12 + rng() * 35, 0)
      : roundTo(8 + rng() * 25, 0);
    const maturity = pick(MATURITY_OPTIONS, rng);
    const benchmarkStatus = pick([...BENCHMARK_STATUSES], rng);

    return {
      issuer: issuerData.issuer,
      country: issuerData.country,
      sizeMillions: size,
      currency: issuerData.currency,
      couponPct: coupon,
      maturity,
      spreadBps: spread,
      rating: issuerData.rating,
      coverType: issuerData.coverType,
      benchmarkStatus,
    };
  });
}

function generateSpreadAnalysis(rng: () => number): SpreadTenor[] {
  const tenorSeeds: { tenor: string; baseSpread: number }[] = [
    { tenor: '3Y', baseSpread: 12 },
    { tenor: '5Y', baseSpread: 18 },
    { tenor: '7Y', baseSpread: 24 },
    { tenor: '10Y', baseSpread: 30 },
    { tenor: '15Y', baseSpread: 38 },
  ];

  return tenorSeeds.map((seed) => {
    const spread = roundTo(seed.baseSpread + (rng() - 0.5) * 6, 1);
    const change1W = roundTo((rng() - 0.5) * 4, 1);
    const change1M = roundTo((rng() - 0.5) * 8, 1);
    const rangeMid = spread;
    const rangeWidth = 8 + rng() * 12;
    const low = roundTo(rangeMid - rangeWidth / 2, 1);
    const high = roundTo(rangeMid + rangeWidth / 2, 1);

    return {
      tenor: seed.tenor,
      spreadBps: spread,
      change1WBps: change1W,
      change1MBps: change1M,
      range52W: { low: Math.max(3, low), high },
    };
  });
}

function generateTopIssuers(rng: () => number): TopIssuer[] {
  return TOP_ISSUER_SEEDS.map((seed) => {
    const outstandingJitter = (rng() - 0.5) * seed.baseOutstanding * 0.08;
    const bondCountJitter = Math.round((rng() - 0.5) * seed.baseBondCount * 0.1);
    const spreadJitter = (rng() - 0.5) * seed.baseSpread * 0.12;

    return {
      issuer: seed.issuer,
      country: seed.country,
      outstandingBillions: roundTo(Math.max(5, seed.baseOutstanding + outstandingJitter), 1),
      bondCount: Math.max(5, seed.baseBondCount + bondCountJitter),
      avgSpreadBps: roundTo(Math.max(3, seed.baseSpread + spreadJitter), 0),
      rating: seed.rating,
      coverPool: seed.coverPool,
    };
  });
}

function generateCoverPoolMetrics(rng: () => number): CoverPoolMetrics {
  const avgLTV = roundTo(52 + (rng() - 0.5) * 12, 1);
  const avgSeasoning = roundTo(4.5 + (rng() - 0.5) * 3, 1);
  const delinquency = roundTo(0.15 + (rng() - 0.5) * 0.12, 2);
  const overcollat = roundTo(35 + (rng() - 0.5) * 20, 1);

  const diversificationOptions = [
    'Well-diversified across major metro areas',
    'Concentrated in top-5 metro areas (65%)',
    'Broadly diversified with <15% single-region exposure',
    'Moderately diversified, 40% capital region',
  ];

  return {
    avgLTVPct: avgLTV,
    avgSeasoningYears: Math.max(1, avgSeasoning),
    geographicDiversification: pick(diversificationOptions, rng),
    delinquencyRatePct: Math.max(0.02, delinquency),
    overcollateralizationPct: Math.max(10, overcollat),
  };
}

function generatePerformanceIndices(rng: () => number): PerformanceIndices {
  const indexGen = (baseLevel: number): IndexData => ({
    level: roundTo(baseLevel + (rng() - 0.5) * baseLevel * 0.04, 2),
    return1MPct: roundTo((rng() - 0.45) * 2.5, 2),
    returnYTDPct: roundTo((rng() - 0.4) * 6, 2),
  });

  return {
    iboxxCoveredEUR: indexGen(232.45),
    iboxxCoveredGBP: indexGen(198.72),
    bloombergCovered: indexGen(215.38),
  };
}

function generateSummary(rng: () => number, overview: MarketOverview): Summary {
  const spreadTrends = ['Tightening', 'Stable', 'Slightly wider', 'Range-bound'];
  const supplyPaces = ['Above average', 'In line with 5Y average', 'Below average', 'Strong front-loading'];
  const qualityIndicators: ('strong' | 'stable' | 'deteriorating')[] = ['strong', 'stable', 'strong'];

  return {
    totalMarketTrillions: overview.totalOutstandingTrillions,
    avgSpreadVsSwapBps: overview.avgSpreadBps,
    spreadTrend: pick(spreadTrends, rng),
    newSupplyPace: pick(supplyPaces, rng),
    qualityIndicator: pick(qualityIndicators, rng),
  };
}

// ── Main Generator ──

function generate(): CoveredBondResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-covered-bond'));

  const marketOverview = generateMarketOverview(rng);
  const byCountry = generateByCountry(rng);
  const recentIssuance = generateRecentIssuance(rng);
  const spreadAnalysis = generateSpreadAnalysis(rng);
  const topIssuers = generateTopIssuers(rng);
  const coverPoolMetrics = generateCoverPoolMetrics(rng);
  const performanceIndices = generatePerformanceIndices(rng);
  const summary = generateSummary(rng, marketOverview);

  return {
    marketOverview,
    byCountry,
    recentIssuance,
    spreadAnalysis,
    topIssuers,
    coverPoolMetrics,
    performanceIndices,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

const CACHE_TTL = 12 * 60 * 60_000;
let cache: { data: CoveredBondResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CoveredBond] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate covered bond market data' });
  }
});

export default router;
