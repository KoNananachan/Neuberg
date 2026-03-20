import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface YieldCurvePoint {
  maturity: string;
  aaa: number;
  aa: number;
  a: number;
  bbb: number;
}

interface MuniToTreasuryRatio {
  maturity: string;
  muniYield: number;
  treasuryYield: number;
  ratio: number;
}

interface TopIssuer {
  name: string;
  state: string;
  outstandingDebt: number;
  rating: string;
  sector: string;
}

interface SectorBreakdown {
  sector: string;
  outstandingBillions: number;
  pctOfTotal: number;
  avgYield: number;
  avgRating: string;
}

interface RatingChange {
  issuer: string;
  state: string;
  oldRating: string;
  newRating: string;
  agency: string;
  direction: 'UPGRADE' | 'DOWNGRADE';
  date: string;
}

interface NewIssuance {
  issuer: string;
  state: string;
  size: number;
  type: 'GO' | 'Revenue';
  taxStatus: 'Tax-Exempt' | 'Taxable';
  maturity: string;
  coupon: number;
  status: 'Priced' | 'Upcoming' | 'In Market';
}

interface StateMetric {
  state: string;
  abbreviation: string;
  population: number;
  debtPerCapita: number;
  pensionFundingRatio: number;
  unemploymentRate: number;
  creditOutlook: 'Positive' | 'Stable' | 'Negative';
}

interface MarketStats {
  totalOutstandingTrillions: number;
  avgYield: number;
  weeklyFundFlowsBillions: number;
  advanceDeclineRatio: number;
  newIssuanceYtdBillions: number;
  defaultRateBps: number;
  timestamp: string;
}

interface MunicipalCreditResponse {
  yieldCurve: YieldCurvePoint[];
  muniToTreasury: MuniToTreasuryRatio[];
  topIssuers: TopIssuer[];
  sectorBreakdown: SectorBreakdown[];
  recentUpgrades: RatingChange[];
  newIssuance: NewIssuance[];
  stateMetrics: StateMetric[];
  marketStats: MarketStats;
  timestamp: string;
}

// ── Cache ──

