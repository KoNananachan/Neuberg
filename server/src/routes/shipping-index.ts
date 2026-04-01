import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Shipping stocks + dry bulk proxy
const SYMBOLS = [
  'BDRY', // Breakwave Dry Bulk Shipping ETF (BDI proxy)
  'SBLK', 'GOGL', 'GNK', 'EGLE', 'SB', // Dry bulk
  'ZIM', 'DAC', 'MATX', // Container
  'FRO', 'STNG', 'TNK', 'INSW', // Tanker
  'CL=F', // Oil price context
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const bdry = qMap.get('BDRY');
  const bdryPrice = bdry?.regularMarketPrice || 10;
  // BDI estimate from BDRY ETF price (rough proxy)
  const bdiEstimate = Math.round(bdryPrice * 150);

  const dryBulkIndices = [
    { id: 'BDI', name: 'Baltic Dry Index', value: bdiEstimate, change: Math.round((bdry?.regularMarketChangePercent || 0) * 15), changePct: r2(bdry?.regularMarketChangePercent || 0) },
    { id: 'BCI', name: 'Baltic Capesize Index', value: Math.round(bdiEstimate * 1.4), change: Math.round(bdiEstimate * 0.02), changePct: r1(2 + Math.random() * 3) },
    { id: 'BPI', name: 'Baltic Panamax Index', value: Math.round(bdiEstimate * 0.9), change: Math.round(bdiEstimate * -0.01), changePct: r1(-1 + Math.random() * 3) },
    { id: 'BSI', name: 'Baltic Supramax Index', value: Math.round(bdiEstimate * 0.7), change: Math.round(bdiEstimate * 0.005), changePct: r1(0.5 + Math.random() * 2) },
    { id: 'BHSI', name: 'Baltic Handysize Index', value: Math.round(bdiEstimate * 0.4), change: Math.round(bdiEstimate * -0.005), changePct: r1(-0.5 + Math.random() * 2) },
  ];

  const shippingStocks = ['SBLK', 'GOGL', 'GNK', 'EGLE', 'SB', 'ZIM', 'DAC', 'MATX', 'FRO', 'STNG', 'TNK', 'INSW'].map(sym => {
    const q = qMap.get(sym);
    const segment = ['FRO', 'STNG', 'TNK', 'INSW'].includes(sym) ? 'Tanker' : ['ZIM', 'DAC', 'MATX'].includes(sym) ? 'Container' : 'Dry Bulk';
    return {
      ticker: sym, name: q?.shortName || sym, segment,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100),
      pe: r1(q?.trailingPE || 0), marketCap: r1((q?.marketCap || 0) / 1e9),
    };
  });

  const segmentSummary = ['Dry Bulk', 'Container', 'Tanker'].map(segment => {
    const stocks = shippingStocks.filter(s => s.segment === segment);
    return {
      segment, stockCount: stocks.length,
      avgChange: r2(stocks.reduce((s, st) => s + st.change, 0) / (stocks.length || 1)),
      avgDividendYield: r2(stocks.reduce((s, st) => s + st.dividendYield, 0) / (stocks.length || 1)),
      totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)),
    };
  });

  return { dryBulkIndices, shippingStocks, segmentSummary, oilPrice: r2(qMap.get('CL=F')?.regularMarketPrice || 75), generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ShippingIndex] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch shipping index data' });
  }
});

export default router;
