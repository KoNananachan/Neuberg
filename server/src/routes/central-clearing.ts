import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();

// -- Deterministic seeded RNG --

// -- Cache --

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// -- CCP seed data --

interface CCPConfig {
  name: string;
  region: string;
  currency: string;
  baseDailyNotional: number;      // trillions
  baseMonthlyNotional: number;
  baseYtdNotional: number;
  baseDailyTrades: number;
  baseMonthlyTrades: number;
  productMix: { type: string; baseVolume: number }[];
  baseIM: number;                 // billions
  baseVM: number;
  baseTotalCollateral: number;
  baseCashPct: number;
  baseGovBondPct: number;
  baseDefaultFundSize: number;    // billions
  baseDefaultFundUtil: number;
  baseAdequacyRatio: number;
  totalMembers: number;
  clearingMembers: number;
  clients: number;
  baseTop5Share: number;
  baseHHI: number;
  baseStressCoverage: number;
  scenariosRun: number;
}

const CCP_CONFIGS: CCPConfig[] = [
  {
    name: 'LCH Ltd',
    region: 'EMEA',
    currency: 'USD',
    baseDailyNotional: 5.82,
    baseMonthlyNotional: 127.4,
    baseYtdNotional: 342.8,
    baseDailyTrades: 285000,
    baseMonthlyTrades: 6240000,
    productMix: [
      { type: 'IRS', baseVolume: 3.92 },
      { type: 'CDS', baseVolume: 0.48 },
      { type: 'FX', baseVolume: 0.86 },
      { type: 'Futures', baseVolume: 0.32 },
      { type: 'Options', baseVolume: 0.14 },
      { type: 'Equity', baseVolume: 0.10 },
    ],
    baseIM: 178.5,
    baseVM: 12.4,
    baseTotalCollateral: 215.8,
    baseCashPct: 42.5,
    baseGovBondPct: 48.2,
    baseDefaultFundSize: 8.9,
    baseDefaultFundUtil: 0.12,
    baseAdequacyRatio: 1.28,
    totalMembers: 185,
    clearingMembers: 58,
    clients: 4200,
    baseTop5Share: 38.2,
    baseHHI: 620,
    baseStressCoverage: 1.15,
    scenariosRun: 62,
  },
  {
    name: 'CME Clearing',
    region: 'Americas',
    currency: 'USD',
    baseDailyNotional: 4.65,
    baseMonthlyNotional: 102.3,
    baseYtdNotional: 275.1,
    baseDailyTrades: 425000,
    baseMonthlyTrades: 9350000,
    productMix: [
      { type: 'IRS', baseVolume: 1.18 },
      { type: 'CDS', baseVolume: 0.06 },
      { type: 'FX', baseVolume: 0.42 },
      { type: 'Futures', baseVolume: 2.35 },
      { type: 'Options', baseVolume: 0.52 },
      { type: 'Equity', baseVolume: 0.12 },
    ],
    baseIM: 142.3,
    baseVM: 9.8,
    baseTotalCollateral: 172.6,
    baseCashPct: 38.1,
    baseGovBondPct: 52.4,
    baseDefaultFundSize: 11.2,
    baseDefaultFundUtil: 0.09,
    baseAdequacyRatio: 1.35,
    totalMembers: 210,
    clearingMembers: 72,
    clients: 5800,
    baseTop5Share: 34.6,
    baseHHI: 540,
    baseStressCoverage: 1.22,
    scenariosRun: 58,
  },
  {
    name: 'ICE Clear',
    region: 'Americas',
    currency: 'USD',
    baseDailyNotional: 2.94,
    baseMonthlyNotional: 64.7,
    baseYtdNotional: 174.2,
    baseDailyTrades: 312000,
    baseMonthlyTrades: 6860000,
    productMix: [
      { type: 'IRS', baseVolume: 0.28 },
      { type: 'CDS', baseVolume: 1.42 },
      { type: 'FX', baseVolume: 0.08 },
      { type: 'Futures', baseVolume: 0.94 },
      { type: 'Options', baseVolume: 0.16 },
      { type: 'Equity', baseVolume: 0.06 },
    ],
    baseIM: 68.4,
    baseVM: 5.2,
    baseTotalCollateral: 82.9,
    baseCashPct: 35.8,
    baseGovBondPct: 55.6,
    baseDefaultFundSize: 6.8,
    baseDefaultFundUtil: 0.11,
    baseAdequacyRatio: 1.31,
    totalMembers: 145,
    clearingMembers: 48,
    clients: 3100,
    baseTop5Share: 41.8,
    baseHHI: 710,
    baseStressCoverage: 1.18,
    scenariosRun: 54,
  },
  {
    name: 'Eurex Clearing',
    region: 'EMEA',
    currency: 'EUR',
    baseDailyNotional: 3.28,
    baseMonthlyNotional: 72.1,
    baseYtdNotional: 194.0,
    baseDailyTrades: 268000,
    baseMonthlyTrades: 5900000,
    productMix: [
      { type: 'IRS', baseVolume: 1.52 },
      { type: 'CDS', baseVolume: 0.18 },
      { type: 'FX', baseVolume: 0.12 },
      { type: 'Futures', baseVolume: 0.98 },
      { type: 'Options', baseVolume: 0.34 },
      { type: 'Equity', baseVolume: 0.14 },
    ],
    baseIM: 92.6,
    baseVM: 7.1,
    baseTotalCollateral: 112.4,
    baseCashPct: 36.4,
    baseGovBondPct: 54.8,
    baseDefaultFundSize: 5.4,
    baseDefaultFundUtil: 0.10,
    baseAdequacyRatio: 1.33,
    totalMembers: 165,
    clearingMembers: 52,
    clients: 3800,
    baseTop5Share: 36.5,
    baseHHI: 580,
    baseStressCoverage: 1.20,
    scenariosRun: 56,
  },
  {
    name: 'JSCC',
    region: 'APAC',
    currency: 'JPY',
    baseDailyNotional: 2.14,
    baseMonthlyNotional: 47.1,
    baseYtdNotional: 126.8,
    baseDailyTrades: 142000,
    baseMonthlyTrades: 3120000,
    productMix: [
      { type: 'IRS', baseVolume: 1.38 },
      { type: 'CDS', baseVolume: 0.22 },
      { type: 'FX', baseVolume: 0.18 },
      { type: 'Futures', baseVolume: 0.24 },
      { type: 'Options', baseVolume: 0.08 },
      { type: 'Equity', baseVolume: 0.04 },
    ],
    baseIM: 48.2,
    baseVM: 3.6,
    baseTotalCollateral: 58.4,
    baseCashPct: 52.1,
    baseGovBondPct: 40.8,
    baseDefaultFundSize: 3.2,
    baseDefaultFundUtil: 0.08,
    baseAdequacyRatio: 1.42,
    totalMembers: 92,
    clearingMembers: 34,
    clients: 1800,
    baseTop5Share: 48.2,
    baseHHI: 880,
    baseStressCoverage: 1.25,
    scenariosRun: 48,
  },
  {
    name: 'OCC',
    region: 'Americas',
    currency: 'USD',
    baseDailyNotional: 1.86,
    baseMonthlyNotional: 40.9,
    baseYtdNotional: 110.2,
    baseDailyTrades: 685000,
    baseMonthlyTrades: 15070000,
    productMix: [
      { type: 'IRS', baseVolume: 0.02 },
      { type: 'CDS', baseVolume: 0.01 },
      { type: 'FX', baseVolume: 0.03 },
      { type: 'Futures', baseVolume: 0.18 },
      { type: 'Options', baseVolume: 1.46 },
      { type: 'Equity', baseVolume: 0.16 },
    ],
    baseIM: 98.4,
    baseVM: 6.2,
    baseTotalCollateral: 118.2,
    baseCashPct: 28.6,
    baseGovBondPct: 42.1,
    baseDefaultFundSize: 7.6,
    baseDefaultFundUtil: 0.07,
    baseAdequacyRatio: 1.48,
    totalMembers: 125,
    clearingMembers: 22,
    clients: 8200,
    baseTop5Share: 52.4,
    baseHHI: 1020,
    baseStressCoverage: 1.30,
    scenariosRun: 44,
  },
  {
    name: 'DTCC',
    region: 'Americas',
    currency: 'USD',
    baseDailyNotional: 2.52,
    baseMonthlyNotional: 55.4,
    baseYtdNotional: 149.2,
    baseDailyTrades: 520000,
    baseMonthlyTrades: 11440000,
    productMix: [
      { type: 'IRS', baseVolume: 0.12 },
      { type: 'CDS', baseVolume: 0.08 },
      { type: 'FX', baseVolume: 0.32 },
      { type: 'Futures', baseVolume: 0.14 },
      { type: 'Options', baseVolume: 0.06 },
      { type: 'Equity', baseVolume: 1.80 },
    ],
    baseIM: 38.6,
    baseVM: 2.8,
    baseTotalCollateral: 46.2,
    baseCashPct: 44.2,
    baseGovBondPct: 46.5,
    baseDefaultFundSize: 4.8,
    baseDefaultFundUtil: 0.06,
    baseAdequacyRatio: 1.52,
    totalMembers: 340,
    clearingMembers: 45,
    clients: 12400,
    baseTop5Share: 32.1,
    baseHHI: 480,
    baseStressCoverage: 1.28,
    scenariosRun: 52,
  },
  {
    name: 'SGX-DC',
    region: 'APAC',
    currency: 'USD',
    baseDailyNotional: 0.86,
    baseMonthlyNotional: 18.9,
    baseYtdNotional: 50.8,
    baseDailyTrades: 98000,
    baseMonthlyTrades: 2156000,
    productMix: [
      { type: 'IRS', baseVolume: 0.22 },
      { type: 'CDS', baseVolume: 0.04 },
      { type: 'FX', baseVolume: 0.28 },
      { type: 'Futures', baseVolume: 0.24 },
      { type: 'Options', baseVolume: 0.06 },
      { type: 'Equity', baseVolume: 0.02 },
    ],
    baseIM: 18.4,
    baseVM: 1.4,
    baseTotalCollateral: 22.6,
    baseCashPct: 48.6,
    baseGovBondPct: 42.2,
    baseDefaultFundSize: 1.8,
    baseDefaultFundUtil: 0.09,
    baseAdequacyRatio: 1.38,
    totalMembers: 68,
    clearingMembers: 28,
    clients: 1200,
    baseTop5Share: 54.8,
    baseHHI: 1140,
    baseStressCoverage: 1.16,
    scenariosRun: 42,
  },
  {
    name: 'HKEX Clearing',
    region: 'APAC',
    currency: 'HKD',
    baseDailyNotional: 1.24,
    baseMonthlyNotional: 27.3,
    baseYtdNotional: 73.5,
    baseDailyTrades: 186000,
    baseMonthlyTrades: 4092000,
    productMix: [
      { type: 'IRS', baseVolume: 0.32 },
      { type: 'CDS', baseVolume: 0.02 },
      { type: 'FX', baseVolume: 0.14 },
      { type: 'Futures', baseVolume: 0.42 },
      { type: 'Options', baseVolume: 0.12 },
      { type: 'Equity', baseVolume: 0.22 },
    ],
    baseIM: 28.6,
    baseVM: 2.2,
    baseTotalCollateral: 34.8,
    baseCashPct: 46.8,
    baseGovBondPct: 44.1,
    baseDefaultFundSize: 2.4,
    baseDefaultFundUtil: 0.10,
    baseAdequacyRatio: 1.36,
    totalMembers: 112,
    clearingMembers: 38,
    clients: 2600,
    baseTop5Share: 44.6,
    baseHHI: 820,
    baseStressCoverage: 1.19,
    scenariosRun: 46,
  },
  {
    name: 'ASX Clear',
    region: 'APAC',
    currency: 'AUD',
    baseDailyNotional: 0.68,
    baseMonthlyNotional: 14.9,
    baseYtdNotional: 40.2,
    baseDailyTrades: 74000,
    baseMonthlyTrades: 1628000,
    productMix: [
      { type: 'IRS', baseVolume: 0.28 },
      { type: 'CDS', baseVolume: 0.02 },
      { type: 'FX', baseVolume: 0.06 },
      { type: 'Futures', baseVolume: 0.18 },
      { type: 'Options', baseVolume: 0.08 },
      { type: 'Equity', baseVolume: 0.06 },
    ],
    baseIM: 14.2,
    baseVM: 1.1,
    baseTotalCollateral: 17.4,
    baseCashPct: 40.2,
    baseGovBondPct: 50.6,
    baseDefaultFundSize: 1.4,
    baseDefaultFundUtil: 0.07,
    baseAdequacyRatio: 1.44,
    totalMembers: 56,
    clearingMembers: 22,
    clients: 900,
    baseTop5Share: 58.2,
    baseHHI: 1280,
    baseStressCoverage: 1.24,
    scenariosRun: 38,
  },
];

