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

interface ATSVenue {
  name: string;
  operator: string;
  type: 'Crossing Network' | 'ATS' | 'ECN';
  volumeShares: number;
  marketShare: number;
  avgOrderSize: number;
  priceImprovement: number;
  fillRate: number;
  change1d: number;
  topSymbols: string[];
}

interface DarkPoolSymbol {
  ticker: string;
  darkVolume: number;
  totalVolume: number;
  darkPct: number;
  priceImprovement: number;
  avgTradeSize: number;
  blockTradeCount: number;
}

interface TimeBucket {
  timeSlot: string;
  volumeShares: number;
  pctOfDaily: number;
  avgTradeSize: number;
}

const ATS_VENUES = [
  { name: 'UBS ATS', operator: 'UBS', type: 'ATS' as const, baseVolume: 480, baseMktShare: 14.2 },
  { name: 'Credit Suisse Crossfinder', operator: 'Credit Suisse', type: 'Crossing Network' as const, baseVolume: 420, baseMktShare: 12.4 },
  { name: 'Goldman Sigma X', operator: 'Goldman Sachs', type: 'ATS' as const, baseVolume: 360, baseMktShare: 10.6 },
  { name: 'Morgan Stanley MS Pool', operator: 'Morgan Stanley', type: 'ATS' as const, baseVolume: 310, baseMktShare: 9.2 },
  { name: 'JP Morgan JPM-X', operator: 'JP Morgan', type: 'ATS' as const, baseVolume: 280, baseMktShare: 8.3 },
  { name: 'Barclays LX', operator: 'Barclays', type: 'ATS' as const, baseVolume: 250, baseMktShare: 7.4 },
  { name: 'Citadel Connect', operator: 'Citadel Securities', type: 'ECN' as const, baseVolume: 340, baseMktShare: 10.0 },
  { name: 'Virtu MatchIt', operator: 'Virtu Financial', type: 'ECN' as const, baseVolume: 300, baseMktShare: 8.9 },
  { name: 'IntelligentCross', operator: 'Imperative Execution', type: 'ATS' as const, baseVolume: 220, baseMktShare: 6.5 },
  { name: 'BIDS Trading', operator: 'BIDS Trading LP', type: 'Crossing Network' as const, baseVolume: 190, baseMktShare: 5.6 },
];

const SYMBOL_POOL = [
  { ticker: 'AAPL', baseVol: 85, baseDarkPct: 39 },
  { ticker: 'MSFT', baseVol: 42, baseDarkPct: 41 },
  { ticker: 'NVDA', baseVol: 68, baseDarkPct: 37 },
  { ticker: 'AMZN', baseVol: 52, baseDarkPct: 40 },
  { ticker: 'TSLA', baseVol: 110, baseDarkPct: 36 },
  { ticker: 'META', baseVol: 38, baseDarkPct: 42 },
  { ticker: 'GOOGL', baseVol: 32, baseDarkPct: 43 },
  { ticker: 'SPY', baseVol: 120, baseDarkPct: 35 },
  { ticker: 'QQQ', baseVol: 75, baseDarkPct: 38 },
  { ticker: 'AMD', baseVol: 60, baseDarkPct: 39 },
  { ticker: 'INTC', baseVol: 48, baseDarkPct: 41 },
  { ticker: 'BAC', baseVol: 55, baseDarkPct: 44 },
  { ticker: 'JPM', baseVol: 22, baseDarkPct: 45 },
  { ticker: 'XOM', baseVol: 25, baseDarkPct: 42 },
  { ticker: 'JNJ', baseVol: 15, baseDarkPct: 46 },
];

const TIME_SLOTS = [
  '09:30-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
];

