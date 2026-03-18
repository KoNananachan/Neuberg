import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface MarketDepth {
  bidDepth: number[];
  askDepth: number[];
  bidPrices: number[];
  askPrices: number[];
}

interface TradeSizeDistribution {
  small: number;
  medium: number;
  large: number;
  block: number;
}

interface MicrostructureEntry {
  symbol: string;
  name: string;
  price: number;
  bidAskSpread: number;
  spreadBps: number;
  avgDailyVolume: number;
  relativeVolume: number;
  avgTradeSize: number;
  blockTradesPct: number;
  darkPoolPct: number;
  marketDepth: MarketDepth;
  tradeSizeDistribution: TradeSizeDistribution;
  liquidityScore: number;
  spreadPercentile: number;
  microSignal: string | null;
  spreadHistory: number[];
}

interface MicrostructureResponse {
  entries: MicrostructureEntry[];
  marketSummary: {
    avgSpreadBps: number;
    totalVolume: number;
    avgLiquidityScore: number;
    wideSpreadsCount: number;
  };
  timestamp: string;
}

// ── Universe ──

const UNIVERSE: Array<{ symbol: string; name: string }> = [
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
  { symbol: 'AAPL', name: 'Apple Inc' },
  { symbol: 'TSLA', name: 'Tesla Inc' },
  { symbol: 'NVDA', name: 'NVIDIA Corp' },
  { symbol: 'AMZN', name: 'Amazon.com Inc' },
  { symbol: 'MSFT', name: 'Microsoft Corp' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'GOOGL', name: 'Alphabet Inc' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'GS', name: 'Goldman Sachs' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
];

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** Seeded PRNG for deterministic per-symbol noise */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashSymbol(symbol: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < symbol.length; i++) {
    h = ((h << 5) - h + symbol.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Compute realized volatility from closes */
function realizedVol(closes: number[], window: number): number {
  if (closes.length < window + 1) return 0;
  const slice = closes.slice(closes.length - window - 1);
  const returns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    if (slice[i - 1] > 0 && slice[i] > 0) {
      returns.push(Math.log(slice[i] / slice[i - 1]));
    }
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

/** Estimate bid-ask spread in basis points from volatility and volume */
function estimateSpreadBps(vol: number, avgVolume: number, price: number): number {
  // Higher vol => wider spreads, higher volume => tighter spreads
  // Base: ~0.5-1 bps for SPY-like, up to 5-10 bps for less liquid names
  const volFactor = Math.max(0.5, vol * 5); // vol contribution
  const volumeFactor = Math.max(0.3, 2 / Math.log10(Math.max(avgVolume, 100)));
  const priceFactor = price > 500 ? 0.8 : price > 100 ? 1.0 : price > 50 ? 1.2 : 1.5;
  return Math.max(0.3, volFactor * volumeFactor * priceFactor);
}

/** Generate realistic market depth based on price and volume profile */
function generateDepth(
  price: number,
  spreadCents: number,
  avgVolume: number,
  rng: () => number,
): MarketDepth {
  const halfSpread = spreadCents / 200; // half spread in dollars
  const bidPrices: number[] = [];
  const askPrices: number[] = [];
  const bidDepth: number[] = [];
  const askDepth: number[] = [];

  // Typical depth sizing scales with ADV
  const baseSize = Math.round(avgVolume / 5000);

  for (let level = 0; level < 5; level++) {
    const offset = halfSpread + level * (spreadCents / 100) * (0.8 + rng() * 0.4);
    bidPrices.push(round2(price - offset));
    askPrices.push(round2(price + offset));

    // Depth tends to increase at further levels
    const levelMultiplier = 1 + level * 0.3 + rng() * 0.5;
    bidDepth.push(Math.round(baseSize * levelMultiplier * (0.7 + rng() * 0.6)));
    askDepth.push(Math.round(baseSize * levelMultiplier * (0.7 + rng() * 0.6)));
  }

  return { bidDepth, askDepth, bidPrices, askPrices };
}

/** Generate trade size distribution based on stock characteristics */
function generateSizeDistribution(
  avgVolume: number,
  price: number,
  rng: () => number,
): TradeSizeDistribution {
  // High-volume, low-price stocks => more small retail trades
  // Low-volume, high-price stocks => more institutional/block
  const retailBias = Math.min(1, avgVolume / 50_000_000) * (price < 100 ? 1.3 : 0.8);

  let small = 30 + rng() * 15 + retailBias * 10;
  let medium = 35 + rng() * 10 - retailBias * 5;
  let large = 20 + rng() * 8;
  let block = 5 + rng() * 8;

  // Normalize to 100
  const total = small + medium + large + block;
  small = round2((small / total) * 100);
  medium = round2((medium / total) * 100);
  large = round2((large / total) * 100);
  block = round2(100 - small - medium - large);

  return { small, medium, large, block };
}

/** Compute liquidity score (0-100) from multiple factors */
function computeLiquidityScore(
  spreadBps: number,
  avgVolume: number,
  bidDepthTotal: number,
  askDepthTotal: number,
): number {
  // Spread component (0-40): tighter = better
  const spreadScore = Math.max(0, 40 - spreadBps * 4);

  // Volume component (0-30): higher = better
  const volScore = Math.min(30, Math.log10(Math.max(avgVolume, 1)) * 4 - 12);

  // Depth component (0-30): deeper = better
  const totalDepth = bidDepthTotal + askDepthTotal;
  const depthScore = Math.min(30, Math.log10(Math.max(totalDepth, 1)) * 6);

  return Math.round(Math.max(0, Math.min(100, spreadScore + volScore + depthScore)));
}

/** Derive signal based on microstructure metrics */
function deriveSignal(
  spreadPercentile: number,
  relativeVolume: number,
  blockTradesPct: number,
  liquidityScore: number,
): string | null {
  if (spreadPercentile > 90) return 'WIDE_SPREAD';
  if (relativeVolume > 2) return 'UNUSUAL_VOLUME';
  if (blockTradesPct > 15) return 'BLOCK_ACTIVITY';
  if (liquidityScore < 30) return 'LOW_LIQUIDITY';
  return null;
}

// ── Cache ──

let cache: { data: MicrostructureResponse; expiresAt: number } = {
  data: null as unknown as MicrostructureResponse,
  expiresAt: 0,
};
const CACHE_TTL = 120_000; // 2 minutes

// GET /api/market-microstructure
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const symbols = UNIVERSE.map((u) => u.symbol);

    // Fetch quotes and history in parallel
    const [quotes, ...historyResults] = await Promise.all([
      getQuotes(symbols),
      ...symbols.map((s) =>
        getHistory(s, { range: '1mo', interval: '1d' }).catch(() => []),
      ),
    ]);

    const quoteMap = new Map<string, {
      price: number;
      volume: number;
      avgVolume: number;
      dayHigh: number;
      dayLow: number;
    }>();
    for (const q of quotes) {
      // avgVolume may not exist on chart-fallback quote objects
      const avgVol = ('avgVolume' in q && typeof q.avgVolume === 'number') ? q.avgVolume : 0;
      quoteMap.set(q.symbol, {
        price: q.price ?? 0,
        volume: q.volume ?? 0,
        avgVolume: avgVol,
        dayHigh: q.dayHigh ?? q.price ?? 0,
        dayLow: q.dayLow ?? q.price ?? 0,
      });
    }

    // Use current minute as time-based seed for slight variation each refresh cycle
    const timeSeed = Math.floor(now / CACHE_TTL);

    const entries: MicrostructureEntry[] = [];

    for (let i = 0; i < UNIVERSE.length; i++) {
      const { symbol, name } = UNIVERSE[i];
      const quote = quoteMap.get(symbol);
      if (!quote || quote.price <= 0) continue;

      const { price, volume, avgVolume } = quote;
      const rng = seededRandom(hashSymbol(symbol, timeSeed));

      // Get historical closes for volatility + spread history
      const history = historyResults[i] as Array<{ close?: number | null }>;
      const closes = (history || [])
        .map((h) => h.close)
        .filter((c): c is number => c != null && c > 0);

      const vol30 = closes.length >= 10 ? realizedVol(closes, Math.min(30, closes.length - 1)) : 0.2;

      // Estimate spread
      const effectiveAdv = avgVolume > 0 ? avgVolume : 1_000_000;
      const spreadBps = estimateSpreadBps(vol30, effectiveAdv, price);
      const bidAskSpread = round2((spreadBps / 10000) * price * 100); // in cents

      // Relative volume
      const relativeVolume = avgVolume > 0
        ? round2(volume / avgVolume)
        : round2(0.8 + rng() * 0.4);

      // Average trade size — derived from volume pattern
      const avgTradeSize = Math.round(150 + (effectiveAdv / 1_000_000) * 30 + rng() * 80);

      // Block trades percentage
      const blockTradesPct = round2(3 + rng() * 12 + (price > 300 ? 3 : 0));

      // Dark pool percentage — typically 35-50% for large caps
      const darkPoolPct = round2(30 + rng() * 20 + (effectiveAdv > 20_000_000 ? 5 : 0));

      // Market depth
      const depth = generateDepth(price, bidAskSpread, effectiveAdv, rng);

      // Trade size distribution
      const tradeSizeDistribution = generateSizeDistribution(effectiveAdv, price, rng);

      // Liquidity score
      const bidDepthTotal = depth.bidDepth.reduce((a, b) => a + b, 0);
      const askDepthTotal = depth.askDepth.reduce((a, b) => a + b, 0);
      const liquidityScore = computeLiquidityScore(spreadBps, effectiveAdv, bidDepthTotal, askDepthTotal);

      // Spread history — simulate 20 data points based on recent vol pattern
      const spreadHistory: number[] = [];
      for (let j = 0; j < 20; j++) {
        const histIdx = Math.max(0, closes.length - 20 + j);
        const localVol = histIdx > 1 && histIdx < closes.length
          ? Math.abs(Math.log((closes[histIdx] || price) / (closes[histIdx - 1] || price))) * Math.sqrt(252)
          : vol30;
        const noise = 0.9 + rng() * 0.2;
        const histSpread = estimateSpreadBps(
          Math.max(0.05, localVol * noise),
          effectiveAdv,
          closes[histIdx] || price,
        );
        spreadHistory.push(round4(histSpread));
      }

      // Spread percentile vs its own 20-point history
      const sortedHistory = [...spreadHistory].sort((a, b) => a - b);
      const currentSpread = spreadHistory[spreadHistory.length - 1];
      const belowCount = sortedHistory.filter((s) => s < currentSpread).length;
      const spreadPercentile = Math.round((belowCount / sortedHistory.length) * 100);

      const microSignal = deriveSignal(spreadPercentile, relativeVolume, blockTradesPct, liquidityScore);

      entries.push({
        symbol,
        name,
        price: round2(price),
        bidAskSpread: round2(bidAskSpread),
        spreadBps: round2(spreadBps),
        avgDailyVolume: effectiveAdv,
        relativeVolume,
        avgTradeSize,
        blockTradesPct,
        darkPoolPct,
        marketDepth: depth,
        tradeSizeDistribution,
        liquidityScore,
        spreadPercentile,
        microSignal,
        spreadHistory,
      });
    }

    // Sort by liquidity score descending
    entries.sort((a, b) => b.liquidityScore - a.liquidityScore);

    // Market summary
    const avgSpreadBps = entries.length > 0
      ? round2(entries.reduce((s, e) => s + e.spreadBps, 0) / entries.length)
      : 0;
    const totalVolume = entries.reduce((s, e) => s + e.avgDailyVolume * e.relativeVolume, 0);
    const avgLiquidityScore = entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + e.liquidityScore, 0) / entries.length)
      : 0;
    const wideSpreadsCount = entries.filter((e) => e.spreadPercentile > 90).length;

    const response: MicrostructureResponse = {
      entries,
      marketSummary: {
        avgSpreadBps,
        totalVolume: Math.round(totalVolume),
        avgLiquidityScore,
        wideSpreadsCount,
      },
      timestamp: new Date().toISOString(),
    };

    cache = { data: response, expiresAt: now + CACHE_TTL };
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MarketMicrostructure] Error:', message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch market microstructure data' });
  }
});

export default router;
