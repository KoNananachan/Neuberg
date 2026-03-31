import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// --- Deterministic seeded PRNG ---

// --- Cache ---

let cacheData: unknown = null;
let cacheTime = 0;


// --- Static data ---

const TOP_20_STOCKS = [
  { ticker: 'SPY',  price: 527.40, quotedBps: 0.06, avgDailyVolM: 78.5,  avgTradeSize: 220, oddLotPct: 52.3, retailPct: 38.2 },
  { ticker: 'QQQ',  price: 444.80, quotedBps: 0.09, avgDailyVolM: 52.3,  avgTradeSize: 195, oddLotPct: 49.8, retailPct: 35.6 },
  { ticker: 'IWM',  price: 204.50, quotedBps: 0.39, avgDailyVolM: 28.4,  avgTradeSize: 250, oddLotPct: 44.1, retailPct: 41.5 },
  { ticker: 'AAPL', price: 213.20, quotedBps: 0.47, avgDailyVolM: 55.2,  avgTradeSize: 180, oddLotPct: 58.7, retailPct: 45.3 },
  { ticker: 'MSFT', price: 428.50, quotedBps: 0.28, avgDailyVolM: 22.8,  avgTradeSize: 120, oddLotPct: 51.2, retailPct: 33.8 },
  { ticker: 'NVDA', price: 875.30, quotedBps: 0.29, avgDailyVolM: 42.1,  avgTradeSize: 95,  oddLotPct: 61.4, retailPct: 47.2 },
  { ticker: 'AMZN', price: 185.60, quotedBps: 0.70, avgDailyVolM: 38.6,  avgTradeSize: 155, oddLotPct: 55.9, retailPct: 42.1 },
  { ticker: 'TSLA', price: 248.40, quotedBps: 1.41, avgDailyVolM: 95.0,  avgTradeSize: 200, oddLotPct: 63.2, retailPct: 52.8 },
  { ticker: 'META', price: 502.10, quotedBps: 0.32, avgDailyVolM: 18.5,  avgTradeSize: 105, oddLotPct: 54.6, retailPct: 36.4 },
  { ticker: 'GOOGL', price: 155.80, quotedBps: 0.51, avgDailyVolM: 24.6, avgTradeSize: 165, oddLotPct: 50.3, retailPct: 39.7 },
  { ticker: 'JPM',  price: 198.70, quotedBps: 0.81, avgDailyVolM: 10.2,  avgTradeSize: 130, oddLotPct: 42.8, retailPct: 28.5 },
  { ticker: 'V',    price: 278.90, quotedBps: 0.54, avgDailyVolM: 7.4,   avgTradeSize: 110, oddLotPct: 46.5, retailPct: 31.2 },
  { ticker: 'UNH',  price: 524.30, quotedBps: 0.95, avgDailyVolM: 3.8,   avgTradeSize: 85,  oddLotPct: 39.7, retailPct: 22.4 },
  { ticker: 'XOM',  price: 113.50, quotedBps: 0.62, avgDailyVolM: 14.2,  avgTradeSize: 175, oddLotPct: 43.2, retailPct: 34.9 },
  { ticker: 'AMD',  price: 172.40, quotedBps: 0.46, avgDailyVolM: 48.3,  avgTradeSize: 140, oddLotPct: 59.1, retailPct: 49.6 },
  { ticker: 'GS',   price: 462.80, quotedBps: 0.52, avgDailyVolM: 2.8,   avgTradeSize: 75,  oddLotPct: 37.4, retailPct: 19.8 },
  { ticker: 'BAC',  price: 37.80,  quotedBps: 1.32, avgDailyVolM: 35.4,  avgTradeSize: 350, oddLotPct: 48.6, retailPct: 44.1 },
  { ticker: 'DIS',  price: 112.60, quotedBps: 0.71, avgDailyVolM: 11.5,  avgTradeSize: 160, oddLotPct: 52.8, retailPct: 43.7 },
  { ticker: 'INTC', price: 43.20,  quotedBps: 1.16, avgDailyVolM: 32.1,  avgTradeSize: 280, oddLotPct: 56.3, retailPct: 46.5 },
  { ticker: 'PFE',  price: 28.40,  quotedBps: 1.76, avgDailyVolM: 25.8,  avgTradeSize: 310, oddLotPct: 47.9, retailPct: 40.2 },
];

