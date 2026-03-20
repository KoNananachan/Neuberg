import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface CalendarSpread {
  commodity: string;
  code: string;
  frontMonth: string;
  deferredMonth: string;
  spread: number;
  structure: 'CONTANGO' | 'BACKWARDATION';
  change1d: number;
  change1w: number;
}

interface CrackSpread {
  name: string;
  description: string;
  value: number;
  change1d: number;
  change1w: number;
  unit: string;
}

interface CrushSpread {
  name: string;
  value: number;
  soybeanPrice: number;
  soybeanMealPrice: number;
  soybeanOilPrice: number;
  change1d: number;
  unit: string;
}

interface SparkSpread {
  region: string;
  value: number;
  gasCost: number;
  powerPrice: number;
  heatRate: number;
  change1d: number;
  unit: string;
}

interface InterCommoditySpread {
  name: string;
  description: string;
  value: number;
  change1d: number;
  change1w: number;
  unit: string;
  signal: 'WIDE' | 'NARROW' | 'NEUTRAL';
}

interface TermStructurePoint {
  commodity: string;
  tenor: string;
  price: number;
  spreadToSpot: number;
}

interface SeasonalPattern {
  commodity: string;
  month: string;
  currentSpread: number;
  fiveYrAvgSpread: number;
  deviation: number;
}

interface SpreadTrade {
  name: string;
  strategy: string;
  entry: number;
  target: number;
  stop: number;
  unit: string;
  rationale: string;
  riskReward: number;
}

