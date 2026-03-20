import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Types ──

interface SpreadEntry {
  pair: string;
  tenor: string;
  spread: number;       // basis spread in bps
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
}

interface TermStructurePoint {
  tenor: string;
  spread: number;
  previous: number;     // previous day spread
  change: number;
}

interface TermStructureCurve {
  pair: string;
  points: TermStructurePoint[];
}

interface HistoryDay {
  date: string;
  spread: number;
}

interface HistorySeries {
  pair: string;
  tenor: string;
  history: HistoryDay[];
}

interface FundingCostEntry {
  pair: string;
  implied3m: number;    // implied USD funding cost via 3m xccy swap
  implied1y: number;    // implied USD funding cost via 1y xccy swap
}

interface PairSummary {
  pair: string;
  avgBasis: number;     // average basis across all tenors
}

interface Summary {
  pairAverages: PairSummary[];
  widestPair: string;
  tightestPair: string;
  marketStress: 'low' | 'moderate' | 'elevated' | 'high';
}

interface CrossCurrencyBasisSwapResponse {
  spreads: SpreadEntry[];
  termStructure: TermStructureCurve[];
  history: HistorySeries[];
  fundingCost: FundingCostEntry[];
  summary: Summary;
  generatedAt: string;
}

// ── Pair configurations ──

interface PairConfig {
  pair: string;
  basis3m: number;      // typical 3M basis in bps (negative = USD funding premium)
  slopePerTenor: number; // how spread changes per tenor step (shorter tenors wider)
  vol: number;          // noise scale in bps
  usdRate3m: number;    // USD 3M reference rate %
  usdRate1y: number;    // USD 1Y reference rate %
}

const PAIR_CONFIGS: PairConfig[] = [
  { pair: 'EUR/USD', basis3m: -20,  slopePerTenor: 1.5,  vol: 3,   usdRate3m: 5.33, usdRate1y: 4.95 },
  { pair: 'JPY/USD', basis3m: -50,  slopePerTenor: 2.8,  vol: 6,   usdRate3m: 5.33, usdRate1y: 4.95 },
  { pair: 'GBP/USD', basis3m: -12,  slopePerTenor: 1.0,  vol: 2.5, usdRate3m: 5.33, usdRate1y: 4.95 },
  { pair: 'CHF/USD', basis3m: -28,  slopePerTenor: 1.8,  vol: 4,   usdRate3m: 5.33, usdRate1y: 4.95 },
  { pair: 'AUD/USD', basis3m: -8,   slopePerTenor: 0.7,  vol: 2,   usdRate3m: 5.33, usdRate1y: 4.95 },
  { pair: 'CAD/USD', basis3m: -5,   slopePerTenor: 0.5,  vol: 1.5, usdRate3m: 5.33, usdRate1y: 4.95 },
  { pair: 'KRW/USD', basis3m: -45,  slopePerTenor: 3.0,  vol: 7,   usdRate3m: 5.33, usdRate1y: 4.95 },
  { pair: 'CNH/USD', basis3m: -35,  slopePerTenor: 2.2,  vol: 5,   usdRate3m: 5.33, usdRate1y: 4.95 },
];

const TENORS = ['3m', '6m', '1y', '2y', '3y', '5y', '10y', '30y'] as const;
const TENOR_INDEX: Record<string, number> = {
  '3m': 0, '6m': 1, '1y': 2, '2y': 3, '3y': 4, '5y': 5, '10y': 6, '30y': 7,
};

// Term structure pairs for full term structure output
const TERM_STRUCTURE_PAIRS = ['EUR/USD', 'JPY/USD'];

// History pairs: key pairs with their monitoring tenor
const HISTORY_PAIRS = [
  { pair: 'EUR/USD', tenor: '3m' },
  { pair: 'JPY/USD', tenor: '3m' },
  { pair: 'GBP/USD', tenor: '3m' },
];

// ── Cache ──

const CACHE_TTL = 60 * 60_000;
let cache: { data: CrossCurrencyBasisSwapResponse | null; ts: number } = { data: null, ts: 0 };

// ── Helpers ──

const round = (v: number, d: number): number => { const f = 10 ** d; return Math.round(v * f) / f; };

// ── Data generation ──

function generate(): CrossCurrencyBasisSwapResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('xccy-basis-swap-' + day));

  // ── 1. Spreads ──

  const spreads: SpreadEntry[] = [];
  // Store spreads keyed by pair-tenor for lookups
  const spreadMap: Record<string, number> = {};

  for (const cfg of PAIR_CONFIGS) {
    // Per-pair daily jitter applied consistently across tenors
    const dailyShift = (rng() - 0.5) * cfg.vol * 0.5;

    for (const tenor of TENORS) {
      const idx = TENOR_INDEX[tenor];

      // Short tenors are wider (more negative); longer tenors tighten toward zero
      // basis3m is the anchor at the 3m point; each step toward longer tenors tightens
      const tenorAdjust = cfg.slopePerTenor * idx;
      const baseSpread = cfg.basis3m + tenorAdjust + dailyShift;
      const noise = (rng() - 0.5) * cfg.vol * 0.8;
      const spread = round(baseSpread + noise, 1);

      spreadMap[`${cfg.pair}-${tenor}`] = spread;

      // Daily, weekly, monthly changes
      const dailyChange = round((rng() - 0.5) * cfg.vol * 0.6, 1);
      const weeklyChange = round((rng() - 0.5) * cfg.vol * 1.4, 1);
      const monthlyChange = round((rng() - 0.5) * cfg.vol * 2.8, 1);

      spreads.push({
        pair: cfg.pair,
        tenor,
        spread,
        dailyChange,
        weeklyChange,
        monthlyChange,
      });
    }
  }

  // ── 2. Term Structure (EUR/USD and JPY/USD) ──

  const termStructure: TermStructureCurve[] = TERM_STRUCTURE_PAIRS.map(pair => {
    const cfg = PAIR_CONFIGS.find(c => c.pair === pair)!;
    const points: TermStructurePoint[] = TENORS.map(tenor => {
      const spread = spreadMap[`${pair}-${tenor}`];
      // Previous day spread: current minus daily change offset
      const prevNoise = (rng() - 0.5) * cfg.vol * 0.4;
      const previous = round(spread - prevNoise, 1);
      const change = round(spread - previous, 1);
      return { tenor, spread, previous, change };
    });
    return { pair, points };
  });

  // ── 3. History (20 days for key pairs at 3m tenor) ──

  const history: HistorySeries[] = HISTORY_PAIRS.map(({ pair, tenor }) => {
    const cfg = PAIR_CONFIGS.find(c => c.pair === pair)!;
    const currentSpread = spreadMap[`${pair}-${tenor}`];

    const days: HistoryDay[] = [];
    const today = new Date();

    // Walk backward from 20 days ago toward today, converging to current value
    let val = currentSpread + (rng() - 0.5) * cfg.vol * 3;
    for (let i = 19; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      // Mean-revert toward current spread
      val += (currentSpread - val) * 0.12 + (rng() - 0.5) * cfg.vol * 0.6;
      days.push({ date: dateStr, spread: round(val, 1) });
    }

    return { pair, tenor, history: days };
  });

  // ── 4. Funding Cost ──

  const fundingCost: FundingCostEntry[] = PAIR_CONFIGS.map(cfg => {
    const basis3m = spreadMap[`${cfg.pair}-3m`];
    const basis1y = spreadMap[`${cfg.pair}-1y`];

    // Implied USD funding cost = USD reference rate + basis spread / 100
    // A negative basis means it costs MORE to obtain USD via xccy swap
    const implied3m = round(cfg.usdRate3m + basis3m / 100, 2);
    const implied1y = round(cfg.usdRate1y + basis1y / 100, 2);

    return { pair: cfg.pair, implied3m, implied1y };
  });

  // ── 5. Summary ──

  // Average basis per pair (across all tenors)
  const pairAverages: PairSummary[] = PAIR_CONFIGS.map(cfg => {
    const pairSpreads = spreads.filter(s => s.pair === cfg.pair);
    const avg = pairSpreads.reduce((sum, s) => sum + s.spread, 0) / pairSpreads.length;
    return { pair: cfg.pair, avgBasis: round(avg, 1) };
  });

  // Widest = most negative average basis; tightest = least negative
  const sorted = [...pairAverages].sort((a, b) => a.avgBasis - b.avgBasis);
  const widestPair = sorted[0].pair;
  const tightestPair = sorted[sorted.length - 1].pair;

  // Market stress indicator based on average 3m basis across all pairs
  const all3mSpreads = PAIR_CONFIGS.map(cfg => spreadMap[`${cfg.pair}-3m`]);
  const avg3m = all3mSpreads.reduce((s, v) => s + v, 0) / all3mSpreads.length;
  const absAvg = Math.abs(avg3m);

  let marketStress: Summary['marketStress'];
  if (absAvg > 50) {
    marketStress = 'high';
  } else if (absAvg > 30) {
    marketStress = 'elevated';
  } else if (absAvg > 15) {
    marketStress = 'moderate';
  } else {
    marketStress = 'low';
  }

  const summary: Summary = {
    pairAverages,
    widestPair,
    tightestPair,
    marketStress,
  };

  return {
    spreads,
    termStructure,
    history,
    fundingCost,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CrossCurrencyBasisSwap] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate cross-currency basis swap data' });
  }
});

export default router;
