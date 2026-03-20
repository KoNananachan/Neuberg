import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface ActiveFuturesContract {
  ticker: string;       // TU, FV, TY, US, WN
  contract: string;     // e.g. TUH6
  tenor: string;        // 2Y, 5Y, 10Y, 20Y, 30Y
  futuresPrice: number;
  dv01: number;
  ctdBond: string;      // CUSIP of cheapest-to-deliver
  basisNetOfCarry: number;  // 32nds
  impliedRepoRate: number;  // %
  grossBasis: number;       // 32nds
}

interface CTDAnalysisEntry {
  ticker: string;
  tenor: string;
  ctdCusip: string;
  ctdCoupon: number;
  ctdMaturity: string;
  conversionFactor: number;
  netBasis: number;         // 32nds
  grossBasis: number;       // 32nds
  impliedRepoRate: number;  // %
  switchOptionValue: number; // 32nds
  switchToCusip: string;
  switchToCoupon: number;
  switchPointYield: number; // %
}

interface DeliveryOptionAnalytics {
  ticker: string;
  tenor: string;
  endOfMonthValue: number;  // 32nds
  timingValue: number;      // 32nds
  wildCardValue: number;    // 32nds
  totalOptionValue: number; // 32nds
}

interface BasisTradePnL {
  ticker: string;
  tenor: string;
  entryBasis: number;       // 32nds
  currentBasis: number;     // 32nds
  carry: number;            // 32nds
  rollDown: number;         // 32nds
  pnlPerContract: number;   // USD
  dv01Exposure: number;     // USD per bp
  holdingPeriodDays: number;
  annualizedReturn: number; // %
}

interface HistoricalBasisEntry {
  date: string;
  tu: number;   // 2Y net basis 32nds
  fv: number;   // 5Y
  ty: number;   // 10Y
  us: number;   // 20Y
  wn: number;   // 30Y
}

interface ImpliedRepoTermStructure {
  tenor: string;
  overnight: number;  // %
  oneWeek: number;    // %
  oneMonth: number;   // %
  threeMonth: number; // %
  toDelivery: number; // %
  sofrSpread: number; // bps
}

interface CalendarSpreadAnalysis {
  ticker: string;
  tenor: string;
  frontContract: string;
  backContract: string;
  frontPrice: number;
  backPrice: number;
  spread: number;           // 32nds
  netBasisDiff: number;     // 32nds
  impliedRollYield: number; // annualized %
  daysToFrontExpiry: number;
  recommendation: 'BUY_SPREAD' | 'SELL_SPREAD' | 'NEUTRAL';
}

interface TreasuryFuturesBasisResponse {
  timestamp: string;
  activeContracts: ActiveFuturesContract[];
  ctdAnalysis: CTDAnalysisEntry[];
  deliveryOptionAnalytics: DeliveryOptionAnalytics[];
  basisTradePnL: BasisTradePnL[];
  historicalBasis: HistoricalBasisEntry[];
  impliedRepoTermStructure: ImpliedRepoTermStructure[];
  calendarSpreadAnalysis: CalendarSpreadAnalysis[];
}

// ── Cache ──

let cache: { data: TreasuryFuturesBasisResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Contract configuration ──

interface ContractConfig {
  ticker: string;
  contract: string;
  backContract: string;
  tenor: string;
  baseFuturesPrice: number;
  baseDV01: number;
  daysToExpiry: number;
}

const CONTRACTS: ContractConfig[] = [
  { ticker: 'TU', contract: 'TUH6', backContract: 'TUM6', tenor: '2Y',  baseFuturesPrice: 103.109375, baseDV01: 38.65,  daysToExpiry: 42 },
  { ticker: 'FV', contract: 'FVH6', backContract: 'FVM6', tenor: '5Y',  baseFuturesPrice: 107.421875, baseDV01: 46.30,  daysToExpiry: 42 },
  { ticker: 'TY', contract: 'TYH6', backContract: 'TYM6', tenor: '10Y', baseFuturesPrice: 111.906250, baseDV01: 68.50,  daysToExpiry: 42 },
  { ticker: 'US', contract: 'USH6', backContract: 'USM6', tenor: '20Y', baseFuturesPrice: 120.812500, baseDV01: 132.80, daysToExpiry: 42 },
  { ticker: 'WN', contract: 'WNH6', backContract: 'WNM6', tenor: '30Y', baseFuturesPrice: 117.750000, baseDV01: 178.40, daysToExpiry: 42 },
];

// ── CTD bond configuration per contract ──

interface CTDBondConfig {
  cusip: string;
  coupon: number;
  maturityDate: string;
  baseConversionFactor: number;
  baseGrossBasis: number;   // 32nds
  ticker: string;
}

const CTD_BONDS: CTDBondConfig[] = [
  // TU (2Y) deliverables
  { cusip: '91282CKL5', coupon: 4.250, maturityDate: '2028-01-31', baseConversionFactor: 0.9412, baseGrossBasis: 2.8,  ticker: 'TU' },
  { cusip: '91282CKP6', coupon: 4.125, maturityDate: '2028-03-31', baseConversionFactor: 0.9356, baseGrossBasis: 3.1,  ticker: 'TU' },
  { cusip: '91282CKR2', coupon: 4.375, maturityDate: '2028-06-30', baseConversionFactor: 0.9478, baseGrossBasis: 2.5,  ticker: 'TU' },
  // FV (5Y) deliverables
  { cusip: '91282CJN3', coupon: 4.375, maturityDate: '2030-08-15', baseConversionFactor: 0.9285, baseGrossBasis: 5.4,  ticker: 'FV' },
  { cusip: '91282CJR4', coupon: 4.500, maturityDate: '2030-11-15', baseConversionFactor: 0.9318, baseGrossBasis: 4.9,  ticker: 'FV' },
  { cusip: '91282CJT0', coupon: 4.250, maturityDate: '2031-02-15', baseConversionFactor: 0.9215, baseGrossBasis: 5.8,  ticker: 'FV' },
  // TY (10Y) deliverables
  { cusip: '91282CHZ7', coupon: 4.000, maturityDate: '2034-02-15', baseConversionFactor: 0.8847, baseGrossBasis: 8.2,  ticker: 'TY' },
  { cusip: '91282CJB9', coupon: 4.250, maturityDate: '2034-08-15', baseConversionFactor: 0.8921, baseGrossBasis: 7.6,  ticker: 'TY' },
  { cusip: '91282CJD5', coupon: 4.125, maturityDate: '2034-11-15', baseConversionFactor: 0.8878, baseGrossBasis: 7.9,  ticker: 'TY' },
  // US (20Y) deliverables
  { cusip: '912810TW8', coupon: 4.750, maturityDate: '2044-02-15', baseConversionFactor: 0.8654, baseGrossBasis: 12.5, ticker: 'US' },
  { cusip: '912810TX6', coupon: 4.625, maturityDate: '2044-05-15', baseConversionFactor: 0.8598, baseGrossBasis: 13.8, ticker: 'US' },
  { cusip: '912810TY4', coupon: 4.500, maturityDate: '2044-08-15', baseConversionFactor: 0.8541, baseGrossBasis: 14.2, ticker: 'US' },
  // WN (30Y) deliverables
  { cusip: '912810TN8', coupon: 4.500, maturityDate: '2054-05-15', baseConversionFactor: 0.8312, baseGrossBasis: 18.4, ticker: 'WN' },
  { cusip: '912810TP3', coupon: 4.375, maturityDate: '2054-08-15', baseConversionFactor: 0.8256, baseGrossBasis: 19.1, ticker: 'WN' },
  { cusip: '912810TR9', coupon: 4.250, maturityDate: '2054-11-15', baseConversionFactor: 0.8198, baseGrossBasis: 19.8, ticker: 'WN' },
];

// ── Data generation ──

function generateActiveContracts(rng: () => number): ActiveFuturesContract[] {
  return CONTRACTS.map((cfg) => {
    const futJitter = (rng() - 0.5) * 0.375;
    const futuresPrice = Math.round((cfg.baseFuturesPrice + futJitter) * 1000000) / 1000000;

    const dv01Jitter = (rng() - 0.5) * 3.0;
    const dv01 = Math.round((cfg.baseDV01 + dv01Jitter) * 100) / 100;

    // Find CTD for this contract: lowest gross basis after jitter
    const bonds = CTD_BONDS.filter((b) => b.ticker === cfg.ticker);
    let ctdCusip = bonds[0]?.cusip || '';
    let lowestGross = Infinity;
    const grossValues: number[] = [];
    for (const bond of bonds) {
      const gj = (rng() - 0.5) * 1.6;
      const gross = bond.baseGrossBasis + gj;
      grossValues.push(gross);
      if (gross < lowestGross) {
        lowestGross = gross;
        ctdCusip = bond.cusip;
      }
    }

    const grossBasis = Math.round(lowestGross * 100) / 100;
    const carryComponent = rng() * 2.0 + 0.6;
    const basisNetOfCarry = Math.round((grossBasis - carryComponent) * 100) / 100;

    // Implied repo: near SOFR, higher = cheaper basis
    const baseImpliedRepo = 4.32 + (rng() - 0.5) * 0.40;
    const impliedRepoRate = Math.round(baseImpliedRepo * 1000) / 1000;

    return {
      ticker: cfg.ticker,
      contract: cfg.contract,
      tenor: cfg.tenor,
      futuresPrice,
      dv01,
      ctdBond: ctdCusip,
      basisNetOfCarry,
      impliedRepoRate,
      grossBasis,
    };
  });
}

function generateCTDAnalysis(rng: () => number): CTDAnalysisEntry[] {
  return CONTRACTS.map((cfg) => {
    const bonds = CTD_BONDS.filter((b) => b.ticker === cfg.ticker);
    if (bonds.length === 0) {
      // Defensive fallback
      return null;
    }

    // Compute net basis for each bond and pick CTD
    interface BondCalc {
      bond: CTDBondConfig;
      netBasis: number;
      grossBasis: number;
      impliedRepo: number;
      cf: number;
    }
    const calcs: BondCalc[] = bonds.map((bond) => {
      const cfJitter = (rng() - 0.5) * 0.004;
      const cf = Math.round((bond.baseConversionFactor + cfJitter) * 10000) / 10000;

      const grossJitter = (rng() - 0.5) * 1.8;
      const grossBasis = Math.round((bond.baseGrossBasis + grossJitter) * 100) / 100;

      const carryComp = rng() * 2.2 + 0.8;
      const netBasis = Math.round((grossBasis - carryComp) * 100) / 100;

      const repoBase = 4.28 + (rng() - 0.5) * 0.45;
      const impliedRepo = Math.round(repoBase * 1000) / 1000;

      return { bond, netBasis, grossBasis, impliedRepo, cf };
    });

    // CTD = lowest net basis
    calcs.sort((a, b) => a.netBasis - b.netBasis);
    const ctd = calcs[0];
    const secondCheapest = calcs.length > 1 ? calcs[1] : ctd;

    // Switch option value: spread between CTD and 2nd cheapest
    const switchOptionValue = Math.round(Math.abs(secondCheapest.netBasis - ctd.netBasis) * 100) / 100;

    // Switch point yield: yield level where CTD changes
    const switchPointYield = Math.round((3.85 + rng() * 1.15) * 100) / 100;

    return {
      ticker: cfg.ticker,
      tenor: cfg.tenor,
      ctdCusip: ctd.bond.cusip,
      ctdCoupon: ctd.bond.coupon,
      ctdMaturity: ctd.bond.maturityDate,
      conversionFactor: ctd.cf,
      netBasis: ctd.netBasis,
      grossBasis: ctd.grossBasis,
      impliedRepoRate: ctd.impliedRepo,
      switchOptionValue,
      switchToCusip: secondCheapest.bond.cusip,
      switchToCoupon: secondCheapest.bond.coupon,
      switchPointYield,
    };
  }).filter((e): e is CTDAnalysisEntry => e !== null);
}

function generateDeliveryOptionAnalytics(rng: () => number): DeliveryOptionAnalytics[] {
  // Option values scale with duration
  const tenorScale: Record<string, number> = { '2Y': 0.25, '5Y': 0.55, '10Y': 1.15, '20Y': 2.40, '30Y': 3.20 };

  return CONTRACTS.map((cfg) => {
    const scale = tenorScale[cfg.tenor] || 1.0;

    // End-of-month option: last 7 business days of delivery month, futures settle but bonds still trade
    const endOfMonthValue = Math.round((scale * (0.35 + rng() * 0.30)) * 100) / 100;

    // Timing option: choice of when within delivery month to deliver
    const timingValue = Math.round((scale * (0.70 + rng() * 0.40)) * 100) / 100;

    // Wild card option: 6-hour window after futures settlement where delivery intent can be declared
    const wildCardValue = Math.round((scale * (0.20 + rng() * 0.25)) * 100) / 100;

    const totalOptionValue = Math.round((endOfMonthValue + timingValue + wildCardValue) * 100) / 100;

    return {
      ticker: cfg.ticker,
      tenor: cfg.tenor,
      endOfMonthValue,
      timingValue,
      wildCardValue,
      totalOptionValue,
    };
  });
}

function generateBasisTradePnL(rng: () => number): BasisTradePnL[] {
  return CONTRACTS.map((cfg) => {
    // Simulate an existing basis trade position
    const holdingPeriodDays = Math.floor(rng() * 25) + 5; // 5 to 30 days

    // Entry basis was wider, current basis has converged (or diverged)
    const tenorBasisBase: Record<string, number> = { '2Y': 3.2, '5Y': 5.5, '10Y': 8.0, '20Y': 13.5, '30Y': 19.0 };
    const baseBasis = tenorBasisBase[cfg.tenor] || 8.0;

    const entryBasis = Math.round((baseBasis + rng() * 2.0 + 0.5) * 100) / 100;
    const basisChange = (rng() - 0.45) * 3.0; // slight bias toward convergence
    const currentBasis = Math.round((entryBasis + basisChange) * 100) / 100;

    // Carry earned over holding period (positive = earned)
    const dailyCarry = (rng() * 0.08 + 0.02);  // 0.02-0.10 32nds per day
    const carry = Math.round((dailyCarry * holdingPeriodDays) * 100) / 100;

    // Roll-down: benefit from curve roll
    const rollDown = Math.round((rng() * 0.8 - 0.1) * 100) / 100;

    // P&L per contract in USD: (entry - current) * 31.25 + carry * 31.25 + roll * 31.25
    // Each 1/32nd = $31.25 per contract for TY; scale by DV01 ratio
    const tickValue: Record<string, number> = { '2Y': 15.625, '5Y': 15.625, '10Y': 31.25, '20Y': 31.25, '30Y': 31.25 };
    const tv = tickValue[cfg.tenor] || 31.25;
    const basisPnL = (entryBasis - currentBasis) * tv;
    const carryPnL = carry * tv;
    const rollPnL = rollDown * tv;
    const pnlPerContract = Math.round((basisPnL + carryPnL + rollPnL) * 100) / 100;

    const dv01Jitter = (rng() - 0.5) * 4.0;
    const dv01Exposure = Math.round((cfg.baseDV01 + dv01Jitter) * 100) / 100;

    // Annualized return: (P&L / notional margin estimate) * (365 / days)
    const marginEstimate = cfg.baseFuturesPrice * 1000 * 0.03; // ~3% margin
    const annualizedReturn = Math.round((pnlPerContract / marginEstimate * 365 / holdingPeriodDays * 100) * 100) / 100;

    return {
      ticker: cfg.ticker,
      tenor: cfg.tenor,
      entryBasis,
      currentBasis,
      carry,
      rollDown,
      pnlPerContract,
      dv01Exposure,
      holdingPeriodDays,
      annualizedReturn,
    };
  });
}

function generateHistoricalBasis(rng: () => number): HistoricalBasisEntry[] {
  const entries: HistoricalBasisEntry[] = [];
  const today = new Date();

  // Base net basis levels for each contract in 32nds
  const baseLevels = { tu: 1.8, fv: 3.6, ty: 5.8, us: 10.2, wn: 15.5 };

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateStr = d.toISOString().slice(0, 10);
    const trendComponent = (29 - i) * 0.02; // slight widening trend

    const tu = Math.round((baseLevels.tu + (rng() - 0.5) * 0.8 + trendComponent * 0.3) * 100) / 100;
    const fv = Math.round((baseLevels.fv + (rng() - 0.5) * 1.2 + trendComponent * 0.5) * 100) / 100;
    const ty = Math.round((baseLevels.ty + (rng() - 0.5) * 1.6 + trendComponent * 0.8) * 100) / 100;
    const us = Math.round((baseLevels.us + (rng() - 0.5) * 2.4 + trendComponent * 1.2) * 100) / 100;
    const wn = Math.round((baseLevels.wn + (rng() - 0.5) * 3.2 + trendComponent * 1.5) * 100) / 100;

    entries.push({ date: dateStr, tu, fv, ty, us, wn });
  }

  // Pad to exactly 30 business-day entries if needed
  while (entries.length < 30) {
    const lastEntry = entries[entries.length - 1];
    const d = new Date(lastEntry.date);
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    entries.push({
      date: d.toISOString().slice(0, 10),
      tu: Math.round((lastEntry.tu + (rng() - 0.5) * 0.4) * 100) / 100,
      fv: Math.round((lastEntry.fv + (rng() - 0.5) * 0.6) * 100) / 100,
      ty: Math.round((lastEntry.ty + (rng() - 0.5) * 0.8) * 100) / 100,
      us: Math.round((lastEntry.us + (rng() - 0.5) * 1.2) * 100) / 100,
      wn: Math.round((lastEntry.wn + (rng() - 0.5) * 1.6) * 100) / 100,
    });
  }

  return entries.slice(0, 30);
}

