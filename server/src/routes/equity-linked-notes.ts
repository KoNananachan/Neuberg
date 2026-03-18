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

// -- Static Data --

const UNDERLYINGS = [
  { symbol: 'AAPL', priceBase: 218 },
  { symbol: 'TSLA', priceBase: 245 },
  { symbol: 'NVDA', priceBase: 875 },
  { symbol: 'AMZN', priceBase: 192 },
  { symbol: 'MSFT', priceBase: 420 },
  { symbol: 'META', priceBase: 505 },
  { symbol: 'GOOGL', priceBase: 175 },
  { symbol: 'SPX', priceBase: 5280 },
  { symbol: 'QQQ', priceBase: 460 },
  { symbol: 'AMD', priceBase: 165 },
  { symbol: 'NFLX', priceBase: 630 },
  { symbol: 'JPM', priceBase: 198 },
] as const;

const ISSUERS = ['GS', 'JPM', 'MS', 'Citi', 'BofA', 'UBS'] as const;

const STATUSES = ['Performing', 'At Risk', 'Breached', 'Matured', 'Called'] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Helpers --

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

// -- Generator --

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-equity-linked-notes'));
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Generate 15 equity-linked notes
  const notes = Array.from({ length: 15 }, (_, i) => {
    const underlying = UNDERLYINGS[i % UNDERLYINGS.length];
    const issuer = ISSUERS[i % ISSUERS.length];

    // Coupon: 6-15%
    const coupon = round(rangef(6, 15, rng), 1);

    // Strike price: current underlying price at issuance (slight variation)
    const initialPrice = round(jitter(underlying.priceBase, 0.05, rng), 2);
    const strikePrice = round(initialPrice, 2);

    // Barrier: 60-80% of strike
    const barrierPct = round(rangef(60, 80, rng), 1);
    const barrierPrice = round(strikePrice * (barrierPct / 100), 2);

    // Current underlying price
    const currentUnderlying = round(jitter(underlying.priceBase, 0.08, rng), 2);

    // Distance to barrier
    const distToBarrier = round(((currentUnderlying - barrierPrice) / currentUnderlying) * 100, 1);

    // Maturity: 3-18 months out
    const maturityMonths = Math.floor(rangef(3, 18, rng));
    const maturityDate = new Date(now);
    maturityDate.setMonth(maturityDate.getMonth() + maturityMonths);
    const matMonthIdx = maturityDate.getMonth();
    const matYear = maturityDate.getFullYear() % 100;
    const maturity = maturityDate.toISOString().slice(0, 10);

    // Notional in $M
    const notional = Math.round(rangef(5, 100, rng));

    // Indicative value as % of par
    let indicativeValue: number;
    if (distToBarrier < 5) {
      indicativeValue = round(rangef(70, 88, rng), 2);
    } else if (distToBarrier < 15) {
      indicativeValue = round(rangef(88, 98, rng), 2);
    } else {
      indicativeValue = round(rangef(96, 103, rng), 2);
    }

    // Status
    let status: string;
    const isMatured = maturityDate < now;
    if (isMatured) {
      status = 'Matured';
    } else if (distToBarrier <= 0) {
      status = 'Breached';
    } else if (distToBarrier < 10) {
      status = rng() < 0.7 ? 'At Risk' : 'Performing';
    } else if (rng() < 0.12) {
      status = 'Called';
    } else {
      status = 'Performing';
    }

    // Name: e.g. "AAPL 8.5% ELN Mar26"
    const name = `${underlying.symbol} ${coupon}% ELN ${MONTHS[matMonthIdx]}${matYear}`;

    return {
      name,
      underlying: underlying.symbol,
      issuer,
      coupon,
      strikePrice,
      barrierPrice,
      barrierPct,
      currentUnderlying,
      distToBarrier,
      maturity,
      notional,
      indicativeValue,
      status,
    };
  });

  // Summary
  const atRiskCount = notes.filter(n => n.status === 'At Risk' || n.status === 'Breached').length;
  const summary = {
    totalOutstanding: round(jitter(48, 0.1, rng), 1),
    totalOutstandingUnit: 'B USD',
    newIssuanceYTD: round(jitter(12.5, 0.15, rng), 1),
    newIssuanceYTDUnit: 'B USD',
    avgYield: round(notes.reduce((s, n) => s + n.coupon, 0) / notes.length, 2),
    avgYieldUnit: '%',
    avgBarrier: round(notes.reduce((s, n) => s + n.barrierPct, 0) / notes.length, 1),
    avgBarrierUnit: '%',
    atRiskCount,
  };

  // Underlying watch (8 underlyings)
  const watchSymbols = UNDERLYINGS.slice(0, 8);
  const underlyingWatch = watchSymbols.map(u => {
    const currentPrice = round(jitter(u.priceBase, 0.06, rng), 2);
    const change1d = round((rng() - 0.48) * 5, 2);
    const change1m = round((rng() - 0.45) * 14, 2);
    const linkedNotes = notes.filter(n => n.underlying === u.symbol);
    const linkedCount = linkedNotes.length || Math.floor(rangef(2, 8, rng));
    const avgDist = linkedNotes.length > 0
      ? round(linkedNotes.reduce((s, n) => s + n.distToBarrier, 0) / linkedNotes.length, 1)
      : round(rangef(15, 40, rng), 1);
    const worstNote = linkedNotes.length > 0
      ? linkedNotes.reduce((w, n) => n.distToBarrier < w.distToBarrier ? n : w).name
      : `${u.symbol} ${round(rangef(7, 12, rng), 1)}% ELN ${MONTHS[Math.floor(rng() * 12)]}${currentYear % 100 + 1}`;

    return {
      symbol: u.symbol,
      currentPrice,
      change1d,
      change1dUnit: '%',
      change1m,
      change1mUnit: '%',
      linkedNotes: linkedCount,
      avgDistToBarrier: avgDist,
      avgDistToBarrierUnit: '%',
      worstCaseNote: worstNote,
    };
  });

  // Issuance flow (6 months)
  const issuanceFlow = Array.from({ length: 6 }, (_, i) => {
    const monthOffset = 5 - i;
    const flowDate = new Date(now);
    flowDate.setMonth(flowDate.getMonth() - monthOffset);
    const monthLabel = `${MONTHS[flowDate.getMonth()]} ${flowDate.getFullYear()}`;
    const count = Math.round(rangef(40, 120, rng));
    const totalNotional = Math.round(rangef(800, 3500, rng));
    const avgCoupon = round(rangef(7, 12, rng), 2);
    const avgBarrier = round(rangef(62, 78, rng), 1);

    return {
      month: monthLabel,
      count,
      totalNotional,
      totalNotionalUnit: 'M USD',
      avgCoupon,
      avgCouponUnit: '%',
      avgBarrier,
      avgBarrierUnit: '%',
    };
  });

  // Risk matrix (top 8 notes by notional)
  const top8 = [...notes].sort((a, b) => b.notional - a.notional).slice(0, 8);
  const riskMatrix = top8.map(n => {
    const daysToMaturity = Math.max(0, Math.round((new Date(n.maturity).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const delta = round(-rangef(0.3, 0.9, rng), 4);
    const gamma = round(rangef(0.001, 0.02, rng), 4);
    const vega = round(rangef(0.05, 0.35, rng), 4);

    let barrierRisk: string;
    if (n.distToBarrier < 10) {
      barrierRisk = 'High';
    } else if (n.distToBarrier < 25) {
      barrierRisk = 'Medium';
    } else {
      barrierRisk = 'Low';
    }

    return {
      name: n.name,
      delta,
      gamma,
      vega,
      barrierRisk,
      daysToMaturity,
    };
  });

  return {
    summary,
    notes,
    underlyingWatch,
    issuanceFlow,
    riskMatrix,
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
    console.error('[EquityLinkedNotes] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity-linked notes data' });
  }
});

export default router;
