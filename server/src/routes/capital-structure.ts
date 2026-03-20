import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

type CreditRating = 'AAA' | 'AA+' | 'AA' | 'AA-' | 'A+' | 'A' | 'A-' | 'BBB+' | 'BBB' | 'BBB-' | 'BB+' | 'BB' | 'BB-' | 'B+';
type Outlook = 'Positive' | 'Stable' | 'Negative' | 'Watch Negative' | 'Watch Positive';
type Seniority = 'Secured' | 'Senior Unsecured' | 'Subordinated' | 'Junior Sub';
type Instrument = 'Term Loan' | 'Revolver' | 'Senior Notes' | 'Sub Notes' | 'Convertible';

interface CompanyProfile {
  ticker: string;
  companyName: string;
  marketCap: number;
  enterpriseValue: number;
  totalDebt: number;
  cashEquivalents: number;
  netDebt: number;
  debtToEquity: number;
  netDebtToEbitda: number;
  interestCoverage: number;
  creditRating: CreditRating;
  outlook: Outlook;
}

interface Tranche {
  seniority: Seniority;
  instrument: Instrument;
  amount: number;
  coupon: number;
  maturity: string;
  spread: number;
  rating: CreditRating;
}

interface DebtStackEntry {
  ticker: string;
  tranches: Tranche[];
}

interface MaturityBucket {
  year: string;
  totalMaturing: number;
  investmentGrade: number;
  highYield: number;
  avgCoupon: number;
}

interface CapitalStructureSummary {
  avgDebtToEquity: number;
  avgNetLeverage: number;
  avgCoverage: number;
  mostLeveraged: string;
  leastLeveraged: string;
  timestamp: string;
}

interface CapitalStructureResponse {
  companyProfiles: CompanyProfile[];
  debtStack: DebtStackEntry[];
  maturityProfile: MaturityBucket[];
  summary: CapitalStructureSummary;
}

// ── Company base data (realistic Bloomberg-grade fundamentals) ──

interface CompanyDef {
  ticker: string;
  companyName: string;
  baseMarketCap: number;   // $B
  baseTotalDebt: number;   // $B
  baseCash: number;        // $B
  baseEbitda: number;      // $B
  baseEquity: number;      // $B
  baseCreditRating: CreditRating;
}

const COMPANIES: CompanyDef[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', baseMarketCap: 2950, baseTotalDebt: 111, baseCash: 62, baseEbitda: 130, baseEquity: 62, baseCreditRating: 'AA+' },
  { ticker: 'MSFT', companyName: 'Microsoft Corp.', baseMarketCap: 2780, baseTotalDebt: 59, baseCash: 80, baseEbitda: 118, baseEquity: 206, baseCreditRating: 'AAA' },
  { ticker: 'AMZN', companyName: 'Amazon.com Inc.', baseMarketCap: 1870, baseTotalDebt: 67, baseCash: 73, baseEbitda: 85, baseEquity: 201, baseCreditRating: 'AA' },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', baseMarketCap: 570, baseTotalDebt: 412, baseCash: 26, baseEbitda: 68, baseEquity: 328, baseCreditRating: 'A+' },
  { ticker: 'GS', companyName: 'Goldman Sachs Group Inc.', baseMarketCap: 148, baseTotalDebt: 275, baseCash: 18, baseEbitda: 24, baseEquity: 116, baseCreditRating: 'A+' },
  { ticker: 'T', companyName: 'AT&T Inc.', baseMarketCap: 138, baseTotalDebt: 137, baseCash: 4.8, baseEbitda: 43, baseEquity: 97, baseCreditRating: 'BBB' },
  { ticker: 'VZ', companyName: 'Verizon Communications Inc.', baseMarketCap: 170, baseTotalDebt: 150, baseCash: 4.1, baseEbitda: 48, baseEquity: 96, baseCreditRating: 'BBB+' },
  { ticker: 'BA', companyName: 'The Boeing Co.', baseMarketCap: 128, baseTotalDebt: 53, baseCash: 12, baseEbitda: 5.2, baseEquity: -17, baseCreditRating: 'BBB-' },
  { ticker: 'F', companyName: 'Ford Motor Co.', baseMarketCap: 48, baseTotalDebt: 101, baseCash: 25, baseEbitda: 18, baseEquity: 42, baseCreditRating: 'BBB-' },
  { ticker: 'XOM', companyName: 'Exxon Mobil Corp.', baseMarketCap: 460, baseTotalDebt: 40, baseCash: 22, baseEbitda: 72, baseEquity: 204, baseCreditRating: 'AA-' },
];

