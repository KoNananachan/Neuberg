import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

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

interface MarketOverview {
  globalCyberInsuranceGWPBillions: number;
  lossRatioPct: number;
  yoyPremiumGrowthPct: number;
  avgRansomwarePaymentMillions: number;
  totalBreachCostAvgMillions: number;
  claimsFrequencyTrendPct: number;
}

interface InsurerProfile {
  insurer: string;
  marketSharePct: number;
  gwpMillions: number;
  lossRatioPct: number;
  combinedRatioPct: number;
  avgPremiumChangeYoYPct: number;
  capacityOfferedMillions: number;
  retentionRatePct: number;
}

interface ThreatLandscapeEntry {
  threatType: string;
  frequencyAttacksPerMonth: number;
  avgCostPerIncidentMillions: number;
  yoyChangePct: number;
  topTargetedSector: string;
  mitigationRatePct: number;
}

interface SectorRiskProfile {
  industry: string;
  avgBreachCostMillions: number;
  timeToContainDays: number;
  cyberInsuranceAdoptionPct: number;
  premiumAvgThousands: number;
  mostCommonAttackVector: string;
}

interface MajorIncident {
  organization: string;
  type: string;
  estimatedImpactMillions: number;
  recordsAffected: number;
  date: string;
  insuranceCoverageStatus: string;
}

interface RegulatoryFramework {
  framework: string;
  complianceDeadline: string;
  adoptionRatePct: number;
  penaltyRange: string;
}

interface CyberRiskInsuranceResponse {
  marketOverview: MarketOverview;
  insuranceMarket: InsurerProfile[];
  threatLandscape: ThreatLandscapeEntry[];
  sectorRiskProfiles: SectorRiskProfile[];
  recentMajorIncidents: MajorIncident[];
  regulatoryCompliance: RegulatoryFramework[];
  timestamp: string;
}

// ── Seed Data: Insurance Market ──

interface InsurerSeed {
  insurer: string;
  baseMarketSharePct: number;
  baseGWPMillions: number;
  baseLossRatioPct: number;
  baseCombinedRatioPct: number;
  baseAvgPremiumChangePct: number;
  baseCapacityMillions: number;
  baseRetentionRatePct: number;
}

const INSURER_SEEDS: InsurerSeed[] = [
  { insurer: 'AIG', baseMarketSharePct: 13.2, baseGWPMillions: 1848, baseLossRatioPct: 62.5, baseCombinedRatioPct: 94.8, baseAvgPremiumChangePct: 8.2, baseCapacityMillions: 500, baseRetentionRatePct: 88.5 },
  { insurer: 'Chubb', baseMarketSharePct: 11.8, baseGWPMillions: 1652, baseLossRatioPct: 58.3, baseCombinedRatioPct: 91.2, baseAvgPremiumChangePct: 6.5, baseCapacityMillions: 450, baseRetentionRatePct: 91.2 },
  { insurer: 'Beazley', baseMarketSharePct: 9.5, baseGWPMillions: 1330, baseLossRatioPct: 64.7, baseCombinedRatioPct: 96.1, baseAvgPremiumChangePct: 10.3, baseCapacityMillions: 350, baseRetentionRatePct: 86.8 },
  { insurer: 'Hiscox', baseMarketSharePct: 7.1, baseGWPMillions: 994, baseLossRatioPct: 66.2, baseCombinedRatioPct: 98.4, baseAvgPremiumChangePct: 12.1, baseCapacityMillions: 300, baseRetentionRatePct: 84.3 },
  { insurer: 'Munich Re', baseMarketSharePct: 8.4, baseGWPMillions: 1176, baseLossRatioPct: 60.8, baseCombinedRatioPct: 93.5, baseAvgPremiumChangePct: 7.8, baseCapacityMillions: 600, baseRetentionRatePct: 90.1 },
  { insurer: 'Zurich', baseMarketSharePct: 6.8, baseGWPMillions: 952, baseLossRatioPct: 63.1, baseCombinedRatioPct: 95.7, baseAvgPremiumChangePct: 9.4, baseCapacityMillions: 380, baseRetentionRatePct: 87.6 },
  { insurer: 'Travelers', baseMarketSharePct: 5.9, baseGWPMillions: 826, baseLossRatioPct: 61.4, baseCombinedRatioPct: 94.2, baseAvgPremiumChangePct: 7.1, baseCapacityMillions: 320, baseRetentionRatePct: 89.4 },
  { insurer: 'Tokio Marine', baseMarketSharePct: 5.3, baseGWPMillions: 742, baseLossRatioPct: 59.6, baseCombinedRatioPct: 92.8, baseAvgPremiumChangePct: 5.8, baseCapacityMillions: 280, baseRetentionRatePct: 92.0 },
];

