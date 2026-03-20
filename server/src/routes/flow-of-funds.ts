import { Router } from 'express';

const router = Router();

// ── PRNG (deterministic daily) ──

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Types ──

interface SectorFlow {
  name: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  change1q: number;
  change1y: number;
  equityAllocation: number;
  debtAllocation: number;
  cashAllocation: number;
}

interface CreditMarketInstrument {
  type: string;
  outstanding: number;
  netIssuance1q: number;
  netIssuance1y: number;
  percentGdp: number;
}

interface HouseholdBalanceSheet {
  totalAssets: number;
  realEstate: number;
  equities: number;
  pension: number;
  deposits: number;
  totalDebt: number;
  mortgages: number;
  consumerCredit: number;
  netWorth: number;
  debtServiceRatio: number;
  equityToNetWorth: number;
}

interface FlowOfFundsSummary {
  householdNetWorth: number;
  corporateDebt: number;
  govtDebt: number;
  totalCreditMarket: number;
  change1q: number;
  timestamp: string;
}

interface FlowOfFundsResponse {
  sectorFlows: SectorFlow[];
  creditMarket: CreditMarketInstrument[];
  householdBalanceSheet: HouseholdBalanceSheet;
  summary: FlowOfFundsSummary;
}

// ── Seed Data: Sector Flows (6 sectors, Fed Z.1 scale) ──

interface SectorFlowSeed {
  name: string;
  baseTotalAssets: number;   // $T
  baseTotalLiabilities: number; // $T
  baseEquityAlloc: number;   // %
  baseDebtAlloc: number;     // %
  baseCashAlloc: number;     // %
}

const SECTOR_FLOW_SEEDS: SectorFlowSeed[] = [
  { name: 'Households',              baseTotalAssets: 176.2, baseTotalLiabilities: 19.8,  baseEquityAlloc: 38.4, baseDebtAlloc: 25.7, baseCashAlloc: 12.3 },
  { name: 'Nonfinancial Corporate',  baseTotalAssets: 54.8,  baseTotalLiabilities: 35.2,  baseEquityAlloc: 14.2, baseDebtAlloc: 42.8, baseCashAlloc: 8.6 },
  { name: 'Financial',               baseTotalAssets: 128.4, baseTotalLiabilities: 117.6, baseEquityAlloc: 8.1,  baseDebtAlloc: 61.3, baseCashAlloc: 11.2 },
  { name: 'Government',              baseTotalAssets: 28.3,  baseTotalLiabilities: 38.9,  baseEquityAlloc: 3.5,  baseDebtAlloc: 78.2, baseCashAlloc: 4.8 },
  { name: 'Foreign',                 baseTotalAssets: 42.1,  baseTotalLiabilities: 35.6,  baseEquityAlloc: 22.6, baseDebtAlloc: 48.1, baseCashAlloc: 9.7 },
  { name: 'Nonprofits',              baseTotalAssets: 7.6,   baseTotalLiabilities: 0.8,   baseEquityAlloc: 44.2, baseDebtAlloc: 30.5, baseCashAlloc: 10.1 },
];

// ── Seed Data: Credit Market (8 instruments) ──

interface CreditMarketSeed {
  type: string;
  baseOutstanding: number;     // $T
  baseNetIssuance1q: number;   // $B
  baseNetIssuance1y: number;   // $B
  basePercentGdp: number;      // %
}

const CREDIT_MARKET_SEEDS: CreditMarketSeed[] = [
  { type: 'Treasury',        baseOutstanding: 33.2, baseNetIssuance1q: 420,  baseNetIssuance1y: 1680, basePercentGdp: 119.5 },
  { type: 'Corporate Bonds', baseOutstanding: 10.8, baseNetIssuance1q: 125,  baseNetIssuance1y: 510,  basePercentGdp: 38.8 },
  { type: 'MBS',             baseOutstanding: 12.4, baseNetIssuance1q: 85,   baseNetIssuance1y: 340,  basePercentGdp: 44.6 },
  { type: 'Agency',          baseOutstanding: 8.9,  baseNetIssuance1q: 62,   baseNetIssuance1y: 248,  basePercentGdp: 32.0 },
  { type: 'Muni',            baseOutstanding: 4.1,  baseNetIssuance1q: 28,   baseNetIssuance1y: 112,  basePercentGdp: 14.7 },
  { type: 'Consumer Credit', baseOutstanding: 5.1,  baseNetIssuance1q: 45,   baseNetIssuance1y: 180,  basePercentGdp: 18.3 },
  { type: 'Mortgages',       baseOutstanding: 13.8, baseNetIssuance1q: 95,   baseNetIssuance1y: 380,  basePercentGdp: 49.6 },
  { type: 'Bank Loans',      baseOutstanding: 12.2, baseNetIssuance1q: 72,   baseNetIssuance1y: 290,  basePercentGdp: 43.9 },
];

// ── Seed Data: Household Balance Sheet ──

interface HouseholdSeed {
  baseTotalAssets: number;
  baseRealEstate: number;
  baseEquities: number;
  basePension: number;
  baseDeposits: number;
  baseTotalDebt: number;
  baseMortgages: number;
  baseConsumerCredit: number;
  baseDebtServiceRatio: number;
}

const HOUSEHOLD_SEED: HouseholdSeed = {
  baseTotalAssets: 176.2,
  baseRealEstate: 48.3,
  baseEquities: 42.8,
  basePension: 39.6,
  baseDeposits: 18.1,
  baseTotalDebt: 19.8,
  baseMortgages: 13.2,
  baseConsumerCredit: 5.1,
  baseDebtServiceRatio: 9.8,
};

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function applyVariation(base: number, rng: () => number, pctRange: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pctRange);
}

