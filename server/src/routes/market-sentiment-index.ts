import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ────────────────────────────────────────────────────────────────────

type SentimentLabel = 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
type Signal = 'bullish' | 'bearish' | 'neutral';

interface ComponentBreakdown {
  name: string;
  value: number;
  signal: Signal;
  weight: number;
}

interface CompositeSentiment {
  score: number;
  label: SentimentLabel;
  change1d: number;
  change1w: number;
  percentile_1yr: number;
  components: ComponentBreakdown[];
}

interface PutCallRatio {
  name: string;
  value: number;
  ma20d: number;
  signal: Signal;
}

interface VixLevel {
  name: string;
  value: number;
  percentile: number;
  signal: Signal;
}

interface MarginDebt {
  name: string;
  value: number;
  change3mPct: number;
  signal: Signal;
}

interface FundFlows {
  name: string;
  equityBn: number;
  bondBn: number;
  moneyMarketBn: number;
  period: string;
  signal: Signal;
}

interface AAIISentiment {
  name: string;
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
  spread: number;
  signal: Signal;
}

interface SmartMoneyIndex {
  name: string;
  value: number;
  trend: string;
  signal: Signal;
}

interface AdvanceDecline {
  name: string;
  ratio: number;
  ma10d: number;
  signal: Signal;
}

interface HighLowRatio {
  name: string;
  newHighs: number;
  newLows: number;
  ratio: number;
  signal: Signal;
}

interface ComponentsDetail {
  putCallRatio: PutCallRatio;
  vixLevel: VixLevel;
  marginDebt: MarginDebt;
  fundFlows: FundFlows;
  aaiiSentiment: AAIISentiment;
  smartMoneyIndex: SmartMoneyIndex;
  advanceDecline: AdvanceDecline;
  highLowRatio: HighLowRatio;
}

interface COTPositioning {
  contract: string;
  specLong: number;
  specShort: number;
  netPosition: number;
  change1w: number;
  extremeReading: boolean;
}

interface HistoricalSnapshot {
  period: string;
  score: number;
}

interface NotableExtreme {
  date: string;
  score: number;
  label: SentimentLabel;
  subsequent_1m_SPX_return_pct: number;
}

interface HistoricalContext {
  snapshots: HistoricalSnapshot[];
  notableExtremes: NotableExtreme[];
}

interface MarketSentimentIndexResponse {
  timestamp: string;
  composite: CompositeSentiment;
  components: ComponentsDetail;
  positioning: COTPositioning[];
  historicalContext: HistoricalContext;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function scoreToLabel(score: number): SentimentLabel {
  if (score < 20) return 'Extreme Fear';
  if (score < 40) return 'Fear';
  if (score < 60) return 'Neutral';
  if (score < 80) return 'Greed';
  return 'Extreme Greed';
}

function signalFromValue(value: number, low: number, high: number): Signal {
  if (value < low) return 'bearish';
  if (value > high) return 'bullish';
  return 'neutral';
}

// ── Data Generation ──────────────────────────────────────────────────────────

function generate(): MarketSentimentIndexResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-market-sentiment-index'));

  // ── 1. Component scores (each 0-100) ──

  // Put/Call Ratio: 0.70-1.20 typical range, lower = greed, higher = fear
  const pcRatioValue = roundTo(0.70 + rng() * 0.50, 2);
  const pcRatioMA20 = roundTo(jitter(rng, pcRatioValue, 0.08), 2);
  const pcSignal: Signal = pcRatioValue > 1.0 ? 'bearish' : pcRatioValue < 0.80 ? 'bullish' : 'neutral';
  // Score: inverted — high ratio = fear = low score
  const pcScore = roundTo(Math.max(0, Math.min(100, 100 - ((pcRatioValue - 0.70) / 0.50) * 100)), 1);

  // VIX Level: 12-25 typical, higher = fear
  const vixValue = roundTo(12 + rng() * 13, 2);
  const vixPercentile = roundTo(Math.max(0, Math.min(100, ((vixValue - 10) / 30) * 100)), 1);
  const vixSignal: Signal = vixValue > 22 ? 'bearish' : vixValue < 15 ? 'bullish' : 'neutral';
  const vixScore = roundTo(Math.max(0, Math.min(100, 100 - ((vixValue - 12) / 13) * 100)), 1);

  // Margin Debt: $600-900B range
  const marginDebtValue = roundTo(600 + rng() * 300, 1);
  const marginChange3m = roundTo((rng() - 0.4) * 12, 1);
  const marginSignal: Signal = marginChange3m > 3 ? 'bullish' : marginChange3m < -3 ? 'bearish' : 'neutral';
  const marginScore = roundTo(Math.max(0, Math.min(100, 50 + marginChange3m * 4)), 1);

  // Fund Flows (weekly, in $B)
  const equityFlowBn = roundTo((rng() - 0.35) * 20, 2);
  const bondFlowBn = roundTo((rng() - 0.45) * 12, 2);
  const mmFlowBn = roundTo((rng() - 0.5) * 15, 2);
  const flowSignal: Signal = equityFlowBn > 3 ? 'bullish' : equityFlowBn < -3 ? 'bearish' : 'neutral';
  const flowScore = roundTo(Math.max(0, Math.min(100, 50 + equityFlowBn * 3)), 1);

