import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// In-memory cache (10 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10 * 60_000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data as T);
  return fn().then((data) => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

const SECTOR_ETFS = [
  'XLK', 'XLF', 'XLV', 'XLY', 'XLP', 'XLE',
  'XLI', 'XLB', 'XLRE', 'XLC', 'XLU',
] as const;

const ALL_SYMBOLS = [...SECTOR_ETFS, 'SPY'] as const;

const SECTOR_NAMES: Record<string, string> = {
  XLK: 'Technology',
  XLF: 'Financials',
  XLV: 'Healthcare',
  XLY: 'Consumer Discretionary',
  XLP: 'Consumer Staples',
  XLE: 'Energy',
  XLI: 'Industrials',
  XLB: 'Materials',
  XLRE: 'Real Estate',
  XLC: 'Communication Services',
  XLU: 'Utilities',
  SPY: 'S&P 500',
};

type PeriodKey = '1d' | '1w' | '1m' | '3m' | '6m' | 'ytd' | '1y';

interface HistoryEntry {
  date: string | number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

/**
 * Calculate period returns from daily history data.
 * History is expected to be ~1 year of daily bars sorted chronologically.
 */
function calculateReturns(
  history: HistoryEntry[],
): Record<PeriodKey, number | null> {
  const valid = history.filter((h) => h.close != null && typeof h.date === 'string');
  if (valid.length < 2) {
    return { '1d': null, '1w': null, '1m': null, '3m': null, '6m': null, ytd: null, '1y': null };
  }

  const last = valid[valid.length - 1];
  const lastClose = last.close!;
  const lastDate = new Date(last.date as string);

  function returnFromDaysAgo(days: number): number | null {
    const target = new Date(lastDate);
    target.setDate(target.getDate() - days);
    const targetStr = target.toISOString().slice(0, 10);
    // Find closest bar on or before target date
    let best: HistoryEntry | null = null;
    for (const bar of valid) {
      if ((bar.date as string) <= targetStr) {
        best = bar;
      }
    }
    if (!best || best.close == null || best.close === 0) return null;
    return ((lastClose - best.close) / best.close) * 100;
  }

  // YTD: first trading day of current year
  const year = lastDate.getFullYear();
  const ytdTarget = `${year}-01-01`;
  let ytdBar: HistoryEntry | null = null;
  for (const bar of valid) {
    if ((bar.date as string) >= ytdTarget) {
      ytdBar = bar;
      break;
    }
  }
  const ytdReturn =
    ytdBar && ytdBar.close != null && ytdBar.close !== 0
      ? ((lastClose - ytdBar.close) / ytdBar.close) * 100
      : null;

  return {
    '1d': valid.length >= 2
      ? ((lastClose - valid[valid.length - 2].close!) / valid[valid.length - 2].close!) * 100
      : null,
    '1w': returnFromDaysAgo(7),
    '1m': returnFromDaysAgo(30),
    '3m': returnFromDaysAgo(90),
    '6m': returnFromDaysAgo(180),
    ytd: ytdReturn,
    '1y': valid.length >= 2 && valid[0].close != null && valid[0].close !== 0
      ? ((lastClose - valid[0].close) / valid[0].close) * 100
      : null,
  };
}

function roundReturns(
  returns: Record<PeriodKey, number | null>,
): Record<PeriodKey, number | null> {
  const result = {} as Record<PeriodKey, number | null>;
  for (const key of Object.keys(returns) as PeriodKey[]) {
    const v = returns[key];
    result[key] = v != null ? Math.round(v * 100) / 100 : null;
  }
  return result;
}

function subtractReturns(
  sector: Record<PeriodKey, number | null>,
  benchmark: Record<PeriodKey, number | null>,
): Record<PeriodKey, number | null> {
  const result = {} as Record<PeriodKey, number | null>;
  for (const key of Object.keys(sector) as PeriodKey[]) {
    const s = sector[key];
    const b = benchmark[key];
    result[key] = s != null && b != null ? Math.round((s - b) * 100) / 100 : null;
  }
  return result;
}

// GET /api/sector-performance
router.get('/', async (_req, res) => {
  try {
    const data = await cached('sector-performance', async () => {
      // Fetch quotes and 1-year history for all symbols in parallel
      const [quotes, ...histories] = await Promise.all([
        getQuotes([...ALL_SYMBOLS]),
        ...ALL_SYMBOLS.map((symbol) => getHistory(symbol, { range: '1y', interval: '1d' })),
      ]);

      const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

      // Calculate returns for all symbols
      const returnsMap = new Map<string, Record<PeriodKey, number | null>>();
      ALL_SYMBOLS.forEach((symbol, i) => {
        returnsMap.set(symbol, calculateReturns(histories[i]));
      });

      const spyReturns = returnsMap.get('SPY') ?? {
        '1d': null, '1w': null, '1m': null, '3m': null, '6m': null, ytd: null, '1y': null,
      };

      const sectors = SECTOR_ETFS.map((symbol) => {
        const quote = quoteMap.get(symbol);
        const returns = returnsMap.get(symbol) ?? {
          '1d': null, '1w': null, '1m': null, '3m': null, '6m': null, ytd: null, '1y': null,
        };

        return {
          symbol,
          name: SECTOR_NAMES[symbol] || symbol,
          price: quote?.price ?? null,
          returns: roundReturns(returns),
          relativeToSpy: subtractReturns(returns, spyReturns),
        };
      });

      const spyQuote = quoteMap.get('SPY');
      const spy = {
        symbol: 'SPY',
        name: 'S&P 500',
        price: spyQuote?.price ?? null,
        returns: roundReturns(spyReturns),
        relativeToSpy: {
          '1d': 0, '1w': 0, '1m': 0, '3m': 0, '6m': 0, ytd: 0, '1y': 0,
        } as Record<PeriodKey, number | null>,
      };

      return {
        sectors,
        spy,
        updatedAt: new Date().toISOString(),
      };
    });

    res.json(data);
  } catch (err) {
    console.error('[SectorPerformance] Error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch sector performance data' });
  }
});

export default router;
