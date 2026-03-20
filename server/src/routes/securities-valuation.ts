import { Router } from 'express';

const router = Router();

// -- Seeded PRNG --

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Static Data --

const SECURITY_NAMES = [
  { name: 'Goldman Sachs 4.25% 2029', cusip: '38141GXZ2', isin: 'US38141GXZ26', assetType: 'corporate bond' },
  { name: 'Apple Inc 3.85% 2028', cusip: '037833DX3', isin: 'US037833DX31', assetType: 'corporate bond' },
  { name: 'FNMA Pool MA4892', cusip: '31418EHV7', isin: 'US31418EHV76', assetType: 'MBS' },
  { name: 'JPMorgan Chase 5.10% 2033', cusip: '46647PEB5', isin: 'US46647PEB59', assetType: 'corporate bond' },
  { name: 'NYC GO 5.00% 2031', cusip: '64966QKB8', isin: 'US64966QKB85', assetType: 'muni' },
  { name: 'FHLMC Gold PC K751', cusip: '3137H3AA9', isin: 'US3137H3AA92', assetType: 'MBS' },
  { name: 'Ford Motor Credit 6.05% 2026', cusip: '345397C67', isin: 'US345397C671', assetType: 'corporate bond' },
  { name: 'Verizon 4.50% 2033', cusip: '92343VGH6', isin: 'US92343VGH69', assetType: 'corporate bond' },
  { name: 'CarMax Auto Trust 2024-1 A3', cusip: '14318DAC5', isin: 'US14318DAC56', assetType: 'ABS' },
  { name: 'California GO 4.75% 2032', cusip: '13063DUZ8', isin: 'US13063DUZ83', assetType: 'muni' },
  { name: 'Morgan Stanley 5.30% 2030', cusip: '61747YFG4', isin: 'US61747YFG47', assetType: 'corporate bond' },
  { name: 'GNMA II Pool MA9215', cusip: '21H0426A8', isin: 'US21H0426A82', assetType: 'MBS' },
  { name: 'BofA Structured Note 2027-3', cusip: '06054KAB2', isin: 'US06054KAB25', assetType: 'structured note' },
  { name: 'Discover Card Trust 2024-A2', cusip: '254683DA1', isin: 'US254683DA13', assetType: 'ABS' },
  { name: 'Texas GO 5.25% 2034', cusip: '882724ZB3', isin: 'US882724ZB34', assetType: 'muni' },
  { name: 'Citi Term Loan B 2028', cusip: '17312QAG8', isin: 'US17312QAG83', assetType: 'loan' },
  { name: 'Microsoft 3.50% 2035', cusip: '594918CE7', isin: 'US594918CE72', assetType: 'corporate bond' },
  { name: 'Wells Fargo CLN 2026-5', cusip: '94988JAP4', isin: 'US94988JAP48', assetType: 'structured note' },
  { name: 'T-Mobile Revolver TL 2029', cusip: '87264ACE6', isin: 'US87264ACE63', assetType: 'loan' },
  { name: 'SoFi Consumer Loan 2024-2 B', cusip: '78472RAB3', isin: 'US78472RAB33', assetType: 'ABS' },
] as const;

const VALUATION_SOURCES = ['traded', 'quoted', 'model', 'matrix'] as const;

const METHODOLOGY_INPUTS = [
  'comparable trades',
  'broker quotes',
  'curve-based interpolation',
  'credit spread model',
  'matrix pricing',
  'dealer runs',
] as const;

// -- Helpers --

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

// -- Generator --

