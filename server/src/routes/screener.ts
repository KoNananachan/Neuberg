import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Broad universe for screening — top US stocks
const SCREEN_UNIVERSE = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'UNH', 'LLY',
  'JPM', 'V', 'XOM', 'AVGO', 'MA', 'JNJ', 'PG', 'HD', 'COST', 'MRK',
  'ABBV', 'AMD', 'CRM', 'NFLX', 'CVX', 'KO', 'PEP', 'ADBE', 'WMT', 'BAC',
  'TMO', 'CSCO', 'MCD', 'ACN', 'ORCL', 'LIN', 'ABT', 'DHR', 'INTC', 'DIS',
  'PM', 'CMCSA', 'NKE', 'TXN', 'VZ', 'WFC', 'NEE', 'RTX', 'QCOM', 'AMGN',
  'ISRG', 'AMAT', 'GE', 'IBM', 'NOW', 'SYK', 'CAT', 'GS', 'BKNG', 'T',
  'LOW', 'SPGI', 'BLK', 'AXP', 'MDLZ', 'PLD', 'CB', 'DE', 'PANW', 'GILD',
  'CI', 'ADP', 'TJX', 'SLB', 'SCHW', 'MMC', 'VRTX', 'MO', 'REGN', 'SO',
  'ZTS', 'BSX', 'LRCX', 'KLAC', 'CME', 'ETN', 'BDX', 'CL', 'FI', 'SNPS',
  'DUK', 'ICE', 'SHW', 'EOG', 'APD', 'CMG', 'MPC', 'PXD', 'MSI', 'PYPL',
];

interface ScreenResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number | null;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
}

// Cache for 2 minutes
let screenCache: { data: ScreenResult[]; expiresAt: number } = { data: [], expiresAt: 0 };
const CACHE_TTL = 120_000;

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (screenCache.data.length > 0 && now < screenCache.expiresAt) {
      return res.json(screenCache.data);
    }

    const quotes = await getQuotes(SCREEN_UNIVERSE);

    const results: ScreenResult[] = quotes
      .filter((q: any) => q.price > 0)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.name || q.symbol,
        price: q.price ?? 0,
        change: q.change ?? 0,
        changePercent: q.changePercent ?? 0,
        volume: q.volume ?? 0,
        avgVolume: q.avgVolume ?? null,
        marketCap: q.marketCap ?? null,
        pe: q.eps && q.eps > 0 ? q.price / q.eps : null,
        eps: q.eps ?? null,
        dayHigh: q.dayHigh ?? null,
        dayLow: q.dayLow ?? null,
        previousClose: q.previousClose ?? null,
      }));

    if (results.length > 0) {
      screenCache = { data: results, expiresAt: now + CACHE_TTL };
    }

    res.json(results);
  } catch (err: any) {
    console.error('[Screener] Error:', err?.message || err);
    if (screenCache.data.length > 0) return res.json(screenCache.data);
    res.status(500).json({ error: 'Failed to fetch screener data' });
  }
});

export default router;
