import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Inflation-sensitive assets + TIPS
const SYMBOLS = [
  'TIP', 'STIP', // TIPS ETFs
  'GLD', 'SLV', // Precious metals
  'DBA', // Agricultural commodity ETF
  'DBC', // Commodity index
  '^TNX', '^IRX', // Yields
  'XLP', 'XLE', // Defensive/energy sectors
  'VTIP', // Short-term TIPS
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const tip = qMap.get('TIP');
  const tipYield = (tip?.trailingAnnualDividendYield || 0.02) * 100;

  // Breakeven inflation = nominal yield - TIPS yield
  const breakeven10Y = r2(tnx - tipYield);

  // CPI components estimated from asset price changes
  const assetInflationSignals = [
    { category: 'Energy', proxy: 'XLE', change: r2(qMap.get('XLE')?.regularMarketChangePercent || 0), weight: 7.5, signal: (qMap.get('XLE')?.regularMarketChangePercent || 0) > 2 ? 'Rising' : 'Stable' },
    { category: 'Food', proxy: 'DBA', change: r2(qMap.get('DBA')?.regularMarketChangePercent || 0), weight: 13.5, signal: (qMap.get('DBA')?.regularMarketChangePercent || 0) > 1 ? 'Rising' : 'Stable' },
    { category: 'Commodities', proxy: 'DBC', change: r2(qMap.get('DBC')?.regularMarketChangePercent || 0), weight: 5, signal: (qMap.get('DBC')?.regularMarketChangePercent || 0) > 1 ? 'Rising' : 'Stable' },
    { category: 'Gold (Hedge)', proxy: 'GLD', change: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), weight: 0, signal: (qMap.get('GLD')?.regularMarketChangePercent || 0) > 1 ? 'Inflationary' : 'Neutral' },
  ];

  const tipsPerformance = ['TIP', 'STIP', 'VTIP'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) };
  });

  const inflationHedges = ['GLD', 'SLV', 'DBA', 'DBC', 'XLE'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) };
  });

  const summary = {
    breakeven10Y, nominalYield10Y: r2(tnx), tipsYield: r2(tipYield),
    inflationOutlook: breakeven10Y > 3 ? 'Above Target' : breakeven10Y > 2 ? 'At Target' : 'Below Target',
    risingSignals: assetInflationSignals.filter(s => s.signal === 'Rising' || s.signal === 'Inflationary').length,
  };

  return { summary, assetInflationSignals, tipsPerformance, inflationHedges, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[InflationMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch inflation data' });
  }
});

export default router;
