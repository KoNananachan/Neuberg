import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface BreakevenRate {
  maturity: string;
  current: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

interface InflationSwapRate {
  tenor: string;
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
}

interface RealYield {
  maturity: string;
  yield: number;
  change1d: number;
  change1w: number;
}

interface ForwardInflation {
  currency: string;
  fiveYFiveY: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

interface CpiForecast {
  releaseDate: string;
  measure: string;
  consensus: number;
  prior: number;
  surpriseHistory: number[];
}

interface TipsFlow {
  ticker: string;
  name: string;
  aum: number;
  weeklyFlow: number;
  monthlyFlow: number;
  ytdFlow: number;
}

interface LinkerAuction {
  date: string;
  security: string;
  size: number;
  bidToCover: number;
  tail: number;
  highYield: number;
}

interface SeasonalAdjustment {
  month: string;
  factor: number;
  historicalAvg: number;
}

interface GlobalInflationEntry {
  country: string;
  headlineCpi: number;
  coreCpi: number;
  change1m: number;
  nextRelease: string;
}

interface InflationSwapResponse {
  breakevens: BreakevenRate[];
  inflationSwaps: InflationSwapRate[];
  realYields: RealYield[];
  forwardInflation: ForwardInflation[];
  cpiForecasts: CpiForecast[];
  tipsFlows: TipsFlow[];
  linkerIssuance: LinkerAuction[];
  seasonalAdjustments: SeasonalAdjustment[];
  globalInflation: GlobalInflationEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: InflationSwapResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Breakeven configuration ──

interface BreakevenConfig {
  maturity: string;
  baseRate: number;
  volatility: number;
}

const BREAKEVEN_CONFIGS: BreakevenConfig[] = [
  { maturity: '2Y', baseRate: 2.45, volatility: 0.12 },
  { maturity: '5Y', baseRate: 2.35, volatility: 0.10 },
  { maturity: '10Y', baseRate: 2.30, volatility: 0.08 },
  { maturity: '20Y', baseRate: 2.38, volatility: 0.07 },
  { maturity: '30Y', baseRate: 2.32, volatility: 0.06 },
];

// ── Inflation swap tenor configuration ──

interface SwapTenorConfig {
  tenor: string;
  baseUSD: number;
  baseEUR: number;
  baseGBP: number;
  baseJPY: number;
}

const SWAP_TENOR_CONFIGS: SwapTenorConfig[] = [
  { tenor: '1Y', baseUSD: 2.65, baseEUR: 2.30, baseGBP: 3.10, baseJPY: 1.80 },
  { tenor: '2Y', baseUSD: 2.52, baseEUR: 2.18, baseGBP: 2.95, baseJPY: 1.55 },
  { tenor: '3Y', baseUSD: 2.48, baseEUR: 2.12, baseGBP: 2.82, baseJPY: 1.42 },
  { tenor: '5Y', baseUSD: 2.42, baseEUR: 2.08, baseGBP: 2.72, baseJPY: 1.30 },
  { tenor: '7Y', baseUSD: 2.38, baseEUR: 2.05, baseGBP: 2.65, baseJPY: 1.22 },
  { tenor: '10Y', baseUSD: 2.35, baseEUR: 2.02, baseGBP: 2.58, baseJPY: 1.15 },
  { tenor: '15Y', baseUSD: 2.33, baseEUR: 2.00, baseGBP: 2.52, baseJPY: 1.10 },
  { tenor: '20Y', baseUSD: 2.36, baseEUR: 2.02, baseGBP: 2.55, baseJPY: 1.08 },
  { tenor: '30Y', baseUSD: 2.34, baseEUR: 2.01, baseGBP: 2.50, baseJPY: 1.05 },
];

// ── Real yield configuration ──

interface RealYieldConfig {
  maturity: string;
  baseYield: number;
  volatility: number;
}

const REAL_YIELD_CONFIGS: RealYieldConfig[] = [
  { maturity: '5Y', baseYield: 1.95, volatility: 0.08 },
  { maturity: '7Y', baseYield: 2.02, volatility: 0.07 },
  { maturity: '10Y', baseYield: 2.05, volatility: 0.06 },
  { maturity: '20Y', baseYield: 2.18, volatility: 0.05 },
  { maturity: '30Y', baseYield: 2.15, volatility: 0.05 },
];

// ── Forward inflation configuration ──

interface ForwardInflationConfig {
  currency: string;
  baseFiveYFiveY: number;
  volatility: number;
}

const FORWARD_INFLATION_CONFIGS: ForwardInflationConfig[] = [
  { currency: 'USD', baseFiveYFiveY: 2.28, volatility: 0.06 },
  { currency: 'EUR', baseFiveYFiveY: 2.15, volatility: 0.05 },
  { currency: 'GBP', baseFiveYFiveY: 3.45, volatility: 0.08 },
  { currency: 'JPY', baseFiveYFiveY: 1.02, volatility: 0.10 },
];

// ── CPI forecast configuration ──

interface CpiForecastConfig {
  measure: string;
  baseConsensus: number;
  basePrior: number;
  surpriseRange: number;
}

const CPI_FORECAST_CONFIGS: CpiForecastConfig[] = [
  { measure: 'CPI YoY', baseConsensus: 3.10, basePrior: 3.20, surpriseRange: 0.20 },
  { measure: 'Core CPI YoY', baseConsensus: 3.30, basePrior: 3.40, surpriseRange: 0.15 },
  { measure: 'CPI MoM', baseConsensus: 0.30, basePrior: 0.40, surpriseRange: 0.10 },
  { measure: 'Core CPI MoM', baseConsensus: 0.30, basePrior: 0.30, surpriseRange: 0.08 },
];

// ── TIPS flow configuration ──

interface TipsFlowConfig {
  ticker: string;
  name: string;
  baseAum: number;
  weeklyFlowRange: number;
  monthlyFlowRange: number;
}

const TIPS_FLOW_CONFIGS: TipsFlowConfig[] = [
  { ticker: 'TIP', name: 'iShares TIPS Bond ETF', baseAum: 19.2, weeklyFlowRange: 0.40, monthlyFlowRange: 1.20 },
  { ticker: 'VTIP', name: 'Vanguard Short-Term Inflation-Protected', baseAum: 12.8, weeklyFlowRange: 0.25, monthlyFlowRange: 0.80 },
  { ticker: 'SCHP', name: 'Schwab US TIPS ETF', baseAum: 8.5, weeklyFlowRange: 0.15, monthlyFlowRange: 0.50 },
];

// ── Linker issuance configuration ──

interface LinkerAuctionConfig {
  security: string;
  baseSize: number;
  baseBidToCover: number;
  baseTail: number;
  baseHighYield: number;
}

const LINKER_AUCTION_CONFIGS: LinkerAuctionConfig[] = [
  { security: '5Y TIPS', baseSize: 21.0, baseBidToCover: 2.45, baseTail: 0.5, baseHighYield: 1.95 },
  { security: '10Y TIPS', baseSize: 19.0, baseBidToCover: 2.52, baseTail: 0.3, baseHighYield: 2.05 },
  { security: '30Y TIPS', baseSize: 8.0, baseBidToCover: 2.38, baseTail: 0.8, baseHighYield: 2.15 },
  { security: '10Y TIPS Reopen', baseSize: 15.0, baseBidToCover: 2.48, baseTail: 0.4, baseHighYield: 2.02 },
  { security: '5Y TIPS Reopen', baseSize: 18.0, baseBidToCover: 2.42, baseTail: 0.6, baseHighYield: 1.90 },
];

// ── Seasonal adjustment configuration ──

const SEASONAL_FACTORS: { month: string; baseFactor: number; historicalAvg: number }[] = [
  { month: 'Jan', baseFactor: 0.47, historicalAvg: 0.44 },
  { month: 'Feb', baseFactor: 0.44, historicalAvg: 0.39 },
  { month: 'Mar', baseFactor: 0.41, historicalAvg: 0.36 },
  { month: 'Apr', baseFactor: 0.33, historicalAvg: 0.31 },
  { month: 'May', baseFactor: 0.33, historicalAvg: 0.32 },
  { month: 'Jun', baseFactor: 0.12, historicalAvg: 0.08 },
  { month: 'Jul', baseFactor: -0.01, historicalAvg: -0.04 },
  { month: 'Aug', baseFactor: 0.10, historicalAvg: 0.12 },
  { month: 'Sep', baseFactor: 0.25, historicalAvg: 0.27 },
  { month: 'Oct', baseFactor: 0.20, historicalAvg: 0.18 },
  { month: 'Nov', baseFactor: 0.05, historicalAvg: 0.01 },
  { month: 'Dec', baseFactor: -0.08, historicalAvg: -0.10 },
];

// ── Global inflation configuration ──

interface GlobalInflationConfig {
  country: string;
  baseHeadline: number;
  baseCore: number;
  volatility: number;
}

const GLOBAL_INFLATION_CONFIGS: GlobalInflationConfig[] = [
  { country: 'United States', baseHeadline: 3.10, baseCore: 3.30, volatility: 0.15 },
  { country: 'Euro Area', baseHeadline: 2.40, baseCore: 2.70, volatility: 0.12 },
  { country: 'United Kingdom', baseHeadline: 3.40, baseCore: 4.20, volatility: 0.18 },
  { country: 'Japan', baseHeadline: 2.80, baseCore: 2.30, volatility: 0.20 },
  { country: 'China', baseHeadline: 0.70, baseCore: 0.60, volatility: 0.25 },
];

// ── Data generation ──

function generateBreakevens(rng: () => number): BreakevenRate[] {
  return BREAKEVEN_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const current = Math.round((cfg.baseRate + jitter) * 1000) / 1000;
    const change1d = Math.round((rng() - 0.5) * 4 * 100) / 100; // bps
    const change1w = Math.round((rng() - 0.5) * 10 * 100) / 100;
    const change1m = Math.round((rng() - 0.5) * 20 * 100) / 100;

    return { maturity: cfg.maturity, current, change1d, change1w, change1m };
  });
}

function generateInflationSwaps(rng: () => number): InflationSwapRate[] {
  return SWAP_TENOR_CONFIGS.map((cfg) => {
    const vol = 0.10;
    const usd = Math.round((cfg.baseUSD + (rng() - 0.5) * vol * 2) * 1000) / 1000;
    const eur = Math.round((cfg.baseEUR + (rng() - 0.5) * vol * 2) * 1000) / 1000;
    const gbp = Math.round((cfg.baseGBP + (rng() - 0.5) * vol * 2) * 1000) / 1000;
    const jpy = Math.round((cfg.baseJPY + (rng() - 0.5) * vol * 2) * 1000) / 1000;

    return { tenor: cfg.tenor, USD: usd, EUR: eur, GBP: gbp, JPY: jpy };
  });
}

function generateRealYields(rng: () => number): RealYield[] {
  return REAL_YIELD_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const yieldVal = Math.round((cfg.baseYield + jitter) * 1000) / 1000;
    const change1d = Math.round((rng() - 0.5) * 3 * 100) / 100;
    const change1w = Math.round((rng() - 0.5) * 8 * 100) / 100;

    return { maturity: cfg.maturity, yield: yieldVal, change1d, change1w };
  });
}

