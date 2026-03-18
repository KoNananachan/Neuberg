import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// 8 major currencies
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'] as const;
type Currency = (typeof CURRENCIES)[number];

// All 28 cross pairs
const ALL_PAIRS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X',
  'EURGBP=X', 'EURJPY=X', 'EURCHF=X', 'EURAUD=X', 'EURCAD=X', 'EURNZD=X',
  'GBPJPY=X', 'GBPCHF=X', 'GBPAUD=X', 'GBPCAD=X', 'GBPNZD=X',
  'CHFJPY=X', 'AUDJPY=X', 'AUDCHF=X', 'AUDCAD=X', 'AUDNZD=X',
  'CADJPY=X', 'CADCHF=X', 'NZDJPY=X', 'NZDCHF=X', 'NZDCAD=X',
];

// Parse symbol to base/quote currencies
function parsePair(symbol: string): { base: Currency; quote: Currency } | null {
  const raw = symbol.replace('=X', '');
  if (raw.length !== 6) return null;
  const base = raw.slice(0, 3) as Currency;
  const quote = raw.slice(3) as Currency;
  if (!CURRENCIES.includes(base) || !CURRENCIES.includes(quote)) return null;
  return { base, quote };
}

interface CurrencyResult {
  code: string;
  strength: number;
  rank: number;
  change: number;
  pairs: Record<string, number>;
}

interface CacheEntry {
  data: { currencies: CurrencyResult[]; updatedAt: string };
  ts: number;
}

let cache: CacheEntry | null = null;
const TTL = 5 * 60 * 1000; // 5 minutes

router.get('/', async (_req, res) => {
  try {
    if (cache && Date.now() - cache.ts < TTL) {
      return res.json(cache.data);
    }

    const quotes = await getQuotes(ALL_PAIRS);
    const quoteMap = new Map(
      quotes.map((q: { symbol: string; price?: number; changePercent?: number | null; previousClose?: number | null }) => [q.symbol, q]),
    );

    // For each currency, track cumulative performance vs each other currency
    // pairPerf[base][quote] = percentage change of base vs quote
    const pairPerf: Record<string, Record<string, number>> = {};
    for (const c of CURRENCIES) {
      pairPerf[c] = {};
    }

    for (const symbol of ALL_PAIRS) {
      const parsed = parsePair(symbol);
      if (!parsed) continue;

      const q = quoteMap.get(symbol) as {
        price?: number;
        changePercent?: number | null;
        previousClose?: number | null;
      } | undefined;
      if (!q || !q.price || q.price <= 0) continue;

      const { base, quote } = parsed;
      const prevClose = q.previousClose ?? q.price;
      const changePct = prevClose > 0 ? ((q.price - prevClose) / prevClose) * 100 : 0;

      // If EURUSD rises, EUR is strong, USD is weak
      pairPerf[base][quote] = changePct;
      pairPerf[quote][base] = -changePct;
    }

    // Calculate raw strength score for each currency
    // Sum of performance against all other currencies
    const rawScores: Record<string, number> = {};
    for (const c of CURRENCIES) {
      const perfs = Object.values(pairPerf[c]);
      rawScores[c] = perfs.length > 0
        ? perfs.reduce((sum, v) => sum + v, 0) / perfs.length
        : 0;
    }

    // Normalize to 0-100 range
    const rawValues = Object.values(rawScores);
    const minRaw = Math.min(...rawValues);
    const maxRaw = Math.max(...rawValues);
    const range = maxRaw - minRaw;

    const currencies: CurrencyResult[] = CURRENCIES.map((code) => {
      const strength = range > 0
        ? ((rawScores[code] - minRaw) / range) * 100
        : 50;

      // Average change across all pairs for this currency
      const pairChanges = pairPerf[code];
      const changeValues = Object.values(pairChanges);
      const avgChange = changeValues.length > 0
        ? changeValues.reduce((s, v) => s + v, 0) / changeValues.length
        : 0;

      return {
        code,
        strength: Math.round(strength * 10) / 10,
        rank: 0, // filled after sort
        change: Math.round(avgChange * 1000) / 1000,
        pairs: Object.fromEntries(
          Object.entries(pairChanges).map(([k, v]) => [k, Math.round(v * 1000) / 1000]),
        ),
      };
    });

    // Sort by strength descending and assign ranks
    currencies.sort((a, b) => b.strength - a.strength);
    currencies.forEach((c, i) => {
      c.rank = i + 1;
    });

    const result = {
      currencies,
      updatedAt: new Date().toISOString(),
    };

    cache = { data: result, ts: Date.now() };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CurrencyStrength] Error:', message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch currency strength data' });
  }
});

export default router;
