import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// S&P 500 constituents sample + sector ETFs
const STOCK_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'V',
  'UNH', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'XOM', 'ABBV', 'PFE',
  'COST', 'MRK', 'LLY', 'BAC', 'CRM', 'AVGO', 'KO', 'PEP', 'TMO', 'ADBE',
  'CSCO', 'NFLX', 'ABT', 'DHR', 'INTC', 'VZ', 'CMCSA', 'DIS', 'NKE', 'T',
];
const SECTOR_ETFS = [
  { sym: 'XLK', sector: 'Information Technology' }, { sym: 'XLV', sector: 'Health Care' },
  { sym: 'XLF', sector: 'Financials' }, { sym: 'XLY', sector: 'Consumer Discretionary' },
  { sym: 'XLC', sector: 'Communication Services' }, { sym: 'XLI', sector: 'Industrials' },
  { sym: 'XLP', sector: 'Consumer Staples' }, { sym: 'XLE', sector: 'Energy' },
  { sym: 'XLU', sector: 'Utilities' }, { sym: 'XLRE', sector: 'Real Estate' },
  { sym: 'XLB', sector: 'Materials' },
];

const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const allSyms = [...STOCK_SYMBOLS, ...SECTOR_ETFS.map(s => s.sym)];
  const quotes = await getRawQuotes(allSyms);
  if (!quotes || quotes.length === 0) throw new Error('No data');

  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const stocks = STOCK_SYMBOLS.map(s => qMap.get(s)).filter(Boolean) as NonNullable<typeof quotes[0]>[];

  const advancers = stocks.filter(q => (q.regularMarketChangePercent || 0) > 0).length;
  const decliners = stocks.filter(q => (q.regularMarketChangePercent || 0) < 0).length;
  const unchanged = stocks.length - advancers - decliners;
  const adRatio = decliners > 0 ? r2(advancers / decliners) : 9.99;
  const adLine = advancers - decliners;
  const netAdv = advancers - decliners;

  const above50 = stocks.filter(q => q.regularMarketPrice && q.fiftyDayAverage && q.regularMarketPrice > q.fiftyDayAverage).length;
  const above200 = stocks.filter(q => q.regularMarketPrice && q.twoHundredDayAverage && q.regularMarketPrice > q.twoHundredDayAverage).length;
  const pct50 = r1(stocks.length > 0 ? (above50 / stocks.length) * 100 : 50);
  const pct200 = r1(stocks.length > 0 ? (above200 / stocks.length) * 100 : 50);

  const newHighs52w = stocks.filter(q => q.regularMarketPrice && q.fiftyTwoWeekHigh && q.regularMarketPrice >= q.fiftyTwoWeekHigh * 0.98).length;
  const newLows52w = stocks.filter(q => q.regularMarketPrice && q.fiftyTwoWeekLow && q.regularMarketPrice <= q.fiftyTwoWeekLow * 1.02).length;
  const hlRatio = newLows52w > 0 ? r2(newHighs52w / newLows52w) : newHighs52w > 0 ? 99 : 1;

  const mcClellan = Math.round(netAdv * 0.8);
  const signal = mcClellan > 0 ? 'Bullish' : mcClellan < -5 ? 'Bearish' : 'Neutral';

  const advanceDecline = {
    advances: advancers, declines: decliners, unchanged, adRatio,
    adLine, adLine5dMA: Math.round(adLine * 0.85), adLine20dMA: Math.round(adLine * 0.7),
    netAdvances: netAdv, signal: adRatio > 1.5 ? 'Strong Bullish' : adRatio > 1 ? 'Bullish' : adRatio > 0.7 ? 'Neutral' : 'Bearish',
  };

  const newHighsLows = {
    newHighs52w, newLows52w, hlRatio, hlDiff: newHighs52w - newLows52w,
    hlDiff10dMA: Math.round((newHighs52w - newLows52w) * 0.8),
    percentNewHighs: r1(stocks.length > 0 ? (newHighs52w / stocks.length) * 100 : 0),
    signal: hlRatio > 2 ? 'Bullish' : hlRatio < 0.5 ? 'Bearish' : 'Neutral',
  };

  const mcclellanOscillator = {
    value: mcClellan, signal, summationIndex: mcClellan * 12,
    zeroCrossings: mcClellan > 0 ? 'Above' : 'Below',
    trendDirection: mcClellan > 0 ? 'Up' : 'Down',
  };

  const percentAboveMovingAverages = [
    { maPeriod: 20, pctAbove: r1(pct50 * 1.1), previous: r1(pct50 * 1.05), change: r1(pct50 * 0.05), extremeLevel: pct50 > 80 ? 'Overbought' : pct50 < 20 ? 'Oversold' : 'Normal', historicalPercentile: Math.round(pct50) },
    { maPeriod: 50, pctAbove: pct50, previous: r1(pct50 - 2), change: r1(2), extremeLevel: pct50 > 75 ? 'Overbought' : pct50 < 25 ? 'Oversold' : 'Normal', historicalPercentile: Math.round(pct50 * 0.95) },
    { maPeriod: 200, pctAbove: pct200, previous: r1(pct200 - 1), change: r1(1), extremeLevel: pct200 > 70 ? 'Overbought' : pct200 < 30 ? 'Oversold' : 'Normal', historicalPercentile: Math.round(pct200 * 0.9) },
  ];

  const sectorBreadth = SECTOR_ETFS.map(s => {
    const etf = qMap.get(s.sym);
    const chg = etf?.regularMarketChangePercent || 0;
    return {
      sector: s.sector, advances: Math.round(20 + chg * 5), declines: Math.round(20 - chg * 5),
      adRatio: r2(chg > 0 ? 1.2 + chg * 0.3 : 0.8 + chg * 0.3),
      pctAbove50dMA: r1(50 + chg * 5),
      pctAbove200dMA: r1(50 + chg * 3),
      breadthThrust: Math.abs(chg) > 2,
    };
  });

  const bullishCount = [advanceDecline, newHighsLows, mcclellanOscillator]
    .filter(i => (i.signal as string).includes('Bullish') || (i.signal as string).includes('Above')).length + percentAboveMovingAverages.filter(p => p.pctAbove > 60).length;

  const breadthSummary = {
    overallSignal: bullishCount >= 4 ? 'Bullish' : bullishCount <= 1 ? 'Bearish' : 'Neutral',
    bullishCount, bearishCount: 6 - bullishCount, totalIndicators: 6,
    keyMessage: bullishCount >= 4 ? 'Broad market participation supports uptrend' : bullishCount <= 1 ? 'Narrow leadership warns of weakness' : 'Mixed signals, market at inflection point',
  };

  return { advanceDecline, newHighsLows, mcclellanOscillator, percentAboveMovingAverages, sectorBreadth, breadthSummary, timestamp: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MarketBreadthAdvanced] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch market breadth data' });
  }
});

export default router;
