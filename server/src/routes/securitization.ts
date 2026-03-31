import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface NewIssuanceDeal {
  type: 'ABS' | 'CMBS' | 'CLO' | 'RMBS';
  issuer: string;
  size: number;
  rating: string;
  spread: number;
  status: 'priced' | 'marketing' | 'filed';
}

interface MarketVolumeEntry {
  type: 'ABS' | 'CMBS' | 'CLO' | 'RMBS';
  currentYearYTD: number;
  priorYearYTD: number;
  changePercent: number;
}

interface SpreadEntry {
  sector: 'ABS' | 'CMBS' | 'CLO';
  aaa: number;
  aa: number;
  a: number;
  bbb: number;
}

interface PipelineDeal {
  type: 'ABS' | 'CMBS' | 'CLO' | 'RMBS';
  issuer: string;
  expectedSize: number;
  stage: 'marketing' | 'filed';
  expectedPricing: string;
  leadManager: string;
}

interface PerformanceMetric {
  sector: string;
  vintage: string;
  delinquencyRate: number;
  prepaymentSpeed: number;
  lossRate: number;
}

interface TopIssuerEntry {
  rank: number;
  issuer: string;
  volumeYTD: number;
  dealCount: number;
  marketShare: number;
}

interface CollateralMetricEntry {
  collateralType: string;
  avgFICO: number;
  avgLTV: number;
  avgDTI: number;
  delinquency30d: number;
  delinquency60d: number;
  delinquency90d: number;
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
}

