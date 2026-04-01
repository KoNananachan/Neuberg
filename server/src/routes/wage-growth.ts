import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
// Wage/employment proxies: staffing, retail, consumer
const SYMBOLS = ['ADP', 'PAYX', 'RHI', 'MAN', 'WMT', 'MCD', 'SBUX', 'CMG', 'DPZ', 'YUM', 'XLY', 'XLP', '^GSPC'];

const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const payrollProcessors = ['ADP', 'PAYX'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0) };
  });

  const staffing = ['RHI', 'MAN'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0) };
  });

  const wageIntensiveEmployers = ['WMT', 'MCD', 'SBUX', 'CMG', 'DPZ', 'YUM'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0), marketCap: r1((q?.marketCap || 0) / 1e9) };
  });

  const staffingChg = staffing.reduce((s, st) => s + st.change, 0) / staffing.length;
  const employerChg = wageIntensiveEmployers.reduce((s, e) => s + e.change, 0) / wageIntensiveEmployers.length;

  const summary = {
    laborDemandProxy: r2(staffingChg),
    laborDemandSignal: staffingChg > 0 ? 'Strong Demand' : 'Moderating',
    wagePressureProxy: r2(-employerChg), // Falling employer stocks = margin pressure from wages
    wagePressureSignal: employerChg < -0.5 ? 'Rising Wages (margin pressure)' : 'Stable',
    consumerDiscVsStaples: r2((qMap.get('XLY')?.regularMarketChangePercent || 0) - (qMap.get('XLP')?.regularMarketChangePercent || 0)),
  };

  return { payrollProcessors, staffing, wageIntensiveEmployers, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[WageGrowth] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
