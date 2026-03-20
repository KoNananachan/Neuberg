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

interface SpotMarketConfig {
  market: string;
  basePrice: number;
  volatility: number;
  peakMultiplier: number;
  offPeakMultiplier: number;
  currency: string;
  loadBase: number;
  peakLoadBase: number;
  forecastLoadBase: number;
  reserveMarginBase: number;
  genMix: { nuclear: number; gas: number; coal: number; wind: number; solar: number; hydro: number; other: number };
}

const SPOT_MARKETS: SpotMarketConfig[] = [
  {
    market: 'PJM', basePrice: 42, volatility: 0.15, peakMultiplier: 1.45, offPeakMultiplier: 0.72, currency: 'USD',
    loadBase: 145, peakLoadBase: 158, forecastLoadBase: 148, reserveMarginBase: 22.5,
    genMix: { nuclear: 32, gas: 38, coal: 14, wind: 5, solar: 3, hydro: 4, other: 4 },
  },
  {
    market: 'ERCOT', basePrice: 48, volatility: 0.35, peakMultiplier: 1.65, offPeakMultiplier: 0.55, currency: 'USD',
    loadBase: 52, peakLoadBase: 62, forecastLoadBase: 54, reserveMarginBase: 15.8,
    genMix: { nuclear: 10, gas: 48, coal: 12, wind: 18, solar: 6, hydro: 1, other: 5 },
  },
  {
    market: 'CAISO', basePrice: 52, volatility: 0.20, peakMultiplier: 1.50, offPeakMultiplier: 0.68, currency: 'USD',
    loadBase: 32, peakLoadBase: 38, forecastLoadBase: 33, reserveMarginBase: 18.2,
    genMix: { nuclear: 8, gas: 42, coal: 0, wind: 8, solar: 22, hydro: 12, other: 8 },
  },
  {
    market: 'NYISO', basePrice: 45, volatility: 0.18, peakMultiplier: 1.55, offPeakMultiplier: 0.70, currency: 'USD',
    loadBase: 30, peakLoadBase: 34, forecastLoadBase: 31, reserveMarginBase: 20.5,
    genMix: { nuclear: 28, gas: 40, coal: 1, wind: 6, solar: 4, hydro: 16, other: 5 },
  },
  {
    market: 'SPP', basePrice: 30, volatility: 0.20, peakMultiplier: 1.38, offPeakMultiplier: 0.76, currency: 'USD',
    loadBase: 42, peakLoadBase: 48, forecastLoadBase: 43, reserveMarginBase: 25.0,
    genMix: { nuclear: 5, gas: 35, coal: 18, wind: 32, solar: 3, hydro: 3, other: 4 },
  },
  {
    market: 'MISO', basePrice: 35, volatility: 0.16, peakMultiplier: 1.40, offPeakMultiplier: 0.74, currency: 'USD',
    loadBase: 100, peakLoadBase: 112, forecastLoadBase: 103, reserveMarginBase: 19.0,
    genMix: { nuclear: 12, gas: 32, coal: 25, wind: 18, solar: 4, hydro: 4, other: 5 },
  },
  {
    market: 'NordPool', basePrice: 38, volatility: 0.22, peakMultiplier: 1.35, offPeakMultiplier: 0.70, currency: 'EUR',
    loadBase: 55, peakLoadBase: 62, forecastLoadBase: 57, reserveMarginBase: 28.0,
    genMix: { nuclear: 22, gas: 8, coal: 2, wind: 20, solar: 2, hydro: 40, other: 6 },
  },
  {
    market: 'EPEX Germany', basePrice: 55, volatility: 0.25, peakMultiplier: 1.42, offPeakMultiplier: 0.65, currency: 'EUR',
    loadBase: 65, peakLoadBase: 72, forecastLoadBase: 67, reserveMarginBase: 16.5,
    genMix: { nuclear: 0, gas: 15, coal: 22, wind: 28, solar: 14, hydro: 4, other: 17 },
  },
  {
    market: 'EPEX France', basePrice: 45, volatility: 0.20, peakMultiplier: 1.40, offPeakMultiplier: 0.72, currency: 'EUR',
    loadBase: 58, peakLoadBase: 64, forecastLoadBase: 60, reserveMarginBase: 20.0,
    genMix: { nuclear: 65, gas: 7, coal: 1, wind: 10, solar: 5, hydro: 8, other: 4 },
  },
  {
    market: 'AEMO Australia', basePrice: 60, volatility: 0.30, peakMultiplier: 1.55, offPeakMultiplier: 0.60, currency: 'AUD',
    loadBase: 28, peakLoadBase: 33, forecastLoadBase: 29, reserveMarginBase: 14.0,
    genMix: { nuclear: 0, gas: 18, coal: 40, wind: 16, solar: 18, hydro: 5, other: 3 },
  },
];

const FORWARD_CURVE_MARKETS = ['PJM', 'ERCOT', 'NordPool'];

interface CarbonMarketConfig {
  name: string;
  basePrice: number;
  currency: string;
  ytdBase: number;
}

