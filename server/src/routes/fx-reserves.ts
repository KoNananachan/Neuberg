import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash |= 0; }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Helpers ──

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const round2 = (v: number) => Math.round(v * 100) / 100;
const round1 = (v: number) => Math.round(v * 10) / 10;

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Types ──

interface CountryReserve {
  country: string;
  totalReserves: number;
  gold: number;
  sdrs: number;
  forexExGold: number;
  monthlyChange: number;
  yearlyChange: number;
}

interface CurrencyComposition {
  currency: string;
  percentage: number;
  change: number;
}

interface GoldHolder {
  country: string;
  tonnes: number;
  percentOfReserves: number;
}

interface MonthlyTrend {
  month: string;
  totalReserves: number;
}

interface FxReservesResponse {
  reserves: CountryReserve[];
  globalTotal: {
    totalReserves: number;
    yearOverYearChange: number;
  };
  currencyComposition: CurrencyComposition[];
  goldReserves: GoldHolder[];
  trends: MonthlyTrend[];
  generatedAt: string;
}

// ── Static configs ──

interface ReserveConfig {
  country: string;
  totalBase: number;       // $B
  goldBase: number;        // $B
  sdrsBase: number;        // $B
  goldTonnes: number;      // metric tonnes
  goldPctOfReserves: number; // %
}

const RESERVE_CONFIGS: ReserveConfig[] = [
  { country: 'China',          totalBase: 3220, goldBase: 148,  sdrsBase: 52, goldTonnes: 2264, goldPctOfReserves: 4.6 },
  { country: 'Japan',          totalBase: 1230, goldBase: 58,   sdrsBase: 24, goldTonnes: 846,  goldPctOfReserves: 4.7 },
  { country: 'Switzerland',    totalBase: 800,  goldBase: 70,   sdrsBase: 8,  goldTonnes: 1040, goldPctOfReserves: 8.8 },
  { country: 'India',          totalBase: 600,  goldBase: 52,   sdrsBase: 18, goldTonnes: 803,  goldPctOfReserves: 8.7 },
  { country: 'Russia',         totalBase: 580,  goldBase: 155,  sdrsBase: 7,  goldTonnes: 2333, goldPctOfReserves: 26.7 },
  { country: 'Taiwan',         totalBase: 570,  goldBase: 5,    sdrsBase: 2,  goldTonnes: 424,  goldPctOfReserves: 0.9 },
  { country: 'Saudi Arabia',   totalBase: 450,  goldBase: 8,    sdrsBase: 14, goldTonnes: 323,  goldPctOfReserves: 1.8 },
  { country: 'Hong Kong',      totalBase: 425,  goldBase: 0.1,  sdrsBase: 1,  goldTonnes: 2,    goldPctOfReserves: 0.0 },
  { country: 'South Korea',    totalBase: 420,  goldBase: 8,    sdrsBase: 5,  goldTonnes: 104,  goldPctOfReserves: 1.9 },
  { country: 'Brazil',         totalBase: 355,  goldBase: 8,    sdrsBase: 15, goldTonnes: 130,  goldPctOfReserves: 2.3 },
  { country: 'Singapore',      totalBase: 340,  goldBase: 5,    sdrsBase: 3,  goldTonnes: 230,  goldPctOfReserves: 1.5 },
  { country: 'Germany',        totalBase: 295,  goldBase: 220,  sdrsBase: 26, goldTonnes: 3352, goldPctOfReserves: 74.5 },
  { country: 'Thailand',       totalBase: 245,  goldBase: 12,   sdrsBase: 6,  goldTonnes: 234,  goldPctOfReserves: 4.9 },
  { country: 'France',         totalBase: 245,  goldBase: 175,  sdrsBase: 22, goldTonnes: 2437, goldPctOfReserves: 71.4 },
  { country: 'Mexico',         totalBase: 215,  goldBase: 4,    sdrsBase: 9,  goldTonnes: 120,  goldPctOfReserves: 1.9 },
  { country: 'Italy',          totalBase: 200,  goldBase: 165,  sdrsBase: 18, goldTonnes: 2452, goldPctOfReserves: 82.5 },
  { country: 'Czech Republic', totalBase: 175,  goldBase: 2,    sdrsBase: 4,  goldTonnes: 42,   goldPctOfReserves: 1.1 },
  { country: 'Indonesia',      totalBase: 145,  goldBase: 5,    sdrsBase: 8,  goldTonnes: 79,   goldPctOfReserves: 3.4 },
  { country: 'Poland',         totalBase: 175,  goldBase: 22,   sdrsBase: 6,  goldTonnes: 358,  goldPctOfReserves: 12.6 },
  { country: 'Israel',         totalBase: 215,  goldBase: 1,    sdrsBase: 2,  goldTonnes: 0,    goldPctOfReserves: 0.0 },
];

// Top gold holders globally (includes non-reserve holders like US)
interface GoldConfig {
  country: string;
  tonnes: number;
  pctOfReserves: number;
}

