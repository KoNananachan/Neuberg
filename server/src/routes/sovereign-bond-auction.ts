import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Bond definitions with realistic parameters per country
interface BondDef {
  country: string;
  issuer: string;
  tenor: string;
  amountMin: number;     // $B equivalent
  amountMax: number;
  currency: string;
  yieldMin: number;
  yieldMax: number;
  bidCoverMin: number;
  bidCoverMax: number;
  region: 'Americas' | 'Europe' | 'Asia-Pacific';
}

const BOND_DEFS: BondDef[] = [
  // United States
  { country: 'United States', issuer: 'US Treasury', tenor: '2Y Note', amountMin: 42, amountMax: 50, currency: 'USD', yieldMin: 4.0, yieldMax: 4.6, bidCoverMin: 2.4, bidCoverMax: 2.9, region: 'Americas' },
  { country: 'United States', issuer: 'US Treasury', tenor: '5Y Note', amountMin: 44, amountMax: 52, currency: 'USD', yieldMin: 4.1, yieldMax: 4.5, bidCoverMin: 2.3, bidCoverMax: 2.8, region: 'Americas' },
  { country: 'United States', issuer: 'US Treasury', tenor: '10Y Note', amountMin: 38, amountMax: 42, currency: 'USD', yieldMin: 4.2, yieldMax: 4.5, bidCoverMin: 2.3, bidCoverMax: 2.8, region: 'Americas' },
  { country: 'United States', issuer: 'US Treasury', tenor: '30Y Bond', amountMin: 18, amountMax: 24, currency: 'USD', yieldMin: 4.4, yieldMax: 4.8, bidCoverMin: 2.2, bidCoverMax: 2.6, region: 'Americas' },
  // Germany
  { country: 'Germany', issuer: 'Bundesrepublik', tenor: 'Bund 10Y', amountMin: 3, amountMax: 5, currency: 'EUR', yieldMin: 2.3, yieldMax: 2.7, bidCoverMin: 1.2, bidCoverMax: 1.8, region: 'Europe' },
  { country: 'Germany', issuer: 'Bundesrepublik', tenor: 'Bobl 5Y', amountMin: 3, amountMax: 5, currency: 'EUR', yieldMin: 2.1, yieldMax: 2.5, bidCoverMin: 1.3, bidCoverMax: 1.9, region: 'Europe' },
  { country: 'Germany', issuer: 'Bundesrepublik', tenor: 'Schatz 2Y', amountMin: 4, amountMax: 6, currency: 'EUR', yieldMin: 2.5, yieldMax: 3.0, bidCoverMin: 1.4, bidCoverMax: 2.0, region: 'Europe' },
  // Japan
  { country: 'Japan', issuer: 'Ministry of Finance', tenor: 'JGB 10Y', amountMin: 18, amountMax: 25, currency: 'JPY', yieldMin: 0.8, yieldMax: 1.2, bidCoverMin: 3.0, bidCoverMax: 4.0, region: 'Asia-Pacific' },
  { country: 'Japan', issuer: 'Ministry of Finance', tenor: 'JGB 20Y', amountMin: 8, amountMax: 12, currency: 'JPY', yieldMin: 1.4, yieldMax: 1.8, bidCoverMin: 2.8, bidCoverMax: 3.6, region: 'Asia-Pacific' },
  { country: 'Japan', issuer: 'Ministry of Finance', tenor: 'JGB 30Y', amountMin: 6, amountMax: 9, currency: 'JPY', yieldMin: 1.7, yieldMax: 2.1, bidCoverMin: 2.5, bidCoverMax: 3.4, region: 'Asia-Pacific' },
  // United Kingdom
  { country: 'United Kingdom', issuer: 'DMO', tenor: 'Gilt 10Y', amountMin: 3, amountMax: 5, currency: 'GBP', yieldMin: 4.0, yieldMax: 4.5, bidCoverMin: 2.2, bidCoverMax: 2.8, region: 'Europe' },
  { country: 'United Kingdom', issuer: 'DMO', tenor: 'Gilt 30Y', amountMin: 2, amountMax: 3.5, currency: 'GBP', yieldMin: 4.5, yieldMax: 5.0, bidCoverMin: 2.0, bidCoverMax: 2.6, region: 'Europe' },
  // France
  { country: 'France', issuer: 'Agence France Tresor', tenor: 'OAT 10Y', amountMin: 4, amountMax: 7, currency: 'EUR', yieldMin: 2.8, yieldMax: 3.3, bidCoverMin: 1.8, bidCoverMax: 2.5, region: 'Europe' },
  { country: 'France', issuer: 'Agence France Tresor', tenor: 'OAT 30Y', amountMin: 2, amountMax: 4, currency: 'EUR', yieldMin: 3.2, yieldMax: 3.8, bidCoverMin: 1.5, bidCoverMax: 2.2, region: 'Europe' },
  // Italy
  { country: 'Italy', issuer: 'MEF', tenor: 'BTP 10Y', amountMin: 3, amountMax: 6, currency: 'EUR', yieldMin: 3.5, yieldMax: 4.2, bidCoverMin: 1.3, bidCoverMax: 1.8, region: 'Europe' },
  { country: 'Italy', issuer: 'MEF', tenor: 'BTP 30Y', amountMin: 2, amountMax: 3.5, currency: 'EUR', yieldMin: 4.0, yieldMax: 4.7, bidCoverMin: 1.2, bidCoverMax: 1.7, region: 'Europe' },
  // Spain
  { country: 'Spain', issuer: 'Tesoro Publico', tenor: 'Bonos 10Y', amountMin: 3, amountMax: 5.5, currency: 'EUR', yieldMin: 3.1, yieldMax: 3.6, bidCoverMin: 1.4, bidCoverMax: 2.0, region: 'Europe' },
  { country: 'Spain', issuer: 'Tesoro Publico', tenor: 'Bonos 30Y', amountMin: 1.5, amountMax: 3, currency: 'EUR', yieldMin: 3.6, yieldMax: 4.2, bidCoverMin: 1.3, bidCoverMax: 1.8, region: 'Europe' },
  // Australia
  { country: 'Australia', issuer: 'AOFM', tenor: 'ACGB 10Y', amountMin: 1, amountMax: 2, currency: 'AUD', yieldMin: 4.0, yieldMax: 4.5, bidCoverMin: 2.5, bidCoverMax: 3.5, region: 'Asia-Pacific' },
  { country: 'Australia', issuer: 'AOFM', tenor: 'ACGB 20Y', amountMin: 0.5, amountMax: 1.5, currency: 'AUD', yieldMin: 4.3, yieldMax: 4.8, bidCoverMin: 2.2, bidCoverMax: 3.0, region: 'Asia-Pacific' },
  // Canada
  { country: 'Canada', issuer: 'Bank of Canada', tenor: 'GoC 2Y', amountMin: 3, amountMax: 5, currency: 'CAD', yieldMin: 3.4, yieldMax: 3.9, bidCoverMin: 2.3, bidCoverMax: 2.9, region: 'Americas' },
  { country: 'Canada', issuer: 'Bank of Canada', tenor: 'GoC 10Y', amountMin: 3, amountMax: 4.5, currency: 'CAD', yieldMin: 3.2, yieldMax: 3.7, bidCoverMin: 2.2, bidCoverMax: 2.8, region: 'Americas' },
  { country: 'Canada', issuer: 'Bank of Canada', tenor: 'GoC 30Y', amountMin: 1.5, amountMax: 3, currency: 'CAD', yieldMin: 3.4, yieldMax: 4.0, bidCoverMin: 2.0, bidCoverMax: 2.6, region: 'Americas' },
];

