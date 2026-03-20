import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round(val: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(val * f) / f;
}

// ── Types ──

interface TrancheSpread {
  tranche: string;
  spread: number;
  change1M: number;
  yield: number;
  price: number;
  durationRisk: number;
  lossAbsorption: number;
}

interface Manager {
  name: string;
  aum: number;
  deals: number;
  avgPerformance: 'above avg' | 'average' | 'below avg';
  defaultRate: number;
  wcRating: string;
}

interface NewIssuance {
  deal: string;
  manager: string;
  size: number;
  aaaSpread: number;
  equityYield: number;
  closingDate: string;
  reinvestPeriod: number;
}

interface CLOResponse {
  marketOverview: {
    totalOutstanding: number;
    issuanceYTD: number;
    avgAAA_Spread: number;
    avgBBB_Spread: number;
    avgEquityNAV: number;
    defaultRate: number;
    reinvestmentRate: number;
  };
  trancheSpreads: TrancheSpread[];
  managers: Manager[];
  collateralMetrics: {
    avgLoanPrice: number;
    avgCoupon: number;
    leveragedLoanDefault: number;
    cccBucket: number;
    diversificationScore: number;
    warf: number;
    juniorOC: number;
    seniorOC: number;
  };
  newIssuance: NewIssuance[];
  riskIndicators: {
    cccExcessTrend: 'improving' | 'stable' | 'deteriorating';
    interestCoverageAvg: number;
    cashDiversionRate: number;
    refinancingWall: string;
    equityDistribution: 'full' | 'reduced' | 'suspended';
  };
}

// ── Cache (5 min TTL, stale fallback) ──

let cache: { data: CLOResponse | null; expiresAt: number } = { data: null, expiresAt: 0 };


// ── Data generation ──

