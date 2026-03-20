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

const ISSUERS = [
  { issuer: 'Tesla', ticker: 'TSLA', coupon: 2.0, maturity: '2025-10-15', convPrice: 280, stockBase: 248, rating: 'BB+', sizeM: 1800 },
  { issuer: 'Airbnb', ticker: 'ABNB', coupon: 0.0, maturity: '2026-03-15', convPrice: 195, stockBase: 156, rating: 'BB', sizeM: 2000 },
  { issuer: 'Zillow', ticker: 'ZG', coupon: 1.375, maturity: '2025-09-01', convPrice: 75, stockBase: 56, rating: 'B+', sizeM: 600 },
  { issuer: 'Snap', ticker: 'SNAP', coupon: 0.75, maturity: '2027-08-01', convPrice: 22, stockBase: 14.5, rating: 'B', sizeM: 1100 },
  { issuer: 'Lululemon', ticker: 'LULU', coupon: 0.375, maturity: '2028-06-15', convPrice: 420, stockBase: 365, rating: 'BBB-', sizeM: 900 },
  { issuer: 'Palo Alto', ticker: 'PANW', coupon: 0.375, maturity: '2026-12-01', convPrice: 400, stockBase: 315, rating: 'BBB', sizeM: 1800 },
  { issuer: 'Datadog', ticker: 'DDOG', coupon: 0.125, maturity: '2028-06-15', convPrice: 160, stockBase: 122, rating: 'BB+', sizeM: 750 },
  { issuer: 'Uber', ticker: 'UBER', coupon: 0.875, maturity: '2028-12-01', convPrice: 85, stockBase: 73, rating: 'BB', sizeM: 1500 },
  { issuer: 'MicroStrategy', ticker: 'MSTR', coupon: 0.625, maturity: '2030-03-15', convPrice: 2100, stockBase: 1620, rating: 'B-', sizeM: 1050 },
  { issuer: 'Shopify', ticker: 'SHOP', coupon: 0.125, maturity: '2027-11-01', convPrice: 105, stockBase: 79, rating: 'BB+', sizeM: 920 },
  { issuer: 'CrowdStrike', ticker: 'CRWD', coupon: 0.0, maturity: '2029-02-15', convPrice: 450, stockBase: 342, rating: 'BB+', sizeM: 750 },
  { issuer: 'Block', ticker: 'SQ', coupon: 0.125, maturity: '2027-05-01', convPrice: 100, stockBase: 79, rating: 'BB', sizeM: 2000 },
  { issuer: 'Wayfair', ticker: 'W', coupon: 1.0, maturity: '2027-08-15', convPrice: 80, stockBase: 56, rating: 'B', sizeM: 800 },
  { issuer: 'DraftKings', ticker: 'DKNG', coupon: 0.0, maturity: '2028-03-15', convPrice: 60, stockBase: 43, rating: 'B+', sizeM: 1250 },
  { issuer: 'ON Semi', ticker: 'ON', coupon: 0.0, maturity: '2029-06-01', convPrice: 95, stockBase: 76, rating: 'BBB-', sizeM: 1200 },
];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-convertible-arb'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const positions = ISSUERS.map(cb => {
    const stockPrice = Math.round(jitter(cb.stockBase, 0.06) * 100) / 100;
    const conversionPrice = cb.convPrice;
    const conversionRatio = Math.round((1000 / conversionPrice) * 1000) / 1000;
    const parity = stockPrice * conversionRatio / 10;

    // Bond price sits above parity with a premium
    const rawPremiumPct = 15 + rng() * 30; // 15-45%
    const bondPrice = Math.round(parity * (1 + rawPremiumPct / 100) * 100) / 100;

    // Theoretical value slightly different from bond price (cheap/rich measure)
    const cheapRichOffset = (rng() - 0.5) * 6; // -3% to +3%
    const theoreticalValue = Math.round(bondPrice * (1 + cheapRichOffset / 100) * 100) / 100;
    const premium = Math.round((bondPrice / parity - 1) * 100 * 10) / 10;
    const cheapRich = Math.round((bondPrice / theoreticalValue - 1) * 100 * 10) / 10;

    // Greeks
    const moneyness = stockPrice / conversionPrice;
    const delta = Math.round(Math.min(0.8, Math.max(0.3, moneyness * 0.65 + (rng() - 0.5) * 0.15)) * 100) / 100;
    const gamma = Math.round(Math.max(0.005, (1 - Math.abs(moneyness - 1)) * 0.04 + rng() * 0.01) * 10000) / 10000;

    const creditSpread = Math.round(100 + rng() * 400);

    return {
      issuer: cb.issuer,
      ticker: cb.ticker,
      coupon: cb.coupon,
      maturity: cb.maturity,
      conversionPrice,
      stockPrice,
      conversionRatio,
      bondPrice,
      theoreticalValue,
      premium,
      delta,
      gamma,
      cheapRich,
      creditSpread,
      rating: cb.rating,
    };
  });

  // Full greeks for each position
  const greeks = positions.map(p => ({
    name: `${p.issuer} ${p.coupon}% ${p.maturity.slice(0, 4)}`,
    delta: p.delta,
    gamma: p.gamma,
    vega: Math.round((0.05 + rng() * 0.25) * 1000) / 1000,
    theta: Math.round((-0.002 - rng() * 0.015) * 10000) / 10000,
    rho: Math.round((0.01 + rng() * 0.08) * 10000) / 10000,
  }));

  // Summary
  const totalNotional = Math.round(ISSUERS.reduce((a, b) => a + b.sizeM, 0) / 1000 * 10) / 10;
  const avgPremium = Math.round(positions.reduce((a, b) => a + b.premium, 0) / positions.length * 10) / 10;
  const avgDelta = Math.round(positions.reduce((a, b) => a + b.delta, 0) / positions.length * 100) / 100;
  const avgCheapRich = Math.round(positions.reduce((a, b) => a + b.cheapRich, 0) / positions.length * 10) / 10;

  // Most active = largest notional issuer with some randomness
  const sortedByActivity = [...ISSUERS].sort((a, b) => b.sizeM - a.sizeM);
  const mostActiveIdx = Math.floor(rng() * 3); // top 3
  const mostActive = sortedByActivity[mostActiveIdx].ticker;

  const summary = {
    totalNotional,
    avgPremium,
    avgDelta,
    mostActive,
    avgCheapRich,
  };

  // Recent trades
  const sides: Array<'Buy' | 'Sell'> = ['Buy', 'Sell'];
  const recentTrades = Array.from({ length: 10 }, (_, i) => {
    const pos = positions[Math.floor(rng() * positions.length)];
    const side = sides[Math.floor(rng() * 2)];
    const notional = Math.round((5 + rng() * 95) * 10) / 10; // 5-100 $M
    const tradePrice = Math.round(jitter(pos.bondPrice, 0.01) * 100) / 100;
    const tradeYield = Math.round((pos.coupon + (100 - tradePrice) / 5) * 100) / 100;
    const tradePremium = Math.round(jitter(pos.premium, 0.05) * 10) / 10;
    const hour = 9 + Math.floor(rng() * 8); // 9:00 - 16:59
    const minute = Math.floor(rng() * 60);
    const second = Math.floor(rng() * 60);
    const timestamp = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

    return {
      issuer: pos.issuer,
      side,
      notional,
      price: tradePrice,
      yield: tradeYield,
      premium: tradePremium,
      timestamp,
    };
  }).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first

  return { summary, positions, greeks, recentTrades, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ConvertibleArb] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate convertible arbitrage data' });
  }
});

export default router;