const GOLD_CONFIGS: GoldConfig[] = [
  { country: 'United States',  tonnes: 8133, pctOfReserves: 78.2 },
  { country: 'Germany',        tonnes: 3352, pctOfReserves: 74.5 },
  { country: 'Italy',          tonnes: 2452, pctOfReserves: 82.5 },
  { country: 'France',         tonnes: 2437, pctOfReserves: 71.4 },
  { country: 'Russia',         tonnes: 2333, pctOfReserves: 26.7 },
  { country: 'China',          tonnes: 2264, pctOfReserves: 4.6 },
  { country: 'Switzerland',    tonnes: 1040, pctOfReserves: 8.8 },
  { country: 'Japan',          tonnes: 846,  pctOfReserves: 4.7 },
  { country: 'India',          tonnes: 803,  pctOfReserves: 8.7 },
  { country: 'Netherlands',    tonnes: 612,  pctOfReserves: 68.2 },
];

// COFER-style currency composition baseline (%)
interface CurrencyConfig {
  currency: string;
  pctBase: number;
  changeRange: number; // max absolute quarterly change in pp
}

const CURRENCY_CONFIGS: CurrencyConfig[] = [
  { currency: 'USD', pctBase: 58.4, changeRange: 0.6 },
  { currency: 'EUR', pctBase: 20.5, changeRange: 0.4 },
  { currency: 'JPY', pctBase: 5.5,  changeRange: 0.3 },
  { currency: 'GBP', pctBase: 5.0,  changeRange: 0.2 },
  { currency: 'CNY', pctBase: 2.5,  changeRange: 0.2 },
  { currency: 'AUD', pctBase: 2.0,  changeRange: 0.1 },
  { currency: 'CAD', pctBase: 2.5,  changeRange: 0.1 },
  { currency: 'CHF', pctBase: 0.2,  changeRange: 0.05 },
  { currency: 'Other', pctBase: 3.4, changeRange: 0.3 },
];

// ── Data generation ──

function generate(): FxReservesResponse {
  const todayStr = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('fx-reserves-' + todayStr);
  const rng = mulberry32(seed);

  const jitter = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;

  // ── 1. Country reserves ──

  const reserves: CountryReserve[] = RESERVE_CONFIGS.map((cfg) => {
    const totalReserves = round2(clamp(jitter(cfg.totalBase, cfg.totalBase * 0.03), cfg.totalBase * 0.92, cfg.totalBase * 1.08));
    const gold = round2(clamp(jitter(cfg.goldBase, cfg.goldBase * 0.05), cfg.goldBase * 0.85, cfg.goldBase * 1.15));
    const sdrs = round2(clamp(jitter(cfg.sdrsBase, cfg.sdrsBase * 0.1), cfg.sdrsBase * 0.8, cfg.sdrsBase * 1.2));
    const forexExGold = round2(Math.max(0, totalReserves - gold - sdrs));
    const monthlyChange = round2(clamp((rng() - 0.5) * 3.0, -2.5, 2.5));
    const yearlyChange = round2(clamp((rng() - 0.45) * 8.0, -6.0, 8.0));

    return {
      country: cfg.country,
      totalReserves,
      gold,
      sdrs,
      forexExGold,
      monthlyChange,
      yearlyChange,
    };
  });

  // ── 2. Global total ──

  const totalWorldReserves = round2(reserves.reduce((sum, r) => sum + r.totalReserves, 0));
  const yearOverYearChange = round2(clamp(jitter(2.8, 1.5), -1.0, 6.0));

  const globalTotal = {
    totalReserves: totalWorldReserves,
    yearOverYearChange,
  };

  // ── 3. Currency composition ──

  const rawComposition = CURRENCY_CONFIGS.map((cfg) => {
    const percentage = clamp(jitter(cfg.pctBase, cfg.changeRange * 2), cfg.pctBase - 2.0, cfg.pctBase + 2.0);
    const change = round2(clamp((rng() - 0.5) * cfg.changeRange * 2, -cfg.changeRange, cfg.changeRange));
    return { currency: cfg.currency, percentage, change };
  });

  // Normalize percentages to sum to 100
  const rawSum = rawComposition.reduce((s, c) => s + c.percentage, 0);
  const currencyComposition: CurrencyComposition[] = rawComposition.map((c) => ({
    currency: c.currency,
    percentage: round1((c.percentage / rawSum) * 100),
    change: c.change,
  }));

  // ── 4. Gold reserves (top holders) ──

  const goldReserves: GoldHolder[] = GOLD_CONFIGS.map((cfg) => {
    const tonnes = Math.round(clamp(jitter(cfg.tonnes, cfg.tonnes * 0.005), cfg.tonnes * 0.99, cfg.tonnes * 1.01));
    const percentOfReserves = round1(clamp(jitter(cfg.pctOfReserves, cfg.pctOfReserves * 0.02), cfg.pctOfReserves * 0.95, cfg.pctOfReserves * 1.05));
    return { country: cfg.country, tonnes, percentOfReserves };
  });

  // ── 5. Monthly trends (last 12 months) ──

  const now = new Date();
  const trends: MonthlyTrend[] = [];
  let runningTotal = totalWorldReserves;

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toISOString().slice(0, 7); // YYYY-MM
    const monthDelta = (rng() - 0.48) * 120; // slight upward bias
    const monthTotal = round2(clamp(runningTotal - monthDelta * (i > 0 ? 1 : 0), totalWorldReserves * 0.92, totalWorldReserves * 1.04));
    trends.push({ month: monthLabel, totalReserves: monthTotal });
    if (i > 0) runningTotal = monthTotal;
  }

  return {
    reserves,
    globalTotal,
    currencyComposition,
    goldReserves,
    trends,
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
  } catch (err) {
    console.error('[FxReserves] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate FX reserves data' });
  }
});

export default router;
