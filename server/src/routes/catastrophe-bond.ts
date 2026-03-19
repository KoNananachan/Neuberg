import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Types ──

interface OutstandingBond {
  name: string;
  sponsor: string;
  peril: string;
  region: string;
  size: number;
  coupon: string;
  expectedLoss: number;
  spread: number;
  price: number;
  rating: string;
  maturity: string;
  triggerType: string;
}

interface NewIssuance {
  name: string;
  sponsor: string;
  peril: string;
  size: number;
  spread: number;
  expectedLoss: number;
  triggerType: string;
  placementDate: string;
}

interface PerilExposure {
  peril: string;
  totalExposure: number;
  avgSpread: number;
  avgExpectedLoss: number;
  bondCount: number;
  largestSingleExposure: number;
}

interface MarketIndices {
  swissReCatBondIndex: { level: number; return1M: number; returnYTD: number; totalReturn1Y: number };
  artemisILSIndex: { level: number; return1M: number; returnYTD: number };
}

interface SeasonalRisk {
  hurricaneSeason: 'active' | 'inactive' | 'approaching';
  earthquakeRecent: number;
  wildfireSeason: 'active' | 'inactive' | 'approaching';
  floodRisk: 'elevated' | 'normal' | 'low';
}

interface ReinsuranceMarket {
  globalPropertyCatRoL: number;
  rateTrend: 'hardening' | 'softening' | 'stable';
  capacityBn: number;
  retrocessionSpread: number;
}

interface Summary {
  totalMarketSize: number;
  ytdIssuance: number;
  avgSpread: number;
  avgExpectedLoss: number;
  returnYTD: number;
  nextMajorMaturity: string;
}

interface CatBondMarketData {
  outstandingBonds: OutstandingBond[];
  newIssuance: NewIssuance[];
  perilExposure: PerilExposure[];
  marketIndices: MarketIndices;
  seasonalRisk: SeasonalRisk;
  reinsuranceMarket: ReinsuranceMarket;
  summary: Summary;
  generatedAt: string;
}

// ── Static Data ──

const SPONSORS = [
  'Swiss Re', 'Munich Re', 'Chubb', 'USAA', 'Tokio Marine',
  'Everest Re', 'Hannover Re', 'Allianz', 'AIG', 'Zurich',
  'RenaissanceRe', 'SCOR', 'PartnerRe', 'Arch Capital', 'Berkshire Hathaway',
] as const;

const PERILS = ['Hurricane', 'Earthquake', 'Wildfire', 'Flood', 'Pandemic', 'Multi-Peril'] as const;

const PERIL_REGIONS: Record<string, readonly string[]> = {
  Hurricane: ['US', 'US', 'Global'],
  Earthquake: ['Japan', 'US', 'Global'],
  Wildfire: ['US', 'Europe', 'Global'],
  Flood: ['Europe', 'US', 'Global'],
  Pandemic: ['Global', 'Global', 'Global'],
  'Multi-Peril': ['US', 'Europe', 'Japan', 'Global'],
};

const TRIGGER_TYPES = ['indemnity', 'parametric', 'index', 'modeled loss'] as const;
const RATINGS = ['BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'NR'] as const;

const BOND_NAMES = [
  'Residential Re', 'Citrus Re', 'Pelican Re', 'Galileo Re', 'Kilimanjaro Re',
  'Everglades Re', 'Sakura Re', 'Atlas Re', 'Caelus Re', 'Frontline Re',
  'Torrey Pines Re', 'Blue Sky Re', 'Cascade Re', 'Tradewinds Re', 'Solaris Re',
] as const;

const ISSUANCE_NAMES = [
  'Coral Re', 'Zenith Re', 'Pacific Re', 'Ember Re', 'Spectrum Re', 'Pinnacle Re',
] as const;

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: CatBondMarketData; ts: number } | null = null;

// ── Helpers ──

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

// Spread correlates with expected loss: higher EL -> wider spread
function spreadFromEL(el: number, rng: () => number): number {
  // Base multiplier: ~100-120x EL in bps, clamped to 400-800 range
  const base = el * 110;
  const noisy = jitter(Math.max(400, Math.min(800, base)), 0.10, rng);
  return Math.round(noisy);
}

