import { Router } from 'express';

const router = Router();

// ── In-memory cache (5-minute TTL) ──

let cacheData: unknown = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60_000;

// ── Deterministic seeded PRNG ──

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
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Helpers ──

function jitter(rng: () => number, base: number, pct: number): number {
  return Math.round((base * (1 + (rng() - 0.5) * 2 * pct)) * 100) / 100;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Data generation ──

function generateTradeData() {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed(today);
  const rng = mulberry32(seed);

  // ── Top Exporters (15 countries, values in billions USD) ──

  const exporterConfigs: {
    name: string;
    exports: number;
    imports: number;
    topExportPartner: string;
    topImportPartner: string;
  }[] = [
    { name: 'China', exports: 3590, imports: 2720, topExportPartner: 'United States', topImportPartner: 'South Korea' },
    { name: 'United States', exports: 2050, imports: 3380, topExportPartner: 'Canada', topImportPartner: 'China' },
    { name: 'Germany', exports: 1810, imports: 1460, topExportPartner: 'United States', topImportPartner: 'China' },
    { name: 'Japan', exports: 920, imports: 910, topExportPartner: 'United States', topImportPartner: 'China' },
    { name: 'South Korea', exports: 690, imports: 640, topExportPartner: 'China', topImportPartner: 'Japan' },
    { name: 'Netherlands', exports: 870, imports: 780, topExportPartner: 'Germany', topImportPartner: 'China' },
    { name: 'France', exports: 640, imports: 750, topExportPartner: 'Germany', topImportPartner: 'China' },
    { name: 'Italy', exports: 660, imports: 590, topExportPartner: 'Germany', topImportPartner: 'China' },
    { name: 'United Kingdom', exports: 490, imports: 710, topExportPartner: 'United States', topImportPartner: 'China' },
    { name: 'Canada', exports: 590, imports: 560, topExportPartner: 'United States', topImportPartner: 'China' },
    { name: 'India', exports: 450, imports: 720, topExportPartner: 'United States', topImportPartner: 'China' },
    { name: 'Mexico', exports: 580, imports: 530, topExportPartner: 'United States', topImportPartner: 'China' },
    { name: 'Singapore', exports: 510, imports: 490, topExportPartner: 'China', topImportPartner: 'Malaysia' },
    { name: 'Taiwan', exports: 480, imports: 380, topExportPartner: 'China', topImportPartner: 'Japan' },
    { name: 'Saudi Arabia', exports: 350, imports: 210, topExportPartner: 'China', topImportPartner: 'United States' },
  ];

  const topExporters = exporterConfigs.map(c => {
    const exports = jitter(rng, c.exports, 0.04);
    const imports = jitter(rng, c.imports, 0.04);
    const tradeBalance = Math.round((exports - imports) * 100) / 100;
    const yoyExportChange = Math.round((rng() * 16 - 5) * 100) / 100;
    const yoyImportChange = Math.round((rng() * 16 - 5) * 100) / 100;
    return {
      name: c.name,
      exports,
      imports,
      tradeBalance,
      yoyExportChange,
      yoyImportChange,
      topExportPartner: c.topExportPartner,
      topImportPartner: c.topImportPartner,
    };
  });

  // ── Trade Lanes (12 major bilateral flows, volume in billions USD) ──

  const laneConfigs: {
    from: string;
    to: string;
    volume: number;
    keyGoods: string[];
  }[] = [
    { from: 'United States', to: 'China', volume: 690, keyGoods: ['Semiconductors', 'Soybeans', 'Aircraft', 'LNG'] },
    { from: 'United States', to: 'EU', volume: 880, keyGoods: ['Machinery', 'Pharmaceuticals', 'Vehicles', 'Chemicals'] },
    { from: 'United States', to: 'Mexico', volume: 780, keyGoods: ['Auto Parts', 'Electronics', 'Petroleum', 'Machinery'] },
    { from: 'China', to: 'EU', volume: 720, keyGoods: ['Electronics', 'Machinery', 'Textiles', 'Solar Panels'] },
    { from: 'China', to: 'Japan', volume: 380, keyGoods: ['Electronics', 'Machinery', 'Chemicals', 'Textiles'] },
    { from: 'China', to: 'ASEAN', volume: 520, keyGoods: ['Electronics', 'Machinery', 'Steel', 'Textiles'] },
    { from: 'United States', to: 'Canada', volume: 760, keyGoods: ['Vehicles', 'Machinery', 'Petroleum', 'Plastics'] },
    { from: 'EU', to: 'United Kingdom', volume: 590, keyGoods: ['Vehicles', 'Machinery', 'Pharmaceuticals', 'Chemicals'] },
    { from: 'Japan', to: 'United States', volume: 250, keyGoods: ['Vehicles', 'Machinery', 'Semiconductors', 'Optical Equipment'] },
    { from: 'India', to: 'UAE', volume: 85, keyGoods: ['Petroleum Products', 'Gems & Jewelry', 'Machinery', 'Rice'] },
    { from: 'Germany', to: 'China', volume: 130, keyGoods: ['Vehicles', 'Machinery', 'Chemicals', 'Optical Equipment'] },
    { from: 'South Korea', to: 'China', volume: 180, keyGoods: ['Semiconductors', 'Displays', 'Petrochemicals', 'Machinery'] },
  ];

  const tradeLanes = laneConfigs.map(l => {
    const volume = jitter(rng, l.volume, 0.05);
    const yoyChange = Math.round((rng() * 18 - 6) * 100) / 100;
    return {
      from: l.from,
      to: l.to,
      volume,
      yoyChange,
      keyGoods: l.keyGoods,
    };
  });

  // ── Commodity Trade ──

  const commodityConfigs: {
    name: string;
    globalVolume: number;
    topExporter: string;
    topImporter: string;
    priceIndexBase: number;
  }[] = [
    { name: 'Crude Oil', globalVolume: 2200, topExporter: 'Saudi Arabia', topImporter: 'China', priceIndexBase: 78 },
    { name: 'Natural Gas', globalVolume: 480, topExporter: 'United States', topImporter: 'EU', priceIndexBase: 3.2 },
    { name: 'Iron Ore', globalVolume: 190, topExporter: 'Australia', topImporter: 'China', priceIndexBase: 108 },
    { name: 'Copper', globalVolume: 85, topExporter: 'Chile', topImporter: 'China', priceIndexBase: 9200 },
    { name: 'Semiconductors', globalVolume: 620, topExporter: 'Taiwan', topImporter: 'China', priceIndexBase: 112 },
    { name: 'Agriculture', globalVolume: 340, topExporter: 'United States', topImporter: 'China', priceIndexBase: 95 },
  ];

  const commodityTrade = commodityConfigs.map(c => {
    const globalVolume = jitter(rng, c.globalVolume, 0.05);
    const priceIndex = Math.round(jitter(rng, c.priceIndexBase, 0.08) * 100) / 100;
    const yoyVolumeChange = Math.round((rng() * 14 - 4) * 100) / 100;
    return {
      name: c.name,
      globalVolume,
      topExporter: c.topExporter,
      topImporter: c.topImporter,
      priceIndex,
      yoyVolumeChange,
    };
  });

  // ── Tariff Data ──

  const tariffConfigs: {
    country: string;
    mfnRate: number;
    appliedRate: number;
    trendOptions: ('rising' | 'falling' | 'stable')[];
  }[] = [
    { country: 'United States', mfnRate: 3.4, appliedRate: 6.5, trendOptions: ['rising', 'rising', 'stable'] },
    { country: 'EU', mfnRate: 5.1, appliedRate: 4.2, trendOptions: ['stable', 'stable', 'falling'] },
    { country: 'China', mfnRate: 7.5, appliedRate: 8.8, trendOptions: ['rising', 'stable', 'rising'] },
    { country: 'Japan', mfnRate: 4.0, appliedRate: 2.5, trendOptions: ['stable', 'falling', 'stable'] },
    { country: 'India', mfnRate: 17.1, appliedRate: 13.8, trendOptions: ['stable', 'rising', 'stable'] },
    { country: 'Brazil', mfnRate: 11.2, appliedRate: 8.0, trendOptions: ['falling', 'stable', 'stable'] },
  ];

  const tariffData = tariffConfigs.map(t => {
    const mfnRate = Math.round(jitter(rng, t.mfnRate, 0.03) * 10) / 10;
    const appliedRate = Math.round(jitter(rng, t.appliedRate, 0.04) * 10) / 10;
    const tariffTrend = pick(rng, t.trendOptions);
    return {
      country: t.country,
      mfnRate,
      appliedRate,
      tariffTrend,
    };
  });

  // ── Trade Disruptions (5-8 current events) ──

  const allDisruptions: {
    description: string;
    affectedRoutes: string[];
    impactEstimate: string;
    status: string;
  }[] = [
    {
      description: 'US-China semiconductor export controls restricting advanced chip shipments',
      affectedRoutes: ['US-China', 'Taiwan-China', 'South Korea-China'],
      impactEstimate: '$45B annual trade at risk',
      status: 'Ongoing',
    },
    {
      description: 'Red Sea shipping disruptions due to Houthi attacks on commercial vessels',
      affectedRoutes: ['Asia-Europe', 'Middle East-Europe', 'India-Europe'],
      impactEstimate: '15-20% increase in shipping costs on affected routes',
      status: 'Escalating',
    },
    {
      description: 'EU Carbon Border Adjustment Mechanism (CBAM) implementation',
      affectedRoutes: ['China-EU', 'India-EU', 'Turkey-EU'],
      impactEstimate: '$3.5B in additional compliance costs annually',
      status: 'Phasing in',
    },
    {
      description: 'Panama Canal drought restrictions reducing daily vessel transits',
      affectedRoutes: ['US East Coast-Asia', 'South America-Asia', 'US-South America'],
      impactEstimate: '30-40% reduction in canal throughput capacity',
      status: 'Ongoing',
    },
    {
      description: 'Russian energy sanctions and rerouting of global LNG flows',
      affectedRoutes: ['Russia-EU', 'US-EU (LNG)', 'Middle East-EU'],
      impactEstimate: '$28B in rerouted energy trade',
      status: 'Ongoing',
    },
    {
      description: 'US Section 301 tariffs on Chinese EVs, batteries, and solar cells',
      affectedRoutes: ['China-US', 'China-Mexico (transshipment)', 'China-ASEAN-US'],
      impactEstimate: '$18B in affected goods',
      status: 'Active',
    },
    {
      description: 'India restricting laptop and tablet imports requiring licenses',
      affectedRoutes: ['China-India', 'Taiwan-India', 'Vietnam-India'],
      impactEstimate: '$8B in electronics trade affected',
      status: 'Under review',
    },
    {
      description: 'Black Sea grain corridor uncertainty affecting agricultural exports',
      affectedRoutes: ['Ukraine-Middle East', 'Ukraine-Africa', 'Russia-Asia'],
      impactEstimate: '$12B in annual grain trade at risk',
      status: 'Volatile',
    },
    {
      description: 'EU-US dispute over steel and aluminum tariffs under Global Arrangement',
      affectedRoutes: ['EU-US', 'US-EU'],
      impactEstimate: '$10B in metals trade affected',
      status: 'Negotiating',
    },
    {
      description: 'Japan tightening semiconductor equipment exports to China',
      affectedRoutes: ['Japan-China', 'Netherlands-China'],
      impactEstimate: '$7B in equipment trade restricted',
      status: 'Implemented',
    },
  ];

  // Select 5-8 disruptions deterministically via Fisher-Yates shuffle
  const disruptionCount = 5 + Math.floor(rng() * 4);
  const shuffled = [...allDisruptions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const tradeDisruptions = shuffled.slice(0, disruptionCount);

  // ── Global Summary ──

  const worldTradeVolume = Math.round(jitter(rng, 32.4, 0.03) * 10) / 10;
  const yoyGrowth = Math.round((rng() * 6 - 1) * 100) / 100;
  const tradeToGDP = Math.round(jitter(rng, 58.2, 0.02) * 10) / 10;
  const containerThroughput = Math.round(jitter(rng, 920, 0.03) * 10) / 10;

  const globalSummary = {
    worldTradeVolume,
    yoyGrowth,
    tradeToGDP,
    containerThroughput,
  };

  return {
    timestamp: new Date().toISOString(),
    topExporters,
    tradeLanes,
    commodityTrade,
    tariffData,
    tradeDisruptions,
    globalSummary,
  };
}

// ── Route handler ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }

    const data = generateTradeData();

    cacheData = data;
    cacheTime = now;

    res.json(data);
  } catch (err: unknown) {
    console.error('[GlobalTradeFlow] Error:', (err as Error)?.message);

    // Stale cache fallback
    if (cacheData) {
      res.json(cacheData);
      return;
    }

    res.status(500).json({ error: 'Failed to generate global trade flow data' });
  }
});

export default router;
