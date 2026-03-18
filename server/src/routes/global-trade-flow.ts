import { Router } from 'express';

const router = Router();

// ── In-memory cache (5 min TTL) with stale fallback ──

let cacheData: unknown = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

// ── Seeded PRNG ──

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

// ── Helper ──

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function vary(rng: () => number, base: number, pct: number): number {
  return Math.round((base * (1 + (rng() - 0.5) * 2 * pct)) * 100) / 100;
}

// ── Types ──

interface CountryTradeData {
  country: string;
  code: string;
  exports: number;
  imports: number;
  tradeBalance: number;
  yoyExportGrowth: number;
  yoyImportGrowth: number;
  topExportPartner: string;
  topImportPartner: string;
}

interface BilateralFlow {
  corridor: string;
  from: string;
  to: string;
  volume: number;
  balance: number;
  yoyChange: number;
  tariffRate: number;
  trend: 'expanding' | 'contracting' | 'stable';
}

interface SupplyChainPressure {
  shippingCosts: number;
  deliveryTimes: number;
  backlogs: number;
  composite: number;
  trend: 'rising' | 'falling' | 'stable';
  month: string;
}

interface TariffAction {
  countries: string;
  productCategory: string;
  rate: number;
  effectiveDate: string;
  estimatedImpact: number;
  status: 'active' | 'proposed' | 'under review';
}

interface CommodityTradeEntry {
  commodity: string;
  globalTradeVolume: number;
  topExporter: string;
  topImporter: string;
  yoyChange: number;
  priceImpact: number;
}

interface GlobalTradeFlowResponse {
  countryData: CountryTradeData[];
  bilateralFlows: BilateralFlow[];
  supplyChainPressure: SupplyChainPressure;
  tariffTracker: TariffAction[];
  commodityTrade: CommodityTradeEntry[];
  generatedAt: string;
}

// ── Country definitions (15 major trading nations) ──

interface CountryDef {
  country: string;
  code: string;
  baseExports: number;   // $B/month
  baseImports: number;
  topExportPartner: string;
  topImportPartner: string;
}

const COUNTRY_DEFS: CountryDef[] = [
  { country: 'United States',  code: 'US', baseExports: 175, baseImports: 275, topExportPartner: 'Canada',      topImportPartner: 'China' },
  { country: 'China',          code: 'CN', baseExports: 310, baseImports: 220, topExportPartner: 'United States', topImportPartner: 'South Korea' },
  { country: 'Germany',        code: 'DE', baseExports: 155, baseImports: 130, topExportPartner: 'United States', topImportPartner: 'China' },
  { country: 'Japan',          code: 'JP', baseExports: 75,  baseImports: 80,  topExportPartner: 'China',       topImportPartner: 'China' },
  { country: 'Netherlands',    code: 'NL', baseExports: 85,  baseImports: 75,  topExportPartner: 'Germany',     topImportPartner: 'China' },
  { country: 'South Korea',    code: 'KR', baseExports: 58,  baseImports: 55,  topExportPartner: 'China',       topImportPartner: 'China' },
  { country: 'France',         code: 'FR', baseExports: 55,  baseImports: 65,  topExportPartner: 'Germany',     topImportPartner: 'Germany' },
  { country: 'United Kingdom', code: 'GB', baseExports: 45,  baseImports: 65,  topExportPartner: 'United States', topImportPartner: 'China' },
  { country: 'Italy',          code: 'IT', baseExports: 55,  baseImports: 50,  topExportPartner: 'Germany',     topImportPartner: 'Germany' },
  { country: 'Canada',         code: 'CA', baseExports: 52,  baseImports: 48,  topExportPartner: 'United States', topImportPartner: 'United States' },
  { country: 'India',          code: 'IN', baseExports: 38,  baseImports: 55,  topExportPartner: 'United States', topImportPartner: 'China' },
  { country: 'Mexico',         code: 'MX', baseExports: 50,  baseImports: 48,  topExportPartner: 'United States', topImportPartner: 'United States' },
  { country: 'Taiwan',         code: 'TW', baseExports: 42,  baseImports: 35,  topExportPartner: 'China',       topImportPartner: 'Japan' },
  { country: 'Singapore',      code: 'SG', baseExports: 45,  baseImports: 40,  topExportPartner: 'China',       topImportPartner: 'China' },
  { country: 'Vietnam',        code: 'VN', baseExports: 35,  baseImports: 30,  topExportPartner: 'United States', topImportPartner: 'China' },
];

