import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

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

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Types ──

interface MarketOverview {
  totalOutstandingTrillions: number;
  ytdIssuanceBillions: number;
  avgYieldPct: number;
  avgSpreadBps: number;
  greeniumBps: number;
  totalIssuers: number;
}

interface RecentIssuance {
  issuer: string;
  country: string;
  sizeMillions: number;
  currency: string;
  couponPct: number;
  tenor: string;
  spreadBps: number;
  rating: string;
  useOfProceeds: string;
  verifier: string;
  framework: string;
}

interface TopIssuer {
  issuer: string;
  country: string;
  type: string;
  totalOutstandingBillions: number;
  bondCount: number;
  avgCouponPct: number;
  avgRating: string;
}

interface SectorAllocation {
  sector: string;
  weightPct: number;
  totalAmountBillions: number;
  avgSpreadBps: number;
  bondCount: number;
}

interface UseOfProceeds {
  category: string;
  allocationPct: number;
  totalAmountBillions: number;
}

interface RegionBreakdown {
  region: string;
  issuanceBillions: number;
  outstandingBillions: number;
  weightPct: number;
}

interface IndexData {
  level: number;
  return1MPct: number;
  returnYTDPct: number;
}

interface GreenBondIndices {
  bloombergGreenBond: IndexData;
  iceBofAGreen: IndexData;
  sp500GreenBond: IndexData;
}

interface Summary {
  greeniumBps: number;
  ytdGrowthPct: number;
  largestIssuer: string;
  largestDeal: string;
  avgCouponPct: number;
  sdgAlignment: string;
}

interface GreenBondResponse {
  marketOverview: MarketOverview;
  recentIssuance: RecentIssuance[];
  topIssuers: TopIssuer[];
  sectorAllocation: SectorAllocation[];
  useOfProceeds: UseOfProceeds[];
  regionBreakdown: RegionBreakdown[];
  greenBondIndices: GreenBondIndices;
  summary: Summary;
  generatedAt: string;
}

// ── Seed Data ──

const ISSUERS_POOL: { issuer: string; country: string; currency: string; rating: string }[] = [
  { issuer: 'Republic of France', country: 'France', currency: 'EUR', rating: 'AA' },
  { issuer: 'Federal Republic of Germany', country: 'Germany', currency: 'EUR', rating: 'AAA' },
  { issuer: 'Kingdom of Belgium', country: 'Belgium', currency: 'EUR', rating: 'AA-' },
  { issuer: 'European Investment Bank', country: 'Supranational', currency: 'EUR', rating: 'AAA' },
  { issuer: 'KfW', country: 'Germany', currency: 'EUR', rating: 'AAA' },
  { issuer: 'Iberdrola', country: 'Spain', currency: 'EUR', rating: 'BBB+' },
  { issuer: 'Enel Finance', country: 'Italy', currency: 'EUR', rating: 'BBB+' },
  { issuer: 'Apple Inc.', country: 'United States', currency: 'USD', rating: 'AA+' },
  { issuer: 'Bank of China', country: 'China', currency: 'CNY', rating: 'A' },
  { issuer: 'Industrial & Commercial Bank of China', country: 'China', currency: 'USD', rating: 'A' },
  { issuer: 'World Bank (IBRD)', country: 'Supranational', currency: 'USD', rating: 'AAA' },
  { issuer: 'Toyota Motor Credit', country: 'Japan', currency: 'JPY', rating: 'A+' },
  { issuer: 'Engie SA', country: 'France', currency: 'EUR', rating: 'BBB+' },
  { issuer: 'Orsted', country: 'Denmark', currency: 'EUR', rating: 'BBB+' },
  { issuer: 'Republic of Korea', country: 'South Korea', currency: 'KRW', rating: 'AA' },
  { issuer: 'Government of Japan', country: 'Japan', currency: 'JPY', rating: 'A+' },
  { issuer: 'NextEra Energy Capital', country: 'United States', currency: 'USD', rating: 'A-' },
  { issuer: 'Asian Development Bank', country: 'Supranational', currency: 'USD', rating: 'AAA' },
  { issuer: 'BNP Paribas', country: 'France', currency: 'EUR', rating: 'A+' },
  { issuer: 'HSBC Holdings', country: 'United Kingdom', currency: 'GBP', rating: 'A-' },
];

