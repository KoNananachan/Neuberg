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

interface UpcomingIPO {
  company: string;
  ticker: string;
  exchange: 'NYSE' | 'NASDAQ';
  sector: string;
  priceRangeLow: number;
  priceRangeHigh: number;
  sharesOffered: number;
  valuationB: number;
  expectedDate: string;
  leadUnderwriters: string[];
  status: 'filed' | 'priced' | 'expected';
}

interface RecentlyPricedIPO {
  company: string;
  ticker: string;
  ipoPrice: number;
  currentPrice: number;
  return1d: number;
  returnFromIPO: number;
  ipoDate: string;
  marketCapB: number;
  sector: string;
  firstDayVolume: number;
}

interface IPOPerformance {
  totalIPOs_YTD: number;
  totalProceeds_YTD_B: number;
  avgFirstDayReturn: number;
  avgReturnFromIPO: number;
  medianReturnFromIPO: number;
  percentPositive: number;
  largestIPO: { name: string; sizeB: number };
}

interface SectorBreakdownEntry {
  sector: string;
  count: number;
  totalProceeds: number;
  avgReturn: number;
  bestPerformer: string;
}

interface PipelineEntry {
  company: string;
  filingDate: string;
  sector: string;
  estimatedSize: string;
  notable: string;
}

interface IPOCalendarResponse {
  upcoming: UpcomingIPO[];
  recentlyPriced: RecentlyPricedIPO[];
  performance: IPOPerformance;
  sectorBreakdown: SectorBreakdownEntry[];
  pipeline: PipelineEntry[];
  timestamp: string;
}

// ── Cache ──

