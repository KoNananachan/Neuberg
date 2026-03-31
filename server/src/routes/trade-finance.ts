import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// --- TypeScript Interfaces ---

interface MarketOverview {
  globalTradeFinanceVolumeBillions: number;
  tradeFinanceGapBillions: number;
  lcVolumeBillions: number;
  supplyChainFinanceBillions: number;
  factoringVolumeBillions: number;
  forfaitingVolumeBillions: number;
  bankPaymentObligationVolumeBillions: number;
}

interface LetterOfCreditRate {
  corridor: string;
  lcPricingBps: number;
  confirmationFeeBps: number;
  tenorDays: number;
  avgTransactionSizeMillions: number;
  defaultRatePct: number;
  trend: 'tightening' | 'stable' | 'easing';
}

interface SupplyChainFinanceProgram {
  program: string;
  totalFacilityBillions: number;
  utilizationPct: number;
  avgDiscountRateBps: number;
  supplierCount: number;
  avgPaymentTermDays: number;
  earlyPaymentDays: number;
  dsoImprovementDays: number;
}

interface RegionReceivables {
  region: string;
  volumeBillions: number;
  avgYieldBps: number;
  defaultRatePct: number;
}

interface TradeReceivablesMarket {
  totalOutstandingBillions: number;
  securitizedBillions: number;
  avgYieldBps: number;
  defaultRatePct: number;
  recoveryRatePct: number;
  byRegion: RegionReceivables[];
}

interface CountryRiskPremium {
  country: string;
  shortTermRisk: number;
  mediumTermRisk: number;
  tradeFinancePremiumBps: number;
  paymentDelayDays: number;
  coverAvailability: 'full' | 'restricted' | 'unavailable';
}

interface DigitalizationPlatform {
  name: string;
  status: 'active' | 'decommissioned';
  volumeBillions: number;
}

interface DigitalizationTrends {
  blockchainLCPct: number;
  eBlPenetrationPct: number;
  digitalTradeFinanceGrowthPct: number;
  platforms: DigitalizationPlatform[];
}

interface TradeFinanceData {
  marketOverview: MarketOverview;
  letterOfCreditRates: LetterOfCreditRate[];
  supplyChainFinancePrograms: SupplyChainFinanceProgram[];
  tradeReceivablesMarket: TradeReceivablesMarket;
  countryRiskPremiums: CountryRiskPremium[];
  digitalizationTrends: DigitalizationTrends;
  generatedAt: string;
}

// --- Cache ---


let cache: { data: TradeFinanceData; ts: number } | null = null;

// --- Data Generation ---

