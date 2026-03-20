import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface AlgoPerformanceEntry {
  strategy: string;
  avgSlippageBps: number;
  fillRate: number;
  participationRate: number;
  avgOrderSize: number;
  tradeCount: number;
  successRate: number;
}

interface VenueAnalysisEntry {
  venue: string;
  venueType: 'exchange' | 'dark_pool' | 'ats';
  fillRate: number;
  avgSpreadBps: number;
  marketSharePct: number;
  rebatePerShare: number;
  avgLatencyUs: number;
}

interface TCAEntry {
  metric: string;
  period: string;
  valueBps: number;
  change1w: number;
  percentileRank: number;
}

interface SmartOrderRoutingStats {
  totalRoutingDecisions: number;
  avgRoutingLatencyUs: number;
  venueOptimizationScore: number;
  darkPoolSeekRate: number;
  litVsDarkSplit: { lit: number; dark: number };
  avgPriceImprovement: number;
  rejectionRate: number;
}

interface MarketMicrostructureEntry {
  ticker: string;
  sector: string;
  avgBidAskSpreadBps: number;
  avgDepthShares: number;
  queuePriorityScore: number;
  adverseSelectionBps: number;
  avgDailyVolume: number;
}

interface RealtimeOrderEntry {
  orderId: string;
  algo: string;
  ticker: string;
  side: 'BUY' | 'SELL';
  totalSize: number;
  filledSize: number;
  avgPrice: number;
  benchmarkPrice: number;
  slippageBps: number;
  status: 'working' | 'completed' | 'cancelled';
  startTime: string;
  duration: string;
}

interface BenchmarkComparisonEntry {
  orderId: string;
  ticker: string;
  benchmark: string;
  benchmarkPrice: number;
  execPrice: number;
  slippageBps: number;
  outperformed: boolean;
}

interface LatencyMetrics {
  orderToFill: { p50Us: number; p95Us: number; p99Us: number };
  gatewayLatency: { p50Us: number; p95Us: number; p99Us: number };
  marketDataLatency: { p50Us: number; p95Us: number; p99Us: number };
  feedHandlerLatency: { p50Us: number; p95Us: number; p99Us: number };
}

interface AlgoExecutionResponse {
  algoPerformance: AlgoPerformanceEntry[];
  venueAnalysis: VenueAnalysisEntry[];
  tca: TCAEntry[];
  smartOrderRouting: SmartOrderRoutingStats;
  marketMicrostructure: MarketMicrostructureEntry[];
  realtimeOrders: RealtimeOrderEntry[];
  benchmarkComparison: BenchmarkComparisonEntry[];
  latencyMetrics: LatencyMetrics;
  timestamp: string;
}

// ── Cache ──

