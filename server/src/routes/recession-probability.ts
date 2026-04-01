import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Recession indicators: yield curve, credit spreads, VIX, leading sectors
const SYMBOLS = [
  '^IRX', '^FVX', '^TNX', '^TYX', '^VIX', '^GSPC',
  'HYG', 'LQD', // Credit spreads
  'XLY', 'XLP', // Consumer discretionary vs staples
  'IWM', 'SPY', // Small cap vs large cap
  'TLT', // Flight to safety
  'COPX', // Copper (Dr. Copper)
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const threeMonth = qMap.get('^IRX')?.regularMarketPrice || 5;
  const tenYear = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const spxChg = qMap.get('^GSPC')?.regularMarketChangePercent || 0;

  // Yield curve inversion = strongest recession signal
  const spread3m10y = tenYear - threeMonth;
  const yieldCurveScore = clamp(Math.round(50 - spread3m10y * 30), 0, 100);

  // Credit spread proxy (HYG vs LQD performance gap)
  const hygChg = qMap.get('HYG')?.regularMarketChangePercent || 0;
  const lqdChg = qMap.get('LQD')?.regularMarketChangePercent || 0;
  const creditSpreadScore = clamp(Math.round(50 - (hygChg - lqdChg) * 15), 0, 100);

  // VIX level
  const vixScore = clamp(Math.round((vix - 12) * 3), 0, 100);

  // Consumer discretionary vs staples (weakness = recession)
  const xlyChg = qMap.get('XLY')?.regularMarketChangePercent || 0;
  const xlpChg = qMap.get('XLP')?.regularMarketChangePercent || 0;
  const consumerScore = clamp(Math.round(50 - (xlyChg - xlpChg) * 10), 0, 100);

  // Small cap underperformance
  const iwmChg = qMap.get('IWM')?.regularMarketChangePercent || 0;
  const spyChg = qMap.get('SPY')?.regularMarketChangePercent || 0;
  const smallCapScore = clamp(Math.round(50 - (iwmChg - spyChg) * 12), 0, 100);

  // Copper (economic bellwether)
  const copperScore = clamp(Math.round(50 - (qMap.get('COPX')?.regularMarketChangePercent || 0) * 8), 0, 100);

  const indicators = [
    { name: 'Yield Curve (3m-10y)', value: r2(spread3m10y) + '%', score: yieldCurveScore, weight: 30, signal: spread3m10y < 0 ? 'Inverted (Warning)' : 'Normal' },
    { name: 'Credit Spreads', value: r2(hygChg - lqdChg) + '%', score: creditSpreadScore, weight: 20, signal: creditSpreadScore > 60 ? 'Widening' : 'Stable' },
    { name: 'VIX Level', value: r1(vix), score: vixScore, weight: 15, signal: vix > 30 ? 'Elevated' : vix > 20 ? 'Above Average' : 'Normal' },
    { name: 'Consumer Spending', value: r2(xlyChg - xlpChg) + '%', score: consumerScore, weight: 15, signal: consumerScore > 55 ? 'Weakening' : 'Healthy' },
    { name: 'Small Cap Performance', value: r2(iwmChg - spyChg) + '%', score: smallCapScore, weight: 10, signal: smallCapScore > 55 ? 'Underperforming' : 'Inline' },
    { name: 'Dr. Copper', value: r2(qMap.get('COPX')?.regularMarketChangePercent || 0) + '%', score: copperScore, weight: 10, signal: copperScore > 55 ? 'Weakening' : 'Stable' },
  ];

  const compositeProb = Math.round(indicators.reduce((s, i) => s + i.score * i.weight, 0) / indicators.reduce((s, i) => s + i.weight, 0));
  const riskLevel = compositeProb >= 70 ? 'High' : compositeProb >= 45 ? 'Moderate' : compositeProb >= 25 ? 'Low' : 'Very Low';

  return {
    probability: compositeProb, riskLevel, indicators,
    marketContext: { spxChange: r2(spxChg), vix: r1(vix), yieldCurveSpread: r2(spread3m10y) },
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RecessionProbability] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch recession probability data' });
  }
});

export default router;
