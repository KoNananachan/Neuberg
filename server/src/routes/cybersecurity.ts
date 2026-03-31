import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Types ──

interface ThreatLandscapeOverview {
  globalCyberCrimeCostTrillions: number;
  avgBreachCostMillions: number;
  ransomwareAttacksPerDay: number;
  avgRansomPaymentUSD: number;
  cveDisclosuresYTD: number;
  criticalVulnerabilitiesYTD: number;
  threatLevelIndex: number;
}

interface SectorRiskAssessment {
  sector: string;
  riskScore: number;
  breachesYTD: number;
  avgCostPerBreachMillions: number;
  avgDaysToDetect: number;
  avgDaysToContain: number;
  topThreatVector: 'ransomware' | 'phishing' | 'supply-chain' | 'insider' | 'zero-day' | 'ddos';
  trendVsPriorYear: 'increasing' | 'stable' | 'decreasing';
}

interface MajorBreach {
  organization: string;
  sector: string;
  dateDiscovered: string;
  recordsAffectedMillions: number;
  estimatedCostMillions: number;
  attackType: string;
  attackVector: string;
  dataTypes: string[];
  attribution: 'nation-state' | 'criminal-group' | 'insider' | 'unknown';
}

interface RansomwareGroup {
  name: string;
  attacksYTD: number;
  avgDemandUSD: number;
  avgPaymentUSD: number;
  targetSectors: string[];
  status: 'active' | 'disrupted' | 'rebranded';
}

interface RansomwareLandscape {
  topGroups: RansomwareGroup[];
}

interface VendorCVE {
  vendor: string;
  cveCount: number;
}

interface VulnerabilityMetrics {
  totalCVEsYTD: number;
  criticalPct: number;
  highPct: number;
  medianTimeToExploitDays: number;
  topAffectedVendors: VendorCVE[];
  zeroDayExploitsYTD: number;
  patchAdoptionRate30dPct: number;
}

interface CyberInsurer {
  name: string;
  marketSharePct: number;
}

interface CyberInsuranceMarket {
  globalPremiumsBillions: number;
  yearOverYearGrowthPct: number;
  avgRateIncreasePct: number;
  lossRatioPct: number;
  avgCoverageLimitMillions: number;
  denialRatePct: number;
  topInsurers: CyberInsurer[];
}

interface CybersecurityResponse {
  threatLandscape: ThreatLandscapeOverview;
  sectorRiskAssessment: SectorRiskAssessment[];
  majorBreaches: MajorBreach[];
  ransomwareLandscape: RansomwareLandscape;
  vulnerabilityMetrics: VulnerabilityMetrics;
  cyberInsuranceMarket: CyberInsuranceMarket;
  timestamp: string;
}

// ── Seed Data: Sector Risk ──

interface SectorRiskSeed {
  sector: string;
  baseRiskScore: number;
  baseBreachesYTD: number;
  baseAvgCostMillions: number;
  baseAvgDaysToDetect: number;
  baseAvgDaysToContain: number;
  topThreatVector: 'ransomware' | 'phishing' | 'supply-chain' | 'insider' | 'zero-day' | 'ddos';
  trendVsPriorYear: 'increasing' | 'stable' | 'decreasing';
}

