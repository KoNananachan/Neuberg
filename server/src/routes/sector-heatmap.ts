import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface SectorStock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number;
  volume: number;
}

interface SectorEntry {
  name: string;
  etfSymbol: string;
  changePct: number;
  marketCap: number;
  stocks: SectorStock[];
}

interface SectorHeatmapResponse {
  timestamp: string;
  sectors: SectorEntry[];
  summary: {
    advancers: number;
    decliners: number;
    marketBreadth: number;
    strongestSector: string;
    weakestSector: string;
  };
}

// ── GICS Sector definitions ──

const SECTOR_DEFS: Array<{ name: string; etf: string; holdings: string[] }> = [
  { name: 'Technology', etf: 'XLK', holdings: ['AAPL', 'MSFT', 'NVDA', 'AVGO'] },
  { name: 'Healthcare', etf: 'XLV', holdings: ['JNJ', 'UNH', 'LLY', 'ABBV'] },
  { name: 'Financials', etf: 'XLF', holdings: ['JPM', 'BAC', 'GS', 'MS'] },
  { name: 'Consumer Discretionary', etf: 'XLY', holdings: ['AMZN', 'TSLA', 'HD', 'NKE'] },
  { name: 'Communication Services', etf: 'XLC', holdings: ['GOOG', 'META', 'NFLX', 'DIS'] },
  { name: 'Industrials', etf: 'XLI', holdings: ['CAT', 'BA', 'HON', 'UPS'] },
  { name: 'Consumer Staples', etf: 'XLP', holdings: ['PG', 'KO', 'PEP', 'WMT'] },
  { name: 'Energy', etf: 'XLE', holdings: ['XOM', 'CVX', 'COP', 'SLB'] },
  { name: 'Utilities', etf: 'XLU', holdings: ['NEE', 'DUK', 'SO', 'D'] },
  { name: 'Real Estate', etf: 'XLRE', holdings: ['AMT', 'PLD', 'CCI', 'EQIX'] },
  { name: 'Materials', etf: 'XLB', holdings: ['LIN', 'APD', 'SHW', 'FCX'] },
];

// ── Cache (3 min TTL) ──

let cache: { data: SectorHeatmapResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 180_000;

// ── Fetch logic ──

async function fetchSectorHeatmap(): Promise<SectorHeatmapResponse> {
  // Fetch all sectors in parallel using Promise.allSettled
  const sectorResults = await Promise.allSettled(
    SECTOR_DEFS.map(async (def) => {
      const symbols = [def.etf, ...def.holdings];
      const quotes = await getQuotes(symbols);
      const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

      const etfQuote = quoteMap.get(def.etf);
      const changePct = etfQuote?.changePercent ?? 0;

      const stocks: SectorStock[] = [];
      let totalMarketCap = 0;

      for (const sym of def.holdings) {
        const q = quoteMap.get(sym);
        if (!q) continue;
        const mc = q.marketCap ?? 0;
        totalMarketCap += mc;
        stocks.push({
          symbol: q.symbol,
          name: q.name ?? sym,
          price: q.price ?? 0,
          changePct: q.changePercent ?? 0,
          marketCap: mc,
          volume: q.volume ?? 0,
        });
      }

      // Sort stocks by market cap descending
      stocks.sort((a, b) => b.marketCap - a.marketCap);

      return {
        name: def.name,
        etfSymbol: def.etf,
        changePct,
        marketCap: totalMarketCap,
        stocks,
      } satisfies SectorEntry;
    }),
  );

  const sectors: SectorEntry[] = sectorResults
    .filter((r): r is PromiseFulfilledResult<SectorEntry> => r.status === 'fulfilled')
    .map((r) => r.value);

  // Compute summary
  const allStocks = sectors.flatMap((s) => s.stocks);
  const advancers = allStocks.filter((s) => s.changePct > 0).length;
  const decliners = allStocks.filter((s) => s.changePct < 0).length;
  const total = advancers + decliners || 1;
  const marketBreadth = Math.round((advancers / total) * 100);

  // Strongest / weakest by ETF change%
  const sorted = [...sectors].sort((a, b) => b.changePct - a.changePct);
  const strongestSector = sorted[0]?.name ?? '';
  const weakestSector = sorted[sorted.length - 1]?.name ?? '';

  return {
    timestamp: new Date().toISOString(),
    sectors,
    summary: {
      advancers,
      decliners,
      marketBreadth,
      strongestSector,
      weakestSector,
    },
  };
}

// ── Route handler ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = await fetchSectorHeatmap();

    if (data.sectors.length > 0) {
      cache = { data, expiresAt: now + CACHE_TTL };
    }

    res.json(data);
  } catch (err: unknown) {
    console.error('[SectorHeatmap] Error:', err instanceof Error ? err.message : err);
    // Return stale cache if available
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch sector heatmap data' });
  }
});

export default router;
