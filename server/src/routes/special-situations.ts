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
type MergerStatus = 'definitive agreement' | 'regulatory review' | 'shareholder vote pending' | 'conditionally approved' | 'extended/amended';
type MergerRisk = 'regulatory' | 'financing' | 'shareholder vote' | 'litigation' | 'MAC clause';
type ActivistStatus = 'new position' | 'board engagement' | 'proxy fight' | 'settled' | 'escalating';

interface MergerArbSituation {
  id: string;
  category: 'M&A / Merger Arb';
  target: string;
  targetTicker: string;
  acquirer: string;
  acquirerTicker: string;
  dealValueBn: number;
  dealType: DealType;
  offerPrice: number;
  currentPrice: number;
  spreadPct: number;
  annualizedReturnPct: number;
  status: MergerStatus;
  announcementDate: string;
  expectedCloseDate: string;
  daysToClose: number;
  premiumPct: number;
  probabilityPct: number;
  primaryRisk: MergerRisk;
  sector: string;
}

interface ActivistSituation {
  id: string;
  category: 'Activist Campaign';
  targetCompany: string;
  ticker: string;
  activistFund: string;
  stakePct: number;
  demands: string[];
  boardSeatsWon: number;
  boardSeatsRequested: number;
  status: ActivistStatus;
  campaignStartDate: string;
  sector: string;
}

interface SpinoffSituation {
  id: string;
  category: 'Spin-off';
  parent: string;
  parentTicker: string;
  spinoffEntity: string;
  recordDate: string;
  expectedTradingDate: string;
  impliedValueBn: number;
  rationale: string;
  sector: string;
}

interface RightsOfferingSituation {
  id: string;
  category: 'Rights Offering';
  company: string;
  ticker: string;
  subscriptionPrice: number;
  currentPrice: number;
  ratio: string;
  expiryDate: string;
  theoreticalValue: number;
  proceedsUseBn: number;
  sector: string;
}

interface TenderOfferSituation {
  id: string;
  category: 'Tender Offer';
  target: string;
  targetTicker: string;
  bidder: string;
  offerPrice: number;
  currentPrice: number;
  premiumPct: number;
  acceptanceRatePct: number;
  expirationDate: string;
  conditions: string[];
  sector: string;
}

type Situation =
  | MergerArbSituation
  | ActivistSituation
  | SpinoffSituation
  | RightsOfferingSituation
  | TenderOfferSituation;

interface PipelineItem {
  event: string;
  target: string;
  counterparty: string;
  category: string;
  date: string;
  status: string;
}

interface SpreadAnalytics {
  tightestSpread: { target: string; acquirer: string; spreadPct: number };
  widestSpread: { target: string; acquirer: string; spreadPct: number };
  medianSpreadPct: number;
  meanSpreadPct: number;
  spreadPercentileVsHistory: number;
  totalMergerArbDeals: number;
}

interface SectorBreakdown {
  sector: string;
  count: number;
  pctOfTotal: number;
  avgSpreadPct: number | null;
}

interface RiskRewardItem {
  target: string;
  category: string;
  probabilityPct: number;
  upsidePct: number;
  downsidePct: number;
  expectedReturnPct: number;
}

interface SpecialSituationsResponse {
  situations: Situation[];
  pipeline: {
    announcedThisWeek: PipelineItem[];
    pendingRegulatory: PipelineItem[];
    expectedToCloseThisMonth: PipelineItem[];
  };
  spreadAnalytics: SpreadAnalytics;
  sectorBreakdown: SectorBreakdown[];
  riskRewardMatrix: RiskRewardItem[];
  generatedAt: string;
}

// ── Templates ──

interface MergerTemplate {
  target: string;
  targetTicker: string;
  acquirer: string;
  acquirerTicker: string;
  dealValueBn: number;
  dealType: DealType;
  offerBase: number;
  undisturbedBase: number;
  status: MergerStatus;
  baseDaysToClose: number;
  primaryRisk: MergerRisk;
  sector: string;
}

