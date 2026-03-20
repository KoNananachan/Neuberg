import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Types ──

interface GlobalClimateRiskSummary {
  totalAssetsAtRiskTrillions: number;
  physicalRiskExposure: number;
  transitionRiskExposure: number;
  carbonPriceEUR: number;
  carbonPriceUSD: number;
  globalTemperatureAnomaly: number;
}

interface SectorRiskAssessment {
  sector: string;
  physicalRiskScore: number;
  transitionRiskScore: number;
  strandedAssetRiskBillions: number;
  carbonIntensity: number;
  regulatoryExposure: 'low' | 'medium' | 'high' | 'critical';
}

interface RegionalPhysicalRisk {
  region: string;
  floodRisk: number;
  droughtRisk: number;
  heatStressRisk: number;
  seaLevelRiseRisk: number;
  wildfireRisk: number;
  insuranceLossesBillions: number;
  populationExposedMillions: number;
}

interface CarbonMarket {
  market: string;
  currentPrice: number;
  currency: string;
  dailyChange: number;
  yearToDateChange: number;
  volume: number;
  allowancesInCirculation: number;
}

interface ClimatePolicy {
  jurisdiction: string;
  policy: string;
  status: 'enacted' | 'proposed' | 'implementing' | 'delayed';
  impactAssessment: 'low' | 'medium' | 'high' | 'transformative';
  affectedSectors: string[];
  expectedCarbonReduction: number;
}

interface GreenFinanceFlows {
  greenBondIssuanceYTDBillions: number;
  sustainabilityLinkedLoansBillions: number;
  carbonCreditMarketSizeBillions: number;
  top5IssuingCountries: { country: string; amountBillions: number }[];
}

interface ClimateRiskResponse {
  globalSummary: GlobalClimateRiskSummary;
  sectorRisks: SectorRiskAssessment[];
  regionalPhysicalRisks: RegionalPhysicalRisk[];
  carbonMarkets: CarbonMarket[];
  climatePolicies: ClimatePolicy[];
  greenFinanceFlows: GreenFinanceFlows;
  timestamp: string;
}

// ── Seed Data: Sector Risk ──

interface SectorRiskSeed {
  sector: string;
  basePhysicalRisk: number;
  baseTransitionRisk: number;
  baseStrandedBillions: number;
  baseCarbonIntensity: number;
  regulatoryExposure: 'low' | 'medium' | 'high' | 'critical';
}

const SECTOR_RISK_SEEDS: SectorRiskSeed[] = [
  { sector: 'Oil & Gas', basePhysicalRisk: 6, baseTransitionRisk: 9, baseStrandedBillions: 2300, baseCarbonIntensity: 1250, regulatoryExposure: 'critical' },
  { sector: 'Coal Mining', basePhysicalRisk: 5, baseTransitionRisk: 10, baseStrandedBillions: 900, baseCarbonIntensity: 2800, regulatoryExposure: 'critical' },
  { sector: 'Electric Utilities', basePhysicalRisk: 7, baseTransitionRisk: 8, baseStrandedBillions: 1400, baseCarbonIntensity: 820, regulatoryExposure: 'high' },
  { sector: 'Steel & Cement', basePhysicalRisk: 4, baseTransitionRisk: 8, baseStrandedBillions: 680, baseCarbonIntensity: 1650, regulatoryExposure: 'high' },
  { sector: 'Transportation', basePhysicalRisk: 5, baseTransitionRisk: 7, baseStrandedBillions: 520, baseCarbonIntensity: 590, regulatoryExposure: 'high' },
  { sector: 'Agriculture', basePhysicalRisk: 8, baseTransitionRisk: 5, baseStrandedBillions: 310, baseCarbonIntensity: 720, regulatoryExposure: 'medium' },
  { sector: 'Real Estate', basePhysicalRisk: 7, baseTransitionRisk: 6, baseStrandedBillions: 1100, baseCarbonIntensity: 210, regulatoryExposure: 'medium' },
  { sector: 'Insurance', basePhysicalRisk: 8, baseTransitionRisk: 5, baseStrandedBillions: 450, baseCarbonIntensity: 35, regulatoryExposure: 'high' },
  { sector: 'Banking', basePhysicalRisk: 4, baseTransitionRisk: 6, baseStrandedBillions: 780, baseCarbonIntensity: 45, regulatoryExposure: 'high' },
  { sector: 'Technology', basePhysicalRisk: 3, baseTransitionRisk: 3, baseStrandedBillions: 120, baseCarbonIntensity: 85, regulatoryExposure: 'low' },
];

