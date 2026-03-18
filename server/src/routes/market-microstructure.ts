import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// --- Ticker universe ---

const TICKERS = [
  { ticker: 'AAPL', name: 'Apple Inc.', basePrice: 213.25, baseSpread: 0.8, baseDepth: 8500, baseAvgTrade: 180, baseTradesMin: 420 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', basePrice: 428.50, baseSpread: 1.2, baseDepth: 4800, baseAvgTrade: 120, baseTradesMin: 310 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', basePrice: 175.60, baseSpread: 1.5, baseDepth: 5200, baseAvgTrade: 140, baseTradesMin: 280 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', basePrice: 186.40, baseSpread: 1.3, baseDepth: 6500, baseAvgTrade: 155, baseTradesMin: 350 },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', basePrice: 875.30, baseSpread: 2.1, baseDepth: 3200, baseAvgTrade: 95, baseTradesMin: 520 },
  { ticker: 'META', name: 'Meta Platforms Inc.', basePrice: 505.20, baseSpread: 1.8, baseDepth: 3800, baseAvgTrade: 110, baseTradesMin: 260 },
  { ticker: 'TSLA', name: 'Tesla Inc.', basePrice: 248.90, baseSpread: 3.5, baseDepth: 4200, baseAvgTrade: 200, baseTradesMin: 680 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', basePrice: 198.70, baseSpread: 1.6, baseDepth: 3500, baseAvgTrade: 130, baseTradesMin: 180 },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', basePrice: 527.40, baseSpread: 0.3, baseDepth: 25000, baseAvgTrade: 220, baseTradesMin: 950 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', basePrice: 445.80, baseSpread: 0.4, baseDepth: 18000, baseAvgTrade: 195, baseTradesMin: 780 },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', basePrice: 205.30, baseSpread: 0.6, baseDepth: 12000, baseAvgTrade: 250, baseTradesMin: 540 },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR', basePrice: 42.15, baseSpread: 0.9, baseDepth: 15000, baseAvgTrade: 350, baseTradesMin: 320 },
  { ticker: 'BAC', name: 'Bank of America Corporation', basePrice: 38.60, baseSpread: 1.1, baseDepth: 9500, baseAvgTrade: 380, baseTradesMin: 290 },
  { ticker: 'GS', name: 'Goldman Sachs Group Inc.', basePrice: 465.80, baseSpread: 2.4, baseDepth: 1800, baseAvgTrade: 75, baseTradesMin: 110 },
  { ticker: 'COIN', name: 'Coinbase Global Inc.', basePrice: 225.70, baseSpread: 5.2, baseDepth: 2200, baseAvgTrade: 160, baseTradesMin: 380 },
];

// --- Venue definitions ---

const VENUES = [
  { name: 'NYSE', baseShare: 22.5, baseSpread: 1.4, baseFill: 85 },
  { name: 'NASDAQ', baseShare: 19.8, baseSpread: 1.2, baseFill: 88 },
  { name: 'ARCA', baseShare: 12.3, baseSpread: 1.6, baseFill: 82 },
  { name: 'BATS', baseShare: 14.7, baseSpread: 1.1, baseFill: 90 },
  { name: 'IEX', baseShare: 3.8, baseSpread: 0.9, baseFill: 78 },
  { name: 'EDGX', baseShare: 10.2, baseSpread: 1.3, baseFill: 86 },
];

// --- Intraday time buckets ---

const TIME_BUCKETS = [
  { label: '9:30-10:00', baseVolPct: 14.2, baseSpread: 2.8, baseVol: 18.5 },
  { label: '10:00-11:00', baseVolPct: 15.8, baseSpread: 1.9, baseVol: 14.2 },
  { label: '11:00-12:00', baseVolPct: 11.5, baseSpread: 1.5, baseVol: 11.8 },
  { label: '12:00-13:00', baseVolPct: 8.2, baseSpread: 1.7, baseVol: 10.5 },
  { label: '13:00-14:00', baseVolPct: 9.8, baseSpread: 1.6, baseVol: 11.0 },
  { label: '14:00-15:00', baseVolPct: 14.5, baseSpread: 1.8, baseVol: 13.5 },
  { label: '15:00-16:00', baseVolPct: 26.0, baseSpread: 2.2, baseVol: 16.8 },
];

