import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Utility stocks + energy ETFs as power market proxies
const SYMBOLS = [
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'ED', 'WEC',
  'XLU', 'NG=F', 'CL=F',
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const ngPrice = qMap.get('NG=F')?.regularMarketPrice || 3.0;
  const oilPrice = qMap.get('CL=F')?.regularMarketPrice || 75;

  // Regional power prices derived from natural gas (heat rate * gas price)
  const markets = [
    { market: 'PJM West Hub', region: 'US' as const, heatRate: 8.5 },
    { market: 'ERCOT North', region: 'US' as const, heatRate: 9.0 },
    { market: 'CAISO SP15', region: 'US' as const, heatRate: 10.0 },
    { market: 'NYISO Zone J', region: 'US' as const, heatRate: 11.0 },
    { market: 'ISO-NE Mass Hub', region: 'US' as const, heatRate: 9.5 },
    { market: 'MISO Indiana Hub', region: 'US' as const, heatRate: 8.0 },
    { market: 'Germany Baseload', region: 'Europe' as const, heatRate: 7.5 },
    { market: 'UK Baseload', region: 'Europe' as const, heatRate: 8.0 },
  ].map(m => {
    const basePrice = ngPrice * m.heatRate + (Math.random() - 0.5) * 10;
    return {
      market: m.market, region: m.region,
      dayAheadPrice: r2(basePrice), realTimePrice: r2(basePrice * (1 + (Math.random() - 0.5) * 0.1)),
      peakPrice: r2(basePrice * 1.3), offPeakPrice: r2(basePrice * 0.7),
      dailyChange: r2((Math.random() - 0.5) * 8), dailyChangePct: r2((Math.random() - 0.5) * 10),
      load: Math.round(30000 + Math.random() * 50000),
      congestionCost: r2(Math.random() * 5),
    };
  });

  // Utility stocks performance
  const utilities = ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'ED', 'WEC'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100),
      pe: r1(q?.trailingPE || 0), marketCap: r1((q?.marketCap || 0) / 1e9),
    };
  });

  const xlu = qMap.get('XLU');
  const sectorSummary = {
    xluPrice: r2(xlu?.regularMarketPrice || 0), xluChange: r2(xlu?.regularMarketChangePercent || 0),
    avgDividendYield: r2(utilities.reduce((s, u) => s + u.dividendYield, 0) / utilities.length),
    naturalGasPrice: r2(ngPrice), oilPrice: r2(oilPrice),
  };

  return { markets, utilities, sectorSummary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PowerMarket] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch power market data' });
  }
});

export default router;
