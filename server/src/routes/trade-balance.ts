import { Router } from 'express';

const router = Router();

// ── In-memory cache (5 min TTL) with stale fallback ──

let cacheData: unknown = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

// ── Helpers ──

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function vary(rng: () => number, base: number, pct: number): number {
  return Math.round((base * (1 + (rng() - 0.5) * 2 * pct)) * 100) / 100;
}

function rangeVal(rng: () => number, min: number, max: number): number {
  return Math.round((min + rng() * (max - min)) * 100) / 100;
}

// ── Types ──

interface TradeBalanceEntry {
  country: string;
  balance: number;
  exports: number;
  imports: number;
  change: number;
  trend: 'widening' | 'narrowing' | 'stable';
}

interface CurrentAccountEntry {
  country: string;
  balance: number;
  prior: number;
  historicalAvg: number;
  trend: 'improving' | 'deteriorating' | 'stable';
}

interface TopTradePartner {
  partner: string;
  exports: number;
  imports: number;
  balance: number;
  yoyChange: number;
}

interface TradeByCategoryEntry {
  category: string;
  exports: number;
  imports: number;
  balance: number;
  change: number;
}

interface ContainerTradeEntry {
  route: string;
  volume: number;
  yoyChange: number;
  avgRate: number;
  trend: 'expanding' | 'contracting' | 'stable';
}

interface TradePolicyEntry {
  country: string;
  measure: 'tariff' | 'quota' | 'sanction' | 'FTA';
  description: string;
  effectiveDate: string;
  impactedGoods: string;
  tradeValue: number;
}

interface TradeBalanceResponse {
  tradeBalance: TradeBalanceEntry[];
  currentAccount: CurrentAccountEntry[];
  topTradePartners: TopTradePartner[];
  tradeByCategory: TradeByCategoryEntry[];
  containerTrade: ContainerTradeEntry[];
  tradePolicy: TradePolicyEntry[];
  generatedAt: string;
}

// ── Country definitions with baseline ranges ──

interface TradeBalanceDef {
  country: string;
  balanceMin: number;
  balanceMax: number;
  exportsBase: number;
  importsBase: number;
}

const TRADE_BALANCE_DEFS: TradeBalanceDef[] = [
  { country: 'US',        balanceMin: -80,  balanceMax: -65,  exportsBase: 175, importsBase: 250 },
  { country: 'China',     balanceMin: 60,   balanceMax: 90,   exportsBase: 310, importsBase: 230 },
  { country: 'Germany',   balanceMin: 15,   balanceMax: 25,   exportsBase: 155, importsBase: 135 },
  { country: 'Japan',     balanceMin: -5,   balanceMax: 8,    exportsBase: 75,  importsBase: 72  },
  { country: 'UK',        balanceMin: -20,  balanceMax: -8,   exportsBase: 45,  importsBase: 60  },
  { country: 'EU',        balanceMin: 10,   balanceMax: 30,   exportsBase: 220, importsBase: 200 },
  { country: 'India',     balanceMin: -25,  balanceMax: -12,  exportsBase: 38,  importsBase: 55  },
  { country: 'Brazil',    balanceMin: 2,    balanceMax: 12,   exportsBase: 30,  importsBase: 22  },
  { country: 'Australia', balanceMin: -5,   balanceMax: 8,    exportsBase: 35,  importsBase: 32  },
  { country: 'Canada',    balanceMin: -8,   balanceMax: 5,    exportsBase: 52,  importsBase: 50  },
];

// ── Current account definitions (% of GDP) ──

interface CurrentAccountDef {
  country: string;
  balanceBase: number;
  historicalAvg: number;
}

const CURRENT_ACCOUNT_DEFS: CurrentAccountDef[] = [
  { country: 'US',        balanceBase: -3.5,  historicalAvg: -2.8 },
  { country: 'China',     balanceBase: 1.8,   historicalAvg: 2.5  },
  { country: 'Germany',   balanceBase: 6.2,   historicalAvg: 6.8  },
  { country: 'Japan',     balanceBase: 3.5,   historicalAvg: 3.2  },
  { country: 'UK',        balanceBase: -3.8,  historicalAvg: -3.2 },
  { country: 'EU',        balanceBase: 2.1,   historicalAvg: 1.8  },
  { country: 'India',     balanceBase: -1.5,  historicalAvg: -1.8 },
  { country: 'Brazil',    balanceBase: -2.2,  historicalAvg: -2.5 },
  { country: 'Australia', balanceBase: 1.2,   historicalAvg: -1.5 },
  { country: 'Canada',    balanceBase: -0.5,  historicalAvg: -2.0 },
];

// ── US bilateral trade partner definitions ──

interface TradePartnerDef {
  partner: string;
  exportsBase: number;
  importsBase: number;
}

