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

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// -- Interfaces --

interface MarketOverview {
  totalAlternativeAssetMarketTrillions: number;
  auctionMarketTurnoverYTDBillions: number;
  topPerformingCategory: string;
  knightFrankLuxuryInvestmentIndex: number;
  knightFrankIndexBase: string;
}

interface AssetCategory {
  category: string;
  indexName: string;
  indexLevel: number;
  ytdReturnPct: number;
  oneYearReturnPct: number;
  fiveYearReturnPct: number;
  tenYearAnnualizedPct: number;
  volatilityPct: number;
  sharpeRatio: number;
  correlationToSP500: number;
}

interface AuctionResult {
  item: string;
  auctionHouse: string;
  salePriceMillions: number;
  estimateLowMillions: number;
  estimateHighMillions: number;
  hammerRatio: number;
  date: string;
  category: string;
}

interface WineMarketEntry {
  name: string;
  vintage: number;
  region: string;
  score: number;
  scoreSource: string;
  pricePerCase: number;
  twelveMonthChangePct: number;
  marketDepth: 'deep' | 'moderate' | 'thin';
}

interface WatchMarketEntry {
  brand: string;
  model: string;
  reference: string;
  retailPrice: number;
  marketPrice: number;
  premiumDiscountPct: number;
  trend: 'rising' | 'stable' | 'declining';
}

interface MarketSentiment {
  auctionSellThroughRatePct: number;
  averageLotPremiumPct: number;
  genZMillennialBuyerSharePct: number;
  onlineVsInPersonSplitOnlinePct: number;
}

interface LuxuryCollectiblesResponse {
  marketOverview: MarketOverview;
  assetCategories: AssetCategory[];
  recentAuctionResults: AuctionResult[];
  wineMarket: WineMarketEntry[];
  watchMarket: WatchMarketEntry[];
  marketSentiment: MarketSentiment;
  generatedAt: string;
}

// -- Seed Data --

const ASSET_CATEGORY_SEEDS = [
  { category: 'Fine Art', indexName: 'Artnet Fine Art Index', baseLevel: 320, baseYtd: 5.2, base1Y: 7.8, base5Y: 42, base10YAnn: 7.0, baseVol: 12.5, baseSharpe: 0.45, baseCorr: 0.15 },
  { category: 'Fine Wine', indexName: 'Liv-ex 1000', baseLevel: 410, baseYtd: 3.8, base1Y: 6.2, base5Y: 48, base10YAnn: 8.0, baseVol: 8.2, baseSharpe: 0.72, baseCorr: 0.12 },
  { category: 'Classic Cars', indexName: 'HAGI Top Index', baseLevel: 580, baseYtd: 4.5, base1Y: 8.5, base5Y: 55, base10YAnn: 9.0, baseVol: 14.0, baseSharpe: 0.52, baseCorr: 0.08 },
  { category: 'Watches', indexName: 'WatchCharts Overall Market Index', baseLevel: 245, baseYtd: -2.1, base1Y: 1.8, base5Y: 32, base10YAnn: 5.0, baseVol: 18.5, baseSharpe: 0.22, baseCorr: 0.20 },
  { category: 'Rare Whisky', indexName: 'RW Apex 1000', baseLevel: 720, baseYtd: 8.5, base1Y: 14.2, base5Y: 78, base10YAnn: 12.0, baseVol: 10.8, baseSharpe: 0.88, baseCorr: 0.05 },
  { category: 'Colored Diamonds', indexName: 'Fancy Color Research Foundation Index', baseLevel: 155, baseYtd: 1.2, base1Y: 2.8, base5Y: 18, base10YAnn: 3.0, baseVol: 6.5, baseSharpe: 0.28, baseCorr: 0.10 },
  { category: 'Handbags', indexName: 'Hermes Birkin Index (Rebag Clair)', baseLevel: 390, baseYtd: 6.8, base1Y: 10.5, base5Y: 62, base10YAnn: 10.2, baseVol: 11.0, baseSharpe: 0.75, baseCorr: 0.18 },
  { category: 'Rare Coins', indexName: 'PCGS3000 Index', baseLevel: 210, baseYtd: 2.5, base1Y: 4.8, base5Y: 28, base10YAnn: 5.5, baseVol: 9.8, baseSharpe: 0.40, baseCorr: 0.07 },
  { category: 'Stamps', indexName: 'Stanley Gibbons GB30 Index', baseLevel: 132, baseYtd: -1.5, base1Y: 0.5, base5Y: 8, base10YAnn: 2.2, baseVol: 7.0, baseSharpe: 0.12, baseCorr: 0.03 },
  { category: 'Jewelry', indexName: 'Knight Frank Jewelry Index', baseLevel: 185, baseYtd: 3.2, base1Y: 5.5, base5Y: 35, base10YAnn: 6.0, baseVol: 8.5, baseSharpe: 0.52, baseCorr: 0.14 },
];