const CARBON_MARKETS: CarbonMarketConfig[] = [
  { name: 'EU ETS', basePrice: 72, currency: 'EUR', ytdBase: 8.5 },
  { name: 'RGGI', basePrice: 15, currency: 'USD', ytdBase: 4.2 },
  { name: 'California CCA', basePrice: 34, currency: 'USD', ytdBase: 6.8 },
  { name: 'UK ETS', basePrice: 48, currency: 'GBP', ytdBase: 5.1 },
];

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day));

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // Seasonal factor: summer/winter peaks
  const month = now.getMonth();
  const seasonFactor = 1 + 0.12 * Math.cos(((month - 7) / 12) * 2 * Math.PI);

  // --- spotPrices ---
  const spotPrices = SPOT_MARKETS.map(m => {
    const price = round2(jitter(m.basePrice * seasonFactor, m.volatility));
    const change = round2((rng() - 0.5) * price * 0.08);
    const dayAheadPrice = round2(price * (1 + (rng() - 0.5) * 0.04));
    const peakPrice = round2(price * m.peakMultiplier * (1 + (rng() - 0.5) * 0.06));
    const offPeakPrice = round2(price * m.offPeakMultiplier * (1 + (rng() - 0.5) * 0.06));
    return {
      market: m.market,
      price,
      change,
      dayAheadPrice,
      peakPrice,
      offPeakPrice,
      currency: m.currency,
    };
  });

  // --- generationMix ---
  const generationMix = SPOT_MARKETS.map(m => {
    const raw = {
      nuclear: round1(jitter(m.genMix.nuclear, 0.05)),
      gas: round1(jitter(m.genMix.gas, 0.05)),
      coal: round1(jitter(m.genMix.coal, 0.05)),
      wind: round1(jitter(m.genMix.wind, 0.10)),
      solar: round1(jitter(m.genMix.solar, 0.10)),
      hydro: round1(jitter(m.genMix.hydro, 0.08)),
      other: round1(jitter(m.genMix.other, 0.08)),
    };
    // Normalize to ~100%
    const total = raw.nuclear + raw.gas + raw.coal + raw.wind + raw.solar + raw.hydro + raw.other;
    const scale = 100 / total;
    return {
      market: m.market,
      nuclear: round1(raw.nuclear * scale),
      gas: round1(raw.gas * scale),
      coal: round1(raw.coal * scale),
      wind: round1(raw.wind * scale),
      solar: round1(raw.solar * scale),
      hydro: round1(raw.hydro * scale),
      other: round1(raw.other * scale),
    };
  });

  // --- gridLoad ---
  const gridLoad = SPOT_MARKETS.map(m => {
    const currentLoad = round1(jitter(m.loadBase * seasonFactor, 0.08));
    const peakLoad = round1(jitter(m.peakLoadBase * seasonFactor, 0.06));
    const forecastLoad = round1(jitter(m.forecastLoadBase * seasonFactor, 0.07));
    const reserveMargin = round1(jitter(m.reserveMarginBase, 0.12));
    let status: 'normal' | 'tight' | 'emergency' = 'normal';
    if (reserveMargin < 10) status = 'emergency';
    else if (reserveMargin < 15) status = 'tight';
    return {
      market: m.market,
      currentLoad,
      peakLoad,
      forecastLoad,
      reserveMargin,
      status,
    };
  });

  // --- forwardCurves ---
  const forwardCurves = FORWARD_CURVE_MARKETS.map(marketName => {
    const config = SPOT_MARKETS.find(m => m.market === marketName)!;
    const baseSpot = config.basePrice * seasonFactor;
    const months: { month: string; price: number }[] = [];
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = futureDate.toISOString().slice(0, 7);
      // Slight contango with seasonal adjustments
      const futureMonth = futureDate.getMonth();
      const futureSeason = 1 + 0.12 * Math.cos(((futureMonth - 7) / 12) * 2 * Math.PI);
      const price = round2(jitter(baseSpot * futureSeason * (1 + i * 0.008), 0.06));
      months.push({ month: label, price });
    }
    return { market: marketName, currency: config.currency, months };
  });

  // --- carbonPrices ---
  const carbonPrices = CARBON_MARKETS.map(c => {
    const price = round2(jitter(c.basePrice, 0.10));
    const change = round2((rng() - 0.5) * price * 0.06);
    const ytdReturn = round2(jitter(c.ytdBase, 0.30));
    return {
      market: c.name,
      price,
      change,
      ytdReturn,
      currency: c.currency,
    };
  });

  // --- renewableOutput ---
  const totalSolarGW = round1(jitter(180, 0.10));
  const totalWindGW = round1(jitter(220, 0.12));
  const renewableOutput = {
    solar: {
      totalGW: totalSolarGW,
      curtailment: round1(jitter(3.5, 0.25)),
      capacityFactor: round1(jitter(22, 0.08)),
    },
    wind: {
      totalGW: totalWindGW,
      curtailment: round1(jitter(2.8, 0.25)),
      capacityFactor: round1(jitter(35, 0.08)),
    },
  };

  return {
    spotPrices,
    generationMix,
    gridLoad,
    forwardCurves,
    carbonPrices,
    renewableOutput,
    generatedAt: now.toISOString(),
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
    console.error('[ElectricityMarket] Error:', message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate electricity market data' });
  }
});

export default router;
