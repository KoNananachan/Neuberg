import { Router } from 'express';

const router = Router();

// ── Types ──

interface DividendQuarterHistory {
  date: string;
  amount: number;
  yieldAtDate: number;
}

interface DividendForecastStock {
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  annualDividend: number;
  forwardYield: number;
  trailingYield: number;
  payoutRatio: number;
  dividendGrowth5Y: number;
  dividendGrowth1Y: number;
  consecutiveYears: number;
  nextExDate: string;
  nextPayDate: string;
  frequency: 'quarterly' | 'monthly' | 'semi-annual';
  safetyScore: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Cut Risk';
  history: DividendQuarterHistory[];
}

interface DividendForecastResponse {
  data: DividendForecastStock[];
  generatedAt: string;
}

// ── Stock seed data with realistic base ranges ──

interface StockSeed {
  ticker: string;
  name: string;
  sector: string;
  priceBase: number;
  divBase: number;         // annual dividend base
  payoutBase: number;      // payout ratio base %
  growth5YBase: number;    // 5Y CAGR base %
  growth1YBase: number;    // 1Y growth base %
  consecutiveBase: number; // years of consecutive increases
  frequency: 'quarterly' | 'monthly' | 'semi-annual';
  exMonthOffset: number;   // months from January for next ex-date cycle
}