// ── Seed Data: Threat Landscape ──

interface ThreatSeed {
  threatType: string;
  baseFrequency: number;
  baseAvgCostMillions: number;
  baseYoYChangePct: number;
  topTargetedSector: string;
  baseMitigationRatePct: number;
}

const THREAT_SEEDS: ThreatSeed[] = [
  { threatType: 'Ransomware', baseFrequency: 1850, baseAvgCostMillions: 4.62, baseYoYChangePct: 18.5, topTargetedSector: 'Healthcare', baseMitigationRatePct: 42.3 },
  { threatType: 'BEC (Business Email Compromise)', baseFrequency: 3200, baseAvgCostMillions: 0.125, baseYoYChangePct: 12.8, topTargetedSector: 'Financial Services', baseMitigationRatePct: 38.7 },
  { threatType: 'Supply Chain Attack', baseFrequency: 420, baseAvgCostMillions: 8.75, baseYoYChangePct: 27.3, topTargetedSector: 'Technology', baseMitigationRatePct: 29.4 },
  { threatType: 'Zero-Day Exploit', baseFrequency: 185, baseAvgCostMillions: 12.40, baseYoYChangePct: 22.1, topTargetedSector: 'Government', baseMitigationRatePct: 18.6 },
  { threatType: 'DDoS', baseFrequency: 5600, baseAvgCostMillions: 0.52, baseYoYChangePct: 8.4, topTargetedSector: 'Financial Services', baseMitigationRatePct: 61.2 },
  { threatType: 'Data Exfiltration', baseFrequency: 980, baseAvgCostMillions: 5.85, baseYoYChangePct: 15.6, topTargetedSector: 'Technology', baseMitigationRatePct: 34.8 },
  { threatType: 'Insider Threat', baseFrequency: 640, baseAvgCostMillions: 3.18, baseYoYChangePct: 6.2, topTargetedSector: 'Financial Services', baseMitigationRatePct: 45.1 },
  { threatType: 'Cloud Misconfiguration', baseFrequency: 2100, baseAvgCostMillions: 1.92, baseYoYChangePct: 21.7, topTargetedSector: 'Technology', baseMitigationRatePct: 36.5 },
];

// ── Seed Data: Sector Risk Profiles ──

interface SectorRiskSeed {
  industry: string;
  baseAvgBreachCostMillions: number;
  baseTimeToContainDays: number;
  baseCyberInsuranceAdoptionPct: number;
  basePremiumAvgThousands: number;
  mostCommonAttackVector: string;
}

