import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface CDSIndex {
  name: string;
  ticker: string;
  region: string;
  currentSpread: number;
  change1d: number;
  change1w: number;
  change1m: number;
  series: number;
  maturity: string;
  currency: string;
}

interface RollCalendarEntry {
  index: string;
  rollDate: string;
  onTheRunSeries: number;
  offTheRunSeries: number;
  rollSpread: number;
  daysToRoll: number;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

interface BasisTradeEntry {
  ratingTier: string;
  sector: string;
  cdsBondBasis: number;
  change1w: number;
  direction: 'POSITIVE' | 'NEGATIVE';
  signal: 'CHEAP CDS' | 'RICH CDS' | 'FAIR VALUE';
}

interface SingleNameMover {
  entity: string;
  ticker: string;
  sector: string;
  spread: number;
  change1d: number;
  change1dPct: number;
  rating: string;
  category: 'TIGHTEST' | 'WIDEST' | 'BIGGEST_MOVER';
}

interface TrancheQuote {
  index: string;
  tranche: string;
  attachmentPoint: number;
  detachmentPoint: number;
  spread: number;
  upfront: number;
  change1d: number;
  impliedCorrelation: number;
}

interface RecoveryRateEntry {
  sector: string;
  impliedRecovery: number;
  historicalRecovery: number;
  delta: number;
  sampleSize: number;
}

interface CreditEventEntry {
  entity: string;
  eventType: 'BANKRUPTCY' | 'FAILURE_TO_PAY' | 'RESTRUCTURING' | 'SUCCESSION';
  status: 'CONFIRMED' | 'PENDING' | 'UNDER_REVIEW';
  date: string;
  recoveryRate: number | null;
  notionalAffected: number;
  details: string;
}

interface CorrelationEntry {
  index: string;
  tranche: string;
  impliedCorrelation: number;
  change1w: number;
  baseCorrelation: number;
}

interface VolumeEntry {
  index: string;
  dailyVolume: number;
  weeklyVolume: number;
  dailyTradeCount: number;
  avgTradeSize: number;
  change1wPct: number;
}

interface CreditDefaultIndexResponse {
  indices: CDSIndex[];
  rollCalendar: RollCalendarEntry[];
  basisTrade: BasisTradeEntry[];
  singleNames: SingleNameMover[];
  trancheTrading: TrancheQuote[];
  recoveryRates: RecoveryRateEntry[];
  creditEvents: CreditEventEntry[];
  correlation: CorrelationEntry[];
  volumes: VolumeEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: CreditDefaultIndexResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Index configuration ──

interface IndexConfig {
  name: string;
  ticker: string;
  region: string;
  baseSpread: number;
  volatility: number;
  series: number;
  maturity: string;
  currency: string;
}

const INDEX_CONFIGS: IndexConfig[] = [
  { name: 'CDX North America Investment Grade', ticker: 'CDX.NA.IG', region: 'North America', baseSpread: 52, volatility: 4, series: 42, maturity: '2029-06-20', currency: 'USD' },
  { name: 'CDX North America High Yield', ticker: 'CDX.NA.HY', region: 'North America', baseSpread: 345, volatility: 25, series: 42, maturity: '2029-06-20', currency: 'USD' },
  { name: 'iTraxx Europe Main', ticker: 'ITRX.EUR.MAIN', region: 'Europe', baseSpread: 58, volatility: 5, series: 41, maturity: '2029-06-20', currency: 'EUR' },
  { name: 'iTraxx Europe Crossover', ticker: 'ITRX.EUR.XOVER', region: 'Europe', baseSpread: 295, volatility: 20, series: 41, maturity: '2029-06-20', currency: 'EUR' },
  { name: 'iTraxx Asia ex-Japan IG', ticker: 'ITRX.ASIA.IG', region: 'Asia', baseSpread: 78, volatility: 6, series: 41, maturity: '2029-06-20', currency: 'USD' },
];

// ── Roll calendar configuration ──

interface RollConfig {
  index: string;
  rollDate: string;
  onTheRunSeries: number;
  offTheRunSeries: number;
  baseRollSpread: number;
}

const ROLL_CONFIGS: RollConfig[] = [
  { index: 'CDX.NA.IG', rollDate: '2026-03-20', onTheRunSeries: 42, offTheRunSeries: 41, baseRollSpread: 1.5 },
  { index: 'CDX.NA.HY', rollDate: '2026-03-20', onTheRunSeries: 42, offTheRunSeries: 41, baseRollSpread: 8.0 },
  { index: 'ITRX.EUR.MAIN', rollDate: '2026-03-20', onTheRunSeries: 41, offTheRunSeries: 40, baseRollSpread: 2.0 },
  { index: 'ITRX.EUR.XOVER', rollDate: '2026-03-20', onTheRunSeries: 41, offTheRunSeries: 40, baseRollSpread: 12.0 },
  { index: 'ITRX.ASIA.IG', rollDate: '2026-06-20', onTheRunSeries: 41, offTheRunSeries: 40, baseRollSpread: 3.0 },
  { index: 'CDX.NA.IG', rollDate: '2026-09-20', onTheRunSeries: 43, offTheRunSeries: 42, baseRollSpread: 1.5 },
  { index: 'CDX.NA.HY', rollDate: '2026-09-20', onTheRunSeries: 43, offTheRunSeries: 42, baseRollSpread: 8.0 },
];

// ── Basis trade configuration ──

interface BasisConfig {
  ratingTier: string;
  sector: string;
  baseBasis: number;
  volatility: number;
}

const BASIS_CONFIGS: BasisConfig[] = [
  { ratingTier: 'AAA/AA', sector: 'Financials', baseBasis: -5, volatility: 4 },
  { ratingTier: 'AAA/AA', sector: 'Industrials', baseBasis: -3, volatility: 3 },
  { ratingTier: 'A', sector: 'Financials', baseBasis: 2, volatility: 5 },
  { ratingTier: 'A', sector: 'Technology', baseBasis: -1, volatility: 4 },
  { ratingTier: 'A', sector: 'Healthcare', baseBasis: 1, volatility: 3 },
  { ratingTier: 'BBB', sector: 'Energy', baseBasis: 8, volatility: 7 },
  { ratingTier: 'BBB', sector: 'Consumer', baseBasis: 5, volatility: 5 },
  { ratingTier: 'BBB', sector: 'Telecoms', baseBasis: 6, volatility: 6 },
  { ratingTier: 'BB', sector: 'Energy', baseBasis: 18, volatility: 12 },
  { ratingTier: 'BB', sector: 'Retail', baseBasis: 22, volatility: 15 },
  { ratingTier: 'B', sector: 'Media', baseBasis: 35, volatility: 20 },
  { ratingTier: 'B', sector: 'Industrials', baseBasis: 28, volatility: 18 },
];

// ── Single name configuration ──

interface SingleNameConfig {
  entity: string;
  ticker: string;
  sector: string;
  baseSpread: number;
  rating: string;
  category: 'TIGHTEST' | 'WIDEST' | 'BIGGEST_MOVER';
}

const SINGLE_NAME_CONFIGS: SingleNameConfig[] = [
  // Tightest spreads
  { entity: 'Johnson & Johnson', ticker: 'JNJ', sector: 'Healthcare', baseSpread: 28, rating: 'AAA', category: 'TIGHTEST' },
  { entity: 'Microsoft Corp', ticker: 'MSFT', sector: 'Technology', baseSpread: 30, rating: 'AAA', category: 'TIGHTEST' },
  { entity: 'Apple Inc', ticker: 'AAPL', sector: 'Technology', baseSpread: 32, rating: 'AA+', category: 'TIGHTEST' },
  { entity: 'Berkshire Hathaway', ticker: 'BRK', sector: 'Financials', baseSpread: 35, rating: 'AA', category: 'TIGHTEST' },
  { entity: 'JPMorgan Chase', ticker: 'JPM', sector: 'Financials', baseSpread: 42, rating: 'A+', category: 'TIGHTEST' },
  // Widest spreads
  { entity: 'Rite Aid Corp', ticker: 'RAD', sector: 'Retail', baseSpread: 2800, rating: 'CCC-', category: 'WIDEST' },
  { entity: 'Carvana Co', ticker: 'CVNA', sector: 'Consumer', baseSpread: 1450, rating: 'CCC+', category: 'WIDEST' },
  { entity: 'AMC Entertainment', ticker: 'AMC', sector: 'Media', baseSpread: 1680, rating: 'CCC', category: 'WIDEST' },
  { entity: 'Dish Network', ticker: 'DISH', sector: 'Telecoms', baseSpread: 1920, rating: 'CCC-', category: 'WIDEST' },
  { entity: 'Community Health Systems', ticker: 'CYH', sector: 'Healthcare', baseSpread: 1350, rating: 'CCC+', category: 'WIDEST' },
  // Biggest movers
  { entity: 'First Republic Bank', ticker: 'FRC', sector: 'Financials', baseSpread: 520, rating: 'BB+', category: 'BIGGEST_MOVER' },
  { entity: 'Occidental Petroleum', ticker: 'OXY', sector: 'Energy', baseSpread: 145, rating: 'BBB', category: 'BIGGEST_MOVER' },
  { entity: 'Tesla Inc', ticker: 'TSLA', sector: 'Consumer', baseSpread: 185, rating: 'BBB-', category: 'BIGGEST_MOVER' },
  { entity: 'Carnival Corp', ticker: 'CCL', sector: 'Leisure', baseSpread: 380, rating: 'B+', category: 'BIGGEST_MOVER' },
  { entity: 'United Airlines', ticker: 'UAL', sector: 'Transport', baseSpread: 210, rating: 'BB', category: 'BIGGEST_MOVER' },
];

// ── Tranche configuration ──

interface TrancheConfig {
  index: string;
  tranche: string;
  attachmentPoint: number;
  detachmentPoint: number;
  baseSpread: number;
  baseUpfront: number;
  baseImpliedCorrelation: number;
}

const TRANCHE_CONFIGS: TrancheConfig[] = [
  // CDX.NA.IG tranches
  { index: 'CDX.NA.IG', tranche: '0-3%', attachmentPoint: 0, detachmentPoint: 3, baseSpread: 500, baseUpfront: 38.5, baseImpliedCorrelation: 18.5 },
  { index: 'CDX.NA.IG', tranche: '3-7%', attachmentPoint: 3, detachmentPoint: 7, baseSpread: 85, baseUpfront: 0, baseImpliedCorrelation: 28.2 },
  { index: 'CDX.NA.IG', tranche: '7-15%', attachmentPoint: 7, detachmentPoint: 15, baseSpread: 22, baseUpfront: 0, baseImpliedCorrelation: 42.5 },
  { index: 'CDX.NA.IG', tranche: '15-100%', attachmentPoint: 15, detachmentPoint: 100, baseSpread: 5.5, baseUpfront: 0, baseImpliedCorrelation: 62.8 },
  // CDX.NA.HY tranches
  { index: 'CDX.NA.HY', tranche: '0-15%', attachmentPoint: 0, detachmentPoint: 15, baseSpread: 500, baseUpfront: 22.0, baseImpliedCorrelation: 25.3 },
  { index: 'CDX.NA.HY', tranche: '15-25%', attachmentPoint: 15, detachmentPoint: 25, baseSpread: 420, baseUpfront: 0, baseImpliedCorrelation: 38.7 },
  { index: 'CDX.NA.HY', tranche: '25-35%', attachmentPoint: 25, detachmentPoint: 35, baseSpread: 180, baseUpfront: 0, baseImpliedCorrelation: 52.1 },
  { index: 'CDX.NA.HY', tranche: '35-100%', attachmentPoint: 35, detachmentPoint: 100, baseSpread: 48, baseUpfront: 0, baseImpliedCorrelation: 68.4 },
];

// ── Recovery rate configuration ──

interface RecoveryConfig {
  sector: string;
  baseImplied: number;
  baseHistorical: number;
  baseSampleSize: number;
}

const RECOVERY_CONFIGS: RecoveryConfig[] = [
  { sector: 'Financials - Senior', baseImplied: 40.0, baseHistorical: 42.5, baseSampleSize: 285 },
  { sector: 'Financials - Subordinated', baseImplied: 18.5, baseHistorical: 21.3, baseSampleSize: 142 },
  { sector: 'Energy', baseImplied: 35.0, baseHistorical: 33.8, baseSampleSize: 198 },
  { sector: 'Technology', baseImplied: 42.0, baseHistorical: 44.2, baseSampleSize: 95 },
  { sector: 'Healthcare', baseImplied: 38.5, baseHistorical: 36.7, baseSampleSize: 112 },
  { sector: 'Consumer', baseImplied: 32.0, baseHistorical: 30.5, baseSampleSize: 245 },
  { sector: 'Telecoms', baseImplied: 28.5, baseHistorical: 31.0, baseSampleSize: 88 },
  { sector: 'Industrials', baseImplied: 37.0, baseHistorical: 39.2, baseSampleSize: 310 },
  { sector: 'Utilities', baseImplied: 55.0, baseHistorical: 58.3, baseSampleSize: 62 },
  { sector: 'Real Estate', baseImplied: 45.0, baseHistorical: 42.8, baseSampleSize: 78 },
];

// ── Credit event configuration ──

interface CreditEventConfig {
  entity: string;
  eventType: 'BANKRUPTCY' | 'FAILURE_TO_PAY' | 'RESTRUCTURING' | 'SUCCESSION';
  status: 'CONFIRMED' | 'PENDING' | 'UNDER_REVIEW';
  daysAgo: number;
  baseRecovery: number | null;
  baseNotional: number;
  details: string;
}

const CREDIT_EVENT_CONFIGS: CreditEventConfig[] = [
  { entity: 'Envision Healthcare', eventType: 'BANKRUPTCY', status: 'CONFIRMED', daysAgo: 3, baseRecovery: 12.5, baseNotional: 7.2, details: 'Chapter 11 filing; ISDA DC determination pending auction' },
  { entity: 'Rite Aid Corp', eventType: 'FAILURE_TO_PAY', status: 'CONFIRMED', daysAgo: 8, baseRecovery: 8.0, baseNotional: 4.8, details: 'Missed coupon payment on senior unsecured notes; grace period expired' },
  { entity: 'Hertz Global', eventType: 'RESTRUCTURING', status: 'PENDING', daysAgo: 1, baseRecovery: null, baseNotional: 5.5, details: 'Exchange offer on senior notes; ISDA DC reviewing whether triggering event' },
  { entity: 'SunEdison Inc', eventType: 'SUCCESSION', status: 'UNDER_REVIEW', daysAgo: 12, baseRecovery: null, baseNotional: 3.1, details: 'Corporate spin-off; successor entity determination in progress' },
  { entity: 'Revlon Inc', eventType: 'BANKRUPTCY', status: 'CONFIRMED', daysAgo: 18, baseRecovery: 3.5, baseNotional: 2.9, details: 'CDS auction completed; final price set at 3.5 cents' },
  { entity: 'Diamond Sports Group', eventType: 'FAILURE_TO_PAY', status: 'CONFIRMED', daysAgo: 5, baseRecovery: 6.0, baseNotional: 8.4, details: 'Defaulted on term loan interest; CDS trigger confirmed by ISDA DC' },
  { entity: 'Bed Bath & Beyond', eventType: 'BANKRUPTCY', status: 'CONFIRMED', daysAgo: 22, baseRecovery: 1.5, baseNotional: 1.8, details: 'Chapter 7 liquidation; CDS auction final price 1.5 cents' },
  { entity: 'Talen Energy', eventType: 'RESTRUCTURING', status: 'PENDING', daysAgo: 2, baseRecovery: null, baseNotional: 6.3, details: 'Debt exchange proposal; bondholders negotiating terms' },
];

// ── Correlation configuration ──

interface CorrelationConfig {
  index: string;
  tranche: string;
  baseImpliedCorrelation: number;
  baseBaseCorrelation: number;
  volatility: number;
}

const CORRELATION_CONFIGS: CorrelationConfig[] = [
  { index: 'CDX.NA.IG', tranche: '0-3%', baseImpliedCorrelation: 18.5, baseBaseCorrelation: 18.5, volatility: 2.0 },
  { index: 'CDX.NA.IG', tranche: '3-7%', baseImpliedCorrelation: 28.2, baseBaseCorrelation: 32.4, volatility: 2.5 },
  { index: 'CDX.NA.IG', tranche: '7-15%', baseImpliedCorrelation: 42.5, baseBaseCorrelation: 48.8, volatility: 3.0 },
  { index: 'CDX.NA.IG', tranche: '15-100%', baseImpliedCorrelation: 62.8, baseBaseCorrelation: 72.1, volatility: 3.5 },
  { index: 'CDX.NA.HY', tranche: '0-15%', baseImpliedCorrelation: 25.3, baseBaseCorrelation: 25.3, volatility: 2.5 },
  { index: 'CDX.NA.HY', tranche: '15-25%', baseImpliedCorrelation: 38.7, baseBaseCorrelation: 44.2, volatility: 3.0 },
  { index: 'CDX.NA.HY', tranche: '25-35%', baseImpliedCorrelation: 52.1, baseBaseCorrelation: 58.5, volatility: 3.5 },
  { index: 'CDX.NA.HY', tranche: '35-100%', baseImpliedCorrelation: 68.4, baseBaseCorrelation: 76.8, volatility: 4.0 },
  { index: 'ITRX.EUR.MAIN', tranche: '0-3%', baseImpliedCorrelation: 20.1, baseBaseCorrelation: 20.1, volatility: 2.2 },
  { index: 'ITRX.EUR.MAIN', tranche: '3-6%', baseImpliedCorrelation: 30.5, baseBaseCorrelation: 35.0, volatility: 2.8 },
  { index: 'ITRX.EUR.MAIN', tranche: '6-12%', baseImpliedCorrelation: 45.2, baseBaseCorrelation: 51.3, volatility: 3.2 },
  { index: 'ITRX.EUR.MAIN', tranche: '12-100%', baseImpliedCorrelation: 65.0, baseBaseCorrelation: 74.5, volatility: 3.8 },
];

// ── Volume configuration ──

interface VolumeConfig {
  index: string;
  baseDailyVolume: number;
  baseDailyTradeCount: number;
  baseAvgTradeSize: number;
}

const VOLUME_CONFIGS: VolumeConfig[] = [
  { index: 'CDX.NA.IG', baseDailyVolume: 42.5, baseDailyTradeCount: 4800, baseAvgTradeSize: 8.85 },
  { index: 'CDX.NA.HY', baseDailyVolume: 28.3, baseDailyTradeCount: 3200, baseAvgTradeSize: 8.84 },
  { index: 'ITRX.EUR.MAIN', baseDailyVolume: 35.8, baseDailyTradeCount: 3900, baseAvgTradeSize: 9.18 },
  { index: 'ITRX.EUR.XOVER', baseDailyVolume: 18.6, baseDailyTradeCount: 2100, baseAvgTradeSize: 8.86 },
  { index: 'ITRX.ASIA.IG', baseDailyVolume: 8.2, baseDailyTradeCount: 950, baseAvgTradeSize: 8.63 },
];

// ── Data generation ──

function generateIndices(rng: () => number): CDSIndex[] {
  return INDEX_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const currentSpread = Math.round((cfg.baseSpread + jitter) * 100) / 100;

    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.8 * 100) / 100;
    const change1w = Math.round((rng() - 0.5) * cfg.volatility * 2.0 * 100) / 100;
    const change1m = Math.round((rng() - 0.5) * cfg.volatility * 4.0 * 100) / 100;

