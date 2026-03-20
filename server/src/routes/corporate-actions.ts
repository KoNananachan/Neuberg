import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

type ActionType = 'DIVIDEND' | 'STOCK_SPLIT' | 'MERGER' | 'SPINOFF' | 'RIGHTS_ISSUE' | 'TENDER_OFFER' | 'DELISTING';
type ActionStatus = 'ANNOUNCED' | 'PENDING' | 'APPROVED' | 'COMPLETED';
type DividendFrequency = 'QUARTERLY' | 'SEMI' | 'ANNUAL';
type DividendType = 'REGULAR' | 'SPECIAL' | 'INTERIM';
type DealType = 'CASH' | 'STOCK' | 'MIXED';
type DealStatus = 'ANNOUNCED' | 'REGULATORY_REVIEW' | 'SHAREHOLDER_VOTE' | 'CLOSING';

interface UpcomingAction {
  ticker: string;
  companyName: string;
  actionType: ActionType;
  exDate: string;
  recordDate: string;
  payDate: string;
  details: string;
  status: ActionStatus;
}

interface DividendCalendarEntry {
  ticker: string;
  company: string;
  exDate: string;
  amount: number;
  yield: number;
  frequency: DividendFrequency;
  type: DividendType;
}

interface MaDeal {
  acquirer: string;
  target: string;
  dealValue: number;
  premium: number;
  dealType: DealType;
  status: DealStatus;
  expectedClose: string;
  spreadToOffer: number;
}

interface Summary {
  totalUpcoming: number;
  dividendCount: number;
  maDeals: number;
  totalMaValue: number;
  nextMajorAction: string;
  timestamp: string;
}

interface CorporateActionsResponse {
  upcomingActions: UpcomingAction[];
  dividendCalendar: DividendCalendarEntry[];
  maPipeline: MaDeal[];
  summary: Summary;
}

// ── Company definitions ──

interface CompanyDef {
  ticker: string;
  companyName: string;
  basePrice: number;
  dividendPerShare: number;
  dividendYield: number;
}

const ACTION_COMPANIES: CompanyDef[] = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', basePrice: 213.25, dividendPerShare: 0.96, dividendYield: 0.45 },
  { ticker: 'MSFT', companyName: 'Microsoft Corp.', basePrice: 428.50, dividendPerShare: 3.00, dividendYield: 0.70 },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', basePrice: 198.70, dividendPerShare: 4.60, dividendYield: 2.32 },
  { ticker: 'JNJ', companyName: 'Johnson & Johnson', basePrice: 156.30, dividendPerShare: 4.76, dividendYield: 3.05 },
  { ticker: 'PG', companyName: 'Procter & Gamble Co.', basePrice: 168.40, dividendPerShare: 3.76, dividendYield: 2.23 },
  { ticker: 'XOM', companyName: 'Exxon Mobil Corp.', basePrice: 104.80, dividendPerShare: 3.80, dividendYield: 3.63 },
  { ticker: 'KO', companyName: 'The Coca-Cola Co.', basePrice: 62.50, dividendPerShare: 1.84, dividendYield: 2.94 },
  { ticker: 'PEP', companyName: 'PepsiCo Inc.', basePrice: 171.20, dividendPerShare: 5.06, dividendYield: 2.96 },
  { ticker: 'V', companyName: 'Visa Inc.', basePrice: 278.90, dividendPerShare: 2.08, dividendYield: 0.75 },
  { ticker: 'HD', companyName: 'The Home Depot Inc.', basePrice: 362.70, dividendPerShare: 8.36, dividendYield: 2.31 },
  { ticker: 'ABBV', companyName: 'AbbVie Inc.', basePrice: 174.50, dividendPerShare: 5.92, dividendYield: 3.39 },
  { ticker: 'MRK', companyName: 'Merck & Co. Inc.', basePrice: 128.60, dividendPerShare: 2.92, dividendYield: 2.27 },
  { ticker: 'CVX', companyName: 'Chevron Corp.', basePrice: 155.30, dividendPerShare: 6.04, dividendYield: 3.89 },
  { ticker: 'LLY', companyName: 'Eli Lilly & Co.', basePrice: 782.40, dividendPerShare: 5.20, dividendYield: 0.66 },
  { ticker: 'AVGO', companyName: 'Broadcom Inc.', basePrice: 1385.00, dividendPerShare: 21.00, dividendYield: 1.52 },
  { ticker: 'UNH', companyName: 'UnitedHealth Group Inc.', basePrice: 527.80, dividendPerShare: 7.52, dividendYield: 1.42 },
  { ticker: 'WMT', companyName: 'Walmart Inc.', basePrice: 65.80, dividendPerShare: 0.83, dividendYield: 1.26 },
  { ticker: 'COST', companyName: 'Costco Wholesale Corp.', basePrice: 725.60, dividendPerShare: 4.08, dividendYield: 0.56 },
  { ticker: 'BA', companyName: 'The Boeing Co.', basePrice: 178.40, dividendPerShare: 0, dividendYield: 0 },
  { ticker: 'GS', companyName: 'Goldman Sachs Group Inc.', basePrice: 415.80, dividendPerShare: 10.00, dividendYield: 2.40 },
];