// ── Data Generation ──

function generateSectorFlows(rng: () => number): SectorFlow[] {
  return SECTOR_FLOW_SEEDS.map((seed) => {
    const totalAssets = roundTo(applyVariation(seed.baseTotalAssets, rng, 0.04), 1);
    const totalLiabilities = roundTo(applyVariation(seed.baseTotalLiabilities, rng, 0.04), 1);
    const netWorth = roundTo(totalAssets - totalLiabilities, 1);
    const change1q = roundTo((rng() - 0.4) * 5, 1);   // slight positive bias, range ~-3% to +3%
    const change1y = roundTo((rng() - 0.35) * 12, 1);  // slight positive bias, range ~-4.2% to +7.8%
    const equityAllocation = roundTo(applyVariation(seed.baseEquityAlloc, rng, 0.06), 1);
    const debtAllocation = roundTo(applyVariation(seed.baseDebtAlloc, rng, 0.04), 1);
    // Cash allocation absorbs remainder; apply small variation then reconcile
    const remaining = 100 - equityAllocation - debtAllocation;
    const cashAllocation = roundTo(Math.max(remaining * (0.3 + rng() * 0.4), 2.0), 1);

    return {
      name: seed.name,
      totalAssets,
      totalLiabilities,
      netWorth,
      change1q,
      change1y,
      equityAllocation,
      debtAllocation,
      cashAllocation,
    };
  });
}

function generateCreditMarket(rng: () => number): CreditMarketInstrument[] {
  return CREDIT_MARKET_SEEDS.map((seed) => {
    const outstanding = roundTo(applyVariation(seed.baseOutstanding, rng, 0.03), 1);
    const netIssuance1q = roundTo(applyVariation(seed.baseNetIssuance1q, rng, 0.15), 1);
    const netIssuance1y = roundTo(applyVariation(seed.baseNetIssuance1y, rng, 0.10), 1);
    const percentGdp = roundTo(applyVariation(seed.basePercentGdp, rng, 0.03), 1);

    return {
      type: seed.type,
      outstanding,
      netIssuance1q,
      netIssuance1y,
      percentGdp,
    };
  });
}

function generateHouseholdBalanceSheet(rng: () => number): HouseholdBalanceSheet {
  const s = HOUSEHOLD_SEED;
  const totalAssets = roundTo(applyVariation(s.baseTotalAssets, rng, 0.04), 1);
  const realEstate = roundTo(applyVariation(s.baseRealEstate, rng, 0.05), 1);
  const equities = roundTo(applyVariation(s.baseEquities, rng, 0.08), 1);
  const pension = roundTo(applyVariation(s.basePension, rng, 0.05), 1);
  const deposits = roundTo(applyVariation(s.baseDeposits, rng, 0.04), 1);
  const totalDebt = roundTo(applyVariation(s.baseTotalDebt, rng, 0.03), 1);
  const mortgages = roundTo(applyVariation(s.baseMortgages, rng, 0.03), 1);
  const consumerCredit = roundTo(applyVariation(s.baseConsumerCredit, rng, 0.05), 1);
  const netWorth = roundTo(totalAssets - totalDebt, 1);
  const debtServiceRatio = roundTo(applyVariation(s.baseDebtServiceRatio, rng, 0.06), 1);
  const equityToNetWorth = roundTo((equities / netWorth) * 100, 1);

  return {
    totalAssets,
    realEstate,
    equities,
    pension,
    deposits,
    totalDebt,
    mortgages,
    consumerCredit,
    netWorth,
    debtServiceRatio,
    equityToNetWorth,
  };
}

function generateSummary(
  sectorFlows: SectorFlow[],
  creditMarket: CreditMarketInstrument[],
  householdBalanceSheet: HouseholdBalanceSheet,
): FlowOfFundsSummary {
  const householdNetWorth = householdBalanceSheet.netWorth;

  // Corporate debt: sum of Corporate Bonds + Bank Loans outstanding
  const corporateBonds = creditMarket.find((c) => c.type === 'Corporate Bonds');
  const bankLoans = creditMarket.find((c) => c.type === 'Bank Loans');
  const corporateDebt = roundTo(
    (corporateBonds?.outstanding ?? 0) + (bankLoans?.outstanding ?? 0),
    1,
  );

  const govtDebt = roundTo(
    creditMarket.find((c) => c.type === 'Treasury')?.outstanding ?? 0,
    1,
  );

  const totalCreditMarket = roundTo(
    creditMarket.reduce((sum, c) => sum + c.outstanding, 0),
    1,
  );

  // Weighted average 1q change across sectors by total assets
  const totalSectorAssets = sectorFlows.reduce((sum, s) => sum + s.totalAssets, 0);
  const change1q = roundTo(
    sectorFlows.reduce((sum, s) => sum + s.change1q * (s.totalAssets / totalSectorAssets), 0),
    1,
  );

  return {
    householdNetWorth,
    corporateDebt,
    govtDebt,
    totalCreditMarket,
    change1q,
    timestamp: new Date().toISOString(),
  };
}

function generateFlowOfFundsData(): FlowOfFundsResponse {
  const rng = seededRandom('flow-of-funds');
  const sectorFlows = generateSectorFlows(rng);
  const creditMarket = generateCreditMarket(rng);
  const householdBalanceSheet = generateHouseholdBalanceSheet(rng);
  const summary = generateSummary(sectorFlows, creditMarket, householdBalanceSheet);

  return { sectorFlows, creditMarket, householdBalanceSheet, summary };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: FlowOfFundsResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateFlowOfFundsData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FlowOfFunds] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch flow of funds data' });
  }
});

export default router;
