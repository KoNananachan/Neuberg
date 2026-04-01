import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META',
  'JNJ', 'UNH', 'PFE', 'ABBV',
  'JPM', 'BAC', 'GS', 'BRK-B',
  'PG', 'KO', 'MCD', 'WMT',
  'XOM', 'CVX',
  'CAT', 'HON', 'UPS',
  'AMT', 'PLD',
];

const SECTOR_MAP: Record<string, string> = {
  AAPL: 'Technology', MSFT: 'Technology', GOOGL: 'Technology', AMZN: 'Technology',
  NVDA: 'Technology', META: 'Technology',
  JNJ: 'Healthcare', UNH: 'Healthcare', PFE: 'Healthcare', ABBV: 'Healthcare',
  JPM: 'Financials', BAC: 'Financials', GS: 'Financials', 'BRK-B': 'Financials',
  PG: 'Consumer Staples', KO: 'Consumer Staples', MCD: 'Consumer Staples', WMT: 'Consumer Staples',
  XOM: 'Energy', CVX: 'Energy',
  CAT: 'Industrials', HON: 'Industrials', UPS: 'Industrials',
  AMT: 'Real Estate', PLD: 'Real Estate',
};

const CACHE_TTL = 5 * 60_000; // 5 min
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No quote data');

  const stocks = quotes
    .filter((q: any) => q && q.symbol)
    .map((q: any) => {
      const sym = q.symbol as string;
      const peTrailing = r2(q.trailingPE);
      const peForward = r2(q.forwardPE);
      const pBook = r2(q.priceToBook);
      const mcap = q.marketCap ? Math.round(q.marketCap / 1e9 * 10) / 10 : 0;
      const pSales = r2(q.priceToSalesTrailing12Months);
      const evEbitda = r2(q.enterpriseToEbitda);
      const evSales = r2(q.enterpriseToRevenue);
      const pegRatio = r2(q.pegRatio);
      const pFcf = peTrailing > 0 ? r2(peTrailing * 0.9) : 0; // approximate

      return {
        ticker: sym,
        name: q.shortName || q.longName || sym,
        sector: SECTOR_MAP[sym] || 'Other',
        marketCap: mcap,
        multiples: { peTrailing, peForward, evEbitda, pSales, pBook, pFcf, evSales, pegRatio },
        percentiles: {
          pe5YPctile: peTrailing > 30 ? 75 : peTrailing > 20 ? 50 : 25,
          evEbitda5YPctile: evEbitda > 20 ? 70 : evEbitda > 12 ? 45 : 25,
          pSales5YPctile: pSales > 8 ? 80 : pSales > 4 ? 50 : 20,
        },
        sectorAvg: { peAvg: 0, evEbitdaAvg: 0, pSalesAvg: 0, pBookAvg: 0 },
        premium: { vsSector: 0, vs5YAvg: 0 },
        history: [],
      };
    });

  // Compute sector averages
  const sectorMap = new Map<string, typeof stocks>();
  for (const s of stocks) {
    if (!sectorMap.has(s.sector)) sectorMap.set(s.sector, []);
    sectorMap.get(s.sector)!.push(s);
  }

  const sectors = [...sectorMap.entries()].map(([sector, items]) => {
    const avg = (fn: (s: typeof items[0]) => number) =>
      r2(items.reduce((a, b) => a + fn(b), 0) / items.length);

    const avgPE = avg(s => s.multiples.peTrailing);
    const avgEVEBITDA = avg(s => s.multiples.evEbitda);
    const avgPS = avg(s => s.multiples.pSales);
    const avgPB = avg(s => s.multiples.pBook);
    const sorted = [...items].sort((a, b) => a.multiples.peTrailing - b.multiples.peTrailing);
    const medianPE = r2(sorted[Math.floor(sorted.length / 2)]?.multiples.peTrailing);

    for (const s of items) {
      s.sectorAvg = { peAvg: avgPE, evEbitdaAvg: avgEVEBITDA, pSalesAvg: avgPS, pBookAvg: avgPB };
      s.premium.vsSector = avgPE > 0 ? r2((s.multiples.peTrailing / avgPE - 1) * 100) : 0;
    }

    return { sector, avgPE, avgEVEBITDA, avgPS, medianPE, stockCount: items.length };
  });

  return { stocks, sectors, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ValuationMultiples] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch valuation data' });
  }
});

export default router;
