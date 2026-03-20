import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface PairConfig {
  name: string;
  symbolA: string;
  symbolB: string;
  expectedRelation: 'inverse' | 'positive';
  signalTemplate: { divergent: string; aligned: string };
}

interface PairResult {
  name: string;
  symbolA: string;
  symbolB: string;
  expectedRelation: 'inverse' | 'positive';
  correlation20d: number;
  correlation60d: number;
  returnA_5d: number;
  returnB_5d: number;
  divergent: boolean;
  divergenceScore: number;
  signal: string;
  priceA: number;
  priceB: number;
  changeA: number;
  changeB: number;
  historyA: number[];
  historyB: number[];
}

interface IntermarketResponse {
  timestamp: string;
  pairs: PairResult[];
  summary: {
    divergenceCount: number;
    riskLevel: 'low' | 'elevated' | 'high';
    dominantTheme: string;
  };
}

// ── Pair definitions ──

const PAIRS: PairConfig[] = [
  {
    name: 'S&P 500 vs VIX',
    symbolA: '^GSPC',
    symbolB: '^VIX',
    expectedRelation: 'inverse',
    signalTemplate: {
      divergent: 'VIX moving with S&P 500 — unusual complacency or hedging activity',
      aligned: 'Normal inverse relationship — VIX drops as equities rise',
    },
  },
  {
    name: 'S&P 500 vs 10Y Yield',
    symbolA: '^GSPC',
    symbolB: '^TNX',
    expectedRelation: 'positive',
    signalTemplate: {
      divergent: 'Stocks and yields diverging — rates may be hurting growth outlook',
      aligned: 'Growth-driven moves — stocks and yields moving together',
    },
  },
  {
    name: 'Gold vs USD (DXY)',
    symbolA: 'GC=F',
    symbolB: 'DX-Y.NYB',
    expectedRelation: 'inverse',
    signalTemplate: {
      divergent: 'Gold and dollar moving together — flight-to-safety or inflation hedge',
      aligned: 'Normal inverse — dollar strength weighing on gold',
    },
  },
  {
    name: 'Oil vs Energy (XLE)',
    symbolA: 'CL=F',
    symbolB: 'XLE',
    expectedRelation: 'positive',
    signalTemplate: {
      divergent: 'Oil and energy stocks diverging — equity market sentiment overriding fundamentals',
      aligned: 'Normal correlation — energy stocks tracking oil prices',
    },
  },
  {
    name: 'S&P 500 vs High Yield (HYG)',
    symbolA: '^GSPC',
    symbolB: 'HYG',
    expectedRelation: 'positive',
    signalTemplate: {
      divergent: 'Stocks and credit diverging — credit stress signal',
      aligned: 'Risk appetite intact — stocks and high yield moving together',
    },
  },
  {
    name: 'Copper vs Industrials (XLI)',
    symbolA: 'HG=F',
    symbolB: 'XLI',
    expectedRelation: 'positive',
    signalTemplate: {
      divergent: 'Copper and industrials diverging — mixed economic growth signals',
      aligned: 'Economic growth consistent — copper and industrials aligned',
    },
  },
  {
    name: 'USD (DXY) vs EM (EEM)',
    symbolA: 'DX-Y.NYB',
    symbolB: 'EEM',
    expectedRelation: 'inverse',
    signalTemplate: {
      divergent: 'Dollar and EM equities moving together — unusual flow dynamics',
      aligned: 'Normal inverse — strong dollar pressuring EM assets',
    },
  },
  {
    name: 'Bonds (TLT) vs Stocks (SPY)',
    symbolA: 'TLT',
    symbolB: 'SPY',
    expectedRelation: 'inverse',
    signalTemplate: {
      divergent: 'Bonds and stocks moving together — risk-on/risk-off breakdown',
      aligned: 'Normal rotation — classic flight to safety pattern',
    },
  },
  {
    name: 'Tech (QQQ) vs Small Caps (IWM)',
    symbolA: 'QQQ',
    symbolB: 'IWM',
    expectedRelation: 'positive',
    signalTemplate: {
      divergent: 'Growth/value rotation in progress — tech and small caps diverging',
      aligned: 'Broad risk appetite — tech and small caps rising together',
    },
  },
  {
    name: 'Bitcoin vs Nasdaq',
    symbolA: 'BTC-USD',
    symbolB: '^IXIC',
    expectedRelation: 'positive',
    signalTemplate: {
      divergent: 'Bitcoin and Nasdaq diverging — crypto-specific catalyst or risk appetite shift',
      aligned: 'Risk appetite correlated — crypto and tech in sync',
    },
  },
];

