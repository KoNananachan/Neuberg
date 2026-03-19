import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

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

// ── Types ──

interface DividendAction {
  type: 'dividend';
  symbol: string;
  company: string;
  sector: string;
  exDate: string;
  recordDate: string;
  payDate: string;
  amount: number;
  yield: number;
  frequency: 'Q' | 'SA' | 'A';
}

interface StockSplitAction {
  type: 'stock_split';
  symbol: string;
  company: string;
  ratio: string;
  effectiveDate: string;
  splitType: 'forward' | 'reverse';
}

interface IPOLockupAction {
  type: 'ipo_lockup';
  company: string;
  symbol: string;
  lockupExpiryDate: string;
  sharesReleased: number;
  percentOfFloat: number;
}

interface MAAction {
  type: 'ma_event';
  target: string;
  targetSymbol: string;
  acquirer: string;
  eventType: 'vote_date' | 'regulatory_deadline' | 'expected_close';
  eventLabel: string;
  date: string;
}

interface RightsOfferingAction {
  type: 'rights_offering';
  company: string;
  symbol: string;
  subscriptionPrice: number;
  ratio: string;
  exDate: string;
  expiry: string;
}

interface SpinoffAction {
  type: 'spinoff';
  parent: string;
  parentSymbol: string;
  spinoffEntity: string;
  spinoffSymbol: string;
  recordDate: string;
  distributionDate: string;
}

type CorporateAction =
  | DividendAction
  | StockSplitAction
  | IPOLockupAction
  | MAAction
  | RightsOfferingAction
  | SpinoffAction;

interface CalendarDay {
  date: string;
  dayOfWeek: string;
  events: CorporateAction[];
}

interface SectorDividendBreakdown {
  sector: string;
  count: number;
  avgYield: number;
  totalAmount: number;
}

interface HighYieldStock {
  symbol: string;
  company: string;
  yield: number;
  amount: number;
  frequency: 'Q' | 'SA' | 'A';
  exDate: string;
}

interface Summary {
  totalDividendsThisWeek: number;
  upcomingSplits: number;
  keyMADates: { target: string; acquirer: string; event: string; date: string }[];
  totalActions: number;
}

interface CorporateActionCalendarResponse {
  actions: CorporateAction[];
  calendar: CalendarDay[];
  summary: Summary;
  sectorBreakdown: SectorDividendBreakdown[];
  highYieldDividends: HighYieldStock[];
  timestamp: string;
}

// ── Stock universe ──

interface DividendStockDef {
  symbol: string;
  company: string;
  sector: string;
  basePrice: number;
  annualDiv: number;
  frequency: 'Q' | 'SA' | 'A';
}

