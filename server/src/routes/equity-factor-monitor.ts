import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Factor ETFs for monitoring
const FACTORS = [
  { ticker: 'MTUM', name: 'Momentum', benchmark: 'SPY' },
  { ticker: 'VLUE', name: 'Value', benchmark: 'SPY' },
  { ticker: 'QUAL', name: 'Quality', benchmark: 'SPY' },
  { ticker: 'SIZE', name: 'Size (Small Cap)', benchmark: 'SPY' },
  { ticker: 'USMV', name: 'Low Volatility', benchmark: 'SPY' },
  { ticker: 'VTV', name: 'Value (Vanguard)', benchmark: 'VUG' },
  { ticker: 'VUG', name: 'Growth (Vanguard)', benchmark: 'VTV' },
  { ticker: 'IWD', name: 'Russell 1000 Value', benchmark: 'IWF' },
  { ticker: 'IWF', name: 'Russell 1000 Growth', benchmark: 'IWD' },
  { ticker: 'IWM', name: 'Small Cap', benchmark: 'SPY' },
  { ticker: 'MDY', name: 'Mid Cap', benchmark: 'SPY' },
  { ticker: 'SPHD', name: 'High Dividend Low Vol', benchmark: 'SPY' },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const allSyms = [...new Set([...FACTORS.map(f => f.ticker), ...FACTORS.map(f => f.benchmark), 'SPY'])];
  const quotes = await getRawQuotes(allSyms);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const spyChg = qMap.get('SPY')?.regularMarketChangePercent || 0;

  const factors = FACTORS.map(f => {
    const q = qMap.get(f.ticker);
    const bq = qMap.get(f.benchmark);
    const change = q?.regularMarketChangePercent || 0;
    const benchChange = bq?.regularMarketChangePercent || 0;
    const alpha = r2(change - benchChange);
    return {
      ticker: f.ticker, name: f.name,
      price: r2(q?.regularMarketPrice || 0), change1D: r2(change),
      vsSpx: r2(change - spyChg), alpha,
      aum: r1((q?.marketCap || 0) / 1e9),
      pe: r1(q?.trailingPE || 0),
      dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100),
      momentum: change > spyChg + 0.3 ? 'Outperforming' : change < spyChg - 0.3 ? 'Underperforming' : 'Inline',
    };
  }).sort((a, b) => b.change1D - a.change1D);

  // Factor rotation signal
  const valueChg = qMap.get('VLUE')?.regularMarketChangePercent || 0;
  const growthChg = qMap.get('VUG')?.regularMarketChangePercent || 0;
  const momChg = qMap.get('MTUM')?.regularMarketChangePercent || 0;

  const rotation = {
    valueVsGrowth: r2(valueChg - growthChg),
    signal: valueChg > growthChg + 0.5 ? 'Rotating to Value' : growthChg > valueChg + 0.5 ? 'Rotating to Growth' : 'Neutral',
    momentumStrength: momChg > spyChg ? 'Strong' : 'Weak',
    topFactor: factors[0]?.name || 'N/A',
    worstFactor: factors[factors.length - 1]?.name || 'N/A',
  };

  return { factors, rotation, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData(); cache = { data, ts: now }; res.json(data);
  } catch (err) {
    console.error('[EquityFactorMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
export default router;
