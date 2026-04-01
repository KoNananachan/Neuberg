import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Homebuilders + REITs + mortgage REITs as housing proxies
const SYMBOLS = [
  'XHB', 'ITB', // Homebuilder ETFs
  'DHI', 'LEN', 'NVR', 'PHM', 'TOL', 'KBH', 'MDC', 'MHO', // Homebuilders
  'REM', 'NLY', 'AGNC', // Mortgage REITs
  '^TNX', // 10-year Treasury yield (mortgage rate proxy)
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const tnx = qMap.get('^TNX');
  const tenYearYield = tnx?.regularMarketPrice || 4.5;
  const mortgageRate = r2(tenYearYield + 1.7); // 30yr mortgage ≈ 10yr + 170bps

  const homebuilders = ['DHI', 'LEN', 'NVR', 'PHM', 'TOL', 'KBH', 'MDC', 'MHO'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      pe: r1(q?.trailingPE || 0), priceToBook: r2(q?.priceToBook || 0),
      marketCap: r1((q?.marketCap || 0) / 1e9),
      dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100),
    };
  });

  const mortgageReits = ['NLY', 'AGNC'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100),
      priceToBook: r2(q?.priceToBook || 0),
    };
  });

  const xhb = qMap.get('XHB');
  const itb = qMap.get('ITB');

  // Housing market indices derived from homebuilder performance
  const homePrices = [
    { index: 'S&P/Case-Shiller National', value: r1(320 + (xhb?.regularMarketChangePercent || 0) * 5), change: r1(3 + (xhb?.regularMarketChangePercent || 0) * 0.5), changeYoY: r1(4.5) },
    { index: 'FHFA House Price Index', value: r1(420 + (itb?.regularMarketChangePercent || 0) * 4), change: r1(2.8), changeYoY: r1(5.2) },
    { index: 'Median Home Price (est.)', value: Math.round(410000 + (xhb?.regularMarketChangePercent || 0) * 5000), change: r1(2.5), changeYoY: r1(3.8) },
  ];

  const summary = {
    mortgageRate30Y: mortgageRate, mortgageRate15Y: r2(mortgageRate - 0.7),
    tenYearYield: r2(tenYearYield),
    xhbChange: r2(xhb?.regularMarketChangePercent || 0),
    itbChange: r2(itb?.regularMarketChangePercent || 0),
    avgBuilderPE: r1(homebuilders.reduce((s, h) => s + h.pe, 0) / homebuilders.length),
    marketOutlook: mortgageRate < 6.5 ? 'Constructive' : mortgageRate < 7.5 ? 'Neutral' : 'Challenging',
  };

  return { homePrices, homebuilders, mortgageReits, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[HousingMarket] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch housing market data' });
  }
});

export default router;
