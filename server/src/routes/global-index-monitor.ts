import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^FTSE', '^GDAXI', '^FCHI', '^N225', '^HSI', '^BSESN', '^GSPTSE', '^AXJO', '^VIX'];
const CACHE_TTL = 2 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const indices = SYMBOLS.filter(s => s !== '^VIX').map(sym => { const q = qMap.get(sym); const p = q?.regularMarketPrice || 0; return { symbol: sym, name: q?.shortName || sym, price: r2(p), change: r2(q?.regularMarketChange || 0), changePct: r2(q?.regularMarketChangePercent || 0), high52w: r2(q?.fiftyTwoWeekHigh || 0), low52w: r2(q?.fiftyTwoWeekLow || 0), aboveSMA200: !!(q?.twoHundredDayAverage && p > q.twoHundredDayAverage) }; });
  const positive = indices.filter(i => i.changePct > 0).length;
  return { indices, summary: { globalBreadth: `${positive}/${indices.length} positive`, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), marketRegime: positive > indices.length * 0.7 ? 'Risk-On' : positive < indices.length * 0.3 ? 'Risk-Off' : 'Mixed' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalIndexMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