    return {
      name: cfg.name,
      ticker: cfg.ticker,
      region: cfg.region,
      currentSpread,
      change1d,
      change1w,
      change1m,
      series: cfg.series,
      maturity: cfg.maturity,
      currency: cfg.currency,
    };
  });
}

function generateRollCalendar(rng: () => number): RollCalendarEntry[] {
  const today = new Date().toISOString().slice(0, 10);

  return ROLL_CONFIGS.map((cfg) => {
    const rollSpreadJitter = (rng() - 0.5) * cfg.baseRollSpread * 0.4;
    const rollSpread = Math.round((cfg.baseRollSpread + rollSpreadJitter) * 100) / 100;

    const rollDate = new Date(cfg.rollDate);
    const todayDate = new Date(today);
    const daysToRoll = Math.round((rollDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
    if (daysToRoll < 0) {
      status = 'COMPLETED';
    } else if (daysToRoll <= 14) {
      status = 'ACTIVE';
    } else {
      status = 'UPCOMING';
    }

    return {
      index: cfg.index,
      rollDate: cfg.rollDate,
      onTheRunSeries: cfg.onTheRunSeries,
      offTheRunSeries: cfg.offTheRunSeries,
      rollSpread,
      daysToRoll: Math.max(0, daysToRoll),
      status,
    };
  });
}

function generateBasisTrade(rng: () => number): BasisTradeEntry[] {
  return BASIS_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const cdsBondBasis = Math.round((cfg.baseBasis + jitter) * 10) / 10;

    const change1w = Math.round((rng() - 0.5) * cfg.volatility * 100) / 100;

    const direction: 'POSITIVE' | 'NEGATIVE' = cdsBondBasis >= 0 ? 'POSITIVE' : 'NEGATIVE';

    let signal: 'CHEAP CDS' | 'RICH CDS' | 'FAIR VALUE';
    if (cdsBondBasis > 5) {
      signal = 'CHEAP CDS';
    } else if (cdsBondBasis < -5) {
      signal = 'RICH CDS';
    } else {
      signal = 'FAIR VALUE';
    }

    return {
      ratingTier: cfg.ratingTier,
      sector: cfg.sector,
      cdsBondBasis,
      change1w,
      direction,
      signal,
    };
  });
}

