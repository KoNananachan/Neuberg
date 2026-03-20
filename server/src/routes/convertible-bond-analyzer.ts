import { Router } from 'express';

const router = Router();

// ── PRNG ────────────────────────────────────────────────────────────────────

function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return h;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// ── Types ───────────────────────────────────────────────────────────────────

interface ConvertibleBond {
  issuer: string;
  ticker: string;
  coupon: number;
  maturity: string;
  conversionPrice: number;
  parity: number;
  premium: number;
  delta: number;
  impliedVol: number;
  creditSpread: number;
  yieldToPut: number;
  bondPrice: number;
  rating: string;
}

interface GreeksSummary {
  aggregateDelta: number;
  aggregateGamma: number;
  aggregateVega: number;
  aggregateTheta: number;
  aggregateRho: number;
}

interface CheapnessEntry {
  issuer: string;
  ticker: string;
  theoreticalValue: number;
  marketPrice: number;
  richCheapBps: number;
  indicator: 'RICH' | 'CHEAP' | 'FAIR';
}

interface SectorBreakdown {
  sector: string;
  count: number;
  outstandingBillions: number;
  avgPremium: number;
  avgDelta: number;
  avgCreditSpread: number;
}

interface NewIssuance {
  issuer: string;
  sizeMM: number;
  coupon: number;
  conversionPremium: number;
  maturity: string;
  bookRunner: string;
  status: 'priced' | 'launched' | 'expected';
}

interface PremiumTrendPoint {
  date: string;
  avgPremium: number;
  medianPremium: number;
  highPremium: number;
  lowPremium: number;
}

interface ConvertibleBondAnalyzerResponse {
  universe: ConvertibleBond[];
  greeksSummary: GreeksSummary;
  cheapnessAnalysis: CheapnessEntry[];
  sectorBreakdown: SectorBreakdown[];
  newIssuancePipeline: NewIssuance[];
  premiumTrend: PremiumTrendPoint[];
  generatedAt: string;
}

// ── Static Data ─────────────────────────────────────────────────────────────

const BOND_UNIVERSE = [
  { issuer: 'Tesla', ticker: 'TSLA', coupon: 2.0, maturity: '2028-08-15', convPrice: 280, stockBase: 248, rating: 'BB+', sector: 'Technology' },
  { issuer: 'Airbnb', ticker: 'ABNB', coupon: 0.0, maturity: '2026-03-15', convPrice: 195, stockBase: 156, rating: 'BB', sector: 'Consumer' },
  { issuer: 'MicroStrategy', ticker: 'MSTR', coupon: 0.625, maturity: '2030-03-15', convPrice: 2100, stockBase: 1620, rating: 'B-', sector: 'Technology' },
  { issuer: 'Shopify', ticker: 'SHOP', coupon: 0.125, maturity: '2027-11-01', convPrice: 105, stockBase: 79, rating: 'BB+', sector: 'Technology' },
  { issuer: 'ON Semiconductor', ticker: 'ON', coupon: 0.0, maturity: '2027-05-01', convPrice: 95, stockBase: 76, rating: 'BBB-', sector: 'Technology' },
  { issuer: 'Palo Alto Networks', ticker: 'PANW', coupon: 0.375, maturity: '2025-06-01', convPrice: 400, stockBase: 315, rating: 'BBB', sector: 'Technology' },
  { issuer: 'Uber', ticker: 'UBER', coupon: 0.0, maturity: '2025-12-01', convPrice: 85, stockBase: 73, rating: 'BB', sector: 'Technology' },
  { issuer: 'Block', ticker: 'SQ', coupon: 0.125, maturity: '2027-05-01', convPrice: 100, stockBase: 79, rating: 'BB', sector: 'Financials' },
  { issuer: 'Snap', ticker: 'SNAP', coupon: 0.75, maturity: '2028-08-01', convPrice: 22, stockBase: 14.5, rating: 'B', sector: 'Technology' },
  { issuer: 'Zillow', ticker: 'ZG', coupon: 2.75, maturity: '2025-05-15', convPrice: 75, stockBase: 56, rating: 'B+', sector: 'Consumer' },
  { issuer: 'Datadog', ticker: 'DDOG', coupon: 0.125, maturity: '2029-06-15', convPrice: 160, stockBase: 122, rating: 'BB+', sector: 'Technology' },
  { issuer: 'CrowdStrike', ticker: 'CRWD', coupon: 0.0, maturity: '2029-02-15', convPrice: 450, stockBase: 342, rating: 'BB+', sector: 'Technology' },
  { issuer: 'Dexcom', ticker: 'DXCM', coupon: 0.375, maturity: '2028-11-15', convPrice: 145, stockBase: 112, rating: 'BB', sector: 'Healthcare' },
  { issuer: 'Lululemon', ticker: 'LULU', coupon: 0.375, maturity: '2028-06-15', convPrice: 420, stockBase: 365, rating: 'BBB-', sector: 'Consumer' },
  { issuer: 'Western Digital', ticker: 'WDC', coupon: 3.0, maturity: '2028-11-15', convPrice: 58, stockBase: 48, rating: 'BB-', sector: 'Technology' },
  { issuer: 'Affirm', ticker: 'AFRM', coupon: 0.0, maturity: '2026-11-15', convPrice: 72, stockBase: 52, rating: 'B+', sector: 'Financials' },
  { issuer: 'DraftKings', ticker: 'DKNG', coupon: 0.0, maturity: '2028-03-15', convPrice: 60, stockBase: 43, rating: 'B+', sector: 'Consumer' },
  { issuer: 'Wayfair', ticker: 'W', coupon: 1.0, maturity: '2027-08-15', convPrice: 80, stockBase: 56, rating: 'B', sector: 'Consumer' },
  { issuer: 'Lam Research', ticker: 'LRCX', coupon: 1.5, maturity: '2029-06-15', convPrice: 820, stockBase: 710, rating: 'BBB', sector: 'Technology' },
  { issuer: 'Fortinet', ticker: 'FTNT', coupon: 0.0, maturity: '2029-03-15', convPrice: 110, stockBase: 88, rating: 'BBB-', sector: 'Technology' },
];

