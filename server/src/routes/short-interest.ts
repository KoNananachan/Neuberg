import { Router } from 'express';
import { ensureCrumb, getQuotes } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const SHORT_INTEREST_UNIVERSE = [
  'GME', 'AMC', 'BBBY', 'CVNA', 'UPST', 'LCID', 'RIVN', 'PLTR', 'SOFI', 'NIO',
  'SNAP', 'PINS', 'HOOD', 'COIN', 'SQ', 'SHOP', 'RBLX', 'DKNG', 'PENN', 'BYND',
  'SPCE', 'TLRY', 'WKHS', 'GOEV', 'CLOV', 'WISH', 'RKT', 'FUBO', 'AI', 'IONQ',
  'MARA', 'RIOT', 'BITF', 'MSTR', 'AFRM', 'PATH', 'CRWD', 'NET', 'SNOW', 'DDOG',
  'MDB', 'ZS', 'OKTA', 'U', 'DASH', 'ABNB', 'LYFT', 'UBER', 'TTD', 'BILL',
  'HIMS', 'SMCI', 'ARM', 'VRT', 'CELH', 'DUOL', 'RDDT', 'BIRK', 'CART', 'CAVA',
];

interface ShortInterestData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  sharesShort: number | null;
  shortRatio: number | null;
  shortPercentOfFloat: number | null;
  sharesShortPriorMonth: number | null;
  shortChangePercent: number | null;
  volume: number;
  avgVolume: number | null;
  marketCap: number | null;
}

let cache: ShortInterestData[] = [];
let cacheTime = 0;
const CACHE_TTL = 10 * 60_000; // 10 minutes

const router = Router();

async function fetchKeyStats(symbol: string): Promise<{
  sharesShort: number | null;
  shortRatio: number | null;
  shortPercentOfFloat: number | null;
  sharesShortPriorMonth: number | null;
  sharesPercentSharesOut: number | null;
} | null> {
  try {
    const auth = await ensureCrumb();
    if (!auth) return null;

    const url = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics&crumb=${encodeURIComponent(auth.crumb)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    });

    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    const ks = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
    if (!ks) return null;

    return {
      sharesShort: ks.sharesShort?.raw ?? null,
      shortRatio: ks.shortRatio?.raw ?? null,
      shortPercentOfFloat: ks.shortPercentOfFloat?.raw ?? null,
      sharesShortPriorMonth: ks.sharesShortPriorMonth?.raw ?? null,
      sharesPercentSharesOut: ks.sharesPercentSharesOut?.raw ?? null,
    };
  } catch (err) {
    console.error(`[ShortInterest] Error fetching key stats for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function fetchBatch(symbols: string[]): Promise<Map<string, Awaited<ReturnType<typeof fetchKeyStats>>>> {
  const results = new Map<string, Awaited<ReturnType<typeof fetchKeyStats>>>();
  const settled = await Promise.allSettled(symbols.map(s => fetchKeyStats(s)));
  for (let i = 0; i < symbols.length; i++) {
    const r = settled[i];
    results.set(symbols[i], r.status === 'fulfilled' ? r.value : null);
  }
  return results;
}

async function buildShortInterestData(): Promise<ShortInterestData[]> {
  // Fetch basic quotes in bulk
  const quotes = await getQuotes(SHORT_INTEREST_UNIVERSE);
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

  // Fetch key statistics in batches of 5 with delays
  const allKeyStats = new Map<string, Awaited<ReturnType<typeof fetchKeyStats>>>();
  const batchSize = 5;
  for (let i = 0; i < SHORT_INTEREST_UNIVERSE.length; i += batchSize) {
    const batch = SHORT_INTEREST_UNIVERSE.slice(i, i + batchSize);
    const batchResults = await fetchBatch(batch);
    for (const [k, v] of batchResults) {
      allKeyStats.set(k, v);
    }
    // Delay between batches to avoid rate limiting
    if (i + batchSize < SHORT_INTEREST_UNIVERSE.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  const results: ShortInterestData[] = [];
  for (const symbol of SHORT_INTEREST_UNIVERSE) {
    const quote = quoteMap.get(symbol);
    const ks = allKeyStats.get(symbol);
    if (!quote) continue;

    let shortChangePercent: number | null = null;
    if (ks?.sharesShort != null && ks?.sharesShortPriorMonth != null && ks.sharesShortPriorMonth > 0) {
      shortChangePercent = ((ks.sharesShort - ks.sharesShortPriorMonth) / ks.sharesShortPriorMonth) * 100;
    }

    results.push({
      symbol,
      name: quote.name || symbol,
      price: quote.price ?? 0,
      changePercent: quote.changePercent ?? 0,
      sharesShort: ks?.sharesShort ?? null,
      shortRatio: ks?.shortRatio ?? null,
      shortPercentOfFloat: ks?.shortPercentOfFloat ?? null,
      sharesShortPriorMonth: ks?.sharesShortPriorMonth ?? null,
      shortChangePercent,
      volume: quote.volume ?? 0,
      avgVolume: (quote as Record<string, unknown>).avgVolume as number ?? null,
      marketCap: quote.marketCap ?? null,
    });
  }

  return results;
}

// GET /api/short-interest
router.get('/', async (_req, res) => {
  try {
    if (Date.now() - cacheTime < CACHE_TTL && cache.length > 0) {
      return res.json(cache);
    }

    const data = await buildShortInterestData();
    cache = data;
    cacheTime = Date.now();
    res.json(data);
  } catch (err) {
    console.error('[ShortInterest] Error:', err instanceof Error ? err.message : err);
    if (cache.length > 0) return res.json(cache);
    res.status(503).json({ error: 'Short interest data temporarily unavailable' });
  }
});

export default router;
