import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
let staleData: any = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface Trade {
  time: string;
  ticker: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  notional: number;
  exchange: string;
  orderType: string;
  status: string;
  limitPrice: number | null;
  fillPrice: number;
}

interface SymbolVWAP {
  ticker: string;
  vwap: number;
  totalVolume: number;
  tradeCount: number;
}

interface SummaryStats {
  totalTrades: number;
  totalVolume: number;
  totalNotional: number;
  buySellRatio: number;
  averageFillRate: number;
  topSymbolVWAP: SymbolVWAP[];
}

interface ExecutionQuality {
  filledAtOrBetterPct: number;
  averageSlippageBps: number;
  bestExecution: string;
  worstExecution: string;
}

interface TradeBlotterResponse {
  date: string;
  generatedAt: string;
  trades: Trade[];
  summary: SummaryStats;
  executionQuality: ExecutionQuality;
}

// ── Ticker definitions with realistic base prices ──

const TICKERS: { symbol: string; basePrice: number }[] = [
  { symbol: 'AAPL', basePrice: 213.45 },
  { symbol: 'MSFT', basePrice: 428.70 },
  { symbol: 'GOOGL', basePrice: 176.30 },
  { symbol: 'AMZN', basePrice: 187.50 },
  { symbol: 'NVDA', basePrice: 878.40 },
  { symbol: 'META', basePrice: 507.60 },
  { symbol: 'TSLA', basePrice: 248.15 },
  { symbol: 'JPM', basePrice: 199.80 },
  { symbol: 'BAC', basePrice: 38.25 },
  { symbol: 'GS', basePrice: 416.90 },
  { symbol: 'SPY', basePrice: 521.40 },
  { symbol: 'QQQ', basePrice: 449.80 },
  { symbol: 'IWM', basePrice: 203.65 },
  { symbol: 'XLF', basePrice: 41.30 },
  { symbol: 'COIN', basePrice: 225.70 },
];

const EXCHANGES = ['NYSE', 'NASDAQ', 'ARCA', 'BATS', 'IEX'];
const ORDER_TYPES = ['MKT', 'LMT', 'STOP'];
const STATUSES = ['FILLED', 'PARTIAL', 'WORKING'];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// ── Generation logic ──

function generateTrades(rng: () => number): Trade[] {
  const tradeCount = 30 + Math.floor(rng() * 11); // 30-40 trades
  const trades: Trade[] = [];

  // Generate timestamps across market hours 09:30 - 15:59
  const timestamps: string[] = [];
  for (let i = 0; i < tradeCount; i++) {
    const minuteOffset = Math.floor(rng() * 390); // 6.5 hours = 390 min
    const totalMinutes = 9 * 60 + 30 + minuteOffset;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const second = Math.floor(rng() * 60);
    timestamps.push(
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
    );
  }
  timestamps.sort();

  for (let i = 0; i < tradeCount; i++) {
    const tickerDef = pick(TICKERS, rng);
    const side: 'BUY' | 'SELL' = rng() > 0.47 ? 'BUY' : 'SELL';

    // Quantity: 100-50,000 shares in round lots, weighted toward smaller sizes
    const rawQty = 100 + Math.floor(rng() * rng() * 49900);
    const quantity = Math.round(rawQty / 100) * 100 || 100;

    // Price with realistic daily variation (+/- 1.5%)
    const price = round2(jitter(tickerDef.basePrice, 0.015, rng));

    const notional = round2(quantity * price);
    const exchange = pick(EXCHANGES, rng);
    const orderType = pick(ORDER_TYPES, rng);

    // Status: mostly FILLED, some PARTIAL/WORKING
    const statusRoll = rng();
    const status = statusRoll < 0.72 ? 'FILLED' : statusRoll < 0.88 ? 'PARTIAL' : 'WORKING';

    // Limit price for LMT/STOP orders
    let limitPrice: number | null = null;
    if (orderType === 'LMT') {
      // Limit price slightly away from market price
      const offset = side === 'BUY' ? -(rng() * 0.005) : (rng() * 0.005);
      limitPrice = round2(price * (1 + offset));
    } else if (orderType === 'STOP') {
      const offset = side === 'BUY' ? (rng() * 0.008) : -(rng() * 0.008);
      limitPrice = round2(price * (1 + offset));
    }

    // Fill price: for FILLED orders, close to limit; for MKT, same as price
    let fillPrice = price;
    if (orderType === 'LMT' && limitPrice !== null && status === 'FILLED') {
      // Filled at or slightly better than limit
      const improvement = rng() * 0.002;
      fillPrice = side === 'BUY'
        ? round2(limitPrice * (1 - improvement))
        : round2(limitPrice * (1 + improvement));
    }

    trades.push({
      time: timestamps[i],
      ticker: tickerDef.symbol,
      side,
      quantity,
      price,
      notional,
      exchange,
      orderType,
      status,
      limitPrice,
      fillPrice,
    });
  }

  // Sort descending by time (most recent first)
  trades.sort((a, b) => b.time.localeCompare(a.time));

  return trades;
}

