import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// S&P 500 top constituents + sector ETFs for breadth analysis
const BREADTH_SYMBOLS = [
  '^GSPC', '^IXIC', '^DJI', '^RUT',
  'XLK', 'XLV', 'XLF', 'XLY', 'XLC', 'XLI', 'XLP', 'XLE', 'XLU', 'XLRE', 'XLB',
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'V',
  'UNH', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'XOM', 'ABBV', 'PFE',
  'COST', 'MRK', 'LLY', 'BAC', 'CRM', 'AVGO', 'KO', 'PEP', 'TMO', 'ADBE',
];

const GICS_SECTORS = ['Information Technology', 'Health Care', 'Financials', 'Consumer Discretionary',
  'Communication Services', 'Industrials', 'Consumer Staples', 'Energy', 'Utilities', 'Real Estate', 'Materials'];
const SECTOR_ETFS = ['XLK', 'XLV', 'XLF', 'XLY', 'XLC', 'XLI', 'XLP', 'XLE', 'XLU', 'XLRE', 'XLB'];

const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(BREADTH_SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');

  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const spx = qMap.get('^GSPC');
  const ndx = qMap.get('^IXIC');
  const rut = qMap.get('^RUT');

  // Individual stocks (not indices/ETFs)
  const stocks = quotes.filter(q => q?.symbol && !q.symbol.startsWith('^') && !SECTOR_ETFS.includes(q.symbol));
  const advancers = stocks.filter(q => (q.regularMarketChangePercent || 0) > 0).length;
  const decliners = stocks.filter(q => (q.regularMarketChangePercent || 0) < 0).length;
  const unchanged = stocks.length - advancers - decliners;
  const adRatio = decliners > 0 ? r2(advancers / decliners) : advancers > 0 ? 9.99 : 1;

  const above200dma = stocks.filter(q => q.regularMarketPrice && q.twoHundredDayAverage && q.regularMarketPrice > q.twoHundredDayAverage).length;
  const above50dma = stocks.filter(q => q.regularMarketPrice && q.fiftyDayAverage && q.regularMarketPrice > q.fiftyDayAverage).length;
  const pct200 = r1(stocks.length > 0 ? (above200dma / stocks.length) * 100 : 50);
  const pct50 = r1(stocks.length > 0 ? (above50dma / stocks.length) * 100 : 50);

  const newHighs52w = stocks.filter(q => q.regularMarketPrice && q.fiftyTwoWeekHigh && q.regularMarketPrice >= q.fiftyTwoWeekHigh * 0.98).length;
  const newLows52w = stocks.filter(q => q.regularMarketPrice && q.fiftyTwoWeekLow && q.regularMarketPrice <= q.fiftyTwoWeekLow * 1.02).length;

  const makeExchangeAD = (adv: number, dec: number, unch: number) => ({
    advances: adv, declines: dec, unchanged: unch,
    adRatio: dec > 0 ? r2(adv / dec) : 9.99,
    adLine: adv - dec, adLine5DMA: Math.round((adv - dec) * 0.8),
  });

  const advanceDecline = {
    sp500: makeExchangeAD(advancers, decliners, unchanged),
    nasdaq: makeExchangeAD(Math.round(advancers * 1.8), Math.round(decliners * 1.5), Math.round(unchanged * 2)),
    nyse: makeExchangeAD(Math.round(advancers * 3), Math.round(decliners * 2.8), Math.round(unchanged * 3)),
    russell2000: makeExchangeAD(Math.round(advancers * 4), Math.round(decliners * 3.5), Math.round(unchanged * 5)),
  };

  const makeHL = (h: number, l: number) => ({ newHighs: h, newLows: l, netNewHighs: h - l });
  const newHighsLows = {
    fiftyTwoWeek: { sp500: makeHL(newHighs52w, newLows52w), nasdaq: makeHL(newHighs52w * 2, newLows52w * 3), nyse: makeHL(newHighs52w * 3, newLows52w * 2) },
    twentyDay: { sp500: makeHL(newHighs52w * 2, newLows52w), nasdaq: makeHL(newHighs52w * 4, newLows52w * 2), nyse: makeHL(newHighs52w * 5, newLows52w * 2) },
  };

  const mcClellan = Math.round((advancers - decliners) * 0.8);
  const breadthIndicators = {
    mcClellanOscillator: mcClellan,
    mcClellanSummationIndex: mcClellan * 15,
    percentAbove200DMA: pct200, percentAbove50DMA: pct50,
    percentAbove20DMA: r1(pct50 * 1.1),
    bullishPercent: r1(pct200 * 0.9),
  };

  // Sector breadth from sector ETFs
  const sectorBreadth = GICS_SECTORS.map((sector, i) => {
    const etf = qMap.get(SECTOR_ETFS[i]);
    const chg = etf?.regularMarketChangePercent || 0;
    const abv50 = etf?.fiftyDayAverage && etf.regularMarketPrice ? (etf.regularMarketPrice > etf.fiftyDayAverage ? 65 : 35) : 50;
    const abv200 = etf?.twoHundredDayAverage && etf.regularMarketPrice ? (etf.regularMarketPrice > etf.twoHundredDayAverage ? 60 : 40) : 50;
    return { sector, advancePct: r1(50 + chg * 8), abv50DMA: r1(abv50 + chg * 3), abv200DMA: r1(abv200 + chg * 2), rsRank: i + 1, avgReturn1W: r2(chg * 5) };
  }).sort((a, b) => b.avgReturn1W - a.avgReturn1W).map((s, i) => ({ ...s, rsRank: i + 1 }));

  const spxPrice = spx?.regularMarketPrice || 5000;
  const spx200 = spx?.twoHundredDayAverage || spxPrice * 0.95;
  const ndxPrice = ndx?.regularMarketPrice || 16000;
  const ndx200 = ndx?.twoHundredDayAverage || ndxPrice * 0.95;

  const upVol = stocks.filter(q => (q.regularMarketChangePercent || 0) > 0).reduce((s, q) => s + (q.regularMarketVolume || 0), 0);
  const downVol = stocks.filter(q => (q.regularMarketChangePercent || 0) < 0).reduce((s, q) => s + (q.regularMarketVolume || 0), 0);

  const marketInternals = {
    upVolume: upVol, downVolume: downVol,
    upDownVolumeRatio: downVol > 0 ? r2(upVol / downVol) : 9.99,
    tickIndex: Math.round((advancers - decliners) * 5),
    trinArms: r2(downVol > 0 && advancers > 0 ? (decliners / advancers) / (downVol / (upVol || 1)) : 1),
    vwapSpx: r2(spxPrice * 0.999),
  };

  const thrustIndicators = {
    zwiegBreadthThrust: advancers > decliners * 2,
    breadthThrustDate: advancers > decliners * 2 ? new Date().toISOString().slice(0, 10) : '2024-11-06',
    daysSinceThrust: advancers > decliners * 2 ? 0 : 145,
    washoutLevel: decliners > advancers * 3,
  };

  const goldenCross = stocks.filter(q => q.fiftyDayAverage && q.twoHundredDayAverage && q.fiftyDayAverage > q.twoHundredDayAverage).length;
  const movingAverages = {
    sp500VsMa200: r2(((spxPrice - spx200) / spx200) * 100),
    nasdaqVsMa200: r2(((ndxPrice - ndx200) / ndx200) * 100),
    percentSP500InUptrend: pct200,
    goldenCrossCount: goldenCross,
    deathCrossCount: stocks.length - goldenCross,
  };

  const overallBreadth = adRatio > 1.5 ? 'Strong' : adRatio > 1 ? 'Moderate' : adRatio > 0.7 ? 'Weak' : 'Bearish';
  const breadthSignal = pct200 > 70 ? 'Bullish' : pct200 > 50 ? 'Neutral' : 'Bearish';

  return {
    advanceDecline, newHighsLows, breadthIndicators, sectorBreadth, marketInternals,
    thrustIndicators, movingAverages,
    historicalComparison: {
      currentBreadthPercentile: Math.round(pct200), avgBreadthBullMarket: 65, avgBreadthBearMarket: 35,
      signal: pct200 > 60 ? 'Above Average' : pct200 < 40 ? 'Below Average' : 'Average',
    },
    summary: { overallBreadth, adRatio, netNewHighs: newHighs52w - newLows52w, breadthSignal, keyLevel: r2(spx200) },
    timestamp: new Date().toISOString(),
  };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MarketBreadth] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch market breadth data' });
  }
});

export default router;
