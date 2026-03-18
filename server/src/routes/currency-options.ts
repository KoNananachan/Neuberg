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

// ── Types ──

interface VolSurfaceEntry {
  pair: string;
  tenor: string;
  delta: string;
  vol: number;
}

interface RiskReversalEntry {
  pair: string;
  tenor: string;
  rr25d: number;
  rr10d: number;
}

interface ButterflyEntry {
  pair: string;
  tenor: string;
  bf25d: number;
  bf10d: number;
}

interface ATMTermEntry {
  pair: string;
  tenor: string;
  atmVol: number;
  change1d: number;
  change1w: number;
}

interface VolRankingEntry {
  pair: string;
  atm1mVol: number;
  realized3mVol: number;
  volSpread: number;
  percentileRank: number;
  volRegime: 'low' | 'normal' | 'elevated' | 'high';
}

interface EventCalendarEntry {
  pair: string;
  event: string;
  date: string;
  expectedVolImpact: number;
}

// ── Pair definitions ──

const PAIRS = [
  { id: 'EURUSD', name: 'EUR/USD', baseATM: 8.0, rrBias: 0.0, volFloor: 7, volCeil: 9 },
  { id: 'USDJPY', name: 'USD/JPY', baseATM: 10.5, rrBias: -0.3, volFloor: 9, volCeil: 12 },
  { id: 'GBPUSD', name: 'GBP/USD', baseATM: 9.0, rrBias: -0.1, volFloor: 8, volCeil: 10 },
  { id: 'AUDUSD', name: 'AUD/USD', baseATM: 11.5, rrBias: -0.2, volFloor: 10, volCeil: 13 },
  { id: 'USDCAD', name: 'USD/CAD', baseATM: 7.0, rrBias: 0.05, volFloor: 6, volCeil: 8 },
  { id: 'USDCHF', name: 'USD/CHF', baseATM: 7.5, rrBias: 0.1, volFloor: 6.5, volCeil: 9 },
];

const TENORS = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y'];
const DELTAS = ['10P', '25P', 'ATM', '25C', '10C'];

// Tenor multipliers for term structure: front-end slightly lower, back-end slightly higher
const TENOR_MULT: Record<string, number> = {
  '1W': 0.88, '2W': 0.92, '1M': 1.00, '2M': 1.03, '3M': 1.06, '6M': 1.10, '1Y': 1.14,
};

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