const TOP_ISSUERS_POOL: { issuer: string; country: string; type: string; baseOutstanding: number; baseBondCount: number; baseCoupon: number; rating: string }[] = [
  { issuer: 'Republic of France (OAT Verte)', country: 'France', type: 'sovereign', baseOutstanding: 63.2, baseBondCount: 5, baseCoupon: 1.75, rating: 'AA' },
  { issuer: 'Federal Republic of Germany', country: 'Germany', type: 'sovereign', baseOutstanding: 58.5, baseBondCount: 8, baseCoupon: 1.55, rating: 'AAA' },
  { issuer: 'European Investment Bank', country: 'Supranational', type: 'supranational', baseOutstanding: 52.8, baseBondCount: 42, baseCoupon: 2.10, rating: 'AAA' },
  { issuer: 'KfW', country: 'Germany', type: 'agency', baseOutstanding: 48.3, baseBondCount: 35, baseCoupon: 1.85, rating: 'AAA' },
  { issuer: 'World Bank (IBRD)', country: 'Supranational', type: 'supranational', baseOutstanding: 42.1, baseBondCount: 55, baseCoupon: 2.35, rating: 'AAA' },
  { issuer: 'Republic of Korea', country: 'South Korea', type: 'sovereign', baseOutstanding: 28.6, baseBondCount: 4, baseCoupon: 2.80, rating: 'AA' },
  { issuer: 'Government of Japan', country: 'Japan', type: 'sovereign', baseOutstanding: 25.4, baseBondCount: 6, baseCoupon: 0.75, rating: 'A+' },
  { issuer: 'Iberdrola', country: 'Spain', type: 'corporate', baseOutstanding: 22.8, baseBondCount: 18, baseCoupon: 3.15, rating: 'BBB+' },
  { issuer: 'Enel Finance', country: 'Italy', type: 'corporate', baseOutstanding: 19.5, baseBondCount: 15, baseCoupon: 3.40, rating: 'BBB+' },
  { issuer: 'Engie SA', country: 'France', type: 'corporate', baseOutstanding: 17.2, baseBondCount: 12, baseCoupon: 2.95, rating: 'BBB+' },
  { issuer: 'BNP Paribas', country: 'France', type: 'corporate', baseOutstanding: 15.8, baseBondCount: 10, baseCoupon: 3.25, rating: 'A+' },
  { issuer: 'Asian Development Bank', country: 'Supranational', type: 'supranational', baseOutstanding: 14.6, baseBondCount: 28, baseCoupon: 2.50, rating: 'AAA' },
  { issuer: 'State of New York', country: 'United States', type: 'municipal', baseOutstanding: 12.4, baseBondCount: 22, baseCoupon: 3.80, rating: 'AA' },
  { issuer: 'Apple Inc.', country: 'United States', type: 'corporate', baseOutstanding: 11.8, baseBondCount: 6, baseCoupon: 2.85, rating: 'AA+' },
  { issuer: 'NRW.BANK', country: 'Germany', type: 'agency', baseOutstanding: 10.5, baseBondCount: 14, baseCoupon: 1.65, rating: 'AAA' },
];

const USE_OF_PROCEEDS_CATEGORIES = ['Renewable Energy', 'Energy Efficiency', 'Clean Transport', 'Green Buildings', 'Water Management', 'Waste Management'] as const;

