import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Static definitions --

interface BankDef {
  name: string;
  ticker: string;
  baseHQLA: number;
  baseNetOutflows30d: number;
  baseLCR: number;
  baseASF: number;
  baseRSF: number;
  baseNSFR: number;
}

const BANK_DEFS: BankDef[] = [
  { name: 'JPMorgan Chase', ticker: 'JPM', baseHQLA: 892, baseNetOutflows30d: 685, baseLCR: 130, baseASF: 1420, baseRSF: 1195, baseNSFR: 119 },
  { name: 'Bank of America', ticker: 'BAC', baseHQLA: 768, baseNetOutflows30d: 612, baseLCR: 125, baseASF: 1285, baseRSF: 1098, baseNSFR: 117 },
  { name: 'Citigroup', ticker: 'C', baseHQLA: 582, baseNetOutflows30d: 468, baseLCR: 124, baseASF: 985, baseRSF: 862, baseNSFR: 114 },
  { name: 'Wells Fargo', ticker: 'WFC', baseHQLA: 542, baseNetOutflows30d: 452, baseLCR: 120, baseASF: 1150, baseRSF: 1015, baseNSFR: 113 },
  { name: 'Goldman Sachs', ticker: 'GS', baseHQLA: 348, baseNetOutflows30d: 258, baseLCR: 135, baseASF: 625, baseRSF: 518, baseNSFR: 121 },
  { name: 'Morgan Stanley', ticker: 'MS', baseHQLA: 312, baseNetOutflows30d: 228, baseLCR: 137, baseASF: 568, baseRSF: 478, baseNSFR: 119 },
  { name: 'BNP Paribas', ticker: 'BNP', baseHQLA: 465, baseNetOutflows30d: 392, baseLCR: 119, baseASF: 895, baseRSF: 782, baseNSFR: 114 },
  { name: 'HSBC Holdings', ticker: 'HSBC', baseHQLA: 628, baseNetOutflows30d: 498, baseLCR: 126, baseASF: 1082, baseRSF: 925, baseNSFR: 117 },
];

const MATURITY_BUCKETS = [
  { label: 'Overnight', baseInflow: 185, baseOutflow: 210 },
  { label: '2-7d', baseInflow: 142, baseOutflow: 158 },
  { label: '8-14d', baseInflow: 118, baseOutflow: 125 },
  { label: '15-30d', baseInflow: 95, baseOutflow: 108 },
  { label: '31-60d', baseInflow: 82, baseOutflow: 78 },
  { label: '61-90d', baseInflow: 68, baseOutflow: 62 },
  { label: '91-180d', baseInflow: 55, baseOutflow: 48 },
  { label: '181-365d', baseInflow: 42, baseOutflow: 35 },
];

// -- Cache --


let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-liquidity-coverage'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // 1. LCR Summary
  const lcrSummary = BANK_DEFS.map(def => {
    const totalHQLA = round1(jitter(def.baseHQLA, 0.04));
    const netCashOutflows30d = round1(jitter(def.baseNetOutflows30d, 0.05));
    const lcrRatio = round1(jitter(def.baseLCR, 0.03));
    const minimumRequired = 100;
    const buffer = round1(lcrRatio - minimumRequired);

    const trendRoll = rng();
    let trend: string;
    if (trendRoll < 0.35) trend = 'improving';
    else if (trendRoll < 0.75) trend = 'stable';
    else trend = 'deteriorating';

    return {
      bank: def.name,
      ticker: def.ticker,
      totalHQLA,
      netCashOutflows30d,
      lcrRatio,
      minimumRequired,
      buffer,
      trend,
    };
  });

  // 2. HQLA Breakdown
  const aggregateHQLA = lcrSummary.reduce((s, b) => s + b.totalHQLA, 0);
  const level1Pct = round1(70 + rng() * 10);
  const level2APct = round1((100 - level1Pct) * (0.6 + rng() * 0.15));
  const level2BPct = round1(100 - level1Pct - level2APct);

  const level1Total = round1(aggregateHQLA * level1Pct / 100);
  const level2ATotal = round1(aggregateHQLA * level2APct / 100);
  const level2BTotal = round1(aggregateHQLA * level2BPct / 100);

  // Level 1 sub-components
  const cashPct = 15 + rng() * 10;
  const reservesPct = 25 + rng() * 10;
  const govtBondsPct = 100 - cashPct - reservesPct;
  const cash = round1(level1Total * cashPct / 100);
  const centralBankReserves = round1(level1Total * reservesPct / 100);
  const govtBonds = round1(level1Total * govtBondsPct / 100);

  // Level 2A sub-components
  const agencyMBSPct = 55 + rng() * 15;
  const agencyMBS = round1(level2ATotal * agencyMBSPct / 100);
  const coveredBonds = round1(level2ATotal - agencyMBS);

  // Level 2B sub-components
  const corpBondsPct = 60 + rng() * 15;
  const corpBonds = round1(level2BTotal * corpBondsPct / 100);
  const equity = round1(level2BTotal - corpBonds);

  // Haircuts: Level 1 = 0%, Level 2A = 15%, Level 2B = 25-50% avg ~35%
  const level2AHaircut = 0.15;
  const level2BHaircut = round2(0.25 + rng() * 0.15);
  const totalAfterHaircuts = round1(level1Total + level2ATotal * (1 - level2AHaircut) + level2BTotal * (1 - level2BHaircut));
  const avgHaircut = round1((1 - totalAfterHaircuts / aggregateHQLA) * 100);

  const hqlaBreakdown = {
    level1: {
      cash,
      centralBankReserves,
      governmentBonds: govtBonds,
      total: level1Total,
    },
    level2A: {
      agencyMBS,
      coveredBonds,
      total: level2ATotal,
    },
    level2B: {
      corporateBonds: corpBonds,
      equity,
      total: level2BTotal,
    },
    totalBeforeHaircuts: round1(aggregateHQLA),
    totalAfterHaircuts,
    level1Pct,
    avgHaircut,
  };

  // 3. NSFR Summary
  const nsfrSummary = BANK_DEFS.map(def => {
    const availableStableFunding = round1(jitter(def.baseASF, 0.04));
    const requiredStableFunding = round1(jitter(def.baseRSF, 0.04));
    const nsfrRatio = round1(jitter(def.baseNSFR, 0.03));
    const surplus = round1(availableStableFunding - requiredStableFunding);

    return {
      bank: def.name,
      ticker: def.ticker,
      availableStableFunding,
      requiredStableFunding,
      nsfrRatio,
      surplus,
    };
  });

  // 4. Cash Flow Ladder
  let cumulativeNet = 0;
  const cashFlowLadder = MATURITY_BUCKETS.map(bucket => {
    const inflows = round1(jitter(bucket.baseInflow, 0.08));
    const outflows = round1(jitter(bucket.baseOutflow, 0.08));
    const netPosition = round1(inflows - outflows);
    cumulativeNet = round1(cumulativeNet + netPosition);
    // Stressed net applies a 25-40% haircut on inflows
    const stressHaircut = 0.25 + rng() * 0.15;
    const stressedInflows = round1(inflows * (1 - stressHaircut));
    const stressedNet = round1(stressedInflows - outflows);

    return {
      bucket: bucket.label,
      inflows,
      outflows,
      netPosition,
      cumulativeNet,
      stressedNet,
    };
  });

  return {
    lcrSummary,
    hqlaBreakdown,
    nsfrSummary,
    cashFlowLadder,
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
    console.error('[LiquidityCoverage] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate liquidity coverage data' });
  }
});

export default router;
