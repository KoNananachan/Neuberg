import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function roundTo(v: number, d: number): number { const f = 10 ** d; return Math.round(v * f) / f; }
function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
// ── Types ──

interface GlobalRiskIndex {
  currentLevel: number;
  change: number;
  percentile: number;
  trend: 'rising' | 'falling' | 'stable';
  historicalAvg: number;
}

interface CountryRiskScore {
  country: string;
  overallScore: number;
  political: number;
  economic: number;
  security: number;
  sanctions: boolean;
  change: number;
  outlook: 'positive' | 'negative' | 'stable';
}

interface ActiveSanction {
  target: string;
  imposedBy: string;
  type: 'trade' | 'financial' | 'travel' | 'arms';
  effectiveDate: string;
  impactLevel: 'high' | 'medium' | 'low';
}

interface ConflictZone {
  region: string;
  parties: string[];
  intensity: 'high' | 'medium' | 'low';
  economicImpact: string;
  affectedCommodities: string[];
  startDate: string;
}

interface TradeTension {
  parties: string;
  category: 'tariffs' | 'tech' | 'investment';
  severity: number;
  latestAction: string;
  marketImpact: string;
}

interface SafeHavenFlow {
  asset: string;
  flowDirection: 'inflow' | 'outflow';
  magnitude: 'strong' | 'moderate' | 'weak';
  change1w: number;
}

interface GeopoliticalRiskResponse {
  globalRiskIndex: GlobalRiskIndex;
  countryRiskScores: CountryRiskScore[];
  activeSanctions: ActiveSanction[];
  conflictZones: ConflictZone[];
  tradeTensions: TradeTension[];
  safeHavenFlows: SafeHavenFlow[];
  timestamp: string;
}

// ── Seed Data: 15 countries ──

interface CountrySeed {
  country: string;
  baseOverall: number;
  basePolitical: number;
  baseEconomic: number;
  baseSecurity: number;
  sanctions: boolean;
  outlookBias: number; // >0 positive, <0 negative
}

const COUNTRY_SEEDS: CountrySeed[] = [
  { country: 'United States',  baseOverall: 32, basePolitical: 42, baseEconomic: 22, baseSecurity: 28, sanctions: false, outlookBias: 0.1 },
  { country: 'China',          baseOverall: 48, basePolitical: 58, baseEconomic: 40, baseSecurity: 45, sanctions: false, outlookBias: -0.1 },
  { country: 'Russia',         baseOverall: 82, basePolitical: 78, baseEconomic: 85, baseSecurity: 88, sanctions: true,  outlookBias: -0.4 },
  { country: 'India',          baseOverall: 38, basePolitical: 35, baseEconomic: 32, baseSecurity: 48, sanctions: false, outlookBias: 0.2 },
  { country: 'Brazil',         baseOverall: 40, basePolitical: 45, baseEconomic: 42, baseSecurity: 30, sanctions: false, outlookBias: 0.0 },
  { country: 'Turkey',         baseOverall: 55, basePolitical: 60, baseEconomic: 62, baseSecurity: 50, sanctions: false, outlookBias: -0.2 },
  { country: 'Iran',           baseOverall: 78, basePolitical: 72, baseEconomic: 82, baseSecurity: 80, sanctions: true,  outlookBias: -0.3 },
  { country: 'Saudi Arabia',   baseOverall: 35, basePolitical: 45, baseEconomic: 25, baseSecurity: 38, sanctions: false, outlookBias: 0.1 },
  { country: 'Israel',         baseOverall: 62, basePolitical: 55, baseEconomic: 42, baseSecurity: 78, sanctions: false, outlookBias: -0.2 },
  { country: 'Ukraine',        baseOverall: 88, basePolitical: 72, baseEconomic: 90, baseSecurity: 95, sanctions: false, outlookBias: -0.3 },
  { country: 'Taiwan',         baseOverall: 52, basePolitical: 48, baseEconomic: 30, baseSecurity: 65, sanctions: false, outlookBias: 0.0 },
  { country: 'South Korea',    baseOverall: 30, basePolitical: 35, baseEconomic: 22, baseSecurity: 40, sanctions: false, outlookBias: 0.1 },
  { country: 'Japan',          baseOverall: 20, basePolitical: 18, baseEconomic: 28, baseSecurity: 18, sanctions: false, outlookBias: 0.2 },
  { country: 'Germany',        baseOverall: 22, basePolitical: 25, baseEconomic: 30, baseSecurity: 15, sanctions: false, outlookBias: 0.1 },
  { country: 'United Kingdom', baseOverall: 25, basePolitical: 28, baseEconomic: 30, baseSecurity: 18, sanctions: false, outlookBias: 0.0 },
];

