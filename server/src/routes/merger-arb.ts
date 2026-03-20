import { Router } from 'express';

const router = Router();

// ── Deterministic seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Types ──

type DealType = 'cash' | 'stock' | 'mixed';
type DealStatus = 'pending regulatory' | 'shareholder vote' | 'approved' | 'extended';
type RiskLevel = 'low' | 'medium' | 'high';
type Regulator = 'FTC' | 'DOJ' | 'EC' | 'CMA' | 'CFIUS';
type CompletionOutcome = 'completed' | 'raised' | 'withdrawn';

interface ActiveMerger {
  target: string;
  targetTicker: string;
  acquirer: string;
  acquirerTicker: string;
  dealValue: number;
  offerPrice: number;
  currentPrice: number;
  spreadPct: number;
  annualizedReturnPct: number;
  dealType: DealType;
  premiumPct: number;
  announcementDate: string;
  expectedClose: string;
  status: DealStatus;
  probabilityPct: number;
}

interface RecentCompletion {
  target: string;
  acquirer: string;
  dealValue: number;
  completionDate: string;
  finalSpreadPct: number;
  daysToClose: number;
  outcome: CompletionOutcome;
}

interface SectorDeal {
  sector: string;
  activeDeals: number;
  totalValue: number;
  avgSpreadPct: number;
  avgProbabilityPct: number;
  avgTimeToCloseDays: number;
}

interface RiskArbitrage {
  universeCount: number;
  totalDealValue: number;
  avgGrossSpreadPct: number;
  avgAnnualizedReturnPct: number;
  dealBreakRate12MPct: number;
  avgDaysToClose: number;
}

interface RegulatoryWatch {
  target: string;
  acquirer: string;
  regulator: Regulator;
  concern: string;
  nextDeadline: string;
  riskLevel: RiskLevel;
}

interface TopSpread {
  target: string;
  acquirer: string;
  spreadPct: number;
  annualizedReturnPct: number;
  probabilityPct: number;
}

interface Summary {
  totalActiveDeals: number;
  totalValue: number;
  avgSpreadPct: number;
  avgAnnualizedPct: number;
  highestSpread: string;
  lowestSpread: string;
  breakCount12M: number;
}

interface MergerArbResponse {
  activeMergers: ActiveMerger[];
  recentCompletions: RecentCompletion[];
  sectorDeals: SectorDeal[];
  riskArbitrage: RiskArbitrage;
  regulatoryWatch: RegulatoryWatch[];
  topSpreads: TopSpread[];
  summary: Summary;
  generatedAt: string;
}

// ── Deal templates ──

interface MergerTemplate {
  target: string;
  targetTicker: string;
  acquirer: string;
  acquirerTicker: string;
  dealValue: number;
  offerBase: number;
  undisturbedBase: number;
  dealType: DealType;
  sector: string;
  status: DealStatus;
  baseDaysToClose: number;
}