let cache: { data: AlgoExecutionResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Algo strategy configuration ──

interface AlgoStrategyConfig {
  strategy: string;
  baseSlippageBps: number;
  baseFillRate: number;
  baseParticipationRate: number;
  baseAvgOrderSizeK: number;
  baseTradeCount: number;
  baseSuccessRate: number;
}

const ALGO_STRATEGY_CONFIGS: AlgoStrategyConfig[] = [
  { strategy: 'VWAP', baseSlippageBps: 1.2, baseFillRate: 97.5, baseParticipationRate: 12.0, baseAvgOrderSizeK: 450, baseTradeCount: 1842, baseSuccessRate: 94.2 },
  { strategy: 'TWAP', baseSlippageBps: 1.8, baseFillRate: 98.2, baseParticipationRate: 8.5, baseAvgOrderSizeK: 320, baseTradeCount: 1534, baseSuccessRate: 95.8 },
  { strategy: 'POV', baseSlippageBps: 2.1, baseFillRate: 96.8, baseParticipationRate: 15.0, baseAvgOrderSizeK: 680, baseTradeCount: 967, baseSuccessRate: 91.5 },
  { strategy: 'IS', baseSlippageBps: 0.8, baseFillRate: 94.5, baseParticipationRate: 18.0, baseAvgOrderSizeK: 520, baseTradeCount: 1256, baseSuccessRate: 88.7 },
  { strategy: 'Arrival Price', baseSlippageBps: 0.6, baseFillRate: 93.2, baseParticipationRate: 20.0, baseAvgOrderSizeK: 380, baseTradeCount: 1089, baseSuccessRate: 87.3 },
  { strategy: 'Close', baseSlippageBps: 3.5, baseFillRate: 99.1, baseParticipationRate: 25.0, baseAvgOrderSizeK: 750, baseTradeCount: 624, baseSuccessRate: 96.5 },
  { strategy: 'Iceberg', baseSlippageBps: 1.5, baseFillRate: 95.0, baseParticipationRate: 5.0, baseAvgOrderSizeK: 1200, baseTradeCount: 432, baseSuccessRate: 92.1 },
  { strategy: 'Sniper', baseSlippageBps: 0.3, baseFillRate: 82.5, baseParticipationRate: 35.0, baseAvgOrderSizeK: 200, baseTradeCount: 2156, baseSuccessRate: 78.4 },
];

// ── Venue configuration ──

interface VenueConfig {
  venue: string;
  venueType: 'exchange' | 'dark_pool' | 'ats';
  baseFillRate: number;
  baseSpreadBps: number;
  baseMarketSharePct: number;
  baseRebatePerShare: number;
  baseLatencyUs: number;
}

const VENUE_CONFIGS: VenueConfig[] = [
  { venue: 'NYSE', venueType: 'exchange', baseFillRate: 94.5, baseSpreadBps: 1.8, baseMarketSharePct: 22.4, baseRebatePerShare: -0.0030, baseLatencyUs: 120 },
  { venue: 'NASDAQ', venueType: 'exchange', baseFillRate: 95.2, baseSpreadBps: 1.5, baseMarketSharePct: 18.7, baseRebatePerShare: -0.0028, baseLatencyUs: 95 },
  { venue: 'BATS BZX', venueType: 'exchange', baseFillRate: 93.8, baseSpreadBps: 1.6, baseMarketSharePct: 11.2, baseRebatePerShare: -0.0025, baseLatencyUs: 85 },
  { venue: 'BATS BYX', venueType: 'exchange', baseFillRate: 92.1, baseSpreadBps: 2.0, baseMarketSharePct: 5.8, baseRebatePerShare: 0.0018, baseLatencyUs: 88 },
  { venue: 'IEX', venueType: 'exchange', baseFillRate: 88.5, baseSpreadBps: 2.2, baseMarketSharePct: 3.4, baseRebatePerShare: 0.0009, baseLatencyUs: 350 },
  { venue: 'Crossfinder', venueType: 'dark_pool', baseFillRate: 72.3, baseSpreadBps: 0.8, baseMarketSharePct: 8.5, baseRebatePerShare: 0.0000, baseLatencyUs: 180 },
  { venue: 'Sigma X', venueType: 'dark_pool', baseFillRate: 68.7, baseSpreadBps: 0.6, baseMarketSharePct: 6.2, baseRebatePerShare: 0.0000, baseLatencyUs: 200 },
  { venue: 'MS Pool', venueType: 'dark_pool', baseFillRate: 65.4, baseSpreadBps: 0.7, baseMarketSharePct: 5.1, baseRebatePerShare: 0.0000, baseLatencyUs: 210 },
  { venue: 'POSIT', venueType: 'ats', baseFillRate: 61.2, baseSpreadBps: 0.4, baseMarketSharePct: 4.3, baseRebatePerShare: 0.0000, baseLatencyUs: 250 },
  { venue: 'Liquidnet', venueType: 'ats', baseFillRate: 45.8, baseSpreadBps: 0.2, baseMarketSharePct: 3.8, baseRebatePerShare: 0.0000, baseLatencyUs: 320 },
];

// ── TCA metric configuration ──

interface TCAMetricConfig {
  metric: string;
  periods: string[];
  baseValueBps: number;
  volatility: number;
}

const TCA_METRIC_CONFIGS: TCAMetricConfig[] = [
  { metric: 'Implementation Shortfall', periods: ['1D', '1W', '1M', '3M'], baseValueBps: 3.2, volatility: 1.5 },
  { metric: 'Spread Cost', periods: ['1D', '1W', '1M', '3M'], baseValueBps: 1.4, volatility: 0.4 },
  { metric: 'Timing Cost', periods: ['1D', '1W', '1M', '3M'], baseValueBps: 0.8, volatility: 0.6 },
  { metric: 'Market Impact', periods: ['1D', '1W', '1M', '3M'], baseValueBps: 2.5, volatility: 1.2 },
  { metric: 'Opportunity Cost', periods: ['1D', '1W', '1M', '3M'], baseValueBps: 1.1, volatility: 0.8 },
];

// ── Market microstructure configuration ──

interface MicrostructureConfig {
  ticker: string;
  sector: string;
  baseSpreadBps: number;
  baseDepthShares: number;
  baseQueuePriority: number;
  baseAdverseSelectionBps: number;
  baseAvgDailyVolumeM: number;
}

const MICROSTRUCTURE_CONFIGS: MicrostructureConfig[] = [
  { ticker: 'AAPL', sector: 'Technology', baseSpreadBps: 0.8, baseDepthShares: 45000, baseQueuePriority: 0.82, baseAdverseSelectionBps: 0.3, baseAvgDailyVolumeM: 62.5 },
  { ticker: 'MSFT', sector: 'Technology', baseSpreadBps: 0.9, baseDepthShares: 38000, baseQueuePriority: 0.79, baseAdverseSelectionBps: 0.4, baseAvgDailyVolumeM: 28.3 },
  { ticker: 'GOOGL', sector: 'Technology', baseSpreadBps: 1.2, baseDepthShares: 22000, baseQueuePriority: 0.75, baseAdverseSelectionBps: 0.5, baseAvgDailyVolumeM: 21.7 },
  { ticker: 'AMZN', sector: 'Consumer Discretionary', baseSpreadBps: 1.0, baseDepthShares: 30000, baseQueuePriority: 0.77, baseAdverseSelectionBps: 0.4, baseAvgDailyVolumeM: 35.1 },
  { ticker: 'JPM', sector: 'Financials', baseSpreadBps: 1.5, baseDepthShares: 25000, baseQueuePriority: 0.73, baseAdverseSelectionBps: 0.6, baseAvgDailyVolumeM: 12.8 },
  { ticker: 'JNJ', sector: 'Healthcare', baseSpreadBps: 1.8, baseDepthShares: 18000, baseQueuePriority: 0.70, baseAdverseSelectionBps: 0.7, baseAvgDailyVolumeM: 8.4 },
  { ticker: 'XOM', sector: 'Energy', baseSpreadBps: 1.4, baseDepthShares: 28000, baseQueuePriority: 0.74, baseAdverseSelectionBps: 0.5, baseAvgDailyVolumeM: 16.2 },
  { ticker: 'NVDA', sector: 'Technology', baseSpreadBps: 0.7, baseDepthShares: 52000, baseQueuePriority: 0.85, baseAdverseSelectionBps: 0.6, baseAvgDailyVolumeM: 48.9 },
  { ticker: 'TSLA', sector: 'Consumer Discretionary', baseSpreadBps: 1.1, baseDepthShares: 35000, baseQueuePriority: 0.76, baseAdverseSelectionBps: 0.8, baseAvgDailyVolumeM: 78.3 },
  { ticker: 'META', sector: 'Technology', baseSpreadBps: 1.0, baseDepthShares: 32000, baseQueuePriority: 0.78, baseAdverseSelectionBps: 0.5, baseAvgDailyVolumeM: 22.6 },
];

// ── Realtime orders configuration ──

const ORDER_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'XOM', 'JNJ', 'BAC', 'V', 'UNH', 'HD', 'PG'];
const ORDER_ALGOS = ['VWAP', 'TWAP', 'POV', 'IS', 'Arrival Price', 'Close', 'Iceberg', 'Sniper'];
const ORDER_STATUSES: ('working' | 'completed' | 'cancelled')[] = ['working', 'completed', 'cancelled'];