const MERGER_TEMPLATES: MergerTemplate[] = [
  { target: 'Covestro AG', targetTicker: '1COV.DE', acquirer: 'Abu Dhabi National Oil Co', acquirerTicker: 'ADNOC', dealValueBn: 16.4, dealType: 'cash', offerBase: 62.00, undisturbedBase: 44.50, status: 'regulatory review', baseDaysToClose: 140, primaryRisk: 'regulatory', sector: 'Materials' },
  { target: 'Juniper Networks', targetTicker: 'JNPR', acquirer: 'Hewlett Packard Enterprise', acquirerTicker: 'HPE', dealValueBn: 14.0, dealType: 'cash', offerBase: 40.00, undisturbedBase: 29.50, status: 'regulatory review', baseDaysToClose: 95, primaryRisk: 'regulatory', sector: 'Technology' },
  { target: 'Discover Financial', targetTicker: 'DFS', acquirer: 'Capital One Financial', acquirerTicker: 'COF', dealValueBn: 35.3, dealType: 'stock', offerBase: 140.25, undisturbedBase: 108.00, status: 'regulatory review', baseDaysToClose: 110, primaryRisk: 'regulatory', sector: 'Financials' },
  { target: 'Kellanova', targetTicker: 'K', acquirer: 'Mars Inc', acquirerTicker: 'MARS', dealValueBn: 35.9, dealType: 'cash', offerBase: 83.50, undisturbedBase: 62.00, status: 'shareholder vote pending', baseDaysToClose: 65, primaryRisk: 'shareholder vote', sector: 'Consumer Staples' },
  { target: 'Hess Corporation', targetTicker: 'HES', acquirer: 'Chevron Corp', acquirerTicker: 'CVX', dealValueBn: 53.0, dealType: 'stock', offerBase: 171.00, undisturbedBase: 142.00, status: 'extended/amended', baseDaysToClose: 180, primaryRisk: 'litigation', sector: 'Energy' },
  { target: 'US Steel', targetTicker: 'X', acquirer: 'Nippon Steel', acquirerTicker: '5401.T', dealValueBn: 14.9, dealType: 'cash', offerBase: 55.00, undisturbedBase: 32.00, status: 'regulatory review', baseDaysToClose: 200, primaryRisk: 'regulatory', sector: 'Materials' },
  { target: 'Ansys', targetTicker: 'ANSS', acquirer: 'Synopsys', acquirerTicker: 'SNPS', dealValueBn: 35.0, dealType: 'mixed', offerBase: 390.00, undisturbedBase: 310.00, status: 'regulatory review', baseDaysToClose: 130, primaryRisk: 'regulatory', sector: 'Technology' },
  { target: 'Catalent', targetTicker: 'CTLT', acquirer: 'Novo Holdings', acquirerTicker: 'NOVO.B', dealValueBn: 16.5, dealType: 'cash', offerBase: 63.50, undisturbedBase: 45.00, status: 'conditionally approved', baseDaysToClose: 35, primaryRisk: 'financing', sector: 'Healthcare' },
];

interface ActivistTemplate {
  targetCompany: string;
  ticker: string;
  activistFund: string;
  baseStakePct: number;
  demands: string[];
  baseBoardSeatsWon: number;
  boardSeatsRequested: number;
  status: ActivistStatus;
  campaignStartDate: string;
  sector: string;
}

