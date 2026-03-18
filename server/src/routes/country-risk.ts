import { Router } from 'express';

const router = Router();

// ── Types ──

interface CountryRiskEntry {
  country: string;
  code: string;
  region: string;
  creditRating: string;
  ratingOutlook: string;
  cdsSpread5y: number;
  cdsChange1d: number;
  cdsChange1w: number;
  debtToGdp: number;
  fiscalBalance: number;
  currentAccount: number;
  inflation: number;
  policyRate: number;
  realRate: number;
  gdpGrowth: number;
  fxReserves: number;
  overallRiskScore: number;
  fiscalScore: number;
  externalScore: number;
  politicalScore: number;
  riskTier: string;
  cdsPercentile: number;
  cdsHistory: number[];
  alert: string | null;
}

interface CountryRiskResponse {
  entries: CountryRiskEntry[];
  globalRiskIndex: number;
  timestamp: string;
}

// ── Country Seed Data ──

interface CountrySeed {
  country: string;
  code: string;
  region: string;
  creditRating: string;
  ratingOutlook: string;
  cdsBase: number;
  debtToGdp: number;
  fiscalBalance: number;
  currentAccount: number;
  inflation: number;
  policyRate: number;
  gdpGrowth: number;
  fxReserves: number;
  overallRiskScore: number;
  fiscalScore: number;
  externalScore: number;
  politicalScore: number;
}

