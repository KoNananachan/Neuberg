import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface InsiderTrade {
  ticker: string;
  companyName: string;
  insiderName: string;
  title: string;
  transactionType: 'Buy' | 'Sell' | 'Exercise';
  shares: number;
  price: number;
  totalValue: number;
  date: string;
  remainingHoldings: number;
}

interface ClusterActivity {
  ticker: string;
  companyName: string;
  insiderCount: number;
  totalValue: number;
  timeframeDays: number;
}

interface LargestTransaction {
  ticker: string;
  companyName: string;
  insiderName: string;
  title: string;
  transactionType: 'Buy' | 'Sell';
  totalValue: number;
  shares: number;
  price: number;
  date: string;
}

interface SectorSummary {
  sector: string;
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  buySellRatio: number;
}

interface InsiderSentiment {
  currentBuySellRatio: number;
  fourWeekMovingAvg: number;
  historicalAvg: number;
  signal: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  totalBuys: number;
  totalSells: number;
}

interface NotableInsider {
  name: string;
  company: string;
  ticker: string;
  title: string;
  avgReturnAfterPurchase: number;
  hitRate: number;
  totalTransactions: number;
  lastTransactionDate: string;
}

interface Section16Filing {
  ticker: string;
  companyName: string;
  insiderName: string;
  title: string;
  transactionType: 'Buy' | 'Sell' | 'Exercise';
  shares: number;
  price: number;
  filingDate: string;
  transactionDate: string;
  filingDelayDays: number;
  lateFiling: boolean;
}

