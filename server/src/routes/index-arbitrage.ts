import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface IndexFuturesBasis {
  index: string;
  futuresContract: string;
  cashLevel: number;
  futuresPrice: number;
  fairValue: number;
  basisPoints: number;
  basisBps: number;
  premiumDiscount: 'PREMIUM' | 'DISCOUNT' | 'FAIR';
  costOfCarry: number;
  dividendYield: number;
  daysToExpiry: number;
}

interface ETFPremiumDiscount {
  ticker: string;
  name: string;
  nav: number;
  marketPrice: number;
  premiumDiscountBps: number;
  creationRedemptionSpread: number;
  avgDailyVolume: number;
}

interface ArbitrageOpportunity {
  rank: number;
  pair: string;
  entrySignal: string;
  currentSpread: number;
  threshold: number;
  estimatedProfitBps: number;
  holdingPeriod: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface HistoricalBasisPoint {
  date: string;
  spxCash: number;
  esFutures: number;
  basis: number;
  basisBps: number;
}

interface CrossListedArbitrage {
  stockPrimary: string;
  stockSecondary: string;
  pricePrimary: number;
  priceSecondary: number;
  fxRate: number;
  fxAdjustedSpread: number;
  transactionCostBps: number;
  netOpportunityBps: number;
}

interface ProgramTradingSignal {
  index: string;
  buyProgramThreshold: number;
  sellProgramThreshold: number;
  currentBasis: number;
  distanceToBuyTrigger: number;
  distanceToSellTrigger: number;
  lastBuyTriggerTime: string;
  lastSellTriggerTime: string;
}

interface IndexArbitrageResponse {
  indexFuturesBasis: IndexFuturesBasis[];
  etfPremiumDiscount: ETFPremiumDiscount[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  historicalBasis: HistoricalBasisPoint[];
  crossListedArbitrage: CrossListedArbitrage[];
  programTradingSignals: ProgramTradingSignal[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: IndexArbitrageResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Index/Futures configuration ──

interface IndexFuturesConfig {
  index: string;
  futuresContract: string;
  baseCashLevel: number;
  baseFuturesOffset: number;
  baseDividendYield: number;
  baseDaysToExpiry: number;
}

const INDEX_FUTURES: IndexFuturesConfig[] = [
  { index: 'SPX',    futuresContract: 'ES',   baseCashLevel: 5920,   baseFuturesOffset: 12.5,  baseDividendYield: 1.35, baseDaysToExpiry: 45 },
  { index: 'NDX',    futuresContract: 'NQ',   baseCashLevel: 20650,  baseFuturesOffset: 38.0,  baseDividendYield: 0.65, baseDaysToExpiry: 45 },
  { index: 'RTY',    futuresContract: 'RTY',  baseCashLevel: 2085,   baseFuturesOffset: 3.2,   baseDividendYield: 1.55, baseDaysToExpiry: 45 },
  { index: 'DJIA',   futuresContract: 'YM',   baseCashLevel: 43250,  baseFuturesOffset: 85.0,  baseDividendYield: 1.80, baseDaysToExpiry: 45 },
  { index: 'STOXX',  futuresContract: 'FESX', baseCashLevel: 4980,   baseFuturesOffset: 8.5,   baseDividendYield: 2.80, baseDaysToExpiry: 38 },
  { index: 'Nikkei', futuresContract: 'NK',   baseCashLevel: 38750,  baseFuturesOffset: 120.0, baseDividendYield: 1.90, baseDaysToExpiry: 42 },
];

// ── ETF configuration ──

interface ETFConfig {
  ticker: string;
  name: string;
  baseNav: number;
  baseVolume: number;
  baseSpreadBps: number;
}

const ETF_DEFS: ETFConfig[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust',                   baseNav: 591.20, baseVolume: 72_500_000, baseSpreadBps: 0.3 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust',                        baseNav: 503.85, baseVolume: 48_200_000, baseSpreadBps: 0.4 },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF',                 baseNav: 221.40, baseVolume: 28_600_000, baseSpreadBps: 0.6 },
  { ticker: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF',    baseNav: 432.50, baseVolume: 3_800_000,  baseSpreadBps: 0.8 },
  { ticker: 'EFA', name: 'iShares MSCI EAFE ETF',                    baseNav: 82.15,  baseVolume: 14_200_000, baseSpreadBps: 0.9 },
  { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF',        baseNav: 43.60,  baseVolume: 32_100_000, baseSpreadBps: 1.5 },
  { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF',       baseNav: 44.90,  baseVolume: 10_500_000, baseSpreadBps: 1.2 },
  { ticker: 'GLD', name: 'SPDR Gold Shares',                         baseNav: 241.30, baseVolume: 7_800_000,  baseSpreadBps: 0.6 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF',       baseNav: 91.85,  baseVolume: 22_400_000, baseSpreadBps: 0.5 },
];

// ── Cross-listed pairs ──

interface CrossListedConfig {
  primary: string;
  secondary: string;
  basePricePrimary: number;
  basePriceSecondary: number;
  baseFxRate: number;
  baseTransactionCostBps: number;
}

const CROSS_LISTED_PAIRS: CrossListedConfig[] = [
  { primary: 'SHEL (NYSE)',   secondary: 'SHEL.L (LSE)',   basePricePrimary: 67.80,   basePriceSecondary: 2685.0, baseFxRate: 1.2720,  baseTransactionCostBps: 8.5 },
  { primary: 'BABA (NYSE)',   secondary: '9988.HK (HKEX)', basePricePrimary: 85.40,   basePriceSecondary: 83.50,  baseFxRate: 7.8120,  baseTransactionCostBps: 12.0 },
  { primary: 'RIO (NYSE)',    secondary: 'RIO.L (LSE)',    basePricePrimary: 65.20,   basePriceSecondary: 5148.0, baseFxRate: 1.2720,  baseTransactionCostBps: 9.0 },
  { primary: 'UL (NYSE)',     secondary: 'ULVR.L (LSE)',   basePricePrimary: 54.30,   basePriceSecondary: 4285.0, baseFxRate: 1.2720,  baseTransactionCostBps: 8.0 },
  { primary: 'NVO (NYSE)',    secondary: 'NOVO-B.CO (CSE)', basePricePrimary: 128.50, basePriceSecondary: 865.0,  baseFxRate: 6.8350,  baseTransactionCostBps: 10.5 },
];

// ── Data generation ──

function generateIndexFuturesBasis(rng: () => number): IndexFuturesBasis[] {
  return INDEX_FUTURES.map((cfg) => {
    const cashJitter = (rng() - 0.5) * cfg.baseCashLevel * 0.008;
    const cashLevel = Math.round((cfg.baseCashLevel + cashJitter) * 100) / 100;

    const riskFreeRate = 4.35 + (rng() - 0.5) * 0.20;
    const dividendYield = cfg.baseDividendYield + (rng() - 0.5) * 0.15;
    const daysToExpiry = cfg.baseDaysToExpiry + Math.round((rng() - 0.5) * 10);

    // Fair value = cash * (1 + (r - d) * T/365)
    const carryComponent = (riskFreeRate - dividendYield) / 100 * (daysToExpiry / 365);
    const fairValue = Math.round(cashLevel * (1 + carryComponent) * 100) / 100;

    // Futures price: near fair value with small mispricing
    const mispricingJitter = (rng() - 0.5) * cfg.baseCashLevel * 0.0015;
    const futuresPrice = Math.round((fairValue + mispricingJitter) * 100) / 100;

    const basisPoints = Math.round((futuresPrice - cashLevel) * 100) / 100;
    const basisBps = Math.round((basisPoints / cashLevel) * 10000 * 100) / 100;

    let premiumDiscount: 'PREMIUM' | 'DISCOUNT' | 'FAIR';
    if (basisBps > 2) {
      premiumDiscount = 'PREMIUM';
    } else if (basisBps < -2) {
      premiumDiscount = 'DISCOUNT';
    } else {
      premiumDiscount = 'FAIR';
    }

    const costOfCarry = Math.round(carryComponent * 10000 * 100) / 100; // in bps

    return {
      index: cfg.index,
      futuresContract: cfg.futuresContract,
      cashLevel,
      futuresPrice,
      fairValue,
      basisPoints,
      basisBps,
      premiumDiscount,
      costOfCarry,
      dividendYield: Math.round(dividendYield * 100) / 100,
      daysToExpiry,
    };
  });
}

function generateETFPremiumDiscount(rng: () => number): ETFPremiumDiscount[] {
  return ETF_DEFS.map((cfg) => {
    const navJitter = (rng() - 0.5) * cfg.baseNav * 0.006;
    const nav = Math.round((cfg.baseNav + navJitter) * 100) / 100;

    // Premium/discount typically small for liquid ETFs
    const premDiscBps = Math.round((rng() - 0.5) * cfg.baseSpreadBps * 20 * 100) / 100;
    const marketPrice = Math.round((nav * (1 + premDiscBps / 10000)) * 100) / 100;

    // Creation/redemption spread: institutional cost
    const crSpread = Math.round((cfg.baseSpreadBps * 1.5 + rng() * 2.0) * 100) / 100;

    // Volume with jitter
    const volume = Math.round(cfg.baseVolume * (0.7 + rng() * 0.6));

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      nav,
      marketPrice,
      premiumDiscountBps: premDiscBps,
      creationRedemptionSpread: crSpread,
      avgDailyVolume: volume,
    };
  });
}

function generateArbitrageOpportunities(rng: () => number): ArbitrageOpportunity[] {
  const ARBS: { pair: string; signal: string; baseSpread: number; baseThreshold: number; holdingPeriod: string; baseProfit: number }[] = [
    { pair: 'SPX/ES Futures',               signal: 'Futures premium exceeds fair value',       baseSpread: 3.2,  baseThreshold: 5.0,  holdingPeriod: 'Intraday',   baseProfit: 2.8 },
    { pair: 'NDX/NQ Futures',               signal: 'Futures discount below cost of carry',     baseSpread: 4.8,  baseThreshold: 6.5,  holdingPeriod: 'Intraday',   baseProfit: 3.5 },
    { pair: 'SPY NAV vs Market',            signal: 'ETF premium above creation threshold',     baseSpread: 1.5,  baseThreshold: 3.0,  holdingPeriod: 'T+1',        baseProfit: 1.2 },
    { pair: 'SHEL NYSE/LSE',               signal: 'Cross-listed spread exceeds FX-adj costs',  baseSpread: 8.0,  baseThreshold: 10.0, holdingPeriod: '2-3 days',   baseProfit: 4.5 },
    { pair: 'BABA/9988.HK',                signal: 'ADR premium over HK listing',               baseSpread: 12.5, baseThreshold: 15.0, holdingPeriod: '1-2 days',   baseProfit: 6.2 },
    { pair: 'QQQ NAV vs Market',            signal: 'ETF discount near redemption spread',       baseSpread: 1.8,  baseThreshold: 2.5,  holdingPeriod: 'T+1',        baseProfit: 1.0 },
    { pair: 'RTY/IWM Cash-Futures',         signal: 'Basis wider than 2 std devs',              baseSpread: 5.5,  baseThreshold: 7.0,  holdingPeriod: 'Intraday',   baseProfit: 2.4 },
    { pair: 'DJIA/YM Futures',              signal: 'Fair value deviation on open',              baseSpread: 2.8,  baseThreshold: 4.0,  holdingPeriod: 'Intraday',   baseProfit: 1.8 },
    { pair: 'STOXX/FESX Futures',           signal: 'Euro close vs US open gap',                 baseSpread: 6.2,  baseThreshold: 8.0,  holdingPeriod: '4-6 hours',  baseProfit: 3.8 },
    { pair: 'NVO NYSE/CSE',                signal: 'ADR discount to Copenhagen listing',         baseSpread: 9.5,  baseThreshold: 12.0, holdingPeriod: '1-2 days',   baseProfit: 5.0 },
  ];

  const opportunities: ArbitrageOpportunity[] = ARBS.map((cfg, i) => {
    const spreadJitter = (rng() - 0.5) * cfg.baseSpread * 0.4;
    const currentSpread = Math.round((cfg.baseSpread + spreadJitter) * 100) / 100;

    const thresholdJitter = (rng() - 0.5) * 1.0;
    const threshold = Math.round((cfg.baseThreshold + thresholdJitter) * 100) / 100;

    const profitJitter = (rng() - 0.5) * cfg.baseProfit * 0.5;
    const estimatedProfit = Math.round((cfg.baseProfit + profitJitter) * 100) / 100;

    const riskRoll = rng();
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (riskRoll < 0.35) {
      riskLevel = 'LOW';
    } else if (riskRoll < 0.75) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'HIGH';
    }

    return {
      rank: i + 1,
      pair: cfg.pair,
      entrySignal: cfg.signal,
      currentSpread,
      threshold,
      estimatedProfitBps: Math.max(estimatedProfit, 0.1),
      holdingPeriod: cfg.holdingPeriod,
      riskLevel,
    };
  });

  // Sort by estimated profit descending, re-rank
  opportunities.sort((a, b) => b.estimatedProfitBps - a.estimatedProfitBps);
  opportunities.forEach((opp, i) => { opp.rank = i + 1; });

  return opportunities;
}

function generateHistoricalBasis(rng: () => number): HistoricalBasisPoint[] {
  const entries: HistoricalBasisPoint[] = [];
  const today = new Date();
  const baseSPX = 5920;
  const baseBasis = 11.0; // points

  for (let i = 19; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateStr = d.toISOString().slice(0, 10);

    // Simulate convergence toward expiry: basis narrows over time
    const convergenceFactor = i / 19;
    const drift = (rng() - 0.5) * 6.0;
    const basis = Math.round((baseBasis * convergenceFactor + drift + 3.0) * 100) / 100;

    const spxJitter = (rng() - 0.5) * baseSPX * 0.012;
    const spxCash = Math.round((baseSPX + spxJitter) * 100) / 100;
    const esFutures = Math.round((spxCash + basis) * 100) / 100;

    const basisBps = Math.round((basis / spxCash) * 10000 * 100) / 100;

    entries.push({ date: dateStr, spxCash, esFutures, basis, basisBps });
  }

  // Ensure exactly 20 points by filling if weekends caused gaps
  while (entries.length < 20) {
    const lastEntry = entries[entries.length - 1];
    const d = new Date(lastEntry.date);
    d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().slice(0, 10);
    const drift = (rng() - 0.5) * 4.0;
    const basis = Math.round((lastEntry.basis + drift * 0.3) * 100) / 100;
    const spxJitter = (rng() - 0.5) * baseSPX * 0.005;
    const spxCash = Math.round((baseSPX + spxJitter) * 100) / 100;
    const esFutures = Math.round((spxCash + basis) * 100) / 100;
    const basisBps = Math.round((basis / spxCash) * 10000 * 100) / 100;
    entries.push({ date: dateStr, spxCash, esFutures, basis, basisBps });
  }

  return entries.slice(0, 20);
}

function generateCrossListedArbitrage(rng: () => number): CrossListedArbitrage[] {
  return CROSS_LISTED_PAIRS.map((cfg) => {
    const primaryJitter = (rng() - 0.5) * cfg.basePricePrimary * 0.015;
    const pricePrimary = Math.round((cfg.basePricePrimary + primaryJitter) * 100) / 100;

    const secondaryJitter = (rng() - 0.5) * cfg.basePriceSecondary * 0.015;
    const priceSecondary = Math.round((cfg.basePriceSecondary + secondaryJitter) * 100) / 100;

    const fxJitter = (rng() - 0.5) * cfg.baseFxRate * 0.005;
    const fxRate = Math.round((cfg.baseFxRate + fxJitter) * 10000) / 10000;

    // FX-adjusted spread: convert secondary to USD equivalent and compare
    const secondaryInUSD = priceSecondary / fxRate;
    const spreadPct = ((pricePrimary - secondaryInUSD) / secondaryInUSD) * 10000;
    const fxAdjustedSpread = Math.round(spreadPct * 100) / 100;

    const txCostJitter = (rng() - 0.5) * 3.0;
    const transactionCostBps = Math.round((cfg.baseTransactionCostBps + txCostJitter) * 100) / 100;

    const netOpportunityBps = Math.round((Math.abs(fxAdjustedSpread) - transactionCostBps) * 100) / 100;

    return {
      stockPrimary: cfg.primary,
      stockSecondary: cfg.secondary,
      pricePrimary,
      priceSecondary,
      fxRate,
      fxAdjustedSpread,
      transactionCostBps,
      netOpportunityBps: Math.max(netOpportunityBps, -transactionCostBps),
    };
  });
}

function generateProgramTradingSignals(rng: () => number): ProgramTradingSignal[] {
  const INDICES = [
    { index: 'SPX', baseBasis: 5.5,  buyThreshold: 12.0, sellThreshold: -8.0 },
    { index: 'NDX', baseBasis: 8.2,  buyThreshold: 18.0, sellThreshold: -12.0 },
    { index: 'RTY', baseBasis: 3.8,  buyThreshold: 8.0,  sellThreshold: -6.0 },
    { index: 'DJIA', baseBasis: 4.2, buyThreshold: 10.0, sellThreshold: -7.0 },
    { index: 'STOXX', baseBasis: 6.0, buyThreshold: 14.0, sellThreshold: -10.0 },
    { index: 'Nikkei', baseBasis: 15.0, buyThreshold: 35.0, sellThreshold: -25.0 },
  ];

  const today = new Date();

  return INDICES.map((cfg) => {
    const basisJitter = (rng() - 0.5) * cfg.baseBasis * 0.6;
    const currentBasis = Math.round((cfg.baseBasis + basisJitter) * 100) / 100;

    const buyThresholdJitter = (rng() - 0.5) * 2.0;
    const buyProgramThreshold = Math.round((cfg.buyThreshold + buyThresholdJitter) * 100) / 100;

    const sellThresholdJitter = (rng() - 0.5) * 2.0;
    const sellProgramThreshold = Math.round((cfg.sellThreshold + sellThresholdJitter) * 100) / 100;

    const distanceToBuyTrigger = Math.round((buyProgramThreshold - currentBasis) * 100) / 100;
    const distanceToSellTrigger = Math.round((currentBasis - sellProgramThreshold) * 100) / 100;

    // Last trigger time: random time in the past few trading days
    const buyDaysAgo = Math.floor(rng() * 5) + 1;
    const buyHour = Math.floor(rng() * 7) + 9; // 9:00 - 15:59
    const buyMin = Math.floor(rng() * 60);
    const buyDate = new Date(today);
    buyDate.setDate(buyDate.getDate() - buyDaysAgo);
    buyDate.setHours(buyHour, buyMin, 0, 0);

    const sellDaysAgo = Math.floor(rng() * 7) + 1;
    const sellHour = Math.floor(rng() * 7) + 9;
    const sellMin = Math.floor(rng() * 60);
    const sellDate = new Date(today);
    sellDate.setDate(sellDate.getDate() - sellDaysAgo);
    sellDate.setHours(sellHour, sellMin, 0, 0);

    return {
      index: cfg.index,
      buyProgramThreshold,
      sellProgramThreshold,
      currentBasis,
      distanceToBuyTrigger,
      distanceToSellTrigger,
      lastBuyTriggerTime: buyDate.toISOString(),
      lastSellTriggerTime: sellDate.toISOString(),
    };
  });
}

// ── Main generator ──

function generateIndexArbitrageData(): IndexArbitrageResponse {
  const rng = seededRandom('index-arbitrage');

  const indexFuturesBasis = generateIndexFuturesBasis(rng);
  const etfPremiumDiscount = generateETFPremiumDiscount(rng);
  const arbitrageOpportunities = generateArbitrageOpportunities(rng);
  const historicalBasis = generateHistoricalBasis(rng);
  const crossListedArbitrage = generateCrossListedArbitrage(rng);
  const programTradingSignals = generateProgramTradingSignals(rng);

  return {
    indexFuturesBasis,
    etfPremiumDiscount,
    arbitrageOpportunities,
    historicalBasis,
    crossListedArbitrage,
    programTradingSignals,
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

    const data = generateIndexArbitrageData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[IndexArbitrage] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate index arbitrage monitor data' });
  }
});

export default router;