const COUNTRY_SEEDS: CountrySeed[] = [
  {
    country: 'United States', code: 'US', region: 'North America',
    creditRating: 'AA+', ratingOutlook: 'Stable',
    cdsBase: 32, debtToGdp: 123.4, fiscalBalance: -6.2, currentAccount: -3.1,
    inflation: 3.1, policyRate: 5.25, gdpGrowth: 2.5, fxReserves: 36.2,
    overallRiskScore: 85, fiscalScore: 55, externalScore: 72, politicalScore: 78,
  },
  {
    country: 'China', code: 'CN', region: 'Asia',
    creditRating: 'A+', ratingOutlook: 'Stable',
    cdsBase: 68, debtToGdp: 83.6, fiscalBalance: -7.1, currentAccount: 1.5,
    inflation: 0.3, policyRate: 3.45, gdpGrowth: 4.8, fxReserves: 3220,
    overallRiskScore: 72, fiscalScore: 62, externalScore: 80, politicalScore: 58,
  },
  {
    country: 'Japan', code: 'JP', region: 'Asia',
    creditRating: 'A+', ratingOutlook: 'Stable',
    cdsBase: 28, debtToGdp: 255.2, fiscalBalance: -5.8, currentAccount: 3.5,
    inflation: 3.2, policyRate: 0.25, gdpGrowth: 1.1, fxReserves: 1230,
    overallRiskScore: 78, fiscalScore: 35, externalScore: 88, politicalScore: 85,
  },
  {
    country: 'Germany', code: 'DE', region: 'Europe',
    creditRating: 'AAA', ratingOutlook: 'Stable',
    cdsBase: 18, debtToGdp: 64.3, fiscalBalance: -1.6, currentAccount: 6.2,
    inflation: 2.4, policyRate: 4.50, gdpGrowth: 0.3, fxReserves: 270,
    overallRiskScore: 92, fiscalScore: 88, externalScore: 95, politicalScore: 87,
  },
  {
    country: 'United Kingdom', code: 'GB', region: 'Europe',
    creditRating: 'AA', ratingOutlook: 'Stable',
    cdsBase: 35, debtToGdp: 101.2, fiscalBalance: -4.8, currentAccount: -3.2,
    inflation: 3.9, policyRate: 5.25, gdpGrowth: 0.6, fxReserves: 185,
    overallRiskScore: 80, fiscalScore: 58, externalScore: 68, politicalScore: 76,
  },
  {
    country: 'France', code: 'FR', region: 'Europe',
    creditRating: 'AA-', ratingOutlook: 'Negative',
    cdsBase: 42, debtToGdp: 111.8, fiscalBalance: -5.5, currentAccount: -0.8,
    inflation: 2.6, policyRate: 4.50, gdpGrowth: 0.9, fxReserves: 230,
    overallRiskScore: 76, fiscalScore: 50, externalScore: 72, politicalScore: 68,
  },
  {
    country: 'Italy', code: 'IT', region: 'Europe',
    creditRating: 'BBB', ratingOutlook: 'Stable',
    cdsBase: 105, debtToGdp: 140.6, fiscalBalance: -7.2, currentAccount: 0.5,
    inflation: 2.1, policyRate: 4.50, gdpGrowth: 0.7, fxReserves: 195,
    overallRiskScore: 58, fiscalScore: 30, externalScore: 65, politicalScore: 55,
  },
  {
    country: 'Spain', code: 'ES', region: 'Europe',
    creditRating: 'A', ratingOutlook: 'Positive',
    cdsBase: 62, debtToGdp: 107.5, fiscalBalance: -3.6, currentAccount: 2.1,
    inflation: 3.4, policyRate: 4.50, gdpGrowth: 2.4, fxReserves: 90,
    overallRiskScore: 68, fiscalScore: 42, externalScore: 75, politicalScore: 70,
  },
  {
    country: 'South Korea', code: 'KR', region: 'Asia',
    creditRating: 'AA', ratingOutlook: 'Stable',
    cdsBase: 38, debtToGdp: 54.3, fiscalBalance: -2.6, currentAccount: 3.8,
    inflation: 2.8, policyRate: 3.50, gdpGrowth: 2.2, fxReserves: 418,
    overallRiskScore: 82, fiscalScore: 78, externalScore: 88, politicalScore: 75,
  },
  {
    country: 'Brazil', code: 'BR', region: 'Latin America',
    creditRating: 'BB', ratingOutlook: 'Stable',
    cdsBase: 165, debtToGdp: 74.4, fiscalBalance: -8.1, currentAccount: -2.5,
    inflation: 4.5, policyRate: 13.75, gdpGrowth: 2.9, fxReserves: 340,
    overallRiskScore: 48, fiscalScore: 38, externalScore: 52, politicalScore: 42,
  },
  {
    country: 'India', code: 'IN', region: 'Asia',
    creditRating: 'BBB-', ratingOutlook: 'Positive',
    cdsBase: 98, debtToGdp: 83.1, fiscalBalance: -6.4, currentAccount: -1.2,
    inflation: 4.8, policyRate: 6.50, gdpGrowth: 6.5, fxReserves: 620,
    overallRiskScore: 60, fiscalScore: 48, externalScore: 65, politicalScore: 62,
  },
  {
    country: 'Mexico', code: 'MX', region: 'Latin America',
    creditRating: 'BBB', ratingOutlook: 'Negative',
    cdsBase: 118, debtToGdp: 52.8, fiscalBalance: -3.9, currentAccount: -1.4,
    inflation: 4.2, policyRate: 11.00, gdpGrowth: 3.2, fxReserves: 210,
    overallRiskScore: 55, fiscalScore: 58, externalScore: 62, politicalScore: 48,
  },
  {
    country: 'South Africa', code: 'ZA', region: 'Africa/ME',
    creditRating: 'BB-', ratingOutlook: 'Stable',
    cdsBase: 225, debtToGdp: 72.8, fiscalBalance: -5.5, currentAccount: -1.8,
    inflation: 5.3, policyRate: 8.25, gdpGrowth: 0.8, fxReserves: 58,
    overallRiskScore: 38, fiscalScore: 40, externalScore: 35, politicalScore: 32,
  },
  {
    country: 'Turkey', code: 'TR', region: 'Africa/ME',
    creditRating: 'B+', ratingOutlook: 'Positive',
    cdsBase: 310, debtToGdp: 35.2, fiscalBalance: -5.2, currentAccount: -4.1,
    inflation: 48.5, policyRate: 45.00, gdpGrowth: 4.5, fxReserves: 135,
    overallRiskScore: 30, fiscalScore: 55, externalScore: 28, politicalScore: 22,
  },
  {
    country: 'Russia', code: 'RU', region: 'Europe',
    creditRating: 'CCC', ratingOutlook: 'Negative',
    cdsBase: 1250, debtToGdp: 22.8, fiscalBalance: -2.3, currentAccount: 5.8,
    inflation: 8.5, policyRate: 16.00, gdpGrowth: 3.6, fxReserves: 580,
    overallRiskScore: 15, fiscalScore: 65, externalScore: 45, politicalScore: 8,
  },
  {
    country: 'Australia', code: 'AU', region: 'Oceania',
    creditRating: 'AAA', ratingOutlook: 'Stable',
    cdsBase: 20, debtToGdp: 52.1, fiscalBalance: -1.4, currentAccount: 1.2,
    inflation: 3.6, policyRate: 4.35, gdpGrowth: 1.5, fxReserves: 55,
    overallRiskScore: 90, fiscalScore: 82, externalScore: 85, politicalScore: 90,
  },
  {
    country: 'Canada', code: 'CA', region: 'North America',
    creditRating: 'AAA', ratingOutlook: 'Stable',
    cdsBase: 25, debtToGdp: 106.4, fiscalBalance: -1.1, currentAccount: -0.4,
    inflation: 2.8, policyRate: 4.50, gdpGrowth: 1.2, fxReserves: 108,
    overallRiskScore: 88, fiscalScore: 60, externalScore: 82, politicalScore: 92,
  },
  {
    country: 'Indonesia', code: 'ID', region: 'Asia',
    creditRating: 'BBB', ratingOutlook: 'Stable',
    cdsBase: 88, debtToGdp: 39.2, fiscalBalance: -2.3, currentAccount: -0.1,
    inflation: 3.1, policyRate: 6.25, gdpGrowth: 5.1, fxReserves: 138,
    overallRiskScore: 62, fiscalScore: 72, externalScore: 65, politicalScore: 58,
  },
  {
    country: 'Argentina', code: 'AR', region: 'Latin America',
    creditRating: 'CCC', ratingOutlook: 'Stable',
    cdsBase: 980, debtToGdp: 88.5, fiscalBalance: -4.4, currentAccount: -1.8,
    inflation: 142.0, policyRate: 40.00, gdpGrowth: -2.5, fxReserves: 28,
    overallRiskScore: 12, fiscalScore: 18, externalScore: 15, politicalScore: 20,
  },
  {
    country: 'Poland', code: 'PL', region: 'Europe',
    creditRating: 'A-', ratingOutlook: 'Stable',
    cdsBase: 52, debtToGdp: 49.8, fiscalBalance: -5.1, currentAccount: -1.0,
    inflation: 3.8, policyRate: 5.75, gdpGrowth: 3.5, fxReserves: 175,
    overallRiskScore: 72, fiscalScore: 68, externalScore: 72, politicalScore: 70,
  },
];

