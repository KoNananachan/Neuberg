import { Router } from 'express';

const router = Router();

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

interface CountrySeed {
  country: string;
  ticker: string;
  spread5yBase: number;
  spread1yBase: number;
  rating: string;
  region: string;
}

interface RankingEntry {
  country: string;
  ticker: string;
  spread5y: number;
  spread1y: number;
  change1d: number;
  change1w: number;
  change1m: number;
  impliedPD: number;
  rating: string;
  region: string;
}

interface SpreadChange {
  country: string;
  change: number;
  currentSpread: number;
  percentChange: number;
}

interface TermStructureEntry {
  country: string;
  tenors: { tenor: string; spread: number }[];
}

interface CreditEvent {
  country: string;
  event: string;
  impact: number;
  date: string;
}

interface RegionalSummary {
  region: string;
  avgSpread: number;
  medianSpread: number;
  worstCountry: string;
  bestCountry: string;
}

// ── Seed Data ──

const COUNTRY_SEEDS: CountrySeed[] = [
  { country: 'United States',  ticker: 'US CDS',  spread5yBase: 20,   spread1yBase: 12,   rating: 'AA+',  region: 'North America' },
  { country: 'Germany',        ticker: 'DE CDS',  spread5yBase: 15,   spread1yBase: 8,    rating: 'AAA',  region: 'Europe Core' },
  { country: 'Japan',          ticker: 'JP CDS',  spread5yBase: 28,   spread1yBase: 16,   rating: 'A+',   region: 'Asia' },
  { country: 'United Kingdom', ticker: 'GB CDS',  spread5yBase: 22,   spread1yBase: 13,   rating: 'AA',   region: 'Europe Core' },
  { country: 'France',         ticker: 'FR CDS',  spread5yBase: 30,   spread1yBase: 18,   rating: 'AA-',  region: 'Europe Core' },
  { country: 'Italy',          ticker: 'IT CDS',  spread5yBase: 115,  spread1yBase: 75,   rating: 'BBB',  region: 'Europe Periphery' },
  { country: 'Spain',          ticker: 'ES CDS',  spread5yBase: 90,   spread1yBase: 55,   rating: 'A',    region: 'Europe Periphery' },
  { country: 'Portugal',       ticker: 'PT CDS',  spread5yBase: 55,   spread1yBase: 32,   rating: 'A-',   region: 'Europe Periphery' },
  { country: 'Greece',         ticker: 'GR CDS',  spread5yBase: 105,  spread1yBase: 68,   rating: 'BBB-', region: 'Europe Periphery' },
  { country: 'Brazil',         ticker: 'BR CDS',  spread5yBase: 160,  spread1yBase: 100,  rating: 'BB',   region: 'LatAm' },
  { country: 'Turkey',         ticker: 'TR CDS',  spread5yBase: 380,  spread1yBase: 260,  rating: 'B+',   region: 'Middle East/Africa' },
  { country: 'South Africa',   ticker: 'ZA CDS',  spread5yBase: 215,  spread1yBase: 140,  rating: 'BB-',  region: 'Middle East/Africa' },
  { country: 'Mexico',         ticker: 'MX CDS',  spread5yBase: 120,  spread1yBase: 72,   rating: 'BBB',  region: 'LatAm' },
  { country: 'Argentina',      ticker: 'AR CDS',  spread5yBase: 1200, spread1yBase: 900,  rating: 'CCC+', region: 'LatAm' },
  { country: 'Colombia',       ticker: 'CO CDS',  spread5yBase: 145,  spread1yBase: 88,   rating: 'BB+',  region: 'LatAm' },
  { country: 'China',          ticker: 'CN CDS',  spread5yBase: 65,   spread1yBase: 38,   rating: 'A+',   region: 'Asia' },
  { country: 'Indonesia',      ticker: 'ID CDS',  spread5yBase: 85,   spread1yBase: 50,   rating: 'BBB',  region: 'Asia' },
  { country: 'South Korea',    ticker: 'KR CDS',  spread5yBase: 35,   spread1yBase: 20,   rating: 'AA',   region: 'Asia' },
  { country: 'Saudi Arabia',   ticker: 'SA CDS',  spread5yBase: 60,   spread1yBase: 35,   rating: 'A',    region: 'Middle East/Africa' },
  { country: 'Egypt',          ticker: 'EG CDS',  spread5yBase: 520,  spread1yBase: 380,  rating: 'B-',   region: 'Middle East/Africa' },
];

const TERM_STRUCTURE_COUNTRIES = ['United States', 'Germany', 'Italy', 'Brazil', 'Turkey'];

const TERM_STRUCTURE_BASES: Record<string, Record<string, number>> = {
  'United States': { '6M': 8, '1Y': 12, '2Y': 16, '3Y': 18, '5Y': 20, '7Y': 23, '10Y': 26 },
  'Germany':       { '6M': 5, '1Y': 8,  '2Y': 11, '3Y': 13, '5Y': 15, '7Y': 17, '10Y': 19 },
  'Italy':         { '6M': 55, '1Y': 75, '2Y': 90, '3Y': 102, '5Y': 115, '7Y': 122, '10Y': 128 },
  'Brazil':        { '6M': 75, '1Y': 100, '2Y': 125, '3Y': 142, '5Y': 160, '7Y': 172, '10Y': 180 },
  'Turkey':        { '6M': 180, '1Y': 260, '2Y': 310, '3Y': 345, '5Y': 380, '7Y': 400, '10Y': 415 },
};