const DEPTH_INSTRUMENTS = [
  { ticker: 'SPY', midPrice: 527.40, halfSpread: 0.005, baseBidSize: 28000, baseAskSize: 27000, baseBidOrders: 195, baseAskOrders: 188 },
  { ticker: 'QQQ', midPrice: 444.80, halfSpread: 0.010, baseBidSize: 18000, baseAskSize: 17500, baseBidOrders: 142, baseAskOrders: 136 },
  { ticker: 'IWM', midPrice: 204.50, halfSpread: 0.020, baseBidSize: 12000, baseAskSize: 11500, baseBidOrders: 98,  baseAskOrders: 92  },
];

const DARK_POOL_VENUES = [
  { venue: 'UBS ATS',               baseShare: 14.2, baseAvgSize: 340 },
  { venue: 'Goldman Sigma X',       baseShare: 10.6, baseAvgSize: 385 },
  { venue: 'Morgan Stanley MS Pool', baseShare: 9.2,  baseAvgSize: 420 },
  { venue: 'JP Morgan JPM-X',       baseShare: 8.3,  baseAvgSize: 360 },
  { venue: 'Citadel Connect',       baseShare: 10.0, baseAvgSize: 195 },
  { venue: 'Virtu MatchIt',         baseShare: 8.9,  baseAvgSize: 210 },
  { venue: 'BIDS Trading',          baseShare: 5.6,  baseAvgSize: 580 },
  { venue: 'IntelligentCross',      baseShare: 6.5,  baseAvgSize: 250 },
  { venue: 'IEX',                   baseShare: 3.8,  baseAvgSize: 185 },
  { venue: 'MEMX',                  baseShare: 5.2,  baseAvgSize: 210 },
];

const TICK_SIZE_BUCKETS = [
  { bucket: '<$1.00',     tickSize: 0.0001, basePctVolume: 4.2,  baseAvgSpread: 0.52 },
  { bucket: '$1.00-$5.00', tickSize: 0.01,  basePctVolume: 8.5,  baseAvgSpread: 1.85 },
  { bucket: '$5.00-$50',   tickSize: 0.01,  basePctVolume: 28.3, baseAvgSpread: 1.12 },
  { bucket: '$50-$200',    tickSize: 0.01,  basePctVolume: 35.8, baseAvgSpread: 0.45 },
  { bucket: '$200-$500',   tickSize: 0.01,  basePctVolume: 15.4, baseAvgSpread: 0.28 },
  { bucket: '>$500',       tickSize: 0.01,  basePctVolume: 7.8,  baseAvgSpread: 0.18 },
];

