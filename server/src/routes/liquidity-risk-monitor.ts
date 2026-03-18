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

// ── Static definitions ──

const BID_ASK_DEFS = [
  { asset: 'UST 10Y', baseSpread: 0.8, unit: 'bp', baseLiquidity: 92 },
  { asset: 'Bund 10Y', baseSpread: 1.2, unit: 'bp', baseLiquidity: 88 },
  { asset: 'SPY', baseSpread: 0.01, unit: '$', baseLiquidity: 97 },
  { asset: 'QQQ', baseSpread: 0.02, unit: '$', baseLiquidity: 95 },
  { asset: 'CDX IG', baseSpread: 2.5, unit: 'bp', baseLiquidity: 78 },
  { asset: 'EUR/USD', baseSpread: 0.5, unit: 'bp', baseLiquidity: 96 },
  { asset: 'Gold', baseSpread: 0.15, unit: '$', baseLiquidity: 90 },
  { asset: 'WTI', baseSpread: 0.03, unit: '$', baseLiquidity: 85 },
  { asset: 'HY Bond ETF', baseSpread: 4.5, unit: 'bp', baseLiquidity: 65 },
  { asset: 'EM Sovereign', baseSpread: 6.0, unit: 'bp', baseLiquidity: 55 },
];

const DEPTH_DEFS = [
  { market: 'US Treasuries', baseTopOfBook: 320, baseDepth5bp: 1800, baseDepth10bp: 4500, baseResiliency: 88, baseDailyVol: 680, baseAvgTrade: 12.5, baseFragmentation: 0.15 },
  { market: 'US Equities', baseTopOfBook: 450, baseDepth5bp: 2200, baseDepth10bp: 5800, baseResiliency: 92, baseDailyVol: 520, baseAvgTrade: 8.2, baseFragmentation: 0.62 },
  { market: 'EUR Rates', baseTopOfBook: 210, baseDepth5bp: 1200, baseDepth10bp: 3200, baseResiliency: 82, baseDailyVol: 380, baseAvgTrade: 15.0, baseFragmentation: 0.22 },
  { market: 'FX Majors', baseTopOfBook: 280, baseDepth5bp: 1600, baseDepth10bp: 4000, baseResiliency: 90, baseDailyVol: 720, baseAvgTrade: 5.5, baseFragmentation: 0.35 },
  { market: 'US IG Credit', baseTopOfBook: 85, baseDepth5bp: 420, baseDepth10bp: 1100, baseResiliency: 62, baseDailyVol: 38, baseAvgTrade: 3.8, baseFragmentation: 0.28 },
  { market: 'US HY Credit', baseTopOfBook: 35, baseDepth5bp: 180, baseDepth10bp: 480, baseResiliency: 48, baseDailyVol: 14, baseAvgTrade: 1.8, baseFragmentation: 0.18 },
  { market: 'EM Debt', baseTopOfBook: 25, baseDepth5bp: 120, baseDepth10bp: 350, baseResiliency: 42, baseDailyVol: 9.5, baseAvgTrade: 2.2, baseFragmentation: 0.12 },
  { market: 'Commodities', baseTopOfBook: 150, baseDepth5bp: 800, baseDepth10bp: 2100, baseResiliency: 75, baseDailyVol: 95, baseAvgTrade: 4.5, baseFragmentation: 0.42 },
];

const SCOREBOARD_DEFS = [
  { index: 'Bloomberg Liquidity Index', baseValue: 1.25, baseRegime: 'Ample' as const },
  { index: 'Financial Conditions', baseValue: 99.8, baseRegime: 'Ample' as const },
  { index: 'Credit Spread Index', baseValue: 115, baseRegime: 'Adequate' as const },
  { index: 'FX Volatility', baseValue: 8.5, baseRegime: 'Ample' as const },
  { index: 'Equity Vol/Liquidity', baseValue: 0.85, baseRegime: 'Adequate' as const },
  { index: 'Repo Stress', baseValue: 12.5, baseRegime: 'Adequate' as const },
  { index: 'Cross-Currency Basis', baseValue: -18, baseRegime: 'Adequate' as const },
  { index: 'Money Market Stress', baseValue: 5.2, baseRegime: 'Ample' as const },
];

