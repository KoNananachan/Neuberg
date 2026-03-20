import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

type FormType = '10-K' | '10-Q' | '8-K' | 'S-1' | 'DEF 14A' | '13F' | 'SC 13D';

interface RecentFiling {
  ticker: string;
  companyName: string;
  formType: FormType;
  filingDate: string;
  description: string;
  link: string;
  material: boolean;
}

interface EarningsFiling {
  ticker: string;
  companyName: string;
  formType: '10-K' | '10-Q';
  filingDeadline: string;
  fiscalPeriod: string;
}

interface Form13FFiling {
  filerName: string;
  aum: number;
  topNewPositions: string[];
  topExits: string[];
  filingDate: string;
  quarter: string;
}

interface Form4Filing {
  ticker: string;
  companyName: string;
  insiderName: string;
  title: string;
  transactionType: 'Purchase' | 'Sale' | 'Option Exercise' | 'Gift';
  shares: number;
  price: number;
  value: number;
}

interface ProxyFiling {
  ticker: string;
  companyName: string;
  filingDate: string;
  keyProposals: string[];
}

interface IPOFiling {
  companyName: string;
  sector: string;
  sizeRange: string;
  leadUnderwriters: string[];
  status: 'Filed' | 'Amended' | 'Effective' | 'Withdrawn';
}

interface EnforcementAction {
  respondent: string;
  violationType: string;
  penalty: number;
  date: string;
}

interface FormTypeCount {
  formType: string;
  dailyCount: number;
  weeklyCount: number;
}

interface LateFilingAlert {
  ticker: string;
  companyName: string;
  formType: string;
  deadline: string;
  daysLate: number;
}

interface FilingStatistics {
  formTypeCounts: FormTypeCount[];
  lateFilingAlerts: LateFilingAlert[];
}

interface RegulatoryFilingResponse {
  recentFilings: RecentFiling[];
  earningsFilings: EarningsFiling[];
  form13F: Form13FFiling[];
  form4Filings: Form4Filing[];
  proxyFilings: ProxyFiling[];
  ipoFilings: IPOFiling[];
  enforcementActions: EnforcementAction[];
  filingStatistics: FilingStatistics;
  timestamp: string;
}

// ── Cache ──

let cache: { data: RegulatoryFilingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Recent filings configuration ──

interface RecentFilingConfig {
  ticker: string;
  companyName: string;
  formType: FormType;
  description: string;
  materialProbability: number;
}

const RECENT_FILING_CONFIGS: RecentFilingConfig[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', formType: '10-K', description: 'Annual report for fiscal year ended September 2025', materialProbability: 0.9 },
  { ticker: 'MSFT', companyName: 'Microsoft Corporation', formType: '10-Q', description: 'Quarterly report for Q2 FY2026', materialProbability: 0.7 },
  { ticker: 'TSLA', companyName: 'Tesla Inc.', formType: '8-K', description: 'Current report - CEO compensation restructuring', materialProbability: 0.85 },
  { ticker: 'NVDA', companyName: 'NVIDIA Corporation', formType: '10-Q', description: 'Quarterly report for fiscal Q4 2026', materialProbability: 0.8 },
  { ticker: 'AMZN', companyName: 'Amazon.com Inc.', formType: '8-K', description: 'Current report - Acquisition of logistics subsidiary', materialProbability: 0.95 },
  { ticker: 'META', companyName: 'Meta Platforms Inc.', formType: 'DEF 14A', description: 'Definitive proxy statement for 2026 annual meeting', materialProbability: 0.6 },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc.', formType: 'SC 13D', description: 'Schedule 13D - Activist investor acquires 5.2% stake', materialProbability: 0.95 },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', formType: '10-K', description: 'Annual report for fiscal year ended December 2025', materialProbability: 0.75 },
  { ticker: 'V', companyName: 'Visa Inc.', formType: '8-K', description: 'Current report - New share repurchase program authorized', materialProbability: 0.7 },
  { ticker: 'JNJ', companyName: 'Johnson & Johnson', formType: '10-Q', description: 'Quarterly report for Q1 FY2026', materialProbability: 0.65 },
  { ticker: 'UNH', companyName: 'UnitedHealth Group Inc.', formType: '8-K', description: 'Current report - CFO departure and interim appointment', materialProbability: 0.9 },
  { ticker: 'XOM', companyName: 'Exxon Mobil Corporation', formType: 'SC 13D', description: 'Schedule 13D - Amended ownership disclosure', materialProbability: 0.5 },
  { ticker: 'LLY', companyName: 'Eli Lilly and Company', formType: 'S-1', description: 'Registration statement for spin-off entity', materialProbability: 0.85 },
  { ticker: 'BRK.B', companyName: 'Berkshire Hathaway Inc.', formType: '13F', description: 'Quarterly holdings report for Q4 2025', materialProbability: 0.95 },
  { ticker: 'AVGO', companyName: 'Broadcom Inc.', formType: '10-Q', description: 'Quarterly report for fiscal Q1 2026', materialProbability: 0.7 },
];

