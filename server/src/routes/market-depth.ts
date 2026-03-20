import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// --- Type definitions ---

interface PriceLevel {
  price: number;
  size: number;
  orders: number;
  cumulative: number;
}

interface StockDepth {
  ticker: string;
  name: string;
  price: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
  spread: number;
  spreadBps: number;
  midPrice: number;
  bidDepth: number;
  askDepth: number;
  imbalance: number;
  liquidityScore: number;
  avgDailyVolume: number;
  volumeToday: number;
  vwap: number;
}

interface AggregateDepth {
  totalBids: number;
  totalAsks: number;
  netImbalance: number;
  avgSpread: number;
  medianLiquidityScore: number;
}

interface LiquidityScoreEntry {
  ticker: string;
  score: number;
  tier: 'Ultra-Liquid' | 'Liquid' | 'Moderate' | 'Thin';
  avgSpread: number;
  depthRatio: number;
  resilience: number;
}

interface DepthSummary {
  mostLiquid: string;
  leastLiquid: string;
  avgImbalance: number;
  wideSpreadCount: number;
  buyPressureCount: number;
  sellPressureCount: number;
}

interface MarketDepthResponse {
  stocks: StockDepth[];
  aggregateDepth: AggregateDepth;
  liquidityScores: LiquidityScoreEntry[];
  summary: DepthSummary;
  generatedAt: string;
}

// --- Stock definitions with realistic base prices and spreads ---

interface StockDef {
  ticker: string;
  name: string;
  basePrice: number;
  baseSpreadCents: number;
  baseBidSize: number;
  baseAskSize: number;
  baseAvgDailyVolume: number;
  baseLiquidity: number;
}

const STOCK_DEFS: StockDef[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', basePrice: 527.40, baseSpreadCents: 1, baseBidSize: 25000, baseAskSize: 24000, baseAvgDailyVolume: 78_000_000, baseLiquidity: 98 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', basePrice: 445.80, baseSpreadCents: 1, baseBidSize: 18000, baseAskSize: 17500, baseAvgDailyVolume: 52_000_000, baseLiquidity: 96 },
  { ticker: 'AAPL', name: 'Apple Inc.', basePrice: 213.25, baseSpreadCents: 1, baseBidSize: 8000, baseAskSize: 7800, baseAvgDailyVolume: 55_000_000, baseLiquidity: 95 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', basePrice: 428.50, baseSpreadCents: 2, baseBidSize: 4500, baseAskSize: 4400, baseAvgDailyVolume: 22_000_000, baseLiquidity: 93 },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', basePrice: 875.30, baseSpreadCents: 3, baseBidSize: 3200, baseAskSize: 3100, baseAvgDailyVolume: 42_000_000, baseLiquidity: 92 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', basePrice: 186.40, baseSpreadCents: 2, baseBidSize: 6500, baseAskSize: 6300, baseAvgDailyVolume: 38_000_000, baseLiquidity: 91 },
  { ticker: 'GOOG', name: 'Alphabet Inc. Class C', basePrice: 175.60, baseSpreadCents: 2, baseBidSize: 5200, baseAskSize: 5000, baseAvgDailyVolume: 25_000_000, baseLiquidity: 90 },
  { ticker: 'META', name: 'Meta Platforms Inc.', basePrice: 505.20, baseSpreadCents: 3, baseBidSize: 3800, baseAskSize: 3700, baseAvgDailyVolume: 18_000_000, baseLiquidity: 88 },
  { ticker: 'TSLA', name: 'Tesla Inc.', basePrice: 248.90, baseSpreadCents: 7, baseBidSize: 4200, baseAskSize: 4500, baseAvgDailyVolume: 95_000_000, baseLiquidity: 82 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', basePrice: 198.70, baseSpreadCents: 2, baseBidSize: 3500, baseAskSize: 3400, baseAvgDailyVolume: 10_000_000, baseLiquidity: 85 },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', basePrice: 117.30, baseSpreadCents: 2, baseBidSize: 4800, baseAskSize: 4600, baseAvgDailyVolume: 15_000_000, baseLiquidity: 84 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', basePrice: 412.80, baseSpreadCents: 5, baseBidSize: 1800, baseAskSize: 1700, baseAvgDailyVolume: 4_500_000, baseLiquidity: 78 },
];

// --- Cache ---

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: MarketDepthResponse; ts: number } | null = null;

// --- Generation logic ---

