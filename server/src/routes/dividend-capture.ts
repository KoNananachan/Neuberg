import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface UpcomingExDate {
  ticker: string;
  name: string;
  exDate: string;
  recordDate: string;
  paymentDate: string;
  dividendAmount: number;
  yieldPct: number;
  frequency: 'Quarterly' | 'Semi-Annual' | 'Annual' | 'Monthly';
  qualification: 'Qualified' | 'Non-Qualified';
}

interface HighYieldOpportunity {
  ticker: string;
  name: string;
  exDate: string;
  dividendAmount: number;
  yieldPct: number;
  captureScore: number;
  avgVolume: number;
  bidAskSpread: number;
  daysToEx: number;
}

interface CaptureCalendarDay {
  date: string;
  dayOfWeek: string;
  entries: { ticker: string; dividendAmount: number; yieldPct: number }[];
}

interface HistoricalCapture {
  ticker: string;
  buyDate: string;
  exDate: string;
  sellDate: string;
  dividendReceived: number;
  priceChange: number;
  netReturn: number;
}

interface SectorYield {
  sector: string;
  avgYieldPct: number;
  medianYieldPct: number;
  stockCount: number;
  change3m: number;
}

interface SpecialDividend {
  ticker: string;
  company: string;
  amount: number;
  exDate: string;
  reason: string;
}

interface DividendAristocrat {
  ticker: string;
  name: string;
  consecutiveYears: number;
  currentYieldPct: number;
  payoutRatioPct: number;
  fiveYrGrowthRatePct: number;
  classification: 'King' | 'Aristocrat' | 'Achiever';
}

interface RiskMetric {
  ticker: string;
  name: string;
  payoutRatioPct: number;
  debtToEquity: number;
  fcfCoverage: number;
  earningsStability: number;
  cutRisk: 'LOW' | 'MODERATE' | 'HIGH';
}

