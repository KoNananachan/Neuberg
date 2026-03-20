import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Types ──

interface MarketOverview {
  globalPremiumsBillions: number;
  growthRatePct: number;
  combinedRatioAvg: number;
  investmentYieldPct: number;
  catLossesYTDBillions: number;
  reinsuranceCapitalBillions: number;
}

interface PCLine {
  line: string;
  rateChange: number;
  lossRatio: number;
  combinedRatio: number;
  reserveDevelopment: number;
  marketCycle: 'hardening' | 'stable' | 'softening';
}

interface ReinsuranceRate {
  program: string;
  rateOnLine: number;
  yearOverYearChange: number;
  attachmentPoint: string;
  exhaustionPoint: string;
  capacity: 'adequate' | 'constrained' | 'scarce';
}

interface CatBondIssuance {
  sponsor: string;
  size: string;
  peril: string;
  expectedLoss: string;
  coupon: string;
}

interface CatBondMarket {
  totalOutstandingBillions: number;
  newIssuanceYTDBillions: number;
  spreadOverLiborBps: string;
  expectedLossRange: string;
  recentIssuances: CatBondIssuance[];
}

interface LossEvent {
  event: string;
  date: string;
  region: string;
  estimatedInsuredLossBillions: number;
  line: string;
}

interface InsurerPerformance {
  company: string;
  premiumsWrittenBillions: number;
  combinedRatio: number;
  investmentReturn: number;
  stockYTDPct: number;
}

interface InsurerStock {
  ticker: string;
  name: string;
  price: number;
  priceUnit: string;
  change: number;
  changeUnit: string;
  marketCap: number;
  marketCapUnit: string;
  pe: number;
  combinedRatio: number;
  combinedRatioUnit: string;
  returnOnEquity: number;
  returnOnEquityUnit: string;
}

interface PremiumLine {
  line: string;
  grossWrittenPremium: number;
  grossWrittenPremiumUnit: string;
  netWrittenPremium: number;
  netWrittenPremiumUnit: string;
  rateChange: number;
  rateChangeUnit: string;
  lossRatio: number;
  lossRatioUnit: string;
  expenseRatio: number;
  expenseRatioUnit: string;
  combinedRatio: number;
  combinedRatioUnit: string;
}

interface CatBondDetail {
  name: string;
  peril: string;
  trigger: string;
  couponSpread: number;
  couponSpreadUnit: string;
  expectedLoss: number;
  expectedLossUnit: string;
  outstandingAmount: number;
  outstandingAmountUnit: string;
  maturityYear: number;
  status: 'outstanding' | 'triggered' | 'expired';
}

interface ReinsuranceRegion {
  region: string;
  propertyCatRateChange: number;
  propertyCatRateChangeUnit: string;
  casualtyRateChange: number;
  casualtyRateChangeUnit: string;
  rateOnLine: number;
  rateOnLineUnit: string;
}

interface ReinsurancePricing {
  guyCarpenterROLIndex: number;
  guyCarpenterROLIndexUnit: string;
  propertyCatRateChange: number;
  propertyCatRateChangeUnit: string;
  casualtyRateChange: number;
  casualtyRateChangeUnit: string;
  retroPricing: number;
  retroPricingUnit: string;
  byRegion: ReinsuranceRegion[];
}

interface InsurancePenetration {
  region: string;
  penetration: number;
}

interface SolvencyRatio {
  segment: string;
  ratio: number;
}

interface MarketMetrics {
  globalPremiumVolume: number;
  globalPremiumVolumeUnit: string;
  protectionGap: number;
  protectionGapUnit: string;
  insurancePenetration: InsurancePenetration[];
  insurancePenetrationUnit: string;
  solvencyRatios: SolvencyRatio[];
  solvencyRatioUnit: string;
}

interface InsuranceMarketResponse {
  marketOverview: MarketOverview;
  pcLines: PCLine[];
  reinsuranceRates: ReinsuranceRate[];
  catBondMarket: CatBondMarket;
  lossEvents: LossEvent[];
  topInsurers: InsurerPerformance[];
  insurerStocks: InsurerStock[];
  premiumData: PremiumLine[];
  catastropheBondDetails: CatBondDetail[];
  reinsurancePricing: ReinsurancePricing;
  marketMetrics: MarketMetrics;
  timestamp: string;
}