const AUCTION_RESULT_SEEDS = [
  { item: 'Pablo Picasso, "Femme assise pres d\'une fenetre" (1932)', house: "Christie's", basePrice: 103.4, estLow: 55, estHigh: 80, category: 'Fine Art' },
  { item: '1962 Ferrari 250 GTO, chassis #3851GT', house: "RM Sotheby's", basePrice: 51.7, estLow: 45, estHigh: 50, category: 'Classic Cars' },
  { item: 'Patek Philippe Grandmaster Chime Ref. 6300A-010', house: "Christie's", basePrice: 31.2, estLow: 15, estHigh: 25, category: 'Watches' },
  { item: 'The Macallan 1926, 60-Year-Old, Peter Blake Label', house: "Sotheby's", basePrice: 2.7, estLow: 1.2, estHigh: 2.0, category: 'Rare Whisky' },
  { item: 'The Spirit of the Rose, 14.83ct Fancy Vivid Purple-Pink Diamond', house: "Sotheby's", basePrice: 26.6, estLow: 23, estHigh: 28, category: 'Colored Diamonds' },
  { item: 'Hermes Himalaya Niloticus Crocodile Birkin 30 with 18K Gold & Diamond Hardware', house: "Christie's", basePrice: 0.45, estLow: 0.25, estHigh: 0.35, category: 'Handbags' },
  { item: '1794 Flowing Hair Silver Dollar, SP-66 (PCGS)', house: 'Heritage Auctions', basePrice: 12.0, estLow: 8, estHigh: 10, category: 'Rare Coins' },
  { item: 'Jean-Michel Basquiat, "Untitled" (1982), Skull', house: "Sotheby's", basePrice: 85.0, estLow: 60, estHigh: 75, category: 'Fine Art' },
];

const WINE_SEEDS = [
  { name: 'Domaine de la Romanee-Conti, Romanee-Conti Grand Cru', vintage: 2019, region: 'Burgundy', baseScore: 99, scoreSource: 'Wine Advocate', basePrice: 28500, base12mChange: 6.2, depth: 'thin' as const },
  { name: 'Petrus, Pomerol', vintage: 2018, region: 'Bordeaux', baseScore: 100, scoreSource: 'Robert Parker', basePrice: 4200, base12mChange: 4.8, depth: 'moderate' as const },
  { name: 'Chateau Lafite Rothschild, Pauillac 1er Cru Classe', vintage: 2020, region: 'Bordeaux', baseScore: 98, scoreSource: 'Wine Advocate', basePrice: 5800, base12mChange: -2.1, depth: 'deep' as const },
  { name: 'Screaming Eagle, Cabernet Sauvignon, Napa Valley', vintage: 2021, region: 'Napa Valley', baseScore: 100, scoreSource: 'Robert Parker', basePrice: 8500, base12mChange: 8.5, depth: 'thin' as const },
  { name: 'Tenuta San Guido, Sassicaia, Bolgheri', vintage: 2019, region: 'Tuscany', baseScore: 97, scoreSource: 'Wine Spectator', basePrice: 2800, base12mChange: 3.2, depth: 'deep' as const },
  { name: 'Penfolds Grange, South Australia', vintage: 2018, region: 'South Australia', baseScore: 99, scoreSource: 'Wine Advocate', basePrice: 850, base12mChange: 5.5, depth: 'moderate' as const },
  { name: 'Opus One, Napa Valley', vintage: 2020, region: 'Napa Valley', baseScore: 97, scoreSource: 'James Suckling', basePrice: 4800, base12mChange: 1.8, depth: 'deep' as const },
  { name: 'Dom Perignon, Brut, Champagne', vintage: 2013, region: 'Champagne', baseScore: 96, scoreSource: 'Wine Spectator', basePrice: 2200, base12mChange: -0.5, depth: 'deep' as const },
];