interface InsiderTransactionResponse {
  recentTransactions: InsiderTrade[];
  clusterBuying: ClusterActivity[];
  clusterSelling: ClusterActivity[];
  largestTransactions: LargestTransaction[];
  sectorSummary: SectorSummary[];
  insiderSentiment: InsiderSentiment;
  notableInsiders: NotableInsider[];
  section16: Section16Filing[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: InsiderTransactionResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Configuration data ──

interface CompanyConfig {
  ticker: string;
  companyName: string;
  sector: string;
  basePrice: number;
}

const COMPANIES: CompanyConfig[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc', sector: 'Technology', basePrice: 198.50 },
  { ticker: 'MSFT', companyName: 'Microsoft Corp', sector: 'Technology', basePrice: 415.20 },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc', sector: 'Technology', basePrice: 175.80 },
  { ticker: 'AMZN', companyName: 'Amazon.com Inc', sector: 'Consumer Discretionary', basePrice: 192.30 },
  { ticker: 'NVDA', companyName: 'NVIDIA Corp', sector: 'Technology', basePrice: 885.40 },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co', sector: 'Financials', basePrice: 198.70 },
  { ticker: 'JNJ', companyName: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 156.80 },
  { ticker: 'V', companyName: 'Visa Inc', sector: 'Financials', basePrice: 282.90 },
  { ticker: 'PG', companyName: 'Procter & Gamble Co', sector: 'Consumer Staples', basePrice: 162.40 },
  { ticker: 'UNH', companyName: 'UnitedHealth Group', sector: 'Healthcare', basePrice: 528.60 },
  { ticker: 'HD', companyName: 'Home Depot Inc', sector: 'Consumer Discretionary', basePrice: 368.20 },
  { ticker: 'MA', companyName: 'Mastercard Inc', sector: 'Financials', basePrice: 468.50 },
  { ticker: 'XOM', companyName: 'Exxon Mobil Corp', sector: 'Energy', basePrice: 108.90 },
  { ticker: 'LLY', companyName: 'Eli Lilly & Co', sector: 'Healthcare', basePrice: 782.30 },
  { ticker: 'BAC', companyName: 'Bank of America Corp', sector: 'Financials', basePrice: 37.80 },
  { ticker: 'PFE', companyName: 'Pfizer Inc', sector: 'Healthcare', basePrice: 27.40 },
  { ticker: 'ABBV', companyName: 'AbbVie Inc', sector: 'Healthcare', basePrice: 168.90 },
  { ticker: 'COST', companyName: 'Costco Wholesale Corp', sector: 'Consumer Staples', basePrice: 722.10 },
  { ticker: 'CVX', companyName: 'Chevron Corp', sector: 'Energy', basePrice: 158.70 },
  { ticker: 'MRK', companyName: 'Merck & Co Inc', sector: 'Healthcare', basePrice: 124.50 },
  { ticker: 'WMT', companyName: 'Walmart Inc', sector: 'Consumer Staples', basePrice: 168.30 },
  { ticker: 'CRM', companyName: 'Salesforce Inc', sector: 'Technology', basePrice: 298.40 },
  { ticker: 'NEE', companyName: 'NextEra Energy Inc', sector: 'Utilities', basePrice: 62.80 },
  { ticker: 'DUK', companyName: 'Duke Energy Corp', sector: 'Utilities', basePrice: 98.50 },
  { ticker: 'AMT', companyName: 'American Tower Corp', sector: 'Real Estate', basePrice: 205.60 },
  { ticker: 'PLD', companyName: 'Prologis Inc', sector: 'Real Estate', basePrice: 128.40 },
  { ticker: 'DE', companyName: 'Deere & Co', sector: 'Industrials', basePrice: 398.70 },
  { ticker: 'CAT', companyName: 'Caterpillar Inc', sector: 'Industrials', basePrice: 342.50 },
  { ticker: 'LMT', companyName: 'Lockheed Martin Corp', sector: 'Industrials', basePrice: 452.80 },
  { ticker: 'RTX', companyName: 'RTX Corp', sector: 'Industrials', basePrice: 98.60 },
];

const INSIDER_NAMES = [
  'James R. Mitchell', 'Sarah K. Thornton', 'Michael D. Patterson', 'Linda J. Brooks',
  'Robert A. Sullivan', 'Patricia M. Hayes', 'William F. Cooper', 'Jennifer L. Reynolds',
  'David E. Morrison', 'Elizabeth T. Crawford', 'Richard C. Bennett', 'Susan P. Hamilton',
  'Thomas G. Anderson', 'Margaret A. Foster', 'Charles B. Watson', 'Nancy D. Griffin',
  'Christopher H. Powell', 'Karen S. Henderson', 'Daniel R. Campbell', 'Lisa M. Burke',
  'Steven J. Palmer', 'Donna K. Spencer', 'Andrew F. Reed', 'Michelle L. Ward',
  'Mark T. Hughes', 'Barbara E. Coleman', 'Paul W. Simmons', 'Dorothy C. Murphy',
  'Brian N. Russell', 'Cynthia A. Price',
];

const INSIDER_TITLES = [
  'CEO', 'CFO', 'COO', 'CTO', 'President', 'EVP', 'SVP',
  'Director', 'Independent Director', '10% Owner', 'General Counsel',
  'VP of Engineering', 'Chief Strategy Officer', 'Board Chair',
];

const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
  'Consumer Staples', 'Energy', 'Industrials', 'Utilities', 'Real Estate',
];

// ── Helper ──

function pickItem<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateDateWithinDays(rng: () => number, daysBack: number): string {
  const now = new Date();
  const offset = Math.floor(rng() * daysBack);
  const date = new Date(now.getTime() - offset * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Data generation ──

function generateRecentTransactions(rng: () => number): InsiderTrade[] {
  const count = 20 + Math.floor(rng() * 10);
  const trades: InsiderTrade[] = [];

  for (let i = 0; i < count; i++) {
    const company = pickItem(COMPANIES, rng);
    const priceJitter = (rng() - 0.5) * company.basePrice * 0.08;
    const price = round2(company.basePrice + priceJitter);

    const txTypes: Array<'Buy' | 'Sell' | 'Exercise'> = ['Buy', 'Sell', 'Sell', 'Exercise'];
    const transactionType = pickItem(txTypes, rng);

    const shareBase = transactionType === 'Exercise'
      ? 5000 + Math.floor(rng() * 50000)
      : transactionType === 'Buy'
        ? 1000 + Math.floor(rng() * 30000)
        : 2000 + Math.floor(rng() * 80000);
    const shares = Math.round(shareBase / 100) * 100;

    const totalValue = round2(shares * price);
    const remainingHoldings = Math.floor(rng() * 500000) + 10000;

    trades.push({
      ticker: company.ticker,
      companyName: company.companyName,
      insiderName: pickItem(INSIDER_NAMES, rng),
      title: pickItem(INSIDER_TITLES, rng),
      transactionType,
      shares,
      price,
      totalValue,
      date: generateDateWithinDays(rng, 14),
      remainingHoldings,
    });
  }

  return trades.sort((a, b) => b.date.localeCompare(a.date));
}

function generateClusterActivity(rng: () => number, type: 'buy' | 'sell'): ClusterActivity[] {
  const count = 4 + Math.floor(rng() * 4);
  const used = new Set<string>();
  const clusters: ClusterActivity[] = [];

  for (let i = 0; i < count; i++) {
    let company: CompanyConfig;
    do {
      company = pickItem(COMPANIES, rng);
    } while (used.has(company.ticker));
    used.add(company.ticker);

    const insiderCount = 3 + Math.floor(rng() * 5);
    const baseTotalValue = type === 'buy'
      ? 500_000 + rng() * 15_000_000
      : 1_000_000 + rng() * 30_000_000;
    const totalValue = Math.round(baseTotalValue);
    const timeframeDays = 7 + Math.floor(rng() * 24);

    clusters.push({
      ticker: company.ticker,
      companyName: company.companyName,
      insiderCount,
      totalValue,
      timeframeDays,
    });
  }

  return clusters.sort((a, b) => b.totalValue - a.totalValue);
}

function generateLargestTransactions(rng: () => number): LargestTransaction[] {
  const count = 10 + Math.floor(rng() * 6);
  const txns: LargestTransaction[] = [];

  for (let i = 0; i < count; i++) {
    const company = pickItem(COMPANIES, rng);
    const priceJitter = (rng() - 0.5) * company.basePrice * 0.08;
    const price = round2(company.basePrice + priceJitter);

    const transactionType: 'Buy' | 'Sell' = rng() > 0.55 ? 'Sell' : 'Buy';
    const shares = Math.round((50000 + rng() * 500000) / 100) * 100;
    const totalValue = round2(shares * price);

    txns.push({
      ticker: company.ticker,
      companyName: company.companyName,
      insiderName: pickItem(INSIDER_NAMES, rng),
      title: pickItem(INSIDER_TITLES, rng),
      transactionType,
      totalValue,
      shares,
      price,
      date: generateDateWithinDays(rng, 30),
    });
  }

  return txns.sort((a, b) => b.totalValue - a.totalValue);
}

function generateSectorSummary(rng: () => number): SectorSummary[] {
  return SECTORS.map((sector) => {
    const buyCount = 5 + Math.floor(rng() * 25);
    const sellCount = 8 + Math.floor(rng() * 35);
    const buyValue = Math.round((500_000 + rng() * 20_000_000));
    const sellValue = Math.round((1_000_000 + rng() * 40_000_000));
    const buySellRatio = round2(buyCount / Math.max(sellCount, 1));

    return {
      sector,
      buyCount,
      sellCount,
      buyValue,
      sellValue,
      buySellRatio,
    };
  });
}

function generateInsiderSentiment(rng: () => number): InsiderSentiment {
  const totalBuys = 80 + Math.floor(rng() * 120);
  const totalSells = 150 + Math.floor(rng() * 200);

  const currentBuySellRatio = round2(totalBuys / Math.max(totalSells, 1));
  const fourWeekMovingAvg = round2(0.3 + rng() * 0.8);
  const historicalAvg = 0.52;

  let signal: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  if (fourWeekMovingAvg > historicalAvg * 1.3) {
    signal = 'BULLISH';
  } else if (fourWeekMovingAvg < historicalAvg * 0.7) {
    signal = 'BEARISH';
  } else {
    signal = 'NEUTRAL';
  }

  return {
    currentBuySellRatio,
    fourWeekMovingAvg,
    historicalAvg,
    signal,
    totalBuys,
    totalSells,
  };
}

function generateNotableInsiders(rng: () => number): NotableInsider[] {
  const count = 8 + Math.floor(rng() * 5);
  const usedNames = new Set<string>();
  const insiders: NotableInsider[] = [];

  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = pickItem(INSIDER_NAMES, rng);
    } while (usedNames.has(name));
    usedNames.add(name);

    const company = pickItem(COMPANIES, rng);
    const avgReturnAfterPurchase = round2(-5 + rng() * 35);
    const hitRate = round2(40 + rng() * 50);
    const totalTransactions = 5 + Math.floor(rng() * 30);

    insiders.push({
      name,
      company: company.companyName,
      ticker: company.ticker,
      title: pickItem(INSIDER_TITLES, rng),
      avgReturnAfterPurchase,
      hitRate,
      totalTransactions,
      lastTransactionDate: generateDateWithinDays(rng, 60),
    });
  }

  return insiders.sort((a, b) => b.avgReturnAfterPurchase - a.avgReturnAfterPurchase);
}

function generateSection16Filings(rng: () => number): Section16Filing[] {
  const count = 12 + Math.floor(rng() * 8);
  const filings: Section16Filing[] = [];

  for (let i = 0; i < count; i++) {
    const company = pickItem(COMPANIES, rng);
    const priceJitter = (rng() - 0.5) * company.basePrice * 0.08;
    const price = round2(company.basePrice + priceJitter);

    const txTypes: Array<'Buy' | 'Sell' | 'Exercise'> = ['Buy', 'Sell', 'Exercise'];
    const transactionType = pickItem(txTypes, rng);

    const shares = Math.round((1000 + rng() * 100000) / 100) * 100;
    const transactionDate = generateDateWithinDays(rng, 14);

    // Filing delay: SEC requires Form 4 within 2 business days
    const delayDays = Math.floor(rng() * 8);
    const filingDateObj = new Date(transactionDate);
    filingDateObj.setDate(filingDateObj.getDate() + delayDays);
    const filingDate = filingDateObj.toISOString().slice(0, 10);
    const lateFiling = delayDays > 2;

    filings.push({
      ticker: company.ticker,
      companyName: company.companyName,
      insiderName: pickItem(INSIDER_NAMES, rng),
      title: pickItem(INSIDER_TITLES, rng),
      transactionType,
      shares,
      price,
      filingDate,
      transactionDate,
      filingDelayDays: delayDays,
      lateFiling,
    });
  }

  return filings.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
}

function generateInsiderTransactionData(): InsiderTransactionResponse {
  const rng = seededRandom('insider-transaction');

  const recentTransactions = generateRecentTransactions(rng);
  const clusterBuying = generateClusterActivity(rng, 'buy');
  const clusterSelling = generateClusterActivity(rng, 'sell');
  const largestTransactions = generateLargestTransactions(rng);
  const sectorSummary = generateSectorSummary(rng);
  const insiderSentiment = generateInsiderSentiment(rng);
  const notableInsiders = generateNotableInsiders(rng);
  const section16 = generateSection16Filings(rng);

  return {
    recentTransactions,
    clusterBuying,
    clusterSelling,
    largestTransactions,
    sectorSummary,
    insiderSentiment,
    notableInsiders,
    section16,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateInsiderTransactionData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[InsiderTransaction] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate insider transaction data' });
  }
});

export default router;
