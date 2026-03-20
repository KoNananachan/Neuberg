import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Currency pair configurations ──

interface PairConfig {
  pair: string;
  spotRate: number;
  basis3M: number;    // typical 3M basis in bps (negative = USD funding premium)
  basisSlope: number; // how basis changes per tenor step (shorter = wider typically)
  volatility: number;
  notionalBase: number; // base notional outstanding in $B
  avgTenor: string;
}

const PAIR_CONFIGS: PairConfig[] = [
  { pair: 'USD/EUR', spotRate: 1.0850, basis3M: -20, basisSlope: 1.2,  volatility: 3,   notionalBase: 420, avgTenor: '3Y' },
  { pair: 'USD/JPY', spotRate: 149.50, basis3M: -42, basisSlope: 2.0,  volatility: 5,   notionalBase: 380, avgTenor: '5Y' },
  { pair: 'USD/GBP', spotRate: 0.7920, basis3M: -15, basisSlope: 0.8,  volatility: 2.5, notionalBase: 210, avgTenor: '3Y' },
  { pair: 'USD/CHF', spotRate: 0.8780, basis3M: -25, basisSlope: 1.5,  volatility: 3,   notionalBase: 145, avgTenor: '2Y' },
  { pair: 'USD/AUD', spotRate: 1.5350, basis3M: -12, basisSlope: 0.6,  volatility: 2,   notionalBase: 95,  avgTenor: '2Y' },
  { pair: 'USD/CAD', spotRate: 1.3580, basis3M: -8,  basisSlope: 0.4,  volatility: 1.5, notionalBase: 85,  avgTenor: '2Y' },
  { pair: 'EUR/GBP', spotRate: 0.8580, basis3M: -6,  basisSlope: 0.3,  volatility: 1.5, notionalBase: 120, avgTenor: '3Y' },
  { pair: 'EUR/JPY', spotRate: 162.20, basis3M: -35, basisSlope: 1.8,  volatility: 4,   notionalBase: 160, avgTenor: '5Y' },
];

const TENORS = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y'];
const TENOR_INDEX: Record<string, number> = {
  '3M': 0, '6M': 1, '1Y': 2, '2Y': 3, '3Y': 4, '5Y': 5, '7Y': 6, '10Y': 7,
};
const TENOR_YEARS: Record<string, number> = {
  '3M': 0.25, '6M': 0.5, '1Y': 1, '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7, '10Y': 10,
};

