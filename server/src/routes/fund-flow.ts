import { Router } from 'express';

const router = Router();

// --- Seeded PRNG ---

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
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// --- Cache ---

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: FundFlowData | null = null;
let cacheTime = 0;

// --- Types ---

interface RegionFlow {
  flow1W: number;   // billions
  flow1M: number;
  flowYTD: number;
  cumulativeYTD: number;
  streak: number;   // positive = weeks of inflow, negative = weeks of outflow
}

interface FundEntry {
  fundName: string;
  ticker: string;
  category: string;
  aum: number;           // billions
  flow1W: number;        // billions
  flow1M: number;
  flowYTD: number;
  expenseRatio: number;  // percent
}

interface RetailVsInstitutional {
  retailEquityFlow: number;
  institutionalEquityFlow: number;
  retailBondFlow: number;
  institutionalBondFlow: number;
  retailSentiment: 'bullish' | 'neutral' | 'bearish';
  aaiiBullPercent: number;
}

interface MoneyMarketFlows {
  totalAUM: number;      // trillions
  flow1W: number;        // billions
  flow1M: number;
  govMoneyMarket: number;
  primeMoneyMarket: number;
  yieldAvg: number;      // percent
}

interface LeveragedPositioning {
  spxNetLong: number;       // percent
  nasdaqNetLong: number;
  bondNetLong: number;
  vixNetShort: number;
  goldNetLong: number;
}

interface FlowSummary {
  totalEquityFlow1W: number;
  totalBondFlow1W: number;
  equityVsBondRatio: number;
  riskAppetite: 'risk-on' | 'neutral' | 'risk-off';
  biggestInflow: string;
  biggestOutflow: string;
}

interface FundFlowData {
  equityFlows: Record<string, RegionFlow>;
  bondFlows: Record<string, RegionFlow>;
  alternativeFlows: Record<string, RegionFlow>;
  topFundInflows: FundEntry[];
  topFundOutflows: FundEntry[];
  retailVsInstitutional: RetailVsInstitutional;
  moneyMarketFlows: MoneyMarketFlows;
  leveragedPositioning: LeveragedPositioning;
  summary: FlowSummary;
  timestamp: string;
}

// --- Static Definitions ---

interface FlowCategoryDef {
  key: string;
  baseFlow1W: number;    // billions
  baseFlow1M: number;
  baseFlowYTD: number;
  baseCumulativeYTD: number;
  baseStreak: number;    // positive = inflow weeks, negative = outflow weeks
}

const EQUITY_FLOW_DEFS: FlowCategoryDef[] = [
  { key: 'us', baseFlow1W: 12.4, baseFlow1M: 48.2, baseFlowYTD: 185.6, baseCumulativeYTD: 215.3, baseStreak: 8 },
  { key: 'europe', baseFlow1W: 3.1, baseFlow1M: 11.8, baseFlowYTD: 42.5, baseCumulativeYTD: 58.7, baseStreak: 4 },
  { key: 'japan', baseFlow1W: 2.8, baseFlow1M: 10.5, baseFlowYTD: 38.2, baseCumulativeYTD: 45.1, baseStreak: 6 },
  { key: 'emergingMarkets', baseFlow1W: -1.9, baseFlow1M: -7.2, baseFlowYTD: -28.4, baseCumulativeYTD: -35.6, baseStreak: -5 },
  { key: 'china', baseFlow1W: -3.2, baseFlow1M: -12.8, baseFlowYTD: -52.1, baseCumulativeYTD: -64.3, baseStreak: -7 },
  { key: 'india', baseFlow1W: 1.5, baseFlow1M: 5.8, baseFlowYTD: 22.4, baseCumulativeYTD: 28.9, baseStreak: 3 },
];

const BOND_FLOW_DEFS: FlowCategoryDef[] = [
  { key: 'investmentGrade', baseFlow1W: 5.8, baseFlow1M: 22.4, baseFlowYTD: 95.2, baseCumulativeYTD: 112.5, baseStreak: 12 },
  { key: 'highYield', baseFlow1W: -1.4, baseFlow1M: -5.6, baseFlowYTD: -18.3, baseCumulativeYTD: -22.1, baseStreak: -3 },
  { key: 'government', baseFlow1W: 8.2, baseFlow1M: 31.5, baseFlowYTD: 128.4, baseCumulativeYTD: 148.6, baseStreak: 15 },
  { key: 'emergingMarketDebt', baseFlow1W: -0.8, baseFlow1M: -3.1, baseFlowYTD: -12.5, baseCumulativeYTD: -15.8, baseStreak: -4 },
  { key: 'municipals', baseFlow1W: 1.2, baseFlow1M: 4.6, baseFlowYTD: 18.9, baseCumulativeYTD: 23.2, baseStreak: 6 },
  { key: 'tips', baseFlow1W: 0.9, baseFlow1M: 3.4, baseFlowYTD: 14.2, baseCumulativeYTD: 17.8, baseStreak: 5 },
];

