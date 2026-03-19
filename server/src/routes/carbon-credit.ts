import { Router } from 'express';

const router = Router();

// -- Deterministic seeded RNG --

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
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// -- Types --

interface ComplianceMarket {
  market: string;
  price: number;
  change1D: number;
  change1M: number;
  volume: number;
  marketCap: number;
  phase: string;
}

interface VoluntaryMarket {
  standard: string;
  avgPrice: number;
  volumeYTD: number;
  retirements: number;
  vintageAvg: number;
  quality: 'high' | 'medium' | 'variable';
}

interface CarbonFuture {
  contract: string;
  price: number;
  change1D: number;
  openInterest: number;
  contango: number;
  expiry: string;
}

interface ProjectType {
  type: string;
  avgPrice: number;
  issuanceShare: number;
  credibility: 'high' | 'moderate' | 'questioned';
  growthRate: number;
}

interface RegulatoryUpdate {
  date: string;
  jurisdiction: string;
  update: string;
  impact: 'bullish' | 'bearish' | 'neutral';
  priceImpact: number;
}

interface MarketMetrics {
  totalComplianceValue: number;
  totalVoluntaryValue: number;
  globalCoverage: number;
  avgImpliedCarbonPrice: number;
  netZeroAlignedPrice: number;
}

interface CarbonCreditResponse {
  complianceMarkets: ComplianceMarket[];
  voluntaryMarkets: VoluntaryMarket[];
  carbonFutures: CarbonFuture[];
  projectTypes: ProjectType[];
  regulatoryUpdates: RegulatoryUpdate[];
  marketMetrics: MarketMetrics;
  generatedAt: string;
}

// -- Compliance market configurations --

interface ComplianceConfig {
  market: string;
  priceRange: [number, number];
  volumeRange: [number, number];
  marketCapRange: [number, number];
  phase: string;
}

const COMPLIANCE_CONFIGS: ComplianceConfig[] = [
  { market: 'EU ETS', priceRange: [80, 120], volumeRange: [25, 45], marketCapRange: [280, 380], phase: 'Phase 4 (2021-2030)' },
  { market: 'UK ETS', priceRange: [50, 90], volumeRange: [4, 8], marketCapRange: [18, 30], phase: 'Phase 1 (2021-2030)' },
  { market: 'California Cap-and-Trade', priceRange: [30, 50], volumeRange: [8, 15], marketCapRange: [40, 65], phase: 'Third Compliance Period' },
  { market: 'RGGI', priceRange: [12, 20], volumeRange: [3, 7], marketCapRange: [5, 12], phase: 'Control Period 4' },
  { market: 'China ETS', priceRange: [8, 15], volumeRange: [15, 30], marketCapRange: [12, 25], phase: 'National Phase 2' },
];

// -- Voluntary market configurations --

interface VoluntaryConfig {
  standard: string;
  priceRange: [number, number];
  volumeRange: [number, number];
  retirementRange: [number, number];
  vintageRange: [number, number];
  quality: 'high' | 'medium' | 'variable';
}

const VOLUNTARY_CONFIGS: VoluntaryConfig[] = [
  { standard: 'Verra VCS', priceRange: [5, 18], volumeRange: [120, 200], retirementRange: [80, 140], vintageRange: [2019, 2023], quality: 'variable' },
  { standard: 'Gold Standard', priceRange: [12, 30], volumeRange: [30, 60], retirementRange: [20, 45], vintageRange: [2020, 2023], quality: 'high' },
  { standard: 'ACR', priceRange: [8, 22], volumeRange: [15, 35], retirementRange: [10, 25], vintageRange: [2019, 2022], quality: 'medium' },
  { standard: 'CAR', priceRange: [10, 25], volumeRange: [8, 20], retirementRange: [5, 15], vintageRange: [2018, 2022], quality: 'medium' },
];

// -- Carbon futures configurations --

interface FutureConfig {
  contract: string;
  priceRange: [number, number];
  oiRange: [number, number];
  contangoRange: [number, number];
  expiry: string;
}

const FUTURE_CONFIGS: FutureConfig[] = [
  { contract: 'EUA Dec-26', priceRange: [82, 125], oiRange: [380, 520], contangoRange: [1.2, 4.5], expiry: '2026-12-15' },
  { contract: 'EUA Dec-27', priceRange: [88, 135], oiRange: [180, 310], contangoRange: [2.5, 7.0], expiry: '2027-12-15' },
  { contract: 'CCA Dec-26', priceRange: [32, 52], oiRange: [90, 160], contangoRange: [0.8, 3.2], expiry: '2026-12-16' },
  { contract: 'UKA Dec-26', priceRange: [52, 95], oiRange: [60, 120], contangoRange: [1.5, 5.0], expiry: '2026-12-15' },
];