const TRADE_PARTNER_DEFS: TradePartnerDef[] = [
  { partner: 'China',    exportsBase: 15.2, importsBase: 45.8 },
  { partner: 'Mexico',   exportsBase: 28.5, importsBase: 42.3 },
  { partner: 'Canada',   exportsBase: 32.1, importsBase: 38.7 },
  { partner: 'EU',       exportsBase: 28.8, importsBase: 48.2 },
  { partner: 'Japan',    exportsBase: 8.5,  importsBase: 13.2 },
  { partner: 'UK',       exportsBase: 7.8,  importsBase: 6.2  },
  { partner: 'S.Korea',  exportsBase: 6.2,  importsBase: 10.5 },
  { partner: 'India',    exportsBase: 4.5,  importsBase: 7.8  },
];

// ── Trade category definitions ──

interface TradeCategoryDef {
  category: string;
  exportsBase: number;
  importsBase: number;
}

const TRADE_CATEGORY_DEFS: TradeCategoryDef[] = [
  { category: 'Capital Goods',       exportsBase: 48.5, importsBase: 62.3 },
  { category: 'Consumer Goods',      exportsBase: 22.1, importsBase: 58.7 },
  { category: 'Industrial Supplies', exportsBase: 42.8, importsBase: 38.5 },
  { category: 'Automotive',          exportsBase: 14.2, importsBase: 35.8 },
  { category: 'Food/Ag',             exportsBase: 15.6, importsBase: 16.2 },
  { category: 'Petroleum',           exportsBase: 12.8, importsBase: 22.5 },
];

// ── Container trade route definitions ──

interface ContainerRouteDef {
  route: string;
  volumeBase: number;
  avgRateBase: number;
}

const CONTAINER_ROUTE_DEFS: ContainerRouteDef[] = [
  { route: 'Trans-Pacific',  volumeBase: 28.5, avgRateBase: 2850 },
  { route: 'Trans-Atlantic', volumeBase: 8.2,  avgRateBase: 1950 },
  { route: 'Asia-Europe',    volumeBase: 25.1, avgRateBase: 3200 },
  { route: 'Intra-Asia',     volumeBase: 42.3, avgRateBase: 1100 },
];

// ── Trade policy templates ──

interface TradePolicyDef {
  country: string;
  measures: Array<{
    measure: 'tariff' | 'quota' | 'sanction' | 'FTA';
    description: string;
    impactedGoods: string;
    tradeValueBase: number;
  }>;
}

const TRADE_POLICY_DEFS: TradePolicyDef[] = [
  {
    country: 'US',
    measures: [
      { measure: 'tariff',   description: 'Section 301 tariffs on Chinese imports',       impactedGoods: 'Electronics, Machinery',     tradeValueBase: 370  },
      { measure: 'tariff',   description: 'Steel and aluminum tariffs under Section 232', impactedGoods: 'Steel, Aluminum',            tradeValueBase: 48   },
      { measure: 'sanction', description: 'Export controls on advanced semiconductors',    impactedGoods: 'Semiconductors, Chip Equipment', tradeValueBase: 85 },
    ],
  },
  {
    country: 'EU',
    measures: [
      { measure: 'tariff', description: 'Anti-dumping duties on Chinese EVs',              impactedGoods: 'Electric Vehicles',           tradeValueBase: 24  },
      { measure: 'FTA',    description: 'EU-Mercosur free trade agreement implementation', impactedGoods: 'Agriculture, Manufactured Goods', tradeValueBase: 45 },
      { measure: 'quota',  description: 'Carbon border adjustment mechanism (CBAM)',       impactedGoods: 'Steel, Cement, Fertilizers',  tradeValueBase: 32  },
    ],
  },
  {
    country: 'China',
    measures: [
      { measure: 'tariff',   description: 'Retaliatory tariffs on US agricultural goods',        impactedGoods: 'Soybeans, Pork, Beef',         tradeValueBase: 28 },
      { measure: 'sanction', description: 'Rare earth export restrictions',                      impactedGoods: 'Rare Earth Minerals',           tradeValueBase: 15 },
      { measure: 'quota',    description: 'Gallium and germanium export licensing requirements', impactedGoods: 'Gallium, Germanium',            tradeValueBase: 8  },
    ],
  },
  {
    country: 'India',
    measures: [
      { measure: 'tariff', description: 'Import duties on electronics and solar panels',  impactedGoods: 'Electronics, Solar Panels',  tradeValueBase: 18 },
      { measure: 'FTA',    description: 'India-UAE CEPA trade facilitation',               impactedGoods: 'Petroleum, Jewelry, Textiles', tradeValueBase: 52 },
    ],
  },
  {
    country: 'Japan',
    measures: [
      { measure: 'sanction', description: 'Export controls on semiconductor materials',         impactedGoods: 'Photoresists, Fluorinated Polyimide', tradeValueBase: 12 },
      { measure: 'FTA',      description: 'RCEP tariff reduction schedule implementation',     impactedGoods: 'Manufactured Goods, Agriculture',     tradeValueBase: 65 },
    ],
  },
];