const SECTOR_RISK_SEEDS: SectorRiskSeed[] = [
  { industry: 'Healthcare', baseAvgBreachCostMillions: 10.93, baseTimeToContainDays: 236, baseCyberInsuranceAdoptionPct: 72.4, basePremiumAvgThousands: 185, mostCommonAttackVector: 'Ransomware' },
  { industry: 'Financial Services', baseAvgBreachCostMillions: 5.90, baseTimeToContainDays: 177, baseCyberInsuranceAdoptionPct: 88.6, basePremiumAvgThousands: 240, mostCommonAttackVector: 'Phishing / BEC' },
  { industry: 'Technology', baseAvgBreachCostMillions: 4.97, baseTimeToContainDays: 158, baseCyberInsuranceAdoptionPct: 81.3, basePremiumAvgThousands: 210, mostCommonAttackVector: 'Supply Chain Attack' },
  { industry: 'Manufacturing', baseAvgBreachCostMillions: 4.47, baseTimeToContainDays: 212, baseCyberInsuranceAdoptionPct: 54.8, basePremiumAvgThousands: 125, mostCommonAttackVector: 'Ransomware' },
  { industry: 'Retail', baseAvgBreachCostMillions: 3.28, baseTimeToContainDays: 197, baseCyberInsuranceAdoptionPct: 61.2, basePremiumAvgThousands: 105, mostCommonAttackVector: 'Point-of-Sale Malware' },
  { industry: 'Energy/Utilities', baseAvgBreachCostMillions: 4.78, baseTimeToContainDays: 215, baseCyberInsuranceAdoptionPct: 67.5, basePremiumAvgThousands: 195, mostCommonAttackVector: 'OT/ICS Compromise' },
  { industry: 'Government', baseAvgBreachCostMillions: 5.13, baseTimeToContainDays: 259, baseCyberInsuranceAdoptionPct: 43.7, basePremiumAvgThousands: 150, mostCommonAttackVector: 'Zero-Day Exploit' },
  { industry: 'Education', baseAvgBreachCostMillions: 3.65, baseTimeToContainDays: 245, baseCyberInsuranceAdoptionPct: 38.2, basePremiumAvgThousands: 80, mostCommonAttackVector: 'Ransomware' },
];

// ── Seed Data: Major Incidents ──

interface MajorIncidentSeed {
  organization: string;
  type: string;
  baseImpactMillions: number;
  baseRecordsAffected: number;
  daysAgoBase: number;
  insuranceCoverageStatus: string;
}

const INCIDENT_SEEDS: MajorIncidentSeed[] = [
  { organization: 'Major Healthcare Provider', type: 'Ransomware', baseImpactMillions: 340, baseRecordsAffected: 28_500_000, daysAgoBase: 12, insuranceCoverageStatus: 'Partially covered - $50M sublimit' },
  { organization: 'Global Financial Institution', type: 'Data Exfiltration', baseImpactMillions: 215, baseRecordsAffected: 15_200_000, daysAgoBase: 34, insuranceCoverageStatus: 'Fully covered - $200M tower' },
  { organization: 'Large Technology Conglomerate', type: 'Supply Chain Attack', baseImpactMillions: 480, baseRecordsAffected: 42_000_000, daysAgoBase: 58, insuranceCoverageStatus: 'Coverage disputed - war exclusion clause' },
  { organization: 'National Retail Chain', type: 'Point-of-Sale Breach', baseImpactMillions: 128, baseRecordsAffected: 8_700_000, daysAgoBase: 75, insuranceCoverageStatus: 'Covered - claim in progress' },
  { organization: 'Regional Energy Utility', type: 'OT/ICS Attack', baseImpactMillions: 92, baseRecordsAffected: 2_100_000, daysAgoBase: 95, insuranceCoverageStatus: 'Uninsured - no cyber policy' },
];

// ── Seed Data: Regulatory Frameworks ──

interface RegulatoryFrameworkSeed {
  framework: string;
  complianceDeadline: string;
  baseAdoptionRatePct: number;
  penaltyRange: string;
}