// -- Project type configurations --

interface ProjectConfig {
  type: string;
  priceRange: [number, number];
  shareRange: [number, number];
  credibility: 'high' | 'moderate' | 'questioned';
  growthRange: [number, number];
}

const PROJECT_CONFIGS: ProjectConfig[] = [
  { type: 'Renewable Energy', priceRange: [3, 10], shareRange: [25, 35], credibility: 'moderate', growthRange: [-5, 5] },
  { type: 'Forestry/REDD+', priceRange: [8, 22], shareRange: [20, 30], credibility: 'questioned', growthRange: [-10, 8] },
  { type: 'Methane Capture', priceRange: [12, 28], shareRange: [8, 15], credibility: 'high', growthRange: [10, 25] },
  { type: 'Direct Air Capture', priceRange: [200, 600], shareRange: [1, 3], credibility: 'high', growthRange: [40, 80] },
  { type: 'Cookstoves', priceRange: [4, 12], shareRange: [8, 14], credibility: 'questioned', growthRange: [-8, 5] },
  { type: 'Blue Carbon', priceRange: [15, 35], shareRange: [2, 6], credibility: 'moderate', growthRange: [15, 40] },
];

// -- Regulatory update templates --

interface RegUpdateTemplate {
  jurisdiction: string;
  update: string;
  impact: 'bullish' | 'bearish' | 'neutral';
  priceImpactRange: [number, number];
}

const REGULATORY_TEMPLATES: RegUpdateTemplate[] = [
  { jurisdiction: 'European Union', update: 'EU ETS Phase 4 cap reduction accelerated — tighter allowance supply from 2027', impact: 'bullish', priceImpactRange: [3.0, 8.5] },
  { jurisdiction: 'European Union', update: 'CBAM transitional reporting requirements expanded to include indirect emissions', impact: 'bullish', priceImpactRange: [1.5, 5.0] },
  { jurisdiction: 'United States', update: 'EPA finalizes methane emissions reporting rule for oil and gas sector', impact: 'neutral', priceImpactRange: [-1.0, 2.0] },
  { jurisdiction: 'California', update: 'CARB proposes extending cap-and-trade program to 2045 with stricter benchmarks', impact: 'bullish', priceImpactRange: [2.0, 6.0] },
  { jurisdiction: 'China', update: 'MEE announces expansion of national ETS to cement and aluminum sectors', impact: 'bullish', priceImpactRange: [1.0, 4.5] },
  { jurisdiction: 'United Kingdom', update: 'UK ETS Authority reviews free allocation methodology — potential reduction', impact: 'bullish', priceImpactRange: [2.5, 7.0] },
  { jurisdiction: 'ICVCM', update: 'Core Carbon Principles assessment framework delays impact voluntary credit pricing', impact: 'bearish', priceImpactRange: [-5.0, -1.5] },
  { jurisdiction: 'Australia', update: 'Safeguard Mechanism credit issuance data shows lower-than-expected supply', impact: 'bullish', priceImpactRange: [1.0, 3.5] },
  { jurisdiction: 'South Korea', update: 'K-ETS third allocation plan released with 4.4% annual cap reduction', impact: 'neutral', priceImpactRange: [-0.5, 2.0] },
];

// -- Cache --

