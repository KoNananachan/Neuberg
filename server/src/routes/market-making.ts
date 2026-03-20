import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface TopMarketMaker {
  name: string;
  marketSharePct: number;
  dailyVolumeB: number;
  avgSpreadBps: number;
  fillRatePct: number;
  change1d: number;
}

interface SpreadAnalysisEntry {
  assetClass: string;
  currentBps: number;
  avg30dBps: number;
  avg1yBps: number;
  percentile: number;
}

interface DepthOfBookEntry {
  index: string;
  level: string;
  avgSizeM: number;
  refreshRateMs: number;
}

interface InventoryRiskEntry {
  sector: string;
  netExposureM: number;
  direction: 'LONG' | 'SHORT';
  turnoverRatio: number;
  change1d: number;
}

interface QuoteQualityEntry {
  venue: string;
  quoteToTradeRatio: number;
  timeAtNbboPct: number;
  adverseSelectionBps: number;
}

interface DesignatedMMEntry {
  symbol: string;
  exchange: 'NYSE' | 'NASDAQ';
  role: 'DMM' | 'Lead MM';
  firm: string;
  timeAtInsidePct: number;
}

interface VolatilityRegime {
  regime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH';
  vix: number;
  spreadImpact: 'TIGHTENING' | 'STABLE' | 'WIDENING';
  volumeImpact: 'BELOW_AVG' | 'AVERAGE' | 'ABOVE_AVG';
  mmProfitabilityIndex: number;
}

interface RegulatoryMetric {
  metric: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'COMPLIANT' | 'WARNING' | 'BREACH';
}

interface MarketMakingSummary {
  totalMmVolumeB: number;
  avgSpreadBps: number;
  topMaker: string;
  volatilityRegime: string;
  timestamp: string;
}

interface MarketMakingResponse {
  topMarketMakers: TopMarketMaker[];
  spreadAnalysis: SpreadAnalysisEntry[];
  depthOfBook: DepthOfBookEntry[];
  inventoryRisk: InventoryRiskEntry[];
  quoteQuality: QuoteQualityEntry[];
  designatedMM: DesignatedMMEntry[];
  volatilityRegime: VolatilityRegime;
  regulatoryMetrics: RegulatoryMetric[];
  summary: MarketMakingSummary;
}

// ── Cache ──

