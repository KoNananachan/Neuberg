import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface EpsEstimate {
  consensus: number;
  high: number;
  low: number;
  numEstimates: number;
}

interface RevenueEstimate {
  consensus: number;
  high: number;
  low: number;
  numEstimates: number;
}

interface RevisionPeriod {
  epsChange: number;
  upRevisions: number;
  downRevisions: number;
}

interface AnalystAction {
  firm: string;
  action: 'upgrade' | 'downgrade' | 'initiate' | 'reiterate';
  fromRating: string | null;
  toRating: string;
  targetPrice: number;
  date: string;
}

interface Recommendation {
  buyCount: number;
  overweightCount: number;
  holdCount: number;
  underweightCount: number;
  sellCount: number;
  consensusRating: string;
  targetPrice: number;
  upsidePercent: number;
}

interface EarningsSurpriseQuarter {
  quarter: string;
  epsEstimate: number;
  epsActual: number;
  surprisePercent: number;
  result: 'beat' | 'miss' | 'inline';
}

interface StockRevision {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  epsEstimates: {
    currentFY: EpsEstimate;
    nextFY: EpsEstimate;
  };
  revenueEstimates: {
    currentFY: RevenueEstimate;
    nextFY: RevenueEstimate;
  };
  revisions: {
    thirtyDay: RevisionPeriod;
    sixtyDay: RevisionPeriod;
    ninetyDay: RevisionPeriod;
  };
  recommendation: Recommendation;
  recentActions: AnalystAction[];
  earningsSurpriseHistory: EarningsSurpriseQuarter[];
}

interface MomentumEntry {
  symbol: string;
  name: string;
  sector: string;
  revisionScore: number;
  thirtyDayEpsChange: number;
  ninetyDayEpsChange: number;
}

interface SectorSummaryEntry {
  sector: string;
  avgThirtyDayRevision: number;
  avgNinetyDayRevision: number;
  totalUpRevisions: number;
  totalDownRevisions: number;
  stockCount: number;
}

interface EquityAnalystRevisionsResponse {
  stocks: StockRevision[];
  momentum: {
    positive: MomentumEntry[];
    negative: MomentumEntry[];
  };
  sectorSummary: SectorSummaryEntry[];
  timestamp: string;
}

// ── Stock Universe (30 stocks) ──

interface StockDef {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  baseFyEps: number;
  baseFyRevenue: number; // in billions
  growthBias: number; // -1 to +1: affects estimate trajectory
}

