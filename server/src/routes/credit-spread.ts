import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface SpreadEntry {
  rating: string;
  spread: number;
  change1D: number;
  change1W: number;
  change1M: number;
  changeYTD: number;
  spreadRange52W: { low: number; high: number };
  avgLife: number;
}

interface SectorSpread {
  sector: string;
  igSpread: number;
  hySpread: number;
  change1D: number;
  change1W: number;
  tightest: number;
  widest: number;
}

interface IndexMetric {
  level: number;
  change: number;
  changePct: number;
}

interface CreditIndices {
  igOAS: IndexMetric;
  igDuration: IndexMetric;
  igYTW: IndexMetric;
  hyOAS: IndexMetric;
  hyDuration: IndexMetric;
  hyYTW: IndexMetric;
  emOAS: IndexMetric;
  emDuration: IndexMetric;
  emYTW: IndexMetric;
}

interface DistressedIssuer {
  issuer: string;
  ticker: string;
  coupon: number;
  maturity: string;
  price: number;
  ytw: number;
  oas: number;
  rating: string;
  sector: string;
}

interface NewIssue {
  issuer: string;
  size: number;
  coupon: number;
  tenor: string;
  spread: number;
  rating: string;
  bookSize: number;
  pricingDate: string;
}

interface CrossoverIssuer {
  issuer: string;
  currentRating: string;
  outlook: string;
  spread: number;
  probability_downgrade: number;
  probability_upgrade: number;
}

interface CreditSpreadSummary {
  igAvgSpread: number;
  hyAvgSpread: number;
  igHyRatio: number;
  emSpread: number;
  distressedCount: number;
  defaultRate12M: number;
  recoveryRate: number;
}

interface CreditSpreadResponse {
  investmentGrade: SpreadEntry[];
  highYield: SpreadEntry[];
  sectorSpreads: SectorSpread[];
  indices: CreditIndices;
  distressedDebt: DistressedIssuer[];
  newIssues: NewIssue[];
  crossover: CrossoverIssuer[];
  summary: CreditSpreadSummary;
  generatedAt: string;
}

// ── Static templates ──

const IG_RATINGS_TEMPLATE = [
  { rating: 'AAA', baseSpread: 38,  baseAvgLife: 8.2 },
  { rating: 'AA+', baseSpread: 45,  baseAvgLife: 7.8 },
  { rating: 'AA',  baseSpread: 52,  baseAvgLife: 7.5 },
  { rating: 'AA-', baseSpread: 60,  baseAvgLife: 7.1 },
  { rating: 'A+',  baseSpread: 70,  baseAvgLife: 6.8 },
  { rating: 'A',   baseSpread: 82,  baseAvgLife: 6.5 },
  { rating: 'A-',  baseSpread: 95,  baseAvgLife: 6.2 },
  { rating: 'BBB+', baseSpread: 115, baseAvgLife: 5.9 },
  { rating: 'BBB', baseSpread: 138, baseAvgLife: 5.5 },
  { rating: 'BBB-', baseSpread: 168, baseAvgLife: 5.1 },
];

const HY_RATINGS_TEMPLATE = [
  { rating: 'BB+', baseSpread: 210, baseAvgLife: 4.8 },
  { rating: 'BB',  baseSpread: 265, baseAvgLife: 4.5 },
  { rating: 'BB-', baseSpread: 330, baseAvgLife: 4.2 },
  { rating: 'B+',  baseSpread: 400, baseAvgLife: 3.9 },
  { rating: 'B',   baseSpread: 480, baseAvgLife: 3.6 },
  { rating: 'B-',  baseSpread: 580, baseAvgLife: 3.3 },
  { rating: 'CCC', baseSpread: 950, baseAvgLife: 2.8 },
];

const SECTOR_NAMES = [
  'Financials', 'Technology', 'Healthcare', 'Energy', 'Consumer',
  'Industrials', 'Utilities', 'Telecom', 'Materials', 'Real Estate',
] as const;

