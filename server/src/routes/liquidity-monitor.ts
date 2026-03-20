import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface CentralBankLiquidity {
  fedBalanceSheetTrn: number;
  ecbBalanceSheetTrn: number;
  bojBalanceSheetTrn: number;
  pbocBalanceSheetTrn: number;
  fedRRPBln: number;
  fedTGABln: number;
  netLiquidityTrn: number;
}

interface MoneyMarkets {
  sofrPct: number;
  effrPct: number;
  overnightRepoPct: number;
  triPartyRepoPct: number;
  gcfRepoPct: number;
  commercialPaper3MPct: number;
  tbill3MPct: number;
  fedFundsVolumeBln: number;
}

type SurveySignal = 'tightening' | 'easing' | 'unchanged';
type FCISignal = 'loose' | 'neutral' | 'tight';

interface CreditConditions {
  seniorLoanOfficerSurvey: SurveySignal;
  igCorporateIssuance1MBln: number;
  hyIssuance1MBln: number;
  leveragedLoanIssuance1MBln: number;
  financialConditionsIndex: FCISignal;
}

interface MarketLiquidityAsset {
  asset: string;
  bidAskSpread: number;
  depthMln: number;
  volumeVsAvgPct: number;
  liquidityScore: number;
}

interface StressIndicators {
  tedSpreadBps: number;
  liborOISBps: number;
  crossCurrencyBasisEURBps: number;
  fxSwapBasisBps: number;
  commercialPaperOISBps: number;
  bankCDSAvgBps: number;
}

interface FlowOfFunds {
  bankReservesTrn: number;
  excessReservesTrn: number;
  moneySupplyM2Trn: number;
  m2GrowthPct: number;
  bankLendingTrn: number;
  lendingGrowthPct: number;
}

interface CollateralMarket {
  treasuryCollateralRatePct: number;
  failsToDeliverBln: number;
  specialnessAvgBps: number;
  shortInterestTreasuryPct: number;
}

type OverallLiquidity = 'ample' | 'adequate' | 'tight' | 'stressed';
type LiquidityTrend = 'improving' | 'stable' | 'deteriorating';

interface LiquiditySummary {
  overallLiquidity: OverallLiquidity;
  fedNetLiquidityTrn: number;
  liquidityTrend: LiquidityTrend;
  primaryRisk: string;
  keyMetric: string;
}

interface LiquidityMonitorData {
  centralBankLiquidity: CentralBankLiquidity;
  moneyMarkets: MoneyMarkets;
  creditConditions: CreditConditions;
  marketLiquidity: MarketLiquidityAsset[];
  stressIndicators: StressIndicators;
  flowOfFunds: FlowOfFunds;
  collateralMarket: CollateralMarket;
  summary: LiquiditySummary;
  generatedAt: string;
}

// ── Seed Data ──

const MARKET_LIQUIDITY_DEFS = [
  { asset: 'SPX Futures',  bidAsk: 0.25, depth: 320, volAvg: 105 },
  { asset: '10Y Treasury', bidAsk: 0.015, depth: 480, volAvg: 98 },
  { asset: 'EUR/USD',      bidAsk: 0.0001, depth: 620, volAvg: 102 },
  { asset: 'Gold',         bidAsk: 0.30, depth: 180, volAvg: 112 },
  { asset: 'IG Corps',     bidAsk: 0.8, depth: 45, volAvg: 88 },
  { asset: 'HY Corps',     bidAsk: 1.5, depth: 22, volAvg: 76 },
  { asset: 'EM Bonds',     bidAsk: 2.2, depth: 15, volAvg: 82 },
  { asset: 'Crypto',       bidAsk: 0.05, depth: 95, volAvg: 135 },
] as const;

const PRIMARY_RISKS = [
  'Fed balance sheet runoff accelerating',
  'TGA rebuild draining reserves',
  'Money market fund reallocation',
  'Reverse repo facility drawdown stalling',
  'Cross-currency funding stress widening',
  'Commercial paper rollover risk elevated',
  'Bank reserve scarcity approaching threshold',
  'Treasury issuance surge absorbing liquidity',
] as const;

const KEY_METRICS = [
  'Net liquidity declining $15B/week on average',
  'Bank reserves approaching $3T minimum comfort level',
  'SOFR-EFFR spread stable near zero',
  'RRP usage at lowest level since 2021',
  'M2 growth turning positive after 18-month contraction',
  'IG corporate issuance at 3-year high',
  'Treasury fails-to-deliver above $200B threshold',
  'Fed funds volume elevated above $100B',
] as const;

const SURVEY_SIGNALS: SurveySignal[] = ['tightening', 'easing', 'unchanged'];
const FCI_SIGNALS: FCISignal[] = ['loose', 'neutral', 'tight'];
const OVERALL_LIQUIDITY: OverallLiquidity[] = ['ample', 'adequate', 'tight', 'stressed'];
const LIQUIDITY_TRENDS: LiquidityTrend[] = ['improving', 'stable', 'deteriorating'];
let cache: { data: LiquidityMonitorData; ts: number } | null = null;

// ── Data Generation ──

