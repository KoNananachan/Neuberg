import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface KeyRateDuration {
  tenor: string;
  portfolio: number;
  benchmark: number;
  difference: number;
}

interface PortfolioSummary {
  effectiveDuration: number;
  modifiedDuration: number;
  macaulayDuration: number;
  spreadDuration: number;
  keyRateDurations: KeyRateDuration[];
  convexity: number;
  dv01: number;
  portfolioYield: number;
  benchmarkDuration: number;
  benchmarkConvexity: number;
  benchmarkYield: number;
  durationGap: number;
}

interface PositionAnalytics {
  cusip: string;
  name: string;
  coupon: number;
  maturityDate: string;
  parAmount: number;
  marketValue: number;
  effectiveDuration: number;
  convexity: number;
  spreadDuration: number;
  oas: number;
  contributionToDuration: number;
}

interface DurationGapBucket {
  tenor: string;
  portfolioDuration: number;
  benchmarkDuration: number;
  gap: number;
  signal: 'OVERWEIGHT' | 'UNDERWEIGHT' | 'NEUTRAL';
  bpSensitivity: number;
}

interface ScenarioShift {
  shiftBps: number;
  priceChangeFromDuration: number;
  priceChangeFromConvexity: number;
  totalPriceChange: number;
}

interface SectorDuration {
  sector: string;
  weight: number;
  effectiveDuration: number;
  spreadDuration: number;
  contributionToDuration: number;
}

interface HedgingRecommendation {
  action: 'BUY' | 'SELL';
  instrument: string;
  notional: number;
  rationale: string;
  expectedDurationImpact: number;
  expectedConvexityImpact: number;
}