function generate() {
  const seed = hashSeed('currency-options-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 1. Vol Surface ──
  const volSurface: VolSurfaceEntry[] = [];

  for (const pair of PAIRS) {
    for (const tenor of TENORS) {
      const tMult = TENOR_MULT[tenor];
      const atmBase = pair.baseATM * tMult;
      const atmVol = Math.round(jitter(atmBase, 0.06) * 100) / 100;

      for (const delta of DELTAS) {
        let vol: number;
        if (delta === 'ATM') {
          vol = atmVol;
        } else if (delta === '25P') {
          // 25-delta put: ATM + slight premium (put skew)
          vol = Math.round((atmVol + 0.2 + rng() * 0.4) * 100) / 100;
        } else if (delta === '10P') {
          // 10-delta put: larger wing premium
          vol = Math.round((atmVol + 0.8 + rng() * 0.8) * 100) / 100;
        } else if (delta === '25C') {
          // 25-delta call: slight premium but less than put
          vol = Math.round((atmVol + 0.1 + rng() * 0.3) * 100) / 100;
        } else {
          // 10C: wing premium
          vol = Math.round((atmVol + 0.5 + rng() * 0.7) * 100) / 100;
        }
        volSurface.push({ pair: pair.id, tenor, delta, vol });
      }
    }
  }

  // ── 2. Risk Reversals ──
  const riskReversals: RiskReversalEntry[] = [];

  for (const pair of PAIRS) {
    for (const tenor of TENORS) {
      // 25d RR: typically small for G10, wider for commodity ccys
      // EURUSD: -0.3 to +0.3, USDJPY: -1.0 to +1.0
      const rrScale = pair.id === 'USDJPY' ? 1.0 : pair.id === 'AUDUSD' ? 0.7 : 0.3;
      const rr25d = Math.round((pair.rrBias + (rng() - 0.5) * 2 * rrScale) * 100) / 100;
      // 10d RR is typically wider (roughly 2-3x the 25d)
      const rr10d = Math.round((rr25d * (2.0 + rng() * 0.8)) * 100) / 100;
      riskReversals.push({ pair: pair.id, tenor, rr25d, rr10d });
    }
  }

  // ── 3. Butterfly Spreads ──
  const butterflySpread: ButterflyEntry[] = [];

  for (const pair of PAIRS) {
    for (const tenor of TENORS) {
      // 25d butterfly: typically 0.2-0.6 vol pts for G10
      const bf25d = Math.round((0.2 + rng() * 0.4) * 100) / 100;
      // 10d butterfly: wider wings, typically 0.5-1.0 vol pts
      const bf10d = Math.round((0.5 + rng() * 0.5) * 100) / 100;
      butterflySpread.push({ pair: pair.id, tenor, bf25d, bf10d });
    }
  }

  // ── 4. ATM Term Structure ──
  const atmTermStructure: ATMTermEntry[] = [];

  for (const pair of PAIRS) {
    for (const tenor of TENORS) {
      const tMult = TENOR_MULT[tenor];
      const atmVol = Math.round(jitter(pair.baseATM * tMult, 0.06) * 100) / 100;
      const change1d = Math.round((rng() - 0.5) * 0.6 * 100) / 100;
      const change1w = Math.round((rng() - 0.48) * 1.2 * 100) / 100;
      atmTermStructure.push({ pair: pair.id, tenor, atmVol, change1d, change1w });
    }
  }

  // ── 5. Vol Ranking ──
  const volRanking: VolRankingEntry[] = PAIRS.map(pair => {
    const atm1mVol = Math.round(jitter(pair.baseATM, 0.08) * 100) / 100;
    // 3M realized vol: usually somewhat lower than implied
    const realized3mVol = Math.round(jitter(pair.baseATM * 0.85, 0.12) * 100) / 100;
    const volSpread = Math.round((atm1mVol - realized3mVol) * 100) / 100;
    const percentileRank = Math.round(rng() * 100);

    let volRegime: 'low' | 'normal' | 'elevated' | 'high';
    if (percentileRank < 20) volRegime = 'low';
    else if (percentileRank < 60) volRegime = 'normal';
    else if (percentileRank < 85) volRegime = 'elevated';
    else volRegime = 'high';

    return { pair: pair.id, atm1mVol, realized3mVol, volSpread, percentileRank, volRegime };
  });

  // Sort by atm1mVol descending
  volRanking.sort((a, b) => b.atm1mVol - a.atm1mVol);

  // ── 6. Event Calendar ──
  const today = new Date();
  const events: { pair: string; event: string; daysOut: number; impact: number }[] = [
    { pair: 'EURUSD', event: 'ECB Interest Rate Decision', daysOut: 3 + Math.floor(rng() * 10), impact: 0.8 + rng() * 0.6 },
    { pair: 'USDJPY', event: 'BOJ Monetary Policy Meeting', daysOut: 5 + Math.floor(rng() * 14), impact: 1.2 + rng() * 0.8 },
    { pair: 'GBPUSD', event: 'BOE Rate Decision', daysOut: 4 + Math.floor(rng() * 12), impact: 0.7 + rng() * 0.5 },
    { pair: 'EURUSD', event: 'US Nonfarm Payrolls', daysOut: 1 + Math.floor(rng() * 8), impact: 0.5 + rng() * 0.4 },
    { pair: 'AUDUSD', event: 'RBA Cash Rate Decision', daysOut: 6 + Math.floor(rng() * 10), impact: 0.9 + rng() * 0.5 },
    { pair: 'USDCAD', event: 'BOC Rate Announcement', daysOut: 7 + Math.floor(rng() * 12), impact: 0.6 + rng() * 0.4 },
  ];

  const eventCalendar: EventCalendarEntry[] = events
    .sort((a, b) => a.daysOut - b.daysOut)
    .map(e => {
      const eventDate = new Date(today);
      eventDate.setDate(eventDate.getDate() + e.daysOut);
      return {
        pair: e.pair,
        event: e.event,
        date: eventDate.toISOString().slice(0, 10),
        expectedVolImpact: Math.round(e.impact * 100) / 100,
      };
    });

  return {
    volSurface,
    riskReversals,
    butterflySpread,
    atmTermStructure,
    volRanking,
    eventCalendar,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[CurrencyOptions] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate currency options data' });
  }
});

export default router;
