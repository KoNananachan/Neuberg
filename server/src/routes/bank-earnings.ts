import { Router } from 'express';

const router = Router();

// ── PRNG ──

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
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

interface BankEarnings {
  ticker: string;
  name: string;
  reportDate: string;
  quarter: string;
  reported: boolean;
  revenue: { actual: number; estimate: number; yoyChange: number };
  netIncome: { actual: number; estimate: number; yoyChange: number };
  eps: { actual: number; estimate: number; beat: boolean; surprisePct: number };
  nii: number;
  nonInterestIncome: number;
  nim: { current: number; priorQuarter: number; change: number };
  provisionForCreditLosses: number;
  nplRatio: number;
  tradingRevenue: { total: number; ficc: number; equities: number };
  advisoryUnderwriting: { advisory: number; equityUnderwriting: number; debtUnderwriting: number; total: number };
  cet1Ratio: number;
  tceRatio: number;
  roe: number;
  efficiencyRatio: number;
  totalAssets: number;
  totalLoans: number;
  totalDeposits: number;
  stockReaction: number;
}

interface AggregateMetrics {
  avgRevenue: number;
  avgEps: number;
  avgNim: number;
  avgCet1: number;
  avgRoe: number;
  avgEfficiencyRatio: number;
  avgNplRatio: number;
  totalTradingRevenue: number;
  beatRate: number;
  bestPerformer: { ticker: string; metric: string; value: number };
  worstPerformer: { ticker: string; metric: string; value: number };
}

interface QuarterlyTrend {
  quarter: string;
  value: number;
}

interface Trends {
  nimTrend: QuarterlyTrend[];
  provisionTrend: QuarterlyTrend[];
  tradingRevenueTrend: QuarterlyTrend[];
}

interface UpcomingEarnings {
  ticker: string;
  name: string;
  expectedDate: string;
  epsEstimate: number;
  revenueEstimate: number;
}

