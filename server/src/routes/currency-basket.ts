import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── DXY component weights (ICE US Dollar Index) ──

const DXY_COMPONENTS = [
  { currency: 'EUR', weight: 0.576, baseSpot: 1.0820, inverted: true },
  { currency: 'JPY', weight: 0.136, baseSpot: 154.50, inverted: false },
  { currency: 'GBP', weight: 0.119, baseSpot: 1.2650, inverted: true },
  { currency: 'CAD', weight: 0.091, baseSpot: 1.3620, inverted: false },
  { currency: 'SEK', weight: 0.042, baseSpot: 10.45, inverted: false },
  { currency: 'CHF', weight: 0.036, baseSpot: 0.8780, inverted: false },
] as const;

// ── Trade-weighted basket definitions ──

const BASKETS = [
  { code: 'USD', name: 'US Dollar TWI', baseLevel: 104.80 },
  { code: 'EUR', name: 'Euro TWI', baseLevel: 99.20 },
  { code: 'GBP', name: 'Sterling TWI', baseLevel: 101.50 },
  { code: 'JPY', name: 'Yen TWI', baseLevel: 82.30 },
  { code: 'CNY', name: 'Renminbi TWI', baseLevel: 98.60 },
] as const;

// ── REER currencies ──

const REER_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', nominalBase: 1.000, cpiDiffBase: 0.0, reerBase: 112.5, avg10y: 105.0 },
  { code: 'EUR', name: 'Euro', nominalBase: 1.082, cpiDiffBase: -0.3, reerBase: 93.8, avg10y: 97.0 },
  { code: 'GBP', name: 'British Pound', nominalBase: 1.265, cpiDiffBase: 0.5, reerBase: 88.2, avg10y: 93.5 },
  { code: 'JPY', name: 'Japanese Yen', nominalBase: 0.00647, cpiDiffBase: -2.8, reerBase: 72.5, avg10y: 85.0 },
  { code: 'CHF', name: 'Swiss Franc', nominalBase: 1.139, cpiDiffBase: -1.5, reerBase: 118.3, avg10y: 110.0 },
  { code: 'AUD', name: 'Australian Dollar', nominalBase: 0.651, cpiDiffBase: 0.2, reerBase: 91.0, avg10y: 95.0 },
  { code: 'CAD', name: 'Canadian Dollar', nominalBase: 0.734, cpiDiffBase: -0.1, reerBase: 95.2, avg10y: 98.0 },
  { code: 'CNY', name: 'Chinese Yuan', nominalBase: 0.138, cpiDiffBase: -1.0, reerBase: 97.5, avg10y: 100.0 },
  { code: 'SEK', name: 'Swedish Krona', nominalBase: 0.0957, cpiDiffBase: -0.5, reerBase: 82.0, avg10y: 90.0 },
  { code: 'NZD', name: 'New Zealand Dollar', nominalBase: 0.607, cpiDiffBase: 0.3, reerBase: 89.0, avg10y: 92.0 },
] as const;

// ── Currency strength currencies ──

const STRENGTH_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'] as const;

// ── Custom basket definitions ──

const CUSTOM_BASKETS = [
  {
    name: 'EM FX Basket',
    type: 'em',
    components: [
      { code: 'BRL', name: 'Brazilian Real', baseReturn: 0.85, weight: 1 / 6 },
      { code: 'MXN', name: 'Mexican Peso', baseReturn: 1.20, weight: 1 / 6 },
      { code: 'ZAR', name: 'South African Rand', baseReturn: -0.45, weight: 1 / 6 },
      { code: 'TRY', name: 'Turkish Lira', baseReturn: -3.50, weight: 1 / 6 },
      { code: 'INR', name: 'Indian Rupee', baseReturn: -0.30, weight: 1 / 6 },
      { code: 'IDR', name: 'Indonesian Rupiah', baseReturn: -0.60, weight: 1 / 6 },
    ],
  },
  {
    name: 'Commodity FX Basket',
    type: 'commodity',
    components: [
      { code: 'AUD', name: 'Australian Dollar', baseReturn: 0.50, weight: 0.25 },
      { code: 'CAD', name: 'Canadian Dollar', baseReturn: 0.35, weight: 0.25 },
      { code: 'NOK', name: 'Norwegian Krone', baseReturn: -0.20, weight: 0.25 },
      { code: 'NZD', name: 'New Zealand Dollar', baseReturn: 0.40, weight: 0.25 },
    ],
  },
  {
    name: 'Funding FX Basket',
    type: 'funding',
    components: [
      { code: 'JPY', name: 'Japanese Yen', baseReturn: -1.80, weight: 1 / 3 },
      { code: 'CHF', name: 'Swiss Franc', baseReturn: 0.60, weight: 1 / 3 },
      { code: 'EUR', name: 'Euro', baseReturn: 0.25, weight: 1 / 3 },
    ],
  },
] as const;

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Data generation ──

