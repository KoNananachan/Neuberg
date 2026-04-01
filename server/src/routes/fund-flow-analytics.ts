import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AGG', 'TLT', 'HYG', 'GLD', 'EFA', 'EEM', 'VNQ', 'DBC', 'TIP', '^VIX', '^GSPC'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const categories = [{ name: 'US Equity', etfs: ['SPY', 'QQQ', 'IWM'] }, { name: 'Fixed Income', etfs: ['AGG', 'TLT', 'HYG', 'TIP'] }, { name: 'International', etfs: ['EFA', 'EEM'] }, { name: 'Real Assets', etfs: ['VNQ', 'GLD', 'DBC'] }].map(c => { const catEtfs = c.etfs.map(sym => qMap.get(sym)).filter(Boolean); const avgChg = catEtfs.reduce((s, q) => s + (q!.regularMarketChangePercent || 0), 0) / (catEtfs.length || 1); return { category: c.name, avgChange: r2(avgChg), direction: avgChg > 0.3 ? 'Inflow' : avgChg < -0.3 ? 'Outflow' : 'Neutral', etfCount: c.etfs.length }; });
  return { categories, summary: { riskAppetite: categories.find(c => c.category === 'US Equity')?.direction === 'Inflow' ? 'Risk-On' : 'Cautious', vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FundFlowAnalytics] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
