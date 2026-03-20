import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashSeed(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; } return h; }

// ── Types ──

interface StockDef {
  ticker: string;
  name: string;
  sector: string;
  basePrice: number;
  annualDiv: number;
  frequency: 'Q' | 'SA' | 'A';
  payoutBase: number;
  growth5Y: number;
  consecutiveYears: number;
  exMonthOffset: number;
}

interface TopDividendStock {
  name: string;
  ticker: string;
  currentYield: number;
  forwardYield: number;
  payoutRatio: number;
  growthRate: number;
  exDate: string;
  paymentDate: string;
}

interface SectorDividendSummary {
  sector: string;
  avgYield: number;
  avgPayoutRatio: number;
  avgGrowthRate: number;
  stockCount: number;
  topPayer: string;
}

interface DividendAristocrat {
  ticker: string;
  name: string;
  consecutiveYears: number;
  currentYield: number;
  fiveYearAvgYield: number;
  payoutRatio: number;
  sector: string;
}

interface UpcomingExDate {
  ticker: string;
  name: string;
  exDate: string;
  paymentDate: string;
  amount: number;
  yield: number;
  frequency: string;
}

interface IndexDividendYield {
  index: string;
  ticker: string;
  currentYield: number;
  trailingYield: number;
  oneYearAgo: number;
  fiveYearAvg: number;
}

interface DividendFuturesImplied {
  index: string;
  year: number;
  impliedDividendPoints: number;
  impliedYield: number;
  changeFromSpot: number;
  lastUpdated: string;
}

interface HistoricalDividendGrowth {
  year: number;
  spxDividendGrowth: number;
  spxDividendPerShare: number;
  totalPayoutBn: number;
  buybackBn: number;
  totalReturnBn: number;
}

interface DividendAlert {
  ticker: string;
  name: string;
  type: 'cut' | 'initiation' | 'increase' | 'suspension' | 'special';
  description: string;
  date: string;
  oldAmount: number;
  newAmount: number;
  changePct: number;
}

interface EquityDividendForecastResponse {
  topDividendStocks: TopDividendStock[];
  sectorDividendSummary: SectorDividendSummary[];
  dividendAristocrats: DividendAristocrat[];
  upcomingExDates: UpcomingExDate[];
  indexDividendYields: IndexDividendYield[];
  dividendFuturesImplied: DividendFuturesImplied[];
  historicalDividendGrowth: HistoricalDividendGrowth[];
  dividendAlerts: DividendAlert[];
  timestamp: string;
}

// ── Stock universe (30 top dividend stocks) ──

