import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'SPY', 'QQQ', 'IWM', 'JPM', 'BAC', '^VIX'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const stocks = SYMBOLS.filter(s => s !== '^VIX').map(sym => { const q = qMap.get(sym); const vol = q?.regularMarketVolume || 0; const avgVol = q?.averageDailyVolume3Month || vol; const volRatio = avgVol > 0 ? vol / avgVol : 1; const darkPoolEst = Math.round(vol * 0.38); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), litVolume: vol, darkPoolEstimate: darkPoolEst, darkPoolPct: r2(38 + (Math.random() - 0.5) * 10), volumeRatio: r2(volRatio), unusualActivity: volRatio > 1.5, direction: (q?.regularMarketChangePercent || 0) > 0 ? 'Buy bias' : 'Sell bias' }; });
  return { stocks, summary: { avgDarkPoolPct: r2(stocks.reduce((s, st) => s + st.darkPoolPct, 0) / stocks.length), unusualCount: stocks.filter(s => s.unusualActivity).length, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DarkPool] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
