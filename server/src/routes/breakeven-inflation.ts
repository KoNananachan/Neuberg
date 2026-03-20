import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface USBreakevenItem {
  tenor: string;
  breakeven: number;
  nominalYield: number;
  realYield: number;
  change1D: number;
  change1W: number;
  change1M: number;
  changeYTD: number;
  range52W: { low: number; high: number };
}

interface GlobalBreakevenItem {
  country: string;
  tenor10Y: number;
  change1D: number;
  cpiLatest: number;
  cpiCore: number;
  inflationTarget: number;
}

interface TipsIssue {
  cusip: string;
  maturity: string;
  coupon: number;
  realYield: number;
  price: number;
  change: number;
  duration: number;
  indexRatio: number;
}

interface SwapEntry {
  rate: number;
  change: number;
}

interface InflationSwaps {
  usd1Y: SwapEntry;
  usd2Y: SwapEntry;
  usd5Y: SwapEntry;
  usd10Y: SwapEntry;
  eur5Y: SwapEntry;
  eur10Y: SwapEntry;
  gbp5Y: SwapEntry;
  gbp10Y: SwapEntry;
}

interface ForwardEntry {
  rate: number;
  change: number;
}

interface ForwardInflation {
  usd5y5y: ForwardEntry;
  eur5y5y: ForwardEntry;
  gbp5y5y: ForwardEntry;
}

interface InflationIndicators {
  cpiBroadUS: number;
  cpiBroadEU: number;
  pceUS: number;
  coreInflationUS: number;
  inflationExpectationsMichigan: number;
  fedImpliedTerminal: number;
}

interface CommodityProxy {
  commodity: string;
  price: number;
  change1M: number;
  yoyChange: number;
}

interface Summary {
  us10YBreakeven: number;
  us5y5yForward: number;
  realRateUS10Y: number;
  inflationRiskPremium: number;
  tipsAUMBn: number;
  marketImpliedCPI: number;
}

interface BreakevenInflationResponse {
  usBreakevens: USBreakevenItem[];
  globalBreakevens: GlobalBreakevenItem[];
  tipsMarket: TipsIssue[];
  inflationSwaps: InflationSwaps;
  forwardInflation: ForwardInflation;
  inflationIndicators: InflationIndicators;
  commodityInflationProxy: CommodityProxy[];
  summary: Summary;
  generatedAt: string;
}

// ── Anchor data ──────────────────────────────────────────────────────────────

const US_TENORS = ['2Y', '5Y', '7Y', '10Y', '20Y', '30Y'] as const;

const US_BREAKEVEN_BASES: Record<string, number> = {
  '2Y': 2.18, '5Y': 2.32, '7Y': 2.35, '10Y': 2.38, '20Y': 2.42, '30Y': 2.40,
};
const US_NOMINAL_BASES: Record<string, number> = {
  '2Y': 4.28, '5Y': 4.15, '7Y': 4.20, '10Y': 4.25, '20Y': 4.55, '30Y': 4.48,
};
const US_REAL_BASES: Record<string, number> = {
  '2Y': 2.10, '5Y': 1.83, '7Y': 1.85, '10Y': 1.87, '20Y': 2.13, '30Y': 2.08,
};

interface GlobalBase {
  country: string;
  tenor10Y: number;
  cpiLatest: number;
  cpiCore: number;
  inflationTarget: number;
}

const GLOBAL_BASES: GlobalBase[] = [
  { country: 'US',       tenor10Y: 2.38, cpiLatest: 3.2, cpiCore: 3.5, inflationTarget: 2.0 },
  { country: 'UK',       tenor10Y: 3.62, cpiLatest: 3.4, cpiCore: 4.1, inflationTarget: 2.0 },
  { country: 'Germany',  tenor10Y: 2.08, cpiLatest: 2.4, cpiCore: 2.9, inflationTarget: 2.0 },
  { country: 'France',   tenor10Y: 2.25, cpiLatest: 2.6, cpiCore: 2.7, inflationTarget: 2.0 },
  { country: 'Japan',    tenor10Y: 1.18, cpiLatest: 2.8, cpiCore: 2.3, inflationTarget: 2.0 },
  { country: 'Canada',   tenor10Y: 2.15, cpiLatest: 2.9, cpiCore: 3.2, inflationTarget: 2.0 },
  { country: 'Australia', tenor10Y: 2.48, cpiLatest: 3.4, cpiCore: 3.8, inflationTarget: 2.5 },
];

