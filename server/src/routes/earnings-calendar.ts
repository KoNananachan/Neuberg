import { Router } from 'express';

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Types ──

interface ThisWeekEntry {
  ticker: string;
  company: string;
  reportDate: string;
  timing: 'BMO' | 'AMC';
  epsEstimate: number;
  epsActual: number | null;
  epsSurprise: number | null;
  revEstimateB: number;
  revActualB: number | null;
  revSurprise: number | null;
  marketCap: string;
  sector: string;
}

interface RecentSurprise {
  ticker: string;
  epsEstimate: number;
  epsActual: number;
  surprisePercent: number;
  priceReaction: number;
  reactionDirection: 'up' | 'down';
}

interface RevisionTrend {
  ticker: string;
  currentEstimate: number;
  estimate30dAgo: number;
  revisionPercent: number;
  numUp: number;
  numDown: number;
  consensus: 'buy' | 'hold' | 'sell';
}

interface SectorSummaryEntry {
  sector: string;
  companiesReported: number;
  beatRate: number;
  avgSurprise: number;
  avgPriceReaction: number;
}

interface UpcomingHighlight {
  ticker: string;
  company: string;
  date: string;
  optionsImpliedMove: number;
  analystCount: number;
  epsEstimate: number;
}

interface EarningsCalendarResponse {
  thisWeek: ThisWeekEntry[];
  recentSurprises: RecentSurprise[];
  revisionTrends: RevisionTrend[];
  sectorSummary: SectorSummaryEntry[];
  upcomingHighlights: UpcomingHighlight[];
  timestamp: string;
}

// ── Cache ──

let cacheData: EarningsCalendarResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

// ── Company pool ──

