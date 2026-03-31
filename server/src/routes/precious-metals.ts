import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// -- Types --

interface SpotPrice {
  metal: string;
  spotBid: number;
  spotAsk: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  currency: string;
}

interface LeaseRate {
  metal: string;
  tenor: string;
  rate: number;
  change: number;
}

interface EtfHolding {
  fund: string;
  metal: string;
  holdingsTonnes: number;
  changeToday: number;
  changeMTD: number;
  aum: number;
}

interface ComexInventory {
  metal: string;
  registered: number;
  eligible: number;
  total: number;
  changeToday: number;
  changeWeek: number;
}

interface ForwardCurve {
  metal: string;
  spot: number;
  '1m': number;
  '3m': number;
  '6m': number;
  '12m': number;
  contangoBackwardation: 'CONTANGO' | 'BACKWARDATION';
}

interface GoldSilverRatio {
  value: number;
  historicalAvg: number;
  percentile: number;
  zScore: number;
}

interface CentralBankPurchase {
  country: string;
  tonnes: number;
  action: 'buy' | 'sell';
  period: string;
}

// -- Seed Data --

interface MetalSeed {
  metal: string;
  spotBase: number;
  spreadBps: number;
  leaseRateRange: [number, number];
  comexRegistered: number;
  comexEligible: number;
}

const METAL_SEEDS: MetalSeed[] = [
  { metal: 'Gold',      spotBase: 2045, spreadBps: 50,  leaseRateRange: [0.5, 2.5],  comexRegistered: 8200000,  comexEligible: 9800000  },
  { metal: 'Silver',    spotBase: 24.20, spreadBps: 300, leaseRateRange: [1.0, 5.0],  comexRegistered: 120000000, comexEligible: 160000000 },
  { metal: 'Platinum',  spotBase: 945,  spreadBps: 200, leaseRateRange: [2.0, 8.0],  comexRegistered: 130000,   comexEligible: 170000   },
  { metal: 'Palladium', spotBase: 985,  spreadBps: 400, leaseRateRange: [3.0, 10.0], comexRegistered: 220000,   comexEligible: 280000   },
];

const TENORS = ['1M', '3M', '6M', '12M'];
const TENOR_MULTIPLIERS = [1.0, 1.5, 2.0, 2.5];

interface EtfSeed {
  fund: string;
  metal: string;
  holdingsBase: number;
  aumBase: number;
}

const ETF_SEEDS: EtfSeed[] = [
  { fund: 'GLD',  metal: 'Gold',      holdingsBase: 878,   aumBase: 57.2  },
  { fund: 'IAU',  metal: 'Gold',      holdingsBase: 412,   aumBase: 26.8  },
  { fund: 'SLV',  metal: 'Silver',    holdingsBase: 13920, aumBase: 10.4  },
  { fund: 'PPLT', metal: 'Platinum',  holdingsBase: 16.8,  aumBase: 0.92  },
  { fund: 'PALL', metal: 'Palladium', holdingsBase: 5.4,   aumBase: 0.31  },
];

interface CbSeed {
  country: string;
  tonnesBase: number;
  action: 'buy' | 'sell';
}

