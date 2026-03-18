import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DIRECT_LENDING_SEGMENTS = [
  { segment: 'Upper Middle Market', baseSpread: 550, baseLeverage: 4.8, baseLTV: 48, baseDealSize: 350 },
  { segment: 'Core Middle Market', baseSpread: 625, baseLeverage: 5.2, baseLTV: 52, baseDealSize: 150 },
  { segment: 'Lower Middle Market', baseSpread: 700, baseLeverage: 4.5, baseLTV: 45, baseDealSize: 50 },
  { segment: 'Unitranche Senior', baseSpread: 575, baseLeverage: 5.0, baseLTV: 50, baseDealSize: 200 },
  { segment: 'Unitranche Stretched', baseSpread: 650, baseLeverage: 5.8, baseLTV: 58, baseDealSize: 175 },
  { segment: 'Second Lien', baseSpread: 825, baseLeverage: 6.2, baseLTV: 65, baseDealSize: 100 },
  { segment: 'Mezzanine', baseSpread: 1050, baseLeverage: 6.5, baseLTV: 70, baseDealSize: 75 },
  { segment: 'Venture Debt', baseSpread: 750, baseLeverage: 3.5, baseLTV: 35, baseDealSize: 25 },
];

const BDC_LIST = [
  { name: 'Ares Capital', baseNAV: 19.50, baseDivYield: 9.8, baseROE: 12.5, baseNonAccruals: 1.8, baseTotalAssets: 22.5 },
  { name: 'Blue Owl', baseNAV: 15.80, baseDivYield: 10.5, baseROE: 11.0, baseNonAccruals: 1.2, baseTotalAssets: 13.2 },
  { name: 'Owl Rock', baseNAV: 15.20, baseDivYield: 11.2, baseROE: 10.8, baseNonAccruals: 1.5, baseTotalAssets: 10.8 },
  { name: 'Golub', baseNAV: 16.50, baseDivYield: 10.0, baseROE: 11.5, baseNonAccruals: 2.0, baseTotalAssets: 8.5 },
  { name: 'FS KKR', baseNAV: 23.80, baseDivYield: 12.0, baseROE: 13.2, baseNonAccruals: 2.5, baseTotalAssets: 15.0 },
  { name: 'Main Street', baseNAV: 25.00, baseDivYield: 9.2, baseROE: 11.8, baseNonAccruals: 0.8, baseTotalAssets: 7.8 },
  { name: 'Prospect', baseNAV: 17.00, baseDivYield: 11.8, baseROE: 9.5, baseNonAccruals: 3.2, baseTotalAssets: 7.2 },
  { name: 'Gladstone', baseNAV: 15.50, baseDivYield: 10.8, baseROE: 10.2, baseNonAccruals: 2.8, baseTotalAssets: 3.5 },
];

const QUARTERS = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025'];

