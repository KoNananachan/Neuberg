import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

const REIT_TEMPLATES = [
  { ticker: 'PLD', name: 'Prologis', sector: 'Industrial', basePrice: 128, baseDivYield: 2.65, baseFFO: 5.40, baseNAV: 135, baseMarketCap: 118.5 },
  { ticker: 'AMT', name: 'American Tower', sector: 'Tower', basePrice: 210, baseDivYield: 3.10, baseFFO: 10.20, baseNAV: 225, baseMarketCap: 97.2 },
  { ticker: 'EQIX', name: 'Equinix', sector: 'Data Center', basePrice: 845, baseDivYield: 1.95, baseFFO: 34.00, baseNAV: 870, baseMarketCap: 78.6 },
  { ticker: 'SPG', name: 'Simon Property', sector: 'Retail', basePrice: 152, baseDivYield: 5.20, baseFFO: 12.00, baseNAV: 148, baseMarketCap: 49.8 },
  { ticker: 'PSA', name: 'Public Storage', sector: 'Storage', basePrice: 305, baseDivYield: 3.90, baseFFO: 16.50, baseNAV: 315, baseMarketCap: 53.4 },
  { ticker: 'O', name: 'Realty Income', sector: 'Net Lease', basePrice: 58, baseDivYield: 5.25, baseFFO: 4.00, baseNAV: 62, baseMarketCap: 50.1 },
  { ticker: 'CCI', name: 'Crown Castle', sector: 'Tower', basePrice: 108, baseDivYield: 5.80, baseFFO: 7.20, baseNAV: 115, baseMarketCap: 46.8 },
  { ticker: 'WELL', name: 'Welltower', sector: 'Healthcare', basePrice: 98, baseDivYield: 2.50, baseFFO: 3.80, baseNAV: 95, baseMarketCap: 54.3 },
  { ticker: 'DLR', name: 'Digital Realty', sector: 'Data Center', basePrice: 148, baseDivYield: 3.30, baseFFO: 6.80, baseNAV: 150, baseMarketCap: 44.2 },
  { ticker: 'AVB', name: 'AvalonBay', sector: 'Residential', basePrice: 215, baseDivYield: 3.15, baseFFO: 10.50, baseNAV: 220, baseMarketCap: 30.5 },
];

const SECTOR_TYPES = [
  { type: 'Office', baseCapRate: 7.2, baseOccupancy: 82.5, baseRentGrowth: -1.8, baseNewSupply: 42.0, baseAbsorption: 28.0, basePricePerSF: 385, baseSpread: 310 },
  { type: 'Industrial', baseCapRate: 5.4, baseOccupancy: 95.8, baseRentGrowth: 6.2, baseNewSupply: 380.0, baseAbsorption: 350.0, basePricePerSF: 115, baseSpread: 185 },
  { type: 'Retail', baseCapRate: 6.8, baseOccupancy: 93.2, baseRentGrowth: 2.4, baseNewSupply: 18.0, baseAbsorption: 22.0, basePricePerSF: 260, baseSpread: 275 },
  { type: 'Residential', baseCapRate: 5.1, baseOccupancy: 94.5, baseRentGrowth: 3.8, baseNewSupply: 295.0, baseAbsorption: 280.0, basePricePerSF: 295, baseSpread: 195 },
  { type: 'Data Center', baseCapRate: 5.6, baseOccupancy: 88.0, baseRentGrowth: 8.5, baseNewSupply: 520.0, baseAbsorption: 490.0, basePricePerSF: 850, baseSpread: 165 },
  { type: 'Healthcare', baseCapRate: 6.5, baseOccupancy: 86.0, baseRentGrowth: 2.8, baseNewSupply: 12.0, baseAbsorption: 14.0, basePricePerSF: 320, baseSpread: 240 },
  { type: 'Storage', baseCapRate: 5.8, baseOccupancy: 91.5, baseRentGrowth: 1.5, baseNewSupply: 35.0, baseAbsorption: 30.0, basePricePerSF: 145, baseSpread: 210 },
  { type: 'Hotel', baseCapRate: 8.0, baseOccupancy: 65.0, baseRentGrowth: 4.2, baseNewSupply: 55.0, baseAbsorption: 48.0, basePricePerSF: 195, baseSpread: 350 },
];

const METRO_TEMPLATES = [
  { metro: 'New York', baseOfficeVacancy: 18.5, baseIndustrialVacancy: 4.2, baseMultifamilyRent: 3850, baseRentGrowth: 2.8, baseCapRate: 5.5, baseTransVolume: 28.5 },
  { metro: 'Los Angeles', baseOfficeVacancy: 22.0, baseIndustrialVacancy: 3.8, baseMultifamilyRent: 2950, baseRentGrowth: 3.2, baseCapRate: 5.2, baseTransVolume: 18.2 },
  { metro: 'Chicago', baseOfficeVacancy: 24.5, baseIndustrialVacancy: 5.5, baseMultifamilyRent: 2100, baseRentGrowth: 2.0, baseCapRate: 6.8, baseTransVolume: 12.5 },
  { metro: 'Houston', baseOfficeVacancy: 26.0, baseIndustrialVacancy: 6.2, baseMultifamilyRent: 1650, baseRentGrowth: 3.5, baseCapRate: 7.0, baseTransVolume: 9.8 },
  { metro: 'Phoenix', baseOfficeVacancy: 20.5, baseIndustrialVacancy: 7.8, baseMultifamilyRent: 1580, baseRentGrowth: 5.2, baseCapRate: 6.2, baseTransVolume: 7.5 },
  { metro: 'Dallas', baseOfficeVacancy: 22.8, baseIndustrialVacancy: 8.0, baseMultifamilyRent: 1720, baseRentGrowth: 4.5, baseCapRate: 6.0, baseTransVolume: 14.2 },
  { metro: 'Atlanta', baseOfficeVacancy: 21.2, baseIndustrialVacancy: 5.8, baseMultifamilyRent: 1780, baseRentGrowth: 4.0, baseCapRate: 6.5, baseTransVolume: 10.8 },
  { metro: 'Miami', baseOfficeVacancy: 16.5, baseIndustrialVacancy: 4.0, baseMultifamilyRent: 2650, baseRentGrowth: 6.8, baseCapRate: 5.8, baseTransVolume: 11.5 },
];

