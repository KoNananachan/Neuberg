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
    a = (a + 0x6D2B79F5) | 0;
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

interface FiscalHealth {
  debtToGdp: number;
  deficitToGdp: number;
  interestToRevenue: number;
}

interface EconomicStrength {
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  currentAccount: number;
}

interface PoliticalStability {
  governanceIndex: number;
  corruptionScore: number;
}

interface ExternalVulnerability {
  reservesToImports: number;
  shortTermDebtToReserves: number;
  fxAdequacy: number;
}

interface SubScores {
  fiscal: number;
  economic: number;
  political: number;
  external: number;
}

interface CountryRiskEntry {
  country: string;
  isoCode: string;
  region: string;
  compositeScore: number;
  subScores: SubScores;
  fiscalHealth: FiscalHealth;
  economicStrength: EconomicStrength;
  politicalStability: PoliticalStability;
  externalVulnerability: ExternalVulnerability;
}

interface RankingEntry {
  country: string;
  isoCode: string;
  compositeScore: number;
  rank: number;
  change1m: number;
  change3m: number;
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
}

interface CreditRatingComparison {
  country: string;
  isoCode: string;
  sp: string;
  moodys: string;
  fitch: string;
  modelImplied: string;
  mismatch: boolean;
  mismatchDirection: 'OVERRATED' | 'UNDERRATED' | 'ALIGNED';
}

interface RegionHeatmap {
  region: string;
  countries: string[];
  avgComposite: number;
  avgFiscal: number;
  avgEconomic: number;
  avgPolitical: number;
  avgExternal: number;
  worstCountry: string;
  bestCountry: string;
}

interface WatchlistEntry {
  country: string;
  isoCode: string;
  currentScore: number;
  score3mAgo: number;
  deterioration: number;
  primaryDriver: string;
}

interface HistoricalPoint {
  month: string;
  score: number;
}

interface HistoricalEntry {
  country: string;
  isoCode: string;
  history: HistoricalPoint[];
}

interface SovereignRiskResponse {
  countryRiskScores: CountryRiskEntry[];
  rankings: RankingEntry[];
  creditRatingComparison: CreditRatingComparison[];
  regionHeatmap: RegionHeatmap[];
  watchlist: WatchlistEntry[];
  historicalScores: HistoricalEntry[];
  generatedAt: string;
}

// ── Seed Data: 25 countries ──

interface CountrySeed {
  country: string;
  isoCode: string;
  region: string;
  baseComposite: number;
  sp: string;
  moodys: string;
  fitch: string;
  baseDebtGdp: number;
  baseDeficitGdp: number;
  baseInterestRevenue: number;
  baseGdpGrowth: number;
  baseInflation: number;
  baseUnemployment: number;
  baseCurrentAccount: number;
  baseGovernance: number;
  baseCorruption: number;
  baseReservesImports: number;
  baseStDebtReserves: number;
  baseFxAdequacy: number;
}

