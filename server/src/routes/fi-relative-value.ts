import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Types ──

interface ButterflyEntry {
  name: string;
  bodyTenor: string;
  wingTenors: [string, string];
  currentSpread: number;
  fairValue: number;
  richCheap: number;
  zScore: number;
  carry3m: number;
  signal: 'rich' | 'fair' | 'cheap';
}

interface SwapSpreadRow {
  tenor: string;
  treasuryYield: number;
  swapRate: number;
  swapSpread: number;
  change1d: number;
  change1w: number;
  percentile52w: number;
  signal: string;
}

interface CrossMarketRVRow {
  pair: string;
  spread: number;
  change1d: number;
  change1w: number;
  zScore: number;
  historicalAvg: number;
  signal: 'wide' | 'fair' | 'tight';
}

interface OTRvsOFRRow {
  tenor: string;
  onTheRunYield: number;
  offTheRunYield: number;
  richness: number;
  liquidityPremium: number;
}

interface TIPSBreakevenRow {
  tenor: string;
  nominalYield: number;
  realYield: number;
  breakeven: number;
  change1d: number;
  fairValue: number;
  richCheap: number;
}

interface TradeRecommendation {
  trade: string;
  entry: number;
  target: number;
  stop: number;
  carry: number;
  conviction: 'High' | 'Medium' | 'Low';
}

interface FIRelativeValueResponse {
  butterflyAnalysis: ButterflyEntry[];
  swapSpreads: SwapSpreadRow[];
  crossMarketRV: CrossMarketRVRow[];
  otrVsOfr: OTRvsOFRRow[];
  tipsBreakevens: TIPSBreakevenRow[];
  tradeRecommendations: TradeRecommendation[];
  generatedAt: string;
}

// ── Static configs ──

const BUTTERFLY_CONFIGS = [
  { name: '2s5s10s', bodyTenor: '5Y', wingTenors: ['2Y', '10Y'] as [string, string], baseSpread: -8, baseCarry: 1.2 },
  { name: '5s10s30s', bodyTenor: '10Y', wingTenors: ['5Y', '30Y'] as [string, string], baseSpread: 5, baseCarry: 0.8 },
  { name: '2s10s30s', bodyTenor: '10Y', wingTenors: ['2Y', '30Y'] as [string, string], baseSpread: 12, baseCarry: 1.5 },
  { name: '3s5s7s', bodyTenor: '5Y', wingTenors: ['3Y', '7Y'] as [string, string], baseSpread: -3, baseCarry: 0.6 },
  { name: '2s3s5s', bodyTenor: '3Y', wingTenors: ['2Y', '5Y'] as [string, string], baseSpread: -5, baseCarry: 0.4 },
  { name: '10s20s30s', bodyTenor: '20Y', wingTenors: ['10Y', '30Y'] as [string, string], baseSpread: 7, baseCarry: 2.1 },
] as const;

const SWAP_SPREAD_TENORS = ['2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'] as const;

const SWAP_SPREAD_BASE: Record<string, { tsy: number; offset: number }> = {
  '2Y': { tsy: 4.52, offset: 8 },
  '3Y': { tsy: 4.38, offset: 5 },
  '5Y': { tsy: 4.22, offset: 2 },
  '7Y': { tsy: 4.25, offset: -1 },
  '10Y': { tsy: 4.28, offset: -4 },
  '15Y': { tsy: 4.38, offset: -10 },
  '20Y': { tsy: 4.42, offset: -15 },
  '30Y': { tsy: 4.48, offset: -22 },
};

const CROSS_MARKET_CONFIGS = [
  { pair: 'UST vs Bund 10Y', baseSpread: 168, avgSpread: 155 },
  { pair: 'UST vs Gilt 10Y', baseSpread: 28, avgSpread: 35 },
  { pair: 'UST vs JGB 10Y', baseSpread: 335, avgSpread: 320 },
  { pair: 'Bund vs Gilt 10Y', baseSpread: -140, avgSpread: -125 },
  { pair: 'UST vs OAT 10Y', baseSpread: 118, avgSpread: 110 },
  { pair: 'UST vs ACGB 10Y', baseSpread: 15, avgSpread: 22 },
  { pair: 'Bund vs BTP 10Y', baseSpread: -135, avgSpread: -120 },
  { pair: 'UST vs CAD 10Y', baseSpread: 95, avgSpread: 88 },
] as const;

