import { Router } from 'express';

const router = Router();

// -- Deterministic seeded RNG --

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// -- Types --

interface TopFamilyOffice {
  name: string;
  estimatedAUM: number;
  topHolding: string;
  topHoldingWeight: number;
  portfolioConcentration: 'concentrated' | 'diversified';
  recentChange: 'adding' | 'reducing' | 'unchanged';
  return1Y: number;
}

interface AggregateAllocation {
  publicEquity: number;
  fixedIncome: number;
  privateEquity: number;
  realEstate: number;
  hedgeFunds: number;
  directInvestments: number;
  crypto: number;
  cash: number;
}

interface TopPosition {
  ticker: string;
  companyName: string;
  aggregateOwnership: number;
  marketValue: number;
  changeQoQ: number;
  numberOfFilers: number;
}

interface SectorExposure {
  sector: string;
  weight: number;
  changeQoQ: number;
}

interface InvestmentTheme {
  theme: string;
  conviction: 'high' | 'moderate';
  examplePositions: string;
  capitalDeployed: number;
}

interface FilingActivity {
  date: string;
  filer: string;
  action: string;
  ticker: string;
  sharesChanged: string;
}

interface FamilyOfficeResponse {
  topFamilyOffices: TopFamilyOffice[];
  aggregateAllocation: AggregateAllocation;
  topPositions: TopPosition[];
  sectorExposure: SectorExposure[];
  investmentThemes: InvestmentTheme[];
  filingActivity: FilingActivity[];
  generatedAt: string;
}

// -- Family office configurations --

interface OfficeConfig {
  name: string;
  baseAUM: number;
  aumRange: number;
  topHoldings: string[];
  weightRange: [number, number];
  concentration: 'concentrated' | 'diversified';
  returnRange: [number, number];
}

const OFFICE_CONFIGS: OfficeConfig[] = [
  { name: 'Cascade Investment (Gates)', baseAUM: 75, aumRange: 10, topHoldings: ['MSFT', 'CNI', 'DE', 'WM'], weightRange: [12, 28], concentration: 'concentrated', returnRange: [6, 18] },
  { name: 'Soros Fund Management', baseAUM: 28, aumRange: 5, topHoldings: ['SPY', 'RIVN', 'GOOGL', 'AMZN'], weightRange: [5, 15], concentration: 'diversified', returnRange: [8, 22] },
  { name: 'Duquesne Family Office', baseAUM: 22, aumRange: 4, topHoldings: ['MSFT', 'NVDA', 'AMZN', 'GOOGL'], weightRange: [8, 20], concentration: 'concentrated', returnRange: [10, 25] },
  { name: 'Appaloosa Management', baseAUM: 18, aumRange: 3, topHoldings: ['META', 'AMZN', 'GOOGL', 'MSFT'], weightRange: [7, 18], concentration: 'concentrated', returnRange: [8, 20] },
  { name: 'Icahn Enterprises', baseAUM: 16, aumRange: 3, topHoldings: ['IEP', 'CVR', 'XOM', 'OXY'], weightRange: [10, 30], concentration: 'concentrated', returnRange: [-5, 15] },
  { name: 'Citadel (Griffin)', baseAUM: 65, aumRange: 8, topHoldings: ['AAPL', 'NVDA', 'MSFT', 'SPY'], weightRange: [3, 10], concentration: 'diversified', returnRange: [12, 28] },
  { name: 'Pershing Square (Ackman)', baseAUM: 18, aumRange: 3, topHoldings: ['CMG', 'HLT', 'QSR', 'LOW'], weightRange: [12, 25], concentration: 'concentrated', returnRange: [5, 22] },
  { name: 'Berkshire Hathaway', baseAUM: 350, aumRange: 30, topHoldings: ['AAPL', 'BAC', 'AXP', 'KO'], weightRange: [8, 45], concentration: 'concentrated', returnRange: [8, 18] },
  { name: 'Baupost Group', baseAUM: 30, aumRange: 5, topHoldings: ['LBTYA', 'QRVO', 'EBAY', 'FOXA'], weightRange: [5, 14], concentration: 'diversified', returnRange: [4, 16] },
  { name: 'Third Point', baseAUM: 15, aumRange: 3, topHoldings: ['AMZN', 'PDD', 'INTC', 'MSFT'], weightRange: [6, 16], concentration: 'diversified', returnRange: [6, 20] },
];

