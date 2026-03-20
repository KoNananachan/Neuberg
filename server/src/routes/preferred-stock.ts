import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; return h >>> 0; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Interfaces ──────────────────────────────────────────────────────────────

interface PreferredSecurity {
  issuer: string;
  series: string;
  ticker: string;
  price: number;
  parValue: number;
  couponRate: number;
  currentYield: number;
  yieldToCall: number;
  callDate: string;
  callPrice: number;
  rating: string;
  sector: string;
  fixedOrFloating: 'Fixed' | 'Floating' | 'Fixed-to-Floating';
  qualified: boolean;
  cumulative: boolean;
}

interface SectorSummary {
  sector: string;
  count: number;
  avgYield: number;
  avgPrice: number;
}

interface RatingBucket {
  rating: string;
  count: number;
}

interface NewIssue {
  issuer: string;
  coupon: number;
  sizeMillions: number;
  date: string;
  bookRunner: string;
}

interface CallScheduleItem {
  issuer: string;
  series: string;
  ticker: string;
  callDate: string;
  callPrice: number;
  currentPrice: number;
  couponRate: number;
}

interface PreferredStockData {
  securities: PreferredSecurity[];
  sectors: SectorSummary[];
  ratingDistribution: RatingBucket[];
  newIssues: NewIssue[];
  callSchedule: CallScheduleItem[];
  generatedAt: string;
}

// ── Static Data ─────────────────────────────────────────────────────────────

