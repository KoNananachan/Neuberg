import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

type TradeType = 'STEEPENER' | 'FLATTENER' | 'BUTTERFLY' | 'BARBELL';
type Direction = 'LONG' | 'SHORT';
type Signal = 'BUY' | 'SELL' | 'HOLD';

interface TradeLeg {
  tenor: string;
  direction: Direction;
  weight: number;
}

interface ActiveStrategy {
  name: string;
  type: TradeType;
  legs: TradeLeg[];
  currentSpread: number;   // bps
  entryLevel: number;      // bps
  target: number;          // bps
  pnlBps: number;
  dv01: number;            // $
  carryRolldown: number;   // bps/month
  signal: Signal;
}

interface SpreadHistoryEntry {
  spreadName: string;
  date: string;
  value: number;           // bps
}

interface CarryAnalysisEntry {
  tenor: string;
  yield: number;           // %
  rolldown3m: number;      // bps
  rolldown6m: number;      // bps
  carry3m: number;         // bps
  carry6m: number;         // bps
  totalReturn3m: number;   // bps
}

interface CurveTradeSummary {
  best2s10s: number;       // current spread bps
  best5s30s: number;       // current spread bps
  butterflySpread: number; // bps
  avgCarry: number;        // bps
  topSignal: string;       // best trade name
  timestamp: string;
}

interface CurveTradeResponse {
  activeStrategies: ActiveStrategy[];
  spreadHistory: SpreadHistoryEntry[];
  carryAnalysis: CarryAnalysisEntry[];
  summary: CurveTradeSummary;
}

// ── Cache ──