// -- Top positions configuration --

interface PositionConfig {
  ticker: string;
  companyName: string;
  baseOwnership: number;
  ownershipRange: number;
  baseMarketValue: number;
  mvRange: number;
  filerRange: [number, number];
}

const POSITION_CONFIGS: PositionConfig[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc', baseOwnership: 850, ownershipRange: 120, baseMarketValue: 185, mvRange: 25, filerRange: [6, 9] },
  { ticker: 'MSFT', companyName: 'Microsoft Corp', baseOwnership: 720, ownershipRange: 100, baseMarketValue: 165, mvRange: 20, filerRange: [6, 9] },
  { ticker: 'GOOG', companyName: 'Alphabet Inc', baseOwnership: 580, ownershipRange: 90, baseMarketValue: 95, mvRange: 15, filerRange: [5, 8] },
  { ticker: 'AMZN', companyName: 'Amazon.com Inc', baseOwnership: 620, ownershipRange: 85, baseMarketValue: 115, mvRange: 18, filerRange: [5, 9] },
  { ticker: 'META', companyName: 'Meta Platforms Inc', baseOwnership: 450, ownershipRange: 70, baseMarketValue: 88, mvRange: 14, filerRange: [4, 8] },
  { ticker: 'BRK.B', companyName: 'Berkshire Hathaway Inc', baseOwnership: 320, ownershipRange: 50, baseMarketValue: 72, mvRange: 12, filerRange: [3, 6] },
  { ticker: 'NVDA', companyName: 'NVIDIA Corp', baseOwnership: 680, ownershipRange: 110, baseMarketValue: 155, mvRange: 22, filerRange: [5, 9] },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co', baseOwnership: 380, ownershipRange: 60, baseMarketValue: 68, mvRange: 10, filerRange: [4, 7] },
  { ticker: 'V', companyName: 'Visa Inc', baseOwnership: 290, ownershipRange: 45, baseMarketValue: 52, mvRange: 8, filerRange: [3, 7] },
  { ticker: 'UNH', companyName: 'UnitedHealth Group Inc', baseOwnership: 260, ownershipRange: 40, baseMarketValue: 58, mvRange: 9, filerRange: [3, 6] },
];

// -- Sector configuration --

interface SectorConfig {
  sector: string;
  baseWeight: number;
  weightRange: number;
  changeRange: [number, number];
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Technology', baseWeight: 32, weightRange: 4, changeRange: [-2.5, 3.5] },
  { sector: 'Healthcare', baseWeight: 14, weightRange: 2, changeRange: [-1.5, 2.0] },
  { sector: 'Financials', baseWeight: 13, weightRange: 2, changeRange: [-2.0, 2.5] },
  { sector: 'Consumer Discretionary', baseWeight: 11, weightRange: 2, changeRange: [-1.5, 1.8] },
  { sector: 'Communication Services', baseWeight: 9, weightRange: 1.5, changeRange: [-1.2, 1.5] },
  { sector: 'Industrials', baseWeight: 8, weightRange: 1.5, changeRange: [-1.0, 1.5] },
  { sector: 'Energy', baseWeight: 7, weightRange: 1.5, changeRange: [-2.0, 2.0] },
  { sector: 'Real Estate', baseWeight: 6, weightRange: 1, changeRange: [-1.0, 1.2] },
];

// -- Theme configuration --

interface ThemeConfig {
  theme: string;
  conviction: 'high' | 'moderate';
  examplePositions: string;
  baseCapital: number;
  capitalRange: number;
}