// M&A deal definitions (acquirer -> target pairs)
interface MaDef {
  acquirer: string;
  target: string;
  targetTicker: string;
  baseDealValue: number; // in $B
  basePremium: number;   // %
}

const MA_DEFS: MaDef[] = [
  { acquirer: 'Broadcom Inc.', target: 'VMware Inc.', targetTicker: 'VMW', baseDealValue: 69.0, basePremium: 44 },
  { acquirer: 'Microsoft Corp.', target: 'Activision Blizzard Inc.', targetTicker: 'ATVI', baseDealValue: 68.7, basePremium: 45 },
  { acquirer: 'Exxon Mobil Corp.', target: 'Pioneer Natural Resources', targetTicker: 'PXD', baseDealValue: 59.5, basePremium: 18 },
  { acquirer: 'Pfizer Inc.', target: 'Seagen Inc.', targetTicker: 'SGEN', baseDealValue: 43.0, basePremium: 33 },
  { acquirer: 'Chevron Corp.', target: 'Hess Corp.', targetTicker: 'HES', baseDealValue: 53.0, basePremium: 10 },
  { acquirer: 'Cisco Systems Inc.', target: 'Splunk Inc.', targetTicker: 'SPLK', baseDealValue: 28.0, basePremium: 31 },
  { acquirer: 'AbbVie Inc.', target: 'ImmunoGen Inc.', targetTicker: 'IMGN', baseDealValue: 10.1, basePremium: 95 },
  { acquirer: 'Johnson & Johnson', target: 'Shockwave Medical Inc.', targetTicker: 'SWAV', baseDealValue: 13.1, basePremium: 15 },
  { acquirer: 'Capital One Financial', target: 'Discover Financial Services', targetTicker: 'DFS', baseDealValue: 35.3, basePremium: 26 },
  { acquirer: 'ConocoPhillips', target: 'Marathon Oil Corp.', targetTicker: 'MRO', baseDealValue: 22.5, basePremium: 14 },
];

const ACTION_TYPES: ActionType[] = ['DIVIDEND', 'STOCK_SPLIT', 'MERGER', 'SPINOFF', 'RIGHTS_ISSUE', 'TENDER_OFFER', 'DELISTING'];
const ACTION_STATUSES: ActionStatus[] = ['ANNOUNCED', 'PENDING', 'APPROVED', 'COMPLETED'];
const DEAL_TYPES: DealType[] = ['CASH', 'STOCK', 'MIXED'];
const DEAL_STATUSES: DealStatus[] = ['ANNOUNCED', 'REGULATORY_REVIEW', 'SHAREHOLDER_VOTE', 'CLOSING'];
const DIV_FREQUENCIES: DividendFrequency[] = ['QUARTERLY', 'SEMI', 'ANNUAL'];
const DIV_TYPES: DividendType[] = ['REGULAR', 'SPECIAL', 'INTERIM'];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateActionDetails(actionType: ActionType, rng: () => number, co: CompanyDef): string {
  switch (actionType) {
    case 'DIVIDEND': {
      const amount = co.dividendPerShare > 0
        ? round2(co.dividendPerShare * (0.9 + rng() * 0.25) / 4)
        : round2(0.10 + rng() * 1.50);
      const types = ['quarterly', 'semi-annual', 'annual', 'special'];
      const t = pick(types, rng);
      return `$${amount}/share ${t}`;
    }
    case 'STOCK_SPLIT': {
      const splits = ['2:1 forward split', '3:1 forward split', '4:1 forward split', '5:1 forward split', '10:1 forward split', '20:1 forward split', '1:5 reverse split', '1:10 reverse split'];
      return pick(splits, rng);
    }
    case 'MERGER': {
      const pricePerShare = round2(co.basePrice * (1.15 + rng() * 0.40));
      const mergerTypes = [`$${pricePerShare}/share cash acquisition`, `$${pricePerShare}/share cash & stock`, `Stock-for-stock merger at ${round2(0.8 + rng() * 0.6)}x exchange ratio`];
      return pick(mergerTypes, rng);
    }
    case 'SPINOFF': {
      const units = ['tax-free', 'pro-rata'];
      const ratio = `1:${Math.floor(3 + rng() * 8)}`;
      return `${pick(units, rng)} distribution, ${ratio} ratio`;
    }
    case 'RIGHTS_ISSUE': {
      const discount = round1(15 + rng() * 25);
      const ratio = `${Math.floor(1 + rng() * 3)}:${Math.floor(5 + rng() * 10)}`;
      return `${ratio} ratio at ${discount}% discount`;
    }
    case 'TENDER_OFFER': {
      const tenderPrice = round2(co.basePrice * (1.20 + rng() * 0.35));
      return `$${tenderPrice}/share cash tender`;
    }
    case 'DELISTING': {
      const reasons = ['Voluntary delisting, moving to private', 'Merger-related delisting', 'Compliance-related delisting'];
      return pick(reasons, rng);
    }
    default:
      return '';
  }
}