const REGULATORY_SEEDS: RegulatoryFrameworkSeed[] = [
  { framework: 'SEC Cyber Disclosure Rules', complianceDeadline: '2024-12-18', baseAdoptionRatePct: 68.4, penaltyRange: '$100K - $2M per violation' },
  { framework: 'NIST CSF 2.0', complianceDeadline: 'Voluntary (recommended by 2025-Q2)', baseAdoptionRatePct: 52.7, penaltyRange: 'N/A (voluntary framework)' },
  { framework: 'EU NIS2 Directive', complianceDeadline: '2024-10-17', baseAdoptionRatePct: 45.3, penaltyRange: 'Up to EUR 10M or 2% global turnover' },
  { framework: 'DORA (Digital Operational Resilience Act)', complianceDeadline: '2025-01-17', baseAdoptionRatePct: 38.9, penaltyRange: 'Up to EUR 5M or 1% daily global turnover' },
  { framework: 'PCI DSS 4.0', complianceDeadline: '2025-03-31', baseAdoptionRatePct: 61.2, penaltyRange: '$5K - $100K per month of non-compliance' },
];

// ── Data Generation ──

function generateMarketOverview(rng: () => number): MarketOverview {
  const baseGWP = 14.2;
  const baseLossRatio = 63.5;
  const baseYoYGrowth = 18.4;
  const baseRansomPayment = 1.54;
  const baseBreachCost = 4.52;
  const baseClaimsFrequencyTrend = 12.6;

  return {
    globalCyberInsuranceGWPBillions: roundTo(baseGWP + (rng() - 0.5) * 2.4, 2),
    lossRatioPct: clamp(roundTo(baseLossRatio + (rng() - 0.5) * 10, 1), 45, 82),
    yoyPremiumGrowthPct: clamp(roundTo(baseYoYGrowth + (rng() - 0.5) * 8, 1), 6, 30),
    avgRansomwarePaymentMillions: roundTo(Math.max(0.5, baseRansomPayment + (rng() - 0.5) * 0.6), 2),
    totalBreachCostAvgMillions: roundTo(Math.max(2.0, baseBreachCost + (rng() - 0.5) * 1.2), 2),
    claimsFrequencyTrendPct: clamp(roundTo(baseClaimsFrequencyTrend + (rng() - 0.5) * 8, 1), 2, 25),
  };
}

function generateInsuranceMarket(rng: () => number): InsurerProfile[] {
  return INSURER_SEEDS.map((seed) => {
    const shareJitter = (rng() - 0.5) * seed.baseMarketSharePct * 0.08;
    const gwpJitter = Math.round((rng() - 0.5) * seed.baseGWPMillions * 0.08);
    const lossJitter = (rng() - 0.5) * 5;
    const combinedJitter = (rng() - 0.5) * 4;
    const premChangeJitter = (rng() - 0.5) * 4;
    const capacityJitter = Math.round((rng() - 0.5) * seed.baseCapacityMillions * 0.1);
    const retentionJitter = (rng() - 0.5) * 3;

    return {
      insurer: seed.insurer,
      marketSharePct: clamp(roundTo(seed.baseMarketSharePct + shareJitter, 1), 2, 18),
      gwpMillions: Math.max(200, seed.baseGWPMillions + gwpJitter),
      lossRatioPct: clamp(roundTo(seed.baseLossRatioPct + lossJitter, 1), 40, 85),
      combinedRatioPct: clamp(roundTo(seed.baseCombinedRatioPct + combinedJitter, 1), 82, 110),
      avgPremiumChangeYoYPct: clamp(roundTo(seed.baseAvgPremiumChangePct + premChangeJitter, 1), 1, 25),
      capacityOfferedMillions: Math.max(100, seed.baseCapacityMillions + capacityJitter),
      retentionRatePct: clamp(roundTo(seed.baseRetentionRatePct + retentionJitter, 1), 75, 98),
    };
  });
}

