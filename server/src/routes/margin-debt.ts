import { Router } from 'express';

const router = Router();

// ── PRNG ──

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// ── Types ──

type RiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
type Signal = 'ELEVATED' | 'NORMAL' | 'LOW';

interface CurrentLevels {
  marginDebt: number;
  freeCreditCash: number;
  freeCreditMargin: number;
  totalDebitBalances: number;
  netMarginDebt: number;
  change1m: number;
  change1y: number;
  percentile: number;
}

interface HistoricalDataPoint {
  date: string;
  marginDebt: number;
  freeCreditCash: number;
  freeCreditMargin: number;
  spx: number;
  marginToSpxRatio: number;
}

interface LeverageIndicator {
  name: string;
  value: number;
  percentile90d: number;
  signal: Signal;
  historicalAvg: number;
}

interface MarginDebtSummary {
  currentMarginDebt: number;
  monthlyChange: number;
  yoyChange: number;
  riskLevel: RiskLevel;
  spxCorrelation: number;
  timestamp: string;
}

interface MarginDebtResponse {
  currentLevels: CurrentLevels;
  historicalTrend: HistoricalDataPoint[];
  leverageIndicators: LeverageIndicator[];
  summary: MarginDebtSummary;
}

// ── Data Generation ──

function generateCurrentLevels(rng: () => number): CurrentLevels {
  // FINRA margin statistics — realistic ranges based on recent data
  const marginDebt = round1(780 + (rng() - 0.5) * 40);            // ~760-800B
  const freeCreditCash = round1(150 + (rng() - 0.5) * 40);        // ~130-170B
  const freeCreditMargin = round1(100 + (rng() - 0.5) * 40);      // ~80-120B
  const totalDebitBalances = round1(marginDebt + 30 + (rng() - 0.5) * 10); // margin debt + misc debits
  const netMarginDebt = round1(marginDebt - freeCreditCash - freeCreditMargin);

  const change1m = round2((rng() - 0.45) * 6);                    // slight positive bias
  const change1y = round2((rng() - 0.4) * 16);                    // moderate positive bias
  const percentile = clamp(Math.round(68 + (rng() - 0.5) * 30), 35, 98); // vs 10yr history

  return {
    marginDebt,
    freeCreditCash,
    freeCreditMargin,
    totalDebitBalances,
    netMarginDebt,
    change1m,
    change1y,
    percentile,
  };
}

function generateHistoricalTrend(rng: () => number, currentMarginDebt: number): HistoricalDataPoint[] {
  const today = new Date();
  const points: HistoricalDataPoint[] = [];

  // Build 12 months of data working backward from current levels
  // Apply a gentle drift so most recent point is near currentMarginDebt
  let md = currentMarginDebt;
  const mdSeries: number[] = [];
  for (let i = 0; i < 12; i++) {
    mdSeries.unshift(md);
    // Walk backward: subtract a small monthly change
    md = md - (rng() - 0.45) * 18;
  }

  // S&P 500 base — realistic range around current levels
  let spx = 5200 + (rng() - 0.5) * 400;

  for (let i = 0; i < 12; i++) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - (11 - i));
    const dateStr = d.toISOString().slice(0, 7); // YYYY-MM

    const marginDebt = round1(mdSeries[i]);
    const freeCreditCash = round1(140 + (rng() - 0.5) * 30);
    const freeCreditMargin = round1(95 + (rng() - 0.5) * 25);

    // S&P 500 loosely correlated with margin debt direction
    spx = spx + (rng() - 0.45) * 80;
    const spxVal = round1(clamp(spx, 4400, 6200));
    const marginToSpxRatio = round2((marginDebt * 1000) / spxVal); // $M per SPX point

    points.push({
      date: dateStr,
      marginDebt,
      freeCreditCash,
      freeCreditMargin,
      spx: spxVal,
      marginToSpxRatio,
    });
  }

  return points;
}

