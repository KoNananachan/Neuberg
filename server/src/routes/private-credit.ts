import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

const DIRECT_LENDING_SEGMENTS = [
  { segment: 'Upper Middle Market', baseSpread: 475, baseYield: 10.08, baseOID: 98.0, baseLeverage: 5.2, baseUnitranche: 62, baseFirstLien: 30, baseSecondLien: 8, baseDealSize: 425 },
  { segment: 'Core Middle Market', baseSpread: 550, baseYield: 10.83, baseOID: 97.5, baseLeverage: 5.5, baseUnitranche: 70, baseFirstLien: 22, baseSecondLien: 8, baseDealSize: 175 },
  { segment: 'Lower Middle Market', baseSpread: 625, baseYield: 11.58, baseOID: 97.0, baseLeverage: 4.8, baseUnitranche: 78, baseFirstLien: 18, baseSecondLien: 4, baseDealSize: 55 },
];

const BDC_LIST = [
  { name: 'Ares Capital', ticker: 'ARCC', baseNav: 19.45, basePrice: 20.80, baseDivYield: 9.4, baseTotalAssets: 22.8, baseNonAccruals: 1.6, basePortYield: 12.1 },
  { name: 'Blue Owl Capital', ticker: 'OBDC', baseNav: 15.72, basePrice: 14.95, baseDivYield: 10.8, baseTotalAssets: 13.5, baseNonAccruals: 1.1, basePortYield: 12.5 },
  { name: 'Owl Rock Core Income', ticker: 'ORCC', baseNav: 15.10, basePrice: 13.82, baseDivYield: 11.4, baseTotalAssets: 10.9, baseNonAccruals: 1.4, basePortYield: 12.8 },
  { name: 'Golub Capital BDC', ticker: 'GBDC', baseNav: 15.25, basePrice: 15.60, baseDivYield: 10.2, baseTotalAssets: 8.2, baseNonAccruals: 0.9, basePortYield: 11.6 },
  { name: 'FS KKR Capital', ticker: 'FSK', baseNav: 24.10, basePrice: 20.45, baseDivYield: 12.8, baseTotalAssets: 15.3, baseNonAccruals: 2.4, basePortYield: 13.2 },
  { name: 'Main Street Capital', ticker: 'MAIN', baseNav: 28.50, basePrice: 46.20, baseDivYield: 5.8, baseTotalAssets: 7.6, baseNonAccruals: 0.5, basePortYield: 12.4 },
  { name: 'Prospect Capital', ticker: 'PSEC', baseNav: 8.72, basePrice: 5.45, baseDivYield: 13.2, baseTotalAssets: 7.1, baseNonAccruals: 3.8, basePortYield: 11.0 },
  { name: 'Hercules Capital', ticker: 'HTGC', baseNav: 11.85, basePrice: 18.90, baseDivYield: 9.6, baseTotalAssets: 3.8, baseNonAccruals: 0.7, basePortYield: 15.2 },
  { name: 'PennantPark Floating Rate', ticker: 'PFLT', baseNav: 11.40, basePrice: 11.15, baseDivYield: 11.0, baseTotalAssets: 4.2, baseNonAccruals: 1.3, basePortYield: 12.0 },
  { name: 'Gladstone Investment', ticker: 'GAIN', baseNav: 14.20, basePrice: 14.55, baseDivYield: 6.8, baseTotalAssets: 3.4, baseNonAccruals: 2.1, basePortYield: 11.8 },
];

const VINTAGE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const VINTAGE_BASE = [
  { deployment: 82, irr: 14.2, moic: 1.42, defaultRate: 3.8, lossRate: 1.2 },
  { deployment: 110, irr: 11.5, moic: 1.28, defaultRate: 4.5, lossRate: 1.8 },
  { deployment: 135, irr: 13.8, moic: 1.35, defaultRate: 2.9, lossRate: 0.9 },
  { deployment: 158, irr: 15.1, moic: 1.22, defaultRate: 1.8, lossRate: 0.5 },
  { deployment: 172, irr: 12.4, moic: 1.10, defaultRate: 1.2, lossRate: 0.3 },
  { deployment: 95, irr: 0, moic: 1.02, defaultRate: 0.4, lossRate: 0.1 },
];

const DEAL_PIPELINE_SECTORS = ['Healthcare Services', 'Enterprise Software', 'Financial Services', 'Industrials', 'Consumer Products', 'Business Services'];
const DEAL_PIPELINE_BORROWERS = [
  'MedVista Health Partners', 'Apex Cloud Solutions', 'Meridian Financial Group',
  'Ironbridge Manufacturing', 'Crestline Consumer Brands', 'Vanguard Advisory Services',
];
const DEAL_PIPELINE_ARRANGERS = ['Ares Management', 'Owl Rock', 'Golub Capital', 'HPS Investment', 'Blue Owl', 'KKR Credit'];


let cacheData: unknown = null;
let cacheTime = 0;

