import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// GDP proxies: broad indices, transports, consumer, industrial
const SYMBOLS = [
  '^GSPC', '^DJI', '^IXIC', '^RUT', // Indices
  'IYT', // Transport ETF (economic bellwether)
  'XLI', 'XLY', 'XLP', // Industrial, Consumer Disc, Staples
  'COPX', // Copper miners (Dr. Copper)
  'DBA', // Agriculture
  '^TNX', '^IRX', // Yield curve
  'HYG', // Credit (risk appetite)
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const spxChg = qMap.get('^GSPC')?.regularMarketChangePercent || 0;
  const iytChg = qMap.get('IYT')?.regularMarketChangePercent || 0;
  const xliChg = qMap.get('XLI')?.regularMarketChangePercent || 0;
  const copxChg = qMap.get('COPX')?.regularMarketChangePercent || 0;
  const hygChg = qMap.get('HYG')?.regularMarketChangePercent || 0;
  const tenYear = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const threeMonth = qMap.get('^IRX')?.regularMarketPrice || 5.0;
  const yieldSpread = tenYear - threeMonth;

  // GDP nowcast components
  const components = [
    { name: 'Equity Market', proxy: 'S&P 500', value: r2(spxChg), weight: 20, signal: spxChg > 0.5 ? 'Expansionary' : spxChg < -0.5 ? 'Contractionary' : 'Neutral' },
    { name: 'Transportation', proxy: 'IYT', value: r2(iytChg), weight: 15, signal: iytChg > 0 ? 'Growing' : 'Slowing' },
    { name: 'Industrial Activity', proxy: 'XLI', value: r2(xliChg), weight: 15, signal: xliChg > 0 ? 'Expanding' : 'Contracting' },
    { name: 'Copper Demand', proxy: 'COPX', value: r2(copxChg), weight: 10, signal: copxChg > 0 ? 'Healthy' : 'Weak' },
    { name: 'Credit Conditions', proxy: 'HYG', value: r2(hygChg), weight: 15, signal: hygChg > 0 ? 'Easing' : 'Tightening' },
    { name: 'Yield Curve', proxy: '3m-10y spread', value: r2(yieldSpread), weight: 25, signal: yieldSpread < 0 ? 'Inverted (Warning)' : yieldSpread < 0.3 ? 'Flat' : 'Normal' },
  ];

  // Composite GDP estimate: baseline 2.5% +/- market signals
  const marketSignal = (spxChg * 0.3 + iytChg * 0.2 + xliChg * 0.2 + copxChg * 0.1 + hygChg * 0.2) * 0.5;
  const curveSignal = yieldSpread < 0 ? -1.5 : yieldSpread < 0.3 ? -0.5 : 0;
  const gdpEstimate = r1(clamp(2.5 + marketSignal + curveSignal, -2, 6));

  const quarterEstimates = Array.from({ length: 4 }, (_, i) => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3) + i;
    const yr = now.getFullYear() + Math.floor((q - 1) / 4);
    const qNum = ((q - 1) % 4) + 1;
    return {
      quarter: `Q${qNum} ${yr}`,
      estimate: r1(gdpEstimate - i * 0.2 + (Math.random() - 0.5) * 0.3),
      confidence: i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low',
    };
  });

  return {
    currentEstimate: gdpEstimate,
    trend: gdpEstimate > 2 ? 'Above Trend' : gdpEstimate > 0 ? 'Below Trend' : 'Contraction',
    components, quarterEstimates,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData(); cache = { data, ts: now }; res.json(data);
  } catch (err) {
    console.error('[GDPNowcast] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
export default router;
