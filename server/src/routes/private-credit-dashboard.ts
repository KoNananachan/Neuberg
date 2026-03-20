import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

const round0 = (v: number) => Math.round(v);
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

// ── Static Data ──

const DEAL_PIPELINE_STATIC = [
  { borrower: 'Athena Healthcare Partners', sector: 'Healthcare Services', baseSize: 750, baseSpread: 525, structure: 'Unitranche' as const, rating: 'B+', arranger: 'Ares Management' },
  { borrower: 'Pinnacle Cloud Technologies', sector: 'Enterprise Software', baseSize: 480, baseSpread: 475, structure: 'First Lien' as const, rating: 'BB-', arranger: 'Owl Rock Capital' },
  { borrower: 'Trident Financial Services', sector: 'Financial Services', baseSize: 620, baseSpread: 550, structure: 'Unitranche' as const, rating: 'B', arranger: 'Golub Capital' },
  { borrower: 'Ironclad Industrial Group', sector: 'Industrials', baseSize: 340, baseSpread: 500, structure: 'First Lien + Second Lien' as const, rating: 'B', arranger: 'HPS Investment Partners' },
  { borrower: 'Crestwood Consumer Brands', sector: 'Consumer Products', baseSize: 280, baseSpread: 575, structure: 'Unitranche' as const, rating: 'B-', arranger: 'Blue Owl Capital' },
  { borrower: 'Vantage Advisory Holdings', sector: 'Business Services', baseSize: 410, baseSpread: 500, structure: 'First Lien' as const, rating: 'BB-', arranger: 'Ares Management' },
  { borrower: 'NovaMed Diagnostics', sector: 'Healthcare Services', baseSize: 560, baseSpread: 540, structure: 'Unitranche' as const, rating: 'B+', arranger: 'KKR Credit' },
  { borrower: 'Apex Data Analytics', sector: 'Enterprise Software', baseSize: 390, baseSpread: 460, structure: 'First Lien' as const, rating: 'BB-', arranger: 'Golub Capital' },
  { borrower: 'Heritage Environmental', sector: 'Industrials', baseSize: 520, baseSpread: 510, structure: 'First Lien + Second Lien' as const, rating: 'B', arranger: 'HPS Investment Partners' },
  { borrower: 'Meridian Insurance Group', sector: 'Financial Services', baseSize: 680, baseSpread: 490, structure: 'Unitranche' as const, rating: 'BB-', arranger: 'Owl Rock Capital' },
  { borrower: 'Summit Education Partners', sector: 'Business Services', baseSize: 220, baseSpread: 600, structure: 'Unitranche' as const, rating: 'B-', arranger: 'Blue Owl Capital' },
  { borrower: 'Clearpath Logistics', sector: 'Industrials', baseSize: 450, baseSpread: 530, structure: 'First Lien' as const, rating: 'B+', arranger: 'KKR Credit' },
];

const DEAL_STATUSES = ['In Market', 'Mandated', 'Launched', 'Pre-Marketing', 'Closed'] as const;