interface TipsBase {
  cusip: string;
  maturity: string;
  coupon: number;
  realYieldBase: number;
  priceBase: number;
  durationBase: number;
  indexRatioBase: number;
}

const TIPS_BASES: TipsBase[] = [
  { cusip: '912810SB2', maturity: '2026-01-15', coupon: 0.125, realYieldBase: 2.15, priceBase: 97.28, durationBase: 1.8, indexRatioBase: 1.285 },
  { cusip: '912810SC0', maturity: '2027-04-15', coupon: 0.375, realYieldBase: 2.02, priceBase: 96.45, durationBase: 3.1, indexRatioBase: 1.242 },
  { cusip: '912810SD8', maturity: '2029-01-15', coupon: 0.750, realYieldBase: 1.88, priceBase: 95.62, durationBase: 4.8, indexRatioBase: 1.198 },
  { cusip: '912810SE6', maturity: '2030-07-15', coupon: 0.125, realYieldBase: 1.85, priceBase: 89.75, durationBase: 6.2, indexRatioBase: 1.175 },
  { cusip: '912810SF3', maturity: '2032-01-15', coupon: 0.625, realYieldBase: 1.90, priceBase: 91.38, durationBase: 7.5, indexRatioBase: 1.152 },
  { cusip: '912810SG1', maturity: '2034-01-15', coupon: 1.375, realYieldBase: 1.95, priceBase: 94.82, durationBase: 9.1, indexRatioBase: 1.128 },
  { cusip: '912810SH9', maturity: '2044-02-15', coupon: 1.000, realYieldBase: 2.10, priceBase: 82.15, durationBase: 16.4, indexRatioBase: 1.085 },
  { cusip: '912810SJ5', maturity: '2054-02-15', coupon: 2.125, realYieldBase: 2.18, priceBase: 98.45, durationBase: 21.2, indexRatioBase: 1.042 },
];

interface CommodityBase {
  commodity: string;
  priceBase: number;
  change1MBase: number;
  yoyBase: number;
}