interface CommoditySpreadResponse {
  calendarSpreads: CalendarSpread[];
  crackSpreads: CrackSpread[];
  crushSpreads: CrushSpread[];
  sparkSpreads: SparkSpread[];
  interCommodity: InterCommoditySpread[];
  termStructure: TermStructurePoint[];
  seasonalPatterns: SeasonalPattern[];
  spreadTrades: SpreadTrade[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: CommoditySpreadResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Calendar spread configuration ──

interface CalendarSpreadConfig {
  commodity: string;
  code: string;
  frontMonth: string;
  deferredMonth: string;
  baseSpread: number;
  volatility: number;
  structureBias: 'CONTANGO' | 'BACKWARDATION';
}

const CALENDAR_SPREAD_CONFIGS: CalendarSpreadConfig[] = [
  { commodity: 'WTI Crude Oil', code: 'CL', frontMonth: 'CLN5', deferredMonth: 'CLQ5', baseSpread: -0.85, volatility: 0.45, structureBias: 'BACKWARDATION' },
  { commodity: 'Brent Crude Oil', code: 'CO', frontMonth: 'CON5', deferredMonth: 'COQ5', baseSpread: -0.72, volatility: 0.40, structureBias: 'BACKWARDATION' },
  { commodity: 'Henry Hub Natural Gas', code: 'NG', frontMonth: 'NGN5', deferredMonth: 'NGQ5', baseSpread: 0.12, volatility: 0.15, structureBias: 'CONTANGO' },
  { commodity: 'Gold', code: 'GC', frontMonth: 'GCQ5', deferredMonth: 'GCZ5', baseSpread: 8.50, volatility: 3.0, structureBias: 'CONTANGO' },
  { commodity: 'Copper', code: 'HG', frontMonth: 'HGN5', deferredMonth: 'HGU5', baseSpread: -0.015, volatility: 0.012, structureBias: 'BACKWARDATION' },
  { commodity: 'Soybeans', code: 'ZS', frontMonth: 'ZSN5', deferredMonth: 'ZSX5', baseSpread: -18.5, volatility: 12.0, structureBias: 'BACKWARDATION' },
  { commodity: 'Corn', code: 'ZC', frontMonth: 'ZCN5', deferredMonth: 'ZCZ5', baseSpread: 8.25, volatility: 5.0, structureBias: 'CONTANGO' },
  { commodity: 'Wheat', code: 'ZW', frontMonth: 'ZWN5', deferredMonth: 'ZWZ5', baseSpread: 12.50, volatility: 8.0, structureBias: 'CONTANGO' },
];

// ── Crack spread configuration ──

interface CrackSpreadConfig {
  name: string;
  description: string;
  baseValue: number;
  volatility: number;
  unit: string;
}

const CRACK_SPREAD_CONFIGS: CrackSpreadConfig[] = [
  { name: '3-2-1 Crack Spread', description: '2 bbl gasoline + 1 bbl heating oil vs 3 bbl crude', baseValue: 28.50, volatility: 5.0, unit: '$/bbl' },
  { name: 'Gasoline Crack', description: 'RBOB gasoline vs WTI crude', baseValue: 22.80, volatility: 4.5, unit: '$/bbl' },
  { name: 'Heating Oil Crack', description: 'Heating oil vs WTI crude', baseValue: 35.20, volatility: 6.0, unit: '$/bbl' },
];

// ── Crush spread configuration ──

interface CrushSpreadConfig {
  name: string;
  baseSoybeanPrice: number;
  baseMealPrice: number;
  baseOilPrice: number;
  baseSpreadValue: number;
  volatility: number;
  unit: string;
}

const CRUSH_SPREAD_CONFIGS: CrushSpreadConfig[] = [
  { name: 'Soybean Crush Spread', baseSoybeanPrice: 1185.0, baseMealPrice: 345.0, baseOilPrice: 48.50, baseSpreadValue: 1.65, volatility: 0.35, unit: '$/bu' },
];

// ── Spark spread configuration ──

interface SparkSpreadConfig {
  region: string;
  basePowerPrice: number;
  baseGasCost: number;
  baseHeatRate: number;
  volatility: number;
}

const SPARK_SPREAD_CONFIGS: SparkSpreadConfig[] = [
  { region: 'PJM (Mid-Atlantic)', basePowerPrice: 42.50, baseGasCost: 18.20, baseHeatRate: 7200, volatility: 8.0 },
  { region: 'ERCOT (Texas)', basePowerPrice: 38.80, baseGasCost: 16.50, baseHeatRate: 7000, volatility: 12.0 },
  { region: 'CAISO (California)', basePowerPrice: 52.30, baseGasCost: 22.10, baseHeatRate: 7500, volatility: 10.0 },
  { region: 'NYISO (New York)', basePowerPrice: 48.60, baseGasCost: 20.40, baseHeatRate: 7350, volatility: 9.0 },
  { region: 'SPP (Central US)', basePowerPrice: 32.40, baseGasCost: 14.80, baseHeatRate: 6900, volatility: 7.5 },
];

// ── Inter-commodity spread configuration ──

interface InterCommodityConfig {
  name: string;
  description: string;
  baseValue: number;
  volatility: number;
  unit: string;
  wideThreshold: number;
  narrowThreshold: number;
}

const INTER_COMMODITY_CONFIGS: InterCommodityConfig[] = [
  { name: 'Brent-WTI Spread', description: 'Brent crude oil premium over WTI', baseValue: 4.25, volatility: 1.2, unit: '$/bbl', wideThreshold: 5.5, narrowThreshold: 3.0 },
  { name: 'Gold/Silver Ratio', description: 'Gold price divided by silver price', baseValue: 82.5, volatility: 4.0, unit: 'ratio', wideThreshold: 85.0, narrowThreshold: 75.0 },
  { name: 'Corn-Wheat Spread', description: 'Wheat premium over corn', baseValue: 145.0, volatility: 25.0, unit: 'cents/bu', wideThreshold: 180.0, narrowThreshold: 100.0 },
  { name: 'HH-JKM LNG Spread', description: 'JKM Asian LNG premium over Henry Hub', baseValue: 8.50, volatility: 3.0, unit: '$/MMBtu', wideThreshold: 12.0, narrowThreshold: 5.0 },
];

// ── Term structure configuration ──

interface TermStructureCommodityConfig {
  commodity: string;
  spotPrice: number;
  monthlyCarry: number;
  volatility: number;
}

const TERM_STRUCTURE_CONFIGS: TermStructureCommodityConfig[] = [
  { commodity: 'WTI Crude', spotPrice: 78.50, monthlyCarry: -0.35, volatility: 0.80 },
  { commodity: 'Brent Crude', spotPrice: 82.75, monthlyCarry: -0.30, volatility: 0.75 },
  { commodity: 'Henry Hub NG', spotPrice: 2.85, monthlyCarry: 0.08, volatility: 0.12 },
  { commodity: 'Gold', spotPrice: 2340.0, monthlyCarry: 3.50, volatility: 8.0 },
  { commodity: 'Copper', spotPrice: 4.52, monthlyCarry: -0.005, volatility: 0.04 },
  { commodity: 'Soybeans', spotPrice: 1185.0, monthlyCarry: 4.50, volatility: 10.0 },
];

const TERM_TENORS = ['1M', '2M', '3M', '6M', '9M', '12M', '18M', '24M'] as const;
const TENOR_MONTHS: Record<string, number> = { '1M': 1, '2M': 2, '3M': 3, '6M': 6, '9M': 9, '12M': 12, '18M': 18, '24M': 24 };

// ── Seasonal pattern configuration ──

const SEASONAL_COMMODITIES = ['WTI Crude', 'Natural Gas', 'Corn', 'Soybeans', 'Wheat', 'Gold'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

interface SeasonalBaseConfig {
  commodity: string;
  monthlyAvgs: number[];
}

const SEASONAL_BASE_CONFIGS: SeasonalBaseConfig[] = [
  { commodity: 'WTI Crude', monthlyAvgs: [-0.50, -0.30, 0.20, 0.85, 1.10, 0.75, 0.40, -0.20, -0.60, -0.80, -0.45, -0.15] },
  { commodity: 'Natural Gas', monthlyAvgs: [0.35, 0.25, -0.10, -0.30, -0.15, 0.10, 0.45, 0.60, 0.30, 0.15, 0.25, 0.40] },
  { commodity: 'Corn', monthlyAvgs: [-5.0, -3.0, 2.0, 8.0, 12.0, 15.0, 10.0, -5.0, -12.0, -15.0, -8.0, -4.0] },
  { commodity: 'Soybeans', monthlyAvgs: [-8.0, -5.0, 3.0, 10.0, 15.0, 18.0, 12.0, -8.0, -18.0, -20.0, -12.0, -6.0] },
  { commodity: 'Wheat', monthlyAvgs: [-3.0, -2.0, 5.0, 10.0, 14.0, 8.0, -2.0, -8.0, -10.0, -6.0, -4.0, -2.0] },
  { commodity: 'Gold', monthlyAvgs: [2.0, 1.5, 0.5, -0.5, -1.0, -0.8, 0.2, 1.0, 2.5, 1.8, 0.8, 1.5] },
];

// ── Spread trade configuration ──

interface SpreadTradeConfig {
  name: string;
  strategy: string;
  baseEntry: number;
  baseTarget: number;
  baseStop: number;
  unit: string;
  rationale: string;
  volatility: number;
}

const SPREAD_TRADE_CONFIGS: SpreadTradeConfig[] = [
  { name: 'Long WTI Calendar Spread', strategy: 'Buy CLN5 / Sell CLZ5', baseEntry: -1.20, baseTarget: 0.50, baseStop: -2.50, unit: '$/bbl', rationale: 'Summer driving season demand to tighten front end', volatility: 0.30 },
  { name: 'Short Brent-WTI', strategy: 'Sell CO-CL Spread', baseEntry: 4.80, baseTarget: 3.20, baseStop: 5.80, unit: '$/bbl', rationale: 'US export capacity expansion narrowing Atlantic arb', volatility: 0.50 },
  { name: 'Long 3-2-1 Crack', strategy: 'Buy 2 RBOB + 1 HO / Sell 3 WTI', baseEntry: 26.50, baseTarget: 34.00, baseStop: 22.00, unit: '$/bbl', rationale: 'Refinery turnaround season ending, product supply tightening', volatility: 2.0 },
  { name: 'Long Gold/Silver Ratio', strategy: 'Buy Gold / Sell Silver', baseEntry: 80.50, baseTarget: 88.00, baseStop: 76.00, unit: 'ratio', rationale: 'Risk-off positioning as macro uncertainty rises', volatility: 2.0 },
  { name: 'Short Corn-Wheat Spread', strategy: 'Buy Corn / Sell Wheat', baseEntry: 155.0, baseTarget: 110.0, baseStop: 185.0, unit: 'cents/bu', rationale: 'Wheat supply concerns easing with favorable weather', volatility: 10.0 },
  { name: 'Long NG Calendar Q1/Q3', strategy: 'Buy NGF6 / Sell NGN6', baseEntry: 1.20, baseTarget: 2.00, baseStop: 0.70, unit: '$/MMBtu', rationale: 'Winter heating demand premium vs summer shoulder', volatility: 0.20 },
  { name: 'Long Soybean Crush', strategy: 'Buy Meal+Oil / Sell Beans', baseEntry: 1.50, baseTarget: 2.10, baseStop: 1.10, unit: '$/bu', rationale: 'Strong meal demand from livestock sector', volatility: 0.15 },
  { name: 'Long HH-JKM Spread', strategy: 'Buy JKM / Sell HH', baseEntry: 7.80, baseTarget: 12.50, baseStop: 5.50, unit: '$/MMBtu', rationale: 'Asian LNG restocking ahead of winter', volatility: 1.5 },
];

// ── Data generation ──

function generateCalendarSpreads(rng: () => number): CalendarSpread[] {
  return CALENDAR_SPREAD_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const spread = Math.round((cfg.baseSpread + jitter) * 100) / 100;
    const structure = spread < 0 ? 'BACKWARDATION' : 'CONTANGO';
    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.6 * 100) / 100;
    const change1w = Math.round((rng() - 0.5) * cfg.volatility * 1.5 * 100) / 100;

    return {
      commodity: cfg.commodity,
      code: cfg.code,
      frontMonth: cfg.frontMonth,
      deferredMonth: cfg.deferredMonth,
      spread,
      structure,
      change1d,
      change1w,
    };
  });
}

