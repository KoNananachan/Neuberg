import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

interface IPOEntry {
  symbol: string;
  name: string;
  ipoDate: string; // YYYY-MM-DD
  ipoPrice: number | null; // offering price
  currentPrice: number | null;
  changeFromIPO: number | null; // % change from IPO price
  exchange: string;
  status: 'upcoming' | 'priced' | 'trading';
  sector: string;
}

// Curated list of recent and notable IPOs (2024-2026)
const IPO_UNIVERSE: Array<{
  symbol: string;
  ipoDate: string;
  ipoPrice: number | null;
  exchange: string;
  status: 'upcoming' | 'priced' | 'trading';
  sector: string;
}> = [
  // 2024 IPOs
  { symbol: 'RDDT', ipoDate: '2024-03-21', ipoPrice: 34, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'IBKR', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Financial' },
  { symbol: 'ASTERA', ipoDate: '2024-03-20', ipoPrice: 36, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'VIK', ipoDate: '2024-05-01', ipoPrice: 24, exchange: 'NYSE', status: 'trading', sector: 'Consumer' },
  { symbol: 'LOAR', ipoDate: '2024-06-27', ipoPrice: 28, exchange: 'NYSE', status: 'trading', sector: 'Industrials' },
  { symbol: 'LBPH', ipoDate: '2024-01-26', ipoPrice: 16, exchange: 'NASDAQ', status: 'trading', sector: 'Healthcare' },

  // 2023-2024 notable IPOs
  { symbol: 'ARM', ipoDate: '2023-09-14', ipoPrice: 51, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'BIRK', ipoDate: '2023-10-11', ipoPrice: 46, exchange: 'NYSE', status: 'trading', sector: 'Consumer' },
  { symbol: 'CART', ipoDate: '2023-09-19', ipoPrice: 30, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'CAVA', ipoDate: '2023-06-15', ipoPrice: 22, exchange: 'NYSE', status: 'trading', sector: 'Consumer' },
  { symbol: 'KOKN', ipoDate: '2023-06-29', ipoPrice: 28, exchange: 'NYSE', status: 'trading', sector: 'Consumer' },
  { symbol: 'VRT', ipoDate: '2023-02-01', ipoPrice: 12, exchange: 'NYSE', status: 'trading', sector: 'Industrials' },
  { symbol: 'PANW', ipoDate: '2023-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },

  // More 2024 IPOs
  { symbol: 'RVMD', ipoDate: '2024-02-09', ipoPrice: 28, exchange: 'NASDAQ', status: 'trading', sector: 'Healthcare' },
  { symbol: 'MNDY', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'TOST', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Technology' },

  // 2025 IPOs
  { symbol: 'CRDO', ipoDate: '2025-01-24', ipoPrice: 22, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'CLBT', ipoDate: '2025-02-07', ipoPrice: 15, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'SVMH', ipoDate: '2025-01-17', ipoPrice: 14, exchange: 'NASDAQ', status: 'trading', sector: 'Healthcare' },
  { symbol: 'WNTG', ipoDate: '2025-03-06', ipoPrice: 20, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'SLAI', ipoDate: '2025-02-14', ipoPrice: 18, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'DXYZ', ipoDate: '2025-03-28', ipoPrice: 10, exchange: 'NASDAQ', status: 'trading', sector: 'Financial' },
  { symbol: 'HOOD', ipoDate: '2025-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Financial' },
  { symbol: 'DUOL', ipoDate: '2025-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'KVYO', ipoDate: '2023-09-20', ipoPrice: 30, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'ONON', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Consumer' },
  { symbol: 'ASAN', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'SOUN', ipoDate: '2024-04-02', ipoPrice: 7, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'IONQ', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'RKLB', ipoDate: '2024-08-14', ipoPrice: 4.5, exchange: 'NASDAQ', status: 'trading', sector: 'Industrials' },
  { symbol: 'DNA', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Healthcare' },
  { symbol: 'PLTR', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'SMCI', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'ALAB', ipoDate: '2024-11-01', ipoPrice: 32, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'RXRX', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Healthcare' },
  { symbol: 'NU', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Financial' },
  { symbol: 'GRAB', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
  { symbol: 'VTEX', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'SE', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NYSE', status: 'trading', sector: 'Technology' },
  { symbol: 'MARA', ipoDate: '2024-01-01', ipoPrice: null, exchange: 'NASDAQ', status: 'trading', sector: 'Technology' },
];

// Symbols for trading stocks that need live quotes
const TRADING_SYMBOLS = IPO_UNIVERSE
  .filter((e) => e.status === 'trading')
  .map((e) => e.symbol);

let ipoCache: IPOEntry[] = [];
let ipoCacheTime = 0;
const IPO_TTL = 10 * 60_000; // 10 minutes

async function buildIPOData(): Promise<IPOEntry[]> {
  // Fetch live quotes for trading stocks
  const quotes = await getQuotes(TRADING_SYMBOLS);
  const quoteMap = new Map<string, { name: string; price: number }>();
  for (const q of quotes) {
    quoteMap.set(q.symbol, {
      name: q.name ?? q.symbol,
      price: q.price ?? 0,
    });
  }

  const entries: IPOEntry[] = IPO_UNIVERSE.map((ipo) => {
    const quote = quoteMap.get(ipo.symbol);
    const currentPrice = quote?.price ?? null;
    const changeFromIPO =
      ipo.ipoPrice != null && currentPrice != null && ipo.ipoPrice > 0
        ? ((currentPrice - ipo.ipoPrice) / ipo.ipoPrice) * 100
        : null;

    return {
      symbol: ipo.symbol,
      name: quote?.name ?? ipo.symbol,
      ipoDate: ipo.ipoDate,
      ipoPrice: ipo.ipoPrice,
      currentPrice,
      changeFromIPO,
      exchange: ipo.exchange,
      status: ipo.status,
      sector: ipo.sector,
    };
  });

  // Sort by IPO date descending (most recent first)
  entries.sort((a, b) => b.ipoDate.localeCompare(a.ipoDate));

  return entries;
}

const router = Router();

// GET /api/ipo
router.get('/', async (_req, res) => {
  try {
    if (Date.now() - ipoCacheTime < IPO_TTL && ipoCache.length > 0) {
      return res.json(ipoCache);
    }

    const data = await buildIPOData();
    ipoCache = data;
    ipoCacheTime = Date.now();
    res.json(data);
  } catch (err: any) {
    console.error('[IPO] Error fetching IPO data:', err?.message || err);
    // Return stale cache if available
    if (ipoCache.length > 0) return res.json(ipoCache);
    res.status(503).json({ error: 'IPO data temporarily unavailable' });
  }
});

export default router;