// ── Helpers ──

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function generateCdsHistory(base: number): number[] {
  const points: number[] = [];
  let current = base * (0.85 + Math.random() * 0.3);
  for (let i = 0; i < 20; i++) {
    current += (Math.random() - 0.48) * base * 0.04;
    current = Math.max(5, current);
    points.push(roundTo(current, 1));
  }
  return points;
}

function computeRiskTier(score: number): string {
  if (score >= 75) return 'LOW';
  if (score >= 55) return 'MODERATE';
  if (score >= 35) return 'ELEVATED';
  return 'HIGH';
}

function computeCdsPercentile(current: number, history: number[]): number {
  if (history.length === 0) return 50;
  const sorted = [...history].sort((a, b) => a - b);
  let count = 0;
  for (const v of sorted) {
    if (v < current) count++;
    else break;
  }
  return Math.round((count / sorted.length) * 100);
}

function determineAlert(
  cdsChange1d: number,
  cdsSpread5y: number,
  ratingOutlook: string,
  fiscalBalance: number,
  debtToGdp: number,
): string | null {
  // CDS spike: large 1-day move relative to spread level
  if (Math.abs(cdsChange1d) > cdsSpread5y * 0.08) return 'CDS_SPIKE';
  // Downgrade risk: negative outlook + weak fiscal position
  if (ratingOutlook === 'Negative' && fiscalBalance < -5 && debtToGdp > 90) return 'DOWNGRADE_RISK';
  // Fiscal stress: very high debt + large deficit
  if (debtToGdp > 130 && fiscalBalance < -6) return 'FISCAL_STRESS';
  return null;
}