const BDC_STATIC = [
  { name: 'Ares Capital Corp', ticker: 'ARCC', baseNav: 19.45, basePrice: 20.80, baseDivYield: 9.4, baseTotalAssets: 22.8, baseNII: 0.61, baseNonAccruals: 1.6 },
  { name: 'Blue Owl Capital Corp', ticker: 'OBDC', baseNav: 15.72, basePrice: 14.95, baseDivYield: 10.8, baseTotalAssets: 13.5, baseNII: 0.47, baseNonAccruals: 1.1 },
  { name: 'Owl Rock Core Income', ticker: 'ORCC', baseNav: 15.10, basePrice: 13.82, baseDivYield: 11.4, baseTotalAssets: 10.9, baseNII: 0.44, baseNonAccruals: 1.4 },
  { name: 'Golub Capital BDC', ticker: 'GBDC', baseNav: 15.25, basePrice: 15.60, baseDivYield: 10.2, baseTotalAssets: 8.2, baseNII: 0.39, baseNonAccruals: 0.9 },
  { name: 'FS KKR Capital Corp', ticker: 'FSK', baseNav: 24.10, basePrice: 20.45, baseDivYield: 12.8, baseTotalAssets: 15.3, baseNII: 0.72, baseNonAccruals: 2.4 },
  { name: 'Main Street Capital', ticker: 'MAIN', baseNav: 28.50, basePrice: 46.20, baseDivYield: 5.8, baseTotalAssets: 7.6, baseNII: 1.08, baseNonAccruals: 0.5 },
  { name: 'Prospect Capital Corp', ticker: 'PSEC', baseNav: 8.72, basePrice: 5.45, baseDivYield: 13.2, baseTotalAssets: 7.1, baseNII: 0.18, baseNonAccruals: 3.8 },
  { name: 'Hercules Capital', ticker: 'HTGC', baseNav: 11.85, basePrice: 18.90, baseDivYield: 9.6, baseTotalAssets: 3.8, baseNII: 0.51, baseNonAccruals: 0.7 },
  { name: 'PennantPark Floating Rate', ticker: 'PFLT', baseNav: 11.40, basePrice: 11.15, baseDivYield: 11.0, baseTotalAssets: 4.2, baseNII: 0.32, baseNonAccruals: 1.3 },
  { name: 'Gladstone Investment Corp', ticker: 'GAIN', baseNav: 14.20, basePrice: 14.55, baseDivYield: 6.8, baseTotalAssets: 3.4, baseNII: 0.25, baseNonAccruals: 2.1 },
  { name: 'Trinity Capital', ticker: 'TRIN', baseNav: 14.60, basePrice: 15.10, baseDivYield: 13.5, baseTotalAssets: 2.9, baseNII: 0.52, baseNonAccruals: 0.8 },
  { name: 'Sixth Street Specialty Lending', ticker: 'TPVG', baseNav: 16.80, basePrice: 17.25, baseDivYield: 8.9, baseTotalAssets: 5.1, baseNII: 0.42, baseNonAccruals: 0.6 },
];

const VINTAGE_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const VINTAGE_BASE = [
  { deployment: 68, irr: 12.8, moic: 1.48, defaultRate: 4.2, recoveryRate: 62, lossRate: 1.6 },
  { deployment: 85, irr: 13.5, moic: 1.44, defaultRate: 3.6, recoveryRate: 65, lossRate: 1.3 },
  { deployment: 78, irr: 14.8, moic: 1.52, defaultRate: 3.1, recoveryRate: 68, lossRate: 1.0 },
  { deployment: 112, irr: 11.2, moic: 1.32, defaultRate: 4.8, recoveryRate: 58, lossRate: 2.0 },
  { deployment: 140, irr: 14.5, moic: 1.38, defaultRate: 2.8, recoveryRate: 70, lossRate: 0.8 },
  { deployment: 165, irr: 15.2, moic: 1.24, defaultRate: 1.9, recoveryRate: 72, lossRate: 0.5 },
  { deployment: 180, irr: 12.0, moic: 1.12, defaultRate: 1.1, recoveryRate: 74, lossRate: 0.3 },
  { deployment: 98, irr: 0, moic: 1.02, defaultRate: 0.3, recoveryRate: 78, lossRate: 0.1 },
];

const SECTORS_ALLOC = [
  { sector: 'Healthcare Services', baseWeight: 18.5 },
  { sector: 'Enterprise Software', baseWeight: 22.3 },
  { sector: 'Financial Services', baseWeight: 12.8 },
  { sector: 'Industrials', baseWeight: 10.4 },
  { sector: 'Business Services', baseWeight: 14.2 },
  { sector: 'Consumer Products', baseWeight: 7.6 },
  { sector: 'Technology Infrastructure', baseWeight: 6.8 },
  { sector: 'Energy & Utilities', baseWeight: 4.1 },
  { sector: 'Media & Telecom', baseWeight: 3.3 },
];

const GEO_BREAKDOWN = [
  { region: 'North America', baseWeight: 62.5 },
  { region: 'Western Europe', baseWeight: 21.8 },
  { region: 'Asia-Pacific', baseWeight: 7.2 },
  { region: 'UK & Ireland', baseWeight: 4.8 },
  { region: 'Nordics', baseWeight: 2.1 },
  { region: 'Rest of World', baseWeight: 1.6 },
];