function generate(): TradeFinanceData {
  const rng = seededRandom('trade-finance');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // 1. Market Overview
  const marketOverview: MarketOverview = {
    globalTradeFinanceVolumeBillions: Math.round(jitter(12000, 0.05)),
    tradeFinanceGapBillions: Math.round(jitter(2500, 0.06)),
    lcVolumeBillions: Math.round(jitter(4200, 0.05)),
    supplyChainFinanceBillions: Math.round(jitter(2100, 0.06)),
    factoringVolumeBillions: Math.round(jitter(3500, 0.05)),
    forfaitingVolumeBillions: Math.round(jitter(450, 0.07)),
    bankPaymentObligationVolumeBillions: Math.round(jitter(180, 0.08)),
  };

  // 2. Letter of Credit Rates (8 corridors)
  const lcCorridorConfigs: { corridor: string; basePricingBps: number; baseConfirmBps: number; baseTenor: number; baseSize: number; baseDefault: number }[] = [
    { corridor: 'US->China', basePricingBps: 95, baseConfirmBps: 45, baseTenor: 90, baseSize: 2.8, baseDefault: 0.03 },
    { corridor: 'EU->China', basePricingBps: 88, baseConfirmBps: 40, baseTenor: 85, baseSize: 3.2, baseDefault: 0.025 },
    { corridor: 'US->India', basePricingBps: 110, baseConfirmBps: 55, baseTenor: 75, baseSize: 1.5, baseDefault: 0.04 },
    { corridor: 'EU->Turkey', basePricingBps: 145, baseConfirmBps: 70, baseTenor: 60, baseSize: 1.2, baseDefault: 0.06 },
    { corridor: 'Japan->SEAsia', basePricingBps: 78, baseConfirmBps: 35, baseTenor: 80, baseSize: 2.1, baseDefault: 0.02 },
    { corridor: 'China->Africa', basePricingBps: 175, baseConfirmBps: 90, baseTenor: 120, baseSize: 0.8, baseDefault: 0.08 },
    { corridor: 'US->LatAm', basePricingBps: 130, baseConfirmBps: 60, baseTenor: 70, baseSize: 1.8, baseDefault: 0.05 },
    { corridor: 'EU->MEast', basePricingBps: 105, baseConfirmBps: 50, baseTenor: 95, baseSize: 2.5, baseDefault: 0.035 },
  ];

  const trends: ('tightening' | 'stable' | 'easing')[] = ['tightening', 'stable', 'easing'];

  const letterOfCreditRates: LetterOfCreditRate[] = lcCorridorConfigs.map(c => ({
    corridor: c.corridor,
    lcPricingBps: Math.round(jitter(c.basePricingBps, 0.08)),
    confirmationFeeBps: Math.round(jitter(c.baseConfirmBps, 0.10)),
    tenorDays: Math.round(jitter(c.baseTenor, 0.05)),
    avgTransactionSizeMillions: Math.round(jitter(c.baseSize, 0.12) * 10) / 10,
    defaultRatePct: Math.round(jitter(c.baseDefault, 0.15) * 1000) / 1000,
    trend: pick(trends),
  }));

  // 3. Supply Chain Finance Programs (8)
  const scfConfigs: { program: string; baseFacility: number; baseUtil: number; baseDiscount: number; baseSuppliers: number; basePayTerm: number; baseEarlyPay: number; baseDso: number }[] = [
    { program: 'Apple', baseFacility: 25, baseUtil: 82, baseDiscount: 65, baseSuppliers: 4500, basePayTerm: 90, baseEarlyPay: 15, baseDso: 35 },
    { program: 'Walmart', baseFacility: 35, baseUtil: 78, baseDiscount: 55, baseSuppliers: 12000, basePayTerm: 75, baseEarlyPay: 10, baseDso: 28 },
    { program: 'Toyota', baseFacility: 18, baseUtil: 85, baseDiscount: 48, baseSuppliers: 3200, basePayTerm: 60, baseEarlyPay: 12, baseDso: 22 },
    { program: 'Siemens', baseFacility: 15, baseUtil: 74, baseDiscount: 72, baseSuppliers: 2800, basePayTerm: 85, baseEarlyPay: 18, baseDso: 30 },
    { program: 'Unilever', baseFacility: 12, baseUtil: 80, baseDiscount: 60, baseSuppliers: 5500, basePayTerm: 70, baseEarlyPay: 14, baseDso: 25 },
    { program: 'P&G', baseFacility: 14, baseUtil: 76, baseDiscount: 58, baseSuppliers: 4800, basePayTerm: 65, baseEarlyPay: 12, baseDso: 24 },
    { program: 'Samsung', baseFacility: 20, baseUtil: 88, baseDiscount: 52, baseSuppliers: 3800, basePayTerm: 80, baseEarlyPay: 16, baseDso: 32 },
    { program: 'BMW', baseFacility: 10, baseUtil: 71, baseDiscount: 68, baseSuppliers: 2200, basePayTerm: 75, baseEarlyPay: 15, baseDso: 27 },
  ];

  const supplyChainFinancePrograms: SupplyChainFinanceProgram[] = scfConfigs.map(c => ({
    program: c.program,
    totalFacilityBillions: Math.round(jitter(c.baseFacility, 0.08) * 10) / 10,
    utilizationPct: Math.round(jitter(c.baseUtil, 0.06) * 10) / 10,
    avgDiscountRateBps: Math.round(jitter(c.baseDiscount, 0.10)),
    supplierCount: Math.round(jitter(c.baseSuppliers, 0.05)),
    avgPaymentTermDays: Math.round(jitter(c.basePayTerm, 0.05)),
    earlyPaymentDays: Math.round(jitter(c.baseEarlyPay, 0.08)),
    dsoImprovementDays: Math.round(jitter(c.baseDso, 0.07)),
  }));

  // 4. Trade Receivables Market
  const totalOutstandingBillions = Math.round(jitter(2800, 0.05));
  const securitizedBillions = Math.round(jitter(680, 0.06));
  const avgYieldBps = Math.round(jitter(185, 0.08));
  const defaultRatePct = Math.round(jitter(0.45, 0.12) * 100) / 100;
  const recoveryRatePct = Math.round(jitter(72, 0.05) * 10) / 10;

  const byRegion: RegionReceivables[] = [
    {
      region: 'Americas',
      volumeBillions: Math.round(jitter(1050, 0.06)),
      avgYieldBps: Math.round(jitter(165, 0.08)),
      defaultRatePct: Math.round(jitter(0.35, 0.12) * 100) / 100,
    },
    {
      region: 'EMEA',
      volumeBillions: Math.round(jitter(980, 0.06)),
      avgYieldBps: Math.round(jitter(190, 0.08)),
      defaultRatePct: Math.round(jitter(0.48, 0.12) * 100) / 100,
    },
    {
      region: 'APAC',
      volumeBillions: Math.round(jitter(770, 0.06)),
      avgYieldBps: Math.round(jitter(210, 0.08)),
      defaultRatePct: Math.round(jitter(0.55, 0.12) * 100) / 100,
    },
  ];

  const tradeReceivablesMarket: TradeReceivablesMarket = {
    totalOutstandingBillions,
    securitizedBillions,
    avgYieldBps,
    defaultRatePct,
    recoveryRatePct,
    byRegion,
  };

  // 5. Country Risk Premiums (12 countries)
  const countryConfigs: { country: string; shortTermRisk: number; mediumTermRisk: number; basePremiumBps: number; baseDelayDays: number; cover: 'full' | 'restricted' | 'unavailable' }[] = [
    { country: 'China', shortTermRisk: 2, mediumTermRisk: 2, basePremiumBps: 85, baseDelayDays: 12, cover: 'full' },
    { country: 'India', shortTermRisk: 3, mediumTermRisk: 3, basePremiumBps: 120, baseDelayDays: 18, cover: 'full' },
    { country: 'Brazil', shortTermRisk: 4, mediumTermRisk: 4, basePremiumBps: 165, baseDelayDays: 25, cover: 'full' },
    { country: 'Turkey', shortTermRisk: 5, mediumTermRisk: 5, basePremiumBps: 240, baseDelayDays: 35, cover: 'restricted' },
    { country: 'Nigeria', shortTermRisk: 6, mediumTermRisk: 6, basePremiumBps: 350, baseDelayDays: 55, cover: 'restricted' },
    { country: 'Egypt', shortTermRisk: 6, mediumTermRisk: 6, basePremiumBps: 320, baseDelayDays: 48, cover: 'restricted' },
    { country: 'Vietnam', shortTermRisk: 3, mediumTermRisk: 3, basePremiumBps: 110, baseDelayDays: 15, cover: 'full' },
    { country: 'Bangladesh', shortTermRisk: 4, mediumTermRisk: 4, basePremiumBps: 185, baseDelayDays: 30, cover: 'restricted' },
    { country: 'Mexico', shortTermRisk: 3, mediumTermRisk: 3, basePremiumBps: 105, baseDelayDays: 14, cover: 'full' },
    { country: 'Indonesia', shortTermRisk: 3, mediumTermRisk: 3, basePremiumBps: 115, baseDelayDays: 16, cover: 'full' },
    { country: 'Russia', shortTermRisk: 7, mediumTermRisk: 7, basePremiumBps: 550, baseDelayDays: 90, cover: 'unavailable' },
    { country: 'South Africa', shortTermRisk: 4, mediumTermRisk: 4, basePremiumBps: 175, baseDelayDays: 22, cover: 'full' },
  ];

  const countryRiskPremiums: CountryRiskPremium[] = countryConfigs.map(c => ({
    country: c.country,
    shortTermRisk: c.shortTermRisk,
    mediumTermRisk: c.mediumTermRisk,
    tradeFinancePremiumBps: Math.round(jitter(c.basePremiumBps, 0.08)),
    paymentDelayDays: Math.round(jitter(c.baseDelayDays, 0.10)),
    coverAvailability: c.cover,
  }));

  // 6. Digitalization Trends
  const digitalizationTrends: DigitalizationTrends = {
    blockchainLCPct: Math.round(jitter(3.8, 0.10) * 10) / 10,
    eBlPenetrationPct: Math.round(jitter(5.2, 0.10) * 10) / 10,
    digitalTradeFinanceGrowthPct: Math.round(jitter(28, 0.08) * 10) / 10,
    platforms: [
      { name: 'Contour', status: 'active', volumeBillions: Math.round(jitter(45, 0.10) * 10) / 10 },
      { name: 'Marco Polo', status: 'decommissioned', volumeBillions: 0 },
      { name: 'Komgo', status: 'active', volumeBillions: Math.round(jitter(32, 0.10) * 10) / 10 },
      { name: 'TradeLens', status: 'decommissioned', volumeBillions: 0 },
      { name: 'we.trade', status: 'decommissioned', volumeBillions: 0 },
    ],
  };

  return {
    marketOverview,
    letterOfCreditRates,
    supplyChainFinancePrograms,
    tradeReceivablesMarket,
    countryRiskPremiums,
    digitalizationTrends,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[TradeFinance] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate trade finance data' });
  }
});

export default router;
