import { Router } from 'express';

const router = Router();

// ── Deterministic seeded PRNG ──

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Constants ──

const SECURITIES = [
  { ticker: 'SPY', name: 'S&P 500 ETF', baseSpread: 0.3, baseDepth: 850, baseLambda: 0.012 },
  { ticker: 'QQQ', name: 'Nasdaq 100 ETF', baseSpread: 0.5, baseDepth: 620, baseLambda: 0.018 },
  { ticker: 'AAPL', name: 'Apple Inc', baseSpread: 0.8, baseDepth: 480, baseLambda: 0.025 },
  { ticker: 'TSLA', name: 'Tesla Inc', baseSpread: 2.1, baseDepth: 310, baseLambda: 0.065 },
  { ticker: 'MSFT', name: 'Microsoft Corp', baseSpread: 0.7, baseDepth: 520, baseLambda: 0.022 },
  { ticker: 'JPM', name: 'JPMorgan Chase', baseSpread: 1.2, baseDepth: 380, baseLambda: 0.035 },
  { ticker: 'GS', name: 'Goldman Sachs', baseSpread: 1.8, baseDepth: 260, baseLambda: 0.048 },
  { ticker: 'XOM', name: 'Exxon Mobil', baseSpread: 1.1, baseDepth: 400, baseLambda: 0.032 },
  { ticker: 'AMZN', name: 'Amazon.com Inc', baseSpread: 0.9, baseDepth: 450, baseLambda: 0.028 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', baseSpread: 1.4, baseDepth: 390, baseLambda: 0.042 },
];

const VENUES = [
  { name: 'NYSE', baseShare: 23.5, basePriceImprovement: 42, baseFillRate: 88, baseExecTime: 1.2, baseInfoShare: 0.28 },
  { name: 'NASDAQ', baseShare: 19.8, basePriceImprovement: 38, baseFillRate: 85, baseExecTime: 0.8, baseInfoShare: 0.24 },
  { name: 'BATS', baseShare: 15.2, basePriceImprovement: 35, baseFillRate: 82, baseExecTime: 0.6, baseInfoShare: 0.18 },
  { name: 'IEX', baseShare: 3.8, basePriceImprovement: 65, baseFillRate: 72, baseExecTime: 1.8, baseInfoShare: 0.08 },
  { name: 'ARCA', baseShare: 12.4, basePriceImprovement: 32, baseFillRate: 84, baseExecTime: 0.9, baseInfoShare: 0.14 },
  { name: 'EDGX', baseShare: 8.6, basePriceImprovement: 30, baseFillRate: 80, baseExecTime: 0.7, baseInfoShare: 0.08 },
];

const QUOTE_VENUES = [
  { name: 'NYSE', baseQTR: 8.2, baseNBBO: 62, baseQuoteLife: 420, baseCancelRate: 88 },
  { name: 'NASDAQ', baseQTR: 12.5, baseNBBO: 55, baseQuoteLife: 310, baseCancelRate: 91 },
  { name: 'BATS', baseQTR: 15.8, baseNBBO: 48, baseQuoteLife: 260, baseCancelRate: 93 },
  { name: 'IEX', baseQTR: 2.1, baseNBBO: 38, baseQuoteLife: 1850, baseCancelRate: 45 },
  { name: 'ARCA', baseQTR: 10.3, baseNBBO: 52, baseQuoteLife: 350, baseCancelRate: 90 },
  { name: 'EDGX', baseQTR: 14.2, baseNBBO: 45, baseQuoteLife: 280, baseCancelRate: 92 },
  { name: 'MEMX', baseQTR: 9.7, baseNBBO: 41, baseQuoteLife: 380, baseCancelRate: 89 },
  { name: 'LTSE', baseQTR: 1.8, baseNBBO: 32, baseQuoteLife: 2200, baseCancelRate: 38 },
];

const INTRADAY_BUCKETS = [
  '09:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30',
  '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30',
  '13:30-14:00', '14:00-14:30', '14:30-15:00', '15:00-15:30',
  '15:30-16:00',
];

// U-shaped intraday volume weights
const INTRADAY_VOLUME_WEIGHTS = [
  0.12, 0.09, 0.07, 0.06, 0.055, 0.05, 0.045,
  0.05, 0.055, 0.06, 0.07, 0.085, 0.14,
];

// Spread tends to be wider at open and close
const INTRADAY_SPREAD_MULTIPLIERS = [
  1.8, 1.3, 1.1, 1.0, 0.95, 0.92, 0.90,
  0.92, 0.95, 1.0, 1.05, 1.15, 1.6,
];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const rng = seededRandom('price-discovery');
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round4 = (v: number) => Math.round(v * 10000) / 10000;

  // ── 1. Price Discovery Metrics ──

  const priceDiscoveryMetrics = SECURITIES.map(sec => {
    const bidAskSpreadBps = round2(jitter(sec.baseSpread, 0.15));
    const depthAtBestBid = Math.round(jitter(sec.baseDepth, 0.2)) * 1000;
    const depthAtBestAsk = Math.round(jitter(sec.baseDepth, 0.2)) * 1000;
    const priceImpactPer1M = round2(jitter(sec.baseSpread * 2.5, 0.2));
    const kyleLambda = round4(jitter(sec.baseLambda, 0.2));
    const amihudRatio = round4(jitter(sec.baseLambda * 0.8, 0.25));
    const realizedSpreadBps = round2(jitter(sec.baseSpread * 0.6, 0.2));
    const effectiveSpreadBps = round2(jitter(sec.baseSpread * 0.85, 0.15));

    // Price discovery contribution per venue — should sum to ~100%
    const rawContributions: Record<string, number> = {};
    let contribTotal = 0;
    for (const v of VENUES) {
      const contrib = jitter(v.baseInfoShare, 0.2);
      rawContributions[v.name] = contrib;
      contribTotal += contrib;
    }
    const venueContribution: Record<string, number> = {};
    for (const v of VENUES) {
      venueContribution[v.name] = round2((rawContributions[v.name] / contribTotal) * 100);
    }

    return {
      ticker: sec.ticker,
      name: sec.name,
      bidAskSpreadBps,
      depthAtBestBid,
      depthAtBestAsk,
      priceImpactPer1MBps: priceImpactPer1M,
      kyleLambda,
      amihudIlliquidityRatio: amihudRatio,
      realizedSpreadBps,
      effectiveSpreadBps,
      venueContribution,
    };
  });

  // ── 2. Venue Analysis ──

  const rawShares = VENUES.map(v => jitter(v.baseShare, 0.08));
  const shareSum = rawShares.reduce((a, b) => a + b, 0);
  // Remaining ~17% to other unlisted venues
  const targetShareSum = 83;

  const venueAnalysis = VENUES.map((v, i) => {
    const marketSharePct = round2((rawShares[i] / shareSum) * targetShareSum);
    const priceImprovementRate = round2(jitter(v.basePriceImprovement, 0.1));
    const fillRate = round2(Math.min(99, jitter(v.baseFillRate, 0.05)));
    const avgExecutionTimeMs = round2(jitter(v.baseExecTime, 0.15));

    // Hasbrouck information share
    const rawInfo = jitter(v.baseInfoShare, 0.15);
    return {
      venue: v.name,
      marketSharePct,
      priceImprovementRate,
      fillRate,
      avgExecutionTimeMs,
      hasbrouckInformationShare: round4(rawInfo),
      _rawInfo: rawInfo,
    };
  });

  // Normalize Hasbrouck information shares to sum to 1.0
  const infoSum = venueAnalysis.reduce((a, v) => a + v._rawInfo, 0);
  const venueAnalysisFinal = venueAnalysis.map(v => {
    const { _rawInfo, ...rest } = v;
    return {
      ...rest,
      hasbrouckInformationShare: round4(_rawInfo / infoSum),
    };
  });

  // ── 3. Order Flow Toxicity (VPIN) ──

  const orderFlowToxicity = SECURITIES.map(sec => {
    const baseVpin = sec.baseSpread > 1.5 ? 0.45 : sec.baseSpread > 1.0 ? 0.35 : 0.25;
    const currentVpin = round4(jitter(baseVpin, 0.15));
    const avg30Day = round4(jitter(baseVpin * 0.95, 0.1));
    const percentileRank = Math.round(jitter(50, 0.5));
    const clampedPercentile = Math.max(5, Math.min(99, percentileRank));
    const toxicityAlert = currentVpin > avg30Day * 1.25 || clampedPercentile > 85;

    return {
      ticker: sec.ticker,
      vpinCurrent: currentVpin,
      vpin30DayAvg: avg30Day,
      vpinPercentileRank: clampedPercentile,
      toxicityAlert,
    };
  });

  // ── 4. Quote Quality ──

  const quoteQuality = QUOTE_VENUES.map(v => {
    const quoteToTradeRatio = round2(jitter(v.baseQTR, 0.12));
    const timeAtNbboPct = round2(Math.min(99, jitter(v.baseNBBO, 0.1)));
    const avgQuoteLifeMs = Math.round(jitter(v.baseQuoteLife, 0.15));
    const cancellationRate = round2(Math.min(99, jitter(v.baseCancelRate, 0.05)));

    return {
      venue: v.name,
      quoteToTradeRatio,
      timeAtNbboPct,
      avgQuoteLifeMs,
      cancellationRate,
    };
  });

  // ── 5. Information Asymmetry (PIN estimates) ──

  const informationAsymmetry = SECURITIES.map(sec => {
    // PIN typically ranges 0.05 - 0.35; less liquid names have higher PIN
    const basePin = sec.baseSpread > 1.5 ? 0.22 : sec.baseSpread > 1.0 ? 0.15 : 0.10;
    const pin = round4(jitter(basePin, 0.2));
    const clampedPin = Math.max(0.03, Math.min(0.45, pin));
    const alphaBuy = round4(jitter(0.15, 0.3));
    const alphaSell = round4(jitter(0.15, 0.3));
    const mu = round4(jitter(0.5, 0.15));
    const epsilonBuy = round4(jitter(0.4, 0.15));
    const epsilonSell = round4(jitter(0.4, 0.15));

    return {
      ticker: sec.ticker,
      pinEstimate: clampedPin,
      alphaBuy,
      alphaSell,
      mu,
      epsilonBuy,
      epsilonSell,
      classification: clampedPin > 0.25 ? 'High' : clampedPin > 0.15 ? 'Moderate' : 'Low',
    };
  });

  // ── 6. Intraday Patterns ──

  const volumeWeightSum = INTRADAY_VOLUME_WEIGHTS.reduce((a, b) => a + b, 0);

  const intradayPatterns = INTRADAY_BUCKETS.map((bucket, i) => {
    const baseSpread = 1.2;
    const avgSpreadBps = round2(jitter(baseSpread * INTRADAY_SPREAD_MULTIPLIERS[i], 0.1));

    const rawVolumeShare = jitter(INTRADAY_VOLUME_WEIGHTS[i], 0.08);
    const volumeSharePct = round2((rawVolumeShare / volumeWeightSum) * 100);

    // Price discovery contribution: higher at open and close
    const discoveryWeight = INTRADAY_SPREAD_MULTIPLIERS[i] * 0.6 + INTRADAY_VOLUME_WEIGHTS[i] * 2;
    const priceDiscoveryContribution = round2(jitter(discoveryWeight, 0.12));

    return {
      timeBucket: bucket,
      avgSpreadBps,
      volumeSharePct,
      priceDiscoveryContribution,
    };
  });

  // Normalize volume shares to sum to 100%
  const volShareTotal = intradayPatterns.reduce((a, p) => a + p.volumeSharePct, 0);
  for (const p of intradayPatterns) {
    p.volumeSharePct = round2((p.volumeSharePct / volShareTotal) * 100);
  }

  // Normalize price discovery contributions to sum to 100%
  const discTotal = intradayPatterns.reduce((a, p) => a + p.priceDiscoveryContribution, 0);
  for (const p of intradayPatterns) {
    p.priceDiscoveryContribution = round2((p.priceDiscoveryContribution / discTotal) * 100);
  }

  // ── Summary ──

  const avgBidAskSpread = round2(
    priceDiscoveryMetrics.reduce((a, m) => a + m.bidAskSpreadBps, 0) / priceDiscoveryMetrics.length
  );
  const avgEffectiveSpread = round2(
    priceDiscoveryMetrics.reduce((a, m) => a + m.effectiveSpreadBps, 0) / priceDiscoveryMetrics.length
  );
  const toxicAlerts = orderFlowToxicity.filter(t => t.toxicityAlert).length;
  const highPinCount = informationAsymmetry.filter(a => a.classification === 'High').length;
  const topVenue = [...venueAnalysisFinal].sort((a, b) => b.marketSharePct - a.marketSharePct)[0];
  const topDiscoveryVenue = [...venueAnalysisFinal].sort(
    (a, b) => b.hasbrouckInformationShare - a.hasbrouckInformationShare
  )[0];

  const summary = {
    avgBidAskSpreadBps: avgBidAskSpread,
    avgEffectiveSpreadBps: avgEffectiveSpread,
    toxicityAlertsCount: toxicAlerts,
    highPinSecurities: highPinCount,
    topVenueByShare: { venue: topVenue.venue, marketSharePct: topVenue.marketSharePct },
    topVenueByDiscovery: {
      venue: topDiscoveryVenue.venue,
      informationShare: topDiscoveryVenue.hasbrouckInformationShare,
    },
    securitiesCount: SECURITIES.length,
    venuesCount: VENUES.length,
  };

  return {
    summary,
    priceDiscoveryMetrics,
    venueAnalysis: venueAnalysisFinal,
    orderFlowToxicity,
    quoteQuality,
    informationAsymmetry,
    intradayPatterns,
    generatedAt: new Date().toISOString(),
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
    console.error('[PriceDiscovery] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate price discovery data' });
  }
});

export default router;
