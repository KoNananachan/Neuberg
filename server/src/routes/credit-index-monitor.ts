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

const INDEX_DEFS = [
  { index: 'CDX IG 41', baseSpread: 62, baseDv01: 4800, baseVol: 12 },
  { index: 'CDX HY 41', baseSpread: 395, baseDv01: 3500, baseVol: 8 },
  { index: 'CDX EM', baseSpread: 210, baseDv01: 5200, baseVol: 5 },
  { index: 'iTraxx Main 40', baseSpread: 67, baseDv01: 4600, baseVol: 10 },
  { index: 'iTraxx Crossover 40', baseSpread: 345, baseDv01: 3200, baseVol: 6 },
  { index: 'iTraxx Asia', baseSpread: 92, baseDv01: 4400, baseVol: 4 },
  { index: 'LCDX', baseSpread: 260, baseDv01: 2800, baseVol: 3 },
  { index: 'MCDX', baseSpread: 78, baseDv01: 4100, baseVol: 2 },
  { index: 'CDX IG 40 (OFR)', baseSpread: 58, baseDv01: 4700, baseVol: 7 },
  { index: 'iTraxx Main 39 (OFR)', baseSpread: 63, baseDv01: 4500, baseVol: 5 },
];

const BASIS_DEFS = [
  { index: 'CDX IG', baseIndex: 62, histAvg: -1.5 },
  { index: 'CDX HY', baseIndex: 395, histAvg: -5.2 },
  { index: 'iTraxx Main', baseIndex: 67, histAvg: -1.8 },
  { index: 'iTraxx Xover', baseIndex: 345, histAvg: -8.0 },
  { index: 'CDX EM', baseIndex: 210, histAvg: -3.5 },
  { index: 'LCDX', baseIndex: 260, histAvg: -4.0 },
];

const ROLL_DEFS = [
  { index: 'CDX IG', otrSeries: 41, ofrSeries: 40, baseOtr: 62, baseOfr: 58 },
  { index: 'CDX HY', otrSeries: 41, ofrSeries: 40, baseOtr: 395, baseOfr: 388 },
  { index: 'iTraxx Main', otrSeries: 40, ofrSeries: 39, baseOtr: 67, baseOfr: 63 },
  { index: 'iTraxx Xover', otrSeries: 40, ofrSeries: 39, baseOtr: 345, baseOfr: 338 },
  { index: 'CDX EM', otrSeries: 42, ofrSeries: 41, baseOtr: 210, baseOfr: 205 },
  { index: 'LCDX', otrSeries: 33, ofrSeries: 32, baseOtr: 260, baseOfr: 255 },
];

