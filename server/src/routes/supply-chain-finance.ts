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

interface ProgramData {
  buyer: string;
  programSize: number;
  suppliersEnrolled: number;
  discountRate: number;
  avgTenor: number;
  utilization: number;
  rating: 'AA' | 'A+' | 'A' | 'BBB+';
  platform: string;
}

interface InstrumentType {
  type: string;
  volumeYTD: number;
  avgRate: number;
  growthRate: number;
  avgTenor: number;
}

interface RiskIndicators {
  supplierDefaultRate: number;
  concentrationRisk: 'low' | 'moderate' | 'high';
  paymentDelayIndex: number;
  crossBorderRisk: 'low' | 'moderate' | 'elevated';
  fxExposure: number;
}

interface RegionalBreakdown {
  region: string;
  volume: number;
  growthRate: number;
  avgRate: number;
  digitalAdoption: number;
}

interface TechnologyTrend {
  trend: string;
  adoption: number;
  impact: 'transformative' | 'significant' | 'emerging';
  keyPlayers: string;
}

interface MarketOverview {
  totalMarketSize: number;
  growthRate: number;
  avgDiscountRate: number;
  avgPaymentTerms: number;
  adoptionRate: number;
  digitalPenetration: number;
}

interface SupplyChainFinanceResponse {
  marketOverview: MarketOverview;
  programs: ProgramData[];
  instrumentTypes: InstrumentType[];
  riskIndicators: RiskIndicators;
  regionalBreakdown: RegionalBreakdown[];
  technologyTrends: TechnologyTrend[];
  generatedAt: string;
}

// -- Program configurations --

interface ProgramConfig {
  buyer: string;
  baseProgramSize: number;
  sizeRange: number;
  suppliersRange: [number, number];
  discountRange: [number, number];
  tenorRange: [number, number];
  utilizationRange: [number, number];
  ratings: Array<'AA' | 'A+' | 'A' | 'BBB+'>;
  platforms: string[];
}

const PROGRAM_CONFIGS: ProgramConfig[] = [
  { buyer: 'Apple', baseProgramSize: 18, sizeRange: 4, suppliersRange: [8000, 15000], discountRange: [1.8, 3.2], tenorRange: [60, 90], utilizationRange: [72, 88], ratings: ['AA', 'A+'], platforms: ['Taulia', 'C2FO'] },
  { buyer: 'Walmart', baseProgramSize: 22, sizeRange: 5, suppliersRange: [10000, 15000], discountRange: [2.2, 3.8], tenorRange: [45, 75], utilizationRange: [68, 85], ratings: ['AA', 'A+'], platforms: ['PrimeRevenue', 'Taulia'] },
  { buyer: 'Procter & Gamble', baseProgramSize: 12, sizeRange: 3, suppliersRange: [5000, 10000], discountRange: [2.0, 3.5], tenorRange: [50, 80], utilizationRange: [65, 82], ratings: ['A+', 'AA'], platforms: ['Taulia', 'Tradeshift'] },
  { buyer: 'Unilever', baseProgramSize: 10, sizeRange: 2.5, suppliersRange: [4000, 9000], discountRange: [2.3, 3.8], tenorRange: [55, 85], utilizationRange: [60, 78], ratings: ['A+', 'A'], platforms: ['PrimeRevenue', 'C2FO'] },
  { buyer: 'Toyota', baseProgramSize: 15, sizeRange: 3.5, suppliersRange: [6000, 12000], discountRange: [1.5, 2.8], tenorRange: [45, 70], utilizationRange: [70, 86], ratings: ['AA', 'A+'], platforms: ['Tradeshift', 'Taulia'] },
  { buyer: 'Samsung', baseProgramSize: 14, sizeRange: 3, suppliersRange: [5000, 11000], discountRange: [1.8, 3.2], tenorRange: [50, 75], utilizationRange: [66, 84], ratings: ['A+', 'A'], platforms: ['C2FO', 'PrimeRevenue'] },
  { buyer: 'Siemens', baseProgramSize: 9, sizeRange: 2, suppliersRange: [3000, 7000], discountRange: [2.0, 3.5], tenorRange: [55, 85], utilizationRange: [62, 80], ratings: ['A+', 'A', 'BBB+'], platforms: ['Tradeshift', 'Taulia'] },
  { buyer: 'Nestle', baseProgramSize: 8, sizeRange: 2, suppliersRange: [3500, 8000], discountRange: [2.2, 3.6], tenorRange: [50, 80], utilizationRange: [58, 76], ratings: ['A+', 'AA'], platforms: ['PrimeRevenue', 'C2FO'] },
];

