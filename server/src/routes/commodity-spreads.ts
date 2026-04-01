import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Commodity futures for spread calculations
const SYMBOLS = [
  'CL=F', 'BZ=F', // WTI vs Brent
  'GC=F', 'SI=F', // Gold/Silver
  'ZC=F', 'ZW=F', 'ZS=F', // Corn/Wheat/Soybeans
  'NG=F', 'HG=F', // Nat Gas, Copper
  'RB=F', 'HO=F', // Gasoline, Heating Oil
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const p = (sym: string) => qMap.get(sym)?.regularMarketPrice || 0;
  const chg = (sym: string) => qMap.get(sym)?.regularMarketChangePercent || 0;

  const interCommodity = [
    { name: 'WTI-Brent Spread', leg1: 'CL=F', leg2: 'BZ=F', value: r2(p('CL=F') - p('BZ=F')), unit: '$/bbl', historical: -3.5, signal: p('CL=F') - p('BZ=F') > -2 ? 'Narrowing' : 'Wide' },
    { name: 'Gold/Silver Ratio', leg1: 'GC=F', leg2: 'SI=F', value: r1(p('SI=F') > 0 ? p('GC=F') / p('SI=F') : 80), unit: 'ratio', historical: 80, signal: (p('SI=F') > 0 ? p('GC=F') / p('SI=F') : 80) > 85 ? 'Silver Undervalued' : 'Normal' },
    { name: 'Corn/Wheat Ratio', leg1: 'ZC=F', leg2: 'ZW=F', value: r2(p('ZW=F') > 0 ? p('ZC=F') / p('ZW=F') : 0.75), unit: 'ratio', historical: 0.75, signal: 'Normal' },
    { name: 'Crack Spread (3-2-1)', leg1: 'CL=F', leg2: 'RB=F', value: r2(p('RB=F') * 42 * 2/3 + p('HO=F') * 42 * 1/3 - p('CL=F')), unit: '$/bbl', historical: 25, signal: 'Monitor' },
    { name: 'Soybean Crush', leg1: 'ZS=F', leg2: 'ZM=F', value: r2(p('ZS=F') * 0.8), unit: '$/bu', historical: 1.5, signal: 'Normal' },
    { name: 'Frac Spread (NGL-Gas)', leg1: 'NG=F', leg2: 'CL=F', value: r2(p('CL=F') / 6 - p('NG=F')), unit: '$/mmbtu', historical: 8, signal: p('CL=F') / 6 - p('NG=F') > 10 ? 'Wide' : 'Normal' },
  ];

  const commodityPrices = SYMBOLS.map(sym => {
    const q = qMap.get(sym);
    return { symbol: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChange || 0), changePct: r2(q?.regularMarketChangePercent || 0) };
  });

  const summary = {
    totalSpreads: interCommodity.length,
    wideSpreads: interCommodity.filter(s => s.signal === 'Wide').length,
    narrowingSpreads: interCommodity.filter(s => s.signal === 'Narrowing').length,
  };

  return { interCommodity, commodityPrices, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CommoditySpreads] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch commodity spreads data' });
  }
});

export default router;
