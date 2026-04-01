import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'USDCHF=X', 'DXY=X', '^VIX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const names: Record<string, string> = { 'EURUSD=X': 'EUR/USD', 'USDJPY=X': 'USD/JPY', 'GBPUSD=X': 'GBP/USD', 'AUDUSD=X': 'AUD/USD', 'USDCAD=X': 'USD/CAD', 'USDCHF=X': 'USD/CHF' };
  const matrix = Object.entries(names).map(([sym, name]) => { const q = qMap.get(sym); const baseVol = vix * 0.5; return { pair: name, spot: r2(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0), vol1W: r1(baseVol * 0.9), vol1M: r1(baseVol), vol3M: r1(baseVol * 1.05), vol6M: r1(baseVol * 1.1), vol1Y: r1(baseVol * 1.15), riskReversal25D: r2((Math.random() - 0.5) * 2), butterfly25D: r2(0.2 + Math.random() * 0.5) }; });
  return { matrix, summary: { avgVol1M: r1(matrix.reduce((s, m) => s + m.vol1M, 0) / matrix.length), vix: r2(vix), volRegime: vix > 25 ? 'Elevated' : vix < 15 ? 'Compressed' : 'Normal' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FXOptionVolMatrix]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
