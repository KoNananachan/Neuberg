import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Reference Data ──

type Signal = 'strong buy' | 'buy' | 'hold' | 'sell';
type Factor = 'momentum' | 'value' | 'quality' | 'growth';

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
];

const STOCK_POOL: { ticker: string; name: string; sector: string; basePrice: number; baseMcap: number }[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', basePrice: 189.5, baseMcap: 2950 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', basePrice: 415.8, baseMcap: 3090 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', basePrice: 875.3, baseMcap: 2160 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', basePrice: 156.2, baseMcap: 1930 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', basePrice: 185.6, baseMcap: 1920 },
  { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', basePrice: 505.4, baseMcap: 1290 },
  { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', basePrice: 248.9, baseMcap: 792 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', basePrice: 408.2, baseMcap: 885 },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', basePrice: 527.1, baseMcap: 488 },
  { ticker: 'LLY', name: 'Eli Lilly & Co.', sector: 'Healthcare', basePrice: 782.5, baseMcap: 743 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', basePrice: 198.7, baseMcap: 572 },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', basePrice: 279.3, baseMcap: 562 },
  { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', basePrice: 1345.6, baseMcap: 626 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', basePrice: 104.8, baseMcap: 440 },
  { ticker: 'MA', name: 'Mastercard Inc.', sector: 'Financials', basePrice: 458.2, baseMcap: 427 },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', basePrice: 162.4, baseMcap: 382 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 158.3, baseMcap: 381 },
  { ticker: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary', basePrice: 348.7, baseMcap: 346 },
  { ticker: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', basePrice: 728.4, baseMcap: 323 },
  { ticker: 'MRK', name: 'Merck & Co.', sector: 'Healthcare', basePrice: 126.9, baseMcap: 321 },
  { ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', basePrice: 174.5, baseMcap: 308 },
  { ticker: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', basePrice: 272.3, baseMcap: 264 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', basePrice: 178.6, baseMcap: 289 },
  { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', basePrice: 628.5, baseMcap: 272 },
  { ticker: 'CVX', name: 'Chevron Corp.', sector: 'Energy', basePrice: 155.2, baseMcap: 290 },
  { ticker: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples', basePrice: 60.8, baseMcap: 263 },
  { ticker: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', basePrice: 172.1, baseMcap: 236 },
  { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', basePrice: 168.4, baseMcap: 453 },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', basePrice: 35.8, baseMcap: 282 },
  { ticker: 'LIN', name: 'Linde plc', sector: 'Materials', basePrice: 445.6, baseMcap: 213 },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific', sector: 'Healthcare', basePrice: 572.3, baseMcap: 218 },
  { ticker: 'ACN', name: 'Accenture plc', sector: 'Technology', basePrice: 368.7, baseMcap: 231 },
  { ticker: 'ORCL', name: 'Oracle Corp.', sector: 'Technology', basePrice: 125.4, baseMcap: 345 },
  { ticker: 'MCD', name: 'McDonald\'s Corp.', sector: 'Consumer Discretionary', basePrice: 296.5, baseMcap: 213 },
  { ticker: 'ABT', name: 'Abbott Laboratories', sector: 'Healthcare', basePrice: 112.8, baseMcap: 195 },
  { ticker: 'CSCO', name: 'Cisco Systems', sector: 'Technology', basePrice: 50.4, baseMcap: 205 },
  { ticker: 'NEE', name: 'NextEra Energy', sector: 'Utilities', basePrice: 62.3, baseMcap: 128 },
  { ticker: 'GE', name: 'GE Aerospace', sector: 'Industrials', basePrice: 162.8, baseMcap: 178 },
  { ticker: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', basePrice: 312.5, baseMcap: 153 },
  { ticker: 'PLD', name: 'Prologis Inc.', sector: 'Real Estate', basePrice: 128.7, baseMcap: 119 },
  { ticker: 'DE', name: 'Deere & Company', sector: 'Industrials', basePrice: 398.2, baseMcap: 115 },
  { ticker: 'RTX', name: 'RTX Corp.', sector: 'Industrials', basePrice: 96.4, baseMcap: 128 },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials', basePrice: 415.6, baseMcap: 138 },
  { ticker: 'SLB', name: 'Schlumberger Ltd.', sector: 'Energy', basePrice: 52.3, baseMcap: 74 },
  { ticker: 'SO', name: 'Southern Company', sector: 'Utilities', basePrice: 72.8, baseMcap: 79 },
  { ticker: 'DUK', name: 'Duke Energy', sector: 'Utilities', basePrice: 98.5, baseMcap: 76 },
  { ticker: 'APD', name: 'Air Products & Chemicals', sector: 'Materials', basePrice: 238.4, baseMcap: 53 },
  { ticker: 'EOG', name: 'EOG Resources', sector: 'Energy', basePrice: 121.7, baseMcap: 70 },
  { ticker: 'AMT', name: 'American Tower Corp.', sector: 'Real Estate', basePrice: 205.3, baseMcap: 96 },
  { ticker: 'ETN', name: 'Eaton Corp.', sector: 'Industrials', basePrice: 278.5, baseMcap: 111 },
];

// ── Types ──

interface TopStock {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  compositeScore: number;
  momentumScore: number;
  valueScore: number;
  qualityScore: number;
  growthScore: number;
  price: number;
  marketCap: number;
  peRatio: number;
  returnYtd: number;
  signal: Signal;
}

interface FactorDistribution {
  factor: Factor;
  mean: number;
  median: number;
  stdDev: number;
  topDecile: number;
  bottomDecile: number;
}

interface SectorAllocation {
  sector: string;
  avgScore: number;
  stockCount: number;
  topPick: string;
  weightVsBenchmark: number;
}

interface SignalPerformance {
  period: string;
  longReturn: number;
  shortReturn: number;
  spreadReturn: number;
  hitRate: number;
  informationRatio: number;
}

interface RecentSignalChange {
  ticker: string;
  name: string;
  previousSignal: Signal;
  newSignal: Signal;
  scoreChange: number;
  date: string;
  driver: Factor;
}

interface ScreenCriteria {
  universeSize: number;
  passedCount: number;
  criteria: { factor: string; operator: string; value: number }[];
}

interface EquityScreenData {
  timestamp: string;
  topRankedStocks: TopStock[];
  factorScoresDistribution: FactorDistribution[];
  sectorAllocation: SectorAllocation[];
  signalPerformance: SignalPerformance[];
  recentSignalChanges: RecentSignalChange[];
  screenCriteria: ScreenCriteria;
}

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function signalFromScore(score: number): Signal {
  if (score >= 82) return 'strong buy';
  if (score >= 62) return 'buy';
  if (score >= 38) return 'hold';
  return 'sell';
}

function gaussian(rng: () => number): number {
  // Box-Muller transform for normally distributed values
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
}
let cache: { data: EquityScreenData | null; ts: number } = { data: null, ts: 0 };

// ── Generator ──

function generate(): EquityScreenData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-equity-screen'));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // 1. Generate scores for the entire pool, then pick top 20
  const allStocks = STOCK_POOL.map((s) => {
    const momentum = Math.max(0, Math.min(100, round2(50 + gaussian(rng) * 22)));
    const value = Math.max(0, Math.min(100, round2(50 + gaussian(rng) * 20)));
    const quality = Math.max(0, Math.min(100, round2(55 + gaussian(rng) * 18)));
    const growth = Math.max(0, Math.min(100, round2(50 + gaussian(rng) * 21)));
    const composite = round2(momentum * 0.3 + value * 0.2 + quality * 0.25 + growth * 0.25);

    // Price jitter (+/- 5%)
    const priceMultiplier = 0.95 + rng() * 0.10;
    const price = round2(s.basePrice * priceMultiplier);
    const mcap = round2(s.baseMcap * priceMultiplier);

    // PE ratio: tech/growth 20-45, value/staples 12-25, financials 8-18
    let peBase: number;
    if (['Technology', 'Communication Services'].includes(s.sector)) {
      peBase = 22 + rng() * 23;
    } else if (['Financials', 'Energy'].includes(s.sector)) {
      peBase = 8 + rng() * 10;
    } else if (['Utilities', 'Real Estate'].includes(s.sector)) {
      peBase = 14 + rng() * 8;
    } else {
      peBase = 14 + rng() * 16;
    }
    const peRatio = round2(peBase);

    // YTD return: realistic range -15% to +45%
    const returnYtd = round2(-15 + rng() * 60);

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      compositeScore: composite,
      momentumScore: momentum,
      valueScore: value,
      qualityScore: quality,
      growthScore: growth,
      price,
      marketCap: mcap,
      peRatio,
      returnYtd,
    };
  });

  // Sort by composite score descending, take top 20
  allStocks.sort((a, b) => b.compositeScore - a.compositeScore);
  const top20 = allStocks.slice(0, 20);

  const topRankedStocks: TopStock[] = top20.map((s, i) => ({
    rank: i + 1,
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    compositeScore: s.compositeScore,
    momentumScore: s.momentumScore,
    valueScore: s.valueScore,
    qualityScore: s.qualityScore,
    growthScore: s.growthScore,
    price: s.price,
    marketCap: s.marketCap,
    peRatio: s.peRatio,
    returnYtd: s.returnYtd,
    signal: signalFromScore(s.compositeScore),
  }));

  // 2. Factor Scores Distribution (computed over entire pool)
  const factors: Factor[] = ['momentum', 'value', 'quality', 'growth'];
  const factorKeys: Record<Factor, keyof typeof allStocks[0]> = {
    momentum: 'momentumScore',
    value: 'valueScore',
    quality: 'qualityScore',
    growth: 'growthScore',
  };

  const factorScoresDistribution: FactorDistribution[] = factors.map((factor) => {
    const key = factorKeys[factor];
    const scores = allStocks.map((s) => s[key] as number).sort((a, b) => a - b);
    const n = scores.length;
    const mean = round2(scores.reduce((a, b) => a + b, 0) / n);
    const mid = Math.floor(n / 2);
    const median = round2(n % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid]);
    const variance = scores.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
    const stdDev = round2(Math.sqrt(variance));
    const topDecile = round2(scores[Math.floor(n * 0.9)]);
    const bottomDecile = round2(scores[Math.floor(n * 0.1)]);
    return { factor, mean, median, stdDev, topDecile, bottomDecile };
  });

  // 3. Sector Allocation (all 11 GICS sectors)
  const sectorAllocation: SectorAllocation[] = SECTORS.map((sector) => {
    const sectorStocks = allStocks.filter((s) => s.sector === sector);
    const count = sectorStocks.length;

    if (count === 0) {
      return {
        sector,
        avgScore: round2(40 + rng() * 20),
        stockCount: 0,
        topPick: '-',
        weightVsBenchmark: round2(-2 + rng() * 4),
      };
    }

    const avgScore = round2(sectorStocks.reduce((sum, s) => sum + s.compositeScore, 0) / count);
    const topPick = sectorStocks.sort((a, b) => b.compositeScore - a.compositeScore)[0].ticker;
    // Weight vs benchmark: realistic range -3% to +3%
    const weightVsBenchmark = round2(-3 + rng() * 6);

    return { sector, avgScore, stockCount: count, topPick, weightVsBenchmark };
  });

  // 4. Signal Performance (backtested lookback periods)
  const periods = [
    { label: '1M', baseLong: 2.1, baseShort: -1.8 },
    { label: '3M', baseLong: 5.4, baseShort: -3.2 },
    { label: '6M', baseLong: 9.8, baseShort: -5.6 },
    { label: '1Y', baseLong: 16.5, baseShort: -8.4 },
  ];

  const signalPerformance: SignalPerformance[] = periods.map((p) => {
    const longReturn = round2(p.baseLong + gaussian(rng) * 1.5);
    const shortReturn = round2(p.baseShort + gaussian(rng) * 1.2);
    const spreadReturn = round2(longReturn - shortReturn);
    // Hit rate: 52-68% range (realistic)
    const hitRate = round2(52 + rng() * 16);
    // Information ratio: 0.3 - 1.8 range
    const informationRatio = round2(0.3 + rng() * 1.5);
    return { period: p.label, longReturn, shortReturn, spreadReturn, hitRate, informationRatio };
  });

  // 5. Recent Signal Changes (10 entries)
  const signalValues: Signal[] = ['strong buy', 'buy', 'hold', 'sell'];
  const driverFactors: Factor[] = ['momentum', 'value', 'quality', 'growth'];
  const usedTickers = new Set<string>();
  const recentSignalChanges: RecentSignalChange[] = [];

  while (recentSignalChanges.length < 10) {
    const stock = pick(STOCK_POOL);
    if (usedTickers.has(stock.ticker)) continue;
    usedTickers.add(stock.ticker);

    const prevIdx = Math.floor(rng() * signalValues.length);
    let newIdx = Math.floor(rng() * signalValues.length);
    if (newIdx === prevIdx) newIdx = (newIdx + 1) % signalValues.length;

    const previousSignal = signalValues[prevIdx];
    const newSignal = signalValues[newIdx];

    // Score change: positive if upgrade, negative if downgrade
    const direction = newIdx < prevIdx ? 1 : -1;
    const scoreChange = round2(direction * (5 + rng() * 18));

    // Date: within last 5 trading days
    const daysAgo = Math.floor(rng() * 5);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    }

    const driver = pick(driverFactors);

    recentSignalChanges.push({
      ticker: stock.ticker,
      name: stock.name,
      previousSignal,
      newSignal,
      scoreChange,
      date: date.toISOString().slice(0, 10),
      driver,
    });
  }

  // Sort by date descending (most recent first)
  recentSignalChanges.sort((a, b) => b.date.localeCompare(a.date));

  // 6. Screen Criteria
  const screenCriteria: ScreenCriteria = {
    universeSize: 3000,
    passedCount: 20 + Math.floor(rng() * 30),
    criteria: [
      { factor: 'Market Cap', operator: '>=', value: 10 },
      { factor: 'Composite Score', operator: '>=', value: round2(55 + rng() * 10) },
      { factor: 'Momentum Score', operator: '>=', value: round2(40 + rng() * 15) },
      { factor: 'Quality Score', operator: '>=', value: round2(35 + rng() * 15) },
      { factor: 'P/E Ratio', operator: '<=', value: round2(35 + rng() * 10) },
      { factor: 'YTD Return', operator: '>=', value: round2(-5 + rng() * 10) },
    ],
  };

  return {
    timestamp: new Date().toISOString(),
    topRankedStocks,
    factorScoresDistribution,
    sectorAllocation,
    signalPerformance,
    recentSignalChanges,
    screenCriteria,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EquityScreenResults] Error:', message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity screen results' });
  }
});

export default router;
