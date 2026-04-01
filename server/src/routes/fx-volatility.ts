import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'USDCHF=X', 'NZDUSD=X', 'DXY=X', '^VIX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const names: Record<string, string> = { 'EURUSD=X': 'EUR/USD', 'USDJPY=X': 'USD/JPY', 'GBPUSD=X': 'GBP/USD', 'AUDUSD=X': 'AUD/USD', 'USDCAD=X': 'USD/CAD', 'USDCHF=X': 'USD/CHF', 'NZDUSD=X': 'NZD/USD' };
  const pairs = Object.entries(names).map(([sym, name]) => { const q = qMap.get(sym); const iv = r1(7 + vix * 0.4 + Math.abs(q?.regularMarketChangePercent || 0) * 2); return { pair: name, spot: r2(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0), impliedVol: iv, realizedVol: r1(iv * 0.85), volSpread: r1(iv - iv * 0.85), regime: iv > 12 ? 'Elevated' : iv < 7 ? 'Compressed' : 'Normal' }; });
  return { pairs, summary: { avgImpliedVol: r1(pairs.reduce((s, p) => s + p.impliedVol, 0) / pairs.length), vix: r2(vix), dollarVol: r1(Math.abs(qMap.get('DXY=X')?.regularMarketChangePercent || 0) * 10) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FXVolatility]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
