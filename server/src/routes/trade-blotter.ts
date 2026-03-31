import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── Cache ──

let cache: { data: unknown; ts: number } | null = null;
let staleData: unknown = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface Trade {
  tradeId: string;
  timestamp: string;
  instrument: string;
  assetClass: 'Equity' | 'ETF' | 'Fixed Income' | 'FX' | 'Commodity';
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  notional: number;
  venue: string;
  venueType: 'Exchange' | 'Dark Pool' | 'OTC';
  status: 'FILLED' | 'PARTIAL' | 'WORKING' | 'CANCELLED';
  broker: string;
}

interface ExecutionQuality {
  vwapSlippageBps: number;
  arrivalPriceImpactBps: number;
  fillRatePct: number;
  avgTimeToFillSec: number;
  filledAtOrBetterPct: number;
  bestExecutionSymbol: string;
  worstExecutionSymbol: string;
}

interface OrderFlowSummary {
  totalBuyVolume: number;
  totalSellVolume: number;
  netFlow: number;
  buyTradeCount: number;
  sellTradeCount: number;
  netFlowByAssetClass: { assetClass: string; netFlow: number }[];
}

interface VenueBreakdown {
  exchange: { pct: number; volume: number; tradeCount: number };
  darkPool: { pct: number; volume: number; tradeCount: number };
  otc: { pct: number; volume: number; tradeCount: number };
}

interface LargestTrade {
  tradeId: string;
  timestamp: string;
  instrument: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  notional: number;
  venue: string;
  broker: string;
}

interface PnLSummary {
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  pnlByAssetClass: { assetClass: string; pnl: number }[];
}

// ── Instrument definitions with realistic base prices ──

const INSTRUMENTS: { symbol: string; basePrice: number; assetClass: Trade['assetClass'] }[] = [
  { symbol: 'AAPL', basePrice: 213.45, assetClass: 'Equity' },
  { symbol: 'MSFT', basePrice: 428.70, assetClass: 'Equity' },
  { symbol: 'GOOGL', basePrice: 176.30, assetClass: 'Equity' },
  { symbol: 'AMZN', basePrice: 187.50, assetClass: 'Equity' },
  { symbol: 'NVDA', basePrice: 878.40, assetClass: 'Equity' },
  { symbol: 'META', basePrice: 507.60, assetClass: 'Equity' },
  { symbol: 'TSLA', basePrice: 248.15, assetClass: 'Equity' },
  { symbol: 'JPM', basePrice: 199.80, assetClass: 'Equity' },
  { symbol: 'GS', basePrice: 416.90, assetClass: 'Equity' },
  { symbol: 'BAC', basePrice: 38.25, assetClass: 'Equity' },
  { symbol: 'SPY', basePrice: 521.40, assetClass: 'ETF' },
  { symbol: 'QQQ', basePrice: 449.80, assetClass: 'ETF' },
  { symbol: 'IWM', basePrice: 203.65, assetClass: 'ETF' },
  { symbol: 'HYG', basePrice: 77.50, assetClass: 'ETF' },
  { symbol: 'TLT', basePrice: 92.30, assetClass: 'ETF' },
  { symbol: 'UST 10Y', basePrice: 98.4375, assetClass: 'Fixed Income' },
  { symbol: 'UST 2Y', basePrice: 99.8125, assetClass: 'Fixed Income' },
  { symbol: 'EUR/USD', basePrice: 1.0845, assetClass: 'FX' },
  { symbol: 'GBP/USD', basePrice: 1.2710, assetClass: 'FX' },
  { symbol: 'CL WTI', basePrice: 78.45, assetClass: 'Commodity' },
  { symbol: 'GC Gold', basePrice: 2345.60, assetClass: 'Commodity' },
];