const DEBT_STACK_TICKERS = ['JPM', 'T', 'BA', 'F', 'XOM'];

const OUTLOOKS: Outlook[] = ['Positive', 'Stable', 'Negative', 'Watch Negative', 'Watch Positive'];

const RATING_SCALE: CreditRating[] = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+'];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 - pct + rng() * 2 * pct);
}

function ratingIndex(r: CreditRating): number {
  return RATING_SCALE.indexOf(r);
}

function isInvestmentGrade(r: CreditRating): boolean {
  return ratingIndex(r) <= ratingIndex('BBB-');
}

function notchRating(base: CreditRating, delta: number): CreditRating {
  const idx = ratingIndex(base);
  const newIdx = Math.max(0, Math.min(RATING_SCALE.length - 1, idx + delta));
  return RATING_SCALE[newIdx];
}

// ── Generation logic ──

function generateCompanyProfiles(rng: () => number): CompanyProfile[] {
  return COMPANIES.map(co => {
    const marketCap = round1(jitter(co.baseMarketCap, 0.04, rng));
    const totalDebt = round1(jitter(co.baseTotalDebt, 0.05, rng));
    const cashEquivalents = round1(jitter(co.baseCash, 0.08, rng));
    const netDebt = round1(totalDebt - cashEquivalents);
    const ebitda = jitter(co.baseEbitda, 0.06, rng);
    const equity = co.baseEquity < 0
      ? round1(co.baseEquity * (1 + (rng() - 0.5) * 0.15))
      : round1(jitter(co.baseEquity, 0.05, rng));

    const debtToEquity = equity > 0
      ? round1((totalDebt / equity) * 100)
      : round1(-999.9); // Negative equity case (Boeing)
    const netDebtToEbitda = round2(netDebt / ebitda);
    const interestCoverage = round1(ebitda / (totalDebt * (0.03 + rng() * 0.02)));

    const enterpriseValue = round1(marketCap + netDebt);

    // Credit rating: base +/- 0-1 notch from daily seed
    const notchDelta = Math.floor(rng() * 3) - 1; // -1, 0, or +1
    const creditRating = notchRating(co.baseCreditRating, notchDelta);

    // Outlook: Stable is most common
    const outlookWeights: Outlook[] = ['Stable', 'Stable', 'Stable', 'Stable', 'Positive', 'Negative', 'Watch Negative', 'Watch Positive'];
    const outlook = pick(outlookWeights, rng);

    return {
      ticker: co.ticker,
      companyName: co.companyName,
      marketCap,
      enterpriseValue,
      totalDebt,
      cashEquivalents,
      netDebt,
      debtToEquity,
      netDebtToEbitda,
      interestCoverage,
      creditRating,
      outlook,
    };
  });
}

