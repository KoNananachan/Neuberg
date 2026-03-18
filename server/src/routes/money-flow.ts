import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// In-memory cache (10 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10 * 60_000;
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data as T);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

// ETF definitions with names and categories
interface EtfDef {
  symbol: string;
  name: string;
  category: 'index' | 'sector' | 'fixed_income' | 'commodity' | 'international';
}

const ETFS: EtfDef[] = [
  // Major indices
  { symbol: 'SPY', name: 'S&P 500', category: 'index' },
  { symbol: 'QQQ', name: 'Nasdaq 100', category: 'index' },
  { symbol: 'IWM', name: 'Small Caps', category: 'index' },
  { symbol: 'DIA', name: 'Dow Jones', category: 'index' },
  // Sectors
  { symbol: 'XLF', name: 'Financials', category: 'sector' },
  { symbol: 'XLK', name: 'Technology', category: 'sector' },
  { symbol: 'XLE', name: 'Energy', category: 'sector' },
  { symbol: 'XLV', name: 'Healthcare', category: 'sector' },
  { symbol: 'XLI', name: 'Industrials', category: 'sector' },
  { symbol: 'XLU', name: 'Utilities', category: 'sector' },
  { symbol: 'XLP', name: 'Consumer Staples', category: 'sector' },
  { symbol: 'XLY', name: 'Consumer Disc.', category: 'sector' },
  { symbol: 'XLC', name: 'Communication', category: 'sector' },
  { symbol: 'XLRE', name: 'Real Estate', category: 'sector' },
  { symbol: 'XLB', name: 'Materials', category: 'sector' },
  // Fixed income
  { symbol: 'TLT', name: 'Long Bonds 20Y+', category: 'fixed_income' },
  { symbol: 'HYG', name: 'High Yield Corp', category: 'fixed_income' },
  { symbol: 'LQD', name: 'Inv. Grade Corp', category: 'fixed_income' },
  // Commodities
  { symbol: 'GLD', name: 'Gold', category: 'commodity' },
  { symbol: 'SLV', name: 'Silver', category: 'commodity' },
  { symbol: 'USO', name: 'Crude Oil', category: 'commodity' },
  // International
  { symbol: 'EEM', name: 'Emerging Markets', category: 'international' },
  { symbol: 'EFA', name: 'Developed Intl', category: 'international' },
];

const ALL_SYMBOLS = ETFS.map(e => e.symbol);

interface HistoryBar {
  date: string | number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

/**
 * Calculate Money Flow Index (MFI) over a given period.
 * MFI = 100 - (100 / (1 + MoneyFlowRatio))
 * where MoneyFlowRatio = sum(positive raw money flow) / sum(negative raw money flow)
 */
function calculateMFI(bars: HistoryBar[], period = 14): number | null {
  // Need at least period + 1 valid bars to compute
  const valid = bars.filter(b => b.high != null && b.low != null && b.close != null && b.volume != null);
  if (valid.length < period + 1) return null;

  // Use the last (period + 1) bars
  const slice = valid.slice(-(period + 1));

  let positiveFlow = 0;
  let negativeFlow = 0;

  for (let i = 1; i < slice.length; i++) {
    const tp = (slice[i].high! + slice[i].low! + slice[i].close!) / 3;
    const prevTp = (slice[i - 1].high! + slice[i - 1].low! + slice[i - 1].close!) / 3;
    const rawFlow = tp * slice[i].volume!;

    if (tp > prevTp) {
      positiveFlow += rawFlow;
    } else if (tp < prevTp) {
      negativeFlow += rawFlow;
    }
    // If tp === prevTp, it is ignored (neither positive nor negative)
  }

  if (negativeFlow === 0) return 100;
  if (positiveFlow === 0) return 0;

  const ratio = positiveFlow / negativeFlow;
  return Math.round((100 - (100 / (1 + ratio))) * 10) / 10;
}

/**
 * Calculate net flow over last N trading days.
 * Positive day (close > prev close) = +volume * close
 * Negative day = -volume * close
 */
function calculateNetFlow(bars: HistoryBar[], days: number): number | null {
  const valid = bars.filter(b => b.close != null && b.volume != null);
  if (valid.length < days + 1) return null;

  const slice = valid.slice(-(days + 1));
  let netFlow = 0;

  for (let i = 1; i < slice.length; i++) {
    const direction = slice[i].close! >= slice[i - 1].close! ? 1 : -1;
    netFlow += direction * slice[i].volume! * slice[i].close!;
  }

  return Math.round(netFlow);
}

/**
 * Calculate average daily volume over available bars.
 */
function calculateAvgVolume(bars: HistoryBar[]): number | null {
  const volumes = bars.filter(b => b.volume != null).map(b => b.volume!);
  if (volumes.length === 0) return null;
  return Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length);
}

/**
 * Determine signal based on MFI and net flow.
 */
function determineSignal(mfi: number | null, netFlow5d: number | null): 'inflow' | 'outflow' | 'neutral' {
  if (mfi == null || netFlow5d == null) return 'neutral';
  if (netFlow5d > 0 && mfi > 45) return 'inflow';
  if (netFlow5d < 0 && mfi < 55) return 'outflow';
  if (netFlow5d > 0) return 'inflow';
  if (netFlow5d < 0) return 'outflow';
  return 'neutral';
}

// GET /api/money-flow
router.get('/', async (_req, res) => {
  try {
    const result = await cached('money-flow', async () => {
      // Fetch quotes and 30-day histories in parallel
      const [quotes, ...histories] = await Promise.all([
        getQuotes(ALL_SYMBOLS),
        ...ALL_SYMBOLS.map(symbol => getHistory(symbol, { range: '1mo', interval: '1d' })),
      ]);

      const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

      const flows = ETFS.map((etf, i) => {
        const quote = quoteMap.get(etf.symbol);
        const history = histories[i] as HistoryBar[];

        const mfi = calculateMFI(history, 14);
        const netFlow5d = calculateNetFlow(history, 5);
        const netFlow1d = calculateNetFlow(history, 1);
        const avgVolume = calculateAvgVolume(history);

        // Volume ratio = latest volume / average volume
        const latestVolume = quote?.volume ?? null;
        const volumeRatio = latestVolume != null && avgVolume != null && avgVolume > 0
          ? Math.round((latestVolume / avgVolume) * 100) / 100
          : null;

        const signal = determineSignal(mfi, netFlow5d);

        return {
          symbol: etf.symbol,
          name: etf.name,
          category: etf.category,
          price: quote?.price ?? 0,
          change: quote?.changePercent ?? 0,
          mfi: mfi ?? 50,
          netFlow5d: netFlow5d ?? 0,
          netFlow1d: netFlow1d ?? 0,
          avgVolume: avgVolume ?? 0,
          volumeRatio: volumeRatio ?? 1,
          signal,
        };
      });

      return {
        flows,
        updatedAt: new Date().toISOString(),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[MoneyFlow] Error fetching money flow:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch money flow data' });
  }
});

export default router;
