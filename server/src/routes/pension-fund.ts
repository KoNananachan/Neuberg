import { Router } from 'express';

const router = Router();

// -- Deterministic seeded PRNG --

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

// -- Fund definitions --

interface FundDef {
  name: string;
  country: string;
  totalAssets: number; // billions USD
  fundedRatio: number; // %
  discountRate: number; // %
  durationOfLiabilities: number; // years
  allocation: { equities: number; fixedIncome: number; alternatives: number; realEstate: number; cash: number; other: number };
  returnProfile: { baseYTD: number; base1Y: number; base5Y: number; base10Y: number };
  monthlyBenefitPayments: number; // billions per month
  monthlyContributions: number; // billions per month
}

const FUNDS: FundDef[] = [
  {
    name: 'CalPERS', country: 'United States', totalAssets: 502, fundedRatio: 82, discountRate: 6.8, durationOfLiabilities: 13.2,
    allocation: { equities: 50, fixedIncome: 28, alternatives: 11, realEstate: 8, cash: 2, other: 1 },
    returnProfile: { baseYTD: 5.8, base1Y: 9.2, base5Y: 7.1, base10Y: 6.8 },
    monthlyBenefitPayments: 1.95, monthlyContributions: 1.62,
  },
  {
    name: 'CalSTRS', country: 'United States', totalAssets: 318, fundedRatio: 79, discountRate: 7.0, durationOfLiabilities: 14.5,
    allocation: { equities: 48, fixedIncome: 25, alternatives: 10, realEstate: 14, cash: 2, other: 1 },
    returnProfile: { baseYTD: 5.2, base1Y: 8.8, base5Y: 6.9, base10Y: 6.5 },
    monthlyBenefitPayments: 1.35, monthlyContributions: 1.08,
  },
  {
    name: 'NY State Common Retirement Fund', country: 'United States', totalAssets: 268, fundedRatio: 95, discountRate: 5.9, durationOfLiabilities: 11.8,
    allocation: { equities: 52, fixedIncome: 23, alternatives: 14, realEstate: 8, cash: 2, other: 1 },
    returnProfile: { baseYTD: 6.4, base1Y: 10.1, base5Y: 7.8, base10Y: 7.2 },
    monthlyBenefitPayments: 1.05, monthlyContributions: 0.92,
  },
  {
    name: 'TIAA', country: 'United States', totalAssets: 345, fundedRatio: 103, discountRate: 5.5, durationOfLiabilities: 10.6,
    allocation: { equities: 42, fixedIncome: 32, alternatives: 10, realEstate: 12, cash: 3, other: 1 },
    returnProfile: { baseYTD: 4.8, base1Y: 8.1, base5Y: 6.5, base10Y: 6.2 },
    monthlyBenefitPayments: 1.45, monthlyContributions: 1.52,
  },
  {
    name: 'Florida State Board of Administration', country: 'United States', totalAssets: 215, fundedRatio: 84, discountRate: 6.7, durationOfLiabilities: 12.4,
    allocation: { equities: 55, fixedIncome: 22, alternatives: 13, realEstate: 7, cash: 2, other: 1 },
    returnProfile: { baseYTD: 5.5, base1Y: 9.5, base5Y: 7.3, base10Y: 6.9 },
    monthlyBenefitPayments: 0.88, monthlyContributions: 0.72,
  },
  {
    name: 'Texas Teachers Retirement System', country: 'United States', totalAssets: 198, fundedRatio: 78, discountRate: 7.25, durationOfLiabilities: 15.1,
    allocation: { equities: 46, fixedIncome: 27, alternatives: 15, realEstate: 9, cash: 2, other: 1 },
    returnProfile: { baseYTD: 4.9, base1Y: 8.4, base5Y: 6.6, base10Y: 6.3 },
    monthlyBenefitPayments: 0.82, monthlyContributions: 0.65,
  },
  {
    name: 'Ohio State Teachers Retirement System', country: 'United States', totalAssets: 96, fundedRatio: 81, discountRate: 7.0, durationOfLiabilities: 13.8,
    allocation: { equities: 51, fixedIncome: 26, alternatives: 10, realEstate: 10, cash: 2, other: 1 },
    returnProfile: { baseYTD: 5.1, base1Y: 8.6, base5Y: 6.7, base10Y: 6.4 },
    monthlyBenefitPayments: 0.42, monthlyContributions: 0.35,
  },
  {
    name: 'CPP Investments', country: 'Canada', totalAssets: 570, fundedRatio: 113, discountRate: 5.0, durationOfLiabilities: 16.2,
    allocation: { equities: 37, fixedIncome: 22, alternatives: 22, realEstate: 17, cash: 1, other: 1 },
    returnProfile: { baseYTD: 6.8, base1Y: 10.8, base5Y: 8.2, base10Y: 9.1 },
    monthlyBenefitPayments: 1.85, monthlyContributions: 2.15,
  },
  {
    name: 'Ontario Teachers Pension Plan', country: 'Canada', totalAssets: 250, fundedRatio: 107, discountRate: 5.4, durationOfLiabilities: 14.7,
    allocation: { equities: 35, fixedIncome: 26, alternatives: 18, realEstate: 18, cash: 2, other: 1 },
    returnProfile: { baseYTD: 5.9, base1Y: 9.4, base5Y: 7.6, base10Y: 8.3 },
    monthlyBenefitPayments: 0.92, monthlyContributions: 0.88,
  },
  {
    name: 'GPIF Japan', country: 'Japan', totalAssets: 1600, fundedRatio: 101, discountRate: 3.5, durationOfLiabilities: 18.5,
    allocation: { equities: 50, fixedIncome: 50, alternatives: 0, realEstate: 0, cash: 0, other: 0 },
    returnProfile: { baseYTD: 4.2, base1Y: 7.5, base5Y: 6.1, base10Y: 5.8 },
    monthlyBenefitPayments: 5.20, monthlyContributions: 5.45,
  },
  {
    name: 'ABP Netherlands', country: 'Netherlands', totalAssets: 540, fundedRatio: 109, discountRate: 4.5, durationOfLiabilities: 19.3,
    allocation: { equities: 39, fixedIncome: 30, alternatives: 14, realEstate: 14, cash: 2, other: 1 },
    returnProfile: { baseYTD: 5.6, base1Y: 8.9, base5Y: 7.0, base10Y: 7.4 },
    monthlyBenefitPayments: 1.72, monthlyContributions: 1.58,
  },
  {
    name: 'Norges Bank Investment Management', country: 'Norway', totalAssets: 1600, fundedRatio: 105, discountRate: 4.0, durationOfLiabilities: 20.1,
    allocation: { equities: 72, fixedIncome: 25, alternatives: 0, realEstate: 3, cash: 0, other: 0 },
    returnProfile: { baseYTD: 7.2, base1Y: 12.4, base5Y: 9.5, base10Y: 8.8 },
    monthlyBenefitPayments: 2.10, monthlyContributions: 2.85,
  },
  {
    name: 'National Pension Service of Korea', country: 'South Korea', totalAssets: 890, fundedRatio: 98, discountRate: 4.8, durationOfLiabilities: 22.4,
    allocation: { equities: 45, fixedIncome: 38, alternatives: 12, realEstate: 4, cash: 1, other: 0 },
    returnProfile: { baseYTD: 5.0, base1Y: 8.2, base5Y: 6.4, base10Y: 5.9 },
    monthlyBenefitPayments: 2.65, monthlyContributions: 3.12,
  },
  {
    name: 'APG Asset Management', country: 'Netherlands', totalAssets: 620, fundedRatio: 110, discountRate: 4.3, durationOfLiabilities: 18.9,
    allocation: { equities: 40, fixedIncome: 28, alternatives: 16, realEstate: 13, cash: 2, other: 1 },
    returnProfile: { baseYTD: 5.4, base1Y: 8.7, base5Y: 7.2, base10Y: 7.5 },
    monthlyBenefitPayments: 1.88, monthlyContributions: 1.75,
  },
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000; // 5 minutes
let cacheData: unknown = null;
let cacheTime = 0;

// -- Helpers --

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// -- Data generation --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day));

  // -- majorFunds --
  const majorFunds = FUNDS.map((fund) => {
    const totalAssets = roundTo(jitter(rng, fund.totalAssets, 0.04), 1);
    const fundedRatio = roundTo(jitter(rng, fund.fundedRatio, 0.03), 1);
    const returnYTD = roundTo(jitter(rng, fund.returnProfile.baseYTD, 0.25), 1);
    const return1Y = roundTo(jitter(rng, fund.returnProfile.base1Y, 0.2), 1);
    const return5Y = roundTo(jitter(rng, fund.returnProfile.base5Y, 0.1), 1);
    const return10Y = roundTo(jitter(rng, fund.returnProfile.base10Y, 0.08), 1);

    return {
      name: fund.name,
      country: fund.country,
      totalAssets,
      fundedRatio,
      returnYTD,
      return1Y,
      return5Y,
      return10Y,
    };
  });

  // -- assetAllocation (per fund) --
  const assetAllocation = FUNDS.map((fund) => {
    const raw = {
      equities: roundTo(jitter(rng, fund.allocation.equities, 0.04), 1),
      fixedIncome: roundTo(jitter(rng, fund.allocation.fixedIncome, 0.04), 1),
      alternatives: roundTo(jitter(rng, fund.allocation.alternatives, 0.06), 1),
      realEstate: roundTo(jitter(rng, fund.allocation.realEstate, 0.06), 1),
      cash: roundTo(jitter(rng, Math.max(fund.allocation.cash, 0.5), 0.1), 1),
      other: 0,
    };
    const allocated = raw.equities + raw.fixedIncome + raw.alternatives + raw.realEstate + raw.cash;
    raw.other = roundTo(Math.max(0, 100 - allocated), 1);

    return {
      fund: fund.name,
      equities: raw.equities,
      fixedIncome: raw.fixedIncome,
      alternatives: raw.alternatives,
      realEstate: raw.realEstate,
      cash: raw.cash,
      other: raw.other,
    };
  });

  // -- liabilityMetrics (per fund) --
  const liabilityMetrics = FUNDS.map((fund, idx) => {
    const fundAssets = majorFunds[idx].totalAssets;
    const fr = majorFunds[idx].fundedRatio / 100;
    const totalLiabilities = roundTo(fundAssets / fr, 1);
    const discountRate = roundTo(jitter(rng, fund.discountRate, 0.05), 2);
    const durationOfLiabilities = roundTo(jitter(rng, fund.durationOfLiabilities, 0.06), 1);
    // PBO is typically slightly above total liabilities for underfunded plans
    const pboMultiplier = fr < 1 ? 1 + (rng() * 0.04) : 1 - (rng() * 0.02);
    const projectedBenefitObligation = roundTo(totalLiabilities * pboMultiplier, 1);
    // ABO is typically 85-95% of PBO
    const aboRatio = 0.85 + rng() * 0.10;
    const accumulatedBenefitObligation = roundTo(projectedBenefitObligation * aboRatio, 1);

    return {
      fund: fund.name,
      totalLiabilities,
      discountRate,
      durationOfLiabilities,
      projectedBenefitObligation,
      accumulatedBenefitObligation,
    };
  });

  // -- fundedStatus --
  const fundedStatus = FUNDS.map((fund, idx) => {
    const fr = majorFunds[idx].fundedRatio;
    const assets = majorFunds[idx].totalAssets;
    const liabilities = liabilityMetrics[idx].totalLiabilities;
    const surplusOrDeficit = roundTo(assets - liabilities, 1);

    let status: 'overfunded' | 'underfunded' | 'critical';
    if (fr >= 100) {
      status = 'overfunded';
    } else if (fr >= 70) {
      status = 'underfunded';
    } else {
      status = 'critical';
    }

    // Contribution required is higher for worse funded status
    let contributionRequired = 0;
    if (status === 'underfunded') {
      contributionRequired = roundTo(Math.abs(surplusOrDeficit) * (0.05 + rng() * 0.05), 1);
    } else if (status === 'critical') {
      contributionRequired = roundTo(Math.abs(surplusOrDeficit) * (0.10 + rng() * 0.08), 1);
    }

    return {
      fund: fund.name,
      status,
      fundedRatio: fr,
      surplusOrDeficit,
      contributionRequired,
    };
  });

  // -- flowData (monthly for last 6 months, per fund) --
  const now = new Date();
  const currentMonth = now.getMonth();

  const flowData = FUNDS.map((fund) => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const monthIdx = (currentMonth - 5 + i + 12) % 12;
      const yearOffset = (currentMonth - 5 + i) < 0 ? -1 : 0;
      const year = now.getFullYear() + yearOffset;
      const label = `${MONTH_LABELS[monthIdx]} ${year}`;

      const benefitPayments = roundTo(jitter(rng, fund.monthlyBenefitPayments, 0.08), 2);
      const contributions = roundTo(jitter(rng, fund.monthlyContributions, 0.10), 2);
      const netCashFlow = roundTo(contributions - benefitPayments, 2);

      return {
        month: label,
        benefitPayments,
        contributions,
        netCashFlow,
      };
    });

    return {
      fund: fund.name,
      months,
    };
  });

  // -- performanceBenchmark --
  const performanceBenchmark = FUNDS.map((fund, idx) => {
    const fundReturn = majorFunds[idx].return1Y;

    // 60/40 portfolio benchmark: roughly equity-weighted blend
    const benchmark6040 = roundTo(4.5 + (rng() - 0.3) * 8, 1);

    // Policy benchmark: closer to fund return with small tracking error
    const trackingError = roundTo(0.5 + rng() * 2.5, 2);
    const policyBenchmark = roundTo(fundReturn + (rng() - 0.5) * trackingError * 2, 1);

    const vsBalanced = roundTo(fundReturn - benchmark6040, 1);
    const vsPolicyBenchmark = roundTo(fundReturn - policyBenchmark, 1);

    // Information ratio = active return / tracking error
    const informationRatio = trackingError > 0 ? roundTo(vsPolicyBenchmark / trackingError, 2) : 0;

    // Sharpe ratio: (return - risk-free) / volatility; assume ~5% risk-free, ~12% vol
    const riskFreeRate = 5.0;
    const volatility = roundTo(8 + rng() * 10, 1);
    const sharpeRatio = volatility > 0 ? roundTo((fundReturn - riskFreeRate) / volatility, 2) : 0;

    return {
      fund: fund.name,
      fundReturn1Y: fundReturn,
      benchmark6040,
      vsBalanced,
      policyBenchmark,
      vsPolicyBenchmark,
      trackingError,
      informationRatio,
      sharpeRatio,
    };
  });

  return {
    majorFunds,
    assetAllocation,
    liabilityMetrics,
    fundedStatus,
    flowData,
    performanceBenchmark,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

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
  } catch (err: unknown) {
    console.error('[PensionFund] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate pension fund data' });
  }
});

export default router;