const FLOW_TOXICITY_DEFS = [
  { market: 'S&P 500 Futures', baseVpin: 0.32, baseInformed: 18, baseImbalance: 0.12, baseFlashCrash: 2.5 },
  { market: 'Treasury Futures', baseVpin: 0.28, baseInformed: 15, baseImbalance: 0.08, baseFlashCrash: 1.8 },
  { market: 'EUR/USD', baseVpin: 0.22, baseInformed: 12, baseImbalance: 0.06, baseFlashCrash: 1.2 },
  { market: 'Crude Oil', baseVpin: 0.38, baseInformed: 22, baseImbalance: 0.15, baseFlashCrash: 3.5 },
  { market: 'Gold', baseVpin: 0.25, baseInformed: 14, baseImbalance: 0.09, baseFlashCrash: 1.5 },
  { market: 'Bitcoin', baseVpin: 0.48, baseInformed: 30, baseImbalance: 0.22, baseFlashCrash: 5.8 },
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-liquidity-risk-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // 1. Bid-Ask Spreads
  const bidAskSpreads = BID_ASK_DEFS.map(def => {
    const currentSpread = round4(jitter(def.baseSpread, 0.15));
    const avg30d = round4(jitter(def.baseSpread, 0.05));
    const avg90d = round4(jitter(def.baseSpread, 0.03));
    const ratio = currentSpread / avg90d;
    const percentile = Math.min(99, Math.max(1, Math.round(50 + (ratio - 1) * 200 + (rng() - 0.5) * 20)));
    const zscore = round2((currentSpread - avg90d) / (avg90d * 0.1 + 0.01));
    const liquidityScore = Math.min(100, Math.max(0, Math.round(jitter(def.baseLiquidity, 0.08))));
    let trend: string;
    if (currentSpread < avg30d * 0.97) trend = 'Improving';
    else if (currentSpread > avg30d * 1.03) trend = 'Deteriorating';
    else trend = 'Stable';

    return {
      asset: def.asset,
      currentSpread,
      avg30d,
      avg90d,
      percentile,
      zscore,
      liquidityScore,
      trend,
    };
  });

  // 2. Market Depth
  const marketDepth = DEPTH_DEFS.map(def => {
    const topOfBook = round2(jitter(def.baseTopOfBook, 0.12));
    const depth5bp = round2(jitter(def.baseDepth5bp, 0.10));
    const depth10bp = round2(jitter(def.baseDepth10bp, 0.10));
    const resiliency = Math.min(100, Math.max(0, Math.round(jitter(def.baseResiliency, 0.08))));
    const dailyVolume = round2(jitter(def.baseDailyVol, 0.15));
    const avgTradeSize = round2(jitter(def.baseAvgTrade, 0.12));
    const fragmentation = round2(Math.min(1, Math.max(0, jitter(def.baseFragmentation, 0.10))));

    return {
      market: def.market,
      topOfBook,
      depth5bp,
      depth10bp,
      resiliency,
      dailyVolume,
      avgTradeSize,
      fragmentation,
    };
  });

  // 3. Liquidity Scoreboard
  const REGIME_OPTIONS = ['Ample', 'Adequate', 'Tight', 'Stressed'] as const;
  const liquidityScoreboard = SCOREBOARD_DEFS.map(def => {
    const currentValue = round2(jitter(def.baseValue, 0.08));
    const priorWeek = round2(jitter(def.baseValue, 0.04));
    const change = round2(currentValue - priorWeek);
    const percentile = Math.min(99, Math.max(1, Math.round(50 + (rng() - 0.5) * 40)));

    // Determine signal based on jitter
    const stressFactor = rng();
    let signal: typeof REGIME_OPTIONS[number];
    if (stressFactor < 0.05) signal = 'Stressed';
    else if (stressFactor < 0.20) signal = 'Tight';
    else if (stressFactor < 0.55) signal = 'Adequate';
    else signal = 'Ample';

    let regime: string;
    if (percentile >= 70) regime = 'Expansionary';
    else if (percentile >= 40) regime = 'Neutral';
    else regime = 'Contractionary';

    return {
      index: def.index,
      currentValue,
      priorWeek,
      change,
      signal,
      percentile,
      regime,
    };
  });

  // 4. Flow Toxicity
  const flowToxicity = FLOW_TOXICITY_DEFS.map(def => {
    const vpin = round4(Math.min(1, Math.max(0, jitter(def.baseVpin, 0.20))));
    let toxicityLevel: string;
    if (vpin >= 0.7) toxicityLevel = 'Extreme';
    else if (vpin >= 0.5) toxicityLevel = 'High';
    else if (vpin >= 0.35) toxicityLevel = 'Medium';
    else toxicityLevel = 'Low';

    const informedTrading = round2(Math.min(60, Math.max(5, jitter(def.baseInformed, 0.18))));
    const orderImbalance = round4(Math.min(0.5, Math.max(-0.5, (rng() - 0.5) * 2 * jitter(def.baseImbalance, 0.25))));
    const flashCrashProb = round2(Math.min(25, Math.max(0.1, jitter(def.baseFlashCrash, 0.25))));

    let alertLevel: string;
    if (vpin >= 0.7 || flashCrashProb >= 10) alertLevel = 'Critical';
    else if (vpin >= 0.5 || flashCrashProb >= 5) alertLevel = 'Warning';
    else if (vpin >= 0.35 || flashCrashProb >= 3) alertLevel = 'Elevated';
    else alertLevel = 'Normal';

    return {
      market: def.market,
      vpin,
      toxicityLevel,
      informedTrading,
      orderImbalance,
      flashCrashProb,
      alertLevel,
    };
  });

  // 5. Market Summary
  const avgLiquidityScore = round2(bidAskSpreads.reduce((s, b) => s + b.liquidityScore, 0) / bidAskSpreads.length);
  const avgBidAskZscore = round2(bidAskSpreads.reduce((s, b) => s + b.zscore, 0) / bidAskSpreads.length);
  const stressedMarkets = bidAskSpreads.filter(b => b.liquidityScore < 50 || b.zscore > 2).length;
  const avgVPIN = round4(flowToxicity.reduce((s, f) => s + f.vpin, 0) / flowToxicity.length);
  const compositeLiquidityIndex = round2(avgLiquidityScore * 0.4 + (100 - stressedMarkets * 10) * 0.3 + (1 - avgVPIN) * 100 * 0.3);

  let liquidityRegime: string;
  if (compositeLiquidityIndex >= 75) liquidityRegime = 'Normal';
  else if (compositeLiquidityIndex >= 50) liquidityRegime = 'Caution';
  else liquidityRegime = 'Stress';

  const worstAsset = bidAskSpreads.reduce((worst, b) => b.liquidityScore < worst.liquidityScore ? b : worst, bidAskSpreads[0]);

  const marketSummary = {
    compositeLiquidityIndex,
    avgBidAskZscore,
    stressedMarkets,
    avgVPIN,
    liquidityRegime,
    worstLiquidity: worstAsset.asset,
  };

  return {
    bidAskSpreads,
    marketDepth,
    liquidityScoreboard,
    flowToxicity,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LiquidityRiskMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate liquidity risk monitor data' });
  }
});

export default router;
