import { Router } from 'express';

const router = Router();

// ── Types ──

interface RatingBreakdown {
  aaa_aa: number;
  a: number;
  bbb: number;
  highYield: number;
}

interface MaturityBucket {
  year: number;
  amount: number;
  count: number;
  avgCoupon: number;
  avgYield: number;
  ratingBreakdown: RatingBreakdown;
  refinancingRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

interface EntityProfile {
  entity: string;
  label: string;
  totalOutstanding: number;
  avgMaturity: number;
  avgCoupon: number;
  avgYield: number;
  nearTermMaturities: number;
  wallYear: number;
  wallAmount: number;
}

interface DebtMaturityResponse {
  buckets: MaturityBucket[];
  profile: EntityProfile;
  entities: string[];
  refinancingCost: number;
  timestamp: string;
}

// ── Cache ──

const cache = new Map<string, { data: DebtMaturityResponse; expiresAt: number }>();
const CACHE_TTL = 15 * 60_000; // 15 minutes

// ── Entity configurations ──

const ENTITIES = ['US_IG', 'US_HY', 'EU_IG', 'EM_CORP', 'US_TREASURY'] as const;

interface EntityConfig {
  label: string;
  totalOutstanding: number;       // trillions
  avgMaturity: number;            // years
  baseCoupon: number;             // %
  baseYield: number;              // current yield %
  wallYearOffset: number;         // years from current year to peak wall
  peakMultiplier: number;         // how much the wall year exceeds avg
  ratingMix: { aaa_aa: number; a: number; bbb: number; hy: number };
  nearTermPct: number;            // % of total maturing in next 2 years
  refinancingSpread: number;      // bps increase if refinanced today
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  US_IG: {
    label: 'US Investment Grade',
    totalOutstanding: 5.8,
    avgMaturity: 8.2,
    baseCoupon: 3.85,
    baseYield: 5.32,
    wallYearOffset: 2,
    peakMultiplier: 1.8,
    ratingMix: { aaa_aa: 0.12, a: 0.35, bbb: 0.48, hy: 0.05 },
    nearTermPct: 0.14,
    refinancingSpread: 148,
  },
  US_HY: {
    label: 'US High Yield',
    totalOutstanding: 1.35,
    avgMaturity: 5.1,
    baseCoupon: 6.25,
    baseYield: 8.15,
    wallYearOffset: 1,
    peakMultiplier: 2.2,
    ratingMix: { aaa_aa: 0.0, a: 0.0, bbb: 0.12, hy: 0.88 },
    nearTermPct: 0.22,
    refinancingSpread: 195,
  },
  EU_IG: {
    label: 'European Investment Grade',
    totalOutstanding: 3.2,
    avgMaturity: 6.8,
    baseCoupon: 2.45,
    baseYield: 3.85,
    wallYearOffset: 2,
    peakMultiplier: 1.6,
    ratingMix: { aaa_aa: 0.18, a: 0.38, bbb: 0.40, hy: 0.04 },
    nearTermPct: 0.16,
    refinancingSpread: 138,
  },
  EM_CORP: {
    label: 'Emerging Market Corporate',
    totalOutstanding: 2.1,
    avgMaturity: 5.5,
    baseCoupon: 5.10,
    baseYield: 7.45,
    wallYearOffset: 1,
    peakMultiplier: 2.0,
    ratingMix: { aaa_aa: 0.05, a: 0.15, bbb: 0.42, hy: 0.38 },
    nearTermPct: 0.20,
    refinancingSpread: 235,
  },
  US_TREASURY: {
    label: 'US Treasury',
    totalOutstanding: 26.5,
    avgMaturity: 6.2,
    baseCoupon: 2.80,
    baseYield: 4.45,
    wallYearOffset: 1,
    peakMultiplier: 1.5,
    ratingMix: { aaa_aa: 1.0, a: 0.0, bbb: 0.0, hy: 0.0 },
    nearTermPct: 0.25,
    refinancingSpread: 165,
  },
};

// ── Data generation ──

/** Small deterministic jitter based on seed values */
function jitter(base: number, range: number, seed1: number, seed2: number): number {
  const hash = Math.sin(seed1 * 12.9898 + seed2 * 78.233) * 43758.5453;
  const t = hash - Math.floor(hash); // 0..1
  return base + (t - 0.5) * 2 * range;
}

function generateBuckets(entity: string, currentYear: number): MaturityBucket[] {
  const cfg = ENTITY_CONFIGS[entity];
  if (!cfg) return [];

  const YEARS = 12; // 2024..2035
  const startYear = currentYear;
  const wallYear = currentYear + cfg.wallYearOffset;
  const totalBillions = cfg.totalOutstanding * 1000; // convert T to B

  // Generate a maturity profile shape: bell curve peaking at wall year
  const rawWeights: number[] = [];
  for (let i = 0; i < YEARS; i++) {
    const year = startYear + i;
    const distFromWall = Math.abs(year - wallYear);
    // Bell curve shape with some tail
    const weight = Math.exp(-0.15 * distFromWall * distFromWall) + 0.08;
    rawWeights.push(weight);
  }

  // Normalize so total roughly matches outstanding
  const sumWeights = rawWeights.reduce((s, w) => s + w, 0);
  // Not all debt matures in the next 12 years -- roughly 60-75%
  const maturingPct = entity === 'US_HY' ? 0.75 : entity === 'US_TREASURY' ? 0.70 : 0.65;
  const maturingTotal = totalBillions * maturingPct;

  const buckets: MaturityBucket[] = [];

  for (let i = 0; i < YEARS; i++) {
    const year = startYear + i;
    const baseAmount = (rawWeights[i] / sumWeights) * maturingTotal;
    const amount = Math.round(jitter(baseAmount, baseAmount * 0.08, year, entity.length) * 10) / 10;

    // Number of issues scales roughly with amount
    const issuesPer = entity === 'US_TREASURY' ? 8 : entity === 'US_HY' ? 25 : 15;
    const count = Math.round(jitter(amount * issuesPer / 100, amount * issuesPer * 0.1 / 100, year, 2));

    // Coupon: older issuance (near-term maturities) have lower coupons
    const vintageAdj = i < 3 ? -0.8 : i < 6 ? -0.3 : 0.2;
    const avgCoupon = Math.round(jitter(cfg.baseCoupon + vintageAdj, 0.15, year, 3) * 100) / 100;

    // Yield: current market yield with slight term structure
    const termAdj = i * 0.03;
    const avgYield = Math.round(jitter(cfg.baseYield + termAdj, 0.08, year, 4) * 100) / 100;

    // Rating breakdown: varies slightly by year (near-term tends to have more BBB)
    const nearTermBias = i < 3 ? 0.06 : 0;
    const rb: RatingBreakdown = {
      aaa_aa: Math.round(Math.max(0, jitter(cfg.ratingMix.aaa_aa - nearTermBias * 0.5, 0.02, year, 5)) * amount * 10) / 10,
      a: Math.round(Math.max(0, jitter(cfg.ratingMix.a - nearTermBias * 0.3, 0.03, year, 6)) * amount * 10) / 10,
      bbb: Math.round(Math.max(0, jitter(cfg.ratingMix.bbb + nearTermBias, 0.03, year, 7)) * amount * 10) / 10,
      highYield: Math.round(Math.max(0, jitter(cfg.ratingMix.hy + nearTermBias * 0.2, 0.02, year, 8)) * amount * 10) / 10,
    };

    // Normalize so breakdown sums to amount
    const rbTotal = rb.aaa_aa + rb.a + rb.bbb + rb.highYield;
    if (rbTotal > 0) {
      const scale = amount / rbTotal;
      rb.aaa_aa = Math.round(rb.aaa_aa * scale * 10) / 10;
      rb.a = Math.round(rb.a * scale * 10) / 10;
      rb.bbb = Math.round(rb.bbb * scale * 10) / 10;
      rb.highYield = Math.round(rb.highYield * scale * 10) / 10;
    }

    // Refinancing risk: based on amount, year proximity, and HY composition
    const hyPct = amount > 0 ? rb.highYield / amount : 0;
    let refinancingRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    if (i <= 1 && amount > maturingTotal * 0.12) {
      refinancingRisk = hyPct > 0.3 ? 'CRITICAL' : 'HIGH';
    } else if (i <= 1) {
      refinancingRisk = hyPct > 0.4 ? 'HIGH' : 'MODERATE';
    } else if (amount > maturingTotal * 0.12) {
      refinancingRisk = 'MODERATE';
    } else {
      refinancingRisk = 'LOW';
    }

    buckets.push({
      year,
      amount,
      count: Math.max(count, 1),
      avgCoupon,
      avgYield,
      ratingBreakdown: rb,
      refinancingRisk,
    });
  }

  return buckets;
}

function generateResponse(entity: string): DebtMaturityResponse {
  const cfg = ENTITY_CONFIGS[entity];
  if (!cfg) {
    // Fallback to US_IG
    return generateResponse('US_IG');
  }

  const currentYear = new Date().getFullYear();
  const buckets = generateBuckets(entity, currentYear);

  // Find wall year (peak amount)
  let wallYear = currentYear;
  let wallAmount = 0;
  for (const b of buckets) {
    if (b.amount > wallAmount) {
      wallAmount = b.amount;
      wallYear = b.year;
    }
  }

  // Near-term maturities (next 2 years)
  const nearTermMaturities = buckets
    .filter((b) => b.year <= currentYear + 1)
    .reduce((s, b) => s + b.amount, 0);

  const profile: EntityProfile = {
    entity,
    label: cfg.label,
    totalOutstanding: cfg.totalOutstanding,
    avgMaturity: cfg.avgMaturity,
    avgCoupon: cfg.baseCoupon,
    avgYield: cfg.baseYield,
    nearTermMaturities: Math.round(nearTermMaturities * 10) / 10,
    wallYear,
    wallAmount: Math.round(wallAmount * 10) / 10,
  };

  return {
    buckets,
    profile,
    entities: [...ENTITIES],
    refinancingCost: cfg.refinancingSpread,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (req, res) => {
  try {
    const entity = typeof req.query.entity === 'string' ? req.query.entity : 'US_IG';
    const validEntity = ENTITIES.includes(entity as typeof ENTITIES[number]) ? entity : 'US_IG';

    const now = Date.now();
    const cached = cache.get(validEntity);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    const data = generateResponse(validEntity);
    cache.set(validEntity, { data, expiresAt: now + CACHE_TTL });
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DebtMaturity] Error:', message);

    // Try to return cached data on error
    const entity = typeof req.query.entity === 'string' ? req.query.entity : 'US_IG';
    const cached = cache.get(entity);
    if (cached) {
      return res.json(cached.data);
    }
    res.status(500).json({ error: 'Failed to generate debt maturity data' });
  }
});

export default router;
