import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// --- Aircraft Lease Rate Data ---
const AIRCRAFT_TYPES = [
  { type: 'A320neo', category: 'narrow-body' as const, baseLeaseRate: 380, baseLRF: 0.82, baseMarketValue: 57, baseHalfLife: 42, baseResidual12yr: 0.38, inService: 3850, orderBacklog: 4620 },
  { type: 'A321neo', category: 'narrow-body' as const, baseLeaseRate: 440, baseLRF: 0.80, baseMarketValue: 65, baseHalfLife: 48, baseResidual12yr: 0.36, inService: 2180, orderBacklog: 3940 },
  { type: 'B737-8', category: 'narrow-body' as const, baseLeaseRate: 360, baseLRF: 0.81, baseMarketValue: 52, baseHalfLife: 39, baseResidual12yr: 0.37, inService: 2960, orderBacklog: 3280 },
  { type: 'B737-9', category: 'narrow-body' as const, baseLeaseRate: 395, baseLRF: 0.79, baseMarketValue: 58, baseHalfLife: 43, baseResidual12yr: 0.35, inService: 1120, orderBacklog: 1850 },
  { type: 'A330-900', category: 'wide-body' as const, baseLeaseRate: 720, baseLRF: 0.76, baseMarketValue: 115, baseHalfLife: 82, baseResidual12yr: 0.30, inService: 420, orderBacklog: 310 },
  { type: 'B787-9', category: 'wide-body' as const, baseLeaseRate: 850, baseLRF: 0.74, baseMarketValue: 150, baseHalfLife: 108, baseResidual12yr: 0.32, inService: 1050, orderBacklog: 680 },
  { type: 'B787-10', category: 'wide-body' as const, baseLeaseRate: 920, baseLRF: 0.73, baseMarketValue: 165, baseHalfLife: 118, baseResidual12yr: 0.30, inService: 380, orderBacklog: 420 },
  { type: 'A350-900', category: 'wide-body' as const, baseLeaseRate: 880, baseLRF: 0.75, baseMarketValue: 155, baseHalfLife: 112, baseResidual12yr: 0.33, inService: 620, orderBacklog: 540 },
  { type: 'B777-300ER', category: 'wide-body' as const, baseLeaseRate: 1050, baseLRF: 0.68, baseMarketValue: 145, baseHalfLife: 95, baseResidual12yr: 0.22, inService: 840, orderBacklog: 0 },
  { type: 'A220-300', category: 'narrow-body' as const, baseLeaseRate: 290, baseLRF: 0.84, baseMarketValue: 42, baseHalfLife: 32, baseResidual12yr: 0.40, inService: 380, orderBacklog: 620 },
  { type: 'E195-E2', category: 'narrow-body' as const, baseLeaseRate: 230, baseLRF: 0.86, baseMarketValue: 33, baseHalfLife: 24, baseResidual12yr: 0.35, inService: 210, orderBacklog: 280 },
  { type: 'B777-9', category: 'wide-body' as const, baseLeaseRate: 1180, baseLRF: 0.72, baseMarketValue: 195, baseHalfLife: 142, baseResidual12yr: 0.34, inService: 0, orderBacklog: 460 },
  { type: 'A321XLR', category: 'narrow-body' as const, baseLeaseRate: 470, baseLRF: 0.81, baseMarketValue: 70, baseHalfLife: 52, baseResidual12yr: 0.37, inService: 85, orderBacklog: 550 },
  { type: 'B737-800', category: 'narrow-body' as const, baseLeaseRate: 270, baseLRF: 0.72, baseMarketValue: 32, baseHalfLife: 22, baseResidual12yr: 0.18, inService: 4580, orderBacklog: 0 },
  { type: 'A330-200', category: 'wide-body' as const, baseLeaseRate: 480, baseLRF: 0.62, baseMarketValue: 55, baseHalfLife: 35, baseResidual12yr: 0.14, inService: 580, orderBacklog: 0 },
];