const ALTERNATIVE_FLOW_DEFS: FlowCategoryDef[] = [
  { key: 'commodities', baseFlow1W: 1.8, baseFlow1M: 6.9, baseFlowYTD: 28.5, baseCumulativeYTD: 34.2, baseStreak: 4 },
  { key: 'realEstate', baseFlow1W: -0.6, baseFlow1M: -2.4, baseFlowYTD: -9.8, baseCumulativeYTD: -12.1, baseStreak: -3 },
  { key: 'crypto', baseFlow1W: 2.1, baseFlow1M: 8.4, baseFlowYTD: 32.6, baseCumulativeYTD: 41.5, baseStreak: 5 },
  { key: 'hedgeFund', baseFlow1W: -0.4, baseFlow1M: -1.5, baseFlowYTD: -6.2, baseCumulativeYTD: -7.8, baseStreak: -2 },
  { key: 'privateCredit', baseFlow1W: 1.1, baseFlow1M: 4.2, baseFlowYTD: 17.8, baseCumulativeYTD: 21.3, baseStreak: 7 },
];

interface FundDef {
  fundName: string;
  ticker: string;
  category: string;
  baseAum: number;          // billions
  baseFlow1W: number;       // billions
  baseFlow1M: number;
  baseFlowYTD: number;
  expenseRatio: number;     // percent
}

const TOP_INFLOW_DEFS: FundDef[] = [
  { fundName: 'Vanguard S&P 500 ETF', ticker: 'VOO', category: 'US Large Cap', baseAum: 435, baseFlow1W: 4.2, baseFlow1M: 16.8, baseFlowYTD: 68.5, expenseRatio: 0.03 },
  { fundName: 'iShares Core S&P 500 ETF', ticker: 'IVV', category: 'US Large Cap', baseAum: 412, baseFlow1W: 3.8, baseFlow1M: 14.5, baseFlowYTD: 58.2, expenseRatio: 0.03 },
  { fundName: 'Vanguard Total Stock Market ETF', ticker: 'VTI', category: 'US Total Market', baseAum: 380, baseFlow1W: 3.1, baseFlow1M: 12.2, baseFlowYTD: 48.6, expenseRatio: 0.03 },
  { fundName: 'SPDR S&P 500 ETF Trust', ticker: 'SPY', category: 'US Large Cap', baseAum: 523, baseFlow1W: 2.8, baseFlow1M: 10.5, baseFlowYTD: 42.1, expenseRatio: 0.09 },
  { fundName: 'Vanguard Total Bond Market ETF', ticker: 'BND', category: 'US Aggregate Bond', baseAum: 108, baseFlow1W: 2.5, baseFlow1M: 9.8, baseFlowYTD: 38.4, expenseRatio: 0.03 },
  { fundName: 'iShares Core US Aggregate Bond ETF', ticker: 'AGG', category: 'US Aggregate Bond', baseAum: 112, baseFlow1W: 2.2, baseFlow1M: 8.6, baseFlowYTD: 34.2, expenseRatio: 0.03 },
  { fundName: 'Vanguard Total International Stock ETF', ticker: 'VXUS', category: 'International Equity', baseAum: 68, baseFlow1W: 1.9, baseFlow1M: 7.4, baseFlowYTD: 29.8, expenseRatio: 0.07 },
  { fundName: 'iShares 20+ Year Treasury Bond ETF', ticker: 'TLT', category: 'Long-Term Treasury', baseAum: 55, baseFlow1W: 1.7, baseFlow1M: 6.8, baseFlowYTD: 26.5, expenseRatio: 0.15 },
  { fundName: 'Invesco QQQ Trust', ticker: 'QQQ', category: 'US Large Cap Growth', baseAum: 265, baseFlow1W: 1.5, baseFlow1M: 5.8, baseFlowYTD: 22.4, expenseRatio: 0.20 },
  { fundName: 'Vanguard FTSE Developed Markets ETF', ticker: 'VEA', category: 'International Equity', baseAum: 118, baseFlow1W: 1.3, baseFlow1M: 5.2, baseFlowYTD: 20.1, expenseRatio: 0.05 },
  { fundName: 'SPDR Gold Shares', ticker: 'GLD', category: 'Commodities - Gold', baseAum: 62, baseFlow1W: 1.1, baseFlow1M: 4.4, baseFlowYTD: 17.6, expenseRatio: 0.40 },
  { fundName: 'Schwab US Broad Market ETF', ticker: 'SCHB', category: 'US Total Market', baseAum: 28, baseFlow1W: 0.9, baseFlow1M: 3.6, baseFlowYTD: 14.2, expenseRatio: 0.03 },
  { fundName: 'iShares MSCI EAFE ETF', ticker: 'EFA', category: 'International Equity', baseAum: 58, baseFlow1W: 0.8, baseFlow1M: 3.1, baseFlowYTD: 12.8, expenseRatio: 0.32 },
  { fundName: 'Vanguard Short-Term Bond ETF', ticker: 'BSV', category: 'Short-Term Bond', baseAum: 42, baseFlow1W: 0.7, baseFlow1M: 2.8, baseFlowYTD: 11.2, expenseRatio: 0.04 },
  { fundName: 'iShares Core MSCI Emerging Markets ETF', ticker: 'IEMG', category: 'Emerging Markets', baseAum: 72, baseFlow1W: 0.6, baseFlow1M: 2.4, baseFlowYTD: 9.8, expenseRatio: 0.09 },
];