// --- Generation ---

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('market-microstructure-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // --- Spread Analysis ---
  const spreadAnalysis = TICKERS.map(t => {
    const price = round2(jitter(t.basePrice, 0.015));
    const spreadBps = round2(jitter(t.baseSpread, 0.2));
    const spreadDollars = round2((spreadBps / 10000) * price);
    const bid = round2(price - spreadDollars / 2);
    const ask = round2(price + spreadDollars / 2);
    const depthBid = Math.round(jitter(t.baseDepth, 0.25));
    const depthAsk = Math.round(jitter(t.baseDepth * 0.95, 0.25));
    const avgTradeSize = Math.round(jitter(t.baseAvgTrade, 0.2));
    const tradesPerMin = Math.round(jitter(t.baseTradesMin, 0.15));

    // Effective spread: typically slightly wider than quoted
    const effectiveSpread = round2(spreadBps * jitter(1.12, 0.08));
    // Realized spread: typically narrower (market makers capture less due to adverse selection)
    const realizedSpread = round2(spreadBps * jitter(0.45, 0.15));

    return {
      ticker: t.ticker,
      bid,
      ask,
      spreadBps,
      depthAtBid: depthBid,
      depthAtAsk: depthAsk,
      avgTradeSize,
      tradesPerMin,
      effectiveSpread,
      realizedSpread,
    };
  });

  // --- Order Flow Metrics ---
  const buyVolPct = round1(jitter(52.5, 0.06));
  const sellVolPct = round1(100 - buyVolPct);
  const netOrderImbalance = round2(buyVolPct - sellVolPct);
  const largeOrderPct = round1(jitter(8.5, 0.2));
  const darkPoolPct = round1(jitter(39.5, 0.08));
  const litMarketPct = round1(100 - darkPoolPct);

  const orderFlowMetrics = {
    buyVolumePct: buyVolPct,
    sellVolumePct: sellVolPct,
    netOrderImbalance,
    largeOrderPct,
    darkPoolPct,
    litMarketPct,
  };

  // --- Venue Analysis ---
  const venueAnalysis = VENUES.map(v => {
    const marketShare = round2(jitter(v.baseShare, 0.08));
    const avgSpread = round2(jitter(v.baseSpread, 0.12));
    const fillRate = round1(Math.min(99, jitter(v.baseFill, 0.04)));
    return {
      exchange: v.name,
      marketSharePct: marketShare,
      avgSpreadBps: avgSpread,
      fillRatePct: fillRate,
    };
  });

  // Normalize venue market shares to sum to ~83% (remaining ~17% is dark pools + other)
  const rawShareSum = venueAnalysis.reduce((a, v) => a + v.marketSharePct, 0);
  const targetShareSum = 83;
  for (const v of venueAnalysis) {
    v.marketSharePct = round2((v.marketSharePct / rawShareSum) * targetShareSum);
  }

  // --- Intraday Patterns ---
  const intradayPatterns = TIME_BUCKETS.map(b => {
    const volumePct = round1(jitter(b.baseVolPct, 0.08));
    const spreadBps = round2(jitter(b.baseSpread, 0.1));
    const volatilityBps = round2(jitter(b.baseVol, 0.12));
    return {
      timeBucket: b.label,
      volumePct,
      spreadBps,
      volatilityBps,
    };
  });

  // Normalize intraday volume to 100%
  const volTotal = intradayPatterns.reduce((a, p) => a + p.volumePct, 0);
  for (const p of intradayPatterns) {
    p.volumePct = round1((p.volumePct / volTotal) * 100);
  }

  // --- Summary ---
  const avgSpreadBps = round2(
    spreadAnalysis.reduce((a, s) => a + s.spreadBps, 0) / spreadAnalysis.length
  );
  const avgEffectiveSpread = round2(
    spreadAnalysis.reduce((a, s) => a + s.effectiveSpread, 0) / spreadAnalysis.length
  );
  const totalTradesPerMin = spreadAnalysis.reduce((a, s) => a + s.tradesPerMin, 0);
  const avgDepthImbalance = round2(
    spreadAnalysis.reduce((a, s) => a + (s.depthAtBid - s.depthAtAsk), 0) / spreadAnalysis.length
  );

  const summary = {
    avgQuotedSpreadBps: avgSpreadBps,
    avgEffectiveSpreadBps: avgEffectiveSpread,
    totalTradesPerMin,
    avgDepthImbalance,
    marketOrderFlowBias: netOrderImbalance > 0 ? 'BUY' : 'SELL',
    darkPoolShare: orderFlowMetrics.darkPoolPct,
  };

  return {
    spreadAnalysis,
    orderFlowMetrics,
    venueAnalysis,
    intradayPatterns,
    summary,
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
    console.error('[MarketMicrostructure] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate market microstructure data' });
  }
});

export default router;