// ── Generation logic ──

function generateUpcomingActions(rng: () => number): UpcomingAction[] {
  const today = new Date();
  const actions: UpcomingAction[] = [];

  // Weighted action types: dividends are most common
  const weightedTypes: ActionType[] = [
    'DIVIDEND', 'DIVIDEND', 'DIVIDEND', 'DIVIDEND', 'DIVIDEND',
    'STOCK_SPLIT',
    'MERGER', 'MERGER',
    'SPINOFF',
    'RIGHTS_ISSUE',
    'TENDER_OFFER', 'TENDER_OFFER',
    'DELISTING',
  ];

  for (let i = 0; i < 15; i++) {
    const co = ACTION_COMPANIES[Math.floor(rng() * ACTION_COMPANIES.length)];
    const actionType = pick(weightedTypes, rng);
    const status = pick(ACTION_STATUSES, rng);

    // Ex-date: 1-45 days from now
    const exDaysOut = 1 + Math.floor(rng() * 45);
    const exDateObj = new Date(today);
    exDateObj.setDate(exDateObj.getDate() + exDaysOut);
    // Avoid weekends
    const dow = exDateObj.getDay();
    if (dow === 0) exDateObj.setDate(exDateObj.getDate() + 1);
    else if (dow === 6) exDateObj.setDate(exDateObj.getDate() + 2);
    const exDate = formatDate(exDateObj);

    // Record date: 1-2 business days after ex-date
    const recordDateObj = new Date(exDateObj);
    recordDateObj.setDate(recordDateObj.getDate() + 1 + Math.floor(rng() * 2));
    const recordDow = recordDateObj.getDay();
    if (recordDow === 0) recordDateObj.setDate(recordDateObj.getDate() + 1);
    else if (recordDow === 6) recordDateObj.setDate(recordDateObj.getDate() + 2);
    const recordDate = formatDate(recordDateObj);

    // Pay date: 14-45 days after record date
    const payDateObj = new Date(recordDateObj);
    payDateObj.setDate(payDateObj.getDate() + 14 + Math.floor(rng() * 32));
    const payDow = payDateObj.getDay();
    if (payDow === 0) payDateObj.setDate(payDateObj.getDate() + 1);
    else if (payDow === 6) payDateObj.setDate(payDateObj.getDate() + 2);
    const payDate = formatDate(payDateObj);

    const details = generateActionDetails(actionType, rng, co);

    actions.push({
      ticker: co.ticker,
      companyName: co.companyName,
      actionType,
      exDate,
      recordDate,
      payDate,
      details,
      status,
    });
  }

  // Sort by ex-date ascending (nearest first)
  actions.sort((a, b) => a.exDate.localeCompare(b.exDate));
  return actions;
}

function generateDividendCalendar(rng: () => number): DividendCalendarEntry[] {
  const today = new Date();
  const entries: DividendCalendarEntry[] = [];

  // Pick companies that pay dividends (non-zero yield)
  const divPayers = ACTION_COMPANIES.filter(c => c.dividendYield > 0);

  for (let i = 0; i < 10; i++) {
    const co = divPayers[Math.floor(rng() * divPayers.length)];
    const frequency = pick(DIV_FREQUENCIES, rng);
    const type = pick(DIV_TYPES, rng);

    // Ex-date: 1-30 days from now
    const daysOut = 1 + Math.floor(rng() * 30);
    const exDateObj = new Date(today);
    exDateObj.setDate(exDateObj.getDate() + daysOut);
    const dow = exDateObj.getDay();
    if (dow === 0) exDateObj.setDate(exDateObj.getDate() + 1);
    else if (dow === 6) exDateObj.setDate(exDateObj.getDate() + 2);
    const exDate = formatDate(exDateObj);

    // Quarterly amount based on real dividend data with jitter
    let amount: number;
    if (type === 'SPECIAL') {
      amount = round2(co.dividendPerShare * (1.5 + rng() * 3.0));
    } else if (frequency === 'QUARTERLY') {
      amount = round2((co.dividendPerShare / 4) * (0.95 + rng() * 0.12));
    } else if (frequency === 'SEMI') {
      amount = round2((co.dividendPerShare / 2) * (0.95 + rng() * 0.12));
    } else {
      amount = round2(co.dividendPerShare * (0.95 + rng() * 0.12));
    }

    // Yield: derived from amount and price
    const annualizedAmount = frequency === 'QUARTERLY' ? amount * 4
      : frequency === 'SEMI' ? amount * 2
      : amount;
    const yieldPct = round2((annualizedAmount / co.basePrice) * 100);

    entries.push({
      ticker: co.ticker,
      company: co.companyName,
      exDate,
      amount,
      yield: yieldPct,
      frequency,
      type,
    });
  }

  // Sort by ex-date ascending
  entries.sort((a, b) => a.exDate.localeCompare(b.exDate));
  return entries;
}

