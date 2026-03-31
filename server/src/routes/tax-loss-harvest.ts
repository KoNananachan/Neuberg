import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface HarvestCandidate {
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  avgCostBasis: number;
  unrealizedLossPct: number;
  unrealizedLossUsd: number;
  holdingPeriodDays: number;
  washSaleRisk: boolean;
  replacementEtfSuggestion: string;
}

interface TopOpportunity {
  ticker: string;
  lossAmount: number;
  taxRateApplied: number;
  estimatedSavings: number;
  confidence: number;
}

interface WashSaleCalendarEntry {
  ticker: string;
  soldDate: string;
  soldPrice: number;
  washSaleWindowEnd: string;
  daysRemaining: number;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'CLEAR';
}

interface ReplacementPair {
  originalTicker: string;
  originalName: string;
  replacementTicker: string;
  replacementName: string;
  correlationPct: number;
  expenseRatioDiff: number;
  sectorMatch: boolean;
}

interface SectorExposureEntry {
  sector: string;
  currentAllocationPct: number;
  postHarvestAllocationPct: number;
  changePct: number;
}

interface CapitalGainsOffset {
  shortTermGains: number;
  longTermGains: number;
  shortTermHarvestable: number;
  longTermHarvestable: number;
  netShortTermAfterHarvest: number;
  netLongTermAfterHarvest: number;
  additionalCarryforward: number;
}

interface YearEndProjection {
  totalHarvestableLosses: number;
  totalRealizedGains: number;
  netTaxableGains: number;
  estimatedTaxLiability: number;
  projectedSavingsFromHarvest: number;
  effectiveTaxRate: number;
}

interface HistoricalHarvestingEntry {
  year: number;
  lossesHarvested: number;
  taxSavings: number;
  portfolioImpactPct: number;
}

