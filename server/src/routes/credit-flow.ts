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

// ── Seed Data ──

const FUND_CATEGORIES = [
  { category: 'IG Mutual Funds', baseFlow1w: 1200, baseAum: 420 },
  { category: 'IG ETFs', baseFlow1w: 1800, baseAum: 310 },
  { category: 'HY Mutual Funds', baseFlow1w: -400, baseAum: 185 },
  { category: 'HY ETFs', baseFlow1w: 600, baseAum: 95 },
  { category: 'Bank Loans', baseFlow1w: 350, baseAum: 130 },
  { category: 'EM Debt', baseFlow1w: -250, baseAum: 210 },
  { category: 'Leveraged Loans', baseFlow1w: 200, baseAum: 78 },
  { category: 'Convertibles', baseFlow1w: 150, baseAum: 52 },
] as const;

const ISSUERS_IG = [
  { issuer: 'Microsoft Corp', sector: 'Technology', baseRating: 'Aaa/AAA' },
  { issuer: 'Apple Inc', sector: 'Technology', baseRating: 'Aa1/AA+' },
  { issuer: 'JPMorgan Chase', sector: 'Financials', baseRating: 'A1/A+' },
  { issuer: 'Bank of America', sector: 'Financials', baseRating: 'A2/A' },
  { issuer: 'UnitedHealth Group', sector: 'Healthcare', baseRating: 'A3/A-' },
  { issuer: 'Pfizer Inc', sector: 'Healthcare', baseRating: 'A2/A' },
  { issuer: 'Caterpillar Inc', sector: 'Industrials', baseRating: 'A3/A-' },
  { issuer: 'Verizon Communications', sector: 'Telecom', baseRating: 'Baa1/BBB+' },
  { issuer: 'General Electric', sector: 'Industrials', baseRating: 'Baa1/BBB+' },
  { issuer: 'Procter & Gamble', sector: 'Consumer Staples', baseRating: 'Aa3/AA-' },
];

const ISSUERS_HY = [
  { issuer: 'Ford Motor Co', sector: 'Autos', baseRating: 'Ba2/BB+' },
  { issuer: 'T-Mobile US', sector: 'Telecom', baseRating: 'Ba1/BB+' },
  { issuer: 'Carnival Corp', sector: 'Leisure', baseRating: 'B2/B' },
  { issuer: 'Occidental Petroleum', sector: 'Energy', baseRating: 'Ba2/BB+' },
  { issuer: 'Spirit AeroSystems', sector: 'Aerospace', baseRating: 'B1/B+' },
];

const ISSUERS_LL = [
  { issuer: 'Medline Industries', sector: 'Healthcare', baseRating: 'B2/B' },
  { issuer: 'TransDigm Group', sector: 'Aerospace', baseRating: 'B3/B-' },
  { issuer: 'Citrix Systems', sector: 'Technology', baseRating: 'B2/B' },
  { issuer: 'Finastra', sector: 'Fintech', baseRating: 'B3/B-' },
  { issuer: 'PetSmart Inc', sector: 'Retail', baseRating: 'B2/B' },
];

const SPREAD_INDICES = [
  { index: 'CDX IG', baseSpread: 58, min: 45, max: 75 },
  { index: 'CDX HY', baseSpread: 395, min: 330, max: 480 },
  { index: 'iTraxx Main', baseSpread: 62, min: 48, max: 82 },
  { index: 'iTraxx Xover', baseSpread: 340, min: 280, max: 420 },
  { index: 'LCDX', baseSpread: 285, min: 220, max: 370 },
  { index: 'EM CDSI', baseSpread: 175, min: 130, max: 240 },
] as const;

const CALENDAR_ISSUERS = [
  { issuer: 'Amazon.com Inc', sector: 'Technology', expectedRating: 'A1/AA', expectedSize: 5000, expectedTenor: '10Y' },
  { issuer: 'Goldman Sachs Group', sector: 'Financials', expectedRating: 'A2/A', expectedSize: 3000, expectedTenor: '5Y' },
  { issuer: 'Walt Disney Co', sector: 'Media', expectedRating: 'A2/A', expectedSize: 2500, expectedTenor: '30Y' },
  { issuer: 'Broadcom Inc', sector: 'Technology', expectedRating: 'Baa2/BBB', expectedSize: 4000, expectedTenor: '7Y' },
  { issuer: 'CVS Health Corp', sector: 'Healthcare', expectedRating: 'Baa2/BBB', expectedSize: 2000, expectedTenor: '10Y' },
  { issuer: 'Duke Energy Corp', sector: 'Utilities', expectedRating: 'Baa1/BBB+', expectedSize: 1500, expectedTenor: '20Y' },
  { issuer: 'Citigroup Inc', sector: 'Financials', expectedRating: 'Baa1/BBB+', expectedSize: 3500, expectedTenor: '5Y' },
  { issuer: 'ConocoPhillips', sector: 'Energy', expectedRating: 'A3/A-', expectedSize: 2000, expectedTenor: '10Y' },
];

