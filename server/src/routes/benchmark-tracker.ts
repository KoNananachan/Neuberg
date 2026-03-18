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

// -- Seed Data --

interface IndexDef {
  ticker: string;
  name: string;
  baseLevel: number;
  assetClass: 'equity' | 'bond' | 'commodity';
  basePE?: number;
  baseYield?: number;
  baseVol: number;
  baseYTD: number;
}

const INDEX_DEFS: IndexDef[] = [
  { ticker: 'SPX', name: 'S&P 500', baseLevel: 5820, assetClass: 'equity', basePE: 21.4, baseVol: 14.2, baseYTD: 8.5 },
  { ticker: 'NDX', name: 'NASDAQ 100', baseLevel: 20650, assetClass: 'equity', basePE: 29.8, baseVol: 17.8, baseYTD: 10.2 },
  { ticker: 'INDU', name: 'Dow Jones Industrial Avg', baseLevel: 43200, assetClass: 'equity', basePE: 18.6, baseVol: 12.5, baseYTD: 5.8 },
  { ticker: 'RTY', name: 'Russell 2000', baseLevel: 2180, assetClass: 'equity', basePE: 15.2, baseVol: 19.5, baseYTD: 3.2 },
  { ticker: 'SXXP', name: 'STOXX Europe 600', baseLevel: 528, assetClass: 'equity', basePE: 14.8, baseVol: 13.1, baseYTD: 6.4 },
  { ticker: 'DAX', name: 'DAX', baseLevel: 21450, assetClass: 'equity', basePE: 15.1, baseVol: 14.6, baseYTD: 9.1 },
  { ticker: 'UKX', name: 'FTSE 100', baseLevel: 8640, assetClass: 'equity', basePE: 12.4, baseVol: 11.8, baseYTD: 4.7 },
  { ticker: 'NKY', name: 'Nikkei 225', baseLevel: 39200, assetClass: 'equity', basePE: 16.9, baseVol: 18.2, baseYTD: 7.6 },
  { ticker: 'HSI', name: 'Hang Seng', baseLevel: 22800, assetClass: 'equity', basePE: 10.5, baseVol: 20.4, baseYTD: 12.8 },
  { ticker: 'SHCOMP', name: 'Shanghai Composite', baseLevel: 3380, assetClass: 'equity', basePE: 13.2, baseVol: 16.7, baseYTD: 4.1 },
  { ticker: 'MXWO', name: 'MSCI World', baseLevel: 3620, assetClass: 'equity', basePE: 19.2, baseVol: 13.4, baseYTD: 7.8 },
  { ticker: 'MXEF', name: 'MSCI Emerging Markets', baseLevel: 1105, assetClass: 'equity', basePE: 12.8, baseVol: 15.9, baseYTD: 5.5 },
  { ticker: 'LBUSTRUU', name: 'Bloomberg US Agg', baseLevel: 2185, assetClass: 'bond', baseYield: 4.62, baseVol: 5.8, baseYTD: 1.2 },
  { ticker: 'LEGATRUU', name: 'Bloomberg Global Agg', baseLevel: 480, assetClass: 'bond', baseYield: 3.85, baseVol: 5.2, baseYTD: 0.8 },
  { ticker: 'SPGSCI', name: 'S&P GSCI', baseLevel: 565, assetClass: 'commodity', baseVol: 16.3, baseYTD: 2.9 },
];

interface RelPerfDef {
  pair: string;
  label: string;
  baseSpread1m: number;
  baseSpread3m: number;
  baseSpreadYTD: number;
}

const REL_PERF_DEFS: RelPerfDef[] = [
  { pair: 'US_vs_INTL_Equity', label: 'US Equity vs Intl Equity', baseSpread1m: 1.2, baseSpread3m: 2.8, baseSpreadYTD: 3.5 },
  { pair: 'Equity_vs_Bonds', label: 'Equity vs Bonds', baseSpread1m: 2.5, baseSpread3m: 5.4, baseSpreadYTD: 7.3 },
  { pair: 'Growth_vs_Value', label: 'Growth vs Value', baseSpread1m: 0.8, baseSpread3m: 2.1, baseSpreadYTD: 4.2 },
  { pair: 'Large_vs_Small', label: 'Large Cap vs Small Cap', baseSpread1m: 0.6, baseSpread3m: 1.4, baseSpreadYTD: 5.3 },
  { pair: 'DM_vs_EM', label: 'DM vs EM', baseSpread1m: 0.4, baseSpread3m: 0.9, baseSpreadYTD: 2.3 },
  { pair: 'Stocks_vs_Commodities', label: 'Stocks vs Commodities', baseSpread1m: 1.8, baseSpread3m: 3.2, baseSpreadYTD: 5.6 },
];