function generateDebtStack(rng: () => number, profiles: CompanyProfile[]): DebtStackEntry[] {
  return DEBT_STACK_TICKERS.map(ticker => {
    const profile = profiles.find(p => p.ticker === ticker)!;
    const co = COMPANIES.find(c => c.ticker === ticker)!;
    const totalDebt = profile.totalDebt;
    const baseRating = profile.creditRating;
    const baseRatingIdx = ratingIndex(baseRating);
    const today = new Date();

    // Debt stack structure varies by company type
    const tranches: Tranche[] = [];
    let allocated = 0;

    if (ticker === 'JPM' || ticker === 'GS') {
      // Banks: large senior unsecured notes program, some sub debt
      const seniorPct = 0.55 + rng() * 0.10;
      const subPct = 0.20 + rng() * 0.05;
      const juniorPct = 1 - seniorPct - subPct;

      // Senior Notes - multiple tranches
      for (let i = 0; i < 3; i++) {
        const pctOfSenior = (i === 0 ? 0.40 : i === 1 ? 0.35 : 0.25);
        const amount = round1(totalDebt * seniorPct * pctOfSenior);
        const yearsOut = 2 + Math.floor(rng() * 8);
        const maturityDate = new Date(today);
        maturityDate.setFullYear(maturityDate.getFullYear() + yearsOut);
        const coupon = round2(3.5 + rng() * 2.5);
        const spread = Math.round(80 + rng() * 100);
        tranches.push({
          seniority: 'Senior Unsecured',
          instrument: 'Senior Notes',
          amount,
          coupon,
          maturity: maturityDate.toISOString().slice(0, 10),
          spread,
          rating: notchRating(baseRating, 0),
        });
        allocated += amount;
      }

      // Subordinated Notes
      for (let i = 0; i < 2; i++) {
        const pctOfSub = i === 0 ? 0.55 : 0.45;
        const amount = round1(totalDebt * subPct * pctOfSub);
        const yearsOut = 5 + Math.floor(rng() * 10);
        const maturityDate = new Date(today);
        maturityDate.setFullYear(maturityDate.getFullYear() + yearsOut);
        const coupon = round2(4.5 + rng() * 2.0);
        const spread = Math.round(150 + rng() * 120);
        tranches.push({
          seniority: 'Subordinated',
          instrument: 'Sub Notes',
          amount,
          coupon,
          maturity: maturityDate.toISOString().slice(0, 10),
          spread,
          rating: notchRating(baseRating, 2),
        });
        allocated += amount;
      }

      // Junior Subordinated
      const juniorAmount = round1(totalDebt * juniorPct);
      const juniorYears = 10 + Math.floor(rng() * 20);
      const juniorMaturity = new Date(today);
      juniorMaturity.setFullYear(juniorMaturity.getFullYear() + juniorYears);
      tranches.push({
        seniority: 'Junior Sub',
        instrument: 'Sub Notes',
        amount: juniorAmount,
        coupon: round2(5.5 + rng() * 2.5),
        maturity: juniorMaturity.toISOString().slice(0, 10),
        spread: Math.round(250 + rng() * 150),
        rating: notchRating(baseRating, 3),
      });
    } else if (ticker === 'T' || ticker === 'VZ') {
      // Telecoms: heavy senior unsecured, some secured term loans
      const securedPct = 0.10 + rng() * 0.08;
      const seniorPct = 0.75 + rng() * 0.08;
      const subPct = 1 - securedPct - seniorPct;

      // Secured Term Loan
      const securedAmount = round1(totalDebt * securedPct);
      const securedYears = 3 + Math.floor(rng() * 4);
      const securedMaturity = new Date(today);
      securedMaturity.setFullYear(securedMaturity.getFullYear() + securedYears);
      tranches.push({
        seniority: 'Secured',
        instrument: 'Term Loan',
        amount: securedAmount,
        coupon: round2(2.5 + rng() * 1.8),
        maturity: securedMaturity.toISOString().slice(0, 10),
        spread: Math.round(125 + rng() * 75),
        rating: notchRating(baseRating, -1),
      });

      // Senior Notes - multiple tranches
      for (let i = 0; i < 4; i++) {
        const pctOfSenior = [0.30, 0.28, 0.22, 0.20][i];
        const amount = round1(totalDebt * seniorPct * pctOfSenior);
        const yearsOut = 2 + i * 3 + Math.floor(rng() * 3);
        const maturityDate = new Date(today);
        maturityDate.setFullYear(maturityDate.getFullYear() + yearsOut);
        const coupon = round2(3.8 + rng() * 2.8 + i * 0.3);
        const spread = Math.round(110 + rng() * 90 + i * 20);
        tranches.push({
          seniority: 'Senior Unsecured',
          instrument: 'Senior Notes',
          amount,
          coupon,
          maturity: maturityDate.toISOString().slice(0, 10),
          spread,
          rating: notchRating(baseRating, 0),
        });
      }

      // Subordinated
      const subAmount = round1(totalDebt * subPct);
      const subYears = 8 + Math.floor(rng() * 12);
      const subMaturity = new Date(today);
      subMaturity.setFullYear(subMaturity.getFullYear() + subYears);
      tranches.push({
        seniority: 'Subordinated',
        instrument: 'Sub Notes',
        amount: subAmount,
        coupon: round2(5.0 + rng() * 2.0),
        maturity: subMaturity.toISOString().slice(0, 10),
        spread: Math.round(200 + rng() * 130),
        rating: notchRating(baseRating, 2),
      });
    } else if (ticker === 'BA') {
      // Boeing: stressed issuer, mix of secured and unsecured
      const securedPct = 0.20 + rng() * 0.10;
      const seniorPct = 0.50 + rng() * 0.10;
      const convertPct = 0.08 + rng() * 0.05;
      const subPct = 1 - securedPct - seniorPct - convertPct;

      // Secured - Revolver
      const revolverAmount = round1(totalDebt * securedPct * 0.40);
      const revolverYears = 2 + Math.floor(rng() * 3);
      const revolverMaturity = new Date(today);
      revolverMaturity.setFullYear(revolverMaturity.getFullYear() + revolverYears);
      tranches.push({
        seniority: 'Secured',
        instrument: 'Revolver',
        amount: revolverAmount,
        coupon: round2(4.0 + rng() * 1.5),
        maturity: revolverMaturity.toISOString().slice(0, 10),
        spread: Math.round(200 + rng() * 100),
        rating: notchRating(baseRating, -1),
      });

      // Secured - Term Loan
      const termAmount = round1(totalDebt * securedPct * 0.60);
      const termYears = 3 + Math.floor(rng() * 4);
      const termMaturity = new Date(today);
      termMaturity.setFullYear(termMaturity.getFullYear() + termYears);
      tranches.push({
        seniority: 'Secured',
        instrument: 'Term Loan',
        amount: termAmount,
        coupon: round2(4.5 + rng() * 2.0),
        maturity: termMaturity.toISOString().slice(0, 10),
        spread: Math.round(225 + rng() * 125),
        rating: notchRating(baseRating, -1),
      });

      // Senior Notes
      for (let i = 0; i < 3; i++) {
        const pctOfSenior = [0.40, 0.35, 0.25][i];
        const amount = round1(totalDebt * seniorPct * pctOfSenior);
        const yearsOut = 3 + i * 3 + Math.floor(rng() * 3);
        const maturityDate = new Date(today);
        maturityDate.setFullYear(maturityDate.getFullYear() + yearsOut);
        const coupon = round2(5.0 + rng() * 2.5 + i * 0.3);
        const spread = Math.round(250 + rng() * 150 + i * 25);
        tranches.push({
          seniority: 'Senior Unsecured',
          instrument: 'Senior Notes',
          amount,
          coupon,
          maturity: maturityDate.toISOString().slice(0, 10),
          spread,
          rating: notchRating(baseRating, 0),
        });
      }

      // Convertible
      const convertAmount = round1(totalDebt * convertPct);
      const convertYears = 4 + Math.floor(rng() * 4);
      const convertMaturity = new Date(today);
      convertMaturity.setFullYear(convertMaturity.getFullYear() + convertYears);
      tranches.push({
        seniority: 'Senior Unsecured',
        instrument: 'Convertible',
        amount: convertAmount,
        coupon: round2(2.0 + rng() * 2.5),
        maturity: convertMaturity.toISOString().slice(0, 10),
        spread: Math.round(150 + rng() * 100),
        rating: notchRating(baseRating, 0),
      });

      // Subordinated
      const subAmount = round1(totalDebt * subPct);
      const subYears = 7 + Math.floor(rng() * 8);
      const subMaturity = new Date(today);
      subMaturity.setFullYear(subMaturity.getFullYear() + subYears);
      tranches.push({
        seniority: 'Subordinated',
        instrument: 'Sub Notes',
        amount: subAmount,
        coupon: round2(6.5 + rng() * 2.5),
        maturity: subMaturity.toISOString().slice(0, 10),
        spread: Math.round(350 + rng() * 200),
        rating: notchRating(baseRating, 2),
      });
    } else if (ticker === 'F') {
      // Ford: auto manufacturer, secured lending + unsecured bonds
      const securedPct = 0.25 + rng() * 0.10;
      const seniorPct = 0.50 + rng() * 0.08;
      const convertPct = 0.05 + rng() * 0.04;
      const subPct = 1 - securedPct - seniorPct - convertPct;

      // Secured Term Loan
      const securedAmount = round1(totalDebt * securedPct);
      const securedYears = 3 + Math.floor(rng() * 4);
      const securedMaturity = new Date(today);
      securedMaturity.setFullYear(securedMaturity.getFullYear() + securedYears);
      tranches.push({
        seniority: 'Secured',
        instrument: 'Term Loan',
        amount: securedAmount,
        coupon: round2(4.0 + rng() * 2.0),
        maturity: securedMaturity.toISOString().slice(0, 10),
        spread: Math.round(175 + rng() * 100),
        rating: notchRating(baseRating, -1),
      });

      // Secured Revolver
      const revolverAmount = round1(totalDebt * 0.08);
      const revolverYears = 2 + Math.floor(rng() * 3);
      const revolverMaturity = new Date(today);
      revolverMaturity.setFullYear(revolverMaturity.getFullYear() + revolverYears);
      tranches.push({
        seniority: 'Secured',
        instrument: 'Revolver',
        amount: revolverAmount,
        coupon: round2(3.5 + rng() * 1.5),
        maturity: revolverMaturity.toISOString().slice(0, 10),
        spread: Math.round(150 + rng() * 75),
        rating: notchRating(baseRating, -1),
      });

      // Senior Notes
      for (let i = 0; i < 3; i++) {
        const pctOfSenior = [0.40, 0.35, 0.25][i];
        const amount = round1(totalDebt * seniorPct * pctOfSenior);
        const yearsOut = 2 + i * 3 + Math.floor(rng() * 3);
        const maturityDate = new Date(today);
        maturityDate.setFullYear(maturityDate.getFullYear() + yearsOut);
        const coupon = round2(4.5 + rng() * 2.5 + i * 0.25);
        const spread = Math.round(190 + rng() * 120 + i * 20);
        tranches.push({
          seniority: 'Senior Unsecured',
          instrument: 'Senior Notes',
          amount,
          coupon,
          maturity: maturityDate.toISOString().slice(0, 10),
          spread,
          rating: notchRating(baseRating, 0),
        });
      }

      // Convertible
      const convertAmount = round1(totalDebt * convertPct);
      const convertYears = 3 + Math.floor(rng() * 5);
      const convertMaturity = new Date(today);
      convertMaturity.setFullYear(convertMaturity.getFullYear() + convertYears);
      tranches.push({
        seniority: 'Senior Unsecured',
        instrument: 'Convertible',
        amount: convertAmount,
        coupon: round2(2.5 + rng() * 2.0),
        maturity: convertMaturity.toISOString().slice(0, 10),
        spread: Math.round(130 + rng() * 90),
        rating: notchRating(baseRating, 0),
      });

      // Subordinated
      const subAmount = round1(totalDebt * subPct);
      const subYears = 7 + Math.floor(rng() * 10);
      const subMaturity = new Date(today);
      subMaturity.setFullYear(subMaturity.getFullYear() + subYears);
      tranches.push({
        seniority: 'Subordinated',
        instrument: 'Sub Notes',
        amount: subAmount,
        coupon: round2(6.0 + rng() * 2.5),
        maturity: subMaturity.toISOString().slice(0, 10),
        spread: Math.round(300 + rng() * 175),
        rating: notchRating(baseRating, 2),
      });
    } else {
      // XOM: strong IG issuer, mostly senior unsecured
      const seniorPct = 0.80 + rng() * 0.08;
      const subPct = 1 - seniorPct;

      // Senior Notes - 4 tranches across the curve
      for (let i = 0; i < 4; i++) {
        const pctOfSenior = [0.30, 0.28, 0.22, 0.20][i];
        const amount = round1(totalDebt * seniorPct * pctOfSenior);
        const yearsOut = 2 + i * 4 + Math.floor(rng() * 3);
        const maturityDate = new Date(today);
        maturityDate.setFullYear(maturityDate.getFullYear() + yearsOut);
        const coupon = round2(2.8 + rng() * 1.8 + i * 0.4);
        const spread = Math.round(50 + rng() * 60 + i * 15);
        tranches.push({
          seniority: 'Senior Unsecured',
          instrument: 'Senior Notes',
          amount,
          coupon,
          maturity: maturityDate.toISOString().slice(0, 10),
          spread,
          rating: notchRating(baseRating, 0),
        });
      }

      // Subordinated
      const subAmount = round1(totalDebt * subPct);
      const subYears = 10 + Math.floor(rng() * 15);
      const subMaturity = new Date(today);
      subMaturity.setFullYear(subMaturity.getFullYear() + subYears);
      tranches.push({
        seniority: 'Subordinated',
        instrument: 'Sub Notes',
        amount: subAmount,
        coupon: round2(4.0 + rng() * 1.5),
        maturity: subMaturity.toISOString().slice(0, 10),
        spread: Math.round(120 + rng() * 80),
        rating: notchRating(baseRating, 2),
      });
    }

    // Sort tranches by seniority (Secured > Senior Unsecured > Subordinated > Junior Sub)
    const seniorityOrder: Record<Seniority, number> = { 'Secured': 0, 'Senior Unsecured': 1, 'Subordinated': 2, 'Junior Sub': 3 };
    tranches.sort((a, b) => seniorityOrder[a.seniority] - seniorityOrder[b.seniority]);

    return { ticker, tranches };
  });
}

