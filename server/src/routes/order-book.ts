import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// --- Type definitions ---

interface PriceLevel {
  price: number;
  size: number;
  orders: number;
  cumulativeSize: number;
}

interface DepthAtDistance {
  distance: string;
  bidDepth: number;
  askDepth: number;
  bidLevels: number;
  askLevels: number;
}

interface BookSummary {
  midPrice: number;
  spreadCents: number;
  spreadBps: number;
  imbalanceRatio: number;
  totalBidDepth: number;
  totalAskDepth: number;
}

interface TickerBook {
  ticker: string;
  name: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
  summary: BookSummary;
  depthStats: DepthAtDistance[];
}

interface OrderBookResponse {
  books: TickerBook[];
  generatedAt: string;
}

// --- Ticker definitions with approximate real prices ---

interface TickerDef {
  ticker: string;
  name: string;
  basePrice: number;
  baseSpreadCents: number;
  baseLevelSize: number;
}

const TICKER_DEFS: TickerDef[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', basePrice: 185, baseSpreadCents: 1, baseLevelSize: 800 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', basePrice: 420, baseSpreadCents: 2, baseLevelSize: 450 },
  { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', basePrice: 175, baseSpreadCents: 2, baseLevelSize: 520 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', basePrice: 186, baseSpreadCents: 2, baseLevelSize: 650 },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', basePrice: 875, baseSpreadCents: 3, baseLevelSize: 320 },
  { ticker: 'META', name: 'Meta Platforms Inc.', basePrice: 505, baseSpreadCents: 3, baseLevelSize: 380 },
  { ticker: 'TSLA', name: 'Tesla Inc.', basePrice: 249, baseSpreadCents: 5, baseLevelSize: 600 },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', basePrice: 527, baseSpreadCents: 1, baseLevelSize: 2500 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', basePrice: 446, baseSpreadCents: 1, baseLevelSize: 1800 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', basePrice: 199, baseSpreadCents: 2, baseLevelSize: 350 },
];

const NUM_LEVELS = 10;

// --- Generation logic ---

function generate(): OrderBookResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('order-book-' + day));
  const jitter = (base: number, pct: number): number => base * (1 + (rng() - 0.5) * 2 * pct);

  const books: TickerBook[] = TICKER_DEFS.map((def) => {
    // Daily price variation
    const price = Math.round(jitter(def.basePrice, 0.015) * 100) / 100;
    const spreadCents = Math.max(1, Math.round(jitter(def.baseSpreadCents, 0.25)));
    const spread = spreadCents / 100;
    const midPrice = Math.round(price * 100) / 100;
    const halfSpread = spread / 2;

    // Determine tick increment per level (based on spread characteristics)
    const tickIncrement = Math.max(0.01, Math.round(spread * 0.5 * 100) / 100);

    // Generate 10 bid levels (descending from best bid)
    const bestBid = Math.round((midPrice - halfSpread) * 100) / 100;
    const bids: PriceLevel[] = [];
    let bidCumulative = 0;
    for (let i = 0; i < NUM_LEVELS; i++) {
      const levelPrice = Math.round((bestBid - i * tickIncrement) * 100) / 100;
      // Deeper levels tend to have more size (institutional resting orders)
      const sizeFactor = 1 + i * 0.08;
      const size = Math.round(jitter(def.baseLevelSize * sizeFactor, 0.3));
      const orders = Math.max(1, Math.round(jitter(size / 80, 0.4)));
      bidCumulative += size;
      bids.push({ price: levelPrice, size, orders, cumulativeSize: bidCumulative });
    }

    // Generate 10 ask levels (ascending from best ask)
    const bestAsk = Math.round((midPrice + halfSpread) * 100) / 100;
    const asks: PriceLevel[] = [];
    let askCumulative = 0;
    for (let i = 0; i < NUM_LEVELS; i++) {
      const levelPrice = Math.round((bestAsk + i * tickIncrement) * 100) / 100;
      const sizeFactor = 1 + i * 0.08;
      const size = Math.round(jitter(def.baseLevelSize * sizeFactor, 0.3));
      const orders = Math.max(1, Math.round(jitter(size / 80, 0.4)));
      askCumulative += size;
      asks.push({ price: levelPrice, size, orders, cumulativeSize: askCumulative });
    }

    // Book summary
    const totalBidDepth = bids.reduce((sum, b) => sum + b.size, 0);
    const totalAskDepth = asks.reduce((sum, a) => sum + a.size, 0);
    const totalDepth = totalBidDepth + totalAskDepth;
    const imbalanceRatio = totalDepth > 0
      ? Math.round((totalBidDepth / totalDepth) * 10000) / 10000
      : 0.5;
    const spreadBps = midPrice > 0
      ? Math.round((spread / midPrice) * 10000 * 100) / 100
      : 0;

    const summary: BookSummary = {
      midPrice,
      spreadCents,
      spreadBps,
      imbalanceRatio,
      totalBidDepth,
      totalAskDepth,
    };

    // Market depth stats at 0.1%, 0.5%, 1% from mid
    const distances = [
      { label: '0.1%', pct: 0.001 },
      { label: '0.5%', pct: 0.005 },
      { label: '1.0%', pct: 0.01 },
    ];

    const depthStats: DepthAtDistance[] = distances.map(({ label, pct }) => {
      const threshold = midPrice * pct;

      let bidDepth = 0;
      let bidLevels = 0;
      for (const b of bids) {
        if (midPrice - b.price <= threshold) {
          bidDepth += b.size;
          bidLevels++;
        }
      }

      let askDepth = 0;
      let askLevels = 0;
      for (const a of asks) {
        if (a.price - midPrice <= threshold) {
          askDepth += a.size;
          askLevels++;
        }
      }

      return {
        distance: label,
        bidDepth,
        askDepth,
        bidLevels,
        askLevels,
      };
    });

    return {
      ticker: def.ticker,
      name: def.name,
      bids,
      asks,
      summary,
      depthStats,
    };
  });

  return {
    books,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route handler ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[OrderBook] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate order book data' });
  }
});

export default router;