const CREDIT_EVENT_TEMPLATES = [
  { country: 'Turkey', event: 'Lira sell-off triggers sovereign risk repricing after central bank rate decision', impactBase: 35 },
  { country: 'Argentina', event: 'IMF debt restructuring talks stall, fiscal deficit concerns mount', impactBase: 85 },
  { country: 'Italy', event: 'BTP-Bund spread widening on coalition instability and budget revision', impactBase: 18 },
  { country: 'Brazil', event: 'Commodity export weakness pressures fiscal outlook, real depreciates', impactBase: 22 },
  { country: 'Egypt', event: 'Foreign reserves decline accelerates amid FX pressure', impactBase: 45 },
  { country: 'South Africa', event: 'Load-shedding crisis and SOE debt concerns weigh on sovereign credit', impactBase: 28 },
  { country: 'China', event: 'Property sector contagion risk impacts local government financing vehicles', impactBase: 12 },
  { country: 'Greece', event: 'Rating upgrade expectations drive spread compression vs periphery', impactBase: -15 },
];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Generator ──

function generate() {
  const seed = hashSeed('sovereign-cds-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // ── Rankings ──
  const rankings: RankingEntry[] = COUNTRY_SEEDS.map(s => {
    const spread5y = round1(jitter(s.spread5yBase, 0.10));
    const spread1y = round1(jitter(s.spread1yBase, 0.12));
    const change1d = round1((rng() - 0.48) * s.spread5yBase * 0.03);
    const change1w = round1((rng() - 0.46) * s.spread5yBase * 0.06);
    const change1m = round1((rng() - 0.44) * s.spread5yBase * 0.10);
    // Implied probability of default: spread / (1 - recovery) / 10000 * 100 over 5Y horizon
    const recovery = 0.40;
    const impliedPD = round2((spread5y / 10000) / (1 - recovery) * 5 * 100);

    return {
      country: s.country,
      ticker: s.ticker,
      spread5y,
      spread1y,
      change1d,
      change1w,
      change1m,
      impliedPD,
      rating: s.rating,
      region: s.region,
    };
  }).sort((a, b) => a.spread5y - b.spread5y);

  // ── Spread Changes (top 5 wideners, top 5 tighteners) ──
  const sortedByChange = [...rankings].sort((a, b) => b.change1d - a.change1d);
  const wideners: SpreadChange[] = sortedByChange.slice(0, 5).map(r => ({
    country: r.country,
    change: r.change1d,
    currentSpread: r.spread5y,
    percentChange: round2((r.change1d / (r.spread5y - r.change1d)) * 100),
  }));
  const tighteners: SpreadChange[] = sortedByChange.slice(-5).reverse().map(r => ({
    country: r.country,
    change: r.change1d,
    currentSpread: r.spread5y,
    percentChange: round2((r.change1d / (r.spread5y - r.change1d)) * 100),
  }));

  const spreadChanges = { wideners, tighteners };

  // ── Term Structure ──
  const tenorLabels = ['6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y'];
  const termStructure: TermStructureEntry[] = TERM_STRUCTURE_COUNTRIES.map(country => {
    const bases = TERM_STRUCTURE_BASES[country];
    const tenors = tenorLabels.map(tenor => ({
      tenor,
      spread: round1(jitter(bases[tenor], 0.08)),
    }));
    return { country, tenors };
  });

  // ── Credit Events ──
  const today = new Date();
  const shuffled = [...CREDIT_EVENT_TEMPLATES].sort(() => rng() - 0.5);
  const selectedEvents = shuffled.slice(0, 4);
  const creditEvents: CreditEvent[] = selectedEvents.map((evt, i) => {
    const daysAgo = Math.floor(rng() * 7) + i * 2;
    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() - daysAgo);
    return {
      country: evt.country,
      event: evt.event,
      impact: round1(jitter(Math.abs(evt.impactBase), 0.15)) * (evt.impactBase < 0 ? -1 : 1),
      date: eventDate.toISOString().slice(0, 10),
    };
  });

  // ── Regional Summary ──
  const regions = ['North America', 'Europe Core', 'Europe Periphery', 'LatAm', 'Asia', 'Middle East/Africa'];
  const regionalSummary: RegionalSummary[] = regions.map(region => {
    const members = rankings.filter(r => r.region === region);
    if (members.length === 0) {
      return { region, avgSpread: 0, medianSpread: 0, worstCountry: 'N/A', bestCountry: 'N/A' };
    }
    const spreads = members.map(m => m.spread5y).sort((a, b) => a - b);
    const avg = round1(spreads.reduce((s, v) => s + v, 0) / spreads.length);
    const mid = Math.floor(spreads.length / 2);
    const median = spreads.length % 2 === 0
      ? round1((spreads[mid - 1] + spreads[mid]) / 2)
      : spreads[mid];
    const worst = members.reduce((w, m) => m.spread5y > w.spread5y ? m : w).country;
    const best = members.reduce((b, m) => m.spread5y < b.spread5y ? m : b).country;

    return { region, avgSpread: avg, medianSpread: median, worstCountry: worst, bestCountry: best };
  });

  return {
    rankings,
    spreadChanges,
    termStructure,
    creditEvents,
    regionalSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[SovereignCDS] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate sovereign CDS data' });
  }
});

export default router;