const COMPANIES: Array<{
  ticker: string;
  company: string;
  sector: string;
  marketCap: string;
  epsRange: [number, number];
  revB: [number, number]; // revenue range in billions
  timing: 'BMO' | 'AMC';
}> = [
  { ticker: 'AAPL', company: 'Apple Inc.', sector: 'Tech', marketCap: '2.8T', epsRange: [2.10, 2.35], revB: [89.5, 97.2], timing: 'AMC' },
  { ticker: 'MSFT', company: 'Microsoft Corp.', sector: 'Tech', marketCap: '3.1T', epsRange: [3.10, 3.40], revB: [61.8, 67.5], timing: 'AMC' },
  { ticker: 'GOOGL', company: 'Alphabet Inc.', sector: 'Tech', marketCap: '2.1T', epsRange: [1.80, 2.10], revB: [84.7, 92.3], timing: 'AMC' },
  { ticker: 'AMZN', company: 'Amazon.com Inc.', sector: 'Tech', marketCap: '2.0T', epsRange: [1.10, 1.45], revB: [155.0, 172.0], timing: 'AMC' },
  { ticker: 'META', company: 'Meta Platforms Inc.', sector: 'Tech', marketCap: '1.5T', epsRange: [5.50, 6.80], revB: [39.5, 43.8], timing: 'AMC' },
  { ticker: 'NVDA', company: 'NVIDIA Corp.', sector: 'Tech', marketCap: '3.4T', epsRange: [0.80, 1.20], revB: [35.0, 44.5], timing: 'AMC' },
  { ticker: 'TSLA', company: 'Tesla Inc.', sector: 'Consumer', marketCap: '780B', epsRange: [0.55, 0.82], revB: [23.5, 27.2], timing: 'AMC' },
  { ticker: 'JPM', company: 'JPMorgan Chase & Co.', sector: 'Financials', marketCap: '680B', epsRange: [4.20, 4.95], revB: [40.1, 45.6], timing: 'BMO' },
  { ticker: 'BAC', company: 'Bank of America Corp.', sector: 'Financials', marketCap: '340B', epsRange: [0.80, 0.98], revB: [24.5, 27.1], timing: 'BMO' },
  { ticker: 'JNJ', company: 'Johnson & Johnson', sector: 'Healthcare', marketCap: '380B', epsRange: [2.55, 2.78], revB: [21.2, 23.4], timing: 'BMO' },
  { ticker: 'UNH', company: 'UnitedHealth Group Inc.', sector: 'Healthcare', marketCap: '540B', epsRange: [6.70, 7.25], revB: [95.8, 104.2], timing: 'BMO' },
  { ticker: 'PG', company: 'Procter & Gamble Co.', sector: 'Consumer', marketCap: '390B', epsRange: [1.72, 1.92], revB: [20.5, 22.3], timing: 'BMO' },
  { ticker: 'V', company: 'Visa Inc.', sector: 'Financials', marketCap: '620B', epsRange: [2.45, 2.72], revB: [9.0, 10.1], timing: 'AMC' },
  { ticker: 'MA', company: 'Mastercard Inc.', sector: 'Financials', marketCap: '480B', epsRange: [3.40, 3.78], revB: [6.8, 7.6], timing: 'BMO' },
  { ticker: 'HD', company: 'The Home Depot Inc.', sector: 'Consumer', marketCap: '370B', epsRange: [3.60, 3.95], revB: [37.8, 41.2], timing: 'BMO' },
  { ticker: 'XOM', company: 'Exxon Mobil Corp.', sector: 'Energy', marketCap: '490B', epsRange: [1.85, 2.25], revB: [82.5, 93.4], timing: 'BMO' },
  { ticker: 'CVX', company: 'Chevron Corp.', sector: 'Energy', marketCap: '310B', epsRange: [2.90, 3.45], revB: [48.2, 56.1], timing: 'BMO' },
  { ticker: 'LLY', company: 'Eli Lilly and Co.', sector: 'Healthcare', marketCap: '710B', epsRange: [3.55, 4.10], revB: [10.2, 12.5], timing: 'BMO' },
  { ticker: 'AVGO', company: 'Broadcom Inc.', sector: 'Tech', marketCap: '820B', epsRange: [1.30, 1.55], revB: [13.8, 15.9], timing: 'AMC' },
  { ticker: 'COST', company: 'Costco Wholesale Corp.', sector: 'Consumer', marketCap: '410B', epsRange: [3.75, 4.15], revB: [58.2, 64.1], timing: 'AMC' },
  { ticker: 'NFLX', company: 'Netflix Inc.', sector: 'Tech', marketCap: '420B', epsRange: [5.20, 6.10], revB: [9.5, 10.8], timing: 'AMC' },
  { ticker: 'CRM', company: 'Salesforce Inc.', sector: 'Tech', marketCap: '280B', epsRange: [2.35, 2.68], revB: [9.0, 9.8], timing: 'AMC' },
  { ticker: 'WMT', company: 'Walmart Inc.', sector: 'Consumer', marketCap: '630B', epsRange: [0.58, 0.68], revB: [160.5, 170.8], timing: 'BMO' },
  { ticker: 'PFE', company: 'Pfizer Inc.', sector: 'Healthcare', marketCap: '150B', epsRange: [0.48, 0.68], revB: [13.8, 15.9], timing: 'BMO' },
  { ticker: 'CAT', company: 'Caterpillar Inc.', sector: 'Industrials', marketCap: '190B', epsRange: [5.10, 5.85], revB: [16.2, 18.1], timing: 'BMO' },
  { ticker: 'GE', company: 'GE Aerospace', sector: 'Industrials', marketCap: '210B', epsRange: [1.05, 1.28], revB: [9.2, 10.4], timing: 'BMO' },
  { ticker: 'FCX', company: 'Freeport-McMoRan Inc.', sector: 'Materials', marketCap: '75B', epsRange: [0.35, 0.52], revB: [5.8, 7.1], timing: 'BMO' },
  { ticker: 'NEM', company: 'Newmont Corp.', sector: 'Materials', marketCap: '55B', epsRange: [0.72, 0.95], revB: [4.5, 5.3], timing: 'BMO' },
  { ticker: 'NEE', company: 'NextEra Energy Inc.', sector: 'Utilities', marketCap: '160B', epsRange: [0.85, 1.02], revB: [6.2, 7.4], timing: 'BMO' },
  { ticker: 'DUK', company: 'Duke Energy Corp.', sector: 'Utilities', marketCap: '90B', epsRange: [1.32, 1.55], revB: [7.0, 8.1], timing: 'BMO' },
];