const THEME_CONFIGS: ThemeConfig[] = [
  { theme: 'AI Infrastructure', conviction: 'high', examplePositions: 'NVDA, MSFT, AVGO', baseCapital: 42, capitalRange: 8 },
  { theme: 'Energy Transition', conviction: 'moderate', examplePositions: 'NEE, ENPH, FSLR', baseCapital: 18, capitalRange: 5 },
  { theme: 'Healthcare Innovation', conviction: 'high', examplePositions: 'LLY, ISRG, DXCM', baseCapital: 24, capitalRange: 6 },
  { theme: 'Financial Infrastructure', conviction: 'moderate', examplePositions: 'V, MA, COIN', baseCapital: 15, capitalRange: 4 },
];

// -- Filing activity templates --

interface FilingTemplate {
  filer: string;
  actions: string[];
  tickers: string[];
  sharesRanges: [number, number][];
}

const FILING_TEMPLATES: FilingTemplate[] = [
  { filer: 'Berkshire Hathaway', actions: ['Increased stake in', 'Initiated new position in', 'Reduced holdings in'], tickers: ['OXY', 'AAPL', 'BAC', 'KO', 'AXP'], sharesRanges: [[5, 25], [2, 15], [1, 10]] },
  { filer: 'Soros Fund Management', actions: ['Added calls on', 'Exited position in', 'New 13F filing shows'], tickers: ['RIVN', 'GOOGL', 'AMZN', 'TSLA'], sharesRanges: [[1, 8], [0.5, 5], [2, 12]] },
  { filer: 'Pershing Square Capital', actions: ['Increased stake in', 'Maintained position in', 'Trimmed holdings in'], tickers: ['CMG', 'HLT', 'QSR', 'LOW', 'GOOGL'], sharesRanges: [[3, 18], [1, 10], [2, 14]] },
  { filer: 'Duquesne Family Office', actions: ['Built new position in', 'Increased allocation to', 'Sold shares of'], tickers: ['NVDA', 'MSFT', 'AMZN', 'GOOGL'], sharesRanges: [[2, 12], [1, 8], [3, 15]] },
  { filer: 'Citadel Advisors', actions: ['Added options exposure in', 'Increased equity stake in', 'Reduced position in'], tickers: ['SPY', 'AAPL', 'NVDA', 'MSFT', 'META'], sharesRanges: [[5, 30], [3, 20], [2, 15]] },
];

// -- Cache --

