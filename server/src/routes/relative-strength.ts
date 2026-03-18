import { Router } from 'express';
import { getHistory, getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

interface RSResult {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  rs1m: number;
  rs3m: number;
  rs6m: number;
  rs12m: number;
  rsScore: number;
  rsRating: number; // 1-99
}

// Top 50 most liquid US stocks
const SYMBOLS = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'UNH', 'JNJ',
  'V', 'XOM', 'JPM', 'MA', 'PG', 'HD', 'AVGO', 'CVX', 'MRK', 'ABBV',
  'LLY', 'PEP', 'KO', 'COST', 'TMO', 'WMT', 'BAC', 'MCD', 'CSCO', 'ACN',
  'ABT', 'DHR', 'CRM', 'ADBE', 'AMD', 'INTC', 'ORCL', 'NFLX', 'DIS', 'PFE',
  'NKE', 'TXN', 'QCOM', 'PM', 'UPS', 'RTX', 'GS', 'LOW', 'CAT', 'AMGN',
];

const BENCHMARK = 'SPY';

let cache: { data: RSResult[]; ts: number } | null = null;
const TTL = 10 * 60 * 1000; // 10 min

function calcReturn(closes: (number | null)[], periodsBack: number): number {
  const validCloses = closes.filter((c): c is number => c != null);
  if (validCloses.length < periodsBack + 1) return 0;
  const current = validCloses[validCloses.length - 1];
  const past = validCloses[validCloses.length - 1 - periodsBack];
  return past > 0 ? ((current - past) / past) * 100 : 0;
}

router.get('/', async (_req, res) => {
  try {
    if (cache && Date.now() - cache.ts < TTL) {
      return res.json(cache.data);
    }

    // Fetch 1 year weekly data for benchmark
    const benchHistory = await getHistory(BENCHMARK, { range: '1y', interval: '1wk' });
    const benchCloses = benchHistory.map((h: { close: number | null }) => h.close);

    const benchRet1m = calcReturn(benchCloses, 4);
    const benchRet3m = calcReturn(benchCloses, 13);
    const benchRet6m = calcReturn(benchCloses, 26);
    const benchRet12m = calcReturn(benchCloses, Math.min(52, benchCloses.filter(c => c != null).length - 1));

    // Get current quotes for names and prices
    const quotes = await getQuotes(SYMBOLS);
    const quoteMap = new Map(quotes.map((q: { symbol: string }) => [q.symbol, q]));

    // Fetch all symbols in parallel (batched to avoid rate limiting)
    const batchSize = 10;
    const results: RSResult[] = [];

    for (let i = 0; i < SYMBOLS.length; i += batchSize) {
      const batch = SYMBOLS.slice(i, i + batchSize);
      const promises = batch.map(async (symbol) => {
        try {
          const history = await getHistory(symbol, { range: '1y', interval: '1wk' });
          const closes = history.map((h: { close: number | null }) => h.close);
          const validCloses = closes.filter((c): c is number => c != null);
          if (validCloses.length < 5) return null;

          const ret1m = calcReturn(closes, 4);
          const ret3m = calcReturn(closes, 13);
          const ret6m = calcReturn(closes, 26);
          const ret12m = calcReturn(closes, Math.min(52, validCloses.length - 1));

          // Relative strength = stock return - benchmark return
          const rs1m = ret1m - benchRet1m;
          const rs3m = ret3m - benchRet3m;
          const rs6m = ret6m - benchRet6m;
          const rs12m = ret12m - benchRet12m;

          // Weighted composite score (more weight on recent)
          const rsScore = rs1m * 0.3 + rs3m * 0.3 + rs6m * 0.2 + rs12m * 0.2;

          const quote = quoteMap.get(symbol) as { shortName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number } | undefined;
          const price = quote?.regularMarketPrice ?? validCloses[validCloses.length - 1];
          const changePercent = quote?.regularMarketChangePercent ?? 0;

          return {
            symbol,
            name: quote?.shortName ?? symbol,
            price,
            changePercent,
            rs1m,
            rs3m,
            rs6m,
            rs12m,
            rsScore,
            rsRating: 0, // computed after sorting
          };
        } catch {
          return null;
        }
      });
      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter((r): r is RSResult => r !== null));
    }

    // Sort by rsScore and assign ratings 1-99
    results.sort((a, b) => a.rsScore - b.rsScore);
    results.forEach((r, i) => {
      r.rsRating = Math.round(((i + 1) / results.length) * 98) + 1;
    });

    // Re-sort by rating descending for response
    results.sort((a, b) => b.rsRating - a.rsRating);

    cache = { data: results, ts: Date.now() };
    res.json(results);
  } catch (err: any) {
    console.error('[RelativeStrength] Error:', err?.message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch relative strength data' });
  }
});

export default router;