interface TaxLossHarvestResponse {
  harvestCandidates: HarvestCandidate[];
  topOpportunities: TopOpportunity[];
  washSaleCalendar: WashSaleCalendarEntry[];
  replacementPairs: ReplacementPair[];
  sectorExposure: SectorExposureEntry[];
  capitalGainsOffset: CapitalGainsOffset;
  yearEndProjection: YearEndProjection;
  historicalHarvesting: HistoricalHarvestingEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: TaxLossHarvestResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Harvest candidate configuration ──

interface CandidateConfig {
  ticker: string;
  name: string;
  sector: string;
  basePrice: number;
  baseCostBasis: number;
  replacementEtf: string;
}

const CANDIDATE_CONFIGS: CandidateConfig[] = [
  { ticker: 'INTC', name: 'Intel Corporation', sector: 'Technology', basePrice: 24.85, baseCostBasis: 38.50, replacementEtf: 'SMH' },
  { ticker: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare', basePrice: 26.12, baseCostBasis: 42.30, replacementEtf: 'XLV' },
  { ticker: 'NKE', name: 'Nike Inc', sector: 'Consumer Discretionary', basePrice: 72.40, baseCostBasis: 112.80, replacementEtf: 'XLY' },
  { ticker: 'BA', name: 'Boeing Company', sector: 'Industrials', basePrice: 168.25, baseCostBasis: 228.60, replacementEtf: 'XLI' },
  { ticker: 'PARA', name: 'Paramount Global', sector: 'Communication Services', basePrice: 11.35, baseCostBasis: 24.90, replacementEtf: 'XLC' },
  { ticker: 'WBA', name: 'Walgreens Boots Alliance', sector: 'Healthcare', basePrice: 9.80, baseCostBasis: 28.45, replacementEtf: 'XLV' },
  { ticker: 'VFC', name: 'V.F. Corporation', sector: 'Consumer Discretionary', basePrice: 14.60, baseCostBasis: 38.20, replacementEtf: 'XLY' },
  { ticker: 'MMM', name: '3M Company', sector: 'Industrials', basePrice: 102.50, baseCostBasis: 142.75, replacementEtf: 'XLI' },
  { ticker: 'PYPL', name: 'PayPal Holdings', sector: 'Financials', basePrice: 64.30, baseCostBasis: 95.40, replacementEtf: 'XLF' },
  { ticker: 'DIS', name: 'Walt Disney Company', sector: 'Communication Services', basePrice: 88.75, baseCostBasis: 118.20, replacementEtf: 'XLC' },
  { ticker: 'MRNA', name: 'Moderna Inc', sector: 'Healthcare', basePrice: 35.60, baseCostBasis: 82.40, replacementEtf: 'XBI' },
  { ticker: 'SNAP', name: 'Snap Inc', sector: 'Communication Services', basePrice: 10.25, baseCostBasis: 18.90, replacementEtf: 'XLC' },
];

// ── Replacement pair configuration ──

interface ReplacementPairConfig {
  originalTicker: string;
  originalName: string;
  replacementTicker: string;
  replacementName: string;
  baseCorrelation: number;
  expenseRatioDiff: number;
  sectorMatch: boolean;
}

const REPLACEMENT_PAIR_CONFIGS: ReplacementPairConfig[] = [
  { originalTicker: 'INTC', originalName: 'Intel Corporation', replacementTicker: 'SMH', replacementName: 'VanEck Semiconductor ETF', baseCorrelation: 78.5, expenseRatioDiff: 0.10, sectorMatch: true },
  { originalTicker: 'PFE', originalName: 'Pfizer Inc', replacementTicker: 'XLV', replacementName: 'Health Care Select SPDR', baseCorrelation: 72.3, expenseRatioDiff: 0.08, sectorMatch: true },
  { originalTicker: 'NKE', originalName: 'Nike Inc', replacementTicker: 'XLY', replacementName: 'Consumer Discretionary SPDR', baseCorrelation: 68.1, expenseRatioDiff: 0.09, sectorMatch: true },
  { originalTicker: 'BA', originalName: 'Boeing Company', replacementTicker: 'XLI', replacementName: 'Industrial Select SPDR', baseCorrelation: 74.8, expenseRatioDiff: 0.07, sectorMatch: true },
  { originalTicker: 'PARA', originalName: 'Paramount Global', replacementTicker: 'XLC', replacementName: 'Communication Services SPDR', baseCorrelation: 52.4, expenseRatioDiff: 0.09, sectorMatch: true },
  { originalTicker: 'WBA', originalName: 'Walgreens Boots Alliance', replacementTicker: 'XLV', replacementName: 'Health Care Select SPDR', baseCorrelation: 45.6, expenseRatioDiff: 0.08, sectorMatch: true },
  { originalTicker: 'MRNA', originalName: 'Moderna Inc', replacementTicker: 'XBI', replacementName: 'SPDR S&P Biotech ETF', baseCorrelation: 71.2, expenseRatioDiff: 0.27, sectorMatch: true },
  { originalTicker: 'PYPL', originalName: 'PayPal Holdings', replacementTicker: 'XLF', replacementName: 'Financial Select SPDR', baseCorrelation: 58.9, expenseRatioDiff: 0.09, sectorMatch: false },
  { originalTicker: 'DIS', originalName: 'Walt Disney Company', replacementTicker: 'XLC', replacementName: 'Communication Services SPDR', baseCorrelation: 66.3, expenseRatioDiff: 0.09, sectorMatch: true },
  { originalTicker: 'VFC', originalName: 'V.F. Corporation', replacementTicker: 'XLY', replacementName: 'Consumer Discretionary SPDR', baseCorrelation: 48.7, expenseRatioDiff: 0.09, sectorMatch: true },
];

// ── Sector configuration ──

interface SectorConfig {
  sector: string;
  baseAllocationPct: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Technology', baseAllocationPct: 28.5 },
  { sector: 'Healthcare', baseAllocationPct: 14.2 },
  { sector: 'Financials', baseAllocationPct: 12.8 },
  { sector: 'Consumer Discretionary', baseAllocationPct: 10.5 },
  { sector: 'Industrials', baseAllocationPct: 9.3 },
  { sector: 'Communication Services', baseAllocationPct: 8.7 },
  { sector: 'Consumer Staples', baseAllocationPct: 6.4 },
  { sector: 'Energy', baseAllocationPct: 4.1 },
  { sector: 'Utilities', baseAllocationPct: 2.8 },
  { sector: 'Real Estate', baseAllocationPct: 2.0 },
  { sector: 'Materials', baseAllocationPct: 0.7 },
];

// ── Wash sale calendar configuration ──

interface WashSaleConfig {
  ticker: string;
  daysAgoSold: number;
  baseSoldPrice: number;
}

const WASH_SALE_CONFIGS: WashSaleConfig[] = [
  { ticker: 'RIVN', daysAgoSold: 5, baseSoldPrice: 12.40 },
  { ticker: 'LCID', daysAgoSold: 12, baseSoldPrice: 3.85 },
  { ticker: 'BABA', daysAgoSold: 22, baseSoldPrice: 78.60 },
  { ticker: 'COIN', daysAgoSold: 8, baseSoldPrice: 145.20 },
  { ticker: 'SQ', daysAgoSold: 18, baseSoldPrice: 54.30 },
  { ticker: 'HOOD', daysAgoSold: 26, baseSoldPrice: 9.75 },
  { ticker: 'PLTR', daysAgoSold: 3, baseSoldPrice: 18.90 },
];

// ── Historical harvesting configuration ──

interface HistoricalConfig {
  year: number;
  baseLossesHarvested: number;
  baseTaxSavings: number;
  basePortfolioImpact: number;
}

const HISTORICAL_CONFIGS: HistoricalConfig[] = [
  { year: 2020, baseLossesHarvested: 28400, baseTaxSavings: 8520, basePortfolioImpact: -0.12 },
  { year: 2021, baseLossesHarvested: 12800, baseTaxSavings: 3840, basePortfolioImpact: -0.05 },
  { year: 2022, baseLossesHarvested: 67500, baseTaxSavings: 20250, basePortfolioImpact: -0.32 },
  { year: 2023, baseLossesHarvested: 41200, baseTaxSavings: 12360, basePortfolioImpact: -0.18 },
  { year: 2024, baseLossesHarvested: 34800, baseTaxSavings: 10440, basePortfolioImpact: -0.14 },
  { year: 2025, baseLossesHarvested: 52300, baseTaxSavings: 15690, basePortfolioImpact: -0.22 },
];

// ── Data generation ──

function generateHarvestCandidates(rng: () => number): HarvestCandidate[] {
  return CANDIDATE_CONFIGS.map((cfg) => {
    const priceJitter = (rng() - 0.5) * cfg.basePrice * 0.08;
    const currentPrice = Math.round((cfg.basePrice + priceJitter) * 100) / 100;

    const costJitter = (rng() - 0.5) * cfg.baseCostBasis * 0.04;
    const avgCostBasis = Math.round((cfg.baseCostBasis + costJitter) * 100) / 100;

    const unrealizedLossUsd = Math.round((currentPrice - avgCostBasis) * 100) / 100;
    const unrealizedLossPct = Math.round((unrealizedLossUsd / avgCostBasis) * 10000) / 100;

    const holdingPeriodDays = Math.floor(90 + rng() * 600);
    const washSaleRisk = rng() < 0.25;

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      sector: cfg.sector,
      currentPrice,
      avgCostBasis,
      unrealizedLossPct,
      unrealizedLossUsd,
      holdingPeriodDays,
      washSaleRisk,
      replacementEtfSuggestion: cfg.replacementEtf,
    };
  });
}

function generateTopOpportunities(rng: () => number, candidates: HarvestCandidate[]): TopOpportunity[] {
  const sorted = [...candidates].sort((a, b) => a.unrealizedLossUsd - b.unrealizedLossUsd);
  const top = sorted.slice(0, 8);

  return top.map((c) => {
    const isShortTerm = c.holdingPeriodDays < 365;
    const taxRate = isShortTerm
      ? Math.round((32 + rng() * 5) * 10) / 10
      : Math.round((15 + rng() * 5) * 10) / 10;

    const lossAmount = Math.abs(c.unrealizedLossUsd);
    const estimatedSavings = Math.round(lossAmount * (taxRate / 100) * 100) / 100;
    const confidence = Math.round((70 + rng() * 25) * 10) / 10;

    return {
      ticker: c.ticker,
      lossAmount,
      taxRateApplied: taxRate,
      estimatedSavings,
      confidence,
    };
  });
}

function generateWashSaleCalendar(rng: () => number): WashSaleCalendarEntry[] {
  const now = new Date();

  return WASH_SALE_CONFIGS.map((cfg) => {
    const daysJitter = Math.floor((rng() - 0.5) * 4);
    const daysAgo = cfg.daysAgoSold + daysJitter;

    const soldDate = new Date(now);
    soldDate.setDate(soldDate.getDate() - daysAgo);

    const windowEnd = new Date(soldDate);
    windowEnd.setDate(windowEnd.getDate() + 30);

    const daysRemaining = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const priceJitter = (rng() - 0.5) * cfg.baseSoldPrice * 0.06;
    const soldPrice = Math.round((cfg.baseSoldPrice + priceJitter) * 100) / 100;

    let status: 'ACTIVE' | 'EXPIRING_SOON' | 'CLEAR';
    if (daysRemaining <= 0) {
      status = 'CLEAR';
    } else if (daysRemaining <= 7) {
      status = 'EXPIRING_SOON';
    } else {
      status = 'ACTIVE';
    }

    return {
      ticker: cfg.ticker,
      soldDate: soldDate.toISOString().slice(0, 10),
      soldPrice,
      washSaleWindowEnd: windowEnd.toISOString().slice(0, 10),
      daysRemaining,
      status,
    };
  });
}

function generateReplacementPairs(rng: () => number): ReplacementPair[] {
  return REPLACEMENT_PAIR_CONFIGS.map((cfg) => {
    const corrJitter = (rng() - 0.5) * 8;
    const correlationPct = Math.round(Math.max(30, Math.min(98, cfg.baseCorrelation + corrJitter)) * 10) / 10;

    const expenseDiffJitter = (rng() - 0.5) * 0.04;
    const expenseRatioDiff = Math.round(Math.max(0, cfg.expenseRatioDiff + expenseDiffJitter) * 100) / 100;

    return {
      originalTicker: cfg.originalTicker,
      originalName: cfg.originalName,
      replacementTicker: cfg.replacementTicker,
      replacementName: cfg.replacementName,
      correlationPct,
      expenseRatioDiff,
      sectorMatch: cfg.sectorMatch,
    };
  });
}

function generateSectorExposure(rng: () => number): SectorExposureEntry[] {
  return SECTOR_CONFIGS.map((cfg) => {
    const allocJitter = (rng() - 0.5) * 2;
    const currentAllocationPct = Math.round(Math.max(0.1, cfg.baseAllocationPct + allocJitter) * 10) / 10;

    // Harvesting shifts allocation slightly toward ETF-heavy sectors
    const harvestShift = (rng() - 0.5) * 1.5;
    const postHarvestAllocationPct = Math.round(Math.max(0.1, currentAllocationPct + harvestShift) * 10) / 10;

    const changePct = Math.round((postHarvestAllocationPct - currentAllocationPct) * 10) / 10;

    return {
      sector: cfg.sector,
      currentAllocationPct,
      postHarvestAllocationPct,
      changePct,
    };
  });
}

function generateCapitalGainsOffset(rng: () => number): CapitalGainsOffset {
  const shortTermGains = Math.round((25000 + rng() * 40000) * 100) / 100;
  const longTermGains = Math.round((18000 + rng() * 35000) * 100) / 100;

  const shortTermHarvestable = Math.round((12000 + rng() * 25000) * 100) / 100;
  const longTermHarvestable = Math.round((8000 + rng() * 18000) * 100) / 100;

  const netShortTermAfterHarvest = Math.round(Math.max(0, shortTermGains - shortTermHarvestable) * 100) / 100;
  const netLongTermAfterHarvest = Math.round(Math.max(0, longTermGains - longTermHarvestable) * 100) / 100;

  const totalHarvestable = shortTermHarvestable + longTermHarvestable;
  const totalGains = shortTermGains + longTermGains;
  const additionalCarryforward = Math.round(Math.max(0, totalHarvestable - totalGains) * 100) / 100;

  return {
    shortTermGains,
    longTermGains,
    shortTermHarvestable,
    longTermHarvestable,
    netShortTermAfterHarvest,
    netLongTermAfterHarvest,
    additionalCarryforward,
  };
}

function generateYearEndProjection(rng: () => number, offset: CapitalGainsOffset): YearEndProjection {
  const totalHarvestableLosses = Math.round((offset.shortTermHarvestable + offset.longTermHarvestable) * 100) / 100;
  const totalRealizedGains = Math.round((offset.shortTermGains + offset.longTermGains) * 100) / 100;

  const netTaxableGains = Math.round(Math.max(0, totalRealizedGains - totalHarvestableLosses) * 100) / 100;

  const blendedRate = 22 + rng() * 8; // effective blended rate 22-30%
  const effectiveTaxRate = Math.round(blendedRate * 10) / 10;

  const estimatedTaxLiability = Math.round(netTaxableGains * (effectiveTaxRate / 100) * 100) / 100;

  const preSavingsLiability = totalRealizedGains * (effectiveTaxRate / 100);
  const projectedSavingsFromHarvest = Math.round(Math.max(0, preSavingsLiability - estimatedTaxLiability) * 100) / 100;

  return {
    totalHarvestableLosses,
    totalRealizedGains,
    netTaxableGains,
    estimatedTaxLiability,
    projectedSavingsFromHarvest,
    effectiveTaxRate,
  };
}

function generateHistoricalHarvesting(rng: () => number): HistoricalHarvestingEntry[] {
  return HISTORICAL_CONFIGS.map((cfg) => {
    const lossJitter = (rng() - 0.5) * cfg.baseLossesHarvested * 0.1;
    const lossesHarvested = Math.round(cfg.baseLossesHarvested + lossJitter);

    const savingsJitter = (rng() - 0.5) * cfg.baseTaxSavings * 0.1;
    const taxSavings = Math.round(cfg.baseTaxSavings + savingsJitter);

    const impactJitter = (rng() - 0.5) * 0.06;
    const portfolioImpactPct = Math.round((cfg.basePortfolioImpact + impactJitter) * 100) / 100;

    return {
      year: cfg.year,
      lossesHarvested,
      taxSavings,
      portfolioImpactPct,
    };
  });
}

function generateTaxLossHarvestData(): TaxLossHarvestResponse {
  const rng = seededRandom('tax-loss-harvest');

  const harvestCandidates = generateHarvestCandidates(rng);
  const topOpportunities = generateTopOpportunities(rng, harvestCandidates);
  const washSaleCalendar = generateWashSaleCalendar(rng);
  const replacementPairs = generateReplacementPairs(rng);
  const sectorExposure = generateSectorExposure(rng);
  const capitalGainsOffset = generateCapitalGainsOffset(rng);
  const yearEndProjection = generateYearEndProjection(rng, capitalGainsOffset);
  const historicalHarvesting = generateHistoricalHarvesting(rng);

  return {
    harvestCandidates,
    topOpportunities,
    washSaleCalendar,
    replacementPairs,
    sectorExposure,
    capitalGainsOffset,
    yearEndProjection,
    historicalHarvesting,
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

    const data = generateTaxLossHarvestData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TaxLossHarvest] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate tax loss harvest data' });
  }
});

export default router;
