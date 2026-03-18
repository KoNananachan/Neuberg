import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Static Definitions --

const TOTAL_AUM = 2_850_000_000; // $2.85B

const POSITION_DEFS = [
  { ticker: 'AAPL', assetClass: 'US Large Cap Equity', baseMarketValue: 185_000_000, baseADV: 12_500_000_000, baseBidAskBps: 1.2, baseLiqScore: 9.5 },
  { ticker: 'MSFT', assetClass: 'US Large Cap Equity', baseMarketValue: 172_000_000, baseADV: 10_800_000_000, baseBidAskBps: 1.1, baseLiqScore: 9.4 },
  { ticker: 'SPY', assetClass: 'ETF', baseMarketValue: 210_000_000, baseADV: 28_000_000_000, baseBidAskBps: 0.3, baseLiqScore: 9.9 },
  { ticker: 'UST 10Y', assetClass: 'Government Bond', baseMarketValue: 320_000_000, baseADV: 620_000_000_000, baseBidAskBps: 0.5, baseLiqScore: 9.8 },
  { ticker: 'LQD', assetClass: 'IG Corporate Bond ETF', baseMarketValue: 145_000_000, baseADV: 1_200_000_000, baseBidAskBps: 2.8, baseLiqScore: 8.2 },
  { ticker: 'NVDA', assetClass: 'US Large Cap Equity', baseMarketValue: 156_000_000, baseADV: 18_500_000_000, baseBidAskBps: 1.5, baseLiqScore: 9.3 },
  { ticker: 'HYG', assetClass: 'HY Corporate Bond ETF', baseMarketValue: 98_000_000, baseADV: 1_800_000_000, baseBidAskBps: 5.2, baseLiqScore: 7.1 },
  { ticker: 'GLD', assetClass: 'Commodity ETF', baseMarketValue: 125_000_000, baseADV: 2_200_000_000, baseBidAskBps: 1.8, baseLiqScore: 8.8 },
  { ticker: 'JPM', assetClass: 'US Large Cap Equity', baseMarketValue: 88_000_000, baseADV: 3_500_000_000, baseBidAskBps: 2.0, baseLiqScore: 9.0 },
  { ticker: 'AMZN', assetClass: 'US Large Cap Equity', baseMarketValue: 134_000_000, baseADV: 8_200_000_000, baseBidAskBps: 1.3, baseLiqScore: 9.4 },
  { ticker: 'EEM', assetClass: 'EM Equity ETF', baseMarketValue: 78_000_000, baseADV: 1_500_000_000, baseBidAskBps: 3.5, baseLiqScore: 7.8 },
  { ticker: 'TLT', assetClass: 'Treasury Bond ETF', baseMarketValue: 195_000_000, baseADV: 2_800_000_000, baseBidAskBps: 1.0, baseLiqScore: 9.1 },
  { ticker: 'XOM', assetClass: 'US Large Cap Equity', baseMarketValue: 72_000_000, baseADV: 2_900_000_000, baseBidAskBps: 2.2, baseLiqScore: 8.9 },
  { ticker: 'BKLN', assetClass: 'Leveraged Loan ETF', baseMarketValue: 65_000_000, baseADV: 320_000_000, baseBidAskBps: 8.5, baseLiqScore: 5.8 },
  { ticker: 'PE Fund A', assetClass: 'Private Equity', baseMarketValue: 180_000_000, baseADV: 0, baseBidAskBps: 0, baseLiqScore: 1.5 },
  { ticker: 'RE Fund B', assetClass: 'Private Real Estate', baseMarketValue: 155_000_000, baseADV: 0, baseBidAskBps: 0, baseLiqScore: 1.2 },
  { ticker: 'VTIP', assetClass: 'TIPS ETF', baseMarketValue: 110_000_000, baseADV: 450_000_000, baseBidAskBps: 2.5, baseLiqScore: 8.0 },
  { ticker: 'IWM', assetClass: 'US Small Cap ETF', baseMarketValue: 95_000_000, baseADV: 4_500_000_000, baseBidAskBps: 1.6, baseLiqScore: 9.0 },
  { ticker: 'Infra Fund C', assetClass: 'Private Infrastructure', baseMarketValue: 92_000_000, baseADV: 0, baseBidAskBps: 0, baseLiqScore: 1.8 },
  { ticker: 'EMB', assetClass: 'EM Bond ETF', baseMarketValue: 75_000_000, baseADV: 680_000_000, baseBidAskBps: 6.8, baseLiqScore: 6.5 },
];