let cache: { data: MunicipalCreditResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Yield curve configuration ──

const MATURITIES = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'] as const;

interface YieldCurveConfig {
  maturity: string;
  baseAAA: number;
  spreadAA: number;
  spreadA: number;
  spreadBBB: number;
  treasuryBase: number;
}

const YIELD_CURVE_CONFIGS: YieldCurveConfig[] = [
  { maturity: '1Y', baseAAA: 2.85, spreadAA: 0.12, spreadA: 0.35, spreadBBB: 0.72, treasuryBase: 4.55 },
  { maturity: '2Y', baseAAA: 2.92, spreadAA: 0.14, spreadA: 0.38, spreadBBB: 0.78, treasuryBase: 4.42 },
  { maturity: '3Y', baseAAA: 3.02, spreadAA: 0.15, spreadA: 0.40, spreadBBB: 0.82, treasuryBase: 4.35 },
  { maturity: '5Y', baseAAA: 3.18, spreadAA: 0.18, spreadA: 0.45, spreadBBB: 0.90, treasuryBase: 4.28 },
  { maturity: '7Y', baseAAA: 3.35, spreadAA: 0.20, spreadA: 0.50, spreadBBB: 0.98, treasuryBase: 4.32 },
  { maturity: '10Y', baseAAA: 3.52, spreadAA: 0.22, spreadA: 0.55, spreadBBB: 1.08, treasuryBase: 4.38 },
  { maturity: '15Y', baseAAA: 3.78, spreadAA: 0.25, spreadA: 0.60, spreadBBB: 1.18, treasuryBase: 4.50 },
  { maturity: '20Y', baseAAA: 3.95, spreadAA: 0.28, spreadA: 0.65, spreadBBB: 1.28, treasuryBase: 4.58 },
  { maturity: '25Y', baseAAA: 4.05, spreadAA: 0.30, spreadA: 0.68, spreadBBB: 1.35, treasuryBase: 4.62 },
  { maturity: '30Y', baseAAA: 4.12, spreadAA: 0.32, spreadA: 0.72, spreadBBB: 1.42, treasuryBase: 4.65 },
];

// ── Top issuer configuration ──

interface IssuerConfig {
  name: string;
  state: string;
  baseDebt: number;
  rating: string;
  sector: string;
}

const ISSUER_CONFIGS: IssuerConfig[] = [
  { name: 'State of California', state: 'CA', baseDebt: 74.2, rating: 'Aa2/AA-', sector: 'General Obligation' },
  { name: 'New York City', state: 'NY', baseDebt: 42.8, rating: 'Aa2/AA', sector: 'General Obligation' },
  { name: 'State of New York', state: 'NY', baseDebt: 58.5, rating: 'Aa1/AA+', sector: 'General Obligation' },
  { name: 'State of Texas', state: 'TX', baseDebt: 52.1, rating: 'Aaa/AAA', sector: 'General Obligation' },
  { name: 'State of Illinois', state: 'IL', baseDebt: 31.6, rating: 'A3/A-', sector: 'General Obligation' },
  { name: 'Metropolitan Transportation Authority', state: 'NY', baseDebt: 45.3, rating: 'A1/A+', sector: 'Transportation' },
  { name: 'Los Angeles Dept of Water & Power', state: 'CA', baseDebt: 28.7, rating: 'Aa2/AA', sector: 'Water/Sewer' },
  { name: 'State of New Jersey', state: 'NJ', baseDebt: 35.4, rating: 'A2/A-', sector: 'General Obligation' },
  { name: 'State of Florida', state: 'FL', baseDebt: 27.9, rating: 'Aaa/AAA', sector: 'General Obligation' },
  { name: 'Port Authority of NY & NJ', state: 'NY', baseDebt: 24.8, rating: 'Aa3/AA-', sector: 'Transportation' },
  { name: 'Massachusetts Water Resources', state: 'MA', baseDebt: 12.5, rating: 'Aa1/AA+', sector: 'Water/Sewer' },
  { name: 'Chicago Board of Education', state: 'IL', baseDebt: 9.8, rating: 'Ba1/BB+', sector: 'Education' },
];

// ── Sector breakdown configuration ──

interface SectorConfig {
  sector: string;
  baseOutstanding: number;
  basePct: number;
  baseYield: number;
  avgRating: string;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'General Obligation', baseOutstanding: 1420, basePct: 35.5, baseYield: 3.45, avgRating: 'AA' },
  { sector: 'Water/Sewer Revenue', baseOutstanding: 580, basePct: 14.5, baseYield: 3.62, avgRating: 'AA-' },
  { sector: 'Transportation Revenue', baseOutstanding: 490, basePct: 12.3, baseYield: 3.78, avgRating: 'A+' },
  { sector: 'Healthcare Revenue', baseOutstanding: 420, basePct: 10.5, baseYield: 3.95, avgRating: 'A' },
  { sector: 'Education Revenue', baseOutstanding: 380, basePct: 9.5, baseYield: 3.55, avgRating: 'AA-' },
  { sector: 'Housing Revenue', baseOutstanding: 310, basePct: 7.8, baseYield: 3.82, avgRating: 'A+' },
  { sector: 'Electric/Gas Revenue', baseOutstanding: 240, basePct: 6.0, baseYield: 3.70, avgRating: 'AA-' },
  { sector: 'Special Tax', baseOutstanding: 160, basePct: 4.0, baseYield: 3.88, avgRating: 'A' },
];

// ── Rating change configuration ──

interface RatingChangeConfig {
  issuer: string;
  state: string;
  oldRating: string;
  newRating: string;
  agency: string;
  direction: 'UPGRADE' | 'DOWNGRADE';
  daysAgo: number;
}