const SECTOR_SPREAD_BASES: Record<string, { ig: number; hy: number }> = {
  Financials:   { ig: 95,  hy: 370 },
  Technology:   { ig: 85,  hy: 340 },
  Healthcare:   { ig: 92,  hy: 385 },
  Energy:       { ig: 110, hy: 420 },
  Consumer:     { ig: 100, hy: 390 },
  Industrials:  { ig: 98,  hy: 375 },
  Utilities:    { ig: 88,  hy: 355 },
  Telecom:      { ig: 105, hy: 410 },
  Materials:    { ig: 102, hy: 395 },
  'Real Estate': { ig: 115, hy: 435 },
};

const DISTRESSED_TEMPLATE = [
  { issuer: 'Rite Aid Corp',            ticker: 'RAD',   coupon: 7.5,   maturity: '2027-07-01', basePrice: 14,  baseYtw: 52.3,  baseOas: 4850, rating: 'D',    sector: 'Healthcare' },
  { issuer: 'Spirit Airlines',          ticker: 'SAVE',  coupon: 8.0,   maturity: '2028-09-15', basePrice: 28,  baseYtw: 34.2,  baseOas: 2990, rating: 'CC',   sector: 'Consumer' },
  { issuer: 'WeWork Inc',               ticker: 'WEWK',  coupon: 7.875, maturity: '2027-05-01', basePrice: 5,   baseYtw: 145.0, baseOas: 14100, rating: 'D',   sector: 'Real Estate' },
  { issuer: 'Envision Healthcare',      ticker: 'EVHC',  coupon: 8.75,  maturity: '2028-10-15', basePrice: 9,   baseYtw: 68.5,  baseOas: 6480, rating: 'D',    sector: 'Healthcare' },
  { issuer: 'Lumen Technologies',       ticker: 'LUMN',  coupon: 5.125, maturity: '2029-12-15', basePrice: 52,  baseYtw: 16.8,  baseOas: 1250, rating: 'CCC+', sector: 'Telecom' },
  { issuer: 'Community Health Systems', ticker: 'CYH',   coupon: 8.0,   maturity: '2030-03-15', basePrice: 36,  baseYtw: 28.2,  baseOas: 2380, rating: 'CCC',  sector: 'Healthcare' },
  { issuer: 'AMC Entertainment',        ticker: 'AMC',   coupon: 7.5,   maturity: '2029-02-15', basePrice: 40,  baseYtw: 25.8,  baseOas: 2130, rating: 'CCC',  sector: 'Consumer' },
  { issuer: 'Carvana Co',               ticker: 'CVNA',  coupon: 5.625, maturity: '2029-10-01', basePrice: 62,  baseYtw: 15.4,  baseOas: 1110, rating: 'CCC+', sector: 'Consumer' },
  { issuer: 'Diebold Nixdorf',          ticker: 'DBD',   coupon: 9.375, maturity: '2027-07-15', basePrice: 18,  baseYtw: 48.5,  baseOas: 4430, rating: 'D',    sector: 'Technology' },
  { issuer: 'Talen Energy Supply',      ticker: 'TLN',   coupon: 6.625, maturity: '2029-01-15', basePrice: 44,  baseYtw: 22.0,  baseOas: 1780, rating: 'CCC',  sector: 'Energy' },
];

const NEW_ISSUES_TEMPLATE = [
  { issuer: 'Apple Inc',             baseSize: 5.5,  baseCoupon: 4.15,  tenor: '10Y', baseSpread: 55,  rating: 'AA+', baseBook: 3.2 },
  { issuer: 'JPMorgan Chase & Co',   baseSize: 4.0,  baseCoupon: 5.25,  tenor: '5Y',  baseSpread: 85,  rating: 'A-',  baseBook: 2.8 },
  { issuer: 'Microsoft Corp',        baseSize: 6.0,  baseCoupon: 4.05,  tenor: '30Y', baseSpread: 65,  rating: 'AAA', baseBook: 4.1 },
  { issuer: 'T-Mobile US Inc',       baseSize: 3.0,  baseCoupon: 5.60,  tenor: '7Y',  baseSpread: 130, rating: 'BBB', baseBook: 2.5 },
  { issuer: 'Ford Motor Credit',     baseSize: 2.5,  baseCoupon: 6.80,  tenor: '5Y',  baseSpread: 225, rating: 'BB+', baseBook: 2.1 },
  { issuer: 'Broadcom Inc',          baseSize: 4.5,  baseCoupon: 5.15,  tenor: '10Y', baseSpread: 110, rating: 'BBB-', baseBook: 3.0 },
  { issuer: 'Goldman Sachs Group',   baseSize: 3.5,  baseCoupon: 5.45,  tenor: '10Y', baseSpread: 95,  rating: 'A-',  baseBook: 2.6 },
  { issuer: 'HCA Healthcare Inc',    baseSize: 2.0,  baseCoupon: 5.90,  tenor: '8Y',  baseSpread: 145, rating: 'BB+', baseBook: 2.3 },
];

