import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Interfaces ──────────────────────────────────────────────────────────────

interface MarketOverview {
  totalOutstandingBillions: number;
  newIssuanceYTDBillions: number;
  avgConversionPremiumPct: number;
  avgDeltaPct: number;
  avgCouponPct: number;
  avgYieldToMaturity: number;
}

interface ConvertibleGreeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

interface ActiveConvertible {
  issuer: string;
  ticker: string;
  couponPct: number;
  maturityDate: string;
  conversionPrice: number;
  currentStockPrice: number;
  conversionRatio: number;
  conversionPremiumPct: number;
  parityPrice: number;
  delta: number;
  bondFloorPrice: number;
  creditSpreadBps: number;
  bondPrice: number;
  callProtection: 'hard-call' | 'soft-call' | 'callable' | 'non-call';
  region: 'US' | 'Europe' | 'Asia';
  greeks: ConvertibleGreeks;
}

interface NewIssuance {
  issuer: string;
  sizeMillions: number;
  couponPct: number;
  conversionPremiumPct: number;
  maturityDate: string;
  bookRunner: string;
  pricingDate: string;
}

interface SectorBreakdown {
  sector: string;
  count: number;
  totalOutstandingBillions: number;
  avgPremium: number;
  avgDelta: number;
  avgCoupon: number;
}

interface RecentConversion {
  issuer: string;
  sharesConverted: number;
  valueMillions: number;
  date: string;
}

interface ConversionActivity {
  recentConversions: RecentConversion[];
  totalConversionsYTD: number;
  avgConversionDiscount: number;
}

interface ConvertibleBondData {
  marketOverview: MarketOverview;
  activeConvertibles: ActiveConvertible[];
  newIssuancePipeline: NewIssuance[];
  sectorBreakdown: SectorBreakdown[];
  conversionActivity: ConversionActivity;
  generatedAt: string;
}

// ── Static Data ─────────────────────────────────────────────────────────────

const BOND_DEFS = [
  { issuer: 'Tesla', ticker: 'TSLA', coupon: 2.0, maturity: '2028-08-15', convPrice: 280, stockBase: 248, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'hard-call' as const },
  { issuer: 'Airbnb', ticker: 'ABNB', coupon: 0.0, maturity: '2026-03-15', convPrice: 195, stockBase: 156, parBase: 1000, sector: 'Consumer', region: 'US' as const, callProt: 'non-call' as const },
  { issuer: 'MicroStrategy', ticker: 'MSTR', coupon: 0.625, maturity: '2028-09-15', convPrice: 2100, stockBase: 1620, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'hard-call' as const },
  { issuer: 'Uber', ticker: 'UBER', coupon: 0.0, maturity: '2025-12-01', convPrice: 85, stockBase: 73, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'callable' as const },
  { issuer: 'Shopify', ticker: 'SHOP', coupon: 0.125, maturity: '2027-11-01', convPrice: 105, stockBase: 79, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'soft-call' as const },
  { issuer: 'Lam Research', ticker: 'LRCX', coupon: 1.5, maturity: '2029-06-15', convPrice: 820, stockBase: 710, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'hard-call' as const },
  { issuer: 'ON Semiconductor', ticker: 'ON', coupon: 0.0, maturity: '2027-05-01', convPrice: 95, stockBase: 76, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'non-call' as const },
  { issuer: 'Dexcom', ticker: 'DXCM', coupon: 0.375, maturity: '2028-11-15', convPrice: 145, stockBase: 112, parBase: 1000, sector: 'Healthcare', region: 'US' as const, callProt: 'soft-call' as const },
  { issuer: 'Palo Alto Networks', ticker: 'PANW', coupon: 0.375, maturity: '2025-06-01', convPrice: 400, stockBase: 315, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'callable' as const },
  { issuer: 'Western Digital', ticker: 'WDC', coupon: 3.0, maturity: '2028-11-15', convPrice: 58, stockBase: 48, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'hard-call' as const },
  { issuer: 'Affirm', ticker: 'AFRM', coupon: 0.0, maturity: '2026-11-15', convPrice: 72, stockBase: 52, parBase: 1000, sector: 'Financials', region: 'US' as const, callProt: 'non-call' as const },
  { issuer: 'Snap', ticker: 'SNAP', coupon: 0.75, maturity: '2028-08-01', convPrice: 22, stockBase: 14.5, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'soft-call' as const },
  { issuer: 'Zillow', ticker: 'ZG', coupon: 2.75, maturity: '2025-05-15', convPrice: 75, stockBase: 56, parBase: 1000, sector: 'Consumer', region: 'US' as const, callProt: 'callable' as const },
  { issuer: 'Block', ticker: 'SQ', coupon: 0.125, maturity: '2027-05-01', convPrice: 100, stockBase: 79, parBase: 1000, sector: 'Financials', region: 'US' as const, callProt: 'non-call' as const },
  { issuer: 'Datadog', ticker: 'DDOG', coupon: 0.125, maturity: '2029-06-15', convPrice: 160, stockBase: 122, parBase: 1000, sector: 'Technology', region: 'US' as const, callProt: 'hard-call' as const },
];