const RATING_CHANGE_CONFIGS: RatingChangeConfig[] = [
  { issuer: 'State of Illinois', state: 'IL', oldRating: 'Baa3', newRating: 'A3', agency: "Moody's", direction: 'UPGRADE', daysAgo: 3 },
  { issuer: 'City of Detroit', state: 'MI', oldRating: 'Ba2', newRating: 'Ba1', agency: "Moody's", direction: 'UPGRADE', daysAgo: 5 },
  { issuer: 'Puerto Rico COFINA', state: 'PR', oldRating: 'BBB-', newRating: 'BBB', agency: 'S&P', direction: 'UPGRADE', daysAgo: 7 },
  { issuer: 'Kansas City', state: 'MO', oldRating: 'AA', newRating: 'AA+', agency: 'S&P', direction: 'UPGRADE', daysAgo: 10 },
  { issuer: 'Chicago Board of Education', state: 'IL', oldRating: 'BB', newRating: 'BB+', agency: 'Fitch', direction: 'UPGRADE', daysAgo: 12 },
  { issuer: 'San Francisco Bay Area Toll Authority', state: 'CA', oldRating: 'AA+', newRating: 'AA', agency: 'S&P', direction: 'DOWNGRADE', daysAgo: 4 },
  { issuer: 'Hartford County', state: 'CT', oldRating: 'A+', newRating: 'A', agency: 'Fitch', direction: 'DOWNGRADE', daysAgo: 8 },
  { issuer: 'State of Connecticut', state: 'CT', oldRating: 'A1', newRating: 'A2', agency: "Moody's", direction: 'DOWNGRADE', daysAgo: 14 },
  { issuer: 'Dallas Fort Worth Airport', state: 'TX', oldRating: 'A+', newRating: 'AA-', agency: 'S&P', direction: 'UPGRADE', daysAgo: 6 },
  { issuer: 'New Jersey Turnpike Authority', state: 'NJ', oldRating: 'A2', newRating: 'A1', agency: "Moody's", direction: 'UPGRADE', daysAgo: 9 },
];

// ── New issuance configuration ──

interface IssuanceConfig {
  issuer: string;
  state: string;
  baseSize: number;
  type: 'GO' | 'Revenue';
  taxStatus: 'Tax-Exempt' | 'Taxable';
  maturityYears: number;
  baseCoupon: number;
  status: 'Priced' | 'Upcoming' | 'In Market';
}

const ISSUANCE_CONFIGS: IssuanceConfig[] = [
  { issuer: 'State of California', state: 'CA', baseSize: 2.5, type: 'GO', taxStatus: 'Tax-Exempt', maturityYears: 20, baseCoupon: 5.0, status: 'Priced' },
  { issuer: 'New York City TFA', state: 'NY', baseSize: 1.8, type: 'Revenue', taxStatus: 'Tax-Exempt', maturityYears: 30, baseCoupon: 5.25, status: 'Priced' },
  { issuer: 'Texas Water Development Board', state: 'TX', baseSize: 1.2, type: 'Revenue', taxStatus: 'Tax-Exempt', maturityYears: 25, baseCoupon: 5.0, status: 'In Market' },
  { issuer: 'Massachusetts Bay Transportation', state: 'MA', baseSize: 0.85, type: 'Revenue', taxStatus: 'Tax-Exempt', maturityYears: 15, baseCoupon: 4.75, status: 'In Market' },
  { issuer: 'City of Chicago', state: 'IL', baseSize: 0.95, type: 'GO', taxStatus: 'Taxable', maturityYears: 10, baseCoupon: 5.50, status: 'Upcoming' },
  { issuer: 'Florida Board of Education', state: 'FL', baseSize: 0.65, type: 'GO', taxStatus: 'Tax-Exempt', maturityYears: 20, baseCoupon: 5.0, status: 'Upcoming' },
  { issuer: 'Denver International Airport', state: 'CO', baseSize: 1.1, type: 'Revenue', taxStatus: 'Tax-Exempt', maturityYears: 30, baseCoupon: 5.25, status: 'Priced' },
  { issuer: 'Port of Seattle', state: 'WA', baseSize: 0.55, type: 'Revenue', taxStatus: 'Tax-Exempt', maturityYears: 25, baseCoupon: 5.0, status: 'Upcoming' },
  { issuer: 'University of California Regents', state: 'CA', baseSize: 1.4, type: 'Revenue', taxStatus: 'Taxable', maturityYears: 30, baseCoupon: 5.50, status: 'In Market' },
  { issuer: 'New Jersey Turnpike Authority', state: 'NJ', baseSize: 0.78, type: 'Revenue', taxStatus: 'Tax-Exempt', maturityYears: 20, baseCoupon: 5.0, status: 'Priced' },
];