// ── Seed Data: Sanctions ──

interface SanctionSeed {
  target: string;
  imposedBy: string;
  type: 'trade' | 'financial' | 'travel' | 'arms';
  dateOffset: number; // days before today
  baseImpact: number; // 0-100
}

const SANCTION_SEEDS: SanctionSeed[] = [
  { target: 'Russia',               imposedBy: 'US / EU / G7',       type: 'financial', dateOffset: -820, baseImpact: 92 },
  { target: 'Russia',               imposedBy: 'US / EU',            type: 'trade',     dateOffset: -780, baseImpact: 85 },
  { target: 'Russia',               imposedBy: 'EU / UK',            type: 'arms',      dateOffset: -830, baseImpact: 78 },
  { target: 'Iran',                 imposedBy: 'US',                 type: 'financial', dateOffset: -2200, baseImpact: 88 },
  { target: 'Iran',                 imposedBy: 'US / EU',            type: 'trade',     dateOffset: -1800, baseImpact: 82 },
  { target: 'Iran',                 imposedBy: 'UN',                 type: 'arms',      dateOffset: -1500, baseImpact: 70 },
  { target: 'North Korea',          imposedBy: 'UN / US',            type: 'financial', dateOffset: -3000, baseImpact: 95 },
  { target: 'North Korea',          imposedBy: 'UN',                 type: 'trade',     dateOffset: -2800, baseImpact: 90 },
  { target: 'North Korea',          imposedBy: 'UN',                 type: 'arms',      dateOffset: -3200, baseImpact: 88 },
  { target: 'Syria',                imposedBy: 'US / EU',            type: 'financial', dateOffset: -4500, baseImpact: 75 },
  { target: 'Myanmar (Military)',   imposedBy: 'US / EU / UK',       type: 'financial', dateOffset: -1600, baseImpact: 65 },
  { target: 'Belarus',              imposedBy: 'EU / US / UK',       type: 'financial', dateOffset: -1400, baseImpact: 72 },
  { target: 'Belarus',              imposedBy: 'EU',                 type: 'trade',     dateOffset: -1350, baseImpact: 60 },
  { target: 'Venezuela',            imposedBy: 'US',                 type: 'financial', dateOffset: -2500, baseImpact: 68 },
  { target: 'Chinese Tech Firms',   imposedBy: 'US',                 type: 'trade',     dateOffset: -600,  baseImpact: 80 },
  { target: 'Chinese Tech Firms',   imposedBy: 'US',                 type: 'financial', dateOffset: -400,  baseImpact: 72 },
  { target: 'Russia (Energy)',      imposedBy: 'EU / G7',            type: 'trade',     dateOffset: -650,  baseImpact: 90 },
  { target: 'Iran (Oil)',           imposedBy: 'US',                 type: 'trade',     dateOffset: -1900, baseImpact: 85 },
  { target: 'Russia (Travel)',      imposedBy: 'EU / US / UK',       type: 'travel',    dateOffset: -800,  baseImpact: 55 },
  { target: 'Houthi-linked Entities', imposedBy: 'US / UK',          type: 'financial', dateOffset: -180,  baseImpact: 62 },
];

// ── Seed Data: Conflict Zones ──

interface ConflictSeed {
  region: string;
  parties: string[];
  baseIntensity: number; // 0-100
  economicImpact: string;
  affectedCommodities: string[];
  startDateOffset: number; // days before today
}