// --- EETC/ABS Deal Data ---
const EETC_DEALS = [
  { issuer: 'Delta Air Lines', series: '2025-1', trancheBase: 'A', baseSize: 680, baseCoupon: 4.75, baseRating: 'AA', baseLTV: 0.52, collateral: '6x A321neo, 4x B737-9', pricingDate: '2025-11-15' },
  { issuer: 'United Airlines', series: '2025-2', trancheBase: 'A', baseSize: 820, baseCoupon: 4.90, baseRating: 'AA-', baseLTV: 0.54, collateral: '8x B787-10, 2x B777-300ER', pricingDate: '2025-12-03' },
  { issuer: 'American Airlines', series: '2026-1', trancheBase: 'B', baseSize: 420, baseCoupon: 5.65, baseRating: 'A', baseLTV: 0.68, collateral: '12x B737-8', pricingDate: '2026-01-22' },
  { issuer: 'JetBlue Airways', series: '2025-1', trancheBase: 'A', baseSize: 350, baseCoupon: 5.15, baseRating: 'A+', baseLTV: 0.58, collateral: '5x A321neo, 3x A220-300', pricingDate: '2025-10-08' },
  { issuer: 'Alaska Airlines', series: '2026-1', trancheBase: 'A', baseSize: 480, baseCoupon: 4.85, baseRating: 'AA-', baseLTV: 0.51, collateral: '7x B737-9, 3x E195-E2', pricingDate: '2026-02-14' },
  { issuer: 'Spirit Airlines', series: '2025-1', trancheBase: 'C', baseSize: 180, baseCoupon: 7.25, baseRating: 'BBB-', baseLTV: 0.82, collateral: '10x A320neo', pricingDate: '2025-09-19' },
  { issuer: 'Southwest Airlines', series: '2026-1', trancheBase: 'A', baseSize: 560, baseCoupon: 4.60, baseRating: 'AA', baseLTV: 0.48, collateral: '9x B737-8', pricingDate: '2026-03-05' },
  { issuer: 'Air France-KLM', series: '2025-1', trancheBase: 'B', baseSize: 520, baseCoupon: 5.40, baseRating: 'A-', baseLTV: 0.65, collateral: '4x A350-900, 2x B787-9', pricingDate: '2025-11-28' },
];

// --- Airline Credit Data ---
const AIRLINES = [
  { name: 'Delta Air Lines', ticker: 'DAL', baseRating: 'BBB', baseCDS: 85, baseLeverage: 2.8, baseFleetAge: 16.2, baseLiquidity: 1.45, baseNetDebt: 18.2, baseMarketCap: 32.5 },
  { name: 'United Airlines', ticker: 'UAL', baseRating: 'BB+', baseCDS: 120, baseLeverage: 3.4, baseFleetAge: 15.8, baseLiquidity: 1.32, baseNetDebt: 25.8, baseMarketCap: 24.8 },
  { name: 'American Airlines', ticker: 'AAL', baseRating: 'BB-', baseCDS: 195, baseLeverage: 4.5, baseFleetAge: 13.1, baseLiquidity: 1.08, baseNetDebt: 32.4, baseMarketCap: 11.2 },
  { name: 'Southwest Airlines', ticker: 'LUV', baseRating: 'BBB', baseCDS: 78, baseLeverage: 2.2, baseFleetAge: 12.8, baseLiquidity: 1.62, baseNetDebt: 8.5, baseMarketCap: 18.4 },
  { name: 'Ryanair', ticker: 'RYAAY', baseRating: 'BBB+', baseCDS: 52, baseLeverage: 1.6, baseFleetAge: 6.8, baseLiquidity: 1.85, baseNetDebt: 4.2, baseMarketCap: 28.5 },
  { name: 'Lufthansa Group', ticker: 'LHA.DE', baseRating: 'BBB-', baseCDS: 105, baseLeverage: 3.1, baseFleetAge: 14.5, baseLiquidity: 1.25, baseNetDebt: 12.8, baseMarketCap: 9.8 },
  { name: 'Emirates', ticker: 'Private', baseRating: 'A-', baseCDS: 62, baseLeverage: 1.8, baseFleetAge: 8.2, baseLiquidity: 1.75, baseNetDebt: 6.5, baseMarketCap: 0 },
  { name: 'Singapore Airlines', ticker: 'SINGY', baseRating: 'A', baseCDS: 45, baseLeverage: 1.4, baseFleetAge: 7.5, baseLiquidity: 1.92, baseNetDebt: 3.8, baseMarketCap: 16.2 },
  { name: 'Cathay Pacific', ticker: '0293.HK', baseRating: 'BBB', baseCDS: 88, baseLeverage: 2.9, baseFleetAge: 10.2, baseLiquidity: 1.38, baseNetDebt: 9.2, baseMarketCap: 7.5 },
  { name: 'ANA Holdings', ticker: '9202.T', baseRating: 'A-', baseCDS: 55, baseLeverage: 2.0, baseFleetAge: 9.8, baseLiquidity: 1.58, baseNetDebt: 10.5, baseMarketCap: 12.8 },
  { name: 'Turkish Airlines', ticker: 'THYAO.IS', baseRating: 'BB', baseCDS: 165, baseLeverage: 3.8, baseFleetAge: 8.9, baseLiquidity: 1.15, baseNetDebt: 14.2, baseMarketCap: 8.2 },
  { name: 'IndiGo', ticker: 'INDIGO.NS', baseRating: 'BBB-', baseCDS: 95, baseLeverage: 2.5, baseFleetAge: 5.2, baseLiquidity: 1.42, baseNetDebt: 5.8, baseMarketCap: 14.5 },
];