interface UpcomingAuction {
  country: string;
  issuer: string;
  tenor: string;
  amount: number;
  currency: string;
  auctionDate: string;
  auctionType: 'competitive' | 'non-competitive';
  previousYield: number;
  previousBidCover: number;
}

interface RecentAuction {
  country: string;
  issuer: string;
  tenor: string;
  amount: number;
  currency: string;
  auctionDate: string;
  auctionType: 'competitive' | 'non-competitive';
  highYield: number;
  bidToCover: number;
  allottedAtHigh: number;
  indirectBidders: number;
  directBidders: number;
  tail: number;
  accepted: number;
}

interface CalendarEntry {
  country: string;
  tenor: string;
  date: string;
  estimatedAmount: number;
  currency: string;
}

interface WeeklyCalendar {
  weekOf: string;
  Americas: CalendarEntry[];
  Europe: CalendarEntry[];
  'Asia-Pacific': CalendarEntry[];
}

interface CountryStats {
  country: string;
  totalIssuanceYTD: number;
  avgBidToCover: number;
  avgTail: number;
  auctionCount: number;
}

interface SovereignBondAuctionResponse {
  upcoming: UpcomingAuction[];
  recent: RecentAuction[];
  calendar: WeeklyCalendar[];
  stats: CountryStats[];
  generatedAt: string;
}