function generate() {
  const rng = seededRandom('currency-basket');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const jitterAdd = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;

  // 1. DXY decomposition
  const dxyBase = 104.80;
  const dxyLevel = Math.round(jitter(dxyBase, 0.008) * 100) / 100;
  const dxy1dChange = Math.round(jitterAdd(0.05, 0.4) * 100) / 100;

  const dxyComponents = DXY_COMPONENTS.map(c => {
    const spot = Math.round(jitter(c.baseSpot, 0.008) * 10000) / 10000;
    const weight = c.weight;
    const contribution = Math.round(jitterAdd(dxy1dChange * weight, 0.05) * 1000) / 1000;
    const change1d = Math.round(jitterAdd(0.0, 0.35) * 100) / 100;
    const change1w = Math.round(jitterAdd(0.0, 0.80) * 100) / 100;
    const change1m = Math.round(jitterAdd(0.0, 1.50) * 100) / 100;

    return {
      currency: c.currency,
      spot,
      weight: Math.round(weight * 1000) / 10,
      contribution,
      change1d,
      change1w,
      change1m,
    };
  });

  const dxyDecomposition = {
    level: dxyLevel,
    change1d: dxy1dChange,
    change1w: Math.round(jitterAdd(0.15, 0.6) * 100) / 100,
    change1m: Math.round(jitterAdd(-0.30, 1.2) * 100) / 100,
    components: dxyComponents,
  };

  // 2. Major currency baskets (trade-weighted indices)
  const majorBaskets = BASKETS.map(b => {
    const level = Math.round(jitter(b.baseLevel, 0.008) * 100) / 100;
    return {
      code: b.code,
      name: b.name,
      level,
      change1d: Math.round(jitterAdd(0.0, 0.30) * 100) / 100,
      change1w: Math.round(jitterAdd(0.0, 0.70) * 100) / 100,
      change1m: Math.round(jitterAdd(0.0, 1.40) * 100) / 100,
      changeYtd: Math.round(jitterAdd(0.0, 3.0) * 100) / 100,
    };
  });

  // 3. Real effective exchange rate (REER)
  const reer = REER_CURRENCIES.map(c => {
    const nominal = Math.round(jitter(c.nominalBase, 0.006) * 10000) / 10000;
    const cpiDiff = Math.round(jitterAdd(c.cpiDiffBase, 0.3) * 10) / 10;
    const reerLevel = Math.round(jitter(c.reerBase, 0.012) * 10) / 10;
    const avg10y = c.avg10y;
    const deviation = Math.round(((reerLevel - avg10y) / avg10y) * 1000) / 10;
    const signal: 'overvalued' | 'undervalued' | 'fair' =
      deviation > 5 ? 'overvalued' : deviation < -5 ? 'undervalued' : 'fair';

    return {
      code: c.code,
      name: c.name,
      nominalRate: nominal,
      cpiDifferential: cpiDiff,
      reerLevel,
      avg10y,
      deviationPct: deviation,
      signal,
    };
  });

  // 4. Currency strength meter (-100 to +100)
  const strengthScores: { code: string; score: number; rank: number }[] = STRENGTH_CURRENCIES.map(code => {
    // USD baseline tendency slightly positive, JPY/CHF slightly negative (funding), etc.
    const baseBias: Record<string, number> = {
      USD: 15, EUR: -5, GBP: 5, JPY: -20, CHF: 10, AUD: -8, CAD: -3, NZD: -10,
    };
    const bias = baseBias[code] ?? 0;
    const score = Math.round(Math.max(-100, Math.min(100, jitterAdd(bias, 35))));
    return { code, score, rank: 0 };
  });

  strengthScores.sort((a, b) => b.score - a.score);
  strengthScores.forEach((s, i) => { s.rank = i + 1; });

  const currencyStrength = strengthScores.map(s => ({
    code: s.code,
    score: s.score,
    rank: s.rank,
    signal: s.score > 30 ? 'strong' as const : s.score < -30 ? 'weak' as const : 'neutral' as const,
  }));

  // 5. Custom basket performance
  const basketPerformance = CUSTOM_BASKETS.map(basket => {
    const components = basket.components.map(comp => {
      const ret = Math.round(jitterAdd(comp.baseReturn, 1.5) * 100) / 100;
      return {
        code: comp.code,
        name: comp.name,
        weight: Math.round(comp.weight * 1000) / 10,
        return1d: Math.round(jitterAdd(ret * 0.1, 0.3) * 100) / 100,
        return1w: Math.round(jitterAdd(ret * 0.3, 0.5) * 100) / 100,
        return1m: ret,
      };
    });

    const basketReturn1d = Math.round(components.reduce((sum, c) => sum + c.return1d * (c.weight / 100), 0) * 100) / 100;
    const basketReturn1w = Math.round(components.reduce((sum, c) => sum + c.return1w * (c.weight / 100), 0) * 100) / 100;
    const basketReturn1m = Math.round(components.reduce((sum, c) => sum + c.return1m * (c.weight / 100), 0) * 100) / 100;

    return {
      name: basket.name,
      type: basket.type,
      return1d: basketReturn1d,
      return1w: basketReturn1w,
      return1m: basketReturn1m,
      components,
    };
  });

  // 6. Historical DXY (30 daily data points)
  const historicalDxy: { date: string; close: number; high: number; low: number }[] = [];
  let dxyWalk = dxyBase - 1.5 + (rng() - 0.5) * 1.0;
  for (let i = 29; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const dateStr = dt.toISOString().slice(0, 10);

    dxyWalk += (rng() - 0.48) * 0.35;
    dxyWalk = Math.max(101.0, Math.min(108.0, dxyWalk));
    const close = Math.round(dxyWalk * 100) / 100;
    const high = Math.round((close + rng() * 0.40) * 100) / 100;
    const low = Math.round((close - rng() * 0.40) * 100) / 100;

    historicalDxy.push({ date: dateStr, close, high, low });
  }
  // Ensure last point matches current DXY level
  if (historicalDxy.length > 0) {
    historicalDxy[historicalDxy.length - 1].close = dxyLevel;
  }

  return {
    dxyDecomposition,
    majorBaskets,
    reer,
    currencyStrength,
    basketPerformance,
    historicalDxy,
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
    console.error('[CurrencyBasket] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate currency basket data' });
  }
});

export default router;