const COUNTRY_SEEDS: CountrySeed[] = [
  { country: 'United States',  isoCode: 'US', region: 'G7',        baseComposite: 22, sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', baseDebtGdp: 123, baseDeficitGdp: -6.3, baseInterestRevenue: 14.2, baseGdpGrowth: 2.5, baseInflation: 3.2, baseUnemployment: 3.8, baseCurrentAccount: -3.0, baseGovernance: 82, baseCorruption: 69, baseReservesImports: 1.2, baseStDebtReserves: 285, baseFxAdequacy: 0.45 },
  { country: 'Germany',        isoCode: 'DE', region: 'G7',        baseComposite: 15, sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', baseDebtGdp: 64,  baseDeficitGdp: -2.1, baseInterestRevenue: 3.8,  baseGdpGrowth: 0.3, baseInflation: 2.8, baseUnemployment: 5.8, baseCurrentAccount: 6.2,  baseGovernance: 92, baseCorruption: 79, baseReservesImports: 1.8, baseStDebtReserves: 45,  baseFxAdequacy: 1.85 },
  { country: 'Japan',          isoCode: 'JP', region: 'G7',        baseComposite: 28, sp: 'A+',  moodys: 'A1',  fitch: 'A',   baseDebtGdp: 255, baseDeficitGdp: -4.5, baseInterestRevenue: 8.2,  baseGdpGrowth: 1.0, baseInflation: 3.1, baseUnemployment: 2.6, baseCurrentAccount: 3.5,  baseGovernance: 88, baseCorruption: 73, baseReservesImports: 18.5, baseStDebtReserves: 22,  baseFxAdequacy: 3.20 },
  { country: 'United Kingdom', isoCode: 'GB', region: 'G7',        baseComposite: 24, sp: 'AA',  moodys: 'Aa3', fitch: 'AA-', baseDebtGdp: 101, baseDeficitGdp: -4.8, baseInterestRevenue: 7.5,  baseGdpGrowth: 0.6, baseInflation: 4.0, baseUnemployment: 4.2, baseCurrentAccount: -3.8, baseGovernance: 85, baseCorruption: 71, baseReservesImports: 2.8, baseStDebtReserves: 112, baseFxAdequacy: 0.95 },
  { country: 'France',         isoCode: 'FR', region: 'G7',        baseComposite: 26, sp: 'AA-', moodys: 'Aa2', fitch: 'AA-', baseDebtGdp: 112, baseDeficitGdp: -5.5, baseInterestRevenue: 6.4,  baseGdpGrowth: 0.9, baseInflation: 2.5, baseUnemployment: 7.4, baseCurrentAccount: -0.8, baseGovernance: 84, baseCorruption: 71, baseReservesImports: 2.2, baseStDebtReserves: 68,  baseFxAdequacy: 1.55 },
  { country: 'Canada',         isoCode: 'CA', region: 'G7',        baseComposite: 20, sp: 'AAA', moodys: 'Aaa', fitch: 'AA+', baseDebtGdp: 106, baseDeficitGdp: -1.4, baseInterestRevenue: 7.8,  baseGdpGrowth: 1.5, baseInflation: 2.9, baseUnemployment: 5.5, baseCurrentAccount: -1.2, baseGovernance: 90, baseCorruption: 74, baseReservesImports: 2.5, baseStDebtReserves: 55,  baseFxAdequacy: 1.60 },
  { country: 'Italy',          isoCode: 'IT', region: 'G7',        baseComposite: 38, sp: 'BBB', moodys: 'Baa3', fitch: 'BBB', baseDebtGdp: 140, baseDeficitGdp: -7.2, baseInterestRevenue: 10.5, baseGdpGrowth: 0.7, baseInflation: 2.4, baseUnemployment: 7.6, baseCurrentAccount: 0.5,  baseGovernance: 72, baseCorruption: 56, baseReservesImports: 2.0, baseStDebtReserves: 78,  baseFxAdequacy: 1.40 },
  { country: 'China',          isoCode: 'CN', region: 'EM Asia',   baseComposite: 40, sp: 'A+',  moodys: 'A1',  fitch: 'A+',  baseDebtGdp: 83,  baseDeficitGdp: -7.1, baseInterestRevenue: 5.8,  baseGdpGrowth: 4.8, baseInflation: 0.5, baseUnemployment: 5.2, baseCurrentAccount: 1.5,  baseGovernance: 48, baseCorruption: 45, baseReservesImports: 14.2, baseStDebtReserves: 32,  baseFxAdequacy: 3.10 },
  { country: 'India',          isoCode: 'IN', region: 'EM Asia',   baseComposite: 42, sp: 'BBB-', moodys: 'Baa3', fitch: 'BBB-', baseDebtGdp: 82, baseDeficitGdp: -6.4, baseInterestRevenue: 28.5, baseGdpGrowth: 6.5, baseInflation: 5.4, baseUnemployment: 7.8, baseCurrentAccount: -1.8, baseGovernance: 55, baseCorruption: 40, baseReservesImports: 9.8,  baseStDebtReserves: 25,  baseFxAdequacy: 2.40 },
  { country: 'South Korea',    isoCode: 'KR', region: 'EM Asia',   baseComposite: 23, sp: 'AA',  moodys: 'Aa2', fitch: 'AA-', baseDebtGdp: 54,  baseDeficitGdp: -2.6, baseInterestRevenue: 5.2,  baseGdpGrowth: 2.2, baseInflation: 3.4, baseUnemployment: 2.8, baseCurrentAccount: 4.5,  baseGovernance: 80, baseCorruption: 63, baseReservesImports: 7.5,  baseStDebtReserves: 48,  baseFxAdequacy: 1.80 },
  { country: 'Indonesia',      isoCode: 'ID', region: 'EM Asia',   baseComposite: 44, sp: 'BBB', moodys: 'Baa2', fitch: 'BBB', baseDebtGdp: 39, baseDeficitGdp: -2.3, baseInterestRevenue: 15.2, baseGdpGrowth: 5.0, baseInflation: 3.8, baseUnemployment: 5.4, baseCurrentAccount: -0.5, baseGovernance: 52, baseCorruption: 38, baseReservesImports: 6.2,  baseStDebtReserves: 55,  baseFxAdequacy: 1.45 },
  { country: 'Thailand',       isoCode: 'TH', region: 'EM Asia',   baseComposite: 36, sp: 'BBB+', moodys: 'Baa1', fitch: 'BBB+', baseDebtGdp: 62, baseDeficitGdp: -3.5, baseInterestRevenue: 7.8, baseGdpGrowth: 2.8, baseInflation: 1.8, baseUnemployment: 1.2, baseCurrentAccount: 3.2, baseGovernance: 55, baseCorruption: 36, baseReservesImports: 9.5,  baseStDebtReserves: 35,  baseFxAdequacy: 2.30 },
  { country: 'Brazil',         isoCode: 'BR', region: 'EM Latam',  baseComposite: 52, sp: 'BB',  moodys: 'Ba2', fitch: 'BB',  baseDebtGdp: 74,  baseDeficitGdp: -7.5, baseInterestRevenue: 22.0, baseGdpGrowth: 2.9, baseInflation: 4.6, baseUnemployment: 7.9, baseCurrentAccount: -2.5, baseGovernance: 48, baseCorruption: 38, baseReservesImports: 14.0, baseStDebtReserves: 28,  baseFxAdequacy: 2.20 },
  { country: 'Mexico',         isoCode: 'MX', region: 'EM Latam',  baseComposite: 46, sp: 'BBB', moodys: 'Baa2', fitch: 'BBB-', baseDebtGdp: 53, baseDeficitGdp: -4.3, baseInterestRevenue: 12.8, baseGdpGrowth: 3.2, baseInflation: 4.2, baseUnemployment: 2.8, baseCurrentAccount: -1.2, baseGovernance: 45, baseCorruption: 31, baseReservesImports: 4.8,  baseStDebtReserves: 65,  baseFxAdequacy: 1.25 },
  { country: 'Colombia',       isoCode: 'CO', region: 'EM Latam',  baseComposite: 50, sp: 'BB+', moodys: 'Baa2', fitch: 'BB+', baseDebtGdp: 55, baseDeficitGdp: -4.2, baseInterestRevenue: 14.5, baseGdpGrowth: 1.8, baseInflation: 9.2, baseUnemployment: 10.5, baseCurrentAccount: -3.5, baseGovernance: 46, baseCorruption: 39, baseReservesImports: 7.2,  baseStDebtReserves: 42,  baseFxAdequacy: 1.35 },
  { country: 'Argentina',      isoCode: 'AR', region: 'EM Latam',  baseComposite: 78, sp: 'CCC', moodys: 'Ca',  fitch: 'CC',  baseDebtGdp: 85,  baseDeficitGdp: -3.8, baseInterestRevenue: 12.0, baseGdpGrowth: -2.5, baseInflation: 142.0, baseUnemployment: 6.8, baseCurrentAccount: -0.5, baseGovernance: 38, baseCorruption: 38, baseReservesImports: 2.8,  baseStDebtReserves: 180, baseFxAdequacy: 0.35 },
  { country: 'Turkey',         isoCode: 'TR', region: 'EM EMEA',   baseComposite: 62, sp: 'B+',  moodys: 'B3',  fitch: 'B+',  baseDebtGdp: 32,  baseDeficitGdp: -5.2, baseInterestRevenue: 13.5, baseGdpGrowth: 4.5, baseInflation: 58.0, baseUnemployment: 9.8, baseCurrentAccount: -4.5, baseGovernance: 38, baseCorruption: 36, baseReservesImports: 3.8,  baseStDebtReserves: 145, baseFxAdequacy: 0.68 },
  { country: 'South Africa',   isoCode: 'ZA', region: 'EM EMEA',   baseComposite: 56, sp: 'BB-', moodys: 'Ba2', fitch: 'BB-', baseDebtGdp: 72,  baseDeficitGdp: -5.8, baseInterestRevenue: 16.5, baseGdpGrowth: 0.8, baseInflation: 5.5, baseUnemployment: 32.5, baseCurrentAccount: -1.5, baseGovernance: 52, baseCorruption: 44, baseReservesImports: 5.2,  baseStDebtReserves: 62,  baseFxAdequacy: 0.90 },
  { country: 'Saudi Arabia',   isoCode: 'SA', region: 'EM EMEA',   baseComposite: 30, sp: 'A',   moodys: 'A1',  fitch: 'A+',  baseDebtGdp: 26,  baseDeficitGdp: -2.0, baseInterestRevenue: 4.2,  baseGdpGrowth: 1.5, baseInflation: 2.3, baseUnemployment: 5.6, baseCurrentAccount: 5.8,  baseGovernance: 42, baseCorruption: 53, baseReservesImports: 28.5, baseStDebtReserves: 15,  baseFxAdequacy: 4.20 },
  { country: 'Egypt',          isoCode: 'EG', region: 'EM EMEA',   baseComposite: 68, sp: 'B-',  moodys: 'Caa1', fitch: 'B-', baseDebtGdp: 92,  baseDeficitGdp: -6.0, baseInterestRevenue: 42.0, baseGdpGrowth: 3.8, baseInflation: 28.0, baseUnemployment: 7.0, baseCurrentAccount: -3.2, baseGovernance: 30, baseCorruption: 30, baseReservesImports: 4.5,  baseStDebtReserves: 125, baseFxAdequacy: 0.55 },
  { country: 'Nigeria',        isoCode: 'NG', region: 'Frontier',  baseComposite: 65, sp: 'B-',  moodys: 'Caa1', fitch: 'B-', baseDebtGdp: 38,  baseDeficitGdp: -5.5, baseInterestRevenue: 62.0, baseGdpGrowth: 2.9, baseInflation: 22.5, baseUnemployment: 33.0, baseCurrentAccount: -0.8, baseGovernance: 28, baseCorruption: 24, baseReservesImports: 4.2,  baseStDebtReserves: 85,  baseFxAdequacy: 0.52 },
  { country: 'Pakistan',       isoCode: 'PK', region: 'Frontier',  baseComposite: 72, sp: 'CCC+', moodys: 'Caa3', fitch: 'CCC+', baseDebtGdp: 78, baseDeficitGdp: -7.5, baseInterestRevenue: 55.0, baseGdpGrowth: 2.0, baseInflation: 24.5, baseUnemployment: 8.5, baseCurrentAccount: -1.5, baseGovernance: 25, baseCorruption: 27, baseReservesImports: 2.5,  baseStDebtReserves: 155, baseFxAdequacy: 0.38 },
  { country: 'Poland',         isoCode: 'PL', region: 'EU',        baseComposite: 28, sp: 'A-',  moodys: 'A2',  fitch: 'A-',  baseDebtGdp: 49,  baseDeficitGdp: -5.1, baseInterestRevenue: 5.8,  baseGdpGrowth: 3.5, baseInflation: 5.2, baseUnemployment: 2.9, baseCurrentAccount: -1.5, baseGovernance: 72, baseCorruption: 55, baseReservesImports: 5.8,  baseStDebtReserves: 42,  baseFxAdequacy: 1.55 },
  { country: 'Spain',          isoCode: 'ES', region: 'EU',        baseComposite: 32, sp: 'A',   moodys: 'Baa1', fitch: 'A-', baseDebtGdp: 107, baseDeficitGdp: -3.6, baseInterestRevenue: 6.8,  baseGdpGrowth: 2.5, baseInflation: 3.4, baseUnemployment: 11.8, baseCurrentAccount: 2.0, baseGovernance: 76, baseCorruption: 60, baseReservesImports: 2.5,  baseStDebtReserves: 52,  baseFxAdequacy: 1.65 },
  { country: 'Greece',         isoCode: 'GR', region: 'EU',        baseComposite: 42, sp: 'BBB-', moodys: 'Ba1', fitch: 'BBB-', baseDebtGdp: 165, baseDeficitGdp: -1.6, baseInterestRevenue: 7.2, baseGdpGrowth: 2.2, baseInflation: 3.0, baseUnemployment: 10.8, baseCurrentAccount: -6.5, baseGovernance: 62, baseCorruption: 52, baseReservesImports: 2.2,  baseStDebtReserves: 58,  baseFxAdequacy: 1.30 },
];

// ── Rating scale for model-implied mapping ──

const RATING_SCALE = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-',
  'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-',
  'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC', 'C',
];

const REGION_GROUPS: Record<string, string[]> = {
  'G7':        ['US', 'DE', 'JP', 'GB', 'FR', 'CA', 'IT'],
  'EU':        ['PL', 'ES', 'GR'],
  'EM Asia':   ['CN', 'IN', 'KR', 'ID', 'TH'],
  'EM Latam':  ['BR', 'MX', 'CO', 'AR'],
  'EM EMEA':   ['TR', 'ZA', 'SA', 'EG'],
  'Frontier':  ['NG', 'PK'],
};

const DETERIORATION_DRIVERS: Record<string, string> = {
  US: 'Rising fiscal deficit and debt ceiling uncertainty',
  DE: 'Energy transition costs and manufacturing slowdown',
  JP: 'Yen depreciation and BOJ policy normalization risks',
  GB: 'Persistent inflation and fiscal consolidation challenges',
  FR: 'Political fragmentation and pension reform backlash',
  CA: 'Housing market correction and household debt',
  IT: 'Elevated debt servicing costs and low growth',
  CN: 'Property sector contagion and LGFV debt risks',
  IN: 'Current account pressure and state-level fiscal stress',
  KR: 'Export dependency and household leverage',
  ID: 'Commodity revenue volatility and infrastructure spending',
  TH: 'Political instability and tourism dependency',
  BR: 'Fiscal slippage and interest rate burden',
  MX: 'Energy reform uncertainty and nearshoring capacity gaps',
  CO: 'Social spending pressures and commodity dependence',
  AR: 'Hyperinflation and reserve depletion spiral',
  TR: 'Unorthodox monetary policy and dollarization',
  ZA: 'Load-shedding crisis and SOE bailout costs',
  SA: 'Oil price sensitivity and Vision 2030 execution risk',
  EG: 'FX shortage and external financing gap',
  NG: 'FX crisis and subsidy reform transition costs',
  PK: 'IMF conditionality strain and political instability',
  PL: 'Defense spending surge and EU fund delays',
  ES: 'Structural unemployment and regional fiscal gaps',
  GR: 'Debt sustainability despite primary surplus improvements',
};

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyVariation(base: number, rng: () => number, pctRange: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pctRange);
}

