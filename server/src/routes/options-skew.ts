import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: OptionsSkewResponse; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface IndexSkewTenor {
  tenor: string;
  atmIv: number;
  skew25D: number;
  skew10D: number;
  butterfly25D: number;
  riskReversal25D: number;
  skewIndex: number;
  skewPercentile: number;
  change1D: number;
  change1W: number;
}

interface IndexSkewEntry {
  underlying: string;
  spot: number;
  tenors: IndexSkewTenor[];
}

interface SingleStockSkewEntry {
  ticker: string;
  name: string;
  atmIv: number;
  skew25D_1M: number;
  skew25D_3M: number;
  putCallRatio: number;
  skewPercentile: number;
  ivRank: number;
}

interface SectorSkewEntry {
  sector: string;
  avgSkew25D: number;
  avgIv: number;
  putCallRatio: number;
  skewChange1W: number;
}

interface SkewTermStructureEntry {
  tenor: string;
  skew25D: number;
  skew10D: number;
  butterfly: number;
  atmIv: number;
}

interface ExtremeSkewEntry {
  ticker: string;
  skew25D: number;
  percentile: number;
  direction: 'puts_bid' | 'calls_bid';
  catalyst: string;
}

interface PutCallAnalysis {
  spxPutCallRatio: number;
  equityPutCallRatio: number;
  indexPutCallRatio: number;
  totalPutVolume: number;
  totalCallVolume: number;
  ratio5DMA: number;
}

interface SkewSummary {
  spxSkew25D: number;
  spxSkewPercentile: number;
  avgEquitySkew: number;
  putCallBias: 'bearish' | 'neutral' | 'bullish';
  skewTrend: string;
}

interface OptionsSkewResponse {
  indexSkew: IndexSkewEntry[];
  singleStockSkew: SingleStockSkewEntry[];
  sectorSkew: SectorSkewEntry[];
  skewTermStructure: SkewTermStructureEntry[];
  extremeSkew: ExtremeSkewEntry[];
  putCallAnalysis: PutCallAnalysis;
  summary: SkewSummary;
  timestamp: string;
}

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Index Profiles ──

interface IndexProfile {
  baseSpot: number;
  baseAtmIv: number;
  baseSkew25D: number;       // typical 25D put IV - call IV
  baseSkew10D: number;
  termSlope: number;         // IV increase per month
  skewTermSlope: number;     // skew flattening per month
  invertedSkew: boolean;     // VIX has calls bid
}

const INDEX_PROFILES: Record<string, IndexProfile> = {
  SPX:  { baseSpot: 5820, baseAtmIv: 15.5, baseSkew25D: 5.8, baseSkew10D: 12.4, termSlope: 0.35, skewTermSlope: -0.3, invertedSkew: false },
  NDX:  { baseSpot: 20650, baseAtmIv: 18.2, baseSkew25D: 5.2, baseSkew10D: 11.0, termSlope: 0.30, skewTermSlope: -0.25, invertedSkew: false },
  RUT:  { baseSpot: 2085, baseAtmIv: 21.8, baseSkew25D: 6.5, baseSkew10D: 14.2, termSlope: 0.45, skewTermSlope: -0.35, invertedSkew: false },
  DJX:  { baseSpot: 43200, baseAtmIv: 14.0, baseSkew25D: 5.0, baseSkew10D: 10.8, termSlope: 0.30, skewTermSlope: -0.28, invertedSkew: false },
  VIX:  { baseSpot: 16.5, baseAtmIv: 85.0, baseSkew25D: -8.5, baseSkew10D: -15.0, termSlope: -2.5, skewTermSlope: 0.8, invertedSkew: true },
};

const INDEX_TENORS = ['1W', '1M', '3M', '6M'];
const INDEX_TENOR_DAYS: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180 };

// ── Single Stock Profiles ──

interface StockProfile {
  name: string;
  baseAtmIv: number;
  baseSkew25D_1M: number;
  baseSkew25D_3M: number;
  basePutCallRatio: number;
  baseIvRank: number;
}