const CONFLICT_SEEDS: ConflictSeed[] = [
  { region: 'Ukraine - Eastern Front',    parties: ['Ukraine', 'Russia'],                              baseIntensity: 88, economicImpact: 'Severe disruption to European energy supply, grain exports, and fertilizer markets', affectedCommodities: ['Natural Gas', 'Wheat', 'Corn', 'Potash', 'Sunflower Oil'], startDateOffset: -1100 },
  { region: 'Gaza - Israel',              parties: ['Israel', 'Hamas', 'Hezbollah'],                   baseIntensity: 82, economicImpact: 'Elevated oil risk premium, shipping rerouting around Red Sea, regional FDI freeze', affectedCommodities: ['Crude Oil', 'Natural Gas', 'Potash'],                      startDateOffset: -530 },
  { region: 'Red Sea / Bab el-Mandeb',    parties: ['Houthi Forces', 'US/UK Coalition'],               baseIntensity: 68, economicImpact: 'Shipping insurance costs surged 10x, Suez Canal transit down 45%, container rates elevated', affectedCommodities: ['Shipping Rates', 'Crude Oil', 'Consumer Goods'],           startDateOffset: -460 },
  { region: 'Sudan',                      parties: ['SAF (Sudanese Army)', 'RSF (Rapid Support Forces)'], baseIntensity: 75, economicImpact: 'Humanitarian crisis, gold mining disruption, regional refugee pressure', affectedCommodities: ['Gold', 'Gum Arabic', 'Sesame'],                              startDateOffset: -1050 },
  { region: 'Myanmar',                    parties: ['Military Junta', 'NUG / Ethnic Armed Groups'],    baseIntensity: 62, economicImpact: 'Rare earth supply risk, disruption to jade/gem exports, China border trade impact', affectedCommodities: ['Rare Earths', 'Jade', 'Natural Gas'],                       startDateOffset: -1700 },
  { region: 'Sahel Region',               parties: ['JNIM', 'ISGS', 'Military Juntas (Mali/Niger/BF)'], baseIntensity: 58, economicImpact: 'Gold and uranium mining disrupted, French/Western investment withdrawal', affectedCommodities: ['Gold', 'Uranium', 'Cotton'],                                 startDateOffset: -2500 },
  { region: 'Taiwan Strait',              parties: ['China (PLA)', 'Taiwan'],                          baseIntensity: 42, economicImpact: 'Semiconductor supply chain risk, tech sector valuation uncertainty, shipping lane threat', affectedCommodities: ['Semiconductors', 'Electronics', 'Shipping Rates'],          startDateOffset: -900 },
  { region: 'Ethiopia - Amhara',          parties: ['Ethiopian Federal Forces', 'Fano Militia'],       baseIntensity: 52, economicImpact: 'Coffee export disruption, domestic supply chain fragmentation', affectedCommodities: ['Coffee', 'Teff', 'Oilseeds'],                                startDateOffset: -550 },
];

// ── Seed Data: Trade Tensions ──

interface TradeTensionSeed {
  parties: string;
  category: 'tariffs' | 'tech' | 'investment';
  baseSeverity: number; // 1-10
  latestAction: string;
  marketImpact: string;
}

