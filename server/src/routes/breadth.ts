import { Router } from 'express';
import { ensureCrumb } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ~100 of the most liquid S&P 500 constituents
const SP500_UNIVERSE = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'UNH', 'JNJ',
  'JPM', 'V', 'XOM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'LLY',
  'PEP', 'KO', 'COST', 'AVGO', 'TMO', 'MCD', 'WMT', 'CSCO', 'ABT', 'CRM',
  'ACN', 'DHR', 'LIN', 'AMD', 'ADBE', 'TXN', 'NEE', 'PM', 'UNP', 'RTX',
  'AMGN', 'INTC', 'HON', 'LOW', 'IBM', 'QCOM', 'CAT', 'BA', 'SPGI', 'GE',
  'INTU', 'AMAT', 'DE', 'BKNG', 'ISRG', 'ADP', 'MDLZ', 'GILD', 'SYK', 'VRTX',
  'MMC', 'ADI', 'REGN', 'LRCX', 'PLD', 'ETN', 'CI', 'BDX', 'CB', 'ZTS',
  'SO', 'CME', 'DUK', 'CL', 'MO', 'BSX', 'SCHW', 'WM', 'EQIX', 'AON',
  'NOC', 'SNPS', 'ICE', 'SHW', 'CDNS', 'PNC', 'USB', 'TGT', 'FDX', 'MCO',
  'PYPL', 'F', 'GM', 'NFLX', 'ORCL', 'DIS', 'T', 'VZ', 'CMCSA', 'PFE',
];

interface YahooBreadthQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
}

interface BreadthMover {
  symbol: string;
  changePercent: number;
  price: number;
}

interface BreadthData {
  advancers: number;
  decliners: number;
  unchanged: number;
  adRatio: number;
  adLine: number;
  advanceVolume: number;
  declineVolume: number;
  volumeRatio: number;
  newHighs: number;
  newLows: number;
  aboveSMA50: number;
  aboveSMA200: number;
  upMore5: number;
  up2to5: number;
  up0to2: number;
  down0to2: number;
  down2to5: number;
  downMore5: number;
  avgChange: number;
  medianChange: number;
  totalStocks: number;
  topGainers: BreadthMover[];
  topLosers: BreadthMover[];
}

let breadthCache: BreadthData | null = null;
let breadthCacheTime = 0;
const BREADTH_TTL = 120_000; // 2 min cache

const BATCH_SIZE = 30;