const STOCK_PROFILES: Record<string, StockProfile> = {
  AAPL:  { name: 'Apple Inc.',          baseAtmIv: 23.0, baseSkew25D_1M: 4.2, baseSkew25D_3M: 3.5,  basePutCallRatio: 0.72, baseIvRank: 35 },
  MSFT:  { name: 'Microsoft Corp.',     baseAtmIv: 21.5, baseSkew25D_1M: 4.0, baseSkew25D_3M: 3.3,  basePutCallRatio: 0.68, baseIvRank: 30 },
  NVDA:  { name: 'NVIDIA Corp.',        baseAtmIv: 48.0, baseSkew25D_1M: 3.8, baseSkew25D_3M: 3.0,  basePutCallRatio: 0.85, baseIvRank: 55 },
  TSLA:  { name: 'Tesla Inc.',          baseAtmIv: 55.0, baseSkew25D_1M: 2.5, baseSkew25D_3M: 2.0,  basePutCallRatio: 0.92, baseIvRank: 45 },
  AMZN:  { name: 'Amazon.com Inc.',     baseAtmIv: 28.0, baseSkew25D_1M: 4.5, baseSkew25D_3M: 3.8,  basePutCallRatio: 0.70, baseIvRank: 38 },
  META:  { name: 'Meta Platforms Inc.', baseAtmIv: 32.0, baseSkew25D_1M: 3.5, baseSkew25D_3M: 2.8,  basePutCallRatio: 0.75, baseIvRank: 42 },
  GOOGL: { name: 'Alphabet Inc.',       baseAtmIv: 26.0, baseSkew25D_1M: 4.0, baseSkew25D_3M: 3.2,  basePutCallRatio: 0.65, baseIvRank: 32 },
  JPM:   { name: 'JPMorgan Chase',      baseAtmIv: 22.0, baseSkew25D_1M: 5.0, baseSkew25D_3M: 4.2,  basePutCallRatio: 0.80, baseIvRank: 28 },
  XOM:   { name: 'Exxon Mobil Corp.',   baseAtmIv: 24.0, baseSkew25D_1M: 4.8, baseSkew25D_3M: 4.0,  basePutCallRatio: 0.78, baseIvRank: 25 },
  GS:    { name: 'Goldman Sachs',       baseAtmIv: 25.0, baseSkew25D_1M: 5.2, baseSkew25D_3M: 4.5,  basePutCallRatio: 0.82, baseIvRank: 30 },
  NFLX:  { name: 'Netflix Inc.',        baseAtmIv: 35.0, baseSkew25D_1M: 3.2, baseSkew25D_3M: 2.6,  basePutCallRatio: 0.88, baseIvRank: 48 },
  AMD:   { name: 'AMD Inc.',            baseAtmIv: 42.0, baseSkew25D_1M: 3.5, baseSkew25D_3M: 2.8,  basePutCallRatio: 0.90, baseIvRank: 52 },
  COIN:  { name: 'Coinbase Global',     baseAtmIv: 65.0, baseSkew25D_1M: 2.0, baseSkew25D_3M: 1.5,  basePutCallRatio: 1.05, baseIvRank: 60 },
  MARA:  { name: 'MARA Holdings',       baseAtmIv: 85.0, baseSkew25D_1M: 1.5, baseSkew25D_3M: 1.0,  basePutCallRatio: 1.10, baseIvRank: 65 },
  GME:   { name: 'GameStop Corp.',      baseAtmIv: 75.0, baseSkew25D_1M: 1.8, baseSkew25D_3M: 1.2,  basePutCallRatio: 1.15, baseIvRank: 70 },
};

const STOCK_TICKERS = Object.keys(STOCK_PROFILES);

// ── Sector Definitions ──