const TRADE_TENSION_SEEDS: TradeTensionSeed[] = [
  { parties: 'US - China',  category: 'tariffs',    baseSeverity: 8.5, latestAction: 'US imposed 145% tariffs on Chinese goods; China retaliated with 125% counter-tariffs', marketImpact: 'SPX -2.3%, USDCNH +0.8%, Soybean futures -5%' },
  { parties: 'US - China',  category: 'tech',       baseSeverity: 9.0, latestAction: 'US expanded chip export controls to cover advanced AI accelerators and EUV components', marketImpact: 'SOX Index -4.1%, SMIC -8%, ASML -3.2%' },
  { parties: 'US - China',  category: 'investment', baseSeverity: 7.2, latestAction: 'US executive order restricting PE/VC investment in Chinese AI, quantum, and biotech', marketImpact: 'China tech ETFs -3.5%, HK-listed tech -2.8%' },
  { parties: 'EU - China',  category: 'tariffs',    baseSeverity: 6.5, latestAction: 'EU finalized anti-subsidy tariffs on Chinese EVs (17-38%); China filed WTO dispute', marketImpact: 'European auto +1.5%, BYD -4%, Stellantis +2.1%' },
  { parties: 'EU - China',  category: 'tech',       baseSeverity: 5.8, latestAction: 'EU proposed critical raw materials screening mechanism targeting Chinese processors', marketImpact: 'Rare earth stocks +6%, EU battery makers +2.3%' },
  { parties: 'US - EU',     category: 'tariffs',    baseSeverity: 4.2, latestAction: 'Steel/aluminum tariff negotiations stalled; Section 232 quotas remain in effect', marketImpact: 'US Steel +1.2%, ArcelorMittal -0.8%' },
  { parties: 'US - EU',     category: 'investment', baseSeverity: 3.5, latestAction: 'Divergent approaches to digital services taxation threatening bilateral investment flows', marketImpact: 'FAANG composite flat, EU digital tax revenue +18% YoY' },
  { parties: 'India - Canada', category: 'investment', baseSeverity: 5.0, latestAction: 'Diplomatic tensions over extradition dispute; bilateral trade review initiated', marketImpact: 'Nifty 50 -0.3%, CAD/INR +0.5%' },
  { parties: 'Japan - South Korea', category: 'tech', baseSeverity: 3.8, latestAction: 'Japan eased semiconductor material export controls; bilateral tech cooperation resumed', marketImpact: 'KOSPI +0.8%, Nikkei +0.4%, memory chip stocks +2.5%' },
  { parties: 'US - India',  category: 'tariffs',    baseSeverity: 4.5, latestAction: 'US flagged Indias high import duties on electronics; India proposed phased reduction', marketImpact: 'Nifty IT +1.2%, Apple India suppliers +3.5%' },
];

// ── Seed Data: Safe Haven Flows ──

interface SafeHavenSeed {
  asset: string;
  baseDirection: number; // >0 = inflow, <0 = outflow
  baseMagnitude: number; // 0-100
  baseChange1w: number;
}

const SAFE_HAVEN_SEEDS: SafeHavenSeed[] = [
  { asset: 'Gold',     baseDirection: 0.7,  baseMagnitude: 72, baseChange1w: 2.4 },
  { asset: 'USD',      baseDirection: 0.5,  baseMagnitude: 58, baseChange1w: 0.8 },
  { asset: 'CHF',      baseDirection: 0.4,  baseMagnitude: 52, baseChange1w: 0.6 },
  { asset: 'JPY',      baseDirection: 0.3,  baseMagnitude: 45, baseChange1w: 0.4 },
  { asset: 'UST 10Y',  baseDirection: 0.6,  baseMagnitude: 65, baseChange1w: 1.2 },
  { asset: 'BTC',      baseDirection: -0.1, baseMagnitude: 38, baseChange1w: -1.5 },
];

// ── Data Generation ──

function generateGlobalRiskIndex(rng: () => number): GlobalRiskIndex {
  // GPR index typically 80-200, spikes to 300+ during crises
  const base = 128;
  const jitter = (rng() - 0.5) * 80; // range ~88-168 normally
  const currentLevel = clamp(Math.round(base + jitter), 50, 300);

  const change = roundTo((rng() - 0.48) * 20, 1);

  const percentile = clamp(Math.round(rng() * 100), 1, 99);

  const trendRoll = rng();
  let trend: 'rising' | 'falling' | 'stable';
  if (trendRoll < 0.35) trend = 'rising';
  else if (trendRoll < 0.65) trend = 'stable';
  else trend = 'falling';

  const historicalAvg = roundTo(115 + (rng() - 0.5) * 10, 1);

  return { currentLevel, change, percentile, trend, historicalAvg };
}

function generateCountryRiskScores(rng: () => number): CountryRiskScore[] {
  return COUNTRY_SEEDS.map((seed) => {
    const jitter = () => (rng() - 0.5) * 12;
    const overallScore = clamp(Math.round(seed.baseOverall + jitter()), 0, 100);
    const political = clamp(Math.round(seed.basePolitical + jitter()), 0, 100);
    const economic = clamp(Math.round(seed.baseEconomic + jitter()), 0, 100);
    const security = clamp(Math.round(seed.baseSecurity + jitter()), 0, 100);
    const change = roundTo((rng() - 0.48) * 8, 1);

    const outlookRoll = seed.outlookBias + (rng() - 0.5) * 0.8;
    let outlook: 'positive' | 'negative' | 'stable';
    if (outlookRoll > 0.2) outlook = 'positive';
    else if (outlookRoll < -0.2) outlook = 'negative';
    else outlook = 'stable';

    return {
      country: seed.country,
      overallScore,
      political,
      economic,
      security,
      sanctions: seed.sanctions,
      change,
      outlook,
    };
  });
}