const ACTIVIST_TEMPLATES: ActivistTemplate[] = [
  { targetCompany: 'Southwest Airlines', ticker: 'LUV', activistFund: 'Elliott Management', baseStakePct: 11.0, demands: ['Board overhaul', 'CEO replacement', 'Capital allocation review'], baseBoardSeatsWon: 0, boardSeatsRequested: 6, status: 'escalating', campaignStartDate: '2025-06-10', sector: 'Industrials' },
  { targetCompany: 'Starbucks Corp', ticker: 'SBUX', activistFund: 'Elliott Management', baseStakePct: 2.5, demands: ['Operational efficiency', 'Leadership refresh'], baseBoardSeatsWon: 0, boardSeatsRequested: 2, status: 'settled', campaignStartDate: '2025-08-15', sector: 'Consumer Discretionary' },
  { targetCompany: 'Bath & Body Works', ticker: 'BBWI', activistFund: 'Third Point', baseStakePct: 6.2, demands: ['Margin improvement', 'E-commerce acceleration'], baseBoardSeatsWon: 0, boardSeatsRequested: 3, status: 'new position', campaignStartDate: '2025-09-15', sector: 'Consumer Discretionary' },
  { targetCompany: 'Bayer AG', ticker: 'BAYN.DE', activistFund: 'Icahn Enterprises', baseStakePct: 1.8, demands: ['Pharma/Crop Science separation', 'Litigation reserve review'], baseBoardSeatsWon: 0, boardSeatsRequested: 2, status: 'board engagement', campaignStartDate: '2025-11-20', sector: 'Healthcare' },
  { targetCompany: 'Norfolk Southern', ticker: 'NSC', activistFund: 'Trian Partners', baseStakePct: 3.4, demands: ['Operating ratio improvement', 'Board representation'], baseBoardSeatsWon: 1, boardSeatsRequested: 3, status: 'settled', campaignStartDate: '2025-05-22', sector: 'Industrials' },
  { targetCompany: 'Salesforce', ticker: 'CRM', activistFund: 'ValueAct Capital', baseStakePct: 1.9, demands: ['Cost discipline', 'AI monetization strategy', 'Buyback increase'], baseBoardSeatsWon: 1, boardSeatsRequested: 2, status: 'settled', campaignStartDate: '2025-10-01', sector: 'Technology' },
];

interface SpinoffTemplate {
  parent: string;
  parentTicker: string;
  spinoffEntity: string;
  baseDaysToRecord: number;
  baseDaysToTrading: number;
  impliedValueBn: number;
  rationale: string;
  sector: string;
}

const SPINOFF_TEMPLATES: SpinoffTemplate[] = [
  { parent: 'Honeywell International', parentTicker: 'HON', spinoffEntity: 'Honeywell Advanced Materials', baseDaysToRecord: 45, baseDaysToTrading: 60, impliedValueBn: 12.5, rationale: 'Simplify portfolio; unlock conglomerate discount', sector: 'Industrials' },
  { parent: 'General Electric', parentTicker: 'GE', spinoffEntity: 'GE Vernova (power/energy)', baseDaysToRecord: 20, baseDaysToTrading: 35, impliedValueBn: 28.0, rationale: 'Complete industrial breakup into focused pure-plays', sector: 'Industrials' },
  { parent: 'Johnson & Johnson', parentTicker: 'JNJ', spinoffEntity: 'Kenvue (consumer health)', baseDaysToRecord: 10, baseDaysToTrading: 18, impliedValueBn: 40.0, rationale: 'Separate high-growth pharma from stable consumer brands', sector: 'Healthcare' },
];

interface RightsTemplate {
  company: string;
  ticker: string;
  subscriptionBase: number;
  currentBase: number;
  ratio: string;
  baseDaysToExpiry: number;
  proceedsUseBn: number;
  sector: string;
}

const RIGHTS_TEMPLATES: RightsTemplate[] = [
  { company: 'Banca Monte dei Paschi', ticker: 'BMPS.MI', subscriptionBase: 2.05, currentBase: 3.80, ratio: '7 for 10', baseDaysToExpiry: 22, proceedsUseBn: 2.5, sector: 'Financials' },
  { company: 'Vodafone Group', ticker: 'VOD.L', subscriptionBase: 65.50, currentBase: 72.40, ratio: '1 for 4', baseDaysToExpiry: 35, proceedsUseBn: 3.2, sector: 'Communication Services' },
];

interface TenderTemplate {
  target: string;
  targetTicker: string;
  bidder: string;
  offerBase: number;
  undisturbedBase: number;
  baseDaysToExpiration: number;
  conditions: string[];
  sector: string;
}

const TENDER_TEMPLATES: TenderTemplate[] = [
  { target: 'Tower Semiconductor', targetTicker: 'TSEM', bidder: 'Intel Corp', offerBase: 53.00, undisturbedBase: 36.00, baseDaysToExpiration: 28, conditions: ['Minimum 50% tender', 'HSR clearance', 'No MAC'], sector: 'Technology' },
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: SpecialSituationsResponse; ts: number } | null = null;

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

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Data generation ──