const TOP_OUTFLOW_DEFS: FundDef[] = [
  { fundName: 'iShares MSCI Emerging Markets ETF', ticker: 'EEM', category: 'Emerging Markets', baseAum: 22, baseFlow1W: -1.9, baseFlow1M: -7.8, baseFlowYTD: -32.4, expenseRatio: 0.68 },
  { fundName: 'SPDR Bloomberg High Yield Bond ETF', ticker: 'JNK', category: 'High Yield Bond', baseAum: 8.2, baseFlow1W: -1.5, baseFlow1M: -6.2, baseFlowYTD: -25.8, expenseRatio: 0.40 },
  { fundName: 'ARK Innovation ETF', ticker: 'ARKK', category: 'Thematic Growth', baseAum: 6.8, baseFlow1W: -1.2, baseFlow1M: -4.8, baseFlowYTD: -19.5, expenseRatio: 0.75 },
  { fundName: 'Energy Select Sector SPDR Fund', ticker: 'XLE', category: 'Sector - Energy', baseAum: 38, baseFlow1W: -0.9, baseFlow1M: -3.6, baseFlowYTD: -14.8, expenseRatio: 0.09 },
  { fundName: 'iShares Russell 2000 ETF', ticker: 'IWM', category: 'US Small Cap', baseAum: 65, baseFlow1W: -0.8, baseFlow1M: -3.2, baseFlowYTD: -12.6, expenseRatio: 0.19 },
  { fundName: 'Financial Select Sector SPDR Fund', ticker: 'XLF', category: 'Sector - Financials', baseAum: 42, baseFlow1W: -0.7, baseFlow1M: -2.8, baseFlowYTD: -11.2, expenseRatio: 0.09 },
  { fundName: 'iShares MSCI China ETF', ticker: 'MCHI', category: 'China Equity', baseAum: 5.4, baseFlow1W: -0.6, baseFlow1M: -2.5, baseFlowYTD: -10.4, expenseRatio: 0.59 },
  { fundName: 'VanEck Gold Miners ETF', ticker: 'GDX', category: 'Gold Miners', baseAum: 14, baseFlow1W: -0.5, baseFlow1M: -2.1, baseFlowYTD: -8.6, expenseRatio: 0.51 },
  { fundName: 'iShares iBoxx $ High Yield Corp Bond ETF', ticker: 'HYG', category: 'High Yield Bond', baseAum: 18, baseFlow1W: -0.5, baseFlow1M: -1.9, baseFlowYTD: -7.8, expenseRatio: 0.49 },
  { fundName: 'Utilities Select Sector SPDR Fund', ticker: 'XLU', category: 'Sector - Utilities', baseAum: 16, baseFlow1W: -0.4, baseFlow1M: -1.7, baseFlowYTD: -6.9, expenseRatio: 0.09 },
  { fundName: 'iShares TIPS Bond ETF', ticker: 'TIP', category: 'TIPS', baseAum: 19, baseFlow1W: -0.4, baseFlow1M: -1.5, baseFlowYTD: -6.2, expenseRatio: 0.19 },
  { fundName: 'ProShares UltraPro QQQ', ticker: 'TQQQ', category: 'Leveraged', baseAum: 22, baseFlow1W: -0.3, baseFlow1M: -1.3, baseFlowYTD: -5.4, expenseRatio: 0.86 },
  { fundName: 'iShares MSCI Brazil ETF', ticker: 'EWZ', category: 'Brazil Equity', baseAum: 4.8, baseFlow1W: -0.3, baseFlow1M: -1.1, baseFlowYTD: -4.5, expenseRatio: 0.59 },
  { fundName: 'SPDR S&P Regional Banking ETF', ticker: 'KRE', category: 'Regional Banks', baseAum: 3.2, baseFlow1W: -0.2, baseFlow1M: -0.9, baseFlowYTD: -3.8, expenseRatio: 0.35 },
  { fundName: 'Global X Lithium & Battery Tech ETF', ticker: 'LIT', category: 'Thematic', baseAum: 2.1, baseFlow1W: -0.2, baseFlow1M: -0.8, baseFlowYTD: -3.2, expenseRatio: 0.75 },
];

