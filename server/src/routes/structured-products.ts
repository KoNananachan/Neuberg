import { Router } from 'express';

const router = Router();

// -- Seeded PRNG --

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash |= 0; }
  return Math.abs(hash);
}
function mulberry32(a: number): () => number {
  return function() { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
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

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-structured-products'));

  // ---- Market Overview ----
  const marketOverview = {
    totalOutstanding: round(jitter(12.4, 0.03, rng), 1),
    totalOutstandingUnit: 'T USD',
    ytdIssuance: round(jitter(485, 0.06, rng), 1),
    ytdIssuanceUnit: 'B USD',
    avgSpread: round(jitter(142, 0.05, rng), 0),
    avgSpreadUnit: 'bps',
    delinquencyRate: round(jitter(2.8, 0.08, rng), 2),
    delinquencyRateUnit: '%',
  };

  // ---- RMBS ----
  const agencySeeds = [
    { name: 'Fannie Mae 30Y', couponBase: 5.5, priceBase: 99.25, spreadBase: 68, cprBase: 8.2, delBase: 2.1, outBase: 4200 },
    { name: 'Fannie Mae 15Y', couponBase: 4.75, priceBase: 100.12, spreadBase: 52, cprBase: 12.5, delBase: 1.4, outBase: 820 },
    { name: 'Freddie Mac 30Y', couponBase: 5.5, priceBase: 99.18, spreadBase: 70, cprBase: 7.8, delBase: 2.0, outBase: 3100 },
    { name: 'Freddie Mac 15Y', couponBase: 4.75, priceBase: 100.06, spreadBase: 54, cprBase: 11.8, delBase: 1.3, outBase: 610 },
    { name: 'Ginnie Mae I 30Y', couponBase: 5.5, priceBase: 99.50, spreadBase: 82, cprBase: 9.5, delBase: 3.8, outBase: 2100 },
    { name: 'Ginnie Mae II 30Y', couponBase: 5.5, priceBase: 99.44, spreadBase: 85, cprBase: 10.1, delBase: 4.0, outBase: 780 },
  ];

  const agency = agencySeeds.map(s => ({
    name: s.name,
    coupon: round(jitter(s.couponBase, 0.02, rng), 3),
    price: round(jitter(s.priceBase, 0.005, rng), 4),
    spread: round(jitter(s.spreadBase, 0.06, rng), 0),
    prepaymentSpeed: round(jitter(s.cprBase, 0.08, rng), 1),
    prepaymentSpeedUnit: 'CPR',
    delinquency: round(jitter(s.delBase, 0.10, rng), 2),
    delinquencyUnit: '%',
    outstanding: round(jitter(s.outBase, 0.04, rng), 0),
    outstandingUnit: 'B USD',
  }));

  const nonAgencySeeds = [
    { name: 'Prime Jumbo', couponBase: 5.85, priceBase: 98.50, spreadBase: 125, cprBase: 6.2, delBase: 1.5, outBase: 180 },
    { name: 'Prime Seasoned', couponBase: 4.25, priceBase: 96.75, spreadBase: 145, cprBase: 4.8, delBase: 2.2, outBase: 95 },
    { name: 'Alt-A Fixed', couponBase: 5.40, priceBase: 92.25, spreadBase: 285, cprBase: 5.5, delBase: 8.5, outBase: 62 },
    { name: 'Alt-A Hybrid ARM', couponBase: 4.90, priceBase: 88.50, spreadBase: 350, cprBase: 7.2, delBase: 11.2, outBase: 38 },
    { name: 'Subprime Fixed', couponBase: 6.80, priceBase: 78.25, spreadBase: 520, cprBase: 4.1, delBase: 18.5, outBase: 28 },
    { name: 'Subprime ARM', couponBase: 5.50, priceBase: 72.00, spreadBase: 680, cprBase: 3.8, delBase: 24.2, outBase: 15 },
  ];

  const nonAgency = nonAgencySeeds.map(s => ({
    name: s.name,
    coupon: round(jitter(s.couponBase, 0.03, rng), 3),
    price: round(jitter(s.priceBase, 0.01, rng), 4),
    spread: round(jitter(s.spreadBase, 0.06, rng), 0),
    prepaymentSpeed: round(jitter(s.cprBase, 0.10, rng), 1),
    prepaymentSpeedUnit: 'CPR',
    delinquency: round(jitter(s.delBase, 0.08, rng), 2),
    delinquencyUnit: '%',
    outstanding: round(jitter(s.outBase, 0.05, rng), 0),
    outstandingUnit: 'B USD',
  }));

  const rmbs = { agency, nonAgency };

  // ---- CMBS ----
  const collateralTypes = ['Office', 'Retail', 'Multifamily', 'Industrial', 'Hotel'] as const;
  const cmbsDealSeeds = [
    { name: 'BANK 2024-BNK47', vintage: 2024, colIdx: 0, origBal: 1250, curFactor: 0.96, delBase: 4.8, walBase: 5.2, spreadBase: 145, rating: 'AAA' },
    { name: 'BBCMS 2024-C28', vintage: 2024, colIdx: 1, origBal: 980, curFactor: 0.97, delBase: 3.2, walBase: 4.8, spreadBase: 138, rating: 'AAA' },
    { name: 'BMARK 2023-B40', vintage: 2023, colIdx: 2, origBal: 1420, curFactor: 0.91, delBase: 1.5, walBase: 6.1, spreadBase: 112, rating: 'AAA' },
    { name: 'CGCMT 2023-GC55', vintage: 2023, colIdx: 0, origBal: 870, curFactor: 0.89, delBase: 6.2, walBase: 5.8, spreadBase: 168, rating: 'AA' },
    { name: 'WFCM 2024-C62', vintage: 2024, colIdx: 3, origBal: 1150, curFactor: 0.95, delBase: 0.8, walBase: 4.5, spreadBase: 108, rating: 'AAA' },
    { name: 'JPMCC 2023-CBM3', vintage: 2023, colIdx: 4, origBal: 680, curFactor: 0.88, delBase: 5.5, walBase: 6.8, spreadBase: 195, rating: 'AA' },
    { name: 'MSBAM 2024-C35', vintage: 2024, colIdx: 2, origBal: 1340, curFactor: 0.94, delBase: 1.2, walBase: 5.0, spreadBase: 118, rating: 'AAA' },
    { name: 'CSAIL 2022-C5', vintage: 2022, colIdx: 0, origBal: 760, curFactor: 0.82, delBase: 8.5, walBase: 7.2, spreadBase: 225, rating: 'A' },
    { name: 'COMM 2024-CBM7', vintage: 2024, colIdx: 1, origBal: 920, curFactor: 0.93, delBase: 3.8, walBase: 5.5, spreadBase: 152, rating: 'AAA' },
    { name: 'GS 2023-GC54', vintage: 2023, colIdx: 3, origBal: 1080, curFactor: 0.90, delBase: 0.6, walBase: 6.3, spreadBase: 105, rating: 'AAA' },
  ];

  const cmbs = cmbsDealSeeds.map(s => {
    const origBalance = round(jitter(s.origBal, 0.03, rng), 0);
    const currentBalance = round(origBalance * jitter(s.curFactor, 0.02, rng), 0);
    return {
      name: s.name,
      vintage: s.vintage,
      collateralType: collateralTypes[s.colIdx],
      originalBalance: origBalance,
      originalBalanceUnit: 'M USD',
      currentBalance,
      currentBalanceUnit: 'M USD',
      delinquencyRate: round(jitter(s.delBase, 0.10, rng), 2),
      delinquencyRateUnit: '%',
      wal: round(jitter(s.walBase, 0.05, rng), 1),
      walUnit: 'years',
      spread: round(jitter(s.spreadBase, 0.06, rng), 0),
      spreadUnit: 'bps',
      rating: s.rating,
    };
  });

  // ---- CLO ----
  const cloManagers = ['Carlyle', 'Apollo', 'Ares', 'PGIM', 'Blackstone', 'KKR', 'Oak Hill', 'GSO/Blackstone', 'Canyon', 'HPS', 'BlueMountain', 'Octagon'] as const;
  const cloSeeds = [
    { name: 'Carlyle US CLO 2024-1', mgrIdx: 0, vintage: 2024, aumBase: 520, defBase: 0.35, recBase: 62, reinvEnd: '2029-04' },
    { name: 'Apollo Credit CLO XIX', mgrIdx: 1, vintage: 2024, aumBase: 480, defBase: 0.28, recBase: 65, reinvEnd: '2029-01' },
    { name: 'Ares LXVIII CLO', mgrIdx: 2, vintage: 2023, aumBase: 610, defBase: 0.42, recBase: 58, reinvEnd: '2028-07' },
    { name: 'PGIM CLO 2024-2', mgrIdx: 3, vintage: 2024, aumBase: 445, defBase: 0.22, recBase: 68, reinvEnd: '2029-06' },
    { name: 'Blackstone CLO 2023-3', mgrIdx: 4, vintage: 2023, aumBase: 550, defBase: 0.48, recBase: 55, reinvEnd: '2028-10' },
    { name: 'KKR CLO 42', mgrIdx: 5, vintage: 2024, aumBase: 490, defBase: 0.31, recBase: 63, reinvEnd: '2029-03' },
    { name: 'Oak Hill CLO 2024-1', mgrIdx: 6, vintage: 2024, aumBase: 410, defBase: 0.39, recBase: 60, reinvEnd: '2029-05' },
    { name: 'GSO Logan Park CLO V', mgrIdx: 7, vintage: 2023, aumBase: 530, defBase: 0.25, recBase: 66, reinvEnd: '2028-09' },
    { name: 'Canyon CLO 2024-2', mgrIdx: 8, vintage: 2024, aumBase: 380, defBase: 0.52, recBase: 54, reinvEnd: '2029-02' },
    { name: 'HPS Loan Mgmt 2023-18', mgrIdx: 9, vintage: 2023, aumBase: 470, defBase: 0.36, recBase: 61, reinvEnd: '2028-11' },
    { name: 'BlueMountain CLO XXXII', mgrIdx: 10, vintage: 2024, aumBase: 425, defBase: 0.44, recBase: 57, reinvEnd: '2029-07' },
    { name: 'Octagon 58 CLO', mgrIdx: 11, vintage: 2024, aumBase: 395, defBase: 0.33, recBase: 64, reinvEnd: '2029-08' },
  ];

  const clo = cloSeeds.map(s => {
    const aaaSpread = round(jitter(145, 0.05, rng), 0);
    const aaSpread = round(jitter(205, 0.06, rng), 0);
    const aSpread = round(jitter(280, 0.07, rng), 0);
    const bbbSpread = round(jitter(450, 0.08, rng), 0);
    const bbSpread = round(jitter(800, 0.10, rng), 0);
    const equityYield = round(rangef(12.5, 18.5, rng), 2);

    return {
      name: s.name,
      manager: cloManagers[s.mgrIdx],
      vintage: s.vintage,
      aum: round(jitter(s.aumBase, 0.04, rng), 0),
      aumUnit: 'M USD',
      tranches: {
        AAA: { spread: aaaSpread, spreadUnit: 'bps', price: round(jitter(99.85, 0.003, rng), 3), rating: 'Aaa/AAA' },
        AA: { spread: aaSpread, spreadUnit: 'bps', price: round(jitter(99.50, 0.005, rng), 3), rating: 'Aa2/AA' },
        A: { spread: aSpread, spreadUnit: 'bps', price: round(jitter(98.75, 0.008, rng), 3), rating: 'A2/A' },
        BBB: { spread: bbbSpread, spreadUnit: 'bps', price: round(jitter(97.25, 0.012, rng), 3), rating: 'Baa2/BBB' },
        BB: { spread: bbSpread, spreadUnit: 'bps', price: round(jitter(94.50, 0.018, rng), 3), rating: 'Ba2/BB' },
        Equity: { spread: equityYield, spreadUnit: '% IRR', price: round(jitter(82.00, 0.03, rng), 3), rating: 'NR' },
      },
      defaultRate: round(jitter(s.defBase, 0.12, rng), 2),
      defaultRateUnit: '%',
      recoveryRate: round(jitter(s.recBase, 0.05, rng), 1),
      recoveryRateUnit: '%',
      reinvestmentEnd: s.reinvEnd,
    };
  });

  // ---- ABS ----
  const abs = {
    autoLoans: {
      outstanding: round(jitter(310, 0.04, rng), 0),
      outstandingUnit: 'B USD',
      spread: round(jitter(85, 0.06, rng), 0),
      spreadUnit: 'bps',
      delinquencyRate: round(jitter(3.8, 0.08, rng), 2),
      delinquencyRateUnit: '%',
      chargeOffRate: round(jitter(2.1, 0.10, rng), 2),
      chargeOffRateUnit: '%',
      avgCoupon: round(jitter(5.25, 0.03, rng), 2),
      avgCouponUnit: '%',
      wal: round(jitter(2.4, 0.06, rng), 1),
      walUnit: 'years',
    },
    creditCards: {
      outstanding: round(jitter(185, 0.04, rng), 0),
      outstandingUnit: 'B USD',
      spread: round(jitter(62, 0.06, rng), 0),
      spreadUnit: 'bps',
      delinquencyRate: round(jitter(2.5, 0.08, rng), 2),
      delinquencyRateUnit: '%',
      chargeOffRate: round(jitter(3.8, 0.10, rng), 2),
      chargeOffRateUnit: '%',
      avgCoupon: round(jitter(4.85, 0.03, rng), 2),
      avgCouponUnit: '%',
      wal: round(jitter(1.8, 0.06, rng), 1),
      walUnit: 'years',
    },
    studentLoans: {
      outstanding: round(jitter(145, 0.04, rng), 0),
      outstandingUnit: 'B USD',
      spread: round(jitter(95, 0.06, rng), 0),
      spreadUnit: 'bps',
      delinquencyRate: round(jitter(5.2, 0.08, rng), 2),
      delinquencyRateUnit: '%',
      chargeOffRate: round(jitter(1.8, 0.10, rng), 2),
      chargeOffRateUnit: '%',
      avgCoupon: round(jitter(4.50, 0.03, rng), 2),
      avgCouponUnit: '%',
      wal: round(jitter(5.5, 0.06, rng), 1),
      walUnit: 'years',
    },
    equipment: {
      outstanding: round(jitter(78, 0.04, rng), 0),
      outstandingUnit: 'B USD',
      spread: round(jitter(72, 0.06, rng), 0),
      spreadUnit: 'bps',
      delinquencyRate: round(jitter(1.4, 0.08, rng), 2),
      delinquencyRateUnit: '%',
      chargeOffRate: round(jitter(0.8, 0.10, rng), 2),
      chargeOffRateUnit: '%',
      avgCoupon: round(jitter(5.10, 0.03, rng), 2),
      avgCouponUnit: '%',
      wal: round(jitter(3.2, 0.06, rng), 1),
      walUnit: 'years',
    },
  };

  // ---- Recent Issuance ----
  const leadManagers = ['JPMorgan', 'Goldman Sachs', 'Morgan Stanley', 'Citi', 'Wells Fargo', 'BofA Securities', 'Barclays', 'Deutsche Bank'] as const;
  const issuanceTypes = ['RMBS', 'CMBS', 'CLO', 'ABS'] as const;

  const issuanceSeeds = [
    { name: 'FNMA 2024-M18', type: 0, sizeBase: 1850, spreadBase: 58 },
    { name: 'BANK 2024-BNK48', type: 1, sizeBase: 1120, spreadBase: 132 },
    { name: 'Carlyle US CLO 2024-3', type: 2, sizeBase: 510, spreadBase: 142 },
    { name: 'World Omni Auto 2024-B', type: 3, sizeBase: 875, spreadBase: 78 },
    { name: 'FHLMC 2024-HQA3', type: 0, sizeBase: 920, spreadBase: 62 },
    { name: 'BBCMS 2024-C29', type: 1, sizeBase: 1350, spreadBase: 128 },
    { name: 'Ares LXIX CLO', type: 2, sizeBase: 620, spreadBase: 148 },
    { name: 'Chase Issuance Trust 2024-A2', type: 3, sizeBase: 750, spreadBase: 55 },
    { name: 'GNMA 2024-H12', type: 0, sizeBase: 2100, spreadBase: 72 },
    { name: 'MSBAM 2024-C36', type: 1, sizeBase: 980, spreadBase: 138 },
    { name: 'KKR CLO 44', type: 2, sizeBase: 480, spreadBase: 140 },
    { name: 'SLM Student Loan Trust 2024-A', type: 3, sizeBase: 680, spreadBase: 92 },
  ];

  // Generate pricing dates for the last 30 days
  const now = new Date();
  const issuance = issuanceSeeds.map(s => {
    const daysAgo = Math.floor(rng() * 30);
    const pricingDate = new Date(now);
    pricingDate.setDate(pricingDate.getDate() - daysAgo);

    return {
      name: s.name,
      type: issuanceTypes[s.type],
      size: round(jitter(s.sizeBase, 0.08, rng), 0),
      sizeUnit: 'M USD',
      pricingDate: pricingDate.toISOString().slice(0, 10),
      leadManager: pick(leadManagers, rng),
      topTrancheSpread: round(jitter(s.spreadBase, 0.06, rng), 0),
      topTrancheSpreadUnit: 'bps',
    };
  });

  // ---- Prepayment Monitor (30Y FNMA coupon stack) ----
  const couponStack = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5];
  // CPR expectations: low coupons have very low prepay, higher coupons have higher prepay
  const cprBases: Record<number, number> = {
    2.0: 2.8, 2.5: 3.5, 3.0: 4.8, 3.5: 6.2, 4.0: 8.5,
    4.5: 12.0, 5.0: 18.5, 5.5: 25.0, 6.0: 32.0, 6.5: 38.0,
  };

  const prepaymentMonitor = couponStack.map(coupon => {
    const cprBase = cprBases[coupon];
    const cpr = round(jitter(cprBase, 0.08, rng), 1);
    const change1m = round((rng() - 0.48) * cprBase * 0.12, 1);
    const avg3m = round(jitter(cprBase, 0.04, rng), 1);

    return {
      coupon,
      couponLabel: `FNMA 30Y ${coupon.toFixed(1)}`,
      cpr,
      cprUnit: 'CPR',
      change1m,
      change1mUnit: 'CPR',
      avg3m,
      avg3mUnit: 'CPR',
    };
  });

  return {
    marketOverview,
    rmbs,
    cmbs,
    clo,
    abs,
    issuance,
    prepaymentMonitor,
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
  } catch (err: unknown) {
    console.error('[StructuredProducts] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate structured products data' });
  }
});

export default router;
