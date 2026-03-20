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

interface GlobalMarket {
  totalOutstandingTrn: number;
  ytdIssuanceBn: number;
  avgRealYieldPct: number;
  avgBreakevenPct: number;
  avgDuration: number;
  avgIndexRatio: number;
}

interface CountryLinker {
  country: string;
  outstandingBn: number;
  realYieldPct: number;
  breakevenPct: number;
  change1D: number;
  change1W: number;
  duration: number;
  inflationIndex: number;
}

interface TipsDetail {
  cusip: string;
  maturity: string;
  couponPct: number;
  realYieldPct: number;
  breakevenPct: number;
  price: number;
  indexRatio: number;
  duration: number;
  change1D: number;
}

interface RealYieldCurvePoint {
  tenor: string;
  realYieldPct: number;
  nominalYieldPct: number;
  breakevenPct: number;
  change1D: number;
  change1W: number;
  range52W: { low: number; high: number };
}

interface InflationExpectations {
  us5Y5YPct: number;
  eur5Y5YPct: number;
  uk5Y5YPct: number;
  usMichiganPct: number;
  usNYFedPct: number;
  marketImplied1YPct: number;
  marketImplied2YPct: number;
  marketImplied5YPct: number;
}

interface EtfTracker {
  ticker: string;
  name: string;
  aumBn: number;
  yieldPct: number;
  return1MPct: number;
  returnYTDPct: number;
  flow1M: number;
}

interface SeasonalAdjustment {
  currentCPIIndexUS: number;
  nextResetDate: string;
  projectedAccrualPct: number;
  seasonalPattern: 'positive' | 'negative' | 'neutral';
}

interface Summary {
  us10YRealYieldPct: number;
  us10YBreakevenPct: number;
  realYieldTrend: string;
  inflationOutlook: string;
  tipsVsNominalSpread: number;
  globalLinkerReturn1MPct: number;
}

interface InflationLinkedBondResponse {
  globalMarket: GlobalMarket;
  byCountry: CountryLinker[];
  tipsDetail: TipsDetail[];
  realYieldCurve: RealYieldCurvePoint[];
  inflationExpectations: InflationExpectations;
  etfTrackers: EtfTracker[];
  seasonalAdjustment: SeasonalAdjustment;
  summary: Summary;
  generatedAt: string;
}

// ── Anchor data ──────────────────────────────────────────────────────────────

interface CountryBase {
  country: string;
  outstandingBn: number;
  realYieldBase: number;
  breakevenBase: number;
  durationBase: number;
  inflationIndexBase: number;
}

const COUNTRY_BASES: CountryBase[] = [
  { country: 'US TIPS',            outstandingBn: 2020, realYieldBase: 1.92, breakevenBase: 2.38, durationBase: 7.2,  inflationIndexBase: 312.5 },
  { country: 'UK Gilts IL',       outstandingBn: 680,  realYieldBase: 0.85, breakevenBase: 3.62, durationBase: 15.8, inflationIndexBase: 388.2 },
  { country: 'France OATi',       outstandingBn: 290,  realYieldBase: 0.42, breakevenBase: 2.28, durationBase: 8.5,  inflationIndexBase: 118.4 },
  { country: 'Germany Bundi',     outstandingBn: 88,   realYieldBase: 0.12, breakevenBase: 2.10, durationBase: 9.1,  inflationIndexBase: 117.8 },
  { country: 'Italy BTPi',        outstandingBn: 195,  realYieldBase: 1.15, breakevenBase: 2.48, durationBase: 7.8,  inflationIndexBase: 119.2 },
  { country: 'Japan JGBi',        outstandingBn: 42,   realYieldBase: -0.45, breakevenBase: 1.32, durationBase: 6.2, inflationIndexBase: 107.5 },
  { country: 'Canada RRB',        outstandingBn: 68,   realYieldBase: 1.58, breakevenBase: 2.18, durationBase: 14.5, inflationIndexBase: 158.3 },
  { country: 'Australia ILB',     outstandingBn: 38,   realYieldBase: 1.22, breakevenBase: 2.62, durationBase: 8.8,  inflationIndexBase: 132.6 },
  { country: 'Brazil NTN-B',      outstandingBn: 520,  realYieldBase: 6.15, breakevenBase: 4.85, durationBase: 5.4,  inflationIndexBase: 6842.0 },
  { country: 'South Africa ILB',  outstandingBn: 45,   realYieldBase: 3.85, breakevenBase: 5.20, durationBase: 7.0,  inflationIndexBase: 198.5 },
];

