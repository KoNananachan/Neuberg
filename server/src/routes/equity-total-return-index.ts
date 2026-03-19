import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}
function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Helpers ──

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function jitter(rng: () => number, base: number, spread: number): number {
  return base + (rng() - 0.5) * 2 * spread;
}

// ── Types ──

interface IndexEntry {
  name: string;
  ticker: string;
  priceIndex: number;
  totalReturnIndex: number;
  dividendYield: number;
  ytdPriceReturn: number;
  ytdTotalReturn: number;
  excessReturn: number;
  oneYearTR: number;
  threeYearAnnTR: number;
  fiveYearAnnTR: number;
}

interface ComparisonEntry {
  name: string;
  oneYear: { price: number; totalReturn: number; dividendContrib: number };
  threeYear: { price: number; totalReturn: number; dividendContrib: number };
  fiveYear: { price: number; totalReturn: number; dividendContrib: number };
  tenYear: { price: number; totalReturn: number; dividendContrib: number };
}

interface MonthlyDividendContrib {
  month: string;
  priceReturn: number;
  dividendContrib: number;
  totalReturn: number;
}

interface SectorTREntry {
  sector: string;
  priceReturn: number;
  dividendYield: number;
  totalReturn: number;
}

interface TopDividendPayer {
  ticker: string;
  name: string;
  weight: number;
  dividendYield: number;
  contributionBps: number;
}

interface EquityTotalReturnIndexResponse {
  timestamp: string;
  indices: IndexEntry[];
  comparison: ComparisonEntry[];
  dividendContribution: MonthlyDividendContrib[];
  sectorTR: SectorTREntry[];
  topDividendPayers: TopDividendPayer[];
}

// ── Seed Data ──

interface IndexSeed {
  name: string;
  ticker: string;
  priceBase: number;
  trBase: number;
  divYield: number;
  ytdPriceBase: number;
  oneYearTRBase: number;
  threeYearAnnTRBase: number;
  fiveYearAnnTRBase: number;
}

const INDEX_SEEDS: IndexSeed[] = [
  { name: 'S&P 500',      ticker: 'SPX',   priceBase: 5500,  trBase: 12000, divYield: 1.30, ytdPriceBase: 8.5,  oneYearTRBase: 14.5, threeYearAnnTRBase: 11.2, fiveYearAnnTRBase: 12.8 },
  { name: 'NASDAQ 100',   ticker: 'NDX',   priceBase: 19800, trBase: 28500, divYield: 0.70, ytdPriceBase: 10.2, oneYearTRBase: 18.5, threeYearAnnTRBase: 13.5, fiveYearAnnTRBase: 15.2 },
  { name: 'Russell 2000',  ticker: 'RTY',   priceBase: 2080,  trBase: 4200,  divYield: 1.45, ytdPriceBase: 4.8,  oneYearTRBase: 8.2,  threeYearAnnTRBase: 5.8,  fiveYearAnnTRBase: 7.5 },
  { name: 'MSCI World',    ticker: 'MXWO',  priceBase: 3450,  trBase: 8900,  divYield: 2.00, ytdPriceBase: 6.8,  oneYearTRBase: 11.2, threeYearAnnTRBase: 8.5,  fiveYearAnnTRBase: 9.8 },
  { name: 'MSCI EM',       ticker: 'MXEF',  priceBase: 1080,  trBase: 2600,  divYield: 2.60, ytdPriceBase: 3.5,  oneYearTRBase: 7.8,  threeYearAnnTRBase: 3.2,  fiveYearAnnTRBase: 5.5 },
  { name: 'Euro Stoxx 50', ticker: 'SX5E',  priceBase: 5050,  trBase: 11800, divYield: 2.80, ytdPriceBase: 7.2,  oneYearTRBase: 12.5, threeYearAnnTRBase: 9.8,  fiveYearAnnTRBase: 8.5 },
  { name: 'FTSE 100',      ticker: 'UKX',   priceBase: 8200,  trBase: 18500, divYield: 3.50, ytdPriceBase: 5.5,  oneYearTRBase: 10.8, threeYearAnnTRBase: 8.2,  fiveYearAnnTRBase: 7.2 },
  { name: 'Nikkei 225',    ticker: 'NKY',   priceBase: 38500, trBase: 52000, divYield: 1.80, ytdPriceBase: 6.0,  oneYearTRBase: 12.0, threeYearAnnTRBase: 10.5, fiveYearAnnTRBase: 9.2 },
  { name: 'DAX',           ticker: 'DAX',   priceBase: 18200, trBase: 42000, divYield: 2.90, ytdPriceBase: 8.8,  oneYearTRBase: 14.0, threeYearAnnTRBase: 10.2, fiveYearAnnTRBase: 9.0 },
  { name: 'S&P/TSX',       ticker: 'SPTSX', priceBase: 22500, trBase: 45000, divYield: 2.80, ytdPriceBase: 5.0,  oneYearTRBase: 9.5,  threeYearAnnTRBase: 7.8,  fiveYearAnnTRBase: 8.2 },
  { name: 'ASX 200',       ticker: 'AS51',  priceBase: 8100,  trBase: 19000, divYield: 3.80, ytdPriceBase: 4.2,  oneYearTRBase: 9.8,  threeYearAnnTRBase: 7.5,  fiveYearAnnTRBase: 7.8 },
  { name: 'Hang Seng',     ticker: 'HSI',   priceBase: 17800, trBase: 38000, divYield: 3.20, ytdPriceBase: 2.8,  oneYearTRBase: 5.5,  threeYearAnnTRBase: -1.2, fiveYearAnnTRBase: 1.8 },
];

