import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface SEFVolumeEntry {
  name: string;
  productType: string;
  dailyVolume: number;
  weeklyVolume: number;
  marketShare: number;
  change1w: number;
  topProduct: string;
}

interface ProductBreakdownEntry {
  product: string;
  dailyNotional: number;
  tradeCount: number;
  avgSize: number;
  sefPct: number;
  mandatoryClearing: boolean;
}

interface ExecutionAnalyticsEntry {
  metric: string;
  value: number;
  unit: string;
  change1m: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
}

interface SwapExecutionSummary {
  totalDailyVolume: number;
  sefMarketShare: number;
  avgSpread: number;
  clearingRate: number;
  topSef: string;
  timestamp: string;
}

interface SwapExecutionResponse {
  sefVolumes: SEFVolumeEntry[];
  productBreakdown: ProductBreakdownEntry[];
  executionAnalytics: ExecutionAnalyticsEntry[];
  summary: SwapExecutionSummary;
  timestamp: string;
}

// ── Cache ──

let cache: { data: SwapExecutionResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── SEF configuration ──

interface SEFConfig {
  name: string;
  baseDailyVolume: number;
  baseMarketShare: number;
  topProduct: string;
  primaryType: string;
}

const SEF_CONFIGS: SEFConfig[] = [
  { name: 'Bloomberg SEF', baseDailyVolume: 48.5, baseMarketShare: 22.8, topProduct: 'IRS Fixed-Float', primaryType: 'IRS' },
  { name: 'Tradeweb', baseDailyVolume: 42.3, baseMarketShare: 19.9, topProduct: 'IRS Fixed-Float', primaryType: 'IRS' },
  { name: 'ICE Swap Trade', baseDailyVolume: 35.7, baseMarketShare: 16.8, topProduct: 'CDS Index', primaryType: 'CDS' },
  { name: 'BGCANTOR', baseDailyVolume: 22.1, baseMarketShare: 10.4, topProduct: 'IRS Basis', primaryType: 'IRS' },
  { name: 'MarketAxess', baseDailyVolume: 18.6, baseMarketShare: 8.7, topProduct: 'CDS Single Name', primaryType: 'CDS' },
  { name: 'TP ICAP', baseDailyVolume: 21.4, baseMarketShare: 10.1, topProduct: 'FX NDF', primaryType: 'FX' },
  { name: 'Tullett Prebon', baseDailyVolume: 14.8, baseMarketShare: 7.0, topProduct: 'Swaptions', primaryType: 'EQUITY' },
  { name: 'GFI', baseDailyVolume: 9.2, baseMarketShare: 4.3, topProduct: 'IRS Fixed-Float', primaryType: 'IRS' },
];

const PRODUCT_TYPES = ['IRS', 'CDS', 'FX', 'EQUITY'] as const;

// ── Product breakdown configuration ──

interface ProductConfig {
  product: string;
  baseDailyNotional: number;
  baseTradeCount: number;
  baseAvgSize: number;
  baseSefPct: number;
  mandatoryClearing: boolean;
}

const PRODUCT_CONFIGS: ProductConfig[] = [
  { product: 'IRS Fixed-Float', baseDailyNotional: 98.5, baseTradeCount: 12400, baseAvgSize: 7.94, baseSefPct: 82.5, mandatoryClearing: true },
  { product: 'IRS Basis', baseDailyNotional: 34.2, baseTradeCount: 3800, baseAvgSize: 9.0, baseSefPct: 71.3, mandatoryClearing: true },
  { product: 'CDS Index', baseDailyNotional: 42.8, baseTradeCount: 5200, baseAvgSize: 8.23, baseSefPct: 88.7, mandatoryClearing: true },
  { product: 'CDS Single Name', baseDailyNotional: 18.4, baseTradeCount: 4100, baseAvgSize: 4.49, baseSefPct: 45.2, mandatoryClearing: false },
  { product: 'FX NDF', baseDailyNotional: 12.6, baseTradeCount: 2900, baseAvgSize: 4.34, baseSefPct: 62.8, mandatoryClearing: false },
  { product: 'Swaptions', baseDailyNotional: 8.1, baseTradeCount: 1800, baseAvgSize: 4.5, baseSefPct: 38.4, mandatoryClearing: false },
];

// ── Execution analytics configuration ──

interface MetricConfig {
  metric: string;
  baseValue: number;
  unit: string;
  volatility: number;
  trendBias: number; // positive = UP bias, negative = DOWN bias, 0 = FLAT bias
}

const METRIC_CONFIGS: MetricConfig[] = [
  { metric: 'Avg Spread', baseValue: 1.85, unit: 'bps', volatility: 0.3, trendBias: -0.15 },
  { metric: 'Avg Trade Size', baseValue: 6.8, unit: '$M', volatility: 1.2, trendBias: 0.1 },
  { metric: 'SEF vs Bilateral Ratio', baseValue: 72.4, unit: '%', volatility: 3.0, trendBias: 0.3 },
  { metric: 'Central Clearing Rate', baseValue: 84.2, unit: '%', volatility: 2.0, trendBias: 0.2 },
  { metric: 'Compression Volume', baseValue: 28.5, unit: '$B', volatility: 5.0, trendBias: 0.25 },
  { metric: 'Block Trade Pct', baseValue: 18.3, unit: '%', volatility: 2.5, trendBias: -0.1 },
  { metric: 'Electronic Pct', baseValue: 64.7, unit: '%', volatility: 3.5, trendBias: 0.35 },
  { metric: 'Voice Pct', baseValue: 35.3, unit: '%', volatility: 3.5, trendBias: -0.35 },
];

// ── Data generation ──

function generateSEFVolumes(rng: () => number): SEFVolumeEntry[] {
  return SEF_CONFIGS.map((cfg) => {
    const volumeJitter = (rng() - 0.5) * cfg.baseDailyVolume * 0.15;
    const dailyVolume = Math.round((cfg.baseDailyVolume + volumeJitter) * 10) / 10;
    const weeklyVolume = Math.round(dailyVolume * (4.5 + rng() * 1.0) * 10) / 10;

    const shareJitter = (rng() - 0.5) * 2.5;
    const marketShare = Math.round((cfg.baseMarketShare + shareJitter) * 10) / 10;

    const change1w = Math.round((rng() - 0.5) * 12 * 10) / 10;

    // Assign product type based on primary type with some variation
    const typeIdx = Math.floor(rng() * PRODUCT_TYPES.length);
    const productType = rng() > 0.6 ? PRODUCT_TYPES[typeIdx] : cfg.primaryType;

    return {
      name: cfg.name,
      productType,
      dailyVolume,
      weeklyVolume,
      marketShare,
      change1w,
      topProduct: cfg.topProduct,
    };
  });
}

function generateProductBreakdown(rng: () => number): ProductBreakdownEntry[] {
  return PRODUCT_CONFIGS.map((cfg) => {
    const notionalJitter = (rng() - 0.5) * cfg.baseDailyNotional * 0.12;
    const dailyNotional = Math.round((cfg.baseDailyNotional + notionalJitter) * 10) / 10;

    const countJitter = Math.floor((rng() - 0.5) * cfg.baseTradeCount * 0.15);
    const tradeCount = cfg.baseTradeCount + countJitter;

    const avgSizeJitter = (rng() - 0.5) * cfg.baseAvgSize * 0.1;
    const avgSize = Math.round((cfg.baseAvgSize + avgSizeJitter) * 100) / 100;

    const sefJitter = (rng() - 0.5) * 5;
    const sefPct = Math.round(Math.max(0, Math.min(100, cfg.baseSefPct + sefJitter)) * 10) / 10;

    return {
      product: cfg.product,
      dailyNotional,
      tradeCount,
      avgSize,
      sefPct,
      mandatoryClearing: cfg.mandatoryClearing,
    };
  });
}

function generateExecutionAnalytics(rng: () => number): ExecutionAnalyticsEntry[] {
  return METRIC_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const value = Math.round((cfg.baseValue + jitter) * 100) / 100;

    const change1m = Math.round((cfg.trendBias + (rng() - 0.5) * cfg.volatility) * 100) / 100;

    let trend: 'UP' | 'DOWN' | 'FLAT';
    if (change1m > 0.5) {
      trend = 'UP';
    } else if (change1m < -0.5) {
      trend = 'DOWN';
    } else {
      trend = 'FLAT';
    }

    return {
      metric: cfg.metric,
      value,
      unit: cfg.unit,
      change1m,
      trend,
    };
  });
}

