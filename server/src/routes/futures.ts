import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

interface FutureDefinition {
  symbol: string;
  name: string;
  category: string;
  underlying?: string;
}

const FUTURES: FutureDefinition[] = [
  // Index Futures
  { symbol: 'ES=F', name: 'S&P 500 E-mini', category: 'index', underlying: '^GSPC' },
  { symbol: 'NQ=F', name: 'Nasdaq 100 E-mini', category: 'index', underlying: '^IXIC' },
  { symbol: 'YM=F', name: 'Dow E-mini', category: 'index', underlying: '^DJI' },
  { symbol: 'RTY=F', name: 'Russell 2000 E-mini', category: 'index', underlying: '^RUT' },
  // European Index Futures
  { symbol: 'DAX=F', name: 'DAX Futures', category: 'index', underlying: '^GDAXI' },
  { symbol: 'FTSE=F', name: 'FTSE 100 Futures', category: 'index', underlying: '^FTSE' },
  // Treasury Futures
  { symbol: 'ZB=F', name: '30-Year T-Bond', category: 'treasury' },
  { symbol: 'ZN=F', name: '10-Year T-Note', category: 'treasury' },
  { symbol: 'ZF=F', name: '5-Year T-Note', category: 'treasury' },
  { symbol: 'ZT=F', name: '2-Year T-Note', category: 'treasury' },
  // Currency Futures
  { symbol: '6E=F', name: 'Euro FX', category: 'currency' },
  { symbol: '6J=F', name: 'Japanese Yen', category: 'currency' },
  { symbol: '6B=F', name: 'British Pound', category: 'currency' },
  { symbol: '6A=F', name: 'Australian Dollar', category: 'currency' },
  // Commodity Futures
  { symbol: 'GC=F', name: 'Gold', category: 'commodity' },
  { symbol: 'SI=F', name: 'Silver', category: 'commodity' },
  { symbol: 'CL=F', name: 'Crude Oil WTI', category: 'commodity' },
  { symbol: 'NG=F', name: 'Natural Gas', category: 'commodity' },
  // Volatility
  { symbol: 'VX=F', name: 'VIX Futures', category: 'volatility' },
];

interface FutureData {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number;
  openInterest: number | null;
  underlyingSymbol: string | null;
  underlyingPrice: number | null;
  fairValueSpread: number | null;
}

// Cache
let futuresCache: { data: FutureData[]; expiresAt: number } = { data: [], expiresAt: 0 };
const CACHE_TTL = 60_000;

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (futuresCache.data.length > 0 && now < futuresCache.expiresAt) {
      return res.json(futuresCache.data);
    }

    // Collect all symbols to fetch: futures + underlyings
    const futureSymbols = FUTURES.map((f) => f.symbol);
    const underlyingSymbols = FUTURES
      .filter((f) => f.underlying)
      .map((f) => f.underlying!);
    const uniqueUnderlyings = [...new Set(underlyingSymbols)];

    // Fetch all in one batch
    const allSymbols = [...futureSymbols, ...uniqueUnderlyings];
    const quotes = await getQuotes(allSymbols);

    // Build lookup map
    const quoteMap = new Map<string, any>();
    for (const q of quotes) {
      quoteMap.set(q.symbol, q);
    }

    // Build response
    const result: FutureData[] = FUTURES.map((def) => {
      const q = quoteMap.get(def.symbol);
      const underlyingQ = def.underlying ? quoteMap.get(def.underlying) : null;

      const price = q?.price ?? 0;
      const underlyingPrice = underlyingQ?.price ?? null;
      const fairValueSpread =
        underlyingPrice != null && price > 0
          ? price - underlyingPrice
          : null;

      return {
        symbol: def.symbol,
        name: def.name,
        category: def.category,
        price,
        change: q?.change ?? 0,
        changePercent: q?.changePercent ?? 0,
        previousClose: q?.previousClose ?? null,
        dayHigh: q?.dayHigh ?? null,
        dayLow: q?.dayLow ?? null,
        volume: q?.volume ?? 0,
        openInterest: null, // Yahoo Finance does not reliably provide open interest in quote API
        underlyingSymbol: def.underlying ?? null,
        underlyingPrice,
        fairValueSpread,
      };
    });

    if (result.length > 0) {
      futuresCache = { data: result, expiresAt: now + CACHE_TTL };
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Futures] Error:', err?.message || err);
    if (futuresCache.data.length > 0) {
      return res.json(futuresCache.data);
    }
    res.status(500).json({ error: 'Failed to fetch futures data' });
  }
});

export default router;