function compositeToRating(score: number): string {
  if (score <= 12) return 'AAA';
  if (score <= 18) return 'AA+';
  if (score <= 22) return 'AA';
  if (score <= 26) return 'AA-';
  if (score <= 30) return 'A+';
  if (score <= 34) return 'A';
  if (score <= 38) return 'A-';
  if (score <= 42) return 'BBB+';
  if (score <= 46) return 'BBB';
  if (score <= 50) return 'BBB-';
  if (score <= 54) return 'BB+';
  if (score <= 58) return 'BB';
  if (score <= 62) return 'BB-';
  if (score <= 66) return 'B+';
  if (score <= 70) return 'B';
  if (score <= 74) return 'B-';
  if (score <= 78) return 'CCC+';
  if (score <= 82) return 'CCC';
  if (score <= 88) return 'CCC-';
  if (score <= 94) return 'CC';
  return 'C';
}

function ratingIndex(rating: string): number {
  const idx = RATING_SCALE.indexOf(rating);
  return idx === -1 ? RATING_SCALE.length - 1 : idx;
}

// ── Data Generation ──

function generateCountryScores(rng: () => number): CountryRiskEntry[] {
  return COUNTRY_SEEDS.map((seed) => {
    const debtGdp = roundTo(applyVariation(seed.baseDebtGdp, rng, 0.04), 1);
    const deficitGdp = roundTo(applyVariation(Math.abs(seed.baseDeficitGdp), rng, 0.08) * (seed.baseDeficitGdp < 0 ? -1 : 1), 1);
    const interestRevenue = roundTo(applyVariation(seed.baseInterestRevenue, rng, 0.06), 1);

    const gdpGrowth = roundTo(applyVariation(Math.abs(seed.baseGdpGrowth) + 0.01, rng, 0.12) * (seed.baseGdpGrowth < 0 ? -1 : 1), 1);
    const inflation = roundTo(applyVariation(seed.baseInflation, rng, 0.08), 1);
    const unemployment = roundTo(applyVariation(seed.baseUnemployment, rng, 0.06), 1);
    const currentAccount = roundTo(applyVariation(Math.abs(seed.baseCurrentAccount) + 0.01, rng, 0.10) * (seed.baseCurrentAccount < 0 ? -1 : 1), 1);

    const governance = clamp(Math.round(applyVariation(seed.baseGovernance, rng, 0.04)), 0, 100);
    const corruption = clamp(Math.round(applyVariation(seed.baseCorruption, rng, 0.05)), 0, 100);

    const reservesImports = roundTo(applyVariation(seed.baseReservesImports, rng, 0.05), 1);
    const stDebtReserves = roundTo(applyVariation(seed.baseStDebtReserves, rng, 0.06), 1);
    const fxAdequacy = roundTo(applyVariation(seed.baseFxAdequacy, rng, 0.05), 2);

    // Sub-scores (0-100, lower = safer)
    const fiscalScore = clamp(Math.round(
      (Math.min(debtGdp / 2.5, 100) * 0.40) +
      (Math.min(Math.abs(deficitGdp) * 8, 100) * 0.35) +
      (Math.min(interestRevenue * 1.5, 100) * 0.25)
    ), 0, 100);

    const economicScore = clamp(Math.round(
      (Math.max(0, 50 - gdpGrowth * 8) * 0.30) +
      (Math.min(inflation * 1.2, 100) * 0.30) +
      (Math.min(unemployment * 3, 100) * 0.20) +
      (Math.max(0, 50 + currentAccount * -5) * 0.20)
    ), 0, 100);

    const politicalScore = clamp(Math.round(
      ((100 - governance) * 0.55) +
      ((100 - corruption) * 0.45)
    ), 0, 100);

    const externalScore = clamp(Math.round(
      (Math.max(0, 60 - reservesImports * 4) * 0.35) +
      (Math.min(stDebtReserves * 0.5, 100) * 0.35) +
      (Math.max(0, (2.0 - fxAdequacy) * 50) * 0.30)
    ), 0, 100);

    const composite = clamp(Math.round(applyVariation(seed.baseComposite, rng, 0.06)), 0, 100);

    return {
      country: seed.country,
      isoCode: seed.isoCode,
      region: seed.region,
      compositeScore: composite,
      subScores: {
        fiscal: fiscalScore,
        economic: economicScore,
        political: politicalScore,
        external: externalScore,
      },
      fiscalHealth: {
        debtToGdp: debtGdp,
        deficitToGdp: deficitGdp,
        interestToRevenue: interestRevenue,
      },
      economicStrength: {
        gdpGrowth,
        inflation,
        unemployment,
        currentAccount,
      },
      politicalStability: {
        governanceIndex: governance,
        corruptionScore: corruption,
      },
      externalVulnerability: {
        reservesToImports: reservesImports,
        shortTermDebtToReserves: stDebtReserves,
        fxAdequacy,
      },
    };
  });
}

