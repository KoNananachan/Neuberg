import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const FFA_CONTRACTS = [
  { route: 'C5TC', segment: 'Dry Bulk' as const, baseRate: 20000, unit: 'usd' },
  { route: 'P4TC', segment: 'Dry Bulk' as const, baseRate: 14000, unit: 'usd' },
  { route: 'S10TC', segment: 'Dry Bulk' as const, baseRate: 11000, unit: 'usd' },
  { route: 'BHSI', segment: 'Dry Bulk' as const, baseRate: 9000, unit: 'usd' },
  { route: 'TD3C', segment: 'Tanker' as const, baseRate: 55, unit: 'ws' },
  { route: 'TD7', segment: 'Clean' as const, baseRate: 120, unit: 'ws' },
  { route: 'TD20', segment: 'Tanker' as const, baseRate: 75, unit: 'ws' },
  { route: 'TC2', segment: 'Clean' as const, baseRate: 160, unit: 'ws' },
  { route: 'TC14', segment: 'Clean' as const, baseRate: 135, unit: 'ws' },
  { route: 'TC1', segment: 'Tanker' as const, baseRate: 48, unit: 'ws' },
];

const ROUTE_PRICING_DATA = [
  { route: 'C5', description: 'Brazil-China Iron Ore', vessel: 'Capesize', baseSpot: 21500 },
  { route: 'C3', description: 'Australia-China Coal', vessel: 'Capesize', baseSpot: 12800 },
  { route: 'P3A', description: 'USG-Europe Grain', vessel: 'Panamax', baseSpot: 14200 },
  { route: 'TD3C', description: 'MEG-East VLCC', vessel: 'VLCC', baseSpot: 52 },
  { route: 'S1B', description: 'Indo-China Nickel Ore', vessel: 'Supramax', baseSpot: 10500 },
  { route: 'TD20', description: 'WAF-UKC Suezmax', vessel: 'Suezmax', baseSpot: 78 },
  { route: 'P1A', description: 'Continent-FE Grain', vessel: 'Panamax', baseSpot: 13800 },
  { route: 'TC2', description: 'Continent-USAC Clean MR', vessel: 'MR Tanker', baseSpot: 155 },
];

const VOL_UNDERLYINGS = [
  { underlying: 'C5TC Capesize', baseAtm30: 42, baseAtm90: 38, baseHvol: 45 },
  { underlying: 'P4TC Panamax', baseAtm30: 35, baseAtm90: 32, baseHvol: 37 },
  { underlying: 'S10TC Supramax', baseAtm30: 30, baseAtm90: 28, baseHvol: 33 },
  { underlying: 'TD3C VLCC', baseAtm30: 55, baseAtm90: 48, baseHvol: 52 },
  { underlying: 'TD7 Clean LR1', baseAtm30: 40, baseAtm90: 36, baseHvol: 42 },
  { underlying: 'TC2 Clean MR', baseAtm30: 38, baseAtm90: 34, baseHvol: 39 },
];