// -- Asset class breakdown seed data --

interface AssetClassConfig {
  assetClass: string;
  baseVolume: number;  // trillions
  dominantCCP: string;
}

const ASSET_CLASS_CONFIGS: AssetClassConfig[] = [
  { assetClass: 'Interest Rate Swaps', baseVolume: 9.24, dominantCCP: 'LCH Ltd' },
  { assetClass: 'Credit Default Swaps', baseVolume: 2.53, dominantCCP: 'ICE Clear' },
  { assetClass: 'FX Derivatives', baseVolume: 2.49, dominantCCP: 'LCH Ltd' },
  { assetClass: 'Futures', baseVolume: 5.99, dominantCCP: 'CME Clearing' },
  { assetClass: 'Listed Options', baseVolume: 3.02, dominantCCP: 'OCC' },
  { assetClass: 'Equity / Cash', baseVolume: 2.72, dominantCCP: 'DTCC' },
];

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-central-clearing'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => {
    const f = 10 ** d;
    return Math.round(v * f) / f;
  };

  // -- Per-CCP data --

  const ccps = CCP_CONFIGS.map((cfg) => {
    const dailyNotional = roundTo(jitter(cfg.baseDailyNotional, 0.08), 3);
    const monthlyNotional = roundTo(jitter(cfg.baseMonthlyNotional, 0.06), 2);
    const ytdNotional = roundTo(jitter(cfg.baseYtdNotional, 0.04), 2);

    const dailyTrades = Math.round(jitter(cfg.baseDailyTrades, 0.10));
    const monthlyTrades = Math.round(jitter(cfg.baseMonthlyTrades, 0.08));

    // Product breakdown with shares
    const rawProducts = cfg.productMix.map((p) => ({
      type: p.type,
      volume: roundTo(jitter(p.baseVolume, 0.10), 3),
    }));
    const totalProductVol = rawProducts.reduce((s, p) => s + p.volume, 0);
    const products = rawProducts.map((p) => ({
      type: p.type,
      volume: p.volume,
      share: roundTo((p.volume / totalProductVol) * 100, 1),
    }));

    // Margins
    const initialMargin = roundTo(jitter(cfg.baseIM, 0.06), 2);
    const variationMargin = roundTo(jitter(cfg.baseVM, 0.12), 2);
    const totalCollateral = roundTo(jitter(cfg.baseTotalCollateral, 0.05), 2);
    const cashPct = roundTo(Math.min(65, Math.max(20, jitter(cfg.baseCashPct, 0.08))), 1);
    const govBondPct = roundTo(Math.min(70, Math.max(25, jitter(cfg.baseGovBondPct, 0.06))), 1);

    // Default fund
    const defaultFundSize = roundTo(jitter(cfg.baseDefaultFundSize, 0.06), 2);
    const utilization = roundTo(Math.min(0.25, Math.max(0.03, jitter(cfg.baseDefaultFundUtil, 0.15))), 3);
    const adequacyRatio = roundTo(Math.min(1.65, Math.max(1.10, jitter(cfg.baseAdequacyRatio, 0.04))), 2);

    // Members
    const memberJitter = Math.round((rng() - 0.5) * 6);
    const total = cfg.totalMembers + memberJitter;
    const clearingMemberJitter = Math.round((rng() - 0.5) * 4);
    const clearingMembers = cfg.clearingMembers + clearingMemberJitter;
    const clientJitter = Math.round((rng() - 0.5) * cfg.clients * 0.05);
    const clients = cfg.clients + clientJitter;

    // Concentration risk
    const top5Share = roundTo(Math.min(70, Math.max(25, jitter(cfg.baseTop5Share, 0.06))), 1);
    const herfindahlIndex = Math.round(Math.min(1800, Math.max(300, jitter(cfg.baseHHI, 0.08))));

    // Stress test
    const coverage = roundTo(Math.min(1.45, Math.max(1.05, jitter(cfg.baseStressCoverage, 0.04))), 2);
    const scenarioJitter = Math.round((rng() - 0.5) * 8);
    const scenariosRun = cfg.scenariosRun + scenarioJitter;

    // Last stress test date: within last 7 days
    const daysAgo = Math.floor(rng() * 7);
    const lastDate = new Date();
    lastDate.setDate(lastDate.getDate() - daysAgo);

    return {
      name: cfg.name,
      region: cfg.region,
      currency: cfg.currency,
      notionalCleared: {
        daily: dailyNotional,
        monthly: monthlyNotional,
        ytd: ytdNotional,
      },
      trades: {
        daily: dailyTrades,
        monthly: monthlyTrades,
      },
      products,
      margins: {
        initialMargin,
        variationMargin,
        totalCollateral,
        cashPct,
        govBondPct,
      },
      defaultFund: {
        size: defaultFundSize,
        utilization,
        adequacyRatio,
      },
      members: {
        total,
        clearingMembers,
        clients,
      },
      concentrationRisk: {
        top5Share,
        herfindahlIndex,
      },
      stressTest: {
        coverage,
        scenariosRun,
        lastDate: lastDate.toISOString().slice(0, 10),
      },
    };
  });

  // -- Global summary --

  const totalNotional = roundTo(
    ccps.reduce((s, c) => s + c.notionalCleared.daily, 0),
    3,
  );
  const totalIM = roundTo(
    ccps.reduce((s, c) => s + c.margins.initialMargin, 0),
    2,
  );
  const totalDefaultFunds = roundTo(
    ccps.reduce((s, c) => s + c.defaultFund.size, 0),
    2,
  );

  const globalSummary = {
    totalNotional,
    totalIM,
    totalDefaultFunds,
    ccpCount: ccps.length,
  };

  // -- Asset class breakdown --

  const rawAssetClasses = ASSET_CLASS_CONFIGS.map((ac) => ({
    assetClass: ac.assetClass,
    volume: roundTo(jitter(ac.baseVolume, 0.07), 3),
    dominantCCP: ac.dominantCCP,
  }));
  const totalAssetVolume = rawAssetClasses.reduce((s, a) => s + a.volume, 0);
  const assetClassBreakdown = rawAssetClasses.map((a) => ({
    assetClass: a.assetClass,
    volume: a.volume,
    share: roundTo((a.volume / totalAssetVolume) * 100, 1),
    dominantCCP: a.dominantCCP,
  }));

  // -- Regulatory metrics --

  const coverageRatio = roundTo(Math.min(1.40, Math.max(1.08, jitter(1.22, 0.05))), 2);
  const skinInTheGame = roundTo(jitter(2.8, 0.10), 2);
  const qualifiedResources = roundTo(jitter(totalIM * 1.12, 0.04), 2);

  const regulatoryMetrics = {
    coverageRatio,
    skinInTheGame,
    qualifiedResources,
  };

  return {
    ccps,
    globalSummary,
    assetClassBreakdown,
    regulatoryMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CentralClearing] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate central clearing data' });
  }
});

export default router;