const OTR_TENORS = ['2Y', '3Y', '5Y', '7Y', '10Y', '30Y'] as const;

const OTR_BASE_YIELDS: Record<string, number> = {
  '2Y': 4.52, '3Y': 4.38, '5Y': 4.22, '7Y': 4.25, '10Y': 4.28, '30Y': 4.48,
};

const TIPS_TENORS = ['2Y', '5Y', '10Y', '20Y', '30Y'] as const;

const TIPS_BASE: Record<string, { nominal: number; real: number }> = {
  '2Y': { nominal: 4.52, real: 2.18 },
  '5Y': { nominal: 4.22, real: 1.92 },
  '10Y': { nominal: 4.28, real: 2.02 },
  '20Y': { nominal: 4.42, real: 2.08 },
  '30Y': { nominal: 4.48, real: 2.15 },
};

const TRADE_CONFIGS = [
  { trade: 'Pay 2s5s10s butterfly — belly cheap vs wings, z-score < -1.5', baseEntry: -12, baseDelta: 8, stopDelta: -5, baseCarry: 1.8 },
  { trade: 'Receive 10Y swap spread — spread at 95th pctile wide', baseEntry: -6, baseDelta: 5, stopDelta: -4, baseCarry: 0.5 },
  { trade: 'Long UST vs Bund 10Y — spread wide to 6-mo avg', baseEntry: 172, baseDelta: -15, stopDelta: 10, baseCarry: 0.3 },
  { trade: 'Sell 5Y TIPS breakeven — above fair value by 12bps', baseEntry: 2.45, baseDelta: -0.15, stopDelta: 0.08, baseCarry: -0.2 },
] as const;

const CONVICTION_LEVELS: readonly ('High' | 'Medium' | 'Low')[] = ['High', 'Medium', 'Low'];

// ── Cache ──

const CACHE_TTL = 60 * 60_000;
let cache: { data: FIRelativeValueResponse | null; ts: number } = { data: null, ts: 0 };

// ── Helpers ──

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ── Data generation ──

