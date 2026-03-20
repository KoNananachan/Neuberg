import { Router } from 'express';

const router = Router();

// ── Deterministic PRNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Static Definitions ──

interface CommodityConfig {
  name: string;
  sector: 'Energy' | 'Precious Metals' | 'Base Metals' | 'Agriculture';
  demandBase: number;
  supplyBase: number;
  demandUnit: string;
  inventoryDaysBase: number;
  spotPriceBase: number;
  priceUnit: string;
  topConsumers: { country: string; share: number }[];
}

const COMMODITIES: CommodityConfig[] = [
  {
    name: 'Crude Oil', sector: 'Energy',
    demandBase: 103.2, supplyBase: 102.8, demandUnit: 'mb/d',
    inventoryDaysBase: 27, spotPriceBase: 78.5, priceUnit: '$/bbl',
    topConsumers: [{ country: 'United States', share: 19.8 }, { country: 'China', share: 15.6 }, { country: 'India', share: 5.4 }],
  },
  {
    name: 'Natural Gas', sector: 'Energy',
    demandBase: 4050, supplyBase: 4080, demandUnit: 'bcm/year',
    inventoryDaysBase: 33, spotPriceBase: 2.85, priceUnit: '$/MMBtu',
    topConsumers: [{ country: 'United States', share: 21.5 }, { country: 'Russia', share: 11.8 }, { country: 'China', share: 9.2 }],
  },
  {
    name: 'Gold', sector: 'Precious Metals',
    demandBase: 4900, supplyBase: 4820, demandUnit: 'mt/year',
    inventoryDaysBase: 120, spotPriceBase: 2340, priceUnit: '$/oz',
    topConsumers: [{ country: 'China', share: 27.4 }, { country: 'India', share: 23.8 }, { country: 'United States', share: 6.2 }],
  },
  {
    name: 'Silver', sector: 'Precious Metals',
    demandBase: 36200, supplyBase: 35500, demandUnit: 'mt/year',
    inventoryDaysBase: 90, spotPriceBase: 27.5, priceUnit: '$/oz',
    topConsumers: [{ country: 'India', share: 18.5 }, { country: 'United States', share: 14.2 }, { country: 'China', share: 12.8 }],
  },
  {
    name: 'Copper', sector: 'Base Metals',
    demandBase: 26.4, supplyBase: 25.8, demandUnit: 'mt/year',
    inventoryDaysBase: 14, spotPriceBase: 8450, priceUnit: '$/mt',
    topConsumers: [{ country: 'China', share: 54.0 }, { country: 'United States', share: 7.5 }, { country: 'Germany', share: 4.8 }],
  },
  {
    name: 'Aluminum', sector: 'Base Metals',
    demandBase: 70.5, supplyBase: 69.8, demandUnit: 'mt/year',
    inventoryDaysBase: 18, spotPriceBase: 2320, priceUnit: '$/mt',
    topConsumers: [{ country: 'China', share: 58.2 }, { country: 'India', share: 6.3 }, { country: 'United States', share: 5.1 }],
  },
  {
    name: 'Iron Ore', sector: 'Base Metals',
    demandBase: 2400, supplyBase: 2450, demandUnit: 'mt/year',
    inventoryDaysBase: 42, spotPriceBase: 118, priceUnit: '$/mt',
    topConsumers: [{ country: 'China', share: 72.5 }, { country: 'Japan', share: 4.8 }, { country: 'India', share: 4.2 }],
  },
  {
    name: 'Wheat', sector: 'Agriculture',
    demandBase: 795, supplyBase: 790, demandUnit: 'mt/year',
    inventoryDaysBase: 110, spotPriceBase: 585, priceUnit: '$/bu (cents)',
    topConsumers: [{ country: 'China', share: 17.8 }, { country: 'India', share: 13.2 }, { country: 'EU', share: 16.5 }],
  },
  {
    name: 'Corn', sector: 'Agriculture',
    demandBase: 1220, supplyBase: 1210, demandUnit: 'mt/year',
    inventoryDaysBase: 75, spotPriceBase: 445, priceUnit: '$/bu (cents)',
    topConsumers: [{ country: 'United States', share: 30.5 }, { country: 'China', share: 23.8 }, { country: 'Brazil', share: 7.2 }],
  },
  {
    name: 'Soybeans', sector: 'Agriculture',
    demandBase: 395, supplyBase: 390, demandUnit: 'mt/year',
    inventoryDaysBase: 60, spotPriceBase: 1180, priceUnit: '$/bu (cents)',
    topConsumers: [{ country: 'China', share: 31.5 }, { country: 'United States', share: 15.8 }, { country: 'Brazil', share: 12.4 }],
  },
  {
    name: 'Coffee', sector: 'Agriculture',
    demandBase: 175, supplyBase: 170, demandUnit: 'mt/year (M bags)',
    inventoryDaysBase: 55, spotPriceBase: 185, priceUnit: '$/lb (cents)',
    topConsumers: [{ country: 'EU', share: 26.8 }, { country: 'United States', share: 15.2 }, { country: 'Brazil', share: 13.5 }],
  },
  {
    name: 'Sugar', sector: 'Agriculture',
    demandBase: 178, supplyBase: 176, demandUnit: 'mt/year',
    inventoryDaysBase: 65, spotPriceBase: 21.5, priceUnit: '$/lb (cents)',
    topConsumers: [{ country: 'India', share: 16.2 }, { country: 'EU', share: 10.5 }, { country: 'China', share: 9.8 }],
  },
  {
    name: 'Nickel', sector: 'Base Metals',
    demandBase: 3.35, supplyBase: 3.42, demandUnit: 'mt/year',
    inventoryDaysBase: 6, spotPriceBase: 16200, priceUnit: '$/mt',
    topConsumers: [{ country: 'China', share: 58.5 }, { country: 'Indonesia', share: 8.2 }, { country: 'Japan', share: 6.8 }],
  },
  {
    name: 'Zinc', sector: 'Base Metals',
    demandBase: 14.2, supplyBase: 13.8, demandUnit: 'mt/year',
    inventoryDaysBase: 8, spotPriceBase: 2680, priceUnit: '$/mt',
    topConsumers: [{ country: 'China', share: 48.5 }, { country: 'India', share: 5.6 }, { country: 'United States', share: 5.2 }],
  },
  {
    name: 'Platinum', sector: 'Precious Metals',
    demandBase: 7.8, supplyBase: 7.5, demandUnit: 'moz/year',
    inventoryDaysBase: 85, spotPriceBase: 985, priceUnit: '$/oz',
    topConsumers: [{ country: 'China', share: 25.2 }, { country: 'Japan', share: 16.5 }, { country: 'North America', share: 14.8 }],
  },
];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ── Data generation ──

