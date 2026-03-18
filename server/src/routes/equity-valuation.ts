import { Router } from 'express';

const router = Router();

// -- Seeded PRNG --

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// -- Cache --

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// -- Company definitions --

interface CompanyDef {
  ticker: string;
  name: string;
  sector: string;
  baseMcap: number;       // billions
  basePE: number;
  baseForwardPE: number;
  baseEvEbitda: number;
  basePB: number;
  basePS: number;
  basePEG: number;
  baseDivYield: number;   // percent
  sharesOut: number;       // billions
  baseWACC: number;        // percent
  baseTermGrowth: number;  // percent
}

const COMPANIES: CompanyDef[] = [
  { ticker: 'AAPL',  name: 'Apple Inc.',                sector: 'Technology',        baseMcap: 3250,  basePE: 32.5, baseForwardPE: 28.8, baseEvEbitda: 25.6, basePB: 48.2,  basePS: 8.9,  basePEG: 2.1,  baseDivYield: 0.52, sharesOut: 15.33, baseWACC: 9.2,  baseTermGrowth: 2.5 },
  { ticker: 'MSFT',  name: 'Microsoft Corp.',           sector: 'Technology',        baseMcap: 3100,  basePE: 35.2, baseForwardPE: 30.5, baseEvEbitda: 27.8, basePB: 12.8,  basePS: 13.4, basePEG: 2.3,  baseDivYield: 0.72, sharesOut: 7.43,  baseWACC: 9.0,  baseTermGrowth: 2.5 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.',             sector: 'Technology',        baseMcap: 2150,  basePE: 25.3, baseForwardPE: 21.2, baseEvEbitda: 17.5, basePB: 7.2,   basePS: 7.1,  basePEG: 1.3,  baseDivYield: 0.48, sharesOut: 12.26, baseWACC: 9.5,  baseTermGrowth: 2.5 },
  { ticker: 'AMZN',  name: 'Amazon.com Inc.',           sector: 'Consumer Cyclical', baseMcap: 1950,  basePE: 58.6, baseForwardPE: 38.2, baseEvEbitda: 22.4, basePB: 8.5,   basePS: 3.4,  basePEG: 1.8,  baseDivYield: 0.00, sharesOut: 10.33, baseWACC: 9.8,  baseTermGrowth: 3.0 },
  { ticker: 'NVDA',  name: 'NVIDIA Corp.',              sector: 'Technology',        baseMcap: 2850,  basePE: 62.4, baseForwardPE: 35.6, baseEvEbitda: 48.2, basePB: 52.6,  basePS: 35.2, basePEG: 1.1,  baseDivYield: 0.03, sharesOut: 24.49, baseWACC: 11.2, baseTermGrowth: 3.0 },
  { ticker: 'META',  name: 'Meta Platforms Inc.',       sector: 'Technology',        baseMcap: 1450,  basePE: 27.8, baseForwardPE: 22.5, baseEvEbitda: 16.2, basePB: 8.9,   basePS: 10.2, basePEG: 1.4,  baseDivYield: 0.36, sharesOut: 2.53,  baseWACC: 10.0, baseTermGrowth: 2.5 },
  { ticker: 'TSLA',  name: 'Tesla Inc.',                sector: 'Consumer Cyclical', baseMcap: 780,   basePE: 68.5, baseForwardPE: 52.3, baseEvEbitda: 42.8, basePB: 15.6,  basePS: 8.1,  basePEG: 3.2,  baseDivYield: 0.00, sharesOut: 3.21,  baseWACC: 12.5, baseTermGrowth: 3.5 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc.',   sector: 'Financials',        baseMcap: 920,   basePE: 9.4,  baseForwardPE: 8.8,  baseEvEbitda: 8.2,  basePB: 1.6,   basePS: 2.5,  basePEG: 1.5,  baseDivYield: 0.00, sharesOut: 1.44,  baseWACC: 8.5,  baseTermGrowth: 2.0 },
  { ticker: 'JPM',   name: 'JPMorgan Chase & Co.',      sector: 'Financials',        baseMcap: 620,   basePE: 12.3, baseForwardPE: 11.2, baseEvEbitda: 9.8,  basePB: 1.9,   basePS: 3.8,  basePEG: 1.6,  baseDivYield: 2.15, sharesOut: 2.87,  baseWACC: 8.8,  baseTermGrowth: 2.0 },
  { ticker: 'V',     name: 'Visa Inc.',                 sector: 'Financials',        baseMcap: 560,   basePE: 30.5, baseForwardPE: 26.8, baseEvEbitda: 24.5, basePB: 13.2,  basePS: 17.5, basePEG: 1.7,  baseDivYield: 0.76, sharesOut: 2.05,  baseWACC: 9.0,  baseTermGrowth: 2.5 },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',         sector: 'Healthcare',        baseMcap: 385,   basePE: 16.2, baseForwardPE: 14.8, baseEvEbitda: 13.5, basePB: 6.2,   basePS: 4.5,  basePEG: 2.8,  baseDivYield: 3.05, sharesOut: 2.41,  baseWACC: 7.5,  baseTermGrowth: 2.0 },
  { ticker: 'WMT',   name: 'Walmart Inc.',              sector: 'Consumer Defensive',baseMcap: 510,   basePE: 28.4, baseForwardPE: 25.1, baseEvEbitda: 14.8, basePB: 6.8,   basePS: 0.8,  basePEG: 3.5,  baseDivYield: 1.32, sharesOut: 8.04,  baseWACC: 7.8,  baseTermGrowth: 2.0 },
  { ticker: 'PG',    name: 'Procter & Gamble Co.',      sector: 'Consumer Defensive',baseMcap: 390,   basePE: 26.5, baseForwardPE: 24.2, baseEvEbitda: 19.8, basePB: 7.8,   basePS: 4.7,  basePEG: 3.1,  baseDivYield: 2.42, sharesOut: 2.36,  baseWACC: 7.2,  baseTermGrowth: 2.0 },
  { ticker: 'MA',    name: 'Mastercard Inc.',           sector: 'Financials',        baseMcap: 440,   basePE: 33.8, baseForwardPE: 28.5, baseEvEbitda: 26.2, basePB: 58.5,  basePS: 17.8, basePEG: 1.6,  baseDivYield: 0.58, sharesOut: 0.93,  baseWACC: 9.2,  baseTermGrowth: 2.5 },
  { ticker: 'UNH',   name: 'UnitedHealth Group Inc.',   sector: 'Healthcare',        baseMcap: 485,   basePE: 21.8, baseForwardPE: 18.5, baseEvEbitda: 14.6, basePB: 5.8,   basePS: 1.3,  basePEG: 1.5,  baseDivYield: 1.52, sharesOut: 0.93,  baseWACC: 8.0,  baseTermGrowth: 2.0 },
];

// -- Sector grouping for median comparisons --

const SECTOR_MAP: Record<string, string[]> = {
  'Technology':        ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'],
  'Consumer Cyclical': ['AMZN', 'TSLA'],
  'Financials':        ['BRK.B', 'JPM', 'V', 'MA'],
  'Healthcare':        ['JNJ', 'UNH'],
  'Consumer Defensive':['WMT', 'PG'],
};

// -- Helpers --

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-equity-valuation'));

  // 1. Valuation Comparables

  const comparables = COMPANIES.map((c) => {
    const marketCap = round(jitter(c.baseMcap, 0.06, rng), 1);
    const peTrailing = round(jitter(c.basePE, 0.10, rng), 1);
    const peForward = round(jitter(c.baseForwardPE, 0.10, rng), 1);
    const evEbitda = round(jitter(c.baseEvEbitda, 0.10, rng), 1);
    const pb = round(jitter(c.basePB, 0.12, rng), 1);
    const ps = round(jitter(c.basePS, 0.10, rng), 1);
    const pegRatio = round(jitter(c.basePEG, 0.15, rng), 2);
    const dividendYield = round(jitter(c.baseDivYield + 0.001, 0.12, rng), 2);

    return {
      ticker: c.ticker,
      companyName: c.name,
      sector: c.sector,
      marketCapBn: marketCap,
      peTrailing,
      peForward,
      evEbitda,
      priceToBook: pb,
      priceToSales: ps,
      pegRatio,
      dividendYield: c.baseDivYield === 0 ? 0 : Math.max(0, dividendYield),
    };
  });

  // 2. Sector Median Comparisons

  const sectorMedians = Object.entries(SECTOR_MAP).map(([sector, tickers]) => {
    const members = comparables.filter((c) => tickers.includes(c.ticker));
    if (members.length === 0) return null;

    const sectorPE = round(median(members.map((m) => m.peTrailing)), 1);
    const sectorEvEbitda = round(median(members.map((m) => m.evEbitda)), 1);
    const sectorPB = round(median(members.map((m) => m.priceToBook)), 1);

    const memberDetails = members.map((m) => {
      const premiumPE = round(((m.peTrailing / sectorPE) - 1) * 100, 1);
      const premiumEvEbitda = round(((m.evEbitda / sectorEvEbitda) - 1) * 100, 1);
      const premiumPB = round(((m.priceToBook / sectorPB) - 1) * 100, 1);

      return {
        ticker: m.ticker,
        premiumDiscountPE: premiumPE,
        premiumDiscountEvEbitda: premiumEvEbitda,
        premiumDiscountPB: premiumPB,
      };
    });

    return {
      sector,
      medianPE: sectorPE,
      medianEvEbitda: sectorEvEbitda,
      medianPB: sectorPB,
      members: memberDetails,
    };
  }).filter(Boolean);

  // 3. DCF Summary for each company

  const dcfSummary = COMPANIES.map((c) => {
    const wacc = round(jitter(c.baseWACC, 0.08, rng), 2);
    const terminalGrowthRate = round(jitter(c.baseTermGrowth, 0.10, rng), 2);

    // Enterprise value derived from market cap with some premium/discount
    const evMultiplier = 0.95 + rng() * 0.20; // 0.95x to 1.15x market cap
    const currentMcap = comparables.find((comp) => comp.ticker === c.ticker)?.marketCapBn ?? c.baseMcap;
    const enterpriseValue = round(currentMcap * evMultiplier, 1);

    // Net debt adjustment (tech companies often net cash positive)
    const netDebtRatio = c.sector === 'Technology' ? -0.02 - rng() * 0.08 : 0.05 + rng() * 0.15;
    const netDebt = round(currentMcap * netDebtRatio, 1);
    const equityValue = round(enterpriseValue - netDebt, 1);

    const impliedSharePrice = round((equityValue * 1e9) / (c.sharesOut * 1e9), 2);
    const currentSharePrice = round((currentMcap * 1e9) / (c.sharesOut * 1e9), 2);
    const upsideDownside = round(((impliedSharePrice / currentSharePrice) - 1) * 100, 1);

    return {
      ticker: c.ticker,
      companyName: c.name,
      wacc,
      terminalGrowthRate,
      enterpriseValueBn: enterpriseValue,
      netDebtBn: netDebt,
      equityValueBn: equityValue,
      sharesOutstandingBn: c.sharesOut,
      impliedSharePrice,
      currentSharePrice,
      upsideDownsidePct: upsideDownside,
    };
  });

  // 4. Market-wide summary statistics

  const allPE = comparables.map((c) => c.peTrailing);
  const allEvEbitda = comparables.map((c) => c.evEbitda);
  const allPB = comparables.map((c) => c.priceToBook);
  const allDivYield = comparables.filter((c) => c.dividendYield > 0).map((c) => c.dividendYield);

  const marketSummary = {
    totalCompanies: comparables.length,
    aggregateMarketCapBn: round(comparables.reduce((sum, c) => sum + c.marketCapBn, 0), 1),
    medianPE: round(median(allPE), 1),
    medianEvEbitda: round(median(allEvEbitda), 1),
    medianPB: round(median(allPB), 1),
    medianDividendYield: round(median(allDivYield), 2),
    mostUndervalued: dcfSummary.reduce((best, d) => d.upsideDownsidePct > best.upsideDownsidePct ? d : best).ticker,
    mostOvervalued: dcfSummary.reduce((worst, d) => d.upsideDownsidePct < worst.upsideDownsidePct ? d : worst).ticker,
  };

  return {
    comparables,
    sectorMedians,
    dcfSummary,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityValuation] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity valuation data' });
  }
});

export default router;
