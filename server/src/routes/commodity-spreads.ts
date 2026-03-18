import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface SpreadLeg {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

interface SpreadEntry {
  name: string;
  category: 'energy' | 'agriculture' | 'metals';
  longLeg: SpreadLeg;
  shortLeg: SpreadLeg;
  currentSpread: number;
  spreadType: 'ratio' | 'absolute';
  avg20d: number;
  avg60d: number;
  zScore: number;
  percentile: number;
  direction: 'widening' | 'narrowing' | 'stable';
  signal: 'cheap' | 'fair' | 'expensive';
  description: string;
  history: number[];
}

interface CommoditySpreadsResponse {
  timestamp: string;
  spreads: SpreadEntry[];
  summary: {
    energySentiment: string;
    metalsSentiment: string;
    agSentiment: string;
  };
}

// ── Spread Definitions ──

interface SpreadDef {
  name: string;
  category: 'energy' | 'agriculture' | 'metals';
  longSymbol: string;
  longName: string;
  shortSymbol: string;
  shortName: string;
  spreadType: 'ratio' | 'absolute';
  description: string;
}

const SPREAD_DEFS: SpreadDef[] = [
  {
    name: 'Crack Spread',
    category: 'energy',
    longSymbol: 'UGA',
    longName: 'United States Gasoline Fund',
    shortSymbol: 'USO',
    shortName: 'United States Oil Fund',
    spreadType: 'ratio',
    description: 'Refining margin: gasoline vs crude oil. Widening = higher refining profits.',
  },
  {
    name: 'Gold/Silver Ratio',
    category: 'metals',
    longSymbol: 'GLD',
    longName: 'SPDR Gold Shares',
    shortSymbol: 'SLV',
    shortName: 'iShares Silver Trust',
    spreadType: 'ratio',
    description: 'Gold relative to silver. High ratio = risk aversion; low = industrial optimism.',
  },
  {
    name: 'Oil/Gas Ratio',
    category: 'energy',
    longSymbol: 'CL=F',
    longName: 'Crude Oil Futures',
    shortSymbol: 'NG=F',
    shortName: 'Natural Gas Futures',
    spreadType: 'ratio',
    description: 'Energy substitution ratio. High = gas cheap vs oil; mean-reverts historically.',
  },
  {
    name: 'Copper/Gold Ratio',
    category: 'metals',
    longSymbol: 'HG=F',
    longName: 'Copper Futures',
    shortSymbol: 'GC=F',
    shortName: 'Gold Futures',
    spreadType: 'ratio',
    description: 'Economic sentiment gauge. Rising = growth optimism; falling = risk aversion.',
  },
  {
    name: 'Platinum/Gold Spread',
    category: 'metals',
    longSymbol: 'PL=F',
    longName: 'Platinum Futures',
    shortSymbol: 'GC=F',
    shortName: 'Gold Futures',
    spreadType: 'ratio',
    description: 'Auto industry demand proxy. Rising = industrial demand; falling = safe haven bid.',
  },
  {
    name: 'Wheat/Corn Ratio',
    category: 'agriculture',
    longSymbol: 'ZW=F',
    longName: 'Wheat Futures',
    shortSymbol: 'ZC=F',
    shortName: 'Corn Futures',
    spreadType: 'ratio',
    description: 'Feed grain substitution. High = wheat premium; low = corn premium.',
  },
  {
    name: 'Crush Spread',
    category: 'agriculture',
    longSymbol: 'ZL=F',
    longName: 'Soybean Oil Futures',
    shortSymbol: 'ZS=F',
    shortName: 'Soybean Futures',
    spreadType: 'ratio',
    description: 'Soybean processing margin. Oil vs beans ratio signals crush profitability.',
  },
];

// Collect unique symbols for fetching
const ALL_SYMBOLS = Array.from(
  new Set(SPREAD_DEFS.flatMap((d) => [d.longSymbol, d.shortSymbol])),
);

// ── Cache ──

let cache: { data: CommoditySpreadsResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Helpers ──

function computeSpreadHistory(
  longHistory: { date: string; close: number | null }[],
  shortHistory: { date: string; close: number | null }[],
  spreadType: 'ratio' | 'absolute',
): number[] {
  const shortMap = new Map<string, number>();
  for (const d of shortHistory) {
    if (d.close != null) shortMap.set(d.date, d.close);
  }

  const values: number[] = [];
  for (const n of longHistory) {
    if (n.close == null) continue;
    const dVal = shortMap.get(n.date);
    if (dVal == null || dVal === 0) continue;
    if (spreadType === 'ratio') {
      values.push(Math.round((n.close / dVal) * 10000) / 10000);
    } else {
      values.push(Math.round((n.close - dVal) * 100) / 100);
    }
  }

  // Keep last 60 values
  return values.slice(-60);
}

function computeStats(history: number[]): {
  avg20d: number;
  avg60d: number;
  zScore: number;
  percentile: number;
  direction: 'widening' | 'narrowing' | 'stable';
  signal: 'cheap' | 'fair' | 'expensive';
} {
  if (history.length < 2) {
    return { avg20d: 0, avg60d: 0, zScore: 0, percentile: 50, direction: 'stable', signal: 'fair' };
  }

  const current = history[history.length - 1];

  // 20-day average
  const last20 = history.slice(-20);
  const avg20d = last20.reduce((s, v) => s + v, 0) / last20.length;

  // 60-day average
  const avg60d = history.reduce((s, v) => s + v, 0) / history.length;

  // Standard deviation of 60-day window
  const variance = history.reduce((s, v) => s + (v - avg60d) ** 2, 0) / history.length;
  const stdDev = Math.sqrt(variance) || 0.0001;

  // Z-score
  const zScore = Math.round(((current - avg60d) / stdDev) * 100) / 100;

  // Percentile (rank in 60-day range)
  const sorted = [...history].sort((a, b) => a - b);
  const rank = sorted.filter((v) => v <= current).length;
  const percentile = Math.round((rank / sorted.length) * 100);

  // Direction: compare last 5 days average to previous 5 days
  const recent5 = history.slice(-5);
  const prev5 = history.slice(-10, -5);
  const avgRecent = recent5.reduce((s, v) => s + v, 0) / (recent5.length || 1);
  const avgPrev = prev5.length > 0 ? prev5.reduce((s, v) => s + v, 0) / prev5.length : avgRecent;
  const dirDiff = avgRecent - avgPrev;
  const threshold = stdDev * 0.2;

  let direction: 'widening' | 'narrowing' | 'stable';
  if (Math.abs(dirDiff) < threshold) {
    direction = 'stable';
  } else if (dirDiff > 0) {
    direction = 'widening';
  } else {
    direction = 'narrowing';
  }

  // Signal based on z-score
  let signal: 'cheap' | 'fair' | 'expensive';
  if (zScore <= -1) {
    signal = 'cheap';
  } else if (zScore >= 1) {
    signal = 'expensive';
  } else {
    signal = 'fair';
  }

  return {
    avg20d: Math.round(avg20d * 10000) / 10000,
    avg60d: Math.round(avg60d * 10000) / 10000,
    zScore,
    percentile,
    direction,
    signal,
  };
}

function deriveSentiment(
  spreads: SpreadEntry[],
  category: 'energy' | 'metals' | 'agriculture',
): string {
  const catSpreads = spreads.filter((s) => s.category === category);
  if (catSpreads.length === 0) return 'No data';

  let score = 0;
  for (const s of catSpreads) {
    if (s.signal === 'expensive') score += 1;
    if (s.signal === 'cheap') score -= 1;
    if (s.direction === 'widening') score += 0.5;
    if (s.direction === 'narrowing') score -= 0.5;
  }

  const avg = score / catSpreads.length;
  if (avg >= 0.5) return 'Elevated - spreads above average';
  if (avg <= -0.5) return 'Compressed - spreads below average';
  return 'Neutral - spreads near average';
}

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch quotes and 60-day history for all symbols in parallel
    const [quotes, ...histories] = await Promise.all([
      getQuotes(ALL_SYMBOLS),
      ...ALL_SYMBOLS.map((s) => getHistory(s, { range: '3mo', interval: '1d' })),
    ]);

    // Build maps
    const quoteMap = new Map<string, any>();
    for (const q of quotes) {
      if (q) quoteMap.set(q.symbol, q);
    }

    const historyMap = new Map<string, { date: string; close: number | null }[]>();
    ALL_SYMBOLS.forEach((sym, i) => {
      historyMap.set(
        sym,
        ((histories[i] as any[]) || []).map((h: any) => ({
          date: typeof h.date === 'string' ? h.date : String(h.date),
          close: h.close,
        })),
      );
    });

    // Compute spreads
    const spreads: SpreadEntry[] = [];

    for (const def of SPREAD_DEFS) {
      const longQuote = quoteMap.get(def.longSymbol);
      const shortQuote = quoteMap.get(def.shortSymbol);

      const longPrice = longQuote?.price ?? 0;
      const shortPrice = shortQuote?.price ?? 0;

      const longHistory = historyMap.get(def.longSymbol) || [];
      const shortHistory = historyMap.get(def.shortSymbol) || [];

      const history = computeSpreadHistory(longHistory, shortHistory, def.spreadType);

      const currentSpread =
        def.spreadType === 'ratio'
          ? shortPrice !== 0
            ? Math.round((longPrice / shortPrice) * 10000) / 10000
            : 0
          : Math.round((longPrice - shortPrice) * 100) / 100;

      const stats = computeStats(history);

      spreads.push({
        name: def.name,
        category: def.category,
        longLeg: {
          symbol: def.longSymbol,
          name: longQuote?.name || def.longName,
          price: longPrice,
          changePct: longQuote?.changePercent ?? 0,
        },
        shortLeg: {
          symbol: def.shortSymbol,
          name: shortQuote?.name || def.shortName,
          price: shortPrice,
          changePct: shortQuote?.changePercent ?? 0,
        },
        currentSpread,
        spreadType: def.spreadType,
        avg20d: stats.avg20d,
        avg60d: stats.avg60d,
        zScore: stats.zScore,
        percentile: stats.percentile,
        direction: stats.direction,
        signal: stats.signal,
        description: def.description,
        history,
      });
    }

    const result: CommoditySpreadsResponse = {
      timestamp: new Date().toISOString(),
      spreads,
      summary: {
        energySentiment: deriveSentiment(spreads, 'energy'),
        metalsSentiment: deriveSentiment(spreads, 'metals'),
        agSentiment: deriveSentiment(spreads, 'agriculture'),
      },
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: any) {
    console.error('[CommoditySpreads] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch commodity spread data' });
  }
});

export default router;