// ── Helper functions ──

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lerp(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Data generation ──

function generateData(): EarningsCalendarResponse {
  const today = new Date();
  const seed = hashSeed('earnings-calendar-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);

  // Week dates (Mon-Fri)
  const monday = getMonday(today);
  const weekDates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    weekDates.push(formatDate(d));
  }

  const todayStr = formatDate(today);

  // ── thisWeek: 15-20 companies ──
  const weekCount = 15 + Math.floor(rng() * 6);
  const shuffled = [...COMPANIES].sort(() => rng() - 0.5);
  const weekCompanies = shuffled.slice(0, weekCount);

  const thisWeek: ThisWeekEntry[] = weekCompanies.map(co => {
    const reportDate = pick(rng, weekDates);
    const isPast = reportDate < todayStr;
    const isToday = reportDate === todayStr;
    const reported = isPast || (isToday && rng() > 0.4);

    const epsEstimate = round2(lerp(rng, co.epsRange[0], co.epsRange[1]));
    const revEstimateB = round2(lerp(rng, co.revB[0], co.revB[1]));

    let epsActual: number | null = null;
    let epsSurprise: number | null = null;
    let revActualB: number | null = null;
    let revSurprise: number | null = null;

    if (reported) {
      // ~70% beat EPS
      const beatEps = rng() < 0.70;
      if (beatEps) {
        epsActual = round2(epsEstimate * (1 + rng() * 0.08));
      } else {
        epsActual = round2(epsEstimate * (1 - rng() * 0.06));
      }
      epsSurprise = round1(((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100);

      // ~65% beat revenue
      const beatRev = rng() < 0.65;
      if (beatRev) {
        revActualB = round2(revEstimateB * (1 + rng() * 0.04));
      } else {
        revActualB = round2(revEstimateB * (1 - rng() * 0.03));
      }
      revSurprise = round1(((revActualB - revEstimateB) / revEstimateB) * 100);
    }

    return {
      ticker: co.ticker,
      company: co.company,
      reportDate,
      timing: co.timing,
      epsEstimate,
      epsActual,
      epsSurprise,
      revEstimateB,
      revActualB,
      revSurprise,
      marketCap: co.marketCap,
      sector: co.sector,
    };
  });

  // Sort by date, then timing (BMO first), then ticker
  thisWeek.sort((a, b) => {
    const dateCmp = a.reportDate.localeCompare(b.reportDate);
    if (dateCmp !== 0) return dateCmp;
    if (a.timing !== b.timing) return a.timing === 'BMO' ? -1 : 1;
    return a.ticker.localeCompare(b.ticker);
  });

  // ── recentSurprises: last 10 reported ──
  const surprisePool = shuffled.slice(0, 15);
  const recentSurprises: RecentSurprise[] = surprisePool.slice(0, 10).map(co => {
    const epsEstimate = round2(lerp(rng, co.epsRange[0], co.epsRange[1]));
    const beat = rng() < 0.65;
    const epsActual = beat
      ? round2(epsEstimate * (1 + rng() * 0.10))
      : round2(epsEstimate * (1 - rng() * 0.08));
    const surprisePercent = round1(((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100);

    // Price reaction: correlated with surprise but noisy
    const baseReaction = surprisePercent * 0.5;
    const noise = (rng() - 0.5) * 4;
    const priceReaction = round1(baseReaction + noise);
    const reactionDirection: 'up' | 'down' = priceReaction >= 0 ? 'up' : 'down';

    return {
      ticker: co.ticker,
      epsEstimate,
      epsActual,
      surprisePercent,
      priceReaction: Math.abs(priceReaction),
      reactionDirection,
    };
  });

  // ── revisionTrends: 10 stocks with significant revisions ──
  const revisionPool = [...COMPANIES].sort(() => rng() - 0.5).slice(0, 10);
  const revisionTrends: RevisionTrend[] = revisionPool.map(co => {
    const currentEstimate = round2(lerp(rng, co.epsRange[0], co.epsRange[1]));
    // Revision: -15% to +15% over 30 days
    const revDirection = rng() < 0.55 ? 1 : -1;
    const revMagnitude = rng() * 0.15;
    const estimate30dAgo = round2(currentEstimate / (1 + revDirection * revMagnitude));
    const revisionPercent = round1(((currentEstimate - estimate30dAgo) / Math.abs(estimate30dAgo)) * 100);

    const totalAnalysts = 15 + Math.floor(rng() * 25);
    const numUp = revDirection > 0
      ? Math.floor(totalAnalysts * (0.4 + rng() * 0.4))
      : Math.floor(totalAnalysts * rng() * 0.3);
    const numDown = revDirection < 0
      ? Math.floor(totalAnalysts * (0.3 + rng() * 0.4))
      : Math.floor(totalAnalysts * rng() * 0.25);

    const consensusRoll = rng();
    const consensus: 'buy' | 'hold' | 'sell' = consensusRoll < 0.55 ? 'buy' : consensusRoll < 0.85 ? 'hold' : 'sell';

    return {
      ticker: co.ticker,
      currentEstimate,
      estimate30dAgo,
      revisionPercent,
      numUp,
      numDown,
      consensus,
    };
  });

  // Sort by absolute revision magnitude descending
  revisionTrends.sort((a, b) => Math.abs(b.revisionPercent) - Math.abs(a.revisionPercent));

  // ── sectorSummary ──
  const sectors = ['Tech', 'Healthcare', 'Financials', 'Consumer', 'Industrials', 'Energy', 'Materials', 'Utilities'];
  const sectorSummary: SectorSummaryEntry[] = sectors.map(sector => {
    const companiesReported = 8 + Math.floor(rng() * 35);
    const beatRate = round1(55 + rng() * 25); // 55-80%
    const avgSurprise = round1(-2 + rng() * 10); // -2% to +8%
    const avgPriceReaction = round1(-1.5 + rng() * 5); // -1.5% to +3.5%

    return {
      sector,
      companiesReported,
      beatRate,
      avgSurprise,
      avgPriceReaction,
    };
  });

  // ── upcomingHighlights: next 5 most-anticipated ──
  const upcomingPool = [...COMPANIES]
    .sort(() => rng() - 0.5)
    .slice(0, 5);

  // Dates in next 1-3 weeks
  const upcomingHighlights: UpcomingHighlight[] = upcomingPool.map(co => {
    const daysAhead = 7 + Math.floor(rng() * 14);
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    // Skip weekends
    const dow = d.getDay();
    if (dow === 0) d.setDate(d.getDate() + 1);
    if (dow === 6) d.setDate(d.getDate() + 2);

    const optionsImpliedMove = round1(3 + rng() * 9); // 3-12%
    const analystCount = 20 + Math.floor(rng() * 30);
    const epsEstimate = round2(lerp(rng, co.epsRange[0], co.epsRange[1]));

    return {
      ticker: co.ticker,
      company: co.company,
      date: formatDate(d),
      optionsImpliedMove,
      analystCount,
      epsEstimate,
    };
  });

  // Sort by date
  upcomingHighlights.sort((a, b) => a.date.localeCompare(b.date));

  return {
    thisWeek,
    recentSurprises,
    revisionTrends,
    sectorSummary,
    upcomingHighlights,
    timestamp: new Date().toISOString(),
  };
}

// ── Router ──

const router = Router();

router.get('/', (_req, res) => {
  try {
    if (cacheData && Date.now() - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generateData();
    cacheData = data;
    cacheTime = Date.now();
    res.json(data);
  } catch (err) {
    console.error('[EarningsCalendar] Error:', err instanceof Error ? err.message : err);
    // Stale fallback
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate earnings calendar data' });
  }
});

export default router;
