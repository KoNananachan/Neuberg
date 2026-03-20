import { Router } from 'express';
import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface StressTestOverview {
  framework: string;
  scenarioType: string;
  participatingBanks: number;
  aggregateCapitalShortfallBillions: number;
  baselineCET1: number;
  stressedCET1: number;
  capitalDrawdown: number;
}

interface BankResult {
  bankName: string;
  country: string;
  totalAssetsBillions: number;
  baselineCET1Ratio: number;
  adverseCET1Ratio: number;
  severelyAdverseCET1Ratio: number;
  minimumCET1: number;
  capitalBuffer: number;
  stressedLossesBillions: number;
  loanLossRate: number;
  result: 'pass' | 'conditional-pass' | 'fail';
}

interface ScenarioAssumption {
  gdpDecline: number;
  unemploymentPeak: number;
  equityMarketDecline: number;
  housingPriceDecline: number;
  commercialREDecline: number;
  creditSpreadWideningBps: number;
  treasuryYieldChange: number;
}

interface ScenarioAssumptions {
  us: ScenarioAssumption;
  eu: ScenarioAssumption;
  global: ScenarioAssumption;
}

interface LossCategory {
  category: string;
  totalLossesBillions: number;
  lossRate: number;
  contributionPct: number;
}

interface CapitalRequirementsSummary {
  minimumCET1Required: number;
  gSIBSurchargeMin: number;
  gSIBSurchargeMax: number;
  countercyclicalBuffer: number;
  stressCapitalBufferSmall: number;
  stressCapitalBufferMedium: number;
  stressCapitalBufferLarge: number;
}

interface BankStressTestResponse {
  timestamp: string;
  overview: StressTestOverview;
  bankResults: BankResult[];
  scenarioAssumptions: ScenarioAssumptions;
  lossDistribution: LossCategory[];
  capitalRequirements: CapitalRequirementsSummary;
}

// ── Cache ──

let cache: { data: BankStressTestResponse | null; ts: number } = { data: null, ts: 0 };


// ── Bank seed data ──

interface BankSeed {
  name: string;
  country: string;
  totalAssets: number;
  baselineCET1: number;
  stressFloor: number;
  lossBase: number;
}

const BANKS: BankSeed[] = [
  { name: 'JPMorgan Chase', country: 'US', totalAssets: 3900, baselineCET1: 15.3, stressFloor: 9.1, lossBase: 42.5 },
  { name: 'Bank of America', country: 'US', totalAssets: 3200, baselineCET1: 11.8, stressFloor: 7.8, lossBase: 36.8 },
  { name: 'Citigroup', country: 'US', totalAssets: 2400, baselineCET1: 13.4, stressFloor: 8.5, lossBase: 30.2 },
  { name: 'Wells Fargo', country: 'US', totalAssets: 1900, baselineCET1: 11.2, stressFloor: 7.6, lossBase: 28.4 },
  { name: 'Goldman Sachs', country: 'US', totalAssets: 1600, baselineCET1: 14.8, stressFloor: 9.4, lossBase: 18.6 },
  { name: 'Morgan Stanley', country: 'US', totalAssets: 1200, baselineCET1: 15.6, stressFloor: 10.2, lossBase: 14.2 },
  { name: 'HSBC', country: 'UK', totalAssets: 2980, baselineCET1: 14.7, stressFloor: 10.4, lossBase: 24.8 },
  { name: 'Barclays', country: 'UK', totalAssets: 1810, baselineCET1: 13.8, stressFloor: 9.6, lossBase: 16.4 },
  { name: 'Deutsche Bank', country: 'DE', totalAssets: 1580, baselineCET1: 13.5, stressFloor: 9.2, lossBase: 18.2 },
  { name: 'BNP Paribas', country: 'FR', totalAssets: 2860, baselineCET1: 13.2, stressFloor: 9.8, lossBase: 22.6 },
  { name: 'UBS', country: 'CH', totalAssets: 1680, baselineCET1: 14.2, stressFloor: 10.6, lossBase: 15.8 },
  { name: 'Credit Agricole', country: 'FR', totalAssets: 2380, baselineCET1: 11.6, stressFloor: 9.0, lossBase: 19.4 },
  { name: 'Santander', country: 'ES', totalAssets: 1840, baselineCET1: 12.3, stressFloor: 9.4, lossBase: 17.6 },
  { name: 'ING Group', country: 'NL', totalAssets: 1020, baselineCET1: 14.5, stressFloor: 10.8, lossBase: 10.2 },
  { name: 'Societe Generale', country: 'FR', totalAssets: 1620, baselineCET1: 13.1, stressFloor: 9.1, lossBase: 15.4 },
  { name: 'Mitsubishi UFJ', country: 'JP', totalAssets: 3400, baselineCET1: 12.4, stressFloor: 8.8, lossBase: 28.6 },
  { name: 'Standard Chartered', country: 'UK', totalAssets: 820, baselineCET1: 13.9, stressFloor: 9.5, lossBase: 8.8 },
  { name: 'Royal Bank of Canada', country: 'CA', totalAssets: 1340, baselineCET1: 13.0, stressFloor: 9.6, lossBase: 12.4 },
];