function generateSwapExecutionData(): SwapExecutionResponse {
  const rng = seededRandom('swap-execution');

  const sefVolumes = generateSEFVolumes(rng);
  const productBreakdown = generateProductBreakdown(rng);
  const executionAnalytics = generateExecutionAnalytics(rng);

  // Summary
  const totalDailyVolume = Math.round(
    sefVolumes.reduce((sum, s) => sum + s.dailyVolume, 0) * 10
  ) / 10;

  const sefMetric = executionAnalytics.find((m) => m.metric === 'SEF vs Bilateral Ratio');
  const sefMarketShare = sefMetric ? sefMetric.value : 72.4;

  const spreadMetric = executionAnalytics.find((m) => m.metric === 'Avg Spread');
  const avgSpread = spreadMetric ? spreadMetric.value : 1.85;

  const clearingMetric = executionAnalytics.find((m) => m.metric === 'Central Clearing Rate');
  const clearingRate = clearingMetric ? clearingMetric.value : 84.2;

  // Top SEF by daily volume
  const topSef = sefVolumes.reduce((max, s) => s.dailyVolume > max.dailyVolume ? s : max, sefVolumes[0]).name;

  const timestamp = new Date().toISOString();

  const summary: SwapExecutionSummary = {
    totalDailyVolume,
    sefMarketShare,
    avgSpread,
    clearingRate,
    topSef,
    timestamp,
  };

  return {
    sefVolumes,
    productBreakdown,
    executionAnalytics,
    summary,
    timestamp,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateSwapExecutionData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SwapExecution] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate swap execution data' });
  }
});

export default router;