function generate(): SpecialSituationsResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('special-situations-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 1. M&A / Merger Arb situations (8) ──

  const mergerSituations: MergerArbSituation[] = MERGER_TEMPLATES.map((tmpl, idx) => {
    const offerPrice = r2(jitter(tmpl.offerBase, 0.02));
    const baseSpreadPct = tmpl.status === 'conditionally approved' ? 0.5 + rng() * 2.0
      : tmpl.status === 'extended/amended' ? 5.0 + rng() * 7.0
      : 2.0 + rng() * 6.0;
    const currentPrice = r2(offerPrice / (1 + baseSpreadPct / 100));
    const spreadPct = r2((offerPrice / currentPrice - 1) * 100);

    const daysJitter = Math.floor((rng() - 0.5) * 30);
    const daysToClose = Math.max(15, tmpl.baseDaysToClose + daysJitter);
    const annualizedReturnPct = r2(spreadPct * (365 / daysToClose));

    const premiumPct = r2(((offerPrice / jitter(tmpl.undisturbedBase, 0.03)) - 1) * 100);

    const baseProbability = tmpl.status === 'conditionally approved' ? 92 + rng() * 7
      : tmpl.status === 'extended/amended' ? 50 + rng() * 25
      : tmpl.status === 'shareholder vote pending' ? 78 + rng() * 15
      : 68 + rng() * 22;
    const probabilityPct = r1(baseProbability);

    const announceDaysAgo = Math.floor(daysToClose * 0.4 + rng() * daysToClose * 0.5);

    return {
      id: `MA-${String(idx + 1).padStart(3, '0')}`,
      category: 'M&A / Merger Arb' as const,
      target: tmpl.target,
      targetTicker: tmpl.targetTicker,
      acquirer: tmpl.acquirer,
      acquirerTicker: tmpl.acquirerTicker,
      dealValueBn: r1(jitter(tmpl.dealValueBn, 0.03)),
      dealType: tmpl.dealType,
      offerPrice,
      currentPrice,
      spreadPct,
      annualizedReturnPct,
      status: tmpl.status,
      announcementDate: daysAgo(announceDaysAgo),
      expectedCloseDate: daysFromNow(daysToClose),
      daysToClose,
      premiumPct,
      probabilityPct,
      primaryRisk: tmpl.primaryRisk,
      sector: tmpl.sector,
    };
  });

  // ── 2. Activist Campaigns (6) ──

  const activistSituations: ActivistSituation[] = ACTIVIST_TEMPLATES.map((tmpl, idx) => {
    const stakeJitter = (rng() - 0.5) * tmpl.baseStakePct * 0.1;
    const stakePct = r2(tmpl.baseStakePct + stakeJitter);
    const boardJitter = rng() > 0.85 ? 1 : 0;
    const boardSeatsWon = tmpl.baseBoardSeatsWon + boardJitter;

    return {
      id: `ACT-${String(idx + 1).padStart(3, '0')}`,
      category: 'Activist Campaign' as const,
      targetCompany: tmpl.targetCompany,
      ticker: tmpl.ticker,
      activistFund: tmpl.activistFund,
      stakePct,
      demands: tmpl.demands,
      boardSeatsWon,
      boardSeatsRequested: tmpl.boardSeatsRequested,
      status: tmpl.status,
      campaignStartDate: tmpl.campaignStartDate,
      sector: tmpl.sector,
    };
  });

  // ── 3. Spin-offs (3) ──

  const spinoffSituations: SpinoffSituation[] = SPINOFF_TEMPLATES.map((tmpl, idx) => {
    const recordDaysJitter = Math.floor((rng() - 0.5) * 10);
    const tradingDaysJitter = Math.floor((rng() - 0.5) * 14);

    return {
      id: `SPIN-${String(idx + 1).padStart(3, '0')}`,
      category: 'Spin-off' as const,
      parent: tmpl.parent,
      parentTicker: tmpl.parentTicker,
      spinoffEntity: tmpl.spinoffEntity,
      recordDate: daysFromNow(tmpl.baseDaysToRecord + recordDaysJitter),
      expectedTradingDate: daysFromNow(tmpl.baseDaysToTrading + tradingDaysJitter),
      impliedValueBn: r1(jitter(tmpl.impliedValueBn, 0.06)),
      rationale: tmpl.rationale,
      sector: tmpl.sector,
    };
  });

  // ── 4. Rights Offerings (2) ──

  const rightsOfferings: RightsOfferingSituation[] = RIGHTS_TEMPLATES.map((tmpl, idx) => {
    const subscriptionPrice = r2(jitter(tmpl.subscriptionBase, 0.02));
    const currentPrice = r2(jitter(tmpl.currentBase, 0.03));
    const expiryJitter = Math.floor((rng() - 0.5) * 6);
    const theoreticalValue = r2(currentPrice - subscriptionPrice);

    return {
      id: `RTS-${String(idx + 1).padStart(3, '0')}`,
      category: 'Rights Offering' as const,
      company: tmpl.company,
      ticker: tmpl.ticker,
      subscriptionPrice,
      currentPrice,
      ratio: tmpl.ratio,
      expiryDate: daysFromNow(tmpl.baseDaysToExpiry + expiryJitter),
      theoreticalValue: Math.max(0, theoreticalValue),
      proceedsUseBn: r1(jitter(tmpl.proceedsUseBn, 0.04)),
      sector: tmpl.sector,
    };
  });

  // ── 5. Tender Offers (1) ──

  const tenderOffers: TenderOfferSituation[] = TENDER_TEMPLATES.map((tmpl, idx) => {
    const offerPrice = r2(jitter(tmpl.offerBase, 0.02));
    const undisturbed = jitter(tmpl.undisturbedBase, 0.03);
    const tenderSpread = 0.3 + rng() * 1.5;
    const currentPrice = r2(offerPrice / (1 + tenderSpread / 100));
    const premiumPct = r2(((offerPrice / undisturbed) - 1) * 100);
    const acceptanceRatePct = r1(55 + rng() * 40);
    const expirationJitter = Math.floor((rng() - 0.5) * 8);

    return {
      id: `TNR-${String(idx + 1).padStart(3, '0')}`,
      category: 'Tender Offer' as const,
      target: tmpl.target,
      targetTicker: tmpl.targetTicker,
      bidder: tmpl.bidder,
      offerPrice,
      currentPrice,
      premiumPct,
      acceptanceRatePct,
      expirationDate: daysFromNow(tmpl.baseDaysToExpiration + expirationJitter),
      conditions: tmpl.conditions,
      sector: tmpl.sector,
    };
  });

  const situations: Situation[] = [
    ...mergerSituations,
    ...activistSituations,
    ...spinoffSituations,
    ...rightsOfferings,
    ...tenderOffers,
  ];

  // ── Pipeline ──

  const announcedThisWeekNames = [
    { target: 'Lattice Semiconductor', counterparty: 'Canyon Bridge Capital', category: 'M&A / Merger Arb' },
    { target: 'Smith Micro Software', counterparty: 'Qualcomm Ventures', category: 'Tender Offer' },
    { target: 'Kforce Inc', counterparty: 'Apex Group', category: 'M&A / Merger Arb' },
  ];
  const announcedThisWeek: PipelineItem[] = announcedThisWeekNames.map(item => ({
    event: 'Announced',
    target: item.target,
    counterparty: item.counterparty,
    category: item.category,
    date: daysAgo(Math.floor(rng() * 6)),
    status: 'New',
  }));

  const pendingRegulatory: PipelineItem[] = mergerSituations
    .filter(s => s.status === 'regulatory review')
    .map(s => ({
      event: 'Regulatory review',
      target: s.target,
      counterparty: s.acquirer,
      category: 'M&A / Merger Arb',
      date: s.expectedCloseDate,
      status: pick(rng, ['Phase I review', 'Phase II review', 'Second request pending', 'CFIUS review']),
    }));

  const closeThisMonthCandidates = mergerSituations.filter(s => s.daysToClose <= 35);
  const expectedToCloseThisMonth: PipelineItem[] = closeThisMonthCandidates.map(s => ({
    event: 'Expected close',
    target: s.target,
    counterparty: s.acquirer,
    category: 'M&A / Merger Arb',
    date: s.expectedCloseDate,
    status: s.status,
  }));

  // ── Spread Analytics ──

  const mergerSpreads = mergerSituations.map(s => ({ target: s.target, acquirer: s.acquirer, spreadPct: s.spreadPct }));
  const sortedSpreads = [...mergerSpreads].sort((a, b) => a.spreadPct - b.spreadPct);
  const tightest = sortedSpreads[0];
  const widest = sortedSpreads[sortedSpreads.length - 1];
  const spreadValues = sortedSpreads.map(s => s.spreadPct);
  const medianSpreadPct = r2(spreadValues.length % 2 === 0
    ? (spreadValues[spreadValues.length / 2 - 1] + spreadValues[spreadValues.length / 2]) / 2
    : spreadValues[Math.floor(spreadValues.length / 2)]);
  const meanSpreadPct = r2(spreadValues.reduce((sum, v) => sum + v, 0) / spreadValues.length);
  const spreadPercentileVsHistory = Math.round(35 + rng() * 50);

  const spreadAnalytics: SpreadAnalytics = {
    tightestSpread: { target: tightest.target, acquirer: tightest.acquirer, spreadPct: tightest.spreadPct },
    widestSpread: { target: widest.target, acquirer: widest.acquirer, spreadPct: widest.spreadPct },
    medianSpreadPct,
    meanSpreadPct,
    spreadPercentileVsHistory,
    totalMergerArbDeals: mergerSituations.length,
  };

  // ── Sector Breakdown ──

  const sectorMap = new Map<string, { count: number; spreads: number[] }>();
  for (const s of situations) {
    const sec = s.sector;
    const entry = sectorMap.get(sec) || { count: 0, spreads: [] };
    entry.count++;
    if (s.category === 'M&A / Merger Arb') {
      entry.spreads.push(s.spreadPct);
    }
    sectorMap.set(sec, entry);
  }
  const totalSituations = situations.length;
  const sectorBreakdown: SectorBreakdown[] = [...sectorMap.entries()]
    .map(([sector, data]) => ({
      sector,
      count: data.count,
      pctOfTotal: r1((data.count / totalSituations) * 100),
      avgSpreadPct: data.spreads.length > 0
        ? r2(data.spreads.reduce((sum, v) => sum + v, 0) / data.spreads.length)
        : null,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Risk/Reward Matrix ──

  const riskRewardMatrix: RiskRewardItem[] = mergerSituations.map(s => {
    const upsidePct = s.spreadPct;
    const downsidePct = r2(-((s.offerPrice - s.currentPrice * (1 - s.premiumPct / 200)) / s.currentPrice) * 100);
    const expectedReturnPct = r2((s.probabilityPct / 100) * upsidePct + ((100 - s.probabilityPct) / 100) * downsidePct);

    return {
      target: s.target,
      category: s.category,
      probabilityPct: s.probabilityPct,
      upsidePct,
      downsidePct: Math.min(-1, downsidePct),
      expectedReturnPct,
    };
  });

  // Add activist risk/reward estimates
  for (const a of activistSituations) {
    const probSuccess = a.status === 'settled' ? 85 + rng() * 10
      : a.status === 'escalating' ? 55 + rng() * 20
      : 40 + rng() * 25;
    const upside = r2(8 + rng() * 22);
    const downside = r2(-(3 + rng() * 8));
    const expectedReturn = r2((probSuccess / 100) * upside + ((100 - probSuccess) / 100) * downside);

    riskRewardMatrix.push({
      target: a.targetCompany,
      category: a.category,
      probabilityPct: r1(probSuccess),
      upsidePct: upside,
      downsidePct: downside,
      expectedReturnPct: expectedReturn,
    });
  }

  riskRewardMatrix.sort((a, b) => b.expectedReturnPct - a.expectedReturnPct);

  return {
    situations,
    pipeline: {
      announcedThisWeek,
      pendingRegulatory,
      expectedToCloseThisMonth,
    },
    spreadAnalytics,
    sectorBreakdown,
    riskRewardMatrix,
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
    console.error('[SpecialSituations] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate special situations data' });
  }
});

export default router;
