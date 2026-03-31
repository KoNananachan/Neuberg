import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface DeliverableBond {
  cusip: string;
  coupon: number;
  maturityDate: string;
  conversionFactor: number;
  basis: number;            // in 32nds
  grossBasis: number;       // in 32nds
  netBasis: number;         // in 32nds
  impliedRepoRate: number;  // %
  isCTD: boolean;
}

interface ContractBasket {
  contract: string;
  ticker: string;
  tenor: string;
  futuresPrice: number;
  deliverables: DeliverableBond[];
}

interface CTDDetail {
  contract: string;
  tenor: string;
  ctdCusip: string;
  ctdCoupon: number;
  ctdMaturity: string;
  conversionFactor: number;
  netBasis: number;
  impliedRepoRate: number;
  ctdReason: string;
  switchPointYield: number;   // yield level where CTD switches
  switchToCusip: string;
  switchToCoupon: number;
}

interface BasisTradeSummary {
  contract: string;
  tenor: string;
  netBasis: number;           // 32nds
  carry: number;              // 32nds
  roll: number;               // 32nds
  basisDV01: number;          // $ per bp
  basisNetOfCarry: number;    // 32nds
}

interface DeliveryOptionValues {
  contract: string;
  tenor: string;
  timingOption: number;       // 32nds
  qualityOption: number;      // 32nds
  endOfMonthOption: number;   // 32nds
  totalOptionValue: number;   // 32nds
}

interface HistoricalBasisPoint {
  date: string;
  netBasis: number;
  grossBasis: number;
  impliedRepo: number;
}

interface RollAnalysis {
  contract: string;
  tenor: string;
  frontMonth: string;
  frontPrice: number;
  backMonth: string;
  backPrice: number;
  calendarSpread: number;     // in 32nds
  rollYield: number;          // annualized %
}

interface BondFuturesBasisResponse {
  timestamp: string;
  deliverableBaskets: ContractBasket[];
  ctdAnalysis: CTDDetail[];
  basisTradeSummary: BasisTradeSummary[];
  deliveryOptionValues: DeliveryOptionValues[];
  historicalBasis: HistoricalBasisPoint[];
  rollAnalysis: RollAnalysis[];
}

// ── Cache ──