// ── Seed Data: P&C Lines ──

interface PCLineSeed {
  line: string;
  baseRateChange: number;
  baseLossRatio: number;
  baseCombinedRatio: number;
  baseReserveDevelopment: number;
  marketCycle: 'hardening' | 'stable' | 'softening';
}

const PC_LINE_SEEDS: PCLineSeed[] = [
  { line: 'Commercial Auto', baseRateChange: 7.2, baseLossRatio: 68.5, baseCombinedRatio: 102.3, baseReserveDevelopment: -1.8, marketCycle: 'hardening' },
  { line: 'Property', baseRateChange: 12.5, baseLossRatio: 58.2, baseCombinedRatio: 95.8, baseReserveDevelopment: 0.5, marketCycle: 'hardening' },
  { line: 'General Liability', baseRateChange: 5.8, baseLossRatio: 63.4, baseCombinedRatio: 99.1, baseReserveDevelopment: -2.4, marketCycle: 'hardening' },
  { line: 'D&O', baseRateChange: -3.2, baseLossRatio: 52.8, baseCombinedRatio: 91.5, baseReserveDevelopment: 1.2, marketCycle: 'softening' },
  { line: 'Cyber', baseRateChange: 8.6, baseLossRatio: 48.5, baseCombinedRatio: 88.2, baseReserveDevelopment: -0.8, marketCycle: 'hardening' },
  { line: 'Workers Comp', baseRateChange: -1.5, baseLossRatio: 58.9, baseCombinedRatio: 92.4, baseReserveDevelopment: 3.5, marketCycle: 'softening' },
  { line: 'Marine', baseRateChange: 4.2, baseLossRatio: 61.7, baseCombinedRatio: 97.6, baseReserveDevelopment: 0.3, marketCycle: 'stable' },
  { line: 'Professional Liability', baseRateChange: 3.8, baseLossRatio: 55.3, baseCombinedRatio: 94.8, baseReserveDevelopment: -1.1, marketCycle: 'stable' },
];

// ── Seed Data: Reinsurance Rates ──

interface ReinsuranceRateSeed {
  program: string;
  baseRateOnLine: number;
  baseYoYChange: number;
  attachmentPoint: string;
  exhaustionPoint: string;
  capacity: 'adequate' | 'constrained' | 'scarce';
}

const REINSURANCE_RATE_SEEDS: ReinsuranceRateSeed[] = [
  { program: 'US Property Cat', baseRateOnLine: 12.8, baseYoYChange: 22.5, attachmentPoint: '$250M', exhaustionPoint: '$1.5B', capacity: 'constrained' },
  { program: 'International Property', baseRateOnLine: 8.4, baseYoYChange: 14.2, attachmentPoint: '$150M', exhaustionPoint: '$800M', capacity: 'adequate' },
  { program: 'Casualty', baseRateOnLine: 5.6, baseYoYChange: 8.8, attachmentPoint: '$50M', exhaustionPoint: '$500M', capacity: 'adequate' },
  { program: 'Marine', baseRateOnLine: 7.2, baseYoYChange: 10.5, attachmentPoint: '$100M', exhaustionPoint: '$600M', capacity: 'adequate' },
  { program: 'Aviation', baseRateOnLine: 9.5, baseYoYChange: 18.3, attachmentPoint: '$200M', exhaustionPoint: '$1.2B', capacity: 'constrained' },
  { program: 'Specialty', baseRateOnLine: 6.8, baseYoYChange: 11.7, attachmentPoint: '$75M', exhaustionPoint: '$450M', capacity: 'adequate' },
];

// ── Seed Data: Cat Bond Issuances ──

interface CatBondIssuanceSeed {
  sponsor: string;
  baseSize: number;
  peril: string;
  baseExpectedLoss: number;
  baseCoupon: number;
}

const CAT_BOND_ISSUANCE_SEEDS: CatBondIssuanceSeed[] = [
  { sponsor: 'USAA', baseSize: 500, peril: 'US Hurricane & Earthquake', baseExpectedLoss: 2.1, baseCoupon: 8.75 },
  { sponsor: 'Swiss Re', baseSize: 350, peril: 'European Windstorm', baseExpectedLoss: 1.4, baseCoupon: 5.50 },
  { sponsor: 'FEMA / NFIP', baseSize: 575, peril: 'US Flood', baseExpectedLoss: 2.8, baseCoupon: 10.25 },
  { sponsor: 'Zenkyoren', baseSize: 300, peril: 'Japan Earthquake', baseExpectedLoss: 1.9, baseCoupon: 7.25 },
  { sponsor: 'Allianz', baseSize: 425, peril: 'Multi-Peril Global', baseExpectedLoss: 1.6, baseCoupon: 6.50 },
];