const MERGER_TEMPLATES: MergerTemplate[] = [
  { target: 'Juniper Networks', targetTicker: 'JNPR', acquirer: 'Hewlett Packard Enterprise', acquirerTicker: 'HPE', dealValue: 14.0, offerBase: 40.00, undisturbedBase: 29.50, dealType: 'cash', sector: 'Technology', status: 'pending regulatory', baseDaysToClose: 165 },
  { target: 'Hess Corporation', targetTicker: 'HES', acquirer: 'Chevron', acquirerTicker: 'CVX', dealValue: 53.0, offerBase: 171.00, undisturbedBase: 142.00, dealType: 'stock', sector: 'Energy', status: 'pending regulatory', baseDaysToClose: 195 },
  { target: 'Kellanova', targetTicker: 'K', acquirer: 'Mars Inc', acquirerTicker: 'MARS', dealValue: 35.9, offerBase: 83.50, undisturbedBase: 62.00, dealType: 'cash', sector: 'Consumer Staples', status: 'shareholder vote', baseDaysToClose: 120 },
  { target: 'Catalent', targetTicker: 'CTLT', acquirer: 'Novo Holdings', acquirerTicker: 'NOVO.B', dealValue: 16.5, offerBase: 63.50, undisturbedBase: 45.00, dealType: 'cash', sector: 'Healthcare', status: 'approved', baseDaysToClose: 45 },
  { target: 'Ansys', targetTicker: 'ANSS', acquirer: 'Synopsys', acquirerTicker: 'SNPS', dealValue: 35.0, offerBase: 390.00, undisturbedBase: 310.00, dealType: 'mixed', sector: 'Technology', status: 'pending regulatory', baseDaysToClose: 210 },
  { target: 'HashiCorp', targetTicker: 'HCP', acquirer: 'IBM', acquirerTicker: 'IBM', dealValue: 6.4, offerBase: 35.00, undisturbedBase: 26.00, dealType: 'cash', sector: 'Technology', status: 'approved', baseDaysToClose: 55 },
  { target: 'US Steel', targetTicker: 'X', acquirer: 'Nippon Steel', acquirerTicker: '5401.T', dealValue: 14.9, offerBase: 55.00, undisturbedBase: 32.00, dealType: 'cash', sector: 'Materials', status: 'pending regulatory', baseDaysToClose: 240 },
  { target: 'Discover Financial', targetTicker: 'DFS', acquirer: 'Capital One', acquirerTicker: 'COF', dealValue: 35.3, offerBase: 140.25, undisturbedBase: 108.00, dealType: 'stock', sector: 'Financials', status: 'pending regulatory', baseDaysToClose: 200 },
  { target: 'Pioneer Natural Resources', targetTicker: 'PXD', acquirer: 'Exxon Mobil', acquirerTicker: 'XOM', dealValue: 59.5, offerBase: 253.00, undisturbedBase: 218.00, dealType: 'stock', sector: 'Energy', status: 'shareholder vote', baseDaysToClose: 90 },
  { target: 'Albertsons', targetTicker: 'ACI', acquirer: 'Kroger', acquirerTicker: 'KR', dealValue: 24.6, offerBase: 34.10, undisturbedBase: 22.00, dealType: 'mixed', sector: 'Consumer Staples', status: 'extended', baseDaysToClose: 260 },
  { target: 'Endeavor Group', targetTicker: 'EDR', acquirer: 'Silver Lake', acquirerTicker: 'SL', dealValue: 13.0, offerBase: 27.50, undisturbedBase: 21.00, dealType: 'cash', sector: 'Communication Services', status: 'shareholder vote', baseDaysToClose: 100 },
  { target: 'Amedisys', targetTicker: 'AMED', acquirer: 'UnitedHealth Group', acquirerTicker: 'UNH', dealValue: 3.3, offerBase: 101.00, undisturbedBase: 82.00, dealType: 'cash', sector: 'Healthcare', status: 'pending regulatory', baseDaysToClose: 175 },
  { target: 'Worldpay', targetTicker: 'WP', acquirer: 'GTCR', acquirerTicker: 'GTCR', dealValue: 18.5, offerBase: 72.50, undisturbedBase: 55.00, dealType: 'cash', sector: 'Financials', status: 'approved', baseDaysToClose: 60 },
  { target: 'Cerevel Therapeutics', targetTicker: 'CERE', acquirer: 'AbbVie', acquirerTicker: 'ABBV', dealValue: 8.7, offerBase: 45.00, undisturbedBase: 28.00, dealType: 'cash', sector: 'Healthcare', status: 'pending regulatory', baseDaysToClose: 140 },
  { target: 'Nuvei Corporation', targetTicker: 'NVEI', acquirer: 'Advent International', acquirerTicker: 'ADV', dealValue: 6.3, offerBase: 34.00, undisturbedBase: 24.50, dealType: 'cash', sector: 'Technology', status: 'shareholder vote', baseDaysToClose: 110 },
  { target: 'Everi Holdings', targetTicker: 'EVRI', acquirer: 'International Game Technology', acquirerTicker: 'IGT', dealValue: 6.2, offerBase: 14.25, undisturbedBase: 10.00, dealType: 'mixed', sector: 'Consumer Discretionary', status: 'pending regulatory', baseDaysToClose: 185 },
  { target: 'Civitas Resources', targetTicker: 'CIVI', acquirer: 'Permian Resources', acquirerTicker: 'PR', dealValue: 4.5, offerBase: 58.00, undisturbedBase: 47.00, dealType: 'stock', sector: 'Energy', status: 'shareholder vote', baseDaysToClose: 80 },
  { target: 'SRS Distribution', targetTicker: 'SRS', acquirer: 'Home Depot', acquirerTicker: 'HD', dealValue: 18.3, offerBase: 44.50, undisturbedBase: 31.00, dealType: 'cash', sector: 'Industrials', status: 'approved', baseDaysToClose: 50 },
  { target: 'Wyndham Hotels', targetTicker: 'WH', acquirer: 'Choice Hotels', acquirerTicker: 'CHH', dealValue: 9.8, offerBase: 90.00, undisturbedBase: 72.00, dealType: 'mixed', sector: 'Consumer Discretionary', status: 'extended', baseDaysToClose: 230 },
  { target: 'Altus Power', targetTicker: 'AMPS', acquirer: 'TPG', acquirerTicker: 'TPG', dealValue: 2.2, offerBase: 5.00, undisturbedBase: 3.60, dealType: 'cash', sector: 'Utilities', status: 'pending regulatory', baseDaysToClose: 130 },
];