const SECTOR_SEEDS = [
  { sector: 'Information Technology', priceRetBase: 14.5, divYieldBase: 0.75 },
  { sector: 'Health Care',           priceRetBase: 6.2,  divYieldBase: 1.50 },
  { sector: 'Financials',            priceRetBase: 10.8, divYieldBase: 1.80 },
  { sector: 'Consumer Discretionary', priceRetBase: 9.5,  divYieldBase: 0.90 },
  { sector: 'Communication Services', priceRetBase: 11.2, divYieldBase: 0.85 },
  { sector: 'Industrials',           priceRetBase: 8.0,  divYieldBase: 1.55 },
  { sector: 'Consumer Staples',      priceRetBase: 3.5,  divYieldBase: 2.65 },
  { sector: 'Energy',                priceRetBase: 5.8,  divYieldBase: 3.40 },
  { sector: 'Utilities',             priceRetBase: 4.2,  divYieldBase: 3.20 },
  { sector: 'Real Estate',           priceRetBase: 3.0,  divYieldBase: 3.80 },
  { sector: 'Materials',             priceRetBase: 6.5,  divYieldBase: 1.70 },
];

const TOP_DIVIDEND_PAYER_SEEDS = [
  { ticker: 'XOM',  name: 'Exxon Mobil',         weightBase: 3.60, divYieldBase: 3.40 },
  { ticker: 'JNJ',  name: 'Johnson & Johnson',   weightBase: 1.60, divYieldBase: 3.00 },
  { ticker: 'JPM',  name: 'JPMorgan Chase',      weightBase: 2.50, divYieldBase: 2.20 },
  { ticker: 'PG',   name: 'Procter & Gamble',    weightBase: 1.50, divYieldBase: 2.40 },
  { ticker: 'ABBV', name: 'AbbVie',              weightBase: 1.30, divYieldBase: 3.60 },
  { ticker: 'CVX',  name: 'Chevron',             weightBase: 1.40, divYieldBase: 4.10 },
  { ticker: 'MRK',  name: 'Merck & Co.',         weightBase: 1.20, divYieldBase: 2.50 },
  { ticker: 'KO',   name: 'Coca-Cola',           weightBase: 1.10, divYieldBase: 2.90 },
  { ticker: 'PEP',  name: 'PepsiCo',             weightBase: 1.00, divYieldBase: 2.70 },
  { ticker: 'PM',   name: 'Philip Morris Intl',  weightBase: 0.55, divYieldBase: 5.20 },
  { ticker: 'T',    name: 'AT&T',                weightBase: 0.50, divYieldBase: 6.50 },
  { ticker: 'VZ',   name: 'Verizon',             weightBase: 0.65, divYieldBase: 6.30 },
  { ticker: 'MO',   name: 'Altria Group',        weightBase: 0.35, divYieldBase: 8.80 },
  { ticker: 'IBM',  name: 'IBM',                 weightBase: 0.75, divYieldBase: 3.50 },
  { ticker: 'BMY',  name: 'Bristol-Myers Squibb', weightBase: 0.50, divYieldBase: 4.40 },
];