// ── Seed Data: Loss Events ──

interface LossEventSeed {
  event: string;
  date: string;
  region: string;
  baseInsuredLoss: number;
  line: string;
}

const LOSS_EVENT_SEEDS: LossEventSeed[] = [
  { event: 'Hurricane Maxine', date: '2026-01-18', region: 'US Gulf Coast', baseInsuredLoss: 28.5, line: 'Property' },
  { event: 'LA Wildfire Complex', date: '2026-01-07', region: 'California, US', baseInsuredLoss: 12.8, line: 'Property' },
  { event: 'Midwest Derecho', date: '2026-02-22', region: 'Central US', baseInsuredLoss: 4.2, line: 'Property' },
  { event: 'Queensland Flood', date: '2026-01-30', region: 'Australia', baseInsuredLoss: 6.5, line: 'Property' },
  { event: 'European Windstorm Petra', date: '2026-02-14', region: 'Western Europe', baseInsuredLoss: 5.8, line: 'Property' },
  { event: 'Texas Hailstorm Cluster', date: '2026-03-05', region: 'Texas, US', baseInsuredLoss: 3.9, line: 'Property' },
  { event: 'Osaka Earthquake', date: '2026-02-08', region: 'Japan', baseInsuredLoss: 8.2, line: 'Property' },
  { event: 'Chilean Earthquake', date: '2026-03-12', region: 'South America', baseInsuredLoss: 2.4, line: 'Property' },
  { event: 'Rhine Flooding', date: '2026-01-25', region: 'Central Europe', baseInsuredLoss: 3.1, line: 'Marine' },
  { event: 'Cyclone Anita', date: '2026-03-01', region: 'Bay of Bengal', baseInsuredLoss: 1.8, line: 'Property' },
];

// ── Seed Data: Top Insurers/Reinsurers ──

interface InsurerSeed {
  company: string;
  basePremiums: number;
  baseCombinedRatio: number;
  baseInvestmentReturn: number;
  baseStockYTD: number;
}

const INSURER_SEEDS: InsurerSeed[] = [
  { company: 'Munich Re', basePremiums: 62.4, baseCombinedRatio: 95.2, baseInvestmentReturn: 3.8, baseStockYTD: 8.5 },
  { company: 'Swiss Re', basePremiums: 43.8, baseCombinedRatio: 96.8, baseInvestmentReturn: 3.5, baseStockYTD: 5.2 },
  { company: 'Berkshire Hathaway Re', basePremiums: 78.5, baseCombinedRatio: 91.4, baseInvestmentReturn: 5.2, baseStockYTD: 12.8 },
  { company: 'AIG', basePremiums: 36.2, baseCombinedRatio: 98.5, baseInvestmentReturn: 3.2, baseStockYTD: -2.4 },
  { company: 'Allianz', basePremiums: 85.6, baseCombinedRatio: 94.6, baseInvestmentReturn: 3.9, baseStockYTD: 6.8 },
  { company: 'Zurich Insurance', basePremiums: 48.2, baseCombinedRatio: 95.8, baseInvestmentReturn: 3.6, baseStockYTD: 4.5 },
  { company: 'Chubb', basePremiums: 52.3, baseCombinedRatio: 88.5, baseInvestmentReturn: 4.1, baseStockYTD: 10.2 },
  { company: 'Hannover Re', basePremiums: 34.5, baseCombinedRatio: 97.2, baseInvestmentReturn: 3.4, baseStockYTD: 7.1 },
];

// ── Seed Data: Insurer Stocks (preserved from original) ──