const WATCH_SEEDS = [
  { brand: 'Rolex', model: 'Cosmograph Daytona', reference: '126500LN', retailPrice: 15100, baseMarket: 32500, baseTrend: 'stable' as const },
  { brand: 'Patek Philippe', model: 'Nautilus', reference: '5711/1A-010', retailPrice: 35300, baseMarket: 128000, baseTrend: 'declining' as const },
  { brand: 'Audemars Piguet', model: 'Royal Oak "Jumbo"', reference: '16202ST.OO.1240ST.01', retailPrice: 38900, baseMarket: 72000, baseTrend: 'stable' as const },
  { brand: 'Omega', model: 'Speedmaster Moonwatch Professional', reference: '310.30.42.50.01.002', retailPrice: 6600, baseMarket: 5800, baseTrend: 'stable' as const },
  { brand: 'Richard Mille', model: 'RM 11-03 Automatic Flyback Chronograph', reference: 'RM11-03', retailPrice: 220000, baseMarket: 185000, baseTrend: 'declining' as const },
  { brand: 'F.P. Journe', model: 'Chronometre Bleu', reference: 'CB', retailPrice: 42000, baseMarket: 68000, baseTrend: 'rising' as const },
  { brand: 'Vacheron Constantin', model: 'Overseas Automatic', reference: '4500V/110A-B483', retailPrice: 27200, baseMarket: 35000, baseTrend: 'rising' as const },
  { brand: 'Cartier', model: 'Santos de Cartier Medium', reference: 'WSSA0029', retailPrice: 8050, baseMarket: 7600, baseTrend: 'stable' as const },
];

const AUCTION_HOUSES = ["Christie's", "Sotheby's", "Phillips", "Bonhams", "RM Sotheby's"];

const TOP_PERFORMING_POOL = [
  'Rare Whisky',
  'Handbags',
  'Classic Cars',
  'Fine Art',
  'Fine Wine',
];

// -- Data Generation --