const SECTOR_RISK_SEEDS: SectorRiskSeed[] = [
  { sector: 'Healthcare', baseRiskScore: 8.7, baseBreachesYTD: 385, baseAvgCostMillions: 10.93, baseAvgDaysToDetect: 236, baseAvgDaysToContain: 93, topThreatVector: 'ransomware', trendVsPriorYear: 'increasing' },
  { sector: 'Financial Services', baseRiskScore: 8.2, baseBreachesYTD: 310, baseAvgCostMillions: 5.90, baseAvgDaysToDetect: 177, baseAvgDaysToContain: 56, topThreatVector: 'phishing', trendVsPriorYear: 'increasing' },
  { sector: 'Government', baseRiskScore: 7.8, baseBreachesYTD: 245, baseAvgCostMillions: 5.13, baseAvgDaysToDetect: 259, baseAvgDaysToContain: 82, topThreatVector: 'zero-day', trendVsPriorYear: 'increasing' },
  { sector: 'Energy/Utilities', baseRiskScore: 7.5, baseBreachesYTD: 178, baseAvgCostMillions: 4.78, baseAvgDaysToDetect: 215, baseAvgDaysToContain: 78, topThreatVector: 'supply-chain', trendVsPriorYear: 'increasing' },
  { sector: 'Manufacturing', baseRiskScore: 7.1, baseBreachesYTD: 262, baseAvgCostMillions: 4.47, baseAvgDaysToDetect: 212, baseAvgDaysToContain: 75, topThreatVector: 'ransomware', trendVsPriorYear: 'increasing' },
  { sector: 'Technology', baseRiskScore: 6.8, baseBreachesYTD: 198, baseAvgCostMillions: 4.97, baseAvgDaysToDetect: 158, baseAvgDaysToContain: 51, topThreatVector: 'supply-chain', trendVsPriorYear: 'stable' },
  { sector: 'Retail', baseRiskScore: 6.5, baseBreachesYTD: 225, baseAvgCostMillions: 3.28, baseAvgDaysToDetect: 197, baseAvgDaysToContain: 69, topThreatVector: 'phishing', trendVsPriorYear: 'stable' },
  { sector: 'Education', baseRiskScore: 7.0, baseBreachesYTD: 190, baseAvgCostMillions: 3.65, baseAvgDaysToDetect: 245, baseAvgDaysToContain: 88, topThreatVector: 'ransomware', trendVsPriorYear: 'increasing' },
  { sector: 'Transportation', baseRiskScore: 6.3, baseBreachesYTD: 142, baseAvgCostMillions: 4.18, baseAvgDaysToDetect: 208, baseAvgDaysToContain: 72, topThreatVector: 'ddos', trendVsPriorYear: 'stable' },
  { sector: 'Telecommunications', baseRiskScore: 7.3, baseBreachesYTD: 165, baseAvgCostMillions: 4.54, baseAvgDaysToDetect: 186, baseAvgDaysToContain: 63, topThreatVector: 'insider', trendVsPriorYear: 'decreasing' },
];

// ── Seed Data: Major Breaches ──

interface MajorBreachSeed {
  organization: string;
  sector: string;
  baseRecordsMillions: number;
  baseEstimatedCostMillions: number;
  attackType: string;
  attackVector: string;
  dataTypes: string[];
  attribution: 'nation-state' | 'criminal-group' | 'insider' | 'unknown';
}

const MAJOR_BREACH_SEEDS: MajorBreachSeed[] = [
  { organization: 'MedConnect Health Systems', sector: 'Healthcare', baseRecordsMillions: 42.5, baseEstimatedCostMillions: 380, attackType: 'Ransomware', attackVector: 'Compromised VPN credentials', dataTypes: ['PII', 'health'], attribution: 'criminal-group' },
  { organization: 'Pacific National Bank', sector: 'Financial Services', baseRecordsMillions: 28.3, baseEstimatedCostMillions: 265, attackType: 'Data exfiltration', attackVector: 'Spear-phishing campaign', dataTypes: ['PII', 'financial', 'credentials'], attribution: 'nation-state' },
  { organization: 'Federal Personnel Office', sector: 'Government', baseRecordsMillions: 18.7, baseEstimatedCostMillions: 420, attackType: 'Advanced persistent threat', attackVector: 'Zero-day in file transfer software', dataTypes: ['PII', 'credentials'], attribution: 'nation-state' },
  { organization: 'TransGlobal Energy Corp', sector: 'Energy/Utilities', baseRecordsMillions: 8.2, baseEstimatedCostMillions: 195, attackType: 'Ransomware + data theft', attackVector: 'Supply-chain compromise', dataTypes: ['PII', 'IP'], attribution: 'criminal-group' },
  { organization: 'CloudNexus Technologies', sector: 'Technology', baseRecordsMillions: 65.4, baseEstimatedCostMillions: 540, attackType: 'Data exfiltration', attackVector: 'Misconfigured cloud storage', dataTypes: ['PII', 'credentials', 'IP'], attribution: 'unknown' },
  { organization: 'RetailMax International', sector: 'Retail', baseRecordsMillions: 35.8, baseEstimatedCostMillions: 178, attackType: 'Point-of-sale malware', attackVector: 'Third-party vendor compromise', dataTypes: ['PII', 'financial'], attribution: 'criminal-group' },
  { organization: 'National University Consortium', sector: 'Education', baseRecordsMillions: 12.1, baseEstimatedCostMillions: 92, attackType: 'Ransomware', attackVector: 'Phishing email with malicious attachment', dataTypes: ['PII', 'credentials'], attribution: 'criminal-group' },
  { organization: 'Continental Telecom', sector: 'Telecommunications', baseRecordsMillions: 53.2, baseEstimatedCostMillions: 310, attackType: 'SIM-swap + data theft', attackVector: 'Insider threat combined with social engineering', dataTypes: ['PII', 'financial', 'credentials'], attribution: 'insider' },
  { organization: 'Precision Manufacturing Group', sector: 'Manufacturing', baseRecordsMillions: 6.8, baseEstimatedCostMillions: 145, attackType: 'Industrial espionage', attackVector: 'Compromised IoT/OT systems', dataTypes: ['IP'], attribution: 'nation-state' },
  { organization: 'Metro Transit Authority', sector: 'Transportation', baseRecordsMillions: 15.9, baseEstimatedCostMillions: 88, attackType: 'DDoS + ransomware', attackVector: 'Unpatched public-facing application', dataTypes: ['PII', 'financial'], attribution: 'unknown' },
];