interface TipsBase {
  cusip: string;
  maturity: string;
  coupon: number;
  realYieldBase: number;
  breakevenBase: number;
  priceBase: number;
  indexRatioBase: number;
  durationBase: number;
}

const TIPS_BASES: TipsBase[] = [
  { cusip: '912810SB2', maturity: '2026-01-15', coupon: 0.125, realYieldBase: 2.18, breakevenBase: 2.22, priceBase: 97.85,  indexRatioBase: 1.285, durationBase: 1.8 },
  { cusip: '912810SC0', maturity: '2028-04-15', coupon: 0.375, realYieldBase: 2.05, breakevenBase: 2.30, priceBase: 95.42,  indexRatioBase: 1.242, durationBase: 3.2 },
  { cusip: '912810SD8', maturity: '2029-07-15', coupon: 0.625, realYieldBase: 1.95, breakevenBase: 2.35, priceBase: 94.18,  indexRatioBase: 1.198, durationBase: 4.6 },
  { cusip: '912810SE6', maturity: '2032-01-15', coupon: 0.125, realYieldBase: 1.88, breakevenBase: 2.40, priceBase: 88.65,  indexRatioBase: 1.172, durationBase: 7.1 },
  { cusip: '912810SF3', maturity: '2034-01-15', coupon: 1.375, realYieldBase: 1.92, breakevenBase: 2.42, priceBase: 95.30,  indexRatioBase: 1.128, durationBase: 8.8 },
  { cusip: '912810SG1', maturity: '2039-04-15', coupon: 1.750, realYieldBase: 2.02, breakevenBase: 2.45, priceBase: 96.72,  indexRatioBase: 1.095, durationBase: 12.2 },
  { cusip: '912810SH9', maturity: '2044-02-15', coupon: 1.000, realYieldBase: 2.12, breakevenBase: 2.48, priceBase: 82.45,  indexRatioBase: 1.068, durationBase: 16.5 },
  { cusip: '912810SJ5', maturity: '2054-02-15', coupon: 2.125, realYieldBase: 2.20, breakevenBase: 2.42, priceBase: 98.15,  indexRatioBase: 1.035, durationBase: 21.0 },
];

const REAL_YIELD_TENORS = ['2Y', '5Y', '7Y', '10Y', '20Y', '30Y'] as const;
const REAL_YIELD_BASES: Record<string, number> = {
  '2Y': 2.12, '5Y': 1.88, '7Y': 1.92, '10Y': 1.95, '20Y': 2.15, '30Y': 2.18,
};
const NOMINAL_YIELD_BASES: Record<string, number> = {
  '2Y': 4.35, '5Y': 4.22, '7Y': 4.30, '10Y': 4.38, '20Y': 4.62, '30Y': 4.58,
};

interface EtfBase {
  ticker: string;
  name: string;
  aumBnBase: number;
  yieldBase: number;
  return1MBase: number;
  returnYTDBase: number;
  flow1MBase: number;
}