function generate(): LiquidityMonitorData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-liquidity-monitor'));

  const jitter = (base: number, spread: number) => base + (rng() - 0.5) * 2 * spread;
  const jitterPct = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round = (v: number, decimals = 2) =>
    Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // 1. Central Bank Liquidity
  const fedBS = round(jitterPct(7.0, 0.04));
  const ecbBS = round(jitterPct(6.4, 0.04));
  const bojBS = round(jitterPct(5.0, 0.04));
  const pbocBS = round(jitterPct(5.8, 0.04));
  const fedRRP = round(jitterPct(500, 0.20), 1);
  const fedTGA = round(jitterPct(700, 0.15), 1);
  const netLiquidity = round(fedBS - fedRRP / 1000 - fedTGA / 1000);

  const centralBankLiquidity: CentralBankLiquidity = {
    fedBalanceSheetTrn: fedBS,
    ecbBalanceSheetTrn: ecbBS,
    bojBalanceSheetTrn: bojBS,
    pbocBalanceSheetTrn: pbocBS,
    fedRRPBln: fedRRP,
    fedTGABln: fedTGA,
    netLiquidityTrn: netLiquidity,
  };

  // 2. Money Markets
  const sofrBase = 4.30;
  const moneyMarkets: MoneyMarkets = {
    sofrPct: round(jitter(sofrBase, 0.08)),
    effrPct: round(jitter(4.33, 0.06)),
    overnightRepoPct: round(jitter(4.28, 0.10)),
    triPartyRepoPct: round(jitter(4.30, 0.08)),
    gcfRepoPct: round(jitter(4.32, 0.10)),
    commercialPaper3MPct: round(jitter(4.45, 0.12)),
    tbill3MPct: round(jitter(4.25, 0.10)),
    fedFundsVolumeBln: round(jitterPct(95, 0.15), 1),
  };

  // 3. Credit Conditions
  const creditConditions: CreditConditions = {
    seniorLoanOfficerSurvey: pick(SURVEY_SIGNALS),
    igCorporateIssuance1MBln: round(jitterPct(145, 0.15), 1),
    hyIssuance1MBln: round(jitterPct(32, 0.20), 1),
    leveragedLoanIssuance1MBln: round(jitterPct(48, 0.18), 1),
    financialConditionsIndex: pick(FCI_SIGNALS),
  };

  // 4. Market Liquidity (8 assets)
  const marketLiquidity: MarketLiquidityAsset[] = MARKET_LIQUIDITY_DEFS.map(def => {
    const bidAskSpread = round(jitterPct(def.bidAsk, 0.20), def.bidAsk < 0.01 ? 5 : def.bidAsk < 1 ? 3 : 2);
    const depth = round(jitterPct(def.depth, 0.15), 1);
    const volumeVsAvg = round(jitterPct(def.volAvg, 0.12), 1);
    const liquidityScore = round(clamp(jitter(7, 2.5), 1, 10), 1);
    return {
      asset: def.asset,
      bidAskSpread,
      depthMln: depth,
      volumeVsAvgPct: volumeVsAvg,
      liquidityScore,
    };
  });

  // 5. Stress Indicators
  const stressIndicators: StressIndicators = {
    tedSpreadBps: round(jitter(25, 10), 1),
    liborOISBps: round(jitter(12, 5), 1),
    crossCurrencyBasisEURBps: round(jitter(-15, 8), 1),
    fxSwapBasisBps: round(jitter(-10, 6), 1),
    commercialPaperOISBps: round(jitter(18, 7), 1),
    bankCDSAvgBps: round(jitter(55, 15), 1),
  };

  // 6. Flow of Funds
  const bankReserves = round(jitterPct(3.2, 0.06));
  const excessReserves = round(jitterPct(2.8, 0.08));
  const m2 = round(jitterPct(21.0, 0.03), 1);
  const m2Growth = round(jitter(3.5, 1.5), 1);
  const bankLending = round(jitterPct(12.4, 0.04), 1);
  const lendingGrowth = round(jitter(2.1, 1.2), 1);

  const flowOfFunds: FlowOfFunds = {
    bankReservesTrn: bankReserves,
    excessReservesTrn: excessReserves,
    moneySupplyM2Trn: m2,
    m2GrowthPct: m2Growth,
    bankLendingTrn: bankLending,
    lendingGrowthPct: lendingGrowth,
  };

  // 7. Collateral Market
  const collateralMarket: CollateralMarket = {
    treasuryCollateralRatePct: round(jitter(4.28, 0.08)),
    failsToDeliverBln: round(jitterPct(180, 0.25), 1),
    specialnessAvgBps: round(jitter(8, 4), 1),
    shortInterestTreasuryPct: round(jitter(2.5, 0.8), 1),
  };

  // 8. Summary
  const summary: LiquiditySummary = {
    overallLiquidity: pick(OVERALL_LIQUIDITY),
    fedNetLiquidityTrn: netLiquidity,
    liquidityTrend: pick(LIQUIDITY_TRENDS),
    primaryRisk: pick(PRIMARY_RISKS),
    keyMetric: pick(KEY_METRICS),
  };

  return {
    centralBankLiquidity,
    moneyMarkets,
    creditConditions,
    marketLiquidity,
    stressIndicators,
    flowOfFunds,
    collateralMarket,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LiquidityMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate liquidity monitor data' });
  }
});

export default router;