function generateMaPipeline(rng: () => number): MaDeal[] {
  const deals: MaDeal[] = [];
  const today = new Date();

  // Shuffle and pick 8 from the MA_DEFS pool
  const shuffled = [...MA_DEFS].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 8);

  for (const def of selected) {
    const dealType = pick(DEAL_TYPES, rng);
    const status = pick(DEAL_STATUSES, rng);

    // Jitter the deal value +/- 5%
    const dealValue = round1(def.baseDealValue * (0.95 + rng() * 0.10));

    // Premium: base +/- 5pp
    const premium = round1(def.basePremium + (rng() - 0.5) * 10);

    // Expected close: 2-14 months from now
    const monthsOut = 2 + Math.floor(rng() * 13);
    const closeDate = new Date(today);
    closeDate.setMonth(closeDate.getMonth() + monthsOut);
    const expectedClose = formatDate(closeDate);

    // Spread to offer: 0.2-8.5% (wider for more uncertain deals)
    let spreadBase: number;
    switch (status) {
      case 'CLOSING':
        spreadBase = 0.2 + rng() * 1.0;
        break;
      case 'SHAREHOLDER_VOTE':
        spreadBase = 0.8 + rng() * 2.5;
        break;
      case 'REGULATORY_REVIEW':
        spreadBase = 1.5 + rng() * 4.0;
        break;
      default: // ANNOUNCED
        spreadBase = 3.0 + rng() * 5.5;
        break;
    }
    const spreadToOffer = round2(spreadBase);

    deals.push({
      acquirer: def.acquirer,
      target: def.target,
      dealValue,
      premium,
      dealType,
      status,
      expectedClose,
      spreadToOffer,
    });
  }

  // Sort by deal value descending
  deals.sort((a, b) => b.dealValue - a.dealValue);
  return deals;
}

function generateSummary(
  upcomingActions: UpcomingAction[],
  dividendCalendar: DividendCalendarEntry[],
  maPipeline: MaDeal[]
): Summary {
  const totalMaValue = round1(maPipeline.reduce((sum, d) => sum + d.dealValue, 0));

  // Next major action: find the earliest non-dividend action, or the earliest overall
  const nonDividend = upcomingActions.filter(a => a.actionType !== 'DIVIDEND');
  const nextMajor = nonDividend.length > 0 ? nonDividend[0] : upcomingActions[0];
  const nextMajorAction = nextMajor
    ? `${nextMajor.ticker} ${nextMajor.actionType.replace('_', ' ')} on ${nextMajor.exDate}`
    : 'None scheduled';

  return {
    totalUpcoming: upcomingActions.length,
    dividendCount: dividendCalendar.length,
    maDeals: maPipeline.length,
    totalMaValue,
    nextMajorAction,
    timestamp: new Date().toISOString(),
  };
}

function buildCorporateActionsData(): CorporateActionsResponse {
  const rng = seededRandom('corporate-actions');

  const upcomingActions = generateUpcomingActions(rng);
  const dividendCalendar = generateDividendCalendar(rng);
  const maPipeline = generateMaPipeline(rng);
  const summary = generateSummary(upcomingActions, dividendCalendar, maPipeline);

  return { upcomingActions, dividendCalendar, maPipeline, summary };
}

// ── Cache ──

let cachedData: { data: CorporateActionsResponse; ts: number } | null = null;
let staleData: CorporateActionsResponse | null = null;


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cachedData.ts < CACHE_TTL) {
      res.json(cachedData.data);
      return;
    }

    // Generate fresh data
    const data = buildCorporateActionsData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[CorporateActions] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate corporate actions data' });
  }
});

export default router;