function generate(): FIRelativeValueResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fi-relative-value'));

  // ── 1. Butterfly Analysis ──

  const butterflyAnalysis: ButterflyEntry[] = BUTTERFLY_CONFIGS.map(cfg => {
    const noise = (rng() - 0.5) * 14;
    const currentSpread = roundTo(cfg.baseSpread + noise, 1);
    const fairValue = roundTo(cfg.baseSpread + (rng() - 0.5) * 6, 1);
    const richCheap = roundTo(currentSpread - fairValue, 1);

    const stdDev = 3 + rng() * 4;
    const zScore = roundTo(richCheap / stdDev, 2);

    const carry3m = roundTo(cfg.baseCarry + (rng() - 0.5) * 1.5, 2);

    let signal: 'rich' | 'fair' | 'cheap';
    if (zScore > 0.75) signal = 'rich';
    else if (zScore < -0.75) signal = 'cheap';
    else signal = 'fair';

    return {
      name: cfg.name,
      bodyTenor: cfg.bodyTenor,
      wingTenors: cfg.wingTenors as [string, string],
      currentSpread,
      fairValue,
      richCheap,
      zScore,
      carry3m,
      signal,
    };
  });

  // ── 2. Swap Spreads ──

  const swapSpreads: SwapSpreadRow[] = SWAP_SPREAD_TENORS.map(tenor => {
    const base = SWAP_SPREAD_BASE[tenor];
    const tsyNoise = (rng() - 0.5) * 0.1;
    const treasuryYield = roundTo(base.tsy + tsyNoise, 3);

    const spreadNoise = (rng() - 0.5) * 6;
    const swapSpread = roundTo(base.offset + spreadNoise, 1);
    const swapRate = roundTo(treasuryYield + swapSpread / 100, 3);

    const change1d = roundTo((rng() - 0.5) * 3, 1);
    const change1w = roundTo((rng() - 0.5) * 8, 1);

    const rawPctile = 50 + (swapSpread - base.offset) * 6 + (rng() - 0.5) * 18;
    const percentile52w = Math.max(1, Math.min(99, Math.round(rawPctile)));

    let signal: string;
    if (percentile52w > 80) signal = 'Wide';
    else if (percentile52w < 20) signal = 'Tight';
    else if (change1d > 1) signal = 'Widening';
    else if (change1d < -1) signal = 'Tightening';
    else signal = 'Neutral';

    return { tenor, treasuryYield, swapRate, swapSpread, change1d, change1w, percentile52w, signal };
  });

  // ── 3. Cross-Market RV ──

  const crossMarketRV: CrossMarketRVRow[] = CROSS_MARKET_CONFIGS.map(cfg => {
    const noise = (rng() - 0.5) * 20;
    const spread = roundTo(cfg.baseSpread + noise, 1);
    const change1d = roundTo((rng() - 0.5) * 5, 1);
    const change1w = roundTo((rng() - 0.5) * 12, 1);

    const historicalAvg = roundTo(cfg.avgSpread + (rng() - 0.5) * 8, 1);
    const stdDev = 8 + rng() * 10;
    const zScore = roundTo((spread - historicalAvg) / stdDev, 2);

    let signal: 'wide' | 'fair' | 'tight';
    if (zScore > 0.8) signal = 'wide';
    else if (zScore < -0.8) signal = 'tight';
    else signal = 'fair';

    return { pair: cfg.pair, spread, change1d, change1w, zScore, historicalAvg, signal };
  });

  // ── 4. On-the-Run vs Off-the-Run ──

  const otrVsOfr: OTRvsOFRRow[] = OTR_TENORS.map(tenor => {
    const baseYld = OTR_BASE_YIELDS[tenor];
    const otrNoise = (rng() - 0.5) * 0.08;
    const onTheRunYield = roundTo(baseYld + otrNoise, 3);

    // Off-the-run yields slightly higher (less liquid)
    const ofrPremium = 0.015 + rng() * 0.04;
    const offTheRunYield = roundTo(onTheRunYield + ofrPremium, 3);

    // Richness = how much OTR is rich vs OFR, in bps
    const richness = roundTo((offTheRunYield - onTheRunYield) * 100, 1);

    // Liquidity premium: higher for longer tenors
    const tenorIdx = OTR_TENORS.indexOf(tenor);
    const baseLiqPremium = 1.5 + tenorIdx * 0.4;
    const liquidityPremium = roundTo(baseLiqPremium + (rng() - 0.5) * 1.5, 1);

    return { tenor, onTheRunYield, offTheRunYield, richness, liquidityPremium };
  });

  // ── 5. TIPS Breakevens ──

  const tipsBreakevens: TIPSBreakevenRow[] = TIPS_TENORS.map(tenor => {
    const base = TIPS_BASE[tenor];
    const nomNoise = (rng() - 0.5) * 0.1;
    const realNoise = (rng() - 0.5) * 0.08;

    const nominalYield = roundTo(base.nominal + nomNoise, 3);
    const realYield = roundTo(base.real + realNoise, 3);
    const breakeven = roundTo(nominalYield - realYield, 3);

    const change1d = roundTo((rng() - 0.5) * 0.04, 3);

    // Fair value: long-term inflation expectation + term premium
    const fairValue = roundTo(breakeven + (rng() - 0.5) * 0.12, 3);
    const richCheap = roundTo((breakeven - fairValue) * 100, 1);

    return { tenor, nominalYield, realYield, breakeven, change1d, fairValue, richCheap };
  });

  // ── 6. Trade Recommendations ──

  const tradeRecommendations: TradeRecommendation[] = TRADE_CONFIGS.map(cfg => {
    const entryNoise = (rng() - 0.5) * Math.abs(cfg.baseEntry) * 0.08;
    const entry = roundTo(cfg.baseEntry + entryNoise, 2);
    const target = roundTo(entry + cfg.baseDelta + (rng() - 0.5) * Math.abs(cfg.baseDelta) * 0.3, 2);
    const stop = roundTo(entry + cfg.stopDelta + (rng() - 0.5) * Math.abs(cfg.stopDelta) * 0.3, 2);
    const carry = roundTo(cfg.baseCarry + (rng() - 0.5) * 0.6, 2);
    const conviction = pick(rng, CONVICTION_LEVELS);

    return { trade: cfg.trade, entry, target, stop, carry, conviction };
  });

  return {
    butterflyAnalysis,
    swapSpreads,
    crossMarketRV,
    otrVsOfr,
    tipsBreakevens,
    tradeRecommendations,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FIRelativeValue] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FI relative value data' });
  }
});

export default router;
