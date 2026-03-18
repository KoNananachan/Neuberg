import { Router } from 'express';
import { ensureCrumb, getQuotes } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'V',
  'UNH', 'JNJ', 'XOM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'AVGO',
  'PEP', 'KO', 'COST', 'LLY', 'TMO', 'WMT', 'MCD', 'CRM', 'CSCO', 'ABT',
  'ACN', 'AMD', 'NFLX', 'INTC', 'QCOM', 'TXN', 'BA', 'GS', 'MS', 'BLK',
  'PYPL', 'DIS', 'NKE', 'SBUX', 'LOW', 'BKNG', 'UBER', 'SQ', 'COIN', 'PLTR',
];

interface AnalystRating {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  targetHigh: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  recommendationMean: number | null;
  recommendationKey: string | null;
  numberOfAnalysts: number | null;
  upside: number | null;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

let analystCache: AnalystRating[] = [];
let analystCacheTime = 0;
const ANALYST_TTL = 10 * 60_000; // 10 min cache

const router = Router();

async function fetchAnalystData(symbol: string, auth: { crumb: string; cookie: string }): Promise<{
  targetHigh: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  recommendationMean: number | null;
  recommendationKey: string | null;
  numberOfAnalysts: number | null;
  currentPrice: number | null;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
} | null> {
  try {
    const modules = 'financialData,recommendationTrend';
    const url = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    });

    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const fd = result.financialData || {};
    const rt = result.recommendationTrend?.trend || [];

    // Get the most recent month (period "0m" = current month)
    const currentTrend = rt.find((r: any) => r.period === '0m') || rt[0] || {};

    return {
      targetHigh: fd.targetHighPrice?.raw ?? null,
      targetLow: fd.targetLowPrice?.raw ?? null,
      targetMean: fd.targetMeanPrice?.raw ?? null,
      targetMedian: fd.targetMedianPrice?.raw ?? null,
      recommendationMean: fd.recommendationMean?.raw ?? null,
      recommendationKey: fd.recommendationKey || null,
      numberOfAnalysts: fd.numberOfAnalystOpinions?.raw ?? null,
      currentPrice: fd.currentPrice?.raw ?? null,
      strongBuy: currentTrend.strongBuy ?? 0,
      buy: currentTrend.buy ?? 0,
      hold: currentTrend.hold ?? 0,
      sell: currentTrend.sell ?? 0,
      strongSell: currentTrend.strongSell ?? 0,
    };
  } catch (err) {
    console.error(`[Analyst] Error fetching data for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function buildAnalystRatings(): Promise<AnalystRating[]> {
  const auth = await ensureCrumb();
  if (!auth) {
    console.error('[Analyst] Failed to get Yahoo crumb');
    return [];
  }

  // Fetch basic quote data for all symbols
  const quotes = await getQuotes(UNIVERSE);
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

  // Batch quoteSummary calls in groups of 5 with delays
  const BATCH_SIZE = 5;
  const BATCH_DELAY = 500; // ms between batches
  const analystMap = new Map<string, Awaited<ReturnType<typeof fetchAnalystData>>>();

  for (let i = 0; i < UNIVERSE.length; i += BATCH_SIZE) {
    const batch = UNIVERSE.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(symbol => fetchAnalystData(symbol, auth))
    );

    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled' && r.value) {
        analystMap.set(batch[j], r.value);
      }
    }

    // Delay between batches (skip delay after last batch)
    if (i + BATCH_SIZE < UNIVERSE.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  const ratings: AnalystRating[] = [];

  for (const symbol of UNIVERSE) {
    const quote = quoteMap.get(symbol);
    const analyst = analystMap.get(symbol);
    if (!quote && !analyst) continue;

    const price = quote?.price ?? analyst?.currentPrice ?? 0;
    const targetMean = analyst?.targetMean ?? null;
    const upside = price > 0 && targetMean != null
      ? ((targetMean - price) / price) * 100
      : null;

    ratings.push({
      symbol,
      name: quote?.name ?? symbol,
      price,
      changePercent: quote?.changePercent ?? 0,
      targetHigh: analyst?.targetHigh ?? null,
      targetLow: analyst?.targetLow ?? null,
      targetMean,
      targetMedian: analyst?.targetMedian ?? null,
      recommendationMean: analyst?.recommendationMean ?? null,
      recommendationKey: analyst?.recommendationKey ?? null,
      numberOfAnalysts: analyst?.numberOfAnalysts ?? null,
      upside,
      strongBuy: analyst?.strongBuy ?? 0,
      buy: analyst?.buy ?? 0,
      hold: analyst?.hold ?? 0,
      sell: analyst?.sell ?? 0,
      strongSell: analyst?.strongSell ?? 0,
    });
  }

  return ratings;
}

// GET /api/analyst
router.get('/', async (_req, res) => {
  try {
    if (Date.now() - analystCacheTime < ANALYST_TTL && analystCache.length > 0) {
      return res.json(analystCache);
    }

    const ratings = await buildAnalystRatings();
    if (ratings.length > 0) {
      analystCache = ratings;
      analystCacheTime = Date.now();
    }

    res.json(ratings.length > 0 ? ratings : analystCache);
  } catch (err) {
    console.error('[Analyst] Error fetching analyst ratings:', err);
    if (analystCache.length > 0) return res.json(analystCache);
    res.status(503).json({ error: 'Analyst ratings temporarily unavailable' });
  }
});

export default router;
