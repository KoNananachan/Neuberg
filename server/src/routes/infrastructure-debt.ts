import { Router, Request, Response } from 'express';

const router = Router();

// -- PRNG --

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

function seededRandom(tag: string): () => number {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// -- Types --

interface MarketOverview {
  totalMarketSize: number;
  issuanceYTD: number;
  avgSpread: number;
  avgTenor: number;
  avgRating: 'BBB' | 'BBB+' | 'A-';
  defaultRate: number;
}

interface SectorBreakdown {
  sector: string;
  outstanding: number;
  avgSpread: number;
  avgTenor: number;
  avgRating: string;
  greenBondPct: number;
  trend: 'growing' | 'stable' | 'contracting';
}

interface RecentDeal {
  borrower: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  tenor: number;
  spread: number;
  rating: string;
  structure: 'project finance' | 'corporate' | 'holdco';
  greenLabel: boolean;
}

interface RiskMetrics {
  avgLTV: number;
  avgDSCR: number;
  recoveryRate: number;
  durationRisk: 'low' | 'moderate' | 'high';
  refinancingWall: string;
  regulatoryRisk: 'low' | 'moderate' | 'elevated';
}

interface YieldComparison {
  asset: string;
  yield: number;
  spread: number;
  illiquidityPremium: number;
}

interface EsgMetrics {
  greenBondShare: number;
  socialBondShare: number;
  avgCarbonIntensity: number;
  taxonomyAligned: number;
}

interface InfrastructureDebtResponse {
  marketOverview: MarketOverview;
  sectorBreakdown: SectorBreakdown[];
  recentDeals: RecentDeal[];
  riskMetrics: RiskMetrics;
  yieldComparison: YieldComparison[];
  esgMetrics: EsgMetrics;
  generatedAt: string;
}

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: InfrastructureDebtResponse | null = null;
let cacheTime = 0;

// -- Helpers --

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
const round = (v: number, dp: number = 2): number => {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
};

// -- Data generation --

function generate(): InfrastructureDebtResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = seededRandom('infrastructure-debt-' + today);

  // 1. Market Overview
  const ratingPool: MarketOverview['avgRating'][] = ['BBB', 'BBB+', 'A-'];
  const marketOverview: MarketOverview = {
    totalMarketSize: round(clamp(2 + rng() * 2, 2, 4), 2),
    issuanceYTD: round(clamp(80 + rng() * 120, 80, 200), 1),
    avgSpread: Math.round(clamp(120 + rng() * 160, 120, 280)),
    avgTenor: round(clamp(10 + rng() * 15, 10, 25), 1),
    avgRating: ratingPool[Math.floor(rng() * ratingPool.length)],
    defaultRate: round(clamp(0.1 + rng() * 1.4, 0.1, 1.5), 2),
  };

  // 2. Sector Breakdown (8 sectors)
  const sectorConfigs: { sector: string; outBase: number; outSpread: number; spreadBase: number; spreadRange: number; tenorBase: number; tenorRange: number; ratingPool: string[]; greenBase: number; greenRange: number; trendWeights: [number, number, number] }[] = [
    { sector: 'Transport', outBase: 420, outSpread: 60, spreadBase: 140, spreadRange: 80, tenorBase: 15, tenorRange: 8, ratingPool: ['BBB', 'BBB+', 'A-'], greenBase: 10, greenRange: 15, trendWeights: [0.4, 0.4, 0.2] },
    { sector: 'Energy/Power', outBase: 380, outSpread: 50, spreadBase: 130, spreadRange: 70, tenorBase: 18, tenorRange: 7, ratingPool: ['BBB', 'BBB+'], greenBase: 25, greenRange: 20, trendWeights: [0.5, 0.35, 0.15] },
    { sector: 'Digital/Telecom', outBase: 280, outSpread: 40, spreadBase: 150, spreadRange: 90, tenorBase: 10, tenorRange: 6, ratingPool: ['BBB+', 'A-'], greenBase: 8, greenRange: 12, trendWeights: [0.6, 0.3, 0.1] },
    { sector: 'Social Infrastructure', outBase: 200, outSpread: 30, spreadBase: 120, spreadRange: 60, tenorBase: 20, tenorRange: 5, ratingPool: ['A-', 'BBB+'], greenBase: 15, greenRange: 15, trendWeights: [0.3, 0.5, 0.2] },
    { sector: 'Water/Utilities', outBase: 250, outSpread: 35, spreadBase: 110, spreadRange: 50, tenorBase: 22, tenorRange: 5, ratingPool: ['A-', 'BBB+', 'A'], greenBase: 20, greenRange: 18, trendWeights: [0.35, 0.45, 0.2] },
    { sector: 'Renewables', outBase: 320, outSpread: 45, spreadBase: 160, spreadRange: 100, tenorBase: 14, tenorRange: 6, ratingPool: ['BBB', 'BBB+'], greenBase: 60, greenRange: 25, trendWeights: [0.7, 0.2, 0.1] },
    { sector: 'Toll Roads', outBase: 180, outSpread: 25, spreadBase: 135, spreadRange: 70, tenorBase: 16, tenorRange: 7, ratingPool: ['BBB', 'BBB+', 'A-'], greenBase: 5, greenRange: 10, trendWeights: [0.3, 0.4, 0.3] },
    { sector: 'Airports', outBase: 150, outSpread: 25, spreadBase: 155, spreadRange: 85, tenorBase: 12, tenorRange: 6, ratingPool: ['BBB+', 'A-'], greenBase: 12, greenRange: 15, trendWeights: [0.35, 0.4, 0.25] },
  ];

  const trendLabels: SectorBreakdown['trend'][] = ['growing', 'stable', 'contracting'];

  const sectorBreakdown: SectorBreakdown[] = sectorConfigs.map(cfg => {
    const outstanding = round(cfg.outBase + (rng() - 0.5) * 2 * cfg.outSpread, 1);
    const avgSpread = Math.round(cfg.spreadBase + (rng() - 0.5) * 2 * cfg.spreadRange);
    const avgTenor = round(cfg.tenorBase + (rng() - 0.5) * 2 * cfg.tenorRange, 1);
    const avgRating = cfg.ratingPool[Math.floor(rng() * cfg.ratingPool.length)];
    const greenBondPct = round(clamp(cfg.greenBase + (rng() - 0.5) * 2 * cfg.greenRange, 0, 100), 1);

    const r = rng();
    let trend: SectorBreakdown['trend'] = 'stable';
    if (r < cfg.trendWeights[0]) trend = trendLabels[0];
    else if (r < cfg.trendWeights[0] + cfg.trendWeights[1]) trend = trendLabels[1];
    else trend = trendLabels[2];

    return { sector: cfg.sector, outstanding, avgSpread, avgTenor, avgRating, greenBondPct, trend };
  });

  // 3. Recent Deals (6 deals)
  const dealConfigs: { borrower: string; amtBase: number; amtSpread: number; currency: RecentDeal['currency']; tenorBase: number; tenorRange: number; spreadBase: number; spreadRange: number; ratingPool: string[]; structure: RecentDeal['structure']; greenProb: number }[] = [
    { borrower: 'Thames Water', amtBase: 750, amtSpread: 200, currency: 'GBP', tenorBase: 12, tenorRange: 4, spreadBase: 220, spreadRange: 60, ratingPool: ['BBB-', 'BBB'], structure: 'corporate', greenProb: 0.3 },
    { borrower: 'Heathrow Finance', amtBase: 1200, amtSpread: 300, currency: 'GBP', tenorBase: 15, tenorRange: 5, spreadBase: 170, spreadRange: 40, ratingPool: ['BBB', 'BBB+'], structure: 'holdco', greenProb: 0.4 },
    { borrower: 'Network Rail', amtBase: 2000, amtSpread: 500, currency: 'GBP', tenorBase: 20, tenorRange: 8, spreadBase: 80, spreadRange: 30, ratingPool: ['AA-', 'AA'], structure: 'corporate', greenProb: 0.5 },
    { borrower: 'Orsted Wind Farm', amtBase: 800, amtSpread: 200, currency: 'EUR', tenorBase: 18, tenorRange: 5, spreadBase: 145, spreadRange: 40, ratingPool: ['BBB+', 'A-'], structure: 'project finance', greenProb: 0.9 },
    { borrower: 'Sydney Airport', amtBase: 600, amtSpread: 150, currency: 'USD', tenorBase: 10, tenorRange: 4, spreadBase: 160, spreadRange: 45, ratingPool: ['BBB', 'BBB+'], structure: 'holdco', greenProb: 0.2 },
    { borrower: 'NextEra Energy Partners', amtBase: 1500, amtSpread: 400, currency: 'USD', tenorBase: 12, tenorRange: 5, spreadBase: 135, spreadRange: 35, ratingPool: ['BBB-', 'BBB'], structure: 'project finance', greenProb: 0.7 },
  ];

  const recentDeals: RecentDeal[] = dealConfigs.map(cfg => {
    const amount = Math.round(cfg.amtBase + (rng() - 0.5) * 2 * cfg.amtSpread);
    const tenor = Math.round(cfg.tenorBase + (rng() - 0.5) * 2 * cfg.tenorRange);
    const spread = Math.round(cfg.spreadBase + (rng() - 0.5) * 2 * cfg.spreadRange);
    const rating = cfg.ratingPool[Math.floor(rng() * cfg.ratingPool.length)];
    const greenLabel = rng() < cfg.greenProb;
    return { borrower: cfg.borrower, amount, currency: cfg.currency, tenor, spread, rating, structure: cfg.structure, greenLabel };
  });

  // 4. Risk Metrics
  const durationRiskPool: RiskMetrics['durationRisk'][] = ['low', 'moderate', 'high'];
  const regulatoryRiskPool: RiskMetrics['regulatoryRisk'][] = ['low', 'moderate', 'elevated'];
  const refinancingYears = [2026, 2027, 2028, 2029, 2030];

  const riskMetrics: RiskMetrics = {
    avgLTV: round(clamp(50 + rng() * 25, 50, 75), 1),
    avgDSCR: round(clamp(1.2 + rng() * 0.8, 1.2, 2.0), 2),
    recoveryRate: round(clamp(60 + rng() * 25, 60, 85), 1),
    durationRisk: durationRiskPool[Math.floor(rng() * durationRiskPool.length)],
    refinancingWall: String(refinancingYears[Math.floor(rng() * refinancingYears.length)]),
    regulatoryRisk: regulatoryRiskPool[Math.floor(rng() * regulatoryRiskPool.length)],
  };

  // 5. Yield Comparison (5 assets)
  const yieldConfigs: { asset: string; yieldBase: number; yieldRange: number; spreadBase: number; spreadRange: number; illiqBase: number; illiqRange: number }[] = [
    { asset: 'Infra Debt BBB', yieldBase: 5.2, yieldRange: 1.2, spreadBase: 180, spreadRange: 50, illiqBase: 40, illiqRange: 20 },
    { asset: 'Corporate BBB', yieldBase: 4.8, yieldRange: 1.0, spreadBase: 150, spreadRange: 40, illiqBase: 0, illiqRange: 5 },
    { asset: 'Sovereign 10Y', yieldBase: 3.8, yieldRange: 0.8, spreadBase: 0, spreadRange: 10, illiqBase: 0, illiqRange: 0 },
    { asset: 'High Yield BB', yieldBase: 6.5, yieldRange: 1.5, spreadBase: 320, spreadRange: 80, illiqBase: 15, illiqRange: 10 },
    { asset: 'Private Credit', yieldBase: 7.8, yieldRange: 1.8, spreadBase: 420, spreadRange: 100, illiqBase: 80, illiqRange: 30 },
  ];

  const yieldComparison: YieldComparison[] = yieldConfigs.map(cfg => {
    const yld = round(cfg.yieldBase + (rng() - 0.5) * 2 * cfg.yieldRange, 2);
    const spread = Math.round(cfg.spreadBase + (rng() - 0.5) * 2 * cfg.spreadRange);
    const illiquidityPremium = Math.round(cfg.illiqBase + (rng() - 0.5) * 2 * cfg.illiqRange);
    return { asset: cfg.asset, yield: yld, spread, illiquidityPremium };
  });

  // 6. ESG Metrics
  const esgMetrics: EsgMetrics = {
    greenBondShare: round(clamp(20 + rng() * 25, 20, 45), 1),
    socialBondShare: round(clamp(5 + rng() * 10, 5, 15), 1),
    avgCarbonIntensity: Math.round(80 + rng() * 220),
    taxonomyAligned: round(clamp(30 + rng() * 30, 30, 60), 1),
  };

  return {
    marketOverview,
    sectorBreakdown,
    recentDeals,
    riskMetrics,
    yieldComparison,
    esgMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    const error = err as Error | undefined;
    console.error('[InfrastructureDebt] Error:', error?.message);
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate infrastructure debt data' });
  }
});

export default router;
