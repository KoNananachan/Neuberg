import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface BlockTrade {
  ticker: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  notional: number;
  exchange: string;
  timestamp: string;
  broker: string;
}

interface OrderFlowSector {
  sector: string;
  buyVolume: number;
  sellVolume: number;
  netFlow: number;
  tradeCount: number;
}

interface TopMover {
  ticker: string;
  unusualVolume: number;
  price: number;
  changePercent: number;
  volumeToday: number;
  avgVolume: number;
}

interface MarketSummary {
  totalBlockTrades: number;
  totalNotional: number;
  avgBlockSize: number;
  buyToSellRatio: number;
  mostActiveExchange: string;
  timestamp: string;
}

interface TradeBlotterResponse {
  recentBlockTrades: BlockTrade[];
  orderFlowSummary: OrderFlowSector[];
  topMoversByVolume: TopMover[];
  marketSummary: MarketSummary;
}

// ── Stock definitions with realistic base prices and sectors ──

interface StockDef {
  ticker: string;
  sector: string;
  basePrice: number;
  avgDailyVolume: number;
}

const BLOCK_TRADE_STOCKS: StockDef[] = [
  { ticker: 'AAPL', sector: 'Technology', basePrice: 213.25, avgDailyVolume: 55_000_000 },
  { ticker: 'MSFT', sector: 'Technology', basePrice: 428.50, avgDailyVolume: 22_000_000 },
  { ticker: 'NVDA', sector: 'Technology', basePrice: 875.30, avgDailyVolume: 42_000_000 },
  { ticker: 'GOOG', sector: 'Technology', basePrice: 175.60, avgDailyVolume: 25_000_000 },
  { ticker: 'META', sector: 'Technology', basePrice: 505.20, avgDailyVolume: 18_000_000 },
  { ticker: 'AMZN', sector: 'Technology', basePrice: 186.40, avgDailyVolume: 38_000_000 },
  { ticker: 'JPM', sector: 'Financials', basePrice: 198.70, avgDailyVolume: 10_000_000 },
  { ticker: 'GS', sector: 'Financials', basePrice: 415.80, avgDailyVolume: 3_200_000 },
  { ticker: 'BAC', sector: 'Financials', basePrice: 37.90, avgDailyVolume: 35_000_000 },
  { ticker: 'MS', sector: 'Financials', basePrice: 97.40, avgDailyVolume: 8_500_000 },
  { ticker: 'JNJ', sector: 'Healthcare', basePrice: 156.30, avgDailyVolume: 7_200_000 },
  { ticker: 'UNH', sector: 'Healthcare', basePrice: 527.80, avgDailyVolume: 3_800_000 },
  { ticker: 'PFE', sector: 'Healthcare', basePrice: 28.40, avgDailyVolume: 32_000_000 },
  { ticker: 'XOM', sector: 'Energy', basePrice: 117.30, avgDailyVolume: 15_000_000 },
  { ticker: 'CVX', sector: 'Energy', basePrice: 158.90, avgDailyVolume: 8_000_000 },
  { ticker: 'COP', sector: 'Energy', basePrice: 114.60, avgDailyVolume: 6_500_000 },
  { ticker: 'PG', sector: 'Consumer', basePrice: 168.40, avgDailyVolume: 7_500_000 },
  { ticker: 'KO', sector: 'Consumer', basePrice: 62.80, avgDailyVolume: 12_000_000 },
  { ticker: 'WMT', sector: 'Consumer', basePrice: 172.50, avgDailyVolume: 8_000_000 },
  { ticker: 'TSLA', sector: 'Consumer', basePrice: 248.90, avgDailyVolume: 95_000_000 },
  { ticker: 'CAT', sector: 'Industrials', basePrice: 338.60, avgDailyVolume: 3_200_000 },
  { ticker: 'BA', sector: 'Industrials', basePrice: 192.70, avgDailyVolume: 5_500_000 },
  { ticker: 'HON', sector: 'Industrials', basePrice: 205.30, avgDailyVolume: 3_800_000 },
  { ticker: 'GE', sector: 'Industrials', basePrice: 164.20, avgDailyVolume: 6_000_000 },
];

const EXCHANGES = ['NYSE', 'NASDAQ', 'BATS', 'IEX'];
const BROKERS = ['ML', 'GS', 'JPM', 'BARC', 'MS', 'CITI', 'UBS', 'CS', 'DB', 'HSBC'];
const SECTORS = ['Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer', 'Industrials'];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// ── Generation logic ──

