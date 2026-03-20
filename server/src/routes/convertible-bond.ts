import { Router } from 'express';

const router = Router();

// ── PRNG ──

function hashSeed(str: string): number { let hash = 0; for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash |= 0; } return Math.abs(hash); }
function mulberry32(a: number): () => number { return function () { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// ── Types ──

interface BondData {
  issuer: string;
  coupon: number;
  maturity: string;
  conversionPrice: number;
  conversionPremium: number;
  delta: number;
  price: number;
  yieldToMaturity: number;
  impliedVol: number;
  creditSpread: number;
  parity: number;
  cheapness: number;
}

interface NewIssuanceData {
  issuer: string;
  size: number;
  coupon: number;
  premium: number;
  maturity: string;
  underwriter: string;
  pricing: 'tight' | 'fair' | 'wide';
}

interface SectorData {
  sector: string;
  outstanding: number;
  avgDelta: number;
  avgPremium: number;
  avgCheapness: number;
}

interface ConvertibleBondResponse {
  marketOverview: {
    totalOutstanding: number;
    issuanceYTD: number;
    avgPremium: number;
    avgDelta: number;
    avgYieldToMaturity: number;
    avgCoupon: number;
  };
  bonds: BondData[];
  greeks: {
    avgDelta: number;
    avgGamma: number;
    avgVega: number;
    avgTheta: number;
    avgRho: number;
  };
  newIssuance: NewIssuanceData[];
  arbitrageMetrics: {
    avgCheapness: number;
    cheapBonds: number;
    richBonds: number;
    avgImpliedVol: number;
    avgRealizedVol: number;
    volSpread: number;
    hedgeCost: number;
  };
  sectorBreakdown: SectorData[];
}

// ── Static Data ──

const ISSUERS = [
  { name: 'Tesla', coupon: 2.0, maturity: '2028-08-15', convPrice: 280 },
  { name: 'Airbnb', coupon: 0.0, maturity: '2026-03-15', convPrice: 195 },
  { name: 'Shopify', coupon: 0.125, maturity: '2027-11-01', convPrice: 105 },
  { name: 'MicroStrategy', coupon: 0.625, maturity: '2028-09-15', convPrice: 2100 },
  { name: 'ON Semiconductor', coupon: 0.0, maturity: '2027-05-01', convPrice: 95 },
  { name: 'Palo Alto Networks', coupon: 0.375, maturity: '2025-06-01', convPrice: 400 },
  { name: 'Uber', coupon: 0.0, maturity: '2025-12-01', convPrice: 85 },
  { name: 'Block', coupon: 0.125, maturity: '2027-05-01', convPrice: 100 },
  { name: 'Snap', coupon: 0.75, maturity: '2028-08-01', convPrice: 22 },
  { name: 'Zillow', coupon: 2.75, maturity: '2025-05-15', convPrice: 75 },
];

const NEW_ISSUANCE_ISSUERS = ['CrowdStrike', 'Rivian', 'DoorDash', 'Twilio', 'MongoDB', 'Cloudflare'];
const UNDERWRITERS = ['Goldman Sachs', 'J.P. Morgan', 'Morgan Stanley', 'BofA Securities', 'Barclays', 'Citi'];
const PRICING_OPTIONS: Array<'tight' | 'fair' | 'wide'> = ['tight', 'fair', 'wide'];

const SECTORS: Array<{ sector: string; outBase: number }> = [
  { sector: 'Technology', outBase: 145 },
  { sector: 'Healthcare', outBase: 68 },
  { sector: 'Financials', outBase: 52 },
  { sector: 'Consumer Discretionary', outBase: 44 },
  { sector: 'Industrials', outBase: 38 },
];

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60_000;
let cache: { data: ConvertibleBondResponse; ts: number } | null = null;

// ── Generator ──

function generate(): ConvertibleBondResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('convertible-bond-' + today);
  const rng = mulberry32(seed);

  // ── Bonds ──

  const bonds: BondData[] = ISSUERS.map((iss) => {
    const conversionPremium = round(clamp(25 + (rng() - 0.5) * 40, 5, 60));
    const delta = round(clamp(0.3 + (rng() - 0.5) * 0.6, 0, 1));
    const price = round(clamp(80 + rng() * 50, 80, 130));
    const yieldToMaturity = round(clamp(1 + rng() * 4, 1, 5));
    const impliedVol = round(clamp(25 + rng() * 35, 20, 65));
    const creditSpread = Math.round(clamp(80 + rng() * 320, 50, 500));
    const parity = round(clamp(70 + rng() * 60, 60, 140));
    const cheapness = Math.round(clamp(-50 + rng() * 150, -50, 100));

    return {
      issuer: iss.name,
      coupon: iss.coupon,
      maturity: iss.maturity,
      conversionPrice: iss.convPrice,
      conversionPremium,
      delta,
      price,
      yieldToMaturity,
      impliedVol,
      creditSpread,
      parity,
      cheapness,
    };
  });

  // ── Market Overview ──

  const avgPremium = round(clamp(bonds.reduce((s, b) => s + b.conversionPremium, 0) / bonds.length, 25, 45));
  const avgDelta = round(clamp(bonds.reduce((s, b) => s + b.delta, 0) / bonds.length, 0.3, 0.6));
  const avgYieldToMaturity = round(clamp(bonds.reduce((s, b) => s + b.yieldToMaturity, 0) / bonds.length, 1, 5));
  const avgCoupon = round(clamp(bonds.reduce((s, b) => s + b.coupon, 0) / bonds.length, 0.5, 3));

  const marketOverview = {
    totalOutstanding: round(clamp(300 + rng() * 200, 300, 500), 1),
    issuanceYTD: round(clamp(30 + rng() * 50, 30, 80), 1),
    avgPremium,
    avgDelta,
    avgYieldToMaturity,
    avgCoupon,
  };

  // ── Greeks ──

  const avgGamma = round(clamp(0.01 + rng() * 0.04, 0.01, 0.05), 4);
  const avgVega = round(clamp(0.1 + rng() * 0.4, 0.1, 0.5));
  const avgTheta = round(-(0.02 + rng() * 0.08));
  const avgRho = round(0.02 + rng() * 0.12);

  const greeks = {
    avgDelta,
    avgGamma,
    avgVega,
    avgTheta,
    avgRho,
  };

  // ── New Issuance ──

  const usedIdx = new Set<number>();
  const newIssuance: NewIssuanceData[] = [];
  for (let i = 0; i < 3; i++) {
    let idx = Math.floor(rng() * NEW_ISSUANCE_ISSUERS.length);
    while (usedIdx.has(idx)) idx = (idx + 1) % NEW_ISSUANCE_ISSUERS.length;
    usedIdx.add(idx);

    const matYears = 5 + Math.floor(rng() * 4);
    const matYear = new Date().getFullYear() + matYears;
    const matMonth = String(1 + Math.floor(rng() * 12)).padStart(2, '0');

    newIssuance.push({
      issuer: NEW_ISSUANCE_ISSUERS[idx],
      size: Math.round((200 + rng() * 1300) / 25) * 25,
      coupon: round(clamp(rng() * 2.5, 0, 3)),
      premium: round(clamp(25 + rng() * 20, 20, 50)),
      maturity: `${matYear}-${matMonth}-15`,
      underwriter: UNDERWRITERS[Math.floor(rng() * UNDERWRITERS.length)],
      pricing: PRICING_OPTIONS[Math.floor(rng() * PRICING_OPTIONS.length)],
    });
  }

  // ── Arbitrage Metrics ──

  const avgImpliedVol = round(bonds.reduce((s, b) => s + b.impliedVol, 0) / bonds.length);
  const avgRealizedVol = round(clamp(avgImpliedVol - 5 + rng() * 10, 15, 60));
  const avgCheapness = Math.round(bonds.reduce((s, b) => s + b.cheapness, 0) / bonds.length);
  const cheapBonds = bonds.filter((b) => b.cheapness > 20).length;
  const richBonds = bonds.filter((b) => b.cheapness < -10).length;

  const arbitrageMetrics = {
    avgCheapness,
    cheapBonds,
    richBonds,
    avgImpliedVol,
    avgRealizedVol,
    volSpread: round(avgImpliedVol - avgRealizedVol),
    hedgeCost: Math.round(clamp(15 + rng() * 60, 10, 80)),
  };

  // ── Sector Breakdown ──

  const sectorBreakdown: SectorData[] = SECTORS.map((s) => ({
    sector: s.sector,
    outstanding: round(clamp(s.outBase * (0.85 + rng() * 0.3), s.outBase * 0.7, s.outBase * 1.3), 1),
    avgDelta: round(clamp(0.3 + rng() * 0.3, 0.3, 0.6)),
    avgPremium: round(clamp(25 + rng() * 20, 20, 50)),
    avgCheapness: Math.round(clamp(-30 + rng() * 80, -40, 60)),
  }));

  return {
    marketOverview,
    bonds,
    greeks,
    newIssuance,
    arbitrageMetrics,
    sectorBreakdown,
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
    console.error('[ConvertibleBond] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate convertible bond data' });
  }
});

export default router;
