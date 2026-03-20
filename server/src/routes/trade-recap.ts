import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// -- Seed Data --

const SYMBOLS = [
  { ticker: 'AAPL', basePrice: 195 },
  { ticker: 'MSFT', basePrice: 430 },
  { ticker: 'NVDA', basePrice: 880 },
  { ticker: 'GOOGL', basePrice: 175 },
  { ticker: 'AMZN', basePrice: 185 },
  { ticker: 'META', basePrice: 510 },
  { ticker: 'TSLA', basePrice: 245 },
  { ticker: 'JPM', basePrice: 198 },
  { ticker: 'GS', basePrice: 415 },
  { ticker: 'V', basePrice: 280 },
  { ticker: 'AMD', basePrice: 178 },
  { ticker: 'NFLX', basePrice: 630 },
  { ticker: 'EUR/USD', basePrice: 1.085 },
  { ticker: 'GBP/USD', basePrice: 1.268 },
  { ticker: 'UST 10Y', basePrice: 98.45 },
  { ticker: 'UST 2Y', basePrice: 99.82 },
  { ticker: 'CL1', basePrice: 78.5 },
  { ticker: 'GC1', basePrice: 2345 },
  { ticker: 'SPX 4500C', basePrice: 42.3 },
  { ticker: 'NDX 17000P', basePrice: 68.5 },
] as const;

const ASSET_CLASSES = ['equities', 'fixed-income', 'fx', 'commodities', 'derivatives'] as const;

const ASSET_CLASS_SYMBOLS: Record<string, readonly (typeof SYMBOLS)[number][]> = {
  equities: SYMBOLS.filter(s => ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'GS', 'V', 'AMD', 'NFLX'].includes(s.ticker)),
  'fixed-income': SYMBOLS.filter(s => s.ticker.startsWith('UST')),
  fx: SYMBOLS.filter(s => s.ticker.includes('/')),
  commodities: SYMBOLS.filter(s => ['CL1', 'GC1'].includes(s.ticker)),
  derivatives: SYMBOLS.filter(s => ['SPX 4500C', 'NDX 17000P'].includes(s.ticker)),
};

const VENUES = [
  { name: 'NYSE', baseSpread: 3.1, baseLatency: 0.42 },
  { name: 'NASDAQ', baseSpread: 2.7, baseLatency: 0.31 },
  { name: 'BATS', baseSpread: 2.4, baseLatency: 0.27 },
  { name: 'IEX', baseSpread: 2.0, baseLatency: 0.82 },
  { name: 'ARCA', baseSpread: 2.9, baseLatency: 0.36 },
  { name: 'Sigma-X', baseSpread: 1.6, baseLatency: 1.15 },
  { name: 'CrossFinder', baseSpread: 1.4, baseLatency: 1.35 },
  { name: 'POSIT', baseSpread: 1.2, baseLatency: 1.50 },
] as const;