const CACHE_TTL = 60 * 60_000;
let cache: { data: FamilyOfficeResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

// -- Data generation --

function generate(): FamilyOfficeResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('family-office-' + today));

  const lerp = (min: number, max: number) => min + rng() * (max - min);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. Top Family Offices --

  const changeOptions: Array<'adding' | 'reducing' | 'unchanged'> = ['adding', 'reducing', 'unchanged'];

  const topFamilyOffices: TopFamilyOffice[] = OFFICE_CONFIGS.map((cfg) => {
    const estimatedAUM = round(cfg.baseAUM + (rng() - 0.5) * cfg.aumRange * 2, 1);
    const topHolding = cfg.topHoldings[Math.floor(rng() * cfg.topHoldings.length)];
    const topHoldingWeight = round(lerp(cfg.weightRange[0], cfg.weightRange[1]), 1);
    const return1Y = round(lerp(cfg.returnRange[0], cfg.returnRange[1]), 1);
    const recentChange = pick(changeOptions);

    return {
      name: cfg.name,
      estimatedAUM,
      topHolding,
      topHoldingWeight,
      portfolioConcentration: cfg.concentration,
      recentChange,
      return1Y,
    };
  });

  // -- 2. Aggregate Allocation --

  const rawAlloc = {
    publicEquity: lerp(30, 38),
    fixedIncome: lerp(10, 16),
    privateEquity: lerp(15, 22),
    realEstate: lerp(8, 14),
    hedgeFunds: lerp(6, 12),
    directInvestments: lerp(5, 10),
    crypto: lerp(1, 4),
    cash: lerp(3, 8),
  };

  const allocKeys = Object.keys(rawAlloc) as (keyof typeof rawAlloc)[];
  const allocTotal = allocKeys.reduce((sum, k) => sum + rawAlloc[k], 0);
  const aggregateAllocation: AggregateAllocation = {} as AggregateAllocation;
  for (const k of allocKeys) {
    (aggregateAllocation as unknown as Record<string, number>)[k] = round((rawAlloc[k] / allocTotal) * 100, 1);
  }
  // Fix rounding residual on publicEquity
  const normTotal = allocKeys.reduce((sum, k) => sum + (aggregateAllocation as unknown as Record<string, number>)[k], 0);
  aggregateAllocation.publicEquity = round(aggregateAllocation.publicEquity + (100 - normTotal), 1);

  // -- 3. Top Positions --

  const topPositions: TopPosition[] = POSITION_CONFIGS.map((cfg) => {
    const aggregateOwnership = round(cfg.baseOwnership + (rng() - 0.5) * cfg.ownershipRange * 2, 1);
    const marketValue = round(cfg.baseMarketValue + (rng() - 0.5) * cfg.mvRange * 2, 1);
    const changeQoQ = round(lerp(-8, 12), 1);
    const numberOfFilers = Math.floor(lerp(cfg.filerRange[0], cfg.filerRange[1] + 1));

    return {
      ticker: cfg.ticker,
      companyName: cfg.companyName,
      aggregateOwnership,
      marketValue,
      changeQoQ,
      numberOfFilers: clamp(numberOfFilers, cfg.filerRange[0], cfg.filerRange[1]),
    };
  });

  // -- 4. Sector Exposure --

  const rawSectors = SECTOR_CONFIGS.map((cfg) => {
    const weight = cfg.baseWeight + (rng() - 0.5) * cfg.weightRange * 2;
    const changeQoQ = round(lerp(cfg.changeRange[0], cfg.changeRange[1]), 1);
    return { sector: cfg.sector, weight: Math.max(1, weight), changeQoQ };
  });

  const sectorTotal = rawSectors.reduce((sum, s) => sum + s.weight, 0);
  const sectorExposure: SectorExposure[] = rawSectors.map((s) => ({
    sector: s.sector,
    weight: round((s.weight / sectorTotal) * 100, 1),
    changeQoQ: s.changeQoQ,
  }));

  // Fix rounding residual on first sector
  const sectorNormTotal = sectorExposure.reduce((sum, s) => sum + s.weight, 0);
  sectorExposure[0].weight = round(sectorExposure[0].weight + (100 - sectorNormTotal), 1);

  // -- 5. Investment Themes --

  const investmentThemes: InvestmentTheme[] = THEME_CONFIGS.map((cfg) => ({
    theme: cfg.theme,
    conviction: cfg.conviction,
    examplePositions: cfg.examplePositions,
    capitalDeployed: round(cfg.baseCapital + (rng() - 0.5) * cfg.capitalRange * 2, 1),
  }));

  // -- 6. Filing Activity --

  const filingActivity: FilingActivity[] = [];

  for (let i = 0; i < 3; i++) {
    const tmpl = FILING_TEMPLATES[Math.floor(rng() * FILING_TEMPLATES.length)];
    const actionIdx = Math.floor(rng() * tmpl.actions.length);
    const tickerIdx = Math.floor(rng() * tmpl.tickers.length);
    const sharesRange = tmpl.sharesRanges[Math.min(actionIdx, tmpl.sharesRanges.length - 1)];
    const shares = round(lerp(sharesRange[0], sharesRange[1]), 1);

    const daysAgo = Math.floor(rng() * 14);
    const filingDate = new Date();
    filingDate.setDate(filingDate.getDate() - daysAgo);

    filingActivity.push({
      date: filingDate.toISOString().slice(0, 10),
      filer: tmpl.filer,
      action: tmpl.actions[actionIdx],
      ticker: tmpl.tickers[tickerIdx],
      sharesChanged: `${shares}M shares`,
    });
  }

  filingActivity.sort((a, b) => b.date.localeCompare(a.date));

  return {
    topFamilyOffices,
    aggregateAllocation,
    topPositions,
    sectorExposure,
    investmentThemes,
    filingActivity,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FamilyOffice] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate family office data' });
  }
});

export default router;