let cache: { data: SovereignBondAuctionResponse; ts: number } | null = null;

// Get the Monday of the week for a given date
function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function generate(): SovereignBondAuctionResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('sovereign-bond-auction-' + today));

  const now = new Date();

  // --- Upcoming auctions ---
  const upcoming: UpcomingAuction[] = [];
  for (const bond of BOND_DEFS) {
    // Each bond has a ~60% chance of having an upcoming auction in the next 14 days
    if (rng() < 0.6) {
      const daysAhead = 1 + Math.floor(rng() * 13);
      const auctionDate = new Date(now);
      auctionDate.setDate(auctionDate.getDate() + daysAhead);
      // Skip weekends
      const dow = auctionDate.getDay();
      if (dow === 0) auctionDate.setDate(auctionDate.getDate() + 1);
      if (dow === 6) auctionDate.setDate(auctionDate.getDate() + 2);

      const amount = round(bond.amountMin + rng() * (bond.amountMax - bond.amountMin), 1);
      const previousYield = round(bond.yieldMin + rng() * (bond.yieldMax - bond.yieldMin), 3);
      const previousBidCover = round(bond.bidCoverMin + rng() * (bond.bidCoverMax - bond.bidCoverMin), 2);
      const auctionType = rng() > 0.15 ? 'competitive' : 'non-competitive';

      upcoming.push({
        country: bond.country,
        issuer: bond.issuer,
        tenor: bond.tenor,
        amount,
        currency: bond.currency,
        auctionDate: auctionDate.toISOString().slice(0, 10),
        auctionType,
        previousYield,
        previousBidCover,
      });
    }
  }
  // Sort upcoming by date
  upcoming.sort((a, b) => a.auctionDate.localeCompare(b.auctionDate));

  // --- Recent auctions (last 15 completed) ---
  const allRecent: RecentAuction[] = [];
  for (const bond of BOND_DEFS) {
    // Generate 1-2 recent auctions per bond in the past 30 days
    const count = 1 + (rng() > 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const daysAgo = 1 + Math.floor(rng() * 29);
      const auctionDate = new Date(now);
      auctionDate.setDate(auctionDate.getDate() - daysAgo);

      const amount = round(bond.amountMin + rng() * (bond.amountMax - bond.amountMin), 1);
      const highYield = round(bond.yieldMin + rng() * (bond.yieldMax - bond.yieldMin), 3);
      const bidToCover = round(bond.bidCoverMin + rng() * (bond.bidCoverMax - bond.bidCoverMin), 2);
      const allottedAtHigh = round(clamp(10 + rng() * 75, 5, 90), 1);
      const indirectBidders = round(clamp(45 + rng() * 25, 40, 75), 1);
      const directBidders = round(clamp(10 + rng() * 20, 8, 30), 1);
      // Tail: -1 to +3 bps (negative = strong demand, positive = weak)
      const tail = round(clamp(-1 + rng() * 4, -1, 3), 1);
      const accepted = round(clamp(85 + rng() * 15, 80, 100), 1);
      const auctionType = rng() > 0.15 ? 'competitive' : 'non-competitive';

      allRecent.push({
        country: bond.country,
        issuer: bond.issuer,
        tenor: bond.tenor,
        amount,
        currency: bond.currency,
        auctionDate: auctionDate.toISOString().slice(0, 10),
        auctionType,
        highYield,
        bidToCover,
        allottedAtHigh,
        indirectBidders,
        directBidders,
        tail,
        accepted,
      });
    }
  }
  // Sort by date descending, take last 15
  allRecent.sort((a, b) => b.auctionDate.localeCompare(a.auctionDate));
  const recent = allRecent.slice(0, 15);

  // --- Calendar: next 4 weeks grouped by region ---
  const calendar: WeeklyCalendar[] = [];
  const currentMonday = getMonday(now);
  for (let week = 0; week < 4; week++) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(weekStart.getDate() + week * 7);
    const weekOf = weekStart.toISOString().slice(0, 10);

    const weekEntries: Record<'Americas' | 'Europe' | 'Asia-Pacific', CalendarEntry[]> = {
      'Americas': [],
      'Europe': [],
      'Asia-Pacific': [],
    };

    for (const bond of BOND_DEFS) {
      // Each bond has ~35% chance of auction in any given week
      if (rng() < 0.35) {
        // Pick a weekday (Mon-Fri)
        const dayOffset = Math.floor(rng() * 5);
        const auctionDate = new Date(weekStart);
        auctionDate.setDate(auctionDate.getDate() + dayOffset);
        const estimatedAmount = round(bond.amountMin + rng() * (bond.amountMax - bond.amountMin), 1);

        weekEntries[bond.region].push({
          country: bond.country,
          tenor: bond.tenor,
          date: auctionDate.toISOString().slice(0, 10),
          estimatedAmount,
          currency: bond.currency,
        });
      }
    }

    // Sort entries within each region by date
    weekEntries['Americas'].sort((a, b) => a.date.localeCompare(b.date));
    weekEntries['Europe'].sort((a, b) => a.date.localeCompare(b.date));
    weekEntries['Asia-Pacific'].sort((a, b) => a.date.localeCompare(b.date));

    calendar.push({
      weekOf,
      Americas: weekEntries['Americas'],
      Europe: weekEntries['Europe'],
      'Asia-Pacific': weekEntries['Asia-Pacific'],
    });
  }

  // --- Stats: summary by country ---
  // Use all recent auctions (not just the 15 returned) for stats
  const countryMap = new Map<string, { totalIssuance: number; bidToCoverSum: number; tailSum: number; count: number }>();
  for (const a of allRecent) {
    const entry = countryMap.get(a.country) || { totalIssuance: 0, bidToCoverSum: 0, tailSum: 0, count: 0 };
    entry.totalIssuance += a.amount;
    entry.bidToCoverSum += a.bidToCover;
    entry.tailSum += a.tail;
    entry.count += 1;
    countryMap.set(a.country, entry);
  }
  const stats: CountryStats[] = [];
  for (const [country, entry] of countryMap) {
    stats.push({
      country,
      totalIssuanceYTD: round(entry.totalIssuance, 1),
      avgBidToCover: round(entry.bidToCoverSum / entry.count, 2),
      avgTail: round(entry.tailSum / entry.count, 1),
      auctionCount: entry.count,
    });
  }
  // Sort by total issuance descending
  stats.sort((a, b) => b.totalIssuanceYTD - a.totalIssuanceYTD);

  return {
    upcoming,
    recent,
    calendar,
    stats,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SovereignBondAuction] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate sovereign bond auction data' });
  }
});

export default router;
