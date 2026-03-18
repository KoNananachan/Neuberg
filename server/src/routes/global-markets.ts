import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Key symbols for global market dashboard
const INDEX_SYMBOLS = [
  '^GSPC', '^IXIC', '^DJI', '^RUT',     // US indices
  '^FTSE', '^GDAXI', '^FCHI', '^N225',   // International
  '^HSI', '000001.SS',                     // Asia
];

const INDICATOR_SYMBOLS = [
  '^VIX',                                   // Volatility
  '^TNX', '^TYX',                           // Yields
  'DX-Y.NYB',                              // Dollar index
  'GC=F', 'CL=F',                          // Gold, Oil
  'BTC-USD', 'ETH-USD',                    // Crypto
  'EURUSD=X', 'USDJPY=X',                  // FX
];

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: string;
}

const CATEGORY_MAP: Record<string, string> = {
  '^GSPC': 'indices', '^IXIC': 'indices', '^DJI': 'indices', '^RUT': 'indices',
  '^FTSE': 'indices', '^GDAXI': 'indices', '^FCHI': 'indices', '^N225': 'indices',
  '^HSI': 'indices', '000001.SS': 'indices',
  '^VIX': 'volatility',
  '^TNX': 'bonds', '^TYX': 'bonds',
  'DX-Y.NYB': 'fx', 'EURUSD=X': 'fx', 'USDJPY=X': 'fx',
  'GC=F': 'commodities', 'CL=F': 'commodities',
  'BTC-USD': 'crypto', 'ETH-USD': 'crypto',
};

const DISPLAY_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500', '^IXIC': 'NASDAQ', '^DJI': 'DOW 30', '^RUT': 'Russell 2000',
  '^FTSE': 'FTSE 100', '^GDAXI': 'DAX', '^FCHI': 'CAC 40', '^N225': 'Nikkei 225',
  '^HSI': 'Hang Seng', '000001.SS': 'Shanghai',
  '^VIX': 'VIX',
  '^TNX': '10Y Yield', '^TYX': '30Y Yield',
  'DX-Y.NYB': 'USD Index',
  'EURUSD=X': 'EUR/USD', 'USDJPY=X': 'USD/JPY',
  'GC=F': 'Gold', 'CL=F': 'WTI Oil',
  'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum',
};

// Cache for 60 seconds
let cache: { data: MarketItem[]; expiresAt: number } = { data: [], expiresAt: 0 };
const CACHE_TTL = 60_000;

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data.length > 0 && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const allSymbols = [...INDEX_SYMBOLS, ...INDICATOR_SYMBOLS];
    const quotes = await getQuotes(allSymbols);

    const items: MarketItem[] = quotes.map((q: any) => ({
      symbol: q.symbol,
      name: DISPLAY_NAMES[q.symbol] || q.name || q.symbol,
      price: q.price ?? 0,
      change: q.change ?? 0,
      changePercent: q.changePercent ?? 0,
      category: CATEGORY_MAP[q.symbol] || 'other',
    }));

    if (items.length > 0) {
      cache = { data: items, expiresAt: now + CACHE_TTL };
    }

    res.json(items);
  } catch (err: any) {
    console.error('[GlobalMarkets] Error:', err?.message || err);
    if (cache.data.length > 0) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch global market data' });
  }
});

export default router;