// ── State metrics configuration ──

interface StateMetricConfig {
  state: string;
  abbreviation: string;
  population: number;
  baseDebtPerCapita: number;
  basePensionRatio: number;
  baseUnemployment: number;
  outlookBias: number; // 0 = negative, 0.5 = stable, 1 = positive bias
}

const STATE_METRIC_CONFIGS: StateMetricConfig[] = [
  { state: 'California', abbreviation: 'CA', population: 39030000, baseDebtPerCapita: 4120, basePensionRatio: 72.5, baseUnemployment: 4.8, outlookBias: 0.55 },
  { state: 'New York', abbreviation: 'NY', population: 19680000, baseDebtPerCapita: 7850, basePensionRatio: 95.8, baseUnemployment: 4.2, outlookBias: 0.65 },
  { state: 'Texas', abbreviation: 'TX', population: 30500000, baseDebtPerCapita: 1680, basePensionRatio: 78.4, baseUnemployment: 3.9, outlookBias: 0.75 },
  { state: 'Florida', abbreviation: 'FL', population: 22610000, baseDebtPerCapita: 1520, basePensionRatio: 82.1, baseUnemployment: 3.2, outlookBias: 0.80 },
  { state: 'Illinois', abbreviation: 'IL', population: 12580000, baseDebtPerCapita: 5890, basePensionRatio: 44.2, baseUnemployment: 4.5, outlookBias: 0.30 },
  { state: 'Pennsylvania', abbreviation: 'PA', population: 12970000, baseDebtPerCapita: 3450, basePensionRatio: 62.8, baseUnemployment: 3.8, outlookBias: 0.50 },
  { state: 'New Jersey', abbreviation: 'NJ', population: 9290000, baseDebtPerCapita: 6320, basePensionRatio: 52.5, baseUnemployment: 4.1, outlookBias: 0.35 },
  { state: 'Massachusetts', abbreviation: 'MA', population: 7030000, baseDebtPerCapita: 5210, basePensionRatio: 68.3, baseUnemployment: 3.5, outlookBias: 0.60 },
  { state: 'Ohio', abbreviation: 'OH', population: 11790000, baseDebtPerCapita: 2180, basePensionRatio: 75.6, baseUnemployment: 3.7, outlookBias: 0.55 },
  { state: 'Connecticut', abbreviation: 'CT', population: 3630000, baseDebtPerCapita: 8940, basePensionRatio: 52.1, baseUnemployment: 4.0, outlookBias: 0.35 },
  { state: 'Georgia', abbreviation: 'GA', population: 10920000, baseDebtPerCapita: 1250, basePensionRatio: 80.5, baseUnemployment: 3.4, outlookBias: 0.70 },
  { state: 'Washington', abbreviation: 'WA', population: 7900000, baseDebtPerCapita: 2750, basePensionRatio: 84.2, baseUnemployment: 3.8, outlookBias: 0.65 },
];

// ── Data generation ──

