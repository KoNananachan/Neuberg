import { Router } from 'express';

const router = Router();

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

interface ConvertibleDef {
  issuer: string;
  ticker: string;
  coupon: number;
  maturity: string;
  conversionPrice: number;
  stockBase: number;
  rating: string;
  sizeM: number;
}

const CONVERTIBLES: ConvertibleDef[] = [
  { issuer: 'Tesla', ticker: 'TSLA', coupon: 2.0, maturity: '2027-10-15', conversionPrice: 280, stockBase: 248, rating: 'BB+', sizeM: 1800 },
  { issuer: 'Airbnb', ticker: 'ABNB', coupon: 0.0, maturity: '2028-03-15', conversionPrice: 195, stockBase: 156, rating: 'BB', sizeM: 2000 },
  { issuer: 'Zillow', ticker: 'ZG', coupon: 1.375, maturity: '2027-09-01', conversionPrice: 75, stockBase: 56, rating: 'B+', sizeM: 600 },
  { issuer: 'Snap', ticker: 'SNAP', coupon: 0.75, maturity: '2029-08-01', conversionPrice: 22, stockBase: 14.5, rating: 'B', sizeM: 1100 },
  { issuer: 'Lululemon', ticker: 'LULU', coupon: 0.375, maturity: '2030-06-15', conversionPrice: 420, stockBase: 365, rating: 'BBB-', sizeM: 900 },
  { issuer: 'Palo Alto Networks', ticker: 'PANW', coupon: 0.375, maturity: '2028-12-01', conversionPrice: 400, stockBase: 315, rating: 'BBB', sizeM: 1800 },
  { issuer: 'Datadog', ticker: 'DDOG', coupon: 0.125, maturity: '2030-06-15', conversionPrice: 160, stockBase: 122, rating: 'BB+', sizeM: 750 },
  { issuer: 'Uber', ticker: 'UBER', coupon: 0.875, maturity: '2029-12-01', conversionPrice: 85, stockBase: 73, rating: 'BB', sizeM: 1500 },
  { issuer: 'MicroStrategy', ticker: 'MSTR', coupon: 0.625, maturity: '2032-03-15', conversionPrice: 2100, stockBase: 1620, rating: 'B-', sizeM: 1050 },
  { issuer: 'Shopify', ticker: 'SHOP', coupon: 0.125, maturity: '2029-11-01', conversionPrice: 105, stockBase: 79, rating: 'BB+', sizeM: 920 },
  { issuer: 'CrowdStrike', ticker: 'CRWD', coupon: 0.0, maturity: '2031-02-15', conversionPrice: 450, stockBase: 342, rating: 'BB+', sizeM: 750 },
  { issuer: 'Block', ticker: 'SQ', coupon: 0.125, maturity: '2029-05-01', conversionPrice: 100, stockBase: 79, rating: 'BB', sizeM: 2000 },
];

