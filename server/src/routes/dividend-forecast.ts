import { Router } from 'express';
const router = Router();
function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }
let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface UpcomingDividend {
  ticker: string;
  company: string;
  exDate: string;
  recordDate: string;
  payDate: string;
  amount: number;
  frequency: 'Q' | 'SA' | 'A';
  yield: number;
  payoutRatio: number;
}

interface DividendGrowth {
  ticker: string;
  growth1Y: number;
  cagr3Y: number;
  cagr5Y: number;
  cagr10Y: number;
  consecutiveYearsIncreased: number;
}

interface Aristocrat {
  ticker: string;
  company: string;
  consecutiveYears: number;
  currentYield: number;
  avg5YYield: number;
}

interface SectorYield {
  sector: string;
  avgYield: number;
  avgPayoutRatio: number;
  avg5YGrowth: number;
}

interface DividendForecastResponse {
  upcomingDividends: UpcomingDividend[];
  dividendGrowth: DividendGrowth[];
  aristocrats: Aristocrat[];
  sectorYields: SectorYield[];
  generatedAt: string;
}

// ── Stock universe ──

interface StockDef {
  ticker: string;
  company: string;
  sector: string;
  basePrice: number;
  annualDiv: number;
  frequency: 'Q' | 'SA' | 'A';
  payoutBase: number;
  growth1Y: number;
  growth3Y: number;
  growth5Y: number;
  growth10Y: number;
  consecutiveYears: number;
  exMonthOffset: number;
}