function generateYieldCurve(rng: () => number): YieldCurvePoint[] {
  return YIELD_CURVE_CONFIGS.map((cfg) => {
    const baseJitter = (rng() - 0.5) * 0.12;
    const aaa = Math.round((cfg.baseAAA + baseJitter) * 100) / 100;
    const aa = Math.round((aaa + cfg.spreadAA + (rng() - 0.5) * 0.04) * 100) / 100;
    const a = Math.round((aaa + cfg.spreadA + (rng() - 0.5) * 0.06) * 100) / 100;
    const bbb = Math.round((aaa + cfg.spreadBBB + (rng() - 0.5) * 0.08) * 100) / 100;

    return { maturity: cfg.maturity, aaa, aa, a, bbb };
  });
}

function generateMuniToTreasury(rng: () => number, yieldCurve: YieldCurvePoint[]): MuniToTreasuryRatio[] {
  return YIELD_CURVE_CONFIGS.map((cfg, idx) => {
    const muniYield = yieldCurve[idx].aaa;
    const treasuryJitter = (rng() - 0.5) * 0.10;
    const treasuryYield = Math.round((cfg.treasuryBase + treasuryJitter) * 100) / 100;
    const ratio = Math.round((muniYield / treasuryYield) * 100 * 10) / 10;

    return { maturity: cfg.maturity, muniYield, treasuryYield, ratio };
  });
}

function generateTopIssuers(rng: () => number): TopIssuer[] {
  return ISSUER_CONFIGS.map((cfg) => {
    const debtJitter = (rng() - 0.5) * cfg.baseDebt * 0.08;
    const outstandingDebt = Math.round((cfg.baseDebt + debtJitter) * 10) / 10;

    return {
      name: cfg.name,
      state: cfg.state,
      outstandingDebt,
      rating: cfg.rating,
      sector: cfg.sector,
    };
  });
}

function generateSectorBreakdown(rng: () => number): SectorBreakdown[] {
  return SECTOR_CONFIGS.map((cfg) => {
    const outstandingJitter = (rng() - 0.5) * cfg.baseOutstanding * 0.06;
    const outstandingBillions = Math.round(cfg.baseOutstanding + outstandingJitter);

    const pctJitter = (rng() - 0.5) * 1.5;
    const pctOfTotal = Math.round((cfg.basePct + pctJitter) * 10) / 10;

    const yieldJitter = (rng() - 0.5) * 0.15;
    const avgYield = Math.round((cfg.baseYield + yieldJitter) * 100) / 100;

    return {
      sector: cfg.sector,
      outstandingBillions,
      pctOfTotal,
      avgYield,
      avgRating: cfg.avgRating,
    };
  });
}

function generateRatingChanges(rng: () => number): RatingChange[] {
  const today = new Date();
  return RATING_CHANGE_CONFIGS.map((cfg) => {
    // Add some randomness to the date offset
    const extraDays = Math.floor(rng() * 3);
    const changeDate = new Date(today);
    changeDate.setDate(changeDate.getDate() - (cfg.daysAgo + extraDays));
    const date = changeDate.toISOString().slice(0, 10);

    return {
      issuer: cfg.issuer,
      state: cfg.state,
      oldRating: cfg.oldRating,
      newRating: cfg.newRating,
      agency: cfg.agency,
      direction: cfg.direction,
      date,
    };
  });
}

function generateNewIssuance(rng: () => number): NewIssuance[] {
  const today = new Date();
  return ISSUANCE_CONFIGS.map((cfg) => {
    const sizeJitter = (rng() - 0.5) * cfg.baseSize * 0.15;
    const size = Math.round((cfg.baseSize + sizeJitter) * 100) / 100;

    const couponJitter = (rng() - 0.5) * 0.25;
    const coupon = Math.round((cfg.baseCoupon + couponJitter) * 100) / 100;

    // Compute maturity date from today
    const maturityDate = new Date(today);
    maturityDate.setFullYear(maturityDate.getFullYear() + cfg.maturityYears);
    const maturity = maturityDate.toISOString().slice(0, 10);

    return {
      issuer: cfg.issuer,
      state: cfg.state,
      size,
      type: cfg.type,
      taxStatus: cfg.taxStatus,
      maturity,
      coupon,
      status: cfg.status,
    };
  });
}