let cacheData: IPOCalendarResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function lerp(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Company pools ──

const UPCOMING_COMPANIES: Array<{
  company: string;
  ticker: string;
  sector: string;
  valuationRange: [number, number];
  priceRange: [number, number];
  sharesRange: [number, number];
}> = [
  { company: 'NeuraTech AI', ticker: 'NRAI', sector: 'Technology', valuationRange: [8.5, 12.2], priceRange: [28, 36], sharesRange: [22, 30] },
  { company: 'GreenFusion Energy', ticker: 'GFUS', sector: 'Energy', valuationRange: [4.2, 6.8], priceRange: [18, 24], sharesRange: [18, 25] },
  { company: 'QuantumShield Cyber', ticker: 'QSHD', sector: 'Technology', valuationRange: [5.5, 8.0], priceRange: [22, 30], sharesRange: [15, 22] },
  { company: 'Meridian BioSciences', ticker: 'MRDB', sector: 'Healthcare', valuationRange: [3.8, 5.5], priceRange: [16, 22], sharesRange: [20, 28] },
  { company: 'Apex Cloud Infrastructure', ticker: 'ACLD', sector: 'Technology', valuationRange: [12.0, 18.5], priceRange: [32, 44], sharesRange: [25, 35] },
  { company: 'Solaris Payments', ticker: 'SLRP', sector: 'Financials', valuationRange: [6.0, 9.2], priceRange: [20, 28], sharesRange: [18, 26] },
  { company: 'TerraVolt Motors', ticker: 'TVLT', sector: 'Consumer', valuationRange: [7.5, 11.0], priceRange: [24, 34], sharesRange: [20, 30] },
  { company: 'Helix Genomics', ticker: 'HLXG', sector: 'Healthcare', valuationRange: [2.8, 4.5], priceRange: [14, 20], sharesRange: [16, 24] },
  { company: 'Vanguard Robotics', ticker: 'VGRB', sector: 'Industrials', valuationRange: [4.0, 6.5], priceRange: [18, 26], sharesRange: [16, 22] },
  { company: 'CipherNet Security', ticker: 'CPNT', sector: 'Technology', valuationRange: [3.2, 5.0], priceRange: [15, 22], sharesRange: [14, 20] },
  { company: 'AstraPharma Holdings', ticker: 'ASPH', sector: 'Healthcare', valuationRange: [5.0, 7.8], priceRange: [20, 28], sharesRange: [18, 26] },
  { company: 'NovaPay Financial', ticker: 'NVPY', sector: 'Financials', valuationRange: [8.0, 12.0], priceRange: [26, 36], sharesRange: [20, 28] },
];

const RECENT_COMPANIES: Array<{
  company: string;
  ticker: string;
  sector: string;
  ipoPriceRange: [number, number];
  marketCapRange: [number, number];
}> = [
  { company: 'Luminos Semiconductor', ticker: 'LMSM', sector: 'Technology', ipoPriceRange: [28, 36], marketCapRange: [8.5, 14.2] },
  { company: 'Catalyst Therapeutics', ticker: 'CTLX', sector: 'Healthcare', ipoPriceRange: [16, 22], marketCapRange: [3.2, 5.8] },
  { company: 'PrimeEdge Analytics', ticker: 'PMED', sector: 'Technology', ipoPriceRange: [22, 30], marketCapRange: [5.5, 9.0] },
  { company: 'OceanBreeze Logistics', ticker: 'OBLG', sector: 'Industrials', ipoPriceRange: [18, 24], marketCapRange: [4.0, 6.5] },
  { company: 'AtlasPoint Capital', ticker: 'ATLP', sector: 'Financials', ipoPriceRange: [20, 28], marketCapRange: [6.0, 10.2] },
  { company: 'Zenith Cloud Systems', ticker: 'ZNCS', sector: 'Technology', ipoPriceRange: [30, 42], marketCapRange: [10.0, 16.5] },
  { company: 'BioVista Genomics', ticker: 'BVGN', sector: 'Healthcare', ipoPriceRange: [14, 20], marketCapRange: [2.5, 4.5] },
  { company: 'TerraSync Energy', ticker: 'TSYE', sector: 'Energy', ipoPriceRange: [18, 26], marketCapRange: [4.5, 7.8] },
  { company: 'CoreStack Technologies', ticker: 'CSTK', sector: 'Technology', ipoPriceRange: [24, 34], marketCapRange: [7.0, 12.0] },
  { company: 'SilverPeak Mining', ticker: 'SPKM', sector: 'Energy', ipoPriceRange: [12, 18], marketCapRange: [2.0, 3.8] },
];

const PIPELINE_COMPANIES: Array<{
  company: string;
  sector: string;
  estimatedSize: string;
  notable: string;
}> = [
  { company: 'Vertex Autonomous', sector: 'Technology', estimatedSize: '$1.5B-$2.0B', notable: 'Leading autonomous trucking platform; backed by Tier 1 VCs' },
  { company: 'PharmaEdge Biologics', sector: 'Healthcare', estimatedSize: '$800M-$1.2B', notable: 'Phase 3 GLP-1 analog; dual listing planned NYSE/LSE' },
  { company: 'CircuitWave Chips', sector: 'Technology', estimatedSize: '$2.0B-$3.0B', notable: 'AI inference chip maker; key supplier to hyperscalers' },
  { company: 'EverGreen Hydrogen', sector: 'Energy', estimatedSize: '$600M-$900M', notable: 'Green hydrogen production; DOE grant recipient' },
  { company: 'Nexus Fintech Group', sector: 'Financials', estimatedSize: '$1.0B-$1.5B', notable: 'Embedded finance API; 400+ bank partnerships' },
  { company: 'ArcticShield Defense', sector: 'Industrials', estimatedSize: '$700M-$1.0B', notable: 'AI-powered drone defense systems; $2B contract backlog' },
  { company: 'CloudNine Therapeutics', sector: 'Healthcare', estimatedSize: '$500M-$750M', notable: 'Psychedelic-derived neuropsychiatry treatments; breakthrough designation' },
  { company: 'DataPulse Systems', sector: 'Technology', estimatedSize: '$1.2B-$1.8B', notable: 'Real-time data observability; ARR growing 120% YoY' },
];

const UNDERWRITER_POOL = [
  'Goldman Sachs', 'Morgan Stanley', 'J.P. Morgan', 'BofA Securities',
  'Citigroup', 'Barclays', 'UBS', 'Deutsche Bank', 'Jefferies',
  'Credit Suisse', 'Wells Fargo', 'RBC Capital Markets', 'Piper Sandler',
  'Cowen', 'William Blair',
];

const SECTOR_NAMES = ['Technology', 'Healthcare', 'Financials', 'Consumer', 'Industrials', 'Energy'];

const SECTOR_BEST_PERFORMERS: Record<string, string[]> = {
  Technology: ['Luminos Semiconductor', 'PrimeEdge Analytics', 'Zenith Cloud Systems', 'CoreStack Technologies'],
  Healthcare: ['Catalyst Therapeutics', 'BioVista Genomics', 'AstraPharma Holdings'],
  Financials: ['AtlasPoint Capital', 'NovaPay Financial', 'Solaris Payments'],
  Consumer: ['TerraVolt Motors', 'BrightHouse Brands', 'Pinnacle Consumer'],
  Industrials: ['OceanBreeze Logistics', 'Vanguard Robotics', 'Apex Industrial'],
  Energy: ['GreenFusion Energy', 'TerraSync Energy', 'SilverPeak Mining'],
};

// ── Data generation ──

function generateData(): IPOCalendarResponse {
  const today = new Date();
  const seed = hashSeed('ipo-calendar-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);

  // ── upcoming: 8-10 IPOs ──
  const upcomingCount = 8 + Math.floor(rng() * 3);
  const shuffledUpcoming = [...UPCOMING_COMPANIES].sort(() => rng() - 0.5);
  const selectedUpcoming = shuffledUpcoming.slice(0, upcomingCount);

  const upcoming: UpcomingIPO[] = selectedUpcoming.map(co => {
    const daysAhead = 3 + Math.floor(rng() * 25);
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    // Skip weekends
    const dow = d.getDay();
    if (dow === 0) d.setDate(d.getDate() + 1);
    if (dow === 6) d.setDate(d.getDate() + 2);

    const priceRangeLow = round2(lerp(rng, co.priceRange[0], co.priceRange[0] + (co.priceRange[1] - co.priceRange[0]) * 0.4));
    const priceRangeHigh = round2(lerp(rng, co.priceRange[0] + (co.priceRange[1] - co.priceRange[0]) * 0.6, co.priceRange[1]));
    const sharesOffered = round1(lerp(rng, co.sharesRange[0], co.sharesRange[1]));
    const valuationB = round1(lerp(rng, co.valuationRange[0], co.valuationRange[1]));

    // Pick 2-3 underwriters
    const uwCount = 2 + (rng() > 0.5 ? 1 : 0);
    const shuffledUW = [...UNDERWRITER_POOL].sort(() => rng() - 0.5);
    const leadUnderwriters = shuffledUW.slice(0, uwCount);

    const statusRoll = rng();
    const status: 'filed' | 'priced' | 'expected' = statusRoll < 0.35 ? 'filed' : statusRoll < 0.55 ? 'priced' : 'expected';

    const exchange: 'NYSE' | 'NASDAQ' = rng() > 0.5 ? 'NYSE' : 'NASDAQ';

    return {
      company: co.company,
      ticker: co.ticker,
      exchange,
      sector: co.sector,
      priceRangeLow,
      priceRangeHigh,
      sharesOffered,
      valuationB,
      expectedDate: formatDate(d),
      leadUnderwriters,
      status,
    };
  });

  // Sort by expected date
  upcoming.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));

  // ── recentlyPriced: 8 companies ──
  const shuffledRecent = [...RECENT_COMPANIES].sort(() => rng() - 0.5);
  const selectedRecent = shuffledRecent.slice(0, 8);

  const recentlyPriced: RecentlyPricedIPO[] = selectedRecent.map(co => {
    const daysAgo = 1 + Math.floor(rng() * 30);
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);

    const ipoPrice = round2(lerp(rng, co.ipoPriceRange[0], co.ipoPriceRange[1]));

    // IPO return distribution: most cluster near 0-30%, some big winners, some losers
    const returnRoll = rng();
    let returnFromIPO: number;
    if (returnRoll < 0.15) {
      // Big loser: -5% to -25%
      returnFromIPO = round1(lerp(rng, -25, -5));
    } else if (returnRoll < 0.45) {
      // Modest: -5% to +15%
      returnFromIPO = round1(lerp(rng, -5, 15));
    } else if (returnRoll < 0.80) {
      // Solid: +15% to +50%
      returnFromIPO = round1(lerp(rng, 15, 50));
    } else {
      // Big winner: +50% to +120%
      returnFromIPO = round1(lerp(rng, 50, 120));
    }

    const currentPrice = round2(ipoPrice * (1 + returnFromIPO / 100));

    // 1d return: smaller daily move
    const return1d = round1(lerp(rng, -5, 5));

    const marketCapB = round1(lerp(rng, co.marketCapRange[0], co.marketCapRange[1]));

    // First day volume in millions
    const firstDayVolume = Math.round(lerp(rng, 8, 65) * 1000000);

    return {
      company: co.company,
      ticker: co.ticker,
      ipoPrice,
      currentPrice,
      return1d,
      returnFromIPO,
      ipoDate: formatDate(d),
      marketCapB,
      sector: co.sector,
      firstDayVolume,
    };
  });

  // Sort by IPO date descending (most recent first)
  recentlyPriced.sort((a, b) => b.ipoDate.localeCompare(a.ipoDate));

  // ── performance: market-wide IPO stats ──
  const totalIPOs_YTD = 65 + Math.floor(rng() * 40);
  const totalProceeds_YTD_B = round1(lerp(rng, 28, 72));
  const avgFirstDayReturn = round1(lerp(rng, 8, 22));
  const avgReturnFromIPO = round1(lerp(rng, -5, 18));
  const medianReturnFromIPO = round1(avgReturnFromIPO - lerp(rng, 2, 8));
  const percentPositive = round1(lerp(rng, 52, 72));

  const largestIPONames = [
    'Apex Cloud Infrastructure', 'NeuraTech AI', 'Zenith Cloud Systems',
    'CircuitWave Chips', 'NovaPay Financial',
  ];
  const largestIPOName = pick(rng, largestIPONames);
  const largestIPOSize = round1(lerp(rng, 3.5, 8.0));

  const performance: IPOPerformance = {
    totalIPOs_YTD,
    totalProceeds_YTD_B,
    avgFirstDayReturn,
    avgReturnFromIPO,
    medianReturnFromIPO,
    percentPositive,
    largestIPO: { name: largestIPOName, sizeB: largestIPOSize },
  };

  // ── sectorBreakdown ──
  const sectorBreakdown: SectorBreakdownEntry[] = SECTOR_NAMES.map(sector => {
    const count = 5 + Math.floor(rng() * 20);
    const totalProceeds = round1(lerp(rng, 2, 18));
    const avgReturn = round1(lerp(rng, -8, 35));
    const performers = SECTOR_BEST_PERFORMERS[sector] || ['Unknown'];
    const bestPerformer = pick(rng, performers);

    return {
      sector,
      count,
      totalProceeds,
      avgReturn,
      bestPerformer,
    };
  });

  // Sort by count descending
  sectorBreakdown.sort((a, b) => b.count - a.count);

  // ── pipeline: 5-6 filed/S-1 companies ──
  const pipelineCount = 5 + (rng() > 0.5 ? 1 : 0);
  const shuffledPipeline = [...PIPELINE_COMPANIES].sort(() => rng() - 0.5);
  const selectedPipeline = shuffledPipeline.slice(0, pipelineCount);

  const pipeline: PipelineEntry[] = selectedPipeline.map(co => {
    const daysAgo = 10 + Math.floor(rng() * 60);
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);

    return {
      company: co.company,
      filingDate: formatDate(d),
      sector: co.sector,
      estimatedSize: co.estimatedSize,
      notable: co.notable,
    };
  });

  // Sort by filing date descending (most recent first)
  pipeline.sort((a, b) => b.filingDate.localeCompare(a.filingDate));

  return {
    upcoming,
    recentlyPriced,
    performance,
    sectorBreakdown,
    pipeline,
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
    console.error('[IPOCalendar] Error:', err instanceof Error ? err.message : err);
    // Stale fallback
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate IPO calendar data' });
  }
});

export default router;