interface BankEarningsResponse {
  banks: BankEarnings[];
  aggregate: AggregateMetrics;
  trends: Trends;
  upcoming: UpcomingEarnings[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: BankEarningsResponse; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Seed Data ──

interface BankSeed {
  ticker: string;
  name: string;
  revenueBase: number;       // $B quarterly
  netIncomeBase: number;     // $B quarterly
  epsBase: number;
  niiBase: number;           // $B
  nonInterestBase: number;   // $B
  nimBase: number;           // %
  provisionBase: number;     // $B
  nplBase: number;           // %
  ficcBase: number;          // $B
  equitiesBase: number;      // $B
  advisoryBase: number;      // $B
  equityUwBase: number;      // $B
  debtUwBase: number;        // $B
  cet1Base: number;          // %
  tceBase: number;           // %
  roeBase: number;           // %
  efficiencyBase: number;    // %
  totalAssetsBase: number;   // $T
  totalLoansBase: number;    // $B
  totalDepositsBase: number; // $B
  reported: boolean;         // whether already reported this quarter
}

const BANK_SEEDS: BankSeed[] = [
  {
    ticker: 'JPM', name: 'JPMorgan Chase', revenueBase: 41.0, netIncomeBase: 13.4, epsBase: 4.44,
    niiBase: 23.2, nonInterestBase: 17.8, nimBase: 2.62, provisionBase: 2.6, nplBase: 0.58,
    ficcBase: 5.2, equitiesBase: 3.1, advisoryBase: 0.9, equityUwBase: 0.5, debtUwBase: 1.2,
    cet1Base: 15.3, tceBase: 8.1, roeBase: 21.0, efficiencyBase: 52.0,
    totalAssetsBase: 3.87, totalLoansBase: 1340, totalDepositsBase: 2400, reported: true,
  },
  {
    ticker: 'BAC', name: 'Bank of America', revenueBase: 25.5, netIncomeBase: 7.2, epsBase: 0.90,
    niiBase: 14.4, nonInterestBase: 11.1, nimBase: 2.20, provisionBase: 1.5, nplBase: 0.52,
    ficcBase: 3.2, equitiesBase: 1.8, advisoryBase: 0.5, equityUwBase: 0.4, debtUwBase: 0.8,
    cet1Base: 11.8, tceBase: 6.9, roeBase: 12.5, efficiencyBase: 60.0,
    totalAssetsBase: 3.18, totalLoansBase: 1050, totalDepositsBase: 1920, reported: true,
  },
  {
    ticker: 'C', name: 'Citigroup', revenueBase: 20.3, netIncomeBase: 3.6, epsBase: 1.86,
    niiBase: 13.5, nonInterestBase: 6.8, nimBase: 2.48, provisionBase: 2.0, nplBase: 0.68,
    ficcBase: 3.6, equitiesBase: 1.4, advisoryBase: 0.4, equityUwBase: 0.3, debtUwBase: 0.6,
    cet1Base: 13.4, tceBase: 6.2, roeBase: 7.1, efficiencyBase: 67.0,
    totalAssetsBase: 2.41, totalLoansBase: 680, totalDepositsBase: 1310, reported: true,
  },
  {
    ticker: 'WFC', name: 'Wells Fargo', revenueBase: 20.9, netIncomeBase: 4.9, epsBase: 1.38,
    niiBase: 12.2, nonInterestBase: 8.7, nimBase: 2.81, provisionBase: 1.3, nplBase: 0.55,
    ficcBase: 1.2, equitiesBase: 0.5, advisoryBase: 0.3, equityUwBase: 0.2, debtUwBase: 0.5,
    cet1Base: 11.1, tceBase: 7.4, roeBase: 11.6, efficiencyBase: 63.0,
    totalAssetsBase: 1.93, totalLoansBase: 940, totalDepositsBase: 1360, reported: true,
  },
  {
    ticker: 'GS', name: 'Goldman Sachs', revenueBase: 14.2, netIncomeBase: 3.9, epsBase: 11.58,
    niiBase: 1.8, nonInterestBase: 12.4, nimBase: 0.85, provisionBase: 0.6, nplBase: 0.35,
    ficcBase: 4.8, equitiesBase: 3.5, advisoryBase: 1.8, equityUwBase: 0.5, debtUwBase: 1.0,
    cet1Base: 14.8, tceBase: 7.8, roeBase: 14.6, efficiencyBase: 58.0,
    totalAssetsBase: 1.57, totalLoansBase: 185, totalDepositsBase: 430, reported: true,
  },
  {
    ticker: 'MS', name: 'Morgan Stanley', revenueBase: 14.5, netIncomeBase: 3.2, epsBase: 1.88,
    niiBase: 2.1, nonInterestBase: 12.4, nimBase: 0.92, provisionBase: 0.2, nplBase: 0.30,
    ficcBase: 2.5, equitiesBase: 3.0, advisoryBase: 1.2, equityUwBase: 0.4, debtUwBase: 0.8,
    cet1Base: 15.2, tceBase: 7.5, roeBase: 13.2, efficiencyBase: 56.0,
    totalAssetsBase: 1.19, totalLoansBase: 225, totalDepositsBase: 360, reported: true,
  },
  {
    ticker: 'USB', name: 'U.S. Bancorp', revenueBase: 7.0, netIncomeBase: 1.6, epsBase: 1.03,
    niiBase: 4.1, nonInterestBase: 2.9, nimBase: 2.72, provisionBase: 0.6, nplBase: 0.48,
    ficcBase: 0.0, equitiesBase: 0.0, advisoryBase: 0.1, equityUwBase: 0.0, debtUwBase: 0.1,
    cet1Base: 10.0, tceBase: 5.8, roeBase: 13.8, efficiencyBase: 62.0,
    totalAssetsBase: 0.67, totalLoansBase: 375, totalDepositsBase: 510, reported: true,
  },
  {
    ticker: 'PNC', name: 'PNC Financial', revenueBase: 5.6, netIncomeBase: 1.5, epsBase: 3.74,
    niiBase: 3.5, nonInterestBase: 2.1, nimBase: 2.67, provisionBase: 0.3, nplBase: 0.50,
    ficcBase: 0.0, equitiesBase: 0.0, advisoryBase: 0.1, equityUwBase: 0.0, debtUwBase: 0.1,
    cet1Base: 10.4, tceBase: 7.2, roeBase: 14.1, efficiencyBase: 58.0,
    totalAssetsBase: 0.56, totalLoansBase: 320, totalDepositsBase: 425, reported: false,
  },
  {
    ticker: 'TFC', name: 'Truist Financial', revenueBase: 5.1, netIncomeBase: 1.2, epsBase: 0.91,
    niiBase: 3.4, nonInterestBase: 1.7, nimBase: 2.95, provisionBase: 0.5, nplBase: 0.53,
    ficcBase: 0.0, equitiesBase: 0.0, advisoryBase: 0.1, equityUwBase: 0.0, debtUwBase: 0.0,
    cet1Base: 10.1, tceBase: 6.5, roeBase: 9.8, efficiencyBase: 61.0,
    totalAssetsBase: 0.53, totalLoansBase: 310, totalDepositsBase: 395, reported: false,
  },
  {
    ticker: 'SCHW', name: 'Charles Schwab', revenueBase: 4.7, netIncomeBase: 1.5, epsBase: 0.84,
    niiBase: 2.3, nonInterestBase: 2.4, nimBase: 1.96, provisionBase: 0.04, nplBase: 0.10,
    ficcBase: 0.0, equitiesBase: 0.0, advisoryBase: 0.0, equityUwBase: 0.0, debtUwBase: 0.0,
    cet1Base: 27.2, tceBase: 5.5, roeBase: 16.0, efficiencyBase: 58.0,
    totalAssetsBase: 0.47, totalLoansBase: 78, totalDepositsBase: 280, reported: false,
  },
  {
    ticker: 'BK', name: 'Bank of New York Mellon', revenueBase: 4.6, netIncomeBase: 1.2, epsBase: 1.56,
    niiBase: 1.0, nonInterestBase: 3.6, nimBase: 1.18, provisionBase: 0.03, nplBase: 0.12,
    ficcBase: 0.2, equitiesBase: 0.1, advisoryBase: 0.0, equityUwBase: 0.0, debtUwBase: 0.0,
    cet1Base: 11.6, tceBase: 6.0, roeBase: 12.4, efficiencyBase: 66.0,
    totalAssetsBase: 0.41, totalLoansBase: 68, totalDepositsBase: 290, reported: false,
  },
  {
    ticker: 'STT', name: 'State Street', revenueBase: 3.1, netIncomeBase: 0.6, epsBase: 2.18,
    niiBase: 0.7, nonInterestBase: 2.4, nimBase: 1.25, provisionBase: 0.02, nplBase: 0.08,
    ficcBase: 0.3, equitiesBase: 0.1, advisoryBase: 0.0, equityUwBase: 0.0, debtUwBase: 0.0,
    cet1Base: 11.8, tceBase: 5.4, roeBase: 10.8, efficiencyBase: 70.0,
    totalAssetsBase: 0.30, totalLoansBase: 42, totalDepositsBase: 230, reported: false,
  },
];

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function pickDate(rng: () => number, year: number, month: number, dayMin: number, dayMax: number): string {
  const day = dayMin + Math.floor(rng() * (dayMax - dayMin + 1));
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function currentQuarterLabel(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  // Earnings reported in Q1 are for Q4 of prior year, etc.
  if (m <= 3) return `Q4 ${y - 1}`;
  if (m <= 6) return `Q1 ${y}`;
  if (m <= 9) return `Q2 ${y}`;
  return `Q3 ${y}`;
}

function priorQuarters(current: string, count: number): string[] {
  const parts = current.split(' ');
  let q = parseInt(parts[0].replace('Q', ''), 10);
  let y = parseInt(parts[1], 10);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    q -= 1;
    if (q < 1) { q = 4; y -= 1; }
    result.push(`Q${q} ${y}`);
  }
  return result.reverse();
}

// ── Generator ──

function generate(): BankEarningsResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('bank-earnings-' + day));
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = currentQuarterLabel();