let cache: { data: BondFuturesBasisResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Contract & bond configuration ──

interface ContractConfig {
  contract: string;
  ticker: string;
  tenor: string;
  baseFuturesPrice: number;
  frontMonth: string;
  backMonth: string;
}

const CONTRACTS: ContractConfig[] = [
  { contract: 'ZTH6', ticker: 'ZT', tenor: '2Y',    baseFuturesPrice: 103.078125, frontMonth: 'ZTH6', backMonth: 'ZTM6' },
  { contract: 'ZFH6', ticker: 'ZF', tenor: '5Y',    baseFuturesPrice: 107.390625, frontMonth: 'ZFH6', backMonth: 'ZFM6' },
  { contract: 'ZNH6', ticker: 'ZN', tenor: '10Y',   baseFuturesPrice: 111.875000, frontMonth: 'ZNH6', backMonth: 'ZNM6' },
  { contract: 'ZBH6', ticker: 'ZB', tenor: '30Y',   baseFuturesPrice: 117.687500, frontMonth: 'ZBH6', backMonth: 'ZBM6' },
  { contract: 'UBH6', ticker: 'UB', tenor: 'Ultra',  baseFuturesPrice: 125.250000, frontMonth: 'UBH6', backMonth: 'UBM6' },
];

interface BondConfig {
  cusip: string;
  coupon: number;
  maturityDate: string;
  baseConversionFactor: number;
  baseGrossBasis: number;   // 32nds
  tenor: string;
}

const DELIVERABLE_BONDS: BondConfig[] = [
  // 2Y deliverables
  { cusip: '91282CKL5', coupon: 4.250, maturityDate: '2027-12-31', baseConversionFactor: 0.9412, baseGrossBasis: 2.8, tenor: '2Y' },
  { cusip: '91282CKP6', coupon: 4.125, maturityDate: '2028-01-31', baseConversionFactor: 0.9356, baseGrossBasis: 3.1, tenor: '2Y' },
  { cusip: '91282CKR2', coupon: 4.375, maturityDate: '2028-02-28', baseConversionFactor: 0.9478, baseGrossBasis: 2.5, tenor: '2Y' },
  { cusip: '91282CKS0', coupon: 4.000, maturityDate: '2028-03-31', baseConversionFactor: 0.9298, baseGrossBasis: 3.4, tenor: '2Y' },
  { cusip: '91282CKT8', coupon: 4.500, maturityDate: '2028-04-30', baseConversionFactor: 0.9534, baseGrossBasis: 2.2, tenor: '2Y' },
  // 5Y deliverables
  { cusip: '91282CJN3', coupon: 4.375, maturityDate: '2030-08-15', baseConversionFactor: 0.9285, baseGrossBasis: 5.4, tenor: '5Y' },
  { cusip: '91282CJR4', coupon: 4.500, maturityDate: '2030-11-15', baseConversionFactor: 0.9318, baseGrossBasis: 4.9, tenor: '5Y' },
  { cusip: '91282CJT0', coupon: 4.250, maturityDate: '2031-02-15', baseConversionFactor: 0.9215, baseGrossBasis: 5.8, tenor: '5Y' },
  { cusip: '91282CJV5', coupon: 4.625, maturityDate: '2031-05-15', baseConversionFactor: 0.9372, baseGrossBasis: 4.6, tenor: '5Y' },
  { cusip: '91282CJX1', coupon: 4.125, maturityDate: '2031-08-15', baseConversionFactor: 0.9168, baseGrossBasis: 6.1, tenor: '5Y' },
  { cusip: '91282CKA9', coupon: 4.000, maturityDate: '2031-11-15', baseConversionFactor: 0.9105, baseGrossBasis: 6.5, tenor: '5Y' },
  // 10Y deliverables
  { cusip: '91282CHZ7', coupon: 4.000, maturityDate: '2034-02-15', baseConversionFactor: 0.8847, baseGrossBasis: 8.2, tenor: '10Y' },
  { cusip: '91282CJB9', coupon: 4.250, maturityDate: '2034-08-15', baseConversionFactor: 0.8921, baseGrossBasis: 7.6, tenor: '10Y' },
  { cusip: '91282CJD5', coupon: 4.125, maturityDate: '2034-11-15', baseConversionFactor: 0.8878, baseGrossBasis: 7.9, tenor: '10Y' },
  { cusip: '91282CJF0', coupon: 3.875, maturityDate: '2035-02-15', baseConversionFactor: 0.8762, baseGrossBasis: 8.8, tenor: '10Y' },
  { cusip: '91282CJH6', coupon: 4.500, maturityDate: '2035-05-15', baseConversionFactor: 0.9015, baseGrossBasis: 7.1, tenor: '10Y' },
  { cusip: '91282CJK9', coupon: 4.375, maturityDate: '2035-08-15', baseConversionFactor: 0.8968, baseGrossBasis: 7.3, tenor: '10Y' },
  { cusip: '91282CJM5', coupon: 4.625, maturityDate: '2035-11-15', baseConversionFactor: 0.9082, baseGrossBasis: 6.8, tenor: '10Y' },
  // 30Y deliverables
  { cusip: '912810TN8', coupon: 4.500, maturityDate: '2054-05-15', baseConversionFactor: 0.8312, baseGrossBasis: 18.4, tenor: '30Y' },
  { cusip: '912810TP3', coupon: 4.375, maturityDate: '2054-08-15', baseConversionFactor: 0.8256, baseGrossBasis: 19.1, tenor: '30Y' },
  { cusip: '912810TR9', coupon: 4.250, maturityDate: '2054-11-15', baseConversionFactor: 0.8198, baseGrossBasis: 19.8, tenor: '30Y' },
  { cusip: '912810TT5', coupon: 4.625, maturityDate: '2055-02-15', baseConversionFactor: 0.8385, baseGrossBasis: 17.6, tenor: '30Y' },
  { cusip: '912810TV0', coupon: 4.750, maturityDate: '2055-05-15', baseConversionFactor: 0.8442, baseGrossBasis: 17.0, tenor: '30Y' },
  { cusip: '912810TX6', coupon: 4.125, maturityDate: '2055-08-15', baseConversionFactor: 0.8142, baseGrossBasis: 20.5, tenor: '30Y' },
  // Ultra Bond deliverables
  { cusip: '912810TY4', coupon: 4.875, maturityDate: '2058-02-15', baseConversionFactor: 0.7985, baseGrossBasis: 24.2, tenor: 'Ultra' },
  { cusip: '912810UA5', coupon: 4.750, maturityDate: '2058-05-15', baseConversionFactor: 0.7928, baseGrossBasis: 25.0, tenor: 'Ultra' },
  { cusip: '912810UC1', coupon: 5.000, maturityDate: '2058-08-15', baseConversionFactor: 0.8045, baseGrossBasis: 23.5, tenor: 'Ultra' },
  { cusip: '912810UE7', coupon: 4.625, maturityDate: '2058-11-15', baseConversionFactor: 0.7868, baseGrossBasis: 25.8, tenor: 'Ultra' },
  { cusip: '912810UG2', coupon: 5.125, maturityDate: '2059-02-15', baseConversionFactor: 0.8102, baseGrossBasis: 22.9, tenor: 'Ultra' },
  { cusip: '912810UH0', coupon: 4.500, maturityDate: '2059-05-15', baseConversionFactor: 0.7812, baseGrossBasis: 26.5, tenor: 'Ultra' },
];

// ── Data generation ──

function generateDeliverableBaskets(rng: () => number): ContractBasket[] {
  return CONTRACTS.map((cfg) => {
    const bonds = DELIVERABLE_BONDS.filter((b) => b.tenor === cfg.tenor);
    const futJitter = (rng() - 0.5) * 0.375;
    const futuresPrice = Math.round((cfg.baseFuturesPrice + futJitter) * 1000000) / 1000000;

    // Generate deliverable bonds; track min net basis for CTD assignment
    const deliverables: (DeliverableBond & { _netBasisRaw: number })[] = bonds.map((bond) => {
      const cfJitter = (rng() - 0.5) * 0.004;
      const conversionFactor = Math.round((bond.baseConversionFactor + cfJitter) * 10000) / 10000;

      const grossBasisJitter = (rng() - 0.5) * 1.8;
      const grossBasis = Math.round((bond.baseGrossBasis + grossBasisJitter) * 100) / 100;

      // Basis in 32nds (similar to gross basis but with slightly different jitter)
      const basis = Math.round((grossBasis + (rng() - 0.5) * 0.8) * 100) / 100;

      // Net basis = gross basis minus carry
      const carryComponent = rng() * 2.0 + 0.8;
      const netBasis = Math.round((grossBasis - carryComponent) * 100) / 100;

      // Implied repo rate: higher = more deliverable advantage
      const baseImpliedRepo = 4.28 + (rng() - 0.5) * 0.45;
      const impliedRepoRate = Math.round(baseImpliedRepo * 1000) / 1000;

      return {
        cusip: bond.cusip,
        coupon: bond.coupon,
        maturityDate: bond.maturityDate,
        conversionFactor,
        basis,
        grossBasis,
        netBasis,
        impliedRepoRate,
        isCTD: false,
        _netBasisRaw: netBasis,
      };
    });

    // Assign CTD: bond with lowest (most negative or least positive) net basis
    if (deliverables.length > 0) {
      let ctdIdx = 0;
      for (let i = 1; i < deliverables.length; i++) {
        if (deliverables[i]._netBasisRaw < deliverables[ctdIdx]._netBasisRaw) {
          ctdIdx = i;
        }
      }
      deliverables[ctdIdx].isCTD = true;
    }

    // Strip internal field
    const cleaned: DeliverableBond[] = deliverables.map(({ _netBasisRaw, ...rest }) => rest);

    return {
      contract: cfg.contract,
      ticker: cfg.ticker,
      tenor: cfg.tenor,
      futuresPrice,
      deliverables: cleaned,
    };
  });
}

function generateCTDAnalysis(baskets: ContractBasket[], rng: () => number): CTDDetail[] {
  return baskets.map((basket) => {
    const ctd = basket.deliverables.find((d) => d.isCTD);
    if (!ctd) {
      // Fallback to first bond
      const fallback = basket.deliverables[0];
      return {
        contract: basket.contract,
        tenor: basket.tenor,
        ctdCusip: fallback.cusip,
        ctdCoupon: fallback.coupon,
        ctdMaturity: fallback.maturityDate,
        conversionFactor: fallback.conversionFactor,
        netBasis: fallback.netBasis,
        impliedRepoRate: fallback.impliedRepoRate,
        ctdReason: 'Lowest net basis in deliverable basket',
        switchPointYield: Math.round((3.80 + rng() * 1.2) * 100) / 100,
        switchToCusip: basket.deliverables.length > 1 ? basket.deliverables[1].cusip : fallback.cusip,
        switchToCoupon: basket.deliverables.length > 1 ? basket.deliverables[1].coupon : fallback.coupon,
      };
    }

    // Find the second-cheapest bond for switch analysis
    const nonCTD = basket.deliverables
      .filter((d) => !d.isCTD)
      .sort((a, b) => a.netBasis - b.netBasis);
    const secondCheapest = nonCTD[0] || ctd;

    // CTD reason based on coupon/duration characteristics
    const reasons: string[] = [];
    if (ctd.coupon <= 4.25) {
      reasons.push('Low coupon favors delivery in rising rate environment');
    } else {
      reasons.push('High coupon with favorable conversion factor ratio');
    }
    reasons.push(`Highest implied repo rate at ${ctd.impliedRepoRate.toFixed(3)}%`);
    reasons.push(`Net basis ${ctd.netBasis.toFixed(2)}/32nds is tightest in basket`);

    // Switch point: yield level where CTD changes
    const switchPointYield = Math.round((3.80 + rng() * 1.2) * 100) / 100;

    return {
      contract: basket.contract,
      tenor: basket.tenor,
      ctdCusip: ctd.cusip,
      ctdCoupon: ctd.coupon,
      ctdMaturity: ctd.maturityDate,
      conversionFactor: ctd.conversionFactor,
      netBasis: ctd.netBasis,
      impliedRepoRate: ctd.impliedRepoRate,
      ctdReason: reasons.join('; '),
      switchPointYield,
      switchToCusip: secondCheapest.cusip,
      switchToCoupon: secondCheapest.coupon,
    };
  });
}

function generateBasisTradeSummary(baskets: ContractBasket[], rng: () => number): BasisTradeSummary[] {
  return baskets.map((basket) => {
    const ctd = basket.deliverables.find((d) => d.isCTD) || basket.deliverables[0];
    const netBasis = ctd.netBasis;

    // Carry: accrued interest income minus financing cost, in 32nds
    const carry = Math.round((rng() * 2.5 + 0.5) * 100) / 100;

    // Roll: calendar spread contribution in 32nds
    const roll = Math.round((rng() * 1.5 - 0.3) * 100) / 100;

    // Basis DV01: dollar sensitivity of basis to 1bp yield change
    const tenorMultiplier: Record<string, number> = { '2Y': 38, '5Y': 46, '10Y': 68, '30Y': 148, 'Ultra': 195 };
    const baseDV01 = tenorMultiplier[basket.tenor] || 68;
    const basisDV01 = Math.round((baseDV01 + (rng() - 0.5) * 8) * 100) / 100;

    // Basis net of carry
    const basisNetOfCarry = Math.round((netBasis - carry) * 100) / 100;

    return {
      contract: basket.contract,
      tenor: basket.tenor,
      netBasis,
      carry,
      roll,
      basisDV01,
      basisNetOfCarry,
    };
  });
}

function generateDeliveryOptionValues(rng: () => number): DeliveryOptionValues[] {
  return CONTRACTS.map((cfg) => {
    // Timing option: value of choosing delivery date within delivery month
    // Larger for longer-duration contracts
    const tenorScale: Record<string, number> = { '2Y': 0.3, '5Y': 0.6, '10Y': 1.2, '30Y': 2.8, 'Ultra': 3.5 };
    const scale = tenorScale[cfg.tenor] || 1.0;

    const timingOption = Math.round((scale * (0.8 + rng() * 0.4)) * 100) / 100;

    // Quality option: value of choosing which bond to deliver
    const qualityOption = Math.round((scale * (1.2 + rng() * 0.6)) * 100) / 100;

    // End-of-month option: wild card play in last 7 business days
    const endOfMonthOption = Math.round((scale * (0.4 + rng() * 0.3)) * 100) / 100;

    const totalOptionValue = Math.round((timingOption + qualityOption + endOfMonthOption) * 100) / 100;

    return {
      contract: cfg.contract,
      tenor: cfg.tenor,
      timingOption,
      qualityOption,
      endOfMonthOption,
      totalOptionValue,
    };
  });
}

function generateHistoricalBasis(rng: () => number): HistoricalBasisPoint[] {
  const points: HistoricalBasisPoint[] = [];
  const today = new Date();
  const baseNetBasis = 5.2;   // 10Y net basis starting level in 32nds
  const baseGrossBasis = 7.8;
  const baseImpliedRepo = 4.30;

  for (let i = 19; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateStr = d.toISOString().slice(0, 10);

    const netDrift = (rng() - 0.5) * 1.2;
    const trendComponent = (19 - i) * 0.03; // slight trend
    const netBasis = Math.round((baseNetBasis + netDrift + trendComponent) * 100) / 100;

    const grossDrift = (rng() - 0.5) * 1.0;
    const grossBasis = Math.round((baseGrossBasis + grossDrift + trendComponent * 0.8) * 100) / 100;

    const repoJitter = (rng() - 0.5) * 0.12;
    const impliedRepo = Math.round((baseImpliedRepo + repoJitter) * 1000) / 1000;

    points.push({ date: dateStr, netBasis, grossBasis, impliedRepo });
  }

  // Ensure we have exactly 20 points (pad if weekends removed too many)
  while (points.length < 20) {
    const lastPoint = points[points.length - 1];
    const d = new Date(lastPoint.date);
    d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().slice(0, 10);
    points.push({
      date: dateStr,
      netBasis: Math.round((lastPoint.netBasis + (rng() - 0.5) * 0.5) * 100) / 100,
      grossBasis: Math.round((lastPoint.grossBasis + (rng() - 0.5) * 0.4) * 100) / 100,
      impliedRepo: Math.round((lastPoint.impliedRepo + (rng() - 0.5) * 0.05) * 1000) / 1000,
    });
  }

  return points.slice(0, 20);
}

function generateRollAnalysis(rng: () => number): RollAnalysis[] {
  return CONTRACTS.map((cfg) => {
    const frontJitter = (rng() - 0.5) * 0.5;
    const frontPrice = Math.round((cfg.baseFuturesPrice + frontJitter) * 1000000) / 1000000;

    // Back month typically trades at a discount (positive carry) or premium (negative carry)
    const rollSpread32nds = (rng() - 0.3) * 8; // usually slightly positive (contango)
    const backPrice = Math.round((frontPrice - rollSpread32nds / 32) * 1000000) / 1000000;

    const calendarSpread = Math.round(rollSpread32nds * 100) / 100;

    // Roll yield: annualized return from rolling the position
    // Approximate: (calendar spread / front price) * (365 / days_to_roll) * 100
    const daysToRoll = 90; // quarterly rolls
    const rollYield = Math.round((calendarSpread / 32 / frontPrice * 365 / daysToRoll * 100) * 1000) / 1000;

    return {
      contract: cfg.contract,
      tenor: cfg.tenor,
      frontMonth: cfg.frontMonth,
      frontPrice,
      backMonth: cfg.backMonth,
      backPrice,
      calendarSpread,
      rollYield,
    };
  });
}

function generateBondFuturesBasisData(): BondFuturesBasisResponse {
  const rng = seededRandom('bond-futures-basis');

  const deliverableBaskets = generateDeliverableBaskets(rng);
  const ctdAnalysis = generateCTDAnalysis(deliverableBaskets, rng);
  const basisTradeSummary = generateBasisTradeSummary(deliverableBaskets, rng);
  const deliveryOptionValues = generateDeliveryOptionValues(rng);
  const historicalBasis = generateHistoricalBasis(rng);
  const rollAnalysis = generateRollAnalysis(rng);

  return {
    timestamp: new Date().toISOString(),
    deliverableBaskets,
    ctdAnalysis,
    basisTradeSummary,
    deliveryOptionValues,
    historicalBasis,
    rollAnalysis,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateBondFuturesBasisData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[BondFuturesBasis] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate bond futures basis data' });
  }
});

export default router;
