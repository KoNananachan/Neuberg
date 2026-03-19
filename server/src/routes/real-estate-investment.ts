import { Router } from 'express';
const router = Router();
function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; return h >>> 0; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// --- Interfaces ---

interface MarketOverview {
  globalTransactionVolumeBillions: number;
  yearOverYearChangePct: number;
  avgCapRate: number;
  capRateSpreadOverTreasury: number;
  commercialVacancyRatePct: number;
  residentialPriceIndexYoY: number;
}

interface REITPerformance {
  name: string;
  ticker: string;
  sector: string;
  marketCapBillions: number;
  dividendYieldPct: number;
  priceChangePct: number;
  ffoPerShare: number;
  noiGrowthPct: number;
  occupancyPct: number;
  leverageRatio: number;
}

interface CapRateBySectorMarket {
  sector: string;
  usRate: number;
  euRate: number;
  apacRate: number;
  trendDirection: 'compressing' | 'stable' | 'expanding';
}

interface TransactionDeal {
  propertyName: string;
  location: string;
  buyer: string;
  seller: string;
  priceBillions: number;
  pricePerSqFt: number;
  capRate: number;
  sector: string;
  dealType: 'single-asset' | 'portfolio' | 'entity-level';
}

interface RegionalVacancyRentTrend {
  market: string;
  officeVacancyPct: number;
  industrialVacancyPct: number;
  retailVacancyPct: number;
  officeRentPSF: number;
  rentChangePct: number;
}

interface DebtMarket {
  cmbsSpreadsBps: number;
  avgLTV: number;
  avgDSCR: number;
  lendingVolumeBillions: number;
  delinquencyRatePct: number;
  maturingLoansBillions: number;
}

interface RealEstateInvestmentData {
  marketOverview: MarketOverview;
  reitPerformance: REITPerformance[];
  capRatesBySectorMarket: CapRateBySectorMarket[];
  transactionActivity: TransactionDeal[];
  regionalVacancyRentTrends: RegionalVacancyRentTrend[];
  debtMarket: DebtMarket;
  generatedAt: string;
}

// --- Data Generation ---