const DIVIDEND_STOCKS: DividendStockDef[] = [
  { symbol: 'JNJ', company: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 155.30, annualDiv: 4.76, frequency: 'Q' },
  { symbol: 'PG', company: 'Procter & Gamble Co.', sector: 'Consumer Staples', basePrice: 168.40, annualDiv: 3.76, frequency: 'Q' },
  { symbol: 'KO', company: 'Coca-Cola Co.', sector: 'Consumer Staples', basePrice: 62.50, annualDiv: 1.94, frequency: 'Q' },
  { symbol: 'PEP', company: 'PepsiCo Inc.', sector: 'Consumer Staples', basePrice: 171.20, annualDiv: 5.06, frequency: 'Q' },
  { symbol: 'XOM', company: 'Exxon Mobil Corp.', sector: 'Energy', basePrice: 104.80, annualDiv: 3.80, frequency: 'Q' },
  { symbol: 'CVX', company: 'Chevron Corp.', sector: 'Energy', basePrice: 155.30, annualDiv: 6.04, frequency: 'Q' },
  { symbol: 'JPM', company: 'JPMorgan Chase & Co.', sector: 'Financials', basePrice: 198.70, annualDiv: 4.60, frequency: 'Q' },
  { symbol: 'ABBV', company: 'AbbVie Inc.', sector: 'Healthcare', basePrice: 174.50, annualDiv: 6.20, frequency: 'Q' },
  { symbol: 'MRK', company: 'Merck & Co. Inc.', sector: 'Healthcare', basePrice: 128.60, annualDiv: 3.08, frequency: 'Q' },
  { symbol: 'AVGO', company: 'Broadcom Inc.', sector: 'Information Technology', basePrice: 1385.00, annualDiv: 21.00, frequency: 'Q' },
  { symbol: 'HD', company: 'Home Depot Inc.', sector: 'Consumer Discretionary', basePrice: 362.70, annualDiv: 8.36, frequency: 'Q' },
  { symbol: 'T', company: 'AT&T Inc.', sector: 'Communication Services', basePrice: 17.40, annualDiv: 1.11, frequency: 'Q' },
  { symbol: 'VZ', company: 'Verizon Communications Inc.', sector: 'Communication Services', basePrice: 38.20, annualDiv: 2.66, frequency: 'Q' },
  { symbol: 'O', company: 'Realty Income Corp.', sector: 'Real Estate', basePrice: 55.40, annualDiv: 3.07, frequency: 'Q' },
  { symbol: 'IBM', company: 'International Business Machines', sector: 'Information Technology', basePrice: 190.30, annualDiv: 6.64, frequency: 'Q' },
  { symbol: 'ED', company: 'Consolidated Edison Inc.', sector: 'Utilities', basePrice: 98.50, annualDiv: 3.24, frequency: 'Q' },
  { symbol: 'SO', company: 'Southern Co.', sector: 'Utilities', basePrice: 72.30, annualDiv: 2.80, frequency: 'Q' },
  { symbol: 'DUK', company: 'Duke Energy Corp.', sector: 'Utilities', basePrice: 100.20, annualDiv: 4.06, frequency: 'Q' },
  { symbol: 'GS', company: 'Goldman Sachs Group Inc.', sector: 'Financials', basePrice: 415.80, annualDiv: 11.00, frequency: 'Q' },
  { symbol: 'LMT', company: 'Lockheed Martin Corp.', sector: 'Industrials', basePrice: 450.20, annualDiv: 12.60, frequency: 'Q' },
  { symbol: 'SPG', company: 'Simon Property Group Inc.', sector: 'Real Estate', basePrice: 145.60, annualDiv: 7.60, frequency: 'Q' },
  { symbol: 'EMR', company: 'Emerson Electric Co.', sector: 'Industrials', basePrice: 105.40, annualDiv: 2.10, frequency: 'Q' },
  { symbol: 'CL', company: 'Colgate-Palmolive Co.', sector: 'Consumer Staples', basePrice: 82.30, annualDiv: 1.92, frequency: 'Q' },
  { symbol: 'MCD', company: "McDonald's Corp.", sector: 'Consumer Discretionary', basePrice: 290.50, annualDiv: 6.68, frequency: 'Q' },
  { symbol: 'TXN', company: 'Texas Instruments Inc.', sector: 'Information Technology', basePrice: 175.80, annualDiv: 5.20, frequency: 'Q' },
];

interface SplitCandidate {
  symbol: string;
  company: string;
}

const SPLIT_CANDIDATES: SplitCandidate[] = [
  { symbol: 'COST', company: 'Costco Wholesale Corp.' },
  { symbol: 'DECK', company: 'Deckers Outdoor Corp.' },
  { symbol: 'CMG', company: 'Chipotle Mexican Grill Inc.' },
  { symbol: 'KLAC', company: 'KLA Corp.' },
  { symbol: 'MELI', company: 'MercadoLibre Inc.' },
  { symbol: 'ORLY', company: "O'Reilly Automotive Inc." },
  { symbol: 'BKNG', company: 'Booking Holdings Inc.' },
];

