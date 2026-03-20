import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const CB_ISSUERS = [
  { issuer: 'Tesla', ticker: 'TSLA', coupon: 2.0, maturity: '2027-10-15', convPrice: 280, stockBase: 248, rating: 'BB+', sizeM: 1800 },
  { issuer: 'Airbnb', ticker: 'ABNB', coupon: 0.0, maturity: '2026-03-15', convPrice: 195, stockBase: 156, rating: 'BB', sizeM: 2000 },
  { issuer: 'Snap', ticker: 'SNAP', coupon: 0.75, maturity: '2028-08-01', convPrice: 22, stockBase: 14.5, rating: 'B', sizeM: 1100 },
  { issuer: 'Block', ticker: 'SQ', coupon: 0.125, maturity: '2027-05-01', convPrice: 100, stockBase: 79, rating: 'BB', sizeM: 2000 },
  { issuer: 'Datadog', ticker: 'DDOG', coupon: 0.125, maturity: '2028-06-15', convPrice: 160, stockBase: 122, rating: 'BB+', sizeM: 750 },
  { issuer: 'Palo Alto', ticker: 'PANW', coupon: 0.375, maturity: '2028-12-01', convPrice: 400, stockBase: 315, rating: 'BBB', sizeM: 1800 },
  { issuer: 'Zillow', ticker: 'ZG', coupon: 1.375, maturity: '2026-09-01', convPrice: 75, stockBase: 56, rating: 'B+', sizeM: 600 },
  { issuer: 'Lumentum', ticker: 'LITE', coupon: 0.5, maturity: '2028-03-15', convPrice: 68, stockBase: 52, rating: 'BB-', sizeM: 500 },
  { issuer: 'Wolfspeed', ticker: 'WOLF', coupon: 1.875, maturity: '2029-01-15', convPrice: 45, stockBase: 28, rating: 'B-', sizeM: 650 },
  { issuer: 'Etsy', ticker: 'ETSY', coupon: 0.25, maturity: '2028-06-15', convPrice: 170, stockBase: 132, rating: 'BB', sizeM: 1000 },
  { issuer: 'Akamai', ticker: 'AKAM', coupon: 0.125, maturity: '2027-05-01', convPrice: 135, stockBase: 108, rating: 'BBB-', sizeM: 1150 },
  { issuer: 'Microchip', ticker: 'MCHP', coupon: 0.75, maturity: '2027-11-15', convPrice: 95, stockBase: 76, rating: 'BBB-', sizeM: 1400 },
];

const WARRANT_ISSUERS = [
  { issuer: 'Rivian', ticker: 'RIVN', strikeBase: 20, stockBase: 14.5, expiry: '2028-06-15' },
  { issuer: 'Lucid', ticker: 'LCID', strikeBase: 8, stockBase: 3.2, expiry: '2027-12-01' },
  { issuer: 'Joby Aviation', ticker: 'JOBY', strikeBase: 12, stockBase: 7.8, expiry: '2028-09-15' },
  { issuer: 'Archer Aviation', ticker: 'ACHR', strikeBase: 10, stockBase: 6.5, expiry: '2028-03-01' },
  { issuer: 'Virgin Galactic', ticker: 'SPCE', strikeBase: 15, stockBase: 4.1, expiry: '2027-06-15' },
  { issuer: 'Nikola', ticker: 'NKLA', strikeBase: 5, stockBase: 1.2, expiry: '2027-09-01' },
  { issuer: 'QuantumScape', ticker: 'QS', strikeBase: 25, stockBase: 8.6, expiry: '2028-12-15' },
  { issuer: 'Ginkgo Bioworks', ticker: 'DNA', strikeBase: 10, stockBase: 2.8, expiry: '2028-03-15' },
];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

