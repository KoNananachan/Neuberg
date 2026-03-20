import { Router } from 'express';
import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Helpers ──

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function pick<T>(arr: T[], rng: () => number): T { return arr[Math.floor(rng() * arr.length)]; }

// ── Types ──

interface CalendarSpread {
  commodity: string;
  frontMonth: number;
  secondMonth: number;
  spread: number;
  structure: 'CONTANGO' | 'BACKWARDATION';
  change1W: number;
  change1M: number;
}

interface CrackSpread {
  name: string;
  value: number;
  change: number;
  avg1M: number;
  percentile: number;
}

interface CrushSpread {
  name: string;
  value: number;
  change: number;
  avg1M: number;
}

interface InterCommoditySpread {
  name: string;
  value: number;
  historicalAvg: number;
  zScore: number;
}

interface CommoditySpreadsResponse {
  calendarSpreads: CalendarSpread[];
  crackSpreads: CrackSpread[];
  crushSpreads: CrushSpread[];
  interCommoditySpreads: InterCommoditySpread[];
  timestamp: string;
}

// ── Base data configs ──

interface CalendarCfg {
  commodity: string;
  baseFront: number;
  baseSecond: number;
  vol: number;
  bias: 'CONTANGO' | 'BACKWARDATION';
}

const CALENDAR_CFGS: CalendarCfg[] = [
  { commodity: 'WTI Crude',    baseFront: 78.45, baseSecond: 77.82, vol: 1.8,   bias: 'BACKWARDATION' },
  { commodity: 'Brent Crude',  baseFront: 82.30, baseSecond: 81.55, vol: 1.6,   bias: 'BACKWARDATION' },
  { commodity: 'Natural Gas',  baseFront: 2.85,  baseSecond: 3.02,  vol: 0.25,  bias: 'CONTANGO' },
  { commodity: 'Gold',         baseFront: 2342.0,baseSecond: 2350.5,vol: 18.0,  bias: 'CONTANGO' },
  { commodity: 'Silver',       baseFront: 28.45, baseSecond: 28.62, vol: 0.60,  bias: 'CONTANGO' },
  { commodity: 'Copper',       baseFront: 4.52,  baseSecond: 4.48,  vol: 0.08,  bias: 'BACKWARDATION' },
  { commodity: 'Corn',         baseFront: 445.0, baseSecond: 452.5, vol: 8.0,   bias: 'CONTANGO' },
  { commodity: 'Wheat',        baseFront: 585.0, baseSecond: 592.0, vol: 10.0,  bias: 'CONTANGO' },
  { commodity: 'Soybeans',     baseFront: 1185.0,baseSecond: 1172.0,vol: 15.0,  bias: 'BACKWARDATION' },
];

interface CrackCfg {
  name: string;
  baseValue: number;
  vol: number;
  baseAvg: number;
}

const CRACK_CFGS: CrackCfg[] = [
  { name: '3-2-1 Crack',      baseValue: 28.50, vol: 4.5, baseAvg: 26.80 },
  { name: '5-3-2 Crack',      baseValue: 24.20, vol: 3.8, baseAvg: 22.90 },
  { name: 'Gasoline Crack',   baseValue: 22.80, vol: 5.0, baseAvg: 21.50 },
  { name: 'Heating Oil Crack', baseValue: 35.20, vol: 5.5, baseAvg: 33.40 },
  { name: 'Jet Fuel Crack',   baseValue: 32.60, vol: 4.8, baseAvg: 30.80 },
];

interface CrushCfg {
  name: string;
  baseValue: number;
  vol: number;
  baseAvg: number;
}

const CRUSH_CFGS: CrushCfg[] = [
  { name: 'Soybean Crush',  baseValue: 1.65, vol: 0.35, baseAvg: 1.48 },
  { name: 'Corn Ethanol',   baseValue: 0.82, vol: 0.18, baseAvg: 0.75 },
  { name: 'Sugar Ethanol',  baseValue: 0.45, vol: 0.12, baseAvg: 0.40 },
];

interface InterCfg {
  name: string;
  baseValue: number;
  vol: number;
  histAvg: number;
  stdDev: number;
}

const INTER_CFGS: InterCfg[] = [
  { name: 'Gold/Silver Ratio',       baseValue: 82.30, vol: 3.5,  histAvg: 78.0, stdDev: 6.0 },
  { name: 'WTI/Brent Spread',        baseValue: -3.85, vol: 1.2,  histAvg: -4.50, stdDev: 1.8 },
  { name: 'Corn/Wheat Ratio',        baseValue: 0.76,  vol: 0.05, histAvg: 0.72, stdDev: 0.08 },
  { name: 'Natural Gas/Crude Ratio',  baseValue: 0.036, vol: 0.008, histAvg: 0.045, stdDev: 0.012 },
];

// ── Data generation ──

function generateData(): CommoditySpreadsResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('commodity-spreads-' + day));

  // Calendar spreads
  const calendarSpreads: CalendarSpread[] = CALENDAR_CFGS.map(cfg => {
    const frontJitter = (rng() - 0.5) * cfg.vol * 2;
    const secondJitter = (rng() - 0.5) * cfg.vol * 2;
    const frontMonth = r2(cfg.baseFront + frontJitter);
    const secondMonth = r2(cfg.baseSecond + secondJitter);
    const spread = r2(frontMonth - secondMonth);
    const structure: 'CONTANGO' | 'BACKWARDATION' = spread < 0 ? 'CONTANGO' : 'BACKWARDATION';
    const change1W = r2((rng() - 0.5) * cfg.vol * 0.6);
    const change1M = r2((rng() - 0.5) * cfg.vol * 1.4);
    return { commodity: cfg.commodity, frontMonth, secondMonth, spread, structure, change1W, change1M };
  });

  // Crack spreads
  const crackSpreads: CrackSpread[] = CRACK_CFGS.map(cfg => {
    const jitter = (rng() - 0.5) * cfg.vol * 2;
    const value = r2(cfg.baseValue + jitter);
    const change = r2((rng() - 0.5) * cfg.vol * 0.5);
    const avgJitter = (rng() - 0.5) * cfg.vol * 0.3;
    const avg1M = r2(cfg.baseAvg + avgJitter);
    const percentile = Math.min(99, Math.max(1, Math.round(rng() * 100)));
    return { name: cfg.name, value, change, avg1M, percentile };
  });

  // Crush spreads
  const crushSpreads: CrushSpread[] = CRUSH_CFGS.map(cfg => {
    const jitter = (rng() - 0.5) * cfg.vol * 2;
    const value = r2(cfg.baseValue + jitter);
    const change = r2((rng() - 0.5) * cfg.vol * 0.5);
    const avgJitter = (rng() - 0.5) * cfg.vol * 0.3;
    const avg1M = r2(cfg.baseAvg + avgJitter);
    return { name: cfg.name, value, change, avg1M };
  });

  // Inter-commodity spreads
  const interCommoditySpreads: InterCommoditySpread[] = INTER_CFGS.map(cfg => {
    const jitter = (rng() - 0.5) * cfg.vol * 2;
    const value = r4(cfg.baseValue + jitter);
    const histJitter = (rng() - 0.5) * cfg.vol * 0.2;
    const historicalAvg = r4(cfg.histAvg + histJitter);
    const zScore = r2((value - historicalAvg) / cfg.stdDev);
    return { name: cfg.name, value, historicalAvg, zScore };
  });

  return {
    calendarSpreads,
    crackSpreads,
    crushSpreads,
    interCommoditySpreads,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }

    const data = generateData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CommoditySpreads] Error:', message);
    if (cache) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate commodity spreads data' });
  }
});

export default router;