// -- Instrument type configurations --

interface InstrumentConfig {
  type: string;
  baseVolume: number;
  volumeRange: number;
  rateRange: [number, number];
  growthRange: [number, number];
  tenorRange: [number, number];
}

const INSTRUMENT_CONFIGS: InstrumentConfig[] = [
  { type: 'Reverse Factoring', baseVolume: 480, volumeRange: 60, rateRange: [2.0, 3.5], growthRange: [12, 22], tenorRange: [45, 90] },
  { type: 'Dynamic Discounting', baseVolume: 320, volumeRange: 45, rateRange: [1.5, 3.0], growthRange: [15, 28], tenorRange: [10, 45] },
  { type: 'Receivables Financing', baseVolume: 550, volumeRange: 70, rateRange: [2.5, 4.2], growthRange: [8, 16], tenorRange: [30, 90] },
  { type: 'Inventory Finance', baseVolume: 180, volumeRange: 30, rateRange: [3.0, 5.0], growthRange: [6, 14], tenorRange: [60, 120] },
  { type: 'Purchase Order Finance', baseVolume: 140, volumeRange: 25, rateRange: [3.5, 5.5], growthRange: [10, 20], tenorRange: [30, 75] },
];

// -- Regional configurations --

interface RegionalConfig {
  region: string;
  baseVolume: number;
  volumeRange: number;
  growthRange: [number, number];
  rateRange: [number, number];
  digitalRange: [number, number];
}

const REGIONAL_CONFIGS: RegionalConfig[] = [
  { region: 'North America', baseVolume: 620, volumeRange: 80, growthRange: [8, 15], rateRange: [2.5, 4.0], digitalRange: [35, 55] },
  { region: 'Europe', baseVolume: 580, volumeRange: 70, growthRange: [7, 14], rateRange: [2.0, 3.5], digitalRange: [30, 50] },
  { region: 'Asia Pacific', baseVolume: 520, volumeRange: 75, growthRange: [12, 22], rateRange: [2.8, 4.5], digitalRange: [20, 40] },
  { region: 'Latin America', baseVolume: 120, volumeRange: 25, growthRange: [10, 20], rateRange: [4.0, 6.5], digitalRange: [10, 25] },
  { region: 'Middle East & Africa', baseVolume: 60, volumeRange: 15, growthRange: [14, 25], rateRange: [3.5, 5.5], digitalRange: [8, 20] },
];

// -- Technology trend configurations --

interface TrendConfig {
  trend: string;
  baseAdoption: number;
  adoptionRange: number;
  impact: 'transformative' | 'significant' | 'emerging';
  keyPlayers: string;
}

const TREND_CONFIGS: TrendConfig[] = [
  { trend: 'Blockchain/DLT', baseAdoption: 18, adoptionRange: 6, impact: 'transformative', keyPlayers: 'Marco Polo, Contour, Komgo' },
  { trend: 'AI Credit Scoring', baseAdoption: 25, adoptionRange: 8, impact: 'significant', keyPlayers: 'C2FO, Taulia, HighRadius' },
  { trend: 'Real-time Payments', baseAdoption: 32, adoptionRange: 10, impact: 'transformative', keyPlayers: 'SWIFT gpi, Ripple, Visa B2B' },
  { trend: 'ESG-linked SCF', baseAdoption: 12, adoptionRange: 5, impact: 'emerging', keyPlayers: 'HSBC, BNP Paribas, Standard Chartered' },
];

// -- Cache --

