import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface UpcomingElection {
  country: string;
  date: string;
  type: string;
  incumbent: string;
  frontrunner: string;
  pollingMargin: number;
  turnoutForecast: number;
  marketSensitivity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

interface PolicyRisk {
  country: string;
  trade: number;
  fiscal: number;
  monetary: number;
  regulatory: number;
  compositeScore: number;
  outlook: 'STABLE' | 'DETERIORATING' | 'IMPROVING';
}

interface MarketSensitivityEntry {
  assetClass: 'FX' | 'RATES' | 'EQUITIES';
  instrument: string;
  election: string;
  baseCase: number;
  bullScenario: number;
  bearScenario: number;
  impliedMove: number;
  unit: string;
}

interface HistoricalPattern {
  electionCycle: string;
  avgVolIncreasePct: number;
  peakUncertaintyWeeks: number;
  sectorRotation: string;
  durationOfUncertaintyDays: number;
  spxDrawdownPct: number;
  recoveryDays: number;
}

interface PredictionMarketEntry {
  event: string;
  outcome: string;
  impliedProbability: number;
  change1d: number;
  change1w: number;
  volume24h: number;
  source: string;
}

interface RiskPremiumEntry {
  market: string;
  tenor: string;
  currentVol: number;
  fairValueVol: number;
  electionPremium: number;
  termStructureKink: number;
  daysToElection: number;
}

interface GeopoliticalHotspot {
  region: string;
  riskLevel: 'ELEVATED' | 'HIGH' | 'CRITICAL';
  description: string;
  financialExposure: number;
  affectedAssets: string[];
  probabilityOfEscalation: number;
}

interface LegislativeItem {
  country: string;
  bill: string;
  status: string;
  passProbability: number;
  marketImpact: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  affectedSectors: string[];
  expectedVoteDate: string;
}

interface ElectionRiskResponse {
  upcomingElections: UpcomingElection[];
  policyRisk: PolicyRisk[];
  marketSensitivity: MarketSensitivityEntry[];
  historicalPatterns: HistoricalPattern[];
  predictionMarkets: PredictionMarketEntry[];
  riskPremium: RiskPremiumEntry[];
  geopoliticalHotspots: GeopoliticalHotspot[];
  legislativeTracker: LegislativeItem[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: ElectionRiskResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Election configuration ──

interface ElectionConfig {
  country: string;
  dateOffset: number; // days from today
  type: string;
  incumbent: string;
  frontrunner: string;
  baseMargin: number;
  baseTurnout: number;
  baseSensitivity: number; // 0-100
}

const ELECTION_CONFIGS: ElectionConfig[] = [
  { country: 'Germany', dateOffset: 45, type: 'Federal Election', incumbent: 'Friedrich Merz', frontrunner: 'Friedrich Merz', baseMargin: 8.2, baseTurnout: 76.5, baseSensitivity: 72 },
  { country: 'Japan', dateOffset: 120, type: 'House of Councillors', incumbent: 'Shigeru Ishiba', frontrunner: 'Shigeru Ishiba', baseMargin: 4.5, baseTurnout: 52.8, baseSensitivity: 58 },
  { country: 'Australia', dateOffset: 85, type: 'Federal Election', incumbent: 'Anthony Albanese', frontrunner: 'Peter Dutton', baseMargin: 2.1, baseTurnout: 91.2, baseSensitivity: 45 },
  { country: 'South Korea', dateOffset: 210, type: 'Presidential Election', incumbent: 'Han Duck-soo (Acting)', frontrunner: 'Lee Jae-myung', baseMargin: 12.5, baseTurnout: 77.1, baseSensitivity: 65 },
  { country: 'Canada', dateOffset: 30, type: 'Federal Election', incumbent: 'Mark Carney', frontrunner: 'Pierre Poilievre', baseMargin: 3.8, baseTurnout: 62.4, baseSensitivity: 52 },
  { country: 'India', dateOffset: 280, type: 'State Elections (UP, Punjab)', incumbent: 'Various', frontrunner: 'BJP Coalition', baseMargin: 6.0, baseTurnout: 67.3, baseSensitivity: 48 },
  { country: 'Brazil', dateOffset: 550, type: 'Municipal Runoffs', incumbent: 'Lula da Silva', frontrunner: 'Tarcisio de Freitas', baseMargin: 5.3, baseTurnout: 79.0, baseSensitivity: 55 },
  { country: 'United Kingdom', dateOffset: 365, type: 'Local Elections', incumbent: 'Keir Starmer', frontrunner: 'Reform UK Candidates', baseMargin: 1.5, baseTurnout: 34.2, baseSensitivity: 38 },
  { country: 'Mexico', dateOffset: 180, type: 'Midterm Congressional', incumbent: 'Claudia Sheinbaum', frontrunner: 'Morena Coalition', baseMargin: 9.7, baseTurnout: 55.8, baseSensitivity: 62 },
  { country: 'Philippines', dateOffset: 75, type: 'Midterm Elections', incumbent: 'Bongbong Marcos', frontrunner: 'Sara Duterte Bloc', baseMargin: 7.2, baseTurnout: 73.6, baseSensitivity: 42 },
];

// ── Policy risk configuration ──

interface PolicyRiskConfig {
  country: string;
  baseTrade: number;
  baseFiscal: number;
  baseMonetary: number;
  baseRegulatory: number;
  outlookBias: number; // positive = improving, negative = deteriorating
}

const POLICY_RISK_CONFIGS: PolicyRiskConfig[] = [
  { country: 'United States', baseTrade: 78, baseFiscal: 72, baseMonetary: 45, baseRegulatory: 68, outlookBias: -0.2 },
  { country: 'China', baseTrade: 82, baseFiscal: 55, baseMonetary: 38, baseRegulatory: 75, outlookBias: -0.3 },
  { country: 'European Union', baseTrade: 52, baseFiscal: 65, baseMonetary: 42, baseRegulatory: 70, outlookBias: 0.1 },
  { country: 'Japan', baseTrade: 35, baseFiscal: 80, baseMonetary: 55, baseRegulatory: 30, outlookBias: 0.0 },
  { country: 'United Kingdom', baseTrade: 60, baseFiscal: 58, baseMonetary: 48, baseRegulatory: 55, outlookBias: 0.1 },
  { country: 'India', baseTrade: 45, baseFiscal: 50, baseMonetary: 35, baseRegulatory: 52, outlookBias: 0.2 },
  { country: 'Brazil', baseTrade: 40, baseFiscal: 68, baseMonetary: 60, baseRegulatory: 48, outlookBias: -0.1 },
  { country: 'South Korea', baseTrade: 55, baseFiscal: 42, baseMonetary: 40, baseRegulatory: 50, outlookBias: -0.4 },
  { country: 'Mexico', baseTrade: 65, baseFiscal: 58, baseMonetary: 42, baseRegulatory: 72, outlookBias: -0.2 },
  { country: 'Turkey', baseTrade: 50, baseFiscal: 75, baseMonetary: 85, baseRegulatory: 62, outlookBias: -0.1 },
];

// ── Market sensitivity configuration ──

interface MarketSensitivityConfig {
  assetClass: 'FX' | 'RATES' | 'EQUITIES';
  instrument: string;
  election: string;
  baseCase: number;
  baseBull: number;
  baseBear: number;
  unit: string;
}

const MARKET_SENSITIVITY_CONFIGS: MarketSensitivityConfig[] = [
  { assetClass: 'FX', instrument: 'EUR/USD', election: 'Germany Federal', baseCase: 1.0850, baseBull: 1.1020, baseBear: 1.0580, unit: '' },
  { assetClass: 'FX', instrument: 'USD/JPY', election: 'Japan HoC', baseCase: 152.50, baseBull: 148.00, baseBear: 158.00, unit: '' },
  { assetClass: 'FX', instrument: 'AUD/USD', election: 'Australia Federal', baseCase: 0.6520, baseBull: 0.6680, baseBear: 0.6340, unit: '' },
  { assetClass: 'FX', instrument: 'USD/CAD', election: 'Canada Federal', baseCase: 1.3650, baseBull: 1.3420, baseBear: 1.3950, unit: '' },
  { assetClass: 'FX', instrument: 'USD/KRW', election: 'South Korea Presidential', baseCase: 1345, baseBull: 1295, baseBear: 1420, unit: '' },
  { assetClass: 'RATES', instrument: 'Bund 10Y', election: 'Germany Federal', baseCase: 2.45, baseBull: 2.30, baseBear: 2.72, unit: '%' },
  { assetClass: 'RATES', instrument: 'JGB 10Y', election: 'Japan HoC', baseCase: 1.05, baseBull: 0.90, baseBear: 1.25, unit: '%' },
  { assetClass: 'RATES', instrument: 'Gilt 10Y', election: 'UK Local', baseCase: 4.35, baseBull: 4.15, baseBear: 4.60, unit: '%' },
  { assetClass: 'RATES', instrument: 'UST 10Y', election: 'Multi-event', baseCase: 4.28, baseBull: 4.05, baseBear: 4.55, unit: '%' },
  { assetClass: 'EQUITIES', instrument: 'DAX', election: 'Germany Federal', baseCase: 18500, baseBull: 19200, baseBear: 17400, unit: 'pts' },
  { assetClass: 'EQUITIES', instrument: 'Nikkei 225', election: 'Japan HoC', baseCase: 38200, baseBull: 40100, baseBear: 35800, unit: 'pts' },
  { assetClass: 'EQUITIES', instrument: 'ASX 200', election: 'Australia Federal', baseCase: 7850, baseBull: 8120, baseBear: 7520, unit: 'pts' },
  { assetClass: 'EQUITIES', instrument: 'KOSPI', election: 'South Korea Presidential', baseCase: 2580, baseBull: 2750, baseBear: 2380, unit: 'pts' },
  { assetClass: 'EQUITIES', instrument: 'Bovespa', election: 'Brazil Municipal', baseCase: 128500, baseBull: 135000, baseBear: 120000, unit: 'pts' },
];

// ── Historical patterns configuration ──

interface HistoricalPatternConfig {
  electionCycle: string;
  baseVolIncrease: number;
  basePeakWeeks: number;
  sectorRotation: string;
  baseDuration: number;
  baseDrawdown: number;
  baseRecoveryDays: number;
}

const HISTORICAL_PATTERN_CONFIGS: HistoricalPatternConfig[] = [
  { electionCycle: 'US 2024 Presidential', baseVolIncrease: 28.5, basePeakWeeks: 3, sectorRotation: 'Energy > Defense > Healthcare', baseDuration: 45, baseDrawdown: 5.2, baseRecoveryDays: 18 },
  { electionCycle: 'UK 2024 General', baseVolIncrease: 18.3, basePeakWeeks: 2, sectorRotation: 'Utilities > Banks > Housing', baseDuration: 30, baseDrawdown: 3.1, baseRecoveryDays: 12 },
  { electionCycle: 'France 2022 Presidential', baseVolIncrease: 35.2, basePeakWeeks: 4, sectorRotation: 'Banks > Luxury > Defense', baseDuration: 55, baseDrawdown: 7.8, baseRecoveryDays: 25 },
  { electionCycle: 'Brazil 2022 Presidential', baseVolIncrease: 42.1, basePeakWeeks: 5, sectorRotation: 'Commodities > Banks > Agri', baseDuration: 65, baseDrawdown: 9.4, baseRecoveryDays: 32 },
  { electionCycle: 'Japan 2024 Snap Election', baseVolIncrease: 15.8, basePeakWeeks: 1, sectorRotation: 'Banks > Autos > Tech', baseDuration: 20, baseDrawdown: 2.5, baseRecoveryDays: 8 },
  { electionCycle: 'India 2024 General', baseVolIncrease: 22.4, basePeakWeeks: 3, sectorRotation: 'Infra > Banks > IT', baseDuration: 40, baseDrawdown: 4.8, baseRecoveryDays: 15 },
  { electionCycle: 'Mexico 2024 Presidential', baseVolIncrease: 38.7, basePeakWeeks: 4, sectorRotation: 'Banks > Mining > Consumer', baseDuration: 50, baseDrawdown: 8.1, baseRecoveryDays: 28 },
  { electionCycle: 'Germany 2021 Federal', baseVolIncrease: 12.5, basePeakWeeks: 2, sectorRotation: 'Autos > Industrials > Green Energy', baseDuration: 25, baseDrawdown: 2.0, baseRecoveryDays: 10 },
];

// ── Prediction markets configuration ──

interface PredictionMarketConfig {
  event: string;
  outcome: string;
  baseProb: number;
  baseVolume: number;
  source: string;
}

const PREDICTION_MARKET_CONFIGS: PredictionMarketConfig[] = [
  { event: 'Germany Federal Election Winner', outcome: 'CDU/CSU Coalition', baseProb: 72.5, baseVolume: 8500000, source: 'Polymarket' },
  { event: 'Germany Federal Election Winner', outcome: 'SPD-led Coalition', baseProb: 18.2, baseVolume: 3200000, source: 'Polymarket' },
  { event: 'Canada Federal Election Winner', outcome: 'Conservative Majority', baseProb: 48.5, baseVolume: 5100000, source: 'Polymarket' },
  { event: 'Canada Federal Election Winner', outcome: 'Liberal Minority', baseProb: 35.8, baseVolume: 4800000, source: 'Polymarket' },
  { event: 'South Korea Presidential Winner', outcome: 'Lee Jae-myung (DPK)', baseProb: 58.3, baseVolume: 6200000, source: 'Polymarket' },
  { event: 'Japan PM after HoC Election', outcome: 'Ishiba Continues', baseProb: 62.0, baseVolume: 2800000, source: 'Metaculus' },
  { event: 'Australia Federal Election Winner', outcome: 'Coalition (LNP)', baseProb: 52.1, baseVolume: 3900000, source: 'Smarkets' },
  { event: 'Australia Federal Election Winner', outcome: 'Labor Government', baseProb: 42.5, baseVolume: 3600000, source: 'Smarkets' },
  { event: 'US Fed Rate Cut by Dec 2026', outcome: '>= 3 Cuts', baseProb: 38.5, baseVolume: 12400000, source: 'Polymarket' },
  { event: 'EU-China Trade Deal 2026', outcome: 'Partial Agreement', baseProb: 25.8, baseVolume: 1800000, source: 'Metaculus' },
  { event: 'UK Rejoins Single Market by 2030', outcome: 'Yes', baseProb: 8.2, baseVolume: 950000, source: 'Metaculus' },
  { event: 'Mexico Constitutional Reform Passes', outcome: 'Full Passage', baseProb: 65.0, baseVolume: 2100000, source: 'Polymarket' },
];

// ── Risk premium configuration ──

interface RiskPremiumConfig {
  market: string;
  tenor: string;
  baseVol: number;
  baseFairVol: number;
  basePremium: number;
  baseKink: number;
  baseDaysToElection: number;
}

const RISK_PREMIUM_CONFIGS: RiskPremiumConfig[] = [
  { market: 'EUR/USD', tenor: '1M', baseVol: 8.5, baseFairVol: 7.2, basePremium: 1.3, baseKink: 0.8, baseDaysToElection: 45 },
  { market: 'EUR/USD', tenor: '3M', baseVol: 9.2, baseFairVol: 7.8, basePremium: 1.4, baseKink: 1.2, baseDaysToElection: 45 },
  { market: 'USD/JPY', tenor: '1M', baseVol: 10.8, baseFairVol: 9.5, basePremium: 1.3, baseKink: 0.6, baseDaysToElection: 120 },
  { market: 'USD/JPY', tenor: '3M', baseVol: 11.5, baseFairVol: 9.8, basePremium: 1.7, baseKink: 1.5, baseDaysToElection: 120 },
  { market: 'DAX Options', tenor: '1M', baseVol: 16.2, baseFairVol: 14.5, basePremium: 1.7, baseKink: 1.0, baseDaysToElection: 45 },
  { market: 'DAX Options', tenor: '3M', baseVol: 17.8, baseFairVol: 15.0, basePremium: 2.8, baseKink: 2.2, baseDaysToElection: 45 },
  { market: 'Nikkei Options', tenor: '1M', baseVol: 18.5, baseFairVol: 16.8, basePremium: 1.7, baseKink: 0.5, baseDaysToElection: 120 },
  { market: 'Nikkei Options', tenor: '3M', baseVol: 19.2, baseFairVol: 17.0, basePremium: 2.2, baseKink: 1.8, baseDaysToElection: 120 },
  { market: 'USD/CAD', tenor: '1M', baseVol: 7.2, baseFairVol: 6.0, basePremium: 1.2, baseKink: 0.9, baseDaysToElection: 30 },
  { market: 'KOSPI Options', tenor: '1M', baseVol: 20.5, baseFairVol: 17.8, basePremium: 2.7, baseKink: 1.4, baseDaysToElection: 210 },
  { market: 'KOSPI Options', tenor: '3M', baseVol: 21.8, baseFairVol: 18.2, basePremium: 3.6, baseKink: 2.8, baseDaysToElection: 210 },
  { market: 'Bovespa Options', tenor: '3M', baseVol: 24.5, baseFairVol: 21.0, basePremium: 3.5, baseKink: 2.0, baseDaysToElection: 550 },
];

// ── Geopolitical hotspot configuration ──

interface HotspotConfig {
  region: string;
  baseRiskScore: number; // 0-100, maps to level
  description: string;
  baseExposure: number; // $B
  affectedAssets: string[];
  baseEscalationProb: number;
}

const HOTSPOT_CONFIGS: HotspotConfig[] = [
  { region: 'Taiwan Strait', baseRiskScore: 78, description: 'Elevated military activity and diplomatic tensions; semiconductor supply chain risk', baseExposure: 850, affectedAssets: ['TSMC', 'USD/TWD', 'SOX Index', 'Nikkei 225'], baseEscalationProb: 12 },
  { region: 'Middle East (Iran-Israel)', baseRiskScore: 82, description: 'Ongoing proxy conflicts and nuclear program tensions; energy price volatility', baseExposure: 620, affectedAssets: ['Brent Crude', 'Gold', 'USD/ILS', 'Defense ETFs'], baseEscalationProb: 18 },
  { region: 'Ukraine-Russia', baseRiskScore: 75, description: 'Protracted conflict with shifting frontlines; European energy and grain markets exposed', baseExposure: 480, affectedAssets: ['Wheat Futures', 'EUR/USD', 'European Natural Gas', 'DAX'], baseEscalationProb: 15 },
  { region: 'South China Sea', baseRiskScore: 65, description: 'Maritime territorial disputes and freedom of navigation operations; shipping lane risk', baseExposure: 320, affectedAssets: ['Shipping Indices', 'USD/PHP', 'USD/VND', 'Container Lines'], baseEscalationProb: 8 },
  { region: 'Korean Peninsula', baseRiskScore: 72, description: 'Nuclear posturing and domestic political instability in South Korea; tech supply chain risk', baseExposure: 550, affectedAssets: ['KOSPI', 'Samsung', 'USD/KRW', 'SK Hynix'], baseEscalationProb: 6 },
  { region: 'Sahel Region', baseRiskScore: 58, description: 'Military coups and jihadist insurgency across West Africa; mining and resource extraction risk', baseExposure: 95, affectedAssets: ['Gold Miners', 'Uranium Futures', 'EUR/XOF'], baseEscalationProb: 22 },
  { region: 'Arctic Resource Competition', baseRiskScore: 45, description: 'Competing territorial claims for mineral and shipping routes; long-term resource access risk', baseExposure: 180, affectedAssets: ['Rare Earth ETFs', 'Shipping Indices', 'Nordic Currencies'], baseEscalationProb: 3 },
  { region: 'India-Pakistan Border', baseRiskScore: 60, description: 'Periodic escalation over Kashmir and water rights; regional stability risk', baseExposure: 210, affectedAssets: ['Nifty 50', 'USD/INR', 'USD/PKR', 'Indian IT Services'], baseEscalationProb: 5 },
];

// ── Legislative tracker configuration ──

interface LegislativeConfig {
  country: string;
  bill: string;
  status: string;
  basePassProb: number;
  baseImpact: number; // 0-100
  affectedSectors: string[];
  voteOffsetDays: number;
}

const LEGISLATIVE_CONFIGS: LegislativeConfig[] = [
  { country: 'United States', bill: 'Corporate Tax Reform Act', status: 'Senate Committee', basePassProb: 35, baseImpact: 82, affectedSectors: ['Technology', 'Pharma', 'Multinationals'], voteOffsetDays: 90 },
  { country: 'United States', bill: 'Digital Asset Regulatory Framework', status: 'House Floor Vote', basePassProb: 58, baseImpact: 75, affectedSectors: ['Crypto', 'Fintech', 'Banking'], voteOffsetDays: 30 },
  { country: 'European Union', bill: 'Carbon Border Adjustment Mechanism Phase 2', status: 'Trilogue Negotiations', basePassProb: 72, baseImpact: 70, affectedSectors: ['Steel', 'Cement', 'Chemicals', 'Aluminum'], voteOffsetDays: 120 },
  { country: 'European Union', bill: 'AI Act Enforcement Guidelines', status: 'Commission Drafting', basePassProb: 85, baseImpact: 65, affectedSectors: ['Big Tech', 'AI Startups', 'Cloud Providers'], voteOffsetDays: 60 },
  { country: 'China', bill: 'State Council Data Export Controls', status: 'Final Review', basePassProb: 92, baseImpact: 72, affectedSectors: ['Cloud', 'Tech Hardware', 'Social Media', 'EV Manufacturers'], voteOffsetDays: 15 },
  { country: 'Japan', bill: 'BOJ Policy Normalization Framework', status: 'Diet Deliberation', basePassProb: 68, baseImpact: 88, affectedSectors: ['Banking', 'Real Estate', 'Insurance', 'Export Manufacturers'], voteOffsetDays: 75 },
  { country: 'India', bill: 'Semiconductor Manufacturing Incentive Act', status: 'Lok Sabha Committee', basePassProb: 78, baseImpact: 58, affectedSectors: ['Semiconductors', 'EMS', 'IT Services'], voteOffsetDays: 45 },
  { country: 'United Kingdom', bill: 'Financial Services Deregulation Bill', status: 'Second Reading', basePassProb: 62, baseImpact: 68, affectedSectors: ['Banks', 'Insurance', 'Asset Management', 'Fintech'], voteOffsetDays: 55 },
  { country: 'Brazil', bill: 'Central Bank Independence Amendment', status: 'Senate Vote', basePassProb: 45, baseImpact: 78, affectedSectors: ['Banks', 'BRL Assets', 'Fixed Income'], voteOffsetDays: 20 },
  { country: 'Mexico', bill: 'Energy Sector Nationalization Extension', status: 'Chamber of Deputies', basePassProb: 70, baseImpact: 85, affectedSectors: ['Energy', 'Mining', 'Foreign Utilities', 'MXN Assets'], voteOffsetDays: 40 },
];

// ── Data generation ──

function generateUpcomingElections(rng: () => number): UpcomingElection[] {
  const today = new Date();

  return ELECTION_CONFIGS.map((cfg) => {
    const electionDate = new Date(today);
    electionDate.setDate(electionDate.getDate() + cfg.dateOffset);

    const marginJitter = (rng() - 0.5) * 4;
    const pollingMargin = Math.round((cfg.baseMargin + marginJitter) * 10) / 10;

    const turnoutJitter = (rng() - 0.5) * 6;
    const turnoutForecast = Math.round(Math.max(25, Math.min(98, cfg.baseTurnout + turnoutJitter)) * 10) / 10;

    const sensitivityJitter = (rng() - 0.5) * 20;
    const sensitivityScore = Math.max(0, Math.min(100, cfg.baseSensitivity + sensitivityJitter));

    let marketSensitivity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    if (sensitivityScore >= 80) {
      marketSensitivity = 'EXTREME';
    } else if (sensitivityScore >= 60) {
      marketSensitivity = 'HIGH';
    } else if (sensitivityScore >= 40) {
      marketSensitivity = 'MODERATE';
    } else {
      marketSensitivity = 'LOW';
    }

    return {
      country: cfg.country,
      date: electionDate.toISOString().slice(0, 10),
      type: cfg.type,
      incumbent: cfg.incumbent,
      frontrunner: cfg.frontrunner,
      pollingMargin,
      turnoutForecast,
      marketSensitivity,
    };
  });
}

function generatePolicyRisk(rng: () => number): PolicyRisk[] {
  return POLICY_RISK_CONFIGS.map((cfg) => {
    const jitter = () => (rng() - 0.5) * 15;

    const trade = Math.round(Math.max(0, Math.min(100, cfg.baseTrade + jitter())));
    const fiscal = Math.round(Math.max(0, Math.min(100, cfg.baseFiscal + jitter())));
    const monetary = Math.round(Math.max(0, Math.min(100, cfg.baseMonetary + jitter())));
    const regulatory = Math.round(Math.max(0, Math.min(100, cfg.baseRegulatory + jitter())));

    const compositeScore = Math.round((trade * 0.3 + fiscal * 0.25 + monetary * 0.25 + regulatory * 0.2) * 10) / 10;

    const outlookRoll = cfg.outlookBias + (rng() - 0.5) * 0.8;
    let outlook: 'STABLE' | 'DETERIORATING' | 'IMPROVING';
    if (outlookRoll > 0.2) {
      outlook = 'IMPROVING';
    } else if (outlookRoll < -0.2) {
      outlook = 'DETERIORATING';
    } else {
      outlook = 'STABLE';
    }

    return {
      country: cfg.country,
      trade,
      fiscal,
      monetary,
      regulatory,
      compositeScore,
      outlook,
    };
  });
}

function generateMarketSensitivity(rng: () => number): MarketSensitivityEntry[] {
  return MARKET_SENSITIVITY_CONFIGS.map((cfg) => {
    const range = Math.abs(cfg.baseBull - cfg.baseBear);
    const jitterScale = range * 0.05;

    const baseCase = Math.round((cfg.baseCase + (rng() - 0.5) * jitterScale * 2) * 100) / 100;
    const bullScenario = Math.round((cfg.baseBull + (rng() - 0.5) * jitterScale * 2) * 100) / 100;
    const bearScenario = Math.round((cfg.baseBear + (rng() - 0.5) * jitterScale * 2) * 100) / 100;
    const impliedMove = Math.round(Math.abs(bullScenario - bearScenario) / 2 * 100) / 100;

    return {
      assetClass: cfg.assetClass,
      instrument: cfg.instrument,
      election: cfg.election,
      baseCase,
      bullScenario,
      bearScenario,
      impliedMove,
      unit: cfg.unit,
    };
  });
}

function generateHistoricalPatterns(rng: () => number): HistoricalPattern[] {
  return HISTORICAL_PATTERN_CONFIGS.map((cfg) => {
    const volJitter = (rng() - 0.5) * 6;
    const avgVolIncreasePct = Math.round((cfg.baseVolIncrease + volJitter) * 10) / 10;

    const peakWeeksJitter = Math.round((rng() - 0.5) * 2);
    const peakUncertaintyWeeks = Math.max(1, cfg.basePeakWeeks + peakWeeksJitter);

    const durationJitter = Math.round((rng() - 0.5) * 10);
    const durationOfUncertaintyDays = Math.max(5, cfg.baseDuration + durationJitter);

    const drawdownJitter = (rng() - 0.5) * 2;
    const spxDrawdownPct = Math.round(Math.max(0.5, cfg.baseDrawdown + drawdownJitter) * 10) / 10;

    const recoveryJitter = Math.round((rng() - 0.5) * 8);
    const recoveryDays = Math.max(3, cfg.baseRecoveryDays + recoveryJitter);

    return {
      electionCycle: cfg.electionCycle,
      avgVolIncreasePct,
      peakUncertaintyWeeks,
      sectorRotation: cfg.sectorRotation,
      durationOfUncertaintyDays,
      spxDrawdownPct,
      recoveryDays,
    };
  });
}

function generatePredictionMarkets(rng: () => number): PredictionMarketEntry[] {
  return PREDICTION_MARKET_CONFIGS.map((cfg) => {
    const probJitter = (rng() - 0.5) * 8;
    const impliedProbability = Math.round(Math.max(1, Math.min(99, cfg.baseProb + probJitter)) * 10) / 10;

    const change1d = Math.round((rng() - 0.5) * 4 * 10) / 10;
    const change1w = Math.round((rng() - 0.5) * 10 * 10) / 10;

    const volumeJitter = (rng() - 0.5) * cfg.baseVolume * 0.25;
    const volume24h = Math.round(cfg.baseVolume + volumeJitter);

    return {
      event: cfg.event,
      outcome: cfg.outcome,
      impliedProbability,
      change1d,
      change1w,
      volume24h,
      source: cfg.source,
    };
  });
}

function generateRiskPremium(rng: () => number): RiskPremiumEntry[] {
  return RISK_PREMIUM_CONFIGS.map((cfg) => {
    const volJitter = (rng() - 0.5) * 2;
    const currentVol = Math.round((cfg.baseVol + volJitter) * 10) / 10;

    const fairJitter = (rng() - 0.5) * 1.5;
    const fairValueVol = Math.round((cfg.baseFairVol + fairJitter) * 10) / 10;

    const electionPremium = Math.round((currentVol - fairValueVol) * 10) / 10;

    const kinkJitter = (rng() - 0.5) * 0.8;
    const termStructureKink = Math.round(Math.max(0, cfg.baseKink + kinkJitter) * 10) / 10;

    const daysJitter = Math.round((rng() - 0.5) * 10);
    const daysToElection = Math.max(1, cfg.baseDaysToElection + daysJitter);

    return {
      market: cfg.market,
      tenor: cfg.tenor,
      currentVol,
      fairValueVol,
      electionPremium,
      termStructureKink,
      daysToElection,
    };
  });
}

function generateGeopoliticalHotspots(rng: () => number): GeopoliticalHotspot[] {
  return HOTSPOT_CONFIGS.map((cfg) => {
    const riskJitter = (rng() - 0.5) * 15;
    const riskScore = Math.max(0, Math.min(100, cfg.baseRiskScore + riskJitter));

    let riskLevel: 'ELEVATED' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 75) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 55) {
      riskLevel = 'HIGH';
    } else {
      riskLevel = 'ELEVATED';
    }

    const exposureJitter = (rng() - 0.5) * cfg.baseExposure * 0.15;
    const financialExposure = Math.round(cfg.baseExposure + exposureJitter);

    const escJitter = (rng() - 0.5) * 8;
    const probabilityOfEscalation = Math.round(Math.max(1, Math.min(95, cfg.baseEscalationProb + escJitter)));

    return {
      region: cfg.region,
      riskLevel,
      description: cfg.description,
      financialExposure,
      affectedAssets: cfg.affectedAssets,
      probabilityOfEscalation,
    };
  });
}

function generateLegislativeTracker(rng: () => number): LegislativeItem[] {
  const today = new Date();

  return LEGISLATIVE_CONFIGS.map((cfg) => {
    const voteDate = new Date(today);
    voteDate.setDate(voteDate.getDate() + cfg.voteOffsetDays);

    const probJitter = (rng() - 0.5) * 15;
    const passProbability = Math.round(Math.max(5, Math.min(98, cfg.basePassProb + probJitter)));

    const impactJitter = (rng() - 0.5) * 15;
    const impactScore = Math.max(0, Math.min(100, cfg.baseImpact + impactJitter));

    let marketImpact: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    if (impactScore >= 80) {
      marketImpact = 'EXTREME';
    } else if (impactScore >= 60) {
      marketImpact = 'HIGH';
    } else if (impactScore >= 40) {
      marketImpact = 'MODERATE';
    } else {
      marketImpact = 'LOW';
    }

    return {
      country: cfg.country,
      bill: cfg.bill,
      status: cfg.status,
      passProbability,
      marketImpact,
      affectedSectors: cfg.affectedSectors,
      expectedVoteDate: voteDate.toISOString().slice(0, 10),
    };
  });
}

function generateElectionRiskData(): ElectionRiskResponse {
  const rng = seededRandom('election-risk');

  const upcomingElections = generateUpcomingElections(rng);
  const policyRisk = generatePolicyRisk(rng);
  const marketSensitivity = generateMarketSensitivity(rng);
  const historicalPatterns = generateHistoricalPatterns(rng);
  const predictionMarkets = generatePredictionMarkets(rng);
  const riskPremium = generateRiskPremium(rng);
  const geopoliticalHotspots = generateGeopoliticalHotspots(rng);
  const legislativeTracker = generateLegislativeTracker(rng);

  return {
    upcomingElections,
    policyRisk,
    marketSensitivity,
    historicalPatterns,
    predictionMarkets,
    riskPremium,
    geopoliticalHotspots,
    legislativeTracker,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateElectionRiskData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ElectionRisk] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate election risk data' });
  }
});

export default router;
