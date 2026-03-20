import { Router } from 'express';

const router = Router();

// ── Deterministic seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function seededRng(tag: string) {
  const day = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + day));
}

// ── Helpers ──

const round2 = (v: number) => Math.round(v * 100) / 100;
const round1 = (v: number) => Math.round(v * 10) / 10;

// ── Types ──

interface AssetClassFlow {
  assetClass: string;
  weeklyFlow: number;
  monthlyFlow: number;
  quarterlyFlow: number;
  ytdFlow: number;
  aum: number;
  flowPctOfAUM: number;
  streakWeeks: number;
  streakDirection: 'inflow' | 'outflow';
}

interface RegionalFlow {
  region: string;
  weeklyFlow: number;
  monthlyFlow: number;
  ytdFlow: number;
  pctOfGlobal: number;
  trend: 'accelerating' | 'decelerating' | 'stable' | 'reversing';
}

interface ETFvsMutualFundFlow {
  vehicleType: 'ETF' | 'Mutual Fund';
  weeklyFlow: number;
  monthlyFlow: number;
  ytdFlow: number;
  totalAUM: number;
  marketShare: number;
  netCreationRedemption: number;
}

interface TopFundFlow {
  rank: number;
  fundName: string;
  ticker: string;
  category: string;
  weeklyFlow: number;
  aum: number;
  flowPctOfAUM: number;
}

interface HistoricalFlowWeek {
  weekEnding: string;
  equity: number;
  fixedIncome: number;
  moneyMarket: number;
  commodity: number;
  alternative: number;
  totalNet: number;
}

interface SectorRotationSignal {
  sector: string;
  weeklyFlow: number;
  monthlyFlow: number;
  threeMonthFlow: number;
  momentum: 'accelerating' | 'decelerating' | 'reversing';
  relativeStrength: number;
  signal: 'OVERWEIGHT' | 'UNDERWEIGHT' | 'NEUTRAL';
}

interface ContrarianIndicator {
  indicator: string;
  description: string;
  currentReading: number;
  historicalPercentile: number;
  signal: 'EXTREME_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'EXTREME_BEARISH';
  historicalHitRate: number;
  lookbackPeriod: string;
}

interface FundFlowTrackerData {
  assetClassFlows: AssetClassFlow[];
  regionalFlows: RegionalFlow[];
  etfVsMutualFund: ETFvsMutualFundFlow[];
  topInflows: TopFundFlow[];
  topOutflows: TopFundFlow[];
  historicalSeries: HistoricalFlowWeek[];
  sectorRotation: SectorRotationSignal[];
  contrarianIndicators: ContrarianIndicator[];
  summary: {
    totalWeeklyNetFlow: number;
    dominantDirection: 'RISK-ON' | 'RISK-OFF' | 'MIXED';
    topInflowAssetClass: string;
    topOutflowAssetClass: string;
    etfShareOfFlows: number;
    extremeSignalsCount: number;
  };
  timestamp: string;
}

// ── Static Definitions ──

interface AssetClassDef {
  assetClass: string;
  baseWeekly: number;
  baseAUM: number;
  volatility: number;
  streakDir: 'inflow' | 'outflow';
  baseStreak: number;
}

const ASSET_CLASS_DEFS: AssetClassDef[] = [
  { assetClass: 'Equity', baseWeekly: 9.4, baseAUM: 28.6, volatility: 4.5, streakDir: 'inflow', baseStreak: 7 },
  { assetClass: 'Fixed Income', baseWeekly: 5.8, baseAUM: 14.2, volatility: 3.2, streakDir: 'inflow', baseStreak: 14 },
  { assetClass: 'Money Market', baseWeekly: 14.2, baseAUM: 6.9, volatility: 8.0, streakDir: 'inflow', baseStreak: 22 },
  { assetClass: 'Commodity', baseWeekly: -1.1, baseAUM: 0.45, volatility: 1.8, streakDir: 'outflow', baseStreak: 5 },
  { assetClass: 'Alternative', baseWeekly: 0.7, baseAUM: 0.98, volatility: 1.2, streakDir: 'inflow', baseStreak: 3 },
];

interface RegionalDef {
  region: string;
  baseWeekly: number;
  basePctGlobal: number;
  volatility: number;
}

