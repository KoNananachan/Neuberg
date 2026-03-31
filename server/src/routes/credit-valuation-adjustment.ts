import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface CounterpartyCVA {
  name: string;
  rating: string;
  cdsSpread: number;
  pd: number;
  lgd: number;
  exposureAtDefault: number;
  cvaCharge: number;
  dva: number;
  bilateralCVA: number;
  dailyChange: number;
  weeklyChange: number;
}

interface NettingSetBreakdown {
  product: string;
  tradeCount: number;
  grossNotional: number;
  netExposure: number;
  cvaCharge: number;
  avgTenor: number;
  pctOfTotalCVA: number;
}

interface CreditSpreadCurvePoint {
  tenor: string;
  tenorYears: number;
  spread: number;
}

interface CounterpartyCreditSpreadCurve {
  counterparty: string;
  rating: string;
  curve: CreditSpreadCurvePoint[];
}

interface CVAVaRMetrics {
  cvaVaR99_1d: number;
  cvaVaR99_10d: number;
  cvaES99_1d: number;
  stressedCVAVaR99_1d: number;
  stressedCVAVaR99_10d: number;
  stressedCVAES99_1d: number;
  capitalMultiplier: number;
  regulatoryCapitalCharge: number;
  incremental: number;
  diversificationBenefit: number;
}

interface WrongWayRiskEntry {
  counterparty: string;
  tradeType: string;
  notional: number;
  correlation: number;
  additionalCVA: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigant: string;
}

interface PortfolioSummary {
  totalGrossExposure: number;
  totalNetExposure: number;
  totalCVA: number;
  totalDVA: number;
  bilateralCVA: number;
  nettingBenefit: number;
  collateralBenefit: number;
  counterpartyCount: number;
}

interface CreditValuationAdjustmentResponse {
  counterparties: CounterpartyCVA[];
  nettingSetBreakdown: NettingSetBreakdown[];
  creditSpreadCurves: CounterpartyCreditSpreadCurve[];
  cvaVaR: CVAVaRMetrics;
  wrongWayRisk: WrongWayRiskEntry[];
  portfolioSummary: PortfolioSummary;
  timestamp: string;
}

// ── Cache ──

let cache: { data: CreditValuationAdjustmentResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Counterparty configuration ──

interface CounterpartyConfig {
  name: string;
  rating: string;
  baseCdsSpread: number;
  basePd: number;
  baseLgd: number;
  baseEAD: number;
  baseCVA: number;
  baseDVA: number;
}

const COUNTERPARTY_CONFIGS: CounterpartyConfig[] = [
  { name: 'JPMorgan Chase',              rating: 'AA-',  baseCdsSpread: 48,  basePd: 0.25, baseLgd: 45, baseEAD: 4850, baseCVA: 28.5, baseDVA: 12.3 },
  { name: 'Goldman Sachs',               rating: 'A+',   baseCdsSpread: 65,  basePd: 0.42, baseLgd: 48, baseEAD: 3920, baseCVA: 35.2, baseDVA: 10.1 },
  { name: 'Morgan Stanley',              rating: 'A+',   baseCdsSpread: 62,  basePd: 0.40, baseLgd: 47, baseEAD: 3410, baseCVA: 31.8, baseDVA: 9.4  },
  { name: 'Citigroup',                   rating: 'A',    baseCdsSpread: 72,  basePd: 0.55, baseLgd: 50, baseEAD: 3780, baseCVA: 42.1, baseDVA: 11.2 },
  { name: 'Bank of America',             rating: 'AA-',  baseCdsSpread: 52,  basePd: 0.28, baseLgd: 44, baseEAD: 4120, baseCVA: 26.4, baseDVA: 13.5 },
  { name: 'Barclays',                    rating: 'A',    baseCdsSpread: 78,  basePd: 0.62, baseLgd: 52, baseEAD: 2680, baseCVA: 38.7, baseDVA: 7.8  },
  { name: 'Deutsche Bank',               rating: 'A-',   baseCdsSpread: 105, basePd: 1.15, baseLgd: 55, baseEAD: 2140, baseCVA: 45.3, baseDVA: 6.1  },
  { name: 'UBS',                         rating: 'A+',   baseCdsSpread: 58,  basePd: 0.38, baseLgd: 46, baseEAD: 2950, baseCVA: 29.6, baseDVA: 8.9  },
  { name: 'BNP Paribas',                 rating: 'A+',   baseCdsSpread: 68,  basePd: 0.48, baseLgd: 49, baseEAD: 2520, baseCVA: 33.4, baseDVA: 7.2  },
  { name: 'HSBC',                        rating: 'AA-',  baseCdsSpread: 45,  basePd: 0.22, baseLgd: 43, baseEAD: 3560, baseCVA: 24.8, baseDVA: 11.7 },
  { name: 'Credit Suisse (successor)',   rating: 'BBB+', baseCdsSpread: 140, basePd: 1.85, baseLgd: 58, baseEAD: 1680, baseCVA: 48.6, baseDVA: 4.8  },
  { name: 'Societe Generale',            rating: 'A',    baseCdsSpread: 82,  basePd: 0.68, baseLgd: 51, baseEAD: 2080, baseCVA: 33.9, baseDVA: 5.9  },
  { name: 'Nomura',                      rating: 'A-',   baseCdsSpread: 88,  basePd: 0.75, baseLgd: 52, baseEAD: 1890, baseCVA: 31.7, baseDVA: 5.6  },
  { name: 'Standard Chartered',          rating: 'A',    baseCdsSpread: 74,  basePd: 0.58, baseLgd: 49, baseEAD: 1750, baseCVA: 26.2, baseDVA: 4.1  },
];

// ── Netting set product configuration ──

interface NettingProductConfig {
  product: string;
  baseTradeCount: number;
  baseGrossNotional: number;
  baseNetExposure: number;
  baseCVA: number;
  baseAvgTenor: number;
}

const NETTING_PRODUCT_CONFIGS: NettingProductConfig[] = [
  { product: 'Interest Rate Swaps',  baseTradeCount: 12400, baseGrossNotional: 485000, baseNetExposure: 18200, baseCVA: 168.5, baseAvgTenor: 7.5 },
  { product: 'Credit Default Swaps', baseTradeCount: 4800,  baseGrossNotional: 142000, baseNetExposure: 8600,  baseCVA: 132.8, baseAvgTenor: 5.2 },
  { product: 'FX Forwards',          baseTradeCount: 18600, baseGrossNotional: 238000, baseNetExposure: 6100,  baseCVA: 64.3,  baseAvgTenor: 0.8 },
  { product: 'Equity Derivatives',   baseTradeCount: 6200,  baseGrossNotional: 95000,  baseNetExposure: 5400,  baseCVA: 78.6,  baseAvgTenor: 3.2 },
];

// ── Credit spread curve configuration ──

const SPREAD_CURVE_COUNTERPARTIES = ['JPMorgan Chase', 'Goldman Sachs', 'Deutsche Bank', 'Credit Suisse (successor)', 'HSBC'] as const;

const TENOR_POINTS = [
  { tenor: '6M',  tenorYears: 0.5 },
  { tenor: '1Y',  tenorYears: 1   },
  { tenor: '2Y',  tenorYears: 2   },
  { tenor: '3Y',  tenorYears: 3   },
  { tenor: '5Y',  tenorYears: 5   },
  { tenor: '7Y',  tenorYears: 7   },
  { tenor: '10Y', tenorYears: 10  },
  { tenor: '15Y', tenorYears: 15  },
  { tenor: '20Y', tenorYears: 20  },
  { tenor: '30Y', tenorYears: 30  },
];

// ── Wrong-way risk configuration ──

interface WWRConfig {
  counterparty: string;
  tradeType: string;
  baseNotional: number;
  baseCorrelation: number;
  baseAdditionalCVA: number;
  mitigant: string;
}

const WWR_CONFIGS: WWRConfig[] = [
  { counterparty: 'Deutsche Bank',             tradeType: 'CDS on European Financials',   baseNotional: 850,  baseCorrelation: 0.72, baseAdditionalCVA: 18.4, mitigant: 'Daily margining + 10% haircut'         },
  { counterparty: 'Credit Suisse (successor)', tradeType: 'CDS on Financial Index',       baseNotional: 780,  baseCorrelation: 0.78, baseAdditionalCVA: 22.5, mitigant: 'CCP cleared position'                  },
  { counterparty: 'Barclays',                  tradeType: 'CDS on UK Sovereigns',         baseNotional: 620,  baseCorrelation: 0.58, baseAdditionalCVA: 12.1, mitigant: 'Bilateral netting + threshold trigger'  },
  { counterparty: 'Citigroup',                 tradeType: 'EM Sovereign CDS',             baseNotional: 540,  baseCorrelation: 0.45, baseAdditionalCVA: 8.7,  mitigant: 'Notional limit + weekly rebalance'      },
  { counterparty: 'Societe Generale',          tradeType: 'Euro Stoxx Equity Derivatives', baseNotional: 410,  baseCorrelation: 0.55, baseAdditionalCVA: 9.8,  mitigant: 'Collateral with 15% over-margin'       },
  { counterparty: 'Nomura',                    tradeType: 'Nikkei Equity Options',        baseNotional: 350,  baseCorrelation: 0.42, baseAdditionalCVA: 6.9,  mitigant: 'Weekly margin call + break clause'      },
  { counterparty: 'Goldman Sachs',             tradeType: 'Leveraged Loan TRS',           baseNotional: 680,  baseCorrelation: 0.38, baseAdditionalCVA: 7.2,  mitigant: 'CSA with zero threshold'               },
  { counterparty: 'Morgan Stanley',            tradeType: 'US Bank CDS basket',           baseNotional: 520,  baseCorrelation: 0.51, baseAdditionalCVA: 10.5, mitigant: 'Novation to CCP planned'               },
];

// ── Data generation ──

function generateCounterparties(rng: () => number): CounterpartyCVA[] {
  return COUNTERPARTY_CONFIGS.map((cfg) => {
    const spreadJitter = (rng() - 0.5) * cfg.baseCdsSpread * 0.15;
    const cdsSpread = Math.round(cfg.baseCdsSpread + spreadJitter);

    const pdJitter = (rng() - 0.5) * cfg.basePd * 0.18;
    const pd = Math.round((cfg.basePd + pdJitter) * 100) / 100;

    const lgdJitter = (rng() - 0.5) * cfg.baseLgd * 0.08;
    const lgd = Math.round((cfg.baseLgd + lgdJitter) * 10) / 10;

    const eadJitter = (rng() - 0.5) * cfg.baseEAD * 0.10;
    const exposureAtDefault = Math.round(cfg.baseEAD + eadJitter);

    const cvaJitter = (rng() - 0.5) * cfg.baseCVA * 0.14;
    const cvaCharge = Math.round((cfg.baseCVA + cvaJitter) * 10) / 10;

    const dvaJitter = (rng() - 0.5) * cfg.baseDVA * 0.12;
    const dva = Math.round((cfg.baseDVA + dvaJitter) * 10) / 10;

    const bilateralCVA = Math.round((cvaCharge - dva) * 10) / 10;

    const dailyChange = Math.round((rng() - 0.5) * 4 * 100) / 100;
    const weeklyChange = Math.round((rng() - 0.5) * 10 * 100) / 100;

    return {
      name: cfg.name,
      rating: cfg.rating,
      cdsSpread,
      pd,
      lgd,
      exposureAtDefault,
      cvaCharge,
      dva,
      bilateralCVA,
      dailyChange,
      weeklyChange,
    };
  });
}

function generateNettingSetBreakdown(rng: () => number): NettingSetBreakdown[] {
  const entries = NETTING_PRODUCT_CONFIGS.map((cfg) => {
    const countJitter = Math.floor((rng() - 0.5) * cfg.baseTradeCount * 0.10);
    const tradeCount = cfg.baseTradeCount + countJitter;

    const notionalJitter = (rng() - 0.5) * cfg.baseGrossNotional * 0.08;
    const grossNotional = Math.round(cfg.baseGrossNotional + notionalJitter);

    const netJitter = (rng() - 0.5) * cfg.baseNetExposure * 0.12;
    const netExposure = Math.round(cfg.baseNetExposure + netJitter);

    const cvaJitter = (rng() - 0.5) * cfg.baseCVA * 0.14;
    const cvaCharge = Math.round((cfg.baseCVA + cvaJitter) * 10) / 10;

    const tenorJitter = (rng() - 0.5) * cfg.baseAvgTenor * 0.15;
    const avgTenor = Math.round((cfg.baseAvgTenor + tenorJitter) * 10) / 10;

    return {
      product: cfg.product,
      tradeCount,
      grossNotional,
      netExposure,
      cvaCharge,
      avgTenor,
      pctOfTotalCVA: 0, // calculated below
    };
  });

  const totalCVA = entries.reduce((sum, e) => sum + e.cvaCharge, 0);
  for (const entry of entries) {
    entry.pctOfTotalCVA = totalCVA > 0
      ? Math.round((entry.cvaCharge / totalCVA) * 1000) / 10
      : 0;
  }

  return entries;
}

function generateCreditSpreadCurves(rng: () => number): CounterpartyCreditSpreadCurve[] {
  return SPREAD_CURVE_COUNTERPARTIES.map((name) => {
    const cfg = COUNTERPARTY_CONFIGS.find((c) => c.name === name);
    const rating = cfg ? cfg.rating : 'NR';
    const baseSpread5y = cfg ? cfg.baseCdsSpread : 80;

    const curve: CreditSpreadCurvePoint[] = TENOR_POINTS.map((tp) => {
      // Model term structure: shorter tenors are typically tighter,
      // long end flattens with slight inversion possible for distressed names
      let tenorMultiplier: number;
      if (tp.tenorYears <= 1) {
        tenorMultiplier = 0.55 + tp.tenorYears * 0.3;
      } else if (tp.tenorYears <= 5) {
        tenorMultiplier = 0.85 + (tp.tenorYears - 1) * 0.0375;
      } else if (tp.tenorYears <= 10) {
        tenorMultiplier = 1.0 + (tp.tenorYears - 5) * 0.025;
      } else {
        // Long end: gradual flattening
        tenorMultiplier = 1.125 + (tp.tenorYears - 10) * 0.008;
      }

      const baseSpread = baseSpread5y * tenorMultiplier;
      const jitter = (rng() - 0.5) * baseSpread * 0.10;
      const spread = Math.round((baseSpread + jitter) * 10) / 10;

      return {
        tenor: tp.tenor,
        tenorYears: tp.tenorYears,
        spread,
      };
    });

    return { counterparty: name, rating, curve };
  });
}

function generateCVAVaR(rng: () => number, totalCVA: number): CVAVaRMetrics {
  // CVA VaR is typically 15-25% of total CVA for 99% 1-day
  const baseVaR1d = totalCVA * (0.18 + (rng() - 0.5) * 0.06);
  const cvaVaR99_1d = Math.round(baseVaR1d * 10) / 10;

  // 10-day VaR scales by sqrt(10)
  const cvaVaR99_10d = Math.round(cvaVaR99_1d * Math.sqrt(10) * 10) / 10;

  // Expected shortfall is typically 1.2-1.5x VaR
  const esMultiplier = 1.25 + (rng() - 0.5) * 0.20;
  const cvaES99_1d = Math.round(cvaVaR99_1d * esMultiplier * 10) / 10;

  // Stressed CVA VaR uses a stressed calibration window, typically 1.5-2.5x normal
  const stressMultiplier = 1.8 + (rng() - 0.5) * 0.6;
  const stressedCVAVaR99_1d = Math.round(cvaVaR99_1d * stressMultiplier * 10) / 10;
  const stressedCVAVaR99_10d = Math.round(stressedCVAVaR99_1d * Math.sqrt(10) * 10) / 10;
  const stressedCVAES99_1d = Math.round(stressedCVAVaR99_1d * esMultiplier * 10) / 10;

  // Basel III capital multiplier (mc x ms) typically 3-5
  const capitalMultiplier = Math.round((3.0 + rng() * 1.5) * 100) / 100;

  // Regulatory capital = multiplier * max(recent VaR, stressed VaR) + incremental
  const maxVaR10d = Math.max(cvaVaR99_10d, stressedCVAVaR99_10d);
  const incremental = Math.round(totalCVA * (0.04 + (rng() - 0.5) * 0.02) * 10) / 10;
  const regulatoryCapitalCharge = Math.round((capitalMultiplier * maxVaR10d + incremental) * 10) / 10;

  // Diversification benefit: 20-40% reduction from standalone sum
  const diversificationBenefit = Math.round((0.28 + (rng() - 0.5) * 0.12) * 1000) / 10;

  return {
    cvaVaR99_1d,
    cvaVaR99_10d,
    cvaES99_1d,
    stressedCVAVaR99_1d,
    stressedCVAVaR99_10d,
    stressedCVAES99_1d,
    capitalMultiplier,
    regulatoryCapitalCharge,
    incremental,
    diversificationBenefit,
  };
}

function generateWrongWayRisk(rng: () => number): WrongWayRiskEntry[] {
  return WWR_CONFIGS.map((cfg) => {
    const notionalJitter = (rng() - 0.5) * cfg.baseNotional * 0.15;
    const notional = Math.round(cfg.baseNotional + notionalJitter);

    const corrJitter = (rng() - 0.5) * 0.10;
    const correlation = Math.round(
      Math.max(0.10, Math.min(0.95, cfg.baseCorrelation + corrJitter)) * 100
    ) / 100;

    const addlCVAJitter = (rng() - 0.5) * cfg.baseAdditionalCVA * 0.20;
    const additionalCVA = Math.round((cfg.baseAdditionalCVA + addlCVAJitter) * 10) / 10;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (correlation >= 0.75) {
      riskLevel = 'CRITICAL';
    } else if (correlation >= 0.60) {
      riskLevel = 'HIGH';
    } else if (correlation >= 0.45) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    return {
      counterparty: cfg.counterparty,
      tradeType: cfg.tradeType,
      notional,
      correlation,
      additionalCVA,
      riskLevel,
      mitigant: cfg.mitigant,
    };
  });
}

function generatePortfolioSummary(
  counterparties: CounterpartyCVA[],
  rng: () => number
): PortfolioSummary {
  const totalGrossExposure = Math.round(
    counterparties.reduce((sum, cp) => sum + cp.exposureAtDefault, 0) * 1.35
  );
  const totalNetExposure = Math.round(
    counterparties.reduce((sum, cp) => sum + cp.exposureAtDefault, 0)
  );

  const totalCVA = Math.round(counterparties.reduce((sum, cp) => sum + cp.cvaCharge, 0) * 10) / 10;
  const totalDVA = Math.round(counterparties.reduce((sum, cp) => sum + cp.dva, 0) * 10) / 10;
  const bilateralCVA = Math.round((totalCVA - totalDVA) * 10) / 10;

  const nettingBenefitBase = totalGrossExposure - totalNetExposure;
  const nettingJitter = (rng() - 0.5) * nettingBenefitBase * 0.05;
  const nettingBenefit = Math.round(nettingBenefitBase + nettingJitter);

  const collateralBase = totalNetExposure * 0.38;
  const collateralJitter = (rng() - 0.5) * collateralBase * 0.08;
  const collateralBenefit = Math.round(collateralBase + collateralJitter);

  return {
    totalGrossExposure,
    totalNetExposure,
    totalCVA,
    totalDVA,
    bilateralCVA,
    nettingBenefit,
    collateralBenefit,
    counterpartyCount: counterparties.length,
  };
}

// ── Main data generator ──

function generateCreditValuationAdjustmentData(): CreditValuationAdjustmentResponse {
  const rng = seededRandom('credit-valuation-adjustment');

  const counterparties = generateCounterparties(rng);
  const nettingSetBreakdown = generateNettingSetBreakdown(rng);
  const creditSpreadCurves = generateCreditSpreadCurves(rng);
  const wrongWayRisk = generateWrongWayRisk(rng);
  const portfolioSummary = generatePortfolioSummary(counterparties, rng);
  const cvaVaR = generateCVAVaR(rng, portfolioSummary.totalCVA);
  const timestamp = new Date().toISOString();

  return {
    counterparties,
    nettingSetBreakdown,
    creditSpreadCurves,
    cvaVaR,
    wrongWayRisk,
    portfolioSummary,
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

    const data = generateCreditValuationAdjustmentData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CreditValuationAdjustment] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(502).json({ error: 'Failed to generate credit valuation adjustment data' });
  }
});

export default router;