const SECTORS = ['Technology', 'Healthcare', 'Consumer', 'Financials', 'Industrials', 'Energy'];

const BOOK_RUNNERS = [
  'Goldman Sachs', 'J.P. Morgan', 'Morgan Stanley', 'BofA Securities',
  'Barclays', 'Citi', 'Deutsche Bank', 'Jefferies',
];

const PIPELINE_ISSUERS = [
  'Rivian', 'DoorDash', 'Twilio', 'MongoDB', 'Cloudflare',
  'Palantir', 'Marvell Technology', 'Trade Desk', 'Okta', 'Confluent',
];

const ISSUANCE_STATUSES: Array<'priced' | 'launched' | 'expected'> = ['priced', 'launched', 'expected'];

// ── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL = 60 * 60_000;
let cache: { data: ConvertibleBondAnalyzerResponse; ts: number } | null = null;

// ── Generator ───────────────────────────────────────────────────────────────

function generate(): ConvertibleBondAnalyzerResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('cb-analyzer-' + today);
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── Universe (20 bonds) ─────────────────────────────────────────────────

  const universe: ConvertibleBond[] = BOND_UNIVERSE.map(def => {
    const stockPrice = round(jitter(def.stockBase, 0.08));
    const conversionRatio = round(1000 / def.convPrice, 4);
    const parity = round(stockPrice * conversionRatio / 10);
    const moneyness = stockPrice / def.convPrice;

    // Premium: OTM bonds carry higher premium, ITM bonds lower
    const basePremium = moneyness < 0.85 ? 35 + rng() * 25
      : moneyness > 1.05 ? 5 + rng() * 12
      : 15 + rng() * 20;
    const premium = round(basePremium);

    // Delta: logistic function around moneyness=1
    const rawDelta = 1 / (1 + Math.exp(-5 * (moneyness - 1)));
    const delta = round(clamp(rawDelta + (rng() - 0.5) * 0.08, 0.05, 0.95));

    // Implied vol: higher for lower-rated / more volatile names
    const volBase = def.rating.startsWith('B') && !def.rating.startsWith('BB') ? 55 : 35;
    const impliedVol = round(clamp(volBase + (rng() - 0.5) * 20, 20, 80));

    // Credit spread: driven by rating
    const spreadBase = def.rating.startsWith('BBB') ? 120
      : def.rating.startsWith('BB') ? 220
      : 380;
    const creditSpread = Math.round(clamp(spreadBase + (rng() - 0.5) * 100, 60, 600));

    // Yield to put: function of coupon, credit spread, and time
    const yieldToPut = round(clamp(def.coupon + creditSpread / 200 + (rng() - 0.5) * 1.5, 0.5, 8));

    // Bond price: above parity by premium amount
    const bondPrice = round(parity * (1 + premium / 100));

    return {
      issuer: def.issuer,
      ticker: def.ticker,
      coupon: def.coupon,
      maturity: def.maturity,
      conversionPrice: def.convPrice,
      parity,
      premium,
      delta,
      impliedVol,
      creditSpread,
      yieldToPut,
      bondPrice,
      rating: def.rating,
    };
  });

  // ── Greeks Summary ──────────────────────────────────────────────────────

  const avgDelta = round(universe.reduce((s, b) => s + b.delta, 0) / universe.length);
  const aggregateGamma = round(clamp(
    universe.reduce((s, b) => {
      const m = 1 / (1 + Math.abs(b.delta - 0.5));
      return s + m * 0.04 * (0.8 + rng() * 0.4);
    }, 0) / universe.length,
    0.005, 0.05
  ), 4);
  const aggregateVega = round(clamp(0.15 + rng() * 0.30, 0.10, 0.50));
  const aggregateTheta = round(-(0.02 + rng() * 0.06));
  const aggregateRho = round(clamp(0.03 + rng() * 0.10, 0.02, 0.15));

  const greeksSummary: GreeksSummary = {
    aggregateDelta: avgDelta,
    aggregateGamma,
    aggregateVega,
    aggregateTheta,
    aggregateRho,
  };

  // ── Cheapness Analysis ──────────────────────────────────────────────────

  const cheapnessAnalysis: CheapnessEntry[] = universe.map(bond => {
    // Theoretical value differs from market price by -300 to +300 bps
    const cheapRichOffset = (rng() - 0.5) * 6; // percentage points
    const theoreticalValue = round(bond.bondPrice * (1 + cheapRichOffset / 100));
    const richCheapBps = Math.round((bond.bondPrice / theoreticalValue - 1) * 10000);

    let indicator: 'RICH' | 'CHEAP' | 'FAIR';
    if (richCheapBps > 50) indicator = 'RICH';
    else if (richCheapBps < -50) indicator = 'CHEAP';
    else indicator = 'FAIR';

    return {
      issuer: bond.issuer,
      ticker: bond.ticker,
      theoreticalValue,
      marketPrice: bond.bondPrice,
      richCheapBps,
      indicator,
    };
  });

  // ── Sector Breakdown ────────────────────────────────────────────────────

  const sectorBreakdown: SectorBreakdown[] = SECTORS.map(sector => {
    const inSector = universe.filter(b => {
      const def = BOND_UNIVERSE.find(d => d.ticker === b.ticker);
      return def?.sector === sector;
    });
    const count = inSector.length > 0 ? inSector.length : Math.floor(1 + rng() * 3);
    const outstandingBillions = inSector.length > 0
      ? round(inSector.length * jitter(6.5, 0.3), 1)
      : round(jitter(8, 0.4), 1);
    const avgPremium = inSector.length > 0
      ? round(inSector.reduce((s, b) => s + b.premium, 0) / inSector.length)
      : round(jitter(25, 0.25));
    const sectorAvgDelta = inSector.length > 0
      ? round(inSector.reduce((s, b) => s + b.delta, 0) / inSector.length)
      : round(jitter(0.45, 0.25));
    const avgCreditSpread = inSector.length > 0
      ? Math.round(inSector.reduce((s, b) => s + b.creditSpread, 0) / inSector.length)
      : Math.round(jitter(220, 0.3));

    return { sector, count, outstandingBillions, avgPremium, avgDelta: sectorAvgDelta, avgCreditSpread };
  });

  // ── New Issuance Pipeline ───────────────────────────────────────────────

  const newIssuancePipeline: NewIssuance[] = [];
  const usedIdx = new Set<number>();
  for (let i = 0; i < 5; i++) {
    let idx = Math.floor(rng() * PIPELINE_ISSUERS.length);
    while (usedIdx.has(idx)) idx = (idx + 1) % PIPELINE_ISSUERS.length;
    usedIdx.add(idx);

    const matYears = 5 + Math.floor(rng() * 4);
    const matYear = new Date().getFullYear() + matYears;
    const matMonth = String(1 + Math.floor(rng() * 12)).padStart(2, '0');

    newIssuancePipeline.push({
      issuer: PIPELINE_ISSUERS[idx],
      sizeMM: Math.round((300 + rng() * 1500) / 25) * 25,
      coupon: round(clamp(rng() * 2.5, 0, 3)),
      conversionPremium: round(clamp(25 + rng() * 20, 20, 50)),
      maturity: `${matYear}-${matMonth}-15`,
      bookRunner: BOOK_RUNNERS[Math.floor(rng() * BOOK_RUNNERS.length)],
      status: ISSUANCE_STATUSES[Math.floor(rng() * ISSUANCE_STATUSES.length)],
    });
  }

  // ── Historical Conversion Premium Trend (30 days) ───────────────────────

  const premiumTrend: PremiumTrendPoint[] = [];
  let trendBase = 28 + rng() * 6; // starting average premium around 28-34%
  for (let d = 29; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
    // Random walk with mean reversion toward ~30%
    trendBase += (30 - trendBase) * 0.05 + (rng() - 0.5) * 1.8;
    trendBase = clamp(trendBase, 22, 40);

    const avgPremium = round(trendBase);
    const spread = 3 + rng() * 5;
    const medianPremium = round(trendBase - 0.5 + rng() * 1.0);
    const highPremium = round(trendBase + spread);
    const lowPremium = round(trendBase - spread);

    premiumTrend.push({ date, avgPremium, medianPremium, highPremium, lowPremium });
  }

  return {
    universe,
    greeksSummary,
    cheapnessAnalysis,
    sectorBreakdown,
    newIssuancePipeline,
    premiumTrend,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ───────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ConvertibleBondAnalyzer] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate convertible bond analyzer data' });
  }
});

export default router;