const VERIFIERS = ['Sustainalytics', 'Cicero', 'Vigeo Eiris', 'ISS ESG', 'S&P Global', 'DNVGL'];
const FRAMEWORKS = ['ICMA', 'CBI', 'EU Taxonomy'] as const;
const TENORS = ['3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];

const SECTOR_SEEDS: { sector: string; baseWeight: number; baseAmount: number; baseSpread: number; baseBondCount: number }[] = [
  { sector: 'Sovereign', baseWeight: 28.5, baseAmount: 712, baseSpread: 32, baseBondCount: 85 },
  { sector: 'Utilities', baseWeight: 18.2, baseAmount: 455, baseSpread: 78, baseBondCount: 210 },
  { sector: 'Financials', baseWeight: 16.8, baseAmount: 420, baseSpread: 65, baseBondCount: 185 },
  { sector: 'Real Estate', baseWeight: 10.5, baseAmount: 262, baseSpread: 95, baseBondCount: 120 },
  { sector: 'Transport', baseWeight: 8.7, baseAmount: 217, baseSpread: 88, baseBondCount: 95 },
  { sector: 'Technology', baseWeight: 6.3, baseAmount: 157, baseSpread: 72, baseBondCount: 45 },
  { sector: 'Industrial', baseWeight: 5.8, baseAmount: 145, baseSpread: 105, baseBondCount: 68 },
  { sector: 'Supranational', baseWeight: 5.2, baseAmount: 130, baseSpread: 18, baseBondCount: 142 },
];

const REGION_SEEDS: { region: string; baseIssuance: number; baseOutstanding: number; baseWeight: number }[] = [
  { region: 'Europe', baseIssuance: 195, baseOutstanding: 1225, baseWeight: 49.0 },
  { region: 'Asia Pacific', baseIssuance: 98, baseOutstanding: 580, baseWeight: 23.2 },
  { region: 'North America', baseIssuance: 62, baseOutstanding: 385, baseWeight: 15.4 },
  { region: 'Latin America', baseIssuance: 18, baseOutstanding: 105, baseWeight: 4.2 },
  { region: 'Middle East/Africa', baseIssuance: 12, baseOutstanding: 72, baseWeight: 2.9 },
  { region: 'Supranational', baseIssuance: 28, baseOutstanding: 133, baseWeight: 5.3 },
];

// ── Data Generation ──

function generateMarketOverview(rng: () => number): MarketOverview {
  const totalOutstanding = roundTo(2.35 + (rng() - 0.5) * 0.3, 2);
  const ytdIssuance = roundTo(380 + (rng() - 0.5) * 80, 1);
  const avgYield = roundTo(3.5 + (rng() - 0.5) * 1.0, 2);
  const avgSpread = roundTo(55 + (rng() - 0.5) * 20, 0);
  // Greenium: negative means green bonds price tighter (-3 to -8 bps)
  const greenium = roundTo(-3 - rng() * 5, 1);
  const totalIssuers = Math.round(1250 + (rng() - 0.5) * 200);

  return {
    totalOutstandingTrillions: totalOutstanding,
    ytdIssuanceBillions: ytdIssuance,
    avgYieldPct: avgYield,
    avgSpreadBps: avgSpread,
    greeniumBps: greenium,
    totalIssuers,
  };
}

function generateRecentIssuance(rng: () => number): RecentIssuance[] {
  const shuffled = [...ISSUERS_POOL].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 12);

  return selected.map((issuerData) => {
    const sizeBase = issuerData.rating.startsWith('AAA') || issuerData.rating.startsWith('AA') ? 1500 : 750;
    const size = roundTo(sizeBase * (0.3 + rng() * 1.4), 0);
    const coupon = roundTo(1.5 + rng() * 3.5, 3);
    const spread = roundTo(15 + rng() * 130, 0);
    const tenor = pick(TENORS, rng);
    const useOfProceeds = pick([...USE_OF_PROCEEDS_CATEGORIES], rng);
    const verifier = pick(VERIFIERS, rng);
    const framework = pick([...FRAMEWORKS], rng);

    return {
      issuer: issuerData.issuer,
      country: issuerData.country,
      sizeMillions: size,
      currency: issuerData.currency,
      couponPct: coupon,
      tenor,
      spreadBps: spread,
      rating: issuerData.rating,
      useOfProceeds,
      verifier,
      framework,
    };
  });
}

