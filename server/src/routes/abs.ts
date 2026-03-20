import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round(val: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(val * f) / f;
}

// ── Types ──

interface SectorBreakdown {
  sector: string;
  outstanding: number;
  issuanceYTD: number;
  avgSpread: number;
  delinquencyRate: number;
  lossRate: number;
  trend: 'tightening' | 'stable' | 'widening';
}

interface RecentDeal {
  issuer: string;
  deal: string;
  collateral: string;
  size: number;
  aaaSpread: number;
  subordination: number;
  coupon: number;
  closingDate: string;
}

interface PerformanceMetric {
  sector: string;
  delinquency30D: number;
  delinquency60D: number;
  delinquency90D: number;
  cumulativeLoss: number;
  recoveryRate: number;
  prepaymentCPR: number;
}

interface SpreadCurvePoint {
  tenor: '1Y' | '2Y' | '3Y' | '5Y';
  autoABS: number;
  cardABS: number;
  studentLoan: number;
  cmbs: number;
}

interface ABSResponse {
  marketOverview: {
    totalOutstanding: number;
    issuanceYTD: number;
    avgAAA_Spread: number;
    avgA_Spread: number;
    avgBBB_Spread: number;
    prepaymentSpeed: number;
  };
  sectorBreakdown: SectorBreakdown[];
  recentDeals: RecentDeal[];
  performanceMetrics: PerformanceMetric[];
  spreadCurve: SpreadCurvePoint[];
  riskIndicators: {
    consumerCreditHealth: 'strong' | 'moderate' | 'weakening';
    autoDelinquencyTrend: 'improving' | 'stable' | 'deteriorating';
    studentLoanDefault: number;
    housingPriceGrowth: number;
    unemploymentRate: number;
  };
}

// ── Cache (5 min TTL, stale fallback) ──

let cache: { data: ABSResponse | null; expiresAt: number } = { data: null, expiresAt: 0 };


// ── Data generation ──

