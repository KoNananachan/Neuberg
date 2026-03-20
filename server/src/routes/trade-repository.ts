import { Router } from 'express';

const router = Router();

// -- Deterministic seeded RNG --

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Static Definitions --

const ASSET_CLASSES = ['rates', 'credit', 'equity', 'fx', 'commodity'] as const;
type AssetClass = typeof ASSET_CLASSES[number];

interface AssetClassConfig {
  assetClass: AssetClass;
  baseTradeCount: number;
  baseGrossNotional: number;
  baseClearedPct: number;
  baseSefPct: number;
}

const ASSET_CLASS_CONFIGS: AssetClassConfig[] = [
  { assetClass: 'rates', baseTradeCount: 18500, baseGrossNotional: 285.4, baseClearedPct: 92.3, baseSefPct: 78.5 },
  { assetClass: 'credit', baseTradeCount: 8200, baseGrossNotional: 42.8, baseClearedPct: 85.6, baseSefPct: 72.1 },
  { assetClass: 'equity', baseTradeCount: 5400, baseGrossNotional: 28.5, baseClearedPct: 62.4, baseSefPct: 45.8 },
  { assetClass: 'fx', baseTradeCount: 12800, baseGrossNotional: 168.2, baseClearedPct: 38.5, baseSefPct: 52.3 },
  { assetClass: 'commodity', baseTradeCount: 3600, baseGrossNotional: 15.6, baseClearedPct: 55.8, baseSefPct: 34.2 },
];

interface ProductConfig {
  assetClass: AssetClass;
  productType: string;
  baseTenors: string[];
  baseNotionalRange: [number, number];
  currencies: string[];
  clearingVenues: string[];
  baseFixedRate: [number, number];
}