function generateTopIssuers(rng: () => number): TopIssuer[] {
  return TOP_ISSUERS_POOL.map((seed) => {
    const outstandingJitter = (rng() - 0.5) * seed.baseOutstanding * 0.08;
    const bondCountJitter = Math.round((rng() - 0.5) * seed.baseBondCount * 0.1);
    const couponJitter = (rng() - 0.5) * 0.3;

    return {
      issuer: seed.issuer,
      country: seed.country,
      type: seed.type,
      totalOutstandingBillions: roundTo(Math.max(1, seed.baseOutstanding + outstandingJitter), 1),
      bondCount: Math.max(1, seed.baseBondCount + bondCountJitter),
      avgCouponPct: roundTo(Math.max(0.1, seed.baseCoupon + couponJitter), 2),
      avgRating: seed.rating,
    };
  });
}

function generateSectorAllocation(rng: () => number): SectorAllocation[] {
  const raw = SECTOR_SEEDS.map((seed) => {
    const weightJitter = (rng() - 0.5) * seed.baseWeight * 0.06;
    const amountJitter = (rng() - 0.5) * seed.baseAmount * 0.08;
    const spreadJitter = (rng() - 0.5) * seed.baseSpread * 0.1;
    const bondCountJitter = Math.round((rng() - 0.5) * seed.baseBondCount * 0.1);

    return {
      sector: seed.sector,
      rawWeight: Math.max(0.5, seed.baseWeight + weightJitter),
      totalAmountBillions: roundTo(Math.max(10, seed.baseAmount + amountJitter), 1),
      avgSpreadBps: roundTo(Math.max(5, seed.baseSpread + spreadJitter), 0),
      bondCount: Math.max(5, seed.baseBondCount + bondCountJitter),
    };
  });

  // Normalize weights to sum to 100
  const totalWeight = raw.reduce((sum, s) => sum + s.rawWeight, 0);
  return raw.map((s) => ({
    sector: s.sector,
    weightPct: roundTo((s.rawWeight / totalWeight) * 100, 1),
    totalAmountBillions: s.totalAmountBillions,
    avgSpreadBps: s.avgSpreadBps,
    bondCount: s.bondCount,
  }));
}

function generateUseOfProceeds(rng: () => number): UseOfProceeds[] {
  const baseAllocations = [
    { category: 'Renewable Energy', baseAlloc: 34, baseAmount: 850 },
    { category: 'Energy Efficiency', baseAlloc: 22, baseAmount: 550 },
    { category: 'Clean Transport', baseAlloc: 16, baseAmount: 400 },
    { category: 'Green Buildings', baseAlloc: 14, baseAmount: 350 },
    { category: 'Water Management', baseAlloc: 9, baseAmount: 225 },
    { category: 'Waste Management', baseAlloc: 5, baseAmount: 125 },
  ];

  const raw = baseAllocations.map((b) => {
    const allocJitter = (rng() - 0.5) * b.baseAlloc * 0.08;
    const amountJitter = (rng() - 0.5) * b.baseAmount * 0.08;
    return {
      category: b.category,
      rawAlloc: Math.max(1, b.baseAlloc + allocJitter),
      totalAmountBillions: roundTo(Math.max(10, b.baseAmount + amountJitter), 1),
    };
  });

  const totalAlloc = raw.reduce((sum, r) => sum + r.rawAlloc, 0);
  return raw.map((r) => ({
    category: r.category,
    allocationPct: roundTo((r.rawAlloc / totalAlloc) * 100, 1),
    totalAmountBillions: r.totalAmountBillions,
  }));
}