const SCENARIO_DEFS = [
  { name: 'Normal Market', baseImpactMultiplier: 1.0, baseSpreadWidening: 1.0, baseVolumeReduction: 0, baseTimeLiqMultiplier: 1.0 },
  { name: 'Moderate Stress', baseImpactMultiplier: 2.5, baseSpreadWidening: 3.0, baseVolumeReduction: 25, baseTimeLiqMultiplier: 2.0 },
  { name: 'Severe Stress', baseImpactMultiplier: 5.0, baseSpreadWidening: 8.0, baseVolumeReduction: 50, baseTimeLiqMultiplier: 4.5 },
  { name: '2008 GFC Replay', baseImpactMultiplier: 8.0, baseSpreadWidening: 15.0, baseVolumeReduction: 70, baseTimeLiqMultiplier: 8.0 },
  { name: 'Flash Crash', baseImpactMultiplier: 12.0, baseSpreadWidening: 25.0, baseVolumeReduction: 85, baseTimeLiqMultiplier: 0.5 },
];

const LIQUIDITY_BUCKET_DEFS = [
  { label: 'T+0', basePct: 8.5 },
  { label: 'T+1', basePct: 18.2 },
  { label: 'T+3', basePct: 22.5 },
  { label: 'T+7', basePct: 15.8 },
  { label: 'T+14', basePct: 10.2 },
  { label: 'T+30', basePct: 9.8 },
  { label: 'T+90', basePct: 5.5 },
  { label: '>T+90', basePct: 9.5 },
];

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const rng = seededRandom('liquidity-stress-test');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round0 = (n: number) => Math.round(n);

  // -- 1. Portfolio Liquidity Summary --

  const liquidAssetsPct = round1(jitter(42.5, 0.06));
  const semiLiquidPct = round1(jitter(42.3, 0.06));
  const illiquidPct = round1(100 - liquidAssetsPct - semiLiquidPct);
  const daysToLiquidate100 = round0(jitter(95, 0.10));
  const daysToLiquidate80 = round0(jitter(22, 0.10));
  const liquidityCoverageRatio = round2(jitter(1.85, 0.08));

  const portfolioSummary = {
    totalAUM: TOTAL_AUM,
    liquidAssetsPct,
    semiLiquidPct,
    illiquidPct,
    daysToLiquidate100,
    daysToLiquidate80,
    liquidityCoverageRatio,
  };

  // -- 2. Position-Level Liquidity --

  const positions = POSITION_DEFS.map(pos => {
    const marketValue = round0(jitter(pos.baseMarketValue, 0.08));
    const avgDailyVolume = pos.baseADV > 0 ? round0(jitter(pos.baseADV, 0.12)) : 0;

    // Days to liquidate at different participation rates
    let daysAt10Pct = 0;
    let daysAt25Pct = 0;
    let daysAt50Pct = 0;
    if (avgDailyVolume > 0) {
      daysAt10Pct = round1(marketValue / (avgDailyVolume * 0.10));
      daysAt25Pct = round1(marketValue / (avgDailyVolume * 0.25));
      daysAt50Pct = round1(marketValue / (avgDailyVolume * 0.50));
    } else {
      // Illiquid/private assets
      daysAt10Pct = round0(jitter(180, 0.15));
      daysAt25Pct = round0(jitter(120, 0.15));
      daysAt50Pct = round0(jitter(90, 0.15));
    }

    const bidAskSpreadBps = pos.baseBidAskBps > 0 ? round2(jitter(pos.baseBidAskBps, 0.15)) : 0;
    const marketImpactBps = pos.baseBidAskBps > 0
      ? round2(jitter(pos.baseBidAskBps * 1.8, 0.12))
      : round2(jitter(250, 0.15));

    const liquidityScore = round1(Math.min(10, Math.max(1, jitter(pos.baseLiqScore, 0.08))));

    return {
      ticker: pos.ticker,
      assetClass: pos.assetClass,
      marketValue,
      avgDailyVolume,
      daysToLiquidate: {
        at10PctADV: daysAt10Pct,
        at25PctADV: daysAt25Pct,
        at50PctADV: daysAt50Pct,
      },
      bidAskSpreadBps,
      marketImpactEstimateBps: marketImpactBps,
      liquidityScore,
    };
  });

  // -- 3. Stress Scenarios --

  const baseLiquidationCostBps = 35;
  const stressScenarios = SCENARIO_DEFS.map(sc => {
    const marketImpactMultiplier = round2(jitter(sc.baseImpactMultiplier, 0.08));
    const spreadWideningFactor = round2(jitter(sc.baseSpreadWidening, 0.08));
    const volumeReductionPct = round1(Math.min(95, Math.max(0, jitter(sc.baseVolumeReduction, 0.10))));
    const timeLiquidateMultiplier = round2(jitter(sc.baseTimeLiqMultiplier, 0.08));
    const totalLiqCostBps = round1(baseLiquidationCostBps * marketImpactMultiplier);
    const totalLiqCostM = round2((totalLiqCostBps / 10000) * TOTAL_AUM / 1_000_000);

    return {
      scenario: sc.name,
      marketImpactMultiplier,
      spreadWideningFactor,
      volumeReductionPct,
      timeLiquidateMultiplier,
      totalPortfolioLiquidationCost: {
        millionUSD: totalLiqCostM,
        bps: totalLiqCostBps,
      },
    };
  });

  // -- 4. Redemption Analysis --

  const normalPcts = {
    day1: round1(jitter(12.5, 0.08)),
    day3: round1(jitter(32.0, 0.08)),
    week1: round1(jitter(55.0, 0.08)),
    week2: round1(jitter(72.0, 0.08)),
    month1: round1(jitter(85.0, 0.08)),
  };

  const stressedPcts = {
    day1: round1(jitter(5.2, 0.10)),
    day3: round1(jitter(14.8, 0.10)),
    week1: round1(jitter(28.5, 0.10)),
    week2: round1(jitter(45.0, 0.10)),
    month1: round1(jitter(62.0, 0.10)),
  };

  const redemptionAnalysis = {
    normal: {
      '1_day': normalPcts.day1,
      '3_days': normalPcts.day3,
      '1_week': normalPcts.week1,
      '2_weeks': normalPcts.week2,
      '1_month': normalPcts.month1,
    },
    stressed: {
      '1_day': stressedPcts.day1,
      '3_days': stressedPcts.day3,
      '1_week': stressedPcts.week1,
      '2_weeks': stressedPcts.week2,
      '1_month': stressedPcts.month1,
    },
  };

  // -- 5. Liquidity Bucket Breakdown --

  const rawBuckets = LIQUIDITY_BUCKET_DEFS.map(b => ({
    label: b.label,
    pct: jitter(b.basePct, 0.08),
  }));

  // Normalize to sum to 100
  const totalRaw = rawBuckets.reduce((s, b) => s + b.pct, 0);
  const liquidityBuckets = rawBuckets.map(b => {
    const pctOfTotal = round1((b.pct / totalRaw) * 100);
    const marketValue = round0((pctOfTotal / 100) * TOTAL_AUM);
    return {
      bucket: b.label,
      marketValue,
      pctOfTotal,
    };
  });

  // Fix rounding so pcts sum to exactly 100
  const bucketPctSum = liquidityBuckets.reduce((s, b) => s + b.pctOfTotal, 0);
  if (bucketPctSum !== 100) {
    liquidityBuckets[0].pctOfTotal = round1(liquidityBuckets[0].pctOfTotal + (100 - bucketPctSum));
    liquidityBuckets[0].marketValue = round0((liquidityBuckets[0].pctOfTotal / 100) * TOTAL_AUM);
  }

  // -- 6. Historical Liquidity Score --

  const today = new Date();
  let prevScore = jitter(7.2, 0.05);
  const historicalLiquidityScore: { date: string; score: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const drift = (rng() - 0.48) * 0.3;
    prevScore = Math.min(10, Math.max(1, prevScore + drift));
    historicalLiquidityScore.push({
      date: dateStr,
      score: round2(prevScore),
    });
  }

  return {
    portfolioSummary,
    positions,
    stressScenarios,
    redemptionAnalysis,
    liquidityBuckets,
    historicalLiquidityScore,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LiquidityStressTest] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate liquidity stress test data' });
  }
});

export default router;