const ETF_BASES: EtfBase[] = [
  { ticker: 'TIP',  name: 'iShares TIPS Bond ETF',               aumBnBase: 19.2, yieldBase: 4.85, return1MBase: 0.35,  returnYTDBase: 1.82,  flow1MBase: 280 },
  { ticker: 'VTIP', name: 'Vanguard Short-Term Inflation-Protected Securities ETF', aumBnBase: 15.8, yieldBase: 5.10, return1MBase: 0.18,  returnYTDBase: 1.45,  flow1MBase: 150 },
  { ticker: 'STIP', name: 'iShares 0-5 Year TIPS Bond ETF',      aumBnBase: 8.5,  yieldBase: 5.02, return1MBase: 0.22,  returnYTDBase: 1.52,  flow1MBase: 85 },
  { ticker: 'SCHP', name: 'Schwab U.S. TIPS ETF',                aumBnBase: 12.4, yieldBase: 4.78, return1MBase: 0.40,  returnYTDBase: 1.90,  flow1MBase: -120 },
  { ticker: 'GTIP', name: 'Goldman Sachs Access Inflation Protected Bond ETF', aumBnBase: 1.2, yieldBase: 4.92, return1MBase: 0.32,  returnYTDBase: 1.68,  flow1MBase: 25 },
  { ticker: 'WIP',  name: 'SPDR FTSE International Government Inflation-Protected Bond ETF', aumBnBase: 0.8, yieldBase: 3.45, return1MBase: -0.15, returnYTDBase: 0.92, flow1MBase: -35 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }
function round4(v: number): number { return Math.round(v * 10000) / 10000; }

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 60 * 60_000;
let cache: { data: InflationLinkedBondResponse; ts: number } | null = null;

// ── Data generation ──────────────────────────────────────────────────────────

function generate(): InflationLinkedBondResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-inflation-linked-bond'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. globalMarket
  const totalOutstandingTrn = round2(jitter(4.05, 0.03));
  const ytdIssuanceBn = round2(jitter(185, 0.08));
  const avgRealYield = round2(jitter(1.85, 0.05));
  const avgBreakeven = round2(jitter(2.55, 0.04));
  const avgDuration = round2(jitter(8.2, 0.04));
  const avgIndexRatio = round3(jitter(1.145, 0.02));

  const globalMarket: GlobalMarket = {
    totalOutstandingTrn,
    ytdIssuanceBn,
    avgRealYieldPct: avgRealYield,
    avgBreakevenPct: avgBreakeven,
    avgDuration,
    avgIndexRatio,
  };

  // 2. byCountry (10 countries)
  const byCountry: CountryLinker[] = COUNTRY_BASES.map((c) => {
    const outstandingBn = round2(jitter(c.outstandingBn, 0.03));
    const realYieldPct = round3(jitter(c.realYieldBase, 0.05));
    const breakevenPct = round3(jitter(c.breakevenBase, 0.04));
    const change1D = round3((rng() - 0.48) * 0.06);
    const change1W = round3((rng() - 0.48) * 0.15);
    const duration = round2(jitter(c.durationBase, 0.03));
    const inflationIndex = round2(jitter(c.inflationIndexBase, 0.01));
    return { country: c.country, outstandingBn, realYieldPct, breakevenPct, change1D, change1W, duration, inflationIndex };
  });

  // 3. tipsDetail (8 US TIPS)
  const tipsDetail: TipsDetail[] = TIPS_BASES.map((t) => {
    const realYieldPct = round3(jitter(t.realYieldBase, 0.04));
    const breakevenPct = round3(jitter(t.breakevenBase, 0.04));
    const price = round3(jitter(t.priceBase, 0.005));
    const indexRatio = round4(jitter(t.indexRatioBase, 0.01));
    const duration = round2(jitter(t.durationBase, 0.03));
    const change1D = round3((rng() - 0.48) * 0.50);
    return {
      cusip: t.cusip,
      maturity: t.maturity,
      couponPct: t.coupon,
      realYieldPct,
      breakevenPct,
      price,
      indexRatio,
      duration,
      change1D,
    };
  });

  // 4. realYieldCurve (6 tenors)
  const realYieldCurve: RealYieldCurvePoint[] = REAL_YIELD_TENORS.map((tenor) => {
    const realYieldPct = round3(jitter(REAL_YIELD_BASES[tenor], 0.04));
    const nominalYieldPct = round3(jitter(NOMINAL_YIELD_BASES[tenor], 0.03));
    const breakevenPct = round3(nominalYieldPct - realYieldPct);
    const change1D = round3((rng() - 0.48) * 0.06);
    const change1W = round3((rng() - 0.48) * 0.14);
    const rangeWidth = 0.40 + rng() * 0.35;
    const low = round2(realYieldPct - rangeWidth / 2 - rng() * 0.10);
    const high = round2(realYieldPct + rangeWidth / 2 + rng() * 0.10);
    return { tenor, realYieldPct, nominalYieldPct, breakevenPct, change1D, change1W, range52W: { low, high } };
  });

  // 5. inflationExpectations
  const inflationExpectations: InflationExpectations = {
    us5Y5YPct: round2(jitter(2.45, 0.04)),
    eur5Y5YPct: round2(jitter(2.28, 0.04)),
    uk5Y5YPct: round2(jitter(3.58, 0.04)),
    usMichiganPct: round2(jitter(3.80, 0.06)),
    usNYFedPct: round2(jitter(3.25, 0.06)),
    marketImplied1YPct: round2(jitter(2.62, 0.05)),
    marketImplied2YPct: round2(jitter(2.48, 0.05)),
    marketImplied5YPct: round2(jitter(2.42, 0.04)),
  };

  // 6. etfTrackers (6 ETFs)
  const etfTrackers: EtfTracker[] = ETF_BASES.map((e) => {
    const aumBn = round2(jitter(e.aumBnBase, 0.04));
    const yieldPct = round2(jitter(e.yieldBase, 0.03));
    const return1MPct = round2(e.return1MBase + (rng() - 0.5) * 0.40);
    const returnYTDPct = round2(e.returnYTDBase + (rng() - 0.5) * 0.80);
    const flow1M = round2(e.flow1MBase + (rng() - 0.5) * 100);
    return { ticker: e.ticker, name: e.name, aumBn, yieldPct, return1MPct, returnYTDPct, flow1M };
  });

  // 7. seasonalAdjustment
  const currentCPIIndexUS = round2(jitter(315.8, 0.01));
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextResetDate = nextMonth.toISOString().slice(0, 10);
  const projectedAccrualPct = round3(jitter(0.28, 0.15));
  const monthIdx = now.getMonth();
  const seasonalPattern: 'positive' | 'negative' | 'neutral' =
    [0, 1, 2, 3, 8].includes(monthIdx) ? 'positive' :
    [6, 10, 11].includes(monthIdx) ? 'negative' : 'neutral';

  const seasonalAdjustment: SeasonalAdjustment = {
    currentCPIIndexUS,
    nextResetDate,
    projectedAccrualPct,
    seasonalPattern,
  };

  // 8. summary
  const us10YCurve = realYieldCurve.find(p => p.tenor === '10Y');
  const us10YRealYieldPct = us10YCurve?.realYieldPct ?? 1.95;
  const us10YBreakevenPct = us10YCurve?.breakevenPct ?? 2.40;

  const realYieldTrend = us10YRealYieldPct > 2.0 ? 'rising' : us10YRealYieldPct < 1.7 ? 'falling' : 'stable';
  const inflationOutlook = us10YBreakevenPct > 2.5 ? 'above target' : us10YBreakevenPct < 2.1 ? 'below target' : 'near target';
  const tipsVsNominalSpread = round2(us10YBreakevenPct);
  const globalLinkerReturn1MPct = round2((rng() - 0.4) * 1.5);

  const summary: Summary = {
    us10YRealYieldPct,
    us10YBreakevenPct,
    realYieldTrend,
    inflationOutlook,
    tipsVsNominalSpread,
    globalLinkerReturn1MPct,
  };

  return {
    globalMarket,
    byCountry,
    tipsDetail,
    realYieldCurve,
    inflationExpectations,
    etfTrackers,
    seasonalAdjustment,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ────────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[InflationLinkedBond] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate inflation-linked bond data' });
  }
});

export default router;
