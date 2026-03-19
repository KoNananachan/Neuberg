import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Types ──

interface TopRevenueSecurity {
  ticker: string;
  name: string;
  assetClass: 'Equity' | 'ETF' | 'Government Bond' | 'Corporate Bond';
  borrowFeeBps: number;
  utilization: number;
  onLoanValueM: number;
  dailyRevenueK: number;
  annualizedRevenueK: number;
  feeChange1d: number;
  feeChange1w: number;
  feeTier: 'GC' | 'Warm' | 'Special';
}

interface AssetClassBreakdown {
  assetClass: string;
  onLoanValueB: number;
  pctOfTotal: number;
  avgFeeBps: number;
  dailyRevenueK: number;
  securityCount: number;
}

interface RegionalSplit {
  region: string;
  onLoanValueB: number;
  pctOfTotal: number;
  avgFeeBps: number;
  dailyRevenueK: number;
  topSecurity: string;
}

interface FeeDistribution {
  tier: 'GC' | 'Warm' | 'Special';
  feeBpsRange: string;
  securityCount: number;
  onLoanValueB: number;
  pctOfLoanBook: number;
  avgFeeBps: number;
  revenueContributionPct: number;
}

interface ShortInterestChange {
  ticker: string;
  name: string;
  currentSI: number;
  previousSI: number;
  changeSI: number;
  currentFeeBps: number;
  direction: 'up' | 'down';
  daysOnWatch: number;
}

interface RevenueTrendDay {
  date: string;
  dailyRevenueK: number;
  onLoanValueB: number;
  avgFeeBps: number;
  specialRevenuePct: number;
}

interface BorrowerConcentration {
  borrowerType: string;
  onLoanValueB: number;
  pctOfTotal: number;
  avgFeeBps: number;
  securityCount: number;
  topHolding: string;
}

interface InventoryAvailability {
  ticker: string;
  name: string;
  totalInventoryM: number;
  availableInventoryM: number;
  onLoanM: number;
  utilization: number;
  recallRisk: 'Low' | 'Medium' | 'High';
  daysToRecall: number;
}

interface RevenueSummary {
  totalDailyRevenueK: number;
  totalAnnualizedRevenueM: number;
  totalOnLoanValueB: number;
  totalLendableValueB: number;
  overallUtilization: number;
  weightedAvgFeeBps: number;
  specialRevenueContributionPct: number;
  totalSecuritiesLent: number;
}

// ── Static Configs ──

