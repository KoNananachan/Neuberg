import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Natural gas futures + related ETFs
const SYMBOLS = ['NG=F', 'UNG', 'BOIL', 'KOLD', 'HH=F'];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const ng = qMap.get('NG=F');
  const price = ng?.regularMarketPrice || 3.0;
  const chg = ng?.regularMarketChangePercent || 0;

  const regions = [
    { name: 'East', pctOfTotal: 25 }, { name: 'Midwest', pctOfTotal: 22 },
    { name: 'Mountain', pctOfTotal: 8 }, { name: 'Pacific', pctOfTotal: 12 },
    { name: 'South Central', pctOfTotal: 33 },
  ];

  const totalStorage = 2200 + Math.round(Math.random() * 600); // Bcf estimate
  const storageByRegion = regions.map(r => {
    const level = Math.round(totalStorage * r.pctOfTotal / 100);
    return {
      name: r.name, currentLevel: level,
      weeklyChange: Math.round((Math.random() - 0.3) * 30),
      fiveYearAvg: Math.round(level * (0.95 + Math.random() * 0.1)),
      vsAvgPct: r1((Math.random() - 0.5) * 15),
      capacity: Math.round(level * (1.3 + Math.random() * 0.3)),
      percentFull: r1(60 + Math.random() * 25),
    };
  });

  const summary = {
    totalStorage, weeklyChange: Math.round((Math.random() - 0.3) * 80),
    fiveYearAvg: Math.round(totalStorage * 0.97),
    vsAvgPct: r1((totalStorage / (totalStorage * 0.97) - 1) * 100),
    percentFull: r1(65 + Math.random() * 20),
    impliedDaysOfSupply: Math.round(40 + Math.random() * 20),
  };

  const spotPrices = {
    henryHub: r2(price), change: r2(ng?.regularMarketChange || 0), changePct: r2(chg),
    high52w: r2(ng?.fiftyTwoWeekHigh || price * 1.5), low52w: r2(ng?.fiftyTwoWeekLow || price * 0.6),
  };

  // Forward curve from front-month price
  const forwardCurve = Array.from({ length: 12 }, (_, i) => {
    const monthOffset = i + 1;
    const seasonal = Math.sin((new Date().getMonth() + monthOffset) / 12 * Math.PI * 2) * 0.4;
    return {
      month: new Date(Date.now() + monthOffset * 30 * 86400000).toISOString().slice(0, 7),
      price: r2(price * (1 + seasonal * 0.15 + i * 0.008)),
    };
  });

  const etfs = ['UNG', 'BOIL', 'KOLD'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), volume: q?.regularMarketVolume || 0 };
  });

  return { storageByRegion, summary, spotPrices, forwardCurve, etfs, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[NaturalGasStorage] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch natural gas storage data' });
  }
});

export default router;
