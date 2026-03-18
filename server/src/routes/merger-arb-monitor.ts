import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

type DealType = 'Cash' | 'Stock' | 'Mixed';
type DealStatus = 'Definitive' | 'Regulatory Review' | 'Shareholder Vote' | 'Expected';
type RiskLevel = 'Low' | 'Medium' | 'High';

interface ActiveDeal {
  acquirer: string;
  targetTicker: string;
  targetName: string;
  dealType: DealType;
  offerPrice: number;
  currentPrice: number;
  spreadDollar: number;
  spreadPct: number;
  annualizedReturn: number;
  expectedCloseDate: string;
  daysToClose: number;
  dealStatus: DealStatus;
}

interface DealRisk {
  targetTicker: string;
  regulatoryRisk: RiskLevel;
  financingRisk: RiskLevel;
  shareholderApprovalRisk: RiskLevel;
  macRisk: RiskLevel;
  overallRiskScore: number;
}

interface RecentCompletion {
  acquirer: string;
  targetTicker: string;
  targetName: string;
  dealType: DealType;
  completionDate: string;
  finalSpreadCapture: number;
  daysHeld: number;
  annualizedReturn: number;
}

type BrokenDealReason = 'Regulatory Block' | 'Financing Failure' | 'MAC' | 'Mutual Termination';

interface BrokenDeal {
  acquirer: string;
  targetTicker: string;
  targetName: string;
  announcementDate: string;
  terminationDate: string;
  reason: BrokenDealReason;
  breakFee: number;
  priceDropPct: number;
}

interface SectorActivity {
  sector: string;
  dealCount: number;
  totalValue: number;
  avgPremium: number;
}

type RegulatoryMilestone = 'HSR Filing' | 'DOJ/FTC Review' | 'EC Review' | 'CFIUS';

interface RegulatoryTimelineEntry {
  targetTicker: string;
  milestone: RegulatoryMilestone;
  filingDate: string;
  expectedDecisionDate: string;
  status: 'Pending' | 'Cleared' | 'Extended' | 'Second Request';
}

interface SpreadHistoryPoint {
  date: string;
  spreadPct: number;
}

interface SpreadHistoryEntry {
  targetTicker: string;
  targetName: string;
  history: SpreadHistoryPoint[];
}

interface ArbitrageStats {
  totalDeals: number;
  aggregateSpread: number;
  avgAnnualizedReturn: number;
  indexReturn: number;
}

interface MergerArbMonitorResponse {
  activeDeals: ActiveDeal[];
  dealRisk: DealRisk[];
  recentCompletions: RecentCompletion[];
  brokenDeals: BrokenDeal[];
  sectorActivity: SectorActivity[];
  regulatoryTimeline: RegulatoryTimelineEntry[];
  spreadHistory: SpreadHistoryEntry[];
  arbitrageStats: ArbitrageStats;
  timestamp: string;
}

// ── Cache ──