// ── Seed Data: Regional Physical Risk ──

interface RegionalRiskSeed {
  region: string;
  baseFlood: number;
  baseDrought: number;
  baseHeatStress: number;
  baseSeaLevelRise: number;
  baseWildfire: number;
  baseInsuranceLosses: number;
  basePopulationExposed: number;
}

const REGIONAL_RISK_SEEDS: RegionalRiskSeed[] = [
  { region: 'South & Southeast Asia', baseFlood: 9, baseDrought: 6, baseHeatStress: 9, baseSeaLevelRise: 8, baseWildfire: 4, baseInsuranceLosses: 42, basePopulationExposed: 890 },
  { region: 'Sub-Saharan Africa', baseFlood: 6, baseDrought: 9, baseHeatStress: 9, baseSeaLevelRise: 5, baseWildfire: 7, baseInsuranceLosses: 12, basePopulationExposed: 650 },
  { region: 'Central America & Caribbean', baseFlood: 8, baseDrought: 6, baseHeatStress: 7, baseSeaLevelRise: 8, baseWildfire: 5, baseInsuranceLosses: 28, basePopulationExposed: 85 },
  { region: 'Mediterranean Europe', baseFlood: 6, baseDrought: 8, baseHeatStress: 8, baseSeaLevelRise: 5, baseWildfire: 9, baseInsuranceLosses: 35, basePopulationExposed: 120 },
  { region: 'Pacific Islands', baseFlood: 7, baseDrought: 4, baseHeatStress: 6, baseSeaLevelRise: 10, baseWildfire: 2, baseInsuranceLosses: 3, basePopulationExposed: 12 },
  { region: 'US Gulf Coast', baseFlood: 9, baseDrought: 5, baseHeatStress: 7, baseSeaLevelRise: 8, baseWildfire: 4, baseInsuranceLosses: 65, basePopulationExposed: 45 },
  { region: 'East Asia', baseFlood: 8, baseDrought: 5, baseHeatStress: 7, baseSeaLevelRise: 6, baseWildfire: 4, baseInsuranceLosses: 55, basePopulationExposed: 380 },
  { region: 'Middle East & North Africa', baseFlood: 3, baseDrought: 10, baseHeatStress: 10, baseSeaLevelRise: 4, baseWildfire: 3, baseInsuranceLosses: 8, basePopulationExposed: 210 },
  { region: 'Northern Europe', baseFlood: 6, baseDrought: 3, baseHeatStress: 3, baseSeaLevelRise: 5, baseWildfire: 3, baseInsuranceLosses: 18, basePopulationExposed: 35 },
  { region: 'Australia', baseFlood: 6, baseDrought: 9, baseHeatStress: 8, baseSeaLevelRise: 5, baseWildfire: 10, baseInsuranceLosses: 22, basePopulationExposed: 18 },
];

// ── Seed Data: Carbon Markets ──

interface CarbonMarketSeed {
  market: string;
  basePrice: number;
  currency: string;
  baseYTDChange: number;
  baseVolume: number;
  baseAllowances: number;
}