function generate(): CLOResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('clo-' + today));

  // ── 1. Market Overview ──
  const totalOutstanding = round(clamp(1.0 + (rng() - 0.5) * 0.6, 1.0, 1.3), 2);
  const issuanceYTD = round(clamp(80 + rng() * 100, 80, 180), 1);
  const avgAAA_Spread = Math.round(clamp(110 + rng() * 50, 110, 160));
  const avgBBB_Spread = Math.round(clamp(280 + rng() * 120, 280, 400));
  const avgEquityNAV = round(clamp(40 + rng() * 25, 40, 65), 1);
  const defaultRate = round(clamp(1.0 + rng() * 3.0, 1.0, 4.0), 2);
  const reinvestmentRate = round(clamp(55 + rng() * 30, 55, 85), 1);

  const marketOverview = {
    totalOutstanding,
    issuanceYTD,
    avgAAA_Spread,
    avgBBB_Spread,
    avgEquityNAV,
    defaultRate,
    reinvestmentRate,
  };

  // ── 2. Tranche Spreads ──
  const trancheConfigs: { tranche: string; minSpread: number; maxSpread: number; baseLoss: number }[] = [
    { tranche: 'AAA', minSpread: 110, maxSpread: 160, baseLoss: 36 },
    { tranche: 'AA', minSpread: 150, maxSpread: 220, baseLoss: 28 },
    { tranche: 'A', minSpread: 200, maxSpread: 300, baseLoss: 21 },
    { tranche: 'BBB', minSpread: 280, maxSpread: 400, baseLoss: 14 },
    { tranche: 'BB', minSpread: 500, maxSpread: 750, baseLoss: 8 },
    { tranche: 'B', minSpread: 800, maxSpread: 1200, baseLoss: 4 },
    { tranche: 'Equity', minSpread: 0, maxSpread: 0, baseLoss: 0 },
  ];

  const trancheSpreads: TrancheSpread[] = trancheConfigs.map((tc) => {
    const isEquity = tc.tranche === 'Equity';
    const spread = isEquity ? 0 : Math.round(clamp(tc.minSpread + rng() * (tc.maxSpread - tc.minSpread), tc.minSpread, tc.maxSpread));
    const change1M = isEquity ? 0 : Math.round((rng() - 0.5) * 30);
    const yieldVal = isEquity
      ? round(clamp(12 + rng() * 8, 12, 20), 2)
      : round(clamp(5.0 + spread / 100, 5.0, 18.0), 2);
    const price = isEquity
      ? round(clamp(40 + rng() * 25, 40, 65), 2)
      : round(clamp(95 + rng() * 5, 95, 100.5), 2);
    const durationRisk = isEquity
      ? round(rng() * 2, 2)
      : round(clamp(1 + rng() * 6, 1, 7), 2);
    const lossAbsorption = round(clamp(tc.baseLoss + (rng() - 0.5) * 6, 0, 40), 1);

    return { tranche: tc.tranche, spread, change1M, yield: yieldVal, price, durationRisk, lossAbsorption };
  });

  // ── 3. Managers ──
  const managerNames = ['CSAM', 'Carlyle', 'Apollo', 'Ares', 'PGIM', 'Blackstone', 'KKR', 'Oak Hill'];
  const performanceTiers: ('above avg' | 'average' | 'below avg')[] = ['above avg', 'average', 'below avg'];
  const wcRatings = ['Aa1', 'Aa2', 'Aa3', 'A1', 'A2'];

  const managers: Manager[] = managerNames.map((name) => {
    const aum = round(clamp(15 + rng() * 85, 15, 100), 1);
    const deals = Math.round(clamp(50 + rng() * 150, 50, 200));
    const perfIdx = Math.floor(rng() * 3);
    const avgPerformance = performanceTiers[perfIdx];
    const dr = round(clamp(0.5 + rng() * 3.5, 0.5, 4.0), 2);
    const wcRating = wcRatings[Math.floor(rng() * wcRatings.length)];

    return { name, aum, deals, avgPerformance, defaultRate: dr, wcRating };
  });

  // ── 4. Collateral Metrics ──
  const collateralMetrics = {
    avgLoanPrice: round(clamp(95 + rng() * 5, 95, 100), 2),
    avgCoupon: round(clamp(5.0 + rng() * 3.0, 5.0, 8.0), 2),
    leveragedLoanDefault: round(clamp(1.0 + rng() * 3.0, 1.0, 4.0), 2),
    cccBucket: round(clamp(3 + rng() * 7, 3, 10), 1),
    diversificationScore: round(clamp(1 + rng() * 9, 1, 10), 1),
    warf: Math.round(clamp(2500 + rng() * 700, 2500, 3200)),
    juniorOC: round(clamp(103 + rng() * 12, 103, 115), 2),
    seniorOC: round(clamp(120 + rng() * 20, 120, 140), 2),
  };

  // ── 5. New Issuance ──
  const issuanceDeals: { deal: string; manager: string }[] = [
    { deal: 'Dryden 100 CLO', manager: 'PGIM' },
    { deal: 'Apidos CLO XLII', manager: 'CSAM' },
    { deal: 'Carlyle US CLO 2026-1', manager: 'Carlyle' },
    { deal: 'Ares LXVIII CLO', manager: 'Ares' },
  ];

  const baseMonth = new Date().getMonth();
  const baseYear = new Date().getFullYear();

  const newIssuance: NewIssuance[] = issuanceDeals.map((d, i) => {
    const size = Math.round(clamp(400 + rng() * 200, 400, 600));
    const aaaSpread = Math.round(clamp(110 + rng() * 50, 110, 160));
    const equityYield = round(clamp(12 + rng() * 8, 12, 20), 2);
    const closingMonth = ((baseMonth + i + 1) % 12) + 1;
    const closingYear = closingMonth <= baseMonth + 1 ? baseYear + 1 : baseYear;
    const closingDate = `${closingYear}-${String(closingMonth).padStart(2, '0')}-15`;
    const reinvestPeriod = Math.round(clamp(3 + rng() * 2, 3, 5));

    return {
      deal: d.deal,
      manager: d.manager,
      size,
      aaaSpread,
      equityYield,
      closingDate,
      reinvestPeriod,
    };
  });

  // ── 6. Risk Indicators ──
  const trendOptions: ('improving' | 'stable' | 'deteriorating')[] = ['improving', 'stable', 'deteriorating'];
  const distOptions: ('full' | 'reduced' | 'suspended')[] = ['full', 'reduced', 'suspended'];

  const cccExcessTrend = trendOptions[Math.floor(rng() * 3)];
  const interestCoverageAvg = round(clamp(2 + rng() * 2, 2, 4), 2);
  const cashDiversionRate = round(clamp(rng() * 15, 0, 15), 1);
  const wallYear = baseYear + 2 + Math.floor(rng() * 3);
  const refinancingWall = `${wallYear} ($${Math.round(200 + rng() * 300)}B maturing)`;
  const equityDistribution = distOptions[Math.floor(rng() * 3)];

  const riskIndicators = {
    cccExcessTrend,
    interestCoverageAvg,
    cashDiversionRate,
    refinancingWall,
    equityDistribution,
  };

  return {
    marketOverview,
    trancheSpreads,
    managers,
    collateralMetrics,
    newIssuance,
    riskIndicators,
  };
}

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
  } catch (err: any) {
    console.error('[CLO] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate CLO data' });
  }
});

export default router;