// ── Seed Data: Ransomware Groups ──

interface RansomwareGroupSeed {
  name: string;
  baseAttacksYTD: number;
  baseAvgDemandUSD: number;
  baseAvgPaymentUSD: number;
  targetSectors: string[];
  status: 'active' | 'disrupted' | 'rebranded';
}

const RANSOMWARE_GROUP_SEEDS: RansomwareGroupSeed[] = [
  { name: 'LockBit', baseAttacksYTD: 420, baseAvgDemandUSD: 2_500_000, baseAvgPaymentUSD: 850_000, targetSectors: ['Healthcare', 'Manufacturing', 'Financial Services'], status: 'active' },
  { name: 'BlackCat/ALPHV', baseAttacksYTD: 285, baseAvgDemandUSD: 3_200_000, baseAvgPaymentUSD: 1_200_000, targetSectors: ['Healthcare', 'Technology', 'Government'], status: 'rebranded' },
  { name: 'Cl0p', baseAttacksYTD: 195, baseAvgDemandUSD: 4_500_000, baseAvgPaymentUSD: 1_800_000, targetSectors: ['Financial Services', 'Technology', 'Retail'], status: 'active' },
  { name: 'Play', baseAttacksYTD: 165, baseAvgDemandUSD: 1_800_000, baseAvgPaymentUSD: 620_000, targetSectors: ['Manufacturing', 'Education', 'Government'], status: 'active' },
  { name: 'Royal', baseAttacksYTD: 140, baseAvgDemandUSD: 2_100_000, baseAvgPaymentUSD: 780_000, targetSectors: ['Healthcare', 'Education', 'Manufacturing'], status: 'rebranded' },
  { name: 'Akira', baseAttacksYTD: 175, baseAvgDemandUSD: 1_500_000, baseAvgPaymentUSD: 520_000, targetSectors: ['Education', 'Retail', 'Manufacturing'], status: 'active' },
  { name: 'Black Basta', baseAttacksYTD: 210, baseAvgDemandUSD: 2_800_000, baseAvgPaymentUSD: 950_000, targetSectors: ['Energy/Utilities', 'Manufacturing', 'Technology'], status: 'active' },
  { name: 'Medusa', baseAttacksYTD: 130, baseAvgDemandUSD: 1_200_000, baseAvgPaymentUSD: 420_000, targetSectors: ['Government', 'Education', 'Healthcare'], status: 'active' },
];

// ── Seed Data: Vulnerability Vendors ──

interface VendorCVESeed {
  vendor: string;
  baseCveCount: number;
}

const VENDOR_CVE_SEEDS: VendorCVESeed[] = [
  { vendor: 'Microsoft', baseCveCount: 920 },
  { vendor: 'Apple', baseCveCount: 385 },
  { vendor: 'Google', baseCveCount: 610 },
  { vendor: 'Cisco', baseCveCount: 345 },
  { vendor: 'Adobe', baseCveCount: 280 },
];

// ── Seed Data: Cyber Insurers ──

interface CyberInsurerSeed {
  name: string;
  baseMarketSharePct: number;
}