// ── Bilateral flow definitions (8 major corridors) ──

interface BilateralDef {
  corridor: string;
  from: string;
  to: string;
  baseVolume: number;   // $B/yr
  baseBalance: number;
  baseTariffRate: number;
}

const BILATERAL_DEFS: BilateralDef[] = [
  { corridor: 'US-China',   from: 'United States', to: 'China',          baseVolume: 690, baseBalance: -280, baseTariffRate: 19.3 },
  { corridor: 'US-EU',      from: 'United States', to: 'European Union', baseVolume: 880, baseBalance: -180, baseTariffRate: 3.1 },
  { corridor: 'US-Mexico',  from: 'United States', to: 'Mexico',         baseVolume: 780, baseBalance: -130, baseTariffRate: 2.4 },
  { corridor: 'China-EU',   from: 'China',         to: 'European Union', baseVolume: 740, baseBalance: 210,  baseTariffRate: 7.5 },
  { corridor: 'China-Japan', from: 'China',        to: 'Japan',          baseVolume: 350, baseBalance: 45,   baseTariffRate: 4.2 },
  { corridor: 'US-Canada',  from: 'United States', to: 'Canada',         baseVolume: 760, baseBalance: -65,  baseTariffRate: 1.8 },
  { corridor: 'China-ASEAN', from: 'China',        to: 'ASEAN',          baseVolume: 680, baseBalance: 95,   baseTariffRate: 5.1 },
  { corridor: 'EU-UK',      from: 'European Union', to: 'United Kingdom', baseVolume: 520, baseBalance: 80,  baseTariffRate: 4.8 },
];

// ── Tariff action templates ──

interface TariffTemplate {
  countries: string;
  productCategory: string;
  baseRate: number;
  baseImpact: number;
}

const TARIFF_TEMPLATES: TariffTemplate[] = [
  { countries: 'US on China',        productCategory: 'Electronics & Semiconductors', baseRate: 25,  baseImpact: 52 },
  { countries: 'US on EU',           productCategory: 'Steel & Aluminum',             baseRate: 25,  baseImpact: 18 },
  { countries: 'EU on China',        productCategory: 'Electric Vehicles',             baseRate: 38,  baseImpact: 24 },
  { countries: 'China on US',        productCategory: 'Agricultural Products',         baseRate: 15,  baseImpact: 14 },
  { countries: 'US on Vietnam',      productCategory: 'Textiles & Apparel',            baseRate: 12,  baseImpact: 8 },
  { countries: 'India on China',     productCategory: 'Solar Panels & Equipment',      baseRate: 40,  baseImpact: 6 },
];

// ── Commodity definitions ──

interface CommodityDef {
  commodity: string;
  baseVolume: number;   // $B/yr global trade
  topExporter: string;
  topImporter: string;
}

const COMMODITY_DEFS: CommodityDef[] = [
  { commodity: 'Crude Oil',      baseVolume: 1850, topExporter: 'Saudi Arabia', topImporter: 'China' },
  { commodity: 'Natural Gas',    baseVolume: 420,  topExporter: 'United States', topImporter: 'European Union' },
  { commodity: 'Iron Ore',       baseVolume: 230,  topExporter: 'Australia',    topImporter: 'China' },
  { commodity: 'Soybeans',       baseVolume: 75,   topExporter: 'Brazil',       topImporter: 'China' },
  { commodity: 'Semiconductors', baseVolume: 680,  topExporter: 'Taiwan',       topImporter: 'China' },
];

// ── Data generation ──

function generateCountryData(rng: () => number): CountryTradeData[] {
  return COUNTRY_DEFS.map(def => {
    const exports = vary(rng, def.baseExports, 0.08);
    const imports = vary(rng, def.baseImports, 0.08);
    const tradeBalance = Math.round((exports - imports) * 100) / 100;
    const yoyExportGrowth = Math.round((rng() * 16 - 4) * 100) / 100;
    const yoyImportGrowth = Math.round((rng() * 14 - 3) * 100) / 100;

    return {
      country: def.country,
      code: def.code,
      exports,
      imports,
      tradeBalance,
      yoyExportGrowth,
      yoyImportGrowth,
      topExportPartner: def.topExportPartner,
      topImportPartner: def.topImportPartner,
    };
  });
}

