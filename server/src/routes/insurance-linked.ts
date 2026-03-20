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

const CAT_BOND_TEMPLATES = [
  { name: 'Citrus Re 2024-1', sponsor: 'Citizens Property' },
  { name: 'Pelican Re 2025-A', sponsor: 'USAA' },
  { name: 'Kilimanjaro Re 2024-2', sponsor: 'Zurich' },
  { name: 'Matterhorn Re 2025-1', sponsor: 'Swiss Re' },
  { name: 'Residential Re 2024-3', sponsor: 'USAA' },
  { name: 'Sakura Re 2025-1', sponsor: 'Tokio Marine' },
  { name: 'Everglades Re 2024-1', sponsor: 'Citizens Property' },
  { name: 'Atlas Re 2025-2', sponsor: 'Munich Re' },
  { name: 'Caelus Re 2024-1', sponsor: 'Zurich' },
  { name: 'Frontline Re 2025-1', sponsor: 'Hannover Re' },
  { name: 'Galileo Re 2024-2', sponsor: 'Swiss Re' },
  { name: 'Torrey Pines Re 2025-1', sponsor: 'Allianz' },
];

const PERILS = ['US Hurricane', 'US Earthquake', 'Japan Typhoon', 'EU Wind', 'Multi-Peril'] as const;
const RATINGS = ['BB', 'BB-', 'B+', 'NR'] as const;

const ILW_PERILS = ['US Hurricane', 'US Earthquake', 'Japan Typhoon', 'EU Wind', 'Japan Earthquake', 'US Severe Convective Storm'] as const;

const REINSURANCE_LINES = [
  'US Property Cat', 'Japan Quake', 'EU Wind', 'Marine', 'Aviation', 'Cyber',
] as const;

const PIPELINE_TEMPLATES = [
  { name: 'Coral Re 2026-1', sponsor: 'Swiss Re', peril: 'US Hurricane' as const, status: 'Marketing' as const },
  { name: 'Zenith Re 2026-2', sponsor: 'Zurich', peril: 'US Earthquake' as const, status: 'Pricing' as const },
  { name: 'Pacific Re 2026-1', sponsor: 'Tokio Marine', peril: 'Japan Typhoon' as const, status: 'Roadshow' as const },
  { name: 'Spectrum Re 2026-1', sponsor: 'Munich Re', peril: 'Multi-Peril' as const, status: 'Marketing' as const },
];

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

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

