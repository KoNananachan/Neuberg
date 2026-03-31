import { Router, Request, Response } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface BondDef {
  issuer: string;
  sector: string;
  rating: string;
  baseCoupon: number;
  baseSpread: number;
}

interface LadderBond {
  isin: string;
  issuer: string;
  coupon: number;
  maturity: string;
  yearsToMaturity: number;
  rating: string;
  sector: string;
  price: number;
  yield: number;
  spread: number;
  faceValue: number;
  marketValue: number;
  duration: number;
  convexity: number;
  annualIncome: number;
  nextCouponDate: string;
}

interface CashFlow {
  year: number;
  couponIncome: number;
  principalReturn: number;
  totalCashFlow: number;
  cumulativeCashFlow: number;
}

interface MaturityBucket {
  bucket: string;
  count: number;
  faceValue: number;
  weight: number;
  avgYield: number;
  avgRating: string;
}

interface LadderMetrics {
  totalFaceValue: number;
  totalMarketValue: number;
  weightedAvgYield: number;
  weightedAvgDuration: number;
  weightedAvgRating: string;
  totalAnnualIncome: number;
  yieldToWorst: number;
}

interface LadderSummary {
  totalInvestment: number;
  annualIncome: number;
  avgYield: number;
  avgDuration: number;
  shortestMaturity: string;
  longestMaturity: string;
}

interface LadderData {
  bonds: LadderBond[];
  cashFlows: CashFlow[];
  maturityDistribution: MaturityBucket[];
  metrics: LadderMetrics;
  summary: LadderSummary;
  generatedAt: string;
}

// ── Static configs ──

const BOND_DEFS: BondDef[] = [
  { issuer: 'US Treasury',         sector: 'Government',  rating: 'AAA',  baseCoupon: 4.25, baseSpread: 0   },
  { issuer: 'Apple Inc',           sector: 'Technology',  rating: 'AA+',  baseCoupon: 4.55, baseSpread: 35  },
  { issuer: 'Microsoft Corp',      sector: 'Technology',  rating: 'AAA',  baseCoupon: 4.40, baseSpread: 25  },
  { issuer: 'JPMorgan Chase',      sector: 'Finance',     rating: 'A+',   baseCoupon: 5.10, baseSpread: 85  },
  { issuer: 'Berkshire Hathaway',  sector: 'Finance',     rating: 'AA',   baseCoupon: 4.80, baseSpread: 55  },
  { issuer: 'Alphabet Inc',        sector: 'Technology',  rating: 'AA+',  baseCoupon: 4.50, baseSpread: 30  },
  { issuer: 'Johnson & Johnson',   sector: 'Healthcare',  rating: 'AAA',  baseCoupon: 4.35, baseSpread: 20  },
  { issuer: 'Pfizer Inc',          sector: 'Healthcare',  rating: 'A+',   baseCoupon: 5.05, baseSpread: 80  },
  { issuer: 'Exxon Mobil',         sector: 'Energy',      rating: 'AA-',  baseCoupon: 4.90, baseSpread: 65  },
  { issuer: 'Procter & Gamble',    sector: 'Consumer',    rating: 'AA-',  baseCoupon: 4.70, baseSpread: 45  },
  { issuer: 'Verizon Comms',       sector: 'Telecom',     rating: 'BBB+', baseCoupon: 5.30, baseSpread: 110 },
  { issuer: 'Walmart Inc',         sector: 'Consumer',    rating: 'AA',   baseCoupon: 4.60, baseSpread: 40  },
  { issuer: 'Walt Disney Co',      sector: 'Consumer',    rating: 'A',    baseCoupon: 5.20, baseSpread: 100 },
  { issuer: 'Caterpillar Inc',     sector: 'Industrial',  rating: 'A',    baseCoupon: 5.15, baseSpread: 95  },
  { issuer: '3M Company',          sector: 'Industrial',  rating: 'A-',   baseCoupon: 5.40, baseSpread: 120 },
];