const CROSSOVER_TEMPLATE = [
  { issuer: 'Ford Motor Co',         currentRating: 'BB+', outlook: 'Positive',  baseSpread: 215, baseDowngrade: 15, baseUpgrade: 35 },
  { issuer: 'Western Digital Corp',  currentRating: 'BB+', outlook: 'Stable',    baseSpread: 230, baseDowngrade: 20, baseUpgrade: 25 },
  { issuer: 'Kraft Heinz Co',        currentRating: 'BBB-', outlook: 'Negative', baseSpread: 165, baseDowngrade: 30, baseUpgrade: 10 },
  { issuer: 'FirstEnergy Corp',      currentRating: 'BBB-', outlook: 'Stable',   baseSpread: 155, baseDowngrade: 18, baseUpgrade: 22 },
  { issuer: 'Icahn Enterprises LP',  currentRating: 'BB-',  outlook: 'Negative', baseSpread: 380, baseDowngrade: 40, baseUpgrade: 8 },
];
let cacheData: CreditSpreadResponse | null = null;
let cacheTime = 0;

// ── Data generation ──

function generate(): CreditSpreadResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('credit-spread-' + today));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  // ── Investment Grade spreads ──
  const investmentGrade: SpreadEntry[] = IG_RATINGS_TEMPLATE.map(tmpl => {
    const spread = Math.round(jitter(tmpl.baseSpread, 0.08));
    const change1D = Math.round(jitter(0, 1) * 3 * 10) / 10;
    const change1W = Math.round(jitter(0, 1) * 8 * 10) / 10;
    const change1M = Math.round(jitter(0, 1) * 15 * 10) / 10;
    const changeYTD = Math.round(jitter(0, 1) * 25 * 10) / 10;
    const rangeMid = spread;
    const low = Math.round(rangeMid * (1 - rng() * 0.25));
    const high = Math.round(rangeMid * (1 + rng() * 0.30));
    const avgLife = round1(jitter(tmpl.baseAvgLife, 0.05));
    return { rating: tmpl.rating, spread, change1D, change1W, change1M, changeYTD, spreadRange52W: { low, high }, avgLife };
  });

  // ── High Yield spreads ──
  const highYield: SpreadEntry[] = HY_RATINGS_TEMPLATE.map(tmpl => {
    const spread = Math.round(jitter(tmpl.baseSpread, 0.10));
    const change1D = Math.round(jitter(0, 1) * 6 * 10) / 10;
    const change1W = Math.round(jitter(0, 1) * 18 * 10) / 10;
    const change1M = Math.round(jitter(0, 1) * 35 * 10) / 10;
    const changeYTD = Math.round(jitter(0, 1) * 55 * 10) / 10;
    const rangeMid = spread;
    const low = Math.round(rangeMid * (1 - rng() * 0.20));
    const high = Math.round(rangeMid * (1 + rng() * 0.35));
    const avgLife = round1(jitter(tmpl.baseAvgLife, 0.06));
    return { rating: tmpl.rating, spread, change1D, change1W, change1M, changeYTD, spreadRange52W: { low, high }, avgLife };
  });

  // ── Sector spreads ──
  const sectorSpreads: SectorSpread[] = SECTOR_NAMES.map(sector => {
    const base = SECTOR_SPREAD_BASES[sector];
    const igSpread = Math.round(jitter(base.ig, 0.10));
    const hySpread = Math.round(jitter(base.hy, 0.10));
    const change1D = Math.round(jitter(0, 1) * 4 * 10) / 10;
    const change1W = Math.round(jitter(0, 1) * 12 * 10) / 10;
    const tightest = Math.round(igSpread * (0.70 + rng() * 0.15));
    const widest = Math.round(hySpread * (1.10 + rng() * 0.25));
    return { sector, igSpread, hySpread, change1D, change1W, tightest, widest };
  });

  // ── Credit indices ──
  const igOasLevel = round2(jitter(105, 0.10));
  const hyOasLevel = round2(jitter(395, 0.08));
  const emOasLevel = round2(jitter(295, 0.10));

  const makeMetric = (level: number, changeScale: number): IndexMetric => {
    const change = round2((rng() - 0.5) * 2 * changeScale);
    const changePct = round2((change / level) * 100);
    return { level, change, changePct };
  };

  const indices: CreditIndices = {
    igOAS: makeMetric(igOasLevel, 5),
    igDuration: makeMetric(round2(jitter(7.2, 0.04)), 0.08),
    igYTW: makeMetric(round2(jitter(5.35, 0.06)), 0.05),
    hyOAS: makeMetric(hyOasLevel, 12),
    hyDuration: makeMetric(round2(jitter(3.8, 0.05)), 0.06),
    hyYTW: makeMetric(round2(jitter(8.15, 0.06)), 0.10),
    emOAS: makeMetric(emOasLevel, 8),
    emDuration: makeMetric(round2(jitter(5.5, 0.04)), 0.07),
    emYTW: makeMetric(round2(jitter(7.25, 0.06)), 0.08),
  };

  // ── Distressed debt ──
  const distressedDebt: DistressedIssuer[] = DISTRESSED_TEMPLATE.map(tmpl => ({
    issuer: tmpl.issuer,
    ticker: tmpl.ticker,
    coupon: tmpl.coupon,
    maturity: tmpl.maturity,
    price: round2(jitter(tmpl.basePrice, 0.12)),
    ytw: round2(jitter(tmpl.baseYtw, 0.08)),
    oas: Math.round(jitter(tmpl.baseOas, 0.10)),
    rating: tmpl.rating,
    sector: tmpl.sector,
  }));

  // ── New issues ──
  const now = new Date();
  const newIssues: NewIssue[] = NEW_ISSUES_TEMPLATE.map((tmpl, idx) => {
    const pricingDate = new Date(now);
    pricingDate.setDate(pricingDate.getDate() - idx - Math.floor(rng() * 3));
    return {
      issuer: tmpl.issuer,
      size: round2(jitter(tmpl.baseSize, 0.10)),
      coupon: round2(jitter(tmpl.baseCoupon, 0.04)),
      tenor: tmpl.tenor,
      spread: Math.round(jitter(tmpl.baseSpread, 0.08)),
      rating: tmpl.rating,
      bookSize: round1(jitter(tmpl.baseBook, 0.15)),
      pricingDate: pricingDate.toISOString().slice(0, 10),
    };
  });

  // ── Crossover names ──
  const crossover: CrossoverIssuer[] = CROSSOVER_TEMPLATE.map(tmpl => ({
    issuer: tmpl.issuer,
    currentRating: tmpl.currentRating,
    outlook: tmpl.outlook,
    spread: Math.round(jitter(tmpl.baseSpread, 0.08)),
    probability_downgrade: round1(jitter(tmpl.baseDowngrade, 0.20)),
    probability_upgrade: round1(jitter(tmpl.baseUpgrade, 0.20)),
  }));

  // ── Summary ──
  const igAvgSpread = Math.round(
    investmentGrade.reduce((sum, e) => sum + e.spread, 0) / investmentGrade.length,
  );
  const hyAvgSpread = Math.round(
    highYield.reduce((sum, e) => sum + e.spread, 0) / highYield.length,
  );

  const summary: CreditSpreadSummary = {
    igAvgSpread,
    hyAvgSpread,
    igHyRatio: round2(hyAvgSpread / igAvgSpread),
    emSpread: Math.round(indices.emOAS.level),
    distressedCount: distressedDebt.filter(d => d.oas > 1000).length,
    defaultRate12M: round2(jitter(3.2, 0.15)),
    recoveryRate: round1(jitter(38.5, 0.10)),
  };

  return {
    investmentGrade,
    highYield,
    sectorSpreads,
    indices,
    distressedDebt,
    newIssues,
    crossover,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[CreditSpread] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate credit spread data' });
  }
});

export default router;