let cache: { data: MarketMakingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Top Market Makers configuration ──

interface MarketMakerConfig {
  name: string;
  baseMarketShare: number;
  baseDailyVolumeB: number;
  baseAvgSpreadBps: number;
  baseFillRate: number;
}

const MARKET_MAKER_CONFIGS: MarketMakerConfig[] = [
  { name: 'Citadel Securities', baseMarketShare: 23.5, baseDailyVolumeB: 42.8, baseAvgSpreadBps: 0.42, baseFillRate: 97.3 },
  { name: 'Virtu Financial', baseMarketShare: 18.2, baseDailyVolumeB: 33.1, baseAvgSpreadBps: 0.51, baseFillRate: 96.8 },
  { name: 'Jane Street', baseMarketShare: 14.7, baseDailyVolumeB: 26.7, baseAvgSpreadBps: 0.38, baseFillRate: 98.1 },
  { name: 'Jump Trading', baseMarketShare: 10.3, baseDailyVolumeB: 18.7, baseAvgSpreadBps: 0.55, baseFillRate: 95.9 },
  { name: 'Two Sigma Securities', baseMarketShare: 8.6, baseDailyVolumeB: 15.6, baseAvgSpreadBps: 0.48, baseFillRate: 96.4 },
  { name: 'GTS', baseMarketShare: 7.8, baseDailyVolumeB: 14.2, baseAvgSpreadBps: 0.60, baseFillRate: 95.2 },
  { name: 'IMC', baseMarketShare: 6.1, baseDailyVolumeB: 11.1, baseAvgSpreadBps: 0.44, baseFillRate: 97.0 },
  { name: 'Optiver', baseMarketShare: 5.4, baseDailyVolumeB: 9.8, baseAvgSpreadBps: 0.40, baseFillRate: 97.5 },
];

// ── Spread Analysis configuration ──

interface SpreadConfig {
  assetClass: string;
  baseCurrentBps: number;
  base30dAvgBps: number;
  base1yAvgBps: number;
}

const SPREAD_CONFIGS: SpreadConfig[] = [
  { assetClass: 'US Equities Large Cap', baseCurrentBps: 0.35, base30dAvgBps: 0.38, base1yAvgBps: 0.41 },
  { assetClass: 'US Equities Mid Cap', baseCurrentBps: 1.20, base30dAvgBps: 1.28, base1yAvgBps: 1.35 },
  { assetClass: 'US Equities Small Cap', baseCurrentBps: 3.85, base30dAvgBps: 4.10, base1yAvgBps: 4.45 },
  { assetClass: 'ETFs', baseCurrentBps: 0.52, base30dAvgBps: 0.58, base1yAvgBps: 0.63 },
  { assetClass: 'Options', baseCurrentBps: 5.20, base30dAvgBps: 5.45, base1yAvgBps: 5.80 },
  { assetClass: 'Treasuries', baseCurrentBps: 0.18, base30dAvgBps: 0.20, base1yAvgBps: 0.22 },
  { assetClass: 'FX Majors', baseCurrentBps: 0.08, base30dAvgBps: 0.09, base1yAvgBps: 0.10 },
];

// ── Depth of Book configuration ──

interface DepthConfig {
  index: string;
  levels: { level: string; baseAvgSizeM: number; baseRefreshMs: number }[];
}

const DEPTH_CONFIGS: DepthConfig[] = [
  {
    index: 'SPY',
    levels: [
      { level: 'L1', baseAvgSizeM: 2.8, baseRefreshMs: 12 },
      { level: 'L2', baseAvgSizeM: 5.4, baseRefreshMs: 25 },
      { level: 'L3', baseAvgSizeM: 8.1, baseRefreshMs: 48 },
      { level: 'L4', baseAvgSizeM: 11.5, baseRefreshMs: 85 },
      { level: 'L5', baseAvgSizeM: 15.2, baseRefreshMs: 140 },
    ],
  },
  {
    index: 'QQQ',
    levels: [
      { level: 'L1', baseAvgSizeM: 2.1, baseRefreshMs: 15 },
      { level: 'L2', baseAvgSizeM: 4.2, baseRefreshMs: 30 },
      { level: 'L3', baseAvgSizeM: 6.5, baseRefreshMs: 55 },
      { level: 'L4', baseAvgSizeM: 9.0, baseRefreshMs: 95 },
      { level: 'L5', baseAvgSizeM: 12.0, baseRefreshMs: 160 },
    ],
  },
  {
    index: 'IWM',
    levels: [
      { level: 'L1', baseAvgSizeM: 1.2, baseRefreshMs: 22 },
      { level: 'L2', baseAvgSizeM: 2.5, baseRefreshMs: 45 },
      { level: 'L3', baseAvgSizeM: 3.8, baseRefreshMs: 78 },
      { level: 'L4', baseAvgSizeM: 5.2, baseRefreshMs: 130 },
      { level: 'L5', baseAvgSizeM: 7.0, baseRefreshMs: 210 },
    ],
  },
  {
    index: 'DIA',
    levels: [
      { level: 'L1', baseAvgSizeM: 1.5, baseRefreshMs: 18 },
      { level: 'L2', baseAvgSizeM: 3.0, baseRefreshMs: 35 },
      { level: 'L3', baseAvgSizeM: 4.8, baseRefreshMs: 62 },
      { level: 'L4', baseAvgSizeM: 6.8, baseRefreshMs: 105 },
      { level: 'L5', baseAvgSizeM: 9.2, baseRefreshMs: 175 },
    ],
  },
];

// ── Inventory Risk configuration ──

interface InventoryConfig {
  sector: string;
  baseNetExposureM: number;
  baseDirection: 'LONG' | 'SHORT';
  baseTurnover: number;
}

const INVENTORY_CONFIGS: InventoryConfig[] = [
  { sector: 'Technology', baseNetExposureM: 245, baseDirection: 'LONG', baseTurnover: 8.2 },
  { sector: 'Healthcare', baseNetExposureM: 128, baseDirection: 'SHORT', baseTurnover: 6.5 },
  { sector: 'Financials', baseNetExposureM: 185, baseDirection: 'LONG', baseTurnover: 7.1 },
  { sector: 'Energy', baseNetExposureM: 92, baseDirection: 'SHORT', baseTurnover: 9.3 },
  { sector: 'Consumer Discretionary', baseNetExposureM: 110, baseDirection: 'LONG', baseTurnover: 5.8 },
  { sector: 'Industrials', baseNetExposureM: 78, baseDirection: 'SHORT', baseTurnover: 6.0 },
  { sector: 'Communication Services', baseNetExposureM: 156, baseDirection: 'LONG', baseTurnover: 7.8 },
  { sector: 'Consumer Staples', baseNetExposureM: 45, baseDirection: 'SHORT', baseTurnover: 4.2 },
];

// ── Quote Quality configuration ──

interface QuoteQualityConfig {
  venue: string;
  baseQTRatio: number;
  baseTimeAtNbbo: number;
  baseAdverseSelection: number;
}

const QUOTE_QUALITY_CONFIGS: QuoteQualityConfig[] = [
  { venue: 'NYSE', baseQTRatio: 12.5, baseTimeAtNbbo: 42.8, baseAdverseSelection: 1.85 },
  { venue: 'NASDAQ', baseQTRatio: 18.3, baseTimeAtNbbo: 38.5, baseAdverseSelection: 2.10 },
  { venue: 'CBOE EDGX', baseQTRatio: 22.1, baseTimeAtNbbo: 35.2, baseAdverseSelection: 2.45 },
  { venue: 'CBOE BZX', baseQTRatio: 20.4, baseTimeAtNbbo: 33.8, baseAdverseSelection: 2.55 },
  { venue: 'IEX', baseQTRatio: 5.8, baseTimeAtNbbo: 28.4, baseAdverseSelection: 0.92 },
  { venue: 'MEMX', baseQTRatio: 25.6, baseTimeAtNbbo: 30.1, baseAdverseSelection: 2.80 },
  { venue: 'MIAX Pearl', baseQTRatio: 19.7, baseTimeAtNbbo: 31.5, baseAdverseSelection: 2.35 },
];

// ── Designated MM configuration ──

interface DesignatedMMConfig {
  symbol: string;
  exchange: 'NYSE' | 'NASDAQ';
  role: 'DMM' | 'Lead MM';
  firm: string;
  baseTimeAtInside: number;
}

const DESIGNATED_MM_CONFIGS: DesignatedMMConfig[] = [
  { symbol: 'AAPL', exchange: 'NASDAQ', role: 'Lead MM', firm: 'Citadel Securities', baseTimeAtInside: 94.2 },
  { symbol: 'MSFT', exchange: 'NASDAQ', role: 'Lead MM', firm: 'Virtu Financial', baseTimeAtInside: 93.8 },
  { symbol: 'JPM', exchange: 'NYSE', role: 'DMM', firm: 'GTS', baseTimeAtInside: 95.1 },
  { symbol: 'GOOGL', exchange: 'NASDAQ', role: 'Lead MM', firm: 'Jane Street', baseTimeAtInside: 94.5 },
  { symbol: 'BRK.A', exchange: 'NYSE', role: 'DMM', firm: 'Citadel Securities', baseTimeAtInside: 92.0 },
  { symbol: 'AMZN', exchange: 'NASDAQ', role: 'Lead MM', firm: 'Two Sigma Securities', baseTimeAtInside: 93.5 },
  { symbol: 'UNH', exchange: 'NYSE', role: 'DMM', firm: 'GTS', baseTimeAtInside: 94.8 },
  { symbol: 'NVDA', exchange: 'NASDAQ', role: 'Lead MM', firm: 'Citadel Securities', baseTimeAtInside: 95.3 },
  { symbol: 'WMT', exchange: 'NYSE', role: 'DMM', firm: 'Virtu Financial', baseTimeAtInside: 93.2 },
  { symbol: 'META', exchange: 'NASDAQ', role: 'Lead MM', firm: 'Jane Street', baseTimeAtInside: 94.0 },
];

// ── Regulatory Metrics configuration ──

interface RegulatoryMetricConfig {
  metric: string;
  baseValue: number;
  unit: string;
  threshold: number;
  volatility: number;
  higherIsBetter: boolean;
}

const REGULATORY_CONFIGS: RegulatoryMetricConfig[] = [
  { metric: 'Reg NMS Order Protection Compliance', baseValue: 99.87, unit: '%', threshold: 99.5, volatility: 0.15, higherIsBetter: true },
  { metric: 'Odd Lot Reporting Timeliness', baseValue: 99.42, unit: '%', threshold: 99.0, volatility: 0.3, higherIsBetter: true },
  { metric: 'Tick Size Pilot Fill Rate Impact', baseValue: -2.3, unit: 'bps', threshold: -10.0, volatility: 1.5, higherIsBetter: true },
  { metric: 'CAT Reporting Latency', baseValue: 8.2, unit: 'sec', threshold: 15.0, volatility: 2.0, higherIsBetter: false },
  { metric: 'Best Execution Score', baseValue: 98.5, unit: '%', threshold: 97.0, volatility: 0.8, higherIsBetter: true },
  { metric: 'Reg SHO Locate Compliance', baseValue: 99.95, unit: '%', threshold: 99.9, volatility: 0.08, higherIsBetter: true },
  { metric: 'Market Access Risk Control Uptime', baseValue: 99.99, unit: '%', threshold: 99.95, volatility: 0.03, higherIsBetter: true },
  { metric: 'Quote Stuffing Detection Rate', baseValue: 94.8, unit: '%', threshold: 90.0, volatility: 2.5, higherIsBetter: true },
];

// ── Data generation ──

function generateTopMarketMakers(rng: () => number): TopMarketMaker[] {
  return MARKET_MAKER_CONFIGS.map((cfg) => {
    const shareJitter = (rng() - 0.5) * cfg.baseMarketShare * 0.08;
    const marketSharePct = Math.round((cfg.baseMarketShare + shareJitter) * 10) / 10;

    const volJitter = (rng() - 0.5) * cfg.baseDailyVolumeB * 0.12;
    const dailyVolumeB = Math.round((cfg.baseDailyVolumeB + volJitter) * 10) / 10;

    const spreadJitter = (rng() - 0.5) * cfg.baseAvgSpreadBps * 0.15;
    const avgSpreadBps = Math.round((cfg.baseAvgSpreadBps + spreadJitter) * 100) / 100;

    const fillJitter = (rng() - 0.5) * 1.5;
    const fillRatePct = Math.round(Math.min(99.9, Math.max(90.0, cfg.baseFillRate + fillJitter)) * 10) / 10;

    const change1d = Math.round((rng() - 0.5) * 4 * 10) / 10;

    return { name: cfg.name, marketSharePct, dailyVolumeB, avgSpreadBps, fillRatePct, change1d };
  });
}

function generateSpreadAnalysis(rng: () => number): SpreadAnalysisEntry[] {
  return SPREAD_CONFIGS.map((cfg) => {
    const currentJitter = (rng() - 0.5) * cfg.baseCurrentBps * 0.2;
    const currentBps = Math.round((cfg.baseCurrentBps + currentJitter) * 100) / 100;

    const avg30dJitter = (rng() - 0.5) * cfg.base30dAvgBps * 0.08;
    const avg30dBps = Math.round((cfg.base30dAvgBps + avg30dJitter) * 100) / 100;

    const avg1yJitter = (rng() - 0.5) * cfg.base1yAvgBps * 0.05;
    const avg1yBps = Math.round((cfg.base1yAvgBps + avg1yJitter) * 100) / 100;

    // Percentile: where current spread sits vs historical (lower spread = lower percentile = tighter)
    const rawPercentile = 20 + rng() * 60;
    const percentile = Math.round(Math.max(1, Math.min(99, rawPercentile)));

    return { assetClass: cfg.assetClass, currentBps, avg30dBps, avg1yBps, percentile };
  });
}

function generateDepthOfBook(rng: () => number): DepthOfBookEntry[] {
  const entries: DepthOfBookEntry[] = [];

  for (const cfg of DEPTH_CONFIGS) {
    for (const lvl of cfg.levels) {
      const sizeJitter = (rng() - 0.5) * lvl.baseAvgSizeM * 0.2;
      const avgSizeM = Math.round((lvl.baseAvgSizeM + sizeJitter) * 10) / 10;

      const refreshJitter = Math.floor((rng() - 0.5) * lvl.baseRefreshMs * 0.25);
      const refreshRateMs = Math.max(1, lvl.baseRefreshMs + refreshJitter);

      entries.push({ index: cfg.index, level: lvl.level, avgSizeM, refreshRateMs });
    }
  }

  return entries;
}

function generateInventoryRisk(rng: () => number): InventoryRiskEntry[] {
  return INVENTORY_CONFIGS.map((cfg) => {
    const exposureJitter = (rng() - 0.5) * cfg.baseNetExposureM * 0.25;
    const netExposureM = Math.round(cfg.baseNetExposureM + exposureJitter);

    // Occasionally flip direction
    const flipThreshold = 0.15;
    const direction = rng() < flipThreshold
      ? (cfg.baseDirection === 'LONG' ? 'SHORT' : 'LONG')
      : cfg.baseDirection;

    const turnoverJitter = (rng() - 0.5) * cfg.baseTurnover * 0.2;
    const turnoverRatio = Math.round((cfg.baseTurnover + turnoverJitter) * 10) / 10;

    const change1d = Math.round((rng() - 0.5) * 30);

    return { sector: cfg.sector, netExposureM, direction, turnoverRatio, change1d };
  });
}

function generateQuoteQuality(rng: () => number): QuoteQualityEntry[] {
  return QUOTE_QUALITY_CONFIGS.map((cfg) => {
    const qtJitter = (rng() - 0.5) * cfg.baseQTRatio * 0.15;
    const quoteToTradeRatio = Math.round((cfg.baseQTRatio + qtJitter) * 10) / 10;

    const nbboJitter = (rng() - 0.5) * 5;
    const timeAtNbboPct = Math.round(Math.max(10, Math.min(60, cfg.baseTimeAtNbbo + nbboJitter)) * 10) / 10;

    const asJitter = (rng() - 0.5) * cfg.baseAdverseSelection * 0.2;
    const adverseSelectionBps = Math.round((cfg.baseAdverseSelection + asJitter) * 100) / 100;

    return { venue: cfg.venue, quoteToTradeRatio, timeAtNbboPct, adverseSelectionBps };
  });
}

function generateDesignatedMM(rng: () => number): DesignatedMMEntry[] {
  return DESIGNATED_MM_CONFIGS.map((cfg) => {
    const timeJitter = (rng() - 0.5) * 4;
    const timeAtInsidePct = Math.round(Math.max(85, Math.min(99.5, cfg.baseTimeAtInside + timeJitter)) * 10) / 10;

    return {
      symbol: cfg.symbol,
      exchange: cfg.exchange,
      role: cfg.role,
      firm: cfg.firm,
      timeAtInsidePct,
    };
  });
}

function generateVolatilityRegime(rng: () => number): VolatilityRegime {
  const baseVix = 16.5;
  const vixJitter = (rng() - 0.5) * 12;
  const vix = Math.round((baseVix + vixJitter) * 100) / 100;

  let regime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH';
  if (vix < 13) {
    regime = 'LOW';
  } else if (vix < 20) {
    regime = 'NORMAL';
  } else if (vix < 28) {
    regime = 'ELEVATED';
  } else {
    regime = 'HIGH';
  }

  let spreadImpact: 'TIGHTENING' | 'STABLE' | 'WIDENING';
  if (vix < 14) {
    spreadImpact = 'TIGHTENING';
  } else if (vix < 22) {
    spreadImpact = 'STABLE';
  } else {
    spreadImpact = 'WIDENING';
  }

  let volumeImpact: 'BELOW_AVG' | 'AVERAGE' | 'ABOVE_AVG';
  if (vix < 14) {
    volumeImpact = 'BELOW_AVG';
  } else if (vix < 22) {
    volumeImpact = 'AVERAGE';
  } else {
    volumeImpact = 'ABOVE_AVG';
  }

  // Profitability index: higher vol = wider spreads = more profit opportunity, but also more risk
  const baseProfitability = 65;
  const profitJitter = (rng() - 0.5) * 20;
  const volBonus = vix > 20 ? (vix - 20) * 1.5 : vix < 13 ? (13 - vix) * -2 : 0;
  const mmProfitabilityIndex = Math.round(Math.max(20, Math.min(100, baseProfitability + profitJitter + volBonus)));

  return { regime, vix, spreadImpact, volumeImpact, mmProfitabilityIndex };
}

function generateRegulatoryMetrics(rng: () => number): RegulatoryMetric[] {
  return REGULATORY_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const value = Math.round((cfg.baseValue + jitter) * 100) / 100;

    let status: 'COMPLIANT' | 'WARNING' | 'BREACH';
    if (cfg.higherIsBetter) {
      if (value >= cfg.threshold) {
        status = 'COMPLIANT';
      } else if (value >= cfg.threshold * 0.995) {
        status = 'WARNING';
      } else {
        status = 'BREACH';
      }
    } else {
      if (value <= cfg.threshold) {
        status = 'COMPLIANT';
      } else if (value <= cfg.threshold * 1.1) {
        status = 'WARNING';
      } else {
        status = 'BREACH';
      }
    }

    return { metric: cfg.metric, value, unit: cfg.unit, threshold: cfg.threshold, status };
  });
}

