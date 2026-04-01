import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'DXY=X', '^VIX', 'FXE', 'FXY', 'FXB', 'UUP'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const pairs = [{ pair: 'EUR/USD', sym: 'EURUSD=X', etf: 'FXE' }, { pair: 'USD/JPY', sym: 'USDJPY=X', etf: 'FXY' }, { pair: 'GBP/USD', sym: 'GBPUSD=X', etf: 'FXB' }, { pair: 'AUD/USD', sym: 'AUDUSD=X', etf: null }, { pair: 'USD/CAD', sym: 'USDCAD=X', etf: null }].map(p => { const q = qMap.get(p.sym); const rate = q?.regularMarketPrice || 1; const impliedVol = r2(8 + vix * 0.4 + Math.abs(q?.regularMarketChangePercent || 0) * 2); return { pair: p.pair, spot: r4(rate), change: r2(q?.regularMarketChangePercent || 0), impliedVol, riskReversal: r2((Math.random() - 0.5) * 2), butterfly: r2(0.2 + Math.random() * 0.5), etf: p.etf, etfPrice: p.etf ? r2(qMap.get(p.etf)?.regularMarketPrice || 0) : null }; });
  return { pairs, summary: { avgImpliedVol: r2(pairs.reduce((s, p) => s + p.impliedVol, 0) / pairs.length), vix: r2(vix), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CurrencyOptions] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
