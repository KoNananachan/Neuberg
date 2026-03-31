import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Static definitions ──

const DV01_BUCKETS = ['0-1Y', '1-3Y', '3-5Y', '5-7Y', '7-10Y', '10-15Y', '15-20Y', '20+Y'];

const RATING_CATEGORIES = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'NR'];

const SECTORS = [
  'Financials',
  'Technology',
  'Healthcare',
  'Energy',
  'Industrials',
  'Consumer',
  'Utilities',
  'Telecom',
  'Real Estate',
  'Materials',
];

const MIGRATION_RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB'];

const ISSUER_DEFS = [
  { issuer: 'JPMorgan Chase & Co.', ticker: 'JPM', sector: 'Financials', baseRating: 'A' },
  { issuer: 'Apple Inc.', ticker: 'AAPL', sector: 'Technology', baseRating: 'AA' },
  { issuer: 'Johnson & Johnson', ticker: 'JNJ', sector: 'Healthcare', baseRating: 'AAA' },
  { issuer: 'ExxonMobil Corp.', ticker: 'XOM', sector: 'Energy', baseRating: 'AA' },
  { issuer: 'General Electric Co.', ticker: 'GE', sector: 'Industrials', baseRating: 'BBB' },
  { issuer: 'Bank of America Corp.', ticker: 'BAC', sector: 'Financials', baseRating: 'A' },
  { issuer: 'Microsoft Corp.', ticker: 'MSFT', sector: 'Technology', baseRating: 'AAA' },
  { issuer: 'Pfizer Inc.', ticker: 'PFE', sector: 'Healthcare', baseRating: 'A' },
  { issuer: 'Chevron Corp.', ticker: 'CVX', sector: 'Energy', baseRating: 'AA' },
  { issuer: 'AT&T Inc.', ticker: 'T', sector: 'Telecom', baseRating: 'BBB' },
  { issuer: 'Goldman Sachs Group', ticker: 'GS', sector: 'Financials', baseRating: 'A' },
  { issuer: 'Amazon.com Inc.', ticker: 'AMZN', sector: 'Technology', baseRating: 'AA' },
  { issuer: 'UnitedHealth Group', ticker: 'UNH', sector: 'Healthcare', baseRating: 'A' },
  { issuer: 'NextEra Energy Inc.', ticker: 'NEE', sector: 'Utilities', baseRating: 'A' },
  { issuer: 'Procter & Gamble Co.', ticker: 'PG', sector: 'Consumer', baseRating: 'AA' },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-credit-portfolio'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // ── 1. Portfolio Summary ──

  const totalNotional = round2(jitter(2_500_000_000, 0.08));
  const marketValue = round2(totalNotional * (0.96 + rng() * 0.06));
  const averageSpread = round2(jitter(142, 0.12));
  const ratingOptions = ['A-', 'A', 'A+', 'BBB+'];
  const averageRating = ratingOptions[Math.floor(rng() * ratingOptions.length)];
  const dv01 = round2(jitter(185000, 0.1));
  const spreadDuration = round2(jitter(4.85, 0.08));
  const yieldToWorst = round2(jitter(5.42, 0.06));
  const oasDuration = round2(jitter(4.62, 0.08));
  const numberOfPositions = Math.round(jitter(347, 0.1));

  const portfolioSummary = {
    totalNotional,
    marketValue,
    averageSpread,
    averageRating,
    dv01,
    spreadDuration,
    yieldToWorst,
    oasDuration,
    numberOfPositions,
  };

  // ── 2. DV01 Ladder ──

  const dv01BaseWeights = [0.04, 0.12, 0.20, 0.18, 0.22, 0.12, 0.07, 0.05];
  const rawDv01Weights = dv01BaseWeights.map((w) => jitter(w, 0.15));
  const dv01WeightSum = rawDv01Weights.reduce((a, b) => a + b, 0);
  const dv01Weights = rawDv01Weights.map((w) => w / dv01WeightSum);

  const dv01Ladder = DV01_BUCKETS.map((bucket, i) => {
    const bucketDv01 = round2(dv01 * dv01Weights[i]);
    const percentOfTotal = round2(dv01Weights[i] * 100);
    const bucketNotional = round2(totalNotional * dv01Weights[i]);
    const baseSpreads = [35, 68, 115, 148, 172, 195, 210, 235];
    const bucketSpread = round2(jitter(baseSpreads[i], 0.1));

    return {
      bucket,
      dv01: bucketDv01,
      percentOfTotal,
      notional: bucketNotional,
      averageSpread: bucketSpread,
    };
  });

  // ── 3. Rating Distribution ──

  const ratingBaseWeights = [0.03, 0.08, 0.22, 0.35, 0.15, 0.10, 0.04, 0.03];
  const rawRatingWeights = ratingBaseWeights.map((w) => jitter(w, 0.15));
  const ratingWeightSum = rawRatingWeights.reduce((a, b) => a + b, 0);
  const ratingWeights = rawRatingWeights.map((w) => w / ratingWeightSum);

  const baseSpreadsPerRating = [22, 42, 72, 125, 285, 420, 680, 195];
  const baseYieldsPerRating = [4.15, 4.45, 4.82, 5.35, 6.85, 8.20, 10.50, 5.65];

  const ratingDistribution = RATING_CATEGORIES.map((rating, i) => {
    const notional = round2(totalNotional * ratingWeights[i]);
    const percentOfTotal = round2(ratingWeights[i] * 100);
    const ratingSpread = round2(jitter(baseSpreadsPerRating[i], 0.1));
    const averageYield = round2(jitter(baseYieldsPerRating[i], 0.06));
    const ratingDv01 = round2(dv01 * ratingWeights[i]);

    return {
      rating,
      notional,
      percentOfTotal,
      averageSpread: ratingSpread,
      averageYield,
      dv01: ratingDv01,
    };
  });

  // ── 4. Sector Exposure ──

  const sectorBaseWeights = [0.22, 0.14, 0.12, 0.10, 0.10, 0.09, 0.07, 0.06, 0.05, 0.05];
  const benchmarkWeights = [0.20, 0.12, 0.11, 0.11, 0.10, 0.10, 0.08, 0.07, 0.06, 0.05];
  const rawSectorWeights = sectorBaseWeights.map((w) => jitter(w, 0.12));
  const sectorWeightSum = rawSectorWeights.reduce((a, b) => a + b, 0);
  const sectorWeights = rawSectorWeights.map((w) => w / sectorWeightSum);

  const sectorSpreads = [95, 82, 105, 165, 120, 110, 88, 130, 145, 135];
  const sectorRatings = ['A', 'AA', 'A', 'BBB', 'A-', 'A-', 'A+', 'BBB+', 'BBB+', 'BBB'];

  const sectorExposure = SECTORS.map((sector, i) => {
    const notional = round2(totalNotional * sectorWeights[i]);
    const percentOfTotal = round2(sectorWeights[i] * 100);
    const sectorSpread = round2(jitter(sectorSpreads[i], 0.1));
    const overUnderweight = round2((sectorWeights[i] - benchmarkWeights[i]) * 100);

    return {
      sector,
      notional,
      percentOfTotal,
      averageSpread: sectorSpread,
      averageRating: sectorRatings[i],
      overUnderweight,
    };
  });

  // ── 5. Migration Matrix (simplified 5x5 IG/HY) ──

  const migrationMatrix: {
    fromRating: string;
    toRating: string;
    probability: number;
    expectedLoss: number;
  }[] = [];

  // Base 1-year transition probabilities (realistic Moody's-style)
  const baseTransition: Record<string, Record<string, number>> = {
    AAA: { AAA: 90.0, AA: 8.0, A: 1.5, BBB: 0.4, BB: 0.1 },
    AA: { AAA: 0.7, AA: 90.5, A: 7.5, BBB: 1.0, BB: 0.3 },
    A: { AAA: 0.05, AA: 2.5, A: 91.0, BBB: 5.5, BB: 0.95 },
    BBB: { AAA: 0.02, AA: 0.2, A: 4.8, BBB: 89.0, BB: 5.98 },
    BB: { AAA: 0.01, AA: 0.05, A: 0.5, BBB: 7.5, BB: 91.94 },
  };

  const lossGivenMigration: Record<string, Record<string, number>> = {
    AAA: { AAA: 0, AA: 0.02, A: 0.08, BBB: 0.22, BB: 0.55 },
    AA: { AAA: 0, AA: 0, A: 0.03, BBB: 0.15, BB: 0.42 },
    A: { AAA: 0, AA: 0, A: 0, BBB: 0.08, BB: 0.35 },
    BBB: { AAA: 0, AA: 0, A: 0, BBB: 0, BB: 0.25 },
    BB: { AAA: 0, AA: 0, A: 0, BBB: 0, BB: 0 },
  };

  for (const from of MIGRATION_RATINGS) {
    for (const to of MIGRATION_RATINGS) {
      const baseProbability = baseTransition[from][to];
      const probability = round4(jitter(baseProbability, 0.05));
      const baseLoss = lossGivenMigration[from][to];
      const expectedLoss = round4(baseLoss > 0 ? jitter(baseLoss, 0.08) * (probability / 100) : 0);

      migrationMatrix.push({
        fromRating: from,
        toRating: to,
        probability,
        expectedLoss,
      });
    }
  }

  // ── 6. Top Issuer Concentration ──

  const issuerBaseNotionals = [
    185, 170, 160, 155, 145, 140, 130, 125, 120, 110, 105, 100, 95, 90, 85,
  ];
  const issuerBaseSpreads: Record<string, number> = {
    A: 78,
    AA: 48,
    AAA: 28,
    BBB: 145,
  };

  const topIssuers = ISSUER_DEFS.map((def, i) => {
    const notional = round2(jitter(issuerBaseNotionals[i] * 1_000_000, 0.1));
    const percentOfPortfolio = round2((notional / totalNotional) * 100);
    const spread = round2(jitter(issuerBaseSpreads[def.baseRating] || 100, 0.12));

    return {
      issuer: def.issuer,
      ticker: def.ticker,
      notional,
      percentOfPortfolio,
      rating: def.baseRating,
      spread,
      sector: def.sector,
    };
  });

  // ── 7. Risk Metrics ──

  const portfolioVar95 = round2(jitter(32_500_000, 0.1));
  const portfolioVar99 = round2(jitter(48_200_000, 0.1));
  const expectedShortfall = round2(jitter(56_800_000, 0.1));
  const creditVar = round2(jitter(72_400_000, 0.1));
  const spreadDV01 = round2(jitter(185_000, 0.1));

  const keyRateTenors = ['6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];
  const keyRateBaseExposures = [
    -2500, -8200, -22000, -28500, -45000, -32000, -28000, -15000, -8500, -4200,
  ];
  const keyRateExposures = keyRateTenors.map((tenor, i) => ({
    tenor,
    exposure: round2(jitter(keyRateBaseExposures[i], 0.12)),
  }));

  const riskMetrics = {
    portfolioVaR: {
      confidence95: portfolioVar95,
      confidence99: portfolioVar99,
    },
    expectedShortfall,
    creditVaR: creditVar,
    spreadDV01,
    keyRateExposures,
  };

  return {
    timestamp: new Date().toISOString(),
    portfolioSummary,
    dv01Ladder,
    ratingDistribution,
    sectorExposure,
    migrationMatrix,
    topIssuers,
    riskMetrics,
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
    console.error('[CreditPortfolio] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate credit portfolio data' });
  }
});

export default router;