interface ETFDef {
  ticker: string;
  name: string;
  baseNAV: number;
  baseExpenseRatio: number;
  baseAvgVolume: number;
  baseTrackingError30d: number;
  baseTrackingError1yr: number;
  baseAvgSpread: number;
}

const ETF_DEFS: ETFDef[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', baseNAV: 581.20, baseExpenseRatio: 9.45, baseAvgVolume: 72.5, baseTrackingError30d: 1.8, baseTrackingError1yr: 2.4, baseAvgSpread: 0.3 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', baseNAV: 502.80, baseExpenseRatio: 20.0, baseAvgVolume: 48.2, baseTrackingError30d: 2.5, baseTrackingError1yr: 3.1, baseAvgSpread: 0.4 },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', baseNAV: 218.40, baseExpenseRatio: 19.0, baseAvgVolume: 28.6, baseTrackingError30d: 4.2, baseTrackingError1yr: 5.8, baseAvgSpread: 0.8 },
  { ticker: 'EFA', name: 'iShares MSCI EAFE ETF', baseNAV: 82.50, baseExpenseRatio: 32.0, baseAvgVolume: 18.4, baseTrackingError30d: 3.5, baseTrackingError1yr: 4.9, baseAvgSpread: 1.2 },
  { ticker: 'AGG', name: 'iShares Core US Agg Bond ETF', baseNAV: 98.60, baseExpenseRatio: 3.0, baseAvgVolume: 8.9, baseTrackingError30d: 2.8, baseTrackingError1yr: 3.6, baseAvgSpread: 1.5 },
  { ticker: 'GLD', name: 'SPDR Gold Shares', baseNAV: 278.30, baseExpenseRatio: 40.0, baseAvgVolume: 9.2, baseTrackingError30d: 5.1, baseTrackingError1yr: 8.2, baseAvgSpread: 2.1 },
];

interface SectorDef {
  sector: string;
  baseYTD: number;
  baseWeight: number;
}

const SECTOR_DEFS: SectorDef[] = [
  { sector: 'Information Technology', baseYTD: 12.4, baseWeight: 31.2 },
  { sector: 'Financials', baseYTD: 9.8, baseWeight: 13.5 },
  { sector: 'Health Care', baseYTD: 4.2, baseWeight: 11.8 },
  { sector: 'Consumer Discretionary', baseYTD: 7.6, baseWeight: 10.4 },
  { sector: 'Communication Services', baseYTD: 11.5, baseWeight: 9.2 },
  { sector: 'Industrials', baseYTD: 5.1, baseWeight: 8.6 },
  { sector: 'Consumer Staples', baseYTD: 2.8, baseWeight: 5.8 },
  { sector: 'Energy', baseYTD: -1.4, baseWeight: 3.5 },
  { sector: 'Utilities', baseYTD: 6.2, baseWeight: 2.6 },
  { sector: 'Real Estate', baseYTD: 1.5, baseWeight: 2.2 },
  { sector: 'Materials', baseYTD: 0.9, baseWeight: 2.1 },
];