const CACHE_TTL = 5 * 60_000;
let cache: { data: SupplyChainFinanceResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

// -- Data generation --

function generate(): SupplyChainFinanceResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('supply-chain-finance-' + today));

  const lerp = (min: number, max: number) => min + rng() * (max - min);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. Market Overview --

  const marketOverview: MarketOverview = {
    totalMarketSize: round(lerp(1.8, 2.5), 2),
    growthRate: round(lerp(8, 18), 1),
    avgDiscountRate: round(lerp(2, 5), 2),
    avgPaymentTerms: Math.round(lerp(45, 90)),
    adoptionRate: round(lerp(25, 45), 1),
    digitalPenetration: round(lerp(15, 35), 1),
  };

  // -- 2. Programs --

  const programs: ProgramData[] = PROGRAM_CONFIGS.map((cfg) => {
    const programSize = round(cfg.baseProgramSize + (rng() - 0.5) * cfg.sizeRange * 2, 1);
    const suppliersEnrolled = Math.round(lerp(cfg.suppliersRange[0], cfg.suppliersRange[1]));
    const discountRate = round(lerp(cfg.discountRange[0], cfg.discountRange[1]), 2);
    const avgTenor = Math.round(lerp(cfg.tenorRange[0], cfg.tenorRange[1]));
    const utilization = round(lerp(cfg.utilizationRange[0], cfg.utilizationRange[1]), 1);
    const rating = pick(cfg.ratings);
    const platform = pick(cfg.platforms);

    return {
      buyer: cfg.buyer,
      programSize,
      suppliersEnrolled: clamp(suppliersEnrolled, cfg.suppliersRange[0], cfg.suppliersRange[1]),
      discountRate,
      avgTenor,
      utilization,
      rating,
      platform,
    };
  });

  // -- 3. Instrument Types --

  const instrumentTypes: InstrumentType[] = INSTRUMENT_CONFIGS.map((cfg) => {
    const volumeYTD = round(cfg.baseVolume + (rng() - 0.5) * cfg.volumeRange * 2, 1);
    const avgRate = round(lerp(cfg.rateRange[0], cfg.rateRange[1]), 2);
    const growthRate = round(lerp(cfg.growthRange[0], cfg.growthRange[1]), 1);
    const avgTenor = Math.round(lerp(cfg.tenorRange[0], cfg.tenorRange[1]));

    return {
      type: cfg.type,
      volumeYTD,
      avgRate,
      growthRate,
      avgTenor,
    };
  });

  // -- 4. Risk Indicators --

  const concentrationOptions: Array<'low' | 'moderate' | 'high'> = ['low', 'moderate', 'high'];
  const crossBorderOptions: Array<'low' | 'moderate' | 'elevated'> = ['low', 'moderate', 'elevated'];

  const riskIndicators: RiskIndicators = {
    supplierDefaultRate: round(lerp(0.5, 3), 2),
    concentrationRisk: pick(concentrationOptions),
    paymentDelayIndex: round(lerp(0, 15), 1),
    crossBorderRisk: pick(crossBorderOptions),
    fxExposure: round(lerp(80, 350), 1),
  };

  // -- 5. Regional Breakdown --

  const regionalBreakdown: RegionalBreakdown[] = REGIONAL_CONFIGS.map((cfg) => {
    const volume = round(cfg.baseVolume + (rng() - 0.5) * cfg.volumeRange * 2, 1);
    const growthRate = round(lerp(cfg.growthRange[0], cfg.growthRange[1]), 1);
    const avgRate = round(lerp(cfg.rateRange[0], cfg.rateRange[1]), 2);
    const digitalAdoption = round(lerp(cfg.digitalRange[0], cfg.digitalRange[1]), 1);

    return {
      region: cfg.region,
      volume,
      growthRate,
      avgRate,
      digitalAdoption,
    };
  });

  // -- 6. Technology Trends --

  const technologyTrends: TechnologyTrend[] = TREND_CONFIGS.map((cfg) => {
    const adoption = round(cfg.baseAdoption + (rng() - 0.5) * cfg.adoptionRange * 2, 1);

    return {
      trend: cfg.trend,
      adoption: clamp(adoption, 1, 95),
      impact: cfg.impact,
      keyPlayers: cfg.keyPlayers,
    };
  });

  return {
    marketOverview,
    programs,
    instrumentTypes,
    riskIndicators,
    regionalBreakdown,
    technologyTrends,
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
    console.error('[SupplyChainFinance] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate supply chain finance data' });
  }
});

export default router;
