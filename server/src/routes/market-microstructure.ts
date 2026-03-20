import { Router } from 'express';

const router = Router();

// --- Deterministic seeded PRNG ---

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash |= 0; }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// --- Cache ---

let cacheData: any = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000;

// --- Generation ---

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('market-microstructure-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const round3 = (v: number) => Math.round(v * 1000) / 1000;

  // --- Spread Data ---
  const SPREAD_TICKERS = [
    { ticker: 'SPY',  baseSpreadCents: 0.3,  spreadBps: 0.06, avgDailyVol: 78.5,  avgTradeSize: 220, tickSize: 0.01 },
    { ticker: 'QQQ',  baseSpreadCents: 0.4,  spreadBps: 0.09, avgDailyVol: 52.3,  avgTradeSize: 195, tickSize: 0.01 },
    { ticker: 'IWM',  baseSpreadCents: 0.8,  spreadBps: 0.39, avgDailyVol: 28.4,  avgTradeSize: 250, tickSize: 0.01 },
    { ticker: 'AAPL', baseSpreadCents: 1.0,  spreadBps: 0.47, avgDailyVol: 55.2,  avgTradeSize: 180, tickSize: 0.01 },
    { ticker: 'MSFT', baseSpreadCents: 1.2,  spreadBps: 0.28, avgDailyVol: 22.8,  avgTradeSize: 120, tickSize: 0.01 },
    { ticker: 'NVDA', baseSpreadCents: 2.5,  spreadBps: 0.29, avgDailyVol: 42.1,  avgTradeSize: 95,  tickSize: 0.01 },
    { ticker: 'AMZN', baseSpreadCents: 1.3,  spreadBps: 0.70, avgDailyVol: 38.6,  avgTradeSize: 155, tickSize: 0.01 },
    { ticker: 'TSLA', baseSpreadCents: 3.5,  spreadBps: 1.41, avgDailyVol: 95.0,  avgTradeSize: 200, tickSize: 0.01 },
    { ticker: 'JPM',  baseSpreadCents: 1.6,  spreadBps: 0.81, avgDailyVol: 10.2,  avgTradeSize: 130, tickSize: 0.01 },
    { ticker: 'GS',   baseSpreadCents: 2.4,  spreadBps: 0.52, avgDailyVol: 2.8,   avgTradeSize: 75,  tickSize: 0.01 },
    { ticker: 'XLF',  baseSpreadCents: 0.9,  spreadBps: 2.14, avgDailyVol: 35.4,  avgTradeSize: 350, tickSize: 0.01 },
    { ticker: 'TLT',  baseSpreadCents: 1.1,  spreadBps: 1.12, avgDailyVol: 22.6,  avgTradeSize: 280, tickSize: 0.01 },
    { ticker: 'GLD',  baseSpreadCents: 1.5,  spreadBps: 0.72, avgDailyVol: 8.9,   avgTradeSize: 190, tickSize: 0.01 },
    { ticker: 'HYG',  baseSpreadCents: 2.0,  spreadBps: 2.58, avgDailyVol: 18.3,  avgTradeSize: 310, tickSize: 0.01 },
  ];

  const spreadData = SPREAD_TICKERS.map(t => ({
    ticker: t.ticker,
    bidAskSpread: round2(jitter(t.baseSpreadCents, 0.15)),
    spreadBps: round2(jitter(t.spreadBps, 0.15)),
    avgDailyVolume: round1(jitter(t.avgDailyVol, 0.10)),
    avgTradeSize: Math.round(jitter(t.avgTradeSize, 0.12)),
    tickSize: t.tickSize,
  }));

  // --- Dark Pool Activity ---
  const totalDarkPoolPct = round1(jitter(39.8, 0.05));
  const litExchangePct = round1(100 - totalDarkPoolPct);

  const DARK_VENUES = [
    { name: 'IEX',  baseShare: 3.8,  baseAvgSize: 185 },
    { name: 'MEMX', baseShare: 5.2,  baseAvgSize: 210 },
    { name: 'ATS',  baseShare: 14.5, baseAvgSize: 340 },
    { name: 'EDGX', baseShare: 9.8,  baseAvgSize: 160 },
    { name: 'ARCA', baseShare: 6.5,  baseAvgSize: 225 },
  ];

  const venueBreakdown = DARK_VENUES.map(v => ({
    venue: v.name,
    sharePct: round1(jitter(v.baseShare, 0.10)),
    avgTradeSize: Math.round(jitter(v.baseAvgSize, 0.15)),
  }));

  // Normalize venue shares to sum to totalDarkPoolPct
  const rawVenueSum = venueBreakdown.reduce((a, v) => a + v.sharePct, 0);
  for (const v of venueBreakdown) {
    v.sharePct = round1((v.sharePct / rawVenueSum) * totalDarkPoolPct);
  }

  const darkPoolActivity = {
    totalDarkPoolVolumePct: totalDarkPoolPct,
    litExchangeVolumePct: litExchangePct,
    venueBreakdown,
  };

  // --- Order Flow ---
  const SECTORS = [
    { sector: 'technology',  baseNetFlow: 245,  baseBuyRatio: 54.2, baseBlockCount: 1850, baseBlockSize: 18500 },
    { sector: 'healthcare',  baseNetFlow: -85,   baseBuyRatio: 48.1, baseBlockCount: 920,  baseBlockSize: 15200 },
    { sector: 'financials',  baseNetFlow: 120,   baseBuyRatio: 52.5, baseBlockCount: 1280, baseBlockSize: 22100 },
    { sector: 'energy',      baseNetFlow: -42,   baseBuyRatio: 49.3, baseBlockCount: 680,  baseBlockSize: 25800 },
    { sector: 'consumer',    baseNetFlow: 65,    baseBuyRatio: 51.1, baseBlockCount: 1050, baseBlockSize: 16400 },
    { sector: 'industrials', baseNetFlow: 38,    baseBuyRatio: 50.8, baseBlockCount: 790,  baseBlockSize: 19700 },
  ];

  const orderFlow = SECTORS.map(s => ({
    sector: s.sector,
    netFlow: round1(jitter(Math.abs(s.baseNetFlow), 0.20) * Math.sign(s.baseNetFlow)),
    buyRatio: round1(jitter(s.baseBuyRatio, 0.04)),
    blockTradeCount: Math.round(jitter(s.baseBlockCount, 0.15)),
    avgBlockSize: Math.round(jitter(s.baseBlockSize, 0.12)),
  }));

  // --- Market Depth (SPY) ---
  const spyMid = round2(jitter(527.40, 0.012));
  const spyHalfSpread = 0.005;

  const bidLevels = [];
  for (let i = 0; i < 5; i++) {
    const price = round2(spyMid - spyHalfSpread - i * 0.01);
    const size = Math.round(jitter(25000 - i * 3500, 0.20));
    const orderCount = Math.round(jitter(180 - i * 25, 0.18));
    bidLevels.push({ price, size, orderCount });
  }

  const askLevels = [];
  for (let i = 0; i < 5; i++) {
    const price = round2(spyMid + spyHalfSpread + i * 0.01);
    const size = Math.round(jitter(24000 - i * 3200, 0.20));
    const orderCount = Math.round(jitter(175 - i * 22, 0.18));
    askLevels.push({ price, size, orderCount });
  }

  const totalBidSize = bidLevels.reduce((a, l) => a + l.size, 0);
  const totalAskSize = askLevels.reduce((a, l) => a + l.size, 0);
  const imbalancePct = round1(((totalBidSize - totalAskSize) / (totalBidSize + totalAskSize)) * 100);

  const marketDepth = {
    ticker: 'SPY',
    bidLevels,
    askLevels,
    midpoint: spyMid,
    imbalancePct,
  };

  // --- HFT Metrics ---
  const hftMetrics = {
    messageRate: round1(jitter(3.2, 0.12)),
    orderToTradeRatio: round1(jitter(28.5, 0.10)),
    cancelRatePct: round1(jitter(92.4, 0.03)),
    avgLatencyMicroseconds: Math.round(jitter(45, 0.20)),
    makerTakerSplit: {
      makerPct: round1(jitter(55.2, 0.06)),
      takerPct: 0,
    },
  };
  hftMetrics.makerTakerSplit.takerPct = round1(100 - hftMetrics.makerTakerSplit.makerPct);

  // --- Liquidity Metrics ---
  const LIQUIDITY_INDICES = [
    { index: 'S&P 500',     baseAmihud: 0.012, baseLambda: 0.0045, baseRealized: 0.8, baseEffective: 1.2, basePriceImpact: 2.1 },
    { index: 'Russell 2000', baseAmihud: 0.085, baseLambda: 0.0210, baseRealized: 3.5, baseEffective: 4.8, basePriceImpact: 8.4 },
    { index: 'Nasdaq 100',   baseAmihud: 0.018, baseLambda: 0.0062, baseRealized: 1.1, baseEffective: 1.6, basePriceImpact: 2.8 },
  ];

  const liquidityMetrics = LIQUIDITY_INDICES.map(idx => ({
    index: idx.index,
    amihudIlliquidityRatio: round3(jitter(idx.baseAmihud, 0.15)),
    kyleLambda: round3(jitter(idx.baseLambda, 0.15)),
    realizedSpread: round2(jitter(idx.baseRealized, 0.12)),
    effectiveSpread: round2(jitter(idx.baseEffective, 0.12)),
    priceImpactBps: round2(jitter(idx.basePriceImpact, 0.10)),
  }));

  // --- Venue Stats ---
  const VENUE_DEFS = [
    { venue: 'NYSE',   baseShare: 22.5, baseSpread: 1.4, baseLatency: 120, baseMatchRate: 85.2 },
    { venue: 'NASDAQ', baseShare: 19.8, baseSpread: 1.2, baseLatency: 95,  baseMatchRate: 88.4 },
    { venue: 'CBOE',   baseShare: 15.3, baseSpread: 1.5, baseLatency: 105, baseMatchRate: 83.7 },
    { venue: 'IEX',    baseShare: 3.8,  baseSpread: 0.9, baseLatency: 350, baseMatchRate: 78.5 },
    { venue: 'MEMX',   baseShare: 5.2,  baseSpread: 1.0, baseLatency: 80,  baseMatchRate: 86.1 },
  ];

  const venueStats = VENUE_DEFS.map(v => ({
    venue: v.venue,
    marketSharePct: round1(jitter(v.baseShare, 0.08)),
    avgSpread: round2(jitter(v.baseSpread, 0.10)),
    avgLatency: Math.round(jitter(v.baseLatency, 0.15)),
    matchRatePct: round1(jitter(v.baseMatchRate, 0.04)),
  }));

  return {
    spreadData,
    darkPoolActivity,
    orderFlow,
    marketDepth,
    hftMetrics,
    liquidityMetrics,
    venueStats,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route handler ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: any) {
    console.error('[MarketMicrostructure] Error:', err?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate market microstructure data' });
  }
});

export default router;