const PRODUCT_CONFIGS: ProductConfig[] = [
  { assetClass: 'rates', productType: 'IRS', baseTenors: ['2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'], baseNotionalRange: [25, 500], currencies: ['USD', 'EUR', 'GBP', 'JPY'], clearingVenues: ['LCH', 'CME'], baseFixedRate: [3.2, 4.8] },
  { assetClass: 'credit', productType: 'CDS', baseTenors: ['1Y', '3Y', '5Y', '7Y', '10Y'], baseNotionalRange: [5, 100], currencies: ['USD', 'EUR'], clearingVenues: ['ICE', 'CME'], baseFixedRate: [0.5, 3.5] },
  { assetClass: 'fx', productType: 'FX Forward', baseTenors: ['1M', '3M', '6M', '1Y', '2Y'], baseNotionalRange: [50, 800], currencies: ['EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'AUD/USD'], clearingVenues: ['LCH', 'bilateral'], baseFixedRate: [0.8, 2.2] },
  { assetClass: 'equity', productType: 'Equity Swap', baseTenors: ['3M', '6M', '1Y', '2Y', '3Y'], baseNotionalRange: [10, 200], currencies: ['USD', 'EUR', 'GBP'], clearingVenues: ['CME', 'LCH', 'bilateral'], baseFixedRate: [1.5, 5.5] },
  { assetClass: 'commodity', productType: 'Commodity Swap', baseTenors: ['1M', '3M', '6M', '1Y', '2Y'], baseNotionalRange: [5, 150], currencies: ['USD'], clearingVenues: ['ICE', 'CME', 'bilateral'], baseFixedRate: [2.0, 6.0] },
];

const EXECUTION_VENUES = ['SEF', 'off-SEF'] as const;

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const rng = seededRandom('trade-repository');
  const jitter = (base: number, pct: number): number => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const round1 = (n: number): number => Math.round(n * 10) / 10;
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. SDR Trade Volume Summary --

  const sdrVolumeSummary = ASSET_CLASS_CONFIGS.map((cfg) => {
    const tradeCount = Math.round(jitter(cfg.baseTradeCount, 0.12));
    const grossNotional = round1(jitter(cfg.baseGrossNotional, 0.1));
    const clearedPct = round1(Math.min(100, Math.max(0, jitter(cfg.baseClearedPct, 0.04))));
    const sefExecutedPct = round1(Math.min(100, Math.max(0, jitter(cfg.baseSefPct, 0.06))));

    return {
      assetClass: cfg.assetClass,
      tradeCount,
      grossNotionalBn: grossNotional,
      clearedPct,
      sefExecutedPct,
    };
  });

  // -- 2. Recent Reported Trades (20 trades) --

  const today = new Date();
  const recentTrades = Array.from({ length: 20 }, (_, i) => {
    const productCfg = PRODUCT_CONFIGS[Math.floor(rng() * PRODUCT_CONFIGS.length)];
    const tenor = pick(productCfg.baseTenors);
    const currency = pick(productCfg.currencies);
    const clearingVenue = pick(productCfg.clearingVenues);
    const executionVenue = pick(EXECUTION_VENUES);
    const [minNotional, maxNotional] = productCfg.baseNotionalRange;
    const notional = round1(minNotional + rng() * (maxNotional - minNotional));
    const [minRate, maxRate] = productCfg.baseFixedRate;
    const fixedRateOrSpread = round2(minRate + rng() * (maxRate - minRate));

    // Generate execution timestamp spread across today
    const hoursAgo = rng() * 14; // spread across last 14 hours
    const execTime = new Date(today);
    execTime.setHours(today.getHours() - Math.floor(hoursAgo));
    execTime.setMinutes(Math.floor(rng() * 60));
    execTime.setSeconds(Math.floor(rng() * 60));

    // Generate deterministic UTI
    const utiHash = hashSeed(`uti-${i}-${productCfg.productType}-${tenor}`);
    const uti = `W${utiHash.toString(16).toUpperCase().padStart(8, '0')}${(Math.floor(rng() * 0xFFFFFF)).toString(16).toUpperCase().padStart(6, '0')}`;

    return {
      uti,
      assetClass: productCfg.assetClass,
      productType: productCfg.productType,
      notionalMn: notional,
      currency,
      executionTimestamp: execTime.toISOString(),
      clearingVenue,
      executionVenue,
      tenor,
      fixedRateOrSpread,
    };
  }).sort((a, b) => b.executionTimestamp.localeCompare(a.executionTimestamp));

  // -- 3. Large Trade Alerts (5 block/large trades) --

  const NOTIONAL_THRESHOLDS: Record<AssetClass, number> = {
    rates: 250,
    credit: 50,
    fx: 400,
    equity: 100,
    commodity: 75,
  };

  const largeTradeAlerts = Array.from({ length: 5 }, (_, i) => {
    const productCfg = PRODUCT_CONFIGS[Math.floor(rng() * PRODUCT_CONFIGS.length)];
    const tenor = pick(productCfg.baseTenors);
    const currency = pick(productCfg.currencies);
    const clearingVenue = pick(productCfg.clearingVenues);
    const threshold = NOTIONAL_THRESHOLDS[productCfg.assetClass];
    // Large trade: notional is 1.2x-3x the threshold
    const notional = round1(threshold * (1.2 + rng() * 1.8));
    const [minRate, maxRate] = productCfg.baseFixedRate;
    const fixedRateOrSpread = round2(minRate + rng() * (maxRate - minRate));

    const hoursAgo = rng() * 8;
    const execTime = new Date(today);
    execTime.setHours(today.getHours() - Math.floor(hoursAgo));
    execTime.setMinutes(Math.floor(rng() * 60));

    // Dissemination delay: 15min for standard, up to 48h for cap-size
    const delayMinutes = Math.floor(15 + rng() * 2865); // 15 min to ~48 hours
    const disseminationTime = new Date(execTime.getTime() + delayMinutes * 60000);

    const utiHash = hashSeed(`block-${i}-${productCfg.productType}`);
    const uti = `W${utiHash.toString(16).toUpperCase().padStart(8, '0')}${(Math.floor(rng() * 0xFFFFFF)).toString(16).toUpperCase().padStart(6, '0')}`;

    return {
      uti,
      assetClass: productCfg.assetClass,
      productType: productCfg.productType,
      notionalMn: notional,
      currency,
      tenor,
      fixedRateOrSpread,
      clearingVenue,
      executionTimestamp: execTime.toISOString(),
      disseminationTimestamp: disseminationTime.toISOString(),
      delayMinutes,
      blockTradeFlag: true,
      thresholdMn: threshold,
    };
  }).sort((a, b) => b.executionTimestamp.localeCompare(a.executionTimestamp));

  // -- 4. Market-Wide Statistics --

  // IRS notional by tenor bucket
  const irsTenorBuckets = [
    { bucket: '1-5Y', baseNotional: 142.5 },
    { bucket: '5-10Y', baseNotional: 88.3 },
    { bucket: '10-30Y', baseNotional: 54.6 },
  ].map((b) => ({
    bucket: b.bucket,
    notionalBn: round1(jitter(b.baseNotional, 0.1)),
    tradeCount: Math.round(jitter(b.bucket === '1-5Y' ? 9800 : b.bucket === '5-10Y' ? 5400 : 3300, 0.08)),
  }));

  // CDS IG/HY volume split
  const cdsIgNotional = round1(jitter(28.5, 0.12));
  const cdsHyNotional = round1(jitter(14.3, 0.12));
  const cdsVolumeSplit = {
    ig: { notionalBn: cdsIgNotional, tradeCount: Math.round(jitter(5200, 0.1)) },
    hy: { notionalBn: cdsHyNotional, tradeCount: Math.round(jitter(3000, 0.1)) },
    igPct: round1((cdsIgNotional / (cdsIgNotional + cdsHyNotional)) * 100),
  };

  // FX spot/forward/option split
  const fxSpot = round1(jitter(85.4, 0.1));
  const fxForward = round1(jitter(62.8, 0.1));
  const fxOption = round1(jitter(20.0, 0.15));
  const fxTotal = round1(fxSpot + fxForward + fxOption);
  const fxProductSplit = {
    spot: { notionalBn: fxSpot, pct: round1((fxSpot / fxTotal) * 100) },
    forward: { notionalBn: fxForward, pct: round1((fxForward / fxTotal) * 100) },
    option: { notionalBn: fxOption, pct: round1((fxOption / fxTotal) * 100) },
    totalNotionalBn: fxTotal,
  };

  const marketWideStatistics = {
    irsTenorBuckets,
    cdsVolumeSplit,
    fxProductSplit,
  };

  // -- 5. Clearing Rate Trends (12 weekly data points) --

  const clearingRateTrends = Array.from({ length: 12 }, (_, i) => {
    const weekDate = new Date(today);
    weekDate.setDate(today.getDate() - (11 - i) * 7);
    const weekLabel = weekDate.toISOString().slice(0, 10);

    // Slight upward trend over 12 weeks
    const trendFactor = i * 0.15;

    return {
      week: weekLabel,
      rates: round1(Math.min(100, jitter(90.5 + trendFactor, 0.02))),
      credit: round1(Math.min(100, jitter(84.2 + trendFactor, 0.03))),
      equity: round1(Math.min(100, jitter(60.8 + trendFactor * 0.8, 0.04))),
      fx: round1(Math.min(100, jitter(36.5 + trendFactor * 0.5, 0.05))),
      commodity: round1(Math.min(100, jitter(54.2 + trendFactor * 0.6, 0.04))),
    };
  });

  // -- 6. Regulatory Compliance --

  const withinT15min = round1(Math.min(100, jitter(88.5, 0.03)));
  const withinT1hr = round1(Math.min(100, Math.max(withinT15min, jitter(96.2, 0.02))));
  const withinT24hr = round1(Math.min(100, Math.max(withinT1hr, jitter(99.4, 0.005))));

  const regulatoryCompliance = {
    reportingTimeliness: {
      withinT15min,
      withinT1hr,
      withinT24hr,
    },
    amendmentRate: round2(jitter(4.8, 0.15)),
    rejectionRate: round2(jitter(1.2, 0.2)),
  };

  return {
    sdrVolumeSummary,
    recentTrades,
    largeTradeAlerts,
    marketWideStatistics,
    clearingRateTrends,
    regulatoryCompliance,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[TradeRepository] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate trade repository data' });
  }
});

export default router;