let cache: { data: CurveTradeResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Strategy configuration ──

interface StrategyConfig {
  name: string;
  type: TradeType;
  legs: TradeLeg[];
  baseSpread: number;      // bps — realistic mid-2026 baseline
  spreadVol: number;       // bps — daily jitter range
  baseDV01: number;        // $ per bp
  baseCarry: number;       // bps/month
}

const STRATEGY_CONFIGS: StrategyConfig[] = [
  {
    name: '2s10s Steepener',
    type: 'STEEPENER',
    legs: [
      { tenor: '2Y', direction: 'SHORT', weight: 1.0 },
      { tenor: '10Y', direction: 'LONG', weight: 1.0 },
    ],
    baseSpread: 42,
    spreadVol: 12,
    baseDV01: 4850,
    baseCarry: 1.8,
  },
  {
    name: '5s30s Flattener',
    type: 'FLATTENER',
    legs: [
      { tenor: '5Y', direction: 'LONG', weight: 1.0 },
      { tenor: '30Y', direction: 'SHORT', weight: 1.0 },
    ],
    baseSpread: 58,
    spreadVol: 10,
    baseDV01: 7200,
    baseCarry: -0.6,
  },
  {
    name: '2s5s10s Butterfly',
    type: 'BUTTERFLY',
    legs: [
      { tenor: '2Y', direction: 'LONG', weight: 0.5 },
      { tenor: '5Y', direction: 'SHORT', weight: 1.0 },
      { tenor: '10Y', direction: 'LONG', weight: 0.5 },
    ],
    baseSpread: -12,
    spreadVol: 6,
    baseDV01: 3200,
    baseCarry: 0.4,
  },
  {
    name: '10s30s Steepener',
    type: 'STEEPENER',
    legs: [
      { tenor: '10Y', direction: 'SHORT', weight: 1.0 },
      { tenor: '30Y', direction: 'LONG', weight: 1.0 },
    ],
    baseSpread: 22,
    spreadVol: 8,
    baseDV01: 8500,
    baseCarry: 2.1,
  },
  {
    name: '3M-2Y Steepener',
    type: 'STEEPENER',
    legs: [
      { tenor: '3M', direction: 'SHORT', weight: 1.0 },
      { tenor: '2Y', direction: 'LONG', weight: 1.0 },
    ],
    baseSpread: -35,
    spreadVol: 15,
    baseDV01: 1950,
    baseCarry: -1.2,
  },
  {
    name: '5s10s Flattener',
    type: 'FLATTENER',
    legs: [
      { tenor: '5Y', direction: 'LONG', weight: 1.0 },
      { tenor: '10Y', direction: 'SHORT', weight: 1.0 },
    ],
    baseSpread: 18,
    spreadVol: 5,
    baseDV01: 3600,
    baseCarry: -0.3,
  },
  {
    name: '2s5s30s Butterfly',
    type: 'BUTTERFLY',
    legs: [
      { tenor: '2Y', direction: 'LONG', weight: 0.5 },
      { tenor: '5Y', direction: 'SHORT', weight: 1.0 },
      { tenor: '30Y', direction: 'LONG', weight: 0.5 },
    ],
    baseSpread: -8,
    spreadVol: 7,
    baseDV01: 5400,
    baseCarry: 0.9,
  },
  {
    name: '2s30s Steepener',
    type: 'STEEPENER',
    legs: [
      { tenor: '2Y', direction: 'SHORT', weight: 1.0 },
      { tenor: '30Y', direction: 'LONG', weight: 1.0 },
    ],
    baseSpread: 64,
    spreadVol: 14,
    baseDV01: 9800,
    baseCarry: 2.5,
  },
  {
    name: '5s10s30s Barbell',
    type: 'BARBELL',
    legs: [
      { tenor: '5Y', direction: 'LONG', weight: 0.5 },
      { tenor: '10Y', direction: 'SHORT', weight: 1.0 },
      { tenor: '30Y', direction: 'LONG', weight: 0.5 },
    ],
    baseSpread: 6,
    spreadVol: 5,
    baseDV01: 6100,
    baseCarry: 0.7,
  },
  {
    name: '3M-10Y Flattener',
    type: 'FLATTENER',
    legs: [
      { tenor: '3M', direction: 'LONG', weight: 1.0 },
      { tenor: '10Y', direction: 'SHORT', weight: 1.0 },
    ],
    baseSpread: 7,
    spreadVol: 18,
    baseDV01: 6800,
    baseCarry: -2.4,
  },
];

// ── Carry analysis configuration ──

interface TenorYieldConfig {
  tenor: string;
  baseYield: number;       // % — realistic mid-2026 curve
  baseRolldown3m: number;  // bps
  baseRolldown6m: number;  // bps
}

const TENOR_YIELD_CONFIGS: TenorYieldConfig[] = [
  { tenor: '2Y',  baseYield: 3.92, baseRolldown3m: 3.2,  baseRolldown6m: 6.8 },
  { tenor: '3Y',  baseYield: 3.88, baseRolldown3m: 4.5,  baseRolldown6m: 9.4 },
  { tenor: '5Y',  baseYield: 3.95, baseRolldown3m: 5.8,  baseRolldown6m: 12.1 },
  { tenor: '7Y',  baseYield: 4.08, baseRolldown3m: 6.2,  baseRolldown6m: 13.0 },
  { tenor: '10Y', baseYield: 4.22, baseRolldown3m: 4.8,  baseRolldown6m: 10.2 },
  { tenor: '15Y', baseYield: 4.38, baseRolldown3m: 3.5,  baseRolldown6m: 7.4 },
  { tenor: '20Y', baseYield: 4.50, baseRolldown3m: 2.8,  baseRolldown6m: 5.9 },
  { tenor: '30Y', baseYield: 4.55, baseRolldown3m: 1.5,  baseRolldown6m: 3.2 },
];

// ── Spread history configuration ──

const SPREAD_NAMES = ['2s10s', '5s30s', '2s5s10s Butterfly', '10s30s', '2s30s', '3M-10Y'];
const SPREAD_BASES: Record<string, number> = {
  '2s10s': 42,
  '5s30s': 58,
  '2s5s10s Butterfly': -12,
  '10s30s': 22,
  '2s30s': 64,
  '3M-10Y': 7,
};
const SPREAD_VOLS: Record<string, number> = {
  '2s10s': 10,
  '5s30s': 8,
  '2s5s10s Butterfly': 5,
  '10s30s': 6,
  '2s30s': 12,
  '3M-10Y': 16,
};

// ── Data generation ──

function generateActiveStrategies(rng: () => number): ActiveStrategy[] {
  return STRATEGY_CONFIGS.map((cfg) => {
    const spreadJitter = (rng() - 0.5) * cfg.spreadVol * 2;
    const currentSpread = Math.round((cfg.baseSpread + spreadJitter) * 10) / 10;

    // Entry level: where the trade was initiated (slightly different from current)
    const entryOffset = (rng() - 0.5) * cfg.spreadVol;
    const entryLevel = Math.round((cfg.baseSpread + entryOffset) * 10) / 10;

    // Target: directional expectation based on trade type
    let targetOffset: number;
    if (cfg.type === 'STEEPENER') {
      targetOffset = rng() * 15 + 5; // steepeners target wider spread
    } else if (cfg.type === 'FLATTENER') {
      targetOffset = -(rng() * 15 + 5); // flatteners target tighter spread
    } else {
      targetOffset = (rng() - 0.5) * 10; // butterflies/barbells mean-revert
    }
    const target = Math.round((entryLevel + targetOffset) * 10) / 10;

    // P&L in bps from entry
    const pnlBps = Math.round((currentSpread - entryLevel) * 10) / 10;

    // DV01 with jitter
    const dv01 = Math.round(cfg.baseDV01 + (rng() - 0.5) * cfg.baseDV01 * 0.1);

    // Carry & rolldown
    const carryJitter = (rng() - 0.5) * 1.0;
    const carryRolldown = Math.round((cfg.baseCarry + carryJitter) * 10) / 10;

    // Signal determination based on distance to target and P&L
    const distToTarget = target - currentSpread;
    const moveNeeded = Math.abs(distToTarget);
    let signal: Signal;
    if (moveNeeded > 10 && Math.sign(distToTarget) === Math.sign(target - entryLevel)) {
      signal = 'BUY';
    } else if (moveNeeded < 3 || pnlBps > 8) {
      signal = 'SELL';
    } else {
      signal = 'HOLD';
    }

    return {
      name: cfg.name,
      type: cfg.type,
      legs: cfg.legs,
      currentSpread,
      entryLevel,
      target,
      pnlBps,
      dv01,
      carryRolldown,
      signal,
    };
  });
}

function generateSpreadHistory(rng: () => number): SpreadHistoryEntry[] {
  const entries: SpreadHistoryEntry[] = [];
  const today = new Date();

  for (const spreadName of SPREAD_NAMES) {
    const base = SPREAD_BASES[spreadName];
    const vol = SPREAD_VOLS[spreadName];

    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7); // weekly data points
      const dateStr = d.toISOString().slice(0, 10);

      // Random walk with mean reversion
      const drift = (rng() - 0.5) * vol * 1.5;
      const trendComponent = i * (rng() - 0.5) * 1.2; // slight trend
      const value = Math.round((base + drift + trendComponent) * 10) / 10;

      entries.push({ spreadName, date: dateStr, value });
    }
  }

  return entries;
}

