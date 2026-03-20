import { Router } from 'express';

const router = Router();

// ── Deterministic seeded PRNG ──

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

interface CreditIndex {
  name: string;
  spread: number;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
  ytdChange: number;
  oneYearRange: { low: number; high: number };
}

interface DefaultRateEntry {
  category: string;
  current: number;
  previousQuarter: number;
  tenYearAvg: number;
}

interface RatingActions {
  netRatingDrift: number;
  upgradeCount: number;
  downgradeCount: number;
  fallenAngels: number;
  risingStars: number;
}

interface StressIndicator {
  name: string;
  level: number;
  dailyChange: number;
  weeklyChange: number;
  signal: string;
}

interface RegionComparison {
  region: string;
  igSpread: number;
  hySpread: number;
  defaultRate: number;
  outlook: string;
}

interface GlobalCreditMonitorResponse {
  spreads: CreditIndex[];
  defaultRates: DefaultRateEntry[];
  ratingActions: RatingActions;
  stressIndicators: StressIndicator[];
  regionComparison: RegionComparison[];
  generatedAt: string;
}

// ── Static templates ──

const SPREAD_INDEX_TEMPLATE = [
  { name: 'US IG (Bloomberg US Agg Corporate)',  baseSpread: 102, rangeLow: 85,  rangeHigh: 120 },
  { name: 'US HY (Bloomberg US HY)',             baseSpread: 375, rangeLow: 300, rangeHigh: 450 },
  { name: 'EUR IG (iBoxx EUR IG)',               baseSpread: 110, rangeLow: 90,  rangeHigh: 130 },
  { name: 'EUR HY (iBoxx EUR HY)',               baseSpread: 425, rangeLow: 350, rangeHigh: 500 },
  { name: 'EM Corporate',                        baseSpread: 325, rangeLow: 250, rangeHigh: 400 },
  { name: 'Asia IG',                             baseSpread: 118, rangeLow: 95,  rangeHigh: 145 },
  { name: 'Asia HY',                             baseSpread: 480, rangeLow: 380, rangeHigh: 580 },
  { name: 'US Leveraged Loans',                  baseSpread: 440, rangeLow: 350, rangeHigh: 530 },
];

const DEFAULT_RATE_TEMPLATE = [
  { category: 'Investment Grade', baseCurrent: 0.05, basePrevQ: 0.04, baseTenYrAvg: 0.06 },
  { category: 'High Yield (Overall)', baseCurrent: 2.8, basePrevQ: 2.5, baseTenYrAvg: 3.2 },
  { category: 'BB', baseCurrent: 0.6, basePrevQ: 0.5, baseTenYrAvg: 0.8 },
  { category: 'B', baseCurrent: 3.2, basePrevQ: 2.9, baseTenYrAvg: 3.8 },
  { category: 'CCC', baseCurrent: 11.5, basePrevQ: 10.2, baseTenYrAvg: 12.8 },
];

const STRESS_INDICATOR_TEMPLATE = [
  { name: 'CDX IG Spread',      baseLevel: 58,  rangeLow: 50,  rangeHigh: 70 },
  { name: 'CDX HY Spread',      baseLevel: 395, rangeLow: 350, rangeHigh: 450 },
  { name: 'LCDX Spread',        baseLevel: 310, rangeLow: 260, rangeHigh: 370 },
  { name: 'iTraxx Europe',      baseLevel: 65,  rangeLow: 50,  rangeHigh: 85 },
  { name: 'iTraxx Crossover',   baseLevel: 340, rangeLow: 280, rangeHigh: 420 },
];

const REGION_TEMPLATE = [
  { region: 'US',     baseIG: 102, baseHY: 375, baseDefault: 2.8 },
  { region: 'Europe', baseIG: 110, baseHY: 425, baseDefault: 2.2 },
  { region: 'Asia',   baseIG: 118, baseHY: 480, baseDefault: 1.9 },
  { region: 'EM',     baseIG: 155, baseHY: 520, baseDefault: 3.5 },
];

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cacheData: GlobalCreditMonitorResponse | null = null;
let cacheTime = 0;

// ── Data generation ──

function generate(): GlobalCreditMonitorResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('global-credit-monitor-' + today));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  // ── Credit index spreads ──
  const spreads: CreditIndex[] = SPREAD_INDEX_TEMPLATE.map(tmpl => {
    const spread = Math.round(jitter(tmpl.baseSpread, 0.08));
    const isHY = tmpl.baseSpread > 200;
    const dailyChange = round1((rng() - 0.5) * 2 * (isHY ? 8 : 3));
    const weeklyChange = round1((rng() - 0.5) * 2 * (isHY ? 20 : 8));
    const monthlyChange = round1((rng() - 0.5) * 2 * (isHY ? 35 : 15));
    const ytdChange = round1((rng() - 0.5) * 2 * (isHY ? 55 : 25));
    const low = Math.round(tmpl.rangeLow + rng() * (tmpl.baseSpread - tmpl.rangeLow) * 0.3);
    const high = Math.round(tmpl.baseSpread + rng() * (tmpl.rangeHigh - tmpl.baseSpread) * 0.8);
    return {
      name: tmpl.name,
      spread,
      dailyChange,
      weeklyChange,
      monthlyChange,
      ytdChange,
      oneYearRange: { low, high },
    };
  });

  // ── Default rates ──
  const defaultRates: DefaultRateEntry[] = DEFAULT_RATE_TEMPLATE.map(tmpl => {
    const current = round2(jitter(tmpl.baseCurrent, 0.12));
    const previousQuarter = round2(jitter(tmpl.basePrevQ, 0.10));
    const tenYearAvg = round2(jitter(tmpl.baseTenYrAvg, 0.05));
    return {
      category: tmpl.category,
      current,
      previousQuarter,
      tenYearAvg,
    };
  });

  // ── Rating actions (trailing 30 days) ──
  const upgradeCount = Math.round(15 + rng() * 25);
  const downgradeCount = Math.round(20 + rng() * 30);
  const fallenAngels = Math.round(rng() * 4);
  const risingStars = Math.round(rng() * 3);
  const netRatingDrift = round2((upgradeCount - downgradeCount) / (upgradeCount + downgradeCount));
  const ratingActions: RatingActions = {
    netRatingDrift,
    upgradeCount,
    downgradeCount,
    fallenAngels,
    risingStars,
  };

  // ── Stress indicators ──
  const stressIndicators: StressIndicator[] = STRESS_INDICATOR_TEMPLATE.map(tmpl => {
    const level = Math.round(jitter(tmpl.baseLevel, 0.08));
    const dailyChange = round1((rng() - 0.5) * 2 * (tmpl.baseLevel > 200 ? 10 : 3));
    const weeklyChange = round1((rng() - 0.5) * 2 * (tmpl.baseLevel > 200 ? 25 : 8));

    // Signal based on where level sits within range
    const rangePos = (level - tmpl.rangeLow) / (tmpl.rangeHigh - tmpl.rangeLow);
    let signal: string;
    if (rangePos < 0.3) {
      signal = 'Low Stress';
    } else if (rangePos < 0.6) {
      signal = 'Normal';
    } else if (rangePos < 0.8) {
      signal = 'Elevated';
    } else {
      signal = 'High Stress';
    }

    return { name: tmpl.name, level, dailyChange, weeklyChange, signal };
  });

  // ── Region comparison ──
  const outlooks = ['Stable', 'Positive', 'Negative', 'Deteriorating', 'Improving'];
  const regionComparison: RegionComparison[] = REGION_TEMPLATE.map(tmpl => {
    const igSpread = Math.round(jitter(tmpl.baseIG, 0.08));
    const hySpread = Math.round(jitter(tmpl.baseHY, 0.08));
    const defaultRate = round2(jitter(tmpl.baseDefault, 0.12));
    const outlook = outlooks[Math.floor(rng() * outlooks.length)];
    return {
      region: tmpl.region,
      igSpread,
      hySpread,
      defaultRate,
      outlook,
    };
  });

  return {
    spreads,
    defaultRates,
    ratingActions,
    stressIndicators,
    regionComparison,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

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
    console.error('[GlobalCreditMonitor] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate global credit monitor data' });
  }
});

export default router;