const FUND_COMPARISON_STATIC = [
  { fund: 'Ares Senior Secured Lending Fund IV', vintage: 2021, strategy: 'Direct Lending', baseIrr: 13.8, baseMoic: 1.35, baseYield: 11.2, baseDPI: 0.62, sizeB: 10.5 },
  { fund: 'Owl Rock Capital Corp III', vintage: 2022, strategy: 'Direct Lending', baseIrr: 14.5, baseMoic: 1.28, baseYield: 11.8, baseDPI: 0.42, sizeB: 8.2 },
  { fund: 'HPS Strategic Investment Partners V', vintage: 2021, strategy: 'Opportunistic Credit', baseIrr: 16.2, baseMoic: 1.42, baseYield: 12.5, baseDPI: 0.55, sizeB: 11.8 },
  { fund: 'Golub Capital Partners 14', vintage: 2022, strategy: 'Direct Lending', baseIrr: 12.6, baseMoic: 1.22, baseYield: 10.8, baseDPI: 0.38, sizeB: 7.5 },
  { fund: 'Apollo Accord Fund III', vintage: 2020, strategy: 'Hybrid Credit', baseIrr: 15.8, baseMoic: 1.48, baseYield: 12.0, baseDPI: 0.72, sizeB: 9.3 },
  { fund: 'KKR Lending Partners IV', vintage: 2022, strategy: 'Direct Lending', baseIrr: 13.2, baseMoic: 1.24, baseYield: 11.5, baseDPI: 0.35, sizeB: 12.4 },
  { fund: 'Blue Owl Credit Income Fund II', vintage: 2023, strategy: 'Direct Lending', baseIrr: 14.0, baseMoic: 1.14, baseYield: 11.0, baseDPI: 0.18, sizeB: 6.8 },
  { fund: 'Blackstone Private Credit Fund', vintage: 2021, strategy: 'Direct Lending', baseIrr: 12.4, baseMoic: 1.38, baseYield: 10.5, baseDPI: 0.58, sizeB: 25.0 },
  { fund: 'TCG BDC Senior Secured Fund', vintage: 2023, strategy: 'Senior Secured', baseIrr: 11.8, baseMoic: 1.10, baseYield: 10.2, baseDPI: 0.12, sizeB: 5.4 },
  { fund: 'Oaktree Specialty Lending', vintage: 2020, strategy: 'Opportunistic Credit', baseIrr: 17.1, baseMoic: 1.55, baseYield: 13.2, baseDPI: 0.82, sizeB: 4.8 },
];
let cache: { data: unknown; ts: number } | null = null;
let staleData: unknown = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('private-credit-dashboard-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // 1. Market Overview
  const totalAUM = round2(jitter(1.72, 0.04));
  const dryPowder = round1(jitter(428, 0.06));
  const deploymentPaceQ = round1(jitter(64.5, 0.08));
  const fundraisingQ = round1(jitter(52.3, 0.10));
  const avgFundSize = round1(jitter(3.4, 0.12));
  const numActiveFunds = round0(jitter(285, 0.08));
  const directLendingShare = round1(jitter(72, 0.05));
  const mezzanineShare = round1(jitter(12, 0.08));
  const distressedShare = round1(100 - directLendingShare - mezzanineShare - jitter(8, 0.1));
  const otherShare = round1(100 - directLendingShare - mezzanineShare - distressedShare);

  const marketOverview = {
    totalAUMTrillions: totalAUM,
    dryPowderBillions: dryPowder,
    quarterlyDeploymentBillions: deploymentPaceQ,
    quarterlyFundraisingBillions: fundraisingQ,
    avgFundSizeBillions: avgFundSize,
    numActiveFunds,
    strategyMix: {
      directLendingPct: directLendingShare,
      mezzaninePct: mezzanineShare,
      distressedPct: distressedShare,
      otherPct: otherShare,
    },
  };

  // 2. Deal Pipeline
  const dealPipeline = DEAL_PIPELINE_STATIC.map(d => {
    const size = round0(jitter(d.baseSize, 0.12));
    const spread = round0(jitter(d.baseSpread, 0.08));
    const sofrRate = 5.33;
    const allInYield = round2(sofrRate + spread / 100);
    const leverage = round1(jitter(5.2, 0.10));
    const status = pick(DEAL_STATUSES);
    const daysAgo = Math.floor(rng() * 45);
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

    return {
      borrower: d.borrower,
      sector: d.sector,
      sizeMM: size,
      spreadBps: spread,
      allInYield,
      leverageTurns: leverage,
      structure: d.structure,
      rating: d.rating,
      leadArranger: d.arranger,
      status,
      date,
    };
  });

  // 3. Default Rates by Vintage
  const vintagePerformance = VINTAGE_YEARS.map((year, idx) => {
    const base = VINTAGE_BASE[idx];
    const deployment = round1(jitter(base.deployment, 0.08));
    const irr = year === 2025 ? 0 : round1(jitter(base.irr, 0.06));
    const moic = round2(jitter(base.moic, 0.04));
    const defaultRate = round2(jitter(base.defaultRate, 0.12));
    const recoveryRate = round1(jitter(base.recoveryRate, 0.06));
    const lossRate = round2(jitter(base.lossRate, 0.15));

    return {
      year,
      deploymentBillions: deployment,
      netIRR: irr,
      moic,
      defaultRate,
      recoveryRate,
      lossRate,
    };
  });

  // 4. Covenant-Lite vs Covenant-Heavy Mix
  const covLitePct = round1(jitter(74, 0.05));
  const covHeavyPct = round1(100 - covLitePct);
  const covLiteAvgSpread = round0(jitter(485, 0.06));
  const covHeavyAvgSpread = round0(jitter(545, 0.06));
  const covLiteDefaultRate = round2(jitter(2.8, 0.12));
  const covHeavyDefaultRate = round2(jitter(1.9, 0.12));
  const covLiteRecoveryRate = round1(jitter(58, 0.08));
  const covHeavyRecoveryRate = round1(jitter(72, 0.08));

  const covenantMix = {
    covenantLite: {
      pct: covLitePct,
      avgSpreadBps: covLiteAvgSpread,
      defaultRate: covLiteDefaultRate,
      recoveryRate: covLiteRecoveryRate,
      avgLeverage: round1(jitter(5.6, 0.06)),
      avgEbitdaMM: round0(jitter(85, 0.10)),
    },
    covenantHeavy: {
      pct: covHeavyPct,
      avgSpreadBps: covHeavyAvgSpread,
      defaultRate: covHeavyDefaultRate,
      recoveryRate: covHeavyRecoveryRate,
      avgLeverage: round1(jitter(4.4, 0.06)),
      avgEbitdaMM: round0(jitter(42, 0.10)),
    },
    trend: {
      covLite1YAgo: round1(covLitePct - jitter(3.2, 0.20)),
      covLite3YAgo: round1(covLitePct - jitter(8.5, 0.15)),
      covLite5YAgo: round1(covLitePct - jitter(14.0, 0.12)),
    },
  };

  // 5. Sector Allocation
  let remainingWeight = 100;
  const sectorAllocation = SECTORS_ALLOC.map((s, i) => {
    const isLast = i === SECTORS_ALLOC.length - 1;
    const rawWeight = isLast ? remainingWeight : round1(jitter(s.baseWeight, 0.08));
    const weight = isLast ? round1(remainingWeight) : Math.min(rawWeight, remainingWeight - (SECTORS_ALLOC.length - i - 1) * 0.5);
    remainingWeight -= weight;
    const avgSpread = round0(jitter(500, 0.12));
    const defaultRate = round2(jitter(2.5, 0.25));
    const avgLeverage = round1(jitter(5.0, 0.10));

    return {
      sector: s.sector,
      weightPct: weight,
      avgSpreadBps: avgSpread,
      defaultRate,
      avgLeverage,
    };
  });

  // 6. Geographic Breakdown
  let geoRemaining = 100;
  const geographicBreakdown = GEO_BREAKDOWN.map((g, i) => {
    const isLast = i === GEO_BREAKDOWN.length - 1;
    const rawWeight = isLast ? geoRemaining : round1(jitter(g.baseWeight, 0.06));
    const weight = isLast ? round1(geoRemaining) : Math.min(rawWeight, geoRemaining - (GEO_BREAKDOWN.length - i - 1) * 0.3);
    geoRemaining -= weight;
    const avgYield = round2(jitter(10.5, 0.10));
    const dealCount = round0(jitter(45, 0.20));

    return {
      region: g.region,
      weightPct: weight,
      avgYield,
      dealCountYTD: dealCount,
    };
  });

  // 7. Return Metrics (aggregate)
  const returnMetrics = {
    directLending: {
      grossIRR: round1(jitter(13.8, 0.06)),
      netIRR: round1(jitter(11.2, 0.06)),
      moic: round2(jitter(1.32, 0.05)),
      currentYield: round2(jitter(10.8, 0.04)),
      totalReturn1Y: round2(jitter(12.5, 0.08)),
      totalReturn3Y: round2(jitter(11.8, 0.06)),
      sharpeRatio: round2(jitter(1.85, 0.08)),
    },
    opportunisticCredit: {
      grossIRR: round1(jitter(16.5, 0.08)),
      netIRR: round1(jitter(13.8, 0.08)),
      moic: round2(jitter(1.48, 0.06)),
      currentYield: round2(jitter(12.2, 0.05)),
      totalReturn1Y: round2(jitter(15.0, 0.10)),
      totalReturn3Y: round2(jitter(14.2, 0.08)),
      sharpeRatio: round2(jitter(1.62, 0.10)),
    },
    mezzanine: {
      grossIRR: round1(jitter(14.8, 0.07)),
      netIRR: round1(jitter(12.0, 0.07)),
      moic: round2(jitter(1.40, 0.05)),
      currentYield: round2(jitter(11.5, 0.04)),
      totalReturn1Y: round2(jitter(13.8, 0.08)),
      totalReturn3Y: round2(jitter(13.0, 0.06)),
      sharpeRatio: round2(jitter(1.72, 0.08)),
    },
    distressedCredit: {
      grossIRR: round1(jitter(18.2, 0.10)),
      netIRR: round1(jitter(14.5, 0.10)),
      moic: round2(jitter(1.62, 0.08)),
      currentYield: round2(jitter(14.0, 0.06)),
      totalReturn1Y: round2(jitter(17.5, 0.12)),
      totalReturn3Y: round2(jitter(15.8, 0.10)),
      sharpeRatio: round2(jitter(1.45, 0.12)),
    },
  };

  // 8. Fund Performance Comparison
  const fundPerformance = FUND_COMPARISON_STATIC.map(f => {
    const irr = round1(jitter(f.baseIrr, 0.06));
    const moic = round2(jitter(f.baseMoic, 0.05));
    const currentYield = round2(jitter(f.baseYield, 0.04));
    const dpi = round2(jitter(f.baseDPI, 0.08));
    const tvpi = round2(moic);
    const quarterlyReturn = round2(jitter(2.8, 0.15));

    return {
      fund: f.fund,
      vintage: f.vintage,
      strategy: f.strategy,
      fundSizeBillions: round1(jitter(f.sizeB, 0.06)),
      netIRR: irr,
      moic,
      tvpi,
      dpi,
      currentYield,
      quarterlyReturn,
    };
  });

  // 9. BDC Market Data
  const bdcMarket = BDC_STATIC.map(bdc => {
    const navPerShare = round2(jitter(bdc.baseNav, 0.03));
    const price = round2(jitter(bdc.basePrice, 0.04));
    const premiumDiscount = round1((price / navPerShare - 1) * 100);
    const dividendYield = round2(jitter(bdc.baseDivYield, 0.05));
    const totalAssetsBillions = round1(jitter(bdc.baseTotalAssets, 0.04));
    const niiPerShare = round2(jitter(bdc.baseNII, 0.06));
    const nonAccrualRate = round2(jitter(bdc.baseNonAccruals, 0.15));
    const debtToEquity = round2(jitter(1.15, 0.08));
    const portfolioYield = round2(jitter(12.0, 0.05));

    return {
      name: bdc.name,
      ticker: bdc.ticker,
      navPerShare,
      price,
      premiumDiscountPct: premiumDiscount,
      dividendYield,
      totalAssetsBillions,
      niiPerShare,
      nonAccrualRate,
      debtToEquity,
      portfolioYield,
    };
  });

  const bdcSummary = {
    avgPremiumDiscount: round1(bdcMarket.reduce((a, b) => a + b.premiumDiscountPct, 0) / bdcMarket.length),
    avgDividendYield: round2(bdcMarket.reduce((a, b) => a + b.dividendYield, 0) / bdcMarket.length),
    totalMarketCapBillions: round1(bdcMarket.reduce((a, b) => a + b.totalAssetsBillions, 0)),
    avgNonAccrualRate: round2(bdcMarket.reduce((a, b) => a + b.nonAccrualRate, 0) / bdcMarket.length),
  };

  return {
    marketOverview,
    dealPipeline,
    vintagePerformance,
    covenantMix,
    sectorAllocation,
    geographicBreakdown,
    returnMetrics,
    fundPerformance,
    bdcMarket,
    bdcSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    staleData = cache?.data ?? staleData;
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PrivateCreditDashboard] Error:', (err as Error).message);
    if (staleData) return res.json(staleData);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate private credit dashboard data' });
  }
});

export default router;