function generateBlockTrades(rng: () => number): BlockTrade[] {
  const trades: BlockTrade[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < 20; i++) {
    const stock = pick(BLOCK_TRADE_STOCKS, rng);

    const side: 'BUY' | 'SELL' = rng() > 0.48 ? 'BUY' : 'SELL';

    // Block size: 10k-500k shares, weighted toward lower end
    const sizeRaw = 10_000 + Math.floor(rng() * rng() * 490_000);
    const size = Math.round(sizeRaw / 100) * 100;

    // Price with realistic daily variation
    const price = round2(jitter(stock.basePrice, 0.012, rng));

    const notional = Math.round(size * price);

    const exchange = pick(EXCHANGES, rng);
    const broker = pick(BROKERS, rng);

    // Spread timestamps across 9:30 - 16:00 ET (6.5h = 390 min)
    const minuteOffset = Math.floor(rng() * 390);
    const hour = 9 + Math.floor((30 + minuteOffset) / 60);
    const minute = (30 + minuteOffset) % 60;
    const second = Math.floor(rng() * 60);
    const ms = Math.floor(rng() * 1000);
    const timestamp = `${today}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(ms).padStart(3, '0')}Z`;

    trades.push({ ticker: stock.ticker, side, size, price, notional, exchange, timestamp, broker });
  }

  // Sort by timestamp descending (most recent first)
  trades.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return trades;
}

function generateOrderFlowSummary(rng: () => number): OrderFlowSector[] {
  return SECTORS.map((sector) => {
    // Buy volume in millions of dollars
    const buyVolume = Math.round(jitter(1_800_000_000, 0.4, rng));
    // Sell volume slightly asymmetric for realistic imbalance
    const sellBias = 0.85 + rng() * 0.3; // 0.85-1.15x of buy
    const sellVolume = Math.round(buyVolume * sellBias);
    const netFlow = buyVolume - sellVolume;
    const tradeCount = Math.round(jitter(4500, 0.35, rng));

    return { sector, buyVolume, sellVolume, netFlow, tradeCount };
  });
}

function generateTopMovers(rng: () => number): TopMover[] {
  // Select 10 unique stocks for top movers
  const shuffled = [...BLOCK_TRADE_STOCKS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, 10);

  const movers: TopMover[] = selected.map((stock) => {
    const avgVolume = Math.round(jitter(stock.avgDailyVolume, 0.1, rng));
    // Unusual volume ratio: 1.5x to 5x, skewed toward lower end
    const unusualVolume = round1(1.5 + rng() * rng() * 3.5);
    const volumeToday = Math.round(avgVolume * unusualVolume);
    const price = round2(jitter(stock.basePrice, 0.015, rng));
    // Change% correlated with unusual volume, but with randomness
    const direction = rng() > 0.4 ? 1 : -1;
    const magnitude = 0.5 + rng() * (unusualVolume * 1.2);
    const changePercent = round2(direction * magnitude);

    return { ticker: stock.ticker, unusualVolume, price, changePercent, volumeToday, avgVolume };
  });

  // Sort by unusual volume descending
  movers.sort((a, b) => b.unusualVolume - a.unusualVolume);

  return movers;
}

function generateMarketSummary(blockTrades: BlockTrade[]): MarketSummary {
  const totalBlockTrades = blockTrades.length;
  const totalNotional = blockTrades.reduce((sum, t) => sum + t.notional, 0);
  const avgBlockSize = Math.round(blockTrades.reduce((sum, t) => sum + t.size, 0) / totalBlockTrades);

  const buyCount = blockTrades.filter((t) => t.side === 'BUY').length;
  const sellCount = blockTrades.filter((t) => t.side === 'SELL').length;
  const buyToSellRatio = round2(sellCount > 0 ? buyCount / sellCount : buyCount);

  // Determine most active exchange by trade count
  const exchangeCounts = new Map<string, number>();
  for (const t of blockTrades) {
    exchangeCounts.set(t.exchange, (exchangeCounts.get(t.exchange) || 0) + 1);
  }
  let mostActiveExchange = 'NYSE';
  let maxCount = 0;
  for (const [exchange, count] of exchangeCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveExchange = exchange;
    }
  }

  return {
    totalBlockTrades,
    totalNotional,
    avgBlockSize,
    buyToSellRatio,
    mostActiveExchange,
    timestamp: new Date().toISOString(),
  };
}

function buildTradeBlotterData(): TradeBlotterResponse {
  const rng = seededRandom('trade-blotter');

  const recentBlockTrades = generateBlockTrades(rng);
  const orderFlowSummary = generateOrderFlowSummary(rng);
  const topMoversByVolume = generateTopMovers(rng);
  const marketSummary = generateMarketSummary(recentBlockTrades);

  return { recentBlockTrades, orderFlowSummary, topMoversByVolume, marketSummary };
}

// ── Cache ──

let cachedData: { data: TradeBlotterResponse; ts: number } | null = null;
let staleData: TradeBlotterResponse | null = null;
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cachedData.ts < CACHE_TTL) {
      res.json(cachedData.data);
      return;
    }

    // Generate fresh data
    const data = buildTradeBlotterData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[TradeBlotter] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate trade blotter data' });
  }
});

export default router;