const CARBON_MARKET_SEEDS: CarbonMarketSeed[] = [
  { market: 'EU ETS', basePrice: 78, currency: 'EUR', baseYTDChange: 8.5, baseVolume: 42_000_000, baseAllowances: 1_385_000_000 },
  { market: 'UK ETS', basePrice: 46, currency: 'GBP', baseYTDChange: 5.2, baseVolume: 3_800_000, baseAllowances: 146_000_000 },
  { market: 'RGGI', basePrice: 14.2, currency: 'USD', baseYTDChange: 3.8, baseVolume: 8_200_000, baseAllowances: 188_000_000 },
  { market: 'California Cap-and-Trade', basePrice: 37.5, currency: 'USD', baseYTDChange: 12.4, baseVolume: 5_600_000, baseAllowances: 320_000_000 },
  { market: 'China National ETS', basePrice: 9.8, currency: 'USD', baseYTDChange: 18.6, baseVolume: 120_000_000, baseAllowances: 4_500_000_000 },
];

// ── Seed Data: Climate Policies ──

interface ClimatePolicySeed {
  jurisdiction: string;
  policy: string;
  status: 'enacted' | 'proposed' | 'implementing' | 'delayed';
  impactAssessment: 'low' | 'medium' | 'high' | 'transformative';
  affectedSectors: string[];
  baseCarbonReduction: number;
}

const CLIMATE_POLICY_SEEDS: ClimatePolicySeed[] = [
  { jurisdiction: 'European Union', policy: 'Carbon Border Adjustment Mechanism (CBAM)', status: 'implementing', impactAssessment: 'transformative', affectedSectors: ['Steel & Cement', 'Aluminum', 'Fertilizers', 'Electricity', 'Hydrogen'], baseCarbonReduction: 250 },
  { jurisdiction: 'United States', policy: 'Inflation Reduction Act (IRA) - Clean Energy Provisions', status: 'enacted', impactAssessment: 'transformative', affectedSectors: ['Electric Utilities', 'Transportation', 'Manufacturing', 'Oil & Gas'], baseCarbonReduction: 900 },
  { jurisdiction: 'United Kingdom', policy: 'Net Zero Strategy & Carbon Budget 6', status: 'implementing', impactAssessment: 'high', affectedSectors: ['Electric Utilities', 'Transportation', 'Real Estate', 'Industry'], baseCarbonReduction: 180 },
  { jurisdiction: 'China', policy: 'National ETS Expansion to Cement & Aluminum', status: 'proposed', impactAssessment: 'high', affectedSectors: ['Steel & Cement', 'Aluminum', 'Chemicals'], baseCarbonReduction: 650 },
  { jurisdiction: 'Japan', policy: 'GX (Green Transformation) Transition Bonds', status: 'implementing', impactAssessment: 'medium', affectedSectors: ['Electric Utilities', 'Transportation', 'Steel & Cement'], baseCarbonReduction: 220 },
  { jurisdiction: 'India', policy: 'Carbon Credit Trading Scheme', status: 'implementing', impactAssessment: 'medium', affectedSectors: ['Electric Utilities', 'Steel & Cement', 'Oil & Gas'], baseCarbonReduction: 300 },
  { jurisdiction: 'Brazil', policy: 'Regulated Carbon Market (SBCE)', status: 'proposed', impactAssessment: 'medium', affectedSectors: ['Agriculture', 'Oil & Gas', 'Steel & Cement', 'Transportation'], baseCarbonReduction: 180 },
  { jurisdiction: 'Australia', policy: 'Safeguard Mechanism Reform', status: 'enacted', impactAssessment: 'high', affectedSectors: ['Oil & Gas', 'Coal Mining', 'Steel & Cement', 'Transportation'], baseCarbonReduction: 140 },
  { jurisdiction: 'Canada', policy: 'Clean Electricity Regulations', status: 'delayed', impactAssessment: 'high', affectedSectors: ['Electric Utilities', 'Oil & Gas'], baseCarbonReduction: 120 },
  { jurisdiction: 'South Korea', policy: 'K-ETS Phase 4 Expansion', status: 'proposed', impactAssessment: 'medium', affectedSectors: ['Steel & Cement', 'Electric Utilities', 'Transportation', 'Aviation'], baseCarbonReduction: 95 },
];