function generateForwardInflation(rng: () => number): ForwardInflation[] {
  return FORWARD_INFLATION_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const fiveYFiveY = Math.round((cfg.baseFiveYFiveY + jitter) * 1000) / 1000;
    const change1d = Math.round((rng() - 0.5) * 3 * 100) / 100;
    const change1w = Math.round((rng() - 0.5) * 6 * 100) / 100;
    const change1m = Math.round((rng() - 0.5) * 12 * 100) / 100;

    return { currency: cfg.currency, fiveYFiveY, change1d, change1w, change1m };
  });
}

function generateCpiForecasts(rng: () => number): CpiForecast[] {
  // Deterministic upcoming release date: next month's 12th-14th
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 12 + Math.floor(rng() * 3));
  const releaseDate = nextMonth.toISOString().slice(0, 10);

  return CPI_FORECAST_CONFIGS.map((cfg) => {
    const consensusJitter = (rng() - 0.5) * 0.10;
    const consensus = Math.round((cfg.baseConsensus + consensusJitter) * 100) / 100;

    const priorJitter = (rng() - 0.5) * 0.10;
    const prior = Math.round((cfg.basePrior + priorJitter) * 100) / 100;

    // Last 6 surprise readings (actual - consensus, in percentage points)
    const surpriseHistory: number[] = [];
    for (let i = 0; i < 6; i++) {
      const surprise = Math.round((rng() - 0.5) * cfg.surpriseRange * 2 * 100) / 100;
      surpriseHistory.push(surprise);
    }

    return { releaseDate, measure: cfg.measure, consensus, prior, surpriseHistory };
  });
}