function generateCrackSpreads(rng: () => number): CrackSpread[] {
  return CRACK_SPREAD_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const value = Math.round((cfg.baseValue + jitter) * 100) / 100;
    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.4 * 100) / 100;
    const change1w = Math.round((rng() - 0.5) * cfg.volatility * 1.0 * 100) / 100;

    return {
      name: cfg.name,
      description: cfg.description,
      value,
      change1d,
      change1w,
      unit: cfg.unit,
    };
  });
}

function generateCrushSpreads(rng: () => number): CrushSpread[] {
  return CRUSH_SPREAD_CONFIGS.map((cfg) => {
    const soybeanJitter = (rng() - 0.5) * 40;
    const soybeanPrice = Math.round((cfg.baseSoybeanPrice + soybeanJitter) * 100) / 100;

    const mealJitter = (rng() - 0.5) * 15;
    const soybeanMealPrice = Math.round((cfg.baseMealPrice + mealJitter) * 100) / 100;

    const oilJitter = (rng() - 0.5) * 3;
    const soybeanOilPrice = Math.round((cfg.baseOilPrice + oilJitter) * 100) / 100;

    // Crush spread = (meal value + oil value) - bean cost, simplified
    const spreadJitter = (rng() - 0.5) * cfg.volatility * 2;
    const value = Math.round((cfg.baseSpreadValue + spreadJitter) * 100) / 100;

    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.5 * 100) / 100;

    return {
      name: cfg.name,
      value,
      soybeanPrice,
      soybeanMealPrice,
      soybeanOilPrice,
      change1d,
      unit: cfg.unit,
    };
  });
}