function generateSingleNames(rng: () => number): SingleNameMover[] {
  return SINGLE_NAME_CONFIGS.map((cfg) => {
    const spreadJitter = (rng() - 0.5) * cfg.baseSpread * 0.08;
    const spread = Math.round((cfg.baseSpread + spreadJitter) * 100) / 100;

    // Biggest movers get larger daily changes
    const changeScale = cfg.category === 'BIGGEST_MOVER' ? 0.12 : 0.03;
    const change1d = Math.round((rng() - 0.5) * cfg.baseSpread * changeScale * 100) / 100;
    const change1dPct = spread > 0 ? Math.round((change1d / spread) * 10000) / 100 : 0;

    return {
      entity: cfg.entity,
      ticker: cfg.ticker,
      sector: cfg.sector,
      spread,
      change1d,
      change1dPct,
      rating: cfg.rating,
      category: cfg.category,
    };
  });
}

function generateTrancheTrading(rng: () => number): TrancheQuote[] {
  return TRANCHE_CONFIGS.map((cfg) => {
    const spreadJitter = (rng() - 0.5) * cfg.baseSpread * 0.1;
    const spread = Math.round((cfg.baseSpread + spreadJitter) * 100) / 100;

    const upfrontJitter = cfg.baseUpfront > 0 ? (rng() - 0.5) * cfg.baseUpfront * 0.08 : 0;
    const upfront = Math.round((cfg.baseUpfront + upfrontJitter) * 100) / 100;

    const change1d = Math.round((rng() - 0.5) * cfg.baseSpread * 0.04 * 100) / 100;

    const corrJitter = (rng() - 0.5) * 2.0;
    const impliedCorrelation = Math.round((cfg.baseImpliedCorrelation + corrJitter) * 100) / 100;

    return {
      index: cfg.index,
      tranche: cfg.tranche,
      attachmentPoint: cfg.attachmentPoint,
      detachmentPoint: cfg.detachmentPoint,
      spread,
      upfront,
      change1d,
      impliedCorrelation,
    };
  });
}