const STOCKS: StockDef[] = [
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 155, annualDiv: 4.76, frequency: 'Q', payoutBase: 44, growth5Y: 5.6, consecutiveYears: 62, exMonthOffset: 2 },
  { ticker: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Staples', basePrice: 162, annualDiv: 3.76, frequency: 'Q', payoutBase: 60, growth5Y: 5.5, consecutiveYears: 68, exMonthOffset: 0 },
  { ticker: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples', basePrice: 60, annualDiv: 1.94, frequency: 'Q', payoutBase: 72, growth5Y: 3.2, consecutiveYears: 62, exMonthOffset: 2 },
  { ticker: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', basePrice: 170, annualDiv: 5.06, frequency: 'Q', payoutBase: 66, growth5Y: 6.8, consecutiveYears: 52, exMonthOffset: 2 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', basePrice: 105, annualDiv: 3.80, frequency: 'Q', payoutBase: 42, growth5Y: 3.0, consecutiveYears: 41, exMonthOffset: 1 },
  { ticker: 'CVX', name: 'Chevron Corp.', sector: 'Energy', basePrice: 155, annualDiv: 6.04, frequency: 'Q', payoutBase: 47, growth5Y: 6.0, consecutiveYears: 37, exMonthOffset: 1 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', basePrice: 195, annualDiv: 4.60, frequency: 'Q', payoutBase: 27, growth5Y: 6.7, consecutiveYears: 13, exMonthOffset: 0 },
  { ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', basePrice: 165, annualDiv: 6.20, frequency: 'Q', payoutBase: 48, growth5Y: 8.5, consecutiveYears: 52, exMonthOffset: 0 },
  { ticker: 'MRK', name: 'Merck & Co. Inc.', sector: 'Healthcare', basePrice: 120, annualDiv: 3.08, frequency: 'Q', payoutBase: 38, growth5Y: 7.2, consecutiveYears: 13, exMonthOffset: 2 },
  { ticker: 'MO', name: 'Altria Group Inc.', sector: 'Consumer Staples', basePrice: 45, annualDiv: 3.92, frequency: 'Q', payoutBase: 78, growth5Y: 4.2, consecutiveYears: 54, exMonthOffset: 0 },
  { ticker: 'PM', name: 'Philip Morris International', sector: 'Consumer Staples', basePrice: 102, annualDiv: 5.20, frequency: 'Q', payoutBase: 75, growth5Y: 3.0, consecutiveYears: 16, exMonthOffset: 0 },
  { ticker: 'T', name: 'AT&T Inc.', sector: 'Communication Services', basePrice: 17, annualDiv: 1.11, frequency: 'Q', payoutBase: 55, growth5Y: -5.0, consecutiveYears: 2, exMonthOffset: 0 },
  { ticker: 'VZ', name: 'Verizon Communications Inc.', sector: 'Communication Services', basePrice: 38, annualDiv: 2.66, frequency: 'Q', payoutBase: 57, growth5Y: 1.9, consecutiveYears: 19, exMonthOffset: 0 },
  { ticker: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary', basePrice: 345, annualDiv: 8.36, frequency: 'Q', payoutBase: 50, growth5Y: 12.0, consecutiveYears: 14, exMonthOffset: 2 },
  { ticker: 'LOW', name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary', basePrice: 240, annualDiv: 4.40, frequency: 'Q', payoutBase: 36, growth5Y: 17.5, consecutiveYears: 61, exMonthOffset: 0 },
  { ticker: 'CL', name: 'Colgate-Palmolive Co.', sector: 'Consumer Staples', basePrice: 82, annualDiv: 1.92, frequency: 'Q', payoutBase: 55, growth5Y: 3.0, consecutiveYears: 61, exMonthOffset: 0 },
  { ticker: 'EMR', name: 'Emerson Electric Co.', sector: 'Industrials', basePrice: 105, annualDiv: 2.10, frequency: 'Q', payoutBase: 42, growth5Y: 1.5, consecutiveYears: 67, exMonthOffset: 1 },
  { ticker: 'ITW', name: 'Illinois Tool Works Inc.', sector: 'Industrials', basePrice: 250, annualDiv: 5.56, frequency: 'Q', payoutBase: 54, growth5Y: 7.0, consecutiveYears: 60, exMonthOffset: 2 },
  { ticker: 'ED', name: 'Consolidated Edison Inc.', sector: 'Utilities', basePrice: 98, annualDiv: 3.24, frequency: 'Q', payoutBase: 64, growth5Y: 2.5, consecutiveYears: 50, exMonthOffset: 1 },
  { ticker: 'SO', name: 'Southern Co.', sector: 'Utilities', basePrice: 72, annualDiv: 2.80, frequency: 'Q', payoutBase: 62, growth5Y: 3.2, consecutiveYears: 23, exMonthOffset: 1 },
  { ticker: 'DUK', name: 'Duke Energy Corp.', sector: 'Utilities', basePrice: 100, annualDiv: 4.06, frequency: 'Q', payoutBase: 73, growth5Y: 2.1, consecutiveYears: 19, exMonthOffset: 2 },
  { ticker: 'O', name: 'Realty Income Corp.', sector: 'Real Estate', basePrice: 55, annualDiv: 3.07, frequency: 'Q', payoutBase: 78, growth5Y: 3.5, consecutiveYears: 30, exMonthOffset: 0 },
  { ticker: 'SPG', name: 'Simon Property Group Inc.', sector: 'Real Estate', basePrice: 145, annualDiv: 7.60, frequency: 'Q', payoutBase: 68, growth5Y: 4.5, consecutiveYears: 12, exMonthOffset: 2 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Information Technology', basePrice: 415, annualDiv: 3.00, frequency: 'Q', payoutBase: 25, growth5Y: 10.2, consecutiveYears: 21, exMonthOffset: 1 },
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Information Technology', basePrice: 178, annualDiv: 0.96, frequency: 'Q', payoutBase: 15, growth5Y: 5.8, consecutiveYears: 12, exMonthOffset: 1 },
  { ticker: 'TXN', name: 'Texas Instruments Inc.', sector: 'Information Technology', basePrice: 175, annualDiv: 5.20, frequency: 'Q', payoutBase: 62, growth5Y: 11.0, consecutiveYears: 20, exMonthOffset: 0 },
  { ticker: 'IBM', name: 'International Business Machines', sector: 'Information Technology', basePrice: 190, annualDiv: 6.64, frequency: 'Q', payoutBase: 65, growth5Y: 1.2, consecutiveYears: 28, exMonthOffset: 1 },
  { ticker: 'LMT', name: 'Lockheed Martin Corp.', sector: 'Industrials', basePrice: 450, annualDiv: 12.60, frequency: 'Q', payoutBase: 44, growth5Y: 7.5, consecutiveYears: 21, exMonthOffset: 2 },
  { ticker: 'MCD', name: "McDonald's Corp.", sector: 'Consumer Discretionary', basePrice: 290, annualDiv: 6.68, frequency: 'Q', payoutBase: 57, growth5Y: 8.0, consecutiveYears: 48, exMonthOffset: 2 },
  { ticker: 'MMM', name: '3M Co.', sector: 'Industrials', basePrice: 105, annualDiv: 4.00, frequency: 'Q', payoutBase: 58, growth5Y: -1.5, consecutiveYears: 2, exMonthOffset: 1 },
];

// ── Cache ──

let cache: { data: EquityDividendForecastResponse | null; expiresAt: number } = {
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

// ── Generators ──

function generateTopDividendStocks(rng: () => number, now: Date): TopDividendStock[] {
  return STOCKS.map((s) => {
    const priceVar = 1 + (rng() - 0.5) * 0.08;
    const divVar = 1 + (rng() - 0.5) * 0.06;
    const price = s.basePrice * priceVar;
    const annualDiv = s.annualDiv * divVar;
    const currentYield = round2((annualDiv / price) * 100);

    // Forward yield assumes analyst estimate of next 12m dividends (slightly higher for growers)
    const forwardGrowthAdj = 1 + (s.growth5Y / 100) * (0.8 + rng() * 0.4);
    const forwardDiv = annualDiv * forwardGrowthAdj;
    const forwardYield = round2((forwardDiv / price) * 100);

    const payoutVar = 1 + (rng() - 0.5) * 0.1;
    const payoutRatio = round1(s.payoutBase * payoutVar);
    const growthVar = s.growth5Y + (rng() - 0.5) * 2.0;
    const growthRate = round1(growthVar);

    // Ex-date within next 60 days
    const daysAhead = 3 + Math.floor(rng() * 57);
    const exDate = formatDate(addDays(now, daysAhead));
    const paymentDate = formatDate(addDays(now, daysAhead + 14 + Math.floor(rng() * 21)));

    return {
      name: s.name,
      ticker: s.ticker,
      currentYield,
      forwardYield,
      payoutRatio,
      growthRate,
      exDate,
      paymentDate,
    };
  }).sort((a, b) => b.currentYield - a.currentYield);
}

function generateSectorDividendSummary(rng: () => number): SectorDividendSummary[] {
  const sectorMap = new Map<string, StockDef[]>();
  for (const s of STOCKS) {
    const arr = sectorMap.get(s.sector) || [];
    arr.push(s);
    sectorMap.set(s.sector, arr);
  }

  const results: SectorDividendSummary[] = [];
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
      payouts.push(s.payoutBase * (1 + (rng() - 0.5) * 0.1));
      growths.push(s.growth5Y + (rng() - 0.5) * 1.5);
    }

    const avg = (arr: number[]) => arr.reduce((sum, v) => sum + v, 0) / arr.length;

    // Top payer is the stock with highest base yield in sector
    let topPayer = stocks[0].ticker;
    let topYield = 0;
    for (const s of stocks) {
      const y = s.annualDiv / s.basePrice * 100;
      if (y > topYield) {
        topYield = y;
        topPayer = s.ticker;
      }
    }

    results.push({
      sector,
      avgYield: round2(avg(yields)),
      avgPayoutRatio: round1(avg(payouts)),
      avgGrowthRate: round1(avg(growths)),
      stockCount: stocks.length,
      topPayer,
    });
  }

  return results.sort((a, b) => b.avgYield - a.avgYield);
}

function generateDividendAristocrats(rng: () => number): DividendAristocrat[] {
  return STOCKS
    .filter((s) => s.consecutiveYears >= 25)
    .map((s) => {
      const priceVar = 1 + (rng() - 0.5) * 0.08;
      const divVar = 1 + (rng() - 0.5) * 0.06;
      const price = s.basePrice * priceVar;
      const annualDiv = s.annualDiv * divVar;
      const currentYield = round2((annualDiv / price) * 100);
      const avg5YVar = 1 + (rng() - 0.5) * 0.15;
      const fiveYearAvgYield = round2(currentYield * avg5YVar);
      const payoutVar = 1 + (rng() - 0.5) * 0.1;
      const payoutRatio = round1(s.payoutBase * payoutVar);

      return {
        ticker: s.ticker,
        name: s.name,
        consecutiveYears: s.consecutiveYears,
        currentYield,
        fiveYearAvgYield,
        payoutRatio,
        sector: s.sector,
      };
    })
    .sort((a, b) => b.consecutiveYears - a.consecutiveYears);
}

function generateUpcomingExDates(rng: () => number, now: Date): UpcomingExDate[] {
  const thirtyDaysOut = addDays(now, 30);
  const results: UpcomingExDate[] = [];

  for (const s of STOCKS) {
    const daysAhead = 1 + Math.floor(rng() * 30);
    const exDate = addDays(now, daysAhead);

    // Only include if within next 30 days
    if (exDate <= thirtyDaysOut) {
      const divVar = 1 + (rng() - 0.5) * 0.06;
      const priceVar = 1 + (rng() - 0.5) * 0.08;
      const price = s.basePrice * priceVar;
      const annualDiv = s.annualDiv * divVar;
      const perPayment = s.frequency === 'Q' ? annualDiv / 4 : s.frequency === 'SA' ? annualDiv / 2 : annualDiv;
      const paymentDate = addDays(exDate, 14 + Math.floor(rng() * 21));
      const yieldPct = round2((annualDiv / price) * 100);

      results.push({
        ticker: s.ticker,
        name: s.name,
        exDate: formatDate(exDate),
        paymentDate: formatDate(paymentDate),
        amount: round2(perPayment),
        yield: yieldPct,
        frequency: s.frequency === 'Q' ? 'Quarterly' : s.frequency === 'SA' ? 'Semi-Annual' : 'Annual',
      });
    }
  }

  return results.sort((a, b) => a.exDate.localeCompare(b.exDate));
}

function generateIndexDividendYields(rng: () => number): IndexDividendYield[] {
  const indices = [
    { index: 'S&P 500', ticker: 'SPX', baseYield: 1.35, trailing: 1.42, oneYrAgo: 1.48, fiveYrAvg: 1.55 },
    { index: 'NASDAQ 100', ticker: 'NDX', baseYield: 0.62, trailing: 0.68, oneYrAgo: 0.72, fiveYrAvg: 0.78 },
    { index: 'Dow Jones Industrial Avg', ticker: 'DJIA', baseYield: 1.82, trailing: 1.90, oneYrAgo: 1.95, fiveYrAvg: 2.05 },
    { index: 'EURO STOXX 50', ticker: 'SX5E', baseYield: 2.95, trailing: 3.10, oneYrAgo: 3.25, fiveYrAvg: 3.15 },
  ];

  return indices.map((idx) => {
    const var1 = (rng() - 0.5) * 0.20;
    const var2 = (rng() - 0.5) * 0.15;
    const var3 = (rng() - 0.5) * 0.12;
    const var4 = (rng() - 0.5) * 0.10;

    return {
      index: idx.index,
      ticker: idx.ticker,
      currentYield: round2(idx.baseYield + var1),
      trailingYield: round2(idx.trailing + var2),
      oneYearAgo: round2(idx.oneYrAgo + var3),
      fiveYearAvg: round2(idx.fiveYrAvg + var4),
    };
  });
}

function generateDividendFuturesImplied(rng: () => number, now: Date): DividendFuturesImplied[] {
  const currentYear = now.getFullYear();
  const indices = [
    { index: 'S&P 500', baseDivPoints: 72.5, baseYield: 1.35 },
    { index: 'EURO STOXX 50', baseDivPoints: 142.0, baseYield: 2.95 },
  ];

  const results: DividendFuturesImplied[] = [];
  for (const idx of indices) {
    for (let yearOffset = 0; yearOffset <= 2; yearOffset++) {
      const year = currentYear + yearOffset;
      const growthFactor = 1 + (0.02 + rng() * 0.04) * yearOffset; // 2-6% growth per year
      const divPoints = round2(idx.baseDivPoints * growthFactor * (1 + (rng() - 0.5) * 0.06));
      const impliedYield = round2(idx.baseYield * growthFactor * (1 + (rng() - 0.5) * 0.08));
      const changeFromSpot = round2((impliedYield / idx.baseYield - 1) * 100);
      const daysAgo = Math.floor(rng() * 3);
      const lastUpdated = formatDate(addDays(now, -daysAgo));

      results.push({
        index: idx.index,
        year,
        impliedDividendPoints: divPoints,
        impliedYield,
        changeFromSpot,
        lastUpdated,
      });
    }
  }

  return results;
}

function generateHistoricalDividendGrowth(rng: () => number, now: Date): HistoricalDividendGrowth[] {
  const currentYear = now.getFullYear();
  // S&P 500 dividend data baseline
  const baseDPS = 62.0; // approximate S&P 500 DPS baseline
  const basePayout = 530; // $530B total dividends baseline
  const baseBuyback = 780; // $780B buybacks baseline

  const results: HistoricalDividendGrowth[] = [];
  for (let i = 4; i >= 0; i--) {
    const year = currentYear - i;
    const yearFactor = Math.pow(1.06, 4 - i); // ~6% annual growth
    const growthNoise = 1 + (rng() - 0.5) * 0.08;
    const dps = round2(baseDPS * yearFactor * growthNoise);

    // Year-over-year growth
    const prevDPS = i < 4 ? results[results.length - 1]?.spxDividendPerShare || dps * 0.94 : dps * 0.94;
    const growth = round1(((dps - prevDPS) / prevDPS) * 100);

    const payoutNoise = 1 + (rng() - 0.5) * 0.06;
    const totalPayout = round2(basePayout * yearFactor * payoutNoise);
    const buybackNoise = 1 + (rng() - 0.5) * 0.15;
    const buyback = round2(baseBuyback * yearFactor * buybackNoise);

    results.push({
      year,
      spxDividendGrowth: growth,
      spxDividendPerShare: dps,
      totalPayoutBn: totalPayout,
      buybackBn: buyback,
      totalReturnBn: round2(totalPayout + buyback),
    });
  }

  return results;
}

function generateDividendAlerts(rng: () => number, now: Date): DividendAlert[] {
  const alertTypes: DividendAlert['type'][] = ['cut', 'initiation', 'increase', 'suspension', 'special'];
  const typeWeights = [0.10, 0.10, 0.50, 0.05, 0.25];
  const shuffled = [...STOCKS].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 8);

  return selected.map((s) => {
    // Pick type based on weights
    const r = rng();
    let cumulative = 0;
    let type: DividendAlert['type'] = 'increase';
    for (let i = 0; i < alertTypes.length; i++) {
      cumulative += typeWeights[i];
      if (r < cumulative) {
        type = alertTypes[i];
        break;
      }
    }

    const perPayment = s.annualDiv / 4;
    let oldAmount: number;
    let newAmount: number;
    let changePct: number;
    let description: string;

    switch (type) {
      case 'increase': {
        const pct = 2 + rng() * 12;
        oldAmount = round2(perPayment / (1 + pct / 100));
        newAmount = round2(perPayment);
        changePct = round2(pct);
        description = `${s.name} raised quarterly dividend by ${changePct}% to $${newAmount}`;
        break;
      }
      case 'cut': {
        const pct = 10 + rng() * 35;
        oldAmount = round2(perPayment * (1 + pct / 100));
        newAmount = round2(perPayment);
        changePct = round2(-pct);
        description = `${s.name} reduced quarterly dividend by ${round2(pct)}% to $${newAmount}`;
        break;
      }
      case 'initiation': {
        oldAmount = 0;
        newAmount = round2(perPayment * (0.4 + rng() * 0.6));
        changePct = 0;
        description = `${s.name} initiated a quarterly dividend of $${newAmount} per share`;
        break;
      }
      case 'suspension': {
        oldAmount = round2(perPayment);
        newAmount = 0;
        changePct = -100;
        description = `${s.name} suspended its quarterly dividend effective immediately`;
        break;
      }
      case 'special': {
        oldAmount = round2(perPayment);
        newAmount = round2(perPayment * (2.0 + rng() * 4.0));
        changePct = round2(((newAmount - oldAmount) / oldAmount) * 100);
        description = `${s.name} declared a special dividend of $${newAmount} per share`;
        break;
      }
    }

    const daysAgo = Math.floor(rng() * 14);
    const date = formatDate(addDays(now, -daysAgo));

    return {
      ticker: s.ticker,
      name: s.name,
      type,
      description,
      date,
      oldAmount,
      newAmount,
      changePct,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// ── Main generator ──

function generateData(): EquityDividendForecastResponse {
  const now = new Date();
  const seed = hashSeed(`equity-dividend-forecast-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);
  const rng = mulberry32(seed);

  return {
    topDividendStocks: generateTopDividendStocks(rng, now),
    sectorDividendSummary: generateSectorDividendSummary(rng),
    dividendAristocrats: generateDividendAristocrats(rng),
    upcomingExDates: generateUpcomingExDates(rng, now),
    indexDividendYields: generateIndexDividendYields(rng),
    dividendFuturesImplied: generateDividendFuturesImplied(rng, now),
    historicalDividendGrowth: generateHistoricalDividendGrowth(rng, now),
    dividendAlerts: generateDividendAlerts(rng, now),
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

    const result = generateData();
    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    console.error('[EquityDividendForecast] Error:', err instanceof Error ? err.message : err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(502).json({ error: 'Failed to generate equity dividend forecast data' });
  }
});

export default router;
