import { Router } from 'express';

const router = Router();

// ── Deterministic seeded PRNG ──

function mulberry32(a: number) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashSeed(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; } return h; }

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Types ──

interface MunicipalIssuer {
  name: string;
  state: string;
  type: 'GO' | 'Revenue';
  sector: string;
  moodysRating: string;
  spRating: string;
  fitchRating: string;
  outstandingDebtBillions: number;
  debtServiceCoverageRatio: number;
  taxBaseMillions: number;
  medianHouseholdIncome: number;
  unemploymentRate: number;
  populationGrowthPct: number;
  propertyTaxRate: number;
}

interface RevenueGoBreakdown {
  category: string;
  outstandingBillions: number;
  pctOfTotal: number;
  avgYield: number;
  avgSpreadBps: number;
  defaultRateBps: number;
}

interface MuniTreasuryRatio {
  maturity: string;
  muniAAAYield: number;
  treasuryYield: number;
  ratio: number;
}

interface RatingAction {
  issuer: string;
  state: string;
  agency: string;
  action: 'UPGRADE' | 'DOWNGRADE' | 'OUTLOOK_CHANGE';
  previousRating: string;
  newRating: string;
  date: string;
  reason: string;
}

interface SectorBreakdown {
  sector: string;
  outstandingBillions: number;
  pctOfTotal: number;
  avgYield: number;
  avgRating: string;
  avgDSCR: number;
  defaultRateBps: number;
  spreadToAAA: number;
}

interface StateCreditSummary {
  state: string;
  abbreviation: string;
  goRatingMoodys: string;
  goRatingSP: string;
  goRatingFitch: string;
  outlook: 'Positive' | 'Stable' | 'Negative';
  totalDebtBillions: number;
  debtPerCapita: number;
  pensionFundedRatioPct: number;
  rainyDayFundPct: number;
  unemploymentRate: number;
  gdpGrowthPct: number;
  populationGrowthPct: number;
  revenueTrendPct: number;
}

interface MarketOverview {
  totalOutstandingTrillions: number;
  newIssuanceYtdBillions: number;
  weeklyFundFlowsBillions: number;
  avgAAAYield: number;
  avgMuniTreasuryRatio: number;
  advanceDeclineRatio: number;
  historicalDefaultRateBps: number;
  taxExemptPctOfTotal: number;
  timestamp: string;
}

interface MunicipalCreditAnalysisResponse {
  issuers: MunicipalIssuer[];
  revenueGoBreakdown: RevenueGoBreakdown[];
  muniTreasuryRatios: MuniTreasuryRatio[];
  recentRatingActions: RatingAction[];
  sectorBreakdown: SectorBreakdown[];
  stateCreditSummaries: StateCreditSummary[];
  marketOverview: MarketOverview;
  timestamp: string;
}

// ── Cache ──

let cache: { data: MunicipalCreditAnalysisResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000;

// ── Issuer configuration ──

interface IssuerConfig {
  name: string;
  state: string;
  type: 'GO' | 'Revenue';
  sector: string;
  moodys: string;
  sp: string;
  fitch: string;
  baseDebt: number;
  baseDSCR: number;
  baseTaxBase: number;
  baseIncome: number;
  baseUnemployment: number;
  basePopGrowth: number;
  basePropTax: number;
}

const ISSUER_CONFIGS: IssuerConfig[] = [
  { name: 'State of California', state: 'CA', type: 'GO', sector: 'General Government', moodys: 'Aa2', sp: 'AA-', fitch: 'AA', baseDebt: 74.2, baseDSCR: 2.8, baseTaxBase: 985000, baseIncome: 84900, baseUnemployment: 4.8, basePopGrowth: 0.2, basePropTax: 0.73 },
  { name: 'New York City', state: 'NY', type: 'GO', sector: 'General Government', moodys: 'Aa2', sp: 'AA', fitch: 'AA', baseDebt: 42.8, baseDSCR: 2.5, baseTaxBase: 1280000, baseIncome: 67200, baseUnemployment: 4.2, basePopGrowth: -0.3, basePropTax: 0.88 },
  { name: 'Metropolitan Transportation Authority', state: 'NY', type: 'Revenue', sector: 'Transportation', moodys: 'A1', sp: 'A+', fitch: 'A+', baseDebt: 45.3, baseDSCR: 1.6, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 4.2, basePopGrowth: -0.3, basePropTax: 0 },
  { name: 'State of Texas', state: 'TX', type: 'GO', sector: 'General Government', moodys: 'Aaa', sp: 'AAA', fitch: 'AAA', baseDebt: 52.1, baseDSCR: 3.4, baseTaxBase: 720000, baseIncome: 67500, baseUnemployment: 3.9, basePopGrowth: 1.6, basePropTax: 1.68 },
  { name: 'State of Florida', state: 'FL', type: 'GO', sector: 'General Government', moodys: 'Aaa', sp: 'AAA', fitch: 'AAA', baseDebt: 27.9, baseDSCR: 3.8, baseTaxBase: 610000, baseIncome: 63400, baseUnemployment: 3.2, basePopGrowth: 1.9, basePropTax: 0.86 },
  { name: 'State of Illinois', state: 'IL', type: 'GO', sector: 'General Government', moodys: 'A3', sp: 'A-', fitch: 'A-', baseDebt: 31.6, baseDSCR: 1.3, baseTaxBase: 420000, baseIncome: 72200, baseUnemployment: 4.5, basePopGrowth: -0.8, basePropTax: 2.07 },
  { name: 'Los Angeles Dept of Water & Power', state: 'CA', type: 'Revenue', sector: 'Utilities', moodys: 'Aa2', sp: 'AA', fitch: 'AA', baseDebt: 28.7, baseDSCR: 2.2, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 4.8, basePopGrowth: 0.2, basePropTax: 0 },
  { name: 'State of New Jersey', state: 'NJ', type: 'GO', sector: 'General Government', moodys: 'A2', sp: 'A-', fitch: 'A', baseDebt: 35.4, baseDSCR: 1.5, baseTaxBase: 380000, baseIncome: 89700, baseUnemployment: 4.1, basePopGrowth: -0.1, basePropTax: 2.21 },
  { name: 'Port Authority of NY & NJ', state: 'NY', type: 'Revenue', sector: 'Transportation', moodys: 'Aa3', sp: 'AA-', fitch: 'AA-', baseDebt: 24.8, baseDSCR: 2.0, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 4.2, basePopGrowth: -0.3, basePropTax: 0 },
  { name: 'Massachusetts Water Resources Authority', state: 'MA', type: 'Revenue', sector: 'Utilities', moodys: 'Aa1', sp: 'AA+', fitch: 'AA+', baseDebt: 12.5, baseDSCR: 2.4, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.5, basePopGrowth: 0.3, basePropTax: 0 },
  { name: 'Chicago Board of Education', state: 'IL', type: 'GO', sector: 'Education', moodys: 'Ba1', sp: 'BB+', fitch: 'BB+', baseDebt: 9.8, baseDSCR: 1.1, baseTaxBase: 185000, baseIncome: 65800, baseUnemployment: 5.2, basePopGrowth: -0.7, basePropTax: 1.95 },
  { name: 'University of California Regents', state: 'CA', type: 'Revenue', sector: 'Education', moodys: 'Aa2', sp: 'AA', fitch: 'AA', baseDebt: 22.4, baseDSCR: 2.6, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 4.8, basePopGrowth: 0.2, basePropTax: 0 },
  { name: 'Denver Health & Hospital Authority', state: 'CO', type: 'Revenue', sector: 'Healthcare', moodys: 'A2', sp: 'A', fitch: 'A', baseDebt: 4.2, baseDSCR: 1.8, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.4, basePopGrowth: 1.4, basePropTax: 0 },
  { name: 'Virginia Commonwealth Transportation', state: 'VA', type: 'Revenue', sector: 'Transportation', moodys: 'Aa1', sp: 'AA+', fitch: 'AA+', baseDebt: 8.5, baseDSCR: 2.3, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.0, basePopGrowth: 0.7, basePropTax: 0 },
  { name: 'State of Connecticut', state: 'CT', type: 'GO', sector: 'General Government', moodys: 'A1', sp: 'A+', fitch: 'A+', baseDebt: 20.1, baseDSCR: 1.4, baseTaxBase: 295000, baseIncome: 83800, baseUnemployment: 4.0, basePopGrowth: -0.5, basePropTax: 1.63 },
  { name: 'Dallas Fort Worth International Airport', state: 'TX', type: 'Revenue', sector: 'Transportation', moodys: 'A1', sp: 'AA-', fitch: 'A+', baseDebt: 7.8, baseDSCR: 2.1, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.9, basePopGrowth: 1.6, basePropTax: 0 },
  { name: 'Georgia Housing & Finance Authority', state: 'GA', type: 'Revenue', sector: 'Housing', moodys: 'Aa2', sp: 'AA', fitch: 'AA', baseDebt: 5.6, baseDSCR: 1.9, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.4, basePopGrowth: 1.0, basePropTax: 0 },
  { name: 'New Jersey Turnpike Authority', state: 'NJ', type: 'Revenue', sector: 'Transportation', moodys: 'A1', sp: 'A+', fitch: 'A+', baseDebt: 12.3, baseDSCR: 1.7, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 4.1, basePopGrowth: -0.1, basePropTax: 0 },
  { name: 'North Carolina Municipal Power Agency', state: 'NC', type: 'Revenue', sector: 'Utilities', moodys: 'A1', sp: 'A+', fitch: 'A+', baseDebt: 3.8, baseDSCR: 2.0, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.3, basePopGrowth: 1.1, basePropTax: 0 },
  { name: 'San Antonio Water System', state: 'TX', type: 'Revenue', sector: 'Utilities', moodys: 'Aa2', sp: 'AA', fitch: 'AA', baseDebt: 4.5, baseDSCR: 2.5, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.9, basePopGrowth: 1.6, basePropTax: 0 },
  { name: 'Minnesota Housing Finance Agency', state: 'MN', type: 'Revenue', sector: 'Housing', moodys: 'Aa1', sp: 'AA+', fitch: 'AA+', baseDebt: 3.2, baseDSCR: 2.1, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.1, basePopGrowth: 0.5, basePropTax: 0 },
  { name: 'Cook County Health', state: 'IL', type: 'Revenue', sector: 'Healthcare', moodys: 'Baa2', sp: 'BBB', fitch: 'BBB', baseDebt: 2.8, baseDSCR: 1.2, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 5.2, basePopGrowth: -0.7, basePropTax: 0 },
  { name: 'State of Maryland', state: 'MD', type: 'GO', sector: 'General Government', moodys: 'Aaa', sp: 'AAA', fitch: 'AAA', baseDebt: 14.8, baseDSCR: 3.2, baseTaxBase: 450000, baseIncome: 90200, baseUnemployment: 3.2, basePopGrowth: 0.3, basePropTax: 1.06 },
  { name: 'Cleveland Clinic Health System', state: 'OH', type: 'Revenue', sector: 'Healthcare', moodys: 'Aa2', sp: 'AA', fitch: 'AA', baseDebt: 6.1, baseDSCR: 3.5, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.7, basePopGrowth: -0.2, basePropTax: 0 },
  { name: 'Washington State Housing Finance Commission', state: 'WA', type: 'Revenue', sector: 'Housing', moodys: 'Aa2', sp: 'AA', fitch: 'AA', baseDebt: 4.1, baseDSCR: 2.0, baseTaxBase: 0, baseIncome: 0, baseUnemployment: 3.8, basePopGrowth: 1.2, basePropTax: 0 },
];

// ── Revenue vs GO breakdown configuration ──

interface RevenueGoConfig {
  category: string;
  baseOutstanding: number;
  basePctOfTotal: number;
  baseYield: number;
  baseSpreadBps: number;
  baseDefaultBps: number;
}

const REVENUE_GO_CONFIGS: RevenueGoConfig[] = [
  { category: 'General Obligation', baseOutstanding: 1420, basePctOfTotal: 35.5, baseYield: 3.42, baseSpreadBps: 15, baseDefaultBps: 0.8 },
  { category: 'Revenue - Essential Service', baseOutstanding: 980, basePctOfTotal: 24.5, baseYield: 3.68, baseSpreadBps: 42, baseDefaultBps: 3.2 },
  { category: 'Revenue - Transportation', baseOutstanding: 490, basePctOfTotal: 12.3, baseYield: 3.78, baseSpreadBps: 52, baseDefaultBps: 5.5 },
  { category: 'Revenue - Healthcare', baseOutstanding: 420, basePctOfTotal: 10.5, baseYield: 3.95, baseSpreadBps: 68, baseDefaultBps: 8.2 },
  { category: 'Revenue - Education', baseOutstanding: 380, basePctOfTotal: 9.5, baseYield: 3.55, baseSpreadBps: 30, baseDefaultBps: 1.8 },
  { category: 'Revenue - Housing', baseOutstanding: 180, basePctOfTotal: 4.5, baseYield: 3.82, baseSpreadBps: 55, baseDefaultBps: 4.5 },
  { category: 'Revenue - Other', baseOutstanding: 130, basePctOfTotal: 3.2, baseYield: 3.90, baseSpreadBps: 62, baseDefaultBps: 6.8 },
];

// ── Muni/Treasury ratio configuration ──

interface MuniTreasuryConfig {
  maturity: string;
  baseMuniYield: number;
  baseTreasuryYield: number;
}

const MUNI_TREASURY_CONFIGS: MuniTreasuryConfig[] = [
  { maturity: '1Y', baseMuniYield: 2.55, baseTreasuryYield: 4.52 },
  { maturity: '2Y', baseMuniYield: 2.68, baseTreasuryYield: 4.38 },
  { maturity: '3Y', baseMuniYield: 2.82, baseTreasuryYield: 4.30 },
  { maturity: '5Y', baseMuniYield: 3.05, baseTreasuryYield: 4.22 },
  { maturity: '7Y', baseMuniYield: 3.22, baseTreasuryYield: 4.28 },
  { maturity: '10Y', baseMuniYield: 3.42, baseTreasuryYield: 4.35 },
  { maturity: '15Y', baseMuniYield: 3.68, baseTreasuryYield: 4.48 },
  { maturity: '20Y', baseMuniYield: 3.85, baseTreasuryYield: 4.55 },
  { maturity: '25Y', baseMuniYield: 3.95, baseTreasuryYield: 4.60 },
  { maturity: '30Y', baseMuniYield: 4.02, baseTreasuryYield: 4.62 },
];

// ── Rating action configuration ──

interface RatingActionConfig {
  issuer: string;
  state: string;
  agency: string;
  action: 'UPGRADE' | 'DOWNGRADE' | 'OUTLOOK_CHANGE';
  previousRating: string;
  newRating: string;
  daysAgo: number;
  reason: string;
}

const RATING_ACTION_CONFIGS: RatingActionConfig[] = [
  { issuer: 'State of Illinois', state: 'IL', agency: "Moody's", action: 'UPGRADE', previousRating: 'Baa3', newRating: 'A3', daysAgo: 3, reason: 'Improved pension contribution schedule and three consecutive budget surpluses' },
  { issuer: 'City of Detroit Water & Sewerage', state: 'MI', agency: "Moody's", action: 'UPGRADE', previousRating: 'Ba2', newRating: 'Ba1', daysAgo: 5, reason: 'Strengthened rate covenant compliance and capital program execution' },
  { issuer: 'State of New Jersey', state: 'NJ', agency: 'S&P', action: 'UPGRADE', previousRating: 'A-', newRating: 'A', daysAgo: 7, reason: 'Consecutive budget surpluses and accelerated rainy day fund contributions' },
  { issuer: 'Kansas City MO', state: 'MO', agency: 'S&P', action: 'UPGRADE', previousRating: 'AA', newRating: 'AA+', daysAgo: 10, reason: 'Strong economic diversification and conservative reserve management' },
  { issuer: 'Dallas Fort Worth International Airport', state: 'TX', agency: 'Fitch', action: 'UPGRADE', previousRating: 'A+', newRating: 'AA-', daysAgo: 6, reason: 'Record passenger volume recovery and non-airline revenue diversification' },
  { issuer: 'Hartford CT', state: 'CT', agency: 'Fitch', action: 'DOWNGRADE', previousRating: 'A+', newRating: 'A', daysAgo: 4, reason: 'Elevated fixed costs, declining grand list, and pension liability growth' },
  { issuer: 'Chicago Board of Education', state: 'IL', agency: 'S&P', action: 'DOWNGRADE', previousRating: 'BB+', newRating: 'BB', daysAgo: 8, reason: 'Declining enrollment projections and escalating pension contribution requirements' },
  { issuer: 'San Francisco Bay Area Toll Authority', state: 'CA', agency: "Moody's", action: 'DOWNGRADE', previousRating: 'Aa1', newRating: 'Aa2', daysAgo: 12, reason: 'Persistent traffic volume decline below pre-pandemic levels and rising maintenance backlog' },
  { issuer: 'New Jersey Turnpike Authority', state: 'NJ', agency: "Moody's", action: 'UPGRADE', previousRating: 'A2', newRating: 'A1', daysAgo: 9, reason: 'Toll revenue outperformance and improved debt service coverage to 2.1x' },
  { issuer: 'University of California Regents', state: 'CA', agency: 'S&P', action: 'UPGRADE', previousRating: 'AA', newRating: 'AA+', daysAgo: 14, reason: 'Robust enrollment demand, endowment growth, and diversified research revenue' },
  { issuer: 'State of Connecticut', state: 'CT', agency: "Moody's", action: 'OUTLOOK_CHANGE', previousRating: 'A1 (Stable)', newRating: 'A1 (Negative)', daysAgo: 15, reason: 'Pension liability growth outpacing contribution increases and declining population trends' },
  { issuer: 'Massachusetts Bay Transportation Authority', state: 'MA', agency: 'Fitch', action: 'DOWNGRADE', previousRating: 'AA', newRating: 'AA-', daysAgo: 11, reason: 'Deferred capital maintenance backlog exceeding $10B and slow ridership recovery' },
  { issuer: 'Cleveland Clinic Health System', state: 'OH', agency: 'S&P', action: 'UPGRADE', previousRating: 'AA-', newRating: 'AA', daysAgo: 18, reason: 'Operating margin expansion and market share gains in key service lines' },
  { issuer: 'State of Georgia', state: 'GA', agency: 'Fitch', action: 'OUTLOOK_CHANGE', previousRating: 'AAA (Stable)', newRating: 'AAA (Positive)', daysAgo: 20, reason: 'Sustained revenue growth, population in-migration, and conservative debt management' },
];

// ── Sector breakdown configuration ──

interface SectorConfig {
  sector: string;
  baseOutstanding: number;
  basePctOfTotal: number;
  baseYield: number;
  avgRating: string;
  baseDSCR: number;
  baseDefaultBps: number;
  baseSpreadToAAA: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Education', baseOutstanding: 680, basePctOfTotal: 17.0, baseYield: 3.55, avgRating: 'AA-', baseDSCR: 2.2, baseDefaultBps: 1.8, baseSpreadToAAA: 28 },
  { sector: 'Healthcare', baseOutstanding: 520, basePctOfTotal: 13.0, baseYield: 3.95, avgRating: 'A+', baseDSCR: 2.8, baseDefaultBps: 8.2, baseSpreadToAAA: 68 },
  { sector: 'Transportation', baseOutstanding: 590, basePctOfTotal: 14.8, baseYield: 3.78, avgRating: 'A+', baseDSCR: 1.9, baseDefaultBps: 5.5, baseSpreadToAAA: 52 },
  { sector: 'Utilities', baseOutstanding: 480, basePctOfTotal: 12.0, baseYield: 3.62, avgRating: 'AA', baseDSCR: 2.4, baseDefaultBps: 2.5, baseSpreadToAAA: 35 },
  { sector: 'Housing', baseOutstanding: 310, basePctOfTotal: 7.8, baseYield: 3.82, avgRating: 'AA-', baseDSCR: 1.8, baseDefaultBps: 4.5, baseSpreadToAAA: 55 },
  { sector: 'General Government', baseOutstanding: 1020, basePctOfTotal: 25.5, baseYield: 3.42, avgRating: 'AA', baseDSCR: 2.8, baseDefaultBps: 0.8, baseSpreadToAAA: 15 },
  { sector: 'Special Tax/Assessment', baseOutstanding: 240, basePctOfTotal: 6.0, baseYield: 3.88, avgRating: 'A', baseDSCR: 1.6, baseDefaultBps: 6.2, baseSpreadToAAA: 60 },
  { sector: 'Other', baseOutstanding: 160, basePctOfTotal: 3.9, baseYield: 3.92, avgRating: 'A', baseDSCR: 1.5, baseDefaultBps: 7.0, baseSpreadToAAA: 65 },
];

// ── State credit summary configuration ──

interface StateCreditConfig {
  state: string;
  abbreviation: string;
  goMoodys: string;
  goSP: string;
  goFitch: string;
  outlookBias: number;
  baseTotalDebt: number;
  baseDebtPerCapita: number;
  basePensionFunded: number;
  baseRainyDay: number;
  baseUnemployment: number;
  baseGdpGrowth: number;
  basePopGrowth: number;
  baseRevTrend: number;
}

const STATE_CREDIT_CONFIGS: StateCreditConfig[] = [
  { state: 'California', abbreviation: 'CA', goMoodys: 'Aa2', goSP: 'AA-', goFitch: 'AA', outlookBias: 0.55, baseTotalDebt: 148.5, baseDebtPerCapita: 4180, basePensionFunded: 72.8, baseRainyDay: 8.2, baseUnemployment: 4.8, baseGdpGrowth: 2.8, basePopGrowth: 0.2, baseRevTrend: 3.5 },
  { state: 'New York', abbreviation: 'NY', goMoodys: 'Aa1', goSP: 'AA+', goFitch: 'AA+', outlookBias: 0.60, baseTotalDebt: 135.2, baseDebtPerCapita: 7920, basePensionFunded: 95.5, baseRainyDay: 5.1, baseUnemployment: 4.2, baseGdpGrowth: 2.2, basePopGrowth: -0.3, baseRevTrend: 2.8 },
  { state: 'Texas', abbreviation: 'TX', goMoodys: 'Aaa', goSP: 'AAA', goFitch: 'AAA', outlookBias: 0.78, baseTotalDebt: 62.5, baseDebtPerCapita: 1720, basePensionFunded: 78.2, baseRainyDay: 14.5, baseUnemployment: 3.9, baseGdpGrowth: 3.5, basePopGrowth: 1.6, baseRevTrend: 5.2 },
  { state: 'Florida', abbreviation: 'FL', goMoodys: 'Aaa', goSP: 'AAA', goFitch: 'AAA', outlookBias: 0.82, baseTotalDebt: 42.8, baseDebtPerCapita: 1540, basePensionFunded: 82.4, baseRainyDay: 9.8, baseUnemployment: 3.2, baseGdpGrowth: 3.8, basePopGrowth: 1.9, baseRevTrend: 5.8 },
  { state: 'Illinois', abbreviation: 'IL', goMoodys: 'A3', goSP: 'A-', goFitch: 'A-', outlookBias: 0.30, baseTotalDebt: 68.4, baseDebtPerCapita: 5940, basePensionFunded: 44.5, baseRainyDay: 0.8, baseUnemployment: 4.5, baseGdpGrowth: 1.2, basePopGrowth: -0.8, baseRevTrend: 1.0 },
  { state: 'Pennsylvania', abbreviation: 'PA', goMoodys: 'Aa3', goSP: 'AA-', goFitch: 'AA-', outlookBias: 0.50, baseTotalDebt: 45.2, baseDebtPerCapita: 3480, basePensionFunded: 63.2, baseRainyDay: 4.5, baseUnemployment: 3.8, baseGdpGrowth: 1.8, basePopGrowth: -0.1, baseRevTrend: 2.2 },
  { state: 'Ohio', abbreviation: 'OH', goMoodys: 'Aa1', goSP: 'AA+', goFitch: 'AA+', outlookBias: 0.58, baseTotalDebt: 32.5, baseDebtPerCapita: 2210, basePensionFunded: 75.8, baseRainyDay: 7.2, baseUnemployment: 3.7, baseGdpGrowth: 1.5, basePopGrowth: -0.2, baseRevTrend: 2.0 },
  { state: 'New Jersey', abbreviation: 'NJ', goMoodys: 'A2', goSP: 'A-', goFitch: 'A', outlookBias: 0.38, baseTotalDebt: 55.8, baseDebtPerCapita: 6380, basePensionFunded: 52.8, baseRainyDay: 2.1, baseUnemployment: 4.1, baseGdpGrowth: 1.5, basePopGrowth: -0.1, baseRevTrend: 1.8 },
  { state: 'Massachusetts', abbreviation: 'MA', goMoodys: 'Aa1', goSP: 'AA+', goFitch: 'AA+', outlookBias: 0.62, baseTotalDebt: 38.5, baseDebtPerCapita: 5250, basePensionFunded: 68.5, baseRainyDay: 6.8, baseUnemployment: 3.5, baseGdpGrowth: 2.5, basePopGrowth: 0.3, baseRevTrend: 3.2 },
  { state: 'Connecticut', abbreviation: 'CT', goMoodys: 'A1', goSP: 'A+', goFitch: 'A+', outlookBias: 0.35, baseTotalDebt: 28.2, baseDebtPerCapita: 8980, basePensionFunded: 52.4, baseRainyDay: 3.2, baseUnemployment: 4.0, baseGdpGrowth: 1.0, basePopGrowth: -0.5, baseRevTrend: 1.2 },
  { state: 'Washington', abbreviation: 'WA', goMoodys: 'Aa1', goSP: 'AA+', goFitch: 'AA+', outlookBias: 0.68, baseTotalDebt: 25.8, baseDebtPerCapita: 2780, basePensionFunded: 84.5, baseRainyDay: 10.2, baseUnemployment: 3.8, baseGdpGrowth: 3.2, basePopGrowth: 1.2, baseRevTrend: 4.5 },
  { state: 'Colorado', abbreviation: 'CO', goMoodys: 'Aa1', goSP: 'AA+', goFitch: 'AA+', outlookBias: 0.70, baseTotalDebt: 18.5, baseDebtPerCapita: 2450, basePensionFunded: 80.2, baseRainyDay: 11.5, baseUnemployment: 3.4, baseGdpGrowth: 3.0, basePopGrowth: 1.4, baseRevTrend: 4.2 },
  { state: 'Virginia', abbreviation: 'VA', goMoodys: 'Aaa', goSP: 'AAA', goFitch: 'AAA', outlookBias: 0.80, baseTotalDebt: 22.4, baseDebtPerCapita: 1980, basePensionFunded: 86.2, baseRainyDay: 12.0, baseUnemployment: 3.0, baseGdpGrowth: 2.8, basePopGrowth: 0.7, baseRevTrend: 3.8 },
  { state: 'Georgia', abbreviation: 'GA', goMoodys: 'Aaa', goSP: 'AAA', goFitch: 'AAA', outlookBias: 0.75, baseTotalDebt: 16.8, baseDebtPerCapita: 1280, basePensionFunded: 80.8, baseRainyDay: 13.5, baseUnemployment: 3.4, baseGdpGrowth: 3.2, basePopGrowth: 1.0, baseRevTrend: 4.8 },
  { state: 'North Carolina', abbreviation: 'NC', goMoodys: 'Aaa', goSP: 'AAA', goFitch: 'AAA', outlookBias: 0.82, baseTotalDebt: 12.2, baseDebtPerCapita: 1150, basePensionFunded: 88.5, baseRainyDay: 8.5, baseUnemployment: 3.3, baseGdpGrowth: 3.5, basePopGrowth: 1.1, baseRevTrend: 5.0 },
  { state: 'Maryland', abbreviation: 'MD', goMoodys: 'Aaa', goSP: 'AAA', goFitch: 'AAA', outlookBias: 0.72, baseTotalDebt: 24.5, baseDebtPerCapita: 3650, basePensionFunded: 78.5, baseRainyDay: 6.5, baseUnemployment: 3.2, baseGdpGrowth: 2.2, basePopGrowth: 0.3, baseRevTrend: 2.8 },
  { state: 'Minnesota', abbreviation: 'MN', goMoodys: 'Aa1', goSP: 'AAA', goFitch: 'AAA', outlookBias: 0.72, baseTotalDebt: 15.8, baseDebtPerCapita: 2850, basePensionFunded: 82.0, baseRainyDay: 9.5, baseUnemployment: 3.1, baseGdpGrowth: 2.5, basePopGrowth: 0.5, baseRevTrend: 3.5 },
  { state: 'Michigan', abbreviation: 'MI', goMoodys: 'Aa2', goSP: 'AA', goFitch: 'AA', outlookBias: 0.48, baseTotalDebt: 28.5, baseDebtPerCapita: 2980, basePensionFunded: 65.8, baseRainyDay: 5.5, baseUnemployment: 4.2, baseGdpGrowth: 1.2, basePopGrowth: -0.3, baseRevTrend: 1.5 },
  { state: 'Wisconsin', abbreviation: 'WI', goMoodys: 'Aa1', goSP: 'AA+', goFitch: 'AA+', outlookBias: 0.62, baseTotalDebt: 18.2, baseDebtPerCapita: 2520, basePensionFunded: 98.5, baseRainyDay: 8.0, baseUnemployment: 3.3, baseGdpGrowth: 1.8, basePopGrowth: 0.2, baseRevTrend: 2.5 },
  { state: 'Arizona', abbreviation: 'AZ', goMoodys: 'Aa2', goSP: 'AA', goFitch: 'AA', outlookBias: 0.65, baseTotalDebt: 14.5, baseDebtPerCapita: 1850, basePensionFunded: 74.2, baseRainyDay: 7.8, baseUnemployment: 3.6, baseGdpGrowth: 3.2, basePopGrowth: 1.5, baseRevTrend: 4.5 },
];

// ── Data generation functions ──

function generateIssuers(rng: () => number): MunicipalIssuer[] {
  return ISSUER_CONFIGS.map((cfg) => {
    const debtJitter = (rng() - 0.5) * cfg.baseDebt * 0.08;
    const outstandingDebtBillions = Math.round((cfg.baseDebt + debtJitter) * 10) / 10;

    const dscrJitter = (rng() - 0.5) * cfg.baseDSCR * 0.12;
    const debtServiceCoverageRatio = Math.round((cfg.baseDSCR + dscrJitter) * 100) / 100;

    const taxBaseJitter = cfg.baseTaxBase > 0 ? (rng() - 0.5) * cfg.baseTaxBase * 0.05 : 0;
    const taxBaseMillions = Math.round(cfg.baseTaxBase + taxBaseJitter);

    const incomeJitter = cfg.baseIncome > 0 ? (rng() - 0.5) * cfg.baseIncome * 0.04 : 0;
    const medianHouseholdIncome = Math.round(cfg.baseIncome + incomeJitter);

    const unempJitter = (rng() - 0.5) * 0.4;
    const unemploymentRate = Math.round((cfg.baseUnemployment + unempJitter) * 10) / 10;

    const popJitter = (rng() - 0.5) * 0.3;
    const populationGrowthPct = Math.round((cfg.basePopGrowth + popJitter) * 10) / 10;

    const propTaxJitter = cfg.basePropTax > 0 ? (rng() - 0.5) * cfg.basePropTax * 0.06 : 0;
    const propertyTaxRate = Math.round((cfg.basePropTax + propTaxJitter) * 100) / 100;

    return {
      name: cfg.name,
      state: cfg.state,
      type: cfg.type,
      sector: cfg.sector,
      moodysRating: cfg.moodys,
      spRating: cfg.sp,
      fitchRating: cfg.fitch,
      outstandingDebtBillions,
      debtServiceCoverageRatio: Math.max(0.8, debtServiceCoverageRatio),
      taxBaseMillions: Math.max(0, taxBaseMillions),
      medianHouseholdIncome: Math.max(0, medianHouseholdIncome),
      unemploymentRate: Math.max(1.5, unemploymentRate),
      populationGrowthPct,
      propertyTaxRate: Math.max(0, propertyTaxRate),
    };
  });
}

function generateRevenueGoBreakdown(rng: () => number): RevenueGoBreakdown[] {
  return REVENUE_GO_CONFIGS.map((cfg) => {
    const outJitter = (rng() - 0.5) * cfg.baseOutstanding * 0.06;
    const outstandingBillions = Math.round(cfg.baseOutstanding + outJitter);

    const pctJitter = (rng() - 0.5) * 1.2;
    const pctOfTotal = Math.round((cfg.basePctOfTotal + pctJitter) * 10) / 10;

    const yieldJitter = (rng() - 0.5) * 0.12;
    const avgYield = Math.round((cfg.baseYield + yieldJitter) * 100) / 100;

    const spreadJitter = (rng() - 0.5) * cfg.baseSpreadBps * 0.15;
    const avgSpreadBps = Math.round(cfg.baseSpreadBps + spreadJitter);

    const defaultJitter = (rng() - 0.5) * cfg.baseDefaultBps * 0.2;
    const defaultRateBps = Math.round((cfg.baseDefaultBps + defaultJitter) * 10) / 10;

    return {
      category: cfg.category,
      outstandingBillions,
      pctOfTotal,
      avgYield,
      avgSpreadBps: Math.max(0, avgSpreadBps),
      defaultRateBps: Math.max(0, defaultRateBps),
    };
  });
}

function generateMuniTreasuryRatios(rng: () => number): MuniTreasuryRatio[] {
  return MUNI_TREASURY_CONFIGS.map((cfg) => {
    const muniJitter = (rng() - 0.5) * 0.12;
    const muniAAAYield = Math.round((cfg.baseMuniYield + muniJitter) * 100) / 100;

    const trsyJitter = (rng() - 0.5) * 0.10;
    const treasuryYield = Math.round((cfg.baseTreasuryYield + trsyJitter) * 100) / 100;

    const ratio = Math.round((muniAAAYield / treasuryYield) * 100 * 10) / 10;

    return {
      maturity: cfg.maturity,
      muniAAAYield,
      treasuryYield,
      ratio,
    };
  });
}

function generateRatingActions(rng: () => number): RatingAction[] {
  const today = new Date();
  return RATING_ACTION_CONFIGS.map((cfg) => {
    const extraDays = Math.floor(rng() * 3);
    const actionDate = new Date(today);
    actionDate.setDate(actionDate.getDate() - (cfg.daysAgo + extraDays));
    const date = actionDate.toISOString().slice(0, 10);

    return {
      issuer: cfg.issuer,
      state: cfg.state,
      agency: cfg.agency,
      action: cfg.action,
      previousRating: cfg.previousRating,
      newRating: cfg.newRating,
      date,
      reason: cfg.reason,
    };
  });
}

function generateSectorBreakdown(rng: () => number): SectorBreakdown[] {
  return SECTOR_CONFIGS.map((cfg) => {
    const outJitter = (rng() - 0.5) * cfg.baseOutstanding * 0.06;
    const outstandingBillions = Math.round(cfg.baseOutstanding + outJitter);

    const pctJitter = (rng() - 0.5) * 1.2;
    const pctOfTotal = Math.round((cfg.basePctOfTotal + pctJitter) * 10) / 10;

    const yieldJitter = (rng() - 0.5) * 0.15;
    const avgYield = Math.round((cfg.baseYield + yieldJitter) * 100) / 100;

    const dscrJitter = (rng() - 0.5) * cfg.baseDSCR * 0.10;
    const avgDSCR = Math.round((cfg.baseDSCR + dscrJitter) * 100) / 100;

    const defaultJitter = (rng() - 0.5) * cfg.baseDefaultBps * 0.2;
    const defaultRateBps = Math.round((cfg.baseDefaultBps + defaultJitter) * 10) / 10;

    const spreadJitter = (rng() - 0.5) * cfg.baseSpreadToAAA * 0.15;
    const spreadToAAA = Math.round(cfg.baseSpreadToAAA + spreadJitter);

    return {
      sector: cfg.sector,
      outstandingBillions,
      pctOfTotal,
      avgYield,
      avgRating: cfg.avgRating,
      avgDSCR: Math.max(0.8, avgDSCR),
      defaultRateBps: Math.max(0, defaultRateBps),
      spreadToAAA: Math.max(0, spreadToAAA),
    };
  });
}

function generateStateCreditSummaries(rng: () => number): StateCreditSummary[] {
  return STATE_CREDIT_CONFIGS.map((cfg) => {
    const debtJitter = (rng() - 0.5) * cfg.baseTotalDebt * 0.05;
    const totalDebtBillions = Math.round((cfg.baseTotalDebt + debtJitter) * 10) / 10;

    const dpcJitter = (rng() - 0.5) * cfg.baseDebtPerCapita * 0.06;
    const debtPerCapita = Math.round(cfg.baseDebtPerCapita + dpcJitter);

    const pensionJitter = (rng() - 0.5) * 3.0;
    const pensionFundedRatioPct = Math.round(Math.max(35, Math.min(100, cfg.basePensionFunded + pensionJitter)) * 10) / 10;

    const rainyJitter = (rng() - 0.5) * 1.5;
    const rainyDayFundPct = Math.round(Math.max(0, cfg.baseRainyDay + rainyJitter) * 10) / 10;

    const unempJitter = (rng() - 0.5) * 0.4;
    const unemploymentRate = Math.round(Math.max(1.5, cfg.baseUnemployment + unempJitter) * 10) / 10;

    const gdpJitter = (rng() - 0.5) * 0.8;
    const gdpGrowthPct = Math.round((cfg.baseGdpGrowth + gdpJitter) * 10) / 10;

    const popJitter = (rng() - 0.5) * 0.3;
    const populationGrowthPct = Math.round((cfg.basePopGrowth + popJitter) * 10) / 10;

    const revJitter = (rng() - 0.5) * 1.5;
    const revenueTrendPct = Math.round((cfg.baseRevTrend + revJitter) * 10) / 10;

    const outlookRoll = cfg.outlookBias + (rng() - 0.5) * 0.3;
    let outlook: 'Positive' | 'Stable' | 'Negative';
    if (outlookRoll > 0.65) {
      outlook = 'Positive';
    } else if (outlookRoll < 0.35) {
      outlook = 'Negative';
    } else {
      outlook = 'Stable';
    }

    return {
      state: cfg.state,
      abbreviation: cfg.abbreviation,
      goRatingMoodys: cfg.goMoodys,
      goRatingSP: cfg.goSP,
      goRatingFitch: cfg.goFitch,
      outlook,
      totalDebtBillions,
      debtPerCapita,
      pensionFundedRatioPct,
      rainyDayFundPct,
      unemploymentRate,
      gdpGrowthPct,
      populationGrowthPct,
      revenueTrendPct,
    };
  });
}

function generateMarketOverview(rng: () => number, muniTreasuryRatios: MuniTreasuryRatio[]): MarketOverview {
  const totalJitter = (rng() - 0.5) * 0.1;
  const totalOutstandingTrillions = Math.round((4.02 + totalJitter) * 100) / 100;

  const issuanceJitter = (rng() - 0.5) * 30;
  const newIssuanceYtdBillions = Math.round((280 + issuanceJitter) * 10) / 10;

  const fundFlows = Math.round(((rng() - 0.45) * 3.5) * 100) / 100;

  const avgMuniYield = muniTreasuryRatios.reduce((sum, pt) => sum + pt.muniAAAYield, 0) / muniTreasuryRatios.length;
  const avgAAAYield = Math.round(avgMuniYield * 100) / 100;

  const avgRatioRaw = muniTreasuryRatios.reduce((sum, pt) => sum + pt.ratio, 0) / muniTreasuryRatios.length;
  const avgMuniTreasuryRatio = Math.round(avgRatioRaw * 10) / 10;

  const adRatio = Math.round((0.8 + rng() * 0.9) * 100) / 100;

  const defaultJitter = rng() * 4;
  const historicalDefaultRateBps = Math.round((2.0 + defaultJitter) * 10) / 10;

  const taxExemptJitter = (rng() - 0.5) * 2;
  const taxExemptPctOfTotal = Math.round((82.5 + taxExemptJitter) * 10) / 10;

  return {
    totalOutstandingTrillions,
    newIssuanceYtdBillions,
    weeklyFundFlowsBillions: fundFlows,
    avgAAAYield,
    avgMuniTreasuryRatio,
    advanceDeclineRatio: adRatio,
    historicalDefaultRateBps,
    taxExemptPctOfTotal,
    timestamp: new Date().toISOString(),
  };
}

// ── Main data generation ──

function generateMunicipalCreditAnalysisData(): MunicipalCreditAnalysisResponse {
  const rng = seededRandom('municipal-credit-analysis');

  const issuers = generateIssuers(rng);
  const revenueGoBreakdown = generateRevenueGoBreakdown(rng);
  const muniTreasuryRatios = generateMuniTreasuryRatios(rng);
  const recentRatingActions = generateRatingActions(rng);
  const sectorBreakdown = generateSectorBreakdown(rng);
  const stateCreditSummaries = generateStateCreditSummaries(rng);
  const marketOverview = generateMarketOverview(rng, muniTreasuryRatios);

  return {
    issuers,
    revenueGoBreakdown,
    muniTreasuryRatios,
    recentRatingActions,
    sectorBreakdown,
    stateCreditSummaries,
    marketOverview,
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

    const data = generateMunicipalCreditAnalysisData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MunicipalCreditAnalysis] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(502).json({ error: 'Failed to generate municipal credit analysis data' });
  }
});

export default router;