const COMMODITY_BASES: CommodityBase[] = [
  { commodity: 'Oil WTI',     priceBase: 78.50,   change1MBase: -2.1,  yoyBase: 5.8 },
  { commodity: 'Natural Gas', priceBase: 2.85,     change1MBase: 4.3,   yoyBase: -12.5 },
  { commodity: 'Wheat',       priceBase: 582.0,    change1MBase: -1.8,  yoyBase: -8.2 },
  { commodity: 'Copper',      priceBase: 4.15,     change1MBase: 3.2,   yoyBase: 12.4 },
  { commodity: 'Gold',        priceBase: 2345.0,   change1MBase: 2.8,   yoyBase: 18.5 },
  { commodity: 'CRB Index',   priceBase: 278.5,    change1MBase: 0.6,   yoyBase: 3.2 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

function jitter(rng: () => number, base: number, bps: number): number {
  return round3(base + (rng() - 0.5) * 2 * (bps / 100));
}

function bpsJitter(rng: () => number, base: number, halfRange: number): number {
  return round2(base + (rng() - 0.5) * 2 * halfRange);
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes
let cacheKey = '';
let cacheData: BreakevenInflationResponse | null = null;
let cacheTime = 0;

// ── Data generation ──────────────────────────────────────────────────────────

function generate(): BreakevenInflationResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-breakeven-inflation'));

  // 1. US Breakevens (6 tenors)
  const usBreakevens: USBreakevenItem[] = US_TENORS.map((tenor) => {
    const breakeven = jitter(rng, US_BREAKEVEN_BASES[tenor], 10);
    const nominalYield = jitter(rng, US_NOMINAL_BASES[tenor], 8);
    const realYield = jitter(rng, US_REAL_BASES[tenor], 8);
    const change1D = round3((rng() - 0.5) * 0.06);
    const change1W = round3((rng() - 0.5) * 0.14);
    const change1M = round3((rng() - 0.5) * 0.24);
    const changeYTD = round3((rng() - 0.5) * 0.50);
    const rangeWidth = 0.35 + rng() * 0.30;
    const low = round2(breakeven - rangeWidth / 2 - rng() * 0.08);
    const high = round2(breakeven + rangeWidth / 2 + rng() * 0.08);
    return {
      tenor, breakeven, nominalYield, realYield,
      change1D, change1W, change1M, changeYTD,
      range52W: { low, high },
    };
  });

  // 2. Global Breakevens (7 countries)
  const globalBreakevens: GlobalBreakevenItem[] = GLOBAL_BASES.map((g) => {
    const tenor10Y = jitter(rng, g.tenor10Y, 12);
    const change1D = round3((rng() - 0.5) * 0.06);
    const cpiLatest = round2(g.cpiLatest + (rng() - 0.5) * 0.4);
    const cpiCore = round2(g.cpiCore + (rng() - 0.5) * 0.3);
    return {
      country: g.country, tenor10Y, change1D,
      cpiLatest, cpiCore, inflationTarget: g.inflationTarget,
    };
  });

  // 3. TIPS Market (8 issues)
  const tipsMarket: TipsIssue[] = TIPS_BASES.map((t) => {
    const realYield = jitter(rng, t.realYieldBase, 6);
    const price = round2(t.priceBase + (rng() - 0.5) * 1.2);
    const change = round3((rng() - 0.5) * 0.50);
    const duration = round2(t.durationBase + (rng() - 0.5) * 0.3);
    const indexRatio = round3(t.indexRatioBase + (rng() - 0.5) * 0.008);
    return {
      cusip: t.cusip, maturity: t.maturity, coupon: t.coupon,
      realYield, price, change, duration, indexRatio,
    };
  });

  // 4. Inflation Swaps
  function makeSwap(baseRate: number): SwapEntry {
    return { rate: jitter(rng, baseRate, 8), change: round3((rng() - 0.5) * 0.06) };
  }
  const inflationSwaps: InflationSwaps = {
    usd1Y:  makeSwap(2.52),
    usd2Y:  makeSwap(2.38),
    usd5Y:  makeSwap(2.42),
    usd10Y: makeSwap(2.48),
    eur5Y:  makeSwap(2.18),
    eur10Y: makeSwap(2.22),
    gbp5Y:  makeSwap(3.45),
    gbp10Y: makeSwap(3.55),
  };

  // 5. Forward Inflation (5y5y)
  function makeForward(baseRate: number): ForwardEntry {
    return { rate: jitter(rng, baseRate, 10), change: round3((rng() - 0.5) * 0.08) };
  }
  const forwardInflation: ForwardInflation = {
    usd5y5y: makeForward(2.45),
    eur5y5y: makeForward(2.28),
    gbp5y5y: makeForward(3.62),
  };

  // 6. Inflation Indicators
  const inflationIndicators: InflationIndicators = {
    cpiBroadUS: bpsJitter(rng, 3.2, 0.25),
    cpiBroadEU: bpsJitter(rng, 2.4, 0.20),
    pceUS: bpsJitter(rng, 2.6, 0.15),
    coreInflationUS: bpsJitter(rng, 3.5, 0.20),
    inflationExpectationsMichigan: bpsJitter(rng, 3.8, 0.40),
    fedImpliedTerminal: bpsJitter(rng, 4.85, 0.15),
  };

  // 7. Commodity Inflation Proxy (6 items)
  const commodityInflationProxy: CommodityProxy[] = COMMODITY_BASES.map((c) => {
    const price = round2(c.priceBase * (1 + (rng() - 0.5) * 0.06));
    const change1M = round2(c.change1MBase + (rng() - 0.5) * 3.0);
    const yoyChange = round2(c.yoyBase + (rng() - 0.5) * 6.0);
    return { commodity: c.commodity, price, change1M, yoyChange };
  });

  // 8. Summary
  const us10YBE = usBreakevens.find(b => b.tenor === '10Y');
  const us10YBreakeven = us10YBE?.breakeven ?? 2.38;
  const realRateUS10Y = us10YBE?.realYield ?? 1.87;
  const us5y5yForward = forwardInflation.usd5y5y.rate;
  const inflationRiskPremium = round2(us10YBreakeven - inflationIndicators.pceUS + (rng() - 0.5) * 0.10);
  const tipsAUMBn = round2(1850 + (rng() - 0.5) * 200);
  const marketImpliedCPI = round2(us10YBreakeven + (rng() - 0.5) * 0.15);

  const summary: Summary = {
    us10YBreakeven,
    us5y5yForward,
    realRateUS10Y,
    inflationRiskPremium,
    tipsAUMBn,
    marketImpliedCPI,
  };

  return {
    usBreakevens,
    globalBreakevens,
    tipsMarket,
    inflationSwaps,
    forwardInflation,
    inflationIndicators,
    commodityInflationProxy,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ────────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    const day = new Date().toISOString().slice(0, 10);
    if (cacheData && cacheKey === day && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generate();
    cacheKey = day;
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[BreakevenInflation] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate breakeven inflation data' });
  }
});

export default router;
