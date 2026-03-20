import { Router } from 'express';

const router = Router();

// -- Types --

interface ABSCategory {
  type: string;
  spread: number;
  change1W: number;
  yield: number;
  aum: number;
  delinquencyRate: number;
  prepaymentRate: number;
}

interface MBSBond {
  coupon: number;
  price: number;
  spread: number;
  oas: number;
  duration: number;
  prepaymentSpeed: number;
}

interface NonAgencyMBS {
  price: number;
  spread: number;
  delinquencyRate: number;
}

interface MBSMarket {
  agency30Y: MBSBond;
  agency15Y: MBSBond;
  gnma30Y: MBSBond;
  nonAgency: NonAgencyMBS;
}

interface Issuance {
  issuer: string;
  type: string;
  size: number;
  tranche: string;
  rating: string;
  spread: number;
  wal: number;
  collateralType: string;
}

interface PerformanceMetric {
  type: string;
  totalReturn1M: number;
  totalReturn3M: number;
  totalReturnYTD: number;
  volatility: number;
  sharpe: number;
}

interface RiskIndicators {
  cmbsDelinquency: number;
  autoDelinquency60D: number;
  creditCardChargeOff: number;
  studentLoanDefault: number;
  mortgageDelinquency: number;
  cloDefaultRate: number;
}

interface TrancheAnalysis {
  tranche: string;
  typicalSpread: number;
  subordination: number;
  expectedLoss: number;
  rating: string;
}

interface Summary {
  totalABSOutstanding: number;
  ytdIssuance: number;
  avgSpread: number;
  spreadTrend: string;
  riskLevel: string;
}

interface StructuredProductData {
  absMarket: ABSCategory[];
  mbsMarket: MBSMarket;
  recentIssuance: Issuance[];
  performanceMetrics: PerformanceMetric[];
  riskIndicators: RiskIndicators;
  trancheAnalysis: TrancheAnalysis[];
  summary: Summary;
  generatedAt: string;
}

// -- Seeded PRNG --

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: StructuredProductData; ts: number } | null = null;

// -- Helpers --

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

// -- Generator --