// ── Earnings filings configuration ──

interface EarningsFilingConfig {
  ticker: string;
  companyName: string;
  formType: '10-K' | '10-Q';
  fiscalPeriod: string;
  baseDeadlineOffset: number; // days from today
}

const EARNINGS_FILING_CONFIGS: EarningsFilingConfig[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', formType: '10-Q', fiscalPeriod: 'Q1 FY2026 (Dec 2025)', baseDeadlineOffset: 5 },
  { ticker: 'MSFT', companyName: 'Microsoft Corporation', formType: '10-Q', fiscalPeriod: 'Q2 FY2026 (Dec 2025)', baseDeadlineOffset: 8 },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc.', formType: '10-K', fiscalPeriod: 'FY2025 (Dec 2025)', baseDeadlineOffset: 18 },
  { ticker: 'AMZN', companyName: 'Amazon.com Inc.', formType: '10-K', fiscalPeriod: 'FY2025 (Dec 2025)', baseDeadlineOffset: 20 },
  { ticker: 'NVDA', companyName: 'NVIDIA Corporation', formType: '10-Q', fiscalPeriod: 'Q4 FY2026 (Jan 2026)', baseDeadlineOffset: 30 },
  { ticker: 'TSLA', companyName: 'Tesla Inc.', formType: '10-K', fiscalPeriod: 'FY2025 (Dec 2025)', baseDeadlineOffset: 14 },
  { ticker: 'META', companyName: 'Meta Platforms Inc.', formType: '10-K', fiscalPeriod: 'FY2025 (Dec 2025)', baseDeadlineOffset: 22 },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', formType: '10-K', fiscalPeriod: 'FY2025 (Dec 2025)', baseDeadlineOffset: 12 },
];

// ── 13F configuration ──

interface Form13FConfig {
  filerName: string;
  baseAum: number;
  positionPool: string[];
}

