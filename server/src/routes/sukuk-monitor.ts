import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// -- Static Data --

interface SukukDef {
  issuer: string;
  country: string;
  structure: 'Ijarah' | 'Murabaha' | 'Wakala' | 'Musharakah' | 'Mudarabah' | 'Salam' | 'Istisna';
  maturityDate: string;
  baseCoupon: number;
  basePrice: number;
  baseSpread: number;
  outstandingAmount: number;
  ratingMoodys: string;
  ratingSP: string;
  currency: 'USD' | 'MYR' | 'SAR' | 'IDR';
  sector: 'sovereign' | 'quasi-sovereign' | 'corporate' | 'financial';
  isin: string;
}

const SUKUK_DEFS: SukukDef[] = [
  // Sovereign
  { issuer: 'Malaysia Sovereign Sukuk', country: 'Malaysia', structure: 'Murabaha', maturityDate: '2029-04-15', baseCoupon: 3.65, basePrice: 99.25, baseSpread: 65, outstandingAmount: 3500, ratingMoodys: 'A3', ratingSP: 'A-', currency: 'USD', sector: 'sovereign', isin: 'XS2345678901' },
  { issuer: 'Kingdom of Saudi Arabia', country: 'Saudi Arabia', structure: 'Wakala', maturityDate: '2033-01-18', baseCoupon: 5.25, basePrice: 101.50, baseSpread: 72, outstandingAmount: 5000, ratingMoodys: 'A1', ratingSP: 'A', currency: 'USD', sector: 'sovereign', isin: 'XS2456789012' },
  { issuer: 'Republic of Indonesia', country: 'Indonesia', structure: 'Wakala', maturityDate: '2032-06-01', baseCoupon: 4.85, basePrice: 98.75, baseSpread: 110, outstandingAmount: 2500, ratingMoodys: 'Baa2', ratingSP: 'BBB', currency: 'USD', sector: 'sovereign', isin: 'XS2567890123' },
  { issuer: 'Republic of Turkey', country: 'Turkey', structure: 'Ijarah', maturityDate: '2028-10-22', baseCoupon: 6.35, basePrice: 96.80, baseSpread: 245, outstandingAmount: 2000, ratingMoodys: 'B3', ratingSP: 'B', currency: 'USD', sector: 'sovereign', isin: 'XS2678901234' },
  { issuer: 'State of Qatar', country: 'Qatar', structure: 'Ijarah', maturityDate: '2030-03-12', baseCoupon: 4.50, basePrice: 100.25, baseSpread: 55, outstandingAmount: 4000, ratingMoodys: 'Aa3', ratingSP: 'AA-', currency: 'USD', sector: 'sovereign', isin: 'XS2789012345' },
  { issuer: 'Kingdom of Bahrain', country: 'Bahrain', structure: 'Ijarah', maturityDate: '2031-11-25', baseCoupon: 5.80, basePrice: 97.50, baseSpread: 195, outstandingAmount: 1500, ratingMoodys: 'B2', ratingSP: 'B+', currency: 'USD', sector: 'sovereign', isin: 'XS2890123456' },
  { issuer: 'Sultanate of Oman', country: 'Oman', structure: 'Ijarah', maturityDate: '2029-08-14', baseCoupon: 5.60, basePrice: 98.10, baseSpread: 175, outstandingAmount: 1750, ratingMoodys: 'Ba1', ratingSP: 'BB', currency: 'USD', sector: 'sovereign', isin: 'XS2901234567' },
  { issuer: 'Islamic Republic of Pakistan', country: 'Pakistan', structure: 'Ijarah', maturityDate: '2027-12-05', baseCoupon: 6.90, basePrice: 93.50, baseSpread: 420, outstandingAmount: 1000, ratingMoodys: 'Caa1', ratingSP: 'CCC+', currency: 'USD', sector: 'sovereign', isin: 'XS2012345678' },
  // Quasi-sovereign
  { issuer: 'Islamic Development Bank (IsDB)', country: 'Saudi Arabia', structure: 'Wakala', maturityDate: '2028-09-20', baseCoupon: 4.15, basePrice: 100.80, baseSpread: 42, outstandingAmount: 3000, ratingMoodys: 'Aaa', ratingSP: 'AAA', currency: 'USD', sector: 'quasi-sovereign', isin: 'XS2123456789' },
  { issuer: 'Saudi Aramco', country: 'Saudi Arabia', structure: 'Mudarabah', maturityDate: '2034-07-10', baseCoupon: 4.95, basePrice: 99.60, baseSpread: 68, outstandingAmount: 6000, ratingMoodys: 'A1', ratingSP: 'A', currency: 'USD', sector: 'quasi-sovereign', isin: 'XS2234567890' },
  { issuer: 'Petronas Global Sukuk', country: 'Malaysia', structure: 'Murabaha', maturityDate: '2031-04-28', baseCoupon: 4.40, basePrice: 100.15, baseSpread: 58, outstandingAmount: 2500, ratingMoodys: 'A2', ratingSP: 'A-', currency: 'USD', sector: 'quasi-sovereign', isin: 'XS2345012345' },
  { issuer: 'Kuwait Finance House', country: 'Kuwait', structure: 'Wakala', maturityDate: '2029-02-18', baseCoupon: 4.75, basePrice: 99.90, baseSpread: 85, outstandingAmount: 750, ratingMoodys: 'A1', ratingSP: 'A', currency: 'USD', sector: 'financial', isin: 'XS2456012345' },
  // Corporate
  { issuer: 'Dubai Islamic Bank', country: 'UAE', structure: 'Musharakah', maturityDate: '2028-11-08', baseCoupon: 5.10, basePrice: 99.45, baseSpread: 115, outstandingAmount: 1000, ratingMoodys: 'A3', ratingSP: 'A-', currency: 'USD', sector: 'financial', isin: 'XS2567012345' },
  { issuer: 'Emaar Sukuk Ltd', country: 'UAE', structure: 'Ijarah', maturityDate: '2030-06-15', baseCoupon: 5.45, basePrice: 98.35, baseSpread: 155, outstandingAmount: 750, ratingMoodys: 'Baa3', ratingSP: 'BBB-', currency: 'USD', sector: 'corporate', isin: 'XS2678012345' },
  { issuer: 'DP World Crescent', country: 'UAE', structure: 'Murabaha', maturityDate: '2032-10-03', baseCoupon: 5.30, basePrice: 98.90, baseSpread: 135, outstandingAmount: 1500, ratingMoodys: 'Baa3', ratingSP: 'BBB-', currency: 'USD', sector: 'corporate', isin: 'XS2789023456' },
  { issuer: 'Bank Islam Malaysia', country: 'Malaysia', structure: 'Murabaha', maturityDate: '2028-03-25', baseCoupon: 3.45, basePrice: 99.80, baseSpread: 78, outstandingAmount: 500, ratingMoodys: 'A3', ratingSP: 'A-', currency: 'MYR', sector: 'financial', isin: 'MYBMS2012345' },
  { issuer: 'CIMB Islamic', country: 'Malaysia', structure: 'Wakala', maturityDate: '2029-07-12', baseCoupon: 3.80, basePrice: 100.10, baseSpread: 82, outstandingAmount: 650, ratingMoodys: 'A3', ratingSP: 'A-', currency: 'MYR', sector: 'financial', isin: 'MYBMS2023456' },
  { issuer: 'Dar Al-Arkan', country: 'Saudi Arabia', structure: 'Ijarah', maturityDate: '2027-06-20', baseCoupon: 6.75, basePrice: 97.20, baseSpread: 225, outstandingAmount: 600, ratingMoodys: 'B1', ratingSP: 'B+', currency: 'USD', sector: 'corporate', isin: 'XS2890034567' },
  { issuer: 'Axiata Group', country: 'Malaysia', structure: 'Murabaha', maturityDate: '2030-09-10', baseCoupon: 3.95, basePrice: 99.50, baseSpread: 90, outstandingAmount: 500, ratingMoodys: 'Baa2', ratingSP: 'BBB', currency: 'MYR', sector: 'corporate', isin: 'MYBMS2034567' },
  { issuer: 'Saudi Electricity Company', country: 'Saudi Arabia', structure: 'Istisna', maturityDate: '2033-12-01', baseCoupon: 5.15, basePrice: 99.10, baseSpread: 95, outstandingAmount: 2000, ratingMoodys: 'A1', ratingSP: 'A', currency: 'USD', sector: 'quasi-sovereign', isin: 'XS2901045678' },
];