function generateBilateralFlows(rng: () => number): BilateralFlow[] {
  const trends: Array<'expanding' | 'contracting' | 'stable'> = ['expanding', 'contracting', 'stable'];

  return BILATERAL_DEFS.map(def => {
    const volume = vary(rng, def.baseVolume, 0.06);
    const balance = vary(rng, def.baseBalance, 0.15);
    const yoyChange = Math.round((rng() * 12 - 4) * 100) / 100;
    const tariffRate = Math.round((def.baseTariffRate + (rng() - 0.5) * 3) * 100) / 100;
    const trend = pick(rng, trends);

    return {
      corridor: def.corridor,
      from: def.from,
      to: def.to,
      volume,
      balance,
      yoyChange,
      tariffRate: Math.max(0, tariffRate),
      trend,
    };
  });
}

function generateSupplyChainPressure(rng: () => number): SupplyChainPressure {
  const shippingCosts = Math.round((80 + rng() * 70) * 100) / 100;
  const deliveryTimes = Math.round((90 + rng() * 40) * 100) / 100;
  const backlogs = Math.round((70 + rng() * 60) * 100) / 100;

  // Composite: 0-4 scale, 0=normal
  const rawComposite = ((shippingCosts - 80) / 70 + (deliveryTimes - 90) / 40 + (backlogs - 70) / 60) / 3;
  const composite = Math.round(Math.max(0, Math.min(4, rawComposite * 4)) * 100) / 100;

  const trendOptions: Array<'rising' | 'falling' | 'stable'> = ['rising', 'falling', 'stable'];
  const trend = pick(rng, trendOptions);

  const now = new Date();
  const month = now.toISOString().slice(0, 7);

  return {
    shippingCosts,
    deliveryTimes,
    backlogs,
    composite,
    trend,
    month,
  };
}

function generateTariffTracker(rng: () => number): TariffAction[] {
  const statuses: Array<'active' | 'proposed' | 'under review'> = ['active', 'proposed', 'under review'];
  const now = new Date();

  return TARIFF_TEMPLATES.map(tmpl => {
    const rate = Math.round((tmpl.baseRate + (rng() - 0.5) * 10) * 100) / 100;
    const estimatedImpact = vary(rng, tmpl.baseImpact, 0.12);
    const status = pick(rng, statuses);

    // Effective date: somewhere in the past year to next 6 months
    const offsetDays = Math.floor(rng() * 540) - 360;
    const effectiveDate = new Date(now.getTime() + offsetDays * 86400000).toISOString().slice(0, 10);

    return {
      countries: tmpl.countries,
      productCategory: tmpl.productCategory,
      rate: Math.max(0, rate),
      effectiveDate,
      estimatedImpact,
      status,
    };
  });
}

function generateCommodityTrade(rng: () => number): CommodityTradeEntry[] {
  return COMMODITY_DEFS.map(def => {
    const globalTradeVolume = vary(rng, def.baseVolume, 0.08);
    const yoyChange = Math.round((rng() * 18 - 6) * 100) / 100;
    const priceImpact = Math.round((rng() * 30 - 10) * 100) / 100;

    return {
      commodity: def.commodity,
      globalTradeVolume,
      topExporter: def.topExporter,
      topImporter: def.topImporter,
      yoyChange,
      priceImpact,
    };
  });
}

// ── Route handler ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const seed = hashSeed('global-trade-flow-' + new Date().toISOString().slice(0, 10));
    const rng = mulberry32(seed);

    const result: GlobalTradeFlowResponse = {
      countryData: generateCountryData(rng),
      bilateralFlows: generateBilateralFlows(rng),
      supplyChainPressure: generateSupplyChainPressure(rng),
      tariffTracker: generateTariffTracker(rng),
      commodityTrade: generateCommodityTrade(rng),
      generatedAt: new Date().toISOString(),
    };

    cacheData = result;
    cacheTime = now;

    res.json(result);
  } catch (err) {
    console.error('[GlobalTradeFlow] Error:', err instanceof Error ? err.message : err);
    // Stale fallback
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate global trade flow data' });
  }
});

export default router;