const REGIONAL_DEFS: RegionalDef[] = [
  { region: 'US', baseWeekly: 13.8, basePctGlobal: 48.5, volatility: 5.5 },
  { region: 'Europe', baseWeekly: 3.4, basePctGlobal: 18.2, volatility: 2.8 },
  { region: 'Asia', baseWeekly: 2.1, basePctGlobal: 15.6, volatility: 2.5 },
  { region: 'EM', baseWeekly: -1.8, basePctGlobal: 9.4, volatility: 2.2 },
  { region: 'Global', baseWeekly: 4.5, basePctGlobal: 8.3, volatility: 2.0 },
];

interface TopFundDef {
  fundName: string;
  ticker: string;
  category: string;
  baseFlow: number;
  baseAUM: number;
}

const TOP_INFLOW_DEFS: TopFundDef[] = [
  { fundName: 'Vanguard S&P 500 ETF', ticker: 'VOO', category: 'US Equity', baseFlow: 4.25, baseAUM: 435 },
  { fundName: 'iShares Core S&P 500 ETF', ticker: 'IVV', category: 'US Equity', baseFlow: 3.18, baseAUM: 412 },
  { fundName: 'Vanguard Total Bond Market ETF', ticker: 'BND', category: 'US Fixed Income', baseFlow: 2.64, baseAUM: 108 },
  { fundName: 'SPDR S&P 500 ETF Trust', ticker: 'SPY', category: 'US Equity', baseFlow: 2.31, baseAUM: 523 },
  { fundName: 'iShares Core US Aggregate Bond ETF', ticker: 'AGG', category: 'US Fixed Income', baseFlow: 1.85, baseAUM: 112 },
  { fundName: 'Vanguard Total Stock Market ETF', ticker: 'VTI', category: 'US Equity', baseFlow: 1.72, baseAUM: 386 },
  { fundName: 'Invesco QQQ Trust', ticker: 'QQQ', category: 'US Equity', baseFlow: 1.54, baseAUM: 265 },
  { fundName: 'Schwab US Large-Cap ETF', ticker: 'SCHX', category: 'US Equity', baseFlow: 1.28, baseAUM: 42 },
  { fundName: 'iShares MSCI EAFE ETF', ticker: 'EFA', category: 'Intl Equity', baseFlow: 0.98, baseAUM: 78 },
  { fundName: 'Vanguard FTSE Developed Markets ETF', ticker: 'VEA', category: 'Intl Equity', baseFlow: 0.85, baseAUM: 118 },
];

const TOP_OUTFLOW_DEFS: TopFundDef[] = [
  { fundName: 'iShares MSCI Emerging Markets ETF', ticker: 'EEM', category: 'EM Equity', baseFlow: -1.92, baseAUM: 22 },
  { fundName: 'SPDR Bloomberg High Yield Bond ETF', ticker: 'JNK', category: 'High Yield', baseFlow: -1.54, baseAUM: 8.2 },
  { fundName: 'ARK Innovation ETF', ticker: 'ARKK', category: 'Thematic', baseFlow: -1.28, baseAUM: 6.8 },
  { fundName: 'iShares China Large-Cap ETF', ticker: 'FXI', category: 'China Equity', baseFlow: -0.98, baseAUM: 5.4 },
  { fundName: 'Energy Select Sector SPDR Fund', ticker: 'XLE', category: 'Sector - Energy', baseFlow: -0.87, baseAUM: 38 },
  { fundName: 'iShares 20+ Year Treasury Bond ETF', ticker: 'TLT', category: 'Long Duration', baseFlow: -0.76, baseAUM: 55 },
  { fundName: 'iShares Russell 2000 ETF', ticker: 'IWM', category: 'US Small Cap', baseFlow: -0.68, baseAUM: 68 },
  { fundName: 'VanEck Gold Miners ETF', ticker: 'GDX', category: 'Commodity', baseFlow: -0.52, baseAUM: 12.7 },
  { fundName: 'iShares MSCI Brazil ETF', ticker: 'EWZ', category: 'EM - Brazil', baseFlow: -0.45, baseAUM: 4.9 },
  { fundName: 'Vanguard Real Estate ETF', ticker: 'VNQ', category: 'Real Estate', baseFlow: -0.38, baseAUM: 32 },
];

interface SectorDef {
  sector: string;
  baseWeekly: number;
  volatility: number;
  baseRS: number;
}