// ── Collect unique symbols ──

const ALL_SYMBOLS = Array.from(
  new Set(PAIRS.flatMap((p) => [p.symbolA, p.symbolB])),
);

// ── Cache (5-minute TTL) ──

let cache: { data: IntermarketResponse; expiresAt: number } | null = null;
const CACHE_TTL = 12 * 60 * 60_000;

// ── Math helpers ──

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }

  const denom = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function dailyReturns(closes: number[]): number[] {
  const ret: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] !== 0) {
      ret.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    } else {
      ret.push(0);
    }
  }
  return ret;
}

function periodReturn(closes: number[], days: number): number {
  if (closes.length < days + 1) return 0;
  const recent = closes[closes.length - 1];
  const prior = closes[closes.length - 1 - days];
  if (prior === 0) return 0;
  return ((recent - prior) / prior) * 100;
}

function rollingCorrelation(
  returnsA: number[],
  returnsB: number[],
  window: number,
): number {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n < window) return pearsonCorrelation(returnsA.slice(-n), returnsB.slice(-n));
  return pearsonCorrelation(
    returnsA.slice(n - window),
    returnsB.slice(n - window),
  );
}

function scoreDivergence(
  returnA: number,
  returnB: number,
  corr60d: number,
  expectedRelation: 'inverse' | 'positive',
): number {
  // Check if the 5d moves go in "wrong" direction relative to expected relation
  const sameDirection = (returnA > 0 && returnB > 0) || (returnA < 0 && returnB < 0);

  let isDiverging: boolean;
  if (expectedRelation === 'positive') {
    // Normally correlated — divergence when they move in opposite directions
    isDiverging = !sameDirection;
  } else {
    // Normally inverse — divergence when they move in the same direction
    isDiverging = sameDirection;
  }

  if (!isDiverging) return 0;

  // Score based on magnitude of moves and historical correlation strength
  const moveSize = (Math.abs(returnA) + Math.abs(returnB)) / 2;
  const corrStrength = Math.abs(corr60d);

  // Base score from move magnitude (0-5 points)
  let score = Math.min(moveSize / 2, 5);

  // Multiply by correlation strength — divergence is more significant when correlation is usually strong
  score *= Math.max(corrStrength, 0.3);

  // Bonus points for strong divergence
  if (moveSize > 4) score += 1;
  if (corrStrength > 0.7) score += 1;

  return Math.min(Math.round(score * 10) / 10, 10);
}

