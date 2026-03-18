import { Router } from 'express';
import { ensureCrumb, getQuotes } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ~80 popular dividend-paying stocks
const DIVIDEND_UNIVERSE = [
  // Dividend Aristocrats
  'JNJ', 'PG', 'KO', 'PEP', 'MCD', 'WMT', 'MMM', 'ABT', 'T', 'VZ',
  'XOM', 'CVX', 'IBM',
  // High Yield REITs
  'O', 'STOR', 'NNN', 'MPW', 'STAG',
  // Dividend Kings
  'ED', 'CL', 'LOW', 'SWK', 'EMR', 'GPC', 'DOV', 'PH', 'ITW', 'BDX',
  // Tech Dividends
  'AAPL', 'MSFT', 'AVGO', 'TXN', 'INTC', 'CSCO', 'QCOM',
  // Financial
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'SCHW',
  // ETFs with dividends
  'VYM', 'SCHD', 'DVY', 'HDV', 'SPHD', 'SDY', 'NOBL', 'DGRO',
];

const ARISTOCRATS = new Set([
  'JNJ', 'PG', 'KO', 'PEP', 'MCD', 'WMT', 'MMM', 'ABT', 'T', 'VZ',
  'XOM', 'CVX', 'IBM', 'ED', 'CL', 'LOW', 'SWK', 'EMR', 'GPC', 'DOV',
  'PH', 'ITW', 'BDX',
]);

const REITS = new Set(['O', 'STOR', 'NNN', 'MPW', 'STAG']);

const ETFS = new Set(['VYM', 'SCHD', 'DVY', 'HDV', 'SPHD', 'SDY', 'NOBL', 'DGRO']);

export interface DividendStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  dividendYield: number | null;
  annualDividend: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
  payoutRatio: number | null;
  fiveYearAvgYield: number | null;
  category: 'aristocrat' | 'reit' | 'etf' | 'other';
}

let dividendCache: DividendStock[] = [];
let dividendCacheTime = 0;
const DIVIDEND_TTL = 10 * 60_000; // 10 minutes

function epochToISO(epoch: number | undefined | null): string | null {
  if (!epoch) return null;
  try {
    return new Date(epoch * 1000).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function rawVal(obj: any): number | null {
  if (obj == null) return null;
  if (typeof obj === 'number') return obj;
  return obj?.raw ?? null;
}

async function fetchDividendData(symbol: string, auth: { crumb: string; cookie: string }): Promise<Partial<DividendStock> | null> {
  try {
    const modules = 'summaryDetail,calendarEvents';
    const url = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as any;
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const sd = result.summaryDetail || {};
    const ce = result.calendarEvents || {};

    const exDate = ce.exDividendDate?.raw ?? ce.exDividendDate?.fmt ?? null;
    const payDate = ce.dividendDate?.raw ?? ce.dividendDate?.fmt ?? null;

    return {
      dividendYield: rawVal(sd.dividendYield) != null
        ? (rawVal(sd.dividendYield)! * 100)
        : (rawVal(sd.trailingAnnualDividendYield) != null
          ? (rawVal(sd.trailingAnnualDividendYield)! * 100)
          : null),
      annualDividend: rawVal(sd.trailingAnnualDividendRate),
      exDividendDate: typeof exDate === 'number' ? epochToISO(exDate) : (exDate || null),
      paymentDate: typeof payDate === 'number' ? epochToISO(payDate) : (payDate || null),
      payoutRatio: rawVal(sd.payoutRatio) != null ? (rawVal(sd.payoutRatio)! * 100) : null,
      fiveYearAvgYield: rawVal(sd.fiveYearAvgDividendYield),
    };
  } catch (err) {
    console.error(`[Dividends] Error fetching quoteSummary for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function getCategory(symbol: string): 'aristocrat' | 'reit' | 'etf' | 'other' {
  if (ARISTOCRATS.has(symbol)) return 'aristocrat';
  if (REITS.has(symbol)) return 'reit';
  if (ETFS.has(symbol)) return 'etf';
  return 'other';
}

async function buildDividendData(): Promise<DividendStock[]> {
  const auth = await ensureCrumb();
  if (!auth) {
    console.error('[Dividends] Failed to get crumb, returning empty data');
    return [];
  }

  // Fetch basic quote data for all symbols (batch)
  const quotes = await getQuotes(DIVIDEND_UNIVERSE);
  const quoteMap = new Map<string, { name: string; price: number; changePercent: number }>();
  for (const q of quotes) {
    quoteMap.set(q.symbol, {
      name: q.name ?? q.symbol,
      price: q.price ?? 0,
      changePercent: q.changePercent ?? 0,
    });
  }

  // Fetch dividend data in batches of 5 with small delays
  const BATCH_SIZE = 5;
  const BATCH_DELAY = 300; // ms between batches
  const dividendMap = new Map<string, Partial<DividendStock>>();

  for (let i = 0; i < DIVIDEND_UNIVERSE.length; i += BATCH_SIZE) {
    const batch = DIVIDEND_UNIVERSE.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(symbol => fetchDividendData(symbol, auth))
    );

    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled' && result.value) {
        dividendMap.set(batch[j], result.value);
      }
    }

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < DIVIDEND_UNIVERSE.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  // Merge quote data with dividend data
  const stocks: DividendStock[] = DIVIDEND_UNIVERSE.map(symbol => {
    const quote = quoteMap.get(symbol);
    const dividend = dividendMap.get(symbol);

    return {
      symbol,
      name: quote?.name ?? symbol,
      price: quote?.price ?? 0,
      changePercent: quote?.changePercent ?? 0,
      dividendYield: dividend?.dividendYield ?? null,
      annualDividend: dividend?.annualDividend ?? null,
      exDividendDate: dividend?.exDividendDate ?? null,
      paymentDate: dividend?.paymentDate ?? null,
      payoutRatio: dividend?.payoutRatio ?? null,
      fiveYearAvgYield: dividend?.fiveYearAvgYield ?? null,
      category: getCategory(symbol),
    };
  });

  return stocks;
}

const router = Router();

// GET /api/dividends
router.get('/', async (_req, res) => {
  try {
    if (Date.now() - dividendCacheTime < DIVIDEND_TTL && dividendCache.length > 0) {
      return res.json(dividendCache);
    }

    const data = await buildDividendData();
    dividendCache = data;
    dividendCacheTime = Date.now();
    res.json(data);
  } catch (err: any) {
    console.error('[Dividends] Error fetching dividend data:', err?.message || err);
    // Return stale cache if available
    if (dividendCache.length > 0) return res.json(dividendCache);
    res.status(503).json({ error: 'Dividend data temporarily unavailable' });
  }
});

export default router;