interface PipelineDef {
  issuer: string;
  country: string;
  structure: string;
  expectedSize: number;
  tenor: string;
  currency: string;
  sector: string;
  expectedPricingDate: string;
  leadManagers: string[];
}

const PIPELINE_DEFS: PipelineDef[] = [
  { issuer: 'Government of Malaysia', country: 'Malaysia', structure: 'Murabaha', expectedSize: 1500, tenor: '10Y', currency: 'USD', sector: 'sovereign', expectedPricingDate: '2026-04-10', leadManagers: ['HSBC Amanah', 'CIMB Islamic', 'Maybank Islamic'] },
  { issuer: 'Saudi National Bank', country: 'Saudi Arabia', structure: 'Wakala', expectedSize: 1000, tenor: '5Y', currency: 'USD', sector: 'financial', expectedPricingDate: '2026-04-05', leadManagers: ['JPMorgan', 'Standard Chartered Saadiq', 'Goldman Sachs'] },
  { issuer: 'Abu Dhabi Islamic Bank', country: 'UAE', structure: 'Musharakah', expectedSize: 750, tenor: '7Y', currency: 'USD', sector: 'financial', expectedPricingDate: '2026-04-15', leadManagers: ['HSBC Amanah', 'Emirates NBD Capital'] },
  { issuer: 'Republic of Indonesia', country: 'Indonesia', structure: 'Wakala', expectedSize: 2000, tenor: '10Y', currency: 'USD', sector: 'sovereign', expectedPricingDate: '2026-04-22', leadManagers: ['Deutsche Bank', 'Dubai Islamic Bank', 'Mandiri Securities'] },
  { issuer: 'Etihad Airways', country: 'UAE', structure: 'Ijarah', expectedSize: 600, tenor: '5Y', currency: 'USD', sector: 'corporate', expectedPricingDate: '2026-04-18', leadManagers: ['First Abu Dhabi Bank', 'Standard Chartered Saadiq'] },
  { issuer: 'Pengurusan Air SPV', country: 'Malaysia', structure: 'Istisna', expectedSize: 400, tenor: '15Y', currency: 'MYR', sector: 'quasi-sovereign', expectedPricingDate: '2026-04-28', leadManagers: ['CIMB Islamic', 'AmInvestment Bank'] },
  { issuer: 'Kuwait International Bank', country: 'Kuwait', structure: 'Mudarabah', expectedSize: 500, tenor: '5Y', currency: 'USD', sector: 'financial', expectedPricingDate: '2026-05-05', leadManagers: ['HSBC Amanah', 'KFH Capital'] },
  { issuer: 'Turk Participation Banks', country: 'Turkey', structure: 'Murabaha', expectedSize: 500, tenor: '3Y', currency: 'USD', sector: 'financial', expectedPricingDate: '2026-05-10', leadManagers: ['Emirates NBD Capital', 'KFH Capital', 'QNB Capital'] },
];

