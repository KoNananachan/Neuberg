import { Router } from 'express';

const router = Router();

// -- Deterministic seeded PRNG --

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// -- Helpers --

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// -- Types --

interface IndexDividend {
  index: string;
  currentYear: number;
  nextYear: number;
  change1D: number;
  change1M: number;
  impliedGrowth: number;
  divYield: number;
}

interface TermStructureEntry {
  year: string;
  spxDiv: number;
  sx5eDiv: number;
  impliedGrowth: number;
  discountRate: number;
}

interface SingleStockDividend {
  ticker: string;
  annualDiv: number;
  divYield: number;
  payoutRatio: number;
  growthRate5Y: number;
  exDivDate: string;
  nextPayment: string;
  sustainability: 'strong' | 'moderate' | 'at risk';
}

interface SectorYield {
  sector: string;
  avgYield: number;
  avgPayout: number;
  avgGrowth: number;
  changeYoY: number;
}

interface SpecialDividend {
  company: string;
  amount: number;
  exDate: string;
  type: 'special' | 'variable' | 'extra';
  estimatedImpact: number;
}

interface MarketMetrics {
  sp500DivYield: number;
  sp500PayoutRatio: number;
  impliedCutProbability: number;
  dividendFuturesBasis: number;
  totalDivPaid12M: number;
}

interface DividendSwapResponse {
  indexDividends: IndexDividend[];
  termStructure: TermStructureEntry[];
  singleStockDividends: SingleStockDividend[];
  sectorYields: SectorYield[];
  specialDividends: SpecialDividend[];
  marketMetrics: MarketMetrics;
  generatedAt: string;
}

// -- Static configs --

const INDEX_CONFIGS = [
  { index: 'S&P 500',      baseCurrentYear: 70,  minCY: 65,  maxCY: 75,  baseYield: 1.55 },
  { index: 'Euro Stoxx 50', baseCurrentYear: 145, minCY: 130, maxCY: 160, baseYield: 3.20 },
  { index: 'FTSE 100',     baseCurrentYear: 220, minCY: 200, maxCY: 240, baseYield: 3.80 },
  { index: 'Nikkei 225',   baseCurrentYear: 550, minCY: 500, maxCY: 600, baseYield: 1.90 },
  { index: 'DAX',          baseCurrentYear: 550, minCY: 500, maxCY: 600, baseYield: 2.70 },
  { index: 'SMI',          baseCurrentYear: 385, minCY: 350, maxCY: 420, baseYield: 3.10 },
] as const;

const STOCK_CONFIGS = [
  { ticker: 'AAPL', baseDiv: 1.00, baseYield: 0.55, basePayout: 15, baseGrowth: 5.5 },
  { ticker: 'MSFT', baseDiv: 3.32, baseYield: 0.72, basePayout: 25, baseGrowth: 10.2 },
  { ticker: 'JPM',  baseDiv: 5.00, baseYield: 2.30, basePayout: 27, baseGrowth: 8.0 },
  { ticker: 'JNJ',  baseDiv: 4.96, baseYield: 3.10, basePayout: 45, baseGrowth: 5.8 },
  { ticker: 'XOM',  baseDiv: 3.80, baseYield: 3.40, basePayout: 42, baseGrowth: 3.2 },
  { ticker: 'PG',   baseDiv: 4.03, baseYield: 2.50, basePayout: 62, baseGrowth: 6.0 },
  { ticker: 'KO',   baseDiv: 1.94, baseYield: 3.00, basePayout: 70, baseGrowth: 3.5 },
  { ticker: 'T',    baseDiv: 1.11, baseYield: 6.10, basePayout: 55, baseGrowth: -5.0 },
  { ticker: 'VZ',   baseDiv: 2.71, baseYield: 6.50, basePayout: 53, baseGrowth: 2.0 },
  { ticker: 'PFE',  baseDiv: 1.68, baseYield: 5.80, basePayout: 80, baseGrowth: -1.5 },
] as const;

const SECTOR_CONFIGS = [
  { sector: 'Technology',      baseYield: 0.80, basePayout: 22, baseGrowth: 10.5 },
  { sector: 'Healthcare',      baseYield: 1.60, basePayout: 35, baseGrowth: 6.0 },
  { sector: 'Financials',      baseYield: 2.20, basePayout: 30, baseGrowth: 7.5 },
  { sector: 'Energy',          baseYield: 3.80, basePayout: 45, baseGrowth: 2.5 },
  { sector: 'Utilities',       baseYield: 3.50, basePayout: 65, baseGrowth: 3.0 },
  { sector: 'Consumer Staples', baseYield: 2.70, basePayout: 60, baseGrowth: 4.5 },
  { sector: 'Real Estate',     baseYield: 4.10, basePayout: 72, baseGrowth: 2.0 },
  { sector: 'Industrials',     baseYield: 1.50, basePayout: 32, baseGrowth: 8.0 },
] as const;

const SPECIAL_DIV_COMPANIES = [
  'Costco Wholesale',
  'Ford Motor',
  'Microsoft',
  'Meta Platforms',
  'Alphabet',
  'Oracle',
] as const;

const TERM_YEARS = ['2026', '2027', '2028', '2029', '2030'] as const;

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: DividendSwapResponse | null = null;
let cacheTime = 0;

// -- Data generation --