const INSURER_STOCKS = [
  { ticker: 'BRK.B', name: 'Berkshire Hathaway B', basePrice: 420, baseCap: 780, basePE: 22, baseCR: 87, baseROE: 15.2 },
  { ticker: 'AIG', name: 'American International Group', basePrice: 72, baseCap: 52, basePE: 11, baseCR: 93, baseROE: 10.8 },
  { ticker: 'MET', name: 'MetLife', basePrice: 74, baseCap: 52, basePE: 10, baseCR: 91, baseROE: 13.1 },
  { ticker: 'PRU', name: 'Prudential Financial', basePrice: 112, baseCap: 42, basePE: 9, baseCR: 89, baseROE: 12.5 },
  { ticker: 'ALL', name: 'Allstate', basePrice: 168, baseCap: 44, basePE: 12, baseCR: 95, baseROE: 18.3 },
  { ticker: 'TRV', name: 'Travelers Companies', basePrice: 215, baseCap: 51, basePE: 13, baseCR: 92, baseROE: 16.7 },
  { ticker: 'CB', name: 'Chubb Limited', basePrice: 258, baseCap: 110, basePE: 14, baseCR: 86, baseROE: 14.9 },
  { ticker: 'AFL', name: 'Aflac', basePrice: 85, baseCap: 50, basePE: 11, baseCR: 88, baseROE: 17.2 },
  { ticker: 'PGR', name: 'Progressive Corp', basePrice: 198, baseCap: 115, basePE: 19, baseCR: 90, baseROE: 28.5 },
  { ticker: 'HIG', name: 'Hartford Financial', basePrice: 104, baseCap: 32, basePE: 10, baseCR: 91, baseROE: 15.8 },
  { ticker: 'CINF', name: 'Cincinnati Financial', basePrice: 128, baseCap: 20, basePE: 15, baseCR: 94, baseROE: 11.2 },
  { ticker: 'WRB', name: 'W.R. Berkley', basePrice: 62, baseCap: 20, basePE: 12, baseCR: 89, baseROE: 19.4 },
];

// ── Seed Data: Premium Lines (preserved from original) ──

const PREMIUM_LINES = [
  { line: 'Property', baseGWP: 285, baseNWP: 210, baseRate: 8.5, baseLoss: 62, baseExpense: 28 },
  { line: 'Casualty', baseGWP: 320, baseNWP: 245, baseRate: 5.2, baseLoss: 65, baseExpense: 30 },
  { line: 'Auto', baseGWP: 310, baseNWP: 275, baseRate: 3.8, baseLoss: 68, baseExpense: 26 },
  { line: 'Health', baseGWP: 520, baseNWP: 480, baseRate: 6.1, baseLoss: 82, baseExpense: 14 },
  { line: 'Life', baseGWP: 410, baseNWP: 360, baseRate: 2.5, baseLoss: 55, baseExpense: 32 },
  { line: 'Specialty', baseGWP: 145, baseNWP: 110, baseRate: 12.3, baseLoss: 58, baseExpense: 33 },
];

// ── Seed Data: Cat Bond Templates (preserved from original) ──

const CAT_BOND_TEMPLATES = [
  { name: 'Residential Re 2024-1', peril: 'hurricane' as const, trigger: 'indemnity' as const },
  { name: 'Citrus Re 2025-A', peril: 'hurricane' as const, trigger: 'industry-loss' as const },
  { name: 'Kilimanjaro Re 2024-2', peril: 'earthquake' as const, trigger: 'parametric' as const },
  { name: 'Matterhorn Re 2025-1', peril: 'earthquake' as const, trigger: 'indemnity' as const },
  { name: 'Pelican Re 2024-3', peril: 'hurricane' as const, trigger: 'industry-loss' as const },
  { name: 'Sakura Re 2025-1', peril: 'earthquake' as const, trigger: 'parametric' as const },
  { name: 'Everglades Re 2024-1', peril: 'hurricane' as const, trigger: 'indemnity' as const },
  { name: 'Atlas Re 2025-2', peril: 'wildfire' as const, trigger: 'industry-loss' as const },
  { name: 'Cascade Re 2024-1', peril: 'wildfire' as const, trigger: 'parametric' as const },
  { name: 'Frontline Re 2025-1', peril: 'flood' as const, trigger: 'indemnity' as const },
  { name: 'Galileo Re 2024-2', peril: 'hurricane' as const, trigger: 'industry-loss' as const },
  { name: 'Torrey Pines Re 2025-1', peril: 'wildfire' as const, trigger: 'parametric' as const },
];

// ── Seed Data: Reinsurance Regions (preserved from original) ──

const REINSURANCE_REGIONS = ['US', 'Europe', 'Japan', 'Emerging'] as const;