function generateRecoveryRates(rng: () => number): RecoveryRateEntry[] {
  return RECOVERY_CONFIGS.map((cfg) => {
    const impliedJitter = (rng() - 0.5) * 4;
    const impliedRecovery = Math.round((cfg.baseImplied + impliedJitter) * 10) / 10;

    const historicalJitter = (rng() - 0.5) * 2;
    const historicalRecovery = Math.round((cfg.baseHistorical + historicalJitter) * 10) / 10;

    const delta = Math.round((impliedRecovery - historicalRecovery) * 10) / 10;

    // Sample size varies slightly
    const sampleJitter = Math.floor((rng() - 0.5) * cfg.baseSampleSize * 0.1);
    const sampleSize = cfg.baseSampleSize + sampleJitter;

    return {
      sector: cfg.sector,
      impliedRecovery,
      historicalRecovery,
      delta,
      sampleSize,
    };
  });
}

function generateCreditEvents(rng: () => number): CreditEventEntry[] {
  const today = new Date();

  return CREDIT_EVENT_CONFIGS.map((cfg) => {
    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() - cfg.daysAgo);
    const date = eventDate.toISOString().slice(0, 10);

    // Slight jitter on recovery rate if confirmed
    let recoveryRate = cfg.baseRecovery;
    if (recoveryRate !== null) {
      const recoveryJitter = (rng() - 0.5) * 3;
      recoveryRate = Math.round((recoveryRate + recoveryJitter) * 10) / 10;
      recoveryRate = Math.max(0.5, recoveryRate);
    }

    // Jitter on notional affected
    const notionalJitter = (rng() - 0.5) * cfg.baseNotional * 0.15;
    const notionalAffected = Math.round((cfg.baseNotional + notionalJitter) * 10) / 10;

    return {
      entity: cfg.entity,
      eventType: cfg.eventType,
      status: cfg.status,
      date,
      recoveryRate,
      notionalAffected,
      details: cfg.details,
    };
  });
}

