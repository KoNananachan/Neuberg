import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; return h >>> 0; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Helpers --

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// -- Interfaces --

interface SpotPrice {
  name: string;
  symbol: string;
  category: 'battery-metal' | 'rare-earth';
  price: number;
  unit: string;
  exchange: string;
  dailyChangePct: number;
  thirtyDayChangePct: number;
  ytdChangePct: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

interface SupplyChainEntry {
  country: string;
  primaryMetal: string;
  productionVolumeTonnes: number;
  globalSharePct: number;
  reservesTonnes: number;
  recentDisruption: string;
}

interface DemandForecastQuarter {
  quarter: string;
  china: number;
  europe: number;
  northAmerica: number;
  restOfWorld: number;
  totalGWh: number;
}

interface MineProject {
  project: string;
  company: string;
  location: string;
  metal: string;
  stage: 'feasibility' | 'construction' | 'commissioning' | 'permitting' | 'production-ramp';
  expectedOutputTonnes: number;
  timeline: string;
}

interface IndexMonthlyValue {
  month: string;
  value: number;
}

interface PriceIndex {
  name: string;
  currentValue: number;
  dailyChangePct: number;
  ytdChangePct: number;
  monthlyValues: IndexMonthlyValue[];
}

interface MarketOverview {
  totalBatteryMetalsMarketBillions: number;
  evBatteryDemandGrowthYoYPct: number;
  lithiumPriceIndexLevel: number;
  supplyDeficitSurplus: { metal: string; balanceTonnes: number; status: 'deficit' | 'surplus' }[];
}

interface RareEarthBatteryMetalsResponse {
  marketOverview: MarketOverview;
  spotPrices: SpotPrice[];
  supplyChainMonitor: SupplyChainEntry[];
  evBatteryDemandForecast: DemandForecastQuarter[];
  mineProjectPipeline: MineProject[];
  priceIndices: PriceIndex[];
  generatedAt: string;
}

// -- Seed Data --

interface SpotSeed {
  name: string;
  symbol: string;
  category: 'battery-metal' | 'rare-earth';
  basePrice: number;
  unit: string;
  exchange: string;
}

const SPOT_SEEDS: SpotSeed[] = [
  // Battery metals
  { name: 'Lithium Carbonate (99.5% Battery Grade)', symbol: 'Li2CO3', category: 'battery-metal', basePrice: 12000, unit: '$/tonne', exchange: 'Shanghai Metals Market' },
  { name: 'Lithium Hydroxide (56.5% LiOH·H2O)', symbol: 'LiOH', category: 'battery-metal', basePrice: 13500, unit: '$/tonne', exchange: 'Fastmarkets' },
  { name: 'Cobalt (LME)', symbol: 'Co', category: 'battery-metal', basePrice: 28000, unit: '$/tonne', exchange: 'LME' },
  { name: 'Nickel (LME)', symbol: 'Ni', category: 'battery-metal', basePrice: 16200, unit: '$/tonne', exchange: 'LME' },
  { name: 'Manganese (99.7% Electrolytic)', symbol: 'Mn', category: 'battery-metal', basePrice: 1950, unit: '$/tonne', exchange: 'CRU / Metal Bulletin' },
  { name: 'Natural Flake Graphite (-100 mesh, 94% C)', symbol: 'C(f)', category: 'battery-metal', basePrice: 680, unit: '$/tonne', exchange: 'Fastmarkets' },
  { name: 'Synthetic Graphite (Battery Anode Grade)', symbol: 'C(s)', category: 'battery-metal', basePrice: 8500, unit: '$/tonne', exchange: 'Asian Metal' },
  // Rare earths
  { name: 'Neodymium Oxide (99.5%)', symbol: 'Nd2O3', category: 'rare-earth', basePrice: 72, unit: '$/kg', exchange: 'Shanghai Metals Market' },
  { name: 'Praseodymium Oxide (99.5%)', symbol: 'Pr6O11', category: 'rare-earth', basePrice: 68, unit: '$/kg', exchange: 'Shanghai Metals Market' },
  { name: 'NdPr Oxide (75/25 Blend)', symbol: 'NdPr', category: 'rare-earth', basePrice: 75, unit: '$/kg', exchange: 'Asian Metal' },
  { name: 'Dysprosium Oxide (99.5%)', symbol: 'Dy2O3', category: 'rare-earth', basePrice: 290, unit: '$/kg', exchange: 'Shanghai Metals Market' },
  { name: 'Terbium Oxide (99.99%)', symbol: 'Tb4O7', category: 'rare-earth', basePrice: 1050, unit: '$/kg', exchange: 'Asian Metal' },
  { name: 'Lanthanum Oxide (99.5%)', symbol: 'La2O3', category: 'rare-earth', basePrice: 1.8, unit: '$/kg', exchange: 'Shanghai Metals Market' },
  { name: 'Cerium Oxide (99.5%)', symbol: 'CeO2', category: 'rare-earth', basePrice: 1.5, unit: '$/kg', exchange: 'Shanghai Metals Market' },
  { name: 'Samarium Oxide (99.9%)', symbol: 'Sm2O3', category: 'rare-earth', basePrice: 3.2, unit: '$/kg', exchange: 'Asian Metal' },
  { name: 'Europium Oxide (99.99%)', symbol: 'Eu2O3', category: 'rare-earth', basePrice: 32, unit: '$/kg', exchange: 'Asian Metal' },
  { name: 'Gadolinium Oxide (99.99%)', symbol: 'Gd2O3', category: 'rare-earth', basePrice: 28, unit: '$/kg', exchange: 'Asian Metal' },
];

const SUPPLY_CHAIN_SEEDS = [
  { country: 'China', primaryMetal: 'Rare Earth Elements (processing)', baseProd: 240000, globalShare: 60, baseReserves: 44000000, disruption: 'Export permit requirements tightened on NdPr and Dy oxides; 2-month processing delays reported' },
  { country: 'Australia', primaryMetal: 'Lithium (spodumene)', baseProd: 86000, globalShare: 47, baseReserves: 6200000, disruption: 'Greenbushes mine expansion delayed 6 months due to environmental review; Pilbara output steady' },
  { country: 'DR Congo', primaryMetal: 'Cobalt', baseProd: 130000, globalShare: 73, baseReserves: 3500000, disruption: 'Artisanal mining ban in Lualaba province; Katanga industrial output unaffected' },
  { country: 'Indonesia', primaryMetal: 'Nickel (Class 2 / NPI)', baseProd: 1800000, globalShare: 49, baseReserves: 21000000, disruption: 'Ore export ban extended; HPAL plants at 78% utilization on mixed feed quality' },
  { country: 'Chile', primaryMetal: 'Lithium (brine)', baseProd: 44000, globalShare: 24, baseReserves: 9300000, disruption: 'SQM-Codelco JV finalized; new quota system adds uncertainty to 2027 output targets' },
  { country: 'Philippines', primaryMetal: 'Nickel (laterite ore)', baseProd: 330000, globalShare: 10, baseReserves: 4800000, disruption: 'Surigao del Norte seasonal shipping disruptions; ore stockpiles building at port' },
  { country: 'Myanmar', primaryMetal: 'Heavy Rare Earths (ion adsorption)', baseProd: 38000, globalShare: 12, baseReserves: 780000, disruption: 'Border crossing closures with China intermittent; smuggling routes shifting supply to grey market' },
  { country: 'Brazil', primaryMetal: 'Niobium', baseProd: 71000, globalShare: 88, baseReserves: 16000000, disruption: 'CBMM stable output; new Serra Dourada mine on track for 2027 first production' },
];

const MINE_PROJECT_SEEDS: MineProject[] = [
  { project: 'Thacker Pass', company: 'Lithium Americas', location: 'Nevada, USA', metal: 'Lithium', stage: 'construction', expectedOutputTonnes: 40000, timeline: 'Phase 1 production H2 2027' },
  { project: 'Winu', company: 'Rio Tinto', location: 'Western Australia', metal: 'Cobalt / Copper', stage: 'feasibility', expectedOutputTonnes: 5000, timeline: 'Final investment decision 2027' },
  { project: 'Nolans', company: 'Arafura Rare Earths', location: 'Northern Territory, Australia', metal: 'NdPr Oxide', stage: 'construction', expectedOutputTonnes: 4400, timeline: 'First concentrate H1 2027' },
  { project: 'Ramu Expansion', company: 'MCC / Highlands Pacific', location: 'Papua New Guinea', metal: 'Nickel / Cobalt', stage: 'commissioning', expectedOutputTonnes: 8200, timeline: 'Full capacity Q3 2026' },
  { project: 'Grota do Cirilo', company: 'Sigma Lithium', location: 'Minas Gerais, Brazil', metal: 'Lithium', stage: 'production-ramp', expectedOutputTonnes: 37000, timeline: 'Phase 3 ramp through 2026' },
  { project: 'Browns Range', company: 'Northern Minerals', location: 'Western Australia', metal: 'Dysprosium / Terbium', stage: 'permitting', expectedOutputTonnes: 650, timeline: 'Construction start pending approvals mid 2027' },
];

// -- Data Generation --

function generate(): RareEarthBatteryMetalsResponse {
  const rng = seededRandom('rare-earth-battery-metals');

  // -- Market Overview --
  const totalBatteryMetalsMarketBillions = roundTo(jitter(rng, 48, 0.08), 1);
  const evBatteryDemandGrowthYoYPct = roundTo(jitter(rng, 26, 0.15), 1);
  const lithiumPriceIndexLevel = roundTo(jitter(rng, 82, 0.1), 1);

  const supplyDeficitSurplus = [
    { metal: 'Lithium', balanceTonnes: roundTo(jitter(rng, -18000, 0.3), 0), status: 'deficit' as const },
    { metal: 'Cobalt', balanceTonnes: roundTo(jitter(rng, 12000, 0.3), 0), status: 'surplus' as const },
    { metal: 'Nickel (Class 1)', balanceTonnes: roundTo(jitter(rng, -35000, 0.25), 0), status: 'deficit' as const },
    { metal: 'NdPr Oxide', balanceTonnes: roundTo(jitter(rng, -4200, 0.2), 0), status: 'deficit' as const },
    { metal: 'Dysprosium', balanceTonnes: roundTo(jitter(rng, -320, 0.25), 0), status: 'deficit' as const },
    { metal: 'Graphite (anode)', balanceTonnes: roundTo(jitter(rng, 45000, 0.3), 0), status: 'surplus' as const },
  ];

  const marketOverview: MarketOverview = {
    totalBatteryMetalsMarketBillions,
    evBatteryDemandGrowthYoYPct,
    lithiumPriceIndexLevel,
    supplyDeficitSurplus,
  };

  // -- Spot Prices --
  const spotPrices: SpotPrice[] = SPOT_SEEDS.map(s => {
    const decimals = s.basePrice >= 1000 ? 0 : s.basePrice >= 10 ? 2 : 2;
    const price = roundTo(jitter(rng, s.basePrice, 0.12), decimals);
    const dailyChangePct = roundTo((rng() - 0.48) * 5, 2);
    const thirtyDayChangePct = roundTo((rng() - 0.45) * 18, 2);
    const ytdChangePct = roundTo((rng() - 0.42) * 40, 2);
    const fiftyTwoWeekHigh = roundTo(price * (1 + rng() * 0.3 + 0.05), decimals);
    const fiftyTwoWeekLow = roundTo(price * (1 - rng() * 0.3 - 0.05), decimals);

    return {
      name: s.name,
      symbol: s.symbol,
      category: s.category,
      price,
      unit: s.unit,
      exchange: s.exchange,
      dailyChangePct,
      thirtyDayChangePct,
      ytdChangePct,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
    };
  });

  // -- Supply Chain Monitor --
  const supplyChainMonitor: SupplyChainEntry[] = SUPPLY_CHAIN_SEEDS.map(s => ({
    country: s.country,
    primaryMetal: s.primaryMetal,
    productionVolumeTonnes: roundTo(jitter(rng, s.baseProd, 0.08), 0),
    globalSharePct: roundTo(jitter(rng, s.globalShare, 0.05), 1),
    reservesTonnes: roundTo(jitter(rng, s.baseReserves, 0.03), 0),
    recentDisruption: s.disruption,
  }));

  // -- EV Battery Demand Forecast --
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();

  const evBatteryDemandForecast: DemandForecastQuarter[] = [];
  for (let i = 0; i < 4; i++) {
    let q = currentQuarter + i;
    let y = currentYear;
    while (q > 4) { q -= 4; y += 1; }

    const seasonalFactor = q === 4 ? 1.15 : q === 1 ? 0.88 : q === 2 ? 0.95 : 1.02;
    const growthFactor = 1 + i * 0.04;

    const china = roundTo(jitter(rng, 165 * seasonalFactor * growthFactor, 0.06), 1);
    const europe = roundTo(jitter(rng, 72 * seasonalFactor * growthFactor, 0.08), 1);
    const northAmerica = roundTo(jitter(rng, 55 * seasonalFactor * growthFactor, 0.08), 1);
    const restOfWorld = roundTo(jitter(rng, 38 * seasonalFactor * growthFactor, 0.10), 1);

    evBatteryDemandForecast.push({
      quarter: `Q${q} ${y}`,
      china,
      europe,
      northAmerica,
      restOfWorld,
      totalGWh: roundTo(china + europe + northAmerica + restOfWorld, 1),
    });
  }

  // -- Mine/Project Pipeline --
  const mineProjectPipeline: MineProject[] = MINE_PROJECT_SEEDS.map(p => ({
    ...p,
    expectedOutputTonnes: roundTo(jitter(rng, p.expectedOutputTonnes, 0.05), 0),
  }));

  // -- Price Indices --
  const today = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }

  function buildIndex(name: string, baseLevel: number, annualDriftPct: number): PriceIndex {
    const monthlyValues: IndexMonthlyValue[] = [];
    let level = baseLevel * (1 - annualDriftPct / 100 * 0.5);
    for (const month of months) {
      const monthlyMove = (rng() - 0.47) * baseLevel * 0.04;
      level = roundTo(level + monthlyMove, 2);
      monthlyValues.push({ month, value: level });
    }
    const currentValue = monthlyValues[monthlyValues.length - 1].value;
    const dailyChangePct = roundTo((rng() - 0.48) * 3, 2);
    const startValue = monthlyValues[0].value;
    const ytdChangePct = roundTo(((currentValue - startValue) / startValue) * 100, 2);

    return { name, currentValue, dailyChangePct, ytdChangePct, monthlyValues };
  }

  const priceIndices: PriceIndex[] = [
    buildIndex('Battery Metals Composite Index', 100, -8),
    buildIndex('China Rare Earth Price Index (Baotou)', 215, 5),
    buildIndex('LME Battery Metals Index', 1850, -4),
  ];

  return {
    marketOverview,
    spotPrices,
    supplyChainMonitor,
    evBatteryDemandForecast,
    mineProjectPipeline,
    priceIndices,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: RareEarthBatteryMetalsResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60_000;

// -- Route --

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
    console.error('[RareEarthBatteryMetals] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate rare earth & battery metals data' });
  }
});

export default router;