const SECTOR_DEFS: SectorDef[] = [
  { sector: 'Technology', baseWeekly: 3.4, volatility: 1.8, baseRS: 1.14 },
  { sector: 'Healthcare', baseWeekly: 1.5, volatility: 1.1, baseRS: 1.06 },
  { sector: 'Energy', baseWeekly: -1.2, volatility: 1.4, baseRS: 0.88 },
  { sector: 'Financials', baseWeekly: 1.3, volatility: 1.2, baseRS: 1.07 },
  { sector: 'Consumer Discretionary', baseWeekly: 0.4, volatility: 1.0, baseRS: 0.96 },
  { sector: 'Consumer Staples', baseWeekly: 0.6, volatility: 0.7, baseRS: 0.98 },
  { sector: 'Industrials', baseWeekly: 0.9, volatility: 0.9, baseRS: 1.03 },
  { sector: 'Materials', baseWeekly: -0.3, volatility: 0.8, baseRS: 0.91 },
  { sector: 'Utilities', baseWeekly: 0.5, volatility: 0.6, baseRS: 0.94 },
  { sector: 'Real Estate', baseWeekly: -0.7, volatility: 0.9, baseRS: 0.85 },
  { sector: 'Communication Services', baseWeekly: 1.1, volatility: 1.0, baseRS: 1.05 },
];

interface ContrarianDef {
  indicator: string;
  description: string;
  baseReading: number;
  basePercentile: number;
  readingVolatility: number;
  implication: 'bullish' | 'bearish' | 'neutral';
  hitRate: number;
  lookbackPeriod: string;
}

const CONTRARIAN_DEFS: ContrarianDef[] = [
  {
    indicator: 'Equity Fund Flow Z-Score',
    description: 'Cumulative equity fund flows relative to 52-week mean, normalized by standard deviation. Extreme negative readings historically precede equity rallies.',
    baseReading: -1.8,
    basePercentile: 12,
    readingVolatility: 0.8,
    implication: 'bullish',
    hitRate: 76,
    lookbackPeriod: '52 weeks',
  },
  {
    indicator: 'Money Market Allocation Ratio',
    description: 'Money market assets as percentage of total equity + money market AUM. Spikes above 90th percentile signal peak fear and contrarian buy opportunity.',
    baseReading: 18.4,
    basePercentile: 85,
    readingVolatility: 3.0,
    implication: 'bearish',
    hitRate: 68,
    lookbackPeriod: '5 years',
  },
  {
    indicator: 'EM Capitulation Index',
    description: 'EM equity fund outflows as multiple of trailing 12-month average. Readings below -2.5x have historically marked EM bottoms within 2 months.',
    baseReading: -2.1,
    basePercentile: 8,
    readingVolatility: 0.6,
    implication: 'bullish',
    hitRate: 72,
    lookbackPeriod: '10 years',
  },
  {
    indicator: 'Bond-Equity Rotation Velocity',
    description: 'Rate of change of bond-to-equity flow ratio over 4 weeks. Sharp acceleration into bonds signals late-cycle risk aversion.',
    baseReading: 1.6,
    basePercentile: 78,
    readingVolatility: 0.5,
    implication: 'bearish',
    hitRate: 64,
    lookbackPeriod: '3 years',
  },
  {
    indicator: 'Passive Flow Dominance',
    description: 'Passive fund share of total weekly equity inflows. Above 90% signals crowded indexing and potential fragility in a correction.',
    baseReading: 86.5,
    basePercentile: 88,
    readingVolatility: 4.0,
    implication: 'neutral',
    hitRate: 58,
    lookbackPeriod: '5 years',
  },
  {
    indicator: 'Sector Dispersion Score',
    description: 'Cross-sectional standard deviation of sector-level weekly flows. High dispersion signals strong conviction rotation; low dispersion signals indiscriminate buying/selling.',
    baseReading: 2.4,
    basePercentile: 65,
    readingVolatility: 0.8,
    implication: 'neutral',
    hitRate: 55,
    lookbackPeriod: '2 years',
  },
  {
    indicator: 'Leveraged Bull/Bear Ratio',
    description: 'Ratio of leveraged long ETF inflows to leveraged short ETF inflows. Extreme bullish positioning (>4x) has preceded 5-10% drawdowns 70% of the time.',
    baseReading: 3.2,
    basePercentile: 74,
    readingVolatility: 1.0,
    implication: 'bearish',
    hitRate: 70,
    lookbackPeriod: '3 years',
  },
];

// ── Cache ──