function generate(): DividendSwapResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('dividend-swap-' + today));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // -- 1. Index dividends --
  const indexDividends: IndexDividend[] = INDEX_CONFIGS.map(cfg => {
    const currentYear = round2(clamp(jitter(cfg.baseCurrentYear, 0.08), cfg.minCY, cfg.maxCY));
    const nextYear = round2(clamp(currentYear * (1 + (rng() * 0.06 - 0.01)), cfg.minCY * 0.95, cfg.maxCY * 1.10));
    const change1D = round2((rng() - 0.5) * 2 * cfg.baseCurrentYear * 0.01);
    const change1M = round2((rng() - 0.5) * 2 * cfg.baseCurrentYear * 0.03);
    const impliedGrowth = round2(((nextYear / currentYear) - 1) * 100);
    const divYield = round2(clamp(jitter(cfg.baseYield, 0.10), cfg.baseYield * 0.8, cfg.baseYield * 1.2));
    return { index: cfg.index, currentYear, nextYear, change1D, change1M, impliedGrowth, divYield };
  });

  // -- 2. Term structure --
  const baseSpx = indexDividends[0]?.currentYear ?? 70;
  const baseSx5e = indexDividends[1]?.currentYear ?? 145;

  const termStructure: TermStructureEntry[] = TERM_YEARS.map((year, i) => {
    const growthFactor = 1 + i * 0.02 + (rng() - 0.5) * 0.02;
    const spxDiv = round2(clamp(baseSpx * growthFactor * (1 + (rng() - 0.5) * 0.04), 60, 90));
    const sx5eDiv = round2(clamp(baseSx5e * growthFactor * (1 + (rng() - 0.5) * 0.04), 120, 185));
    const impliedGrowth = round2((growthFactor - 1) * 100);
    const discountRate = round2(clamp(3.5 + i * 0.15 + (rng() - 0.5) * 0.6, 2.5, 5.5));
    return { year, spxDiv, sx5eDiv, impliedGrowth, discountRate };
  });

  // -- 3. Single stock dividends --
  const exDivMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const singleStockDividends: SingleStockDividend[] = STOCK_CONFIGS.map((cfg, idx) => {
    const annualDiv = round2(clamp(jitter(cfg.baseDiv, 0.06), cfg.baseDiv * 0.9, cfg.baseDiv * 1.15));
    const divYield = round2(clamp(jitter(cfg.baseYield, 0.10), cfg.baseYield * 0.8, cfg.baseYield * 1.25));
    const payoutRatio = round2(clamp(jitter(cfg.basePayout, 0.10), cfg.basePayout * 0.8, cfg.basePayout * 1.2));
    const growthRate5Y = round2(clamp(jitter(cfg.baseGrowth, 0.15), cfg.baseGrowth - 3, cfg.baseGrowth + 3));

    const exMonth = exDivMonths[idx % 12];
    const exDay = 10 + Math.floor(rng() * 15);
    const exDivDate = `2026-${String(exMonth).padStart(2, '0')}-${String(exDay).padStart(2, '0')}`;

    const payMonth = exMonth === 12 ? 1 : exMonth + 1;
    const payYear = exMonth === 12 ? 2027 : 2026;
    const payDay = 5 + Math.floor(rng() * 20);
    const nextPayment = `${payYear}-${String(payMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;

    let sustainability: SingleStockDividend['sustainability'] = 'moderate';
    if (payoutRatio < 40 && growthRate5Y > 3) sustainability = 'strong';
    else if (payoutRatio > 70 || growthRate5Y < 0) sustainability = 'at risk';

    return { ticker: cfg.ticker, annualDiv, divYield, payoutRatio, growthRate5Y, exDivDate, nextPayment, sustainability };
  });

  // -- 4. Sector yields --
  const sectorYields: SectorYield[] = SECTOR_CONFIGS.map(cfg => {
    const avgYield = round2(clamp(jitter(cfg.baseYield, 0.12), cfg.baseYield * 0.7, cfg.baseYield * 1.3));
    const avgPayout = round2(clamp(jitter(cfg.basePayout, 0.10), cfg.basePayout * 0.8, cfg.basePayout * 1.2));
    const avgGrowth = round2(clamp(jitter(cfg.baseGrowth, 0.15), cfg.baseGrowth * 0.6, cfg.baseGrowth * 1.4));
    const changeYoY = round2((rng() - 0.45) * 2 * 1.5);
    return { sector: cfg.sector, avgYield, avgPayout, avgGrowth, changeYoY };
  });

  // -- 5. Special dividends --
  const usedCompanies = new Set<string>();
  const specialDividends: SpecialDividend[] = [];
  const types: SpecialDividend['type'][] = ['special', 'variable', 'extra'];

  while (specialDividends.length < 3) {
    const companyIdx = Math.floor(rng() * SPECIAL_DIV_COMPANIES.length);
    const company = SPECIAL_DIV_COMPANIES[companyIdx];
    if (usedCompanies.has(company)) continue;
    usedCompanies.add(company);

    const amount = round2(clamp(2 + rng() * 18, 2, 20));
    const month = 1 + Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    const exDate = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const type = types[specialDividends.length];
    const estimatedImpact = round2(clamp(rng() * 5, 0.5, 5));

    specialDividends.push({ company, amount, exDate, type, estimatedImpact });
  }

  // -- 6. Market metrics --
  const marketMetrics: MarketMetrics = {
    sp500DivYield: round2(clamp(jitter(1.55, 0.15), 1.3, 2.0)),
    sp500PayoutRatio: round2(clamp(jitter(37, 0.12), 30, 45)),
    impliedCutProbability: round2(clamp(rng() * 15, 0, 15)),
    dividendFuturesBasis: round2((rng() - 0.5) * 6),
    totalDivPaid12M: round2(clamp(jitter(600, 0.08), 550, 650)),
  };

  return {
    indexDividends,
    termStructure,
    singleStockDividends,
    sectorYields,
    specialDividends,
    marketMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[DividendSwap] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate dividend swap data' });
  }
});

export default router;