// --- Generator ---

function generate(): FundFlowData {
  const seed = hashSeed('fund-flow-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  // Helper to generate a RegionFlow from a definition
  function buildRegionFlow(def: FlowCategoryDef): RegionFlow {
    const sign = def.baseFlow1W >= 0 ? 1 : -1;
    const flow1W = round2(sign * Math.abs(jitter(def.baseFlow1W, 0.3)));
    const flow1M = round2(sign * Math.abs(jitter(def.baseFlow1M, 0.25)));
    const flowYTD = round2(sign * Math.abs(jitter(def.baseFlowYTD, 0.15)));
    const cumulativeYTD = round2(sign * Math.abs(jitter(def.baseCumulativeYTD, 0.12)));
    const streakJitter = Math.floor(rng() * 5) - 2;
    const absStreak = Math.max(1, Math.abs(def.baseStreak) + streakJitter);
    const streak = def.baseStreak >= 0 ? absStreak : -absStreak;
    return { flow1W, flow1M, flowYTD, cumulativeYTD, streak };
  }

  // --- Equity Flows ---
  const equityFlows: Record<string, RegionFlow> = {};
  for (const def of EQUITY_FLOW_DEFS) {
    equityFlows[def.key] = buildRegionFlow(def);
  }

  // --- Bond Flows ---
  const bondFlows: Record<string, RegionFlow> = {};
  for (const def of BOND_FLOW_DEFS) {
    bondFlows[def.key] = buildRegionFlow(def);
  }

  // --- Alternative Flows ---
  const alternativeFlows: Record<string, RegionFlow> = {};
  for (const def of ALTERNATIVE_FLOW_DEFS) {
    alternativeFlows[def.key] = buildRegionFlow(def);
  }

  // --- Top Fund Inflows (15) ---
  const topFundInflows: FundEntry[] = TOP_INFLOW_DEFS.map(f => ({
    fundName: f.fundName,
    ticker: f.ticker,
    category: f.category,
    aum: round2(jitter(f.baseAum, 0.05)),
    flow1W: round2(Math.abs(jitter(f.baseFlow1W, 0.3))),
    flow1M: round2(Math.abs(jitter(f.baseFlow1M, 0.25))),
    flowYTD: round2(Math.abs(jitter(f.baseFlowYTD, 0.15))),
    expenseRatio: f.expenseRatio,
  })).sort((a, b) => b.flow1W - a.flow1W);

  // --- Top Fund Outflows (15) ---
  const topFundOutflows: FundEntry[] = TOP_OUTFLOW_DEFS.map(f => ({
    fundName: f.fundName,
    ticker: f.ticker,
    category: f.category,
    aum: round2(jitter(f.baseAum, 0.05)),
    flow1W: round2(-Math.abs(jitter(f.baseFlow1W, 0.3))),
    flow1M: round2(-Math.abs(jitter(f.baseFlow1M, 0.25))),
    flowYTD: round2(-Math.abs(jitter(f.baseFlowYTD, 0.15))),
    expenseRatio: f.expenseRatio,
  })).sort((a, b) => a.flow1W - b.flow1W);

  // --- Retail vs Institutional ---
  const totalEqFlow = equityFlows.us.flow1W + equityFlows.europe.flow1W + equityFlows.japan.flow1W;
  const retailEquityPct = 0.25 + (rng() - 0.5) * 0.1; // retail is ~20-30% of equity flow
  const retailEquityFlow = round2(totalEqFlow * retailEquityPct);
  const institutionalEquityFlow = round2(totalEqFlow - retailEquityFlow);

  const totalBondFlow = bondFlows.investmentGrade.flow1W + bondFlows.government.flow1W + bondFlows.highYield.flow1W;
  const retailBondPct = 0.15 + (rng() - 0.5) * 0.08; // retail is ~11-19% of bond flow
  const retailBondFlow = round2(totalBondFlow * retailBondPct);
  const institutionalBondFlow = round2(totalBondFlow - retailBondFlow);

  const aaiiBullPercent = round2(35 + (rng() - 0.5) * 20); // ~25-45% range, centered ~35-45%
  let retailSentiment: 'bullish' | 'neutral' | 'bearish';
  if (aaiiBullPercent > 42) retailSentiment = 'bullish';
  else if (aaiiBullPercent < 32) retailSentiment = 'bearish';
  else retailSentiment = 'neutral';

  const retailVsInstitutional: RetailVsInstitutional = {
    retailEquityFlow,
    institutionalEquityFlow,
    retailBondFlow,
    institutionalBondFlow,
    retailSentiment,
    aaiiBullPercent,
  };

  // --- Money Market Flows ---
  const moneyMarketFlows: MoneyMarketFlows = {
    totalAUM: round2(jitter(6.12, 0.04)),        // ~$6T
    flow1W: round2(jitter(18.5, 0.4)),            // weekly flow ~$10-25B
    flow1M: round2(jitter(72.4, 0.3)),
    govMoneyMarket: round2(jitter(4.28, 0.04)),   // ~70% of total AUM
    primeMoneyMarket: round2(jitter(1.84, 0.04)),  // ~30% of total AUM
    yieldAvg: round2(jitter(5.18, 0.08)),          // ~4.8-5.6%
  };

  // --- Leveraged Positioning (COT-style) ---
  const leveragedPositioning: LeveragedPositioning = {
    spxNetLong: round2(jitter(62.5, 0.15)),        // ~53-72%
    nasdaqNetLong: round2(jitter(58.3, 0.18)),      // ~48-69%
    bondNetLong: round2(jitter(-15.4, 0.3)),        // typically net short bonds
    vixNetShort: round2(jitter(-72.8, 0.12)),       // large spec typically short VIX
    goldNetLong: round2(jitter(68.2, 0.14)),        // gold positioning usually long
  };

  // --- Summary ---
  const totalEquityFlow1W = round2(
    Object.values(equityFlows).reduce((sum, f) => sum + f.flow1W, 0)
  );
  const totalBondFlow1W = round2(
    Object.values(bondFlows).reduce((sum, f) => sum + f.flow1W, 0)
  );

  const equityVsBondRatio = totalBondFlow1W !== 0
    ? round2(totalEquityFlow1W / totalBondFlow1W)
    : 0;

  let riskAppetite: 'risk-on' | 'neutral' | 'risk-off';
  if (totalEquityFlow1W > 0 && equityVsBondRatio > 1.2) {
    riskAppetite = 'risk-on';
  } else if (totalEquityFlow1W < 0 || equityVsBondRatio < 0.5) {
    riskAppetite = 'risk-off';
  } else {
    riskAppetite = 'neutral';
  }

  // Find biggest inflow/outflow category names
  const allFlowEntries = [
    ...EQUITY_FLOW_DEFS.map(d => ({ name: `Equity - ${d.key}`, flow: equityFlows[d.key].flow1W })),
    ...BOND_FLOW_DEFS.map(d => ({ name: `Bond - ${d.key}`, flow: bondFlows[d.key].flow1W })),
    ...ALTERNATIVE_FLOW_DEFS.map(d => ({ name: `Alt - ${d.key}`, flow: alternativeFlows[d.key].flow1W })),
  ];
  const sortedByFlow = [...allFlowEntries].sort((a, b) => b.flow - a.flow);
  const biggestInflow = sortedByFlow[0]?.name ?? 'N/A';
  const biggestOutflow = sortedByFlow[sortedByFlow.length - 1]?.name ?? 'N/A';

  const summary: FlowSummary = {
    totalEquityFlow1W,
    totalBondFlow1W,
    equityVsBondRatio,
    riskAppetite,
    biggestInflow,
    biggestOutflow,
  };

  return {
    equityFlows,
    bondFlows,
    alternativeFlows,
    topFundInflows,
    topFundOutflows,
    retailVsInstitutional,
    moneyMarketFlows,
    leveragedPositioning,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// --- Route ---

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
  } catch (err) {
    console.error('[FundFlow] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate fund flow data' });
  }
});

export default router;
