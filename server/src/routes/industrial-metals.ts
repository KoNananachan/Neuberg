import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// -- Helpers --

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function rangeVal(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

// -- Interfaces --

interface MetalSpot {
  metal: string;
  symbol: string;
  unit: string;
  spotPrice: number;
  bid: number;
  ask: number;
  threeMonthForward: number;
  fifteenMonthForward: number;
  dailyChange: number;
  dailyChangePct: number;
  weekChange: number;
  weekChangePct: number;
  monthChange: number;
  monthChangePct: number;
  ytdChange: number;
  ytdChangePct: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  cashToThreeMonthSpread: number;
  cashToThreeMonthBasis: 'CONTANGO' | 'BACKWARDATION';
  lmeWarehouseStocks: number;
  stockChange: number;
  cancelledWarrantsPct: number;
  openInterest: number;
  volume: number;
  productionConsumptionBalance: number;
}

interface RegionalPremium {
  metal: string;
  usMidwest: number;
  euRotterdam: number;
  japanCif: number;
  chinaShanghaiPremium: number;
}

interface ScrapSpread {
  name: string;
  metal: string;
  scrapPrice: number;
  lmeReference: number;
  discount: number;
  discountPct: number;
}

interface ForwardCurvePoint {
  tenor: string;
  price: number;
}

interface MetalForwardCurve {
  metal: string;
  curve: ForwardCurvePoint[];
  structure: 'CONTANGO' | 'BACKWARDATION';
}

interface TcRc {
  concentrate: string;
  metal: string;
  treatmentCharge: number;
  treatmentChargeUnit: string;
  refiningCharge: number;
  refiningChargeUnit: string;
  benchmark: number;
  spotVsBenchmark: number;
}

interface ShfeWarehouse {
  metal: string;
  stocks: number;
  weeklyChange: number;
  monthlyChange: number;
}

interface LmeWarehouseQueue {
  location: string;
  queueDays: number;
  dominantMetal: string;
  stocksTonnes: number;
}

// -- Seed Data --

interface MetalSeed {
  metal: string;
  symbol: string;
  unit: string;
  spotBase: number;
  spreadBps: number;
  threeMonthPremiumPct: number;
  fifteenMonthPremiumPct: number;
  lmeStocksBase: number;
  openInterestBase: number;
  volumeBase: number;
  ytdReturnBase: number;
  productionBalanceBase: number;
}

const METAL_SEEDS: MetalSeed[] = [
  {
    metal: 'Copper',
    symbol: 'HG',
    unit: '$/t',
    spotBase: 9000,
    spreadBps: 15,
    threeMonthPremiumPct: 0.35,
    fifteenMonthPremiumPct: 1.2,
    lmeStocksBase: 155000,
    openInterestBase: 320000,
    volumeBase: 18500,
    ytdReturnBase: 4.5,
    productionBalanceBase: -85000,
  },
  {
    metal: 'Aluminum',
    symbol: 'AL',
    unit: '$/t',
    spotBase: 2450,
    spreadBps: 20,
    threeMonthPremiumPct: 0.55,
    fifteenMonthPremiumPct: 1.8,
    lmeStocksBase: 520000,
    openInterestBase: 680000,
    volumeBase: 25000,
    ytdReturnBase: 2.1,
    productionBalanceBase: 120000,
  },
  {
    metal: 'Zinc',
    symbol: 'ZN',
    unit: '$/t',
    spotBase: 2650,
    spreadBps: 25,
    threeMonthPremiumPct: 0.40,
    fifteenMonthPremiumPct: 1.5,
    lmeStocksBase: 210000,
    openInterestBase: 240000,
    volumeBase: 11000,
    ytdReturnBase: -1.8,
    productionBalanceBase: 45000,
  },
  {
    metal: 'Nickel',
    symbol: 'NI',
    unit: '$/t',
    spotBase: 16200,
    spreadBps: 30,
    threeMonthPremiumPct: -0.25,
    fifteenMonthPremiumPct: -0.6,
    lmeStocksBase: 72000,
    openInterestBase: 195000,
    volumeBase: 8500,
    ytdReturnBase: -6.2,
    productionBalanceBase: 150000,
  },
  {
    metal: 'Tin',
    symbol: 'SN',
    unit: '$/t',
    spotBase: 25800,
    spreadBps: 35,
    threeMonthPremiumPct: -0.45,
    fifteenMonthPremiumPct: -1.0,
    lmeStocksBase: 4200,
    openInterestBase: 28000,
    volumeBase: 2800,
    ytdReturnBase: 8.3,
    productionBalanceBase: -12000,
  },
  {
    metal: 'Lead',
    symbol: 'PB',
    unit: '$/t',
    spotBase: 2080,
    spreadBps: 30,
    threeMonthPremiumPct: 0.30,
    fifteenMonthPremiumPct: 1.1,
    lmeStocksBase: 185000,
    openInterestBase: 145000,
    volumeBase: 5200,
    ytdReturnBase: -0.5,
    productionBalanceBase: 30000,
  },
  {
    metal: 'Iron Ore',
    symbol: 'FE',
    unit: '$/t',
    spotBase: 118,
    spreadBps: 50,
    threeMonthPremiumPct: -1.5,
    fifteenMonthPremiumPct: -4.0,
    lmeStocksBase: 0,
    openInterestBase: 850000,
    volumeBase: 95000,
    ytdReturnBase: -3.8,
    productionBalanceBase: 65000,
  },
  {
    metal: 'Steel (HRC)',
    symbol: 'HRC',
    unit: '$/t',
    spotBase: 680,
    spreadBps: 40,
    threeMonthPremiumPct: -0.8,
    fifteenMonthPremiumPct: -2.2,
    lmeStocksBase: 0,
    openInterestBase: 420000,
    volumeBase: 32000,
    ytdReturnBase: 1.2,
    productionBalanceBase: 95000,
  },
];

interface PremiumSeed {
  metal: string;
  usMidwestBase: number;
  euRotterdamBase: number;
  japanCifBase: number;
  chinaShanghaiBase: number;
}

const PREMIUM_SEEDS: PremiumSeed[] = [
  { metal: 'Copper',    usMidwestBase: 155, euRotterdamBase: 85,  japanCifBase: 95,  chinaShanghaiBase: 45 },
  { metal: 'Aluminum',  usMidwestBase: 420, euRotterdamBase: 260, japanCifBase: 145, chinaShanghaiBase: 25 },
  { metal: 'Zinc',      usMidwestBase: 180, euRotterdamBase: 140, japanCifBase: 110, chinaShanghaiBase: 35 },
  { metal: 'Nickel',    usMidwestBase: 350, euRotterdamBase: 280, japanCifBase: 220, chinaShanghaiBase: 80 },
  { metal: 'Tin',       usMidwestBase: 800, euRotterdamBase: 650, japanCifBase: 550, chinaShanghaiBase: 200 },
  { metal: 'Lead',      usMidwestBase: 120, euRotterdamBase: 75,  japanCifBase: 60,  chinaShanghaiBase: 20 },
];

interface ScrapSeed {
  name: string;
  metal: string;
  discountPctBase: number;
}

const SCRAP_SEEDS: ScrapSeed[] = [
  { name: 'No.1 Copper Scrap (Bare Bright)', metal: 'Copper',   discountPctBase: 4.5 },
  { name: 'No.2 Copper Scrap (Mixed)',        metal: 'Copper',   discountPctBase: 12.0 },
  { name: 'Aluminum Scrap (Twitch)',           metal: 'Aluminum', discountPctBase: 18.0 },
  { name: 'Aluminum Scrap (UBC)',              metal: 'Aluminum', discountPctBase: 28.0 },
];

const FORWARD_TENORS = ['Spot', '3M', '6M', '1Y', '15M', '2Y'];

interface ShfeSeed {
  metal: string;
  stocksBase: number;
}

const SHFE_SEEDS: ShfeSeed[] = [
  { metal: 'Copper',   stocksBase: 82000 },
  { metal: 'Aluminum', stocksBase: 245000 },
  { metal: 'Zinc',     stocksBase: 68000 },
  { metal: 'Nickel',   stocksBase: 25000 },
  { metal: 'Tin',      stocksBase: 6800 },
  { metal: 'Lead',     stocksBase: 42000 },
];

interface QueueSeed {
  location: string;
  dominantMetal: string;
  queueDaysBase: number;
  stocksBase: number;
}

const QUEUE_SEEDS: QueueSeed[] = [
  { location: 'Port Klang, Malaysia',  dominantMetal: 'Aluminum', queueDaysBase: 45,  stocksBase: 185000 },
  { location: 'Vlissingen, Netherlands', dominantMetal: 'Aluminum', queueDaysBase: 25,  stocksBase: 92000 },
  { location: 'Gwangyang, South Korea', dominantMetal: 'Zinc',     queueDaysBase: 12,  stocksBase: 55000 },
  { location: 'New Orleans, USA',       dominantMetal: 'Aluminum', queueDaysBase: 18,  stocksBase: 78000 },
  { location: 'Rotterdam, Netherlands', dominantMetal: 'Copper',   queueDaysBase: 8,   stocksBase: 42000 },
  { location: 'Busan, South Korea',     dominantMetal: 'Nickel',   queueDaysBase: 10,  stocksBase: 28000 },
  { location: 'Johor, Malaysia',        dominantMetal: 'Tin',      queueDaysBase: 6,   stocksBase: 3200 },
  { location: 'Singapore',              dominantMetal: 'Copper',   queueDaysBase: 5,   stocksBase: 18000 },
];

// -- Data Generation --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('industrial-metals-' + day));

  // 1. Metal spot prices & market data
  const metals: MetalSpot[] = METAL_SEEDS.map(s => {
    const spot = roundTo(jitter(rng, s.spotBase, 0.04), s.spotBase < 200 ? 2 : 0);
    const spreadAmount = roundTo(spot * s.spreadBps / 10000, s.spotBase < 200 ? 2 : 1);
    const bid = roundTo(spot - spreadAmount / 2, s.spotBase < 200 ? 2 : 1);
    const ask = roundTo(spot + spreadAmount / 2, s.spotBase < 200 ? 2 : 1);

    const threeMonthBase = spot * (1 + s.threeMonthPremiumPct / 100);
    const threeMonthForward = roundTo(jitter(rng, threeMonthBase, 0.005), s.spotBase < 200 ? 2 : 0);
    const fifteenMonthBase = spot * (1 + s.fifteenMonthPremiumPct / 100);
    const fifteenMonthForward = roundTo(jitter(rng, fifteenMonthBase, 0.008), s.spotBase < 200 ? 2 : 0);

    const dailyChange = roundTo((rng() - 0.48) * spot * 0.02, s.spotBase < 200 ? 2 : 0);
    const dailyChangePct = roundTo((dailyChange / (spot - dailyChange)) * 100, 2);

    const weekChange = roundTo((rng() - 0.47) * spot * 0.04, s.spotBase < 200 ? 2 : 0);
    const weekChangePct = roundTo((weekChange / (spot - weekChange)) * 100, 2);

    const monthChange = roundTo((rng() - 0.46) * spot * 0.08, s.spotBase < 200 ? 2 : 0);
    const monthChangePct = roundTo((monthChange / (spot - monthChange)) * 100, 2);

    const ytdChangePct = roundTo(jitter(rng, s.ytdReturnBase, 0.5), 2);
    const ytdChange = roundTo(spot * ytdChangePct / (100 + ytdChangePct), s.spotBase < 200 ? 2 : 0);

    const volatilityRange = spot * 0.18;
    const fiftyTwoWeekHigh = roundTo(spot + rng() * volatilityRange * 0.6 + volatilityRange * 0.05, s.spotBase < 200 ? 2 : 0);
    const fiftyTwoWeekLow = roundTo(spot - rng() * volatilityRange * 0.6 - volatilityRange * 0.05, s.spotBase < 200 ? 2 : 0);

    const cashToThreeMonthSpread = roundTo(spot - threeMonthForward, s.spotBase < 200 ? 2 : 0);
    const cashToThreeMonthBasis: 'CONTANGO' | 'BACKWARDATION' = cashToThreeMonthSpread < 0 ? 'CONTANGO' : 'BACKWARDATION';

    const lmeWarehouseStocks = s.lmeStocksBase > 0 ? roundTo(jitter(rng, s.lmeStocksBase, 0.12), 0) : 0;
    const stockChange = s.lmeStocksBase > 0 ? roundTo((rng() - 0.5) * s.lmeStocksBase * 0.02, 0) : 0;
    const cancelledWarrantsPct = s.lmeStocksBase > 0 ? roundTo(rangeVal(rng, 5, 45), 1) : 0;

    const openInterest = roundTo(jitter(rng, s.openInterestBase, 0.08), 0);
    const volume = roundTo(jitter(rng, s.volumeBase, 0.20), 0);

    const productionConsumptionBalance = roundTo(jitter(rng, s.productionBalanceBase, 0.3), 0);

    return {
      metal: s.metal,
      symbol: s.symbol,
      unit: s.unit,
      spotPrice: spot,
      bid,
      ask,
      threeMonthForward,
      fifteenMonthForward,
      dailyChange,
      dailyChangePct,
      weekChange,
      weekChangePct,
      monthChange,
      monthChangePct,
      ytdChange,
      ytdChangePct,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      cashToThreeMonthSpread,
      cashToThreeMonthBasis,
      lmeWarehouseStocks,
      stockChange,
      cancelledWarrantsPct,
      openInterest,
      volume,
      productionConsumptionBalance,
    };
  });

  // 2. Regional premiums
  const premiums: RegionalPremium[] = PREMIUM_SEEDS.map(p => ({
    metal: p.metal,
    usMidwest: roundTo(jitter(rng, p.usMidwestBase, 0.10), 1),
    euRotterdam: roundTo(jitter(rng, p.euRotterdamBase, 0.10), 1),
    japanCif: roundTo(jitter(rng, p.japanCifBase, 0.10), 1),
    chinaShanghaiPremium: roundTo(jitter(rng, p.chinaShanghaiBase, 0.15), 1),
  }));

  // 3. Scrap spreads
  const scrapSpreads: ScrapSpread[] = SCRAP_SEEDS.map(s => {
    const metalData = metals.find(m => m.metal === s.metal);
    const lmeRef = metalData ? metalData.spotPrice : s.metal === 'Copper' ? 9000 : 2450;
    const discountPct = roundTo(jitter(rng, s.discountPctBase, 0.15), 1);
    const discount = roundTo(lmeRef * discountPct / 100, 0);
    const scrapPrice = roundTo(lmeRef - discount, 0);
    return {
      name: s.name,
      metal: s.metal,
      scrapPrice,
      lmeReference: lmeRef,
      discount,
      discountPct,
    };
  });

  // 4. Forward curves
  const forwardCurves: MetalForwardCurve[] = METAL_SEEDS.map(s => {
    const metalData = metals.find(m => m.metal === s.metal);
    const spot = metalData ? metalData.spotPrice : s.spotBase;
    const threeM = metalData ? metalData.threeMonthForward : spot * (1 + s.threeMonthPremiumPct / 100);

    const isContango = threeM > spot;
    const drift = isContango ? 1 : -1;
    const annualRate = Math.abs(s.threeMonthPremiumPct) / 100 * 4;

    const points: ForwardCurvePoint[] = [
      { tenor: 'Spot', price: spot },
      { tenor: '3M', price: threeM },
      { tenor: '6M', price: roundTo(spot * (1 + drift * annualRate * 0.5 * jitter(rng, 1, 0.05)), s.spotBase < 200 ? 2 : 0) },
      { tenor: '1Y', price: roundTo(spot * (1 + drift * annualRate * 1.0 * jitter(rng, 1, 0.08)), s.spotBase < 200 ? 2 : 0) },
      { tenor: '15M', price: roundTo(spot * (1 + drift * annualRate * 1.25 * jitter(rng, 1, 0.10)), s.spotBase < 200 ? 2 : 0) },
      { tenor: '2Y', price: roundTo(spot * (1 + drift * annualRate * 2.0 * jitter(rng, 1, 0.12)), s.spotBase < 200 ? 2 : 0) },
    ];

    return {
      metal: s.metal,
      curve: points,
      structure: isContango ? 'CONTANGO' as const : 'BACKWARDATION' as const,
    };
  });

  // 5. TC/RC (treatment/refining charges)
  const tcRc: TcRc[] = [
    {
      concentrate: 'Copper Concentrate',
      metal: 'Copper',
      treatmentCharge: roundTo(jitter(rng, 80, 0.12), 1),
      treatmentChargeUnit: '$/dmt',
      refiningCharge: roundTo(jitter(rng, 8.0, 0.12), 2),
      refiningChargeUnit: 'c/lb',
      benchmark: roundTo(jitter(rng, 80, 0.05), 1),
      spotVsBenchmark: roundTo((rng() - 0.5) * 20, 1),
    },
    {
      concentrate: 'Zinc Concentrate',
      metal: 'Zinc',
      treatmentCharge: roundTo(jitter(rng, 230, 0.10), 0),
      treatmentChargeUnit: '$/dmt',
      refiningCharge: roundTo(jitter(rng, 0, 0), 2),
      refiningChargeUnit: 'N/A',
      benchmark: roundTo(jitter(rng, 230, 0.05), 0),
      spotVsBenchmark: roundTo((rng() - 0.5) * 30, 0),
    },
  ];

  // 6. SHFE warehouse stocks (Chinese inventory)
  const shfeWarehouse: ShfeWarehouse[] = SHFE_SEEDS.map(s => {
    const stocks = roundTo(jitter(rng, s.stocksBase, 0.15), 0);
    const weeklyChange = roundTo((rng() - 0.5) * s.stocksBase * 0.04, 0);
    const monthlyChange = roundTo((rng() - 0.48) * s.stocksBase * 0.10, 0);
    return {
      metal: s.metal,
      stocks,
      weeklyChange,
      monthlyChange,
    };
  });

  // 7. LME warehouse queue times
  const warehouseQueues: LmeWarehouseQueue[] = QUEUE_SEEDS.map(q => ({
    location: q.location,
    queueDays: roundTo(jitter(rng, q.queueDaysBase, 0.20), 0),
    dominantMetal: q.dominantMetal,
    stocksTonnes: roundTo(jitter(rng, q.stocksBase, 0.10), 0),
  }));

  return {
    metals,
    premiums,
    scrapSpreads,
    forwardCurves,
    tcRc,
    shfeWarehouse,
    warehouseQueues,
    timestamp: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    console.error('[IndustrialMetals] Error:', err instanceof Error ? err.message : String(err));
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate industrial metals data' });
  }
});

export default router;
