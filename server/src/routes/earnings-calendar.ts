import { Router } from 'express';

// ── Types ──

interface EarningsEvent {
  symbol: string;
  name: string;
  date: string;
  time: string; // BMO | AMC | DMH
  quarter: string;
  epsEstimate: number;
  epsActual: number | null;
  epsSurprise: number | null;
  revenueEstimate: number;
  revenueActual: number | null;
  revenueSurprise: number | null;
  expectedMove: number;
  avgHistoricalMove: number;
  lastQuarterSurprise: number;
  marketCap: number;
  sector: string;
  reported: boolean;
  surpriseHistory: number[];
  priceReaction: number | null;
}

interface EarningsCalendarResponse {
  events: EarningsEvent[];
  weekStart: string;
  weekEnd: string;
  totalThisWeek: number;
  timestamp: string;
}

// ── Cache ──

let cache: { data: EarningsCalendarResponse | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 15 * 60_000; // 15 minutes

// ── Deterministic pseudo-random from seed string ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Company definitions ──

const COMPANIES: Array<{
  symbol: string;
  name: string;
  sector: string;
  marketCap: number; // billions
  typicalExpectedMove: number; // %
  avgHistMove: number;
  time: 'BMO' | 'AMC' | 'DMH';
  epsBase: number;
  revBase: number; // millions
}> = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketCap: 3420, typicalExpectedMove: 3.8, avgHistMove: 3.2, time: 'AMC', epsBase: 2.18, revBase: 94680 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', marketCap: 3180, typicalExpectedMove: 3.5, avgHistMove: 3.0, time: 'AMC', epsBase: 3.32, revBase: 65585 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', marketCap: 2150, typicalExpectedMove: 5.2, avgHistMove: 4.8, time: 'AMC', epsBase: 2.12, revBase: 90234 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', marketCap: 2080, typicalExpectedMove: 5.8, avgHistMove: 5.1, time: 'AMC', epsBase: 1.43, revBase: 170000 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', marketCap: 3350, typicalExpectedMove: 8.5, avgHistMove: 7.2, time: 'AMC', epsBase: 0.89, revBase: 44000 },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', marketCap: 1580, typicalExpectedMove: 7.2, avgHistMove: 6.5, time: 'AMC', epsBase: 6.73, revBase: 42310 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', marketCap: 980, typicalExpectedMove: 9.5, avgHistMove: 8.8, time: 'AMC', epsBase: 0.72, revBase: 25500 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', marketCap: 1050, typicalExpectedMove: 2.1, avgHistMove: 1.8, time: 'BMO', epsBase: 6.42, revBase: 93650 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', marketCap: 680, typicalExpectedMove: 3.2, avgHistMove: 2.8, time: 'BMO', epsBase: 4.81, revBase: 43320 },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', marketCap: 620, typicalExpectedMove: 2.8, avgHistMove: 2.3, time: 'AMC', epsBase: 2.65, revBase: 9620 },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', marketCap: 540, typicalExpectedMove: 3.5, avgHistMove: 3.0, time: 'BMO', epsBase: 7.12, revBase: 100800 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketCap: 380, typicalExpectedMove: 2.2, avgHistMove: 1.9, time: 'BMO', epsBase: 2.71, revBase: 22300 },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', marketCap: 630, typicalExpectedMove: 3.1, avgHistMove: 2.6, time: 'BMO', epsBase: 0.65, revBase: 167800 },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', marketCap: 390, typicalExpectedMove: 2.0, avgHistMove: 1.7, time: 'BMO', epsBase: 1.84, revBase: 21740 },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financials', marketCap: 480, typicalExpectedMove: 2.9, avgHistMove: 2.5, time: 'BMO', epsBase: 3.69, revBase: 7370 },
  { symbol: 'HD', name: 'The Home Depot', sector: 'Consumer Discretionary', marketCap: 370, typicalExpectedMove: 3.4, avgHistMove: 2.9, time: 'BMO', epsBase: 3.82, revBase: 39700 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', marketCap: 820, typicalExpectedMove: 6.8, avgHistMove: 5.9, time: 'AMC', epsBase: 1.42, revBase: 14890 },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', marketCap: 490, typicalExpectedMove: 2.5, avgHistMove: 2.1, time: 'BMO', epsBase: 2.14, revBase: 87240 },
  { symbol: 'LLY', name: 'Eli Lilly and Co.', sector: 'Healthcare', marketCap: 710, typicalExpectedMove: 5.0, avgHistMove: 4.3, time: 'BMO', epsBase: 3.92, revBase: 11340 },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', marketCap: 410, typicalExpectedMove: 3.0, avgHistMove: 2.5, time: 'AMC', epsBase: 4.02, revBase: 62150 },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', marketCap: 420, typicalExpectedMove: 8.2, avgHistMove: 7.5, time: 'AMC', epsBase: 5.81, revBase: 10250 },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', marketCap: 220, typicalExpectedMove: 5.5, avgHistMove: 4.8, time: 'AMC', epsBase: 4.65, revBase: 5710 },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', marketCap: 280, typicalExpectedMove: 6.0, avgHistMove: 5.2, time: 'AMC', epsBase: 2.56, revBase: 9440 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', marketCap: 260, typicalExpectedMove: 7.8, avgHistMove: 6.9, time: 'AMC', epsBase: 0.77, revBase: 7120 },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Financials', marketCap: 340, typicalExpectedMove: 3.0, avgHistMove: 2.6, time: 'BMO', epsBase: 0.94, revBase: 25820 },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', marketCap: 150, typicalExpectedMove: 3.2, avgHistMove: 2.8, time: 'BMO', epsBase: 0.63, revBase: 14920 },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communication Services', marketCap: 210, typicalExpectedMove: 4.5, avgHistMove: 3.9, time: 'BMO', epsBase: 1.45, revBase: 22580 },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', marketCap: 110, typicalExpectedMove: 6.5, avgHistMove: 5.8, time: 'AMC', epsBase: 0.13, revBase: 12830 },
  { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples', marketCap: 310, typicalExpectedMove: 1.8, avgHistMove: 1.5, time: 'BMO', epsBase: 0.77, revBase: 11950 },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer Discretionary', marketCap: 120, typicalExpectedMove: 5.5, avgHistMove: 4.8, time: 'AMC', epsBase: 0.78, revBase: 12630 },
];