const CYBER_INSURER_SEEDS: CyberInsurerSeed[] = [
  { name: 'AIG', baseMarketSharePct: 12.5 },
  { name: 'Chubb', baseMarketSharePct: 11.8 },
  { name: 'Beazley', baseMarketSharePct: 9.4 },
  { name: 'Hiscox', baseMarketSharePct: 7.2 },
  { name: 'Travelers', baseMarketSharePct: 6.8 },
];

// ── Data Generation ──

function generateThreatLandscape(rng: () => number): ThreatLandscapeOverview {
  const baseCost = 10.5;
  const baseBreachCost = 4.88;
  const baseAttacksPerDay = 4000;
  const baseRansomPayment = 1_500_000;
  const baseCVEs = 26_500;
  const baseCriticalVulns = 4_200;
  const baseThreatLevel = 7.4;

  return {
    globalCyberCrimeCostTrillions: roundTo(baseCost + (rng() - 0.5) * 1.2, 2),
    avgBreachCostMillions: roundTo(baseBreachCost + (rng() - 0.5) * 0.8, 2),
    ransomwareAttacksPerDay: Math.round(baseAttacksPerDay + (rng() - 0.5) * 800),
    avgRansomPaymentUSD: Math.round(baseRansomPayment + (rng() - 0.5) * 400_000),
    cveDisclosuresYTD: Math.round(baseCVEs + (rng() - 0.5) * 3000),
    criticalVulnerabilitiesYTD: Math.round(baseCriticalVulns + (rng() - 0.5) * 800),
    threatLevelIndex: clamp(roundTo(baseThreatLevel + (rng() - 0.5) * 2, 1), 1, 10),
  };
}

function generateSectorRiskAssessment(rng: () => number): SectorRiskAssessment[] {
  return SECTOR_RISK_SEEDS.map((seed) => {
    const riskJitter = (rng() - 0.5) * 1.2;
    const breachJitter = Math.round((rng() - 0.5) * seed.baseBreachesYTD * 0.12);
    const costJitter = (rng() - 0.5) * seed.baseAvgCostMillions * 0.1;
    const detectJitter = Math.round((rng() - 0.5) * 30);
    const containJitter = Math.round((rng() - 0.5) * 16);

    return {
      sector: seed.sector,
      riskScore: clamp(roundTo(seed.baseRiskScore + riskJitter, 1), 1, 10),
      breachesYTD: Math.max(10, seed.baseBreachesYTD + breachJitter),
      avgCostPerBreachMillions: roundTo(Math.max(0.5, seed.baseAvgCostMillions + costJitter), 2),
      avgDaysToDetect: Math.max(30, seed.baseAvgDaysToDetect + detectJitter),
      avgDaysToContain: Math.max(10, seed.baseAvgDaysToContain + containJitter),
      topThreatVector: seed.topThreatVector,
      trendVsPriorYear: seed.trendVsPriorYear,
    };
  });
}

function generateMajorBreaches(rng: () => number): MajorBreach[] {
  const now = new Date();
  return MAJOR_BREACH_SEEDS.map((seed, i) => {
    const recordsJitter = (rng() - 0.5) * seed.baseRecordsMillions * 0.15;
    const costJitter = (rng() - 0.5) * seed.baseEstimatedCostMillions * 0.12;
    const daysAgo = Math.floor(rng() * 180) + i * 12;
    const discoveryDate = new Date(now.getTime() - daysAgo * 86_400_000);

    return {
      organization: seed.organization,
      sector: seed.sector,
      dateDiscovered: discoveryDate.toISOString().slice(0, 10),
      recordsAffectedMillions: roundTo(Math.max(0.1, seed.baseRecordsMillions + recordsJitter), 1),
      estimatedCostMillions: roundTo(Math.max(5, seed.baseEstimatedCostMillions + costJitter), 1),
      attackType: seed.attackType,
      attackVector: seed.attackVector,
      dataTypes: seed.dataTypes,
      attribution: seed.attribution,
    };
  });
}