const CB_SEEDS: CbSeed[] = [
  { country: 'China',        tonnesBase: 28, action: 'buy'  },
  { country: 'Poland',       tonnesBase: 18, action: 'buy'  },
  { country: 'India',        tonnesBase: 15, action: 'buy'  },
  { country: 'Turkey',       tonnesBase: 12, action: 'buy'  },
  { country: 'Singapore',    tonnesBase: 8,  action: 'buy'  },
  { country: 'Czech Republic', tonnesBase: 5, action: 'buy' },
  { country: 'Qatar',        tonnesBase: 4,  action: 'buy'  },
  { country: 'Kazakhstan',   tonnesBase: 3,  action: 'sell' },
  { country: 'Uzbekistan',   tonnesBase: 6,  action: 'sell' },
];

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

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('precious-metals-monitor-' + day));

  // 1. Spot Prices
  const spotPrices: SpotPrice[] = METAL_SEEDS.map(s => {
    const mid = roundTo(jitter(rng, s.spotBase, 0.03), 2);
    const spread = roundTo(mid * s.spreadBps / 10000, 2);
    const bid = roundTo(mid - spread / 2, 2);
    const ask = roundTo(mid + spread / 2, 2);
    const change = roundTo((rng() - 0.48) * s.spotBase * 0.02, 2);
    const prevClose = mid - change;
    const changePercent = roundTo((change / prevClose) * 100, 2);
    const volatilityRange = s.spotBase * 0.015;
    const low24h = roundTo(mid - rng() * volatilityRange, 2);
    const high24h = roundTo(mid + rng() * volatilityRange, 2);
    return {
      metal: s.metal,
      spotBid: bid,
      spotAsk: ask,
      change,
      changePercent,
      high24h,
      low24h,
      currency: 'USD',
    };
  });

  // 2. Lease Rates
  const leaseRates: LeaseRate[] = [];
  for (const s of METAL_SEEDS) {
    const baseRate = rangeVal(rng, s.leaseRateRange[0], s.leaseRateRange[1]);
    for (let t = 0; t < TENORS.length; t++) {
      const rate = roundTo(baseRate * TENOR_MULTIPLIERS[t] / TENOR_MULTIPLIERS[0], 3);
      const change = roundTo((rng() - 0.5) * 0.1, 3);
      leaseRates.push({
        metal: s.metal,
        tenor: TENORS[t],
        rate,
        change,
      });
    }
  }

  // 3. ETF Holdings
  const etfHoldings: EtfHolding[] = ETF_SEEDS.map(e => {
    const holdingsTonnes = roundTo(jitter(rng, e.holdingsBase, 0.02), 1);
    const changeToday = roundTo((rng() - 0.5) * e.holdingsBase * 0.005, 2);
    const changeMTD = roundTo((rng() - 0.45) * e.holdingsBase * 0.02, 2);
    const aum = roundTo(jitter(rng, e.aumBase, 0.03), 2);
    return {
      fund: e.fund,
      metal: e.metal,
      holdingsTonnes,
      changeToday,
      changeMTD,
      aum,
    };
  });

  // 4. COMEX Inventory
  const comexInventory: ComexInventory[] = METAL_SEEDS.map(s => {
    const registered = roundTo(jitter(rng, s.comexRegistered, 0.04), 0);
    const eligible = roundTo(jitter(rng, s.comexEligible, 0.04), 0);
    const total = registered + eligible;
    const changeToday = roundTo((rng() - 0.5) * s.comexRegistered * 0.01, 0);
    const changeWeek = roundTo((rng() - 0.48) * s.comexRegistered * 0.03, 0);
    return {
      metal: s.metal,
      registered,
      eligible,
      total,
      changeToday,
      changeWeek,
    };
  });

  // 5. Forward Curves
  const forwardCurves: ForwardCurve[] = METAL_SEEDS.map(s => {
    const spotIdx = spotPrices.find(p => p.metal === s.metal);
    const spot = spotIdx ? (spotIdx.spotBid + spotIdx.spotAsk) / 2 : s.spotBase;
    const isContango = rng() > 0.35;
    const drift = isContango ? 1 : -1;
    const m1 = roundTo(spot + drift * spot * rangeVal(rng, 0.001, 0.004), 2);
    const m3 = roundTo(spot + drift * spot * rangeVal(rng, 0.003, 0.010), 2);
    const m6 = roundTo(spot + drift * spot * rangeVal(rng, 0.006, 0.018), 2);
    const m12 = roundTo(spot + drift * spot * rangeVal(rng, 0.010, 0.030), 2);
    return {
      metal: s.metal,
      spot: roundTo(spot, 2),
      '1m': m1,
      '3m': m3,
      '6m': m6,
      '12m': m12,
      contangoBackwardation: isContango ? 'CONTANGO' : 'BACKWARDATION',
    };
  });

  // 6. Gold/Silver Ratio
  const goldSpot = spotPrices[0];
  const silverSpot = spotPrices[1];
  const goldMid = (goldSpot.spotBid + goldSpot.spotAsk) / 2;
  const silverMid = (silverSpot.spotBid + silverSpot.spotAsk) / 2;
  const ratioValue = roundTo(goldMid / silverMid, 2);
  const historicalAvg = 67.5;
  const stdDev = 12.8;
  const zScore = roundTo((ratioValue - historicalAvg) / stdDev, 2);
  // Approximate percentile from z-score using logistic approximation
  const percentile = roundTo(100 / (1 + Math.exp(-1.7 * zScore)), 1);
  const goldSilverRatio: GoldSilverRatio = {
    value: ratioValue,
    historicalAvg,
    percentile,
    zScore,
  };

  // 7. Central Bank Purchases
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const centralBankPurchases: CentralBankPurchase[] = CB_SEEDS.map(cb => {
    const tonnes = roundTo(jitter(rng, cb.tonnesBase, 0.20), 1);
    const monthOffset = Math.floor(rng() * 3);
    const reportMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const period = `${months[reportMonth.getMonth()]} ${reportMonth.getFullYear()}`;
    return {
      country: cb.country,
      tonnes: Math.abs(tonnes),
      action: cb.action,
      period,
    };
  });

  return {
    spotPrices,
    leaseRates,
    etfHoldings,
    comexInventory,
    forwardCurves,
    goldSilverRatio,
    centralBankPurchases,
    generatedAt: new Date().toISOString(),
  };
}

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
  } catch (err) {
    console.error('[PreciousMetals] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate precious metals data' });
  }
});

export default router;
