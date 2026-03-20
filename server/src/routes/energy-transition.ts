import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

let cache: { data: unknown; ts: number } | null = null;

// ── Clean Energy Stocks config ──

const STOCKS_CONFIG = [
  { ticker: 'ENPH', name: 'Enphase Energy', sector: 'Solar' as const, low: 120, high: 140, mcapBase: 16 },
  { ticker: 'SEDG', name: 'SolarEdge Technologies', sector: 'Solar' as const, low: 60, high: 80, mcapBase: 4.5 },
  { ticker: 'FSLR', name: 'First Solar', sector: 'Solar' as const, low: 170, high: 200, mcapBase: 19 },
  { ticker: 'NEE', name: 'NextEra Energy', sector: 'Wind' as const, low: 65, high: 80, mcapBase: 150 },
  { ticker: 'PLUG', name: 'Plug Power', sector: 'Hydrogen' as const, low: 3, high: 6, mcapBase: 2.5 },
  { ticker: 'RIVN', name: 'Rivian Automotive', sector: 'EV' as const, low: 10, high: 15, mcapBase: 12 },
  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'EV' as const, low: 170, high: 250, mcapBase: 620 },
  { ticker: 'BEP', name: 'Brookfield Renewable', sector: 'Wind' as const, low: 25, high: 30, mcapBase: 18 },
  { ticker: 'RUN', name: 'Sunrun Inc', sector: 'Solar' as const, low: 12, high: 18, mcapBase: 3 },
  { ticker: 'CHPT', name: 'ChargePoint Holdings', sector: 'Battery' as const, low: 1, high: 3, mcapBase: 0.8 },
];

// ── Clean Energy ETFs config ──

const ETFS_CONFIG = [
  { ticker: 'ICLN', name: 'iShares Global Clean Energy', aumBase: 3.2 },
  { ticker: 'TAN', name: 'Invesco Solar ETF', aumBase: 1.8 },
  { ticker: 'FAN', name: 'First Trust Global Wind Energy', aumBase: 0.28 },
  { ticker: 'QCLN', name: 'First Trust NASDAQ Clean Edge', aumBase: 1.1 },
  { ticker: 'LIT', name: 'Global X Lithium & Battery', aumBase: 2.4 },
  { ticker: 'DRIV', name: 'Global X Autonomous & EV', aumBase: 0.95 },
];

// ── Capacity Additions config ──

const CAPACITY_CONFIG = [
  { type: 'Solar', capacityBase: 420, investBase: 310, region: 'Global' },
  { type: 'Onshore Wind', capacityBase: 110, investBase: 120, region: 'Global' },
  { type: 'Offshore Wind', capacityBase: 18, investBase: 55, region: 'Europe/Asia' },
  { type: 'Battery Storage', capacityBase: 45, investBase: 40, region: 'Global' },
  { type: 'Hydrogen', capacityBase: 3.2, investBase: 18, region: 'Europe/Middle East' },
];

// ── EV Adoption config ──

const EV_CONFIG = [
  { market: 'China', evSalesBase: 9.5, shareBase: 38, yoyBase: 22, topBrand: 'BYD' },
  { market: 'Europe', evSalesBase: 3.2, shareBase: 24, yoyBase: 12, topBrand: 'Tesla' },
  { market: 'US', evSalesBase: 1.8, shareBase: 10, yoyBase: 18, topBrand: 'Tesla' },
  { market: 'Global', evSalesBase: 16.5, shareBase: 20, yoyBase: 19, topBrand: 'BYD' },
];

// ── Green Bond config ──

const GREEN_BOND_CONFIG = [
  { issuer: 'European Investment Bank', sizeBase: 5.0, couponBase: 3.2, tenor: '10Y', greenCategory: 'renewable' as const, spreadBase: 45 },
  { issuer: 'Republic of France', sizeBase: 8.5, couponBase: 2.8, tenor: '20Y', greenCategory: 'efficiency' as const, spreadBase: 38 },
  { issuer: 'Apple Inc', sizeBase: 2.0, couponBase: 3.5, tenor: '7Y', greenCategory: 'efficiency' as const, spreadBase: 55 },
  { issuer: 'Iberdrola', sizeBase: 1.5, couponBase: 4.1, tenor: '5Y', greenCategory: 'renewable' as const, spreadBase: 72 },
  { issuer: 'Toyota Motor', sizeBase: 3.0, couponBase: 3.0, tenor: '10Y', greenCategory: 'transport' as const, spreadBase: 50 },
  { issuer: 'World Bank', sizeBase: 4.0, couponBase: 2.5, tenor: '15Y', greenCategory: 'renewable' as const, spreadBase: 30 },
];

// ── Policy Tracker config ──