const CACHE_TTL = 5 * 60_000;
let cache: { data: CarbonCreditResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

// -- Data generation --

function generate(): CarbonCreditResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('carbon-credit-' + today));

  const lerp = (min: number, max: number) => min + rng() * (max - min);

  // -- 1. Compliance Markets --

  const complianceMarkets: ComplianceMarket[] = COMPLIANCE_CONFIGS.map((cfg) => {
    const price = round(lerp(cfg.priceRange[0], cfg.priceRange[1]), 2);
    const change1D = round(lerp(-3.5, 3.5), 2);
    const change1M = round(lerp(-8.0, 10.0), 2);
    const volume = round(lerp(cfg.volumeRange[0], cfg.volumeRange[1]), 2);
    const marketCap = round(lerp(cfg.marketCapRange[0], cfg.marketCapRange[1]), 1);

    return {
      market: cfg.market,
      price,
      change1D,
      change1M,
      volume,
      marketCap,
      phase: cfg.phase,
    };
  });

  // -- 2. Voluntary Markets --

  const voluntaryMarkets: VoluntaryMarket[] = VOLUNTARY_CONFIGS.map((cfg) => {
    const avgPrice = round(lerp(cfg.priceRange[0], cfg.priceRange[1]), 2);
    const volumeYTD = round(lerp(cfg.volumeRange[0], cfg.volumeRange[1]), 1);
    const retirements = round(lerp(cfg.retirementRange[0], cfg.retirementRange[1]), 1);
    const vintageAvg = Math.round(lerp(cfg.vintageRange[0], cfg.vintageRange[1]));

    return {
      standard: cfg.standard,
      avgPrice,
      volumeYTD,
      retirements,
      vintageAvg,
      quality: cfg.quality,
    };
  });

  // -- 3. Carbon Futures --

  const carbonFutures: CarbonFuture[] = FUTURE_CONFIGS.map((cfg) => {
    const price = round(lerp(cfg.priceRange[0], cfg.priceRange[1]), 2);
    const change1D = round(lerp(-3.0, 3.0), 2);
    const openInterest = round(lerp(cfg.oiRange[0], cfg.oiRange[1]), 1);
    const contango = round(lerp(cfg.contangoRange[0], cfg.contangoRange[1]), 2);

    return {
      contract: cfg.contract,
      price,
      change1D,
      openInterest,
      contango,
      expiry: cfg.expiry,
    };
  });

  // -- 4. Project Types --

  const rawShares = PROJECT_CONFIGS.map((cfg) => lerp(cfg.shareRange[0], cfg.shareRange[1]));
  const shareTotal = rawShares.reduce((sum, s) => sum + s, 0);

  const projectTypes: ProjectType[] = PROJECT_CONFIGS.map((cfg, i) => {
    const avgPrice = round(lerp(cfg.priceRange[0], cfg.priceRange[1]), 2);
    const issuanceShare = round((rawShares[i] / shareTotal) * 100, 1);
    const growthRate = round(lerp(cfg.growthRange[0], cfg.growthRange[1]), 1);

    return {
      type: cfg.type,
      avgPrice,
      issuanceShare,
      credibility: cfg.credibility,
      growthRate,
    };
  });

  // Fix rounding residual on first project type
  const shareNormTotal = projectTypes.reduce((sum, p) => sum + p.issuanceShare, 0);
  projectTypes[0].issuanceShare = round(projectTypes[0].issuanceShare + (100 - shareNormTotal), 1);

  // -- 5. Regulatory Updates --

  const shuffled = [...REGULATORY_TEMPLATES].sort(() => rng() - 0.5);
  const selectedUpdates = shuffled.slice(0, 3);

  const regulatoryUpdates: RegulatoryUpdate[] = selectedUpdates.map((tmpl, i) => {
    const daysAgo = Math.floor(lerp(1, 30)) + i * 10;
    const updateDate = new Date();
    updateDate.setDate(updateDate.getDate() - daysAgo);
    const priceImpact = round(lerp(tmpl.priceImpactRange[0], tmpl.priceImpactRange[1]), 1);

    return {
      date: updateDate.toISOString().slice(0, 10),
      jurisdiction: tmpl.jurisdiction,
      update: tmpl.update,
      impact: tmpl.impact,
      priceImpact,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // -- 6. Market Metrics --

  const totalComplianceValue = round(complianceMarkets.reduce((sum, m) => sum + m.marketCap, 0), 1);
  const totalVoluntaryValue = round(lerp(1.5, 3.5), 1);
  const globalCoverage = round(clamp(lerp(21, 28), 21, 28), 1);
  const avgImpliedCarbonPrice = round(
    complianceMarkets.reduce((sum, m) => sum + m.price, 0) / complianceMarkets.length,
    2
  );
  const netZeroAlignedPrice = round(lerp(100, 200), 0);

  const marketMetrics: MarketMetrics = {
    totalComplianceValue,
    totalVoluntaryValue,
    globalCoverage,
    avgImpliedCarbonPrice,
    netZeroAlignedPrice,
  };

  return {
    complianceMarkets,
    voluntaryMarkets,
    carbonFutures,
    projectTypes,
    regulatoryUpdates,
    marketMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

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
    console.error('[CarbonCredit] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate carbon credit data' });
  }
});

export default router;