interface IPOLockupCandidate {
  symbol: string;
  company: string;
  totalShares: number;
}

const IPO_LOCKUP_CANDIDATES: IPOLockupCandidate[] = [
  { symbol: 'ARM', company: 'Arm Holdings plc', totalShares: 1025_000_000 },
  { symbol: 'BIRK', company: 'Birkenstock Holding plc', totalShares: 187_400_000 },
  { symbol: 'VRT', company: 'Vertiv Holdings Co.', totalShares: 378_000_000 },
  { symbol: 'CART', company: 'Maplebear Inc. (Instacart)', totalShares: 272_000_000 },
  { symbol: 'KVYO', company: 'Klaviyo Inc.', totalShares: 263_000_000 },
  { symbol: 'CAVA', company: 'CAVA Group Inc.', totalShares: 115_000_000 },
];

interface MACandidate {
  target: string;
  targetSymbol: string;
  acquirer: string;
}

const MA_CANDIDATES: MACandidate[] = [
  { target: 'Hess Corp.', targetSymbol: 'HES', acquirer: 'Chevron Corp.' },
  { target: 'Discover Financial Services', targetSymbol: 'DFS', acquirer: 'Capital One Financial' },
  { target: 'US Steel Corp.', targetSymbol: 'X', acquirer: 'Nippon Steel Corp.' },
  { target: 'Juniper Networks Inc.', targetSymbol: 'JNPR', acquirer: 'Hewlett Packard Enterprise' },
  { target: 'Catalent Inc.', targetSymbol: 'CTLT', acquirer: 'Novo Holdings' },
  { target: 'HashiCorp Inc.', targetSymbol: 'HCP', acquirer: 'IBM' },
  { target: 'Ansys Inc.', targetSymbol: 'ANSS', acquirer: 'Synopsys Inc.' },
];

interface RightsCandidate {
  symbol: string;
  company: string;
  basePrice: number;
}

const RIGHTS_CANDIDATES: RightsCandidate[] = [
  { symbol: 'NIO', company: 'NIO Inc.', basePrice: 5.80 },
  { symbol: 'RIVN', company: 'Rivian Automotive Inc.', basePrice: 12.40 },
  { symbol: 'LCID', company: 'Lucid Group Inc.', basePrice: 3.20 },
  { symbol: 'SOFI', company: 'SoFi Technologies Inc.', basePrice: 8.50 },
];

interface SpinoffCandidate {
  parentSymbol: string;
  parent: string;
  spinoffEntity: string;
  spinoffSymbol: string;
}

