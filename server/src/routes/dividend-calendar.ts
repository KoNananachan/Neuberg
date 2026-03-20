import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Types ──

interface UpcomingExDividend {
  ticker: string;
  name: string;
  exDate: string;
  payDate: string;
  amount: number;
  frequency: 'quarterly' | 'monthly' | 'semi-annual' | 'annual';
  yield: number;
  previousAmount: number;
  change: number;
  sector: string;
}

interface TopYield {
  ticker: string;
  name: string;
  yield: number;
  amount: number;
  payoutRatio: number;
  fiveYearGrowthRate: number;
  consecutiveYears: number;
  dividendSafety: 'safe' | 'watch' | 'at risk';
}

interface DividendGrowthLeader {
  ticker: string;
  name: string;
  yieldOnCost: number;
  currentYield: number;
  oneYearGrowth: number;
  threeYearCAGR: number;
  fiveYearCAGR: number;
  dividendAristocrat: boolean;
}

interface MonthlyIncome {
  month: string;
  totalPayments: number;
  totalAmount: number;
  topPayers: string[];
}

interface SectorYield {
  sector: string;
  avgYield: number;
  medianYield: number;
  payoutRatio: number;
  coverageRatio: number;
  topPayer: string;
}

interface RecentChange {
  ticker: string;
  name: string;
  type: 'increase' | 'decrease' | 'initiation' | 'suspension' | 'special';
  oldAmount: number;
  newAmount: number;
  changePct: number;
  announceDate: string;
}

interface DividendCalendarResponse {
  upcomingExDividend: UpcomingExDividend[];
  topYields: TopYield[];
  dividendGrowthLeaders: DividendGrowthLeader[];
  monthlyIncomeCalendar: MonthlyIncome[];
  sectorYields: SectorYield[];
  recentChanges: RecentChange[];
  timestamp: string;
}

// ── Stock universe ──

interface StockDef {
  ticker: string;
  name: string;
  sector: string;
  basePrice: number;
  annualDiv: number;
  frequency: 'quarterly' | 'monthly' | 'semi-annual' | 'annual';
  payoutBase: number;
  growth5Y: number;
  consecutiveYears: number;
  aristocrat: boolean;
  exMonthOffset: number;
}

