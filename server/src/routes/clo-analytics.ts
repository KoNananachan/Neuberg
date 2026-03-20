import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-clo-analytics'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const round0 = (v: number) => Math.round(v);

  // 1. Tranche Spreads
  const trancheSeeds = [
    { tranche: 'AAA',    spreadBase: 145,  weekBase: -3,  newIssueDM: 150,  secDM: 142,  bidAsk: 3,   wal: 4.8 },
    { tranche: 'AA',     spreadBase: 200,  weekBase: -2,  newIssueDM: 210,  secDM: 195,  bidAsk: 5,   wal: 6.2 },
    { tranche: 'A',      spreadBase: 275,  weekBase: 1,   newIssueDM: 285,  secDM: 268,  bidAsk: 8,   wal: 7.5 },
    { tranche: 'BBB',    spreadBase: 450,  weekBase: 3,   newIssueDM: 465,  secDM: 440,  bidAsk: 15,  wal: 8.8 },
    { tranche: 'BB',     spreadBase: 800,  weekBase: 5,   newIssueDM: 830,  secDM: 780,  bidAsk: 30,  wal: 9.5 },
    { tranche: 'B',      spreadBase: 1100, weekBase: 8,   newIssueDM: 1150, secDM: 1070, bidAsk: 50,  wal: 10.2 },
    { tranche: 'Equity', spreadBase: 15.0, weekBase: -0.2, newIssueDM: 15.5, secDM: 14.6, bidAsk: 0.5, wal: 11.5 },
  ];

  const trancheSpreads = trancheSeeds.map(seed => {
    const isEquity = seed.tranche === 'Equity';
    const pctRange = isEquity ? 0.06 : 0.05;
    const spread = isEquity
      ? round2(jitter(seed.spreadBase, pctRange))
      : round0(jitter(seed.spreadBase, pctRange));
    const change = isEquity
      ? round2((rng() - 0.48) * 0.4)
      : round0((rng() - 0.48) * seed.spreadBase * 0.02);
    const weekChange = isEquity
      ? round2(jitter(seed.weekBase, 0.3))
      : round0(jitter(seed.weekBase, 0.3));
    const newIssueDM = isEquity
      ? round2(jitter(seed.newIssueDM, 0.04))
      : round0(jitter(seed.newIssueDM, 0.04));
    const secondaryDM = isEquity
      ? round2(jitter(seed.secDM, 0.04))
      : round0(jitter(seed.secDM, 0.04));
    const bidAskSpread = isEquity
      ? round2(jitter(seed.bidAsk, 0.15))
      : round1(jitter(seed.bidAsk, 0.15));
    const weightedAvgLife = round1(jitter(seed.wal, 0.03));

    return {
      tranche: seed.tranche,
      spread,
      change,
      weekChange,
      newIssueDM,
      secondaryDM,
      bidAskSpread,
      weightedAvgLife,
    };
  });

  // 2. Manager Rankings
  const managerSeeds = [
    { manager: 'Carlyle',    aumBase: 52,  dealsBase: 68,  avgAAA: 'Aaa',  warsBase: 2750, ocBase: 128.5, icBase: 4.8, defBase: 0.35, retBase: 8.2 },
    { manager: 'Apollo',     aumBase: 48,  dealsBase: 62,  avgAAA: 'Aaa',  warsBase: 2720, ocBase: 129.1, icBase: 5.0, defBase: 0.28, retBase: 8.5 },
    { manager: 'Ares',       aumBase: 41,  dealsBase: 55,  avgAAA: 'Aaa',  warsBase: 2780, ocBase: 127.8, icBase: 4.6, defBase: 0.42, retBase: 7.9 },
    { manager: 'PGIM',       aumBase: 38,  dealsBase: 50,  avgAAA: 'Aaa',  warsBase: 2690, ocBase: 130.2, icBase: 5.2, defBase: 0.22, retBase: 8.8 },
    { manager: 'Blackstone', aumBase: 35,  dealsBase: 45,  avgAAA: 'Aaa',  warsBase: 2810, ocBase: 127.2, icBase: 4.5, defBase: 0.48, retBase: 7.6 },
    { manager: 'KKR',        aumBase: 33,  dealsBase: 42,  avgAAA: 'Aaa',  warsBase: 2730, ocBase: 128.8, icBase: 4.9, defBase: 0.31, retBase: 8.3 },
    { manager: 'Oak Hill',   aumBase: 28,  dealsBase: 38,  avgAAA: 'Aaa',  warsBase: 2770, ocBase: 128.0, icBase: 4.7, defBase: 0.39, retBase: 8.0 },
    { manager: 'GSO',        aumBase: 26,  dealsBase: 35,  avgAAA: 'Aaa',  warsBase: 2740, ocBase: 129.5, icBase: 5.1, defBase: 0.25, retBase: 8.6 },
    { manager: 'Canyon',     aumBase: 22,  dealsBase: 30,  avgAAA: 'Aa1',  warsBase: 2830, ocBase: 126.8, icBase: 4.4, defBase: 0.52, retBase: 7.4 },
    { manager: 'HPS',        aumBase: 20,  dealsBase: 28,  avgAAA: 'Aaa',  warsBase: 2760, ocBase: 128.3, icBase: 4.8, defBase: 0.36, retBase: 8.1 },
  ];

  const managerRankings = managerSeeds.map(seed => ({
    manager: seed.manager,
    aum: round1(jitter(seed.aumBase, 0.04)),
    dealsActive: round0(jitter(seed.dealsBase, 0.05)),
    avgAAARating: seed.avgAAA,
    avgWARS: round0(jitter(seed.warsBase, 0.02)),
    avgOC: round2(jitter(seed.ocBase, 0.01)),
    avgIC: round2(jitter(seed.icBase, 0.03)),
    defaultRate: round2(jitter(seed.defBase, 0.10)),
    annualizedReturn: round2(jitter(seed.retBase, 0.03)),
  }));

  // 3. Collateral Quality
  const collateralSeeds = [
    { metric: 'WARF',              valBase: 2810,  limitVal: 3200, trendOpts: ['Stable', 'Improving'] as const },
    { metric: 'WAS',               valBase: 3.45,  limitVal: 2.80, trendOpts: ['Stable', 'Deteriorating'] as const },
    { metric: 'WAC',               valBase: 5.62,  limitVal: 4.50, trendOpts: ['Improving', 'Stable'] as const },
    { metric: 'Diversity Score',   valBase: 72,    limitVal: 55,   trendOpts: ['Stable', 'Improving'] as const },
    { metric: 'CCC Bucket',       valBase: 5.8,   limitVal: 7.5,  trendOpts: ['Stable', 'Deteriorating'] as const },
    { metric: 'Single-B Bucket',  valBase: 28.5,  limitVal: 35.0, trendOpts: ['Stable', 'Deteriorating'] as const },
    { metric: 'Recovery Rate',     valBase: 62.5,  limitVal: 50.0, trendOpts: ['Improving', 'Stable'] as const },
    { metric: 'Junior OC Cushion', valBase: 4.2,   limitVal: 0.0,  trendOpts: ['Stable', 'Improving', 'Deteriorating'] as const },
  ];

  const collateralQuality = collateralSeeds.map(seed => {
    const currentValue = round2(jitter(seed.valBase, 0.03));
    const limit = seed.limitVal;

    // Cushion: positive means within limit
    let cushion: number;
    if (seed.metric === 'WARF' || seed.metric === 'CCC Bucket' || seed.metric === 'Single-B Bucket') {
      // Lower is better — cushion = limit - current
      cushion = round2(limit - currentValue);
    } else {
      // Higher is better — cushion = current - limit
      cushion = round2(currentValue - limit);
    }

    const trend = seed.trendOpts[Math.floor(rng() * seed.trendOpts.length)];
    const percentile = round0(40 + rng() * 50);

    return {
      metric: seed.metric,
      currentValue,
      limit,
      cushion,
      trend,
      percentile,
    };
  });

  // 4. Coverage Tests
  const coverageSeeds = [
    { test: 'Senior OC',     levelBase: 132.5, trigger: 126.0 },
    { test: 'Mezzanine OC',  levelBase: 122.8, trigger: 116.5 },
    { test: 'Junior OC',     levelBase: 108.2, trigger: 104.0 },
    { test: 'Senior IC',     levelBase: 4.85,  trigger: 2.20 },
    { test: 'Mezzanine IC',  levelBase: 3.92,  trigger: 1.80 },
    { test: 'Junior IC',     levelBase: 2.15,  trigger: 1.10 },
  ];

  const coverageTests = coverageSeeds.map(seed => {
    const currentLevel = round2(jitter(seed.levelBase, 0.015));
    const trigger = seed.trigger;
    const cushion = round2(currentLevel - trigger);
    const cushionPct = (cushion / trigger) * 100;

    let passFail: 'Pass' | 'Fail' | 'Warning';
    if (currentLevel < trigger) {
      passFail = 'Fail';
    } else if (cushionPct < 5) {
      passFail = 'Warning';
    } else {
      passFail = 'Pass';
    }

    const trendOpts = ['Improving', 'Deteriorating', 'Stable'] as const;
    const trend = trendOpts[Math.floor(rng() * trendOpts.length)];

    return {
      test: seed.test,
      currentLevel,
      trigger,
      cushion,
      passFail,
      trend,
    };
  });

  // 5. Market Summary
  const marketSummary = {
    totalIssuanceYTD: round1(jitter(92, 0.08)),
    newDealVolume: round1(jitter(14.5, 0.10)),
    resetVolume: round1(jitter(8.2, 0.12)),
    avgAAA_spread: trancheSpreads[0].spread,
    avgEquityIRR: trancheSpreads[6].spread,
    cccBucketAvg: round2(jitter(5.6, 0.05)),
    managerCount: round0(jitter(145, 0.03)),
  };

  return {
    trancheSpreads,
    managerRankings,
    collateralQuality,
    coverageTests,
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
    console.error('[CLOAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate CLO analytics data' });
  }
});

export default router;