function generateCorrelation(rng: () => number): CorrelationEntry[] {
  return CORRELATION_CONFIGS.map((cfg) => {
    const corrJitter = (rng() - 0.5) * cfg.volatility * 2;
    const impliedCorrelation = Math.round((cfg.baseImpliedCorrelation + corrJitter) * 100) / 100;

    const change1w = Math.round((rng() - 0.5) * cfg.volatility * 100) / 100;

    const baseJitter = (rng() - 0.5) * cfg.volatility * 1.5;
    const baseCorrelation = Math.round((cfg.baseBaseCorrelation + baseJitter) * 100) / 100;

    return {
      index: cfg.index,
      tranche: cfg.tranche,
      impliedCorrelation,
      change1w,
      baseCorrelation,
    };
  });
}

function generateVolumes(rng: () => number): VolumeEntry[] {
  return VOLUME_CONFIGS.map((cfg) => {
    const volumeJitter = (rng() - 0.5) * cfg.baseDailyVolume * 0.2;
    const dailyVolume = Math.round((cfg.baseDailyVolume + volumeJitter) * 10) / 10;
    const weeklyVolume = Math.round(dailyVolume * (4.5 + rng() * 1.0) * 10) / 10;

    const countJitter = Math.floor((rng() - 0.5) * cfg.baseDailyTradeCount * 0.15);
    const dailyTradeCount = cfg.baseDailyTradeCount + countJitter;

    const sizeJitter = (rng() - 0.5) * cfg.baseAvgTradeSize * 0.1;
    const avgTradeSize = Math.round((cfg.baseAvgTradeSize + sizeJitter) * 100) / 100;

    const change1wPct = Math.round((rng() - 0.5) * 18 * 10) / 10;

    return {
      index: cfg.index,
      dailyVolume,
      weeklyVolume,
      dailyTradeCount,
      avgTradeSize,
      change1wPct,
    };
  });
}

function generateCreditDefaultIndexData(): CreditDefaultIndexResponse {
  const rng = seededRandom('credit-default-index');

  return {
    indices: generateIndices(rng),
    rollCalendar: generateRollCalendar(rng),
    basisTrade: generateBasisTrade(rng),
    singleNames: generateSingleNames(rng),
    trancheTrading: generateTrancheTrading(rng),
    recoveryRates: generateRecoveryRates(rng),
    creditEvents: generateCreditEvents(rng),
    correlation: generateCorrelation(rng),
    volumes: generateVolumes(rng),
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

    const data = generateCreditDefaultIndexData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CreditDefaultIndex] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate credit default index data' });
  }
});

export default router;