function generateRankings(scores: CountryRiskEntry[], rng: () => number): RankingEntry[] {
  const sorted = [...scores].sort((a, b) => a.compositeScore - b.compositeScore);
  return sorted.map((entry, idx) => {
    const change1m = roundTo((rng() - 0.45) * entry.compositeScore * 0.06, 1);
    const change3m = roundTo((rng() - 0.42) * entry.compositeScore * 0.10, 1);
    let trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
    if (change3m < -1.5) {
      trend = 'IMPROVING';
    } else if (change3m > 1.5) {
      trend = 'DETERIORATING';
    } else {
      trend = 'STABLE';
    }

    return {
      country: entry.country,
      isoCode: entry.isoCode,
      compositeScore: entry.compositeScore,
      rank: idx + 1,
      change1m,
      change3m,
      trend,
    };
  });
}

function generateCreditComparison(scores: CountryRiskEntry[]): CreditRatingComparison[] {
  return COUNTRY_SEEDS.map((seed) => {
    const entry = scores.find((s) => s.isoCode === seed.isoCode)!;
    const modelImplied = compositeToRating(entry.compositeScore);
    const modelIdx = ratingIndex(modelImplied);
    // Use the best (lowest index) of S&P/Fitch for comparison
    const spIdx = ratingIndex(seed.sp);
    const agencyBest = spIdx;
    const diff = agencyBest - modelIdx;
    let mismatch = false;
    let mismatchDirection: 'OVERRATED' | 'UNDERRATED' | 'ALIGNED' = 'ALIGNED';
    // Mismatch if model differs by 2+ notches
    if (diff >= 2) {
      mismatch = true;
      mismatchDirection = 'OVERRATED'; // agencies rate better than model suggests
    } else if (diff <= -2) {
      mismatch = true;
      mismatchDirection = 'UNDERRATED'; // agencies rate worse than model suggests
    }

    return {
      country: seed.country,
      isoCode: seed.isoCode,
      sp: seed.sp,
      moodys: seed.moodys,
      fitch: seed.fitch,
      modelImplied,
      mismatch,
      mismatchDirection,
    };
  });
}