const STOCKS: StockDef[] = [
  { ticker: 'AAPL', company: 'Apple Inc.', sector: 'Technology', basePrice: 178, annualDiv: 0.96, frequency: 'Q', payoutBase: 15, growth1Y: 4.3, growth3Y: 5.1, growth5Y: 5.8, growth10Y: 8.2, consecutiveYears: 12, exMonthOffset: 1 },
  { ticker: 'MSFT', company: 'Microsoft Corp.', sector: 'Technology', basePrice: 415, annualDiv: 3.00, frequency: 'Q', payoutBase: 25, growth1Y: 10.3, growth3Y: 10.0, growth5Y: 10.2, growth10Y: 11.5, consecutiveYears: 21, exMonthOffset: 1 },
  { ticker: 'JNJ', company: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 155, annualDiv: 4.76, frequency: 'Q', payoutBase: 44, growth1Y: 5.3, growth3Y: 5.5, growth5Y: 5.6, growth10Y: 6.0, consecutiveYears: 62, exMonthOffset: 2 },
  { ticker: 'PG', company: 'Procter & Gamble Co.', sector: 'Consumer Staples', basePrice: 162, annualDiv: 3.76, frequency: 'Q', payoutBase: 60, growth1Y: 3.0, growth3Y: 4.8, growth5Y: 5.5, growth10Y: 4.2, consecutiveYears: 68, exMonthOffset: 0 },
  { ticker: 'KO', company: 'Coca-Cola Co.', sector: 'Consumer Staples', basePrice: 60, annualDiv: 1.94, frequency: 'Q', payoutBase: 72, growth1Y: 5.4, growth3Y: 3.8, growth5Y: 3.2, growth10Y: 4.0, consecutiveYears: 62, exMonthOffset: 2 },
  { ticker: 'PEP', company: 'PepsiCo Inc.', sector: 'Consumer Staples', basePrice: 170, annualDiv: 5.06, frequency: 'Q', payoutBase: 66, growth1Y: 10.0, growth3Y: 7.5, growth5Y: 6.8, growth10Y: 7.5, consecutiveYears: 52, exMonthOffset: 2 },
  { ticker: 'XOM', company: 'Exxon Mobil Corp.', sector: 'Energy', basePrice: 105, annualDiv: 3.80, frequency: 'Q', payoutBase: 42, growth1Y: 3.8, growth3Y: 2.5, growth5Y: 3.0, growth10Y: 5.2, consecutiveYears: 41, exMonthOffset: 1 },
  { ticker: 'CVX', company: 'Chevron Corp.', sector: 'Energy', basePrice: 155, annualDiv: 6.04, frequency: 'Q', payoutBase: 47, growth1Y: 7.6, growth3Y: 6.5, growth5Y: 6.0, growth10Y: 5.5, consecutiveYears: 37, exMonthOffset: 1 },
  { ticker: 'JPM', company: 'JPMorgan Chase & Co.', sector: 'Financials', basePrice: 195, annualDiv: 4.60, frequency: 'Q', payoutBase: 27, growth1Y: 9.5, growth3Y: 7.8, growth5Y: 6.7, growth10Y: 10.0, consecutiveYears: 13, exMonthOffset: 0 },
  { ticker: 'BAC', company: 'Bank of America Corp.', sector: 'Financials', basePrice: 35, annualDiv: 0.96, frequency: 'Q', payoutBase: 30, growth1Y: 8.3, growth3Y: 9.0, growth5Y: 10.5, growth10Y: 12.0, consecutiveYears: 10, exMonthOffset: 2 },
  { ticker: 'T', company: 'AT&T Inc.', sector: 'Communication Services', basePrice: 17, annualDiv: 1.11, frequency: 'Q', payoutBase: 55, growth1Y: 2.0, growth3Y: -8.5, growth5Y: -5.0, growth10Y: -1.2, consecutiveYears: 2, exMonthOffset: 0 },
  { ticker: 'VZ', company: 'Verizon Communications Inc.', sector: 'Communication Services', basePrice: 38, annualDiv: 2.66, frequency: 'Q', payoutBase: 57, growth1Y: 1.9, growth3Y: 1.8, growth5Y: 1.9, growth10Y: 2.4, consecutiveYears: 19, exMonthOffset: 0 },
  { ticker: 'ABBV', company: 'AbbVie Inc.', sector: 'Healthcare', basePrice: 165, annualDiv: 6.20, frequency: 'Q', payoutBase: 48, growth1Y: 4.7, growth3Y: 7.5, growth5Y: 8.5, growth10Y: 13.0, consecutiveYears: 52, exMonthOffset: 0 },
  { ticker: 'MRK', company: 'Merck & Co. Inc.', sector: 'Healthcare', basePrice: 120, annualDiv: 3.08, frequency: 'Q', payoutBase: 38, growth1Y: 5.6, growth3Y: 6.5, growth5Y: 7.2, growth10Y: 5.8, consecutiveYears: 13, exMonthOffset: 2 },
  { ticker: 'HD', company: 'Home Depot Inc.', sector: 'Consumer Discretionary', basePrice: 345, annualDiv: 8.36, frequency: 'Q', payoutBase: 50, growth1Y: 7.7, growth3Y: 10.5, growth5Y: 12.0, growth10Y: 16.5, consecutiveYears: 14, exMonthOffset: 2 },
];

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

// ── Generators ──

function generateUpcomingDividends(rng: () => number): UpcomingDividend[] {
  const now = new Date();

  return STOCKS.map((s) => {
    const priceVar = 1 + (rng() - 0.5) * 0.08;
    const divVar = 1 + (rng() - 0.5) * 0.06;
    const price = s.basePrice * priceVar;
    const annualDiv = s.annualDiv * divVar;

    const perPayment = s.frequency === 'Q' ? annualDiv / 4 : s.frequency === 'SA' ? annualDiv / 2 : annualDiv;

    // Generate ex-date within next 60 days
    const daysAhead = 1 + Math.floor(rng() * 60);
    const exDate = addDays(now, daysAhead);
    const recordDate = addDays(exDate, 1);
    const payDate = addDays(exDate, 14 + Math.floor(rng() * 21));

    const yieldPct = round2((annualDiv / price) * 100);
    const payoutVar = 1 + (rng() - 0.5) * 0.1;
    const payoutRatio = round1(s.payoutBase * payoutVar);

    return {
      ticker: s.ticker,
      company: s.company,
      exDate: formatDate(exDate),
      recordDate: formatDate(recordDate),
      payDate: formatDate(payDate),
      amount: round2(perPayment),
      frequency: s.frequency,
      yield: yieldPct,
      payoutRatio,
    };
  }).sort((a, b) => a.exDate.localeCompare(b.exDate));
}