const STOCKS: StockDef[] = [
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 155, annualDiv: 4.76, frequency: 'quarterly', payoutBase: 44, growth5Y: 5.6, consecutiveYears: 62, aristocrat: true, exMonthOffset: 2 },
  { ticker: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Staples', basePrice: 162, annualDiv: 3.76, frequency: 'quarterly', payoutBase: 60, growth5Y: 5.5, consecutiveYears: 68, aristocrat: true, exMonthOffset: 0 },
  { ticker: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples', basePrice: 60, annualDiv: 1.94, frequency: 'quarterly', payoutBase: 72, growth5Y: 3.2, consecutiveYears: 62, aristocrat: true, exMonthOffset: 2 },
  { ticker: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', basePrice: 170, annualDiv: 5.06, frequency: 'quarterly', payoutBase: 66, growth5Y: 6.8, consecutiveYears: 52, aristocrat: true, exMonthOffset: 2 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', basePrice: 105, annualDiv: 3.80, frequency: 'quarterly', payoutBase: 42, growth5Y: 3.0, consecutiveYears: 41, aristocrat: true, exMonthOffset: 1 },
  { ticker: 'CVX', name: 'Chevron Corp.', sector: 'Energy', basePrice: 155, annualDiv: 6.04, frequency: 'quarterly', payoutBase: 47, growth5Y: 6.0, consecutiveYears: 37, aristocrat: true, exMonthOffset: 1 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', basePrice: 195, annualDiv: 4.60, frequency: 'quarterly', payoutBase: 27, growth5Y: 6.7, consecutiveYears: 13, aristocrat: false, exMonthOffset: 0 },
  { ticker: 'BAC', name: 'Bank of America Corp.', sector: 'Financials', basePrice: 35, annualDiv: 0.96, frequency: 'quarterly', payoutBase: 30, growth5Y: 10.5, consecutiveYears: 10, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'T', name: 'AT&T Inc.', sector: 'Communication Services', basePrice: 17, annualDiv: 1.11, frequency: 'quarterly', payoutBase: 55, growth5Y: -5.0, consecutiveYears: 2, aristocrat: false, exMonthOffset: 0 },
  { ticker: 'VZ', name: 'Verizon Communications Inc.', sector: 'Communication Services', basePrice: 38, annualDiv: 2.66, frequency: 'quarterly', payoutBase: 57, growth5Y: 1.9, consecutiveYears: 19, aristocrat: false, exMonthOffset: 0 },
  { ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', basePrice: 165, annualDiv: 6.20, frequency: 'quarterly', payoutBase: 48, growth5Y: 8.5, consecutiveYears: 52, aristocrat: true, exMonthOffset: 0 },
  { ticker: 'MRK', name: 'Merck & Co. Inc.', sector: 'Healthcare', basePrice: 120, annualDiv: 3.08, frequency: 'quarterly', payoutBase: 38, growth5Y: 7.2, consecutiveYears: 13, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'MCD', name: "McDonald's Corp.", sector: 'Consumer Discretionary', basePrice: 290, annualDiv: 6.68, frequency: 'quarterly', payoutBase: 57, growth5Y: 8.0, consecutiveYears: 48, aristocrat: true, exMonthOffset: 2 },
  { ticker: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary', basePrice: 345, annualDiv: 8.36, frequency: 'quarterly', payoutBase: 50, growth5Y: 12.0, consecutiveYears: 14, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'O', name: 'Realty Income Corp.', sector: 'Real Estate', basePrice: 55, annualDiv: 3.07, frequency: 'monthly', payoutBase: 78, growth5Y: 3.5, consecutiveYears: 30, aristocrat: false, exMonthOffset: 0 },
  { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Information Technology', basePrice: 1350, annualDiv: 21.00, frequency: 'quarterly', payoutBase: 40, growth5Y: 15.0, consecutiveYears: 14, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', basePrice: 165, annualDiv: 0.83, frequency: 'quarterly', payoutBase: 35, growth5Y: 1.9, consecutiveYears: 51, aristocrat: true, exMonthOffset: 0 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Information Technology', basePrice: 415, annualDiv: 3.00, frequency: 'quarterly', payoutBase: 25, growth5Y: 10.2, consecutiveYears: 21, aristocrat: false, exMonthOffset: 1 },
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Information Technology', basePrice: 178, annualDiv: 0.96, frequency: 'quarterly', payoutBase: 15, growth5Y: 5.8, consecutiveYears: 12, aristocrat: false, exMonthOffset: 1 },
  { ticker: 'TXN', name: 'Texas Instruments Inc.', sector: 'Information Technology', basePrice: 175, annualDiv: 5.20, frequency: 'quarterly', payoutBase: 62, growth5Y: 11.0, consecutiveYears: 20, aristocrat: false, exMonthOffset: 0 },
  { ticker: 'IBM', name: 'International Business Machines', sector: 'Information Technology', basePrice: 190, annualDiv: 6.64, frequency: 'quarterly', payoutBase: 65, growth5Y: 1.2, consecutiveYears: 28, aristocrat: true, exMonthOffset: 1 },
  { ticker: 'MMM', name: '3M Co.', sector: 'Industrials', basePrice: 105, annualDiv: 4.00, frequency: 'quarterly', payoutBase: 58, growth5Y: -1.5, consecutiveYears: 2, aristocrat: false, exMonthOffset: 1 },
  { ticker: 'CL', name: 'Colgate-Palmolive Co.', sector: 'Consumer Staples', basePrice: 82, annualDiv: 1.92, frequency: 'quarterly', payoutBase: 55, growth5Y: 3.0, consecutiveYears: 61, aristocrat: true, exMonthOffset: 0 },
  { ticker: 'ED', name: 'Consolidated Edison Inc.', sector: 'Utilities', basePrice: 98, annualDiv: 3.24, frequency: 'quarterly', payoutBase: 64, growth5Y: 2.5, consecutiveYears: 50, aristocrat: true, exMonthOffset: 1 },
  { ticker: 'SO', name: 'Southern Co.', sector: 'Utilities', basePrice: 72, annualDiv: 2.80, frequency: 'quarterly', payoutBase: 62, growth5Y: 3.2, consecutiveYears: 23, aristocrat: false, exMonthOffset: 1 },
  { ticker: 'DUK', name: 'Duke Energy Corp.', sector: 'Utilities', basePrice: 100, annualDiv: 4.06, frequency: 'quarterly', payoutBase: 73, growth5Y: 2.1, consecutiveYears: 19, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'EMR', name: 'Emerson Electric Co.', sector: 'Industrials', basePrice: 105, annualDiv: 2.10, frequency: 'quarterly', payoutBase: 42, growth5Y: 1.5, consecutiveYears: 67, aristocrat: true, exMonthOffset: 1 },
  { ticker: 'ITW', name: 'Illinois Tool Works Inc.', sector: 'Industrials', basePrice: 250, annualDiv: 5.56, frequency: 'quarterly', payoutBase: 54, growth5Y: 7.0, consecutiveYears: 60, aristocrat: true, exMonthOffset: 2 },
  { ticker: 'SPG', name: 'Simon Property Group Inc.', sector: 'Real Estate', basePrice: 145, annualDiv: 7.60, frequency: 'quarterly', payoutBase: 68, growth5Y: 4.5, consecutiveYears: 12, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'NNN', name: 'NNN REIT Inc.', sector: 'Real Estate', basePrice: 44, annualDiv: 2.30, frequency: 'quarterly', payoutBase: 72, growth5Y: 2.8, consecutiveYears: 34, aristocrat: false, exMonthOffset: 0 },
  { ticker: 'LMT', name: 'Lockheed Martin Corp.', sector: 'Industrials', basePrice: 450, annualDiv: 12.60, frequency: 'quarterly', payoutBase: 44, growth5Y: 7.5, consecutiveYears: 21, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'GS', name: 'Goldman Sachs Group Inc.', sector: 'Financials', basePrice: 420, annualDiv: 11.00, frequency: 'quarterly', payoutBase: 24, growth5Y: 18.0, consecutiveYears: 12, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'UNP', name: 'Union Pacific Corp.', sector: 'Industrials', basePrice: 245, annualDiv: 5.20, frequency: 'quarterly', payoutBase: 48, growth5Y: 10.5, consecutiveYears: 17, aristocrat: false, exMonthOffset: 2 },
  { ticker: 'STAG', name: 'STAG Industrial Inc.', sector: 'Real Estate', basePrice: 37, annualDiv: 1.47, frequency: 'monthly', payoutBase: 74, growth5Y: 2.2, consecutiveYears: 13, aristocrat: false, exMonthOffset: 0 },
  { ticker: 'LOW', name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary', basePrice: 240, annualDiv: 4.40, frequency: 'quarterly', payoutBase: 36, growth5Y: 17.5, consecutiveYears: 61, aristocrat: true, exMonthOffset: 0 },
];

// ── GICS sectors ──

const GICS_SECTORS = [
  'Information Technology',
  'Healthcare',
  'Financials',
  'Consumer Staples',
  'Consumer Discretionary',
  'Industrials',
  'Energy',
  'Utilities',
  'Real Estate',
  'Communication Services',
  'Materials',
] as const;

// ── Cache ──

let cache: { data: DividendCalendarResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Helpers ──

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

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

function generateUpcomingExDividend(rng: () => number): UpcomingExDividend[] {
  const now = new Date();
  const results: UpcomingExDividend[] = [];

  // Pick 20 stocks and generate upcoming ex-dates
  const shuffled = [...STOCKS].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 20);

  for (const s of selected) {
    const priceVar = 1 + (rng() - 0.5) * 0.08;
    const price = s.basePrice * priceVar;
    const divVar = 1 + (rng() - 0.5) * 0.06;

    let perPayment: number;
    switch (s.frequency) {
      case 'monthly':
        perPayment = (s.annualDiv * divVar) / 12;
        break;
      case 'semi-annual':
        perPayment = (s.annualDiv * divVar) / 2;
        break;
      case 'annual':
        perPayment = s.annualDiv * divVar;
        break;
      default:
        perPayment = (s.annualDiv * divVar) / 4;
    }

    const prevVar = 1 + (rng() - 0.5) * 0.04;
    const previousAmount = round2(perPayment * (1 / (1 + s.growth5Y / 100)) * prevVar);
    const amount = round2(perPayment);
    const changePct = previousAmount > 0 ? round2(((amount - previousAmount) / previousAmount) * 100) : 0;

    // Generate ex-date within next 30 days
    const daysAhead = 1 + Math.floor(rng() * 30);
    const exDate = addDays(now, daysAhead);
    const payDate = addDays(exDate, 14 + Math.floor(rng() * 21));

    const yieldPct = round2((s.annualDiv * divVar / price) * 100);

    results.push({
      ticker: s.ticker,
      name: s.name,
      exDate: formatDate(exDate),
      payDate: formatDate(payDate),
      amount,
      frequency: s.frequency,
      yield: yieldPct,
      previousAmount,
      change: changePct,
      sector: s.sector,
    });
  }

  // Sort by ex-date ascending
  results.sort((a, b) => a.exDate.localeCompare(b.exDate));
  return results;
}

function generateTopYields(rng: () => number): TopYield[] {
  // Sort by yield descending, pick top 15
  const withYields = STOCKS.map((s) => {
    const priceVar = 1 + (rng() - 0.5) * 0.08;
    const divVar = 1 + (rng() - 0.5) * 0.06;
    const price = s.basePrice * priceVar;
    const annualDiv = s.annualDiv * divVar;
    const yieldPct = (annualDiv / price) * 100;
    return { stock: s, yieldPct, annualDiv, price };
  });

  withYields.sort((a, b) => b.yieldPct - a.yieldPct);
  const top15 = withYields.slice(0, 15);

  return top15.map(({ stock: s, yieldPct, annualDiv }) => {
    const payoutVar = 1 + (rng() - 0.5) * 0.1;
    const payoutRatio = round1(s.payoutBase * payoutVar);
    const growthVar = s.growth5Y + (rng() - 0.5) * 2;
    const consecutiveYears = s.consecutiveYears;

    let safety: 'safe' | 'watch' | 'at risk';
    if (payoutRatio < 60 && growthVar > 2 && consecutiveYears >= 10) {
      safety = 'safe';
    } else if (payoutRatio > 85 || growthVar < -2) {
      safety = 'at risk';
    } else {
      safety = 'watch';
    }

    return {
      ticker: s.ticker,
      name: s.name,
      yield: round2(yieldPct),
      amount: round2(annualDiv),
      payoutRatio,
      fiveYearGrowthRate: round1(growthVar),
      consecutiveYears,
      dividendSafety: safety,
    };
  });
}

function generateGrowthLeaders(rng: () => number): DividendGrowthLeader[] {
  // Sort by 5Y growth descending, pick top 12
  const withGrowth = STOCKS.map((s) => {
    const growthVar5 = s.growth5Y + (rng() - 0.5) * 2;
    const growthVar3 = s.growth5Y * (1.1 + (rng() - 0.5) * 0.3);
    const growthVar1 = s.growth5Y * (1.2 + (rng() - 0.5) * 0.5);
    const priceVar = 1 + (rng() - 0.5) * 0.08;
    const divVar = 1 + (rng() - 0.5) * 0.06;
    const price = s.basePrice * priceVar;
    const currentYield = (s.annualDiv * divVar / price) * 100;
    // Yield on cost assumes bought 5 years ago at lower price
    const costBasis = price / Math.pow(1 + 0.08, 5); // approximate 8% annual appreciation
    const yieldOnCost = (s.annualDiv * divVar / costBasis) * 100;

    return {
      stock: s,
      fiveYearCAGR: growthVar5,
      threeYearCAGR: growthVar3,
      oneYearGrowth: growthVar1,
      currentYield,
      yieldOnCost,
    };
  });

  withGrowth.sort((a, b) => b.fiveYearCAGR - a.fiveYearCAGR);
  const top12 = withGrowth.slice(0, 12);

  return top12.map((g) => ({
    ticker: g.stock.ticker,
    name: g.stock.name,
    yieldOnCost: round2(g.yieldOnCost),
    currentYield: round2(g.currentYield),
    oneYearGrowth: round1(g.oneYearGrowth),
    threeYearCAGR: round1(g.threeYearCAGR),
    fiveYearCAGR: round1(g.fiveYearCAGR),
    dividendAristocrat: g.stock.aristocrat,
  }));
}

function generateMonthlyIncome(rng: () => number): MonthlyIncome[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return months.map((month, idx) => {
    // Quarterly payers cluster in certain months; monthly payers pay every month
    const quarterlyMonths = [
      [0, 3, 6, 9],   // Jan/Apr/Jul/Oct
      [1, 4, 7, 10],  // Feb/May/Aug/Nov
      [2, 5, 8, 11],  // Mar/Jun/Sep/Dec
    ];

    let payments = 0;
    let totalAmount = 0;
    const payers: { ticker: string; amount: number }[] = [];

    for (const s of STOCKS) {
      let paysThisMonth = false;
      const divVar = 1 + (rng() - 0.5) * 0.04;

      if (s.frequency === 'monthly') {
        paysThisMonth = true;
      } else if (s.frequency === 'quarterly') {
        const cycle = quarterlyMonths[s.exMonthOffset % 3];
        paysThisMonth = cycle.includes(idx);
      } else if (s.frequency === 'semi-annual') {
        paysThisMonth = idx === s.exMonthOffset || idx === (s.exMonthOffset + 6) % 12;
      } else {
        paysThisMonth = idx === s.exMonthOffset;
      }

      if (paysThisMonth) {
        let perPayment: number;
        switch (s.frequency) {
          case 'monthly':
            perPayment = (s.annualDiv * divVar) / 12;
            break;
          case 'semi-annual':
            perPayment = (s.annualDiv * divVar) / 2;
            break;
          case 'annual':
            perPayment = s.annualDiv * divVar;
            break;
          default:
            perPayment = (s.annualDiv * divVar) / 4;
        }
        payments++;
        totalAmount += perPayment;
        payers.push({ ticker: s.ticker, amount: perPayment });
      }
    }

    // Sort payers by amount descending, take top 3
    payers.sort((a, b) => b.amount - a.amount);
    const topPayers = payers.slice(0, 3).map((p) => p.ticker);

    return {
      month,
      totalPayments: payments,
      totalAmount: round2(totalAmount),
      topPayers,
    };
  });
}

function generateSectorYields(rng: () => number): SectorYield[] {
  return GICS_SECTORS.map((sector) => {
    const sectorStocks = STOCKS.filter((s) => s.sector === sector);

    if (sectorStocks.length === 0) {
      // Materials sector has no stocks in our universe - generate synthetic data
      const avgYield = round2(1.5 + rng() * 1.5);
      const medianYield = round2(avgYield * (0.9 + rng() * 0.2));
      const payoutRatio = round1(35 + rng() * 25);
      const coverageRatio = round2(1.5 + rng() * 2.5);
      const materialsTickers = ['LIN', 'APD', 'SHW', 'ECL', 'NEM'];
      return {
        sector,
        avgYield,
        medianYield,
        payoutRatio,
        coverageRatio,
        topPayer: pick(materialsTickers, rng),
      };
    }

    const yields = sectorStocks.map((s) => {
      const priceVar = 1 + (rng() - 0.5) * 0.08;
      const divVar = 1 + (rng() - 0.5) * 0.06;
      return (s.annualDiv * divVar) / (s.basePrice * priceVar) * 100;
    });

    yields.sort((a, b) => a - b);
    const avgYield = round2(yields.reduce((sum, y) => sum + y, 0) / yields.length);
    const medianYield = round2(
      yields.length % 2 === 0
        ? (yields[yields.length / 2 - 1] + yields[yields.length / 2]) / 2
        : yields[Math.floor(yields.length / 2)]
    );

    const payouts = sectorStocks.map((s) => s.payoutBase * (1 + (rng() - 0.5) * 0.1));
    const payoutRatio = round1(payouts.reduce((sum, p) => sum + p, 0) / payouts.length);
    const coverageRatio = round2(payoutRatio > 0 ? 100 / payoutRatio : 2.0);

    // Top payer = stock with highest yield in sector
    let topPayer = sectorStocks[0].ticker;
    let topYield = 0;
    for (const s of sectorStocks) {
      const y = s.annualDiv / s.basePrice * 100;
      if (y > topYield) {
        topYield = y;
        topPayer = s.ticker;
      }
    }

    return {
      sector,
      avgYield,
      medianYield,
      payoutRatio,
      coverageRatio,
      topPayer,
    };
  });
}

function generateRecentChanges(rng: () => number): RecentChange[] {
  const now = new Date();
  const changeTypes: RecentChange['type'][] = ['increase', 'decrease', 'initiation', 'suspension', 'special'];
  const typeWeights = [0.55, 0.10, 0.10, 0.05, 0.20]; // increases are most common

  const shuffled = [...STOCKS].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 10);

  return selected.map((s) => {
    // Pick type weighted by probability
    const r = rng();
    let cumulative = 0;
    let type: RecentChange['type'] = 'increase';
    for (let i = 0; i < changeTypes.length; i++) {
      cumulative += typeWeights[i];
      if (r < cumulative) {
        type = changeTypes[i];
        break;
      }
    }

    const perPayment = s.annualDiv / (s.frequency === 'monthly' ? 12 : s.frequency === 'semi-annual' ? 2 : 4);
    let oldAmount: number;
    let newAmount: number;
    let changePct: number;

    switch (type) {
      case 'increase': {
        const pct = 2 + rng() * 12; // 2-14% increase
        oldAmount = round2(perPayment / (1 + pct / 100));
        newAmount = round2(perPayment);
        changePct = round2(pct);
        break;
      }
      case 'decrease': {
        const pct = 5 + rng() * 30; // 5-35% decrease
        oldAmount = round2(perPayment * (1 + pct / 100));
        newAmount = round2(perPayment);
        changePct = round2(-pct);
        break;
      }
      case 'initiation': {
        oldAmount = 0;
        newAmount = round2(perPayment * (0.5 + rng() * 0.5));
        changePct = 0;
        break;
      }
      case 'suspension': {
        oldAmount = round2(perPayment);
        newAmount = 0;
        changePct = -100;
        break;
      }
      case 'special': {
        oldAmount = round2(perPayment);
        newAmount = round2(perPayment * (1.5 + rng() * 3)); // special is 1.5-4.5x normal
        changePct = round2(((newAmount - oldAmount) / oldAmount) * 100);
        break;
      }
    }

    // Announce date within past 14 days
    const daysAgo = Math.floor(rng() * 14);
    const announceDate = addDays(now, -daysAgo);

    return {
      ticker: s.ticker,
      name: s.name,
      type,
      oldAmount,
      newAmount,
      changePct,
      announceDate: formatDate(announceDate),
    };
  }).sort((a, b) => b.announceDate.localeCompare(a.announceDate));
}

// ── Main generator ──

function generateDividendCalendar(): DividendCalendarResponse {
  const now = new Date();
  const seed = hashSeed(`dividend-calendar-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${Math.floor(now.getMinutes() / 5)}`);
  const rng = mulberry32(seed);

  return {
    upcomingExDividend: generateUpcomingExDividend(rng),
    topYields: generateTopYields(rng),
    dividendGrowthLeaders: generateGrowthLeaders(rng),
    monthlyIncomeCalendar: generateMonthlyIncome(rng),
    sectorYields: generateSectorYields(rng),
    recentChanges: generateRecentChanges(rng),
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

    const result = generateDividendCalendar();
    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    console.error('[DividendCalendar] Error:', err instanceof Error ? err.message : err);
    // Stale fallback on error
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate dividend calendar data' });
  }
});

export default router;