// ── Generator ──

function generate(): BankStressTestResponse {
  const rng = seededRandom('bank-stress-test');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const r1 = (v: number) => Math.round(v * 10) / 10;

  // Pick framework
  const framework = rng() > 0.5 ? '2025 Fed DFAST/CCAR' : 'EBA 2025';

  // Scenario assumptions
  const scenarioAssumptions: ScenarioAssumptions = {
    us: {
      gdpDecline: r1(jitter(-6.5, 0.10)),
      unemploymentPeak: r1(jitter(10.4, 0.08)),
      equityMarketDecline: r1(jitter(-55, 0.08)),
      housingPriceDecline: r1(jitter(-28, 0.10)),
      commercialREDecline: r1(jitter(-38, 0.10)),
      creditSpreadWideningBps: Math.round(jitter(580, 0.10)),
      treasuryYieldChange: r2(jitter(-1.75, 0.12)),
    },
    eu: {
      gdpDecline: r1(jitter(-5.8, 0.10)),
      unemploymentPeak: r1(jitter(11.6, 0.08)),
      equityMarketDecline: r1(jitter(-50, 0.08)),
      housingPriceDecline: r1(jitter(-22, 0.10)),
      commercialREDecline: r1(jitter(-32, 0.10)),
      creditSpreadWideningBps: Math.round(jitter(520, 0.10)),
      treasuryYieldChange: r2(jitter(-1.20, 0.12)),
    },
    global: {
      gdpDecline: r1(jitter(-4.2, 0.10)),
      unemploymentPeak: r1(jitter(9.8, 0.08)),
      equityMarketDecline: r1(jitter(-48, 0.08)),
      housingPriceDecline: r1(jitter(-20, 0.10)),
      commercialREDecline: r1(jitter(-30, 0.10)),
      creditSpreadWideningBps: Math.round(jitter(480, 0.10)),
      treasuryYieldChange: r2(jitter(-1.40, 0.12)),
    },
  };

  // Bank results
  const bankResults: BankResult[] = BANKS.map((bank) => {
    const totalAssetsBillions = r1(jitter(bank.totalAssets, 0.03));
    const baselineCET1Ratio = r2(jitter(bank.baselineCET1, 0.03));

    // Adverse: 2-4pp drawdown from baseline
    const adverseDrawdown = r2(jitter(3.0, 0.20));
    const adverseCET1Ratio = r2(baselineCET1Ratio - adverseDrawdown);

    // Severely adverse: 4-7pp drawdown from baseline
    const severeDrawdown = r2(jitter(5.5, 0.18));
    const severelyAdverseCET1Ratio = r2(baselineCET1Ratio - severeDrawdown);

    // Minimum CET1 in the projection (slightly below severely adverse for realism)
    const minimumCET1 = r2(severelyAdverseCET1Ratio - jitter(0.3, 0.40));

    // Capital buffer above 4.5% minimum
    const capitalBuffer = r2(minimumCET1 - 4.5);

    // Stressed losses
    const stressedLossesBillions = r1(jitter(bank.lossBase, 0.12));

    // Loan loss rate
    const loanLossRate = r2(jitter(4.8, 0.20));

    // Determine result
    let result: 'pass' | 'conditional-pass' | 'fail';
    if (minimumCET1 >= 6.5) {
      result = 'pass';
    } else if (minimumCET1 >= 4.5) {
      result = 'conditional-pass';
    } else {
      result = 'fail';
    }

    return {
      bankName: bank.name,
      country: bank.country,
      totalAssetsBillions,
      baselineCET1Ratio,
      adverseCET1Ratio,
      severelyAdverseCET1Ratio,
      minimumCET1,
      capitalBuffer,
      stressedLossesBillions,
      loanLossRate,
      result,
    };
  });

  // Overview aggregates
  const avgBaseline = r2(bankResults.reduce((s, b) => s + b.baselineCET1Ratio, 0) / bankResults.length);
  const avgStressed = r2(bankResults.reduce((s, b) => s + b.severelyAdverseCET1Ratio, 0) / bankResults.length);
  const shortfall = r1(
    bankResults
      .filter((b) => b.capitalBuffer < 0)
      .reduce((s, b) => s + Math.abs(b.capitalBuffer) * (b.totalAssetsBillions / 1000), 0),
  );

  const overview: StressTestOverview = {
    framework,
    scenarioType: 'severely adverse',
    participatingBanks: bankResults.length,
    aggregateCapitalShortfallBillions: shortfall,
    baselineCET1: avgBaseline,
    stressedCET1: avgStressed,
    capitalDrawdown: r2(avgBaseline - avgStressed),
  };

  // Loss distribution by category
  const lossCategoryBases = [
    { category: 'Credit Card', base: 38.4, rate: 12.8 },
    { category: 'C&I Loans', base: 62.6, rate: 6.4 },
    { category: 'CRE', base: 54.2, rate: 9.2 },
    { category: 'Residential Mortgage', base: 48.8, rate: 4.6 },
    { category: 'Trading', base: 42.4, rate: 8.4 },
    { category: 'Other', base: 28.6, rate: 3.2 },
  ];

  const rawLossCategories = lossCategoryBases.map((c) => ({
    category: c.category,
    totalLossesBillions: r1(jitter(c.base, 0.12)),
    lossRate: r2(jitter(c.rate, 0.10)),
    contributionPct: 0,
  }));

  const totalLosses = rawLossCategories.reduce((s, c) => s + c.totalLossesBillions, 0);
  const lossDistribution: LossCategory[] = rawLossCategories.map((c) => ({
    ...c,
    contributionPct: r1((c.totalLossesBillions / totalLosses) * 100),
  }));

  // Capital requirements summary
  const capitalRequirements: CapitalRequirementsSummary = {
    minimumCET1Required: 4.5,
    gSIBSurchargeMin: 1.0,
    gSIBSurchargeMax: 3.5,
    countercyclicalBuffer: r2(jitter(0.5, 0.20)),
    stressCapitalBufferSmall: r2(jitter(2.5, 0.10)),
    stressCapitalBufferMedium: r2(jitter(3.5, 0.10)),
    stressCapitalBufferLarge: r2(jitter(5.0, 0.10)),
  };

  return {
    timestamp: new Date().toISOString(),
    overview,
    bankResults,
    scenarioAssumptions,
    lossDistribution,
    capitalRequirements,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: any) {
    console.error('[BankStressTest] Error:', err?.message || err);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate bank stress test data' });
  }
});

export default router;