// Typical intraday volume distribution weights (U-shaped)
const TIME_WEIGHTS = [0.18, 0.16, 0.12, 0.09, 0.11, 0.15, 0.19];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('dark-pool-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));

  // --- ATS Venues ---
  const allTickers = SYMBOL_POOL.map(s => s.ticker);
  const venues: ATSVenue[] = ATS_VENUES.map(v => {
    const volumeShares = Math.round(jitter(v.baseVolume, 0.12) * 1_000_000);
    const marketShare = Math.round(jitter(v.baseMktShare, 0.08) * 100) / 100;
    const avgOrderSize = Math.round(jitter(250, 0.35));
    const priceImprovement = Math.round(jitter(0.25, 0.6) * 100) / 100;
    const fillRate = Math.round(jitter(30, 0.3) * 10) / 10;
    const change1d = Math.round((rng() - 0.45) * 10 * 100) / 100;

    // Pick 3 random top symbols
    const shuffled = [...allTickers].sort(() => rng() - 0.5);
    const topSymbols = shuffled.slice(0, 3);

    return {
      name: v.name,
      operator: v.operator,
      type: v.type,
      volumeShares,
      marketShare,
      avgOrderSize,
      priceImprovement: Math.max(0.01, priceImprovement),
      fillRate: Math.min(45, Math.max(15, fillRate)),
      change1d,
      topSymbols,
    };
  });

  // Normalize market shares to sum to ~93% (leaving ~7% for smaller venues not listed)
  const rawShareSum = venues.reduce((a, v) => a + v.marketShare, 0);
  const targetShareSum = 93;
  for (const v of venues) {
    v.marketShare = Math.round((v.marketShare / rawShareSum) * targetShareSum * 100) / 100;
  }

  const totalDarkVolumeShares = venues.reduce((a, v) => a + v.volumeShares, 0);

  // --- Top Symbols ---
  const symbols: DarkPoolSymbol[] = SYMBOL_POOL.map(s => {
    const totalVolume = Math.round(jitter(s.baseVol, 0.15) * 1_000_000);
    const darkPct = Math.round(jitter(s.baseDarkPct, 0.06) * 10) / 10;
    const darkVolume = Math.round(totalVolume * (darkPct / 100));
    const priceImprovement = Math.round(jitter(0.28, 0.5) * 100) / 100;
    const avgTradeSize = Math.round(jitter(350, 0.4));
    const blockTradeCount = Math.round(jitter(120, 0.5));

    return {
      ticker: s.ticker,
      darkVolume,
      totalVolume,
      darkPct,
      priceImprovement: Math.max(0.01, priceImprovement),
      avgTradeSize,
      blockTradeCount,
    };
  });

  // --- Block Trades Summary ---
  const totalBlockTrades = symbols.reduce((a, s) => a + s.blockTradeCount, 0);
  const avgBlockSize = Math.round(jitter(18500, 0.2));
  const largestBlockIdx = Math.floor(rng() * symbols.length);
  const largestBlockSize = Math.round(jitter(450000, 0.3));
  const totalBlockVolume = totalBlockTrades * avgBlockSize;
  const blockPctOfDark = Math.round((totalBlockVolume / Math.max(1, totalDarkVolumeShares)) * 10000) / 100;

  const blockTrades = {
    totalBlockTrades,
    avgBlockSize,
    largestBlock: {
      ticker: symbols[largestBlockIdx].ticker,
      size: largestBlockSize,
    },
    blockPctOfDarkVolume: Math.min(30, blockPctOfDark),
  };

  // --- Time Distribution ---
  const timeDistribution: TimeBucket[] = TIME_SLOTS.map((slot, i) => {
    const weight = jitter(TIME_WEIGHTS[i], 0.1);
    const volumeShares = Math.round(totalDarkVolumeShares * weight);
    const avgTradeSize = Math.round(jitter(320, 0.25));
    return {
      timeSlot: slot,
      volumeShares,
      pctOfDaily: 0,
      avgTradeSize,
    };
  });

  // Normalize time pct to 100%
  const timeTotal = timeDistribution.reduce((a, t) => a + t.volumeShares, 0);
  for (const t of timeDistribution) {
    t.pctOfDaily = Math.round((t.volumeShares / timeTotal) * 10000) / 100;
  }

  // --- Summary ---
  const darkPoolPctOfMarket = Math.round(jitter(40, 0.05) * 100) / 100;
  const totalMarketVolume = Math.round(totalDarkVolumeShares / (darkPoolPctOfMarket / 100));
  const avgPriceImprovement = Math.round(
    (venues.reduce((a, v) => a + v.priceImprovement * v.volumeShares, 0) / Math.max(1, totalDarkVolumeShares)) * 100
  ) / 100;
  const largestATSByVolume = [...venues].sort((a, b) => b.volumeShares - a.volumeShares)[0];

  const summary = {
    totalDarkPoolVolume: totalDarkVolumeShares,
    darkPoolPctOfMarket,
    totalATSCount: venues.length,
    avgPriceImprovement,
    largestATS: {
      name: largestATSByVolume.name,
      volumeShares: largestATSByVolume.volumeShares,
      marketShare: largestATSByVolume.marketShare,
    },
    totalMarketVolume,
  };

  return {
    summary,
    venues,
    symbols,
    blockTrades,
    timeDistribution,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[DarkPool] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate dark pool data' });
  }
});

export default router;