interface DividendCaptureResponse {
  upcomingExDates: UpcomingExDate[];
  highYieldOpportunities: HighYieldOpportunity[];
  captureCalendar: CaptureCalendarDay[];
  historicalCapture: HistoricalCapture[];
  sectorYields: SectorYield[];
  specialDividends: SpecialDividend[];
  dividendAristocrats: DividendAristocrat[];
  riskMetrics: RiskMetric[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: DividendCaptureResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Upcoming Ex-Date configuration ──

interface ExDateConfig {
  ticker: string;
  name: string;
  baseDividend: number;
  baseYield: number;
  frequency: 'Quarterly' | 'Semi-Annual' | 'Annual' | 'Monthly';
  qualification: 'Qualified' | 'Non-Qualified';
  dayOffset: number; // days from today for ex-date
}

const EX_DATE_CONFIGS: ExDateConfig[] = [
  { ticker: 'JNJ', name: 'Johnson & Johnson', baseDividend: 1.24, baseYield: 3.15, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 2 },
  { ticker: 'PG', name: 'Procter & Gamble', baseDividend: 1.0065, baseYield: 2.48, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 3 },
  { ticker: 'XOM', name: 'Exxon Mobil', baseDividend: 0.95, baseYield: 3.42, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 4 },
  { ticker: 'T', name: 'AT&T Inc', baseDividend: 0.2775, baseYield: 6.52, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 5 },
  { ticker: 'O', name: 'Realty Income', baseDividend: 0.2625, baseYield: 5.68, frequency: 'Monthly', qualification: 'Non-Qualified', dayOffset: 6 },
  { ticker: 'VZ', name: 'Verizon Communications', baseDividend: 0.665, baseYield: 6.38, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 7 },
  { ticker: 'MO', name: 'Altria Group', baseDividend: 1.02, baseYield: 8.15, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 8 },
  { ticker: 'KO', name: 'Coca-Cola Co', baseDividend: 0.485, baseYield: 3.05, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 9 },
  { ticker: 'PFE', name: 'Pfizer Inc', baseDividend: 0.42, baseYield: 5.72, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 10 },
  { ticker: 'AGNC', name: 'AGNC Investment', baseDividend: 0.12, baseYield: 14.85, frequency: 'Monthly', qualification: 'Non-Qualified', dayOffset: 3 },
  { ticker: 'EPD', name: 'Enterprise Products Partners', baseDividend: 0.525, baseYield: 7.12, frequency: 'Quarterly', qualification: 'Non-Qualified', dayOffset: 5 },
  { ticker: 'ABBV', name: 'AbbVie Inc', baseDividend: 1.55, baseYield: 3.65, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 11 },
  { ticker: 'CVX', name: 'Chevron Corp', baseDividend: 1.63, baseYield: 4.18, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 12 },
  { ticker: 'IBM', name: 'International Business Machines', baseDividend: 1.67, baseYield: 3.28, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 14 },
  { ticker: 'PM', name: 'Philip Morris International', baseDividend: 1.30, baseYield: 5.05, frequency: 'Quarterly', qualification: 'Qualified', dayOffset: 6 },
];

// ── Sector yield configuration ──

interface SectorConfig {
  sector: string;
  baseAvgYield: number;
  baseMedianYield: number;
  stockCount: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Utilities', baseAvgYield: 3.82, baseMedianYield: 3.55, stockCount: 62 },
  { sector: 'REITs', baseAvgYield: 4.45, baseMedianYield: 4.10, stockCount: 185 },
  { sector: 'Financials', baseAvgYield: 2.85, baseMedianYield: 2.40, stockCount: 410 },
  { sector: 'Healthcare', baseAvgYield: 1.92, baseMedianYield: 1.65, stockCount: 245 },
  { sector: 'Consumer Staples', baseAvgYield: 2.68, baseMedianYield: 2.45, stockCount: 95 },
  { sector: 'Energy', baseAvgYield: 3.95, baseMedianYield: 3.60, stockCount: 120 },
  { sector: 'Industrials', baseAvgYield: 1.75, baseMedianYield: 1.52, stockCount: 310 },
  { sector: 'Materials', baseAvgYield: 2.10, baseMedianYield: 1.85, stockCount: 88 },
  { sector: 'Communication Services', baseAvgYield: 1.45, baseMedianYield: 0.95, stockCount: 72 },
  { sector: 'Technology', baseAvgYield: 0.85, baseMedianYield: 0.62, stockCount: 380 },
];

// ── Special dividend configuration ──

interface SpecialDividendConfig {
  ticker: string;
  company: string;
  baseAmount: number;
  reason: string;
  dayOffset: number;
}

const SPECIAL_DIVIDEND_CONFIGS: SpecialDividendConfig[] = [
  { ticker: 'COST', company: 'Costco Wholesale', baseAmount: 15.00, reason: 'Excess cash return to shareholders', dayOffset: 18 },
  { ticker: 'MSFT', company: 'Microsoft Corp', baseAmount: 3.00, reason: 'One-time special distribution', dayOffset: 22 },
  { ticker: 'FANG', company: 'Diamondback Energy', baseAmount: 2.85, reason: 'Variable dividend from excess FCF', dayOffset: 8 },
  { ticker: 'DVN', company: 'Devon Energy', baseAmount: 1.40, reason: 'Variable dividend tied to commodity prices', dayOffset: 12 },
  { ticker: 'LRCX', company: 'Lam Research', baseAmount: 5.00, reason: 'Special capital return program', dayOffset: 25 },
];

// ── Dividend aristocrat configuration ──

interface AristocratConfig {
  ticker: string;
  name: string;
  consecutiveYears: number;
  baseYield: number;
  basePayoutRatio: number;
  baseFiveYrGrowth: number;
  classification: 'King' | 'Aristocrat' | 'Achiever';
}

const ARISTOCRAT_CONFIGS: AristocratConfig[] = [
  { ticker: 'PG', name: 'Procter & Gamble', consecutiveYears: 68, baseYield: 2.48, basePayoutRatio: 62.5, baseFiveYrGrowth: 5.8, classification: 'King' },
  { ticker: 'KO', name: 'Coca-Cola Co', consecutiveYears: 62, baseYield: 3.05, basePayoutRatio: 72.1, baseFiveYrGrowth: 3.2, classification: 'King' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', consecutiveYears: 62, baseYield: 3.15, basePayoutRatio: 45.8, baseFiveYrGrowth: 5.5, classification: 'King' },
  { ticker: 'CL', name: 'Colgate-Palmolive', consecutiveYears: 61, baseYield: 2.35, basePayoutRatio: 58.2, baseFiveYrGrowth: 3.0, classification: 'King' },
  { ticker: 'EMR', name: 'Emerson Electric', consecutiveYears: 67, baseYield: 1.95, basePayoutRatio: 42.6, baseFiveYrGrowth: 1.8, classification: 'King' },
  { ticker: 'MMM', name: '3M Company', consecutiveYears: 65, baseYield: 5.52, basePayoutRatio: 85.3, baseFiveYrGrowth: 0.9, classification: 'King' },
  { ticker: 'ABBV', name: 'AbbVie Inc', consecutiveYears: 52, baseYield: 3.65, basePayoutRatio: 48.7, baseFiveYrGrowth: 8.5, classification: 'Aristocrat' },
  { ticker: 'XOM', name: 'Exxon Mobil', consecutiveYears: 41, baseYield: 3.42, basePayoutRatio: 44.2, baseFiveYrGrowth: 3.5, classification: 'Aristocrat' },
  { ticker: 'CVX', name: 'Chevron Corp', consecutiveYears: 37, baseYield: 4.18, basePayoutRatio: 52.8, baseFiveYrGrowth: 6.1, classification: 'Aristocrat' },
  { ticker: 'T', name: 'AT&T Inc', consecutiveYears: 26, baseYield: 6.52, basePayoutRatio: 54.3, baseFiveYrGrowth: 1.2, classification: 'Achiever' },
  { ticker: 'IBM', name: 'International Business Machines', consecutiveYears: 28, baseYield: 3.28, basePayoutRatio: 67.8, baseFiveYrGrowth: 1.0, classification: 'Achiever' },
  { ticker: 'MCD', name: "McDonald's Corp", consecutiveYears: 48, baseYield: 2.22, basePayoutRatio: 55.4, baseFiveYrGrowth: 7.5, classification: 'Aristocrat' },
];

// ── Risk metric configuration ──

interface RiskConfig {
  ticker: string;
  name: string;
  basePayoutRatio: number;
  baseDebtToEquity: number;
  baseFcfCoverage: number;
  baseEarningsStability: number;
}

const RISK_CONFIGS: RiskConfig[] = [
  { ticker: 'T', name: 'AT&T Inc', basePayoutRatio: 54.3, baseDebtToEquity: 1.32, baseFcfCoverage: 2.1, baseEarningsStability: 72 },
  { ticker: 'VZ', name: 'Verizon Communications', basePayoutRatio: 57.1, baseDebtToEquity: 1.65, baseFcfCoverage: 1.8, baseEarningsStability: 75 },
  { ticker: 'MO', name: 'Altria Group', basePayoutRatio: 78.5, baseDebtToEquity: 2.85, baseFcfCoverage: 1.3, baseEarningsStability: 65 },
  { ticker: 'MMM', name: '3M Company', basePayoutRatio: 85.3, baseDebtToEquity: 1.92, baseFcfCoverage: 1.1, baseEarningsStability: 55 },
  { ticker: 'AGNC', name: 'AGNC Investment', basePayoutRatio: 92.4, baseDebtToEquity: 8.50, baseFcfCoverage: 0.95, baseEarningsStability: 38 },
  { ticker: 'PFE', name: 'Pfizer Inc', basePayoutRatio: 68.2, baseDebtToEquity: 0.82, baseFcfCoverage: 1.6, baseEarningsStability: 60 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', basePayoutRatio: 45.8, baseDebtToEquity: 0.45, baseFcfCoverage: 3.2, baseEarningsStability: 92 },
  { ticker: 'KO', name: 'Coca-Cola Co', basePayoutRatio: 72.1, baseDebtToEquity: 1.52, baseFcfCoverage: 2.5, baseEarningsStability: 88 },
  { ticker: 'XOM', name: 'Exxon Mobil', basePayoutRatio: 44.2, baseDebtToEquity: 0.28, baseFcfCoverage: 3.8, baseEarningsStability: 58 },
  { ticker: 'O', name: 'Realty Income', basePayoutRatio: 76.8, baseDebtToEquity: 0.72, baseFcfCoverage: 1.4, baseEarningsStability: 82 },
  { ticker: 'EPD', name: 'Enterprise Products Partners', basePayoutRatio: 68.5, baseDebtToEquity: 1.05, baseFcfCoverage: 1.9, baseEarningsStability: 70 },
  { ticker: 'IBM', name: 'International Business Machines', basePayoutRatio: 67.8, baseDebtToEquity: 2.45, baseFcfCoverage: 1.5, baseEarningsStability: 68 },
];

// ── Historical capture configuration ──

interface HistoricalCaptureConfig {
  ticker: string;
  baseDividend: number;
  basePriceChange: number;
  daysBeforeEx: number; // how many days ago the ex-date was
}

const HISTORICAL_CONFIGS: HistoricalCaptureConfig[] = [
  { ticker: 'JNJ', baseDividend: 1.24, basePriceChange: -0.85, daysBeforeEx: 5 },
  { ticker: 'PG', baseDividend: 1.0065, basePriceChange: -0.62, daysBeforeEx: 8 },
  { ticker: 'XOM', baseDividend: 0.95, basePriceChange: -1.15, daysBeforeEx: 12 },
  { ticker: 'T', baseDividend: 0.2775, basePriceChange: -0.18, daysBeforeEx: 15 },
  { ticker: 'VZ', baseDividend: 0.665, basePriceChange: -0.42, daysBeforeEx: 18 },
  { ticker: 'KO', baseDividend: 0.485, basePriceChange: -0.28, daysBeforeEx: 22 },
  { ticker: 'MO', baseDividend: 1.02, basePriceChange: -0.78, daysBeforeEx: 25 },
  { ticker: 'CVX', baseDividend: 1.63, basePriceChange: -1.35, daysBeforeEx: 28 },
  { ticker: 'ABBV', baseDividend: 1.55, basePriceChange: -0.95, daysBeforeEx: 32 },
  { ticker: 'O', baseDividend: 0.2625, basePriceChange: -0.15, daysBeforeEx: 35 },
];

// ── Helper: date formatting ──

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Data generation ──

function generateUpcomingExDates(rng: () => number): UpcomingExDate[] {
  const today = new Date();

  return EX_DATE_CONFIGS.map((cfg) => {
    const dividendJitter = (rng() - 0.5) * cfg.baseDividend * 0.05;
    const dividendAmount = Math.round((cfg.baseDividend + dividendJitter) * 10000) / 10000;

    const yieldJitter = (rng() - 0.5) * cfg.baseYield * 0.08;
    const yieldPct = Math.round((cfg.baseYield + yieldJitter) * 100) / 100;

    const exDate = addDays(today, cfg.dayOffset);
    const recordDate = addDays(exDate, 1);
    const paymentDate = addDays(exDate, 14 + Math.floor(rng() * 14));

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      exDate: formatDate(exDate),
      recordDate: formatDate(recordDate),
      paymentDate: formatDate(paymentDate),
      dividendAmount,
      yieldPct,
      frequency: cfg.frequency,
      qualification: cfg.qualification,
    };
  });
}

function generateHighYieldOpportunities(rng: () => number, exDates: UpcomingExDate[]): HighYieldOpportunity[] {
  // Sort by yield descending and pick top opportunities
  const sorted = [...exDates].sort((a, b) => b.yieldPct - a.yieldPct);
  const top = sorted.slice(0, 10);

  return top.map((entry) => {
    const captureScore = Math.round((entry.yieldPct * 10 + (rng() - 0.3) * 15) * 10) / 10;
    const avgVolume = Math.round(1_000_000 + rng() * 25_000_000);
    const bidAskSpread = Math.round((0.01 + rng() * 0.04) * 100) / 100;

    const today = new Date();
    const exDateObj = new Date(entry.exDate);
    const daysToEx = Math.max(1, Math.round((exDateObj.getTime() - today.getTime()) / 86_400_000));

    return {
      ticker: entry.ticker,
      name: entry.name,
      exDate: entry.exDate,
      dividendAmount: entry.dividendAmount,
      yieldPct: entry.yieldPct,
      captureScore: Math.max(10, Math.min(99, captureScore)),
      avgVolume,
      bidAskSpread,
      daysToEx,
    };
  });
}

function generateCaptureCalendar(rng: () => number, exDates: UpcomingExDate[]): CaptureCalendarDay[] {
  const today = new Date();
  const calendar: CaptureCalendarDay[] = [];

  // Generate 5 weekdays (Mon-Fri of the upcoming week)
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i);
    const dayOfWeek = date.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dayStr = formatDate(date);
    const dayEntries = exDates
      .filter((e) => e.exDate === dayStr)
      .map((e) => ({
        ticker: e.ticker,
        dividendAmount: e.dividendAmount,
        yieldPct: e.yieldPct,
      }));

    // If no real entries, add a few synthetic ones for realism
    if (dayEntries.length === 0) {
      const syntheticTickers = ['INTC', 'WBA', 'DOW', 'NEM', 'HPQ', 'SWK', 'BEN', 'CAG'];
      const count = 1 + Math.floor(rng() * 3);
      for (let j = 0; j < count; j++) {
        const idx = Math.floor(rng() * syntheticTickers.length);
        dayEntries.push({
          ticker: syntheticTickers[idx],
          dividendAmount: Math.round((0.15 + rng() * 1.2) * 10000) / 10000,
          yieldPct: Math.round((1.5 + rng() * 5.0) * 100) / 100,
        });
      }
    }

    calendar.push({
      date: dayStr,
      dayOfWeek: DAY_NAMES[dayOfWeek],
      entries: dayEntries,
    });
  }

  return calendar;
}

function generateHistoricalCapture(rng: () => number): HistoricalCapture[] {
  const today = new Date();

  return HISTORICAL_CONFIGS.map((cfg) => {
    const dividendJitter = (rng() - 0.5) * cfg.baseDividend * 0.05;
    const dividendReceived = Math.round((cfg.baseDividend + dividendJitter) * 10000) / 10000;

    const priceJitter = (rng() - 0.5) * Math.abs(cfg.basePriceChange) * 0.4;
    const priceChange = Math.round((cfg.basePriceChange + priceJitter) * 100) / 100;

    const netReturn = Math.round((dividendReceived + priceChange) * 100) / 100;

    const exDate = addDays(today, -cfg.daysBeforeEx);
    const buyDate = addDays(exDate, -1);
    const sellDate = addDays(exDate, 1 + Math.floor(rng() * 2));

    return {
      ticker: cfg.ticker,
      buyDate: formatDate(buyDate),
      exDate: formatDate(exDate),
      sellDate: formatDate(sellDate),
      dividendReceived,
      priceChange,
      netReturn,
    };
  });
}

function generateSectorYields(rng: () => number): SectorYield[] {
  return SECTOR_CONFIGS.map((cfg) => {
    const avgJitter = (rng() - 0.5) * cfg.baseAvgYield * 0.1;
    const avgYieldPct = Math.round((cfg.baseAvgYield + avgJitter) * 100) / 100;

    const medianJitter = (rng() - 0.5) * cfg.baseMedianYield * 0.1;
    const medianYieldPct = Math.round((cfg.baseMedianYield + medianJitter) * 100) / 100;

    const countJitter = Math.floor((rng() - 0.5) * cfg.stockCount * 0.08);
    const stockCount = cfg.stockCount + countJitter;

    const change3m = Math.round((rng() - 0.5) * 0.6 * 100) / 100;

    return {
      sector: cfg.sector,
      avgYieldPct,
      medianYieldPct,
      stockCount,
      change3m,
    };
  });
}

function generateSpecialDividends(rng: () => number): SpecialDividend[] {
  const today = new Date();

  return SPECIAL_DIVIDEND_CONFIGS.map((cfg) => {
    const amountJitter = (rng() - 0.5) * cfg.baseAmount * 0.1;
    const amount = Math.round((cfg.baseAmount + amountJitter) * 100) / 100;

    const exDate = addDays(today, cfg.dayOffset);

    return {
      ticker: cfg.ticker,
      company: cfg.company,
      amount,
      exDate: formatDate(exDate),
      reason: cfg.reason,
    };
  });
}

function generateDividendAristocrats(rng: () => number): DividendAristocrat[] {
  return ARISTOCRAT_CONFIGS.map((cfg) => {
    const yieldJitter = (rng() - 0.5) * cfg.baseYield * 0.08;
    const currentYieldPct = Math.round((cfg.baseYield + yieldJitter) * 100) / 100;

    const payoutJitter = (rng() - 0.5) * cfg.basePayoutRatio * 0.06;
    const payoutRatioPct = Math.round((cfg.basePayoutRatio + payoutJitter) * 10) / 10;

    const growthJitter = (rng() - 0.5) * cfg.baseFiveYrGrowth * 0.1;
    const fiveYrGrowthRatePct = Math.round((cfg.baseFiveYrGrowth + growthJitter) * 10) / 10;

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      consecutiveYears: cfg.consecutiveYears,
      currentYieldPct,
      payoutRatioPct,
      fiveYrGrowthRatePct,
      classification: cfg.classification,
    };
  });
}