const ORDER_TYPES = ['market', 'limit', 'algo'] as const;
const ALGO_NAMES = ['VWAP', 'TWAP', 'IS', 'POV', 'DarkSeek', 'Iceberg'] as const;

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('trade-recap-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const pad2 = (n: number) => String(n).padStart(2, '0');

  // -- 1. Top Trades (10-12) --

  const tradeCount = 10 + Math.floor(rng() * 3); // 10-12
  const topTrades: {
    time: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    notional: number;
    pnl: number;
    venue: string;
    orderType: 'market' | 'limit' | 'algo';
    algoName: string | null;
    fillRate: number;
  }[] = [];

  // Generate trades spread across market hours
  const tradeTimes: string[] = [];
  for (let i = 0; i < tradeCount; i++) {
    // Market hours: 9:30 to 15:59
    const minuteOffset = Math.floor(rng() * 390); // 6.5 hours = 390 minutes
    const totalMinutes = 9 * 60 + 30 + minuteOffset;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    tradeTimes.push(`${pad2(hour)}:${pad2(minute)}`);
  }
  tradeTimes.sort();

  for (let i = 0; i < tradeCount; i++) {
    const sym = pick(SYMBOLS);
    const side: 'buy' | 'sell' = rng() > 0.48 ? 'buy' : 'sell';
    const orderType = pick(ORDER_TYPES);
    const algoName = orderType === 'algo' ? pick(ALGO_NAMES) : null;

    const price = roundTo(sym.basePrice * (1 + (rng() - 0.5) * 0.04), sym.basePrice < 10 ? 4 : 2);
    const quantity = Math.round((200 + rng() * 14800) / 100) * 100;
    const notional = roundTo(price * quantity, 0);

    // P&L: most trades small positive/negative, a few big winners/losers
    const pnlMag = rng() < 0.2
      ? jitter(85000, 0.5) // big trade
      : jitter(12000, 0.6); // typical trade
    const pnlSign = rng() > 0.42 ? 1 : -1; // slight positive bias
    const pnl = roundTo(pnlMag * pnlSign, 0);

    const fillRate = roundTo(Math.min(100, Math.max(85, jitter(97.5, 0.04))), 1);

    topTrades.push({
      time: tradeTimes[i],
      symbol: sym.ticker,
      side,
      quantity,
      price,
      notional,
      pnl,
      venue: pick(VENUES).name,
      orderType,
      algoName,
      fillRate,
    });
  }

  // Sort by absolute P&L descending (top trades = biggest movers)
  topTrades.sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

  // -- 2. Daily Summary --

  const totalTrades = Math.round(jitter(342, 0.12));
  const totalVolume = roundTo(jitter(485_000_000, 0.15), 0);
  const buyRatio = jitter(0.52, 0.08);
  const buyVolume = roundTo(totalVolume * buyRatio, 0);
  const sellVolume = totalVolume - buyVolume;

  const pnlGross = roundTo(jitter(1_850_000, 0.25), 0);
  const commissions = roundTo(jitter(142_000, 0.10), 0);
  const pnlNet = pnlGross - commissions;

  const averageTradeSize = roundTo(totalVolume / totalTrades, 0);
  const winRate = roundTo(Math.min(68, Math.max(48, jitter(57.2, 0.08))), 1);
  const profitFactor = roundTo(Math.max(1.05, jitter(1.62, 0.15)), 2);

  const dailySummary = {
    totalTrades,
    totalVolume,
    buyVolume,
    sellVolume,
    pnlGross,
    pnlNet,
    commissions,
    averageTradeSize,
    winRate,
    profitFactor,
  };

  // -- 3. Asset Class Breakdown --

  const assetClassBreakdown = ASSET_CLASSES.map(ac => {
    const isEquity = ac === 'equities';
    const baseTrades = isEquity ? 145 : ac === 'derivatives' ? 65 : ac === 'fx' ? 52 : ac === 'fixed-income' ? 48 : 32;
    const baseVolume = isEquity ? 210_000_000 : ac === 'derivatives' ? 95_000_000 : ac === 'fx' ? 82_000_000 : ac === 'fixed-income' ? 68_000_000 : 30_000_000;
    const basePnl = isEquity ? 680_000 : ac === 'derivatives' ? 420_000 : ac === 'fx' ? 310_000 : ac === 'fixed-income' ? 280_000 : 160_000;
    const baseSlippage = isEquity ? 1.8 : ac === 'fixed-income' ? 2.4 : ac === 'fx' ? 0.9 : ac === 'commodities' ? 2.1 : 3.2;

    const trades = Math.round(jitter(baseTrades, 0.12));
    const volume = roundTo(jitter(baseVolume, 0.15), 0);
    const pnlSign = rng() > 0.25 ? 1 : -1; // most asset classes profitable
    const pnl = roundTo(jitter(basePnl, 0.30) * pnlSign, 0);
    const avgSlippage = roundTo(Math.max(0.2, jitter(baseSlippage, 0.18)), 1);

    return { assetClass: ac, trades, volume, pnl, avgSlippage };
  });

  // -- 4. Execution Quality --

  const executionQuality = {
    avgSlippage: roundTo(Math.max(0.3, jitter(1.85, 0.15)), 2),
    implementationShortfall: roundTo(Math.max(0.5, jitter(2.42, 0.18)), 2),
    vwapPerformance: roundTo(jitter(-0.65, 0.80), 2), // negative = outperforming VWAP
    participationRate: roundTo(Math.min(25, Math.max(5, jitter(11.8, 0.15))), 1),
    avgFillTime: roundTo(Math.max(50, jitter(185, 0.20)), 0),
    rejectRate: roundTo(Math.max(0.1, Math.min(5, jitter(1.2, 0.30))), 2),
  };

  // -- 5. Venue Analysis --

  const baseTradesPerVenue = [65, 72, 42, 18, 35, 28, 22, 15];
  const venueAnalysis = VENUES.map((v, i) => {
    const trades = Math.round(jitter(baseTradesPerVenue[i], 0.12));
    const volume = roundTo(jitter(baseTradesPerVenue[i] * 1_400_000, 0.15), 0);
    const avgSpread = roundTo(Math.max(0.5, jitter(v.baseSpread, 0.12)), 1);
    const fillRate = roundTo(Math.min(100, Math.max(88, jitter(96.5, 0.03))), 1);
    const avgLatency = roundTo(Math.max(0.05, jitter(v.baseLatency, 0.15)), 2);

    return {
      venueName: v.name,
      trades,
      volume,
      avgSpread,
      fillRate,
      avgLatency,
    };
  });

  // -- 6. Hourly Activity (9:30-16:00, 13 buckets) --

  // U-curve pattern: high at open, dip mid-day, high at close
  const hourlyBaseVolumes = [
    45, 38, 28, 22, 18, 16, 15, 17, 20, 25, 32, 42, 55,
  ];
  const hourlyBaseTrades = [
    42, 35, 26, 20, 16, 14, 13, 15, 18, 23, 30, 38, 50,
  ];
  const hourLabels = [
    '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  ];

  const hourlyActivity = hourLabels.map((hour, i) => {
    const trades = Math.round(jitter(hourlyBaseTrades[i], 0.12));
    const volume = roundTo(jitter(hourlyBaseVolumes[i] * 1_000_000, 0.12), 0);
    // Net P&L: positive overall bias, but mid-day can be negative
    const pnlBase = i < 3 ? 120_000 : i < 6 ? -15_000 : i < 9 ? 35_000 : 95_000;
    const netPnl = roundTo(jitter(pnlBase, 0.60), 0);

    return { hour, trades, volume, netPnl };
  });

  return {
    date: day,
    timestamp: new Date().toISOString(),
    dailySummary,
    assetClassBreakdown,
    topTrades,
    executionQuality,
    venueAnalysis,
    hourlyActivity,
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[TradeRecap] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate trade recap data' });
  }
});

export default router;