const DEFAULT_CATEGORIES = [
  { category: 'Senior Secured 1st Lien', baseTrailingDefault: 1.2, basePeakDefault: 4.5, baseAvgRecovery: 72, baseStress: 3.5, baseWatchlist: 18 },
  { category: 'Senior Secured 2nd Lien', baseTrailingDefault: 2.8, basePeakDefault: 8.2, baseAvgRecovery: 45, baseStress: 6.0, baseWatchlist: 12 },
  { category: 'Unitranche', baseTrailingDefault: 1.8, basePeakDefault: 5.5, baseAvgRecovery: 58, baseStress: 4.2, baseWatchlist: 15 },
  { category: 'Mezzanine', baseTrailingDefault: 3.5, basePeakDefault: 10.0, baseAvgRecovery: 32, baseStress: 7.5, baseWatchlist: 9 },
  { category: 'Unsecured', baseTrailingDefault: 5.0, basePeakDefault: 14.0, baseAvgRecovery: 22, baseStress: 10.0, baseWatchlist: 7 },
  { category: 'Distressed Exchange', baseTrailingDefault: 8.0, basePeakDefault: 18.0, baseAvgRecovery: 38, baseStress: 12.5, baseWatchlist: 5 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-private-credit-v2'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Direct Lending
  const directLending = DIRECT_LENDING_SEGMENTS.map(seg => {
    const spread = Math.round(jitter(seg.baseSpread, 0.08));
    const sofrRate = 5.33;
    const allInYield = Math.round((sofrRate + spread / 100) * 100) / 100;
    const leverage = Math.round(jitter(seg.baseLeverage, 0.06) * 10) / 10;
    const ltv = Math.round(jitter(seg.baseLTV, 0.05) * 10) / 10;
    const dealSize = Math.round(jitter(seg.baseDealSize, 0.12));
    const change = Math.round((rng() - 0.5) * 30);
    const weekChange = Math.round((rng() - 0.48) * 50);

    return {
      segment: seg.segment, spread, allInYield, leverage, ltv, dealSize, change, weekChange,
    };
  });

  // 2. BDC Performance
  const bdcPerformance = BDC_LIST.map(bdc => {
    const nav = Math.round(jitter(bdc.baseNAV, 0.04) * 100) / 100;
    const premiumFactor = 0.88 + rng() * 0.22;
    const price = Math.round(nav * premiumFactor * 100) / 100;
    const premium = Math.round((price / nav - 1) * 100 * 10) / 10;
    const dividendYield = Math.round(jitter(bdc.baseDivYield, 0.06) * 100) / 100;
    const roe = Math.round(jitter(bdc.baseROE, 0.08) * 100) / 100;
    const nonAccruals = Math.round(jitter(bdc.baseNonAccruals, 0.15) * 10) / 10;
    const totalAssets = Math.round(jitter(bdc.baseTotalAssets, 0.05) * 10) / 10;

    return {
      name: bdc.name, nav, price, premium, dividendYield, roe, nonAccruals, totalAssets,
    };
  });

  // 3. Middle Market Deal Activity
  const middleMarket = QUARTERS.map((quarter, idx) => {
    const baseDealCount = 280 + idx * 8;
    const baseVolume = 42 + idx * 1.5;
    const dealCount = Math.round(jitter(baseDealCount, 0.06));
    const totalVolume = Math.round(jitter(baseVolume, 0.08) * 10) / 10;
    const avgSpread = Math.round(jitter(575, 0.05));
    const avgLeverage = Math.round(jitter(5.1 + idx * 0.03, 0.04) * 10) / 10;
    const avgLTV = Math.round(jitter(50, 0.04) * 10) / 10;
    const defaultRate = Math.round(jitter(1.5 + idx * 0.08, 0.1) * 100) / 100;

    return { quarter, dealCount, totalVolume, avgSpread, avgLeverage, avgLTV, defaultRate };
  });

  // 4. Default and Recovery Analysis
  const defaultAndRecovery = DEFAULT_CATEGORIES.map(cat => {
    const trailingDefault = Math.round(jitter(cat.baseTrailingDefault, 0.12) * 100) / 100;
    const peakDefault = Math.round(jitter(cat.basePeakDefault, 0.08) * 100) / 100;
    const avgRecovery = Math.round(jitter(cat.baseAvgRecovery, 0.06) * 10) / 10;
    const currentVintageStress = Math.round(jitter(cat.baseStress, 0.1) * 100) / 100;
    const watchlist = Math.round(jitter(cat.baseWatchlist, 0.15));

    return { category: cat.category, trailingDefault, peakDefault, avgRecovery, currentVintageStress, watchlist };
  });

  // 5. Market Summary
  const totalAUM = Math.round(jitter(1.7, 0.04) * 100) / 100;
  const dryPowder = Math.round(jitter(420, 0.06) * 10) / 10;
  const avgSpread = Math.round(directLending.reduce((a, d) => a + d.spread, 0) / directLending.length);
  const avgLeverage = Math.round(directLending.reduce((a, d) => a + d.leverage, 0) / directLending.length * 10) / 10;
  const trailingDefaultRate = Math.round(defaultAndRecovery.reduce((a, d) => a + d.trailingDefault, 0) / defaultAndRecovery.length * 100) / 100;
  const dealPipeline = Math.round(jitter(85, 0.1) * 10) / 10;
  const sentimentRoll = rng();
  const sentiment = sentimentRoll < 0.35 ? 'Tightening' : sentimentRoll < 0.7 ? 'Stable' : 'Loosening';

  const marketSummary = { totalAUM, dryPowder, avgSpread, avgLeverage, trailingDefaultRate, dealPipeline, sentiment };

  return { directLending, bdcPerformance, middleMarket, defaultAndRecovery, marketSummary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PrivateCredit] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate private credit data' });
  }
});

export default router;