function generateData(): RealEstateInvestmentData {
  const rng = seededRandom('real-estate-investment');

  // 1. Market Overview
  const marketOverview: MarketOverview = {
    globalTransactionVolumeBillions: Math.round((700 + rng() * 300) * 10) / 10,
    yearOverYearChangePct: Math.round((-15 + rng() * 30) * 10) / 10,
    avgCapRate: Math.round((4.5 + rng() * 2.5) * 100) / 100,
    capRateSpreadOverTreasury: Math.round(100 + rng() * 200),
    commercialVacancyRatePct: Math.round((10 + rng() * 10) * 10) / 10,
    residentialPriceIndexYoY: Math.round((-5 + rng() * 15) * 10) / 10,
  };

  // 2. REIT Performance
  const reitDefinitions: { name: string; ticker: string; sector: string; baseMarketCap: number; baseDivYield: number; baseFfo: number }[] = [
    { name: 'Prologis', ticker: 'PLD', sector: 'Industrial', baseMarketCap: 110, baseDivYield: 2.8, baseFfo: 5.5 },
    { name: 'Equinix', ticker: 'EQIX', sector: 'Data Center', baseMarketCap: 75, baseDivYield: 1.9, baseFfo: 32.0 },
    { name: 'American Tower', ticker: 'AMT', sector: 'Specialty', baseMarketCap: 95, baseDivYield: 3.1, baseFfo: 10.5 },
    { name: 'Public Storage', ticker: 'PSA', sector: 'Self-Storage', baseMarketCap: 52, baseDivYield: 4.2, baseFfo: 16.0 },
    { name: 'Simon Property', ticker: 'SPG', sector: 'Retail', baseMarketCap: 48, baseDivYield: 5.5, baseFfo: 12.0 },
    { name: 'Realty Income', ticker: 'O', sector: 'Retail', baseMarketCap: 42, baseDivYield: 5.1, baseFfo: 4.0 },
    { name: 'Welltower', ticker: 'WELL', sector: 'Healthcare', baseMarketCap: 40, baseDivYield: 3.0, baseFfo: 3.8 },
    { name: 'AvalonBay', ticker: 'AVB', sector: 'Residential', baseMarketCap: 28, baseDivYield: 3.5, baseFfo: 10.5 },
    { name: 'Digital Realty', ticker: 'DLR', sector: 'Data Center', baseMarketCap: 38, baseDivYield: 3.4, baseFfo: 6.8 },
    { name: 'VICI Properties', ticker: 'VICI', sector: 'Specialty', baseMarketCap: 33, baseDivYield: 5.3, baseFfo: 2.2 },
    { name: 'Extra Space', ticker: 'EXR', sector: 'Self-Storage', baseMarketCap: 32, baseDivYield: 4.4, baseFfo: 8.5 },
    { name: 'Ventas', ticker: 'VTR', sector: 'Healthcare', baseMarketCap: 22, baseDivYield: 3.8, baseFfo: 3.2 },
  ];

  const reitPerformance: REITPerformance[] = reitDefinitions.map((r) => ({
    name: r.name,
    ticker: r.ticker,
    sector: r.sector,
    marketCapBillions: Math.round((r.baseMarketCap * (0.85 + rng() * 0.3)) * 10) / 10,
    dividendYieldPct: Math.round((r.baseDivYield + (rng() - 0.5) * 1.5) * 100) / 100,
    priceChangePct: Math.round((-20 + rng() * 40) * 100) / 100,
    ffoPerShare: Math.round((r.baseFfo * (0.9 + rng() * 0.2)) * 100) / 100,
    noiGrowthPct: Math.round((-5 + rng() * 15) * 10) / 10,
    occupancyPct: Math.round((88 + rng() * 10) * 10) / 10,
    leverageRatio: Math.round((0.25 + rng() * 0.35) * 100) / 100,
  }));

  // 3. Cap Rates by Sector & Market
  const capRateSectors = ['Office', 'Industrial', 'Multifamily', 'Retail', 'Hotel', 'Data Center', 'Self-Storage', 'Medical Office'];
  const trendOptions: ('compressing' | 'stable' | 'expanding')[] = ['compressing', 'stable', 'expanding'];

  const capRatesBySectorMarket: CapRateBySectorMarket[] = capRateSectors.map((sector) => {
    const baseRate = 4.0 + rng() * 4.0;
    return {
      sector,
      usRate: Math.round(baseRate * 100) / 100,
      euRate: Math.round((baseRate + (rng() - 0.5) * 1.5) * 100) / 100,
      apacRate: Math.round((baseRate + (rng() - 0.5) * 2.0) * 100) / 100,
      trendDirection: trendOptions[Math.floor(rng() * 3)],
    };
  });

  // 4. Transaction Activity
  const dealDefinitions: { propertyName: string; location: string; buyer: string; seller: string; sector: string }[] = [
    { propertyName: 'One Manhattan West', location: 'New York, NY', buyer: 'Brookfield Asset Management', seller: 'SL Green Realty', sector: 'Office' },
    { propertyName: 'Mega Logistics Park', location: 'Dallas, TX', buyer: 'GLP Capital Partners', seller: 'Prologis', sector: 'Industrial' },
    { propertyName: 'Pacific Place Portfolio', location: 'Hong Kong', buyer: 'Swire Properties', seller: 'Blackstone RE', sector: 'Retail' },
    { propertyName: 'London Wall Place', location: 'London, UK', buyer: 'Allianz Real Estate', seller: 'Great Portland Estates', sector: 'Office' },
    { propertyName: 'Sunbelt Apartment Portfolio', location: 'Southeast US', buyer: 'Greystar', seller: 'Starwood Capital', sector: 'Multifamily' },
    { propertyName: 'Canary Wharf Tower', location: 'London, UK', buyer: 'Qatar Investment Authority', seller: 'Songbird Estates', sector: 'Office' },
    { propertyName: 'Tokyo Bay Logistics Hub', location: 'Tokyo, Japan', buyer: 'GIC Real Estate', seller: 'Mitsui Fudosan', sector: 'Industrial' },
    { propertyName: 'Westfield Century City', location: 'Los Angeles, CA', buyer: 'Unibail-Rodamco', seller: 'Macerich', sector: 'Retail' },
    { propertyName: 'Sydney Data Campus', location: 'Sydney, Australia', buyer: 'Macquarie Infrastructure', seller: 'AirTrunk', sector: 'Data Center' },
    { propertyName: 'Berlin Residential Portfolio', location: 'Berlin, Germany', buyer: 'Vonovia', seller: 'Akelius', sector: 'Residential' },
  ];

  const dealTypes: ('single-asset' | 'portfolio' | 'entity-level')[] = ['single-asset', 'portfolio', 'entity-level'];

  const transactionActivity: TransactionDeal[] = dealDefinitions.map((d) => ({
    propertyName: d.propertyName,
    location: d.location,
    buyer: d.buyer,
    seller: d.seller,
    priceBillions: Math.round((0.5 + rng() * 4.5) * 100) / 100,
    pricePerSqFt: Math.round(300 + rng() * 1700),
    capRate: Math.round((3.5 + rng() * 4.5) * 100) / 100,
    sector: d.sector,
    dealType: dealTypes[Math.floor(rng() * 3)],
  }));

  // 5. Regional Vacancy & Rent Trends
  const marketsData: { market: string; baseOfficeRent: number }[] = [
    { market: 'NYC', baseOfficeRent: 85 },
    { market: 'London', baseOfficeRent: 72 },
    { market: 'Tokyo', baseOfficeRent: 55 },
    { market: 'Hong Kong', baseOfficeRent: 95 },
    { market: 'Singapore', baseOfficeRent: 60 },
    { market: 'Sydney', baseOfficeRent: 50 },
  ];

  const regionalVacancyRentTrends: RegionalVacancyRentTrend[] = marketsData.map((m) => ({
    market: m.market,
    officeVacancyPct: Math.round((8 + rng() * 18) * 10) / 10,
    industrialVacancyPct: Math.round((2 + rng() * 8) * 10) / 10,
    retailVacancyPct: Math.round((5 + rng() * 15) * 10) / 10,
    officeRentPSF: Math.round((m.baseOfficeRent * (0.8 + rng() * 0.4)) * 100) / 100,
    rentChangePct: Math.round((-10 + rng() * 20) * 10) / 10,
  }));

  // 6. Debt Market
  const debtMarket: DebtMarket = {
    cmbsSpreadsBps: Math.round(120 + rng() * 280),
    avgLTV: Math.round((55 + rng() * 15) * 10) / 10,
    avgDSCR: Math.round((1.2 + rng() * 0.6) * 100) / 100,
    lendingVolumeBillions: Math.round((300 + rng() * 400) * 10) / 10,
    delinquencyRatePct: Math.round((1.0 + rng() * 5.0) * 100) / 100,
    maturingLoansBillions: Math.round((150 + rng() * 350) * 10) / 10,
  };

  return {
    marketOverview,
    reitPerformance,
    capRatesBySectorMarket,
    transactionActivity,
    regionalVacancyRentTrends,
    debtMarket,
    generatedAt: new Date().toISOString(),
  };
}

// --- Cache ---

let cache: { data: RealEstateInvestmentData; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData(): RealEstateInvestmentData {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }
  try {
    const freshData = generateData();
    cache = { data: freshData, timestamp: now };
    return freshData;
  } catch {
    // Stale fallback: return expired cache if generation fails
    if (cache) {
      return cache.data;
    }
    throw new Error('No data available');
  }
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const data = getCachedData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate real estate investment data' });
  }
});

export default router;