const SECTORS = [
  { sector: 'Technology',        baseSkew: 3.8, baseIv: 28.0, basePCR: 0.78 },
  { sector: 'Financials',        baseSkew: 5.0, baseIv: 22.0, basePCR: 0.82 },
  { sector: 'Healthcare',        baseSkew: 4.5, baseIv: 25.0, basePCR: 0.74 },
  { sector: 'Energy',            baseSkew: 4.8, baseIv: 30.0, basePCR: 0.85 },
  { sector: 'Consumer Disc.',    baseSkew: 3.5, baseIv: 27.0, basePCR: 0.80 },
  { sector: 'Consumer Staples',  baseSkew: 5.5, baseIv: 18.0, basePCR: 0.65 },
  { sector: 'Industrials',       baseSkew: 4.8, baseIv: 22.0, basePCR: 0.72 },
  { sector: 'Materials',         baseSkew: 4.5, baseIv: 26.0, basePCR: 0.76 },
  { sector: 'Utilities',         baseSkew: 5.8, baseIv: 17.0, basePCR: 0.60 },
  { sector: 'Real Estate',       baseSkew: 5.2, baseIv: 24.0, basePCR: 0.70 },
  { sector: 'Communication',     baseSkew: 3.8, baseIv: 26.0, basePCR: 0.76 },
];

// ── SPX Term Structure Tenors ──

const SPX_TERM_TENORS = [
  { tenor: '1W',  days: 7 },
  { tenor: '2W',  days: 14 },
  { tenor: '1M',  days: 30 },
  { tenor: '2M',  days: 60 },
  { tenor: '3M',  days: 90 },
  { tenor: '6M',  days: 180 },
  { tenor: '1Y',  days: 365 },
];

// ── Extreme Skew Catalysts ──

const CATALYSTS = [
  'Earnings in 5 days',
  'FDA decision pending',
  'Antitrust ruling expected',
  'M&A speculation',
  'Guidance warning',
  'Short squeeze setup',
  'Macro event hedging',
  'Sector rotation fears',
  'Credit downgrade risk',
  'Regulatory investigation',
  'Product launch imminent',
  'Dividend cut concerns',
  'Debt maturity approaching',
  'Activist investor position',
  'Trade policy exposure',
];

// ── Data Generation ──