function generateMarketMakingData(): MarketMakingResponse {
  const rng = seededRandom('market-making');

  const topMarketMakers = generateTopMarketMakers(rng);
  const spreadAnalysis = generateSpreadAnalysis(rng);
  const depthOfBook = generateDepthOfBook(rng);
  const inventoryRisk = generateInventoryRisk(rng);
  const quoteQuality = generateQuoteQuality(rng);
  const designatedMM = generateDesignatedMM(rng);
  const volatilityRegime = generateVolatilityRegime(rng);
  const regulatoryMetrics = generateRegulatoryMetrics(rng);

  // Summary
  const totalMmVolumeB = Math.round(
    topMarketMakers.reduce((sum, m) => sum + m.dailyVolumeB, 0) * 10
  ) / 10;

  const avgSpreadBps = Math.round(
    (topMarketMakers.reduce((sum, m) => sum + m.avgSpreadBps, 0) / topMarketMakers.length) * 100
  ) / 100;

  const topMaker = topMarketMakers.reduce(
    (max, m) => (m.marketSharePct > max.marketSharePct ? m : max),
    topMarketMakers[0]
  ).name;

  const summary: MarketMakingSummary = {
    totalMmVolumeB,
    avgSpreadBps,
    topMaker,
    volatilityRegime: volatilityRegime.regime,
    timestamp: new Date().toISOString(),
  };

  return {
    topMarketMakers,
    spreadAnalysis,
    depthOfBook,
    inventoryRisk,
    quoteQuality,
    designatedMM,
    volatilityRegime,
    regulatoryMetrics,
    summary,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateMarketMakingData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MarketMaking] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate market making data' });
  }
});

export default router;