  // AAII Sentiment: typically 25-45% bulls, 20-45% bears
  const bullish = roundTo(25 + rng() * 20, 1);
  const bearish = roundTo(20 + rng() * 25, 1);
  const neutralAaii = roundTo(Math.max(5, 100 - bullish - bearish), 1);
  const aaiiSpread = roundTo(bullish - bearish, 1);
  const aaiiSignal: Signal = aaiiSpread > 10 ? 'bullish' : aaiiSpread < -10 ? 'bearish' : 'neutral';
  const aaiiScore = roundTo(Math.max(0, Math.min(100, 50 + aaiiSpread * 1.5)), 1);

  // Smart Money Index: 8000-12000 range
  const smartMoneyValue = roundTo(8000 + rng() * 4000, 0);
  const smTrend = smartMoneyValue > 10500 ? 'Rising' : smartMoneyValue < 9500 ? 'Declining' : 'Flat';
  const smSignal: Signal = smartMoneyValue > 10500 ? 'bullish' : smartMoneyValue < 9500 ? 'bearish' : 'neutral';
  const smScore = roundTo(Math.max(0, Math.min(100, ((smartMoneyValue - 8000) / 4000) * 100)), 1);

  // NYSE Advance/Decline: ratio 0.5-2.5
  const adRatio = roundTo(0.5 + rng() * 2.0, 2);
  const adMA10 = roundTo(jitter(rng, adRatio, 0.10), 2);
  const adSignal: Signal = adRatio > 1.5 ? 'bullish' : adRatio < 0.8 ? 'bearish' : 'neutral';
  const adScore = roundTo(Math.max(0, Math.min(100, ((adRatio - 0.5) / 2.0) * 100)), 1);

  // High/Low Ratio: new highs 30-300, new lows 10-200
  const newHighs = Math.floor(30 + rng() * 270);
  const newLows = Math.floor(10 + rng() * 190);
  const hlRatio = roundTo(newLows > 0 ? newHighs / newLows : 10, 2);
  const hlSignal: Signal = hlRatio > 2.0 ? 'bullish' : hlRatio < 0.8 ? 'bearish' : 'neutral';
  const hlScore = roundTo(Math.max(0, Math.min(100, Math.min(hlRatio / 3.0, 1) * 100)), 1);

  // ── Composite weighted score ──
  const weights = [
    { name: 'Put/Call Ratio', score: pcScore, weight: 15 },
    { name: 'VIX Level', score: vixScore, weight: 15 },
    { name: 'Margin Debt', score: marginScore, weight: 10 },
    { name: 'Fund Flows', score: flowScore, weight: 12 },
    { name: 'AAII Sentiment', score: aaiiScore, weight: 15 },
    { name: 'Smart Money Index', score: smScore, weight: 13 },
    { name: 'Advance/Decline', score: adScore, weight: 10 },
    { name: 'High/Low Ratio', score: hlScore, weight: 10 },
  ];

  let totalWeight = 0;
  let weightedSum = 0;
  for (const w of weights) {
    weightedSum += w.score * w.weight;
    totalWeight += w.weight;
  }
  const compositeScore = roundTo(totalWeight > 0 ? weightedSum / totalWeight : 50, 1);

  // Daily / weekly change (deterministic from seed)
  const change1d = roundTo((rng() - 0.5) * 6, 1);
  const change1w = roundTo((rng() - 0.5) * 12, 1);
  const percentile1yr = roundTo(20 + rng() * 60, 1);

  const components: ComponentBreakdown[] = weights.map(w => ({
    name: w.name,
    value: roundTo(w.score, 1),
    signal: w.score > 60 ? 'bullish' as Signal : w.score < 40 ? 'bearish' as Signal : 'neutral' as Signal,
    weight: w.weight,
  }));

  const composite: CompositeSentiment = {
    score: compositeScore,
    label: scoreToLabel(compositeScore),
    change1d,
    change1w,
    percentile_1yr: percentile1yr,
    components,
  };

  // ── 2. Components Detail ──

  const componentsDetail: ComponentsDetail = {
    putCallRatio: {
      name: 'Put/Call Ratio',
      value: pcRatioValue,
      ma20d: pcRatioMA20,
      signal: pcSignal,
    },
    vixLevel: {
      name: 'VIX Level',
      value: vixValue,
      percentile: vixPercentile,
      signal: vixSignal,
    },
    marginDebt: {
      name: 'Margin Debt',
      value: marginDebtValue,
      change3mPct: marginChange3m,
      signal: marginSignal,
    },
    fundFlows: {
      name: 'Fund Flows (Weekly)',
      equityBn: equityFlowBn,
      bondBn: bondFlowBn,
      moneyMarketBn: mmFlowBn,
      period: 'weekly',
      signal: flowSignal,
    },
    aaiiSentiment: {
      name: 'AAII Sentiment Survey',
      bullishPct: bullish,
      bearishPct: bearish,
      neutralPct: neutralAaii,
      spread: aaiiSpread,
      signal: aaiiSignal,
    },
    smartMoneyIndex: {
      name: 'Smart Money Index',
      value: smartMoneyValue,
      trend: smTrend,
      signal: smSignal,
    },
    advanceDecline: {
      name: 'NYSE Advance/Decline',
      ratio: adRatio,
      ma10d: adMA10,
      signal: adSignal,
    },
    highLowRatio: {
      name: 'NYSE New Highs/Lows',
      newHighs,
      newLows,
      ratio: hlRatio,
      signal: hlSignal,
    },
  };