function generate() {
  const seed = hashSeed('private-credit-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Direct Lending spreads by deal size
  const directLending = DIRECT_LENDING_SEGMENTS.map(seg => {
    const spread = Math.round(jitter(seg.baseSpread, 0.08));
    const sofrRate = 5.33;
    const allInYield = Math.round((sofrRate + spread / 100) * 100) / 100;
    const oid = Math.round(jitter(seg.baseOID, 0.008) * 10) / 10;
    const leverage = Math.round(jitter(seg.baseLeverage, 0.06) * 10) / 10;
    const unitranchePct = Math.round(jitter(seg.baseUnitranche, 0.05));
    const firstLienPct = Math.round(jitter(seg.baseFirstLien, 0.08));
    const secondLienPct = Math.max(0, 100 - unitranchePct - firstLienPct);
    const avgDealSize = Math.round(jitter(seg.baseDealSize, 0.1));

    return {
      segment: seg.segment,
      allInYield,
      spreadOverSOFR: spread,
      oid,
      leverage,
      unitranchePct,
      firstLienPct,
      secondLienPct,
      avgDealSize,
    };
  });

  // 2. BDC Monitor
  const bdcMonitor = BDC_LIST.map(bdc => {
    const navPerShare = Math.round(jitter(bdc.baseNav, 0.03) * 100) / 100;
    const price = Math.round(jitter(bdc.basePrice, 0.04) * 100) / 100;
    const priceToNav = Math.round((price / navPerShare - 1) * 100 * 10) / 10;
    const dividendYield = Math.round(jitter(bdc.baseDivYield, 0.05) * 100) / 100;
    const totalAssets = Math.round(jitter(bdc.baseTotalAssets, 0.04) * 10) / 10;
    const nonAccruals = Math.round(jitter(bdc.baseNonAccruals, 0.15) * 10) / 10;
    const portfolioYield = Math.round(jitter(bdc.basePortYield, 0.04) * 100) / 100;

    return {
      name: bdc.name,
      ticker: bdc.ticker,
      navPerShare,
      price,
      priceToNav,
      dividendYield,
      totalAssets,
      nonAccruals,
      portfolioYield,
    };
  });

  // 3. Market Terms
  const avgAllInYield = Math.round(directLending.reduce((a, d) => a + d.allInYield, 0) / directLending.length * 100) / 100;
  const avgLeverage = Math.round(directLending.reduce((a, d) => a + d.leverage, 0) / directLending.length * 10) / 10;
  const avgEbitdaFloor = Math.round(jitter(25, 0.08) * 10) / 10;
  const covLitePct = Math.round(jitter(72, 0.06));
  const sofrFloorAvg = Math.round(jitter(100, 0.1));
  const avgOid = Math.round(directLending.reduce((a, d) => a + d.oid, 0) / directLending.length * 10) / 10;

  const marketTerms = {
    currentAvgAllInYield: avgAllInYield,
    avgLeverage,
    avgEbitdaFloor,
    documentationTrends: {
      covLitePct,
      sofrFloorAvgBps: sofrFloorAvg,
    },
    avgOid: avgOid,
  };

  // 4. Vintage Performance
  const vintagePerformance = VINTAGE_YEARS.map((year, idx) => {
    const base = VINTAGE_BASE[idx];
    const deployment = Math.round(jitter(base.deployment, 0.08) * 10) / 10;
    const irr = year === 2025 ? 0 : Math.round(jitter(base.irr, 0.06) * 10) / 10;
    const moic = Math.round(jitter(base.moic, 0.04) * 100) / 100;
    const defaultRate = Math.round(jitter(base.defaultRate, 0.12) * 10) / 10;
    const lossRate = Math.round(jitter(base.lossRate, 0.15) * 10) / 10;

    return { year, deployment, irr, moic, defaultRate, lossRate };
  });

  // 5. Deal Pipeline
  const dealPipeline = DEAL_PIPELINE_BORROWERS.map((borrower, idx) => {
    const sector = DEAL_PIPELINE_SECTORS[idx];
    const size = Math.round(jitter(250 + idx * 80, 0.15));
    const leverage = Math.round(jitter(5.0 + rng() * 1.2, 0.06) * 10) / 10;
    const spread = Math.round(jitter(500 + rng() * 150, 0.08));
    const arranger = DEAL_PIPELINE_ARRANGERS[Math.floor(rng() * DEAL_PIPELINE_ARRANGERS.length)];
    const statusRoll = rng();
    const status = statusRoll < 0.3 ? 'In Market' : statusRoll < 0.6 ? 'Mandated' : 'Launched';

    return { borrower, sector, size, leverage, spread, leadArranger: arranger, status };
  });

  // 6. Market Stats
  const totalPrivateCreditAUM = Math.round(jitter(1.72, 0.04) * 100) / 100;
  const quarterlyFundraising = Math.round(jitter(48.5, 0.1) * 10) / 10;
  const quarterlyDeployment = Math.round(jitter(62.3, 0.08) * 10) / 10;
  const dryPowder = Math.round(jitter(415, 0.06) * 10) / 10;
  const avgFundSize = Math.round(jitter(3.2, 0.12) * 10) / 10;

  const marketStats = {
    totalPrivateCreditAUM,
    quarterlyFundraising,
    quarterlyDeployment,
    dryPowder,
    avgFundSize,
  };

  return {
    directLending,
    bdcMonitor,
    marketTerms,
    vintagePerformance,
    dealPipeline,
    marketStats,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[PrivateCredit] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate private credit data' });
  }
});

export default router;