const STRATEGIES = ['delta hedge', 'gamma trade', 'credit play', 'busted CB'] as const;
const CONVICTIONS = ['high', 'medium', 'low'] as const;
const RICH_CHEAP = ['rich', 'fair', 'cheap'] as const;

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-convertible-arbitrage'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // --- 1. Universe (12 convertibles) ---
  const universe = CONVERTIBLES.map((cb) => {
    const stockPrice = Math.round(jitter(cb.stockBase, 0.06) * 100) / 100;
    const conversionRatio = Math.round((1000 / cb.conversionPrice) * 1000) / 1000;
    const parityPrice = Math.round((stockPrice * conversionRatio / 10) * 100) / 100;

    // Bond floor: investment value of the straight bond component (70-95 range)
    const bondFloor = Math.round((75 + rng() * 20) * 100) / 100;

    // Market price sits above both parity and bond floor
    const rawPremiumPct = 8 + rng() * 35;
    const marketPrice = Math.round(Math.max(parityPrice, bondFloor) * (1 + rawPremiumPct / 100) * 100) / 100;

    const moneyness = stockPrice / cb.conversionPrice;
    const delta = Math.round(Math.min(0.85, Math.max(0.15, moneyness * 0.7 + (rng() - 0.5) * 0.12)) * 100) / 100;
    const gamma = Math.round(Math.max(0.003, (1 - Math.abs(moneyness - 1)) * 0.04 + rng() * 0.008) * 10000) / 10000;
    const impliedVol = Math.round((25 + rng() * 35) * 10) / 10;
    const creditSpread = Math.round(120 + rng() * 450);
    const premium = Math.round((marketPrice / parityPrice - 1) * 100 * 10) / 10;

    return {
      issuer: cb.issuer,
      ticker: cb.ticker,
      coupon: cb.coupon,
      maturity: cb.maturity,
      conversionPrice: cb.conversionPrice,
      conversionRatio,
      parityPrice,
      bondFloor,
      marketPrice,
      delta,
      gamma,
      impliedVol,
      creditSpread,
      premium,
      rating: cb.rating,
    };
  });

  // --- 2. Arb Opportunities (8 entries) ---
  const arbIndices = Array.from({ length: 12 }, (_, i) => i)
    .sort(() => rng() - 0.5)
    .slice(0, 8);

  const arbOpportunities = arbIndices.map((idx) => {
    const cb = universe[idx];
    const strategy = pick(STRATEGIES);
    const conviction = pick(CONVICTIONS);

    const expectedReturn = Math.round((2 + rng() * 14) * 10) / 10;
    const sharpe = Math.round((0.5 + rng() * 2.5) * 100) / 100;
    const arbDelta = Math.round((rng() - 0.5) * 0.4 * 100) / 100;
    const vegaExposure = Math.round((rng() * 0.15) * 10000) / 10000;

    const rationales: Record<typeof strategy, string[]> = {
      'delta hedge': [
        'Equity vol underpriced relative to CB implied; delta-neutral with positive carry',
        'Stock borrow cost low, favorable delta hedge economics with 2:1 reward-risk',
        'Near-money CB with steep gamma offering attractive rebalancing PnL potential',
      ],
      'gamma trade': [
        'Realized vol consistently exceeding implied; gamma scalping generates positive theta',
        'Event catalyst approaching with compressed implied vol; long gamma at discount',
        'High convexity profile at current moneyness with cheap gamma entry point',
      ],
      'credit play': [
        'Credit spread widening overdone relative to fundamentals; asymmetric return in recovery',
        'Investment-grade credit profile mispriced as high-yield; busted CB trades below bond floor',
        'Upcoming refinancing catalyst likely to compress credit spread 50-80bps',
      ],
      'busted CB': [
        'Deep OTM convertible trading at distressed levels; equity option value near zero but non-trivial recovery',
        'Bond floor provides downside protection; free equity call option on potential restructuring',
        'Busted CB yield exceeds straight debt by 200bps; credit fundamentals remain intact',
      ],
    };

    return {
      issuer: cb.issuer,
      strategy,
      expectedReturn,
      sharpe,
      delta: arbDelta,
      vegaExposure,
      conviction,
      rationale: pick(rationales[strategy]),
    };
  });

  // --- 3. Portfolio Greeks ---
  const portfolioGreeks = {
    totalDelta: Math.round((rng() - 0.5) * 0.1 * 10000) / 10000,
    totalGamma: Math.round((0.01 + rng() * 0.04) * 10000) / 10000,
    totalVega: Math.round((0.05 + rng() * 0.2) * 10000) / 10000,
    totalTheta: Math.round((-0.005 - rng() * 0.02) * 10000) / 10000,
    totalRho: Math.round((0.01 + rng() * 0.06) * 10000) / 10000,
    creditDV01: Math.round((5000 + rng() * 15000) * 100) / 100,
    netExposure: Math.round((rng() - 0.5) * 8 * 100) / 100,
  };

  // --- 4. Vol Analysis (8 names) ---
  const volIndices = Array.from({ length: 12 }, (_, i) => i)
    .sort(() => rng() - 0.5)
    .slice(0, 8);

  const volAnalysis = volIndices.map((idx) => {
    const cb = universe[idx];
    const impliedVol = cb.impliedVol;
    const realizedVol30d = Math.round((impliedVol + (rng() - 0.5) * 15) * 10) / 10;
    const realizedVol60d = Math.round((impliedVol + (rng() - 0.5) * 12) * 10) / 10;
    const volSpread = Math.round((impliedVol - realizedVol30d) * 10) / 10;
    const volPercentile52w = Math.round(rng() * 100);
    const richCheap = volSpread > 5 ? 'rich' as const : volSpread < -5 ? 'cheap' as const : 'fair' as const;

    return {
      issuer: cb.issuer,
      impliedVol,
      realizedVol30d,
      realizedVol60d,
      volSpread,
      volPercentile52w,
      richCheap,
    };
  });

  // --- 5. Market Summary ---
  const averagePremium = Math.round(universe.reduce((a, b) => a + b.premium, 0) / universe.length * 10) / 10;
  const averageDelta = Math.round(universe.reduce((a, b) => a + b.delta, 0) / universe.length * 100) / 100;
  const averageCreditSpread = Math.round(universe.reduce((a, b) => a + b.creditSpread, 0) / universe.length);

  const marketSummary = {
    universeSize: universe.length,
    averagePremium,
    averageDelta,
    averageCreditSpread,
    newIssuance: Math.round(3 + rng() * 8),
    totalMarketCap: Math.round((180 + rng() * 120) * 10) / 10,
  };

  return {
    universe,
    arbOpportunities,
    portfolioGreeks,
    volAnalysis,
    marketSummary,
    timestamp: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ConvertibleArbitrage] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate convertible arbitrage data' });
  }
});

export default router;
