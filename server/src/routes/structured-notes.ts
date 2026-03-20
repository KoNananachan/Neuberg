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

const ISSUERS = ['JPMorgan', 'Goldman Sachs', 'BofA', 'Citi', 'Morgan Stanley'] as const;

const NOTE_TYPES = [
  'Autocallable', 'Range Accrual', 'Worst-Of', 'Barrier Reverse Convertible', 'Phoenix',
] as const;

const UNDERLYINGS = [
  { name: 'S&P 500', ticker: 'SPX', spotBase: 5280 },
  { name: 'EuroStoxx 50', ticker: 'SX5E', spotBase: 4950 },
  { name: 'AAPL', ticker: 'AAPL', spotBase: 218 },
  { name: 'NVDA', ticker: 'NVDA', spotBase: 875 },
  { name: 'Nikkei 225', ticker: 'NKY', spotBase: 38500 },
  { name: 'MSFT', ticker: 'MSFT', spotBase: 420 },
  { name: 'TSLA', ticker: 'TSLA', spotBase: 245 },
  { name: 'FTSE 100', ticker: 'UKX', spotBase: 8250 },
  { name: 'DAX', ticker: 'DAX', spotBase: 18200 },
  { name: 'AMZN', ticker: 'AMZN', spotBase: 192 },
] as const;

const KNOCK_IN_TYPES = ['European', 'American'] as const;

const STATUSES = ['live', 'called', 'breached', 'matured'] as const;

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
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
  const rng = mulberry32(hashSeed(day + '-structured-notes'));
  const currentYear = now.getFullYear();

  // ── 1. Active Notes (10) ──

  const activeNotes = Array.from({ length: 10 }, (_, i) => {
    const issuer = ISSUERS[i % ISSUERS.length];
    const type = NOTE_TYPES[i % NOTE_TYPES.length];
    const underlying = UNDERLYINGS[i % UNDERLYINGS.length];

    const notional = Math.round(rangef(15, 200, rng));
    const coupon = round(rangef(6, 15, rng), 2);
    const barrierLevel = round(rangef(55, 75, rng), 1);
    const autocallLevel = round(rangef(100, 110, rng), 1);

    // Current level relative to initial (as % of initial)
    const currentLevel = round(rangef(78, 118, rng), 2);
    const distanceToBarrier = round(currentLevel - barrierLevel, 2);

    // Maturity 3-24 months out
    const maturityMonths = Math.floor(rangef(3, 24, rng));
    const nextObsDate = new Date(now);
    nextObsDate.setMonth(nextObsDate.getMonth() + Math.floor(rangef(1, 4, rng)));
    const nextObservation = nextObsDate.toISOString().slice(0, 10);

    // Note ID
    const noteId = `SN-${currentYear}-${String(i + 1).padStart(3, '0')}`;

    // Status determination
    let status: string;
    if (currentLevel <= barrierLevel) {
      status = 'breached';
    } else if (currentLevel >= autocallLevel && rng() < 0.3) {
      status = 'called';
    } else if (rng() < 0.08) {
      status = 'matured';
    } else {
      status = 'live';
    }

    return {
      noteId,
      issuer,
      type,
      underlying: underlying.name,
      notional,
      coupon,
      barrierLevel,
      currentLevel,
      distanceToBarrier,
      autocallLevel,
      nextObservation,
      status,
    };
  });

  // ── 2. Barrier Monitoring (8) ──

  const barrierMonitoring = Array.from({ length: 8 }, (_, i) => {
    const underlying = UNDERLYINGS[i % UNDERLYINGS.length];
    const currentSpot = round(jitter(underlying.spotBase, 0.06, rng), 2);
    const barrierPct = round(rangef(55, 75, rng), 1);
    const barrierLevel = round(underlying.spotBase * (barrierPct / 100), 2);
    const knockInType = pick(KNOCK_IN_TYPES, rng);
    const distancePct = round(((currentSpot - barrierLevel) / currentSpot) * 100, 2);

    // Breach probability: higher when closer to barrier
    let breachProbability: number;
    if (distancePct < 10) {
      breachProbability = round(rangef(25, 55, rng), 1);
    } else if (distancePct < 20) {
      breachProbability = round(rangef(8, 25, rng), 1);
    } else {
      breachProbability = round(rangef(1, 8, rng), 1);
    }

    const daysToMaturity = Math.round(rangef(30, 540, rng));
    const timeDecay = round(rangef(0.2, 3.5, rng), 2);

    return {
      underlying: underlying.name,
      currentSpot,
      barrierLevel,
      knockInType,
      distancePct,
      breachProbability,
      daysToMaturity,
      timeDecay,
    };
  });

  // ── 3. Issuance Pipeline (5) ──

  const issuancePipeline = Array.from({ length: 5 }, (_, i) => {
    const issuer = ISSUERS[i % ISSUERS.length];
    const type = pick(NOTE_TYPES, rng);
    const underlying = pick(UNDERLYINGS, rng);
    const indicativeCoupon = round(rangef(7, 14, rng), 2);
    const barrierPct = round(rangef(55, 75, rng), 1);
    const tenor = Math.round(rangef(6, 36, rng));
    const size = Math.round(rangef(25, 300, rng));

    // Launch dates spread over the next 4 weeks
    const launchDate = new Date(now);
    launchDate.setDate(launchDate.getDate() + Math.floor(rangef(2, 28, rng)));
    const launch = launchDate.toISOString().slice(0, 10);

    return {
      issuer,
      type,
      underlying: underlying.name,
      indicativeCoupon,
      barrierPct,
      tenor,
      launchDate: launch,
      size,
    };
  });

  // ── 4. Performance Summary ──

  const liveNotes = activeNotes.filter(n => n.status === 'live');
  const calledNotes = activeNotes.filter(n => n.status === 'called');
  const breachedNotes = activeNotes.filter(n => n.status === 'breached');

  const ytdReturn = round(rangef(3.5, 9.2, rng), 2);
  const avgCouponPaid = round(
    liveNotes.length > 0
      ? liveNotes.reduce((s, n) => s + n.coupon, 0) / liveNotes.length
      : rangef(8, 12, rng),
    2
  );
  const autocallRate = round(
    activeNotes.length > 0
      ? (calledNotes.length / activeNotes.length) * 100
      : rangef(20, 45, rng),
    1
  );
  const barrierBreachRate = round(
    activeNotes.length > 0
      ? (breachedNotes.length / activeNotes.length) * 100
      : rangef(2, 8, rng),
    1
  );
  const avgDistanceToBarrier = round(
    liveNotes.length > 0
      ? liveNotes.reduce((s, n) => s + n.distanceToBarrier, 0) / liveNotes.length
      : rangef(18, 32, rng),
    2
  );
  const totalOutstanding = round(jitter(42.5, 0.1, rng), 1);

  const performanceSummary = {
    ytdReturn,
    avgCouponPaid,
    autocallRate,
    barrierBreachRate,
    avgDistanceToBarrier,
    totalOutstanding,
  };

  return {
    activeNotes,
    barrierMonitoring,
    issuancePipeline,
    performanceSummary,
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
    console.error('[StructuredNotes] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate structured notes data' });
  }
});

export default router;