// ── Data Generation ──

function generateMarketOverview(rng: () => number): MarketOverview {
  const baseGlobalPremiums = 7500;
  const baseGrowthRate = 5.8;
  const baseCombinedRatio = 98.2;
  const baseInvestmentYield = 3.8;
  const baseCatLosses = 78;
  const baseReinsuranceCapital = 720;

  return {
    globalPremiumsBillions: roundTo(baseGlobalPremiums + (rng() - 0.5) * 400, 0),
    growthRatePct: roundTo(clamp(baseGrowthRate + (rng() - 0.5) * 3, 2, 10), 1),
    combinedRatioAvg: roundTo(clamp(baseCombinedRatio + (rng() - 0.5) * 4, 95, 103), 1),
    investmentYieldPct: roundTo(clamp(baseInvestmentYield + (rng() - 0.5) * 1.5, 2.5, 5.5), 2),
    catLossesYTDBillions: roundTo(clamp(baseCatLosses + (rng() - 0.5) * 30, 40, 120), 1),
    reinsuranceCapitalBillions: roundTo(clamp(baseReinsuranceCapital + (rng() - 0.5) * 80, 650, 800), 0),
  };
}

function generatePCLines(rng: () => number): PCLine[] {
  return PC_LINE_SEEDS.map((seed) => {
    const rateJitter = (rng() - 0.5) * 3;
    const lossJitter = (rng() - 0.5) * 5;
    const combinedJitter = (rng() - 0.5) * 4;
    const reserveJitter = (rng() - 0.5) * 1.5;

    const rateChange = roundTo(seed.baseRateChange + rateJitter, 1);
    let marketCycle = seed.marketCycle;
    if (rateChange > 5) marketCycle = 'hardening';
    else if (rateChange < -1) marketCycle = 'softening';

    return {
      line: seed.line,
      rateChange,
      lossRatio: roundTo(clamp(seed.baseLossRatio + lossJitter, 40, 80), 1),
      combinedRatio: roundTo(clamp(seed.baseCombinedRatio + combinedJitter, 82, 115), 1),
      reserveDevelopment: roundTo(seed.baseReserveDevelopment + reserveJitter, 1),
      marketCycle,
    };
  });
}

function generateReinsuranceRates(rng: () => number): ReinsuranceRate[] {
  return REINSURANCE_RATE_SEEDS.map((seed) => {
    const rolJitter = (rng() - 0.5) * 3;
    const yoyJitter = (rng() - 0.5) * 8;

    return {
      program: seed.program,
      rateOnLine: roundTo(clamp(seed.baseRateOnLine + rolJitter, 2, 25), 1),
      yearOverYearChange: roundTo(seed.baseYoYChange + yoyJitter, 1),
      attachmentPoint: seed.attachmentPoint,
      exhaustionPoint: seed.exhaustionPoint,
      capacity: seed.capacity,
    };
  });
}

function generateCatBondMarket(rng: () => number): CatBondMarket {
  const baseTotalOutstanding = 45;
  const baseNewIssuance = 12.5;
  const baseSpreadLow = 450;
  const baseSpreadHigh = 1100;
  const baseExpectedLossLow = 1.0;
  const baseExpectedLossHigh = 3.5;

  const totalOutstandingBillions = roundTo(baseTotalOutstanding + (rng() - 0.5) * 6, 1);
  const newIssuanceYTDBillions = roundTo(clamp(baseNewIssuance + (rng() - 0.5) * 4, 6, 20), 1);
  const spreadLow = Math.round(baseSpreadLow + (rng() - 0.5) * 100);
  const spreadHigh = Math.round(baseSpreadHigh + (rng() - 0.5) * 200);
  const elLow = roundTo(baseExpectedLossLow + (rng() - 0.5) * 0.4, 1);
  const elHigh = roundTo(baseExpectedLossHigh + (rng() - 0.5) * 0.6, 1);

  const recentIssuances: CatBondIssuance[] = CAT_BOND_ISSUANCE_SEEDS.map((seed) => {
    const sizeJitter = Math.round((rng() - 0.5) * 100);
    const elJitter = (rng() - 0.5) * 0.6;
    const couponJitter = (rng() - 0.5) * 1.5;

    return {
      sponsor: seed.sponsor,
      size: `$${Math.max(100, seed.baseSize + sizeJitter)}M`,
      peril: seed.peril,
      expectedLoss: `${roundTo(clamp(seed.baseExpectedLoss + elJitter, 0.5, 5), 1)}%`,
      coupon: `${roundTo(clamp(seed.baseCoupon + couponJitter, 3, 15), 2)}%`,
    };
  });

  return {
    totalOutstandingBillions,
    newIssuanceYTDBillions,
    spreadOverLiborBps: `${spreadLow}-${spreadHigh}`,
    expectedLossRange: `${elLow}%-${elHigh}%`,
    recentIssuances,
  };
}

