import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

const MARKETS_CONFIG = [
  { market: 'EU ETS', currency: 'EUR', basePrice: 77, low: 70, high: 85, baseVolume: 38, baseOI: 95 },
  { market: 'RGGI', currency: 'USD', basePrice: 15.5, low: 13, high: 18, baseVolume: 4.8, baseOI: 12 },
  { market: 'California CCA', currency: 'USD', basePrice: 35, low: 30, high: 40, baseVolume: 11, baseOI: 28 },
  { market: 'UK ETS', currency: 'GBP', basePrice: 45, low: 38, high: 55, baseVolume: 7.2, baseOI: 18 },
  { market: 'South Korea', currency: 'KRW', basePrice: 14500, low: 12000, high: 18000, baseVolume: 3.2, baseOI: 8.5 },
];

const FUTURES_TENORS = ['Spot', 'Dec24', 'Dec25', 'Dec26', 'Dec27', 'Dec28'];

const AUCTION_MARKETS = ['EU ETS', 'RGGI', 'California CCA', 'UK ETS'];

const OFFSET_TYPES_CONFIG = [
  { type: 'VCS', basePrice: 9.5, low: 5, high: 15, baseVolume: 180, avgProject: 'forestry' },
  { type: 'Gold Standard', basePrice: 17, low: 10, high: 25, baseVolume: 95, avgProject: 'renewable' },
  { type: 'CDM', basePrice: 3.2, low: 1.5, high: 6, baseVolume: 45, avgProject: 'methane' },
  { type: 'ACCU', basePrice: 28, low: 20, high: 38, baseVolume: 22, avgProject: 'forestry' },
  { type: 'JCM', basePrice: 12, low: 8, high: 18, baseVolume: 8, avgProject: 'renewable' },
  { type: 'REDD+', basePrice: 11, low: 6, high: 18, baseVolume: 65, avgProject: 'forestry' },
];

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-emissions-trading'));
  const year = new Date().getFullYear();

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const jitter = (low: number, high: number) => low + rng() * (high - low);
  const pctChange = (magnitude: number) => round2((rng() - 0.48) * magnitude);

  // --- markets ---
  const markets = MARKETS_CONFIG.map(m => {
    const price = round2(jitter(m.low, m.high));
    const change1d = pctChange(3);
    const change1w = pctChange(5);
    const change1m = pctChange(10);
    const volume = round1(m.baseVolume * (0.75 + rng() * 0.5));
    const openInterest = round1(m.baseOI * (0.8 + rng() * 0.4));
    return {
      market: m.market,
      price,
      currency: m.currency,
      change1d,
      change1w,
      change1m,
      volume,
      openInterest,
      vintage: year,
    };
  });

  // --- summary ---
  const euMarket = markets.find(m => m.market === 'EU ETS')!;
  const rggiMarket = markets.find(m => m.market === 'RGGI')!;
  const ccaMarket = markets.find(m => m.market === 'California CCA')!;
  const globalVolume = round1(markets.reduce((s, m) => s + m.volume, 0));
  const avgChange1w = round2(markets.reduce((s, m) => s + m.change1w, 0) / markets.length);

  const summary = {
    euEtsPrice: euMarket.price,
    rggiPrice: rggiMarket.price,
    ccaPrice: ccaMarket.price,
    globalVolume,
    avgChange1w,
  };

  // --- futures (EU ETS forward curve) ---
  const spotPrice = euMarket.price;
  const futures = FUTURES_TENORS.map((tenor, i) => {
    const carryPerYear = 1.5 + rng() * 2.5;
    const yearsOut = i * 0.9;
    const spread = i === 0 ? 0 : round2(yearsOut * (carryPerYear + (rng() - 0.4) * 1.2));
    const price = i === 0 ? spotPrice : round2(spotPrice + spread);
    const change1d = pctChange(2.5);
    const impliedCarry = i === 0 ? 0 : round2((spread / spotPrice / yearsOut) * 100);
    return {
      tenor,
      price,
      change1d,
      spreadToSpot: spread,
      impliedCarry,
    };
  });

  // --- auctions (4 recent) ---
  const auctions = AUCTION_MARKETS.map((market, i) => {
    const daysAgo = 3 + Math.floor(rng() * 25) + i * 7;
    const auctionDate = new Date();
    auctionDate.setDate(auctionDate.getDate() - daysAgo);

    let clearingBase: number;
    if (market === 'EU ETS') clearingBase = euMarket.price;
    else if (market === 'RGGI') clearingBase = rggiMarket.price;
    else if (market === 'California CCA') clearingBase = ccaMarket.price;
    else clearingBase = markets.find(m => m.market === market)?.price ?? 40;

    const clearingPrice = round2(clearingBase * (0.97 + rng() * 0.06));
    const coverRatio = round2(1.5 + rng() * 2.5);
    const volume = round1(2 + rng() * 18);
    const participants = Math.floor(20 + rng() * 40);
    const changeVsPrev = pctChange(8);

    return {
      market,
      auctionDate: auctionDate.toISOString().slice(0, 10),
      clearingPrice,
      coverRatio,
      volume,
      participants,
      changeVsPrev,
    };
  });

  // --- offsetCredits ---
  const offsetCredits = OFFSET_TYPES_CONFIG.map(o => {
    const price = round2(jitter(o.low, o.high));
    const change1m = pctChange(12);
    const volume = round1(o.baseVolume * (0.7 + rng() * 0.6));
    return {
      type: o.type,
      price,
      change1m,
      volume,
      avgProject: o.avgProject,
    };
  });

  return {
    summary,
    markets,
    futures,
    auctions,
    offsetCredits,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EmissionsTrading] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate emissions trading data' });
  }
});

export default router;
