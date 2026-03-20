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

const ASSETS = [
  'SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'TLT', 'HYG', 'LQD',
  'GLD', 'SLV', 'USO', 'UNG', 'FXI', 'EWJ', 'EWZ',
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'JPM',
  'XLE', 'XLF', 'XLK', 'XLV', 'XLI', 'XLU', 'XLP',
];

const SIGNAL_TYPES = [
  'Momentum Breakout', 'Mean Reversion', 'VRP Harvest', 'Credit Signal',
  'Relative Value', 'Seasonality', 'Sentiment Extreme', 'Flow Signal',
  'Earnings Drift', 'Factor Rotation', 'Macro Regime', 'Vol Compression',
  'Correlation Break', 'Sector Rotation', 'Risk-On/Off',
];

const STRATEGIES = [
  'Long Equity', 'Short Equity', 'Long/Short Pair', 'Call Spread', 'Put Spread',
  'Iron Condor', 'Straddle', 'Risk Reversal', 'Calendar Spread',
  'Macro Hedge', 'Carry Trade', 'Convergence Trade',
];

const TIMEFRAMES = ['Intraday', '1-3 Days', '1 Week', '2 Weeks', '1 Month', '3 Months'];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-trade-ideas'));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const ideaCount = 12 + Math.floor(rng() * 8);
  const ideas = Array.from({ length: ideaCount }, (_, idx) => {
    const asset = pick(ASSETS);
    const signalType = pick(SIGNAL_TYPES);
    const strategy = pick(STRATEGIES);
    const timeframe = pick(TIMEFRAMES);
    const direction = rng() > 0.45 ? 'Bullish' : 'Bearish';
    const confidence = Math.round(55 + rng() * 40);
    const expectedReturn = Math.round((rng() * 8 - 1.5) * 100) / 100;
    const riskReward = Math.round((1 + rng() * 4) * 10) / 10;
    const stopLoss = Math.round((1 + rng() * 5) * 10) / 10;

    const signalStrength = Math.round(rng() * 100);
    const historicalWinRate = Math.round(45 + rng() * 30);
    const avgHistReturn = Math.round((rng() * 4 - 0.5) * 100) / 100;
    const occurrences = Math.round(10 + rng() * 90);

    const signals = Array.from({ length: 2 + Math.floor(rng() * 3) }, () => ({
      name: pick(SIGNAL_TYPES),
      value: Math.round(rng() * 100),
      triggered: rng() > 0.3,
    }));

    const daysAgo = Math.floor(rng() * 3);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(Math.floor(rng() * 14) + 6, Math.floor(rng() * 60));

    return {
      id: idx + 1, asset, signalType, strategy, timeframe, direction,
      confidence, expectedReturn, riskReward, stopLoss,
      signalStrength, historicalWinRate, avgHistReturn, occurrences,
      signals, createdAt: createdAt.toISOString(),
      status: rng() > 0.8 ? 'Expired' : rng() > 0.6 ? 'Active' : 'New',
    };
  }).sort((a, b) => b.confidence - a.confidence);

  const summary = {
    totalIdeas: ideas.length,
    bullish: ideas.filter(i => i.direction === 'Bullish').length,
    bearish: ideas.filter(i => i.direction === 'Bearish').length,
    avgConfidence: Math.round(ideas.reduce((a, b) => a + b.confidence, 0) / ideas.length),
    topSignalType: (() => {
      const counts: Record<string, number> = {};
      ideas.forEach(i => { counts[i.signalType] = (counts[i.signalType] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    })(),
    newCount: ideas.filter(i => i.status === 'New').length,
    activeCount: ideas.filter(i => i.status === 'Active').length,
  };

  const signalHeatmap = SIGNAL_TYPES.slice(0, 10).map(sig => ({
    signal: sig,
    bullish: Math.round(rng() * 5),
    bearish: Math.round(rng() * 5),
    strength: Math.round(rng() * 100),
  }));

  const assetBreakdown = [...new Set(ideas.map(i => i.asset))].map(asset => {
    const assetIdeas = ideas.filter(i => i.asset === asset);
    return {
      asset,
      count: assetIdeas.length,
      avgConfidence: Math.round(assetIdeas.reduce((a, b) => a + b.confidence, 0) / assetIdeas.length),
      netDirection: assetIdeas.filter(i => i.direction === 'Bullish').length - assetIdeas.filter(i => i.direction === 'Bearish').length,
    };
  }).sort((a, b) => b.count - a.count);

  return { ideas, summary, signalHeatmap, assetBreakdown, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[TradeIdeas] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate trade ideas data' });
  }
});

export default router;