function generateLossEvents(rng: () => number): LossEvent[] {
  return LOSS_EVENT_SEEDS.map((seed) => {
    const lossJitter = (rng() - 0.5) * seed.baseInsuredLoss * 0.15;

    return {
      event: seed.event,
      date: seed.date,
      region: seed.region,
      estimatedInsuredLossBillions: roundTo(Math.max(0.5, seed.baseInsuredLoss + lossJitter), 1),
      line: seed.line,
    };
  });
}

function generateTopInsurers(rng: () => number): InsurerPerformance[] {
  return INSURER_SEEDS.map((seed) => {
    const premiumJitter = (rng() - 0.5) * seed.basePremiums * 0.08;
    const combinedJitter = (rng() - 0.5) * 3;
    const investmentJitter = (rng() - 0.5) * 0.8;
    const stockJitter = (rng() - 0.5) * 6;

    return {
      company: seed.company,
      premiumsWrittenBillions: roundTo(Math.max(5, seed.basePremiums + premiumJitter), 1),
      combinedRatio: roundTo(clamp(seed.baseCombinedRatio + combinedJitter, 82, 110), 1),
      investmentReturn: roundTo(clamp(seed.baseInvestmentReturn + investmentJitter, 1.5, 7), 1),
      stockYTDPct: roundTo(seed.baseStockYTD + stockJitter, 1),
    };
  });
}

// ── Data Generation: Insurer Stocks (preserved from original) ──

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function generateInsurerStocks(rng: () => number): InsurerStock[] {
  return INSURER_STOCKS.map((s) => {
    const price = roundTo(jitter(s.basePrice, 0.06, rng), 2);
    const change = roundTo((rng() - 0.45) * 4, 2);
    const marketCap = roundTo(jitter(s.baseCap, 0.05, rng), 1);
    const pe = roundTo(jitter(s.basePE, 0.08, rng), 1);
    const combinedRatio = roundTo(jitter(s.baseCR, 0.04, rng), 1);
    const returnOnEquity = roundTo(jitter(s.baseROE, 0.1, rng), 1);

    return {
      ticker: s.ticker,
      name: s.name,
      price,
      priceUnit: 'USD',
      change,
      changeUnit: '%',
      marketCap,
      marketCapUnit: 'B USD',
      pe,
      combinedRatio,
      combinedRatioUnit: '%',
      returnOnEquity,
      returnOnEquityUnit: '%',
    };
  });
}

// ── Data Generation: Premium Data (preserved from original) ──

function generatePremiumData(rng: () => number): PremiumLine[] {
  return PREMIUM_LINES.map((l) => {
    const grossWrittenPremium = roundTo(jitter(l.baseGWP, 0.08, rng), 1);
    const netWrittenPremium = roundTo(jitter(l.baseNWP, 0.08, rng), 1);
    const rateChange = roundTo(jitter(l.baseRate, 0.25, rng), 1);
    const lossRatio = roundTo(jitter(l.baseLoss, 0.06, rng), 1);
    const expenseRatio = roundTo(jitter(l.baseExpense, 0.05, rng), 1);
    const combinedRatio = roundTo(lossRatio + expenseRatio, 1);

    return {
      line: l.line,
      grossWrittenPremium,
      grossWrittenPremiumUnit: 'B USD',
      netWrittenPremium,
      netWrittenPremiumUnit: 'B USD',
      rateChange,
      rateChangeUnit: '%',
      lossRatio,
      lossRatioUnit: '%',
      expenseRatio,
      expenseRatioUnit: '%',
      combinedRatio,
      combinedRatioUnit: '%',
    };
  });
}

// ── Data Generation: Cat Bond Details (preserved from original) ──