// ── Seed Data: Green Finance ──

interface GreenFinanceSeed {
  baseGreenBondYTD: number;
  baseSustainabilityLinkedLoans: number;
  baseCarbonCreditMarketSize: number;
  top5: { country: string; baseAmount: number }[];
}

const GREEN_FINANCE_SEED: GreenFinanceSeed = {
  baseGreenBondYTD: 580,
  baseSustainabilityLinkedLoans: 320,
  baseCarbonCreditMarketSize: 2.4,
  top5: [
    { country: 'China', baseAmount: 95 },
    { country: 'Germany', baseAmount: 72 },
    { country: 'United States', baseAmount: 68 },
    { country: 'France', baseAmount: 58 },
    { country: 'United Kingdom', baseAmount: 42 },
  ],
};

// ── Data Generation ──

function generateGlobalSummary(rng: () => number): GlobalClimateRiskSummary {
  const baseTotalAssets = 24.5;
  const basePhysicalExposure = 34.2;
  const baseTransitionExposure = 42.8;
  const baseCarbonEUR = 78;
  const baseCarbonUSD = 14.2;
  const baseTemperature = 1.35;

  return {
    totalAssetsAtRiskTrillions: roundTo(baseTotalAssets + (rng() - 0.5) * 3, 1),
    physicalRiskExposure: roundTo(clamp(basePhysicalExposure + (rng() - 0.5) * 5, 25, 45), 1),
    transitionRiskExposure: roundTo(clamp(baseTransitionExposure + (rng() - 0.5) * 6, 33, 55), 1),
    carbonPriceEUR: roundTo(clamp(baseCarbonEUR + (rng() - 0.5) * 20, 70, 90), 2),
    carbonPriceUSD: roundTo(clamp(baseCarbonUSD + (rng() - 0.5) * 2, 13, 15), 2),
    globalTemperatureAnomaly: roundTo(clamp(baseTemperature + (rng() - 0.5) * 0.3, 1.2, 1.5), 2),
  };
}

function generateSectorRisks(rng: () => number): SectorRiskAssessment[] {
  return SECTOR_RISK_SEEDS.map((seed) => {
    const physicalJitter = (rng() - 0.5) * 1.5;
    const transitionJitter = (rng() - 0.5) * 1.5;
    const strandedJitter = (rng() - 0.5) * seed.baseStrandedBillions * 0.08;
    const carbonJitter = (rng() - 0.5) * seed.baseCarbonIntensity * 0.06;

    return {
      sector: seed.sector,
      physicalRiskScore: clamp(roundTo(seed.basePhysicalRisk + physicalJitter, 1), 1, 10),
      transitionRiskScore: clamp(roundTo(seed.baseTransitionRisk + transitionJitter, 1), 1, 10),
      strandedAssetRiskBillions: roundTo(Math.max(10, seed.baseStrandedBillions + strandedJitter), 1),
      carbonIntensity: roundTo(Math.max(5, seed.baseCarbonIntensity + carbonJitter), 0),
      regulatoryExposure: seed.regulatoryExposure,
    };
  });
}

function generateRegionalPhysicalRisks(rng: () => number): RegionalPhysicalRisk[] {
  return REGIONAL_RISK_SEEDS.map((seed) => {
    const jitter = () => (rng() - 0.5) * 1.2;
    const lossJitter = (rng() - 0.5) * seed.baseInsuranceLosses * 0.1;
    const popJitter = (rng() - 0.5) * seed.basePopulationExposed * 0.05;

    return {
      region: seed.region,
      floodRisk: clamp(roundTo(seed.baseFlood + jitter(), 1), 1, 10),
      droughtRisk: clamp(roundTo(seed.baseDrought + jitter(), 1), 1, 10),
      heatStressRisk: clamp(roundTo(seed.baseHeatStress + jitter(), 1), 1, 10),
      seaLevelRiseRisk: clamp(roundTo(seed.baseSeaLevelRise + jitter(), 1), 1, 10),
      wildfireRisk: clamp(roundTo(seed.baseWildfire + jitter(), 1), 1, 10),
      insuranceLossesBillions: roundTo(Math.max(0.5, seed.baseInsuranceLosses + lossJitter), 1),
      populationExposedMillions: roundTo(Math.max(1, seed.basePopulationExposed + popJitter), 0),
    };
  });
}