let cache: { data: FundFlowTrackerData | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 12 * 60 * 60_000;

// ── Data Generation ──

function generateAssetClassFlows(rng: () => number): AssetClassFlow[] {
  return ASSET_CLASS_DEFS.map((def) => {
    const jitter = (rng() - 0.5) * def.volatility * 2;
    const weeklyFlow = round2(def.baseWeekly + jitter);
    const monthlyFlow = round2(weeklyFlow * (3.5 + rng() * 1.5));
    const quarterlyFlow = round2(monthlyFlow * (2.5 + rng() * 1.0));
    const ytdFlow = round2(quarterlyFlow * (1.5 + rng() * 1.5));
    const aum = round2(def.baseAUM * (1 + (rng() - 0.5) * 0.06));
    const flowPctOfAUM = round2((weeklyFlow / (aum * 1000)) * 100);
    const streakJitter = Math.floor((rng() - 0.5) * 6);
    const streakWeeks = Math.max(1, def.baseStreak + streakJitter);

    return {
      assetClass: def.assetClass,
      weeklyFlow,
      monthlyFlow,
      quarterlyFlow,
      ytdFlow,
      aum,
      flowPctOfAUM,
      streakWeeks,
      streakDirection: def.streakDir,
    };
  });
}

function generateRegionalFlows(rng: () => number): RegionalFlow[] {
  const TREND_OPTIONS: RegionalFlow['trend'][] = ['accelerating', 'decelerating', 'stable', 'reversing'];

  const entries = REGIONAL_DEFS.map((def) => {
    const jitter = (rng() - 0.5) * def.volatility * 2;
    const weeklyFlow = round2(def.baseWeekly + jitter);
    const monthlyFlow = round2(weeklyFlow * (3.8 + rng() * 1.2));
    const ytdFlow = round2(monthlyFlow * (3.0 + rng() * 2.0));
    const pctJitter = (rng() - 0.5) * 3;
    const pctOfGlobal = round1(Math.max(1, def.basePctGlobal + pctJitter));

    const trendRoll = rng();
    let trend: RegionalFlow['trend'];
    if (weeklyFlow > 2) {
      trend = trendRoll < 0.5 ? 'accelerating' : trendRoll < 0.8 ? 'stable' : 'decelerating';
    } else if (weeklyFlow < -1) {
      trend = trendRoll < 0.4 ? 'decelerating' : trendRoll < 0.7 ? 'reversing' : 'stable';
    } else {
      trend = TREND_OPTIONS[Math.floor(trendRoll * TREND_OPTIONS.length)];
    }

    return { region: def.region, weeklyFlow, monthlyFlow, ytdFlow, pctOfGlobal, trend };
  });

  // Normalize pctOfGlobal to sum to 100
  const totalPct = entries.reduce((s, e) => s + e.pctOfGlobal, 0);
  entries.forEach((e) => {
    e.pctOfGlobal = round1((e.pctOfGlobal / totalPct) * 100);
  });

  return entries;
}

function generateETFvsMutualFund(rng: () => number): ETFvsMutualFundFlow[] {
  // ETF flows
  const etfWeekly = round2(16.5 + (rng() - 0.5) * 8);
  const etfMonthly = round2(etfWeekly * (3.8 + rng() * 1.2));
  const etfYtd = round2(etfMonthly * (3.0 + rng() * 2.0));
  const etfAUM = round2(8.2 * (1 + (rng() - 0.5) * 0.06));
  const etfCreation = Math.round(4500 + (rng() - 0.5) * 2000);

  // Mutual fund flows - typically net negative as money shifts to ETFs
  const mfWeekly = round2(-5.2 + (rng() - 0.5) * 6);
  const mfMonthly = round2(mfWeekly * (3.5 + rng() * 1.5));
  const mfYtd = round2(mfMonthly * (3.0 + rng() * 2.0));
  const mfAUM = round2(19.8 * (1 + (rng() - 0.5) * 0.04));
  const mfRedemption = Math.round(-2800 + (rng() - 0.5) * 1500);

  const totalAUM = etfAUM + mfAUM;
  const etfShare = round1((etfAUM / totalAUM) * 100);
  const mfShare = round1(100 - etfShare);

  return [
    {
      vehicleType: 'ETF',
      weeklyFlow: etfWeekly,
      monthlyFlow: etfMonthly,
      ytdFlow: etfYtd,
      totalAUM: etfAUM,
      marketShare: etfShare,
      netCreationRedemption: etfCreation,
    },
    {
      vehicleType: 'Mutual Fund',
      weeklyFlow: mfWeekly,
      monthlyFlow: mfMonthly,
      ytdFlow: mfYtd,
      totalAUM: mfAUM,
      marketShare: mfShare,
      netCreationRedemption: mfRedemption,
    },
  ];
}

function generateTopFunds(
  rng: () => number,
  defs: TopFundDef[],
  isOutflow: boolean
): TopFundFlow[] {
  return defs
    .map((def, idx) => {
      const flowJitter = 1 + (rng() - 0.5) * 0.6;
      const weeklyFlow = round2(def.baseFlow * flowJitter);
      const aum = round2(def.baseAUM * (1 + (rng() - 0.5) * 0.08));
      const flowPctOfAUM = round2((Math.abs(weeklyFlow) / aum) * 100);

      return {
        rank: idx + 1,
        fundName: def.fundName,
        ticker: def.ticker,
        category: def.category,
        weeklyFlow,
        aum,
        flowPctOfAUM,
      };
    })
    .sort((a, b) =>
      isOutflow ? a.weeklyFlow - b.weeklyFlow : b.weeklyFlow - a.weeklyFlow
    )
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

function generateHistoricalSeries(rng: () => number): HistoricalFlowWeek[] {
  const weeks: HistoricalFlowWeek[] = [];
  const today = new Date();

  // Base levels for each asset class
  let eqBase = 8.5;
  let fiBase = 5.2;
  let mmBase = 12.8;
  let coBase = -0.9;
  let altBase = 0.6;

  for (let w = 11; w >= 0; w--) {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - w * 7);
    const weekEnding = weekEnd.toISOString().slice(0, 10);

    // Apply random walk with mean reversion
    eqBase = round2(eqBase + (rng() - 0.48) * 4.0);
    fiBase = round2(fiBase + (rng() - 0.48) * 2.8);
    mmBase = round2(mmBase + (rng() - 0.48) * 6.0);
    coBase = round2(coBase + (rng() - 0.50) * 1.5);
    altBase = round2(altBase + (rng() - 0.49) * 1.0);

    const equity = eqBase;
    const fixedIncome = fiBase;
    const moneyMarket = mmBase;
    const commodity = coBase;
    const alternative = altBase;
    const totalNet = round2(equity + fixedIncome + moneyMarket + commodity + alternative);

    weeks.push({
      weekEnding,
      equity,
      fixedIncome,
      moneyMarket,
      commodity,
      alternative,
      totalNet,
    });
  }

  return weeks;
}

function generateSectorRotation(rng: () => number): SectorRotationSignal[] {
  return SECTOR_DEFS.map((def) => {
    const jitter1W = (rng() - 0.5) * def.volatility * 2;
    const weeklyFlow = round2(def.baseWeekly + jitter1W);
    const monthlyFlow = round2(weeklyFlow * (3.5 + rng() * 1.5));
    const threeMonthFlow = round2(monthlyFlow * (2.5 + rng() * 1.0));

    const rsJitter = (rng() - 0.5) * 0.12;
    const relativeStrength = round2(def.baseRS + rsJitter);

    // Determine momentum based on weekly vs monthly direction alignment
    let momentum: SectorRotationSignal['momentum'];
    if (Math.sign(weeklyFlow) === Math.sign(monthlyFlow) && Math.abs(weeklyFlow) > Math.abs(monthlyFlow) / 4) {
      momentum = 'accelerating';
    } else if (Math.sign(weeklyFlow) !== Math.sign(monthlyFlow)) {
      momentum = 'reversing';
    } else {
      momentum = 'decelerating';
    }

    // Determine signal from relative strength and flow direction
    let signal: SectorRotationSignal['signal'];
    if (relativeStrength > 1.04 && weeklyFlow > 0) {
      signal = 'OVERWEIGHT';
    } else if (relativeStrength < 0.94 || weeklyFlow < -0.5) {
      signal = 'UNDERWEIGHT';
    } else {
      signal = 'NEUTRAL';
    }

    return {
      sector: def.sector,
      weeklyFlow,
      monthlyFlow,
      threeMonthFlow,
      momentum,
      relativeStrength,
      signal,
    };
  });
}

function generateContrarianIndicators(rng: () => number): ContrarianIndicator[] {
  return CONTRARIAN_DEFS.map((def) => {
    const readingJitter = (rng() - 0.5) * def.readingVolatility * 2;
    const currentReading = round2(def.baseReading + readingJitter);

    const pctJitter = Math.floor((rng() - 0.5) * 16);
    const historicalPercentile = Math.max(1, Math.min(99, def.basePercentile + pctJitter));

    const hrJitter = Math.floor((rng() - 0.5) * 8);
    const historicalHitRate = Math.max(40, Math.min(95, def.hitRate + hrJitter));

    // Determine signal from percentile and implication direction
    let signal: ContrarianIndicator['signal'];
    if (def.implication === 'bullish') {
      if (historicalPercentile <= 10) signal = 'EXTREME_BULLISH';
      else if (historicalPercentile <= 25) signal = 'BULLISH';
      else if (historicalPercentile <= 75) signal = 'NEUTRAL';
      else if (historicalPercentile <= 90) signal = 'BEARISH';
      else signal = 'EXTREME_BEARISH';
    } else if (def.implication === 'bearish') {
      if (historicalPercentile >= 90) signal = 'EXTREME_BEARISH';
      else if (historicalPercentile >= 75) signal = 'BEARISH';
      else if (historicalPercentile >= 25) signal = 'NEUTRAL';
      else if (historicalPercentile >= 10) signal = 'BULLISH';
      else signal = 'EXTREME_BULLISH';
    } else {
      if (historicalPercentile >= 90 || historicalPercentile <= 10) {
        signal = historicalPercentile >= 90 ? 'EXTREME_BEARISH' : 'EXTREME_BULLISH';
      } else {
        signal = 'NEUTRAL';
      }
    }

    return {
      indicator: def.indicator,
      description: def.description,
      currentReading,
      historicalPercentile,
      signal,
      historicalHitRate,
      lookbackPeriod: def.lookbackPeriod,
    };
  });
}

function generateData(): FundFlowTrackerData {
  const rng = seededRng('fund-flow-tracker');

  const assetClassFlows = generateAssetClassFlows(rng);
  const regionalFlows = generateRegionalFlows(rng);
  const etfVsMutualFund = generateETFvsMutualFund(rng);
  const topInflows = generateTopFunds(rng, TOP_INFLOW_DEFS, false);
  const topOutflows = generateTopFunds(rng, TOP_OUTFLOW_DEFS, true);
  const historicalSeries = generateHistoricalSeries(rng);
  const sectorRotation = generateSectorRotation(rng);
  const contrarianIndicators = generateContrarianIndicators(rng);

  // Summary
  const totalWeeklyNetFlow = round2(
    assetClassFlows.reduce((s, a) => s + a.weeklyFlow, 0)
  );

  const sorted = [...assetClassFlows].sort((a, b) => b.weeklyFlow - a.weeklyFlow);
  const topInflowAssetClass = sorted[0].assetClass;
  const topOutflowAssetClass = sorted[sorted.length - 1].assetClass;

  const etfRow = etfVsMutualFund.find((e) => e.vehicleType === 'ETF')!;
  const totalWeeklyAbsFlow =
    Math.abs(etfVsMutualFund[0].weeklyFlow) + Math.abs(etfVsMutualFund[1].weeklyFlow);
  const etfShareOfFlows =
    totalWeeklyAbsFlow > 0
      ? round1((Math.abs(etfRow.weeklyFlow) / totalWeeklyAbsFlow) * 100)
      : 50;

  const extremeSignalsCount = contrarianIndicators.filter(
    (c) => c.signal === 'EXTREME_BULLISH' || c.signal === 'EXTREME_BEARISH'
  ).length;

  let dominantDirection: 'RISK-ON' | 'RISK-OFF' | 'MIXED';
  if (totalWeeklyNetFlow > 15 && extremeSignalsCount <= 1) {
    dominantDirection = 'RISK-ON';
  } else if (totalWeeklyNetFlow < -5 || extremeSignalsCount >= 3) {
    dominantDirection = 'RISK-OFF';
  } else {
    dominantDirection = 'MIXED';
  }

  return {
    assetClassFlows,
    regionalFlows,
    etfVsMutualFund,
    topInflows,
    topOutflows,
    historicalSeries,
    sectorRotation,
    contrarianIndicators,
    summary: {
      totalWeeklyNetFlow,
      dominantDirection,
      topInflowAssetClass,
      topOutflowAssetClass,
      etfShareOfFlows,
      extremeSignalsCount,
    },
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }
    const data = generateData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FundFlowTracker] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(502).json({ error: 'Failed to generate fund flow tracker data' });
  }
});

export default router;