// ── Reference prices for tickers ──

const TICKER_REFERENCE_PRICES: Record<string, number> = {
  AAPL: 187.50, MSFT: 420.30, GOOGL: 175.80, AMZN: 195.60, NVDA: 875.40,
  TSLA: 172.90, META: 515.20, JPM: 198.70, XOM: 106.40, JNJ: 157.30,
  BAC: 38.50, V: 285.60, UNH: 528.40, HD: 385.70, PG: 168.90,
};

// ── Data generation ──

function generateAlgoPerformance(rng: () => number): AlgoPerformanceEntry[] {
  return ALGO_STRATEGY_CONFIGS.map((cfg) => {
    const slippageJitter = (rng() - 0.5) * cfg.baseSlippageBps * 0.4;
    const avgSlippageBps = Math.round((cfg.baseSlippageBps + slippageJitter) * 100) / 100;

    const fillJitter = (rng() - 0.5) * 3;
    const fillRate = Math.round(Math.max(50, Math.min(100, cfg.baseFillRate + fillJitter)) * 10) / 10;

    const partJitter = (rng() - 0.5) * cfg.baseParticipationRate * 0.2;
    const participationRate = Math.round(Math.max(1, Math.min(50, cfg.baseParticipationRate + partJitter)) * 10) / 10;

    const sizeJitter = Math.floor((rng() - 0.5) * cfg.baseAvgOrderSizeK * 0.2);
    const avgOrderSize = cfg.baseAvgOrderSizeK + sizeJitter;

    const countJitter = Math.floor((rng() - 0.5) * cfg.baseTradeCount * 0.15);
    const tradeCount = cfg.baseTradeCount + countJitter;

    const successJitter = (rng() - 0.5) * 4;
    const successRate = Math.round(Math.max(50, Math.min(100, cfg.baseSuccessRate + successJitter)) * 10) / 10;

    return {
      strategy: cfg.strategy,
      avgSlippageBps,
      fillRate,
      participationRate,
      avgOrderSize,
      tradeCount,
      successRate,
    };
  });
}