const STOCK_UNIVERSE: StockDef[] = [
  // Technology — higher growth estimates
  { symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology', basePrice: 875, baseFyEps: 25.10, baseFyRevenue: 113, growthBias: 0.85 },
  { symbol: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', basePrice: 420, baseFyEps: 12.10, baseFyRevenue: 245, growthBias: 0.50 },
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology', basePrice: 195, baseFyEps: 6.58, baseFyRevenue: 394, growthBias: 0.25 },
  { symbol: 'AVGO', name: 'Broadcom Inc', sector: 'Technology', basePrice: 1350, baseFyEps: 47.50, baseFyRevenue: 51, growthBias: 0.60 },
  { symbol: 'CRM', name: 'Salesforce Inc', sector: 'Technology', basePrice: 295, baseFyEps: 9.86, baseFyRevenue: 38, growthBias: 0.35 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', basePrice: 178, baseFyEps: 4.52, baseFyRevenue: 28, growthBias: 0.55 },
  // Communication Services
  { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Communication Services', basePrice: 155, baseFyEps: 6.52, baseFyRevenue: 350, growthBias: 0.40 },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Communication Services', basePrice: 510, baseFyEps: 21.20, baseFyRevenue: 163, growthBias: 0.45 },
  { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Communication Services', basePrice: 620, baseFyEps: 19.08, baseFyRevenue: 39, growthBias: 0.50 },
  // Consumer Discretionary
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer Discretionary', basePrice: 185, baseFyEps: 4.72, baseFyRevenue: 638, growthBias: 0.45 },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Discretionary', basePrice: 175, baseFyEps: 2.28, baseFyRevenue: 112, growthBias: -0.20 },
  { symbol: 'HD', name: 'Home Depot Inc', sector: 'Consumer Discretionary', basePrice: 365, baseFyEps: 15.15, baseFyRevenue: 155, growthBias: -0.10 },
  { symbol: 'BKNG', name: 'Booking Holdings', sector: 'Consumer Discretionary', basePrice: 3750, baseFyEps: 175.20, baseFyRevenue: 22, growthBias: 0.30 },
  // Consumer Staples
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', basePrice: 162, baseFyEps: 6.37, baseFyRevenue: 85, growthBias: 0.00 },
  { symbol: 'KO', name: 'Coca-Cola Co', sector: 'Consumer Staples', basePrice: 60, baseFyEps: 2.82, baseFyRevenue: 46, growthBias: -0.05 },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', basePrice: 730, baseFyEps: 16.12, baseFyRevenue: 254, growthBias: 0.15 },
  // Financials
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', basePrice: 198, baseFyEps: 16.23, baseFyRevenue: 178, growthBias: 0.15 },
  { symbol: 'V', name: 'Visa Inc', sector: 'Financials', basePrice: 282, baseFyEps: 9.92, baseFyRevenue: 36, growthBias: 0.20 },
  { symbol: 'MA', name: 'Mastercard Inc', sector: 'Financials', basePrice: 468, baseFyEps: 14.38, baseFyRevenue: 27, growthBias: 0.20 },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financials', basePrice: 465, baseFyEps: 36.50, baseFyRevenue: 52, growthBias: 0.10 },
  // Healthcare
  { symbol: 'LLY', name: 'Eli Lilly & Co', sector: 'Healthcare', basePrice: 790, baseFyEps: 12.65, baseFyRevenue: 46, growthBias: 0.70 },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', basePrice: 525, baseFyEps: 27.60, baseFyRevenue: 390, growthBias: 0.10 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 156, baseFyEps: 10.05, baseFyRevenue: 88, growthBias: -0.05 },
  { symbol: 'ABBV', name: 'AbbVie Inc', sector: 'Healthcare', basePrice: 172, baseFyEps: 11.28, baseFyRevenue: 56, growthBias: 0.05 },
  { symbol: 'MRK', name: 'Merck & Co', sector: 'Healthcare', basePrice: 128, baseFyEps: 7.74, baseFyRevenue: 64, growthBias: -0.10 },
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil Corp', sector: 'Energy', basePrice: 104, baseFyEps: 9.12, baseFyRevenue: 344, growthBias: -0.25 },
  { symbol: 'CVX', name: 'Chevron Corp', sector: 'Energy', basePrice: 155, baseFyEps: 12.80, baseFyRevenue: 196, growthBias: -0.20 },
  // Industrials
  { symbol: 'CAT', name: 'Caterpillar Inc', sector: 'Industrials', basePrice: 340, baseFyEps: 21.20, baseFyRevenue: 67, growthBias: 0.10 },
  { symbol: 'BA', name: 'Boeing Co', sector: 'Industrials', basePrice: 195, baseFyEps: -2.50, baseFyRevenue: 78, growthBias: 0.30 },
  // Utilities
  { symbol: 'NEE', name: 'NextEra Energy', sector: 'Utilities', basePrice: 72, baseFyEps: 3.40, baseFyRevenue: 28, growthBias: 0.05 },
];

// ── Analyst Firms ──

const ANALYST_FIRMS = [
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America',
  'Citi', 'Barclays', 'UBS', 'Deutsche Bank', 'Wells Fargo',
  'RBC Capital', 'Jefferies', 'Piper Sandler', 'Bernstein',
  'Raymond James', 'Cowen', 'Wedbush', 'Needham', 'Stifel',
  'KeyBanc', 'Oppenheimer', 'HSBC', 'Credit Suisse', 'Mizuho',
  'BMO Capital', 'TD Cowen', 'Wolfe Research', 'Evercore ISI',
  'William Blair', 'Truist', 'Canaccord Genuity',
];

const RATING_LABELS = ['Strong Buy', 'Buy', 'Overweight', 'Hold', 'Underweight', 'Sell'];

// ── Helpers ──

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function formatDate(base: Date, daysAgo: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ── Cache ──

let cache: { data: EquityAnalystRevisionsResponse; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Data Generation ──

function generate(): EquityAnalystRevisionsResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('equity-analyst-revisions-' + day));
  const today = new Date();

  const stocks: StockRevision[] = STOCK_UNIVERSE.map((def) => {
    const bias = def.growthBias;

    // Current price with daily noise
    const priceNoise = 1 + (rng() - 0.5) * 0.06;
    const currentPrice = round2(def.basePrice * priceNoise);

    // Number of analysts covering (larger/popular names get more)
    const baseAnalysts = def.basePrice > 300 ? 30 : 22;
    const numEstimates = Math.floor(rng() * 10) + baseAnalysts;

    // ── EPS Estimates ──
    const currentFyEpsConsensus = round2(def.baseFyEps * (1 + (rng() - 0.4 + bias * 0.3) * 0.08));
    const currentFyEpsSpread = Math.abs(currentFyEpsConsensus) * (0.05 + rng() * 0.10);
    const currentFyEps: EpsEstimate = {
      consensus: currentFyEpsConsensus,
      high: round2(currentFyEpsConsensus + currentFyEpsSpread),
      low: round2(currentFyEpsConsensus - currentFyEpsSpread),
      numEstimates,
    };

    // Next FY EPS: growth from current FY
    const growthRate = 0.05 + bias * 0.12 + (rng() - 0.5) * 0.08;
    const nextFyEpsConsensus = round2(currentFyEpsConsensus * (1 + growthRate));
    const nextFyEpsSpread = Math.abs(nextFyEpsConsensus) * (0.07 + rng() * 0.12);
    const nextFyEps: EpsEstimate = {
      consensus: nextFyEpsConsensus,
      high: round2(nextFyEpsConsensus + nextFyEpsSpread),
      low: round2(nextFyEpsConsensus - nextFyEpsSpread),
      numEstimates: numEstimates - Math.floor(rng() * 5),
    };

    // ── Revenue Estimates (in billions) ──
    const currentFyRevConsensus = round2(def.baseFyRevenue * (1 + (rng() - 0.45 + bias * 0.15) * 0.06));
    const currentFyRevSpread = currentFyRevConsensus * (0.02 + rng() * 0.04);
    const currentFyRev: RevenueEstimate = {
      consensus: currentFyRevConsensus,
      high: round2(currentFyRevConsensus + currentFyRevSpread),
      low: round2(currentFyRevConsensus - currentFyRevSpread),
      numEstimates: numEstimates - Math.floor(rng() * 3),
    };

    const revGrowthRate = 0.03 + bias * 0.08 + (rng() - 0.5) * 0.06;
    const nextFyRevConsensus = round2(currentFyRevConsensus * (1 + revGrowthRate));
    const nextFyRevSpread = nextFyRevConsensus * (0.03 + rng() * 0.05);
    const nextFyRev: RevenueEstimate = {
      consensus: nextFyRevConsensus,
      high: round2(nextFyRevConsensus + nextFyRevSpread),
      low: round2(nextFyRevConsensus - nextFyRevSpread),
      numEstimates: numEstimates - Math.floor(rng() * 6),
    };

    // ── Revision Periods ──
    // 30-day revision: smaller magnitude, correlated with bias
    const eps30dChange = round2((rng() - 0.45 + bias * 0.25) * 4);
    const up30 = Math.floor(clamp(numEstimates * (0.3 + bias * 0.2 + (rng() - 0.5) * 0.3), 0, numEstimates));
    const down30 = Math.floor(clamp(numEstimates * (0.3 - bias * 0.15 + (rng() - 0.5) * 0.25), 0, numEstimates - up30));

    // 60-day revision: medium magnitude
    const eps60dChange = round2((rng() - 0.45 + bias * 0.2) * 6);
    const up60 = Math.floor(clamp(up30 + Math.floor(rng() * 5), 0, numEstimates));
    const down60 = Math.floor(clamp(down30 + Math.floor(rng() * 4), 0, numEstimates - up60));

    // 90-day revision: larger magnitude
    const eps90dChange = round2((rng() - 0.45 + bias * 0.18) * 8);
    const up90 = Math.floor(clamp(up60 + Math.floor(rng() * 6), 0, numEstimates));
    const down90 = Math.floor(clamp(down60 + Math.floor(rng() * 5), 0, numEstimates - up90));

    const thirtyDay: RevisionPeriod = { epsChange: eps30dChange, upRevisions: up30, downRevisions: down30 };
    const sixtyDay: RevisionPeriod = { epsChange: eps60dChange, upRevisions: up60, downRevisions: down60 };
    const ninetyDay: RevisionPeriod = { epsChange: eps90dChange, upRevisions: up90, downRevisions: down90 };

    // ── Recommendation Distribution ──
    const totalRec = Math.floor(rng() * 12) + 25; // 25-37 analysts
    // Bias shifts distribution toward buy or sell
    const buyPct = clamp(0.30 + bias * 0.20 + (rng() - 0.5) * 0.15, 0.05, 0.60);
    const overweightPct = clamp(0.15 + bias * 0.08 + (rng() - 0.5) * 0.08, 0.03, 0.30);
    const holdPct = clamp(0.30 - Math.abs(bias) * 0.10 + (rng() - 0.5) * 0.10, 0.10, 0.50);
    const underweightPct = clamp(0.10 - bias * 0.06 + (rng() - 0.5) * 0.06, 0.02, 0.20);
    // Sell is remainder
    const rawSum = buyPct + overweightPct + holdPct + underweightPct;
    const sellPct = Math.max(0.02, 1 - rawSum);
    const total = buyPct + overweightPct + holdPct + underweightPct + sellPct;

    const buyCount = Math.round((buyPct / total) * totalRec);
    const overweightCount = Math.round((overweightPct / total) * totalRec);
    const holdCount = Math.round((holdPct / total) * totalRec);
    const underweightCount = Math.round((underweightPct / total) * totalRec);
    const sellCount = Math.max(0, totalRec - buyCount - overweightCount - holdCount - underweightCount);

    // Consensus rating: weighted average (1=Buy, 5=Sell)
    const weightedSum = buyCount * 1 + overweightCount * 2 + holdCount * 3 + underweightCount * 4 + sellCount * 5;
    const avgRating = weightedSum / totalRec;
    let consensusRating: string;
    if (avgRating <= 1.5) consensusRating = 'Strong Buy';
    else if (avgRating <= 2.2) consensusRating = 'Buy';
    else if (avgRating <= 2.8) consensusRating = 'Overweight';
    else if (avgRating <= 3.5) consensusRating = 'Hold';
    else if (avgRating <= 4.2) consensusRating = 'Underweight';
    else consensusRating = 'Sell';

    // Target price: based on current price + upside expectation
    const impliedUpside = (0.08 + bias * 0.12 + (rng() - 0.5) * 0.15);
    const targetPrice = round2(currentPrice * (1 + impliedUpside));
    const upsidePercent = round2(((targetPrice - currentPrice) / currentPrice) * 100);

    const recommendation: Recommendation = {
      buyCount,
      overweightCount,
      holdCount,
      underweightCount,
      sellCount,
      consensusRating,
      targetPrice,
      upsidePercent,
    };

    // ── Recent Analyst Actions (last 5) ──
    const actions: AnalystAction[] = [];
    const usedFirms = new Set<string>();
    for (let i = 0; i < 5; i++) {
      let firm: string;
      do {
        firm = pick(rng, ANALYST_FIRMS);
      } while (usedFirms.has(firm) && usedFirms.size < ANALYST_FIRMS.length);
      usedFirms.add(firm);

      const actionRoll = rng();
      let action: AnalystAction['action'];
      let fromRating: string | null;
      let toRating: string;

      if (actionRoll < 0.25 + bias * 0.1) {
        // Upgrade
        action = 'upgrade';
        const fromIdx = Math.floor(rng() * 3) + 2; // Hold, Underweight, Sell
        const toIdx = Math.floor(rng() * Math.min(fromIdx, 3)); // something better
        fromRating = RATING_LABELS[fromIdx];
        toRating = RATING_LABELS[toIdx];
      } else if (actionRoll < 0.50 - bias * 0.1) {
        // Downgrade
        action = 'downgrade';
        const fromIdx = Math.floor(rng() * 3); // Strong Buy, Buy, Overweight
        const toIdx = Math.min(fromIdx + 1 + Math.floor(rng() * 2), RATING_LABELS.length - 1);
        fromRating = RATING_LABELS[fromIdx];
        toRating = RATING_LABELS[toIdx];
      } else if (actionRoll < 0.65) {
        // Initiate
        action = 'initiate';
        fromRating = null;
        const initIdx = bias > 0 ? Math.floor(rng() * 3) : Math.floor(rng() * 4) + 1;
        toRating = RATING_LABELS[clamp(initIdx, 0, RATING_LABELS.length - 1)];
      } else {
        // Reiterate
        action = 'reiterate';
        const rIdx = Math.floor(rng() * RATING_LABELS.length);
        fromRating = RATING_LABELS[rIdx];
        toRating = RATING_LABELS[rIdx];
      }

      const daysAgo = Math.floor(rng() * 30) + i * 5;
      const actionTargetNoise = 1 + (rng() - 0.5) * 0.12;
      const actionTarget = round2(targetPrice * actionTargetNoise);

      actions.push({
        firm,
        action,
        fromRating,
        toRating,
        targetPrice: actionTarget,
        date: formatDate(today, daysAgo),
      });
    }
    // Sort by date descending
    actions.sort((a, b) => b.date.localeCompare(a.date));

    // ── Earnings Surprise History (last 4 quarters) ──
    const surpriseHistory: EarningsSurpriseQuarter[] = [];
    const quarterLabels = ['Q4', 'Q3', 'Q2', 'Q1'];
    const currentYear = today.getFullYear();
    for (let q = 0; q < 4; q++) {
      const year = q < 2 ? currentYear : currentYear - 1;
      const quarter = `${quarterLabels[q]} ${year}`;
      const quarterlyEps = round2(def.baseFyEps / 4 * (0.9 + rng() * 0.2));
      // Positive bias stocks tend to beat more often
      const surpriseDir = rng() < (0.55 + bias * 0.15) ? 1 : -1;
      const surpriseMagnitude = rng() * 8 + 0.5; // 0.5% to 8.5%
      const surprisePercent = round2(surpriseDir * surpriseMagnitude);
      const epsActual = round2(quarterlyEps * (1 + surprisePercent / 100));

      let result: 'beat' | 'miss' | 'inline';
      if (surprisePercent > 1) result = 'beat';
      else if (surprisePercent < -1) result = 'miss';
      else result = 'inline';

      surpriseHistory.push({
        quarter,
        epsEstimate: quarterlyEps,
        epsActual,
        surprisePercent,
        result,
      });
    }

    return {
      symbol: def.symbol,
      name: def.name,
      sector: def.sector,
      currentPrice,
      epsEstimates: { currentFY: currentFyEps, nextFY: nextFyEps },
      revenueEstimates: { currentFY: currentFyRev, nextFY: nextFyRev },
      revisions: { thirtyDay, sixtyDay, ninetyDay },
      recommendation,
      recentActions: actions,
      earningsSurpriseHistory: surpriseHistory,
    };
  });

  // ── Revision Momentum ──
  const scoredStocks = stocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    revisionScore: round2(
      s.revisions.thirtyDay.epsChange * 3 +
      s.revisions.sixtyDay.epsChange * 2 +
      s.revisions.ninetyDay.epsChange * 1
    ),
    thirtyDayEpsChange: s.revisions.thirtyDay.epsChange,
    ninetyDayEpsChange: s.revisions.ninetyDay.epsChange,
  }));
  scoredStocks.sort((a, b) => b.revisionScore - a.revisionScore);

  const positive: MomentumEntry[] = scoredStocks.filter((s) => s.revisionScore > 0).slice(0, 10);
  const negative: MomentumEntry[] = scoredStocks
    .filter((s) => s.revisionScore < 0)
    .sort((a, b) => a.revisionScore - b.revisionScore)
    .slice(0, 10);

  // ── Sector Summary ──
  const sectorMap = new Map<string, StockRevision[]>();
  for (const s of stocks) {
    const arr = sectorMap.get(s.sector) || [];
    arr.push(s);
    sectorMap.set(s.sector, arr);
  }

  const sectorSummary: SectorSummaryEntry[] = [];
  for (const [sector, sectorStocks] of sectorMap) {
    const n = sectorStocks.length;
    const avg30 = round2(sectorStocks.reduce((sum, s) => sum + s.revisions.thirtyDay.epsChange, 0) / n);
    const avg90 = round2(sectorStocks.reduce((sum, s) => sum + s.revisions.ninetyDay.epsChange, 0) / n);
    const totalUp = sectorStocks.reduce((sum, s) => sum + s.revisions.thirtyDay.upRevisions, 0);
    const totalDown = sectorStocks.reduce((sum, s) => sum + s.revisions.thirtyDay.downRevisions, 0);

    sectorSummary.push({
      sector,
      avgThirtyDayRevision: avg30,
      avgNinetyDayRevision: avg90,
      totalUpRevisions: totalUp,
      totalDownRevisions: totalDown,
      stockCount: n,
    });
  }
  sectorSummary.sort((a, b) => b.avgThirtyDayRevision - a.avgThirtyDayRevision);

  return {
    stocks,
    momentum: { positive, negative },
    sectorSummary,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (!cache || now - cache.ts > TTL) {
      cache = { data: generate(), ts: now };
    }
    res.json(cache.data);
  } catch (e) {
    console.error('[EquityAnalystRevisions] Error:', e instanceof Error ? e.message : e);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity analyst revisions data' });
  }
});

export default router;
