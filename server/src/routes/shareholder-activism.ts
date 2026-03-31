import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface ActiveCampaign {
  activist: string;
  targetCompany: string;
  ticker: string;
  stakePct: number;
  demands: string[];
  campaignStartDate: string;
  status: 'NEW' | 'ESCALATING' | 'SETTLED' | 'WITHDRAWN';
  boardSeatsWon: number;
}

interface Filing13D {
  filer: string;
  target: string;
  ticker: string;
  shares: number;
  ownershipPct: number;
  purpose: string;
  filingDate: string;
}

interface ActivistReturn {
  targetCompany: string;
  ticker: string;
  activist: string;
  targetReturn: number;
  sp500Return: number;
  excessReturn: number;
  announcementDate: string;
  resolutionDate: string;
  daysToResolution: number;
}

interface TopActivist {
  name: string;
  aumBillions: number;
  activeCampaigns: number;
  winRatePct: number;
  avgReturnPct: number;
  style: string;
}

interface CampaignOutcome {
  resolution: 'SETTLED' | 'PROXY_FIGHT_WON' | 'PROXY_FIGHT_LOST' | 'WITHDRAWN';
  count: number;
  avgTimelineDays: number;
  pctOfTotal: number;
}

interface SectorTarget {
  sector: string;
  campaignCount: number;
  avgMarketCapBillions: number;
  pctOfTotal: number;
}

interface TacticUsed {
  tactic: string;
  count: number;
  successRatePct: number;
  pctOfCampaigns: number;
}

interface UpcomingEvent {
  event: string;
  company: string;
  ticker: string;
  date: string;
  type: 'PROXY_DEADLINE' | 'SHAREHOLDER_MEETING' | 'SETTLEMENT_DEADLINE' | '13D_AMENDMENT';
  activist: string;
}