// ── Completion templates ──

interface CompletionTemplate {
  target: string;
  acquirer: string;
  dealValue: number;
  baseDaysAgo: number;
  baseDaysToClose: number;
  baseSpreadPct: number;
  outcome: CompletionOutcome;
}

const COMPLETION_TEMPLATES: CompletionTemplate[] = [
  { target: 'Activision Blizzard', acquirer: 'Microsoft', dealValue: 68.7, baseDaysAgo: 45, baseDaysToClose: 614, baseSpreadPct: 1.2, outcome: 'completed' },
  { target: 'Seagen', acquirer: 'Pfizer', dealValue: 43.0, baseDaysAgo: 30, baseDaysToClose: 420, baseSpreadPct: 2.8, outcome: 'completed' },
  { target: 'Splunk', acquirer: 'Cisco', dealValue: 28.0, baseDaysAgo: 60, baseDaysToClose: 285, baseSpreadPct: 0.9, outcome: 'completed' },
  { target: 'VMware', acquirer: 'Broadcom', dealValue: 69.0, baseDaysAgo: 75, baseDaysToClose: 530, baseSpreadPct: 3.5, outcome: 'completed' },
  { target: 'Spirit Airlines', acquirer: 'JetBlue', dealValue: 3.8, baseDaysAgo: 20, baseDaysToClose: 580, baseSpreadPct: -42.0, outcome: 'withdrawn' },
  { target: 'Newcrest Mining', acquirer: 'Newmont', dealValue: 19.2, baseDaysAgo: 90, baseDaysToClose: 310, baseSpreadPct: 2.1, outcome: 'completed' },
  { target: 'Horizon Therapeutics', acquirer: 'Amgen', dealValue: 27.8, baseDaysAgo: 55, baseDaysToClose: 345, baseSpreadPct: 1.5, outcome: 'completed' },
  { target: 'Black Knight', acquirer: 'ICE', dealValue: 13.1, baseDaysAgo: 110, baseDaysToClose: 460, baseSpreadPct: 4.2, outcome: 'raised' },
];

// ── Sector templates ──

interface SectorTemplate {
  sector: string;
  baseActiveDeals: number;
  baseTotalValue: number;
  baseAvgSpreadPct: number;
  baseAvgProbPct: number;
  baseAvgDaysToClose: number;
}

const SECTOR_TEMPLATES: SectorTemplate[] = [
  { sector: 'Technology', baseActiveDeals: 38, baseTotalValue: 245.0, baseAvgSpreadPct: 4.2, baseAvgProbPct: 82, baseAvgDaysToClose: 165 },
  { sector: 'Healthcare', baseActiveDeals: 32, baseTotalValue: 198.0, baseAvgSpreadPct: 5.1, baseAvgProbPct: 78, baseAvgDaysToClose: 180 },
  { sector: 'Energy', baseActiveDeals: 22, baseTotalValue: 175.0, baseAvgSpreadPct: 3.8, baseAvgProbPct: 85, baseAvgDaysToClose: 140 },
  { sector: 'Financials', baseActiveDeals: 28, baseTotalValue: 152.0, baseAvgSpreadPct: 5.5, baseAvgProbPct: 76, baseAvgDaysToClose: 195 },
  { sector: 'Consumer Staples', baseActiveDeals: 15, baseTotalValue: 88.0, baseAvgSpreadPct: 3.2, baseAvgProbPct: 88, baseAvgDaysToClose: 125 },
  { sector: 'Industrials', baseActiveDeals: 20, baseTotalValue: 110.0, baseAvgSpreadPct: 4.0, baseAvgProbPct: 84, baseAvgDaysToClose: 150 },
  { sector: 'Materials', baseActiveDeals: 12, baseTotalValue: 62.0, baseAvgSpreadPct: 4.8, baseAvgProbPct: 80, baseAvgDaysToClose: 170 },
  { sector: 'Communication Services', baseActiveDeals: 10, baseTotalValue: 48.0, baseAvgSpreadPct: 3.5, baseAvgProbPct: 86, baseAvgDaysToClose: 135 },
];