const STATUSES = ['Roadshow', 'Pricing', 'Pre-Marketing'] as const;

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-credit-flow'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // ── Fund Flows (8 categories) ──

  const fundFlows = FUND_CATEGORIES.map(cat => {
    const flow1w = roundTo(jitter(cat.baseFlow1w, 0.6), 0);
    const flow4w = roundTo(flow1w * (3.2 + rng() * 1.6), 0);
    const flowYTD = roundTo((flow4w * (2.5 + rng() * 3.5)) / 1000, 1);
    const aum = roundTo(jitter(cat.baseAum, 0.08), 1);
    const streakDirection = flow1w >= 0 ? 1 : -1;
    const streak = streakDirection * (1 + Math.floor(rng() * 12));

    return {
      category: cat.category,
      flow1w,
      flow4w,
      flowYTD,
      aum,
      streak,
    };
  });

  // ── New Issuance (10 recent deals) ──

  const allIssuers = [
    ...ISSUERS_IG.map(i => ({ ...i, type: 'IG' as const })),
    ...ISSUERS_HY.map(i => ({ ...i, type: 'HY' as const })),
    ...ISSUERS_LL.map(i => ({ ...i, type: 'Leveraged Loan' as const })),
  ];
  const shuffledIssuers = [...allIssuers].sort(() => rng() - 0.5);
  const selectedIssuers = shuffledIssuers.slice(0, 10);

  const newIssuance = selectedIssuers.map(iss => {
    const isIG = iss.type === 'IG';
    const isHY = iss.type === 'HY';

    const size = isIG
      ? roundTo(1000 + rng() * 4000, 0)
      : isHY
        ? roundTo(500 + rng() * 2000, 0)
        : roundTo(300 + rng() * 1500, 0);

    const coupon = isIG
      ? roundTo(3.5 + rng() * 2.5, 3)
      : isHY
        ? roundTo(5.5 + rng() * 3.5, 3)
        : roundTo(6.0 + rng() * 4.0, 3);

    const spread = isIG
      ? roundTo(70 + rng() * 100, 0)
      : isHY
        ? roundTo(250 + rng() * 250, 0)
        : roundTo(300 + rng() * 300, 0);

    const bookCover = roundTo(2.0 + rng() * 4.0, 1);

    const tenors = ['3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
    const maturity = isIG ? pick(tenors) : pick(tenors.slice(0, 4));

    const daysAgo = Math.floor(rng() * 14);
    const pricingDate = new Date();
    pricingDate.setDate(pricingDate.getDate() - daysAgo);

    return {
      issuer: iss.issuer,
      rating: iss.baseRating,
      coupon,
      maturity,
      size,
      spread,
      bookCover,
      pricingDate: pricingDate.toISOString().slice(0, 10),
      sector: iss.sector,
      type: iss.type,
    };
  });

  newIssuance.sort((a, b) => b.pricingDate.localeCompare(a.pricingDate));

  // ── Spread Momentum (6 indices) ──

  const spreadMomentum = SPREAD_INDICES.map(idx => {
    const spread = roundTo(jitter(idx.baseSpread, 0.12), 1);
    const change1w = roundTo((rng() - 0.48) * idx.baseSpread * 0.08, 1);
    const change1m = roundTo((rng() - 0.45) * idx.baseSpread * 0.15, 1);
    const percentile = roundTo(rng() * 100, 0);

    let signal: 'Tight' | 'Wide' | 'Neutral';
    if (percentile < 30) signal = 'Tight';
    else if (percentile > 70) signal = 'Wide';
    else signal = 'Neutral';

    return {
      index: idx.index,
      spread,
      change1w,
      change1m,
      percentile,
      signal,
    };
  });

  // ── Issuance Calendar (5 upcoming) ──

  const shuffledCalendar = [...CALENDAR_ISSUERS].sort(() => rng() - 0.5);
  const issuanceCalendar = shuffledCalendar.slice(0, 5).map(cal => {
    const size = roundTo(jitter(cal.expectedSize, 0.2), 0);
    const status = pick(STATUSES);

    return {
      issuer: cal.issuer,
      expectedRating: cal.expectedRating,
      expectedSize: size,
      expectedTenor: cal.expectedTenor,
      sector: cal.sector,
      status,
    };
  });

  // ── Summary ──

  const igFlowItems = fundFlows.filter(f => f.category.startsWith('IG'));
  const hyFlowItems = fundFlows.filter(f => f.category.startsWith('HY'));
  const llFlowItem = fundFlows.find(f => f.category === 'Leveraged Loans');

  const igFlows1w = roundTo(igFlowItems.reduce((s, f) => s + f.flow1w, 0) / 1000, 1);
  const hyFlows1w = roundTo(hyFlowItems.reduce((s, f) => s + f.flow1w, 0) / 1000, 1);
  const leveragedLoanFlows1w = roundTo((llFlowItem?.flow1w ?? 0) / 1000, 2);
  const newIssuanceYTD = roundTo(30 + rng() * 70, 1);

  const cdxIg = spreadMomentum.find(s => s.index === 'CDX IG');
  const spreadDirection = cdxIg && cdxIg.change1w < 0 ? 'Tightening' : 'Widening';

  const summary = {
    igFlows1w,
    hyFlows1w,
    leveragedLoanFlows1w,
    newIssuanceYTD,
    spreadDirection,
  };

  return {
    summary,
    fundFlows,
    newIssuance,
    spreadMomentum,
    issuanceCalendar,
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
    console.error('[CreditFlow] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate credit flow data' });
  }
});

export default router;