interface ConsumerEntry {
  country: string;
  share: number;
}

interface CommodityEntry {
  name: string;
  sector: string;
  currentDemand: number;
  demandUnit: string;
  currentSupply: number;
  supplyDemandBalance: number;
  balanceStatus: 'Surplus' | 'Deficit' | 'Balanced';
  inventoryDays: number;
  inventoryChange: number;
  demandGrowthYoY: number;
  supplyGrowthYoY: number;
  forecastQ1: number;
  forecastQ2: number;
  forecastQ3: number;
  forecastQ4: number;
  forecastChangeQ4: number;
  topConsumers: ConsumerEntry[];
  spotPrice: number;
  priceUnit: string;
}

interface SummaryData {
  totalEnergySurplus: number;
  totalMetalsDeficit: number;
  avgDemandGrowth: number;
  commoditiesInDeficit: number;
  commoditiesInSurplus: number;
}

interface CommodityDemandResponse {
  commodities: CommodityEntry[];
  summary: SummaryData;
  generatedAt: string;
}

function generate(): CommodityDemandResponse {
  const rng = seededRandom('commodity-demand');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const commodities: CommodityEntry[] = COMMODITIES.map(c => {
    const currentDemand = round2(jitter(c.demandBase, 0.04));
    const currentSupply = round2(jitter(c.supplyBase, 0.04));
    const balance = round2(currentSupply - currentDemand);
    const absBalance = Math.abs(balance);

    // Determine balance status with a small threshold for "Balanced"
    const threshold = c.demandBase * 0.002;
    let balanceStatus: 'Surplus' | 'Deficit' | 'Balanced';
    if (absBalance < threshold) {
      balanceStatus = 'Balanced';
    } else if (balance > 0) {
      balanceStatus = 'Surplus';
    } else {
      balanceStatus = 'Deficit';
    }

    const inventoryDays = round2(jitter(c.inventoryDaysBase, 0.12));
    const inventoryChange = round2((rng() - 0.5) * 6);

    const demandGrowthYoY = round2((rng() - 0.35) * 5);
    const supplyGrowthYoY = round2((rng() - 0.4) * 5);

    // Quarterly demand forecasts: trend from current demand with seasonal variation
    const trendFactor = 1 + (rng() - 0.45) * 0.04;
    const forecastQ1 = round2(currentDemand * (trendFactor + (rng() - 0.5) * 0.02));
    const forecastQ2 = round2(currentDemand * (trendFactor * (1 + (rng() - 0.5) * 0.015)));
    const forecastQ3 = round2(currentDemand * (trendFactor * (1 + (rng() - 0.45) * 0.02)));
    const forecastQ4 = round2(currentDemand * (trendFactor * (1 + (rng() - 0.4) * 0.025)));
    const forecastChangeQ4 = round2(((forecastQ4 - currentDemand) / currentDemand) * 100);

    // Apply minor jitter to consumer shares
    const topConsumers: ConsumerEntry[] = c.topConsumers.map(tc => ({
      country: tc.country,
      share: round2(jitter(tc.share, 0.05)),
    }));

    const spotPrice = round2(jitter(c.spotPriceBase, 0.08));

    return {
      name: c.name,
      sector: c.sector,
      currentDemand,
      demandUnit: c.demandUnit,
      currentSupply,
      supplyDemandBalance: balance,
      balanceStatus,
      inventoryDays,
      inventoryChange,
      demandGrowthYoY,
      supplyGrowthYoY,
      forecastQ1,
      forecastQ2,
      forecastQ3,
      forecastQ4,
      forecastChangeQ4,
      topConsumers,
      spotPrice,
      priceUnit: c.priceUnit,
    };
  });

  // Summary
  const energyCommodities = commodities.filter(c => c.sector === 'Energy');
  const metalsCommodities = commodities.filter(c =>
    c.sector === 'Base Metals' || c.sector === 'Precious Metals',
  );

  const totalEnergySurplus = round2(
    energyCommodities.reduce((sum, c) => sum + c.supplyDemandBalance, 0),
  );
  const totalMetalsDeficit = round2(
    metalsCommodities
      .filter(c => c.supplyDemandBalance < 0)
      .reduce((sum, c) => sum + c.supplyDemandBalance, 0),
  );
  const avgDemandGrowth = round2(
    commodities.reduce((sum, c) => sum + c.demandGrowthYoY, 0) / commodities.length,
  );
  const commoditiesInDeficit = commodities.filter(c => c.balanceStatus === 'Deficit').length;
  const commoditiesInSurplus = commodities.filter(c => c.balanceStatus === 'Surplus').length;

  const summary: SummaryData = {
    totalEnergySurplus,
    totalMetalsDeficit,
    avgDemandGrowth,
    commoditiesInDeficit,
    commoditiesInSurplus,
  };

  return {
    commodities,
    summary,
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
    console.error('[CommodityDemand] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity demand forecast data' });
  }
});

export default router;