function generateTipsFlows(rng: () => number): TipsFlow[] {
  return TIPS_FLOW_CONFIGS.map((cfg) => {
    const aumJitter = (rng() - 0.5) * cfg.baseAum * 0.05;
    const aum = Math.round((cfg.baseAum + aumJitter) * 100) / 100;

    const weeklyFlow = Math.round((rng() - 0.5) * cfg.weeklyFlowRange * 2 * 100) / 100;
    const monthlyFlow = Math.round((rng() - 0.5) * cfg.monthlyFlowRange * 2 * 100) / 100;
    const ytdFlow = Math.round((rng() - 0.5) * cfg.monthlyFlowRange * 8 * 100) / 100;

    return { ticker: cfg.ticker, name: cfg.name, aum, weeklyFlow, monthlyFlow, ytdFlow };
  });
}

function generateLinkerIssuance(rng: () => number): LinkerAuction[] {
  const now = new Date();

  return LINKER_AUCTION_CONFIGS.map((cfg, idx) => {
    // Spread auction dates over past 2 months
    const daysAgo = Math.floor(rng() * 60);
    const auctionDate = new Date(now.getTime() - daysAgo * 86400000);
    const date = auctionDate.toISOString().slice(0, 10);

    const sizeJitter = (rng() - 0.5) * cfg.baseSize * 0.10;
    const size = Math.round((cfg.baseSize + sizeJitter) * 10) / 10;

    const btcJitter = (rng() - 0.5) * 0.30;
    const bidToCover = Math.round((cfg.baseBidToCover + btcJitter) * 100) / 100;

    // Tail in bps: negative = through (strong), positive = tail (weak)
    const tailJitter = (rng() - 0.5) * 2.0;
    const tail = Math.round((cfg.baseTail + tailJitter) * 10) / 10;

    const yieldJitter = (rng() - 0.5) * 0.15;
    const highYield = Math.round((cfg.baseHighYield + yieldJitter) * 1000) / 1000;

    return { date, security: cfg.security, size, bidToCover, tail, highYield };
  });
}