// -- Generator --

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-insurance-linked'));

  // 1. Cat Bond Secondary (12 bonds)
  const catBondSecondary = CAT_BOND_TEMPLATES.map(tmpl => {
    const peril = pick(PERILS, rng);
    const expectedLoss = round(rangef(1.0, 6.0, rng), 2);

    // Spread correlates with expected loss: higher EL -> wider spread, range 300-800bp
    const spreadBase = 300 + (expectedLoss / 6.0) * 500;
    const couponSpread = Math.round(spreadBase * (1 + (rng() - 0.5) * 0.2));
    const clampedSpread = Math.max(300, Math.min(800, couponSpread));

    const price = round(rangef(94, 106, rng), 2);

    // Attachment and exhaustion points: 3-15% range
    const attachmentPoint = round(rangef(3.0, 15.0, rng), 2);
    const exhaustionPoint = round(attachmentPoint + rangef(3.0, 12.0, rng), 2);

    // Maturity: 1-3 years from now
    const maturityYear = now.getFullYear() + Math.floor(rangef(1, 4, rng));
    const maturityMonth = String(Math.floor(rng() * 12) + 1).padStart(2, '0');
    const maturity = `${maturityYear}-${maturityMonth}-15`;

    // Rating correlates with expected loss
    let rating: typeof RATINGS[number];
    if (expectedLoss < 2.0) rating = pick(['BB', 'BB-'] as const, rng);
    else if (expectedLoss < 4.0) rating = pick(['BB-', 'B+'] as const, rng);
    else rating = pick(['B+', 'NR'] as const, rng);

    return {
      name: tmpl.name,
      sponsor: tmpl.sponsor,
      peril,
      couponSpread: clampedSpread,
      couponSpreadUnit: 'bps',
      price,
      priceUnit: 'cents',
      expectedLoss,
      expectedLossUnit: '%',
      attachmentPoint,
      attachmentPointUnit: '%',
      exhaustionPoint,
      exhaustionPointUnit: '%',
      maturity,
      rating,
    };
  });

  // 1. Summary (derived from bonds + jittered market-level figures)
  const avgSpread = Math.round(catBondSecondary.reduce((s, b) => s + b.couponSpread, 0) / catBondSecondary.length);
  const expectedLossAvg = round(catBondSecondary.reduce((s, b) => s + b.expectedLoss, 0) / catBondSecondary.length, 2);

  const summary = {
    totalOutstanding: round(rangef(40, 45, rng), 1),
    totalOutstandingUnit: 'B USD',
    newIssuanceYTD: round(rangef(8, 16, rng), 1),
    newIssuanceYTDUnit: 'B USD',
    avgSpread,
    avgSpreadUnit: 'bps over T-bills',
    lossesYTD: Math.round(rangef(200, 800, rng)),
    lossesYTDUnit: 'M USD',
    expectedLossAvg,
    expectedLossAvgUnit: '%',
  };

  // 3. ILW Rates (6 industry loss warranties)
  const ilwRates = ILW_PERILS.map(peril => {
    const trigger = round(rangef(10, 80, rng), 1);
    const rate = round(rangef(3, 15, rng), 2);
    const change1y = round(rangef(-10, 20, rng), 1);
    const capacity = Math.round(rangef(100, 600, rng));
    return {
      peril,
      trigger,
      triggerUnit: 'B USD',
      rate,
      rateUnit: '% of limit',
      change1y,
      change1yUnit: '%',
      capacity,
      capacityUnit: 'M USD',
    };
  });

  // 4. Reinsurance Pricing (6 lines)
  const reinsurancePricing = REINSURANCE_LINES.map(line => {
    // US Property Cat has higher RoL (6-10%), others vary
    let rolBase: number;
    if (line === 'US Property Cat') rolBase = rangef(6, 10, rng);
    else if (line === 'Japan Quake') rolBase = rangef(4, 8, rng);
    else if (line === 'EU Wind') rolBase = rangef(3, 7, rng);
    else if (line === 'Cyber') rolBase = rangef(8, 15, rng);
    else rolBase = rangef(2, 6, rng);

    const rateOnLine = round(rolBase, 2);
    const change1y = round(rangef(-5, 15, rng), 1);
    const lossRatio = round(rangef(40, 85, rng), 1);
    const combinedRatio = round(lossRatio + rangef(15, 35, rng), 1);

    return {
      line,
      rateOnLine,
      rateOnLineUnit: '%',
      change1y,
      change1yUnit: '%',
      lossRatio,
      lossRatioUnit: '%',
      combinedRatio,
      combinedRatioUnit: '%',
    };
  });

  // 5. Pipeline (4 upcoming)
  const pipeline = PIPELINE_TEMPLATES.map(tmpl => {
    const expectedSize = Math.round(rangef(150, 500, rng));
    const spreadBase = Math.round(rangef(300, 800, rng));
    return {
      name: tmpl.name,
      sponsor: tmpl.sponsor,
      expectedSize,
      expectedSizeUnit: 'M USD',
      peril: tmpl.peril,
      expectedSpread: spreadBase,
      expectedSpreadUnit: 'bps',
      status: tmpl.status,
    };
  });

  return {
    summary,
    catBondSecondary,
    ilwRates,
    reinsurancePricing,
    pipeline,
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
    console.error('[InsuranceLinked] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate insurance-linked securities data' });
  }
});

export default router;