function generate(): LuxuryCollectiblesResponse {
  const rng = seededRandom('luxury-collectibles-index');

  // -- Market Overview --
  const topCategory = pick(rng, TOP_PERFORMING_POOL);
  const knfIndex = roundTo(jitter(rng, 580, 0.04), 0);
  const marketOverview: MarketOverview = {
    totalAlternativeAssetMarketTrillions: roundTo(jitter(rng, 2.15, 0.06), 2),
    auctionMarketTurnoverYTDBillions: roundTo(jitter(rng, 28.5, 0.1), 1),
    topPerformingCategory: topCategory,
    knightFrankLuxuryInvestmentIndex: knfIndex,
    knightFrankIndexBase: 'Base 100 (Q4 2004)',
  };

  // -- Asset Categories --
  const assetCategories: AssetCategory[] = ASSET_CATEGORY_SEEDS.map(ac => {
    const indexLevel = roundTo(jitter(rng, ac.baseLevel, 0.05), 1);
    const ytd = roundTo(jitter(rng, ac.baseYtd, 0.2), 1);
    const oneY = roundTo(jitter(rng, ac.base1Y, 0.15), 1);
    const fiveY = roundTo(jitter(rng, ac.base5Y, 0.12), 1);
    const tenYAnn = roundTo(jitter(rng, ac.base10YAnn, 0.1), 1);
    const vol = roundTo(jitter(rng, ac.baseVol, 0.1), 1);
    const sharpe = roundTo(jitter(rng, ac.baseSharpe, 0.15), 2);
    const corr = roundTo(jitter(rng, ac.baseCorr, 0.2), 2);
    return {
      category: ac.category,
      indexName: ac.indexName,
      indexLevel,
      ytdReturnPct: ytd,
      oneYearReturnPct: oneY,
      fiveYearReturnPct: fiveY,
      tenYearAnnualizedPct: tenYAnn,
      volatilityPct: vol,
      sharpeRatio: sharpe,
      correlationToSP500: corr,
    };
  });

  // -- Recent Auction Results --
  const recentAuctionResults: AuctionResult[] = AUCTION_RESULT_SEEDS.map(ar => {
    const salePrice = roundTo(jitter(rng, ar.basePrice, 0.08), 2);
    const estLow = roundTo(jitter(rng, ar.estLow, 0.05), 2);
    const estHigh = roundTo(jitter(rng, ar.estHigh, 0.05), 2);
    const hammerRatio = roundTo(salePrice / estHigh, 2);
    const daysAgo = Math.floor(rng() * 180) + 5;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      item: ar.item,
      auctionHouse: ar.house,
      salePriceMillions: salePrice,
      estimateLowMillions: estLow,
      estimateHighMillions: estHigh,
      hammerRatio,
      date: date.toISOString().slice(0, 10),
      category: ar.category,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // -- Wine Market --
  const wineMarket: WineMarketEntry[] = WINE_SEEDS.map(w => {
    const pricePerCase = Math.round(jitter(rng, w.basePrice, 0.08));
    const change12m = roundTo(jitter(rng, Math.abs(w.base12mChange), 0.2) * (w.base12mChange < 0 ? -1 : 1), 1);
    return {
      name: w.name,
      vintage: w.vintage,
      region: w.region,
      score: w.baseScore,
      scoreSource: w.scoreSource,
      pricePerCase,
      twelveMonthChangePct: change12m,
      marketDepth: w.depth,
    };
  });

  // -- Watch Market --
  const watchMarket: WatchMarketEntry[] = WATCH_SEEDS.map(ws => {
    const marketPrice = Math.round(jitter(rng, ws.baseMarket, 0.08));
    const premDisc = roundTo(((marketPrice - ws.retailPrice) / ws.retailPrice) * 100, 1);
    const trendRoll = rng();
    let trend: 'rising' | 'stable' | 'declining';
    if (ws.baseTrend === 'rising') {
      trend = trendRoll < 0.7 ? 'rising' : trendRoll < 0.9 ? 'stable' : 'declining';
    } else if (ws.baseTrend === 'declining') {
      trend = trendRoll < 0.7 ? 'declining' : trendRoll < 0.9 ? 'stable' : 'rising';
    } else {
      trend = trendRoll < 0.6 ? 'stable' : trendRoll < 0.8 ? 'rising' : 'declining';
    }
    return {
      brand: ws.brand,
      model: ws.model,
      reference: ws.reference,
      retailPrice: ws.retailPrice,
      marketPrice,
      premiumDiscountPct: premDisc,
      trend,
    };
  });

  // -- Market Sentiment --
  const marketSentiment: MarketSentiment = {
    auctionSellThroughRatePct: roundTo(jitter(rng, 78, 0.06), 1),
    averageLotPremiumPct: roundTo(jitter(rng, 15.5, 0.15), 1),
    genZMillennialBuyerSharePct: roundTo(jitter(rng, 38, 0.08), 1),
    onlineVsInPersonSplitOnlinePct: roundTo(jitter(rng, 32, 0.1), 1),
  };

  return {
    marketOverview,
    assetCategories,
    recentAuctionResults,
    wineMarket,
    watchMarket,
    marketSentiment,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: LuxuryCollectiblesResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60_000;

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
    console.error('[LuxuryCollectiblesIndex] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate luxury collectibles index data' });
  }
});

export default router;
