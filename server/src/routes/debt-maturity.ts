import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

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

// ── Types ──

interface MaturityYear {
  year: number;
  investmentGrade: number;
  highYield: number;
  leveragedLoans: number;
  total: number;
  percentOfOutstanding: number;
}

interface RatingBucket {
  rating: string;
  totalMaturingNext12m: number;
  totalMaturingNext24m: number;
  avgCoupon: number;
  avgYield: number;
  refiSpread: number;
}

interface SectorExposure {
  sector: string;
  maturingNext12m: number;
  avgRating: string;
  avgCoupon: number;
  refiRisk: 'low' | 'medium' | 'high';
}

interface RefinancingRisk {
  totalNeedingRefiNext12m: number;
  estimatedHigherInterestCost: number;
  distressedIssuersCount: number;
  potentialDowngradeCandidates: number;
  maturityWallStressIndex: number;
}

interface RecentDeal {
  issuer: string;
  size: number;
  coupon: number;
  oldCoupon: number;
  maturity: string;
  rating: string;
  spread: number;
  oversubscribed: number;
}

interface DebtMaturityWallResponse {
  maturityProfile: MaturityYear[];
  ratingBreakdown: RatingBucket[];
  sectorExposure: SectorExposure[];
  refinancingRisk: RefinancingRisk;
  recentIssuance: RecentDeal[];
  timestamp: string;
}

// ── Cache ──