function computeSummary(trades: Trade[]): SummaryStats {
  const totalTrades = trades.length;
  const totalVolume = trades.reduce((sum, t) => sum + t.quantity, 0);
  const totalNotional = round2(trades.reduce((sum, t) => sum + t.notional, 0));

  const buyCount = trades.filter(t => t.side === 'BUY').length;
  const sellCount = trades.filter(t => t.side === 'SELL').length;
  const buySellRatio = round2(sellCount > 0 ? buyCount / sellCount : buyCount);

  // Average fill rate: FILLED=100%, PARTIAL=random 40-85%, WORKING=0%
  const fillRates = trades.map(t => {
    if (t.status === 'FILLED') return 100;
    if (t.status === 'PARTIAL') return 40 + (t.quantity % 45); // deterministic partial
    return 0;
  });
  const averageFillRate = round2(fillRates.reduce((a, b) => a + b, 0) / fillRates.length);

  // VWAP for top 5 symbols by trade count
  const tickerMap = new Map<string, { totalPriceQty: number; totalQty: number; count: number }>();
  for (const t of trades) {
    const entry = tickerMap.get(t.ticker) || { totalPriceQty: 0, totalQty: 0, count: 0 };
    entry.totalPriceQty += t.price * t.quantity;
    entry.totalQty += t.quantity;
    entry.count++;
    tickerMap.set(t.ticker, entry);
  }

  const topSymbolVWAP: SymbolVWAP[] = [...tickerMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([ticker, data]) => ({
      ticker,
      vwap: round2(data.totalPriceQty / data.totalQty),
      totalVolume: data.totalQty,
      tradeCount: data.count,
    }));

  return {
    totalTrades,
    totalVolume,
    totalNotional,
    buySellRatio,
    averageFillRate,
    topSymbolVWAP,
  };
}

function computeExecutionQuality(trades: Trade[]): ExecutionQuality {
  // Orders filled at or better than limit price
  const limitOrders = trades.filter(t => t.orderType === 'LMT' && t.limitPrice !== null && t.status === 'FILLED');
  let atOrBetterCount = 0;
  let totalSlippageBps = 0;
  let bestSlippage = Infinity;
  let worstSlippage = -Infinity;
  let bestTicker = '';
  let worstTicker = '';

  for (const t of limitOrders) {
    const limitPx = t.limitPrice!;
    if (t.side === 'BUY') {
      // Better = fillPrice <= limitPrice
      if (t.fillPrice <= limitPx) atOrBetterCount++;
      const slippage = ((t.fillPrice - limitPx) / limitPx) * 10000;
      totalSlippageBps += slippage;
      if (slippage < bestSlippage) { bestSlippage = slippage; bestTicker = t.ticker; }
      if (slippage > worstSlippage) { worstSlippage = slippage; worstTicker = t.ticker; }
    } else {
      // Better = fillPrice >= limitPrice
      if (t.fillPrice >= limitPx) atOrBetterCount++;
      const slippage = ((limitPx - t.fillPrice) / limitPx) * 10000;
      totalSlippageBps += slippage;
      if (slippage < bestSlippage) { bestSlippage = slippage; bestTicker = t.ticker; }
      if (slippage > worstSlippage) { worstSlippage = slippage; worstTicker = t.ticker; }
    }
  }

  // Include MKT orders in slippage calculation (assume 0.5-2 bps market impact)
  const mktOrders = trades.filter(t => t.orderType === 'MKT' && t.status === 'FILLED');
  for (const t of mktOrders) {
    const impliedSlippage = ((t.price * 0.0001) + (t.price * 0.00005)) / t.price * 10000;
    totalSlippageBps += impliedSlippage;
  }

  const allFilledOrders = limitOrders.length + mktOrders.length;
  const filledAtOrBetterPct = limitOrders.length > 0
    ? round2((atOrBetterCount / limitOrders.length) * 100)
    : 100;
  const averageSlippageBps = allFilledOrders > 0
    ? round2(totalSlippageBps / allFilledOrders)
    : 0;

  return {
    filledAtOrBetterPct,
    averageSlippageBps,
    bestExecution: bestTicker || 'N/A',
    worstExecution: worstTicker || 'N/A',
  };
}

function buildTradeBlotterData(): TradeBlotterResponse {
  const day = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('trade-blotter-' + day);
  const rng = mulberry32(seed);

  const trades = generateTrades(rng);
  const summary = computeSummary(trades);
  const executionQuality = computeExecutionQuality(trades);

  return {
    date: day,
    generatedAt: new Date().toISOString(),
    trades,
    summary,
    executionQuality,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    if (cache && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }

    const data = buildTradeBlotterData();

    staleData = cache?.data ?? staleData;
    cache = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[TradeBlotter] Error:', err instanceof Error ? err.message : err);

    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cache) {
      res.json(cache.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate trade blotter data' });
  }
});

export default router;