const TOP_SECURITIES_CONFIG = [
  { ticker: 'GME', name: 'GameStop Corp', assetClass: 'Equity' as const, baseFee: 2200, baseUtil: 94, baseOnLoan: 180, region: 'North America' },
  { ticker: 'AMC', name: 'AMC Entertainment', assetClass: 'Equity' as const, baseFee: 1650, baseUtil: 91, baseOnLoan: 95, region: 'North America' },
  { ticker: 'CVNA', name: 'Carvana Co', assetClass: 'Equity' as const, baseFee: 1050, baseUtil: 86, baseOnLoan: 420, region: 'North America' },
  { ticker: 'UPST', name: 'Upstart Holdings', assetClass: 'Equity' as const, baseFee: 750, baseUtil: 76, baseOnLoan: 210, region: 'North America' },
  { ticker: 'BYND', name: 'Beyond Meat', assetClass: 'Equity' as const, baseFee: 880, baseUtil: 79, baseOnLoan: 65, region: 'North America' },
  { ticker: 'RIVN', name: 'Rivian Automotive', assetClass: 'Equity' as const, baseFee: 580, baseUtil: 66, baseOnLoan: 310, region: 'North America' },
  { ticker: 'LCID', name: 'Lucid Group', assetClass: 'Equity' as const, baseFee: 520, baseUtil: 61, baseOnLoan: 45, region: 'North America' },
  { ticker: 'SMCI', name: 'Super Micro Computer', assetClass: 'Equity' as const, baseFee: 650, baseUtil: 71, baseOnLoan: 380, region: 'North America' },
  { ticker: 'MARA', name: 'Marathon Digital', assetClass: 'Equity' as const, baseFee: 400, baseUtil: 57, baseOnLoan: 160, region: 'North America' },
  { ticker: 'TSLA', name: 'Tesla Inc', assetClass: 'Equity' as const, baseFee: 28, baseUtil: 18, baseOnLoan: 2800, region: 'North America' },
  { ticker: 'NVDA', name: 'NVIDIA Corp', assetClass: 'Equity' as const, baseFee: 14, baseUtil: 11, baseOnLoan: 4200, region: 'North America' },
  { ticker: 'AAPL', name: 'Apple Inc', assetClass: 'Equity' as const, baseFee: 8, baseUtil: 6, baseOnLoan: 3500, region: 'North America' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', assetClass: 'ETF' as const, baseFee: 320, baseUtil: 48, baseOnLoan: 520, region: 'North America' },
  { ticker: 'HYG', name: 'iShares HY Corp Bond ETF', assetClass: 'ETF' as const, baseFee: 45, baseUtil: 22, baseOnLoan: 1800, region: 'North America' },
  { ticker: 'XLF', name: 'Financial Select SPDR', assetClass: 'ETF' as const, baseFee: 18, baseUtil: 14, baseOnLoan: 950, region: 'North America' },
  { ticker: 'EEM', name: 'iShares MSCI EM ETF', assetClass: 'ETF' as const, baseFee: 35, baseUtil: 19, baseOnLoan: 1200, region: 'Asia Pacific' },
  { ticker: 'UST10', name: 'US Treasury 10Y On-the-Run', assetClass: 'Government Bond' as const, baseFee: 12, baseUtil: 85, baseOnLoan: 8500, region: 'North America' },
  { ticker: 'UST2', name: 'US Treasury 2Y On-the-Run', assetClass: 'Government Bond' as const, baseFee: 8, baseUtil: 82, baseOnLoan: 6200, region: 'North America' },
  { ticker: 'DBR10', name: 'German Bund 10Y', assetClass: 'Government Bond' as const, baseFee: 6, baseUtil: 78, baseOnLoan: 3800, region: 'Europe' },
  { ticker: 'JGB10', name: 'Japan Govt Bond 10Y', assetClass: 'Government Bond' as const, baseFee: 3, baseUtil: 72, baseOnLoan: 2400, region: 'Asia Pacific' },
  { ticker: 'AAPL5Y', name: 'Apple 2.65% 2028', assetClass: 'Corporate Bond' as const, baseFee: 22, baseUtil: 35, baseOnLoan: 450, region: 'North America' },
  { ticker: 'MSFT4Y', name: 'Microsoft 2.40% 2027', assetClass: 'Corporate Bond' as const, baseFee: 18, baseUtil: 30, baseOnLoan: 380, region: 'North America' },
  { ticker: 'GS5Y', name: 'Goldman Sachs 3.50% 2029', assetClass: 'Corporate Bond' as const, baseFee: 32, baseUtil: 42, baseOnLoan: 520, region: 'North America' },
  { ticker: 'BARC3Y', name: 'Barclays 4.10% 2027', assetClass: 'Corporate Bond' as const, baseFee: 28, baseUtil: 38, baseOnLoan: 310, region: 'Europe' },
  { ticker: 'TOTL5Y', name: 'TotalEnergies 3.25% 2029', assetClass: 'Corporate Bond' as const, baseFee: 15, baseUtil: 25, baseOnLoan: 220, region: 'Europe' },
];

const REGIONS_CONFIG = [
  { region: 'North America', basePct: 52, baseAvgFee: 85, topSecurity: 'UST10' },
  { region: 'Europe', basePct: 24, baseAvgFee: 42, topSecurity: 'DBR10' },
  { region: 'Asia Pacific', basePct: 16, baseAvgFee: 28, topSecurity: 'JGB10' },
  { region: 'United Kingdom', basePct: 5, baseAvgFee: 55, topSecurity: 'GILT10' },
  { region: 'Rest of World', basePct: 3, baseAvgFee: 65, topSecurity: 'BRL10' },
];

const BORROWER_TYPES_CONFIG = [
  { type: 'Hedge Fund', basePct: 38, baseAvgFee: 145, baseCount: 420, topHolding: 'GME' },
  { type: 'Broker-Dealer', basePct: 28, baseAvgFee: 55, baseCount: 680, topHolding: 'UST10' },
  { type: 'Asset Manager', basePct: 18, baseAvgFee: 32, baseCount: 540, topHolding: 'NVDA' },
  { type: 'Bank', basePct: 10, baseAvgFee: 18, baseCount: 320, topHolding: 'UST2' },
  { type: 'Pension Fund', basePct: 4, baseAvgFee: 12, baseCount: 180, topHolding: 'HYG' },
  { type: 'Insurance', basePct: 2, baseAvgFee: 10, baseCount: 95, topHolding: 'AAPL5Y' },
];

const SHORT_INTEREST_WATCH = [
  { ticker: 'GME', name: 'GameStop Corp', baseSI: 24.5, baseFee: 2200 },
  { ticker: 'AMC', name: 'AMC Entertainment', baseSI: 21.8, baseFee: 1650 },
  { ticker: 'CVNA', name: 'Carvana Co', baseSI: 18.2, baseFee: 1050 },
  { ticker: 'UPST', name: 'Upstart Holdings', baseSI: 32.5, baseFee: 750 },
  { ticker: 'BYND', name: 'Beyond Meat', baseSI: 38.1, baseFee: 880 },
  { ticker: 'RIVN', name: 'Rivian Automotive', baseSI: 15.6, baseFee: 580 },
  { ticker: 'SMCI', name: 'Super Micro Computer', baseSI: 12.8, baseFee: 650 },
  { ticker: 'MARA', name: 'Marathon Digital', baseSI: 19.4, baseFee: 400 },
  { ticker: 'LCID', name: 'Lucid Group', baseSI: 16.9, baseFee: 520 },
  { ticker: 'NKLA', name: 'Nikola Corp', baseSI: 28.3, baseFee: 600 },
];

const INVENTORY_WATCH = [
  { ticker: 'GME', name: 'GameStop Corp', baseTotal: 45, baseOnLoan: 42, baseRecallDays: 3 },
  { ticker: 'AMC', name: 'AMC Entertainment', baseTotal: 38, baseOnLoan: 34, baseRecallDays: 2 },
  { ticker: 'CVNA', name: 'Carvana Co', baseTotal: 82, baseOnLoan: 70, baseRecallDays: 4 },
  { ticker: 'UPST', name: 'Upstart Holdings', baseTotal: 28, baseOnLoan: 21, baseRecallDays: 3 },
  { ticker: 'UST10', name: 'US Treasury 10Y', baseTotal: 850, baseOnLoan: 720, baseRecallDays: 1 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', baseTotal: 520, baseOnLoan: 58, baseRecallDays: 2 },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', baseTotal: 95, baseOnLoan: 46, baseRecallDays: 2 },
  { ticker: 'HYG', name: 'iShares HY Corp Bond ETF', baseTotal: 280, baseOnLoan: 62, baseRecallDays: 1 },
  { ticker: 'SMCI', name: 'Super Micro Computer', baseTotal: 65, baseOnLoan: 46, baseRecallDays: 4 },
  { ticker: 'GS5Y', name: 'Goldman Sachs 3.50% 2029', baseTotal: 120, baseOnLoan: 50, baseRecallDays: 1 },
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function classifyFeeTier(bps: number): 'GC' | 'Warm' | 'Special' {
  if (bps < 50) return 'GC';
  if (bps < 500) return 'Warm';
  return 'Special';
}

function classifyRecallRisk(util: number): 'Low' | 'Medium' | 'High' {
  if (util > 85) return 'High';
  if (util > 55) return 'Medium';
  return 'Low';
}

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('securities-lending-revenue-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));

  // 1. Top Revenue-Generating Securities
  const topRevenueSecurities: TopRevenueSecurity[] = TOP_SECURITIES_CONFIG.map(s => {
    const borrowFeeBps = Math.round(jitter(s.baseFee, 0.12));
    const utilization = Math.min(99.9, Math.max(1, Math.round(jitter(s.baseUtil, 0.08) * 10) / 10));
    const onLoanValueM = Math.round(jitter(s.baseOnLoan, 0.15) * 100) / 100;
    const dailyRevenueK = Math.round(onLoanValueM * 1_000_000 * (borrowFeeBps / 10000) / 365 / 1000 * 100) / 100;
    const annualizedRevenueK = Math.round(dailyRevenueK * 365 * 100) / 100;
    const feeChange1d = Math.round((rng() - 0.45) * borrowFeeBps * 0.06);
    const feeChange1w = Math.round((rng() - 0.42) * borrowFeeBps * 0.15);
    const feeTier = classifyFeeTier(borrowFeeBps);

    return {
      ticker: s.ticker,
      name: s.name,
      assetClass: s.assetClass,
      borrowFeeBps,
      utilization,
      onLoanValueM,
      dailyRevenueK,
      annualizedRevenueK,
      feeChange1d,
      feeChange1w,
      feeTier,
    };
  });

  topRevenueSecurities.sort((a, b) => b.dailyRevenueK - a.dailyRevenueK);

  // 2. Asset Class Breakdown
  const assetClasses = ['Equity', 'ETF', 'Government Bond', 'Corporate Bond'];
  const totalOnLoanAll = topRevenueSecurities.reduce((a, c) => a + c.onLoanValueM, 0);
  const totalDailyRevAll = topRevenueSecurities.reduce((a, c) => a + c.dailyRevenueK, 0);

  const assetClassBreakdown: AssetClassBreakdown[] = assetClasses.map(ac => {
    const items = topRevenueSecurities.filter(s => s.assetClass === ac);
    const onLoanValueB = Math.round(items.reduce((a, c) => a + c.onLoanValueM, 0) / 1000 * 100) / 100;
    const pctOfTotal = totalOnLoanAll > 0
      ? Math.round(items.reduce((a, c) => a + c.onLoanValueM, 0) / totalOnLoanAll * 10000) / 100
      : 0;
    const avgFeeBps = items.length > 0
      ? Math.round(items.reduce((a, c) => a + c.borrowFeeBps * c.onLoanValueM, 0) / Math.max(1, items.reduce((a, c) => a + c.onLoanValueM, 0)))
      : 0;
    const dailyRevenueK = Math.round(items.reduce((a, c) => a + c.dailyRevenueK, 0) * 100) / 100;

    return {
      assetClass: ac,
      onLoanValueB,
      pctOfTotal,
      avgFeeBps,
      dailyRevenueK,
      securityCount: items.length,
    };
  });

  // 3. Regional Split
  const totalOnLoanB = Math.round(totalOnLoanAll / 1000 * 100) / 100;

  const regionalSplit: RegionalSplit[] = REGIONS_CONFIG.map(r => {
    const pctOfTotal = Math.round(jitter(r.basePct, 0.06) * 10) / 10;
    const onLoanValueB = Math.round(totalOnLoanB * (pctOfTotal / 100) * 100) / 100;
    const avgFeeBps = Math.round(jitter(r.baseAvgFee, 0.1));
    const dailyRevenueK = Math.round(onLoanValueB * 1_000_000_000 * (avgFeeBps / 10000) / 365 / 1000 * 100) / 100;

    return {
      region: r.region,
      onLoanValueB,
      pctOfTotal,
      avgFeeBps,
      dailyRevenueK,
      topSecurity: r.topSecurity,
    };
  });

  // Normalize regional pctOfTotal to 100
  const regPctSum = regionalSplit.reduce((a, c) => a + c.pctOfTotal, 0);
  regionalSplit.forEach(r => { r.pctOfTotal = Math.round(r.pctOfTotal / regPctSum * 10000) / 100; });

  // 4. Fee Distribution (GC vs Warm vs Special)
  const tiers: { tier: 'GC' | 'Warm' | 'Special'; range: string }[] = [
    { tier: 'GC', range: '0-49 bps' },
    { tier: 'Warm', range: '50-499 bps' },
    { tier: 'Special', range: '500+ bps' },
  ];

  const totalRevenue = topRevenueSecurities.reduce((a, c) => a + c.dailyRevenueK, 0);

  const feeDistribution: FeeDistribution[] = tiers.map(t => {
    const items = topRevenueSecurities.filter(s => s.feeTier === t.tier);
    const onLoanValueB = Math.round(items.reduce((a, c) => a + c.onLoanValueM, 0) / 1000 * 100) / 100;
    const pctOfLoanBook = totalOnLoanAll > 0
      ? Math.round(items.reduce((a, c) => a + c.onLoanValueM, 0) / totalOnLoanAll * 10000) / 100
      : 0;
    const avgFeeBps = items.length > 0
      ? Math.round(items.reduce((a, c) => a + c.borrowFeeBps * c.onLoanValueM, 0) / Math.max(1, items.reduce((a, c) => a + c.onLoanValueM, 0)))
      : 0;
    const tierRevenue = items.reduce((a, c) => a + c.dailyRevenueK, 0);
    const revenueContributionPct = totalRevenue > 0
      ? Math.round(tierRevenue / totalRevenue * 10000) / 100
      : 0;

    return {
      tier: t.tier,
      feeBpsRange: t.range,
      securityCount: items.length,
      onLoanValueB,
      pctOfLoanBook,
      avgFeeBps,
      revenueContributionPct,
    };
  });

  // 5. Short Interest Changes
  const shortInterestChanges: ShortInterestChange[] = SHORT_INTEREST_WATCH.map(s => {
    const currentSI = Math.round(jitter(s.baseSI, 0.12) * 100) / 100;
    const changeSI = Math.round((rng() - 0.4) * s.baseSI * 0.15 * 100) / 100;
    const previousSI = Math.round((currentSI - changeSI) * 100) / 100;
    const currentFeeBps = Math.round(jitter(s.baseFee, 0.1));
    const daysOnWatch = Math.round(1 + rng() * 90);

    return {
      ticker: s.ticker,
      name: s.name,
      currentSI,
      previousSI,
      changeSI,
      currentFeeBps,
      direction: (changeSI >= 0 ? 'up' : 'down') as 'up' | 'down',
      daysOnWatch,
    };
  });

  shortInterestChanges.sort((a, b) => Math.abs(b.changeSI) - Math.abs(a.changeSI));

  // 6. Revenue Trend (30 days)
  const revenueTrend: RevenueTrendDay[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const trendDate = new Date(now);
    trendDate.setDate(trendDate.getDate() - i);
    const dateStr = trendDate.toISOString().slice(0, 10);
    const dayRng = mulberry32(hashSeed('slr-trend-' + dateStr));

    const dailyRevenueK = Math.round(jitter(totalDailyRevAll, 0.12) * (0.9 + dayRng() * 0.2) * 100) / 100;
    const onLoanValueB = Math.round(jitter(totalOnLoanB, 0.08) * (0.95 + dayRng() * 0.1) * 100) / 100;
    const avgFeeBps = Math.round(jitter(65, 0.15) + (dayRng() - 0.5) * 12);
    const specialRevenuePct = Math.round((35 + (dayRng() - 0.5) * 15) * 10) / 10;

    revenueTrend.push({
      date: dateStr,
      dailyRevenueK: Math.max(0, dailyRevenueK),
      onLoanValueB: Math.max(0.01, onLoanValueB),
      avgFeeBps: Math.max(1, avgFeeBps),
      specialRevenuePct: Math.min(100, Math.max(0, specialRevenuePct)),
    });
  }

  // 7. Borrower Concentration
  const borrowerConcentration: BorrowerConcentration[] = BORROWER_TYPES_CONFIG.map(b => {
    const pctOfTotal = Math.round(jitter(b.basePct, 0.08) * 10) / 10;
    const onLoanValueB = Math.round(totalOnLoanB * (pctOfTotal / 100) * 100) / 100;
    const avgFeeBps = Math.round(jitter(b.baseAvgFee, 0.1));
    const securityCount = Math.round(jitter(b.baseCount, 0.12));

    return {
      borrowerType: b.type,
      onLoanValueB,
      pctOfTotal,
      avgFeeBps,
      securityCount,
      topHolding: b.topHolding,
    };
  });

  // Normalize borrower pctOfTotal to 100
  const borPctSum = borrowerConcentration.reduce((a, c) => a + c.pctOfTotal, 0);
  borrowerConcentration.forEach(b => { b.pctOfTotal = Math.round(b.pctOfTotal / borPctSum * 10000) / 100; });

  // 8. Inventory Availability
  const inventoryAvailability: InventoryAvailability[] = INVENTORY_WATCH.map(inv => {
    const totalInventoryM = Math.round(jitter(inv.baseTotal, 0.1) * 100) / 100;
    const onLoanM = Math.round(jitter(inv.baseOnLoan, 0.1) * 100) / 100;
    const availableInventoryM = Math.round(Math.max(0, totalInventoryM - onLoanM) * 100) / 100;
    const utilization = totalInventoryM > 0
      ? Math.round(onLoanM / totalInventoryM * 1000) / 10
      : 0;
    const daysToRecall = Math.max(1, Math.round(jitter(inv.baseRecallDays, 0.3)));

    return {
      ticker: inv.ticker,
      name: inv.name,
      totalInventoryM,
      availableInventoryM,
      onLoanM,
      utilization: Math.min(99.9, utilization),
      recallRisk: classifyRecallRisk(utilization),
      daysToRecall,
    };
  });

  inventoryAvailability.sort((a, b) => b.utilization - a.utilization);

  // 9. Revenue Summary
  const totalLendableValueB = Math.round(
    inventoryAvailability.reduce((a, c) => a + c.totalInventoryM, 0) / 1000 * 3.5 * 100
  ) / 100;
  const overallUtilization = totalLendableValueB > 0
    ? Math.round(totalOnLoanB / totalLendableValueB * 1000) / 10
    : 0;
  const weightedFeeNum = topRevenueSecurities.reduce((a, c) => a + c.borrowFeeBps * c.onLoanValueM, 0);
  const weightedFeeDen = topRevenueSecurities.reduce((a, c) => a + c.onLoanValueM, 0);
  const weightedAvgFeeBps = weightedFeeDen > 0 ? Math.round(weightedFeeNum / weightedFeeDen) : 0;
  const specialItems = topRevenueSecurities.filter(s => s.feeTier === 'Special');
  const specialRevContrib = totalRevenue > 0
    ? Math.round(specialItems.reduce((a, c) => a + c.dailyRevenueK, 0) / totalRevenue * 10000) / 100
    : 0;

  const summary: RevenueSummary = {
    totalDailyRevenueK: Math.round(totalDailyRevAll * 100) / 100,
    totalAnnualizedRevenueM: Math.round(totalDailyRevAll * 365 / 1000 * 100) / 100,
    totalOnLoanValueB: totalOnLoanB,
    totalLendableValueB,
    overallUtilization: Math.min(99.9, overallUtilization),
    weightedAvgFeeBps,
    specialRevenueContributionPct: specialRevContrib,
    totalSecuritiesLent: topRevenueSecurities.length,
  };

  return {
    summary,
    topRevenueSecurities,
    assetClassBreakdown,
    regionalSplit,
    feeDistribution,
    shortInterestChanges,
    revenueTrend,
    borrowerConcentration,
    inventoryAvailability,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SecuritiesLendingRevenue] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate securities lending revenue data' });
  }
});

export default router;
