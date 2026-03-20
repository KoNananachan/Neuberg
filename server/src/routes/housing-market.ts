import { Router, Request, Response } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Types --

interface HomePrice {
  index: string;
  value: number;
  yoyChange: number;
  momChange: number;
  trend: 'rising' | 'falling' | 'stable';
}

interface MortgageRate {
  type: string;
  rate: number;
  priorWeek: number;
  change: number;
  spreadTo10Y: number;
}

interface HousingActivity {
  metric: string;
  value: number;
  change: number;
  unit: string;
  period: string;
}

interface InventorySupply {
  market: string;
  monthsOfSupply: number;
  activeListings: number;
  newListings: number;
  medianPrice: number;
  medianDom: number;
}

interface HomebuilderStock {
  ticker: string;
  price: number;
  change: number;
  pe: number;
  marketCap: number;
}

interface AffordabilityIndex {
  region: string;
  index: number;
  medianIncome: number;
  medianPayment: number;
  paymentToIncome: number;
  change: number;
}

interface HousingMarketData {
  homePrices: HomePrice[];
  mortgageRates: MortgageRate[];
  housingActivity: HousingActivity[];
  inventorySupply: InventorySupply[];
  homebuilderStocks: HomebuilderStock[];
  affordabilityIndex: AffordabilityIndex[];
  generatedAt: string;
}

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: HousingMarketData; ts: number } | null = null;

// -- Helpers --

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

// -- Data generation --