function generateVenueAnalysis(rng: () => number): VenueAnalysisEntry[] {
  return VENUE_CONFIGS.map((cfg) => {
    const fillJitter = (rng() - 0.5) * 6;
    const fillRate = Math.round(Math.max(20, Math.min(100, cfg.baseFillRate + fillJitter)) * 10) / 10;

    const spreadJitter = (rng() - 0.5) * cfg.baseSpreadBps * 0.3;
    const avgSpreadBps = Math.round(Math.max(0.1, cfg.baseSpreadBps + spreadJitter) * 100) / 100;

    const shareJitter = (rng() - 0.5) * 2;
    const marketSharePct = Math.round(Math.max(0.5, cfg.baseMarketSharePct + shareJitter) * 10) / 10;

    const rebateJitter = (rng() - 0.5) * 0.001;
    const rebatePerShare = Math.round((cfg.baseRebatePerShare + rebateJitter) * 10000) / 10000;

    const latencyJitter = Math.floor((rng() - 0.5) * cfg.baseLatencyUs * 0.25);
    const avgLatencyUs = Math.max(10, cfg.baseLatencyUs + latencyJitter);

    return {
      venue: cfg.venue,
      venueType: cfg.venueType,
      fillRate,
      avgSpreadBps,
      marketSharePct,
      rebatePerShare,
      avgLatencyUs,
    };
  });
}

function generateTCA(rng: () => number): TCAEntry[] {
  const entries: TCAEntry[] = [];

  for (const cfg of TCA_METRIC_CONFIGS) {
    for (const period of cfg.periods) {
      // Longer periods tend to have slightly higher costs
      const periodMultiplier = period === '1D' ? 0.8 : period === '1W' ? 0.95 : period === '1M' ? 1.0 : 1.1;
      const jitter = (rng() - 0.5) * cfg.volatility * 2;
      const valueBps = Math.round(Math.max(0.01, cfg.baseValueBps * periodMultiplier + jitter) * 100) / 100;

      const change1w = Math.round((rng() - 0.5) * cfg.volatility * 100) / 100;

      const rawPercentile = 30 + rng() * 60;
      const percentileRank = Math.round(Math.max(1, Math.min(99, rawPercentile)));

      entries.push({
        metric: cfg.metric,
        period,
        valueBps,
        change1w,
        percentileRank,
      });
    }
  }

  return entries;
}