interface SecuritizationResponse {
  newIssuance: NewIssuanceDeal[];
  marketVolume: MarketVolumeEntry[];
  spreads: SpreadEntry[];
  pipeline: PipelineDeal[];
  performance: PerformanceMetric[];
  topIssuers: TopIssuerEntry[];
  collateralMetrics: CollateralMetricEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: SecuritizationResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── New issuance configuration ──

interface IssuanceConfig {
  type: 'ABS' | 'CMBS' | 'CLO' | 'RMBS';
  issuer: string;
  baseSize: number;
  baseRating: string;
  baseSpread: number;
}

const ISSUANCE_CONFIGS: IssuanceConfig[] = [
  { type: 'ABS', issuer: 'Ford Motor Credit', baseSize: 1250, baseRating: 'AAA', baseSpread: 55 },
  { type: 'ABS', issuer: 'Capital One', baseSize: 1500, baseRating: 'AAA', baseSpread: 48 },
  { type: 'ABS', issuer: 'Ally Financial', baseSize: 900, baseRating: 'AAA', baseSpread: 52 },
  { type: 'ABS', issuer: 'American Express', baseSize: 2000, baseRating: 'AAA', baseSpread: 38 },
  { type: 'CMBS', issuer: 'Morgan Stanley', baseSize: 850, baseRating: 'AAA', baseSpread: 95 },
  { type: 'CMBS', issuer: 'Goldman Sachs', baseSize: 1100, baseRating: 'AAA', baseSpread: 88 },
  { type: 'CMBS', issuer: 'JP Morgan', baseSize: 1350, baseRating: 'AAA', baseSpread: 82 },
  { type: 'CLO', issuer: 'Carlyle Group', baseSize: 600, baseRating: 'AAA', baseSpread: 130 },
  { type: 'CLO', issuer: 'KKR Credit', baseSize: 550, baseRating: 'AAA', baseSpread: 135 },
  { type: 'CLO', issuer: 'Apollo Global', baseSize: 700, baseRating: 'AAA', baseSpread: 125 },
  { type: 'CLO', issuer: 'Ares Management', baseSize: 500, baseRating: 'AAA', baseSpread: 140 },
  { type: 'RMBS', issuer: 'Annaly Capital', baseSize: 750, baseRating: 'AAA', baseSpread: 72 },
  { type: 'RMBS', issuer: 'Two Harbors', baseSize: 650, baseRating: 'AA', baseSpread: 85 },
  { type: 'RMBS', issuer: 'New Residential', baseSize: 800, baseRating: 'AAA', baseSpread: 68 },
];

const DEAL_STATUSES: Array<'priced' | 'marketing' | 'filed'> = ['priced', 'marketing', 'filed'];

// ── Market volume configuration ──

interface VolumeConfig {
  type: 'ABS' | 'CMBS' | 'CLO' | 'RMBS';
  baseCurrent: number;
  basePrior: number;
}

const VOLUME_CONFIGS: VolumeConfig[] = [
  { type: 'ABS', baseCurrent: 142.5, basePrior: 128.3 },
  { type: 'CMBS', baseCurrent: 48.2, basePrior: 52.7 },
  { type: 'CLO', baseCurrent: 85.6, basePrior: 78.1 },
  { type: 'RMBS', baseCurrent: 36.8, basePrior: 41.2 },
];

// ── Spread configuration ──

interface SpreadConfig {
  sector: 'ABS' | 'CMBS' | 'CLO';
  baseAAA: number;
  baseAA: number;
  baseA: number;
  baseBBB: number;
}

const SPREAD_CONFIGS: SpreadConfig[] = [
  { sector: 'ABS', baseAAA: 50, baseAA: 72, baseA: 110, baseBBB: 185 },
  { sector: 'CMBS', baseAAA: 88, baseAA: 125, baseA: 195, baseBBB: 310 },
  { sector: 'CLO', baseAAA: 130, baseAA: 185, baseA: 270, baseBBB: 425 },
];

// ── Pipeline configuration ──

interface PipelineConfig {
  type: 'ABS' | 'CMBS' | 'CLO' | 'RMBS';
  issuer: string;
  baseSize: number;
  leadManager: string;
}

const PIPELINE_CONFIGS: PipelineConfig[] = [
  { type: 'ABS', issuer: 'Santander Consumer', baseSize: 1100, leadManager: 'Barclays' },
  { type: 'ABS', issuer: 'World Omni', baseSize: 850, leadManager: 'BofA Securities' },
  { type: 'ABS', issuer: 'Discover Financial', baseSize: 1750, leadManager: 'Citi' },
  { type: 'CMBS', issuer: 'Wells Fargo', baseSize: 950, leadManager: 'Deutsche Bank' },
  { type: 'CMBS', issuer: 'Citigroup', baseSize: 1200, leadManager: 'Morgan Stanley' },
  { type: 'CLO', issuer: 'Blackstone Credit', baseSize: 650, leadManager: 'JP Morgan' },
  { type: 'CLO', issuer: 'PGIM', baseSize: 500, leadManager: 'Goldman Sachs' },
  { type: 'CLO', issuer: 'Oak Hill Advisors', baseSize: 575, leadManager: 'Barclays' },
  { type: 'RMBS', issuer: 'Redwood Trust', baseSize: 450, leadManager: 'Credit Suisse' },
  { type: 'RMBS', issuer: 'PennyMac', baseSize: 600, leadManager: 'Wells Fargo' },
];

// ── Performance configuration ──

interface PerformanceConfig {
  sector: string;
  vintage: string;
  baseDelinquency: number;
  basePrepayment: number;
  baseLoss: number;
}

const PERFORMANCE_CONFIGS: PerformanceConfig[] = [
  { sector: 'Auto ABS', vintage: '2024', baseDelinquency: 1.85, basePrepayment: 1.42, baseLoss: 0.32 },
  { sector: 'Auto ABS', vintage: '2023', baseDelinquency: 2.45, basePrepayment: 1.55, baseLoss: 0.68 },
  { sector: 'Auto ABS', vintage: '2022', baseDelinquency: 3.12, basePrepayment: 1.38, baseLoss: 1.15 },
  { sector: 'Credit Card ABS', vintage: '2024', baseDelinquency: 1.52, basePrepayment: 18.5, baseLoss: 0.45 },
  { sector: 'Credit Card ABS', vintage: '2023', baseDelinquency: 2.08, basePrepayment: 17.8, baseLoss: 0.82 },
  { sector: 'CMBS Conduit', vintage: '2024', baseDelinquency: 0.95, basePrepayment: 0.0, baseLoss: 0.08 },
  { sector: 'CMBS Conduit', vintage: '2023', baseDelinquency: 1.78, basePrepayment: 0.0, baseLoss: 0.22 },
  { sector: 'CMBS Conduit', vintage: '2022', baseDelinquency: 2.85, basePrepayment: 0.0, baseLoss: 0.55 },
  { sector: 'CLO BSL', vintage: '2024', baseDelinquency: 0.65, basePrepayment: 22.3, baseLoss: 0.12 },
  { sector: 'CLO BSL', vintage: '2023', baseDelinquency: 1.15, basePrepayment: 20.8, baseLoss: 0.35 },
  { sector: 'RMBS Prime', vintage: '2024', baseDelinquency: 0.42, basePrepayment: 6.8, baseLoss: 0.05 },
  { sector: 'RMBS Prime', vintage: '2023', baseDelinquency: 0.78, basePrepayment: 7.2, baseLoss: 0.12 },
];

// ── Top issuers configuration ──

interface IssuerConfig {
  issuer: string;
  baseVolume: number;
  baseDealCount: number;
}

const ISSUER_CONFIGS: IssuerConfig[] = [
  { issuer: 'JP Morgan', baseVolume: 28.5, baseDealCount: 18 },
  { issuer: 'Goldman Sachs', baseVolume: 24.2, baseDealCount: 15 },
  { issuer: 'Morgan Stanley', baseVolume: 22.8, baseDealCount: 14 },
  { issuer: 'Citigroup', baseVolume: 20.1, baseDealCount: 13 },
  { issuer: 'BofA Securities', baseVolume: 19.5, baseDealCount: 12 },
  { issuer: 'Barclays', baseVolume: 16.3, baseDealCount: 10 },
  { issuer: 'Wells Fargo', baseVolume: 15.8, baseDealCount: 11 },
  { issuer: 'Deutsche Bank', baseVolume: 12.4, baseDealCount: 8 },
  { issuer: 'Credit Suisse', baseVolume: 10.6, baseDealCount: 7 },
  { issuer: 'RBC Capital', baseVolume: 8.9, baseDealCount: 6 },
];

// ── Collateral metrics configuration ──

interface CollateralConfig {
  collateralType: string;
  baseAvgFICO: number;
  baseAvgLTV: number;
  baseAvgDTI: number;
  baseDelinquency30d: number;
  baseDelinquency60d: number;
  baseDelinquency90d: number;
}

const COLLATERAL_CONFIGS: CollateralConfig[] = [
  { collateralType: 'Prime Auto Loans', baseAvgFICO: 745, baseAvgLTV: 92, baseAvgDTI: 35, baseDelinquency30d: 1.85, baseDelinquency60d: 0.72, baseDelinquency90d: 0.38 },
  { collateralType: 'Subprime Auto Loans', baseAvgFICO: 585, baseAvgLTV: 115, baseAvgDTI: 42, baseDelinquency30d: 5.45, baseDelinquency60d: 2.85, baseDelinquency90d: 1.92 },
  { collateralType: 'Credit Card Receivables', baseAvgFICO: 710, baseAvgLTV: 0, baseAvgDTI: 32, baseDelinquency30d: 2.15, baseDelinquency60d: 1.08, baseDelinquency90d: 0.65 },
  { collateralType: 'Residential Mortgages (QM)', baseAvgFICO: 760, baseAvgLTV: 72, baseAvgDTI: 38, baseDelinquency30d: 0.95, baseDelinquency60d: 0.42, baseDelinquency90d: 0.22 },
  { collateralType: 'Residential Mortgages (Non-QM)', baseAvgFICO: 695, baseAvgLTV: 78, baseAvgDTI: 43, baseDelinquency30d: 2.65, baseDelinquency60d: 1.35, baseDelinquency90d: 0.85 },
  { collateralType: 'Leveraged Loans (BSL)', baseAvgFICO: 0, baseAvgLTV: 0, baseAvgDTI: 0, baseDelinquency30d: 1.25, baseDelinquency60d: 0.55, baseDelinquency90d: 0.32 },
  { collateralType: 'Commercial Mortgages', baseAvgFICO: 0, baseAvgLTV: 62, baseAvgDTI: 0, baseDelinquency30d: 1.78, baseDelinquency60d: 0.92, baseDelinquency90d: 0.58 },
];

// ── Data generation ──

function generateNewIssuance(rng: () => number): NewIssuanceDeal[] {
  return ISSUANCE_CONFIGS.map((cfg) => {
    const sizeJitter = (rng() - 0.5) * cfg.baseSize * 0.2;
    const size = Math.round(cfg.baseSize + sizeJitter);

    const spreadJitter = (rng() - 0.5) * cfg.baseSpread * 0.15;
    const spread = Math.round((cfg.baseSpread + spreadJitter) * 10) / 10;

    const statusIdx = Math.floor(rng() * DEAL_STATUSES.length);
    const status = DEAL_STATUSES[statusIdx];

    // Rating can vary slightly for non-AAA deals
    const ratings = ['AAA', 'AA', 'A', 'BBB'];
    let rating = cfg.baseRating;
    if (rng() < 0.25) {
      const ratingIdx = Math.floor(rng() * ratings.length);
      rating = ratings[ratingIdx];
    }

    return {
      type: cfg.type,
      issuer: cfg.issuer,
      size,
      rating,
      spread,
      status,
    };
  });
}

function generateMarketVolume(rng: () => number): MarketVolumeEntry[] {
  return VOLUME_CONFIGS.map((cfg) => {
    const currentJitter = (rng() - 0.5) * cfg.baseCurrent * 0.1;
    const currentYearYTD = Math.round((cfg.baseCurrent + currentJitter) * 10) / 10;

    const priorJitter = (rng() - 0.5) * cfg.basePrior * 0.05;
    const priorYearYTD = Math.round((cfg.basePrior + priorJitter) * 10) / 10;

    const changePercent = Math.round(((currentYearYTD - priorYearYTD) / priorYearYTD) * 1000) / 10;

    return {
      type: cfg.type,
      currentYearYTD,
      priorYearYTD,
      changePercent,
    };
  });
}

function generateSpreads(rng: () => number): SpreadEntry[] {
  return SPREAD_CONFIGS.map((cfg) => {
    const aaaJitter = (rng() - 0.5) * cfg.baseAAA * 0.1;
    const aaa = Math.round(cfg.baseAAA + aaaJitter);

    const aaJitter = (rng() - 0.5) * cfg.baseAA * 0.1;
    const aa = Math.round(cfg.baseAA + aaJitter);

    const aJitter = (rng() - 0.5) * cfg.baseA * 0.1;
    const a = Math.round(cfg.baseA + aJitter);

    const bbbJitter = (rng() - 0.5) * cfg.baseBBB * 0.1;
    const bbb = Math.round(cfg.baseBBB + bbbJitter);

    return {
      sector: cfg.sector,
      aaa,
      aa,
      a,
      bbb,
    };
  });
}

function generatePipeline(rng: () => number): PipelineDeal[] {
  const stages: Array<'marketing' | 'filed'> = ['marketing', 'filed'];

  return PIPELINE_CONFIGS.map((cfg) => {
    const sizeJitter = (rng() - 0.5) * cfg.baseSize * 0.2;
    const expectedSize = Math.round(cfg.baseSize + sizeJitter);

    const stageIdx = Math.floor(rng() * stages.length);
    const stage = stages[stageIdx];

    // Generate expected pricing date within next 1-4 weeks
    const daysOut = 3 + Math.floor(rng() * 25);
    const pricingDate = new Date();
    pricingDate.setDate(pricingDate.getDate() + daysOut);
    const expectedPricing = pricingDate.toISOString().slice(0, 10);

    return {
      type: cfg.type,
      issuer: cfg.issuer,
      expectedSize,
      stage,
      expectedPricing,
      leadManager: cfg.leadManager,
    };
  });
}

function generatePerformance(rng: () => number): PerformanceMetric[] {
  return PERFORMANCE_CONFIGS.map((cfg) => {
    const delinqJitter = (rng() - 0.5) * cfg.baseDelinquency * 0.15;
    const delinquencyRate = Math.round((cfg.baseDelinquency + delinqJitter) * 100) / 100;

    const prepayJitter = (rng() - 0.5) * cfg.basePrepayment * 0.1;
    const prepaymentSpeed = Math.round((cfg.basePrepayment + prepayJitter) * 100) / 100;

    const lossJitter = (rng() - 0.5) * cfg.baseLoss * 0.2;
    const lossRate = Math.round(Math.max(0, cfg.baseLoss + lossJitter) * 100) / 100;

    return {
      sector: cfg.sector,
      vintage: cfg.vintage,
      delinquencyRate,
      prepaymentSpeed,
      lossRate,
    };
  });
}

function generateTopIssuers(rng: () => number): TopIssuerEntry[] {
  const entries = ISSUER_CONFIGS.map((cfg) => {
    const volumeJitter = (rng() - 0.5) * cfg.baseVolume * 0.15;
    const volumeYTD = Math.round((cfg.baseVolume + volumeJitter) * 10) / 10;

    const countJitter = Math.floor((rng() - 0.5) * cfg.baseDealCount * 0.2);
    const dealCount = Math.max(1, cfg.baseDealCount + countJitter);

    return {
      issuer: cfg.issuer,
      volumeYTD,
      dealCount,
    };
  });

  // Sort by volume descending and assign ranks + market shares
  entries.sort((a, b) => b.volumeYTD - a.volumeYTD);
  const totalVolume = entries.reduce((sum, e) => sum + e.volumeYTD, 0);

  return entries.map((e, idx) => ({
    rank: idx + 1,
    issuer: e.issuer,
    volumeYTD: e.volumeYTD,
    dealCount: e.dealCount,
    marketShare: Math.round((e.volumeYTD / totalVolume) * 1000) / 10,
  }));
}

function generateCollateralMetrics(rng: () => number): CollateralMetricEntry[] {
  return COLLATERAL_CONFIGS.map((cfg) => {
    // FICO jitter (only if applicable)
    const avgFICO = cfg.baseAvgFICO > 0
      ? Math.round(cfg.baseAvgFICO + (rng() - 0.5) * 20)
      : 0;

    // LTV jitter (only if applicable)
    const avgLTV = cfg.baseAvgLTV > 0
      ? Math.round((cfg.baseAvgLTV + (rng() - 0.5) * 6) * 10) / 10
      : 0;

    // DTI jitter (only if applicable)
    const avgDTI = cfg.baseAvgDTI > 0
      ? Math.round((cfg.baseAvgDTI + (rng() - 0.5) * 4) * 10) / 10
      : 0;

    const delinquency30d = Math.round((cfg.baseDelinquency30d + (rng() - 0.5) * cfg.baseDelinquency30d * 0.12) * 100) / 100;
    const delinquency60d = Math.round((cfg.baseDelinquency60d + (rng() - 0.5) * cfg.baseDelinquency60d * 0.12) * 100) / 100;
    const delinquency90d = Math.round((cfg.baseDelinquency90d + (rng() - 0.5) * cfg.baseDelinquency90d * 0.12) * 100) / 100;

    // Trend assessment based on delinquency deviation from base
    const avgDeviation = (delinquency30d - cfg.baseDelinquency30d) / cfg.baseDelinquency30d;
    let trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
    if (avgDeviation < -0.03) {
      trend = 'IMPROVING';
    } else if (avgDeviation > 0.03) {
      trend = 'DETERIORATING';
    } else {
      trend = 'STABLE';
    }

    return {
      collateralType: cfg.collateralType,
      avgFICO,
      avgLTV,
      avgDTI,
      delinquency30d,
      delinquency60d,
      delinquency90d,
      trend,
    };
  });
}

function generateSecuritizationData(): SecuritizationResponse {
  const rng = seededRandom('securitization');

  const newIssuance = generateNewIssuance(rng);
  const marketVolume = generateMarketVolume(rng);
  const spreads = generateSpreads(rng);
  const pipeline = generatePipeline(rng);
  const performance = generatePerformance(rng);
  const topIssuers = generateTopIssuers(rng);
  const collateralMetrics = generateCollateralMetrics(rng);

  return {
    newIssuance,
    marketVolume,
    spreads,
    pipeline,
    performance,
    topIssuers,
    collateralMetrics,
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

    const data = generateSecuritizationData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Securitization] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate securitization data' });
  }
});

export default router;