function generateMaturityProfile(rng: () => number, profiles: CompanyProfile[]): MaturityBucket[] {
  const currentYear = new Date().getFullYear();
  const years = ['2024', '2025', '2026', '2027', '2028', '2029', '2030+'];
  const buckets: MaturityBucket[] = [];

  // Total debt pool across all 10 companies
  const totalDebtPool = profiles.reduce((sum, p) => sum + p.totalDebt, 0);

  // Distribute debt across maturity years with a realistic profile
  // Nearer years have more maturing (refinancing wall), tails off into 2030+
  const yearWeights = [0.08, 0.12, 0.16, 0.18, 0.15, 0.13, 0.18];

  for (let i = 0; i < years.length; i++) {
    const weight = yearWeights[i] * (0.90 + rng() * 0.20);
    const totalMaturing = round1(totalDebtPool * weight);

    // IG vs HY split: most of this universe is IG
    const igRatio = 0.70 + rng() * 0.15;
    const investmentGrade = round1(totalMaturing * igRatio);
    const highYield = round1(totalMaturing * (1 - igRatio));

    // Average coupon: rises with maturity
    const baseCoupon = 3.5 + i * 0.25 + (rng() - 0.5) * 0.6;
    const avgCoupon = round2(baseCoupon);

    buckets.push({
      year: years[i],
      totalMaturing,
      investmentGrade,
      highYield,
      avgCoupon,
    });
  }

  return buckets;
}