const POLICY_CONFIG = [
  { country: 'United States', policy: 'Inflation Reduction Act Extension', type: 'subsidy' as const, impact: 'positive' as const, effectiveDate: '2026-01-01' },
  { country: 'European Union', policy: 'Carbon Border Adjustment Mechanism Phase 2', type: 'tax' as const, impact: 'positive' as const, effectiveDate: '2026-01-01' },
  { country: 'China', policy: 'New Energy Vehicle Purchase Tax Exemption', type: 'subsidy' as const, impact: 'positive' as const, effectiveDate: '2025-12-31' },
  { country: 'India', policy: 'Green Hydrogen Mission Mandate', type: 'mandate' as const, impact: 'positive' as const, effectiveDate: '2026-03-01' },
  { country: 'United Kingdom', policy: 'Zero Emission Vehicle Mandate 2035', type: 'mandate' as const, impact: 'positive' as const, effectiveDate: '2025-06-01' },
  { country: 'Germany', policy: 'Renewable Energy Surcharge Reform', type: 'subsidy' as const, impact: 'positive' as const, effectiveDate: '2026-04-01' },
  { country: 'Japan', policy: 'Green Transformation Bonds', type: 'subsidy' as const, impact: 'positive' as const, effectiveDate: '2025-10-01' },
  { country: 'Australia', policy: 'Safeguard Mechanism Carbon Cap', type: 'mandate' as const, impact: 'negative' as const, effectiveDate: '2025-07-01' },
];

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-energy-transition'));

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const jitter = (low: number, high: number) => low + rng() * (high - low);
  const pctChange = (magnitude: number) => round2((rng() - 0.48) * magnitude);

  // ── Clean Energy Stocks ──

  const cleanEnergyStocks = STOCKS_CONFIG.map(s => {
    const price = round2(jitter(s.low, s.high));
    const change = round2(price * (rng() - 0.48) * 0.04);
    const changePercent = round2((change / price) * 100);
    const marketCap = round1(s.mcapBase * (0.85 + rng() * 0.3));
    return {
      ticker: s.ticker,
      name: s.name,
      price,
      change,
      changePercent,
      marketCap: `${marketCap}B`,
      sector: s.sector,
    };
  });

  // ── Clean Energy ETFs ──

  const cleanEnergyETFs = ETFS_CONFIG.map(e => {
    const price = round2(10 + rng() * 30);
    const change = round2(price * (rng() - 0.48) * 0.03);
    const aum = round2(e.aumBase * (0.8 + rng() * 0.4));
    const ytdReturn = round2((rng() - 0.4) * 30);
    const flows1m = round1((rng() - 0.45) * 500);
    return {
      ticker: e.ticker,
      name: e.name,
      price,
      change,
      aum: `${aum}B`,
      ytdReturn,
      flows1m: `${flows1m}M`,
    };
  });

  // ── Capacity Additions ──

  const capacityAdditions = CAPACITY_CONFIG.map(c => {
    const capacityGW = round1(c.capacityBase * (0.9 + rng() * 0.2));
    const changeYoY = round1(5 + rng() * 25);
    const investmentBn = round1(c.investBase * (0.85 + rng() * 0.3));
    return {
      type: c.type,
      capacityGW,
      changeYoY,
      investmentBn,
      region: c.region,
    };
  });

  // ── EV Adoption ──

  const evAdoption = EV_CONFIG.map(e => {
    const evSalesM = round2(e.evSalesBase * (0.9 + rng() * 0.2));
    const marketSharePct = round1(e.shareBase * (0.9 + rng() * 0.2));
    const yoyGrowthPct = round1(e.yoyBase * (0.7 + rng() * 0.6));
    return {
      market: e.market,
      evSalesM,
      marketSharePct,
      yoyGrowthPct,
      topBrand: e.topBrand,
    };
  });

  // ── Green Bond Market ──

  const greenBondMarket = GREEN_BOND_CONFIG.map(b => {
    const size = round2(b.sizeBase * (0.8 + rng() * 0.4));
    const coupon = round2(b.couponBase + (rng() - 0.5) * 0.8);
    const spread = Math.round(b.spreadBase + (rng() - 0.5) * 20);
    return {
      issuer: b.issuer,
      size,
      coupon,
      tenor: b.tenor,
      greenCategory: b.greenCategory,
      spread,
    };
  });

  // ── Policy Tracker ──

  const policyTracker = POLICY_CONFIG.map(p => ({
    country: p.country,
    policy: p.policy,
    type: p.type,
    impact: p.impact,
    effectiveDate: p.effectiveDate,
  }));

  return {
    cleanEnergyStocks,
    cleanEnergyETFs,
    capacityAdditions,
    evAdoption,
    greenBondMarket,
    policyTracker,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EnergyTransition] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate energy transition data' });
  }
});

export default router;
