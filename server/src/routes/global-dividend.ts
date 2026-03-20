import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface StockDef {
  ticker: string;
  name: string;
  exchange: string;
  region: 'Americas' | 'EMEA' | 'Asia-Pacific';
  basePrice: number;
  dividendPerShare: number;
  frequency: 'Quarterly' | 'Semi-Annual' | 'Annual';
  payoutRatioBase: number;
  dividendGrowth5Y: number;
  consecutiveYears: number;
  sector: string;
  currency: string;
}

interface DividendStock {
  ticker: string;
  name: string;
  exchange: string;
  region: 'Americas' | 'EMEA' | 'Asia-Pacific';
  price: number;
  dividendPerShare: number;
  dividendYield: number;
  exDivDate: string;
  payDate: string;
  frequency: 'Quarterly' | 'Semi-Annual' | 'Annual';
  payoutRatio: number;
  dividendGrowth5Y: number;
  consecutiveYears: number;
  sector: string;
  currency: string;
}

interface UpcomingExDiv {
  ticker: string;
  name: string;
  exDivDate: string;
  amount: number;
  yield: number;
}

interface DividendSummary {
  avgYield: number;
  highestYield: { ticker: string; yield: number };
  totalDividendsPaid: number;
  avgPayoutRatio: number;
  avgGrowth5Y: number;
  stocksExDivThisWeek: number;
}

interface GlobalDividendResponse {
  stocks: DividendStock[];
  upcoming: UpcomingExDiv[];
  summary: DividendSummary;
  timestamp: string;
}

// ── Stock universe: 25 high-dividend global stocks ──