// ── Route handler ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch 60 days of daily history for all symbols in parallel
    const historyMap = new Map<string, number[]>();
    const histResults = await Promise.allSettled(
      ALL_SYMBOLS.map(async (sym) => {
        const bars = await getHistory(sym, { range: '3mo', interval: '1d' });
        const closes = bars
          .filter((b: { close: number | null }) => b.close != null)
          .map((b: { close: number | null }) => b.close as number);
        // Keep last 60 trading days
        return { symbol: sym, closes: closes.slice(-60) };
      }),
    );

    for (const r of histResults) {
      if (r.status === 'fulfilled') {
        historyMap.set(r.value.symbol, r.value.closes);
      }
    }

    // Fetch current quotes for prices/changes
    const quotes = await getQuotes(ALL_SYMBOLS);
    const quoteMap = new Map<string, { price: number; changePct: number }>();
    for (const q of quotes) {
      quoteMap.set(q.symbol, {
        price: q.price ?? 0,
        changePct: q.changePercent ?? 0,
      });
    }

    // Build pair analysis
    const pairs: PairResult[] = [];

    for (const pair of PAIRS) {
      const closesA = historyMap.get(pair.symbolA) ?? [];
      const closesB = historyMap.get(pair.symbolB) ?? [];
      const quoteA = quoteMap.get(pair.symbolA) ?? { price: 0, changePct: 0 };
      const quoteB = quoteMap.get(pair.symbolB) ?? { price: 0, changePct: 0 };

      const retA = dailyReturns(closesA);
      const retB = dailyReturns(closesB);

      const corr20d = rollingCorrelation(retA, retB, 20);
      const corr60d = pearsonCorrelation(retA, retB);

      const returnA5d = periodReturn(closesA, 5);
      const returnB5d = periodReturn(closesB, 5);

      const divScore = scoreDivergence(
        returnA5d,
        returnB5d,
        corr60d,
        pair.expectedRelation,
      );

      const isDivergent = divScore >= 2;

      // Last 20 closes normalized to 100 for mini chart
      const normA = normalizeToBase(closesA.slice(-20));
      const normB = normalizeToBase(closesB.slice(-20));

      pairs.push({
        name: pair.name,
        symbolA: pair.symbolA,
        symbolB: pair.symbolB,
        expectedRelation: pair.expectedRelation,
        correlation20d: round2(corr20d),
        correlation60d: round2(corr60d),
        returnA_5d: round2(returnA5d),
        returnB_5d: round2(returnB5d),
        divergent: isDivergent,
        divergenceScore: divScore,
        signal: isDivergent
          ? pair.signalTemplate.divergent
          : pair.signalTemplate.aligned,
        priceA: quoteA.price,
        priceB: quoteB.price,
        changeA: round2(quoteA.changePct),
        changeB: round2(quoteB.changePct),
        historyA: normA,
        historyB: normB,
      });
    }

    // Sort by divergence score descending
    pairs.sort((a, b) => b.divergenceScore - a.divergenceScore);

    const divergenceCount = pairs.filter((p) => p.divergent).length;

    const riskLevel: 'low' | 'elevated' | 'high' =
      divergenceCount >= 5
        ? 'high'
        : divergenceCount >= 2
          ? 'elevated'
          : 'low';

    const dominantTheme = deriveDominantTheme(pairs);

    const response: IntermarketResponse = {
      timestamp: new Date().toISOString(),
      pairs,
      summary: {
        divergenceCount,
        riskLevel,
        dominantTheme,
      },
    };

    cache = { data: response, expiresAt: now + CACHE_TTL };
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Intermarket] Error:', message);
    if (cache) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to compute intermarket divergences' });
  }
});

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeToBase(closes: number[]): number[] {
  if (closes.length === 0) return [];
  const base = closes[0];
  if (base === 0) return closes.map(() => 100);
  return closes.map((c) => round2((c / base) * 100));
}

function deriveDominantTheme(pairs: PairResult[]): string {
  const divergent = pairs.filter((p) => p.divergent);
  if (divergent.length === 0) {
    return 'Markets aligned — no significant intermarket divergences detected';
  }

  // Check for risk themes
  const hasStockBondDiv = divergent.some((p) => p.name.includes('Bonds') && p.name.includes('Stocks'));
  const hasCreditDiv = divergent.some((p) => p.name.includes('High Yield'));
  const hasVixDiv = divergent.some((p) => p.name.includes('VIX'));
  const hasGrowthDiv = divergent.some((p) => p.name.includes('Tech') || p.name.includes('Bitcoin'));
  const hasFxDiv = divergent.some((p) => p.name.includes('USD') || p.name.includes('DXY'));

  if (hasStockBondDiv && hasCreditDiv) {
    return 'Risk correlation breakdown — bonds, credit, and equities sending mixed signals';
  }
  if (hasVixDiv && hasStockBondDiv) {
    return 'Risk appetite divergence — volatility and cross-asset signals conflicting';
  }
  if (hasGrowthDiv && hasFxDiv) {
    return 'Growth rotation with FX dislocation — sector and currency signals diverging';
  }
  if (hasCreditDiv) {
    return 'Credit stress emerging — high yield diverging from equities';
  }
  if (hasVixDiv) {
    return 'Volatility anomaly — VIX behavior inconsistent with equity moves';
  }
  if (hasGrowthDiv) {
    return 'Growth/value rotation underway — risk appetite unevenly distributed';
  }

  return `${divergent.length} intermarket divergences detected — cross-asset signals conflicting`;
}

export default router;