function generate(): MarketDepthResponse {
  const rng = seededRandom('market-depth');
  const jitter = (base: number, pct: number): number => base * (1 + (rng() - 0.5) * 2 * pct);

  const stocks: StockDepth[] = STOCK_DEFS.map((def) => {
    // Price with slight daily variation
    const price = Math.round(jitter(def.basePrice, 0.015) * 100) / 100;
    const spreadCents = Math.max(1, Math.round(jitter(def.baseSpreadCents, 0.3)));
    const spread = spreadCents / 100;
    const midPrice = Math.round(price * 100) / 100;
    const halfSpread = spread / 2;

    // Generate 5 bid levels (descending from best bid)
    const bestBid = Math.round((midPrice - halfSpread) * 100) / 100;
    const bids: PriceLevel[] = [];
    let bidCumulative = 0;
    for (let i = 0; i < 5; i++) {
      const levelPrice = Math.round((bestBid - i * 0.01 * Math.max(1, Math.ceil(def.baseSpreadCents / 2))) * 100) / 100;
      const size = Math.round(jitter(def.baseBidSize * (1 - i * 0.12), 0.25));
      const orders = Math.round(jitter(Math.max(5, def.baseBidSize / 200), 0.35));
      bidCumulative += size;
      bids.push({ price: levelPrice, size, orders, cumulative: bidCumulative });
    }

    // Generate 5 ask levels (ascending from best ask)
    const bestAsk = Math.round((midPrice + halfSpread) * 100) / 100;
    const asks: PriceLevel[] = [];
    let askCumulative = 0;
    for (let i = 0; i < 5; i++) {
      const levelPrice = Math.round((bestAsk + i * 0.01 * Math.max(1, Math.ceil(def.baseSpreadCents / 2))) * 100) / 100;
      const size = Math.round(jitter(def.baseAskSize * (1 - i * 0.12), 0.25));
      const orders = Math.round(jitter(Math.max(5, def.baseAskSize / 200), 0.35));
      askCumulative += size;
      asks.push({ price: levelPrice, size, orders, cumulative: askCumulative });
    }

    const bidDepth = bids.reduce((sum, b) => sum + b.size, 0);
    const askDepth = asks.reduce((sum, a) => sum + a.size, 0);
    const totalDepth = bidDepth + askDepth;
    const imbalance = totalDepth > 0 ? Math.round((bidDepth / totalDepth) * 1000) / 10 : 50;

    const spreadBps = midPrice > 0 ? Math.round((spread / midPrice) * 10000 * 100) / 100 : 0;

    // Liquidity score with daily jitter
    const liquidityScore = Math.round(Math.min(100, Math.max(0, jitter(def.baseLiquidity, 0.05))));

    const avgDailyVolume = Math.round(jitter(def.baseAvgDailyVolume, 0.1));
    const volumeToday = Math.round(jitter(def.baseAvgDailyVolume * 0.65, 0.2));
    const vwap = Math.round(jitter(price, 0.003) * 100) / 100;

    return {
      ticker: def.ticker,
      name: def.name,
      price,
      bids,
      asks,
      spread: spreadCents,
      spreadBps,
      midPrice,
      bidDepth,
      askDepth,
      imbalance,
      liquidityScore,
      avgDailyVolume,
      volumeToday,
      vwap,
    };
  });

  // --- Aggregate depth ---
  const totalBidsDollar = stocks.reduce((sum, s) => sum + s.bidDepth * s.midPrice, 0);
  const totalAsksDollar = stocks.reduce((sum, s) => sum + s.askDepth * s.midPrice, 0);
  const totalBids = Math.round(totalBidsDollar / 1_000_000_000 * 1000) / 1000;
  const totalAsks = Math.round(totalAsksDollar / 1_000_000_000 * 1000) / 1000;
  const netImbalance = totalBidsDollar + totalAsksDollar > 0
    ? Math.round((totalBidsDollar / (totalBidsDollar + totalAsksDollar)) * 1000) / 10
    : 50;
  const avgSpread = Math.round(stocks.reduce((sum, s) => sum + s.spreadBps, 0) / stocks.length * 100) / 100;

  const sortedScores = stocks.map(s => s.liquidityScore).sort((a, b) => a - b);
  const mid = Math.floor(sortedScores.length / 2);
  const medianLiquidityScore = sortedScores.length % 2 === 0
    ? Math.round((sortedScores[mid - 1] + sortedScores[mid]) / 2)
    : sortedScores[mid];

  const aggregateDepth: AggregateDepth = {
    totalBids,
    totalAsks,
    netImbalance,
    avgSpread,
    medianLiquidityScore,
  };

  // --- Liquidity scores ---
  const liquidityScores: LiquidityScoreEntry[] = stocks
    .map((s) => {
      const score = s.liquidityScore;
      let tier: LiquidityScoreEntry['tier'];
      if (score >= 93) tier = 'Ultra-Liquid';
      else if (score >= 85) tier = 'Liquid';
      else if (score >= 75) tier = 'Moderate';
      else tier = 'Thin';

      const depthRatio = s.askDepth > 0 ? Math.round((s.bidDepth / s.askDepth) * 100) / 100 : 1;
      const resilience = Math.round(Math.min(10, Math.max(1, jitter(score / 11, 0.15))) * 10) / 10;

      return {
        ticker: s.ticker,
        score,
        tier,
        avgSpread: s.spreadBps,
        depthRatio,
        resilience,
      };
    })
    .sort((a, b) => b.score - a.score);

  // --- Summary ---
  const mostLiquid = liquidityScores[0].ticker;
  const leastLiquid = liquidityScores[liquidityScores.length - 1].ticker;
  const avgImbalance = Math.round(stocks.reduce((sum, s) => sum + s.imbalance, 0) / stocks.length * 10) / 10;
  const wideSpreadCount = stocks.filter(s => s.spreadBps > 5).length;
  const buyPressureCount = stocks.filter(s => s.imbalance > 50).length;
  const sellPressureCount = stocks.filter(s => s.imbalance < 50).length;

  const summary: DepthSummary = {
    mostLiquid,
    leastLiquid,
    avgImbalance,
    wideSpreadCount,
    buyPressureCount,
    sellPressureCount,
  };

  return {
    stocks,
    aggregateDepth,
    liquidityScores,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route handler ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MarketDepth] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate market depth data' });
  }
});

export default router;