const STOCK_SEEDS: StockSeed[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', priceBase: 178, divBase: 0.96, payoutBase: 15, growth5YBase: 5.8, growth1YBase: 4.3, consecutiveBase: 12, frequency: 'quarterly', exMonthOffset: 1 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', priceBase: 415, divBase: 3.00, payoutBase: 25, growth5YBase: 10.2, growth1YBase: 10.3, consecutiveBase: 21, frequency: 'quarterly', exMonthOffset: 1 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', priceBase: 155, divBase: 4.76, payoutBase: 44, growth5YBase: 5.6, growth1YBase: 5.3, consecutiveBase: 62, frequency: 'quarterly', exMonthOffset: 2 },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', priceBase: 162, divBase: 3.76, payoutBase: 60, growth5YBase: 5.5, growth1YBase: 3.0, consecutiveBase: 68, frequency: 'quarterly', exMonthOffset: 0 },
  { ticker: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples', priceBase: 60, divBase: 1.84, payoutBase: 72, growth5YBase: 3.2, growth1YBase: 5.4, consecutiveBase: 62, frequency: 'quarterly', exMonthOffset: 2 },
  { ticker: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', priceBase: 170, divBase: 5.06, payoutBase: 66, growth5YBase: 6.8, growth1YBase: 10.0, consecutiveBase: 52, frequency: 'quarterly', exMonthOffset: 2 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', priceBase: 105, divBase: 3.64, payoutBase: 42, growth5YBase: 3.0, growth1YBase: 3.8, consecutiveBase: 41, frequency: 'quarterly', exMonthOffset: 1 },
  { ticker: 'CVX', name: 'Chevron Corp.', sector: 'Energy', priceBase: 155, divBase: 6.04, payoutBase: 47, growth5YBase: 6.0, growth1YBase: 7.6, consecutiveBase: 37, frequency: 'quarterly', exMonthOffset: 1 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', priceBase: 195, divBase: 4.00, payoutBase: 27, growth5YBase: 6.7, growth1YBase: 9.5, consecutiveBase: 13, frequency: 'quarterly', exMonthOffset: 0 },
  { ticker: 'BAC', name: 'Bank of America Corp.', sector: 'Financials', priceBase: 35, divBase: 0.96, payoutBase: 30, growth5YBase: 10.5, growth1YBase: 8.3, consecutiveBase: 10, frequency: 'quarterly', exMonthOffset: 2 },
  { ticker: 'T', name: 'AT&T Inc.', sector: 'Communication', priceBase: 17, divBase: 1.11, payoutBase: 55, growth5YBase: -5.0, growth1YBase: 2.0, consecutiveBase: 2, frequency: 'quarterly', exMonthOffset: 0 },
  { ticker: 'VZ', name: 'Verizon Communications', sector: 'Communication', priceBase: 38, divBase: 2.66, payoutBase: 57, growth5YBase: 1.9, growth1YBase: 1.9, consecutiveBase: 19, frequency: 'quarterly', exMonthOffset: 0 },
  { ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', priceBase: 165, divBase: 6.20, payoutBase: 48, growth5YBase: 8.5, growth1YBase: 4.7, consecutiveBase: 52, frequency: 'quarterly', exMonthOffset: 0 },
  { ticker: 'MRK', name: 'Merck & Co.', sector: 'Healthcare', priceBase: 120, divBase: 3.08, payoutBase: 38, growth5YBase: 7.2, growth1YBase: 5.6, consecutiveBase: 13, frequency: 'quarterly', exMonthOffset: 2 },
  { ticker: 'MCD', name: "McDonald's Corp.", sector: 'Consumer Discretionary', priceBase: 290, divBase: 6.68, payoutBase: 57, growth5YBase: 8.0, growth1YBase: 10.1, consecutiveBase: 48, frequency: 'quarterly', exMonthOffset: 2 },
  { ticker: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary', priceBase: 345, divBase: 8.36, payoutBase: 50, growth5YBase: 12.0, growth1YBase: 7.7, consecutiveBase: 14, frequency: 'quarterly', exMonthOffset: 2 },
  { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', priceBase: 165, divBase: 0.83, payoutBase: 35, growth5YBase: 1.9, growth1YBase: 9.0, consecutiveBase: 51, frequency: 'quarterly', exMonthOffset: 0 },
  { ticker: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', priceBase: 720, divBase: 4.08, payoutBase: 26, growth5YBase: 12.5, growth1YBase: 13.7, consecutiveBase: 20, frequency: 'quarterly', exMonthOffset: 0 },
  { ticker: 'TXN', name: 'Texas Instruments', sector: 'Technology', priceBase: 175, divBase: 5.20, payoutBase: 62, growth5YBase: 11.0, growth1YBase: 4.8, consecutiveBase: 20, frequency: 'quarterly', exMonthOffset: 0 },
  { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', priceBase: 1350, divBase: 21.00, payoutBase: 40, growth5YBase: 15.0, growth1YBase: 14.0, consecutiveBase: 14, frequency: 'quarterly', exMonthOffset: 2 },
];

// ── Seeded random for deterministic data within a time window ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function dateSeed(): number {
  const d = new Date();
  // Changes every 5 minutes for deterministic windows
  const minutes = Math.floor(d.getMinutes() / 5) * 5;
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + minutes;
}

// ── Helper functions ──

function nextExDate(monthOffset: number, rng: () => number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Find the next ex-date based on quarterly cycle
  for (let q = 0; q < 4; q++) {
    const m = (monthOffset + q * 3) % 12;
    const candidateMonth = m;
    const day = 5 + Math.floor(rng() * 20); // ex-date between 5th and 25th
    const candidate = new Date(year, candidateMonth, day);
    if (candidate > now) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  // Wrap to next year
  const m = monthOffset % 12;
  const day = 5 + Math.floor(rng() * 20);
  return new Date(year + 1, m, day).toISOString().slice(0, 10);
}

function nextPayDate(exDate: string, rng: () => number): string {
  const ex = new Date(exDate + 'T00:00:00');
  const daysAfter = 14 + Math.floor(rng() * 21); // 14-35 days after ex-date
  ex.setDate(ex.getDate() + daysAfter);
  return ex.toISOString().slice(0, 10);
}

function computeRating(safetyScore: number, growth1Y: number, payoutRatio: number): 'Strong Buy' | 'Buy' | 'Hold' | 'Cut Risk' {
  if (safetyScore >= 80 && growth1Y > 5) return 'Strong Buy';
  if (safetyScore >= 60 && growth1Y >= 0) return 'Buy';
  if (safetyScore >= 40) return 'Hold';
  return 'Cut Risk';
}

function buildHistory(
  annualDiv: number,
  growth1Y: number,
  growth5Y: number,
  price: number,
  rng: () => number,
): DividendQuarterHistory[] {
  const history: DividendQuarterHistory[] = [];
  const now = new Date();
  const quarterlyDiv = annualDiv / 4;

  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i * 3);
    const dateStr = d.toISOString().slice(0, 10);

    // Simulate slightly lower past dividends using growth rates
    const yearsBack = (i * 3) / 12;
    const avgGrowth = (growth1Y + growth5Y) / 2;
    const pastMultiplier = 1 / Math.pow(1 + avgGrowth / 100, yearsBack);
    const amount = Math.round(quarterlyDiv * pastMultiplier * (0.98 + rng() * 0.04) * 10000) / 10000;

    // Past price was somewhat different
    const priceVariation = 1 + (rng() - 0.5) * 0.15;
    const pastPrice = price * pastMultiplier * priceVariation;
    const yieldAtDate = pastPrice > 0 ? Math.round((amount * 4 / pastPrice) * 10000) / 100 : 0;

    history.push({ date: dateStr, amount, yieldAtDate });
  }

  return history;
}

// ── Cache ──

let cache: { data: DividendForecastResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Generate data ──

function generateForecastData(): DividendForecastResponse {
  const seed = dateSeed();
  const rng = seededRandom(seed);

  const data: DividendForecastStock[] = STOCK_SEEDS.map((s) => {
    // Add small deterministic variation to base values
    const priceVar = 1 + (rng() - 0.5) * 0.06;
    const divVar = 1 + (rng() - 0.5) * 0.04;
    const payoutVar = 1 + (rng() - 0.5) * 0.08;
    const growth5YVar = s.growth5YBase + (rng() - 0.5) * 1.5;
    const growth1YVar = s.growth1YBase + (rng() - 0.5) * 2.0;

    const currentPrice = Math.round(s.priceBase * priceVar * 100) / 100;
    const annualDividend = Math.round(s.divBase * divVar * 100) / 100;
    const forwardYield = Math.round((annualDividend / currentPrice) * 10000) / 100;
    const trailingYield = Math.round(forwardYield * (0.95 + rng() * 0.1) * 100) / 100;
    const payoutRatio = Math.round(s.payoutBase * payoutVar * 10) / 10;
    const dividendGrowth5Y = Math.round(growth5YVar * 10) / 10;
    const dividendGrowth1Y = Math.round(growth1YVar * 10) / 10;
    const consecutiveYears = s.consecutiveBase;

    const exDate = nextExDate(s.exMonthOffset, rng);
    const payDate = nextPayDate(exDate, rng);

    // Safety score: higher for low payout, high growth, long streak
    let safetyBase = 50;
    if (payoutRatio < 40) safetyBase += 15;
    else if (payoutRatio < 60) safetyBase += 8;
    else if (payoutRatio > 80) safetyBase -= 15;
    if (dividendGrowth5Y > 8) safetyBase += 12;
    else if (dividendGrowth5Y > 4) safetyBase += 6;
    else if (dividendGrowth5Y < 0) safetyBase -= 20;
    if (consecutiveYears > 25) safetyBase += 10;
    else if (consecutiveYears > 10) safetyBase += 5;
    else if (consecutiveYears < 5) safetyBase -= 10;
    // Add small random variation
    safetyBase += Math.floor((rng() - 0.5) * 8);
    const safetyScore = Math.max(10, Math.min(99, safetyBase));

    const rating = computeRating(safetyScore, dividendGrowth1Y, payoutRatio);

    const history = buildHistory(annualDividend, dividendGrowth1Y, dividendGrowth5Y, currentPrice, rng);

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      currentPrice,
      annualDividend,
      forwardYield,
      trailingYield,
      payoutRatio,
      dividendGrowth5Y,
      dividendGrowth1Y,
      consecutiveYears,
      nextExDate: exDate,
      nextPayDate: payDate,
      frequency: s.frequency,
      safetyScore,
      rating,
      history,
    };
  });

  return {
    data,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const result = generateForecastData();
    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    console.error('[DividendForecast] Error:', err instanceof Error ? err.message : err);
    // Return stale cache if available
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate dividend forecast data' });
  }
});

export default router;
