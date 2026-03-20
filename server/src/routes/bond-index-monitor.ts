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

// -- Static definitions --

const INDEX_DEFS = [
  { name: 'Bloomberg US Aggregate',       ticker: 'LBUSTRUU', baseTotalReturn: 2250, baseOAS: 50,  baseDuration: 6.2,  baseYield: 4.75, baseModDur: 6.0,  baseConvexity: 0.65, baseMV: 26500, baseExcessReturn: 185 },
  { name: 'Bloomberg US Corporate IG',    ticker: 'LUACTRUU', baseTotalReturn: 3180, baseOAS: 102, baseDuration: 7.2,  baseYield: 5.35, baseModDur: 6.9,  baseConvexity: 0.82, baseMV: 7200,  baseExcessReturn: 245 },
  { name: 'Bloomberg US High Yield',      ticker: 'LF98TRUU', baseTotalReturn: 2540, baseOAS: 350, baseDuration: 3.8,  baseYield: 8.05, baseModDur: 3.5,  baseConvexity: 0.18, baseMV: 1500,  baseExcessReturn: 420 },
  { name: 'Bloomberg US Treasury',        ticker: 'LUATTRUU', baseTotalReturn: 2180, baseOAS: 0,   baseDuration: 6.4,  baseYield: 4.45, baseModDur: 6.2,  baseConvexity: 0.72, baseMV: 12800, baseExcessReturn: 0 },
  { name: 'Bloomberg US MBS',             ticker: 'LUMSTRUU', baseTotalReturn: 2085, baseOAS: 45,  baseDuration: 5.8,  baseYield: 5.10, baseModDur: 5.5,  baseConvexity: -1.20, baseMV: 8200, baseExcessReturn: 128 },
  { name: 'Bloomberg Global Aggregate',   ticker: 'LEGATRUU', baseTotalReturn: 510,  baseOAS: 42,  baseDuration: 6.8,  baseYield: 3.65, baseModDur: 6.6,  baseConvexity: 0.78, baseMV: 68500, baseExcessReturn: 162 },
  { name: 'Bloomberg Euro Aggregate',     ticker: 'LBEATREU', baseTotalReturn: 245,  baseOAS: 55,  baseDuration: 6.5,  baseYield: 3.25, baseModDur: 6.3,  baseConvexity: 0.70, baseMV: 14200, baseExcessReturn: 148 },
  { name: 'Bloomberg EM USD Sovereign',   ticker: 'BSSUTRUU', baseTotalReturn: 890,  baseOAS: 285, baseDuration: 7.5,  baseYield: 7.20, baseModDur: 7.1,  baseConvexity: 0.95, baseMV: 1100,  baseExcessReturn: 380 },
  { name: 'Bloomberg US TIPS',            ticker: 'BCIT1T',   baseTotalReturn: 1420, baseOAS: 10,  baseDuration: 6.6,  baseYield: 2.15, baseModDur: 6.4,  baseConvexity: 0.68, baseMV: 1900,  baseExcessReturn: 35 },
  { name: 'Bloomberg US Municipal',       ticker: 'LMBITR',   baseTotalReturn: 1650, baseOAS: 65,  baseDuration: 5.5,  baseYield: 3.55, baseModDur: 5.3,  baseConvexity: 0.52, baseMV: 4000,  baseExcessReturn: 95 },
  { name: 'Bloomberg US Leveraged Loans', ticker: 'SPBDLLB',  baseTotalReturn: 1280, baseOAS: 420, baseDuration: 0.25, baseYield: 8.80, baseModDur: 0.24, baseConvexity: 0.01, baseMV: 1400,  baseExcessReturn: 510 },
  { name: 'Bloomberg US Convertible',     ticker: 'VXAO',     baseTotalReturn: 1060, baseOAS: 195, baseDuration: 2.8,  baseYield: 3.90, baseModDur: 2.6,  baseConvexity: 0.35, baseMV: 350,   baseExcessReturn: 275 },
];

const SECTOR_DEFS = [
  { sector: 'Treasury',  baseWeight: 39.5, baseOAS: 0,   baseDuration: 6.8,  baseMTD: 0.15 },
  { sector: 'MBS',       baseWeight: 27.0, baseOAS: 45,  baseDuration: 5.8,  baseMTD: 0.12 },
  { sector: 'Corporate', baseWeight: 24.5, baseOAS: 102, baseDuration: 7.2,  baseMTD: 0.22 },
  { sector: 'Agency',    baseWeight: 3.5,  baseOAS: 18,  baseDuration: 4.2,  baseMTD: 0.08 },
  { sector: 'CMBS',      baseWeight: 3.2,  baseOAS: 95,  baseDuration: 4.8,  baseMTD: 0.14 },
  { sector: 'ABS',       baseWeight: 2.3,  baseOAS: 55,  baseDuration: 2.5,  baseMTD: 0.10 },
];

const RATING_DEFS = [
  { rating: 'AAA', baseWeight: 4.2,  baseOAS: 55,  baseDuration: 8.5,  baseMTD: 0.18 },
  { rating: 'AA',  baseWeight: 8.5,  baseOAS: 65,  baseDuration: 7.8,  baseMTD: 0.20 },
  { rating: 'A',   baseWeight: 40.2, baseOAS: 85,  baseDuration: 7.3,  baseMTD: 0.21 },
  { rating: 'BBB', baseWeight: 47.1, baseOAS: 135, baseDuration: 6.9,  baseMTD: 0.25 },
];