const TRANCHE_DEFS = [
  { tranche: '0-3%', baseSpread: 520, baseUpfront: 32, baseDelta: 15.2, baseImplCorr: 22, baseBaseCorr: 22, baseLeverage: 18.5 },
  { tranche: '3-7%', baseSpread: 185, baseUpfront: 8.5, baseDelta: 8.4, baseImplCorr: 28, baseBaseCorr: 35, baseLeverage: 8.2 },
  { tranche: '7-10%', baseSpread: 48, baseUpfront: 2.1, baseDelta: 4.2, baseImplCorr: 35, baseBaseCorr: 45, baseLeverage: 4.5 },
  { tranche: '10-15%', baseSpread: 20, baseUpfront: 0.8, baseDelta: 2.1, baseImplCorr: 42, baseBaseCorr: 55, baseLeverage: 2.8 },
  { tranche: '15-30%', baseSpread: 9, baseUpfront: 0.3, baseDelta: 0.9, baseImplCorr: 52, baseBaseCorr: 68, baseLeverage: 1.5 },
  { tranche: '30-100%', baseSpread: 3, baseUpfront: 0.05, baseDelta: 0.2, baseImplCorr: 65, baseBaseCorr: 82, baseLeverage: 0.4 },
  { tranche: 'iTraxx 0-3%', baseSpread: 490, baseUpfront: 30, baseDelta: 14.8, baseImplCorr: 23, baseBaseCorr: 23, baseLeverage: 17.8 },
  { tranche: 'iTraxx 3-6%', baseSpread: 195, baseUpfront: 9.2, baseDelta: 9.0, baseImplCorr: 27, baseBaseCorr: 33, baseLeverage: 9.0 },
];

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-credit-index-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // 1. Index Levels
  const indexLevels = INDEX_DEFS.map(def => {
    const spread = round2(jitter(def.baseSpread, 0.08));
    const change = round2((rng() - 0.5) * def.baseSpread * 0.04);
    const weekChange = round2((rng() - 0.5) * def.baseSpread * 0.08);
    const monthChange = round2((rng() - 0.5) * def.baseSpread * 0.14);
    const high52w = round2(spread + Math.abs(jitter(def.baseSpread * 0.25, 0.3)));
    const low52w = round2(spread - Math.abs(jitter(def.baseSpread * 0.2, 0.3)));
    const dv01 = round2(jitter(def.baseDv01, 0.05));
    const volume = Math.round(jitter(def.baseVol, 0.3) * 1000);

    return {
      index: def.index,
      spread,
      change,
      weekChange,
      monthChange,
      high52w,
      low52w,
      dv01,
      volume,
    };
  });

  // 2. Basis Trades
  const basisTrades = BASIS_DEFS.map(def => {
    const indexSpread = round2(jitter(def.baseIndex, 0.08));
    const basisVal = round2((rng() - 0.5) * 10);
    const intrinsicSpread = round2(indexSpread - basisVal);
    const basisChange = round2((rng() - 0.5) * 3);
    const historicalAvg = round2(def.histAvg);
    const zscore = round2((basisVal - historicalAvg) / (2 + rng() * 2));
    let signal: string;
    if (zscore > 1) signal = 'Cheap';
    else if (zscore < -1) signal = 'Rich';
    else signal = 'Fair';

    return {
      index: def.index,
      indexSpread,
      intrinsicSpread,
      basis: basisVal,
      basisChange,
      historicalAvg,
      zscore,
      signal,
    };
  });

  // 3. Roll Analysis
  const rollAnalysis = ROLL_DEFS.map(def => {
    const otrSpread = round2(jitter(def.baseOtr, 0.06));
    const ofrSpread = round2(jitter(def.baseOfr, 0.06));
    const rollSpread = round2(otrSpread - ofrSpread);
    const rollDirection = rollSpread >= 0 ? 'Positive' : 'Negative';
    const daysToRoll = Math.round(30 + rng() * 150);
    const rollCost = round2(Math.abs(rollSpread) * (0.8 + rng() * 0.4));

    return {
      index: def.index,
      onTheRunSeries: def.otrSeries,
      offTheRunSeries: def.ofrSeries,
      otrSpread,
      ofrSpread,
      rollSpread,
      rollDirection,
      daysToRoll,
      rollCost,
    };
  });

  // 4. Tranche Data
  const trancheData = TRANCHE_DEFS.map(def => {
    const spread = round2(jitter(def.baseSpread, 0.08));
    const upfront = round2(jitter(def.baseUpfront, 0.1));
    const change = round2((rng() - 0.5) * def.baseSpread * 0.04);
    const delta = round2(jitter(def.baseDelta, 0.06));
    const impliedCorrelation = round2(jitter(def.baseImplCorr, 0.05));
    const baseCorrelation = round2(jitter(def.baseBaseCorr, 0.04));
    const leverage = round2(jitter(def.baseLeverage, 0.06));

    return {
      tranche: def.tranche,
      spread,
      upfront,
      change,
      delta,
      impliedCorrelation,
      baseCorrelation,
      leverage,
    };
  });

  // 5. Market Summary
  const cdxIGSpread = indexLevels[0].spread;
  const cdxHYSpread = indexLevels[1].spread;
  const itraxxMainSpread = indexLevels[3].spread;
  const avgBasis = round2(basisTrades.reduce((sum, b) => sum + b.basis, 0) / basisTrades.length);
  const mostActiveIdx = indexLevels.reduce((max, il) => il.volume > max.volume ? il : max, indexLevels[0]);
  const totalVolume = round2(indexLevels.reduce((sum, il) => sum + il.volume, 0) / 1000);

  // Next roll date: 20th of next IMM month (Mar, Jun, Sep, Dec)
  const now = new Date();
  const immMonths = [2, 5, 8, 11]; // 0-indexed
  let rollMonth = immMonths.find(m => m > now.getMonth()) ?? immMonths[0];
  let rollYear = now.getFullYear();
  if (rollMonth <= now.getMonth()) rollYear++;
  const rollDate = `${rollYear}-${String(rollMonth + 1).padStart(2, '0')}-20`;

  let sentiment: string;
  const sentimentScore = (rng() - 0.5) * 2;
  if (sentimentScore > 0.3) sentiment = 'Risk-On';
  else if (sentimentScore < -0.3) sentiment = 'Risk-Off';
  else sentiment = 'Neutral';

  const marketSummary = {
    cdxIGSpread,
    cdxHYSpread,
    itraxxMainSpread,
    avgBasis,
    mostActive: mostActiveIdx.index,
    totalVolume,
    rollDate,
    sentiment,
  };

  return {
    indexLevels,
    basisTrades,
    rollAnalysis,
    trancheData,
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
    console.error('[CreditIndexMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate credit index monitor data' });
  }
});

export default router;