// --- Generation ---

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('equity-market-microstructure-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round3 = (v: number) => Math.round(v * 1000) / 1000;
  const round4 = (v: number) => Math.round(v * 10000) / 10000;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // ========================================
  // 1. Bid-Ask Spread Analysis (Top 20)
  // ========================================
  const bidAskSpreadAnalysis = TOP_20_STOCKS.map(s => {
    const quotedSpreadBps = round2(jitter(s.quotedBps, 0.12));
    const quotedSpreadCents = round2((quotedSpreadBps / 10000) * s.price * 100);
    // Effective spread is typically 60-85% of quoted spread
    const effectiveSpreadBps = round2(quotedSpreadBps * jitter(0.72, 0.08));
    // Realized spread is typically 30-60% of quoted spread (after price impact)
    const realizedSpreadBps = round2(quotedSpreadBps * jitter(0.45, 0.15));
    const avgDailyVolumeM = round1(jitter(s.avgDailyVolM, 0.10));
    const avgTradeSize = Math.round(jitter(s.avgTradeSize, 0.12));
    // Time-weighted spread (slightly wider than quoted due to volatile periods)
    const twSpreadBps = round2(quotedSpreadBps * jitter(1.08, 0.05));

    return {
      ticker: s.ticker,
      quotedSpreadBps,
      quotedSpreadCents,
      effectiveSpreadBps,
      realizedSpreadBps,
      timeWeightedSpreadBps: twSpreadBps,
      avgDailyVolumeM,
      avgTradeSize,
    };
  });

  // ========================================
  // 2. Depth of Book (10 levels for SPY/QQQ/IWM)
  // ========================================
  const depthOfBook = DEPTH_INSTRUMENTS.map(inst => {
    const midpoint = round2(jitter(inst.midPrice, 0.012));
    const bidLevels = [];
    const askLevels = [];

    for (let lvl = 1; lvl <= 10; lvl++) {
      const decayFactor = Math.pow(0.88, lvl - 1);
      const bidPrice = round2(midpoint - inst.halfSpread - (lvl - 1) * 0.01);
      const bidSize = Math.round(jitter(inst.baseBidSize * decayFactor, 0.20));
      const bidOrders = Math.round(jitter(inst.baseBidOrders * decayFactor, 0.18));
      bidLevels.push({ level: lvl, price: bidPrice, size: bidSize, orderCount: bidOrders });

      const askPrice = round2(midpoint + inst.halfSpread + (lvl - 1) * 0.01);
      const askSize = Math.round(jitter(inst.baseAskSize * decayFactor, 0.20));
      const askOrders = Math.round(jitter(inst.baseAskOrders * decayFactor, 0.18));
      askLevels.push({ level: lvl, price: askPrice, size: askSize, orderCount: askOrders });
    }

    const totalBidSize = bidLevels.reduce((a, l) => a + l.size, 0);
    const totalAskSize = askLevels.reduce((a, l) => a + l.size, 0);
    const bookImbalancePct = round1(((totalBidSize - totalAskSize) / (totalBidSize + totalAskSize)) * 100);

    return {
      ticker: inst.ticker,
      midpoint,
      spreadCents: round2((inst.halfSpread * 2) * 100),
      bidLevels,
      askLevels,
      totalBidDepth: totalBidSize,
      totalAskDepth: totalAskSize,
      bookImbalancePct,
    };
  });

  // ========================================
  // 3. Order Flow Toxicity
  // ========================================
  // VPIN (Volume-synchronized Probability of Informed Trading) ranges 0-1, typical 0.3-0.6
  const vpinSpy = round3(jitter(0.38, 0.15));
  const vpinQqq = round3(jitter(0.35, 0.15));
  const vpinIwm = round3(jitter(0.42, 0.15));

  // Kyle's lambda measures price impact per unit of order flow (higher = more toxic)
  // Typical values 0.001-0.05 depending on stock
  const kyleLambdaSpy = round4(jitter(0.0045, 0.18));
  const kyleLambdaQqq = round4(jitter(0.0062, 0.18));
  const kyleLambdaIwm = round4(jitter(0.0210, 0.18));

  // Amihud illiquidity ratio: |return| / dollar volume (x10^6)
  const amihudSpy = round4(jitter(0.012, 0.15));
  const amihudQqq = round4(jitter(0.018, 0.15));
  const amihudIwm = round4(jitter(0.085, 0.15));

  // Intraday VPIN time series (hourly buckets)
  const vpinTimeSeries = [
    '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30',
  ].map(time => ({
    time,
    spy: round3(jitter(vpinSpy, 0.20)),
    qqq: round3(jitter(vpinQqq, 0.20)),
    iwm: round3(jitter(vpinIwm, 0.20)),
  }));

  const orderFlowToxicity = {
    vpin: {
      SPY: { current: vpinSpy, avg30d: round3(jitter(vpinSpy, 0.08)), percentile: Math.round(jitter(52, 0.25)) },
      QQQ: { current: vpinQqq, avg30d: round3(jitter(vpinQqq, 0.08)), percentile: Math.round(jitter(48, 0.25)) },
      IWM: { current: vpinIwm, avg30d: round3(jitter(vpinIwm, 0.08)), percentile: Math.round(jitter(58, 0.25)) },
    },
    kyleLambda: {
      SPY: { current: kyleLambdaSpy, avg30d: round4(jitter(kyleLambdaSpy, 0.10)), priceImpactBpsPerMM: round2(kyleLambdaSpy * 1000) },
      QQQ: { current: kyleLambdaQqq, avg30d: round4(jitter(kyleLambdaQqq, 0.10)), priceImpactBpsPerMM: round2(kyleLambdaQqq * 1000) },
      IWM: { current: kyleLambdaIwm, avg30d: round4(jitter(kyleLambdaIwm, 0.10)), priceImpactBpsPerMM: round2(kyleLambdaIwm * 1000) },
    },
    amihudIlliquidity: {
      SPY: { current: amihudSpy, avg30d: round4(jitter(amihudSpy, 0.10)) },
      QQQ: { current: amihudQqq, avg30d: round4(jitter(amihudQqq, 0.10)) },
      IWM: { current: amihudIwm, avg30d: round4(jitter(amihudIwm, 0.10)) },
    },
    vpinTimeSeries,
  };

  // ========================================
  // 4. Dark Pool Activity
  // ========================================
  const totalDarkPoolPct = round1(jitter(39.8, 0.05));
  const litExchangePct = round1(100 - totalDarkPoolPct);

  const venueBreakdown = DARK_POOL_VENUES.map(v => ({
    venue: v.venue,
    sharePct: round1(jitter(v.baseShare, 0.10)),
    avgTradeSize: Math.round(jitter(v.baseAvgSize, 0.15)),
    priceImprovementCents: round2(jitter(0.22, 0.40)),
  }));

  // Normalize venue shares
  const rawVenueSum = venueBreakdown.reduce((a, v) => a + v.sharePct, 0);
  for (const v of venueBreakdown) {
    v.sharePct = round1((v.sharePct / rawVenueSum) * totalDarkPoolPct);
  }

  // Intraday dark pool volume distribution (U-shaped, slightly different from lit)
  const darkPoolIntradayWeights = [0.15, 0.14, 0.11, 0.08, 0.10, 0.14, 0.17, 0.11];
  const darkPoolIntraday = [
    '09:30-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
    '13:00-14:00', '14:00-15:00', '15:00-15:30', '15:30-16:00',
  ].map((slot, i) => ({
    timeSlot: slot,
    darkPoolPct: round1(jitter(darkPoolIntradayWeights[i] * 100, 0.10)),
  }));

  const darkPoolActivity = {
    totalDarkPoolVolumePct: totalDarkPoolPct,
    litExchangeVolumePct: litExchangePct,
    venueBreakdown,
    intradayDistribution: darkPoolIntraday,
  };

  // ========================================
  // 5. Tick Size Analysis
  // ========================================
  const tickSizeAnalysis = TICK_SIZE_BUCKETS.map(b => ({
    priceBucket: b.bucket,
    tickSize: b.tickSize,
    pctOfVolume: round1(jitter(b.basePctVolume, 0.08)),
    avgSpreadInTicks: round2(jitter(b.baseAvgSpread, 0.12)),
    avgSpreadBps: round2(jitter(b.baseAvgSpread * 0.8, 0.12)),
    tickConstrainedPct: round1(jitter(
      b.bucket === '<$1.00' ? 12.5 :
      b.bucket === '$1.00-$5.00' ? 42.8 :
      b.bucket === '$5.00-$50' ? 28.4 :
      b.bucket === '$50-$200' ? 15.2 :
      b.bucket === '$200-$500' ? 8.6 : 4.1,
      0.15
    )),
  }));

  // Normalize pctOfVolume to sum to 100
  const tickVolSum = tickSizeAnalysis.reduce((a, b) => a + b.pctOfVolume, 0);
  for (const b of tickSizeAnalysis) {
    b.pctOfVolume = round1((b.pctOfVolume / tickVolSum) * 100);
  }

  // ========================================
  // 6. Odd Lot Activity
  // ========================================
  const oddLotActivity = {
    overallOddLotPct: round1(jitter(51.4, 0.06)),
    avgOddLotSize: Math.round(jitter(28, 0.15)),
    oddLotByExchange: [
      { exchange: 'NYSE', oddLotPct: round1(jitter(48.2, 0.08)) },
      { exchange: 'NASDAQ', oddLotPct: round1(jitter(54.6, 0.08)) },
      { exchange: 'CBOE', oddLotPct: round1(jitter(50.1, 0.08)) },
      { exchange: 'IEX', oddLotPct: round1(jitter(46.8, 0.08)) },
      { exchange: 'ARCA', oddLotPct: round1(jitter(49.5, 0.08)) },
    ],
    topOddLotStocks: TOP_20_STOCKS.slice(0, 10)
      .map(s => ({
        ticker: s.ticker,
        oddLotPct: round1(jitter(s.oddLotPct, 0.08)),
        avgOddLotSize: Math.round(jitter(22, 0.25)),
      }))
      .sort((a, b) => b.oddLotPct - a.oddLotPct),
    // Sub-100 share trades have been >50% of all trades since 2020
    historicalTrend: [
      { year: 2018, oddLotPct: 38.2 },
      { year: 2019, oddLotPct: 42.5 },
      { year: 2020, oddLotPct: 48.1 },
      { year: 2021, oddLotPct: 50.8 },
      { year: 2022, oddLotPct: 49.6 },
      { year: 2023, oddLotPct: 51.2 },
      { year: 2024, oddLotPct: 52.8 },
    ],
  };

  // ========================================
  // 7. Retail vs Institutional Flow Indicators
  // ========================================
  const retailVsInstitutional = {
    overall: {
      retailPctOfVolume: round1(jitter(24.5, 0.08)),
      institutionalPctOfVolume: round1(jitter(55.2, 0.06)),
      hftPctOfVolume: round1(jitter(20.3, 0.10)),
    },
    retailIndicators: {
      // Retail orders tend to be small, market orders, internalized by wholesalers
      avgRetailOrderSize: Math.round(jitter(42, 0.20)),
      marketOrderPct: round1(jitter(68.4, 0.06)),
      internalizationPct: round1(jitter(89.2, 0.04)),
      paymentForOrderFlowCentsPerShare: round3(jitter(0.0024, 0.15)),
      topRetailBrokers: [
        { broker: 'Robinhood',         flowPctOfRetail: round1(jitter(22.5, 0.10)) },
        { broker: 'Schwab/TD',         flowPctOfRetail: round1(jitter(18.8, 0.10)) },
        { broker: 'Fidelity',          flowPctOfRetail: round1(jitter(16.2, 0.10)) },
        { broker: 'E*TRADE',           flowPctOfRetail: round1(jitter(12.4, 0.10)) },
        { broker: 'Interactive Brokers', flowPctOfRetail: round1(jitter(8.6, 0.10)) },
      ],
    },
    institutionalIndicators: {
      avgInstitutionalOrderSize: Math.round(jitter(2850, 0.18)),
      algoExecutionPct: round1(jitter(78.5, 0.06)),
      darkPoolUsagePct: round1(jitter(42.3, 0.08)),
      avgParticipationRate: round1(jitter(8.2, 0.15)),
      blockTradePctOfInst: round1(jitter(12.8, 0.12)),
    },
    retailSentimentByStock: TOP_20_STOCKS.slice(0, 10).map(s => ({
      ticker: s.ticker,
      retailPctOfVolume: round1(jitter(s.retailPct, 0.10)),
      retailNetFlowM: round1((rng() - 0.45) * jitter(15, 0.30)),
      sentimentScore: round2(jitter(0.52, 0.20)),
    })),
  };

  // ========================================
  // 8. Market Impact Estimates
  // ========================================
  // Almgren-Chriss style market impact model
  // Temporary impact (bps) = sigma * (Q / ADV)^0.5 * kappa
  // Permanent impact (bps) = gamma * sigma * (Q / ADV)
  const marketImpactEstimates = {
    model: 'Almgren-Chriss',
    description: 'Estimated market impact for various order sizes across key instruments',
    estimates: [
      { ticker: 'SPY', volatilityBps: round1(jitter(85, 0.10)) },
      { ticker: 'QQQ', volatilityBps: round1(jitter(110, 0.10)) },
      { ticker: 'IWM', volatilityBps: round1(jitter(125, 0.10)) },
      { ticker: 'AAPL', volatilityBps: round1(jitter(145, 0.10)) },
      { ticker: 'NVDA', volatilityBps: round1(jitter(210, 0.10)) },
      { ticker: 'TSLA', volatilityBps: round1(jitter(285, 0.10)) },
    ].map(e => {
      const sigma = e.volatilityBps;
      // Impact at different participation rates
      const impactBySize = [
        { orderSizeM: 1,   participationPct: 2  },
        { orderSizeM: 5,   participationPct: 5  },
        { orderSizeM: 10,  participationPct: 8  },
        { orderSizeM: 25,  participationPct: 12 },
        { orderSizeM: 50,  participationPct: 18 },
        { orderSizeM: 100, participationPct: 25 },
      ].map(sz => {
        const pctAdv = sz.participationPct / 100;
        const tempImpactBps = round2(sigma * Math.sqrt(pctAdv) * jitter(0.50, 0.10));
        const permImpactBps = round2(sigma * pctAdv * jitter(0.30, 0.12));
        const totalImpactBps = round2(tempImpactBps + permImpactBps);
        const impliedCostDollars = Math.round(sz.orderSizeM * 1_000_000 * (totalImpactBps / 10000));
        return {
          orderSizeM: sz.orderSizeM,
          participationPct: sz.participationPct,
          temporaryImpactBps: tempImpactBps,
          permanentImpactBps: permImpactBps,
          totalImpactBps,
          impliedCostDollars,
        };
      });

      return {
        ticker: e.ticker,
        dailyVolatilityBps: sigma,
        impactBySize,
      };
    }),
    executionStrategies: [
      { strategy: 'VWAP',    avgSlippageBps: round2(jitter(2.8, 0.15)),  bestFor: 'Medium urgency, broad participation' },
      { strategy: 'TWAP',    avgSlippageBps: round2(jitter(3.2, 0.15)),  bestFor: 'Low urgency, uniform execution' },
      { strategy: 'IS',      avgSlippageBps: round2(jitter(4.5, 0.15)),  bestFor: 'High urgency, minimize drift' },
      { strategy: 'Iceberg', avgSlippageBps: round2(jitter(2.1, 0.15)),  bestFor: 'Large orders, minimize information leakage' },
      { strategy: 'POV',     avgSlippageBps: round2(jitter(2.5, 0.15)),  bestFor: 'Track participation rate' },
      { strategy: 'Close',   avgSlippageBps: round2(jitter(5.8, 0.15)),  bestFor: 'Benchmark to closing price' },
    ],
  };

  return {
    bidAskSpreadAnalysis,
    depthOfBook,
    orderFlowToxicity,
    darkPoolActivity,
    tickSizeAnalysis,
    oddLotActivity,
    retailVsInstitutional,
    marketImpactEstimates,
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
  } catch (err: unknown) {
    console.error('[EquityMarketMicrostructure] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(502).json({ error: 'Failed to generate equity market microstructure data' });
  }
});

export default router;