function generateSparkSpreads(rng: () => number): SparkSpread[] {
  return SPARK_SPREAD_CONFIGS.map((cfg) => {
    const powerJitter = (rng() - 0.5) * cfg.volatility * 2;
    const powerPrice = Math.round((cfg.basePowerPrice + powerJitter) * 100) / 100;

    const gasJitter = (rng() - 0.5) * cfg.volatility * 0.8;
    const gasCost = Math.round((cfg.baseGasCost + gasJitter) * 100) / 100;

    const value = Math.round((powerPrice - gasCost) * 100) / 100;

    const heatRateJitter = Math.floor((rng() - 0.5) * 400);
    const heatRate = cfg.baseHeatRate + heatRateJitter;

    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.5 * 100) / 100;

    return {
      region: cfg.region,
      value,
      gasCost,
      powerPrice,
      heatRate,
      change1d,
      unit: '$/MWh',
    };
  });
}

function generateInterCommoditySpreads(rng: () => number): InterCommoditySpread[] {
  return INTER_COMMODITY_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const value = Math.round((cfg.baseValue + jitter) * 100) / 100;

    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.4 * 100) / 100;
    const change1w = Math.round((rng() - 0.5) * cfg.volatility * 1.0 * 100) / 100;

    let signal: 'WIDE' | 'NARROW' | 'NEUTRAL';
    if (value > cfg.wideThreshold) {
      signal = 'WIDE';
    } else if (value < cfg.narrowThreshold) {
      signal = 'NARROW';
    } else {
      signal = 'NEUTRAL';
    }

    return {
      name: cfg.name,
      description: cfg.description,
      value,
      change1d,
      change1w,
      unit: cfg.unit,
      signal,
    };
  });
}

