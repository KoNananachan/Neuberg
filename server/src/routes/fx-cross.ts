import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Major currencies for cross-rate matrix
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'CNY'] as const;

// All pairs we need to fetch (base/quote where base != quote, using USD as bridge)
// We fetch XXX/USD pairs so we can compute any cross rate
// Yahoo uses "XXXYYY=X" format; for USD-based pairs: EURUSD=X, GBPUSD=X, etc.
// For pairs where USD is base: USDJPY=X, USDCHF=X, USDCAD=X, USDCNY=X
const FX_SYMBOLS = [
  'EURUSD=X',
  'GBPUSD=X',
  'USDJPY=X',
  'USDCHF=X',
  'AUDUSD=X',
  'USDCAD=X',
  'USDCNY=X',
];

interface CrossRateResponse {
  currencies: string[];
  rates: number[][];
  updatedAt: string;
}

// In-memory cache with 5-minute TTL
let crossCache: { data: CrossRateResponse; expiresAt: number } = {
  data: { currencies: [], rates: [], updatedAt: '' },
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

/**
 * Build a map of currency -> rate in USD terms.
 * e.g., EUR -> 1.08 means 1 EUR = 1.08 USD
 */
function buildUsdRateMap(quotes: Array<{ symbol: string; price: number }>): Map<string, number> {
  const map = new Map<string, number>();
  map.set('USD', 1);

  for (const q of quotes) {
    if (!q.price || q.price <= 0) continue;
    const sym = q.symbol.replace('=X', '');

    // EURUSD -> 1 EUR = price USD
    if (sym === 'EURUSD') map.set('EUR', q.price);
    else if (sym === 'GBPUSD') map.set('GBP', q.price);
    else if (sym === 'AUDUSD') map.set('AUD', q.price);
    // USDJPY -> 1 USD = price JPY => 1 JPY = 1/price USD
    else if (sym === 'USDJPY') map.set('JPY', 1 / q.price);
    else if (sym === 'USDCHF') map.set('CHF', 1 / q.price);
    else if (sym === 'USDCAD') map.set('CAD', 1 / q.price);
    else if (sym === 'USDCNY') map.set('CNY', 1 / q.price);
  }

  return map;
}

/**
 * Compute NxN cross-rate matrix.
 * rates[i][j] = how much of currency j you get for 1 unit of currency i.
 */
function computeMatrix(usdRates: Map<string, number>): number[][] {
  return CURRENCIES.map((base) => {
    const baseInUsd = usdRates.get(base) ?? 0;
    return CURRENCIES.map((quote) => {
      if (base === quote) return 1;
      const quoteInUsd = usdRates.get(quote) ?? 0;
      if (baseInUsd <= 0 || quoteInUsd <= 0) return 0;
      // 1 base = baseInUsd USD, 1 quote = quoteInUsd USD
      // => 1 base = baseInUsd / quoteInUsd quote
      return baseInUsd / quoteInUsd;
    });
  });
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (crossCache.data.currencies.length > 0 && now < crossCache.expiresAt) {
      return res.json(crossCache.data);
    }

    const quotes = await getQuotes(FX_SYMBOLS);
    const usdRates = buildUsdRateMap(
      quotes.map((q: { symbol: string; price: number }) => ({
        symbol: q.symbol,
        price: q.price,
      })),
    );

    const matrix = computeMatrix(usdRates);
    const response: CrossRateResponse = {
      currencies: [...CURRENCIES],
      rates: matrix,
      updatedAt: new Date().toISOString(),
    };

    if (matrix.length > 0) {
      crossCache = { data: response, expiresAt: now + CACHE_TTL };
    }

    res.json(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[FxCross] Error:', msg);
    if (crossCache.data.currencies.length > 0) {
      return res.json(crossCache.data);
    }
    res.status(500).json({ error: 'Failed to fetch cross-rate data' });
  }
});

export default router;
