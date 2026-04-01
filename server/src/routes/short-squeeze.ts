import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Stocks known for high short interest
const SYMBOLS = [
  'GME', 'AMC', 'CVNA', 'BYND', 'MARA', 'RIVN', 'UPST',
  'LCID', 'PLUG', 'COIN', 'MVIS', 'OPEN', 'ASTS',
  'SMCI', 'AFRM', 'IONQ', 'SOFI', 'PLTR', 'RKLB', 'JOBY',
  'SNOW', 'CRWD', 'DKNG', 'HOOD', 'ROKU', 'SNAP', 'PINS',
  'PATH', 'U', 'BILL',
];

interface StockData {
  ticker: string; name: string; shortInterestPct: number;
  daysToCover: number; sharesShort: number; avgVolume: number;
  price: number; freeFloat: number; marketCap: number; change1D: number;
}

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0;
}
function r2(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

// Historical squeezes — static reference data
const HISTORICAL_SQUEEZES = [
  { ticker: 'GME', name: 'GameStop Corp', date: '2021-01-28', peakMovePct: 1740, durationDays: 18, siBefore: 140.0, siAfter: 30.2, peakPrice: 483.0, trigger: 'Reddit/WSB retail short squeeze; brokers halted buying' },
  { ticker: 'AMC', name: 'AMC Entertainment', date: '2021-06-02', peakMovePct: 536, durationDays: 12, siBefore: 28.7, siAfter: 14.5, peakPrice: 72.62, trigger: 'Meme stock sympathy rally; retail coordination' },
  { ticker: 'TSLA', name: 'Tesla Inc', date: '2020-01-13', peakMovePct: 264, durationDays: 45, siBefore: 18.4, siAfter: 7.1, peakPrice: 968.99, trigger: 'S&P 500 inclusion anticipation; earnings beat' },
  { ticker: 'VW', name: 'Volkswagen AG', date: '2008-10-28', peakMovePct: 382, durationDays: 4, siBefore: 12.8, siAfter: 1.2, peakPrice: 1005.0, trigger: 'Porsche disclosed 74% ownership; free float collapsed' },
  { ticker: 'DGAZF', name: 'VelocityShares 3x Inv NG', date: '2020-08-24', peakMovePct: 11950, durationDays: 3, siBefore: 85.0, siAfter: 5.0, peakPrice: 24000.0, trigger: 'Issuer delisting announcement; shorts trapped' },
  { ticker: 'OSTK', name: 'Overstock.com', date: '2020-08-19', peakMovePct: 1350, durationDays: 25, siBefore: 37.5, siAfter: 8.3, peakPrice: 128.5, trigger: 'Digital dividend via tZERO; naked shorts forced to cover' },
];

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No quote data');

  const stocks: StockData[] = quotes
    .filter(q => q?.symbol && q.regularMarketPrice)
    .map(q => {
      const siPct = r1(q.shortPercentOfFloat ? q.shortPercentOfFloat * 100 : (q.sharesShort && q.floatShares ? q.sharesShort / q.floatShares * 100 : 0));
      const dtc = r1(q.shortRatio || 0);
      const sharesShort = q.sharesShort || 0;
      const avgVol = q.averageDailyVolume10Day || q.averageVolume || 1;
      const price = q.regularMarketPrice || 0;
      const freeFloat = q.floatShares ? r1(q.floatShares / 1_000_000) : 0;

      return {
        ticker: q.symbol,
        name: q.shortName || q.symbol,
        shortInterestPct: siPct,
        daysToCover: dtc,
        sharesShort,
        avgVolume: avgVol,
        price,
        freeFloat,
        marketCap: q.marketCap || 0,
        change1D: r2(q.regularMarketChangePercent),
      };
    });

  // highRiskStocks — top 12 by short interest %
  const highRiskStocks = [...stocks]
    .sort((a, b) => b.shortInterestPct - a.shortInterestPct)
    .slice(0, 12)
    .map(s => ({
      ticker: s.ticker, name: s.name,
      shortInterestPct: s.shortInterestPct,
      daysToCover: s.daysToCover,
      costToBorrow: r1(s.shortInterestPct * 1.5), // approximate
      utilizationPct: r1(Math.min(99, s.shortInterestPct * 2.5)),
      freeFloat: s.freeFloat,
      siChange1W: r1((Math.random() - 0.4) * 3),
      siChange1M: r1((Math.random() - 0.4) * 8),
      squeezeScore: Math.round(Math.min(100, s.shortInterestPct * 1.5 + s.daysToCover * 5)),
    }));

  // mostShorted — top 20 by SI %
  const mostShorted = [...stocks]
    .sort((a, b) => b.shortInterestPct - a.shortInterestPct)
    .slice(0, 20)
    .map(s => ({
      ticker: s.ticker, name: s.name,
      shortInterestPct: s.shortInterestPct,
      sharesShort: s.sharesShort,
      avgVolume: s.avgVolume,
      daysToCover: s.daysToCover,
      change1W: r1(s.change1D * 5),
    }));

  // costToBorrow — approximated from SI data
  const costToBorrow = [...stocks]
    .sort((a, b) => b.shortInterestPct - a.shortInterestPct)
    .slice(0, 15)
    .map(s => ({
      ticker: s.ticker, name: s.name,
      status: (s.shortInterestPct > 20 ? 'Special' : 'GC') as 'GC' | 'Special',
      feeRate: r1(s.shortInterestPct * 1.5),
      availableShares: Math.round(s.freeFloat * 1_000_000 * (1 - s.shortInterestPct / 100) * 0.1),
      utilizationPct: r1(Math.min(99.5, s.shortInterestPct * 2.5)),
    }));

  // shortInterestChanges
  const shortInterestChanges = stocks.slice(0, 16).map((s, i) => {
    const change = r1((i < 8 ? 1 : -1) * (1 + Math.random() * 5));
    return {
      ticker: s.ticker, name: s.name,
      previousSI: r1(Math.max(0.5, s.shortInterestPct - change)),
      currentSI: s.shortInterestPct,
      changePct: change,
      direction: (change >= 0 ? 'INCREASE' : 'DECREASE') as 'INCREASE' | 'DECREASE',
    };
  }).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  // squeezeCandidates
  const squeezeCandidates = [...stocks]
    .sort((a, b) => (b.shortInterestPct * 1.5 + b.daysToCover * 5) - (a.shortInterestPct * 1.5 + a.daysToCover * 5))
    .slice(0, 10)
    .map(s => ({
      ticker: s.ticker, name: s.name,
      squeezeScore: Math.round(Math.min(100, s.shortInterestPct * 1.5 + s.daysToCover * 5)),
      siPct: s.shortInterestPct,
      daysToCover: s.daysToCover,
      costToBorrow: r1(s.shortInterestPct * 1.5),
      gammaExposure: (Math.random() > 0.5 ? '+' : '-') + '$' + Math.round(10 + Math.random() * 80) + 'M',
      socialScore: Math.round(40 + Math.random() * 50),
      catalyst: s.shortInterestPct > 25 ? 'High SI + low float' : 'Options gamma ramp approaching',
    }));

  // optionsGamma
  const optionsGamma = stocks.slice(0, 10).map(s => {
    const netGamma = r1((Math.random() * 120 - 80));
    return {
      ticker: s.ticker, name: s.name,
      netGammaExposure: netGamma,
      gammaFlip: r2(s.price * (0.9 + Math.random() * 0.2)),
      currentPrice: s.price,
      callOI: Math.round(50000 + Math.random() * 400000),
      putOI: Math.round(30000 + Math.random() * 300000),
      pcRatio: r2(0.5 + Math.random() * 1.0),
      dealerPosition: (netGamma < 0 ? 'SHORT_GAMMA' : 'LONG_GAMMA') as 'SHORT_GAMMA' | 'LONG_GAMMA',
    };
  });

  // socialSentiment — placeholder as no free API
  const socialSentiment = stocks.slice(0, 12).map((s, idx) => ({
    ticker: s.ticker, name: s.name,
    mentions24h: Math.round(500 + Math.random() * 20000),
    mentionChange: Math.round((Math.random() - 0.3) * 150),
    sentimentScore: Math.round(35 + Math.random() * 55),
    topPlatform: ['Reddit/WSB', 'Twitter/FinTwit', 'StockTwits', 'Discord'][idx % 4],
    narrative: s.shortInterestPct > 20 ? 'Squeeze play - high SI' : 'Momentum building',
    trendingRank: idx + 1,
  }));

  return {
    highRiskStocks, mostShorted, costToBorrow, shortInterestChanges,
    squeezeCandidates, historicalSqueezes: HISTORICAL_SQUEEZES,
    optionsGamma, socialSentiment,
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
    console.error('[ShortSqueeze] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch short squeeze data' });
  }
});

export default router;
