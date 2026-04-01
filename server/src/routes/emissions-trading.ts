import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Carbon/ESG ETFs + clean energy as emissions proxies
const SYMBOLS = [
  'KRBN', 'GRN', // Carbon credit ETFs
  'ICLN', 'QCLN', 'TAN', // Clean energy
  'SMOG', // MSCI ACWI Low Carbon Target ETF
  'XLE', 'CL=F', // Fossil fuel benchmark
  'TSLA', 'ENPH', 'FSLR', 'NEE', // Clean energy stocks
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const krbn = qMap.get('KRBN');
  const carbonPrice = krbn?.regularMarketPrice || 30;

  const markets = [
    { market: 'EU ETS (est.)', price: r2(carbonPrice * 2.5), change: r2(krbn?.regularMarketChangePercent || 0), unit: '€/ton', volume: 'High' },
    { market: 'UK ETS (est.)', price: r2(carbonPrice * 2.2), change: r2((krbn?.regularMarketChangePercent || 0) * 0.9), unit: '£/ton', volume: 'Medium' },
    { market: 'RGGI (US NE)', price: r2(carbonPrice * 0.5), change: r2((krbn?.regularMarketChangePercent || 0) * 0.7), unit: '$/ton', volume: 'Medium' },
    { market: 'California Cap-Trade', price: r2(carbonPrice * 1.2), change: r2((krbn?.regularMarketChangePercent || 0) * 0.8), unit: '$/ton', volume: 'Medium' },
    { market: 'China ETS (est.)', price: r2(carbonPrice * 0.3), change: r2(1.5), unit: '¥/ton', volume: 'Growing' },
  ];

  const etfs = ['KRBN', 'GRN', 'ICLN', 'QCLN', 'TAN', 'SMOG'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), aum: r1((q?.marketCap || 0) / 1e9) };
  });

  const cleanVsFossil = {
    iclnChange: r2(qMap.get('ICLN')?.regularMarketChangePercent || 0),
    xleChange: r2(qMap.get('XLE')?.regularMarketChangePercent || 0),
    spread: r2((qMap.get('ICLN')?.regularMarketChangePercent || 0) - (qMap.get('XLE')?.regularMarketChangePercent || 0)),
    oilPrice: r2(qMap.get('CL=F')?.regularMarketPrice || 0),
  };

  return { markets, etfs, cleanVsFossil, carbonPriceProxy: r2(carbonPrice), generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EmissionsTrading] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch emissions trading data' });
  }
});

export default router;
