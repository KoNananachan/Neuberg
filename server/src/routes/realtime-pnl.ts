import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Position Seed Data ──

interface PositionSeed {
  symbol: string;
  name: string;
  assetClass: string;
  basePrice: number;
  baseQty: number;
  side: 'long' | 'short';
}

const POSITION_SEEDS: PositionSeed[] = [
  { symbol: 'AAPL', name: 'Apple Inc', assetClass: 'Equities', basePrice: 195.5, baseQty: 12000, side: 'long' },
  { symbol: 'MSFT', name: 'Microsoft Corp', assetClass: 'Equities', basePrice: 430.2, baseQty: 8500, side: 'long' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', assetClass: 'Equities', basePrice: 882.0, baseQty: 4200, side: 'long' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', assetClass: 'Equities', basePrice: 175.8, baseQty: 15000, side: 'long' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', assetClass: 'Equities', basePrice: 186.4, baseQty: 11000, side: 'long' },
  { symbol: 'META', name: 'Meta Platforms Inc', assetClass: 'Equities', basePrice: 512.6, baseQty: 5500, side: 'long' },
  { symbol: 'TSLA', name: 'Tesla Inc', assetClass: 'Equities', basePrice: 248.3, baseQty: 6000, side: 'short' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co', assetClass: 'Equities', basePrice: 198.7, baseQty: 9000, side: 'long' },
  { symbol: 'GS', name: 'Goldman Sachs Group', assetClass: 'Equities', basePrice: 418.5, baseQty: 3800, side: 'long' },
  { symbol: 'UST 10Y', name: 'US Treasury 10Y Note', assetClass: 'Fixed Income', basePrice: 98.45, baseQty: 50000, side: 'long' },
  { symbol: 'UST 2Y', name: 'US Treasury 2Y Note', assetClass: 'Fixed Income', basePrice: 99.82, baseQty: 80000, side: 'long' },
  { symbol: 'LQD', name: 'iShares IG Corporate Bond', assetClass: 'Fixed Income', basePrice: 108.3, baseQty: 25000, side: 'long' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', assetClass: 'FX', basePrice: 1.0855, baseQty: 5000000, side: 'long' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', assetClass: 'FX', basePrice: 151.42, baseQty: 3000000, side: 'short' },
  { symbol: 'CL1', name: 'WTI Crude Oil Front', assetClass: 'Commodities', basePrice: 78.65, baseQty: 15000, side: 'long' },
  { symbol: 'GC1', name: 'Gold Front Month', assetClass: 'Commodities', basePrice: 2348.0, baseQty: 800, side: 'long' },
  { symbol: 'SPX 5200C 03/28', name: 'SPX Mar 5200 Call', assetClass: 'Derivatives', basePrice: 42.3, baseQty: 500, side: 'long' },
  { symbol: 'NDX 18000P 03/28', name: 'NDX Mar 18000 Put', assetClass: 'Derivatives', basePrice: 68.5, baseQty: 300, side: 'long' },
];

const ASSET_CLASS_ORDER = ['Equities', 'Fixed Income', 'FX', 'Commodities', 'Derivatives'];
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('realtime-pnl-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => {
    const f = 10 ** d;
    return Math.round(v * f) / f;
  };

  // Decide how many positions to include (15-20)
  const positionCount = 15 + Math.floor(rng() * 6);
  const activePositions = POSITION_SEEDS.slice(0, positionCount);

  // ── 1. Position P&L ──

  const positions = activePositions.map((seed) => {
    const avgCostDrift = seed.side === 'long' ? -0.04 : 0.04;
    const avgCost = roundTo(seed.basePrice * (1 + avgCostDrift * rng()), seed.basePrice < 10 ? 4 : 2);
    const currentPrice = roundTo(seed.basePrice * (1 + (rng() - 0.45) * 0.06), seed.basePrice < 10 ? 4 : 2);
    const quantity = Math.round(jitter(seed.baseQty, 0.15));

    const marketValue = roundTo(currentPrice * quantity, 0);
    const costBasis = avgCost * quantity;

    const direction = seed.side === 'long' ? 1 : -1;
    const unrealizedPnl = roundTo((currentPrice - avgCost) * quantity * direction, 0);
    const unrealizedPct = roundTo(((currentPrice - avgCost) / avgCost) * 100 * direction, 2);
    const realizedPnl = roundTo(jitter(seed.basePrice * quantity * 0.005, 0.8) * (rng() > 0.35 ? 1 : -1), 0);

    // Daily P&L: subset of unrealized + some realized intraday
    const dailyPnl = roundTo(jitter(unrealizedPnl * 0.15, 0.6) + jitter(realizedPnl * 0.1, 0.5), 0);

    return {
      symbol: seed.symbol,
      name: seed.name,
      assetClass: seed.assetClass,
      side: seed.side,
      quantity,
      avgCost,
      currentPrice,
      marketValue,
      unrealizedPnl,
      unrealizedPct,
      realizedPnl,
      dailyPnl,
      contribution: 0, // filled below (bps)
      weight: 0, // filled below (%)
    };
  });

  // Compute total portfolio value for weights/contributions
  const totalMarketValue = positions.reduce((s, p) => s + Math.abs(p.marketValue), 0);
  const totalDailyPnl = positions.reduce((s, p) => s + p.dailyPnl, 0);

  positions.forEach((p) => {
    p.weight = roundTo((Math.abs(p.marketValue) / totalMarketValue) * 100, 2);
    // Contribution in basis points: position dailyPnl / total portfolio value * 10000
    p.contribution = roundTo((p.dailyPnl / totalMarketValue) * 10000, 1);
  });

  // ── 2. Portfolio Summary ──

  const totalUnrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalRealizedPnl = positions.reduce((s, p) => s + p.realizedPnl, 0);
  const totalPnl = totalUnrealizedPnl + totalRealizedPnl;

  // Institutional-scale values
  const cashBalance = roundTo(jitter(45_000_000, 0.12), 0);
  const portfolioValue = roundTo(totalMarketValue + cashBalance, 0);
  const marginUsed = roundTo(jitter(28_000_000, 0.15), 0);
  const buyingPower = roundTo(portfolioValue - marginUsed + cashBalance, 0);

  // Intraday high/low: total P&L drifted
  const dayHighPnl = roundTo(totalPnl + Math.abs(jitter(totalPnl * 0.3, 0.5)), 0);
  const dayLowPnl = roundTo(totalPnl - Math.abs(jitter(totalPnl * 0.4, 0.5)), 0);

  const portfolioSummary = {
    totalPnl: roundTo(totalPnl, 0),
    unrealizedPnl: roundTo(totalUnrealizedPnl, 0),
    realizedPnl: roundTo(totalRealizedPnl, 0),
    dayHighPnl,
    dayLowPnl,
    portfolioValue,
    cashBalance,
    marginUsed,
    buyingPower,
  };

  // ── 3. Greeks P&L Attribution ──

  // Realistic Greek P&L for an institutional multi-asset portfolio
  const deltaPnl = roundTo(jitter(totalDailyPnl * 0.62, 0.15), 0);
  const gammaPnl = roundTo(jitter(totalDailyPnl * 0.12, 0.3), 0);
  const vegaPnl = roundTo(jitter(totalDailyPnl * 0.08, 0.4), 0);
  const thetaPnl = roundTo(jitter(-Math.abs(totalDailyPnl) * 0.06, 0.3), 0); // theta typically negative
  const rhoPnl = roundTo(jitter(totalDailyPnl * 0.04, 0.5), 0);
  const totalGreeksPnl = deltaPnl + gammaPnl + vegaPnl + thetaPnl + rhoPnl;
  const unexplained = roundTo(totalDailyPnl - totalGreeksPnl, 0);

  const greeksPnlAttribution = {
    deltaPnl,
    gammaPnl,
    vegaPnl,
    thetaPnl,
    rhoPnl,
    unexplained,
    totalGreeksPnl: roundTo(totalGreeksPnl, 0),
  };

  // ── 4. Asset Class P&L ──

  const assetClassPnl = ASSET_CLASS_ORDER.map((ac) => {
    const classPositions = positions.filter((p) => p.assetClass === ac);
    const classMarketValue = classPositions.reduce((s, p) => s + Math.abs(p.marketValue), 0);
    const classUnrealized = classPositions.reduce((s, p) => s + p.unrealizedPnl, 0);
    const classRealized = classPositions.reduce((s, p) => s + p.realizedPnl, 0);
    const classDailyPnl = classPositions.reduce((s, p) => s + p.dailyPnl, 0);
    const classWeight = totalMarketValue > 0 ? roundTo((classMarketValue / totalMarketValue) * 100, 2) : 0;

    return {
      assetClass: ac,
      positions: classPositions.length,
      marketValue: roundTo(classMarketValue, 0),
      unrealizedPnl: roundTo(classUnrealized, 0),
      realizedPnl: roundTo(classRealized, 0),
      dailyPnl: roundTo(classDailyPnl, 0),
      weight: classWeight,
    };
  });

  // ── 5. Intraday P&L Curve (13 time points, 30min intervals 9:30-16:00) ──

  const intradayLabels = [
    '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
    '15:30',
  ];

  // Build a realistic intraday curve: start at 0, random walk trending toward totalDailyPnl
  let cumPnl = 0;
  const intradayCurve = intradayLabels.map((time, i) => {
    const progress = (i + 1) / intradayLabels.length;
    // Step toward final P&L with noise
    const targetStep = (totalDailyPnl / intradayLabels.length);
    const noise = jitter(targetStep, 1.2);
    // Blend: early bars more noisy, later bars converge toward total
    const step = i === intradayLabels.length - 1
      ? totalDailyPnl - cumPnl // last bar snaps to total
      : roundTo(noise * (1 - progress * 0.3) + targetStep * progress * 0.3, 0);

    cumPnl += step;
    const cumulativePnl = roundTo(cumPnl, 0);

    // Delta P&L: price-driven portion (~65-80% of step)
    const deltaPnlStep = roundTo(step * (0.65 + rng() * 0.15), 0);
    // Trade P&L: execution-driven portion (remainder)
    const tradePnlStep = roundTo(step - deltaPnlStep, 0);

    return {
      time,
      cumulativePnl,
      deltaPnl: deltaPnlStep,
      tradePnl: tradePnlStep,
    };
  });

  // ── 6. Top Winners / Losers ──

  const sorted = [...positions].sort((a, b) => b.dailyPnl - a.dailyPnl);
  const winners = sorted.slice(0, 5).map((p) => ({
    symbol: p.symbol,
    name: p.name,
    dailyPnl: p.dailyPnl,
    unrealizedPct: p.unrealizedPct,
    contribution: p.contribution,
  }));
  const losers = sorted.slice(-5).reverse().map((p) => ({
    symbol: p.symbol,
    name: p.name,
    dailyPnl: p.dailyPnl,
    unrealizedPct: p.unrealizedPct,
    contribution: p.contribution,
  }));

  return {
    timestamp: new Date().toISOString(),
    portfolioSummary,
    positions,
    greeksPnlAttribution,
    assetClassPnl,
    intradayCurve,
    topWinners: winners,
    topLosers: losers,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RealtimePnl] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate realtime P&L data' });
  }
});

export default router;