function generateSmartOrderRouting(rng: () => number): SmartOrderRoutingStats {
  const totalRoutingDecisions = Math.floor(85000 + rng() * 30000);
  const avgRoutingLatencyUs = Math.round((45 + rng() * 25) * 10) / 10;
  const venueOptimizationScore = Math.round((0.78 + rng() * 0.15) * 1000) / 1000;
  const darkPoolSeekRate = Math.round((0.25 + rng() * 0.2) * 1000) / 1000;
  const litPct = Math.round((55 + rng() * 20) * 10) / 10;
  const darkPct = Math.round((100 - litPct) * 10) / 10;
  const avgPriceImprovement = Math.round((0.15 + rng() * 0.35) * 100) / 100;
  const rejectionRate = Math.round((0.8 + rng() * 1.5) * 100) / 100;

  return {
    totalRoutingDecisions,
    avgRoutingLatencyUs,
    venueOptimizationScore,
    darkPoolSeekRate,
    litVsDarkSplit: { lit: litPct, dark: darkPct },
    avgPriceImprovement,
    rejectionRate,
  };
}

function generateMarketMicrostructure(rng: () => number): MarketMicrostructureEntry[] {
  return MICROSTRUCTURE_CONFIGS.map((cfg) => {
    const spreadJitter = (rng() - 0.5) * cfg.baseSpreadBps * 0.3;
    const avgBidAskSpreadBps = Math.round(Math.max(0.1, cfg.baseSpreadBps + spreadJitter) * 100) / 100;

    const depthJitter = Math.floor((rng() - 0.5) * cfg.baseDepthShares * 0.25);
    const avgDepthShares = Math.max(1000, cfg.baseDepthShares + depthJitter);

    const queueJitter = (rng() - 0.5) * 0.1;
    const queuePriorityScore = Math.round(Math.max(0.1, Math.min(1.0, cfg.baseQueuePriority + queueJitter)) * 100) / 100;

    const adverseJitter = (rng() - 0.5) * cfg.baseAdverseSelectionBps * 0.4;
    const adverseSelectionBps = Math.round(Math.max(0.01, cfg.baseAdverseSelectionBps + adverseJitter) * 100) / 100;

    const volJitter = (rng() - 0.5) * cfg.baseAvgDailyVolumeM * 0.2;
    const avgDailyVolume = Math.round(Math.max(0.5, cfg.baseAvgDailyVolumeM + volJitter) * 10) / 10;

    return {
      ticker: cfg.ticker,
      sector: cfg.sector,
      avgBidAskSpreadBps,
      avgDepthShares,
      queuePriorityScore,
      adverseSelectionBps,
      avgDailyVolume,
    };
  });
}

