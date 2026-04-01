import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'DXY=X', '^VIX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const surfaces = [{ pair: 'EUR/USD', sym: 'EURUSD=X' }, { pair: 'USD/JPY', sym: 'USDJPY=X' }, { pair: 'GBP/USD', sym: 'GBPUSD=X' }, { pair: 'AUD/USD', sym: 'AUDUSD=X' }].map(s => { const q = qMap.get(s.sym); const baseVol = vix * 0.5; const tenors = ['1W', '1M', '3M', '6M', '1Y']; const deltas = ['10P', '25P', 'ATM', '25C', '10C']; return { pair: s.pair, spot: r2(q?.regularMarketPrice || 1), surface: tenors.map((t, ti) => ({ tenor: t, vols: deltas.map((d, di) => ({ delta: d, vol: r1(baseVol * (0.95 + ti * 0.03) + (di - 2) * 0.3) })) })) }; });
  return { surfaces, vix: r2(vix), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FXVolSurface]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
