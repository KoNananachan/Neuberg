import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Static Data ──

const SPONSORS = [
  'Swiss Re', 'Munich Re', 'Chubb', 'USAA', 'Tokio Marine',
  'Everest Re', 'Hannover Re', 'Allianz', 'AIG', 'Zurich',
];

const PERILS: { type: string; weight: number; regions: string[] }[] = [
  { type: 'Hurricane', weight: 0.40, regions: ['US Southeast', 'Caribbean', 'Multi-Region'] },
  { type: 'Earthquake', weight: 0.18, regions: ['US West Coast', 'Japan', 'Multi-Region'] },
  { type: 'Wildfire', weight: 0.10, regions: ['US West Coast', 'Multi-Region'] },
  { type: 'European Windstorm', weight: 0.09, regions: ['Europe'] },
  { type: 'Japan Typhoon', weight: 0.09, regions: ['Japan'] },
  { type: 'Flood', weight: 0.07, regions: ['US Southeast', 'Europe', 'Multi-Region'] },
  { type: 'Multi-Peril', weight: 0.07, regions: ['Multi-Region', 'US Southeast', 'US West Coast'] },
];

const TRIGGER_TYPES = ['Indemnity', 'Industry Loss', 'Parametric', 'Modeled Loss'] as const;
const RATINGS = ['BB', 'BB-', 'B+', 'B', 'B-', 'NR'] as const;
const TENORS = ['2Y', '3Y', '4Y'] as const;

const BOND_NAMES = [
  'Residential Re', 'Citrus Re', 'Pelican Re', 'Galileo Re', 'Kilimanjaro Re',
  'Everglades Re', 'Sakura Re', 'Atlas Re', 'Caelus Re', 'Frontline Re',
  'Torrey Pines Re', 'Blue Sky Re', 'Cascade Re', 'Tradewinds Re', 'Solaris Re',
];

const RECENT_EVENT_TEMPLATES = [
  { name: 'Hurricane Marlene', peril: 'Hurricane', lossRange: [8, 25] },
  { name: 'Tohoku Earthquake M6.8', peril: 'Earthquake', lossRange: [3, 12] },
  { name: 'California Wildfire Complex', peril: 'Wildfire', lossRange: [2, 8] },
  { name: 'Storm Xander (Europe)', peril: 'European Windstorm', lossRange: [4, 15] },
  { name: 'Midwest Flooding', peril: 'Flood', lossRange: [1, 6] },
];