function generateCarbonMarkets(rng: () => number): CarbonMarket[] {
  return CARBON_MARKET_SEEDS.map((seed) => {
    const priceJitter = (rng() - 0.5) * seed.basePrice * 0.08;
    const dailyChange = roundTo((rng() - 0.5) * 4, 2);
    const ytdJitter = (rng() - 0.5) * 6;
    const volumeJitter = Math.floor((rng() - 0.5) * seed.baseVolume * 0.15);
    const allowanceJitter = Math.floor((rng() - 0.5) * seed.baseAllowances * 0.03);

    return {
      market: seed.market,
      currentPrice: roundTo(Math.max(1, seed.basePrice + priceJitter), 2),
      currency: seed.currency,
      dailyChange,
      yearToDateChange: roundTo(seed.baseYTDChange + ytdJitter, 1),
      volume: Math.max(100_000, seed.baseVolume + volumeJitter),
      allowancesInCirculation: Math.max(10_000_000, seed.baseAllowances + allowanceJitter),
    };
  });
}

function generateClimatePolicies(rng: () => number): ClimatePolicy[] {
  return CLIMATE_POLICY_SEEDS.map((seed) => {
    const reductionJitter = (rng() - 0.5) * seed.baseCarbonReduction * 0.1;

    return {
      jurisdiction: seed.jurisdiction,
      policy: seed.policy,
      status: seed.status,
      impactAssessment: seed.impactAssessment,
      affectedSectors: seed.affectedSectors,
      expectedCarbonReduction: roundTo(Math.max(10, seed.baseCarbonReduction + reductionJitter), 0),
    };
  });
}

function generateGreenFinanceFlows(rng: () => number): GreenFinanceFlows {
  const seed = GREEN_FINANCE_SEED;
  const bondJitter = (rng() - 0.5) * 60;
  const loanJitter = (rng() - 0.5) * 40;
  const creditJitter = (rng() - 0.5) * 0.4;

  return {
    greenBondIssuanceYTDBillions: roundTo(Math.max(100, seed.baseGreenBondYTD + bondJitter), 1),
    sustainabilityLinkedLoansBillions: roundTo(Math.max(50, seed.baseSustainabilityLinkedLoans + loanJitter), 1),
    carbonCreditMarketSizeBillions: roundTo(Math.max(0.5, seed.baseCarbonCreditMarketSize + creditJitter), 2),
    top5IssuingCountries: seed.top5.map((c) => {
      const jitter = (rng() - 0.5) * c.baseAmount * 0.1;
      return {
        country: c.country,
        amountBillions: roundTo(Math.max(5, c.baseAmount + jitter), 1),
      };
    }),
  };
}

function generateClimateRiskData(): ClimateRiskResponse {
  const rng = seededRandom('climate-risk');

  const globalSummary = generateGlobalSummary(rng);
  const sectorRisks = generateSectorRisks(rng);
  const regionalPhysicalRisks = generateRegionalPhysicalRisks(rng);
  const carbonMarkets = generateCarbonMarkets(rng);
  const climatePolicies = generateClimatePolicies(rng);
  const greenFinanceFlows = generateGreenFinanceFlows(rng);

  return {
    globalSummary,
    sectorRisks,
    regionalPhysicalRisks,
    carbonMarkets,
    climatePolicies,
    greenFinanceFlows,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: ClimateRiskResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateClimateRiskData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ClimateRisk] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate climate risk data' });
  }
});

export default router;
