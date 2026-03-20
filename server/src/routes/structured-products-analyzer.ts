import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();


let cacheData: unknown = null;
let cacheTime = 0;

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

const RATINGS = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'B+', 'NR'] as const;
const TRANCHE_LABELS = ['Senior (A1)', 'Senior (A2)', 'Mezzanine (B)', 'Mezzanine (C)', 'Junior (D)', 'Subordinated (E)', 'Equity/Residual'] as const;
const LEAD_MANAGERS = ['JPMorgan', 'Goldman Sachs', 'Morgan Stanley', 'Citi', 'Wells Fargo', 'BofA Securities', 'Barclays', 'Deutsche Bank', 'Credit Suisse', 'UBS'] as const;

const PRODUCT_UNIVERSE_SEEDS = [
  // MBS
  { name: 'FNMA 2025-M22 A1',   type: 'MBS' as const,  subtype: 'Agency RMBS',     ratingIdx: 0,  spreadBase: 58,   walBase: 4.2,  oasBase: 42,   sizeBase: 2400 },
  { name: 'FNMA 2025-M18 A2',   type: 'MBS' as const,  subtype: 'Agency RMBS',     ratingIdx: 0,  spreadBase: 65,   walBase: 6.8,  oasBase: 48,   sizeBase: 1850 },
  { name: 'FHLMC 2024-HQA4 M1', type: 'MBS' as const,  subtype: 'Agency CRT',      ratingIdx: 4,  spreadBase: 185,  walBase: 5.5,  oasBase: 168,  sizeBase: 920 },
  { name: 'GNMA 2025-H08 A',    type: 'MBS' as const,  subtype: 'Agency RMBS',     ratingIdx: 0,  spreadBase: 72,   walBase: 5.0,  oasBase: 55,   sizeBase: 2100 },
  { name: 'CIM 2024-NR3 A1',    type: 'MBS' as const,  subtype: 'Non-Agency RMBS', ratingIdx: 0,  spreadBase: 125,  walBase: 3.8,  oasBase: 108,  sizeBase: 450 },
  { name: 'NRZT 2024-NQM5 A1',  type: 'MBS' as const,  subtype: 'Non-QM RMBS',    ratingIdx: 0,  spreadBase: 145,  walBase: 3.5,  oasBase: 128,  sizeBase: 380 },
  // CMBS
  { name: 'BANK 2025-BNK49 A4', type: 'CMBS' as const, subtype: 'Conduit',         ratingIdx: 0,  spreadBase: 112,  walBase: 9.8,  oasBase: 95,   sizeBase: 1350 },
  { name: 'BBCMS 2024-C30 A5',  type: 'CMBS' as const, subtype: 'Conduit',         ratingIdx: 0,  spreadBase: 118,  walBase: 9.5,  oasBase: 102,  sizeBase: 1120 },
  { name: 'BMARK 2024-V10 AS',  type: 'CMBS' as const, subtype: 'Conduit',         ratingIdx: 1,  spreadBase: 145,  walBase: 9.2,  oasBase: 128,  sizeBase: 420 },
  { name: 'JPMCC 2024-CBM4 A',  type: 'CMBS' as const, subtype: 'Single-Asset',    ratingIdx: 0,  spreadBase: 98,   walBase: 7.5,  oasBase: 82,   sizeBase: 680 },
  { name: 'WFCM 2025-C63 B',    type: 'CMBS' as const, subtype: 'Conduit',         ratingIdx: 3,  spreadBase: 195,  walBase: 9.8,  oasBase: 172,  sizeBase: 280 },
  // ABS
  { name: 'WOART 2025-A A3',    type: 'ABS' as const,  subtype: 'Auto Loan',       ratingIdx: 0,  spreadBase: 52,   walBase: 1.8,  oasBase: 38,   sizeBase: 750 },
  { name: 'CARMX 2025-1 A3',    type: 'ABS' as const,  subtype: 'Auto Loan',       ratingIdx: 0,  spreadBase: 55,   walBase: 2.1,  oasBase: 40,   sizeBase: 680 },
  { name: 'SDART 2024-6 D',     type: 'ABS' as const,  subtype: 'Subprime Auto',   ratingIdx: 8,  spreadBase: 285,  walBase: 2.8,  oasBase: 258,  sizeBase: 120 },
  { name: 'CHAIT 2025-A2 A',    type: 'ABS' as const,  subtype: 'Credit Card',     ratingIdx: 0,  spreadBase: 42,   walBase: 1.5,  oasBase: 30,   sizeBase: 1200 },
  { name: 'BAAT 2024-1 A3',     type: 'ABS' as const,  subtype: 'Credit Card',     ratingIdx: 0,  spreadBase: 48,   walBase: 1.8,  oasBase: 35,   sizeBase: 850 },
  { name: 'SLM 2024-A A',       type: 'ABS' as const,  subtype: 'Student Loan',    ratingIdx: 0,  spreadBase: 78,   walBase: 5.2,  oasBase: 62,   sizeBase: 520 },
  { name: 'NAVSL 2025-1 A',     type: 'ABS' as const,  subtype: 'Student Loan',    ratingIdx: 0,  spreadBase: 85,   walBase: 6.0,  oasBase: 68,   sizeBase: 440 },
  { name: 'CNHEP 2025-A A3',    type: 'ABS' as const,  subtype: 'Equipment',       ratingIdx: 0,  spreadBase: 58,   walBase: 2.5,  oasBase: 44,   sizeBase: 380 },
  // CLO
  { name: 'Carlyle US CLO 2025-1 A1', type: 'CLO' as const, subtype: 'BSL CLO',   ratingIdx: 0,  spreadBase: 138,  walBase: 5.0,  oasBase: 120,  sizeBase: 320 },
  { name: 'Apollo Credit CLO XX A',    type: 'CLO' as const, subtype: 'BSL CLO',   ratingIdx: 0,  spreadBase: 142,  walBase: 4.8,  oasBase: 125,  sizeBase: 295 },
  { name: 'Ares LXXI CLO B',           type: 'CLO' as const, subtype: 'BSL CLO',   ratingIdx: 2,  spreadBase: 210,  walBase: 6.5,  oasBase: 188,  sizeBase: 52 },
  { name: 'KKR CLO 45 C',              type: 'CLO' as const, subtype: 'BSL CLO',   ratingIdx: 5,  spreadBase: 290,  walBase: 7.8,  oasBase: 262,  sizeBase: 38 },
  { name: 'PGIM CLO 2025-2 D',         type: 'CLO' as const, subtype: 'BSL CLO',   ratingIdx: 8,  spreadBase: 460,  walBase: 8.5,  oasBase: 425,  sizeBase: 28 },
  { name: 'Oak Hill MM CLO I A',        type: 'CLO' as const, subtype: 'MM CLO',    ratingIdx: 0,  spreadBase: 168,  walBase: 4.5,  oasBase: 148,  sizeBase: 180 },
  // CDO
  { name: 'Magnetite XXXII A1',  type: 'CDO' as const, subtype: 'Synthetic CDO',  ratingIdx: 0,  spreadBase: 155,  walBase: 5.0,  oasBase: 135,  sizeBase: 250 },
  { name: 'TABERNA 2024-I A',    type: 'CDO' as const, subtype: 'CRE CDO',        ratingIdx: 0,  spreadBase: 172,  walBase: 6.2,  oasBase: 152,  sizeBase: 180 },
  { name: 'ACAS CLO 2024-3 B',  type: 'CDO' as const, subtype: 'Bespoke CDO',    ratingIdx: 3,  spreadBase: 225,  walBase: 7.0,  oasBase: 198,  sizeBase: 95 },
];

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-structured-products-analyzer'));

  // ──── 1. Product Universe ────

  const productUniverse = PRODUCT_UNIVERSE_SEEDS.map(s => ({
    name: s.name,
    type: s.type,
    subtype: s.subtype,
    rating: RATINGS[s.ratingIdx],
    spread: round(jitter(s.spreadBase, 0.06, rng), 0),
    spreadUnit: 'bps',
    wal: round(jitter(s.walBase, 0.05, rng), 1),
    walUnit: 'years',
    oas: round(jitter(s.oasBase, 0.07, rng), 0),
    oasUnit: 'bps',
    size: round(jitter(s.sizeBase, 0.04, rng), 0),
    sizeUnit: 'M USD',
    price: round(jitter(s.ratingIdx <= 1 ? 100.05 : s.ratingIdx <= 5 ? 98.50 : 95.25, 0.01, rng), 3),
    yield: round(rangef(4.5 + s.ratingIdx * 0.35, 5.0 + s.ratingIdx * 0.40, rng), 3),
    yieldUnit: '%',
    dayChange: round((rng() - 0.48) * s.spreadBase * 0.015, 0),
    dayChangeUnit: 'bps',
  }));

  // ──── 2. Prepayment Metrics ────

  const prepaymentCoupons = [
    { label: 'FNMA 30Y 3.0', coupon: 3.0, cprBase: 4.5,  psaBase: 75 },
    { label: 'FNMA 30Y 3.5', coupon: 3.5, cprBase: 5.8,  psaBase: 97 },
    { label: 'FNMA 30Y 4.0', coupon: 4.0, cprBase: 7.5,  psaBase: 125 },
    { label: 'FNMA 30Y 4.5', coupon: 4.5, cprBase: 10.2, psaBase: 170 },
    { label: 'FNMA 30Y 5.0', coupon: 5.0, cprBase: 15.8, psaBase: 263 },
    { label: 'FNMA 30Y 5.5', coupon: 5.5, cprBase: 22.5, psaBase: 375 },
    { label: 'FNMA 30Y 6.0', coupon: 6.0, cprBase: 30.0, psaBase: 500 },
    { label: 'FNMA 30Y 6.5', coupon: 6.5, cprBase: 36.0, psaBase: 600 },
    { label: 'FHLMC 30Y 5.0', coupon: 5.0, cprBase: 14.5, psaBase: 242 },
    { label: 'FHLMC 30Y 5.5', coupon: 5.5, cprBase: 21.0, psaBase: 350 },
    { label: 'FHLMC 30Y 6.0', coupon: 6.0, cprBase: 28.5, psaBase: 475 },
    { label: 'GNMA 30Y 5.5',  coupon: 5.5, cprBase: 24.0, psaBase: 400 },
    { label: 'GNMA 30Y 6.0',  coupon: 6.0, cprBase: 32.5, psaBase: 542 },
  ];

  const prepaymentMetrics = prepaymentCoupons.map(s => {
    const cpr1m = round(jitter(s.cprBase, 0.10, rng), 1);
    const cpr3m = round(jitter(s.cprBase, 0.07, rng), 1);
    const cpr6m = round(jitter(s.cprBase, 0.05, rng), 1);
    const cprLife = round(jitter(s.cprBase * 0.85, 0.04, rng), 1);
    const psa = round(jitter(s.psaBase, 0.08, rng), 0);
    // SMM = 1 - (1 - CPR/100)^(1/12), approximated
    const smm = round((1 - Math.pow(1 - cpr1m / 100, 1 / 12)) * 100, 3);
    const change1m = round((rng() - 0.48) * s.cprBase * 0.10, 1);

    return {
      label: s.label,
      coupon: s.coupon,
      cpr1m,
      cpr3m,
      cpr6m,
      cprLife,
      cprUnit: 'CPR %',
      psaSpeed: psa,
      psaUnit: '% PSA',
      smm,
      smmUnit: '%',
      change1m,
      change1mUnit: 'CPR',
    };
  });

  // ──── 3. Tranche Waterfall Analysis ────

  const waterfallDeals = [
    { deal: 'BANK 2025-BNK49',  type: 'CMBS' as const,  totalBase: 1350, ceBase: 30.2 },
    { deal: 'Carlyle US CLO 2025-1', type: 'CLO' as const, totalBase: 520, ceBase: 38.5 },
    { deal: 'WOART 2025-A',     type: 'ABS' as const,   totalBase: 750,  ceBase: 18.5 },
    { deal: 'FNMA 2025-M22',    type: 'MBS' as const,   totalBase: 2400, ceBase: 6.0 },
    { deal: 'Magnetite XXXII',  type: 'CDO' as const,   totalBase: 250,  ceBase: 35.0 },
  ];

  // Tranche pct allocation templates by type
  const trancheTemplates: Record<string, { label: string; pctBase: number; ratingIdx: number; spreadBase: number }[]> = {
    CMBS: [
      { label: 'A1',    pctBase: 0.28, ratingIdx: 0,  spreadBase: 95 },
      { label: 'A2',    pctBase: 0.22, ratingIdx: 0,  spreadBase: 115 },
      { label: 'A-S',   pctBase: 0.12, ratingIdx: 0,  spreadBase: 130 },
      { label: 'B',     pctBase: 0.08, ratingIdx: 3,  spreadBase: 195 },
      { label: 'C',     pctBase: 0.06, ratingIdx: 5,  spreadBase: 275 },
      { label: 'D',     pctBase: 0.05, ratingIdx: 8,  spreadBase: 420 },
      { label: 'E',     pctBase: 0.04, ratingIdx: 10, spreadBase: 650 },
      { label: 'F/G/H', pctBase: 0.15, ratingIdx: 13, spreadBase: 0 },
    ],
    CLO: [
      { label: 'AAA (A1)',  pctBase: 0.62, ratingIdx: 0,  spreadBase: 140 },
      { label: 'AA (A2)',   pctBase: 0.08, ratingIdx: 2,  spreadBase: 205 },
      { label: 'A (B)',     pctBase: 0.06, ratingIdx: 5,  spreadBase: 285 },
      { label: 'BBB (C)',   pctBase: 0.05, ratingIdx: 8,  spreadBase: 450 },
      { label: 'BB (D)',    pctBase: 0.04, ratingIdx: 10, spreadBase: 780 },
      { label: 'Equity',    pctBase: 0.15, ratingIdx: 13, spreadBase: 0 },
    ],
    ABS: [
      { label: 'A1',   pctBase: 0.35, ratingIdx: 0,  spreadBase: 35 },
      { label: 'A2',   pctBase: 0.25, ratingIdx: 0,  spreadBase: 45 },
      { label: 'A3',   pctBase: 0.18, ratingIdx: 0,  spreadBase: 55 },
      { label: 'B',    pctBase: 0.10, ratingIdx: 5,  spreadBase: 110 },
      { label: 'C',    pctBase: 0.07, ratingIdx: 8,  spreadBase: 225 },
      { label: 'D',    pctBase: 0.05, ratingIdx: 13, spreadBase: 0 },
    ],
    MBS: [
      { label: 'A (Senior)',  pctBase: 0.75, ratingIdx: 0,  spreadBase: 58 },
      { label: 'M1',          pctBase: 0.08, ratingIdx: 2,  spreadBase: 120 },
      { label: 'M2',          pctBase: 0.06, ratingIdx: 5,  spreadBase: 185 },
      { label: 'B1',          pctBase: 0.05, ratingIdx: 8,  spreadBase: 310 },
      { label: 'B2',          pctBase: 0.04, ratingIdx: 10, spreadBase: 520 },
      { label: 'B3/R',        pctBase: 0.02, ratingIdx: 13, spreadBase: 0 },
    ],
    CDO: [
      { label: 'Super Senior', pctBase: 0.55, ratingIdx: 0,  spreadBase: 95 },
      { label: 'Senior (A)',   pctBase: 0.12, ratingIdx: 0,  spreadBase: 155 },
      { label: 'Mezzanine (B)', pctBase: 0.08, ratingIdx: 3, spreadBase: 225 },
      { label: 'Junior (C)',   pctBase: 0.06, ratingIdx: 8,  spreadBase: 420 },
      { label: 'Subordinated', pctBase: 0.05, ratingIdx: 10, spreadBase: 720 },
      { label: 'Equity',       pctBase: 0.14, ratingIdx: 13, spreadBase: 0 },
    ],
  };

  const trancheWaterfall = waterfallDeals.map(deal => {
    const totalSize = round(jitter(deal.totalBase, 0.04, rng), 0);
    const template = trancheTemplates[deal.type];
    let remainingCE = round(jitter(deal.ceBase, 0.05, rng), 1);

    const tranches = template.map((t, idx) => {
      const pct = round(jitter(t.pctBase, 0.06, rng), 3);
      const trancheSize = round(totalSize * pct, 1);
      const rating = RATINGS[t.ratingIdx];
      const spread = t.spreadBase > 0 ? round(jitter(t.spreadBase, 0.06, rng), 0) : null;
      const ce = remainingCE;
      // Each tranche reduces CE by its percentage of the deal
      remainingCE = round(Math.max(0, remainingCE - pct * 100), 1);

      return {
        label: t.label,
        rating,
        size: trancheSize,
        sizeUnit: 'M USD',
        pctOfDeal: round(pct * 100, 1),
        spread,
        spreadUnit: spread !== null ? 'bps' : null,
        creditEnhancement: ce,
        creditEnhancementUnit: '%',
        priority: idx + 1,
      };
    });

    return {
      deal: deal.deal,
      type: deal.type,
      totalSize,
      totalSizeUnit: 'M USD',
      tranches,
    };
  });

  // ──── 4. Credit Enhancement Levels ────

  const ceSeeds = [
    { sector: 'Agency RMBS',      aaaBase: 5.5,  aaBase: 3.8,   aBase: 2.5,   bbbBase: 1.5 },
    { sector: 'Non-Agency RMBS',  aaaBase: 22.0, aaBase: 16.5,  aBase: 12.0,  bbbBase: 8.0 },
    { sector: 'Conduit CMBS',     aaaBase: 30.0, aaBase: 22.5,  aBase: 16.0,  bbbBase: 10.5 },
    { sector: 'Single-Asset CMBS', aaaBase: 35.0, aaBase: 26.0,  aBase: 19.0,  bbbBase: 13.0 },
    { sector: 'CLO (BSL)',        aaaBase: 38.0, aaBase: 28.5,  aBase: 22.0,  bbbBase: 16.5 },
    { sector: 'CLO (MM)',         aaaBase: 42.0, aaBase: 32.0,  aBase: 25.5,  bbbBase: 19.0 },
    { sector: 'Auto Loan ABS',   aaaBase: 18.0, aaBase: 13.5,  aBase: 10.0,  bbbBase: 7.0 },
    { sector: 'Credit Card ABS', aaaBase: 15.5, aaBase: 11.0,  aBase: 8.0,   bbbBase: 5.5 },
    { sector: 'Student Loan ABS', aaaBase: 20.0, aaBase: 15.0,  aBase: 11.0,  bbbBase: 7.5 },
    { sector: 'Equipment ABS',   aaaBase: 16.0, aaBase: 12.0,  aBase: 8.5,   bbbBase: 6.0 },
    { sector: 'Synthetic CDO',   aaaBase: 35.0, aaBase: 26.0,  aBase: 20.0,  bbbBase: 14.0 },
    { sector: 'CRE CDO',         aaaBase: 38.0, aaBase: 29.0,  aBase: 22.5,  bbbBase: 16.0 },
  ];

  const creditEnhancement = ceSeeds.map(s => ({
    sector: s.sector,
    aaa: round(jitter(s.aaaBase, 0.04, rng), 1),
    aa: round(jitter(s.aaBase, 0.05, rng), 1),
    a: round(jitter(s.aBase, 0.05, rng), 1),
    bbb: round(jitter(s.bbbBase, 0.06, rng), 1),
    unit: '%',
    trend: pick(['Stable', 'Widening', 'Tightening'] as const, rng),
  }));

  // ──── 5. Collateral Performance ────

  const collateralSeeds = [
    { sector: 'Agency RMBS 30Y',     delBase: 2.2,  del60Base: 0.9,  del90Base: 0.5,  defBase: 0.08, recBase: 68, sevBase: 32 },
    { sector: 'Agency RMBS 15Y',     delBase: 1.1,  del60Base: 0.4,  del90Base: 0.2,  defBase: 0.04, recBase: 72, sevBase: 28 },
    { sector: 'Non-Agency Prime',    delBase: 1.5,  del60Base: 0.6,  del90Base: 0.3,  defBase: 0.12, recBase: 65, sevBase: 35 },
    { sector: 'Non-Agency Non-QM',   delBase: 4.2,  del60Base: 1.8,  del90Base: 1.0,  defBase: 0.35, recBase: 58, sevBase: 42 },
    { sector: 'CMBS Conduit',        delBase: 4.8,  del60Base: 2.2,  del90Base: 1.5,  defBase: 0.42, recBase: 52, sevBase: 48 },
    { sector: 'CMBS Single-Asset',   delBase: 2.5,  del60Base: 1.0,  del90Base: 0.6,  defBase: 0.18, recBase: 62, sevBase: 38 },
    { sector: 'CMBS Office',         delBase: 8.5,  del60Base: 4.2,  del90Base: 2.8,  defBase: 1.15, recBase: 42, sevBase: 58 },
    { sector: 'CMBS Retail',         delBase: 5.8,  del60Base: 2.5,  del90Base: 1.6,  defBase: 0.65, recBase: 48, sevBase: 52 },
    { sector: 'CMBS Multifamily',    delBase: 1.8,  del60Base: 0.7,  del90Base: 0.4,  defBase: 0.10, recBase: 70, sevBase: 30 },
    { sector: 'CMBS Industrial',     delBase: 0.9,  del60Base: 0.3,  del90Base: 0.1,  defBase: 0.05, recBase: 75, sevBase: 25 },
    { sector: 'CLO (BSL)',           delBase: 1.2,  del60Base: 0.5,  del90Base: 0.3,  defBase: 0.38, recBase: 62, sevBase: 38 },
    { sector: 'CLO (MM)',            delBase: 0.8,  del60Base: 0.3,  del90Base: 0.2,  defBase: 0.22, recBase: 66, sevBase: 34 },
    { sector: 'Auto Loan Prime',     delBase: 1.5,  del60Base: 0.5,  del90Base: 0.2,  defBase: 0.35, recBase: 55, sevBase: 45 },
    { sector: 'Auto Loan Subprime',  delBase: 6.8,  del60Base: 3.0,  del90Base: 1.8,  defBase: 2.20, recBase: 42, sevBase: 58 },
    { sector: 'Credit Card',         delBase: 2.5,  del60Base: 1.2,  del90Base: 0.8,  defBase: 3.80, recBase: 18, sevBase: 82 },
    { sector: 'Student Loan',        delBase: 5.2,  del60Base: 2.5,  del90Base: 1.8,  defBase: 1.80, recBase: 35, sevBase: 65 },
    { sector: 'Equipment',           delBase: 1.2,  del60Base: 0.4,  del90Base: 0.2,  defBase: 0.55, recBase: 60, sevBase: 40 },
  ];

  const collateralPerformance = collateralSeeds.map(s => ({
    sector: s.sector,
    delinquency30d: round(jitter(s.delBase, 0.08, rng), 2),
    delinquency60d: round(jitter(s.del60Base, 0.10, rng), 2),
    delinquency90d: round(jitter(s.del90Base, 0.12, rng), 2),
    delinquencyUnit: '%',
    defaultRate: round(jitter(s.defBase, 0.10, rng), 2),
    defaultRateUnit: '%',
    recoveryRate: round(jitter(s.recBase, 0.05, rng), 1),
    recoveryRateUnit: '%',
    lossSeverity: round(jitter(s.sevBase, 0.05, rng), 1),
    lossSeverityUnit: '%',
    change3m: round((rng() - 0.48) * s.delBase * 0.08, 2),
    change3mUnit: 'pp',
    trend: pick(['Improving', 'Stable', 'Deteriorating'] as const, rng),
  }));

  // ──── 6. Market Issuance & Pipeline ────

  const issuanceByType = [
    { type: 'Agency MBS',   mtdBase: 42.5,  ytdBase: 485,  priorYtdBase: 462 },
    { type: 'Non-Agency MBS', mtdBase: 4.8, ytdBase: 52,   priorYtdBase: 48 },
    { type: 'CMBS',         mtdBase: 5.2,   ytdBase: 58,   priorYtdBase: 65 },
    { type: 'CLO',          mtdBase: 12.5,  ytdBase: 138,  priorYtdBase: 125 },
    { type: 'ABS (Auto)',   mtdBase: 8.5,   ytdBase: 95,   priorYtdBase: 88 },
    { type: 'ABS (Card)',   mtdBase: 5.8,   ytdBase: 62,   priorYtdBase: 58 },
    { type: 'ABS (Student)', mtdBase: 2.2,  ytdBase: 24,   priorYtdBase: 22 },
    { type: 'ABS (Other)',  mtdBase: 3.5,   ytdBase: 38,   priorYtdBase: 35 },
    { type: 'CDO/Bespoke',  mtdBase: 1.8,   ytdBase: 18,   priorYtdBase: 15 },
  ];

  const issuanceVolume = issuanceByType.map(s => {
    const ytd = round(jitter(s.ytdBase, 0.06, rng), 1);
    const priorYtd = round(jitter(s.priorYtdBase, 0.04, rng), 1);
    return {
      type: s.type,
      mtd: round(jitter(s.mtdBase, 0.10, rng), 1),
      mtdUnit: 'B USD',
      ytd,
      ytdUnit: 'B USD',
      priorYearYtd: priorYtd,
      priorYearYtdUnit: 'B USD',
      yoyChange: round(((ytd - priorYtd) / priorYtd) * 100, 1),
      yoyChangeUnit: '%',
    };
  });

  const pipelineSeeds = [
    { issuer: 'BANK 2025-BNK50',     type: 'CMBS' as const,  sizeBase: 1280, stage: 'marketing' as const },
    { issuer: 'Blackstone CLO 2025-2', type: 'CLO' as const,  sizeBase: 520,  stage: 'filed' as const },
    { issuer: 'WOART 2025-B',        type: 'ABS' as const,   sizeBase: 820,  stage: 'marketing' as const },
    { issuer: 'FNMA 2025-M24',       type: 'MBS' as const,   sizeBase: 2200, stage: 'filed' as const },
    { issuer: 'Ares LXXII CLO',      type: 'CLO' as const,   sizeBase: 580,  stage: 'marketing' as const },
    { issuer: 'CARMX 2025-2',        type: 'ABS' as const,   sizeBase: 720,  stage: 'filed' as const },
    { issuer: 'JPMCC 2025-CBM5',     type: 'CMBS' as const,  sizeBase: 950,  stage: 'marketing' as const },
    { issuer: 'KKR CLO 46',          type: 'CLO' as const,   sizeBase: 490,  stage: 'filed' as const },
    { issuer: 'SDART 2025-2',        type: 'ABS' as const,   sizeBase: 580,  stage: 'marketing' as const },
    { issuer: 'GNMA 2025-H10',       type: 'MBS' as const,   sizeBase: 1800, stage: 'filed' as const },
  ];

  const now = new Date();
  const pipeline = pipelineSeeds.map(s => {
    const daysOut = Math.floor(rangef(3, 25, rng));
    const expectedDate = new Date(now);
    expectedDate.setDate(expectedDate.getDate() + daysOut);
    return {
      issuer: s.issuer,
      type: s.type,
      expectedSize: round(jitter(s.sizeBase, 0.06, rng), 0),
      expectedSizeUnit: 'M USD',
      stage: s.stage,
      expectedPricing: expectedDate.toISOString().slice(0, 10),
      leadManager: pick(LEAD_MANAGERS, rng),
    };
  });

  // ──── 7. Spread Curves by Product Type & Rating ────

  const spreadCurveTypes = [
    { type: 'Agency MBS',     aaaBase: [32, 42, 55, 65, 72],       aaBase: null, aBase: null, bbbBase: null },
    { type: 'Non-Agency RMBS', aaaBase: [85, 105, 125, 142, 158],  aaBase: [110, 135, 160, 185, 210], aBase: [155, 185, 220, 260, 295], bbbBase: [235, 280, 330, 385, 440] },
    { type: 'CMBS',           aaaBase: [72, 88, 105, 118, 132],    aaBase: [108, 130, 155, 178, 200], aBase: [152, 180, 215, 250, 285], bbbBase: [240, 285, 335, 390, 445] },
    { type: 'CLO',            aaaBase: [105, 120, 138, 152, 168],  aaBase: [155, 178, 205, 232, 258], aBase: [215, 248, 285, 322, 358], bbbBase: [350, 400, 455, 510, 565] },
    { type: 'Auto ABS',       aaaBase: [28, 35, 45, 52, 58],       aaBase: [42, 52, 65, 78, 88], aBase: [68, 82, 100, 118, 135], bbbBase: [115, 140, 170, 200, 230] },
    { type: 'Credit Card ABS', aaaBase: [22, 28, 35, 42, 48],      aaBase: [35, 42, 52, 62, 70], aBase: [55, 65, 80, 95, 108], bbbBase: [90, 110, 135, 158, 180] },
  ];

  const tenorLabels = ['1Y', '3Y', '5Y', '7Y', '10Y'];

  const spreadCurves = spreadCurveTypes.map(s => {
    const buildCurve = (bases: number[] | null) => {
      if (!bases) return null;
      return bases.map((b, i) => ({
        tenor: tenorLabels[i],
        spread: round(jitter(b, 0.06, rng), 0),
      }));
    };

    return {
      type: s.type,
      aaa: buildCurve(s.aaaBase),
      aa: buildCurve(s.aaBase),
      a: buildCurve(s.aBase),
      bbb: buildCurve(s.bbbBase),
      spreadUnit: 'bps',
    };
  });

  // ──── 8. Market Summary ────

  const totalOutstanding = round(jitter(12.8, 0.03, rng), 1);
  const totalYtdIssuance = issuanceVolume.reduce((sum, v) => sum + v.ytd, 0);

  const marketSummary = {
    totalOutstanding,
    totalOutstandingUnit: 'T USD',
    totalYtdIssuance: round(totalYtdIssuance, 1),
    totalYtdIssuanceUnit: 'B USD',
    avgInvestmentGradeSpread: round(jitter(108, 0.05, rng), 0),
    avgInvestmentGradeSpreadUnit: 'bps',
    avgHighYieldSpread: round(jitter(485, 0.06, rng), 0),
    avgHighYieldSpreadUnit: 'bps',
    overallDelinquencyRate: round(jitter(3.2, 0.06, rng), 2),
    overallDelinquencyRateUnit: '%',
    cmbsSpecialServicingRate: round(jitter(6.8, 0.08, rng), 2),
    cmbsSpecialServicingRateUnit: '%',
    cloDefaultRate: round(jitter(0.35, 0.10, rng), 2),
    cloDefaultRateUnit: '%',
    absChargeOffRate: round(jitter(2.8, 0.08, rng), 2),
    absChargeOffRateUnit: '%',
    spreadChange1w: round((rng() - 0.48) * 8, 0),
    spreadChange1wUnit: 'bps',
    spreadChange1m: round((rng() - 0.48) * 18, 0),
    spreadChange1mUnit: 'bps',
  };

  return {
    marketSummary,
    productUniverse,
    prepaymentMetrics,
    trancheWaterfall,
    creditEnhancement,
    collateralPerformance,
    issuanceVolume,
    pipeline,
    spreadCurves,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[StructuredProductsAnalyzer] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(502).json({ error: 'Failed to generate structured products analyzer data' });
  }
});

export default router;
