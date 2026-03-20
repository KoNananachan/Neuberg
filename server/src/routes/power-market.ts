import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// --- Market configurations ---

interface MarketConfig {
  market: string;
  region: 'US' | 'Europe';
  baseLMP: number;
  volatility: number;
  peakMultiplier: number;
  offPeakMultiplier: number;
  currency: string;
  loadBase: number;
  capacityBase: number;
  reserveMarginBase: number;
  congestionBase: number;
  lossBase: number;
  genMix: { coal: number; gas: number; nuclear: number; wind: number; solar: number; hydro: number; other: number };
  heatRateBase: number;
  renewablePenetrationBase: number;
}

const MARKETS: MarketConfig[] = [
  {
    market: 'PJM', region: 'US', baseLMP: 35, volatility: 0.15, peakMultiplier: 1.45, offPeakMultiplier: 0.72, currency: 'USD',
    loadBase: 145000, capacityBase: 185000, reserveMarginBase: 22.5, congestionBase: 4.2, lossBase: 1.1,
    genMix: { coal: 14, gas: 38, nuclear: 32, wind: 5, solar: 3, hydro: 4, other: 4 },
    heatRateBase: 7.8, renewablePenetrationBase: 12.0,
  },
  {
    market: 'ERCOT', region: 'US', baseLMP: 42, volatility: 0.35, peakMultiplier: 1.65, offPeakMultiplier: 0.55, currency: 'USD',
    loadBase: 52000, capacityBase: 78000, reserveMarginBase: 15.8, congestionBase: 6.8, lossBase: 1.5,
    genMix: { coal: 12, gas: 48, nuclear: 10, wind: 18, solar: 6, hydro: 1, other: 5 },
    heatRateBase: 8.2, renewablePenetrationBase: 25.0,
  },
  {
    market: 'CAISO', region: 'US', baseLMP: 48, volatility: 0.20, peakMultiplier: 1.50, offPeakMultiplier: 0.68, currency: 'USD',
    loadBase: 32000, capacityBase: 80000, reserveMarginBase: 18.2, congestionBase: 5.5, lossBase: 1.3,
    genMix: { coal: 0, gas: 42, nuclear: 8, wind: 8, solar: 22, hydro: 12, other: 8 },
    heatRateBase: 8.5, renewablePenetrationBase: 42.0,
  },
  {
    market: 'NYISO', region: 'US', baseLMP: 40, volatility: 0.18, peakMultiplier: 1.55, offPeakMultiplier: 0.70, currency: 'USD',
    loadBase: 30000, capacityBase: 40000, reserveMarginBase: 20.5, congestionBase: 8.2, lossBase: 1.2,
    genMix: { coal: 1, gas: 40, nuclear: 28, wind: 6, solar: 4, hydro: 16, other: 5 },
    heatRateBase: 7.5, renewablePenetrationBase: 26.0,
  },
  {
    market: 'ISO-NE', region: 'US', baseLMP: 44, volatility: 0.22, peakMultiplier: 1.50, offPeakMultiplier: 0.65, currency: 'USD',
    loadBase: 22000, capacityBase: 31000, reserveMarginBase: 17.5, congestionBase: 3.8, lossBase: 1.0,
    genMix: { coal: 1, gas: 52, nuclear: 22, wind: 6, solar: 5, hydro: 7, other: 7 },
    heatRateBase: 7.9, renewablePenetrationBase: 18.0,
  },
  {
    market: 'MISO', region: 'US', baseLMP: 30, volatility: 0.16, peakMultiplier: 1.40, offPeakMultiplier: 0.74, currency: 'USD',
    loadBase: 100000, capacityBase: 130000, reserveMarginBase: 19.0, congestionBase: 3.1, lossBase: 0.9,
    genMix: { coal: 25, gas: 32, nuclear: 12, wind: 18, solar: 4, hydro: 4, other: 5 },
    heatRateBase: 7.4, renewablePenetrationBase: 22.0,
  },
  {
    market: 'SPP', region: 'US', baseLMP: 26, volatility: 0.20, peakMultiplier: 1.38, offPeakMultiplier: 0.76, currency: 'USD',
    loadBase: 42000, capacityBase: 58000, reserveMarginBase: 25.0, congestionBase: 2.5, lossBase: 0.8,
    genMix: { coal: 18, gas: 35, nuclear: 5, wind: 32, solar: 3, hydro: 3, other: 4 },
    heatRateBase: 7.2, renewablePenetrationBase: 35.0,
  },
  {
    market: 'NordPool', region: 'Europe', baseLMP: 38, volatility: 0.22, peakMultiplier: 1.35, offPeakMultiplier: 0.70, currency: 'EUR',
    loadBase: 55000, capacityBase: 82000, reserveMarginBase: 28.0, congestionBase: 2.8, lossBase: 0.7,
    genMix: { coal: 2, gas: 8, nuclear: 22, wind: 20, solar: 2, hydro: 40, other: 6 },
    heatRateBase: 6.8, renewablePenetrationBase: 62.0,
  },
  {
    market: 'EPEX', region: 'Europe', baseLMP: 52, volatility: 0.25, peakMultiplier: 1.42, offPeakMultiplier: 0.65, currency: 'EUR',
    loadBase: 65000, capacityBase: 95000, reserveMarginBase: 16.5, congestionBase: 4.5, lossBase: 1.1,
    genMix: { coal: 18, gas: 18, nuclear: 12, wind: 24, solar: 12, hydro: 6, other: 10 },
    heatRateBase: 7.6, renewablePenetrationBase: 42.0,
  },
];