// ── Regulatory watch templates ──

interface RegWatchTemplate {
  target: string;
  acquirer: string;
  regulator: Regulator;
  concern: string;
  baseDaysToDeadline: number;
  riskLevel: RiskLevel;
}

const REG_WATCH_TEMPLATES: RegWatchTemplate[] = [
  { target: 'Albertsons', acquirer: 'Kroger', regulator: 'FTC', concern: 'Grocery market concentration exceeds safe harbor in 200+ local markets', baseDaysToDeadline: 45, riskLevel: 'high' },
  { target: 'US Steel', acquirer: 'Nippon Steel', regulator: 'CFIUS', concern: 'National security review of foreign acquisition of critical steel production', baseDaysToDeadline: 60, riskLevel: 'high' },
  { target: 'Discover Financial', acquirer: 'Capital One', regulator: 'DOJ', concern: 'Credit card network consolidation reducing competition in payments', baseDaysToDeadline: 90, riskLevel: 'medium' },
  { target: 'Ansys', acquirer: 'Synopsys', regulator: 'EC', concern: 'Dominant position in EDA software and simulation tools', baseDaysToDeadline: 120, riskLevel: 'medium' },
  { target: 'Juniper Networks', acquirer: 'Hewlett Packard Enterprise', regulator: 'CMA', concern: 'Overlap in enterprise networking equipment market share', baseDaysToDeadline: 75, riskLevel: 'low' },
];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: MergerArbResponse; ts: number } | null = null;

// ── Helpers ──

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

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Data generation ──