  // ── 3. CFTC COT Positioning ──

  const cotContracts: { contract: string; baseLong: number; baseShort: number; offsetKey: number }[] = [
    { contract: 'S&P 500', baseLong: 280000, baseShort: 210000, offsetKey: 100 },
    { contract: '10Y Treasury', baseLong: 520000, baseShort: 480000, offsetKey: 200 },
    { contract: 'EUR/USD', baseLong: 180000, baseShort: 155000, offsetKey: 300 },
    { contract: 'Gold', baseLong: 310000, baseShort: 95000, offsetKey: 400 },
    { contract: 'Crude Oil', baseLong: 420000, baseShort: 180000, offsetKey: 500 },
  ];

  const positioning: COTPositioning[] = cotContracts.map(c => {
    const cotRng = mulberry32(hashSeed(day + '-cot-' + c.contract));
    const specLong = Math.round(jitter(cotRng, c.baseLong, 0.15));
    const specShort = Math.round(jitter(cotRng, c.baseShort, 0.15));
    const netPosition = specLong - specShort;
    const change1wCot = Math.round((cotRng() - 0.45) * 30000);
    // Extreme reading if net position deviates significantly from base
    const baseNet = c.baseLong - c.baseShort;
    const deviation = Math.abs(netPosition - baseNet) / Math.max(baseNet, 1);
    const extremeReading = deviation > 0.25;

    return {
      contract: c.contract,
      specLong,
      specShort,
      netPosition,
      change1w: change1wCot,
      extremeReading,
    };
  });

  // ── 4. Historical Context ──

  // Generate historical composite scores for past periods
  const historicalPeriods: { label: string; daysAgo: number }[] = [
    { label: '1m ago', daysAgo: 30 },
    { label: '3m ago', daysAgo: 90 },
    { label: '6m ago', daysAgo: 180 },
    { label: '1yr ago', daysAgo: 365 },
  ];

  const snapshots: HistoricalSnapshot[] = historicalPeriods.map(p => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - p.daysAgo);
    const pastDay = pastDate.toISOString().slice(0, 10);
    const pastRng = mulberry32(hashSeed(pastDay + '-market-sentiment-index'));
    // Regenerate a quick composite approximation
    let pastScore = 0;
    for (let i = 0; i < 8; i++) {
      pastScore += pastRng() * 100;
    }
    pastScore = roundTo(pastScore / 8, 1);
    return { period: p.label, score: pastScore };
  });

  // Notable sentiment extremes from the past year (3 events)
  const extremeEvents: { daysAgo: number; baseSPXReturn: number }[] = [
    { daysAgo: Math.floor(45 + rng() * 80), baseSPXReturn: 4.2 },
    { daysAgo: Math.floor(140 + rng() * 80), baseSPXReturn: -3.8 },
    { daysAgo: Math.floor(250 + rng() * 80), baseSPXReturn: 6.1 },
  ];

  const notableExtremes: NotableExtreme[] = extremeEvents.map((evt, idx) => {
    const evtDate = new Date();
    evtDate.setDate(evtDate.getDate() - evt.daysAgo);
    const evtDay = evtDate.toISOString().slice(0, 10);
    const evtRng = mulberry32(hashSeed(evtDay + '-extreme-' + idx));

    // Alternate between fear and greed extremes
    let score: number;
    if (idx % 2 === 0) {
      score = roundTo(8 + evtRng() * 14, 1); // 8-22 range (fear extreme)
    } else {
      score = roundTo(78 + evtRng() * 17, 1); // 78-95 range (greed extreme)
    }

    const spxReturn = roundTo(jitter(evtRng, evt.baseSPXReturn, 0.20), 1);

    return {
      date: evtDay,
      score,
      label: scoreToLabel(score),
      subsequent_1m_SPX_return_pct: spxReturn,
    };
  });

  const historicalContext: HistoricalContext = {
    snapshots: [{ period: 'Current', score: compositeScore }, ...snapshots],
    notableExtremes,
  };

  return {
    timestamp: new Date().toISOString(),
    composite,
    components: componentsDetail,
    positioning,
    historicalContext,
  };
}
let cache: MarketSentimentIndexResponse | null = null;
let cacheTime = 0;

// ── Router ───────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    cache = generate();
    cacheTime = now;
    res.json(cache);
  } catch (err) {
    console.error('[MarketSentimentIndex] Error:', err instanceof Error ? err.message : err);
    // Stale fallback
    if (cache) return res.json(cache);
    res.status(503).json({ error: 'Market sentiment index data temporarily unavailable' });
  }
});

export default router;
