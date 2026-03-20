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

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CommodityConfig {
  name: string;
  unit: string;
  baseLow: number;
  baseHigh: number;
  slopeDir: number; // positive = contango tendency, negative = backwardation
  volatility: number;
}

const COMMODITIES: CommodityConfig[] = [
  { name: 'WTI Crude', unit: '$/bbl', baseLow: 70, baseHigh: 80, slopeDir: -0.35, volatility: 0.03 },
  { name: 'Brent Crude', unit: '$/bbl', baseLow: 73, baseHigh: 83, slopeDir: -0.30, volatility: 0.03 },
  { name: 'Natural Gas', unit: '$/MMBtu', baseLow: 2.5, baseHigh: 3.8, slopeDir: 0.12, volatility: 0.06 },
  { name: 'Gold', unit: '$/oz', baseLow: 2000, baseHigh: 2100, slopeDir: 0.8, volatility: 0.01 },
  { name: 'Silver', unit: '$/oz', baseLow: 23, baseHigh: 28, slopeDir: 0.06, volatility: 0.02 },
  { name: 'Copper', unit: '$/lb', baseLow: 3.8, baseHigh: 4.5, slopeDir: -0.015, volatility: 0.025 },
  { name: 'Corn', unit: '$/bu', baseLow: 4.2, baseHigh: 5.1, slopeDir: 0.04, volatility: 0.035 },
  { name: 'Soybeans', unit: '$/bu', baseLow: 11.5, baseHigh: 13.5, slopeDir: -0.06, volatility: 0.03 },
  { name: 'Wheat', unit: '$/bu', baseLow: 5.5, baseHigh: 7.0, slopeDir: 0.05, volatility: 0.04 },
];

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-curve'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const curves = COMMODITIES.map(c => {
    const spotPrice = round(c.baseLow + rng() * (c.baseHigh - c.baseLow));

    // Generate 8 monthly/quarterly contracts
    const contracts = Array.from({ length: 8 }, (_, i) => {
      const monthOffset = i < 4 ? i + 1 : 3 + (i - 3) * 3; // first 4 monthly, then quarterly
      const contractMonthIdx = (currentMonth + monthOffset) % 12;
      const contractYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);
      const monthLabel = `${MONTH_LABELS[contractMonthIdx]} ${contractYear}`;

      const price = round(
        spotPrice + c.slopeDir * monthOffset + (rng() - 0.5) * spotPrice * c.volatility
      );
      const change = round((rng() - 0.5) * spotPrice * 0.015);
      const openInterest = Math.round(jitter(180000 / (1 + i * 0.25), 0.2));
      const volume = Math.round(jitter(45000 / (1 + i * 0.35), 0.25));

      return { month: monthLabel, price, change, openInterest, volume };
    });

    const frontPrice = contracts[0].price;
    const secondPrice = contracts[1].price;
    const backPrice = contracts[contracts.length - 1].price;

    const calendarSpread = round(frontPrice - secondPrice);
    const rollYield = round(((frontPrice - secondPrice) / frontPrice) * 12 * 100);

    let structure: 'contango' | 'backwardation' | 'flat';
    const spreadPct = Math.abs(frontPrice - backPrice) / spotPrice;
    if (spreadPct < 0.005) {
      structure = 'flat';
    } else if (frontPrice > backPrice) {
      structure = 'backwardation';
    } else {
      structure = 'contango';
    }

    return {
      commodity: c.name,
      unit: c.unit,
      spotPrice,
      contracts,
      structure,
      rollYield,
      calendarSpread,
    };
  });

  // Structure summary
  const contangoCount = curves.filter(c => c.structure === 'contango').length;
  const backwardationCount = curves.filter(c => c.structure === 'backwardation').length;
  const flatCount = curves.filter(c => c.structure === 'flat').length;

  const structureSummary = {
    contango: contangoCount,
    backwardation: backwardationCount,
    flat: flatCount,
  };

  // Seasonal patterns
  const seasonalPatterns = {
    energy: {
      typicalHighMonths: ['Jan', 'Feb', 'Jul', 'Aug'],
      typicalLowMonths: ['Apr', 'May', 'Oct', 'Nov'],
      currentVsSeasonalAvg: round((rng() - 0.4) * 12),
    },
    agriculture: {
      typicalHighMonths: ['Mar', 'Apr', 'Jun', 'Jul'],
      typicalLowMonths: ['Sep', 'Oct', 'Nov'],
      currentVsSeasonalAvg: round((rng() - 0.45) * 10),
    },
  };

  // Inventory data
  const inventoryData = {
    crudeOil: {
      cushingStorage: {
        current: round(jitter(35, 0.12), 1),
        change: round((rng() - 0.5) * 4, 1),
        fiveYrAvg: 38.2,
        percentile: Math.round(rng() * 100),
        unit: 'million barrels',
      },
      totalUS: {
        current: round(jitter(440, 0.06), 1),
        change: round((rng() - 0.5) * 8, 1),
        fiveYrAvg: 455.0,
        percentile: Math.round(rng() * 100),
        unit: 'million barrels',
      },
    },
    naturalGas: {
      storage: {
        current: round(jitter(3100, 0.08), 0),
        change: round((rng() - 0.5) * 150, 0),
        fiveYrAvg: 3200,
        percentile: Math.round(rng() * 100),
        unit: 'Bcf',
      },
    },
    copper: {
      lmeWarehouse: {
        current: round(jitter(280, 0.15), 0),
        change: round((rng() - 0.5) * 30, 0),
        fiveYrAvg: 310,
        percentile: Math.round(rng() * 100),
        unit: 'thousand tonnes',
      },
    },
    grains: {
      corn: {
        current: round(jitter(1450, 0.1), 0),
        change: round((rng() - 0.5) * 80, 0),
        fiveYrAvg: 1520,
        percentile: Math.round(rng() * 100),
        unit: 'million bushels',
      },
      soybeans: {
        current: round(jitter(260, 0.12), 0),
        change: round((rng() - 0.5) * 25, 0),
        fiveYrAvg: 290,
        percentile: Math.round(rng() * 100),
        unit: 'million bushels',
      },
      wheat: {
        current: round(jitter(580, 0.1), 0),
        change: round((rng() - 0.5) * 40, 0),
        fiveYrAvg: 620,
        percentile: Math.round(rng() * 100),
        unit: 'million bushels',
      },
    },
  };

  // Open interest trend — last 6 data points for WTI, Gold, Corn
  const openInterestTrend = {
    WTI: Array.from({ length: 6 }, (_, i) => ({
      date: (() => { const d = new Date(); d.setDate(d.getDate() - (5 - i) * 7); return d.toISOString().slice(0, 10); })(),
      totalOI: Math.round(jitter(2100000, 0.05)),
    })),
    Gold: Array.from({ length: 6 }, (_, i) => ({
      date: (() => { const d = new Date(); d.setDate(d.getDate() - (5 - i) * 7); return d.toISOString().slice(0, 10); })(),
      totalOI: Math.round(jitter(550000, 0.06)),
    })),
    Corn: Array.from({ length: 6 }, (_, i) => ({
      date: (() => { const d = new Date(); d.setDate(d.getDate() - (5 - i) * 7); return d.toISOString().slice(0, 10); })(),
      totalOI: Math.round(jitter(1400000, 0.05)),
    })),
  };

  return {
    curves,
    structureSummary,
    seasonalPatterns,
    inventoryData,
    openInterestTrend,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CommodityCurve] Error:', message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate commodity curve data' });
  }
});

export default router;