function generate(): StructuredProductData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-structured-product'));

  // 1. ABS Market — 8 categories with realistic spread levels
  const absSeeds = [
    { type: 'Auto ABS',         spreadBase: 65,  yieldBase: 5.15, aumBase: 310,  delBase: 3.80, prepayBase: 1.45 },
    { type: 'Credit Card ABS',  spreadBase: 55,  yieldBase: 5.05, aumBase: 185,  delBase: 2.50, prepayBase: 18.5 },
    { type: 'Student Loan ABS', spreadBase: 95,  yieldBase: 5.45, aumBase: 145,  delBase: 5.20, prepayBase: 6.80 },
    { type: 'CLO AAA',          spreadBase: 130, yieldBase: 5.80, aumBase: 980,  delBase: 0.35, prepayBase: 0.00 },
    { type: 'CLO BBB',          spreadBase: 450, yieldBase: 9.00, aumBase: 180,  delBase: 0.48, prepayBase: 0.00 },
    { type: 'CLO Equity',       spreadBase: 1100, yieldBase: 15.5, aumBase: 65,  delBase: 0.52, prepayBase: 0.00 },
    { type: 'CMBS',             spreadBase: 90,  yieldBase: 5.40, aumBase: 620,  delBase: 4.80, prepayBase: 3.20 },
    { type: 'RMBS',             spreadBase: 72,  yieldBase: 5.22, aumBase: 8900, delBase: 2.10, prepayBase: 8.50 },
  ];

  const absMarket: ABSCategory[] = absSeeds.map(s => ({
    type: s.type,
    spread: round(jitter(s.spreadBase, 0.06, rng), 0),
    change1W: round((rng() - 0.48) * s.spreadBase * 0.04, 1),
    yield: round(jitter(s.yieldBase, 0.03, rng), 2),
    aum: round(jitter(s.aumBase, 0.04, rng), 1),
    delinquencyRate: round(jitter(s.delBase, 0.08, rng), 2),
    prepaymentRate: round(jitter(s.prepayBase, 0.10, rng), 2),
  }));

  // 2. MBS Market — agency and non-agency bonds
  const agency30Y: MBSBond = {
    coupon: round(jitter(5.50, 0.02, rng), 3),
    price: round(jitter(99.25, 0.005, rng), 4),
    spread: round(jitter(68, 0.06, rng), 0),
    oas: round(jitter(125, 0.05, rng), 0),
    duration: round(jitter(6.2, 0.04, rng), 2),
    prepaymentSpeed: round(jitter(8.2, 0.08, rng), 1),
  };

  const agency15Y: MBSBond = {
    coupon: round(jitter(4.75, 0.02, rng), 3),
    price: round(jitter(100.12, 0.005, rng), 4),
    spread: round(jitter(52, 0.06, rng), 0),
    oas: round(jitter(105, 0.05, rng), 0),
    duration: round(jitter(4.1, 0.04, rng), 2),
    prepaymentSpeed: round(jitter(12.5, 0.08, rng), 1),
  };

  const gnma30Y: MBSBond = {
    coupon: round(jitter(5.50, 0.02, rng), 3),
    price: round(jitter(99.50, 0.005, rng), 4),
    spread: round(jitter(82, 0.06, rng), 0),
    oas: round(jitter(140, 0.05, rng), 0),
    duration: round(jitter(5.8, 0.04, rng), 2),
    prepaymentSpeed: round(jitter(9.5, 0.08, rng), 1),
  };

  const nonAgency: NonAgencyMBS = {
    price: round(jitter(96.75, 0.01, rng), 4),
    spread: round(jitter(185, 0.06, rng), 0),
    delinquencyRate: round(jitter(5.8, 0.08, rng), 2),
  };

  const mbsMarket: MBSMarket = { agency30Y, agency15Y, gnma30Y, nonAgency };

  // 3. Recent Issuance — 10 deals
  const issuers = [
    'JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Citigroup',
    'Wells Fargo', 'Bank of America', 'Barclays', 'Deutsche Bank',
    'Ally Financial', 'Capital One', 'Ford Motor Credit', 'CarMax Auto',
  ] as const;
  const issuanceTypes = ['Auto ABS', 'Credit Card ABS', 'CLO', 'CMBS', 'RMBS', 'Student Loan ABS'] as const;
  const tranches = ['AAA', 'AA', 'A', 'BBB', 'Senior', 'Mezzanine'] as const;
  const ratings = ['Aaa/AAA', 'Aa2/AA', 'A2/A', 'Baa2/BBB', 'Aa1/AA+', 'A1/A+'] as const;
  const collateralTypes = ['Prime Auto', 'Subprime Auto', 'Credit Card Receivables', 'Broadly Syndicated Loans', 'Commercial Mortgage', 'Residential Mortgage', 'FFELP Student Loans', 'Private Student Loans', 'Equipment Leases', 'Container Leases'] as const;

  const issuanceSeeds = [
    { issuer: 0,  typeIdx: 0, sizeBase: 1250, trancheIdx: 0, ratingIdx: 0, spreadBase: 62,  walBase: 2.4, colIdx: 0 },
    { issuer: 4,  typeIdx: 1, sizeBase: 875,  trancheIdx: 0, ratingIdx: 0, spreadBase: 48,  walBase: 1.8, colIdx: 2 },
    { issuer: 1,  typeIdx: 2, sizeBase: 520,  trancheIdx: 0, ratingIdx: 0, spreadBase: 132, walBase: 4.8, colIdx: 3 },
    { issuer: 2,  typeIdx: 3, sizeBase: 1120, trancheIdx: 4, ratingIdx: 0, spreadBase: 88,  walBase: 5.2, colIdx: 4 },
    { issuer: 3,  typeIdx: 4, sizeBase: 1850, trancheIdx: 0, ratingIdx: 0, spreadBase: 58,  walBase: 6.1, colIdx: 5 },
    { issuer: 10, typeIdx: 0, sizeBase: 680,  trancheIdx: 1, ratingIdx: 1, spreadBase: 95,  walBase: 3.1, colIdx: 1 },
    { issuer: 9,  typeIdx: 1, sizeBase: 950,  trancheIdx: 0, ratingIdx: 0, spreadBase: 52,  walBase: 1.5, colIdx: 2 },
    { issuer: 5,  typeIdx: 5, sizeBase: 720,  trancheIdx: 0, ratingIdx: 0, spreadBase: 78,  walBase: 5.5, colIdx: 6 },
    { issuer: 7,  typeIdx: 2, sizeBase: 610,  trancheIdx: 2, ratingIdx: 2, spreadBase: 275, walBase: 7.5, colIdx: 3 },
    { issuer: 6,  typeIdx: 3, sizeBase: 980,  trancheIdx: 5, ratingIdx: 3, spreadBase: 340, walBase: 8.2, colIdx: 4 },
  ];

  const recentIssuance: Issuance[] = issuanceSeeds.map(s => ({
    issuer: issuers[s.issuer],
    type: issuanceTypes[s.typeIdx],
    size: round(jitter(s.sizeBase, 0.08, rng), 0),
    tranche: tranches[s.trancheIdx],
    rating: ratings[s.ratingIdx],
    spread: round(jitter(s.spreadBase, 0.06, rng), 0),
    wal: round(jitter(s.walBase, 0.05, rng), 1),
    collateralType: collateralTypes[s.colIdx],
  }));

  // 4. Performance Metrics — 6 product types
  const perfSeeds = [
    { type: 'Agency MBS',     ret1M: 0.35,  ret3M: 1.10,  retYTD: 2.80,  volBase: 3.2,  sharpeBase: 1.15 },
    { type: 'Non-Agency RMBS', ret1M: 0.52, ret3M: 1.65,  retYTD: 4.20,  volBase: 4.8,  sharpeBase: 1.05 },
    { type: 'CMBS',           ret1M: 0.28,  ret3M: 0.95,  retYTD: 2.45,  volBase: 3.8,  sharpeBase: 0.92 },
    { type: 'CLO',            ret1M: 0.65,  ret3M: 2.10,  retYTD: 5.15,  volBase: 5.2,  sharpeBase: 1.22 },
    { type: 'Auto ABS',      ret1M: 0.18,  ret3M: 0.55,  retYTD: 1.60,  volBase: 1.5,  sharpeBase: 1.35 },
    { type: 'Credit Card ABS', ret1M: 0.15, ret3M: 0.48,  retYTD: 1.40,  volBase: 1.2,  sharpeBase: 1.42 },
  ];

  const performanceMetrics: PerformanceMetric[] = perfSeeds.map(s => ({
    type: s.type,
    totalReturn1M: round(jitter(s.ret1M, 0.15, rng), 2),
    totalReturn3M: round(jitter(s.ret3M, 0.10, rng), 2),
    totalReturnYTD: round(jitter(s.retYTD, 0.08, rng), 2),
    volatility: round(jitter(s.volBase, 0.06, rng), 2),
    sharpe: round(jitter(s.sharpeBase, 0.08, rng), 2),
  }));

  // 5. Risk Indicators
  const riskIndicators: RiskIndicators = {
    cmbsDelinquency: round(jitter(4.80, 0.08, rng), 2),
    autoDelinquency60D: round(jitter(3.80, 0.08, rng), 2),
    creditCardChargeOff: round(jitter(3.65, 0.08, rng), 2),
    studentLoanDefault: round(jitter(5.20, 0.08, rng), 2),
    mortgageDelinquency: round(jitter(2.10, 0.08, rng), 2),
    cloDefaultRate: round(jitter(0.42, 0.10, rng), 2),
  };

  // 6. Tranche Analysis — capital structure waterfall
  const trancheSeeds = [
    { tranche: 'AAA',   spreadBase: 130,  subBase: 30.0,  elBase: 0.01,  rating: 'Aaa/AAA' },
    { tranche: 'AA',    spreadBase: 195,  subBase: 22.0,  elBase: 0.05,  rating: 'Aa2/AA' },
    { tranche: 'A',     spreadBase: 270,  subBase: 15.0,  elBase: 0.15,  rating: 'A2/A' },
    { tranche: 'BBB',   spreadBase: 440,  subBase: 10.0,  elBase: 0.55,  rating: 'Baa2/BBB' },
    { tranche: 'BB',    spreadBase: 780,  subBase: 6.0,   elBase: 2.20,  rating: 'Ba2/BB' },
    { tranche: 'Equity', spreadBase: 1200, subBase: 0.0,  elBase: 8.50,  rating: 'NR' },
  ];

  const trancheAnalysis: TrancheAnalysis[] = trancheSeeds.map(s => ({
    tranche: s.tranche,
    typicalSpread: round(jitter(s.spreadBase, 0.05, rng), 0),
    subordination: round(jitter(s.subBase, 0.04, rng), 1),
    expectedLoss: round(jitter(s.elBase, 0.10, rng), 2),
    rating: s.rating,
  }));

  // 7. Summary
  const avgSpread = round(absMarket.reduce((a, c) => a + c.spread, 0) / absMarket.length, 0);
  const trendOptions = ['tightening', 'widening', 'stable'] as const;
  const riskOptions = ['low', 'moderate', 'elevated'] as const;

  // Determine spread trend based on average 1W change
  const avg1WChange = absMarket.reduce((a, c) => a + c.change1W, 0) / absMarket.length;
  const spreadTrend = avg1WChange < -1 ? 'tightening' : avg1WChange > 1 ? 'widening' : 'stable';

  // Risk level based on delinquency indicators
  const avgDelinquency = (riskIndicators.cmbsDelinquency + riskIndicators.autoDelinquency60D +
    riskIndicators.creditCardChargeOff + riskIndicators.studentLoanDefault +
    riskIndicators.mortgageDelinquency) / 5;
  const riskLevel = avgDelinquency < 3.0 ? 'low' : avgDelinquency > 4.5 ? 'elevated' : 'moderate';

  const summary: Summary = {
    totalABSOutstanding: round(jitter(14.2, 0.03, rng), 1),
    ytdIssuance: round(jitter(485, 0.06, rng), 1),
    avgSpread,
    spreadTrend,
    riskLevel,
  };

  return {
    absMarket,
    mbsMarket,
    recentIssuance,
    performanceMetrics,
    riskIndicators,
    trancheAnalysis,
    summary,
    generatedAt: new Date().toISOString(),
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
    console.error('[StructuredProduct] Error:', (err as Error)?.message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate structured product data' });
  }
});

export default router;
