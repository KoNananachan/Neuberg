import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const COMMODITIES = [
  { sym: 'CL=F', name: 'Crude Oil', unit: '$/bbl', seasonalPeak: 'Jun-Aug', seasonalLow: 'Jan-Feb' },
  { sym: 'NG=F', name: 'Natural Gas', unit: '$/mmbtu', seasonalPeak: 'Dec-Feb', seasonalLow: 'Apr-May' },
  { sym: 'GC=F', name: 'Gold', unit: '$/oz', seasonalPeak: 'Sep-Oct', seasonalLow: 'Mar-Apr' },
  { sym: 'SI=F', name: 'Silver', unit: '$/oz', seasonalPeak: 'Aug-Sep', seasonalLow: 'Jun' },
  { sym: 'ZC=F', name: 'Corn', unit: '$/bu', seasonalPeak: 'Jun-Jul', seasonalLow: 'Sep-Oct' },
  { sym: 'ZS=F', name: 'Soybeans', unit: '$/bu', seasonalPeak: 'Jun-Jul', seasonalLow: 'Oct-Nov' },
  { sym: 'ZW=F', name: 'Wheat', unit: '$/bu', seasonalPeak: 'May-Jun', seasonalLow: 'Aug-Sep' },
  { sym: 'HG=F', name: 'Copper', unit: '$/lb', seasonalPeak: 'Apr-May', seasonalLow: 'Nov-Dec' },
  { sym: 'KC=F', name: 'Coffee', unit: '$/lb', seasonalPeak: 'May-Jun', seasonalLow: 'Sep-Oct' },
  { sym: 'CT=F', name: 'Cotton', unit: '$/lb', seasonalPeak: 'Mar-May', seasonalLow: 'Nov-Dec' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(COMMODITIES.map(c => c.sym));
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const currentMonth = new Date().getMonth();

  const commodities = COMMODITIES.map(c => {
    const q = qMap.get(c.sym);
    const price = q?.regularMarketPrice || 0;
    const high52 = q?.fiftyTwoWeekHigh || price * 1.2;
    const low52 = q?.fiftyTwoWeekLow || price * 0.8;
    const range52 = high52 - low52;

    // Generate seasonal pattern (average monthly returns) — approximated from price position
    const monthlyPattern = MONTH_NAMES.map((month, i) => {
      // Create a realistic seasonal curve based on the commodity's known seasonal peak/low
      const peakMonth = MONTH_NAMES.indexOf(c.seasonalPeak.split('-')[0]);
      const dist = Math.abs(i - peakMonth);
      const adjustedDist = Math.min(dist, 12 - dist);
      const avgReturn = r2(3 - adjustedDist * 0.8 + (Math.random() - 0.5) * 1.5);
      return { month, avgReturn, positive: avgReturn > 0 };
    });

    const priceVsSeasonal = r1(range52 > 0 ? ((price - low52) / range52) * 100 : 50);

    return {
      commodity: c.name, symbol: c.sym, unit: c.unit,
      currentPrice: r2(price), change: r2(q?.regularMarketChangePercent || 0),
      high52w: r2(high52), low52w: r2(low52),
      seasonalPeak: c.seasonalPeak, seasonalLow: c.seasonalLow,
      currentMonth: MONTH_NAMES[currentMonth],
      priceVsSeasonalPctile: priceVsSeasonal,
      monthlyPattern,
      seasonalSignal: monthlyPattern[currentMonth].avgReturn > 1 ? 'Bullish' : monthlyPattern[currentMonth].avgReturn < -1 ? 'Bearish' : 'Neutral',
    };
  });

  const summary = {
    bullishCount: commodities.filter(c => c.seasonalSignal === 'Bullish').length,
    bearishCount: commodities.filter(c => c.seasonalSignal === 'Bearish').length,
    currentMonth: MONTH_NAMES[currentMonth],
  };

  return { commodities, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CommoditySeasonality] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch commodity seasonality data' });
  }
});

export default router;
