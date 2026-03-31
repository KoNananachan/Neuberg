import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom } from '../lib/seeded-data.js';
const router = Router();

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface BondDef {
  maturityYear: number;
  issuer: string;
  description: string;
  type: 'UST' | 'CORP_IG' | 'AGENCY';
  baseCoupon: number;
  baseYield: number;
  rating: string;
  parAmount: number; // in $K
}

interface LadderBond {
  maturityYear: number;
  issuer: string;
  description: string;
  type: string;
  coupon: number;
  yield: number;
  price: number;
  parAmount: number;
  marketValue: number;
  duration: number;
  creditRating: string;
}

interface CashFlowEntry {
  year: number;
  couponIncome: number;
  principalReturns: number;
  total: number;
  runningTotal: number;
}

interface PortfolioSummary {
  totalPar: number;
  totalMarketValue: number;
  weightedAvgCoupon: number;
  weightedAvgYield: number;
  weightedAvgDuration: number;
  weightedAvgMaturity: number;
  avgCreditQuality: string;
}

interface MaturityBucket {
  bucket: string;
  parAmount: number;
  pctOfTotal: number;
  avgYield: number;
}

interface FixedIncomeLadderData {
  bondLadder: LadderBond[];
  cashFlowSchedule: CashFlowEntry[];
  portfolioSummary: PortfolioSummary;
  maturityDistribution: MaturityBucket[];
  generatedAt: string;
}

// ── Static bond definitions ──

const BOND_DEFS: BondDef[] = [
  { maturityYear: 2025, issuer: 'US Treasury',     description: 'UST 2.875% 2025',         type: 'UST',     baseCoupon: 2.875, baseYield: 4.85, rating: 'AAA', parAmount: 250 },
  { maturityYear: 2026, issuer: 'FHLMC',           description: 'Freddie Mac 3.125% 2026', type: 'AGENCY',  baseCoupon: 3.125, baseYield: 4.92, rating: 'AA+', parAmount: 200 },
  { maturityYear: 2027, issuer: 'Apple Inc',       description: 'AAPL 3.250% 2027',        type: 'CORP_IG', baseCoupon: 3.250, baseYield: 4.78, rating: 'AA+', parAmount: 150 },
  { maturityYear: 2028, issuer: 'US Treasury',     description: 'UST 3.500% 2028',         type: 'UST',     baseCoupon: 3.500, baseYield: 4.65, rating: 'AAA', parAmount: 300 },
  { maturityYear: 2029, issuer: 'Microsoft Corp',  description: 'MSFT 3.625% 2029',        type: 'CORP_IG', baseCoupon: 3.625, baseYield: 4.58, rating: 'AAA', parAmount: 200 },
  { maturityYear: 2030, issuer: 'FNMA',            description: 'Fannie Mae 3.750% 2030',  type: 'AGENCY',  baseCoupon: 3.750, baseYield: 4.70, rating: 'AA+', parAmount: 175 },
  { maturityYear: 2031, issuer: 'JPMorgan Chase',  description: 'JPM 4.125% 2031',         type: 'CORP_IG', baseCoupon: 4.125, baseYield: 4.95, rating: 'A+',  parAmount: 150 },
  { maturityYear: 2032, issuer: 'US Treasury',     description: 'UST 4.250% 2032',         type: 'UST',     baseCoupon: 4.250, baseYield: 4.52, rating: 'AAA', parAmount: 350 },
  { maturityYear: 2033, issuer: 'FHLB',            description: 'FHLB 4.000% 2033',        type: 'AGENCY',  baseCoupon: 4.000, baseYield: 4.68, rating: 'AA+', parAmount: 200 },
  { maturityYear: 2034, issuer: 'Johnson & Johnson', description: 'JNJ 4.375% 2034',       type: 'CORP_IG', baseCoupon: 4.375, baseYield: 4.82, rating: 'AAA', parAmount: 175 },
  { maturityYear: 2035, issuer: 'US Treasury',     description: 'UST 4.500% 2035',         type: 'UST',     baseCoupon: 4.500, baseYield: 4.48, rating: 'AAA', parAmount: 300 },
];

// ── Rating numeric mapping ──

const RATING_NUMERIC: Record<string, number> = {
  'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4,
  'A+': 5, 'A': 6, 'A-': 7, 'BBB+': 8, 'BBB': 9,
};

function numericToRating(n: number): string {
  const entries = Object.entries(RATING_NUMERIC);
  let closest = entries[0];
  for (const entry of entries) {
    if (Math.abs(entry[1] - n) < Math.abs(closest[1] - n)) {
      closest = entry;
    }
  }
  return closest[0];
}

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ── Data generation ──