const MATURITY_DEFS = [
  { bucket: '1-3y',  baseWeight: 18.5, baseYield: 4.35, baseDuration: 1.9 },
  { bucket: '3-5y',  baseWeight: 20.0, baseYield: 4.50, baseDuration: 3.8 },
  { bucket: '5-7y',  baseWeight: 15.5, baseYield: 4.65, baseDuration: 5.6 },
  { bucket: '7-10y', baseWeight: 22.0, baseYield: 4.80, baseDuration: 7.8 },
  { bucket: '10+y',  baseWeight: 24.0, baseYield: 5.05, baseDuration: 14.2 },
];

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-bond-index-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // 1. Index data
  const indices = INDEX_DEFS.map(def => {
    const totalReturn = round2(jitter(def.baseTotalReturn, 0.03));
    const excessReturn = round2(jitter(def.baseExcessReturn, 0.05));
    const oas = def.baseOAS === 0 ? 0 : round2(jitter(def.baseOAS, 0.08));
    const duration = round2(jitter(def.baseDuration, 0.03));
    const yieldVal = round4(jitter(def.baseYield, 0.04));
    const modifiedDuration = round2(jitter(def.baseModDur, 0.03));
    const convexity = round2(jitter(def.baseConvexity, 0.05));
    const marketValue = round2(jitter(def.baseMV, 0.02));

    const dailyReturn = round4((rng() - 0.48) * 0.15);
    const mtdReturn = round4((rng() - 0.45) * 0.8);
    const ytdReturn = round4((rng() - 0.4) * 3.5);

    return {
      name: def.name,
      ticker: def.ticker,
      totalReturn,
      excessReturn,
      oas,
      duration,
      ytdReturn,
      mtdReturn,
      dailyReturn,
      yield: yieldVal,
      modifiedDuration,
      convexity,
      marketValue,
    };
  });

  // 2. Sector breakdown (US Agg)
  const sectorBreakdown = SECTOR_DEFS.map(def => {
    const weight = round2(jitter(def.baseWeight, 0.03));
    const oas = def.baseOAS === 0 ? 0 : round2(jitter(def.baseOAS, 0.06));
    const duration = round2(jitter(def.baseDuration, 0.04));
    const mtdReturn = round4(jitter(def.baseMTD, 0.15));
    return { sector: def.sector, weight, oas, duration, mtdReturn };
  });

  // 3. Rating breakdown (US Corporate)
  const ratingBreakdown = RATING_DEFS.map(def => {
    const weight = round2(jitter(def.baseWeight, 0.02));
    const oas = round2(jitter(def.baseOAS, 0.06));
    const duration = round2(jitter(def.baseDuration, 0.03));
    const mtdReturn = round4(jitter(def.baseMTD, 0.12));
    return { rating: def.rating, weight, oas, duration, mtdReturn };
  });

  // 4. Maturity breakdown (US Agg)
  const maturityBreakdown = MATURITY_DEFS.map(def => {
    const weight = round2(jitter(def.baseWeight, 0.03));
    const yieldVal = round4(jitter(def.baseYield, 0.04));
    const duration = round2(jitter(def.baseDuration, 0.03));
    return { bucket: def.bucket, weight, yield: yieldVal, duration };
  });

  // 5. Trailing performance for major indices
  const perfIndices = [
    { name: 'Bloomberg US Aggregate',     base1w: 0.08, base1m: 0.35, base3m: 1.10, base6m: 1.85, baseYTD: 1.40, base1y: 3.80, base3y: -1.20, base5y: 0.85 },
    { name: 'Bloomberg US Corporate IG',  base1w: 0.10, base1m: 0.42, base3m: 1.35, base6m: 2.40, baseYTD: 1.75, base1y: 5.20, base3y: -0.55, base5y: 1.45 },
    { name: 'Bloomberg US High Yield',    base1w: 0.12, base1m: 0.55, base3m: 1.80, base6m: 3.20, baseYTD: 2.50, base1y: 8.40, base3y: 2.10,  base5y: 3.80 },
    { name: 'Bloomberg US Treasury',      base1w: 0.06, base1m: 0.28, base3m: 0.90, base6m: 1.50, baseYTD: 1.10, base1y: 3.20, base3y: -1.85, base5y: 0.40 },
    { name: 'Bloomberg US MBS',           base1w: 0.05, base1m: 0.30, base3m: 0.95, base6m: 1.60, baseYTD: 1.15, base1y: 3.50, base3y: -1.50, base5y: 0.55 },
    { name: 'Bloomberg Global Aggregate', base1w: 0.04, base1m: 0.25, base3m: 0.80, base6m: 1.30, baseYTD: 0.95, base1y: 2.90, base3y: -2.10, base5y: 0.20 },
    { name: 'Bloomberg EM USD Sovereign', base1w: 0.15, base1m: 0.60, base3m: 2.10, base6m: 3.50, baseYTD: 2.80, base1y: 7.60, base3y: 0.30,  base5y: 2.20 },
    { name: 'Bloomberg US Municipal',     base1w: 0.04, base1m: 0.22, base3m: 0.75, base6m: 1.25, baseYTD: 1.05, base1y: 3.10, base3y: -0.80, base5y: 1.10 },
  ];

  const performance = perfIndices.map(def => {
    return {
      name: def.name,
      '1w':    round4(jitter(def.base1w, 0.20)),
      '1m':    round4(jitter(def.base1m, 0.15)),
      '3m':    round4(jitter(def.base3m, 0.12)),
      '6m':    round4(jitter(def.base6m, 0.10)),
      'YTD':   round4(jitter(def.baseYTD, 0.12)),
      '1y':    round4(jitter(def.base1y, 0.08)),
      '3yAnn': round4(jitter(def.base3y, 0.15)),
      '5yAnn': round4(jitter(def.base5y, 0.15)),
    };
  });

  return {
    indices,
    sectorBreakdown,
    ratingBreakdown,
    maturityBreakdown,
    performance,
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
    console.error('[BondIndexMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate bond index monitor data' });
  }
});

export default router;