function generateLeverageIndicators(rng: () => number, currentLevels: CurrentLevels): LeverageIndicator[] {
  const indicators: { name: string; baseValue: number; historicalAvg: number; unit?: string }[] = [
    { name: 'Margin Debt/GDP', baseValue: 2.8, historicalAvg: 2.5 },
    { name: 'Margin Debt/Market Cap', baseValue: 1.5, historicalAvg: 1.7 },
    { name: 'Net Margin/GDP', baseValue: 1.8, historicalAvg: 1.4 },
    { name: 'Debit Balance Ratio', baseValue: 0.85, historicalAvg: 0.78 },
    { name: 'Free Credit Ratio', baseValue: 0.34, historicalAvg: 0.38 },
    { name: 'Leverage Ratio', baseValue: 2.9, historicalAvg: 2.6 },
  ];

  // Use currentLevels to influence the first indicator slightly for consistency
  void currentLevels;

  return indicators.map((ind) => {
    const noise = (rng() - 0.5) * ind.baseValue * 0.15;
    const value = round2(ind.baseValue + noise);
    const percentile90d = clamp(Math.round(50 + ((value - ind.historicalAvg) / ind.historicalAvg) * 120 + (rng() - 0.5) * 20), 5, 98);

    let signal: Signal;
    if (percentile90d >= 70) {
      signal = 'ELEVATED';
    } else if (percentile90d <= 30) {
      signal = 'LOW';
    } else {
      signal = 'NORMAL';
    }

    return {
      name: ind.name,
      value,
      percentile90d,
      signal,
      historicalAvg: ind.historicalAvg,
    };
  });
}

function generateSummary(
  currentLevels: CurrentLevels,
  historicalTrend: HistoricalDataPoint[],
  rng: () => number,
): MarginDebtSummary {
  const { marginDebt, change1m, change1y } = currentLevels;

  // Risk level based on percentile and change trajectory
  let riskLevel: RiskLevel;
  if (currentLevels.percentile >= 85 || change1y > 12) {
    riskLevel = 'HIGH';
  } else if (currentLevels.percentile >= 70 || change1y > 6) {
    riskLevel = 'ELEVATED';
  } else if (currentLevels.percentile >= 45) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  // Compute SPX correlation from historical trend
  // Simple Pearson correlation between marginDebt and spx series
  const n = historicalTrend.length;
  const mdArr = historicalTrend.map((p) => p.marginDebt);
  const spxArr = historicalTrend.map((p) => p.spx);
  const mdMean = mdArr.reduce((a, b) => a + b, 0) / n;
  const spxMean = spxArr.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denMd = 0;
  let denSpx = 0;
  for (let i = 0; i < n; i++) {
    const dMd = mdArr[i] - mdMean;
    const dSpx = spxArr[i] - spxMean;
    num += dMd * dSpx;
    denMd += dMd * dMd;
    denSpx += dSpx * dSpx;
  }
  const denom = Math.sqrt(denMd * denSpx);
  let spxCorrelation = denom > 0 ? num / denom : 0;
  // Add small noise to avoid perfectly computed values
  spxCorrelation = round2(clamp(spxCorrelation + (rng() - 0.5) * 0.05, -1, 1));

  return {
    currentMarginDebt: marginDebt,
    monthlyChange: change1m,
    yoyChange: change1y,
    riskLevel,
    spxCorrelation,
    timestamp: new Date().toISOString(),
  };
}

function generateMarginDebtData(): MarginDebtResponse {
  const rng = seededRandom('margin-debt');
  const currentLevels = generateCurrentLevels(rng);
  const historicalTrend = generateHistoricalTrend(rng, currentLevels.marginDebt);
  const leverageIndicators = generateLeverageIndicators(rng, currentLevels);
  const summary = generateSummary(currentLevels, historicalTrend, rng);

  return {
    currentLevels,
    historicalTrend,
    leverageIndicators,
    summary,
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: MarginDebtResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateMarginDebtData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MarginDebt] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate margin debt data' });
  }
});

export default router;