function generateSeasonalAdjustments(rng: () => number): SeasonalAdjustment[] {
  return SEASONAL_FACTORS.map((cfg) => {
    const factorJitter = (rng() - 0.5) * 0.06;
    const factor = Math.round((cfg.baseFactor + factorJitter) * 1000) / 1000;
    const historicalAvg = cfg.historicalAvg;

    return { month: cfg.month, factor, historicalAvg };
  });
}

function generateGlobalInflation(rng: () => number): GlobalInflationEntry[] {
  const now = new Date();

  return GLOBAL_INFLATION_CONFIGS.map((cfg) => {
    const headlineJitter = (rng() - 0.5) * cfg.volatility * 2;
    const headlineCpi = Math.round((cfg.baseHeadline + headlineJitter) * 100) / 100;

    const coreJitter = (rng() - 0.5) * cfg.volatility * 2;
    const coreCpi = Math.round((cfg.baseCore + coreJitter) * 100) / 100;

    const change1m = Math.round((rng() - 0.5) * 0.40 * 100) / 100;

    // Next release date: 10-20 days from now
    const daysUntil = 10 + Math.floor(rng() * 11);
    const nextRelease = new Date(now.getTime() + daysUntil * 86400000).toISOString().slice(0, 10);

    return { country: cfg.country, headlineCpi, coreCpi, change1m, nextRelease };
  });
}

function generateInflationSwapData(): InflationSwapResponse {
  const rng = seededRandom('inflation-swap');

  const breakevens = generateBreakevens(rng);
  const inflationSwaps = generateInflationSwaps(rng);
  const realYields = generateRealYields(rng);
  const forwardInflation = generateForwardInflation(rng);
  const cpiForecasts = generateCpiForecasts(rng);
  const tipsFlows = generateTipsFlows(rng);
  const linkerIssuance = generateLinkerIssuance(rng);
  const seasonalAdjustments = generateSeasonalAdjustments(rng);
  const globalInflation = generateGlobalInflation(rng);
  const timestamp = new Date().toISOString();

  return {
    breakevens,
    inflationSwaps,
    realYields,
    forwardInflation,
    cpiForecasts,
    tipsFlows,
    linkerIssuance,
    seasonalAdjustments,
    globalInflation,
    timestamp,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateInflationSwapData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[InflationSwap] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate inflation swap data' });
  }
});

export default router;