function generate(): HousingMarketData {
  const rng = seededRandom('housing-market');

  // 1. Home Prices
  const priceConfigs: { index: string; valueBase: number; valueSpread: number; yoyBase: number; yoySpread: number }[] = [
    { index: 'Case-Shiller 20-City', valueBase: 315, valueSpread: 5,  yoyBase: 5.0, yoySpread: 2.0 },
    { index: 'FHFA',                 valueBase: 425, valueSpread: 5,  yoyBase: 5.5, yoySpread: 1.5 },
    { index: 'Zillow',               valueBase: 310, valueSpread: 8,  yoyBase: 4.5, yoySpread: 2.5 },
    { index: 'CoreLogic',            valueBase: 318, valueSpread: 6,  yoyBase: 5.2, yoySpread: 1.8 },
  ];

  const homePrices: HomePrice[] = priceConfigs.map(cfg => {
    const value = round1(cfg.valueBase + (rng() - 0.5) * 2 * cfg.valueSpread);
    const yoyChange = round1(cfg.yoyBase + (rng() - 0.5) * 2 * cfg.yoySpread);
    const momChange = round2((rng() - 0.3) * 1.5);
    let trend: 'rising' | 'falling' | 'stable';
    if (yoyChange > 4.0) trend = 'rising';
    else if (yoyChange < 2.0) trend = 'falling';
    else trend = 'stable';
    return { index: cfg.index, value, yoyChange, momChange, trend };
  });

  // 2. Mortgage Rates
  const mortgageConfigs: { type: string; rateBase: number; rateSpread: number; spreadBase: number }[] = [
    { type: '30Y Fixed', rateBase: 6.85, rateSpread: 0.35, spreadBase: 2.60 },
    { type: '15Y Fixed', rateBase: 6.15, rateSpread: 0.35, spreadBase: 1.90 },
    { type: '5/1 ARM',   rateBase: 6.00, rateSpread: 0.50, spreadBase: 1.75 },
    { type: 'FHA 30Y',   rateBase: 6.50, rateSpread: 0.30, spreadBase: 2.25 },
    { type: 'VA 30Y',    rateBase: 6.30, rateSpread: 0.30, spreadBase: 2.05 },
    { type: 'Jumbo 30Y', rateBase: 7.00, rateSpread: 0.20, spreadBase: 2.75 },
  ];

  const mortgageRates: MortgageRate[] = mortgageConfigs.map(cfg => {
    const rate = round2(cfg.rateBase + (rng() - 0.5) * 2 * cfg.rateSpread);
    const change = round2((rng() - 0.5) * 0.20);
    const priorWeek = round2(rate - change);
    const spreadTo10Y = round2(cfg.spreadBase + (rng() - 0.5) * 0.30);
    return { type: cfg.type, rate, priorWeek, change, spreadTo10Y };
  });

  // 3. Housing Activity
  const activityConfigs: { metric: string; valueBase: number; valueSpread: number; unit: string; period: string }[] = [
    { metric: 'Housing Starts',      valueBase: 1400, valueSpread: 100, unit: 'thousands', period: 'SAAR' },
    { metric: 'Building Permits',    valueBase: 1500, valueSpread: 100, unit: 'thousands', period: 'SAAR' },
    { metric: 'New Home Sales',      valueBase: 700,  valueSpread: 50,  unit: 'thousands', period: 'SAAR' },
    { metric: 'Existing Home Sales', valueBase: 4250, valueSpread: 250, unit: 'thousands', period: 'SAAR' },
    { metric: 'Pending Home Sales',  valueBase: 78,   valueSpread: 8,   unit: 'index',     period: 'MoM'  },
  ];

  const housingActivity: HousingActivity[] = activityConfigs.map(cfg => {
    const value = Math.round(cfg.valueBase + (rng() - 0.5) * 2 * cfg.valueSpread);
    const change = round1((rng() - 0.5) * 10);
    return { metric: cfg.metric, value, change, unit: cfg.unit, period: cfg.period };
  });

  // 4. Inventory & Supply
  const inventoryConfigs: { market: string; supplyBase: number; supplySpread: number; listingsBase: number; listingsSpread: number; newListBase: number; newListSpread: number; priceBase: number; priceSpread: number; domBase: number; domSpread: number }[] = [
    { market: 'National', supplyBase: 3.5, supplySpread: 0.5, listingsBase: 740000,  listingsSpread: 60000,  newListBase: 320000, newListSpread: 30000, priceBase: 420000,  priceSpread: 15000, domBase: 42, domSpread: 8 },
    { market: 'NYC',      supplyBase: 6.0, supplySpread: 1.0, listingsBase: 52000,   listingsSpread: 5000,   newListBase: 14000,  newListSpread: 2000,  priceBase: 780000,  priceSpread: 40000, domBase: 65, domSpread: 12 },
    { market: 'LA',       supplyBase: 3.0, supplySpread: 0.5, listingsBase: 28000,   listingsSpread: 3000,   newListBase: 9500,   newListSpread: 1500,  priceBase: 950000,  priceSpread: 50000, domBase: 38, domSpread: 8 },
    { market: 'Chicago',  supplyBase: 3.8, supplySpread: 0.6, listingsBase: 22000,   listingsSpread: 3000,   newListBase: 8000,   newListSpread: 1200,  priceBase: 340000,  priceSpread: 20000, domBase: 45, domSpread: 10 },
    { market: 'Dallas',   supplyBase: 4.2, supplySpread: 0.6, listingsBase: 30000,   listingsSpread: 4000,   newListBase: 11000,  newListSpread: 1500,  priceBase: 410000,  priceSpread: 25000, domBase: 48, domSpread: 10 },
    { market: 'Miami',    supplyBase: 5.5, supplySpread: 0.8, listingsBase: 35000,   listingsSpread: 4000,   newListBase: 12000,  newListSpread: 2000,  priceBase: 580000,  priceSpread: 35000, domBase: 55, domSpread: 12 },
  ];

  const inventorySupply: InventorySupply[] = inventoryConfigs.map(cfg => {
    const monthsOfSupply = round1(cfg.supplyBase + (rng() - 0.5) * 2 * cfg.supplySpread);
    const activeListings = Math.round(cfg.listingsBase + (rng() - 0.5) * 2 * cfg.listingsSpread);
    const newListings = Math.round(cfg.newListBase + (rng() - 0.5) * 2 * cfg.newListSpread);
    const medianPrice = Math.round(cfg.priceBase + (rng() - 0.5) * 2 * cfg.priceSpread);
    const medianDom = Math.round(cfg.domBase + (rng() - 0.5) * 2 * cfg.domSpread);
    return { market: cfg.market, monthsOfSupply, activeListings, newListings, medianPrice, medianDom };
  });

  // 5. Homebuilder Stocks
  const builderConfigs: { ticker: string; priceBase: number; priceSpread: number; peBase: number; peSpread: number; capBase: number; capSpread: number }[] = [
    { ticker: 'DHI',  priceBase: 155, priceSpread: 15, peBase: 11.5, peSpread: 1.5, capBase: 50,  capSpread: 5  },
    { ticker: 'LEN',  priceBase: 165, priceSpread: 15, peBase: 10.5, peSpread: 1.5, capBase: 48,  capSpread: 5  },
    { ticker: 'NVR',  priceBase: 7500, priceSpread: 500, peBase: 18.0, peSpread: 2.0, capBase: 25, capSpread: 3  },
    { ticker: 'PHM',  priceBase: 120, priceSpread: 12, peBase: 9.5,  peSpread: 1.0, capBase: 27,  capSpread: 3  },
    { ticker: 'TOL',  priceBase: 110, priceSpread: 10, peBase: 10.0, peSpread: 1.5, capBase: 12,  capSpread: 2  },
    { ticker: 'KBH',  priceBase: 72,  priceSpread: 8,  peBase: 9.0,  peSpread: 1.0, capBase: 5.5, capSpread: 0.8 },
    { ticker: 'MDC',  priceBase: 58,  priceSpread: 6,  peBase: 8.5,  peSpread: 1.0, capBase: 4.0, capSpread: 0.5 },
    { ticker: 'TMHC', priceBase: 52,  priceSpread: 6,  peBase: 8.0,  peSpread: 1.0, capBase: 3.5, capSpread: 0.5 },
  ];

  const homebuilderStocks: HomebuilderStock[] = builderConfigs.map(cfg => {
    const price = round2(cfg.priceBase + (rng() - 0.5) * 2 * cfg.priceSpread);
    const change = round2((rng() - 0.5) * 4);
    const pe = round1(cfg.peBase + (rng() - 0.5) * 2 * cfg.peSpread);
    const marketCap = round1(cfg.capBase + (rng() - 0.5) * 2 * cfg.capSpread);
    return { ticker: cfg.ticker, price, change, pe, marketCap };
  });

  // 6. Affordability Index
  const affordConfigs: { region: string; indexBase: number; indexSpread: number; incomeBase: number; incomeSpread: number; paymentBase: number; paymentSpread: number; ptiBase: number; ptiSpread: number }[] = [
    { region: 'National',  indexBase: 95,  indexSpread: 8,  incomeBase: 78000,  incomeSpread: 3000, paymentBase: 2400, paymentSpread: 200, ptiBase: 37, ptiSpread: 3 },
    { region: 'Northeast', indexBase: 80,  indexSpread: 8,  incomeBase: 85000,  incomeSpread: 4000, paymentBase: 3100, paymentSpread: 300, ptiBase: 44, ptiSpread: 4 },
    { region: 'Midwest',   indexBase: 130, indexSpread: 10, incomeBase: 72000,  incomeSpread: 3000, paymentBase: 1700, paymentSpread: 150, ptiBase: 28, ptiSpread: 3 },
    { region: 'South',     indexBase: 105, indexSpread: 8,  incomeBase: 74000,  incomeSpread: 3000, paymentBase: 2100, paymentSpread: 200, ptiBase: 34, ptiSpread: 3 },
    { region: 'West',      indexBase: 65,  indexSpread: 8,  incomeBase: 88000,  incomeSpread: 5000, paymentBase: 3500, paymentSpread: 350, ptiBase: 48, ptiSpread: 4 },
    { region: 'San Fran',  indexBase: 45,  indexSpread: 6,  incomeBase: 125000, incomeSpread: 8000, paymentBase: 5800, paymentSpread: 500, ptiBase: 56, ptiSpread: 5 },
    { region: 'NYC Metro', indexBase: 55,  indexSpread: 6,  incomeBase: 95000,  incomeSpread: 5000, paymentBase: 4200, paymentSpread: 400, ptiBase: 53, ptiSpread: 4 },
    { region: 'Miami',     indexBase: 70,  indexSpread: 8,  incomeBase: 68000,  incomeSpread: 3000, paymentBase: 3200, paymentSpread: 300, ptiBase: 56, ptiSpread: 5 },
  ];

  const affordabilityIndex: AffordabilityIndex[] = affordConfigs.map(cfg => {
    const index = Math.round(cfg.indexBase + (rng() - 0.5) * 2 * cfg.indexSpread);
    const medianIncome = Math.round(cfg.incomeBase + (rng() - 0.5) * 2 * cfg.incomeSpread);
    const medianPayment = Math.round(cfg.paymentBase + (rng() - 0.5) * 2 * cfg.paymentSpread);
    const paymentToIncome = round1(cfg.ptiBase + (rng() - 0.5) * 2 * cfg.ptiSpread);
    const change = round1((rng() - 0.5) * 6);
    return { region: cfg.region, index, medianIncome, medianPayment, paymentToIncome, change };
  });

  return {
    homePrices,
    mortgageRates,
    housingActivity,
    inventorySupply,
    homebuilderStocks,
    affordabilityIndex,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[HousingMarket] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate housing market data' });
  }
});

export default router;