let cache: { data: MergerArbMonitorResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Active deal configuration ──

interface DealConfig {
  acquirer: string;
  targetTicker: string;
  targetName: string;
  dealType: DealType;
  baseOfferPrice: number;
  baseCurrentDiscount: number;
  baseDaysToClose: number;
  dealStatus: DealStatus;
  sector: string;
}

const DEAL_CONFIGS: DealConfig[] = [
  { acquirer: 'Broadcom', targetTicker: 'VMWX', targetName: 'VMWare Extended', dealType: 'Cash', baseOfferPrice: 142.50, baseCurrentDiscount: 1.8, baseDaysToClose: 95, dealStatus: 'Regulatory Review', sector: 'Technology' },
  { acquirer: 'Microsoft', targetTicker: 'GDEV', targetName: 'GameDev Studios', dealType: 'Cash', baseOfferPrice: 95.00, baseCurrentDiscount: 2.5, baseDaysToClose: 140, dealStatus: 'Regulatory Review', sector: 'Technology' },
  { acquirer: 'Exxon Mobil', targetTicker: 'PNRX', targetName: 'Pioneer Resources', dealType: 'Stock', baseOfferPrice: 253.00, baseCurrentDiscount: 1.2, baseDaysToClose: 60, dealStatus: 'Shareholder Vote', sector: 'Energy' },
  { acquirer: 'Pfizer', targetTicker: 'SGNX', targetName: 'Seagen Therapeutics', dealType: 'Cash', baseOfferPrice: 229.00, baseCurrentDiscount: 3.1, baseDaysToClose: 110, dealStatus: 'Regulatory Review', sector: 'Healthcare' },
  { acquirer: 'Chevron', targetTicker: 'HSSX', targetName: 'Hess Corp Extended', dealType: 'Stock', baseOfferPrice: 171.00, baseCurrentDiscount: 2.8, baseDaysToClose: 180, dealStatus: 'Definitive', sector: 'Energy' },
  { acquirer: 'Cisco', targetTicker: 'SPLX', targetName: 'Splunk Analytics', dealType: 'Cash', baseOfferPrice: 157.00, baseCurrentDiscount: 0.9, baseDaysToClose: 45, dealStatus: 'Expected', sector: 'Technology' },
  { acquirer: 'Capital One', targetTicker: 'DSCX', targetName: 'Discover Financial Svcs', dealType: 'Stock', baseOfferPrice: 140.25, baseCurrentDiscount: 4.2, baseDaysToClose: 210, dealStatus: 'Regulatory Review', sector: 'Financials' },
  { acquirer: 'Novo Nordisk', targetTicker: 'CTLX', targetName: 'Catalent Pharma', dealType: 'Cash', baseOfferPrice: 63.50, baseCurrentDiscount: 1.5, baseDaysToClose: 75, dealStatus: 'Shareholder Vote', sector: 'Healthcare' },
  { acquirer: 'Johnson & Johnson', targetTicker: 'SHWX', targetName: 'Shockwave Medical', dealType: 'Cash', baseOfferPrice: 335.00, baseCurrentDiscount: 0.6, baseDaysToClose: 30, dealStatus: 'Expected', sector: 'Healthcare' },
  { acquirer: 'Synopsys', targetTicker: 'ANSZ', targetName: 'Ansys Engineering', dealType: 'Mixed', baseOfferPrice: 390.00, baseCurrentDiscount: 3.5, baseDaysToClose: 200, dealStatus: 'Regulatory Review', sector: 'Technology' },
  { acquirer: 'Mars Inc', targetTicker: 'KLNX', targetName: 'Kellanova Foods', dealType: 'Cash', baseOfferPrice: 83.50, baseCurrentDiscount: 1.0, baseDaysToClose: 55, dealStatus: 'Definitive', sector: 'Consumer Staples' },
  { acquirer: 'Diamondback Energy', targetTicker: 'ENDX', targetName: 'Endeavor Resources', dealType: 'Mixed', baseOfferPrice: 188.00, baseCurrentDiscount: 2.0, baseDaysToClose: 120, dealStatus: 'Shareholder Vote', sector: 'Energy' },
];

// ── Recent completion configuration ──

interface CompletionConfig {
  acquirer: string;
  targetTicker: string;
  targetName: string;
  dealType: DealType;
  baseDaysAgo: number;
  baseDaysHeld: number;
  baseSpreadCapture: number;
}

const COMPLETION_CONFIGS: CompletionConfig[] = [
  { acquirer: 'Newmont', targetTicker: 'NEM', targetName: 'Newcrest Mining', dealType: 'Stock', baseDaysAgo: 15, baseDaysHeld: 145, baseSpreadCapture: 2.1 },
  { acquirer: 'Amgen', targetTicker: 'HZNP', targetName: 'Horizon Therapeutics', dealType: 'Cash', baseDaysAgo: 30, baseDaysHeld: 180, baseSpreadCapture: 3.8 },
  { acquirer: 'West Pharma', targetTicker: 'AZTA', targetName: 'Azenta Life Sciences', dealType: 'Cash', baseDaysAgo: 45, baseDaysHeld: 110, baseSpreadCapture: 1.5 },
  { acquirer: 'Black Knight', targetTicker: 'BKFS', targetName: 'Black Knight Financial', dealType: 'Mixed', baseDaysAgo: 60, baseDaysHeld: 240, baseSpreadCapture: 5.2 },
  { acquirer: 'National Instruments', targetTicker: 'NATI', targetName: 'NI Corp', dealType: 'Cash', baseDaysAgo: 75, baseDaysHeld: 160, baseSpreadCapture: 2.8 },
];

// ── Broken deal configuration ──

interface BrokenDealConfig {
  acquirer: string;
  targetTicker: string;
  targetName: string;
  baseDaysAgoAnnounce: number;
  baseDaysAgoTerminate: number;
  reason: BrokenDealReason;
  baseBreakFee: number;
  basePriceDropPct: number;
}

const BROKEN_DEAL_CONFIGS: BrokenDealConfig[] = [
  { acquirer: 'JetBlue', targetTicker: 'SAVE', targetName: 'Spirit Airlines', baseDaysAgoAnnounce: 300, baseDaysAgoTerminate: 45, reason: 'Regulatory Block', baseBreakFee: 69, basePriceDropPct: 42.5 },
  { acquirer: 'Illumina', targetTicker: 'GRAX', targetName: 'Grail Genomics', baseDaysAgoAnnounce: 250, baseDaysAgoTerminate: 90, reason: 'Regulatory Block', baseBreakFee: 0, basePriceDropPct: 18.0 },
  { acquirer: 'TD Bank', targetTicker: 'FHNX', targetName: 'First Horizon Bank', baseDaysAgoAnnounce: 350, baseDaysAgoTerminate: 120, reason: 'Mutual Termination', baseBreakFee: 200, basePriceDropPct: 12.3 },
  { acquirer: 'Ares Management', targetTicker: 'CSLX', targetName: 'CentralSquare Tech', baseDaysAgoAnnounce: 200, baseDaysAgoTerminate: 60, reason: 'Financing Failure', baseBreakFee: 45, basePriceDropPct: 28.7 },
  { acquirer: 'Albertsons', targetTicker: 'KRGX', targetName: 'Kroger-Albertsons JV', baseDaysAgoAnnounce: 280, baseDaysAgoTerminate: 30, reason: 'Regulatory Block', baseBreakFee: 600, basePriceDropPct: 15.0 },
];

// ── Sector activity configuration ──

interface SectorConfig {
  sector: string;
  baseDealCount: number;
  baseTotalValue: number;
  baseAvgPremium: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Technology', baseDealCount: 42, baseTotalValue: 285.0, baseAvgPremium: 32.5 },
  { sector: 'Healthcare', baseDealCount: 38, baseTotalValue: 210.0, baseAvgPremium: 45.0 },
  { sector: 'Energy', baseDealCount: 25, baseTotalValue: 190.0, baseAvgPremium: 18.5 },
  { sector: 'Financials', baseDealCount: 30, baseTotalValue: 165.0, baseAvgPremium: 22.0 },
  { sector: 'Consumer Staples', baseDealCount: 18, baseTotalValue: 95.0, baseAvgPremium: 28.0 },
  { sector: 'Industrials', baseDealCount: 22, baseTotalValue: 120.0, baseAvgPremium: 24.5 },
  { sector: 'Real Estate', baseDealCount: 15, baseTotalValue: 78.0, baseAvgPremium: 15.0 },
  { sector: 'Materials', baseDealCount: 12, baseTotalValue: 55.0, baseAvgPremium: 20.0 },
];

// ── Regulatory milestone configuration ──

interface RegMilestoneConfig {
  targetTicker: string;
  milestone: RegulatoryMilestone;
  baseDaysAgoFiled: number;
  baseDaysToDecision: number;
  statusWeights: { pending: number; cleared: number; extended: number; secondRequest: number };
}

const REG_MILESTONE_CONFIGS: RegMilestoneConfig[] = [
  { targetTicker: 'VMWX', milestone: 'EC Review', baseDaysAgoFiled: 60, baseDaysToDecision: 45, statusWeights: { pending: 0.3, cleared: 0.1, extended: 0.4, secondRequest: 0.2 } },
  { targetTicker: 'VMWX', milestone: 'HSR Filing', baseDaysAgoFiled: 90, baseDaysToDecision: 10, statusWeights: { pending: 0.1, cleared: 0.7, extended: 0.15, secondRequest: 0.05 } },
  { targetTicker: 'GDEV', milestone: 'DOJ/FTC Review', baseDaysAgoFiled: 45, baseDaysToDecision: 80, statusWeights: { pending: 0.4, cleared: 0.05, extended: 0.3, secondRequest: 0.25 } },
  { targetTicker: 'GDEV', milestone: 'EC Review', baseDaysAgoFiled: 30, baseDaysToDecision: 120, statusWeights: { pending: 0.5, cleared: 0.05, extended: 0.25, secondRequest: 0.2 } },
  { targetTicker: 'SGNX', milestone: 'HSR Filing', baseDaysAgoFiled: 70, baseDaysToDecision: 20, statusWeights: { pending: 0.15, cleared: 0.6, extended: 0.2, secondRequest: 0.05 } },
  { targetTicker: 'DSCX', milestone: 'DOJ/FTC Review', baseDaysAgoFiled: 40, baseDaysToDecision: 150, statusWeights: { pending: 0.35, cleared: 0.05, extended: 0.35, secondRequest: 0.25 } },
  { targetTicker: 'ANSZ', milestone: 'EC Review', baseDaysAgoFiled: 25, baseDaysToDecision: 130, statusWeights: { pending: 0.5, cleared: 0.05, extended: 0.25, secondRequest: 0.2 } },
  { targetTicker: 'ANSZ', milestone: 'CFIUS', baseDaysAgoFiled: 20, baseDaysToDecision: 60, statusWeights: { pending: 0.6, cleared: 0.1, extended: 0.2, secondRequest: 0.1 } },
  { targetTicker: 'DSCX', milestone: 'HSR Filing', baseDaysAgoFiled: 55, baseDaysToDecision: 15, statusWeights: { pending: 0.1, cleared: 0.65, extended: 0.2, secondRequest: 0.05 } },
  { targetTicker: 'HSSX', milestone: 'HSR Filing', baseDaysAgoFiled: 80, baseDaysToDecision: 5, statusWeights: { pending: 0.05, cleared: 0.85, extended: 0.08, secondRequest: 0.02 } },
];

// ── Data generation ──

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

function pickRiskLevel(rng: () => number, highWeight: number): RiskLevel {
  const r = rng();
  if (r < highWeight) return 'High';
  if (r < highWeight + 0.45) return 'Medium';
  return 'Low';
}

function generateActiveDeals(rng: () => number): ActiveDeal[] {
  return DEAL_CONFIGS.map((cfg) => {
    const discountJitter = (rng() - 0.5) * cfg.baseCurrentDiscount * 0.4;
    const discountPct = cfg.baseCurrentDiscount + discountJitter;
    const currentPrice = Math.round((cfg.baseOfferPrice * (1 - discountPct / 100)) * 100) / 100;
    const spreadDollar = Math.round((cfg.baseOfferPrice - currentPrice) * 100) / 100;
    const spreadPct = Math.round((spreadDollar / currentPrice) * 10000) / 100;

    const daysJitter = Math.floor((rng() - 0.5) * 20);
    const daysToClose = Math.max(5, cfg.baseDaysToClose + daysJitter);

    const annualizedReturn = Math.round((spreadPct / daysToClose) * 365 * 100) / 100;

    const expectedCloseDate = daysFromNow(daysToClose);

    return {
      acquirer: cfg.acquirer,
      targetTicker: cfg.targetTicker,
      targetName: cfg.targetName,
      dealType: cfg.dealType,
      offerPrice: cfg.baseOfferPrice,
      currentPrice,
      spreadDollar,
      spreadPct,
      annualizedReturn,
      expectedCloseDate,
      daysToClose,
      dealStatus: cfg.dealStatus,
    };
  });
}

function generateDealRisk(rng: () => number, activeDeals: ActiveDeal[]): DealRisk[] {
  return activeDeals.map((deal) => {
    const isRegReview = deal.dealStatus === 'Regulatory Review';
    const isLargeSpread = deal.spreadPct > 2.5;

    const regulatoryRisk = pickRiskLevel(rng, isRegReview ? 0.4 : 0.1);
    const financingRisk = pickRiskLevel(rng, deal.dealType === 'Cash' ? 0.15 : 0.05);
    const shareholderApprovalRisk = pickRiskLevel(rng, deal.dealStatus === 'Shareholder Vote' ? 0.3 : 0.08);
    const macRisk = pickRiskLevel(rng, isLargeSpread ? 0.2 : 0.08);

    // Overall risk score (1-10)
    const riskMap: Record<RiskLevel, number> = { Low: 1, Medium: 2, High: 3 };
    const riskSum = riskMap[regulatoryRisk] + riskMap[financingRisk] + riskMap[shareholderApprovalRisk] + riskMap[macRisk];
    const rawScore = (riskSum / 12) * 10;
    const jitter = (rng() - 0.5) * 1.5;
    const overallRiskScore = Math.round(Math.max(1, Math.min(10, rawScore + jitter)) * 10) / 10;

    return {
      targetTicker: deal.targetTicker,
      regulatoryRisk,
      financingRisk,
      shareholderApprovalRisk,
      macRisk,
      overallRiskScore,
    };
  });
}

function generateRecentCompletions(rng: () => number): RecentCompletion[] {
  return COMPLETION_CONFIGS.map((cfg) => {
    const daysAgoJitter = Math.floor((rng() - 0.5) * 10);
    const actualDaysAgo = cfg.baseDaysAgo + daysAgoJitter;
    const completionDate = daysAgo(actualDaysAgo);

    const daysHeldJitter = Math.floor((rng() - 0.5) * 20);
    const daysHeld = Math.max(30, cfg.baseDaysHeld + daysHeldJitter);

    const captureJitter = (rng() - 0.5) * 1.0;
    const finalSpreadCapture = Math.round((cfg.baseSpreadCapture + captureJitter) * 100) / 100;

    const annualizedReturn = Math.round((finalSpreadCapture / daysHeld) * 365 * 100) / 100;

    return {
      acquirer: cfg.acquirer,
      targetTicker: cfg.targetTicker,
      targetName: cfg.targetName,
      dealType: cfg.dealType,
      completionDate,
      finalSpreadCapture,
      daysHeld,
      annualizedReturn,
    };
  });
}

function generateBrokenDeals(rng: () => number): BrokenDeal[] {
  return BROKEN_DEAL_CONFIGS.map((cfg) => {
    const announceJitter = Math.floor((rng() - 0.5) * 20);
    const terminateJitter = Math.floor((rng() - 0.5) * 15);

    const announcementDate = daysAgo(cfg.baseDaysAgoAnnounce + announceJitter);
    const terminationDate = daysAgo(cfg.baseDaysAgoTerminate + terminateJitter);

    const feeJitter = (rng() - 0.5) * cfg.baseBreakFee * 0.1;
    const breakFee = Math.round((cfg.baseBreakFee + feeJitter) * 10) / 10;

    const dropJitter = (rng() - 0.5) * 5;
    const priceDropPct = Math.round((cfg.basePriceDropPct + dropJitter) * 10) / 10;

    return {
      acquirer: cfg.acquirer,
      targetTicker: cfg.targetTicker,
      targetName: cfg.targetName,
      announcementDate,
      terminationDate,
      reason: cfg.reason,
      breakFee,
      priceDropPct,
    };
  });
}

function generateSectorActivity(rng: () => number): SectorActivity[] {
  return SECTOR_CONFIGS.map((cfg) => {
    const countJitter = Math.floor((rng() - 0.5) * cfg.baseDealCount * 0.2);
    const dealCount = Math.max(1, cfg.baseDealCount + countJitter);

    const valueJitter = (rng() - 0.5) * cfg.baseTotalValue * 0.15;
    const totalValue = Math.round((cfg.baseTotalValue + valueJitter) * 10) / 10;

    const premiumJitter = (rng() - 0.5) * 8;
    const avgPremium = Math.round((cfg.baseAvgPremium + premiumJitter) * 10) / 10;

    return {
      sector: cfg.sector,
      dealCount,
      totalValue,
      avgPremium,
    };
  });
}

function generateRegulatoryTimeline(rng: () => number): RegulatoryTimelineEntry[] {
  return REG_MILESTONE_CONFIGS.map((cfg) => {
    const filedJitter = Math.floor((rng() - 0.5) * 10);
    const filingDate = daysAgo(cfg.baseDaysAgoFiled + filedJitter);

    const decisionJitter = Math.floor((rng() - 0.5) * 15);
    const expectedDecisionDate = daysFromNow(cfg.baseDaysToDecision + decisionJitter);

    // Weighted status pick
    const r = rng();
    let status: 'Pending' | 'Cleared' | 'Extended' | 'Second Request';
    const w = cfg.statusWeights;
    if (r < w.pending) {
      status = 'Pending';
    } else if (r < w.pending + w.cleared) {
      status = 'Cleared';
    } else if (r < w.pending + w.cleared + w.extended) {
      status = 'Extended';
    } else {
      status = 'Second Request';
    }

    return {
      targetTicker: cfg.targetTicker,
      milestone: cfg.milestone,
      filingDate,
      expectedDecisionDate,
      status,
    };
  });
}

function generateSpreadHistory(rng: () => number, activeDeals: ActiveDeal[]): SpreadHistoryEntry[] {
  // Generate spread history for the top 5 deals by spread
  const topDeals = [...activeDeals]
    .sort((a, b) => b.spreadPct - a.spreadPct)
    .slice(0, 5);

  return topDeals.map((deal) => {
    const points = 30; // 30 days of history
    const history: SpreadHistoryPoint[] = [];

    // Start from a wider spread that converges toward current
    const initialSpread = deal.spreadPct * (1.5 + rng() * 0.8);

    for (let i = 0; i < points; i++) {
      const t = i / (points - 1); // 0 to 1
      // Converge from initial to current with some noise
      const baseSpread = initialSpread + (deal.spreadPct - initialSpread) * t;
      const noise = (rng() - 0.5) * deal.spreadPct * 0.3;
      const spreadPct = Math.round(Math.max(0.05, baseSpread + noise) * 100) / 100;
      const date = daysAgo(points - 1 - i);

      history.push({ date, spreadPct });
    }

    return {
      targetTicker: deal.targetTicker,
      targetName: deal.targetName,
      history,
    };
  });
}

function generateArbitrageStats(rng: () => number, activeDeals: ActiveDeal[]): ArbitrageStats {
  const totalDeals = activeDeals.length;

  const aggregateSpread = Math.round(
    activeDeals.reduce((sum, d) => sum + d.spreadPct, 0) * 100
  ) / 100;

  const avgAnnualizedReturn = Math.round(
    (activeDeals.reduce((sum, d) => sum + d.annualizedReturn, 0) / totalDeals) * 100
  ) / 100;

  // Index return: a blend of arb returns with some market noise
  const indexJitter = (rng() - 0.5) * 3;
  const indexReturn = Math.round((avgAnnualizedReturn * 0.85 + indexJitter) * 100) / 100;

  return {
    totalDeals,
    aggregateSpread,
    avgAnnualizedReturn,
    indexReturn,
  };
}

function generateMergerArbData(): MergerArbMonitorResponse {
  const rng = seededRandom('merger-arb-monitor');

  const activeDeals = generateActiveDeals(rng);
  const dealRisk = generateDealRisk(rng, activeDeals);
  const recentCompletions = generateRecentCompletions(rng);
  const brokenDeals = generateBrokenDeals(rng);
  const sectorActivity = generateSectorActivity(rng);
  const regulatoryTimeline = generateRegulatoryTimeline(rng);
  const spreadHistory = generateSpreadHistory(rng, activeDeals);
  const arbitrageStats = generateArbitrageStats(rng, activeDeals);

  return {
    activeDeals,
    dealRisk,
    recentCompletions,
    brokenDeals,
    sectorActivity,
    regulatoryTimeline,
    spreadHistory,
    arbitrageStats,
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

    const data = generateMergerArbData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MergerArbMonitor] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate merger arb monitor data' });
  }
});

export default router;
