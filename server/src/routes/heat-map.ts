import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

interface HeatMapStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number | null;
  volume: number;
}

interface SectorData {
  sector: string;
  sectorSymbol: string;
  sectorChange: number;
  stocks: HeatMapStock[];
}

const SECTORS: Array<{ sector: string; etf: string; holdings: string[] }> = [
  {
    sector: 'Technology',
    etf: 'XLK',
    holdings: ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'CRM', 'ADBE', 'AMD', 'INTC', 'CSCO'],
  },
  {
    sector: 'Healthcare',
    etf: 'XLV',
    holdings: ['UNH', 'JNJ', 'LLY', 'PFE', 'ABBV', 'TMO', 'MRK', 'ABT', 'DHR'],
  },
  {
    sector: 'Financials',
    etf: 'XLF',
    holdings: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'SCHW', 'C', 'AXP'],
  },
  {
    sector: 'Consumer Discretionary',
    etf: 'XLY',
    holdings: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG'],
  },
  {
    sector: 'Communication Services',
    etf: 'XLC',
    holdings: ['META', 'GOOGL', 'GOOG', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS'],
  },
  {
    sector: 'Industrials',
    etf: 'XLI',
    holdings: ['CAT', 'GE', 'HON', 'UNP', 'BA', 'RTX', 'DE', 'LMT', 'UPS'],
  },
  {
    sector: 'Consumer Staples',
    etf: 'XLP',
    holdings: ['PG', 'KO', 'PEP', 'COST', 'WMT', 'PM', 'CL', 'MDLZ', 'MO'],
  },
  {
    sector: 'Energy',
    etf: 'XLE',
    holdings: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY'],
  },
  {
    sector: 'Utilities',
    etf: 'XLU',
    holdings: ['NEE', 'SO', 'DUK', 'SRE', 'AEP', 'D', 'EXC', 'XEL', 'ED'],
  },
  {
    sector: 'Real Estate',
    etf: 'XLRE',
    holdings: ['PLD', 'AMT', 'EQIX', 'CCI', 'PSA', 'SPG', 'O', 'WELL', 'DLR'],
  },
  {
    sector: 'Materials',
    etf: 'XLB',
    holdings: ['LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'NUE', 'DOW', 'DD'],
  },
];

// Flatten all symbols for batch fetching
const ALL_SYMBOLS: string[] = [];
for (const s of SECTORS) {
  ALL_SYMBOLS.push(s.etf);
  for (const h of s.holdings) {
    if (!ALL_SYMBOLS.includes(h)) ALL_SYMBOLS.push(h);
  }
}

// Cache for 2 minutes
let heatMapCache: { data: SectorData[]; expiresAt: number } = { data: [], expiresAt: 0 };
const CACHE_TTL = 120_000;

async function fetchHeatMapData(): Promise<SectorData[]> {
  // Batch fetch in groups of ~30 to avoid rate limits
  const BATCH_SIZE = 30;
  const allQuotes: Map<string, any> = new Map();

  for (let i = 0; i < ALL_SYMBOLS.length; i += BATCH_SIZE) {
    const batch = ALL_SYMBOLS.slice(i, i + BATCH_SIZE);
    const quotes = await getQuotes(batch);
    for (const q of quotes) {
      if (q) allQuotes.set(q.symbol, q);
    }
  }

  const sectors: SectorData[] = [];

  for (const def of SECTORS) {
    const etfQuote = allQuotes.get(def.etf);
    const sectorChange = etfQuote?.changePercent ?? 0;

    const stocks: HeatMapStock[] = [];

    for (const sym of def.holdings) {
      const q = allQuotes.get(sym);
      if (!q) continue;
      stocks.push({
        symbol: q.symbol,
        name: q.name ?? sym,
        price: q.price ?? 0,
        changePercent: q.changePercent ?? 0,
        marketCap: q.marketCap ?? null,
        volume: q.volume ?? 0,
      });
    }

    // Sort by market cap descending (largest first)
    stocks.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));

    sectors.push({
      sector: def.sector,
      sectorSymbol: def.etf,
      sectorChange,
      stocks,
    });
  }

  // Sort sectors by absolute change (most movement first)
  sectors.sort((a, b) => Math.abs(b.sectorChange) - Math.abs(a.sectorChange));

  return sectors;
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (heatMapCache.data.length > 0 && now < heatMapCache.expiresAt) {
      return res.json(heatMapCache.data);
    }

    const data = await fetchHeatMapData();

    if (data.length > 0) {
      heatMapCache = { data, expiresAt: now + CACHE_TTL };
    }

    res.json(data);
  } catch (err: any) {
    console.error('[HeatMap] Error:', err?.message || err);
    // Return stale cache if available
    if (heatMapCache.data.length > 0) {
      return res.json(heatMapCache.data);
    }
    res.status(500).json({ error: 'Failed to fetch heat map data' });
  }
});

export default router;