function generateDividendGrowth(rng: () => number): DividendGrowth[] {
  return STOCKS.map((s) => {
    const var1Y = s.growth1Y + (rng() - 0.5) * 2.0;
    const var3Y = s.growth3Y + (rng() - 0.5) * 1.5;
    const var5Y = s.growth5Y + (rng() - 0.5) * 1.2;
    const var10Y = s.growth10Y + (rng() - 0.5) * 1.0;

    return {
      ticker: s.ticker,
      growth1Y: round1(var1Y),
      cagr3Y: round1(var3Y),
      cagr5Y: round1(var5Y),
      cagr10Y: round1(var10Y),
      consecutiveYearsIncreased: s.consecutiveYears,
    };
  }).sort((a, b) => b.cagr5Y - a.cagr5Y);
}

function generateAristocrats(rng: () => number): Aristocrat[] {
  return STOCKS
    .filter((s) => s.consecutiveYears >= 25)
    .map((s) => {
      const priceVar = 1 + (rng() - 0.5) * 0.08;
      const divVar = 1 + (rng() - 0.5) * 0.06;
      const price = s.basePrice * priceVar;
      const annualDiv = s.annualDiv * divVar;
      const currentYield = round2((annualDiv / price) * 100);

      // 5Y avg yield is typically close to current but slightly different
      const avg5YVar = 1 + (rng() - 0.5) * 0.15;
      const avg5YYield = round2(currentYield * avg5YVar);

      return {
        ticker: s.ticker,
        company: s.company,
        consecutiveYears: s.consecutiveYears,
        currentYield,
        avg5YYield,
      };
    })
    .sort((a, b) => b.consecutiveYears - a.consecutiveYears);
}

function generateSectorYields(rng: () => number): SectorYield[] {
  const sectorMap = new Map<string, StockDef[]>();
  for (const s of STOCKS) {
    const arr = sectorMap.get(s.sector) || [];
    arr.push(s);
    sectorMap.set(s.sector, arr);
  }

  const results: SectorYield[] = [];
  for (const [sector, stocks] of sectorMap) {
    const yields: number[] = [];
    const payouts: number[] = [];
    const growths: number[] = [];

    for (const s of stocks) {
      const priceVar = 1 + (rng() - 0.5) * 0.08;
      const divVar = 1 + (rng() - 0.5) * 0.06;
      const price = s.basePrice * priceVar;
      const annualDiv = s.annualDiv * divVar;
      yields.push((annualDiv / price) * 100);

      const payoutVar = 1 + (rng() - 0.5) * 0.1;
      payouts.push(s.payoutBase * payoutVar);

      const growthVar = s.growth5Y + (rng() - 0.5) * 1.5;
      growths.push(growthVar);
    }

    const avg = (arr: number[]) => arr.reduce((sum, v) => sum + v, 0) / arr.length;

    results.push({
      sector,
      avgYield: round2(avg(yields)),
      avgPayoutRatio: round1(avg(payouts)),
      avg5YGrowth: round1(avg(growths)),
    });
  }

  return results.sort((a, b) => b.avgYield - a.avgYield);
}

// ── Main generator ──

function generateData(): DividendForecastResponse {
  const now = new Date();
  const seed = hashSeed(`dividend-forecast-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);
  const rng = mulberry32(seed);

  return {
    upcomingDividends: generateUpcomingDividends(rng),
    dividendGrowth: generateDividendGrowth(rng),
    aristocrats: generateAristocrats(rng),
    sectorYields: generateSectorYields(rng),
    generatedAt: now.toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }

    const result = generateData();
    cache = { data: result, ts: now };
    res.json(result);
  } catch (err: unknown) {
    console.error('[DividendForecast] Error:', err instanceof Error ? err.message : err);
    // Stale fallback on error
    if (cache) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate dividend forecast data' });
  }
});

export default router;