function generate() {
  const rng = seededRandom('-securities-valuation');

  // 1. Valuation Summary (20 securities)

  const valuationSummary = SECURITY_NAMES.map((sec) => {
    const midPrice = round(rangef(85, 112, rng), 4);
    const spreadHalf = round(rangef(0.05, 0.80, rng), 4);
    const bid = round(midPrice - spreadHalf, 4);
    const ask = round(midPrice + spreadHalf, 4);
    const confidence = Math.floor(rangef(1, 11, rng));
    const source = pick(VALUATION_SOURCES, rng);
    const staleness = round(rangef(0.5, 72, rng), 1);
    const lastTradePrice = round(midPrice * (1 + (rng() - 0.5) * 0.04), 4);
    const bvalVsLastTradeDelta = round(midPrice - lastTradePrice, 4);

    return {
      cusip: sec.cusip,
      isin: sec.isin,
      name: sec.name,
      assetType: sec.assetType,
      bvalMidPrice: midPrice,
      bid,
      ask,
      confidenceScore: confidence,
      valuationSource: source,
      stalenessHours: staleness,
      lastTradePrice,
      bvalVsLastTradeDelta,
    };
  });

  // 2. Fair Value Hierarchy

  const level1Count = Math.floor(rangef(3, 7, rng));
  const level3Count = Math.floor(rangef(2, 5, rng));
  const level2Count = 20 - level1Count - level3Count;
  const total = 20;

  const fairValueHierarchy = {
    level1: {
      label: 'Level 1 (Mark-to-Market)',
      count: level1Count,
      percentage: round((level1Count / total) * 100, 1),
    },
    level2: {
      label: 'Level 2 (Observable Inputs)',
      count: level2Count,
      percentage: round((level2Count / total) * 100, 1),
    },
    level3: {
      label: 'Level 3 (Model-Based)',
      count: level3Count,
      percentage: round((level3Count / total) * 100, 1),
    },
  };

  // 3. Price Challenge Queue (5 securities with >50bps internal vs BVAL diff)

  const challengeStatuses = ['pending', 'accepted', 'rejected'] as const;

  const challengeIndices: number[] = [];
  const used = new Set<number>();
  while (challengeIndices.length < 5) {
    const idx = Math.floor(rng() * 20);
    if (!used.has(idx)) {
      used.add(idx);
      challengeIndices.push(idx);
    }
  }

  const priceChallengeQueue = challengeIndices.map((idx) => {
    const sec = valuationSummary[idx];
    // Internal price differs from BVAL by >50bps (0.50%)
    const direction = rng() > 0.5 ? 1 : -1;
    const diffBps = round(rangef(55, 250, rng), 1);
    const internalPrice = round(sec.bvalMidPrice * (1 + direction * diffBps / 10000), 4);
    const difference = round(internalPrice - sec.bvalMidPrice, 4);
    const status = pick(challengeStatuses, rng);

    return {
      cusip: sec.cusip,
      name: sec.name,
      internalPrice,
      bvalPrice: sec.bvalMidPrice,
      differencePx: difference,
      differenceBps: round(direction * diffBps, 1),
      challengeStatus: status,
    };
  });

  // 4. Valuation Methodology (5 sample bonds)

  const methodologyIndices: number[] = [];
  const usedMethod = new Set<number>();
  while (methodologyIndices.length < 5) {
    const idx = Math.floor(rng() * 20);
    if (!usedMethod.has(idx)) {
      usedMethod.add(idx);
      methodologyIndices.push(idx);
    }
  }

  const valuationMethodology = methodologyIndices.map((idx) => {
    const sec = valuationSummary[idx];
    // Pick 2-4 inputs used
    const numInputs = Math.floor(rangef(2, 5, rng));
    const inputsUsed: string[] = [];
    const inputPool = [...METHODOLOGY_INPUTS];
    for (let j = 0; j < numInputs && inputPool.length > 0; j++) {
      const pIdx = Math.floor(rng() * inputPool.length);
      inputsUsed.push(inputPool[pIdx]);
      inputPool.splice(pIdx, 1);
    }

    const dataPoints = Math.floor(rangef(3, 45, rng));
    const ciLow = round(sec.bvalMidPrice * (1 - rangef(0.005, 0.025, rng)), 4);
    const ciHigh = round(sec.bvalMidPrice * (1 + rangef(0.005, 0.025, rng)), 4);

    // Last updated: 0.5 to 48 hours ago
    const hoursAgo = round(rangef(0.5, 48, rng), 1);
    const lastUpdated = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();

    return {
      cusip: sec.cusip,
      name: sec.name,
      inputsUsed,
      dataPoints,
      confidenceInterval: { low: ciLow, high: ciHigh },
      lastUpdated,
    };
  });

  // 5. Stale Pricing Alerts (8 securities with prices older than 24h)

  const staleIndices: number[] = [];
  const usedStale = new Set<number>();
  while (staleIndices.length < 8) {
    const idx = Math.floor(rng() * 20);
    if (!usedStale.has(idx)) {
      usedStale.add(idx);
      staleIndices.push(idx);
    }
  }

  const stalePricingAlerts = staleIndices.map((idx) => {
    const sec = valuationSummary[idx];
    const stalenessHours = round(rangef(24.5, 168, rng), 1);
    const lastKnownPrice = round(sec.bvalMidPrice * (1 + (rng() - 0.5) * 0.03), 4);
    const estimatedLow = round(lastKnownPrice * (1 - rangef(0.005, 0.03, rng)), 4);
    const estimatedHigh = round(lastKnownPrice * (1 + rangef(0.005, 0.03, rng)), 4);

    return {
      cusip: sec.cusip,
      name: sec.name,
      assetType: sec.assetType,
      stalenessHours,
      lastKnownPrice,
      estimatedCurrentRange: { low: estimatedLow, high: estimatedHigh },
    };
  });

  // 6. Portfolio Valuation Stats

  const totalConfidence = valuationSummary.reduce((s, v) => s + v.confidenceScore, 0);
  const weightedAvgConfidence = round(totalConfidence / valuationSummary.length, 2);
  const level1Pct = fairValueHierarchy.level1.percentage;
  const avgStaleness = round(
    valuationSummary.reduce((s, v) => s + v.stalenessHours, 0) / valuationSummary.length,
    1,
  );
  const totalChallengedPositions = priceChallengeQueue.length;

  const portfolioValuationStats = {
    weightedAvgConfidenceScore: weightedAvgConfidence,
    pctLevel1Pricing: level1Pct,
    avgStalenessHours: avgStaleness,
    totalChallengedPositions,
  };

  return {
    valuationSummary,
    fairValueHierarchy,
    priceChallengeQueue,
    valuationMethodology,
    stalePricingAlerts,
    portfolioValuationStats,
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
    console.error('[SecuritiesValuation] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate securities valuation data' });
  }
});

export default router;