function generateRiskMetrics(rng: () => number): RiskMetric[] {
  return RISK_CONFIGS.map((cfg) => {
    const payoutJitter = (rng() - 0.5) * cfg.basePayoutRatio * 0.08;
    const payoutRatioPct = Math.round((cfg.basePayoutRatio + payoutJitter) * 10) / 10;

    const debtJitter = (rng() - 0.5) * cfg.baseDebtToEquity * 0.1;
    const debtToEquity = Math.round((cfg.baseDebtToEquity + debtJitter) * 100) / 100;

    const fcfJitter = (rng() - 0.5) * cfg.baseFcfCoverage * 0.12;
    const fcfCoverage = Math.round((cfg.baseFcfCoverage + fcfJitter) * 100) / 100;

    const stabilityJitter = (rng() - 0.5) * cfg.baseEarningsStability * 0.08;
    const earningsStability = Math.round(Math.max(0, Math.min(100, cfg.baseEarningsStability + stabilityJitter)));

    // Cut risk assessment
    let cutRisk: 'LOW' | 'MODERATE' | 'HIGH';
    if (payoutRatioPct > 85 || fcfCoverage < 1.0 || earningsStability < 45) {
      cutRisk = 'HIGH';
    } else if (payoutRatioPct > 65 || fcfCoverage < 1.5 || earningsStability < 65) {
      cutRisk = 'MODERATE';
    } else {
      cutRisk = 'LOW';
    }

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      payoutRatioPct,
      debtToEquity,
      fcfCoverage,
      earningsStability,
      cutRisk,
    };
  });
}

function generateDividendCaptureData(): DividendCaptureResponse {
  const rng = seededRandom('dividend-capture');

  const upcomingExDates = generateUpcomingExDates(rng);
  const highYieldOpportunities = generateHighYieldOpportunities(rng, upcomingExDates);
  const captureCalendar = generateCaptureCalendar(rng, upcomingExDates);
  const historicalCapture = generateHistoricalCapture(rng);
  const sectorYields = generateSectorYields(rng);
  const specialDividends = generateSpecialDividends(rng);
  const dividendAristocrats = generateDividendAristocrats(rng);
  const riskMetrics = generateRiskMetrics(rng);

  return {
    upcomingExDates,
    highYieldOpportunities,
    captureCalendar,
    historicalCapture,
    sectorYields,
    specialDividends,
    dividendAristocrats,
    riskMetrics,
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

    const data = generateDividendCaptureData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DividendCapture] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate dividend capture data' });
  }
});

export default router;