function generateImpliedRepoTermStructure(rng: () => number): ImpliedRepoTermStructure[] {
  const sofrBase = 4.30;

  return CONTRACTS.map((cfg) => {
    // Implied repo rates across different tenors; typically term structure is flat to slightly inverted
    const baseRate = 4.28 + (rng() - 0.5) * 0.30;

    const overnight = Math.round((baseRate + (rng() - 0.5) * 0.10) * 1000) / 1000;
    const oneWeek = Math.round((baseRate + (rng() - 0.5) * 0.08 - 0.02) * 1000) / 1000;
    const oneMonth = Math.round((baseRate + (rng() - 0.5) * 0.06 - 0.04) * 1000) / 1000;
    const threeMonth = Math.round((baseRate + (rng() - 0.5) * 0.05 - 0.06) * 1000) / 1000;
    const toDelivery = Math.round((baseRate + (rng() - 0.5) * 0.04 - 0.08) * 1000) / 1000;

    // SOFR spread: implied repo minus SOFR, in bps
    const sofrSpread = Math.round((toDelivery - sofrBase) * 100 * 10) / 10;

    return {
      tenor: cfg.tenor,
      overnight,
      oneWeek,
      oneMonth,
      threeMonth,
      toDelivery,
      sofrSpread,
    };
  });
}