function generateCatBondDetails(rng: () => number): CatBondDetail[] {
  const now = new Date();
  const statuses = ['outstanding', 'triggered', 'expired'] as const;

  return CAT_BOND_TEMPLATES.map((tmpl) => {
    const couponSpread = Math.round(rangef(250, 900, rng));
    const expectedLoss = roundTo(rangef(0.8, 7.5, rng), 2);
    const outstandingAmount = Math.round(rangef(100, 500, rng));
    const maturityYear = now.getFullYear() + Math.floor(rangef(1, 4, rng));

    const statusRoll = rng();
    let status: typeof statuses[number];
    if (statusRoll < 0.75) status = 'outstanding';
    else if (statusRoll < 0.90) status = 'triggered';
    else status = 'expired';

    return {
      name: tmpl.name,
      peril: tmpl.peril,
      trigger: tmpl.trigger,
      couponSpread,
      couponSpreadUnit: 'bps',
      expectedLoss,
      expectedLossUnit: '%',
      outstandingAmount,
      outstandingAmountUnit: 'M USD',
      maturityYear,
      status,
    };
  });
}

// ── Data Generation: Reinsurance Pricing (preserved from original) ──

function generateReinsurancePricing(rng: () => number): ReinsurancePricing {
  const baseROLIndex = roundTo(jitter(7.8, 0.1, rng), 1);
  const basePropCatChange = roundTo(jitter(8.5, 0.2, rng), 1);
  const baseCasualtyChange = roundTo(jitter(4.2, 0.15, rng), 1);
  const baseRetroPricing = roundTo(jitter(12.5, 0.12, rng), 1);

  const byRegion = REINSURANCE_REGIONS.map((region) => {
    let propCatMult: number;
    let casualtyMult: number;
    let rolMult: number;
    switch (region) {
      case 'US':
        propCatMult = 1.0; casualtyMult = 1.0; rolMult = 1.0; break;
      case 'Europe':
        propCatMult = 0.7; casualtyMult = 0.85; rolMult = 0.8; break;
      case 'Japan':
        propCatMult = 0.9; casualtyMult = 0.65; rolMult = 0.85; break;
      case 'Emerging':
        propCatMult = 1.3; casualtyMult = 1.1; rolMult = 1.15; break;
      default:
        propCatMult = 1.0; casualtyMult = 1.0; rolMult = 1.0;
    }

    return {
      region,
      propertyCatRateChange: roundTo(basePropCatChange * jitter(propCatMult, 0.08, rng), 1),
      propertyCatRateChangeUnit: '%',
      casualtyRateChange: roundTo(baseCasualtyChange * jitter(casualtyMult, 0.08, rng), 1),
      casualtyRateChangeUnit: '%',
      rateOnLine: roundTo(baseROLIndex * jitter(rolMult, 0.06, rng), 1),
      rateOnLineUnit: '%',
    };
  });

  return {
    guyCarpenterROLIndex: baseROLIndex,
    guyCarpenterROLIndexUnit: '%',
    propertyCatRateChange: basePropCatChange,
    propertyCatRateChangeUnit: '%',
    casualtyRateChange: baseCasualtyChange,
    casualtyRateChangeUnit: '%',
    retroPricing: baseRetroPricing,
    retroPricingUnit: '% rate-on-line',
    byRegion,
  };
}

// ── Data Generation: Market Metrics (preserved from original) ──

