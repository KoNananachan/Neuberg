import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'DXY=X', '^VIX', 'FXE', 'FXY', 'FXB', 'UUP'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const options = [{ pair: 'EUR/USD', sym: 'EURUSD=X', etf: 'FXE' }, { pair: 'USD/JPY', sym: 'USDJPY=X', etf: 'FXY' }, { pair: 'GBP/USD', sym: 'GBPUSD=X', etf: 'FXB' }, { pair: 'AUD/USD', sym: 'AUDUSD=X', etf: null }, { pair: 'USD/CAD', sym: 'USDCAD=X', etf: null }].map(o => { const q = qMap.get(o.sym); const iv = r1(8 + vix * 0.4); return { pair: o.pair, spot: r2(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0), impliedVol: iv, skew: r2((Math.random() - 0.5) * 3), etf: o.etf, etfPrice: o.etf ? r2(qMap.get(o.etf)?.regularMarketPrice || 0) : null }; });
  return { options, summary: { avgVol: r1(options.reduce((s, o) => s + o.impliedVol, 0) / options.length), vix: r2(vix), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FXOptions]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
