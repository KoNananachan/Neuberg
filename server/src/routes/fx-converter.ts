import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'EUR', name: 'Euro', flag: '\u{1F1EA}\u{1F1FA}' },
  { code: 'GBP', name: 'British Pound', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'JPY', name: 'Japanese Yen', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'CHF', name: 'Swiss Franc', flag: '\u{1F1E8}\u{1F1ED}' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'AUD', name: 'Australian Dollar', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '\u{1F1F3}\u{1F1FF}' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '\u{1F1ED}\u{1F1F0}' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '\u{1F1F8}\u{1F1EC}' },
  { code: 'KRW', name: 'South Korean Won', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'INR', name: 'Indian Rupee', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'MXN', name: 'Mexican Peso', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'BRL', name: 'Brazilian Real', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'SEK', name: 'Swedish Krona', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'TRY', name: 'Turkish Lira', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: 'ZAR', name: 'South African Rand', flag: '\u{1F1FF}\u{1F1E6}' },
  { code: 'THB', name: 'Thai Baht', flag: '\u{1F1F9}\u{1F1ED}' },
];

interface FXRateData {
  code: string;
  name: string;
  flag: string;
  rateToUSD: number;
}

// Cache for 60 seconds
let fxRatesCache: { data: FXRateData[]; expiresAt: number } = { data: [], expiresAt: 0 };
const CACHE_TTL = 60_000;

// GET /api/fx-rates - exchange rates for all major currencies relative to USD
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (fxRatesCache.data.length > 0 && now < fxRatesCache.expiresAt) {
      return res.json(fxRatesCache.data);
    }

    // Build Yahoo Finance symbols: XXXUSD=X for each non-USD currency
    const nonUSD = CURRENCIES.filter((c) => c.code !== 'USD');
    const symbols = nonUSD.map((c) => `${c.code}USD=X`);

    const quotes = await getQuotes(symbols);

    // Build a map of currency code -> price (price of 1 XXX in USD)
    const priceMap = new Map<string, number>();
    for (const q of quotes) {
      // Symbol format: "XXXUSD=X" -> extract XXX
      const code = q.symbol.replace('USD=X', '');
      if (q.price && q.price > 0) {
        priceMap.set(code, q.price);
      }
    }

    const rates: FXRateData[] = CURRENCIES.map((c) => {
      if (c.code === 'USD') {
        return { code: c.code, name: c.name, flag: c.flag, rateToUSD: 1 };
      }
      const priceInUSD = priceMap.get(c.code);
      // XXXUSD=X gives price of 1 XXX in USD, so rateToUSD = 1 / price
      const rateToUSD = priceInUSD && priceInUSD > 0 ? 1 / priceInUSD : 0;
      return { code: c.code, name: c.name, flag: c.flag, rateToUSD };
    });

    if (rates.length > 0) {
      fxRatesCache = { data: rates, expiresAt: now + CACHE_TTL };
    }

    res.json(rates);
  } catch (err: any) {
    console.error('[FXConverter] Error fetching rates:', err?.message || err);
    if (fxRatesCache.data.length > 0) {
      return res.json(fxRatesCache.data);
    }
    res.status(500).json({ error: 'Failed to fetch FX rates' });
  }
});

export default router;
