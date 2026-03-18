import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Major currency pairs — organized by importance
const FX_PAIRS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X',
  'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X',
  'EURGBP=X', 'EURJPY=X', 'GBPJPY=X',
  'EURCHF=X', 'AUDJPY=X',
  'USDCNY=X', 'USDHKD=X', 'USDSGD=X',
  'USDINR=X', 'USDKRW=X', 'USDMXN=X',
  'DX-Y.NYB', // US Dollar Index
];

interface FxPair {
  symbol: string;
  pair: string;
  name: string;
  rate: number;
  change: number;
  changePercent: number;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
}

// Cache for 60 seconds
let fxCache: { data: FxPair[]; expiresAt: number } = { data: [], expiresAt: 0 };
const CACHE_TTL = 60_000;

// Friendly names for pairs
const PAIR_NAMES: Record<string, string> = {
  'EURUSD=X': 'EUR/USD',
  'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY',
  'USDCHF=X': 'USD/CHF',
  'AUDUSD=X': 'AUD/USD',
  'USDCAD=X': 'USD/CAD',
  'NZDUSD=X': 'NZD/USD',
  'EURGBP=X': 'EUR/GBP',
  'EURJPY=X': 'EUR/JPY',
  'GBPJPY=X': 'GBP/JPY',
  'EURCHF=X': 'EUR/CHF',
  'AUDJPY=X': 'AUD/JPY',
  'USDCNY=X': 'USD/CNY',
  'USDHKD=X': 'USD/HKD',
  'USDSGD=X': 'USD/SGD',
  'USDINR=X': 'USD/INR',
  'USDKRW=X': 'USD/KRW',
  'USDMXN=X': 'USD/MXN',
  'DX-Y.NYB': 'DXY',
};

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (fxCache.data.length > 0 && now < fxCache.expiresAt) {
      return res.json(fxCache.data);
    }

    const quotes = await getQuotes(FX_PAIRS);

    const pairs: FxPair[] = quotes.map((q: any) => ({
      symbol: q.symbol,
      pair: PAIR_NAMES[q.symbol] || q.symbol.replace('=X', ''),
      name: q.name || PAIR_NAMES[q.symbol] || q.symbol,
      rate: q.price ?? 0,
      change: q.change ?? 0,
      changePercent: q.changePercent ?? 0,
      dayHigh: q.dayHigh ?? null,
      dayLow: q.dayLow ?? null,
      previousClose: q.previousClose ?? null,
    }));

    if (pairs.length > 0) {
      fxCache = { data: pairs, expiresAt: now + CACHE_TTL };
    }

    res.json(pairs);
  } catch (err: any) {
    console.error('[Forex] Error:', err?.message || err);
    if (fxCache.data.length > 0) {
      return res.json(fxCache.data);
    }
    res.status(500).json({ error: 'Failed to fetch forex data' });
  }
});

// History for a specific pair
router.get('/:pair/history', async (req, res) => {
  try {
    const pair = req.params.pair;
    const range = (req.query.range as string) || '1d';
    const symbol = pair.includes('=') ? pair : `${pair}=X`;
    const history = await getHistory(symbol, { range });
    res.json(history);
  } catch (err: any) {
    console.error('[Forex] Error fetching history:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch forex history' });
  }
});

export default router;