// Seasonal patterns: dry bulk peaks Q4, tanker peaks winter, container steady with mild Q3 peak
const SEASONAL_BASE = {
  capesize:  [88, 85, 90, 95, 92, 88, 90, 95, 100, 108, 115, 112],
  panamax:   [90, 87, 92, 96, 94, 90, 92, 97, 102, 110, 116, 110],
  tanker:    [112, 108, 100, 95, 88, 85, 84, 86, 92, 100, 108, 115],
  container: [95, 90, 92, 96, 98, 100, 104, 108, 106, 102, 98, 95],
};


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-freight-derivatives'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // FFA Contracts
  const ffaContracts = FFA_CONTRACTS.map(c => {
    const currentRate = c.unit === 'usd'
      ? Math.round(jitter(c.baseRate, 0.15))
      : Math.round(jitter(c.baseRate, 0.14) * 10) / 10;
    const change = c.unit === 'usd'
      ? Math.round((rng() - 0.5) * c.baseRate * 0.06)
      : Math.round((rng() - 0.5) * c.baseRate * 0.06 * 10) / 10;
    const changePercent = Math.round((change / (currentRate - change || 1)) * 10000) / 100;
    const cal1 = c.unit === 'usd'
      ? Math.round(jitter(c.baseRate * (1 + (rng() - 0.45) * 0.1), 0.05))
      : Math.round(jitter(c.baseRate * (1 + (rng() - 0.45) * 0.1), 0.05) * 10) / 10;
    const cal2 = c.unit === 'usd'
      ? Math.round(jitter(c.baseRate * (1 + (rng() - 0.45) * 0.15), 0.06))
      : Math.round(jitter(c.baseRate * (1 + (rng() - 0.45) * 0.15), 0.06) * 10) / 10;
    const cal3 = c.unit === 'usd'
      ? Math.round(jitter(c.baseRate * (1 + (rng() - 0.45) * 0.18), 0.07))
      : Math.round(jitter(c.baseRate * (1 + (rng() - 0.45) * 0.18), 0.07) * 10) / 10;
    const cal4 = c.unit === 'usd'
      ? Math.round(jitter(c.baseRate * (1 + (rng() - 0.45) * 0.2), 0.08))
      : Math.round(jitter(c.baseRate * (1 + (rng() - 0.45) * 0.2), 0.08) * 10) / 10;
    const volume = Math.round(jitter(c.unit === 'usd' ? 450 : 280, 0.4));
    return { route: c.route, segment: c.segment, currentRate, cal1, cal2, cal3, cal4, change, changePercent, volume };
  });

  // Route Pricing
  const routePricing = ROUTE_PRICING_DATA.map(r => {
    const isDryBulk = r.baseSpot > 1000;
    const spotRate = isDryBulk
      ? Math.round(jitter(r.baseSpot, 0.12))
      : Math.round(jitter(r.baseSpot, 0.12) * 10) / 10;
    const drift1m = (rng() - 0.48) * 0.04;
    const drift3m = (rng() - 0.46) * 0.08;
    const drift6m = (rng() - 0.44) * 0.12;
    const drift12m = (rng() - 0.42) * 0.16;
    const ffa1m = isDryBulk
      ? Math.round(r.baseSpot * (1 + drift1m))
      : Math.round(r.baseSpot * (1 + drift1m) * 10) / 10;
    const ffa3m = isDryBulk
      ? Math.round(r.baseSpot * (1 + drift3m))
      : Math.round(r.baseSpot * (1 + drift3m) * 10) / 10;
    const ffa6m = isDryBulk
      ? Math.round(r.baseSpot * (1 + drift6m))
      : Math.round(r.baseSpot * (1 + drift6m) * 10) / 10;
    const ffa12m = isDryBulk
      ? Math.round(r.baseSpot * (1 + drift12m))
      : Math.round(r.baseSpot * (1 + drift12m) * 10) / 10;
    const contango = ffa3m > spotRate;
    const basisSpread = isDryBulk
      ? Math.round(ffa3m - spotRate)
      : Math.round((ffa3m - spotRate) * 10) / 10;
    return { route: r.route, description: r.description, vessel: r.vessel, spotRate, ffa1m, ffa3m, ffa6m, ffa12m, contango, basisSpread };
  });

  // Volatility Data
  const volatilityData = VOL_UNDERLYINGS.map(v => {
    const atm30d = Math.round(jitter(v.baseAtm30, 0.12) * 10) / 10;
    const atm90d = Math.round(jitter(v.baseAtm90, 0.1) * 10) / 10;
    const skew25d = Math.round((rng() - 0.45) * 8 * 10) / 10;
    const riskReversal = Math.round((rng() - 0.5) * 6 * 10) / 10;
    const callOI = Math.round(jitter(1200, 0.5));
    const putOI = Math.round(jitter(900, 0.5));
    const putCallRatio = Math.round((putOI / callOI) * 100) / 100;
    const historicalVol30d = Math.round(jitter(v.baseHvol, 0.15) * 10) / 10;
    return { underlying: v.underlying, atm30d, atm90d, skew25d, riskReversal, callOI, putOI, putCallRatio, historicalVol30d };
  });

  // Seasonal Indices (12 months)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const seasonalIndices = months.map((month, i) => ({
    month,
    capesizeIndex: Math.round(jitter(SEASONAL_BASE.capesize[i], 0.04)),
    panamaxIndex: Math.round(jitter(SEASONAL_BASE.panamax[i], 0.04)),
    tankerIndex: Math.round(jitter(SEASONAL_BASE.tanker[i], 0.04)),
    containerIndex: Math.round(jitter(SEASONAL_BASE.container[i], 0.04)),
  }));

  // Market Summary
  const bdiLevel = Math.round(jitter(1850, 0.18));
  const bdiChange = Math.round((rng() - 0.5) * 120);
  const bdtiLevel = Math.round(jitter(1000, 0.16));
  const bdtiChange = Math.round((rng() - 0.5) * 80);
  const mostActiveRoutes = ['C5TC', 'P4TC', 'TD3C', 'TC2', 'S10TC'];
  const mostActiveRoute = mostActiveRoutes[Math.floor(rng() * mostActiveRoutes.length)];
  const totalFFAVolume = Math.round(jitter(4500, 0.3));
  const sentimentVal = rng();
  const marketSentiment = sentimentVal > 0.6 ? 'Bullish' : sentimentVal < 0.4 ? 'Bearish' : 'Neutral';

  const marketSummary = { bdiLevel, bdiChange, bdtiLevel, bdtiChange, mostActiveRoute, totalFFAVolume, marketSentiment };

  return { ffaContracts, routePricing, volatilityData, seasonalIndices, marketSummary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FreightDerivatives] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate freight derivatives data' });
  }
});

export default router;