interface CapacityAuctionConfig {
  market: string;
  deliveryYear: string;
  clearingPriceBase: number;
  currency: string;
  unit: string;
}

const CAPACITY_AUCTIONS: CapacityAuctionConfig[] = [
  { market: 'PJM', deliveryYear: '2027/2028', clearingPriceBase: 28.92, currency: 'USD', unit: '$/MW-day' },
  { market: 'PJM', deliveryYear: '2026/2027', clearingPriceBase: 49.49, currency: 'USD', unit: '$/MW-day' },
  { market: 'NYISO Zone J', deliveryYear: '2026/2027', clearingPriceBase: 15.24, currency: 'USD', unit: '$/kW-month' },
  { market: 'NYISO Rest of State', deliveryYear: '2026/2027', clearingPriceBase: 4.86, currency: 'USD', unit: '$/kW-month' },
  { market: 'ISO-NE FCA 18', deliveryYear: '2027/2028', clearingPriceBase: 3.58, currency: 'USD', unit: '$/kW-month' },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('power-market-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // Seasonal factor: summer/winter peaks
  const month = now.getMonth();
  const seasonFactor = 1 + 0.15 * Math.cos(((month - 7) / 12) * 2 * Math.PI);

  // --- markets ---
  const markets = MARKETS.map(m => {
    const realtimeLMP = round2(jitter(m.baseLMP * seasonFactor, m.volatility));
    const dayAheadPrice = round2(realtimeLMP * (1 + (rng() - 0.5) * 0.04));
    const peakPrice = round2(realtimeLMP * m.peakMultiplier * (1 + (rng() - 0.5) * 0.06));
    const offPeakPrice = round2(realtimeLMP * m.offPeakMultiplier * (1 + (rng() - 0.5) * 0.06));
    const peakOffPeakSpread = round2(peakPrice - offPeakPrice);

    const change1d = round2((rng() - 0.5) * realtimeLMP * 0.08);
    const change1w = round2((rng() - 0.5) * realtimeLMP * 0.15);
    const change1m = round2((rng() - 0.5) * realtimeLMP * 0.25);

    // Generation mix with normalization
    const rawMix = {
      coal: round1(jitter(m.genMix.coal, 0.05)),
      gas: round1(jitter(m.genMix.gas, 0.05)),
      nuclear: round1(jitter(m.genMix.nuclear, 0.03)),
      wind: round1(jitter(m.genMix.wind, 0.12)),
      solar: round1(jitter(m.genMix.solar, 0.12)),
      hydro: round1(jitter(m.genMix.hydro, 0.08)),
      other: round1(jitter(m.genMix.other, 0.08)),
    };
    const totalMix = rawMix.coal + rawMix.gas + rawMix.nuclear + rawMix.wind + rawMix.solar + rawMix.hydro + rawMix.other;
    const scale = 100 / totalMix;
    const generationMix = {
      coal: round1(rawMix.coal * scale),
      gas: round1(rawMix.gas * scale),
      nuclear: round1(rawMix.nuclear * scale),
      wind: round1(rawMix.wind * scale),
      solar: round1(rawMix.solar * scale),
      hydro: round1(rawMix.hydro * scale),
      other: round1(rawMix.other * scale),
    };

    const load = round1(jitter(m.loadBase * seasonFactor, 0.08));
    const capacity = round1(jitter(m.capacityBase, 0.03));
    const capacityMargin = round1(((capacity - load) / capacity) * 100);
    const reserveMargin = round1(jitter(m.reserveMarginBase, 0.10));

    const congestionCost = round2(jitter(m.congestionBase, 0.20));
    const lossComponent = round2(jitter(m.lossBase, 0.15));

    return {
      market: m.market,
      region: m.region,
      currency: m.currency,
      realtimeLMP,
      dayAheadPrice,
      peakPrice,
      offPeakPrice,
      peakOffPeakSpread,
      change1d,
      change1w,
      change1m,
      generationMix,
      load,
      capacity,
      capacityMargin,
      reserveMargin,
      congestionCost,
      lossComponent,
    };
  });

  // --- forwardCurve: Month+1 through Month+12 for select markets ---
  const forwardCurveMarkets = ['PJM', 'ERCOT', 'CAISO', 'NYISO', 'NordPool', 'EPEX'];
  const forwardCurve = forwardCurveMarkets.map(marketName => {
    const config = MARKETS.find(m => m.market === marketName)!;
    const baseSpot = config.baseLMP * seasonFactor;
    const months: { label: string; price: number }[] = [];
    for (let i = 1; i <= 12; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = `M+${i}`;
      const futureMonth = futureDate.getMonth();
      const futureSeason = 1 + 0.15 * Math.cos(((futureMonth - 7) / 12) * 2 * Math.PI);
      // Slight contango with seasonal shape
      const price = round2(jitter(baseSpot * futureSeason * (1 + i * 0.005), 0.06));
      months.push({ label, price });
    }
    return { market: marketName, currency: config.currency, months };
  });

  // --- spreads: spark spread (gas-to-power) and dark spread (coal-to-power) ---
  // Spark spread = power price - (gas price * heat rate)
  // Dark spread = power price - (coal price * heat rate * emission factor)
  const gasPrice = round2(jitter(2.85, 0.12)); // $/MMBtu Henry Hub
  const coalPrice = round2(jitter(3.20, 0.10)); // $/MMBtu equivalent
  const carbonPrice = round2(jitter(5.50, 0.15)); // $/short ton CO2 (US context)

  const spreads = MARKETS.filter(m => m.region === 'US').map(m => {
    const marketData = markets.find(d => d.market === m.market)!;
    const heatRate = round2(jitter(m.heatRateBase, 0.05)); // MMBtu/MWh

    // Spark spread = power price - gas cost per MWh
    const gasCostPerMWh = round2(gasPrice * heatRate);
    const sparkSpread = round2(marketData.realtimeLMP - gasCostPerMWh);

    // Dark spread = power price - coal cost per MWh - carbon cost
    // Coal heat rate typically higher (~10 MMBtu/MWh)
    const coalHeatRate = round2(heatRate * 1.30);
    const coalCostPerMWh = round2(coalPrice * coalHeatRate);
    const emissionRate = 0.095; // tons CO2 per MMBtu of coal
    const carbonCostPerMWh = round2(carbonPrice * emissionRate * coalHeatRate);
    const darkSpread = round2(marketData.realtimeLMP - coalCostPerMWh - carbonCostPerMWh);

    return {
      market: m.market,
      heatRate,
      sparkSpread,
      darkSpread,
      gasCostPerMWh,
      coalCostPerMWh,
      carbonCostPerMWh,
    };
  });

  // --- heatRates by region ---
  const heatRates = MARKETS.map(m => {
    const impliedHeatRate = round2(jitter(m.heatRateBase, 0.06));
    const marginalHeatRate = round2(impliedHeatRate * (1 + (rng() - 0.5) * 0.08));
    return {
      market: m.market,
      impliedHeatRate,
      marginalHeatRate,
      unit: 'MMBtu/MWh',
    };
  });

  // --- renewablePenetration ---
  const renewablePenetration = MARKETS.map(m => {
    const rate = round1(jitter(m.renewablePenetrationBase, 0.08));
    const curtailment = round1(jitter(rate > 30 ? 4.5 : 2.0, 0.25));
    const change1y = round1((rng() - 0.3) * 3.5); // trend upward
    return {
      market: m.market,
      penetrationRate: rate,
      curtailment,
      change1y,
    };
  });

  // --- peakDemandForecast ---
  const peakDemandForecast = MARKETS.map(m => {
    const forecast = round1(jitter(m.loadBase * seasonFactor * 1.08, 0.05));
    const actual = round1(jitter(forecast, 0.03));
    const deviation = round1(((actual - forecast) / forecast) * 100);
    return {
      market: m.market,
      forecastMW: forecast,
      actualMW: actual,
      deviationPct: deviation,
    };
  });

  // --- capacityAuctionResults ---
  const capacityAuctionResults = CAPACITY_AUCTIONS.map(a => {
    const clearingPrice = round2(jitter(a.clearingPriceBase, 0.08));
    const netCostOfNewEntry = round2(clearingPrice * (1 + (rng() - 0.5) * 0.30 + 0.40));
    const clearedCapacityGW = round1(jitter(
      a.market.includes('PJM') ? 145 :
      a.market.includes('Zone J') ? 10 :
      a.market.includes('Rest of State') ? 25 : 30,
      0.05
    ));
    return {
      market: a.market,
      deliveryYear: a.deliveryYear,
      clearingPrice,
      unit: a.unit,
      currency: a.currency,
      netCostOfNewEntry,
      clearedCapacityGW,
    };
  });

  return {
    markets,
    forwardCurve,
    spreads: {
      referencePrices: {
        naturalGas: { price: gasPrice, unit: '$/MMBtu', source: 'Henry Hub' },
        coal: { price: coalPrice, unit: '$/MMBtu eq', source: 'Central Appalachian' },
        carbon: { price: carbonPrice, unit: '$/short ton CO2', source: 'RGGI' },
      },
      sparkAndDarkSpreads: spreads,
    },
    heatRates,
    renewablePenetration,
    peakDemandForecast,
    capacityAuctionResults,
    timestamp: now.toISOString(),
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
    console.error('[PowerMarket] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate power market data' });
  }
});

export default router;