const PIPELINE_TEMPLATES = [
  { name: 'Coral Re 2026-1', peril: 'Hurricane' },
  { name: 'Zenith Re 2026-2', peril: 'Earthquake' },
  { name: 'Pacific Re 2026-1', peril: 'Japan Typhoon' },
  { name: 'Ember Re 2026-1', peril: 'Wildfire' },
  { name: 'Spectrum Re 2026-1', peril: 'Multi-Peril' },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function pick<T>(arr: T[], rng: () => number): T {
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

function selectPeril(rng: () => number): typeof PERILS[number] {
  const r = rng();
  let cum = 0;
  for (const p of PERILS) {
    cum += p.weight;
    if (r < cum) return p;
  }
  return PERILS[0];
}

// Spreads correlate with expected loss: higher EL -> wider spread
function spreadFromEL(el: number, rng: () => number): number {
  // Base: ~60x EL in bps, with noise
  const base = el * 60;
  return Math.round(jitter(Math.max(300, Math.min(1200, base)), 0.12, rng));
}

// ── Generator ──

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-cat-bonds'));
  const currentYear = now.getFullYear();

  // Generate 15 cat bonds
  const bonds = BOND_NAMES.map((baseName, i) => {
    const vintage = currentYear - Math.floor(rng() * 3);
    const series = Math.floor(rng() * 3) + 1;
    const id = `${baseName} ${vintage}-${series}`;
    const sponsor = SPONSORS[i % SPONSORS.length];

    const perilInfo = selectPeril(rng);
    const peril = perilInfo.type;
    const region = pick(perilInfo.regions, rng);

    const size = Math.round(rangef(100, 500, rng));
    const expectedLoss = round(rangef(0.5, 8.0, rng), 2);
    const spread = spreadFromEL(expectedLoss, rng);
    const coupon = spread; // SOFR + spread bps

    // Parametric triggers tend to have wider spreads
    const triggerType = pick([...TRIGGER_TYPES], rng);
    const spreadAdj = triggerType === 'Parametric' ? Math.round(spread * 1.15) : spread;

    const tenor = pick([...TENORS], rng);
    const tenorYears = parseInt(tenor);
    const maturityYear = vintage + tenorYears;
    const maturityMonth = String(Math.floor(rng() * 12) + 1).padStart(2, '0');
    const maturity = `${maturityYear}-${maturityMonth}-15`;

    // Rating correlates with expected loss
    let rating: typeof RATINGS[number];
    if (expectedLoss < 1.5) rating = 'BB';
    else if (expectedLoss < 2.5) rating = pick(['BB', 'BB-'], rng);
    else if (expectedLoss < 4.0) rating = pick(['BB-', 'B+'], rng);
    else if (expectedLoss < 6.0) rating = pick(['B+', 'B'], rng);
    else rating = pick(['B', 'B-', 'NR'], rng);

    const price = round(rangef(95, 105, rng), 2);
    const change1d = round((rng() - 0.5) * 3, 2);

    const attachmentPoint = round(rangef(1.5, 8.0, rng), 2);
    const exhaustionPoint = round(attachmentPoint + rangef(2.0, 12.0, rng), 2);

    return {
      id,
      sponsor,
      peril,
      region,
      size,
      coupon: `SOFR + ${coupon}bps`,
      spread: spreadAdj,
      expectedLoss,
      rating,
      maturity,
      tenor,
      triggerType,
      price,
      change1d,
      attachmentPoint,
      exhaustionPoint,
    };
  });

  // Summary
  const totalOutstanding = round(jitter(45, 0.08, rng), 1);
  const totalIssuanceYTD = round(jitter(12.5, 0.15, rng), 1);
  const avgSpread = Math.round(bonds.reduce((s, b) => s + b.spread, 0) / bonds.length);
  const avgExpectedLoss = round(bonds.reduce((s, b) => s + b.expectedLoss, 0) / bonds.length, 2);
  const activeBonds = bonds.length;
  const totalSizeWeighted = bonds.reduce((s, b) => s + b.size, 0);
  const weightedAvgCoupon = Math.round(
    bonds.reduce((s, b) => s + b.spread * b.size, 0) / totalSizeWeighted
  );

  const summary = {
    totalOutstanding,
    totalOutstandingUnit: 'B USD',
    totalIssuanceYTD,
    totalIssuanceYTDUnit: 'B USD',
    avgSpread,
    avgSpreadUnit: 'bps',
    avgExpectedLoss,
    avgExpectedLossUnit: '%',
    activeBonds,
    weightedAvgCoupon,
    weightedAvgCouponUnit: 'bps',
  };

  // Peril breakdown
  const perilBreakdown = PERILS.map(p => {
    const perilBonds = bonds.filter(b => b.peril === p.type);
    const count = perilBonds.length;
    const totalPevilOutstanding = count > 0
      ? round(perilBonds.reduce((s, b) => s + b.size, 0) / 1000, 2)
      : 0;
    const avgPerilSpread = count > 0
      ? Math.round(perilBonds.reduce((s, b) => s + b.spread, 0) / count)
      : 0;
    const avgPerilEL = count > 0
      ? round(perilBonds.reduce((s, b) => s + b.expectedLoss, 0) / count, 2)
      : 0;
    const ytdReturn = round(rangef(-2, 8, rng), 2);

    return {
      peril: p.type,
      count,
      totalOutstanding: totalPevilOutstanding,
      totalOutstandingUnit: 'B USD',
      avgSpread: avgPerilSpread,
      avgSpreadUnit: 'bps',
      avgExpectedLoss: avgPerilEL,
      avgExpectedLossUnit: '%',
      ytdReturn,
      ytdReturnUnit: '%',
    };
  });

  // Recent events
  const recentEvents = RECENT_EVENT_TEMPLATES.map(evt => {
    const daysAgo = Math.floor(rng() * 90) + 1;
    const eventDate = new Date(now.getTime() - daysAgo * 86400000);
    const estimatedLoss = round(rangef(evt.lossRange[0], evt.lossRange[1], rng), 1);
    const bondsAffected = Math.floor(rangef(1, 6, rng));
    const avgPriceImpact = round(rangef(-8, -0.5, rng), 2);

    return {
      event: evt.name,
      date: eventDate.toISOString().slice(0, 10),
      peril: evt.peril,
      estimatedLoss,
      estimatedLossUnit: 'B USD',
      bondsAffected,
      avgPriceImpact,
      avgPriceImpactUnit: '%',
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Issuance pipeline
  const issuancePipeline = PIPELINE_TEMPLATES.map(tmpl => {
    const sponsor = pick(SPONSORS, rng);
    const size = Math.round(rangef(150, 400, rng));
    const daysUntilPricing = Math.floor(rangef(7, 60, rng));
    const pricingDate = new Date(now.getTime() + daysUntilPricing * 86400000);
    const spreadLow = Math.round(rangef(350, 700, rng));
    const spreadHigh = spreadLow + Math.round(rangef(50, 200, rng));

    return {
      name: tmpl.name,
      sponsor,
      peril: tmpl.peril,
      size,
      sizeUnit: 'M USD',
      expectedPricingDate: pricingDate.toISOString().slice(0, 10),
      expectedSpreadRange: `${spreadLow}-${spreadHigh}bps`,
    };
  });

  return {
    summary,
    bonds,
    perilBreakdown,
    recentEvents,
    issuancePipeline,
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
    console.error('[CatBonds] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate catastrophe bond data' });
  }
});

export default router;
