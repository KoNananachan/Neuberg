import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

type ETFCategory = 'us_equity' | 'international' | 'sector' | 'fixed_income' | 'commodity' | 'thematic' | 'volatility';

const ETF_UNIVERSE: Record<ETFCategory, string[]> = {
  us_equity: ['SPY', 'QQQ', 'IWM', 'VTI', 'DIA', 'VOO', 'IVV', 'RSP'],
  international: ['EFA', 'VEA', 'EEM', 'VWO', 'IEFA', 'IXUS'],
  sector: ['XLK', 'XLV', 'XLF', 'XLE', 'XLI', 'XLY', 'XLC', 'XLP', 'XLU', 'XLRE', 'XLB'],
  fixed_income: ['AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'TIP', 'BNDX'],
  commodity: ['GLD', 'SLV', 'IAU', 'USO', 'DBA', 'DBC'],
  thematic: ['ARKK', 'ARKG', 'ICLN', 'TAN', 'LIT', 'HACK', 'BOTZ', 'SOXX'],
  volatility: ['VXX', 'VIXY', 'SVXY'],
};

// Build reverse lookup: symbol -> category
const SYMBOL_CATEGORY: Record<string, ETFCategory> = {};
for (const [cat, symbols] of Object.entries(ETF_UNIVERSE)) {
  for (const sym of symbols) {
    SYMBOL_CATEGORY[sym] = cat as ETFCategory;
  }
}

const ALL_SYMBOLS = Object.values(ETF_UNIVERSE).flat();

interface ETFData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  avgVolume: number | null;
  ytdReturn: number | null;
  category: ETFCategory;
}

let etfCache: ETFData[] = [];
let etfCacheTime = 0;
const ETF_TTL = 120_000; // 2 minutes

// GET /api/etf - ETFs grouped by category
router.get('/', async (_req, res) => {
  try {
    if (Date.now() - etfCacheTime < ETF_TTL && etfCache.length > 0) {
      return res.json(etfCache);
    }

    // Batch fetch in groups of 30
    const results: any[] = [];
    for (let i = 0; i < ALL_SYMBOLS.length; i += 30) {
      const batch = ALL_SYMBOLS.slice(i, i + 30);
      const quotes = await getQuotes(batch);
      results.push(...quotes);
    }

    const etfs: ETFData[] = results.map((q) => {
      const ext = q as Record<string, unknown>;
      const price = (ext.price as number) ?? 0;
      const fiftyTwoWeekLow = (ext.fiftyTwoWeekLow as number) ?? null;

      // Rough YTD proxy: how far price is from 52-week low relative to the range
      let ytdReturn: number | null = null;
      if (fiftyTwoWeekLow != null && fiftyTwoWeekLow > 0) {
        ytdReturn = ((price - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100;
      }

      return {
        symbol: q.symbol,
        name: q.name ?? q.symbol,
        price,
        changePercent: (ext.changePercent as number) ?? 0,
        volume: (ext.volume as number) ?? 0,
        avgVolume: (ext.avgVolume as number) ?? null,
        ytdReturn,
        category: SYMBOL_CATEGORY[q.symbol] ?? 'us_equity',
      };
    });

    etfCache = etfs;
    etfCacheTime = Date.now();
    res.json(etfs);
  } catch (err: any) {
    console.error('[ETF] Error fetching ETF data:', err?.message || err);
    if (etfCache.length > 0) return res.json(etfCache);
    res.status(503).json({ error: 'ETF data temporarily unavailable' });
  }
});

export default router;