function generate(): FixedIncomeLadderData {
  const rng = seededRandom('fixed-income-ladder');
  const currentYear = new Date().getFullYear();

  // Generate bond ladder
  const bondLadder: LadderBond[] = BOND_DEFS.map((def) => {
    const yearsToMaturity = Math.max(0.25, def.maturityYear - currentYear + rng() * 0.5);

    // Add small daily noise to coupon and yield
    const coupon = roundTo(def.baseCoupon + (rng() - 0.5) * 0.15, 3);
    const yieldPct = roundTo(def.baseYield + (rng() - 0.5) * 0.20, 3);

    // Price derived from coupon vs yield (simplified bond pricing)
    const yieldDiff = coupon - yieldPct;
    const priceAdj = yieldDiff * yearsToMaturity * 0.85;
    const price = roundTo(100 + priceAdj + (rng() - 0.5) * 0.3, 3);

    const parAmount = def.parAmount; // $K
    const marketValue = roundTo(parAmount * (price / 100), 2);

    // Modified duration approximation
    const duration = roundTo(
      yearsToMaturity * (1 - coupon / (coupon + 100 / yearsToMaturity)) * 0.92 + (rng() - 0.5) * 0.15,
      2
    );

    return {
      maturityYear: def.maturityYear,
      issuer: def.issuer,
      description: def.description,
      type: def.type,
      coupon,
      yield: yieldPct,
      price,
      parAmount,
      marketValue,
      duration: Math.max(0.2, duration),
      creditRating: def.rating,
    };
  });

  // ── Cash flow schedule ──
  let runningTotal = 0;
  const cashFlowSchedule: CashFlowEntry[] = [];

  for (let year = currentYear; year <= 2035; year++) {
    let couponIncome = 0;
    let principalReturns = 0;

    for (const bond of bondLadder) {
      // Bonds still outstanding pay coupons
      if (bond.maturityYear >= year) {
        couponIncome += bond.parAmount * (bond.coupon / 100);
      }
      // Principal returned at maturity
      if (bond.maturityYear === year) {
        principalReturns += bond.parAmount;
      }
    }

    couponIncome = roundTo(couponIncome, 2);
    principalReturns = roundTo(principalReturns, 2);
    const total = roundTo(couponIncome + principalReturns, 2);
    runningTotal = roundTo(runningTotal + total, 2);

    cashFlowSchedule.push({
      year,
      couponIncome,
      principalReturns,
      total,
      runningTotal,
    });
  }

  // ── Portfolio summary ──
  const totalPar = bondLadder.reduce((s, b) => s + b.parAmount, 0);
  const totalMarketValue = roundTo(bondLadder.reduce((s, b) => s + b.marketValue, 0), 2);

  const weightedAvgCoupon = roundTo(
    bondLadder.reduce((s, b) => s + b.coupon * b.parAmount, 0) / totalPar,
    3
  );
  const weightedAvgYield = roundTo(
    bondLadder.reduce((s, b) => s + b.yield * b.parAmount, 0) / totalPar,
    3
  );
  const weightedAvgDuration = roundTo(
    bondLadder.reduce((s, b) => s + b.duration * b.marketValue, 0) / totalMarketValue,
    2
  );
  const weightedAvgMaturity = roundTo(
    bondLadder.reduce((s, b) => s + (b.maturityYear - currentYear) * b.parAmount, 0) / totalPar,
    2
  );
  const avgRatingNum =
    bondLadder.reduce((s, b) => s + (RATING_NUMERIC[b.creditRating] ?? 5) * b.parAmount, 0) / totalPar;

  const portfolioSummary: PortfolioSummary = {
    totalPar,
    totalMarketValue,
    weightedAvgCoupon,
    weightedAvgYield,
    weightedAvgDuration,
    weightedAvgMaturity,
    avgCreditQuality: numericToRating(avgRatingNum),
  };

  // ── Maturity distribution ──
  const bucketDefs: { label: string; min: number; max: number }[] = [
    { label: '0-1Y',  min: 0,  max: 1  },
    { label: '1-3Y',  min: 1,  max: 3  },
    { label: '3-5Y',  min: 3,  max: 5  },
    { label: '5-7Y',  min: 5,  max: 7  },
    { label: '7-10Y', min: 7,  max: 10 },
    { label: '10+Y',  min: 10, max: 100 },
  ];

  const maturityDistribution: MaturityBucket[] = bucketDefs.map((bd) => {
    const bucketBonds = bondLadder.filter((b) => {
      const ytm = b.maturityYear - currentYear;
      return ytm > bd.min && ytm <= bd.max;
    });

    const parAmount = bucketBonds.reduce((s, b) => s + b.parAmount, 0);
    const pctOfTotal = totalPar > 0 ? roundTo((parAmount / totalPar) * 100, 1) : 0;
    const avgYield = bucketBonds.length > 0
      ? roundTo(bucketBonds.reduce((s, b) => s + b.yield, 0) / bucketBonds.length, 3)
      : 0;

    return {
      bucket: bd.label,
      parAmount,
      pctOfTotal,
      avgYield,
    };
  });

  return {
    bondLadder,
    cashFlowSchedule,
    portfolioSummary,
    maturityDistribution,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FixedIncomeLadder] Error:', message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate fixed income ladder data' });
  }
});

export default router;
