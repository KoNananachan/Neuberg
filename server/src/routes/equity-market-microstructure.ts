import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'XOM', '^VIX'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const stocks = SYMBOLS.filter(s => s !== '^VIX').map(sym => { const q = qMap.get(sym); const p = q?.regularMarketPrice || 100; const h = q?.regularMarketDayHigh || p * 1.005; const l = q?.regularMarketDayLow || p * 0.995; const vol = q?.regularMarketVolume || 1e6; const avgVol = q?.averageDailyVolume3Month || vol; const spread = r4(Math.max(0.01, (h - l) * 0.003)); return { ticker: sym, name: q?.shortName || sym, price: r2(p), spread, spreadBps: r2(spread / p * 10000), volume: vol, avgVolume: avgVol, volumeRatio: r2(avgVol > 0 ? vol / avgVol : 1), marketImpact: r4(spread * 1.5), liquidityScore: Math.round(Math.min(100, (avgVol / 1e6) * 3 + (1 / (spread + 0.001)) * 0.3)) }; });
  return { stocks, summary: { avgSpread: r4(stocks.reduce((s, st) => s + st.spread, 0) / stocks.length), avgLiquidity: Math.round(stocks.reduce((s, st) => s + st.liquidityScore, 0) / stocks.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityMicrostructure] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