function generateRegionHeatmap(scores: CountryRiskEntry[]): RegionHeatmap[] {
  return Object.entries(REGION_GROUPS).map(([region, isoCodes]) => {
    const members = scores.filter((s) => isoCodes.includes(s.isoCode));
    if (members.length === 0) {
      return {
        region,
        countries: [],
        avgComposite: 0,
        avgFiscal: 0,
        avgEconomic: 0,
        avgPolitical: 0,
        avgExternal: 0,
        worstCountry: 'N/A',
        bestCountry: 'N/A',
      };
    }
    const avg = (arr: number[]) => roundTo(arr.reduce((s, v) => s + v, 0) / arr.length, 1);
    const worst = members.reduce((w, m) => m.compositeScore > w.compositeScore ? m : w);
    const best = members.reduce((b, m) => m.compositeScore < b.compositeScore ? m : b);

    return {
      region,
      countries: members.map((m) => m.country),
      avgComposite: avg(members.map((m) => m.compositeScore)),
      avgFiscal: avg(members.map((m) => m.subScores.fiscal)),
      avgEconomic: avg(members.map((m) => m.subScores.economic)),
      avgPolitical: avg(members.map((m) => m.subScores.political)),
      avgExternal: avg(members.map((m) => m.subScores.external)),
      worstCountry: worst.country,
      bestCountry: best.country,
    };
  });
}