const SPINOFF_CANDIDATES: SpinoffCandidate[] = [
  { parentSymbol: 'GE', parent: 'General Electric Co.', spinoffEntity: 'GE Vernova Inc.', spinoffSymbol: 'GEV' },
  { parentSymbol: 'MMM', parent: '3M Co.', spinoffEntity: 'Solventum Corp.', spinoffSymbol: 'SOLV' },
  { parentSymbol: 'RTX', parent: 'RTX Corp.', spinoffEntity: 'Otis Worldwide Corp.', spinoffSymbol: 'OTIS' },
];

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

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function skipWeekend(d: Date): Date {
  const dow = d.getDay();
  if (dow === 0) d.setDate(d.getDate() + 1);
  else if (dow === 6) d.setDate(d.getDate() + 2);
  return d;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Generators ──

function generateDividends(rng: () => number, today: Date): DividendAction[] {
  const actions: DividendAction[] = [];
  const shuffled = shuffle(DIVIDEND_STOCKS, rng);
  const selected = shuffled.slice(0, 20);

  for (const stock of selected) {
    const priceVar = 1 + (rng() - 0.5) * 0.08;
    const divVar = 1 + (rng() - 0.5) * 0.06;
    const price = stock.basePrice * priceVar;

    let perPayment: number;
    if (stock.frequency === 'Q') {
      perPayment = (stock.annualDiv * divVar) / 4;
    } else if (stock.frequency === 'SA') {
      perPayment = (stock.annualDiv * divVar) / 2;
    } else {
      perPayment = stock.annualDiv * divVar;
    }

    const amount = round2(perPayment);
    const annualized = stock.frequency === 'Q' ? amount * 4 : stock.frequency === 'SA' ? amount * 2 : amount;
    const yieldPct = round2((annualized / price) * 100);

    // Ex-date within next 14 days for calendar view
    const daysAhead = 1 + Math.floor(rng() * 14);
    const exDateObj = skipWeekend(addDays(today, daysAhead));
    const exDate = formatDate(exDateObj);

    // Record date: 1 business day after ex-date
    const recordDateObj = skipWeekend(addDays(exDateObj, 1));
    const recordDate = formatDate(recordDateObj);

    // Pay date: 14-30 days after record date
    const payDateObj = skipWeekend(addDays(recordDateObj, 14 + Math.floor(rng() * 17)));
    const payDate = formatDate(payDateObj);

    actions.push({
      type: 'dividend',
      symbol: stock.symbol,
      company: stock.company,
      sector: stock.sector,
      exDate,
      recordDate,
      payDate,
      amount,
      yield: yieldPct,
      frequency: stock.frequency,
    });
  }

  actions.sort((a, b) => a.exDate.localeCompare(b.exDate));
  return actions;
}

function generateStockSplits(rng: () => number, today: Date): StockSplitAction[] {
  const actions: StockSplitAction[] = [];
  const ratios = ['2:1', '3:1', '4:1', '10:1'];
  const shuffled = shuffle(SPLIT_CANDIDATES, rng);
  const selected = shuffled.slice(0, 5);

  for (const candidate of selected) {
    const daysAhead = 2 + Math.floor(rng() * 13);
    const effectiveDateObj = skipWeekend(addDays(today, daysAhead));
    const ratio = pick(ratios, rng);
    const splitType: 'forward' | 'reverse' = rng() < 0.85 ? 'forward' : 'reverse';

    actions.push({
      type: 'stock_split',
      symbol: candidate.symbol,
      company: candidate.company,
      ratio: splitType === 'reverse' ? `1:${ratio.split(':')[0]}` : ratio,
      effectiveDate: formatDate(effectiveDateObj),
      splitType,
    });
  }

  actions.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  return actions;
}

function generateIPOLockups(rng: () => number, today: Date): IPOLockupAction[] {
  const actions: IPOLockupAction[] = [];
  const shuffled = shuffle(IPO_LOCKUP_CANDIDATES, rng);
  const selected = shuffled.slice(0, 5);

  for (const candidate of selected) {
    const daysAhead = 1 + Math.floor(rng() * 14);
    const expiryDateObj = skipWeekend(addDays(today, daysAhead));

    // Shares released: 15-65% of total shares
    const releasePct = 15 + rng() * 50;
    const sharesReleased = Math.round(candidate.totalShares * (releasePct / 100));
    const percentOfFloat = round1(releasePct * (0.8 + rng() * 0.4));

    actions.push({
      type: 'ipo_lockup',
      company: candidate.company,
      symbol: candidate.symbol,
      lockupExpiryDate: formatDate(expiryDateObj),
      sharesReleased,
      percentOfFloat,
    });
  }

  actions.sort((a, b) => a.lockupExpiryDate.localeCompare(b.lockupExpiryDate));
  return actions;
}

function generateMAEvents(rng: () => number, today: Date): MAAction[] {
  const actions: MAAction[] = [];
  const eventTypes: { key: MAAction['eventType']; label: string }[] = [
    { key: 'vote_date', label: 'Shareholder Vote' },
    { key: 'regulatory_deadline', label: 'Regulatory Deadline' },
    { key: 'expected_close', label: 'Expected Close' },
  ];
  const shuffled = shuffle(MA_CANDIDATES, rng);
  const selected = shuffled.slice(0, 5);

  for (const candidate of selected) {
    const daysAhead = 2 + Math.floor(rng() * 13);
    const dateObj = skipWeekend(addDays(today, daysAhead));
    const evt = pick(eventTypes, rng);

    actions.push({
      type: 'ma_event',
      target: candidate.target,
      targetSymbol: candidate.targetSymbol,
      acquirer: candidate.acquirer,
      eventType: evt.key,
      eventLabel: evt.label,
      date: formatDate(dateObj),
    });
  }

  actions.sort((a, b) => a.date.localeCompare(b.date));
  return actions;
}

function generateRightsOfferings(rng: () => number, today: Date): RightsOfferingAction[] {
  const actions: RightsOfferingAction[] = [];
  const shuffled = shuffle(RIGHTS_CANDIDATES, rng);
  const selected = shuffled.slice(0, 3);

  for (const candidate of selected) {
    const daysAhead = 1 + Math.floor(rng() * 10);
    const exDateObj = skipWeekend(addDays(today, daysAhead));
    const expiryObj = skipWeekend(addDays(exDateObj, 14 + Math.floor(rng() * 14)));

    // Subscription price at 15-30% discount to current price
    const discount = 0.15 + rng() * 0.15;
    const subscriptionPrice = round2(candidate.basePrice * (1 - discount));

    // Rights ratio: e.g. "1:5" meaning 1 new share for every 5 held
    const rightsPer = 3 + Math.floor(rng() * 8);
    const ratio = `1:${rightsPer}`;

    actions.push({
      type: 'rights_offering',
      company: candidate.company,
      symbol: candidate.symbol,
      subscriptionPrice,
      ratio,
      exDate: formatDate(exDateObj),
      expiry: formatDate(expiryObj),
    });
  }

  actions.sort((a, b) => a.exDate.localeCompare(b.exDate));
  return actions;
}

function generateSpinoffs(rng: () => number, today: Date): SpinoffAction[] {
  const actions: SpinoffAction[] = [];
  const shuffled = shuffle(SPINOFF_CANDIDATES, rng);
  const selected = shuffled.slice(0, 2);

  for (const candidate of selected) {
    const daysAhead = 3 + Math.floor(rng() * 12);
    const recordDateObj = skipWeekend(addDays(today, daysAhead));
    const distributionDateObj = skipWeekend(addDays(recordDateObj, 5 + Math.floor(rng() * 10)));

    actions.push({
      type: 'spinoff',
      parent: candidate.parent,
      parentSymbol: candidate.parentSymbol,
      spinoffEntity: candidate.spinoffEntity,
      spinoffSymbol: candidate.spinoffSymbol,
      recordDate: formatDate(recordDateObj),
      distributionDate: formatDate(distributionDateObj),
    });
  }

  actions.sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  return actions;
}

function getActionDate(action: CorporateAction): string {
  switch (action.type) {
    case 'dividend': return action.exDate;
    case 'stock_split': return action.effectiveDate;
    case 'ipo_lockup': return action.lockupExpiryDate;
    case 'ma_event': return action.date;
    case 'rights_offering': return action.exDate;
    case 'spinoff': return action.recordDate;
  }
}

function buildCalendar(actions: CorporateAction[], today: Date): CalendarDay[] {
  const calendar: CalendarDay[] = [];

  // Build 14-day calendar (next 2 weeks, business days only)
  for (let i = 0; i < 14; i++) {
    const dateObj = addDays(today, i + 1);
    const dow = dateObj.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const dateStr = formatDate(dateObj);
    const dayEvents = actions.filter((a) => getActionDate(a) === dateStr);

    calendar.push({
      date: dateStr,
      dayOfWeek: DAY_NAMES[dow],
      events: dayEvents,
    });
  }

  return calendar;
}

function buildSectorBreakdown(dividends: DividendAction[]): SectorDividendBreakdown[] {
  const sectorMap = new Map<string, { yields: number[]; amounts: number[] }>();

  for (const d of dividends) {
    if (!sectorMap.has(d.sector)) {
      sectorMap.set(d.sector, { yields: [], amounts: [] });
    }
    const entry = sectorMap.get(d.sector)!;
    entry.yields.push(d.yield);
    entry.amounts.push(d.amount);
  }

  const breakdown: SectorDividendBreakdown[] = [];
  for (const [sector, data] of sectorMap) {
    const avgYield = round2(data.yields.reduce((s, y) => s + y, 0) / data.yields.length);
    const totalAmount = round2(data.amounts.reduce((s, a) => s + a, 0));
    breakdown.push({
      sector,
      count: data.yields.length,
      avgYield,
      totalAmount,
    });
  }

  breakdown.sort((a, b) => b.count - a.count);
  return breakdown;
}

function buildHighYieldList(dividends: DividendAction[]): HighYieldStock[] {
  return [...dividends]
    .sort((a, b) => b.yield - a.yield)
    .slice(0, 10)
    .map((d) => ({
      symbol: d.symbol,
      company: d.company,
      yield: d.yield,
      amount: d.amount,
      frequency: d.frequency,
      exDate: d.exDate,
    }));
}

function buildSummary(
  dividends: DividendAction[],
  splits: StockSplitAction[],
  maEvents: MAAction[],
  today: Date
): Summary {
  // Count dividends with ex-date within the next 7 days
  const weekEnd = formatDate(addDays(today, 7));
  const todayStr = formatDate(today);
  const divsThisWeek = dividends.filter(
    (d) => d.exDate >= todayStr && d.exDate <= weekEnd
  ).length;

  const keyMADates = maEvents.map((m) => ({
    target: m.target,
    acquirer: m.acquirer,
    event: m.eventLabel,
    date: m.date,
  }));

  return {
    totalDividendsThisWeek: divsThisWeek,
    upcomingSplits: splits.length,
    keyMADates,
    totalActions: 40,
  };
}

// ── Main generator ──

function generate(): CorporateActionCalendarResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('corporate-action-calendar-' + day));
  const today = new Date();

  // Generate all 40 corporate actions
  const dividends = generateDividends(rng, today);
  const splits = generateStockSplits(rng, today);
  const ipoLockups = generateIPOLockups(rng, today);
  const maEvents = generateMAEvents(rng, today);
  const rightsOfferings = generateRightsOfferings(rng, today);
  const spinoffs = generateSpinoffs(rng, today);

  // Combine all actions
  const actions: CorporateAction[] = [
    ...dividends,
    ...splits,
    ...ipoLockups,
    ...maEvents,
    ...rightsOfferings,
    ...spinoffs,
  ];

  // Sort all actions by date
  actions.sort((a, b) => getActionDate(a).localeCompare(getActionDate(b)));

  // Build calendar view (next 2 weeks)
  const calendar = buildCalendar(actions, today);

  // Build summary
  const summary = buildSummary(dividends, splits, maEvents, today);

  // Sector breakdown of dividend events
  const sectorBreakdown = buildSectorBreakdown(dividends);

  // High-yield dividend stocks sorted by yield
  const highYieldDividends = buildHighYieldList(dividends);

  return {
    actions,
    calendar,
    summary,
    sectorBreakdown,
    highYieldDividends,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache ──

let cache: { data: CorporateActionCalendarResponse; ts: number } | null = null;
let staleData: CorporateActionCalendarResponse | null = null;
const TTL = 5 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    if (cache && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }

    const data = generate();
    staleData = cache?.data ?? staleData;
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CorporateActionCalendar] Error:', err instanceof Error ? err.message : err);

    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cache) {
      res.json(cache.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate corporate action calendar data' });
  }
});

export default router;