function generateRegionBreakdown(rng: () => number): RegionBreakdown[] {
  const raw = REGION_SEEDS.map((seed) => {
    const issuanceJitter = (rng() - 0.5) * seed.baseIssuance * 0.1;
    const outstandingJitter = (rng() - 0.5) * seed.baseOutstanding * 0.06;
    const weightJitter = (rng() - 0.5) * seed.baseWeight * 0.06;

    return {
      region: seed.region,
      issuanceBillions: roundTo(Math.max(5, seed.baseIssuance + issuanceJitter), 1),
      outstandingBillions: roundTo(Math.max(20, seed.baseOutstanding + outstandingJitter), 1),
      rawWeight: Math.max(1, seed.baseWeight + weightJitter),
    };
  });

  const totalWeight = raw.reduce((sum, r) => sum + r.rawWeight, 0);
  return raw.map((r) => ({
    region: r.region,
    issuanceBillions: r.issuanceBillions,
    outstandingBillions: r.outstandingBillions,
    weightPct: roundTo((r.rawWeight / totalWeight) * 100, 1),
  }));
}

function generateGreenBondIndices(rng: () => number): GreenBondIndices {
  const indexGen = (baseLevel: number): IndexData => ({
    level: roundTo(baseLevel + (rng() - 0.5) * baseLevel * 0.04, 2),
    return1MPct: roundTo((rng() - 0.45) * 3, 2),
    returnYTDPct: roundTo((rng() - 0.4) * 8, 2),
  });

  return {
    bloombergGreenBond: indexGen(124.85),
    iceBofAGreen: indexGen(218.42),
    sp500GreenBond: indexGen(156.30),
  };
}

function generateSummary(rng: () => number, overview: MarketOverview, topIssuers: TopIssuer[], recentIssuance: RecentIssuance[]): Summary {
  const largestIssuer = topIssuers[0]?.issuer ?? 'Republic of France (OAT Verte)';
  const largestDeal = recentIssuance.reduce((max, d) => d.sizeMillions > max.sizeMillions ? d : max, recentIssuance[0]);
  const avgCoupon = roundTo(recentIssuance.reduce((sum, d) => sum + d.couponPct, 0) / recentIssuance.length, 2);
  const ytdGrowth = roundTo(8 + (rng() - 0.5) * 12, 1);

  const sdgOptions = [
    'SDG 7 (Affordable & Clean Energy), SDG 13 (Climate Action)',
    'SDG 7 (Affordable & Clean Energy), SDG 11 (Sustainable Cities)',
    'SDG 6 (Clean Water), SDG 7 (Affordable & Clean Energy), SDG 13 (Climate Action)',
    'SDG 9 (Industry & Innovation), SDG 13 (Climate Action)',
  ];

  return {
    greeniumBps: overview.greeniumBps,
    ytdGrowthPct: ytdGrowth,
    largestIssuer,
    largestDeal: `${largestDeal.issuer} ${largestDeal.currency} ${largestDeal.sizeMillions}M ${largestDeal.tenor}`,
    avgCouponPct: avgCoupon,
    sdgAlignment: pick(sdgOptions, rng),
  };
}

// ── Main Generator ──

function generate(): GreenBondResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-green-bond'));

  const marketOverview = generateMarketOverview(rng);
  const recentIssuance = generateRecentIssuance(rng);
  const topIssuers = generateTopIssuers(rng);
  const sectorAllocation = generateSectorAllocation(rng);
  const useOfProceeds = generateUseOfProceeds(rng);
  const regionBreakdown = generateRegionBreakdown(rng);
  const greenBondIndices = generateGreenBondIndices(rng);
  const summary = generateSummary(rng, marketOverview, topIssuers, recentIssuance);

  return {
    marketOverview,
    recentIssuance,
    topIssuers,
    sectorAllocation,
    useOfProceeds,
    regionBreakdown,
    greenBondIndices,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

const CACHE_TTL = 60 * 60_000;
let cache: { data: GreenBondResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GreenBond] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate green bond market data' });
  }
});

export default router;