// ── Generator ──

function generate(): CatBondMarketData {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-catastrophe-bond'));
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // ── 1. Outstanding Bonds (15) ──
  const outstandingBonds: OutstandingBond[] = BOND_NAMES.map((baseName, i) => {
    const vintage = currentYear - Math.floor(rng() * 3);
    const series = Math.floor(rng() * 3) + 1;
    const name = `${baseName} ${vintage}-${series}`;
    const sponsor = SPONSORS[i % SPONSORS.length];

    const peril = pick(PERILS, rng);
    const region = pick(PERIL_REGIONS[peril], rng);

    const size = Math.round(rangef(75, 500, rng));
    const expectedLoss = round(rangef(1.0, 5.0, rng), 2);
    const spread = spreadFromEL(expectedLoss, rng);
    const coupon = `SOFR + ${spread}bps`;

    const triggerType = pick([...TRIGGER_TYPES], rng);

    const tenorYears = Math.floor(rangef(2, 5, rng));
    const maturityYear = vintage + tenorYears;
    const maturityMonth = String(Math.floor(rng() * 12) + 1).padStart(2, '0');
    const maturity = `${maturityYear}-${maturityMonth}-15`;

    // Rating correlates with expected loss
    let rating: string;
    if (expectedLoss < 1.5) rating = pick(['BB+', 'BB'] as const, rng);
    else if (expectedLoss < 2.5) rating = pick(['BB', 'BB-'] as const, rng);
    else if (expectedLoss < 3.5) rating = pick(['BB-', 'B+'] as const, rng);
    else if (expectedLoss < 4.5) rating = pick(['B+', 'B'] as const, rng);
    else rating = pick(['B', 'B-', 'NR'] as const, rng);

    const price = round(rangef(95, 105, rng), 2);

    return { name, sponsor, peril, region, size, coupon, expectedLoss, spread, price, rating, maturity, triggerType };
  });

  // ── 2. New Issuance (6) ──
  const newIssuance: NewIssuance[] = ISSUANCE_NAMES.map((baseName, i) => {
    const name = `${baseName} ${currentYear}-${i + 1}`;
    const sponsor = pick(SPONSORS, rng);
    const peril = pick(PERILS, rng);
    const size = Math.round(rangef(100, 450, rng));
    const expectedLoss = round(rangef(1.0, 4.5, rng), 2);
    const spread = spreadFromEL(expectedLoss, rng);
    const triggerType = pick([...TRIGGER_TYPES], rng);

    // Placement date within last 90 days
    const daysAgo = Math.floor(rng() * 90);
    const placementDate = new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);

    return { name, sponsor, peril, size, spread, expectedLoss, triggerType, placementDate };
  });

  // ── 3. Peril Exposure (6 perils) ──
  const perilExposure: PerilExposure[] = PERILS.map(peril => {
    const matchingBonds = outstandingBonds.filter(b => b.peril === peril);
    const bondCount = matchingBonds.length;

    // Total exposure in billions: scale from bond-level sizes, add broader market component
    const bondSizeTotal = matchingBonds.reduce((s, b) => s + b.size, 0);
    // Market has ~$45B outstanding across all perils; Hurricane ~40%, Earthquake ~20%, etc.
    const perilWeights: Record<string, number> = {
      Hurricane: 0.38, Earthquake: 0.20, Wildfire: 0.12,
      Flood: 0.10, Pandemic: 0.08, 'Multi-Peril': 0.12,
    };
    const totalExposure = round(jitter(45 * (perilWeights[peril] || 0.10), 0.12, rng), 1);

    const avgSpread = bondCount > 0
      ? Math.round(matchingBonds.reduce((s, b) => s + b.spread, 0) / bondCount)
      : Math.round(rangef(450, 650, rng));

    const avgExpectedLoss = bondCount > 0
      ? round(matchingBonds.reduce((s, b) => s + b.expectedLoss, 0) / bondCount, 2)
      : round(rangef(1.5, 3.5, rng), 2);

    const largestSingleExposure = bondCount > 0
      ? Math.max(...matchingBonds.map(b => b.size)) / 1000
      : round(rangef(0.2, 0.5, rng), 2);

    return {
      peril,
      totalExposure,
      avgSpread,
      avgExpectedLoss,
      bondCount: bondCount || Math.floor(rangef(2, 8, rng)),
      largestSingleExposure: round(largestSingleExposure, 2),
    };
  });

  // ── 4. Market Indices ──
  const swissReBaseLevel = 380; // Swiss Re Global Cat Bond Index
  const swissReLevel = round(jitter(swissReBaseLevel, 0.04, rng), 1);
  const artemisBaseLevel = 265; // Artemis ILS Index
  const artemisLevel = round(jitter(artemisBaseLevel, 0.04, rng), 1);

  const marketIndices: MarketIndices = {
    swissReCatBondIndex: {
      level: swissReLevel,
      return1M: round(rangef(0.5, 1.8, rng), 2),
      returnYTD: round(rangef(2.0, 8.0, rng), 2),
      totalReturn1Y: round(rangef(10, 16, rng), 2),
    },
    artemisILSIndex: {
      level: artemisLevel,
      return1M: round(rangef(0.4, 1.5, rng), 2),
      returnYTD: round(rangef(1.8, 7.0, rng), 2),
    },
  };

  // ── 5. Seasonal Risk ──
  // Hurricane season: Jun 1 - Nov 30
  let hurricaneSeason: SeasonalRisk['hurricaneSeason'];
  if (currentMonth >= 5 && currentMonth <= 10) hurricaneSeason = 'active';
  else if (currentMonth === 4) hurricaneSeason = 'approaching';
  else hurricaneSeason = 'inactive';

  // Wildfire season: roughly May - October in western US
  let wildfireSeason: SeasonalRisk['wildfireSeason'];
  if (currentMonth >= 4 && currentMonth <= 9) wildfireSeason = 'active';
  else if (currentMonth === 3 || currentMonth === 10) wildfireSeason = 'approaching';
  else wildfireSeason = 'inactive';

  const seasonalRisk: SeasonalRisk = {
    hurricaneSeason,
    earthquakeRecent: Math.floor(rangef(0, 8, rng)),
    wildfireSeason,
    floodRisk: pick(['elevated', 'normal', 'low'] as const, rng),
  };

  // ── 6. Reinsurance Market ──
  const reinsuranceMarket: ReinsuranceMarket = {
    globalPropertyCatRoL: round(rangef(6.0, 10.0, rng), 1),
    rateTrend: pick(['hardening', 'softening', 'stable'] as const, rng),
    capacityBn: round(rangef(380, 450, rng), 0),
    retrocessionSpread: Math.round(rangef(600, 1100, rng)),
  };

  // ── 7. Summary ──
  const totalMarketSize = round(jitter(45, 0.08, rng), 1);
  const ytdIssuance = round(jitter(12.5, 0.15, rng), 1);
  const avgSpread = Math.round(outstandingBonds.reduce((s, b) => s + b.spread, 0) / outstandingBonds.length);
  const avgExpectedLoss = round(outstandingBonds.reduce((s, b) => s + b.expectedLoss, 0) / outstandingBonds.length, 2);

  // Find the next maturity date
  const sortedMaturities = outstandingBonds
    .map(b => b.maturity)
    .filter(m => m > day)
    .sort();
  const nextMajorMaturity = sortedMaturities[0] || outstandingBonds[0].maturity;

  const summary: Summary = {
    totalMarketSize,
    ytdIssuance,
    avgSpread,
    avgExpectedLoss,
    returnYTD: marketIndices.swissReCatBondIndex.returnYTD,
    nextMajorMaturity,
  };

  return {
    outstandingBonds,
    newIssuance,
    perilExposure,
    marketIndices,
    seasonalRisk,
    reinsuranceMarket,
    summary,
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
    console.error('[CatastropheBond] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate catastrophe bond market data' });
  }
});

export default router;
