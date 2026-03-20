import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Cache ──

let cacheData: unknown = null;
let cacheTime = 0;


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

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Data Generation ──

function generate() {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed(today);
  const rng = mulberry32(seed);

  // ── maturityWall: 2024-2032 ──
  // Realistic US corporate debt maturity profile (billions)
  const igBase =    [980, 1120, 1050, 960, 880, 820, 780, 750, 720];
  const hyBase =    [210, 270,  250,  220, 195, 175, 160, 150, 140];
  const llBase =    [180, 220,  200,  185, 165, 150, 135, 125, 115];

  const maturityWall = [];
  for (let i = 0; i < 9; i++) {
    const year = 2024 + i;
    const investmentGrade = round1(igBase[i] * randRange(rng, 0.93, 1.07));
    const highYield = round1(hyBase[i] * randRange(rng, 0.90, 1.10));
    const leveragedLoans = round1(llBase[i] * randRange(rng, 0.88, 1.12));
    const total = round1(investmentGrade + highYield + leveragedLoans);

    let riskLevel: 'low' | 'moderate' | 'elevated' | 'high';
    if (total > 1400) riskLevel = 'high';
    else if (total > 1200) riskLevel = 'elevated';
    else if (total > 1000) riskLevel = 'moderate';
    else riskLevel = 'low';

    maturityWall.push({ year, investmentGrade, highYield, leveragedLoans, total, riskLevel });
  }

  // ── sectorBreakdown ──
  const sectorDefs = [
    { name: 'technology',   debtRange: [280, 380] as [number, number], couponRange: [3.2, 4.8] as [number, number], ratings: ['A', 'A-', 'BBB+'],           riskBias: 0.25 },
    { name: 'healthcare',   debtRange: [220, 320] as [number, number], couponRange: [3.8, 5.4] as [number, number], ratings: ['BBB+', 'BBB', 'BBB-'],       riskBias: 0.40 },
    { name: 'energy',       debtRange: [260, 360] as [number, number], couponRange: [4.5, 6.5] as [number, number], ratings: ['BBB-', 'BB+', 'BB'],         riskBias: 0.65 },
    { name: 'financials',   debtRange: [350, 480] as [number, number], couponRange: [3.5, 5.0] as [number, number], ratings: ['A-', 'BBB+', 'A'],           riskBias: 0.30 },
    { name: 'consumer',     debtRange: [180, 270] as [number, number], couponRange: [4.0, 5.8] as [number, number], ratings: ['BBB', 'BBB-', 'BB+'],        riskBias: 0.50 },
    { name: 'industrials',  debtRange: [160, 250] as [number, number], couponRange: [3.8, 5.2] as [number, number], ratings: ['BBB+', 'BBB', 'A-'],         riskBias: 0.35 },
    { name: 'telecom',      debtRange: [140, 220] as [number, number], couponRange: [4.8, 6.4] as [number, number], ratings: ['BBB-', 'BB+', 'BB'],         riskBias: 0.60 },
    { name: 'real estate',  debtRange: [120, 200] as [number, number], couponRange: [4.2, 5.8] as [number, number], ratings: ['BBB', 'BBB-', 'BB+'],        riskBias: 0.55 },
    { name: 'utilities',    debtRange: [100, 170] as [number, number], couponRange: [3.4, 4.6] as [number, number], ratings: ['A', 'A-', 'BBB+'],           riskBias: 0.20 },
  ];

  const sectorBreakdown = sectorDefs.map((s) => {
    const totalMaturingDebt = round1(randRange(rng, s.debtRange[0], s.debtRange[1]));
    const avgCoupon = round2(randRange(rng, s.couponRange[0], s.couponRange[1]));
    const avgRating = pick(rng, s.ratings);
    const riskVal = s.riskBias + randRange(rng, -0.15, 0.15);
    let refinancingRisk: 'low' | 'moderate' | 'high';
    if (riskVal < 0.33) refinancingRisk = 'low';
    else if (riskVal < 0.60) refinancingRisk = 'moderate';
    else refinancingRisk = 'high';

    return { sector: s.name, totalMaturingDebt, avgCoupon, avgRating, refinancingRisk };
  });

  // ── largestMaturities: 15 biggest upcoming maturities ──
  const issuerPool = [
    { issuer: 'AT&T Inc', sector: 'telecom' },
    { issuer: 'Verizon Communications', sector: 'telecom' },
    { issuer: 'Ford Motor Co', sector: 'consumer' },
    { issuer: 'General Motors', sector: 'consumer' },
    { issuer: 'Oracle Corp', sector: 'technology' },
    { issuer: 'Dell Technologies', sector: 'technology' },
    { issuer: 'CVS Health', sector: 'healthcare' },
    { issuer: 'HCA Healthcare', sector: 'healthcare' },
    { issuer: 'Charter Communications', sector: 'telecom' },
    { issuer: 'T-Mobile US', sector: 'telecom' },
    { issuer: 'Boeing Co', sector: 'industrials' },
    { issuer: 'Occidental Petroleum', sector: 'energy' },
    { issuer: 'Energy Transfer', sector: 'energy' },
    { issuer: 'Broadcom Inc', sector: 'technology' },
    { issuer: 'Comcast Corp', sector: 'telecom' },
    { issuer: 'NextEra Energy', sector: 'utilities' },
    { issuer: 'Simon Property Group', sector: 'real estate' },
    { issuer: 'Goldman Sachs', sector: 'financials' },
    { issuer: 'Bank of America', sector: 'financials' },
    { issuer: 'JPMorgan Chase', sector: 'financials' },
  ];

  const ratingPool = ['AAA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'B+'];
  const statusOptions: Array<'refinanced' | 'pending' | 'at-risk'> = ['refinanced', 'pending', 'at-risk'];

  const usedIssuers = new Set<number>();
  const largestMaturities = [];
  for (let i = 0; i < 15; i++) {
    let idx: number;
    do {
      idx = Math.floor(rng() * issuerPool.length);
    } while (usedIssuers.has(idx) && usedIssuers.size < issuerPool.length);
    usedIssuers.add(idx);

    const entry = issuerPool[idx];
    const amount = round1(randRange(rng, 2.5, 18.0));
    const matYear = 2024 + Math.floor(rng() * 4);
    const matMonth = 1 + Math.floor(rng() * 12);
    const matDay = 1 + Math.floor(rng() * 28);
    const maturityDate = `${matYear}-${String(matMonth).padStart(2, '0')}-${String(matDay).padStart(2, '0')}`;
    const coupon = round2(randRange(rng, 2.5, 7.5));
    const currentRating = pick(rng, ratingPool);
    const currentSpread = Math.round(randRange(rng, 60, 450));

    // Higher spread => more likely at-risk; lower => refinanced
    let refinancingStatus: 'refinanced' | 'pending' | 'at-risk';
    const statusRoll = rng();
    if (currentSpread > 300) {
      refinancingStatus = statusRoll < 0.6 ? 'at-risk' : 'pending';
    } else if (currentSpread > 150) {
      refinancingStatus = statusRoll < 0.4 ? 'refinanced' : 'pending';
    } else {
      refinancingStatus = statusRoll < 0.7 ? 'refinanced' : 'pending';
    }

    largestMaturities.push({
      issuer: entry.issuer,
      sector: entry.sector,
      amount,
      maturityDate,
      coupon,
      currentRating,
      currentSpread,
      refinancingStatus,
    });
  }

  // Sort by amount descending
  largestMaturities.sort((a, b) => b.amount - a.amount);

  // ── refinancingCost ──
  const igAvgCoupon = round2(randRange(rng, 3.40, 4.20));
  const igNewIssueYield = round2(randRange(rng, 5.10, 5.90));
  const hyAvgCoupon = round2(randRange(rng, 5.50, 6.60));
  const hyNewIssueYield = round2(randRange(rng, 7.80, 9.40));
  const igCostIncrease = Math.round((igNewIssueYield - igAvgCoupon) * 100);
  const hyCostIncrease = Math.round((hyNewIssueYield - hyAvgCoupon) * 100);
  const totalAdditionalInterest = round1(randRange(rng, 18, 42));

  const refinancingCost = {
    investmentGrade: {
      avgCoupon: igAvgCoupon,
      newIssueYield: igNewIssueYield,
      costIncrease: igCostIncrease,
    },
    highYield: {
      avgCoupon: hyAvgCoupon,
      newIssueYield: hyNewIssueYield,
      costIncrease: hyCostIncrease,
    },
    totalAdditionalInterest,
  };

  // ── ratingMigration ──
  const upgrades = Math.round(randRange(rng, 40, 85));
  const downgrades = Math.round(randRange(rng, 55, 120));
  const fallenAngels = Math.round(randRange(rng, 5, 18));
  const risingStars = Math.round(randRange(rng, 3, 12));

  const watchlistPool = [
    'Walgreens Boots Alliance', 'Paramount Global', 'Dish Network',
    'Lumen Technologies', 'Bausch Health', 'Rite Aid',
    'Spirit Airlines', 'WeWork', 'Carvana', 'AMC Entertainment',
    'Bed Bath & Beyond', 'Yellow Corp', 'Community Health Systems',
    'Talen Energy', 'Envision Healthcare',
  ];
  const watchlistCount = 4 + Math.floor(rng() * 4);
  const watchlist: string[] = [];
  const usedWatchlist = new Set<number>();
  for (let i = 0; i < watchlistCount; i++) {
    let wIdx: number;
    do {
      wIdx = Math.floor(rng() * watchlistPool.length);
    } while (usedWatchlist.has(wIdx) && usedWatchlist.size < watchlistPool.length);
    usedWatchlist.add(wIdx);
    watchlist.push(watchlistPool[wIdx]);
  }

  const ratingMigration = {
    upgrades,
    downgrades,
    fallenAngels,
    risingStars,
    watchlist,
  };

  // ── maturityByRating ──
  const ratingBuckets = [
    { rating: 'AAA', maturingRange: [80, 150] as [number, number],   pctRange: [1.5, 3.0] as [number, number] },
    { rating: 'AA',  maturingRange: [150, 280] as [number, number],  pctRange: [3.0, 5.5] as [number, number] },
    { rating: 'A',   maturingRange: [350, 550] as [number, number],  pctRange: [6.0, 9.5] as [number, number] },
    { rating: 'BBB', maturingRange: [520, 780] as [number, number],  pctRange: [8.5, 13.0] as [number, number] },
    { rating: 'BB',  maturingRange: [180, 310] as [number, number],  pctRange: [10.0, 16.0] as [number, number] },
    { rating: 'B',   maturingRange: [100, 200] as [number, number],  pctRange: [12.0, 20.0] as [number, number] },
    { rating: 'CCC', maturingRange: [30, 80] as [number, number],    pctRange: [15.0, 28.0] as [number, number] },
  ];

  const maturityByRating = ratingBuckets.map((b) => ({
    rating: b.rating,
    totalMaturing: round1(randRange(rng, b.maturingRange[0], b.maturingRange[1])),
    percentOfOutstanding: round2(randRange(rng, b.pctRange[0], b.pctRange[1])),
  }));

  return {
    maturityWall,
    sectorBreakdown,
    largestMaturities,
    refinancingCost,
    ratingMigration,
    maturityByRating,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && (now - cacheTime) < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[DebtMaturity] Error:', (err as Error)?.message);

    // Stale cache fallback
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate debt maturity data' });
  }
});

export default router;