let cached: { data: DebtMaturityWallResponse; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Helpers ──

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pickRating(rng: () => number, pool: string[]): string {
  return pool[Math.floor(rng() * pool.length)];
}

// ── Data generation ──

function generate(): DebtMaturityWallResponse {
  const seed = hashSeed('debt-maturity-wall-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);

  // Total outstanding estimates (approx): ~$10T IG, ~$1.5T HY, ~$1.4T leveraged loans
  const totalOutstanding = 12900; // $B approximate total corporate debt

  // maturityProfile: years 2025-2034
  // Realistic: ~$800B-1.2T IG/yr, ~$150-300B HY/yr, ~$100-250B loans/yr
  // Peaking in 2025-2027
  const maturityProfile: MaturityYear[] = [];

  // Base IG amounts per year (front-loaded wall peaking 2025-2027)
  const igBase = [1150, 1080, 1020, 920, 870, 840, 810, 790, 800, 830];
  const hyBase = [285, 260, 240, 210, 185, 170, 160, 155, 150, 165];
  const llBase = [230, 210, 195, 175, 155, 140, 125, 115, 110, 120];

  for (let i = 0; i < 10; i++) {
    const year = 2025 + i;
    const ig = round1(igBase[i] * randRange(rng, 0.92, 1.08));
    const hy = round1(hyBase[i] * randRange(rng, 0.88, 1.12));
    const ll = round1(llBase[i] * randRange(rng, 0.85, 1.15));
    const total = round1(ig + hy + ll);
    const pctOfOutstanding = round2((total / totalOutstanding) * 100);

    maturityProfile.push({
      year,
      investmentGrade: ig,
      highYield: hy,
      leveragedLoans: ll,
      total,
      percentOfOutstanding: pctOfOutstanding,
    });
  }

  // ratingBreakdown: BBB, BB, B, CCC/lower
  const ratingBreakdown: RatingBucket[] = [
    {
      rating: 'BBB',
      totalMaturingNext12m: round1(randRange(rng, 520, 620)),
      totalMaturingNext24m: round1(randRange(rng, 980, 1120)),
      avgCoupon: round2(randRange(rng, 3.80, 4.40)),
      avgYield: round2(randRange(rng, 5.20, 5.80)),
      refiSpread: 0,
    },
    {
      rating: 'BB',
      totalMaturingNext12m: round1(randRange(rng, 120, 180)),
      totalMaturingNext24m: round1(randRange(rng, 230, 340)),
      avgCoupon: round2(randRange(rng, 5.00, 5.80)),
      avgYield: round2(randRange(rng, 6.50, 7.40)),
      refiSpread: 0,
    },
    {
      rating: 'B',
      totalMaturingNext12m: round1(randRange(rng, 80, 130)),
      totalMaturingNext24m: round1(randRange(rng, 150, 250)),
      avgCoupon: round2(randRange(rng, 5.80, 6.80)),
      avgYield: round2(randRange(rng, 7.80, 9.20)),
      refiSpread: 0,
    },
    {
      rating: 'CCC/lower',
      totalMaturingNext12m: round1(randRange(rng, 25, 55)),
      totalMaturingNext24m: round1(randRange(rng, 50, 100)),
      avgCoupon: round2(randRange(rng, 7.00, 8.50)),
      avgYield: round2(randRange(rng, 10.50, 14.00)),
      refiSpread: 0,
    },
  ];

  // Compute refi spread = avgYield - avgCoupon
  for (const rb of ratingBreakdown) {
    rb.refiSpread = round2(rb.avgYield - rb.avgCoupon);
  }

  // sectorExposure: 8 sectors
  const sectors = [
    { sector: 'Technology', minAmt: 100, maxAmt: 160, ratings: ['BBB', 'BBB+', 'A-'], couponRange: [3.5, 4.5] as [number, number], riskBias: 0.2 },
    { sector: 'Healthcare', minAmt: 90, maxAmt: 145, ratings: ['BBB', 'BBB-', 'BB+'], couponRange: [4.0, 5.2] as [number, number], riskBias: 0.4 },
    { sector: 'Energy', minAmt: 110, maxAmt: 170, ratings: ['BB+', 'BB', 'BBB-'], couponRange: [5.0, 6.5] as [number, number], riskBias: 0.7 },
    { sector: 'Financials', minAmt: 130, maxAmt: 200, ratings: ['A-', 'BBB+', 'BBB'], couponRange: [3.8, 4.8] as [number, number], riskBias: 0.3 },
    { sector: 'Consumer', minAmt: 80, maxAmt: 130, ratings: ['BBB-', 'BB+', 'BB'], couponRange: [4.5, 5.8] as [number, number], riskBias: 0.5 },
    { sector: 'Industrials', minAmt: 75, maxAmt: 125, ratings: ['BBB', 'BBB-', 'A-'], couponRange: [4.0, 5.0] as [number, number], riskBias: 0.35 },
    { sector: 'Telecom', minAmt: 60, maxAmt: 110, ratings: ['BB+', 'BBB-', 'BB'], couponRange: [5.2, 6.5] as [number, number], riskBias: 0.6 },
    { sector: 'Utilities', minAmt: 55, maxAmt: 95, ratings: ['A-', 'BBB+', 'BBB'], couponRange: [3.5, 4.5] as [number, number], riskBias: 0.15 },
  ];

  const sectorExposure: SectorExposure[] = sectors.map((s) => {
    const amt = round1(randRange(rng, s.minAmt, s.maxAmt));
    const riskVal = s.riskBias + randRange(rng, -0.15, 0.15);
    let refiRisk: 'low' | 'medium' | 'high';
    if (riskVal < 0.33) refiRisk = 'low';
    else if (riskVal < 0.66) refiRisk = 'medium';
    else refiRisk = 'high';

    return {
      sector: s.sector,
      maturingNext12m: amt,
      avgRating: pickRating(rng, s.ratings),
      avgCoupon: round2(randRange(rng, s.couponRange[0], s.couponRange[1])),
      refiRisk,
    };
  });

  // refinancingRisk
  const totalRefi12m = ratingBreakdown.reduce((sum, rb) => sum + rb.totalMaturingNext12m, 0);
  const avgRefiSpread = ratingBreakdown.reduce((sum, rb) => sum + rb.refiSpread * rb.totalMaturingNext12m, 0) / totalRefi12m;
  const estimatedCost = round1((totalRefi12m * avgRefiSpread) / 100);

  const refinancingRisk: RefinancingRisk = {
    totalNeedingRefiNext12m: round1(totalRefi12m),
    estimatedHigherInterestCost: estimatedCost,
    distressedIssuersCount: Math.round(randRange(rng, 35, 75)),
    potentialDowngradeCandidates: Math.round(randRange(rng, 80, 160)),
    maturityWallStressIndex: round1(randRange(rng, 5.5, 7.8)),
  };

  // recentIssuance: 6 recent bond deals
  const issuers = [
    { name: 'Microsoft Corp', rating: 'AAA', oldCoupon: 2.40 },
    { name: 'Oracle Corp', rating: 'BBB', oldCoupon: 3.25 },
    { name: 'HCA Healthcare', rating: 'BB+', oldCoupon: 5.25 },
    { name: 'T-Mobile US', rating: 'BBB-', oldCoupon: 3.75 },
    { name: 'Ford Motor Credit', rating: 'BB+', oldCoupon: 4.38 },
    { name: 'Charter Communications', rating: 'BB+', oldCoupon: 4.75 },
  ];

  const maturityYears = [2029, 2030, 2031, 2032, 2033, 2034];

  const recentIssuance: RecentDeal[] = issuers.map((iss, idx) => {
    const size = round1(randRange(rng, 1.0, 5.5));
    const coupon = round2(iss.oldCoupon + randRange(rng, 0.80, 2.20));
    const spread = Math.round(randRange(rng, 85, 320));
    const oversubscribed = round1(randRange(rng, 1.8, 5.5));
    const matYear = maturityYears[idx];

    return {
      issuer: iss.name,
      size,
      coupon,
      oldCoupon: iss.oldCoupon,
      maturity: `${matYear}-${String(Math.floor(rng() * 12) + 1).padStart(2, '0')}-15`,
      rating: iss.rating,
      spread,
      oversubscribed,
    };
  });

  return {
    maturityProfile,
    ratingBreakdown,
    sectorExposure,
    refinancingRisk,
    recentIssuance,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    const data = generate();
    cached = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DebtMaturityWall] Error:', message);

    if (cached) {
      return res.json(cached.data);
    }
    res.status(500).json({ error: 'Failed to generate debt maturity wall data' });
  }
});

export default router;