function generate(): ABSResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('abs-' + today));

  // ── 1. Market Overview ──
  const totalOutstanding = round(clamp(1.5 + (rng() - 0.5) * 1.0, 1.5, 2.0), 2);
  const issuanceYTD = round(clamp(150 + rng() * 150, 150, 300), 1);
  const avgAAA_Spread = Math.round(clamp(30 + rng() * 50, 30, 80));
  const avgA_Spread = Math.round(clamp(80 + rng() * 100, 80, 180));
  const avgBBB_Spread = Math.round(clamp(150 + rng() * 150, 150, 300));
  const prepaymentSpeed = round(clamp(5 + rng() * 20, 5, 25), 1);

  const marketOverview = {
    totalOutstanding,
    issuanceYTD,
    avgAAA_Spread,
    avgA_Spread,
    avgBBB_Spread,
    prepaymentSpeed,
  };

  // ── 2. Sector Breakdown ──
  const sectorNames = ['Auto Loans', 'Credit Cards', 'Student Loans', 'Equipment', 'CMBS', 'RMBS Non-Agency'];
  const trendOptions: ('tightening' | 'stable' | 'widening')[] = ['tightening', 'stable', 'widening'];

  const sectorBreakdown: SectorBreakdown[] = sectorNames.map((sector) => {
    const outstanding = round(clamp(50 + rng() * 400, 50, 450), 1);
    const sectorIssuanceYTD = round(clamp(10 + rng() * 80, 10, 90), 1);
    const avgSpread = Math.round(clamp(40 + rng() * 200, 40, 240));
    const delinquencyRate = round(clamp(0.5 + rng() * 5.0, 0.5, 5.5), 2);
    const lossRate = round(clamp(0.1 + rng() * 2.5, 0.1, 2.6), 2);
    const trend = trendOptions[Math.floor(rng() * 3)];

    return { sector, outstanding, issuanceYTD: sectorIssuanceYTD, avgSpread, delinquencyRate, lossRate, trend };
  });

  // ── 3. Recent Deals ──
  const dealConfigs: { issuer: string; dealPrefix: string; collateral: string }[] = [
    { issuer: 'Ford Motor Credit', dealPrefix: 'FORDO 2026-A', collateral: 'Prime Auto Loans' },
    { issuer: 'Capital One', dealPrefix: 'COMT 2026-A', collateral: 'Credit Card Receivables' },
    { issuer: 'SoFi', dealPrefix: 'SOFI 2026-1', collateral: 'Student Loan Refinance' },
    { issuer: 'Verizon', dealPrefix: 'VZOT 2026-A', collateral: 'Device Payment Plans' },
    { issuer: 'Hertz', dealPrefix: 'HERTZ 2026-1', collateral: 'Rental Fleet Auto' },
  ];

  const baseMonth = new Date().getMonth();
  const baseYear = new Date().getFullYear();

  const recentDeals: RecentDeal[] = dealConfigs.map((dc, i) => {
    const size = Math.round(clamp(500 + rng() * 1500, 500, 2000));
    const aaaSpread = Math.round(clamp(25 + rng() * 55, 25, 80));
    const subordination = round(clamp(5 + rng() * 25, 5, 30), 1);
    const coupon = round(clamp(4.0 + rng() * 3.0, 4.0, 7.0), 3);
    const closingMonth = ((baseMonth + i) % 12) + 1;
    const closingYear = closingMonth <= baseMonth + 1 ? baseYear : baseYear;
    const closingDate = `${closingYear}-${String(closingMonth).padStart(2, '0')}-${String(10 + Math.floor(rng() * 18)).padStart(2, '0')}`;

    return {
      issuer: dc.issuer,
      deal: dc.dealPrefix,
      collateral: dc.collateral,
      size,
      aaaSpread,
      subordination,
      coupon,
      closingDate,
    };
  });

  // ── 4. Performance Metrics ──
  const performanceMetrics: PerformanceMetric[] = sectorNames.map((sector) => {
    const delinquency30D = round(clamp(1.0 + rng() * 4.0, 1.0, 5.0), 2);
    const delinquency60D = round(clamp(0.5 + rng() * 2.5, 0.5, 3.0), 2);
    const delinquency90D = round(clamp(0.2 + rng() * 1.5, 0.2, 1.7), 2);
    const cumulativeLoss = round(clamp(0.3 + rng() * 3.0, 0.3, 3.3), 2);
    const recoveryRate = round(clamp(30 + rng() * 50, 30, 80), 1);
    const prepaymentCPR = round(clamp(5 + rng() * 25, 5, 30), 1);

    return { sector, delinquency30D, delinquency60D, delinquency90D, cumulativeLoss, recoveryRate, prepaymentCPR };
  });

  // ── 5. Spread Curve ──
  const tenors: ('1Y' | '2Y' | '3Y' | '5Y')[] = ['1Y', '2Y', '3Y', '5Y'];

  const spreadCurve: SpreadCurvePoint[] = tenors.map((tenor, i) => {
    const baseAdj = i * 12;
    const autoABS = Math.round(clamp(25 + baseAdj + rng() * 30, 25, 120));
    const cardABS = Math.round(clamp(30 + baseAdj + rng() * 35, 30, 130));
    const studentLoan = Math.round(clamp(35 + baseAdj + rng() * 40, 35, 140));
    const cmbs = Math.round(clamp(50 + baseAdj + rng() * 50, 50, 180));

    return { tenor, autoABS, cardABS, studentLoan, cmbs };
  });

  // ── 6. Risk Indicators ──
  const creditHealthOptions: ('strong' | 'moderate' | 'weakening')[] = ['strong', 'moderate', 'weakening'];
  const delinquencyTrendOptions: ('improving' | 'stable' | 'deteriorating')[] = ['improving', 'stable', 'deteriorating'];

  const consumerCreditHealth = creditHealthOptions[Math.floor(rng() * 3)];
  const autoDelinquencyTrend = delinquencyTrendOptions[Math.floor(rng() * 3)];
  const studentLoanDefault = round(clamp(5 + rng() * 15, 5, 20), 1);
  const housingPriceGrowth = round(clamp(-2 + rng() * 10, -2, 8), 1);
  const unemploymentRate = round(clamp(3.5 + rng() * 3.0, 3.5, 6.5), 1);

  const riskIndicators = {
    consumerCreditHealth,
    autoDelinquencyTrend,
    studentLoanDefault,
    housingPriceGrowth,
    unemploymentRate,
  };

  return {
    marketOverview,
    sectorBreakdown,
    recentDeals,
    performanceMetrics,
    spreadCurve,
    riskIndicators,
  };
}

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
  } catch (err: any) {
    console.error('[ABS] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate ABS data' });
  }
});

export default router;