function generateTermStructure(rng: () => number): TermStructurePoint[] {
  const points: TermStructurePoint[] = [];

  for (const cfg of TERM_STRUCTURE_CONFIGS) {
    for (const tenor of TERM_TENORS) {
      const months = TENOR_MONTHS[tenor];
      const carryComponent = cfg.monthlyCarry * months;
      const jitter = (rng() - 0.5) * cfg.volatility * Math.sqrt(months / 12);
      const price = Math.round((cfg.spotPrice + carryComponent + jitter) * 100) / 100;
      const spreadToSpot = Math.round((price - cfg.spotPrice) * 100) / 100;

      points.push({
        commodity: cfg.commodity,
        tenor,
        price,
        spreadToSpot,
      });
    }
  }

  return points;
}

function generateSeasonalPatterns(rng: () => number): SeasonalPattern[] {
  const patterns: SeasonalPattern[] = [];

  for (const cfg of SEASONAL_BASE_CONFIGS) {
    for (let i = 0; i < MONTHS.length; i++) {
      const fiveYrAvgSpread = cfg.monthlyAvgs[i];
      const currentJitter = (rng() - 0.5) * Math.abs(fiveYrAvgSpread || 1) * 0.6;
      const currentSpread = Math.round((fiveYrAvgSpread + currentJitter) * 100) / 100;
      const deviation = Math.round((currentSpread - fiveYrAvgSpread) * 100) / 100;

      patterns.push({
        commodity: cfg.commodity,
        month: MONTHS[i],
        currentSpread,
        fiveYrAvgSpread,
        deviation,
      });
    }
  }

  return patterns;
}

function generateSpreadTrades(rng: () => number): SpreadTrade[] {
  return SPREAD_TRADE_CONFIGS.map((cfg) => {
    const entryJitter = (rng() - 0.5) * cfg.volatility * 0.5;
    const entry = Math.round((cfg.baseEntry + entryJitter) * 100) / 100;

    const targetJitter = (rng() - 0.5) * cfg.volatility * 0.3;
    const target = Math.round((cfg.baseTarget + targetJitter) * 100) / 100;

    const stopJitter = (rng() - 0.5) * cfg.volatility * 0.3;
    const stop = Math.round((cfg.baseStop + stopJitter) * 100) / 100;

    const reward = Math.abs(target - entry);
    const risk = Math.abs(stop - entry);
    const riskReward = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

    return {
      name: cfg.name,
      strategy: cfg.strategy,
      entry,
      target,
      stop,
      unit: cfg.unit,
      rationale: cfg.rationale,
      riskReward,
    };
  });
}

function generateCommoditySpreadData(): CommoditySpreadResponse {
  const rng = seededRandom('commodity-spread');

  const calendarSpreads = generateCalendarSpreads(rng);
  const crackSpreads = generateCrackSpreads(rng);
  const crushSpreads = generateCrushSpreads(rng);
  const sparkSpreads = generateSparkSpreads(rng);
  const interCommodity = generateInterCommoditySpreads(rng);
  const termStructure = generateTermStructure(rng);
  const seasonalPatterns = generateSeasonalPatterns(rng);
  const spreadTrades = generateSpreadTrades(rng);

  return {
    calendarSpreads,
    crackSpreads,
    crushSpreads,
    sparkSpreads,
    interCommodity,
    termStructure,
    seasonalPatterns,
    spreadTrades,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateCommoditySpreadData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CommoditySpread] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate commodity spread data' });
  }
});

export default router;
