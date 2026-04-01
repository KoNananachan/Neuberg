import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Global dividend ETFs + high-yield international stocks
const SYMBOLS = [
  'VIG', 'SCHD', 'DGRO', 'NOBL', 'DVY', // US dividend
  'IDV', 'VYMI', 'DWX', // International dividend
  'SCHY', 'HDAW', // Schwab/First Trust intl
  'JNJ', 'PG', 'KO', 'PEP', 'XOM', 'CVX', 'ABBV', // US aristocrats
  'UL', 'NVS', 'RY', 'TD', 'BP', 'SHEL', 'TTE', // International
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');

  const etfSyms = new Set(['VIG', 'SCHD', 'DGRO', 'NOBL', 'DVY', 'IDV', 'VYMI', 'DWX', 'SCHY', 'HDAW']);
  const intlStocks = new Set(['UL', 'NVS', 'RY', 'TD', 'BP', 'SHEL', 'TTE']);

  const etfs = quotes.filter(q => q?.symbol && etfSyms.has(q.symbol)).map(q => ({
    ticker: q.symbol!, name: q.shortName || q.symbol!,
    region: ['IDV', 'VYMI', 'DWX', 'SCHY', 'HDAW'].includes(q.symbol!) ? 'International' : 'US',
    price: r2(q.regularMarketPrice || 0), change: r2(q.regularMarketChangePercent || 0),
    dividendYield: r2((q.trailingAnnualDividendYield || 0) * 100),
    aum: r1((q.marketCap || 0) / 1e9),
  }));

  const stocks = quotes.filter(q => q?.symbol && !etfSyms.has(q.symbol)).map(q => ({
    ticker: q.symbol!, name: q.shortName || q.symbol!,
    region: intlStocks.has(q.symbol!) ? 'International' : 'US',
    price: r2(q.regularMarketPrice || 0), change: r2(q.regularMarketChangePercent || 0),
    dividendYield: r2((q.trailingAnnualDividendYield || 0) * 100),
    dividendRate: r2(q.trailingAnnualDividendRate || 0),
    pe: r1(q.trailingPE || 0), marketCap: r1((q.marketCap || 0) / 1e9),
  }));

  const regionSummary = ['US', 'International'].map(region => {
    const regionStocks = stocks.filter(s => s.region === region);
    const regionEtfs = etfs.filter(e => e.region === region);
    return {
      region, stockCount: regionStocks.length, etfCount: regionEtfs.length,
      avgYield: r2([...regionStocks, ...regionEtfs].reduce((s, i) => s + i.dividendYield, 0) / ([...regionStocks, ...regionEtfs].length || 1)),
      topYield: [...regionStocks].sort((a, b) => b.dividendYield - a.dividendYield)[0]?.ticker || 'N/A',
    };
  });

  return { etfs, stocks, regionSummary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData(); cache = { data, ts: now }; res.json(data);
  } catch (err) {
    console.error('[GlobalDividend] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
export default router;