function generateActiveSanctions(rng: () => number): ActiveSanction[] {
  const today = new Date();

  return SANCTION_SEEDS.map((seed) => {
    const dateJitter = Math.floor((rng() - 0.5) * 60);
    const effectiveDate = new Date(today);
    effectiveDate.setDate(effectiveDate.getDate() + seed.dateOffset + dateJitter);

    const impactJitter = (rng() - 0.5) * 15;
    const impactScore = clamp(seed.baseImpact + impactJitter, 0, 100);

    let impactLevel: 'high' | 'medium' | 'low';
    if (impactScore >= 75) impactLevel = 'high';
    else if (impactScore >= 45) impactLevel = 'medium';
    else impactLevel = 'low';

    return {
      target: seed.target,
      imposedBy: seed.imposedBy,
      type: seed.type as 'trade' | 'financial' | 'travel' | 'arms',
      effectiveDate: effectiveDate.toISOString().slice(0, 10),
      impactLevel,
    };
  });
}

function generateConflictZones(rng: () => number): ConflictZone[] {
  const today = new Date();

  return CONFLICT_SEEDS.map((seed) => {
    const intensityJitter = (rng() - 0.5) * 20;
    const intensityScore = clamp(seed.baseIntensity + intensityJitter, 0, 100);

    let intensity: 'high' | 'medium' | 'low';
    if (intensityScore >= 70) intensity = 'high';
    else if (intensityScore >= 40) intensity = 'medium';
    else intensity = 'low';

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + seed.startDateOffset);

    return {
      region: seed.region,
      parties: seed.parties,
      intensity,
      economicImpact: seed.economicImpact,
      affectedCommodities: seed.affectedCommodities,
      startDate: startDate.toISOString().slice(0, 10),
    };
  });
}

function generateTradeTensions(rng: () => number): TradeTension[] {
  return TRADE_TENSION_SEEDS.map((seed) => {
    const severityJitter = (rng() - 0.5) * 2;
    const severity = clamp(roundTo(seed.baseSeverity + severityJitter, 1), 1, 10);

    return {
      parties: seed.parties,
      category: seed.category,
      severity,
      latestAction: seed.latestAction,
      marketImpact: seed.marketImpact,
    };
  });
}

function generateSafeHavenFlows(rng: () => number): SafeHavenFlow[] {
  return SAFE_HAVEN_SEEDS.map((seed) => {
    const dirJitter = (rng() - 0.5) * 0.6;
    const directionScore = seed.baseDirection + dirJitter;
    const flowDirection: 'inflow' | 'outflow' = directionScore >= 0 ? 'inflow' : 'outflow';

    const magJitter = (rng() - 0.5) * 30;
    const magScore = clamp(seed.baseMagnitude + magJitter, 0, 100);
    let magnitude: 'strong' | 'moderate' | 'weak';
    if (magScore >= 65) magnitude = 'strong';
    else if (magScore >= 35) magnitude = 'moderate';
    else magnitude = 'weak';

    const changeJitter = (rng() - 0.5) * 3;
    const change1w = roundTo(seed.baseChange1w + changeJitter, 1);

    return {
      asset: seed.asset,
      flowDirection,
      magnitude,
      change1w,
    };
  });
}

function generateGeopoliticalRiskData(): GeopoliticalRiskResponse {
  const rng = seededRandom('geopolitical-risk');

  return {
    globalRiskIndex: generateGlobalRiskIndex(rng),
    countryRiskScores: generateCountryRiskScores(rng),
    activeSanctions: generateActiveSanctions(rng),
    conflictZones: generateConflictZones(rng),
    tradeTensions: generateTradeTensions(rng),
    safeHavenFlows: generateSafeHavenFlows(rng),
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: GeopoliticalRiskResponse | null; expiresAt: number } = {
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

    const data = generateGeopoliticalRiskData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GeopoliticalRisk] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate geopolitical risk data' });
  }
});

export default router;