// ── Data generation ──

function generateTradeBalance(rng: () => number): TradeBalanceEntry[] {
  const trends: Array<'widening' | 'narrowing' | 'stable'> = ['widening', 'narrowing', 'stable'];
  return TRADE_BALANCE_DEFS.map(def => {
    const balance = rangeVal(rng, def.balanceMin, def.balanceMax);
    const exports = vary(rng, def.exportsBase, 0.08);
    const imports = vary(rng, def.importsBase, 0.08);
    const change = rangeVal(rng, -8, 8);
    const trend = pick(rng, trends);
    return { country: def.country, balance, exports, imports, change, trend };
  });
}

function generateCurrentAccount(rng: () => number): CurrentAccountEntry[] {
  const trends: Array<'improving' | 'deteriorating' | 'stable'> = ['improving', 'deteriorating', 'stable'];
  return CURRENT_ACCOUNT_DEFS.map(def => {
    const balance = Math.round((def.balanceBase + (rng() - 0.5) * 2) * 100) / 100;
    const prior = Math.round((def.balanceBase + (rng() - 0.5) * 1.5) * 100) / 100;
    const trend = pick(rng, trends);
    return {
      country: def.country,
      balance,
      prior,
      historicalAvg: def.historicalAvg,
      trend,
    };
  });
}

function generateTopTradePartners(rng: () => number): TopTradePartner[] {
  return TRADE_PARTNER_DEFS.map(def => {
    const exports = vary(rng, def.exportsBase, 0.10);
    const imports = vary(rng, def.importsBase, 0.10);
    const balance = Math.round((exports - imports) * 100) / 100;
    const yoyChange = rangeVal(rng, -12, 15);
    return { partner: def.partner, exports, imports, balance, yoyChange };
  });
}

function generateTradeByCategory(rng: () => number): TradeByCategoryEntry[] {
  return TRADE_CATEGORY_DEFS.map(def => {
    const exports = vary(rng, def.exportsBase, 0.10);
    const imports = vary(rng, def.importsBase, 0.10);
    const balance = Math.round((exports - imports) * 100) / 100;
    const change = rangeVal(rng, -10, 10);
    return { category: def.category, exports, imports, balance, change };
  });
}

function generateContainerTrade(rng: () => number): ContainerTradeEntry[] {
  const trends: Array<'expanding' | 'contracting' | 'stable'> = ['expanding', 'contracting', 'stable'];
  return CONTAINER_ROUTE_DEFS.map(def => {
    const volume = vary(rng, def.volumeBase, 0.08);
    const yoyChange = rangeVal(rng, -8, 12);
    const avgRate = Math.round(vary(rng, def.avgRateBase, 0.15));
    const trend = pick(rng, trends);
    return { route: def.route, volume, yoyChange, avgRate, trend };
  });
}

function generateTradePolicy(rng: () => number): TradePolicyEntry[] {
  const now = new Date();
  const entries: TradePolicyEntry[] = [];

  for (const policyDef of TRADE_POLICY_DEFS) {
    for (const m of policyDef.measures) {
      const offsetDays = Math.floor(rng() * 540) - 360;
      const effectiveDate = new Date(now.getTime() + offsetDays * 86400000).toISOString().slice(0, 10);
      const tradeValue = vary(rng, m.tradeValueBase, 0.12);

      entries.push({
        country: policyDef.country,
        measure: m.measure,
        description: m.description,
        effectiveDate,
        impactedGoods: m.impactedGoods,
        tradeValue,
      });
    }
  }

  return entries;
}

// ── Route handler ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const seed = hashSeed('trade-balance-' + new Date().toISOString().slice(0, 10));
    const rng = mulberry32(seed);

    const result: TradeBalanceResponse = {
      tradeBalance: generateTradeBalance(rng),
      currentAccount: generateCurrentAccount(rng),
      topTradePartners: generateTopTradePartners(rng),
      tradeByCategory: generateTradeByCategory(rng),
      containerTrade: generateContainerTrade(rng),
      tradePolicy: generateTradePolicy(rng),
      generatedAt: new Date().toISOString(),
    };

    cacheData = result;
    cacheTime = now;

    res.json(result);
  } catch (err) {
    console.error('[TradeBalance] Error:', err instanceof Error ? err.message : err);
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate trade balance data' });
  }
});

export default router;
