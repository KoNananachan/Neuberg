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

// ── Static Data ──

const PRODUCT_TYPES = [
  'Autocallable', 'Autocallable', 'Autocallable', 'Autocallable', 'Autocallable',
  'Reverse Convertible', 'Reverse Convertible',
  'Range Accrual',
  'Barrier Note', 'Barrier Note',
  'Capital Protected',
  'Digital',
] as const;

const UNDERLYINGS = [
  { name: 'SPX', spotBase: 5280 },
  { name: 'EuroStoxx 50', spotBase: 4950 },
  { name: 'Nikkei 225', spotBase: 38500 },
  { name: 'AAPL', spotBase: 218 },
  { name: 'TSLA', spotBase: 245 },
  { name: 'NVDA', spotBase: 875 },
] as const;

const ISSUERS = ['Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'Citi', 'BofA', 'Barclays'] as const;

const NAME_PREFIXES: Record<string, string[]> = {
  'Autocallable': ['Autocallable', 'Phoenix Autocall', 'Snowball Autocall', 'Callable Yield Note'],
  'Reverse Convertible': ['Reverse Convertible', 'Yield Enhancement Note', 'Income Note'],
  'Range Accrual': ['Range Accrual Note', 'Corridor Note'],
  'Barrier Note': ['Barrier Note', 'Knock-In Put Note', 'Protected Barrier Note'],
  'Capital Protected': ['Capital Protected Note', 'Principal Protected Note', 'Buffer Note'],
  'Digital': ['Digital Note', 'Binary Coupon Note', 'Digital Barrier Note'],
};

const TENORS = ['6M', '12M', '18M', '24M', '36M'] as const;
const STATUSES = ['Live', 'Called', 'At Risk', 'Matured'] as const;

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

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

// ── Generator ──

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-structured-products'));
  const currentYear = now.getFullYear();

  // Generate 12 structured products
  const products = Array.from({ length: 12 }, (_, i) => {
    const type = PRODUCT_TYPES[i % PRODUCT_TYPES.length];
    const underlying = UNDERLYINGS[i % UNDERLYINGS.length];
    const issuer = ISSUERS[i % ISSUERS.length];
    const tenor = pick(TENORS, rng);
    const tenorMonths = parseInt(tenor);

    const prefixes = NAME_PREFIXES[type];
    const prefix = pick(prefixes, rng);
    const name = `${underlying.name} ${prefix} ${tenor}`;

    // Coupon depends on product type
    let couponBase: number;
    switch (type) {
      case 'Autocallable': couponBase = rangef(8, 15, rng); break;
      case 'Reverse Convertible': couponBase = rangef(10, 15, rng); break;
      case 'Range Accrual': couponBase = rangef(6, 10, rng); break;
      case 'Barrier Note': couponBase = rangef(7, 12, rng); break;
      case 'Capital Protected': couponBase = rangef(3, 6, rng); break;
      case 'Digital': couponBase = rangef(8, 14, rng); break;
      default: couponBase = rangef(6, 12, rng);
    }
    const coupon = round(couponBase, 2);

    // Barrier level: typically 60-75% of spot
    const barrierLevel = round(rangef(60, 75, rng), 1);

    // Knock-in level: at or slightly below barrier
    const knockInLevel = round(barrierLevel - rangef(0, 5, rng), 1);

    // Maturity date
    const maturityDate = new Date(now);
    maturityDate.setMonth(maturityDate.getMonth() + tenorMonths - Math.floor(rng() * 3));
    const maturity = maturityDate.toISOString().slice(0, 10);

    // Notional in $M
    const notional = Math.round(rangef(10, 150, rng));

    // Current value as % of par
    let currentValueBase: number;
    if (type === 'Capital Protected') {
      currentValueBase = rangef(98, 105, rng);
    } else {
      currentValueBase = rangef(85, 108, rng);
    }
    const currentValue = round(currentValueBase, 2);

    // Status determination
    let status: string;
    const isMatured = maturityDate < now;
    if (isMatured) {
      status = 'Matured';
    } else if (type === 'Autocallable' && rng() < 0.25) {
      status = 'Called';
    } else if (currentValue < 92 || rng() < 0.1) {
      status = 'At Risk';
    } else {
      status = 'Live';
    }

    return {
      name,
      type,
      underlying: underlying.name,
      issuer,
      coupon,
      barrierLevel,
      knockInLevel,
      maturity,
      notional,
      currentValue,
      status,
    };
  });

  // Summary
  const totalOutstanding = round(jitter(320, 0.08, rng), 1);
  const newIssuanceYTD = round(jitter(85, 0.12, rng), 1);
  const avgCoupon = round(products.reduce((s, p) => s + p.coupon, 0) / products.length, 2);
  const typeCounts: Record<string, number> = {};
  for (const p of products) {
    typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
  }
  const mostPopularType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
  const avgBarrierLevel = round(products.reduce((s, p) => s + p.barrierLevel, 0) / products.length, 1);

  const summary = {
    totalOutstanding,
    totalOutstandingUnit: 'B USD',
    newIssuanceYTD,
    newIssuanceYTDUnit: 'B USD',
    avgCoupon,
    avgCouponUnit: '%',
    mostPopularType,
    avgBarrierLevel,
    avgBarrierLevelUnit: '%',
  };

  // Payoff analysis for top 5 products by notional
  const top5 = [...products].sort((a, b) => b.notional - a.notional).slice(0, 5);
  const payoffAnalysis = top5.map(p => {
    const isProtected = p.type === 'Capital Protected';
    const barrierPct = p.barrierLevel / 100;

    // Scenario up (+20%)
    let scenarioUp: number;
    if (p.type === 'Autocallable' || p.type === 'Digital') {
      scenarioUp = round(p.coupon, 2); // capped at coupon
    } else if (isProtected) {
      scenarioUp = round(rangef(12, 20, rng), 2); // participation rate ~60-100%
    } else {
      scenarioUp = round(p.coupon, 2);
    }

    // Scenario flat (0% move)
    const scenarioFlat = round(p.coupon, 2);

    // Scenario down (-20%)
    let scenarioDown: number;
    if (isProtected) {
      scenarioDown = round(rangef(0, 2, rng), 2); // protected principal + small coupon
    } else if (0.8 > barrierPct) {
      // -20% doesn't breach barrier
      scenarioDown = round(p.coupon * rangef(0.6, 1.0, rng), 2);
    } else {
      // -20% breaches barrier
      scenarioDown = round(-20 + p.coupon, 2);
    }

    // Scenario barrier breached
    let scenarioBarrier: number;
    if (isProtected) {
      scenarioBarrier = round(rangef(-5, 0, rng), 2);
    } else {
      const lossFromBarrier = round((1 - barrierPct) * 100, 1);
      scenarioBarrier = round(-lossFromBarrier + p.coupon * 0.5, 2);
    }

    // Max loss
    const maxLoss = isProtected ? round(rangef(5, 15, rng), 2) : round(100 - p.coupon, 2);

    // Max gain
    const maxGain = p.type === 'Capital Protected'
      ? round(rangef(15, 30, rng), 2)
      : round(p.coupon * (p.type === 'Range Accrual' ? 1.0 : 1.0), 2);

    return {
      name: p.name,
      scenarioUp,
      scenarioUpUnit: '%',
      scenarioFlat,
      scenarioFlatUnit: '%',
      scenarioDown,
      scenarioDownUnit: '%',
      scenarioBarrier,
      scenarioBarrierUnit: '%',
      maxLoss,
      maxLossUnit: '%',
      maxGain,
      maxGainUnit: '%',
    };
  });

  // Issuance by type (6 types)
  const allTypes = ['Autocallable', 'Reverse Convertible', 'Range Accrual', 'Barrier Note', 'Capital Protected', 'Digital'];
  const issuanceByType = allTypes.map(type => {
    const typeProducts = products.filter(p => p.type === type);
    const count = typeProducts.length || Math.floor(rangef(5, 25, rng));
    const totalNotional = typeProducts.length > 0
      ? typeProducts.reduce((s, p) => s + p.notional, 0)
      : Math.round(rangef(200, 2000, rng));
    const avgTypeCoupon = typeProducts.length > 0
      ? round(typeProducts.reduce((s, p) => s + p.coupon, 0) / typeProducts.length, 2)
      : round(rangef(6, 14, rng), 2);
    const avgTypeBarrier = typeProducts.length > 0
      ? round(typeProducts.reduce((s, p) => s + p.barrierLevel, 0) / typeProducts.length, 1)
      : round(rangef(60, 75, rng), 1);

    return {
      type,
      count,
      totalNotional,
      totalNotionalUnit: 'M USD',
      avgCoupon: avgTypeCoupon,
      avgCouponUnit: '%',
      avgBarrier: avgTypeBarrier,
      avgBarrierUnit: '%',
    };
  });

  // Underlying performance (6 underlyings)
  const underlyingPerformance = UNDERLYINGS.map(u => {
    const spotPrice = round(jitter(u.spotBase, 0.04, rng), 2);
    const change1m = round((rng() - 0.45) * 12, 2); // slight positive bias

    // Find nearest barrier product for this underlying
    const linkedProducts = products.filter(p => p.underlying === u.name && p.status === 'Live');
    const productsLinked = linkedProducts.length || Math.floor(rangef(3, 15, rng));

    // Distance to barrier: how far spot is from nearest barrier level
    let distToBarrier: number;
    if (linkedProducts.length > 0) {
      const nearestBarrier = Math.max(...linkedProducts.map(p => p.barrierLevel));
      distToBarrier = round(100 - nearestBarrier + (rng() - 0.5) * 5, 1);
    } else {
      distToBarrier = round(rangef(20, 40, rng), 1);
    }

    return {
      underlying: u.name,
      spotPrice,
      change1m,
      change1mUnit: '%',
      distToBarrier,
      distToBarrierUnit: '%',
      productsLinked,
    };
  });

  return {
    summary,
    products,
    payoffAnalysis,
    issuanceByType,
    underlyingPerformance,
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
    console.error('[StructuredProducts] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate structured products data' });
  }
});

export default router;