const RATING_NUMERIC: Record<string, number> = {
  'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4,
  'A+': 5, 'A': 6, 'A-': 7, 'BBB+': 8,
};
let cache: { data: LadderData; ts: number } | null = null;

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateIsin(rng: () => number, countryCode: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = countryCode;
  for (let i = 0; i < 9; i++) {
    code += chars[Math.floor(rng() * chars.length)];
  }
  code += Math.floor(rng() * 10).toString();
  return code;
}

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

// ── Data generation ──

function generate(): LadderData {
  const rng = seededRandom('bond-ladder');
  const today = new Date();

  // Generate 15 bonds with maturities from 1Y to 15Y
  const bonds: LadderBond[] = BOND_DEFS.map((def, idx) => {
    const yearsToMaturity = idx + 1; // 1Y through 15Y

    // Base Treasury yield curve: short end ~4.2%, belly ~4.5%, long end ~4.8%
    const treasuryYield = 4.2 + (yearsToMaturity / 15) * 0.6 + (rng() - 0.5) * 0.1;

    // Corporate spread increases with maturity and credit risk
    const maturitySpreadAdj = yearsToMaturity * 2; // 2bps per year
    const totalSpread = def.baseSpread + maturitySpreadAdj + (rng() - 0.5) * 15;
    const bondYield = def.sector === 'Government'
      ? treasuryYield + (rng() - 0.5) * 0.05
      : treasuryYield + totalSpread / 100;

    // Coupon set near yield with small variance
    const coupon = roundTo(def.baseCoupon + (yearsToMaturity - 8) * 0.04 + (rng() - 0.5) * 0.2, 3);

    // Price derived from coupon vs yield relationship (simplified)
    const yieldDiff = coupon - bondYield;
    const priceAdj = yieldDiff * yearsToMaturity * 0.85;
    const price = roundTo(100 + priceAdj + (rng() - 0.5) * 0.5, 3);

    // Maturity date
    const maturityDate = new Date(today);
    maturityDate.setFullYear(maturityDate.getFullYear() + yearsToMaturity);

    // Next coupon date (semi-annual, next occurrence)
    const nextCoupon = new Date(today);
    nextCoupon.setMonth(nextCoupon.getMonth() + 1 + Math.floor(rng() * 5));

    const faceValue = 100000;
    const marketValue = roundTo(faceValue * (price / 100), 2);
    const annualIncome = roundTo(faceValue * (coupon / 100), 2);

    // Modified duration approximation
    const duration = roundTo(
      yearsToMaturity * (1 - coupon / (coupon + 100 / yearsToMaturity)) * 0.95 + (rng() - 0.5) * 0.2,
      2
    );
    // Convexity approximation
    const convexity = roundTo(
      (duration * duration + duration) / (1 + bondYield / 200) + (rng() - 0.5) * 2,
      2
    );

    const spread = def.sector === 'Government'
      ? 0
      : roundTo(totalSpread, 1);

    return {
      isin: generateIsin(rng, def.sector === 'Government' ? 'US' : 'US'),
      issuer: def.issuer,
      coupon: roundTo(coupon, 3),
      maturity: formatDate(maturityDate),
      yearsToMaturity,
      rating: def.rating,
      sector: def.sector,
      price,
      yield: roundTo(bondYield, 3),
      spread,
      faceValue,
      marketValue,
      duration: Math.max(0.5, duration),
      convexity: Math.max(0.1, convexity),
      annualIncome,
      nextCouponDate: formatDate(nextCoupon),
    };
  });

  // ── Cash flows by year for next 15 years ──
  let cumulative = 0;
  const cashFlows: CashFlow[] = [];
  for (let year = 1; year <= 15; year++) {
    let couponIncome = 0;
    let principalReturn = 0;

    for (const bond of bonds) {
      if (bond.yearsToMaturity >= year) {
        couponIncome += bond.annualIncome;
      }
      if (bond.yearsToMaturity === year) {
        principalReturn += bond.faceValue;
      }
    }

    couponIncome = roundTo(couponIncome, 2);
    principalReturn = roundTo(principalReturn, 2);
    const totalCashFlow = roundTo(couponIncome + principalReturn, 2);
    cumulative = roundTo(cumulative + totalCashFlow, 2);

    cashFlows.push({
      year,
      couponIncome,
      principalReturn,
      totalCashFlow,
      cumulativeCashFlow: cumulative,
    });
  }

  // ── Maturity distribution buckets ──
  const bucketDefs: { label: string; min: number; max: number }[] = [
    { label: '0-3Y',   min: 0,  max: 3  },
    { label: '3-5Y',   min: 3,  max: 5  },
    { label: '5-7Y',   min: 5,  max: 7  },
    { label: '7-10Y',  min: 7,  max: 10 },
    { label: '10-15Y', min: 10, max: 15 },
  ];

  const maturityDistribution: MaturityBucket[] = bucketDefs.map(bd => {
    const bucketBonds = bonds.filter(
      b => b.yearsToMaturity > bd.min && b.yearsToMaturity <= bd.max
    );
    const count = bucketBonds.length;
    const faceValue = count * 100000;
    const totalFace = bonds.length * 100000;
    const weight = roundTo((faceValue / totalFace) * 100, 1);

    let avgYield = 0;
    let avgRatingNum = 0;
    if (count > 0) {
      avgYield = roundTo(
        bucketBonds.reduce((s, b) => s + b.yield, 0) / count,
        3
      );
      avgRatingNum = bucketBonds.reduce(
        (s, b) => s + (RATING_NUMERIC[b.rating] ?? 5),
        0
      ) / count;
    }

    return {
      bucket: bd.label,
      count,
      faceValue,
      weight,
      avgYield,
      avgRating: count > 0 ? numericToRating(avgRatingNum) : 'N/A',
    };
  });

  // ── Portfolio metrics ──
  const totalFaceValue = bonds.reduce((s, b) => s + b.faceValue, 0);
  const totalMarketValue = roundTo(bonds.reduce((s, b) => s + b.marketValue, 0), 2);
  const totalAnnualIncome = roundTo(bonds.reduce((s, b) => s + b.annualIncome, 0), 2);

  const weightedAvgYield = roundTo(
    bonds.reduce((s, b) => s + b.yield * b.marketValue, 0) / totalMarketValue,
    3
  );
  const weightedAvgDuration = roundTo(
    bonds.reduce((s, b) => s + b.duration * b.marketValue, 0) / totalMarketValue,
    2
  );
  const weightedAvgRatingNum =
    bonds.reduce((s, b) => s + (RATING_NUMERIC[b.rating] ?? 5) * b.marketValue, 0) / totalMarketValue;

  const yieldToWorst = roundTo(
    Math.min(...bonds.map(b => b.yield)),
    3
  );

  const metrics: LadderMetrics = {
    totalFaceValue,
    totalMarketValue,
    weightedAvgYield,
    weightedAvgDuration,
    weightedAvgRating: numericToRating(weightedAvgRatingNum),
    totalAnnualIncome,
    yieldToWorst,
  };

  // ── Summary ──
  const sortedByMaturity = [...bonds].sort(
    (a, b) => a.yearsToMaturity - b.yearsToMaturity
  );
  const summary: LadderSummary = {
    totalInvestment: totalMarketValue,
    annualIncome: totalAnnualIncome,
    avgYield: weightedAvgYield,
    avgDuration: weightedAvgDuration,
    shortestMaturity: sortedByMaturity[0].maturity,
    longestMaturity: sortedByMaturity[sortedByMaturity.length - 1].maturity,
  };

  return {
    bonds,
    cashFlows,
    maturityDistribution,
    metrics,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[BondLadder] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate bond ladder data' });
  }
});

export default router;