const FORM_13F_CONFIGS: Form13FConfig[] = [
  { filerName: 'Berkshire Hathaway Inc.', baseAum: 352.8, positionPool: ['OXY', 'AAPL', 'BAC', 'KO', 'CVX', 'AXP', 'MCO', 'ATVI', 'KHC', 'DVA', 'SNOW', 'NU', 'PARA'] },
  { filerName: 'Bridgewater Associates LP', baseAum: 124.5, positionPool: ['SPY', 'EEM', 'GLD', 'TLT', 'VWO', 'IVV', 'PG', 'JNJ', 'COST', 'WMT', 'BABA', 'PDD'] },
  { filerName: 'Renaissance Technologies LLC', baseAum: 98.3, positionPool: ['NVDA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD', 'AVGO', 'CRM', 'NOW', 'NFLX', 'TSLA', 'PANW'] },
  { filerName: 'Citadel Advisors LLC', baseAum: 215.7, positionPool: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY', 'QQQ', 'META', 'AMZN', 'GOOGL', 'AMD', 'JPM', 'GS'] },
  { filerName: 'Two Sigma Investments LP', baseAum: 67.4, positionPool: ['MSFT', 'AAPL', 'AMZN', 'META', 'GOOGL', 'UNH', 'LLY', 'V', 'MA', 'PG', 'HD', 'ABBV'] },
  { filerName: 'DE Shaw & Co LP', baseAum: 82.1, positionPool: ['NVDA', 'MSFT', 'AAPL', 'AVGO', 'CRM', 'ORCL', 'NOW', 'ADBE', 'INTU', 'SNPS', 'CDNS', 'MRVL'] },
];

const QUARTERS = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'] as const;

// ── Form 4 configuration ──

interface Form4Config {
  ticker: string;
  companyName: string;
  insiderName: string;
  title: string;
  transactionType: 'Purchase' | 'Sale' | 'Option Exercise' | 'Gift';
  baseShares: number;
  basePrice: number;
}

const FORM_4_CONFIGS: Form4Config[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', insiderName: 'Tim Cook', title: 'CEO', transactionType: 'Sale', baseShares: 50000, basePrice: 228.50 },
  { ticker: 'TSLA', companyName: 'Tesla Inc.', insiderName: 'Elon Musk', title: 'CEO', transactionType: 'Option Exercise', baseShares: 200000, basePrice: 245.30 },
  { ticker: 'NVDA', companyName: 'NVIDIA Corporation', insiderName: 'Jensen Huang', title: 'CEO', transactionType: 'Sale', baseShares: 120000, basePrice: 875.20 },
  { ticker: 'MSFT', companyName: 'Microsoft Corporation', insiderName: 'Satya Nadella', title: 'CEO', transactionType: 'Sale', baseShares: 30000, basePrice: 415.80 },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', insiderName: 'Jamie Dimon', title: 'CEO', transactionType: 'Sale', baseShares: 150000, basePrice: 198.40 },
  { ticker: 'AMZN', companyName: 'Amazon.com Inc.', insiderName: 'Andy Jassy', title: 'CEO', transactionType: 'Sale', baseShares: 25000, basePrice: 186.70 },
  { ticker: 'META', companyName: 'Meta Platforms Inc.', insiderName: 'Mark Zuckerberg', title: 'CEO', transactionType: 'Sale', baseShares: 75000, basePrice: 520.30 },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc.', insiderName: 'Sundar Pichai', title: 'CEO', transactionType: 'Sale', baseShares: 22000, basePrice: 168.90 },
  { ticker: 'LLY', companyName: 'Eli Lilly and Company', insiderName: 'David Ricks', title: 'CEO', transactionType: 'Purchase', baseShares: 5000, basePrice: 780.60 },
  { ticker: 'WMT', companyName: 'Walmart Inc.', insiderName: 'Doug McMillon', title: 'CEO', transactionType: 'Gift', baseShares: 10000, basePrice: 172.40 },
];

// ── Proxy filing configuration ──

interface ProxyFilingConfig {
  ticker: string;
  companyName: string;
  keyProposals: string[];
}

const PROXY_FILING_CONFIGS: ProxyFilingConfig[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', keyProposals: ['Board of Directors election', 'Ratification of auditor', 'Executive compensation advisory vote', 'Shareholder proposal on AI ethics disclosure'] },
  { ticker: 'XOM', companyName: 'Exxon Mobil Corporation', keyProposals: ['Board election', 'Say-on-pay vote', 'Shareholder proposal on climate risk reporting', 'Shareholder proposal on lobbying disclosure'] },
  { ticker: 'META', companyName: 'Meta Platforms Inc.', keyProposals: ['Board election', 'Auditor ratification', 'Dual-class share structure recapitalization proposal', 'Shareholder proposal on content moderation transparency'] },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', keyProposals: ['Board election', 'Executive compensation approval', 'Shareholder proposal on fossil fuel financing disclosure'] },
  { ticker: 'MSFT', companyName: 'Microsoft Corporation', keyProposals: ['Board election', 'Auditor ratification', 'Executive compensation advisory vote', 'Shareholder proposal on tax transparency'] },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc.', keyProposals: ['Board election', 'Auditor ratification', 'Shareholder proposal on algorithmic bias audit', 'Shareholder proposal to eliminate dual-class structure'] },
];

// ── IPO filing configuration ──

interface IPOFilingConfig {
  companyName: string;
  sector: string;
  baseSizeLow: number;
  baseSizeHigh: number;
  leadUnderwriters: string[];
  statusWeights: Record<string, number>;
}

const IPO_FILING_CONFIGS: IPOFilingConfig[] = [
  { companyName: 'Databricks Inc.', sector: 'Technology', baseSizeLow: 8, baseSizeHigh: 12, leadUnderwriters: ['Morgan Stanley', 'Goldman Sachs', 'J.P. Morgan'], statusWeights: { Filed: 0.3, Amended: 0.4, Effective: 0.2, Withdrawn: 0.1 } },
  { companyName: 'Stripe Inc.', sector: 'Fintech', baseSizeLow: 10, baseSizeHigh: 15, leadUnderwriters: ['Goldman Sachs', 'J.P. Morgan', 'Citigroup'], statusWeights: { Filed: 0.4, Amended: 0.3, Effective: 0.2, Withdrawn: 0.1 } },
  { companyName: 'Shein Group Ltd.', sector: 'Consumer / Retail', baseSizeLow: 5, baseSizeHigh: 8, leadUnderwriters: ['Goldman Sachs', 'Morgan Stanley', 'J.P. Morgan'], statusWeights: { Filed: 0.5, Amended: 0.3, Effective: 0.1, Withdrawn: 0.1 } },
  { companyName: 'Cerebras Systems Inc.', sector: 'Semiconductors', baseSizeLow: 2, baseSizeHigh: 4, leadUnderwriters: ['Citigroup', 'Barclays', 'Jefferies'], statusWeights: { Filed: 0.3, Amended: 0.4, Effective: 0.2, Withdrawn: 0.1 } },
  { companyName: 'Klarna Bank AB', sector: 'Fintech', baseSizeLow: 3, baseSizeHigh: 5, leadUnderwriters: ['Goldman Sachs', 'Morgan Stanley'], statusWeights: { Filed: 0.2, Amended: 0.3, Effective: 0.4, Withdrawn: 0.1 } },
  { companyName: 'Medline Industries LP', sector: 'Healthcare', baseSizeLow: 4, baseSizeHigh: 6, leadUnderwriters: ['J.P. Morgan', 'BofA Securities', 'Morgan Stanley'], statusWeights: { Filed: 0.4, Amended: 0.3, Effective: 0.2, Withdrawn: 0.1 } },
  { companyName: 'CoreWeave Inc.', sector: 'Cloud / AI Infrastructure', baseSizeLow: 3, baseSizeHigh: 5, leadUnderwriters: ['Morgan Stanley', 'Goldman Sachs', 'J.P. Morgan'], statusWeights: { Filed: 0.3, Amended: 0.4, Effective: 0.2, Withdrawn: 0.1 } },
  { companyName: 'Fanatics Holdings Inc.', sector: 'Sports / E-Commerce', baseSizeLow: 2, baseSizeHigh: 4, leadUnderwriters: ['Goldman Sachs', 'J.P. Morgan', 'BofA Securities'], statusWeights: { Filed: 0.5, Amended: 0.3, Effective: 0.1, Withdrawn: 0.1 } },
];

// ── Enforcement actions configuration ──

interface EnforcementConfig {
  respondent: string;
  violationType: string;
  basePenalty: number;
}

const ENFORCEMENT_CONFIGS: EnforcementConfig[] = [
  { respondent: 'Terraform Labs Pte. Ltd.', violationType: 'Securities fraud and unregistered securities offering', basePenalty: 4500000000 },
  { respondent: 'Silvergate Capital Corporation', violationType: 'Failure to file suspicious activity reports', basePenalty: 63000000 },
  { respondent: 'Galois Capital Management LLC', violationType: 'Custody rule violations (digital assets)', basePenalty: 225000 },
  { respondent: 'R. Kelly Brown (Individual)', violationType: 'Insider trading in pharmaceutical securities', basePenalty: 2800000 },
  { respondent: 'Virtu Financial LLC', violationType: 'Regulation SHO short sale marking violations', basePenalty: 1500000 },
  { respondent: 'Titan Global Capital Management USA', violationType: 'Marketing rule violations and misleading performance advertising', basePenalty: 850000 },
  { respondent: 'GlobalTech Advisors Inc.', violationType: 'Best execution failures and undisclosed conflicts', basePenalty: 3200000 },
  { respondent: 'Pacific Rim Holdings Ltd.', violationType: 'FCPA violations and books and records failures', basePenalty: 18500000 },
];

// ── Late filing configuration ──

interface LateFilingConfig {
  ticker: string;
  companyName: string;
  formType: string;
  baseDaysLate: number;
}

const LATE_FILING_CONFIGS: LateFilingConfig[] = [
  { ticker: 'SMCI', companyName: 'Super Micro Computer Inc.', formType: '10-K', baseDaysLate: 45 },
  { ticker: 'RIVN', companyName: 'Rivian Automotive Inc.', formType: '10-Q', baseDaysLate: 12 },
  { ticker: 'LCID', companyName: 'Lucid Group Inc.', formType: '10-Q', baseDaysLate: 8 },
];

// ── Form type count configuration ──

interface FormTypeCountConfig {
  formType: string;
  baseDailyCount: number;
  baseWeeklyCount: number;
}

const FORM_TYPE_COUNT_CONFIGS: FormTypeCountConfig[] = [
  { formType: '10-K', baseDailyCount: 85, baseWeeklyCount: 425 },
  { formType: '10-Q', baseDailyCount: 120, baseWeeklyCount: 600 },
  { formType: '8-K', baseDailyCount: 310, baseWeeklyCount: 1550 },
  { formType: 'S-1/S-1A', baseDailyCount: 12, baseWeeklyCount: 60 },
  { formType: 'DEF 14A', baseDailyCount: 45, baseWeeklyCount: 225 },
  { formType: '13F', baseDailyCount: 35, baseWeeklyCount: 175 },
  { formType: 'SC 13D/13G', baseDailyCount: 28, baseWeeklyCount: 140 },
  { formType: 'Form 4', baseDailyCount: 480, baseWeeklyCount: 2400 },
];

// ── Helper ──

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// ── Data generation ──

function generateRecentFilings(rng: () => number): RecentFiling[] {
  const today = new Date();
  return RECENT_FILING_CONFIGS.map((cfg) => {
    const daysAgo = Math.floor(rng() * 14); // filings within last 14 days
    const filingDate = new Date(today);
    filingDate.setDate(filingDate.getDate() - daysAgo);

    const material = rng() < cfg.materialProbability;

    return {
      ticker: cfg.ticker,
      companyName: cfg.companyName,
      formType: cfg.formType,
      filingDate: formatDate(filingDate),
      description: cfg.description,
      link: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cfg.ticker}&type=${encodeURIComponent(cfg.formType)}&dateb=&owner=include&count=10`,
      material,
    };
  });
}

function generateEarningsFilings(rng: () => number): EarningsFiling[] {
  const today = new Date();
  return EARNINGS_FILING_CONFIGS.map((cfg) => {
    const jitterDays = Math.floor((rng() - 0.5) * 6); // +/- 3 days
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + cfg.baseDeadlineOffset + jitterDays);

    return {
      ticker: cfg.ticker,
      companyName: cfg.companyName,
      formType: cfg.formType,
      filingDeadline: formatDate(deadline),
      fiscalPeriod: cfg.fiscalPeriod,
    };
  });
}

function generateForm13F(rng: () => number): Form13FFiling[] {
  const today = new Date();
  const quarter = QUARTERS[Math.floor(rng() * QUARTERS.length)];

  return FORM_13F_CONFIGS.map((cfg) => {
    const aumJitter = (rng() - 0.5) * cfg.baseAum * 0.1;
    const aum = Math.round((cfg.baseAum + aumJitter) * 10) / 10;

    const topNewPositions = pickN(cfg.positionPool, 3, rng);
    const remaining = cfg.positionPool.filter((p) => !topNewPositions.includes(p));
    const topExits = pickN(remaining, 2, rng);

    const daysAgo = Math.floor(rng() * 30);
    const filingDate = new Date(today);
    filingDate.setDate(filingDate.getDate() - daysAgo);

    return {
      filerName: cfg.filerName,
      aum,
      topNewPositions,
      topExits,
      filingDate: formatDate(filingDate),
      quarter,
    };
  });
}

function generateForm4Filings(rng: () => number): Form4Filing[] {
  return FORM_4_CONFIGS.map((cfg) => {
    const sharesJitter = Math.floor((rng() - 0.5) * cfg.baseShares * 0.3);
    const shares = cfg.baseShares + sharesJitter;

    const priceJitter = (rng() - 0.5) * cfg.basePrice * 0.08;
    const price = Math.round((cfg.basePrice + priceJitter) * 100) / 100;

    const value = Math.round(shares * price);

    return {
      ticker: cfg.ticker,
      companyName: cfg.companyName,
      insiderName: cfg.insiderName,
      title: cfg.title,
      transactionType: cfg.transactionType,
      shares,
      price,
      value,
    };
  });
}

function generateProxyFilings(rng: () => number): ProxyFiling[] {
  const today = new Date();
  return PROXY_FILING_CONFIGS.map((cfg) => {
    const daysAgo = Math.floor(rng() * 21);
    const filingDate = new Date(today);
    filingDate.setDate(filingDate.getDate() - daysAgo);

    // Randomly include 2-4 proposals from the config
    const numProposals = 2 + Math.floor(rng() * (cfg.keyProposals.length - 1));
    const keyProposals = pickN(cfg.keyProposals, numProposals, rng);

    return {
      ticker: cfg.ticker,
      companyName: cfg.companyName,
      filingDate: formatDate(filingDate),
      keyProposals,
    };
  });
}

function generateIPOFilings(rng: () => number): IPOFiling[] {
  return IPO_FILING_CONFIGS.map((cfg) => {
    const sizeJitter = (rng() - 0.5) * 2;
    const sizeLow = Math.round((cfg.baseSizeLow + sizeJitter) * 10) / 10;
    const sizeHigh = Math.round((cfg.baseSizeHigh + sizeJitter) * 10) / 10;
    const sizeRange = `$${sizeLow}B - $${sizeHigh}B`;

    // Determine status based on weighted probabilities
    const roll = rng();
    let cumulative = 0;
    let status: 'Filed' | 'Amended' | 'Effective' | 'Withdrawn' = 'Filed';
    for (const [s, weight] of Object.entries(cfg.statusWeights)) {
      cumulative += weight;
      if (roll < cumulative) {
        status = s as typeof status;
        break;
      }
    }

    return {
      companyName: cfg.companyName,
      sector: cfg.sector,
      sizeRange,
      leadUnderwriters: cfg.leadUnderwriters,
      status,
    };
  });
}

function generateEnforcementActions(rng: () => number): EnforcementAction[] {
  const today = new Date();
  return ENFORCEMENT_CONFIGS.map((cfg) => {
    const penaltyJitter = (rng() - 0.5) * cfg.basePenalty * 0.15;
    const penalty = Math.round(cfg.basePenalty + penaltyJitter);

    const daysAgo = Math.floor(rng() * 60); // within last 60 days
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    return {
      respondent: cfg.respondent,
      violationType: cfg.violationType,
      penalty,
      date: formatDate(date),
    };
  });
}

function generateFilingStatistics(rng: () => number): FilingStatistics {
  const today = new Date();

  const formTypeCounts: FormTypeCount[] = FORM_TYPE_COUNT_CONFIGS.map((cfg) => {
    const dailyJitter = Math.floor((rng() - 0.5) * cfg.baseDailyCount * 0.2);
    const dailyCount = cfg.baseDailyCount + dailyJitter;

    const weeklyJitter = Math.floor((rng() - 0.5) * cfg.baseWeeklyCount * 0.15);
    const weeklyCount = cfg.baseWeeklyCount + weeklyJitter;

    return {
      formType: cfg.formType,
      dailyCount,
      weeklyCount,
    };
  });

  const lateFilingAlerts: LateFilingAlert[] = LATE_FILING_CONFIGS.map((cfg) => {
    const daysJitter = Math.floor((rng() - 0.5) * 10);
    const daysLate = Math.max(1, cfg.baseDaysLate + daysJitter);

    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() - daysLate);

    return {
      ticker: cfg.ticker,
      companyName: cfg.companyName,
      formType: cfg.formType,
      deadline: formatDate(deadline),
      daysLate,
    };
  });

  return { formTypeCounts, lateFilingAlerts };
}

function generateRegulatoryFilingData(): RegulatoryFilingResponse {
  const rng = seededRandom('regulatory-filing');

  const recentFilings = generateRecentFilings(rng);
  const earningsFilings = generateEarningsFilings(rng);
  const form13F = generateForm13F(rng);
  const form4Filings = generateForm4Filings(rng);
  const proxyFilings = generateProxyFilings(rng);
  const ipoFilings = generateIPOFilings(rng);
  const enforcementActions = generateEnforcementActions(rng);
  const filingStatistics = generateFilingStatistics(rng);

  return {
    recentFilings,
    earningsFilings,
    form13F,
    form4Filings,
    proxyFilings,
    ipoFilings,
    enforcementActions,
    filingStatistics,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateRegulatoryFilingData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RegulatoryFiling] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate regulatory filing data' });
  }
});

export default router;