// ── Data generation ──

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateEvents(): EarningsCalendarResponse {
  const now = new Date();
  const monday = getMonday(now);
  const weekStart = toISO(monday);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const weekEnd = toISO(friday);

  // Generate dates spanning 2 weeks (Mon-Fri)
  const allDates: string[] = [];
  for (let w = 0; w < 2; w++) {
    for (let d = 0; d < 5; d++) {
      const dt = new Date(monday);
      dt.setDate(dt.getDate() + w * 7 + d);
      allDates.push(toISO(dt));
    }
  }

  const todayStr = toISO(now);
  const rng = seededRandom(hashSeed(weekStart));

  const events: EarningsEvent[] = COMPANIES.map((co, idx) => {
    // Assign each company to a date deterministically
    const dateIdx = idx % allDates.length;
    const date = allDates[dateIdx];
    const isPast = date < todayStr;
    const isToday = date === todayStr;
    const reported = isPast || (isToday && rng() > 0.5);

    // Quarter label
    const reportDate = new Date(date);
    const month = reportDate.getMonth() + 1;
    const year = reportDate.getFullYear();
    let q: string;
    if (month <= 3) q = 'Q4';
    else if (month <= 6) q = 'Q1';
    else if (month <= 9) q = 'Q2';
    else q = 'Q3';
    const fy = month <= 3 ? year - 1 : year;
    const quarter = `${q} ${fy}`;

    // Expected move: slight variation from typical
    const expectedMove = +(co.typicalExpectedMove * (0.85 + rng() * 0.3)).toFixed(1);

    // Surprise history: 8 quarters of surprise %
    const surpriseHistory: number[] = [];
    for (let i = 0; i < 8; i++) {
      const surprise = +(rng() * 16 - 4).toFixed(1); // -4% to +12%
      surpriseHistory.push(surprise);
    }
    const lastQuarterSurprise = surpriseHistory[0];

    // Revenue estimate
    const revenueEstimate = Math.round(co.revBase * (0.95 + rng() * 0.1));

    // EPS estimate
    const epsEstimate = +(co.epsBase * (0.95 + rng() * 0.1)).toFixed(2);

    // If reported, generate actual values
    let epsActual: number | null = null;
    let epsSurprise: number | null = null;
    let revenueActual: number | null = null;
    let revenueSurprise: number | null = null;
    let priceReaction: number | null = null;

    if (reported) {
      // EPS actual: mostly beats (70% of time)
      const beatFactor = rng() > 0.3 ? (1 + rng() * 0.08) : (1 - rng() * 0.06);
      epsActual = +(epsEstimate * beatFactor).toFixed(2);
      epsSurprise = +((epsActual - epsEstimate) / Math.abs(epsEstimate) * 100).toFixed(1);

      // Revenue actual
      const revBeatFactor = rng() > 0.35 ? (1 + rng() * 0.04) : (1 - rng() * 0.03);
      revenueActual = Math.round(revenueEstimate * revBeatFactor);
      revenueSurprise = +((revenueActual - revenueEstimate) / revenueEstimate * 100).toFixed(1);

      // Price reaction: correlated with EPS surprise but with noise
      const baseReaction = epsSurprise * 0.4;
      const noise = (rng() - 0.5) * co.avgHistMove;
      priceReaction = +(baseReaction + noise).toFixed(1);
    }

    return {
      symbol: co.symbol,
      name: co.name,
      date,
      time: co.time,
      quarter,
      epsEstimate,
      epsActual,
      epsSurprise,
      revenueEstimate,
      revenueActual,
      revenueSurprise,
      expectedMove,
      avgHistoricalMove: co.avgHistMove,
      lastQuarterSurprise,
      marketCap: co.marketCap,
      sector: co.sector,
      reported,
      surpriseHistory,
      priceReaction,
    };
  });

  // Sort by date, then time (BMO before AMC), then market cap
  events.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const timeOrder = { BMO: 0, DMH: 1, AMC: 2 };
    const timeCmp = (timeOrder[a.time as keyof typeof timeOrder] ?? 1) - (timeOrder[b.time as keyof typeof timeOrder] ?? 1);
    if (timeCmp !== 0) return timeCmp;
    return b.marketCap - a.marketCap;
  });

  const thisWeekEvents = events.filter(e => e.date >= weekStart && e.date <= weekEnd);

  return {
    events,
    weekStart,
    weekEnd,
    totalThisWeek: thisWeekEvents.length,
    timestamp: new Date().toISOString(),
  };
}

// ── Router ──

const router = Router();

router.get('/', (_req, res) => {
  try {
    // Check cache
    if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }

    const data = generateEvents();
    cache = { data, ts: Date.now() };
    res.json(data);
  } catch (err) {
    console.error('[EarningsCalendar] Error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch earnings calendar data' });
  }
});

export default router;