function generateThreatLandscape(rng: () => number): ThreatLandscapeEntry[] {
  return THREAT_SEEDS.map((seed) => {
    const freqJitter = Math.round((rng() - 0.5) * seed.baseFrequency * 0.12);
    const costJitter = (rng() - 0.5) * seed.baseAvgCostMillions * 0.15;
    const yoyJitter = (rng() - 0.5) * 8;
    const mitigationJitter = (rng() - 0.5) * 6;

    return {
      threatType: seed.threatType,
      frequencyAttacksPerMonth: Math.max(20, seed.baseFrequency + freqJitter),
      avgCostPerIncidentMillions: roundTo(Math.max(0.01, seed.baseAvgCostMillions + costJitter), 2),
      yoyChangePct: clamp(roundTo(seed.baseYoYChangePct + yoyJitter, 1), -5, 45),
      topTargetedSector: seed.topTargetedSector,
      mitigationRatePct: clamp(roundTo(seed.baseMitigationRatePct + mitigationJitter, 1), 10, 75),
    };
  });
}

function generateSectorRiskProfiles(rng: () => number): SectorRiskProfile[] {
  return SECTOR_RISK_SEEDS.map((seed) => {
    const costJitter = (rng() - 0.5) * seed.baseAvgBreachCostMillions * 0.1;
    const containJitter = Math.round((rng() - 0.5) * 24);
    const adoptionJitter = (rng() - 0.5) * 6;
    const premiumJitter = Math.round((rng() - 0.5) * seed.basePremiumAvgThousands * 0.12);

    return {
      industry: seed.industry,
      avgBreachCostMillions: roundTo(Math.max(1.0, seed.baseAvgBreachCostMillions + costJitter), 2),
      timeToContainDays: Math.max(60, seed.baseTimeToContainDays + containJitter),
      cyberInsuranceAdoptionPct: clamp(roundTo(seed.baseCyberInsuranceAdoptionPct + adoptionJitter, 1), 20, 98),
      premiumAvgThousands: Math.max(30, seed.basePremiumAvgThousands + premiumJitter),
      mostCommonAttackVector: seed.mostCommonAttackVector,
    };
  });
}

function generateRecentMajorIncidents(rng: () => number): MajorIncident[] {
  const now = new Date();
  return INCIDENT_SEEDS.map((seed) => {
    const impactJitter = Math.round((rng() - 0.5) * seed.baseImpactMillions * 0.15);
    const recordsJitter = Math.round((rng() - 0.5) * seed.baseRecordsAffected * 0.12);
    const daysAgoJitter = Math.round((rng() - 0.5) * 10);
    const daysAgo = Math.max(1, seed.daysAgoBase + daysAgoJitter);
    const incidentDate = new Date(now.getTime() - daysAgo * 86_400_000);

    return {
      organization: seed.organization,
      type: seed.type,
      estimatedImpactMillions: Math.max(10, seed.baseImpactMillions + impactJitter),
      recordsAffected: Math.max(100_000, seed.baseRecordsAffected + recordsJitter),
      date: incidentDate.toISOString().slice(0, 10),
      insuranceCoverageStatus: seed.insuranceCoverageStatus,
    };
  });
}

function generateRegulatoryCompliance(rng: () => number): RegulatoryFramework[] {
  return REGULATORY_SEEDS.map((seed) => {
    const adoptionJitter = (rng() - 0.5) * 8;

    return {
      framework: seed.framework,
      complianceDeadline: seed.complianceDeadline,
      adoptionRatePct: clamp(roundTo(seed.baseAdoptionRatePct + adoptionJitter, 1), 15, 95),
      penaltyRange: seed.penaltyRange,
    };
  });
}

function generateCyberRiskInsuranceData(): CyberRiskInsuranceResponse {
  const rng = seededRandom('cyber-risk-insurance');

  return {
    marketOverview: generateMarketOverview(rng),
    insuranceMarket: generateInsuranceMarket(rng),
    threatLandscape: generateThreatLandscape(rng),
    sectorRiskProfiles: generateSectorRiskProfiles(rng),
    recentMajorIncidents: generateRecentMajorIncidents(rng),
    regulatoryCompliance: generateRegulatoryCompliance(rng),
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: CyberRiskInsuranceResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateCyberRiskInsuranceData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CyberRiskInsurance] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate cyber risk insurance data' });
  }
});

export default router;