const YIELD_CURVE_TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];

const MALAYSIA_BASE_YIELDS = [3.15, 3.30, 3.42, 3.60, 3.78, 3.95, 4.15, 4.28, 4.40];
const SAUDI_BASE_YIELDS = [4.55, 4.70, 4.82, 5.00, 5.15, 5.30, 5.48, 5.60, 5.72];

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Helpers --

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// -- Generator --

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('sukuk-monitor-' + day));

  // ---- 1. Market Overview ----
  const totalOutstanding = round(jitter(856, 0.03, rng), 1);
  const newIssuanceYTD = round(jitter(98.5, 0.08, rng), 1);
  const avgYield = round(jitter(4.92, 0.04, rng), 2);
  const spreadToConventional = Math.round(jitter(68, 0.12, rng));
  const sovereignIssuers = Math.round(jitter(28, 0.08, rng));
  const corporateIssuers = Math.round(jitter(142, 0.06, rng));
  const totalIssuances = Math.round(jitter(385, 0.05, rng));
  const avgTenor = round(jitter(7.2, 0.06, rng), 1);
  const globalSukukGrowthYoY = round(jitter(12.5, 0.15, rng), 1);

  const marketOverview = {
    totalOutstandingBn: totalOutstanding,
    newIssuanceYTDBn: newIssuanceYTD,
    averageYieldPct: avgYield,
    spreadToConventionalBps: spreadToConventional,
    sovereignIssuers,
    corporateIssuers,
    totalActiveIssuances: totalIssuances,
    averageTenorYears: avgTenor,
    globalGrowthYoYPct: globalSukukGrowthYoY,
  };

  // ---- 2. Active Sukuk Issues ----
  const activeSukuk = SUKUK_DEFS.map(s => {
    const coupon = round(jitter(s.baseCoupon, 0.02, rng), 3);
    const price = round(jitter(s.basePrice, 0.015, rng), 3);
    const yieldVal = round(jitter(s.baseCoupon * (100 / price), 0.03, rng), 3);
    const spread = Math.round(jitter(s.baseSpread, 0.1, rng));
    const outstanding = round(jitter(s.outstandingAmount, 0.05, rng), 0);

    const priceChange1D = round((rng() - 0.48) * 0.45, 3);
    const priceChange1W = round((rng() - 0.47) * 0.85, 3);
    const spreadChange1D = Math.round((rng() - 0.48) * 8);
    const spreadChange1W = Math.round((rng() - 0.47) * 15);

    const bidPrice = round(price - rng() * 0.15, 3);
    const askPrice = round(price + rng() * 0.15, 3);

    const modifiedDuration = round(jitter(4.5, 0.35, rng), 2);
    const zSpread = spread + Math.round((rng() - 0.5) * 10);

    return {
      issuer: s.issuer,
      isin: s.isin,
      country: s.country,
      structure: s.structure,
      maturityDate: s.maturityDate,
      couponPct: coupon,
      price,
      bidPrice,
      askPrice,
      yieldPct: yieldVal,
      spreadToBenchmarkBps: spread,
      zSpreadBps: zSpread,
      outstandingAmountMn: outstanding,
      ratingMoodys: s.ratingMoodys,
      ratingSP: s.ratingSP,
      currency: s.currency,
      sector: s.sector,
      modifiedDuration,
      priceChange1D,
      priceChange1W,
      spreadChange1DBps: spreadChange1D,
      spreadChange1WBps: spreadChange1W,
    };
  });

  // ---- 3. Issuance Pipeline ----
  const pipeline = PIPELINE_DEFS.map(p => {
    const expectedSize = Math.round(jitter(p.expectedSize, 0.08, rng));
    const guidanceSpread = Math.round(jitter(90, 0.3, rng));
    const bookStatus = pick(['Pre-marketing', 'Books open', 'Books open - well oversubscribed', 'Guidance released', 'Pricing imminent'], rng);
    const shariaAdvisor = pick(['AAOIFI-certified', 'Amanie Advisors', 'Dar Al Sharia', 'ISRA Consultancy', 'Shariyah Review Bureau'], rng);

    return {
      issuer: p.issuer,
      country: p.country,
      structure: p.structure,
      expectedSizeMn: expectedSize,
      tenor: p.tenor,
      currency: p.currency,
      sector: p.sector,
      expectedPricingDate: p.expectedPricingDate,
      leadManagers: p.leadManagers,
      initialPriceGuidanceBps: `MS+${guidanceSpread}`,
      bookStatus,
      shariaAdvisor,
    };
  });

  // ---- 4. Market Breakdown ----
  const countryShares = [
    { country: 'Malaysia', sharePct: round(jitter(39.5, 0.04, rng), 1), outstandingBn: 0 },
    { country: 'Saudi Arabia', sharePct: round(jitter(20.2, 0.05, rng), 1), outstandingBn: 0 },
    { country: 'UAE', sharePct: round(jitter(11.8, 0.06, rng), 1), outstandingBn: 0 },
    { country: 'Indonesia', sharePct: round(jitter(10.3, 0.06, rng), 1), outstandingBn: 0 },
    { country: 'Turkey', sharePct: round(jitter(5.2, 0.08, rng), 1), outstandingBn: 0 },
    { country: 'Qatar', sharePct: round(jitter(4.1, 0.08, rng), 1), outstandingBn: 0 },
    { country: 'Bahrain', sharePct: round(jitter(3.0, 0.10, rng), 1), outstandingBn: 0 },
    { country: 'Kuwait', sharePct: round(jitter(2.5, 0.10, rng), 1), outstandingBn: 0 },
    { country: 'Pakistan', sharePct: round(jitter(1.8, 0.12, rng), 1), outstandingBn: 0 },
    { country: 'Oman', sharePct: round(jitter(1.6, 0.12, rng), 1), outstandingBn: 0 },
  ];
  // Normalize to 100%
  const totalPct = countryShares.reduce((a, c) => a + c.sharePct, 0);
  countryShares.forEach(c => {
    c.sharePct = round((c.sharePct / totalPct) * 100, 1);
    c.outstandingBn = round(totalOutstanding * c.sharePct / 100, 1);
  });

  const byStructure = [
    { structure: 'Murabaha', sharePct: round(jitter(32.5, 0.05, rng), 1) },
    { structure: 'Wakala', sharePct: round(jitter(24.8, 0.06, rng), 1) },
    { structure: 'Ijarah', sharePct: round(jitter(21.2, 0.06, rng), 1) },
    { structure: 'Musharakah', sharePct: round(jitter(9.5, 0.08, rng), 1) },
    { structure: 'Mudarabah', sharePct: round(jitter(6.3, 0.10, rng), 1) },
    { structure: 'Istisna', sharePct: round(jitter(3.5, 0.12, rng), 1) },
    { structure: 'Salam', sharePct: round(jitter(2.2, 0.15, rng), 1) },
  ];
  const totalStructPct = byStructure.reduce((a, c) => a + c.sharePct, 0);
  byStructure.forEach(c => { c.sharePct = round((c.sharePct / totalStructPct) * 100, 1); });

  const byCurrency = [
    { currency: 'USD', sharePct: round(jitter(58.5, 0.04, rng), 1) },
    { currency: 'MYR', sharePct: round(jitter(22.3, 0.05, rng), 1) },
    { currency: 'SAR', sharePct: round(jitter(10.8, 0.06, rng), 1) },
    { currency: 'IDR', sharePct: round(jitter(5.2, 0.08, rng), 1) },
    { currency: 'Other', sharePct: round(jitter(3.2, 0.10, rng), 1) },
  ];
  const totalCcyPct = byCurrency.reduce((a, c) => a + c.sharePct, 0);
  byCurrency.forEach(c => { c.sharePct = round((c.sharePct / totalCcyPct) * 100, 1); });

  const bySector = [
    { sector: 'sovereign', sharePct: round(jitter(42.5, 0.04, rng), 1) },
    { sector: 'quasi-sovereign', sharePct: round(jitter(22.8, 0.05, rng), 1) },
    { sector: 'financial', sharePct: round(jitter(20.5, 0.05, rng), 1) },
    { sector: 'corporate', sharePct: round(jitter(14.2, 0.06, rng), 1) },
  ];
  const totalSectorPct = bySector.reduce((a, c) => a + c.sharePct, 0);
  bySector.forEach(c => { c.sharePct = round((c.sharePct / totalSectorPct) * 100, 1); });

  const marketBreakdown = {
    byCountry: countryShares,
    byStructure,
    byCurrency,
    bySector,
  };

  // ---- 5. Yield Curves ----
  const malaysiaYieldCurve = YIELD_CURVE_TENORS.map((tenor, i) => {
    const yld = round(jitter(MALAYSIA_BASE_YIELDS[i], 0.03, rng), 3);
    const change1D = round((rng() - 0.48) * 0.04, 3);
    const change1W = round((rng() - 0.47) * 0.08, 3);
    const conventionalSpread = Math.round(jitter(15 + i * 3, 0.15, rng));
    return { tenor, yieldPct: yld, change1DBps: Math.round(change1D * 100), change1WBps: Math.round(change1W * 100), spreadToConventionalBps: conventionalSpread };
  });

  const saudiYieldCurve = YIELD_CURVE_TENORS.map((tenor, i) => {
    const yld = round(jitter(SAUDI_BASE_YIELDS[i], 0.03, rng), 3);
    const change1D = round((rng() - 0.48) * 0.04, 3);
    const change1W = round((rng() - 0.47) * 0.08, 3);
    const conventionalSpread = Math.round(jitter(20 + i * 4, 0.15, rng));
    return { tenor, yieldPct: yld, change1DBps: Math.round(change1D * 100), change1WBps: Math.round(change1W * 100), spreadToConventionalBps: conventionalSpread };
  });

  const yieldCurves = {
    malaysia: { country: 'Malaysia', currency: 'MYR', issuer: 'Government of Malaysia', curve: malaysiaYieldCurve },
    saudiArabia: { country: 'Saudi Arabia', currency: 'SAR', issuer: 'Kingdom of Saudi Arabia', curve: saudiYieldCurve },
  };

  // ---- 6. Top Movers ----
  const moverCandidates = activeSukuk
    .map(s => ({
      issuer: s.issuer,
      country: s.country,
      structure: s.structure,
      currency: s.currency,
      price: s.price,
      priceChange1D: s.priceChange1D,
      spreadToBenchmarkBps: s.spreadToBenchmarkBps,
      spreadChange1DBps: s.spreadChange1DBps,
      yieldPct: s.yieldPct,
      absSpreadChange: Math.abs(s.spreadChange1DBps),
    }))
    .sort((a, b) => b.absSpreadChange - a.absSpreadChange)
    .slice(0, 5)
    .map(({ absSpreadChange: _abs, ...rest }) => rest);

  return {
    marketOverview,
    activeSukuk,
    issuancePipeline: pipeline,
    marketBreakdown,
    yieldCurves,
    topMovers: moverCandidates,
    timestamp: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SukukMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate sukuk monitor data' });
  }
});

export default router;