function generateSummary(profiles: CompanyProfile[]): CapitalStructureSummary {
  // Filter out negative equity (Boeing) for meaningful average D/E
  const positiveEquityProfiles = profiles.filter(p => p.debtToEquity > 0);
  const avgDebtToEquity = round1(
    positiveEquityProfiles.reduce((sum, p) => sum + p.debtToEquity, 0) / positiveEquityProfiles.length
  );

  const avgNetLeverage = round2(
    profiles.reduce((sum, p) => sum + p.netDebtToEbitda, 0) / profiles.length
  );

  const avgCoverage = round1(
    profiles.reduce((sum, p) => sum + p.interestCoverage, 0) / profiles.length
  );

  // Most leveraged: highest net debt / EBITDA (excluding negative equity edge cases)
  const sorted = [...profiles].sort((a, b) => b.netDebtToEbitda - a.netDebtToEbitda);
  const mostLeveraged = sorted[0].ticker;
  const leastLeveraged = sorted[sorted.length - 1].ticker;

  return {
    avgDebtToEquity,
    avgNetLeverage,
    avgCoverage,
    mostLeveraged,
    leastLeveraged,
    timestamp: new Date().toISOString(),
  };
}

function buildCapitalStructureData(): CapitalStructureResponse {
  const rng = seededRandom('capital-structure');

  const companyProfiles = generateCompanyProfiles(rng);
  const debtStack = generateDebtStack(rng, companyProfiles);
  const maturityProfile = generateMaturityProfile(rng, companyProfiles);
  const summary = generateSummary(companyProfiles);

  return { companyProfiles, debtStack, maturityProfile, summary };
}

// ── Cache ──

let cachedData: { data: CapitalStructureResponse; ts: number } | null = null;
let staleData: CapitalStructureResponse | null = null;
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cachedData.ts < CACHE_TTL) {
      res.json(cachedData.data);
      return;
    }

    // Generate fresh data
    const data = buildCapitalStructureData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[CapitalStructure] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate capital structure data' });
  }
});

export default router;