function generate() {
  const seed = hashSeed('warrant-convertible-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // --- Convertibles ---
  const convertibles = CB_ISSUERS.map(cb => {
    const stockPrice = Math.round(jitter(cb.stockBase, 0.08) * 100) / 100;
    const conversionPrice = cb.convPrice;
    const conversionRatio = Math.round((1000 / conversionPrice) * 1000) / 1000;
    const parityValue = Math.round((stockPrice * conversionRatio / 10) * 100) / 100;

    const rawPremiumPct = 12 + rng() * 35;
    const marketPrice = Math.round(Math.max(parityValue, 80 + rng() * 25) * 100) / 100;
    const conversionPremium = Math.round((marketPrice / parityValue - 1) * 100 * 10) / 10;

    const theoreticalOffset = (rng() - 0.5) * 8;
    const theoreticalValue = Math.round(marketPrice * (1 + theoreticalOffset / 100) * 100) / 100;

    const moneyness = stockPrice / conversionPrice;
    const impliedVol = Math.round((22 + rng() * 35) * 10) / 10;
    const delta = Math.round(Math.min(0.95, Math.max(0.15, moneyness * 0.7 + (rng() - 0.5) * 0.15)) * 100) / 100;
    const gamma = Math.round(Math.max(0.003, (1 - Math.abs(moneyness - 1)) * 0.045 + rng() * 0.012) * 10000) / 10000;
    const creditSpread = Math.round(120 + rng() * 450);

    return {
      issuer: cb.issuer,
      ticker: cb.ticker,
      coupon: cb.coupon,
      maturity: cb.maturity,
      conversionPrice,
      stockPrice,
      conversionPremium,
      theoreticalValue,
      marketPrice,
      impliedVol,
      delta,
      gamma,
      creditSpread,
      rating: cb.rating,
      parityValue,
    };
  });

  // --- Warrants ---
  const warrants = WARRANT_ISSUERS.map(w => {
    const underlyingPrice = Math.round(jitter(w.stockBase, 0.10) * 100) / 100;
    const strikePrice = w.strikeBase;
    const intrinsicValue = Math.round(Math.max(0, underlyingPrice - strikePrice) * 100) / 100;
    const timeValue = Math.round((0.5 + rng() * 3.5) * 100) / 100;
    const impliedVol = Math.round((35 + rng() * 50) * 10) / 10;
    const moneyness = underlyingPrice / strikePrice;
    const delta = Math.round(Math.min(0.95, Math.max(0.05, moneyness * 0.55 + (rng() - 0.5) * 0.2)) * 100) / 100;
    const leverage = Math.round((underlyingPrice / (intrinsicValue + timeValue)) * 100) / 100;
    const premium = Math.round(((intrinsicValue + timeValue) / underlyingPrice - (intrinsicValue > 0 ? intrinsicValue / underlyingPrice : 0)) * 100 * 10) / 10;
    const volume = Math.round(5000 + rng() * 150000);

    return {
      issuer: w.issuer,
      ticker: w.ticker,
      strikePrice,
      expiry: w.expiry,
      underlyingPrice,
      intrinsicValue,
      timeValue,
      impliedVol,
      delta,
      leverage,
      premium,
      volume,
    };
  });

  // --- Market Summary ---
  const totalOutstandingB = Math.round(CB_ISSUERS.reduce((a, b) => a + b.sizeM, 0) / 1000 * 10) / 10;
  const avgPremium = Math.round(convertibles.reduce((a, b) => a + b.conversionPremium, 0) / convertibles.length * 10) / 10;
  const avgDelta = Math.round(convertibles.reduce((a, b) => a + b.delta, 0) / convertibles.length * 100) / 100;
  const newIssuanceMTD = Math.round((2 + rng() * 6) * 10) / 10;
  const avgCoupon = Math.round(convertibles.reduce((a, b) => a + b.coupon, 0) / convertibles.length * 1000) / 1000;
  const spreadToTreasury = Math.round(convertibles.reduce((a, b) => a + b.creditSpread, 0) / convertibles.length);

  const marketSummary = {
    totalCBOutstandingB: totalOutstandingB,
    avgPremium,
    avgDelta,
    newIssuanceMTD,
    avgCoupon,
    spreadToTreasury,
  };

  // --- Greeks Analysis ---
  const totalDelta = Math.round(convertibles.reduce((a, b) => a + b.delta, 0) * 100) / 100;
  const totalGamma = Math.round(convertibles.reduce((a, b) => a + b.gamma, 0) * 10000) / 10000;
  const totalVega = Math.round(convertibles.reduce((_, _b, i) => {
    const v = 0.05 + ((rng() + i * 0.01) % 1) * 0.3;
    return _ + v;
  }, 0) * 1000) / 1000;
  const totalTheta = Math.round(convertibles.reduce((_, _b, i) => {
    const t = -0.003 - ((rng() + i * 0.02) % 1) * 0.02;
    return _ + t;
  }, 0) * 10000) / 10000;
  const convexity = Math.round((0.8 + rng() * 2.5) * 1000) / 1000;
  const creditDV01 = Math.round((500 + rng() * 3000) * 100) / 100;

  const greeksAnalysis = {
    totalDelta,
    totalGamma,
    totalVega,
    totalTheta,
    convexity,
    creditDV01,
  };

  // --- Rich/Cheap Analysis ---
  const deviations = convertibles.map(cb => {
    const deviation = (cb.marketPrice - cb.theoreticalValue) / cb.theoreticalValue * 100;
    const zScore = Math.round(deviation / (1.5 + rng() * 1.5) * 100) / 100;
    return {
      issuer: cb.issuer,
      ticker: cb.ticker,
      theoreticalValue: cb.theoreticalValue,
      marketPrice: cb.marketPrice,
      deviation: Math.round(deviation * 100) / 100,
      zScore,
    };
  });

  const sorted = [...deviations].sort((a, b) => b.deviation - a.deviation);
  const richCheap = {
    rich: sorted.slice(0, 5),
    cheap: sorted.slice(-5).reverse(),
  };

  return {
    convertibles,
    warrants,
    marketSummary,
    greeksAnalysis,
    richCheap,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[WarrantConvertible] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate warrant and convertible data' });
  }
});

export default router;
