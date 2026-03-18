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
function seededRandom(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

// ── Types ──

interface ForwardTenor {
  tenor: string;
  days: number;
  forwardPointsBid: number;
  forwardPointsAsk: number;
  forwardPointsMid: number;
  outrightBid: number;
  outrightAsk: number;
  outrightMid: number;
}

interface MajorPairForward {
  pair: string;
  spotBid: number;
  spotAsk: number;
  spotMid: number;
  pipFactor: number;
  tenors: ForwardTenor[];
}

interface ImpliedRateDifferential {
  pair: string;
  tenor: string;
  impliedDiffBps: number;
  baseRate: number;
  quoteRate: number;
  impliedBaseRate: number;
}

interface CarryAnalytic {
  pair: string;
  tenor: string;
  carryReturnAnnualized: number;
  spotReturn1M: number;
  totalReturn1M: number;
  rolldownBps: number;
}

interface NdfEntry {
  pair: string;
  spotRate: number;
  tenors: {
    tenor: string;
    ndfRate: number;
    deliverableRate: number;
    ndfSpread: number;
    forwardPoints: number;
  }[];
}

interface SwapPointCurve {
  pair: string;
  points: {
    tenor: string;
    bid: number;
    ask: number;
    mid: number;
    spread: number;
  }[];
}

interface FxForwardResponse {
  majorPairsForward: MajorPairForward[];
  crossRatesForward: MajorPairForward[];
  impliedRateDifferentials: ImpliedRateDifferential[];
  carryTradeAnalytics: CarryAnalytic[];
  ndfRates: NdfEntry[];
  swapPointCurves: SwapPointCurve[];
  generatedAt: string;
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: FxForwardResponse; ts: number } | null = null;

// ── Static configs ──

const TENORS = [
  { label: 'O/N', days: 1 },
  { label: 'T/N', days: 2 },
  { label: 'S/N', days: 3 },
  { label: '1W', days: 7 },
  { label: '2W', days: 14 },
  { label: '1M', days: 30 },
  { label: '2M', days: 60 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '9M', days: 270 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: '3Y', days: 1095 },
  { label: '5Y', days: 1825 },
];

// Policy / benchmark rates (approx 2024 levels)
const RATES: Record<string, number> = {
  USD: 5.375, EUR: 4.50, GBP: 5.25, JPY: 0.10, CHF: 1.75,
  AUD: 4.35, NZD: 5.50, CAD: 5.00,
  CNH: 3.45, INR: 6.50, KRW: 3.50, BRL: 10.50, MXN: 11.25,
};

interface PairConfig {
  pair: string;
  base: string;
  quote: string;
  spotMid: number;
  spotSpread: number; // half-spread in pips
  pipFactor: number;  // 10000 for most, 100 for JPY pairs
}

const MAJOR_PAIRS: PairConfig[] = [
  { pair: 'EUR/USD', base: 'EUR', quote: 'USD', spotMid: 1.0885, spotSpread: 0.5, pipFactor: 10000 },
  { pair: 'GBP/USD', base: 'GBP', quote: 'USD', spotMid: 1.2720, spotSpread: 0.6, pipFactor: 10000 },
  { pair: 'USD/JPY', base: 'USD', quote: 'JPY', spotMid: 151.50, spotSpread: 0.5, pipFactor: 100 },
  { pair: 'USD/CHF', base: 'USD', quote: 'CHF', spotMid: 0.8810, spotSpread: 0.8, pipFactor: 10000 },
  { pair: 'AUD/USD', base: 'AUD', quote: 'USD', spotMid: 0.6545, spotSpread: 0.6, pipFactor: 10000 },
  { pair: 'USD/CAD', base: 'USD', quote: 'CAD', spotMid: 1.3620, spotSpread: 0.7, pipFactor: 10000 },
  { pair: 'NZD/USD', base: 'NZD', quote: 'USD', spotMid: 0.6085, spotSpread: 0.8, pipFactor: 10000 },
];

const CROSS_PAIRS: PairConfig[] = [
  { pair: 'EUR/GBP', base: 'EUR', quote: 'GBP', spotMid: 0.8558, spotSpread: 0.7, pipFactor: 10000 },
  { pair: 'EUR/JPY', base: 'EUR', quote: 'JPY', spotMid: 164.85, spotSpread: 0.8, pipFactor: 100 },
  { pair: 'GBP/JPY', base: 'GBP', quote: 'JPY', spotMid: 192.65, spotSpread: 1.0, pipFactor: 100 },
  { pair: 'AUD/NZD', base: 'AUD', quote: 'NZD', spotMid: 1.0755, spotSpread: 1.2, pipFactor: 10000 },
];

interface NdfPairConfig {
  pair: string;
  base: string;
  quote: string;
  spotMid: number;
  pipFactor: number;
}

const NDF_PAIRS: NdfPairConfig[] = [
  { pair: 'USD/CNH', base: 'USD', quote: 'CNH', spotMid: 7.2450, pipFactor: 10000 },
  { pair: 'USD/INR', base: 'USD', quote: 'INR', spotMid: 83.35, pipFactor: 100 },
  { pair: 'USD/KRW', base: 'USD', quote: 'KRW', spotMid: 1335.0, pipFactor: 1 },
  { pair: 'USD/BRL', base: 'USD', quote: 'BRL', spotMid: 4.9750, pipFactor: 10000 },
  { pair: 'USD/MXN', base: 'USD', quote: 'MXN', spotMid: 17.15, pipFactor: 10000 },
];

// ── Data generation ──

function computeForwardPoints(
  spotMid: number,
  baseRate: number,
  quoteRate: number,
  days: number,
  pipFactor: number,
  rng: () => number,
): { bid: number; ask: number; mid: number } {
  // Forward points = Spot * (quoteRate - baseRate) * (days/360) / (1 + baseRate/100 * days/360)
  // This is the standard covered interest rate parity formula
  const dayFrac = days / 360;
  const rateDiff = (quoteRate - baseRate) / 100;
  const fwdPointsDecimal = spotMid * rateDiff * dayFrac / (1 + (baseRate / 100) * dayFrac);
  const fwdPointsPips = fwdPointsDecimal * pipFactor;

  // Add small noise scaled by tenor length
  const noise = seededRandom(rng, -0.8, 0.8) * Math.sqrt(days / 30);
  const mid = Math.round((fwdPointsPips + noise) * 100) / 100;

  // Bid-ask spread widens with tenor
  const spreadFactor = 0.3 + (days / 365) * 0.5;
  const halfSpread = Math.round(spreadFactor * 100) / 100;

  return {
    bid: Math.round((mid - halfSpread) * 100) / 100,
    ask: Math.round((mid + halfSpread) * 100) / 100,
    mid,
  };
}

function generatePairForward(cfg: PairConfig, rng: () => number): MajorPairForward {
  const spotJitter = seededRandom(rng, -0.003, 0.003);
  const spotMid = Math.round(cfg.spotMid * (1 + spotJitter) * 100000) / 100000;
  const spreadInPrice = cfg.spotSpread / cfg.pipFactor;
  const spotBid = Math.round((spotMid - spreadInPrice) * 100000) / 100000;
  const spotAsk = Math.round((spotMid + spreadInPrice) * 100000) / 100000;

  const baseRate = RATES[cfg.base] ?? 0;
  const quoteRate = RATES[cfg.quote] ?? 0;

  const tenors: ForwardTenor[] = TENORS.map(t => {
    const pts = computeForwardPoints(spotMid, baseRate, quoteRate, t.days, cfg.pipFactor, rng);

    // Outright = spot + forward points (converting pips back to price)
    const outrightMid = Math.round((spotMid + pts.mid / cfg.pipFactor) * 100000) / 100000;
    const outrightBid = Math.round((spotBid + pts.bid / cfg.pipFactor) * 100000) / 100000;
    const outrightAsk = Math.round((spotAsk + pts.ask / cfg.pipFactor) * 100000) / 100000;

    return {
      tenor: t.label,
      days: t.days,
      forwardPointsBid: pts.bid,
      forwardPointsAsk: pts.ask,
      forwardPointsMid: pts.mid,
      outrightBid,
      outrightAsk,
      outrightMid,
    };
  });

  return {
    pair: cfg.pair,
    spotBid,
    spotAsk,
    spotMid,
    pipFactor: cfg.pipFactor,
    tenors,
  };
}

function generate(): FxForwardResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('fx-forward-' + day));

  // ── 1. Major pairs forward points ──
  const majorPairsForward = MAJOR_PAIRS.map(cfg => generatePairForward(cfg, rng));

  // ── 2. Cross rates forward ──
  const crossRatesForward = CROSS_PAIRS.map(cfg => generatePairForward(cfg, rng));

  // ── 3. Implied interest rate differentials ──
  const allPairs = [...MAJOR_PAIRS, ...CROSS_PAIRS];
  const allForwards = [...majorPairsForward, ...crossRatesForward];
  const diffTenors = ['1M', '3M', '6M', '1Y', '2Y', '5Y'];

  const impliedRateDifferentials: ImpliedRateDifferential[] = [];
  for (let i = 0; i < allPairs.length; i++) {
    const cfg = allPairs[i];
    const fwd = allForwards[i];
    const baseRate = RATES[cfg.base] ?? 0;
    const quoteRate = RATES[cfg.quote] ?? 0;

    for (const tenorLabel of diffTenors) {
      const tenorData = fwd.tenors.find(t => t.tenor === tenorLabel);
      if (!tenorData) continue;

      // Implied rate diff from forward points:
      // F = S * (1 + r_q * T) / (1 + r_b * T)
      // => r_q - r_b ~ (F - S) / (S * T) * 100 (annualized, in %)
      const dayFrac = tenorData.days / 360;
      const impliedDiffPct = dayFrac > 0
        ? ((tenorData.outrightMid - fwd.spotMid) / (fwd.spotMid * dayFrac)) * 100
        : 0;
      const impliedDiffBps = Math.round(impliedDiffPct * 100);

      // Implied base rate = quote rate - implied diff
      const impliedBaseRate = Math.round((quoteRate - impliedDiffPct) * 100) / 100;

      impliedRateDifferentials.push({
        pair: cfg.pair,
        tenor: tenorLabel,
        impliedDiffBps,
        baseRate: Math.round(baseRate * 100) / 100,
        quoteRate: Math.round(quoteRate * 100) / 100,
        impliedBaseRate,
      });
    }
  }

  // ── 4. Carry trade analytics ──
  const carryTenors = ['1M', '3M', '6M', '1Y'];
  const carryTradeAnalytics: CarryAnalytic[] = [];
  for (let i = 0; i < allPairs.length; i++) {
    const cfg = allPairs[i];
    const fwd = allForwards[i];
    const baseRate = RATES[cfg.base] ?? 0;
    const quoteRate = RATES[cfg.quote] ?? 0;

    for (const tenorLabel of carryTenors) {
      const tenorData = fwd.tenors.find(t => t.tenor === tenorLabel);
      if (!tenorData) continue;

      const dayFrac = tenorData.days / 365;
      // Carry = interest rate differential annualized
      const rateDiff = baseRate - quoteRate;
      const carryReturnAnnualized = Math.round(rateDiff * 100) / 100;

      // Spot return: small random for the period
      const spotReturn1M = Math.round(seededRandom(rng, -2.5, 2.5) * 100) / 100;

      // Total return for the period = carry component (prorated) + spot return
      const carryComponent = rateDiff * dayFrac;
      const totalReturn1M = Math.round((carryComponent + spotReturn1M) * 100) / 100;

      // Rolldown: benefit from moving down the forward curve (in bps)
      const rolldownBps = Math.round(seededRandom(rng, -3, 8) * 10) / 10;

      carryTradeAnalytics.push({
        pair: cfg.pair,
        tenor: tenorLabel,
        carryReturnAnnualized,
        spotReturn1M,
        totalReturn1M,
        rolldownBps,
      });
    }
  }

  // ── 5. NDF rates ──
  const ndfTenors = ['1M', '3M', '6M', '1Y', '2Y'];
  const ndfRates: NdfEntry[] = NDF_PAIRS.map(cfg => {
    const spotJitter = seededRandom(rng, -0.004, 0.004);
    const spotRate = Math.round(cfg.spotMid * (1 + spotJitter) * 10000) / 10000;

    const baseRate = RATES[cfg.base] ?? 0;
    const quoteRate = RATES[cfg.quote] ?? 0;

    const tenors = ndfTenors.map(tenorLabel => {
      const tenorDef = TENORS.find(t => t.label === tenorLabel)!;
      const days = tenorDef.days;
      const dayFrac = days / 360;

      // NDF rate based on interest rate differential
      const rateDiff = (quoteRate - baseRate) / 100;
      const ndfRate = Math.round(spotRate * (1 + rateDiff * dayFrac) * 10000) / 10000;

      // Deliverable rate is slightly tighter (less premium)
      const deliverableOffset = seededRandom(rng, 0.0005, 0.003) * (days / 365);
      const deliverableRate = Math.round((ndfRate - deliverableOffset * spotRate) * 10000) / 10000;

      // NDF spread = NDF - deliverable
      const ndfSpread = Math.round((ndfRate - deliverableRate) * 10000) / 10000;

      // Forward points in pips
      const forwardPoints = Math.round((ndfRate - spotRate) * cfg.pipFactor * 100) / 100;

      return {
        tenor: tenorLabel,
        ndfRate,
        deliverableRate,
        ndfSpread,
        forwardPoints,
      };
    });

    return {
      pair: cfg.pair,
      spotRate,
      tenors,
    };
  });

  // ── 6. Swap point curves (bid/ask) ──
  const swapCurvePairs = [...MAJOR_PAIRS, ...CROSS_PAIRS];
  const swapCurveForwards = [...majorPairsForward, ...crossRatesForward];

  const swapPointCurves: SwapPointCurve[] = swapCurvePairs.map((cfg, i) => {
    const fwd = swapCurveForwards[i];

    const points = fwd.tenors.map(t => {
      const spread = Math.round((t.forwardPointsAsk - t.forwardPointsBid) * 100) / 100;
      return {
        tenor: t.tenor,
        bid: t.forwardPointsBid,
        ask: t.forwardPointsAsk,
        mid: t.forwardPointsMid,
        spread,
      };
    });

    return {
      pair: cfg.pair,
      points,
    };
  });

  return {
    majorPairsForward,
    crossRatesForward,
    impliedRateDifferentials,
    carryTradeAnalytics,
    ndfRates,
    swapPointCurves,
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
    console.error('[FxForward] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FX forward data' });
  }
});

export default router;
