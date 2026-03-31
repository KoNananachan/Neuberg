import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();


// ── Types ──

interface BasisSwapTenor {
  pair: string;
  tenor: string;
  basisSpread: number;
  change1D: number;
  change1W: number;
  change1M: number;
  range52W: { low: number; high: number };
}

interface TermStructurePoint {
  tenor: string;
  spread: number;
}

interface TermStructureCurve {
  pair: string;
  points: TermStructurePoint[];
}

interface HistoricalLevel {
  pair: string;
  current: number;
  avg3M: number;
  avg6M: number;
  avg1Y: number;
  percentile: number;
}

interface DollarFunding {
  liborOIS_3M: number;
  crossCurrencyBasis_3M_EUR: number;
  fedFundsVsRepo: number;
  commercialPaperSpread: number;
  dollarFundingStress: 'low' | 'moderate' | 'elevated';
}

interface CentralBankSwapLine {
  counterparty: string;
  utilized: number;
  limit: number;
  rate: number;
  lastDrawDate: string;
}

interface FxForwardEntry {
  pair: string;
  spot: number;
  forward3M: number;
  forward1Y: number;
  impliedRate: number;
  coveredInterestParity_deviation: number;
}

interface Summary {
  avgEURUSDBasis: number;
  avgJPYUSDBasis: number;
  basisTrend: 'tightening' | 'stable' | 'widening';
  dollarStrengthIndicator: number;
  fundingStressIndex: number;
}

interface CrossCurrencyBasisResponse {
  basisSwaps: BasisSwapTenor[];
  termStructure: TermStructureCurve[];
  historicalLevels: HistoricalLevel[];
  dollarFunding: DollarFunding;
  centralBankSwapLines: CentralBankSwapLine[];
  fxForwards: FxForwardEntry[];
  summary: Summary;
  generatedAt: string;
}

// ── Pair configurations ──

interface PairConfig {
  pair: string;
  basis3M: number;       // typical 3M basis in bps (negative = USD funding premium)
  basisSlope: number;    // per-tenor-step widening toward longer maturities
  volatility: number;    // randomness scale in bps
  spot: number;          // typical spot rate (foreign per USD or USD per foreign)
  foreignRate3M: number; // foreign 3M reference rate %
  usdRate3M: number;     // USD 3M reference rate %
}

const PAIR_CONFIGS: PairConfig[] = [
  { pair: 'EUR/USD', basis3M: -18,  basisSlope: -2.0,  volatility: 4,   spot: 1.0850, foreignRate3M: 3.65, usdRate3M: 5.33 },
  { pair: 'GBP/USD', basis3M: -12,  basisSlope: -1.4,  volatility: 3,   spot: 1.2650, foreignRate3M: 5.00, usdRate3M: 5.33 },
  { pair: 'JPY/USD', basis3M: -52,  basisSlope: -3.5,  volatility: 7,   spot: 0.0067, foreignRate3M: 0.10, usdRate3M: 5.33 },
  { pair: 'CHF/USD', basis3M: -24,  basisSlope: -2.2,  volatility: 4,   spot: 1.1300, foreignRate3M: 1.50, usdRate3M: 5.33 },
  { pair: 'AUD/USD', basis3M: -10,  basisSlope: -1.0,  volatility: 2.5, spot: 0.6550, foreignRate3M: 4.35, usdRate3M: 5.33 },
  { pair: 'CAD/USD', basis3M: -6,   basisSlope: -0.6,  volatility: 2,   spot: 0.7400, foreignRate3M: 4.50, usdRate3M: 5.33 },
  { pair: 'SEK/USD', basis3M: -28,  basisSlope: -2.5,  volatility: 5,   spot: 0.0950, foreignRate3M: 3.75, usdRate3M: 5.33 },
  { pair: 'NOK/USD', basis3M: -22,  basisSlope: -2.0,  volatility: 4,   spot: 0.0930, foreignRate3M: 4.25, usdRate3M: 5.33 },
];

const TENORS = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y'] as const;
const TENOR_INDEX: Record<string, number> = {
  '1M': 0, '3M': 1, '6M': 2, '1Y': 3, '2Y': 4, '5Y': 5, '10Y': 6,
};
const TENOR_YEARS: Record<string, number> = {
  '1M': 1 / 12, '3M': 0.25, '6M': 0.5, '1Y': 1, '2Y': 2, '5Y': 5, '10Y': 10,
};

const CENTRAL_BANK_COUNTERPARTIES = ['ECB', 'BOJ', 'BOE', 'SNB', 'BOC', 'RBA'] as const;
let cache: { data: CrossCurrencyBasisResponse | null; ts: number } = { data: null, ts: 0 };

// ── Helpers ──

const round = (v: number, d: number): number => { const f = 10 ** d; return Math.round(v * f) / f; };

// ── Data generation ──

function generate(): CrossCurrencyBasisResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('cross-currency-basis-' + day));

  // ── 1. Basis Swaps ──

  const basisSwaps: BasisSwapTenor[] = [];
  // Store 3M basis per pair for later use
  const basis3MByPair: Record<string, number> = {};

  for (const cfg of PAIR_CONFIGS) {
    // Per-pair daily jitter applied consistently across tenors
    const dailyShift = (rng() - 0.5) * cfg.volatility * 0.6;

    for (const tenor of TENORS) {
      const idx = TENOR_INDEX[tenor];
      // 1M is slightly tighter than 3M; 3M is the anchor; longer tenors widen
      const tenorOffset = idx <= 1
        ? (1 - idx) * cfg.volatility * 0.3   // 1M is slightly less negative than 3M
        : cfg.basisSlope * (idx - 1);         // longer tenors widen (more negative)

      const baseSpread = cfg.basis3M + tenorOffset + dailyShift;
      const noise = (rng() - 0.5) * cfg.volatility * 0.8;
      const basisSpread = round(baseSpread + noise, 1);

      if (tenor === '3M') {
        basis3MByPair[cfg.pair] = basisSpread;
      }

      // Changes
      const change1D = round((rng() - 0.5) * cfg.volatility * 0.5, 1);
      const change1W = round((rng() - 0.5) * cfg.volatility * 1.2, 1);
      const change1M = round((rng() - 0.5) * cfg.volatility * 2.5, 1);

      // 52-week range: wider for more volatile pairs, centered around base
      const rangeHalfWidth = Math.abs(cfg.basis3M) * 0.4 + cfg.volatility * 3;
      const rangeMid = cfg.basis3M + tenorOffset;
      const low = round(rangeMid - rangeHalfWidth * (0.5 + rng() * 0.3), 1);
      const high = round(rangeMid + rangeHalfWidth * (0.3 + rng() * 0.3), 1);

      basisSwaps.push({
        pair: cfg.pair,
        tenor,
        basisSpread,
        change1D,
        change1W,
        change1M,
        range52W: { low: Math.min(low, basisSpread - 2), high: Math.max(high, basisSpread + 2) },
      });
    }
  }

  // ── 2. Term Structure ──

  const termStructure: TermStructureCurve[] = PAIR_CONFIGS.map(cfg => ({
    pair: cfg.pair,
    points: TENORS.map(tenor => {
      const entry = basisSwaps.find(b => b.pair === cfg.pair && b.tenor === tenor)!;
      return { tenor, spread: entry.basisSpread };
    }),
  }));

  // ── 3. Historical Levels (top 4 pairs) ──

  const topPairs = ['EUR/USD', 'JPY/USD', 'GBP/USD', 'CHF/USD'];
  const historicalLevels: HistoricalLevel[] = topPairs.map(pair => {
    const cfg = PAIR_CONFIGS.find(c => c.pair === pair)!;
    const current = basis3MByPair[pair];

    // Historical averages: 3M avg slightly tighter, 6M/1Y progressively tighter
    const avg3M = round(cfg.basis3M + (rng() - 0.5) * cfg.volatility * 1.2, 1);
    const avg6M = round(cfg.basis3M * 0.95 + (rng() - 0.5) * cfg.volatility * 0.8, 1);
    const avg1Y = round(cfg.basis3M * 0.9 + (rng() - 0.5) * cfg.volatility * 0.6, 1);

    // Percentile: where current sits in 1Y distribution (0 = widest, 100 = tightest)
    const rangeWidth = Math.abs(cfg.basis3M) * 0.8 + cfg.volatility * 4;
    const worstLevel = cfg.basis3M - rangeWidth * 0.6;
    const bestLevel = cfg.basis3M + rangeWidth * 0.4;
    const rawPctile = ((current - worstLevel) / (bestLevel - worstLevel)) * 100;
    const percentile = Math.max(0, Math.min(100, Math.round(rawPctile)));

    return { pair, current, avg3M, avg6M, avg1Y, percentile };
  });

  // ── 4. Dollar Funding ──

  const eurBasis3M = basis3MByPair['EUR/USD'];
  const liborOIS_3M = round(8 + (rng() - 0.5) * 6, 1);                     // typically 5-12 bps
  const fedFundsVsRepo = round(-2 + (rng() - 0.5) * 4, 1);                 // typically -4 to 0 bps
  const commercialPaperSpread = round(15 + (rng() - 0.5) * 10, 1);          // typically 10-20 bps

  // Funding stress composite: weighted average of indicators
  const stressScore = (
    Math.abs(eurBasis3M) * 0.4 +
    liborOIS_3M * 0.3 +
    commercialPaperSpread * 0.2 +
    Math.abs(fedFundsVsRepo) * 0.1
  );
  const dollarFundingStress: DollarFunding['dollarFundingStress'] =
    stressScore > 20 ? 'elevated' : stressScore > 12 ? 'moderate' : 'low';

  const dollarFunding: DollarFunding = {
    liborOIS_3M,
    crossCurrencyBasis_3M_EUR: eurBasis3M,
    fedFundsVsRepo,
    commercialPaperSpread,
    dollarFundingStress,
  };

  // ── 5. Central Bank Swap Lines ──

  const swapLineLimits: Record<string, number> = {
    ECB: 50, BOJ: 40, BOE: 30, SNB: 25, BOC: 20, RBA: 15,
  };
  const swapLineRates: Record<string, number> = {
    ECB: 3.58, BOJ: 3.58, BOE: 3.58, SNB: 3.58, BOC: 3.58, RBA: 3.58,
  };

  const centralBankSwapLines: CentralBankSwapLine[] = CENTRAL_BANK_COUNTERPARTIES.map(cb => {
    const limit = swapLineLimits[cb];
    // Utilization is typically low unless stress; correlate with funding stress
    const utilizationRate = dollarFundingStress === 'elevated'
      ? 0.05 + rng() * 0.15
      : dollarFundingStress === 'moderate'
        ? 0.01 + rng() * 0.05
        : rng() * 0.02;
    const utilized = round(limit * utilizationRate, 1);
    const rate = round(swapLineRates[cb] + (rng() - 0.5) * 0.1, 2);

    // Last draw date: recent if stress, older if calm
    const daysAgo = dollarFundingStress === 'elevated'
      ? Math.floor(rng() * 14)
      : Math.floor(30 + rng() * 180);
    const drawDate = new Date();
    drawDate.setDate(drawDate.getDate() - daysAgo);
    const lastDrawDate = drawDate.toISOString().slice(0, 10);

    return { counterparty: cb, utilized, limit, rate, lastDrawDate };
  });

  // ── 6. FX Forwards ──

  const fxForwards: FxForwardEntry[] = PAIR_CONFIGS.map(cfg => {
    const spot = round(cfg.spot * (1 + (rng() - 0.5) * 0.008), 4);
    const rateDiff3M = (cfg.foreignRate3M - cfg.usdRate3M) / 100;
    const rateDiff1Y = rateDiff3M * 0.95; // slight convergence at 1Y

    // Forward = spot * (1 + foreign_rate * t) / (1 + usd_rate * t) approximately
    const forward3M = round(spot * (1 + rateDiff3M * 0.25) + (rng() - 0.5) * spot * 0.001, 4);
    const forward1Y = round(spot * (1 + rateDiff1Y * 1.0) + (rng() - 0.5) * spot * 0.002, 4);

    // Implied rate from forward: (forward/spot - 1) / t * 100, annualized from 3M
    const impliedRate = round(((forward3M / spot - 1) / 0.25) * 100, 2);

    // CIP deviation: the basis swap spread IS the CIP deviation
    // In theory, CIP holds and deviation = 0; in practice it's the xccy basis
    const pairBasis = basis3MByPair[cfg.pair];
    const cipDeviation = round(pairBasis + (rng() - 0.5) * 1.5, 1);

    return {
      pair: cfg.pair,
      spot,
      forward3M,
      forward1Y,
      impliedRate,
      coveredInterestParity_deviation: cipDeviation,
    };
  });

  // ── 7. Summary ──

  const avgEURUSDBasis = round(
    basisSwaps
      .filter(b => b.pair === 'EUR/USD')
      .reduce((s, b) => s + b.basisSpread, 0) / TENORS.length,
    1,
  );
  const avgJPYUSDBasis = round(
    basisSwaps
      .filter(b => b.pair === 'JPY/USD')
      .reduce((s, b) => s + b.basisSpread, 0) / TENORS.length,
    1,
  );

  // Basis trend: compare current 3M EUR basis to its historical avg
  const eurHist = historicalLevels.find(h => h.pair === 'EUR/USD')!;
  const basisTrend: Summary['basisTrend'] =
    eurBasis3M < eurHist.avg3M - 3 ? 'widening' :
    eurBasis3M > eurHist.avg3M + 3 ? 'tightening' :
    'stable';

  // Dollar strength: 0-100 index, higher = stronger USD funding demand
  const allBasis3M = PAIR_CONFIGS.map(c => basis3MByPair[c.pair]);
  const avgAllBasis = allBasis3M.reduce((s, v) => s + v, 0) / allBasis3M.length;
  const dollarStrengthIndicator = round(Math.max(0, Math.min(100, -avgAllBasis * 1.5)), 1);

  // Funding stress index: 0-100
  const fundingStressIndex = round(Math.max(0, Math.min(100,
    Math.abs(avgAllBasis) * 0.5 + liborOIS_3M * 1.2 + commercialPaperSpread * 0.3,
  )), 1);

  const summary: Summary = {
    avgEURUSDBasis,
    avgJPYUSDBasis,
    basisTrend,
    dollarStrengthIndicator,
    fundingStressIndex,
  };

  return {
    basisSwaps,
    termStructure,
    historicalLevels,
    dollarFunding,
    centralBankSwapLines,
    fxForwards,
    summary,
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
    console.error('[CrossCurrencyBasis] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate cross-currency basis data' });
  }
});

export default router;