const VENUES: { name: string; type: Trade['venueType'] }[] = [
  { name: 'NYSE', type: 'Exchange' },
  { name: 'NASDAQ', type: 'Exchange' },
  { name: 'ARCA', type: 'Exchange' },
  { name: 'BATS', type: 'Exchange' },
  { name: 'IEX', type: 'Exchange' },
  { name: 'CME', type: 'Exchange' },
  { name: 'Sigma X', type: 'Dark Pool' },
  { name: 'Crossfinder', type: 'Dark Pool' },
  { name: 'UBS ATS', type: 'Dark Pool' },
  { name: 'MS Pool', type: 'Dark Pool' },
  { name: 'Citadel OTC', type: 'OTC' },
  { name: 'Virtu OTC', type: 'OTC' },
  { name: 'Jane Street OTC', type: 'OTC' },
];

const BROKERS = [
  'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Bank of America',
  'Citadel Securities', 'Virtu Financial', 'UBS', 'Barclays',
  'Credit Suisse', 'Deutsche Bank',
];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// ── Generation logic ──

function generateTrades(rng: () => number, day: string): Trade[] {
  const trades: Trade[] = [];

  // Generate 50 timestamps across market hours 09:30 - 15:59
  const timestamps: string[] = [];
  for (let i = 0; i < 50; i++) {
    const minuteOffset = Math.floor(rng() * 390); // 6.5 hours = 390 min
    const totalMinutes = 9 * 60 + 30 + minuteOffset;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const second = Math.floor(rng() * 60);
    const ms = Math.floor(rng() * 1000);
    timestamps.push(
      `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(ms).padStart(3, '0')}Z`
    );
  }
  timestamps.sort();

  for (let i = 0; i < 50; i++) {
    const inst = pick(INSTRUMENTS, rng);

    // Venue selection weighted by asset class
    let venuePool = VENUES;
    if (inst.assetClass === 'Fixed Income' || inst.assetClass === 'FX') {
      venuePool = VENUES.filter(v => v.type === 'OTC' || v.name === 'CME');
    } else if (inst.assetClass === 'Commodity') {
      venuePool = VENUES.filter(v => v.name === 'CME' || v.type === 'OTC');
    }
    const venue = pick(venuePool, rng);

    const side: 'BUY' | 'SELL' = rng() > 0.47 ? 'BUY' : 'SELL';

    // Quantity: varies by asset class
    let quantity: number;
    if (inst.assetClass === 'FX') {
      quantity = Math.round((100000 + rng() * rng() * 9900000) / 10000) * 10000;
    } else if (inst.assetClass === 'Fixed Income') {
      quantity = Math.round((100000 + rng() * rng() * 4900000) / 100000) * 100000;
    } else if (inst.assetClass === 'Commodity') {
      quantity = Math.round(1 + rng() * rng() * 49) * 10;
    } else {
      // Equity / ETF: 100-50,000 shares in round lots, weighted toward smaller
      const rawQty = 100 + Math.floor(rng() * rng() * 49900);
      quantity = Math.round(rawQty / 100) * 100 || 100;
    }

    // Price with realistic daily variation (+/- 1.5%)
    const price = round4(jitter(inst.basePrice, 0.015, rng));
    const notional = round2(quantity * price);

    const broker = pick(BROKERS, rng);

    // Status distribution: ~72% FILLED, ~14% PARTIAL, ~10% WORKING, ~4% CANCELLED
    const statusRoll = rng();
    let status: Trade['status'];
    if (statusRoll < 0.72) status = 'FILLED';
    else if (statusRoll < 0.86) status = 'PARTIAL';
    else if (statusRoll < 0.96) status = 'WORKING';
    else status = 'CANCELLED';

    const tradeId = `TB-${day.replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;

    trades.push({
      tradeId,
      timestamp: timestamps[i],
      instrument: inst.symbol,
      assetClass: inst.assetClass,
      side,
      quantity,
      price,
      notional,
      venue: venue.name,
      venueType: venue.type,
      status,
      broker,
    });
  }

  // Sort descending by timestamp (most recent first)
  trades.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return trades;
}

function computeExecutionQuality(trades: Trade[], rng: () => number): ExecutionQuality {
  const filledTrades = trades.filter(t => t.status === 'FILLED' || t.status === 'PARTIAL');
  const totalTrades = trades.length;

  // VWAP slippage: sum of price-weighted deviations
  // Simulate arrival prices slightly different from fill prices
  let totalSlippageBps = 0;
  let bestSlippage = Infinity;
  let worstSlippage = -Infinity;
  let bestSymbol = '';
  let worstSymbol = '';
  let totalTimeToFill = 0;
  let atOrBetterCount = 0;

  for (const t of filledTrades) {
    // Simulate arrival price as the pre-trade price (slight offset from fill)
    const arrivalOffset = (rng() - 0.45) * 0.003; // slight adverse bias
    const arrivalPrice = t.price * (1 - arrivalOffset);

    // Slippage: how much worse the fill is vs arrival
    const slipBps = ((t.price - arrivalPrice) / arrivalPrice) * 10000;
    const adjustedSlip = t.side === 'BUY' ? slipBps : -slipBps;
    totalSlippageBps += adjustedSlip;

    if (adjustedSlip < bestSlippage) {
      bestSlippage = adjustedSlip;
      bestSymbol = t.instrument;
    }
    if (adjustedSlip > worstSlippage) {
      worstSlippage = adjustedSlip;
      worstSymbol = t.instrument;
    }

    if (adjustedSlip <= 0) atOrBetterCount++;

    // Time to fill: 0.5s to 120s, skewed toward fast fills
    totalTimeToFill += 0.5 + rng() * rng() * 119.5;
  }

  const filledCount = filledTrades.length;
  const vwapSlippageBps = filledCount > 0 ? round2(totalSlippageBps / filledCount) : 0;
  const arrivalPriceImpactBps = round2(vwapSlippageBps * (0.6 + rng() * 0.3));

  const filledQty = filledTrades.reduce((sum, t) => sum + t.quantity, 0);
  const totalQty = trades.reduce((sum, t) => sum + t.quantity, 0);
  const fillRatePct = totalQty > 0 ? round2((filledQty / totalQty) * 100) : 0;

  const avgTimeToFillSec = filledCount > 0 ? round2(totalTimeToFill / filledCount) : 0;
  const filledAtOrBetterPct = filledCount > 0 ? round2((atOrBetterCount / filledCount) * 100) : 0;

  return {
    vwapSlippageBps,
    arrivalPriceImpactBps,
    fillRatePct,
    avgTimeToFillSec,
    filledAtOrBetterPct,
    bestExecutionSymbol: bestSymbol || 'N/A',
    worstExecutionSymbol: worstSymbol || 'N/A',
  };
}

function computeOrderFlowSummary(trades: Trade[]): OrderFlowSummary {
  const activeTrades = trades.filter(t => t.status !== 'CANCELLED');

  let totalBuyVolume = 0;
  let totalSellVolume = 0;
  let buyTradeCount = 0;
  let sellTradeCount = 0;

  const flowByClass = new Map<string, number>();

  for (const t of activeTrades) {
    const notional = t.notional;
    if (t.side === 'BUY') {
      totalBuyVolume += notional;
      buyTradeCount++;
      flowByClass.set(t.assetClass, (flowByClass.get(t.assetClass) ?? 0) + notional);
    } else {
      totalSellVolume += notional;
      sellTradeCount++;
      flowByClass.set(t.assetClass, (flowByClass.get(t.assetClass) ?? 0) - notional);
    }
  }

  const netFlowByAssetClass = [...flowByClass.entries()]
    .map(([assetClass, netFlow]) => ({ assetClass, netFlow: round2(netFlow) }))
    .sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow));

  return {
    totalBuyVolume: round2(totalBuyVolume),
    totalSellVolume: round2(totalSellVolume),
    netFlow: round2(totalBuyVolume - totalSellVolume),
    buyTradeCount,
    sellTradeCount,
    netFlowByAssetClass,
  };
}

function computeVenueBreakdown(trades: Trade[]): VenueBreakdown {
  const activeTrades = trades.filter(t => t.status !== 'CANCELLED');
  const totalNotional = activeTrades.reduce((s, t) => s + t.notional, 0);

  const groups: Record<Trade['venueType'], { volume: number; count: number }> = {
    'Exchange': { volume: 0, count: 0 },
    'Dark Pool': { volume: 0, count: 0 },
    'OTC': { volume: 0, count: 0 },
  };

  for (const t of activeTrades) {
    groups[t.venueType].volume += t.notional;
    groups[t.venueType].count++;
  }

  const makeStat = (g: { volume: number; count: number }) => ({
    pct: totalNotional > 0 ? round2((g.volume / totalNotional) * 100) : 0,
    volume: round2(g.volume),
    tradeCount: g.count,
  });

  return {
    exchange: makeStat(groups['Exchange']),
    darkPool: makeStat(groups['Dark Pool']),
    otc: makeStat(groups['OTC']),
  };
}

function computeLargestTrades(trades: Trade[]): LargestTrade[] {
  return [...trades]
    .filter(t => t.status === 'FILLED')
    .sort((a, b) => b.notional - a.notional)
    .slice(0, 10)
    .map(t => ({
      tradeId: t.tradeId,
      timestamp: t.timestamp,
      instrument: t.instrument,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      notional: t.notional,
      venue: t.venue,
      broker: t.broker,
    }));
}

function computePnL(trades: Trade[], rng: () => number): PnLSummary {
  const filledTrades = trades.filter(t => t.status === 'FILLED');
  const pnlByClassMap = new Map<string, number>();

  let realizedPnL = 0;
  let unrealizedPnL = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalWin = 0;
  let totalLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;

  for (const t of filledTrades) {
    // Simulate mark-to-market P&L: price moved after fill
    const moveDir = rng() - 0.48; // slight positive bias
    const moveMag = rng() * 0.008; // up to 0.8% move
    const priceDelta = t.price * moveDir * moveMag;
    const tradePnL = t.side === 'BUY'
      ? round2(priceDelta * t.quantity)
      : round2(-priceDelta * t.quantity);

    // 70% realized, 30% unrealized
    if (rng() < 0.7) {
      realizedPnL += tradePnL;
    } else {
      unrealizedPnL += tradePnL;
    }

    if (tradePnL > 0) {
      winningTrades++;
      totalWin += tradePnL;
      if (tradePnL > largestWin) largestWin = tradePnL;
    } else if (tradePnL < 0) {
      losingTrades++;
      totalLoss += tradePnL;
      if (tradePnL < largestLoss) largestLoss = tradePnL;
    }

    pnlByClassMap.set(t.assetClass, (pnlByClassMap.get(t.assetClass) ?? 0) + tradePnL);
  }

  const pnlByAssetClass = [...pnlByClassMap.entries()]
    .map(([assetClass, pnl]) => ({ assetClass, pnl: round2(pnl) }))
    .sort((a, b) => b.pnl - a.pnl);

  const totalTradesWithResult = winningTrades + losingTrades;

  return {
    realizedPnL: round2(realizedPnL),
    unrealizedPnL: round2(unrealizedPnL),
    totalPnL: round2(realizedPnL + unrealizedPnL),
    winningTrades,
    losingTrades,
    winRate: totalTradesWithResult > 0 ? round2((winningTrades / totalTradesWithResult) * 100) : 0,
    avgWin: winningTrades > 0 ? round2(totalWin / winningTrades) : 0,
    avgLoss: losingTrades > 0 ? round2(totalLoss / losingTrades) : 0,
    largestWin: round2(largestWin),
    largestLoss: round2(largestLoss),
    pnlByAssetClass,
  };
}

// ── Main builder ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('trade-blotter-' + day);
  const rng = mulberry32(seed);

  const trades = generateTrades(rng, day);
  const executionQuality = computeExecutionQuality(trades, rng);
  const orderFlowSummary = computeOrderFlowSummary(trades);
  const venueBreakdown = computeVenueBreakdown(trades);
  const largestTrades = computeLargestTrades(trades);
  const pnl = computePnL(trades, rng);

  return {
    date: day,
    generatedAt: new Date().toISOString(),
    trades,
    executionQuality,
    orderFlowSummary,
    venueBreakdown,
    largestTrades,
    pnl,
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

    const data = generate();

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

    res.status(502).json({ error: 'Failed to generate trade blotter data' });
  }
});

export default router;
