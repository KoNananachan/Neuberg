import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Seeded PRNG --

// -- Cache --


let cacheData: unknown = null;
let cacheTime = 0;

// -- Helpers --

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

// -- Static Data --

const CLO_DEALS = [
  { name: 'Carlyle CLO 2024-1',       manager: 'Carlyle',    vintage: 2024, totalSize: 500 },
  { name: 'Apollo Credit CLO XVII',    manager: 'Apollo',     vintage: 2024, totalSize: 450 },
  { name: 'Ares CLO XLII',            manager: 'Ares',       vintage: 2023, totalSize: 520 },
  { name: 'Blackstone CLO 2024-2',    manager: 'Blackstone', vintage: 2024, totalSize: 475 },
  { name: 'KKR CLO 38',               manager: 'KKR',        vintage: 2023, totalSize: 430 },
  { name: 'PGIM CLO 2024-1',          manager: 'PGIM',       vintage: 2024, totalSize: 510 },
  { name: 'Golub Capital CLO 68',     manager: 'Golub',      vintage: 2023, totalSize: 390 },
  { name: 'Dryden 102 CLO',           manager: 'PGIM',       vintage: 2024, totalSize: 460 },
] as const;

const TRANCHE_RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'Equity'] as const;

const NEW_ISSUANCE_MANAGERS = ['Carlyle', 'Apollo', 'Ares', 'KKR', 'Blackstone'] as const;
const PRICING_STATUSES = ['Priced', 'Price Talk', 'In Marketing', 'Expected', 'Launched'] as const;

const SECONDARY_DEALS = [
  'Carlyle CLO 2023-4',
  'Apollo Credit CLO XV',
  'Ares CLO XL',
  'Blackstone CLO 2023-1',
  'KKR CLO 35',
  'Golub Capital CLO 65',
] as const;

