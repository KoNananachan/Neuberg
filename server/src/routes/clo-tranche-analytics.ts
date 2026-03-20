import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();


let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

// ── Static Data ──

const CLO_MANAGERS = [
  'Carlyle', 'Apollo', 'Ares', 'PGIM', 'Blackstone',
  'KKR', 'Oak Hill', 'GSO/Blackstone', 'HPS Investment',
  'Canyon Partners', 'Golub Capital', 'Neuberger Berman',
  'TCW', 'Barings', 'Sound Point',
] as const;

const CLO_DEAL_NAMES = [
  'Carlyle US CLO 2025-3', 'Apollo Credit CLO XXII', 'Ares CLO XLVIII',
  'Dryden 108 CLO', 'Blackstone CLO 2025-1', 'KKR CLO 44',
  'Oak Hill Credit Partners XV', 'GSO Blackstone CLO 2025-2',
  'HPS Loan Management 2025-18', 'Canyon CLO 2024-3',
  'Golub Capital Partners CLO 72', 'Neuberger Berman CLO XXXVI',
  'TCW CLO 2025-1', 'Barings CLO 2025-4', 'Sound Point CLO XXXII',
] as const;

const TRANCHE_RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'Equity'] as const;

const TREND_OPTIONS = ['Improving', 'Stable', 'Deteriorating'] as const;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-clo-tranche-analytics'));

  // ──────────────────────────────────────────────────
  // 1. CLO Deal Universe (15 deals)
  // ──────────────────────────────────────────────────
  const dealUniverse = CLO_DEAL_NAMES.map((name, i) => {
    const manager = CLO_MANAGERS[i];
    const vintage = 2022 + Math.floor(rng() * 4); // 2022-2025
    const aum = round(rangef(380, 650, rng), 0);
    const wal = round(rangef(3.8, 7.2, rng), 1);
    const warf = round(rangef(2600, 3100, rng), 0);
    const diversityScore = round(rangef(55, 90, rng), 0);

    // Tranche breakdown per deal (AAA through Equity)
    const aaaPct = rangef(0.60, 0.66, rng);
    const aaPct = rangef(0.07, 0.10, rng);
    const aPct = rangef(0.05, 0.07, rng);
    const bbbPct = rangef(0.04, 0.06, rng);
    const bbPct = rangef(0.02, 0.04, rng);
    const bPct = rangef(0.01, 0.02, rng);
    const eqPct = 1 - aaaPct - aaPct - aPct - bbbPct - bbPct - bPct;

    const tranches = [
      {
        rating: 'AAA',
        size: round(aum * aaaPct, 1),
        spread: round(rangef(128, 162, rng), 0),
        price: round(rangef(99.50, 100.40, rng), 3),
        yield: round(rangef(5.55, 6.10, rng), 2),
        subordination: round(rangef(35, 41, rng), 1),
      },
      {
        rating: 'AA',
        size: round(aum * aaPct, 1),
        spread: round(rangef(185, 235, rng), 0),
        price: round(rangef(98.80, 100.20, rng), 3),
        yield: round(rangef(6.00, 6.70, rng), 2),
        subordination: round(rangef(27, 33, rng), 1),
      },
      {
        rating: 'A',
        size: round(aum * aPct, 1),
        spread: round(rangef(255, 320, rng), 0),
        price: round(rangef(97.00, 99.50, rng), 3),
        yield: round(rangef(6.50, 7.60, rng), 2),
        subordination: round(rangef(20, 27, rng), 1),
      },
      {
        rating: 'BBB',
        size: round(aum * bbbPct, 1),
        spread: round(rangef(395, 510, rng), 0),
        price: round(rangef(94.50, 98.50, rng), 3),
        yield: round(rangef(8.00, 9.80, rng), 2),
        subordination: round(rangef(13, 19, rng), 1),
      },
      {
        rating: 'BB',
        size: round(aum * bbPct, 1),
        spread: round(rangef(620, 820, rng), 0),
        price: round(rangef(90.00, 96.00, rng), 3),
        yield: round(rangef(10.00, 13.50, rng), 2),
        subordination: round(rangef(7, 13, rng), 1),
      },
      {
        rating: 'B',
        size: round(aum * bPct, 1),
        spread: round(rangef(950, 1250, rng), 0),
        price: round(rangef(85.00, 93.00, rng), 3),
        yield: round(rangef(12.50, 16.00, rng), 2),
        subordination: round(rangef(4, 8, rng), 1),
      },
      {
        rating: 'Equity',
        size: round(aum * eqPct, 1),
        spread: null,
        price: round(rangef(60.00, 85.00, rng), 3),
        yield: round(rangef(13.00, 19.00, rng), 2),
        subordination: 0,
      },
    ];

    return {
      dealName: name,
      manager,
      vintage,
      aum,
      aumUnit: 'M USD',
      wal,
      walUnit: 'years',
      warf,
      diversityScore,
      tranches,
      spreadUnit: 'bp over SOFR',
    };
  });

  // ──────────────────────────────────────────────────
  // 2. Collateral Quality Metrics
  // ──────────────────────────────────────────────────
  const collateralQualitySeeds = [
    { metric: 'WARF', valueBase: 2810, limit: 3200, higherIsBad: true },
    { metric: 'WARR', valueBase: 63.5, limit: 50.0, higherIsBad: false },
    { metric: 'WAS', valueBase: 3.48, limit: 2.80, higherIsBad: false },
    { metric: 'CCC Bucket', valueBase: 5.6, limit: 7.5, higherIsBad: true },
    { metric: 'Default Rate (12M)', valueBase: 1.85, limit: 4.0, higherIsBad: true },
    { metric: 'Diversity Score', valueBase: 72, limit: 55, higherIsBad: false },
    { metric: 'Single-B Bucket', valueBase: 28.2, limit: 35.0, higherIsBad: true },
    { metric: 'Junior OC Cushion', valueBase: 4.3, limit: 0.0, higherIsBad: false },
  ];

  const collateralQuality = collateralQualitySeeds.map((seed) => {
    const currentValue = round(jitter(seed.valueBase, 0.04, rng), 2);
    const cushion = seed.higherIsBad
      ? round(seed.limit - currentValue, 2)
      : round(currentValue - seed.limit, 2);
    const trend = pick(TREND_OPTIONS, rng);
    const percentile = round(rangef(25, 92, rng), 0);

    return {
      metric: seed.metric,
      currentValue,
      limit: seed.limit,
      cushion,
      status: cushion > 0 ? 'Within Limit' : 'Breached',
      trend,
      percentile,
    };
  });

  // ──────────────────────────────────────────────────
  // 3. Reinvestment Period Status
  // ──────────────────────────────────────────────────
  const reinvestmentStatus = dealUniverse.map((deal) => {
    const endYear = deal.vintage + Math.floor(rangef(3, 5, rng));
    const endMonth = Math.floor(rangef(1, 13, rng));
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-15`;
    const now = new Date();
    const end = new Date(endDate);
    const isActive = end > now;
    const monthsRemaining = isActive
      ? round((end.getTime() - now.getTime()) / (30.44 * 24 * 60 * 60 * 1000), 0)
      : 0;
    const principalPaydownPct = isActive
      ? round(rangef(0, 15, rng), 1)
      : round(rangef(25, 65, rng), 1);

    return {
      dealName: deal.dealName,
      manager: deal.manager,
      reinvestmentEndDate: endDate,
      status: isActive ? 'Active' : 'Post-Reinvestment',
      monthsRemaining: isActive ? monthsRemaining : 0,
      principalPaydownPct,
      principalPaydownUnit: '%',
    };
  });

  // ──────────────────────────────────────────────────
  // 4. OC/IC Test Results
  // ──────────────────────────────────────────────────
  const ocIcTests = dealUniverse.map((deal) => {
    const seniorOcCurrent = round(rangef(130, 138, rng), 2);
    const seniorOcTrigger = round(rangef(124, 128, rng), 2);
    const mezzOcCurrent = round(rangef(120, 128, rng), 2);
    const mezzOcTrigger = round(rangef(114, 118, rng), 2);
    const juniorOcCurrent = round(rangef(106, 114, rng), 2);
    const juniorOcTrigger = round(rangef(102, 106, rng), 2);

    const seniorIcCurrent = round(rangef(4.50, 5.80, rng), 2);
    const seniorIcTrigger = round(rangef(2.00, 2.50, rng), 2);
    const mezzIcCurrent = round(rangef(3.50, 4.80, rng), 2);
    const mezzIcTrigger = round(rangef(1.60, 2.00, rng), 2);
    const juniorIcCurrent = round(rangef(1.80, 2.80, rng), 2);
    const juniorIcTrigger = round(rangef(1.00, 1.30, rng), 2);

    const testResult = (current: number, trigger: number) => {
      const cushion = round(current - trigger, 2);
      const cushionPct = round((cushion / trigger) * 100, 2);
      let status: 'Pass' | 'Warning' | 'Fail';
      if (current < trigger) status = 'Fail';
      else if (cushionPct < 5) status = 'Warning';
      else status = 'Pass';
      return { current, trigger, cushion, cushionPct, status };
    };

    return {
      dealName: deal.dealName,
      manager: deal.manager,
      seniorOC: testResult(seniorOcCurrent, seniorOcTrigger),
      mezzanineOC: testResult(mezzOcCurrent, mezzOcTrigger),
      juniorOC: testResult(juniorOcCurrent, juniorOcTrigger),
      seniorIC: testResult(seniorIcCurrent, seniorIcTrigger),
      mezzanineIC: testResult(mezzIcCurrent, mezzIcTrigger),
      juniorIC: testResult(juniorIcCurrent, juniorIcTrigger),
      trend: pick(TREND_OPTIONS, rng),
    };
  });

  // ──────────────────────────────────────────────────
  // 5. New Issue Pipeline
  // ──────────────────────────────────────────────────
  const pipelineStatuses = ['Priced', 'Price Talk', 'In Marketing', 'Expected', 'Launched'] as const;
  const baseMonth = new Date().getMonth();
  const baseYear = new Date().getFullYear();

  const newIssuePipeline = Array.from({ length: 8 }, (_, i) => {
    const manager = CLO_MANAGERS[Math.floor(rng() * CLO_MANAGERS.length)];
    const dealNum = Math.floor(rangef(1, 10, rng));
    const size = round(rangef(400, 650, rng), 0);
    const status = pick(pipelineStatuses, rng);
    const closingMonth = ((baseMonth + i + 1) % 12) + 1;
    const closingYear = closingMonth <= baseMonth + 1 ? baseYear + 1 : baseYear;
    const closingDate = `${closingYear}-${String(closingMonth).padStart(2, '0')}-${String(10 + Math.floor(rng() * 18)).padStart(2, '0')}`;
    const reinvestPeriod = round(rangef(3, 5, rng), 1);

    return {
      deal: `${manager} CLO 2025-${dealNum}`,
      manager,
      size,
      sizeUnit: 'M USD',
      pricingStatus: status,
      expectedClosing: closingDate,
      reinvestPeriod,
      reinvestPeriodUnit: 'years',
      expectedSpreads: {
        AAA: round(rangef(130, 158, rng), 0),
        AA: round(rangef(190, 230, rng), 0),
        A: round(rangef(260, 310, rng), 0),
        BBB: round(rangef(400, 490, rng), 0),
        BB: round(rangef(630, 800, rng), 0),
      },
      spreadUnit: 'bp over SOFR',
    };
  });

  // ──────────────────────────────────────────────────
  // 6. Manager League Table (Top 15 by AUM)
  // ──────────────────────────────────────────────────
  const aumBases = [55, 50, 44, 40, 37, 34, 30, 27, 24, 22, 20, 18, 16, 14, 13];

  const managerLeagueTable = CLO_MANAGERS.map((manager, i) => {
    const aum = round(jitter(aumBases[i], 0.05, rng), 1);
    const dealsActive = round(rangef(25, 75, rng), 0);
    const vintageAvg = round(rangef(2021, 2025, rng), 0);
    const avgWAL = round(rangef(4.5, 6.5, rng), 1);
    const avgWARF = round(rangef(2650, 3050, rng), 0);
    const avgDiversityScore = round(rangef(60, 85, rng), 0);
    const defaultRate = round(rangef(0.15, 0.65, rng), 2);
    const equityIRR = round(rangef(11.5, 18.5, rng), 2);
    const avgOC = round(rangef(127, 135, rng), 2);
    const avgIC = round(rangef(4.2, 5.5, rng), 2);

    return {
      rank: i + 1,
      manager,
      aum,
      aumUnit: 'B USD',
      dealsActive,
      vintageAvg,
      avgWAL,
      avgWARF,
      avgDiversityScore,
      defaultRate,
      defaultRateUnit: '%',
      equityIRR,
      equityIRRUnit: '%',
      avgOC,
      avgIC,
    };
  }).sort((a, b) => b.aum - a.aum).map((m, i) => ({ ...m, rank: i + 1 }));

  // ──────────────────────────────────────────────────
  // 7. Market-Wide Tranche Spread Comparison
  // ──────────────────────────────────────────────────
  const trancheSpreadComparison = TRANCHE_RATINGS.filter(r => r !== 'Equity').map((rating) => {
    let spreadMin: number, spreadMax: number;
    switch (rating) {
      case 'AAA': spreadMin = 125; spreadMax = 165; break;
      case 'AA':  spreadMin = 180; spreadMax = 240; break;
      case 'A':   spreadMin = 250; spreadMax = 325; break;
      case 'BBB': spreadMin = 390; spreadMax = 520; break;
      case 'BB':  spreadMin = 610; spreadMax = 840; break;
      case 'B':   spreadMin = 920; spreadMax = 1280; break;
      default:    spreadMin = 200; spreadMax = 400;
    }

    const currentSpread = round(rangef(spreadMin, spreadMax, rng), 0);
    const change1d = round((rng() - 0.48) * 6, 0);
    const change1w = round((rng() - 0.48) * 15, 0);
    const change1m = round((rng() - 0.48) * 30, 0);
    const change3m = round((rng() - 0.48) * 50, 0);
    const ytdChange = round((rng() - 0.48) * 40, 0);
    const yearLow = round(currentSpread - rangef(10, 40, rng), 0);
    const yearHigh = round(currentSpread + rangef(10, 40, rng), 0);
    const newIssueDM = round(currentSpread + rangef(2, 12, rng), 0);
    const secondaryDM = round(currentSpread - rangef(2, 8, rng), 0);
    const bidAsk = rating === 'AAA' ? round(rangef(2, 5, rng), 1)
      : rating === 'AA' ? round(rangef(4, 8, rng), 1)
        : rating === 'A' ? round(rangef(6, 12, rng), 1)
          : rating === 'BBB' ? round(rangef(12, 22, rng), 1)
            : rating === 'BB' ? round(rangef(25, 45, rng), 1)
              : round(rangef(40, 70, rng), 1);

    return {
      rating,
      currentSpread,
      change1d,
      change1w,
      change1m,
      change3m,
      ytdChange,
      yearLow,
      yearHigh,
      newIssueDM,
      secondaryDM,
      bidAsk,
      spreadUnit: 'bp over SOFR',
    };
  });

  // Equity row separately
  const equityComparison = {
    rating: 'Equity',
    currentNAV: round(rangef(62, 82, rng), 2),
    currentIRR: round(rangef(13.0, 18.5, rng), 2),
    change1d: round((rng() - 0.48) * 0.5, 2),
    change1w: round((rng() - 0.48) * 1.2, 2),
    change1m: round((rng() - 0.48) * 2.5, 2),
    change3m: round((rng() - 0.48) * 4.0, 2),
    ytdChange: round((rng() - 0.48) * 5.0, 2),
    yearLowNAV: round(rangef(55, 65, rng), 2),
    yearHighNAV: round(rangef(80, 90, rng), 2),
    distributionYield: round(rangef(14, 20, rng), 2),
    distributionYieldUnit: '%',
  };

  // ──────────────────────────────────────────────────
  // 8. Market Summary
  // ──────────────────────────────────────────────────
  const marketSummary = {
    totalCLOOutstanding: round(rangef(1020, 1100, rng), 1),
    totalCLOOutstandingUnit: 'B USD',
    newIssuanceYTD: round(rangef(88, 125, rng), 1),
    newIssuanceYTDUnit: 'B USD',
    newIssuanceMTD: round(rangef(8, 18, rng), 1),
    newIssuanceMTDUnit: 'B USD',
    refiResetVolume: round(rangef(15, 28, rng), 1),
    refiResetVolumeUnit: 'B USD',
    activeManagerCount: round(rangef(140, 160, rng), 0),
    avgLoanPrice: round(rangef(96.0, 99.5, rng), 2),
    avgLoanCoupon: round(rangef(5.20, 6.80, rng), 2),
    leveragedLoanDefaultRate: round(rangef(1.2, 2.8, rng), 2),
    leveragedLoanDefaultRateUnit: '%',
  };

  return {
    marketSummary,
    dealUniverse,
    collateralQuality,
    reinvestmentStatus,
    ocIcTests,
    newIssuePipeline,
    managerLeagueTable,
    trancheSpreadComparison,
    equityComparison,
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
    console.error('[CLOTrancheAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate CLO tranche analytics data' });
  }
});

export default router;