function generateStateMetrics(rng: () => number): StateMetric[] {
  return STATE_METRIC_CONFIGS.map((cfg) => {
    const debtJitter = (rng() - 0.5) * cfg.baseDebtPerCapita * 0.06;
    const debtPerCapita = Math.round(cfg.baseDebtPerCapita + debtJitter);

    const pensionJitter = (rng() - 0.5) * 3.0;
    const pensionFundingRatio = Math.round((cfg.basePensionRatio + pensionJitter) * 10) / 10;

    const unempJitter = (rng() - 0.5) * 0.4;
    const unemploymentRate = Math.round((cfg.baseUnemployment + unempJitter) * 10) / 10;

    // Credit outlook based on bias + randomness
    const outlookRoll = cfg.outlookBias + (rng() - 0.5) * 0.3;
    let creditOutlook: 'Positive' | 'Stable' | 'Negative';
    if (outlookRoll > 0.65) {
      creditOutlook = 'Positive';
    } else if (outlookRoll < 0.35) {
      creditOutlook = 'Negative';
    } else {
      creditOutlook = 'Stable';
    }

    return {
      state: cfg.state,
      abbreviation: cfg.abbreviation,
      population: cfg.population,
      debtPerCapita,
      pensionFundingRatio,
      unemploymentRate,
      creditOutlook,
    };
  });
}

function generateMarketStats(rng: () => number, yieldCurve: YieldCurvePoint[]): MarketStats {
  // Total outstanding ~ $4T muni market
  const totalJitter = (rng() - 0.5) * 0.1;
  const totalOutstandingTrillions = Math.round((4.02 + totalJitter) * 100) / 100;

  // Average yield across AAA curve
  const avgYieldRaw = yieldCurve.reduce((sum, pt) => sum + pt.aaa, 0) / yieldCurve.length;
  const avgYield = Math.round(avgYieldRaw * 100) / 100;

  // Weekly fund flows (can be positive or negative)
  const fundFlows = Math.round(((rng() - 0.45) * 3.5) * 100) / 100;

  // Advance/decline ratio
  const adRatio = Math.round((0.8 + rng() * 0.9) * 100) / 100;

  // YTD new issuance
  const issuanceJitter = (rng() - 0.5) * 20;
  const newIssuanceYtdBillions = Math.round((185 + issuanceJitter) * 10) / 10;

  // Historical default rate (munis are very safe)
  const defaultJitter = rng() * 5;
  const defaultRateBps = Math.round((2.5 + defaultJitter) * 10) / 10;

  return {
    totalOutstandingTrillions,
    avgYield,
    weeklyFundFlowsBillions: fundFlows,
    advanceDeclineRatio: adRatio,
    newIssuanceYtdBillions,
    defaultRateBps,
    timestamp: new Date().toISOString(),
  };
}

function generateMunicipalCreditData(): MunicipalCreditResponse {
  const rng = seededRandom('municipal-credit');

  const yieldCurve = generateYieldCurve(rng);
  const muniToTreasury = generateMuniToTreasury(rng, yieldCurve);
  const topIssuers = generateTopIssuers(rng);
  const sectorBreakdown = generateSectorBreakdown(rng);
  const recentUpgrades = generateRatingChanges(rng);
  const newIssuance = generateNewIssuance(rng);
  const stateMetrics = generateStateMetrics(rng);
  const marketStats = generateMarketStats(rng, yieldCurve);

  return {
    yieldCurve,
    muniToTreasury,
    topIssuers,
    sectorBreakdown,
    recentUpgrades,
    newIssuance,
    stateMetrics,
    marketStats,
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

    const data = generateMunicipalCreditData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MunicipalCredit] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate municipal credit data' });
  }
});

export default router;
