import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Labor market proxies: staffing stocks, consumer sectors, payroll ETFs
const SYMBOLS = [
  'RHI', 'HAYS', 'MAN', 'KELYA', // Staffing firms
  'ADP', 'PAYX', 'PAYC', // Payroll processors
  'XLY', 'XLP', 'XLI', // Consumer/Industrial sectors
  '^GSPC', '^RUT', // Broad market
  'WMT', 'TGT', 'MCD', 'SBUX', // Consumer employers
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  // Staffing firms as labor demand proxy
  const staffingStocks = ['RHI', 'MAN', 'KELYA'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      pe: r1(q?.trailingPE || 0), marketCap: r1((q?.marketCap || 0) / 1e9),
    };
  });
  const staffingAvgChange = r2(staffingStocks.reduce((s, st) => s + st.change, 0) / staffingStocks.length);

  // Payroll processors
  const payrollStocks = ['ADP', 'PAYX', 'PAYC'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      pe: r1(q?.trailingPE || 0),
    };
  });

  // Consumer employers
  const consumerEmployers = ['WMT', 'TGT', 'MCD', 'SBUX'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
    };
  });

  // Sector performance as employment proxy
  const sectorHealth = ['XLY', 'XLP', 'XLI'].map(sym => {
    const q = qMap.get(sym);
    const names: Record<string, string> = { XLY: 'Consumer Discretionary', XLP: 'Consumer Staples', XLI: 'Industrials' };
    return { sector: names[sym] || sym, etf: sym, change: r2(q?.regularMarketChangePercent || 0) };
  });

  const spxChg = qMap.get('^GSPC')?.regularMarketChangePercent || 0;
  const rutChg = qMap.get('^RUT')?.regularMarketChangePercent || 0;

  // Employment health index from market proxies
  const healthScore = Math.round(50 + staffingAvgChange * 5 + spxChg * 3 + rutChg * 2);

  const summary = {
    laborMarketHealth: healthScore > 60 ? 'Strong' : healthScore > 45 ? 'Moderate' : 'Weakening',
    healthScore: Math.min(100, Math.max(0, healthScore)),
    staffingTrend: staffingAvgChange > 0 ? 'Expanding' : 'Contracting',
    smallBusinessProxy: r2(rutChg), // Small caps = small business health
    consumerSpending: r2(qMap.get('XLY')?.regularMarketChangePercent || 0),
  };

  return { staffingStocks, payrollStocks, consumerEmployers, sectorHealth, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LaborMarket] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch labor market data' });
  }
});

export default router;