// --- Lessor Rankings ---
const LESSORS = [
  { name: 'AerCap', baseFleetCount: 3580, basePortfolioValue: 78, baseAvgAge: 6.8, baseOrderBook: 480 },
  { name: 'SMBC Aviation Capital', baseFleetCount: 1420, basePortfolioValue: 32, baseAvgAge: 5.2, baseOrderBook: 310 },
  { name: 'Air Lease Corp', baseFleetCount: 980, basePortfolioValue: 28, baseAvgAge: 4.5, baseOrderBook: 370 },
  { name: 'Avolon', baseFleetCount: 1150, basePortfolioValue: 30, baseAvgAge: 5.8, baseOrderBook: 260 },
  { name: 'BBAM', baseFleetCount: 620, basePortfolioValue: 14, baseAvgAge: 8.2, baseOrderBook: 85 },
  { name: 'BOC Aviation', baseFleetCount: 680, basePortfolioValue: 22, baseAvgAge: 4.1, baseOrderBook: 290 },
  { name: 'ICBC Leasing', baseFleetCount: 750, basePortfolioValue: 18, baseAvgAge: 6.5, baseOrderBook: 180 },
  { name: 'DAE Capital', baseFleetCount: 480, basePortfolioValue: 12, baseAvgAge: 7.4, baseOrderBook: 120 },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('aircraft-finance-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // --- Market Overview ---
  const totalFleetValueB = Math.round(jitter(328, 0.05) * 10) / 10;
  const activeEETCIssuanceYTD = Math.round(jitter(18.5, 0.12) * 10) / 10;
  const activeABSIssuanceYTD = Math.round(jitter(12.2, 0.12) * 10) / 10;
  const avgLeaseRateFactor = Math.round(jitter(0.78, 0.04) * 10000) / 10000;
  const narrowBodyUtilization = Math.round(jitter(0.945, 0.02) * 10000) / 100;
  const wideBodyUtilization = Math.round(jitter(0.912, 0.025) * 10000) / 100;
  const repoRateBenchmark = Math.round(jitter(5.35, 0.06) * 100) / 100;

  const marketOverview = {
    totalFleetValueB,
    totalFleetValueUnit: '$B',
    activeEETCIssuanceYTD,
    activeABSIssuanceYTD,
    issuanceUnit: '$B',
    avgLeaseRateFactor,
    narrowBodyUtilization,
    wideBodyUtilization,
    utilizationUnit: '%',
    repoRateBenchmark,
    repoRateUnit: '%',
  };

  // --- Lease Rates ---
  const ageVariants = ['new', '5yr', '10yr'] as const;
  const leaseRates = AIRCRAFT_TYPES.flatMap(a => {
    return ageVariants.map(age => {
      const ageFactor = age === 'new' ? 1.0 : age === '5yr' ? 0.78 : 0.58;
      const depreciationFactor = age === 'new' ? 1.0 : age === '5yr' ? 0.72 : 0.48;

      const monthlyLeaseRate = Math.round(jitter(a.baseLeaseRate * ageFactor, 0.06));
      const leaseRateFactor = Math.round(jitter(a.baseLRF * (age === 'new' ? 1.0 : age === '5yr' ? 1.04 : 1.12), 0.03) * 10000) / 10000;
      const currentMarketValue = Math.round(jitter(a.baseMarketValue * depreciationFactor, 0.05) * 10) / 10;
      const halfLifeValue = Math.round(jitter(a.baseHalfLife * depreciationFactor, 0.05) * 10) / 10;
      const residualValue12yr = Math.round(jitter(a.baseResidual12yr * (age === 'new' ? 1.0 : age === '5yr' ? 0.65 : 0.35), 0.06) * 10000) / 10000;
      const change1m = Math.round((rng() - 0.48) * a.baseLeaseRate * ageFactor * 0.03);
      const change1mPct = Math.round(change1m / monthlyLeaseRate * 10000) / 100;
      const change1y = Math.round((rng() - 0.45) * a.baseLeaseRate * ageFactor * 0.08);
      const change1yPct = Math.round(change1y / monthlyLeaseRate * 10000) / 100;

      return {
        aircraftType: a.type,
        category: a.category,
        age,
        monthlyLeaseRate,
        leaseRateUnit: '$K/mo',
        leaseRateFactor,
        currentMarketValue,
        marketValueUnit: '$M',
        halfLifeValue,
        halfLifeUnit: '$M',
        residualValue12yr,
        change1m,
        change1mPct,
        change1y,
        change1yPct,
        inService: age === 'new' ? Math.round(jitter(a.inService * 0.3, 0.05)) : age === '5yr' ? Math.round(jitter(a.inService * 0.4, 0.05)) : Math.round(jitter(a.inService * 0.3, 0.05)),
        orderBacklog: age === 'new' ? Math.round(jitter(a.orderBacklog, 0.04)) : 0,
      };
    });
  });

  // --- EETC/ABS Deals ---
  const eetcDeals = EETC_DEALS.map(d => {
    const size = Math.round(jitter(d.baseSize, 0.04));
    const coupon = Math.round(jitter(d.baseCoupon, 0.03) * 100) / 100;
    const ltv = Math.round(jitter(d.baseLTV, 0.04) * 10000) / 10000;
    const spread = Math.round(jitter(coupon * 100 - 380, 0.08));
    const tenor = d.trancheBase === 'A' ? 12 : d.trancheBase === 'B' ? 10 : 7;
    const weightedAvgLife = Math.round(jitter(tenor * 0.6, 0.08) * 10) / 10;

    return {
      issuer: d.issuer,
      series: d.series,
      tranche: d.trancheBase,
      size,
      sizeUnit: '$M',
      coupon,
      couponUnit: '%',
      rating: d.baseRating,
      ltv,
      spread,
      spreadUnit: 'bps',
      tenor,
      weightedAvgLife,
      collateral: d.collateral,
      pricingDate: d.pricingDate,
    };
  });

  // --- Airline Credit Monitor ---
  const airlineCreditMonitor = AIRLINES.map(a => {
    const cdsSpread = Math.round(jitter(a.baseCDS, 0.12));
    const cdsChange1d = Math.round((rng() - 0.5) * a.baseCDS * 0.04);
    const cdsChange1w = Math.round((rng() - 0.48) * a.baseCDS * 0.08);
    const leverageRatio = Math.round(jitter(a.baseLeverage, 0.06) * 100) / 100;
    const fleetAge = Math.round(jitter(a.baseFleetAge, 0.03) * 10) / 10;
    const liquidityRatio = Math.round(jitter(a.baseLiquidity, 0.05) * 100) / 100;
    const netDebt = Math.round(jitter(a.baseNetDebt, 0.06) * 10) / 10;
    const marketCap = a.baseMarketCap > 0 ? Math.round(jitter(a.baseMarketCap, 0.08) * 10) / 10 : null;
    const interestCoverage = Math.round(jitter(6.5 / a.baseLeverage * 2, 0.08) * 100) / 100;
    const outlook = rng() > 0.75 ? 'Positive' : rng() > 0.3 ? 'Stable' : 'Negative';

    return {
      airline: a.name,
      ticker: a.ticker,
      creditRating: a.baseRating,
      outlook,
      cdsSpread,
      cdsChange1d,
      cdsChange1w,
      cdsUnit: 'bps',
      leverageRatio,
      fleetAge,
      liquidityRatio,
      netDebt,
      netDebtUnit: '$B',
      marketCap,
      marketCapUnit: '$B',
      interestCoverage,
    };
  });

  // --- Lessor Rankings ---
  const lessorRankings = LESSORS.map(l => {
    const fleetCount = Math.round(jitter(l.baseFleetCount, 0.03));
    const portfolioValue = Math.round(jitter(l.basePortfolioValue, 0.05) * 10) / 10;
    const avgFleetAge = Math.round(jitter(l.baseAvgAge, 0.04) * 10) / 10;
    const orderBookSize = Math.round(jitter(l.baseOrderBook, 0.06));
    const narrowBodyPct = Math.round(jitter(68, 0.08) * 10) / 10;
    const wideBodyPct = Math.round((100 - narrowBodyPct) * 10) / 10;
    const avgRemainingLeaseTerm = Math.round(jitter(7.2, 0.1) * 10) / 10;
    const occupancyRate = Math.round(jitter(98.5, 0.01) * 100) / 100;
    const yieldOnAssets = Math.round(jitter(11.2, 0.08) * 100) / 100;

    return {
      lessor: l.name,
      fleetCount,
      portfolioValue,
      portfolioValueUnit: '$B',
      avgFleetAge,
      orderBookSize,
      narrowBodyPct,
      wideBodyPct,
      avgRemainingLeaseTerm,
      leaseTermUnit: 'years',
      occupancyRate,
      yieldOnAssets,
    };
  });

  const totalLessorFleet = lessorRankings.reduce((sum, l) => sum + l.fleetCount, 0);
  const totalLessorPortfolioValue = Math.round(lessorRankings.reduce((sum, l) => sum + l.portfolioValue, 0) * 10) / 10;

  // --- Market Trends ---
  const deliveryBacklogMonths = Math.round(jitter(98, 0.08));
  const usedAircraftTransactions = Math.round(jitter(285, 0.12));
  const p2fConversionPipeline = Math.round(jitter(142, 0.1));
  const p2fDeliveries = Math.round(jitter(68, 0.12));
  const storedParkedPct = Math.round(jitter(4.8, 0.12) * 100) / 100;
  const storedParkedCount = Math.round(jitter(1380, 0.08));
  const newDeliveriesYTD = Math.round(jitter(320, 0.1));
  const retirements = Math.round(jitter(85, 0.15));
  const avgTransactionPremium = Math.round(jitter(3.2, 0.15) * 100) / 100;
  const narrowBodyDeliveryWait = Math.round(jitter(42, 0.08));
  const wideBodyDeliveryWait = Math.round(jitter(36, 0.1));

  const marketTrends = {
    deliveryBacklogMonths,
    usedAircraftTransactions,
    transactionUnit: 'trailing 12mo',
    p2fConversionPipeline,
    p2fDeliveries,
    p2fUnit: 'YTD',
    storedParkedPct,
    storedParkedCount,
    newDeliveriesYTD,
    retirements,
    avgTransactionPremium,
    transactionPremiumUnit: '% over book',
    narrowBodyDeliveryWait,
    wideBodyDeliveryWait,
    deliveryWaitUnit: 'months',
  };

  return {
    marketOverview,
    leaseRates,
    eetcDeals,
    airlineCreditMonitor,
    lessorRankings: {
      lessors: lessorRankings,
      totalLessorFleet,
      totalLessorPortfolioValue,
      totalPortfolioValueUnit: '$B',
    },
    marketTrends,
    timestamp: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[AircraftFinance] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate aircraft finance data' });
  }
});

export default router;