async function fetchBreadthQuotes(): Promise<YahooBreadthQuote[]> {
  const auth = await ensureCrumb();
  if (!auth) throw new Error('No Yahoo crumb available');

  const results: YahooBreadthQuote[] = [];

  for (let i = 0; i < SP500_UNIVERSE.length; i += BATCH_SIZE) {
    const batch = SP500_UNIVERSE.slice(i, i + BATCH_SIZE);
    const url = `${YAHOO_API}/v7/finance/quote?symbols=${batch.map(encodeURIComponent).join(',')}&crumb=${encodeURIComponent(auth.crumb)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    });

    if (!resp.ok) {
      console.error(`[Breadth] Batch fetch failed (${resp.status}) for symbols starting at index ${i}`);
      continue;
    }

    const data = (await resp.json()) as any;
    const quotes = data?.quoteResponse?.result ?? [];
    for (const q of quotes) {
      results.push({
        symbol: q.symbol,
        regularMarketPrice: q.regularMarketPrice,
        regularMarketChangePercent: q.regularMarketChangePercent,
        regularMarketVolume: q.regularMarketVolume,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow,
        fiftyDayAverage: q.fiftyDayAverage,
        twoHundredDayAverage: q.twoHundredDayAverage,
      });
    }
  }

  return results;
}

function calculateBreadth(quotes: YahooBreadthQuote[]): BreadthData {
  let advancers = 0;
  let decliners = 0;
  let unchanged = 0;
  let advanceVolume = 0;
  let declineVolume = 0;
  let newHighs = 0;
  let newLows = 0;
  let aboveSMA50Count = 0;
  let aboveSMA200Count = 0;
  let sma50Total = 0;
  let sma200Total = 0;
  let upMore5 = 0;
  let up2to5 = 0;
  let up0to2 = 0;
  let down0to2 = 0;
  let down2to5 = 0;
  let downMore5 = 0;

  const changes: number[] = [];
  const movers: BreadthMover[] = [];

  for (const q of quotes) {
    const chg = q.regularMarketChangePercent ?? 0;
    const price = q.regularMarketPrice ?? 0;
    const vol = q.regularMarketVolume ?? 0;

    changes.push(chg);
    movers.push({ symbol: q.symbol, changePercent: chg, price });

    // Advance / Decline
    if (Math.abs(chg) < 0.01) {
      unchanged++;
    } else if (chg > 0) {
      advancers++;
      advanceVolume += vol;
    } else {
      decliners++;
      declineVolume += vol;
    }

    // 52-week highs/lows (within 2%)
    if (q.fiftyTwoWeekHigh != null && price > 0) {
      if (price >= q.fiftyTwoWeekHigh * 0.98) newHighs++;
    }
    if (q.fiftyTwoWeekLow != null && price > 0) {
      if (price <= q.fiftyTwoWeekLow * 1.02) newLows++;
    }

    // SMA breadth
    if (q.fiftyDayAverage != null && price > 0) {
      sma50Total++;
      if (price > q.fiftyDayAverage) aboveSMA50Count++;
    }
    if (q.twoHundredDayAverage != null && price > 0) {
      sma200Total++;
      if (price > q.twoHundredDayAverage) aboveSMA200Count++;
    }

    // Change distribution
    if (chg > 5) upMore5++;
    else if (chg > 2) up2to5++;
    else if (chg >= 0) up0to2++;
    else if (chg > -2) down0to2++;
    else if (chg > -5) down2to5++;
    else downMore5++;
  }

  const totalStocks = quotes.length;
  const avgChange = totalStocks > 0 ? changes.reduce((s, c) => s + c, 0) / totalStocks : 0;

  // Median
  const sorted = changes.slice().sort((a, b) => a - b);
  const medianChange = totalStocks > 0
    ? totalStocks % 2 === 0
      ? (sorted[totalStocks / 2 - 1] + sorted[totalStocks / 2]) / 2
      : sorted[Math.floor(totalStocks / 2)]
    : 0;

  // Top movers
  const sortedMovers = movers.slice().sort((a, b) => b.changePercent - a.changePercent);
  const topGainers = sortedMovers.slice(0, 5).map(m => ({
    symbol: m.symbol,
    changePercent: Math.round(m.changePercent * 100) / 100,
    price: Math.round(m.price * 100) / 100,
  }));
  const topLosers = sortedMovers.slice(-5).reverse().map(m => ({
    symbol: m.symbol,
    changePercent: Math.round(m.changePercent * 100) / 100,
    price: Math.round(m.price * 100) / 100,
  }));

  const adRatio = decliners > 0 ? Math.round((advancers / decliners) * 100) / 100 : advancers > 0 ? 999 : 0;
  const volumeRatio = declineVolume > 0 ? Math.round((advanceVolume / declineVolume) * 100) / 100 : advanceVolume > 0 ? 999 : 0;
  const aboveSMA50 = sma50Total > 0 ? Math.round((aboveSMA50Count / sma50Total) * 10000) / 100 : 0;
  const aboveSMA200 = sma200Total > 0 ? Math.round((aboveSMA200Count / sma200Total) * 10000) / 100 : 0;

  return {
    advancers,
    decliners,
    unchanged,
    adRatio,
    adLine: advancers - decliners,
    advanceVolume,
    declineVolume,
    volumeRatio,
    newHighs,
    newLows,
    aboveSMA50,
    aboveSMA200,
    upMore5,
    up2to5,
    up0to2,
    down0to2,
    down2to5,
    downMore5,
    avgChange: Math.round(avgChange * 100) / 100,
    medianChange: Math.round(medianChange * 100) / 100,
    totalStocks,
    topGainers,
    topLosers,
  };
}

const router = Router();

// GET /api/breadth - market breadth indicators
router.get('/', async (_req, res) => {
  try {
    if (breadthCache && Date.now() - breadthCacheTime < BREADTH_TTL) {
      return res.json(breadthCache);
    }

    const quotes = await fetchBreadthQuotes();
    if (quotes.length === 0) {
      return res.status(503).json({ error: 'Market breadth data temporarily unavailable' });
    }

    breadthCache = calculateBreadth(quotes);
    breadthCacheTime = Date.now();
    res.json(breadthCache);
  } catch (err) {
    console.error('[Breadth] Error fetching breadth data:', err instanceof Error ? err.message : err);
    if (breadthCache) return res.json(breadthCache);
    res.status(503).json({ error: 'Market breadth data temporarily unavailable' });
  }
});

export default router;