function buildEntry(seed: CountrySeed): CountryRiskEntry {
  const cdsSpread5y = roundTo(jitter(seed.cdsBase, 0.06), 1);
  const cdsChange1d = roundTo((Math.random() - 0.45) * seed.cdsBase * 0.04, 1);
  const cdsChange1w = roundTo((Math.random() - 0.42) * seed.cdsBase * 0.08, 1);
  const cdsHistory = generateCdsHistory(seed.cdsBase);
  const cdsPercentile = computeCdsPercentile(cdsSpread5y, cdsHistory);

  const inflation = roundTo(jitter(seed.inflation, 0.03), 1);
  const policyRate = roundTo(seed.policyRate, 2);
  const realRate = roundTo(policyRate - inflation, 2);
  const overallRiskScore = Math.max(0, Math.min(100, Math.round(jitter(seed.overallRiskScore, 0.02))));

  const alert = determineAlert(
    cdsChange1d,
    cdsSpread5y,
    seed.ratingOutlook,
    seed.fiscalBalance,
    seed.debtToGdp,
  );

  return {
    country: seed.country,
    code: seed.code,
    region: seed.region,
    creditRating: seed.creditRating,
    ratingOutlook: seed.ratingOutlook,
    cdsSpread5y,
    cdsChange1d,
    cdsChange1w,
    debtToGdp: roundTo(seed.debtToGdp, 1),
    fiscalBalance: roundTo(seed.fiscalBalance, 1),
    currentAccount: roundTo(seed.currentAccount, 1),
    inflation,
    policyRate,
    realRate,
    gdpGrowth: roundTo(seed.gdpGrowth, 1),
    fxReserves: roundTo(seed.fxReserves, 1),
    overallRiskScore,
    fiscalScore: Math.max(0, Math.min(100, Math.round(jitter(seed.fiscalScore, 0.02)))),
    externalScore: Math.max(0, Math.min(100, Math.round(jitter(seed.externalScore, 0.02)))),
    politicalScore: Math.max(0, Math.min(100, Math.round(jitter(seed.politicalScore, 0.02)))),
    riskTier: computeRiskTier(overallRiskScore),
    cdsPercentile,
    cdsHistory,
    alert,
  };
}

function computeGlobalRiskIndex(entries: CountryRiskEntry[]): number {
  // GDP-weighted approximation: use overallRiskScore inversely
  // Higher scores = safer, so globalRiskIndex = weighted average inverted (100 - avg = risk)
  const weights: Record<string, number> = {
    US: 25, CN: 18, JP: 4.5, DE: 4, GB: 3.2, FR: 3, IT: 2.1, ES: 1.6,
    KR: 1.8, BR: 1.9, IN: 3.5, MX: 1.4, ZA: 0.4, TR: 0.9, RU: 1.8,
    AU: 1.6, CA: 2.0, ID: 1.3, AR: 0.5, PL: 0.7,
  };
  let totalWeight = 0;
  let weightedSum = 0;
  for (const entry of entries) {
    const w = weights[entry.code] ?? 1;
    weightedSum += (100 - entry.overallRiskScore) * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 30;
}

// ── Cache ──

let cache: { data: CountryRiskResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 15 * 60_000; // 15 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const entries = COUNTRY_SEEDS.map(buildEntry);
    const globalRiskIndex = computeGlobalRiskIndex(entries);

    const result: CountryRiskResponse = {
      entries,
      globalRiskIndex,
      timestamp: new Date().toISOString(),
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CountryRisk] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch country risk data' });
  }
});

export default router;