function generateRansomwareLandscape(rng: () => number): RansomwareLandscape {
  const topGroups = RANSOMWARE_GROUP_SEEDS.map((seed) => {
    const attackJitter = Math.round((rng() - 0.5) * seed.baseAttacksYTD * 0.15);
    const demandJitter = Math.round((rng() - 0.5) * seed.baseAvgDemandUSD * 0.12);
    const paymentJitter = Math.round((rng() - 0.5) * seed.baseAvgPaymentUSD * 0.15);

    return {
      name: seed.name,
      attacksYTD: Math.max(10, seed.baseAttacksYTD + attackJitter),
      avgDemandUSD: Math.max(100_000, seed.baseAvgDemandUSD + demandJitter),
      avgPaymentUSD: Math.max(50_000, seed.baseAvgPaymentUSD + paymentJitter),
      targetSectors: seed.targetSectors,
      status: seed.status,
    };
  });

  return { topGroups };
}

function generateVulnerabilityMetrics(rng: () => number): VulnerabilityMetrics {
  const baseTotalCVEs = 26_500;
  const baseCriticalPct = 15.8;
  const baseHighPct = 27.4;
  const baseMedianExploitDays = 15;
  const baseZeroDays = 97;
  const basePatchRate = 42.5;

  const totalCVEsYTD = Math.round(baseTotalCVEs + (rng() - 0.5) * 3000);
  const criticalPct = clamp(roundTo(baseCriticalPct + (rng() - 0.5) * 4, 1), 5, 25);
  const highPct = clamp(roundTo(baseHighPct + (rng() - 0.5) * 6, 1), 15, 40);

  const topAffectedVendors = VENDOR_CVE_SEEDS.map((seed) => {
    const jitter = Math.round((rng() - 0.5) * seed.baseCveCount * 0.1);
    return {
      vendor: seed.vendor,
      cveCount: Math.max(50, seed.baseCveCount + jitter),
    };
  });

  return {
    totalCVEsYTD,
    criticalPct,
    highPct,
    medianTimeToExploitDays: Math.max(1, Math.round(baseMedianExploitDays + (rng() - 0.5) * 10)),
    topAffectedVendors,
    zeroDayExploitsYTD: Math.max(10, Math.round(baseZeroDays + (rng() - 0.5) * 30)),
    patchAdoptionRate30dPct: clamp(roundTo(basePatchRate + (rng() - 0.5) * 12, 1), 20, 65),
  };
}

function generateCyberInsuranceMarket(rng: () => number): CyberInsuranceMarket {
  const basePremiums = 14;
  const baseYoYGrowth = 22.5;
  const baseRateIncrease = 11.3;
  const baseLossRatio = 65.2;
  const baseCoverageLimit = 5.8;
  const baseDenialRate = 28.4;

  const topInsurers = CYBER_INSURER_SEEDS.map((seed) => {
    const jitter = (rng() - 0.5) * seed.baseMarketSharePct * 0.08;
    return {
      name: seed.name,
      marketSharePct: clamp(roundTo(seed.baseMarketSharePct + jitter, 1), 1, 20),
    };
  });

  return {
    globalPremiumsBillions: roundTo(basePremiums + (rng() - 0.5) * 3, 1),
    yearOverYearGrowthPct: clamp(roundTo(baseYoYGrowth + (rng() - 0.5) * 8, 1), 8, 35),
    avgRateIncreasePct: clamp(roundTo(baseRateIncrease + (rng() - 0.5) * 6, 1), 3, 20),
    lossRatioPct: clamp(roundTo(baseLossRatio + (rng() - 0.5) * 12, 1), 45, 85),
    avgCoverageLimitMillions: roundTo(Math.max(1, baseCoverageLimit + (rng() - 0.5) * 2), 1),
    denialRatePct: clamp(roundTo(baseDenialRate + (rng() - 0.5) * 10, 1), 15, 45),
    topInsurers,
  };
}

function generateCybersecurityData(): CybersecurityResponse {
  const rng = seededRandom('cybersecurity');

  return {
    threatLandscape: generateThreatLandscape(rng),
    sectorRiskAssessment: generateSectorRiskAssessment(rng),
    majorBreaches: generateMajorBreaches(rng),
    ransomwareLandscape: generateRansomwareLandscape(rng),
    vulnerabilityMetrics: generateVulnerabilityMetrics(rng),
    cyberInsuranceMarket: generateCyberInsuranceMarket(rng),
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: CybersecurityResponse | null; expiresAt: number } = {
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

    const data = generateCybersecurityData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Cybersecurity] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate cybersecurity data' });
  }
});

export default router;
