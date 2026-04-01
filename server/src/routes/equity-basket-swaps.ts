import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', '^VIX', '^TNX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const baskets = [{ name: 'Broad Market', etfs: ['SPY', 'QQQ', 'IWM'] }, { name: 'Growth vs Value', etfs: ['XLK', 'XLY', 'XLF'] }, { name: 'Defensive', etfs: ['XLV', 'XLP', 'XLI'] }].map(b => { const etfData = b.etfs.map(sym => { const q = qMap.get(sym); return { ticker: sym, change: r2(q?.regularMarketChangePercent || 0), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; }); return { basket: b.name, etfs: etfData, avgReturn: r2(etfData.reduce((s, e) => s + e.change, 0) / etfData.length) }; });
  return { baskets, summary: { vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5), bestBasket: [...baskets].sort((a, b) => b.avgReturn - a.avgReturn)[0]?.basket || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityBasketSwaps] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