  // Determine earnings reporting month range based on current quarter
  let reportMonth: number;
  if (month <= 3) reportMonth = 1;       // Q4 earnings reported in Jan
  else if (month <= 6) reportMonth = 4;  // Q1 earnings reported in Apr
  else if (month <= 9) reportMonth = 7;  // Q2 earnings reported in Jul
  else reportMonth = 10;                 // Q3 earnings reported in Oct

  // Generate each bank's earnings
  const banks: BankEarnings[] = BANK_SEEDS.map((seed) => {
    const reported = seed.reported;
    const reportDate = pickDate(rng, year, reportMonth, 10, 22);

    // Revenue with realistic jitter (+/- 5%)
    const revActual = roundTo(jitter(rng, seed.revenueBase, 0.05), 2);
    const revEstimate = roundTo(jitter(rng, seed.revenueBase, 0.02), 2);
    const revYoy = roundTo((rng() - 0.3) * 20, 1); // -7% to +11% typical

    // Net income
    const niActual = roundTo(jitter(rng, seed.netIncomeBase, 0.08), 2);
    const niEstimate = roundTo(jitter(rng, seed.netIncomeBase, 0.03), 2);
    const niYoy = roundTo((rng() - 0.35) * 30, 1);

    // EPS
    const epsActual = roundTo(jitter(rng, seed.epsBase, 0.08), 2);
    const epsEstimate = roundTo(jitter(rng, seed.epsBase, 0.03), 2);
    const beat = epsActual >= epsEstimate;
    const surprisePct = epsEstimate !== 0 ? roundTo(((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100, 2) : 0;

    // NII & non-interest income
    const nii = roundTo(jitter(rng, seed.niiBase, 0.04), 2);
    const nonInterestIncome = roundTo(jitter(rng, seed.nonInterestBase, 0.05), 2);

    // NIM
    const nimCurrent = roundTo(jitter(rng, seed.nimBase, 0.04), 2);
    const nimPrior = roundTo(jitter(rng, seed.nimBase, 0.03), 2);
    const nimChange = roundTo(nimCurrent - nimPrior, 2);

    // Credit quality
    const provision = roundTo(jitter(rng, seed.provisionBase, 0.15), 2);
    const nplRatio = roundTo(jitter(rng, seed.nplBase, 0.10), 2);

    // Trading revenue (zero for non-trading banks)
    const ficc = seed.ficcBase > 0 ? roundTo(jitter(rng, seed.ficcBase, 0.10), 2) : 0;
    const equities = seed.equitiesBase > 0 ? roundTo(jitter(rng, seed.equitiesBase, 0.10), 2) : 0;
    const tradingTotal = roundTo(ficc + equities, 2);

    // Advisory & underwriting
    const advisory = seed.advisoryBase > 0 ? roundTo(jitter(rng, seed.advisoryBase, 0.15), 2) : 0;
    const equityUw = seed.equityUwBase > 0 ? roundTo(jitter(rng, seed.equityUwBase, 0.15), 2) : 0;
    const debtUw = seed.debtUwBase > 0 ? roundTo(jitter(rng, seed.debtUwBase, 0.12), 2) : 0;
    const ibTotal = roundTo(advisory + equityUw + debtUw, 2);

    // Capital ratios
    const cet1 = roundTo(jitter(rng, seed.cet1Base, 0.02), 1);
    const tce = roundTo(jitter(rng, seed.tceBase, 0.03), 1);
    const roe = roundTo(jitter(rng, seed.roeBase, 0.06), 1);
    const efficiency = roundTo(jitter(rng, seed.efficiencyBase, 0.03), 1);

    // Balance sheet
    const totalAssets = roundTo(jitter(rng, seed.totalAssetsBase, 0.02), 2);
    const totalLoans = roundTo(jitter(rng, seed.totalLoansBase, 0.03), 1);
    const totalDeposits = roundTo(jitter(rng, seed.totalDepositsBase, 0.03), 1);

    // Stock reaction on earnings day (-5% to +8% range, biased slightly positive for beats)
    const reactionBase = beat ? 1.2 : -1.5;
    const stockReaction = roundTo(reactionBase + (rng() - 0.5) * 8, 2);

    return {
      ticker: seed.ticker,
      name: seed.name,
      reportDate,
      quarter,
      reported,
      revenue: { actual: revActual, estimate: revEstimate, yoyChange: revYoy },
      netIncome: { actual: niActual, estimate: niEstimate, yoyChange: niYoy },
      eps: { actual: epsActual, estimate: epsEstimate, beat, surprisePct },
      nii,
      nonInterestIncome,
      nim: { current: nimCurrent, priorQuarter: nimPrior, change: nimChange },
      provisionForCreditLosses: provision,
      nplRatio,
      tradingRevenue: { total: tradingTotal, ficc, equities },
      advisoryUnderwriting: { advisory, equityUnderwriting: equityUw, debtUnderwriting: debtUw, total: ibTotal },
      cet1Ratio: cet1,
      tceRatio: tce,
      roe,
      efficiencyRatio: efficiency,
      totalAssets,
      totalLoans,
      totalDeposits,
      stockReaction,
    };
  });

  // ── Aggregate Metrics ──

  const reportedBanks = banks.filter((b) => b.reported);
  const n = reportedBanks.length || 1;

  const avgRevenue = roundTo(reportedBanks.reduce((s, b) => s + b.revenue.actual, 0) / n, 2);
  const avgEps = roundTo(reportedBanks.reduce((s, b) => s + b.eps.actual, 0) / n, 2);
  const avgNim = roundTo(reportedBanks.reduce((s, b) => s + b.nim.current, 0) / n, 2);
  const avgCet1 = roundTo(reportedBanks.reduce((s, b) => s + b.cet1Ratio, 0) / n, 1);
  const avgRoe = roundTo(reportedBanks.reduce((s, b) => s + b.roe, 0) / n, 1);
  const avgEfficiency = roundTo(reportedBanks.reduce((s, b) => s + b.efficiencyRatio, 0) / n, 1);
  const avgNpl = roundTo(reportedBanks.reduce((s, b) => s + b.nplRatio, 0) / n, 2);
  const totalTrading = roundTo(reportedBanks.reduce((s, b) => s + b.tradingRevenue.total, 0), 2);
  const beatCount = reportedBanks.filter((b) => b.eps.beat).length;
  const beatRate = roundTo((beatCount / n) * 100, 1);

  // Best performer by stock reaction
  const sortedByReaction = [...reportedBanks].sort((a, b) => b.stockReaction - a.stockReaction);
  const best = sortedByReaction[0];
  const worst = sortedByReaction[sortedByReaction.length - 1];

  const aggregate: AggregateMetrics = {
    avgRevenue,
    avgEps,
    avgNim,
    avgCet1,
    avgRoe,
    avgEfficiencyRatio: avgEfficiency,
    avgNplRatio: avgNpl,
    totalTradingRevenue: totalTrading,
    beatRate,
    bestPerformer: {
      ticker: best?.ticker ?? 'N/A',
      metric: 'stockReaction',
      value: best?.stockReaction ?? 0,
    },
    worstPerformer: {
      ticker: worst?.ticker ?? 'N/A',
      metric: 'stockReaction',
      value: worst?.stockReaction ?? 0,
    },
  };

  // ── Trends (last 4 quarters) ──

  const priorQs = priorQuarters(quarter, 3);
  const allQuarters = [...priorQs, quarter];

  const nimTrend: QuarterlyTrend[] = allQuarters.map((q) => ({
    quarter: q,
    value: roundTo(jitter(rng, 2.35, 0.08), 2),
  }));

  const provisionTrend: QuarterlyTrend[] = allQuarters.map((q) => ({
    quarter: q,
    value: roundTo(jitter(rng, 9.5, 0.12), 1), // sector total provisions $B
  }));

  const tradingRevenueTrend: QuarterlyTrend[] = allQuarters.map((q) => ({
    quarter: q,
    value: roundTo(jitter(rng, 28.0, 0.10), 1), // sector total trading $B
  }));

  const trends: Trends = { nimTrend, provisionTrend, tradingRevenueTrend };

  // ── Upcoming Earnings ──

  const upcoming: UpcomingEarnings[] = banks
    .filter((b) => !b.reported)
    .map((b) => {
      const seed = BANK_SEEDS.find((s) => s.ticker === b.ticker)!;
      const expectedDay = 15 + Math.floor(rng() * 10);
      const expectedDate = `${year}-${String(reportMonth).padStart(2, '0')}-${String(expectedDay).padStart(2, '0')}`;
      return {
        ticker: b.ticker,
        name: b.name,
        expectedDate,
        epsEstimate: roundTo(jitter(rng, seed.epsBase, 0.03), 2),
        revenueEstimate: roundTo(jitter(rng, seed.revenueBase, 0.02), 2),
      };
    });

  return {
    banks,
    aggregate,
    trends,
    upcoming,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[BankEarnings] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate bank earnings data' });
  }
});

export default router;