const PFD_DEFS: {
  issuer: string;
  series: string;
  ticker: string;
  couponBase: number;
  priceBase: number;
  parValue: number;
  callYear: number;
  callMonth: number;
  rating: string;
  sector: string;
  fixedOrFloating: 'Fixed' | 'Floating' | 'Fixed-to-Floating';
  qualified: boolean;
  cumulative: boolean;
}[] = [
  // Financials
  { issuer: 'JPMorgan Chase', series: 'Series DD', ticker: 'JPM-PD', couponBase: 5.75, priceBase: 25.30, parValue: 25, callYear: 2027, callMonth: 3, rating: 'Baa1', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'JPMorgan Chase', series: 'Series EE', ticker: 'JPM-PE', couponBase: 6.00, priceBase: 25.80, parValue: 25, callYear: 2028, callMonth: 6, rating: 'Baa1', sector: 'Financials', fixedOrFloating: 'Fixed-to-Floating', qualified: true, cumulative: false },
  { issuer: 'Bank of America', series: 'Series GG', ticker: 'BAC-PG', couponBase: 6.10, priceBase: 25.50, parValue: 25, callYear: 2027, callMonth: 9, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'Bank of America', series: 'Series HH', ticker: 'BAC-PH', couponBase: 5.875, priceBase: 24.90, parValue: 25, callYear: 2026, callMonth: 9, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed-to-Floating', qualified: true, cumulative: false },
  { issuer: 'Wells Fargo', series: 'Series DD', ticker: 'WFC-PD', couponBase: 5.85, priceBase: 25.10, parValue: 25, callYear: 2027, callMonth: 12, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'Wells Fargo', series: 'Series Z', ticker: 'WFC-PZ', couponBase: 4.75, priceBase: 21.60, parValue: 25, callYear: 2026, callMonth: 6, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed-to-Floating', qualified: true, cumulative: false },
  { issuer: 'Citigroup', series: 'Series K', ticker: 'C-PK', couponBase: 6.875, priceBase: 26.40, parValue: 25, callYear: 2027, callMonth: 5, rating: 'Baa3', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'Goldman Sachs', series: 'Series A', ticker: 'GS-PA', couponBase: 5.50, priceBase: 24.70, parValue: 25, callYear: 2026, callMonth: 11, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'Goldman Sachs', series: 'Series D', ticker: 'GS-PD', couponBase: 4.95, priceBase: 22.80, parValue: 25, callYear: 2026, callMonth: 8, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Floating', qualified: true, cumulative: false },
  { issuer: 'Morgan Stanley', series: 'Series F', ticker: 'MS-PF', couponBase: 6.625, priceBase: 26.10, parValue: 25, callYear: 2027, callMonth: 7, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'Morgan Stanley', series: 'Series I', ticker: 'MS-PI', couponBase: 6.375, priceBase: 25.90, parValue: 25, callYear: 2028, callMonth: 3, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed-to-Floating', qualified: true, cumulative: false },
  { issuer: 'US Bancorp', series: 'Series B', ticker: 'USB-PB', couponBase: 5.15, priceBase: 23.50, parValue: 25, callYear: 2027, callMonth: 1, rating: 'Baa1', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'PNC Financial', series: 'Series P', ticker: 'PNC-PP', couponBase: 6.125, priceBase: 25.65, parValue: 25, callYear: 2028, callMonth: 5, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'Capital One', series: 'Series I', ticker: 'COF-PI', couponBase: 5.00, priceBase: 22.40, parValue: 25, callYear: 2026, callMonth: 10, rating: 'Baa3', sector: 'Financials', fixedOrFloating: 'Fixed', qualified: true, cumulative: false },
  { issuer: 'Truist Financial', series: 'Series R', ticker: 'TFC-PR', couponBase: 5.25, priceBase: 23.10, parValue: 25, callYear: 2027, callMonth: 6, rating: 'Baa2', sector: 'Financials', fixedOrFloating: 'Fixed-to-Floating', qualified: true, cumulative: false },

  // Utilities
  { issuer: 'Duke Energy', series: 'Series A', ticker: 'DUK-PA', couponBase: 5.75, priceBase: 25.20, parValue: 25, callYear: 2027, callMonth: 9, rating: 'Baa1', sector: 'Utilities', fixedOrFloating: 'Fixed', qualified: true, cumulative: true },
  { issuer: 'NextEra Energy', series: 'Series N', ticker: 'NEE-PN', couponBase: 6.219, priceBase: 25.95, parValue: 25, callYear: 2028, callMonth: 3, rating: 'Baa1', sector: 'Utilities', fixedOrFloating: 'Fixed', qualified: true, cumulative: true },
  { issuer: 'Southern Company', series: 'Series B', ticker: 'SO-PB', couponBase: 5.25, priceBase: 23.80, parValue: 25, callYear: 2027, callMonth: 4, rating: 'Baa2', sector: 'Utilities', fixedOrFloating: 'Fixed', qualified: true, cumulative: true },
  { issuer: 'Dominion Energy', series: 'Series C', ticker: 'D-PC', couponBase: 4.65, priceBase: 21.30, parValue: 25, callYear: 2026, callMonth: 7, rating: 'Baa2', sector: 'Utilities', fixedOrFloating: 'Fixed-to-Floating', qualified: true, cumulative: true },
  { issuer: 'Entergy Corp', series: 'Series A', ticker: 'ETR-PA', couponBase: 5.50, priceBase: 24.60, parValue: 25, callYear: 2027, callMonth: 12, rating: 'Baa3', sector: 'Utilities', fixedOrFloating: 'Fixed', qualified: true, cumulative: true },

  // REITs
  { issuer: 'Public Storage', series: 'Series S', ticker: 'PSA-PS', couponBase: 4.90, priceBase: 22.50, parValue: 25, callYear: 2027, callMonth: 1, rating: 'Baa1', sector: 'REITs', fixedOrFloating: 'Fixed', qualified: false, cumulative: true },
  { issuer: 'Public Storage', series: 'Series H', ticker: 'PSA-PH', couponBase: 5.60, priceBase: 25.00, parValue: 25, callYear: 2026, callMonth: 9, rating: 'Baa1', sector: 'REITs', fixedOrFloating: 'Fixed', qualified: false, cumulative: true },
  { issuer: 'Realty Income', series: 'Series A', ticker: 'O-PA', couponBase: 6.00, priceBase: 25.40, parValue: 25, callYear: 2028, callMonth: 6, rating: 'Baa1', sector: 'REITs', fixedOrFloating: 'Fixed', qualified: false, cumulative: true },
  { issuer: 'Digital Realty', series: 'Series L', ticker: 'DLR-PL', couponBase: 5.20, priceBase: 23.70, parValue: 25, callYear: 2026, callMonth: 12, rating: 'Baa2', sector: 'REITs', fixedOrFloating: 'Fixed', qualified: false, cumulative: true },
  { issuer: 'Simon Property', series: 'Series J', ticker: 'SPG-PJ', couponBase: 5.50, priceBase: 24.30, parValue: 25, callYear: 2027, callMonth: 8, rating: 'Baa1', sector: 'REITs', fixedOrFloating: 'Fixed', qualified: false, cumulative: true },

  // Energy
  { issuer: 'Energy Transfer', series: 'Series E', ticker: 'ET-PE', couponBase: 7.60, priceBase: 26.80, parValue: 25, callYear: 2028, callMonth: 5, rating: 'Ba1', sector: 'Energy', fixedOrFloating: 'Fixed-to-Floating', qualified: true, cumulative: true },
  { issuer: 'Enterprise Products', series: 'Series C', ticker: 'EPD-PC', couponBase: 7.00, priceBase: 26.20, parValue: 25, callYear: 2027, callMonth: 11, rating: 'Baa2', sector: 'Energy', fixedOrFloating: 'Fixed', qualified: true, cumulative: true },
  { issuer: 'Kinder Morgan', series: 'Series A', ticker: 'KMI-PA', couponBase: 6.50, priceBase: 25.70, parValue: 25, callYear: 2026, callMonth: 10, rating: 'Baa3', sector: 'Energy', fixedOrFloating: 'Fixed', qualified: true, cumulative: true },

  // Telecom
  { issuer: 'AT&T', series: 'Series A', ticker: 'T-PA', couponBase: 5.00, priceBase: 22.80, parValue: 25, callYear: 2027, callMonth: 3, rating: 'Baa3', sector: 'Telecom', fixedOrFloating: 'Fixed', qualified: true, cumulative: true },
  { issuer: 'AT&T', series: 'Series C', ticker: 'T-PC', couponBase: 4.75, priceBase: 21.50, parValue: 25, callYear: 2026, callMonth: 6, rating: 'Baa3', sector: 'Telecom', fixedOrFloating: 'Floating', qualified: true, cumulative: true },
];

const RATINGS = ['Baa1', 'Baa2', 'Baa3', 'Ba1'];

const BOOK_RUNNERS = [
  'Goldman Sachs', 'J.P. Morgan', 'Morgan Stanley', 'BofA Securities',
  'Barclays', 'Citi', 'Wells Fargo Securities', 'RBC Capital Markets',
];

const NEW_ISSUE_ISSUERS = [
  { issuer: 'KeyCorp', sector: 'Financials' },
  { issuer: 'Regions Financial', sector: 'Financials' },
  { issuer: 'M&T Bank', sector: 'Financials' },
  { issuer: 'Vornado Realty', sector: 'REITs' },
  { issuer: 'American Electric Power', sector: 'Utilities' },
  { issuer: 'Sempra Energy', sector: 'Utilities' },
  { issuer: 'MPLX LP', sector: 'Energy' },
  { issuer: 'Brookfield Infrastructure', sector: 'Utilities' },
];

// ── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: PreferredStockData; ts: number } | null = null;

// ── Generator ───────────────────────────────────────────────────────────────

function generate(): PreferredStockData {
  const rng = seededRandom('preferred-stock');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── Securities ──────────────────────────────────────────────────────────

  const securities: PreferredSecurity[] = PFD_DEFS.map(def => {
    // Price jitter: keep within $18-$28 range, most near $25
    const rawPrice = jitter(def.priceBase, 0.04);
    const price = Math.round(Math.max(18.0, Math.min(28.0, rawPrice)) * 100) / 100;

    // Coupon rate: jitter slightly, keep within 4.5-8.5%
    const couponRate = Math.round(Math.max(4.5, Math.min(8.5, jitter(def.couponBase, 0.03))) * 1000) / 1000;

    // Current yield = annual dividend / price
    const annualDividend = def.parValue * (couponRate / 100);
    const currentYield = Math.round((annualDividend / price) * 100 * 100) / 100;

    // Yield to call: accounts for capital gain/loss to call date
    const now = new Date();
    const callDate = new Date(def.callYear, def.callMonth - 1, 15);
    const yearsToCall = Math.max(0.25, (callDate.getTime() - now.getTime()) / (365.25 * 24 * 3600 * 1000));
    const callPrice = def.parValue; // typically par
    const capitalGainPerYear = (callPrice - price) / yearsToCall;
    const ytcRaw = ((annualDividend + capitalGainPerYear) / ((price + callPrice) / 2)) * 100;
    const yieldToCall = Math.round(Math.max(0.5, Math.min(15.0, ytcRaw)) * 100) / 100;

    const callDateStr = `${def.callYear}-${String(def.callMonth).padStart(2, '0')}-15`;

    return {
      issuer: def.issuer,
      series: def.series,
      ticker: def.ticker,
      price,
      parValue: def.parValue,
      couponRate,
      currentYield: Math.max(5.0, Math.min(9.0, currentYield)),
      yieldToCall,
      callDate: callDateStr,
      callPrice,
      rating: def.rating,
      sector: def.sector,
      fixedOrFloating: def.fixedOrFloating,
      qualified: def.qualified,
      cumulative: def.cumulative,
    };
  });

  // ── Sectors ─────────────────────────────────────────────────────────────

  const sectorNames = ['Financials', 'Utilities', 'REITs', 'Energy', 'Telecom'];
  const sectors: SectorSummary[] = sectorNames.map(sector => {
    const inSector = securities.filter(s => s.sector === sector);
    const count = inSector.length;
    const avgYield = count > 0
      ? Math.round(inSector.reduce((s, v) => s + v.currentYield, 0) / count * 100) / 100
      : 0;
    const avgPrice = count > 0
      ? Math.round(inSector.reduce((s, v) => s + v.price, 0) / count * 100) / 100
      : 0;
    return { sector, count, avgYield, avgPrice };
  });

  // ── Rating Distribution ─────────────────────────────────────────────────

  const ratingCounts = new Map<string, number>();
  for (const s of securities) {
    ratingCounts.set(s.rating, (ratingCounts.get(s.rating) || 0) + 1);
  }
  const ratingDistribution: RatingBucket[] = RATINGS
    .filter(r => ratingCounts.has(r))
    .map(r => ({ rating: r, count: ratingCounts.get(r)! }));

  // ── New Issues (last 30 days) ───────────────────────────────────────────

  const newIssues: NewIssue[] = [];
  const usedIdx = new Set<number>();
  const issueCount = 4 + Math.floor(rng() * 3); // 4-6 new issues
  for (let i = 0; i < issueCount && i < NEW_ISSUE_ISSUERS.length; i++) {
    let idx = Math.floor(rng() * NEW_ISSUE_ISSUERS.length);
    while (usedIdx.has(idx)) idx = (idx + 1) % NEW_ISSUE_ISSUERS.length;
    usedIdx.add(idx);

    const daysAgo = Math.floor(rng() * 30);
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

    // Coupon in realistic range for new preferreds
    const coupon = Math.round((5.5 + rng() * 2.5) * 8) / 8; // eighth increments

    // Size: $200M - $1.2B, rounded to $25M
    const sizeMillions = Math.round((200 + rng() * 1000) / 25) * 25;

    newIssues.push({
      issuer: NEW_ISSUE_ISSUERS[idx].issuer,
      coupon,
      sizeMillions,
      date,
      bookRunner: BOOK_RUNNERS[Math.floor(rng() * BOOK_RUNNERS.length)],
    });
  }

  // Sort new issues by date descending
  newIssues.sort((a, b) => b.date.localeCompare(a.date));

  // ── Call Schedule (next 90 days) ────────────────────────────────────────

  const now = new Date();
  const ninetyDaysOut = new Date(now.getTime() + 90 * 86400000);

  const callSchedule: CallScheduleItem[] = securities
    .filter(s => {
      const cd = new Date(s.callDate);
      return cd >= now && cd <= ninetyDaysOut;
    })
    .map(s => ({
      issuer: s.issuer,
      series: s.series,
      ticker: s.ticker,
      callDate: s.callDate,
      callPrice: s.callPrice,
      currentPrice: s.price,
      couponRate: s.couponRate,
    }))
    .sort((a, b) => a.callDate.localeCompare(b.callDate));

  return {
    securities,
    sectors,
    ratingDistribution,
    newIssues,
    callSchedule,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ───────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PreferredStock] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate preferred stock data' });
  }
});

export default router;