const STOCK_DEFS: StockDef[] = [
  // Americas
  { ticker: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', region: 'Americas', basePrice: 157, dividendPerShare: 4.76, frequency: 'Quarterly', payoutRatioBase: 44, dividendGrowth5Y: 5.6, consecutiveYears: 62, sector: 'Healthcare', currency: 'USD' },
  { ticker: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE', region: 'Americas', basePrice: 164, dividendPerShare: 3.76, frequency: 'Quarterly', payoutRatioBase: 60, dividendGrowth5Y: 5.5, consecutiveYears: 68, sector: 'Consumer', currency: 'USD' },
  { ticker: 'KO', name: 'Coca-Cola Co.', exchange: 'NYSE', region: 'Americas', basePrice: 62, dividendPerShare: 1.94, frequency: 'Quarterly', payoutRatioBase: 72, dividendGrowth5Y: 3.2, consecutiveYears: 62, sector: 'Consumer', currency: 'USD' },
  { ticker: 'PEP', name: 'PepsiCo Inc.', exchange: 'NYSE', region: 'Americas', basePrice: 172, dividendPerShare: 5.06, frequency: 'Quarterly', payoutRatioBase: 66, dividendGrowth5Y: 6.8, consecutiveYears: 52, sector: 'Consumer', currency: 'USD' },
  { ticker: 'T', name: 'AT&T Inc.', exchange: 'NYSE', region: 'Americas', basePrice: 17.5, dividendPerShare: 1.11, frequency: 'Quarterly', payoutRatioBase: 55, dividendGrowth5Y: -5.0, consecutiveYears: 2, sector: 'Telecom', currency: 'USD' },
  { ticker: 'VZ', name: 'Verizon Communications Inc.', exchange: 'NYSE', region: 'Americas', basePrice: 39, dividendPerShare: 2.66, frequency: 'Quarterly', payoutRatioBase: 57, dividendGrowth5Y: 1.9, consecutiveYears: 19, sector: 'Telecom', currency: 'USD' },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', exchange: 'NYSE', region: 'Americas', basePrice: 108, dividendPerShare: 3.80, frequency: 'Quarterly', payoutRatioBase: 42, dividendGrowth5Y: 3.0, consecutiveYears: 41, sector: 'Energy', currency: 'USD' },
  { ticker: 'CVX', name: 'Chevron Corp.', exchange: 'NYSE', region: 'Americas', basePrice: 158, dividendPerShare: 6.04, frequency: 'Quarterly', payoutRatioBase: 47, dividendGrowth5Y: 6.0, consecutiveYears: 37, sector: 'Energy', currency: 'USD' },
  { ticker: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', region: 'Americas', basePrice: 168, dividendPerShare: 6.20, frequency: 'Quarterly', payoutRatioBase: 48, dividendGrowth5Y: 8.5, consecutiveYears: 52, sector: 'Healthcare', currency: 'USD' },
  { ticker: 'MO', name: 'Altria Group Inc.', exchange: 'NYSE', region: 'Americas', basePrice: 45, dividendPerShare: 3.92, frequency: 'Quarterly', payoutRatioBase: 78, dividendGrowth5Y: 4.2, consecutiveYears: 54, sector: 'Consumer', currency: 'USD' },
  { ticker: 'PM', name: 'Philip Morris International', exchange: 'NYSE', region: 'Americas', basePrice: 102, dividendPerShare: 5.20, frequency: 'Quarterly', payoutRatioBase: 75, dividendGrowth5Y: 3.0, consecutiveYears: 16, sector: 'Consumer', currency: 'USD' },
  { ticker: 'ENB.TO', name: 'Enbridge Inc.', exchange: 'TSX', region: 'Americas', basePrice: 54, dividendPerShare: 3.66, frequency: 'Quarterly', payoutRatioBase: 68, dividendGrowth5Y: 3.1, consecutiveYears: 29, sector: 'Energy', currency: 'CAD' },
  { ticker: 'BNS.TO', name: 'Bank of Nova Scotia', exchange: 'TSX', region: 'Americas', basePrice: 68, dividendPerShare: 4.24, frequency: 'Quarterly', payoutRatioBase: 52, dividendGrowth5Y: 4.8, consecutiveYears: 11, sector: 'Financials', currency: 'CAD' },

  // EMEA
  { ticker: 'BTI', name: 'British American Tobacco', exchange: 'NYSE', region: 'EMEA', basePrice: 33, dividendPerShare: 2.92, frequency: 'Quarterly', payoutRatioBase: 65, dividendGrowth5Y: 2.5, consecutiveYears: 25, sector: 'Consumer', currency: 'USD' },
  { ticker: 'HSBA.L', name: 'HSBC Holdings plc', exchange: 'LSE', region: 'EMEA', basePrice: 740, dividendPerShare: 51.0, frequency: 'Semi-Annual', payoutRatioBase: 50, dividendGrowth5Y: 6.2, consecutiveYears: 4, sector: 'Financials', currency: 'GBP' },
  { ticker: 'RIO.L', name: 'Rio Tinto plc', exchange: 'LSE', region: 'EMEA', basePrice: 5200, dividendPerShare: 340.0, frequency: 'Semi-Annual', payoutRatioBase: 55, dividendGrowth5Y: 5.0, consecutiveYears: 3, sector: 'Materials', currency: 'GBP' },
  { ticker: 'NESN.SW', name: 'Nestle S.A.', exchange: 'SIX', region: 'EMEA', basePrice: 88, dividendPerShare: 3.00, frequency: 'Annual', payoutRatioBase: 62, dividendGrowth5Y: 4.5, consecutiveYears: 28, sector: 'Consumer', currency: 'CHF' },
  { ticker: 'SAN.MC', name: 'Banco Santander S.A.', exchange: 'BME', region: 'EMEA', basePrice: 4.5, dividendPerShare: 0.22, frequency: 'Semi-Annual', payoutRatioBase: 40, dividendGrowth5Y: 7.0, consecutiveYears: 5, sector: 'Financials', currency: 'EUR' },
  { ticker: 'TTE.PA', name: 'TotalEnergies SE', exchange: 'EURONEXT', region: 'EMEA', basePrice: 58, dividendPerShare: 3.01, frequency: 'Quarterly', payoutRatioBase: 45, dividendGrowth5Y: 5.5, consecutiveYears: 6, sector: 'Energy', currency: 'EUR' },

  // Asia-Pacific
  { ticker: 'BHP', name: 'BHP Group Ltd.', exchange: 'ASX', region: 'Asia-Pacific', basePrice: 43, dividendPerShare: 2.54, frequency: 'Semi-Annual', payoutRatioBase: 58, dividendGrowth5Y: 4.0, consecutiveYears: 3, sector: 'Materials', currency: 'AUD' },
  { ticker: 'CBA.AX', name: 'Commonwealth Bank of Australia', exchange: 'ASX', region: 'Asia-Pacific', basePrice: 115, dividendPerShare: 4.50, frequency: 'Semi-Annual', payoutRatioBase: 70, dividendGrowth5Y: 3.5, consecutiveYears: 7, sector: 'Financials', currency: 'AUD' },
  { ticker: 'WES.AX', name: 'Wesfarmers Ltd.', exchange: 'ASX', region: 'Asia-Pacific', basePrice: 62, dividendPerShare: 2.03, frequency: 'Semi-Annual', payoutRatioBase: 66, dividendGrowth5Y: 5.2, consecutiveYears: 10, sector: 'Consumer', currency: 'AUD' },
  { ticker: '7203.T', name: 'Toyota Motor Corp.', exchange: 'TSE', region: 'Asia-Pacific', basePrice: 2650, dividendPerShare: 75.0, frequency: 'Semi-Annual', payoutRatioBase: 42, dividendGrowth5Y: 8.0, consecutiveYears: 4, sector: 'Consumer', currency: 'JPY' },
  { ticker: '8306.T', name: 'Mitsubishi UFJ Financial', exchange: 'TSE', region: 'Asia-Pacific', basePrice: 1580, dividendPerShare: 41.0, frequency: 'Semi-Annual', payoutRatioBase: 40, dividendGrowth5Y: 9.5, consecutiveYears: 3, sector: 'Financials', currency: 'JPY' },
  { ticker: '005930.KS', name: 'Samsung Electronics Co.', exchange: 'KRX', region: 'Asia-Pacific', basePrice: 72000, dividendPerShare: 1444, frequency: 'Quarterly', payoutRatioBase: 45, dividendGrowth5Y: 6.0, consecutiveYears: 5, sector: 'Consumer', currency: 'KRW' },
];

// ── Cache ──

let cache: { data: GlobalDividendResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

// ── Generator ──

function generateGlobalDividendData(): GlobalDividendResponse {
  const rng = seededRandom('global-dividend');
  const now = new Date();

  // Generate stocks array with daily price/yield variation
  const stocks: DividendStock[] = STOCK_DEFS.map((def) => {
    const priceVar = 1 + (rng() - 0.5) * 0.08;
    const price = round2(def.basePrice * priceVar);
    const divVar = 1 + (rng() - 0.5) * 0.04;
    const dividendPerShare = round2(def.dividendPerShare * divVar);
    const dividendYield = round2((dividendPerShare / price) * 100);
    const payoutVar = 1 + (rng() - 0.5) * 0.1;
    const payoutRatio = round1(def.payoutRatioBase * payoutVar);
    const growthVar = def.dividendGrowth5Y + (rng() - 0.5) * 1.0;
    const dividendGrowth5Y = round1(growthVar);

    // Generate ex-div date within next 60 days
    const daysAhead = 3 + Math.floor(rng() * 57);
    const exDivDate = formatDate(addDays(now, daysAhead));
    const payDaysAfterEx = def.frequency === 'Quarterly' ? 21 + Math.floor(rng() * 14) : 30 + Math.floor(rng() * 30);
    const payDate = formatDate(addDays(now, daysAhead + payDaysAfterEx));

    return {
      ticker: def.ticker,
      name: def.name,
      exchange: def.exchange,
      region: def.region,
      price,
      dividendPerShare,
      dividendYield,
      exDivDate,
      payDate,
      frequency: def.frequency,
      payoutRatio,
      dividendGrowth5Y,
      consecutiveYears: def.consecutiveYears,
      sector: def.sector,
      currency: def.currency,
    };
  });

  // Sort stocks by yield descending for presentation
  stocks.sort((a, b) => b.dividendYield - a.dividendYield);

  // Upcoming: next 10 ex-dividend dates, sorted by date ascending
  const upcoming: UpcomingExDiv[] = [...stocks]
    .sort((a, b) => a.exDivDate.localeCompare(b.exDivDate))
    .slice(0, 10)
    .map((s) => ({
      ticker: s.ticker,
      name: s.name,
      exDivDate: s.exDivDate,
      amount: s.dividendPerShare,
      yield: s.dividendYield,
    }));

  // Summary statistics
  const yields = stocks.map((s) => s.dividendYield);
  const avgYield = round2(yields.reduce((sum, y) => sum + y, 0) / yields.length);

  let highestYieldStock = stocks[0];
  for (const s of stocks) {
    if (s.dividendYield > highestYieldStock.dividendYield) {
      highestYieldStock = s;
    }
  }

  const payoutRatios = stocks.map((s) => s.payoutRatio);
  const avgPayoutRatio = round1(payoutRatios.reduce((sum, p) => sum + p, 0) / payoutRatios.length);

  const growths = stocks.map((s) => s.dividendGrowth5Y);
  const avgGrowth5Y = round1(growths.reduce((sum, g) => sum + g, 0) / growths.length);

  // Total dividends paid: sum of all dividendPerShare values (as a proxy metric)
  const totalDividendsPaid = round2(stocks.reduce((sum, s) => sum + s.dividendPerShare, 0));

  // Stocks with ex-div date within next 7 days
  const weekFromNow = formatDate(addDays(now, 7));
  const todayStr = formatDate(now);
  const stocksExDivThisWeek = stocks.filter(
    (s) => s.exDivDate >= todayStr && s.exDivDate <= weekFromNow
  ).length;

  const summary: DividendSummary = {
    avgYield,
    highestYield: { ticker: highestYieldStock.ticker, yield: highestYieldStock.dividendYield },
    totalDividendsPaid,
    avgPayoutRatio,
    avgGrowth5Y,
    stocksExDivThisWeek,
  };

  return {
    stocks,
    upcoming,
    summary,
    timestamp: now.toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const result = generateGlobalDividendData();
    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    console.error('[GlobalDividend] Error:', err instanceof Error ? err.message : err);
    // Stale fallback on error
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate global dividend data' });
  }
});

export default router;