function generateWatchlist(rankings: RankingEntry[]): WatchlistEntry[] {
  const deteriorating = [...rankings]
    .filter((r) => r.change3m > 0)
    .sort((a, b) => b.change3m - a.change3m)
    .slice(0, 5);

  return deteriorating.map((r) => ({
    country: r.country,
    isoCode: r.isoCode,
    currentScore: r.compositeScore,
    score3mAgo: roundTo(r.compositeScore - r.change3m, 1),
    deterioration: r.change3m,
    primaryDriver: DETERIORATION_DRIVERS[r.isoCode] || 'Multiple macro headwinds',
  }));
}

function generateHistoricalScores(scores: CountryRiskEntry[], rng: () => number): HistoricalEntry[] {
  // Top 5 riskiest countries
  const riskiest = [...scores]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 5);

  const today = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }

  return riskiest.map((entry) => {
    const currentScore = entry.compositeScore;
    // Walk backward from current score with small random steps
    const history: HistoricalPoint[] = [];
    let score = currentScore;
    const points: number[] = [currentScore];
    for (let i = 0; i < 11; i++) {
      const step = (rng() - 0.48) * 4;
      score = clamp(Math.round(score - step), 5, 98);
      points.unshift(score);
    }

    for (let i = 0; i < 12; i++) {
      history.push({
        month: months[i],
        score: points[i],
      });
    }

    return {
      country: entry.country,
      isoCode: entry.isoCode,
      history,
    };
  });
}

function generateSovereignRiskData(): SovereignRiskResponse {
  const rng = seededRandom('sovereign-risk-score');
  const countryRiskScores = generateCountryScores(rng);
  const rankings = generateRankings(countryRiskScores, rng);
  const creditRatingComparison = generateCreditComparison(countryRiskScores);
  const regionHeatmap = generateRegionHeatmap(countryRiskScores);
  const watchlist = generateWatchlist(rankings);
  const historicalScores = generateHistoricalScores(countryRiskScores, rng);

  return {
    countryRiskScores,
    rankings,
    creditRatingComparison,
    regionHeatmap,
    watchlist,
    historicalScores,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: SovereignRiskResponse | null; expiresAt: number } = {
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

    const data = generateSovereignRiskData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SovereignRiskScore] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate sovereign risk score data' });
  }
});

export default router;