function generateData(): OptionsSkewResponse {
  const dateKey = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('options-skew-' + dateKey);
  const rng = mulberry32(seed);

  // ── 1. Index Skew ──
  const indexSkew: IndexSkewEntry[] = Object.entries(INDEX_PROFILES).map(([underlying, profile]) => {
    const spot = round2(profile.baseSpot * (1 + (rng() - 0.5) * 0.015));

    const tenors: IndexSkewTenor[] = INDEX_TENORS.map((tenor) => {
      const days = INDEX_TENOR_DAYS[tenor];
      const months = days / 30;
      const timeDecay = Math.sqrt(30 / Math.max(days, 1));

      const atmIv = round2(profile.baseAtmIv + profile.termSlope * months + (rng() - 0.5) * 1.2);

      // Skew steepens for short tenors, flattens for long tenors
      const skew25D = round2(profile.baseSkew25D * timeDecay + profile.skewTermSlope * months + (rng() - 0.5) * 0.6);
      const skew10D = round2(profile.baseSkew10D * timeDecay + profile.skewTermSlope * months * 1.5 + (rng() - 0.5) * 1.0);

      // Butterfly: curvature of the smile (always positive)
      const butterfly25D = round2(Math.abs(skew25D) * 0.35 + rng() * 0.5 + 0.3);

      // Risk reversal: negative for standard equity (puts richer), positive for VIX (calls richer)
      const riskReversal25D = round2(profile.invertedSkew
        ? Math.abs(skew25D) * 0.8 + (rng() - 0.5) * 0.4
        : -skew25D * 0.9 + (rng() - 0.5) * 0.3);

      // Skew index: composite score normalized to ~100 baseline
      const skewIndex = round2(100 + (skew25D - profile.baseSkew25D) * 8 + (rng() - 0.5) * 3);

      // Skew percentile vs 1Y history
      const skewPercentile = Math.round(clamp(
        50 + (skew25D - profile.baseSkew25D) * 12 + (rng() - 0.5) * 20,
        1, 99
      ));

      // Daily and weekly changes
      const change1D = round2((rng() - 0.5) * 1.2);
      const change1W = round2((rng() - 0.5) * 2.5);

      return { tenor, atmIv, skew25D, skew10D, butterfly25D, riskReversal25D, skewIndex, skewPercentile, change1D, change1W };
    });

    return { underlying, spot, tenors };
  });

  // ── 2. Single Stock Skew ──
  const singleStockSkew: SingleStockSkewEntry[] = STOCK_TICKERS.map((ticker) => {
    const profile = STOCK_PROFILES[ticker];
    const atmIv = round2(profile.baseAtmIv + (rng() - 0.5) * profile.baseAtmIv * 0.08);
    const skew25D_1M = round2(profile.baseSkew25D_1M + (rng() - 0.5) * 1.2);
    const skew25D_3M = round2(profile.baseSkew25D_3M + (rng() - 0.5) * 0.8);
    const putCallRatio = round2(profile.basePutCallRatio + (rng() - 0.5) * 0.15);
    const skewPercentile = Math.round(clamp(
      50 + (skew25D_1M - profile.baseSkew25D_1M) * 15 + (rng() - 0.5) * 25,
      1, 99
    ));
    const ivRank = Math.round(clamp(
      profile.baseIvRank + (rng() - 0.5) * 20,
      1, 99
    ));

    return { ticker, name: profile.name, atmIv, skew25D_1M, skew25D_3M, putCallRatio, skewPercentile, ivRank };
  });

  // ── 3. Sector Skew ──
  const sectorSkew: SectorSkewEntry[] = SECTORS.map((s) => {
    const avgSkew25D = round2(s.baseSkew + (rng() - 0.5) * 1.5);
    const avgIv = round2(s.baseIv + (rng() - 0.5) * 3.0);
    const putCallRatio = round2(s.basePCR + (rng() - 0.5) * 0.12);
    const skewChange1W = round2((rng() - 0.5) * 1.8);
    return { sector: s.sector, avgSkew25D, avgIv, putCallRatio, skewChange1W };
  });

  // ── 4. SPX Skew Term Structure ──
  const spxProfile = INDEX_PROFILES['SPX'];
  const skewTermStructure: SkewTermStructureEntry[] = SPX_TERM_TENORS.map(({ tenor, days }) => {
    const months = days / 30;
    const timeDecay = Math.sqrt(30 / Math.max(days, 1));

    const atmIv = round2(spxProfile.baseAtmIv + spxProfile.termSlope * months + (rng() - 0.5) * 0.8);
    const skew25D = round2(spxProfile.baseSkew25D * timeDecay + spxProfile.skewTermSlope * months + (rng() - 0.5) * 0.5);
    const skew10D = round2(spxProfile.baseSkew10D * timeDecay + spxProfile.skewTermSlope * months * 1.5 + (rng() - 0.5) * 0.8);
    const butterfly = round2(Math.abs(skew25D) * 0.35 + rng() * 0.4 + 0.2);

    return { tenor, skew25D, skew10D, butterfly, atmIv };
  });

  // ── 5. Extreme Skew ──
  // Collect all single-stock skew entries, rank by absolute skew deviation, take top 10
  const stockSkewRanked = [...singleStockSkew].sort((a, b) => {
    const devA = Math.abs(a.skew25D_1M - (STOCK_PROFILES[a.ticker]?.baseSkew25D_1M ?? 3.5));
    const devB = Math.abs(b.skew25D_1M - (STOCK_PROFILES[b.ticker]?.baseSkew25D_1M ?? 3.5));
    return devB - devA;
  });

  // Also add some extra synthetic extreme names to fill to 10
  const extraExtremeNames = [
    { ticker: 'SMCI', baseSkew: 3.0 },
    { ticker: 'ARM',  baseSkew: 2.8 },
    { ticker: 'PLTR', baseSkew: 2.5 },
    { ticker: 'RIVN', baseSkew: 1.8 },
    { ticker: 'SNAP', baseSkew: 3.2 },
  ];

  const extremeFromStocks: ExtremeSkewEntry[] = stockSkewRanked.slice(0, 7).map((s) => {
    const catalystIdx = Math.floor(rng() * CATALYSTS.length);
    const direction: 'puts_bid' | 'calls_bid' = s.skew25D_1M > 3.0 ? 'puts_bid' : 'calls_bid';
    return {
      ticker: s.ticker,
      skew25D: s.skew25D_1M,
      percentile: s.skewPercentile,
      direction,
      catalyst: CATALYSTS[catalystIdx],
    };
  });

  const extremeFromExtra: ExtremeSkewEntry[] = extraExtremeNames.slice(0, 3).map((e) => {
    const skew25D = round2(e.baseSkew + (rng() - 0.5) * 3.0);
    const percentile = Math.round(clamp(50 + (rng() - 0.5) * 60, 5, 98));
    const direction: 'puts_bid' | 'calls_bid' = skew25D > 2.5 ? 'puts_bid' : 'calls_bid';
    const catalystIdx = Math.floor(rng() * CATALYSTS.length);
    return { ticker: e.ticker, skew25D, percentile, direction, catalyst: CATALYSTS[catalystIdx] };
  });

  const extremeSkew = [...extremeFromStocks, ...extremeFromExtra]
    .sort((a, b) => Math.abs(b.skew25D) - Math.abs(a.skew25D))
    .slice(0, 10);

  // ── 6. Put/Call Analysis ──
  const spxPCR = round2(0.95 + (rng() - 0.5) * 0.30);
  const equityPCR = round2(0.72 + (rng() - 0.5) * 0.20);
  const indexPCR = round2(1.15 + (rng() - 0.5) * 0.25);

  const totalCallVolume = Math.round(18_000_000 + (rng() - 0.5) * 6_000_000);
  const totalPutVolume = Math.round(totalCallVolume * ((spxPCR + equityPCR) / 2));
  const ratio5DMA = round2((spxPCR + equityPCR + indexPCR) / 3 + (rng() - 0.5) * 0.05);

  const putCallAnalysis: PutCallAnalysis = {
    spxPutCallRatio: spxPCR,
    equityPutCallRatio: equityPCR,
    indexPutCallRatio: indexPCR,
    totalPutVolume,
    totalCallVolume,
    ratio5DMA,
  };

  // ── 7. Summary ──
  const spx1M = indexSkew.find((e) => e.underlying === 'SPX')?.tenors.find((t) => t.tenor === '1M');
  const spxSkew25D = spx1M?.skew25D ?? spxProfile.baseSkew25D;
  const spxSkewPercentile = spx1M?.skewPercentile ?? 50;

  const avgEquitySkew = round2(
    singleStockSkew.reduce((sum, s) => sum + s.skew25D_1M, 0) / singleStockSkew.length
  );

  // Bias: if SPX PCR > 1.1 and skew percentile > 65 -> bearish; PCR < 0.8 and percentile < 35 -> bullish
  let putCallBias: 'bearish' | 'neutral' | 'bullish';
  if (spxPCR > 1.05 && spxSkewPercentile > 60) {
    putCallBias = 'bearish';
  } else if (spxPCR < 0.85 && spxSkewPercentile < 40) {
    putCallBias = 'bullish';
  } else {
    putCallBias = 'neutral';
  }

  // Skew trend based on 1W change
  const spx1WChange = spx1M?.change1W ?? 0;
  let skewTrend: string;
  if (spx1WChange > 0.5) {
    skewTrend = 'Steepening - increasing demand for downside protection';
  } else if (spx1WChange < -0.5) {
    skewTrend = 'Flattening - easing hedging pressure';
  } else {
    skewTrend = 'Stable - skew within normal range';
  }

  const summary: SkewSummary = {
    spxSkew25D: round2(spxSkew25D),
    spxSkewPercentile,
    avgEquitySkew,
    putCallBias,
    skewTrend,
  };

  return {
    indexSkew,
    singleStockSkew,
    sectorSkew,
    skewTermStructure,
    extremeSkew,
    putCallAnalysis,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Serve from cache if fresh
    if (cache && (now - cache.ts) < TTL) {
      return res.json(cache.data);
    }

    // Generate fresh data
    const data = generateData();

    // Update cache
    cache = { data, ts: now };

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[OptionsSkew] Error:', message);

    // Stale fallback
    if (cache) {
      return res.json(cache.data);
    }

    res.status(500).json({ error: 'Failed to generate options skew data' });
  }
});

export default router;