// ── Cache ──

let cache: { data: EquityTotalReturnIndexResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Data Generation ──

function generate(): EquityTotalReturnIndexResponse {
  const rng = seededRandom('equity-total-return-index');

  // ── 1. Index data ──

  const indices: IndexEntry[] = INDEX_SEEDS.map(seed => {
    const priceIndex = round(jitter(rng, seed.priceBase, seed.priceBase * 0.02), 2);
    const totalReturnIndex = round(jitter(rng, seed.trBase, seed.trBase * 0.02), 2);
    const dividendYield = round(jitter(rng, seed.divYield, seed.divYield * 0.08), 2);

    const ytdPriceReturn = round(jitter(rng, seed.ytdPriceBase, 1.5), 2);
    // Total return = price return + dividend yield contribution (prorated YTD)
    const ytdDivContrib = round(dividendYield * (new Date().getMonth() + 1) / 12, 2);
    const ytdTotalReturn = round(ytdPriceReturn + ytdDivContrib, 2);
    const excessReturn = round(ytdTotalReturn - ytdPriceReturn, 2);

    const oneYearTR = round(jitter(rng, seed.oneYearTRBase, 2.0), 2);
    const threeYearAnnTR = round(jitter(rng, seed.threeYearAnnTRBase, 1.5), 2);
    const fiveYearAnnTR = round(jitter(rng, seed.fiveYearAnnTRBase, 1.2), 2);

    return {
      name: seed.name,
      ticker: seed.ticker,
      priceIndex,
      totalReturnIndex,
      dividendYield,
      ytdPriceReturn,
      ytdTotalReturn,
      excessReturn,
      oneYearTR,
      threeYearAnnTR,
      fiveYearAnnTR,
    };
  });

  // ── 2. Comparison: dividends' contribution over horizons ──

  const comparisonIndices = ['S&P 500', 'NASDAQ 100', 'Russell 2000', 'MSCI World', 'MSCI EM', 'FTSE 100'];

  const comparison: ComparisonEntry[] = comparisonIndices.map(name => {
    const idx = indices.find(i => i.name === name)!;
    const dy = idx.dividendYield;

    // Approximate cumulative dividend contribution over horizons
    const oneYearPrice = round(jitter(rng, idx.oneYearTR - dy, 0.5), 2);
    const oneYearTR = round(oneYearPrice + dy + rng() * 0.3, 2);
    const oneYearDiv = round(oneYearTR - oneYearPrice, 2);

    const threeYearPrice = round(jitter(rng, idx.threeYearAnnTR * 3 - dy * 3.2, 2.0), 2);
    const threeYearTR = round(threeYearPrice + dy * 3.2 + rng() * 1.5, 2);
    const threeYearDiv = round(threeYearTR - threeYearPrice, 2);

    const fiveYearPrice = round(jitter(rng, idx.fiveYearAnnTR * 5 - dy * 5.8, 4.0), 2);
    const fiveYearTR = round(fiveYearPrice + dy * 5.8 + rng() * 3.0, 2);
    const fiveYearDiv = round(fiveYearTR - fiveYearPrice, 2);

    const tenYearPrice = round(jitter(rng, idx.fiveYearAnnTR * 10 - dy * 13.0, 8.0), 2);
    const tenYearTR = round(tenYearPrice + dy * 13.0 + rng() * 6.0, 2);
    const tenYearDiv = round(tenYearTR - tenYearPrice, 2);

    return {
      name,
      oneYear: { price: oneYearPrice, totalReturn: oneYearTR, dividendContrib: oneYearDiv },
      threeYear: { price: threeYearPrice, totalReturn: threeYearTR, dividendContrib: threeYearDiv },
      fiveYear: { price: fiveYearPrice, totalReturn: fiveYearTR, dividendContrib: fiveYearDiv },
      tenYear: { price: tenYearPrice, totalReturn: tenYearTR, dividendContrib: tenYearDiv },
    };
  });

  // ── 3. Monthly dividend contribution (S&P 500, last 12 months) ──

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const currentMonth = new Date().getMonth();

  const dividendContribution: MonthlyDividendContrib[] = [];
  for (let i = 0; i < 12; i++) {
    const mIdx = (currentMonth - 11 + i + 12) % 12;
    const priceReturn = round(jitter(rng, 1.0, 2.5), 2);
    // Monthly dividend contribution is roughly annual yield / 12 with seasonal variation
    // Q1/Q2 quarters tend to have higher dividend payouts
    const seasonalFactor = (mIdx >= 2 && mIdx <= 5) ? 1.15 : (mIdx >= 8 && mIdx <= 10) ? 0.90 : 1.0;
    const divContrib = round((1.30 / 12) * seasonalFactor + (rng() - 0.5) * 0.02, 3);
    const totalReturn = round(priceReturn + divContrib, 2);

    dividendContribution.push({
      month: months[mIdx],
      priceReturn,
      dividendContrib: divContrib,
      totalReturn,
    });
  }

  // ── 4. Sector total return (S&P 500 GICS sectors) ──

  const sectorTR: SectorTREntry[] = SECTOR_SEEDS.map(seed => {
    const priceReturn = round(jitter(rng, seed.priceRetBase, 2.0), 2);
    const dividendYield = round(jitter(rng, seed.divYieldBase, 0.2), 2);
    const totalReturn = round(priceReturn + dividendYield, 2);

    return {
      sector: seed.sector,
      priceReturn,
      dividendYield,
      totalReturn,
    };
  });

  // Sort by total return descending
  sectorTR.sort((a, b) => b.totalReturn - a.totalReturn);

  // ── 5. Top dividend payers (contribution to S&P 500 index return) ──

  const topDividendPayers: TopDividendPayer[] = TOP_DIVIDEND_PAYER_SEEDS.map(seed => {
    const weight = round(jitter(rng, seed.weightBase, seed.weightBase * 0.05), 2);
    const dividendYield = round(jitter(rng, seed.divYieldBase, 0.3), 2);
    // Contribution in basis points = weight * dividend yield * 100
    const contributionBps = round(weight * dividendYield, 2);

    return {
      ticker: seed.ticker,
      name: seed.name,
      weight,
      dividendYield,
      contributionBps,
    };
  });

  // Sort by contribution descending
  topDividendPayers.sort((a, b) => b.contributionBps - a.contributionBps);

  return {
    timestamp: new Date().toISOString(),
    indices,
    comparison,
    dividendContribution,
    sectorTR,
    topDividendPayers,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();

    cache = { data, expiresAt: now + CACHE_TTL };
    return res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[EquityTotalReturnIndex] Error:', message);

    // Stale fallback
    if (cache.data) {
      return res.json(cache.data);
    }

    return res.status(500).json({ error: 'Failed to generate equity total return index data' });
  }
});

export default router;