function generateCarryAnalysis(rng: () => number): CarryAnalysisEntry[] {
  return TENOR_YIELD_CONFIGS.map((cfg) => {
    const yieldJitter = (rng() - 0.5) * 0.12;
    const yld = Math.round((cfg.baseYield + yieldJitter) * 1000) / 1000;

    const roll3mJitter = (rng() - 0.5) * 1.5;
    const rolldown3m = Math.round((cfg.baseRolldown3m + roll3mJitter) * 10) / 10;

    const roll6mJitter = (rng() - 0.5) * 2.5;
    const rolldown6m = Math.round((cfg.baseRolldown6m + roll6mJitter) * 10) / 10;

    // Carry = coupon income minus financing cost, expressed in bps
    // Approximate: (yield - repo rate) * duration fraction
    const repoRate = 4.30; // SOFR-area funding rate
    const carryAnnual = (yld - repoRate) * 100; // bps per year
    const carry3m = Math.round((carryAnnual / 4 + (rng() - 0.5) * 1.0) * 10) / 10;
    const carry6m = Math.round((carryAnnual / 2 + (rng() - 0.5) * 1.5) * 10) / 10;

    // Total return = carry + rolldown
    const totalReturn3m = Math.round((carry3m + rolldown3m) * 10) / 10;

    return {
      tenor: cfg.tenor,
      yield: yld,
      rolldown3m,
      rolldown6m,
      carry3m,
      carry6m,
      totalReturn3m,
    };
  });
}

function generateCurveTradeData(): CurveTradeResponse {
  const rng = seededRandom('curve-trade');

  const activeStrategies = generateActiveStrategies(rng);
  const spreadHistory = generateSpreadHistory(rng);
  const carryAnalysis = generateCarryAnalysis(rng);

  // Summary
  const s2s10s = activeStrategies.find((s) => s.name === '2s10s Steepener');
  const s5s30s = activeStrategies.find((s) => s.name === '5s30s Flattener');
  const butterfly = activeStrategies.find((s) => s.name === '2s5s10s Butterfly');

  const best2s10s = s2s10s ? s2s10s.currentSpread : 0;
  const best5s30s = s5s30s ? s5s30s.currentSpread : 0;
  const butterflySpread = butterfly ? butterfly.currentSpread : 0;

  // Average carry across all strategies
  const avgCarry = Math.round(
    (activeStrategies.reduce((sum, s) => sum + s.carryRolldown, 0) / activeStrategies.length) * 10
  ) / 10;

  // Top signal: the strategy with the strongest BUY signal or highest P&L
  const buyStrategies = activeStrategies.filter((s) => s.signal === 'BUY');
  let topSignal: string;
  if (buyStrategies.length > 0) {
    // Pick the BUY with the highest absolute distance to target
    topSignal = buyStrategies.reduce((best, s) =>
      Math.abs(s.target - s.currentSpread) > Math.abs(best.target - best.currentSpread) ? s : best
    ).name;
  } else {
    // Fall back to highest P&L trade
    topSignal = activeStrategies.reduce((best, s) =>
      s.pnlBps > best.pnlBps ? s : best
    ).name;
  }

  const summary: CurveTradeSummary = {
    best2s10s,
    best5s30s,
    butterflySpread,
    avgCarry,
    topSignal,
    timestamp: new Date().toISOString(),
  };

  return { activeStrategies, spreadHistory, carryAnalysis, summary };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateCurveTradeData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CurveTrade] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate curve trade monitor data' });
  }
});

export default router;
