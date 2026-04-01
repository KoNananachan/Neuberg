import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^IRX', '^TNX', 'SPY', 'QQQ', 'IWM', 'HYG', 'TLT', 'DXY=X', 'GLD'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const assets = ['SPY', 'QQQ', 'IWM', 'HYG', 'TLT', 'GLD'].map(sym => { const q = qMap.get(sym); const vol = q?.regularMarketVolume || 0; const avgVol = q?.averageDailyVolume3Month || vol; return { asset: q?.shortName || sym, proxy: sym, volume: vol, avgVolume: avgVol, volumeRatio: r2(avgVol > 0 ? vol / avgVol : 1), change: r2(q?.regularMarketChangePercent || 0), liquiditySignal: (avgVol > 0 ? vol / avgVol : 1) > 1.3 ? 'Active' : (avgVol > 0 ? vol / avgVol : 1) < 0.7 ? 'Thin' : 'Normal' }; });
  return { assets, summary: { vix: r2(vix), avgVolumeRatio: r2(assets.reduce((s, a) => s + a.volumeRatio, 0) / assets.length), thinLiquidity: assets.filter(a => a.liquiditySignal === 'Thin').length, regime: vix > 25 ? 'Stressed' : 'Normal' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LiquidityMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
