import { Router } from 'express';
import { ensureCrumb } from '../services/stocks/yahoo-finance.js';

const router = Router();

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

interface MoverQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  avgVolume: number | null;
}

interface MoversData {
  gainers: MoverQuote[];
  losers: MoverQuote[];
  actives: MoverQuote[];
}

// Cache movers for 2 minutes
let moversCache: { data: MoversData; expiresAt: number } = { data: { gainers: [], losers: [], actives: [] }, expiresAt: 0 };
const CACHE_TTL = 120_000;

type ScreenerId = 'day_gainers' | 'day_losers' | 'most_actives';

async function fetchScreener(scrId: ScreenerId, count = 25): Promise<MoverQuote[]> {
  const auth = await ensureCrumb();
  if (!auth) return [];

  const url = `${YAHOO_API}/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=${count}&crumb=${encodeURIComponent(auth.crumb)}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) return [];

  const data = (await resp.json()) as any;
  const quotes = data?.finance?.result?.[0]?.quotes ?? [];

  return quotes.map((q: any) => ({
    symbol: q.symbol ?? '',
    name: q.shortName || q.longName || q.symbol || '',
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    volume: q.regularMarketVolume ?? 0,
    marketCap: q.marketCap ?? null,
    avgVolume: q.averageDailyVolume3Month ?? null,
  }));
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (moversCache.data.gainers.length > 0 && now < moversCache.expiresAt) {
      return res.json(moversCache.data);
    }

    const [gainers, losers, actives] = await Promise.all([
      fetchScreener('day_gainers', 25),
      fetchScreener('day_losers', 25),
      fetchScreener('most_actives', 25),
    ]);

    const data: MoversData = { gainers, losers, actives };

    // Only cache if we got data
    if (gainers.length > 0 || losers.length > 0 || actives.length > 0) {
      moversCache = { data, expiresAt: now + CACHE_TTL };
    }

    res.json(data);
  } catch (err: any) {
    console.error('[MarketMovers] Error:', err?.message || err);
    // Return stale cache if available
    if (moversCache.data.gainers.length > 0) {
      return res.json(moversCache.data);
    }
    res.status(500).json({ error: 'Failed to fetch market movers' });
  }
});

export default router;