const TRENDS = ['momentum', 'reversal', 'neutral'] as const;

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-benchmark-tracker'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const jitterAbs = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. Global Indices --

  const globalIndices = INDEX_DEFS.map(def => {
    const level = roundTo(jitter(def.baseLevel, 0.03), 2);
    const changeYTD = roundTo(jitterAbs(def.baseYTD, 2.5), 2);
    const change1d = roundTo(jitterAbs(0, 0.8), 2);
    const change1w = roundTo(jitterAbs(change1d * 2.2, 1.2), 2);
    const changeMTD = roundTo(jitterAbs(changeYTD * 0.15, 1.5), 2);
    const vol = roundTo(jitter(def.baseVol, 0.15), 1);

    const high52w = roundTo(level * jitter(1.08, 0.03), 2);
    const low52w = roundTo(level * jitter(0.82, 0.04), 2);

    const entry: Record<string, unknown> = {
      ticker: def.ticker,
      name: def.name,
      assetClass: def.assetClass,
      level,
      change1d,
      change1w,
      changeMTD,
      changeYTD,
      high52w,
      low52w,
      volatility30d: vol,
    };

    if (def.assetClass === 'equity' && def.basePE != null) {
      entry.pe = roundTo(jitter(def.basePE, 0.06), 1);
    }
    if (def.assetClass === 'bond' && def.baseYield != null) {
      entry.yield = roundTo(jitter(def.baseYield, 0.05), 2);
    }

    return entry;
  });

  // -- 2. Relative Performance --

  const relativePerformance = REL_PERF_DEFS.map(def => {
    const spread_1m = roundTo(jitterAbs(def.baseSpread1m, 1.5), 2);
    const spread_3m = roundTo(jitterAbs(def.baseSpread3m, 2.0), 2);
    const spread_YTD = roundTo(jitterAbs(def.baseSpreadYTD, 2.5), 2);

    // Determine trend based on recent momentum
    let trend: typeof TRENDS[number];
    if (Math.abs(spread_1m) > 2.0 && Math.sign(spread_1m) === Math.sign(spread_3m)) {
      trend = 'momentum';
    } else if (Math.sign(spread_1m) !== Math.sign(spread_3m)) {
      trend = 'reversal';
    } else {
      trend = pick(TRENDS);
    }

    return {
      pair: def.pair,
      label: def.label,
      spread_1m,
      spread_3m,
      spread_YTD,
      trend,
    };
  });

  // -- 3. Tracking Analysis --

  const trackingAnalysis = ETF_DEFS.map(def => {
    const nav = roundTo(jitter(def.baseNAV, 0.02), 2);
    const premDiscBps = roundTo(jitterAbs(0, 8), 1);
    const marketPrice = roundTo(nav * (1 + premDiscBps / 10000), 2);

    return {
      ticker: def.ticker,
      name: def.name,
      nav,
      marketPrice,
      premiumDiscount: premDiscBps,
      trackingError30d: roundTo(jitter(def.baseTrackingError30d, 0.20), 1),
      trackingError1yr: roundTo(jitter(def.baseTrackingError1yr, 0.15), 1),
      avgSpread: roundTo(jitter(def.baseAvgSpread, 0.20), 1),
      avgVolume: roundTo(jitter(def.baseAvgVolume, 0.10), 1),
      expenseRatio: roundTo(def.baseExpenseRatio, 1),
    };
  });

  // -- 4. Performance Attribution (S&P 500 sectors) --

  const indexYTD = globalIndices[0].changeYTD as number;

  const sectorAttribution = SECTOR_DEFS.map(def => {
    const ytdReturn = roundTo(jitterAbs(def.baseYTD, 2.0), 2);
    const weightInIndex = roundTo(jitter(def.baseWeight, 0.03), 1);
    const contributionBps = roundTo(ytdReturn * weightInIndex, 1);
    const relativeToIndex = roundTo((ytdReturn - indexYTD) * 100, 1);

    return {
      sector: def.sector,
      ytdReturn,
      weightInIndex,
      contribution: contributionBps,
      relativeToIndex,
    };
  });

  // Normalize weights to sum to 100
  const totalWeight = sectorAttribution.reduce((s, c) => s + c.weightInIndex, 0);
  sectorAttribution.forEach(s => {
    s.weightInIndex = roundTo(s.weightInIndex * (100 / totalWeight), 1);
    s.contribution = roundTo(s.ytdReturn * s.weightInIndex, 1);
  });

  return {
    globalIndices,
    relativePerformance,
    trackingAnalysis,
    performanceAttribution: sectorAttribution,
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
    console.error('[BenchmarkTracker] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate benchmark tracker data' });
  }
});

export default router;