interface DurationManagementResponse {
  portfolioSummary: PortfolioSummary;
  positions: PositionAnalytics[];
  durationGapAnalysis: DurationGapBucket[];
  scenarioAnalysis: ScenarioShift[];
  sectorBreakdown: SectorDuration[];
  hedgingRecommendations: HedgingRecommendation[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: DurationManagementResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Static data ──

const BOND_UNIVERSE = [
  { cusip: '912810TM0', name: 'UST 4.250 02/15/2054', coupon: 4.25, maturity: '2054-02-15', sector: 'Treasury' },
  { cusip: '912810TS7', name: 'UST 4.625 05/15/2054', coupon: 4.625, maturity: '2054-05-15', sector: 'Treasury' },
  { cusip: '912810SN9', name: 'UST 3.625 02/15/2053', coupon: 3.625, maturity: '2053-02-15', sector: 'Treasury' },
  { cusip: '3130AQHJ6', name: 'FHLB 4.875 03/11/2033', coupon: 4.875, maturity: '2033-03-11', sector: 'Agency' },
  { cusip: '3135G06F1', name: 'FNMA 5.000 01/25/2034', coupon: 5.0, maturity: '2034-01-25', sector: 'Agency' },
  { cusip: '31418EHB4', name: 'FNMA 30YR MBS 5.500', coupon: 5.5, maturity: '2053-07-01', sector: 'MBS' },
  { cusip: '31418DYP5', name: 'FNMA 30YR MBS 5.000', coupon: 5.0, maturity: '2052-11-01', sector: 'MBS' },
  { cusip: '594918CE4', name: 'Microsoft 4.200 11/03/2035', coupon: 4.2, maturity: '2035-11-03', sector: 'IG Corporate' },
  { cusip: '037833DX5', name: 'Apple 4.100 08/08/2062', coupon: 4.1, maturity: '2062-08-08', sector: 'IG Corporate' },
  { cusip: '459200KP6', name: 'IBM 4.500 01/15/2033', coupon: 4.5, maturity: '2033-01-15', sector: 'IG Corporate' },
  { cusip: '172967MR0', name: 'Citigroup 5.610 09/29/2026', coupon: 5.61, maturity: '2026-09-29', sector: 'IG Corporate' },
  { cusip: '345370DA5', name: 'Ford Motor 6.100 08/19/2032', coupon: 6.1, maturity: '2032-08-19', sector: 'HY Corporate' },
  { cusip: '539830BM4', name: 'Live Nation 6.500 05/15/2027', coupon: 6.5, maturity: '2027-05-15', sector: 'HY Corporate' },
  { cusip: '195325CW4', name: 'Colombia 7.500 02/02/2034', coupon: 7.5, maturity: '2034-02-02', sector: 'EM' },
  { cusip: '900123DB5', name: 'State of Texas GO 4.000 08/01/2042', coupon: 4.0, maturity: '2042-08-01', sector: 'Muni' },
];

const TENORS = ['2Y', '5Y', '10Y', '20Y', '30Y'];

const SECTORS = ['Treasury', 'Agency', 'MBS', 'IG Corporate', 'HY Corporate', 'EM', 'Muni'];

const SCENARIO_SHIFTS = [-100, -50, -25, 25, 50, 100];

// ── Data generation ──

function generatePortfolioSummary(rng: () => number, positions: PositionAnalytics[]): PortfolioSummary {
  const totalMV = positions.reduce((sum, p) => sum + p.marketValue, 0);

  // Weighted average duration
  const effectiveDuration = positions.reduce(
    (sum, p) => sum + p.effectiveDuration * (p.marketValue / totalMV), 0,
  );
  const modifiedDuration = effectiveDuration * (1 - 0.01 * (rng() - 0.5));
  const macaulayDuration = effectiveDuration * (1 + 0.02 * rng());
  const spreadDuration = positions.reduce(
    (sum, p) => sum + p.spreadDuration * (p.marketValue / totalMV), 0,
  );
  const convexity = positions.reduce(
    (sum, p) => sum + p.convexity * (p.marketValue / totalMV), 0,
  );
  const portfolioYield = positions.reduce(
    (sum, p) => sum + (p.coupon + (rng() - 0.5) * 0.3) * (p.marketValue / totalMV), 0,
  );
  const dv01 = Math.round(effectiveDuration * totalMV * 0.0001 * 100) / 100;

  // Benchmark (AGG) values
  const benchmarkDuration = 6.15 + (rng() - 0.5) * 0.3;
  const benchmarkConvexity = 0.55 + (rng() - 0.5) * 0.1;
  const benchmarkYield = 4.85 + (rng() - 0.5) * 0.2;

  // Key rate durations
  const krdBases = [0.35, 1.10, 2.20, 1.60, 1.05];
  const benchKrdBases = [0.40, 1.25, 2.05, 1.50, 0.95];

  const keyRateDurations: KeyRateDuration[] = TENORS.map((tenor, i) => {
    const portfolio = Math.round((krdBases[i] + (rng() - 0.5) * 0.3) * 1000) / 1000;
    const benchmark = Math.round((benchKrdBases[i] + (rng() - 0.5) * 0.15) * 1000) / 1000;
    return {
      tenor,
      portfolio,
      benchmark,
      difference: Math.round((portfolio - benchmark) * 1000) / 1000,
    };
  });

  return {
    effectiveDuration: Math.round(effectiveDuration * 1000) / 1000,
    modifiedDuration: Math.round(modifiedDuration * 1000) / 1000,
    macaulayDuration: Math.round(macaulayDuration * 1000) / 1000,
    spreadDuration: Math.round(spreadDuration * 1000) / 1000,
    keyRateDurations,
    convexity: Math.round(convexity * 1000) / 1000,
    dv01,
    portfolioYield: Math.round(portfolioYield * 1000) / 1000,
    benchmarkDuration: Math.round(benchmarkDuration * 1000) / 1000,
    benchmarkConvexity: Math.round(benchmarkConvexity * 1000) / 1000,
    benchmarkYield: Math.round(benchmarkYield * 1000) / 1000,
    durationGap: Math.round((effectiveDuration - benchmarkDuration) * 1000) / 1000,
  };
}

function generatePositions(rng: () => number): PositionAnalytics[] {
  return BOND_UNIVERSE.map((bond) => {
    const maturityYear = parseInt(bond.maturity.slice(0, 4), 10);
    const currentYear = 2026;
    const yearsToMaturity = maturityYear - currentYear;

    // Par amount: $5M to $50M
    const parAmount = Math.round((5 + rng() * 45) * 1000000);
    // Price around par, varies by coupon and maturity
    const priceBase = 95 + rng() * 12;
    const marketValue = Math.round(parAmount * priceBase / 100);

    // Duration scales with maturity, MBS has negative convexity
    const isMBS = bond.sector === 'MBS';
    const isShort = yearsToMaturity < 5;
    const durationBase = isShort
      ? yearsToMaturity * (0.85 + rng() * 0.1)
      : isMBS
        ? yearsToMaturity * 0.25 + rng() * 1.5
        : yearsToMaturity * (0.55 + rng() * 0.15);
    const effectiveDuration = Math.round(Math.max(0.3, Math.min(25, durationBase)) * 1000) / 1000;

    // Convexity: MBS is negative, long bonds are high positive
    const convexityBase = isMBS
      ? -0.8 - rng() * 1.2
      : yearsToMaturity > 20
        ? 2.0 + rng() * 3.0
        : 0.1 + rng() * 1.5;
    const convexity = Math.round(convexityBase * 1000) / 1000;

    // Spread duration: Treasuries have zero, corporates have similar to eff dur
    const isTreasury = bond.sector === 'Treasury';
    const spreadDuration = isTreasury
      ? 0
      : Math.round(effectiveDuration * (0.85 + rng() * 0.15) * 1000) / 1000;

    // OAS: varies by sector
    const oasMap: Record<string, [number, number]> = {
      'Treasury': [0, 0],
      'Agency': [5, 25],
      'MBS': [40, 90],
      'IG Corporate': [60, 150],
      'HY Corporate': [280, 520],
      'EM': [180, 380],
      'Muni': [20, 80],
    };
    const [oasLow, oasHigh] = oasMap[bond.sector] || [0, 0];
    const oas = Math.round(oasLow + rng() * (oasHigh - oasLow));

    return {
      cusip: bond.cusip,
      name: bond.name,
      coupon: bond.coupon,
      maturityDate: bond.maturity,
      parAmount,
      marketValue,
      effectiveDuration,
      convexity,
      spreadDuration,
      oas,
      contributionToDuration: 0, // computed after all positions generated
    };
  });
}

function computeDurationContributions(positions: PositionAnalytics[]): void {
  const totalMV = positions.reduce((sum, p) => sum + p.marketValue, 0);
  for (const p of positions) {
    p.contributionToDuration = Math.round(
      (p.effectiveDuration * p.marketValue / totalMV) * 1000,
    ) / 1000;
  }
}

function generateDurationGapAnalysis(rng: () => number, summary: PortfolioSummary): DurationGapBucket[] {
  return summary.keyRateDurations.map((krd) => {
    const gap = krd.difference;
    const totalMV = 500_000_000; // approximate portfolio MV for bp sensitivity
    const bpSensitivity = Math.round(Math.abs(gap) * totalMV * 0.0001 * 100) / 100;

    let signal: 'OVERWEIGHT' | 'UNDERWEIGHT' | 'NEUTRAL';
    if (gap > 0.05) {
      signal = 'OVERWEIGHT';
    } else if (gap < -0.05) {
      signal = 'UNDERWEIGHT';
    } else {
      signal = 'NEUTRAL';
    }

    return {
      tenor: krd.tenor,
      portfolioDuration: krd.portfolio,
      benchmarkDuration: krd.benchmark,
      gap: Math.round(gap * 1000) / 1000,
      signal,
      bpSensitivity,
    };
  });
}

function generateScenarioAnalysis(summary: PortfolioSummary): ScenarioShift[] {
  const dur = summary.effectiveDuration;
  const cvx = summary.convexity;

  return SCENARIO_SHIFTS.map((shiftBps) => {
    const dy = shiftBps / 10000; // convert bps to decimal
    // Price change from duration: -D * dy * 100
    const priceChangeFromDuration = Math.round(-dur * dy * 100 * 1000) / 1000;
    // Price change from convexity: 0.5 * C * dy^2 * 100
    const priceChangeFromConvexity = Math.round(0.5 * cvx * dy * dy * 100 * 1000) / 1000;
    const totalPriceChange = Math.round((priceChangeFromDuration + priceChangeFromConvexity) * 1000) / 1000;

    return {
      shiftBps,
      priceChangeFromDuration,
      priceChangeFromConvexity,
      totalPriceChange,
    };
  });
}

function generateSectorBreakdown(rng: () => number, positions: PositionAnalytics[]): SectorDuration[] {
  const totalMV = positions.reduce((sum, p) => sum + p.marketValue, 0);

  // Map positions back to sectors using BOND_UNIVERSE
  const sectorMap = new Map<string, { mv: number; durContrib: number; spreadContrib: number }>();
  for (const sector of SECTORS) {
    sectorMap.set(sector, { mv: 0, durContrib: 0, spreadContrib: 0 });
  }

  for (let i = 0; i < positions.length; i++) {
    const bond = BOND_UNIVERSE[i];
    const pos = positions[i];
    const entry = sectorMap.get(bond.sector);
    if (entry) {
      entry.mv += pos.marketValue;
      entry.durContrib += pos.effectiveDuration * pos.marketValue;
      entry.spreadContrib += pos.spreadDuration * pos.marketValue;
    }
  }

  return SECTORS.map((sector) => {
    const entry = sectorMap.get(sector)!;
    const weight = totalMV > 0 ? Math.round((entry.mv / totalMV) * 10000) / 100 : 0;
    const effectiveDuration = entry.mv > 0
      ? Math.round((entry.durContrib / entry.mv) * 1000) / 1000
      : 0;
    const spreadDuration = entry.mv > 0
      ? Math.round((entry.spreadContrib / entry.mv) * 1000) / 1000
      : 0;
    const contributionToDuration = totalMV > 0
      ? Math.round((entry.durContrib / totalMV) * 1000) / 1000
      : 0;

    return {
      sector,
      weight,
      effectiveDuration,
      spreadDuration,
      contributionToDuration,
    };
  });
}

function generateHedgingRecommendations(
  rng: () => number,
  summary: PortfolioSummary,
  gapAnalysis: DurationGapBucket[],
): HedgingRecommendation[] {
  const recommendations: HedgingRecommendation[] = [];

  // 1. Overall duration alignment trade
  if (Math.abs(summary.durationGap) > 0.1) {
    const isLong = summary.durationGap > 0;
    const notional = Math.round(Math.abs(summary.durationGap) * 50_000_000);
    recommendations.push({
      action: isLong ? 'SELL' : 'BUY',
      instrument: 'TY (10Y Treasury Future)',
      notional,
      rationale: isLong
        ? 'Reduce portfolio duration to align with AGG benchmark'
        : 'Increase portfolio duration to align with AGG benchmark',
      expectedDurationImpact: Math.round(-summary.durationGap * 0.6 * 1000) / 1000,
      expectedConvexityImpact: Math.round((isLong ? -0.08 : 0.08) * (1 + rng() * 0.5) * 1000) / 1000,
    });
  }

  // 2. Key rate bucket adjustments for largest gaps
  const sortedGaps = [...gapAnalysis]
    .filter((g) => g.signal !== 'NEUTRAL')
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  const futuresMap: Record<string, string> = {
    '2Y': 'TU (2Y Treasury Future)',
    '5Y': 'FV (5Y Treasury Future)',
    '10Y': 'TY (10Y Treasury Future)',
    '20Y': 'US (T-Bond Future)',
    '30Y': 'WN (Ultra T-Bond Future)',
  };

  for (let i = 0; i < Math.min(2, sortedGaps.length); i++) {
    const bucket = sortedGaps[i];
    const isOver = bucket.signal === 'OVERWEIGHT';
    const notional = Math.round(Math.abs(bucket.gap) * 40_000_000 * (1 + rng() * 0.3));
    recommendations.push({
      action: isOver ? 'SELL' : 'BUY',
      instrument: futuresMap[bucket.tenor] || `${bucket.tenor} Swap`,
      notional,
      rationale: `${isOver ? 'Reduce' : 'Increase'} ${bucket.tenor} key rate exposure (currently ${bucket.signal.toLowerCase()} by ${Math.abs(bucket.gap).toFixed(3)}yr)`,
      expectedDurationImpact: Math.round(-bucket.gap * 0.7 * 1000) / 1000,
      expectedConvexityImpact: Math.round((isOver ? -0.05 : 0.05) * (1 + rng() * 0.4) * 1000) / 1000,
    });
  }

  // 3. Convexity adjustment via options if convexity gap is meaningful
  const cvxGap = summary.convexity - summary.benchmarkConvexity;
  if (Math.abs(cvxGap) > 0.15) {
    const needMore = cvxGap < 0;
    const notional = Math.round(Math.abs(cvxGap) * 80_000_000 * (1 + rng() * 0.2));
    recommendations.push({
      action: 'BUY',
      instrument: needMore
        ? 'TY Straddle (10Y Treasury Options)'
        : 'Payer Swaption 10Y x 10Y',
      notional,
      rationale: needMore
        ? 'Increase convexity to match benchmark through long optionality'
        : 'Monetize excess convexity via selling optionality',
      expectedDurationImpact: Math.round((rng() - 0.5) * 0.05 * 1000) / 1000,
      expectedConvexityImpact: Math.round(-cvxGap * 0.5 * 1000) / 1000,
    });
  }

  // 4. Spread duration trade if spread duration differs significantly
  const spreadGap = summary.spreadDuration - summary.effectiveDuration * 0.65;
  if (Math.abs(spreadGap) > 0.3) {
    const highSpread = spreadGap > 0;
    const notional = Math.round(Math.abs(spreadGap) * 30_000_000 * (1 + rng() * 0.25));
    recommendations.push({
      action: highSpread ? 'SELL' : 'BUY',
      instrument: 'CDX.NA.IG (Investment Grade CDS Index)',
      notional,
      rationale: highSpread
        ? 'Reduce spread duration exposure to decrease credit risk sensitivity'
        : 'Increase spread duration to capture additional spread carry',
      expectedDurationImpact: Math.round((rng() - 0.5) * 0.02 * 1000) / 1000,
      expectedConvexityImpact: Math.round((rng() - 0.5) * 0.01 * 1000) / 1000,
    });
  }

  // Ensure at least 3 recommendations
  if (recommendations.length < 3) {
    const notional = Math.round(15_000_000 * (1 + rng() * 0.5));
    recommendations.push({
      action: 'BUY',
      instrument: 'TIPS 10Y (Inflation-Protected Treasury)',
      notional,
      rationale: 'Add real duration exposure for inflation hedging and diversification',
      expectedDurationImpact: Math.round(0.15 * (1 + rng() * 0.3) * 1000) / 1000,
      expectedConvexityImpact: Math.round(0.03 * (1 + rng() * 0.5) * 1000) / 1000,
    });
  }

  return recommendations.slice(0, 5);
}

// ── Main generator ──

function generateDurationManagementData(): DurationManagementResponse {
  const rng = seededRandom('duration-management');

  const positions = generatePositions(rng);
  computeDurationContributions(positions);

  const portfolioSummary = generatePortfolioSummary(rng, positions);
  const durationGapAnalysis = generateDurationGapAnalysis(rng, portfolioSummary);
  const scenarioAnalysis = generateScenarioAnalysis(portfolioSummary);
  const sectorBreakdown = generateSectorBreakdown(rng, positions);
  const hedgingRecommendations = generateHedgingRecommendations(rng, portfolioSummary, durationGapAnalysis);

  return {
    portfolioSummary,
    positions,
    durationGapAnalysis,
    scenarioAnalysis,
    sectorBreakdown,
    hedgingRecommendations,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateDurationManagementData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DurationManagement] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate duration management data' });
  }
});

export default router;
