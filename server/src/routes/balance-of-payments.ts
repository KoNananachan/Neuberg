import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── In-memory cache (5 min TTL) with stale fallback ──

let cache: { data: unknown; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Helpers ──

function vary(rng: () => number, base: number, pct: number): number {
  return Math.round((base * (1 + (rng() - 0.5) * 2 * pct)) * 100) / 100;
}

function rangeVal(rng: () => number, min: number, max: number): number {
  return Math.round((min + rng() * (max - min)) * 100) / 100;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Types ──

interface CurrentAccount {
  balance: number;
  pctOfGDP: number;
  previous: number;
  trend: 'improving' | 'deteriorating' | 'stable';
}

interface TradeBalance {
  goods: number;
  services: number;
  total: number;
  yoyChange: number;
}

interface PrimaryIncome {
  value: number;
  investment: number;
  compensation: number;
}

interface SecondaryIncome {
  value: number;
  remittances: number;
  transfers: number;
}

interface CapitalAccount {
  balance: number;
  fdi: number;
  portfolio: number;
  other: number;
  reserves: number;
}

interface FDI {
  inward: number;
  outward: number;
  net: number;
}

interface PortfolioFlows {
  equityInflow: number;
  equityOutflow: number;
  debtInflow: number;
  debtOutflow: number;
  net: number;
}

interface Reserves {
  total: number;
  months_of_imports: number;
  gold: number;
  sdrs: number;
  foreignCurrency: number;
  change: number;
}

interface TradePartner {
  partner: string;
  exports: number;
  imports: number;
  balance: number;
}

interface CountryBOP {
  country: string;
  code: string;
  currency: string;
  currentAccount: CurrentAccount;
  tradeBalance: TradeBalance;
  primaryIncome: PrimaryIncome;
  secondaryIncome: SecondaryIncome;
  capitalAccount: CapitalAccount;
  fdi: FDI;
  portfolioFlows: PortfolioFlows;
  reserves: Reserves;
  topTradePartners: TradePartner[];
  historicalCA: number[];
}

interface GlobalImbalances {
  largestSurplus: { country: string; value: number };
  largestDeficit: { country: string; value: number };
  totalSurplus: number;
  totalDeficit: number;
}

interface CapitalFlowTrends {
  emInflows: number;
  dmOutflows: number;
  riskAppetite: 'risk-on' | 'risk-off' | 'neutral';
}

interface BOPResponse {
  countries: CountryBOP[];
  globalImbalances: GlobalImbalances;
  capitalFlowTrends: CapitalFlowTrends;
  generatedAt: string;
}

// ── Country definitions with realistic 2026 baseline values ──

interface CountryDef {
  country: string;
  code: string;
  currency: string;
  // Current account baseline (billions USD)
  caBalance: number;
  caPctGDP: number;
  // Trade balance baselines (billions USD)
  goodsBalance: number;
  servicesBalance: number;
  // Primary income baseline
  primaryIncomeBase: number;
  investmentIncomeBase: number;
  compensationBase: number;
  // Secondary income baseline
  secondaryIncomeBase: number;
  remittancesBase: number;
  transfersBase: number;
  // Capital account / financial flows
  fdiInwardBase: number;
  fdiOutwardBase: number;
  portfolioEquityIn: number;
  portfolioEquityOut: number;
  portfolioDebtIn: number;
  portfolioDebtOut: number;
  // Reserves (billions USD)
  reservesTotal: number;
  monthsOfImports: number;
  goldBase: number;
  sdrsBase: number;
  // Top 5 trade partners [partner, exports, imports]
  tradePartners: [string, number, number][];
  // Whether EM or DM
  isEM: boolean;
}

const COUNTRY_DEFS: CountryDef[] = [
  {
    country: 'United States', code: 'US', currency: 'USD',
    caBalance: -820, caPctGDP: -3.1,
    goodsBalance: -1050, servicesBalance: 280,
    primaryIncomeBase: 60, investmentIncomeBase: 55, compensationBase: 5,
    secondaryIncomeBase: -110, remittancesBase: -68, transfersBase: -42,
    fdiInwardBase: 350, fdiOutwardBase: 420,
    portfolioEquityIn: 280, portfolioEquityOut: 310, portfolioDebtIn: 520, portfolioDebtOut: 380,
    reservesTotal: 245, monthsOfImports: 0.8, goldBase: 180, sdrsBase: 50,
    tradePartners: [['China', 145, 430], ['Mexico', 310, 455], ['Canada', 355, 410], ['EU', 370, 540], ['Japan', 82, 145]],
    isEM: false,
  },
  {
    country: 'Eurozone', code: 'EZ', currency: 'EUR',
    caBalance: 320, caPctGDP: 2.2,
    goodsBalance: 180, servicesBalance: 95,
    primaryIncomeBase: 65, investmentIncomeBase: 58, compensationBase: 7,
    secondaryIncomeBase: -20, remittancesBase: -12, transfersBase: -8,
    fdiInwardBase: 280, fdiOutwardBase: 350,
    portfolioEquityIn: 200, portfolioEquityOut: 240, portfolioDebtIn: 350, portfolioDebtOut: 300,
    reservesTotal: 850, monthsOfImports: 3.8, goldBase: 520, sdrsBase: 85,
    tradePartners: [['US', 540, 370], ['China', 250, 480], ['UK', 360, 280], ['Switzerland', 180, 160], ['Turkey', 110, 85]],
    isEM: false,
  },
  {
    country: 'United Kingdom', code: 'GB', currency: 'GBP',
    caBalance: -105, caPctGDP: -3.2,
    goodsBalance: -210, servicesBalance: 145,
    primaryIncomeBase: -25, investmentIncomeBase: -20, compensationBase: -5,
    secondaryIncomeBase: -15, remittancesBase: -8, transfersBase: -7,
    fdiInwardBase: 120, fdiOutwardBase: 95,
    portfolioEquityIn: 85, portfolioEquityOut: 110, portfolioDebtIn: 180, portfolioDebtOut: 150,
    reservesTotal: 195, monthsOfImports: 2.5, goldBase: 135, sdrsBase: 22,
    tradePartners: [['EU', 280, 360], ['US', 75, 62], ['China', 28, 78], ['Switzerland', 42, 35], ['Norway', 18, 32]],
    isEM: false,
  },
  {
    country: 'Japan', code: 'JP', currency: 'JPY',
    caBalance: 185, caPctGDP: 3.8,
    goodsBalance: -15, servicesBalance: -25,
    primaryIncomeBase: 240, investmentIncomeBase: 228, compensationBase: 12,
    secondaryIncomeBase: -15, remittancesBase: -5, transfersBase: -10,
    fdiInwardBase: 35, fdiOutwardBase: 175,
    portfolioEquityIn: 60, portfolioEquityOut: 120, portfolioDebtIn: 85, portfolioDebtOut: 140,
    reservesTotal: 1250, monthsOfImports: 18.5, goldBase: 62, sdrsBase: 42,
    tradePartners: [['China', 145, 190], ['US', 145, 82], ['South Korea', 55, 38], ['Australia', 22, 62], ['Taiwan', 48, 32]],
    isEM: false,
  },
  {
    country: 'China', code: 'CN', currency: 'CNY',
    caBalance: 380, caPctGDP: 2.0,
    goodsBalance: 680, servicesBalance: -180,
    primaryIncomeBase: -85, investmentIncomeBase: -78, compensationBase: -7,
    secondaryIncomeBase: -35, remittancesBase: -18, transfersBase: -17,
    fdiInwardBase: 180, fdiOutwardBase: 210,
    portfolioEquityIn: 45, portfolioEquityOut: 85, portfolioDebtIn: 60, portfolioDebtOut: 55,
    reservesTotal: 3250, monthsOfImports: 14.8, goldBase: 185, sdrsBase: 48,
    tradePartners: [['US', 430, 145], ['EU', 480, 250], ['ASEAN', 380, 350], ['Japan', 190, 145], ['South Korea', 160, 185]],
    isEM: true,
  },
  {
    country: 'India', code: 'IN', currency: 'INR',
    caBalance: -48, caPctGDP: -1.2,
    goodsBalance: -250, servicesBalance: 175,
    primaryIncomeBase: -42, investmentIncomeBase: -38, compensationBase: -4,
    secondaryIncomeBase: 69, remittancesBase: 115, transfersBase: -46,
    fdiInwardBase: 52, fdiOutwardBase: 18,
    portfolioEquityIn: 35, portfolioEquityOut: 12, portfolioDebtIn: 22, portfolioDebtOut: 8,
    reservesTotal: 680, monthsOfImports: 10.2, goldBase: 68, sdrsBase: 18,
    tradePartners: [['US', 85, 52], ['China', 18, 105], ['UAE', 42, 48], ['Saudi Arabia', 12, 45], ['EU', 68, 55]],
    isEM: true,
  },
  {
    country: 'Brazil', code: 'BR', currency: 'BRL',
    caBalance: -32, caPctGDP: -1.5,
    goodsBalance: 72, servicesBalance: -38,
    primaryIncomeBase: -58, investmentIncomeBase: -52, compensationBase: -6,
    secondaryIncomeBase: -8, remittancesBase: 4, transfersBase: -12,
    fdiInwardBase: 65, fdiOutwardBase: 22,
    portfolioEquityIn: 18, portfolioEquityOut: 8, portfolioDebtIn: 25, portfolioDebtOut: 12,
    reservesTotal: 355, monthsOfImports: 16.5, goldBase: 12, sdrsBase: 15,
    tradePartners: [['China', 95, 55], ['US', 38, 42], ['EU', 32, 38], ['Argentina', 15, 12], ['India', 8, 10]],
    isEM: true,
  },
  {
    country: 'Canada', code: 'CA', currency: 'CAD',
    caBalance: -8, caPctGDP: -0.4,
    goodsBalance: -15, servicesBalance: -12,
    primaryIncomeBase: 22, investmentIncomeBase: 18, compensationBase: 4,
    secondaryIncomeBase: -3, remittancesBase: -2, transfersBase: -1,
    fdiInwardBase: 55, fdiOutwardBase: 68,
    portfolioEquityIn: 42, portfolioEquityOut: 65, portfolioDebtIn: 75, portfolioDebtOut: 48,
    reservesTotal: 110, monthsOfImports: 2.0, goldBase: 0.1, sdrsBase: 12,
    tradePartners: [['US', 410, 355], ['China', 28, 55], ['EU', 22, 42], ['Mexico', 8, 18], ['Japan', 14, 18]],
    isEM: false,
  },
  {
    country: 'Australia', code: 'AU', currency: 'AUD',
    caBalance: 18, caPctGDP: 1.0,
    goodsBalance: 85, servicesBalance: -18,
    primaryIncomeBase: -62, investmentIncomeBase: -58, compensationBase: -4,
    secondaryIncomeBase: -7, remittancesBase: -4, transfersBase: -3,
    fdiInwardBase: 48, fdiOutwardBase: 35,
    portfolioEquityIn: 32, portfolioEquityOut: 55, portfolioDebtIn: 85, portfolioDebtOut: 42,
    reservesTotal: 75, monthsOfImports: 3.2, goldBase: 8, sdrsBase: 8,
    tradePartners: [['China', 125, 72], ['Japan', 62, 22], ['South Korea', 32, 15], ['US', 18, 32], ['India', 28, 8]],
    isEM: false,
  },
  {
    country: 'South Korea', code: 'KR', currency: 'KRW',
    caBalance: 85, caPctGDP: 4.5,
    goodsBalance: 52, servicesBalance: -28,
    primaryIncomeBase: 68, investmentIncomeBase: 62, compensationBase: 6,
    secondaryIncomeBase: -7, remittancesBase: -3, transfersBase: -4,
    fdiInwardBase: 18, fdiOutwardBase: 52,
    portfolioEquityIn: 22, portfolioEquityOut: 38, portfolioDebtIn: 32, portfolioDebtOut: 28,
    reservesTotal: 425, monthsOfImports: 7.5, goldBase: 5, sdrsBase: 12,
    tradePartners: [['China', 160, 108], ['US', 105, 68], ['Vietnam', 58, 22], ['Japan', 38, 55], ['EU', 52, 48]],
    isEM: true,
  },
  {
    country: 'Mexico', code: 'MX', currency: 'MXN',
    caBalance: -18, caPctGDP: -1.1,
    goodsBalance: -12, servicesBalance: -15,
    primaryIncomeBase: -42, investmentIncomeBase: -38, compensationBase: -4,
    secondaryIncomeBase: 51, remittancesBase: 65, transfersBase: -14,
    fdiInwardBase: 38, fdiOutwardBase: 8,
    portfolioEquityIn: 12, portfolioEquityOut: 5, portfolioDebtIn: 18, portfolioDebtOut: 8,
    reservesTotal: 215, monthsOfImports: 4.5, goldBase: 0.2, sdrsBase: 8,
    tradePartners: [['US', 455, 310], ['China', 12, 95], ['Canada', 18, 8], ['EU', 22, 42], ['Japan', 5, 18]],
    isEM: true,
  },
  {
    country: 'Switzerland', code: 'CH', currency: 'CHF',
    caBalance: 72, caPctGDP: 8.2,
    goodsBalance: 48, servicesBalance: 12,
    primaryIncomeBase: 18, investmentIncomeBase: 15, compensationBase: 3,
    secondaryIncomeBase: -6, remittancesBase: -4, transfersBase: -2,
    fdiInwardBase: 42, fdiOutwardBase: 85,
    portfolioEquityIn: 55, portfolioEquityOut: 72, portfolioDebtIn: 48, portfolioDebtOut: 65,
    reservesTotal: 820, monthsOfImports: 28.5, goldBase: 58, sdrsBase: 8,
    tradePartners: [['EU', 160, 180], ['US', 55, 18], ['China', 22, 18], ['UK', 35, 15], ['India', 18, 12]],
    isEM: false,
  },
];

// ── Data generation ──

function generateCountryBOP(def: CountryDef, rng: () => number): CountryBOP {
  const trends: Array<'improving' | 'deteriorating' | 'stable'> = ['improving', 'deteriorating', 'stable'];

  // Current account
  const caBalance = vary(rng, def.caBalance, 0.08);
  const caPctGDP = vary(rng, def.caPctGDP, 0.06);
  const caPrevious = vary(rng, def.caBalance, 0.12);
  const currentAccount: CurrentAccount = {
    balance: caBalance,
    pctOfGDP: caPctGDP,
    previous: caPrevious,
    trend: pick(rng, trends),
  };

  // Trade balance
  const goods = vary(rng, def.goodsBalance, 0.08);
  const services = vary(rng, def.servicesBalance, 0.10);
  const total = Math.round((goods + services) * 100) / 100;
  const yoyChange = rangeVal(rng, -12, 12);
  const tradeBalance: TradeBalance = { goods, services, total, yoyChange };

  // Primary income
  const investment = vary(rng, def.investmentIncomeBase, 0.10);
  const compensation = vary(rng, def.compensationBase, 0.12);
  const primaryValue = Math.round((investment + compensation) * 100) / 100;
  const primaryIncome: PrimaryIncome = { value: primaryValue, investment, compensation };

  // Secondary income
  const remittances = vary(rng, def.remittancesBase, 0.08);
  const transfers = vary(rng, def.transfersBase, 0.10);
  const secondaryValue = Math.round((remittances + transfers) * 100) / 100;
  const secondaryIncome: SecondaryIncome = { value: secondaryValue, remittances, transfers };

  // FDI
  const fdiInward = vary(rng, def.fdiInwardBase, 0.15);
  const fdiOutward = vary(rng, def.fdiOutwardBase, 0.15);
  const fdiNet = Math.round((fdiInward - fdiOutward) * 100) / 100;
  const fdi: FDI = { inward: fdiInward, outward: fdiOutward, net: fdiNet };

  // Portfolio flows
  const equityInflow = vary(rng, def.portfolioEquityIn, 0.12);
  const equityOutflow = vary(rng, def.portfolioEquityOut, 0.12);
  const debtInflow = vary(rng, def.portfolioDebtIn, 0.10);
  const debtOutflow = vary(rng, def.portfolioDebtOut, 0.10);
  const portfolioNet = Math.round((equityInflow - equityOutflow + debtInflow - debtOutflow) * 100) / 100;
  const portfolioFlows: PortfolioFlows = { equityInflow, equityOutflow, debtInflow, debtOutflow, net: portfolioNet };

  // Capital account
  const otherFlows = rangeVal(rng, -30, 30);
  const reserveChange = rangeVal(rng, -20, 20);
  const capitalBalance = Math.round((fdiNet + portfolioNet + otherFlows + reserveChange) * 100) / 100;
  const capitalAccount: CapitalAccount = {
    balance: capitalBalance,
    fdi: fdiNet,
    portfolio: portfolioNet,
    other: otherFlows,
    reserves: reserveChange,
  };

  // Reserves
  const reserveTotal = vary(rng, def.reservesTotal, 0.03);
  const gold = vary(rng, def.goldBase, 0.05);
  const sdrs = vary(rng, def.sdrsBase, 0.04);
  const foreignCurrency = Math.round((reserveTotal - gold - sdrs) * 100) / 100;
  const monthsImports = vary(rng, def.monthsOfImports, 0.06);
  const reserveChangeAmt = rangeVal(rng, -15, 15);
  const reserves: Reserves = {
    total: reserveTotal,
    months_of_imports: monthsImports,
    gold,
    sdrs,
    foreignCurrency: Math.max(foreignCurrency, 0),
    change: reserveChangeAmt,
  };

  // Top trade partners
  const topTradePartners: TradePartner[] = def.tradePartners.map(([partner, exp, imp]) => {
    const expVal = vary(rng, exp, 0.08);
    const impVal = vary(rng, imp, 0.08);
    return {
      partner,
      exports: expVal,
      imports: impVal,
      balance: Math.round((expVal - impVal) * 100) / 100,
    };
  });

  // Historical CA: last 8 quarters
  const historicalCA: number[] = [];
  for (let q = 0; q < 8; q++) {
    const quarterVal = vary(rng, def.caBalance / 4, 0.20);
    historicalCA.push(quarterVal);
  }

  return {
    country: def.country,
    code: def.code,
    currency: def.currency,
    currentAccount,
    tradeBalance,
    primaryIncome,
    secondaryIncome,
    capitalAccount,
    fdi,
    portfolioFlows,
    reserves,
    topTradePartners,
    historicalCA,
  };
}

function generateGlobalImbalances(countries: CountryBOP[]): GlobalImbalances {
  let largestSurplus = { country: '', value: -Infinity };
  let largestDeficit = { country: '', value: Infinity };
  let totalSurplus = 0;
  let totalDeficit = 0;

  for (const c of countries) {
    const bal = c.currentAccount.balance;
    if (bal > 0) {
      totalSurplus += bal;
      if (bal > largestSurplus.value) {
        largestSurplus = { country: c.country, value: bal };
      }
    } else {
      totalDeficit += bal;
      if (bal < largestDeficit.value) {
        largestDeficit = { country: c.country, value: bal };
      }
    }
  }

  return {
    largestSurplus: { country: largestSurplus.country, value: Math.round(largestSurplus.value * 100) / 100 },
    largestDeficit: { country: largestDeficit.country, value: Math.round(largestDeficit.value * 100) / 100 },
    totalSurplus: Math.round(totalSurplus * 100) / 100,
    totalDeficit: Math.round(totalDeficit * 100) / 100,
  };
}

function generateCapitalFlowTrends(countries: CountryBOP[], rng: () => number): CapitalFlowTrends {
  let emInflows = 0;
  let dmOutflows = 0;

  for (const c of countries) {
    const def = COUNTRY_DEFS.find(d => d.code === c.code);
    if (!def) continue;
    const netFlow = c.fdi.net + c.portfolioFlows.net;
    if (def.isEM) {
      emInflows += netFlow;
    } else {
      dmOutflows += netFlow;
    }
  }

  emInflows = Math.round(emInflows * 100) / 100;
  dmOutflows = Math.round(dmOutflows * 100) / 100;

  const appetiteRoll = rng();
  let riskAppetite: 'risk-on' | 'risk-off' | 'neutral';
  if (emInflows > 50 && appetiteRoll > 0.35) {
    riskAppetite = 'risk-on';
  } else if (emInflows < -30 || appetiteRoll < 0.2) {
    riskAppetite = 'risk-off';
  } else {
    riskAppetite = 'neutral';
  }

  return { emInflows, dmOutflows, riskAppetite };
}

// ── Route handler ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }

    const seed = hashSeed('balance-of-payments-' + new Date().toISOString().slice(0, 10));
    const rng = mulberry32(seed);

    const countries = COUNTRY_DEFS.map(def => generateCountryBOP(def, rng));
    const globalImbalances = generateGlobalImbalances(countries);
    const capitalFlowTrends = generateCapitalFlowTrends(countries, rng);

    const result: BOPResponse = {
      countries,
      globalImbalances,
      capitalFlowTrends,
      generatedAt: new Date().toISOString(),
    };

    cache = { data: result, ts: now };

    res.json(result);
  } catch (err) {
    console.error('[BalanceOfPayments] Error:', err instanceof Error ? err.message : err);
    if (cache) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate balance of payments data' });
  }
});

export default router;