function generateRealtimeOrders(rng: () => number): RealtimeOrderEntry[] {
  const orders: RealtimeOrderEntry[] = [];
  const count = 15 + Math.floor(rng() * 10);

  for (let i = 0; i < count; i++) {
    const tickerIdx = Math.floor(rng() * ORDER_TICKERS.length);
    const ticker = ORDER_TICKERS[tickerIdx];
    const algoIdx = Math.floor(rng() * ORDER_ALGOS.length);
    const algo = ORDER_ALGOS[algoIdx];

    const side: 'BUY' | 'SELL' = rng() > 0.5 ? 'BUY' : 'SELL';
    const totalSize = Math.floor(1000 + rng() * 49000);

    // Status distribution: ~40% completed, ~35% working, ~25% cancelled
    const statusRoll = rng();
    const status = statusRoll < 0.40 ? 'completed' : statusRoll < 0.75 ? 'working' : 'cancelled';

    let filledSize: number;
    if (status === 'completed') {
      filledSize = totalSize;
    } else if (status === 'cancelled') {
      filledSize = Math.floor(totalSize * rng() * 0.6);
    } else {
      filledSize = Math.floor(totalSize * (0.2 + rng() * 0.7));
    }

    const refPrice = TICKER_REFERENCE_PRICES[ticker] || 150;
    const priceJitter = (rng() - 0.5) * refPrice * 0.02;
    const benchmarkPrice = Math.round((refPrice + priceJitter) * 100) / 100;

    // Slippage: small for good fills, wider for aggressive algos
    const slippageBase = (rng() - 0.3) * 3; // slight negative bias (cost)
    const slippageBps = Math.round(slippageBase * 100) / 100;

    const avgPrice = Math.round((benchmarkPrice * (1 + slippageBps / 10000 * (side === 'BUY' ? 1 : -1))) * 100) / 100;

    // Generate a time offset from start of day
    const hoursAgo = rng() * 6.5; // within trading hours
    const startHour = 9 + Math.floor(hoursAgo);
    const startMin = Math.floor(rng() * 60);
    const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:${Math.floor(rng() * 60).toString().padStart(2, '0')}`;

    const durationMins = Math.floor(5 + rng() * 120);
    const durH = Math.floor(durationMins / 60);
    const durM = durationMins % 60;
    const duration = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;

    const orderId = `AE-${(1000 + i).toString(36).toUpperCase()}-${Math.floor(rng() * 9000 + 1000)}`;

    orders.push({
      orderId,
      algo,
      ticker,
      side,
      totalSize,
      filledSize,
      avgPrice,
      benchmarkPrice,
      slippageBps,
      status,
      startTime,
      duration,
    });
  }

  return orders;
}

function generateBenchmarkComparison(rng: () => number, orders: RealtimeOrderEntry[]): BenchmarkComparisonEntry[] {
  const benchmarks = ['VWAP', 'TWAP', 'Arrival Price'];
  const entries: BenchmarkComparisonEntry[] = [];

  // Generate comparisons for completed and working orders with fills
  const relevantOrders = orders.filter((o) => o.filledSize > 0);

  for (const order of relevantOrders) {
    for (const benchmark of benchmarks) {
      // Benchmark price varies slightly from order benchmark
      const bmJitter = (rng() - 0.5) * order.benchmarkPrice * 0.001;
      const benchmarkPrice = Math.round((order.benchmarkPrice + bmJitter) * 100) / 100;

      const execPrice = order.avgPrice;
      const slippageBps = Math.round(((execPrice - benchmarkPrice) / benchmarkPrice * 10000) * (order.side === 'BUY' ? 1 : -1) * 100) / 100;
      const outperformed = slippageBps < 0; // negative slippage = outperformance

      entries.push({
        orderId: order.orderId,
        ticker: order.ticker,
        benchmark,
        benchmarkPrice,
        execPrice,
        slippageBps,
        outperformed,
      });
    }
  }

  return entries;
}

function generateLatencyMetrics(rng: () => number): LatencyMetrics {
  const genPercentiles = (baseP50: number, spreadFactor: number) => {
    const p50Jitter = (rng() - 0.5) * baseP50 * 0.2;
    const p50Us = Math.round(Math.max(1, baseP50 + p50Jitter));
    const p95Us = Math.round(p50Us * (2.5 + rng() * spreadFactor));
    const p99Us = Math.round(p95Us * (1.8 + rng() * 1.2));
    return { p50Us, p95Us, p99Us };
  };

  return {
    orderToFill: genPercentiles(850, 2.0),
    gatewayLatency: genPercentiles(45, 1.5),
    marketDataLatency: genPercentiles(12, 1.0),
    feedHandlerLatency: genPercentiles(8, 0.8),
  };
}

function generateAlgoExecutionData(): AlgoExecutionResponse {
  const rng = seededRandom('algo-execution');

  const algoPerformance = generateAlgoPerformance(rng);
  const venueAnalysis = generateVenueAnalysis(rng);
  const tca = generateTCA(rng);
  const smartOrderRouting = generateSmartOrderRouting(rng);
  const marketMicrostructure = generateMarketMicrostructure(rng);
  const realtimeOrders = generateRealtimeOrders(rng);
  const benchmarkComparison = generateBenchmarkComparison(rng, realtimeOrders);
  const latencyMetrics = generateLatencyMetrics(rng);

  return {
    algoPerformance,
    venueAnalysis,
    tca,
    smartOrderRouting,
    marketMicrostructure,
    realtimeOrders,
    benchmarkComparison,
    latencyMetrics,
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

    const data = generateAlgoExecutionData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AlgoExecution] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate algo execution data' });
  }
});

export default router;