function generate() {
  const seed = hashSeed('real-estate-analytics-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // REIT Performance
  const reitPerformance = REIT_TEMPLATES.map(r => {
    const price = Math.round(jitter(r.basePrice, 0.05) * 100) / 100;
    const dividendYield = Math.round(jitter(r.baseDivYield, 0.08) * 100) / 100;
    const ffoPerShare = Math.round(jitter(r.baseFFO, 0.06) * 100) / 100;
    const priceToFFO = Math.round((price / ffoPerShare) * 100) / 100;
    const navPerShare = Math.round(jitter(r.baseNAV, 0.04) * 100) / 100;
    const premiumToNav = Math.round((price / navPerShare - 1) * 100 * 10) / 10;
    const ytdReturn = Math.round((rng() * 28 - 6) * 100) / 100;
    const marketCapB = Math.round(jitter(r.baseMarketCap, 0.05) * 10) / 10;

    return {
      ticker: r.ticker,
      name: r.name,
      sector: r.sector,
      price,
      dividendYield,
      ffoPerShare,
      priceToFFO,
      navPerShare,
      premiumToNav,
      ytdReturn,
      marketCapB,
    };
  });

  // Sector Metrics
  const sectorMetrics = SECTOR_TYPES.map(s => {
    const avgCapRate = Math.round(jitter(s.baseCapRate, 0.06) * 100) / 100;
    const avgOccupancy = Math.round(jitter(s.baseOccupancy, 0.02) * 10) / 10;
    const rentGrowthYoY = Math.round(jitter(s.baseRentGrowth, 0.15) * 100) / 100;
    const newSupply = Math.round(jitter(s.baseNewSupply, 0.10) * 10) / 10;
    const absorption = Math.round(jitter(s.baseAbsorption, 0.12) * 10) / 10;
    const avgPricePerSF = Math.round(jitter(s.basePricePerSF, 0.05));
    const spreadToTreasuries = Math.round(jitter(s.baseSpread, 0.08));

    return {
      type: s.type,
      avgCapRate,
      avgOccupancy,
      rentGrowthYoY,
      newSupply,
      absorption,
      avgPricePerSF,
      spreadToTreasuries,
    };
  });

  // Market Indicators
  const marketIndicators = {
    caseShiller: {
      indexLevel: Math.round(jitter(322.5, 0.03) * 10) / 10,
      yoyChange: Math.round(jitter(4.8, 0.20) * 100) / 100,
    },
    commercialPropertyPriceIndex: Math.round(jitter(215.0, 0.04) * 10) / 10,
    mortgageRate30Y: Math.round(jitter(6.85, 0.04) * 100) / 100,
    housingStartsK: Math.round(jitter(1420, 0.06)),
    buildingPermitsK: Math.round(jitter(1485, 0.05)),
    cmbsSpread: Math.round(jitter(165, 0.10)),
    delinquencyRate: Math.round(jitter(4.2, 0.08) * 100) / 100,
  };

  // Top Markets
  const topMarkets = METRO_TEMPLATES.map(m => {
    const officeVacancyRate = Math.round(jitter(m.baseOfficeVacancy, 0.06) * 10) / 10;
    const industrialVacancy = Math.round(jitter(m.baseIndustrialVacancy, 0.10) * 10) / 10;
    const multifamilyRent = Math.round(jitter(m.baseMultifamilyRent, 0.04));
    const rentGrowth = Math.round(jitter(m.baseRentGrowth, 0.15) * 10) / 10;
    const capRate = Math.round(jitter(m.baseCapRate, 0.06) * 100) / 100;
    const transactionVolume = Math.round(jitter(m.baseTransVolume, 0.12) * 10) / 10;

    return {
      metro: m.metro,
      officeVacancyRate,
      industrialVacancy,
      multifamilyRent,
      rentGrowth,
      capRate,
      transactionVolume,
    };
  });

  // REIT Flows
  const reitFlows = {
    weeklyFundFlows: Math.round((rng() - 0.45) * 800),
    monthlyFundFlows: Math.round((rng() - 0.42) * 3500),
    etfFlows: {
      weekly: Math.round((rng() - 0.45) * 600),
      monthly: Math.round((rng() - 0.42) * 2200),
    },
    newOfferings: {
      ipoCount: Math.floor(rng() * 4),
      ipoVolume: Math.round(jitter(450, 0.30)),
      secondaryCount: Math.floor(2 + rng() * 6),
      secondaryVolume: Math.round(jitter(1800, 0.25)),
    },
  };

  return {
    reitPerformance,
    sectorMetrics,
    marketIndicators,
    topMarkets,
    reitFlows,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[RealEstateAnalytics] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate real estate analytics data' });
  }
});

export default router;