function generateMarketMetrics(rng: () => number): MarketMetrics {
  const globalPremiumVolume = roundTo(jitter(7.1, 0.05, rng), 2);
  const protectionGap = roundTo(jitter(1.8, 0.08, rng), 2);

  const insurancePenetration: InsurancePenetration[] = [
    { region: 'US', penetration: roundTo(jitter(11.2, 0.04, rng), 1) },
    { region: 'Europe', penetration: roundTo(jitter(7.5, 0.04, rng), 1) },
    { region: 'Japan', penetration: roundTo(jitter(8.8, 0.04, rng), 1) },
    { region: 'China', penetration: roundTo(jitter(4.5, 0.06, rng), 1) },
    { region: 'India', penetration: roundTo(jitter(3.8, 0.06, rng), 1) },
    { region: 'Latin America', penetration: roundTo(jitter(3.1, 0.06, rng), 1) },
    { region: 'Middle East & Africa', penetration: roundTo(jitter(2.4, 0.07, rng), 1) },
    { region: 'Southeast Asia', penetration: roundTo(jitter(3.5, 0.06, rng), 1) },
  ];

  const solvencyRatios: SolvencyRatio[] = [
    { segment: 'US P&C', ratio: roundTo(jitter(310, 0.05, rng), 0) },
    { segment: 'US Life', ratio: roundTo(jitter(420, 0.05, rng), 0) },
    { segment: 'EU Solvency II (median)', ratio: roundTo(jitter(215, 0.06, rng), 0) },
    { segment: 'Bermuda Reinsurers', ratio: roundTo(jitter(280, 0.05, rng), 0) },
    { segment: "Lloyd's Market", ratio: roundTo(jitter(195, 0.06, rng), 0) },
  ];

  return {
    globalPremiumVolume,
    globalPremiumVolumeUnit: 'T USD',
    protectionGap,
    protectionGapUnit: 'T USD',
    insurancePenetration,
    insurancePenetrationUnit: '% of GDP',
    solvencyRatios,
    solvencyRatioUnit: '%',
  };
}

// ── Data Generation: Loss Events Legacy (preserved from original) ──

interface LossEventLegacy {
  event: string;
  type: string;
  estimatedLoss: number;
  estimatedLossUnit: string;
  insuredLoss: number;
  insuredLossUnit: string;
  date: string;
  region: string;
}

const LOSS_EVENT_TEMPLATES = [
  { name: 'Hurricane Marlene', type: 'Hurricane', region: 'US Gulf Coast', baseLoss: 18, baseInsured: 12 },
  { name: 'Midwest Derecho Complex', type: 'Severe Convective Storm', region: 'US Midwest', baseLoss: 5.5, baseInsured: 3.8 },
  { name: 'LA Wildfire Season', type: 'Wildfire', region: 'US West Coast', baseLoss: 8.2, baseInsured: 5.1 },
  { name: 'Tohoku M6.9 Earthquake', type: 'Earthquake', region: 'Japan', baseLoss: 12, baseInsured: 6.5 },
  { name: 'Storm Xander', type: 'European Windstorm', region: 'Northern Europe', baseLoss: 7.4, baseInsured: 5.8 },
  { name: 'Texas Flooding', type: 'Flood', region: 'US South Central', baseLoss: 4.2, baseInsured: 1.9 },
  { name: 'Typhoon Kanto', type: 'Typhoon', region: 'Japan', baseLoss: 9.8, baseInsured: 5.2 },
  { name: 'Chile Earthquake Swarm', type: 'Earthquake', region: 'South America', baseLoss: 6.1, baseInsured: 2.3 },
];

function generateLossEventsLegacy(rng: () => number): LossEventLegacy[] {
  const now = new Date();
  return LOSS_EVENT_TEMPLATES.map((evt) => {
    const daysAgo = Math.floor(rangef(5, 180, rng));
    const eventDate = new Date(now.getTime() - daysAgo * 86400000);
    const estimatedLoss = roundTo(jitter(evt.baseLoss, 0.2, rng), 1);
    const insuredLoss = roundTo(jitter(evt.baseInsured, 0.2, rng), 1);

    return {
      event: evt.name,
      type: evt.type,
      estimatedLoss,
      estimatedLossUnit: 'B USD',
      insuredLoss,
      insuredLossUnit: 'B USD',
      date: eventDate.toISOString().slice(0, 10),
      region: evt.region,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// ── Combined Generator ──

function generateInsuranceMarketData(): InsuranceMarketResponse {
  const rng = seededRandom('insurance-market');

  return {
    marketOverview: generateMarketOverview(rng),
    pcLines: generatePCLines(rng),
    reinsuranceRates: generateReinsuranceRates(rng),
    catBondMarket: generateCatBondMarket(rng),
    lossEvents: generateLossEvents(rng),
    topInsurers: generateTopInsurers(rng),
    insurerStocks: generateInsurerStocks(rng),
    premiumData: generatePremiumData(rng),
    catastropheBondDetails: generateCatBondDetails(rng),
    reinsurancePricing: generateReinsurancePricing(rng),
    marketMetrics: generateMarketMetrics(rng),
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: InsuranceMarketResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateInsuranceMarketData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[InsuranceMarket] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate insurance market data' });
  }
});

export default router;