const SECTORS = ['Technology', 'Healthcare', 'Energy', 'Consumer', 'Financials', 'Industrials'];

const BOOK_RUNNERS = [
  'Goldman Sachs', 'J.P. Morgan', 'Morgan Stanley', 'BofA Securities',
  'Barclays', 'Citi', 'Deutsche Bank', 'Jefferies',
];

const PIPELINE_ISSUERS = [
  'CrowdStrike', 'Rivian', 'DoorDash', 'Twilio', 'MongoDB',
  'Cloudflare', 'Marvell Technology', 'Fortinet', 'Trade Desk', 'Palantir',
];

const CONVERSION_ISSUERS = [
  'Tesla', 'Uber', 'Zillow', 'Palo Alto Networks', 'Airbnb',
  'Snap', 'Block', 'Western Digital', 'Affirm', 'Shopify',
];
let cache: { data: ConvertibleBondData; ts: number } | null = null;

// ── Generator ───────────────────────────────────────────────────────────────

function generate(): ConvertibleBondData {
  const rng = seededRandom('convertible-bonds');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── Active Convertibles ───────────────────────────────────────────────

  const activeConvertibles: ActiveConvertible[] = BOND_DEFS.map(def => {
    const currentStockPrice = Math.round(jitter(def.stockBase, 0.08) * 100) / 100;
    const conversionRatio = Math.round((def.parBase / def.convPrice) * 10000) / 10000;
    const parityPrice = Math.round(currentStockPrice * conversionRatio * 100) / 100;
    const moneyness = currentStockPrice / def.convPrice;

    // Delta: deep OTM ~0.15, ATM ~0.50, deep ITM ~0.85
    const rawDelta = 1 / (1 + Math.exp(-5 * (moneyness - 1)));
    const delta = Math.round(Math.min(0.92, Math.max(0.08, rawDelta + (rng() - 0.5) * 0.08)) * 100) / 100;

    // Gamma: peaks near ATM
    const gamma = Math.round(Math.max(0.001, Math.exp(-12 * Math.pow(moneyness - 1, 2)) * 0.04 + rng() * 0.005) * 10000) / 10000;

    // Vega: higher near ATM, typical 0.15–0.50 for convertibles
    const vega = Math.round(Math.max(0.05, Math.exp(-8 * Math.pow(moneyness - 1, 2)) * 0.45 + (rng() - 0.5) * 0.08) * 100) / 100;

    // Theta: negative, larger magnitude near ATM
    const theta = -Math.round(Math.max(0.01, Math.exp(-6 * Math.pow(moneyness - 1, 2)) * 0.08 + rng() * 0.02) * 100) / 100;

    // Rho: small positive for convertibles, typically 0.02–0.15
    const rho = Math.round((0.02 + rng() * 0.12) * 100) / 100;

    // Credit spread: 80-500 bps depending on credit quality
    const creditSpreadBps = Math.round(80 + rng() * 420);

    // Bond floor: present value of straight bond component
    const yearsToMaturity = Math.max(0.5, (new Date(def.maturity).getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000));
    const discountRate = (4.5 + creditSpreadBps / 100) / 100;
    const bondFloorPrice = Math.round(Math.max(60, (def.coupon / discountRate * (1 - Math.pow(1 + discountRate, -yearsToMaturity)) + 100 * Math.pow(1 + discountRate, -yearsToMaturity))) * 100) / 100;

    // Bond price: max of parity and bond floor, plus option value
    const optionValue = 2 + rng() * 8;
    const bondPrice = Math.round(Math.max(parityPrice, bondFloorPrice + optionValue, 80) * 100) / 100;

    const conversionPremiumPct = Math.round(((def.convPrice - currentStockPrice) / currentStockPrice) * 100 * 10) / 10;

    return {
      issuer: def.issuer,
      ticker: def.ticker,
      couponPct: def.coupon,
      maturityDate: def.maturity,
      conversionPrice: def.convPrice,
      currentStockPrice,
      conversionRatio,
      conversionPremiumPct: Math.max(-30, conversionPremiumPct),
      parityPrice,
      delta,
      bondFloorPrice,
      creditSpreadBps,
      bondPrice,
      callProtection: def.callProt,
      region: def.region,
      greeks: { delta, gamma, vega, theta, rho },
    };
  });

  // ── Market Overview ───────────────────────────────────────────────────

  const avgDeltaAll = activeConvertibles.reduce((s, b) => s + b.delta, 0) / activeConvertibles.length;
  const avgCouponAll = activeConvertibles.reduce((s, b) => s + b.couponPct, 0) / activeConvertibles.length;
  const avgPremAll = activeConvertibles.reduce((s, b) => s + b.conversionPremiumPct, 0) / activeConvertibles.length;

  const marketOverview: MarketOverview = {
    totalOutstandingBillions: Math.round(jitter(502, 0.03) * 10) / 10,
    newIssuanceYTDBillions: Math.round(jitter(38, 0.10) * 10) / 10,
    avgConversionPremiumPct: Math.round(Math.max(25, Math.min(35, avgPremAll + (rng() - 0.5) * 6)) * 10) / 10,
    avgDeltaPct: Math.round(avgDeltaAll * 100 * 10) / 10,
    avgCouponPct: Math.round(avgCouponAll * 100) / 100,
    avgYieldToMaturity: Math.round(jitter(3.2, 0.15) * 100) / 100,
  };

  // ── New Issuance Pipeline ─────────────────────────────────────────────

  const newIssuancePipeline: NewIssuance[] = [];
  const usedPipelineIdx = new Set<number>();
  for (let i = 0; i < 5; i++) {
    let idx = Math.floor(rng() * PIPELINE_ISSUERS.length);
    while (usedPipelineIdx.has(idx)) idx = (idx + 1) % PIPELINE_ISSUERS.length;
    usedPipelineIdx.add(idx);

    const daysAgo = Math.floor(rng() * 30);
    const pricingDate = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    const matYears = 5 + Math.floor(rng() * 4);
    const matYear = new Date().getFullYear() + matYears;
    const matMonth = String(1 + Math.floor(rng() * 12)).padStart(2, '0');

    newIssuancePipeline.push({
      issuer: PIPELINE_ISSUERS[idx],
      sizeMillions: Math.round((400 + rng() * 1600) / 25) * 25,
      couponPct: Math.round((rng() * 2.5) * 8) / 8,
      conversionPremiumPct: Math.round((25 + rng() * 20) * 10) / 10,
      maturityDate: `${matYear}-${matMonth}-15`,
      bookRunner: BOOK_RUNNERS[Math.floor(rng() * BOOK_RUNNERS.length)],
      pricingDate,
    });
  }

  // ── Sector Breakdown ──────────────────────────────────────────────────

  const sectorBreakdown: SectorBreakdown[] = SECTORS.map(sector => {
    const inSector = activeConvertibles.filter(b => {
      const def = BOND_DEFS.find(d => d.ticker === b.ticker);
      return def?.sector === sector;
    });
    const count = inSector.length > 0 ? inSector.length : Math.floor(1 + rng() * 4);
    const outstanding = inSector.length > 0
      ? Math.round(inSector.length * jitter(8, 0.3) * 10) / 10
      : Math.round(jitter(12, 0.4) * 10) / 10;
    const avgPremium = inSector.length > 0
      ? Math.round(inSector.reduce((s, b) => s + b.conversionPremiumPct, 0) / inSector.length * 10) / 10
      : Math.round(jitter(28, 0.2) * 10) / 10;
    const avgDelta = inSector.length > 0
      ? Math.round(inSector.reduce((s, b) => s + b.delta, 0) / inSector.length * 100) / 100
      : Math.round(jitter(0.45, 0.25) * 100) / 100;
    const avgCoupon = inSector.length > 0
      ? Math.round(inSector.reduce((s, b) => s + b.couponPct, 0) / inSector.length * 100) / 100
      : Math.round(jitter(0.8, 0.5) * 100) / 100;

    return { sector, count, totalOutstandingBillions: outstanding, avgPremium, avgDelta, avgCoupon };
  });

  // ── Conversion Activity ───────────────────────────────────────────────

  const recentConversions: RecentConversion[] = [];
  const usedConvIdx = new Set<number>();
  for (let i = 0; i < 5; i++) {
    let idx = Math.floor(rng() * CONVERSION_ISSUERS.length);
    while (usedConvIdx.has(idx)) idx = (idx + 1) % CONVERSION_ISSUERS.length;
    usedConvIdx.add(idx);

    const daysAgo = Math.floor(rng() * 60);
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

    recentConversions.push({
      issuer: CONVERSION_ISSUERS[idx],
      sharesConverted: Math.round((50000 + rng() * 500000) / 1000) * 1000,
      valueMillions: Math.round(jitter(25, 0.6) * 10) / 10,
      date,
    });
  }

  const conversionActivity: ConversionActivity = {
    recentConversions,
    totalConversionsYTD: Math.round(jitter(142, 0.15)),
    avgConversionDiscount: Math.round(jitter(1.8, 0.3) * 100) / 100,
  };

  return {
    marketOverview,
    activeConvertibles,
    newIssuancePipeline,
    sectorBreakdown,
    conversionActivity,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ───────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ConvertibleBonds] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate convertible bond data' });
  }
});

export default router;