const SECONDARY_TRANCHES = ['AAA', 'AA', 'A', 'BBB', 'BB'] as const;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('structured-credit-' + day);
  const rng = mulberry32(seed);

  // 1. CLO Market - 8 deals with full tranche detail
  const cloMarket = CLO_DEALS.map(deal => {
    const totalSize = round(jitter(deal.totalSize, 0.06, rng), 0);

    // Tranche sizes as % of total (AAA ~62%, AA ~8%, A ~6%, BBB ~5%, BB ~4%, Equity ~15%)
    const aaaPct = rangef(0.60, 0.65, rng);
    const aaPct = rangef(0.07, 0.09, rng);
    const aPct = rangef(0.05, 0.07, rng);
    const bbbPct = rangef(0.04, 0.06, rng);
    const bbPct = rangef(0.03, 0.05, rng);
    const equityPct = 1 - aaaPct - aaPct - aPct - bbbPct - bbPct;

    const aaaSize = round(totalSize * aaaPct, 1);
    const aaSize = round(totalSize * aaPct, 1);
    const aSize = round(totalSize * aPct, 1);
    const bbbSize = round(totalSize * bbbPct, 1);
    const bbSize = round(totalSize * bbPct, 1);
    const equitySize = round(totalSize * equityPct, 1);

    // Spreads (bp over SOFR)
    const aaaSpread = round(rangef(130, 160, rng), 0);
    const aaSpread = round(rangef(190, 240, rng), 0);
    const aSpread = round(rangef(260, 320, rng), 0);
    const bbbSpread = round(rangef(400, 500, rng), 0);
    const bbSpread = round(rangef(550, 750, rng), 0);
    const equitySpread = null; // Equity doesn't have a spread

    // WAL, WARF, diversity score
    const wal = round(rangef(4.5, 6.5, rng), 1);
    const warf = round(rangef(2650, 2900, rng), 0);
    const diversityScore = round(rangef(60, 85, rng), 0);

    // OC test (current vs trigger)
    const ocCurrent = round(rangef(125, 135, rng), 1);
    const ocTrigger = round(rangef(118, 124, rng), 1);

    // IC test (current vs trigger)
    const icCurrent = round(rangef(3.8, 5.5, rng), 2);
    const icTrigger = round(rangef(1.5, 2.5, rng), 2);

    return {
      name: deal.name,
      manager: deal.manager,
      vintage: deal.vintage,
      totalSize,
      totalSizeUnit: 'M USD',
      tranches: {
        aaa: { size: aaaSize, spread: aaaSpread },
        aa:  { size: aaSize,  spread: aaSpread },
        a:   { size: aSize,   spread: aSpread },
        bbb: { size: bbbSize, spread: bbbSpread },
        bb:  { size: bbSize,  spread: bbSpread },
        equity: { size: equitySize, spread: equitySpread },
      },
      spreadUnit: 'bp over SOFR',
      wal,
      walUnit: 'years',
      warf,
      diversityScore,
      ocTest: { current: ocCurrent, trigger: ocTrigger },
      icTest: { current: icCurrent, trigger: icTrigger },
    };
  });

  // 2. Tranche Analysis - detailed breakdown for a sample deal (first deal)
  const sampleDeal = cloMarket[0];
  const trancheAnalysis = {
    dealName: sampleDeal.name,
    tranches: [
      {
        rating: 'AAA',
        balance: sampleDeal.tranches.aaa.size,
        spread: sampleDeal.tranches.aaa.spread,
        price: round(rangef(99.5, 100.5, rng), 3),
        yield: round(rangef(5.6, 6.2, rng), 2),
        wal: round(rangef(4.2, 5.0, rng), 1),
        subordination: round(rangef(36, 40, rng), 1),
        lossToImpair: round(rangef(38, 44, rng), 1),
      },
      {
        rating: 'AA',
        balance: sampleDeal.tranches.aa.size,
        spread: sampleDeal.tranches.aa.spread,
        price: round(rangef(98.5, 100.2, rng), 3),
        yield: round(rangef(6.0, 6.8, rng), 2),
        wal: round(rangef(5.5, 6.5, rng), 1),
        subordination: round(rangef(28, 33, rng), 1),
        lossToImpair: round(rangef(30, 36, rng), 1),
      },
      {
        rating: 'A',
        balance: sampleDeal.tranches.a.size,
        spread: sampleDeal.tranches.a.spread,
        price: round(rangef(97.0, 99.5, rng), 3),
        yield: round(rangef(6.5, 7.5, rng), 2),
        wal: round(rangef(6.5, 7.8, rng), 1),
        subordination: round(rangef(21, 27, rng), 1),
        lossToImpair: round(rangef(23, 30, rng), 1),
      },
      {
        rating: 'BBB',
        balance: sampleDeal.tranches.bbb.size,
        spread: sampleDeal.tranches.bbb.spread,
        price: round(rangef(95.0, 98.5, rng), 3),
        yield: round(rangef(8.0, 9.5, rng), 2),
        wal: round(rangef(7.5, 9.0, rng), 1),
        subordination: round(rangef(14, 19, rng), 1),
        lossToImpair: round(rangef(16, 22, rng), 1),
      },
      {
        rating: 'BB',
        balance: sampleDeal.tranches.bb.size,
        spread: sampleDeal.tranches.bb.spread,
        price: round(rangef(90.0, 96.0, rng), 3),
        yield: round(rangef(10.0, 13.0, rng), 2),
        wal: round(rangef(8.5, 10.0, rng), 1),
        subordination: round(rangef(8, 13, rng), 1),
        lossToImpair: round(rangef(10, 15, rng), 1),
      },
      {
        rating: 'Equity',
        balance: sampleDeal.tranches.equity.size,
        spread: null,
        price: round(rangef(75.0, 88.0, rng), 3),
        yield: round(rangef(12.0, 18.0, rng), 2),
        wal: round(rangef(10.0, 12.0, rng), 1),
        subordination: 0,
        lossToImpair: 0,
      },
    ],
    balanceUnit: 'M USD',
    spreadUnit: 'bp over SOFR',
    subordinationUnit: '%',
    lossToImpairUnit: '%',
    yieldUnit: '%',
  };

  // 3. Market Overview
  const marketOverview = {
    totalCLOOutstanding: round(rangef(980, 1050, rng), 1),
    totalCLOOutstandingUnit: 'B USD',
    newIssuanceMTD: round(rangef(8, 16, rng), 1),
    newIssuanceMTDUnit: 'B USD',
    newIssuanceYTD: round(rangef(85, 115, rng), 1),
    newIssuanceYTDUnit: 'B USD',
    refiResetVolume: round(rangef(12, 25, rng), 1),
    refiResetVolumeUnit: 'B USD',
    aaaIndexSpread: round(rangef(130, 160, rng), 0),
    aaaIndexSpreadUnit: 'bp',
    bbIndexSpread: round(rangef(550, 750, rng), 0),
    bbIndexSpreadUnit: 'bp',
    aaaChange1w: round((rng() - 0.5) * 10, 0),
    aaaChange1wUnit: 'bp',
    aaaChange1m: round((rng() - 0.5) * 20, 0),
    aaaChange1mUnit: 'bp',
    bbChange1w: round((rng() - 0.5) * 30, 0),
    bbChange1wUnit: 'bp',
    bbChange1m: round((rng() - 0.5) * 60, 0),
    bbChange1mUnit: 'bp',
  };

  // 4. Default & Recovery
  const currentDefaultRate = round(rangef(1.0, 2.5, rng), 2);
  const trailing12mDefaultRate = round(rangef(1.5, 3.0, rng), 2);
  const avgRecoveryRate = round(rangef(55, 72, rng), 1);

  const expectedLossByTranche = TRANCHE_RATINGS.map(rating => {
    let lossBase: number;
    switch (rating) {
      case 'AAA': lossBase = rangef(0.001, 0.01, rng); break;
      case 'AA':  lossBase = rangef(0.02, 0.08, rng); break;
      case 'A':   lossBase = rangef(0.05, 0.20, rng); break;
      case 'BBB': lossBase = rangef(0.15, 0.50, rng); break;
      case 'BB':  lossBase = rangef(0.40, 1.20, rng); break;
      case 'Equity': lossBase = rangef(2.0, 5.0, rng); break;
      default: lossBase = 0;
    }
    return {
      tranche: rating,
      expectedLoss: round(lossBase, 3),
      expectedLossUnit: '%',
    };
  });

  const stressScenarios = {
    base: {
      scenario: 'Base Case',
      defaultRate: round(rangef(1.5, 2.5, rng), 2),
      recoveryRate: round(rangef(60, 70, rng), 1),
      cumulativeLoss: round(rangef(0.5, 1.2, rng), 2),
      aaaImpact: 'No impairment',
      bbImpact: round(rangef(0, 0.5, rng), 2) + '% loss',
      equityImpact: round(rangef(2, 5, rng), 1) + '% reduction in distributions',
    },
    moderate: {
      scenario: 'Moderate Stress',
      defaultRate: round(rangef(4.0, 6.0, rng), 2),
      recoveryRate: round(rangef(45, 55, rng), 1),
      cumulativeLoss: round(rangef(2.5, 4.5, rng), 2),
      aaaImpact: 'No impairment',
      bbImpact: round(rangef(2, 8, rng), 2) + '% loss',
      equityImpact: round(rangef(15, 30, rng), 1) + '% reduction in distributions',
    },
    severe: {
      scenario: 'Severe Stress (2008-like)',
      defaultRate: round(rangef(8.0, 12.0, rng), 2),
      recoveryRate: round(rangef(30, 42, rng), 1),
      cumulativeLoss: round(rangef(6.0, 10.0, rng), 2),
      aaaImpact: round(rangef(0, 0.5, rng), 2) + '% loss',
      bbImpact: round(rangef(15, 35, rng), 1) + '% loss',
      equityImpact: round(rangef(50, 80, rng), 1) + '% reduction in distributions',
    },
  };

  const defaultRecovery = {
    currentDefaultRate,
    currentDefaultRateUnit: '%',
    trailing12mDefaultRate,
    trailing12mDefaultRateUnit: '%',
    avgRecoveryRate,
    avgRecoveryRateUnit: '%',
    expectedLossByTranche,
    stressScenarios,
  };

  // 5. New Issuance - 5 recent/upcoming CLO deals
  const newIssuance = Array.from({ length: 5 }, (_, i) => {
    const manager = NEW_ISSUANCE_MANAGERS[i % NEW_ISSUANCE_MANAGERS.length];
    const dealNum = Math.floor(rangef(1, 12, rng));
    const size = round(rangef(350, 600, rng), 0);
    const status = pick(PRICING_STATUSES, rng);

    const aaaSpreadExp = round(rangef(130, 160, rng), 0);
    const aaSpreadExp = round(rangef(190, 240, rng), 0);
    const aSpreadExp = round(rangef(260, 320, rng), 0);
    const bbbSpreadExp = round(rangef(400, 500, rng), 0);
    const bbSpreadExp = round(rangef(550, 750, rng), 0);

    return {
      deal: `${manager} CLO 2024-${dealNum}`,
      manager,
      size,
      sizeUnit: 'M USD',
      pricingStatus: status,
      expectedSpreads: {
        aaa: aaaSpreadExp,
        aa: aaSpreadExp,
        a: aSpreadExp,
        bbb: bbbSpreadExp,
        bb: bbSpreadExp,
      },
      spreadUnit: 'bp over SOFR',
    };
  });

  // 6. Secondary Trading - 6 recent trades
  const secondaryTrading = SECONDARY_DEALS.map((deal, i) => {
    const tranche = SECONDARY_TRANCHES[i % SECONDARY_TRANCHES.length];

    let priceBase: number;
    let spreadBase: number;
    switch (tranche) {
      case 'AAA': priceBase = rangef(99.3, 100.5, rng); spreadBase = rangef(130, 160, rng); break;
      case 'AA':  priceBase = rangef(98.0, 100.0, rng); spreadBase = rangef(190, 240, rng); break;
      case 'A':   priceBase = rangef(96.5, 99.0, rng);  spreadBase = rangef(260, 320, rng); break;
      case 'BBB': priceBase = rangef(94.0, 98.0, rng);  spreadBase = rangef(400, 500, rng); break;
      case 'BB':  priceBase = rangef(89.0, 96.0, rng);  spreadBase = rangef(550, 750, rng); break;
      default:    priceBase = rangef(95.0, 100.0, rng);  spreadBase = rangef(200, 400, rng);
    }

    const price = round(priceBase, 3);
    const spread = round(spreadBase, 0);
    const volume = round(rangef(2, 25, rng), 1);

    return {
      deal,
      tranche,
      price,
      spread,
      spreadUnit: 'bp over SOFR',
      volume,
      volumeUnit: 'M USD',
    };
  });

  return {
    cloMarket,
    trancheAnalysis,
    marketOverview,
    defaultRecovery,
    newIssuance,
    secondaryTrading,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[StructuredCredit] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate structured credit data' });
  }
});

export default router;