const FLOATING_INDICES = ['SOFR', 'EURIBOR', 'TONA', 'SONIA', 'SARON', 'BBSW', 'CORRA'];
const SWAP_PAIRS_FOR_BLOTTER = ['USD/EUR', 'USD/JPY', 'USD/GBP', 'USD/CHF', 'USD/AUD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'USD/EUR', 'USD/JPY', 'USD/GBP', 'USD/EUR'];
const HEDGING_PAIRS = ['USD/EUR', 'USD/JPY', 'USD/GBP'];
const HEDGING_TENORS = ['1Y', '3Y', '5Y'];
let cache: { data: unknown; ts: number } | null = null;

// ── Data generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('cross-currency-swaps-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // ── 1. Currency pairs with basis spreads ──
  const currencyPairs = PAIR_CONFIGS.map(cfg => {
    const spotRate = Math.round(cfg.spotRate * (1 + (rng() - 0.5) * 0.008) * 10000) / 10000;
    const basis3M = Math.round((cfg.basis3M + (rng() - 0.5) * cfg.volatility * 2) * 10) / 10;
    // Shorter tenors have wider (more negative) basis; longer tenors tighten toward zero
    const basis1Y = Math.round((basis3M + cfg.basisSlope * 2 + (rng() - 0.5) * cfg.volatility * 0.8) * 10) / 10;
    const basis5Y = Math.round((basis3M + cfg.basisSlope * 5 + (rng() - 0.5) * cfg.volatility * 0.6) * 10) / 10;
    const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.6 * 10) / 10;
    const notionalOutstanding = Math.round(jitter(cfg.notionalBase, 0.12) * 10) / 10;
    return {
      pair: cfg.pair,
      spotRate,
      basis3M,
      basis1Y,
      basis5Y,
      change1d,
      notionalOutstanding,
      avgTenor: cfg.avgTenor,
    };
  });

  // ── 2. Summary ──
  const totalNotional = Math.round(currencyPairs.reduce((a, p) => a + p.notionalOutstanding, 0) * 10) / 10;
  const avgBasisSpread = Math.round(currencyPairs.reduce((a, p) => a + p.basis3M, 0) / currencyPairs.length * 10) / 10;
  // Most active pair = highest notional outstanding
  const mostActivePair = [...currencyPairs].sort((a, b) => b.notionalOutstanding - a.notionalOutstanding)[0].pair;
  const summary = {
    totalNotionalOutstanding: totalNotional,
    totalNotionalUnit: 'B USD',
    avgBasisSpread,
    avgBasisSpreadUnit: 'bps',
    mostActivePair,
    activeSwaps: 12,
  };

  // ── 3. Term structure (top 4 pairs by notional) ──
  const topPairs = [...currencyPairs].sort((a, b) => b.notionalOutstanding - a.notionalOutstanding).slice(0, 4);
  const termStructure = topPairs.map(pairData => {
    const cfg = PAIR_CONFIGS.find(c => c.pair === pairData.pair)!;
    const points = TENORS.map(tenor => {
      const idx = TENOR_INDEX[tenor];
      // 3M is the base; basis tightens (less negative) as tenor increases
      const baseBasis = pairData.basis3M + cfg.basisSlope * idx;
      const basisSpread = Math.round((baseBasis + (rng() - 0.5) * cfg.volatility * 0.5) * 10) / 10;
      const change1d = Math.round((rng() - 0.5) * cfg.volatility * 0.4 * 10) / 10;
      // Implied rate: USD rate adjusted by basis (representative mid-swap rates)
      const usdBaseRate = 4.30 - idx * 0.08; // SOFR-like declining curve
      const impliedRate = Math.round((usdBaseRate + basisSpread / 100) * 100) / 100;
      return {
        tenor,
        basisSpread,
        change1d,
        impliedRate,
      };
    });
    return {
      pair: pairData.pair,
      points,
    };
  });

  // ── 4. Active swaps (12 swaps) ──
  const activeSwaps = SWAP_PAIRS_FOR_BLOTTER.map((pair, i) => {
    const cfg = PAIR_CONFIGS.find(c => c.pair === pair)!;
    const id = `XCCY-${String(i + 1).padStart(3, '0')}`;
    const notional = Math.round(jitter(150, 0.4));
    const direction = rng() > 0.5 ? 'Pay USD' : 'Receive USD';
    const fixedRate = Math.round((3.0 + rng() * 2.5) * 100) / 100;
    const pairIdx = PAIR_CONFIGS.indexOf(cfg);
    const floatingIndex = FLOATING_INDICES[pairIdx % FLOATING_INDICES.length];
    const tenorIdx = Math.floor(rng() * TENORS.length);
    const tenor = TENORS[tenorIdx];
    const tenorYears = TENOR_YEARS[tenor];

    // Generate maturity date
    const today = new Date();
    const elapsedFraction = rng() * 0.6;
    const totalDays = tenorYears * 365;
    const remainingDays = Math.round(totalDays * (1 - elapsedFraction));
    const maturityDate = new Date(today.getTime() + remainingDays * 86400000);

    // Current MTM: influenced by basis movement and direction
    const basisMove = (rng() - 0.45) * Math.abs(cfg.basis3M) * 0.15;
    const directionSign = direction === 'Pay USD' ? 1 : -1;
    const currentMTM = Math.round(directionSign * basisMove * notional / 100 * 10) / 10;

    // Basis at inception: slightly different from current
    const basisAtInception = Math.round((cfg.basis3M + cfg.basisSlope * tenorIdx + (rng() - 0.5) * cfg.volatility) * 10) / 10;

    return {
      id,
      pair,
      notional,
      notionalUnit: 'M USD',
      direction,
      fixedRate,
      floatingIndex,
      tenor,
      maturity: maturityDate.toISOString().slice(0, 10),
      currentMTM,
      mtmUnit: 'M USD',
      basisAtInception,
      basisAtInceptionUnit: 'bps',
    };
  });

  // ── 5. Hedging cost calculator ──
  const hedgingCosts = HEDGING_PAIRS.map(pair => {
    const cfg = PAIR_CONFIGS.find(c => c.pair === pair)!;
    const pairData = currencyPairs.find(p => p.pair === pair)!;
    const costs = HEDGING_TENORS.map(tenor => {
      const idx = TENOR_INDEX[tenor];
      const basisSpread = pairData.basis3M + cfg.basisSlope * idx + (rng() - 0.5) * cfg.volatility * 0.3;
      const tenorYears = TENOR_YEARS[tenor];
      // Annual cost to hedge $100M: basis spread in bps applied to notional per year
      const annualCostBps = Math.round(Math.abs(basisSpread) * 10) / 10;
      const annualCostUSD = Math.round(100 * Math.abs(basisSpread) / 100 * tenorYears * 10) / 10;
      const totalCostUSD = Math.round(annualCostUSD * 10) / 10;
      return {
        tenor,
        basisSpread: Math.round(basisSpread * 10) / 10,
        basisSpreadUnit: 'bps',
        annualCostBps,
        totalCost: totalCostUSD,
        totalCostUnit: 'M USD',
        hedgeNotional: 100,
        hedgeNotionalUnit: 'M USD',
      };
    });
    return {
      pair,
      spotRate: pairData.spotRate,
      costs,
    };
  });

  return {
    summary,
    currencyPairs,
    termStructure,
    activeSwaps,
    hedgingCosts,
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
    console.error('[CrossCurrencySwaps] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate cross-currency swap data' });
  }
});

export default router;