interface ShareholderActivismResponse {
  activeCampaigns: ActiveCampaign[];
  recent13DFilings: Filing13D[];
  activistReturns: ActivistReturn[];
  topActivists: TopActivist[];
  campaignOutcomes: CampaignOutcome[];
  sectorTargets: SectorTarget[];
  tacticsUsed: TacticUsed[];
  upcomingEvents: UpcomingEvent[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: ShareholderActivismResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Campaign configuration ──

interface CampaignConfig {
  activist: string;
  targetCompany: string;
  ticker: string;
  baseStakePct: number;
  demands: string[];
  campaignStartDate: string;
  baseStatus: 'NEW' | 'ESCALATING' | 'SETTLED' | 'WITHDRAWN';
  baseBoardSeats: number;
}

const CAMPAIGN_CONFIGS: CampaignConfig[] = [
  { activist: 'Elliott Management', targetCompany: 'Southwest Airlines', ticker: 'LUV', baseStakePct: 11.0, demands: ['Board overhaul', 'CEO replacement', 'Capital allocation review'], campaignStartDate: '2025-06-10', baseStatus: 'ESCALATING', baseBoardSeats: 0 },
  { activist: 'Third Point', targetCompany: 'Bath & Body Works', ticker: 'BBWI', baseStakePct: 6.2, demands: ['Operational restructuring', 'Margin improvement plan'], campaignStartDate: '2025-09-15', baseStatus: 'NEW', baseBoardSeats: 0 },
  { activist: 'Starboard Value', targetCompany: 'Salesforce', ticker: 'CRM', baseStakePct: 1.8, demands: ['Cost discipline', 'AI strategy review', 'Buyback increase'], campaignStartDate: '2025-11-02', baseStatus: 'SETTLED', baseBoardSeats: 3 },
  { activist: 'Trian Partners', targetCompany: 'Disney', ticker: 'DIS', baseStakePct: 3.5, demands: ['Board representation', 'Streaming profitability', 'Succession planning'], campaignStartDate: '2025-04-20', baseStatus: 'ESCALATING', baseBoardSeats: 1 },
  { activist: 'Icahn Enterprises', targetCompany: 'Illumina', ticker: 'ILMN', baseStakePct: 1.4, demands: ['GRAIL spinoff', 'CEO replacement', 'Cost reduction'], campaignStartDate: '2025-03-01', baseStatus: 'SETTLED', baseBoardSeats: 3 },
  { activist: 'ValueAct Capital', targetCompany: 'Spotify Technology', ticker: 'SPOT', baseStakePct: 4.1, demands: ['Margin expansion', 'Podcast investment review'], campaignStartDate: '2025-12-18', baseStatus: 'NEW', baseBoardSeats: 0 },
  { activist: 'Pershing Square', targetCompany: 'Universal Music Group', ticker: 'UMG', baseStakePct: 2.9, demands: ['Streaming monetization', 'AI licensing strategy', 'Capital return'], campaignStartDate: '2026-01-05', baseStatus: 'NEW', baseBoardSeats: 0 },
  { activist: 'Jana Partners', targetCompany: 'TreeHouse Foods', ticker: 'THS', baseStakePct: 9.8, demands: ['Strategic alternatives', 'Divestiture of non-core brands'], campaignStartDate: '2025-07-22', baseStatus: 'ESCALATING', baseBoardSeats: 2 },
  { activist: 'Engine No. 1', targetCompany: 'ExxonMobil', ticker: 'XOM', baseStakePct: 0.02, demands: ['Climate transition plan', 'Board diversification'], campaignStartDate: '2025-05-14', baseStatus: 'WITHDRAWN', baseBoardSeats: 0 },
  { activist: 'D.E. Shaw', targetCompany: 'Emerson Electric', ticker: 'EMR', baseStakePct: 5.5, demands: ['Conglomerate breakup', 'Shareholder return program'], campaignStartDate: '2025-10-30', baseStatus: 'ESCALATING', baseBoardSeats: 1 },
];

// ── 13D filing configuration ──

interface Filing13DConfig {
  filer: string;
  target: string;
  ticker: string;
  baseShares: number;
  baseOwnershipPct: number;
  purpose: string;
  filingDate: string;
}

const FILING_CONFIGS: Filing13DConfig[] = [
  { filer: 'Elliott Investment Management', target: 'Southwest Airlines Co', ticker: 'LUV', baseShares: 64_200_000, baseOwnershipPct: 11.0, purpose: 'Seeking board representation and management changes', filingDate: '2026-03-12' },
  { filer: 'Third Point LLC', target: 'Bath & Body Works Inc', ticker: 'BBWI', baseShares: 14_100_000, baseOwnershipPct: 6.2, purpose: 'Investment purposes; may seek discussions with management', filingDate: '2026-03-10' },
  { filer: 'Trian Fund Management LP', target: 'The Walt Disney Co', ticker: 'DIS', baseShares: 63_500_000, baseOwnershipPct: 3.5, purpose: 'Seeking board seats; engaged on capital allocation strategy', filingDate: '2026-03-08' },
  { filer: 'Jana Partners LLC', target: 'TreeHouse Foods Inc', ticker: 'THS', baseShares: 5_500_000, baseOwnershipPct: 9.8, purpose: 'Urging strategic alternatives including potential sale', filingDate: '2026-03-05' },
  { filer: 'D.E. Shaw & Co LP', target: 'Emerson Electric Co', ticker: 'EMR', baseShares: 32_800_000, baseOwnershipPct: 5.5, purpose: 'Advocating portfolio simplification and separation', filingDate: '2026-03-03' },
  { filer: 'Pershing Square Capital Management', target: 'Universal Music Group NV', ticker: 'UMG', baseShares: 52_600_000, baseOwnershipPct: 2.9, purpose: 'Long-term investment; constructive engagement on strategy', filingDate: '2026-02-28' },
  { filer: 'ValueAct Holdings LP', target: 'Spotify Technology SA', ticker: 'SPOT', baseShares: 8_100_000, baseOwnershipPct: 4.1, purpose: 'Investment purposes; may engage on operational improvements', filingDate: '2026-02-25' },
  { filer: 'Starboard Value LP', target: 'Salesforce Inc', ticker: 'CRM', baseShares: 17_600_000, baseOwnershipPct: 1.8, purpose: 'Settled; three board designees appointed', filingDate: '2026-02-20' },
];

// ── Activist return configuration ──

interface ReturnConfig {
  targetCompany: string;
  ticker: string;
  activist: string;
  baseTargetReturn: number;
  baseSp500Return: number;
  announcementDate: string;
  resolutionDate: string;
  baseDaysToResolution: number;
}

const RETURN_CONFIGS: ReturnConfig[] = [
  { targetCompany: 'Salesforce', ticker: 'CRM', activist: 'Starboard Value', baseTargetReturn: 28.4, baseSp500Return: 12.1, announcementDate: '2025-11-02', resolutionDate: '2026-02-15', baseDaysToResolution: 105 },
  { targetCompany: 'Illumina', ticker: 'ILMN', activist: 'Icahn Enterprises', baseTargetReturn: 45.2, baseSp500Return: 8.7, announcementDate: '2025-03-01', resolutionDate: '2025-08-10', baseDaysToResolution: 162 },
  { targetCompany: 'Disney', ticker: 'DIS', activist: 'Trian Partners', baseTargetReturn: 18.6, baseSp500Return: 10.3, announcementDate: '2025-04-20', resolutionDate: '2025-12-01', baseDaysToResolution: 225 },
  { targetCompany: 'Southwest Airlines', ticker: 'LUV', activist: 'Elliott Management', baseTargetReturn: -5.3, baseSp500Return: 7.8, announcementDate: '2025-06-10', resolutionDate: '', baseDaysToResolution: 0 },
  { targetCompany: 'TreeHouse Foods', ticker: 'THS', activist: 'Jana Partners', baseTargetReturn: 32.1, baseSp500Return: 9.4, announcementDate: '2025-07-22', resolutionDate: '', baseDaysToResolution: 0 },
  { targetCompany: 'Emerson Electric', ticker: 'EMR', activist: 'D.E. Shaw', baseTargetReturn: 14.8, baseSp500Return: 11.2, announcementDate: '2025-10-30', resolutionDate: '', baseDaysToResolution: 0 },
];

// ── Top activist configuration ──

interface TopActivistConfig {
  name: string;
  baseAumBillions: number;
  baseActiveCampaigns: number;
  baseWinRatePct: number;
  baseAvgReturnPct: number;
  style: string;
}

const TOP_ACTIVIST_CONFIGS: TopActivistConfig[] = [
  { name: 'Elliott Management', baseAumBillions: 65.5, baseActiveCampaigns: 8, baseWinRatePct: 72.0, baseAvgReturnPct: 18.4, style: 'Aggressive multi-strategy' },
  { name: 'Icahn Enterprises', baseAumBillions: 16.8, baseActiveCampaigns: 4, baseWinRatePct: 58.0, baseAvgReturnPct: 14.2, style: 'Confrontational / proxy fights' },
  { name: 'Third Point', baseAumBillions: 12.4, baseActiveCampaigns: 5, baseWinRatePct: 65.0, baseAvgReturnPct: 16.8, style: 'Event-driven / operational' },
  { name: 'ValueAct Capital', baseAumBillions: 8.2, baseActiveCampaigns: 3, baseWinRatePct: 78.0, baseAvgReturnPct: 15.6, style: 'Constructive / collaborative' },
  { name: 'Trian Partners', baseAumBillions: 7.5, baseActiveCampaigns: 4, baseWinRatePct: 62.0, baseAvgReturnPct: 13.9, style: 'Operational improvement' },
  { name: 'Starboard Value', baseAumBillions: 6.1, baseActiveCampaigns: 6, baseWinRatePct: 74.0, baseAvgReturnPct: 19.2, style: 'Governance / cost-focused' },
  { name: 'Pershing Square', baseAumBillions: 18.5, baseActiveCampaigns: 3, baseWinRatePct: 55.0, baseAvgReturnPct: 22.1, style: 'Concentrated / high-conviction' },
  { name: 'Jana Partners', baseAumBillions: 3.8, baseActiveCampaigns: 5, baseWinRatePct: 60.0, baseAvgReturnPct: 12.5, style: 'M&A catalyst / breakup' },
  { name: 'Engine No. 1', baseAumBillions: 0.8, baseActiveCampaigns: 2, baseWinRatePct: 50.0, baseAvgReturnPct: 8.3, style: 'ESG / energy transition' },
  { name: 'D.E. Shaw', baseAumBillions: 60.0, baseActiveCampaigns: 3, baseWinRatePct: 68.0, baseAvgReturnPct: 17.0, style: 'Quantitative / strategic' },
];

// ── Outcome base configuration ──

interface OutcomeConfig {
  resolution: 'SETTLED' | 'PROXY_FIGHT_WON' | 'PROXY_FIGHT_LOST' | 'WITHDRAWN';
  baseCount: number;
  baseAvgTimelineDays: number;
}

const OUTCOME_CONFIGS: OutcomeConfig[] = [
  { resolution: 'SETTLED', baseCount: 42, baseAvgTimelineDays: 128 },
  { resolution: 'PROXY_FIGHT_WON', baseCount: 18, baseAvgTimelineDays: 210 },
  { resolution: 'PROXY_FIGHT_LOST', baseCount: 12, baseAvgTimelineDays: 245 },
  { resolution: 'WITHDRAWN', baseCount: 14, baseAvgTimelineDays: 95 },
];

// ── Sector target configuration ──

interface SectorConfig {
  sector: string;
  baseCampaignCount: number;
  baseAvgMarketCapBillions: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Technology', baseCampaignCount: 22, baseAvgMarketCapBillions: 48.5 },
  { sector: 'Healthcare', baseCampaignCount: 16, baseAvgMarketCapBillions: 18.2 },
  { sector: 'Industrials', baseCampaignCount: 14, baseAvgMarketCapBillions: 24.7 },
  { sector: 'Consumer Discretionary', baseCampaignCount: 12, baseAvgMarketCapBillions: 15.3 },
  { sector: 'Energy', baseCampaignCount: 9, baseAvgMarketCapBillions: 32.1 },
  { sector: 'Financials', baseCampaignCount: 8, baseAvgMarketCapBillions: 28.9 },
  { sector: 'Consumer Staples', baseCampaignCount: 6, baseAvgMarketCapBillions: 12.4 },
  { sector: 'Real Estate', baseCampaignCount: 5, baseAvgMarketCapBillions: 8.6 },
];

// ── Tactic configuration ──

interface TacticConfig {
  tactic: string;
  baseCount: number;
  baseSuccessRatePct: number;
}

const TACTIC_CONFIGS: TacticConfig[] = [
  { tactic: 'Board seat demands', baseCount: 58, baseSuccessRatePct: 68.0 },
  { tactic: 'M&A push (sale/merger)', baseCount: 34, baseSuccessRatePct: 42.0 },
  { tactic: 'Spinoff / separation', baseCount: 28, baseSuccessRatePct: 55.0 },
  { tactic: 'Share buyback increase', baseCount: 45, baseSuccessRatePct: 72.0 },
  { tactic: 'CEO / management change', baseCount: 22, baseSuccessRatePct: 38.0 },
  { tactic: 'Governance reform', baseCount: 36, baseSuccessRatePct: 64.0 },
  { tactic: 'Cost reduction / restructuring', baseCount: 40, baseSuccessRatePct: 60.0 },
  { tactic: 'Dividend increase', baseCount: 18, baseSuccessRatePct: 70.0 },
];

// ── Upcoming event configuration ──

interface EventConfig {
  event: string;
  company: string;
  ticker: string;
  daysFromNow: number;
  type: 'PROXY_DEADLINE' | 'SHAREHOLDER_MEETING' | 'SETTLEMENT_DEADLINE' | '13D_AMENDMENT';
  activist: string;
}

const EVENT_CONFIGS: EventConfig[] = [
  { event: 'Proxy filing deadline', company: 'Southwest Airlines', ticker: 'LUV', daysFromNow: 12, type: 'PROXY_DEADLINE', activist: 'Elliott Management' },
  { event: 'Annual shareholder meeting', company: 'Disney', ticker: 'DIS', daysFromNow: 28, type: 'SHAREHOLDER_MEETING', activist: 'Trian Partners' },
  { event: 'Settlement negotiation deadline', company: 'TreeHouse Foods', ticker: 'THS', daysFromNow: 7, type: 'SETTLEMENT_DEADLINE', activist: 'Jana Partners' },
  { event: '13D/A amendment filing', company: 'Emerson Electric', ticker: 'EMR', daysFromNow: 18, type: '13D_AMENDMENT', activist: 'D.E. Shaw' },
  { event: 'Annual shareholder meeting', company: 'Bath & Body Works', ticker: 'BBWI', daysFromNow: 42, type: 'SHAREHOLDER_MEETING', activist: 'Third Point' },
  { event: 'Proxy filing deadline', company: 'Spotify Technology', ticker: 'SPOT', daysFromNow: 55, type: 'PROXY_DEADLINE', activist: 'ValueAct Capital' },
  { event: 'Settlement review hearing', company: 'Salesforce', ticker: 'CRM', daysFromNow: 5, type: 'SETTLEMENT_DEADLINE', activist: 'Starboard Value' },
  { event: '13D/A amendment filing', company: 'Universal Music Group', ticker: 'UMG', daysFromNow: 22, type: '13D_AMENDMENT', activist: 'Pershing Square' },
];

// ── Data generation ──

function generateActiveCampaigns(rng: () => number): ActiveCampaign[] {
  return CAMPAIGN_CONFIGS.map((cfg) => {
    const stakeJitter = (rng() - 0.5) * cfg.baseStakePct * 0.1;
    const stakePct = Math.round((cfg.baseStakePct + stakeJitter) * 100) / 100;

    const boardJitter = rng() > 0.8 ? 1 : 0;
    const boardSeatsWon = cfg.baseBoardSeats + boardJitter;

    return {
      activist: cfg.activist,
      targetCompany: cfg.targetCompany,
      ticker: cfg.ticker,
      stakePct,
      demands: cfg.demands,
      campaignStartDate: cfg.campaignStartDate,
      status: cfg.baseStatus,
      boardSeatsWon,
    };
  });
}

function generateRecent13DFilings(rng: () => number): Filing13D[] {
  return FILING_CONFIGS.map((cfg) => {
    const sharesJitter = Math.floor((rng() - 0.5) * cfg.baseShares * 0.08);
    const shares = cfg.baseShares + sharesJitter;

    const ownershipJitter = (rng() - 0.5) * cfg.baseOwnershipPct * 0.06;
    const ownershipPct = Math.round((cfg.baseOwnershipPct + ownershipJitter) * 100) / 100;

    return {
      filer: cfg.filer,
      target: cfg.target,
      ticker: cfg.ticker,
      shares,
      ownershipPct,
      purpose: cfg.purpose,
      filingDate: cfg.filingDate,
    };
  });
}

function generateActivistReturns(rng: () => number): ActivistReturn[] {
  return RETURN_CONFIGS.map((cfg) => {
    const targetJitter = (rng() - 0.5) * 6;
    const targetReturn = Math.round((cfg.baseTargetReturn + targetJitter) * 10) / 10;

    const sp500Jitter = (rng() - 0.5) * 3;
    const sp500Return = Math.round((cfg.baseSp500Return + sp500Jitter) * 10) / 10;

    const excessReturn = Math.round((targetReturn - sp500Return) * 10) / 10;

    const daysJitter = Math.floor((rng() - 0.5) * 20);
    const daysToResolution = cfg.baseDaysToResolution > 0 ? cfg.baseDaysToResolution + daysJitter : 0;

    return {
      targetCompany: cfg.targetCompany,
      ticker: cfg.ticker,
      activist: cfg.activist,
      targetReturn,
      sp500Return,
      excessReturn,
      announcementDate: cfg.announcementDate,
      resolutionDate: cfg.resolutionDate,
      daysToResolution,
    };
  });
}

function generateTopActivists(rng: () => number): TopActivist[] {
  return TOP_ACTIVIST_CONFIGS.map((cfg) => {
    const aumJitter = (rng() - 0.5) * cfg.baseAumBillions * 0.08;
    const aumBillions = Math.round((cfg.baseAumBillions + aumJitter) * 10) / 10;

    const campaignJitter = rng() > 0.7 ? 1 : rng() < 0.3 ? -1 : 0;
    const activeCampaigns = Math.max(1, cfg.baseActiveCampaigns + campaignJitter);

    const winJitter = (rng() - 0.5) * 8;
    const winRatePct = Math.round(Math.max(20, Math.min(95, cfg.baseWinRatePct + winJitter)) * 10) / 10;

    const returnJitter = (rng() - 0.5) * 5;
    const avgReturnPct = Math.round((cfg.baseAvgReturnPct + returnJitter) * 10) / 10;

    return {
      name: cfg.name,
      aumBillions,
      activeCampaigns,
      winRatePct,
      avgReturnPct,
      style: cfg.style,
    };
  });
}

function generateCampaignOutcomes(rng: () => number): CampaignOutcome[] {
  const outcomes = OUTCOME_CONFIGS.map((cfg) => {
    const countJitter = Math.floor((rng() - 0.5) * 6);
    const count = Math.max(1, cfg.baseCount + countJitter);

    const timelineJitter = Math.floor((rng() - 0.5) * 30);
    const avgTimelineDays = cfg.baseAvgTimelineDays + timelineJitter;

    return { resolution: cfg.resolution, count, avgTimelineDays, pctOfTotal: 0 };
  });

  const totalCount = outcomes.reduce((sum, o) => sum + o.count, 0);
  for (const o of outcomes) {
    o.pctOfTotal = Math.round((o.count / totalCount) * 1000) / 10;
  }

  return outcomes;
}

function generateSectorTargets(rng: () => number): SectorTarget[] {
  const sectors = SECTOR_CONFIGS.map((cfg) => {
    const countJitter = Math.floor((rng() - 0.5) * 4);
    const campaignCount = Math.max(1, cfg.baseCampaignCount + countJitter);

    const capJitter = (rng() - 0.5) * cfg.baseAvgMarketCapBillions * 0.15;
    const avgMarketCapBillions = Math.round((cfg.baseAvgMarketCapBillions + capJitter) * 10) / 10;

    return { sector: cfg.sector, campaignCount, avgMarketCapBillions, pctOfTotal: 0 };
  });

  const totalCampaigns = sectors.reduce((sum, s) => sum + s.campaignCount, 0);
  for (const s of sectors) {
    s.pctOfTotal = Math.round((s.campaignCount / totalCampaigns) * 1000) / 10;
  }

  return sectors;
}

function generateTacticsUsed(rng: () => number): TacticUsed[] {
  const totalCampaigns = 86; // approximate total campaigns in universe

  return TACTIC_CONFIGS.map((cfg) => {
    const countJitter = Math.floor((rng() - 0.5) * 8);
    const count = Math.max(1, cfg.baseCount + countJitter);

    const successJitter = (rng() - 0.5) * 10;
    const successRatePct = Math.round(Math.max(10, Math.min(95, cfg.baseSuccessRatePct + successJitter)) * 10) / 10;

    const pctOfCampaigns = Math.round((count / totalCampaigns) * 1000) / 10;

    return {
      tactic: cfg.tactic,
      count,
      successRatePct,
      pctOfCampaigns,
    };
  });
}

function generateUpcomingEvents(rng: () => number): UpcomingEvent[] {
  const today = new Date();

  return EVENT_CONFIGS.map((cfg) => {
    const dayJitter = Math.floor((rng() - 0.5) * 4);
    const adjustedDays = Math.max(1, cfg.daysFromNow + dayJitter);

    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() + adjustedDays);
    const date = eventDate.toISOString().slice(0, 10);

    return {
      event: cfg.event,
      company: cfg.company,
      ticker: cfg.ticker,
      date,
      type: cfg.type,
      activist: cfg.activist,
    };
  });
}

function generateShareholderActivismData(): ShareholderActivismResponse {
  const rng = seededRandom('shareholder-activism');

  const activeCampaigns = generateActiveCampaigns(rng);
  const recent13DFilings = generateRecent13DFilings(rng);
  const activistReturns = generateActivistReturns(rng);
  const topActivists = generateTopActivists(rng);
  const campaignOutcomes = generateCampaignOutcomes(rng);
  const sectorTargets = generateSectorTargets(rng);
  const tacticsUsed = generateTacticsUsed(rng);
  const upcomingEvents = generateUpcomingEvents(rng);

  return {
    activeCampaigns,
    recent13DFilings,
    activistReturns,
    topActivists,
    campaignOutcomes,
    sectorTargets,
    tacticsUsed,
    upcomingEvents,
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

    const data = generateShareholderActivismData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ShareholderActivism] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate shareholder activism data' });
  }
});

export default router;
