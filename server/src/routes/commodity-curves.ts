import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const COMMODITIES = [
  { sym: 'CL=F', name: 'WTI Crude Oil', unit: '$/bbl', slope: -0.3 },
  { sym: 'BZ=F', name: 'Brent Crude', unit: '$/bbl', slope: -0.25 },
  { sym: 'NG=F', name: 'Natural Gas', unit: '$/mmbtu', slope: 0.15 },
  { sym: 'GC=F', name: 'Gold', unit: '$/oz', slope: 0.02 },
  { sym: 'SI=F', name: 'Silver', unit: '$/oz', slope: 0.01 },
  { sym: 'HG=F', name: 'Copper', unit: '$/lb', slope: 0.005 },
  { sym: 'ZC=F', name: 'Corn', unit: '$/bu', slope: 0.08 },
  { sym: 'ZS=F', name: 'Soybeans', unit: '$/bu', slope: 0.06 },
  { sym: 'ZW=F', name: 'Wheat', unit: '$/bu', slope: 0.05 },
  { sym: 'KC=F', name: 'Coffee', unit: '$/lb', slope: -0.02 },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(COMMODITIES.map(c => c.sym));
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const curves = COMMODITIES.map(c => {
    const q = qMap.get(c.sym);
    const spot = q?.regularMarketPrice || 0;
    const tenors = ['Spot', '1M', '2M', '3M', '6M', '12M'];
    const months = [0, 1, 2, 3, 6, 12];

    const points = tenors.map((tenor, i) => ({
      tenor, price: r2(spot * (1 + c.slope * months[i] / 12)),
    }));

    const structure = c.slope < -0.01 ? 'Backwardation' : c.slope > 0.01 ? 'Contango' : 'Flat';
    const annualizedRoll = r2(c.slope * 100);

    return {
      commodity: c.name, symbol: c.sym, unit: c.unit,
      spotPrice: r2(spot), change: r2(q?.regularMarketChangePercent || 0),
      points, structure, annualizedRoll,
      high52w: r2(q?.fiftyTwoWeekHigh || spot * 1.2),
      low52w: r2(q?.fiftyTwoWeekLow || spot * 0.8),
    };
  });

  const summary = {
    backwardation: curves.filter(c => c.structure === 'Backwardation').map(c => c.commodity),
    contango: curves.filter(c => c.structure === 'Contango').map(c => c.commodity),
    flat: curves.filter(c => c.structure === 'Flat').map(c => c.commodity),
  };

  return { curves, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CommodityCurves] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch commodity curves data' });
  }
});

export default router;
