import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'] as const;
const TENOR_YEARS: Record<string, number> = { '1Y': 1, '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7, '10Y': 10, '15Y': 15, '20Y': 20, '25Y': 25, '30Y': 30 };

const ISSUERS = [
  { issuer: 'State of California', rating: 'AA-', type: 'GO' as const, state: 'CA' },
  { issuer: 'NYC GO', rating: 'AA', type: 'GO' as const, state: 'NY' },
  { issuer: 'TX Water Dev Board', rating: 'AAA', type: 'Revenue' as const, state: 'TX' },
  { issuer: 'IL Finance Authority', rating: 'BBB+', type: 'Revenue' as const, state: 'IL' },
  { issuer: 'FL Board of Education', rating: 'AA+', type: 'GO' as const, state: 'FL' },
  { issuer: 'NY Thruway Authority', rating: 'A+', type: 'Revenue' as const, state: 'NY' },
  { issuer: 'CA Health Facilities', rating: 'A', type: 'Revenue' as const, state: 'CA' },
  { issuer: 'TX Transportation Comm', rating: 'AAA', type: 'Revenue' as const, state: 'TX' },
  { issuer: 'MA Water Resources Auth', rating: 'AA+', type: 'Revenue' as const, state: 'MA' },
  { issuer: 'NJ Turnpike Authority', rating: 'A+', type: 'Revenue' as const, state: 'NJ' },
  { issuer: 'Chicago O\'Hare Airport', rating: 'A', type: 'Revenue' as const, state: 'IL' },
  { issuer: 'Metropolitan Transp Auth', rating: 'A', type: 'Revenue' as const, state: 'NY' },
  { issuer: 'Los Angeles DWP', rating: 'AA', type: 'Revenue' as const, state: 'CA' },
  { issuer: 'PA Turnpike Commission', rating: 'A+', type: 'Revenue' as const, state: 'PA' },
  { issuer: 'FL Hurricane Cat Fund', rating: 'AA', type: 'Revenue' as const, state: 'FL' },
];

const SECTORS = [
  { sector: 'GO', baseSpread: 0 },
  { sector: 'Water-Sewer', baseSpread: 12 },
  { sector: 'Transportation', baseSpread: 22 },
  { sector: 'Education', baseSpread: 18 },
  { sector: 'Healthcare', baseSpread: 35 },
  { sector: 'Housing', baseSpread: 28 },
];

const TAX_STATUSES = ['Tax-Exempt', 'Taxable', 'AMT'] as const;


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-muni-yield-curves'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Base AAA curve: realistic MMD-style yield curve
  // Short end anchored near fed funds, steepening through long end
  const aaaBaseYields: Record<string, number> = {
    '1Y': 2.45, '2Y': 2.55, '3Y': 2.65, '5Y': 2.80,
    '7Y': 2.95, '10Y': 3.10, '15Y': 3.35, '20Y': 3.55,
    '25Y': 3.65, '30Y': 3.72,
  };

  // Treasury base yields (slightly higher than munis for ratio calc)
  const treasuryBaseYields: Record<string, number> = {
    '1Y': 3.20, '2Y': 3.35, '3Y': 3.45, '5Y': 3.55,
    '7Y': 3.65, '10Y': 3.80, '15Y': 4.00, '20Y': 4.15,
    '25Y': 4.22, '30Y': 4.30,
  };

  // Rating spread adders (bp over AAA)
  const ratingSpreadBp: Record<string, number> = {
    'AAA': 0,
    'AA': 20 + Math.round((rng() - 0.5) * 10),   // 15-25bp
    'A': 55 + Math.round((rng() - 0.5) * 20),     // 45-65bp
  };

  // Generate yield curves for AAA, AA, A
  const ratings = ['AAA', 'AA', 'A'] as const;
  const yieldCurves = ratings.map(rating => {
    const spreadAdder = ratingSpreadBp[rating] / 100;
    const tenors = TENORS.map(tenor => {
      const baseYield = aaaBaseYields[tenor];
      const treasuryYield = Math.round(jitter(treasuryBaseYields[tenor], 0.02) * 1000) / 1000;
      const muniYield = Math.round(jitter(baseYield + spreadAdder, 0.03) * 1000) / 1000;
      const change1d = Math.round((rng() - 0.5) * 6 * 10) / 10; // -3 to +3 bp
      const muniTreasuryRatio = Math.round(muniYield / treasuryYield * 1000) / 10;

      return {
        tenor,
        yield: muniYield,
        change1d,
        muniTreasuryRatio,
      };
    });

    return { rating, tenors };
  });

  // Extract 10Y values for summary
  const aaaCurve = yieldCurves.find(c => c.rating === 'AAA')!;
  const aaCurve = yieldCurves.find(c => c.rating === 'AA')!;
  const aaa10Y = aaaCurve.tenors.find(t => t.tenor === '10Y')!;
  const aa10Y = aaCurve.tenors.find(t => t.tenor === '10Y')!;

  const summary = {
    aaaSpot10Y: aaa10Y.yield,
    aaSpot10Y: aa10Y.yield,
    muniTreasuryRatio10Y: aaa10Y.muniTreasuryRatio,
    totalIssuance: Math.round(jitter(285, 0.08) * 10) / 10,  // ~$250-320B YTD
    avgCoupon: Math.round(jitter(4.85, 0.04) * 100) / 100,
  };

  // Muni/Treasury ratios for key tenors with historical context
  const keyTenors = ['2Y', '5Y', '10Y', '20Y', '30Y'];
  const muniTreasuryRatios = keyTenors.map(tenor => {
    const aaaPoint = aaaCurve.tenors.find(t => t.tenor === tenor)!;
    const ratio = aaaPoint.muniTreasuryRatio;
    const percentile = Math.round(jitter(50, 0.6));
    const clampedPercentile = Math.max(5, Math.min(95, percentile));
    let signal: string;
    if (clampedPercentile < 25) signal = 'Rich';
    else if (clampedPercentile > 75) signal = 'Cheap';
    else signal = 'Fair';

    return { tenor, ratio, percentile: clampedPercentile, signal };
  });

  // Recent issuance (8 deals)
  const recentIssuance = Array.from({ length: 8 }, () => {
    const issuerData = ISSUERS[Math.floor(rng() * ISSUERS.length)];
    const maturityYears = [5, 7, 10, 15, 20, 25, 30][Math.floor(rng() * 7)];
    const matDate = new Date();
    matDate.setFullYear(matDate.getFullYear() + maturityYears);
    const coupon = Math.round(jitter(4.5 + (maturityYears > 15 ? 0.5 : 0), 0.08) * 100) / 100;
    const size = Math.round(jitter(issuerData.type === 'GO' ? 350 : 250, 0.5));
    const clampedSize = Math.max(50, Math.min(2000, size));
    const spread = Math.round(jitter(issuerData.type === 'GO' ? 8 : 18, 0.4));
    const taxIdx = rng();
    const taxStatus = taxIdx < 0.75 ? 'Tax-Exempt' : taxIdx < 0.92 ? 'Taxable' : 'AMT';

    return {
      issuer: issuerData.issuer,
      coupon,
      maturity: matDate.toISOString().slice(0, 10),
      rating: issuerData.rating,
      size: clampedSize,
      spread: Math.max(0, spread),
      type: issuerData.type,
      taxStatus,
    };
  });

  // Sector spreads (6 sectors)
  const sectorSpreads = SECTORS.map(s => {
    const spreadToAAA = Math.max(0, Math.round(jitter(s.baseSpread, 0.2)));
    const change1w = Math.round((rng() - 0.5) * 8 * 10) / 10; // -4 to +4 bp
    const change1m = Math.round((rng() - 0.5) * 16 * 10) / 10; // -8 to +8 bp

    return {
      sector: s.sector,
      spreadToAAA,
      change1w,
      change1m,
    };
  });

  return {
    summary,
    yieldCurves,
    muniTreasuryRatios,
    recentIssuance,
    sectorSpreads,
    generatedAt: new Date().toISOString(),
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
    console.error('[MuniYieldCurves] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate muni yield curve data' });
  }
});

export default router;
