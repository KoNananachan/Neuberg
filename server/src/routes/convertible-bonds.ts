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

const CONVERTIBLES = [
  { issuer: 'Tesla', ticker: 'TSLA', coupon: 2.0, stockBase: 245, convPrice: 280, size: 1800, maturity: 2027 },
  { issuer: 'Airbnb', ticker: 'ABNB', coupon: 0.0, stockBase: 155, convPrice: 195, size: 2000, maturity: 2026 },
  { issuer: 'Datadog', ticker: 'DDOG', coupon: 0.125, stockBase: 120, convPrice: 160, size: 750, maturity: 2028 },
  { issuer: 'Uber', ticker: 'UBER', coupon: 0.875, stockBase: 72, convPrice: 85, size: 1500, maturity: 2028 },
  { issuer: 'MicroStrategy', ticker: 'MSTR', coupon: 0.625, stockBase: 1600, convPrice: 2100, size: 1050, maturity: 2030 },
  { issuer: 'Shopify', ticker: 'SHOP', coupon: 0.125, stockBase: 78, convPrice: 105, size: 920, maturity: 2027 },
  { issuer: 'Zillow', ticker: 'ZG', coupon: 1.375, stockBase: 55, convPrice: 75, size: 600, maturity: 2026 },
  { issuer: 'Lumentum', ticker: 'LITE', coupon: 0.5, stockBase: 52, convPrice: 68, size: 500, maturity: 2028 },
  { issuer: 'ON Semi', ticker: 'ON', coupon: 0.0, stockBase: 75, convPrice: 95, size: 1200, maturity: 2029 },
  { issuer: 'Palo Alto', ticker: 'PANW', coupon: 0.375, stockBase: 310, convPrice: 400, size: 1800, maturity: 2028 },
  { issuer: 'CrowdStrike', ticker: 'CRWD', coupon: 0.0, stockBase: 340, convPrice: 450, size: 750, maturity: 2029 },
  { issuer: 'Block', ticker: 'SQ', coupon: 0.125, stockBase: 78, convPrice: 100, size: 2000, maturity: 2027 },
  { issuer: 'Snap', ticker: 'SNAP', coupon: 0.75, stockBase: 14, convPrice: 22, size: 1100, maturity: 2028 },
  { issuer: 'Wayfair', ticker: 'W', coupon: 1.0, stockBase: 55, convPrice: 80, size: 800, maturity: 2027 },
  { issuer: 'DraftKings', ticker: 'DKNG', coupon: 0.0, stockBase: 42, convPrice: 60, size: 1250, maturity: 2028 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-convertible-bonds'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const bonds = CONVERTIBLES.map(cb => {
    const stockPrice = Math.round(jitter(cb.stockBase, 0.06) * 100) / 100;
    const conversionPrice = cb.convPrice;
    const conversionRatio = Math.round((1000 / conversionPrice) * 1000) / 1000;
    const parity = Math.round((stockPrice * conversionRatio / 10) * 100) / 100;
    const bondPrice = Math.round(Math.max(parity, 85 + rng() * 30) * 100) / 100;
    const premium = Math.round((bondPrice / parity - 1) * 100 * 10) / 10;
    const delta = Math.round(Math.min(1, Math.max(0, (stockPrice / conversionPrice) * 0.7 + (rng() - 0.5) * 0.2)) * 100) / 100;
    const gamma = Math.round(Math.max(0, (1 - Math.abs(stockPrice / conversionPrice - 1)) * 0.05) * 10000) / 10000;
    const impliedVol = Math.round((25 + rng() * 30) * 10) / 10;
    const creditSpread = Math.round(150 + rng() * 400);
    const ytm = Math.round((cb.coupon + (100 - bondPrice) / ((cb.maturity - 2026) || 1)) * 100) / 100;
    const ytc = Math.round(ytm - 0.5 - rng() * 2 > 0 ? ytm - 0.5 - rng() * 2 : rng() * 2);
    const change1d = Math.round((rng() - 0.5) * 2 * 100) / 100;
    const stockChange1d = Math.round((rng() - 0.5) * 4 * 100) / 100;

    const moneyness = stockPrice >= conversionPrice ? 'ITM' : stockPrice >= conversionPrice * 0.8 ? 'ATM' : 'OTM';

    return {
      issuer: cb.issuer, ticker: cb.ticker, coupon: cb.coupon,
      maturity: cb.maturity, size: cb.size, stockPrice, conversionPrice,
      conversionRatio, parity, bondPrice, premium, delta, gamma,
      impliedVol, creditSpread, ytm, ytc: Math.round(ytc * 100) / 100,
      change1d, stockChange1d, moneyness,
    };
  });

  const moneynessBreakdown = {
    itm: bonds.filter(b => b.moneyness === 'ITM').length,
    atm: bonds.filter(b => b.moneyness === 'ATM').length,
    otm: bonds.filter(b => b.moneyness === 'OTM').length,
  };

  const summary = {
    totalBonds: bonds.length,
    totalOutstanding: Math.round(bonds.reduce((a, b) => a + b.size, 0) / 1000 * 10) / 10,
    avgPremium: Math.round(bonds.reduce((a, b) => a + b.premium, 0) / bonds.length * 10) / 10,
    avgDelta: Math.round(bonds.reduce((a, b) => a + b.delta, 0) / bonds.length * 100) / 100,
    avgImpliedVol: Math.round(bonds.reduce((a, b) => a + b.impliedVol, 0) / bonds.length * 10) / 10,
    avgCreditSpread: Math.round(bonds.reduce((a, b) => a + b.creditSpread, 0) / bonds.length),
    moneynessBreakdown,
  };

  return { bonds, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ConvertibleBonds] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate convertible bond data' });
  }
});

export default router;