function generateCalendarSpreadAnalysis(rng: () => number): CalendarSpreadAnalysis[] {
  return CONTRACTS.map((cfg) => {
    const frontJitter = (rng() - 0.5) * 0.50;
    const frontPrice = Math.round((cfg.baseFuturesPrice + frontJitter) * 1000000) / 1000000;

    // Back month: typically trades at slight discount (positive carry / contango)
    const rollSpread32nds = (rng() - 0.30) * 8.0;
    const backPrice = Math.round((frontPrice - rollSpread32nds / 32) * 1000000) / 1000000;

    const spread = Math.round(rollSpread32nds * 100) / 100;

    // Net basis differential between front and back
    const netBasisDiff = Math.round(((rng() - 0.5) * 2.4) * 100) / 100;

    // Implied roll yield: annualized
    const daysToRoll = 90;
    const impliedRollYield = Math.round((spread / 32 / frontPrice * 365 / daysToRoll * 100) * 1000) / 1000;

    // Recommendation based on spread richness
    let recommendation: 'BUY_SPREAD' | 'SELL_SPREAD' | 'NEUTRAL';
    if (impliedRollYield > 0.15) {
      recommendation = 'SELL_SPREAD';
    } else if (impliedRollYield < -0.10) {
      recommendation = 'BUY_SPREAD';
    } else {
      recommendation = 'NEUTRAL';
    }

    return {
      ticker: cfg.ticker,
      tenor: cfg.tenor,
      frontContract: cfg.contract,
      backContract: cfg.backContract,
      frontPrice,
      backPrice,
      spread,
      netBasisDiff,
      impliedRollYield,
      daysToFrontExpiry: cfg.daysToExpiry,
      recommendation,
    };
  });
}

function generateTreasuryFuturesBasisData(): TreasuryFuturesBasisResponse {
  const rng = seededRandom('treasury-futures-basis');

  const activeContracts = generateActiveContracts(rng);
  const ctdAnalysis = generateCTDAnalysis(rng);
  const deliveryOptionAnalytics = generateDeliveryOptionAnalytics(rng);
  const basisTradePnL = generateBasisTradePnL(rng);
  const historicalBasis = generateHistoricalBasis(rng);
  const impliedRepoTermStructure = generateImpliedRepoTermStructure(rng);
  const calendarSpreadAnalysis = generateCalendarSpreadAnalysis(rng);

  return {
    timestamp: new Date().toISOString(),
    activeContracts,
    ctdAnalysis,
    deliveryOptionAnalytics,
    basisTradePnL,
    historicalBasis,
    impliedRepoTermStructure,
    calendarSpreadAnalysis,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateTreasuryFuturesBasisData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TreasuryFuturesBasis] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(502).json({ error: 'Failed to generate treasury futures basis data' });
  }
});

export default router;