function generate(): MergerArbResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('merger-arb-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const today = new Date();

  // 1. activeMergers (20 deals)
  const activeMergers: ActiveMerger[] = MERGER_TEMPLATES.map(tmpl => {
    const offerPrice = r2(jitter(tmpl.offerBase, 0.02));
    // Spread between 1% and 12% depending on status and risk
    const baseSpreadPct = tmpl.status === 'approved' ? 0.5 + rng() * 2.0
      : tmpl.status === 'extended' ? 5.0 + rng() * 7.0
      : 2.0 + rng() * 6.0;
    const currentPrice = r2(offerPrice / (1 + baseSpreadPct / 100));
    const spreadPct = r2((offerPrice / currentPrice - 1) * 100);

    const daysJitter = Math.floor((rng() - 0.5) * 30);
    const daysToClose = Math.max(15, tmpl.baseDaysToClose + daysJitter);
    const annualizedReturnPct = r2(spreadPct * (365 / daysToClose));

    const premiumPct = r2(((offerPrice / jitter(tmpl.undisturbedBase, 0.03)) - 1) * 100);

    const announceDaysAgo = Math.floor(daysToClose * 0.4 + rng() * daysToClose * 0.6);
    const announcementDate = daysAgo(announceDaysAgo);
    const expectedClose = daysFromNow(daysToClose);

    // Higher probability for approved deals, lower for extended
    const baseProbability = tmpl.status === 'approved' ? 92 + rng() * 7
      : tmpl.status === 'extended' ? 55 + rng() * 25
      : tmpl.status === 'shareholder vote' ? 78 + rng() * 15
      : 70 + rng() * 20;
    const probabilityPct = r1(baseProbability);

    const dealValue = r1(jitter(tmpl.dealValue, 0.03));

    return {
      target: tmpl.target,
      targetTicker: tmpl.targetTicker,
      acquirer: tmpl.acquirer,
      acquirerTicker: tmpl.acquirerTicker,
      dealValue,
      offerPrice,
      currentPrice,
      spreadPct,
      annualizedReturnPct,
      dealType: tmpl.dealType,
      premiumPct,
      announcementDate,
      expectedClose,
      status: tmpl.status,
      probabilityPct,
    };
  });

  // 2. recentCompletions (8)
  const recentCompletions: RecentCompletion[] = COMPLETION_TEMPLATES.map(tmpl => {
    const daysAgoJitter = Math.floor((rng() - 0.5) * 15);
    const completionDate = daysAgo(tmpl.baseDaysAgo + daysAgoJitter);
    const daysToClose = Math.max(60, tmpl.baseDaysToClose + Math.floor((rng() - 0.5) * 40));
    const finalSpreadPct = r2(tmpl.baseSpreadPct + (rng() - 0.5) * 1.5);
    const dealValue = r1(jitter(tmpl.dealValue, 0.02));

    return {
      target: tmpl.target,
      acquirer: tmpl.acquirer,
      dealValue,
      completionDate,
      finalSpreadPct,
      daysToClose,
      outcome: tmpl.outcome,
    };
  });

  // 3. sectorDeals (8 sectors)
  const sectorDeals: SectorDeal[] = SECTOR_TEMPLATES.map(tmpl => {
    const activeDeals = Math.max(1, Math.round(jitter(tmpl.baseActiveDeals, 0.1)));
    const totalValue = r1(jitter(tmpl.baseTotalValue, 0.08));
    const avgSpreadPct = r2(jitter(tmpl.baseAvgSpreadPct, 0.12));
    const avgProbabilityPct = r1(jitter(tmpl.baseAvgProbPct, 0.04));
    const avgTimeToCloseDays = Math.round(jitter(tmpl.baseAvgDaysToClose, 0.1));

    return {
      sector: tmpl.sector,
      activeDeals,
      totalValue,
      avgSpreadPct,
      avgProbabilityPct,
      avgTimeToCloseDays,
    };
  });

  // 4. riskArbitrage (aggregate statistics)
  const totalDealValueB = activeMergers.reduce((sum, d) => sum + d.dealValue, 0);
  const avgGrossSpreadPct = r2(activeMergers.reduce((sum, d) => sum + d.spreadPct, 0) / activeMergers.length);
  const avgAnnualizedReturnPct = r2(activeMergers.reduce((sum, d) => sum + d.annualizedReturnPct, 0) / activeMergers.length);
  const dealBreakRate12MPct = r1(5 + rng() * 5); // 5-10%
  const avgDaysToClose = Math.round(activeMergers.reduce((sum, d) => {
    const closeDate = new Date(d.expectedClose);
    const diff = Math.max(15, Math.round((closeDate.getTime() - today.getTime()) / 86400000));
    return sum + diff;
  }, 0) / activeMergers.length);

  const riskArbitrage: RiskArbitrage = {
    universeCount: 150 + Math.floor(rng() * 50),
    totalDealValue: r1(totalDealValueB / 1000 + rng() * 0.8), // trillions
    avgGrossSpreadPct,
    avgAnnualizedReturnPct,
    dealBreakRate12MPct,
    avgDaysToClose,
  };

  // 5. regulatoryWatch (5 deals)
  const regulatoryWatch: RegulatoryWatch[] = REG_WATCH_TEMPLATES.map(tmpl => {
    const deadlineJitter = Math.floor((rng() - 0.5) * 20);
    const nextDeadline = daysFromNow(tmpl.baseDaysToDeadline + deadlineJitter);

    return {
      target: tmpl.target,
      acquirer: tmpl.acquirer,
      regulator: tmpl.regulator,
      concern: tmpl.concern,
      nextDeadline,
      riskLevel: tmpl.riskLevel,
    };
  });

  // 6. topSpreads (5 widest-spread deals)
  const sortedBySpreads = [...activeMergers].sort((a, b) => b.spreadPct - a.spreadPct);
  const topSpreads: TopSpread[] = sortedBySpreads.slice(0, 5).map(d => ({
    target: d.target,
    acquirer: d.acquirer,
    spreadPct: d.spreadPct,
    annualizedReturnPct: d.annualizedReturnPct,
    probabilityPct: d.probabilityPct,
  }));

  // 7. summary
  const spreads = activeMergers.map(d => d.spreadPct);
  const highIdx = spreads.indexOf(Math.max(...spreads));
  const lowIdx = spreads.indexOf(Math.min(...spreads));
  const breakCount12M = Math.floor(3 + rng() * 6); // 3-8 breaks in 12 months

  const summary: Summary = {
    totalActiveDeals: activeMergers.length,
    totalValue: r1(totalDealValueB),
    avgSpreadPct: avgGrossSpreadPct,
    avgAnnualizedPct: avgAnnualizedReturnPct,
    highestSpread: activeMergers[highIdx].target,
    lowestSpread: activeMergers[lowIdx].target,
    breakCount12M,
  };

  return {
    activeMergers,
    recentCompletions,
    sectorDeals,
    riskArbitrage,
    regulatoryWatch,
    topSpreads,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MergerArb] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate merger arbitrage tracker data' });
  }
});

export default router;
