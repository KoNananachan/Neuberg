import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Static configs ──

const COUNTRIES = [
  { id: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { id: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { id: 'UK', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { id: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY' },
  { id: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { id: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR' },
  { id: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
  { id: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
] as const;

interface SecurityDef {
  name: string;
  tenor: string;
  baseYield: number;
  baseAmount: number;
  bidToCoverRange: [number, number];
}

const SECURITIES: Record<string, SecurityDef[]> = {
  US: [
    { name: '2Y Note', tenor: '2Y', baseYield: 4.52, baseAmount: 42, bidToCoverRange: [2.3, 2.8] },
    { name: '5Y Note', tenor: '5Y', baseYield: 4.22, baseAmount: 44, bidToCoverRange: [2.3, 2.8] },
    { name: '7Y Note', tenor: '7Y', baseYield: 4.25, baseAmount: 40, bidToCoverRange: [2.4, 2.8] },
    { name: '10Y Bond', tenor: '10Y', baseYield: 4.28, baseAmount: 37, bidToCoverRange: [2.3, 2.7] },
    { name: '20Y Bond', tenor: '20Y', baseYield: 4.42, baseAmount: 16, bidToCoverRange: [2.1, 2.5] },
    { name: '30Y Bond', tenor: '30Y', baseYield: 4.48, baseAmount: 22, bidToCoverRange: [2.1, 2.5] },
    { name: '3M Bill', tenor: '3M', baseYield: 5.25, baseAmount: 60, bidToCoverRange: [2.5, 3.2] },
  ],
  DE: [
    { name: 'Schatz (2Y)', tenor: '2Y', baseYield: 2.85, baseAmount: 5, bidToCoverRange: [1.5, 2.2] },
    { name: 'Bobl (5Y)', tenor: '5Y', baseYield: 2.55, baseAmount: 4, bidToCoverRange: [1.4, 2.0] },
    { name: 'Bund (10Y)', tenor: '10Y', baseYield: 2.65, baseAmount: 4.5, bidToCoverRange: [1.3, 1.9] },
    { name: 'Bund (30Y)', tenor: '30Y', baseYield: 2.82, baseAmount: 2.5, bidToCoverRange: [1.2, 1.8] },
  ],
  UK: [
    { name: 'Gilt (5Y)', tenor: '5Y', baseYield: 4.10, baseAmount: 3.5, bidToCoverRange: [2.0, 2.8] },
    { name: 'Gilt (10Y)', tenor: '10Y', baseYield: 4.35, baseAmount: 3.75, bidToCoverRange: [2.1, 2.7] },
    { name: 'Gilt (30Y)', tenor: '30Y', baseYield: 4.72, baseAmount: 2.5, bidToCoverRange: [2.0, 2.6] },
  ],
  JP: [
    { name: 'JGB (2Y)', tenor: '2Y', baseYield: 0.08, baseAmount: 2.8, bidToCoverRange: [3.0, 4.5] },
    { name: 'JGB (5Y)', tenor: '5Y', baseYield: 0.38, baseAmount: 2.5, bidToCoverRange: [2.8, 4.0] },
    { name: 'JGB (10Y)', tenor: '10Y', baseYield: 0.88, baseAmount: 2.3, bidToCoverRange: [2.5, 3.8] },
    { name: 'JGB (30Y)', tenor: '30Y', baseYield: 1.88, baseAmount: 0.9, bidToCoverRange: [2.2, 3.5] },
  ],
  FR: [
    { name: 'OAT (5Y)', tenor: '5Y', baseYield: 2.75, baseAmount: 5, bidToCoverRange: [1.6, 2.4] },
    { name: 'OAT (10Y)', tenor: '10Y', baseYield: 3.08, baseAmount: 6, bidToCoverRange: [1.5, 2.3] },
    { name: 'OAT (30Y)', tenor: '30Y', baseYield: 3.52, baseAmount: 3, bidToCoverRange: [1.4, 2.1] },
  ],
  IT: [
    { name: 'BTP (5Y)', tenor: '5Y', baseYield: 3.35, baseAmount: 4, bidToCoverRange: [1.3, 1.9] },
    { name: 'BTP (10Y)', tenor: '10Y', baseYield: 3.78, baseAmount: 5.5, bidToCoverRange: [1.3, 1.8] },
    { name: 'BTP (30Y)', tenor: '30Y', baseYield: 4.22, baseAmount: 2.5, bidToCoverRange: [1.2, 1.7] },
  ],
  AU: [
    { name: 'ACGB (5Y)', tenor: '5Y', baseYield: 3.95, baseAmount: 1.5, bidToCoverRange: [2.2, 3.2] },
    { name: 'ACGB (10Y)', tenor: '10Y', baseYield: 4.18, baseAmount: 1.2, bidToCoverRange: [2.0, 3.0] },
    { name: 'ACGB (30Y)', tenor: '30Y', baseYield: 4.52, baseAmount: 0.6, bidToCoverRange: [1.8, 2.8] },
  ],
  CA: [
    { name: 'GoC (2Y)', tenor: '2Y', baseYield: 3.85, baseAmount: 5, bidToCoverRange: [2.2, 2.9] },
    { name: 'GoC (5Y)', tenor: '5Y', baseYield: 3.48, baseAmount: 5, bidToCoverRange: [2.1, 2.8] },
    { name: 'GoC (10Y)', tenor: '10Y', baseYield: 3.42, baseAmount: 4, bidToCoverRange: [2.0, 2.7] },
    { name: 'GoC (30Y)', tenor: '30Y', baseYield: 3.52, baseAmount: 3, bidToCoverRange: [2.0, 2.5] },
  ],
};

const US_ANALYTICS_TENORS = ['2Y', '5Y', '7Y', '10Y', '20Y', '30Y'] as const;
const AUCTION_STATUSES = ['strong', 'fair', 'weak'] as const;

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function maturityFromTenor(auctionDate: Date, tenor: string): string {
  const d = new Date(auctionDate);
  const match = tenor.match(/^(\d+)(Y|M)$/);
  if (!match) return formatDate(addDays(d, 365));
  const num = parseInt(match[1], 10);
  if (match[2] === 'Y') {
    d.setFullYear(d.getFullYear() + num);
  } else {
    d.setMonth(d.getMonth() + num);
  }
  return formatDate(d);
}

// ── Data generation ──

function generate() {
  const today = new Date();
  const day = today.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-bond-auction-calendar'));

  // ── Upcoming Auctions (next 12) ──

  const allUpcoming: any[] = [];
  for (const country of COUNTRIES) {
    const secs = SECURITIES[country.id];
    const numAuctions = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < numAuctions; i++) {
      const sec = secs[Math.floor(rng() * secs.length)];
      const daysAhead = 1 + Math.floor(rng() * 14);
      const auctionDate = addDays(today, daysAhead);

      const yieldNoise = (rng() - 0.5) * 0.15;
      const previousYield = roundTo(sec.baseYield + yieldNoise, 3);
      const expectedYield = roundTo(previousYield + (rng() - 0.5) * 0.08, 3);
      const whenIssued = roundTo(expectedYield + (rng() - 0.5) * 0.03, 3);

      const amountNoise = (rng() - 0.5) * sec.baseAmount * 0.15;
      const amount = roundTo(sec.baseAmount + amountNoise, 1);

      allUpcoming.push({
        date: formatDate(auctionDate),
        country: country.id,
        countryName: country.name,
        flag: country.flag,
        currency: country.currency,
        security: sec.name,
        tenor: sec.tenor,
        amount,
        previousYield,
        expectedYield,
        whenIssued,
        maturityDate: maturityFromTenor(auctionDate, sec.tenor),
      });
    }
  }
  allUpcoming.sort((a, b) => a.date.localeCompare(b.date));
  const upcomingAuctions = allUpcoming.slice(0, 12);

  // ── Recent Results (last 8 completed) ──

  const recentResults: any[] = [];
  const recentPool: { country: typeof COUNTRIES[number]; sec: SecurityDef }[] = [];
  for (const country of COUNTRIES) {
    for (const sec of SECURITIES[country.id]) {
      recentPool.push({ country, sec });
    }
  }

  for (let i = 0; i < 8; i++) {
    const idx = Math.floor(rng() * recentPool.length);
    const { country, sec } = recentPool[idx];

    const daysAgo = 1 + Math.floor(rng() * 7);
    const auctionDate = addDays(today, -daysAgo);

    const yieldNoise = (rng() - 0.5) * 0.15;
    const highYield = roundTo(sec.baseYield + yieldNoise, 3);

    const [btcMin, btcMax] = sec.bidToCoverRange;
    const bidTocover = roundTo(btcMin + rng() * (btcMax - btcMin), 2);

    const allottedAtHigh = roundTo(20 + rng() * 60, 1);
    const tail = roundTo(rng() * 2, 1);

    let indirectBidders: number;
    let directBidders: number;
    if (country.id === 'US') {
      indirectBidders = roundTo(60 + rng() * 15, 1);
      directBidders = roundTo(15 + rng() * 10, 1);
    } else {
      indirectBidders = roundTo(45 + rng() * 25, 1);
      directBidders = roundTo(10 + rng() * 15, 1);
    }
    const primaryDealers = roundTo(Math.max(0, 100 - indirectBidders - directBidders), 1);
    const nonCompetitive = roundTo(20 + rng() * 280, 0);

    // Determine auction strength based on bid-to-cover and tail
    const btcMid = (btcMin + btcMax) / 2;
    let status: string;
    if (bidTocover > btcMid + 0.15 && tail < 0.5) status = 'strong';
    else if (bidTocover < btcMid - 0.15 || tail > 1.5) status = 'weak';
    else status = 'fair';

    const amountNoise = (rng() - 0.5) * sec.baseAmount * 0.15;
    const amount = roundTo(sec.baseAmount + amountNoise, 1);

    recentResults.push({
      date: formatDate(auctionDate),
      country: country.id,
      countryName: country.name,
      flag: country.flag,
      currency: country.currency,
      security: sec.name,
      tenor: sec.tenor,
      amount,
      highYield,
      bidTocover,
      allottedAtHigh,
      tail,
      indirectBidders,
      directBidders,
      primaryDealers,
      nonCompetitive,
      status,
    });
  }
  recentResults.sort((a, b) => b.date.localeCompare(a.date));

  // ── Auction Analytics (US Treasuries by tenor) ──

  const auctionAnalytics = US_ANALYTICS_TENORS.map(tenor => {
    const secDef = SECURITIES.US.find(s => s.tenor === tenor);
    const [btcMin, btcMax] = secDef ? secDef.bidToCoverRange : [2.3, 2.7];
    const avgBidToCover = roundTo(btcMin + rng() * (btcMax - btcMin), 2);
    const avgTail = roundTo(rng() * 1.8, 1);
    const avgIndirect = roundTo(60 + rng() * 15, 1);

    const sixMonthBtc = roundTo(avgBidToCover + (rng() - 0.5) * 0.3, 2);
    let trend: string;
    if (avgBidToCover > sixMonthBtc + 0.05) trend = 'improving';
    else if (avgBidToCover < sixMonthBtc - 0.05) trend = 'deteriorating';
    else trend = 'stable';

    return {
      tenor,
      avgBidToCover,
      avgTail,
      avgIndirect,
      sixMonthAvgBtc: sixMonthBtc,
      trend,
    };
  });

  // ── Issuance Calendar (weekly summary) ──

  const weeks: any[] = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = addDays(today, w * 7 - today.getDay() + 1);
    const weekEnd = addDays(weekStart, 4);
    const weekLabel = `${formatDate(weekStart)} to ${formatDate(weekEnd)}`;

    const totalIssuance = roundTo(150 + rng() * 120, 1);
    const redemptions = roundTo(60 + rng() * 80, 1);
    const couponPayments = roundTo(15 + rng() * 35, 1);
    const netSettlement = roundTo(totalIssuance - redemptions, 1);
    const netSupply = roundTo(totalIssuance - redemptions - couponPayments, 1);

    weeks.push({
      week: weekLabel,
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(weekEnd),
      totalIssuance,
      netSettlement,
      couponPayments,
      redemptions,
      netSupply,
    });
  }

  return {
    upcomingAuctions,
    recentResults,
    auctionAnalytics,
    issuanceCalendar: weeks,
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
    console.error('[BondAuctionCalendar] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate bond auction calendar data' });
  }
});

export default router;
